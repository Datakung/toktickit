import { Prisma } from "@prisma/client";
import type { AuthLocals } from "../auth/auth-middleware.js";
import { lockAccountChanges } from "../admin/user-service.js";
import { getPrisma } from "../prisma.js";
import { OperationError } from "../staff/ticket-operations.js";

const entrySelect = { id: true, body: true, createdAt: true, author: { select: { id: true, displayName: true } } } as const;

export function parseEntryQuery(query: Record<string, unknown>) {
  const unknown = Object.keys(query).filter(key => !["page", "pageSize"].includes(key));
  const parse = (name: "page" | "pageSize", fallback: number) => {
    const value = query[name];
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) throw new OperationError(400, "INVALID_QUERY", "Correct the communication query.", { [name]: `${name} must be a positive integer.` });
    return Number(value);
  };
  if (unknown.length) throw new OperationError(400, "INVALID_QUERY", "Correct the communication query.", Object.fromEntries(unknown.map(key => [key, "This query parameter is not supported."])));
  const page = parse("page", 1), pageSize = parse("pageSize", 20);
  if (![10, 20, 50].includes(pageSize)) throw new OperationError(400, "INVALID_QUERY", "Correct the communication query.", { pageSize: "Use 10, 20 or 50." });
  return { page, pageSize };
}

export function commentBody(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== 1 || !("body" in input)) throw new OperationError(400, "VALIDATION_ERROR", "Send exactly one comment body.");
  const body = typeof (input as { body?: unknown }).body === "string" ? (input as { body: string }).body.trim() : "";
  if (!body || body.length > 4000) throw new OperationError(400, "VALIDATION_ERROR", "Correct the highlighted fields and try again.", { body: "Write between 1 and 4000 characters." });
  return body;
}

async function accessibleTicket(auth: AuthLocals, ticketId: number) {
  const requester = auth.currentUser.role === "REQUESTER";
  const ticket = await getPrisma().ticket.findFirst({ where: { id: ticketId, ...(requester ? { requesterId: auth.currentUser.id } : {}) }, select: { id: true } });
  if (!ticket) throw new OperationError(404, "TICKET_NOT_FOUND", "Ticket not found.");
}

export async function listComments(auth: AuthLocals, ticketId: number, query: Record<string, unknown>) {
  const { page, pageSize } = parseEntryQuery(query);
  await accessibleTicket(auth, ticketId);
  const [total, items] = await getPrisma().$transaction([
    getPrisma().publicComment.count({ where: { ticketId } }),
    getPrisma().publicComment.findMany({ where: { ticketId }, select: entrySelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
export async function addComment(auth: AuthLocals, ticketId: number, input: unknown) {
  const body = commentBody(input);
  await accessibleTicket(auth, ticketId);
  return getPrisma().publicComment.create({ data: { ticketId, authorId: auth.currentUser.id, body }, select: entrySelect });
}
export async function listNotes(ticketId: number, query: Record<string, unknown>) {
  const { page, pageSize } = parseEntryQuery(query);
  if (!await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } })) throw new OperationError(404, "TICKET_NOT_FOUND", "Ticket not found.");
  const [total, items] = await getPrisma().$transaction([
    getPrisma().internalNote.count({ where: { ticketId } }),
    getPrisma().internalNote.findMany({ where: { ticketId }, select: entrySelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
export async function addNote(auth: AuthLocals, ticketId: number, input: unknown) {
  const body = commentBody(input);
  if (!await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } })) throw new OperationError(404, "TICKET_NOT_FOUND", "Ticket not found.");
  return getPrisma().internalNote.create({ data: { ticketId, authorId: auth.currentUser.id, body }, select: entrySelect });
}

export async function indicateResolution(auth: AuthLocals, ticketId: number, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== 1 || !("version" in input)) throw new OperationError(400, "VALIDATION_ERROR", "Send exactly the displayed Ticket version.");
  const expected = (input as { version?: unknown }).version;
  if (typeof expected !== "number" || !Number.isSafeInteger(expected) || expected < 1) throw new OperationError(400, "VALIDATION_ERROR", "Provide a valid Ticket version.", { version: "Reload the Ticket before trying again." });
  return getPrisma().$transaction(async tx => {
    await lockAccountChanges(tx);
    await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
    const ticket = await tx.ticket.findFirst({ where: { id: ticketId, requesterId: auth.currentUser.id } });
    if (!ticket) throw new OperationError(404, "TICKET_NOT_FOUND", "Ticket not found.");
    if (ticket.version !== expected) throw new OperationError(409, "VERSION_CONFLICT", "This Ticket changed. Reload before trying again.");
    if (!(["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] as string[]).includes(ticket.status)) throw new OperationError(409, "RESOLUTION_INDICATION_NOT_ALLOWED", "Resolution can only be indicated while this Ticket is active.");
    if (!ticket.requesterResolutionIndicatedAt) {
      await tx.ticket.update({ where: { id: ticketId }, data: { requesterResolutionIndicatedAt: new Date(), version: { increment: 1 } } });
    }
    return tx.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { id: true, status: true, version: true, requesterResolutionIndicatedAt: true, updatedAt: true } });
  }, { maxWait: 10000, timeout: 10000 });
}
