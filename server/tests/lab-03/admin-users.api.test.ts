import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth/password.js";
import { resetLoginThrottleForTests } from "../../src/auth/login-throttle.js";
import { seedDatabase } from "../../prisma/seed.js";

const db = getPrisma(); const origin = "http://localhost:5173";
const password = "Admin-fixture-password-2026";
const suffix = "@admin-api.example.test";
let hash: string; let admin: Awaited<ReturnType<typeof db.user.create>>;
beforeAll(async () => { process.env.LEGACY_TEST_AUTH = "disabled"; await seedDatabase(db); hash = await hashPassword(password); });
async function cleanup() {
  await db.ticket.deleteMany({ where: { ticketNumber: { startsWith: "ADMIN-TEST-" } } });
  await db.user.deleteMany({ where: { email: { endsWith: suffix } } });
}
beforeEach(async () => {
  await cleanup(); resetLoginThrottleForTests();
  admin = await db.user.create({ data: { displayName: "Fixture Admin", email: `admin${suffix}`, role: "ADMINISTRATOR", passwordHash: hash, mustChangePassword: false } });
});
afterAll(async () => { await cleanup(); process.env.LEGACY_TEST_AUTH = "enabled"; });
async function login(email = admin.email, value = password) {
  const agent = request.agent(app);
  const csrf = (await agent.get("/api/auth/csrf")).body.csrfToken;
  const response = await agent.post("/api/auth/login").set("Origin", origin).set("X-CSRF-Token", csrf).send({ email, password: value });
  expect(response.status).toBe(200);
  return { agent, token: response.body.csrfToken as string };
}
const base = { displayName: "New Person", email: `new${suffix}`, role: "REQUESTER", isActive: true };
function patchBody(user: typeof admin) { return { displayName: user.displayName, email: user.email, role: user.role, isActive: user.isActive, version: user.version }; }
async function fixture(role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR" = "REQUESTER") {
  return db.user.create({ data: { displayName: "Target Person", email: `target${suffix}`, role, passwordHash: hash, mustChangePassword: false } });
}
describe("Administrator accounts (AC-05/06)", () => {
  it("denies anonymous, non-Admin and mandatory-change access before protected lookups", async () => {
    expect((await request(app).get("/api/admin/users")).status).toBe(401);
    for (const role of ["REQUESTER", "IT_STAFF"] as const) {
      const user = await db.user.create({ data: { displayName: role, email: `${role.toLowerCase()}${suffix}`, role, passwordHash: hash, mustChangePassword: false } });
      const { agent, token } = await login(user.email);
      expect((await agent.get("/api/admin/users")).status).toBe(403);
      expect((await agent.post("/api/admin/users").set("Origin", origin).set("X-CSRF-Token", token).send({ ...base, initialPassword: password })).status).toBe(403);
      expect((await agent.patch("/api/admin/users/999999").send({})).status).toBe(403);
      expect((await agent.post("/api/admin/users/999999/initial-password").send({})).status).toBe(403);
    }
    await db.user.update({ where: { id: admin.id }, data: { mustChangePassword: true } });
    expect((await (await login()).agent.get("/api/admin/users")).body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });
  it("creates normalized one-role accounts, returns no secrets, and rejects duplicate normalized email", async () => {
    const { agent, token } = await login();
    const result = await agent.post("/api/admin/users").set("Origin", origin).set("X-CSRF-Token", token).send({ ...base, email: ` NEW${suffix.toUpperCase()} `, initialPassword: password });
    expect(result.status).toBe(201); expect(result.body).toMatchObject({ ...base, mustChangePassword: true, version: 1 });
    expect(result.body).not.toHaveProperty("passwordHash"); expect(JSON.stringify(result.body)).not.toContain(password);
    expect((await agent.post("/api/admin/users").set("Origin", origin).set("X-CSRF-Token", token).send({ ...base, initialPassword: password })).body.error.code).toBe("EMAIL_CONFLICT");
    const newUser = await login(base.email);
    expect((await newUser.agent.get("/api/tickets")).body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });
  it("validates exact fields, role, scalar queries, password bounds and CSRF", async () => {
    const { agent, token } = await login();
    const input = { ...base, initialPassword: password };
    expect((await agent.post("/api/admin/users").send(input)).status).toBe(403);
    for (const change of [{ displayName: " " }, { email: "bad" }, { role: "OWNER" }, { isActive: "true" }, { initialPassword: "short" }, { role: ["ADMINISTRATOR"] }, { extra: 1 }]) {
      expect((await agent.post("/api/admin/users").set("Origin", origin).set("X-CSRF-Token", token).send({ ...input, ...change })).status).toBe(400);
    }
    for (const query of ["q=a&q=b", "role=BAD", "q[x]=a", "unknown=true", "isActive=", "isActive=1", "isActive=TRUE", "isActive=active", "isActive=true&isActive=false", "isActive[x]=true", `q=${"x".repeat(121)}`]) expect((await agent.get(`/api/admin/users?${query}`)).status).toBe(400);
  });
  it("lists safe fields with combined name/email literal search and role filters", async () => {
    await db.user.create({ data: { displayName: "Percent% Person", email: `literal${suffix}`, role: "IT_STAFF" } });
    const { agent } = await login();
    const result = await agent.get("/api/admin/users").query({ q: "%", role: "IT_STAFF" });
    expect(result.status).toBe(200); expect(result.body.items).toHaveLength(1);
    expect(result.body.items[0].displayName).toBe("Percent% Person");
    expect(result.body.items[0]).not.toHaveProperty("passwordHash");
    expect((await agent.get("/api/admin/users").query({ q: "LITERAL", role: "IT_STAFF" })).body.items).toHaveLength(1);
    expect((await agent.get("/api/admin/users").query({ q: "%", role: "REQUESTER" })).body.items).toHaveLength(0);
  });
  it("combines active/inactive status with search and role, with omission returning both", async () => {
    const active = await fixture("IT_STAFF");
    const inactive = await db.user.create({ data: { displayName: active.displayName, email: `inactive${suffix}`, role: "IT_STAFF", isActive: false } });
    await db.user.create({ data: { displayName: active.displayName, email: `requester${suffix}`, role: "REQUESTER", isActive: false } });
    const { agent } = await login();
    for (const [isActive, expected] of [["true", active.id], ["false", inactive.id]] as const) {
      const result = await agent.get("/api/admin/users").query({ q: "Target Person", role: "IT_STAFF", isActive });
      expect(result.status).toBe(200);
      expect(result.body.items.map((u: { id: number }) => u.id)).toEqual([expected]);
    }
    const all = await agent.get("/api/admin/users").query({ q: "Target Person", role: "IT_STAFF" });
    expect(all.body.items.map((u: { id: number }) => u.id).sort()).toEqual([active.id, inactive.id].sort());
    const empty = await agent.get("/api/admin/users").query({ q: "no-such-person", isActive: "false" });
    expect(empty.status).toBe(200); expect(empty.body.items).toEqual([]);
  });
  it("rejects stale simultaneous edits and duplicate email edits", async () => {
    const target = await fixture(); const { agent, token } = await login();
    const calls = ["First", "Second"].map(displayName => agent.patch(`/api/admin/users/${target.id}`).set("Origin", origin).set("X-CSRF-Token", token).send({ ...patchBody(target), displayName }));
    const results = await Promise.all(calls); expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    const fresh = await db.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(fresh.version).toBe(target.version + 1);
    const duplicate = await agent.patch(`/api/admin/users/${target.id}`).set("Origin", origin).set("X-CSRF-Token", token).send({ ...patchBody(fresh), email: admin.email });
    expect(duplicate.body.error.code).toBe("EMAIL_CONFLICT");
  });
  it("prevents self-deactivation and simultaneous removal of the final Administrators", async () => {
    const others = await db.user.findMany({ where: { role: "ADMINISTRATOR", isActive: true, id: { not: admin.id } } });
    const second = await fixture("ADMINISTRATOR");
    await db.user.updateMany({ where: { id: { in: others.map(u => u.id) } }, data: { isActive: false } });
    try {
      const a = await login(); const b = await login(second.email);
      const self = await a.agent.patch(`/api/admin/users/${admin.id}`).set("Origin", origin).set("X-CSRF-Token", a.token).send({ ...patchBody(admin), isActive: false });
      expect(self.body.error.code).toBe("SELF_DEACTIVATION_FORBIDDEN");
      const result = await Promise.all([
        a.agent.patch(`/api/admin/users/${admin.id}`).set("Origin", origin).set("X-CSRF-Token", a.token).send({ ...patchBody(admin), role: "REQUESTER" }),
        b.agent.patch(`/api/admin/users/${second.id}`).set("Origin", origin).set("X-CSRF-Token", b.token).send({ ...patchBody(second), role: "REQUESTER" }),
      ]);
      expect(result.map(r => r.status).sort()).toEqual([200, 409]);
      expect(result.find(r => r.status === 409)?.body.error.code).toBe("LAST_ADMIN_REQUIRED");
      expect(await db.user.count({ where: { isActive: true, role: "ADMINISTRATOR" } })).toBe(1);
    } finally { await db.user.updateMany({ where: { id: { in: others.map(u => u.id) } }, data: { isActive: true } }); }
  });
  it.each(["deactivate", "role"])("revokes sessions and unassigns owned Tickets on %s without losing history", async mode => {
    const target = await fixture("IT_STAFF"); const targetSession = await login(target.email);
    const category = await db.category.findFirstOrThrow(); const system = await db.relatedSystem.findFirstOrThrow();
    const ticket = await db.ticket.create({ data: { ticketNumber: `ADMIN-TEST-${mode}`, requesterId: target.id, ownerId: target.id, categoryId: category.id, relatedSystemId: system.id, summary: "Historical Ticket", description: "Preserved context", requestedPriority: "LOW", itPriority: "LOW" } });
    const { agent, token } = await login();
    const saved = await agent.patch(`/api/admin/users/${target.id}`).set("Origin", origin).set("X-CSRF-Token", token).send({ ...patchBody(target), ...(mode === "role" ? { role: "REQUESTER" } : { isActive: false }) });
    expect(saved.status).toBe(200);
    expect((await targetSession.agent.get("/api/auth/me")).status).toBe(401);
    const fresh = await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(fresh).toMatchObject({ ownerId: null, version: ticket.version + 1, requesterId: target.id, summary: ticket.summary, status: ticket.status, createdAt: ticket.createdAt });
    if (mode === "deactivate") {
      expect((await agent.patch(`/api/admin/users/${target.id}`).set("Origin", origin).set("X-CSRF-Token", token).send({ ...patchBody(saved.body), isActive: true })).status).toBe(200);
      expect((await (await login(target.email)).agent.get("/api/auth/me")).status).toBe(200);
    }
  });
  it("resets initial credentials, rejects stale reset and revokes old sessions", async () => {
    const target = await fixture(); const old = await login(target.email); const { agent, token } = await login();
    const next = "Reset-fixture-password-2026";
    const response = await agent.post(`/api/admin/users/${target.id}/initial-password`).set("Origin", origin).set("X-CSRF-Token", token).send({ initialPassword: next, version: target.version });
    expect(response.status).toBe(200); expect(response.body.mustChangePassword).toBe(true);
    expect(JSON.stringify(response.body)).not.toContain(next);
    expect((await old.agent.get("/api/auth/me")).status).toBe(401);
    const initial = await login(target.email, next);
    expect((await initial.agent.get("/api/categories")).body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    expect((await agent.post(`/api/admin/users/${target.id}/initial-password`).set("Origin", origin).set("X-CSRF-Token", token).send({ initialPassword: next, version: target.version })).body.error.code).toBe("VERSION_CONFLICT");
  });
  it("returns safe unavailable errors", async () => {
    const { agent } = await login(); const original = db.user.findMany;
    const fail = vi.spyOn(db.user, "findMany").mockRejectedValueOnce(new Error("private SQL password"));
    try { const result = await agent.get("/api/admin/users"); expect(result.status).toBe(500); expect(result.body.error.code).toBe("USER_MANAGEMENT_FAILED"); expect(JSON.stringify(result.body)).not.toContain("private"); }
    finally { fail.mockRestore(); db.user.findMany = original; }
  });
  it("does not let a concurrent old-password login survive an Administrator reset", async () => {
    const target = await fixture(); const { agent, token } = await login();
    const stale = request.agent(app);
    const csrf = (await stale.get("/api/auth/csrf")).body.csrfToken;
    const [reset, attempt] = await Promise.all([
      agent.post(`/api/admin/users/${target.id}/initial-password`).set("Origin", origin).set("X-CSRF-Token", token).send({ initialPassword: "Concurrent-reset-password-2026", version: target.version }),
      stale.post("/api/auth/login").set("Origin", origin).set("X-CSRF-Token", csrf).send({ email: target.email, password }),
    ]);
    expect(reset.status).toBe(200);
    // A login may finish before reset (then be revoked) or lose the row-version race.
    expect([200, 401, 500]).toContain(attempt.status);
    expect((await stale.get("/api/auth/me")).status).toBe(401);
    expect(await db.session.count({ where: { userId: target.id } })).toBe(0);
    expect((await (await login(target.email, "Concurrent-reset-password-2026")).agent.get("/api/categories")).body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });
});
