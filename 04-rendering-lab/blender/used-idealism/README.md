# Used idealism

An **offline SDR look-development proposal**, not browser HDR and not a new
renderer or mechanics implementation. Everything in this folder is new work;
the original evidence and the other studies remain unchanged.

## Direction

- A single ideal graphite plane, still visibly flat. No depressed tracks,
  lane walls, mechanical rails, displacement, or external textures.
- Years of descending tokens leave narrow polished centers, oily roughness
  changes, and restrained directional scuff/dust variation. These are shader
  properties, strongest toward the top and fading toward the player.
- Opaque, almost glow-in-the-dark polymer tokens. Sixteen-sided rounded rims,
  broad planar tops, shallow depth, and soft side shading reduce the realistic
  marble association. Transmission is explicitly zero. No glass interiors.
- Long physical softboxes supply streak catchlights. Token emission and small
  local lights interact with the plane through Cycles lighting/reflection.
  Terminal colored tokens also have a low grazing rim-light proxy aimed along
  the worn surface. The trails are not baked colored stripes or bloom sprites.
- Black remains subdued absorptive graphite; white has materially stronger
  emission and illumination. No changes to either color's game meaning.
- The player is a thin softened polymer chevron, inventory is one concentric
  hoop per held item, and charge is one inherited chevron per stored unit.
  Their anchors/counts/colors come directly from the same `white-held` state.
  A single restrained selected-column hairline keeps planning precise.

## Reproduce

From the project root:

```sh
uv run --script 04-rendering-lab/blender/used-idealism/run.py --name my-new-study
```

The output name must be new. `run.py` uses the existing model exporter but
writes its own JSON and reference SVG files here under `generated/`. It then
runs isolated headless Blender with factory startup, explicit Metal preferences,
CPU devices disabled, and the scene set to GPU Cycles. Three views render in
sequence, never concurrent GPU batches: exact 800×600 board, material detail,
and player detail. The saved `.blend` opens at the authoritative board camera
before the detail camera reframing.

Each run preserves `render.log`, append-only `progress.jsonl`, atomic
`status.json`, `manifest.json`, a native editable checkpoint, and the three
PNGs. Completion and failure are explicit. The runner verifies PNG signatures
and dimensions, checkpoint presence, and completed status. Scene construction
asserts all projected gem centers and board count against the unchanged model.

## Interpretation and limits

This is a static authored coverage snapshot, not a naturally played run. Wear
is an illustrative accumulated-use history, not simulated descent or a new
game rule. Colored pools are local illumination proxies alongside actual
emissive surfaces, not a quantitatively calibrated plastic material. Small
roughness details may alias or disappear at game scale. There is no volume,
bloom, input test, animation, browser performance proof, P3 output, or display
HDR claim. AgX maps scene lighting into SDR PNGs. The plain exported SVG remains
available for independent state comparison.

All geometry, procedural surface patterns, and scripts are newly authored.
No downloads, external textures, or recovered assets are incorporated. This
does not establish a project-wide license or authorize publication.

## Local verification

The three existing exporter tests passed. The first study rendered at 64
samples; inspection led to darker black faces, sparser scuffs, and corrected
local-light placement in the 96-sample follow-up. Outputs are retained in
versioned generated folders, never overwritten. The board audit covers 74
tokens in 20 lanes; the model state has two white inventory items and three
red charge units at lane 9. All three PNG sizes and the editable checkpoint are
checked by the runner. Each saved checkpoint opens on the exact board view.

Preferred current output: `generated/study-03/`, rendered at 96 samples on the
Apple M3 Max Metal GPU with CPU disabled. All three images were opened and
inspected. Black is now clearly darker than the plane; top wear is restrained
at board scale and visible in the crop; inventory and charge remain readable.
The principal remaining weakness is that the trail reflections read mostly as
neutral studio streaks. Colored terminal-light interaction is implemented but
subtle at actual size, not the dominant visual feature. The very flat token
faces can also suggest counters or bottle caps rather than rounded gems. Both
are deliberate review points, not claims of a finished material design.
