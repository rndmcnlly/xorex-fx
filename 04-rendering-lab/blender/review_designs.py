#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
"""Verify the nine renders and build a compact review contact sheet."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
args = parser.parse_args()
names = [('reliquary', 'A · Obsidian Reliquary'), ('pelagic', 'B · Pelagic Instrument'), ('archive', 'C · Magnetic Archive')]
sheet = Image.new('RGB', (1440, 960), '#202526')
draw = ImageDraw.Draw(sheet)
evidence = []
for index, (name, title) in enumerate(names):
    x = index * 480
    draw.text((x + 12, 12), title, fill='#eeeeea')
    for shot, size, y, thumb in [('board', (800, 600), 40, (480, 360)),
                                ('marbles', (800, 400), 420, (480, 240)),
                                ('player', (600, 400), 680, (420, 280))]:
        path = args.directory / f'{name}-{shot}.png'
        with Image.open(path) as image:
            image.load()
            assert image.size == size, str(path)
            sheet.paste(image.convert('RGB').resize(thumb, Image.Resampling.LANCZOS), (x + (480 - thumb[0]) // 2, y))
        evidence.append({'path': path.name, 'dimensions': size, 'bytes': path.stat().st_size})
    assert (args.directory / f'{name}.blend').stat().st_size > 0
sheet.save(args.directory / 'contact-sheet.jpg', quality=94)
(args.directory / 'verified-images.json').write_text(json.dumps(evidence, indent=2) + '\n')
print(f'Verified {len(evidence)} complete renders and three native checkpoints; contact-sheet.jpg saved')
