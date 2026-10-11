# Author-approved Lab 4 submission closeout

The author approved the reviewed report and authorized finalization on October 11,
2026. This is report approval, not a claim of a new personally performed demo or
formal screen-reader audit. Course upload/submission has not been performed.

PR #52 was approved by Phanuwit at head `27cf94d` and peer-merged as main
`72314d5814a874d528773ba328e5d54e871ca0ef`. The application remains the fully gated
`0f169ea` revision. At final assembly, the closeout files were local on
`docs/lab4-submission-final`, before their separate publication/review PR.
Publication does not imply a new peer approval. Published reviewed source links and current embedded closeout
documents are explicitly distinguished in the PDF.

## Actual completion evidence

- `completion.json`: author authorization, real PR #52 approval/merge, original
  pre-closeout states, current completion states and screenshot provenance.
- `issue-state.json`: all six Issues #39-44 verified closed.
- `project-state.json`: all six actual Project cards verified Done.
- `project-done.png`: unmodified public GitHub board screenshot with Done count 6
  and closed Issue #44 showing merged PR #52. A labelled excerpt appears in the
  PDF; the full original PNG is embedded. The column's old lab1-staging
  description is not evidence of the Lab 4 release destination.
- `visual-checklist.md`: retained checks with separately recorded author report
  approval. The parent checklist remains the historical review version.

## Final PDF verification

`output/pdf/TokTickIT-Lab4-Submission.pdf` contains 54 A4 portrait pages, Answer
Parts 1-9, 42 original application figures plus the actual board excerpt, 77 link
annotations and 21 byte-verified embedded files. The original 54-page review PDF,
historical gate reports, original 192 PNGs and application files are unchanged.

`pdf-check.json` records the generated dimensions, parts, links and attachments.
`pdf-review.json` records the exact final PDF digest, 54 rendered-page hashes,
original evidence/source integrity checks and confirmed agent visual review.
The final digest is:
`0f8a4db8076b249b9646c19568884e3d010fd2e09bee27baa7186358464504dc`.

All 55 pre-closeout/preliminary pages were visually reviewed. Final layout
removed only the redundant closing page. All 54 freshly rendered delivery pages
are byte-identical to the already reviewed corresponding final-layout pages;
the closing page was also rechecked at full size. No visual approval was inferred
from text extraction alone.

Rebuild with `python scripts/build-lab4-review.py --submission`. Render the
current PDF to a new directory, inspect every page, then run:

```text
python scripts/check-lab4-review.py --submission --reviewed-render-dir <directory> --agent-review-confirmed
```

Do not use the visual confirmation flag before inspecting the current renders.
The retained review PDF can be checked against its published exact attachments
without altering its original QA record:

```text
python scripts/check-lab4-review.py --record-path <separate-output-path>
```

The old default review rebuild is retired. Running the builder without
`--submission` fails before writing any artifact and points to the supported
submission build and preserved-review check commands. This prevents newer
documents from replacing the immutable PR #52 review snapshot.

Run both supported workflows and no-write guard regressions together:

```text
python -m unittest discover -s scripts -p test_lab4_pdf_workflows.py -v
```
