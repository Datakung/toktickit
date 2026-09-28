import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, getCategories, getRelatedSystems, getStaffOwners, getStaffQueue, statusLabel, ticketStatuses, type Category, type RelatedSystem, type StaffOwner, type QueueQuery, type QueueResponse } from "./api.js";
export const defaultQueueQuery: QueueQuery = { q: "", categoryId: "", relatedSystemId: "", ownerId: "", unassigned: "", status: "", itPriority: "", sort: "updatedAt", direction: "desc", page: 1, pageSize: 10 };
export function StaffTicketQueuePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [query, setQuery] = useState(defaultQueueQuery), [search, setSearch] = useState("");
  const [result, setResult] = useState<QueueResponse | null>(null), [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true), [retry, setRetry] = useState(0);
  const [references, setReferences] = useState<{ categories: Category[]; systems: RelatedSystem[]; owners: StaffOwner[] }>({ categories: [], systems: [], owners: [] });
  const [referenceError, setReferenceError] = useState(false), [referenceRetry, setReferenceRetry] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    let current = true;
    setReferenceError(false);
    Promise.all([getCategories(), getRelatedSystems(), getStaffOwners()]).then(([categories, systems, owners]) => {
      if (current) setReferences({ categories, systems, owners: owners.items });
    }).catch(() => { if (current) setReferenceError(true); });
    return () => { current = false; };
  }, [referenceRetry]);
  useEffect(() => {
    let current = true; setLoading(true); setResult(null); setError(null);
    getStaffQueue(query).then(data => { if (current) setResult(data); }).catch(reason => {
      if (current) setError(reason instanceof ApiError ? reason : new ApiError(500, "QUEUE_LOAD_FAILED", "The Ticket Queue could not be loaded. Try again."));
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [query, retry]);
  function change(key: keyof QueueQuery, value: string | number) {
    setQuery(old => ({ ...old, [key]: value, page: 1, ...(key === "ownerId" && value ? { unassigned: "" } : {}), ...(key === "unassigned" && value === "true" ? { ownerId: "" } : {}) }));
  }
  function submit(event: FormEvent) { event.preventDefault(); change("q", search.trim()); }
  const filtered = !!(query.q || query.categoryId || query.relatedSystemId || query.ownerId || query.unassigned || query.status || query.itPriority);
  const select = (key: keyof QueueQuery, label: string, options: Array<[string, string]>) => <div><label htmlFor={`queue-${key}`}>{label}</label><select id={`queue-${key}`} value={query[key]} onChange={e => change(key, key === "pageSize" ? Number(e.target.value) : e.target.value)}>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>;
  return <section className="queue-page"><p className="eyebrow">Staff work</p><h1 tabIndex={-1} ref={heading}>Ticket Queue</h1><p className="page-intro">Find and prioritize requests across the service desk.</p>
    {referenceError && <div role="alert" className="feedback-panel feedback-panel-error">Filter choices could not be loaded. Existing filters are retained. <button className="secondary-button" onClick={() => setReferenceRetry(n => n + 1)}>Retry filter choices</button></div>}
    <form className="queue-filters" onSubmit={submit}>
      <div className="queue-search"><label htmlFor="queue-search">Ticket Number or Summary</label><div className="admin-actions"><input id="queue-search" maxLength={120} value={search} onChange={e => setSearch(e.target.value)}/><button className="secondary-button">Search</button></div></div>
      {select("categoryId", "Category", [["", "All categories"], ...references.categories.map(c => [String(c.id), c.name] as [string, string])])}
      {select("relatedSystemId", "Related System", [["", "All related systems"], ...references.systems.map(c => [String(c.id), c.name] as [string, string])])}
      {select("ownerId", "Owner", [["", "All owners"], ...references.owners.map(c => [String(c.id), c.displayName] as [string, string])])}
      {select("unassigned", "Assignment", [["", "All assignments"], ["true", "Unassigned"], ["false", "Assigned"]])}
      {select("status", "Status", [["", "All statuses"], ...ticketStatuses.map(s => [s, statusLabel(s)] as [string, string])])}
      {select("itPriority", "IT Priority", [["", "All priorities"], ["LOW", "Low"], ["MEDIUM", "Medium"], ["HIGH", "High"]])}
      {select("sort", "Sort by", [["updatedAt", "Last Updated"], ["createdAt", "Created"], ["itPriority", "IT Priority"]])}
      {select("direction", "Direction", [["desc", "Descending"], ["asc", "Ascending"]])}
      <button type="button" className="text-button" onClick={() => { setSearch(""); setQuery({ ...defaultQueueQuery }); }}>Clear filters</button>
    </form>
    {filtered && <p className="helper-text">Applied filters: {[query.q && `Search “${query.q}”`, query.categoryId && "Category", query.relatedSystemId && "Related System", query.ownerId && "Owner", query.unassigned && (query.unassigned === "true" ? "Unassigned" : "Assigned"), query.status && statusLabel(query.status as typeof ticketStatuses[number]), query.itPriority && `IT Priority ${query.itPriority}`].filter(Boolean).join(" · ")}</p>}
    {loading ? <p role="status">Loading Ticket Queue…</p> : error ? <div role="alert" className="feedback-panel feedback-panel-error"><p>{error.status === 403 ? "Staff access is required." : error.message}</p>{Object.values(error.fields).map((message, i) => <p key={i}>{message}</p>)}{error.status !== 403 && <button className="secondary-button" onClick={() => setRetry(n => n + 1)}>Retry queue</button>}</div> : result && <>
      <p role="status">{result.total} tickets · Page {result.page} of {result.totalPages}</p>
      {result.items.length === 0 ? <div className="feedback-panel"><p>{result.total > 0 ? "No tickets on this page." : filtered ? "No tickets match these filters." : "No tickets in the queue."}</p>{result.page > 1 && <button className="secondary-button" onClick={() => setQuery(old => ({ ...old, page: 1 }))}>Go to first page</button>}</div> :
      <table className="queue-table"><caption className="visually-hidden">Service desk Ticket Queue</caption><thead><tr>{["Ticket Number / Summary", "Requester", "Requested Priority", "IT Priority", "Status", "Owner", "Updated", "Open"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{result.items.map(ticket => <tr key={ticket.id}>
        <td data-label="Ticket Number / Summary"><strong>{ticket.ticketNumber}</strong><p>{ticket.summary}</p></td><td data-label="Requester">{ticket.requester.displayName}</td>
        <td data-label="Requested Priority"><span className={`badge priority-${ticket.requestedPriority.toLowerCase()}`}>{ticket.requestedPriority}</span></td><td data-label="IT Priority"><span className={`badge priority-${ticket.itPriority.toLowerCase()}`}>{ticket.itPriority}</span></td>
        <td data-label="Status"><span className={`badge status-${ticket.status.toLowerCase()}`}>{statusLabel(ticket.status)}</span></td><td data-label="Owner">{ticket.owner?.displayName ?? "Unassigned"}</td><td data-label="Updated">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ticket.updatedAt))}</td>
        <td data-label="Open"><a className="secondary-button" href={`/staff/tickets/${ticket.id}`} aria-label={`Open ${ticket.ticketNumber}`} onClick={e => { e.preventDefault(); onNavigate(`/staff/tickets/${ticket.id}`); }}>Open</a></td>
      </tr>)}</tbody></table>}
      <div className="queue-pagination"><button className="secondary-button" disabled={result.page <= 1} onClick={() => setQuery(old => ({ ...old, page: old.page - 1 }))}>Previous</button><span>Page {result.page} of {result.totalPages}</span><button className="secondary-button" disabled={result.page >= result.totalPages} onClick={() => setQuery(old => ({ ...old, page: old.page + 1 }))}>Next</button>{select("pageSize", "Tickets per page", [["10", "10"], ["20", "20"], ["50", "50"]])}</div>
    </>}
  </section>;
}
