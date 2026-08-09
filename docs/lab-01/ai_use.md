# Lab 1 - AI Use and Reflection

**LLM/agent used:** OpenAI Codex

## Selected key prompts

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Read the Lab 1 PDFs and starter scaffold, then explain what I have to do. | I used the response to identify the four Issues, required application behavior, tests, Git workflow, and final PDF evidence. |
| 2 | Tell me which options to choose when creating the GitHub repository. | I created a private `toktickit` repository without a generated README, `.gitignore`, template, or license because those files were supplied in the scaffold. |
| 3 | Re-check whether the supplied starter scaffold belongs in the initial `main` branch or in Issue 1. | I compared the lab sheet, cheat sheet, and TODOs in the scaffold before keeping the supplied code as the baseline on `main`. |
| 4 | Guide me through the lab interactively and explain what each Git and GitHub step does. | I created and verified `lab1-staging`, the Project board, its six workflow statuses, and the four Issues while checking the purpose of each step. |
| 5 | Explain how to start Issue 1 with the correct Project status and feature branch. | I moved the Issue through the planning states and created `feature/1-project-foundation` from the clean baseline. |
| 6 | Explain when each documentation file should be completed and maintain the files while I learn the implementation steps. | I started the README and evidence records early, while keeping unverified tests, reviews, and personal details marked as pending. |
| 7 | Check the repository after dependency installation and verify the Issue 1 foundation. | I reviewed the lockfiles and ignored folders, then used builds, tests, and startup probes to verify the scaffold. This exposed and corrected TypeScript build-output problems before they were committed. |

## Reflection

My prompts became more useful when I asked the agent to pause, re-read the
course materials, and explain each workflow change before performing it. I
challenged the initial branch-placement advice because the starter scaffold
covered several Issues; after comparing the requirements with the scaffold
TODOs, I kept the supplied code as the baseline on `main`. I will continue to
review the generated commands, documentation, code, and test evidence before
submitting them.
