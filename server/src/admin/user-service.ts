import { Prisma } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { hashPassword } from "../auth/password.js";
import type { AuthLocals } from "../auth/auth-middleware.js";
import { exactBody, initialPassword, listQuery, UserError, userFields, version } from "./user-validation.js";

export const adminSelect = { id: true, displayName: true, email: true, role: true, isActive: true, mustChangePassword: true, version: true, createdAt: true, updatedAt: true } as const;
// Future assignment operations must take this lock before checking owner eligibility.
// Account edits, resets and owner unassignment share one transaction ordering.
export async function lockAccountChanges(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(2730001)`;
}
async function requireCurrentAdministrator(tx: Prisma.TransactionClient, auth: AuthLocals) {
  const session = await tx.session.findUnique({ where: { id: auth.sessionId }, include: { user: true } });
  if (!session || session.expiresAt <= new Date() || !session.user.isActive) throw new UserError(401, "AUTHENTICATION_REQUIRED", "Sign in to continue.");
  if (session.user.mustChangePassword) throw new UserError(403, "PASSWORD_CHANGE_REQUIRED", "Change your initial password to continue.");
  if (session.user.role !== "ADMINISTRATOR") throw new UserError(403, "FORBIDDEN", "Administrator access is required.");
}
async function transaction<T>(auth: AuthLocals, action: (tx: Prisma.TransactionClient) => Promise<T>) {
  return getPrisma().$transaction(async tx => {
    await lockAccountChanges(tx);
    await requireCurrentAdministrator(tx, auth);
    return action(tx);
  }, { maxWait: 10000, timeout: 10000 });
}
export async function listUsers(query: Record<string, unknown>) {
  const { q, role, isActive } = listQuery(query);
  return { items: await getPrisma().user.findMany({
    where: { role, isActive, ...(q ? { OR: [{ displayName: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] } : {}) },
    select: adminSelect, orderBy: [{ displayName: "asc" }, { id: "asc" }],
  }) };
}
export async function createUser(auth: AuthLocals, input: unknown) {
  const body = exactBody(input, ["displayName", "email", "role", "isActive", "initialPassword"]);
  const data = userFields(body);
  const passwordHash = await hashPassword(initialPassword(body.initialPassword));
  return transaction(auth, tx => tx.user.create({ data: { ...data, passwordHash, mustChangePassword: true }, select: adminSelect }));
}
export async function editUser(auth: AuthLocals, id: number, input: unknown) {
  const body = exactBody(input, ["displayName", "email", "role", "isActive", "version"]);
  const data = userFields(body); const expected = version(body.version);
  return transaction(auth, async tx => {
    // Coordinate with password changes and logins so a late session cannot survive revocation.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;
    const target = await tx.user.findUnique({ where: { id } });
    if (!target) throw new UserError(404, "USER_NOT_FOUND", "This account is unavailable.");
    if (target.version !== expected) throw new UserError(409, "VERSION_CONFLICT", "This account changed. Reload and review before saving.");
    if (id === auth.currentUser.id && !data.isActive) throw new UserError(409, "SELF_DEACTIVATION_FORBIDDEN", "You cannot deactivate your own account.");
    if (target.role === "ADMINISTRATOR" && target.isActive && (!data.isActive || data.role !== "ADMINISTRATOR")) {
      if (await tx.user.count({ where: { role: "ADMINISTRATOR", isActive: true } }) <= 1) throw new UserError(409, "LAST_ADMIN_REQUIRED", "At least one active Administrator must remain.");
    }
    const changedRole = target.role !== data.role;
    if (!data.isActive || changedRole) await tx.session.deleteMany({ where: { userId: id } });
    if (!data.isActive || data.role === "REQUESTER") {
      await tx.ticket.updateMany({ where: { ownerId: id }, data: { ownerId: null, version: { increment: 1 }, updatedAt: new Date() } });
    }
    return tx.user.update({ where: { id }, data: { ...data, version: { increment: 1 } }, select: adminSelect });
  });
}
export async function resetInitialPassword(auth: AuthLocals, id: number, input: unknown) {
  const body = exactBody(input, ["initialPassword", "version"]);
  const expected = version(body.version);
  const passwordHash = await hashPassword(initialPassword(body.initialPassword));
  return transaction(auth, async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;
    const target = await tx.user.findUnique({ where: { id } });
    if (!target) throw new UserError(404, "USER_NOT_FOUND", "This account is unavailable.");
    if (target.version !== expected) throw new UserError(409, "VERSION_CONFLICT", "This account changed. Reload and review before resetting.");
    await tx.session.deleteMany({ where: { userId: id } });
    return tx.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true, version: { increment: 1 } }, select: adminSelect });
  });
}
