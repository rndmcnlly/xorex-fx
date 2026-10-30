#!/usr/bin/env python3
"""Audit staged publication paths and verify every staged LFS pointer's content."""
from pathlib import Path
import hashlib
import subprocess

ROOT = Path(__file__).resolve().parent.parent
FORBIDDEN = {'.cache', '.venv', 'node_modules', '__pycache__', '.openchamber',
             'private', '.chrome-profile', 'bl-state', 'dist'}


def main():
    raw = subprocess.check_output(['git', 'ls-files', '--stage', '-z'], cwd=ROOT)
    records = []
    for entry in raw.split(b'\0'):
        if not entry: continue
        metadata, name = entry.split(b'\t', 1)
        mode, oid, stage = metadata.decode().split()
        path = Path(name.decode())
        assert not FORBIDDEN.intersection(path.parts), f'Private/tool path staged: {path}'
        assert path.name == '.env.example' or not path.name.startswith('.env'), f'Environment file staged: {path}'
        assert path.suffix not in {'.pem', '.p12', '.key'}, f'Credential-like file staged: {path}'
        assert mode == '100644' or mode == '100755', f'Nonregular entry staged: {path}'
        assert stage == '0', f'Unmerged entry: {path}'
        records.append((path, oid))
    assert records, 'No staged files'
    lfs_count, lfs_bytes, normal_bytes = 0, 0, 0
    for path, oid in records:
        staged = subprocess.check_output(['git', 'cat-file', 'blob', oid], cwd=ROOT)
        if staged.startswith(b'version https://git-lfs.github.com/spec/v1\n'):
            lines = staged.decode().splitlines()
            expected_sha = next(x.removeprefix('oid sha256:') for x in lines if x.startswith('oid sha256:'))
            expected_size = int(next(x.removeprefix('size ') for x in lines if x.startswith('size ')))
            data = (ROOT / path).read_bytes()
            assert len(data) == expected_size and hashlib.sha256(data).hexdigest() == expected_sha, f'LFS mismatch: {path}'
            lfs_count += 1; lfs_bytes += len(data)
        else:
            assert len(staged) < 10 * 1024 * 1024, f'Unexpected large non-LFS object: {path}'
            normal_bytes += len(staged)
    print(f'Index audited: {len(records)} files; {lfs_count} verified LFS pointers '
          f'({lfs_bytes / 1048576:.2f} MiB content); ordinary Git text {normal_bytes / 1048576:.2f} MiB')


if __name__ == '__main__': main()
