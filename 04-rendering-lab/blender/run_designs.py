#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Serial GPU renders of three complete art-direction proposals."""
import argparse
from datetime import datetime
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=HERE / 'generated' / ('designs-' + datetime.now().strftime('%Y%m%d-%H%M%S')))
    parser.add_argument('--design', choices=['all', 'reliquary', 'pelagic', 'archive'], default='all')
    parser.add_argument('--blender', default='/Applications/Blender.app/Contents/MacOS/Blender')
    args = parser.parse_args()
    out = args.out.resolve(); out.mkdir(parents=True, exist_ok=False)
    subprocess.run(['node', str(HERE / 'export.mjs'), str(out)], check=True)
    print(f'Output: {out}\nProgress: {out / "status.json"}\nRaw log: {out / "render.log"}', flush=True)
    command = [args.blender, '--background', '--factory-startup', '--python-exit-code', '1',
               '--python', str(HERE / 'designs.py'), '--', '--out', str(out),
               '--input', str(out / 'study.json'), '--design', args.design]
    with (out / 'render.log').open('w') as log:
        result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    if result.returncode:
        print((out / 'render.log').read_text()[-6000:])
        raise SystemExit(result.returncode)
    print(f'Completed {args.design}: {out}', flush=True)
