# Lab 4 UI Specification

Status: Contract approved in PR #45 on 2026-10-05; new Lab 4 screens remain
planned, not implemented or visually verified. Issue #40 supplies their tested
API foundation only. Existing Labs 1-3 browser regression passes are not evidence
that these new screens have been built. Business rules are in
[specification.md](specification.md); requests in [api-spec.md](api-spec.md).
Preserve the existing Zen Green tokens, labeled cards/tables and safe feedback.

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
Routine E2E output stays ignored. These checks are currently NOT completed:

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
