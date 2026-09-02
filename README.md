# TokTickIT

TokTickIT is an IT service desk application developed for CPE334. Lab 2 extends
the verified Lab 1 vertical slice with the data foundation, temporary
Development Requester context, Ticket creation and discovery, owned Ticket
Detail, and Attachment lifecycle needed by the Requester Ticketing MVP.

## Current Lab 2 increment

Through the verified Issue #16 quality gate on `lab2-staging`, the current increment provides:

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

Issue #16 is not released yet. Phanuwit approved and merged its corrected quality
PR into `lab2-staging`; the reviewed `lab2-staging` to `main` release PR and a
complete final `main` rerun remain pending.

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

Open `http://localhost:5173` in a browser. Choose an active Development
Requester and select **Continue**. The application stores only that temporary
development selection in the current browser tab, opens the requester shell,
and allows it to be cleared with **Change Requester**. Select **Create Ticket**
to submit a validated request and optional initial files, or open **My Tickets**
to search owned Tickets and manage permitted Attachments from read-only Ticket
Detail. This is development context for Lab 2, not authentication.

## API endpoints

| Method | Endpoint | Current behavior |
|--------|----------|------------------|
| `GET` | `/api/health` | Returns `200` with `{ "status": "ok", "service": "TokTickIT API" }` |
| `GET` | `/api/categories` | Returns active category IDs and names from PostgreSQL in ID order |
| `GET` | `/api/related-systems` | Returns active related systems in name order |
| `GET` | `/api/development-requesters` | Returns active Development Requesters in display-name order |
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
the four Lab 1 Categories, six Related Systems, four active Development
Requesters, and one inactive Requester without duplicates.

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
are recorded in `docs/lab-02/tests.md`. The latest feature-branch quality gate
passes 14 server files/94 tests, 9 client files/65 tests, all 14 Chromium tests,
both production builds, and both production-only dependency audits. These
counts must be rerun and recorded again after the reviewer merges final `main`.

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
