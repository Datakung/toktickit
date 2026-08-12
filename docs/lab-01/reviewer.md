# Lab 1 - Peer Review Evidence

| Role | Name | Student ID | GitHub |
|------|------|------------|--------|
| Author | Pitchai Chadchuangchot | 67070501068 | [@Datakung](https://github.com/Datakung) |
| Peer partner | Phanuwit Butchari | 67070501070 | [@auto4496](https://github.com/auto4496) |

- **My repository:** [Datakung/toktickit](https://github.com/Datakung/toktickit)
- **Partner repository:** [auto4496/toktickit](https://github.com/auto4496/toktickit)
- **My GitHub Project:** [TokTickIT Lab 1 Kanban](https://github.com/users/Datakung/projects/1)

## Pull Requests I authored and Phanuwit reviewed

| PR | Useful review interaction | Outcome |
|----|---------------------------|---------|
| [PR #5 - Project foundation](https://github.com/Datakung/toktickit/pull/5) | Phanuwit requested proof that the model-free Prisma scaffold could install, build, and start in a clean environment. I [provided fresh-clone commands and results](https://github.com/Datakung/toktickit/pull/5#issuecomment-5232776042). He found that disabled lifecycle scripts in his review environment caused the reported failure. | Concern resolved, approved, and merged into `lab1-staging`. |
| [PR #6 - Health check](https://github.com/Datakung/toktickit/pull/6) | Phanuwit verified the health endpoint, Supertest coverage, and UI states. He suggested using `Closes #2`; I [explained](https://github.com/Datakung/toktickit/pull/6#issuecomment-5236709861) that the PR targeted non-default `lab1-staging`, so I would close the Issue manually after merging. | Approved and merged into `lab1-staging`. |
| [PR #7 - Category model and seed](https://github.com/Datakung/toktickit/pull/7) | Phanuwit verified the Prisma model, migration, unique constraint, four required seed values, repeatable upsert, and ignored credentials. No correction was requested. | Approved and merged into `lab1-staging`. |
| [PR #8 - Category API and UI](https://github.com/Datakung/toktickit/pull/8) | Phanuwit verified the database-backed API, Supertest coverage, and React loading, success, and failure states. He noted two outdated README statements; I [updated them and responded](https://github.com/Datakung/toktickit/pull/8#issuecomment-5253640370). | Approved and merged into `lab1-staging`. |

## Phanuwit's Pull Requests I reviewed

| PR | Useful review interaction and follow-up | Outcome |
|----|------------------------------------------|---------|
| [PR #5 - Project foundation](https://github.com/auto4496/toktickit/pull/5) | I requested the required `server/prisma/` and `server/tests/lab-01/` structure plus real database-connection evidence. After Phanuwit moved the files, I identified duplicate root-level copies. He responded through commits [`5010d35`](https://github.com/auto4496/toktickit/commit/5010d35378513124314d3d0f49019bc25b9410ee) and [`6e6302d`](https://github.com/auto4496/toktickit/commit/6e6302d5a9f44b4519e0f61ff048bd4959b49412), correcting the structure and removing the duplicates. I re-ran the relevant checks and approved the Issue 1 scope. | Changes requested, corrections verified, approved, and merged. |
| [PR #6 - Health check](https://github.com/auto4496/toktickit/pull/6) | I first [requested](https://github.com/auto4496/toktickit/pull/6#issuecomment-5231556572) an updated branch base, preservation of Issue 1 files, and the exact service name. Phanuwit [corrected those items](https://github.com/auto4496/toktickit/pull/6#issuecomment-5232730976). I then found that `VITE_API_URL` was not loaded correctly; he [fixed the root environment configuration](https://github.com/auto4496/toktickit/pull/6#issuecomment-5233029379). I verified commit `58ce1de`, both builds, and all tests before approving. | Changes requested, corrections verified, approved, and merged. |
| [PR #7 - Category model and seed](https://github.com/auto4496/toktickit/pull/7) | I requested changes because the Prisma commands did not load the documented root `.env`. Phanuwit [responded](https://github.com/auto4496/toktickit/pull/7#issuecomment-5252997073) by loading it through `dotenv-cli`, removing the temporary `server/.env`, and re-running migration, seed, build, and tests. I verified commit `040e3cc`, including the repeatable seed and environment flow, and approved. | Changes requested, correction verified, approved, and merged. |
| [PR #8 - Category API and UI](https://github.com/auto4496/toktickit/pull/8) | I [reviewed commit `a7357bf`](https://github.com/auto4496/toktickit/pull/8#pullrequestreview-4913008861) and verified that the PR followed Issue 3, queried categories through Prisma, returned ID and name predictably, handled database failures, and rendered API-provided loading, success, and error states. Both builds and five database-independent tests passed. I disclosed that I could not rerun the database-backed test because PostgreSQL was unavailable in that review environment. | No correction requested; approved and merged. |

## Kanban completion evidence

The [TokTickIT Lab 1 Kanban](https://github.com/users/Datakung/projects/1) was
verified on 2026-08-11 with all four Issue cards in **Done**.

| Issue | Final status |
|-------|--------------|
| [Issue #1 - Project foundation](https://github.com/Datakung/toktickit/issues/1) | Done |
| [Issue #2 - Health check](https://github.com/Datakung/toktickit/issues/2) | Done |
| [Issue #3 - Category model and seed](https://github.com/Datakung/toktickit/issues/3) | Done |
| [Issue #4 - Category API and UI](https://github.com/Datakung/toktickit/issues/4) | Done |
