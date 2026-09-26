# Lab 3 Sprint Engineering Specification

Status: Approved engineering contract. Issues #25–#29 were peer-approved and reviewer-merged through PRs #31–#35 into `lab3-staging`. Issue #30 integration/release work is in progress; final-main acceptance and the PDF remain pending.

## 1. Sprint goal

Extend TokTickIT with real login, authenticated Requester continuity, an operational IT Staff queue and workflow, and simple Administrator account management while preserving existing Ticket and Attachment data.

## 2. Stakeholder interpretation

Requesters need private access to their existing work. Staff need shared operational visibility and controlled actions. Administrators need account management. Public communication and private notes must be clearly separated in both the interface and API responses.

## 3. Scope

Included: authentication, mandatory password change, three roles, migration, existing Requester features, queue queries, assignment, IT Priority, status transitions, resolution indication, Public Comments, Internal Notes, and minimal user administration.

Excluded: registration, email delivery/reset links, MFA/SSO, Actions Taken, SLA/escalation, notifications, dashboards beyond counts, production deployment, organizations, multiple roles, user deletion, bulk/import/export, account-history and advanced recovery.

## 4. Functional requirements

| ID | Requirement | Issue |
|---|---|---|
| FR-01 | Authenticate active users; expose safe current-user data; invalidate logout; require initial-password change before normal access. | #26 |
| FR-02 | Enforce roles and Requester ownership on every protected operation; remove development selector and header trust. | #26 |
| FR-03 | Preserve users, Ticket ownership, Attachment metadata and stored files during migration and authenticated regression. | #26 |
| FR-04 | Provide minimal Administrator listing/search/create/edit/reset and account safety rules; user-approved extension combines role and Active/Inactive filtering. | #27 |
| FR-05 | Provide authorized shared queue queries and responsive display with meaningful states. | #28 |
| FR-06 | Provide Staff detail, eligible assignment, IT Priority and permitted status transitions. | #29 |
| FR-07 | Allow owners to indicate apparent resolution without formally resolving or closing tickets. | #29 |
| FR-08 | Provide append-only Public Comments and restricted Internal Notes with authoritative author/time. | #29 |
| FR-09 | Maintain Zen Green, accessibility, responsive layouts, safe errors and complete traceable verification. | #26-30 |

## 5. Business rules and authorization

Approved permission matrix. Administrator operational permissions below are explicit because the sheet permits Administrator ownership, priority changes and note visibility. They do not imply multiple roles or Requester impersonation.

| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| Current user/logout/password change | Self | Self | Self |
| Create and list submitted Tickets | Own only | No | No |
| Existing Requester detail and Attachment mutation | Own only | No | No |
| Staff queue/detail and active Attachment download | No | All tickets | All tickets |
| Claim/assign/priority/status | No | All tickets | All tickets |
| Public Comments read/post | Own tickets | All tickets | All tickets |
| Internal Notes read/post | No | All tickets | All tickets |
| Problem Appears Resolved | Own eligible tickets | No | No |
| User management | No | No | Yes |

- BR-01: Only active users with valid credentials authenticate; each has exactly one role: REQUESTER, IT_STAFF or ADMINISTRATOR.
- BR-02: Initial-password sessions may only read current-user data, change password or log out. Normal APIs reject them with PASSWORD_CHANGE_REQUIRED.
- BR-03: Authenticated identity supplies requester ownership and comment authorship; reject forged requester/author fields. Ignore no legacy header as an authentication source.
- BR-04: Requesters never receive another owner's protected resources or any Internal Note content. Missing and non-owned Requester resources use identical safe 404 responses.
- BR-05: Passwords are 12-128 characters, allow spaces/Unicode, are not trimmed, and new passwords must differ from the current password. Confirmation must match. Never log/return stored hashes or credentials.
- BR-06: Use versioned Node scrypt records with random 16-byte salt, N=131072, r=8, p=1, maxmem at least 256 MiB, 64-byte output and timing-safe comparison. Bound concurrent derivations; hashing parameters are not client-controlled.
- BR-07: Use 32 random bytes in an HttpOnly, SameSite=Lax cookie, Path=/, Secure under HTTPS. Store only token digest in PostgreSQL; absolute expiry 8 hours. Local HTTP exception is documented. No auth tokens in localStorage.
- BR-08: Every protected request checks session expiry, active account and forced-change state. Logout deletes session and expires cookie. Password change/reset, role change and deactivation revoke all sessions; successful password change creates a fresh session.
- BR-09: Allow only configured frontend origins with credentials. Unsafe requests including login require matching Origin and a server-issued CSRF token bound to the browser/session; define bootstrap in API contract. Missing/invalid tokens yield 403.
- BR-10: Login throttling permits 5 failed attempts per normalized email per 15 minutes and 30 per source IP per 15 minutes; 429 includes Retry-After. Invalid, absent and inactive credentials receive the same safe login response. Use bounded expiring records; no permanent account lock.
- BR-11: Name trims to 1-120 characters; email trims/lowercases to a syntactically valid maximum 320 characters and is unique after normalization. Preflight existing normalized duplicates before migration; stop with a report, never merge people automatically.
- BR-12: Administrators cannot deactivate themselves or remove the final active Administrator by role change/deactivation. Serialize account changes affecting these invariants in a database transaction. Use deactivation, never deletion.
- BR-13: Assignment is null or one active Staff/Administrator. Claim succeeds only if unassigned; a conflicting claim or stale mutation returns 409. Deactivation or change to REQUESTER automatically unassigns that user's owned tickets in the same transaction and preserves historical authorship.
- BR-14: Requested Priority remains LOW/MEDIUM/HIGH and is immutable after creation. IT Priority initially copies it; backfill only null existing values. Only Staff/Administrators edit IT Priority.
- BR-15: Status transitions follow the table below. Operational updates require expected version, increment version and update updatedAt atomically. For claim, manual owner changes (including unassignment) and priority changes, the locked terminal set is exactly RESOLVED, CLOSED and CANCELLED; these operations return 409 TICKET_TERMINAL even if the requested value is unchanged. NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER and REOPENED permit these operations subject to role, version, ownership and eligibility checks. Terminal status does not forbid the listed status transitions, reads or Public Comments/Notes. BR-13 automatic unassignment is a system-integrity exception: it applies in all eight statuses during account deactivation/role change, increments version/updatedAt atomically and leaves status unchanged. It is not a manual-owner endpoint bypass.
- BR-16: Problem Appears Resolved records an owner indication with backend time for OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER or REOPENED only; it does not change status. The request must include the last-read Ticket version. Within a Ticket transaction, reject a stale version with 409 VERSION_CONFLICT before checking eligibility or an existing indication. A matching version in an ineligible status returns 409 RESOLUTION_INDICATION_NOT_ALLOWED. A matching version with an existing indication returns current state unchanged; otherwise store time and increment version/updatedAt once. Reopening clears the indication and increments version atomically. Thus replaying an old successful request returns a conflict, while an explicit repeat using refreshed current state is idempotent; no new cycle can accept an old request.
- BR-17: Public Comments/Internal Notes trim to 1-4000 characters, render as plain text and are append-only. The 4000-character limit matches the existing description bound and permits useful explanations while bounding payloads. Author/time are backend-generated; never accept visibility conversion, edit or deletion.
- BR-18: Existing Requester upload/removal rules remain, including 5 MiB/file, five active files, signature validation, authorized Blob download, retained removal metadata and blocked removed-file access. Staff/Admin can read metadata and download active files but cannot mutate Attachments in this approved scope.
- BR-19: Repeatable seeds must not reset changed credentials, edited accounts or existing tickets. Provide at least 4 active + 1 inactive Requester, 3 active + 1 inactive Staff and 1 active Admin, plus realistic workflow records and comments/notes. Local initial credentials are supplied through documented local provisioning, never real personal secrets.
- BR-20: Login failure never reveals account existence. Unexpected errors never expose SQL, stack traces, paths or note content. Validation preserves non-password form input; passwords are cleared on failed submission.

### Approved transition matrix

Only IT_STAFF and ADMINISTRATOR may perform these transitions. All other pairs and same-state requests fail validation. Confirm Resolved, Closed and Cancelled in the UI; no Actions Taken dependency in Lab 3.

| From | Allowed destinations |
|---|---|
| NEW | OPEN, CANCELLED |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED |
| RESOLVED | CLOSED, REOPENED |
| CLOSED | REOPENED |
| REOPENED | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| CANCELLED | None |

## 6. UI summary

Requester My Tickets retains the existing query names and response envelope but its status filter expands to all eight Lab 3 enum values. Unknown status values return 400 INVALID_QUERY. Display labels and badges are defined in ui-spec.md; historical Lab 2 documentation stays unchanged.

See [ui-spec.md](ui-spec.md) for routes, state feedback, role navigation and visual checks. Reuse existing Zen Green tokens and components. Keep public and internal posting forms visually distinct. A hidden button never substitutes for API authorization.

## 7. Data changes and migration

| Entity | Approved change |
|---|---|
| User | Rename RequesterUser table/model preserving integer IDs, sequence, existing name/email/active/timestamps; add role, passwordHash, mustChangePassword and version. Existing users become REQUESTER. |
| Session | ID, unique token digest, User FK, createdAt, expiresAt and CSRF binding; index userId and expiresAt. Delete on revocation. |
| Ticket | Keep requesterId FK to User; add nullable ownerId FK, version default 1, requesterResolutionIndicatedAt; expand status enum, make itPriority non-null after backfill; index ownerId/status and status/updatedAt. |
| Attachment | Preserve file/storage IDs and metadata; rename removedByRequesterId relation to removedByUserId while preserving values and FK to User. API compatibility mapping is explicit in api-spec. |
| PublicComment/InternalNote | Separate tables: id, ticketId, authorId, body varchar(4000), createdAt; indexes ticketId/createdAt/id; restrictive FKs; no mutation endpoints. |

Migration stages: preflight normalized emails and FK counts; backup database and uploads; apply additive/rename SQL without reset; provision hashes for migrated accounts requiring change; backfill priorities; enforce constraints; compare IDs, counts, relationships, removed metadata and file checksums. Before provisioning, migrated accounts have no usable password hash and cannot log in. Provisioning must complete before declaring migration ready. Test both a populated Lab 2 fixture and clean installation. Preserve original timestamps where migration changes no user-visible content.

Local provisioning procedure: an explicit CLI accepts an ignored local JSON file mapping normalized email to initial password. Validate every entry and require coverage for all migrated accounts without a hash before updating anything; hash and set mustChangePassword=true in a transaction. Never print password values. Repeated provisioning skips accounts that already have hashes, preserving changed passwords. Supply fixture credentials explicitly in isolated tests. Document the command and a placeholder-only sample in README with Issue #26; no real credential file is tracked. Existing inactive users stay inactive. Administrator-created accounts use the authenticated API afterward.

Concurrency details: automatic unassignment increments each affected Ticket version and updatedAt; eligibility checks and account changes acquire compatible transaction locks so assignment cannot race deactivation. Resolution indication, reopening and status updates serialize on the Ticket; indication increments version only on its first successful change. Historical requester/comment/removal FKs remain valid after a User changes role.

Design rationale: preserving identity keys avoids rewriting ownership and removal history. Separate comment/note tables make accidental inclusion in Requester responses easier to prevent. Sessions allow immediate revocation without waiting for self-contained tokens to expire.

## 8. API summary

See [api-spec.md](api-spec.md). Retain Requester route names with new authentication; remove `/api/development-requesters`. Introduce auth, Staff and Administrator routes. New operational updates use optimistic versions and transactions; no last-write-wins edits.

## 9. Acceptance criteria

| ID | Given / When / Then |
|---|---|
| AC-01 | Given active valid credentials, when login succeeds, then safe identity and session are established; absent/invalid/inactive credentials fail safely and throttling works. |
| AC-02 | Given initial credentials, when signed in, then normal UI and direct APIs stay blocked until valid password change; logout/expiry/revocation prevent reuse. |
| AC-03 | Given migrated Lab 2 data, when migration/provisioning and repeated seeds complete, then ownership/files/history remain intact and repeat runs preserve user changes. |
| AC-04 | Given authenticated Requester A, when requesting B's resources or forging identity/legacy headers, then access is rejected and no protected data leaks; A's Lab 2 flows still work. |
| AC-05 | Given an Admin, when listing/searching/creating/editing/resetting accounts, then validated changes persist with one role and required next-login password change. |
| AC-06 | Given self/last-Admin or non-Admin requests, when forbidden account operations are attempted including concurrent changes, then invariants hold and access is denied. |
| AC-07 | Given Staff queue data, when queries combine search/filter/order/page, then deterministic valid results and metadata appear; invalid queries and failure/empty states are handled. |
| AC-08 | Given eligible assignment and current version, when Staff claims/reassigns/changes priority, then one atomic update persists; inactive owners, conflicting claims and stale versions fail. |
| AC-09 | Given each status, when a permitted role requests a transition, then only matrix edges succeed; Requester indication does not formally resolve/close. |
| AC-10 | Given a Ticket, when permitted users post/read comments or notes, then validation, plain-text rendering and author/time hold; Requesters never obtain notes; edits/deletes are unavailable. |
| AC-11 | Given owned/Staff Attachment access, when downloading/removing through permitted routes, then Lab 2 continuity holds and removed/cross-owner files stay inaccessible. |
| AC-12 | Given desktop/tablet/mobile or keyboard-only use, when navigating all roles and forms, then controls/focus/states remain usable with no page overflow. |
| AC-13 | Given full integration on final main, when documented isolated verification runs, then required tests/builds pass and development data/uploads remain unchanged. |

## 10. Product Definition of Done

- [x] Contract reviewed/approved before implementation; early evidence retained.
- [ ] FR-01 through FR-09 and AC-01 through AC-13 satisfied with linked executable tests.
- [ ] Preserved-data migration and repeatable provisioning/seed verified; no real credentials committed.
- [ ] Authentication/role/ownership/CSRF/conflict/safe-error checks hold on direct APIs.
- [ ] All feature tests, builds and isolated E2E pass with no required skips.
- [ ] Major screens inspected at three widths and by keyboard; visual checklist complete.
- [ ] All six docs and README reflect actual behavior and evidence; AI reflection remains honest.
- [ ] PRs linked, review findings answered, peer approvals and reviewer merges recorded in both directions.
- [ ] Release merged through lab3-staging to main; final main verified and all Issues Done after acceptance.
- [ ] One concise PDF uses Answer Part 1-9 with required rendered docs and readable captioned evidence.

## 11. Approved design decisions

PR #31 approved the explicit Administrator operational permission set, cookie-session design/password policy, transition matrix, resolution-indication behavior, automatic unassignment, and Staff read-only Attachment access. Issue #29 implements those reviewed decisions without adding Actions Taken or other excluded scope.
