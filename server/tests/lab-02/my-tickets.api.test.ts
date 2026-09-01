import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed.js";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();
const prefix = "[Issue 14 test]";
let requesterA: number;
let requesterB: number;
let categoryA: number;
let categoryB: number;
let systemA: number;
let systemB: number;
const requesterATicketIds: number[] = [];

beforeAll(async () => {
  await seedDatabase(prisma);
  await prisma.ticket.deleteMany({ where: { summary: { startsWith: prefix } } });

  const requesters = await prisma.requesterUser.findMany({
    where: { isActive: true },
    orderBy: { id: "desc" },
    take: 2,
  });
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
    take: 2,
  });
  const systems = await prisma.relatedSystem.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
    take: 2,
  });
  [requesterA, requesterB] = requesters.map(({ id }) => id);
  [categoryA, categoryB] = categories.map(({ id }) => id);
  [systemA, systemB] = systems.map(({ id }) => id);

  for (let index = 0; index < 12; index += 1) {
    const even = index % 2 === 0;
    const timestamp = new Date(Date.UTC(2026, 8, 1, 0, index === 11 ? 10 : index));
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-20260901-L${String(index).padStart(5, "0")}`,
        requesterId: requesterA,
        categoryId: even ? categoryA : categoryB,
        relatedSystemId: even ? systemA : systemB,
        summary: `${prefix} ${even ? "VPN outage" : "Printer issue"} ${index}`,
        description: "A database-backed Ticket used to verify My Tickets behavior.",
        requestedPriority: even ? "HIGH" : "LOW",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      select: { id: true },
    });
    requesterATicketIds.push(ticket.id);
  }

  await prisma.ticket.create({
    data: {
      ticketNumber: "TKT-20260901-OTHER1",
      requesterId: requesterB,
      categoryId: categoryA,
      relatedSystemId: systemA,
      summary: `${prefix} VPN outage belonging to B`,
      description: "This Ticket must never appear for Requester A.",
      requestedPriority: "HIGH",
    },
  });
});

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { summary: { startsWith: prefix } } });
});

describe("GET /api/tickets", () => {
  it("returns only the selected Requester's Tickets with default pagination and order", async () => {
    const response = await request(app)
      .get("/api/tickets")
      .set("X-Development-Requester-Id", String(requesterA));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(10);
    expect(response.body.data.every((ticket: { id: number }) =>
      requesterATicketIds.includes(ticket.id))).toBe(true);
    expect(response.body.data.map((ticket: { updatedAt: string }) => ticket.updatedAt))
      .toEqual([...response.body.data]
        .map((ticket: { updatedAt: string }) => ticket.updatedAt)
        .sort()
        .reverse());
    expect(response.body.data.slice(0, 2).map((ticket: { id: number }) => ticket.id))
      .toEqual([requesterATicketIds[11], requesterATicketIds[10]]);
    expect(response.body.meta).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 12,
      totalPages: 2,
      search: "",
      filters: {
        categoryId: null,
        relatedSystemId: null,
        requestedPriority: null,
        status: null,
      },
      sort: "updatedAt",
      direction: "desc",
    });
  });

  it("combines search, filters, sorting, and pagination", async () => {
    const response = await request(app)
      .get("/api/tickets")
      .query({
        search: "  vpn OUTAGE  ",
        categoryId: categoryA,
        relatedSystemId: systemA,
        requestedPriority: "HIGH",
        status: "NEW",
        sort: "ticketNumber",
        direction: "asc",
        page: 1,
        pageSize: 10,
      })
      .set("X-Development-Requester-Id", String(requesterA));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(6);
    expect(response.body.data.map((ticket: { ticketNumber: string }) => ticket.ticketNumber))
      .toEqual([
        "TKT-20260901-L00000",
        "TKT-20260901-L00002",
        "TKT-20260901-L00004",
        "TKT-20260901-L00006",
        "TKT-20260901-L00008",
        "TKT-20260901-L00010",
      ]);
    expect(response.body.meta).toMatchObject({
      search: "vpn OUTAGE",
      totalItems: 6,
      totalPages: 1,
      filters: {
        categoryId: categoryA,
        relatedSystemId: systemA,
        requestedPriority: "HIGH",
        status: "NEW",
      },
      sort: "ticketNumber",
      direction: "asc",
    });
  });

  it.each([
    ["percent", "%"],
    ["underscore", "_"],
    ["backslash", "\\"],
  ])("treats a %s search character literally", async (_case, character) => {
    const literalTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-20260901-S${character.charCodeAt(0).toString().padStart(5, "0")}`,
        requesterId: requesterA,
        categoryId: categoryA,
        relatedSystemId: systemA,
        summary: `${prefix} literal ${character} search marker`,
        description: "A Ticket used to verify literal PostgreSQL search behavior.",
        requestedPriority: "MEDIUM",
      },
      select: { id: true, ticketNumber: true },
    });

    try {
      const response = await request(app)
        .get("/api/tickets")
        .query({ search: character, pageSize: 50 })
        .set("X-Development-Requester-Id", String(requesterA));

      expect(response.status).toBe(200);
      expect(response.body.data.map((ticket: { ticketNumber: string }) => ticket.ticketNumber))
        .toEqual([literalTicket.ticketNumber]);
      expect(response.body.meta).toMatchObject({ search: character, totalItems: 1 });
    } finally {
      await prisma.ticket.delete({ where: { id: literalTicket.id } });
    }
  });

  it("returns an accurate second page and an empty out-of-range page", async () => {
    const secondPage = await request(app)
      .get("/api/tickets?page=2&pageSize=10")
      .set("X-Development-Requester-Id", String(requesterA));
    const outOfRange = await request(app)
      .get("/api/tickets?page=99&pageSize=10")
      .set("X-Development-Requester-Id", String(requesterA));

    expect(secondPage.status).toBe(200);
    expect(secondPage.body.data).toHaveLength(2);
    expect(secondPage.body.meta).toMatchObject({ page: 2, totalItems: 12, totalPages: 2 });
    expect(outOfRange.status).toBe(200);
    expect(outOfRange.body.data).toEqual([]);
    expect(outOfRange.body.meta).toMatchObject({ page: 99, totalItems: 12, totalPages: 2 });
  });

  it("reloads ownership for another selected Requester", async () => {
    const response = await request(app)
      .get("/api/tickets?search=VPN")
      .set("X-Development-Requester-Id", String(requesterB));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      ticketNumber: "TKT-20260901-OTHER1",
      summary: `${prefix} VPN outage belonging to B`,
    });
  });

  it.each([
    ["unknown parameter", "/api/tickets?requesterId=1", "requesterId"],
    ["overlong search", `/api/tickets?search=${"x".repeat(101)}`, "search"],
    ["invalid Category", "/api/tickets?categoryId=0", "categoryId"],
    ["invalid priority", "/api/tickets?requestedPriority=URGENT", "requestedPriority"],
    ["invalid status", "/api/tickets?status=CLOSED", "status"],
    ["invalid sort", "/api/tickets?sort=summary", "sort"],
    ["invalid direction", "/api/tickets?direction=sideways", "direction"],
    ["invalid page", "/api/tickets?page=-1", "page"],
    ["invalid page size", "/api/tickets?pageSize=25", "pageSize"],
  ])("returns safe INVALID_QUERY for %s", async (_case, url, field) => {
    const response = await request(app)
      .get(url)
      .set("X-Development-Requester-Id", String(requesterA));

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "INVALID_QUERY",
      message: "Correct the ticket-list query and try again.",
      fields: { [field]: expect.any(String) },
    });
    expect(response.text).not.toMatch(/Prisma|SQL|node_modules|stack/i);
  });
});
