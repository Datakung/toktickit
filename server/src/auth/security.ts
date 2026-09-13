import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

export const SESSION_COOKIE = "toktickit_session";
export const BROWSER_COOKIE = "toktickit_browser";
const SESSION_HOURS = 8;
const CSRF_MINUTES = 30;

function secret(name: "SESSION_SECRET" | "CSRF_SECRET") {
  const value = process.env[name];
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "test") return `${name}-isolated-test-secret-value-2026`;
  throw new Error(`${name} must contain at least 32 characters.`);
}
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const hmac = (name: "SESSION_SECRET" | "CSRF_SECRET", value: string) => createHmac("sha256", secret(name)).update(value).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
export const sessionExpiry = (now = new Date()) => new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);

export function cookies(request: Request) {
  const result: Record<string, string> = {};
  for (const part of (request.get("cookie") ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0) result[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return result;
}
function cookieOptions(maxAge: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge };
}
export function setBrowserCookie(response: Response, value: string) {
  response.cookie(BROWSER_COOKIE, value, cookieOptions(CSRF_MINUTES * 60 * 1000));
}
export function setSessionCookie(response: Response, value: string) {
  response.cookie(SESSION_COOKIE, value, cookieOptions(SESSION_HOURS * 60 * 60 * 1000));
}
export function clearSessionCookie(response: Response) {
  response.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
}
export const browserCsrf = (browser: string) => hmac("CSRF_SECRET", `browser:${browser}`);
export const sessionCsrf = (token: string) => hmac("CSRF_SECRET", `session:${token}`);
export const csrfHash = (token: string) => sha256(token);
export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function allowedOrigin(request: Request) {
  const configured = (process.env.FRONTEND_ORIGIN ?? "http://localhost:5173").split(",").map(x => x.trim());
  const origin = request.get("origin");
  return typeof origin === "string" && configured.includes(origin);
}
