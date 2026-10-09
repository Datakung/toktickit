# Lab 4 UI Specification

Status: Approved contract and peer-accepted foundations/Action UI in PRs #45-47.
Issue #42 adds the current-cycle checklist, allowed status destinations,
cancellation guidance, reopen labels and paged read-only transition history.
Counts come from the whole-cycle ActionPage summary and must match the parent's
version/cycle; loading, mixed snapshots and busy/unknown saves never mean ready.
Lost status responses freeze writes until an explicit authoritative reload.
These screens are locally verified, not yet author-accepted or peer-approved.
Dashboard screens (#43) and final-main evidence (#44) remain planned.
Business rules: [specification.md](specification.md); requests: [api-spec.md](api-spec.md).

## Navigation and routes

| Route | Role | Purpose |
|---|---|---|
| /dashboard | Requester | Owned dashboard and role home |
| /staff/dashboard | Staff/Admin | Operational dashboard and role home |
| /staff/actions | Staff/Admin | Paged work list reached from dashboard |
| /tickets, /tickets/new, /tickets/:id | Requester | Existing flows; detail adds read-only Actions/history |
| /staff/tickets, /staff/tickets/:id | Staff/Admin | Existing queue/detail; detail adds Actions/history |
| /admin/users | Admin | Existing account management |
| /login, /change-password | Existing allowed roles | Preserved authentication/account behavior |

Requester navigation: Dashboard, My Tickets, Create Ticket. Staff: Dashboard,
Ticket Queue. Admin adds Users. Preserve Change password above current identity
and Sign out. Brand link returns to role dashboard. aria-current marks the active
destination; mobile navigation retains keyboard operation and visible focus.
Initial-password accounts remain gated before any dashboard. A wrong-role URL
uses Access denied; expired session returns to login. Preserve query strings.

## Requester dashboard

Welcome identity, labeled last-refreshed time and Refresh; four labeled metric
cards: Active Tickets, Waiting for Me, Updated in Last Seven Days, Recently
Resolved. Recent Tickets and Waiting for Me lists show at most five concise rows,
status text and detail links; View all opens exact corresponding list filters.
Create Ticket/My Tickets quick actions reuse existing destinations.

Only owned data. Explain a zero attention list as "No Tickets waiting for you";
an account with no Tickets also gets a Create Ticket action. Do not present
Resolved as Closed or an indication as formal resolution. Refresh error keeps
last successful data visibly labeled as not refreshed and offers Retry.

## Staff/Admin dashboard

Welcome, snapshot time, Refresh; Unassigned Active Tickets, My Active Tickets and
My Assigned Actions cards. Ticket counts by all eight statuses and active Ticket
counts by IT Priority use compact labeled links, including zeroes. Recent Tickets
and My Recently Performed Actions contain at most five entries and detail/View all
links. Do not copy the entire queue or introduce Requester-only Create Ticket
controls from the handout's illustrative mockup.

/staff/actions is a paged work list with Ticket link, action summary, state,
assignee and actual performer/time. Show applied current-user filter; detail
links open Actions Taken and focus the intended record. Empty assigned work and
empty recent performed work are normal zero states. Admin reuses this screen;
My values refer to the signed-in Admin, not another Staff member.

## Actions Taken on detail

Use a clearly labeled shared Actions Taken section distinct from Public Comments
and private Internal Notes. Staff gets New action and a paged table; tablet/mobile
use labeled cards. Requester gets the same readable shared fields/history, without
write controls. No private action toggle and no exposed Internal Note text.

Show Action Date/Time (Asia/Bangkok), Description, Result, state, assignment,
Created by/time, automatic Performed by/time, Follow-Up Required, Follow-up Note,
Attachment Notes, cycle and last update. Before completion say "Not recorded yet"
for performer rather than imply the assignee performed work. Empty Result is
"Not recorded". Attachment Notes is explanatory text, not an upload control.

Create form: labeled local datetime field, Description textarea, Result textarea,
initial assignee select including Unassigned, Follow-Up Required checkbox,
conditional required Follow-up Note and optional Attachment Notes. Initial fields
and assignment save atomically in one create request. Convert the labeled Bangkok
input to an offset/Z timestamp. Create begins PLANNED.

Existing action edit has the same Action fields but NO editable assignee selector;
"Save action" submits only fields/versions/requestId/changeReason. Assignment is
a separate labeled panel with its own assignee select and "Save assignment"
button calling /assignee. Explain that these controls save independently; no
"Save all" or automatic chained mutation. Completed work shows immutable
state/assignee/performer and requires Change reason for allowed field corrections.
Clearing existing follow-up requires a retained explanation and appends history.

Allow one action mutation at a time across field/assignment/state controls.
After success, reload authoritative action/parent versions before another save;
preserve any separate unsaved draft and require explicit review/resubmission.
If reload fails, announce the successful save and disable further mutations until
refresh succeeds. If fields saved and a later explicitly submitted assignment
fails, say "Action changes saved; assignment not saved" and keep the assignment
draft. Do not roll back or repeat the successful field save. If assignment's
response is lost, say "Action changes saved; assignment outcome unknown" and
offer exact-payload/key Retry; block other mutations until reconciled/refreshed.
Cancelling a draft does not undo an already confirmed operation.

Start, Complete and Cancel appear only for permitted action transitions. Complete
requires a Result and confirms that the current user performed the work. Cancel
requires a reason and explicit confirmation. No inaccessible modal: use inline
confirmation with Cancel/back action and predictable focus. New creates a stable
UUID for the intended submission; busy controls prevent repeated clicks.

Terminal Ticket, cancelled action and prior-cycle action show readable content
with the reason edits are unavailable. Current-cycle completed work remains
correctable only under the reviewed business rules. Never offer state reversal.
Inactive assignee feedback identifies the field and refreshes choices without
erasing other input. History shows ordered actor/time/operation/reason/revisions,
with accessible paging and no edit/delete controls.

## Ticket workflow and history

Preserve separate owner/priority/status controls and existing confirmations. Show
only matrix destinations, with an evaluated resolution checklist showing completed
current-cycle work, unfinished work and outstanding completed-action follow-up.
Use the API's whole-cycle resolutionGate counts/boolean, NEVER visible-page counts.
A blocker on page two or beyond must keep the checklist blocked on page one.
Match the summary's enclosing ticketVersion/currentCycle to the loaded Ticket
detail before displaying pass/fail or enabling Resolve; otherwise show
"Checking current resolution requirements" and reload. During initial load,
failed refresh, a pending mutation or version mismatch, do not display a positive
ready result or enable Resolve using an old summary. Loading/error is not zero.
After every action/status mutation refresh the summary and detail. A ready work
predicate still requires a permitted status edge and role. Concurrent writes can
invalidate a read snapshot, so the status API rechecks BR-13 atomically and stale
or gate failures remain normal recoverable feedback. Backend rejection explains
which rule failed and links to Actions Taken. Cancellation first directs users
to finish/cancel active work. A successful status change reloads summary, history
and action eligibility. Reopened Ticket labels its new cycle and old read-only work.

Requester Problem Appears Resolved stays advisory. Workflow history shows formal
transitions, actor and server time in stable ascending order with paging. Legacy
empty history says "No recorded transitions since the Lab 4 upgrade"; do not
invent history. Keep Comments and Notes append-only with existing role visibility.

## Feedback and state preservation

| State | Behavior |
|---|---|
| Initial load | Section-specific status text, aria-busy; no fake zero metrics |
| Empty | Explain zero work/Tickets/history and show a permitted useful action |
| Validation | Summary alert plus adjacent aria-describedby field feedback; retain input |
| Busy | Disable intended submit/duplicate actions; announce operation |
| Success | Specific saved message, then authoritative reload; move focus predictably |
| Saved but refresh failed | Say save succeeded; offer refresh rather than repeat create |
| Forbidden/not found | Safe role/unavailable feedback; no protected content |
| Stale/conflict | Retain draft, explain change, offer Reload; require explicit review/resubmit |
| Uncertain network outcome | Keep original requestId for safe retry; do not assume no save |
| Safe API failure | Generic message/Retry; preserve non-password data |
| Authentication loss | Clear authenticated state and return to login |

Ignore late responses after navigation/newer refresh. Do not share broad status
locators among unrelated loading and success messages in browser evidence. Dashboard
filters populate actual lists/controls after link navigation, reload and Back.
Retain the exact submitted payload while reconciling an uncertain save. Hold any
subsequent edit separately; Retry resubmits the original payload/key. Once resolved,
reload current versions before offering a new save. A new signed-in user never
inherits or renders an earlier user's protected draft/dashboard response.

Dashboard asOf labels the snapshot. Drill-down reads live data, so changed counts
after another user writes are explained by refresh rather than a frozen-history
claim. Failure/initial loading must not render fabricated zero metrics. An action
deep-link whose record is not on the first page must fetch/locate that record; a
missing/mismatched actionId shows safe unavailable feedback, not a different action.

## Responsive and accessibility rules

Reuse green tokens and text-bearing status/priority badges. Body >=16px/helper
>=14px, controls with >=44px touch targets, visible focus and semantic headings,
table captions, labels, errors and buttons. Dashboard cards wrap; no color-only cues.
At 1440px use compact card grids/tables; at 768px reduce columns/use readable cards;
at 390px use one column, full-width fields and safely wrapping long text/identities.
No page horizontal overflow, clipping or overlapping controls. Read-only text
remains readable, not merely disabled low-contrast inputs.

## Planned evidence and checklist

artifacts/lab-04/screenshots/{staff-dashboard,requester-dashboard,actions-taken}/
contains intentional final-main captures. Add workflow/regression close-ups as
needed for readable submission; record revision, seed/isolation and viewport.
Routine E2E output stays ignored. Issue #41 also has explicitly generated feature
captures in actions-taken, identified separately in that folder's README; these
must be refreshed from final main in #44. The following full-release checks remain pending:

- [ ] Major screens inspected at 1440/768/390px, including long/multiple action text.
- [ ] Dashboard values and exact drill-down filters verified against independent queries.
- [ ] Action create/edit/assignment/start/complete/cancel and role-safe read-only view.
- [ ] Required fields, follow-up notes, immutable performer and revision reason are clear.
- [ ] Terminal/current-cycle/reopen/resolution/cancellation feedback is usable.
- [ ] All requested loading/empty/error/conflict/success/failure states captured/tested.
- [ ] Keyboard navigation, form focus, cancellation return focus and pagination checked.
- [ ] No clipped content, overlap, broken links or horizontal page overflow.
- [ ] Existing auth/account/Ticket/file/Comment/Note screens remain consistent.
- [ ] No runtime console errors, broken drill-down/deep-links, temporary placeholder
  content or unfinished controls; repeated clicking cannot duplicate submissions.
- [ ] Representative images visually inspected; author review recorded accurately.

Automated/component checks and representative visual review do not establish a
full manual screen-reader audit. Record the actual extent of verification.

### Issue #41 feature verification, 2026-10-06

ActionsTaken.tsx is shared by owned Requester and Staff/Admin Ticket Detail.
The authenticated actor/Ticket key remounts drafts and retry state. List/action/
parent versions must agree before writes; late navigation responses are ignored.
Field and assignment forms save independently. Unknown responses freeze edits
and expose only exact Retry; confirmed-save refresh failure exposes Refresh,
not another create. A later rejected assignment announces earlier field success.
Before submitting, session storage journals the original user/Ticket-scoped
payload and requestId. A browser reload recovers an uncertain operation with the
same key; it cannot start another create instead. Confirmed journals refresh the
saved record without another write. Sign-out/authentication loss clears journals.
If storage is unavailable before submission, the UI reports that nothing was sent.
Completed Result is synchronized after completion without erasing unrelated
unsaved field input. Bangkok input preserves milliseconds and submits an explicit
+07:00 offset, avoiding a freshly created action being rounded before its Ticket.
Complete/cancel are inline confirmed operations; focus enters the form and returns
to the relevant button on Back. Record headings, error fields and paging are focusable.
Tablet/mobile tables become labeled cards with visually hidden accessible headers;
their caption becomes a full-width block rather than a narrow anonymous table cell.

Automated checks cover 1440/768/390px, long unbroken content, zero page overflow,
44px targets and keyboard focus. Agent visual inspection covers representative
action captures; the author has not yet personally accepted these new screens.
Formal resolution checklist/history/reopen belongs to #42, not this feature.

### Issue #42 local workflow verification, 2026-10-07

The Staff checklist matches ActionPage ticketVersion/currentCycle and gate.cycle
to Staff detail. It never derives readiness from visible rows. Each loading,
blocked, pending, unknown or mixed read invalidates the summary; Resolve and
Cancel cannot use it. Counts include later-page work. Separate status/owner/
priority controls remain. Explicit terminal confirmation is required; Resolve
needs completed work and no unfinished/follow-up items, while Cancel only needs
no active current-cycle work. Backend gate errors are safe, and the checklist
links directly to Actions Taken. Unknown status/operational responses and stale
versions freeze writes until explicit Reload Ticket; the client never assumes
an uncertain save failed and sends it again.

Status/action version changes refresh parent/summary/history. Reopen displays the
new cycle, clears the formal date/advisory indication and leaves old actions
read-only. Legacy terminal dates remain explicitly unrecorded. Both detail roles
show ordered read-only history with server actor/time/version/cycle, paging,
empty-upgrade message and Retry. Late replies for old Tickets/versions are ignored.

Twelve feature captures cover ready/reopened/history at 1440/768/390px, a real
later-page blocker, a committed status with lost response and a simulated history
outage. Actual browser checks cover page overflow, 44px controls and keyboard
focus; representative desktop/mobile images were agent-inspected. This is not
final-main evidence, author acceptance or a complete screen-reader audit.

### Creation navigation refinement, 2026-10-09

At the author's request, successful creation opens the actual saved Ticket Detail
only after every selected initial upload succeeds. Replace the form's history
entry, show a transient `Ticket created successfully.` status and retain Back to
My Tickets. Direct visits/revisits do not invent a creation confirmation. Leaving
the form or changing actors while a request is pending prevents late navigation.

If an initial upload fails, remain on the form and show `Attachment upload failed`
in an alert, not a creation-success banner. Explain truthfully that the Ticket was
saved before file upload, disable repeated creation and offer `Open Ticket to
retry attachments`. Successful files stay attached; failed files can be selected
again on detail without another Ticket POST. The recovery link is a green 44px
target with visible keyboard focus. A failed Ticket POST instead preserves input
for retry. Automated and agent-inspected captures cover 1440/390px; these are
ignored test outputs, not new final-submission evidence or author acceptance.

### Saved status and transition selection, 2026-10-09

Following author feedback, Staff Operations shows a separate read-only `Current
status` box from the last successful detail response. `Change status to` starts
with `Choose a new status…`; the first valid next transition is never selected
automatically. Selecting a target previews `Open → In Progress. Not saved yet.`
without changing the current box. A successful save updates that box and resets
the selector/terminal confirmation; Save Status is disabled until a valid target
is explicitly chosen. A rejected save retains the confirmed current value and
unsaved choice. Existing unknown-response reload protection remains unchanged.

All valid next statuses in the approved eight-status matrix remain available.
From Open: In Progress, Waiting for Requester, Resolved and Cancelled. Open stays
visible in the current-status box, not as a no-op transition. Illegal backward
transitions are not added. Resolved offers Closed/Reopened, Closed offers Reopened,
and Cancelled retains its current value with no further transitions. Resolution
and cancellation gates and terminal confirmation still apply. Separate boxed
content reflows with existing Operations at desktop/tablet/mobile widths.

### Two-stage opening and progress panels, 2026-10-09

A subsequent author clarification supersedes the single Operations status form's
placement. While New, show a standalone `Open ticket` panel above Operations.
Its `Choose an action` selector offers Open Ticket and Cancel Ticket, with an
explicit matching button. Progress controls are absent before opening. A confirmed
Open save removes that panel and reveals `Update ticket status` below Operations;
focus moves to the new heading. Current Open stays visible, all four legal next
statuses remain available, and Change status to starts unselected.

Pending/rejected opening must not reveal the progress stage. An unknown outcome
locks writes in the opening stage until authoritative Reload Ticket; the real
saved state then selects the appropriate panel. New cancellation retains terminal
confirmation and the no-unfinished-work gate. Direct cancellation does not invent
an opening: show a read-only `Ticket status` panel, not progress controls. Resolved/
Closed retain their legal closing/reopening choices; reopening returns to progress,
not the New-ticket opening stage. No new opening flag or workflow API is introduced.

Owner/Priority remain independent forms in Operations. The status stage lays out
current value and target side by side on desktop and stacks at tablet/mobile.
Three-width browser checks cover both opening and progress stages, 44px controls,
visible focus and no page overflow. Feature evidence now contains 18 deliberate
PNGs at that stage; agent inspected desktop opening/progress and mobile progress. Author visual
acceptance and final-main evidence remain separate pending steps.

### Checklist emphasis and on-demand action editing, 2026-10-09

Author-requested presentation refinement, not a change to the workflow gate.
Resolution checklist and Actions Taken headings are bold, green and 28–32px,
larger than body text; individual Action headings are bold 24px. Checklist rows
use green checks for Met and red crosses for Not met, with tinted backgrounds,
border accents and retained text labels. Icons are decorative to assistive
technology. Ready/blocked overview uses the same colours; loading, mismatched
versions, uncertain saves and terminal overview remain neutral, never falsely ready.
Whole-current-cycle authoritative counts and all authorization rules are unchanged.

View (including Staff deep links and newly created actions) shows saved details
and audit history without the editor. Eligible Staff choose `Edit action` to reveal
fields and independent assignment. State controls were originally grouped here;
the later approved Action progress refinement below separates them. The disclosure has expanded/
controls semantics and focuses the first field; `Close editor` or `Discard unsaved
fields` discards local input, returns to view and restores focus to Edit action.
Switching records resets view mode. Existing field saves keep the editor open so
an independent pending assignment/draft is retained. Unknown-save recovery restores
the interrupted field/assignment editor and original receipt/key; state-only
recovery does not open the editor. Closing is blocked while locked.
Requesters, terminal Tickets, cancelled actions and prior-cycle records never gain
an Edit button. Completed current-cycle corrections still require a change reason.

The subsequent author clarification emphasizes the readiness overview itself,
not only the section heading. Ready/Not ready uses 20–24px bold text, a larger
icon, 20px padding and a 6px leading border, above the ordinary 16px requirement
rows. Neutral feedback uses the same hierarchy without implying readiness.

Audit requirement interpretation checked against the actual Lab 4 handout,
page 11 Part 7: stable ordering, append-only behaviour and role-appropriate
visibility are required. Our reviewed contract implements those with immutable
Action revisions/Ticket transitions. The specific Audit history heading and raw
before/after JSON disclosure are project presentation choices, not prescribed by
the handout. This author question did not authorize removing history or changing
its display, so audit UI and stored events are retained unchanged.

### Approved readable audit presentation, 2026-10-09

The author's subsequent approval replaces JSON-first reading with What changed.
Create events show Action created and initial business details, without an empty
Before column. Later revisions show only changed business fields, friendly labels,
Before/After values, Yes/No flags, human-readable states and Bangkok times. Event
actor/time/reason remain visible. Same values are omitted, but empty/null/missing
values are distinguished where meaningful and incomplete legacy entries do not
pretend to be creation. All text is escaped and long content wraps at every width.

Snapshots retain account IDs, not historical display names. Use the response's
event actor name for that same ID; otherwise show Account #id, never guess from
the current assignee. Record/Ticket IDs stay in Technical details rather than the
business-field comparison. Native Technical details disclosure starts collapsed,
keeps the original JSON snapshots unchanged, works by keyboard and has a 44px
target. Existing chronological ordering, independent paging, safe retry, shared
owned-Requester visibility and all mutation restrictions are unchanged. No API,
schema, stored-event or Internal Notes visibility change.

### Approved Close detail control, 2026-10-09

An action's saved-details header includes Close detail for Staff and owning
Requesters, including read-only records. It hides saved details, editor and audit
without deleting the action or sending a write. While editing, its explicit label
is Discard changes and close detail; unsaved fields, assignment and confirmation
input are discarded, never earlier confirmed saves. Closing returns focus to the
action's list View button, or Actions Taken heading when the row is not on this
page. View reopens the saved record. Refresh does not reopen a deliberately closed
deep link; a fresh page navigation still opens the link normally. Late audit reads
cannot repopulate a closed/reopened view. Close is disabled during pending saves,
uncertain outcomes or confirmed-save refresh recovery, preserving the retry journal.

### Approved independent Action progress, 2026-10-09

Following the author's review, eligible selected actions show Action progress
directly below saved details and before the field editor, even in normal view mode.
Start appears only for Planned; Complete/Cancel appear for Planned or In Progress.
Edit action reveals fields/assignment only and is not a completion prerequisite.
Progress controls stay available if the editor is open, but each state operation
submits only its own saved-version payload; unsaved fields/assignment are not
submitted. Complete still requires a Result and actual-performer confirmation;
Cancel requires its own reason and confirmation. Back restores keyboard focus.
All busy/conflict/uncertain-save locks, terminal/cancelled/prior-cycle/Requester
restrictions, current-cycle gates and immutable events remain unchanged. A recovered
state-only intent retains its original key without revealing a field editor.
