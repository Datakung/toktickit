# TokTickIT

TokTickIT is an IT service desk application developed for CPE334. Lab 1 builds
a small full-stack vertical slice that proves the frontend, API, ORM, and
database can work together.

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
- Testing: Vitest, Testing Library, and Supertest

## Repository structure

```text
toktickit/
|-- client/                 React frontend
|   |-- src/
|   `-- tests/lab-01/
|-- server/                 Express API
|   |-- prisma/
|   |-- src/
|   `-- tests/lab-01/
|-- docs/lab-01/            Lab evidence and reflection
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
default examples expect:

```text
Frontend: http://localhost:5173
API:      http://localhost:3000
Database: PostgreSQL on localhost:5432
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

Check that PostgreSQL is accepting connections:

```powershell
docker exec toktickit-postgres pg_isready -U toktickit -d toktickit
```

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

Open `http://localhost:5173` in a browser. The **Check System** button calls
`GET /api/health` and displays an Online or Offline state. The category list
remains intentionally empty until Issues 3 and 4 add the database model, seed,
API route, and UI rendering.

## API endpoints

| Method | Endpoint | Current behavior |
|--------|----------|------------------|
| `GET` | `/api/health` | Returns `200` with `{ "status": "ok", "service": "TokTickIT API" }` |
| `GET` | `/api/categories` | Returns category IDs and names from PostgreSQL in ID order |

## Database commands

Run Prisma commands from `server/`. Validate the schema, generate the typed
client, apply the committed migrations, and seed the categories:

```powershell
cd server
npx prisma validate
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
```

The seed uses an upsert keyed by the unique category name, so it is safe to run
more than once. It creates Account and Access, Hardware, Software, and Network
without duplicates. The category API remains deferred to Issue 4.

## Test and build

Run checks independently for each application:

```powershell
cd server
npm test
npm run build

cd ../client
npm test
npm run build
```

Lab 1 test evidence is recorded in `docs/lab-01/tests.md`.

## Git workflow

`main` is the stable branch and `lab1-staging` is the Lab 1 integration branch.
All implementation happens on the required feature branches:

- `feature/1-project-foundation`
- `feature/2-health-check`
- `feature/3-category-seed`
- `feature/4-category-list`

Each feature enters `lab1-staging` through a peer-reviewed Pull Request. After
all four Issues are approved, merged, and tested, one release Pull Request
merges `lab1-staging` into `main`.

## Lab documentation

- `docs/lab-01/tests.md` - test plan and passing evidence
- `docs/lab-01/reviewer.md` - peer-review record
- `docs/lab-01/ai_use.md` - selected AI prompts and reflection
