import { Prisma } from "@prisma/client";
import { afterEach, expect, it, vi } from "vitest";
import { db, setupActionFixture, user, ticket, login, fields } from "./action-fixture.js";
setupActionFixture(); afterEach(() => vi.useRealTimers());
it("keeps metric totals and bounded summaries on one snapshot during a concurrent Ticket insert", async () => {
  const actor = await user("REQUESTER"), session = await login(actor); await ticket("OPEN", actor.id);
  const real = db.$transaction.bind(db); let signal!: () => void, resume!: () => void;
  const firstRead = new Promise<void>(resolve => { signal = resolve; }), writeFinished = new Promise<void>(resolve => { resume = resolve; });
  const spy = vi.spyOn(db, "$transaction").mockImplementationOnce(((callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: object) => real(async tx => {
    const proxy = new Proxy(tx, { get(target, prop) {
      if (prop === "ticket") return new Proxy(target.ticket, { get(delegate, key) {
        if (key === "findMany") return async (args: Parameters<typeof delegate.findMany>[0]) => { const rows = await delegate.findMany(args); signal(); await writeFinished; return rows; };
        return Reflect.get(delegate, key);
      } });
      return Reflect.get(target, prop);
    } }); return callback(proxy);
  }, options)) as typeof db.$transaction);
  const reading = session.agent.get("/api/dashboard/requester").then(value => value);
  try { await firstRead; await ticket("WAITING_FOR_REQUESTER", actor.id); resume(); const old = await reading;
    expect(old.status).toBe(200); expect(old.body.metrics).toMatchObject({ activeTickets: 1, waitingForMe: 0, recentlyUpdated: 1 }); expect(old.body.recentTickets).toHaveLength(1); expect(old.body.attentionTickets).toHaveLength(0);
    const fresh = await session.agent.get("/api/dashboard/requester"); expect(fresh.body.metrics).toMatchObject({ activeTickets: 2, waitingForMe: 1, recentlyUpdated: 2 });
  } finally { resume(); spy.mockRestore(); await reading; }
});
it("uses inclusive performed UTC boundaries, stable ID ties and prior-cycle history, not assignment or future work", async () => {
  const now = new Date("2026-10-10T12:00:00.000Z"), from = new Date("2026-10-03T12:00:00.000Z"); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now);
  const actor = await user(), other = await user(), t = await ticket("REOPENED"), session = await login(actor); await db.ticket.update({ where: { id: t.id }, data: { resolutionCycle: 2 } });
  const make = (performedAt: Date, performedById = actor.id) => db.actionTaken.create({ data: { ...fields(), actionAt: from, ticketId: t.id, cycle: 1, state: "COMPLETED", result: "Checked", createdById: other.id, assigneeId: other.id, performedById, performedAt } });
  await make(new Date(from.getTime() - 1)); const included = await make(from); const ids = [included.id];
  for (let i = 0; i < 5; i++) ids.push((await make(now)).id); await make(new Date(now.getTime() + 1)); await make(now, other.id);
  const result = await session.agent.get("/api/dashboard/staff"); expect(result.status).toBe(200); expect(result.body.recentPerformedActions.map((a: { id: number }) => a.id)).toEqual(ids.toReversed().slice(0, 5));
  expect((await session.agent.get(`/api${result.body.drillDown.recentPerformedActions}`)).body.total).toBe(6); expect(result.body.metrics.myAssignedActions).toBe(0);
});
it("blocks initial-password, inactive and revoked sessions before dashboard data", async () => {
  const actor = await user("REQUESTER"), session = await login(actor); await ticket("OPEN", actor.id);
  await db.user.update({ where: { id: actor.id }, data: { mustChangePassword: true } }); expect((await session.agent.get("/api/dashboard/requester")).status).toBe(403);
  await db.user.update({ where: { id: actor.id }, data: { mustChangePassword: false, isActive: false } }); expect((await session.agent.get("/api/dashboard/requester")).status).toBe(401);
  await db.user.update({ where: { id: actor.id }, data: { isActive: true } }); const fresh = await login(actor); await db.session.deleteMany({ where: { userId: actor.id } }); expect((await fresh.agent.get("/api/dashboard/requester")).status).toBe(401);
});
