# Lab 1 - Peer Review Record

**Author:** Pitchai Chadchuangchot - 67070501068 - GitHub: @Datakung

**Peer reviewer:** Phanuwit Butchari - 67070501070 - GitHub: @auto4496

**Peer repository:** https://github.com/auto4496/toktickit

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| [PR #5](https://github.com/Datakung/toktickit/pull/5) | `feature/1-project-foundation` | Approved and merged into `lab1-staging` |
| [PR #6](https://github.com/Datakung/toktickit/pull/6) | `feature/2-health-check` | Approved and merged into `lab1-staging` |
| [PR #7](https://github.com/Datakung/toktickit/pull/7) | `feature/3-category-seed` | Approved and merged into `lab1-staging` |
| TODO | `feature/4-category-list` | Pending |

## Review evidence from my partner

**Reviewer comment I received:** On [PR #5](https://github.com/Datakung/toktickit/pull/5), Phanuwit requested changes because he believed a clean backend checkout could not build before the Prisma schema contained a model. He asked me to verify `npm ci`, `npm run build`, and `npm run dev` from a clean installation.

**How I responded:** I reproduced the review scenario in a fresh clone using Node v24.14.0 and npm 11.9.0. Installation, build, and startup succeeded, and the API returned the expected Issue 2 stub response. I posted the evidence in the PR and asked for re-review or the exact error and tool versions if the failure remained reproducible.

**Final outcome:** Phanuwit confirmed that his test environment had disabled dependency lifecycle scripts, approved PR #5, and the approved changes were merged into `lab1-staging`.

On [PR #6](https://github.com/Datakung/toktickit/pull/6), Phanuwit confirmed that the health API, Supertest coverage, and React Online/Offline behavior met Issue 2 and approved the PR. He suggested using `Closes #2`; I explained that GitHub ignores closing keywords when a PR targets the non-default `lab1-staging` branch, then manually closed Issue 2 after the approved merge.

On [PR #7](https://github.com/Datakung/toktickit/pull/7), Phanuwit verified the Prisma model, generated migration, repeatable seed, ignored credentials, and Issue 3 scope before approving the merge into `lab1-staging`.

## Pull Requests I reviewed for my partner

**Partner PR:** TODO - add the Pull Request link.

**My review comment:** TODO - add a real review comment.

**Partner's response:** TODO - record the partner's response or correction.

## Review checklist

- [x] My partner's name, student ID, and GitHub username are recorded.
- [ ] Every authored feature PR is linked.
- [ ] My partner approved the submitted PRs.
- [x] At least one received review comment and my response are recorded.
- [ ] At least one partner PR that I reviewed is linked.
- [ ] My review comment and my partner's response are recorded.
