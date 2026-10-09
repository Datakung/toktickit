import { Prisma, type RequestedPriority, type TicketStatus } from "@prisma/client";
import type { AuthLocals } from "../auth/auth-middleware.js";
import { lockAccountChanges } from "../admin/user-service.js";
import { getPrisma } from "../prisma.js";
import { attachmentMetadataSelect, toAttachmentMetadata } from "../attachments/attachment-metadata.js";
import { requireActionSession, resolutionSummary } from "../actions/action-service.js";
import { ticketTransitions, resolutionFailure } from "../tickets/workflow-rules.js";

export class OperationError extends Error {
  constructor(public status: number, public code: string, message: string, public fields: Record<string, string> = {}) { super(message); }
}

const TERMINAL: TicketStatus[] = ["RESOLVED", "CLOSED", "CANCELLED"];
export const transitions = ticketTransitions;
const priorities: RequestedPriority[] = ["LOW", "MEDIUM", "HIGH"];
const statuses = Object.keys(transitions) as TicketStatus[];

export const staffTicketSelect = {
  id: true, ticketNumber: true, summary: true, description: true,
  requestedPriority: true, itPriority: true, status: true, version: true,
  requesterResolutionIndicatedAt: true, createdAt: true, updatedAt: true,
  resolutionCycle: true, resolvedAt: true,
  requester: { select: { id: true, displayName: true, email: true } },
  owner: { select: { id: true, displayName: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  attachments: { select: attachmentMetadataSelect, orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] },
} satisfies Prisma.TicketSelect;

export function presentStaffTicket(ticket: Prisma.TicketGetPayload<{ select: typeof staffTicketSelect }>) {
  return { ...ticket, attachments: ticket.attachments.map(toAttachmentMetadata) };
}

export function routeId(raw: string): number {
  const id = Number(raw);
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(id) || id > 2_147_483_647) throw new OperationError(404, "TICKET_NOT_FOUND", "Ticket not found.");
  return id;
}
function object(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new OperationError(400, "VALIDATION_ERROR", "Correct the highlighted fields and try again.");
  return input as Record<string, unknown>;
}
function exact(input: unknown, keys: string[]) {
  const body = object(input);
  if (Object.keys(body).some(key => !keys.includes(key)) || keys.some(key => !(key in body))) throw new OperationError(400, "VALIDATION_ERROR", "Send exactly the required fields.");
  return body;
}
function version(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 2_147_483_647) throw new OperationError(400, "VALIDATION_ERROR", "Provide a valid Ticket version.", { version: "Reload the Ticket before saving." });
  return value;
}

async function mutation<T>(auth: AuthLocals, ticketId: number, expected: number, action: (tx: Prisma.TransactionClient, ticket: Prisma.TicketGetPayload<{}>) => Promise<T>) {
  return getPrisma().$transaction(async tx => {
    await lockAccountChanges(tx);
    await requireActionSession(tx, auth, true);
    await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
    const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new OperationError(404, "TICKET_NOT_FOUND", "Ticket not found.");
    if (ticket.version !== expected) throw new OperationError(409, "VERSION_CONFLICT", "This Ticket changed. Reload and review before saving.");
    return action(tx, ticket);
  }, { maxWait: 10000, timeout: 10000 });
}
async function readUpdated(tx: Prisma.TransactionClient, id: number) {
  return presentStaffTicket(await tx.ticket.findUniqueOrThrow({ where: { id }, select: staffTicketSelect }));
}
function ensureNonterminal(status: TicketStatus) {
  if (TERMINAL.includes(status)) throw new OperationError(409, "TICKET_TERMINAL", "Assignment and priority are locked for this terminal Ticket.");
}

export async function getStaffTicket(id: number) {
  const ticket = await getPrisma().ticket.findUnique({ where: { id }, select: staffTicketSelect });
  if (!ticket) throw new OperationError(404, "TICKET_NOT_FOUND", "Ticket not found.");
  return presentStaffTicket(ticket);
}
export async function claimTicket(auth: AuthLocals, id: number, input: unknown) {
  const expected = version(exact(input, ["version"]).version);
  return mutation(auth, id, expected, async (tx, ticket) => {
    ensureNonterminal(ticket.status);
    if (ticket.ownerId !== null) throw new OperationError(409, "TICKET_ALREADY_ASSIGNED", "This Ticket is already assigned.");
    await tx.ticket.update({ where: { id }, data: { ownerId: auth.currentUser.id, version: { increment: 1 } } });
    return readUpdated(tx, id);
  });
}
export async function changeOwner(auth: AuthLocals, id: number, input: unknown) {
  const body = exact(input, ["ownerId", "version"]), expected = version(body.version);
  if (body.ownerId !== null && (typeof body.ownerId !== "number" || !Number.isSafeInteger(body.ownerId) || body.ownerId < 1)) throw new OperationError(400, "VALIDATION_ERROR", "Choose a valid owner.", { ownerId: "Choose an eligible owner or Unassigned." });
  return mutation(auth, id, expected, async (tx, ticket) => {
    ensureNonterminal(ticket.status);
    if (body.ownerId !== null) {
      const owner = await tx.user.findFirst({ where: { id: body.ownerId as number, isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true } });
      if (!owner) throw new OperationError(400, "INVALID_OWNER", "Choose an active Staff member or Administrator.", { ownerId: "This owner is not eligible." });
    }
    await tx.ticket.update({ where: { id }, data: { ownerId: body.ownerId as number | null, version: { increment: 1 } } });
    return readUpdated(tx, id);
  });
}
export async function changePriority(auth: AuthLocals, id: number, input: unknown) {
  const body = exact(input, ["itPriority", "version"]), expected = version(body.version);
  if (!priorities.includes(body.itPriority as RequestedPriority)) throw new OperationError(400, "VALIDATION_ERROR", "Choose a valid IT Priority.", { itPriority: "Choose Low, Medium or High." });
  return mutation(auth, id, expected, async (tx, ticket) => {
    ensureNonterminal(ticket.status);
    await tx.ticket.update({ where: { id }, data: { itPriority: body.itPriority as RequestedPriority, version: { increment: 1 } } });
    return readUpdated(tx, id);
  });
}
export async function changeStatus(auth: AuthLocals, id: number, input: unknown) {
  const body = exact(input, ["status", "version"]), expected = version(body.version);
  if (!statuses.includes(body.status as TicketStatus)) throw new OperationError(400, "VALIDATION_ERROR", "Choose a valid status.", { status: "Choose an allowed destination." });
  return mutation(auth, id, expected, async (tx, ticket) => {
    const next = body.status as TicketStatus;
    if (!transitions[ticket.status].includes(next)) throw new OperationError(409, "INVALID_STATUS_TRANSITION", "That status transition is not allowed.", { status: "Reload and choose an allowed transition." });
    if (next === "RESOLVED" || next === "CANCELLED") {
      const counts = await resolutionSummary(tx, ticket);
      const failure = next === "RESOLVED" ? resolutionFailure(counts)
        : counts.unfinishedCount > 0 ? "Finish or cancel active actions in this Ticket's current cycle before cancelling the Ticket." : null;
      if (failure) throw new OperationError(409, next === "RESOLVED" ? "RESOLUTION_GATE_NOT_MET" : "ACTIVE_ACTIONS_REMAIN", failure);
    }
    const transitionedAt = new Date();
    const updated = await tx.ticket.update({ where: { id }, data: {
      status: next, version: { increment: 1 },
      ...(next === "RESOLVED" ? { resolvedAt: transitionedAt } : {}),
      ...(next === "REOPENED" ? { resolutionCycle: { increment: 1 }, resolvedAt: null, requesterResolutionIndicatedAt: null } : {}),
    } });
    await tx.ticketTransitionEvent.create({ data: { ticketId: id, actorId: auth.currentUser.id,
      fromStatus: ticket.status, toStatus: next, cycle: updated.resolutionCycle, ticketVersion: updated.version, createdAt: transitionedAt } });
    return readUpdated(tx, id);
  });
}
