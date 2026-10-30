# Working on Xorex FX

Read the root README and the relevant subproject README before working.
The root organizes subprojects; avoid choosing a monolithic application stack
or implementing later stages without agreement.

The game is browser-native. Evaluate engines and graphics features against
their actual browser delivery path, not native capabilities. Bevy is a candidate,
not a mandate; keep download sizes and browser support explicit.

Preservation and mechanics fidelity come before visual redesign. Treat original
SWFs and recovered assets as immutable evidence. Write patched artifacts to
separate files. Label observations, interpretations, and design proposals.
Haxe compilation is confirmed by the recovered runtime and enum structures.
FFDec's `.as` syntax is not original ActionScript source. Do not pursue a
historical compiler/Mochi byte-matching source rebuild: Adam explicitly rejected
that maintenance cost. Preserve bytecode evidence and maintain the clean port.

Keep scripts small and readable. Prefer `uv run --script` with inline dependencies
for Python tools. Keep heavyweight downloads, caches, renders, and private
music-source material out of version control. Future public publication needs
an explicit provenance and redistribution review; do not infer a license.

Input must never wait for presentation. Maintain an immediately readable
authoritative state even when effects outlive a move. Preserve a plain reference
view for comparison. Do not silently add mechanics or replace recovered assets.

For action feedback, read `04-rendering-lab/motion-playable/FEEDBACK-PLAN.md`.
It records player-experience reasoning, eye/hand cues, and persistent causal
memory (mixed-color loss debris, charge-colored black rubble, white triumph
afterimages). Do not reduce these to generic transient particles or mistake
all resource expenditure for bad play. Keep current state immediately legible.
