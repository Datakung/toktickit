# Lab 3 final-main screenshot evidence

These 56 PNGs were regenerated on 2026-09-28 from reviewed `main` release commit `9fcae33` (PR #37) on a documentation branch based on that exact commit, with no application-code changes. They use synthetic accounts and an isolated E2E database. Nineteen image files changed bytes because of generated timestamps; the other captures matched the already-reviewed set.

Regenerate deliberately with `npm --prefix client run test:e2e:lab3-evidence`; routine `npm --prefix client run test:e2e` writes only temporary Playwright output. The dedicated run checks 1440px, 768px and 390px layouts for page-level horizontal overflow and compares development database/upload hashes before and after. Its final-main run passed 1/1 and reported `eb767d391ae418079490e5a9ea4bfb7f5d1b0ab9d2f964faea19e24fd18885e9` at both points. The separate full browser run passed 31/31 with the same unchanged development-state hash.

- `authentication/`: login, invalid credential feedback and mandatory first-password change.
- `user-management/`: Administrator list, create form, duplicate-email validation and readable row close-ups.
- `staff-queue/`: queue, filters, assigned/unassigned cards and no-results state.
- `staff-ticket-detail/`: claim/priority/status result, separate Public Comments and Internal Notes, with focused panel captures.
- `requester/`: owned Ticket/Create Ticket continuation, public-only communication, resolution indication and forbidden Staff route.

The evidence journey also asserted a Requester `GET /api/staff/tickets/1/notes` response of 403 with the private note text absent. Screenshot close-ups are intended for readable PDF placement; full-page images preserve the surrounding page context. Representative images were visually inspected after the final-main run; earlier author manual review covered the development screens.

After PR #36 review, queue capture waits for populated ticket rows. The regenerated desktop queue image was visually inspected with its rows and pagination present, not the transient loading message.
