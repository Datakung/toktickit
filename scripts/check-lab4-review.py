"""Validate the PDF/evidence bytes; visual acceptance is never inferred from tests."""
from pathlib import Path
import argparse, hashlib, json, re, subprocess
from datetime import datetime, timezone
import pdfplumber
from pypdf import PdfReader
from lab4_source_fingerprints import SOURCE_HASH_POLICY, git_source_bytes, verify_application_sources

root = Path(__file__).resolve().parents[1]
evidence = root / 'artifacts/lab-04/final-main'
parser = argparse.ArgumentParser()
parser.add_argument('--submission', action='store_true')
parser.add_argument('--preflight', action='store_true', help='Validate the candidate before Issue/Project closeout.')
parser.add_argument('--reviewed-render-dir', type=Path)
parser.add_argument('--record-path', type=Path, help='Write QA to a separate path without replacing the historical review record.')
parser.add_argument('--agent-review-confirmed', action='store_true',
                    help='Use only after visually inspecting every current rendered page.')
args = parser.parse_args()
assert not args.preflight or args.submission
meta = evidence/'submission' if args.submission else evidence
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
load = lambda name: json.loads((evidence/name).read_text(encoding='utf-8-sig'))
manifest = load('gate/manifest.json')
assert manifest['status'] == 'passed' and manifest['preservationVerified']
assert manifest['developmentBefore'] == manifest['developmentAfter']
assert not manifest['workingTreeDirtyAtStart'] and manifest['phase'] == 'final-main'
for name, count in [('server', 298), ('client', 211)]:
    results = load(f'gate/{name}-results.json')
    assert results['success'] and results['numPassedTests'] == count
    assert results['numPendingTests'] == results['numTodoTests'] == 0
browser = load('gate/browser-results.json')
assert browser['stats']['expected'] == 49
assert all(browser['stats'][field] == 0 for field in ['unexpected', 'flaky', 'skipped'])
fresh = load('fresh-gate-files.json')
for row in fresh:
    path = evidence/row['file']
    assert path.exists() == row['exists'], row['file']
    if row['exists']: assert digest(path) == row['sha256'], row['file']
captures = load('captured-screenshots.json')
assert len(captures) == 192
for row in captures: assert digest(evidence/row['destination']) == row['sha256']
application = load('application-fingerprints.json')
canonical_application = verify_application_sources(root, manifest['revision'], application)
pdf = root/('output/pdf/TokTickIT-Lab4-Submission.pdf' if args.submission else 'output/pdf/TokTickIT-Lab4-Review.pdf')
reader = PdfReader(pdf)
check = json.loads((meta/'pdf-check.json').read_text())
completion = json.loads((meta/'completion.json').read_text()) if args.submission else None
if args.submission:
    assert completion['authorFinalAcceptance'] is True
    assert completion['publication']['merged'] is True
    assert completion['publication']['approvedHead'] == completion['reviewedEvidenceHead']
    assert completion['publishedEvidenceRevision'] == check['publishedEvidenceRevision']
    assert completion['publication']['mergedBy'] == 'auto4496'
    assert completion['phase'] == check['phase']
    assert digest(meta/completion['projectCapture']['file']) == completion['projectCapture']['sha256']
    assert check['phase'] == ('submission-candidate' if args.preflight else 'submission')
    issues = json.loads((meta/'issue-state.json').read_text())
    project = json.loads((meta/'project-state.json').read_text())
    assert sorted(r['number'] for r in issues) == list(range(39,45))
    assert sorted(r['issue'] for r in project) == list(range(39,45))
    if not args.preflight:
        assert all(r['state'] == 'CLOSED' for r in issues)
        assert all(r['status'] == 'Done' for r in project)
assert len(reader.pages) == check['pages']
assert check['pageFormat'] == 'A4 portrait'
for page in reader.pages:
    assert abs(float(page.mediabox.width)-595.2756) < .1
    assert abs(float(page.mediabox.height)-841.8898) < .1
    assert page.get('/Rotate', 0) == 0
text = '\n'.join(page.extract_text() or '' for page in reader.pages)
assert re.findall(r'Answer Part ([1-9]):', text) == list('123456789')
assert '\u25a0' not in text
if args.submission:
    assert 'REVIEW COPY' not in text and 'NOT submission-ready' not in text
    assert 'Publication of the follow-up is pending' not in text
    assert completion['publication']['approvalUrl'] in check['links']
reciprocal = load('reciprocal-review.json')
assert reciprocal['repository'] == 'auto4496/toktickit'
assert not reciprocal['testsRerunForThisDocumentationUpdate']
assert [r['number'] for r in reciprocal['records']] == [39, 41, 43, 45, 47, 49, 50, 51]
part_one = text.split('Answer Part 2:', 1)[0]
assert "Reciprocal review - comments given on Phanuwit's project" in part_one
assert 'No reciprocal review is claimed' not in text
assert 'no reciprocal review has been recorded' not in text
review_revision = '72314d5814a874d528773ba328e5d54e871ca0ef'
reviewer = ((root/'docs/lab-04/reviewer.md').read_text(encoding='utf-8') if args.submission
            else git_source_bytes(root, review_revision, 'docs/lab-04/reviewer.md').decode('utf-8'))
for record in reciprocal['records']:
    assert record['merged'] and record['mergedBy'] == 'Datakung'
    assert record['head'][:7] in part_one
    approvals = [c for c in record['comments']
                 if c['author'] == 'Datakung' and c['state'] == 'APPROVED']
    assert len(approvals) == 1, record['number']
    assert approvals[0]['url'] in check['links'], record['number']
    assert approvals[0]['url'] in reviewer
for record in reciprocal['records']:
    for comment in record['comments']:
        if comment['author'] == 'auto4496':
            assert comment['url'] in check['links'], comment['url']
attachment_count = 21 if args.submission else 17
assert len(reader.attachments) == attachment_count
for name in reader.attachments:
    path = (root/'docs/lab-04'/name if name in {
        'specification.md', 'tests.md', 'ui-spec.md', 'api-spec.md', 'reviewer.md', 'ai-use.md'
    } else evidence/name if name in {
        'dashboard-parity.json', 'captured-screenshots.json', 'visual-checklist.md'
    } else evidence/'gate'/name)
    if args.submission:
        if name in {'completion.json','issue-state.json','project-state.json','visual-checklist.md','project-done.png'}:
            path = meta/name
        expected_bytes = path.read_bytes()
    else:
        # Retain reproduction of the immutable PR #52 review copy even when
        # current maintained documents gain a later final-acceptance record.
        expected_bytes = git_source_bytes(root, review_revision, path.relative_to(root).as_posix())
    assert reader.attachments[name] == [expected_bytes], name
actual_links = sorted(set(str(a.get_object()['/A']['/URI']) for page in reader.pages
                         for a in page.get('/Annots', [])
                         if a.get_object().get('/A', {}).get('/S') == '/URI'))
assert actual_links == check['links']
# GitHub source links point to real files in the already published reviewed commit.
for url in check['links']:
    assert url.startswith('https://github.com/')
    if '/blob/' in url:
        revision, filename = url.split('/blob/', 1)[1].split('/', 1)
        filename = filename.split('#', 1)[0]
        subprocess.run(['git', '-c', f'safe.directory={root.as_posix()}',
                        'cat-file', '-e', revision+':'+filename], cwd=root, check=True)
with pdfplumber.open(pdf) as document:
    for number, page in enumerate(document.pages, 1):
        for char in page.chars:
            assert char['x0'] >= 30 and char['x1'] <= page.width-30, (number, char['text'])
            assert char['top'] >= 10 and char['bottom'] <= page.height-10, number
page_hashes = {}
if args.agent_review_confirmed:
    assert args.reviewed_render_dir is not None
    for number in range(1, len(reader.pages)+1):
        path = args.reviewed_render_dir/f'page-{number:02}.png'
        assert path.exists(), path
        page_hashes[str(number)] = digest(path)
record = {
    'checkedAtUtc': datetime.now(timezone.utc).isoformat(), 'pdfSha256': digest(pdf),
    'applicationRevision': manifest['revision'], 'pages': len(reader.pages),
    'pageFormat': 'A4 portrait', 'allPageSizesVerified': True,
    'partOrder': list('123456789'), 'embeddedFilesByteVerified': attachment_count,
    'freshGateDigestsVerified': len(fresh), 'originalScreenshotDigestsVerified': 192,
    'applicationFileDigestsVerified': len(application),
    'applicationSourceHashPolicy': SOURCE_HASH_POLICY,
    'applicationCanonicalSha256': canonical_application,
    'applicationWorkingFilesComparedWithReviewedGitBlobs': True,
    'textWithinPageBounds': True,
    'sourceLinksExistInReviewedCommit': True,
    'peerReviewAndProjectLinks': 'Actual GitHub records separately inspected; not a network crawler claim',
    'reciprocalReviewPrsVerified': [r['number'] for r in reciprocal['records']],
    'reciprocalReviewEvidenceSha256': digest(evidence/'reciprocal-review.json'),
    'agentRenderedPageReviewConfirmed': args.agent_review_confirmed,
    'reviewedPageSha256': page_hashes, 'authorFinalAcceptance': args.submission, 'publishedEvidence': args.submission,
    'phase': check['phase'],
    'completionRecordSha256': digest(meta/'completion.json') if args.submission else None
}
(args.record_path or meta/'pdf-review.json').write_text(json.dumps(record, indent=2)+'\n')
print(json.dumps({key: value for key, value in record.items()
                  if key not in {'reviewedPageSha256','applicationCanonicalSha256'}}))
