import { useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, statusLabel, ticketStatuses } from "./api.js";
import { getRequesterDashboard, getStaffDashboard, type DashboardProps, type DashboardTicket, type RequesterDashboardData, type StaffDashboardData } from "./dashboard-api.js";
import { readListSearch } from "./list-url.js";
import { defaultTicketListQuery } from "./MyTicketsPage.js";
import { defaultQueueQuery } from "./StaffTicketQueuePage.js";
import { defaultWorkQuery } from "./StaffActionsPage.js";
export const bangkokTime = (date: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
function permittedLink(href: string) {
  const [path, search = ""] = href.split("?");
  if (path === "/tickets") return !readListSearch(search, defaultTicketListQuery, "requester").error;
  if (path === "/staff/tickets") return !readListSearch(search, defaultQueueQuery, "staff").error;
  if (path === "/staff/actions") return !readListSearch(search, defaultWorkQuery, "actions").error;
  return /^\/(?:staff\/)?tickets\/[1-9]\d*(?:\?tab=actions&actionId=[1-9]\d*)?$/.test(href) || href === "/tickets/new";
}
export function DashboardLink({ href, onNavigate, children, className = "secondary-button", ariaLabel }: { href: string; onNavigate: (path: string) => void; children: ReactNode; className?: string; ariaLabel?: string }) {
  if (!permittedLink(href)) return <span>{children} (link unavailable)</span>;
  return <a className={className} href={href} aria-label={ariaLabel} onClick={e => { if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { e.preventDefault(); onNavigate(href); } }}>{children}</a>;
}
function Dashboard({ user, onNavigate, staff }: DashboardProps & { staff: boolean }) {
  const [data, setData] = useState<RequesterDashboardData | StaffDashboardData | null>(null), [busy, setBusy] = useState(true), [error, setError] = useState<ApiError | null>(null), [refresh, setRefresh] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    let current = true; setBusy(true); setError(null);
    (staff ? getStaffDashboard() : getRequesterDashboard()).then(value => { if (current) setData(value); }).catch(reason => {
      if (!current) return;
      const failure = reason instanceof ApiError ? reason : new ApiError(500, "DASHBOARD_LOAD_FAILED", "The dashboard could not be loaded. Try again.");
      setError(failure); if (failure.status === 401 || failure.status === 403) setData(null);
    }).finally(() => { if (current) setBusy(false); });
    return () => { current = false; };
  }, [staff, refresh]);
  const link = (href: string, text: ReactNode, className?: string, ariaLabel?: string) => <DashboardLink href={href} onNavigate={onNavigate} className={className} ariaLabel={ariaLabel}>{text}</DashboardLink>;
  const card = (label: string, value: number, href: string) => <li key={label}>{link(href, <><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span>View matching work <span aria-hidden="true">→</span></span></>, "metric-card")}</li>;
  const list = (label: string, items: DashboardTicket[], empty: string, href: string) => <section className="dashboard-panel" aria-label={label}><div className="dashboard-section-heading"><h2>{label}</h2>{link(href, "View all", undefined, `View all ${label.toLowerCase()}`)}</div>{items.length ? <ul className="dashboard-list">{items.map(t => <li key={t.id}>{link(`${staff ? "/staff" : ""}/tickets/${t.id}`, <><strong>{t.ticketNumber}</strong><span>{t.summary}</span></>, "dashboard-record-link")}<span className={`badge status-${t.status.toLowerCase()}`}>{statusLabel(t.status)}</span><span>Updated {bangkokTime(t.updatedAt)}</span></li>)}</ul> : <p>{empty}</p>}</section>;
  const requester = data && "activeTickets" in data.metrics ? data as RequesterDashboardData : null;
  const operational = data && "unassignedTickets" in data.metrics ? data as StaffDashboardData : null;
  return <section className={staff ? "dashboard-page dashboard-page-staff" : "dashboard-page"} aria-busy={busy}>
    <div className="page-heading-row"><div><p className="eyebrow">{staff ? "Service desk overview" : "Your service desk"}</p><h1 ref={heading} tabIndex={-1}>{staff ? "Staff Dashboard" : "My Dashboard"}</h1><p className="page-intro">Welcome, <strong>{user.displayName}</strong>.</p></div><button className="secondary-button" disabled={busy} onClick={() => setRefresh(n => n + 1)}>Refresh dashboard</button></div>
    <p className="helper-text">Recent means the last seven days. Times use Bangkok (UTC+07:00). Detail lists are live; refresh this snapshot after changes.</p>
    {busy && <p role="status">{data ? "Refreshing dashboard…" : "Loading dashboard…"}</p>}
    {error && <div className="feedback-panel feedback-panel-error" role="alert"><p>{error.status === 403 ? "Your role cannot open this dashboard." : error.status === 401 ? "Sign in to continue." : "The dashboard could not be refreshed. Try again."}</p>{data && <p>Not refreshed. The last successful snapshot is shown below.</p>}{![401, 403].includes(error.status) && <button className="secondary-button" onClick={() => setRefresh(n => n + 1)}>Retry dashboard</button>}</div>}
    {data && <><p className="dashboard-snapshot">Snapshot: {bangkokTime(data.asOf)}</p>
      {requester && <><ul className="dashboard-metrics">{card("Active Tickets", requester.metrics.activeTickets, requester.drillDown.activeTickets)}{card("Waiting for Me", requester.metrics.waitingForMe, requester.drillDown.waitingForMe)}{card("Updated in Last Seven Days", requester.metrics.recentlyUpdated, requester.drillDown.recentlyUpdated)}{card("Recently Resolved", requester.metrics.recentlyResolved, requester.drillDown.recentlyResolved)}</ul><div className="dashboard-columns">{list("Recent Tickets", requester.recentTickets, "No Tickets updated in the last seven days.", requester.drillDown.recentTickets)}{list("Waiting for Me", requester.attentionTickets, "No Tickets waiting for you.", requester.drillDown.attentionTickets)}</div><div className="dashboard-quick-actions">{link("/tickets/new", "Create Ticket", "primary-button")}{link("/tickets", "My Tickets")}</div></>}
      {operational && <><ul className="dashboard-metrics">{card("Unassigned Active Tickets", operational.metrics.unassignedTickets, operational.drillDown.unassignedTickets)}{card("My Active Tickets", operational.metrics.myTickets, operational.drillDown.myTickets)}{card("My Assigned Actions", operational.metrics.myAssignedActions, operational.drillDown.myAssignedActions)}</ul><section className="dashboard-panel"><h2>Tickets by Status</h2><ul className="dashboard-counts">{ticketStatuses.map(s => <li key={s}>{link(operational.drillDown.statusCounts[s], <><span>{statusLabel(s)}</span><strong>{operational.metrics.statusCounts[s]}</strong></>, "dashboard-count-link")}</li>)}</ul><h2>Active Tickets by IT Priority</h2><ul className="dashboard-counts">{(["LOW", "MEDIUM", "HIGH"] as const).map(p => <li key={p}>{link(operational.drillDown.priorityCounts[p], <><span>{p}</span><strong>{operational.metrics.priorityCounts[p]}</strong></>, "dashboard-count-link")}</li>)}</ul></section><div className="dashboard-columns">{list("Recent Tickets", operational.recentTickets, "No Tickets updated in the last seven days.", operational.drillDown.recentTickets)}<section className="dashboard-panel" aria-label="My Recently Performed Actions"><div className="dashboard-section-heading"><h2>My Recently Performed Actions</h2>{link(operational.drillDown.recentPerformedActions, "View all", undefined, "View all my performed actions")}</div>{operational.recentPerformedActions.length ? <ul className="dashboard-list">{operational.recentPerformedActions.map(a => <li key={a.id}>{link(`/staff/tickets/${a.ticketId}?tab=actions&actionId=${a.id}`, <><strong>{a.ticketNumber} · Action {a.actionNumber}</strong><span>{a.summary}</span></>, "dashboard-record-link")}<span>Completed {bangkokTime(a.performedAt)}</span></li>)}</ul> : <p>No actions performed by you in the last seven days.</p>}</section></div></>}
    </>}
  </section>;
}
export function RequesterDashboard(props: DashboardProps) { return <Dashboard key={`requester:${props.user.id}`} {...props} staff={false}/>; }
export function StaffDashboard(props: DashboardProps) { return <Dashboard key={`staff:${props.user.id}:${props.user.role}`} {...props} staff/>; }
