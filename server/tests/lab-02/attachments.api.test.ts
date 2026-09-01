import { rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "../../prisma/seed.js";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();
const uploadRoot = fileURLToPath(new URL("../../uploads/", import.meta.url));
const prefix = "[Issue 15 attachment lifecycle]";
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
let requesterId: number;
let otherRequesterId: number;
let ticketId: number;
let activeAttachmentId: number;
let removedAttachmentId: number;
let removableAttachmentId: number;
let unavailableAttachmentId: number;
const physicalNames: string[] = [];

beforeAll(async () => {
  await seedDatabase(prisma);
  const requesters = await prisma.requesterUser.findMany({
    where: { isActive: true }, orderBy: { id: "asc" }, take: 2,
  });
  [requesterId, otherRequesterId] = requesters.map(({ id }) => id);
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `TKT-20260901-A${Date.now().toString(36).slice(-5).toUpperCase()}`,
      requesterId,
      categoryId: category.id,
      relatedSystemId: system.id,
      summary: `${prefix} owned Ticket`,
      description: "A Ticket used to verify the complete Attachment lifecycle.",
      requestedPriority: "MEDIUM",
    },
  });
  ticketId = ticket.id;

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const activeStoredName = `issue-15-active-${unique}.png`;
  const removableStoredName = `issue-15-removable-${unique}.png`;
  physicalNames.push(activeStoredName, removableStoredName);
  await Promise.all([
    writeFile(`${uploadRoot}${activeStoredName}`, png),
    writeFile(`${uploadRoot}${removableStoredName}`, png),
  ]);

  const attachments = await Promise.all([
    prisma.attachment.create({ data: {
      ticketId, originalName: "evidence.png", storedName: activeStoredName,
      mimeType: "image/png", sizeBytes: png.length,
      createdAt: new Date("2026-09-01T01:00:00.000Z"),
    } }),
    prisma.attachment.create({ data: {
      ticketId, originalName: "old.pdf", storedName: `issue-15-removed-${unique}.pdf`,
      mimeType: "application/pdf", sizeBytes: 25,
      createdAt: new Date("2026-09-01T02:00:00.000Z"),
      removedAt: new Date("2026-09-01T03:00:00.000Z"),
      removalReason: "This document is outdated.", removedByRequesterId: requesterId,
    } }),
    prisma.attachment.create({ data: {
      ticketId, originalName: "remove-me.png", storedName: removableStoredName,
      mimeType: "image/png", sizeBytes: png.length,
      createdAt: new Date("2026-09-01T04:00:00.000Z"),
    } }),
    prisma.attachment.create({ data: {
      ticketId, originalName: "missing.png", storedName: `issue-15-missing-${unique}.png`,
      mimeType: "image/png", sizeBytes: png.length,
      createdAt: new Date("2026-09-01T05:00:00.000Z"),
    } }),
  ]);
  [activeAttachmentId, removedAttachmentId, removableAttachmentId, unavailableAttachmentId] =
    attachments.map(({ id }) => id);
});

afterAll(async () => {
  await prisma.attachment.deleteMany({ where: { ticketId } });
  await prisma.ticket.deleteMany({ where: { summary: { startsWith: prefix } } });
  await Promise.all(physicalNames.map((name) => rm(`${uploadRoot}${name}`, { force: true })));
});

describe("Requester Attachment lifecycle", () => {
  it("returns ordered active and removed metadata without physical names", async () => {
    const response = await request(app)
      .get(`/api/tickets/${ticketId}/attachments`)
      .set("X-Development-Requester-Id", String(requesterId));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(4);
    expect(response.body.data.map((item: { originalName: string }) => item.originalName))
      .toEqual(["evidence.png", "old.pdf", "remove-me.png", "missing.png"]);
    expect(response.body.data[0]).toMatchObject({ removed: false, removedAt: null });
    expect(response.body.data[1]).toMatchObject({
      removed: true, removalReason: "This document is outdated.",
    });
    expect(response.text).not.toMatch(/storedName|issue-15-/i);
  });

  it("hides Attachment metadata with the same safe Ticket response", async () => {
    const response = await request(app)
      .get(`/api/tickets/${ticketId}/attachments`)
      .set("X-Development-Requester-Id", String(otherRequesterId));

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({ code: "TICKET_NOT_FOUND", message: "Ticket not found." });
    expect(response.text).not.toContain(prefix);
  });

  it("serves active content with authenticated inline and download headers", async () => {
    const inline = await request(app)
      .get(`/api/tickets/${ticketId}/attachments/${activeAttachmentId}/download?disposition=inline`)
      .set("X-Development-Requester-Id", String(requesterId));
    const download = await request(app)
      .get(`/api/tickets/${ticketId}/attachments/${activeAttachmentId}/download`)
      .set("X-Development-Requester-Id", String(requesterId));

    expect(inline.status).toBe(200);
    expect(inline.headers["content-type"]).toMatch(/^image\/png/);
    expect(inline.headers["content-disposition"]).toMatch(/^inline; filename="evidence\.png"/);
    expect(inline.body).toEqual(png);
    expect(download.status).toBe(200);
    expect(download.headers["content-disposition"]).toMatch(/^attachment; filename="evidence\.png"/);
    expect(download.body).toEqual(png);
  });

  it("uses the same safe 404 for non-owned, removed, missing, and unavailable content", async () => {
    const urlsAndRequester = [
      [`/api/tickets/${ticketId}/attachments/${activeAttachmentId}/download`, otherRequesterId],
      [`/api/tickets/${ticketId}/attachments/${removedAttachmentId}/download`, requesterId],
      [`/api/tickets/${ticketId}/attachments/2147483647/download`, requesterId],
      [`/api/tickets/${ticketId}/attachments/${unavailableAttachmentId}/download`, requesterId],
    ] as const;

    for (const [url, context] of urlsAndRequester) {
      const response = await request(app)
        .get(url)
        .set("X-Development-Requester-Id", String(context));
      expect(response.status).toBe(404);
      expect(response.body.error).toEqual({
        code: "ATTACHMENT_NOT_FOUND", message: "Attachment not found.",
      });
      expect(response.text).not.toMatch(/storedName|issue-15-|uploads/i);
    }
  });

  it("rejects an invalid content disposition", async () => {
    const response = await request(app)
      .get(`/api/tickets/${ticketId}/attachments/${activeAttachmentId}/download?disposition=open`)
      .set("X-Development-Requester-Id", String(requesterId));

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "INVALID_QUERY", fields: { disposition: expect.any(String) },
    });
  });

  it("soft-removes an owned Attachment and preserves its original removal metadata", async () => {
    const invalid = await request(app)
      .delete(`/api/tickets/${ticketId}/attachments/${removableAttachmentId}`)
      .set("X-Development-Requester-Id", String(requesterId))
      .send({ reason: "no" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toMatchObject({
      code: "VALIDATION_ERROR", fields: { reason: expect.any(String) },
    });

    const reason = "The uploaded image contains outdated information.";
    const removed = await request(app)
      .delete(`/api/tickets/${ticketId}/attachments/${removableAttachmentId}`)
      .set("X-Development-Requester-Id", String(requesterId))
      .send({ reason: `  ${reason}  ` });
    expect(removed.status).toBe(200);
    expect(removed.body.data).toMatchObject({
      id: removableAttachmentId,
      removed: true,
      removalReason: reason,
      removedByRequesterId: requesterId,
    });
    expect(removed.body.data.removedAt).toEqual(expect.any(String));
    await expect(prisma.attachment.count({ where: { id: removableAttachmentId } })).resolves.toBe(1);

    const repeated = await request(app)
      .delete(`/api/tickets/${ticketId}/attachments/${removableAttachmentId}`)
      .set("X-Development-Requester-Id", String(requesterId))
      .send({ reason: "A different valid reason must not replace the first." });
    expect(repeated.status).toBe(409);
    expect(repeated.body.error.code).toBe("ATTACHMENT_ALREADY_REMOVED");
    const persisted = await prisma.attachment.findUniqueOrThrow({
      where: { id: removableAttachmentId },
    });
    expect(persisted.removalReason).toBe(reason);

    const blocked = await request(app)
      .get(`/api/tickets/${ticketId}/attachments/${removableAttachmentId}/download`)
      .set("X-Development-Requester-Id", String(requesterId));
    expect(blocked.status).toBe(404);
    expect(blocked.body.error.code).toBe("ATTACHMENT_NOT_FOUND");
  });

  it("does not reveal an Attachment to a different Requester during removal", async () => {
    const response = await request(app)
      .delete(`/api/tickets/${ticketId}/attachments/${activeAttachmentId}`)
      .set("X-Development-Requester-Id", String(otherRequesterId))
      .send({ reason: "This valid reason must not cross the ownership boundary." });

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: "ATTACHMENT_NOT_FOUND", message: "Attachment not found.",
    });
    await expect(prisma.attachment.findUniqueOrThrow({ where: { id: activeAttachmentId } }))
      .resolves.toMatchObject({ removedAt: null, removalReason: null });
  });

  it("returns capability-specific safe failures for metadata, content, and removal", async () => {
    const metadataFailure = vi.spyOn(prisma.ticket, "findFirst").mockRejectedValueOnce(
      new Error("private metadata database failure"),
    );
    const metadata = await request(app)
      .get(`/api/tickets/${ticketId}/attachments`)
      .set("X-Development-Requester-Id", String(requesterId));
    metadataFailure.mockRestore();
    expect(metadata.status).toBe(500);
    expect(metadata.body.error.code).toBe("ATTACHMENT_METADATA_FAILED");

    const contentFailure = vi.spyOn(prisma.attachment, "findFirst").mockRejectedValueOnce(
      new Error("private content database failure"),
    );
    const content = await request(app)
      .get(`/api/tickets/${ticketId}/attachments/${activeAttachmentId}/download`)
      .set("X-Development-Requester-Id", String(requesterId));
    contentFailure.mockRestore();
    expect(content.status).toBe(500);
    expect(content.body.error.code).toBe("ATTACHMENT_CONTENT_FAILED");

    const removeFailure = vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(
      new Error("private removal database failure"),
    );
    const removal = await request(app)
      .delete(`/api/tickets/${ticketId}/attachments/${activeAttachmentId}`)
      .set("X-Development-Requester-Id", String(requesterId))
      .send({ reason: "A valid reason used to exercise safe failure handling." });
    removeFailure.mockRestore();
    expect(removal.status).toBe(500);
    expect(removal.body.error.code).toBe("ATTACHMENT_REMOVE_FAILED");

    for (const response of [metadata, content, removal]) {
      expect(response.text).not.toMatch(/private|database|stack|node_modules|uploads/i);
    }
  });
});
