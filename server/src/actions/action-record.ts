import { Prisma, type ActionTaken } from "@prisma/client";

const person = { select: { id: true, displayName: true } } as const;
// Public ordinal counts every action on the same Ticket, including previous
// cycles and cancelled/unassigned work. Never rank a filtered work-list page.
export const actionNumberSql = Prisma.sql`(SELECT count(*)::int FROM "ActionTaken" preceding
  WHERE preceding."ticketId"=a."ticketId" AND (preceding."createdAt", preceding.id) <= (a."createdAt", a.id))`;
export const actionSelect = {
  id: true, ticketId: true, cycle: true, state: true, actionAt: true, description: true,
  result: true, assignee: person, createdBy: person, performedBy: person, performedAt: true,
  followUpRequired: true, followUpNote: true, attachmentNotes: true, cancellationReason: true,
  version: true, createdAt: true, updatedAt: true,
} satisfies Prisma.ActionTakenSelect;
export function actionSnapshot(a: ActionTaken): Prisma.InputJsonObject {
  return { id: a.id, ticketId: a.ticketId, cycle: a.cycle, state: a.state,
    actionAt: a.actionAt.toISOString(), description: a.description, result: a.result,
    assigneeId: a.assigneeId, createdById: a.createdById, performedById: a.performedById,
    performedAt: a.performedAt?.toISOString() ?? null, followUpRequired: a.followUpRequired,
    followUpNote: a.followUpNote, attachmentNotes: a.attachmentNotes, cancellationReason: a.cancellationReason,
  };
}
export async function appendActionEvent(tx: Prisma.TransactionClient, actorId: number, kind: string, before: ActionTaken | null, after: ActionTaken, reason: string | null = null) {
  return tx.actionTakenEvent.create({ data: { actionId: after.id, ticketId: after.ticketId,
    actorId, kind, version: after.version, reason,
    before: before ? actionSnapshot(before) : Prisma.DbNull, after: actionSnapshot(after),
  } });
}

// Called inside the account-integrity transaction, after its global account lock.
// Lock the union of owned Tickets and assigned actions in deterministic order.
export async function unassignAccountWork(tx: Prisma.TransactionClient, targetId: number, actorId: number) {
  const tickets = await tx.$queryRaw<Array<{ id: number; ownerId: number | null }>>`
    SELECT t.id, t."ownerId" FROM "Ticket" t WHERE t."ownerId" = ${targetId}
    OR EXISTS (SELECT 1 FROM "ActionTaken" a WHERE a."ticketId"=t.id AND a."assigneeId"=${targetId} AND a.state IN ('PLANNED','IN_PROGRESS'))
    ORDER BY t.id FOR UPDATE`;
  for (const ticket of tickets) {
    await tx.$queryRaw`SELECT id FROM "ActionTaken" WHERE "ticketId"=${ticket.id} AND "assigneeId"=${targetId} AND state IN ('PLANNED','IN_PROGRESS') ORDER BY id FOR UPDATE`;
    const actions = await tx.actionTaken.findMany({ where: { ticketId: ticket.id, assigneeId: targetId, state: { in: ["PLANNED", "IN_PROGRESS"] } }, orderBy: { id: "asc" } });
    for (const before of actions) {
      const after = await tx.actionTaken.update({ where: { id: before.id }, data: { assigneeId: null, version: { increment: 1 } } });
      await appendActionEvent(tx, actorId, "ASSIGNEE_REMOVED", before, after, "Account is no longer eligible for active assignment.");
    }
    await tx.ticket.update({ where: { id: ticket.id }, data: {
      ...(ticket.ownerId === targetId ? { ownerId: null } : {}), version: { increment: 1 },
    } });
  }
}
