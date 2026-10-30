# Feedback intent: hands learn a resource language

The player is scanning lane tails while operating inventory and charge through
muscle memory. Feedback should briefly connect **what happened in the field**
to **what changed around the ship**, then leave a readable memory in the world.
Its job is to teach consequences, not grade every move or interrupt a fluent
sequence. The screen should remember what the hands are learning.

## Mechanics → dynamics → experience

The model has two stores: held gems (inventory, above the ship) and ammunition
(capacitor, below). Matching conversions add linearly; white inventory added to
a differently colored existing capacitor adds `5*n²`. This rewards sorting and
building white runs. An incompatible nonwhite conversion destroys **both**
stores, even when the capacitor is white. A shot consumes one charge even into
an empty lane, and removes one gem of **any** color when occupied. Black cannot
be collected, so destroying it is especially useful. Replacing held gems is a
legitimate setup move, not a mistake. White into an empty/white capacitor adds
normally: missed amplification is not automatically bad play.

## Narrative beats

**Reload:** collecting a run draws the eye from its tail down to the held rings.
The arrival feels like a short, cohesive handful, not a fireworks burst. The
following conversion snaps that gathered potential into the charge marks below
the ship: compress, seat, and lock. Matching an existing charge gets the most
satisfying repeatable reload response. A small downward motion suggests the
next DOWN press, but never implies that the player must wait for it.

**Waste:** a bad conversion should feel like trying to seat two incompatible
things. Brief afterimages of the two *actual colors* meet between the stores,
flatten, and lose their useful energy. The ship recoils slightly, and both
vanished stores leave mixed-color debris. A compact local loss annotation names what was
lost. This is distinct from an empty shot: its tracer reaches nothing, collapses,
and one spent-charge mark falls away. No full-screen shake, long red wash, or
punishment for strategic replacement or black-blocked collection.

**White payoff:** the eye follows the white inventory into the existing colored
charge; the added energy comes back out in that charge's color. A white lead-in,
focused compression, and a stronger colored release make the direction of the
asymmetry legible. Show the actual `+gain`, not a fictitious multiplier. The ship
briefly lifts into the action. White stored without a boost gets an ordinary,
restrained seating response and a neutral “stored, no boost” explanation, never
the same celebration or punishment as the two extremes.

The payoff also leaves a brief glow on the player and a longer-lived, almost
angelic afterimage at the **site** of amplification. Moving away must not move
this memory to a different site. It marks the white-to-colored-charge triumph,
not an active power-up, new shield, or still-collectable white gem.

**Black breakthrough:** put the first accent at the destroyed obstacle, then a
quick return accent at the ship. A small confident forward knock distinguishes
it from ordinary firing recoil. Dark fragments remain behind current game
objects, with colored fracture seams/residue recording **which charge color**
destroyed the black. This says “you opened a path,” not “this shot did more damage.” Normal
colored kills remain pleasant but secondary; no false color-match reward.

## The board as short-term memory

Important consequences should **linger and accumulate**, with eventual cleanup.
They preserve the conditions of a win or mistake, not just its emotional sign:

- Bad mixing leaves mixed debris whose fragments retain both lost colors,
  rather than anonymous gray ash or a single generic failure color.
- Black destruction leaves black matter marked by the actual spent charge's
  color, even when that shot exhausted the capacitor.
- Amplification leaves the white lead-in and receiving charge color legible
  in a glowing site echo, more sustained than an ordinary conversion pulse.

These residues reinforce what deserves attention over time. Repeated events
can build a local history. They are lower-contrast, behind current game objects,
and shaped unlike actionable spheres/count marks. Labels can remain brief;
the material memory must not disappear with the label or the next juke.
Use slower fading, spatial aging, and bounded accumulation so history does not
eventually bury the game. Preserve static consequence memory under reduced
motion, without requiring animated rubble or pulsing afterimages.

**Reasoning:** a generic burst communicates valence but forgets the cause.
Color-bearing residue makes the screen an external memory of the resource
relationships the player is learning. Local persistence supports later glances
without requiring conscious recall or stopping the arrow-key rhythm. Motion
first leads the eye through the event; the settled trace then supports reflection.
Current state retains visual priority so this memory does not become a false
instruction about what can still be collected, fired, or blocked.

## Implementation strategy and guardrails

1. Classify each action from immutable before/after snapshots and model events.
   Distinguish mismatch (including white capacitor), empty shot, ordinary reload,
   matching reload, white amplification, unboosted white, gather, replacement,
   black/colored destruction, and harmless blocked/empty actions. Never infer
   correctness from particle color or animation state.
2. Give each semantic beat its own direction, locus, contrast and brief pose.
   Reserve the strongest accents for white amplification and actual store loss.
   Keep local annotations short and prioritize them so rapid keys do not produce
    an unreadable stack of labels. Separately retain accumulating world-space
    memory with causal colors/site, independent of short-lived action effects.
    Repeated reloads should feel rhythmic, not louder.
3. Truth is immediate: new counts, selected lane, removals, and charge marks are
   never delayed. All traces are explicitly decorative; lateral movement remains
   interruptible. A new action can occur inside any feedback beat.
4. Reduced motion/steady view preserves consequence information through a small
   local annotation or static accent, without moving poses, smears or debris.
   No new audio, mechanics, input gating, screen shake or camera motion.
5. Test the classification against every resource branch, especially both white
   asymmetries. Check eye-path timing with controlled waste/reload/white/black
   fixtures and rapid-input browser tests. Also test accumulation, causal color
   retention after the last charge, stationary triumph sites after movement,
   reduced-motion memory, and eventual cleanup. Test meaning, not just presence.

## Implemented first pass

`feedback.mjs` classifies consequences from before/after state; presentation and
renderer consume that meaning rather than guessing from sound/particle events.
A separate bounded memory pool accumulates mixed-color loss debris,
charge-colored black scars, and fixed-site white echoes. Unequal asymmetric
debris clumps scatter across neighboring lanes instead of looking like a tidy
new resource meter. Current resource glyphs remain above the history; local
annotations avoid their column. Static memory survives reduced motion.

Controlled-clock visual evidence and timing sheets are under
`generated/feedback/`; `feedback.test.mjs` checks causal meaning and lifetime.
44 Node tests plus the original and feedback-specific browser smoke checks
passed in the first implementation review. Remaining issues to watch during
human play: dense bands after many same-site failures, subdued dark-blue residue,
and small annotations on narrow displays. Long-session perceptual clarity is
not established by unit tests or still captures.
