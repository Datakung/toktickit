import { createHash } from "node:crypto";
import { Prisma, type ActionTaken, type Ticket } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { lockAccountChanges } from "../admin/user-service.js";
import type { AuthLocals } from "../auth/auth-middleware.js";
import { sha256, safeEqual } from "../auth/security.js";
import { OperationError } from "../staff/ticket-operations.js";
import { actionSelect, actionNumberSql, appendActionEvent } from "./action-record.js";
import { parseActionWrite, parseActionPage, parseWorkQuery, type WriteKind } from "./action-validation.js";

const terminal = ["RESOLVED", "CLOSED", "CANCELLED"];
export async function requireActionSession(tx: Prisma.TransactionClient, auth: AuthLocals, write = false) {
  if (write) {
    // Coordinate with login/password rotation and session deletion, not just Admin edits.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${auth.currentUser.id} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "Session" WHERE id=${auth.sessionId} FOR SHARE`;
  }
  const session = await tx.session.findUnique({ where: { id: auth.sessionId }, include: { user: true } });
  if (!session || session.userId !== auth.currentUser.id || session.expiresAt <= new Date() || !session.user.isActive || !safeEqual(session.tokenHash, sha256(auth.rawSessionToken)) || !safeEqual(session.csrfHash, auth.storedCsrfHash)) throw new OperationError(401, "AUTHENTICATION_REQUIRED", "Sign in to continue.");
  if (session.user.mustChangePassword) throw new OperationError(403, "PASSWORD_CHANGE_REQUIRED", "Change your initial password to continue.");
  if (write && session.user.role === "REQUESTER") throw new OperationError(403, "FORBIDDEN", "Staff access is required.");
  return session.user;
}
async function accessibleTicket(tx: Prisma.TransactionClient, auth: AuthLocals, id: number) {
  const actor = await requireActionSession(tx, auth);
  const ticket = await tx.ticket.findFirst({ where: { id, ...(actor.role === "REQUESTER" ? { requesterId: actor.id } : {}) } });
  if (!ticket) throw new OperationError(404, "TICKET_NOT_FOUND", "Ticket not found.");
  return ticket;
}
function notFound(): never { throw new OperationError(404, "ACTION_NOT_FOUND", "Action not found."); }
function conflict(): never { throw new OperationError(409, "VERSION_CONFLICT", "This Ticket or action changed. Reload and review before saving."); }
export async function resolutionSummary(tx: Prisma.TransactionClient, ticket: Ticket) {
  const where = { ticketId: ticket.id, cycle: ticket.resolutionCycle };
  const completedCount = await tx.actionTaken.count({ where: { ...where, state: "COMPLETED" } });
  const unfinishedCount = await tx.actionTaken.count({ where: { ...where, state: { in: ["PLANNED", "IN_PROGRESS"] } } });
  const outstandingFollowUpCount = await tx.actionTaken.count({ where: { ...where, state: "COMPLETED", followUpRequired: true } });
  return { cycle: ticket.resolutionCycle, completedCount, unfinishedCount, outstandingFollowUpCount,
    meetsActionRequirements: completedCount >= 1 && unfinishedCount === 0 && outstandingFollowUpCount === 0 };
}
const pageEnvelope = (items: unknown[], page: number, pageSize: number, total: number) => ({ items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
export async function readActions(auth: AuthLocals, ticketId: number, query: Record<string, unknown>, actionId?: number, history = false) {
  const { page, pageSize } = parseActionPage(query);
  if (actionId && !history && Object.keys(query).length) throw new OperationError(400, "INVALID_QUERY", "Action detail takes no query parameters.");
  return getPrisma().$transaction(async tx => {
    const ticket = await accessibleTicket(tx, auth, ticketId);
    if (actionId) {
      const action = await tx.actionTaken.findFirst({ where: { id: actionId, ticketId }, select: actionSelect });
      if (!action) notFound();
      if (!history) {
        const [number] = await tx.$queryRaw<Array<{ actionNumber: number }>>`SELECT ${actionNumberSql} AS "actionNumber" FROM "ActionTaken" a WHERE a.id=${action.id} AND a."ticketId"=${ticketId}`;
        return { action: { ...action, actionNumber: number.actionNumber }, ticketVersion: ticket.version, currentCycle: ticket.resolutionCycle };
      }
      const where = { actionId, ticketId }, total = await tx.actionTakenEvent.count({ where });
      const items = (page - 1) * pageSize >= total ? [] : await tx.actionTakenEvent.findMany({ where, select: { id: true, actionId: true, kind: true, actor: { select: { id: true, displayName: true } }, createdAt: true, version: true, reason: true, before: true, after: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize });
      return pageEnvelope(items, page, pageSize, total);
    }
    const where = { ticketId }, total = await tx.actionTaken.count({ where });
    // Short-circuit beyond-last pages, including valid page integers whose
    // multiplied offset exceeds Prisma's signed 32-bit skip argument.
    const items = (page - 1) * pageSize >= total ? [] : await tx.actionTaken.findMany({ where, select: actionSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize });
    const numbered = items.map((action, index) => ({ ...action, actionNumber: (page - 1) * pageSize + index + 1 }));
    return { ...pageEnvelope(numbered, page, pageSize, total), ticketVersion: ticket.version, currentCycle: ticket.resolutionCycle, resolutionGate: await resolutionSummary(tx, ticket) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function mutateAction(auth: AuthLocals, ticketId: number, kind: WriteKind, input: unknown, actionId?: number) {
  const body = parseActionWrite(kind, input);
  const operation = `${kind}:${ticketId}:${actionId ?? "new"}`;
  // Parsed object has deterministic key order, normalized text, dates and UUID casing.
  const payloadHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  return getPrisma().$transaction(async tx => {
    await lockAccountChanges(tx);
    const actor = await requireActionSession(tx, auth, true);
    await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id=${ticketId} FOR UPDATE`;
    const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new OperationError(404, "TICKET_NOT_FOUND", "Ticket not found.");
    let before: ActionTaken | null = null;
    if (actionId) {
      await tx.$queryRaw`SELECT id FROM "ActionTaken" WHERE id=${actionId} AND "ticketId"=${ticketId} FOR UPDATE`;
      before = await tx.actionTaken.findFirst({ where: { id: actionId, ticketId } });
      if (!before) notFound();
    }
    const prior = await tx.actionWriteReceipt.findUnique({ where: { ticketId_actorId_requestId: { ticketId, actorId: actor.id, requestId: body.requestId } } });
    if (prior) {
      if (prior.operation !== operation || prior.payloadHash !== payloadHash) throw new OperationError(409, "REQUEST_ID_REUSED", "This retry key belongs to a different operation.");
      return { actionId: prior.actionId, eventId: prior.eventId, actionVersion: prior.actionVersion, ticketVersion: prior.ticketVersion, replayed: true };
    }
    if (ticket.version !== body.ticketVersion) conflict();
    if (body.kind !== "create" && before?.version !== body.version) conflict();
    if (terminal.includes(ticket.status)) throw new OperationError(409, "TICKET_TERMINAL", "Actions are read-only on this terminal Ticket.");
    if (before && before.cycle !== ticket.resolutionCycle) throw new OperationError(409, "ACTION_PRIOR_CYCLE", "Work from an earlier cycle is read-only.");
    if (before && (before.state === "CANCELLED" || (before.state === "COMPLETED" && body.kind !== "edit"))) throw new OperationError(409, "ACTION_READ_ONLY", "This action operation is locked.");
    if (body.kind === "create" || body.kind === "assign") {
      if (body.assigneeId !== null && !await tx.user.findFirst({ where: { id: body.assigneeId, isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } } })) throw new OperationError(400, "INVALID_ASSIGNEE", "Choose an active Staff member or Administrator.", { assigneeId: "This account is not eligible." });
    }
    if (body.kind === "create" || body.kind === "edit") {
      if (body.actionAt < ticket.createdAt || body.actionAt.getTime() > Date.now() + 300000) throw new OperationError(400, "VALIDATION_ERROR", "Action time must be between Ticket creation and five minutes from now.", { actionAt: "Choose a time within this Ticket's work period." });
      if (before?.followUpRequired && !body.followUpRequired && !body.followUpNote) throw new OperationError(400, "VALIDATION_ERROR", "Explain why follow-up is no longer required.", { followUpNote: "Retain an explanation of the cleared follow-up." });
      if (body.kind === "edit" && before?.state === "COMPLETED" && (!body.changeReason || !body.result)) throw new OperationError(400, "VALIDATION_ERROR", "Completed corrections need a Result and Change reason.", { changeReason: "Explain the correction.", result: "Retain a nonblank completed Result." });
    }
    let after: ActionTaken; let eventKind: string; let reason: string | null = null;
    if (body.kind === "create") {
      const { actionAt, description, result, followUpRequired, followUpNote, attachmentNotes, assigneeId } = body;
      after = await tx.actionTaken.create({ data: { ticketId, cycle: ticket.resolutionCycle, createdById: actor.id, actionAt, description, result, followUpRequired, followUpNote, attachmentNotes, assigneeId } }); eventKind = "CREATED";
    } else if (body.kind === "edit") {
      const { actionAt, description, result, followUpRequired, followUpNote, attachmentNotes } = body;
      after = await tx.actionTaken.update({ where: { id: before!.id }, data: { actionAt, description, result, followUpRequired, followUpNote, attachmentNotes, version: { increment: 1 } } });
      eventKind = "EDITED"; reason = body.changeReason || null;
    } else if (body.kind === "assign") {
      after = await tx.actionTaken.update({ where: { id: before!.id }, data: { assigneeId: body.assigneeId, version: { increment: 1 } } }); eventKind = "ASSIGNED";
    } else {
      const allowed = before!.state === "PLANNED" ? ["IN_PROGRESS", "COMPLETED", "CANCELLED"] : before!.state === "IN_PROGRESS" ? ["COMPLETED", "CANCELLED"] : [];
      if (!allowed.includes(body.state)) throw new OperationError(409, "ACTION_TRANSITION_NOT_ALLOWED", "That action transition is not allowed.");
      if (body.state !== "COMPLETED" && body.result !== before!.result) throw new OperationError(400, "VALIDATION_ERROR", "This transition must retain the current Result.", { result: "Edit Result separately or complete the work." });
      after = await tx.actionTaken.update({ where: { id: before!.id }, data: { state: body.state, result: body.result,
        ...(body.state === "COMPLETED" ? { performedById: actor.id, performedAt: new Date() } : {}),
        cancellationReason: body.state === "CANCELLED" ? body.cancellationReason : null, version: { increment: 1 } } });
      eventKind = body.state === "IN_PROGRESS" ? "STARTED" : body.state; reason = body.cancellationReason || null;
    }
    const updated = await tx.ticket.update({ where: { id: ticketId }, data: { version: { increment: 1 } } });
    const event = await appendActionEvent(tx, actor.id, eventKind, before, after, reason);
    const receipt = { actionId: after.id, eventId: event.id, actionVersion: after.version, ticketVersion: updated.version };
    await tx.actionWriteReceipt.create({ data: { ...receipt, actorId: actor.id, ticketId, requestId: body.requestId, operation, payloadHash } });
    return { ...receipt, replayed: false };
  }, { maxWait: 10000, timeout: 10000 });
}

export async function listActionWork(auth: AuthLocals, query: Record<string, unknown>) {
  const q = parseWorkQuery(query);
  return getPrisma().$transaction(async tx => {
    const actor = await requireActionSession(tx, auth);
    if (actor.role === "REQUESTER") throw new OperationError(403, "FORBIDDEN", "Staff access is required.");
    const parts: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (q.assigned) parts.push(Prisma.sql`a."assigneeId"=${actor.id}`);
    if (q.performed) parts.push(Prisma.sql`a."performedById"=${actor.id}`);
    if (q.state) parts.push(Prisma.sql`a.state=${q.state}::"ActionState"`);
    if (q.active) parts.push(Prisma.sql`a.state IN ('PLANNED','IN_PROGRESS') AND a.cycle=t."resolutionCycle" AND t.status IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')`);
    if (q.since && q.until) parts.push(Prisma.sql`a."performedAt" >= ${q.since} AND a."performedAt" <= ${q.until}`);
    const where = Prisma.join(parts, " AND ");
    const [count] = await tx.$queryRaw<Array<{ total: bigint }>>`SELECT count(*) AS total FROM "ActionTaken" a JOIN "Ticket" t ON t.id=a."ticketId" WHERE ${where}`;
    const order = q.performed ? Prisma.sql`a."performedAt" DESC, a.id DESC` : Prisma.sql`a."updatedAt" DESC, a.id DESC`;
    const ids = await tx.$queryRaw<Array<{ id: number; actionNumber: number }>>`SELECT a.id, ${actionNumberSql} AS "actionNumber" FROM "ActionTaken" a JOIN "Ticket" t ON t.id=a."ticketId" WHERE ${where} ORDER BY ${order} LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`;
    const rows = await tx.actionTaken.findMany({ where: { id: { in: ids.map(a => a.id) } }, select: { id: true, ticketId: true, description: true, cycle: true, state: true, assignee: { select: { id: true, displayName: true } }, performedBy: { select: { id: true, displayName: true } }, performedAt: true, version: true, ticket: { select: { ticketNumber: true, status: true } } } });
    const items = ids.map(({ id, actionNumber }) => { const a = rows.find(row => row.id === id)!; const { description, ticket, ...data } = a; return { ...data, actionNumber, summary: description.slice(0, 120), ticketNumber: ticket.ticketNumber, ticketStatus: ticket.status }; });
    return pageEnvelope(items, q.page, q.pageSize, Number(count.total));
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
