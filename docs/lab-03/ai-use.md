# Lab 3 AI Use and Reflection

Status: Evolving Lab 3 interaction record through Issue #30; final-main and PDF reflection check remain pending.

Agent used: OpenAI Codex. The author should verify the exact model label shown in the app before submission rather than infer it from this document.

## Selected key prompts

| # | Prompt (summarised) | What I did with the result |
|---|---|---|
| 1 | Read the Lab 3 sheet and explain how it extends our existing project. | Reviewed authentication, role permissions, migration, Staff operations and Administrator scope before starting. |
| 2 | Propose a reasonable Issue count, then consolidate the roadmap to around six Issues. | Requested six groups instead of eight, keeping feature tests and documentation inside each implementation Issue. |
| 3 | Prepare a dedicated agent review checklist and reusable Issue descriptions. | Kept the internal checklist outside the repository and separate from required submission documents. |
| 4 | Create the planned GitHub Issues for me. | Authorized creation; the agent checked for duplicates, created #25-30, and verified their Backlog status. |
| 5 | Check the peer review on PR #31 and address the findings after moving the Issue to Fixing. | Accepted the three concrete ambiguities: inherited status filtering, undefined terminal guards, and delayed resolution requests after reopening. The contract, UI/API rules and regression plan were corrected together; Issue #29 now implements those reviewed decisions. |
| 6 | Continue Issue #26 after Docker is ready, then commit, push, and open a PR for Phanuwit. | Implemented the preserved-data User migration, credential provisioning, cookie sessions, CSRF, throttling, mandatory password change, role routing, and removal of trusted requester headers. I retained a compatibility path only inside isolated historical tests, rewrote browser regressions to use real sessions, and required full API/UI/build/E2E evidence before opening review. |

| 7 | Read Phanuwit's authentication review and fix the four findings with regression evidence. | Accepted the malformed-cookie crash, misleading logout, missing normal password-change route and expired-session handling findings. Added API, component and real-session browser regressions; passing existing tests had not covered these failure paths. |

| 8 | Continue to Administrator user management after Phanuwit merges authentication; leave commits and pushes for me. | Implemented the approved account scope and tested access, duplicate emails, stale versions, concurrent last-Admin changes, session revocation and preserved Ticket history. Browser testing caught a focus-restoration bug; the agent corrected it before handing over manual testing and Git commands. |

| 9 | Add Active/Inactive filtering, move Change password above the signed-in identity, and align account actions. | Explicitly extended the original role-only filtering scope after checking the contract. Updated API validation, combined-filter tests, responsive browser checks and documentation rather than treating the screenshot preference as an existing requirement. |

| 10 | After Phanuwit merged user management, continue with the next Issues and leave Git actions for me. | Implemented the Issue #28 shared Staff queue, then Issue #29 Staff detail operations, optimistic concurrency, Requester resolution indication, Public Comments, private Internal Notes and Staff Attachment download. Focused browser testing exposed a test timing race after sign-in; waiting for the role destination corrected the evidence without changing product behavior. |

Ten actual selected prompts are now recorded. Do not add routine follow-ups; retain only these materially useful interactions.

PR #35 review follow-up: Phanuwit reproduced inaccessible communication entries after the first 20, a stale Staff Ticket response after navigation, and broken older client fixtures. The agent treated these as correctness findings, added paged histories and request-generation guards, repaired the mocks, and reran full suites. The earlier green author run did not reveal the missing mocks in the reviewer's environment; independent review changed the regression scope. Phanuwit re-reviewed, approved and merged the correction.

Issue #30 continuation: after the user asked to move on, the agent verified the PR #35 merge, read the quality/release Issue and original handout, synchronized `lab3-staging`, and built an isolated screenshot workflow. It recorded branch-level tests and screenshot provenance separately from the still-pending final-main PDF, and verified reciprocal review links from Phanuwit's PRs instead of inventing participation. The author retains commit/push and final visual-sign-off decisions.

PR #36 review follow-up: Phanuwit's independent browser run found a strict locator race that the author's green run missed: loading Public Comments and Internal Notes shared the same status role as the successful claim message. The agent scoped all three operation-success assertions and held both communication responses open during a regression run to reproduce the timing deterministically. The focused evidence test and complete browser suite passed locally; the author still needs to commit/push the correction and obtain peer re-review.

## My Reflection

Draft for Pitchai to revise in his own words: Specifying six Issues made the planning request clearer, but the larger authentication and Ticket operations groups still required focused commits and review. I learned to translate ambiguous workflow ideas into an explicit transition matrix, protect stale updates with versions, and prove privacy through direct API denial rather than relying on hidden UI. Browser evidence also reminded me to distinguish a test synchronization defect from a product defect. I still need to complete peer review and final-main release evidence before claiming the lab is finished.
