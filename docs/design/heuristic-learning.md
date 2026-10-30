# Iterative maintenance of Xorex's planning knowledge

## Orientation

Adam pointed to Jiayi Weng's 2026 essay,
[Learning Beyond Gradients](https://trinkle23897.github.io/learning-beyond-gradients/).
The useful practice here is a coding agent maintaining an experimental system:
policy, state representation, causal traces, replays, regression tests, experiment
history, and an explicit next update. The maintained artifact is more than a
policy function. This is code/knowledge revision, not neural weight training.

We adopt the workflow, not the essay's broad paradigm claims or unrelated Atari
scores as evidence about this game. Environment-step efficiency also does not
measure total coding-agent compute, review effort, or maintenance cost.

## The actual failure to learn from

The executor audit reproduced the HTN's intended destructive color conversions,
not a wiring discrepancy. The frozen-board planner treats disposal as progress
toward empty board/inventory, tries incompatible ordinary conversions, and tries
inventory conversion before parking. Live arrivals plus periodic replanning make
this a poor resource-maintenance default.

Therefore revise a **separate live-survival knowledge profile**, rather than
silently changing the frozen task or banning disposal everywhere. The original
curriculum includes a valid terminal cleanup discard. A legal plan can still be
strategically foolish, and a test of conformance is not a test of competence.

## Bounded learning loop

1. **Record a baseline:** source hashes, profile/options, initial states, shared
   arrival streams, action/replanning rates, and causal action traces. Declare
   training and held-out seeds before revising knowledge.
2. **Observe failure conditions:** identify lost useful charge, premature white
   conversion, stalled planning, long low-value travel, blocked resources, and
   dangerous lanes. Use before/after stores and method traces, not impressions
   from animation alone.
3. **Revise the representation:** prefer compatible reloads, useful expenditure
   before color switching, inventory parking, colored-reserve preservation,
   white access/stacking, and explicit exceptional disposal with a reason. Keep
   mechanics separate and unchanged. Explain why a method is applicable.
4. **Replay and challenge:** compare paired live episodes plus tactical fixtures.
   Measure charge lost, dry fire, black clearance, white amplification, activity,
   lane pressure and survival/censoring. Reducing mistakes by doing nothing is
   not an improvement. Keep the exact simulator, frozen HTN, legacy and curriculum
   regressions. Label virtual-time evaluation versus actual browser evidence.
5. **Compress:** fold overlapping special cases into coherent tasks/preconditions.
   Keep failed directions and counterexamples in tests and trial records, not as
   an ever-growing pile of unexplained conditionals.

This pass is two or three bounded, evidence-driven revisions, not an unattended
continual-learning service or an indefinite optimization promise. Keep before,
intermediate, and final measurements; report held-out losses as well as gains.

## System boundaries

- **Mechanics:** accepted original-derived `act` and unchanged arrival rules.
- **Knowledge:** frozen HTN versus a live-maintenance profile with explicit intent.
- **Planner:** bounded decomposition/backtracking with inspectable decisions.
- **Executor:** immutable jobs, guarded local preconditions, paced actions and
  manual takeover. It cannot repair a strategically poor but valid plan.
- **Feedback/memory:** machine-readable causal traces for development and visible
  causal residues for human learning, both grounded in actual state transitions.
- **Evidence:** versioned trials, replays, regressions, held-outs and limitations.

Default live behavior should only be promoted after the paired evaluation and
browser checks. No new gem rules, dynamic difficulty, future-arrival oracle, or
seed-specific policy branches are authorized by this improvement loop.
