import type { PrismaClient } from "@prisma/client";
import { hashPassword, validPassword } from "./password.js";

export function validateProvisioning(input: unknown): Map<string, string> {
  if (!Array.isArray(input)) throw new Error("Provisioning input must be an array.");
  const entries = new Map<string, string>();
  for (const row of input) {
    if (!row || typeof row !== "object" || Array.isArray(row) ||
        Object.keys(row).sort().join(",") !== "email,initialPassword" ||
        typeof row.email !== "string" || !validPassword(row.initialPassword)) {
      throw new Error("Each entry needs an email and a valid initialPassword.");
    }
    const email = row.email.trim().toLowerCase();
    if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || entries.has(email)) {
      throw new Error("Invalid or duplicate normalized provisioning email.");
    }
    entries.set(email, row.initialPassword);
  }
  return entries;
}

export async function provisionUsers(prisma: PrismaClient, input: unknown): Promise<number> {
  const entries = validateProvisioning(input);
  const users = await prisma.user.findMany({ select: { id: true, email: true, passwordHash: true } });
  if ([...entries.keys()].some(email => !users.some(user => user.email === email))) {
    throw new Error("Provisioning input contains an unknown account.");
  }
  const pending = users.filter(user => user.passwordHash === null);
  if (pending.some(user => !entries.has(user.email))) {
    throw new Error("Provisioning input must cover every account without a password hash.");
  }
  // Validate all entries/coverage, then hash before opening a short atomic transaction.
  const hashes: Array<{ id: number; hash: string }> = [];
  for (const user of pending) hashes.push({ id: user.id, hash: await hashPassword(entries.get(user.email)!) });
  return prisma.$transaction(async tx => {
    let count = 0;
    for (const user of hashes) {
      const result = await tx.user.updateMany({
        where: { id: user.id, passwordHash: null },
        data: { passwordHash: user.hash, mustChangePassword: true },
      });
      count += result.count;
    }
    return count;
  });
}
