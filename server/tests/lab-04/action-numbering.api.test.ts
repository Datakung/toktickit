import { expect, it } from "vitest";
import { db, setupActionFixture, user, ticket, login, fields, createBody, write, actionPath } from "./action-fixture.js";
setupActionFixture();

it("numbers each Ticket independently across pages, tied timestamps, cycles and filtered work/dashboard views", async () => {
  const owner = await user("REQUESTER"), actor = await user(), other = await user();
  const t = await ticket("OPEN", owner.id), second = await ticket("OPEN", owner.id), s = await login(actor), requester = await login(owner);
  const now = new Date();
  const make = (ticketId: number, index: number) => db.actionTaken.create({ data: {
    ...fields(), actionAt: now, createdAt: now, ticketId, cycle: index === 21 ? 2 : 1,
    createdById: actor.id, assigneeId: index === 21 ? actor.id : other.id,
    state: index === 2 ? "CANCELLED" : index === 20 ? "COMPLETED" : "PLANNED",
    cancellationReason: index === 2 ? "Duplicate work" : null,
    result: index === 20 ? "Verified" : "", performedById: index === 20 ? actor.id : null,
    performedAt: index === 20 ? now : null, description: `Ticket-local work ${index}`,
  } });
  const ids: number[] = [];
  for (let index = 1; index <= 21; index++) {
    ids.push((await make(t.id, index)).id);
    if (index === 1) await make(second.id, 1); // Interleaved IDs are not display ordinals.
  }
  await db.ticket.update({ where: { id: t.id }, data: { resolutionCycle: 2, status: "REOPENED" } });
  const first = await s.agent.get(`/api/tickets/${t.id}/actions`);
  expect(first.status).toBe(200); expect(first.body.items.map(a => a.actionNumber)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  expect(first.body.items.map(a => a.id)).toEqual(ids.slice(0, 20));
  const last = await s.agent.get(`/api/tickets/${t.id}/actions?page=2`);
  expect(last.body.items).toHaveLength(1); expect(last.body.items[0]).toMatchObject({ id: ids[20], actionNumber: 21, cycle: 2 });
  const detail = await requester.agent.get(`/api/tickets/${t.id}/actions/${ids[20]}`);
  expect(detail.status).toBe(200); expect(detail.body.action).toMatchObject({ id: ids[20], actionNumber: 21 });
  const otherTicket = await requester.agent.get(`/api/tickets/${second.id}/actions`);
  expect(otherTicket.body.items[0]).toMatchObject({ actionNumber: 1 }); expect(otherTicket.body.items[0].id).not.toBe(1);
  const assigned = await s.agent.get("/api/staff/actions?assignedTo=me&stateGroup=active");
  expect(assigned.body.items).toHaveLength(1); expect(assigned.body.items[0]).toMatchObject({ id: ids[20], actionNumber: 21 });
  const performed = await s.agent.get("/api/staff/actions?performedBy=me&state=COMPLETED");
  expect(performed.body.items).toHaveLength(1); expect(performed.body.items[0]).toMatchObject({ id: ids[19], actionNumber: 20 });
  const dashboard = await s.agent.get("/api/dashboard/staff");
  expect(dashboard.body.recentPerformedActions).toHaveLength(1); expect(dashboard.body.recentPerformedActions[0]).toMatchObject({ id: ids[19], actionNumber: 20 });
  await make(t.id, 22);
  expect((await s.agent.get(`/api/tickets/${t.id}/actions/${ids[20]}`)).body.action.actionNumber).toBe(21);
  expect((await s.agent.get(`/api/tickets/${t.id}/actions?page=2`)).body.items.map(a => a.actionNumber)).toEqual([21, 22]);
  const stranger = await login(await user("REQUESTER"));
  expect((await stranger.agent.get(`/api/tickets/${t.id}/actions/${ids[20]}`)).status).toBe(404);
});

it("keeps global write IDs, replay receipts and immutable audit snapshots separate from public numbering", async () => {
  const s = await login(await user()), first = await ticket(), second = await ticket();
  const firstWrite = await write(s, actionPath(first.id), "post", createBody());
  expect(firstWrite.status).toBe(201);
  const body = createBody(), created = await write(s, actionPath(second.id), "post", body);
  expect(created.status).toBe(201); expect(created.body.actionId).not.toBe(firstWrite.body.actionId);
  const replay = await write(s, actionPath(second.id), "post", body);
  expect(replay.body).toEqual({ ...created.body, replayed: true });
  const read = await s.agent.get(`/api/tickets/${second.id}/actions/${created.body.actionId}`);
  expect(read.body.action).toMatchObject({ id: created.body.actionId, actionNumber: 1 });
  const history = await s.agent.get(`/api/tickets/${second.id}/actions/${created.body.actionId}/history`);
  expect(history.body.items[0].after).toMatchObject({ id: created.body.actionId, ticketId: second.id });
  expect(history.body.items[0].after).not.toHaveProperty("actionNumber");
  expect((await write(s, actionPath(second.id), "post", { ...createBody(2), actionNumber: 99 })).status).toBe(400);
  expect((await s.agent.get(`/api/tickets/${second.id}/actions`)).body.total).toBe(1);
});
