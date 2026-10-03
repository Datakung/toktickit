# Lab 4 Test Plan and Traceability

Status: Planned only, 2026-10-03. No Lab 4 tests have run and none of the new test
paths below exists yet. Historical Lab 3 counts are not Lab 4 passing evidence.
Create tests before or alongside their implementation Issue, not only at release.

## Planned executable coverage

Paths are repository-relative; every row is currently Planned.

| Test ID | Type | AC | Scenario and expected result | Planned file | Final status |
|---|---|---|---|---|---|
| MIG-01 | Migration/integration | AC-01 | Upgrade populated Lab 3 schema; all historical values/relations preserved; legacy cycle/date behavior explicit | server/tests/lab-04/migration-regression.test.ts | Planned |
| MIG-02 | Recovery/integration | AC-01 | Failed migration rollback and isolated pre-migration backup restore compared against original records | server/tests/lab-04/migration-regression.test.ts | Planned |
| SEED-01 | Integration | AC-01 | Run twice after manual fixture edits; no duplicate records/events or credential/edit reset; zero/one/multiple work | server/tests/lab-04/seed-regression.test.ts | Planned |
| UNIT-01 | Unit | AC-02,03 | Description/result/time/boolean/note/reason/ID/UUID boundaries and unknown-key rejection | server/tests/lab-04/action-validation.unit.test.ts | Planned |
| UNIT-02 | Unit | AC-08,09 | All action/Ticket edges and pure gate/cycle predicate, including cancelled-only work | server/tests/lab-04/workflow-rules.unit.test.ts | Planned |
| UNIT-03 | Unit | AC-10,11,12 | UTC range boundaries, status-group/date-pair parsing and stable query rules | server/tests/lab-04/dashboard-query.unit.test.ts | Planned |
| API-01 | API | AC-02,03 | Multiple actions, automatic creator/performer, independent assignment, fields and valid lifecycle | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-02 | API | AC-03,04,05 | Direct forbidden/owned reads, forged actor, forced-change, inactive/Requester assignee, terminal/prior-cycle guards | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-03 | API/concurrency | AC-05,06 | Concurrent account change/assignment; account-integrity unassignment retains performer/events | server/tests/lab-04/action-concurrency.api.test.ts | Planned |
| API-04 | API/concurrency | AC-06 | Simultaneous writes, stale parent/child version, exact replay after lost response, reused UUID mismatch and rollback | server/tests/lab-04/action-concurrency.api.test.ts | Planned |
| API-05 | API | AC-07 | Revisions retained past page one; equal-time ID tie-break; correction reasons; no history edit/delete; no Notes leakage | server/tests/lab-04/action-history.api.test.ts | Planned |
| API-06 | API/workflow | AC-08,09 | All eight-status edges; each gate failure, legal resolution/cancellation/reopen, advisory indication, legacy terminal close | server/tests/lab-04/ticket-workflow.api.test.ts | Planned |
| API-07 | API/concurrency | AC-06,08,09 | Action update/completion/creation races against resolve/cancel/reopen; one consistent outcome | server/tests/lab-04/ticket-workflow.api.test.ts | Planned |
| API-08 | API/dashboard | AC-10 | Independent owned queries, zero account, other-owner exclusion, exact inclusive UTC boundaries and legacy null dates | server/tests/lab-04/requester-dashboard.api.test.ts | Planned |
| API-09 | API/dashboard | AC-11 | Staff/Admin metrics, current-user work, zero status/priority keys, snapshots and <=5 lists match queries | server/tests/lab-04/staff-dashboard.api.test.ts | Planned |
| API-10 | API | AC-12 | Additive Ticket/work-list filters match each dashboard predicate and retain existing defaults/errors | server/tests/lab-04/dashboard-drill-down.api.test.ts | Planned |
| API-11 | API/errors | AC-04,13 | Session/CSRF restrictions, protected resources and generic errors; service remains healthy after failure | server/tests/lab-04/safe-errors.api.test.ts | Planned |
| UI-01 | Component | AC-02,03,05,06,13 | Action form/lifecycle, required feedback, input retention, exact retry key and saved-but-refresh-failed state | client/tests/lab-04/ActionsTaken.test.tsx | Planned |
| UI-02 | Component | AC-04,07,08,09,13 | Gate/history/reopen/read-only view, paging, advisory indication and safe conflict reload | client/tests/lab-04/TicketWorkflow.test.tsx | Planned |
| UI-03 | Component | AC-10,12,13 | Owned dashboard zero/loading/ready/failure/refresh, labels and real drill-down navigation | client/tests/lab-04/RequesterDashboard.test.tsx | Planned |
| UI-04 | Component | AC-11,12,13 | Staff/Admin metrics/work/safe states, meaningful zeroes and bounded lists | client/tests/lab-04/StaffDashboard.test.tsx | Planned |
| UI-05 | Component | AC-12,13 | URL hydration, invalid query, reload/Back and stale responses after navigation | client/tests/lab-04/DashboardNavigation.test.tsx | Planned |
| STYLE-01 | UI style | AC-15 | Reused tokens, labeled states and responsive rules where meaningful computed-style checks apply | client/tests/lab-04/ui-style.test.tsx | Planned |
| REG-01 | API regression | AC-14 | Real-session auth and earlier owned/file/Comment/Note/Staff/Admin flows with the approved new gate | server/tests/lab-04/full-regression.api.test.ts | Planned |
| PERF-01 | Performance smoke | AC-11,16 | Bounded query count/payload and measured dashboard smoke on representative seeded data | server/tests/lab-04/dashboard-performance.test.ts | Planned |
| E2E-01 | Browser | AC-02-07,13,15 | Different actors create/assign/edit/start/complete/cancel multiple actions; Requester read-only and direct denial | client/e2e/lab-04/actions-taken-flow.spec.ts | Planned |
| E2E-02 | Browser | AC-07-09,13,15 | Missing/active/follow-up work blocks resolution; corrected work resolves/closes; reopen needs new cycle | client/e2e/lab-04/ticket-resolution.spec.ts | Planned |
| E2E-03 | Browser | AC-10-13,15 | Both dashboards, current-user work, query parity, exact drill-down and zero/failure states | client/e2e/lab-04/dashboards.spec.ts | Planned |
| E2E-04 | Browser/regression | AC-14,16 | Authentication/change/logout, Requester/file flows, communication/privacy and Admin safeguards remain valid | client/e2e/lab-04/final-regression.spec.ts | Planned |
| EVID-01 | Browser/evidence | AC-10-16 | Deliberate final-main captures at three widths, query comparison and unchanged development state | client/e2e/lab-04/release-evidence.spec.ts | Planned |

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

Every case below is Planned, not a passing result. Test IDs refer to the table
above; implement the scenario with those suites and retain the actual result.

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
Proposed new capture command: npm --prefix client run test:e2e:lab4-evidence.
It does not exist yet and must be added with the intentional evidence journey.

| Verification | Revision/date | Result |
|---|---|---|
| Contract consistency | Draft 2026-10-03 | Draft review pending |
| Unit/API/component/style | Not executed | Planned |
| Migration/recovery/repeat seed | Not executed | Planned |
| Browser/performance/evidence | Not executed | Planned |
| Builds/production audits | Not executed for Lab 4 | Planned |
| Development-state hash comparison | Not executed for Lab 4 | Planned |
| Final-main rerun | Release pending | Planned |

Store complete final-main output and actual counts/revision/date after execution.
Branch passes do not substitute for released main. No skipped required tests.

## Submission mapping

Answer Part 3 includes rendered plan, AC mapping, actual test paths and complete
passing main output. Part 5 includes dashboard query parity. Part 6 includes action
validation/roles/lifecycle. Part 7 includes workflow and immutable history. Part 8
includes Requester metrics/ownership and regression. Part 9 includes real captures,
responsive/focus checks and truthful author/agent visual provenance.
