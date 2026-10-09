import { expect, it } from "vitest";
import type { TicketStatus } from "@prisma/client";
import { allowedTicketTransition, resolutionFailure } from "../../src/tickets/workflow-rules.js";

const expected: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], CANCELLED: [],
};
const states = Object.keys(expected) as TicketStatus[];
it.each(states.flatMap(from => states.map(to => [from, to] as const)))("matrix %s -> %s", (from, to) => {
  expect(allowedTicketTransition(from, to)).toBe(expected[from].includes(to));
});
it.each([
  [0, 0, 0, "completed"], [0, 3, 0, "completed"], [1, 1, 0, "unfinished"],
  [1, 0, 1, "follow-up"], [3, 0, 0, null],
] as const)("resolution counts %i/%i/%i", (completedCount, unfinishedCount, outstandingFollowUpCount, reason) => {
  const result = resolutionFailure({ completedCount, unfinishedCount, outstandingFollowUpCount });
  if (reason === null) expect(result).toBeNull();
  else expect(result?.toLowerCase()).toContain(reason);
});
