import { useEffect, useId, useRef, useState } from "react";
import {
  ACTION_RETRY_PREFIX, ApiError, getAction, getActionAssignees, getActionHistory, getActions, getStaffTicket, writeAction,
  type ActionFields, type ActionHistoryPage, type ActionPage, type ActionTakenRecord,
  type ActionWriteKind, type ActionWritePayload, type StaffOwner, type TicketStatus,
} from "./api.js";

type TicketContext = { id: number; version: number; status: TicketStatus; createdAt: string };
type Props = {
  ticket: TicketContext; staff: boolean; userId: number; actorName: string;
  linkedActionId?: string | null; externalBusy?: boolean;
  onParentUpdated?: (ticket: Awaited<ReturnType<typeof getStaffTicket>>) => void;
  onBusyChange?: (busy: boolean) => void;
};
type Draft = Omit<ActionFields, "actionAt"> & { actionAt: string; changeReason: string };
type Intent = { kind: ActionWriteKind; actionId: number | null; payload: ActionWritePayload };
type Recovery = { intent: Intent; confirmed: boolean; fieldSavedFor: number | null };
const terminal = (status: TicketStatus) => ["RESOLVED", "CLOSED", "CANCELLED"].includes(status);
const date = (value: string) => new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok",
}).format(new Date(value));
export const bangkokInput = (value: string) => new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 23).replace(/\.000$/, "");
export const bangkokInstant = (value: string) => `${value.length === 16 ? value + ":00" : value}+07:00`;
const draftOf = (a?: ActionTakenRecord): Draft => ({
  actionAt: bangkokInput(a?.actionAt ?? new Date().toISOString()), description: a?.description ?? "",
  result: a?.result ?? "", followUpRequired: a?.followUpRequired ?? false,
  followUpNote: a?.followUpNote ?? "", attachmentNotes: a?.attachmentNotes ?? "", changeReason: "",
});
const stateLabel = (state: string) => state.toLowerCase().replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
const messageOf = (error: unknown) => error instanceof ApiError ? error.message : "This information could not be loaded. Try again.";
const validId = (id: string) => /^[1-9]\d*$/.test(id) && Number(id) <= 2147483647;

// Remount by identity so drafts and retry keys can never cross Tickets or users.
export function ActionsTaken(props: Props) {
  return <ActionsPanel key={`${props.ticket.id}:${props.userId}:${props.staff}:${props.linkedActionId ?? ""}`} {...props} />;
}

function ActionsPanel({ ticket, staff, userId, actorName, linkedActionId, externalBusy = false, onParentUpdated, onBusyChange }: Props) {
  const recoveryKey = `${ACTION_RETRY_PREFIX}${userId}:${ticket.id}`;
  const [list, setList] = useState<ActionPage | null>(null);
  const [selected, setSelected] = useState<ActionTakenRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftOf());
  const [assignee, setAssignee] = useState("");
  const [choices, setChoices] = useState<StaffOwner[]>([]);
  const [parentStatus, setParentStatus] = useState(ticket.status);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [unknown, setUnknown] = useState<Intent | null>(null);
  const [saved, setSaved] = useState<Intent | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<"COMPLETED" | "CANCELLED" | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [completionResult, setCompletionResult] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [historyPage, setHistoryPage] = useState<ActionHistoryPage | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [historyBusy, setHistoryBusy] = useState(false);
  const alive = useRef(true), reads = useRef(0), historyReads = useRef(0), writeLock = useRef(false);
  const fieldSavedFor = useRef<number | null>(null);
  const recordHeading = useRef<HTMLHeadingElement>(null), firstField = useRef<HTMLInputElement>(null);
  const confirmationField = useRef<HTMLTextAreaElement>(null), trigger = useRef<HTMLElement | null>(null);
  const completeButton = useRef<HTMLButtonElement>(null), cancelButton = useRef<HTMLButtonElement>(null);
  const previousConfirmation = useRef<typeof confirmation>(null);
  const callbacks = useRef({ onParentUpdated, onBusyChange }); callbacks.current = { onParentUpdated, onBusyChange };
  const id = useId();
  const locked = busy || loading || blocked || !!unknown || !!saved || externalBusy;
  const readOnlyReason = !staff ? "Shared action history is read-only for Requesters."
    : terminal(parentStatus) ? `Actions cannot be changed while this Ticket is ${stateLabel(parentStatus)}.`
    : selected && selected.cycle !== list?.currentCycle ? "This action belongs to a previous resolution cycle and is read-only."
    : selected?.state === "CANCELLED" ? "Cancelled actions are read-only." : "";

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; reads.current++; historyReads.current++; callbacks.current.onBusyChange?.(false); };
  }, []);
  useEffect(() => { callbacks.current.onBusyChange?.(busy || blocked || !!unknown || !!saved || loading); }, [busy, blocked, unknown, saved, loading]);
  useEffect(() => { if (creating) firstField.current?.focus(); else if (selected) recordHeading.current?.focus(); }, [creating, selected?.id, selected?.version]);
  useEffect(() => {
    if (confirmation) confirmationField.current?.focus();
    else if (previousConfirmation.current) (previousConfirmation.current === "COMPLETED" ? completeButton : cancelButton).current?.focus();
    previousConfirmation.current = confirmation;
  }, [confirmation]);
  useEffect(() => { if (!busy && !unknown) firstField.current?.closest(".actions-taken")?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [fields]);

  async function loadHistory(actionId: number, page = 1) {
    const request = ++historyReads.current;
    setHistoryBusy(true); setHistoryError(""); setHistoryPage(null);
    try {
      const result = await getActionHistory(ticket.id, actionId, page);
      if (alive.current && request === historyReads.current) setHistoryPage(result);
    } catch (reason) { if (alive.current && request === historyReads.current) setHistoryError(messageOf(reason)); }
    finally { if (alive.current && request === historyReads.current) setHistoryBusy(false); }
  }

  async function refresh(actionId: number | null, page = list?.page ?? 1, resetDraft = false, intent?: Intent) {
    const request = ++reads.current;
    historyReads.current++;
    setLoading(true); setError("");
    try {
      const [nextList, detail, nextParent, eligible] = await Promise.all([
        getActions(ticket.id, page), actionId ? getAction(ticket.id, actionId) : Promise.resolve(null),
        staff ? getStaffTicket(ticket.id) : Promise.resolve(null),
        staff ? getActionAssignees() : Promise.resolve({ items: [] }),
      ]);
      if (!alive.current || request !== reads.current) return;
      // These are independent reads: a concurrent write must not turn a mixed
      // snapshot into permission to save with stale action/Ticket versions.
      if (nextList.ticketVersion < ticket.version || (detail && (detail.action.id !== actionId || detail.action.ticketId !== ticket.id || detail.ticketVersion !== nextList.ticketVersion || detail.currentCycle !== nextList.currentCycle))
        || (nextParent && nextParent.version !== nextList.ticketVersion)) throw new Error("Snapshot changed");
      setList(nextList); setSelected(detail?.action ?? null); setChoices(eligible.items);
      setParentStatus(nextParent?.status ?? ticket.status);
      if (nextParent) callbacks.current.onParentUpdated?.(nextParent);
      if (resetDraft || intent?.kind === "create" || intent?.kind === "edit") setDraft(draftOf(detail?.action));
      if (intent?.kind === "state" && detail) setDraft(previous => ({ ...previous,
        result: previous.result === selected?.result ? detail.action.result : previous.result,
      }));
      if (resetDraft || intent?.kind === "create" || intent?.kind === "assign") setAssignee(detail?.action.assignee ? String(detail.action.assignee.id) : "");
      if (intent) {
        sessionStorage.removeItem(recoveryKey);
        setCreating(false); setConfirmation(null); setConfirmed(false); setSaved(null); setUnknown(null);
        if (intent.kind === "edit") fieldSavedFor.current = actionId;
        setNotice(intent.kind === "create" ? "Action created." : intent.kind === "edit" ? "Action changes saved." : intent.kind === "assign" ? "Assignment saved. Other action fields were not submitted." : "Action state saved.");
      }
      setBlocked(false); setFields({});
      if (detail) void loadHistory(detail.action.id);
    } catch (reason) {
      if (!alive.current || request !== reads.current) return;
      setBlocked(true);
      setError(intent ? "Saved; refresh to load current record. Do not repeat the save." : messageOf(reason));
    } finally { if (alive.current && request === reads.current) setLoading(false); }
  }

  useEffect(() => {
    if (linkedActionId && !validId(linkedActionId)) { setError("The linked action is unavailable. Check its link."); setBlocked(true); setLoading(false); return; }
    if (staff) {
      try {
        const stored = sessionStorage.getItem(recoveryKey);
        if (stored) {
          const recovery = JSON.parse(stored) as Recovery;
          const intent = recovery.intent;
          if (!["create", "edit", "assign", "state"].includes(intent?.kind) || !intent.payload?.requestId
            || (intent.actionId !== null && !validId(String(intent.actionId)))) throw new Error("Invalid recovery record");
          fieldSavedFor.current = recovery.fieldSavedFor;
          if (recovery.confirmed) { setSaved(intent); setNotice("Save confirmed. Refreshing current record…"); void refresh(intent.actionId, 1, false, intent); }
          else {
            setUnknown(intent); setCreating(intent.kind === "create");
            if ("description" in intent.payload) setDraft({ ...intent.payload, actionAt: bangkokInput(intent.payload.actionAt), changeReason: "changeReason" in intent.payload ? intent.payload.changeReason : "" });
            if ("assigneeId" in intent.payload) setAssignee(intent.payload.assigneeId ? String(intent.payload.assigneeId) : "");
            void refresh(intent.actionId).then(() => { if (alive.current) setError("Save outcome unknown after reload. Retry the same save to recover its receipt before making another change."); });
          }
          return;
        }
      } catch { setError("Save recovery could not be read. Do not submit new work until browser session storage is available and this page is reloaded."); setBlocked(true); setLoading(false); return; }
    }
    void refresh(linkedActionId ? Number(linkedActionId) : null, 1, true);
    // Identity changes remount this panel; other refreshes preserve drafts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (list && !busy && !unknown && !saved && (ticket.version > list.ticketVersion || ticket.status !== parentStatus)) void refresh(selected?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.version, ticket.status]);

  function choose(actionId: number) {
    if (locked) return;
    setCreating(false); setConfirmation(null); setNotice(""); fieldSavedFor.current = null;
    void refresh(actionId, list?.page, true);
  }
  function newAction() {
    if (locked || terminal(parentStatus)) return;
    trigger.current = document.activeElement as HTMLElement;
    reads.current++; historyReads.current++; setSelected(null); setCreating(true); setDraft(draftOf());
    setAssignee(""); setConfirmation(null); setError(""); setNotice(""); setFields({}); fieldSavedFor.current = null;
  }
  function exitDraft() {
    if (locked) return;
    setCreating(false); setDraft(draftOf(selected ?? undefined)); setAssignee(selected?.assignee ? String(selected.assignee.id) : "");
    setConfirmation(null); setFields({}); setError(""); trigger.current?.focus();
    // Cancelling local input never reverses a confirmed mutation.
  }
  function validationErrors(): Record<string, string> {
    const found: Record<string, string> = {};
    const instant = new Date(bangkokInstant(draft.actionAt)).getTime();
    if (!Number.isFinite(instant) || instant < new Date(ticket.createdAt).getTime() || instant > Date.now() + 5 * 60000) found.actionAt = "Use Bangkok time between Ticket creation and five minutes from now.";
    if (!draft.description.trim()) found.description = "Enter a Description.";
    if ((draft.followUpRequired || selected?.followUpRequired) && !draft.followUpNote.trim()) found.followUpNote = "Explain the follow-up, including why it is cleared.";
    if (selected?.state === "COMPLETED") {
      if (!draft.result.trim()) found.result = "Completed work requires a Result.";
      if (!draft.changeReason.trim()) found.changeReason = "Explain the correction to completed work.";
    }
    return found;
  }
  async function send(intent: Intent, retry = false) {
    if (writeLock.current || externalBusy || (!retry && locked) || (!retry && readOnlyReason)) return;
    writeLock.current = true; setBusy(true); setError(""); setFields({}); setNotice("");
    try {
      // Write the original intent before sending it. A full browser reload during
      // an in-flight request must recover this key, not mint a duplicate create.
      try { sessionStorage.setItem(recoveryKey, JSON.stringify({ intent, confirmed: false, fieldSavedFor: fieldSavedFor.current } satisfies Recovery)); }
      catch { setError("Save not submitted: browser session storage is unavailable. Enable it and try again."); return; }
      const receipt = await writeAction(ticket.id, intent.kind, intent.actionId, intent.payload);
      if (!alive.current) return;
      const confirmedIntent = { ...intent, actionId: receipt.actionId };
      // If storage becomes unavailable after the commit, retain the in-memory
      // confirmed receipt and refresh; never turn it back into a new save.
      try { sessionStorage.setItem(recoveryKey, JSON.stringify({ intent: confirmedIntent, confirmed: true, fieldSavedFor: intent.kind === "edit" ? receipt.actionId : fieldSavedFor.current } satisfies Recovery)); } catch { /* Original journal still provides exact replay. */ }
      setUnknown(null); setSaved(confirmedIntent);
      setNotice("Save confirmed. Refreshing current record…");
      await refresh(receipt.actionId, list?.page, false, intent);
    } catch (reason) {
      if (!alive.current) return;
      const partial = intent.kind === "assign" && fieldSavedFor.current === intent.actionId;
      if (!(reason instanceof ApiError) || reason.status >= 500 || reason.status === 408) {
        setUnknown(intent);
        setError(partial ? "Action changes saved; assignment outcome unknown. Retry only this same assignment." : "Save outcome unknown. Retry the same save to recover its receipt; do not submit a new operation.");
      } else {
        try { sessionStorage.removeItem(recoveryKey); } catch { /* Keep definite API failure feedback. */ }
        setUnknown(null); setFields(reason.fields);
        setError(`${partial ? "Action changes saved; assignment not saved. " : ""}${reason.message}`);
        if (reason.status === 409) setBlocked(true);
        if (reason.code === "INVALID_ASSIGNEE") {
          setFields({ ...reason.fields, assigneeId: reason.message });
          try { const eligible = await getActionAssignees(); if (alive.current) setChoices(eligible.items); }
          catch { if (alive.current) setBlocked(true); }
        }
      }
    } finally { writeLock.current = false; if (alive.current) setBusy(false); }
  }
  function saveFields() {
    if (!list || locked) return;
    const found = validationErrors(); setFields(found);
    if (Object.keys(found).length) { setError("Correct the highlighted fields before saving."); firstField.current?.form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); return; }
    const values: ActionFields = { actionAt: bangkokInstant(draft.actionAt), description: draft.description, result: draft.result,
      followUpRequired: draft.followUpRequired, followUpNote: draft.followUpNote, attachmentNotes: draft.attachmentNotes };
    const payload: ActionWritePayload = { ...values, ticketVersion: list.ticketVersion, requestId: crypto.randomUUID(),
      ...(creating ? { assigneeId: assignee ? Number(assignee) : null } : { version: selected!.version, changeReason: draft.changeReason }) };
    void send({ kind: creating ? "create" : "edit", actionId: selected?.id ?? null, payload });
  }
  function saveAssignment() {
    if (!list || !selected || locked) return;
    void send({ kind: "assign", actionId: selected.id, payload: { assigneeId: assignee ? Number(assignee) : null, version: selected.version, ticketVersion: list.ticketVersion, requestId: crypto.randomUUID() } });
  }
  function saveState(state: "IN_PROGRESS" | "COMPLETED" | "CANCELLED") {
    if (!list || !selected || locked) return;
    if (state !== "IN_PROGRESS" && !confirmed) { setError("Confirm this action state change before saving."); return; }
    if (state === "COMPLETED" && !completionResult.trim()) { setFields({ result: "Enter a Result before completing work." }); confirmationField.current?.focus(); return; }
    if (state === "CANCELLED" && !cancellationReason.trim()) { setFields({ cancellationReason: "Explain why this action is cancelled." }); confirmationField.current?.focus(); return; }
    void send({ kind: "state", actionId: selected.id, payload: { version: selected.version, ticketVersion: list.ticketVersion,
      requestId: crypto.randomUUID(), state, result: state === "COMPLETED" ? completionResult : selected.result,
      cancellationReason: state === "CANCELLED" ? cancellationReason : "" } });
  }
  function openConfirmation(state: "COMPLETED" | "CANCELLED") {
    trigger.current = document.activeElement as HTMLElement;
    setCompletionResult(selected?.result ?? ""); setCancellationReason(""); setConfirmed(false); setFields({}); setConfirmation(state);
  }
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(previous => ({ ...previous, [key]: value }));
  function textField(key: "description" | "result" | "followUpNote" | "attachmentNotes" | "changeReason", label: string, max: number, required = false) {
    return <label className="action-field" htmlFor={`${id}-${key}`}>{label}<textarea aria-label={label} id={`${id}-${key}`} value={draft[key]} maxLength={max} required={required}
      aria-invalid={!!fields[key]} aria-describedby={fields[key] ? `${id}-${key}-error` : undefined} onChange={e => set(key, e.target.value)} />
      {fields[key] && <span className="field-error" id={`${id}-${key}-error`}>{fields[key]}</span>}</label>;
  }
  const assigneeControl = <label className="action-field" htmlFor={`${id}-assignee`}>Action assignee<select aria-label="Action assignee" id={`${id}-assignee`} value={assignee}
    aria-invalid={!!fields.assigneeId} aria-describedby={fields.assigneeId ? `${id}-assignee-error` : undefined} onChange={e => setAssignee(e.target.value)}>
    <option value="">Unassigned</option>{assignee && !choices.some(c => String(c.id) === assignee) && <option value={assignee}>No longer eligible — choose another assignee</option>}
    {choices.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}</select>{fields.assigneeId && <span className="field-error" id={`${id}-assignee-error`}>{fields.assigneeId}</span>}</label>;

  return <section className="detail-panel actions-taken" aria-label="Actions Taken" aria-busy={loading || busy}>
    <div className="action-section-heading"><div><h2>Actions Taken</h2><p>Shared work records, separate from comments and private Internal Notes. All action times use Bangkok (UTC+07:00).</p></div>
      {staff && <button className="primary-button" disabled={locked || terminal(parentStatus)} onClick={newAction}>New action</button>}</div>
    {readOnlyReason && <p className="action-readonly">{readOnlyReason}</p>}
    {notice && <p className="success-message" role="status">{notice}</p>}
    {error && <div className="feedback-panel feedback-panel-error" role="alert"><p>{error}</p></div>}
    {unknown && <button className="secondary-button" disabled={busy} onClick={() => void send(unknown, true)}>{busy ? "Recovering save…" : "Retry same save"}</button>}
    {!unknown && <button className="text-button" disabled={busy || loading || externalBusy || (!!linkedActionId && !validId(linkedActionId))}
      onClick={() => void refresh(saved?.actionId ?? selected?.id ?? (linkedActionId ? Number(linkedActionId) : null), list?.page, false, saved ?? undefined)}>{saved ? "Refresh saved record" : blocked ? "Reload and review" : "Refresh actions"}</button>}
    {loading && <p>Loading current action records…</p>}
    {list && <><p>{list.total} actions · Page {list.page} of {list.totalPages} · Current cycle {list.currentCycle}</p>
      {list.items.length === 0 ? <p>No actions on this page.</p> : <table className="actions-table"><caption>Actions for this Ticket, ordered by creation</caption><thead><tr><th scope="col">Action / Description</th><th scope="col">Action time</th><th scope="col">State / Cycle</th><th scope="col">Assignee</th><th scope="col">Performed by</th><th scope="col">Details</th></tr></thead><tbody>
        {list.items.map(a => <tr key={a.id}><td data-label="Action / Description"><strong>Action {a.id}</strong><p className="preserve-text">{a.description}</p></td><td data-label="Action time">{date(a.actionAt)}</td><td data-label="State / Cycle">{stateLabel(a.state)} · Cycle {a.cycle}</td><td data-label="Assignee">{a.assignee?.displayName ?? "Unassigned"}</td><td data-label="Performed by">{a.performedBy?.displayName ?? "Not recorded yet"}</td><td data-label="Details"><button className="secondary-button" disabled={locked} aria-label={`View action ${a.id}`} onClick={() => choose(a.id)}>View</button></td></tr>)}
      </tbody></table>}
      <nav className="action-controls" aria-label="Actions pages"><button className="secondary-button" disabled={locked || list.page <= 1} onClick={() => void refresh(selected?.id ?? null, list.page - 1)}>Previous actions</button><button className="secondary-button" disabled={locked || list.page >= list.totalPages} onClick={() => void refresh(selected?.id ?? null, list.page + 1)}>Next actions</button></nav>
    </>}
    {selected && <section className="action-record" aria-label={`Action ${selected.id} details`}><h3 ref={recordHeading} tabIndex={-1}>Action {selected.id}</h3>
      <dl className="action-record-grid">{[
        ["Action Date/Time", date(selected.actionAt)], ["Description", selected.description], ["Result", selected.result || "Not recorded"],
        ["State", stateLabel(selected.state)], ["Cycle", selected.cycle], ["Assigned to", selected.assignee?.displayName ?? "Unassigned"],
        ["Created by", `${selected.createdBy.displayName} · ${date(selected.createdAt)}`],
        ["Performed by", selected.performedBy?.displayName ?? "Not recorded yet"], ["Performed at", selected.performedAt ? date(selected.performedAt) : "Not recorded"],
        ["Follow-Up Required", selected.followUpRequired ? "Yes" : "No"], ["Follow-up Note", selected.followUpNote || "None"],
        ["Attachment Notes", selected.attachmentNotes || "None"], ["Updated", `${date(selected.updatedAt)} · Revision ${selected.version}`],
        ...(selected.cancellationReason ? [["Cancellation reason", selected.cancellationReason]] : []),
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="preserve-text">{value}</dd></div>)}</dl>
    </section>}
    {staff && !readOnlyReason && (creating || selected) && <>
      <form className="action-editor" onSubmit={e => { e.preventDefault(); saveFields(); }} aria-label={creating ? "Create action" : "Edit action fields"}>
        <fieldset disabled={locked}><legend>{creating ? "New action" : "Action fields"}</legend>
          <p>{creating ? "Creates one Planned record. Its initial fields and assignee save together." : "Save action changes fields only. Assignment is saved separately; cancelling input does not undo saved changes."}</p>
          <div className="action-form-grid"><label className="action-field" htmlFor={`${id}-actionAt`}>Action Date/Time (Bangkok)<input aria-label="Action Date/Time (Bangkok)" ref={firstField} id={`${id}-actionAt`} type="datetime-local" step="0.001" required value={draft.actionAt}
            aria-invalid={!!fields.actionAt} aria-describedby={`${id}-time-help`} onChange={e => set("actionAt", e.target.value)} /><span className="helper-text" id={`${id}-time-help`}>{fields.actionAt ?? "UTC+07:00, not your browser's local timezone."}</span></label>
            {creating && assigneeControl}{textField("description", "Description", 4000, true)}{textField("result", "Result", 4000, selected?.state === "COMPLETED")}
            <label className="action-checkbox"><input type="checkbox" checked={draft.followUpRequired} onChange={e => set("followUpRequired", e.target.checked)} /> Follow-Up Required</label>
            {(draft.followUpRequired || selected?.followUpRequired || !!draft.followUpNote) && textField("followUpNote", "Follow-up Note", 2000, draft.followUpRequired || selected?.followUpRequired)}
            {textField("attachmentNotes", "Attachment Notes", 2000)}{selected?.state === "COMPLETED" && textField("changeReason", "Change reason", 500, true)}
          </div><div className="action-controls"><button className="primary-button">{busy ? "Saving…" : creating ? "Create action" : "Save action"}</button><button type="button" className="secondary-button" onClick={exitDraft}>Discard unsaved fields</button></div>
        </fieldset>
      </form>
      {selected && selected.state !== "COMPLETED" && <form className="action-assignment" aria-label="Action assignment" onSubmit={e => { e.preventDefault(); saveAssignment(); }}><fieldset disabled={locked}><legend>Assignment</legend><p>Save assignment changes only the assignee. Unsaved action fields are kept.</p>{assigneeControl}<button className="secondary-button">Save assignment</button></fieldset></form>}
      {selected && selected.state !== "COMPLETED" && <section className="action-state-controls" aria-label="Action state controls">
        {!confirmation ? <div className="action-controls">{selected.state === "PLANNED" && <button className="secondary-button" disabled={locked} onClick={() => saveState("IN_PROGRESS")}>Start action</button>}<button ref={completeButton} className="primary-button" disabled={locked} onClick={() => openConfirmation("COMPLETED")}>Complete action</button><button ref={cancelButton} className="secondary-button" disabled={locked} onClick={() => openConfirmation("CANCELLED")}>Cancel action</button></div>
          : <form aria-label={confirmation === "COMPLETED" ? "Confirm completion" : "Confirm cancellation"} onSubmit={e => { e.preventDefault(); saveState(confirmation); }}><fieldset disabled={locked}><legend>{confirmation === "COMPLETED" ? "Complete this action" : "Cancel this action"}</legend>
            <p>{confirmation === "COMPLETED" ? `Completion records ${actorName} as the actual performer, not the assignee. Unsaved action fields are not submitted.` : "Cancellation retains this record and its audit history. This cannot be reversed."}</p>
            <label className="action-field" htmlFor={`${id}-state-text`}>{confirmation === "COMPLETED" ? "Completion Result" : "Cancellation reason"}<textarea aria-label={confirmation === "COMPLETED" ? "Completion Result" : "Cancellation reason"} ref={confirmationField} id={`${id}-state-text`} required maxLength={confirmation === "COMPLETED" ? 4000 : 500}
              value={confirmation === "COMPLETED" ? completionResult : cancellationReason} aria-invalid={!!fields[confirmation === "COMPLETED" ? "result" : "cancellationReason"]}
              onChange={e => confirmation === "COMPLETED" ? setCompletionResult(e.target.value) : setCancellationReason(e.target.value)} />{fields[confirmation === "COMPLETED" ? "result" : "cancellationReason"] && <span className="field-error">{fields[confirmation === "COMPLETED" ? "result" : "cancellationReason"]}</span>}</label>
            <label className="action-checkbox"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{confirmation === "COMPLETED" ? "I confirm I performed this work." : "I confirm cancellation of this action."}</label>
            <div className="action-controls"><button className="primary-button">{confirmation === "COMPLETED" ? "Confirm complete" : "Confirm cancel action"}</button><button type="button" className="secondary-button" onClick={() => { setConfirmation(null); trigger.current?.focus(); }}>Back without changing state</button></div>
          </fieldset></form>}
      </section>}
    </>}
    {selected && <section className="action-history" aria-label="Action audit history"><h3>Audit history</h3><p>Immutable revisions, ordered oldest first. Times use Bangkok.</p>
      {historyBusy && <p>Loading audit history…</p>}{historyError && <><p role="alert">{historyError}</p><button className="secondary-button" onClick={() => void loadHistory(selected.id)}>Retry history</button></>}
      {historyPage && <><ol>{historyPage.items.map(event => <li key={event.id}><strong>{stateLabel(event.kind)} · Revision {event.version}</strong><p>{event.actor.displayName} · {date(event.createdAt)}</p>{event.reason && <p className="preserve-text">Reason: {event.reason}</p>}<details><summary>Before and after values</summary><h4>Before</h4><pre>{event.before ? JSON.stringify(event.before, null, 2) : "No previous record"}</pre><h4>After</h4><pre>{JSON.stringify(event.after, null, 2)}</pre></details></li>)}</ol>{!historyPage.items.length && <p>No revisions on this page.</p>}<p>History page {historyPage.page} of {historyPage.totalPages} · {historyPage.total} revisions</p><nav className="action-controls" aria-label="Audit history pages"><button className="secondary-button" disabled={historyBusy || historyPage.page <= 1} onClick={() => void loadHistory(selected.id, historyPage.page - 1)}>Previous history</button><button className="secondary-button" disabled={historyBusy || historyPage.page >= historyPage.totalPages} onClick={() => void loadHistory(selected.id, historyPage.page + 1)}>Next history</button></nav></>}
    </section>}
  </section>;
}
