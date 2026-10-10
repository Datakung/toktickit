# Lab 4 AI Use and Reflection

Status: Actual interaction record through peer-accepted Issues #40-43 and the
Issue #44 release-candidate work on 2026-10-10. Final release remains pending.

Tool: OpenAI Codex desktop. On 2026-10-10 the author reported the selected model
as "GPT-Sol 6.1". This is the author's selection record, not an independently
verified model history for every earlier turn; no historical model changes are
inferred from the app name or prior labs.

## Selected real prompts so far

| # | Prompt | Use of the result |
|---|---|---|
| 1 | "New lab here." with SE+Lab+4.pdf | Read the full sheet, inspected its illustrations/rubric and compared it with the reviewed Lab 3 schema and workflow. |
| 2 | "Ok" after the six-Issue proposal and drafting next step | Authorized local Issue/contract drafts. Proposed explicit action lifecycle, performer/assignee distinction, append-only revisions, current-cycle resolution gate, preserving migration and exact dashboard queries before implementation. |
| 3 | "Good make sure it goes with the PDF I gave you and cover some cases" | Rechecked the complete labsheet and grading requirements, added CASE-01-25 and clarified action ordering, live dashboard drill-down, database types and retry/actor isolation. |
| 4 | "Okay start" | Checked for duplicates, created Issues #39-44 on GitHub and added them to the project Backlog; prepared local staging/Issue #39 branches and moved the contract into the repository before product coding. |
| 5 | "Yeah" after the agent explained Phanuwit's PR #45 findings and asked to update both | Authorized contract corrections: separate field/assignment saves with partial-success and exact-retry behavior, whole-cycle backend checklist summary, CASE-26/27 and factual review recording. Phanuwit later approved ff97405 and merged PR #45 before product implementation. |
| 6 | "Docker ready" with the prepared feature/40-actions-foundation branch output | Authorized the next Issue's implementation/testing. Added preserving schema/migration, Action APIs, immutable history, retry receipts, safe account unassignment and repeatable demo fixtures; verified migration rollback/real isolated restore, concurrent writes and full regression. Fixed issues exposed by tests, without migrating/seeding development. |
| 7 | "On to the next" after PR #46 was reviewed/merged | Started Issue #41 from the peer-merged staging commit. Wrote failing component tests before the shared Action screen; implemented separate saves, confirmations, read-only history and exact retries. Real-browser tests exposed timestamp precision, stale completed Result and Requester deep-link bugs; visual inspection exposed a mobile caption issue. Corrected these and reran tests/evidence without changing development data. |
| 8 | "Yes fix them" after Phanuwit's PR #47 Changes requested review | Added typed Action/assignee mocks in legacy detail fixtures and a test-only guard that exposed unexpected real fetches before the fix. Kept existing cases/assertions, synchronized mutation summary versions and ensured the navigation race actually sends a claim. Reran all 130 client tests in default and serial modes and the typed client build; no product/database change or peer approval claimed. |
| 9 | "He merged it and ready to move on to next issue" with PR #47 | Verified approval of corrected 0cf9e58 and merge f4da089, then started #42 from staging. Wrote failing matrix/gate/API and workflow component tests; implemented atomic current-cycle gates, transition history, reopen cycles and server-summary checklist. Added synchronized races, rollback and real-browser later-page/reopen/unknown-response checks. Kept development unchanged. |
| 10 | "no for attachment fail I think show fail but not created" after "Do it" authorized creation redirect | Implemented redirect only after initial uploads succeed; attachment failure stays on the form with a failure alert and truthful saved-Ticket retry link. Added deferred-upload/unmount and real-browser success/failure/retry checks. Isolated the older login fixture from real Staff API reads without weakening assertions. The author separately backed up and migrated development; these tests preserved it. |

The final submission requires 6-10 selected actual key prompts. Ten are
recorded so far. Do not invent future prompts; replace a less representative
selection if later review/testing interactions warrant inclusion.

## Specification-agent and coding-agent use

The agent supported interpretation, contract drafting and corrections to actual
independent peer feedback on PR #45, followed by Issue #40 coding and testing.
Validation/API tests were written alongside the implementation; initial endpoint
tests failed before handlers existed. Seed and test-harness defects exposed during
verification were corrected and rerun. Contract acceptance is recorded separately
from product review: #40/#41 accepted; #42 not yet peer reviewed. The new screen's definite failure
feedback is tested separately from unknown-response recovery; browser response
loss occurs after a real API commit and replays the original receipt once.
The original request is journaled in browser session storage before submission;
an uncertain save survives a page reload with its original payload/key. Journals
are scoped to the current user/Ticket and cleared on sign-out/authentication loss.
The author committed/pushed the tested UI/evidence as cd5aa76 and docs as 3addd43
in PR #47. Real peer review exposed environment-dependent legacy fixture reads;
the agent prepared a test-only correction and recorded actual passing reruns.
The author pushed correction 0cf9e58; Phanuwit independently approved it and
merged PR #47. Issue #42 now has local implementation and passing targeted/full
checks, with exact results in the test ledger. Its initial missing-module/API
and component tests failed before the new rules/endpoints/screens existed.
Additional concurrency/error checks were developed alongside the implementation.
Test-harness failures were corrected without weakening assertions: required
Action fixture fields, transaction-level outage injection, awaiting completed
initial reads, and keeping simulated browser outages active through StrictMode's
duplicate reads. An early full browser attempt ran while source was being edited;
the clean verification rerun holds application code unchanged. No #42 peer
approval or final-main readiness is claimed.
Exact branch results and the existing dependency
audit finding are in [tests.md](tests.md); final-main results remain pending.

Additional author feedback on October 9 requested a separate saved-status box
after Open disappeared from the transition selector. The agent wrote ten failing
component checks before replacing automatic next-status selection with explicit
selection and a Current status box. All eight legal-transition lists are asserted;
pending/rejected saves retain the confirmed value. Existing browser selectors
are updated to the clearer label, not weakened, and a new three-width browser
journey checks saved Open, all four targets, unsaved preview and blank reset.
This supplementary record does not add an eleventh selected key prompt.

The author's subsequent clarification requested an opening panel and a separate
progress panel appearing after opening. Two new cases and the expanded pending
opening case failed before the layout change. The implementation preserves the
same API/matrix, keeps New cancellation and moves focus to the revealed progress
heading only after a confirmed save. A real browser case independently verifies
New cancellation cannot bypass unfinished work. Updated selectors/capture regions
keep legacy Staff checks meaningful; no required assertions or authorization
rules were removed. Typed build caught an unsupported test-query option, which
was corrected before the final 159-client/eight-browser passing verification.
The handout's field list and grading rubric differ in detail; proposed choices
are explicitly identified rather than attributed to a nonexistent sheet rule.

### Checklist and action-view refinement

Supplementary October 9 author requests asked for red/green checklist indicators,
larger important headings and viewing an action without immediately exposing its
editor. The agent added six checklist-state checks (initially failing before the
colour change), plus four view/edit component cases developed with that refinement.
Existing mutation/retry/permission assertions remain, with explicit Edit clicks
added to exercise the newly disclosed controls. An older initial-focus assertion
ran before React's effect under the full regression load; it now waits for the
same required focus rather than removing that assertion. This supplementary record
does not add an eleventh selected key prompt or imply author/peer acceptance.

### Readiness emphasis and audit clarification

Further October 9 clarification asked whether the audit display is mandated and
requested a more prominent overall readiness banner. The agent reread all handout
text and visually inspected complete relevant pages 6/11 using the PDF skill.
Part 7's append-only/ordering/role requirements are distinguished from our approved
immutable-history interpretation and optional raw JSON display. Audit behaviour
was not changed. The banner alone gains larger type/icon, padding and border;
actual computed hierarchy checks now run at all three widths, with one new style
case. This remains supplementary prompt evidence, not an additional selected prompt.

### Readable audit view

The author explicitly approved What changed instead of JSON-first audit reading.
The agent added a client-only snapshot comparison component and six component
cases alongside it: changed-only values/Yes-No, initial details, completion actor/
Bangkok date, missing-name account ID, escaped text/empty values and incomplete/
unchanged legacy snapshots. Existing Requester history/paging/safe-text assertions
now target Technical details rather than dropping raw snapshot verification.
A real-session journey compares revealed JSON exactly to the API response at all
three widths for Staff and the owning Requester, and verifies viewing does not
alter stored events. No historical account names are guessed, no API permissions
changed. This is supplementary prompt evidence, not an eleventh selected prompt.

### Close detail refinement

The author requested closing an action's details. Five new component cases were
failing-first: Staff/Requester closing, explicit draft/assignment discard, a closed
deep link remaining closed after list refresh and ignoring a late audit response.
An existing uncertain-assignment test now also proves closing is disabled while
recovery is required. Browser journeys retain exact snapshot/history assertions
and add keyboard close/reopen, return focus and discard at three widths. The typed
build caught unsupported exact options in three new Testing Library queries; those
options were removed without changing their name matching or assertions. No data
write, deletion, role or retry-policy change. This remains supplementary evidence.

### Independent Action progress refinement

The author noticed that Complete/Start/Cancel were hidden behind Edit action and
approved separating them. The agent acknowledged that this grouping was a UI
choice, not a workflow requirement, and moved progress/confirmation outside the
field/assignment editor. Six new component cases and the changed view-mode
assertion failed first: Planned/In Progress controls, direct Start, direct
Complete/Cancel validation and uncertain state-only recovery without an editor.
Two new tests initially kept detached button references after Back remounted the
controls; they now query the current buttons and retain their focus assertions.
Existing Requester/terminal/prior-cycle/cancelled/recovery assertions were expanded,
not removed. Browser paths now exercise real direct Start/Complete/Cancel, retain
independent field/assignment saves and capture the progress panel at three widths.
Stored events, API and permissions remain unchanged. Supplementary prompt evidence.

### Pre-publication regression and author workflow review

The author asked the agent to open the Issue #42 PR. Read-only checks confirmed
the author's saved resolution, closure, reopening and subsequent completed action
on Ticket `TKT-20261009-DE4TLN`: prior-cycle records remain, reopening clears the
resolution/advisory dates and the latest action belongs to cycle 3. This records
the exercised flow, not blanket author visual acceptance or peer approval.

The full browser inventory initially passed 42 tests and failed two older tests
because secondary browser contexts hard-coded port 5173 while the isolated test
UI runs on 5183. Three navigation URLs now derive the origin from the active test
page. Authentication, reset, session-revocation and role assertions are unchanged;
no retries/timeouts were increased. Full rerun results are recorded in tests.md.
No development seed/reset/credential change or new migration was performed.
This is supplementary evidence, not another selected key prompt or final reflection.

### Supplementary Issue #43 interaction evidence (2026-10-10)

The author said "He merged it let's move to the next". The agent verified PR #48's
actual approval/merge, updated staging and started feature/43-dashboards. It reread
the supplied complete PDF and inspected relevant dashboard illustrations before
implementing the approved role/metric rules. Initial API tests exposed missing
endpoints; subsequent tests caught a missing Prisma import and invalid fixture
cycle/completed-field data. UI tests cover loading, genuine zeros, refresh failure,
forbidden clearing, identity changes and exact URL filters. Typed builds caught a
generic dictionary cast and two missing Ticket fixture fields. The first full UI
run caught an outdated exact status-option assertion after adding Active Tickets;
all eight status assertions remain. The first dashboard browser run exposed a
missing /api prefix in the test's comparison URLs, not the product links.

Performance tests observe actual emitted SQL statement counts, bounded payloads
and five warmed reads per role with 500 Tickets/Actions. An initial large-fixture
validation failure required the existing mandatory note fields; no product schema
was weakened. Legacy browser login helpers now verify the new dashboard home then
navigate explicitly to their original test destination. No old security checks are
dropped, no retry/timeout raised. The stopped existing database container was
started for testing; only guarded test/E2E targets were seeded/reset. Feature
screenshots are agent-inspected evidence, not author visual approval or final-main
release captures. No migration, dependency, development seed or credential reset.
This supplements the selected real prompts; it does not fabricate an author reflection.

Final local checks: 288 server tests, 210 client tests, both builds and the complete
48-scenario Chromium inventory passed. The initial full browser run's three Admin
home assumptions were corrected in the shared helper; no assertions were relaxed.
Inspection also caught malformed Requester date values reaching a formatter and
undefined optional queue filters being serialized. Focused regression tests now
cover both. Existing API/UI ports and development hashes were preserved. No PR,
commit/push, board movement or author visual approval is claimed for this branch.
Final visual inspection caught a narrow mobile work-list caption. The agent
added a scoped full-width caption rule and an actual-browser width assertion,
and waited for loaded work counts before capturing. The four dashboard journeys
and typed build were rerun; data/API semantics are unchanged.

Supplementary author dashboard review: the author reported six Requester and
five Staff checks passing, then requested smaller Requester quick links,
equal/aligned Action progress buttons and wider work tables with one-line labels.
The agent scoped CSS to these controls and My Actions, preserving responsive
cards, touch targets and all independent state/field/assignment semantics.
The added browser layout scenario checks visual line positions, equal button
dimensions before/after Start, realistic longer Ticket numbers and overflow at
1440/1150/768/390. A first assertion counted separate text nodes as separate
lines; it was corrected to count distinct vertical positions, not relaxed.
Five dashboard journeys (17.2s), all 210 client tests (35.74s) and the build pass.
Feature captures were regenerated; representative desktop/mobile images were
inspected. Development data/uploads fingerprints matched within the run.
No new full-server/full-browser inventory/audit or peer approval is claimed.

Later author clarification: browser-toolbar screenshots all showed 100% zoom.
The author asked to shrink the shared interface while preserving earlier header,
equal-button and one-line-table requirements. The agent implemented compact
workspace typography/spacing, smaller dashboard numbers/cards/lists, aligned
three-column Staff metrics and a centered 1200px work area. No CSS zoom/transform,
root/browser scaling or data/save/authorization behavior changed. Five deliberate
browser/evidence cases passed at wide desktop and responsive widths (22.4s),
all 210 client tests passed (39.10s), and the build passed. The full Chromium
inventory then passed all 49 scenarios (4.0m), preserving auth, accounts,
attachments, communication, Action/workflow and responsive assertions. The
development database/uploads fingerprint stayed unchanged within both runs.
No timeout/retry increased or assertion skipped. Author acceptance of the
new compact look remains pending; no new full-server or audit result is claimed.

Latest author prompt: fix the remaining oversized-looking dashboard cards/lists,
leaving the balanced My Actions view. The agent reduced dashboard-only whitespace,
shortened visible panel links to `View all` with descriptive accessible names,
and kept text, numbers, headers, touch targets and destinations unchanged.
All 210 client tests (35.67s), the typed build and five guarded browser/evidence
cases (19.5s) passed; updated Staff desktop/mobile images were inspected and
development state remained unchanged. No fresh full inventory/server/audit run
or author/peer visual approval is claimed for this last adjustment.

Later author prompt: fix misaligned action create/discard buttons and clarify
whether action numbering restarts per Ticket. The agent checked the ActionTaken
global auto-increment ID and existing ID-based labels, leaving numbering intact.
Editor buttons now reuse the equal-size confirmation grid with zero top margins
and full-width mobile stacking. An added style test and expanded browser case
cover both create/edit controls at 1440/768/390px. All 211 client tests (34.63s),
typed build and five guarded browser cases (20.7s) passed. Representative new
control captures were inspected; development state matched within the run. No
fresh full inventory, server/audit or approval claim accompanies this correction.

Subsequent author request: make action numbering independent per Ticket and
correct the incorrect display indexes. The handout does not prescribe global
display numbering; this is an author-approved UI refinement. The agent added
backend-derived Ticket-local `actionNumber` DTO fields and replaced global-ID
labels in lists/details/dashboard/work views while retaining internal IDs for
writes, deep links and immutable history. No migration/reset was needed. Tests
cover interleaved Tickets, tied times, later pages, prior/cancelled work, filtered
view parity, replay/audit IDs and forged-number rejection. Full client 211 tests,
both builds and the complete server rerun 290 tests pass. The first server run
exposed a new fixture missing its cancellation reason; the fixture was corrected
without weakening the database constraint or assertions. Five deliberate browser
capture cases pass and representative work images were inspected. Development
state was unchanged within that browser run; author/peer acceptance remains pending.

The complete guarded Chromium inventory then passed all 49 scenarios (4.5m),
including later-page Action 21, ID-based real writes/deep links, dashboard number
parity and resolution/close/reopen. Existing security/focus/lifecycle assertions
remain; no retry/timeout increase or skip. Development database/uploads matched
before/after. Ordinary screenshots stay ignored; final-main evidence, dependency
audit and independent/author visual acceptance are not claimed by this result.

The author subsequently stated "Everything in order" and authorized committing,
pushing and opening the Issue #43 PR into `lab4-staging`. The agent prepared the
reviewed feature, documentation and isolated screenshot evidence for publication.
This is author feature/UI acceptance, not independent peer approval, a new test
run, final-main acceptance or approval of the pending reflection below.

## Issue #44 actual continuation, 2026-10-10

The author requested "Start on this one" with Issue #44 after PR #49's actual
peer merge. The agent reread the full handout, checked GitHub acceptance evidence,
retained fresh dependency findings, updated vulnerable upload/proxy/test-tool
dependencies and added eight hardening/error-recovery tests. The complete local
gate passed 298 server / 211 client / 49 browser cases, both builds, Prisma
validation and four clean audits; development state was unchanged. Eighteen
candidate captures were inspected and retained with honest provenance. No new
quality PR, peer approval, final-main pass or finished PDF is invented.

The author answered the model question with "GPT-Sol 6.1" and supplied the
reflection below. The agent recorded those answers and corrected grammar only.
The nine-part submission plan follows the real handout; final-main evidence and
release approval must exist before assembling a completed submission.

The author's later "Go for it" authorized committing/pushing and opening the
quality PR. The agent published the verified candidate in
[PR #50](https://github.com/Datakung/toktickit/pull/50) to `lab4-staging`, retained
the original test/provenance records and recorded publication separately from
independent approval or final release. Issue #44 is not complete.

## Review correction interaction (2026-10-11)

After "He reviewed", the agent read the actual PR #50 requested-changes review
and confirmed the final-snapshot manifest bug in the source. The author then
said "Fix it". The agent reproduced the failure with parsed-production
regressions, fixed success/failure handling, preserved earlier failures and added
automatic gate coverage. Ten regression checks and both builds passed; the
database was unreachable, so no new full gate or preservation hash was invented.
The author's reflection below is unchanged by this coding interaction.

## My Reflection

Supplied by the author on 2026-10-10; lightly edited for grammar without adding
claims about experiences or results:

AI helped me most by listing the details I needed for planning. I could also
suggest my own ideas and incorporate them into the plan to make it more suitable.
I still needed to check UI details myself, such as whether the buttons and page
sizes were appropriate. Most of the checks I needed to make personally were on
the frontend.
