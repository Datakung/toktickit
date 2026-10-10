# Verified final-main evidence - Issue #44

Application revision: `0f169eaeca9bf00672c5c32884a1913c53b845d3`, peer-merged PR #51.
The gate started on clean main (`workingTreeDirtyAtStart: false`) before any
documentation follow-up. Run: October 11, 02:39:09-02:45:43 Asia/Bangkok.
`gate/manifest.json` records 298 server, 211 client and 49 browser passes, ten
gate regressions, both builds, Prisma validation, four clean audits and exit codes.
No required skips, todos, flaky cases or retries. Preservation is verified.

Expanded before/after database/uploads SHA-256:
`53a3235133832dae4df2e5e1e40711f5b844796d78b2cbdd776185e1d1d62ab3`.
Only guarded disposable test/E2E targets were migrated/seeded/reset. Existing
development PostgreSQL was started, not migrated/seeded/reset. Unrelated services
were untouched. The source under client/server is unchanged by this evidence work.

## Fresh versus inherited evidence

`fresh-gate-files.json` identifies the new manifest, executed step logs and three
per-case JSON reports, with digests. A successful no-output diff-check produces
no Tee log; its zero exit code is recorded in the manifest. Other files inherited
by the gate-directory snapshot, including original audit-before/source-fingerprint
files, screenshots and review-fix material, remain historical candidate support,
NOT fresh final-main output. `gate/README.md` is the inherited dated candidate record.
The original tracked `quality-gate/` tree was byte-for-byte restored from a backup
after archiving this run, preserving candidate provenance rather than relabeling it.

`captured-screenshots.json` indexes 168 original fresh full-gate captures plus 24
supplementary captures, source paths, capture timestamps, revision and byte hashes.
Only `screenshots/` and `supplementary-screenshots/` are the final captures; do not
use inherited `gate/screenshots/` as final evidence. Original PNGs were not edited.
PDF excerpts are labelled with their source and crop; originals remain available.

## Independent dashboard parity and healthy-screen audit

`dashboard-parity.json` records 36 metric/API/list comparisons for a populated
Requester, empty Requester, Staff and Administrator. Expected values come from
independently selected raw Ticket/Action rows, not production query builders.
Exact captured ranges, actor IDs, actual counts, filters and ordered bounded lists
are retained. This is a separate reseeded disposable fixture run, not a claim
that every screenshot from the preceding mutable browser suite has identical counts.
Its 24 additional captures use exactly the separately queried fixture population.
Application source remains the reviewed revision. The supplementary run finished
02:48:29 Bangkok with matching development digests.

No unexpected JavaScript/console errors or horizontal body/root overflow occurred
across the eight healthy role screens at 1440/768/390px. Expected signed-out
`/api/auth/me` 401 responses on `/login` are explicitly listed, not hidden or
misrepresented as zero network errors. Deliberately simulated API failures in the
full browser suite are distinct from this healthy-screen audit.

Reproduce from the repository root:
`server/node_modules/.bin/tsx scripts/lab4-final-main-parity.mts <main-revision>`.
The helper resets only the validated E2E target, launches its own review API/UI
on 3100/5183, compares real authenticated routes, audits screens and shuts down
only its own processes. Do not run it concurrently with another E2E fixture user.
The initial Category selector timeout and the subsequent over-strict console
assertion remain in `dashboard-parity-initial.log` and
`dashboard-parity-session-probes.log`; `dashboard-parity.log` is the passing rerun.

## Acceptance boundary

PR #50/#51 approvals/merges are actual peer evidence; see reviewer.md. #44 was
prematurely closed/Done, then explicitly reopened/Started for this work.
`issue-state.json` and `project-state.json` retain actual #39-44 states.
Agent screenshot review and automated checks do not substitute for the author's
final visual/PDF acceptance or a manual screen-reader certification. The local
evidence/documentation follow-up is not yet published; the PDF is a review copy.
Keep #44 open until final acceptance and publication, then refresh actual all-Done
evidence and rebuild the submission copy. Reviews given by Datakung on eight
Lab 4 PRs in auto4496/toktickit are now verified in reviewer.md and rendered in
Answer Part 1; historical peer test totals are not fresh runs for this report.
`reciprocal-review.json` preserves the retrieved review comments, author replies,
approvals and merge metadata used for this correction. It is a separate GitHub
evidence record, not an application gate or a claim of student final acceptance.

## PDF review copy and verification

`output/pdf/TokTickIT-Lab4-Review.pdf` renders Answer Parts 1-9 in exact order,
maintained-document excerpts and 42 readable figures over 54 A4 portrait pages
(210 x 297 mm). Tables use portrait-specific widths and screenshots use
single-column panels. The full six
Markdown documents, four complete test logs, three per-case JSON reports, manifest,
parity report, screenshot index and visual checklist are embedded as 17 attachments.
A viewer supporting PDF attachments is needed to inspect the complete raw output.
Source URLs target real files at the published reviewed commit; the local updated
documents are embedded and explicitly distinguished from that published version.

The agent inspected every rendered page and rechecked the new reciprocal-review
pages at full size. `pdf-review.json` records the exact PDF digest, reviewed
page digests, verified A4 portrait dimensions on every page, heading order,
byte-identical attachments, in-page text bounds and
verified original evidence hashes. This remains agent QA, not author acceptance.

Rebuild with `python scripts/build-lab4-review.py` from a Python environment with
ReportLab, Pillow and pypdf. Render the resulting PDF using Poppler, inspect every
current page, then run `python scripts/check-lab4-review.py`. Only supply
`--reviewed-render-dir <directory> --agent-review-confirmed` after actually checking
all current rendered pages. A rebuild is not itself visual approval. This generator
intentionally produces a review copy; final closure/publication requires a genuine
updated record and regenerated submission copy, not changing a label alone.
