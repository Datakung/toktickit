# Lab 2 AI Use and Reflection

**LLM/agent used:** OpenAI Codex

## Selected key prompts (6–10)

| # | Prompt (summarised) | What I did with the result |
|---|---|---|
| 1 | Read the complete Lab 2 labsheet and the TA's new PR rules, then create a persistent review checklist before starting. | I approved storing a private working checklist outside the repository so `main` remained untouched. I used it to enforce specification-first work, exact Kanban transitions, explicit PR-to-Issue linking, responses to comments, and reviewer-performed merges. |
| 2 | Propose a Lab 2 roadmap and a manageable Issue decomposition covering specifications, data, APIs, screens, tests, responsive evidence, and release integration. | I reviewed the proposed six-Issue sequence rather than creating Issues immediately. I kept the specification first and required every later feature to include its own planned tests and evidence. |
| 3 | Check the proposed Issue plan for flaws against the PDF and TA clarification. | The review found ambiguous Attachment ownership, an overly broad foundation Issue, unclear release completion, and unreliable automatic Issue closing on a non-default PR target. I approved the revised boundaries and manual link verification after those problems were corrected. |
| 4 | Provide exact GitHub Issue bodies and verify each card's Project and Backlog state before implementation. | I created Issues #11–#16 manually from the reviewed text. When Issue #14 had a blank Project status, I corrected it to Backlog before continuing. |
| 5 | Explain the complete Lab 2 roadmap from the PDF, including what is explicitly excluded. | I compared the roadmap with the labsheet and confirmed that the increment includes temporary Requester context, Create Ticket, My Tickets, Detail, Attachments, responsive UI, tests, review, and nine-part evidence while excluding authentication and IT Staff scope. |
| 6 | Propose the unresolved product, data, API, ownership, validation, pagination, and Attachment decisions before drafting documentation. | I reviewed and approved the recommended decisions, including `sessionStorage`, the development header, Ticket Number format, validation limits, safe ownership `404`, query defaults, separate Attachment uploads, compensation, and soft-removal behavior. |
| 7 | Draft a concise engineering contract and planned-test matrix with numbered requirements and complete acceptance-criterion traceability, without implementing product code. | I inspected the documents, approved the resolved decisions, and required an automated cross-check of every `FR`, `BR`, and `AC`. The audit found that the UI specification did not explicitly print the 5 MiB file limit, so I corrected it before approving the documents. |

## My Reflection

My prompts became more effective when I required the agent to separate fixed labsheet rules from decisions that needed my approval, and when I supplied the current branch, Issue, and TA workflow constraints. A broad first decomposition hid overlapping Attachment scope and an incomplete release gate, so I requested a critical audit and rejected the original boundaries until those problems were corrected. Reviewing the documents and traceability also caught a missing visible file-size note, reinforcing that a detailed AI draft is not proof of completeness until I verify it myself.
