# PR #52 application-source hash correction

Reviewer auto4496 requested changes on exact head fea09058c0e4418ca53219f25193a429b50a736e,
October 11, 15:33:56 Bangkok. [Review](https://github.com/Datakung/toktickit/pull/52#pullrequestreview-5482569222)
and [P2 finding](https://github.com/Datakung/toktickit/pull/52#discussion_r4240890309).
The advertised checker failed on an unchanged Windows CRLF checkout even though
source text matched the reviewed Git blobs. His other evidence/PDF checks passed;
his diagnostic was not a passing execution of the committed command.

The author requested "Fix it". The correction introduces an application-text-only
CRLF-to-LF policy and compares actual working contents against approved Git blobs.
Historical raw fingerprints remain unchanged and must also match an allowed EOL
representation of those blobs. No branch/HEAD-based expectation or edited-source
hash replacement is used. All exact evidence/PDF/attachment checks remain active.

Correction commit: 64df40b. Actual focused result: 17 Python regression tests passed,
including LF/CRLF forms of all 68 approved files and a genuine content modification
to each file rejected. Separate fresh local checkouts of that commit ran the complete
advertised checker successfully with core.autocrlf=false (68 LF sources) and
core.autocrlf=true (68 CRLF sources), each clean before running. Both verified all
17 embedded attachments, 18 fresh evidence records, 192 PNGs and 54 A4 pages.

In the CRLF scratch checkout, changing the actual fallback port in
server/src/index.ts from 3000 to 3001 caused the complete checker to exit 1 with
the named application-content assertion. The author's working application files
were never edited. This proves checking Git alone does not conceal working edits.
The scratch edit was restored after the rejection check.

The PDF remains byte-identical: SHA-256
8f1fda67585be5ecbf8670af2d0453d6bb51fcabbc5e5440cf5bcadf2fc17a99.
Historical raw application fingerprints and fresh logs/captures are unchanged.
The generated QA record now adds the canonical policy and all 68 normalized hashes.
Reproduction summary is in checker-review-fix.json. This is checker-only verification,
not a fresh application suite, reviewer approval, PDF modification or Issue #44 closure.
