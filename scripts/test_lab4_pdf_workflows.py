"""Exercise historical-review preservation and submission build/check together.

All generated PDFs/QA records stay in a disposable local Git checkout. The
author's delivered PDFs, recorded visual acceptance and evidence are not edited.
Run: python -m unittest discover -s scripts -p test_lab4_pdf_workflows.py -v
"""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
HISTORICAL = (
    'output/pdf/TokTickIT-Lab4-Review.pdf',
    'artifacts/lab-04/final-main/pdf-check.json',
    'artifacts/lab-04/final-main/pdf-review.json',
)
DELIVERED = HISTORICAL + (
    'output/pdf/TokTickIT-Lab4-Submission.pdf',
    'artifacts/lab-04/final-main/submission/pdf-check.json',
    'artifacts/lab-04/final-main/submission/pdf-review.json',
)


def hashes(root, paths):
    return {name: hashlib.sha256((root/name).read_bytes()).hexdigest() for name in paths}


class PdfWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Windows sandbox system-temp paths may not be writable by Git child
        # processes; keep this disposable checkout in the task's temp workspace.
        temp_root = ROOT.parent/'tmp/pdfs'
        temp_root.mkdir(parents=True, exist_ok=True)
        cls.temp = tempfile.TemporaryDirectory(prefix='lab4-pdf-workflows-', dir=temp_root)
        cls.addClassCleanup(cls.temp.cleanup)
        cls.checkout = Path(cls.temp.name)/'checkout'
        clone = subprocess.run(
            ['git', '-c', f'safe.directory={ROOT.as_posix()}', 'clone',
             '--shared', '--no-checkout', str(ROOT), str(cls.checkout)],
            capture_output=True, text=True, timeout=120)
        if clone.returncode:
            raise RuntimeError(clone.stdout+clone.stderr)
        checkout = subprocess.run(
            ['git', '-c', f'safe.directory={cls.checkout.as_posix()}',
             '-c', 'core.autocrlf=false', 'checkout', '--detach', 'HEAD'],
            cwd=cls.checkout, capture_output=True, text=True, timeout=120)
        if checkout.returncode:
            raise RuntimeError(checkout.stdout+checkout.stderr)
        # Test current tooling, including uncommitted fixes, against the exact
        # tracked PDF/evidence fixture. Never copy generated working artifacts.
        for name in ['build-lab4-review.py', 'check-lab4-review.py', 'lab4_source_fingerprints.py']:
            shutil.copyfile(ROOT/'scripts'/name, cls.checkout/'scripts'/name)

    def run_script(self, name, *args, root=None):
        root = root or self.checkout
        return subprocess.run([sys.executable, str(root/'scripts'/name), *map(str, args)],
                              cwd=root, capture_output=True, text=True, timeout=300)

    def assert_passes(self, result):
        self.assertEqual(result.returncode, 0, result.stdout+result.stderr)
        return json.loads(result.stdout.strip().splitlines()[-1])

    def test_default_refuses_without_any_artifact_write_and_review_check_passes(self):
        before = hashes(self.checkout, DELIVERED)
        result = self.run_script('build-lab4-review.py')
        self.assertEqual(result.returncode, 2, result.stdout+result.stderr)
        self.assertIn('Historical review rebuild is retired', result.stderr)
        self.assertIn('--submission', result.stderr)
        self.assertEqual(hashes(self.checkout, DELIVERED), before)
        self.assertFalse((self.checkout/'output/pdf/TokTickIT-Lab4-Review-unattached.pdf').exists())
        record = self.checkout/'review-workflow-check.json'
        checked = self.assert_passes(self.run_script('check-lab4-review.py', '--record-path', record))
        self.assertEqual(checked['phase'], 'review-copy')
        self.assertEqual(checked['embeddedFilesByteVerified'], 17)
        self.assertEqual(checked['pdfSha256'], before[HISTORICAL[0]])
        self.assertEqual(hashes(self.checkout, DELIVERED), before)

    def test_default_refuses_before_evidence_reads_or_output_directory_creation(self):
        minimal = Path(self.temp.name)/'no-evidence'
        (minimal/'scripts').mkdir(parents=True)
        shutil.copyfile(ROOT/'scripts/build-lab4-review.py', minimal/'scripts/build-lab4-review.py')
        result = self.run_script('build-lab4-review.py', root=minimal)
        self.assertEqual(result.returncode, 2, result.stdout+result.stderr)
        self.assertIn('Historical review rebuild is retired', result.stderr)
        self.assertFalse((minimal/'output').exists())
        self.assertFalse((minimal/'artifacts').exists())

    def test_submission_rebuild_and_check_pass_without_changing_historical_artifacts(self):
        before = hashes(self.checkout, HISTORICAL)
        submission_qa = self.checkout/'artifacts/lab-04/final-main/submission/pdf-review.json'
        original_qa = submission_qa.read_bytes()
        built = self.assert_passes(self.run_script('build-lab4-review.py', '--submission'))
        self.assertEqual(built['pages'], 54)
        self.assertEqual(built['attachments'], 21)
        record = self.checkout/'submission-workflow-check.json'
        checked = self.assert_passes(self.run_script('check-lab4-review.py', '--submission', '--record-path', record))
        self.assertEqual(checked['phase'], 'submission')
        self.assertEqual(checked['embeddedFilesByteVerified'], 21)
        self.assertEqual(checked['pages'], 54)
        self.assertTrue(checked['allPageSizesVerified'])
        self.assertEqual(checked['partOrder'], list('123456789'))
        self.assertEqual(checked['pdfSha256'], hashes(self.checkout, [DELIVERED[3]])[DELIVERED[3]])
        self.assertEqual(hashes(self.checkout, HISTORICAL), before)
        self.assertEqual(submission_qa.read_bytes(), original_qa)
        # Re-check review mode after a successful submission rebuild as well.
        self.assert_passes(self.run_script('check-lab4-review.py', '--record-path', self.checkout/'after-submission-review-check.json'))
        self.assertEqual(hashes(self.checkout, HISTORICAL), before)


if __name__ == '__main__':
    unittest.main()
