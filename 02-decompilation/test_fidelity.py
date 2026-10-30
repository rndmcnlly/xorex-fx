"""Run: uv run python -m unittest discover -s 02-decompilation -v"""
from pathlib import Path
import struct
import unittest
import zlib

from fidelity import unpack, tags

ORIGINAL = Path(__file__).resolve().parent.parent / "01-ruffle/Xorex.swf"


class FidelityTests(unittest.TestCase):
    def test_uncompressed_length_and_background(self):
        raw = ORIGINAL.read_bytes()
        data = unpack(raw)
        self.assertEqual(len(data), struct.unpack_from("<I", raw, 4)[0])
        self.assertEqual(len(data), 95772)
        self.assertEqual(raw[3], 9)

    def test_tag_manifest_includes_abc(self):
        manifest = tags(unpack(ORIGINAL.read_bytes()))
        self.assertTrue(any(x["type"] in (72, 82) for x in manifest))
        self.assertEqual(manifest[-1]["type"], 0)

    def test_compression_does_not_change_payload(self):
        data = unpack(ORIGINAL.read_bytes())
        for level in (1, 6, 9):
            rebuilt = b"CWS" + data[3:8] + zlib.compress(data[8:], level)
            self.assertEqual(unpack(rebuilt), data)

    def test_invalid_length_rejected(self):
        raw = ORIGINAL.read_bytes()
        with self.assertRaises(AssertionError):
            unpack(raw[:4] + b"\x00\x00\x00\x00" + raw[8:])

    def test_actual_xml_roundtrip_if_present(self):
        candidate = ORIGINAL.parent.parent / "02-decompilation/generated/xml-roundtrip.swf"
        if not candidate.exists():
            self.skipTest("Run decompile.py for actual FFDec roundtrip")
        self.assertEqual(unpack(candidate.read_bytes()), unpack(ORIGINAL.read_bytes()))


if __name__ == "__main__":
    unittest.main()
