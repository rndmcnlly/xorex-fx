# Measurements, 2026-10-30

MacBook Pro M3 Max / arm64, Node v26.12.1 and headless Google Chrome
156.0.8078.74. One local run, not a statistical performance study. Other work
was running on the machine. Rounded rates below are observations, not guarantees.
Raw data is reproducible in ignored `generated/` with the README commands.

## Node: equal horizons, not equal compute

Fixture seed 2009; search/baseline seeds 11, 22, 33; 48 macro horizon; MCTS
1,500 iterations each; retained-node cap 12,000. Baselines are **one trajectory
per seed**, not 1,500 restarts. Clears count out of three. MCTS rate is median
active iterations/sec across the three seeds.

| Fixture | Random clears | Greedy clears | MCTS clears | MCTS it/s | Retained nodes, range |
|---|---:|---:|---:|---:|---:|
| black-plateau | 0 | 0 | 0 | 865,010 | 1 |
| one-shot | 3 | 3 | 3 | 619,803 | 2 |
| white-rescue | 0 | 3 | 3 | 112,623 | 344–355 |
| white-cap-trap | 0 | 3 | 3 | 124,578 | 546–563 |
| buried-white | 0 | 3 | 3 | 128,642 | 407–513 |
| replace-merge | 0 | 3 | 3 | 100,231 | 667–702 |
| mismatch-reset | 0 | 3 | 3 | 95,435 | 1,405–1,406 |
| seeded | 0 | 0 | 1 | 4,817 | 1,472–1,473 |
| natural | 0 | 0 | 0 | 2,729 | 1,454–1,458 |

Trivial plateau/cleared iterations do essentially no search work. Do not compare
their very high rates to meaningful larger-board throughput.

**Strength:** on the seeded board, greedy utility is 0.749 in all three runs.
MCTS utilities are 0.831, 1.000, 0.803, with 2, 0, 3 gems remaining respectively.
The small solvable fixtures demonstrate tactics and legal plans, not superiority:
greedy clears every one too.

**Failure:** on the natural board, greedy utility is **0.365**, versus MCTS
**0.265, 0.282, 0.286**. MCTS leaves 47, 45, 45 gems. Its short sampled rollout
policy does not compensate for the larger branching factor and myopic horizon.
There is no general MCTS advantage established here. Increasing budgets, better
rollouts, or seeding a greedy incumbent are future experiments, not measured fixes.

One Node process-wide sample after all runs: RSS 79,979,232 bytes, heap used
8,045,768 bytes, ArrayBuffers 199,543 bytes. This is **not peak memory, per-search
memory, or browser worker memory**. Search output reports per-worker memory as
null, with an explanation; retained node counts and caps are actual diagnostics.

## Real browser Worker: 500 ms jobs

Same fixture/search seeds, horizon 48 and node cap 12,000. Three new workers per
fixture, one for each seed. Each row lists values in seed order. No fake Node
Worker or main-thread search substitution.

| Fixture | Iterations | Active it/s | Wall it/s | Retained nodes | Gems remaining |
|---|---|---|---|---|---|
| seeded | 1,961 / 2,138 / 2,149 | 5,255 / 5,726 / 5,752 | 3,909 / 4,274 / 4,264 | 1,924 / 2,099 / 2,108 | 2 / 0 / 3 |
| natural | 1,178 / 1,128 / 1,178 | 3,153 / 3,025 / 3,146 | 2,356 / 2,256 / 2,355 | 1,147 / 1,098 / 1,148 | 47 / 50 / 49 |

Wall elapsed was 500–504 ms. Yielding and scheduling explain the gap between
active and wall rates. These time-budgeted counts are deliberately not promised
to reproduce. Fixed **700-iteration** Worker tests with seed 17 and cap 600
produced identical plans, rewards, visits-related diagnostics, and node counts
across two separate workers. Node has an additional fixed-iteration test.

## Browser correctness and visual evidence

The UI's 1,200 ms natural-board job completed 2,572 iterations and retained 2,493
nodes, utility 0.298, 45 gems / 9 black remaining. A separate main-thread 20 ms
heartbeat ran **62 times**, confirming the UI remained responsive. Planning left
the authoritative lab snapshot unchanged. Replay changed arrows only: frame
count stayed 700 and `lost` stayed false. All six measured Worker plans were
replayed through the accepted model and their final utilities checked.

Passed: direct cancel acknowledgment with no final answer, old-job supersession,
UI reset/new-snapshot handling, UI cancel, unchanged input, fixed-iteration
reproducibility, real-plan legality, and zero page JavaScript errors.

- `generated/browser-report.json`: full results, budgets, plans, fingerprints.
- `generated/node-benchmark.json`: all baseline/MCTS rows and process sample.
- `generated/lab-natural-plan.png`: source board, best arrows, search diagnostics.
- `generated/lab-natural-replayed.png`: actual-model replay, still frozen.

The browser harness's ephemeral server and isolated muted browser were both
closed. The existing root server and all actual gameplay/rendering code were
untouched. Measurements are only evidence for this static laboratory objective.
