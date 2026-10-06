# Lab 4 AI Use and Reflection

Status: Interaction record updated 2026-10-05 through local Issue #40 implementation
and verification. Its implementation peer review, final release and author-approved
reflection remain pending. Extend from actual work as the sprint progresses.

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

The final submission requires 6-10 selected actual key prompts. Six are
recorded so far; do not invent future prompts to fill the table. Add meaningful
implementation/review/testing interactions later and keep the total within 6-10.

## Specification-agent and coding-agent use

The agent supported interpretation, contract drafting and corrections to actual
independent peer feedback on PR #45, followed by Issue #40 coding and testing.
Validation/API tests were written alongside the implementation; initial endpoint
tests failed before handlers existed. Seed and test-harness defects exposed during
verification were corrected and rerun. Contract acceptance is recorded separately
from pending product review. Exact branch results and the existing dependency
audit finding are in [tests.md](tests.md); final-main results remain pending.
The handout's field list and grading rubric differ in detail; proposed choices
are explicitly identified rather than attributed to a nonexistent sheet rule.

## My Reflection

Pending author reflection after implementation and review. Ask the author to
review or supply the final reflection before using it in the submission. Prior
approval of the Lab 3 reflection does not approve a future Lab 4 reflection.
