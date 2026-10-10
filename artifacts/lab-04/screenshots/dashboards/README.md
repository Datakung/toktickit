# Issue #43 dashboard feature evidence

The author subsequently stated "Everything in order" and authorized publishing
the reviewed feature/UI in a PR. Historical pending-author statements below
describe earlier iterations; independent peer acceptance and final-main release
evidence are still pending. No separate Administrator/exact-width manual
acceptance checklist is inferred from that general approval.

Current captures also reflect the author-approved Ticket-local action numbering:
each Ticket starts at Action 1, and detail/work/dashboard labels agree without
renumbering stored IDs. The deliberate five-case numbering evidence run passed
(33.6s) and preserved development database/uploads. Representative work captures
show different Tickets each with Action 1. Historical results below predate this
refinement; the current full client has 211 passing tests and the full server
rerun has 290 passing tests. Both production builds pass. These remain isolated
feature captures, not final-main or peer-approved release evidence.

The subsequent complete guarded Chromium inventory passed all 49 cases (4.5m),
including number parity, later-page Action 21 and internal-ID writes/deep links.
Development database/uploads matched before/after. The complete run used ignored
screenshots and did not replace these deliberate captures or final-main evidence.

Latest author follow-up additionally corrected action field-editor buttons:
`action-create-controls-1440/768/390.png` and
`action-edit-controls-1440/768/390.png` show equal Create/Save and Discard controls,
aligned on desktop/tablet and stacked on mobile. The five-case guarded rerun
passed (20.7s), all 211 client tests passed (34.63s), and the typed build passed.
Representative control images were visually inspected. Development data/uploads
matched before/after this latest run; no stored ID or save behavior changed.
Earlier complete-inventory results below were not rerun for this correction.

Captured from real-session, isolated Chromium journeys on 2026-10-10, not mock
screens or development data. Requester fixture owns four recent Tickets, including
waiting/resolved records and an unbroken 120-character summary. Staff fixture has
assigned current-cycle work and a completed-performer record; Admin uses the same
operational dashboard with its own current-user counts. Times shown are Bangkok.

- requester-1440/768/390.png: owned metrics, recent/waiting lists and quick links.
- staff-1440/768/390.png: operational metrics, all status/priority groups and work.
- assigned-work-390.png and admin-work-desktop.png: current-user work destination.
- requester-refresh-failed-390.png: visibly stale successful snapshot plus Retry.
- requester-empty-desktop.png: genuine zero account and helpful empty lists.
- requester-forbidden-desktop.png: protected cards removed on 403, not fake zeros.
- assigned-work-1440/1150/768/390.png and performed-work-1440/1150/768/390.png:
  wider desktop tables with one-line Ticket/Action and View Action labels,
  responsive tablet/mobile cards, and realistic longer Ticket numbers.
- action-progress-planned-1440.png, action-progress-active-1440.png and
  action-progress-active-390.png: equal-sized direct progress controls before
  and after Start action, without opening the field editor.
- action-confirm-complete-1440/768/390.png and
  action-confirm-cancel-1440/768/390.png: focused confirmation fields and
  equal-size Confirm/Back controls, using cropped Action progress regions.
- requester-1920.png, staff-1920.png, assigned-work-1920.png and
  performed-work-1920.png: compact shared workspace and centered wide-desktop
  content. Existing width captures were also refreshed for this compact revision.

Source: client/e2e/lab-04/dashboards.spec.ts. Ordinary runs use ignored outputs;
run `npm --prefix client run test:e2e:lab4-dashboard-evidence` deliberately to
replace these feature captures (review UI 5183/API 3100). Browser
checks verify no horizontal page overflow at 1440/768/390, matching API/list
counts, captured range reload/Back, focus outline and >=44px dashboard link heights.
The agent visually inspected all six role/width images. The author reported six
Requester and five Staff checks passing on development data; Administrator,
exact-width author review and acceptance of the latest adjustments remain pending.
Captures were refreshed after compacting the Requester quick links and widening
work lists/aligning Action progress controls. All five dashboard scenarios passed
(latest targeted rerun 22.4s), with minimum 44px quick links, equal-size 48px progress controls,
single-line desktop labels, no overflow and responsive work cards verified.
Representative desktop and mobile captures were visually inspected.
The final run also checked both confirmation forms and return focus without
changing state. Extra page/cell spacing was reverted after author clarification;
The author subsequently confirmed 100% browser zoom and approved trying a compact
shared workspace. These current captures use 15px workspace text, 40px maximum
page headings, 36px metrics, smaller card/list padding and a centered 1200px
work-table area. Three Staff metric cards share the full row with aligned values.
Important section headings, one-line work labels and touch targets remain intact.
The author has not yet accepted the proposed compact look.
After these deliberate captures, the complete 49-case Chromium inventory passed
(4.0m), as did all 210 client tests and the typed build. Development data/uploads
were unchanged within each run. The full inventory wrote ignored screenshots
only; it did not replace this feature evidence or produce final-main captures.
Latest captures were refreshed again for the author-requested dashboard-only
density adjustment: one-line label reserve on wide Staff cards, aligned short
`View all` buttons with full accessible names, and 8px list-row padding. Text,
numbers, touch targets and My Actions sizing are unchanged. The latest deliberate
five-case run passed (19.5s), all 210 client tests passed (35.67s), and the typed
build passed. Representative Staff desktop/mobile captures were inspected;
development database/uploads stayed unchanged. The complete 49-case run above
predates this last adjustment and was not repeated. Author visual acceptance and
independent peer acceptance remain pending. These are not final-main release
captures; #44 still owns the integrated release gate and submission evidence.
