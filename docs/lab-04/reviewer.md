# Lab 4 Peer Review Record

Status: Contract and foundation accepted in PRs #45/#46. Phanuwit approved
corrected Issue #41 head 0cf9e58 and merged PR #47 into lab4-staging as f4da089
on 2026-10-07. Issue #42 is Started on feature/42-ticket-workflow from that merge;
local implementation/evidence exists, but author acceptance, commits/push and
its own peer review remain pending. No reciprocal review is claimed.

Author: Pitchai Chadchuangchot, 67070501068, GitHub Datakung.
Expected peer: Phanuwit Butchari, 67070501070, GitHub auto4496.
Repository: https://github.com/Datakung/toktickit

## Review workflow

Six Issues were created on 2026-10-03 and linked to
[TokTickIT Individual Sprints](https://github.com/users/Datakung/projects/1):
#39 contract, #40 action foundation, #41 action UI, #42 Ticket workflow,
#43 dashboards and #44 quality/release. All were initially placed in Backlog.
Feature PRs target lab4-staging; final reviewed release targets main. Specifications
must be approved before product implementation. Normal commits/pushes are performed
by the author; the peer supplies actual review comments, approval and merge.

| Work group | Issue | PR/base | Review/author response/approval | State |
|---|---|---|---|---|
| Engineering contract | [#39](https://github.com/Datakung/toktickit/issues/39) | [#45](https://github.com/Datakung/toktickit/pull/45) / lab4-staging | Corrected ff97405; actual approval below | Merged d32c8cf |
| Action foundation | [#40](https://github.com/Datakung/toktickit/issues/40) | [#46](https://github.com/Datakung/toktickit/pull/46) / lab4-staging | Approved by auto4496 on 4795f38 | Merged a915812; Issue closed/Done |
| Action UI | [#41](https://github.com/Datakung/toktickit/issues/41) | [#47](https://github.com/Datakung/toktickit/pull/47) / lab4-staging | Corrected 0cf9e58; approval below | Merged f4da089; Issue closed |
| Ticket workflow | [#42](https://github.com/Datakung/toktickit/issues/42) | Pending / lab4-staging | Local implementation; not yet peer reviewed | Started |
| Dashboards | [#43](https://github.com/Datakung/toktickit/issues/43) | Pending / lab4-staging | Pending | Backlog |
| Quality/release | [#44](https://github.com/Datakung/toktickit/issues/44) | Pending / lab4-staging, then main | Pending | Backlog |

## Contract review questions

- Do proposed action state/assignment/performer semantics meet the rubric?
- Does immutable revision history reconcile action edits with append-only evidence?
- Are completed corrections, follow-up clearing, terminal locks and cycle rules clear?
- Does the resolution gate work for new/reopened Tickets without fabricating legacy data?
- Are metric predicates/date boundaries/zeroes and drill-down queries equivalent?
- Do migration/recovery/repeat-seed tests preserve previous records and credentials?
- Does every AC map to an actual planned test path and each work group include tests?

For each finding record a direct comment/review link, actual correction commit,
author reply link, reviewer verification and status. Do not prewrite statements
claiming independent reviewer testing or permission.

## PR #45 findings, response and acceptance

Phanuwit (auto4496) submitted Changes requested on e11ae78 on 2026-10-04.
He reported reviewing the seven documentation files against the supplied sheet
and inherited Lab 3 contracts/implementation, confirming the 16-AC/30-test-group
mapping, local links and whitespace check. He explicitly reported no Lab 4
runtime tests, builds, migrations or browser journeys for this docs-only review.

| Finding | Local correction prepared 2026-10-05 | Verification status |
|---|---|---|
| [P2: field/assignment save semantics](https://github.com/Datakung/toktickit/pull/45#discussion_r4178298231) | Keep initial assignment atomic on create; separate existing-action field and assignment controls/requests. Require authoritative version reload between explicit operations, preserve earlier success and reconcile uncertain assignment with its original payload/key. Align BR-09, API/UI and CASE-26. | Corrected ff97405; author replied; peer approved contract |
| [P3: paged resolution checklist](https://github.com/Datakung/toktickit/pull/45#discussion_r4178298235) | Define whole-cycle ResolutionGate counts with parent version/cycle and action page in one repeatable-read snapshot; UI never infers ready from one page or stale/unknown summary. Align BR-13, API/UI and CASE-27. | Corrected ff97405; author replied; peer approved contract |

P2 is blocking; P3 was identified by the reviewer as non-blocking. These are
documentation corrections; their implementation requires separate review.
Evidence: [original Changes requested review](https://github.com/Datakung/toktickit/pull/45#pullrequestreview-5406930778),
[correction commit ff97405](https://github.com/Datakung/toktickit/commit/ff974057417e42f91b3ba6a78699f4fa8acfd686),
[author reply](https://github.com/Datakung/toktickit/pull/45#issuecomment-5983103209),
and [Phanuwit's approval](https://github.com/Datakung/toktickit/pull/45#pullrequestreview-5416186064).
Approval was submitted 2026-10-05 14:34:36 UTC; merge followed at 14:37 UTC
as d32c8cf. This docs-only approval does not claim peer runtime testing.

## Issue #40 implementation review handoff

Branch feature/40-actions-foundation starts from approved staging d32c8cf.
Review the additive migration/constraints/immutable events, real actor attribution,
owned Requester reads, separate save contracts, optimistic versions, exact receipts,
account unassignment lock ordering and repeatable non-destructive demo seed.
Actual local verification: 182 server tests, 97 client tests, 31 earlier browser
scenarios, both builds, populated migration/rollback/backup restore and unchanged
development state during E2E. New action screens and formal Ticket gate are later
Issues. Server audit has an open moderate dependency finding; details in [tests.md](tests.md).
Implementation commit: [4920527](https://github.com/Datakung/toktickit/commit/4920527416236030f4eed4a5b8e32464f1370bb5).
Documentation commit: 4795f38. [PR #46](https://github.com/Datakung/toktickit/pull/46)
is explicitly linked to closed Issue #40; its Project item is Done.
[Phanuwit's approval](https://github.com/Datakung/toktickit/pull/46#pullrequestreview-5426230601)
was submitted on exact head 4795f38 at 2026-10-06 09:13:21 UTC. He reported no
actionable foundation defects, an independent build/Prisma/migration/restore/
seed/concurrency/immutable-history review in disposable PostgreSQL 17, and all
36 new tests passing. Three older Lab 3 tests timed out in his initial full run;
the three affected files passed all 23 tests when rerun sequentially with a
20-second timeout. His extra account-deactivation race test passed. He explicitly
did not independently run client/E2E checks. His test harness alone used a different
Docker container name; no production changes were reported. Peer merge followed
at 12:09:25 UTC as a915812. These statements report his actual review, not an
invented author run or approval of later UI/workflow/dashboard work.

## Issue #41 UI handoff

Branch feature/41-actions-ui starts from peer-merged staging a915812. Implementation
commit: cd5aa76005a83cecea67aaad3394729cddb6843c (2026-10-06); documentation
3addd437518e1573fa79dccf0e08ca7cf419dc0d. Both were pushed to PR #47. Review the
shared role-safe Action screen, exact nested deep links, independent saves,
Bangkok timestamp precision, actual performer confirmation, completed correction
reason, terminal/prior-cycle guards, paged audit history, stale/unknown-save
recovery and responsive cards. In particular, CASE-26 must not auto-chain saves
or repeat fields when assignment fails. Check saved-but-refresh-failed create
recovery and Requester direct mutation denial. See [tests.md](tests.md) and
the [feature screenshot provenance](../../artifacts/lab-04/screenshots/actions-taken/README.md).
Local verification on 2026-10-06: 182 server tests, 130 client tests, 36 browser
scenarios (5 new Action journeys), both builds, Prisma validate and unchanged
development data/uploads. Thirteen feature screenshots were captured and
representative desktop/mobile Staff/Requester images visually inspected by the
agent. Author visual acceptance is not yet recorded. Unknown retries retain
their original user/Ticket-scoped payload/key across a full browser reload;
confirmed-save refresh never creates again, and sign-out clears journals.
PR #47 explicitly Development-links Issue #41 and targets lab4-staging; linkage
was verified through closingIssuesReferences. This was the original handoff;
acceptance of the corrected head is recorded below.

### PR #47 requested correction, 2026-10-07

[Phanuwit's Changes requested review](https://github.com/Datakung/toktickit/pull/47#pullrequestreview-5438725606)
was submitted by auto4496 on exact head 3addd43 at 06:58:40 UTC (13:58:40 Bangkok).
His [P2 finding](https://github.com/Datakung/toktickit/pull/47#discussion_r4203986376)
identifies unmocked real Action reads after mounting ActionsTaken in legacy
Requester detail fixtures. Responses from localhost:3000 could be a non-ActionPage,
causing render errors and losing the attachment/communication screen assertions.

He reported 33/33 new component/style checks and 5/5 new Chromium journeys passing,
plus both builds and whitespace checks. His full client run passed 121/130 with
9 failures/9 uncaught errors across 4 files, not merely timeouts. A serial check
of AttachmentSection and RequesterCommunication passed 1/12 at head versus 12/12
at base with the same dependencies/environment. His browser checks used disposable
PostgreSQL 17 databases and an unchanged reviewer baseline/upload fingerprint,
not the author's development database. He did not rerun all 182 backend tests
or all 31 earlier browser journeys.

Author authorized correction with "Yes fix them". Six legacy detail fixture files
now use a shared typed empty ActionPage matching parent version/current cycle;
Staff navigation also mocks assignees and supports numeric/string Ticket reads.
Mutation fixtures advance the Action summary version with the parent. The claim
navigation regression waits for an enabled control and asserts the request was
sent before navigation, retaining its late-response assertions. The Requester
private-Notes spy is installed before mounting, rather than after the read could
already occur. Original test cases/assertions remain; none are skipped.

A test-only fetch guard rejects and fails any unexpected network call in these
six files. It exposed missing Action/assignee reads before correction; cleanup
and mock restoration occur even when the guard fails. Full default and serial
client results and the typed client build are in [tests.md](tests.md).
Production source, permissions, database/uploads and screenshots are unchanged.
The author committed/pushed the correction as
[0cf9e58](https://github.com/Datakung/toktickit/commit/0cf9e583c94779ef6f1c346becc019b31281208e).
The original local runs above are distinct from Phanuwit's subsequent independent
verification below; no author-reply link is invented.

### PR #47 acceptance, 2026-10-07

[Phanuwit's actual approval](https://github.com/Datakung/toktickit/pull/47#pullrequestreview-5439057032)
was submitted on exact head 0cf9e58 at 07:34:30 UTC (14:34:30 Bangkok).
He reported the full 18-file client suite passing 130/130 with no uncaught errors
and no real fetches in the six guarded files; the focused serial legacy pair
passed 12/12, compared with 1/12 on the old head and 12/12 at base. His client
build and whitespace checks passed. This is a test/documentation-only fix;
his prior review had passed 33 new component/style checks, five feature browsers
and both builds. Those browser/backend checks were not repeated for this
test-only correction; no all-182-backend/all-31-earlier-browser rerun is claimed. His approval covers #41, not workflow/dashboard/release.
Peer merge followed at 07:35:15 UTC (14:35:15 Bangkok) as
[f4da089](https://github.com/Datakung/toktickit/commit/f4da089686f77ad67cd9891143b62f26d15b6bf1).
Issue #41 is closed. No reciprocal review is implied.

## Issue #42 local review handoff

User authorized the next Issue after confirming the merge. Branch
feature/42-ticket-workflow starts from f4da089; the existing Issue #42 project
card was moved from Backlog to Started, not Done. Review all eight-status edges,
each whole-cycle gate, cancellation with active work, transactional history
rollback, current-session recheck, resolution date, reopen cycles and races with
action/account mutations. Inspect the matching-version/cycle checklist, explicit
confirmation, unknown-status reload and owned read-only paged history.

The previous Staff regression now uses a uniquely generated test schema with
guarded TRUNCATE teardown (immutable events cannot be casually deleted); its
resolution fixture includes actual completed work. API-mocked legacy component
fixtures include the additive history read and retain their rejecting-fetch guard.
No authorization bypass, production migration, development seed or reset was used.
See [tests.md](tests.md) and [feature captures](../../artifacts/lab-04/screenshots/workflow/README.md).
Author visual acceptance, implementation/documentation commits, pushed head, linked
feature PR, actual peer comments/replies/approval and merge are still pending.
Do not advance #42 to Done based only on these local checks.

### Author-requested follow-up, 2026-10-09

Review the creation redirect after all uploads, transient success notice, failure
alert with honest saved-Ticket recovery, disabled duplicate submission, mobile
layout and keyboard target/focus. Include navigation away during pending creation.
The existing login component fixture now explicitly mocks Staff owners/queue and
rejects unexpected fetches; its original assertions remain. This isolates it from
a running development API, not a product authentication change. Latest verification
is 147 client tests, five targeted real-browser checks and the client build; see
the dated ledger for the distinction from October 7's full regression.

The author backed up development and applied the existing #40 migration on
October 9 to fix manual creation against the outdated database. The agent did not
seed/reset it or alter credentials; browser verification preserved development
database/uploads. No additional migration is required for the redirect. Local
changes still require author acceptance/publication and independent peer review.

Also review the subsequent separate Current status box and Change status to
selector. Open must remain visible after saving, all four legal Open transitions
must remain selectable, and no later target should be preselected. Check all
eight status matrices, pending/rejected saves, reset after success, terminal
confirmation and the unchanged resolution/unknown-response guards. Desktop,
tablet and mobile feature captures are refreshed for this refinement; these do
not imply author visual acceptance or peer approval.

The final author refinement separates opening and progress into standalone panels:
New opening above Operations, progress below Operations after a confirmed open,
and read-only status for Cancelled. Inspect focus handoff, pending/rejected/unknown
opening, direct New cancellation and all later transitions. Latest local results
are 159 full client tests, eight targeted browsers and the typed client build;
18 workflow captures include opening/progress at three widths. No final-main
pass, author acceptance or peer review is implied.

### Checklist and view-first action refinement, October 9

Review the larger bold checklist/Actions headings and green-check/red-cross
requirements with explicit Met/Not met text. Overview is neutral for uncertain,
stale/loading and terminal states; authoritative whole-cycle gate is unchanged.
View/deep links/newly created actions show saved details and audit before editing.
Eligible Staff choose Edit action; check keyboard focus, closing/discarding unsaved
fields, preserved independent assignment after field save, unknown-save receipt
recovery and no Edit for Requesters/terminal/cancelled/prior-cycle work.

Latest local verification: 169 client tests / 19 files, typed client build and
14 targeted browsers (four Staff regression, five Action and five workflow/UI).
30 deliberate workflow PNGs include checklist and view/editor at three widths;
agent inspected representative desktop/mobile images. Row contrast >=4.5:1 and
44px keyboard controls/no page overflow were checked. Older initial-heading test
now waits for its existing focus effect without removing the focus requirement.
No full-server/full-browser-inventory/audit rerun or peer approval is claimed.
Author acceptance/publication and independent review are still required.

Further October 9 banner refinement: overall readiness is larger than requirements
(20–24px, heavier weight, spacing/icon/border emphasis), not just the heading.
Latest verification is 170 client tests, typed build and five workflow/UI browser
journeys (46.1s), refreshing 30 feature PNGs with three-width hierarchy/no overflow
checks. Prior 14-browser result remains historical. Audit history/JSON was not
altered; handout Part 7 requires ordered append-only behaviour/role visibility,
while our approved contract chooses immutable revisions and this display format.

Subsequent October 9 approval implements readable action revisions: changed-only
business fields, creation initial details, Yes/No and Bangkok dates. Attribution
and correction reasons remain visible; exact original snapshots are collapsed
under Technical details. Review unknown account IDs for honest labels rather than
inferred historical names, and verify keyboard disclosure and owned read-only access.
No stored event, ordering, paging, API or role policy changed.

Latest local verification: 176 client tests / 20 files (limited-worker rerun), typed
build and eleven targeted browser journeys (1.8m: five Actions, six workflow/UI).
The first full-client attempt had one older creation-test timeout; no assertion or
timeout was weakened. Staff/Requester audit at three widths compares expanded JSON
exactly to API snapshots and proves viewing does not mutate history. Thirty-six
workflow PNGs were generated; agent inspected desktop/mobile readable audit.
Development fingerprint was unchanged within this run; temporary config removed.
Earlier server/full-browser/audit results remain dated historical checks. Author
manual acceptance, publication and independent peer review are still pending.

Further author-requested Close detail is available in saved-details headers for
Staff/owning Requesters. Editing explicitly offers Discard changes and close detail;
pending/uncertain writes remain locked for recovery. Verify details/audit hide,
saved work remains, focus returns to View (heading when off-page), reopening reads
saved values and list refresh does not reopen a deliberately closed deep link.
Latest checks: 181 client tests / 20 files, typed build and six workflow/UI browser
journeys (1.1m), with three-width keyboard/44px/discard/exact-history assertions.
Development fingerprint unchanged; temporary config removed. Persistent screenshots
remain the earlier 36 captures; this run used ignored output only. No peer or author
manual acceptance, publication or full-server/full-browser/audit rerun is claimed.

The author's next clarification approved independent Action progress in view mode,
before the optional field editor. Review Start for Planned and Complete/Cancel for
eligible active actions without Edit; confirm they send state-only payloads and
still require Result/performer confirmation or cancellation reason/confirmation.
Field/assignment drafts are never silently submitted. Prior-cycle, terminal,
cancelled and Requester restrictions remain; state-only retry recovery stays in
view mode with the original key.

Latest local results: 187 client tests / 20 files (44 Action cases), typed build
and eleven targeted Actions/workflow browser journeys (2.4m). Two new tests first
held detached button references after Back; they now query current buttons and
retain focus checks. Real direct Start/Complete/Cancel, three-width keyboard/44px/
no overflow, immutable snapshots and earlier workflow/recovery assertions passed.
Thirty-nine workflow PNGs regenerated; desktop/mobile progress agent-inspected.
Development fingerprint unchanged within the run; temporary config removed.
No full-server/full-browser/audit rerun, author manual acceptance, publication or
peer review is claimed.

### Feature PR preparation, October 9

The author requested publication after exercising resolution, closure, reopening
and fresh-cycle work. Read-only checks on `TKT-20261009-DE4TLN` verified those
saved events, cleared dates on reopen and retained previous-cycle actions. The
latest inspected cycle-3 completed action has no outstanding follow-up. This
does not substitute for independent peer review or blanket author visual acceptance.

Final verification: 269 server tests / 31 files (106.13s), 187 client tests /
20 files (34.28s), both production builds and the full 44-test browser inventory
(4.0m). Two legacy tests first navigated secondary contexts to hard-coded port
5173; three URLs now use the active test origin. Original security assertions,
timeouts and retry settings remain unchanged. Both full browser runs preserved
the development database/uploads fingerprint; temporary port configuration removed.
The 39 persistent PNGs are the earlier deliberate feature captures, not regenerated
by this full run and not final-main evidence. See tests.md for exact provenance.

Review the resolution blockers, full transition matrix, stale/concurrent writes,
owned paged history, terminal/legacy records, independent state/field/assignment
saves and exact-key recovery. Peer approval/merge, Issues #43/#44, final-main
verification and the final author reflection remain pending. No new dependency
audit is claimed; the recorded moderate Multer advisory remains tracked.

## Final integration and reciprocal review

Record real feature/release approvals and merge commits, final-main checks and
Project Done evidence after they exist. Keep the release Issue open until those
checks finish. Record author reviews of the peer's actual project with direct links
when performed; no reciprocal review has been recorded for this lab yet.
