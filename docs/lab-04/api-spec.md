# Lab 4 API Contract

Status: Contract approved in PR #45 on 2026-10-05. Action endpoints, paged history,
whole-cycle summary and work-list APIs are implemented locally for Issue #40,
with passing unit/API/migration evidence, pending implementation peer review.
Ticket workflow/gate changes and dashboard APIs below remain planned for #42/#43;
the existing Lab 3 Ticket transition handler is unchanged in this increment.
Source of business rules:
[specification.md](specification.md). Inherit the reviewed Lab 3 API contract
from main b3c1a70, preserving session cookies, CSRF, role checks and safe DTOs.

## Shared rules

Base /api; camelCase JSON; positive PostgreSQL integer IDs and positive integer
versions; UTC ISO 8601 output. Write timestamps must include Z or numeric offset.
Reject malformed JSON, unknown keys, repeated/non-scalar queries, invalid enums,
whitespace-only required fields and out-of-range integers. Do not trust submitted
creator, performer, actor, role, cycle or timestamps reserved for the backend.

Errors: `{error:{code,message,fields?}}`. 400 invalid input; 401 invalid session;
403 role/CSRF/mandatory password change; 404 protected missing/non-owned resource;
409 stale version, illegal lifecycle, resolution gate or retry-key reuse;
500 generic failure without database details. Existing file/login codes remain.
Dashboard responses use Cache-Control: no-store. No Internal Notes, hashes,
session digests, local file paths or credentials in any shared action/dashboard DTO.

Writes require normal session, current actor role, matching Origin and X-CSRF-Token.
Read handlers authorize before protected lookups; nested IDs must match their
Ticket. Revalidate current session/actor inside mutation transactions.

## Action data transfer objects

Person = `{id,displayName}`; role-safe actor labels remain even when inactive.
Action = `{id,ticketId,cycle,state,actionAt,description,result,assignee:Person|null,
createdBy:Person,performedBy:Person|null,performedAt:string|null,
followUpRequired,followUpNote,attachmentNotes,cancellationReason:string|null,
version,createdAt,updatedAt}`.

Action fields = `{actionAt,description,result,followUpRequired,followUpNote,
attachmentNotes}`. Limits/conditional validation are BR-05-07. State values:
PLANNED, IN_PROGRESS, COMPLETED, CANCELLED.

Receipt = `{actionId,eventId,actionVersion,ticketVersion,replayed}`. All action
mutations return receipts rather than silently merging an obsolete full Ticket.
Client follows success with authoritative detail/list reads. If the reload fails,
show "Saved; refresh to load the current record" and never recreate the action.

ResolutionGate = `{cycle,completedCount,unfinishedCount,outstandingFollowUpCount,
meetsActionRequirements}`. Counts cover ALL actions in the Ticket's current cycle,
not the returned page: COMPLETED; PLANNED/IN_PROGRESS; and COMPLETED with
followUpRequired=true respectively. meetsActionRequirements is exactly
completedCount>=1 AND unfinishedCount=0 AND outstandingFollowUpCount=0.
This describes the work predicate only, not permission or a legal status edge.

## Action endpoints

Implemented in `server/src/actions/action-routes.ts`, `action-service.ts`,
`action-validation.ts` and `action-record.ts`; mutation account integrity also
integrates with `server/src/admin/user-service.ts`. See [tests.md](tests.md) for
actual test paths/results. All protected action responses use no-store.

| Method/path | Exact input | Success | Access |
|---|---|---|---|
| GET /tickets/:ticketId/actions | page/pageSize | 200 action page + ticketVersion/currentCycle/resolutionGate | Owned Requester, Staff, Admin |
| GET /tickets/:ticketId/actions/:actionId | None | 200 `{action,ticketVersion,currentCycle}` | Same |
| GET /tickets/:ticketId/actions/:actionId/history | page/pageSize | 200 event page | Same |
| POST /staff/tickets/:ticketId/actions | Action fields + assigneeId:null/id, ticketVersion, requestId | 201 Receipt; exact replay 200 | Staff/Admin |
| PATCH /staff/tickets/:ticketId/actions/:actionId | Action fields + version, ticketVersion, requestId, changeReason | 200 Receipt | Staff/Admin |
| PATCH /staff/tickets/:ticketId/actions/:actionId/assignee | `{assigneeId:null/id,version,ticketVersion,requestId}` | 200 Receipt | Staff/Admin |
| PATCH /staff/tickets/:ticketId/actions/:actionId/state | `{state,result,cancellationReason,version,ticketVersion,requestId}` | 200 Receipt | Staff/Admin |
| GET /staff/actions | Work-list query below | 200 action summary page | Staff/Admin |
| GET /staff/action-assignees | None | 200 `{items:[{id,displayName,role}]}` | Staff/Admin |

Field edit is a full field-set update; no omitted ambiguous fields. changeReason
is a string, blank allowed only on PLANNED/IN_PROGRESS edits. State transition
requires result string (nonblank for COMPLETED), cancellationReason string
(nonblank only for CANCELLED, blank otherwise); every transition preserves all
other fields. No same-state transition. Automatic actor facts are never accepted.
Active eligible assignees order by displayName then ID; history can display users
no longer in that list. A self-assignment shortcut selects current actor normally.

Creation accepts initial assigneeId atomically with the Action fields. After
creation, field edit and assignment are independently submitted operations, never
a combined save or automatic two-request chain. Field PATCH rejects assigneeId;
assignment PATCH rejects Action fields. The UI provides separate "Save action"
and "Save assignment" controls with explicit scope. Each confirmed operation
has its own requestId and expected parent/child versions, receipt and audit event.

After any successful operation, reload the action and parent state before enabling
another mutation; use the newly observed versions, not guessed increments. If
reload fails, keep "Saved; refresh" and disable further mutations until refreshed.
If the author then separately submits assignment and it fails, the earlier field
save remains committed: report "Action changes saved; assignment not saved" and
retain the assignment draft. Cancelling the assignment draft does not undo that earlier save.
An uncertain assignment response is "Action changes saved; assignment outcome
unknown": block further mutations until the original assignment payload/requestId
is reconciled by exact replay and authoritative reload. Never repeat the field
save or issue a replacement assignment key to compensate for that uncertainty.

All pages: `{items,page,pageSize,total,totalPages}`; page>=1, pageSize=10/20/50,
default 20; totalPages>=1 and beyond-last page has no items. Actions order by
createdAt ascending then id ascending, even after edits. Histories order identically.
Action list returns currentCycle/ticketVersion/resolutionGate from one read-only
repeatable-read snapshot containing the parent, page, total and whole-cycle counts.
resolutionGate.cycle equals currentCycle on every page, including empty/beyond-last
pages. Prior-cycle work is readable in the list but excluded from these counts.
No query permits caller-supplied counts/cycle overrides. Apply owned/role access
before returning any summary; no unrelated Notes or data enter it.

Action event: `{id,actionId,kind,actor:Person,createdAt,version,reason:null|string,
before:SafeActionSnapshot|null,after:SafeActionSnapshot}`. SafeActionSnapshot is
the Action field/state/assignee/performer/cycle values, never unrelated Ticket
description, Notes or account credentials. Event kinds: CREATED, EDITED, ASSIGNED,
STARTED, COMPLETED, CANCELLED, ASSIGNEE_REMOVED. No PATCH/DELETE history endpoint.

Work-list query permits assignedTo=me, performedBy=me, stateGroup=active or state
(mutually exclusive), performedSince/performedUntil pair, page/pageSize. The "me"
values derive IDs server-side; other identity values are rejected. With stateGroup
active, restrict to current-cycle PLANNED/IN_PROGRESS on active Tickets. This
current-cycle restriction applies to active assigned work. Completed historical performed entries remain
available by performedBy even after reopening; do not silently add current-cycle
restriction to that query. Reject combining assignedTo and performedBy.

Work summary = `{id,ticketId,ticketNumber,summary:description,cycle,state,
assignee,performedBy,performedAt,ticketStatus,version}`; description summary is
bounded to 120 characters; list ordered updatedAt/id descending, or performedAt/id
descending when performedBy is supplied. A performed date range requires performedBy.

### Action error precedence and replay

Authenticate/authorize first; parse/validate payload and nested resources; take
account -> Ticket -> Action locks and revalidate session. Check an existing receipt
for this actor/Ticket/requestId: identical normalized method/path/body returns the
original receipt (replayed=true) without reevaluating old versions; mismatch is
409 REQUEST_ID_REUSED. An exact replay remains possible after the Ticket becomes
terminal because no new mutation is performed. Otherwise check Ticket version,
then Action version, then Ticket/cycle/action eligibility and proposed assignee.

New stale writes: 409 VERSION_CONFLICT. Locked Ticket: 409 TICKET_TERMINAL;
prior cycle: 409 ACTION_PRIOR_CYCLE; invalid transition: 409 ACTION_TRANSITION_NOT_ALLOWED;
locked action edit/assignment: 409 ACTION_READ_ONLY. Invalid target: 400 INVALID_ASSIGNEE
with assigneeId field feedback. State/result/follow-up validation returns 400
VALIDATION_ERROR. Write/action/event/receipt/parent-version changes commit together.

requestId is a valid UUID generated once per intended operation. Keep it across
an uncertain network retry. Do not silently mint another key after an unknown
outcome. Explicit reload/review and a genuinely new operation use a new key.
Unknown outcomes retain the exact submitted payload with its key; an edited draft
cannot replace that payload during retry. Complete/reconcile the original operation
first, then save a new change using fresh observed versions and a new requestId.
Receipts belong to their authenticated actor: another user cannot replay or obtain
the first user's result just by supplying the same UUID. Revoked/inactive/role-changed
actors fail current access checks even for an otherwise matching stored receipt.

## Ticket workflow extension

Existing PATCH /staff/tickets/:id/status remains `{status,version}` and returns
the updated StaffTicket with additive `{resolutionCycle,resolvedAt}` fields.
Same-state/forbidden edges remain 409 INVALID_STATUS_TRANSITION. Stale version
takes precedence over current gate evaluation. Resolve failure uses 409
RESOLUTION_GATE_NOT_MET with a safe message explaining missing completed work,
unfinished work or outstanding follow-up. Cancellation with active current-cycle
actions uses 409 ACTIVE_ACTIONS_REMAIN. No bypass parameter or Requester exception.

GET /tickets/:ticketId/workflow-history uses page/pageSize and returns an event
page to owned Requesters/Staff/Admin. Event = `{id,fromStatus,toStatus,cycle,
ticketVersion,actor:Person,createdAt}`. No update/delete APIs. Legacy records have
an explicit empty history, not invented transition events. Reopening/resolution/
version/history updates commit atomically under the Ticket lock.

Requester indication and existing operational routes keep Lab 3 input/response
contracts. No new user, Attachment, Comment or Note permissions are introduced.

## Dashboard endpoints and exact response envelopes

| Method/path | Query | Success/access |
|---|---|---|
| GET /dashboard/requester | None | 200 RequesterDashboard; Requester only |
| GET /dashboard/staff | None | 200 StaffDashboard; Staff/Admin |

RequesterDashboard = `{asOf,recentFrom,metrics:{activeTickets,waitingForMe,
recentlyUpdated,recentlyResolved},recentTickets:DashboardTicket[],
attentionTickets:DashboardTicket[],drillDown:RequesterDrillDown}`.

StaffDashboard = `{asOf,recentFrom,metrics:{unassignedTickets,myTickets,
myAssignedActions,statusCounts:{NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,
RESOLVED,CLOSED,REOPENED,CANCELLED},priorityCounts:{LOW,MEDIUM,HIGH}},
recentTickets:DashboardTicket[],recentPerformedActions:DashboardAction[],
drillDown:StaffDrillDown}`.

DashboardTicket = `{id,ticketNumber,summary,status,itPriority,owner:Person|null,
updatedAt}`; summary <=120 characters. DashboardAction = `{id,ticketId,
ticketNumber,summary,state,performedAt}` with action summary <=120 characters.
Each array <=5. Metrics use the specification's exact predicates. Each drillDown
property is a same-origin relative route matching its metric/list; statusCounts
and priorityCounts drill-downs map each enum value to its filtered route. The
client handles only known application routes and validated query keys.

No requesterId/userId query override; reject all query keys for these endpoints.
Counts and arrays use one repeatable-read snapshot and one server asOf instant.
Recent range is inclusive UTC [recentFrom,asOf]. Empty data returns 200 with all
expected zero count keys and arrays empty, not 404. Refresh starts a fresh snapshot.
An error is never converted into a success response filled with zero counts.
Detail/drill-down reads are live; after intervening writes their totals may differ
from an older snapshot. Counts and drill-down match exactly when the fixture/state
is unchanged; captured range endpoints are retained in either case.

## Additive drill-down query contract

Existing GET /tickets and GET /staff/tickets keep existing search/filter/default
pagination/sort envelopes. Add statusGroup=active (mutually exclusive with status),
updatedSince/updatedUntil and resolvedSince/resolvedUntil. Each date pair requires
both values, valid offset/Z ISO instants and since<=until. Apply inclusive range;
resolved range requires status=RESOLVED and excludes null resolvedAt.
All filters combine with AND and ownership/role constraints remain server-enforced.

Client list routes accept their corresponding existing API query names, plus
these additive keys. App routing must retain pathname AND search. Hydrate filter
controls from URL on entry/reload/popstate and keep the URL current on filter/page
changes. Invalid URLs show safe field feedback without rendering unfiltered data
as though the metric matched. /staff/actions also hydrates its work-list query.
Detail actionId/tab query selects and focuses the matching readable action.
