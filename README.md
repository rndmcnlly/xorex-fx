# Xorex FX

A preservation-first revival of Adam M. Smith's 2009 Xorex: jewel matching,
resource management, and shooting played fluently with the arrow keys.

The ambition is a browser-native contemporary audiovisual treatment inspired
by Tetris Effect, without sacrificing the original game's precise, immediate
mechanics. The browser is the shipping platform, not a secondary port.

## Subprojects

1. [Ruffle resurrection](01-ruffle/): the unchanged original SWF, recovered
   external art and music, and a minimal browser wrapper. Working reference.
2. [Annotated decompilation](02-decompilation/): reproducible inspection tools,
   recovered code, annotations, and an evidence-backed mechanics specification.
   Haxe compilation is confirmed by recovered runtime and enum structures.
3. [SVG demake](03-svg-demake/): a simple modern implementation, true to the
   recovered mechanics, reusing original assets where practical.
4. [Rendering lab](04-rendering-lab/): shallow 3D, orthographic presentation,
   HDR/PBR, and experiments with ray tracing. Bevy is the preferred engine
   candidate to investigate for browser delivery; platform capabilities remain
   to be verified. Native-only features do not satisfy the shipping target.
5. [Autoplay AI lab](05-autoplay-lab/): isolated in-browser MCTS development,
   searching frozen boards with **no arrivals** and returning executable key
   plans from a background worker. Standalone prototype implemented. No game/attract-mode
   integration until search quality, speed, and plan legality are measured.
   An [explainable HTN prototype](05-autoplay-lab/HTN.md) is also selectable,
   with separate domain methods, bounded backtracking and decomposition traces.
   MCTS remains available for comparison; the lab itself remains frozen.
6. [Playable autoplay](06-autoplay-playable/): live motion/P3 game with HTN
   replanning roughly once per second, paced execution, Tab/checkbox toggle,
   immediate manual takeover, and guarded handling of stale plan assumptions.
   Its separate live-maintenance knowledge profile preserves useful charge;
   the original frozen-clearing profile remains available for comparison.

The resurrection, first annotated decompilation, and source-reviewed SVG
gameplay reconstruction are implemented. Adam accepted the SVG demake as complete.
It has 25 regression tests and a measured silent visual-comparison harness
against Ruffle, including the original directional glows. The rendering lab is a runnable
visual/capability study. Its Blender look-development path now consumes
snapshots and action results from the unchanged model; the initial browser
material study still uses its independent illustrative fixture.
No byte-matching historical Haxe source rebuild will be maintained.

Autoplay coupling is deliberately loose: the separate playable version submits
snapshots roughly once per second, while HTN returns a plan tagged with its
source state/job. Search assumes execution at infinite speed with no advancing
gems, not a prediction of future spawns. Live execution validates local action
dependencies and reconciles plan prefixes; unrelated lane arrivals need not
invalidate execution. See its README for safety and frozen-planner limitations.

An eight-board authored white-stacking curriculum is available in the AI lab,
with model-replayed witness plans and explicit necessity evidence for key merges.
Read [CURRICULUM.md](05-autoplay-lab/CURRICULUM.md) for its instructional design,
ammunition bounds, planner failures, and limits. The separate
[arrival-rate and blackening proposal](docs/design/pressure-progression.md)
records a possible live difficulty ramp and its resource-starvation tradeoff.
No progressive spawning rules have been applied to the original or prototypes.

[Heuristic-learning practice](docs/design/heuristic-learning.md) records the
bounded failure → knowledge revision → replay → regression → simplification loop
for improving live autoplay without conflating it with frozen-board clearing.

## Play the original

From this directory:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open <http://127.0.0.1:8765/> for the workbench, or go directly to
<http://127.0.0.1:8765/01-ruffle/>. Allow roughly 15 seconds for obsolete
ad requests to time out. Click the game for keyboard focus.

- Left/right: select lane.
- Down: collect or convert.
- Up: replace or fire.

The wrapper currently downloads pinned Ruffle 0.7.1 from a CDN. See
[recovery notes](01-ruffle/RECOVERY.md) for provenance and limitations.

## Verify and inspect

```sh
uv run --script check.py
uv run --script 02-decompilation/decompile.py
```

The first runs local checks (Node required for JavaScript tests). The second
downloads checksum-verified FFDec 26.4.0 into an ignored cache and regenerates
exports and a byte-level XML-roundtrip report (Java required). See each
subproject README for browser smoke tests and further limitations.

## Design contract

Sustained focus and learned arrow-key fluency are the center of the game.
Players plan ahead while muscle-memory sequences handle familiar operations.
Preserve the original action ordering, timing, and rules before considering
extensions. Exact temporal semantics must be established from evidence, not
assumed to be turn-based or tied to animation.

- Actions commit immediately, without animation locks or cooldowns added for presentation.
- Authoritative state is readable immediately after an action.
- Primary animation explains the state change; secondary animation can linger.
- Rapid sequences compose, rather than queue behind decorative animation.
- Music accommodates the player's phrasing, never delays input to meet a beat.
- Keep a plain reference view: visual spectacle must not reduce fluency.
- Preserve the original `#404040` background reference and dark-gem legibility.

## Repository policy

Source, readable design notes, and procedural generation machinery stay in
ordinary Git. Original binary assets, visual artifacts, native Blender scenes,
and retained experimental evidence use **Git LFS**. After cloning, run
`git lfs install` and `git lfs pull` before testing or building.

Keep tool binaries, installed dependencies, caches, private DAW projects/stems,
and bulk third-party decompiler output out of the repository. See
[PUBLISHING.md](PUBLISHING.md) for the resolved-LFS Pages workflow and local
publication checks, and [RIGHTS.md](RIGHTS.md) for provenance and current rights.
No broad open-source or asset license is inferred from public visibility.

Reason project recovery/remastering is a future supporting task. No original
DAW project has been located yet. Research favors opening editable `.rns`
projects in current standalone Reason and exporting authentic mixes/stems,
rather than relying on an unverified full-song unpacker.
