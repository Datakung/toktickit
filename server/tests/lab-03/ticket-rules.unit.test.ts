import { describe, expect, it } from "vitest";
import { transitions } from "../../src/staff/ticket-operations.js";

describe("Lab 3 Ticket transition matrix", () => {
  it("matches the approved eight-status directed graph", () => {
    expect(transitions).toEqual({
      NEW: ["OPEN", "CANCELLED"],
      OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
      IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
      WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
      RESOLVED: ["CLOSED", "REOPENED"],
      CLOSED: ["REOPENED"],
      REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
      CANCELLED: [],
    });
    for (const [from, destinations] of Object.entries(transitions)) expect(destinations).not.toContain(from);
  });
});
