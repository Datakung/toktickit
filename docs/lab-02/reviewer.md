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
| [Issue #13](https://github.com/Datakung/toktickit/issues/13) — `feature/13-create-ticket` | Pending | Pending | Pending |
| [Issue #14](https://github.com/Datakung/toktickit/issues/14) — `feature/14-my-tickets` | Pending | Pending | Pending |
| [Issue #15](https://github.com/Datakung/toktickit/issues/15) — `feature/15-ticket-detail-attachments` | Pending | Pending | Pending |
| [Issue #16](https://github.com/Datakung/toktickit/issues/16) — `feature/16-quality-release` | Pending | Pending | Pending |
| Release `lab2-staging` → `main` | Pending | Pending | Pending |

## Phanuwit's Pull Requests reviewed by Pitchai

Record only substantive, verified interactions from the partner repository.

| Partner Issue / PR | Pitchai's useful review comment | Phanuwit's response and correction | Pitchai's approval |
|---|---|---|---|
| Pending | Pending | Pending | Pending |

## Kanban record

All six Lab 2 Issues were created before implementation and initially placed in Backlog. Issues #11 and #12 each followed the required review/fix/re-review path and reached Done only after Phanuwit approved and merged their PRs. Issue #13 then moved through Specified to Started for implementation on its dedicated branch.

| Issue | Current/final status |
|---|---|
| [#11 — Engineering contract and test plan](https://github.com/Datakung/toktickit/issues/11) | Done — approved and merged by Phanuwit |
| [#12 — Data foundation and Development Requester context](https://github.com/Datakung/toktickit/issues/12) | Done — corrected, approved, and merged by Phanuwit |
| [#13 — Requester Ticket creation](https://github.com/Datakung/toktickit/issues/13) | Started — implementation and verification complete locally; PR not yet opened |
| [#14 — My Tickets](https://github.com/Datakung/toktickit/issues/14) | Backlog |
| [#15 — Ticket Detail and Attachment lifecycle](https://github.com/Datakung/toktickit/issues/15) | Backlog |
| [#16 — Quality and release integration](https://github.com/Datakung/toktickit/issues/16) | Backlog |

Final evidence will replace these current states with Done links and a readable board screenshot.
