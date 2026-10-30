# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Create a new evidence bundle and serialize isolated Metal Cycles renders."""
import argparse
import json
from pathlib import Path
import struct
import subprocess
import time

HERE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--name', default=time.strftime('%Y%m%d-%H%M%S'))
parser.add_argument('--samples', type=int, default=64)
args = parser.parse_args()
assert Path(args.name).name == args.name
out = HERE / 'generated' / args.name
out.mkdir(parents=True, exist_ok=False)
subprocess.run(['node', str(HERE.parent / 'export.mjs'), str(out)], check=True)
with (out / 'render.log').open('w') as log:
    result = subprocess.run(['/Applications/Blender.app/Contents/MacOS/Blender',
                             '--background', '--factory-startup', '--python-exit-code', '1',
                             '--python', str(HERE / 'scene.py'), '--', '--out', str(out),
                             '--samples', str(args.samples)], stdout=log, stderr=subprocess.STDOUT)
if result.returncode:
    failure = {'run_id': args.name, 'phase': 'failed', 'returncode': result.returncode,
               'log': str(out / 'render.log')}
    (out / 'status.json').write_text(json.dumps(failure, indent=2))
    raise SystemExit(json.dumps(failure))
for name, size in [('board', (800, 600)), ('material-detail', (1000, 700)), ('player-detail', (700, 700))]:
    with (out / (name + '.png')).open('rb') as f: header = f.read(24)
    assert header[:8] == b'\x89PNG\r\n\x1a\n'
    assert struct.unpack('>II', header[16:24]) == size
assert (out / 'used-idealism.blend').stat().st_size > 0
assert json.loads((out / 'status.json').read_text())['phase'] == 'completed'
print(json.dumps({'completed': True, 'validated_pngs': 3, 'output': str(out)}))
