import { Router } from "express";
import { Prisma } from "@prisma/client";
import { requireNormalSession, type AuthLocals } from "../auth/auth-middleware.js";
import { requireActionSession } from "../actions/action-service.js";
import { parseActionPage } from "../actions/action-validation.js";
import { OperationError, routeId } from "../staff/ticket-operations.js";
import { getPrisma } from "../prisma.js";

export const workflowRouter = Router();
workflowRouter.get("/tickets/:ticketId/workflow-history", requireNormalSession, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const ticketId = routeId(req.params.ticketId), { page, pageSize } = parseActionPage(req.query);
    const result = await getPrisma().$transaction(async tx => {
      const actor = await requireActionSession(tx, res.locals as AuthLocals);
      const ticket = await tx.ticket.findFirst({ where: { id: ticketId, ...(actor.role === "REQUESTER" ? { requesterId: actor.id } : {}) }, select: { id: true } });
      if (!ticket) throw new OperationError(404, "TICKET_NOT_FOUND", "Ticket not found.");
      const where = { ticketId }, total = await tx.ticketTransitionEvent.count({ where });
      const items = (page - 1) * pageSize >= total ? [] : await tx.ticketTransitionEvent.findMany({ where,
        select: { id: true, fromStatus: true, toStatus: true, cycle: true, ticketVersion: true, actor: { select: { id: true, displayName: true } }, createdAt: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize });
      return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    res.json(result);
  } catch (error) {
    if (error instanceof OperationError) res.status(error.status).json({ error: { code: error.code, message: error.message } });
    else res.status(500).json({ error: { code: "WORKFLOW_HISTORY_FAILED", message: "Workflow history could not be loaded. Try again." } });
  }
});
