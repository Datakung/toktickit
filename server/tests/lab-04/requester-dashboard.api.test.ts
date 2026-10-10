import { afterEach, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { db, setupActionFixture, user, ticket, login } from "./action-fixture.js";
setupActionFixture();
afterEach(() => vi.useRealTimers());
const now = new Date("2026-10-10T12:00:00Z"), from = new Date("2026-10-03T12:00:00Z");
it("returns owned counts, inclusive seven-day boundaries, bounded ordered lists and matching drill-downs", async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now);
  const owner = await user("REQUESTER"), other = await user("REQUESTER"), session = await login(owner);
  for (const status of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED", "RESOLVED", "CLOSED", "CANCELLED"] as const) {
    const row = await ticket(status, owner.id);
    await db.ticket.update({ where: { id: row.id }, data: { updatedAt: from, resolvedAt: status === "RESOLVED" ? from : null } });
  }
  await db.ticket.update({ where: { id: 1 }, data: { updatedAt: now } });
  const old = await ticket("RESOLVED", owner.id);
  await db.ticket.update({ where: { id: old.id }, data: { updatedAt: new Date(from.getTime() - 1), resolvedAt: null } });
  const future = await ticket("OPEN", owner.id);
  await db.ticket.update({ where: { id: future.id }, data: { updatedAt: new Date(now.getTime() + 1) } });
  await ticket("WAITING_FOR_REQUESTER", other.id);
  const response = await session.agent.get("/api/dashboard/requester");
  expect(response.status).toBe(200); expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.body.asOf).toBe(now.toISOString()); expect(response.body.recentFrom).toBe(from.toISOString());
  expect(response.body.metrics).toEqual({ activeTickets: 6, waitingForMe: 1, recentlyUpdated: 8, recentlyResolved: 1 });
  expect(response.body.recentTickets).toHaveLength(5);
  expect(response.body.recentTickets.map((t: { id: number }) => t.id)).toEqual([1, 8, 7, 6, 5]);
  expect(response.body.attentionTickets).toHaveLength(1);
  for (const [name, href] of Object.entries(response.body.drillDown)) {
    if (!(name in response.body.metrics)) continue;
    const list = await session.agent.get(`/api${href}`);
    expect(list.status).toBe(200); expect(list.body.meta.totalItems).toBe(response.body.metrics[name]);
  }
  expect(JSON.stringify(response.body)).not.toMatch(/password|email|description|Internal|session|storedName/);
});
it("returns explicit zeroes, rejects identity/unknown/duplicate query overrides and enforces role/session", async () => {
  const requester = await login(await user("REQUESTER"));
  const result = await requester.agent.get("/api/dashboard/requester");
  expect(result.status).toBe(200); expect(Object.values(result.body.metrics)).toEqual([0, 0, 0, 0]);
  expect(result.body.recentTickets).toEqual([]); expect(result.body.attentionTickets).toEqual([]);
  for (const query of ["?requesterId=999", "?userId=999", "?page=1", "?asOf=x", "?userId=1&userId=2"]) expect((await requester.agent.get(`/api/dashboard/requester${query}`)).status).toBe(400);
  expect((await (await login(await user())).agent.get("/api/dashboard/requester")).status).toBe(403);
  expect((await request(app).get("/api/dashboard/requester")).status).toBe(401);
});
it("rejects malformed additive filters rather than silently serving the unfiltered list", async () => {
  const session = await login(await user("REQUESTER"));
  for (const query of ["statusGroup=closed", "statusGroup=active&status=OPEN", "updatedSince=2026-01-01Z", "updatedSince=2026-01-01T00:00:00Z&updatedUntil=2025-01-01T00:00:00Z", "resolvedSince=2026-01-01T00:00:00Z&resolvedUntil=2026-10-01T00:00:00Z", "updatedSince=2026-02-30T00:00:00Z&updatedUntil=2026-10-01T00:00:00Z"]) expect((await session.agent.get(`/api/tickets?${query}`)).status).toBe(400);
});
