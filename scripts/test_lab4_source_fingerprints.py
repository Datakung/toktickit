"""Run with python -m unittest discover -s scripts -p test_lab4_source_fingerprints.py."""
from pathlib import Path
import hashlib
import json
import unittest

from lab4_source_fingerprints import (
    canonical_source_bytes, git_source_bytes, source_sha256, verify_application_sources)

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT/'artifacts/lab-04/final-main'
REVISION = json.loads((EVIDENCE/'gate/manifest.json').read_text(encoding='utf-8-sig'))['revision']
ROWS = json.loads((EVIDENCE/'application-fingerprints.json').read_text(encoding='utf-8-sig'))
NAME = 'server/src/index.ts'
TEXT = b'export const value = 1;\n\n'
SHA = lambda value: hashlib.sha256(value).hexdigest()


class CanonicalSourceTests(unittest.TestCase):
    def verify(self, working=TEXT, blob=TEXT, recorded=None):
        return verify_application_sources(
            ROOT, REVISION, [{'file': NAME, 'sha256': SHA(recorded or blob)}],
            read_working=lambda _: working, read_git=lambda _: blob)

    def test_lf_and_crlf_are_equivalent(self):
        self.assertEqual(source_sha256(TEXT), source_sha256(TEXT.replace(b'\n', b'\r\n')))

    def test_original_lf_and_crlf_fingerprints_and_git_blobs(self):
        for blob in [TEXT, TEXT.replace(b'\n', b'\r\n')]:
            for recorded in [TEXT, TEXT.replace(b'\n', b'\r\n')]:
                for working in [TEXT, TEXT.replace(b'\n', b'\r\n')]:
                    with self.subTest(blob=blob, recorded=recorded, working=working):
                        self.assertEqual(self.verify(working, blob, recorded)[NAME], SHA(TEXT))

    def test_mixed_eol_only_is_equivalent(self):
        self.verify(TEXT.replace(b'1;\n', b'1;\r\n'))

    def test_real_source_edit_is_rejected(self):
        with self.assertRaisesRegex(AssertionError, 'Application source content differs'):
            self.verify(TEXT.replace(b'1;', b'2;'))

    def test_real_edit_in_crlf_source_is_rejected(self):
        with self.assertRaisesRegex(AssertionError, 'Application source content differs'):
            self.verify(TEXT.replace(b'1;', b'2;').replace(b'\n', b'\r\n'))

    def test_whitespace_edit_is_not_normalized_away(self):
        with self.assertRaises(AssertionError):
            self.verify(TEXT.replace(b'1;', b'1; '))

    def test_final_newline_change_is_rejected(self):
        with self.assertRaises(AssertionError):
            self.verify(TEXT.rstrip(b'\n'))

    def test_bom_change_is_rejected(self):
        with self.assertRaises(AssertionError):
            self.verify(b'\xef\xbb\xbf'+TEXT)

    def test_lone_cr_is_preserved(self):
        self.assertEqual(canonical_source_bytes(b'a\rb\r\nc\n'), b'a\rb\nc\n')

    def test_binary_or_non_utf8_is_rejected(self):
        for value in [b'a\0b', b'a\xffb']:
            with self.subTest(value=value), self.assertRaises((AssertionError, UnicodeDecodeError)):
                self.verify(value)

    def test_fingerprint_cannot_be_changed_to_accept_an_edit(self):
        modified = TEXT.replace(b'1;', b'2;')
        with self.assertRaisesRegex(AssertionError, 'Recorded source fingerprint differs'):
            self.verify(modified, recorded=modified)

    def test_unsafe_path_and_revision_are_rejected(self):
        for name in ['/server/src/index.ts', 'server/src/../index.ts', 'evidence/file.ts']:
            with self.subTest(name=name), self.assertRaises(AssertionError):
                verify_application_sources(ROOT, REVISION, [{'file': name, 'sha256': SHA(TEXT)}])
        with self.assertRaises(AssertionError):
            verify_application_sources(ROOT, 'HEAD', ROWS)

    def test_duplicate_and_empty_records_are_rejected(self):
        with self.assertRaises(AssertionError):
            verify_application_sources(ROOT, REVISION, [])
        row = {'file': NAME, 'sha256': SHA(TEXT)}
        with self.assertRaises(AssertionError):
            verify_application_sources(ROOT, REVISION, [row, row],
                                       read_git=lambda _: TEXT, read_working=lambda _: TEXT)


class ActualApprovedSourcesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.blobs = {row['file']: git_source_bytes(ROOT, REVISION, row['file']) for row in ROWS}

    def validate(self, reader):
        return verify_application_sources(ROOT, REVISION, ROWS,
                                          read_git=self.blobs.__getitem__, read_working=reader)

    def test_all_68_actual_sources_as_lf(self):
        hashes = self.validate(lambda name: canonical_source_bytes(self.blobs[name]))
        self.assertEqual(len(hashes), 68)

    def test_all_68_actual_sources_as_crlf(self):
        hashes = self.validate(lambda name: canonical_source_bytes(self.blobs[name]).replace(b'\n', b'\r\n'))
        self.assertEqual(len(hashes), 68)

    def test_each_actual_source_detects_a_real_modification(self):
        for row in ROWS:
            name = row['file']
            with self.subTest(name=name), self.assertRaisesRegex(AssertionError, name):
                self.validate(lambda filename: self.blobs[filename]+(b'\n// changed\n' if filename == name else b''))

    def test_current_actual_working_tree(self):
        self.assertEqual(len(verify_application_sources(ROOT, REVISION, ROWS)), 68)


if __name__ == '__main__':
    unittest.main()
