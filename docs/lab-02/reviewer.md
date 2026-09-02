# Lab 2 Peer Review Evidence

## Participants and repositories

| Role | Name | Student ID | GitHub |
|---|---|---|---|
| Author | Pitchai Chadchuangchot | 67070501068 | [@Datakung](https://github.com/Datakung) |
| Peer partner | Phanuwit Butchari | 67070501070 | [@auto4496](https://github.com/auto4496) |

- **My repository:** [Datakung/toktickit](https://github.com/Datakung/toktickit)
- **Partner repository:** [auto4496/toktickit](https://github.com/auto4496/toktickit)
- **GitHub Project:** [TokTickIT Individual Sprints](https://github.com/users/Datakung/projects/1)
- **Integration branch:** `lab2-staging`
- **Release target:** `main`

## Lab 2 review commitments

- Every feature PR is explicitly linked to its GitHub Issue; a linked branch alone is insufficient.
- Pitchai replies to every review comment, stating the correction or explaining a reasoned disagreement.
- Phanuwit submits the approval and clicks **Merge pull request**; Pitchai does not merge their own PR.
- A changes-requested PR moves from PR Review to Fixing, then returns to PR Review after correction and response.
- An Issue moves to Done only after reviewer merge, passing relevant checks, and acceptance-criteria verification.

## Pull Requests authored by Pitchai and reviewed by Phanuwit

This table is updated during each Issue. Do not replace pending entries with claims until the linked GitHub evidence exists.

| Issue and branch | Pull Request | Useful review comment and Pitchai's response | Approval and reviewer merge |
|---|---|---|---|
| [Issue #11](https://github.com/Datakung/toktickit/issues/11) — `feature/11-engineering-contract` | [PR #17 — Engineering contract and test plan](https://github.com/Datakung/toktickit/pull/17) | Phanuwit [requested changes](https://github.com/Datakung/toktickit/pull/17#pullrequestreview-5061141468): make the five-file limit atomic, define deterministic filename/signature rules and authenticated preview behavior, test safe unexpected failures for every capability, and avoid claiming peer approval early. Pitchai moved the card to Fixing, applied [correction `1a36faa`](https://github.com/Datakung/toktickit/commit/1a36faa9754e00e373280044409ea1c681d86d45), replied to all three threads, and returned the card to PR Review. | Phanuwit [approved](https://github.com/Datakung/toktickit/pull/17#pullrequestreview-5061353056) the corrected contract and merged PR #17 into `lab2-staging` as [`1144689`](https://github.com/Datakung/toktickit/commit/1144689f49e94f5047ea1c7d8ad34d6df6df88b6). |
| [Issue #12](https://github.com/Datakung/toktickit/issues/12) — `feature/12-data-requester-context` | [PR #18 — Data and Development Requester context](https://github.com/Datakung/toktickit/pull/18) | Phanuwit first [requested four corrections](https://github.com/Datakung/toktickit/pull/18#pullrequestreview-5064298785): accessible/mobile navigation, Back/Forward synchronization, bounded Requester IDs, and fixture cleanup. After confirming those fixes, he [identified a remaining isolation gap](https://github.com/Datakung/toktickit/pull/18#pullrequestreview-5066745408): Vitest still used the development URL. Pitchai agreed, replied to both reviews, returned the card to Fixing, and added a fail-fast guarded `TEST_DATABASE_URL`, isolated migration/seed setup, and proof that development data remains unchanged. | Phanuwit [approved the isolated correction](https://github.com/Datakung/toktickit/pull/18#pullrequestreview-5067693713) at `cd66489` and merged PR #18 into `lab2-staging` as [`01ba123`](https://github.com/Datakung/toktickit/commit/01ba1239aa49dd964663fcf300194e66fb3bc293). |
| [Issue #13](https://github.com/Datakung/toktickit/issues/13) — `feature/13-create-ticket` | [PR #19 — Requester Ticket creation and initial Attachments](https://github.com/Datakung/toktickit/pull/19) | Phanuwit's [first review](https://github.com/Datakung/toktickit/pull/19#pullrequestreview-5073794731) incorrectly identified the control-character regex as negated. Pitchai [reproduced and explained](https://github.com/Datakung/toktickit/pull/19#issuecomment-5488591626) the exact outputs rather than changing correct code, and Phanuwit marked that finding superseded. His [follow-up review](https://github.com/Datakung/toktickit/pull/19#pullrequestreview-5073867113) found four valid gaps: `error.fields` contract alignment, safe malformed-JSON handling, programmatic required/error semantics plus invalid styling, and long-filename mobile wrapping. Pitchai accepted them, committed the corrections as [`98ccea7`](https://github.com/Datakung/toktickit/commit/98ccea7dff324ff3277a9ae155a1532fc0dbcab7), and [replied with verification](https://github.com/Datakung/toktickit/pull/19#issuecomment-5488740862). | Phanuwit [re-reviewed and approved](https://github.com/Datakung/toktickit/pull/19#pullrequestreview-5073948820) commit `98ccea7`, then merged PR #19 into `lab2-staging` as [`ec8e9aa`](https://github.com/Datakung/toktickit/commit/ec8e9aa0ffde2f4745edaa091ea405bcab15dc31). |
| [Issue #14](https://github.com/Datakung/toktickit/issues/14) — `feature/14-my-tickets` | [PR #20 — Requester-owned My Tickets](https://github.com/Datakung/toktickit/pull/20) | Phanuwit [requested one correction](https://github.com/Datakung/toktickit/pull/20#pullrequestreview-5075712076): PostgreSQL `ILIKE` wildcard characters in search text were not treated literally. Pitchai accepted the finding, moved the card to Fixing, escaped `%`, `_`, and backslash once for both searchable fields, added database-backed regressions, and [replied with verification](https://github.com/Datakung/toktickit/pull/20#issuecomment-5491272003) for correction [`935dadc`](https://github.com/Datakung/toktickit/commit/935dadc88199c717e2a99a53ff2842fc08fc742c). | Phanuwit [re-reviewed and approved](https://github.com/Datakung/toktickit/pull/20#pullrequestreview-5075875089) commit `935dadc`, then merged PR #20 into `lab2-staging` as [`818b527`](https://github.com/Datakung/toktickit/commit/818b527). |
| [Issue #15](https://github.com/Datakung/toktickit/issues/15) — `feature/15-ticket-detail-attachments` | [PR #21 — Ticket Detail and Attachment lifecycle](https://github.com/Datakung/toktickit/pull/21) | Phanuwit first [requested centralized `REQUESTER_UNAVAILABLE` handling and complete focus behavior](https://github.com/Datakung/toktickit/pull/21#pullrequestreview-5078895790). Pitchai accepted both findings and added 403, route-heading, focus-entry/trap, Escape, and trigger-restoration regressions. On [re-review of `177f14d`](https://github.com/Datakung/toktickit/pull/21#pullrequestreview-5079475348), Phanuwit confirmed those findings resolved but found the rejected Requester remained in the cached selector. Pitchai kept the card in Fixing, removed the rejected option while retaining other active choices in [`fb608a8`](https://github.com/Datakung/toktickit/commit/fb608a85426ac64df66e0d5ab8e9f778f2a0f96e), replied to the finding, and returned the card to PR Review. | Phanuwit [re-reviewed and approved](https://github.com/Datakung/toktickit/pull/21#pullrequestreview-5079724279) the final correction and merged PR #21 into `lab2-staging` as [`1123b3f`](https://github.com/Datakung/toktickit/commit/1123b3f3841e3b2a563d8c66665da083f59c1572). |
| [Issue #16](https://github.com/Datakung/toktickit/issues/16) — `feature/16-quality-release` | [PR #22 — Lab 2 quality and release evidence](https://github.com/Datakung/toktickit/pull/22) | Phanuwit [requested two release-gate corrections](https://github.com/Datakung/toktickit/pull/22#pullrequestreview-5086787821): prevent Playwright from using or modifying development data, and prevent routine E2E runs from overwriting committed timestamp-dependent screenshots. Pitchai accepted both findings, moved the card to Fixing, and added a guarded migrated/seeded/cleaned E2E target with development-state hashing plus separate routine and deterministic evidence-capture paths in [correction `b3fe114`](https://github.com/Datakung/toktickit/commit/b3fe114). The correction passes 94 server tests, 65 client tests, all 14 browser tests, unchanged development/evidence hashes during a routine run, and identical screenshot hashes across two explicit evidence runs. | Correction verified locally; re-review, approval, and reviewer-performed merge pending |
| Release `lab2-staging` → `main` | Pending | Pending | Pending |

## Phanuwit's Pull Requests reviewed by Pitchai

Record only substantive, verified interactions from the partner repository.

| Partner Issue / PR | Pitchai's useful review comment | Phanuwit's response and correction | Pitchai's approval |
|---|---|---|---|
| Pending | Pending | Pending | Pending |

## Kanban record

All six Lab 2 Issues were created before implementation and initially placed in Backlog. Issues #11–#15 reached Done only after the required review conversations, Phanuwit's approvals, and reviewer-performed merges. Issue #16 is in Started while its local quality gate and documentation are prepared; it must remain outside Done through both the quality PR and final release PR.

| Issue | Current/final status |
|---|---|
| [#11 — Engineering contract and test plan](https://github.com/Datakung/toktickit/issues/11) | Done — approved and merged by Phanuwit |
| [#12 — Data foundation and Development Requester context](https://github.com/Datakung/toktickit/issues/12) | Done — corrected, approved, and merged by Phanuwit |
| [#13 — Requester Ticket creation](https://github.com/Datakung/toktickit/issues/13) | Done — corrected, [approved](https://github.com/Datakung/toktickit/pull/19#pullrequestreview-5073948820), and merged by Phanuwit |
| [#14 — My Tickets](https://github.com/Datakung/toktickit/issues/14) | Done — corrected, [approved](https://github.com/Datakung/toktickit/pull/20#pullrequestreview-5075875089), and merged by Phanuwit |
| [#15 — Ticket Detail and Attachment lifecycle](https://github.com/Datakung/toktickit/issues/15) | Done — corrected, [approved](https://github.com/Datakung/toktickit/pull/21#pullrequestreview-5079724279), and merged by Phanuwit |
| [#16 — Quality and release integration](https://github.com/Datakung/toktickit/issues/16) | Fixing — correction `b3fe114` verified locally; push, response, and re-review pending |

Final evidence will replace these current states with Done links and a readable board screenshot.
