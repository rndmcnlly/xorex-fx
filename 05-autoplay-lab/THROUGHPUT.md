# First throughput pass, 2026-10-30

**Outcome:** unchanged search at fixed work, with measured active-time speedups
of 1.92–2.78× in Node and 1.99–2.74× in actual browser Workers on three static
boards. This is a small local experiment, not a universal performance claim.
No evaluation, exploration, horizons, macro policy, rollout probabilities,
baseline policy, backup rule, tie ordering or random sampling changed.

## Evidence and version boundary

Baseline was captured **before edits**, including the original 320,000-transition
suite. Raw labelled results are `generated/perf-before-{node,browser}.json` and
`generated/perf-after-{node,browser}.json`. Each records SHA-256 of simulation,
search, worker and benchmark source. The original simulation/search/worker are
also retained in `generated/perf-before-src/`; only the search's oracle import
path was rebased so that this archived module can execute from its deeper folder.
Its original, unrevised hash is in the baseline reports.

Environment: macOS arm64, Apple M3 Max, Node v26.12.1, headless Google Chrome
156.0.8078.74. The benchmark CPU model and platform are recorded in raw Node
JSON. Timing runs were sequential, not concurrent with each other or tests.
An earlier mixed search/micro CPU profile ran concurrently with correctness
checks; it is retained as `perf-before.cpuprofile`, but its timings were replaced
with unprofiled sequential baseline timings. Search-only CPU profiles were
collected separately against the archived baseline and final implementation.
Other machine activity was not controlled, and before/after ordering was not
randomized. These are repeated batches, not confidence intervals.

## Profile and changes

The original architecture has useful separation: compact simulation, genuine
retained UCT statistics, and a yielding Worker. The hot-path code smell was
allocation inside the innermost sampled rollout loop, plus typed-array spreading
for every exact key. No change to the state representation was needed.

Search-only V8 sampling profile: three boards, seeds 11/22, 1,500 iterations,
horizon 48, cap 12,000. Before, 2,553/3,637 samples (70.2%) attributed self time
to `key`, 241 (6.6%) to `clone`, 118 (3.2%) to `features`, 101 (2.8%) to GC,
86 (2.4%) to `actions`. After, key was 479/1,517 samples (31.6%), iteration
442 (29.1%), features 105 (6.9%), copyInto 28 (1.8%). Samples are approximate,
include JIT attribution effects, and are not an allocation or heap measurement.
Raw files: `generated/perf-{before,after}-search.cpuprofile`.

Implemented, bounded changes:

1. `key`: direct byte reads and character concatenation instead of spreading a
   typed-array iterator into function arguments. **Identical exact strings**,
   including lane boundaries, stores, ordering, optional position, and live size.
   No probabilistic hash or changed cycle semantics.
2. `copyInto`: two Search-owned scratch states replace per-iteration and sampled
   candidate array allocation. Full board capacity and lengths are copied, then
   all scalar fields. Root, retained incumbent and exports still own their data.
   State capacities stay constant throughout a search. There is no buffer pool,
   cross-search sharing, retained-node snapshot, or API/protocol change.
3. Optional caller-owned output for `actions`, used only for the rollout's
   temporary list. Node `untried` lists remain independently allocated. The
   inventory branch fills the same ordered list with a loop, not `Array.from`.
4. Clear-only loop guards check size/inventory directly rather than calculating
   all reward features. Evaluation itself remains untouched.

Not implemented: incremental gem counts, lane offsets, numeric hashes,
transposition merging, policy changes, UCT changes, or worker scheduling changes.

## Fixed-work measurements

Each board: seeds 11/22, three batches per seed (six observations), **500 actual
MCTS iterations**, horizon 48, exploration .65, retained-node cap 12,000.
Warmup is 150 iterations per Node case, and a preceding 150-iteration job in
each isolated browser Worker. Browser measurements therefore exclude module and
Worker cold startup; they do not represent first-ever user-click latency.

`seeded`/`natural` use fixture seed 2009. `heavy` is a held-out deterministic
240-gem board, twenty 12-gem lanes, mixed buried whites/black, seven red charges;
its complete construction is in `perf.mjs`. No all-black plateau or tiny solved
board contributes to these headlines. Node total includes constructor/run, but
not export/serialization. Active times exclude Worker yields; Worker elapsed
starts after construction and includes yields; round trip includes messaging
and result delivery but excludes the prior warmup. Medians use the middle two
of six measurements.

| Board | Node active ms, before → after | Speedup | Worker active ms, before → after | Speedup | Worker round-trip ms, before → after |
|---|---:|---:|---:|---:|---:|
| seeded | 97.78 → 51.01 | 1.92× | 91.00 → 45.70 | 1.99× | 101.55 → 46.30 |
| natural | 170.84 → 75.96 | 2.25× | 159.45 → 66.30 | 2.40× | 200.95 → 66.80 |
| heavy | 499.30 → 179.72 | 2.78× | 455.10 → 166.30 | 2.74× | 609.20 → 207.20 |

The larger round-trip improvements are partly scheduling/timer effects, not
extra simulation speed. The 12 ms chunk target, zero-delay yielding, 200 ms
progress throttle, per-iteration indivisibility and budget-overrun possibility
are unchanged. No cold-start speedup or per-worker memory saving is claimed.
Trees retain exactly the same nodes, bounded by the original cap.

### Micro measurements and regressions

Five batches of 20,000 calls after 2,000 warmup calls, per board and operation.
Node only, separately reported from browser throughput. Median times, ms:

| Operation | Seeded before → after | Natural before → after | Heavy before → after |
|---|---:|---:|---:|
| allocate clone | 3.82 → 3.89 | 6.37 → 6.20 | 6.45 → 6.18 |
| exact key | 13.13 → 6.62 | 26.83 → 9.29 | 81.61 → 17.45 |
| allocating macro list | 0.69 → 1.03 | 0.83 → 1.17 | 1.14 → 1.65 |
| clone + transition | 4.38 → 4.30 | 6.65 → 6.75 | 6.79 → 6.53 |
| clone + transition + key + evaluation | 19.11 → 11.18 | 33.94 → 16.85 | 91.56 → 27.69 |

The ordinary allocating action-list micro path regresses about 41–50%, albeit
by less than 0.6 ms per 20,000 calls. It now resets a caller-provided array (or
new default array). This is retained for the end-to-end gain from reusable
rollout buffers, not described as an isolated macro-generation speedup.
Clone and transition micro rates are essentially unchanged, including small
regressions. These micros deliberately still allocate clones, isolating the key
change; they do **not** directly measure the candidate scratch-buffer benefit.

## Correctness and lifecycle

- Eight Node mechanics tests pass: original **320,000** oracle comparisons,
  unchanged edge tests, plus 2,000 maximum-capacity scratch/encoding/action-order
  checks with a 5,000-gem state. Independent buffers and stale capacity are checked.
- Six durable pre-pass golden tests hash full outputs, all retained tree node
  statistics/child ordering/untried lists, and the next random value, across the
  three boards and two seeds. They need no ignored baseline artifacts.
- `perf-verify.mjs`: 20 before/after searches, ten checkpoints each, all PRNG draws
  compared exactly in order, every retained tree node and exported result exact;
  40 unchanged baseline results; three additional cap 1/30/600, horizon 200 cases.
  No altered tie ordering was observed or deliberately permitted.
- All 18 measured Node outputs and all 18 measured Worker outputs match their
  original fixed-work counterparts (timing fields excluded). Summary script asserts
  Node full signatures and Worker plans/resources/cycle/tree-count diagnostics.
- Existing real-browser check passes: six timed Worker plans replay through the
  accepted model, two fixed-iteration jobs reproduce, direct cancellation and
  supersession work, latest-snapshot/reset/cancel safety passes, planning leaves
  input unchanged, frozen replay does not advance frames. 64 UI heartbeats during
  the 1,200 ms search; zero page errors. See `generated/browser-report.json`.
- Both Python harnesses own an ephemeral server and isolated headless muted
  browser, closed in `finally`. The user's port 8772 server is untouched.

## Reproduction

From the root, no installation beyond the existing Node, uv and Chrome:

```sh
node --test 05-autoplay-lab/lab.test.mjs 05-autoplay-lab/perf-regression.test.mjs
node 05-autoplay-lab/perf-node.mjs after
uv run --script 05-autoplay-lab/perf-browser.py after
node 05-autoplay-lab/perf-summary.mjs
node 05-autoplay-lab/perf-verify.mjs
uv run --script 05-autoplay-lab/browser_check.py
```

Before labels must only be produced against original source. Do not overwrite
them with optimized-source runs. The `before-src` archive is ignored generated
evidence, as are all reports/profiles. `perf-summary.json` contains machine-readable
medians, micro results and asserted parity. To reproduce a search-only profile:

```sh
node --cpu-prof --cpu-prof-dir=05-autoplay-lab/generated --cpu-prof-name=perf-after-search.cpuprofile --input-type=module <<'JS'
import {Search} from './05-autoplay-lab/search.mjs';
import {cases,options} from './05-autoplay-lab/perf.mjs';
for(const [,snapshot] of cases()) for(const seed of [11,22])
  new Search(snapshot,options(seed)).run(1500);
JS
```

For the original profile, import Search from
`./05-autoplay-lab/generated/perf-before-src/search.mjs` and use a different
profile filename. If generated evidence is removed, the durable golden tests
still verify this fixed-policy boundary, but regenerating the original profile
requires restoring original sources, not merely relabelling current code.

## HANDOFF: second, separate tuning pass

Runtime changes: `sim.mjs` adds `copyInto(target, source)` for equal-capacity
scratch states and optional `actions(state, outputArray)`; old call forms still
work. `search.mjs` owns `working`, `candidate`, `available` scratch fields.
Worker protocol/UI files and all model/input code are unchanged. No tuning has
been performed. Baseline policy/evaluator/options and exact algorithm are intact.

Retained bottlenecks: exact string keys and allocation/concatenation, repeated
state evaluation scans, path reconstruction and UCT iteration/selection. The
post-profile is not evidence to merge transpositions or change mechanics.
Natural-board quality limitations in DESIGN/BENCHMARKS remain unfixed.

Use these throughput results as the stage boundary: six fixed-work observations
per board, same horizon/iterations, raw labelled reports plus source hashes.
Original BENCHMARKS tables remain historical, not rewritten with faster rates.
If tuning deliberately changes policy, retire/update the six throughput golden
expectations explicitly and preserve this report and original raw outputs. Keep
mechanics/scratch tests and the public Worker safety tests. Do not compare a
shorter/easier rollout's iterations/sec to these numbers as equal useful work.
