import { Router } from "express";
import { Prisma } from "@prisma/client";
import { requireNormalSession } from "../auth/auth-middleware.js";
import { getPrisma } from "../prisma.js";
import { parseQueueQuery } from "./queue-query.js";
export const staffRouter = Router();
staffRouter.use(requireNormalSession);
staffRouter.use((_req, res, next) => {
  if (!["IT_STAFF", "ADMINISTRATOR"].includes(res.locals.currentUser.role)) return void res.status(403).json({ error: { code: "FORBIDDEN", message: "Staff access is required." } });
  res.set("Cache-Control", "no-store"); next();
});
staffRouter.get("/owners", async (req, res) => {
  if (Object.keys(req.query).length) return void res.status(400).json({ error: { code: "INVALID_QUERY", message: "Owner listing takes no query parameters." } });
  try {
    const items = await getPrisma().user.findMany({ where: { isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true, displayName: true, role: true }, orderBy: [{ displayName: "asc" }, { id: "asc" }] });
    res.json({ items });
  } catch { res.status(500).json({ error: { code: "OWNER_LIST_FAILED", message: "Owners could not be loaded. Try again." } }); }
});
staffRouter.get("/tickets", async (req, res) => {
  const parsed = parseQueueQuery(req.query);
  if (!parsed.success) return void res.status(400).json({ error: { code: "INVALID_QUERY", message: "Check the queue filters.", fields: parsed.fields } });
  try {
    const { where, orderBy, skip, page, pageSize } = parsed;
    const [total, items] = await getPrisma().$transaction([
      getPrisma().ticket.count({ where }),
      getPrisma().ticket.findMany({ where, orderBy, skip, take: pageSize, select: {
        id: true, ticketNumber: true, summary: true, requestedPriority: true, itPriority: true, status: true, version: true, createdAt: true, updatedAt: true,
        requester: { select: { id: true, displayName: true } }, owner: { select: { id: true, displayName: true } },
        category: { select: { id: true, name: true } }, relatedSystem: { select: { id: true, name: true } },
      } }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    res.json({ items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch { res.status(500).json({ error: { code: "QUEUE_LOAD_FAILED", message: "The Ticket Queue could not be loaded. Try again." } }); }
});
