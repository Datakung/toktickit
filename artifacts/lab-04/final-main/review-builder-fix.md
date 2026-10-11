# PR #53 default review-build correction

Finding: https://github.com/Datakung/toktickit/pull/53#discussion_r4241467656
Reviewer: Phanuwit / auto4496. Changes requested on exact head `3b7d229` in
review https://github.com/Datakung/toktickit/pull/53#pullrequestreview-5483198202.

The default builder rendered/embedded newer maintained documents, while the
review checker compared attachments with exact published PR #52 blobs at
`72314d5`. The reviewer reproduced a successful build followed by a failed
attachment check, after the builder had already overwritten the historical
review PDF and its metadata. Delivered PDFs and submission build/check passed.

## Correction

Retire the obsolete default review rebuild, rather than reinterpret the frozen
historical snapshot. The builder without `--submission` now exits 2 with an
actionable explanation immediately after argument parsing, before reading
evidence, creating output directories or writing artifacts. It directs the user
to the supported submission builder and preserved-review check command.

Update both artifact READMEs so they no longer advertise the retired rebuild.
The original review checker still uses exact PR #52 Git blobs. The supported
submission builder/checker and report layout/content are unchanged. No delivered
PDF, embedded maintained document, original QA record, application source, gate
output or screenshot has been rewritten by this correction.

## Joint workflow regressions and actual verification

Command: `python -m unittest discover -s scripts -p 'test_lab4_*.py' -v`.

October 11, 2026: **20 tests passed in 31.306 seconds**, comprising 17 existing
source-fingerprint tests and these three new PDF workflow regressions:

1. Default build exits 2 without changing either delivered PDF or either mode's
   check/review metadata; checking the preserved review still passes with 17
   exact attachments and its unchanged PDF digest.
2. With no evidence or output directories present, the default build refuses
   cleanly before evidence reads or directory creation.
3. Submission rebuild followed by its complete checker passes: 54 A4 portrait
   pages, Answer Parts 1-9 and 21 exact attachments. The historical review PDF
   and metadata stay byte-identical, and its complete checker passes again after
   the submission rebuild. A separate QA output does not overwrite the original
   submission visual-acceptance record.

PDF generation runs only in a disposable local checkout of the tracked fixture
with current tooling copied in. The developer's working deliverables remain
untouched. Windows sandbox attempts were blocked during Git checkout setup;
the complete suite subsequently passed outside the sandbox. No failing workflow
test was skipped or weakened. This is tooling regression verification, not a
fresh full application gate, author demo, screen-reader audit or course upload.

Delivered submission PDF SHA-256 remains
`0f8a4db8076b249b9646c19568884e3d010fd2e09bee27baa7186358464504dc`.
Original review PDF SHA-256 remains
`8f1fda67585be5ecbf8670af2d0453d6bb51fcabbc5e5440cf5bcadf2fc17a99`.

This is the author's correction record, not a claim that Phanuwit has approved
the new head. The fix is published to the existing PR #53 for re-review.
