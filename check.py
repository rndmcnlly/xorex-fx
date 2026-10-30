#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Run local preservation, recovery, and JavaScript checks without a browser."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
COMMANDS = [
    [sys.executable, "01-ruffle/recover.py"],
    [sys.executable, "-m", "unittest", "discover", "-s", "02-decompilation", "-v"],
    ["node", "--test", "03-svg-demake/model.test.mjs"],
    ["node", "--test", "03-svg-demake/view.test.mjs"],
    ["node", "--check", "03-svg-demake/app.mjs"],
    ["node", "04-rendering-lab/fixture.test.mjs"],
    ["node", "--check", "04-rendering-lab/lab.js"],
    ["node", "--test", "04-rendering-lab/blender/export.test.mjs"],
    ["node", "--test", "04-rendering-lab/p3-playable/palette.test.mjs"],
    ["node", "--test", "04-rendering-lab/motion-playable/motion.test.mjs"],
    ["node", "--test", "04-rendering-lab/motion-playable/feedback.test.mjs"],
    ["node", "--test", "05-autoplay-lab/lab.test.mjs"],
    ["node", "--test", "05-autoplay-lab/perf-regression.test.mjs", "05-autoplay-lab/tuning.test.mjs"],
    ["node", "--test", "05-autoplay-lab/curriculum.test.mjs"],
    ["node", "--test", "05-autoplay-lab/htn.test.mjs"],
    ["node", "--test", "06-autoplay-playable/controller.test.mjs"],
    ["node", "--test", "06-autoplay-playable/integration.test.mjs"],
    ["node", "--test", "06-autoplay-playable/live-policy.test.mjs"],
]

if __name__ == "__main__":
    for cmd in COMMANDS:
        print("\n" + " ".join(cmd), flush=True)
        subprocess.run(cmd, cwd=ROOT, check=True)
