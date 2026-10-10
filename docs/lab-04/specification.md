# Lab 4 Sprint Engineering Specification

Status: Contract approved before implementation in PR #45 (ff97405; merge
d32c8cf). Issue #40 was peer-approved/merged in PR #46 (a915812). Phanuwit
approved corrected Issue #41 head 0cf9e58 in PR #47 on 2026-10-07 and merged it
into lab4-staging as f4da089; Issue #41 is closed. See [reviewer.md](reviewer.md)
for exact review links and independent-test limits.

Issue #42 was approved at b7f6bb9 and merged in PR #48 as 00fddc1 on 2026-10-09.
Issue #43 was peer-approved at 6dce864 and merged in PR #49 as 4660ac6 on 2026-10-10.
It implements read-only repeatable-read snapshots, bounded summaries, current-user
work and exact URL drill-downs. Existing defaults/envelopes remain unchanged.
The full 11-page supplied Lab 4 sheet was reread on 2026-10-10, including dashboard
mockups and the ownership/query/feedback/three-width requirements. Illustrative
mockup controls do not override the approved role rules (no Staff Create Ticket).
[tests.md](tests.md) records actual checks. Issue #43 is author-accepted and
peer-merged; Issue #44 quality review and final release remain pending.
Feature passes are not final-main acceptance.

## 1. Sprint goal

Complete TokTickIT with accountable Actions Taken, a backend-enforced final
Ticket lifecycle and role-specific dashboards while preserving the authenticated
service desk delivered in Labs 1-3.

## 2. Stakeholder request

Staff need to record actual work independently of the primary Ticket Owner,
track follow-up and formally resolve reviewed work. Requesters need an owned
summary and readable action history. Dashboards must connect to detailed screens,
and the completed product must remain consistent, accessible and dependable.

## 3. Scope

Included: Actions Taken records/assignment/lifecycle/audit; final Ticket gate and
history; Requester and Staff/Admin dashboards; preserving migrations and seed;
concurrency/retry safety; responsive UI; regression and final-main evidence.

Excluded: SLA clocks/escalations, external notifications, inventory/purchasing,
cost accounting/billing/payroll, multi-level approvals/signatures, advanced BI or
report exports, multi-tenancy/production cloud operations, new action file uploads
and optional Admin account metrics. Attachment Notes reference existing Ticket
files in plain text; they do not grant Staff upload/removal permission.

## 4. Functional requirements

| ID | Requirement | Issue |
|---|---|---|
| FR-01 | Preserve all earlier records and authorization through an additive migration, repeatable seed and tested recovery approach. | #40 |
| FR-02 | Provide paged multiple Actions Taken under each accessible Ticket with all required fields and backend actor identity. | #40, #41 |
| FR-03 | Staff/Admin can create/edit/assign/start/complete/cancel eligible actions; Requester reads owned actions only. | #40, #41 |
| FR-04 | Reject invalid fields, ineligible assignees, stale/duplicate writes and forbidden operations without partial updates. | #40, #41 |
| FR-05 | Retain append-only action revisions and Ticket transitions in stable paged order with role-safe visibility. | #40, #42 |
| FR-06 | Enforce the final eight-status matrix and current-cycle resolution/cancellation guards on the backend. | #42 |
| FR-07 | Keep Requester resolution indication advisory and start a fresh work cycle on reopening. | #42 |
| FR-08 | Compute concise owned Requester dashboard metrics and bounded recent/attention lists. | #43 |
| FR-09 | Compute Staff/Admin operational metrics, current-user actions and bounded recent Tickets. | #43 |
| FR-10 | Supply exact URL-driven drill-down, refresh and role-specific Dashboard navigation. | #43 |
| FR-11 | Preserve all earlier auth, accounts, Tickets, files, Comments and private Notes with safe consistent feedback. | #40-44 |
| FR-12 | Verify Zen Green, keyboard/accessibility, three widths, bounded-query performance and final-main release evidence. | #41-44 |

## 5. Business rules and authorization

Normal access requires an active session, active user and completed initial
password change. Existing CSRF/session/credential policies remain authoritative.

| Capability | Requester | IT Staff | Administrator |
|---|---|---|---|
| Own Requester dashboard | Own Tickets | No | No |
| Staff dashboard/queue/detail | No | All Tickets | All Tickets |
| Action read and shared action history | Own Tickets | All Tickets | All Tickets |
| Action create/edit/assign/status | No | All eligible Tickets/actions | Same as Staff |
| Ticket transition/history | Owned read-only history | Read/write | Read/write |
| Requester resolution indication | Own eligible Tickets | No | No |
| Public Comments | Existing owned permission | Existing permission | Existing permission |
| Internal Notes | No | Read/post | Read/post |
| Attachment mutations | Existing owned permission | No | No |
| User management | No | No | Existing Admin permission |

- BR-01: Every action belongs to exactly one existing Ticket. No action relocation
  or hard deletion. Different Staff can work under the same Ticket Owner.
- BR-02: Action states are PLANNED, IN_PROGRESS, COMPLETED and CANCELLED. Create
  starts PLANNED; transitions are PLANNED -> IN_PROGRESS/COMPLETED/CANCELLED and
  IN_PROGRESS -> COMPLETED/CANCELLED. No backwards/same-state transition.
- BR-03: createdBy and createdAt are server-generated. performedBy and performedAt
  are null before completion and set to the authenticated completing actor and
  server time on completion. The optional assignee is independent; Staff/Admin
  can record work they actually performed even if assigned to someone else.
- BR-04: assigneeId is null or an active IT_STAFF/ADMINISTRATOR; null means
  Unassigned. No requester/inactive target. Assignment of completed/cancelled work
  is locked. Account deactivation/change to REQUESTER unassigns PLANNED/IN_PROGRESS
  actions transactionally with audit events; completed historical attribution remains.
- BR-05: actionAt is an explicit ISO 8601 instant with Z/offset, defaults to now
  in the form, cannot precede Ticket creation or exceed server now by more than
  five minutes. createdAt/updatedAt/performer timestamps are separate server facts.
  UTC is stored; Asia/Bangkok is the labeled UI display/input zone.
- BR-06: description trims to 1-4000 characters; result trims to 0-4000 but
  completion requires nonblank result. followUpRequired is a boolean; true requires
  a 1-2000 character followUpNote. Optional attachmentNotes trims to 0-2000.
  Plain-text rendering only. Clearing a true follow-up requires an explanatory
  nonblank followUpNote retained in the edit/audit; do not silently erase it.
- BR-07: PLANNED/IN_PROGRESS allow field edits. COMPLETED allows corrections to
  actionAt/description/result/follow-up/attachmentNotes only while its Ticket/cycle
  is active; each correction requires a 1-500 character changeReason. Completed
  result stays nonblank and performer/assignee/state stay immutable. CANCELLED is
  read-only; cancellation requires a 1-500 character cancellationReason.
- BR-08: RESOLVED/CLOSED/CANCELLED Tickets reject action mutations. Only actions
  in the Ticket's current resolutionCycle can be changed; prior cycles stay readable.
  Automatic unassignment is an account-integrity exception even for legacy terminal
  records; it does not change Ticket status or erase actor history.
- BR-09: Writes check expected Ticket version and, for existing actions, expected
  Action version inside the transaction. Successful action writes increment both
  versions/updatedAt once and append one immutable event. Lock account changes,
  then Ticket, then Action; recheck actor/session and assignment eligibility there.
  Multi-Ticket account unassignment locks Tickets/actions in ascending ID order;
  each affected action receives one version/event change and each affected Ticket
  receives one parent version/timestamp change in that account transaction.
  Creation includes initial assignment atomically; existing field edits and
  assignment use separate explicitly submitted saves, never an automatic chain.
  Each save is atomic on its own, not across multiple user operations. Reload
  observed versions after success before enabling another mutation. A later
  failed/uncertain assignment cannot undo or repeat the earlier successful edit;
  preserve its draft and reconcile uncertainty using that operation's original key.
- BR-10: Every new action mutation carries a UUID requestId. Store a durable
  receipt keyed by Ticket/actor/requestId with normalized operation/payload hash.
  Authorized exact replay returns the original receipt without another write;
  mismatched reuse returns 409 REQUEST_ID_REUSED. Check replay before stale version,
  but only after current authorization/resource access. No automatic retry with a
  newer version. Client reloads authoritative state after a successful receipt.
- BR-11: Action events are append-only and preserve operation, actor, server time,
  reason and safe before/after values. Ticket events preserve transition and cycle.
  No public edit/delete API for either history; API transactions insert them with
  mutations. Order histories by createdAt ascending then id ascending. Restrictive
  foreign keys retain attribution. Do not put Internal Notes into shared history.
- BR-12: Ticket statuses and allowed edges follow the matrix below. All transitions
  remain Staff/Admin-only; Requester indication never changes formal status.
- BR-13: Entering RESOLVED requires at least one COMPLETED action in the current
  cycle, zero PLANNED/IN_PROGRESS actions in that cycle, and zero COMPLETED actions
  with followUpRequired=true in that cycle. CANCELLED actions never count as completed
  work. Check the predicate atomically while holding the parent Ticket lock.
  Action-list reads return an authoritative whole-current-cycle resolutionGate
  summary with parent version/cycle, page and counts in one repeatable-read
  snapshot. The UI evaluates this summary, not just loaded actions; blockers on
  later pages still count. Unknown/stale/mismatched summaries do not display ready
  or enable Resolve. A matching summary does not replace write-time gate checks.
- BR-14: Entering CANCELLED requires no PLANNED/IN_PROGRESS current-cycle actions;
  users must explicitly complete/cancel those actions first. No completed-action
  requirement for Ticket cancellation. Confirm resolution/closure/cancellation in UI.
- BR-15: Reopening increments resolutionCycle, clears requesterResolutionIndicatedAt
  and resolvedAt, and appends a transition event. Old actions cannot satisfy the new
  cycle gate. New successful resolution records resolvedAt=server now.
- BR-16: Legacy Tickets start resolutionCycle=1, with no invented Actions Taken or
  audit events. Legacy RESOLVED -> CLOSED remains possible without retroactive work;
  any future transition into RESOLVED must meet BR-13, including a reopened Ticket.
  Legacy resolvedAt stays null because updatedAt does not prove the resolution time.
- BR-17: Dashboard metrics come only from backend database queries in a read-only
  repeatable-read transaction with one asOf instant. Return nonnegative integer
  counts, explicit zeroes and empty arrays; never infer counts from paged client lists.
- BR-18: Dashboard active Tickets are exactly NEW, OPEN, IN_PROGRESS,
  WAITING_FOR_REQUESTER and REOPENED. Recent means [asOf minus 7*24 hours, asOf]
  inclusive in UTC; UI labels this as the last seven days, not calendar weeks.
- BR-19: Owned queries always include authenticated requesterId. Staff current-user
  queries derive actor ID from session. Never accept a dashboard identity parameter.
- BR-20: Each count links to an equivalent validated list filter. Recent lists have
  at most five entries. Ticket lists order by updatedAt/id descending; performed
  action lists order by performedAt/id descending. Links use captured time boundaries
  so a later load does not silently redefine the dashboard range. Lists read live
  data: intervening writes may change their count relative to a prior snapshot;
  show snapshot time and offer dashboard refresh rather than promise frozen records.
- BR-21: Authentication loss returns to login; forbidden/protected-not-found/conflict
  states remain distinct without protected details. Generic failures contain no SQL,
  stack, secret or file path. Preserve non-password fields on recoverable failures.
- BR-22: Routine tests use guarded test/E2E databases and isolated uploads. Preserve
  development hashes before/after E2E; intentional screenshot capture is separate.

### Final Ticket transition matrix

| From | Allowed destinations | Additional gate |
|---|---|---|
| NEW | OPEN, CANCELLED | Cancel: BR-14 |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED | Resolve: BR-13; Cancel: BR-14 |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED | Same |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED | Same |
| RESOLVED | CLOSED, REOPENED | Reopen: BR-15; legacy close: BR-16 |
| CLOSED | REOPENED | BR-15 |
| REOPENED | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED | Resolve: BR-13; Cancel: BR-14 |
| CANCELLED | None | Terminal |

All other edges fail. Existing claim/owner/priority guards, comments/notes and
Requester indication policies from Lab 3 remain unless explicitly extended above.

### Dashboard calculations

All Ticket metrics apply the row's current state. Refresh obtains a new snapshot.

| Dashboard value | Exact predicate | Drill-down |
|---|---|---|
| Requester activeTickets | Owned AND status in active set | /tickets?statusGroup=active |
| Requester waitingForMe | Owned AND status=WAITING_FOR_REQUESTER | /tickets?status=WAITING_FOR_REQUESTER |
| Requester recentlyUpdated | Owned AND updatedAt in recent range | /tickets?updatedSince=...&updatedUntil=... |
| Requester recentlyResolved | Owned AND status=RESOLVED AND nonnull resolvedAt in range | /tickets?status=RESOLVED&resolvedSince=...&resolvedUntil=... |
| Requester recentTickets | Five most recently updated owned Tickets in range | Each /tickets/:id; View all uses updated range |
| Requester attentionTickets | Five latest owned WAITING_FOR_REQUESTER Tickets | Each detail; View all uses exact status |
| Staff unassignedTickets | Active AND ownerId=null | /staff/tickets?statusGroup=active&unassigned=true |
| Staff myTickets | Active AND ownerId=current actor | /staff/tickets?statusGroup=active&ownerId=currentId |
| Staff statusCounts | Group all accessible Tickets by all eight statuses, including zeroes | /staff/tickets?status=ENUM |
| Staff priorityCounts | Active Tickets grouped by IT Priority LOW/MEDIUM/HIGH | /staff/tickets?statusGroup=active&itPriority=ENUM |
| Staff myAssignedActions | Current-cycle PLANNED/IN_PROGRESS actions assigned to actor on active Tickets | /staff/actions?assignedTo=me&stateGroup=active |
| Staff recentPerformedActions | Five COMPLETED actions performed by actor with performedAt in range | Each /staff/tickets/:id?tab=actions&actionId=:actionId; View all uses /staff/actions?performedBy=me&state=COMPLETED&performedSince=...&performedUntil=... |
| Staff recentTickets | Five latest updated accessible Tickets in range | Each Staff detail; View all uses updated range |

Legacy unknown resolution dates are counted in current-state totals but excluded
from recentlyResolved. Explain this once in setup/data notes; never fabricate dates.
Actions changes update Ticket updatedAt. Existing Comments/Notes retain their Lab 3
timestamp behavior; the metric does not promise a latest-communication timestamp.

## 6. UI summary

See [ui-spec.md](ui-spec.md). Add /dashboard for Requester and /staff/dashboard
for Staff/Admin; role homes/brand destinations use dashboards. Preserve all
existing destinations and password-change routes. Shared Actions Taken lives on
both Ticket detail variants; Internal Notes stay Staff-only. Dashboard links must
hydrate URL filters after navigation/reload/Back, not just show filtered labels.

## 7. Data, migration and seed

Author-approved numbering refinement (2026-10-10): display a one-based
`actionNumber` within each Ticket rather than exposing the global ID as its
work sequence. The backend derives this ordinal in immutable creation order
(`createdAt` ascending, `id` tie-break) across ALL of the Ticket's actions,
including cancelled work and prior cycles. Pagination and assigned/performed
filters do not reset it; reopening continues it. Do not derive the number from
a dashboard/work-list row index. The global `id` still identifies writes,
receipts, deep links and audit events. Existing records automatically receive
the Ticket-local display number on read; no schema migration, stored ID rewrite,
historical snapshot edit or new database index is needed for this refinement.

ActionTaken foundation: id, ticketId, cycle, state, actionAt, description, result,
assigneeId?, createdById, performedById?, performedAt?, followUpRequired,
followUpNote, attachmentNotes, cancellationReason?, version=1, createdAt, updatedAt.
Use restrictive Ticket/User relations and bounded database string columns.
Database check constraints protect positive versions/cycles, conditional follow-up
notes, COMPLETED nonblank result/performer/time and CANCELLED reason. Validate the
time-against-now rule in the service rather than a nonimmutable database check.

ActionTakenEvent: id, actionId, ticketId, actorId, kind, version, reason?,
before/after JSON snapshots of safe action values, createdAt. Unique (actionId,version).
ActionWriteReceipt: ticketId, actorId, requestId UUID, operation, payloadHash,
actionId, eventId, actionVersion, ticketVersion; unique (ticketId,actorId,requestId).
TicketTransitionEvent: id, ticketId, actorId, fromStatus, toStatus, cycle,
ticketVersion, createdAt; unique (ticketId,ticketVersion).
Ticket adds resolutionCycle=1 and nullable resolvedAt.

Use Int for IDs/versions/cycles, Boolean for followUpRequired, the documented
TicketStatus/ActionState enums, UUID for requestId, timestamptz(3) for new instants,
and JSONB for safe event snapshots. description/result use varchar(4000),
followUpNote/attachmentNotes varchar(2000), reasons varchar(500), and payloadHash
varchar(64). Before/after snapshot relationships must identify the same action and
Ticket; receipts reference that action/event. Do not change legacy timestamp types
as a side effect of this increment. A completed performer cannot be reassigned by
an edit, even when their account is later inactive or renamed.

Indexes: actions (ticketId,cycle,createdAt,id), (assigneeId,state),
(performedById,performedAt,id); events (ticketId,createdAt,id),
(actionId,createdAt,id); Ticket (status,itPriority), (requesterId,resolvedAt),
and (updatedAt,id) alongside preserved owner/requester indexes.

Database decisions: (1) separate current rows and immutable events reconcile
editable forms with auditable append-only evidence; (2) parent-lock/version/cycle
checks serialize cross-record resolution and prevent old work satisfying reopened
problems; (3) nullable legacy resolvedAt avoids presenting update time as resolution
time; (4) durable receipts address a lost response after a committed create.

Migration preflight snapshots schema, counts, IDs/relations, timestamps and local
digests without printing credentials. Add tables/defaults/indexes without dropping
earlier tables or rewriting historical ownership. Test migration from a populated
Lab 3 schema, reference integrity and failure rollback in an isolated database.

Recovery: back up development before an author-run deployment. Prove restoration
of a pre-migration backup into a separate disposable database and compare records/
relations. Prefer a tested forward corrective migration; never run reset/down-migration
against development. Document exact recovery commands and observed results during
implementation; planning alone is not passing recovery evidence.

Seed uses deterministic unique fixture keys and create-only upserts. Re-running
must not reset edited users/passwords/Tickets/actions or append duplicate events.
Cover all Ticket statuses/priorities, assigned/unassigned work, zero/one/multiple
actions, different Staff actors, follow-up, completed/cancelled work, and a Requester
with zero Tickets. Do not rewrite existing fixtures merely to satisfy the gate.

## 8. API summary

See [api-spec.md](api-spec.md) for exact requests, receipts, lists, queries and
error precedence. Retain all existing endpoints and security; additive list
filters enable dashboard links without changing existing defaults/envelopes.

Issue #44 hardening changes compatible upload/proxy dependency versions and
upgrades vulnerable test tooling. It does not change the schema, action numbering,
authorization, business rules or development records. Its reproducible isolated
gate retains all per-case results and distinguishes release-candidate checks from
the required clean-main rerun. Final peer release/PDF acceptance remain pending.

## 9. Acceptance criteria

| ID | Observable acceptance criterion |
|---|---|
| AC-01 | Migration/recovery and repeated seeds preserve earlier IDs, relationships, timestamps, credentials and edits. |
| AC-02 | Multiple actions save under the correct Ticket with backend creator/performer, required fields and independent assignment. Display numbering starts at 1 per Ticket, continues across pages/cycles and agrees in detail/work/dashboard views without changing internal IDs. |
| AC-03 | Staff/Admin create/edit/assign/start/complete/cancel only eligible work with field feedback and explicit terminal guards. |
| AC-04 | Requester reads own actions/history only and cannot mutate actions or access Notes; anonymous/forced-change users are blocked. |
| AC-05 | Inactive/Requester assignees are rejected; account changes preserve history and unassign active work safely. |
| AC-06 | Stale/competing/duplicate writes have deterministic outcomes with no partial mutation within an operation, duplicate record/event or silent overwrite; independent field/assignment saves truthfully retain earlier success and reconcile later failure/uncertainty. |
| AC-07 | Action revisions and Ticket transitions are append-only, readable past one page and stably ordered with safe visibility. |
| AC-08 | Every Ticket matrix edge and resolution/cancellation gate is enforced through direct API requests and explanatory UI; evaluated checklist uses a version-consistent whole-cycle backend summary, including later-page blockers. |
| AC-09 | Requester indication remains advisory; reopen clears indication, advances cycle and requires new completed work; legacy terminal records remain usable. |
| AC-10 | Requester metrics/lists match exact owned database predicates, boundaries and zero states without cross-owner leakage. |
| AC-11 | Staff/Admin metrics/current-user actions match predicates, contain bounded lists and return a consistent snapshot. |
| AC-12 | Every dashboard link reaches matching filtered data, survives reload/Back and uses captured time ranges. |
| AC-13 | Loading/validation/success/empty/forbidden/not-found/conflict/failure/retry preserve appropriate state and prevent late-response overwrite. |
| AC-14 | Auth, all Requester flows, files, Comments, Notes, Staff functions and Administrator management retain approved regression behavior. |
| AC-15 | Major screens are usable at 1440/768/390px with keyboard/focus, readable cues, long text and no clipping/overlap/page overflow. |
| AC-16 | Dashboard local smoke meets documented payload/query/latency bounds and all required isolated final-main checks pass with development unchanged. |

Every AC maps to planned tests in [tests.md](tests.md).

## 10. Product Definition of Done

- [x] Engineering contract peer-approved before product implementation (PR #45).
- [ ] Every AC has passing executable evidence; no required skipped tests.
- [ ] Migration, preservation, repeatable seed and actual isolated recovery verified.
- [ ] Role/ownership, current-session, CSRF, inactive assignment, versions, retry and
  resolution race protection enforced directly by backend tests.
- [ ] Complete action/Ticket lifecycle, immutable history and legacy compatibility work.
- [ ] Dashboard metrics match independent queries and drill-downs match counts.
- [ ] Earlier functionality regressed; full tests/builds pass and production audits reviewed.
- [ ] Isolated E2E confirms unchanged development database/uploads.
- [ ] Final-main screenshots and accurate responsive/accessibility checklist inspected.
- [ ] Runtime console errors, broken navigation, temporary placeholder content and
  unfinished controls audited; setup/migration/seed/test/demo instructions verified.
- [ ] README and six Lab 4 docs contain real paths/results/review links/provenance.
- [ ] Phanuwit approves/merges features into lab4-staging and release into main;
  final main rerun completes and all Issues reach Done after acceptance.
- [ ] One readable linked PDF includes Answer Part 1-9 and author-reviewed reflection.

## 11. Reviewed assumptions and engineering decisions

The sheet's detailed field list does not fully specify action assignment/state,
completion/cancellation or the resolution predicate, but its grading rubric asks
for them. This contract proposes BR-02-16 to cover those requirements explicitly.
It interprets append-only as immutable action revision/transition history, not a
ban on the requested action edit UI. Assignee and actual performer are separate.

Follow-up may be cleared by a reasoned correction to a completed action while the
Ticket is active; terminal Tickets and prior cycles remain immutable. Recovery
does not invent legacy work. Administrator reuses Staff metrics. The seven-day
window uses UTC instants and Bangkok presentation. These are project-specific choices
accepted in the engineering-contract review; do not claim the handout fixed them.

## 12. Author-requested creation refinement, 2026-10-09

Within local Issue #42, creation now redirects to the saved Ticket Detail after
all selected initial uploads succeed. An attachment failure shows failure rather
than creation success and keeps the form open. Because Ticket creation precedes
the independent uploads, explain that the Ticket is saved and provide a retry
link; do not claim rollback, delete the Ticket or repeat creation. This is an
author-requested navigation refinement, not a newly inferred handout requirement
or a change to the backend workflow/ownership rules.

The subsequent author-requested status refinement separates the saved current
status from an explicit proposed transition. It removes automatic next-status
preselection, not any legal transition. All eight states retain exactly the
approved matrix, current Open remains visible after saving, and only a successful
save updates the displayed confirmed status. Gates, versions and permissions do
not change.

The author's later clarification separates New-ticket opening from progress
updates into two panels. Open/Cancel belong to the initial stage; after a confirmed
open, progress status choices appear in a separate stage. This changes presentation
only, not BR transition permissions, action creation/assignment rules or the
resolution/cancellation gates. A directly cancelled New Ticket is not represented
as having been opened.

The author also requested stronger checklist/Action heading hierarchy, red/green
labelled requirement rows, and view-first action details with explicit Edit action.
These are client-only presentation choices: saved details/audit remain readable,
while existing mutation/confirmation/gate/recovery rules still apply after opening
the editor. Closing discards only unsaved local input, not confirmed work.

The author approved a readable audit view: initial values for creation, changed
business fields only for later revisions and collapsed original Technical details.
This changes presentation only; immutable snapshots, recorded actor/reason/time,
chronological ordering and ownership restrictions remain intact. Account names
are not invented where the snapshot/actor response provides only an ID.

The author then approved separating Action progress from field editing. Start,
Complete and Cancel are independent operations available directly in the eligible
saved-detail view; Edit action is not a business-rule prerequisite for completion.
Existing confirmations, required completion Result/cancellation reason, versions,
retry keys, actor attribution and role/cycle/terminal restrictions are unchanged.
State-only recovery does not open an unrelated field editor. This corrects the
earlier presentation grouping, not the approved backend workflow.
