import { Router, type RequestHandler, type ErrorRequestHandler } from "express";
import { getPrisma } from "../prisma.js";
import { hashPassword, validPassword, verifyPassword } from "./password.js";
import { requireCsrf, requireSession, type AuthLocals } from "./auth-middleware.js";
import { browserCsrf, BROWSER_COOKIE, clearSessionCookie, cookies, csrfHash, newToken, sessionCsrf, sessionExpiry, setBrowserCookie, setSessionCookie, sha256, allowedOrigin, safeEqual, SESSION_COOKIE } from "./security.js";
import { clearLoginFailures, loginBlocked, recordLoginFailure } from "./login-throttle.js";

export const authRouter = Router();
const asyncRoute = (handler: RequestHandler): RequestHandler => (request, response, next) => {
  Promise.resolve().then(() => handler(request, response, next)).catch(next);
};
const safe = (user: { id:number; displayName:string; email:string; role:"REQUESTER"|"IT_STAFF"|"ADMINISTRATOR"; isActive:boolean; mustChangePassword:boolean }) => ({ id: user.id, displayName: user.displayName, email: user.email, role: user.role, isActive: user.isActive, mustChangePassword: user.mustChangePassword });
const noStore = (_request: unknown, response: { set(name:string,value:string):void }, next:()=>void) => { response.set("Cache-Control", "no-store"); next(); };
const hasExactBody = (body: unknown, keys: string[]) => Boolean(
  body && typeof body === "object" && !Array.isArray(body) &&
  Object.keys(body).sort().join(",") === [...keys].sort().join(","),
);
authRouter.use(noStore);

authRouter.get("/csrf", (request, response) => {
  let browser = cookies(request)[BROWSER_COOKIE];
  if (!browser) { browser = newToken(); setBrowserCookie(response, browser); }
  response.json({ csrfToken: browserCsrf(browser) });
});

authRouter.post("/login", asyncRoute(async (request, response) => {
  const browser = cookies(request)[BROWSER_COOKIE] ?? "";
  const token = request.get("X-CSRF-Token") ?? "";
  if (!browser || !allowedOrigin(request) || !safeEqual(csrfHash(token), csrfHash(browserCsrf(browser)))) {
    return void response.status(403).json({ error: { code: "INVALID_CSRF", message: "Refresh the page and try again." } });
  }
  if (!hasExactBody(request.body, ["email", "password"])) {
    return void response.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Provide email and password only." },
    });
  }
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = request.body?.password;
  const ip = request.ip || "unknown";
  if (loginBlocked(email, ip)) { response.set("Retry-After", "900"); return void response.status(429).json({ error: { code: "LOGIN_THROTTLED", message: "Too many attempts. Try again later." } }); }
  try {
    const user = email ? await getPrisma().user.findUnique({ where: { email } }) : null;
    const valid = await verifyPassword(password, user?.passwordHash ?? null);
    if (!user?.isActive || !valid) {
      recordLoginFailure(email, ip);
      return void response.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } });
    }
    clearLoginFailures(email);
    const raw = newToken(); const csrfToken = sessionCsrf(raw);
    await getPrisma().$transaction([
      getPrisma().session.deleteMany({ where: { userId: user.id } }),
      getPrisma().session.create({ data: { tokenHash: sha256(raw), csrfHash: csrfHash(csrfToken), userId: user.id, expiresAt: sessionExpiry() } }),
    ]);
    setSessionCookie(response, raw);
    response.json({ user: safe(user), csrfToken });
  } catch { response.status(500).json({ error: { code: "LOGIN_FAILED", message: "Sign in is unavailable. Try again." } }); }
}));

authRouter.get("/me", requireSession, (_request, response) => response.json({ user: safe((response.locals as AuthLocals).currentUser), csrfToken: sessionCsrf((response.locals as AuthLocals).rawSessionToken) }));
authRouter.post("/logout", (request, response, next) => {
  if (cookies(request)[SESSION_COOKIE]) return next();
  const browser = cookies(request)[BROWSER_COOKIE] ?? "";
  const token = request.get("X-CSRF-Token") ?? "";
  if (!browser || !allowedOrigin(request) ||
      !safeEqual(csrfHash(token), csrfHash(browserCsrf(browser)))) {
    return void response.status(403).json({
      error: { code: "INVALID_CSRF", message: "Refresh the page and try again." },
    });
  }
  clearSessionCookie(response);
  response.status(204).end();
}, requireSession, requireCsrf, asyncRoute(async (_request, response) => {
  await getPrisma().session.deleteMany({ where: { id: (response.locals as AuthLocals).sessionId } }); clearSessionCookie(response); response.status(204).end();
}));
authRouter.post("/change-password", requireSession, requireCsrf, asyncRoute(async (request, response) => {
  const locals = response.locals as AuthLocals;
  if (!hasExactBody(request.body, ["currentPassword", "newPassword", "confirmPassword"])) {
    return void response.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Check the password fields." },
    });
  }
  const { currentPassword, newPassword, confirmPassword } = (request.body ?? {}) as Record<string, unknown>;
  if (!validPassword(newPassword) || newPassword !== confirmPassword) return void response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Check the password fields.", fields: { newPassword: "Use 12-128 characters and matching confirmation." } } });
  try {
    const stored = await getPrisma().user.findUniqueOrThrow({ where: { id: locals.currentUser.id } });
    if (!await verifyPassword(currentPassword, stored.passwordHash) || await verifyPassword(newPassword, stored.passwordHash)) return void response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Check the password fields.", fields: { currentPassword: "Current password is incorrect, or the new password is unchanged." } } });
    const passwordHash = await hashPassword(newPassword); const raw = newToken(); const csrfToken = sessionCsrf(raw);
    const user = await getPrisma().$transaction(async tx => {
      await tx.session.deleteMany({ where: { userId: stored.id } });
      const updated = await tx.user.update({ where: { id: stored.id }, data: { passwordHash, mustChangePassword: false, version: { increment: 1 } } });
      await tx.session.create({ data: { userId: stored.id, tokenHash: sha256(raw), csrfHash: csrfHash(csrfToken), expiresAt: sessionExpiry() } });
      return updated;
    });
    setSessionCookie(response, raw); response.json({ user: safe(user), csrfToken });
  } catch { response.status(500).json({ error: { code: "PASSWORD_CHANGE_FAILED", message: "Password change is unavailable. Try again." } }); }
}));

const authErrorHandler: ErrorRequestHandler = (_error, _request, response, next) => {
  if (response.headersSent) return next(_error);
  response.status(500).json({ error: { code: "AUTHENTICATION_FAILED", message: "Authentication is unavailable. Try again." } });
};
authRouter.use(authErrorHandler);
