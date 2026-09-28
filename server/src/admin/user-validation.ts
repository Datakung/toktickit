import { UserRole } from "@prisma/client";
import { validPassword } from "../auth/password.js";

export class UserError extends Error {
  constructor(public status: number, public code: string, message: string, public fields: Record<string, string> = {}) { super(message); }
}
export function exactBody(value: unknown, names: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join(",") !== [...names].sort().join(",")) {
    throw new UserError(400, "VALIDATION_ERROR", "Provide exactly the required fields.");
  }
  return value as Record<string, unknown>;
}
export function positiveId(value: unknown): number {
  const parsed = typeof value === "string" && /^[1-9]\d*$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed > 2147483647) throw new UserError(400, "INVALID_ID", "Use a valid user ID.");
  return parsed;
}
export function version(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 2147483647) throw new UserError(400, "VALIDATION_ERROR", "Provide a valid version.", { version: "Reload this account before saving." });
  return value;
}
export function initialPassword(value: unknown): string {
  if (!validPassword(value)) throw new UserError(400, "VALIDATION_ERROR", "Check the password.", { initialPassword: "Use 12–128 characters." });
  return value as string;
}
export function userFields(body: Record<string, unknown>) {
  const fields: Record<string, string> = {};
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!displayName || displayName.length > 120) fields.displayName = "Use a name of 1–120 characters.";
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = "Provide a valid email address.";
  if (typeof body.role !== "string" || !Object.values(UserRole).includes(body.role as UserRole)) fields.role = "Choose one permitted role.";
  if (typeof body.isActive !== "boolean") fields.isActive = "Choose active or inactive.";
  if (Object.keys(fields).length) throw new UserError(400, "VALIDATION_ERROR", "Check the account fields.", fields);
  return { displayName, email, role: body.role as UserRole, isActive: body.isActive as boolean };
}
export function listQuery(query: Record<string, unknown>) {
  if (Object.keys(query).some(k => !["q", "role", "isActive"].includes(k)) || (query.q !== undefined && typeof query.q !== "string") || (query.role !== undefined && (typeof query.role !== "string" || !Object.values(UserRole).includes(query.role as UserRole))) || (query.isActive !== undefined && query.isActive !== "true" && query.isActive !== "false")) {
    throw new UserError(400, "INVALID_QUERY", "Use a single search, permitted role and true/false status filter.");
  }
  const q = (query.q as string | undefined)?.trim() ?? "";
  if (q.length > 120) throw new UserError(400, "INVALID_QUERY", "Search must be at most 120 characters.");
  return { q: q.replace(/[\\%_]/g, "\\$&"), role: query.role as UserRole | undefined, isActive: query.isActive === undefined ? undefined : query.isActive === "true" };
}
