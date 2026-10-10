import { Router } from "express";
import { requireNormalSession, type AuthLocals } from "../auth/auth-middleware.js";
import { OperationError } from "../staff/ticket-operations.js";
import { readDashboard } from "./dashboard-service.js";
export const dashboardRouter = Router();
dashboardRouter.use(requireNormalSession);
for (const kind of ["requester", "staff"] as const) dashboardRouter.get(`/${kind}`, async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (Object.keys(req.query).length) return void res.status(400).json({ error: { code: "INVALID_QUERY", message: "Dashboard requests take no query parameters." } });
  try { res.json(await readDashboard(res.locals as AuthLocals, kind)); }
  catch (error) {
    if (error instanceof OperationError) res.status(error.status).json({ error: { code: error.code, message: error.message } });
    else res.status(500).json({ error: { code: "DASHBOARD_LOAD_FAILED", message: "The dashboard could not be loaded. Try again." } });
  }
});
