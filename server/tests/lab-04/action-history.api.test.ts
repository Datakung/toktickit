import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { db, setupActionFixture, user, ticket, login, createBody, fields, write, actionPath } from "./action-fixture.js";
setupActionFixture();
it("keeps parent version, action page and whole-cycle summary on one snapshot during a concurrent write", async () => {
  const t = await ticket(), s = await login(await user());
  const real = db.$transaction.bind(db);
  let signal!: () => void, resume!: () => void;
  const snapshotRead = new Promise<void>(resolve => { signal = resolve; });
  const writeFinished = new Promise<void>(resolve => { resume = resolve; });
  const spy = vi.spyOn(db, "$transaction").mockImplementationOnce(((callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: object) => real(async tx => {
    const proxy = new Proxy(tx, { get(target, prop) {
      if (prop === "ticket") return new Proxy(target.ticket, { get(delegate, key) {
        if (key === "findFirst") return async (args: Parameters<typeof delegate.findFirst>[0]) => {
          const row = await delegate.findFirst(args); signal(); await writeFinished; return row;
        };
        return Reflect.get(delegate, key);
      } });
      return Reflect.get(target, prop);
    } });
    return callback(proxy);
  }, options)) as typeof db.$transaction);
  const reading = s.agent.get(`/api/tickets/${t.id}/actions`).then(response => response);
  try {
    await snapshotRead;
    expect((await write(s, actionPath(t.id), "post", createBody())).status).toBe(201);
    resume();
    const old = await reading;
    expect(old.status).toBe(200);
    expect(old.body).toMatchObject({ ticketVersion: 1, total: 0, items: [], resolutionGate: { completedCount: 0, unfinishedCount: 0 } });
    const fresh = await s.agent.get(`/api/tickets/${t.id}/actions`);
    expect(fresh.body).toMatchObject({ ticketVersion: 2, total: 1, resolutionGate: { unfinishedCount: 1 } });
  } finally { resume(); spy.mockRestore(); await reading; }
});
it("returns stable action/revision pages, safe snapshots, and database-enforced append-only history", async () => {
  const t = await ticket(), s = await login(await user()), body = createBody(), created = await write(s, actionPath(t.id), "post", body);
  for (let i = 1; i <= 22; i++) {
    const r = await write(s, `${actionPath(t.id)}/${created.body.actionId}`, "patch", { ...fields(), description: `Revision ${i}`, version: i, ticketVersion: i + 1, requestId: randomUUID(), changeReason: "" }); expect(r.status).toBe(200);
  }
  const p = `/api/tickets/${t.id}/actions/${created.body.actionId}/history`;
  const first = await s.agent.get(p), second = await s.agent.get(`${p}?page=2`);
  expect(first.body.total).toBe(23); expect(first.body.items).toHaveLength(20); expect(second.body.items).toHaveLength(3);
  const beyond = await s.agent.get(`${p}?page=2147483647`);
  expect(beyond.status).toBe(200); expect(beyond.body.items).toEqual([]); expect(beyond.body.total).toBe(23);
  expect([...first.body.items, ...second.body.items].map(x => x.version)).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
  expect(first.body.items[1].before.description).toBe(body.description); expect(first.body.items[1].after.description).toBe("Revision 1");
  for (const method of ["patch", "delete"] as const) expect((await s.agent[method](p).send({})).status).toBe(404);
  const event = first.body.items[0];
  await expect(db.actionTakenEvent.update({ where: { id: event.id }, data: { kind: "EDITED" } })).rejects.toThrow();
  await expect(db.actionTakenEvent.delete({ where: { id: event.id } })).rejects.toThrow();
  await expect(db.actionWriteReceipt.deleteMany()).rejects.toThrow();
  const receipt = await db.actionWriteReceipt.findFirstOrThrow();
  await expect(db.actionWriteReceipt.update({ where: { id: receipt.id }, data: { ticketVersion: 999 } })).rejects.toThrow();
  const transition = await db.ticketTransitionEvent.create({ data: { ticketId: t.id, actorId: event.actor.id, fromStatus: "NEW", toStatus: "OPEN", cycle: 1, ticketVersion: 999 } });
  await expect(db.ticketTransitionEvent.update({ where: { id: transition.id }, data: { cycle: 2 } })).rejects.toThrow();
  await expect(db.ticketTransitionEvent.delete({ where: { id: transition.id } })).rejects.toThrow();
  expect(JSON.stringify(first.body)).not.toMatch(/password|tokenHash|internalNote/i);
});
it("calculates whole-cycle gate counts even when the blocker is on page two, excluding old cycles", async () => {
  const t = await ticket(), actor = await user(), s = await login(actor), now = new Date();
  const rows = Array.from({ length: 21 }, (_, i) => ({ ticketId: t.id, cycle: 1, state: i < 20 ? "COMPLETED" as const : "PLANNED" as const, actionAt: now, createdAt: now, description: `Work ${i}`, result: i < 20 ? "Done" : "", createdById: actor.id, performedById: i < 20 ? actor.id : null, performedAt: i < 20 ? now : null, followUpNote: "", attachmentNotes: "" }));
  await db.actionTaken.createMany({ data: rows });
  const p = `/api/tickets/${t.id}/actions`;
  const first = await s.agent.get(p); expect(first.body.items.every((x: { state: string }) => x.state === "COMPLETED")).toBe(true);
  expect(first.body.resolutionGate).toEqual({ cycle: 1, completedCount: 20, unfinishedCount: 1, outstandingFollowUpCount: 0, meetsActionRequirements: false });
  const second = await s.agent.get(`${p}?page=2`); expect(second.body.items).toHaveLength(1); expect(second.body.resolutionGate).toEqual(first.body.resolutionGate);
  const beyond = await s.agent.get(`${p}?page=2147483647`);
  expect(beyond.status).toBe(200); expect(beyond.body.items).toEqual([]); expect(beyond.body.resolutionGate).toEqual(first.body.resolutionGate);
  const last = second.body.items[0]; await db.actionTaken.update({ where: { id: last.id }, data: { state: "COMPLETED", result: "Done", performedById: actor.id, performedAt: now, followUpRequired: true, followUpNote: "Later follow-up" } });
  expect((await s.agent.get(p)).body.resolutionGate).toMatchObject({ unfinishedCount: 0, outstandingFollowUpCount: 1, meetsActionRequirements: false });
  await db.ticket.update({ where: { id: t.id }, data: { resolutionCycle: 2, version: 2 } });
  const empty = await s.agent.get(`${p}?page=999`); expect(empty.body.items).toEqual([]); expect(empty.body).toMatchObject({ ticketVersion: 2, currentCycle: 2, resolutionGate: { completedCount: 0, unfinishedCount: 0, outstandingFollowUpCount: 0, meetsActionRequirements: false } });
  expect((await s.agent.get(`/api/tickets/${t.id}/actions/${last.id}`)).body.action.id).toBe(last.id);
});
it("work-list me filters preserve historical performed work but exclude prior-cycle active assignment", async () => {
  const t = await ticket(), actor = await user(), s = await login(actor), other = await user(), now = new Date();
  await db.actionTaken.createMany({ data: [
    { ticketId: t.id, cycle: 1, actionAt: now, description: "My active", result: "", createdById: actor.id, assigneeId: actor.id, followUpNote: "", attachmentNotes: "" },
    { ticketId: t.id, cycle: 1, state: "COMPLETED", actionAt: now, description: "My done", result: "Done", createdById: other.id, performedById: actor.id, performedAt: now, followUpNote: "", attachmentNotes: "" },
  ] });
  expect((await s.agent.get("/api/staff/actions?assignedTo=me&stateGroup=active")).body.total).toBe(1);
  await db.ticket.update({ where: { id: t.id }, data: { resolutionCycle: 2 } });
  expect((await s.agent.get("/api/staff/actions?assignedTo=me&stateGroup=active")).body.total).toBe(0);
  const done = await s.agent.get("/api/staff/actions").query({ performedBy: "me", state: "COMPLETED", performedSince: now.toISOString(), performedUntil: now.toISOString() });
  expect(done.body.total).toBe(1); expect(done.body.items[0].summary).toBe("My done");
  expect((await s.agent.get("/api/staff/actions?assignedTo=1")).status).toBe(400);
});
