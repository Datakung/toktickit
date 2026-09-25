import { Router } from "express";
import { Prisma } from "@prisma/client";
import { requireNormalSession } from "../auth/auth-middleware.js";
import { getPrisma } from "../prisma.js";
import { parseQueueQuery } from "./queue-query.js";
import { requireCsrf, type AuthLocals } from "../auth/auth-middleware.js";
import { storedAttachmentContent, dispositionHeader } from "../attachments/attachment-download.js";
import { addNote, listNotes } from "../tickets/communication.js";
import { changeOwner, changePriority, changeStatus, claimTicket, getStaffTicket, OperationError, routeId } from "./ticket-operations.js";
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

function operationFailure(res: import("express").Response, error: unknown, fallback = "The Ticket operation could not be completed. Try again.") {
  if (error instanceof OperationError) return void res.status(error.status).json({ error: { code: error.code, message: error.message, ...(Object.keys(error.fields).length ? { fields: error.fields } : {}) } });
  res.status(500).json({ error: { code: "TICKET_OPERATION_FAILED", message: fallback } });
}
function auth(res: import("express").Response) { return res.locals as AuthLocals; }

staffRouter.get("/tickets/:ticketId", async (req, res) => {
  try { res.json(await getStaffTicket(routeId(req.params.ticketId))); }
  catch (error) { operationFailure(res, error, "Ticket detail could not be loaded. Try again."); }
});
staffRouter.post("/tickets/:ticketId/claim", requireCsrf, async (req, res) => {
  try { res.json(await claimTicket(auth(res), routeId(req.params.ticketId), req.body)); } catch (error) { operationFailure(res, error); }
});
staffRouter.patch("/tickets/:ticketId/owner", requireCsrf, async (req, res) => {
  try { res.json(await changeOwner(auth(res), routeId(req.params.ticketId), req.body)); } catch (error) { operationFailure(res, error); }
});
staffRouter.patch("/tickets/:ticketId/priority", requireCsrf, async (req, res) => {
  try { res.json(await changePriority(auth(res), routeId(req.params.ticketId), req.body)); } catch (error) { operationFailure(res, error); }
});
staffRouter.patch("/tickets/:ticketId/status", requireCsrf, async (req, res) => {
  try { res.json(await changeStatus(auth(res), routeId(req.params.ticketId), req.body)); } catch (error) { operationFailure(res, error); }
});
staffRouter.get("/tickets/:ticketId/notes", async (req, res) => {
  try { res.json(await listNotes(routeId(req.params.ticketId), req.query)); } catch (error) { operationFailure(res, error, "Internal Notes could not be loaded. Try again."); }
});
staffRouter.post("/tickets/:ticketId/notes", requireCsrf, async (req, res) => {
  try { res.status(201).json(await addNote(auth(res), routeId(req.params.ticketId), req.body)); } catch (error) { operationFailure(res, error, "The Internal Note could not be posted. Try again."); }
});
staffRouter.get("/tickets/:ticketId/attachments/:attachmentId/download", async (req, res) => {
  try {
    const ticketId = routeId(req.params.ticketId), attachmentId = routeId(req.params.attachmentId);
    const disposition = req.query.disposition === undefined ? "attachment" : req.query.disposition;
    if (disposition !== "attachment" && disposition !== "inline") throw new OperationError(400, "INVALID_QUERY", "Choose attachment or inline disposition.");
    const attachment = await getPrisma().attachment.findFirst({ where: { id: attachmentId, ticketId, removedAt: null }, select: { originalName: true, storedName: true, mimeType: true, sizeBytes: true } });
    if (!attachment) throw new OperationError(404, "ATTACHMENT_NOT_FOUND", "Attachment not found.");
    const content = await storedAttachmentContent(attachment.storedName, attachment.sizeBytes);
    if (!content) throw new OperationError(404, "ATTACHMENT_NOT_FOUND", "Attachment not found.");
    res.status(200).set({ "Content-Type": attachment.mimeType, "Content-Length": String(content.length), "Content-Disposition": dispositionHeader(disposition, attachment.originalName), "Cache-Control": "private, no-store" }).send(content);
  } catch (error) { operationFailure(res, error, "Attachment content could not be loaded. Try again."); }
});
