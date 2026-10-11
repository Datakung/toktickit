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

Initial focused result: 17 Python regression tests passed, including LF/CRLF forms
of all 68 approved files and a genuine content modification to each file rejected.
Fresh complete-checker reproduction in separate LF/CRLF checkouts is still pending
at this intermediate commit. This is checker-only verification, not a fresh
application test suite, reviewer approval, PDF modification or Issue #44 closure.
