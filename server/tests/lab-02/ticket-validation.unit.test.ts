import { describe, expect, it } from "vitest";
import { validateCreateTicketInput } from "../../src/tickets/ticket-validation.js";

const validInput = {
  categoryId: 1,
  relatedSystemId: 1,
  summary: "Printer is unavailable",
  requestedPriority: "MEDIUM",
  description: "The third-floor printer cannot be reached.",
};

describe("Ticket creation validation", () => {
  it("trims valid user-authored text", () => {
    const result = validateCreateTicketInput({
      ...validInput,
      summary: "  Printer is unavailable  ",
      description: "  The third-floor printer cannot be reached.  ",
    });

    expect(result).toEqual({
      success: true,
      data: validInput,
    });
  });

  it.each([
    ["summary", "1234"],
    ["summary", "x".repeat(121)],
    ["description", "123456789"],
    ["description", "x".repeat(4_001)],
    ["categoryId", 0],
    ["categoryId", 1.5],
    ["relatedSystemId", 2_147_483_648],
    ["requestedPriority", "URGENT"],
  ])("rejects invalid %s value", (field, value) => {
    const result = validateCreateTicketInput({ ...validInput, [field]: value });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors).toHaveProperty(field);
  });

  it.each([
    [5, 10],
    [120, 4_000],
  ])("accepts summary length %i and description length %i", (summaryLength, descriptionLength) => {
    const result = validateCreateTicketInput({
      ...validInput,
      summary: "s".repeat(summaryLength),
      description: "d".repeat(descriptionLength),
    });

    expect(result.success).toBe(true);
  });
});
