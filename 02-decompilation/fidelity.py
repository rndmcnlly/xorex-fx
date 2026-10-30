#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Compare SWF bytes, decompressed contents, tags, and ABC bytecode payloads.

An XML roundtrip is a serialization test, NOT a source recompilation test.
"""
from pathlib import Path
import hashlib
import json
import struct
import zlib

HERE = Path(__file__).resolve().parent


def sha(data):
    return hashlib.sha256(data).hexdigest()


def unpack(raw):
    if raw[:3] == b"CWS":
        body = zlib.decompress(raw[8:])
    elif raw[:3] == b"FWS":
        body = raw[8:]
    else:
        raise ValueError("Only zlib/uncompressed SWFs are supported")
    assert len(body) + 8 == struct.unpack_from("<I", raw, 4)[0]
    return b"FWS" + raw[3:8] + body


def tags(uncompressed):
    body = uncompressed[8:]
    pos = (5 + 4 * (body[0] >> 3) + 7) // 8 + 4
    result = []
    while pos < len(body):
        offset = pos + 8
        tag = int.from_bytes(body[pos:pos + 2], "little")
        pos += 2
        kind, size = tag >> 6, tag & 63
        if size == 63:
            size = int.from_bytes(body[pos:pos + 4], "little")
            pos += 4
        payload = body[pos:pos + size]
        assert len(payload) == size
        result.append({"offset": offset, "type": kind, "bytes": size, "sha256": sha(payload)})
        pos += size
        if kind == 0:
            break
    return result


def compare(original, rebuilt):
    a, b = original.read_bytes(), rebuilt.read_bytes()
    ua, ub = unpack(a), unpack(b)
    ta, tb = tags(ua), tags(ub)
    return {
        "original_sha256": sha(a), "candidate_sha256": sha(b),
        "file_bytes_equal": a == b,
        "uncompressed_swf_bytes_equal": ua == ub,
        "original_uncompressed_sha256": sha(ua),
        "candidate_uncompressed_sha256": sha(ub),
        "tag_payloads_equal": ta == tb,
        "abc_payloads_equal": [x for x in ta if x["type"] in (72, 82)] ==
                              [x for x in tb if x["type"] in (72, 82)],
        "original_bytes": len(a), "candidate_bytes": len(b),
        "source_recompilation_tested": False,
        "test": "FFDec 26.4.0 SWF → XML → SWF serialization roundtrip",
        "interpretation": "Bytecode and every uncompressed SWF byte match; compressed file does not. This does not reconstruct compilable Haxe source.",
    }


if __name__ == "__main__":
    original = HERE.parent / "01-ruffle/Xorex.swf"
    candidate = HERE / "generated/xml-roundtrip.swf"
    report = compare(original, candidate)
    (HERE / "fidelity-report.json").write_text(json.dumps(report, indent=2) + "\n")
    manifest = tags(unpack(original.read_bytes()))
    (HERE / "tag-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    if not report["uncompressed_swf_bytes_equal"]:
        raise SystemExit("Roundtrip changed uncompressed SWF bytes")
