import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed.js";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();
const testSummaryPrefix = "[Issue 13 test]";
let requesterId: number;
let categoryId: number;
let relatedSystemId: number;

beforeAll(async () => {
  await seedDatabase(prisma);
  requesterId = (await prisma.requesterUser.findFirstOrThrow({
    where: { isActive: true },
    orderBy: { id: "asc" },
  })).id;
  categoryId = (await prisma.category.findFirstOrThrow({
    where: { isActive: true },
    orderBy: { id: "asc" },
  })).id;
  relatedSystemId = (await prisma.relatedSystem.findFirstOrThrow({
    where: { isActive: true },
    orderBy: { id: "asc" },
  })).id;
});

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { summary: { startsWith: testSummaryPrefix } } });
});

function validBody() {
  return {
    categoryId,
    relatedSystemId,
    summary: `${testSummaryPrefix} Cannot connect to VPN`,
    requestedPriority: "HIGH",
    description: "The VPN client reports that the gateway is unavailable.",
    requesterId: 999_999,
  };
}

describe("POST /api/tickets", () => {
  it("creates one normalized NEW Ticket owned by the requester context", async () => {
    const normalizedSummary = `${testSummaryPrefix} Cannot connect to VPN`;
    const before = await prisma.ticket.count({ where: { summary: normalizedSummary } });

    const response = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(requesterId))
      .send({
        ...validBody(),
        summary: `  ${testSummaryPrefix} Cannot connect to VPN  `,
        description: "  The VPN client reports that the gateway is unavailable.  ",
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({
      id: expect.any(Number),
      ticketNumber: expect.stringMatching(/^TKT-\d{8}-[A-Z0-9]{6}$/),
      requesterId,
      status: "NEW",
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    await expect(prisma.ticket.count({ where: { summary: normalizedSummary } }))
      .resolves.toBe(before + 1);
    await expect(prisma.ticket.findUniqueOrThrow({ where: { id: response.body.data.id } }))
      .resolves.toMatchObject({
        requesterId,
        summary: `${testSummaryPrefix} Cannot connect to VPN`,
        itPriority: null,
        status: "NEW",
      });
  });

  it("returns all field errors and saves nothing for an invalid direct request", async () => {
    const before = await prisma.ticket.count();
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", String(requesterId))
      .send({
        categoryId: 0,
        relatedSystemId: "1",
        summary: "no",
        requestedPriority: "URGENT",
        description: "short",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      fieldErrors: {
        categoryId: expect.any(String),
        relatedSystemId: expect.any(String),
        summary: expect.any(String),
        requestedPriority: expect.any(String),
        description: expect.any(String),
      },
    });
    await expect(prisma.ticket.count()).resolves.toBe(before);
  });

  it("rejects an inactive Category and Related System without saving", async () => {
    const inactiveCategory = await prisma.category.create({
      data: { name: `${testSummaryPrefix} inactive category`, isActive: false },
    });
    const inactiveSystem = await prisma.relatedSystem.create({
      data: { name: `${testSummaryPrefix} inactive system`, isActive: false },
    });

    try {
      const response = await request(app)
        .post("/api/tickets")
        .set("X-Development-Requester-Id", String(requesterId))
        .send({ ...validBody(), categoryId: inactiveCategory.id, relatedSystemId: inactiveSystem.id });

      expect(response.status).toBe(400);
      expect(response.body.error.fieldErrors).toEqual({
        categoryId: "Select an active Category.",
        relatedSystemId: "Select an active Related System.",
      });
    } finally {
      await prisma.category.delete({ where: { id: inactiveCategory.id } });
      await prisma.relatedSystem.delete({ where: { id: inactiveSystem.id } });
    }
  });
});
