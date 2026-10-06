import { expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed.js";
import { seedLab4Fixtures } from "../../prisma/seed-lab4.js";
import { db, setupActionFixture } from "./action-fixture.js";
setupActionFixture();
it("creates representative deterministic fixtures and preserves edited records/credentials/events on repeated seed", async () => {
  await seedDatabase(db); await seedLab4Fixtures(db);
  const tickets = await db.ticket.findMany({ where: { ticketNumber: { startsWith: "TKT-LAB4-SEED-" } } });
  expect(new Set(tickets.map(t => t.status)).size).toBe(8); expect(new Set(tickets.map(t => t.itPriority)).size).toBe(3);
  const actions = await db.actionTaken.findMany(); expect(actions.some(a => a.assigneeId === null)).toBe(true); expect(actions.some(a => a.performedById !== null && a.createdById !== a.performedById)).toBe(true);
  const zero = await db.user.findUniqueOrThrow({ where: { email: "lab4.zero@example.test" } }); expect(await db.ticket.count({ where: { requesterId: zero.id } })).toBe(0);
  const user = await db.user.update({ where: { email: "anan.chaiyasit@example.test" }, data: { passwordHash: "preserved-credential-digest", displayName: "Edited user", mustChangePassword: false, isActive: false } });
  const ticket = await db.ticket.update({ where: { id: tickets[0].id }, data: { summary: "Edited Ticket", version: 8 } });
  const action = await db.actionTaken.update({ where: { id: actions[0].id }, data: { description: "Edited work", version: 8 } });
  const before = { users: await db.user.findMany({ orderBy: { id: "asc" } }), tickets: await db.ticket.findMany({ orderBy: { id: "asc" } }), actions: await db.actionTaken.findMany({ orderBy: { id: "asc" } }), events: await db.actionTakenEvent.findMany({ orderBy: { id: "asc" } }) };
  await seedDatabase(db); await seedLab4Fixtures(db); await seedLab4Fixtures(db);
  expect(await db.user.findUnique({ where: { id: user.id } })).toEqual(user); expect(await db.ticket.findUnique({ where: { id: ticket.id } })).toEqual(ticket); expect(await db.actionTaken.findUnique({ where: { id: action.id } })).toEqual(action);
  expect({ users: await db.user.findMany({ orderBy: { id: "asc" } }), tickets: await db.ticket.findMany({ orderBy: { id: "asc" } }), actions: await db.actionTaken.findMany({ orderBy: { id: "asc" } }), events: await db.actionTakenEvent.findMany({ orderBy: { id: "asc" } }) }).toEqual(before);
});
