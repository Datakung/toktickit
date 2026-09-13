# Lab 3 Planned Tests and Traceability

Status: Evolving traceability record. Issue #25 established the plan; Issue #26 now has executable branch-level evidence. Later-Issue paths and final release results remain planned until implemented.

## Issue #26 verified implementation evidence

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
| UNIT-02 | Unit | FR-06-08 / AC-08, AC-09, AC-10 | Exhaustive status matrix, owner eligibility, resolution eligibility and trimmed comment limits -> explicit allow/reject decisions. | server/tests/lab-03/ticket-rules.unit.test.ts | Planned |
| AUTH-01 | Unit/API | FR-01 / AC-01 | Valid/invalid/absent/inactive login; normalized email; hash verification and no plaintext; login thresholds/boundaries -> safe login or 401/429. | server/tests/lab-03/auth.api.test.ts | Planned |
| AUTH-02 | Unit/API | FR-01 / AC-02 | Password lengths 11/12/128/129, mismatch/same password, forced-change direct bypass, expiry/logout/reset/role/deactivation revocation -> restrictions enforced. | server/tests/lab-03/auth.api.test.ts | Planned |
| SEC-01 | API | FR-02 / AC-01, AC-02, AC-04, AC-06 | Each matrix endpoint x role plus absent/forced-change session; forged headers/IDs; CSRF/origin; safe errors -> no protected leakage. | server/tests/lab-03/authorization.api.test.ts | Planned |
| MIG-01 | Migration | FR-03 / AC-03 | Populated Lab 2 fixture -> preserved IDs/FKs/counts/timestamps/removed metadata/file hashes; null priority backfill; duplicate normalized email fails preflight; seeds twice preserve changed credentials and records. | server/tests/lab-03/migration-regression.test.ts | Planned |
| REG-01 | API/UI | FR-02, FR-03 / AC-04, AC-11 | Authenticated create/list/detail/upload/download/remove; two Requesters, removed files, invalid uploads and legacy selector removal -> Lab 2 continuity with real identity. | server/tests/lab-03/requester-regression.api.test.ts | Planned |
| ADM-01 | API | FR-04 / AC-05, AC-06 | List/search/create/edit/reset; normalized duplicate email, invalid role/input; self-deactivation, last-Admin demotion and concurrent changes; revoked sessions/unassignment -> valid operations only. | server/tests/lab-03/users-admin.api.test.ts | Planned |
| QUE-01 | API | FR-05 / AC-07 | Literal search special characters; combined filters; ordering ties; every page size; beyond-last/empty; invalid query values and authorization -> accurate deterministic metadata/results. | server/tests/lab-03/staff-queue.api.test.ts | Planned |
| OPS-01 | API | FR-06 / AC-08, AC-09 | Claim race, stale versions, inactive owner, unassign, priority; every status pair x role; indication twice and reopen clearing -> atomic allowed changes only. | server/tests/lab-03/staff-ticket-detail.api.test.ts | Planned |
| COM-01 | API | FR-07, FR-08 / AC-09, AC-10 | Own/foreign comments; no notes in Requester JSON; note endpoints denied; 0/1/4000/4001 trimmed content; author/time forgery; pagination and absent edits/deletes. | server/tests/lab-03/comments-notes.api.test.ts | Planned |
| ATT-01 | API | FR-03, FR-06 / AC-11 | Staff/Admin active download and removed denial; foreign attachment/ticket IDs; no Staff mutation; removal history survives migration. | server/tests/lab-03/attachments.api.test.ts | Planned |
| UI-01 | Component | FR-01, FR-02 / AC-01, AC-02 | Login busy/error and forced-change validation; role shell; logout/back/reload/expiry clear stale data. | client/tests/lab-03/Login.test.tsx; client/tests/lab-03/ChangePassword.test.tsx | Planned |
| UI-02 | Component | FR-05 / AC-07, AC-12 | Queue controls/page resets/loading/empty/no-results/failure/forbidden and detail navigation. | client/tests/lab-03/StaffTicketQueue.test.tsx | Planned |
| UI-03 | Component | FR-06-08 / AC-08-12 | Detail saves/conflicts/dialog keyboard focus, indication, comments/notes separation, safe text, download states. | client/tests/lab-03/StaffTicketDetail.test.tsx; client/tests/lab-03/RequesterTicketDetail.test.tsx | Planned |
| UI-04 | Component | FR-04 / AC-05, AC-06, AC-12 | Admin create/edit/reset validation, duplicate/safety errors, busy prevention, forbidden and failure states. | client/tests/lab-03/UserManagement.test.tsx | Planned |
| ERR-01 | API | FR-09 / AC-13 | Inject persistence/storage failures into every capability; verify safe 500 shapes, no secrets/notes and atomic rollback. | server/tests/lab-03/unexpected-errors.api.test.ts | Planned |
| STYLE-01 | Style/browser | FR-09 / AC-12 | Tokens, labeled badges, focus, readonly/disabled distinction; 1440/768/390 widths, long content and dialogs -> no clipping or overflow. | client/tests/lab-03/ui-style.test.tsx; client/e2e/lab-03/responsive.spec.ts | Planned |
| E2E-01 | Browser | FR-01-03 / AC-01-04 | Seeded initial login -> forced change -> owned Ticket flow -> logout -> direct access denied. | client/e2e/lab-03/authentication.spec.ts | Planned |
| E2E-02 | Browser | FR-05-08 / AC-07-11 | Staff queue -> claim -> priority/status -> public/private posts; Requester sees public only, indicates resolution; Staff resolves/closes. | client/e2e/lab-03/staff-ticket-flow.spec.ts | Planned |
| E2E-03 | Browser | FR-04 / AC-05, AC-06 | Admin create/edit/reset account -> next login forced change -> deactivation revoked; non-Admin management denied. | client/e2e/lab-03/user-administration.spec.ts | Planned |
| RELEASE-01 | Integration | FR-09 / AC-13 | Full final-main tests/builds; development database/upload before/after hashes equal; no required skipped tests. | Existing isolated runner plus all Lab 3 suites above | Planned |

## PR #31 review regression requirements (planned)

- REG-01 / AC-04: seed Tickets in every one of the eight statuses for two Requesters; filter each status and combine it with existing search/category/system/page controls. Verify owned-only results, unchanged query names/envelope and all-status omission. Reject unknown/lowercase/empty/repeated/non-scalar status with 400 INVALID_QUERY. Add component coverage at `client/tests/lab-03/MyTickets.test.tsx` for all eight exact labels/badges, generated query values and validation feedback.
- OPS-01 / AC-08: exercise claim, owner assignment, manual unassignment and priority changes in all eight states for Staff/Admin, including unchanged values. Verify exact terminal set and 409 TICKET_TERMINAL, stale-version precedence, already-assigned claim and invalid owner. Repeat account deactivation/role-change automatic unassignment in all eight states, including terminal ones, and assert unchanged status plus version/updatedAt increments. Include concurrent assignment versus deactivation.
- OPS-01 / AC-09: capture version V before indication; resolve and reopen before delivering the delayed request -> 409 VERSION_CONFLICT and indication stays null. Verify first success increments once; replay of old V conflicts; repeat with refreshed version returns the same timestamp/version; current-version ineligible state returns RESOLUTION_INDICATION_NOT_ALLOWED. Race indication with resolve/reopen in both serial orders and assert no old request creates a new-cycle indication.
- UI-03 / AC-08-09: verify terminal control eligibility matches API rules for every state. Verify displayed version is submitted, success updates response fields, conflict requires reload and explicit fresh action, reopening clears the displayed indication, and stale in-flight responses cannot overwrite a newer view. Keep these as planned cases until executable tests exist.

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
