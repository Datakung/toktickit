# Lab 3 Planned Tests and Traceability

Status: Evolving traceability record. Issue #25 established the plan; Issues #26–29 have executable branch-level evidence. Final release results remain planned until Issue #30.

## PR #35 review correction verification (2026-09-26, local branch)

After Phanuwit's changes-requested review, the full client suite passed 16 files / 97 tests, including new two-kind history pagination/post/reload and out-of-order Staff Ticket response regressions; the isolated requester-detail retry also passed. The full backend suite passed 22 files / 146 tests after starting the local PostgreSQL container. Both production builds passed. The complete Chromium suite passed 30 scenarios using isolated data, with development database and uploads unchanged (`eb767d391ae418079490e5a9ea4bfb7f5d1b0ab9d2f964faea19e24fd18885e9` before/after). The first restricted browser launch failed before tests at Windows `uv_os_get_passwd`; the approved outside-sandbox rerun passed. These are local correction results, not peer approval or final-main release evidence.

## Issue #29 branch verification (2026-09-25)

- Backend: all 22 files / 146 tests passed. The 12 focused migration/operations/communication tests across `migration-regression`, `staff-ticket-detail`, `comments-notes` and `ticket-rules` cover protected safe detail, atomic competing claims, stale versions, owner eligibility, priority and terminal guards, the approved transition matrix, resolution indication/reopen behavior, append-only comments, strict note privacy, pagination/input validation, and active-versus-removed Staff Attachment downloads. The disposable migration fixture proves the new indication column and both history tables while retaining prior IDs, timestamps and Attachment removal metadata.
- Client: all 14 files / 93 tests passed. Five new component scenarios cover displayed-version submissions, conflict input preservation with explicit reload, public/private separation, Requester indication without a formal status change, and absence of Internal Notes from the Requester UI. Existing Lab 1/2, authentication, queue and Administrator component suites remained green.
- Browser: the complete 30-scenario Chromium suite passed using real sessions and isolated data. Four Issue #29 scenarios sign in as Mali Support, find the deterministic Ticket, claim it, change IT Priority and status, post a Public Comment and Internal Note, download an active Attachment, then sign in as the owning Requester to prove public visibility, direct note denial and apparent-resolution indication. Staff Ticket Detail also passed 1440/768/390px focus and no-horizontal-overflow checks. Development database/uploads SHA-256 matched before/after: `6940a80412be5e02c32c6b409adeedf70a1f7f898d2e044097385646bc576865`.
- Both production builds passed. The first browser starts were blocked before tests because the restricted process could not read Windows user information (`uv_os_get_passwd` ENOMEM); the approved outside-sandbox run reached the app. A first Issue #29 flow exposed a test timing race after sign-in, and the first full suite exposed three old mocked detail fixtures without the new comments response plus one obsolete button-role assertion. Correcting those test assumptions produced the final 30/30 pass.

These automated results are local branch evidence, not peer approval or final-main release evidence.

Author manual checks (local development branch, 2026-09-25): Mali Support opened a nonterminal Ticket, exercised claim, IT Priority and an allowed status transition, posted separate Public Comment and Internal Note content, and checked active Attachment download where available. The owning Requester could see the Public Comment but not the Internal Note. Anan used **Problem Appears Resolved** on an Open Ticket; the indication succeeded while the formal status correctly remained Open. These checks are author acceptance, not peer approval or final-main release evidence.

## Issue #28 branch verification (2026-09-16)

- Backend: 19 files / 137 tests passed. Six new Staff queue API scenarios cover anonymous/Requester/mandatory-change denial, Staff and Administrator access, safe DTOs, literal `%_` search, combined reference/owner/assignment/status/priority filters, strict invalid queries, deterministic ordering/pagination, active eligible owners and safe injected failure. Requester regression checks now exercise all eight accepted status values.
- Client: 12 files / 88 tests passed. Four queue component scenarios cover loading, useful assigned/unassigned summaries, detail navigation, combined controls/page reset/clear, empty/no-results, safe failure/retry and retained reference choices. The inherited My Tickets suite verifies all eight exact status labels.
- Browser: all 26 Chromium scenarios passed with real cookie sessions and the isolated E2E database. Five new queue scenarios cover filter/sort/pagination/detail destination, Requester UI/API denial and inspected 1440/768/390px layouts with no page overflow; the other 21 preserve Lab 2, authentication and Administrator flows. Development database/uploads SHA-256 matched before/after: `d874e28e612c7c7f3cafd8560bd021d8b9a576fdd34382c6ff7ab0407e8b8175`.
- Both production builds passed. The first browser launch failed before tests because Windows returned ENOMEM while starting `tsx`; the isolated rerun passed all five and is the result reported above. No development migration or seed was run by these tests.

Author manual checks (local development branch, 2026-09-17, screenshots and confirmation supplied in conversation): Administrator and Mali Support (IT Staff) both opened the shared queue with 24 Tickets across three pages; the IT Staff identity and navigation were correct; at the 390px mobile width the filters and labeled Ticket cards remained readable and an Inspect-console measurement reported no page-level horizontal overflow; a Requester navigating directly to `/staff/tickets` received the safe Access denied screen with no queue data displayed. Search/filter/order behavior and the other responsive widths remain supported by the automated browser evidence above rather than claimed as separate manual checks.

These are local branch results and author checks, not peer approval or final-main release evidence.

## Issue #27 branch verification (2026-09-15)

Author manual checks (local development branch, screenshots and confirmation supplied in conversation): created `lab3.manual@example.test`; renamed it to Lab 3 Updated User; deactivated/reactivated it and verified inclusion/exclusion under both status filters; reset its password and confirmed mandatory change before My Tickets; rejected duplicate email while retaining name/email and clearing the password; denied the Requester direct access to `/admin/users`; returned via Go to my workspace to `/tickets` with the same Requester identity. These checks are not peer approval or final-main PDF evidence. Concurrent account safety remains covered by automated tests, not claimed as manually exercised.

User-requested follow-up: Active/Inactive filtering combines with search/role and clears correctly; malformed status parameters are rejected. Updated Administrator API suite: 12 passed. Lab 3 client suites: 27 passed across 3 files. Both builds passed. All 4 updated Administrator browser scenarios passed, including combined filters, reactivation disappearing from the Inactive list, and responsive layouts at 1440/768/390px. Development database/uploads hash matched before/after: `a4142480b6352e28b2d36ca267daae814932f0f55484353500ca45af6d2f03e4`. Earlier full-suite counts below predate this extension.

- Backend: 18 files / 122 tests passed, including 11 Administrator API tests for normalized duplicates, validation/CSRF/roles, safe errors, stale edits, simultaneous last-Admin demotions, reset restrictions, session revocation, owner unassignment and concurrent old-password login during an Administrator reset.
- The initial rerun stopped during migration setup because Docker was unavailable (no tests executed). After Docker was started, the complete backend suite passed against `toktickit_test` at 20:37 on 2026-09-15; no development database migration was applied by this run.
- Client: 11 files / 83 tests passed. After the browser focus correction, the 8 Administrator component tests passed again. The inherited Ticket Detail focus assertion now waits for React's focus effect, matching Phanuwit's nonblocking review note.
- Browser: the 17 existing scenarios passed in the full run. All 4 new Administrator scenarios passed after correcting ambiguous locators and fixing Cancel focus restoration. They use real sessions and exercise create/edit/deactivation/reactivation/reset/forced change, plus keyboard focus and no horizontal overflow at 1440/768/390px.
- Both production builds passed. The E2E development database/upload hash remained `3d158700d3acb2261b8dfc472f360d1a29b93bc78256d046c92b0763cd35f586` before/after. Migrations ran only on isolated test/E2E targets; development migration is an explicit local setup step.
- New migration regression preserves historical Ticket IDs, ownership, timestamps and removal metadata while adding nullable ownerId and version=1. All-eight-status and assignment-race coverage remains planned with the operational endpoints in Issues #28–29.
- Screenshots under the ignored Playwright output were visually inspected for the Administrator editor/list at all three widths. These are development checks, not final PDF evidence or final-main acceptance.

## Issue #26 baseline and review corrections

Review correction verification (2026-09-15, feature branch): backend 17 files / 111 tests passed; client suite 10 files / 75 tests passed, including 7 API-client regressions in `client/tests/lab-03/session-expiry.test.tsx`. Both production builds passed. The browser suite passed all 14 existing tests; after correcting an ambiguous test locator, all 3 new `client/e2e/lab-03/auth-review.spec.ts` tests passed. The failed initial new-browser run was a locator error, not a passing run. E2E development database/uploads hashes matched before and after: `3d158700d3acb2261b8dfc472f360d1a29b93bc78256d046c92b0763cd35f586`.

New regressions cover malformed cookies and server survival, failed logout database operations, network/500 sign-out errors and retry/reload, normal password change for all roles, central 401/CSRF invalidation, distinct 403 errors, and revoked-session Back navigation. Browser revocation uses a second real login; only the network-failure scenario deliberately aborts the logout request. These are branch corrections, not final-main release evidence.

Original implementation baseline:

Issue #26 implements the authentication/migration slice. Its executable tests
are `server/tests/lab-03/auth.unit.test.ts`, `auth.api.test.ts`, and
`migration-regression.test.ts`, plus `client/tests/lab-03/Login.test.tsx` and
the authenticated Playwright regressions under `client/e2e/`.

- Server: 17 files / 109 tests passed (including idempotent logout); disposable
  migration fixtures prove duplicate preflight, preserved IDs/FKs/timestamps,
  priority backfill, sequence continuity, repeatable seed, and provisioning.
- Client: 9 files / 61 tests passed, covering neutral bootstrap, safe login
  failure, mandatory password change, Requester shell, and role destinations.
- Browser: 14 Chromium tests passed through real cookie sessions. The
  development database/uploads SHA-256 was identical before and after.
- Both production TypeScript builds passed. The development migration was
  applied with `prisma migrate deploy`, never reset, after a database/uploads
  backup and disposable migration verification.

These are branch-level Issue #26 results; final release results still belong on
reviewed `main` after Issues #27–#30.

## Planned coverage and AC mapping

Each row represents a suite of named scenarios, not a single assertion. Every listed AC must remain mapped when plans change.

| ID | Type | FR / AC | Scenarios and expected result | Planned path | Final |
|---|---|---|---|---|---|
| UNIT-01 | Unit | FR-01 / AC-01, AC-02 | Hash round-trip, unequal salts, malformed hash rejection, password boundaries, CSRF derivation/expiry and deterministic session expiry with injected clock. | server/tests/lab-03/auth.unit.test.ts | Planned |
| UNIT-02 | Unit | FR-06 / AC-09 | Exhaustive approved status matrix -> exact allow/reject decisions. | server/tests/lab-03/ticket-rules.unit.test.ts | Passed on Issue #29 branch |
| AUTH-01 | Unit/API | FR-01 / AC-01 | Valid/invalid/absent/inactive login; normalized email; hash verification and no plaintext; login thresholds/boundaries -> safe login or 401/429. | server/tests/lab-03/auth.api.test.ts | Planned |
| AUTH-02 | Unit/API | FR-01 / AC-02 | Password lengths 11/12/128/129, mismatch/same password, forced-change direct bypass, expiry/logout/reset/role/deactivation revocation -> restrictions enforced. | server/tests/lab-03/auth.api.test.ts | Planned |
| SEC-01 | API | FR-02 / AC-01, AC-02, AC-04, AC-06 | Each matrix endpoint x role plus absent/forced-change session; forged headers/IDs; CSRF/origin; safe errors -> no protected leakage. | server/tests/lab-03/authorization.api.test.ts | Planned |
| MIG-01 | Migration | FR-03 / AC-03 | Populated Lab 2 fixture -> preserved IDs/FKs/counts/timestamps/removed metadata; duplicate normalized email fails preflight; seeds twice preserve changed credentials and records; operational history schema remains usable. | server/tests/lab-03/migration-regression.test.ts | Passed through Issue #29 branch |
| REG-01 | API/UI | FR-02, FR-03 / AC-04, AC-11 | Authenticated create/list/detail/upload/download/remove; two Requesters, removed files, invalid uploads and legacy selector removal -> Lab 2 continuity with real identity. | server/tests/lab-03/requester-regression.api.test.ts | Planned |
| ADM-01 | API | FR-04 / AC-05, AC-06 | List/search/create/edit/reset; normalized duplicate email, invalid role/input; self-deactivation, last-Admin demotion and concurrent changes; revoked sessions/unassignment -> valid operations only. | server/tests/lab-03/admin-users.api.test.ts | Passed on Issue #27 branch; future assignment races remain OPS-01 |
| QUE-01 | API | FR-05 / AC-07 | Literal search special characters; combined filters; ordering ties; every page size; beyond-last/empty; invalid query values and authorization -> accurate deterministic metadata/results. | server/tests/lab-03/staff-queue.api.test.ts | Passed on Issue #28 branch |
| OPS-01 | API | FR-06 / AC-08, AC-09 | Claim race, stale versions, inactive owner, reassignment, priority, exact transitions, indication repeat/stale/ineligible and reopen clearing -> atomic allowed changes only. | server/tests/lab-03/staff-ticket-detail.api.test.ts | Passed on Issue #29 branch |
| COM-01 | API | FR-07, FR-08 / AC-09, AC-10 | Own/foreign comments; no notes in Requester JSON; note endpoints denied; trimmed bounds; pagination and absent edits/deletes. | server/tests/lab-03/comments-notes.api.test.ts | Passed on Issue #29 branch |
| ATT-01 | API | FR-03, FR-06 / AC-11 | Staff active download and Requester denial; removed content denial; retained removal history. | server/tests/lab-03/staff-ticket-detail.api.test.ts; server/tests/lab-02/attachments.api.test.ts | Passed on Issue #29 branch |
| UI-01 | Component | FR-01, FR-02 / AC-01, AC-02 | Login busy/error and forced-change validation; role shell; logout/back/reload/expiry clear stale data. | client/tests/lab-03/Login.test.tsx; client/tests/lab-03/ChangePassword.test.tsx | Planned |
| UI-02 | Component | FR-05 / AC-07, AC-12 | Queue controls/page resets/loading/empty/no-results/failure/forbidden and detail navigation. | client/tests/lab-03/StaffTicketQueue.test.tsx | Passed on Issue #28 branch |
| UI-03 | Component | FR-06-08 / AC-08-12 | Detail saves/conflicts/focus, indication, comments/notes separation, both histories past 20 with post/reload, and stale detail/action responses after Ticket navigation. | client/tests/lab-03/StaffTicketDetail.test.tsx; client/tests/lab-03/RequesterCommunication.test.tsx; client/tests/lab-03/CommunicationPagination.test.tsx; client/tests/lab-03/StaffTicketNavigation.test.tsx | Passed locally for PR #35 correction; peer re-review pending |
| UI-04 | Component | FR-04 / AC-05, AC-06, AC-12 | Admin form validation, duplicate/stale errors, input preservation, reset/busy prevention, forbidden and failure states. | client/tests/lab-03/AdminUsers.test.tsx | Passed on Issue #27 branch |
| ERR-01 | API | FR-09 / AC-13 | Inject persistence/storage failures into every capability; verify safe 500 shapes, no secrets/notes and atomic rollback. | server/tests/lab-03/unexpected-errors.api.test.ts | Planned |
| STYLE-01 | Style/browser | FR-09 / AC-12 | Tokens, labeled badges, focus, readonly/disabled distinction; 1440/768/390 widths, long content and dialogs -> no clipping or overflow. | client/tests/lab-03/ui-style.test.tsx; client/e2e/lab-03/responsive.spec.ts | Planned |
| E2E-01 | Browser | FR-01-03 / AC-01-04 | Seeded initial login -> forced change -> owned Ticket flow -> logout -> direct access denied. | client/e2e/lab-03/authentication.spec.ts | Planned |
| E2E-02 | Browser | FR-05-08 / AC-07-12 | Staff queue -> claim -> priority/status -> public/private posts and Attachment download; Requester sees public only, direct note API is denied, and indication leaves status unchanged; three responsive widths. | client/e2e/lab-03/staff-ticket-operations.spec.ts | Passed on Issue #29 branch |
| E2E-03 | Browser | FR-04 / AC-05, AC-06, AC-12 | Admin create/edit/deactivate/reactivate/reset -> next login forced change; editor keyboard focus and three responsive widths. API/component suites independently cover non-Admin denial. | client/e2e/lab-03/admin-users.spec.ts | Passed on Issue #27 branch |
| RELEASE-01 | Integration | FR-09 / AC-13 | Full final-main tests/builds; development database/upload before/after hashes equal; no required skipped tests. | Existing isolated runner plus all Lab 3 suites above | Planned |

## PR #31 review regression coverage

- REG-01 / AC-04: seed Tickets in every one of the eight statuses for two Requesters; filter each status and combine it with existing search/category/system/page controls. Verify owned-only results, unchanged query names/envelope and all-status omission. Reject unknown/lowercase/empty/repeated/non-scalar status with 400 INVALID_QUERY. Add component coverage at `client/tests/lab-03/MyTickets.test.tsx` for all eight exact labels/badges, generated query values and validation feedback.
- OPS-01 / AC-08: Issue #29 now exercises competing claims, reassignment to an eligible Administrator, inactive-owner rejection, stale-version precedence, priority changes, exact transition edges and terminal guards. Issue #27 already covers automatic unassignment during role/deactivation transactions; final Issue #30 will decide whether additional cross-transaction stress evidence is required.
- OPS-01 / AC-09: Issue #29 verifies first indication, refreshed idempotent repeat, old-version conflict, ineligible current status and reopening clearance. Ticket row locks serialize indication and Staff status changes; final Issue #30 will decide whether an explicit two-direction race harness adds useful evidence beyond those transaction tests.
- UI-03 / AC-08-09: Issue #29 verifies displayed-version submission, saved response state, conflict input preservation with explicit reload, Requester indication with unchanged formal status, separate communication surfaces, heading focus and three responsive widths. Terminal eligibility follows the shared matrix in the rendered controls and API regression.

## Execution and isolation details

Retain server test-database guards and isolated E2E database/uploads from Lab 2. Migration testing uses a dedicated disposable target and a populated old-schema fixture, never reset development data. Parallel fixtures must not share mutable global records. Concurrency tests exercise real database transactions.

Current commands retained for planned integration:

```powershell
npm --prefix server test
npm --prefix client test
npm --prefix client run test:e2e
npm --prefix server run build
npm --prefix client run build
git diff --check
git status
```

Lab 3 evidence-generation command and migration-fixture command will be added with their executable implementations and reviewed before use. Existing `test:e2e:evidence` currently targets Lab 2 only; do not claim it captures Lab 3.

## Manual and release evidence

Record revision/date/environment/command/result for each final run. Capture complete output on final main. Save real initial, busy, success, validation, forbidden and failure screenshots plus direct authorization evidence; automated success is not a substitute for requested screenshots. Any injected delay/mock used for state capture must be disclosed.

Final results: Not run. Visual inspection: Not performed. All acceptance criteria remain pending. Preserve early planning commit/PR evidence before implementation.

## Required submission mapping

The final PDF must use Answer Part 1 through Answer Part 9 in order: workflow/reviews (10), specification (5), tests/traceability (10), AI reflection (5), login/password change (5), Staff queue (5), Staff detail and direct API authorization (10), Administrator management (5), and Zen Green/responsive evidence (5). Total: 60 points. Include readable rendered specification/tests/AI-use/reviewer/UI-spec, working links, full passing output from final main and captioned scenario evidence. Do not mark this plan's placeholder paths or future scenarios as passing evidence.
