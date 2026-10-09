import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { changeStatus } from "../../src/staff/ticket-operations.js";
import { sha256, sessionCsrf, csrfHash } from "../../src/auth/security.js";
import type { AuthLocals } from "../../src/auth/auth-middleware.js";
import { db, setupActionFixture, user, ticket, login, createBody, fields, write, actionPath } from "./action-fixture.js";
setupActionFixture();

// Pause both actual transactions at the shared lock boundary before releasing them.
async function overlapping<T>(writes: Array<() => Promise<T>>) {
  const real = db.$transaction.bind(db);
  let arrived = 0, release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const spy = vi.spyOn(db, "$transaction").mockImplementation(((callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: object) => real(async tx => {
    const proxy = new Proxy(tx, { get(target, prop) {
      if (prop === "$executeRaw") return async (...args: Parameters<typeof target.$executeRaw>) => {
        const query = args[0], sql = Array.isArray(query) ? query.join("") : (query as Prisma.Sql).sql;
        if (sql.includes("pg_advisory_xact_lock")) { if (++arrived === writes.length) release(); await barrier; }
        return target.$executeRaw(...args);
      };
      return Reflect.get(target, prop);
    } });
    return callback(proxy);
  }, options)) as typeof db.$transaction);
  try { return await Promise.all(writes.map(run => run())); } finally { release(); spy.mockRestore(); }
}
async function authFor(actor: Awaited<ReturnType<typeof user>>): Promise<AuthLocals> {
  const raw = randomUUID(), hash = csrfHash(sessionCsrf(raw));
  const session = await db.session.create({ data: { userId: actor.id, tokenHash: sha256(raw), csrfHash: hash, expiresAt: new Date(Date.now() + 60000) } });
  return { currentUser: actor, sessionId: session.id, rawSessionToken: raw, storedCsrfHash: hash };
}
async function work(t: Awaited<ReturnType<typeof ticket>>, actor: Awaited<ReturnType<typeof user>>, state: "COMPLETED" | "PLANNED" = "COMPLETED") {
  return db.actionTaken.create({ data: { ...fields(), actionAt: new Date(), ticketId: t.id, cycle: 1, createdById: actor.id, state,
    result: state === "COMPLETED" ? "Verified" : "", performedById: state === "COMPLETED" ? actor.id : null, performedAt: state === "COMPLETED" ? new Date() : null } });
}

it.each(["create", "follow-up"])("serializes resolution against %s without a stale ready gate", async mode => {
  const actor = await user(), s = await login(actor), t = await ticket(), a = await work(t, actor);
  const result = await overlapping([
    () => write(s, `/api/staff/tickets/${t.id}/status`, "patch", { status: "RESOLVED", version: 1 }),
    () => mode === "create" ? write(s, actionPath(t.id), "post", createBody())
      : write(s, `${actionPath(t.id)}/${a.id}`, "patch", { ...fields(), result: "Verified", followUpRequired: true, followUpNote: "Needs review", changeReason: "New finding", version: 1, ticketVersion: 1, requestId: randomUUID() }),
  ]);
  expect(result.filter(x => x.status >= 200 && x.status < 300)).toHaveLength(1);
  expect(result.filter(x => x.status === 409)).toHaveLength(1);
  // Create may lose to resolution, in which case the status write wins instead.
  const current = await db.ticket.findUniqueOrThrow({ where: { id: t.id } });
  expect(current.version).toBe(2);
  expect(await db.ticketTransitionEvent.count()).toBe(current.status === "RESOLVED" ? 1 : 0);
  if (current.status === "RESOLVED") {
    expect(await db.actionTaken.count({ where: { ticketId: t.id, state: { in: ["PLANNED", "IN_PROGRESS"] } } })).toBe(0);
    expect(await db.actionTaken.count({ where: { ticketId: t.id, state: "COMPLETED", followUpRequired: true } })).toBe(0);
  }
});
it("serializes completion against resolution: no completed work means no resolution", async () => {
  const actor = await user(), s = await login(actor), t = await ticket(), a = await work(t, actor, "PLANNED");
  const r = await overlapping([
    () => write(s, `/api/staff/tickets/${t.id}/status`, "patch", { status: "RESOLVED", version: 1 }),
    () => write(s, `${actionPath(t.id)}/${a.id}/state`, "patch", { state: "COMPLETED", result: "Verified fix", cancellationReason: "", version: 1, ticketVersion: 1, requestId: randomUUID() }),
  ]);
  expect(r[0].status).toBe(409); expect(r[1].status).toBe(200);
  expect(["RESOLUTION_GATE_NOT_MET", "VERSION_CONFLICT"]).toContain(r[0].body.error.code);
  expect(await db.ticket.findUnique({ where: { id: t.id } })).toMatchObject({ status: "OPEN", version: 2, resolvedAt: null });
  expect(await db.ticketTransitionEvent.count()).toBe(0);
});
it("serializes cancellation against new active work", async () => {
  const s = await login(await user()), t = await ticket();
  const r = await overlapping([
    () => write(s, `/api/staff/tickets/${t.id}/status`, "patch", { status: "CANCELLED", version: 1 }),
    () => write(s, actionPath(t.id), "post", createBody()),
  ]);
  expect(r.filter(x => x.status >= 200 && x.status < 300)).toHaveLength(1); expect(r.filter(x => x.status === 409)).toHaveLength(1);
  const current = await db.ticket.findUniqueOrThrow({ where: { id: t.id } }); expect(current.version).toBe(2);
  if (current.status === "CANCELLED") expect(await db.actionTaken.count()).toBe(0);
  else { expect(current.status).toBe("OPEN"); expect(await db.actionTaken.count()).toBe(1); }
});
it("serializes reopening against a prior-cycle correction without modifying archived work", async () => {
  const actor = await user(), s = await login(actor), t = await ticket("CLOSED"), a = await work(t, actor);
  const r = await overlapping([
    () => write(s, `/api/staff/tickets/${t.id}/status`, "patch", { status: "REOPENED", version: 1 }),
    () => write(s, `${actionPath(t.id)}/${a.id}`, "patch", { ...fields(), result: "Changed", changeReason: "Correction", version: 1, ticketVersion: 1, requestId: randomUUID() }),
  ]);
  expect(r[0].status).toBe(200); expect(r[1].status).toBe(409);
  expect(await db.ticket.findUnique({ where: { id: t.id } })).toMatchObject({ status: "REOPENED", resolutionCycle: 2, version: 2 });
  expect(await db.actionTaken.findUnique({ where: { id: a.id } })).toMatchObject({ cycle: 1, result: "Verified", version: 1 });
});
it("serializes account-driven unassignment against resolution and retains the completed performer", async () => {
  const actor = await user(), target = await user(), admin = await user("ADMINISTRATOR"), s = await login(actor), a = await login(admin), t = await ticket();
  const done = await work(t, target), pending = await work(t, target, "PLANNED");
  await db.ticket.update({ where: { id: t.id }, data: { ownerId: target.id } });
  await db.actionTaken.update({ where: { id: pending.id }, data: { assigneeId: target.id } });
  const r = await overlapping([
    () => write(s, `/api/staff/tickets/${t.id}/status`, "patch", { status: "RESOLVED", version: 1 }),
    () => write(a, `/api/admin/users/${target.id}`, "patch", { displayName: target.displayName, email: target.email, role: target.role, isActive: false, version: target.version }),
  ]);
  expect(r[0].status).toBe(409); expect(r[1].status).toBe(200);
  expect(await db.ticket.findUnique({ where: { id: t.id } })).toMatchObject({ status: "OPEN", version: 2, ownerId: null });
  expect(await db.actionTaken.findUnique({ where: { id: pending.id } })).toMatchObject({ state: "PLANNED", assigneeId: null, version: 2 });
  expect(await db.actionTaken.findUnique({ where: { id: done.id } })).toMatchObject({ performedById: target.id, state: "COMPLETED", version: 1 });
  expect(await db.ticketTransitionEvent.count()).toBe(0);
});
it("rolls back status, date, cycle, indication and version if transition persistence fails", async () => {
  const actor = await user(), auth = await authFor(actor), t = await ticket("RESOLVED"), indication = new Date();
  await db.ticket.update({ where: { id: t.id }, data: { resolvedAt: indication, requesterResolutionIndicatedAt: indication } });
  const before = await db.ticket.findUniqueOrThrow({ where: { id: t.id } }), real = db.$transaction.bind(db);
  const failing = vi.spyOn(db, "$transaction").mockImplementationOnce(((callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: object) => real(async tx => {
    return callback(new Proxy(tx, { get(target, prop) {
      if (prop === "ticketTransitionEvent") return new Proxy(target.ticketTransitionEvent, { get(delegate, key) { if (key === "create") return () => { throw new Error("Simulated history outage"); }; return Reflect.get(delegate, key); } });
      return Reflect.get(target, prop);
    } }));
  }, options)) as typeof db.$transaction);
  try { await expect(changeStatus(auth, t.id, { status: "REOPENED", version: 1 })).rejects.toThrow("Simulated history outage"); } finally { failing.mockRestore(); }
  expect(await db.ticket.findUnique({ where: { id: t.id } })).toEqual(before); expect(await db.ticketTransitionEvent.count()).toBe(0);
});
it.each(["revoked", "role", "inactive", "forced"])("rechecks %s actor/session inside the status transaction", async mode => {
  const actor = await user(), auth = await authFor(actor), t = await ticket("NEW");
  if (mode === "revoked") await db.session.delete({ where: { id: auth.sessionId } });
  else await db.user.update({ where: { id: actor.id }, data: mode === "role" ? { role: "REQUESTER" } : mode === "inactive" ? { isActive: false } : { mustChangePassword: true } });
  await expect(changeStatus(auth, t.id, { status: "OPEN", version: 1 })).rejects.toMatchObject({ status: mode === "revoked" || mode === "inactive" ? 401 : 403 });
  expect(await db.ticket.findUnique({ where: { id: t.id } })).toMatchObject({ status: "NEW", version: 1 });
  expect(await db.ticketTransitionEvent.count()).toBe(0);
});
