import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  generateTicketNumber,
  retryTicketNumberCollision,
} from "../../src/tickets/ticket-number.js";

describe("Ticket Number generation", () => {
  it("uses the UTC date and a six-character uppercase alphanumeric suffix", () => {
    const number = generateTicketNumber(new Date("2026-09-01T23:59:59.000Z"), () => 10);

    expect(number).toBe("TKT-20260901-AAAAAA");
    expect(number).toMatch(/^TKT-\d{8}-[A-Z0-9]{6}$/);
  });

  it("retries a Ticket Number unique collision", async () => {
    const collision = new Prisma.PrismaClientKnownRequestError("collision", {
      code: "P2002",
      clientVersion: "5.22.0",
      meta: { target: ["ticketNumber"] },
    });
    const create = vi.fn()
      .mockRejectedValueOnce(collision)
      .mockResolvedValueOnce({ ticketNumber: "TKT-20260901-BBBBBB" });
    const numbers = ["TKT-20260901-AAAAAA", "TKT-20260901-BBBBBB"];

    await expect(retryTicketNumberCollision(create, () => numbers.shift()!)).resolves.toEqual({
      ticketNumber: "TKT-20260901-BBBBBB",
    });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("does not retry unrelated database failures", async () => {
    const create = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(retryTicketNumberCollision(create)).rejects.toThrow("offline");
    expect(create).toHaveBeenCalledOnce();
  });
});
