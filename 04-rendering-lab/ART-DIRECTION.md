# Xorex FX: material and light direction

## Latest direction

Adam clarified **Used Idealism** after the first study:

- Gems remain **idealized spheres**, not flattened counters or low-poly pucks.
  'Flat' describes a matte/diffuse, almost glow-in-the-dark plastic surface.
  The ship and board, not the gem silhouette, are geometrically simple.
- Retain immediately readable color identity and the appealing streak-shaped
  catchlights. Earlier glass whorls are useful inspiration, not a requirement
  to retain realistic transmission/refraction.
- The field is a flat ideal plane with evidence of long use, strongest near
  the top. Dust is **individual motes**, with oriented/specular light response
  to nearby moving emitters, not painted streaks standing in for particles.
  Surface grease/scratches and airborne/deposited dust are distinct phenomena.
- The P3 prototype feels good; explore a stronger luminous impression while
  distinguishing saturation/local contrast from actual HDR luminance.

The first Used Idealism Blender study misinterpreted the shape instruction.
Keep it as an experiment, not the approved gem geometry. The following older
marble alternatives remain historical context rather than a final selection.

### Earlier glass exploration

Adam found the initial Blender study too candy-coded. One exploration was
enchanted reflective glass marbles with absorptive internal pigment/swirl
structures and emissive filaments, plus a coherent player/resource treatment.
Whether they sit in depressed tracks is an open design question. See
[DESIGN-ALTERNATIVES.md](DESIGN-ALTERNATIVES.md) for three coordinated proposals
and their reproducible Blender comparison workflow. The earlier black/white
and participating-media notes below remain context, not a frozen material spec.

## Motion direction: readable, interruptible juice

Build a fresh browser study without altering the accepted demake or first P3
prototype. Reuse the authoritative model. Input never waits for animation.

- Left/right: immediate velocity onset followed by an ease-out, short-lived
  speed lines, and interruption from the currently presented pose. New key
  presses never queue behind old motion. Target-lane truth stays immediate.
- Arrivals: pull back in anticipation, arrive on the simulation tick, then
  slightly overshoot/settle. Original arrivals are random, so future random
  decisions must be scheduled explicitly if previewed. Do not delay an already
  committed arrival or precompute a board that would ignore intervening input.
- Gather/replace: shaded sphere smears and short visual persistence that
  narrate transfers. A fading trace is not a still-actionable removed gem.
- Convert/amplify: compression and release support the inventory/charge change;
  white amplification has a distinct celebration. Mismatch discharges/fizzles.
- Shoot/destruction: brief recoil and bounded, decaying ballistic rubble.
  The actual removal and charge consumption remain immediate.
- The direction is toward modest Peggle-like juice, not overwhelming spectacle.
  Reduce-motion and steady/reference modes are useful controls.

Keep gameplay randomness separate from particle/decorative randomness.
Anticipation deliberately reveals an impending event slightly early: document
this information change even when transition probabilities and tick timing are
preserved. Render-time animation must not feed back into gameplay state.

Adam accepted the SVG demake as complete. Use it as the mechanics and plain
presentation reference; concentrate further visual development in this lab.
The existing five-lane material fixture is exploratory, **not** the reboot layout.

## Layout reference

- [Original gameplay](references/original-gameplay.png)
- [Original with inventory and charge](references/original-resources.png)

These are actual 800×600 captures of the unmodified original SWF running in
Ruffle 0.7.1, not screenshots of the SVG recreation. They were captured silently
by `03-svg-demake/comparison.py` and copied without image modification from its
ignored comparison output. The original simulation was suspended to capture a
stable frame; emulator resume/unmute chrome was hidden, game art unchanged.
The small original `mute` label remains visible. See the comparison script and
subproject 03's README for the capture method and limitations.

Preserve the 4:3 composition, 20 columns on 40px centers (`x=20+40*lane`),
top-origin orb stacks (`y=40*row`), ship at y540, inventory above the ship, charge
below, and the large open space between ship and approaching board. The lane
beam connects action planning to a precise column. Orthographic shallow 3D
should preserve these projected anchors rather than squeeze into five lanes.

The original `#404040` remains the reference backdrop/tone, not a mandate that
every future environment have an unlit flat-gray background. Preserve black
gem visibility, color identity, and the open field's visual quiet.

## Black: matter with something trapped inside

Adam's direction: rocks or scuffed iron balls, with spatially inconsistent
reflection and possible emissive liveness suggesting hidden energy.

Proposed implementation:

- Procedural, object-space roughness variation, scuffs, pits, and restrained
  normal variation. Avoid uniform glossy black billiard balls.
- Explore two material families separately: rough dielectric rock and metallic
  iron. They respond differently to light; do not treat metalness as a generic
  shininess slider.
- Small, localized, restrained internal emission, perhaps through cracks or
  pores. This must not make black read as white or a collectable colored gem.
- Keep the projected silhouette and lane clearance stable. Surface detail is
  presentation, not irregular gameplay geometry or physics.
- Keep texture frequency coherent at actual orb size. Fine procedural noise
  that aliases or sparkles during play is not useful detail.

## White: concentrated potential

Adam's direction: visually intense and special, not merely another color.

- A luminous core with a readable boundary and a distinct material response.
- Let white affect nearby matter and haze more strongly than ordinary colors.
- Preserve local contrast: its scattering halo must not cover adjacent gems,
  inventory, or capacitor strokes. No exposure pumping that hides the board.
- Respect the actual special rule: white inventory amplifies a differently
  colored existing capacitor. No new white-gem mechanics implied by the art.

## Participating media

Explore light scattering **within a volume**: restrained haze that makes the
lane beam, luminous cores, and conversion energy occupy space. This is distinct
from screen-space bloom or a radial-alpha sprite around an object.

Start with a bounded, inexpensive single-scattering experiment. Keep density
low over the playfield and place most atmosphere in depth behind/around its
readable layer. Potential browser approaches include a short ray-marched
volume with analytic lights or a lower-resolution volumetric pass with careful
upsampling. These are proposed approaches, not implemented features.

Orthographic viewing does not rule out volumetric scattering. Neither does it
require hardware ray tracing: shader ray marching and hardware ray tracing are
different implementation techniques. Label what is actually implemented.

Compare media on/off at the same state and exposure. Watch for blurred lane
identity, temporal ghosting, dazzling whites, or noisy shafts that compete with
planning. All primary state changes remain instantaneous; secondary volumetric
traces may linger without waiting or queuing gameplay.

## Next proof

One original-layout board, black/white/colored material studies at actual gem
size, one lane beam, and a media on/off toggle. Plain reference view remains
available. Browser delivery first; real display HDR and hardware ray tracing
remain unproven and must not be claimed from bloom or HDR intermediate buffers.
