import { Router, type RequestHandler } from "express";
import { requireNormalSession, requireCsrf, type AuthLocals } from "../auth/auth-middleware.js";
import { routeId, OperationError } from "../staff/ticket-operations.js";
import { getPrisma } from "../prisma.js";
import { readActions, mutateAction, listActionWork } from "./action-service.js";
import type { WriteKind } from "./action-validation.js";

export const actionRouter = Router();
const staff: RequestHandler = (_req, res, next) => {
  if (res.locals.currentUser.role === "REQUESTER") return void res.status(403).json({ error: { code: "FORBIDDEN", message: "Staff access is required." } });
  next();
};
const run = (handler: RequestHandler): RequestHandler => async (req, res, next) => {
  try { await handler(req, res, next); } catch (error) {
    if (error instanceof OperationError) res.status(error.status).json({ error: { code: error.code, message: error.message, ...(Object.keys(error.fields).length ? { fields: error.fields } : {}) } });
    else res.status(500).json({ error: { code: "ACTION_OPERATION_FAILED", message: "The action operation is unavailable. Try again." } });
  }
};
const auth = (res: import("express").Response) => res.locals as AuthLocals;
const noStore: RequestHandler = (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); };
for (const suffix of ["", "/:actionId", "/:actionId/history"]) {
  actionRouter.get(`/tickets/:ticketId/actions${suffix}`, requireNormalSession, noStore, run(async (req, res) => {
    res.json(await readActions(auth(res), routeId(req.params.ticketId), req.query, req.params.actionId ? routeId(req.params.actionId) : undefined, suffix.endsWith("history")));
  }));
}
for (const [method, suffix, kind] of [["post", "", "create"], ["patch", "/:actionId", "edit"], ["patch", "/:actionId/assignee", "assign"], ["patch", "/:actionId/state", "state"]] as const) {
  actionRouter[method](`/staff/tickets/:ticketId/actions${suffix}`, requireNormalSession, staff, requireCsrf, noStore, run(async (req, res) => {
    const receipt = await mutateAction(auth(res), routeId(req.params.ticketId), kind as WriteKind, req.body, req.params.actionId ? routeId(req.params.actionId) : undefined);
    res.status(kind === "create" && !receipt.replayed ? 201 : 200).json(receipt);
  }));
}
actionRouter.get("/staff/actions", requireNormalSession, staff, noStore, run(async (req, res) => { res.json(await listActionWork(auth(res), req.query)); }));
actionRouter.get("/staff/action-assignees", requireNormalSession, staff, noStore, run(async (req, res) => {
  if (Object.keys(req.query).length) throw new OperationError(400, "INVALID_QUERY", "Assignee listing takes no query parameters.");
  res.json({ items: await getPrisma().user.findMany({ where: { isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true, displayName: true, role: true }, orderBy: [{ displayName: "asc" }, { id: "asc" }] }) });
}));
