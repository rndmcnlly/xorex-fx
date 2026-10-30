# 01: Ruffle resurrection

The working preservation reference: unchanged Xorex SWF plus original external
art and sound files. These are the canonical recovered assets for now; later
subprojects should reference them rather than duplicate them.

Serve the project root with `python3 -m http.server 8765 --bind 127.0.0.1`,
then open <http://127.0.0.1:8765/01-ruffle/>.

Read [RECOVERY.md](RECOVERY.md) for source URLs, executable checksum,
startup behavior, and verification limits. Ruffle is currently CDN-loaded,
not vendored, pinned to **0.7.1**. Offline emulator packaging remains future work.

Verify immutable recovered assets with:

```sh
uv run --script 01-ruffle/recover.py
```

`--fetch` restores missing files from their original public URLs, checks hashes
before saving, and refuses to overwrite a mismatching existing file.
`assets.json` records URLs, sizes, and SHA-256 hashes for all 11 original assets.

The stage background must be `#404040`. A black override hides original art.
The helper controls text comes from the old Kongregate listing; the game's own
instructions are more specific: DOWN collects/converts, UP replaces/fires.
