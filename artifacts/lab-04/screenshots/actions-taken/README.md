# Issue #41 Actions Taken feature evidence

Captured 2026-10-06 on `feature/41-actions-ui`, based on peer-merged staging
`a915812b4f500b2fb8bff4ddc4987c4d9b6e7de9`. These files were generated from the
local, not-yet-committed Issue #41 implementation. They do not establish author
acceptance, peer approval, released-main provenance or complete Lab 4 coverage.
Issue #44 must deliberately refresh final-main evidence after the remaining work.

Producer: `client/e2e/lab-04/actions-taken-flow.spec.ts`, Playwright Chromium on
Windows, Node.js 24.14.0 and PostgreSQL 17.9. Run from the repository root:

```powershell
npm --prefix client run test:e2e:lab4-actions-evidence
```

The recorded full regression/capture run also included earlier suites:

```powershell
npm --prefix client run test:e2e:lab4-actions-evidence -- e2e/lab-02 e2e/lab-03
```

Recorded result: 36 scenarios passed (2.0 minutes), including 5 new Action
journeys and all 31 earlier scenarios. The separate client run passed 130 tests;
server regression passed 182. Both builds passed. Full traceability and remaining
scope are in [Lab 4 tests](../../../../docs/lab-04/tests.md).

Only the explicit feature-evidence command writes these 13 files. Normal browser
tests write ignored test output. Tests use guarded `toktickit_e2e` and isolated
uploads; development was not migrated, seeded or reset. Before/after development
database/upload fingerprint matched:
`466cf880b8708645baca8cc3e1fd5b8f967103b0c7c90cf30eb5acf84648025f`.
The fingerprint includes existing Action/history/receipt/transition tables as
well as earlier tables and uploads; it is not a secret or a database backup.

Screenshots capture the shared Actions Taken region, not the entire browser or
private Internal Notes. Cropped image dimensions are not viewport dimensions.
Viewport dimensions below are the actual test settings; long regions may extend
past the viewport height. Seeded names and records are test fixtures.

| Image | Viewport | Evidence |
|---|---|---|
| [staff-completed-correction-desktop](staff-completed-correction-desktop.png) | 1440 × 900 | Administrator completed work assigned to another Staff actor; correction requires a reason, performer remains separate from assignee |
| [staff-cancelled-desktop](staff-cancelled-desktop.png) | 1440 × 900 | Second action cancelled with reason and retained immutable history; cancelled record read-only |
| [requester-readonly-desktop](requester-readonly-desktop.png) | 1440 × 900 | Owned Requester reads shared actions/history without mutation controls or private Notes |
| [create-outcome-unknown-desktop](create-outcome-unknown-desktop.png) | 1440 × 900 | Real create committed before response delivery was aborted; exact Retry available, edits locked |
| [assignment-outcome-unknown-desktop](assignment-outcome-unknown-desktop.png) | 1440 × 900 | Earlier field save confirmed; separate assignment committed with response lost; only that assignment may be replayed |
| [staff-active-1440](staff-active-1440.png) | 1440 × 900 | Desktop table and independent Staff edit/assignment/state controls with long content |
| [staff-active-768](staff-active-768.png) | 768 × 1024 | Tablet labeled action cards and form layout |
| [staff-active-390](staff-active-390.png) | 390 × 1024 | Mobile cards, full-width caption, wrapped text and single-column fields |
| [requester-history-1440](requester-history-1440.png) | 1440 × 900 | Desktop shared read-only record and immutable audit history |
| [requester-history-768](requester-history-768.png) | 768 × 1024 | Tablet shared read-only record/history |
| [requester-history-390](requester-history-390.png) | 390 × 1024 | Mobile shared read-only record/history |
| [assignment-rejected-desktop](assignment-rejected-desktop.png) | 1440 × 900 | Deliberately injected definite INVALID_ASSIGNEE 400; earlier field success retained and assignment feedback shown |
| [version-conflict-desktop](version-conflict-desktop.png) | 1440 × 900 | Real competing action creation makes field save stale; VERSION_CONFLICT blocks edits until explicit reload/review |

The failure injection above exercises UI feedback, not a claim that the browser
deactivated an assignee. Real inactive/Requester assignment rejection and account
change races are covered by the server API/concurrency suites. Lost-response
tests perform real writes and assert one receipt/event/version increment per
operation after exact replay; create recovery also survives a browser reload.

Agent visual QA inspects representative desktop/mobile Staff and Requester
captures. Automated browser checks cover no horizontal page overflow, computed
responsive cards, visible keyboard focus, 44px controls, long text and paging.
This is not a full manual screen-reader audit. Author visual acceptance and peer
review are still pending; screenshots alone do not prove backend authorization.
