# Playable P3 / luminous plastic

An independent browser presentation of the accepted Xorex mechanics. No build,
runtime dependency, CDN, copied sound, or modified preservation artifact.
Serve the **project root**, not this folder:

```sh
python3 -m http.server 8772 --bind 127.0.0.1
```

Open <http://127.0.0.1:8772/04-rendering-lab/p3-playable/>. Stop the server with
Ctrl-C when finished. This study does not require an already-running server.

Up/Down starts without acting. Left/right selects a lane; Down gathers or
converts; Up replaces inventory or spends one capacitor unit to shoot one enemy.
Each key has its own edge latch: release before pressing the same key again.
Game-over Up/Down starts a new game. Sound effects are **off by default** and
reference original files directly only when enabled. No music is loaded.

## Preserved behavior and presentation proposals

`../../03-svg-demake/model.mjs` and `input.mjs` are imported, unchanged. Rules,
weighted random arrivals, initial 20 enemies, independent 30 Hz simulation,
start semantics, and repeat suppression are shared, not reimplemented. There
are no animation gates or queued moves: input and frames render synchronously.
The same no-backlog timer and hidden-tab suspension adaptations as the accepted
port apply. Normal play uses browser `Math.random`; `?seed=2009` is an optional
Mulberry32 fixture, not historical Flash randomness. `?inspect` alone exposes
paused fixture import and state export for browser tests. Developer pause/step
are separately labeled and are not game mechanics.

The 800 × 600 / 20-lane composition, top-origin 40 px stacks, y540 ship,
inventory rings at y500 and capacitor chevrons below the ship are retained.
Rings/chevrons remain count marks, with exact text counts when glyphs leave the
viewport. A plain geometry toggle preserves state; the accepted SVG reference
is also linked. Initial/game-over instructional panels are new text, not copies
of recovered art. The accepted port's decorative entrances are intentionally
omitted: the whole board is immediately readable.

**Design proposal:** abstract, almost Euclidean flat plastic pucks with pigment
cores, a narrow lower lip, two restrained top streaks, and a small radial aura.
Black has a dark core and modest readable rim, not colored emission. White is
neutral white. The field is the original quiet `#404040`. There is no volumetric
light, PBR, ray tracing, bloom filter, or realistic marble simulation. The tiny
streak variation stands in for top-heavy grease; dust simulation is omitted.

## Actual color management, not an HDR claim

- A real Canvas 2D `colorSpace: 'display-p3'` context is requested and its
  `getContextAttributes().colorSpace` is checked, not inferred from CSS borders.
- Saturated gameplay cores, rings, and capacitor strokes use explicit
  `color(display-p3 ...)` strings indexed by **model color ID**. All five
  chromatic pigment choices have mathematically out-of-sRGB-gamut channels.
- P3 requires CSS color parsing, an actual P3 context, and a true browser
  `(color-gamut: p3)` query. Otherwise the renderer uses a real sRGB context
  and the accepted original sRGB ID palette. The panel reports the distinction.
- Canvas context options cannot change after creation: the toggle replaces only
  the canvas, never the game state, RNG, keyboard handler, or simulation timer.
  Comparison uses corresponding saturated primary palettes, not a guaranteed
  constant-luminance perceptual match. Pause first for a frozen A/B.
- Gamut/HDR media queries are evidence from the browser, not a physical display
  measurement. Capabilities are sampled at page load: reload after moving to
  another display. **P3 is SDR wider gamut, not HDR or increased luminance.**
  White is not brighter than SDR white. Display calibration, OS compositing,
  browser support, and hardware determine what is actually visible.
- Screenshots and chat image previews may convert to sRGB or omit profiles.
  They show composition, not verified optical wide-gamut output.

## Verify

```sh
node --test 03-svg-demake/model.test.mjs 03-svg-demake/view.test.mjs 04-rendering-lab/p3-playable/palette.test.mjs
uv run --script 04-rendering-lab/p3-playable/smoke.py
```

The smoke script uses isolated, muted Playwright Chromium, creates its own
loopback server on a free ephemeral port, and closes both even on failure.
It needs an existing Playwright Chromium cache; it does not install a browser.
`generated/report.json` records native headless capabilities separately from an
explicitly **emulated P3 media query** used only to exercise both canvas paths.
P3 and sRGB core readbacks in P3 coordinates establish actual differing encoded
pixels, not physical display reproduction. PNGs are layout inspection artifacts.
See `generated/interactive-capabilities.json` for the separate real Mac browser
observation, when present. No browser or OS settings are changed for that check.

Palette tests cover all seven IDs, linear P3-to-sRGB out-of-gamut conversion,
neutral black/white, and all fallback capability gates. Shared model/view tests
are run unchanged. Browser tests cover start, repeat/independent latches, live
simulation, immediate actions, canvas/state-preserving toggles, P3 pixel
readback, fallback, loss/restart, mobile fitting, and page errors. The design is
keyboard-oriented; mobile fitting is not a claim of touch gameplay support.
Sound timing, Safari/Firefox, long-session performance, accessibility beyond
text state, and original-vs-port runtime trace equivalence are not qualified.

### Observed on this Mac (2026-10-30)

27 Node tests pass (25 unchanged accepted model/view tests, two new palette
tests). Isolated Chromium 156 reports CSS P3/context support but a false display
P3 query, so normal headless play uses sRGB. Under the explicitly emulated P3
query, the real P3 canvas reads a red core as `[255,9,4,255]` in P3 coordinates;
the sRGB red core reads `[234,51,35,255]` in those same coordinates. Browser
smoke tests pass, including loss/restart and state-preserving context changes.

The actual interactive OpenChamber Chromium 152 on the Mac reports true CSS
P3, true display P3, and an actual `display-p3` context, with no emulation or
settings changes. After starting and pausing at frame 50, switching to sRGB
and back changes the actual context while the visible state summary remains
unchanged. Its true HDR media query does **not** make this SDR renderer HDR.
Layout screenshots were inspected: clean countable stacks, visible black cores,
streak catchlights, and distinct inventory/charge marks on the quiet field.

All new code and artifacts stay inside this folder. Existing provenance and
redistribution review requirements still apply to original sound references.
