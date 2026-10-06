import { Prisma, TicketStatus, type PrismaClient } from "@prisma/client";
import { appendActionEvent } from "../src/actions/action-record.js";

// Intentional demonstration seed, separate from the account/reference seed used
// by historical tests. New deterministic Tickets only; no backfill of real history.
export async function seedLab4Fixtures(prisma: PrismaClient) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(2730001)`;
    await tx.user.upsert({ where: { email: "lab4.zero@example.test" }, update: {}, create: { displayName: "Lab 4 Zero Tickets", email: "lab4.zero@example.test", role: "REQUESTER" } });
    const requester = await tx.user.findUniqueOrThrow({ where: { email: "anan.chaiyasit@example.test" } });
    const staff = await tx.user.findFirst({ where: { isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, orderBy: { id: "asc" } });
    const other = await tx.user.findFirst({ where: { isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] }, id: { not: staff?.id } }, orderBy: { id: "asc" } });
    if (!staff) throw new Error("Lab 4 fixture seed requires an active Staff/Admin account.");
    const category = await tx.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await tx.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    for (const [index, status] of Object.values(TicketStatus).entries()) {
      const ticketNumber = `TKT-LAB4-SEED-${String(index + 1).padStart(2, "0")}`;
      if (await tx.ticket.findUnique({ where: { ticketNumber }, select: { id: true } })) continue;
      const now = new Date(), completed = ["RESOLVED", "CLOSED", "REOPENED"].includes(status);
      const ticket = await tx.ticket.create({ data: { ticketNumber, requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id,
        summary: `Lab 4 ${status.toLowerCase().replaceAll("_", " ")} work`, description: "Deliberate Lab 4 demonstration fixture, not historical backfill.",
        status, requestedPriority: ["LOW", "MEDIUM", "HIGH"][index % 3] as "LOW" | "MEDIUM" | "HIGH", itPriority: ["LOW", "MEDIUM", "HIGH"][index % 3] as "LOW" | "MEDIUM" | "HIGH",
        ownerId: index % 2 ? staff.id : null, resolutionCycle: status === "REOPENED" ? 2 : 1, resolvedAt: status === "RESOLVED" || status === "CLOSED" ? now : null,
      } });
      if (status === "NEW") continue; // zero-action fixture
      const action = await tx.actionTaken.create({ data: { ticketId: ticket.id, cycle: 1, state: completed ? "COMPLETED" : status === "CANCELLED" ? "CANCELLED" : "PLANNED",
        actionAt: ticket.createdAt, description: "Diagnosed and recorded service work", result: completed ? "Service verified stable" : "", createdById: staff.id,
        assigneeId: index % 2 ? (other?.id ?? staff.id) : null, performedById: completed ? (other?.id ?? staff.id) : null, performedAt: completed ? now : null,
        followUpRequired: status === "WAITING_FOR_REQUESTER", followUpNote: status === "WAITING_FOR_REQUESTER" ? "Await Requester confirmation" : "",
        attachmentNotes: "Refer to existing Ticket files if present", cancellationReason: status === "CANCELLED" ? "No further work required" : null,
      } });
      await appendActionEvent(tx, staff.id, "CREATED", null, action, "Initial demonstration fixture; not a historical transition.");
      if (status === "IN_PROGRESS" || status === "REOPENED") {
        const second = await tx.actionTaken.create({ data: { ticketId: ticket.id, cycle: ticket.resolutionCycle, state: "IN_PROGRESS", actionAt: ticket.createdAt,
          description: "Independent Staff follow-up work", result: "", createdById: other?.id ?? staff.id, assigneeId: staff.id, followUpNote: "", attachmentNotes: "" } });
        await appendActionEvent(tx, other?.id ?? staff.id, "CREATED", null, second, "Initial demonstration fixture; not a historical transition.");
      }
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20000 });
}
