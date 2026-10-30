#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Export real model snapshots and build/render an isolated Blender study."""
import argparse
from datetime import datetime
from pathlib import Path
import shutil
import struct
import subprocess

HERE = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=HERE / 'generated' / datetime.now().strftime('%Y%m%d-%H%M%S'))
    parser.add_argument('--snapshot', default='white-held')
    parser.add_argument('--samples', type=int, default=32)
    parser.add_argument('--engine', choices=['CYCLES', 'BLENDER_EEVEE'], default='CYCLES')
    parser.add_argument('--render', action='store_true')
    parser.add_argument('--blender', default=shutil.which('blender') or '/Applications/Blender.app/Contents/MacOS/Blender')
    args = parser.parse_args()
    args.out = args.out.resolve()
    args.out.mkdir(parents=True, exist_ok=False)
    # Freeze the exact input bundle beside the .blend, not a mutable global fixture.
    subprocess.run(['node', str(HERE / 'export.mjs'), str(args.out)], check=True)
    command = [args.blender, '--background', '--factory-startup', '--python-exit-code', '1',
               '--python', str(HERE / 'scene.py'), '--', '--input', str(args.out / 'study.json'),
               '--out', str(args.out), '--snapshot', args.snapshot, '--engine', args.engine,
               '--samples', str(args.samples)]
    if args.render: command.append('--render')
    print(f'Isolated Blender run: {args.out}\nRaw log: {args.out / "render.log"}\nProgress: {args.out / "status.json"}', flush=True)
    with (args.out / 'render.log').open('w') as log:
        result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    if result.returncode:
        print((args.out / 'render.log').read_text()[-6000:])
        raise SystemExit(result.returncode)
    assert (args.out / 'xorex-lookdev.blend').stat().st_size > 0
    if args.render:
        for enabled in ('off', 'on'):
            path = args.out / f'{args.snapshot}-media-{enabled}.png'
            data = path.read_bytes()
            assert data[:8] == b'\x89PNG\r\n\x1a\n'
            assert struct.unpack('>II', data[16:24]) == (800, 600)
            print(f'Verified 800×600 PNG: {path}', flush=True)
    print(f'Complete: {args.out / "xorex-lookdev.blend"}', flush=True)


if __name__ == '__main__':
    main()
