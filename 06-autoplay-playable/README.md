# 06: live autoplay playable

A playable integration proof, not a new ruleset or a survival-quality AI claim.
The latest motion/P3 game and its semantic feedback memory run unchanged by
import. **HTN** plans in the existing background Worker. Live arrivals continue
while it searches and while the finite-speed executor follows a validated plan.
Gameplay and presentation are unchanged. The shared HTN engine now supports
separate frozen and live profiles; this playable explicitly defaults to live.

## Live-policy update, 2026-10-30

The default is now **live maintenance**, not repeated frozen full-clear search.
It preserves compatible charge, spends it on black pressure/gates before color
changes, assembles white resources and parks held gems for productive dependency
tasks. Each snapshot returns at most six resource tasks, with a valid prefix on
interruption. No arrival prediction or mechanic changes. Original frozen HTN
remains the lab default and is selectable here with `?profile=frozen` (combine
with `&inspect&seed=2009`). The status labels the active profile.

See [LIVE-POLICY-LEARNING.md](LIVE-POLICY-LEARNING.md) for two failure-driven rounds,
paired virtual episodes, actual 25-second browser traces, counterexamples and
limits. Across three held-out 90-second episodes: mismatches 94 → 0, black kills
145 → 220, final black load 82 → 7. Every run was censored; no survival gain is
established. Exceptions can still deliberately discard stores and record why/how
much. This is not a global mismatch ban or a survival-quality claim.

With `?inspect`, `autoplayInspection.controller()` exposes `profile`, bounded
`policy.decisions` (method, reason, estimates, macro offset), objective/outcome,
and lifetime `resourceLoss` counters. Response trace records also retain the
bounded policy explanation. Counts are controller-lifetime diagnostics, not
reset-per-game scores. Existing local guards and prefix rebasing are unchanged.

## Play

Serve the project root. If the existing server is on 8772, leave it alone and open:

<http://127.0.0.1:8772/06-autoplay-playable/>

Otherwise start your own root static server on an unused port. No build, CDN,
audio, runtime package or downloaded art is required.

- **Up/Down or Start:** start a manual game without also performing an arrow.
- **Left/right:** lane. **Down:** gather/convert. **Up:** replace/fire.
- **Tab**, with the board or page body focused: toggle AUTO-PLAY. Repeated keydown
  events do not toggle again. **Shift+Tab** leaves the board for the controls.
  Tab and arrow keys on buttons, links, sliders, selects and other controls retain
  native behavior. Gameplay keys require board/body focus.
- The **AUTO-PLAY checkbox** is equivalent. Initially unchecked. Enabling it on
  Ready or after loss starts a fresh game, without a phantom action in the toggle
  event. AI execution starts asynchronously once a usable plan arrives. Turning
  it off never starts/restarts a game and preserves the entire current state.
- **Any manual arrow in the game takes over immediately:** cancels the worker,
  discards all queued AI arrows and turns the checkbox off, then follows the
  existing input semantics normally. Each key retains its independent edge latch;
  no key-repeat movement or animation cooldown is introduced. Even a blocked
  arrow during developer pause cancels auto ownership.
- **Pace:** 12 arrows/second by default, adjustable 8–30. At most one arrow per
  presented animation frame. Missed beats do not catch up in a burst.
- **Restart:** new ordinary game, clears feedback history, cancels old work and
  preserves the AUTO-PLAY setting. `?seed=2009` reproduces initial RNG choices
  when action/frame ordering also matches; it is not an original Flash seed.
- Loss turns auto **off** and preserves the final game. Start/Restart can replay.
  Hidden tabs suspend live ticks and cancel work. Focus loss cancels work and
  clears key latches. Auto may remain checked through hidden/focus/developer pause,
  but only resumes with a fresh snapshot when visible, focused and unpaused.
- Sound is always off. Motion, reduced motion, steady-reference, emission and
  gamut controls affect presentation only. OS reduced-motion changes are honored.

The compact status shows planning/executing/waiting, the 1-second period, queued
arrows and age of the most recently accepted plan's source. A retained plan's age
is diagnostic, not a whole-board validity test. Developer details contain bounded
controller counters, current frame and capability evidence. `?inspect` exposes
`window.autoplayInspection` for browser tests, including validated fixture import.
Fixtures are test-only; the runtime planner never imports a fixture or witness.

## Source boundaries

| File | Responsibility |
|---|---|
| `app.mjs` | Fresh application adapter, input ownership, Worker lifecycle, UI and live loops |
| `controller.mjs` | Transport-free executor, dependency projection, prefix reconciliation and job identity |
| `index.html` | Controls and shared renderer canvas |
| `controller.test.mjs` | Pure controller/projection tests using the real model |
| `smoke.py` | Muted isolated browser, real Worker protocol and generated visual evidence |
| `integration.test.mjs`, `diagnosis.mjs`, `browser-diagnosis.py` | HTN-to-executor causal conformance, color-branch audit and live diagnosis |

Runtime imports, rather than copies:

- `../03-svg-demake/model.mjs` and `input.mjs`: all gameplay and manual key edges.
- `../04-rendering-lab/motion-playable/{renderer,presentation,schedule,palette}.mjs`:
  the same luminous spheres, real P3 capability gates, immediate truth, 30 Hz
  arrival tape, interruptible motion and persistent semantic consequence memory.
  This also imports the original feedback classifier; there is no feedback fork.
- `../05-autoplay-lab/htn-worker.mjs`: unchanged transport; profile-aware HTN engine
  and separate live knowledge, with the original frozen domain unchanged.
- `../05-autoplay-lab/sim.mjs`: only its source fingerprint function on the main
  thread. Expected execution states use the accepted real `act`, not the optimized
  planner simulator. No HTN/search code is imported into the main-thread module graph.

## Loose coupling: identity is not validity

**Planner assumption:** a submitted immutable board, no future arrivals and
instant execution. HTN's maintenance/partial plan is a legal snapshot sequence,
not a prediction that the finite live executor will clear or survive. Actual
arrival rate/rules are unchanged: each delivered 30 Hz deadline commits the
shared RNG tape, with trial probability 0.0725, approximately 2.175 arrivals/s.
Hidden suspension and no missed-tick catch-up match the previous playable.

**Request cadence:** a fresh snapshot every approximately **1000 ms** while auto
is runnable. Each request replaces/cancels any unfinished prior job, but does not
stop an existing valid executor. Worker budget is **1000 ms**, with existing
12,000-node/2000-depth/20,000-macro bounds. HTN can return much earlier; both usable
progress incumbents and final results can begin execution without a full-second
wait. The existing worker yields between approximately 8 ms chunks. An app-owned
1000 ms watchdog terminates unfinished work, retaining an already accepted prefix;
responses delivered at/after that deadline are rejected too. Browser timers and
indivisible worker steps are not hard real-time guarantees. No planning happens
on the main thread, and no arrivals are paused to let a job finish.

Every request owns a cloned snapshot, monotonically unique job ID and source
fingerprint. A response must match that **job's own source**, not the latest live
whole-world fingerprint. Old IDs, wrong fingerprints, cancelled/reset jobs and
late deliveries cannot install a plan. Response arrows and expected states are
copied again, with no Worker/input alias. Plan validation accepts at most 30,000
primitive arrows. Normal live model boards are far smaller than the lab's
5000-gem snapshot bound.

### Per-primitive safety

Before **every** auto arrow, compare these exact dependencies:

1. Live/not-lost, position, held color/count and capacitor color/count.
2. For Up/Down, the entire selected target lane, including gem order.
3. Lateral movement deliberately does **not** depend on any lane contents.

The expected state advances one action at a time through the unchanged real
`act`, without spawning. The live state independently advances through arrivals.
Unrelated-lane arrivals and frame counters do not invalidate the current arrow.
An arrival into a relevant lane, changed position, or changed stores pauses the
obsolete plan **before** it can gather a wrong color, shoot a changed target or
convert changed stores. The controller then waits for the next eligible 1-second
window, rather than launching an unbounded immediate retry loop. Other lanes may
remain stale in the expected board: they are checked when they become relevant.
After commitment, the same projected dependencies are checked against the real
model result as an additional assertion before continuing.

This guard is intentionally conservative. Even a harmless head arrival that
leaves the tail run unchanged invalidates a vertical arrow, and a conversion
requires its selected lane unchanged even though conversion itself is store-only.
It does not maximize plan salvage. It does not forbid valid noops, mismatches or
empty shots: their expected semantics come from `act`, not a blanket
"resource loss means illegal" rule. HTN sometimes chooses such actions.

### Returning plans while the old plan executes

Each pending job journals actual auto primitives since its snapshot, including
the action's dependency projection **before** commitment. When a newer plan
returns, its prefix must exactly match those primitive commands **and** their
semantic preconditions under independent model replay from the job snapshot.
Only then strip that already-executed prefix and locally validate the next arrow.
Thus a response cannot rewind the executor to an old root or duplicate a gather.
Same commands with a changed gathered color are not equivalent. A mismatching
response is discarded while an existing valid plan can continue. Progress and
final responses reconcile independently against the same job journal.

The journal is capped at **64 entries/job**, above the maximum 30 paced arrows
in a normal 1-second window. Overflow cancels the pending job, not game state.
At most one job, one plan and one journal are retained. Cancellation/supersession
terminates the owned Worker when necessary, so it does not wait for a stuck chunk
to acknowledge. An idle completed worker can be reused for the next request.

## Verification and evidence

From the project root:

```sh
node --test 06-autoplay-playable/controller.test.mjs
node --test 06-autoplay-playable/integration.test.mjs
node --test 03-svg-demake/model.test.mjs 03-svg-demake/view.test.mjs 04-rendering-lab/p3-playable/palette.test.mjs 04-rendering-lab/motion-playable/motion.test.mjs 04-rendering-lab/motion-playable/feedback.test.mjs 05-autoplay-lab/htn.test.mjs 06-autoplay-playable/controller.test.mjs
uv run --script 06-autoplay-playable/smoke.py
node 06-autoplay-playable/diagnosis.mjs
uv run --script 06-autoplay-playable/browser-diagnosis.py
```

The smoke test creates its **own ephemeral loopback server** and isolated muted
Playwright Chromium, and closes browser/context/server in `finally`. It never
uses, stops or changes the user's 8772 server/browser. A cached Playwright browser
is required; the script does not globally install one. Generated output is ignored.

Observed 2026-10-30: **18/18 new controller tests; 69/69 combined Node tests**.
Muted Chromium 156.0.8078.4 smoke passed with **zero page errors**. Within about
2.5 seconds of repeated seeded normal games it recorded 3 fresh requests (source
frames 0, 30, 60–61), 26 finite auto arrows, 74–75 live model frames and both
progress/final responses. In the final run two non-reconciling responses were
discarded while the old valid plan continued. The separate busy-Worker protocol
test retained **66–67 main-thread
heartbeats** while checking cancellation, supersession, fingerprint and immutable
input. Pure tests additionally pin same-prefix rebasing, semantic-prefix mismatch,
related/unrelated arrivals, changed stores/position, watchdog expiration, stale
identity/deadline rejection and takeover. These are local observations, not a
long-session survival benchmark. No current test failures are known.

Evidence under `generated/`:

- `report.json`: checks, actual real-Worker traffic/timing, live state/controller
  counters, page errors, source semantics and capability records.
- `live-autoplay.png`, `manual-takeover.png`: normal seeded live AI and handoff.
- `shared-causal-memory.png`, `steady-causal-memory.png`: same shared white
  triumph, charge-colored black destruction and mixed-color store-loss memories.
- `video/*.webm`: silent browser capture including auto/manual handoff.

P3 is inherited **SDR**. Native headless Chromium's P3 display query is false and
falls back to sRGB. The separately labeled emulated P3 query creates a genuine
display-p3 Canvas context, not evidence of a physical P3 or HDR display. Screenshots
prove no optical gamut/luminance claim. No new HDR path is claimed.

## Historical color-mismatch investigation, before live-profile update

**Observation: the reproduced destructive conversions are in the returned HTN
plans, not introduced by the live executor.** This is not a claim that destroying
stores is good strategy, merely that the observed consequence matches the
planner's own frozen semantic branch. No integration behavior or policy was
changed in this investigation. Inspect-only instrumentation and tests were added.

| Audit | Observed planned store mismatches | Unexpected execution |
|---|---:|---:|
| Frozen seeds 1, 7, 42, 2009, Node and actual browser Worker | 4 each (16 total) | 0 across 433 arrows |
| Seed 2009, 20 seconds live, ordinary 12-arrow/s settings | 14 | 0 across 197 arrows |

The live run reached frame 600, submitted 20 jobs, accepted 21 progress/final
plans, rebased one prefix, rejected one response, and discarded two obsolete
steps before commitment. A prior separate 20-second repetition produced 209
arrows, 13 planned mismatches and zero unexpected transitions. Wall-clock Worker
budgets and browser frame scheduling do not promise identical live sequences.
The retained JSON is the later run, not an aggregate of both.

**Small concrete reproduction:** seed 2009's frozen plan, zero-based primitive
index 3 (the fourth arrow), presses Down at lane index 3 with one blue held and
one green charge. Both stores become empty. The same wrong-color conversion
occurs at live frame 9, with matching expected and actual guards and feedback
kind `mismatch`. The shared classifier correctly reports loss of both actual
colors. The planner's `EstablishColoredCharge` / `ConvertColor@lane` method
explicitly allows incompatible conversions; see
`../05-autoplay-lab/htn-domain.mjs`. The integration does not reinterpret that
method as a matching reload or swap the two Down presses.

### What was checked

- `sim.mjs` macros encode `lane*2 + (down=0, up=1)`. Macro application,
  expanded left/right travel, real-model frozen replay, finite controller
  execution, and the Worker's exported end state all agree on all four boards.
- Every committed live arrow was independently replayed from its **actual**
  before-state with `act`. All full after-states agree. Expected-vs-actual
  dependency guards, semantic feedback and postconditions also agree.
- All 42 held/charge combinations (six gatherable held colors against empty or
  six charged colors) preserve the correct branch. In particular, nonwhite held
  into white charge destroys both; white held into ordinary charge boosts;
  white into white/empty does not boost. Browser manual fixtures independently
  confirm these branches through the real app/presentation path.
- The original 18 controller tests remain intact: same-prefix rebase without
  duplicate action, semantic-prefix rejection, job identity/deadline handling,
  changed stores/position, relevant/unrelated arrivals and input takeover/edges.
  Together with the three integration tests and shared model/feedback/HTN
  suites, **72/72 Node tests pass**. The original isolated smoke also passes,
  with no browser page errors and 65 busy-Worker main-thread heartbeats.

### Timing failures versus wrong execution

Arrivals can invalidate a correct frozen plan. A controlled real browser fixture
starts at lane 0 with only one red gem at lane 10 and seed 2009's fresh fixture
RNG tape. The first arrival, at frame 23, prepends green into lane 10 while the
ship travels there. Before the planned Down (index 10), the guard compares
expected `[red]` against actual `[green, red]` and discards it at frame 29.
No obsolete gather commits. The ordinary live run separately discarded Down
steps at frames 230 and 460 after blue and black head arrivals, respectively.
These are intentional conservative invalidations, not unexpected store mixing.

One-second replanning may also fail to reconcile a response whose prefix differs
from already committed arrows. It is rejected while the valid old executor can
continue; accepted progress/final plans strip a matching semantic journal prefix.
Watchdog expiration, replacement of unfinished jobs, focus/visibility/pause
cancellation, and manual takeover can cause waiting or changed future plans.
They do not authorize execution with different stores or a different target.
Whole-snapshot fingerprints identify the response's source job, not live
validity. Position/stores and the selected lane supply the separate local guard.
Presentation's moving ship position does not feed gameplay selection; both
execution and classification use immediate authoritative `game.pos`.

### Inspect a human or autoplay session

Open `?inspect&seed=2009`, play normally, then in the browser console:

```js
autoplayInspection.clearTrace(); // optional, before the sequence of interest
autoplayInspection.exportTrace(); // detached JSON-compatible evidence
```

Only `?inspect` enables the trace, with at most 1024 retained records and no new
UI or console noise. Auto action records include source job/index, command,
full before/after snapshots, expected before/after, both dependency guards,
postcondition match, and expected/actual semantic feedback. Manual records
include command, before/after and feedback. Request snapshots, response plans,
accepted/rebased indices, relevant rejection and invalidation records help
explain changing plans. The limit is a rolling window, not a durable full-game
journal; export before it rolls over. It does not record every arrival, rejected
foreign/deadline message or lifecycle event.

Raw evidence, including full plans/stores and source SHA-256 hashes:

- `generated/frozen-diagnosis.json`: Node frozen audit.
- `generated/browser-diagnosis.json`: real Worker frozen audit, manual color
  fixtures, controlled real-arrival discard and 20-second live action trace.
- `generated/diagnosis-live.png`: live endpoint, not a strategy-quality proof.

**Remaining uncertainty:** this does not prove all seeds, long sessions, browser
engines or original SWF behavior. No prediction of future arrivals or assessment
of the strategic merits of each destructive conversion is supplied. A human
report could include another path not exercised here; the causal trace makes
that path inspectable without changing the game or planner.

### Limits

This is a bounded integration proof. The separate live knowledge remains an
incomplete snapshot planner, with counterexamples and no measured survival
guarantee. It may spend stores strategically or poorly, or return an empty
plan while arrivals continue. There is no fallback policy, arrival prediction,
automatic difficulty adjustment or infinite-speed whole-plan execution. Main
thread projection clones are deliberately simple; no long-session performance
qualification, touch gameplay, Safari/Firefox testing or screen-reader gameplay
qualification is claimed. Simulated visibility checks are not an actual browser
suspension benchmark. See the existing motion README and FEEDBACK-PLAN for
unchanged rendering/provenance limitations.
