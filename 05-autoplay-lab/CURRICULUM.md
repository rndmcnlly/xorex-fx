# White-stack curriculum: static authored drills

Eight clean, structured snapshots, original **20 lanes**, maximum lane height 14
both initially and throughout every witness. Black banks are regular, not random
noise. These are design proposals for lessons, not recovered historical levels.
No arrivals, pressure schedule, blackening, advance rate, live progression, or
attract-mode integration is implemented. Survival under stochastic encroachment
is **not measured**. Main-session progression proposals are separate work.

## Durable fixtures and canonical arrows

`curriculum.mjs` contains small source-authored lane fixtures, independent lesson
metadata, and structured witness commands expanded by the **accepted model**.
`lessonSnapshot(id)` exports a fresh complete snapshot; `witness(id)` exports fresh
primitive arrows, macro encoding and complete final snapshot. For independently
pinned exact arrow exports, `curriculum-witnesses.mjs:canonicalPlan(id)` decodes
versioned L/R/U/D strings. Tests compare these with the command-generated plans
and replay with `03-svg-demake/model.mjs:act`, not just the compact simulator.

The witnesses are **solutions, not shortest-path claims**. Their metadata is not
fed into search. The explicit UI oracle button resets to the authored source,
cancels any active job, labels the result `explicit-oracle`, and replays it with
the model. The existing export button exports source, fingerprint, job/oracle ID,
plan and final snapshot. Search still begins at the currently visible state.
Workers never import curriculum or oracle modules.

## Ladder and checked witness budgets

Charge below includes initial cap plus all positive conversion additions, not
just white. Black count equals actual witness shots: no ordinary gems are shot.
Every final board and inventory is empty. Frame count remains zero.

| ID / lesson | Teaching operation | White bonus groups | Black / shots | Total charge | Final cap | Arrows / macros |
|---|---|---:|---:|---:|---:|---:|
| 01 A color before white | Red activation before a single-white boost | 1 | 6 | 6 | 0 | 12 / 10 |
| 02 Read the whole bottom run | Adjacent pair gathers as one run | 2 | 20 | 21 | 1 | 24 / 22 |
| 03 Move one white onto another | Gather, relocate, regather, convert | 2 | 15 | 21 | 6 | 22 / 19 |
| 04 Three tributaries, one reservoir | Join three initially separated singles | 3 | 40 | 47 | 7 | 62 / 48 |
| 05 Spend to expose the engine | Shoot two blockers, retain one colored charge | 2 | 20 | 23 | 3 | 24 / 22 |
| 06 Park the wrong color | Stash blue, uncover red, activate, boost, later clean up | 1 | 6 | 7 | 0 | 22 / 13 |
| 07 Bootstrap, uncover, then consolidate | Unlock first white, boost, unlock pair, merge with single | 1 + 3 | 45 | 52 | 7 | 56 / 51 |
| 08 The structured black bastion | Merge five runs into seven whites, clear black banks | 7 | 191 | 246 | 55 | 239 / 201 |

06 intentionally discards **one** remaining red charge when the parked blue is
finally recollected/converted. This is legal cleanup, not a missing shot in the
accounting: 7 generated − 6 shots − 1 discarded = 0. Ordinary red activation in
01/04/06 is included. 08 is 191 black out of 198 gems (96.5%), with five white
resource lanes, thirteen height-14 banks, one height-9 bank and one empty lane.

Prerequisites form the above chain. They indicate instructional sequencing, not
a claim that every later board is empirically harder than every earlier board.
05 deliberately introduces uncovering with a simpler grouping problem than 04.

## Necessity evidence: what is proved

**Rules:** white is collected only from maximal same-color bottom runs. Black
cannot be gathered. Up with held inventory replaces it before any firing can
occur. Only held white into an existing *different, nonwhite* cap earns `5*n²`
additive charge. Exhausting the cap while uncovering loses that colored reserve.
One charge kills exactly one bottom gem, never a whole column.

Conservation bound: suppose white groups have sizes `n_i`. Even granting free
access to every ordinary gem and ignoring incompatible capacitor colors,

`available shots <= initial cap + all nonwhite/nonblack gems + 5 * sum(n_i²)`.

This is an **optimistic upper bound**, not an executable plan. It includes all
ordinary gems, including initially held blue in 06. Incompatible conversions can
only reduce it. Replacements cannot duplicate white or charge. Firing white only
reduces the bound. If group sizes are capped at `k`, the largest possible sum of
squares packs all whites into groups of `k` plus one remainder. Tests check this
general bound independently of the witnesses.

| Lesson | No joining original white runs: maximum shots | Black demand | Stronger necessary group size |
|---|---:|---:|---|
| 03 | 11 | 15 | At least 2: single-only maximum 11 |
| 04 | 17 | 40 | All 3: even 2 + 1 gives only 27 |
| 07 | 32 | 45 | At least 3: 2 + 2 gives only 42 |
| 08 | 56 | 191 | All 7: even 6 + 1 gives only 186 |

01 needs the real white bonus: ordinary conversion alone yields at most two
shots for six black. 02 needs the bonus from its existing run, not relocation.
05 needs both blocker shots before its only white becomes accessible. Its three
starting charges preserve a colored cap after those two shots; starting with two
would **not** suffice. These milestones are asserted in the tests.

06 has a bounded exact proof in addition to its witness. With inventory
replacement forbidden, exhaustive accepted-model reachability visits **11
canonical states** and finds no full clear. Lanes are interchangeable for this
reachability question: sort whole lane sequences and omit position, since lateral
travel is unrestricted. Stores and each lane's internal order are retained. The
helper has a hard state limit and distinguishes exhausted from truncated runs.
Its proof does not establish shortest travel or require the particular empty
lane chosen by the witness. In 06 there is initially no matching blue tail:
the tuned filter excludes *every* first replacement, including the needed stash.
The full legal action generator retains it. No policy fix was smuggled in.

07's canonical order is not uniquely necessary: the accessible single can supply
the first boost instead. What matters is a bootstrap conversion before all
whites can be exposed, plus a subsequent group of three. It cannot simply gather
all four whites first: five black blockers exceed its initial two charges.

08 has a **planner-horizon obstruction**, not game unsolvability. All seven whites
must enter one bonus group. They begin in five runs, so at least four replacements,
five gathers and one conversion are required, in addition to 191 shots. Therefore
any full clear needs at least **201 macros**, exceeding the current 200 maximum
(legacy defaults to 48). The witness meets that macro bound, but is **not claimed
primitive-arrow shortest**. No horizon or policy setting was changed for it.

## Holdout diagnostic: actual 500 ms Node results

Fixtures and witnesses were finalized before measurement. These are diagnostic
holdouts for the already-selected policies, not new training data or a model
generalization study. Search receives snapshots only, never witness arrows.
Two seeds (37, 53), one observation per seed per cell, 500 ms end-to-end Node
budget, 20-iteration warmup per board/policy. Timing is sequential and checked
between indivisible iterations. Legacy retains default horizon 48; resource and
restarts retain automatic horizons. Restart baseline is `resource` with node cap
1, **not expanding-tree MCTS**. No policy changes followed these observations.

| Lesson | Legacy UCT clears | Resource UCT clears | Rollout restarts clears |
|---|---:|---:|---:|
| 01 activate | 2/2 | 2/2 | 2/2 |
| 02 run | 2/2 | 2/2 | 2/2 |
| 03 relocate | 1/2 | 2/2 | 2/2 |
| 04 three-way merge | 0/2 | 2/2 | 0/2 |
| 05 uncover | 2/2 | 2/2 | 2/2 |
| 06 park | 2/2 | 0/2 | 0/2 |
| 07 bootstrap | 0/2 | 0/2 | 1/2 |
| 08 bastion | 0/2 | 0/2 | 0/2 |

07 resource converts **2 + 2** whites, leaving 3 black with no charge in both runs:
this is the concrete premature-conversion trap, not just a difficulty label.
Restarts find **1 + 3** and clear once, leaving 13 in the other run. Legacy also
finds **1 + 3** but leaves 3/5 black with 10/12 charge, consistent with its shallow
horizon, not lack of ammo. 04 legacy finds the **three-white group** but leaves
2/4 black despite 9/11 charge; resource clears. A failed full-clear metric alone
would conceal that successful indirect reasoning.
06 resource/restarts leave 4 black, zero charge, both
seeds. This is the proven action-space exclusion, not just low sampling luck.
08 resource leaves 109/103 black, well short of even reaching its horizon ceiling;
the lower bound does **not** explain all of that shortfall. Restarts leave
149/135; legacy leaves 156/150 total gems (156/148 black). Failures elsewhere do
not prove necessity or difficulty. These are tiny, timing-sensitive samples.

Raw `generated/curriculum-benchmark.json` preserves all 48 replay-verified plans,
snapshots, outcomes, seeds, timings and diagnostics. macOS arm64, Node v26.12.1.
Existing tuning experiments, legacy goldens and historical reports are untouched.

## Reproduce and inspect

```sh
node --test 05-autoplay-lab/lab.test.mjs 05-autoplay-lab/perf-regression.test.mjs 05-autoplay-lab/tuning.test.mjs 05-autoplay-lab/curriculum.test.mjs
node 05-autoplay-lab/curriculum-benchmark.mjs 500
node 05-autoplay-lab/curriculum-verify.mjs
uv run --script 05-autoplay-lab/curriculum-browser.py
```

24 Node tests pass, including 320,000 simulator/model comparisons and six legacy
goldens. New tests verify exact durable arrows, clear+held-empty, capacitor
remaining, charge generation/discard, groups, all-arrow legality, height bounds,
prerequisite milestones, conservation bounds, the 11-state proof, and fresh
nonaliasing fixture/witness exports. No large BFS was attempted.

Chrome 156.0.8078.74 smoke replayed all eight oracle witnesses, checked rewind,
real Worker search, unchanged input, exact final replay, frozen frames, and
oracle cancellation of an in-flight search with no stale overwrite. Zero page
errors. The harness owns an ephemeral server and muted headless browser, closes
both in `finally`, and never touches the existing 8772 server.

Evidence: `generated/curriculum-browser.json`,
`generated/curriculum-verification.json` (standalone snapshots, canonical arrows,
full witness event traces, and shot/white-group accounting for all 48 plans),
`generated/curriculum-bastion-board.png`,
`generated/curriculum-bastion-cleared.png`,
`generated/curriculum-relocate-search.png`.

The lab canvas now fits all 14 rows without clipping the head gems; this is a
plain lab-only layout correction, not an original-rendering change. UI still
exports worker job IDs/source fingerprints and independently labels oracle jobs.
No game mechanics, RNG weights, ticks, planner heuristics or integration changed.
