import request, { type Response } from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "../../prisma/seed.js";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();
const fixtureSummary = "[Issue 16 safe-error audit]";
const privateFailure = new Error(
  "password=secret SELECT * FROM Requester C:\\private\\uploads\\stored-name.png",
);

let requesterId: number;
let categoryId: number;
let relatedSystemId: number;
let ticketId: number;

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
  ticketId = (await prisma.ticket.create({
    data: {
      ticketNumber: `TKT-20260901-Q${Date.now().toString(36).toUpperCase().slice(-5)}`,
      requesterId,
      categoryId,
      relatedSystemId,
      summary: fixtureSummary,
      description: "A temporary Ticket used only for the release safe-error audit.",
      requestedPriority: "MEDIUM",
    },
    select: { id: true },
  })).id;
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { summary: fixtureSummary } });
});

function requester(call: request.Test) {
  return call.set("X-Development-Requester-Id", String(requesterId));
}

function expectSafeFailure(response: Response, code: string) {
  expect(response.status, response.text).toBe(500);
  expect(response.body).toEqual({
    error: {
      code,
      message: expect.stringMatching(/try again|unavailable/i),
    },
  });
  expect(response.type).toMatch(/json/);
  expect(response.text).not.toMatch(
    /password|secret|select \*|private|uploads|stored-name|stack|prisma|node_modules/i,
  );
}

describe("release-wide safe unexpected API failures", () => {
  it("protects Category and Related System lookup failures", async () => {
    const categoryFailure = vi.spyOn(prisma.category, "findMany")
      .mockRejectedValueOnce(privateFailure);
    const categories = await request(app).get("/api/categories");
    expectSafeFailure(categories, "REFERENCE_DATA_FAILED");
    categoryFailure.mockRestore();

    const systemFailure = vi.spyOn(prisma.relatedSystem, "findMany")
      .mockRejectedValueOnce(privateFailure);
    const systems = await request(app).get("/api/related-systems");
    expectSafeFailure(systems, "REFERENCE_DATA_FAILED");
    systemFailure.mockRestore();
  });

  it("protects Ticket list, create, and detail failures", async () => {
    const listFailure = vi.spyOn(prisma, "$transaction")
      .mockRejectedValueOnce(privateFailure);
    const list = await requester(request(app).get("/api/tickets"));
    expectSafeFailure(list, "TICKET_LIST_FAILED");
    listFailure.mockRestore();

    const createFailure = vi.spyOn(prisma.category, "findFirst")
      .mockRejectedValueOnce(privateFailure);
    const create = await requester(request(app).post("/api/tickets")).send({
      categoryId,
      relatedSystemId,
      summary: "Release audit create failure",
      description: "This valid request forces a safe unexpected create failure.",
      requestedPriority: "MEDIUM",
    });
    expectSafeFailure(create, "TICKET_CREATE_FAILED");
    createFailure.mockRestore();

    const detailFailure = vi.spyOn(prisma.ticket, "findFirst")
      .mockRejectedValueOnce(privateFailure);
    const detail = await requester(request(app).get(`/api/tickets/${ticketId}`));
    expectSafeFailure(detail, "TICKET_RETRIEVAL_FAILED");
    detailFailure.mockRestore();
  });

  it("protects Attachment metadata, upload, content, and removal failures", async () => {
    const metadataFailure = vi.spyOn(prisma.ticket, "findFirst")
      .mockRejectedValueOnce(privateFailure);
    const metadata = await requester(
      request(app).get(`/api/tickets/${ticketId}/attachments`),
    );
    expectSafeFailure(metadata, "ATTACHMENT_METADATA_FAILED");
    metadataFailure.mockRestore();

    const uploadFailure = vi.spyOn(prisma, "$transaction")
      .mockRejectedValueOnce(privateFailure);
    const upload = await requester(
      request(app).post(`/api/tickets/${ticketId}/attachments`),
    ).attach("file", Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]), { filename: "safe-audit.png", contentType: "image/png" });
    expectSafeFailure(upload, "ATTACHMENT_UPLOAD_FAILED");
    uploadFailure.mockRestore();

    const contentFailure = vi.spyOn(prisma.attachment, "findFirst")
      .mockRejectedValueOnce(privateFailure);
    const content = await requester(
      request(app).get(`/api/tickets/${ticketId}/attachments/1/download`),
    );
    expectSafeFailure(content, "ATTACHMENT_CONTENT_FAILED");
    contentFailure.mockRestore();

    const removalFailure = vi.spyOn(prisma, "$transaction")
      .mockRejectedValueOnce(privateFailure);
    const removal = await requester(
      request(app).delete(`/api/tickets/${ticketId}/attachments/1`),
    ).send({ reason: "Release audit removal reason." });
    expectSafeFailure(removal, "ATTACHMENT_REMOVE_FAILED");
    removalFailure.mockRestore();
  });

  // Prisma's generated findUnique delegate cannot be restored reliably after
  // spying, so this intentionally poisoned context capability runs last.
  it("protects Development Requester lookup and context failures", async () => {
    const lookupFailure = vi.spyOn(prisma.requesterUser, "findMany")
      .mockRejectedValueOnce(privateFailure);
    const lookup = await request(app).get("/api/development-requesters");
    expectSafeFailure(lookup, "REQUESTER_LOOKUP_FAILED");
    lookupFailure.mockRestore();

    vi.spyOn(prisma.requesterUser, "findUnique").mockRejectedValueOnce(privateFailure);
    const context = await requester(request(app).get("/api/tickets"));
    expectSafeFailure(context, "REQUESTER_CONTEXT_FAILED");
  });
});
