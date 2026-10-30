# Increasing pressure: arrival rate and blackening

**Proposal, not implemented or selected.** Adam suggested increasing both
advancement rate and black probability, eventually approaching 100% black.
The accepted original, current playable studies, and frozen AI lab remain
unchanged. The white-stacking curriculum is a separate authored test suite.

## Intent

Early play teaches the arrow-key language. Later play asks for planning beyond
the immediate tail: uncover whites, relocate and combine runs, keep colored
charge alive, then cash in quadratic amplification against growing black mass.
Pressure should expose the value of that skill rather than simply substitute
scarcity or finger speed for reasoning.

Matching white runs matter because `5*(a+b)^2` exceeds `5*a^2 + 5*b^2` by
`10*a*b` shots. Two separately converted single whites give 10 extra shots;
stacking and converting them together gives 20. White must enter existing,
nonwhite charge for either bonus. Banking white normally or losing the colored
charge can destroy the opportunity without changing the gem's appearance.

## Two independent pressure controls

- **Rate λ(t):** arrivals per active simulation second. The original nominal
  rate is 30 × .0725 = **2.175**, one independent trial per 30 Hz frame.
- **Blackening b(t):** probability that an arriving gem is black. Original is
  30/84 ≈ **35.7%**. Remaining original weights are red/green/blue 15 each,
  yellow 7, pink 1, white 1, totaling 54.

Keep these controls independent during testing. The first increases temporal
pressure; the second changes resource availability and obstruction. Increasing
both at once without an ablation makes failure difficult to diagnose.

## One concrete candidate for a first experiment

Use active simulation seconds (`deliveredFrames / 30`), not wall-clock time
through hidden-tab suspension. Ramps start when play starts, not at the menu.

```text
λ(t) = 2.175 + (6 - 2.175) * (1 - exp(-t/180))
b(t) = 1 - (1 - 30/84) / (1 + t/90)
```

At nominal 30 Hz, an arrival trial uses probability λ(t)/30 (bounded below 1).
Black probability tends to 1 without reaching it at finite mathematical time.
Other colors retain their conditional proportions, so white probability is
`(1-b(t))/54`, not a fixed 1/84. These constants are illustrative, not tuned.
Original 30 Hz Bernoulli arrivals are not an exact Poisson process.

| Active time | Arrivals/s | Black | Mean interval between white arrivals |
|---|---:|---:|---:|
| Start | 2.175 | 35.7% | 38.6 s |
| 1 min | 3.259 | 61.4% | 43.0 s |
| 3 min | 4.593 | 78.6% | 54.9 s |
| 5 min | 5.278 | 85.2% | 69.0 s |
| 10 min | 5.864 | 91.6% | 109.8 s |

The white intervals describe instantaneous expected supply, not a guarantee,
and say nothing about whether a white is accessible behind black barriers.

## The resource-starvation catch

With bounded arrival rate and b(t) → 1, white and ordinary ammunition supplies
become arbitrarily sparse. This is not merely a harder aiming task: it changes
the economy toward stockpiling and eventually depletion. A slow rational tail
was chosen above instead of exponential blackening: with bounded positive rate,
its expected total future nonblack supply diverges logarithmically. That avoids
a mathematically finite expected total supply, but **does not** make survival
feasible against the continuing black load. In contrast, exponentially decaying
nonblack probability with bounded rate gives finite expected future resources.

Approaching 100% is coherent for a deliberately terminal endless-survival arc.
If the intent is renewable mastery, consider a less-than-100% ceiling, relief
phases, or authored white opportunities. A permanent nonzero white probability
cannot coexist with an unconditional black probability approaching 100%.
Do not hide that design choice behind terminology or secretly manufacture ammo.

## Test before adopting

1. Validate increasing indirect reasoning on clean frozen curriculum boards.
   Witness plans prove solvability; ammunition bounds or constrained search can
   establish that certain merges are necessary. Planner failures alone do not.
2. Separately compare fixed mix/faster rate, fixed rate/blackening, and both.
   Preserve the same seed/control conditions where practical.
3. Measure white arrivals **and access**, white groups converted, shots gained,
   shots spent uncovering resources, charge lost to mixing, black clearance,
   peak lane height and survival time. Do not grade only by stored ammo.
4. If live integration is requested later, build a separate progression variant.
   Preserve the original reference. A frozen infinite-speed MCTS plan is not
   evidence that a human or timed executor can survive the ramp.
5. Make the ramp perceptually legible through growing black mass/rhythm, not
   hidden rule changes. Existing verbs and white asymmetry remain the same.
