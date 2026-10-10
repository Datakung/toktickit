import { PrismaClient } from "@prisma/client";
import { expect, it, vi } from "vitest";
import * as prismaModule from "../../src/prisma.js";
import { db, setupActionFixture, user, login, fields } from "./action-fixture.js";
setupActionFixture();
it("measures bounded dashboard reads with 500 Tickets and 500 Actions, not full collection payloads", async () => {
  const requester = await user("REQUESTER"), staff = await user(), admin = await user("ADMINISTRATOR"), now = new Date();
  await db.ticket.createMany({ data: Array.from({ length: 500 }, (_, i) => ({ ticketNumber: `PERF-${i}`, requesterId: requester.id, categoryId: 1, relatedSystemId: 1, summary: `Dashboard performance fixture ${i}`, description: "Private large context".repeat(100), requestedPriority: "MEDIUM" as const, itPriority: "HIGH" as const, status: "OPEN" as const, ownerId: i % 2 ? staff.id : null, updatedAt: now })) });
  const tickets = await db.ticket.findMany({ select: { id: true } });
  await db.actionTaken.createMany({ data: tickets.map(t => ({ ...fields(), ticketId: t.id, cycle: 1, actionAt: now, description: "Dashboard work".repeat(20), createdById: staff.id, assigneeId: staff.id, state: "COMPLETED" as const, result: "Verified", performedById: staff.id, performedAt: now })) });
  const observed = new PrismaClient({ log: [{ emit: "event", level: "query" }] }); let statements = 0;
  observed.$on("query", event => { if (!/^(BEGIN|COMMIT|ROLLBACK|SET TRANSACTION)/i.test(event.query.trim())) statements++; });
  const records: object[] = [];
  try {
    for (const actor of [requester, staff, admin]) {
      const session = await login(actor), route = actor.role === "REQUESTER" ? "/api/dashboard/requester" : "/api/dashboard/staff";
      const spy = vi.spyOn(prismaModule, "getPrisma").mockReturnValue(observed);
      try {
        expect((await session.agent.get(route)).status).toBe(200); const times: number[] = [], queryCounts: number[] = [], sizes: number[] = [];
        for (let i = 0; i < 5; i++) {
          statements = 0; const start = performance.now(), response = await session.agent.get(route); times.push(performance.now() - start);
          expect(response.status).toBe(200); const bytes = Buffer.byteLength(JSON.stringify(response.body)); sizes.push(bytes); queryCounts.push(statements);
          expect(bytes).toBeLessThanOrEqual(64 * 1024); expect(statements).toBeLessThanOrEqual(12);
          expect(response.body.recentTickets.length).toBeLessThanOrEqual(5);
          expect((response.body.attentionTickets ?? response.body.recentPerformedActions).length).toBeLessThanOrEqual(5);
        }
        const median = times.toSorted((a, b) => a - b)[2]; expect(median).toBeLessThan(2000);
        records.push({ role: actor.role, samples: 5, medianMs: Math.round(median), maxMs: Math.round(Math.max(...times)), maxStatements: Math.max(...queryCounts), maxBytes: Math.max(...sizes) });
      } finally { spy.mockRestore(); }
    }
    console.log("Dashboard local smoke (500 Tickets / 500 Actions):", JSON.stringify(records));
  } finally { await observed.$disconnect(); }
}, 30000);
