# TokTickIT

## Lab 4 Actions Taken and Ticket workflow

The next increment adds Actions Taken, the final Ticket workflow and Requester/
Staff dashboards while preserving Labs 1-3. Phanuwit approved the corrected
[contract PR #45](https://github.com/Datakung/toktickit/pull/45#pullrequestreview-5416186064)
at `ff97405` and merged it into `lab4-staging` (`d32c8cf`) on 2026-10-05.
[Issue #40](https://github.com/Datakung/toktickit/issues/40) was approved and merged
by Phanuwit in [PR #46](https://github.com/Datakung/toktickit/pull/46), staging `a915812`.
[Issue #41](https://github.com/Datakung/toktickit/issues/41) adds the action screens
on `feature/41-actions-ui`, implementation `cd5aa76` and documentation `3addd43`,
published in [PR #47](https://github.com/Datakung/toktickit/pull/47).
The legacy fixture correction `0cf9e58` was [approved by Phanuwit](https://github.com/Datakung/toktickit/pull/47#pullrequestreview-5439057032)
on 2026-10-07 and merged into staging as `f4da089`. Issue #41 is closed.
Phanuwit [approved PR #48](https://github.com/Datakung/toktickit/pull/48#pullrequestreview-5472167227)
at `b7f6bb9` and merged Issue #42 into `lab4-staging` as `00fddc1` on 2026-10-09.
Phanuwit [approved PR #49](https://github.com/Datakung/toktickit/pull/49#pullrequestreview-5479533211)
at `6dce864` and merged Issue #43 into `lab4-staging` as `4660ac6` on 2026-10-10.
Issue #44 starts from that accepted integration point on `feature/44-quality-release`.
Its quality/release review and final-main acceptance remain pending.
Feature PRs target `lab4-staging`, followed by a reviewed release to `main`.

Action labels count separately within each Ticket: Action 1, Action 2, and so on.
They continue across pages and resolution cycles. Internal record IDs in links
and audit history remain unchanged; this refinement needs no migration or reset.

Issue #42 adds whole-current-cycle resolution/cancellation checks, atomic formal
transition history and fresh cycles on reopen. Staff see an authoritative
checklist; Requesters see only their own read-only workflow history. Loading,
stale summaries and uncertain saves never enable resolution. Feature captures
are in [workflow evidence](artifacts/lab-04/screenshots/workflow/README.md).
The checklist uses prominent headings and labelled green checks/red crosses.
Actions open in view mode; eligible Staff click Edit action to reveal mutation
controls. Saved details and audit history remain visible without opening the editor.
Eligible actions also show a separate Action progress section with Start, Complete
and Cancel; these do not require Edit action or save unsaved fields.
Audit revisions show readable What changed values (or initial creation details).
Original Before/After snapshots remain unchanged under collapsed Technical details.
Close detail returns to the list; while editing, its label explicitly warns that
unsaved changes will be discarded. Saved actions and history are never deleted.
Regenerate deliberately with `npm --prefix client run test:e2e:lab4-workflow-evidence`;
ordinary E2E writes only ignored outputs. No new migration is needed beyond #40.
See [tests.md](docs/lab-04/tests.md) for the actual branch results and limitations.

The 2026-10-09 author-requested creation refinement opens the saved Ticket Detail
after creation and all initial uploads succeed. An upload failure instead keeps
the form open with failure feedback and a link to retry files on the saved Ticket;
it does not display creation success or create another Ticket.

Staff Operations also separates the saved `Current status` from `Change status
to`. Saving Open keeps Open visible, resets the proposed target and retains all
four legal next statuses without automatically choosing one.

The subsequent author-requested two-stage layout puts an `Open ticket` panel
above Operations only while the Ticket is New (Open/Cancel remain available).
After opening, a separate `Update ticket status` panel appears below Operations
with every valid progress transition. A permanently Cancelled Ticket instead
shows read-only status with no further transitions.

- [Specification](docs/lab-04/specification.md): requirements, business rules,
  role permissions, action lifecycle, resolution gate, data and dashboard calculations.
- [API contract](docs/lab-04/api-spec.md) and [UI contract](docs/lab-04/ui-spec.md).
- [Tests and results](docs/lab-04/tests.md): 16 acceptance criteria, 27 explicit cases
  and clearly separated passed foundation/UI tests versus remaining planned work.
- [Review record](docs/lab-04/reviewer.md) and [AI-use record](docs/lab-04/ai-use.md).

Implementation Issues: [#40](https://github.com/Datakung/toktickit/issues/40) action
foundation, [#41](https://github.com/Datakung/toktickit/issues/41) action UI,
[#42](https://github.com/Datakung/toktickit/issues/42) Ticket workflow,
[#43](https://github.com/Datakung/toktickit/issues/43) dashboards and
[#44](https://github.com/Datakung/toktickit/issues/44) quality/release.

Issue #40 adds paged owned action/history reads, Staff/Admin create/edit/assign/
start/complete/cancel APIs, current-user work filters, whole-cycle checklist counts,
immutable revisions and durable retry receipts. Creator and completing performer
come from the session; assignment does not change the Ticket Owner. Separate
field and assignment writes enforce parent/child versions and preserve earlier
success. Account deactivation or a Requester role change safely unassigns active
work while retaining completed performer history.

The additive migration preserves existing records and supplies cycle fields;
it does not invent historical work. The intentional demo seed creates eight
status fixtures (`TKT-LAB4-SEED-01` through `08`), all three priorities, zero/one/
multiple actions and a zero-Ticket Requester. Repeated seeds preserve edited
records, credentials and events; initial credentials still need secure provisioning.
Tests use guarded test targets, never development migrations or seeds.

Verified 2026-10-05: 182 server tests (36 new foundation tests), 97 existing client
tests, 31 existing browser scenarios, both builds and unchanged development
database/uploads during E2E. Client production audit reports zero vulnerabilities;
server audit reports one moderate Multer advisory, recorded for the release gate.
These are the historical Issue #40 checks, not final-main release results.
Issue #41 now supplies Staff create/edit/separate assignment/start/complete/cancel,
actual-performer display, completed corrections, shared Requester read-only records,
paged audit history and action deep links. Failed/unknown saves preserve input;
only the original payload/key is retried after an unknown response. A confirmed
save is never repeated just because its subsequent refresh failed.
Verified locally 2026-10-06: 182 server tests, 130 client tests, 36 browser
scenarios (including 5 new Action journeys), both builds and unchanged development
database/uploads. Thirteen screenshots are feature evidence, not final release.
Three-width feature captures live in [Actions evidence](artifacts/lab-04/screenshots/actions-taken/README.md).
Current branch results and limitations are in [Lab 4 tests](docs/lab-04/tests.md).
Those published Issue #41 checks did not include final Ticket gate enforcement.
Issue #42's gate is peer-accepted. Issue #43 adds read-only Requester and Staff/Admin
dashboards, genuine zero/loading/error states, captured seven-day ranges and matching
URL-based Ticket/work-list links. Role home pages are `/dashboard` and
`/staff/dashboard`; My Tickets, Create Ticket, Ticket Queue and Users remain available.
Metrics come from one backend snapshot, never from a downloaded page of records.
See [dashboard screenshots](artifacts/lab-04/screenshots/dashboards/README.md) and
[current test evidence](docs/lab-04/tests.md). No new migration, dependency or
development seed/reset is required. Issue #43 is peer-accepted; final-main
evidence/submission (#44) remain pending.

### Lab 4 release-candidate quality gate

Issue #44 patches Multer to 2.4.0 and Express's resolved proxy-addr to 2.0.8,
and updates the test tools to Vitest 4.1.11 / Vite 6.4.4. Install the checked-in
locks with `npm --prefix server ci` and `npm --prefix client ci` when reviewing
this branch. Node 22 LTS or 24 LTS is supported; this gate used Node 24.14.0.
No schema migration or development reseed is part of this hardening.

With the existing PostgreSQL container available and the guarded test/E2E
targets configured, run from the repository root:

```powershell
./scripts/lab4-quality-gate.ps1
```

This retains per-case reports, logs, builds, schema validation and production/full
audits under `artifacts/lab-04/quality-gate/`. The expanded read-only development
fingerprint includes sessions, Comments, Internal Notes and migration history as
well as Tickets/actions/accounts/files. The gate fails on changed development
state, failed/skipped/todo tests or flaky browser coverage. Browser retries are
explicitly zero; review ports 5183/3100 do not reuse the development services.

After the peer-approved release is merged into a clean `main` checkout, rerun
`./scripts/lab4-quality-gate.ps1 -FinalMain`. That mode refuses feature branches,
dirty starting checkouts and main without the accepted dashboard increment.
A release-candidate pass does not close #44 or substitute for that final-main run.
See [the quality-gate record](artifacts/lab-04/quality-gate/README.md) and
[submission plan](docs/lab-04/submission-plan.md) for remaining evidence gates.

Before running this branch against development, stop the API and take a verified
database backup (and retain uploads). Then, from `server`, explicitly run:

```powershell
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

Do not use `migrate reset`, `db push` or test URLs for your development setup.
The migration/restore regression tests rehearse recovery in separate disposable
databases, not against your development database. Sign in as Staff/Admin and open
a Ticket from the Queue to use Actions Taken; its Requester sees read-only work.
Run foundation API tests with `npm --prefix server test -- tests/lab-04` and UI
tests with `npm --prefix client test -- tests/lab-04`. Deliberately refresh feature
captures with `npm --prefix client run test:e2e:lab4-actions-evidence`; normal
`test:e2e` writes only ignored output. Do not treat these as final-main captures.

## Lab 3 reviewed release

Issues #25–#30 are closed and Done. Phanuwit approved and merged the quality
PR [#36](https://github.com/Datakung/toktickit/pull/36) into `lab3-staging` and
the release PR [#37](https://github.com/Datakung/toktickit/pull/37) into `main`
(`9fcae33`). The complete final-main gate passed on 2026-09-28: 146 server
tests, 97 client tests, 31 browser scenarios, one evidence journey, both builds,
and production dependency audits with zero reported vulnerabilities. Details are in
[Lab 3 tests](docs/lab-03/tests.md), with the [peer review record](docs/lab-03/reviewer.md)
and [visual checklist](docs/lab-03/ui-spec.md).

After starting the existing PostgreSQL container, run the isolated gate:

```powershell
npm --prefix server test
npm --prefix client test
npm --prefix client run test:e2e
npm --prefix server run build
npm --prefix client run build
```

Routine E2E keeps screenshots in ignored test output. To deliberately refresh
the Lab 3 submission images, run `npm --prefix client run test:e2e:lab3-evidence`.
It writes `artifacts/lab-03/screenshots/` from the isolated E2E database, checks
desktop/tablet/mobile overflow and verifies that development database/uploads
remain unchanged. Re-run and inspect this evidence on reviewed final `main`
before assembling the nine-part PDF. The submission images were regenerated
from reviewed `main` at `9fcae33`; never use real passwords in screenshots.

## Lab 3 Ticket operations and communication increment

Issue #29 completes `/staff/tickets/:id` for IT Staff and Administrators with
atomic claim/reassignment, IT Priority, approved status transitions, active
Attachment download, Public Comments and private Internal Notes. Requesters can
read/post Public Comments on their own Tickets and indicate that a problem appears
resolved without changing the formal status. Optimistic versions prevent stale
updates, terminal Ticket guards remain explicit, and note access is enforced by
the API rather than UI visibility alone.

Before running this branch locally, apply the additive Ticket-status migration:

```powershell
cd server
npx prisma migrate deploy
npx prisma generate
cd ..
```

The new additive migration records Requester resolution indications and creates
separate append-only Public Comment and Internal Note tables. It preserves Ticket,
User and Attachment history. Automated tests use only isolated test/E2E databases;
they do not migrate or seed the development database.

## Lab 3 authentication and user-management foundation

Issue #27 adds the Administrator Users screen at `/admin/users`: literal name/email
search, combined role and Active/Inactive filtering, create/edit, activation and separate initial-password reset.
Only Administrators with completed password change can use its UI and APIs.
Passwords are write-only; resets require a new password change at next login.
Role changes, deactivation and resets revoke sessions. Stale edits return a conflict;
reload and review the account before explicitly submitting again.

Before running this branch locally, apply the additive owner/version migration:

```powershell
cd server
npx prisma migrate deploy
npx prisma generate
cd ..
```

Use your provisioned `admin@example.test` credentials, complete the initial password
change if required, and open Users. No new provisioning or database reset is needed.
Deactivation preserves accounts and Ticket history. It unassigns owned Tickets;
the backend prevents self-deactivation and removing the final active Administrator.
Staff Ticket operations and communication are implemented by Issue #29.

Issue #26 replaces the Lab 2 Development Requester selector and trusted header
with database-backed authentication. Active users sign in with email/password,
receive a revocable HttpOnly cookie session, and must change provisioned initial
passwords before entering their role workspace. Requester Ticket and Attachment
authorization now derives only from the authenticated session.

The data-preserving migration renames `RequesterUser` to `User` without changing
existing IDs, ownership, timestamps, removal history, or stored files. It adds
roles, password state, versioning, and database session records. The repeatable
seed preserves edited accounts and existing credentials; it never supplies real
passwords.

### Lab 3 local account provisioning

Add distinct 32-character-or-longer `SESSION_SECRET` and `CSRF_SECRET` values to
the ignored `server/.env`. Copy the structure below into an ignored file such as
`server/lab3.credentials.local.json`, include every account whose password hash
is still null, and choose private initial passwords of 12–128 characters:

```json
[
  {
    "email": "anan.chaiyasit@example.test",
    "initialPassword": "replace-with-a-private-initial-password"
  }
]
```

After applying migrations and running the repeatable seed, provision once:

```powershell
cd server
npx prisma migrate deploy
npm run prisma:seed
npm run prisma:provision -- lab3.credentials.local.json
```

Provisioning validates the entire file before writing, hashes passwords with the
documented scrypt policy, requires complete coverage, and skips accounts that
already have hashes. It does not print or overwrite credentials. The local
credential file matches `*.credentials.local.json` and must never be committed.

TokTickIT is an IT service desk application developed for CPE334. Lab 2 extends
the verified Lab 1 vertical slice with the data foundation, temporary
Development Requester context, Ticket creation and discovery, owned Ticket
Detail, and Attachment lifecycle needed by the Requester Ticketing MVP.

## Completed Lab 2 increment (historical baseline)

Through the verified Issue #16 quality gate and final release to `main`, the
current increment provides:

1. a PostgreSQL/Prisma foundation for Requesters, Categories, Related Systems,
   Tickets, and Attachments;
2. repeatable seed data for active and inactive reference records;
3. active reference-data and Development Requester APIs;
4. reusable validation for the temporary `X-Development-Requester-Id` context;
5. requester selection stored in `sessionStorage`, an application shell, and a
   **Change Requester** action; and
6. a responsive, validated Create Ticket form backed by `POST /api/tickets`;
7. backend-generated official Ticket Numbers, `NEW` status, and Requester
   ownership derived only from the validated development header;
8. optional initial JPEG, PNG, WEBP, and PDF uploads with content validation,
   safe filenames, a 5 MiB/file limit, and an atomic five-file limit; and
9. a requester-owned My Tickets API and responsive page with validated search,
   filters, sorting, pagination, distinct list states, desktop tables, and mobile
   cards;
10. a read-only owned Ticket Detail API and responsive page with safe unavailable
    behavior;
11. existing-Ticket Attachment upload, ordered active/removed metadata,
    authenticated image/PDF preview and download, and confirmed soft removal; and
12. Vitest/Supertest component and API tests plus Chromium Playwright flows;
13. release-wide safe-error and exact Zen Green style audits; and
14. inspected desktop, tablet, and mobile evidence for Create Ticket, My Tickets,
    and Ticket Detail under `artifacts/lab-02/screenshots/`.

Phanuwit merged corrected quality PR #22 into `lab2-staging`, then merged final
release PR #23 from `lab2-staging` into `main` as `996c9bf`. The complete final
`main` rerun passed 94 server tests, 65 client tests, 14 Chromium tests, both
production builds, both production-only audits, and the unchanged-development-
state check.

Comments, Internal Notes, IT Staff controls, status changes, and real
authentication remain outside the Lab 2 Requester MVP.

## Lab 1 goal

The completed Lab 1 application will provide a **Check System** button that:

1. checks the Express API health endpoint;
2. retrieves the supported request categories from PostgreSQL through Prisma;
3. displays an Online state and the four categories on success; and
4. displays an Offline state with a useful message when a dependency fails.

The four supported categories are Account and Access, Hardware, Software, and
Network.

## Technology stack

- Frontend: React, TypeScript, Vite, and Bootstrap
- Backend: Node.js, Express, and TypeScript
- Database: PostgreSQL with Prisma ORM
- Testing: Vitest, Testing Library, Supertest, and Playwright

## Repository structure

```text
toktickit/
|-- client/                 React frontend
|   |-- src/
|   |-- tests/lab-01/
|   |-- tests/lab-02/
|   `-- e2e/lab-02/
|-- server/                 Express API
|   |-- prisma/
|   |-- src/
|   |-- tests/lab-01/
|   `-- tests/lab-02/
|-- docs/lab-01/            Lab evidence and reflection
|-- docs/lab-02/            Engineering contract and evolving Lab 2 evidence
|-- .gitignore
`-- README.md
```

## Prerequisites

Install these tools before running the project:

- Git
- Node.js and npm
- PostgreSQL

## Environment setup

The committed `.env.example` files document the required local variables.
Create local `.env` files with PowerShell:

```powershell
Copy-Item client/.env.example client/.env
Copy-Item server/.env.example server/.env
```

Update `server/.env` with credentials for your local PostgreSQL database. The
default examples define separate development and test targets:

```text
Frontend: http://localhost:5173
API:      http://localhost:3000
Development database: PostgreSQL `toktickit` on localhost:5432
Test database:        PostgreSQL `toktickit_test` on localhost:5432
E2E database:         PostgreSQL `toktickit_e2e` on localhost:5432
```

Real `.env` files contain local credentials and must never be committed.

### Local PostgreSQL with Docker

The following development container matches the example database URL:

```powershell
docker run --name toktickit-postgres -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5432:5432 -d postgres:17-alpine3.22
```

For later sessions, restart the existing container instead of creating it
again:

```powershell
docker start toktickit-postgres
```

Create the isolated automated-test targets once after the container is ready:

```powershell
docker exec toktickit-postgres createdb -U toktickit toktickit_test
docker exec toktickit-postgres createdb -U toktickit toktickit_e2e
```

If either command reports that the database already exists, keep the existing
database. `TEST_DATABASE_URL` and `E2E_DATABASE_URL` are guarded: the test
commands fail before running if either target is missing, points at the
development database/schema, or lacks its required test/E2E marker.

Check that PostgreSQL is accepting connections:

```powershell
docker exec toktickit-postgres pg_isready -U toktickit -d toktickit
```

`server/.env` must keep `DATABASE_URL` pointed at `toktickit` and
`TEST_DATABASE_URL` pointed at `toktickit_test`, with `E2E_DATABASE_URL` pointed
at `toktickit_e2e`.

## Install dependencies

Install the frontend and backend packages separately:

```powershell
cd client
npm install

cd ../server
npm install
```

These commands create `node_modules` directories and package lockfiles.
`node_modules` is ignored by Git; package lockfiles should be committed.

## Run the development servers

Open two terminals from the repository root.

Terminal 1 - backend:

```powershell
cd server
npm run dev
```

Terminal 2 - frontend:

```powershell
cd client
npm run dev
```

Open `http://localhost:5173` in a browser and sign in with an active provisioned
account. The application forces an initial password change, then opens the
correct role workspace. Select **Create Ticket**
to submit a validated request and optional initial files, or open **My Tickets**
to search owned Tickets and manage permitted Attachments from read-only Ticket
Detail. This is development context for Lab 2, not authentication.

## API endpoints

| Method | Endpoint | Current behavior |
|--------|----------|------------------|
| `GET` | `/api/health` | Returns `200` with `{ "status": "ok", "service": "TokTickIT API" }` |
| `GET` | `/api/categories` | Returns active category IDs and names from PostgreSQL in ID order |
| `GET` | `/api/related-systems` | Returns active related systems in name order |
| `GET` | `/api/auth/csrf` | Bootstraps browser-bound CSRF protection for sign-in |
| `POST` | `/api/auth/login` | Authenticates an active account and creates a revocable cookie session |
| `GET` | `/api/auth/me` | Returns safe current-user data for an active session |
| `POST` | `/api/auth/change-password` | Changes an initial/current password and rotates all session state |
| `POST` | `/api/auth/logout` | Revokes the current session and expires its cookie |
| `GET` | `/api/staff/tickets` | Returns the authorized shared queue with strict search/filter/sort/pagination |
| `GET` | `/api/staff/owners` | Returns active eligible Staff/Administrator owner choices |
| `GET` | `/api/tickets` | Returns only the selected Requester's Tickets with validated search, filters, sorting, and pagination |
| `POST` | `/api/tickets` | Creates one validated Ticket for the selected Development Requester |
| `GET` | `/api/tickets/:ticketId` | Returns an owned read-only Ticket with ordered Attachment metadata |
| `GET` | `/api/tickets/:ticketId/attachments` | Returns active and removed metadata for an owned Ticket |
| `POST` | `/api/tickets/:ticketId/attachments` | Uploads one validated owned-Ticket Attachment; field name is `file` |
| `GET` | `/api/tickets/:ticketId/attachments/:attachmentId/download` | Returns protected active content as `inline` or `attachment` |
| `DELETE` | `/api/tickets/:ticketId/attachments/:attachmentId` | Soft-removes an owned Attachment with a validated reason |

## Database commands

Run Prisma commands from `server/`. Validate the schema, generate the typed
client, apply the committed migrations, and seed the Lab 2 reference data:

```powershell
cd server
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

The seed uses unique-key upserts, so it is safe to run more than once. It creates
the four Lab 1 Categories, six Related Systems, five Requester fixtures, four IT
Staff fixtures, and one Administrator without duplicates or credential resets.

## Test and build

Run checks independently for each application:

```powershell
cd server
npm test
npm run build

cd ../client
npm test
npm run build
npm run test:e2e
```

`npm test` validates `TEST_DATABASE_URL`, injects it as Prisma's
`DATABASE_URL`, applies committed migrations, and seeds only the isolated test
target before the suites begin. Database-backed server test files execute
serially against that shared isolated target to prevent cross-file fixture
timing from affecting results. To apply the same guarded migration step
explicitly, run `npm --prefix server run test:db:migrate` from the repository
root.

Playwright always starts a fresh API on port 3100 against the guarded E2E
target, applies migrations, resets and seeds deterministic E2E data, isolates
uploaded files under `server/uploads/e2e`, and cleans that target afterward.
Its global check hashes the development database and development uploads before
and after the run and fails if they change. An ordinary `npm run test:e2e`
writes screenshots only to ignored Playwright output. Refresh the nine committed
responsive evidence files deliberately with `npm run test:e2e:evidence`; this
explicit command uses fixed seeded Ticket data so the reviewed evidence is
repeatable.

Install the Playwright Chromium binary once on a new machine with
`npx playwright install chromium`. Lab 2 results and planned-test traceability
are recorded in `docs/lab-02/tests.md`. The final `main` quality gate passes 14
server files/94 tests, 9 client files/65 tests, all 14 Chromium tests, both
production builds, and both production-only dependency audits.

## Git workflow

`main` is stable and `lab2-staging` is the Lab 2 integration branch. Each Lab 2
Issue is implemented on its own feature branch. Every Pull Request is explicitly
linked to its Issue; the author responds to review comments, and the peer
reviewer approves and performs the merge.

The Lab 1 feature history remains available on these branches:

- `feature/1-project-foundation`
- `feature/2-health-check`
- `feature/3-category-seed`
- `feature/4-category-list`

Lab 2 uses Issues #11–#16. After all six Issues are approved, reviewer-merged,
and verified in `lab2-staging`, a final reviewed release Pull Request targets
`main`.

## Lab documentation

- `docs/lab-01/tests.md` - test plan and passing evidence
- `docs/lab-01/reviewer.md` - peer-review record
- `docs/lab-01/ai_use.md` - selected AI prompts and reflection
- `docs/lab-02/specification.md` - peer-approved Lab 2 engineering contract
- `docs/lab-02/api-spec.md` and `ui-spec.md` - API and Zen Green UI contracts
- `docs/lab-02/tests.md` - planned-test traceability and verified results
- `docs/lab-02/reviewer.md` - PR discussion, approval, merge, and Kanban record
- `docs/lab-02/ai-use.md` - selected prompts and critical reflection
- `docs/lab-03/specification.md` - approved Lab 3 requirements, rules, migration and Definition of Done
- `docs/lab-03/api-spec.md` and `ui-spec.md` - authenticated API and Zen Green UI contracts
- `docs/lab-03/tests.md` - executable traceability and branch/final-main evidence
- `docs/lab-03/reviewer.md` - received and reciprocal Lab 3 peer-review record
- `docs/lab-03/ai-use.md` - selected prompts and author-approved reflection
