import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const settings = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const prefix = "scrypt-v1";
// Bound concurrent ~128 MiB jobs and waiting callers; login will also be throttled.
let active = 0;
const waiting: Array<() => void> = [];

export function validPassword(value: unknown): value is string {
  return typeof value === "string" && [...value].length >= 12 && [...value].length <= 128;
}

async function derive(password: string, salt: Buffer): Promise<Buffer> {
  if (active >= 2) {
    if (waiting.length >= 16) throw new Error("Password service busy.");
    await new Promise<void>(resolve => waiting.push(resolve));
  } else active++;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, settings, (error, key) => error ? reject(error) : resolve(key));
    });
  } finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}

export async function hashPassword(password: string): Promise<string> {
  if (!validPassword(password)) throw new Error("Password must contain 12-128 characters.");
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `${prefix}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: unknown, record: string | null): Promise<boolean> {
  if (!validPassword(password) || !record) return false;
  const parts = record.split("$");
  if (parts.length !== 3 || parts[0] !== prefix ||
      !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
  const actual = await derive(password, Buffer.from(parts[1], "hex"));
  return timingSafeEqual(actual, Buffer.from(parts[2], "hex"));
}
