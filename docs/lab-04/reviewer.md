# Lab 4 Peer Review Record

Status: Contract review received; local corrections await author commit/push and
peer verification. No Lab 4 approval, merge or reciprocal review is claimed.

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
| Engineering contract | [#39](https://github.com/Datakung/toktickit/issues/39) | [#45](https://github.com/Datakung/toktickit/pull/45) / lab4-staging | Changes requested; author reply/approval pending | Local corrections prepared |
| Action foundation | [#40](https://github.com/Datakung/toktickit/issues/40) | Pending / lab4-staging | Pending | Backlog |
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

## PR #45 findings and local response

Phanuwit (auto4496) submitted Changes requested on e11ae78 on 2026-10-04.
He reported reviewing the seven documentation files against the supplied sheet
and inherited Lab 3 contracts/implementation, confirming the 16-AC/30-test-group
mapping, local links and whitespace check. He explicitly reported no Lab 4
runtime tests, builds, migrations or browser journeys for this docs-only review.

| Finding | Local correction prepared 2026-10-05 | Verification status |
|---|---|---|
| [P2: field/assignment save semantics](https://github.com/Datakung/toktickit/pull/45#discussion_r4178298231) | Keep initial assignment atomic on create; separate existing-action field and assignment controls/requests. Require authoritative version reload between explicit operations, preserve earlier success and reconcile uncertain assignment with its original payload/key. Align BR-09, API/UI and CASE-26. | Author commit/push/reply and peer re-review pending |
| [P3: paged resolution checklist](https://github.com/Datakung/toktickit/pull/45#discussion_r4178298235) | Define whole-cycle ResolutionGate counts with parent version/cycle and action page in one repeatable-read snapshot; UI never infers ready from one page or stale/unknown summary. Align BR-13, API/UI and CASE-27. | Author commit/push/reply and peer re-review pending |

P2 is blocking; P3 was identified by the reviewer as non-blocking. These are
documentation corrections and planned tests, not implemented or passed behavior.
Record the actual correction commit and author reply links after they exist;
only Phanuwit's actual re-review can establish acceptance of the corrections.

## Final integration and reciprocal review

Record real feature/release approvals and merge commits, final-main checks and
Project Done evidence after they exist. Keep the release Issue open until those
checks finish. Record author reviews of the peer's actual project with direct links
when performed; no reciprocal review has been recorded for this lab yet.
