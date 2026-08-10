# Lab 1 - Test Plan and Evidence

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| ID | Test file | Tool | Test | Result |
|----|-----------|------|------|--------|
| API-01 | `server/tests/lab-01/health.test.ts` | Supertest | `GET /api/health` returns 200 and the expected JSON | Passed on `feature/2-health-check` |
| API-02 | `server/tests/lab-01/categories.test.ts` | Supertest | `GET /api/categories` returns four seeded categories in ID order | Not implemented yet |
| UI-01 | `client/tests/lab-01/App.test.tsx` | Vitest | TokTickIT heading renders | Passed on `feature/1-project-foundation` |
| UI-02 | `client/tests/lab-01/App.test.tsx` | Vitest | Successful requests show Online and the category list | Not implemented yet |
| UI-03 | `client/tests/lab-01/App.test.tsx` | Vitest | API failure shows Offline and a useful message | Not implemented yet |

## Issue 1 foundation checks

Verified on `feature/1-project-foundation` on 2026-08-09.

| Check | Result |
|-------|--------|
| Client dependencies install | Passed; lockfile generated and `node_modules` ignored |
| Server dependencies install | Passed; lockfile generated and `node_modules` ignored |
| Client production build | Passed |
| Server TypeScript build | Passed |
| Client startup probe | Passed; Vite returned HTTP 200 and served the React root |
| Bootstrap visual check | Passed; author confirmed the heading and green Bootstrap button rendered correctly |
| Server startup probe | Passed; compiled Express accepted a request on port 3000 |
| PostgreSQL readiness | Passed; the Docker database accepted connections on port 5432 |
| Prisma schema validation | Passed; datasource and generator configuration are valid |
| Prisma client generation | Deferred to Issue 3 because the starter schema intentionally has no models |
| Client baseline tests | 1 passed, 2 TODO |
| Server baseline tests | Health test ran red against the intentional 501 stub; category test TODO |

## Issue 2 health-check evidence

Verified on `feature/2-health-check` on 2026-08-10.

| Check | Result |
|-------|--------|
| Health test before implementation | Expected failure: received HTTP 501 instead of 200 |
| Health test after implementation | Passed: 1 test file and 1 test |
| Client production build | Passed after adding the real health request and UI states |
| Client baseline tests | 1 passed; 2 Issue 4 TODO tests remain intentionally deferred |
| Browser success check | Passed; with the backend running, the page displayed Online |
| Browser failure check | Passed; with the backend stopped, the page displayed Offline and a useful recovery message |

## Issue 3 category database evidence

Verified on `feature/3-category-seed` on 2026-08-10.

| Check | Result |
|-------|--------|
| Prisma schema validation | Passed with the `Category` model |
| Prisma Client generation | Passed with Prisma 5.22.0 |
| Initial migration | Created and applied `20260810073523_init` |
| Migration status | Passed; database schema is up to date |
| Seed first run | Passed; inserted the four required categories |
| Seed second run | Passed; database remained at 4 rows and 4 distinct names |
| Direct PostgreSQL query | Passed; Account and Access, Hardware, Software, and Network were present |
| Server production build | Passed |
| Server regression tests | Health test passed; Issue 4 category endpoint test remains TODO |
| Secret check | Passed; local `.env` and `node_modules` are not tracked |

## Commands

Run the backend tests:

```powershell
cd server
npm test
```

Run the frontend tests:

```powershell
cd client
npm test
```

## Final evidence

TODO: After all four features are merged, run both test suites on `main` and
paste the passing terminal output or add clearly labeled screenshots here.
