# Lab 3 branch screenshot evidence

These 56 PNGs were captured on 2026-09-26 from the integrated Issue #30 branch based on reviewer-merged `lab3-staging` commit `23ab582`. They use synthetic accounts and an isolated E2E database. This is branch evidence, not yet the final-main submission set.

Regenerate deliberately with `npm --prefix client run test:e2e:lab3-evidence`; routine `npm --prefix client run test:e2e` writes only temporary Playwright output. The dedicated run checks 1440px, 768px and 390px layouts for page-level horizontal overflow and compares development database/upload hashes before and after. Its successful run reported `eb767d391ae418079490e5a9ea4bfb7f5d1b0ab9d2f964faea19e24fd18885e9` at both points.

- `authentication/`: login, invalid credential feedback and mandatory first-password change.
- `user-management/`: Administrator list, create form, duplicate-email validation and readable row close-ups.
- `staff-queue/`: queue, filters, assigned/unassigned cards and no-results state.
- `staff-ticket-detail/`: claim/priority/status result, separate Public Comments and Internal Notes, with focused panel captures.
- `requester/`: owned Ticket/Create Ticket continuation, public-only communication, resolution indication and forbidden Staff route.

The evidence journey also asserted a Requester `GET /api/staff/tickets/1/notes` response of 403 with the private note text absent. Screenshot close-ups are intended for readable PDF placement; full-page images preserve the surrounding page context. Re-run and visually inspect on reviewed final `main` before submitting the PDF.
