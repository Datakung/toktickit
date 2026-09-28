import { Router, type RequestHandler, type ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { requireNormalSession, requireCsrf, type AuthLocals } from "../auth/auth-middleware.js";
import { createUser, editUser, listUsers, resetInitialPassword } from "./user-service.js";
import { positiveId, UserError } from "./user-validation.js";

export const userRouter = Router();
const asyncRoute = (handler: RequestHandler): RequestHandler => (req, res, next) => { Promise.resolve().then(() => handler(req, res, next)).catch(next); };
userRouter.use(requireNormalSession);
userRouter.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (res.locals.currentUser.role !== "ADMINISTRATOR") return void res.status(403).json({ error: { code: "FORBIDDEN", message: "Administrator access is required." } });
  next();
});
userRouter.use(requireCsrf);
userRouter.get("/", asyncRoute(async (req, res) => { res.json(await listUsers(req.query)); }));
userRouter.post("/", asyncRoute(async (req, res) => {
  if (Object.keys(req.query).length) throw new UserError(400, "INVALID_QUERY", "Query fields are not supported.");
  res.status(201).json(await createUser(res.locals as AuthLocals, req.body));
}));
userRouter.patch("/:id", asyncRoute(async (req, res) => {
  if (Object.keys(req.query).length) throw new UserError(400, "INVALID_QUERY", "Query fields are not supported.");
  res.json(await editUser(res.locals as AuthLocals, positiveId(req.params.id), req.body));
}));
userRouter.post("/:id/initial-password", asyncRoute(async (req, res) => {
  if (Object.keys(req.query).length) throw new UserError(400, "INVALID_QUERY", "Query fields are not supported.");
  res.json(await resetInitialPassword(res.locals as AuthLocals, positiveId(req.params.id), req.body));
}));
const errors: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof UserError) return void res.status(error.status).json({ error: { code: error.code, message: error.message, fields: error.fields } });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return void res.status(409).json({ error: { code: "EMAIL_CONFLICT", message: "This email is already in use.", fields: { email: "Choose another email address." } } });
  res.status(500).json({ error: { code: "USER_MANAGEMENT_FAILED", message: "User management is unavailable. Try again." } });
};
userRouter.use(errors);
