# Rights and provenance

This is a public development and preservation repository by Adam M. Smith.
Public visibility is not a blanket license grant. No project-wide open-source
or asset license has been selected; rights remain with their respective holders.
Ask before redistributing, relicensing, or incorporating material elsewhere.

## Original Xorex

Xorex was created by Adam M. Smith in 2009. The unchanged executable, external
art and MP3 files were recovered from the author's site and Kongregate. Source
URLs, sizes and hashes are in `01-ruffle/assets.json` and `RECOVERY.md`.
The executable includes historical third-party platform/ad libraries. Its
publication here does not relicense those libraries. Exported game-specific
decompilation is evidence, not the recovered original Haxe source.

## New prototypes and experimental artifacts

The new source, procedural graphics, fixtures, planning knowledge, rules-sheet
layout and generated look-development artifacts were produced for this project
under Adam's direction. They are retained as experiments, not certified original
game fidelity, final art, or a new grant for underlying third-party material.
Native Blender artifacts and large experiment outputs are held in Git LFS.

## Dependencies and fonts

- Ruffle is loaded from its pinned upstream CDN, not vendored. Upstream source,
  notices and licenses: <https://github.com/ruffle-rs/ruffle>.
- The early Three.js study loads pinned upstream MIT-licensed modules rather
  than bundling them: <https://github.com/mrdoob/three.js>.
- FFDec is a separately downloaded, checksum-verified inspection tool, not
  committed or deployed: <https://github.com/jindrapetrik/jpexs-decompiler>.
- The rules PDF embeds ReportLab's Bitstream Vera Sans fonts. Their notice is
  retained at `docs/rules/BITSTREAM-VERA-LICENSE.txt`.
- Python/Node build/test dependencies retain their upstream licenses. Caches,
  installed packages and downloaded tools are not repository assets.

Before a broader licensing release, explicitly select licenses and verify any
underlying music/sample or linked-library redistribution obligations. Do not
infer those permissions from successful extraction, a public URL, or Git LFS.
