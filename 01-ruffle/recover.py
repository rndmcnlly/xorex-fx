#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Verify the preservation copy, optionally restore missing original assets."""
from pathlib import Path
import argparse
import hashlib
import json
import urllib.request

HERE = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch", action="store_true", help="restore missing files only")
    args = parser.parse_args()
    manifest = json.loads((HERE / "assets.json").read_text())
    for asset in manifest:
        path = HERE / asset["path"]
        assert path.resolve().is_relative_to(HERE)
        if not path.exists():
            if not args.fetch:
                raise SystemExit(f"Missing {asset['path']}; use --fetch to restore")
            data = urllib.request.urlopen(asset["url"], timeout=60).read()
            assert hashlib.sha256(data).hexdigest() == asset["sha256"], asset["path"]
            assert len(data) == asset["bytes"], asset["path"]
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("xb") as file:
                file.write(data)
        data = path.read_bytes()
        assert hashlib.sha256(data).hexdigest() == asset["sha256"], f"Mismatch: {path}; will not overwrite"
        assert len(data) == asset["bytes"]
        print(f"OK {asset['path']} ({len(data):,} bytes)")
    print(f"Verified {len(manifest)} immutable original assets")


if __name__ == "__main__":
    main()
