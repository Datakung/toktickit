import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { afterAll, beforeAll, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed.js";
import { provisionUsers } from "../../src/auth/provisioning.js";
import { verifyPassword } from "../../src/auth/password.js";

const require = createRequire(import.meta.url);
const cli = require.resolve("prisma/build/index.js");
const root = new PrismaClient();
const schema = `lab3_migration_test_${randomBytes(8).toString("hex")}`;
const target = new URL(process.env.DATABASE_URL!);
if (process.env.NODE_ENV !== "test" || !/(test)/i.test(target.pathname + target.search)) throw new Error("Migration fixture requires the isolated test database.");
target.searchParams.set("schema", schema);
const fixture = new PrismaClient({ datasources: { db: { url: target.toString() } } });
const migration = readFileSync("prisma/migrations/20260913143000_lab3_user_foundation/migration.sql", "utf8");
function execute(sql: string) {
  execFileSync(process.execPath, [cli, "db", "execute", "--stdin", "--url", target.toString()], {
    input: sql, stdio: ["pipe", "pipe", "pipe"], timeout: 30000,
  });
}
beforeAll(async () => {
  await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  for (const name of ["20260810073523_init", "20260831064500_lab2_data_foundation", "20260901090000_issue_13_ticket_description"]) {
    execute(readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8"));
  }
  execute(`
    INSERT INTO "RequesterUser" ("displayName",email,"isActive","createdAt","updatedAt")
      VALUES ('Preserved Person','preserved@example.test',false,'2026-01-01','2026-01-02');
    INSERT INTO "Category" (name) VALUES ('Fixture Category');
    INSERT INTO "RelatedSystem" (name) VALUES ('Fixture System');
    INSERT INTO "Ticket" ("ticketNumber","requesterId","categoryId","relatedSystemId",summary,description,"requestedPriority","itPriority","createdAt","updatedAt")
      VALUES ('TKT-FIXTURE-1',1,1,1,'Preserve me','Migration fixture','HIGH',NULL,'2026-01-01','2026-01-02'),
             ('TKT-FIXTURE-2',1,1,1,'Preserve priority','Migration fixture','LOW','HIGH','2026-01-01','2026-01-02');
    INSERT INTO "Attachment" ("ticketId","originalName","storedName","mimeType","sizeBytes","removedAt","removalReason","removedByRequesterId")
      VALUES (1,'old.png','unchanged-file-key','image/png',123,'2026-01-02','Historic removal',1);
  `);
}, 60000);
afterAll(async () => {
  await fixture.$disconnect();
  // Only this run's generated test schema is removed, never public/development.
  if (!/^lab3_migration_test_[a-f0-9]{16}$/.test(schema)) throw new Error("Invalid cleanup target");
  await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await root.$disconnect();
});
it("rejects normalized duplicates before renaming tables or changing data", async () => {
  execute(`INSERT INTO "RequesterUser" ("displayName",email) VALUES ('Duplicate','preserved@example.test ');`);
  expect(() => execute(migration)).toThrow();
  const rows = await fixture.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT count(*) FROM "RequesterUser"');
  expect(Number(rows[0].count)).toBe(2);
  execute(`DELETE FROM "RequesterUser" WHERE email = 'preserved@example.test ';`);
}, 30000);
it("preserves IDs, ownership, removal metadata, timestamps and non-null priorities", async () => {
  execute(migration);
  const user = await fixture.user.findUniqueOrThrow({ where: { id: 1 } });
  expect(user).toMatchObject({ id: 1, displayName: "Preserved Person", isActive: false, role: "REQUESTER", passwordHash: null, mustChangePassword: true });
  expect(user.updatedAt.toISOString()).toBe("2026-01-02T00:00:00.000Z");
  const tickets = await fixture.ticket.findMany({ orderBy: { id: "asc" } });
  expect(tickets.map(t => [t.id, t.requesterId, t.itPriority])).toEqual([[1, 1, "HIGH"], [2, 1, "HIGH"]]);
  expect(tickets.every(t => t.updatedAt.toISOString() === "2026-01-02T00:00:00.000Z")).toBe(true);
  expect(await fixture.attachment.findFirst()).toMatchObject({ id: 1, ticketId: 1, storedName: "unchanged-file-key", removedByUserId: 1, removalReason: "Historic removal", sizeBytes: 123 });
  const next = await fixture.user.create({ data: { email: "next@example.test", displayName: "Next" } });
  expect(next.id).toBeGreaterThan(1);
}, 30000);
it("seeds and provisions repeatably without resetting edited accounts or credentials", async () => {
  await seedDatabase(fixture);
  const users = await fixture.user.findMany();
  const input = users.map(u => ({ email: u.email, initialPassword: "fixture-only-initial-password" }));
  await expect(provisionUsers(fixture, input.slice(1))).rejects.toThrow(/cover every/);
  expect(await fixture.user.count({ where: { passwordHash: { not: null } } })).toBe(0);
  expect(await provisionUsers(fixture, input)).toBe(users.length);
  const anan = await fixture.user.update({ where: { email: "anan.chaiyasit@example.test" }, data: { displayName: "Edited name", isActive: false, mustChangePassword: false } });
  await seedDatabase(fixture);
  expect(await provisionUsers(fixture, input)).toBe(0);
  expect(await fixture.user.findUnique({ where: { id: anan.id } })).toEqual(anan);
  expect(await verifyPassword("fixture-only-initial-password", anan.passwordHash)).toBe(true);
  expect(await fixture.user.count({ where: { role: "IT_STAFF", isActive: true } })).toBe(3);
  expect(await fixture.user.count({ where: { role: "IT_STAFF", isActive: false } })).toBe(1);
  expect(await fixture.user.count({ where: { role: "ADMINISTRATOR" } })).toBe(1);
}, 30000);
