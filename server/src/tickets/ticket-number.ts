import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";

const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const TICKET_NUMBER_ATTEMPTS = 5;

export function generateTicketNumber(
  date: Date = new Date(),
  nextIndex: (maximum: number) => number = randomInt,
): string {
  const datePart = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
  const suffix = Array.from(
    { length: 6 },
    () => ALPHANUMERIC[nextIndex(ALPHANUMERIC.length)],
  ).join("");

  return `TKT-${datePart}-${suffix}`;
}

function isTicketNumberCollision(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  return Array.isArray(target)
    ? target.includes("ticketNumber")
    : String(target ?? "").includes("ticketNumber");
}

export async function retryTicketNumberCollision<T>(
  create: (ticketNumber: string) => Promise<T>,
  generate: () => string = () => generateTicketNumber(),
  maximumAttempts = TICKET_NUMBER_ATTEMPTS,
): Promise<T> {
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      return await create(generate());
    } catch (error) {
      if (!isTicketNumberCollision(error) || attempt === maximumAttempts) throw error;
    }
  }

  throw new Error("Ticket Number retry limit was exhausted.");
}
