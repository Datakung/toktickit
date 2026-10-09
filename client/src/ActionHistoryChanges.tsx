import type { ActionEvent } from "./api.js";

const fields = [
  ["actionAt", "Action date/time"], ["description", "Description"], ["result", "Result"],
  ["state", "State"], ["cycle", "Resolution cycle"], ["assigneeId", "Assigned to"],
  ["createdById", "Created by"], ["performedById", "Performed by"], ["performedAt", "Performed at"],
  ["followUpRequired", "Follow-up required"], ["followUpNote", "Follow-up note"],
  ["attachmentNotes", "Attachment notes"], ["cancellationReason", "Cancellation reason"],
] as const;

function readable(key: string, value: unknown, event: ActionEvent): string {
  if (value === undefined) return "Not recorded";
  if (value === null || value === "") {
    return key === "assigneeId" ? "Unassigned" : ["performedById", "performedAt", "result"].includes(key) ? "Not recorded" : "None";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (["assigneeId", "createdById", "performedById"].includes(key) && typeof value === "number") {
    // Snapshots retain IDs, not historical account names. Only the recorded
    // event actor can be named from this response; never guess from today's assignee.
    return value === event.actor.id ? event.actor.displayName : `Account #${value}`;
  }
  if (["actionAt", "performedAt"].includes(key) && typeof value === "string" && Number.isFinite(new Date(value).getTime())) {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value)) + " (Bangkok)";
  }
  if (key === "state" && typeof value === "string") {
    return value.toLowerCase().replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
  }
  return typeof value === "string" || typeof value === "number" ? String(value) : JSON.stringify(value);
}

export function ActionHistoryChanges({ event }: { event: ActionEvent }) {
  const created = event.kind === "CREATED" && event.before === null;
  const has = (snapshot: Record<string, unknown> | null, key: string) => !!snapshot && Object.hasOwn(snapshot, key);
  const changes = fields.filter(([key]) => created ? has(event.after, key)
    : (has(event.before, key) || has(event.after, key)) && event.before?.[key] !== event.after[key]);

  return <section className="action-audit-changes" aria-label={`Changes in revision ${event.version}`}>
    <h4>{created ? "Action created" : "What changed"}</h4>
    {created && <p>Initial details recorded for this action.</p>}
    {changes.length ? <dl className="action-change-list">{changes.map(([key, label]) => <div key={key}>
      <dt>{label}</dt>
      <dd className={created ? "action-change-values action-change-initial" : "action-change-values"}>
        {!created && <div><span className="action-change-label">Before</span><span className="preserve-text">{readable(key, event.before?.[key], event)}</span></div>}
        <div><span className="action-change-label">{created ? "Initial value" : "After"}</span><span className="preserve-text">{readable(key, event.after[key], event)}</span></div>
      </dd>
    </div>)}</dl> : <p>No field changes recorded. See Technical details for the original snapshot.</p>}
  </section>;
}
