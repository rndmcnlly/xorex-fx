# 05: frozen-board autoplay development lab

Standalone browser-native planning experiment, **not game autoplay integration**.
The board never advances during search or replay. Execution is conceptually
instantaneous; no prediction of future arrivals, cooldown, or survival time.
Nothing in subprojects 03 or 04 is modified.

Serve the **project root** with any static server and open `/05-autoplay-lab/`.
If the existing root server is running on 8772, use
<http://127.0.0.1:8772/05-autoplay-lab/>. Do not restart it for this lab.
If no server exists, for example:

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

No build, CDN, runtime libraries, audio, or downloaded assets. Canvas has the
original 800 × 600 coordinate system and 20 lanes, but is a deliberately plain
reference, not a fidelity rendering. Store counts outside the canvas are exact;
decorative store marks are capped at eight.

## Try it

**HTN prototype:** choose `HTN: resource methods + backtracking` in the policy
selector for an explainable snapshot-only task planner. All eight curriculum
drills clear, including legal inventory parking and the 191 separate bastion
shots. Decomposition/resource estimates and bounded rejection traces appear
beside the existing arrow replay; exports include the trace. It remains
incomplete and loses to resource UCT on the tested larger natural boards.
See [HTN.md](HTN.md) for two knowledge rounds, 128 held-out boards, preserved
failures, bounds and reproduction. UCT remains the default; HTN ignores UCT
horizon, exploration and seed rather than globally redefining those options.

**Authored curriculum:** the Curriculum selector loads eight structured static
drills, from colored activation and white stacking through required parking,
multistage uncovering and a dense black bastion. The lesson card shows the
concept, trap, ammo accounting and an explicitly labeled oracle replay button.
Oracle plans never seed search. See [CURRICULUM.md](CURRICULUM.md) for canonical
witnesses, necessity bounds, exact small-state proof, measured policy failures,
and reproduction. These are frozen drills, not real stochastic survival levels.

1. Choose `white-rescue`, `buried-white`, `replace-merge`, or a seeded/natural board.
2. Load the frozen snapshot. The default is tuned resource UCT with automatic
   horizon (48–200 edges); legacy keeps its original 48-edge default. Choose a
   policy, milliseconds, seed, explicit horizon, exploration, or node cap.
   Run MCTS; incumbents arrive every ~200 ms. Tuned filtering can miss empty-lane
   inventory-stashing tactics: the UI warns, and legacy remains available.
3. Inspect the plan, step one arrow, or replay at a laboratory-only 50 ms/arrow.
   Replay speed has **no role in planning or mechanics**. Rewind restores its source.
4. Compare the random and simple greedy buttons. Export includes the source
   snapshot, source fingerprint, final snapshot, arrow plan, seed, and diagnostics.

Run and baseline buttons start from the **currently visible state**, including
partly replayed states. Loading, stepping, and rewinding cancel old searches.
Cancelled searches retain the last received incumbent, not unpublished worker work.
`black-plateau` correctly returns an empty plan and three uncleared black gems.
No ammo is invented. `natural` generates a snapshot using up to 700 accepted
model ticks **before freezing**, clears its loss flag for study, then never ticks
again. Fixture seed and search seed are separate; natural snapshots are seeded
samples of the model's arrival distribution, not evidence of original Flash RNG.

## Verify

From the project root:

```sh
node --test 05-autoplay-lab/lab.test.mjs 05-autoplay-lab/perf-regression.test.mjs 05-autoplay-lab/tuning.test.mjs
mkdir -p 05-autoplay-lab/generated
node 05-autoplay-lab/benchmark.mjs 1500 > 05-autoplay-lab/generated/node-benchmark.json
uv run --script 05-autoplay-lab/browser_check.py tuning
```

The browser check creates the generated directory itself. Nineteen tests across
the three test files include **5,000 random
live states × 64 mixed arrows = 320,000 simulator/model comparisons**, explicit
mechanics edge cases, macro expansion, immutable exports, bounded nodes,
reproducibility, and reward/legality fixtures. This is port-to-optimizer conformance,
not an independent comparison to the original SWF.

The Python check uses inline `uv` dependencies (Playwright) and installed Google
Chrome at the standard macOS application path. It owns an ephemeral local server
and separate headless, muted browser and closes both in `finally`. It does not
touch port 8772, user browser tabs, sound, or the actual game. It tests real module
Workers, fixed-iteration reproducibility, current-job cancellation/supersession,
UI responsiveness, unchanged planning input, and replay without frame changes.
Generated JSON and screenshots are ignored, reproducible, and kept under
`generated/`. No global install or Playwright browser download is needed here.

## Files and evidence

- `sim.mjs`: packed typed-array simulator and state-derived reward.
- `search.mjs`: tuned UCT strategy and ablations; `legacy-search.mjs`: stage-one
  UCT and historical single-trajectory baselines.
- `worker.mjs`: chunked worker protocol, tagged jobs, progress, cancel.
- `fixtures.mjs`: seven authored cases plus seeded and natural generators.
- `app.mjs`, `index.html`: standalone frozen-board inspection/replay UI.
- `lab.test.mjs`, `benchmark.mjs`, `browser_check.py`: conformance and measurement.
- [DESIGN.md](DESIGN.md): rules, reward rationale, protocol, limitations.
- [BENCHMARKS.md](BENCHMARKS.md): measured results, including where greedy wins.
- [THROUGHPUT.md](THROUGHPUT.md): first fixed-policy optimization pass, before/after
  source hashes, repeated Node/real Worker measurements and tuning handoff.
- [TUNING.md](TUNING.md): second, bounded policy experiment, declared training/held-out
  split, independent task outcomes, ablations and counterexamples.
- `legacy-search.mjs`: durable optimized stage-one policy, still pinned by six
  exact goldens. `tuning.test.mjs` tests the new policy boundary separately.
- `tuning-node.mjs`, `tuning-browser.py`, `tuning-summary.mjs`: repeated, replay-verified
  policy measurements. Use these for new policy comparisons, not historical perf labels.
- `generated/browser-report.json`, `generated/node-benchmark.json`: raw results.
- `generated/lab-natural-plan.png`, `generated/lab-natural-replayed.png`: UI evidence.

Do not read `iterationsPerSecond` as universally useful work: plateau iterations
are extremely cheap. The field excludes worker-yield time; use
`wallIterationsPerSecond` for effective wall-clock rate. Fixed-iteration runs
reproduce plans and diagnostics; wall-time budgets do not reproduce iteration
counts or necessarily plans. Memory is explicitly **unmeasured per worker**.

Preservation policy still applies. This lab reuses the accepted model as an
oracle, not recovered assets, and infers no new license or redistribution rights.

Tuning reproduction (run timing batches sequentially, not alongside tests):

```sh
node --test 05-autoplay-lab/lab.test.mjs 05-autoplay-lab/perf-regression.test.mjs 05-autoplay-lab/tuning.test.mjs
node 05-autoplay-lab/tuning-node.mjs train
node 05-autoplay-lab/tuning-node.mjs heldout
uv run --script 05-autoplay-lab/tuning-browser.py
uv run --script 05-autoplay-lab/browser_check.py tuning
node 05-autoplay-lab/tuning-summary.mjs
node 05-autoplay-lab/tuning-verify.mjs
```

These are small local experiments. Seed repeats are timing repetitions, not
independent boards. A longer rollout is more work per iteration. Historical
`perf.mjs` and parity verification now explicitly select the legacy policy;
do not overwrite archived `perf-before` or `perf-after` evidence with new runs.
