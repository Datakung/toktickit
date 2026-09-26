# Lab 3 Peer Review Evidence

Status: Issues #25–#29 were peer-approved and merged into `lab3-staging`. Issue #30 quality/release verification is in progress; its quality and release PRs, final-main checks and PDF are not complete.

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
| [#29](https://github.com/Datakung/toktickit/issues/29) | Ticket operations/communication | [PR #35](https://github.com/Datakung/toktickit/pull/35): [changes requested](https://github.com/Datakung/toktickit/pull/35#pullrequestreview-5320189640), corrections in `a522dc6`/`10dfbed`, [approved by Phanuwit](https://github.com/Datakung/toktickit/pull/35#pullrequestreview-5323222675), merged as `23ab582` on 2026-09-26 (Bangkok). |
| [#30](https://github.com/Datakung/toktickit/issues/30) | Quality/release | Integration/evidence work in progress on `feature/30-quality-release`; PR and approval pending. |

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

## Received Ticket operations review (completed)

Phanuwit [requested changes on PR #35](https://github.com/Datakung/toktickit/pull/35#pullrequestreview-5320189640). His isolated backend run passed 146 tests and both builds passed. He reported 85 client tests passed, 8 failed and 9 unhandled errors because older Ticket Detail fixtures did not mock the new communication read; his isolated requester-detail retry also failed. These results are reviewer findings, not approval.

| Finding | Author correction and regression evidence |
|---|---|
| [History after 20 entries](https://github.com/Datakung/toktickit/pull/35#discussion_r4106630226) | Both Public Comments and Internal Notes now request numbered 20-entry pages, show total/page controls and reload the last page after posting. Component regressions cover 21+ entries, posting and remounting. |
| [Stale Ticket response](https://github.com/Datakung/toktickit/pull/35#discussion_r4106630253) | The Staff Detail route remounts by Ticket ID, and the detail/action response handlers ignore obsolete requests. Regressions resolve old detail and action responses after navigation. |
| Existing client regressions | Lab 2 Ticket Detail and Attachment fixtures now mock the communication read. The complete client suite passes, including the isolated requester retry. |

Pitchai committed/pushed the corrections as `a522dc6` and `10dfbed`. Phanuwit [re-reviewed and approved](https://github.com/Datakung/toktickit/pull/35#pullrequestreview-5323222675): 97 submitted client tests plus three reviewer regressions passed (100/100), and the client build/whitespace checks passed. He explicitly did not rerun browser E2E on the correction. The unchanged server revision had passed his earlier 146-test isolated run and build. PR #35 then merged into `lab3-staging` as `23ab582`.

## Reciprocal Lab 3 reviews on Phanuwit's repository

These are Pitchai's reviews of Phanuwit's Lab 3 work, separate from the received reviews above. All five partner PRs were merged by the author after review.

| Partner PR | Pitchai review and useful exchange | Final decision |
|---|---|---|
| [#31 contract](https://github.com/auto4496/toktickit/pull/31) | [Board-state correction requested](https://github.com/auto4496/toktickit/pull/31#discussion_r3995408941); [Phanuwit replied with the corrected workflow and documentation](https://github.com/auto4496/toktickit/pull/31#discussion_r3996923544). Documentation-only verification, no runtime-test claim. | [Approved](https://github.com/auto4496/toktickit/pull/31#pullrequestreview-5189566674), merged 2026-09-13. |
| [#32 authentication](https://github.com/auto4496/toktickit/pull/32) | [Stale-CSRF retry](https://github.com/auto4496/toktickit/pull/32#discussion_r4011398678) and [intended-route restoration](https://github.com/auto4496/toktickit/pull/32#discussion_r4011398684) requested; [Phanuwit answered CSRF](https://github.com/auto4496/toktickit/pull/32#discussion_r4011488804) and [route](https://github.com/auto4496/toktickit/pull/32#discussion_r4011489526) with regressions. | [Approved](https://github.com/auto4496/toktickit/pull/32#pullrequestreview-5206907193), merged 2026-09-15. |
| [#33 Staff workflow](https://github.com/auto4496/toktickit/pull/33) | [Lost-response pagination/duplicate-post risk](https://github.com/auto4496/toktickit/pull/33#discussion_r4023073618) requested; [Phanuwit replied with the recovery fix and tests](https://github.com/auto4496/toktickit/pull/33#discussion_r4023585808). | [Approved](https://github.com/auto4496/toktickit/pull/33#pullrequestreview-5220033518), merged 2026-09-16. |
| [#34 user management](https://github.com/auto4496/toktickit/pull/34) | [Unsaved-edit navigation guard](https://github.com/auto4496/toktickit/pull/34#discussion_r4060222962) and [ambiguous success assertion](https://github.com/auto4496/toktickit/pull/34#discussion_r4060222970) requested; [Phanuwit replied on navigation](https://github.com/auto4496/toktickit/pull/34#discussion_r4072766062) and [test timing](https://github.com/auto4496/toktickit/pull/34#discussion_r4072767621). | [Approved](https://github.com/auto4496/toktickit/pull/34#pullrequestreview-5279498891), merged 2026-09-22. |
| [#35 integration](https://github.com/auto4496/toktickit/pull/35) | Independent integration review reported 389 tests, 17 browser journeys, two builds and 109 matching screenshot checksums; no blocking finding. Remaining final-main/PDF work was reserved for Issue #30. | [Approved](https://github.com/auto4496/toktickit/pull/35#pullrequestreview-5321011435), merged 2026-09-26 (Bangkok). |

## Workflow evidence

Feature PRs target lab3-staging; release targets main. PR author answers findings; reviewer formally approves and merges. Record changes-requested and re-review briefly with links. Board completion and release approval remain pending. Final screenshots must show actual completed state.
