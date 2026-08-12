# Lab 1 - AI Use and Reflection

**LLM/agent used:** OpenAI Codex

## Selected key prompts (6–10)

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Review the supplied Lab 1 materials and identify all implementation and submission requirements. | I converted the first response into a checklist, then re-read the lab sheet and later TA clarification to add missing approval, Kanban, documentation, and PDF evidence requirements. |
| 2 | Explain the repository configuration options and determine where the supplied scaffold belongs in the Git history. | I first used the configuration explanation to avoid generated files, then asked a follow-up when the scaffold placement was unclear. After comparing its unfinished sections with the lab sheet, I kept it as the initial `main` baseline. |
| 3 | Guide the work Issue by Issue, explain each command, and verify the terminal output I provide. | I ran each command myself and returned `git status`, diffs, builds, tests, and errors. We used those results to choose the next step instead of assuming that an earlier command had succeeded. |
| 4 | Re-check whether category behavior proposed during Issue 2 actually belongs to Issue 4. | I challenged the proposed scope and compared it with both Issues' acceptance criteria. I rejected the early category work, kept Issue 2 limited to health and Online/Offline behavior, and implemented the category flow in Issue 4. |
| 5 | Explain how to test from a clean clone and diagnose the port-3000 startup error. | I repeated installation, build, and startup checks in a temporary clean clone. When port 3000 was occupied, I supplied the exact error and process information, identified the existing Node process, and completed the reproducibility check. |
| 6 | Re-read the Prisma requirements after client generation failed with a model-free schema. | I used the failure as evidence rather than immediately changing the scaffold. A follow-up comparison with the lab sheet confirmed that the model, migration, and repeatable seed belonged in Issue 3, after which I verified the generated SQL and database rows. |
| 7 | Confirm that each Issue satisfies its acceptance criteria before committing, pushing, and opening the PR. | At the end of each iteration, I checked the changed-file scope, test results, browser behavior, documentation, Issue checklist, branch target, and peer approval before proceeding. |
| 8 | Verify and summarize the useful review interactions from both GitHub repositories. | I compared the draft record with the live PR reviews and comments. This follow-up found additional reviews I had completed on my partner's PRs #5 and #6, so I added their requested changes, responses, fixes, and approvals to `reviewer.md`. |
| 9 | Audit the finished repository and documentation against the latest TA clarification and the four PDF submission sections. | I rechecked real approval states, Issue order, all-Done Kanban status, test-file locations, AI-use format, review evidence, and required screenshots before preparing the final documentation branch. |

## Reflection

My prompts became more effective when I specified the current Issue and branch,
quoted the relevant requirement, and supplied the exact file or terminal
output. Early broad prompts sometimes produced advice that crossed Issue
boundaries, so I corrected or rejected it and asked targeted follow-ups, such
as keeping category behavior out of Issue 2. This taught me to be more specific
and careful by stating the scope, constraints, and expected evidence in each
prompt, then independently verifying the resulting code, diffs, tests,
database state, and GitHub workflow.
