# Lab 4 Peer Review Record

Status: Contract corrections approved and merged in PR #45 on 2026-10-05.
Issue #40 was independently approved and merged by auto4496 in PR #46 on
2026-10-06. Issue #41 UI is locally implemented from that merge, pending author
commit/push, a linked PR and its own review. No reciprocal review is claimed.

Author: Pitchai Chadchuangchot, 67070501068, GitHub Datakung.
Expected peer: Phanuwit Butchari, 67070501070, GitHub auto4496.
Repository: https://github.com/Datakung/toktickit

## Review workflow

Six Issues were created on 2026-10-03 and linked to
[TokTickIT Individual Sprints](https://github.com/users/Datakung/projects/1):
#39 contract, #40 action foundation, #41 action UI, #42 Ticket workflow,
#43 dashboards and #44 quality/release. All were initially placed in Backlog.
Feature PRs target lab4-staging; final reviewed release targets main. Specifications
must be approved before product implementation. Normal commits/pushes are performed
by the author; the peer supplies actual review comments, approval and merge.

| Work group | Issue | PR/base | Review/author response/approval | State |
|---|---|---|---|---|
| Engineering contract | [#39](https://github.com/Datakung/toktickit/issues/39) | [#45](https://github.com/Datakung/toktickit/pull/45) / lab4-staging | Corrected ff97405; actual approval below | Merged d32c8cf |
| Action foundation | [#40](https://github.com/Datakung/toktickit/issues/40) | PR being prepared / lab4-staging | Implementation 4920527; review pending | Started; implementation/tests prepared |
| Action UI | [#41](https://github.com/Datakung/toktickit/issues/41) | Pending / lab4-staging | Pending | Backlog |
| Ticket workflow | [#42](https://github.com/Datakung/toktickit/issues/42) | Pending / lab4-staging | Pending | Backlog |
| Dashboards | [#43](https://github.com/Datakung/toktickit/issues/43) | Pending / lab4-staging | Pending | Backlog |
| Quality/release | [#44](https://github.com/Datakung/toktickit/issues/44) | Pending / lab4-staging, then main | Pending | Backlog |

## Contract review questions

- Do proposed action state/assignment/performer semantics meet the rubric?
- Does immutable revision history reconcile action edits with append-only evidence?
- Are completed corrections, follow-up clearing, terminal locks and cycle rules clear?
- Does the resolution gate work for new/reopened Tickets without fabricating legacy data?
- Are metric predicates/date boundaries/zeroes and drill-down queries equivalent?
- Do migration/recovery/repeat-seed tests preserve previous records and credentials?
- Does every AC map to an actual planned test path and each work group include tests?

For each finding record a direct comment/review link, actual correction commit,
author reply link, reviewer verification and status. Do not prewrite statements
claiming independent reviewer testing or permission.

## PR #45 findings, response and acceptance

Phanuwit (auto4496) submitted Changes requested on e11ae78 on 2026-10-04.
He reported reviewing the seven documentation files against the supplied sheet
and inherited Lab 3 contracts/implementation, confirming the 16-AC/30-test-group
mapping, local links and whitespace check. He explicitly reported no Lab 4
runtime tests, builds, migrations or browser journeys for this docs-only review.

| Finding | Local correction prepared 2026-10-05 | Verification status |
|---|---|---|
| [P2: field/assignment save semantics](https://github.com/Datakung/toktickit/pull/45#discussion_r4178298231) | Keep initial assignment atomic on create; separate existing-action field and assignment controls/requests. Require authoritative version reload between explicit operations, preserve earlier success and reconcile uncertain assignment with its original payload/key. Align BR-09, API/UI and CASE-26. | Corrected ff97405; author replied; peer approved contract |
| [P3: paged resolution checklist](https://github.com/Datakung/toktickit/pull/45#discussion_r4178298235) | Define whole-cycle ResolutionGate counts with parent version/cycle and action page in one repeatable-read snapshot; UI never infers ready from one page or stale/unknown summary. Align BR-13, API/UI and CASE-27. | Corrected ff97405; author replied; peer approved contract |

P2 is blocking; P3 was identified by the reviewer as non-blocking. These are
documentation corrections; their implementation requires separate review.
Evidence: [original Changes requested review](https://github.com/Datakung/toktickit/pull/45#pullrequestreview-5406930778),
[correction commit ff97405](https://github.com/Datakung/toktickit/commit/ff974057417e42f91b3ba6a78699f4fa8acfd686),
[author reply](https://github.com/Datakung/toktickit/pull/45#issuecomment-5983103209),
and [Phanuwit's approval](https://github.com/Datakung/toktickit/pull/45#pullrequestreview-5416186064).
Approval was submitted 2026-10-05 14:34:36 UTC; merge followed at 14:37 UTC
as d32c8cf. This docs-only approval does not claim peer runtime testing.

## Issue #40 implementation review handoff

Branch feature/40-actions-foundation starts from approved staging d32c8cf.
Review the additive migration/constraints/immutable events, real actor attribution,
owned Requester reads, separate save contracts, optimistic versions, exact receipts,
account unassignment lock ordering and repeatable non-destructive demo seed.
Actual local verification: 182 server tests, 97 client tests, 31 earlier browser
scenarios, both builds, populated migration/rollback/backup restore and unchanged
development state during E2E. New action screens and formal Ticket gate are later
Issues. Server audit has an open moderate dependency finding; details in [tests.md](tests.md).
Implementation commit: [4920527](https://github.com/Datakung/toktickit/commit/4920527416236030f4eed4a5b8e32464f1370bb5).
Documentation commit: 4795f38. [PR #46](https://github.com/Datakung/toktickit/pull/46)
is explicitly linked to closed Issue #40; its Project item is Done.
[Phanuwit's approval](https://github.com/Datakung/toktickit/pull/46#pullrequestreview-5426230601)
was submitted on exact head 4795f38 at 2026-10-06 09:13:21 UTC. He reported no
actionable foundation defects, an independent build/Prisma/migration/restore/
seed/concurrency/immutable-history review in disposable PostgreSQL 17, and all
36 new tests passing. Three older Lab 3 tests timed out in his initial full run;
the three affected files passed all 23 tests when rerun sequentially with a
20-second timeout. His extra account-deactivation race test passed. He explicitly
did not independently run client/E2E checks. His test harness alone used a different
Docker container name; no production changes were reported. Peer merge followed
at 12:09:25 UTC as a915812. These statements report his actual review, not an
invented author run or approval of later UI/workflow/dashboard work.

## Issue #41 UI handoff

Branch feature/41-actions-ui starts from peer-merged staging a915812. Implementation
commit: cd5aa76005a83cecea67aaad3394729cddb6843c (2026-10-06); documentation commit,
push and PR remain pending. Review the
shared role-safe Action screen, exact nested deep links, independent saves,
Bangkok timestamp precision, actual performer confirmation, completed correction
reason, terminal/prior-cycle guards, paged audit history, stale/unknown-save
recovery and responsive cards. In particular, CASE-26 must not auto-chain saves
or repeat fields when assignment fails. Check saved-but-refresh-failed create
recovery and Requester direct mutation denial. See [tests.md](tests.md) and
the [feature screenshot provenance](../../artifacts/lab-04/screenshots/actions-taken/README.md).
Local verification on 2026-10-06: 182 server tests, 130 client tests, 36 browser
scenarios (5 new Action journeys), both builds, Prisma validate and unchanged
development data/uploads. Thirteen feature screenshots were captured and
representative desktop/mobile Staff/Requester images visually inspected by the
agent. Author visual acceptance is not yet recorded. Unknown retries retain
their original user/Ticket-scoped payload/key across a full browser reload;
confirmed-save refresh never creates again, and sign-out clears journals.
Issue #41 is Started, not Done; no PR,
peer findings, approval or merge is claimed until they exist. Link its feature
PR explicitly to Issue #41 in Development, with base lab4-staging and auto4496
as reviewer; do not treat a plain issue mention as verified linkage.

## Final integration and reciprocal review

Record real feature/release approvals and merge commits, final-main checks and
Project Done evidence after they exist. Keep the release Issue open until those
checks finish. Record author reviews of the peer's actual project with direct links
when performed; no reciprocal review has been recorded for this lab yet.
