import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeAll, afterAll, expect, it } from "vitest";

const base = new URL(process.env.DATABASE_URL!);
if (process.env.NODE_ENV !== "test" || !/(^|[_-])test([_-]|$)/i.test(base.pathname + "_" + (base.searchParams.get("schema") || "")) || !["localhost", "127.0.0.1"].includes(base.hostname)) throw new Error("Migration recovery requires the isolated local test target.");
const suffix = randomBytes(8).toString("hex");
const names = [`toktickit_lab4_migration_test_${suffix}`, `toktickit_lab4_restore_test_${suffix}`];
const created: string[] = [];
const root = new PrismaClient();
function url(name: string) { const target = new URL(base); target.pathname = `/${name}`; target.searchParams.set("schema", "public"); return target.toString(); }
const upgraded = new PrismaClient({ datasources: { db: { url: url(names[0]) } } });
const restored = new PrismaClient({ datasources: { db: { url: url(names[1]) } } });
const cli = createRequire(import.meta.url).resolve("prisma/build/index.js");
const migrationName = "20261005090000_actions_taken_foundation";
const migration = readFileSync(`prisma/migrations/${migrationName}/migration.sql`, "utf8");
const tables = ["User", "Session", "Ticket", "Category", "RelatedSystem", "Attachment", "PublicComment", "InternalNote"];
function execute(sql: string, name = names[0]) {
  try { execFileSync(process.execPath, [cli, "db", "execute", "--stdin", "--url", url(name)], { input: sql, stdio: "pipe", timeout: 30000 }); }
  catch { throw new Error("Isolated migration SQL failed (database details suppressed)."); }
}
async function fingerprint(client: PrismaClient) {
  const result: Record<string, { count: number; digest: string }> = {};
  for (const table of tables) {
    // Whitelisted table names only. Compare entire legacy rows, including secret
    // digests, without printing secret values if an assertion fails.
    const rows = await client.$queryRawUnsafe<Array<{ row: unknown }>>(`SELECT to_jsonb(t)${table === "Ticket" ? " - 'resolutionCycle' - 'resolvedAt'" : ""} AS row FROM "${table}" t ORDER BY id`);
    result[table] = { count: rows.length, digest: createHash("sha256").update(JSON.stringify(rows)).digest("hex") };
  }
  return result;
}
let baseline: Awaited<ReturnType<typeof fingerprint>>, backup: Buffer;
beforeAll(async () => {
  for (const name of names) {
    if (!/^toktickit_lab4_(migration|restore)_test_[a-f0-9]{16}$/.test(name)) throw new Error("Invalid disposable database name.");
    await root.$executeRawUnsafe(`CREATE DATABASE "${name}"`); created.push(name);
  }
  // Apply the immutable historical migrations separately (enum additions commit
  // before any fixtures reference them). No development URL is ever passed here.
  for (const name of readdirSync("prisma/migrations").filter(n => /^\d/.test(n) && n < migrationName).sort()) execute(readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8"));
  execute(`
    INSERT INTO "User" ("displayName",email,role,"passwordHash","mustChangePassword","createdAt","updatedAt")
      VALUES ('Historical Requester','legacy-requester@example.test','REQUESTER','preserved-secret-digest',false,'2026-01-01','2026-01-02'),
             ('Historical Staff','legacy-staff@example.test','IT_STAFF','preserved-staff-digest',false,'2026-01-01','2026-01-02');
    INSERT INTO "Session" ("tokenHash","csrfHash","userId","expiresAt") VALUES ('preserved-token-digest','preserved-csrf-digest',1,'2027-01-01');
    INSERT INTO "Category" (name) VALUES ('Legacy category');
    INSERT INTO "RelatedSystem" (name) VALUES ('Legacy system');
    INSERT INTO "Ticket" ("ticketNumber","requesterId","ownerId","categoryId","relatedSystemId",summary,description,"requestedPriority","itPriority",status,version,"createdAt","updatedAt","requesterResolutionIndicatedAt")
      VALUES ('TKT-LEGACY-OPEN',1,2,1,1,'Preserved active','Old context','HIGH','MEDIUM','OPEN',8,'2026-01-01','2026-01-02','2026-01-02'),
             ('TKT-LEGACY-RESOLVED',1,2,1,1,'Preserved resolved','Old context','LOW','LOW','RESOLVED',9,'2026-01-01','2026-01-02',NULL),
             ('TKT-LEGACY-CLOSED',1,NULL,1,1,'Preserved closed','Old context','MEDIUM','HIGH','CLOSED',10,'2026-01-01','2026-01-02',NULL);
    INSERT INTO "Attachment" ("ticketId","originalName","storedName","mimeType","sizeBytes","removedAt","removalReason","removedByUserId") VALUES (1,'legacy.png','preserved-file-key','image/png',123,'2026-01-02','Historic removal',1);
    INSERT INTO "PublicComment" ("ticketId","authorId",body) VALUES (1,1,'Public history');
    INSERT INTO "InternalNote" ("ticketId","authorId",body) VALUES (1,2,'Private history');
  `);
  baseline = await fingerprint(upgraded);
  try {
    backup = execFileSync("docker", ["exec", "toktickit-postgres", "pg_dump", "-U", decodeURIComponent(base.username), "-d", names[0], "--no-owner", "--no-privileges"], { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 10 * 1024 * 1024, timeout: 30000 });
  } catch { throw new Error("Isolated pre-migration backup failed; recovery cannot be claimed."); }
}, 60000);
afterAll(async () => {
  await upgraded.$disconnect(); await restored.$disconnect();
  for (const name of created) {
    if (!/^toktickit_lab4_(migration|restore)_test_[a-f0-9]{16}$/.test(name)) throw new Error("Invalid cleanup database.");
    await root.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
  }
  await root.$disconnect();
});
it("rolls back failed DDL completely before applying the preserving migration", async () => {
  expect(() => execute(migration.replace("COMMIT;", "SELECT 1/0; COMMIT;"))).toThrow();
  expect(await fingerprint(upgraded)).toEqual(baseline);
  expect(await upgraded.$queryRaw`SELECT to_regclass('"ActionTaken"')::text AS table_name`).toEqual([{ table_name: null }]);
  const columns = await upgraded.$queryRaw<Array<{ column_name: string }>>`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='Ticket' AND column_name='resolutionCycle'`;
  expect(columns).toEqual([]);
}, 30000);
it("preserves all earlier IDs/relationships/timestamps/credentials, defaults cycles and invents no historical work", async () => {
  execute(migration);
  expect(await fingerprint(upgraded)).toEqual(baseline);
  const tickets = await upgraded.ticket.findMany({ orderBy: { id: "asc" } });
  expect(tickets.map(t => [t.id, t.status, t.resolutionCycle, t.resolvedAt])).toEqual([[1, "OPEN", 1, null], [2, "RESOLVED", 1, null], [3, "CLOSED", 1, null]]);
  expect(await upgraded.actionTaken.count()).toBe(0); expect(await upgraded.ticketTransitionEvent.count()).toBe(0);
  const next = await upgraded.user.create({ data: { displayName: "New account", email: "new@example.test" } }); expect(next.id).toBeGreaterThan(2);
  await upgraded.user.delete({ where: { id: next.id } });
  // The additive migration must not alter existing timestamp types.
  const type = await upgraded.$queryRaw<Array<{ data_type: string }>>`SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='Ticket' AND column_name='createdAt'`;
  expect(type[0].data_type).toBe("timestamp without time zone");
  try {
    execFileSync(process.execPath, [cli, "migrate", "diff", "--from-url", url(names[0]), "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code"], { stdio: "pipe", timeout: 30000 });
  } catch { throw new Error("Migrated test schema differs from the Prisma model (connection details suppressed)."); }
}, 30000);
it("restores a real pre-migration backup into a separate disposable database and verifies rows plus sequences", async () => {
  try { execFileSync("docker", ["exec", "-i", "toktickit-postgres", "psql", "-U", decodeURIComponent(base.username), "-d", names[1], "-v", "ON_ERROR_STOP=1"], { input: backup, stdio: "pipe", timeout: 30000 }); }
  catch { throw new Error("Isolated backup restore failed (database details suppressed)."); }
  expect(await fingerprint(restored)).toEqual(baseline);
  // Current Prisma models need the additive columns; the restored old schema is
  // inspected via raw SQL before proving a forward upgrade works on the restore.
  execute(migration, names[1]); expect(await fingerprint(restored)).toEqual(baseline);
  const next = await restored.user.create({ data: { displayName: "Restored next account", email: "restore-next@example.test" } }); expect(next.id).toBe(3);
}, 30000);
