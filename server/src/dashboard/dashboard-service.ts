import { Prisma, TicketStatus, RequestedPriority } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { requireActionSession } from "../actions/action-service.js";
import { actionNumberSql } from "../actions/action-record.js";
import { OperationError } from "../staff/ticket-operations.js";
import type { AuthLocals } from "../auth/auth-middleware.js";
import { activeStatuses, recentRange } from "./dashboard-query.js";

const ticketSelect = { id: true, ticketNumber: true, summary: true, status: true, itPriority: true, updatedAt: true, owner: { select: { id: true, displayName: true } } } as const;
const orderBy = [{ updatedAt: "desc" }, { id: "desc" }] as const;
const route = (path: string, query: Record<string, string | number>) => `${path}?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]))}`;
const activeSql = Prisma.join(activeStatuses.map(s => Prisma.sql`${s}::"TicketStatus"`));

export async function readDashboard(auth: AuthLocals, kind: "requester" | "staff") {
  return getPrisma().$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const actor = await requireActionSession(tx, auth);
    if ((actor.role === "REQUESTER") !== (kind === "requester")) throw new OperationError(403, "FORBIDDEN", "Your role cannot open this dashboard.");
    const asOf = new Date(), range = recentRange(asOf), recentFrom = range.gte;
    const dates = { updatedSince: recentFrom.toISOString(), updatedUntil: asOf.toISOString() };
    const path = kind === "requester" ? "/tickets" : "/staff/tickets";
    const recentTickets = await tx.ticket.findMany({ where: { updatedAt: range, ...(kind === "requester" ? { requesterId: actor.id } : {}) }, select: ticketSelect, orderBy: [...orderBy], take: 5 });
    const common = { asOf: asOf.toISOString(), recentFrom: recentFrom.toISOString(), recentTickets };
    if (kind === "requester") {
      const [metrics] = await tx.$queryRaw<Array<{ activeTickets: number; waitingForMe: number; recentlyUpdated: number; recentlyResolved: number }>>`
        SELECT count(*) FILTER (WHERE status IN (${activeSql}))::int AS "activeTickets",
          count(*) FILTER (WHERE status='WAITING_FOR_REQUESTER')::int AS "waitingForMe",
          count(*) FILTER (WHERE "updatedAt">=${recentFrom} AND "updatedAt"<=${asOf})::int AS "recentlyUpdated",
          count(*) FILTER (WHERE status='RESOLVED' AND "resolvedAt">=${recentFrom} AND "resolvedAt"<=${asOf})::int AS "recentlyResolved"
        FROM "Ticket" WHERE "requesterId"=${actor.id}`;
      const attentionTickets = await tx.ticket.findMany({ where: { requesterId: actor.id, status: "WAITING_FOR_REQUESTER" }, select: ticketSelect, orderBy: [...orderBy], take: 5 });
      return { ...common, metrics, attentionTickets, drillDown: {
        activeTickets: route(path, { statusGroup: "active" }), waitingForMe: route(path, { status: "WAITING_FOR_REQUESTER" }),
        recentlyUpdated: route(path, dates), recentlyResolved: route(path, { status: "RESOLVED", resolvedSince: recentFrom.toISOString(), resolvedUntil: asOf.toISOString() }),
        recentTickets: route(path, dates), attentionTickets: route(path, { status: "WAITING_FOR_REQUESTER" }),
      } };
    }
    const statusFields = Object.values(TicketStatus).map(s => Prisma.sql`count(*) FILTER (WHERE status=${s}::"TicketStatus")::int AS ${Prisma.raw(`"${s}"`)}`);
    const priorityFields = Object.values(RequestedPriority).map(p => Prisma.sql`count(*) FILTER (WHERE status IN (${activeSql}) AND "itPriority"=${p}::"RequestedPriority")::int AS ${Prisma.raw(`"${p}"`)}`);
    const [counts] = await tx.$queryRaw<Array<Record<string, number>>>`SELECT ${Prisma.join([...statusFields, ...priorityFields])},
      count(*) FILTER (WHERE status IN (${activeSql}) AND "ownerId" IS NULL)::int AS "unassignedTickets",
      count(*) FILTER (WHERE status IN (${activeSql}) AND "ownerId"=${actor.id})::int AS "myTickets" FROM "Ticket"`;
    const [actions] = await tx.$queryRaw<Array<{ total: number }>>`SELECT count(*)::int AS total FROM "ActionTaken" a JOIN "Ticket" t ON t.id=a."ticketId"
      WHERE a."assigneeId"=${actor.id} AND a.state IN ('PLANNED','IN_PROGRESS') AND a.cycle=t."resolutionCycle" AND t.status IN (${activeSql})`;
    const recentPerformedActions = await tx.$queryRaw<Array<{ id: number; actionNumber: number; ticketId: number; ticketNumber: string; summary: string; state: string; performedAt: Date }>>`
      SELECT a.id, ${actionNumberSql} AS "actionNumber", a."ticketId", t."ticketNumber", left(a.description,120) AS summary, a.state, a."performedAt"
      FROM "ActionTaken" a JOIN "Ticket" t ON t.id=a."ticketId" WHERE a.state='COMPLETED' AND a."performedById"=${actor.id}
      AND a."performedAt">=${recentFrom} AND a."performedAt"<=${asOf} ORDER BY a."performedAt" DESC, a.id DESC LIMIT 5`;
    return { ...common, metrics: { unassignedTickets: counts.unassignedTickets, myTickets: counts.myTickets, myAssignedActions: actions.total,
      statusCounts: Object.fromEntries(Object.values(TicketStatus).map(s => [s, counts[s]])),
      priorityCounts: Object.fromEntries(Object.values(RequestedPriority).map(p => [p, counts[p]])),
    }, recentPerformedActions, drillDown: {
      unassignedTickets: route(path, { statusGroup: "active", unassigned: "true" }), myTickets: route(path, { statusGroup: "active", ownerId: actor.id }),
      myAssignedActions: route("/staff/actions", { assignedTo: "me", stateGroup: "active" }),
      statusCounts: Object.fromEntries(Object.values(TicketStatus).map(s => [s, route(path, { status: s })])),
      priorityCounts: Object.fromEntries(Object.values(RequestedPriority).map(p => [p, route(path, { statusGroup: "active", itPriority: p })])),
      recentTickets: route(path, dates), recentPerformedActions: route("/staff/actions", { performedBy: "me", state: "COMPLETED", performedSince: recentFrom.toISOString(), performedUntil: asOf.toISOString() }),
    } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 10000 });
}
