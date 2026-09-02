# Lab 2 Test Plan and Results

**Planning status:** Created before Lab 2 product implementation.

**Current status:** Phanuwit merged final release PR #23 from `lab2-staging` into
`main` as `996c9bf`. On 2026-09-02, the complete clean final-`main` gate passed
94 server tests, 65 client tests, 14 browser tests, both builds, both production
audits, and the unchanged-development-state proof.

## 1. Test Strategy

Tests derive from the peer-approved `FR`, `BR`, and `AC` identifiers in `specification.md`.

- **Unit:** pure Ticket Number, Ticket validation, and Attachment validation helpers.
- **API/integration:** Express + Supertest + Prisma/PostgreSQL for real persistence, query behavior, ownership, and Attachment lifecycle.
- **UI component:** React Testing Library + Vitest for controls, states, requests, validation, and accessibility semantics.
- **UI style:** assertions for required classes/tokens, field states, labels, badges, messages, and buttons.
- **Responsive/visual:** Playwright viewport checks, screenshots, overflow assertions, and the manual checklist from `ui-spec.md`.
- **E2E:** seeded Requester selection through Ticket creation, discovery, detail, Attachment lifecycle, and cross-Requester rejection.

For each feature branch, write or activate the planned failing test first where practical, confirm that it fails for the intended missing behavior, implement the smallest correct behavior, and refactor while keeping the relevant suite green. Database tests require a guarded `TEST_DATABASE_URL`; browser tests require a separately guarded `E2E_DATABASE_URL`. Both apply migrations and seed before their suites, isolate data from development, and clean fixtures predictably without relying on test order.

Because API files share that one isolated PostgreSQL target, Vitest runs server test files serially (`fileParallelism: false`). This prevents legitimate fixtures in one file from changing another file's global-count assertion while preserving repeatability and development-database isolation.

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What it tests | Expected result | Automated test file | Status |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-06, AC-07 | Ticket Number generation format and collision retry | Approved format; collision regenerates; result is unique | `server/tests/lab-02/ticket-number.unit.test.ts` | Passed in Issue #13 |
| UNIT-02 | Unit | BR-08–BR-12, AC-08, AC-09 | Trim, required fields, length boundaries, enum and ID validation | Exact normalized values or field errors at boundaries | `server/tests/lab-02/ticket-validation.unit.test.ts` | Passed in Issue #13 |
| UNIT-03 | Unit | BR-23–BR-25, BR-36, AC-11, AC-23 | Exact extension/MIME/signature matrix and deterministic filename sanitation | Supported triples and safe names accepted; mismatches and path/control/empty/overlong names rejected or normalized exactly | `server/tests/lab-02/attachment-validation.unit.test.ts` | Passed in Issue #13; size/count are covered at the API boundary |
| API-01 | API/integration | FR-01, FR-04, AC-01, AC-05 | Active Requesters, Categories, and Related Systems | `200`; only active seeded rows in deterministic order | `server/tests/lab-02/requester-context.api.test.ts` | Passed in Issue #12 |
| API-02 | API/integration | BR-02, BR-04, AC-02, AC-03, AC-04 | Missing/malformed/out-of-range/inactive Requester context | Documented `400`/`403`; oversized values rejected before Prisma; active context accepted | `server/tests/lab-02/requester-context.api.test.ts` | Passed in Issue #12 and re-review |
| API-03 | API/integration | FR-05–FR-07, AC-06, AC-07 | Create valid Ticket for selected Requester | `201`; one saved row; number, owner, `NEW`, timestamps returned | `server/tests/lab-02/create-ticket.api.test.ts` | Passed in Issue #13 |
| API-04 | API/integration | BR-09–BR-12, AC-09 | Direct invalid Ticket requests and boundary values | `400` field errors; no Ticket saved | `server/tests/lab-02/create-ticket.api.test.ts` | Passed in Issue #13 |
| API-05 | API/integration | FR-09, BR-15–BR-22, AC-13–AC-18 | Owned list, literal wildcard-character search, combined filters/sort/page, invalid query | Only owned matches; `%`, `_`, and backslash are literal; correct order/meta; invalid query `400` | `server/tests/lab-02/my-tickets.api.test.ts` | Passed in Issue #14 re-review (16 tests) |
| API-06 | API/integration | FR-11, FR-17, AC-20, AC-21 | Owned Ticket Detail versus missing/non-owned Ticket | Owned `200`; missing/non-owned identical safe `404` | `server/tests/lab-02/ticket-detail.api.test.ts` | Passed in Issue #15 (7 tests) |
| API-07 | API/integration | FR-12, FR-13, BR-23, BR-36, AC-22, AC-23 | Metadata and valid/invalid existing-Ticket upload | Valid `201`; exact sanitized display name; stored name hidden; mismatch `415`; size `413`; ownership `404`; count `409`; no invalid row/file | `server/tests/lab-02/attachment-upload.api.test.ts`, `server/tests/lab-02/attachments.api.test.ts` | Passed through Issues #13 and #15; upload suite now has 6 tests |
| API-08 | API/integration | FR-14, FR-17, BR-38, AC-24, AC-25 | Active inline/download content and missing/non-owned content | Both dispositions return safe headers; protected requests `404` | `server/tests/lab-02/attachments.api.test.ts` | Passed in Issue #15 |
| API-09 | API/integration | FR-15, FR-16, AC-26–AC-28 | Valid/invalid soft removal, retained metadata, blocked content, repeat | Metadata recorded; content `404`; invalid `400`; repeat `409` | `server/tests/lab-02/attachments.api.test.ts` | Passed in Issue #15 (8 combined lifecycle tests) |
| API-10 | API/integration | BR-37, AC-33 | Four active Attachments plus two simultaneous valid uploads to one Ticket | Exactly one `201`, one `409`, five active rows, one final file, and no `.tmp` or final orphan | `server/tests/lab-02/attachment-upload.api.test.ts` | Passed in Issue #13 |
| API-11 | API/integration | BR-39, AC-34 | Injected unexpected failure for every required API capability | Exact capability-specific safe `500`; no stack, SQL, path/name, credentials, or cross-Requester data | Capability-owning API files plus final `server/tests/lab-02/unexpected-errors.api.test.ts` | Passed in Issue #16; 4 grouped tests audit every required capability |
| UI-01 | UI component | FR-01–FR-03, AC-01–AC-04 | Requester selector loading/ready/empty/failure, Continue, session, Change, Back/Forward | Correct states and session; route and rendered screen stay synchronized; old requester state cleared | `client/tests/lab-02/RequesterSelection.test.tsx` | Passed in Issue #12 and re-review |
| STYLE-00 | UI style | FR-18, AC-29, AC-30 | Requester controls, component hierarchy, real navigation, mobile disclosure, touch targets, and keyboard focus | Links and active marker; `aria-expanded`/`aria-controls`; controls at least 44 px; visible 3 px focus outline | `client/tests/lab-02/ui-foundation-style.test.tsx`, `client/e2e/lab-02/requester-context-responsive.spec.ts` | Passed in Issue #12 and re-review |
| RESP-00 | Responsive/visual | FR-18, AC-29, AC-30 | Requester Selection, shell, and navigation at 1440×900, 820×1180, and 390×844 | Required controls visible; mobile menu operates; no horizontal overflow at all viewports | `client/e2e/lab-02/requester-context-responsive.spec.ts` | Passed in Issue #12 and re-review |
| UI-02 | UI component | FR-04–FR-07, AC-05, AC-08, AC-10 | Create form reference loading, validation, busy button, duplicate click | Active data shown; field errors; one API call while pending | `client/tests/lab-02/CreateTicket.test.tsx` | Passed in Issue #13 |
| UI-03 | UI component | FR-05–FR-08, AC-06, AC-07, AC-31 | Create success and pre-create API failure | Official number shown; safe failure preserves values and permits retry | `client/tests/lab-02/CreateTicket.test.tsx` | Passed in Issue #13 |
| UI-04 | UI component | BR-23–BR-26, AC-11, AC-12 | Mixed initial files and partial upload failure | Detectable invalid rejected; Ticket not recreated; per-file success/failure retained for later retry | `client/tests/lab-02/CreateTicket.test.tsx` | Initial-upload portion passed in Issue #13 |
| UI-05 | UI component | FR-09, FR-10, AC-13–AC-19 | Owned My Tickets controls and all list states | Correct query, list, pagination, empty/no-results/failure and switch | `client/tests/lab-02/MyTickets.test.tsx` | Passed in Issue #14 (7 tests) |
| UI-06 | UI component | FR-11, AC-20, AC-21 | Read-only owned detail and safe unavailable state | Approved fields render read-only; no protected data on error; route heading receives focus; Requester-unavailable reset delegated | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Passed in Issue #15 re-review (5 tests) |
| UI-07 | UI component | FR-12–FR-16, BR-38, AC-22–AC-28 | Attachment list/upload, authenticated Blob preview/download, removal dialog/states | Header and disposition sent; image/PDF/download behavior and object-URL cleanup; validation/busy/removed states; modal focus entry/trap/Escape/restoration; operation-level 403 delegation | `client/tests/lab-02/AttachmentSection.test.tsx` | Passed in Issue #15 re-review (10 tests) |
| UI-08 | UI component | BR-39, AC-34 | Injected safe failures and Retry for Requester/reference, Ticket create/list/detail, and Attachment upload/metadata/content/removal | Capability-appropriate safe message/Retry; preserved safe input; no stale cross-Requester data | Capability-owning component files plus final `client/tests/lab-02/SafeErrorStates.test.tsx` | Passed in Issue #16; 3 release-wide grouped tests plus capability tests |
| STYLE-01 | UI style | FR-18, AC-29, AC-30 | Zen Green tokens/classes; editable/read-only/invalid/focus/buttons/badges | Required semantics and styles exist without color-only status | `client/tests/lab-02/ui-style.test.tsx` | Passed in Issue #16; 18 exact token and state tests |
| RESP-01 | Responsive/visual | FR-18, AC-29, AC-30 | Required screens at 1440×900, 820×1180, 390×844 | No horizontal overflow, clipping, overlap, hidden action; screenshots saved | Screen-specific responsive files plus final `client/e2e/lab-02/responsive.spec.ts` | Passed in Issue #16; 9 inspected screenshots saved at the documented paths |
| E2E-00 | E2E | AC-01–AC-04 | Select/change the Requester and use browser Back/Forward in Chromium | Selection opens the shell; history stays synchronized; session is stored and then cleared | `client/e2e/lab-02/requester-context.spec.ts` | Passed in Issue #12 and re-review |
| E2E-01 | E2E | AC-32 | Select Requester, create Ticket, find/list, open detail | Confirmation number matches list/detail and persisted database-backed data | `client/e2e/lab-02/requester-ticket-flow.spec.ts` | Passed in Issue #15 |
| E2E-02 | E2E | AC-14, AC-21, AC-25, AC-32 | Switch Requester and attempt direct Ticket/Attachment access | A's data disappears; B receives safe unavailable behavior | `client/e2e/lab-02/requester-ticket-flow.spec.ts` | Passed in Issue #15 |
| E2E-03 | E2E | AC-11, AC-12, AC-22–AC-28, AC-32 | Mixed files, add/download, soft remove with reason, blocked removed download | Required Attachment lifecycle and failure evidence pass | `client/e2e/lab-02/requester-ticket-flow.spec.ts` | Passed in Issue #16, including mixed initial files and authenticated removed-content `404` |

## 3. Acceptance-Criterion Traceability

| AC | Planned evidence |
|---|---|
| AC-01 | API-01, UI-01, E2E-00 |
| AC-02 | API-02, UI-01, E2E-00 |
| AC-03 | API-02, UI-01, E2E-00 |
| AC-04 | API-02, UI-01, E2E-00 |
| AC-05 | API-01, UI-02 |
| AC-06 | API-03, UI-03, E2E-01 |
| AC-07 | UNIT-01, API-03, UI-03, E2E-01 |
| AC-08 | UNIT-02, UI-02 |
| AC-09 | UNIT-02, API-04 |
| AC-10 | UI-02 |
| AC-11 | UNIT-03, UI-04, E2E-03 |
| AC-12 | UI-04, E2E-03 |
| AC-13 | API-05, UI-05 |
| AC-14 | API-05, UI-05, E2E-02 |
| AC-15 | API-05, UI-05 |
| AC-16 | API-05, UI-05 |
| AC-17 | API-05, UI-05 |
| AC-18 | API-05, UI-05 |
| AC-19 | UI-05 |
| AC-20 | API-06, UI-06, E2E-01 |
| AC-21 | API-06, UI-06, E2E-02 |
| AC-22 | API-07, UI-07, E2E-03 |
| AC-23 | UNIT-03, API-07, UI-07, E2E-03 |
| AC-24 | API-08, UI-07, E2E-03 |
| AC-25 | API-08, E2E-02 |
| AC-26 | API-09, UI-07, E2E-03 |
| AC-27 | API-09, UI-07, E2E-03 |
| AC-28 | API-09, UI-07, E2E-03 |
| AC-29 | STYLE-00, RESP-00, STYLE-01, RESP-01 |
| AC-30 | UI-01–UI-07, STYLE-00, RESP-00, STYLE-01, RESP-01 |
| AC-31 | UI-03, UI-04, UI-05, UI-07 |
| AC-32 | E2E-01, E2E-02, E2E-03 |
| AC-33 | API-10 |
| AC-34 | API-11, UI-08 |

No AC is intentionally untested. If implementation changes an AC, update the contract and this matrix in the same Issue before changing its tests.

## 4. Responsive and Visual Checklist

The authoritative checklist is in `ui-spec.md`. Final evidence must include:

- desktop 1440×900, tablet 820×1180, and mobile 390×844;
- Requester Selection, Create Ticket, My Tickets, and Ticket Detail;
- editable/read-only/invalid/disabled/focused controls;
- primary, secondary, tertiary, destructive, disabled, and busy buttons;
- loading, validation, submitting, success, API failure, empty, no-results, invalid Attachment, and removed Attachment states;
- desktop Ticket table and mobile Ticket cards;
- search, filters, sort, clear, pagination, and Attachment controls; and
- no clipping, overlap, hidden controls, unreadable filenames, or horizontal page overflow.

Nine reviewed screenshots are saved under `artifacts/lab-02/screenshots/` using the exact paths in `ui-spec.md`. Ordinary E2E runs send screenshots to ignored Playwright test output and do not modify these files. Only the explicit deterministic evidence command refreshes them from fixed seeded data.

## 5. Test Commands

Commands are planned now and must be implemented/documented by their owning Issues.

```powershell
# One-time local creation of the isolated databases
docker exec toktickit-postgres createdb -U toktickit toktickit_test
docker exec toktickit-postgres createdb -U toktickit toktickit_e2e

# Guarded isolated migration (rejects missing/unsafe/same-as-development target)
npm --prefix server run test:db:migrate

# Server unit and API/integration tests
npm --prefix server test -- tests/lab-02

# Client component and style tests
npm --prefix client test -- tests/lab-02

# Routine Playwright E2E: guarded E2E DB, ignored screenshot output
npm --prefix client run test:e2e

# Explicit deterministic refresh of the nine committed evidence screenshots
npm --prefix client run test:e2e:evidence

# Production type/build checks
npm --prefix server run build
npm --prefix client run build
```

Playwright rejects a missing, same-as-development, or unmarked E2E target. It
starts a fresh API on port 3100, migrates and seeds fixed E2E data, isolates
uploads, cleans created rows/files, and compares development database/upload
hashes before and after. Final `main` evidence must also show PostgreSQL
readiness, migration/seed success where appropriate, the current `main` branch,
complete pass counts, and a clean working tree.

## 6. Current Results

Issue #16 passed the following local quality checks on 2026-09-02:

- API-11: `unexpected-errors.api.test.ts` injects private-looking failures across reference data, Requester lookup/context, Ticket list/create/detail, and Attachment metadata/upload/content/removal; all responses use the exact capability-specific safe `500` contract without leaking credentials, SQL, paths, stored names, stack details, Prisma, or `node_modules`;
- UI-08 and STYLE-01: safe Retry behavior preserves permitted input and clears stale protected data, while 18 style tests enforce the approved 15 Zen Green tokens and editable/read-only/invalid/focus/button/badge/responsive semantics;
- RESP-01: Create Ticket, My Tickets, and Ticket Detail pass at 1440×900, 820×1180, and 390×844; all nine screenshots were inspected and the My Tickets evidence consistently shows one filtered demonstration Ticket;
- E2E-03: the browser flow rejects an invalid initial text file while retaining a valid PNG, creates one Ticket, uploads/previews/downloads/soft-removes another PNG, verifies retained removed metadata, rejects its authenticated download with `404 ATTACHMENT_NOT_FOUND`, and then proves cross-Requester isolation;
- the full server suite passes 14 files and 94 tests, including both Lab 1 regressions and five E2E-target guard regressions;
- the full client suite passes 9 files and 65 tests, including all four Lab 1 regressions;
- the complete Playwright regression suite passes all 14 Chromium tests;
- server and client production builds pass;
- production dependency audits report zero vulnerabilities in both packages; and
- `git diff --check` passes, while tracked-file inspection finds no `.env`, uploads, `node_modules`, `dist`, Playwright report, or test-result output.

The first new responsive runs exposed three evidence-test selector assumptions: native options are not themselves visible, “Attachments” also matched “No Attachments,” and the hidden desktop Ticket link preceded the visible mobile card link. Those assertions were narrowed to the visible control/container instead of weakening product expectations. A later parallel server run exposed shared-database cross-file count interference, so the server harness now runs database-backed files serially.

Phanuwit's PR #22 review then exposed two release-gate weaknesses missed by the first audit. The correction rejects missing, same-as-development, and unmarked E2E database targets; migrates, resets, seeds, and cleans `toktickit_e2e`; isolates E2E uploads; and hashes all development tables plus upload files before and after Playwright. The complete 14-test routine run produced the same development hash before and after, removed the E2E upload directory, and left all nine committed image hashes unchanged. Two consecutive explicit evidence runs used the fixed `TKT-20260902-EVID01` seed and produced identical hashes for every screenshot; the refreshed desktop/mobile images were also visually inspected for readable deterministic content and no overflow.

The same complete gate passed on merged `lab2-staging` commit `4dfb0f2` and was
rerun successfully on final `main` release commit `996c9bf` on 2026-09-02. The
final run used guarded `toktickit_test` and `toktickit_e2e` databases, reported
the identical development-state hash
`13a8e39513495da8284757539287735d0e9592833cd69b833d72ca18b35993ae`
before and after Playwright, and left the working tree clean.

Issue #15 passed the following automated checks on 2026-09-01:

- API-06–API-09: PostgreSQL-backed tests cover owned read-only Ticket Detail, identical missing/non-owned responses, ordered active/removed metadata, existing-Ticket upload regression, protected inline/download content, invalid or unavailable content, validated soft removal, retained metadata, blocked removed content, repeated removal, and capability-specific safe failures;
- UI-06–UI-07: 15 focused component tests cover loading/read-only/unavailable/retry states, route-heading focus, active versus removed presentation, authenticated image/PDF preview, Blob download and URL cleanup, upload retry, the five-active limit, validated removal, and complete modal keyboard focus behavior;
- requester-route regressions: direct owned Detail loads, changing Requester clears the old Ticket state, and a `403 REQUESTER_UNAVAILABLE` from detail/upload/content/removal centrally clears session context, removes the rejected Requester from the cached selector, retains other active choices, and returns to Requester Selection with a safe explanation;
- E2E-02/E2E-03: one real Chromium flow creates a Ticket, finds and opens it, uploads/previews/downloads/soft-removes a PNG, then proves another Requester receives the safe unavailable state;
- responsive Ticket Detail: desktop 1440×900, tablet 820×1180, and mobile 390×844 checks cover long filenames, removal-dialog reachability, and no horizontal overflow;
- the full server suite passes 12 files and 85 tests; the full client suite passes 7 files and 44 tests;
- the complete Playwright regression suite passes all 13 Chromium tests; and
- server and client production builds pass.

The first full browser attempt reused an older running development server and correctly failed at the new route. After restarting only the TokTickIT dev processes, the next attempt exposed that cross-origin JavaScript could not read the sanitized `Content-Disposition` filename. The API now exposes only the safe content headers through CORS. A later database-backed run also demonstrated that Docker/PostgreSQL must be available before the Requester list can load; after restoring the database, all 13 Chromium tests passed.

Manual OperaGX verification confirmed the owned read-only Ticket Detail, valid Attachment upload, preview and download, reason-required soft removal with retained removed metadata, blocked cross-Requester direct-URL access, and a usable mobile layout without horizontal overflow.

Issue #14 passed the following checks on 2026-09-01:

- API-05: 16 PostgreSQL-backed tests cover strict query validation, requester ownership, case-insensitive Ticket Number/Summary search, literal `%`, `_`, and backslash handling, combined filters, all documented sort/page behavior, and accurate out-of-range metadata;
- UI-05: 7 component tests cover loading, ready rows/actions, combined controls, one-based pagination, empty versus no-results, Clear Filters, safe retry, and removal of stale rows when the Requester changes;
- responsive My Tickets: 3 Chromium checks prove the desktop table/mobile-card switch and no horizontal overflow at 1440×900, 820×1180, and 390×844;
- the full server suite passes 10 files and 69 tests; the full client suite passes 5 files and 27 tests;
- the complete Playwright regression suite passes all 9 Chromium tests; and
- server and client production builds pass; and
- manual OperaGX verification confirmed the database-backed list, search, filters, sorting, page-size and Clear Filters behavior; changing from Anan to Kanya removed Anan's Tickets; and the 390 px mobile layout stacked its controls without horizontal overflow.

Issue #13 passed the following checks on 2026-09-01:

- server: 9 files and 53 tests passed, including Ticket Number collision retry, exact Ticket boundaries, safe malformed-JSON handling, real PostgreSQL persistence, ownership, Attachment signatures/names, upload errors, cleanup, and concurrent five-file admission;
- client: 4 files and 20 tests passed, including contract `error.fields` parsing, required/error associations, form reference data, client/server error presentation, duplicate-click prevention, official Ticket confirmation, invalid initial files, and partial upload failure without Ticket recreation;
- Playwright: 6 Chromium tests passed, including the Create Ticket success flow and a 390×844 no-horizontal-overflow check;
- server and client production builds passed; and
- Issue #13 browser coverage is intentionally a creation-only smoke flow and does not falsely mark the later full list/detail `E2E-01` as complete.
- manual OperaGX verification created `TKT-20260901-M7DAQV` for the selected Requester and showed one initial PNG as `succeeded`; the observed Thai-locale Buddhist year was then normalized to an explicit Gregorian display with a regression assertion.

Issue #12 passed the following checks on 2026-08-31:

- server: 4 files and 21 tests passed, including both Lab 1 regressions, five isolation-guard tests, and oversized-header boundaries;
- client: 3 files and 13 tests passed, including all four Lab 1 regression tests and route/navigation regressions;
- Playwright: 4 Chromium tests passed: the requester-context flow plus desktop, tablet, and mobile checks;
- server and client production builds passed;
- the committed migration applied with no schema drift, and the idempotent seed passed twice; and
- integration-test cleanup left zero retired Category or Related System fixtures in PostgreSQL; and
- the development reference-data snapshot was identical before and after the isolated run; missing and same-as-development test targets both failed before test loading; and
- production dependency audit (`npm audit --omit=dev`) reported zero vulnerabilities.

The development-only Vitest 2 dependency chain reports advisories whose
automated fix requires a major Vitest 4 upgrade. That unrelated major upgrade is
deferred for a separately reviewed dependency task; both production-only
dependency audits report zero vulnerabilities. Final `main` verification passed
after the reviewer performed the quality and release merges.

No standalone pure unit test applies to Issue #12: its rules cross the Prisma/API or React/browser boundaries and are covered by API/integration, component, style, responsive, and E2E tests. Pure Ticket and Attachment helpers remain assigned to their later owning Issues.

## 7. Known Limitations or Deferred Tests

- The Development Requester header is intentionally not secure authentication; security testing is deferred to Lab 3's real identity design.
- UI busy-state protection prevents repeated clicks, but durable network idempotency is not implemented in Lab 2 and must be reconsidered later.
- Local filesystem upload is tested for the supported local environment, including concurrent same-Ticket admission in the single PostgreSQL service. Cloud storage, malware scanning, and multi-service/distributed locking are outside Lab 2.
- Browser coverage targets the course-supported Chromium/Playwright environment plus manual inspection in the student's browser; broader cross-browser testing is deferred.
