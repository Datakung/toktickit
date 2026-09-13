import type { RequestHandler } from "express";
import type { UserRole } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { allowedOrigin, cookies, csrfHash, safeEqual, sessionCsrf, SESSION_COOKIE, sha256 } from "./security.js";

export interface SafeUser { id: number; displayName: string; email: string; role: UserRole; isActive: boolean; mustChangePassword: boolean }
export interface AuthLocals extends Record<string, unknown> { currentUser: SafeUser; sessionId: number; rawSessionToken: string; storedCsrfHash: string }
const safeSelect = { id: true, displayName: true, email: true, role: true, isActive: true, mustChangePassword: true } as const;
export const requireSession: RequestHandler<Record<string, string>, unknown, unknown, Record<string, string>, AuthLocals> = async (request, response, next) => {
  if (process.env.NODE_ENV === "test" && process.env.LEGACY_TEST_AUTH === "enabled") {
    const rawRequesterId = request.get("X-Development-Requester-Id");
    const requesterId = Number(rawRequesterId);
    if (!rawRequesterId || !/^[1-9]\d*$/.test(rawRequesterId) || !Number.isSafeInteger(requesterId) || requesterId > 2_147_483_647) {
      return void response.status(401).json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in to continue." } });
    }
    if (Number.isInteger(requesterId) && requesterId > 0) {
      try {
        const user = await getPrisma().user.findFirst({ where: { id: requesterId, isActive: true, role: "REQUESTER" }, select: safeSelect });
        if (user) { response.locals.currentUser = user; response.locals.sessionId = -1; response.locals.rawSessionToken = "legacy-test-only"; response.locals.storedCsrfHash = ""; return next(); }
        return void response.status(403).json({ error: { code: "REQUESTER_UNAVAILABLE", message: "Select an available Development Requester." } });
      } catch { return void response.status(500).json({ error: { code: "REQUESTER_CONTEXT_FAILED", message: "The Development Requester context is unavailable. Try again." } }); }
    }
  }
  const raw = cookies(request)[SESSION_COOKIE];
  if (!raw) return void response.status(401).json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in to continue." } });
  try {
    const session = await getPrisma().session.findUnique({ where: { tokenHash: sha256(raw) }, include: { user: { select: safeSelect } } });
    if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
      if (session) await getPrisma().session.deleteMany({ where: { id: session.id } });
      return void response.status(401).json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in to continue." } });
    }
    response.locals.currentUser = session.user;
    response.locals.sessionId = session.id;
    response.locals.rawSessionToken = raw;
    response.locals.storedCsrfHash = session.csrfHash;
    next();
  } catch { response.status(500).json({ error: { code: "AUTHENTICATION_FAILED", message: "Authentication is unavailable. Try again." } }); }
};
export const requireNormalSession: RequestHandler<Record<string, string>, unknown, unknown, Record<string, string>, AuthLocals> = (request, response, next) => {
  requireSession(request, response, error => {
    if (error) return next(error);
    if (response.headersSent) return;
    if (response.locals.sessionId !== -1 && response.locals.currentUser.mustChangePassword) return void response.status(403).json({ error: { code: "PASSWORD_CHANGE_REQUIRED", message: "Change your initial password to continue." } });
    next();
  });
};
export const requireRequester: typeof requireNormalSession = (request, response, next) => {
  requireNormalSession(request, response, error => {
    if (error) return next(error);
    if (response.headersSent) return;
    if (response.locals.currentUser.role !== "REQUESTER") return void response.status(403).json({ error: { code: "FORBIDDEN", message: "You do not have access to this operation." } });
    next();
  });
};
export const requireCsrf: RequestHandler<Record<string, string>, unknown, unknown, Record<string, string>, AuthLocals> = (request, response, next) => {
  if (process.env.NODE_ENV === "test" && process.env.LEGACY_TEST_AUTH === "enabled" && response.locals.sessionId === -1) return next();
  if (!allowedUnsafeMethod(request.method)) return next();
  const token = request.get("X-CSRF-Token") ?? "";
  const expected = response.locals.storedCsrfHash ?? "";
  if (!allowedOrigin(request) || !safeEqual(csrfHash(token), expected)) {
    return void response.status(403).json({ error: { code: "INVALID_CSRF", message: "Refresh the page and try again." } });
  }
  next();
};
const allowedUnsafeMethod = (method: string) => !["GET", "HEAD", "OPTIONS"].includes(method);
