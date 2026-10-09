import { expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { Prisma, type TicketStatus } from "@prisma/client";
import request from "supertest";
import { app } from "../../src/app.js";
import { db, setupActionFixture, user, ticket, login, createBody, write, actionPath } from "./action-fixture.js";
setupActionFixture();
const statusPath = (id: number) => `/api/staff/tickets/${id}/status`;
async function completed(t: Awaited<ReturnType<typeof ticket>>, actor: Awaited<ReturnType<typeof user>>, followUpRequired = false, cycle = 1) {
  return db.actionTaken.create({ data: { ticketId: t.id, cycle, state: "COMPLETED", actionAt: new Date(),
    createdById: actor.id, performedById: actor.id, performedAt: new Date(), description: "Actual work", result: "Verified",
    followUpRequired, followUpNote: followUpRequired ? "Review needed" : "", attachmentNotes: "" } });
}

it("blocks missing completed work, unfinished work and outstanding follow-up independently", async () => {
  const actor = await user(), s = await login(actor);
  for (const kind of ["empty", "cancelled", "unfinished", "follow-up", "old-cycle"] as const) {
    const t = await ticket();
    if (kind === "cancelled") await db.actionTaken.create({ data: { ticketId: t.id, cycle: 1, createdById: actor.id, actionAt: new Date(), description: "Abandoned", result: "", followUpNote: "", attachmentNotes: "", state: "CANCELLED", cancellationReason: "Not needed" } });
    if (kind === "unfinished" || kind === "follow-up") await completed(t, actor, kind === "follow-up");
    if (kind === "unfinished") await db.actionTaken.create({ data: { ticketId: t.id, cycle: 1, createdById: actor.id, actionAt: new Date(), description: "Unfinished", result: "", followUpNote: "", attachmentNotes: "" } });
    if (kind === "old-cycle") { await completed(t, actor); await db.ticket.update({ where: { id: t.id }, data: { resolutionCycle: 2 } }); }
    const result = await write(s, statusPath(t.id), "patch", { status: "RESOLVED", version: 1 });
    expect(result.status, kind).toBe(409);
    expect(result.body.error.code).toBe("RESOLUTION_GATE_NOT_MET");
    expect(result.body.error.message).toMatch(kind === "unfinished" ? /unfinished/i : kind === "follow-up" ? /follow-up/i : /completed/i);
    expect(await db.ticket.findUnique({ where: { id: t.id } })).toMatchObject({ status: "OPEN", version: 1, resolvedAt: null });
    expect(await db.ticketTransitionEvent.count({ where: { ticketId: t.id } })).toBe(0);
  }
});

it("resolves, closes and reopens atomically, preserving old work and clearing indication/date", async () => {
  const actor = await user(), requester = await user("REQUESTER"), s = await login(actor), r = await login(requester), t = await ticket("OPEN", requester.id);
  const work = await completed(t, actor);
  const indication = await write(r, `/api/tickets/${t.id}/resolution-indication`, "post", { version: 1 });
  expect(indication.body).toMatchObject({ status: "OPEN", version: 2 });
  expect(await db.ticketTransitionEvent.count()).toBe(0);
  const resolved = await write(s, statusPath(t.id), "patch", { status: "RESOLVED", version: 2 });
  expect(resolved.status).toBe(200);
  expect(resolved.body).toMatchObject({ status: "RESOLVED", version: 3, resolutionCycle: 1 });
  expect(resolved.body.resolvedAt).toBeTruthy();
  const closed = await write(s, statusPath(t.id), "patch", { status: "CLOSED", version: 3 });
  expect(closed.body.resolvedAt).toBe(resolved.body.resolvedAt);
  const reopened = await write(s, statusPath(t.id), "patch", { status: "REOPENED", version: 4 });
  expect(reopened.body).toMatchObject({ status: "REOPENED", version: 5, resolutionCycle: 2, resolvedAt: null, requesterResolutionIndicatedAt: null });
  expect((await write(s, statusPath(t.id), "patch", { status: "RESOLVED", version: 5 })).body.error.code).toBe("RESOLUTION_GATE_NOT_MET");
  expect(await db.actionTaken.findUnique({ where: { id: work.id } })).toMatchObject({ cycle: 1, state: "COMPLETED", performedById: actor.id });
  const history = await r.agent.get(`/api/tickets/${t.id}/workflow-history`);
  expect(history.status).toBe(200);
  expect(history.body.items.map((x: { toStatus: string }) => x.toStatus)).toEqual(["RESOLVED", "CLOSED", "REOPENED"]);
  expect(history.body.items.map((x: { cycle: number }) => x.cycle)).toEqual([1, 1, 2]);
  expect(history.body.items[0]).toMatchObject({ actor: { id: actor.id }, ticketVersion: 3 });
  expect(history.body.items[0].createdAt).toBe(resolved.body.resolvedAt);
});

it("blocks Ticket cancellation while work is active and retains stale-version precedence", async () => {
  const t = await ticket(), s = await login(await user());
  const action = await write(s, actionPath(t.id), "post", createBody());
  expect((await write(s, statusPath(t.id), "patch", { status: "CANCELLED", version: 1 })).body.error.code).toBe("VERSION_CONFLICT");
  expect((await write(s, statusPath(t.id), "patch", { status: "CANCELLED", version: 2 })).body.error.code).toBe("ACTIVE_ACTIONS_REMAIN");
  const cancelled = await write(s, `${actionPath(t.id)}/${action.body.actionId}/state`, "patch", {
    state: "CANCELLED", result: "", cancellationReason: "No longer needed", version: 1, ticketVersion: 2, requestId: randomUUID(),
  });
  expect(cancelled.status).toBe(200);
  expect((await write(s, statusPath(t.id), "patch", { status: "CANCELLED", version: 3 })).body).toMatchObject({ status: "CANCELLED", version: 4 });
  expect(await db.ticketTransitionEvent.count()).toBe(1);
});

it("preserves legacy terminal compatibility and protects shared history visibility/input", async () => {
  const owner = await user("REQUESTER"), other = await login(await user("REQUESTER")), staff = await login(await user()), admin = await login(await user("ADMINISTRATOR")), r = await login(owner);
  const t = await ticket("RESOLVED", owner.id);
  const empty = await r.agent.get(`/api/tickets/${t.id}/workflow-history`);
  expect(empty.body).toMatchObject({ items: [], total: 0, totalPages: 1 });
  expect(empty.headers["cache-control"]).toBe("no-store");
  expect((await other.agent.get(`/api/tickets/${t.id}/workflow-history`)).status).toBe(404);
  expect((await r.agent.get(`/api/tickets/${t.id}/workflow-history?cycle=999`)).status).toBe(400);
  expect((await r.agent.get(`/api/tickets/${t.id}/workflow-history?page=1&page=2`)).status).toBe(400);
  expect((await write(r, statusPath(t.id), "patch", { status: "CLOSED", version: 1 })).status).toBe(403);
  const closed = await write(admin, statusPath(t.id), "patch", { status: "CLOSED", version: 1 });
  expect(closed.body).toMatchObject({ status: "CLOSED", resolutionCycle: 1, resolvedAt: null });
  expect((await staff.agent.get(`/api/tickets/${t.id}/workflow-history`)).body.total).toBe(1);
  expect((await write(staff, statusPath(t.id), "patch", { status: "REOPENED", version: 2, bypass: true })).status).toBe(400);
  expect((await r.agent.delete(`/api/tickets/${t.id}/workflow-history`)).status).toBe(404);
  expect((await request(app).get(`/api/tickets/${t.id}/workflow-history`)).status).toBe(401);
  expect((await staff.agent.get(`/api/tickets/2147483647/workflow-history`)).status).toBe(404);
  expect((await staff.agent.patch(statusPath(t.id)).send({ status: "REOPENED", version: 2 })).status).toBe(403);
});

it("enforces all 64 status pairs through the API, never recording rejected transitions", async () => {
  const allowed: Record<TicketStatus, TicketStatus[]> = {
    NEW: ["OPEN", "CANCELLED"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
    IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
    RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"], REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], CANCELLED: [],
  };
  const actor = await user(), s = await login(actor), owner = await user("REQUESTER");
  for (const from of Object.keys(allowed) as TicketStatus[]) for (const to of Object.keys(allowed) as TicketStatus[]) {
    const t = await ticket(from, owner.id);
    if (to === "RESOLVED") await completed(t, actor);
    const ok = allowed[from].includes(to), result = await write(s, statusPath(t.id), "patch", { status: to, version: 1 });
    expect(result.status, `${from} -> ${to}`).toBe(ok ? 200 : 409);
    if (!ok) expect(result.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    expect(await db.ticket.findUnique({ where: { id: t.id } })).toMatchObject({ status: ok ? to : from, version: ok ? 2 : 1, resolutionCycle: ok && to === "REOPENED" ? 2 : 1 });
    const events = await db.ticketTransitionEvent.findMany({ where: { ticketId: t.id } });
    expect(events).toHaveLength(ok ? 1 : 0);
    if (ok) expect(events[0]).toMatchObject({ fromStatus: from, toStatus: to, ticketVersion: 2, actorId: actor.id });
  }
}, 15000);

it("paginates immutable history beyond page one with an ID tie-break and no private data", async () => {
  const actor = await user(), owner = await user("REQUESTER"), t = await ticket("OPEN", owner.id), r = await login(owner);
  const time = new Date("2026-10-01T00:00:00Z");
  await db.internalNote.create({ data: { ticketId: t.id, authorId: actor.id, body: "Never disclose private notes" } });
  await db.ticketTransitionEvent.createMany({ data: Array.from({ length: 23 }, (_, i) => ({ ticketId: t.id, actorId: actor.id,
    fromStatus: "IN_PROGRESS" as const, toStatus: "WAITING_FOR_REQUESTER" as const, cycle: 1, ticketVersion: i + 2, createdAt: time })) });
  const first = await r.agent.get(`/api/tickets/${t.id}/workflow-history`), second = await r.agent.get(`/api/tickets/${t.id}/workflow-history?page=2`);
  expect(first.body).toMatchObject({ total: 23, totalPages: 2, page: 1, pageSize: 20 });
  expect(first.body.items).toHaveLength(20); expect(second.body.items).toHaveLength(3);
  const ids = [...first.body.items, ...second.body.items].map((e: { id: number }) => e.id);
  expect(ids).toEqual([...ids].sort((a, b) => a - b)); expect(new Set(ids).size).toBe(23);
  expect(JSON.stringify(first.body)).not.toMatch(/private notes|password|tokenHash|csrfHash|email/i);
  expect((await r.agent.get(`/api/tickets/${t.id}/workflow-history?page=2147483647`)).body.items).toEqual([]);
  expect((await r.agent.get(`/api/tickets/${t.id}/workflow-history?pageSize=21`)).status).toBe(400);
  await expect(db.$executeRaw(Prisma.sql`UPDATE "TicketTransitionEvent" SET cycle = 2 WHERE id = ${ids[0]}`)).rejects.toThrow();
  await expect(db.$executeRaw(Prisma.sql`DELETE FROM "TicketTransitionEvent" WHERE id = ${ids[0]}`)).rejects.toThrow();
  expect(await db.ticketTransitionEvent.count({ where: { ticketId: t.id } })).toBe(23);
});

it("returns a safe history failure and recovers without leaking database details", async () => {
  const owner = await user("REQUESTER"), r = await login(owner), t = await ticket("OPEN", owner.id);
  const failing = vi.spyOn(db, "$transaction").mockRejectedValueOnce(new Error("Private connection secret from database"));
  try {
    const response = await r.agent.get(`/api/tickets/${t.id}/workflow-history`);
    expect(response.status).toBe(500); expect(response.body.error.code).toBe("WORKFLOW_HISTORY_FAILED");
    expect(failing).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(response.body)).not.toMatch(/secret|connection|database|stack/i);
  } finally { failing.mockRestore(); }
  expect((await r.agent.get(`/api/tickets/${t.id}/workflow-history`)).body.total).toBe(0);
});
