# Bounded live-policy learning, 2026-10-30

## Plan declared before edits

Two knowledge rounds, followed by a simplification/regression pass. Training:
1, 7, 2009. Held-out, not used to select rules: 42, 87, 31415.
Baseline and each round run 90 virtual seconds through the real pure controller,
12 arrows/s, 1000 ms jobs, unchanged model ticks and independent precomputed RNG
tapes. This is a controlled latency model, not a browser-duration claim.

Disk split: only 05 planner profile/engine extension and 06 controller default,
inspection, tests, episode harness and this report. No model, simulator, baseline
search, rendering, root docs, or LIVE-OBJECTIVE-AUDIT edits.

Round 1: explicit LiveMaintenance task objective, compatible reloads, productive
charge expenditure, held-resource parking, white engine and pressure/locality.
Round 2: inspect round-1 training episode failures and static counterexamples,
then revise knowledge. Preserve failures rather than replacing their evidence.
Keep original frozen decomposition unchanged and explicitly selectable.

Adopted from Jiayi Weng's [Learning Beyond Gradients](https://trinkle23897.github.io/learning-beyond-gradients/):
probe, trace, locate failure, edit knowledge/tests, rerun, preserve trials and
compress rules. The article was read in full, including disclaimer and appendix.
Its benchmark scores are not evidence or guarantees about Xorex.

## Objective and architecture

`HTN(snapshot)` and the unchanged Worker default to **frozen-full-clear**.
`{profile:'live'}` explicitly selects **live-maintenance**, requested by the
06 controller by default. The lab stays frozen. `?profile=frozen` in 06 selects
the original full-clear decomposition for comparison. No primitive, simulator,
input, timing, arrival weighting, presentation or legacy policy changes.

The interpreter/domain split is useful here: `htn-domain.mjs` is byte-identical;
`htn-live-domain.mjs` owns new knowledge, not a copied mechanics implementation.
LiveMaintenance decomposes up to six LiveWork resource tasks. These can include
white assembly, park/activate/regather/boost, stash/use-charge, compatible reload,
and repeated real gate/bank shots. They are not an opaque single-arrow fallback.
Each task has explicit trace reasons, resource estimates and macro offsets.
Only this live profile changes incumbent/termination behavior: retain a valid
executed dependency prefix (including parking), stop at a finite task boundary,
and report `objective`, `outcome` (`continue` or `wait-for-observation`) and
`reason:'live-task-boundary'`. Frozen search still stops on actual full clear.
Node/depth/action/frontier bounds, transport, cancellation and controller
dependency/prefix guards are unchanged. This is first-feasible task-network DFS,
not a global optimization or an infinite maintenance plan.

Ordinary incompatible gathering is not an ammo method. Spend charge on black
tails first, including mixed-lane gates; reload only compatible ordinary runs.
When no black remains, spending charge to remove ordinary blockers is explicit
productive pressure relief, not mislabeled amplification. Exceptional held-store
disposal still exists, with `lossCharge`, `lossHeld` and reason, when this limited
knowledge lacks a parking/black-or-white dependency. It is legal but not proven
optimal. The frozen curriculum's legitimate terminal disposal remains intact.

## Actual rounds and preserved failed direction

1. **R1:** before episodes exposed 109 planned mismatches/157 charge lost on
   training. Add live resource/pressure tasks, compatible reload applicability,
   productive expenditure and stash/use dependencies. Training becomes 0/0,
   with more black kills and useful nonmovement actions, not inactivity.
   Traces still spend 46/40/39 charge shooting ordinary blockers on seeds
   1/7/2009. This is not counted as a mismatch, nor claimed to be optimal.
2. **R2:** probe static counterexamples after R1. Two genuine failures: held
   white initializes an empty cap despite available ordinary activation, and
   white assembly travels across the board while a nearby black lane is 12 high.
   Add park/activate/regather as one dependency task, thresholded urgency/locality,
   and early task termination on an ammo plateau. The first urgency attempt
   exhausts its two colored charge, then converts white without the bonus and
   leaves eight black. Preserve this failure in
   `live-policy-r2-reserve-failure-{cases.json,domain.mjs}`. Revised urgency spends
   one charge and reserves one for the existing white engine. The final probe
   starts with Up (R1 starts Right toward distant whites), still assembles two
   white for +20, clears the 12 black, and retains ten charge. Held-white probe
   ends with 19 red charge instead of R1's one.

R2 does **not** improve aggregate natural training outcomes over R1: those
episodes never reach these static preconditions. That is an explicit limit, not
an extra aggregate improvement invented for an iteration label. No seed IDs,
future arrivals, lesson IDs, witnesses, color-name priorities or tuned weights
enter the runtime knowledge. Final rules were locked before improved held-outs.

**Compression:** plateau termination lives at the maintenance boundary, so remove
the redundant unreachable inner no-ammo method. Preserve the small shared
pressure/travel ranking, exact shared white asymmetry, and named dependency
tasks instead of adding seed/board patches. `simplified` repeats of all six seeds
have exactly identical job plans, full action traces and final states to `final`;
the summary script asserts this. No further knowledge rounds were performed.

## Controlled episodes: independent outcomes

Each row sums three 90-second episodes. Initial snapshots and SHA-256 arrival
tapes match per seed between policies. All model ticks use the unchanged 30 Hz,
0.0725 trial chance, lane/color weights. Arrows never consume the arrival tape.
The real pure controller owns one-second requests, 1000 ms budget identity,
12-arrow/s pacing, local safety and prefix reconciliation. A 60 Hz virtual
presentation pulse delivers results on the next frame (16.7 ms nominal); search
runs synchronously with a real 1000 ms CPU deadline and existing node bounds.
CPU time is recorded but **not charged to virtual time**. No worker scheduling,
main-thread rendering cost or wall-time starvation is simulated by this model.
Plans only see snapshots, never the tape. This optimistic latency model must not
be described as real-browser 90-second survival.

| Split / version | Mixes / charge lost | Black kills | Boost groups / gain | Productive actions | All arrows | Final board / black | Max height |
|---|---:|---:|---:|---:|---:|---:|---:|
| Train before | 109 / 157 | 120 | 6 / 30 | 720 | 2900 | 148 / 83 | 13 |
| Train R1 | 0 / 0 | 195 | 8 / 40 | 858 | 2869 | 34 / 8 | 6 |
| Train R2/final | 0 / 0 | 195 | 8 / 40 | 858 | 2869 | 34 / 8 | 6 |
| Held-out before | 94 / 147 | 145 | 7 / 35 | 749 | 2888 | 132 / 82 | 9 |
| Held-out locked final | 0 / 0 | 220 | 9 / 45 | 864 | 2858 | 31 / 7 | 6 |

Empty shots: zero throughout. Deaths: zero throughout. All episodes censored at
90 seconds; **no survival gain established**. Final held-out seed 42/87/31415
board counts: 13/13/5 versus 40/32/60; black counts 2/2/3 versus 24/22/36.
Meaningful actions here are gathers, compatible/new charge, real white conversion,
black kills and ordinary blocker kills; replacement and movement are separately
visible in traces. Productive does not mean strategically optimal.

Nominal unfilled arrow slots (90×12 minus arrows per episode) total 340 → 371
training, 352 → 382 held-out. This includes 60 Hz beat quantization, source/target
guard waiting and genuine idle, **not a pure idle-time measurement**. Slightly
fewer arrows coexist with more useful work, kills and smaller boards. There are
no extra immediate replans or stalling-to-minimize-loss rules. Observed max live
planner CPU per job was below 4 ms across final/simplified episodes; baseline
maxima were roughly 48–62 ms. These small local timings are not portable limits.
Ten-second sliding-window outcomes, all jobs and full action/invalidation traces
are retained, rather than only terminal counts.

## Real latest-app browser evidence

Muted isolated Chromium, owned ephemeral server, actual module Worker and latest
app: 25 wall-clock seconds each, seed 2009, default pace. Frozen query versus
default live, not identical timing/arrival-prefix guarantees:

| Profile | Arrows | Mixes / charge lost | Black kills | Boost groups | Empty shots | Model/guard errors |
|---|---:|---:|---:|---:|---:|---:|
| Frozen | 253 | 16 / 19 | 3 | 0 | 0 | 0 |
| Live | 250 | 0 / 0 | 17 | 1 | 0 | 0 |

`live-policy-browser.json` retains complete evidence. Early and 25-second
screenshots are `live-policy-browser-{frozen,live}-{early,25s}.png`. They show
different causal paths, not matched-state visual treatment or physical P3 proof.
The harness verifies profile adoption, independent model replay, exact guards,
manual takeover, Tab and checkbox cancellation, with zero page errors. It closes
both contexts, browser and server in `finally`, never touching port 8772.
The existing smoke also passes: actual busy-Worker cancel/supersession,
fingerprints, input immutability, main-thread heartbeat, restart/hidden/manual
takeover and shared causal feedback/P3 gates. No stale guards were weakened.

## Regressions, known failures and evidence inventory

**103/103 combined Node tests pass**, including 320,000 simulator/model
transitions, six legacy exact goldens, all eight curriculum witnesses and frozen
HTN solves, 128 frozen held-outs, 18 original controller tests, 42 color-branch
cases and negative miswiring/prefix/budget cases. Seven new tests cover independent
live replay, incompatible held charge, held-white activation, urgent reserve,
mixed stacks, white-cap asymmetry, ammo plateau, explicit disposal and interrupted
prefixes, including inspection/counting of the deliberate loss. Hash assertions pin simulator/model, original frozen domain, both
baseline search files and both Worker source files. Worker runtime source imports
the new engine/profile; claiming its unchanged hash alone proves unchanged
runtime policy would be wrong.

Still limited: ordinary blocker shooting may spend resources better saved;
parking only enumerates empty/matching tails, lacks a stacking-height admission
test, and does not model arrival pressure while carrying inventory; reserve
checks cover exposed white, not every buried
dependency; greedy method order and conservative target guards may waste travel
or abandon good work. The exceptional-discard fixture intentionally loses eight
charge despite alternative game-legal strategies potentially existing outside
the encoded knowledge. The no-ammo fixture correctly cannot act until new
information/resources arrive. These are incomplete-method limitations, not
unsolvability claims. No long-session, cross-browser, optimality or general
heuristic-learning claim follows from six seeds and authored probes.

Ignored local evidence under `generated/`:

- `live-policy-before-{train,heldout}.jsonl`, before source copies and SHA-256 files.
- `live-policy-r1-train.jsonl`, R1 source copies and counterexample results.
- `live-policy-r2-train.jsonl`, R2 probes and the failed reserve direction above.
- `live-policy-final-{train,heldout}.jsonl`, `live-policy-final-cases.json`.
- `live-policy-simplified-{train,heldout}.jsonl` and final source hashes.
- `live-policy-locked-source-hashes.json` and locked runtime source copies.
- `live-policy-summary.{json,csv}`, pairing and simplification assertions.
- `live-policy-browser.json`, screenshots, `live-policy-tests.txt`, smoke
  `report.json` and `live-policy-smoke-stdout.json`. Previous smoke files copied
  to `live-policy-before-*` before rerunning it.

Durable compact aggregate trial records: `live-policy-trials.jsonl`.
Do not overwrite archived `before`/`r1` trials with today's code: use the saved
source snapshots if reproducing historical methods. Current-code reproduction:

```sh
node --test 06-autoplay-playable/live-policy.test.mjs
node 06-autoplay-playable/live-policy-cases.mjs rerun
node 06-autoplay-playable/live-policy-episodes.mjs rerun live train
node 06-autoplay-playable/live-policy-episodes.mjs rerun live heldout
uv run --script 06-autoplay-playable/live-policy-browser.py
uv run --script 06-autoplay-playable/smoke.py
node 06-autoplay-playable/live-policy-summary.mjs
```

The summary uses retained historical/final/simplified files; it is an evidence
audit, not a fresh historical-source runner. Original frozen regressions remain
the commands in `05-autoplay-lab/HTN.md`. No global installs, publishing, root edits or
autonomous scheduler were introduced.
