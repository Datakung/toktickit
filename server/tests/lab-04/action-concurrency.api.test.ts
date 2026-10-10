import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { app } from "../../src/app.js";
import request from "supertest";
import { mutateAction } from "../../src/actions/action-service.js";
import { sha256, sessionCsrf, csrfHash } from "../../src/auth/security.js";
import type { AuthLocals } from "../../src/auth/auth-middleware.js";
import { db, setupActionFixture, user, ticket, login, createBody, fields, write, actionPath } from "./action-fixture.js";
setupActionFixture();

// Both transactions reach the lock boundary before either may proceed. This
// proves overlapping writes instead of depending on HTTP scheduling luck.
async function synchronizedWrites<T>(writes: Array<() => Promise<T>>) {
  const real = db.$transaction.bind(db);
  let arrived = 0, release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const spy = vi.spyOn(db, "$transaction").mockImplementation(((callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: object) => real(async tx => {
    const proxy = new Proxy(tx, { get(target, prop) {
      if (prop === "$executeRaw") return async (...args: Parameters<typeof target.$executeRaw>) => {
        const query = args[0], sql = Array.isArray(query) ? query.join("") : (query as Prisma.Sql).sql;
        if (sql.includes("pg_advisory_xact_lock")) {
          if (++arrived === writes.length) release();
          await barrier;
        }
        return target.$executeRaw(...args);
      };
      return Reflect.get(target, prop);
    } });
    return callback(proxy);
  }, options)) as typeof db.$transaction);
  try { return await Promise.all(writes.map(run => run())); }
  finally { release(); spy.mockRestore(); }
}

async function authFor(actor: Awaited<ReturnType<typeof user>>): Promise<AuthLocals> {
  const raw = randomUUID(), hash = csrfHash(sessionCsrf(raw));
  const session = await db.session.create({ data: { userId: actor.id, tokenHash: sha256(raw), csrfHash: hash, expiresAt: new Date(Date.now() + 60000) } });
  return { currentUser: actor, sessionId: session.id, rawSessionToken: raw, storedCsrfHash: hash };
}
it("serializes simultaneous creates and exact lost-response replays with no extra event/version", async () => {
  const t = await ticket(), s = await login(await user()), body = createBody();
  const same = await synchronizedWrites([() => write(s, actionPath(t.id), "post", body), () => write(s, actionPath(t.id), "post", body)]);
  expect(same.map(r => r.status).sort()).toEqual([200, 201]); expect(same.map(r => r.body.actionId)).toEqual([same[0].body.actionId, same[0].body.actionId]);
  expect(await db.actionTaken.count()).toBe(1); expect(await db.actionTakenEvent.count()).toBe(1); expect(await db.actionWriteReceipt.count()).toBe(1);
  expect((await db.ticket.findUniqueOrThrow({ where: { id: t.id } })).version).toBe(2);
  expect((await write(s, actionPath(t.id), "post", { ...body, description: "Changed retry" })).body.error.code).toBe("REQUEST_ID_REUSED");
  await db.ticket.update({ where: { id: t.id }, data: { status: "RESOLVED", version: 3 } });
  expect((await write(s, actionPath(t.id), "post", body)).body).toMatchObject({ replayed: true, ticketVersion: 2 });
});
it("rejects stale parent/child writes and preserves earlier field save when separate assignment fails or is replayed", async () => {
  const t = await ticket(), actor = await user(), s = await login(actor), r = await write(s, actionPath(t.id), "post", createBody()), p = `${actionPath(t.id)}/${r.body.actionId}`;
  const edit = { ...fields(), description: "Saved correction", version: 1, ticketVersion: 2, requestId: randomUUID(), changeReason: "" };
  const competing = await synchronizedWrites([() => write(s, p, "patch", edit), () => write(s, p, "patch", { ...edit, description: "Other", requestId: randomUUID() })]);
  expect(competing.map(x => x.status).sort()).toEqual([200, 409]);
  const fresh = await db.actionTaken.findUniqueOrThrow({ where: { id: r.body.actionId } });
  const a = { assigneeId: (await user("REQUESTER")).id, version: fresh.version, ticketVersion: 3, requestId: randomUUID() };
  expect((await write(s, `${p}/assignee`, "patch", a)).body.error.code).toBe("INVALID_ASSIGNEE");
  expect(await db.actionTakenEvent.count()).toBe(2); expect((await db.actionTaken.findUniqueOrThrow({ where: { id: fresh.id } })).description).toBe(fresh.description);
  const valid = { ...a, assigneeId: actor.id, requestId: randomUUID() };
  expect((await write(s, `${p}/assignee`, "patch", { ...valid, version: 1 })).body.error.code).toBe("VERSION_CONFLICT");
  const saved = await write(s, `${p}/assignee`, "patch", valid); expect(saved.status).toBe(200);
  // Treat the confirmed response as lost: replay exactly the second operation only.
  expect((await write(s, `${p}/assignee`, "patch", valid)).body).toMatchObject({ replayed: true, actionVersion: 3, ticketVersion: 4 });
  expect(await db.actionTakenEvent.count()).toBe(3); expect(await db.actionWriteReceipt.count()).toBe(3);
});
it("rolls back action, event, receipt and parent version if receipt persistence fails", async () => {
  const t = await ticket(), auth = await authFor(await user());
  const real = db.$transaction.bind(db);
  const failing = vi.spyOn(db, "$transaction").mockImplementationOnce(((callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: object) => real(async tx => {
    const proxy = new Proxy(tx, { get(target, prop) {
      if (prop === "actionWriteReceipt") return new Proxy(target.actionWriteReceipt, { get(delegate, key) { if (key === "create") return () => { throw new Error("Simulated receipt outage"); }; return Reflect.get(delegate, key); } });
      return Reflect.get(target, prop);
    } });
    return callback(proxy);
  }, options)) as typeof db.$transaction);
  try { await expect(mutateAction(auth, t.id, "create", createBody())).rejects.toThrow("Simulated receipt outage"); } finally { failing.mockRestore(); }
  expect(await db.actionTaken.count()).toBe(0); expect(await db.actionTakenEvent.count()).toBe(0); expect(await db.actionWriteReceipt.count()).toBe(0);
  expect((await db.ticket.findUniqueOrThrow({ where: { id: t.id } })).version).toBe(1);
});
it("rechecks revoked/changed-session actors inside writes and does not disclose another actor's receipt", async () => {
  const t = await ticket(), actor = await user(), auth = await authFor(actor), body = createBody();
  await mutateAction(auth, t.id, "create", body);
  const other = await authFor(await user());
  await expect(mutateAction(other, t.id, "create", body)).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  await db.session.delete({ where: { id: auth.sessionId } });
  await expect(mutateAction(auth, t.id, "create", body)).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
  const newAuth = await authFor(actor);
  await db.user.update({ where: { id: actor.id }, data: { role: "REQUESTER" } });
  await expect(mutateAction(newAuth, t.id, "create", body)).rejects.toMatchObject({ code: "FORBIDDEN" });
});
it.each(["deactivate", "role"])("account %s safely unassigns active work once per Ticket, preserving completed performer", async mode => {
  const staff = await user(), admin = await user("ADMINISTRATOR"), t = await ticket(), s = await login(staff), a = await login(admin);
  await db.ticket.update({ where: { id: t.id }, data: { ownerId: staff.id } });
  const first = await write(s, actionPath(t.id), "post", { ...createBody(), assigneeId: staff.id });
  const second = await write(s, actionPath(t.id), "post", { ...createBody(2), assigneeId: staff.id });
  const third = await write(s, actionPath(t.id), "post", { ...createBody(3), assigneeId: staff.id });
  await write(s, `${actionPath(t.id)}/${third.body.actionId}/state`, "patch", { state: "COMPLETED", result: "Done", cancellationReason: "", version: 1, ticketVersion: 4, requestId: randomUUID() });
  const result = await write(a, `/api/admin/users/${staff.id}`, "patch", { displayName: staff.displayName, email: staff.email, role: mode === "role" ? "REQUESTER" : staff.role, isActive: mode !== "deactivate", version: staff.version });
  expect(result.status).toBe(200);
  const active = await db.actionTaken.findMany({ where: { id: { in: [first.body.actionId, second.body.actionId] } } });
  expect(active.every(x => x.assigneeId === null && x.version === 2)).toBe(true);
  expect((await db.ticket.findUniqueOrThrow({ where: { id: t.id } })).version).toBe(6);
  expect(await db.actionTakenEvent.count({ where: { kind: "ASSIGNEE_REMOVED" } })).toBe(2);
  expect(await db.actionTaken.findUnique({ where: { id: third.body.actionId } })).toMatchObject({ assigneeId: staff.id, performedById: staff.id, state: "COMPLETED", version: 2 });
  expect((await s.agent.get(`/api/tickets/${t.id}/actions`)).status).toBe(401);
});
it("serializes an Admin eligibility edit with action assignment", async () => {
  const target = await user(), actor = await user(), admin = await user("ADMINISTRATOR"), t = await ticket(), s = await login(actor), a = await login(admin);
  const r = await write(s, actionPath(t.id), "post", createBody());
  const results = await synchronizedWrites([
    () => write(s, `${actionPath(t.id)}/${r.body.actionId}/assignee`, "patch", { assigneeId: target.id, version: 1, ticketVersion: 2, requestId: randomUUID() }),
    () => write(a, `/api/admin/users/${target.id}`, "patch", { displayName: target.displayName, email: target.email, role: target.role, isActive: false, version: 1 }),
  ]);
  expect(results[1].status).toBe(200); expect([200, 400, 409]).toContain(results[0].status);
  expect((await db.actionTaken.findUniqueOrThrow({ where: { id: r.body.actionId } })).assigneeId).toBeNull();
});
