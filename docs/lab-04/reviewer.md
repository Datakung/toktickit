# Lab 4 Peer Review Record

Status: Contract corrections approved and merged in PR #45 on 2026-10-05.
Issue #40 was independently approved and merged by auto4496 in PR #46 on
2026-10-06. Issue #41 UI is published in PR #47; Phanuwit requested changes on
2026-10-07. The fixture correction is locally verified, pending author commit/push
and peer re-review. No approval/merge or reciprocal review is claimed for #41.

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
| Action foundation | [#40](https://github.com/Datakung/toktickit/issues/40) | [#46](https://github.com/Datakung/toktickit/pull/46) / lab4-staging | Approved by auto4496 on 4795f38 | Merged a915812; Issue closed/Done |
| Action UI | [#41](https://github.com/Datakung/toktickit/issues/41) | [#47](https://github.com/Datakung/toktickit/pull/47) / lab4-staging | Changes requested on 3addd43; correction prepared below | Open; not accepted/Done |
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
commit: cd5aa76005a83cecea67aaad3394729cddb6843c (2026-10-06); documentation
3addd437518e1573fa79dccf0e08ca7cf419dc0d. Both were pushed to PR #47. Review the
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
PR #47 explicitly Development-links Issue #41 and targets lab4-staging; linkage
was verified through closingIssuesReferences. Issue #41 is not Done.

### PR #47 requested correction, 2026-10-07

[Phanuwit's Changes requested review](https://github.com/Datakung/toktickit/pull/47#pullrequestreview-5438725606)
was submitted by auto4496 on exact head 3addd43 at 06:58:40 UTC (13:58:40 Bangkok).
His [P2 finding](https://github.com/Datakung/toktickit/pull/47#discussion_r4203986376)
identifies unmocked real Action reads after mounting ActionsTaken in legacy
Requester detail fixtures. Responses from localhost:3000 could be a non-ActionPage,
causing render errors and losing the attachment/communication screen assertions.

He reported 33/33 new component/style checks and 5/5 new Chromium journeys passing,
plus both builds and whitespace checks. His full client run passed 121/130 with
9 failures/9 uncaught errors across 4 files, not merely timeouts. A serial check
of AttachmentSection and RequesterCommunication passed 1/12 at head versus 12/12
at base with the same dependencies/environment. His browser checks used disposable
PostgreSQL 17 databases and an unchanged reviewer baseline/upload fingerprint,
not the author's development database. He did not rerun all 182 backend tests
or all 31 earlier browser journeys.

Author authorized correction with "Yes fix them". Six legacy detail fixture files
now use a shared typed empty ActionPage matching parent version/current cycle;
Staff navigation also mocks assignees and supports numeric/string Ticket reads.
Mutation fixtures advance the Action summary version with the parent. The claim
navigation regression waits for an enabled control and asserts the request was
sent before navigation, retaining its late-response assertions. The Requester
private-Notes spy is installed before mounting, rather than after the read could
already occur. Original test cases/assertions remain; none are skipped.

A test-only fetch guard rejects and fails any unexpected network call in these
six files. It exposed missing Action/assignee reads before correction; cleanup
and mock restoration occur even when the guard fails. Full default and serial
client results and the typed client build are in [tests.md](tests.md).
Production source, permissions, database/uploads and screenshots are unchanged.
These are local verification results, not Phanuwit's verification of the fix.
Correction commit, pushed head, author reply and reviewer acceptance must be
recorded after they actually exist; PR #47 remains Changes requested.

## Final integration and reciprocal review

Record real feature/release approvals and merge commits, final-main checks and
Project Done evidence after they exist. Keep the release Issue open until those
checks finish. Record author reviews of the peer's actual project with direct links
when performed; no reciprocal review has been recorded for this lab yet.
