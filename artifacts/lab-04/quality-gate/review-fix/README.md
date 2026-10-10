# PR #50 final-preservation report correction

Review: [P2 finding](https://github.com/Datakung/toktickit/pull/50#discussion_r4238547399)
at exact head 95b6689f3245cc517dce32772343eb47cb3c53b1, requested changes on
2026-10-11 at 00:26:18 Bangkok. The successful ordinary candidate run is not
invalidated; the reusable gate's failed-final-verification record was wrong.

## Reproduction and correction

- [Before](manifest-regression-before.log): initial parsed-production regression
  run 5/10 passed; external snapshot and final-log read failures left `passed`.
- [After](manifest-regression-after.log): all 10 pass. The actual production
  step, main-check status assignment and finalization code are parsed/executed;
  no copied implementation substitutes for them. An external temporary `.cmd`
  supplies success, exit 1, invalid output or a different digest. Only the final
  read fault is injected. Earlier failure records must remain intact.
- New gate/harness/fixture source digests and factual results are in
  [result.json](result.json). These supersede the original gate script hash
  only for this correction; historical candidate evidence is not rewritten.
- [FinalMain guard](final-main-guard.log) correctly refuses the dirty feature
  checkout before running/replacing gate evidence. This is not a main run.
- [Frontend build retry](client-build-retry.log) passes. The first frontend build
  encountered sandbox EPERM resolving main.tsx; the authorized unsandboxed retry
  passed. The [server typed build](server-build.log) also passed.

Main checks record `checks-passed`. Only valid matching before/after SHA-256
digests allow `passed` and `preservationVerified: true`. External snapshot,
read or invalid/missing-fingerprint errors record failed verification. Changed
state is distinct. An earlier main failure stays failed, with its original step
exit code; a successful final match does not convert it to passed.

## Scope and remaining work

The harness touches only its own verified unique OS-temp child, restores its
environment/working location and removes that child. No product, database,
Docker, migration, seed, credentials or repository evidence is accessed by it.
The caller deliberately retains these new review-correction logs separately.

A read-only live fingerprint attempt could not reach PostgreSQL on localhost:5432.
No database/container was changed. No new full server/client/browser inventory,
fresh audit, development preservation hash or final-main pass is claimed. Product
source and dependency locks did not change in this correction. The peer must
recheck the fix before approval/merge; Issue #44, final release/captures, rendered
nine-part PDF and Project acceptance remain pending.
