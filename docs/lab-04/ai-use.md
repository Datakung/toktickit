# Lab 4 AI Use and Reflection

Status: Interaction record updated 2026-10-07 through accepted Issue #40, published
Issue #41 UI and its requested test-fixture correction. Correction publication,
peer re-review/acceptance, final release and author-approved reflection remain
pending. Extend from actual sprint work.

Tool: OpenAI Codex desktop. Exact selected model identifiers have not been
independently recorded for these turns; confirm the visible selection before
final submission. Do not infer one exact model for the entire sprint from the
app name or prior labs. Record any verified model changes.

## Selected real prompts so far

| # | Prompt | Use of the result |
|---|---|---|
| 1 | "New lab here." with SE+Lab+4.pdf | Read the full sheet, inspected its illustrations/rubric and compared it with the reviewed Lab 3 schema and workflow. |
| 2 | "Ok" after the six-Issue proposal and drafting next step | Authorized local Issue/contract drafts. Proposed explicit action lifecycle, performer/assignee distinction, append-only revisions, current-cycle resolution gate, preserving migration and exact dashboard queries before implementation. |
| 3 | "Good make sure it goes with the PDF I gave you and cover some cases" | Rechecked the complete labsheet and grading requirements, added CASE-01-25 and clarified action ordering, live dashboard drill-down, database types and retry/actor isolation. |
| 4 | "Okay start" | Checked for duplicates, created Issues #39-44 on GitHub and added them to the project Backlog; prepared local staging/Issue #39 branches and moved the contract into the repository before product coding. |
| 5 | "Yeah" after the agent explained Phanuwit's PR #45 findings and asked to update both | Authorized contract corrections: separate field/assignment saves with partial-success and exact-retry behavior, whole-cycle backend checklist summary, CASE-26/27 and factual review recording. Phanuwit later approved ff97405 and merged PR #45 before product implementation. |
| 6 | "Docker ready" with the prepared feature/40-actions-foundation branch output | Authorized the next Issue's implementation/testing. Added preserving schema/migration, Action APIs, immutable history, retry receipts, safe account unassignment and repeatable demo fixtures; verified migration rollback/real isolated restore, concurrent writes and full regression. Fixed issues exposed by tests, without migrating/seeding development. |
| 7 | "On to the next" after PR #46 was reviewed/merged | Started Issue #41 from the peer-merged staging commit. Wrote failing component tests before the shared Action screen; implemented separate saves, confirmations, read-only history and exact retries. Real-browser tests exposed timestamp precision, stale completed Result and Requester deep-link bugs; visual inspection exposed a mobile caption issue. Corrected these and reran tests/evidence without changing development data. |
| 8 | "Yes fix them" after Phanuwit's PR #47 Changes requested review | Added typed Action/assignee mocks in legacy detail fixtures and a test-only guard that exposed unexpected real fetches before the fix. Kept existing cases/assertions, synchronized mutation summary versions and ensured the navigation race actually sends a claim. Reran all 130 client tests in default and serial modes and the typed client build; no product/database change or peer approval claimed. |

The final submission requires 6-10 selected actual key prompts. Eight are
recorded so far. Do not invent future prompts. Add meaningful
implementation/review/testing interactions later and keep the total within 6-10.

## Specification-agent and coding-agent use

The agent supported interpretation, contract drafting and corrections to actual
independent peer feedback on PR #45, followed by Issue #40 coding and testing.
Validation/API tests were written alongside the implementation; initial endpoint
tests failed before handlers existed. Seed and test-harness defects exposed during
verification were corrected and rerun. Contract acceptance is recorded separately
from product review: #40 accepted, #41 pending. The new screen's definite failure
feedback is tested separately from unknown-response recovery; browser response
loss occurs after a real API commit and replays the original receipt once.
The original request is journaled in browser session storage before submission;
an uncertain save survives a page reload with its original payload/key. Journals
are scoped to the current user/Ticket and cleared on sign-out/authentication loss.
The author committed/pushed the tested UI/evidence as cd5aa76 and docs as 3addd43
in PR #47. Real peer review exposed environment-dependent legacy fixture reads;
the agent prepared a test-only correction and recorded actual passing reruns.
The author still needs to commit/push that correction and obtain re-review.
Exact branch results and the existing dependency
audit finding are in [tests.md](tests.md); final-main results remain pending.
The handout's field list and grading rubric differ in detail; proposed choices
are explicitly identified rather than attributed to a nonexistent sheet rule.

## My Reflection

Pending author reflection after implementation and review. Ask the author to
review or supply the final reflection before using it in the submission. Prior
approval of the Lab 3 reflection does not approve a future Lab 4 reflection.
