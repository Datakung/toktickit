# Lab 2 Test Plan and Results

**Planning status:** Created before Lab 2 product implementation.

**Final status:** Not yet executed; rows remain `Planned` until their owning Issue supplies real tests and results.

## 1. Test Strategy

Tests derive from the peer-approved `FR`, `BR`, and `AC` identifiers in `specification.md`.

- **Unit:** pure Ticket Number, Ticket validation, and Attachment validation helpers.
- **API/integration:** Express + Supertest + Prisma/PostgreSQL for real persistence, query behavior, ownership, and Attachment lifecycle.
- **UI component:** React Testing Library + Vitest for controls, states, requests, validation, and accessibility semantics.
- **UI style:** assertions for required classes/tokens, field states, labels, badges, messages, and buttons.
- **Responsive/visual:** Playwright viewport checks, screenshots, overflow assertions, and the manual checklist from `ui-spec.md`.
- **E2E:** seeded Requester selection through Ticket creation, discovery, detail, Attachment lifecycle, and cross-Requester rejection.

For each feature branch, write or activate the planned failing test first where practical, confirm that it fails for the intended missing behavior, implement the smallest correct behavior, and refactor while keeping the relevant suite green. Database tests isolate their data and clean it predictably without deleting shared schema or relying on test order.

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What it tests | Expected result | Automated test file | Status |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-06, AC-07 | Ticket Number generation format and collision retry | Approved format; collision regenerates; result is unique | `server/tests/lab-02/ticket-number.unit.test.ts` | Planned |
| UNIT-02 | Unit | BR-08–BR-12, AC-08, AC-09 | Trim, required fields, length boundaries, enum and ID validation | Exact normalized values or field errors at boundaries | `server/tests/lab-02/ticket-validation.unit.test.ts` | Planned |
| UNIT-03 | Unit | BR-23–BR-25, BR-36, AC-11, AC-23 | Exact extension/MIME/signature matrix, deterministic filename sanitation, size, and active-count rules | Supported triples and safe names accepted; mismatches, path/control/empty/overlong names, type/size/count rejected or normalized exactly | `server/tests/lab-02/attachment-validation.unit.test.ts` | Planned |
| API-01 | API/integration | FR-01, FR-04, AC-01, AC-05 | Active Requesters, Categories, and Related Systems | `200`; only active seeded rows in deterministic order | `server/tests/lab-02/requester-context.api.test.ts` | Planned |
| API-02 | API/integration | BR-02, BR-04, AC-02, AC-03, AC-04 | Missing/malformed/inactive Requester context | Documented `400`/`403`; active context accepted | `server/tests/lab-02/requester-context.api.test.ts` | Planned |
| API-03 | API/integration | FR-05–FR-07, AC-06, AC-07 | Create valid Ticket for selected Requester | `201`; one saved row; number, owner, `NEW`, timestamps returned | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-04 | API/integration | BR-09–BR-12, AC-09 | Direct invalid Ticket requests and boundary values | `400` field errors; no Ticket saved | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-05 | API/integration | FR-09, BR-15–BR-22, AC-13–AC-18 | Owned list, combined search/filters/sort/page, invalid query | Only owned matches; correct order/meta; invalid query `400` | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-06 | API/integration | FR-11, FR-17, AC-20, AC-21 | Owned Ticket Detail versus missing/non-owned Ticket | Owned `200`; missing/non-owned identical safe `404` | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| API-07 | API/integration | FR-12, FR-13, BR-23, BR-36, AC-22, AC-23 | Metadata and valid/invalid existing-Ticket upload | Valid `201`; exact sanitized display/stored names; mismatch `415`; size `413`; count `409`; no invalid row/file | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-08 | API/integration | FR-14, FR-17, BR-38, AC-24, AC-25 | Active inline/download content and missing/non-owned content | Both dispositions return safe headers; protected requests `404` | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-09 | API/integration | FR-15, FR-16, AC-26–AC-28 | Valid/invalid soft removal, retained metadata, blocked content, repeat | Metadata recorded; content `404`; invalid `400`; repeat `409` | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-10 | API/integration | BR-37, AC-33 | Four active Attachments plus two simultaneous valid uploads to one Ticket | Exactly one `201`, one `409`, five active rows/files, and no `.tmp` or final orphan | `server/tests/lab-02/attachments-concurrency.api.test.ts` | Planned |
| API-11 | API/integration | BR-39, AC-34 | Injected unexpected failure for every required API capability | Exact capability-specific safe `500`; no stack, SQL, path/name, credentials, or cross-Requester data | `server/tests/lab-02/unexpected-errors.api.test.ts` | Planned |
| UI-01 | UI component | FR-01–FR-03, AC-01–AC-04 | Requester selector loading/ready/empty/failure, Continue, session, Change | Correct states; valid session; old requester state cleared | `client/tests/lab-02/RequesterSelection.test.tsx` | Planned |
| UI-02 | UI component | FR-04–FR-07, AC-05, AC-08, AC-10 | Create form reference loading, validation, busy button, duplicate click | Active data shown; field errors; one API call while pending | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-03 | UI component | FR-05–FR-08, AC-06, AC-07, AC-31 | Create success and pre-create API failure | Official number/next actions; failure preserves values | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-04 | UI component | BR-23–BR-26, AC-11, AC-12 | Mixed initial files and partial upload failure | Invalid rejected; valid retained; Ticket not recreated; retry offered | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-05 | UI component | FR-09, FR-10, AC-13–AC-19 | Owned My Tickets controls and all list states | Correct query, list, pagination, empty/no-results/failure and switch | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-06 | UI component | FR-11, AC-20, AC-21 | Read-only owned detail and safe unavailable state | Approved fields render read-only; no protected data on error | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned |
| UI-07 | UI component | FR-12–FR-16, BR-38, AC-22–AC-28 | Attachment list/upload, authenticated Blob preview/download, removal dialog/states | Header and disposition sent; image/PDF/download behavior and object-URL cleanup; validation/busy/removed states | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| UI-08 | UI component | BR-39, AC-34 | Injected safe failures and Retry for Requester/reference, Ticket create/list/detail, and Attachment upload/metadata/content/removal | Capability-appropriate safe message/Retry; preserved safe input; no stale cross-Requester data | `client/tests/lab-02/SafeErrorStates.test.tsx` | Planned |
| STYLE-01 | UI style | FR-18, AC-29, AC-30 | Zen Green tokens/classes; editable/read-only/invalid/focus/buttons/badges | Required semantics and styles exist without color-only status | `client/tests/lab-02/ui-style.test.tsx` | Planned |
| RESP-01 | Responsive/visual | FR-18, AC-29, AC-30 | Required screens at 1440×900, 820×1180, 390×844 | No horizontal overflow, clipping, overlap, hidden action; screenshots saved | `e2e/lab-02/responsive.spec.ts` | Planned |
| E2E-01 | E2E | AC-32 | Select Requester, create Ticket, find/list, open detail | Confirmation number matches list/detail and persisted database-backed data | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-14, AC-21, AC-25, AC-32 | Switch Requester and attempt direct Ticket/Attachment access | A's data disappears; B receives safe unavailable behavior | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-03 | E2E | AC-11, AC-12, AC-22–AC-28, AC-32 | Mixed files, add/download, soft remove with reason, blocked removed download | Required Attachment lifecycle and failure evidence pass | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

## 3. Acceptance-Criterion Traceability

| AC | Planned evidence |
|---|---|
| AC-01 | API-01, UI-01 |
| AC-02 | API-02, UI-01 |
| AC-03 | API-02, UI-01 |
| AC-04 | API-02, UI-01 |
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
| AC-29 | STYLE-01, RESP-01 |
| AC-30 | UI-01–UI-07, STYLE-01, RESP-01 |
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

Automated screenshots are saved under `artifacts/lab-02/screenshots/` using the paths finalized in `ui-spec.md`. Manual visual results remain unchecked until Issue #16.

## 5. Test Commands

Commands are planned now and must be implemented/documented by their owning Issues.

```powershell
# Server unit and API/integration tests
npm --prefix server test -- tests/lab-02

# Client component and style tests
npm --prefix client test -- tests/lab-02

# Playwright E2E and responsive tests (Playwright setup added in Issue #12)
npm --prefix client run test:e2e

# Production type/build checks
npm --prefix server run build
npm --prefix client run build
```

Final `main` evidence must also show PostgreSQL readiness, migration/seed success where appropriate, the current `main` branch, complete pass counts, and a clean working tree.

## 6. Final Results

Not yet available. Issue #11 plans tests before product implementation. Each owning Issue changes only its implemented rows from `Planned` to a verified result, records exact commands/output, and keeps the traceability matrix accurate. Issue #16 and final `main` provide complete final results.

## 7. Known Limitations or Deferred Tests

- The Development Requester header is intentionally not secure authentication; security testing is deferred to Lab 3's real identity design.
- UI busy-state protection prevents repeated clicks, but durable network idempotency is not implemented in Lab 2 and must be reconsidered later.
- Local filesystem upload is tested for the supported local environment, including concurrent same-Ticket admission in the single PostgreSQL service. Cloud storage, malware scanning, and multi-service/distributed locking are outside Lab 2.
- Browser coverage targets the course-supported Chromium/Playwright environment plus manual inspection in the student's browser; broader cross-browser testing is deferred.
