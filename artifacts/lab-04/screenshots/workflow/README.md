# Issue #42 workflow feature evidence

Originally captured on 2026-10-07; refreshed deliberately on 2026-10-09 after the
author-requested separate opening/progress panels, labelled red/green checklist,
prominent headings, view-first/on-demand Action editing and later independent
Action progress. Branch feature/42-ticket-workflow
starts from peer-merged staging f4da089 (PR #47). These are local captures, not final-main
release evidence, author visual acceptance or peer approval of Issue #42.

Command: `npm --prefix client run test:e2e:lab4-workflow-evidence`.
Source: client/e2e/lab-04/ticket-resolution.spec.ts. Real authenticated Requester
and Staff sessions use a newly created fixture in the guarded E2E target.
It has 22 distinct actions: two completed, twenty cancelled, with one later-page
action initially unfinished and then completed with outstanding follow-up.
Clearing that follow-up makes the whole-cycle gate pass. Formal resolve/close/
reopen preserves old work and requires fresh cycle-2 work; the Requester's
indication never changes formal status. Requester history is owned/read-only.

| Capture | Meaning |
|---|---|
| opening-stage-1440.png / opening-stage-768.png / opening-stage-390.png | New-ticket opening panel above Operations; Open Ticket selected but not yet saved; progress panel is absent |
| status-selection-1440.png / status-selection-768.png / status-selection-390.png | Open remains in the Current status box while In Progress is an explicitly selected, unsaved target; visible keyboard focus on Change status to |
| checklist-blocked-1440.png / checklist-blocked-768.png / checklist-blocked-390.png | Prominent heading, red unmet completed-work row and red blocked overview; green rows for met requirements |
| checklist-ready-1440.png / checklist-ready-768.png / checklist-ready-390.png | Green ready overview and all three green Met rows with check icons; formal resolution still requires Staff confirmation |
| action-view-1440.png / action-view-768.png / action-view-390.png | Saved Action details with Edit action disclosure; editor hidden and no mutation on view |
| action-edit-1440.png / action-edit-768.png / action-edit-390.png | Fields shown only after explicit Edit; displayed unsaved test draft is deliberately discarded without a mutation |
| action-progress-1440.png / action-progress-768.png / action-progress-390.png | Start/Complete/Cancel available directly in view mode without the field editor; keyboard focus on Complete and responsive wrapping |
| audit-readable-staff-1440.png / audit-readable-staff-768.png / audit-readable-staff-390.png | Staff sees readable changed-only follow-up values and actor/time; original snapshots collapsed under focused Technical details |
| audit-readable-requester-1440.png / audit-readable-requester-768.png / audit-readable-requester-390.png | Owning Requester sees the same readable revision without edit controls; long content wraps at all widths |
| later-page-blocker-1440.png | Page-one checklist counts a planned action on page two and blocks resolution |
| ready-1440.png / ready-768.png / ready-390.png | All current-cycle work requirements met; Resolve selected, explicit confirmation still required; keyboard focus on Review Actions Taken |
| reopened-1440.png / reopened-768.png / reopened-390.png | Cycle 2 has no qualifying completed work; retained cycle-1 work cannot satisfy the new gate |
| requester-history-1440.png / requester-history-768.png / requester-history-390.png | Actual Staff transition actor, server times, versions and cycles in read-only ascending history |
| status-outcome-unknown-1440.png | Real status commit followed by an intentionally lost response; repeated writes disabled until explicit reload |
| history-retry-1440.png | Intentionally simulated history outage, with a recoverable Retry (not a production failure claim) |

Thirty-nine captures use readable feature regions instead of a very tall full page
containing all 22 action cards. The tests check whole-page horizontal overflow at
1440/768/390px, actual visible keyboard focus, 44px review/history controls and
owned access. Representative desktop readiness, mobile reopened checklist and
mobile Requester history were visually inspected by the agent on October 7;
desktop opening/progress and mobile progress panels were inspected after the final
October 9 refinement. The final blocked/ready checklists and Action view/editor
were inspected at desktop/mobile after the colour/disclosure changes. This does not
replace the author's acceptance or a full manual screen-reader audit.

October 9 earlier disclosure capture run: 14 browser checks passed (1.7m), comprising five
workflow/UI journeys, five Action journeys and four Staff operations/responsive
regressions. Computed red/green row text contrast is >=4.5:1; the heading is larger
and bold. On-demand Edit/Close supports keyboard focus/44px targets and never
saves the deliberately discarded draft. Earlier colour-only verification was eight
checks (34.3s); earlier two-stage verification was eight checks (39.3s). A one-off
UI 5183 / API 3100 override kept the author's running services untouched; the
temporary configuration was removed afterward. Headers use the actual test-page
origin, retaining normal Origin/CSRF verification.

Development database/uploads were identical before and after that earlier evidence run:
`90f809cf6536cd93187145cb7ccbf3012e90177edb7928934f8f0a8bdd3142d4`.
The earlier two-stage run's within-run hash was
`05d7c50ead10c75379001e9863ed7497e5d7621c29d53aff64d3aa5aab1171d0`.
The October 7 run's historical hash was
`466cf880b8708645baca8cc3e1fd5b8f967103b0c7c90cf30eb5acf84648025f`.
The author subsequently backed up/migrated development and manually tested a
Ticket. No agent development migration, seed, reset or credential recovery was
performed. Preservation is checked within each run, not across author changes.
Ordinary E2E writes to ignored test output, not these committed evidence paths.
The existing accepted Issue #41 Actions Taken PNGs were not refreshed by this run;
their five regression journeys wrote only ignored screenshots. All 30 workflow
PNGs here were deliberately generated against the final local UI.

Earlier October 9 readiness-emphasis capture run: five workflow/UI journeys passed
(46.1s), refreshing all 30 workflow PNGs. The Ready/Not ready overview now has
larger 20–24px bold text/icon, 20px padding and 6px leading border than the ordinary
requirement rows. Actual computed hierarchy/contrast checked for blocked/ready at
1440/768/390px with no page overflow. Agent inspected final desktop/mobile examples.
Client regression: 170 tests / 19 files, typed build passed. Audit display unchanged.
Temporary UI 5183 / API 3100 config removed; within-run development fingerprint
unchanged: `bbf6109562e728196482780e6c8aa5d34a3b5e46e8c7a93efbe04eb298928102`.
Earlier 14-browser result is historical, not rerun for this CSS-only change.

Earlier October 9 readable-audit capture run: eleven browser journeys passed (1.8m),
five Actions regressions plus six workflow/UI journeys. All 36 workflow PNGs were
generated against this final local UI; accepted Issue #41 PNGs remain unchanged.
The readable audit shows only changed fields, or initial details for creation,
with friendly labels/Yes-No/Bangkok dates and visible attribution. At all three
widths, Staff and owning Requester keyboard-expand the initially collapsed original
snapshots; parsed JSON exactly matches the API and viewing never mutates history.
Long text wraps without page overflow. Agent inspected desktop Staff and mobile
Requester audit images. Client: 176 tests / 20 files and typed build passed.
Temporary isolated-port configuration removed; development fingerprint identical
before/after: `67839b10333d11982859906c2827200bdf178033835068722abfa89cfbf7e119`.
No author acceptance, peer approval or full-server/full-browser/audit rerun claimed.

Subsequent Close detail refinement passed 181 client tests, typed build and six
workflow/UI browser journeys (1.1m). Staff/Requester keyboard close/reopen and
explicit edit discard were checked at every width; original history remains
unchanged. That run wrote ignored screenshots only, so these 36 captures are the
prior readable-audit evidence, not refreshed Close detail screenshots. Development
fingerprint remained unchanged and temporary isolated-port config was removed.

Latest October 9 independent-progress capture run: eleven Actions/workflow browser
journeys passed (2.4m), all 39 workflow PNGs generated. Start/Complete/Cancel are
visible before the optional field editor. Actual direct state saves retain required
confirmations and actor attribution; corrections still explicitly open Edit.
Three-width keyboard/44px/no overflow and completion/back without exposing fields
are checked. Agent inspected desktop/mobile progress captures. Client: 187 tests /
20 files, typed build passed. Accepted Issue #41 PNGs remain unchanged.
Temporary isolated-port configuration removed; development fingerprint identical
before/after: `cbf37924909c38917a7d61afeb3f513892672be03386ef1be2a99fd97670fafb`.
No full-server/full-browser/audit rerun or author/peer acceptance is implied.

Publication verification on October 9 subsequently passed the complete browser
inventory: 44 tests (4.0m), isolated UI 5183 / API 3100. Two legacy tests first
failed because secondary contexts hard-coded port 5173; configured-origin navigation
fixed them without weakening assertions. This rerun wrote ignored outputs only,
so the 39 PNGs above retain their deliberate capture provenance. Full server:
269 tests / 31 files; final client: 187 tests / 20 files; both builds passed.
Development fingerprint identical before/after both full browser attempts:
`bd723571386f81ec515cd44c9b7d2e97d0393bd7c874392d8c65691ae24118f2`.
Temporary configuration removed. The author exercised the saved resolution/close/
reopen/fresh-cycle flow; this is not blanket visual acceptance or peer approval.

Final-main dashboard/workflow/release captures remain Issue #44 work. Fixtures,
timestamps and IDs here are test evidence, not invented historical production work.
