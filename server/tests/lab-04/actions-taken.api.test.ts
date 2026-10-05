import request from "supertest";
import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { app } from "../../src/app.js";
import { db, setupActionFixture, user, ticket, login, createBody, fields, write, actionPath } from "./action-fixture.js";
setupActionFixture();
it("protects owned reads and Staff/Admin writes with real sessions and CSRF", async () => {
  const owner = await user("REQUESTER"), other = await user("REQUESTER"), t = await ticket("OPEN", owner.id), s = await login(await user()), o = await login(owner), b = await login(other);
  expect((await request(app).get(`/api/tickets/${t.id}/actions`)).status).toBe(401);
  expect((await write(o, actionPath(t.id), "post", createBody())).status).toBe(403);
  expect((await s.agent.post(actionPath(t.id)).send(createBody())).status).toBe(403);
  const saved = await write(s, actionPath(t.id), "post", createBody()); expect(saved.status).toBe(201);
  expect((await b.agent.get(`/api/tickets/${t.id}/actions`)).status).toBe(404);
  const read = await o.agent.get(`/api/tickets/${t.id}/actions`); expect(read.status).toBe(200); expect(read.body.items).toHaveLength(1);
  for (const suffix of [`/${saved.body.actionId}`, `/${saved.body.actionId}/history`]) {
    expect((await o.agent.get(`/api/tickets/${t.id}/actions${suffix}`)).status).toBe(200);
    expect((await b.agent.get(`/api/tickets/${t.id}/actions${suffix}`)).status).toBe(404);
  }
  expect((await o.agent.get("/api/staff/actions")).status).toBe(403);
  expect((await o.agent.get("/api/staff/action-assignees")).status).toBe(403);
  expect(JSON.stringify(read.body)).not.toMatch(/passwordHash|csrfHash|tokenHash|internalNote|storedName/);
  await db.user.update({ where: { id: owner.id }, data: { mustChangePassword: true } });
  expect((await o.agent.get(`/api/tickets/${t.id}/actions`)).body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
});
it("creates multiple actions with independent creator, assignee, performer and Ticket Owner", async () => {
  const actor = await user(), assignee = await user(), t = await ticket(), s = await login(actor), second = await login(await user("ADMINISTRATOR"));
  await db.ticket.update({ where: { id: t.id }, data: { ownerId: assignee.id } });
  const saved = await write(s, actionPath(t.id), "post", { ...createBody(), assigneeId: assignee.id }); expect(saved.status).toBe(201);
  const completed = await write(second, `${actionPath(t.id)}/${saved.body.actionId}/state`, "patch", { state: "COMPLETED", result: "Restored", cancellationReason: "", version: 1, ticketVersion: 2, requestId: randomUUID() }); expect(completed.status).toBe(200);
  expect((await write(s, actionPath(t.id), "post", createBody(3))).status).toBe(201);
  const rows = (await s.agent.get(`/api/tickets/${t.id}/actions`)).body.items;
  expect(rows).toHaveLength(2); expect(rows[0]).toMatchObject({ createdBy: { id: actor.id }, assignee: { id: assignee.id }, state: "COMPLETED", result: "Restored", version: 2 });
  expect(rows[0].performedBy.id).not.toBe(actor.id); expect(rows[1].performedBy).toBeNull();
  expect((await db.ticket.findUniqueOrThrow({ where: { id: t.id } })).ownerId).toBe(assignee.id);
});
it("enforces lifecycle, completed corrections/reasons and cancellation locks", async () => {
  const t = await ticket(), s = await login(await user()), r = await write(s, actionPath(t.id), "post", createBody()); const p = `${actionPath(t.id)}/${r.body.actionId}`;
  expect((await write(s, `${p}/state`, "patch", { state: "COMPLETED", result: " ", cancellationReason: "", version: 1, ticketVersion: 2, requestId: randomUUID() })).status).toBe(400);
  expect((await write(s, `${p}/state`, "patch", { state: "IN_PROGRESS", result: "", cancellationReason: "", version: 1, ticketVersion: 2, requestId: randomUUID() })).status).toBe(200);
  expect((await write(s, `${p}/state`, "patch", { state: "COMPLETED", result: "Done", cancellationReason: "", version: 2, ticketVersion: 3, requestId: randomUUID() })).status).toBe(200);
  const edit = { ...fields(), result: "Corrected", version: 3, ticketVersion: 4, requestId: randomUUID(), changeReason: "" };
  expect((await write(s, p, "patch", edit)).status).toBe(400);
  expect((await write(s, p, "patch", { ...edit, changeReason: "Clarify actual outcome" })).status).toBe(200);
  const performer = (await db.actionTaken.findUniqueOrThrow({ where: { id: r.body.actionId } })).performedById;
  expect((await write(s, `${p}/assignee`, "patch", { assigneeId: null, version: 4, ticketVersion: 5, requestId: randomUUID() })).body.error.code).toBe("ACTION_READ_ONLY");
  expect((await db.actionTaken.findUniqueOrThrow({ where: { id: r.body.actionId } })).performedById).toBe(performer);
  const b = await write(s, actionPath(t.id), "post", createBody(5));
  expect((await write(s, `${actionPath(t.id)}/${b.body.actionId}/state`, "patch", { state: "CANCELLED", result: "", cancellationReason: "Duplicate", version: 1, ticketVersion: 6, requestId: randomUUID() })).status).toBe(200);
  expect((await write(s, `${actionPath(t.id)}/${b.body.actionId}`, "patch", { ...fields(), version: 2, ticketVersion: 7, requestId: randomUUID(), changeReason: "" })).body.error.code).toBe("ACTION_READ_ONLY");
});
it("validates bounds, time, forged fields, independent edit/assignment and follow-up clearing", async () => {
  const t = await ticket(), s = await login(await user());
  for (const change of [{ actionAt: "2025-12-31T00:00:00Z" }, { actionAt: new Date(Date.now() + 301000).toISOString() }, { createdById: 1 }, { followUpRequired: true, followUpNote: " " }]) expect((await write(s, actionPath(t.id), "post", { ...createBody(), ...change })).status).toBe(400);
  const r = await write(s, actionPath(t.id), "post", { ...createBody(), followUpRequired: true, followUpNote: "Check next day" });
  const edit = { ...fields(), version: 1, ticketVersion: 2, requestId: randomUUID(), changeReason: "" };
  expect((await write(s, `${actionPath(t.id)}/${r.body.actionId}`, "patch", edit)).status).toBe(400);
  expect((await write(s, `${actionPath(t.id)}/${r.body.actionId}`, "patch", { ...edit, followUpNote: "Verified stable; no further work" })).status).toBe(200);
  expect((await write(s, `${actionPath(t.id)}/${r.body.actionId}`, "patch", { ...edit, assigneeId: 1 })).status).toBe(400);
});
it("rejects invalid assignees, parent mismatch, terminal and prior-cycle mutations", async () => {
  const t = await ticket(), other = await ticket(), s = await login(await user()), requester = await user("REQUESTER"), inactive = await user(); await db.user.update({ where: { id: inactive.id }, data: { isActive: false } });
  for (const id of [requester.id, inactive.id, 2147483647]) expect((await write(s, actionPath(t.id), "post", { ...createBody(), assigneeId: id })).body.error.code).toBe("INVALID_ASSIGNEE");
  const assignees = await s.agent.get("/api/staff/action-assignees");
  expect(assignees.status).toBe(200); expect(assignees.body.items).toHaveLength(1);
  expect(assignees.body.items[0].role).toBe("IT_STAFF");
  expect((await s.agent.get("/api/staff/action-assignees?userId=1")).status).toBe(400);
  const r = await write(s, actionPath(t.id), "post", createBody());
  expect((await s.agent.get(`/api/tickets/${other.id}/actions/${r.body.actionId}`)).status).toBe(404);
  expect((await write(s, `${actionPath(other.id)}/${r.body.actionId}/assignee`, "patch", { assigneeId: null, version: 1, ticketVersion: 1, requestId: randomUUID() })).status).toBe(404);
  await db.ticket.update({ where: { id: t.id }, data: { resolutionCycle: 2 } });
  expect((await write(s, `${actionPath(t.id)}/${r.body.actionId}/assignee`, "patch", { assigneeId: null, version: 1, ticketVersion: 2, requestId: randomUUID() })).body.error.code).toBe("ACTION_PRIOR_CYCLE");
  for (const status of ["RESOLVED", "CLOSED", "CANCELLED"] as const) { await db.ticket.update({ where: { id: t.id }, data: { status } }); expect((await write(s, actionPath(t.id), "post", createBody(2))).body.error.code).toBe("TICKET_TERMINAL"); }
});
it("returns safe query and service failures without leaked database details", async () => {
  const s = await login(await user()), t = await ticket();
  for (const q of ["page=1&page=2", "cycle=1", "page[x]=1", "pageSize=5"]) expect((await s.agent.get(`/api/tickets/${t.id}/actions?${q}`)).status).toBe(400);
  const fail = vi.spyOn(db, "$transaction").mockRejectedValueOnce(new Error("private SQL secret"));
  try { const r = await s.agent.get(`/api/tickets/${t.id}/actions`); expect(r.status).toBe(500); expect(JSON.stringify(r.body)).not.toContain("private"); } finally { fail.mockRestore(); }
  expect((await s.agent.get("/api/health")).status).toBe(200);
});
