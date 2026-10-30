# Bounded policy tuning, 2026-10-30

## Selection lock (after training, before held-out runs)

Selected `resource`, retaining prefix backup. Deliberate/resource/terminal all
cleared every training case at both budgets. Terminal backup has no demonstrated
benefit, so is rejected. Resource valuation removes the identified last-black
discontinuity; it is not a measured clear-rate win over deliberate. Seeded and
restart final variants use this same evaluator and prefix backup.

## Preregistered design (before experimental runs)

Stage-one sources and original hashes are archived at
`generated/tuning-before-src/`. Historical throughput reports are not rewritten.
The legacy policy will remain in a durable module and its six goldens stay exact.

Training boards: seeded/2009, natural/2009, natural/731; search seeds 11,22.
Held out until variant selection: seeded/87, natural/87, natural/31415 and the
240-gem heavy board in perf.mjs; search seeds 37,53. Small authored tactics and
the unsolvable plateau are correctness cases only, excluded from quality/rate
summaries. No fixture edits after observing outcomes.

Bounded candidates: legacy; longer horizon alone; deliberate rollout/action
filter plus longer horizon; corrected resource evaluator; terminal backup;
greedy-seeded winner as a separate ablation. No grid over weights, exploration,
or seeds. All use real UCT; no arrivals, time-cost objective or game integration.
Potential replacements are restricted only in the experimental policy: keep
conversion and appends onto same-color tails (including white merging), rather
than spending rollout depth relocating gems with no grouping benefit. No new
macro or simulator rule is needed.

Code review found a reward discontinuity: the legacy coverage term drops from
.12 to zero when the last black gem is removed, even if removing that gem is
real task progress. A candidate evaluator will price useful charge in units of
the initial weighted count instead. Compare independent remaining/black counts,
clear rates, arrow counts, leftover charge and dead ends, not utility numbers
across different evaluators. No cumulative action rewards.

Training: fixed 500 iterations and 500 ms per case, repeated twice, then select
one variant. Final held-out comparison: legacy, selected unseeded, selected with
greedy incumbent, and equal-wall-budget stochastic greedy restarts; 500/1000 ms
and fixed 500 iterations, three repetitions. A restart baseline is explicitly
not MCTS. Preserve every result, verify all exported plans with the accepted
model. Node active-time budgets exclude Worker yielding; measure final real
Workers separately. Work per iteration differs and must not be conflated with
throughput optimization. No per-worker memory estimates.

## Implementation and measured Node results

Recommended lab default: **resource UCT, automatic horizon, no greedy seed**.
The UI and API now use it; legacy remains selectable. This is a stronger frozen
board policy, not an original-game skill claim or an optimal planner. The
simulator is unchanged. Design details and evaluator equation are in DESIGN.md.
Useful architecture: a durable legacy implementation plus a small experimental
strategy subclass makes the policy boundary explicit. Retaining whole states at
every tree node or introducing a transposition DAG was unnecessary for this spin.

The new policy combines an adaptive 48–200 edge horizon, 10% random exploration
in rollouts, up to ten distinct sampled candidates, same-tail-only replacements,
and fixed-initial-count charge valuation. Primitive arrow length is only a
tie-break. There is no execution-time penalty. No compound action was added.

Training: 3 boards × 2 search seeds × 2 timing repeats × 5 policies × 2 modes =
120 replay-verified results. At 500 ms, legacy leaves median 46/53.5 gems on the
two natural boards, horizon-only leaves 26.5/17, and all three deliberate-rollout
variants clear every case. At 500 fixed iterations the corresponding natural
remaining medians are 48/56, 28/21, and zero. Resource evaluation also reduces
clear-plan arrows relative to deliberate: 196.5 vs 261.5 on natural/2009 and
247.5 vs 341.5 on natural/731 at 500 iterations. These are tie-break improvements,
not a changed task objective. Terminal backup produces no training clear-rate
gain and was not selected. Action filtering, lower epsilon and distinct candidate
sampling were tested as one coherent rollout change, not separately ablated.

Held-out Node: two search seeds (37/53), three timing repetitions each. Six
observations per cell, not six independent boards. Initial board/black counts:
seeded/87 20/5; natural/87 73/20; natural/31415 77/31; heavy 240/34. Every exported
plan is replayed using the accepted model, checking the exact final snapshot,
frame count, and primitive plan length. Counts below include held inventory.

### Equal wall budgets (Node, median remaining / black)

| Board | Budget | Legacy UCT | Tuned UCT | Tuned + greedy seed | Equal-budget rollout restarts |
|---|---:|---:|---:|---:|---:|
| seeded/87 | 500 ms | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| natural/87 | 500 ms | 49.5 / 10.5 | 0 / 0 | 0 / 0 | 0 / 0 |
| natural/31415 | 500 ms | 57 / 22 | 0 / 0 | 0 / 0 | 0 / 0 |
| heavy | 500 ms | 225 / 28 | 103 / 11.5 | 103 / 11.5 | 102 / 12.5 |
| seeded/87 | 1000 ms | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| natural/87 | 1000 ms | 49.5 / 10.5 | 0 / 0 | 0 / 0 | 0 / 0 |
| natural/31415 | 1000 ms | 56.5 / 22 | 0 / 0 | 0 / 0 | 0 / 0 |
| heavy | 1000 ms | 222.5 / 28.5 | 101 / 11 | 102 / 10.5 | 103 / 11.5 |

Both natural boards: tuned and restart variants clear **6/6** at both budgets;
legacy clears **0/6**. Seeded/87: all clear 6/6. Heavy: none clears. All reported
held-out exported partial plans have productive continuations, not dead ends.
This does not establish that their continuations can clear.

### Fixed work is not equal compute

500 iterations, median remaining (median total milliseconds in parentheses):

| Board | Legacy UCT | Tuned UCT | Seeded tuned | Rollout restarts |
|---|---:|---:|---:|---:|
| seeded/87 | 1.5 (52) | 0 (55) | 0 (53) | 0 (55) |
| natural/87 | 50 (87) | 0 (297) | 0 (303) | 0 (286) |
| natural/31415 | 58.5 (86) | 0 (317) | 0 (321) | 0 (322) |
| heavy | 229 (186) | 102 (1229) | 102 (1226) | 103 (1250) |

Tuned heavy iterations cost about **6.6× more**, not a throughput speedup.
Longer, less wasteful trajectories explain the quality improvement despite
fewer iterations within the wall budget. On heavy at 500 ms the median iteration
counts are 1366.5 legacy vs 199 tuned. Node budgets include construction and any
greedy initialization, exclude result export, and check between indivisible
iterations. Small time overruns are recorded, not trimmed away.

### What the baselines actually contribute

`restarts` uses the identical tuned stochastic rollout policy with node cap 1:
no expanding UCT tree, just independent sampled-greedy trajectories with their
best executable prefixes. It is an equal-wall-budget comparator, not one cheap
baseline trajectory. Its result's old internal origin label may say `mcts`, but
the experiment's `policy: restarts` label is authoritative: none of that gain is
attributed to tree search. Final exports correct this metadata to
`rollout-restart`, and summaries exclude restarts from MCTS-origin counts. This
post-measurement metadata fix does not change decisions or measured plans.
Legacy one-pass greedy/random buttons remain explicit
unequal-cost historical baselines.

At 500 ms, unseeded tuned UCT uses median arrows 72/204.5/254.5/553 on the four
boards; restarts use 57.5/196/243.5/553. Restarts are competitive and sometimes
better. **The evidence supports the rollout/evaluation/horizon changes, not a
general advantage of UCT over equal-compute restarts.** Genuine retained UCT is
still the requested planner, with that limitation stated rather than hidden.

Greedy seed alone clears seeded/87 and natural/87, leaves one gem on
natural/31415 and 105 on heavy. On natural/87 the seeded winner remains the
171-arrow greedy plan in all six 500 ms runs, shorter than unseeded tuned UCT's
204.5-arrow median. That improvement is **greedy's**, not MCTS's. MCTS supplies
all six seeded winners on natural/31415 and heavy. Seeding does not improve
held-out clear rates, so it stays selectable rather than default. At 1000 ms on
heavy, seeded's median 102 remaining loses to unseeded's 101: budget overhead
and timing alter iteration counts even with identical tree PRNG sequences.

At 500 ms, legacy's heavy plan leaves median 22.5 charges and 225 gems; tuned
leaves zero charges and 103 gems. This is useful expenditure, not bad play.
At natural/31415 tuned leaves one charge after clearing; no extra credit is
awarded for unused ammo. Plateau and tiny tactics do not enter these summaries.

## Losses and unresolved limits

- **Known small tactical regression:** one black gem, red cap ×1, blue inventory
  ×1, otherwise empty lanes. Legacy can stash blue on an empty lane, shoot black,
  recollect/convert blue, and clear. Tuned's replacement filter excludes the
  stash, converts mismatched inventory, destroys the necessary ammo and ends
  with one black gem. This loss is pinned by a test, not hidden or called
  unsolvable. The UI warns about the incomplete action space. Next bounded test:
  preserve full tree choices while filtering only rollout candidates, or retain
  a canonical empty-lane stash. Neither is silently added to this experiment.
- Heavy remains far from solved. The 200-edge cap binds long productive plans;
  no new macro or unmeasured deeper default is claimed as a fix.
- Prefix-max backup still rewards ancestor progress before a bad continuation.
  Terminal backup's lack of training benefit is not proof it never helps.
- Action filtering can discard other useful temporary placements. Infinite
  execution assumptions do not justify treating travel as elapsed-game cost.
- No transposition merging, progressive widening, tree reuse, or resource-access
  oracle was implemented. No moving-gem forecasts or actual autoplay integration.
- Per-worker memory remains unmeasured; retained-node caps are real, byte
  estimates are not. Full legacy goldens, mechanics and scratch coverage remain.

## Raw evidence and reproduction

`generated/tuning-train-node.json` (120 rows),
`generated/tuning-heldout-node.json` (288 rows), and
`generated/tuning-heldout-browser.json` preserve plans, all task outcomes,
individual repetitions, seeds/options, diagnostics and timings.
`generated/tuning-summary.json` contains machine-readable medians and ranges.
The exact stage-one source/hash archive is `generated/tuning-before-src/`;
its relative imports are preserved as evidence, not rebased for execution.
`legacy-search.mjs` is the durable executable counterpart and still matches all
six original full-output/tree/PRNG SHA-256 goldens. No historical report or
`perf-before` artifact is overwritten.

Environment: macOS arm64, Apple M3 Max, Node v26.12.1. Warmup: 30 iterations per
case/policy in Node. Timing batches are sequential, not run alongside tests or
each other. Other machine activity is uncontrolled, ordering is not randomized,
and this small declared split is not a generalization study. See README commands.

## Actual browser Workers

Chrome 156.0.8078.74, isolated headless muted browser, owned ephemeral root server.
The existing server on 8772 was verified reachable and never restarted/stopped.
288 replay-verified results: four held-out boards, four policies, two search
seeds, three repeats, fixed 500 iterations plus 500/1000 ms budgets. A 30-iteration
warmup precedes each worker's measurements; module/worker cold startup is
excluded. Round trip includes messaging and scheduling; time budgets include
constructor/greedy initialization and yielding. Workers and the owned server
are closed in `finally`. There were zero page errors.

Median remaining / black, six observations per cell:

| Board | Budget | Legacy UCT | Tuned UCT | Tuned + greedy seed | Rollout restarts |
|---|---:|---:|---:|---:|---:|
| seeded/87 | 500 ms | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| natural/87 | 500 ms | 49.5 / 10.5 | 0 / 0 | 0 / 0 | 0 / 0 |
| natural/31415 | 500 ms | 58 / 22.5 | 0 / 0 | 0 / 0 | 0 / 0 |
| heavy | 500 ms | 226 / 28.5 | 104.5 / 12 | 104.5 / 12 | 103.5 / 12 |
| heavy | 1000 ms | 224 / 28 | 101 / 11.5 | 101 / 11.5 | 103 / 11.5 |

At 1000 ms all variants again clear seeded/87, tuned/restarts clear both natural
boards 6/6, and legacy clears neither natural board. Heavy clears 0/6 throughout.
At fixed 500 iterations, every board/policy/seed's task outcome and plan match
the corresponding Node run. Heavy remaining medians are 229 legacy, 102 tuned,
102 seeded and 103 restarts; round-trip medians are respectively 219, 1487, 1473,
1488 ms. This reinforces the different-work-per-iteration warning.

Worker 500 ms heavy iterations: median 1125.5 legacy vs 179 tuned, round-trip
500.5 vs 501.9 ms. Tuned's remaining range is 104–105, rather than Node's 101–105,
because less search fits in a yielding Worker. At 1000 ms tuned reaches 101 in
all six Worker runs; none clears. No unsolvable/trivial fixture enters these
rates or quality summaries.

## Correctness, safety and handoff

- **19/19 Node tests pass**: the unchanged 320,000 exact simulator/oracle
  transitions, explicit mechanics, maximum-capacity scratch checks, six durable
  legacy goldens, plus tuned reproducibility, immutability, node caps, loop-free
  exported prefixes, dead ends, tactical wins and the pinned stashing loss.
- `tuning-verify.mjs` independently replays **696 experimental plans** and asserts
  **96 exact Node/Worker fixed-iteration comparisons** (plans, snapshots, scores,
  nodes, transitions, cycles, duplicate counts). It asserts byte-for-byte unchanged
  simulator source and byte-for-byte stage-one legacy source. Final source hashes
  are in `generated/tuning-verification.json`.
- `generated/tuning-browser-report.json`: real Worker fixed-seed reproducibility,
  cap 600, explicit seeded-policy cancel acknowledgment, supersession without
  stale final results, UI latest-snapshot/reset/cancel safety, unchanged planning
  input, frozen model replay, zero page errors. **62 heartbeats** during the
  1200 ms UI job; it clears the 65-gem natural/2009 source using auto horizon 138.
- First browser-safety attempt failed because its old assertion still used the
  legacy evaluator. The failure explanation is preserved in
  `generated/tuning-browser-safety-first-failure.txt`. The corrected harness uses
  an independent implementation of the selected-policy formula and now checks
  the entire final snapshot too; the rerun passes. No mechanics fix was needed.
- UI screenshots: `generated/tuning-lab-natural-{plan,replayed}.png`. Historical
  screenshots and `browser-report.json` remain untouched; the optional `tuning`
  harness argument prefixes new evidence files.
- Worker deadline now starts **before** Search construction, charging greedy
  initialization to the budget. An indivisible iteration/constructor can still
  overrun; UI worker termination remains the strongest immediate-cancel path.

Handoff: use `resource`/auto as the stronger lab default, `legacy` as the full
macro-space counterexample reference, and `seeded` only as an explicitly named
ensemble. Do not integrate an executor into the real game. The most useful next
bounded test is recovering empty-lane stashing without restoring wasteful
rollouts, followed by a deliberate decision about the heavy-board horizon.
No claim of a tree-search advantage over the equal-budget restart baseline has
been established.
