import { PrismaClient, type UserRole, type TicketStatus } from "@prisma/client";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import request from "supertest";
import { beforeAll, beforeEach, afterAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth/password.js";
import { app } from "../../src/app.js";

const baseUrl = process.env.DATABASE_URL!;
const target = new URL(baseUrl);
if (process.env.NODE_ENV !== "test" || !/(^|[_-])test([_-]|$)/i.test(target.pathname + "_" + (target.searchParams.get("schema") || ""))) throw new Error("Isolated test target required.");
const schema = `lab4_actions_test_${randomBytes(8).toString("hex")}`;
target.searchParams.set("schema", schema);
process.env.DATABASE_URL = target.toString();
export const db = getPrisma();
const root = new PrismaClient({ datasources: { db: { url: baseUrl } } });
const cli = createRequire(import.meta.url).resolve("prisma/build/index.js");
export const origin = "http://localhost:5173", password = "Actions-fixture-password-2026";
let hash: string;
export function setupActionFixture() {
  beforeAll(async () => {
    process.env.LEGACY_TEST_AUTH = "disabled";
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const sql = readdirSync("prisma/migrations").filter(n => /^\d/.test(n)).sort().map(n => readFileSync(`prisma/migrations/${n}/migration.sql`, "utf8")).join("\n");
    execFileSync(process.execPath, [cli, "db", "execute", "--stdin", "--url", target.toString()], { input: sql, stdio: "pipe", timeout: 30000 });
    hash = await hashPassword(password);
  }, 60000);
  beforeEach(async () => {
    // This run's generated schema only; TRUNCATE allows immutable-event fixture teardown.
    if (!/^lab4_actions_test_[a-f0-9]{16}$/.test(schema)) throw new Error("Invalid reset target");
    await db.$executeRawUnsafe('TRUNCATE TABLE "User", "Ticket", "Category", "RelatedSystem" RESTART IDENTITY CASCADE');
    await db.category.create({ data: { name: "Actions fixture" } });
    await db.relatedSystem.create({ data: { name: "Actions fixture" } });
  });
  afterAll(async () => {
    await db.$disconnect();
    if (!/^lab4_actions_test_[a-f0-9]{16}$/.test(schema)) throw new Error("Invalid cleanup target");
    await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await root.$disconnect(); process.env.DATABASE_URL = baseUrl;
  });
}
export async function user(role: UserRole = "IT_STAFF") {
  return db.user.create({ data: { displayName: `Actor ${role}`, email: `${randomUUID()}@actions.example.test`, role, passwordHash: hash, mustChangePassword: false } });
}
export async function ticket(status: TicketStatus = "OPEN", requesterId?: number) {
  return db.ticket.create({ data: { ticketNumber: `ACT-${randomUUID().slice(0, 20)}`, requesterId: requesterId ?? (await user("REQUESTER")).id, categoryId: 1, relatedSystemId: 1, summary: "Actions fixture", description: "Owned context", requestedPriority: "HIGH", itPriority: "MEDIUM", status, createdAt: new Date("2026-01-01") } });
}
export async function login(account: Awaited<ReturnType<typeof user>>) {
  const agent = request.agent(app), csrf = (await agent.get("/api/auth/csrf")).body.csrfToken;
  const result = await agent.post("/api/auth/login").set("Origin", origin).set("X-CSRF-Token", csrf).send({ email: account.email, password });
  if (result.status !== 200) throw new Error(`Fixture login failed: ${result.status}`);
  return { agent, token: result.body.csrfToken as string };
}
export const fields = () => ({ actionAt: new Date().toISOString(), description: "Investigated connection", result: "", followUpRequired: false, followUpNote: "", attachmentNotes: "Ticket file checked" });
export const createBody = (ticketVersion = 1) => ({ ...fields(), assigneeId: null, ticketVersion, requestId: randomUUID() });
export const write = (s: Awaited<ReturnType<typeof login>>, path: string, method: "post" | "patch", body: unknown) => s.agent[method](path).set("Origin", origin).set("X-CSRF-Token", s.token).send(body);
export const actionPath = (id: number) => `/api/staff/tickets/${id}/actions`;
