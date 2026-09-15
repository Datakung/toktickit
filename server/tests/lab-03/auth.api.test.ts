import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth/password.js";
import { resetLoginThrottleForTests } from "../../src/auth/login-throttle.js";
import { seedDatabase } from "../../prisma/seed.js";

const prisma = getPrisma();
const origin = "http://localhost:5173";
const initial = "initial-fixture-password";
const changed = "changed-fixture-password";
let requesterEmail: string;
let inactiveEmail: string;
beforeAll(async () => {
  process.env.LEGACY_TEST_AUTH = "disabled";
  await seedDatabase(prisma);
  const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true }, orderBy: { id: "asc" } });
  const inactive = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: false } });
  requesterEmail = requester.email; inactiveEmail = inactive.email;
  const hash = await hashPassword(initial);
  await prisma.user.updateMany({ where: { id: { in: [requester.id, inactive.id] } }, data: { passwordHash: hash, mustChangePassword: true } });
});
afterAll(async () => { process.env.LEGACY_TEST_AUTH = "enabled"; await prisma.session.deleteMany(); });
beforeEach(async () => { resetLoginThrottleForTests(); await prisma.session.deleteMany(); });
async function csrf(agent: ReturnType<typeof request.agent>) { return (await agent.get("/api/auth/csrf")).body.csrfToken as string; }

describe("Lab 3 authentication API", () => {
  it("ignores malformed cookies and remains available for subsequent requests", async () => {
    for (const cookie of ["unrelated=%", "toktickit_session=%", "toktickit_browser=%E0%A4%A", "__proto__=%"]) {
      expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).status).toBe(401);
      expect((await request(app).get("/api/auth/csrf").set("Cookie", cookie)).status).toBe(200);
      expect((await request(app).post("/api/auth/login").set("Cookie", cookie).send({})).status).toBe(403);
      expect((await request(app).get("/api/health")).status).toBe(200);
    }
  });
  it("routes async logout failures to a safe response and permits a later retry", async () => {
    const agent = request.agent(app); const token = await csrf(agent);
    const login = await agent.post("/api/auth/login").set("Origin", origin).set("X-CSRF-Token", token).send({ email: requesterEmail, password: initial });
    expect(login.status).toBe(200);
    const originalDelete = prisma.session.deleteMany;
    const deletion = vi.spyOn(prisma.session, "deleteMany").mockRejectedValueOnce(new Error("private database failure"));
    try {
      const failed = await agent.post("/api/auth/logout").set("Origin", origin).set("X-CSRF-Token", login.body.csrfToken);
      expect(failed.status).toBe(500);
      expect(JSON.stringify(failed.body)).not.toContain("private database");
      expect((await agent.get("/api/auth/me")).status).toBe(200);
      expect((await agent.get("/api/health")).status).toBe(200);
    } finally { deletion.mockRestore(); prisma.session.deleteMany = originalDelete; }
    expect((await agent.post("/api/auth/logout").set("Origin", origin).set("X-CSRF-Token", login.body.csrfToken)).status).toBe(204);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });
  it("uses the same safe response for invalid, absent and inactive credentials", async () => {
    for (const body of [{ email: requesterEmail, password: "wrong-password-value" }, { email: "absent@example.test", password: initial }, { email: inactiveEmail, password: initial }]) {
      const agent = request.agent(app); const token = await csrf(agent);
      const response = await agent.post("/api/auth/login").set("Origin", origin).set("X-CSRF-Token", token).send(body);
      expect(response.status).toBe(401); expect(response.body.error.code).toBe("INVALID_CREDENTIALS"); expect(JSON.stringify(response.body)).not.toMatch(/inactive|absent|hash|prisma/i);
    }
  }, 15000);
  it("requires CSRF and matching Origin for login", async () => {
    const agent = request.agent(app); const token = await csrf(agent);
    expect((await agent.post("/api/auth/login").set("X-CSRF-Token", token).send({ email: requesterEmail, password: initial })).status).toBe(403);
    expect((await agent.post("/api/auth/login").set("Origin", origin).set("X-CSRF-Token", "wrong").send({ email: requesterEmail, password: initial })).status).toBe(403);
    expect((await agent.post("/api/auth/login").set("Origin", origin).set("X-CSRF-Token", token).send({ email: requesterEmail, password: initial, role: "ADMINISTRATOR" })).status).toBe(400);
  });
  it("makes logout idempotent for an absent session with valid browser CSRF", async () => {
    const agent = request.agent(app);
    const token = await csrf(agent);
    expect((await agent.post("/api/auth/logout")
      .set("Origin", origin)
      .set("X-CSRF-Token", token)).status).toBe(204);
    expect((await agent.post("/api/auth/logout")
      .set("Origin", origin)
      .set("X-CSRF-Token", token)).status).toBe(204);
  });
  it("forces initial password change, rotates the session, and invalidates logout", async () => {
    const agent = request.agent(app); let token = await csrf(agent);
    const login = await agent.post("/api/auth/login").set("Origin", origin).set("X-CSRF-Token", token).send({ email: ` ${requesterEmail.toUpperCase()} `, password: initial });
    expect(login.status).toBe(200); expect(login.body.user).toMatchObject({ email: requesterEmail, role: "REQUESTER", mustChangePassword: true });
    expect(login.body.user).not.toHaveProperty("passwordHash"); token = login.body.csrfToken;
    expect((await agent.get("/api/categories")).body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    expect((await agent.get("/api/auth/me")).body.csrfToken).toBe(token);
    const update = await agent.post("/api/auth/change-password").set("Origin", origin).set("X-CSRF-Token", token).send({ currentPassword: initial, newPassword: changed, confirmPassword: changed });
    expect(update.status).toBe(200); expect(update.body.user.mustChangePassword).toBe(false); token = update.body.csrfToken;
    expect((await agent.get("/api/categories")).status).toBe(200);
    expect((await agent.post("/api/auth/logout").set("Origin", origin).set("X-CSRF-Token", token)).status).toBe(204);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/tickets").set("X-Development-Requester-Id", "1")).status).toBe(401);
    await prisma.user.update({ where: { email: requesterEmail }, data: { passwordHash: await hashPassword(initial), mustChangePassword: true } });
  }, 20000);
  it("throttles the sixth failed attempt for one normalized email", async () => {
    const agent = request.agent(app); const token = await csrf(agent);
    for (let count=0; count<5; count++) expect((await agent.post("/api/auth/login").set("Origin",origin).set("X-CSRF-Token",token).send({email:requesterEmail,password:"wrong-password-value"})).status).toBe(401);
    const blocked = await agent.post("/api/auth/login").set("Origin",origin).set("X-CSRF-Token",token).send({email:requesterEmail,password:initial});
    expect(blocked.status).toBe(429); expect(blocked.headers["retry-after"]).toBe("900");
  }, 20000);
});
