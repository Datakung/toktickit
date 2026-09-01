import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import {
  getCategories,
  getRelatedSystems,
  getTickets,
  isRequesterUnavailable,
  type Category,
  type DevelopmentRequester,
  type RelatedSystem,
  type RequestedPriority,
  type SortDirection,
  type TicketListQuery,
  type TicketListResponse,
  type TicketListSort,
  type TicketStatus,
} from "./api.js";

export const defaultTicketListQuery: TicketListQuery = {
  search: "",
  categoryId: null,
  relatedSystemId: null,
  requestedPriority: null,
  status: null,
  sort: "updatedAt",
  direction: "desc",
  page: 1,
  pageSize: 10,
};

type ListState = "loading" | "ready" | "error";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    calendar: "gregory",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function labelPriority(value: RequestedPriority) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function isDefaultQuery(query: TicketListQuery) {
  return query.search === "" &&
    query.categoryId === null &&
    query.relatedSystemId === null &&
    query.requestedPriority === null &&
    query.status === null &&
    query.sort === "updatedAt" &&
    query.direction === "desc" &&
    query.page === 1 &&
    query.pageSize === 10;
}

export function MyTicketsPage({
  requester,
  onNavigate,
  onRequesterUnavailable,
}: {
  requester: DevelopmentRequester;
  onNavigate: (path: string) => void;
  onRequesterUnavailable: () => void;
}) {
  const [query, setQuery] = useState<TicketListQuery>(defaultTicketListQuery);
  const [searchDraft, setSearchDraft] = useState("");
  const [listState, setListState] = useState<ListState>("loading");
  const [result, setResult] = useState<TicketListResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [referencesUnavailable, setReferencesUnavailable] = useState(false);

  useEffect(() => {
    let current = true;
    Promise.all([getCategories(), getRelatedSystems()])
      .then(([loadedCategories, loadedSystems]) => {
        if (!current) return;
        setCategories(loadedCategories);
        setSystems(loadedSystems);
        setReferencesUnavailable(false);
      })
      .catch(() => {
        if (current) setReferencesUnavailable(true);
      });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    setResult(null);
    setListState("loading");
    getTickets(requester.id, query)
      .then((response) => {
        if (!current) return;
        setResult(response);
        setListState("ready");
      })
      .catch((error) => {
        if (!current) return;
        if (isRequesterUnavailable(error)) {
          onRequesterUnavailable();
          return;
        }
        setResult(null);
        setListState("error");
      });
    return () => { current = false; };
  }, [onRequesterUnavailable, query, requester.id]);

  function updateQuery(update: Partial<TicketListQuery>) {
    setResult(null);
    setListState("loading");
    setQuery((current) => ({ ...current, ...update, page: update.page ?? 1 }));
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    updateQuery({ search: searchDraft.trim() });
  }

  function clearFilters() {
    setSearchDraft("");
    setResult(null);
    setListState("loading");
    setQuery(defaultTicketListQuery);
  }

  function followCreateTicket(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    onNavigate("/tickets/new");
  }

  function followTicket(event: MouseEvent<HTMLAnchorElement>, ticketId: number) {
    event.preventDefault();
    onNavigate(`/tickets/${ticketId}`);
  }

  const hasActiveQuery = !isDefaultQuery(query);
  const totalItems = result?.meta.totalItems ?? 0;

  return (
    <section className="my-tickets-page" aria-labelledby="my-tickets-title">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Requester Ticketing</p>
          <h1 id="my-tickets-title">My Tickets</h1>
          <p className="page-intro">
            Tickets owned by <strong>{requester.displayName}</strong>.
          </p>
        </div>
        <a className="primary-button button-link" href="/tickets/new" onClick={followCreateTicket}>
          Create Ticket
        </a>
      </div>

      <section className="ticket-list-controls" aria-label="Search and filter Tickets">
        <form className="ticket-search" role="search" onSubmit={submitSearch}>
          <label htmlFor="ticket-search">Ticket Number or Summary</label>
          <div>
            <input
              id="ticket-search"
              type="search"
              maxLength={100}
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
            />
            <button className="secondary-button" type="submit">Search</button>
          </div>
        </form>

        {referencesUnavailable && (
          <p className="filter-warning" role="status">
            Category and Related System filters are temporarily unavailable.
          </p>
        )}

        <div className="ticket-filter-grid">
          <label>Category
            <select
              aria-label="Category filter"
              value={query.categoryId ?? ""}
              disabled={referencesUnavailable}
              onChange={(event) => updateQuery({
                categoryId: event.target.value ? Number(event.target.value) : null,
              })}
            >
              <option value="">All Categories</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Related System
            <select
              aria-label="Related System filter"
              value={query.relatedSystemId ?? ""}
              disabled={referencesUnavailable}
              onChange={(event) => updateQuery({
                relatedSystemId: event.target.value ? Number(event.target.value) : null,
              })}
            >
              <option value="">All Related Systems</option>
              {systems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Requested Priority
            <select
              aria-label="Requested Priority filter"
              value={query.requestedPriority ?? ""}
              onChange={(event) => updateQuery({
                requestedPriority: (event.target.value || null) as RequestedPriority | null,
              })}
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
          <label>Status
            <select
              aria-label="Status filter"
              value={query.status ?? ""}
              onChange={(event) => updateQuery({
                status: (event.target.value || null) as TicketStatus | null,
              })}
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
            </select>
          </label>
          <label>Sort by
            <select
              value={query.sort}
              onChange={(event) => updateQuery({ sort: event.target.value as TicketListSort })}
            >
              <option value="updatedAt">Last Updated</option>
              <option value="createdAt">Created Date</option>
              <option value="ticketNumber">Ticket Number</option>
            </select>
          </label>
          <label>Direction
            <select
              value={query.direction}
              onChange={(event) => updateQuery({ direction: event.target.value as SortDirection })}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </div>
        <button className="text-button clear-filters" type="button" onClick={clearFilters}>
          Clear Filters
        </button>
      </section>

      {listState === "loading" && (
        <div className="ticket-list-state" aria-busy="true" aria-live="polite">
          Loading your Tickets…
        </div>
      )}

      {listState === "error" && (
        <div className="feedback-panel feedback-panel-error" role="alert">
          <h2>Your Tickets are unavailable</h2>
          <p>We could not load your Tickets. Try again.</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setQuery((current) => ({ ...current }))}
          >
            Retry
          </button>
        </div>
      )}

      {listState === "ready" && result && result.data.length === 0 && !hasActiveQuery && (
        <div className="ticket-list-state ticket-empty-state" role="status">
          <h2>You have no Tickets yet</h2>
          <p>Create your first Ticket to request help from the IT service desk.</p>
          <a className="primary-button button-link" href="/tickets/new" onClick={followCreateTicket}>
            Create Ticket
          </a>
        </div>
      )}

      {listState === "ready" && result && result.data.length === 0 && hasActiveQuery && (
        <div className="ticket-list-state" role="status">
          <h2>No Tickets match your search</h2>
          <p>Change the search or filters, then try again.</p>
          <button className="secondary-button" type="button" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      )}

      {listState === "ready" && result && result.data.length > 0 && (
        <>
          <p className="ticket-result-summary" aria-live="polite">
            {totalItems} {totalItems === 1 ? "Ticket" : "Tickets"}
          </p>
          <div className="ticket-table-wrap">
            <table className="ticket-table">
              <caption className="visually-hidden">Tickets owned by {requester.displayName}</caption>
              <thead><tr>
                <th>Ticket Number</th><th>Summary</th><th>Category</th><th>Related System</th>
                <th>Requested Priority</th><th>Status</th><th>Last Updated</th>
              </tr></thead>
              <tbody>{result.data.map((ticket) => (
                <tr key={ticket.id}>
                  <td><a href={`/tickets/${ticket.id}`} onClick={(event) => followTicket(event, ticket.id)}>{ticket.ticketNumber}</a></td>
                  <td>{ticket.summary}</td>
                  <td>{ticket.category.name}</td>
                  <td>{ticket.relatedSystem.name}</td>
                  <td><span className={`badge priority-${ticket.requestedPriority.toLowerCase()}`}>
                    {labelPriority(ticket.requestedPriority)}
                  </span></td>
                  <td><span className="badge status-new">New</span></td>
                  <td>{formatDate(ticket.updatedAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>

          <div className="ticket-card-list">
            {result.data.map((ticket) => (
              <article className="ticket-card" key={ticket.id}>
                <div className="ticket-card-heading">
                  <strong>{ticket.ticketNumber}</strong>
                  <span className="badge status-new">New</span>
                </div>
                <h2>{ticket.summary}</h2>
                <dl>
                  <div><dt>Category</dt><dd>{ticket.category.name}</dd></div>
                  <div><dt>Related System</dt><dd>{ticket.relatedSystem.name}</dd></div>
                  <div><dt>Priority</dt><dd><span className={`badge priority-${ticket.requestedPriority.toLowerCase()}`}>{labelPriority(ticket.requestedPriority)}</span></dd></div>
                  <div><dt>Updated</dt><dd>{formatDate(ticket.updatedAt)}</dd></div>
                </dl>
                <a className="secondary-button button-link" href={`/tickets/${ticket.id}`} onClick={(event) => followTicket(event, ticket.id)}>
                  View Ticket {ticket.ticketNumber}
                </a>
              </article>
            ))}
          </div>

          <nav className="ticket-pagination" aria-label="Ticket pages">
            <button
              className="secondary-button"
              type="button"
              disabled={result.meta.page <= 1}
              onClick={() => updateQuery({ page: result.meta.page - 1 })}
            >Previous</button>
            <span>Page {result.meta.page} of {result.meta.totalPages}</span>
            <button
              className="secondary-button"
              type="button"
              disabled={result.meta.page >= result.meta.totalPages}
              onClick={() => updateQuery({ page: result.meta.page + 1 })}
            >Next</button>
            <label>Tickets per page
              <select
                value={query.pageSize}
                onChange={(event) => updateQuery({
                  pageSize: Number(event.target.value) as 10 | 20 | 50,
                })}
              >
                <option value="10">10</option><option value="20">20</option><option value="50">50</option>
              </select>
            </label>
          </nav>
        </>
      )}
    </section>
  );
}
