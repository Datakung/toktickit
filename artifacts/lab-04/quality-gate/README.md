# Issue #44 quality-gate evidence

Phase: local release candidate on `feature/44-quality-release`, based on
peer-merged staging `4660ac61b8609be19bc6d2e057b8516fa7fb74ce`.
These are not final-main results and do not close Issue #44.

Run `./scripts/lab4-quality-gate.ps1` from the repository root. It retains full
logs and per-case JSON reports, audits production and development dependencies,
validates Prisma without a development migration, and compares an expanded
development database/uploads fingerprint before and after the entire gate.
An existing PostgreSQL container and guarded TEST_DATABASE_URL/E2E_DATABASE_URL
configuration are prerequisites. Review ports are 5183/3100.

`manifest.json` records the actual revision, branch, dirty-start flag, UTC times,
command exit codes/durations, test totals and preservation hashes. A dirty local
candidate is labeled honestly; it is not a committed/final-main test claim.
The server/client JSON reports retain individual file/test results. Browser JSON
and list output retain all scenarios. No skips/todos/flaky retries are accepted.

## Dependency correction

Keep `*-audit-before.json` as the original finding records. Fresh production
audit reported one moderate Multer issue and one critical proxy-addr issue;
full audits reported 9 server / 7 client dependency findings. Updates resolved
Multer 2.4.0, proxy-addr 2.0.8, Vitest 4.1.11, Vite 6.4.4 and source-map-js 1.2.2.
Subsequent production/full audits reported zero findings in both projects.
No automatic force/major application-framework upgrade or Prisma migration was used.

The targeted first upload check could not connect because PostgreSQL was stopped.
`upload-hardening.log` retains that setup failure; `upload-hardening-retry.log`
records the passing retry after starting the existing container. New tests use
a unique OS-temp upload directory or disposable schema, never development records.

## Current execution

The complete reproducible gate passed from 22:55:28 to 23:02:19 Bangkok on
2026-10-10. Actual totals are 298 server tests (40 files), 211 client tests
(23 files), and 49 Chromium scenarios (4.3m). Both builds, Prisma validation,
four zero-finding dependency audits and diff checks passed. No skipped/todo/flaky
cases. The manifest's dirty-start flag is true: these results cover local
candidate content on base 4660ac6, not a claimed clean committed revision.
Exact dependency/new-test/gate file digests are retained in
[source-fingerprints.json](source-fingerprints.json); their modification times
predate this run. Documentation and screenshot indexing were updated afterward.

The expanded before/after development digest is identical:
`53a3235133832dae4df2e5e1e40711f5b844796d78b2cbdd776185e1d1d62ab3`.
Logs retain the complete output, including the 500-Ticket/500-Action performance
smoke. JSON reports retain every test result. Earlier preliminary logs remain
separate; they are not combined into the latest uninterrupted run.

Eighteen inspected captures from this gate are retained without image changes.
See [visual-evidence.md](visual-evidence.md) and
[captured-screenshots.json](captured-screenshots.json) for provenance/limitations.
The `-FinalMain` guard was checked on this dirty feature branch and correctly
refused before starting or replacing evidence. No final-main run is claimed.

## Remaining release gates

- Peer-review the quality changes and merge them into lab4-staging.
- Complete full major-screen visual/accessibility acceptance; the 18 retained
  candidate samples are agent inspection, not author final acceptance.
- Peer-review staging -> main and rerun the gate on clean main with `-FinalMain`.
- Capture final-main screenshots and database-parity provenance; never relabel
  historical feature screenshots as final main.
- Complete final visual/accessibility checklist, nine-part PDF and working-link
  checks; author model selection/reflection are recorded in docs/lab-04/ai-use.md.
- Verify all six actual Issue/Project acceptance states; keep #44 open until done.
