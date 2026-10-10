import { Prisma, type TicketStatus } from "@prisma/client";
import { instant } from "../actions/action-validation.js";

export const activeStatuses: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
export const dashboardFilterNames = ["statusGroup", "updatedSince", "updatedUntil", "resolvedSince", "resolvedUntil"];
export interface DashboardFilters { statusGroup?: "active"; updatedSince?: Date; updatedUntil?: Date; resolvedSince?: Date; resolvedUntil?: Date }
export function parseDashboardFilters(raw: Record<string, unknown>, fields: Record<string, string>): DashboardFilters {
  const result: DashboardFilters = {};
  if (raw.statusGroup !== undefined) {
    if (raw.statusGroup !== "active") fields.statusGroup = "Choose the active status group.";
    else result.statusGroup = "active";
    if (raw.status !== undefined) fields.status = "Use status or statusGroup, not both.";
  }
  for (const prefix of ["updated", "resolved"] as const) {
    const since = `${prefix}Since` as const, until = `${prefix}Until` as const;
    if (raw[since] === undefined && raw[until] === undefined) continue;
    try {
      result[since] = instant(raw[since], since); result[until] = instant(raw[until], until);
      if (result[since]! > result[until]!) fields[since] = "The start must not be later than the end.";
    } catch { fields[since] = "Supply both valid ISO timestamps including Z or offset."; }
    if (prefix === "resolved" && raw.status !== "RESOLVED") fields.status = "A resolved date range requires status RESOLVED.";
  }
  return result;
}
export function dashboardFilterWhere(q: DashboardFilters): Prisma.TicketWhereInput {
  return {
    ...(q.statusGroup ? { status: { in: activeStatuses } } : {}),
    ...(q.updatedSince ? { updatedAt: { gte: q.updatedSince, lte: q.updatedUntil } } : {}),
    ...(q.resolvedSince ? { resolvedAt: { gte: q.resolvedSince, lte: q.resolvedUntil } } : {}),
  };
}
export function recentRange(asOf: Date) { return { gte: new Date(asOf.getTime() - 7 * 24 * 60 * 60 * 1000), lte: asOf }; }
