# Motion playable: luminous spheres

Fresh browser-native prototype evolving the accepted P3 study. No build, CDN,
runtime dependency, downloaded texture or audio. Original artifacts, the prior
P3 renderer and the accepted SVG demake are unchanged.

## Play

Serve the **project root**, not this folder:

```sh
python3 -m http.server 8772 --bind 127.0.0.1
```

If the existing root server is already on 8772, use it, do not replace it.
Open <http://127.0.0.1:8772/04-rendering-lab/motion-playable/>.
Stop only a server you started with Ctrl-C. No server is started by the page.

- Up/Down starts without taking an action.
- Left/right selects a lane. Down gathers or converts. Up replaces or fires.
- Each key has an independent edge latch: release before pressing it again.
- Sound is always off. There is no music or audio object creation.
- Color, motion, reduced motion, intensity and steady-reference toggles preserve
  the full game state and static consequence history. Reduced motion also honors the OS preference at startup
  and preference changes. There are no touch gameplay controls.
- Developer pause/step are labeled inspection conveniences, not new mechanics.
- `?seed=2009` repeats the fixture PRNG when action/frame ordering matches.
  `?inspect&seed=2009` exposes fixture import/export, tape preview and metrics.

## Timing contract

**Unchanged model and input:** imports `../../03-svg-demake/model.mjs` and
`input.mjs` directly. No rolling physics, cooldowns, action queues, inactivity
mechanics or music quantization. Actions commit synchronously in the input event;
the beam, inventory, capacitor and text counts are rendered before it returns.

**Interruptible ship:** 80 ms ease-out cubic, nonzero maximum initial velocity
and declining velocity afterward. A new lateral input samples the current
presented position, discards the old target and starts a fresh 80 ms transition.
No backlog, even if Up/Down is held at the same time. The beam, count marks and
thin target chevron switch instantly; only the thick ship chevron travels.
Juke lines expire after 95 ms. Shots add a small decaying vertical recoil.
Display refresh, input dispatch and browser scheduling still limit what is seen.

**RNG-only anticipation:** `schedule.mjs` pre-samples three decisions. Each takes
one trial draw; only a trial below **0.0725** takes the next lane and color draws.
On the exact delivered 30 Hz deadline, unchanged `tick` receives exactly that
recorded subsequence, checks its own normal rules and prepends its enemy. A tape
cursor guard fails loudly if the model's draw contract changes. Initial board
creation happens before tape creation. The model RNG is never used by dust or
particles. There is no future state precomputation: players can gather, replace,
fire or move between any recorded decisions.

The lane cue starts within a **90 ms** window. With three frames prepared, a newly
discovered farthest decision is normally 66–100 ms away; drawing begins once it
enters that window. A late browser timer may shorten or skip the visible warning.
The subtle pullback is up to six pixels. Solid spheres stay at the current
authoritative slots; translucent shaded silhouettes and an outline pull back.
On commitment, a decorative silhouette travels from the old row, overshoots
slightly and settles over 180 ms. The new solid spheres appear immediately, not
at the end of that travel. Multiple rapid arrivals compose a bounded offset per
lane, rather than enqueuing row animations. This is a deliberate truth-first
presentation tradeoff, not continuous physical motion of authoritative gems.

**Earlier warning changes information available to the player.** It does not
change arrival probabilities, random order, average spawn rate or logical tick
ordering. This is a presentation/game-feel proposal, not a claim that the
original game supplied this advance information.

The fractional 30 Hz timer uses the accepted port's wall-clock adaptation:
one tick per delivered deadline, no accumulated missed-tick catch-up. Hidden
  tabs suspend ticks, clear moving effects/key latches, and rebase the next deadline on
return. Tape decisions remain in order. This is not exact Flash timing.

## Material, light and action response

- Gems are idealized **spheres**, not planar geometry or low-poly pucks. A radial
  diffuse shoulder and absorptive edge model their volume, with two curved streak
  catchlights. Matte/glow-in-the-dark pigment is the material interpretation.
  The central identity stays saturated; black is readable without colored emission.
- Board and ship stay geometrically simple. Internal projection is the original
  800 × 600, 20 lanes on 40 px centers, y540 ship, y500 inventory rings and the
  original `#404040` field. Exact counters supplement clipped count glyphs.
- Chromatic halos and white's stronger neutral halo are analytic alpha gradients.
  See [feedback intent](FEEDBACK-PLAN.md) for the mechanics-to-experience reasoning.
  `feedback.mjs` classifies immutable before/after snapshots and model events:
  white boosts an existing other-colored charge by `5*n²`, but a nonwhite mismatch
  destroys both stores, **including a white capacitor**. White into empty/white
  charge is ordinary storage, not a boost or punishment. Replacement is sorting,
  not waste; blocked gather and boundary attempts spend nothing.
- A mismatch brings the two actual pigments together, compresses and extinguishes
  their traces, retreats the ship modestly, and briefly names both lost amounts.
  Empty fire instead collapses an unfulfilled trace and drops one spent mark.
  Matching reload snaps downward, seats and locks without a large burst. A white
  lead-in releases in the **receiving charge's color**, with the actual `+gain`.
  Black destruction accents the target first, then knocks the ship forward after
  55 ms. Colored kills do not pretend that matching the shot color matters.
- World-space causal memory accumulates separately from interruptible gestures:
  mixed-color angular flakes retain **both** lost pigments for up to 18 seconds;
  black scars retain the spent capacitor color for up to 22 seconds (including a
  last-charge kill); white wing/halo etchings retain the source white and receiving
  pigment at the original site for 9 seconds. White's stronger satisfaction glow
  trails off over 4.5 seconds, with a brief 2.6-second glow on the player too.
  These are decorative marks, not new gems, shields or resources. They sit behind
  live objects, stay put after juking, and fade gradually. Nearby newer memories
  spatially age older ones, so repeated losses build history without unlimited
  opacity. Forty same-site losses sum to less than six fresh records' opacity.
  Debris is messy rather than radial: a dominant lateral spill spans neighboring
  lanes in unequal anisotropic clumps, with a small counter-clump. Angular flakes
  vary in size/orientation; reduced motion shows the same settled footprint.
  Static memories and one short local annotation remain in reduced motion,
  motion-off and steady view; moving smears, poses and fragments do not.
- Gather/replace use shaded, vertically smeared sphere silhouettes, three short
  persistence samples and the actual transported color, not only generic sparks.
  Ghosts are low-opacity noninteractive decorations. The removed enemy is gone
  immediately; replaced enemies and new resources are immediately solid truth.
- Shots emit a brief colored trace and recoil. Destroyed gems become chunky,
  shaded polygon fragments. This is a **top-down board**: gravity pulls away from
  the camera into the board, never toward screen-bottom. XY motion is a short
  friction-damped skitter (settled within 380 ms); height only affects a tiny
  contact-shadow separation. Facets stop spinning when settled. Black fragments
   remain for 4.8–6.3 seconds, colored fragments for 3–4.5 seconds, with fading
  concentrated in the last 1.6 seconds. Repeated black kills accumulate massy
  visible rubble, not fluffy sparks. This rubble is decorative, noncolliding,
  and drawn behind all current actionable spheres and resource glyphs.
  An edge move fizzles without implying movement or consuming resources.
- Dust consists of **140 persistent, sparse individual motes**, biased upward.
  Each has a tiny oriented reflectance lobe. Its strongest nearby gem, moving
  ship or action emitter colors and intensifies it according to distance and
  lobe alignment. This responds to scene light proxies, not a streak texture,
  fake scrolling dust sheet or generic randomly flashing noise.
- This is a Canvas2D analytic lighting approximation, **not physical PBR,
  path tracing, volumetric scattering, bloom, measured BRDFs or GI**. Dust is
  deliberately understated. No physics is applied to gameplay state.

At most **220 transient records**, **96 causal memory records**, 20 lane offsets and 140 persistent motes are
retained. Per-transport rendering is three silhouettes; transport bursts cap at
24 records and one destruction emits 10 fragments. Light sampling caps at 320
emitters. Short gestures interrupt each other; rubble keeps its own lifetime.
Memory has an independent pool, so rapid jukes never evict consequences. The oldest
16 memories fade under pool pressure before recycling; all kinds also time-fade.
Motion toggles clear moving records, not static memories. Hidden tabs clear motion
and annotations, while history ages by wall clock. Restart/fixture import clears
history explicitly. The page still redraws while visible;
no battery/performance qualification is claimed.

## Actual gamut, not HDR

The predecessor's unchanged palette and capability gates are reused by import.
A true `display-p3` Canvas2D context, CSS P3 parsing and a true display-gamut media
query are all required; otherwise the page explicitly creates an sRGB context.
Changing gamut replaces only the canvas. The two paths use corresponding design
palettes, not a constant-perceived-luminance calibrated A/B.

**P3 SDR expands available chromaticities, not physical white luminance.** All
output stays SDR. Extra emission means colored area/contrast and local responses,
not higher-than-SDR-white output. Even a true HDR media query changes nothing.
Screenshots/video may be converted to sRGB and prove no optical wide-gamut result.
Capabilities are sampled on load: reload after changing displays.

## Verify and visual evidence

From the project root:

```sh
node --test 03-svg-demake/model.test.mjs 03-svg-demake/view.test.mjs 04-rendering-lab/p3-playable/palette.test.mjs 04-rendering-lab/motion-playable/motion.test.mjs 04-rendering-lab/motion-playable/feedback.test.mjs
uv run --script 04-rendering-lab/motion-playable/smoke.py
uv run --script 04-rendering-lab/motion-playable/smoke_feedback.py
```

The smoke script creates an isolated muted Playwright Chromium and its **own
ephemeral loopback server**, then closes them in `finally`. It does not use,
stop or modify the user's existing 8772 server or browser. A cached Playwright
Chromium is required; to install it explicitly:

```sh
uv run --with playwright playwright install chromium
```

Observed 2026-10-30: **44 Node tests pass**. Tests compare scheduled/direct
states, events and exact RNG prefixes for 100 seeds with intervening actions;
cover adjacent spawns, independent keys during motion, rebase/easing, no-backlog
deadlines, shaded transport, amplification/discharge, top-down skitter/settle,
longer-lived resting black debris and bounded cleanup.

Feedback tests cover 126 held/charge/count conversions, both white asymmetries,
all semantic action branches, immutable inputs, exact gains/losses, target colors,
annotation priority/expiry and live-column avoidance after juking, interruption, pose signs/timing, independent accumulating
causal records, last-charge scar color, fixed white sites, static reduced-motion
history, pool pressure/spatial aging, and eventual cleanup.
One hundred visual seeds also check unequal clump sizes, lateral span,
anisotropy and a biased center of mass rather than a symmetric burst.

Browser smoke passes start/repeat semantics, 30 Hz progress, synchronous actions
and counters, rapid 280-key input sequences in one JS task, context/state-preserving
toggles, all action branches, scheduled prepend, reduced motion, simulated hidden
event handling, mobile fitting, overflow loss/restart and no uncaught page errors.
The hidden-property test is explicitly simulated, not a browser suspension benchmark.

The separate muted feedback smoke uses a controlled browser clock and seeded
fixtures. It captures 20/100/220/900 ms beats for two mismatches (including a white
capacitor), white boost, matching reload, black break, dry fire and unboosted white.
Natural arrow-key sequences build five coexisting causal records and forty losses
at one site. Reduced/steady history, fixed triumph sites after moving, and eventual
cleanup are asserted. `generated/feedback/report.json` retains snapshot/feedback
metadata alongside each capture; `timing-contact-sheet.jpg` compares the sequence.
Full-board captures include `accumulated-history.png`, `history-after-juke.png`,
`dense-mixed-history.png`, `reduced-history.png`, `reduced-loss.png`,
`white-site-glow.png` and `white-site-echo.png`. These were visually inspected,
not merely checked for files. Evidence is silent, ignored, and not colorimetry.

Ignored `generated/` contains:

- `report.json`: checks, native headless capabilities, separately labeled emulated
  P3 media query and actual contexts. Native headless Chromium 156 reports no P3
  display; the emulated query exercises a real P3 context, not a real P3 screen.
- `interactive-capabilities.json`: separate actual Mac Chromium 152 observation,
  no emulation: CSS/query/context P3 all true. Paused frame 146 retained the
  identical lane lengths/resources when switched P3 → sRGB → P3. Its HDR query
  was true; this renderer still outputs SDR. The verification tab was closed.
- `state-images.json`: exact state and motion metrics alongside the captures.
- `spheres-steady.png`, `gather-smeared-spheres.png`,
  `replace-smeared-spheres.png`, `conversion-compression.png`,
  `white-amplification.png`, `mismatch-fizzle.png`, `shot-recoil-rubble.png`,
  `edge-fizzle.png`, `juke-target-truth.png`, `arrival-commit.png`,
  `rubble-at-rest.png`, `black-rubble-pile.png`,
  `rapid-jukes.png`, `reduced-motion.png`, `plain-reference.png`, `mobile.png`.
- `motion-demo.webm`: silent browser recording, including a slower readable action
  passage as well as stress tests. If present, `motion-demo.gif` is an optional
  downsampled preview, not colorimetric evidence.

Safari, Firefox, touch play, long-session thermals, input-to-photon latency,
screen-reader gameplay and physical display colorimetry are not qualified.
The sphere shader is a 2D approximation, and the truth-first arrival ghosts
are intentionally less physically continuous than a fully animated board.

## Source boundaries and provenance

`app.mjs` and `renderer.mjs` adapt the local P3 study's context selection,
layout and Canvas primitives. `palette.mjs` re-exports its unchanged palette.
`schedule.mjs`, `feedback.mjs`, `presentation.mjs` and the new effects/tests are generated for
this experiment. Accepted model/input are imported, not copied or patched.
No original music, sound, recovered image or other asset is redistributed here.
Existing publication/provenance review requirements still apply.
