# Lab 3 UI Specification

Status: Evolving implementation record. Issue #27 Administrator and Issue #28 Staff queue branch layouts have automated responsive checks and author-side visual inspection; final release evidence remains pending. Reuse [Lab 2 design tokens and component rules](../lab-02/ui-spec.md); this document overrides only identity/navigation and adds Lab 3 screens.

## Shared shell and routes

Show authenticated displayName, one role badge, Change Password and Logout. REQUESTER navigation: My Tickets/Create Ticket. IT_STAFF: Ticket Queue. ADMINISTRATOR: Users and Ticket Queue (explicit proposed authorization). Remove Development Requester/Change Requester and clear obsolete selection storage during migration.

| Route | Role/mode | Main content |
|---|---|---|
| /login | Public | Email/password, safe failure, submit busy state |
| /change-password | Authenticated, including initial password | Current/new/confirmation, visible password rules |
| /tickets, /tickets/new, /tickets/:id | Requester | Existing screens; detail adds comments and resolution indication |
| /staff/tickets | Staff/Admin | Shared queue with search/filter/order/pagination |
| /staff/tickets/:id | Staff/Admin | Read detail plus separately saved operational fields, comments, notes, files |
| /admin/users | Admin | User list with create/edit panel and separate reset-password action |

Unauthenticated protected navigation leads to login. Mandatory-change users always reach Change Password. Post-login destination is the role home; do not accept arbitrary external redirect URLs. Forbidden role routes show safe access feedback and a valid home link. Reload/back/forward revalidate session and clear prior user's cached data. Logout clears user data and blocks direct access immediately.

## Screens and feedback

### Requester status continuity

My Tickets uses the existing `status` query parameter with All statuses (parameter omitted) and all eight options below. Use the same labels on Requester/Staff filter controls and badges. Invalid status feedback preserves the other filters and offers clearing the invalid choice. Status changes never expose a different Requester's records.

| API enum | Label/badge text |
|---|---|
| NEW | New |
| OPEN | Open |
| IN_PROGRESS | In Progress |
| WAITING_FOR_REQUESTER | Waiting for Requester |
| RESOLVED | Resolved |
| CLOSED | Closed |
| REOPENED | Reopened |
| CANCELLED | Cancelled |

### Operational state feedback

Staff detail disables claim, manual owner/unassign and priority controls for RESOLVED, CLOSED and CANCELLED, with an explanation. Status actions still follow the transition matrix. NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER and REOPENED expose eligible controls. Direct 409 TICKET_TERMINAL errors explain the restriction and offer reload. Account-triggered unassignment can still change a terminal Ticket's owner; refreshing shows Unassigned and the unchanged status.

Requester resolution submits the displayed Ticket version. A successful response refreshes displayed status/version/indication/time. Disable the action when an indication already exists. On VERSION_CONFLICT, explain that the Ticket changed, reload owned detail, and require an explicit fresh action if still eligible; never silently retry. Reopened detail displays the cleared indication. An in-flight response must not overwrite newer state after reload or navigation. RESOLUTION_INDICATION_NOT_ALLOWED explains the current status restriction.

### Screen behavior

- Login: labeled email/password; show/hide control with accessible name; allow paste/password managers. Disable repeat submission while signing in. Invalid/unknown/inactive login uses the same safe message; offer contact-Administrator guidance without identifying account existence. Clear password on failure.
- Change Password: explain mandatory restriction; 12-128-character policy and matching confirmation; do not trim password. Busy state, nearby errors, successful session replacement and role-home navigation. Logout remains available during forced change.
- Queue: desktop columns Ticket Number, Summary, Requested/IT Priority, Status, Owner, Updated and Open. Optional fields remain in filters/detail to avoid a mega-grid. Search on explicit submit; filter/order/page-size changes reset page to 1. Show applied filters and Clear Filters, total and page controls. Mobile uses labeled cards.
- Staff Detail: immutable Ticket context/description; separate owner/priority/status forms. Eligible owner dropdown includes Unassigned. Show Claim only when available. Confirm terminal transitions. A stale version shows conflict with Reload and preserves intended input; user reviews current values before retrying.
- Comments/Notes: visibly separate headings, forms and explanations; Internal Notes clearly labeled Staff/Admin only. No shared visibility toggle, edit or delete. Disable posting duplicates while busy; preserve text on errors, clear only after confirmed success. Render submitted content as text.
- Requester detail: existing attachments plus Public Comments and Problem Appears Resolved for eligible states. Show backend indication timestamp after success; no formal resolution/closure control.
- Admin: list Name/Email/Role/Status/Edit; name/email search, optional role and All statuses/Active/Inactive filters combined with AND. Clear filters resets all three. This status filter is a user-approved Issue #27 extension. Create/edit requires labeled basic fields and one-role select. Initial-password field is write-only; reset uses a separate confirmed form. Explain deactivation consequences, including unassignment/session revocation. Backend self/last-Admin errors appear clearly; do not rely on disabled controls alone.
- Administrator and Requester headers place Change password above the signed-in identity. User-row Edit and Reset password actions share a horizontal row with adequate Actions-column space and 44px minimum button height; mobile cards retain both actions without page overflow.
- All screens: initial loading, processing, validation, success, empty/no-results where applicable, forbidden/not-found, conflict and safe API failure with useful retry. Preserve nonsecret edits on recoverable errors. Do not show a generic offline state for every authorization error.

## Accessibility and responsive checks

Use the existing green tokens, 16px body/14px helper minimum, 4px spacing scale, maximum content width around 1200px, visible 3px focus and 44px touch targets. Read-only data remains readable, distinct from disabled controls. Status/priority/role badges include text, never color alone.

At 1440px use desktop table/forms; at 768px adapt columns/stack panels; at 390px use cards and one-column forms. No page-level horizontal overflow, clipped content or overlapping controls. Long names, email addresses, summaries and filenames wrap safely.

Labels, aria-invalid/describedby, error summary focus, live status announcements and one h1 per route are required. Dialogs trap focus, support Escape when safe and restore focus to their trigger. Route changes focus the heading. Modal destructive confirmation cannot be submitted twice.

## Planned evidence

Issue #27 development verification: Administrator list/create editor inspected at 1440, 768 and 390px. Desktop table becomes labeled cards at smaller widths. Forms stack without page overflow. Browser checks cover heading/field focus and returning focus after Cancel. Reset and access-changing edits use an inline confirmation checkbox and separate submit action, not a modal. Component checks cover safe failure/retry, password clearing, stale edits with explicit reload and forbidden role routes.

Issue #28 development verification: realistic assigned/unassigned queue records and all eight status labels were inspected at 1440, 768 and 390px. Desktop uses a readable table; tablet/mobile use labeled cards; search and filters stack; automated checks prove heading/input focus, direct Requester denial and no page-level horizontal overflow. On 2026-09-17 the author also confirmed the Mali Support IT Staff queue at 390px, measured no page-level horizontal overflow through the browser Inspect console, and captured the safe Access denied result for a Requester opening `/staff/tickets`. These conversation screenshots and ignored Playwright-output screenshots are development evidence, not final PDF evidence. Final Staff detail and final-revision evidence remain pending.

Screenshot folders: `artifacts/lab-03/screenshots/authentication/`, `staff-queue/`, `staff-ticket-detail/`, `user-management/`. Capture desktop/tablet/mobile for each major screen, plus first-password and Requester comment/resolution regression evidence. Routine E2E uses temporary output; deterministic evidence generation is explicit.

- [ ] Tokens, typography, controls and role navigation consistent.
- [ ] Create/view/edit, required feedback and public/internal separation checked.
- [ ] Editable/read-only/invalid/disabled/focus styling and validation placement checked.
- [ ] Keyboard, dialog focus and screen-reader labels checked.
- [ ] All major screens inspected at 1440, 768 and 390px, including long content.
- [ ] No clipping, overlap or horizontal page overflow.
- [ ] Every final screenshot is readable, captioned and tied to the final tested revision.
