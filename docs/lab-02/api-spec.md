# Lab 2 REST API Specification

This document is the authoritative Lab 2 HTTP contract. Examples omit fields only where stated. The implementation must not silently return a different shape.

## 1. General Conventions

- Base path: `/api`.
- JSON request and response bodies use `camelCase`.
- Timestamps are UTC ISO 8601 strings.
- IDs are positive integers.
- Requester-scoped endpoints require `X-Development-Requester-Id: <positive integer>`.
- This header is a Lab 2 testing context, not authentication. A missing/malformed header returns `400`; an inactive/nonexistent Requester returns `403` and the client clears its stored selection.
- Unknown JSON fields are ignored only where explicitly stated; Ticket-create fields are allow-listed.
- Binary upload uses `multipart/form-data` with one field named `file`.
- Unexpected errors never expose stack traces, SQL, credentials, filesystem paths, stored filenames, or another Requester's data.

### Standard error body

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Review the highlighted fields.",
    "fields": {
      "summary": "Summary must contain 5 to 120 characters."
    }
  }
}
```

`fields` is present only for field-specific validation. Stable `code` values are intended for UI decisions; `message` remains safe for display.

## 2. Status-Code Policy

| Status | Use |
|---|---|
| `200 OK` | Successful retrieval, soft removal, or binary content. |
| `201 Created` | Ticket or Attachment created. |
| `400 Bad Request` | Invalid JSON, header, field, query parameter, or removal reason. |
| `403 Forbidden` | Development Requester is inactive or unavailable as a selectable context. |
| `404 Not Found` | Missing or non-owned Ticket/Attachment; the same response prevents ownership disclosure. |
| `409 Conflict` | Active Attachment limit reached or Attachment already removed. |
| `413 Content Too Large` | File exceeds 5 MiB. |
| `415 Unsupported Media Type` | File type/signature is not permitted. |
| `500 Internal Server Error` | Safe unexpected failure. |

## 3. Shared Resource Shapes

### Reference item

```json
{ "id": 1, "name": "Hardware" }
```

Only active reference items are returned by selection endpoints.

### Development Requester

```json
{
  "id": 1,
  "displayName": "Anan Chaiyasit",
  "email": "anan.chaiyasit@example.test"
}
```

`isActive` is intentionally omitted because this endpoint returns only active Requesters.

### Attachment metadata

```json
{
  "id": 21,
  "ticketId": 8,
  "originalName": "battery-report.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 245760,
  "createdAt": "2026-08-30T10:15:00.000Z",
  "removed": false,
  "removedAt": null,
  "removalReason": null
}
```

The API never returns `storedName` or a filesystem path.

### Ticket summary

```json
{
  "id": 8,
  "ticketNumber": "TKT-20260830-A7K2Q9",
  "summary": "Laptop battery drains quickly",
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
  "requestedPriority": "MEDIUM",
  "itPriority": null,
  "status": "NEW",
  "createdAt": "2026-08-30T10:00:00.000Z",
  "updatedAt": "2026-08-30T10:00:00.000Z"
}
```

### Ticket detail

Ticket detail adds `description`, `requester`, and `attachments` to the summary shape:

```json
{
  "id": 8,
  "ticketNumber": "TKT-20260830-A7K2Q9",
  "requester": {
    "id": 1,
    "displayName": "Anan Chaiyasit",
    "email": "anan.chaiyasit@example.test"
  },
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
  "summary": "Laptop battery drains quickly",
  "description": "The battery falls from full to 20 percent within one hour.",
  "requestedPriority": "MEDIUM",
  "itPriority": null,
  "status": "NEW",
  "createdAt": "2026-08-30T10:00:00.000Z",
  "updatedAt": "2026-08-30T10:15:00.000Z",
  "attachments": []
}
```

## 4. Reference and Requester Endpoints

### `GET /api/categories`

Returns active Categories ordered by `name ASC`, then `id ASC`.

- Success: `200` with `Reference item[]`.
- Failure: safe `500`.

### `GET /api/related-systems`

Returns active Related Systems ordered by `name ASC`, then `id ASC`.

- Success: `200` with `Reference item[]`.
- Failure: safe `500`.

### `GET /api/development-requesters`

Returns active Development Requesters ordered by `displayName ASC`, then `id ASC`.

- Success: `200` with `Development Requester[]`; an empty array drives the selector empty state.
- Failure: safe `500`.

## 5. Ticket Creation

### `POST /api/tickets`

Requires `X-Development-Requester-Id` and `Content-Type: application/json`.

Request:

```json
{
  "categoryId": 2,
  "relatedSystemId": 7,
  "summary": "Laptop battery drains quickly",
  "requestedPriority": "MEDIUM",
  "description": "The battery falls from full to 20 percent within one hour."
}
```

The backend trims strings, validates the current active Requester and active reference IDs, generates the Ticket Number, and ignores no ownership field because none is accepted.

Success: `201`.

```json
{
  "data": {
    "id": 8,
    "ticketNumber": "TKT-20260830-A7K2Q9",
    "requesterId": 1,
    "status": "NEW",
    "createdAt": "2026-08-30T10:00:00.000Z"
  }
}
```

Errors:

- `400 INVALID_REQUESTER_CONTEXT` for a missing/malformed header.
- `403 REQUESTER_UNAVAILABLE` for an inactive/nonexistent Requester context.
- `400 VALIDATION_ERROR` for Summary, Description, Priority, Category, or Related System failures; no Ticket is saved.
- `500 TICKET_CREATE_FAILED` after safe handling of an unexpected database failure.

Optional files are not sent to this endpoint. After `201`, the client uploads each accepted file through the Attachment endpoint. It must retain the returned Ticket identity and never recreate the Ticket merely because a file fails.

## 6. My Tickets

### `GET /api/tickets`

Requires `X-Development-Requester-Id`.

Query parameters:

| Name | Default | Contract |
|---|---|---|
| `search` | empty | Trimmed, at most 100 characters; case-insensitive Ticket Number or Summary match. |
| `categoryId` | absent | Positive integer. |
| `relatedSystemId` | absent | Positive integer. |
| `requestedPriority` | absent | `LOW`, `MEDIUM`, or `HIGH`. |
| `status` | absent | `NEW` in Lab 2. |
| `sort` | `updatedAt` | `updatedAt`, `createdAt`, or `ticketNumber`. |
| `direction` | `desc` | `asc` or `desc`. |
| `page` | `1` | Positive integer. |
| `pageSize` | `10` | `10`, `20`, or `50`. |

All active filters are combined with logical AND. Ownership is always applied independently of client parameters. The selected primary sort is followed by `id` in the same direction as a deterministic tiebreaker, except the default explicitly remains `updatedAt DESC, id DESC`.

Success: `200`.

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 0,
    "totalPages": 0,
    "search": "",
    "filters": {
      "categoryId": null,
      "relatedSystemId": null,
      "requestedPriority": null,
      "status": null
    },
    "sort": "updatedAt",
    "direction": "desc"
  }
}
```

An out-of-range but positive page returns `200` with empty `data` and accurate totals. Invalid names/values return `400 INVALID_QUERY`. Unknown query parameters return `400` rather than being silently ignored.

The UI determines:

- empty account: unfiltered request has `totalItems = 0`;
- no results: the current filtered/searched response has zero items while the Requester is known to have Tickets, or the active query is non-default.

## 7. Requester Ticket Detail

### `GET /api/tickets/:ticketId`

Requires `X-Development-Requester-Id`.

- Success: `200` with the Ticket detail shape and Attachment metadata ordered by `createdAt ASC, id ASC`.
- Invalid ID: `400 VALIDATION_ERROR`.
- Missing or non-owned Ticket: identical `404 TICKET_NOT_FOUND`.
- Unexpected failure: safe `500 TICKET_RETRIEVAL_FAILED`.

### `GET /api/tickets/:ticketId/attachments`

Returns metadata for both active and removed Attachments on an owned Ticket, ordered by `createdAt ASC, id ASC`.

- Success: `200` with `{ "data": AttachmentMetadata[] }`.
- Missing/non-owned Ticket: `404 TICKET_NOT_FOUND`.

This endpoint may be used independently, although Ticket Detail embeds the same metadata to avoid a mandatory second request on initial render.

## 8. Attachment Upload

### `POST /api/tickets/:ticketId/attachments`

Requires `X-Development-Requester-Id` and multipart field `file`. Exactly one file is accepted per request so the UI can report and retry per-file outcomes.

Validation order:

1. validate Requester context and owned Ticket;
2. require one file;
3. enforce size at or below 5,242,880 bytes;
4. validate extension, declared MIME, and recognizable signature;
5. confirm active Attachment count is below five;
6. create a random stored name, persist file safely, and create metadata;
7. compensate partial filesystem/database failure so no successful response points to missing content and no invalid active row remains.

Success: `201` with `{ "data": AttachmentMetadata }`.

Errors:

- `400 FILE_REQUIRED` when absent.
- `404 TICKET_NOT_FOUND` for missing/non-owned Ticket.
- `409 ATTACHMENT_LIMIT_REACHED` at five active Attachments.
- `413 FILE_TOO_LARGE` above 5 MiB.
- `415 FILE_TYPE_NOT_ALLOWED` for extension/MIME/signature mismatch.
- safe `500 ATTACHMENT_UPLOAD_FAILED`; the Ticket remains.

## 9. Attachment Content

### `GET /api/tickets/:ticketId/attachments/:attachmentId/download`

Requires `X-Development-Requester-Id`.

Optional query: `disposition=attachment|inline`, default `attachment`. `inline` supports permitted image/PDF preview; the browser may still download according to its capabilities.

Success: `200` binary content with the stored MIME type, safe `Content-Length`, and sanitized original filename in `Content-Disposition`.

Missing, non-owned, removed, or unavailable content returns the same `404 ATTACHMENT_NOT_FOUND`. Filesystem paths and stored names are never returned.

## 10. Attachment Soft Removal

### `DELETE /api/tickets/:ticketId/attachments/:attachmentId`

Requires `X-Development-Requester-Id` and JSON:

```json
{ "reason": "The uploaded document contains outdated information." }
```

The reason is trimmed and must contain 5–250 characters. The backend records `removedAt`, `removalReason`, and `removedByRequesterId` atomically. The database row remains.

- Success: `200` with updated `{ "data": AttachmentMetadata }`.
- Invalid reason: `400 VALIDATION_ERROR`.
- Missing/non-owned Ticket or Attachment: safe `404`.
- Already removed: `409 ATTACHMENT_ALREADY_REMOVED`; original removal metadata remains unchanged.
- Unexpected failure: safe `500 ATTACHMENT_REMOVE_FAILED`.

## 11. Failure and Recovery Contract

- Reference/Requester load failures offer Retry and do not show fabricated data.
- Create Ticket validation never clears fields.
- Create Ticket server failure retains editable values and accepted selections where the browser still owns the `File` objects.
- After Ticket `201`, the Ticket identity and number remain fixed while initial files upload. Individual file failures do not trigger Ticket recreation.
- List/detail failures retain navigation and Retry/Back actions but never display stale data for a newly selected Requester.
- When an API returns `REQUESTER_UNAVAILABLE`, the client clears `sessionStorage` and returns to Requester selection with a safe explanation.
