# Small resource HTN, 2026-10-30

**Profile boundary:** this document's measurements and methods describe the
original `profile:'frozen'` objective, still the default for HTN and its Worker.
The live playable now explicitly requests `profile:'live'`, implemented in
`htn-live-domain.mjs` with bounded maintenance tasks and a different incumbent/
termination contract. Frozen decomposition, simulator and baseline policies are
unchanged. See [live-policy learning](../06-autoplay-playable/LIVE-POLICY-LEARNING.md)
for the separate two-round experiment. Do not compare a live task boundary to a
frozen full clear as if they were the same objective.

**Implemented lab proposal, not recovered game intelligence.** Choose **HTN:
resource methods + backtracking** in the existing policy selector. It plans from
the current visible frozen state, exports its decomposition and bounded failure
trace, and steps/replays through the unchanged accepted model. UCT remains the
default and all its policies remain selectable. No actual-game integration.

## Architecture and problem boundary

The problem is still: empty board **and** inventory, no arrivals, infinite
execution speed. The goal test never equates having enough charge with clearing.

| Layer | Files | Responsibility |
|---|---|---|
| Mechanics | unchanged `sim.mjs`, accepted `../03-svg-demake/model.mjs` | Exact existing arrows, ordinary addition, asymmetric white bonus, one-shot kills |
| Domain knowledge | `htn-domain.mjs` | Explicit task methods, preconditions, access costs and optimistic resource estimates |
| Planner | `htn.mjs` | Task-network decomposition, DFS alternatives, backtracking, state copying, bounds, valid-prefix incumbent |
| Browser transport | `htn-worker.mjs` | Chunking, jobs, fingerprint, cancellation and supersession |
| Tests / measurement | `htn.test.mjs`, `htn-cases.mjs`, `htn-experiment.mjs`, `htn-benchmark.mjs`, `htn-verify.mjs`, `htn-browser.py` | Fixtures, independent model replay, preserved failures and browser evidence |

This is the interpreter/domain-knowledge pattern, rather than heuristic greedy
search renamed HTN. An agenda contains named compound tasks and arrow operators.
Applicable methods create different successor agendas; failure returns to a
deferred method and its own copied state. The engine does not choose methods by
one-step game reward. Its incumbent preference only chooses which **already
executed valid prefix** to return on interruption: maximize
`-(board+held+2*black) + 0.01*min(charge,black)`, breaking ties by primitive
length. This is a bounded state heuristic, not a strict lexicographic order or a plan
optimality claim. Full clear stops at the first found solution.

Runtime imports are `htn-worker -> htn -> htn-domain / sim`. No runtime planner
imports curriculum, fixtures, witnesses, game RNG, ticks, or lesson IDs/titles.
Only test/measurement/UI code knows those. Nonwhite colors are treated by equality,
not by particular color names or board identities.

## Intent, methods and preconditions

Hierarchy:

```text
ClearBoard
  CleanupHeld -> ConvertHeld | ParkInventory
  ObtainAmmo
    EstablishColoredCharge -> Gather ordinary run, Convert
    AssembleWhiteRun -> Gather/Replace repeated, Regather, Convert
    BootstrapNow -> Assemble a smaller exposed run now
    FundAccess -> ExposeResources -> RepeatShot(gate cost)
  ClearBlackBanks -> RepeatShot(bank size)
  ClearBoard again
```

The alternative order is a deliberate knowledge choice, not learned weights.
Converting ordinary runs is tried before white consolidation, before opening
black-tail gates; bank shooting is deferred behind resource acquisition. Held
inventory first tries real conversion, then parking alternatives. Backtracking
is what recovers from bad early conversions, not a hidden oracle.

| Method | Preconditions / resource planning | Failure or limitation |
|---|---|---|
| `ConvertColor@lane` | Exposed nonwhite/nonblack run. Gather maximal run then convert. Estimate records cap compatibility and run size. | A mismatch legally destroys stores. An alternative may be required. |
| `JoinExposedThenConvert` | One or more exposed white runs. Append onto one white target, regather, convert. Exact addition estimate is `n` for empty/white cap, `5*n*n` for a nonwhite cap. | It does not anticipate every future access order. |
| `BootstrapNow@lane` | At least two exposed white runs and a buried resource gate. Choose one run now rather than merge all. | Enumerates individual runs, not all arbitrary subsets. |
| `FundAccess` / `Expose@lane` | Inventory empty, black-tail suffix above a nonblack resource, gate shots <= current charge. Estimate includes reserve and exposed color. | Zero reserve is legal but loses cap color; estimates show that consequence rather than inventing a white bonus. |
| `ParkInventory@lane` | Inventory held, charged cap and black work remaining; matching-color tails plus one nearest empty lane. | The charged-cap precondition is incomplete, see the counterexample below. Arbitrary obstructing placements are not enumerated. |
| `ConvertHeld` | Inventory held. Always a real legal Down conversion. | Can lose needed ammo. Deferred parking must rescue that branch. The white-group safety test below applies to assembled groups, not this unconditional input-inventory fallback. |
| `ShootPureBanks` | Empty inventory, charge, pure-black nonempty lanes. Repetitions spend at most available charge. | No free whole-column removal, no shooting ordinary blockers to preserve a cap. |

### Partial-white safety

For an assembled exposed group `n`, let `W` be all remaining white and `O` all
ordinary gems. The optimistic shot bound before conversion is
`cap + O + 5*W²`. Afterwards it is
`cap + exactAddition(n) + O + 5*(W-n)²`.

If the before-bound covers current black demand but the after-bound does not,
the method is rejected with the group, demand and after-bound in the trace.
This grants free access, perfect later grouping, compatible ordinary conversions
and an activatable colored cap. Passing it **does not establish solvability**.
If the initial optimistic budget is already insufficient, the planner still
permits a legal conversion as partial progress. No bounds are reported as a
general unsolvability proof.

A separate post-lock test exposes the meaningful smaller-group alternative:
two exposed white singles, another pair behind four black, 41 black in a bank,
initial colored charge 1. Merging the exposed pair now gives at most 41 shots
against demand 45; bootstrap one now, spend four with reserve two, then merge the
remaining three. The accepted trace selects `BootstrapNow`, not merely an
alternative declared but never exercised.

## Two bounded knowledge rounds

Training was the existing eight authored curriculum snapshots, unchanged. Each
round had a 500 ms cap, 12,000 nodes, depth 2000. No coefficient grid, witness
imports, fixture edits or lesson-specific branches. `round:1` preserves the first
knowledge set for reproduction; default `round:2` is the locked final set.

| Round | Changes / observed failure | Clears | Nodes by lesson 01–08 |
|---|---|---:|---|
| 1 | Activate, consolidate exposed white, expose affordable gates, clear banks; held inventory only converts. Parking lesson ends with four black and no charge. | 7/8 | 19, 28, 25, 57, 31, 25, 143, 207 |
| 2 | Add parking, explicit bootstrap alternatives, optimistic partial-group safety. | 8/8 | 19, 28, 25, 57, 31, 48, 67, 207 |

Round 1 **already found** a 1+3 bootstrap by backtracking between exposure and
consolidation. Round 2 reduced its nodes from 143 to 67; this is not a newly
solved board. The added knowledge is a coherent bundle, not an isolated ablation
proving which addition caused every improvement. The parking lesson is the
actual new solve. Its successful round-2 search backtracks four times and has
one cycle stop. The staged lesson rejects an unsafe partial-white conversion.

All final training plans take 12, 24, 24, 64, 24, 22, 62, 239 arrows. Bastion is
201 arrow macros, including **191 individual shots** and four white replacements.
Its HTN search takes 207 expanded task/operator nodes and leaves 55 charge. The
MCTS 200-edge ceiling is not applied to HTN repetition expansion. No simulator
change was needed. Training timings were roughly 0–2 ms locally, not a portable
latency guarantee.

Knowledge was locked before the held-out runs. Afterwards only engine budget
diagnostics, tests, harnesses and reporting were refined, not method decisions.
Raw rounds are `generated/htn-round-{1,2}.json`.

## Held-out boards, including failures

`htn-cases.mjs` defines the test-only split before measurement:

* **80 transformations:** ten lane permutations and five-color relabelings of
  each curriculum snapshot, including inventory/cap color and changed position.
  These test equivariance, not independence from the training templates.
* **24 new layouts:** six resource/blocker families with four parameter variants:
  independently gated reservoirs, initially white caps and ordinary activation,
  mixed ordinary blockers/gem order, held wrong-color inventory with extra work,
  additional matching resources/gates, and four ammo-starved boards.
* **24 random-order small boards:** independently sampled gem order, multiple
  ordinary colors, varied starting charge, and sometimes held inventory.

Every plan is replayed with the accepted model. Results with the locked methods:
**80/80, 20/24, 24/24 clears**, respectively. The four new-layout failures use their
one initial shot and return 12/14/16/18 gems left, 11/13/15/17 black, no held gems
or charge. They have only one buried white, so even the generous initial ammo
bound is below black demand. The runtime reports method exhaustion, not a proof.
Synthetic held-outs are frozen snapshots; some exceed height 14. No survival or
arrival claim follows from them.

### Equal maximum time, independent outcomes

Final Node comparison: **396 runs**, 22 boards × 3 policies × seeds 37/53/71 × 2
timing repetitions, **150 ms maximum wall time**, sequential. Ten-iteration
resource warmup per board. HTN is deterministic and ignores search seed; its six
repetitions measure timing, not independent solutions or stochastic robustness.
It stops early on clear, method exhaustion or its 12,000-node cap. UCT/restarts
use the time cap and their unchanged adaptive horizon. Node exports occur after
the timed loop; elapsed fields include result construction, and indivisible
iterations can overrun. No per-worker memory measurement.

Restart baseline is the existing resource policy with `maxNodes:1`, sampled
rollout restarts, **not** expanding-tree MCTS and not a deterministic equal-time
greedy restart. No separate deterministic greedy-restart comparator was added.

Counts below include inventory. Each clear count is out of six observations.

| Board | HTN clears; median remaining / black | Resource UCT | Rollout restarts |
|---|---|---|---|
| Training 01, 02, 05 | 6; 0/0 each | 6; 0/0 each | 6; 0/0 each |
| Training 03 | 6; 0/0 | 6; 0/0 | 2; 4/4 |
| Training 04 | 6; 0/0 | 6; 0/0 | 0; 17/17 |
| Training 06 parking | 6; 0/0 | 0; 4/4 | 0; 4/4 |
| Training 07 staged | 6; 0/0 | 0; 3/3 | 2; 13/13 |
| Training 08 bastion | 6; 0/0 | 0; 111/111 | 0; 157/157 |
| Ten new resource layouts (families 0–4, variants 0/1) | 6 each; 0/0 | 6 each; 0/0 | 6 each; 0/0 |
| Two starved new layouts | 0; 12/11 and 14/13 | same counts | same counts |
| Natural/87 | **0; 4/3** | **6; 0/0** | **6; 0/0** |
| Natural/31415 | **0; 6/6** | **6; 0/0** | **6; 0/0** |

The natural boards are serious counterexamples to a general HTN superiority
claim. Both hit 12,000 nodes, around 49–50 ms, leaving zero charge. One retains
one white above three black. This is not method exhaustion or unsolvability.
The stronger stochastic policies use their 150 ms allocation and clear both.
The domain was **not retuned after these losses**.

HTN training median latency is about 0.13–1.48 ms. It is often not arrow-shortest:
new/0/0 uses 71 arrows versus resource's 54; natural failures use 235/284 arrows
versus resource clears with 217/268. On the starved layouts HTN also chooses a
farther pure bank than stochastic search's shortest shot. First-clear DFS and
fixed domain order trade plan compactness and general coverage for explainable,
cheap structured solutions. Full per-run held/board/black counts, arrows, shots,
charge, white groups, budget and timing are in the raw exports.

### A small, definitely solvable domain failure

Initially hold one white, have an **empty capacitor**, expose one ordinary red,
and leave six black in a bank. Legal solution: park the held white, activate red,
recollect and bonus-convert white, fire six times. The locked HTN only permits
parking when the cap is already charged, converts white too early and fails.
`htn.test.mjs` independently executes the legal solution and pins the planner's
failure. This is a method-precondition counterexample, not a changed fixture or
a third training round. It shows why bounds and explicit failure language matter.

## Bounds, copies and worker protocol

Defaults: 12,000 expanded task/operator nodes, 2000 expansion-depth steps, 20,000
executed arrow macros, 256 pending frontier branches, 1–60,000 ms Worker budget.
Depth counts decomposition and operator steps, not just shots. A RepeatShot task
expands one real shot at a time and can exceed the UCT horizon. Frontier overflow
drops the oldest deferred alternatives and counts them. Depth/action bounds
reject individual branches; node/time bounds stop the job. Exhaustion after
pruning reports `bounded-methods-exhausted`. All bounds and method restrictions
make this planner **incomplete**. A bound is never a claim that the game cannot
be cleared. The engine's `bounds` counters and `reason` preserve the distinction.

Exact transposition keys include ordered lanes, stores and remaining task agenda,
omitting position because travel is always available. Repeats are not merged into
a value graph. Root and rolling board/length typed arrays own their storage;
branches and incumbents copy it. Plans, traces and exported snapshots are fresh
copies. Task records are treated as immutable and RepeatShot creates a fresh
counter record. Search does not mutate the submitted game, consume gameplay RNG,
tick time, or wait for presentation.

`htn-worker.mjs` accepts `{type:'search',jobID,snapshot,options,budgetMs}` and
`{type:'cancel',jobID}`. It yields approximately every 8 ms, between single engine
steps; a large indivisible decomposition/export can overrun. Results/progress
include source fingerprint, job, exact expanded arrows, chosen methods and
estimates. Matching cancel is acknowledged; a new job supersedes the old closure.
The UI accepts only its active job/fingerprint, and terminates its worker on
reset/replay/cancel. It starts the correct worker afresh when switching policies.
The original MCTS worker and options are byte-for-byte unchanged.

The UI shows at most 32 chosen method records and 12 rejection records. Exports
contain the complete chosen trace, plus the first **64** rejection records. This
is a bounded diagnostic sample, not the full search tree or every failure. Chosen
records include their arrow-macro offset for resource timing/replay comparison.

## Validation and raw evidence

* **31/31 Node tests:** unchanged 320,000 simulator/model transition comparisons,
  six legacy goldens, existing tuning/curriculum tests, seven new HTN tests.
* `htn-verify.mjs`: **1064 preserved experimental plans, 73,115 arrows** replayed
  through the accepted model with productive-arrow legality, exact final state,
  frozen frames and fingerprint checks. Hash assertions confirm unchanged
  simulator, both search modules and original worker.
* Real muted Chrome Worker/UI harness: all eight search results clear and exactly
  replay, rewind restores input, trace export matches, reset invalidates in-flight
  output, legacy remains selectable. Protocol test uses a mixed 5000-gem job,
  explicit cancel acknowledgment, supersession without stale final results,
  immutable input, matching fingerprints, and a model-replayed time-budget prefix.
  First successful run recorded **97 main-thread heartbeats**, final run **98**,
  and zero page errors.
  The retained UCT browser-safety suite separately passed six real Worker runs,
  62 UI heartbeats and zero page errors (`htn-uct-regression-browser-report.json`).
  The owned ephemeral server and
  browser close in `finally`; port 8772 is never touched.
* The first browser harness's busy fixture was too easy (5000 charged black gems
  can finish before its delayed cancel); its timeout explanation is preserved as
  `generated/htn-browser-first-failure.txt`. Only the harness fixture changed.

Evidence is ignored under `generated/`: round files; initial `htn-heldout.json`,
`htn-comparison.json`, `htn-summary.json`; final `htn-final-{heldout,comparison,summary}.json`;
`htn-verification.json`; `htn-browser.json`; `htn-ui-export.json`;
`htn-bastion-plan.png`. The initial comparison is preserved separately, including
every failure. The final run follows diagnostic-only budget counter refinement.
Environment: macOS arm64, M3 Max, Node v26.12.1, Chrome 156.0.8078.74. Timing is
small local evidence, not a generalization theorem or controlled hardware study.

```sh
node --test 05-autoplay-lab/lab.test.mjs 05-autoplay-lab/perf-regression.test.mjs 05-autoplay-lab/tuning.test.mjs 05-autoplay-lab/curriculum.test.mjs 05-autoplay-lab/htn.test.mjs
node 05-autoplay-lab/htn-experiment.mjs 1 500
node 05-autoplay-lab/htn-experiment.mjs 2 500
node 05-autoplay-lab/htn-benchmark.mjs 150 htn-final
node 05-autoplay-lab/htn-verify.mjs
uv run --script 05-autoplay-lab/htn-browser.py
```

Run timing batches sequentially, not alongside tests/browser jobs. Reproduction
overwrites the named generated outputs; choose another benchmark prefix to keep
additional repeats. No further production architecture, arrivals, live executor,
attract-mode policy, or upstream mechanics changes are implied.
