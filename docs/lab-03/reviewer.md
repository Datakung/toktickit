# Lab 3 Peer Review Evidence

Status: Engineering contract and Issues #26–#28 approved and peer-merged. Issue #29 implementation, automated verification and author manual acceptance are recorded; commits, PR and peer review remain pending.

| Role | Name | Student ID | GitHub |
|---|---|---|---|
| Author | Pitchai Chadchuangchot | 67070501068 | [Datakung](https://github.com/Datakung) |
| Peer | Phanuwit Butchari | 67070501070 | [auto4496](https://github.com/auto4496) |

Repositories: [mine](https://github.com/Datakung/toktickit), [partner](https://github.com/auto4496/toktickit). Board: [TokTickIT Individual Sprints](https://github.com/users/Datakung/projects/1).

## Authored work

| Issue | Scope | PR / received review / response / approval / reviewer merge |
|---|---|---|
| [#25](https://github.com/Datakung/toktickit/issues/25) | Engineering contract | [PR #31](https://github.com/Datakung/toktickit/pull/31): changes requested, corrections discussed, Phanuwit approved and merged. |
| [#26](https://github.com/Datakung/toktickit/issues/26) | Authentication/migration | [PR #32](https://github.com/Datakung/toktickit/pull/32): all four findings answered and corrected in f5f21ba. Phanuwit re-reviewed, approved and merged on 2026-09-15. |
| [#27](https://github.com/Datakung/toktickit/issues/27) | User management | [PR #33](https://github.com/Datakung/toktickit/pull/33): Phanuwit [approved `5ed6a54`](https://github.com/Datakung/toktickit/pull/33#pullrequestreview-5219828249) and merged as `b9e23f3` on 2026-09-16. |
| [#28](https://github.com/Datakung/toktickit/issues/28) | Staff queue | [PR #34](https://github.com/Datakung/toktickit/pull/34): Phanuwit reviewed and merged as `bdca390` on 2026-09-25. |
| [#29](https://github.com/Datakung/toktickit/issues/29) | Ticket operations/communication | Local implementation, automated verification and author manual acceptance recorded in tests.md; commits, PR and peer review pending. |
| [#30](https://github.com/Datakung/toktickit/issues/30) | Quality/release | Pending |

## Received contract review (completed)

Phanuwit [requested changes](https://github.com/Datakung/toktickit/pull/31#pullrequestreview-5187299201) on baseline `9b1ecde`. Issue #25 moved to Fixing per Pitchai. Review was documentation-only; no runtime tests ran, and Phanuwit stated the original labsheet was unavailable, so he did not independently confirm full assignment compliance.

| Finding | Correction | Reply status |
|---|---|---|
| [Requester status continuity](https://github.com/Datakung/toktickit/pull/31#discussion_r3996940079) | All eight Requester status values, exact labels, preserved query/envelope and planned validation/regression tests. | Answered before re-review |
| [Terminal guards](https://github.com/Datakung/toktickit/pull/31#discussion_r3996940081) | RESOLVED/CLOSED/CANCELLED explicitly locked; errors, UI guards and automatic-unassignment exception defined across all eight states. | Answered before re-review |
| [Stale resolution indication](https://github.com/Datakung/toktickit/pull/31#discussion_r3996940089) | Expected version, conflict precedence, refreshed-repeat semantics, returned state and delayed-request/reopening tests. | Answered before re-review |

## Received authentication review (corrections prepared)

Phanuwit reviewed `26c3417` on 2026-09-15 and independently passed 109 backend tests, 61 client tests and both builds. His three additional component checks failed, and a malformed cookie terminated his temporary server. He did not independently rerun browser tests.

| Finding | Correction and regression evidence |
|---|---|
| [Malformed cookie crash](https://github.com/Datakung/toktickit/pull/32#discussion_r4011347611) | Invalid encoded cookies are ignored. Session parsing is inside error handling; async auth routes forward rejected promises to a safe handler. API tests verify malformed cookies, subsequent health requests and a failed logout database operation. |
| [False sign-out success](https://github.com/Datakung/toktickit/pull/32#discussion_r4011347617) | Failed revocation keeps the account visible with failure feedback and retry. Component tests cover network/500 failures; browser tests abort logout, reload the real session, retry successfully and reload the login screen. |
| [Normal password-change route](https://github.com/Datakung/toktickit/pull/32#discussion_r4011347620) | Every role has a Change password action and direct route; initial credentials remain gated. Component tests cover all roles; the browser changes a normal Requester's password and signs in with it. |
| [Expired session handling](https://github.com/Datakung/toktickit/pull/32#discussion_r4011347625) | Protected 401 responses clear CSRF and authenticated state and return to login without logout. Tests distinguish 403 errors and cover Back navigation; a browser test revokes the session through a second real login. |

Reply/approval status: Phanuwit verified the four author replies and approved f5f21ba, then merged PR #32 on 2026-09-15. He independently passed 111 backend tests, 75 client tests (serial rerun), both builds and 17 browser tests, including the malformed-cookie process reproduction. His first parallel client run had an inherited focus-assertion failure; Issue #27 changes that assertion to wait for the focus effect, as he suggested.

## Received Administrator review (completed)

Phanuwit reviewed exact revision `5ed6a54` with no blocking findings and approved it on 2026-09-16. His independent isolated run passed 123 backend tests, 83 serial client tests, 21 Chromium scenarios and both production builds. He explicitly checked authorization/CSRF, normalized uniqueness, strict validation, conflicts, Administrator invariants, transactional revocation/unassignment, migration and responsive user-management flows. He also confirmed that queue/status/assignment work remained correctly scoped to Issues #28–#29. Phanuwit then merged PR #33 into `lab3-staging`; this approval is evidence for Issue #27 only, not pre-approval of Issue #28.

## Partner review links

Pending actual partner PRs. Record useful review comment, partner response, Pitchai approval and reviewer merge with direct links. Do not copy Lab 2 reviews as Lab 3 evidence or invent reciprocal activity.

## Workflow evidence

Feature PRs target lab3-staging; release targets main. PR author answers findings; reviewer formally approves and merges. Record changes-requested and re-review briefly with links. Board completion and release approval remain pending. Final screenshots must show actual completed state.
