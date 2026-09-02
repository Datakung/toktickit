import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "../../prisma/seed.js";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();
const prefix = "[Issue 15 detail test]";
let requesterId: number;
let otherRequesterId: number;
let ticketId: number;

beforeAll(async () => {
  await seedDatabase(prisma);
  const requesters = await prisma.requesterUser.findMany({
    where: { isActive: true }, orderBy: { id: "asc" }, take: 2,
  });
  [requesterId, otherRequesterId] = requesters.map(({ id }) => id);
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `TKT-20260901-D${Date.now().toString(36).slice(-5).toUpperCase()}`,
      requesterId,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      summary: `${prefix} owned Ticket`,
      description: "Read-only detail must be visible only to the owning Requester.",
      requestedPriority: "HIGH",
      attachments: {
        create: [
          {
            originalName: "active-report.pdf",
            storedName: `issue-15-detail-active-${Date.now()}.pdf`,
            mimeType: "application/pdf",
            sizeBytes: 125,
            createdAt: new Date("2026-09-01T01:00:00.000Z"),
          },
          {
            originalName: "removed-image.png",
            storedName: `issue-15-detail-removed-${Date.now()}.png`,
            mimeType: "image/png",
            sizeBytes: 64,
            createdAt: new Date("2026-09-01T02:00:00.000Z"),
            removedAt: new Date("2026-09-01T03:00:00.000Z"),
            removalReason: "The image is no longer current.",
            removedByRequesterId: requesterId,
          },
        ],
      },
    },
  });
  ticketId = ticket.id;
});

afterAll(async () => {
  await prisma.attachment.deleteMany({ where: { ticketId } });
  await prisma.ticket.deleteMany({ where: { summary: { startsWith: prefix } } });
});

describe("GET /api/tickets/:ticketId", () => {
  it("returns an owned read-only Ticket and ordered safe Attachment metadata", async () => {
    const response = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("X-Development-Requester-Id", String(requesterId));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: ticketId,
      summary: `${prefix} owned Ticket`,
      requestedPriority: "HIGH",
      itPriority: null,
      status: "NEW",
      requester: { id: requesterId },
      category: { id: expect.any(Number), name: expect.any(String) },
      relatedSystem: { id: expect.any(Number), name: expect.any(String) },
    });
    expect(response.body.data.attachments).toHaveLength(2);
    expect(response.body.data.attachments.map((item: { originalName: string }) => item.originalName))
      .toEqual(["active-report.pdf", "removed-image.png"]);
    expect(response.body.data.attachments[0]).toMatchObject({
      removed: false, removedAt: null, removalReason: null,
    });
    expect(response.body.data.attachments[1]).toMatchObject({
      removed: true,
      removalReason: "The image is no longer current.",
      removedByRequesterId: requesterId,
    });
    expect(response.text).not.toMatch(/storedName|issue-15-detail-/i);
  });

  it("returns the same safe response for a missing and a non-owned Ticket", async () => {
    const nonOwned = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("X-Development-Requester-Id", String(otherRequesterId));
    const missing = await request(app)
      .get("/api/tickets/2147483647")
      .set("X-Development-Requester-Id", String(requesterId));

    expect(nonOwned.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(nonOwned.body).toEqual(missing.body);
    expect(nonOwned.body.error).toEqual({
      code: "TICKET_NOT_FOUND", message: "Ticket not found.",
    });
    expect(nonOwned.text).not.toContain(prefix);
  });

  it.each(["0", "-1", "abc", "2147483648"])("rejects invalid Ticket ID %s", async (id) => {
    const response = await request(app)
      .get(`/api/tickets/${id}`)
      .set("X-Development-Requester-Id", String(requesterId));

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { ticketId: expect.any(String) },
    });
  });

  it("returns a capability-specific safe unexpected failure", async () => {
    const failure = vi.spyOn(prisma.ticket, "findFirst").mockRejectedValueOnce(
      new Error("database credentials and SQL must remain private"),
    );
    const response = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("X-Development-Requester-Id", String(requesterId));
    failure.mockRestore();

    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({
      code: "TICKET_RETRIEVAL_FAILED",
      message: "The Ticket could not be loaded. Try again.",
    });
    expect(response.text).not.toMatch(/credentials|SQL|stack|node_modules/i);
  });
});
