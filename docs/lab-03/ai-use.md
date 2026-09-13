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

Six actual selected prompts are now recorded. Add only materially useful later review/implementation interactions, up to ten.

## My Reflection

Draft for Pitchai to revise in his own words: Specifying six Issues made the planning request clearer, but the larger authentication and Ticket operations groups still need focused commits and review. I need to state scope, expected evidence and approval boundaries carefully, and check written requirements when sample screenshots contain excluded features. Implementation corrections and lessons will be added only after they occur.
