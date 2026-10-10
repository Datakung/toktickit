"""Validate the PDF/evidence bytes; visual acceptance is never inferred from tests."""
from pathlib import Path
import argparse, hashlib, json, re, subprocess
from datetime import datetime, timezone
import pdfplumber
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
evidence = root / 'artifacts/lab-04/final-main'
parser = argparse.ArgumentParser()
parser.add_argument('--reviewed-render-dir', type=Path)
parser.add_argument('--agent-review-confirmed', action='store_true',
                    help='Use only after visually inspecting every current rendered page.')
args = parser.parse_args()
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
for row in application: assert digest(root/row['file']) == row['sha256']
pdf = root/'output/pdf/TokTickIT-Lab4-Review.pdf'
reader = PdfReader(pdf)
check = load('pdf-check.json')
assert len(reader.pages) == check['pages']
assert check['pageFormat'] == 'A4 portrait'
for page in reader.pages:
    assert abs(float(page.mediabox.width)-595.2756) < .1
    assert abs(float(page.mediabox.height)-841.8898) < .1
    assert page.get('/Rotate', 0) == 0
text = '\n'.join(page.extract_text() or '' for page in reader.pages)
assert re.findall(r'Answer Part ([1-9]):', text) == list('123456789')
assert '\u25a0' not in text
reciprocal = load('reciprocal-review.json')
assert reciprocal['repository'] == 'auto4496/toktickit'
assert not reciprocal['testsRerunForThisDocumentationUpdate']
assert [r['number'] for r in reciprocal['records']] == [39, 41, 43, 45, 47, 49, 50, 51]
part_one = text.split('Answer Part 2:', 1)[0]
assert "Reciprocal review - comments given on Phanuwit's project" in part_one
assert 'No reciprocal review is claimed' not in text
assert 'no reciprocal review has been recorded' not in text
reviewer = (root/'docs/lab-04/reviewer.md').read_text(encoding='utf-8')
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
assert len(reader.attachments) == 17
for name in reader.attachments:
    path = (root/'docs/lab-04'/name if name in {
        'specification.md', 'tests.md', 'ui-spec.md', 'api-spec.md', 'reviewer.md', 'ai-use.md'
    } else evidence/name if name in {
        'dashboard-parity.json', 'captured-screenshots.json', 'visual-checklist.md'
    } else evidence/'gate'/name)
    assert reader.attachments[name] == [path.read_bytes()], name
# GitHub source links point to real files in the already published reviewed commit.
for url in check['links']:
    assert url.startswith('https://github.com/')
    if '/blob/' in url:
        revision, filename = url.split('/blob/', 1)[1].split('/', 1)
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
    'partOrder': list('123456789'), 'embeddedFilesByteVerified': 17,
    'freshGateDigestsVerified': len(fresh), 'originalScreenshotDigestsVerified': 192,
    'applicationFileDigestsVerified': len(application), 'textWithinPageBounds': True,
    'sourceLinksExistInReviewedCommit': True,
    'peerReviewAndProjectLinks': 'Actual GitHub records separately inspected; not a network crawler claim',
    'reciprocalReviewPrsVerified': [r['number'] for r in reciprocal['records']],
    'reciprocalReviewEvidenceSha256': digest(evidence/'reciprocal-review.json'),
    'agentRenderedPageReviewConfirmed': args.agent_review_confirmed,
    'reviewedPageSha256': page_hashes, 'authorFinalAcceptance': False, 'publishedEvidence': False
}
(evidence/'pdf-review.json').write_text(json.dumps(record, indent=2)+'\n')
print(json.dumps({key: value for key, value in record.items() if key != 'reviewedPageSha256'}))
