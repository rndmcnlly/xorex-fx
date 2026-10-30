# Enchanted marble directions

Three alternatives prompted by Adam's rejection of the first candy-like study.
These are proposals, not a selected final look. All use the same `white-held`
snapshot exported from the unchanged game model: twenty lanes, identical gem
positions, white inventory, and red charge. Ship/resource anchors are retained.

## Shared material language

Transparent, reflective glass contains **geometry**, not just a colored surface:
dark absorptive pigment whorls plus thin emissive filaments. The glass also has
bulk absorption. Clear exterior reflections should describe a vessel containing
energy rather than an opaque sweet. Local rotations diversify the inclusions.

Black has much stronger absorption, roughness variation, and restrained latent
warm filaments. White uses pale luminous internal structures instead of an
undifferentiated white surface. Color remains primarily in the inclusions, but
readability at native 800×600 matters more than close-up material complexity.

The player is an instrument in the same world: metallic chevron chassis, a thin
live seam, physical inventory hoops containing current, and indexed charge
lamellae. Each hoop/lamella still corresponds to the inherited resource count.
Decorative geometry is not a new meter. The selected lane has a real light
source in restrained participating media, not an opaque glowing stripe.

## A: Obsidian Reliquary

**Intent:** a quiet, tactile mechanism containing dangerous stored potential.
Something old and carefully handled, not fantasy jewelry or a candy dispenser.

**Execution proposal:** smoky reflective marbles, thicker dark pigment, relatively
loose luminous whorls, charcoal substrate with real shallow depressions, a muted
brass-like ship and matching resource cages. A warm strip key is opposed by a
cooler narrow reflection. The trough cross-section is actual geometry.

**What to test:** black-glass edges against the stone; red/yellow separation
under warm illumination; whether twenty grooves make the empty planning field
too busy. Physical seating should strengthen lane identity without suggesting
that game actions require rolling or mechanical travel time.

## B: Pelagic Instrument

**Intent:** attention as sensing and tuning a fluid field. Energy feels alive,
but the world remains controlled rather than turbulent.

**Execution proposal:** clearer glass, broader ink-like whorls and delicate
bioluminescent threads, silver/pale-metal ship, thin optical reticle. No physical
troughs: a continuous cool-gray substrate with very quiet lane etching, a little
more near-surface medium. The matching player cage feels like a lens or probe.

**What to test:** whether implicit lanes remain easy to address during rapid
play; whether blue glass disappears into the environment; whether the reticle
looks like useful instrument context or an extra gameplay indicator. Haze must
not become blue ambient blur over the entire board.

## C: Magnetic Archive

**Intent:** fluent operation of a precision instrument. More technical and
indexical, without turning into generic neon/cyberpunk HUD decoration.

**Execution proposal:** quartz-like outer shells, tighter braided filaments
and narrow pigment inclusions, shallower gunmetal channels, neutral strip
lighting, a caliper-like player chassis. Resource hoops and charge lamellae
belong to the same machined family. All seven gem colors remain distinct data.

**What to test:** whether the braid reads as trapped energy or merely a repeated
manufactured pattern; whether the caliper silhouette is too wide for one lane;
whether exact rails preserve fluency at the cost of a more mundane device feel.

## The track question

Depressed tracks are an option, not an inherited rule. A and C test real channel
cross-sections at different depths. B tests an unbroken field with optical lane
indications. Choose based on glanceable lane selection and the desired world,
not because 3D marbles must obey rolling physics. All input remains instantaneous.

## Observed review: second render pass

Nine images and three editable checkpoints are saved in
`blender/generated/designs-02/`. `contact-sheet.jpg` groups the complete set.
All three scene metadata records were checked to contain the exact same model
state; nine PNGs decoded at the expected dimensions. Original asset hashes
remain unchanged. These checks establish a fair state/layout comparison, not
browser renderer fidelity or a perceptual readability score.

- **Reliquary:** the tactile gutters and warm metal do sell a handled physical
  apparatus. The same gutters also run down the entire planning field and
  become an almost organ-like visual rhythm. This is the strongest material
  world, but not the quietest one. Internal strands are now tangled rather
  than repeated circles; their width is still rather uniform and could become
  more fluid/heterogeneous.
- **Pelagic:** the unbroken field is visibly calmer. It best preserves a sense
  of planning through open space, while the magnified glass shows colored
  filaments and darker pigment behind the reflections. The enlarged player
  reticle is potentially misleading: it is decoration, not a shield or ability
  radius, and should be weakened or removed before production. Some black
  marbles disappear more readily into dark parts of the field.
- **Archive:** the denser braid and caliper ship are the most explicitly
  technical family. Charge lamellae feel coherent with the body. At native
  size, its busy inclusions compete with clean color recognition, and the
  bright channel ridges compete with the board. This is useful if we want
  Xorex to feel like an operated machine, less so for meditative immersion.

**Current recommendation:** Pelagic as the most promising *overall* direction
for the sustained-focus brief, not a final selection. Preserve actual glass
reflection/absorption, refine the irregular interior mixture, and remove the
unearned circular player cue. Avoid literal depressed tracks by default. The
physical alternatives demonstrate that tracks can clarify lanes while also
taxing the quiet space that makes the board readable.

White is more differentiated by internal structure and emission than before,
but no temporal liveness or special conversion moment is shown. Black's faint
internal energy is intentionally subdued; roughness and reflection variation
need another pass. None of the three has yet proved input readability during
fast motion or a viable browser transmission/volumetric budget.

## Render/evaluation machinery

```sh
uv run --script 04-rendering-lab/blender/run_designs.py
uv run --script 04-rendering-lab/blender/review_designs.py PATH_TO_OUTPUT_DIRECTORY
```

Each design receives a full 800×600 board, an 800×400 close view of actual board
marbles, a 600×400 player close view, and an editable `.blend` checkpoint. These
close views magnify the same scene, not a separate idealized hero asset.
`--design reliquary|pelagic|archive` restricts a new iteration to one design.
Output directories are new/versioned; prior studies and original assets remain
untouched. Every construction/render is serialized on the Metal Cycles GPU.
Progress and raw logs follow the earlier rig's disk-first convention.

These are path-traced offline SDR previews, **not browser implementations**.
Real glass transmission, internal curves, absorption, and participating media
can be expensive in real time. A browser translation might use analytic shell
reflections/refraction and procedural internal fields; it must be evaluated
separately, not inferred from these images. There is no display HDR claim and
no compositor bloom. Do not evaluate solely from close-ups: inspect native
gameplay views for color identity, white/black distinction, and resource counts.
