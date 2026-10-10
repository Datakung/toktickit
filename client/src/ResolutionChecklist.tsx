import type { ActionPage, StaffTicketDetail } from "./api.js";

export function matchingSummary(ticket: StaffTicketDetail, summary: ActionPage | null) {
  return !!summary && summary.ticketVersion === ticket.version && summary.currentCycle === ticket.resolutionCycle
    && summary.resolutionGate?.cycle === ticket.resolutionCycle;
}
export function readyToResolve(ticket: StaffTicketDetail, summary: ActionPage | null) {
  return matchingSummary(ticket, summary) && !!summary?.resolutionGate.meetsActionRequirements
    && summary.resolutionGate.completedCount > 0 && summary.resolutionGate.unfinishedCount === 0 && summary.resolutionGate.outstandingFollowUpCount === 0;
}
function Requirement({ met, text }: { met: boolean; text: string }) {
  return <li className={`resolution-requirement ${met ? "resolution-requirement-met" : "resolution-requirement-unmet"}`}>
    <span className="resolution-requirement-icon" aria-hidden="true">{met ? "✓" : "✕"}</span>
    <span><strong>{met ? "Met" : "Not met"}:</strong> {text}</span>
  </li>;
}
export function ResolutionChecklist({ ticket, summary }: { ticket: StaffTicketDetail; summary: ActionPage | null }) {
  const current = matchingSummary(ticket, summary), counts = current ? summary!.resolutionGate : null;
 const terminal = ["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.status);
 const tone = !current || terminal ? "neutral" : readyToResolve(ticket, summary) ? "ready" : "blocked";
  return <section className="detail-panel resolution-checklist" aria-label="Resolution checklist">
    <h2>Resolution checklist</h2><p>Cycle {ticket.resolutionCycle} · Ticket version {ticket.version}. Counts include every action in this cycle, across all pages.</p>
    <p className={`resolution-checklist-status resolution-state-${tone}`} role="status"><span className="resolution-requirement-icon" aria-hidden="true">{tone === "ready" ? "✓" : tone === "blocked" ? "✕" : "–"}</span><span>{!current ? "Checking current resolution requirements. Checklist unavailable while loading or saving; refresh actions to review current work."
      : terminal ? ticket.status === "CANCELLED" ? "This Ticket is cancelled permanently; its history is read-only." : "This Ticket is terminal. Reopening starts a new cycle; past work will not qualify."
      : readyToResolve(ticket, summary) ? "Ready to resolve" : "Not ready to resolve"}</span></p>
    {counts && <ul role="list">
      <Requirement met={counts.completedCount > 0} text={`At least one completed action (${counts.completedCount}). Cancelled actions do not qualify.`}/>
      <Requirement met={counts.unfinishedCount === 0} text={`No planned or in-progress actions (${counts.unfinishedCount} unfinished).`}/>
      <Requirement met={counts.outstandingFollowUpCount === 0} text={`No completed-action follow-up outstanding (${counts.outstandingFollowUpCount}).`}/>
    </ul>}
    <p>Requester indication is advisory; only Staff or an Administrator can formally resolve this Ticket.</p>
    <a href="#actions-taken">Review Actions Taken</a>
    {ticket.resolvedAt && <p>Formally resolved at <time dateTime={ticket.resolvedAt}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(ticket.resolvedAt))} (Bangkok).</time></p>}
    {!ticket.resolvedAt && ["RESOLVED", "CLOSED"].includes(ticket.status) && <p>Formal resolution time not recorded (legacy Ticket).</p>}
  </section>;
}
