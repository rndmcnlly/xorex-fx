# Exported original stage art

These are **derived preservation assets**, not newly authored replacement art:

- `structies/1.svg`: first frame of `../../01-ruffle/art/structies.swf`.
- `termination/1.svg`: first frame of `../../01-ruffle/art/termination.swf`.

Both use the original 800 × 600 placement and outlined glyphs. The loader does
not display an external SWF's background, so exports omit that background.
The surrounding game supplies the original `#404040` instead.

Reproduce from the project root using checksum-pinned FFDec **26.4.0**:

```sh
uv run --script 02-decompilation/decompile.py -ignorebackground -format frame:svg -select 1 -export frame 03-svg-demake/assets/structies 01-ruffle/art/structies.swf
uv run --script 02-decompilation/decompile.py -ignorebackground -format frame:svg -select 1 -export frame 03-svg-demake/assets/termination 01-ruffle/art/termination.swf
```

No original SWF was edited. Source SHA-256 values:

```text
05b1115a4850676b1b579e38e2effecc9f53b26d6d4e67abb192f2dd0ea99fc3  structies.swf
842edefe146f50bc878895a1e70955838e54aa8d0a097e32b8c2b887fb023ea1  termination.swf
```

The existing [recovery/provenance notes](../../01-ruffle/RECOVERY.md) still apply.
Derivation does not establish redistribution permission. Publication requires
the project's explicit provenance and rights review.
