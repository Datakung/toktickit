# Lab 2 Sprint Engineering Specification

**Status:** Approved by Pitchai and peer reviewer Phanuwit on 2026-08-30 ([PR #17 approval](https://github.com/Datakung/toktickit/pull/17#pullrequestreview-5061353056)).

**Product increment:** Requester Ticketing MVP with UI Foundation

**Temporary identity model:** Development Requester selection; this is not authentication

## 1. Sprint Goal

Deliver a responsive Requester-facing TokTickIT MVP in which a selected Development Requester can create a validated Ticket, receive a backend-generated official Ticket Number, find only their own Tickets, inspect an owned Ticket, and manage permitted Attachments. The increment establishes a reusable Zen Green UI, a documented REST contract, traceable automated tests, and ownership boundaries that can later be replaced by real authentication in Lab 3.

## 2. Stakeholder Request Interpretation

The IT department needs a usable vertical slice rather than isolated screens. Data must travel through React, Express, Prisma, and PostgreSQL. A seeded Development Requester selector supplies the temporary testing identity. The backend remains responsible for validation, Ticket Number generation, ownership checks, and file rules; the frontend provides clear, accessible success, loading, validation, empty, no-results, and failure states.

## 3. Scope

### Included

- Active Development Requester selection, session-scoped persistence, identity display, and switching.
- Active Category and Related System reference data from PostgreSQL.
- Ticket creation with backend Ticket Number generation, initial `NEW` status, validation, and duplicate-click prevention.
- Optional permitted Attachments selected during Ticket creation.
- Requester-owned My Tickets with search, filters, sorting, pagination, and distinct empty/no-results states.
- Read-only Requester Ticket Detail.
- Existing-Ticket Attachment upload, metadata, active download/preview, and soft removal with a reason.
- Backend ownership enforcement for Tickets and Attachments.
- Zen Green application shell and responsive desktop, tablet, and mobile layouts.
- Unit, API/integration, UI component, UI style, responsive, visual, and Playwright E2E evidence.

### Excluded

- Real authentication, logout, passwords, hashing, sessions, tokens, and secure role authorization.
- IT Staff or Administrator screens and actions, assignment, IT Priority changes, or reference-data management.
- Public Comments, Internal Notes, Actions Taken, and collaboration features.
- Ticket lifecycle transitions after creation, including resolve, close, reopen, cancel, or status editing.
- Cloud object storage, malware scanning, email notifications, and deployment.

## 4. Functional Requirements

- **FR-01:** The application shall load only active Development Requesters from PostgreSQL and require one selection before requester-specific routes are usable.
- **FR-02:** The application shall store the selected Requester ID in browser `sessionStorage`, display the Requester name in the shell, and provide Change Requester.
- **FR-03:** Changing Requester shall clear requester-specific cached state and reload data for the newly selected Requester.
- **FR-04:** The application shall retrieve active Categories and Related Systems from PostgreSQL through REST APIs.
- **FR-05:** The selected Requester shall create a Ticket using Category, Related System, Summary, Requested Priority, Description, and optional Attachments.
- **FR-06:** The backend shall generate a unique official Ticket Number and initialize Current Status to `NEW`.
- **FR-07:** The Create Ticket UI and API shall enforce the approved validation rules, show a busy state, and prevent duplicate clicks while a request is pending.
- **FR-08:** After Ticket creation, the application shall upload each accepted initial Attachment to the newly created Ticket and report per-file outcomes.
- **FR-09:** My Tickets shall retrieve only the selected Requester's Tickets and support the documented search, filters, sorting, and pagination.
- **FR-10:** My Tickets shall distinguish loading, empty account, no query results, and API failure states.
- **FR-11:** The selected Requester shall open a read-only detail view only for a Ticket they own.
- **FR-12:** Ticket Detail shall retrieve and display active and removed Attachment metadata for the owned Ticket.
- **FR-13:** The selected Requester shall add a valid Attachment to an owned Ticket when the active count is below five.
- **FR-14:** The selected Requester shall download or preview an active owned Attachment.
- **FR-15:** The selected Requester shall soft-remove an active owned Attachment after confirmation and entry of a valid reason.
- **FR-16:** Removed Attachment metadata shall remain visible, while its content shall be unavailable.
- **FR-17:** The backend shall reject access to non-owned Tickets and Attachments without revealing whether the resource belongs to another Requester.
- **FR-18:** All required screens shall follow the approved Zen Green, responsive, validation, feedback, and accessibility rules in `ui-spec.md`.
- **FR-19:** All REST behavior shall follow `api-spec.md`; all acceptance criteria shall be traceable to planned tests in `tests.md`.

## 5. Business Rules

### Requester context

- **BR-01:** Development Requester selection is a Lab 2 testing mechanism and is not authentication or authorization.
- **BR-02:** Only active Requesters appear in the selector. A stored inactive or nonexistent Requester ID is rejected and cleared.
- **BR-03:** The selected Requester ID is stored only in `sessionStorage`; a new browser session begins at the selection screen.
- **BR-04:** Requester-scoped APIs require `X-Development-Requester-Id` containing a positive integer.
- **BR-05:** Changing Requester clears requester-specific form success, list, detail, and Attachment state before loading the new context.

### Ticket creation and validation

- **BR-06:** The backend generates Ticket Numbers in the form `TKT-YYYYMMDD-XXXXXX`, where the suffix is six uppercase alphanumeric characters. A unique database constraint is authoritative, and generation retries on collision.
- **BR-07:** A new Ticket starts with Current Status `NEW`; the Requester cannot edit Current Status or IT Priority in Lab 2.
- **BR-08:** Requested Priority is one of `LOW`, `MEDIUM`, or `HIGH`. IT Priority is nullable and displayed as `Not assigned` when absent.
- **BR-09:** Summary is required, trimmed, and 5–120 characters after trimming.
- **BR-10:** Description is required, trimmed, and 10–4,000 characters after trimming.
- **BR-11:** Category and Related System are required and must reference active records.
- **BR-12:** The backend associates the Ticket with the current active Requester from the development-context header; a client-supplied owner cannot override it.
- **BR-13:** The Submit button is disabled while creation is pending. Lab 2 duplicate prevention covers repeated UI activation; network-level idempotency is deferred and documented as a limitation.
- **BR-14:** Ticket timestamps are stored by the backend in UTC and returned as ISO 8601 strings.

### Ticket ownership and retrieval

- **BR-15:** A Requester may list, inspect, or manage Attachments only for their own Tickets.
- **BR-16:** Missing and non-owned Ticket or Attachment requests return the same safe `404` response.
- **BR-17:** My Tickets search is case-insensitive over Ticket Number and Summary only; the trimmed search term is at most 100 characters.
- **BR-18:** My Tickets filters are Category, Related System, Requested Priority, and Current Status.
- **BR-19:** Permitted primary sort fields are `updatedAt`, `createdAt`, and `ticketNumber`; direction is `asc` or `desc`.
- **BR-20:** The default ordering is `updatedAt DESC`, followed by `id DESC` for deterministic results.
- **BR-21:** Pages are one-based. Permitted page sizes are 10, 20, and 50; defaults are page 1 and size 10. A page beyond the final page returns an empty `data` array with valid metadata.
- **BR-22:** An empty state means the Requester owns no Tickets. A no-results state means Tickets exist but the current query matches none.

### Attachments

- **BR-23:** A permitted file must pass all three checks: a case-insensitive extension, its declared MIME type, and its exact signature must agree. `.jpg`/`.jpeg` use `image/jpeg` and begin `FF D8 FF`; `.png` uses `image/png` and begins `89 50 4E 47 0D 0A 1A 0A`; `.webp` uses `image/webp` with ASCII `RIFF` at bytes 0–3 and `WEBP` at bytes 8–11; `.pdf` uses `application/pdf` and begins `%PDF-` (`25 50 44 46 2D`).
- **BR-24:** Each file is at most 5 MiB (5,242,880 bytes), and each Ticket has at most five Attachments with `removedAt = null`.
- **BR-25:** Invalid files are rejected before submission when detected by the UI; valid selections remain. The backend repeats all authoritative checks.
- **BR-26:** Ticket creation occurs before initial Attachment uploads. If one upload fails, the Ticket and successful uploads remain; failed files are reported individually and may be retried from Ticket Detail.
- **BR-27:** Files are stored under an ignored server upload directory with a server-generated random filename. The original filename is retained as metadata but never used as a filesystem path.
- **BR-28:** Attachment metadata includes Ticket ID, original name, stored name, MIME type, byte size, creation time, removal time, removal reason, and removing Requester ID where applicable. Stored path/name is never exposed by the API.
- **BR-29:** Soft removal requires explicit confirmation and a trimmed reason of 5–250 characters. Only the owning selected Requester may remove an Attachment.
- **BR-30:** Soft removal records metadata without deleting the database row. The physical file may remain locally for audit, but every content endpoint blocks it after removal.
- **BR-31:** Re-removing an already removed Attachment returns `409 Conflict` and does not change the original removal metadata.

### Errors, states, and seed data

- **BR-32:** Validation errors identify relevant fields without exposing stack traces, SQL, filesystem paths, credentials, or other users' data.
- **BR-33:** After a Create Ticket API failure, editable form values and valid file selections remain where safe; after successful Ticket creation, the UI must not recreate the Ticket while retrying failed files.
- **BR-34:** Seed operations are idempotent and include four required Categories, at least six Related Systems, at least four active Requesters, and at least one inactive Requester.
- **BR-35:** Category, Related System, and Requester records include an active flag; inactive reference records are not offered for new Tickets but existing Ticket history remains readable.
- **BR-36:** Original filenames are deterministic display metadata, never paths. The backend replaces `\` with `/`, keeps the final basename, normalizes Unicode to NFC, removes C0/DEL control characters, trims surrounding Unicode whitespace and trailing dots, replaces Windows-reserved characters (`< > : \" / \\ | ? *`) in the stem with `_`, substitutes `attachment` for an empty, `.` or `..` stem, canonicalizes `.jpeg` to `.jpg`, and truncates by Unicode code points so `stem.ext` is at most 120 characters. The physical stored name is `${crypto.randomUUID()}.${canonicalExtension}`.
- **BR-37:** The five-active-Attachment limit is atomic. After streaming to `server/uploads/.tmp`, the backend validates the file, starts a Prisma interactive transaction, obtains PostgreSQL transaction advisory lock `pg_advisory_xact_lock(141448, ticketId)`, rechecks Ticket ownership and the active count, then moves the file and creates metadata while the lock is held. A losing or failed upload removes every temporary/final file it created and leaves no active row. With four active Attachments and two concurrent valid uploads, exactly one succeeds and the final database/filesystem state contains five active files and no orphan.
- **BR-38:** Preview and download are authenticated client operations, never direct browser navigation to the protected endpoint. The client fetches binary content with `X-Development-Requester-Id`, creates a Blob/object URL, previews JPEG/PNG/WEBP in an accessible dialog, and downloads through a temporary anchor using the sanitized filename. For PDF Preview, the click synchronously opens a blank tab, clears its opener, fetches with the header, then navigates that tab to the Blob URL; a blocked popup or failed fetch closes the blank tab and shows Retry. Image URLs are revoked on dialog close/unmount, PDF URLs after the preview tab's load event (with a 60-second fallback), and download URLs in the next macrotask after the click.
- **BR-39:** Every required API capability—Requester/reference lookup, Ticket create/list/detail, Attachment upload/metadata/content/removal—has an injected unexpected-failure test. It returns that capability's documented stable safe `500` code without a stack trace, SQL, filesystem/stored path, credentials, or another Requester's data; the corresponding UI shows a safe message with Retry and clears any stale cross-Requester data.

## 6. UI Specification Summary

The detailed contract is in [`ui-spec.md`](./ui-spec.md).

- Routes are `/select-requester`, `/tickets`, `/tickets/new`, and `/tickets/:ticketId`.
- The shell displays TokTickIT identity, My Tickets, Create Ticket, the current Requester, Change Requester, and a responsive navigation control.
- Create Ticket groups read-only context, classification, Summary/Description, and Attachments, with nearby validation and a busy Submit button.
- My Tickets uses a desktop table and mobile cards, with search, filters, sort, clear controls, pagination, and distinct loading/empty/no-results/error states.
- Ticket Detail is read-only and separates Ticket information from Attachment actions.
- Desktop is at least 992 px, tablet is 768–991 px, and mobile is below 768 px. No supported viewport may clip labels/actions or introduce horizontal page scrolling.
- All controls retain visible keyboard focus, text labels, and non-color status/error indicators.

## 7. Data Changes

### Enums

- `RequestedPriority`: `LOW`, `MEDIUM`, `HIGH`.
- `TicketStatus`: `NEW` for Lab 2. Later states are added only when their workflow is implemented.

### Models

| Model | Required fields and constraints |
|---|---|
| `RequesterUser` | `id` integer primary key; `displayName`; unique normalized `email`; `isActive` default true; `createdAt`; `updatedAt`; Ticket relation. |
| `Category` | Existing `id`, unique `name`, and `createdAt`; add `isActive` default true and `updatedAt`; Ticket relation. |
| `RelatedSystem` | `id`; unique `name`; `isActive` default true; `createdAt`; `updatedAt`; Ticket relation. |
| `Ticket` | `id`; unique `ticketNumber`; foreign keys to Requester, Category, and Related System; `summary` up to 120; `description`; `requestedPriority`; nullable `itPriority`; `status` default `NEW`; `createdAt`; `updatedAt`; Attachment relation. |
| `Attachment` | `id`; Ticket foreign key; `originalName`; unique `storedName`; `mimeType`; `sizeBytes`; `createdAt`; nullable `removedAt`, `removalReason`, and `removedByRequesterId`; relations to Ticket and removing Requester. |

### Indexes and migration decisions

- Unique constraints: Requester email, Category name, Related System name, Ticket Number, and stored filename.
- Ticket indexes: `(requesterId, updatedAt)`, `(requesterId, status)`, `categoryId`, and `relatedSystemId`.
- Attachment index: `(ticketId, removedAt)`.
- Foreign keys use restrictive deletion for historical records; Lab 2 does not hard-delete Requesters, reference data, Tickets, or Attachment rows.
- The migration extends the Lab 1 Category table and creates new enums/tables without deleting Lab 1 data.
- **Justification:** `(requesterId, updatedAt)` matches the mandatory ownership filter and default My Tickets order, avoiding a full Ticket-table scan as data grows.

## 8. API Contract

The authoritative endpoint and payload definitions are in [`api-spec.md`](./api-spec.md). The required capabilities are:

- active Categories, Related Systems, and Development Requesters;
- validated Ticket creation;
- Requester-owned Ticket search/filter/sort/pagination;
- owned Ticket Detail;
- Attachment upload and metadata;
- active Attachment download/preview; and
- Attachment soft removal.

The API uses JSON except multipart Attachment upload and binary content responses. Requester-scoped endpoints require `X-Development-Requester-Id`. Expected status families include `200`, `201`, `400`, `403`, `404`, `409`, `413`, `415`, and safe `500` errors.

## 9. Acceptance Criteria

- **AC-01:** Given active and inactive seeded Requesters, when the selection screen loads, then only active Requesters appear.
- **AC-02:** Given no valid Requester is selected, when Continue or a requester route is attempted, then the user remains on or returns to the selection screen with clear guidance.
- **AC-03:** Given Requester loading fails or returns no active records, when the selector renders, then it shows the corresponding safe failure or empty state.
- **AC-04:** Given an active Requester is selected, when Continue is activated, then the selection persists for the browser session, the shell shows their name, and Change Requester clears requester-specific state.
- **AC-05:** Given active and inactive reference data, when Create Ticket loads, then only active Categories and Related Systems are offered from the database.
- **AC-06:** Given valid Ticket values and no files, when Submit is activated, then exactly one Ticket is saved and `201` returns its official Ticket Number and selected `requesterId`.
- **AC-07:** Given a newly saved Ticket, when its response and database row are inspected, then its Ticket Number matches the approved format, status is `NEW`, timestamps are server-generated, and IT Priority is null.
- **AC-08:** Given missing or boundary-invalid fields, when the form is submitted, then nearby UI messages appear and the API is not called for client-detectable errors.
- **AC-09:** Given an invalid direct API request, when it reaches the backend, then `400` returns safe structured field errors and no Ticket is saved.
- **AC-10:** Given a Ticket request is pending, when Submit is activated again, then the button remains busy/disabled and no duplicate UI request is sent.
- **AC-11:** Given one valid and one invalid selected file, when files are validated, then the invalid file is clearly rejected, the valid file remains, and creation may continue with accepted files.
- **AC-12:** Given a Ticket is created and a later initial Attachment upload fails, when results return, then the Ticket and successful uploads remain and the failed file can be retried without creating another Ticket.
- **AC-13:** Given Requester A is selected, when My Tickets loads, then every returned Ticket belongs to Requester A.
- **AC-14:** Given Requester A has Tickets, when selection changes to Requester B, then A's rows disappear and only B's results load.
- **AC-15:** Given owned Tickets, when a valid search term is applied, then only matching Ticket Numbers or Summaries are returned case-insensitively.
- **AC-16:** Given owned Tickets, when valid Category, Related System, Priority, and Status filters are combined, then every result satisfies every active filter.
- **AC-17:** Given owned Tickets, when an allowed sort and direction are selected, then results follow that order with a deterministic ID tiebreaker.
- **AC-18:** Given valid pagination parameters, when a page is requested, then the response includes correct totals and page data; invalid parameters return `400`.
- **AC-19:** Given no owned Tickets, no matching query, a pending request, or an API failure, when My Tickets renders, then it shows the correct distinct state and recovery action.
- **AC-20:** Given an owned Ticket ID, when Requester Ticket Detail loads, then its approved fields and Attachment metadata render read-only.
- **AC-21:** Given a missing Ticket or a Ticket owned by another Requester, when detail is requested directly, then the same safe `404` is returned and no protected data renders.
- **AC-22:** Given an owned Ticket with fewer than five active Attachments, when a valid file is uploaded, then `201` returns safe metadata and the file appears as active.
- **AC-23:** Given an invalid extension/MIME/signature combination, unsafe filename, oversized file, or five active Attachments, when upload is attempted, then the documented safe filename or `415`, `413`, or `409` result occurs and no invalid active row or orphaned file is created.
- **AC-24:** Given an active owned Attachment, when Preview or Download is selected, then the client fetches content with the Requester header, receives the documented content type/safe filename/disposition, uses the correct Blob behavior, and revokes the object URL at the defined lifecycle point.
- **AC-25:** Given a missing or non-owned Attachment, when metadata or content is requested, then the same safe `404` is returned.
- **AC-26:** Given an active owned Attachment and a valid reason, when removal is confirmed, then removal metadata is recorded and the row remains.
- **AC-27:** Given a removed Attachment, when Ticket Detail and its content endpoint are requested, then metadata remains visibly marked Removed and content returns safe `404`.
- **AC-28:** Given an already removed Attachment, when removal is repeated, then `409` is returned and original removal metadata is unchanged.
- **AC-29:** Given desktop, tablet, and mobile viewports, when each required screen and state is inspected, then the approved layout is usable with no clipping, overlap, or horizontal page scrolling.
- **AC-30:** Given keyboard-only use and assistive names, when navigating required workflows, then focus remains visible, controls have accessible labels, errors are associated with fields, and status is not communicated by color alone.
- **AC-31:** Given Create Ticket or Attachment API failure, when the UI reports the error, then the message is safe, retry is possible, and appropriate entered data remains.
- **AC-32:** Given a seeded environment, when the full E2E flow runs, then a selected Requester creates a Ticket, finds it in My Tickets, opens Detail, adds/downloads/removes an Attachment, and another Requester cannot access it.
- **AC-33:** Given four active Attachments, when two valid uploads execute concurrently for the same Ticket, then exactly one returns `201`, one returns `409`, the final active count is five, and no temporary/final orphan exists.
- **AC-34:** Given an injected unexpected failure in each required API capability, when the API and corresponding UI handle it, then the capability-specific stable safe `500` code, safe Retry state, and absence of sensitive or stale cross-Requester data are verified.

## 10. Definition of Done

### Product completion

- [x] All included FRs, BRs, and ACs are implemented consistently with the approved contract.
- [x] Every AC maps to at least one real automated or documented visual test in `tests.md`.
- [x] Unit, API/integration, UI component, UI style, responsive, and E2E suites pass with no required test skipped or disabled.
- [x] Database migration and idempotent seed succeed from documented setup without deleting Lab 1 data.
- [x] Backend ownership, validation, failure, boundary, and Attachment rules are enforced independently of the UI.
- [x] Concurrent Attachment boundary and compensation tests prove a five-file maximum with no temporary/final orphan.
- [x] Injected unexpected failures cover every required API capability and its safe retrying UI state.
- [x] Desktop, tablet, and mobile visual checks match `ui-spec.md` with no clipping, overlap, hidden actions, or horizontal page scrolling.
- [x] README and all Lab 2 documentation match the implementation and documented commands on final `main`.
- [x] `.env`, uploaded files, secrets, `node_modules`, and build output are not tracked.

### Course delivery

- [x] All six Lab 2 Issues are linked to the Project and follow the required Kanban transitions.
- [x] Each feature uses its own branch and peer-reviewed PR into `lab2-staging`.
- [x] Each PR is explicitly linked to its Issue; each review comment has an author response.
- [x] Phanuwit approved and performed every feature merge; for final release PR #23, he personally performed the merge and explicitly confirmed his review afterward because the formal Approve action was accidentally skipped.
- [ ] `reviewer.md` records identities, PR links, meaningful comments, responses, approvals, and merges. The final PR #24 author-response link will be added after this correction is pushed.
- [x] `ai-use.md` records the LLM, 6–10 selected prompts, decisions, corrections, and reflection.
- [x] Final tests were rerun on clean final `main`; all Issues and Kanban cards are Done.
- [ ] One concise PDF uses `Answer Part 1` through `Answer Part 9` in exact order with working links and readable evidence.

## 11. Assumptions and Decisions

- `sessionStorage` is chosen over `localStorage` so the Development Requester context is temporary but survives refreshes within one tab.
- The development header is deliberately not secure; Lab 3 must replace it with authenticated server-derived identity rather than trust it.
- Ticket Number suffixes are random rather than sequential to avoid concurrency-sensitive application-side counters; uniqueness is enforced by PostgreSQL.
- UI busy-state protection satisfies the Lab 2 duplicate-submission requirement. End-to-end request idempotency is deferred and must be reconsidered for unreliable networks.
- Ticket creation and Attachment uploads are separate operations. A valid Ticket is not deleted because a later optional file fails.
- Local filesystem storage is adequate for the local Lab 2 application. Cloud storage, antivirus scanning, and retention policies are deferred.
- PostgreSQL transaction advisory locking serializes same-Ticket Attachment admission for the single PostgreSQL service used in Lab 2; the cleanup contract covers both temporary and final local files.
- Protected Attachment preview/download uses authenticated `fetch` plus short-lived Blob URLs because ordinary image links, anchors, and new-window navigation cannot attach the Development Requester header.
- Non-owned resources use the same `404` as missing resources to minimize ownership disclosure even though the current identity mechanism is only for testing.
