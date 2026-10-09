import type { TicketStatus } from "@prisma/client";

export const ticketTransitions: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], CANCELLED: [],
};
export const allowedTicketTransition = (from: TicketStatus, to: TicketStatus) => ticketTransitions[from].includes(to);
export function resolutionFailure(counts: { completedCount: number; unfinishedCount: number; outstandingFollowUpCount: number }): string | null {
  if (counts.completedCount < 1) return "This Ticket needs at least one completed action in its current cycle before resolving.";
  if (counts.unfinishedCount > 0) return "Finish or cancel all unfinished actions in this Ticket's current cycle before resolving.";
  if (counts.outstandingFollowUpCount > 0) return "Review and clear outstanding completed-action follow-up before resolving.";
  return null;
}
