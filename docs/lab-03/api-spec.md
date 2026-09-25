# Lab 3 API Contract

Status: Approved contract; authentication, Administrator endpoints, Staff queue, Ticket operations and communication are implemented through Issue #29. See [specification.md](specification.md).

## Shared contract

Base `/api`. JSON uses camelCase; timestamps are UTC ISO 8601; IDs are positive PostgreSQL integers. Reject unknown body/query fields, arrays where scalars are expected, duplicate scalar query parameters and malformed JSON. Errors use `{error:{code,message,fields?}}`; fields maps field names to safe validation messages.

Statuses: 400 invalid input; 401 missing/invalid/expired session or invalid login; 403 role/CSRF/mandatory-change rejection; 404 protected unavailable resource; 409 duplicate email/stale version/assignment or account invariant conflict; 413 upload limit; 429 throttling with Retry-After; 500 generic unexpected failure. Apply identity and role checks before protected lookups. Logout is idempotent 204 for an absent session with valid browser CSRF context.

No hashes, session digests, stored file paths or Internal Note content in unauthorized responses. Auth responses have Cache-Control: no-store. Fetch uses credentials: include. Use exact configured frontend origins, never wildcard credentials CORS. Unsafe operations require X-CSRF-Token and matching Origin.

## Authentication

SafeUser = `{id,displayName,email,role,isActive,mustChangePassword}`. Passwords are never included in read DTOs.

| Method/path | Input | Success | Access |
|---|---|---|---|
| GET /auth/csrf | None | 200 `{csrfToken}`; random signed HttpOnly browser-context cookie | Public bootstrap |
| POST /auth/login | `{email,password}` + CSRF | 200 `{user:SafeUser,csrfToken}`; replace session cookie and rotate CSRF | Public, rate-limited |
| GET /auth/me | Session | 200 `{user:SafeUser,csrfToken}` | Active session, including mandatory-change |
| POST /auth/change-password | `{currentPassword,newPassword,confirmPassword}` | 200 `{user:SafeUser,csrfToken}`; revoke all old sessions and issue new one | Active session, including mandatory-change |
| POST /auth/logout | Empty body | 204; revoke and expire cookie | Including mandatory-change |

CSRF bootstrap token is HMAC-bound to a random browser cookie and short expiry (30 minutes) using a server-only secret. Session CSRF is derived using HMAC with a separate server-only CSRF secret, a purpose label and the raw session cookie. Store its digest with the session and verify with a timing-safe comparison. The server can rederive the same token for /auth/me after reload without storing a recoverable session token. Return it only to the configured frontend origin; rotate it with session replacement. Never persist credentials/tokens in localStorage. Failed login clears password input. Backend checking current password remains necessary for authenticated password changes.

## Authenticated Requester continuity

Retain the Lab 2 endpoints/shapes documented in [Lab 2 API contract](../lab-02/api-spec.md), except identity now comes exclusively from the session, `itPriority` is populated at creation, and detail adds operational read fields. `/development-requesters` is removed. Reference categories/related-systems retain ordering and become authenticated normal-session endpoints for all roles; /health remains public.

Requester create/list/detail/upload/removal remain REQUESTER-only and owned. Reject requesterId in create bodies. Legacy development headers never establish access. Preserve the existing removal metadata response field names as compatibility aliases during Lab 3, mapping from renamed database removedByUserId; do not rename the public Lab 2 DTO fields in this increment. Test exact historical IDs and names against the prior DTO contract.

## Staff and communication

Requester `GET /tickets` explicitly overrides the inherited status validator: optional `status` accepts NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED and CANCELLED. Omission means all owned statuses. Unknown, lowercase, empty, repeated or non-scalar values return 400 INVALID_QUERY. All other inherited query names, combined-filter behavior, ordering and response envelopes remain unchanged. Status labels/badges follow ui-spec.md.

StaffTicket = existing safe Ticket detail fields plus `{owner:{id,displayName}|null,version,requesterResolutionIndicatedAt}`. Existing requester detail exposes these read fields but never notes. Staff and Admin can use `/staff/*`; this does not grant user-management access to Staff.

| Method/path | Input | Success |
|---|---|---|
| GET /staff/tickets | Queue query below | 200 `{items:StaffTicketSummary[],page,pageSize,total,totalPages}` |
| GET /staff/tickets/:id | ID | 200 StaffTicket plus safe active/removed Attachment metadata |
| GET /staff/owners | None | 200 `{items:[{id,displayName,role}]}` active Staff/Admin, name then ID order |
| POST /staff/tickets/:id/claim | `{version}` | 200 updated StaffTicket; only unassigned nonterminal ticket |
| PATCH /staff/tickets/:id/owner | `{ownerId:null|id,version}` | 200 updated StaffTicket |
| PATCH /staff/tickets/:id/priority | `{itPriority,version}` | 200 updated StaffTicket |
| PATCH /staff/tickets/:id/status | `{status,version}` | 200 updated StaffTicket |
| GET /staff/tickets/:id/attachments/:attachmentId/download | IDs | 200 bytes, safe Content-Type/Disposition; removed/missing yields 404 |
| POST /tickets/:id/resolution-indication | `{version}` | 200 `{id,status,version,requesterResolutionIndicatedAt,updatedAt}`; Requester owner only |
| GET /tickets/:id/comments | `page=1&pageSize=20` | 200 `{items:[Entry],page,pageSize,total,totalPages}` |
| POST /tickets/:id/comments | `{body}` | 201 Entry |
| GET /staff/tickets/:id/notes | `page=1&pageSize=20` | 200 same pagination shape with Entry items |
| POST /staff/tickets/:id/notes | `{body}` | 201 Entry |

Entry = `{id,body,author:{id,displayName},createdAt}`. Comments allow Requester owner, Staff or Admin. Notes only Staff/Admin. Ordering createdAt ascending then id ascending; pages 1+, pageSize 10/20/50. No PATCH/DELETE entries. A 409 operational conflict preserves local input and offers reload; do not silently retry stale mutations. Use atomic expected-version comparisons and transactional eligibility checks.

Queue summary includes id, ticketNumber, summary, requester displayName, category, relatedSystem, requestedPriority, itPriority, status, owner, createdAt, updatedAt and version. Detail-only description is omitted.

### Operational guards and resolution concurrency

After authentication/role/resource access and payload validation, check the expected version inside the mutation transaction. A mismatch returns 409 VERSION_CONFLICT without mutation. With a matching version, claim, manual owner changes (including null) and priority changes reject RESOLVED, CLOSED and CANCELLED with 409 TICKET_TERMINAL. They permit NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER and REOPENED subject to remaining rules; an already-assigned claim returns 409 TICKET_ALREADY_ASSIGNED, and an ineligible target owner returns 400 INVALID_OWNER. These guards apply even to unchanged manual values. Allowed status transitions remain governed by the matrix, so RESOLVED -> CLOSED/REOPENED and CLOSED -> REOPENED are still possible.

Account-triggered automatic unassignment under BR-13 is permitted in all eight statuses as a transaction-internal integrity operation, with version/updatedAt increments and unchanged status. No manual API may invoke this exception.

Resolution indication checks ownership, validates positive integer version, then serializes its version/status/indication checks with Staff transitions. Stale version takes precedence over ineligible status or an existing indication: 409 VERSION_CONFLICT. Current version in an ineligible status: 409 RESOLUTION_INDICATION_NOT_ALLOWED. Current version with an existing indication: 200 current response fields without changing timestamp/version. First valid indication: 200 updated fields with incremented version. Reopening clears indication and increments version; a request delayed across resolve/reopen must fail with VERSION_CONFLICT. Conflict responses use the shared error shape; reload owned detail to obtain fresh state, and require explicit user confirmation before resubmitting. Never automatically retry with a newer version.

### Queue query parameters

`q` trims to 0-120 characters, case-insensitive literal substring of ticketNumber or summary (escape SQL wildcard semantics). Optional categoryId, relatedSystemId, ownerId, status, itPriority and unassigned=true/false. ownerId with unassigned=true is invalid. sort is updatedAt (default), createdAt or itPriority; direction desc (default) or asc. Priority semantic order LOW < MEDIUM < HIGH. Tie-break id in same direction. page positive integer, pageSize 10/20/50 (default 10). Beyond-last page yields empty items with accurate total; totalPages is at least 1. Filters combine with AND; status/priority use enum values. Missing filters mean all.

## Administrator

User-requested Issue #27 extension: omitted isActive means both active and inactive accounts. Only literal scalar strings true/false are valid; empty, repeated, nested or other values return 400 INVALID_QUERY. Search, role and status combine with AND.

Issue #27 implements these four endpoints. All account mutations take PostgreSQL transaction advisory lock `2730001`, then recheck the acting Administrator's current session/role. Target rows are locked before checking the expected version; account/session/Ticket changes commit together. Future assignment mutations must take the same advisory lock before checking owner eligibility. Login and password-change transactions also lock and recheck the User row to prevent late credentials from restoring a revoked session.

The additive `20260915090000_admin_assignment_safety` migration introduces nullable Ticket ownerId and version=1 without altering existing timestamps or relationships. Automatic unassignment has no status filter. Issue #28's additive `20260916090000_staff_queue_statuses` migration introduces the seven remaining approved TicketStatus enum values; queue and Requester reads support all eight. Issue #29's additive `20260925090000_ticket_operations_communication` migration adds requesterResolutionIndicatedAt and separate restrictive PublicComment/InternalNote history tables. Assignment endpoints share the Administrator advisory lock before owner eligibility checks, and Ticket mutations lock the Ticket row before version/state decisions.

AdminUser = SafeUser plus `{version,createdAt,updatedAt}`. Never return hashes. All endpoints require ADMINISTRATOR and completed password change.

| Method/path | Input | Success |
|---|---|---|
| GET /admin/users | optional q (name/email literal substring, max 120), role, isActive=true/false | 200 `{items:AdminUser[]}` ordered displayName then id; no required pagination |
| POST /admin/users | `{displayName,email,role,isActive,initialPassword}` | 201 AdminUser; mustChangePassword=true |
| PATCH /admin/users/:id | `{displayName,email,role,isActive,version}` | 200 AdminUser |
| POST /admin/users/:id/initial-password | `{initialPassword,version}` | 200 AdminUser; mandatory change, session revocation, version increment |

Required properties cannot be omitted from create/edit. Account update/reset checks versions inside transactions. Duplicate normalized email and self/last-Admin violations yield 409 with stable codes EMAIL_CONFLICT, SELF_DEACTIVATION_FORBIDDEN, LAST_ADMIN_REQUIRED or VERSION_CONFLICT. Role/deactivation effects and unassignment follow BR-08/12/13. Reset never echoes credentials. Administrator securely communicates initial password outside the application for this local lab; no email delivery feature.
