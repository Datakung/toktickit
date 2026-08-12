# Lab 1 - Test Plan and Evidence

All automated test files are located under `server/tests/lab-01/` and
`client/tests/lab-01/`.

| ID | Test file | Tool | Test description | Result |
|----|-----------|------|------------------|--------|
| API-01 | `server/tests/lab-01/health.test.ts` | Supertest | `GET /api/health` returns HTTP 200 and the expected JSON | Passed |
| API-02 | `server/tests/lab-01/categories.test.ts` | Supertest | `GET /api/categories` returns the four seeded categories in ID order | Passed |
| UI-01 | `client/tests/lab-01/App.test.tsx` | Vitest | The TokTickIT heading renders | Passed |
| UI-02 | `client/tests/lab-01/App.test.tsx` | Vitest | A loading state appears while the system check is pending | Passed |
| UI-03 | `client/tests/lab-01/App.test.tsx` | Vitest | A successful check displays Online and the four-category list | Passed |
| UI-04 | `client/tests/lab-01/App.test.tsx` | Vitest | An unavailable API displays Offline and a useful error message | Passed |

## Passing terminal output

The complete test suites were run on 2026-08-12 with PostgreSQL running.

### Server

Command: `npm --prefix server test`

```text
RUN  v2.1.9 C:/CPE/CPE333/MINE/toktickit/server

✓ tests/lab-01/categories.test.ts (1)
✓ tests/lab-01/health.test.ts (1)

Test Files  2 passed (2)
     Tests  2 passed (2)
```

### Client

Command: `npm --prefix client test`

```text
RUN  v2.1.9 C:/CPE/CPE333/MINE/toktickit/client

✓ tests/lab-01/App.test.tsx (4)
  ✓ App (4)
    ✓ renders the TokTickIT heading
    ✓ shows a loading state while checking the system
    ✓ shows Online and the seeded categories on success
    ✓ shows an Offline error message when the API is unavailable

Test Files  1 passed (1)
     Tests  4 passed (4)
```
