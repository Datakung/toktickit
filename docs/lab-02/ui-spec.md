# Lab 2 Zen Green UI Specification

This document defines the reusable visual, responsive, state, and accessibility contract for Lab 2. Illustrations are guidance; these written rules are authoritative.

## 1. Design Tokens

| Token | Value | Intended use |
|---|---|---|
| `--green-700` | `#006B3C` | Header, primary actions, strongest emphasis. |
| `--green-600` | `#0B7A46` | Active navigation, links, focus accents, hover. |
| `--green-100` | `#EAF6EF` | Selected rows/cards, success panels, subtle section emphasis. |
| `--page-bg` | `#F5F7F6` | Page background. |
| `--surface` | `#FFFFFF` | Cards, forms, tables, modal surfaces. |
| `--text` | `#18352A` | Primary charcoal-green text. |
| `--muted` | `#52665E` | Secondary text while maintaining contrast. |
| `--border` | `#C8D5CF` | Neutral control/card/table borders. |
| `--readonly-bg` | `#F0F3EE` | Read-only controls and generated values. |
| `--error` | `#9B1C1C` | Error text and invalid borders. |
| `--error-bg` | `#FDECEC` | Error callouts. |
| `--warning` | `#8A4B08` | Warning text/border. |
| `--warning-bg` | `#FFF4D6` | Warning callouts. |
| `--success` | `#12633B` | Success text/icon. |
| `--focus` | `#0B7A46` | Visible 3 px focus ring with sufficient offset. |

Use a system sans-serif stack. Body text is at least 16 px, helper/error text at least 14 px, and line height at least 1.4. Spacing follows a 4 px base scale (`4, 8, 12, 16, 24, 32, 48`). Main content is centered with a maximum width around 1200 px.

## 2. Shared Application Shell

- Header shows **TokTickIT IT Service Desk** and uses `--green-700`.
- Navigation contains **My Tickets** and **Create Ticket** with a visible active-page indicator.
- The current Development Requester is shown by name with a **Change Requester** text action.
- A persistent non-security cue identifies the context as Development Requester testing where appropriate.
- Desktop navigation is horizontal. Below 768 px it becomes a keyboard-operable menu with visible text labels.
- Page title is an `h1`; sections follow a logical heading order.
- Route mapping:
  - `/select-requester`
  - `/tickets`
  - `/tickets/new`
  - `/tickets/:ticketId`
- Requester-specific routes redirect to `/select-requester` when no valid session selection exists.
- Changing Requester clears requester-specific state and returns to selection; after a new selection, the app opens My Tickets.

## 3. Component Rules

### Form controls

- Labels appear above controls with consistent weight and spacing.
- Required labels include a red asterisk plus accessible text; the asterisk never replaces validation.
- Editable controls use white background and neutral border.
- Read-only values use `--readonly-bg`, remain readable, and are not styled like disabled content.
- Invalid controls use an error border, `aria-invalid="true"`, and a nearby message referenced with `aria-describedby`.
- Disabled controls are visibly muted and cannot activate.
- Focus indicators remain visible and are never removed without replacement.
- Textarea has sufficient height; vertical resize is allowed only if layout remains usable.

### Buttons

| Hierarchy | Style and use |
|---|---|
| Primary | Solid `--green-700`; one dominant action such as Continue, Submit Ticket, or Upload. |
| Secondary | White with green border/text; navigation or non-destructive alternative. |
| Tertiary | Text/link treatment for Change Requester, Clear Filters, Back. |
| Destructive | Dark red outline/solid only for confirmed Remove action. |
| Disabled | Muted surface/text and no pointer/keyboard activation. |
| Busy | Visible spinner plus text such as `Submitting…`; disabled and `aria-busy`. |

Icons may support labels but do not replace unclear text. Every icon-only control requires an accessible name and tooltip.

### Feedback

- Loading uses visible text and progress indication, not a spinner alone.
- Success includes text and next actions, not green alone.
- Warning uses amber only for meaningful caution.
- Errors use a safe message, recovery action, and field-level details where applicable.
- Retry does not discard safe user input.
- Empty and no-results states are visually distinct and explain the next action.
- Injected failures are covered for Requester/reference loading, Ticket create/list/detail, and Attachment upload/metadata/content/removal. Each state displays a capability-appropriate safe message with Retry and never exposes server internals or stale data from a previously selected Requester.

### Badges

- Requested Priority: labeled `Low`, `Medium`, or `High`; text remains visible independently of color.
- IT Priority: `Not assigned` in neutral style during Lab 2.
- Current Status: `New` in pale green with dark green text.
- Removed Attachment: `Removed` with neutral/error-accent treatment and removal details.

## 4. Development Requester Selection

### Structure

- TokTickIT title and concise explanation:
  > Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication and role-based access will be introduced in Lab 3.
- Required **Development Requester** dropdown loaded from PostgreSQL.
- Primary **Continue** button, disabled until a valid active Requester is selected.

### States

- **Loading:** dropdown and Continue disabled; `Loading Development Requesters…` announced politely.
- **Ready:** active Requesters shown by display name and email; no inactive Requester appears.
- **No selection:** Continue disabled; attempted invalid continuation provides nearby guidance.
- **Empty:** explanatory panel says no active Development Requesters are available; no Continue action.
- **Failure:** safe error with Retry; no fabricated options.
- **Selected:** Continue stores the ID in `sessionStorage`, initializes context, and opens My Tickets.

### Accessibility

- Dropdown has a programmatic label and helper text.
- Keyboard Tab/arrow/Enter flow works in logical order.
- Loading, empty, and failure changes use an appropriate live region without repeated announcements.

## 5. Create Ticket

### Desktop arrangement

1. Page heading and short guidance.
2. Read-only context row: Requester, Ticket Number (`Generated after submission`), Ticket Date (`Generated after submission`), Current Status (`New`), IT Priority (`Not assigned`).
3. Two-column classification row: Category and Related System.
4. Requested Priority and Summary, with Summary receiving greater width.
5. Full-width Description.
6. Full-width Attachment selection and selected-file list.
7. Actions: primary **Submit Ticket** and secondary **Cancel/Back to My Tickets**.

### Validation and file selection

- Summary and Description counters show current/max characters.
- Invalid fields display messages immediately after blur or submit, without aggressive validation on the first keystroke.
- File picker accepts `.jpg,.jpeg,.png,.webp,.pdf` but this hint is not treated as validation.
- Helper text states the permitted JPG/JPEG, PNG, WEBP, and PDF types, the 5 MiB per-file limit, and the maximum of five active Attachments.
- Selected files show name, type, formatted size, valid/invalid state, and Remove Selection action.
- Invalid files are rejected with a specific reason; valid selections remain.
- The UI shows `n of 5 attachments selected` and prevents more than five accepted selections.

### Screen states

- **Initial:** reference data loading; form controls dependent on it are disabled.
- **Ready:** editable fields available; read-only fields clearly distinct.
- **Validation failure:** nearby messages; focus moves to an error summary link or first invalid field while preserving all values.
- **Submitting Ticket:** primary button says `Submitting…`, form cannot submit twice, fields remain visible.
- **Uploading Attachments:** Ticket Number is fixed and each accepted file shows pending/uploading/succeeded/failed.
- **Success:** confirmation prominently shows the official Ticket Number and actions **View Ticket**, **My Tickets**, and **Create another Ticket**.
- **Partial Attachment failure:** Ticket success remains; failed files and Retry are shown without a second Ticket submission.
- **API failure before creation:** safe callout with Retry; editable values and valid selections remain.

## 6. My Tickets

### Controls

- Header contains title, concise ownership context, and primary **Create Ticket**.
- Search input targets Ticket Number or Summary and has visible Search and Clear behavior.
- Filters: Category, Related System, Requested Priority, and Status.
- Sort field and direction controls are explicit.
- **Clear Filters** restores documented defaults.
- Pagination shows current page, total pages/items, Previous/Next, and page size.

### Desktop table

Columns:

1. Ticket Number (link/action to detail)
2. Summary
3. Category
4. Related System
5. Requested Priority badge
6. Current Status badge
7. Last Updated

Headers identify sortable fields where supported. Every row is understandable without relying on color. Do not make an entire row keyboard-clickable without a clear link/button.

### Mobile representation

- Below 768 px, use cards rather than forcing the desktop table horizontally.
- Each card shows Ticket Number, Summary, Category/System, Priority, Status, Updated time, and **View Ticket**.
- Search/filter controls stack; a compact filter disclosure is permitted if keyboard accessible.
- Pagination remains touch-friendly with at least 44 px control targets.

### States

- **Loading:** skeleton or progress with `Loading your Tickets…`.
- **Empty:** no owned Tickets; explain and offer **Create Ticket**.
- **No results:** active query matches none; offer **Clear Filters** without claiming no Tickets exist.
- **Failure:** safe error and Retry; do not render previous Requester's stale results.
- **Ready:** list and accurate pagination metadata.
- On Requester change, old rows disappear before the new request begins.

## 7. Requester Ticket Detail

### Structure

- Back to My Tickets, page title containing Ticket Number, and status badge.
- Read-only sections:
  - Requester and system-generated values;
  - Category, Related System, Requested Priority, IT Priority, Current Status;
  - Summary and Description;
  - created and updated timestamps.
- Separate **Attachments** section with upload action and active-count indicator.
- No comments, notes, actions, assignment, or status controls.

### Attachment presentation

- Active item shows original filename, type, formatted size, created time, **Preview/Download**, and **Remove**.
- **Preview** is offered only for JPEG, PNG, WEBP, and PDF. It fetches content with the current Development Requester header, creates an object URL, and displays images in an accessible dialog. A PDF click synchronously opens a blank tab, clears its opener, then navigates it to the fetched Blob URL; a blocked popup or failed fetch closes the blank tab and shows Retry. The protected API URL is never used directly in `src`, `href`, or `window.open`.
- **Download** performs the same authenticated fetch with `disposition=attachment`, then clicks a temporary anchor whose `download` value is the server-sanitized filename.
- Image object URLs are revoked on dialog close/unmount, PDF URLs after the tab's load event with a 60-second fallback, and download URLs in the next macrotask after the anchor click. Preview and Download show separate busy/error states and allow Retry without reloading Ticket Detail.
- Upload row shows selecting, validating, uploading, success, and failure states.
- At five active Attachments, upload is disabled with explanatory text.
- Removed item retains original filename, size/type, created time, `Removed` badge, removed time, and reason. It has no preview/download/remove action.
- Long filenames wrap or truncate visually with full accessible text/tooltip; they never force horizontal page scrolling.

### Removal interaction

- **Remove** opens an accessible confirmation dialog naming the file.
- Required reason textarea is 5–250 characters with counter and validation.
- Destructive confirmation is clearly separated from Cancel.
- Busy state prevents repeated removal.
- Success updates the item to Removed without deleting it from the metadata list.

### States

- Loading, owned ready, no Attachments, Attachment uploading, preview/download busy or failure, removal confirmation/busy, safe not-found/unavailable, and recoverable metadata/upload/content/removal API failures.
- Missing and non-owned Tickets share the same safe unavailable UI.

## 8. Responsive Layout Rules

| Viewport | Contract |
|---|---|
| Desktop `>= 992 px` | Centered max-width content; two-column form areas where specified; My Tickets table visible. |
| Tablet `768–991 px` | Two columns where practical; Summary/Description and Attachments remain full width; controls wrap without overlap. |
| Mobile `< 768 px` | Single-column fields and actions; mobile navigation; Ticket cards; touch-friendly controls; dialogs fit viewport. |
| All | No clipped labels, overlapping validation, hidden actions, unreadable filenames, or unintended horizontal page scrolling. |

Test reference widths are desktop 1440×900, tablet 820×1180, and mobile 390×844. Zoom and text resizing must not make essential actions unreachable.

## 9. Accessibility Contract

- One `h1` per screen and logical heading hierarchy.
- Landmarks for header/navigation/main; skip link to main content.
- Every input has a persistent visible label.
- Form error summary links to invalid fields; errors are associated programmatically.
- Focus moves only for a clear reason: route heading, opened dialog, first invalid field/error summary, or returned trigger after dialog close.
- Dialog traps focus while open and closes with Escape when safe.
- Status/loading updates use polite live regions; critical failure may use alert semantics.
- Color contrast meets WCAG AA; color is never the sole status indicator.
- Interactive targets are keyboard reachable and approximately 44×44 px on touch layouts.

## 10. Screenshot Evidence Paths

Required course screenshots are committed under the following evidence structure. They contain demonstration data only; actual uploaded user files remain under the ignored server upload directory and are never committed:

```text
artifacts/lab-02/screenshots/
|-- create-ticket/
|   |-- initial-desktop.png
|   |-- initial-tablet.png
|   `-- initial-mobile.png
|-- my-tickets/
|   |-- requester-a-desktop.png
|   |-- requester-a-tablet.png
|   `-- requester-a-mobile.png
`-- ticket-detail/
    |-- owned-desktop.png
    |-- tablet.png
    `-- mobile.png
```

These nine files are the actual Issue #16 responsive evidence. They are refreshed only by the explicit `npm --prefix client run test:e2e:evidence` command, which uses fixed seeded E2E data. Routine `test:e2e` screenshots go to ignored Playwright output and cannot overwrite reviewed evidence. Validation, submitting, success, API-failure, invalid-file, empty/no-results, Attachment lifecycle, and ownership states are covered by the traceable component/API/E2E tests in `tests.md` rather than represented as nonexistent screenshot paths.

## 11. Visual Inspection Checklist

Checked by automated assertions and manual inspection of the generated evidence on 2026-09-02:

- [x] Primary/secondary greens, page background, surfaces, text, borders, and feedback colors match the tokens.
- [x] Editable and read-only fields are distinct and readable.
- [x] Required markers and nearby validation messages are consistent.
- [x] Button hierarchy, disabled state, busy state, and destructive confirmation are clear.
- [x] Requested Priority, IT Priority, Current Status, and Removed badges are consistent and textual.
- [x] Application shell and active navigation work at desktop and mobile widths.
- [x] Create Ticket states are complete and preserve values on safe retry.
- [x] My Tickets desktop table and mobile cards remain usable with filters and pagination.
- [x] Ticket Detail remains read-only and Attachment actions/states are distinct.
- [x] Desktop, tablet, and mobile screenshots show no clipping, overlap, hidden action, or horizontal page scrolling.
- [x] Keyboard focus, labels, dialogs, error associations, and live feedback pass inspection.
