import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { loadEnvFile } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../../prisma/seed.js";
import { deployTestMigrations } from "./deploy-test-migrations.js";

const serverRoot = fileURLToPath(new URL("../../", import.meta.url));
const defaultUploadRoot = path.join(serverRoot, "uploads");
const e2eUploadRoot = path.join(defaultUploadRoot, "e2e");

export const E2E_API_URL = "http://127.0.0.1:3100";
export const E2E_EVIDENCE_TICKET_NUMBER = "TKT-20260902-EVID01";

interface DatabaseTarget {
  database: string;
  schema: string;
  target: string;
}

interface E2EDatabaseTargets {
  developmentUrl: string | undefined;
  e2eUrl: string | undefined;
}

function loadServerEnvironment() {
  const envPath = path.join(serverRoot, ".env");
  if (existsSync(envPath)) loadEnvFile(envPath);
}

function parsePostgresTarget(rawUrl: string, variableName: string): DatabaseTarget {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL.`);
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error(`${variableName} must use the PostgreSQL protocol.`);
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const schema = url.searchParams.get("schema") ?? "public";
  if (!database) throw new Error(`${variableName} must include a database name.`);

  return {
    database,
    schema,
    target: [
      url.hostname.toLowerCase(),
      url.port || "5432",
      database.toLowerCase(),
      schema.toLowerCase(),
    ].join("/"),
  };
}

export function requireIsolatedE2EDatabase({
  developmentUrl,
  e2eUrl,
}: E2EDatabaseTargets): string {
  if (!developmentUrl) {
    throw new Error("DATABASE_URL is required to prove E2E isolation from development.");
  }
  if (!e2eUrl) {
    throw new Error("E2E_DATABASE_URL is required. Playwright will not use development data.");
  }

  const development = parsePostgresTarget(developmentUrl, "DATABASE_URL");
  const e2e = parsePostgresTarget(e2eUrl, "E2E_DATABASE_URL");
  if (development.target === e2e.target) {
    throw new Error("E2E_DATABASE_URL must not target the development database and schema.");
  }
  if (
    !/(^|[-_])e2e($|[-_])/i.test(e2e.database) &&
    !/(^|[-_])e2e($|[-_])/i.test(e2e.schema)
  ) {
    throw new Error("E2E_DATABASE_URL must use a database or schema clearly marked for E2E.");
  }

  return e2eUrl;
}

export function configureE2EEnvironment() {
  loadServerEnvironment();
  const developmentUrl = process.env.DATABASE_URL;
  const e2eUrl = requireIsolatedE2EDatabase({
    developmentUrl,
    e2eUrl: process.env.E2E_DATABASE_URL,
  });

  process.env.DATABASE_URL = e2eUrl;
  process.env.ATTACHMENT_UPLOAD_ROOT = e2eUploadRoot;
  process.env.NODE_ENV = "test";
  process.env.PORT = "3100";

  return { developmentUrl, e2eUrl, e2eUploadRoot };
}

export async function prepareE2EEnvironment() {
  const { e2eUrl } = configureE2EEnvironment();
  deployTestMigrations(serverRoot);

  rmSync(e2eUploadRoot, { recursive: true, force: true });
  mkdirSync(e2eUploadRoot, { recursive: true });

  const prisma = new PrismaClient({ datasources: { db: { url: e2eUrl } } });
  try {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "Attachment", "Ticket", "RequesterUser", "Category", "RelatedSystem" RESTART IDENTITY CASCADE',
    );
    await seedDatabase(prisma);

    const requester = await prisma.requesterUser.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });
    const category = await prisma.category.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });
    const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });
    const fixedTime = new Date("2026-09-02T00:00:00.000Z");
    await prisma.ticket.create({
      data: {
        ticketNumber: E2E_EVIDENCE_TICKET_NUMBER,
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Responsive release evidence",
        description: "Deterministic Ticket used only for reviewed responsive evidence.",
        requestedPriority: "MEDIUM",
        createdAt: fixedTime,
        updatedAt: fixedTime,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function cleanupE2EEnvironment() {
  const { e2eUrl } = configureE2EEnvironment();
  const prisma = new PrismaClient({ datasources: { db: { url: e2eUrl } } });
  try {
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
  } finally {
    await prisma.$disconnect();
    rmSync(e2eUploadRoot, { recursive: true, force: true });
  }
}

function snapshotDevelopmentUploads() {
  const files: Array<{ path: string; size: number; sha256: string }> = [];
  if (!existsSync(defaultUploadRoot)) return files;

  const visit = (directory: string, relativeDirectory = "") => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relative = path.join(relativeDirectory, entry.name);
      if (entry.isDirectory() && (relative === "e2e" || relative === ".tmp")) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute, relative);
      } else if (entry.isFile()) {
        const content = readFileSync(absolute);
        files.push({
          path: relative.replaceAll(path.sep, "/"),
          size: content.length,
          sha256: createHash("sha256").update(content).digest("hex"),
        });
      }
    }
  };

  visit(defaultUploadRoot);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export async function snapshotDevelopmentState() {
  loadServerEnvironment();
  const developmentUrl = process.env.DATABASE_URL;
  if (!developmentUrl) throw new Error("DATABASE_URL is required for the E2E isolation proof.");

  const prisma = new PrismaClient({ datasources: { db: { url: developmentUrl } } });
  try {
    const [categories, systems, requesters, tickets, attachments] = await Promise.all([
      prisma.category.findMany({ orderBy: { id: "asc" } }),
      prisma.relatedSystem.findMany({ orderBy: { id: "asc" } }),
      prisma.requesterUser.findMany({ orderBy: { id: "asc" } }),
      prisma.ticket.findMany({ orderBy: { id: "asc" } }),
      prisma.attachment.findMany({ orderBy: { id: "asc" } }),
    ]);
    const serialized = JSON.stringify({
      categories,
      systems,
      requesters,
      tickets,
      attachments,
      uploads: snapshotDevelopmentUploads(),
    });
    return createHash("sha256").update(serialized).digest("hex");
  } finally {
    await prisma.$disconnect();
  }
}
