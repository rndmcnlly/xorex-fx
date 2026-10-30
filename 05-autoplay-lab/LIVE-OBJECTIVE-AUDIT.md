# Why live autoplay deliberately mixes incompatible colors

Diagnosis prompted by Adam observing repeated apparent mistakes in live autoplay.
This document covers the **planner policy**, independently of the executor audit.
No policy or mechanics changes were made by this diagnostic.

## Confirmed planner behavior

`htn-domain.mjs` makes every exposed ordinary run eligible for
`EstablishColoredCharge / ConvertColor@lane`, even if its color is incompatible
with the existing charge. The `compatible` estimate is recorded but is not an
applicability condition. The reason string explicitly says ordinary mismatch
legally discards both stores. `CleanupHeld` also tries unconditional `ConvertHeld`
before parking alternatives.

This can produce a completely correctly wired destructive mix. A direct
frozen-plan replay of seeded/2009 cleared the board but deliberately mixed
incompatible stores four times, discarding five charge units. Natural/2009
had fifteen mismatches in one observed plan. These are concrete plan contents,
not a diagnosis inferred from glowing effects or delayed ship position.

Reproduce against the current knowledge encoding with:

```sh
node 05-autoplay-lab/audit-waste.mjs
```

The script uses fixed HTN node limits, the accepted `act` implementation, and
the same semantic classifier that produces visible mix-loss feedback. It saves
copied before/after store values, not references that later actions can mutate.
Counts can change after future domain revisions; the script is a diagnostic,
not a desired-behavior golden test.

## Objective mismatch, not an excuse

The frozen lab goal is to empty board **and inventory**. CONVERT removes held
gems even when it destroys charge. The first feasible complete plan is accepted;
there is no minimization of wasted charge across alternative complete plans.
The valid-prefix heuristic predominantly rewards reducing weighted remaining
gems and gives only a tiny, capped value to useful charge.

`ObtainAmmo` also precedes `ClearBlackBanks`. This means the planner can keep
trying to consume ordinary resources before shooting black banks. In a finite
snapshot, later whites may still supply enough charge. In live play, new ordinary
gems keep entering and one-second replanning repeatedly revisits that priority.
The demonstration can therefore teach exactly the wasteful behavior that the
human-facing feedback correctly marks as costly.

Being legal, clearing a finite board, or being internally consistent does not
make this good survival strategy. Conversely, a blanket ban on all mismatch
would be wrong for the lab: curriculum 06 has a legitimate terminal cleanup
discard. The task boundary must remain explicit.

## Next policy direction (proposal, not implemented here)

Use a separate live-oriented knowledge profile rather than silently rewriting
the frozen problem. Prefer compatible reloads; plan useful expenditure of current
charge before switching colors; preserve a colored reserve for white access and
amplification; park held gems instead of destroying an important capacitor.
Make deliberate disposal an explicit last-resort method with a recorded reason,
not an unconditional method called “EstablishColoredCharge.”

Evaluate actual live mismatch count/amount, black clearance, white grouping,
blocked-lane pressure and survival, alongside plan/executor conformance. The
parallel integration audit must still check stale steps and prefix reconciliation:
finding this policy problem does not prove the wiring is bug-free.

## Integration audit result

The separate executor audit reproduced no wiring discrepancy: four frozen
seeds executed 433 arrows with 16 planned mismatches, and a 20-second live run
executed 197 arrows with 14 planned mismatches. Expected and actual semantics
agreed. A relevant-lane arrival invalidated an obsolete conversion before it
committed. All 42 held/charge color combinations matched the real model.

This is evidence for conformance on the tested cases, not strategic merit or
a proof about every seed/input path. The recorded traces and reproducible
integration harness live in `06-autoplay-playable/`; its README documents
`?inspect` and `autoplayInspection.exportTrace()`. No policy was changed.
