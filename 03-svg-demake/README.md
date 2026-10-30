# 03: SVG demake

A small, framework-free browser implementation with a plain SVG reference view.
Serve the **project root**, then open <http://127.0.0.1:8765/03-svg-demake/>.
No install, build step, CDN, or runtime dependencies. A keyboard is required.

```sh
node --test 03-svg-demake/model.test.mjs
node --test 03-svg-demake/view.test.mjs
```

Use `?seed=2009` for repeatable restarts. The fixture PRNG is Mulberry32, **not**
Flash's `Math.random`. Normal play uses browser `Math.random`. Seeded runs only
repeat when actions occur between the same simulation frames.

## Structure

- `model.mjs`: authoritative state, actions, weighted arrivals, simulation frame.
  Lane arrays are ordered top/head to bottom/tail. No DOM or presentation waits.
- `input.mjs`: independent per-key edge latches, no global cooldown. Up/Down
  starts without performing an action. Repeats wait for keyup; blur clears latches.
- `app.mjs`: synchronous SVG rendering after every action and simulation frame,
   independent 30 Hz browser timer, original sound playback, inspection controls.
- `view.mjs`: read-only drawing, Flash-style circle paths and chained box glows.
- `assets/`: original instruction/termination frames exported as SVG, including
  outlined lettering and original stage placement. See its provenance README.
- `comparison.py`, `reference.html`: isolated, silent live-original visual checks.
- `model.test.mjs`: deterministic mechanics and input fixtures, including source
  edge cases. These are regression tests, not an original-versus-port trace oracle.

## Observed rules and evidence

Read against `02-decompilation/generated/xorex/scripts/§as§/adamsmith/xorex/`
(`Main.as`, `CombatModel.as`, `ShipModel.as`, `Energy.as`, `Enemy.as`,
`Wavelengths.as`, `Random.as`) and `generated/xorex/scripts/List.as`.
The original is compiled Haxe; the generated `.as` files are decompiler output,
not original authored ActionScript.

- 800 × 600, 20 lanes, 20 initial enemies, random ship lane chosen **before**
  initial spawns. 30 simulation frames per second, each with independent arrival
  probability 0.0725. No action cooldown or animation lock.
- Arrivals prepend at the head (`List.push`); render rows start at y=0 with
  40-pixel spacing. Gather and shoot inspect the tail (`List.last`). Replacement
  appends at the tail (`List.add`). No wrapping.
- Down with empty inventory gathers the maximal same-color bottom run; black
  is ungatherable. Otherwise an empty or same-color capacitor gets ordinary
  addition. Only a **mismatched** white inventory gives `5*n*n` bonus, without
  changing capacitor color or playing compact. Other mismatches reset both.
- Up with inventory replaces its full run. Otherwise one capacitor unit shoots
  **one** bottom enemy regardless of color, including black. It consumes charge
  even on an empty lane. This is not a color-matching or chain-clearing shot.
  Verified the unconditional loop-exit jump in
  `generated/pcode/scripts/§as§/adamsmith/xorex/CombatModel.pcode:447–511`.
- Loss checks all lanes for length >14 **after the spawn trial on a simulation
  frame**, not after an action. Replacement overflow can be rescued between frames.
- Weights: red 15, green 15, blue 15, yellow 7, pink 1, white 1, black 30,
  total 84 (initializer recovered via bytecode inspection in subproject 02).
- RGB colors, enemy ring/disk/core radii and opacities, ship chevron, lane beam,
  inventory rings, and capacitor chevrons follow recovered drawing instructions.
  Background remains original `#404040`; black gems are intentionally black.
  Graphics alphas are truncated to 8-bit values as in Flash: nominal .125/.25/.05
  become 31/255, 63/255, and 12/255, not rounded CSS alpha approximations.

## Silent visual comparison

With the project server running on port 8765:

```sh
uv run --script 03-svg-demake/comparison.py
# Iterate on saved captures without waiting for the original's ad timeout again:
uv run --script 03-svg-demake/comparison.py --replay
```

The script uses an **independent headless Chrome** process (the installed macOS
Chrome executable), never the user's active browser. Chromium is launched with
`--mute-audio`; the separate original wrapper also sets `player.ruffle().volume=0`
**before load** and again afterward. Demake effects and music default to off.
The normal preservation wrapper, SWF, and original assets are untouched.

Both captures are 800 × 600 at device scale 1. The original is suspended after
its entrance settles; only Ruffle's orange resume overlay is hidden. The script
reads the original's saturated gem core centers and ship position, then loads
that board into the demake's paused `?inspect` fixture surface. It also drives
real original key inputs to capture held inventory and capacitor charge, with
visible resource counts checked from pixels. This is **visual state readback**,
not seed synchronization, original runtime export, or a mechanics trace oracle.
No assumption that JavaScript `Math.random` controls Ruffle's Rust RNG is made.

Screenshots, region crops, 4× amplified absolute-difference images, JSON fixtures,
and metrics go into ignored `generated/comparison/`. Regional metrics avoid
relying only on a mostly empty gray stage. The original bottom-left `mute` text
is intentionally absent in the demake, which has explicit opt-in audio controls
outside the stage. Whole-stage metrics include that difference; splash metrics
exclude the bottom 20 pixels containing that widget.

The ship's two sequential glows consume the **whole ship**, including its beam,
inventory rings, and capacitor marks. Their defaults are strength 2, quality 1,
white alpha .25, blur 25 × 5 then 5 × 50. Separable SVG convolution kernels
follow the pinned Ruffle implementation's box blur and source-over compositing,
not Gaussian/CSS shadows. Offscreen capacitor marks are kept far enough below
the stage to contribute their real halo. SVG and Ruffle still differ in edge
antialiasing, tessellation, and intermediate filter rounding. This is a measured
close match at 1:1 scale, not bit-identical Flash rasterization on every browser.

A representative live capture (Chrome 156, Ruffle 0.7.1, random board, settled
entrance, 800 × 600) gave:

| Region | Mean absolute RGB error (0–255) | Pixels with any channel error >8 |
| --- | ---: | ---: |
| Whole stage, empty stores | 0.0544 | 0.112% |
| Whole stage, held + charged | 0.0594 | 0.119% |
| Orb field, held + charged | 0.0928 | 0.241% |
| Ship + resource crop | 0.3036 | 0.367% |
| Beam crop | 0.1750 | 0.000% |
| Black-gem crop | 0.3231 | 0.733% |
| Settled instruction art, y <580 | 0.3415 | 0.906% |

These are capture measurements, **not universal guarantees** or exact-pixel
agreement percentages. Random boards and crop contents vary between runs.
Sparse edge pixels still differ by up to 78 channel levels in gameplay, despite
the low mean error: analytic SVG antialiasing is not Ruffle's multisample output.
`metrics.json` records fresh results; `side-by-side-resources.png` and the
individual region crops make residual differences inspectable without relying
on a single aggregate metric. The check does not yet cover a long/high-charge
original state, every color combination, or other browser rasterizers.

Relevant emulator implementation evidence (Ruffle tag `v0.7.1`):
`core/src/avm2/globals/flash/display/graphics.rs` (`drawCircle`, alpha/caps),
`swf/src/types/twips.rs`, `core/src/avm2/filters.rs`, and
`render/wgpu/{src/filters/blur.rs,shaders/filter/blur.wgsl,shaders/filter/glow.wgsl}`.
The eight quadratic circle arcs retain twip truncation rather than silently
"correcting" the original drawing to ideal SVG ellipses.

The explicit array representation is a simplification of the original linked
list, not a change in list direction or action ordering.

## Presentation and platform limitations

**Source-reviewed, not proven mechanically equivalent.** No live state-trace comparison against
the original SWF is implemented yet. Browser scheduling and key-event timing are
not Flash scheduling. The browser timer runs independently of display refresh;
delayed timers do not catch up missed spawn trials. Hidden tabs suspend simulation
and clear key latches. These are explicit browser adaptations, not recovered rules.

Developer pause and frame-step are labeled extras outside the game. They stop input
and simulation, not presentation. Status text adds readable exact inventory and
capacitor counts; offscreen capacitor glyphs beyond glow reach are culled,
without changing charge. The final board remains in memory behind the original
termination art. Original instruction/termination art, ship glow, and two-second
board/ship entrance motion are reproduced. Entrance easing approximates Tweener's
default ease-out cubic; exact temporal equivalence is not measured. Ad calls,
online leaderboards, and real-time survival score submissions are omitted. No replacement mechanics
or new win conditions are added. Audio failures cannot block play.

Original music and all seven effects are referenced directly from
`../01-ruffle/sound/`, not copied. Music is opt-in due to browser autoplay policy;
effect instances may overlap. Effects are also opt-in, so inspection starts
silently. No original-vs-port audio timing oracle exists.
No license or redistribution permission is inferred: preserve the existing
provenance review requirement before publishing recovered assets or music.
