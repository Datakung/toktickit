# Lab 3 AI Use and Reflection

Status: Initial planning record, 2026-09-12. Add real implementation/review interactions as they happen.

Agent used: OpenAI Codex. Model identification for this draft session: GPT-6 (per session configuration); record the exact selectable model label used for subsequent implementation sessions before submission.

## Selected key prompts

| # | Prompt (summarised) | What I did with the result |
|---|---|---|
| 1 | Read the Lab 3 sheet and explain how it extends our existing project. | Reviewed authentication, role permissions, migration, Staff operations and Administrator scope before starting. |
| 2 | Propose a reasonable Issue count, then consolidate the roadmap to around six Issues. | Requested six groups instead of eight, keeping feature tests and documentation inside each implementation Issue. |
| 3 | Prepare a dedicated agent review checklist and reusable Issue descriptions. | Kept the internal checklist outside the repository and separate from required submission documents. |
| 4 | Create the planned GitHub Issues for me. | Authorized creation; the agent checked for duplicates, created #25-30, and verified their Backlog status. |
| 5 | Check the peer review on PR #31 and address the findings after moving the Issue to Fixing. | Accepted the three concrete ambiguities: inherited status filtering, undefined terminal guards, and delayed resolution requests after reopening. The contract, UI/API rules and planned regressions were corrected together; implementation and re-review remain pending. |
| 6 | Continue Issue #26 after Docker is ready, then commit, push, and open a PR for Phanuwit. | Implemented the preserved-data User migration, credential provisioning, cookie sessions, CSRF, throttling, mandatory password change, role routing, and removal of trusted requester headers. I retained a compatibility path only inside isolated historical tests, rewrote browser regressions to use real sessions, and required full API/UI/build/E2E evidence before opening review. |

| 7 | Read Phanuwit's authentication review and fix the four findings with regression evidence. | Accepted the malformed-cookie crash, misleading logout, missing normal password-change route and expired-session handling findings. Added API, component and real-session browser regressions; passing existing tests had not covered these failure paths. |

| 8 | Continue to Administrator user management after Phanuwit merges authentication; leave commits and pushes for me. | Implemented the approved account scope and tested access, duplicate emails, stale versions, concurrent last-Admin changes, session revocation and preserved Ticket history. Browser testing caught a focus-restoration bug; the agent corrected it before handing over manual testing and Git commands. |

| 9 | Add Active/Inactive filtering, move Change password above the signed-in identity, and align account actions. | Explicitly extended the original role-only filtering scope after checking the contract. Updated API validation, combined-filter tests, responsive browser checks and documentation rather than treating the screenshot preference as an existing requirement. |

| 10 | After Phanuwit merged user management, continue with the next Issue and leave Git actions for me. | Implemented the shared Staff queue within the approved Issue #28 boundary, including all eight inherited statuses, strict combined queries, role enforcement, responsive table/cards, realistic isolated browser fixtures and preserved Requester status behavior. Kept Staff-detail mutations explicitly deferred to Issue #29. |

Ten actual selected prompts are now recorded. Do not add routine follow-ups; retain only these materially useful interactions.

## My Reflection

Draft for Pitchai to revise in his own words: Specifying six Issues made the planning request clearer, but the larger authentication and Ticket operations groups still need focused commits and review. I need to state scope, expected evidence and approval boundaries carefully, and check written requirements when sample screenshots contain excluded features. Implementation corrections and lessons will be added only after they occur.
