"""Canonical application text only; evidence and PDF bytes must never use this policy."""
from pathlib import Path, PurePosixPath
import hashlib
import re
import subprocess

SOURCE_HASH_POLICY = 'utf8-crlf-to-lf-v1'


def canonical_source_bytes(value: bytes) -> bytes:
    # Validate text, but preserve every byte except a CR immediately followed by LF.
    # Do not strip whitespace, BOMs, lone CRs or final newlines.
    value.decode('utf-8')
    assert b'\0' not in value, 'Application fingerprint inputs must be UTF-8 text'
    return value.replace(b'\r\n', b'\n')


def source_sha256(value: bytes) -> str:
    return hashlib.sha256(canonical_source_bytes(value)).hexdigest()


def git_source_bytes(root: Path, revision: str, filename: str) -> bytes:
    return subprocess.check_output(
        ['git', '-c', f'safe.directory={root.as_posix()}',
         'cat-file', 'blob', f'{revision}:{filename}'], cwd=root)


def verify_application_sources(root: Path, revision: str, rows: list,
                               *, read_working=None, read_git=None) -> dict:
    """Check recorded provenance, approved Git text AND actual working-file text.

    Original raw fingerprints remain untouched. They must identify either the LF
    or CRLF representation of the approved blob, never arbitrary current content.
    Injectable byte readers let regression tests simulate EOLs without touching
    the application's working files; the CLI always uses actual files/Git blobs.
    """
    assert re.fullmatch(r'[0-9a-f]{40}', revision), 'Expected full application revision'
    read_working = read_working or (lambda name: (root/name).read_bytes())
    read_git = read_git or (lambda name: git_source_bytes(root, revision, name))
    canonical_hashes = {}
    for row in rows:
        name = row['file']
        path = PurePosixPath(name)
        assert not path.is_absolute() and '..' not in path.parts and '\\' not in name, name
        assert name.startswith(('server/src/', 'server/prisma/', 'client/src/')), name
        assert name not in canonical_hashes, f'Duplicate source fingerprint: {name}'
        blob = read_git(name)
        canonical = canonical_source_bytes(blob)
        original_variants = {blob, canonical, canonical.replace(b'\n', b'\r\n')}
        assert row['sha256'] in {
            hashlib.sha256(value).hexdigest() for value in original_variants
        }, f'Recorded source fingerprint differs from approved Git content: {name}'
        expected = hashlib.sha256(canonical).hexdigest()
        assert source_sha256(read_working(name)) == expected, (
            f'Application source content differs from approved revision {revision[:7]}: {name}')
        canonical_hashes[name] = expected
    assert canonical_hashes, 'Application source fingerprint list must not be empty'
    return canonical_hashes
