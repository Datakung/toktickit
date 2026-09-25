import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ApiError, getInternalNotes, getPublicComments, postInternalNote, postPublicComment,
  type CommunicationEntry,
} from "./api.js";

const PAGE_SIZE = 20;
const formatTime = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function CommunicationPanel({ ticketId, kind }: { ticketId: number; kind: "comments" | "notes" }) {
  const notes = kind === "notes";
  const title = notes ? "Internal Notes" : "Public Comments";
  const [items, setItems] = useState<CommunicationEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestGeneration = useRef(0);

  const load = useCallback(async (requestedPage: number) => {
    const generation = ++requestGeneration.current;
    setLoading(true);
    setLoadFailed(false);
    setError("");
    try {
      const result = await (notes ? getInternalNotes(ticketId, requestedPage) : getPublicComments(ticketId, requestedPage));
      if (generation !== requestGeneration.current) return;
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(Math.max(1, result.totalPages));
    } catch (reason) {
      if (generation !== requestGeneration.current) return;
      setLoadFailed(true);
      setError(reason instanceof ApiError ? reason.message : `${title} could not be loaded. Try again.`);
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [notes, ticketId, title]);

  useEffect(() => {
    void load(page);
    return () => { requestGeneration.current++; };
  }, [load, page]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 4000) {
      setError("Write between 1 and 4000 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await (notes ? postInternalNote(ticketId, trimmed) : postPublicComment(ticketId, trimmed));
      setBody("");
      const lastPage = Math.max(1, Math.ceil((total + 1) / PAGE_SIZE));
      if (lastPage === page) void load(page);
      else setPage(lastPage);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : `The ${notes ? "Internal Note" : "Public Comment"} could not be posted. Try again.`);
    } finally {
      setBusy(false);
    }
  }

  return <section className={`detail-panel communication-panel${notes ? " internal-notes" : ""}`} aria-labelledby={`${kind}-heading`}>
    <h2 id={`${kind}-heading`}>{title}</h2>
    <p>{notes ? "Visible only to IT Staff and Administrators." : "Visible to the Requester and service desk."} Entries are permanent.</p>
    {loading ? <p role="status">Loading {title}…</p> : items.length === 0 ? <p>No {title.toLowerCase()} yet.</p> :
      <ol className="communication-list" start={(page - 1) * PAGE_SIZE + 1}>{items.map(item => <li key={item.id}><p>{item.body}</p><small>{item.author.displayName} · {formatTime(item.createdAt)}</small></li>)}</ol>}
    {!loading && !loadFailed && totalPages > 1 && <nav className="communication-pagination" aria-label={`${title} pages`}>
      <button className="secondary-button" disabled={busy || page <= 1} onClick={() => setPage(current => current - 1)}>Previous</button>
      <span>Page {page} of {totalPages} · {total} entries</span>
      <button className="secondary-button" disabled={busy || page >= totalPages} onClick={() => setPage(current => current + 1)}>Next</button>
    </nav>}
    {error && <div className="feedback-panel feedback-panel-error" role="alert"><p>{error}</p>{loadFailed && <button className="secondary-button" onClick={() => void load(page)}>Retry</button>}</div>}
    <form className="communication-form" onSubmit={submit} aria-busy={busy}>
      <label htmlFor={`${kind}-body`}>Add {notes ? "an Internal Note" : "a Public Comment"}</label>
      <textarea id={`${kind}-body`} rows={4} maxLength={4000} value={body} onChange={event => { setBody(event.target.value); setError(""); }} />
      <small>{body.trim().length}/4000 characters</small>
      <button className="primary-button" disabled={busy || loading || loadFailed}>{busy ? "Posting…" : "Post"}</button>
    </form>
  </section>;
}
