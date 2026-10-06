# Lab 4 Test Plan and Traceability

Status: Approved contract and accepted Issue #40 foundation (PR #46, merge
a915812). Issue #41 Actions Taken UI is implemented locally on
feature/41-actions-ui from a915812, with verification recorded below. Author
acceptance and independent peer review of #41 remain pending. Formal Ticket
workflow (#42), dashboards (#43) and final release (#44) are still planned.
Historical counts are not substituted for this branch's actual runs.

## Planned executable coverage

Paths are repository-relative. Passed rows exist and were executed for Issue #40;
Partly verified rows explicitly identify unfinished scope. No final-main release
status is implied by a branch pass.

| Test ID | Type | AC | Scenario and expected result | Actual/planned file | Current status |
|---|---|---|---|---|---|
| MIG-01 | Migration/integration | AC-01 | Upgrade populated Lab 3 schema; all historical values/relations preserved; legacy cycle/date behavior explicit | server/tests/lab-04/migration-regression.test.ts | Passed |
| MIG-02 | Recovery/integration | AC-01 | Failed migration rollback and isolated pre-migration backup restore compared against original records | server/tests/lab-04/migration-regression.test.ts | Passed |
| SEED-01 | Integration | AC-01 | Run twice after manual fixture edits; no duplicate records/events or credential/edit reset; zero/one/multiple work | server/tests/lab-04/seed-regression.test.ts | Passed |
| UNIT-01 | Unit | AC-02,03 | Description/result/time/boolean/note/reason/ID/UUID boundaries and unknown-key rejection | server/tests/lab-04/action-validation.unit.test.ts | Passed |
| UNIT-02 | Unit | AC-08,09 | All action/Ticket edges and pure gate/cycle predicate, including cancelled-only work | server/tests/lab-04/workflow-rules.unit.test.ts | Planned |
| UNIT-03 | Unit | AC-10,11,12 | UTC range boundaries, status-group/date-pair parsing and stable query rules | server/tests/lab-04/dashboard-query.unit.test.ts | Planned |
| API-01 | API | AC-02,03 | Multiple actions, automatic creator/performer, independent assignment, fields and valid lifecycle | server/tests/lab-04/actions-taken.api.test.ts | Passed |
| API-02 | API | AC-03,04,05 | Direct forbidden/owned reads, forged actor, forced-change, inactive/Requester assignee, terminal/prior-cycle guards | server/tests/lab-04/actions-taken.api.test.ts | Passed |
| API-03 | API/concurrency | AC-05,06 | Concurrent account change/assignment; account-integrity unassignment retains performer/events | server/tests/lab-04/action-concurrency.api.test.ts | Passed |
| API-04 | API/concurrency | AC-06 | Simultaneous writes, stale parent/child version, exact replay after lost response, reused UUID mismatch and rollback; independent edit succeeds then assignment fails or loses response | server/tests/lab-04/action-concurrency.api.test.ts | Passed |
| API-05 | API | AC-07 | Revisions retained past page one; equal-time ID tie-break; correction reasons; no history edit/delete; no Notes leakage | server/tests/lab-04/action-history.api.test.ts | Passed |
| API-06 | API/workflow | AC-08,09 | All eight-status edges; each gate failure, legal resolution/cancellation/reopen, advisory indication, legacy terminal close; whole-cycle snapshot summary with later-page blockers | server/tests/lab-04/action-history.api.test.ts (actual summary); server/tests/lab-04/ticket-workflow.api.test.ts (planned transitions) | Partly verified: summary passes; Ticket gate/transitions pending #42 |
| API-07 | API/concurrency | AC-06,08,09 | Action update/completion/creation races against resolve/cancel/reopen; one consistent outcome | server/tests/lab-04/ticket-workflow.api.test.ts | Planned |
| API-08 | API/dashboard | AC-10 | Independent owned queries, zero account, other-owner exclusion, exact inclusive UTC boundaries and legacy null dates | server/tests/lab-04/requester-dashboard.api.test.ts | Planned |
| API-09 | API/dashboard | AC-11 | Staff/Admin metrics, current-user work, zero status/priority keys, snapshots and <=5 lists match queries | server/tests/lab-04/staff-dashboard.api.test.ts | Planned |
| API-10 | API | AC-12 | Additive Ticket/work-list filters match each dashboard predicate and retain existing defaults/errors | server/tests/lab-04/dashboard-drill-down.api.test.ts | Planned |
| API-11 | API/errors | AC-04,13 | Session/CSRF restrictions, protected resources and generic errors; service remains healthy after failure | server/tests/lab-04/actions-taken.api.test.ts (actual); server/tests/lab-04/safe-errors.api.test.ts (planned wider gate) | Partly verified: Action APIs pass; dashboard/workflow follow |
| UI-01 | Component | AC-02,03,05,06,13 | Separate field/assignment saves, lifecycle, required feedback, input retention, exact retry key, earlier-success/later-failure feedback and saved-but-refresh-failed state | client/tests/lab-04/ActionsTaken.test.tsx | Passed: 29 Action component cases |
| UI-02 | Component | AC-04,07,08,09,13 | Gate/history/reopen/read-only view, paging, advisory indication and safe conflict reload; authoritative checklist excludes page-local inference and stale/unknown positive results | client/tests/lab-04/TicketWorkflow.test.tsx | Planned |
| UI-03 | Component | AC-10,12,13 | Owned dashboard zero/loading/ready/failure/refresh, labels and real drill-down navigation | client/tests/lab-04/RequesterDashboard.test.tsx | Planned |
| UI-04 | Component | AC-11,12,13 | Staff/Admin metrics/work/safe states, meaningful zeroes and bounded lists | client/tests/lab-04/StaffDashboard.test.tsx | Planned |
| UI-05 | Component | AC-12,13 | URL hydration, invalid query, reload/Back and stale responses after navigation | client/tests/lab-04/DashboardNavigation.test.tsx | Planned |
| STYLE-01 | UI style | AC-15 | Reused tokens, labeled states and responsive rules where meaningful computed-style checks apply | client/tests/lab-04/ui-style.test.tsx | Partly verified: 4 Action CSS-contract checks plus real-browser computed layout/focus; future workflow/dashboard styles pending |
| REG-01 | API regression | AC-14 | Real-session auth and earlier owned/file/Comment/Note/Staff/Admin flows with the approved new gate | server/tests/lab-04/full-regression.api.test.ts | Planned |
| PERF-01 | Performance smoke | AC-11,16 | Bounded query count/payload and measured dashboard smoke on representative seeded data | server/tests/lab-04/dashboard-performance.test.ts | Planned |
| E2E-01 | Browser | AC-02-07,13,15 | Different actors create/assign/edit/start/complete/cancel multiple actions; independent edit then failed/uncertain assignment; Requester read-only and direct denial | client/e2e/lab-04/actions-taken-flow.spec.ts | Passed: 5 feature browser journeys; final-main release evidence remains separate |
| E2E-02 | Browser | AC-07-09,13,15 | Missing/active/follow-up work including later-page blockers prevents resolution/checklist readiness; corrected work resolves/closes; reopen needs new cycle | client/e2e/lab-04/ticket-resolution.spec.ts | Planned |
| E2E-03 | Browser | AC-10-13,15 | Both dashboards, current-user work, query parity, exact drill-down and zero/failure states | client/e2e/lab-04/dashboards.spec.ts | Planned |
| E2E-04 | Browser/regression | AC-14,16 | Authentication/change/logout, Requester/file flows, communication/privacy and Admin safeguards remain valid | client/e2e/lab-04/final-regression.spec.ts | Planned |
| EVID-01 | Browser/evidence | AC-10-16 | Deliberate final-main captures at three widths, query comparison and unchanged development state | client/e2e/lab-04/release-evidence.spec.ts | Planned |

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

Store complete final-main output and actual counts/revision/date after execution.
Branch passes do not substitute for released main. No skipped required tests.
Issue #41's tested product changes were local/uncommitted during these runs and
were subsequently committed unchanged as cd5aa76005a83cecea67aaad3394729cddb6843c
(feat: add Actions Taken ticket detail UI). Documentation commit/push and PR are
still pending; record their actual IDs/links after publication.
The expanded fingerprint differs from the historical algorithm's value; its
within-run equality is the preservation check, not comparison across algorithms.

Server production audit exits 1 for Multer 2.3.0,
[GHSA-3pph-fpjx-jg34](https://github.com/advisories/GHSA-3pph-fpjx-jg34), a
moderate aborted-upload disk cleanup advisory. The advisory identifies 2.4.0 as
patched. No dependency changes are bundled into the Action foundation; track the
patch and upload regression rerun before Issue #44's final release gate. This is
an open finding, not a clean production audit.

## Submission mapping

Answer Part 3 includes rendered plan, AC mapping, actual test paths and complete
passing main output. Part 5 includes dashboard query parity. Part 6 includes action
validation/roles/lifecycle. Part 7 includes workflow and immutable history. Part 8
includes Requester metrics/ownership and regression. Part 9 includes real captures,
responsive/focus checks and truthful author/agent visual provenance.
