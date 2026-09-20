import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth/password.js";
import { seedDatabase } from "../../prisma/seed.js";
const db = getPrisma(), origin = "http://localhost:5173", password = "Queue-fixture-password-2026";
const suffix = "@queue-api.example.test"; let hash: string;
async function login(role: "IT_STAFF" | "ADMINISTRATOR" | "REQUESTER" = "IT_STAFF", forced = false) {
  const user = await db.user.create({ data: { displayName: `Queue ${role}`, email: `${role.toLowerCase()}-${Math.random()}${suffix}`, role, passwordHash: hash, mustChangePassword: forced } });
  const agent = request.agent(app), csrf = (await agent.get("/api/auth/csrf")).body.csrfToken;
  const response = await agent.post("/api/auth/login").set("Origin", origin).set("X-CSRF-Token", csrf).send({ email: user.email, password });
  return { user, agent, token: response.body.csrfToken };
}
async function fixtures() {
  const requester = await db.user.create({ data: { displayName: "Queue Requester", email: `requester-${Math.random()}${suffix}`, passwordHash: hash, mustChangePassword: false } });
  const owner = await db.user.create({ data: { displayName: "Queue Owner", email: `owner-${Math.random()}${suffix}`, role: "IT_STAFF", passwordHash: hash, mustChangePassword: false } });
  const category = await db.category.findFirstOrThrow(), system = await db.relatedSystem.findFirstOrThrow();
  const base = { requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, description: "Queue test", requestedPriority: "HIGH" as const, itPriority: "LOW" as const };
  const one = await db.ticket.create({ data: { ...base, ticketNumber: `QUEUE-${Date.now()}-A`, summary: "Literal %_ queue", ownerId: owner.id, status: "IN_PROGRESS" } });
  const two = await db.ticket.create({ data: { ...base, ticketNumber: `QUEUE-${Date.now()}-B`, summary: "Unassigned queue", status: "WAITING_FOR_REQUESTER", itPriority: "HIGH" } });
  return { owner, category, system, one, two };
}
beforeAll(async () => { process.env.LEGACY_TEST_AUTH = "disabled"; await seedDatabase(db); hash = await hashPassword(password); });
beforeEach(async () => { await db.ticket.deleteMany({ where: { ticketNumber: { startsWith: "QUEUE-" } } }); await db.user.deleteMany({ where: { email: { endsWith: suffix } } }); });
afterAll(async () => { await db.ticket.deleteMany({ where: { ticketNumber: { startsWith: "QUEUE-" } } }); await db.user.deleteMany({ where: { email: { endsWith: suffix } } }); process.env.LEGACY_TEST_AUTH = "enabled"; });
describe("Staff Ticket Queue (AC-07)", () => {
  it("denies anonymous, Requester and mandatory-change sessions before returning records", async () => {
    expect((await request(app).get("/api/staff/tickets")).status).toBe(401);
    for (const [role, forced, code] of [["REQUESTER", false, 403], ["IT_STAFF", true, 403]] as const) {
      const { agent } = await login(role, forced); expect((await agent.get("/api/staff/tickets")).status).toBe(code);
    }
  });
  it("returns deterministic safe summaries to Staff and Administrator", async () => {
    await fixtures();
    for (const role of ["IT_STAFF", "ADMINISTRATOR"] as const) {
      const { agent } = await login(role); const result = await agent.get("/api/staff/tickets").query({ q: "QUEUE-", sort: "createdAt", direction: "asc", pageSize: "10" });
      expect(result.status).toBe(200); expect(result.body.total).toBe(2); expect(result.body.totalPages).toBe(1);
      expect(result.body.items[0]).toMatchObject({ requester: { displayName: "Queue Requester" }, category: expect.any(Object), relatedSystem: expect.any(Object), version: 1 });
      expect(JSON.stringify(result.body)).not.toMatch(/password|description/i);
    }
  });
  it("combines literal search, filters, assignment, priority and status", async () => {
    const f = await fixtures(); const { agent } = await login();
    const assigned = await agent.get("/api/staff/tickets").query({ q: "%_", ownerId: f.owner.id, categoryId: f.category.id, relatedSystemId: f.system.id, status: "IN_PROGRESS", itPriority: "LOW" });
    expect(assigned.status).toBe(200); expect(assigned.body.items.map((x: { id: number }) => x.id)).toEqual([f.one.id]);
    expect((await agent.get("/api/staff/tickets").query({ unassigned: "true", status: "WAITING_FOR_REQUESTER", itPriority: "HIGH" })).body.items.map((x: { id: number }) => x.id)).toEqual([f.two.id]);
  });
  it("validates every query shape and incompatible owner filters", async () => {
    const { agent } = await login();
    for (const query of ["unknown=1", "q=a&q=b", "ownerId=0", "ownerId=1&unassigned=true", "unassigned=yes", "status=new", "itPriority=URGENT", "sort=no", "direction=up", "page=0", "pageSize=11"]) {
      const result = await agent.get(`/api/staff/tickets?${query}`); expect(result.status, query).toBe(400); expect(result.body.error.code).toBe("INVALID_QUERY");
    }
  });
  it("paginates beyond the last page and returns active eligible owners only", async () => {
    const f = await fixtures(); const { agent } = await login();
    const tieTime = new Date("2026-09-16T09:00:00.000Z");
    await db.ticket.updateMany({ where: { id: { in: [f.one.id, f.two.id] } }, data: { updatedAt: tieTime } });
    for (const pageSize of ["10", "20", "50"]) {
      const ordered = await agent.get("/api/staff/tickets").query({ q: "QUEUE-", sort: "updatedAt", direction: "asc", pageSize });
      expect(ordered.status, pageSize).toBe(200);
      expect(ordered.body.items.map((item: { id: number }) => item.id)).toEqual([f.one.id, f.two.id]);
      expect(ordered.body.pageSize).toBe(Number(pageSize));
    }
    const page = await agent.get("/api/staff/tickets").query({ q: "QUEUE-", page: "3", pageSize: "10" });
    expect(page.body).toMatchObject({ items: [], page: 3, pageSize: 10, total: 2, totalPages: 1 });
    const owners = await agent.get("/api/staff/owners");
    expect(owners.status).toBe(200); expect(owners.body.items).toContainEqual(expect.objectContaining({ id: f.owner.id, role: "IT_STAFF" }));
    expect(owners.body.items.every((x: { role: string }) => ["IT_STAFF", "ADMINISTRATOR"].includes(x.role))).toBe(true);
    expect((await agent.get("/api/staff/owners?unexpected=true")).status).toBe(400);
  });
  it("returns a safe generic error", async () => {
    const { agent } = await login(); const original = db.ticket.count; Object.assign(db.ticket, { count: () => { throw new Error("secret queue details"); } });
    try { const result = await agent.get("/api/staff/tickets"); expect(result.status).toBe(500); expect(JSON.stringify(result.body)).not.toContain("secret"); }
    finally { Object.assign(db.ticket, { count: original }); }
  });
});
