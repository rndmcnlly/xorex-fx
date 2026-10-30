# Printable Xorex rules

- **`xorex-rules.pdf`**: one US Letter portrait page, vector text and line art.
- **`xorex-rules-preview.png`**: 180 dpi grayscale visual check.
- **`generate.py`**: small ReportLab generator with pinned inline dependencies.
- **`quality-checks.json`**: page count, size, embedding and boundary checks.
- **`VOCABULARY.md`**: original move vocabulary and current feedback mappings.

Rebuild from the project root:

```sh
uv run --script docs/rules/generate.py
```

Print at actual size on US Letter, or “fit to printable area” on A4. White paper,
no large filled backgrounds, no color-dependent instructions. Font sizes are
9.1–10.2 pt for body copy. Letter-label orbs are a print-specific explanatory
notation, not a claim that the browser game's gems carry letters.

## Content and design provenance

Rules were checked against `../../02-decompilation/MECHANICS.md`, the recovered
`Main.as`, `ShipModel.as` and `CombatModel.as`, and the maintained
`../../03-svg-demake/model.mjs`. Original move/store terms were checked by
rendering and visually reading `../../03-svg-demake/assets/structies/1.svg`.
Feedback meaning follows `../../04-rendering-lab/motion-playable/FEEDBACK-PLAN.md`
and `feedback.mjs`. See `VOCABULARY.md` for detailed mappings and the distinction
between historical wording and provisional feedback labels.

The sheet's original layout, key icons, lettered orbs and line-art chevrons are
generated here. The chevron echoes the recovered ship's simple geometric mark;
no original image, logo outline, audio or commercial asset is embedded.
Bitstream Vera Sans regular and bold are embedded from ReportLab's bundled font
files. Their permissive Bitstream Vera license is shipped with ReportLab under
`reportlab/fonts/bitstream-vera-license.txt`; no paid font is required. Package
licenses and project publication rights still merit review before distribution.
No license is inferred for recovered game assets.

## Scope and quality checks

The generator checks one page, all text within the page, and grayscale text,
then renders a grayscale preview with PyMuPDF. The preview is also read visually
for wrapping, spacing, clipping and diagram clarity. All drawn content is
grayscale vector art; all used fonts are embedded and text is searchable.

The brief sheet deliberately omits spawn probabilities, simulation-frame timing,
initialization details and the original ready-screen gesture. The 15-gem limit
is a beginner-facing simplification of the actual per-frame loss check: a
transient overflow can be rescued before that check. There is no board-clear
win condition, no color-dependent firing damage, no invented score or cooldown.
