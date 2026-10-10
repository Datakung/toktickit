import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, getWorkflowHistory, statusLabel, type WorkflowHistoryPage } from "./api.js";

const date = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
export function WorkflowHistory({ ticketId, version }: { ticketId: number; version: number }) {
  const [result, setResult] = useState<WorkflowHistoryPage | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const sequence = useRef(0), identity = useRef({ ticketId, version });
  const load = useCallback(async (page = 1) => {
    const request = ++sequence.current;
    identity.current = { ticketId, version }; setLoading(true); setError(""); setResult(null);
    try {
      const next = await getWorkflowHistory(ticketId, page);
      if (request === sequence.current) setResult(next);
    } catch (reason) {
      if (request === sequence.current) setError(reason instanceof ApiError ? reason.message : "Workflow history could not be loaded. Try again.");
    } finally { if (request === sequence.current) setLoading(false); }
  }, [ticketId, version]);
  useEffect(() => { void load(); return () => { sequence.current++; }; }, [load]);
  const current = identity.current.ticketId === ticketId && identity.current.version === version;
  return <section className="detail-panel workflow-history" aria-label="Workflow history" aria-busy={loading || !current}>
    <h2>Workflow history</h2><p>Recorded status changes · times shown in Bangkok. This history is read-only.</p>
    {loading || !current ? <p role="status">Loading workflow history…</p> : error ? <div role="alert"><p>{error}</p><button className="secondary-button" onClick={() => void load()}>Retry workflow history</button></div>
      : result && <>
        {result.items.length === 0 ? <p>{result.total === 0 ? "No recorded transitions since the Lab 4 upgrade." : "No transitions on this page."}</p>
          : <ol className="workflow-event-list">{result.items.map(event => <li key={event.id}>
            <strong>{statusLabel(event.fromStatus)} → {statusLabel(event.toStatus)}</strong>
            <span>{event.actor.displayName}</span><span>Cycle {event.cycle} · Ticket version {event.ticketVersion}</span>
            <time dateTime={event.createdAt}>{date(event.createdAt)}</time>
          </li>)}</ol>}
        <div className="workflow-pagination">
          <button className="secondary-button" disabled={result.page <= 1} onClick={() => void load(result.page - 1)}>Previous transitions</button>
          <span>Page {result.page} of {result.totalPages} · {result.total} transitions</span>
          <button className="secondary-button" disabled={result.page >= result.totalPages} onClick={() => void load(result.page + 1)}>Next transitions</button>
        </div>
      </>}
  </section>;
}
