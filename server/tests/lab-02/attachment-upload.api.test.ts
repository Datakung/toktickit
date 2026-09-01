import { readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed.js";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();
const uploadRoot = fileURLToPath(new URL("../../uploads/", import.meta.url));
const temporaryRoot = fileURLToPath(new URL("../../uploads/.tmp/", import.meta.url));
const prefix = "[Issue 13 attachment test]";
let requesterId: number;
let otherRequesterId: number;
let ticketId: number;

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

beforeAll(async () => {
  await seedDatabase(prisma);
  const requesters = await prisma.requesterUser.findMany({
    where: { isActive: true }, orderBy: { id: "asc" }, take: 2,
  });
  requesterId = requesters[0].id;
  otherRequesterId = requesters[1].id;
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `TKT-20260901-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0")}`,
      requesterId,
      categoryId: category.id,
      relatedSystemId: system.id,
      summary: `${prefix} upload target`,
      description: "A Ticket used to verify initial Attachment uploads.",
      requestedPriority: "MEDIUM",
    },
  });
  ticketId = ticket.id;
});

afterAll(async () => {
  const attachments = await prisma.attachment.findMany({
    where: { ticket: { summary: { startsWith: prefix } } },
    select: { storedName: true },
  });
  await prisma.attachment.deleteMany({ where: { ticket: { summary: { startsWith: prefix } } } });
  await prisma.ticket.deleteMany({ where: { summary: { startsWith: prefix } } });
  await Promise.all(attachments.map(({ storedName }) => rm(`${uploadRoot}${storedName}`, { force: true })));
});

describe("POST /api/tickets/:ticketId/attachments", () => {
  it("stores valid metadata without exposing the physical filename", async () => {
    const response = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Development-Requester-Id", String(requesterId))
      .attach("file", png, { filename: "../screen.PNG", contentType: "image/png" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      ticketId,
      originalName: "screen.png",
      mimeType: "image/png",
      sizeBytes: png.length,
      removedAt: null,
    });
    expect(response.body.data).not.toHaveProperty("storedName");
  });

  it("hides a Ticket owned by a different requester before accepting a file", async () => {
    const response = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Development-Requester-Id", String(otherRequesterId))
      .attach("file", png, { filename: "screen.png", contentType: "image/png" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("rejects an out-of-range Ticket ID before Prisma", async () => {
    const response = await request(app)
      .post("/api/tickets/2147483648/attachments")
      .set("X-Development-Requester-Id", String(requesterId))
      .attach("file", png, { filename: "screen.png", contentType: "image/png" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("rejects missing, oversized, and signature-mismatched files safely", async () => {
    const missing = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Development-Requester-Id", String(requesterId));
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("FILE_REQUIRED");

    const mismatched = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Development-Requester-Id", String(requesterId))
      .attach("file", Buffer.from("not a png"), { filename: "screen.png", contentType: "image/png" });
    expect(mismatched.status).toBe(415);
    expect(mismatched.body.error.code).toBe("FILE_TYPE_NOT_ALLOWED");

    const oversized = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Development-Requester-Id", String(requesterId))
      .attach("file", Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: "large.pdf", contentType: "application/pdf",
      });
    expect(oversized.status).toBe(413);
    expect(oversized.body.error.code).toBe("FILE_TOO_LARGE");
  });

  it("admits exactly one of two concurrent uploads when four are active", async () => {
    const filesBefore = (await readdir(uploadRoot, { withFileTypes: true }))
      .filter((entry) => entry.isFile()).map((entry) => entry.name);
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    const target = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-20260901-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "Z")}`,
        requesterId,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: `${prefix} concurrent target`,
        description: "A Ticket used to verify atomic Attachment admission.",
        requestedPriority: "LOW",
        attachments: {
          create: Array.from({ length: 4 }, (_, index) => ({
            originalName: `existing-${index}.png`,
            storedName: `issue-13-existing-${targetSafeId()}-${index}.png`,
            mimeType: "image/png",
            sizeBytes: png.length,
          })),
        },
      },
    });

    const uploadFile = (name: string) => request(app)
      .post(`/api/tickets/${target.id}/attachments`)
      .set("X-Development-Requester-Id", String(requesterId))
      .attach("file", png, { filename: name, contentType: "image/png" });
    const responses = await Promise.all([uploadFile("winner-a.png"), uploadFile("winner-b.png")]);

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    await expect(prisma.attachment.count({
      where: { ticketId: target.id, removedAt: null },
    })).resolves.toBe(5);
    const filesAfter = (await readdir(uploadRoot, { withFileTypes: true }))
      .filter((entry) => entry.isFile()).map((entry) => entry.name);
    expect(filesAfter).toHaveLength(filesBefore.length + 1);
    await expect(readdir(temporaryRoot)).resolves.toEqual([]);
  });
});

function targetSafeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
