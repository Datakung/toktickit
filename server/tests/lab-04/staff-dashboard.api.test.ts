import { afterEach, expect, it, vi } from "vitest";
import { db, setupActionFixture, user, ticket, login, fields } from "./action-fixture.js";
setupActionFixture(); afterEach(() => vi.useRealTimers());
it.each(["IT_STAFF", "ADMINISTRATOR"] as const)("%s gets operational snapshot, current-user work and exact count drill-downs", async role => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-10T12:00:00Z"));
  const actor = await user(role), other = await user(), s = await login(actor);
  for (const status of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED", "RESOLVED", "CLOSED", "CANCELLED"] as const) await ticket(status);
  await db.ticket.update({ where: { id: 2 }, data: { ownerId: actor.id } });
  await db.ticket.update({ where: { id: 3 }, data: { ownerId: other.id } });
  const make = (ticketId: number, cycle: number, state: "PLANNED" | "COMPLETED", assigneeId: number, performedById: number | null = null) => db.actionTaken.create({ data: { ...fields(), result: state === "COMPLETED" ? "Verified work" : "", actionAt: new Date(), ticketId, cycle, state, createdById: actor.id, assigneeId, performedById, performedAt: state === "COMPLETED" ? new Date() : null } });
  await db.ticket.update({ where: { id: 2 }, data: { resolutionCycle: 2 } });
  await make(1, 1, "PLANNED", actor.id); await make(2, 1, "PLANNED", actor.id); await make(6, 1, "PLANNED", actor.id); await make(1, 1, "PLANNED", other.id);
  // Historical completion remains performed work after reopening.
  await db.ticket.update({ where: { id: 5 }, data: { resolutionCycle: 2 } });
  await make(5, 1, "COMPLETED", other.id, actor.id);
  const result = await s.agent.get("/api/dashboard/staff");
  expect(result.status).toBe(200); const data = result.body;
  expect(data.metrics.unassignedTickets).toBe(3); expect(data.metrics.myTickets).toBe(1); expect(data.metrics.myAssignedActions).toBe(1);
  expect(Object.values(data.metrics.statusCounts)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  expect(data.metrics.priorityCounts).toEqual({ LOW: 0, MEDIUM: 5, HIGH: 0 });
  expect(data.recentPerformedActions).toHaveLength(1); expect(data.recentTickets.length).toBeLessThanOrEqual(5);
  for (const key of ["unassignedTickets", "myTickets", "myAssignedActions"]) {
    const list = await s.agent.get(`/api${data.drillDown[key]}`); expect(list.status).toBe(200); expect(list.body.total).toBe(data.metrics[key]);
  }
  for (const group of ["statusCounts", "priorityCounts"]) for (const key of Object.keys(data.metrics[group])) {
    const list = await s.agent.get(`/api${data.drillDown[group][key]}`); expect(list.status).toBe(200); expect(list.body.total).toBe(data.metrics[group][key]);
  }
  expect((await s.agent.get(`/api${data.drillDown.recentPerformedActions}`)).body.total).toBe(1);
  expect(result.headers["cache-control"]).toBe("no-store");
  expect(JSON.stringify(data)).not.toMatch(/password|email|Internal|session|storedName/);
});
it("Requester cannot access Staff metrics; no identity override and no fabricated counts on failure", async () => {
  expect((await (await login(await user("REQUESTER"))).agent.get("/api/dashboard/staff")).status).toBe(403);
  const s = await login(await user());
  expect((await s.agent.get("/api/dashboard/staff?userId=1")).status).toBe(400);
  const spy = vi.spyOn(db, "$transaction").mockRejectedValueOnce(new Error("private SQL credential"));
  const failed = await s.agent.get("/api/dashboard/staff"); spy.mockRestore();
  expect(failed.status).toBe(500); expect(failed.body.metrics).toBeUndefined(); expect(JSON.stringify(failed.body)).not.toContain("private SQL");
});
