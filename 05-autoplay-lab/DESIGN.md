# Frozen-board planning design

## Second-spin implementation boundary

The detailed reward/rollout description below records the **legacy** policy,
retained verbatim in `legacy-search.mjs` with its six throughput goldens. See
`TUNING.md` for preregistered variants, independent outcomes and limitations.
`search.mjs` adds selectable, genuine UCT variants without editing the simulator.
The default is `resource`, without greedy seeding; explicit `policy:'legacy'`
returns the original implementation and exact original option/output shape.

The `resource` policy uses an automatic horizon
`min(200,max(48,2*(board+held)+8))` unless explicitly overridden; 200 remains the
hard limit. Its rollout explores uniformly 10% of the time; otherwise it samples
up to ten different actions, scores their resulting states, and uses primitive
travel only to break ties. Inventory choices retain conversion and replacements
onto same-color tails. This is a deliberate, **incomplete action restriction**,
not a dominance theorem: empty-lane stashing can be essential to preserve ammo
before firing. An explicit regression test and the legacy selector preserve
this counterexample. No new compound macro or changed arrow semantics exists.

Resource utility is `1` on a clear, otherwise
`.9*(1-weightedRemaining/initialWeighted) + .08*min(charge,black)/initialWeighted`,
where `weightedRemaining=board+held+2*black` and the denominator is at least one.
Useful charge is valued in fixed initial-gem units, avoiding the legacy
last-black coverage discontinuity. There is no cumulative or time-cost reward,
and holding alone cannot improve it. Utility values across evaluators are not
comparable task outcomes. Prefix incumbents and prefix-max backup remain; the
separate terminal-backup experiment did not improve training clears.

`seeded` runs one deterministic, same-evaluator filtered greedy trajectory at
construction, with the same horizon, and reports whether the retained plan
came from `greedy-seed` or `mcts`. This is an ensemble, not a claim that greedy
work is MCTS. `greedyRemaining` records the seed contribution. Constructor work
is included in end-to-end benchmark budgets, not in `activeMs`. `long` and
`deliberate` preserve ablations. `maxNodes:1` is explicitly a rollout-restarts
baseline, with no expanding UCT tree. Legacy baselines remain one historical
trajectory and are not equal-compute opponents.

None of these variants merges transpositions, forecasts moving gems, reuses a
tree across snapshots, changes worker chunking, or estimates memory in bytes.
Longer rollouts do more work per iteration, so fixed-iteration rates are not
equivalent-compute comparisons to the throughput pass.

## Boundary: observation versus proposal

**Accepted mechanics:** `../03-svg-demake/model.mjs:act` is the source of truth.
Arrows mutate a state immediately. No cooldown. Lanes are head-to-tail arrays,
gather/replacement/fire operate on the tail, and lateral travel does not wrap.
Gather takes a maximal same-color run, never black. Inventory Up appends the
whole run. Empty-inventory Up consumes one charge and removes one enemy of any
color, or consumes charge on an empty lane. Empty/same-color conversion adds
normally; only mismatched white inventory adds `5*n*n`, preserving cap color.
Other mismatches clear **both** stores. A white capacitor is not a white bonus.

**Lab problem definition, not a recovered win condition:** remove all gems from
a frozen board and empty inventory. There is no survival metric, arrival, loss
tick, spawn RNG, or elapsed-game-time assumption. Replacement above 14 gems is
permitted exactly because `act` does not perform the model's tick loss check.
Conversion permanently removes inventory from the board, so it counts as task
progress. Merely holding gems does not. Capacitor may remain after a clear.
Lack of a useful action is a dead end, not a fabricated loss or invented ammo.

**Proposal only:** eventual loosely coupled attract planning could consume a new
snapshot roughly once per second, validate its job/fingerprint, then execute
arrows at a chosen speed. None of that is integrated or periodically simulated
here. Production planning needs a new decision about real arrivals/execution
speed. A frozen plan is not safe evidence about a moving game's future.

## Compact simulator

A packed `Uint8Array` stores all lanes consecutively, a 20-element `Uint32Array`
stores lengths, and scalar fields store position/inventory/capacitor. No per-gem
objects or strings in transitions. Tail edits use `copyWithin`; O(board size)
movement is intentional for this small board, not a claim of constant-time edits.
Capacity is initial board plus initial inventory: no action can increase that
total. Search snapshots are copied on entry; a working state is cloned once per
iteration and for sampled rollout candidates. States are **not retained per tree
node**. The path is reconstructed from the root each iteration. Maximum input is
5,000 gems including inventory, twenty lanes, coherent nonnegative stores, live
state. This bounds lab inputs, not game mechanics.

Only the fixture generator imports/calls `tick`, before freezing natural boards.
Neither search nor simulator imports it. PRNG use belongs solely to independent
search/fixture generators. Search cannot consume gameplay RNG or presentation RNG.
The UI replays arrows with the actual model, not with the compact simulator.

## Action space, transpositions, termination

Each edge is `moveToLane + Down/Up`, encoded `lane*2 + (Up ? 1 : 0)`.
With empty inventory: gather from colored tails, or fire at nonempty lanes if
charged. With inventory: convert at current position, or replace at any lane.
Conversion is lane-independent and therefore never needs travel. All replacements,
including appends onto empty lanes, remain available for run-merging tactics.
Empty shots, black gathers, empty gathers, boundary bumps, and standalone lateral
steps are excluded as unproductive, but **the simulator still implements their
real effects** and conformance tests exercise them. These macros are a restricted
planning action space, not new mechanics. They expand to original valid arrows
with all lane travel explicit. Equal incumbent utilities prefer fewer primitive
arrows, not fewer macros. Travel also breaks rollout-policy ties at negligible
`1e-6` per arrow; it is not a change to game time or reward rules.

Exact path keys include lane boundaries, gem order, and both stores, but omit
position. Revisiting the same board/resources just to change position can always
be replaced by direct travel in the next macro. Such cycles terminate selection
or rollout and cannot enter the exported incumbent. This blocks gather/replace
and lateral loops without falsely treating white-generated charge as unchanged.
No cumulative action reward can be harvested from old states. The key is an exact
string, not a collision-prone hash. Source fingerprints separately use FNV-1a64
over the exact input JSON: useful identity checks, **not cryptographic security**.

Cross-branch transpositions are counted with position but **not merged**. Shared
UCT/DAG values and depth-dependent horizons require more care than a naïve global
visited set. The diagnostic set is bounded by retained tree nodes; path sets
are bounded by the macro horizon. Trees stop growing at `maxNodes` (default
12,000; configurable 1–100,000), but continue selection/rollouts. Each node holds
statistics, child indexes, move, and at most forty remaining edge choices, not
full snapshots. At this cap, an expanded node with some still-untried moves uses
its existing children, so cap saturation can narrow exploration. Root cap 1 is
pure rollouts and is tested. No tree is reused across unrelated snapshots.

Termination: clear, no productive macro, path cycle, or finite macro horizon
(default 48, allowed 1–200). `partial` is an incumbent with progress, `plateau`
means no better prefix was found, **not an unsolvability proof**. The diagnostic
`termination` describes the incumbent (`clear`, `no-productive-actions`, or
`bounded-search`), not a claim that the search exhausted the state space.

## Reward and failure meaning

For initial weighted count `W0 = board + inventory + 2*black`, evaluate:

```text
clear (board == 0 and inventory == 0): 1
otherwise:
  progress = 1 - (board + inventory + 2*black) / max(1, W0)
  coverage = min(capCharge, blackRemaining) / max(1, blackRemaining)
  whitePotential = min(1, whiteRemaining/3), only for a nonwhite charged capacitor
  utility = clamp(.82*progress + .12*coverage + .03*whitePotential, -1, .99)
```

The weights are **task-derived heuristic preferences**, not original score or
mechanics. Black gets extra weight because only firing removes it. Cap value is
saturated at useful remaining black demand, preventing charge farming. Visible
white plus a nonwhite cap gets a small opportunity value, not presumed future
bonus charge; the simulator must actually gather/convert white to create charge.
The nonlinear `5*n*n` bonus itself appears only in transitions. This heuristic
does not fully price accessible/buried resources or grouping opportunities.

Holding a gathered run leaves weighted remaining unchanged. Conversion decreases
it. Replacement cannot improve progress by itself, although moving white can
enable a later real bonus. Losing ammo needed for black gems reduces coverage;
an explicit test makes a destructive mismatch worse than preserving five needed
shots. Empty-shot consumption and color-agnostic single kills are oracle-tested.
All-black/no-charge has no actions and yields a genuine plateau. Nonclear reward
never ties a full clear, even with lots of spare charge.

Incumbents are updated at **every executable prefix**, with utility first and
primitive cost second. A rollout may discover a good prefix and then fail; only
the good prefix is exported. Backpropagation uses the maximum prefix utility
seen in that selected trajectory. This is an optimistic finite-horizon planning
objective, not cumulative return, discounted survival, or a proof of a safe
continuation. It can overvalue a useful prefix whose continuation deadlocks.

## Genuine MCTS and baselines

Each iteration performs UCT selection using mean backpropagated utility plus
`c * sqrt(log(parentVisits+1)/childVisits)`, expands one uniformly sampled untried
edge when capacity permits, does a stochastic rollout to the remaining horizon,
and backpropagates that trajectory's best prefix utility through visited nodes.
There is a real retained tree with visits, sums, child selection, and exploration.
It is not repeated greedy search labeled MCTS.

The rollout policy is 30% uniformly random; otherwise it evaluates up to six
random candidate macros and chooses the strongest one-step utility (travel
tie-break), avoiding known path cycles. Sampling is with replacement. Sparse
white/run-merging opportunities can therefore be missed. The random baseline
executes one uniformly sampled cycle-free trajectory. Greedy executes one
trajectory choosing the strongest one-step candidate across **all** candidates,
then travel and macro number. Both keep their best prefix and have the same
horizon and evaluator. They are explicit baselines, not equal-compute opponents:
1,500 MCTS iterations use much more CPU than one baseline run. MCTS is not seeded
with a greedy incumbent. The measured natural fixture is better served by greedy
at this budget. Do not infer a general MCTS advantage from small fixtures.

## Worker protocol and responsiveness

Input messages:

```js
{type:'search', jobID, snapshot, options:{seed,horizon,exploration,maxNodes},
 budgetMs:1000, iterations:10000000}
{type:'cancel', jobID}
```

Milliseconds are clamped to 1–60,000; iterations to 1–10,000,000. Either budget
ends the job. Default browser runs use milliseconds; tests use a fixed iteration
count plus a generous time limit. Job IDs are unique per UI run. A new search
supersedes previous work. Matching cancellation yields `{type:'cancelled',jobID}`.
Errors are `{type:'error',jobID,message}`. Progress/final outputs contain job ID,
source fingerprint, seed/options/budget, incumbent macros and primitive plan,
final snapshot, utility/status/termination, iteration/node/cycle/transposition
diagnostics, and active/wall timings. Output arrays/objects do not alias search
internals. Browser structured cloning separately isolates input/output memory.

Worker chunks aim for 12 ms then yield with `setTimeout(0)`. One iteration is
indivisible and may overrun that target or the time budget, especially for large
snapshots/horizons. Progress is throttled to ~200 ms. This is not a single huge
blocking worker loop: cancel/new-job messages are processed between chunks.
The UI additionally terminates its own worker immediately on cancel/reset/replay,
giving stronger cancellation than waiting for an unusually long iteration. It
accepts answers only for the active job and matching source fingerprint; replay
or reset invalidates the active job first. Worker `iterationsPerSecond` uses
active search time, while `wallIterationsPerSecond` includes yielding. No portable
per-worker heap measurement is claimed (`memory:null`). Node's benchmark records
one explicitly process-wide memory sample, not inferred tree bytes or a peak.

## Known limits and next experiments (proposals)

- Single-step resource heuristics and 48-macro horizons are myopic, especially on
  the natural board. Real-time loss pressure is intentionally entirely absent.
- Prefix-max UCT can waste visits rewarding ancestor progress before a bad move;
  horizon/continuation-aware backup is an experiment, not silently implemented.
- Full clear and useful black removal do not imply original-game survival skill.
- Plan length is a tie-break, not a global minimum-arrow solver.
- Cross-branch repeats still consume search, even though path cycles are blocked.
- No solved-node propagation or proof search; solved trivial boards continue
  cheap iterations until budget ends, so their rates are misleading as throughput.
- An initial greedy incumbent would prevent the measured natural-fixture utility
  regression. Keeping both in an incumbent ensemble is a sensible next lab test.
- A better reachable-ammo bound, access-aware rollout, progressive widening,
  grouping macros, transposition DAG, and tree reuse all need independent tests.
  They are not implemented and should not be smuggled in as recovered mechanics.
