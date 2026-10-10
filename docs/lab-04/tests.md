# Lab 4 Test Plan and Traceability

Status: Contract and Issues #40-43 accepted in PRs #45-49. Issue #43 was approved
at 6dce864 and merged as 4660ac6 on 2026-10-10. Issue #44 quality/release work
starts from that accepted merge; its peer review and final-main release remain
pending. Current candidate evidence is retained under artifacts/lab-04/quality-gate/.
Historical counts are never substituted for this branch's actual runs.

## Planned executable coverage

Paths are repository-relative. Passed rows exist and were executed for Issues #40-43;
Partly verified rows explicitly identify unfinished scope. No final-main release
status is implied by a branch pass.

| Test ID | Type | AC | Scenario and expected result | Actual/planned file | Current status |
|---|---|---|---|---|---|
| MIG-01 | Migration/integration | AC-01 | Upgrade populated Lab 3 schema; all historical values/relations preserved; legacy cycle/date behavior explicit | server/tests/lab-04/migration-regression.test.ts | Passed |
| MIG-02 | Recovery/integration | AC-01 | Failed migration rollback and isolated pre-migration backup restore compared against original records | server/tests/lab-04/migration-regression.test.ts | Passed |
| SEED-01 | Integration | AC-01 | Run twice after manual fixture edits; no duplicate records/events or credential/edit reset; zero/one/multiple work | server/tests/lab-04/seed-regression.test.ts | Passed |
| UNIT-01 | Unit | AC-02,03 | Description/result/time/boolean/note/reason/ID/UUID boundaries and unknown-key rejection | server/tests/lab-04/action-validation.unit.test.ts | Passed |
| UNIT-02 | Unit | AC-08,09 | All 64 Ticket status pairs and the independent current-cycle gate predicate | server/tests/lab-04/workflow-rules.unit.test.ts | Passed: 69 unit cases (64 Ticket pairs plus five gate predicates) |
| UNIT-03 | Unit | AC-10,11,12 | UTC range boundaries, status-group/date-pair parsing and stable query rules | server/tests/lab-04/dashboard-query.unit.test.ts | Passed: nine cases |
| API-01 | API | AC-02,03 | Multiple actions, automatic creator/performer, independent assignment, fields and valid lifecycle | server/tests/lab-04/actions-taken.api.test.ts | Passed |
| API-02 | API | AC-03,04,05 | Direct forbidden/owned reads, forged actor, forced-change, inactive/Requester assignee, terminal/prior-cycle guards | server/tests/lab-04/actions-taken.api.test.ts | Passed |
| API-03 | API/concurrency | AC-05,06 | Concurrent account change/assignment; account-integrity unassignment retains performer/events | server/tests/lab-04/action-concurrency.api.test.ts | Passed |
| API-04 | API/concurrency | AC-06 | Simultaneous writes, stale parent/child version, exact replay after lost response, reused UUID mismatch and rollback; independent edit succeeds then assignment fails or loses response | server/tests/lab-04/action-concurrency.api.test.ts | Passed |
| API-05 | API | AC-07 | Revisions retained past page one; equal-time ID tie-break; correction reasons; no history edit/delete; no Notes leakage | server/tests/lab-04/action-history.api.test.ts | Passed |
| API-06 | API/workflow | AC-08,09 | All eight-status edges; each gate failure, legal resolution/cancellation/reopen, advisory indication, legacy terminal close; whole-cycle snapshot summary with later-page blockers | server/tests/lab-04/action-history.api.test.ts; server/tests/lab-04/ticket-workflow.api.test.ts | Passed: seven workflow API cases plus existing whole-cycle snapshot tests |
| API-07 | API/concurrency | AC-06,08,09 | Action update/completion/creation races against resolve/cancel/reopen; one consistent outcome | server/tests/lab-04/workflow-concurrency.api.test.ts | Passed: 11 synchronized concurrency/rollback/session cases |
| API-08 | API/dashboard | AC-10 | Independent owned queries, zero account, other-owner exclusion, exact inclusive UTC boundaries and legacy null dates | server/tests/lab-04/requester-dashboard.api.test.ts | Passed: three cases, all metric-to-list comparisons |
| API-09 | API/dashboard | AC-11 | Staff/Admin metrics, current-user work, zero status/priority keys, snapshots and <=5 lists match queries | server/tests/lab-04/staff-dashboard.api.test.ts | Passed: three cases, all status/priority/current-user comparisons |
| API-10 | API | AC-12 | Additive Ticket/work-list filters match each dashboard predicate and retain existing defaults/errors | server/tests/lab-04/dashboard-drill-down.api.test.ts; dashboard-query.unit.test.ts; requester-dashboard.api.test.ts; staff-dashboard.api.test.ts | Passed: synchronized snapshot insert, inclusive performer boundaries/ties/prior cycles and auth guards; each card comparison lives in role API files |
| API-11 | API/errors | AC-04,13 | Session/CSRF restrictions, protected resources and generic errors; service remains healthy after failure | server/tests/lab-04/actions-taken.api.test.ts; requester-dashboard.api.test.ts; staff-dashboard.api.test.ts; dashboard-drill-down.api.test.ts; safe-errors.api.test.ts | Existing guards pass; five wider safe-error/recovery cases pass on the release candidate; final main pending |
| HARD-01 | Upload/proxy regression | AC-13,14,16 | Aborted multipart before async path assignment leaves no orphan; service stays healthy; default proxy trust is off and mapped unrelated addresses stay untrusted | server/tests/lab-04/upload-hardening.test.ts; proxy-trust-hardening.test.ts | Three candidate cases passed with patched dependencies |
| API-12 | API/numbering | AC-02,04,06,07,11,12 | Interleaved Ticket IDs, tied creation times, page 2, prior/cancelled work, filtered work/dashboard parity, preserved write/replay/audit IDs and forged-number rejection | server/tests/lab-04/action-numbering.api.test.ts | Passed: two cases in the complete 290-test server rerun |
| UI-01 | Component | AC-02,03,05,06,13 | View-first/Edit/Close detail, direct Start/Complete/Cancel, return focus/discard, late-history protection, independent field/assignment/state saves, required feedback, input retention, exact retry key, earlier-success/later-failure feedback and saved-but-refresh-failed state | client/tests/lab-04/ActionsTaken.test.tsx | Passed: 44 Action component cases |
| UI-02 | Component | AC-04,07,08,09,13 | Gate/history/reopen/read-only view, paging, advisory indication and safe conflict reload; labelled checklist colours exclude stale/unknown positive results; separate opening/progress stages and explicit target retain all valid transitions | client/tests/lab-04/TicketWorkflow.test.tsx | Passed: 32 workflow component cases after October 9 colour refinement |
| UI-03 | Component | AC-10,12,13 | Owned dashboard zero/loading/ready/failure/refresh, labels and real drill-down navigation | client/tests/lab-04/RequesterDashboard.test.tsx | Passed: four cases, including late identity-response exclusion |
| UI-04 | Component | AC-11,12,13 | Staff/Admin metrics/work/safe states, meaningful zeroes and bounded lists | client/tests/lab-04/StaffDashboard.test.tsx | Passed: six cases, both roles and unsupported-link rejection |
| UI-05 | Component | AC-12,13 | URL hydration, invalid query, reload/Back and stale responses after navigation | client/tests/lab-04/DashboardNavigation.test.tsx; dashboards.spec.ts browser | Passed: 13 component cases; actual reload/Back in browser |
| UI-06 | Component | AC-04,07,13,15 | Changed-only audit fields, initial creation details, Yes/No, Bangkok dates, honest account IDs, escaped text and incomplete legacy snapshots without mutation | client/tests/lab-04/ActionHistoryChanges.test.tsx | Passed: six readable audit cases |
| STYLE-01 | UI style | AC-15 | Reused tokens, labeled states and responsive rules where meaningful computed-style checks apply | client/tests/lab-04/ui-style.test.tsx; client/e2e/lab-04/dashboards.spec.ts | Seven Action/workflow CSS-contract checks and dashboard browser hierarchy/focus/layout checks pass at 1440/768/390px; author visual approval and final-main evidence remain pending |
| REG-01 | API regression | AC-14 | Real-session auth and earlier owned/file/Comment/Note/Staff/Admin flows with the approved new gate | server/tests/lab-01, lab-02 and lab-03 (existing executable files); dedicated final release coverage remains #44 | Passed on feature branch through existing Labs 1-3 files; final-main release rerun pending |
| PERF-01 | Performance smoke | AC-11,16 | Bounded query count/payload and measured dashboard smoke on representative seeded data | server/tests/lab-04/dashboard-performance.api.test.ts | Passed: 500 Tickets/500 Actions; five warmed reads per role, emitted SQL counts and payload sizes measured |
| E2E-01 | Browser | AC-02-07,13,15 | Different actors create/assign/edit/start/complete/cancel multiple actions; independent edit then failed/uncertain assignment; Requester read-only and direct denial | client/e2e/lab-04/actions-taken-flow.spec.ts | Passed: 5 feature browser journeys; final-main release evidence remains separate |
| E2E-02 | Browser | AC-07-09,13,15 | Missing/active/follow-up work including later-page blockers prevents resolution/checklist readiness; corrected work resolves/closes; reopen needs new cycle; status stages, checklist colours/contrast, view-first/Edit and readable audit with exact original snapshots at three widths | client/e2e/lab-04/ticket-resolution.spec.ts | Passed: six real-session workflow/UI journeys in the latest October 9 targeted rerun; historical results below |
| E2E-03 | Browser | AC-10-13,15 | Both dashboards, current-user work, query parity, exact drill-down and zero/failure states | client/e2e/lab-04/dashboards.spec.ts | Passed: five cases in the targeted evidence run and latest complete 49-scenario Ticket-local-numbering run |
| E2E-04 | Browser/regression | AC-14,16 | Authentication/change/logout, Requester/file flows, communication/privacy and Admin safeguards remain valid | client/e2e/lab-02/requester-ticket-flow.spec.ts; lab-03/auth-review.spec.ts; admin-users.spec.ts; staff-ticket-operations.spec.ts; release-evidence.spec.ts, included by test:e2e:review | Executable existing regression retained in complete 49-case candidate run; final main pending; no nonexistent duplicate final-regression file required |
| EVID-01 | Browser/evidence | AC-10-16 | Deliberate final-main captures at three widths, query comparison and unchanged development state | scripts/lab4-quality-gate.ps1; client/e2e/lab-03/release-evidence.spec.ts; client/e2e/lab-04/dashboards.spec.ts; client/e2e/lab-04/ticket-resolution.spec.ts | Candidate gate and 18 inspected captures retained; final-main capture/inspection remains pending |

### Issue #43 dashboard implementation and evidence (2026-10-10)

Branch feature/43-dashboards starts from peer-accepted Issue #42 merge 00fddc1.
Five new server files contain 19 tests: nine filter/range units, three owned
Requester APIs, three Staff/Admin APIs, three snapshot/boundary/auth checks and
one performance case. Metric expectations are independent fixture totals; every
count is also compared to its actual filtered list endpoint. Equal-time ordering
uses descending ID. Null legacy resolution dates and other Requesters/performers
are excluded. Prior-cycle assigned work is excluded; prior completed-performer
history is retained. A synchronized concurrent insert proves summaries and later
aggregates share one database snapshot.

Three new UI files contain 23 tests (4 Requester, 6 Staff, 13 navigation/API).
Coverage includes loading without fake zeros, honest empty results, labelled stale
refresh/Retry, 403 protected-data clearing, late old-user responses, captured
range/owner/pagination round-trips, unsupported/duplicate/malformed URLs, invalid
date feedback without formatter crashes and cleared optional keys without the
literal text `undefined` in requests.

Actual checks so far, not final-main/peer testing: full server 36 files/288 tests
passed in 94.39s. After making the exact Requester upper-boundary fixture explicit,
its three tests passed again in 4.28s. Final client: 23 files/210 tests passed in
18.26s, followed by a passing typed production build. Server build also passed.
The corrected complete Chromium inventory passed all 48 scenarios in 3.9 minutes,
including all four dashboard journeys; development fingerprints matched. The first full browser
run passed 45 and failed three old Admin landing-page assumptions; corrected
helpers verify Staff Dashboard then open Users, keeping all original focus,
account/reset/auth assertions. No retry/timeout increased.

Performance uses an isolated generated schema with 500 Tickets/500 Actions,
one warm-up and five HTTP reads per role. Real emitted SQL counts include auth
rechecks but exclude BEGIN/COMMIT/ROLLBACK/SET TRANSACTION. Bounds: <=12 statements,
<=64KiB JSON; local median target <2s. Latest full-suite measurements:

| Role | Median / maximum ms | Maximum statements | Maximum JSON bytes |
|---|---|---|---|
| Requester | 17 / 18 | 8 | 1697 |
| IT Staff | 16 / 20 | 9 | 3632 |
| Administrator | 16 / 18 | 9 | 2401 |

These are local smoke measurements, not production capacity/load claims.

Real-browser checks cover populated/empty Requesters, Staff/Admin current-user
work, every metric/list comparison, captured range reload/Back and the exact
performed-action deep link. Captures include 1440/768/390, zero/forbidden/refresh
failure and work lists. Root/body overflow, visible focus and >=44px dashboard
links are checked. The agent visually inspected six role/width images; this is
not author visual acceptance. [Feature evidence](../../artifacts/lab-04/screenshots/dashboards/README.md)
is not final-main evidence. Review API/UI use 3100/5183, leaving 3000/5173 alone.
E2E development database/uploads fingerprints matched before/after:
`bd723571386f81ec515cd44c9b7d2e97d0393bd7c874392d8c65691ae24118f2`.
No migration/dependency/development seed/reset/credential change.

Reproduce with `npm --prefix server test`, `npm --prefix client test`, both
`run build` commands and `npm --prefix client run test:e2e:review`. The checked-in
review configuration preserves guarded E2E data and fingerprint verification,
running alongside development on 5173. Deliberate screenshot replacement uses
`npm --prefix client run test:e2e:lab4-dashboard-evidence`; ordinary runs write only
ignored outputs. Author review/publication/peer approval, #44 release/audit/final
main captures and the author-approved Lab 4 reflection remain pending. Audit was
not rerun; the recorded moderate Multer advisory remains a separate release item.

Final screenshot inspection exposed a narrow mobile work-table caption. A scoped
caption rule now gives it the full table width; browser capture waits for loaded
work counts and asserts caption width, preventing premature partial screenshots.
The four dashboard journeys were rerun through the checked-in evidence script
after this presentation-only correction, and the client build passed again.

### Issue #43 author layout follow-up, October 10

The author reported all six Requester and all five Staff guided functional
checks passing, with readable dashboard screenshots. Exact viewport widths and
Administrator manual approval were not supplied. At the author's request, compact
Requester quick links were followed by equal-size, aligned Action progress
buttons and a wider My Actions desktop layout. No state or authorization changed.

The latest five-case dashboard browser run passed in 17.2s. Its added layout
case uses realistic longer Ticket numbers, confirms single-line Ticket/Action
labels and View Action links on desktop at 1440/1150, checks labeled cards and
no overflow at 768/390, and compares button width/height/top before and after
Start action. The initial line-count assertion counted separate DOM fragments
on the same line; it was corrected to count distinct vertical text positions.
All feature dashboard captures were refreshed. The client typed build passed;
the full client regression also passed all 210 tests in 23 files (35.74s).
Development fingerprint stayed unchanged within the run:
`9bff6072145d98e0ee2193e71b852833b64642aa3090a2eb118029f341a10454`.
Completion/cancellation confirmation buttons were subsequently given equal
widths/heights and alignment too. The layout case now checks both confirmation
forms at 1440/768/390, initial field focus, Back restoring the trigger's focus,
and no state change on Back. A temporary page-gutter/cell-padding expansion was
removed after the author clarified a perceived whole-page zoom issue. No global
text-size or zoom rules were changed; actual browser zoom is not yet confirmed.
The final five-case evidence rerun passed in 19.3s and the client build passed;
development fingerprint remained identical to the preceding layout run. Six
confirmation-region PNGs were added and representative captures inspected.
The complete browser inventory now includes one additional layout case; no
complete 49-case, full-server or audit rerun is claimed for this CSS adjustment.

### Compact shared workspace follow-up, October 10

The author supplied browser-toolbar screenshots confirming 100% zoom, rejected
the browser-zoom hypothesis and authorized compacting the shared interface while
retaining emphasized headers, equal aligned controls and one-line work labels.
Shared workspace text is now 15px at a 16px root, page headings cap at 40px,
and header/content spacing is reduced. Dashboard numbers are 36px with aligned
counts, smaller card/list padding and naturally sized paired panels. My Actions
uses a centered 1200px cap instead of the experimental 1440px width. No CSS zoom,
transform scale, browser setting, API/state or permission change was made.

The deliberate five-case browser/evidence run passed (22.4s), now also checking
1920px wide desktop alongside 1440/1150/768/390 where applicable. It asserts
compact text/number/heading sizes, centered work width/margins, aligned Staff
counts, single-line labels, equal progress/confirmation buttons, retained focus
and no page overflow. Dashboard feature PNGs were recaptured, including new
wide-desktop views. Representative wide desktop/mobile captures were inspected.
Full client: 23 files / 210 tests passed (39.10s); typed production build passed.
Development database/uploads stayed unchanged through this evidence run:
`9bff6072145d98e0ee2193e71b852833b64642aa3090a2eb118029f341a10454`.
The complete Chromium inventory also passed all 49 cases (4.0m), including
earlier auth/accounts/attachments/communication/queue/responsive flows and all
Actions/workflow scenarios. Development database/uploads matched the same
fingerprint before/after this full run. Ordinary full-run captures use ignored
outputs; the checked-in feature PNGs remain the deliberate compact evidence run.
No retry/timeout was raised and no assertion was skipped. No new full-server or
dependency-audit rerun is claimed for this presentation change. Author visual
acceptance/publication/peer review remain pending.

### Dashboard-only density follow-up, October 10

After reviewing the compact screenshots, the author requested less dashboard
whitespace. Wide Staff cards now reserve one label line; list links display
`View all` while keeping their descriptive accessible names and destinations,
and rows use 8px vertical padding. My Actions/shared sizes are unchanged.
Full client: 23 files / 210 tests passed (35.67s); typed build passed. The five
guarded dashboard/evidence cases passed (19.5s), additionally checking the small
label-to-count gap and same-row desktop heading/link layout. Desktop/mobile
feature captures were refreshed and representative Staff views inspected.
Development database/uploads retained the same recorded fingerprint. The
earlier complete 49-case run was not repeated for this dashboard-only adjustment;
no new full-server, audit, peer approval or author visual acceptance is claimed.

### Action field-editor alignment follow-up, October 10

The author identified Create action/Discard unsaved fields as another misaligned
pair. The scoped editor styles now share the confirmation controls' equal-size
grid and zero top margins. An added style regression test covers this contract;
the existing browser layout case now checks both create and edit form controls
at 1440/768/390px and discards without saving. Full client: 23 files / 211 tests
passed (34.63s); typed build passed; five guarded browser/evidence cases passed
(20.7s). Six cropped create/edit control captures were added and representative
desktop/mobile pairs visually inspected. Development data/uploads matched before
and after this run: `64bfed31b464fc9241afc9bc460ff651a7e9fa09917b5e827cb9644d41c16c90`.
Action IDs remain global; no renumbering, schema or save behavior changed. No
fresh complete 49-case inventory, server/audit run or author/peer approval is claimed.

### Ticket-local action numbering follow-up, October 10

The author approved Action 1, Action 2... independently per Ticket, correcting
the earlier UI choice to expose the global ID as the action's number. The read
DTOs now include `actionNumber` across detail, paged actions, current-user work
and Staff/Admin dashboards. Ordinals use immutable creation order across all
Ticket actions, not filtered-page indexes; they do not reset on reopening.
Existing records need no migration/reset. IDs in routes, writes, replay receipts
and immutable audit snapshots are unchanged; field/state/assignment semantics
and permissions remain intact. Client tests and browser fixtures now distinguish
display numbers from the internal IDs used in real writes/deep links.

Full client: 23 files / 211 tests passed (51.36s). Both typed production builds
passed. The complete server rerun passed 37 files / 290 tests (144.46s), including
the two new numbering cases. Its first attempt passed 289 tests and failed only
the new cancelled-action fixture's missing required reason; that fixture was
corrected, not the production constraint or test expectations. The 500-Ticket /
500-Action dashboard smoke still passes (8/9/9 statements, median 31/40/40ms).
The deliberate five-case feature capture run passed (33.6s), with existing
development database/uploads unchanged. Representative work-list captures show
two different Tickets each with Action 1. Earlier Action/workflow feature PNGs
are historical; final-main recapture remains a separate #44 responsibility.

The subsequent complete Chromium run passed all 49 scenarios (4.5m), including
real create/edit/replay writes with internal IDs, Action 21 paging, Requester
read-only deep links, dashboard/work number parity, closing and fresh-cycle
reopening. No assertion was skipped, timeout raised or retry increased.
Development database/uploads matched before/after this complete run:
`64bfed31b464fc9241afc9bc460ff651a7e9fa09917b5e827cb9644d41c16c90`.
The complete run wrote ignored outputs, not final-main captures. No dependency
audit rerun, publication or author/peer visual approval is claimed.

### Issue #40 executed coverage and limits

Six new test files contain 36 tests: validation 15; action APIs 6; synchronized
concurrency 7; history/snapshot/work-list 4; migration/recovery 3; seed 1.
`action-fixture.ts` supplies real-session fixtures in uniquely named isolated
test schemas. Account role/deactivation checks preserve completed performer IDs,
remove all active assignments and increment each affected Ticket only once.
CASE-26 is verified at the API level, including receipt-write rollback and exact
replay of a separately saved assignment. CASE-27's whole-cycle summary excludes
old work, includes a later-page unfinished/follow-up blocker, handles empty pages
and retains one snapshot during a synchronized concurrent write. Issue #41 adds
the UI feedback below; formal Ticket resolution enforcement remains planned #42.

Migration tests use actual pre-upgrade `pg_dump`/`psql` recovery in separate
`toktickit_lab4_*_test_<random>` databases, compare counts and whole-row digests
for all eight legacy tables, verify sequence behavior, rollback injected failed
DDL and compare the migrated schema with Prisma (no drift). No credentials or
backup contents are printed. Disposable databases/schemas are removed afterward;
development is neither reset nor migrated. CLI seed creates new deterministic
demo Tickets only; repeat runs preserve edited users, credentials, Tickets, work
and events. Existing Lab 3 migration tests now apply the new additive migration
before using current generated models, retaining their original assertions.

Executed recovery/seed command from `server`:
`npm test -- tests/lab-04/migration-regression.test.ts tests/lab-04/seed-regression.test.ts`
(2 files, 4 tests passed). The recovery harness invokes
`docker exec toktickit-postgres pg_dump -U <test-role> -d <generated-source-test-db> --no-owner --no-privileges`
and sends that in-memory backup to
`docker exec -i toktickit-postgres psql -U <test-role> -d <generated-restore-test-db> -v ON_ERROR_STOP=1`.
The placeholders describe validated runtime values, not development recovery
commands to copy blindly. Both target names are generated, verified test-only
names; before/after legacy digests match and a restored sequence yields the
expected next ID. SQL and backup contents remain private to the harness.

The Issue #40 run's 31 existing browser scenarios verified earlier screens, not
the new Lab 4 UI. Routine browser output stayed ignored; that run refreshed no
submission screenshots. Issue #41 feature captures are separately identified.

### Issue #41 executed coverage and limits

29 new component tests and 4 style-contract checks cover shared read-only history,
independent field/assignment saves, corrected completed work, lifecycle
confirmations, terminal/prior-cycle/cancelled guards, required feedback and
preserved unsaved input. Exact-retry tests retain the original payload/UUID,
including a full component reload and authentication-loss cleanup. Confirmed
create followed by a failed refresh never submits another create. Mixed parent/
child snapshots and late responses from a previous Ticket/user cannot authorize
stale saves. Action pages and immutable history pages remain independent.

Five browser journeys use real authenticated Requester, Staff and Administrator
sessions against the guarded E2E database. They verify multiple actions and
distinct creator/assignee/actual performer; fields then separate assignment;
completion/correction/cancellation; owned Requester reading and a direct mutation
403; real concurrent-write VERSION_CONFLICT with draft-preserving reload;
21 actions/21 revisions and exact deep links beyond page one; Bangkok time
precision; keyboard focus, long content and no page overflow at 1440/768/390px.
Lost-response tests first commit via the real API, then abort only delivery;
create recovery survives a browser reload and replays the original key once.
Separate assignment recovery proves exactly one event/parent increment per save.
The browser's INVALID_ASSIGNEE feedback scenario deliberately injects a definite
400 response; actual inactive-assignee serialization is independently covered
by the server API/concurrency suites, not claimed from that injected response.

Initial component tests failed before ActionsTaken existed. Browser verification
then exposed rounded action times before a freshly created Ticket, stale Result
after completion and a Requester deep-link parsing defect. Agent visual inspection
found a narrow mobile table caption; these were corrected and rerun. Three older
fully mocked responsive Ticket tests needed an empty Actions response matching
their fake session; otherwise the real API correctly returned 401. The mock was
extended, without weakening product authorization or removing assertions. An
intermediate login timeout while client/browser tests competed for CPU was rerun
sequentially; only actual completed runs belong in the result ledger.

Thirteen deliberate feature screenshots and capture provenance are in
[Actions Taken evidence](../../artifacts/lab-04/screenshots/actions-taken/README.md).
They are branch/agent verification, not author acceptance, peer approval or final
main. Workflow/checklist/dashboard release journeys and final-main captures remain
pending. The new test cleanup uses guarded test-only TRUNCATE to reset immutable
history; development is not reset, migrated or seeded. Its unchanged-state hash
now also includes any existing Action, receipt and transition tables, while
remaining compatible with a development schema that has not been upgraded.

### PR #47 legacy fixture isolation correction, 2026-10-07

Peer review on published 3addd43 exposed unmocked real Action reads in the older
detail fixtures despite the earlier local pass. The review's 121/130 result and
same-environment base/head reproduction are recorded in [reviewer.md](reviewer.md);
the earlier 2026-10-06 pass is historical, not proof of environment-independent
fixture isolation.

Test-only correction: `client/tests/support/action-fixtures.ts` returns a typed
empty ActionPage with parent version/current cycle and a zero-work resolution
summary. AttachmentSection, RequesterTicketDetail, SafeErrorStates,
RequesterCommunication, StaffTicketDetail and StaffTicketNavigation mock added
reads explicitly. The six files' 25 existing cases install a rejecting fetch
guard and assert zero network attempts; it fails even if the component handles
the rejection. Cleanup/restoration happen before leaving a failed hook. This
removes dependence on what is (or is not) listening on localhost:3000 without
stopping the author's server or using a real database.

Requester apparent resolution advances the summary from version 3 to 4; Staff
claim advances 1 to 2. Tests wait for the refreshed enabled Actions control and
assert the new summary. Staff navigation fixtures answer both numeric/string
Ticket IDs, mock eligible assignees and prove a claim was submitted before
navigating and receiving its stale response. The Notes spy is active before
Requester mount. No previous cases/assertions were removed and no timeouts were
increased. No production source, auth/schema, screenshots or development data
changed. Backend/browser/audit results from 2026-10-06 were not rerun for this
test-only correction; final-main verification remains pending.

Executed from the repository root on the local correction over 3addd43:

- `npm --prefix client test`: 18 files / 130 tests passed, 15.01s, 14:21 Bangkok.
- `npm --prefix client test -- --maxWorkers=1 --minWorkers=1`: 18 files / 130 tests
  passed, 62.70s, start 14:21:51 Bangkok.
- `npm --prefix client run build`: TypeScript and Vite build passed.
- `git diff --check`: passed after the correction/documentation edits.

All six guarded files passed with zero real fetch attempts in both completed
full runs. No uncaught errors were reported. These are local author-branch agent
runs recorded before publication, not peer acceptance. Subsequent actual
publication and acceptance are recorded in reviewer.md and the ledger below.

## Issue #42 executed coverage, 2026-10-07

Branch feature/42-ticket-workflow starts from peer-merged staging f4da089. No new
migration is necessary: #40 supplied the cycle/date/event schema and immutable
history triggers. This is feature verification, not acceptance or final main.

- workflow-rules.unit.test.ts: 69 cases independently check all 64 status pairs
  and missing-completed/unfinished/follow-up/current gate predicates.
- ticket-workflow.api.test.ts: seven cases exercise real sessions and every
  status pair, each gate blocker, stale precedence, advisory indication,
  cancellation, formal resolve/close/reopen, safe transaction failure, owned
  history/input protection, legacy null dates and 23 equal-time immutable events.
- workflow-concurrency.api.test.ts: 11 cases synchronize the shared lock boundary
  for resolve versus create/follow-up/completion, cancellation versus new work,
  reopen versus archived corrections, and account unassignment versus resolution.
  They verify atomic rollback if event persistence fails, plus revoked, inactive,
  role-changed and mandatory-password-change sessions inside the transaction.
- TicketWorkflow.test.tsx: 14 cases cover whole-cycle counts independent of visible
  items, confirmations, loading/failed/mixed version/cycle summaries, cancellation,
  status-response uncertainty/reload, reopen, history paging/retry and late replies.
- The CSS-contract suite now has five cases; actual browser assertions separately
  check wrapping, 44px controls and visible focus, not only source-text declarations.
- ticket-resolution.spec.ts: two journeys exercise a real 22-action fixture with
  a page-two blocker, completed follow-up correction, formal resolve/close/reopen,
  old-cycle read-only work, advisory indication and owned history. A second journey
  loses a response after an actual status commit, confirms no duplicate write,
  explicitly reloads and recovers an intentionally simulated history outage.

Full server run: 31 files / 269 passed, 69.00s, start 15:04:20 Bangkok. Server
TypeScript build passed. Full client default run and TypeScript/Vite build pass;
see the final checked run ledger below. All six legacy fetch guards remain
active; no uncaught errors or real-fetch attempts are accepted.

Initial red tests failed before the new rule module, API gate/history and history
component existed. Fixture mistakes exposed during verification were corrected:
required cycle/text fields, transaction-level (rather than root-delegate) outage
injection, awaited initial action reads before select, and a simulated outage
that stays active through StrictMode's duplicate reads. An early full browser
attempt timed out while application source was being edited. The clean full
rerun held application source unchanged; none of the original 36 journeys was
skipped, weakened or granted an authorization bypass.

The existing Staff operation regression moved to a generated isolated test schema
with guarded TRUNCATE teardown because immutable events prohibit ordinary delete
cleanup. Its valid resolution fixture now includes genuinely completed current-
cycle work. Legacy API-mocked detail fixtures include typed empty history pages,
with their rejecting-fetch guard unchanged. No development migration/seed/reset
or credential update occurred. Feature captures and provenance:
[workflow/README.md](../../artifacts/lab-04/screenshots/workflow/README.md).

Production dependency audits were not rerun/fixed by this workflow Issue. The
previously recorded server advisory remains a release-gate task; do not infer a
clean audit from passing tests. Dashboards/performance, final-main acceptance,
manual author visual approval, commits/push and peer review remain pending.

## Meaningful test design

Test outcomes through API/database/UI behavior, not source-text matching. Gate
tests independently build zero/completed/cancelled/active/follow-up/current/prior-cycle
work. Concurrency tests use synchronized competing requests rather than hoping
for timing races. Retry tests simulate committed writes with lost responses and
replayed payloads. Direct API tests prove role/ownership, not merely hidden buttons.
History tests include >20 entries with identical timestamps. Time tests freeze asOf
and include exact boundaries and one instant outside them. Query parity derives
expected results independently, not from the function under test.

## Explicit edge-case scenarios

Cases below define required scenarios, not an assertion that all are complete.
Use the executable coverage/status table and result ledger for actual verification;
planned workflow/dashboard/release cases must still be implemented and run.

| Case | Preconditions/trigger | Expected observable outcome | Test IDs / AC |
|---|---|---|---|
| CASE-01 | No actions, then one action, then multiple different actors' actions on one Ticket | Accurate empty/list state, correct parent and distinct creator/performer/assignee | API-01, E2E-01 / AC-02,03 |
| CASE-02 | PLANNED action with empty Result; complete without Result | Draft is valid; completion rejects with field feedback and no mutation | UNIT-01, API-01, UI-01 / AC-03 |
| CASE-03 | Follow-up true with blank/space-only Note; then clear an existing true follow-up without explanation | Reject; an explained correction succeeds with previous note retained in audit | UNIT-01, API-01, UI-01 / AC-03,07 |
| CASE-04 | Values exactly at text/time bounds and one outside; same instant in Z and +07:00 | Boundaries behave consistently, no timezone-dependent ownership/gate/count outcome | UNIT-01, UNIT-03, API-01 / AC-02,10,11 |
| CASE-05 | Ticket owned by Mali, action assigned to Suda, completed by another permitted actor | Ticket Owner unchanged; assignee distinct; actual completing actor set automatically | API-01, E2E-01 / AC-02,03 |
| CASE-06 | Inactive/Requester/missing assignee; eligible assignee deactivated during save | Reject invalid target or serialize safe removal; no active action remains assigned to ineligible account | API-02, API-03 / AC-05,06 |
| CASE-07 | Completed performer is renamed/deactivated; later edit tries to substitute actor | Historical actor ID retained; forged fields rejected; no credential/Note leakage | API-02, API-05 / AC-02,04,07 |
| CASE-08 | Action ID from Ticket A nested under Ticket B; owned/non-owned/missing IDs | Safe protected 404 and no accidental read/update of the other parent's action | API-02, API-11 / AC-04 |
| CASE-09 | Two editors submit the same observed parent/Action versions | One commits; other gets VERSION_CONFLICT; input retained and no partial event/version increment | API-04, UI-01 / AC-06,13 |
| CASE-10 | Commit succeeds but response is lost; repeated click/reload retry uses original payload/key | One action/event/parent increment; exact replay receipt; changed payload/key reuse rejects | API-04, UI-01, E2E-01 / AC-06,13 |
| CASE-11 | Session revoked/role changed after an earlier valid save; different actor supplies the same retry key | Current authorization still enforced; no disclosure or mutation through receipt replay | API-03, API-04, API-11 / AC-04,06 |
| CASE-12 | Terminal Ticket, prior-cycle action, cancelled action or forbidden state reversal | Direct API blocks mutation; UI explains read-only state and still permits authorized reading | API-02, UI-02 / AC-03,08,09 |
| CASE-13 | Resolve with zero actions, only cancelled actions, unfinished work, or completed follow-up still true | Each gate fails independently; status/version/history stay unchanged | UNIT-02, API-06, E2E-02 / AC-08 |
| CASE-14 | Complete current work, explain/clear follow-up, resolve/close, then reopen | Legal transitions recorded; new cycle/cleared indication; prior completed work cannot satisfy new resolution | API-06, UI-02, E2E-02 / AC-07,08,09 |
| CASE-15 | Cancel Ticket with active work; explicitly cancel each action then retry with refreshed version | First rejected; final Ticket cancellation succeeds without inventing completed work | API-06, E2E-02 / AC-08 |
| CASE-16 | Resolve races new action, completion, follow-up edit or account unassignment | Transaction order gives one valid serialized outcome; no resolved Ticket with newly unfinished current-cycle work | API-03, API-07 / AC-05,06,08 |
| CASE-17 | Legacy active Ticket without actions; legacy Resolved/Closed Ticket; repeated migration/seed and recovery | Existing data preserved; future resolve uses gate; legacy close allowed; reopen requires new work; no invented past dates/history | MIG-01, MIG-02, SEED-01, API-06 / AC-01,09 |
| CASE-18 | More than 20 action/history entries with equal timestamps; edit an old row; deep-link a later-page action | Stable timestamp/ID ordering, all pages reachable, edit does not reorder creation history, exact linked record opens | API-05, UI-02, UI-05, E2E-01 / AC-07,12 |
| CASE-19 | No owned Tickets/actions and no matching recent/priority/status records | Explicit zero count keys and empty arrays, helpful UI; failures/loading never masquerade as zero success | API-08, API-09, UI-03, UI-04 / AC-10,11,13 |
| CASE-20 | Owned/other-owner fixtures and multiple Staff actors; change client-supplied dashboard identity | Requester never sees other-owner data; Staff My values derive current session; identity override rejected | API-08, API-09, API-11 / AC-04,10,11 |
| CASE-21 | Records at both seven-day boundaries, just outside, null legacy resolution date and prior-cycle performed work | Exact UTC predicates; unknown dates excluded only from dated metric; actual recent performed work survives reopening | UNIT-03, API-08, API-09 / AC-10,11 |
| CASE-22 | Click every metric, reload and Back; invalid/duplicate/nested query; record changes after snapshot | Equivalent validated filters/controls; safe invalid-query feedback; captured range retained; live count changes explained by refresh | API-10, UI-05, E2E-03 / AC-12,13 |
| CASE-23 | API/network fails before save, after committed save, during refresh, or after navigation/sign-in changes | Draft/receipt rules respected; saved-versus-unsaved feedback correct; late/previous-user responses ignored | API-11, UI-01, UI-03, UI-04, UI-05 / AC-06,13 |
| CASE-24 | Long Unicode/plain-text content, HTML-like input, keyboard-only use at 1440/768/390px | Text never executes; labels/focus/paging work; no clipping/overlap/page overflow | API-02, UI-01, STYLE-01, E2E-01, EVID-01 / AC-04,15 |
| CASE-25 | Full old auth/account/Ticket/files/Comments/private Notes flows under new gate, plus dashboard smoke | Previous permissions/features remain; measured performance bounded; development hashes unchanged | REG-01, PERF-01, E2E-04, EVID-01 / AC-14,16 |
| CASE-26 | Explicit field save succeeds; after authoritative reload, separate assignment fails validation/conflict/before commit, or commits with its response lost | No combined payload/automatic second request; first fields/event/receipt remain saved exactly once, assignment draft retained and truthful separate feedback; unknown second outcome blocks other writes and retries only the original assignment payload/key with no duplicate event | API-01, API-04, UI-01, E2E-01 / AC-03,06,13 |
| CASE-27 | Page one contains qualifying completed work; page two contains PLANNED/IN_PROGRESS work or a COMPLETED action with follow-up; summary refresh fails or mismatches detail version/cycle | Whole-cycle counts block checklist and backend resolve regardless of viewed page; prior-cycle work excluded, zero/beyond-last page summary accurate; unknown/mismatched summary never shows ready or enables Resolve | API-06, API-07, UI-02, E2E-02 / AC-08,09,13 |

CASE-26 details: field PATCH containing assigneeId and assignment PATCH containing
Action fields return validation errors without changes. Valid create still saves
fields/initial assignee atomically. For a successful field save followed by failed
reload, assignment is not submitted until reload succeeds. Verify distinct keys
and refreshed versions for the two explicit operations. For a definitive failed
assignment, only the field event/version increment exists; for a committed-but-lost
assignment followed by exact replay, exactly one event/version increment exists
for EACH operation. A new explicit attempt after a definite rejection needs
reviewed current versions and a new key, not reuse of a changed retry payload.

CASE-27 details: independently query current-cycle completed/unfinished/completed-
follow-up counts and compare the returned summary on every page to the same
snapshot's parent version/cycle. Include more than 20 records, both blocker types,
old-cycle blockers, zero actions and a concurrent completion/reopen. Counts and
rows must form one consistent snapshot, never a mixture of before/after states.
Component tests intentionally provide only qualifying visible items with blocked
summary, then stale/failed summary and finally fresh matching summary; show ready
only in the last eligible case. Browser tests navigate pages and clear the actual
later-page blocker before refreshing into ready state; no bypass of the API gate.

Case coverage must include both valid and invalid examples, direct API access
and visible feedback where applicable. Confirmation of plan coverage is not
confirmation of implementation correctness.

PERF-01: isolated fixture of at least 500 Tickets plus Actions, warmed process,
five reads per role; record observed median/maximum, serialized size and database
statement count. Target median <2 seconds, payload <=64 KiB and <=12 database
statements per dashboard (transaction-control commands excluded). Bounded response/
query counts are hard checks; record runner/noise and investigate a missed local
latency target without claiming production capacity or silently skipping coverage.

## Isolation and migration evidence

Retain guarded TEST_DATABASE_URL/E2E_DATABASE_URL and isolated upload directories.
Use a separately named disposable test database for populated Lab 3 upgrade and
backup/restore checks. Never reset development. Compare counts, IDs, relations,
timestamps and credential digests without printing secret values. Test additive
migration from baseline, repeat application status, failed transaction rollback,
restore and relation integrity. Record exact commands/results once executed.

Existing Labs 1-3 suites remain in the full gate. Update old resolution fixtures
to create qualifying work for approved new behavior; do not retain a runtime bypass
or disable old suites. Historical screenshot commands must remain operable under
the final workflow or receive explicitly versioned fixtures and documented handling.

## Release commands and result ledger

Existing commands from repo root: npm --prefix server test; npm --prefix client test;
npm --prefix client run test:e2e; both package build commands; both production-only
audits; git diff --check. Prisma validate/generate/migrate and backup/seed are
explicit setup steps, not automatically a development migration side effect of tests.
Issue #41 intentional feature capture command:
`npm --prefix client run test:e2e:lab4-actions-evidence` (5 journeys).
Normal `test:e2e` keeps screenshot output ignored. To capture the feature and run
all current regressions together:
`npm --prefix client run test:e2e:lab4-actions-evidence -- e2e/lab-02 e2e/lab-03`.
Proposed final release capture command: npm --prefix client run test:e2e:lab4-evidence.
It does not exist yet and must be added with the intentional evidence journey.

| Verification | Revision/date | Result |
|---|---|---|
| Contract consistency | PR #45; corrections ff97405, approved/merged 2026-10-05 | Approved by auto4496; merge d32c8cf |
| Unit/API/component/style | Issue #40 working branch, 2026-10-05 | Full server: 28 files / 182 tests passed; existing client: 16 files / 97 tests passed. New foundation: 36 passing tests; new UI/dashboard/workflow pending |
| Migration/recovery/repeat seed | Same working branch/date | Passed rollback, populated upgrade, actual isolated backup/restore, schema alignment and repeat seed |
| Browser/performance/evidence | Same working branch/date | Existing browser suite: 31 passed (1.3m); new Lab 4 browser/performance/evidence planned |
| Builds/production audits | Same working branch/date | Server/client builds passed; client audit zero; server audit one moderate Multer finding (below) |
| Development-state hash comparison | Existing E2E run, 2026-10-05 | Before/after identical: eb767d391ae418079490e5a9ea4bfb7f5d1b0ab9d2f964faea19e24fd18885e9 |
| Issue #41 server regression | Local feature/41-actions-ui from a915812, 2026-10-06 19:38 Bangkok | npm --prefix server test: 28 files / 182 tests passed (66.14s); no development migration/seed |
| Issue #41 client regression | Same local branch, 2026-10-06 19:56 Bangkok | npm --prefix client test: 18 files / 130 tests passed (10.63s); 29 new Action component + 4 style-contract checks |
| Issue #41 browser/evidence | Same local branch, 2026-10-06; deliberate capture command above | 36 passed (2.0m), including all 31 earlier scenarios and 5 new journeys; 13 feature PNGs captured |
| Issue #41 builds/schema/patch | Same local branch/date | Both production builds, Prisma validate and git diff --check passed; audits were not rerun and the earlier Multer finding remains open |
| Issue #41 development-state comparison | Same complete browser run; expanded fingerprint includes any existing new tables | Before/after identical: 466cf880b8708645baca8cc3e1fd5b8f967103b0c7c90cf30eb5acf84648025f |
| Final-main rerun | Release pending | Planned |
| PR #47 peer reproduction | Published 3addd43, auto4496 review 2026-10-07 | 121/130 client tests passed; 9 failures/9 uncaught errors. 33 new component/style checks and 5 new browsers passed; actual limits in reviewer.md |
| PR #47 local fixture correction | Uncommitted correction over 3addd43, 2026-10-07 | Default and serial full client runs: 18 files / 130 passed each; zero fetch attempts in six guarded legacy fixture files; client typed build and patch check passed |
| PR #47 subsequent acceptance | Published 0cf9e58, 2026-10-07 | Actual auto4496 approval 5439057032; peer merge f4da089; Issue #41 closed |
| Issue #42 full server regression | Local feature/42-ticket-workflow from f4da089, 2026-10-07; start 15:04:20 Bangkok | npm --prefix server test: 31 files / 269 passed (69.00s), including 87 new rule/API/concurrency cases |
| Issue #42 full client regression | Same local branch/date; final start 15:10:43 Bangkok | npm --prefix client test: 19 files / 145 passed (10.99s); no uncaught errors or real fetch attempts in guarded fixtures |
| Issue #42 full browser regression | Same local branch/date; final clean rerun after keyboard/CSS polish | npm --prefix client run test:e2e: 38 passed (2.1m), all 36 earlier scenarios plus two workflow journeys; application source held unchanged during run |
| Issue #42 deliberate feature evidence | Same local branch/date; final capture rerun | npm --prefix client run test:e2e:lab4-workflow-evidence: 2 passed (21.4s); 12 deliberate PNGs; agent inspected desktop/mobile checklist and mobile history |
| Issue #42 builds/schema/patch/links | Same local branch/date | Both production builds passed; Prisma validate passed from server directory with normal .env loading; git diff --check passed; all local Markdown link targets exist |
| Issue #42 development-state comparison | Final full browser and deliberate evidence runs | Identical before/after: 466cf880b8708645baca8cc3e1fd5b8f967103b0c7c90cf30eb5acf84648025f |

The first schema-validation invocation from the repository root did not load
server/.env and reported missing DATABASE_URL; the unchanged schema validated
successfully when run from server. No secret was printed or environment file
modified. These Issue #42 results describe the local uncommitted feature, not
released main or peer approval; production audits remain deferred as stated below.

Store complete final-main output and actual counts/revision/date after execution.
Branch passes do not substitute for released main. No skipped required tests.
Issue #41's tested product changes were local/uncommitted during these runs and
were subsequently committed unchanged as cd5aa76005a83cecea67aaad3394729cddb6843c
(feat: add Actions Taken ticket detail UI). Documentation was committed as
3addd437518e1573fa79dccf0e08ca7cf419dc0d and both commits pushed in
[PR #47](https://github.com/Datakung/toktickit/pull/47). The 2026-10-07 test-only
correction was subsequently published as 0cf9e58, approved by auto4496 in review
5439057032 and merged as f4da089. These are historical Issue #41 checks;
the Issue #42 branch remains uncommitted.
The expanded fingerprint differs from the historical algorithm's value; its
within-run equality is the preservation check, not comparison across algorithms.

Server production audit exits 1 for Multer 2.3.0,
[GHSA-3pph-fpjx-jg34](https://github.com/advisories/GHSA-3pph-fpjx-jg34), a
moderate aborted-upload disk cleanup advisory. The advisory identifies 2.4.0 as
patched. No dependency changes are bundled into the Action foundation; track the
patch and upload regression rerun before Issue #44's final release gate. This is
an open finding, not a clean production audit.

## October 9 follow-up verification (local, uncommitted)

### Creation refinement checks

- Full client regression: 19 files / 147 tests passed, start 16:10:06 Bangkok,
  duration 14.81s. Client production build passed (typed compilation and Vite).
- Targeted browser regression: four `client/e2e/lab-02/create-ticket.spec.ts`
  checks and the existing `requester-ticket-flow.spec.ts` journey: 5 passed
  (17.7s). Covers official numeric-id redirect, one Ticket POST, waiting for both
  uploads, failure/no success banner, recovery and real file retry without duplicate
  creation, transient confirmation, ownership and existing file lifecycle.
- New component checks cover waiting for the last upload and leaving the form
  before the create response. Existing failure assertions now verify truthful
  saved-Ticket feedback, disabled duplicate creation and no success callback.
- Browser success/failure captures at 1440/390px have no horizontal overflow.
  Failure recovery has a >=44px target and visible keyboard focus. Agent inspected
  representative captures; this is not author visual acceptance or final evidence.
- One-off verification used UI 5183 / API 3100 so the author's running UI 5173 /
  API 3000 stayed available. Temporary configuration was removed afterward.
  E2E database/uploads are guarded, isolated targets. Development fingerprint
  before/after was identical:
  `7866d633897609ae8d4db76cf4c1a0caf02d33b1b6e3222f25b3a8b950534812`.
- Initial new callback assertions failed before implementation. The first full
  client rerun exposed an older login fixture reading the real Staff owners/queue;
  explicit empty mocks and the rejecting-fetch guard fixed test isolation, retaining
  its original 12 cases. A browser focus assertion initially tested pointer-mode
  programmatic focus; the final check uses Tab/Shift+Tab to verify keyboard focus.

October 7's 269 server / 38 full browser passes remain historical; neither full
suite was rerun for this client-only refinement. Do not claim 40 browser passes
from inventory. Audits and final-main verification are still pending.

Manual setup on October 9: the author copied a development pg_dump backup to
`C:/CPE/CPE334/MINE/toktickit-backups/toktickit-20261009-154930.dump`, generated the
Prisma client and applied the existing `20261005090000_actions_taken_foundation`
migration. Their status output confirms all nine migrations applied. This backup
was copied, not restore-tested here. The author then created a manual test Ticket;
that intentional change explains the fingerprint difference from October 7.
No agent development migration/seed/reset or credential change occurred.

### Separate current-status box and explicit target

The author's next refinement request adds a read-only saved status box and removes
automatic next-status selection. All eight legal-transition lists remain intact;
the Open box stays visible after opening. Ten new component checks initially
failed before the implementation. All 24 workflow component checks subsequently
passed (4.29s including test setup), retaining the original gate/history cases.

- Full client rerun: 19 files / 157 tests passed, start 16:41:34 Bangkok,
  duration 12.75s. Typed client production build passed.
- Final targeted browser/evidence rerun: 7 passed (33.8s): the four earlier Staff
  operations/communication/responsive checks plus three workflow journeys. Covers
  separate saved/proposed status, every legal Open target, selection reset,
  no-op prevention, three-width focus/44px/overflow, later-page blockers,
  resolution/close/reopen, Requester read-only access and unknown-response recovery.
- The first browser attempt passed six checks but one retained the old `Status`
  label after the UI was renamed. Corrected that remaining selector to `Change
  status to` without dropping assertions or increasing timeouts; the clean rerun
  passed all seven. Unknown-response testing now explicitly selects Open before
  saving instead of depending on automatic default selection.
- Fifteen deliberate workflow PNGs now match the new layout: twelve refreshed
  workflow regions and three new Operations status-selection captures. Agent
  inspected desktop/mobile Operations; they are not author acceptance or final
  release evidence. Capture provenance is in the workflow evidence README.
- Temporary UI 5183 / API 3100 configuration again kept the author's running
  services untouched; it was removed after verification. Development database
  and uploads were identical before/after the browser run:
  `45690586717e0d609bd40f9fa9ced28b7b7b78253ba3cd0e439cb8a9f7766618`.

No server/API/schema logic changed for this refinement. Historical full server/
browser passes remain dated above, not a claim of a full-suite October 9 browser
rerun. Author manual acceptance, commit/push, peer review and #43/#44 remain pending.

### Final two-stage layout verification, October 9

The subsequent author clarification moves New opening above Operations and shows
a separate progress panel below Operations only after opening. Two new component
cases cover rejected opening and gated New cancellation; the existing pending
opening case now also checks stage visibility and focus. The targeted three-case
run failed before implementation. All 26 workflow cases then passed; typed build
caught unsupported `exact` options on new Testing Library role queries. Corrected
those options (string role names already match exactly) without weaker assertions.

- Final full client: 19 files / 159 tests passed; start 16:58:15 Bangkok,
  duration 11.26s. Typed production client build passed.
- Final targeted browser/evidence: 8 passed (39.3s): four existing Staff operations/
  communication/responsive cases and four workflow journeys. New opening and
  progress stages, current/target separation, focus handoff, all legal Open choices,
  New cancellation, unfinished work, resolution/close/reopen and unknown-opening
  reload are verified against isolated real sessions. Desktop/tablet/mobile have
  no page overflow and visible keyboard focus/44px controls.
- Refreshed workflow evidence has 18 PNGs: twelve earlier workflow regions plus
  opening/progress panels at 1440/768/390px. Representative panels were visually
  inspected by the agent, not author-approved or released-main evidence.
- Verification again used temporary UI 5183 / API 3100 configuration, removed
  afterward. Development database/uploads were identical within the final run:
  `05d7c50ead10c75379001e9863ed7497e5d7621c29d53aff64d3aa5aab1171d0`.
- No API/schema/backend logic changed. No full-browser/server/audit rerun claimed.
  The older release-evidence journey's opening selectors and Operations capture
  region now include the separated status panel; it was not regenerated here.

These results supersede the earlier October 9 UI verification, not its historical
record. Commit/push, manual author acceptance, peer review and final release remain
pending.

### Latest checklist and action-view verification, October 9

This supersedes the earlier UI-result counts, not their dated historical record.
Author requests add green Met/red Not met rows with icons and text, larger bold
checklist/Actions headings and explicit Edit action disclosure. No backend/schema,
workflow-gate, mutation-payload or role change. Six colour checks initially failed
before implementation. Four new view/edit cases cover view-only details/history,
keyboard opening/closing and discarded draft, direct links, record switching and
return to view after creation. Existing saves keep the editor open to retain the
independent assignment draft. Read-only/unknown/conflict protections are retained.

- Colour-only intermediate run: 165 client tests / 19 files (10.82s, 17:09:22
  Bangkok), typed build and eight targeted browsers (34.3s) passed.
- Final full client: 169 tests / 19 files passed (12.12s, 17:17:03 Bangkok).
  Typed production build passed (Vite 676ms).
- Final targeted browser/evidence: 14 passed (1.7m): four Staff operations/
  responsive checks, five existing Actions Taken journeys and five workflow/UI
  journeys. All sources were unchanged during the clean browser run. Covers
  separate saves, uncertain create/assignment recovery, definite rejection,
  concurrent conflict, exact deep links, audit paging, gates and status recovery.
- At 1440/768/390px, view/edit and checklist have no page overflow. Edit works
  from keyboard, has visible focus and >=44px target, focuses the first field,
  and closing restores focus without saving. Browser checks confirm larger/bold
  checklist heading and actual red/green row colours with text contrast >=4.5:1.
  Stale/unknown overview stays neutral, requirements absent; terminal overview
  stays neutral. No colour-only status meaning is introduced.
- Final workflow evidence: 30 PNGs, including six new view/edit regions and six
  checklist blocked/ready regions. Agent inspected desktop/mobile examples;
  these are not author acceptance or final-main release evidence. Previously
  accepted Issue #41 Action screenshots were not overwritten; its regression
  captures go to ignored outputs in this run.
- First full client attempt exposed an older focus assertion racing its React
  effect; waitFor now awaits exactly the same required heading focus. Final
  clean full suite passed, without removed assertions or extended timeouts.
- Temporary UI 5183 / API 3100 config was removed after verification. Existing
  browser API headers use the actual page Origin; CSRF/Origin checks stay active.
  Development database/uploads fingerprint was identical before/after both runs:
  `90f809cf6536cd93187145cb7ccbf3012e90177edb7928934f8f0a8bdd3142d4`.

Full server, full-browser inventory and dependency audits were not rerun for these
client refinements. Manual author acceptance, commit/push, peer review and #43/#44
remain pending. No final-main readiness or clean audit is implied.

### Readiness banner emphasis follow-up, October 9

The author clarified that the top Ready/Not ready banner must stand out from the
requirement rows. Added 20–24px/800-weight text, larger icon, 20px padding and a
6px leading border. One new style case; actual computed overview size, weight,
padding and border checked for both blocked/ready at 1440/768/390px. Rules, audit
records and edit behaviour unchanged. Reread handout and inspected complete relevant
pages 6/11: immutable history is our approved interpretation of Part 7, while the
raw JSON disclosure is not a handout-mandated UI.

- Full client: 19 files / 170 tests passed, 17:24:59 Bangkok, 13.79s.
- Typed client build passed (Vite 816ms).
- Five workflow/UI browser journeys passed (46.1s); all 30 workflow PNGs refreshed.
  Larger overview, actual contrast, keyboard focus, 44px targets and no overflow
  verified. Agent inspected final blocked/ready overview at desktop/mobile.
- UI 5183 / API 3100 temporary config removed. Development database/uploads
  identical before/after:
  `bbf6109562e728196482780e6c8aa5d34a3b5e46e8c7a93efbe04eb298928102`.
  Differences from earlier hashes reflect the author's intervening manual work;
  preservation is checked within each run. No agent development mutation occurred.
- Earlier 14 targeted browser passes remain dated historical verification, not
  an additional 14-test rerun of this CSS-only change. No full server/full browser
  inventory/audit rerun, author acceptance, commit/push or peer approval claimed.

### Readable action audit follow-up, October 9

Following explicit author approval, revision details now show only changed business
fields, with friendly labels, Yes/No and Bangkok dates. Creation shows initial
details without an empty Before column. Actor/time/reason remain visible. Unchanged
fields and internal record IDs are excluded from this readable view, not from the
stored snapshots. Unknown account names remain honest Account #ID labels. Original
snapshots are retained exactly under collapsed, keyboard-operable Technical details.
No API/schema/history persistence or role/ownership change was made.

- Full client: 20 files / 176 tests passed, 17:34:11 Bangkok, 32.11s, using
  `npm --prefix client test -- --maxWorkers=2 --minWorkers=1`.
  An initial default-parallel attempt passed 175 but timed out in an older creation
  error-state test; the limited-worker rerun passed without changing assertions or
  timeouts. All six new readable-audit cases passed in both runs.
- Typed client build passed (Vite 715ms).
- Eleven targeted browser journeys passed (1.8m): five Actions Taken and six
  workflow/UI journeys. Real Staff and owning Requester history at 1440/768/390px
  verifies changed-only values, Yes/No, actor attribution, initially collapsed
  disclosure, visible keyboard focus/44px target and no overflow even for long text.
  Expanded JSON is compared exactly to API snapshots; history is identical before
  and after viewing. Requester still cannot edit. Earlier workflow/gate/recovery
  assertions remain active.
- Thirty-six workflow PNGs were deliberately generated. Agent inspected readable
  audit at desktop Staff and mobile Requester widths; this is not author acceptance.
  Accepted Issue #41 PNGs were not overwritten.
- Temporary isolated UI 5183 / API 3100 configuration removed. Development
  database/uploads matched before and after this run:
  `67839b10333d11982859906c2827200bdf178033835068722abfa89cfbf7e119`.
  Within-run preservation is separate from intervening author manual changes.
- No full-server/full-browser-inventory/dependency-audit rerun is claimed. Author
  manual acceptance, commit/push and peer review remain pending; no final-main
  acceptance or clean dependency audit is implied.

### Close detail follow-up, October 9

Author-requested Close detail hides details/editor/audit and returns keyboard
focus to View, with heading fallback for off-page records. Staff and Requesters
can reopen saved records. Editing uses the explicit Discard changes and close
detail label; pending/uncertain saves and refresh recovery cannot be dismissed.
No write/deletion/API change. List refresh keeps deliberately closed deep links
closed, and late audit reads are invalidated. Five new component cases failed
before implementation; an existing recovery case retains its exact-retry checks
and additionally checks the disabled close control.

- Full client: 20 files / 181 tests passed, 17:43:35 Bangkok, 34.98s, limited to
  two workers. Action suite: 38 cases. Typed build passed (Vite 735ms), after
  correcting three unsupported exact query options caught by TypeScript; no
  assertion or timeout was weakened.
- Six workflow/UI browser journeys passed (1.1m). Staff/owning Requester at
  1440/768/390px verify keyboard Close/View, returned focus, a 44px close target,
  no reopened detail after refresh and no changed history. The editor journey
  discards unsaved input and reopens saved details at all three widths. Earlier
  workflow/gate/recovery and exact snapshot assertions remain active.
- Temporary UI 5183 / API 3100 config removed. Development database/uploads
  unchanged before/after:
  `67839b10333d11982859906c2827200bdf178033835068722abfa89cfbf7e119`.
  This run wrote only ignored screenshots; the 36 persistent feature PNGs remain
  the prior readable-audit run and are not claimed as fresh Close detail evidence.
- No full-server/full-browser-inventory/dependency-audit rerun, author manual
  acceptance, commit/push or peer approval claimed.

### Independent Action progress follow-up, October 9

The author approved exposing Start/Complete/Cancel directly below saved details,
before the optional field editor. These are independent state saves, not field
edits. Six added cases and the revised view-mode assertion failed before the move.
Existing completion Result/performer confirmation, cancellation reason/confirmation,
read-only role/cycle/terminal rules and exact-key recovery assertions remain. Unknown
state-only recovery no longer opens an unrelated field editor. No API/backend/schema
or recorded-event change was made.

- Full client: 20 files / 187 tests passed, 18:05:09 Bangkok, 34.28s, using two
  workers. Action component suite: 44 cases. An earlier run had two new failures
  caused by tests retaining detached buttons after Back remounted the controls;
  querying the current buttons fixed those tests with the same focus assertions.
- Final typed client build passed (Vite 1.27s).
- Eleven targeted browser journeys passed (2.4m): five Actions and six workflow/UI.
  Actual Staff starts and Administrator completes without the editor; a distinct
  Planned action is cancelled directly. Corrections still explicitly open Edit.
  Independent assignment/field payloads, performers, Requester access, lost responses,
  conflicts, paging and whole-cycle resolve/close/reopen assertions remain active.
  At 1440/768/390px, view mode shows progress controls, keyboard completion opens
  only its confirmation, Back restores focus, target height is >=44px and no page
  overflow occurs. Close/reopen/draft discard and exact snapshot checks also pass.
- All 39 workflow PNGs generated deliberately, including three new action-progress
  captures. Agent inspected desktop/mobile progress. Accepted Issue #41 PNGs were
  not overwritten; their regression screenshots remain ignored outputs.
- Temporary isolated UI 5183 / API 3100 config removed. Development database and
  uploads unchanged within this run:
  `cbf37924909c38917a7d61afeb3f513892672be03386ef1be2a99fd97670fafb`.
  Across-run changes reflect intervening author manual work, not agent migration,
  seed, reset or credential changes.
- No full-server/full-browser-inventory/dependency-audit rerun, author manual
  acceptance, commit/push or independent peer approval claimed. Issues #43/#44
  and final-main acceptance remain pending.

### Final feature-PR verification, October 9

This later record supersedes the earlier pending full-regression/publication
notes above, while preserving their actual dated results and limitations.

- Full server: 31 files / 269 tests passed, 18:21:32 Bangkok, 106.13s,
  using `npm --prefix server test`. Server production build passed.
- Full client: the final product changes passed 20 files / 187 tests at
  18:05:09 Bangkok (34.28s, two workers). The publication typed build also passed
  (Vite 1.55s); subsequent test-origin corrections did not change product code.
- Full browser inventory: 44 tests passed (4.0m), using temporary isolated UI
  5183 / API 3100 configuration. The first attempt passed 42 and failed only two
  older secondary-context navigations hard-coded to unavailable port 5173.
  Three URLs now derive their origin from the active test page. The full rerun
  retains all authentication/reset/revocation/role assertions; no assertion,
  timeout or retry was weakened. Temporary configuration removed after completion.
- Development database/uploads unchanged within both full browser attempts:
  `bd723571386f81ec515cd44c9b7d2e97d0393bd7c874392d8c65691ae24118f2`.
  Tests use guarded disposable targets; no development migration, seed, reset or
  credential change was performed.
- The author exercised Ticket `TKT-20261009-DE4TLN` through formal resolution,
  closure, reopening and fresh-cycle completed work. Read-only saved-state checks
  confirmed cycle-2 Resolved/Closed events, cycle-3 Reopened/In Progress events,
  cleared resolution/advisory dates and retention of all earlier actions. At the
  latest inspection, cycle 3 had one completed action and no unfinished work or
  outstanding completed-action follow-up. This is exercised-flow evidence, not
  blanket final author visual acceptance or independent peer approval.
- The 39 feature PNGs remain the deliberate independent-progress capture run;
  this full inventory wrote ignored outputs only. Agent screenshot inspection is
  separate from author acceptance and final-main release captures.
- Prepared for an Issue #42 feature PR to `lab4-staging`. Peer approval/merge,
  dashboards (#43), release (#44), final-main acceptance and final author Lab 4
  reflection remain pending. Dependency audit was not rerun: the recorded moderate
  server Multer advisory remains a release-gate item, not a claimed clean audit.

## Submission mapping

Answer Part 3 includes rendered plan, AC mapping, actual test paths and complete
passing main output. Part 5 includes dashboard query parity. Part 6 includes action
validation/roles/lifecycle. Part 7 includes workflow and immutable history. Part 8
includes Requester metrics/ownership and regression. Part 9 includes real captures,
responsive/focus checks and truthful author/agent visual provenance.

## Issue #44 release-candidate gate, 2026-10-10

This phase starts at accepted staging 4660ac6 on feature/44-quality-release.
Fresh production audit initially found Multer 2.3.0 (moderate orphaned aborted
upload writes) and proxy-addr 2.0.7 (critical mapped-address trust advisory).
Full audits additionally found vulnerable Vitest/tool dependencies (9 server,
7 client findings total). Compatible updates resolved Multer 2.4.0,
proxy-addr 2.0.8, Vite 6.4.4, Vitest 4.1.11 and source-map-js 1.2.2; all four
fresh production/full audits subsequently exited zero with no reported findings.
Vite/Express remain on their existing major versions; no Prisma/schema upgrade.
Primary sources: [Multer advisory](https://github.com/advisories/GHSA-3pph-fpjx-jg34),
[proxy advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), and
[Vitest migration guide](https://v4.vitest.dev/guide/migration.html).

The first targeted test setup failed because the existing PostgreSQL container
was stopped. Starting that existing container restored test connectivity; no
development migration/seed/reset occurred. Preserve that initial output rather
than representing it as a product test failure or silently deleting it.

Preliminary complete reruns passed 291 server cases, then 293 including proxy
checks; 211 client cases; both builds; schema validation; all 49 Chromium cases
(4.4m). Five additional safe-error/recovery cases passed separately. The complete
reproducible gate includes every new case. Its uninterrupted run finished at
23:02:19 Bangkok: 40 server files / 298 tests (97.31s command duration),
23 client files / 211 tests (36.28s), 49 Chromium cases (4.3m), both production
builds, Prisma validation, all four zero-finding audits and diff checks passed.
The manifest records base revision 4660ac6 with a dirty working tree: this is
tested local candidate content, not a claimed committed revision or final main.
JSON reports retain per-case results and file paths; no skips/todos/flaky retries.

The 500-Ticket / 500-Action local performance smoke measured five samples per
role: Requester median/max 14/15ms, Staff 15/19ms, Administrator 15/16ms;
maximum query statements 8/9/9 and response bytes 1697/3717/2401. These are
local smoke measurements, not production latency guarantees.

The expanded development digest includes Sessions, Comments, Internal Notes and
Prisma migration history. Its before/after value for the entire gate was
53a3235133832dae4df2e5e1e40711f5b844796d78b2cbdd776185e1d1d62ab3.
This algorithm intentionally differs from older hashes; only within-run equality
is a preservation claim. Browser retries remain zero. No required skip/todo/only
markers were found in test sources. Final main must run the same gate with
`./scripts/lab4-quality-gate.ps1 -FinalMain` after peer release approval/merge.

Eighteen agent-inspected, byte-verified copies from this gate are retained with
source paths, capture timestamps and SHA-256 digests. See the
[gate manifest](../../artifacts/lab-04/quality-gate/manifest.json),
[complete output](../../artifacts/lab-04/quality-gate/README.md) and
[visual provenance](../../artifacts/lab-04/quality-gate/visual-evidence.md).
The clean-main guard was exercised on this dirty feature checkout and correctly
refused before running checks or replacing evidence. That is a guard check, not
a final-main run. Final peer approval, final captures/PDF and Project Done remain pending.

The author subsequently authorized publication. The verified candidate was
committed as 15d8b38, with original terminal-log attributes in d818986, and pushed
in [PR #50](https://github.com/Datakung/toktickit/pull/50) to `lab4-staging`.
Source/screenshot fingerprints were rechecked before publication and match the
retained evidence. Publication documentation adds no product/test changes and
does not turn the dirty-start candidate run into a clean-main or new test run.
