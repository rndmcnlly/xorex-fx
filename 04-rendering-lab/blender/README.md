# State-driven Blender look development

For the newer glass/swirl/filament proposals and coordinated player designs,
see [design alternatives](../DESIGN-ALTERNATIVES.md) and `run_designs.py`.
The first proof below is retained as an earlier experiment, not the selected look.

Use the validated JavaScript simulation as a **scene-data generator**, then
iterate on materials and lighting in Blender without running the browser game.
The browser is still the shipping platform. Blender is an offline reference
renderer, not a new game engine or proof of a browser rendering budget.

## First proof

From the project root, using the existing Blender installation:

```sh
uv run --script 04-rendering-lab/blender/run.py --render
```

This exports model states, launches **isolated background Blender with factory
startup**, constructs a new scene, saves an editable `.blend`, and renders the
selected state at 800×600 with participating media **off and on**. It does not
touch a live Blender session, change the original game, play audio, or start a
web server. Tested API target: Blender 5.2.1 LTS, Apple Silicon Metal Cycles.

Defaults: `white-held`, 32 Cycles samples, timestamped output under `generated/`.
The `.blend`, renders, exported JSON/SVG, raw log, and progress files stay there
and are excluded by the project's generated-directory ignore rule.

```sh
# Just create an editable rig, no rendered images:
uv run --script 04-rendering-lab/blender/run.py --snapshot amplified

# A quicker engine option, not assumed equivalent to Cycles:
uv run --script 04-rendering-lab/blender/run.py --engine BLENDER_EEVEE --render

# More samples and a specific NEW output directory:
uv run --script 04-rendering-lab/blender/run.py --out 04-rendering-lab/blender/generated/material-test-02 --samples 64 --render

# Export only, with Node and no Blender:
node 04-rendering-lab/blender/export.mjs
node --test 04-rendering-lab/blender/export.test.mjs
```

Output directories must be new: the runner refuses to overwrite prior iterations.
Set `--blender /path/to/blender` if automatic executable selection is unsuitable.
The Cycles path explicitly requires an available **Metal GPU**, never silently
falls back to CPU, and selects both backend/device and scene GPU rendering.

## How the boundary works

`export.mjs` imports the unchanged model and SVG view from subproject 03.
It emits:

- `study.json`: authored material-coverage board with seven colors and a real
  model-evaluated action sequence, including white amplification and shooting
  black. This is a staged fixture, not a claim of a naturally played run.
- `seeded.json`: deterministic 300-frame spawning run evaluated by the same
  model, with six snapshots. No manual gameplay actions in this second run.
- Matching `*-reference.svg` files using the accepted demake's actual drawing
  implementation, including its glow filters.

`scene.py` consumes the JSON. **No collection, conversion, spawning, or firing
rules are implemented in Blender.** Snapshot states are held on a persistent
Blender timeline with constant-interpolation keys. Markers name each action
result; scrub to inspect different combinations of inventory, charge, and board.
There is no transient frame handler required to reopen the saved scene.

The authored timeline is a presentation inspection score: its dwell times are
not a real-time simulation with omitted spawns. Discrete state jumps are
intentional. Transition animations, stable gem identity across captures,
interpolated trails, and audio are not implemented yet. The exported event
records retain before/after state and action for that next layer.

To use the seeded bundle directly, call Blender with the generated input path:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python 04-rendering-lab/blender/scene.py -- --input 04-rendering-lab/blender/generated/seeded.json --snapshot natural-300 --out 04-rendering-lab/blender/generated/seeded-scene
```

## Editable scene and first material proposals

- Exact original projected anchors: 4:3 frame, all 20 lanes, 40px spacing,
  row-zero clipping, ship y540, inventory y500, charge below ship. Projection
  assertions test these coordinates during construction.
- Orthographic shallow 3D. Shared linked gem mesh, editable named palette
  materials, generated geometry only. Gem body radius is a proposed 15.2px,
  not a pixel-faithful reconstruction of the original ring/disk/core.
- Black: metallic scuffed iron, noise-driven roughness, bump microtexture,
  faint amber emission along procedural cracks. Rock is still an alternative
  material family to explore. No new black-gem gameplay meaning.
- White: concentrated emission, a distinct smooth material, and modest local
  lights to illuminate matter and participating media. Exposure stays fixed.
- A real spotlight follows the selected lane through a bounded heterogeneous
  scattering volume. Toggle the `MEDIA` object's render visibility for A/B.
- Broad key and fill lights, a gray reference-albedo backdrop, and no compositor
  bloom in the first rig. Changes in media A/B therefore aren't a bloom toggle.
- Original ship/resource projected geometry becomes emissive beveled curves.
  Charge can extend outside the camera exactly as it does in the original layout.

All of this is **art-direction proposal**, not the original artwork. For actual
layout captures see `../references/`, and for the brief see `../ART-DIRECTION.md`.
The `.blend` contains editable procedural node graphs, not baked texture assets.
Regenerating creates a new experiment; retain hand-edited `.blend` versions if
you want to keep changes not yet translated back into the generator.

## Evidence and limits

First local run (2026-10-30): Blender 5.2.1 LTS, Cycles on Apple M3 Max Metal
GPU with CPU device disabled, 32 samples, both verified 800×600 renders.
The cold first image took about 122 seconds including initial setup/compilation;
the second media-on image took about 2.5 seconds. This is a warm still timing,
not an animation throughput estimate. The first look is intentionally basic:
white saturation, black scuffs, and haze need further art-direction iteration.
The media A/B images are measurably different, though scattering is restrained.

The generated `audited-rig/` checkpoint additionally checks gem visibility and
projected ship lane against every one of the eight model snapshots before
saving. Three exporter tests and the existing project check suite pass.

Each run writes `manifest.json` (selected source state, camera, Blender version,
engine, object count), `render.log`, append-only `progress.jsonl`, and an atomic
`status.json`. Status reports build/save/render/completion/failure phases. The
runner validates nonempty checkpoint and PNG dimensions; inspect images too.

PNG output is **AgX tone-mapped SDR**, despite internal high-dynamic-range light
values. Cycles is offline path tracing, not evidence of browser ray-tracing
support. EEVEE/Cycles volume/light behavior and render cost differ. Surface
detail and haze need evaluation at actual game resolution, with fast play and
dark/white contrast, before translating the look to a browser shader.

The model has source-based tests, not a complete live-original equivalence
oracle. No final animation cost, browser performance, display HDR output, or
cross-browser renderer parity has been established by this rig.
