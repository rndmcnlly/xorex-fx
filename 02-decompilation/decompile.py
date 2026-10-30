#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Download a verified FFDec and export to generated/, never modify originals."""
from pathlib import Path
import hashlib
import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
VERSION = "26.4.0"
URL = f"https://github.com/jindrapetrik/jpexs-decompiler/releases/download/version{VERSION}/ffdec_{VERSION}.zip"
SHA256 = "56ce960aeafc7caf034e2052ba49f878a883f7c7ca690da6eeffca9587b5e4b9"
ORIGINAL_SHA256 = "53514361d3f332e24000a54fad39ec554f289e583b3cab061cb64633621bbbb7"


def main():
    original = ROOT / "01-ruffle/Xorex.swf"
    assert hashlib.sha256(original.read_bytes()).hexdigest() == ORIGINAL_SHA256
    cache = HERE / ".cache"
    cache.mkdir(exist_ok=True)
    archive = cache / f"ffdec_{VERSION}.zip"
    if not archive.exists():
        print(f"Downloading {URL}", flush=True)
        urllib.request.urlretrieve(URL, archive)
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == SHA256, "FFDec checksum mismatch"
    tool = cache / f"ffdec-{VERSION}"
    if not (tool / "ffdec.jar").exists():
        with zipfile.ZipFile(archive) as z:
            for name in z.namelist():
                assert (tool / name).resolve().is_relative_to(tool.resolve()), name
            z.extractall(tool)
    java = os.environ.get("JAVA") or (
        "/opt/homebrew/opt/openjdk/bin/java"
        if Path("/opt/homebrew/opt/openjdk/bin/java").exists()
        else shutil.which("java")
    )
    if not java:
        raise SystemExit("Java required; set JAVA to the executable path")
    base = [java, "-Djava.awt.headless=true", "-jar", str(tool / "ffdec.jar")]
    if len(sys.argv) > 1:
        subprocess.run(base + sys.argv[1:], check=True)
        return
    for name, file in [
        ("xorex", original),
        ("structies", ROOT / "01-ruffle/art/structies.swf"),
        ("termination", ROOT / "01-ruffle/art/termination.swf"),
    ]:
        subprocess.run(base + ["-export", "script,shape", str(HERE / "generated" / name), str(file)], check=True)
    subprocess.run(base + ["-format", "script:pcode", "-export", "script",
                          str(HERE / "generated/pcode"), str(original)], check=True)
    xml = HERE / "generated/xorex.xml"
    subprocess.run(base + ["-swf2xml", str(original), str(xml)], check=True)
    subprocess.run(base + ["-xml2swf", str(xml), str(HERE / "generated/xml-roundtrip.swf")], check=True)
    # Keep small, unchanged game-specific exports reviewable in the repository.
    # Full tool/runtime/platform exports remain reproducible under generated/.
    for source, folder, suffix in [
        (HERE / "generated/xorex/scripts/§as§/adamsmith/xorex", "as", ".as"),
        (HERE / "generated/pcode/scripts/§as§/adamsmith/xorex", "pcode", ".pcode"),
    ]:
        target = HERE / "recovered" / folder
        target.mkdir(parents=True, exist_ok=True)
        for file in source.glob("*" + suffix):
            shutil.copyfile(file, target / file.name)
    subprocess.run([sys.executable, str(HERE / "inspect.py")], check=True)
    shutil.copyfile(HERE / "generated/initializer.txt", HERE / "recovered/initializer.txt")
    subprocess.run([sys.executable, str(HERE / "fidelity.py")], check=True)


if __name__ == "__main__":
    main()
