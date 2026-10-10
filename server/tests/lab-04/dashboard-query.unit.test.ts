import { expect, it } from "vitest";
import { parseDashboardFilters, recentRange } from "../../src/dashboard/dashboard-query.js";
import { parseTicketListQuery, ticketListWhere } from "../../src/tickets/ticket-list-query.js";
import { parseQueueQuery } from "../../src/staff/queue-query.js";
it("uses exactly seven elapsed days and validates offset timestamps", () => {
  const now = new Date("2026-10-10T05:00:00+07:00");
  expect(recentRange(now).gte.toISOString()).toBe("2026-10-02T22:00:00.000Z");
  const errors = {}; const q = parseDashboardFilters({ updatedSince: "2026-10-03T05:00:00+07:00", updatedUntil: now.toISOString() }, errors);
  expect(errors).toEqual({}); expect(q.updatedSince).toEqual(recentRange(now).gte);
});
it.each([
  { statusGroup: "active", status: "OPEN" }, { statusGroup: ["active", "active"] },
  { updatedSince: "2026-01-01T00:00:00Z" }, { updatedSince: "2026-01-01T00:00:00", updatedUntil: "2026-10-01T00:00:00Z" },
  { resolvedSince: "2026-01-01T00:00:00Z", resolvedUntil: "2026-10-01T00:00:00Z" },
  { updatedSince: "2026-02-30T00:00:00Z", updatedUntil: "2026-10-01T00:00:00Z" },
  { updatedSince: "2026-10-02T00:00:00Z", updatedUntil: "2026-10-01T00:00:00Z" },
])("rejects invalid filters consistently in both lists: %j", query => {
  expect(parseTicketListQuery(query).success).toBe(false); expect(parseQueueQuery(query).success).toBe(false);
});
it("combines active and range with requester ownership without changing default queries", () => {
  const q = parseTicketListQuery({ statusGroup: "active", updatedSince: "2026-01-01T00:00:00Z", updatedUntil: "2026-10-01T00:00:00Z" });
  expect(q.success).toBe(true); if (!q.success) return;
  expect(ticketListWhere(8, q.data)).toMatchObject({ requesterId: 8, status: { in: ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] }, updatedAt: { gte: new Date("2026-01-01T00:00:00Z") } });
  expect(parseTicketListQuery({}).success).toBe(true); expect(parseQueueQuery({}).success).toBe(true);
});
