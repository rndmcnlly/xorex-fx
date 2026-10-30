# 04: Rendering lab

## Playable motion experiment

[Motion playable](motion-playable/README.md) adds idealized spherical shading,
interruptible jukes, RNG-scheduled anticipation, transfer smears, action response,
light-responsive individual dust, and decaying rubble to the shared model/input.
It retains P3/sRGB comparison and provides reduced/steady motion modes. The early
arrival cue intentionally changes available information, not transition rules.
The [feedback intent plan](motion-playable/FEEDBACK-PLAN.md) maps the resource
dynamics to eye paths and tactile action beats before implementation: reload,
actual waste, asymmetric white payoff, and black-obstacle breakthrough.

## Playable Display P3 experiment

[P3 playable](p3-playable/README.md) imports the accepted model/input unchanged
and provides a simple Canvas2D wide-gamut presentation, with a state-preserving
sRGB comparison/fallback. Actual P3 context/display-query support was observed
in the Mac browser. This is SDR wide gamut, not HDR or higher luminance.

## Used Idealism

The [used-idealism Blender study](blender/used-idealism/README.md) explores opaque,
softened geometric forms on a flat top-worn plane. It is an independent offline
art-direction study, not the current browser renderer. Its flattened tokens
misread Adam's intent: gems should be idealized **spheres** with a matte/glowing
plastic finish; geometric simplicity refers primarily to ship and board.
Read the latest [art and motion brief](ART-DIRECTION.md) before continuing.

## Blender iteration path

[State-driven Blender look development](blender/README.md) exports fixtures
and action results from the unchanged SVG model into an editable orthographic
scene, including procedural materials and participating-media A/B. This is
an offline look-development reference, separate from the browser study below.

Runnable browser-native **visual study, NOT mechanics-true Xorex**. Generated
geometry, orthographic overhead lanes, six gem colors including dark, an
extruded arrow ship, and the original `#404040` background reference. Side-by-side
Canvas 2D state reference and Three.js shallow 3D use the same visual fixture.
No recovered assets or other subprojects are modified.

## Reboot direction and original layout

Read [ART-DIRECTION.md](ART-DIRECTION.md) before further visual work. It records
Adam's rough/scuffed black-gem, intense white-gem, and participating-media
direction. Actual original-game screenshots live in `references/` (about 43 KB
combined). The five-lane scene below predates this direction and must not be
mistaken for the intended 20-lane layout. These materials/volumes are not yet
implemented by the current study.

## Run

From `/Users/adam/Desktop/xorex-fx`:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

If that server is already running, do not start another one.
Open <http://127.0.0.1:8765/04-rendering-lab/>. No build step. Internet access to
`cdn.jsdelivr.net` is required for 3D: the module import pins Three.js **0.180.0**.
The plain reference and controls still work if the CDN or WebGL2 fails.
Use localhost or HTTPS, not `file://`; WebGPU adapter requests need a secure context.

- Click/focus the left canvas, then left/right to select a lane.
- Up pulses the optional halo; down cycles ship color. These are **presentation
  test controls**, not recovered collect/fire actions. Buttons offer the same controls.
- Switch lit materials/flat baseline, halos, lingering pulses, and background.
- Reduced-motion preference suppresses pulses. No idle animation loop.
- Input updates fixture state synchronously, before presentation. Effects can
  overlap new inputs, but do not queue or lock them. The right view stays plain.

## Engine investigation and bounded choice

Official sources checked **2026-10-29**, before implementation:

1. [Current release API](https://api.github.com/repos/bevyengine/bevy/releases/latest)
   reported **Bevy 0.20.1**, released 2026-10-28.
   [Pinned release](https://github.com/bevyengine/bevy/releases/tag/v0.20.1).
2. [Official 0.20.1 WASM instructions](https://github.com/bevyengine/bevy/blob/v0.20.1/examples/README.md#wasm)
   document `wasm32-unknown-unknown`, `wasm-bindgen`, and serving generated JS/WASM.
   They explicitly call WebGPU **experimental**. `webgpu` overrides `webgl2`:
   a WebGPU build does not automatically fall back to WebGL2. Separate artifacts
   and explicit browser selection would be needed for that delivery strategy.
3. [Official WebGL2 examples](https://bevy.org/examples/) and
   [WebGPU examples](https://bevy.org/examples-webgpu/) establish browser delivery
   as real, not a native-only promise. Orthographic, PBR, and bloom examples exist.
4. [Official setup](https://bevy.org/learn/quick-start/getting-started/setup/)
   notes the cost of compiling the engine from scratch.
5. [Solari example source](https://github.com/bevyengine/bevy/blob/v0.20.1/examples/3d/solari.rs)
   is a separate ray-tracing implementation with specialized plugins. Its existence
   does not establish browser support. No Solari/browser claim is made here.

Local feasibility check: Rust **1.99.1**, Cargo, rustup, wasm-pack, and the
`wasm32-unknown-unknown` rustup target are present. `wasm-bindgen` is absent and
no `bevy-*` source was found in the local Cargo registry. Bevy is **plausible**,
not disproven or compiled/tested here. Rather than cold-download/build an engine
and bindings during this bounded visual task, this study uses Three.js WebGL2.
That makes the browser renderer and input experiment inspectable immediately,
with no dependency tree in the project. Bevy remains the preferred next engine
candidate, not rejected and not yet chosen for production.

Relevant Three.js sources:
[installation/CDN](https://threejs.org/manual/en/installation.html),
[MeshPhysicalMaterial](https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial),
[OrthographicCamera](https://threejs.org/docs/#api/en/cameras/OrthographicCamera),
[WebGLRenderer](https://threejs.org/docs/#api/en/renderers/WebGLRenderer).

### Delivery budget

The pinned CDN module imports `three.core.js`. Measured fetched source bytes:
`three.module.js` 603,113 + `three.core.js` 1,403,455 = **2,006,568 bytes raw**.
Local gzip estimates total **396,747 bytes**. These are library measurements,
not an asserted DevTools transfer size: CDN negotiation and caching can differ.
The lab has no model, image, audio, or WASM downloads; halo texture is generated
in memory. No Bevy download-size measurement was performed. The old July 2022
size table in Bevy's README is not evidence for current Bevy sizes.

## What is actually rendered/probed

- Real 3D spheres and an extruded arrow, viewed straight down the Z axis with an
  orthographic camera. No perspective lane drift or camera shake.
- `MeshPhysicalMaterial` with roughness, metalness, clearcoat, hemisphere and
  directional lights. Modest emissive material contribution. No textures/models.
- Thin dark-orb rim is a deliberate **design proposal**, not a recovered asset.
  Jewel palette, board dimensions (5 lanes, 6 fixture rows), shape details, and
  fixture arrangement are illustrative, not evidence of original game rules.
- Soft halos are radial-alpha sprites, **not bloom**, reflections, or traced light.
- ACES filmic material tone mapping and **SDR sRGB output**. No floating-point
  postprocess render target, display HDR, shadow maps, GI, transmission, or ray tracing.
- Capability panel requests a real WebGPU **adapter**, lists its features/one
  limit, and queries WebGL2 plus `EXT_color_buffer_float`. Adapter/extension
  availability is not successful device creation, rendering, or performance.
- `dynamic-range: high` and `color-gamut: p3` report browser media-query results.
  Neither proves that this SDR canvas emits HDR or wide-gamut pixels.
- Device pixel ratio is capped at 2. Rendering is on demand, with at most a
  450 ms optional pulse loop. No sustained frame-rate/latency benchmark yet.

## Tests and observed evidence

From the root directory:

```sh
node --check 04-rendering-lab/lab.js
node 04-rendering-lab/fixture.test.mjs
uv run --script 04-rendering-lab/smoke.py
```

The browser smoke script uses Playwright Chromium. If its browser is not cached:

```sh
uv run --with playwright playwright install chromium
```

It writes ignored `smoke-desktop.png` and `smoke-mobile.png` inside this folder.
Tested 2026-10-29, all passed:

- Fixture palette coverage, pure reducer, clamped lane bounds, 2,000 rapid lane
  actions, color cycle, and pulse bookkeeping.
- 3D startup with no uncaught page errors, 20 rapid arrow keys, input during a
  pulse, flat/glow/background toggles, color/reset, and 390px no horizontal overflow.
- Blocked CDN: explicit 3D error, working plain reference and immediate controls.
- Desktop screenshot inspected: aligned board coordinates, visible dark rims,
  arrow selection, and matching `#404040` backgrounds.

Interactive OpenChamber Chromium **152.0.7977.167** on this Mac reported WebGL2,
float color-buffer extension, max texture size 16,384, and a WebGPU adapter
(including `shader-f16`, `timestamp-query`, `float32-filterable`). HDR and P3
media queries were true. **This renderer still outputs SDR.**

Headless Chromium **156.0.8078.4** reported WebGL2, float color-buffer extension,
max texture size 8,192, **no WebGPU adapter**, and false HDR/P3 queries. This
important difference shows why headless graphics results are not substitutes
for the shipping browser on actual hardware. No Safari/Firefox/Android testing,
audio testing, or performance qualification was performed.

## Scope, provenance, next evidence

`fixture.mjs` deliberately isolates fake visual state from presentation. This is
a small model/view boundary, not a shared game implementation. It is **not yet
connected to subproject 03** or the recovered mechanics specification. Before
any fluent-play claim, feed validated authoritative snapshots into both views
and test sustained rapid real actions without presentation locks.

Next Bevy proof: build a pinned 0.20.1 minimal generated board for separate
WebGL2/WebGPU targets, measure compressed WASM + JS, cold start, input behavior,
and frame times on the actual Mac browser and target phone. Keep this plain
reference independent. Audio requires user-gesture and stuttering tests: Bevy's
WASM instructions explicitly flag browser audio behavior as something to test.

All study geometry, texture, and code are newly generated for this lab. Three.js
is CDN-loaded third-party MIT code, not vendored. Original SWFs/assets remain
immutable and unused here. This is not a project-wide licensing or publication
decision; any future vendoring/publication needs a provenance/license review.
