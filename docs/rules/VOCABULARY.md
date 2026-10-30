# Xorex vocabulary

The original instructions establish the move language. The printed sheet keeps
that language instead of promoting implementation identifiers or feedback labels
into new rules. Capital letters on the sheet identify moves, not additional keys.

## Original instructions: primary vocabulary evidence

Visually read `../../03-svg-demake/assets/structies/1.svg`, the preserved export
of `../../01-ruffle/art/structies.swf`. Its **syntactics** section says:

- `DOWN: collect or convert`
- `UP: replace or fire`
- `LEFT / RIGHT: movement`

Its **semantics** section says movement selects the target lane, collect takes
orbs into inventory, convert changes inventory into charge, replace puts orbs
back from inventory, and fire sends charge into the combat zone destructively.
The diagram labels the two stores **inventory** and **charge**. The original
collect sentence misspells inventory as “invetory”; the diagram and convert and
replace sentences spell it correctly. We correct the typo, not the concept.

## Player-facing terms and implementation mapping

| Sheet term | Meaning | Original recovered code / clean model |
| --- | --- | --- |
| MOVE | Select an adjacent lane with LEFT/RIGHT; no wrapping. “Movement” in original instructions. | `ShipModel.left/right`; model `act(left/right)` |
| COLLECT | With empty inventory, take the contiguous same-color bottom run. Black cannot be collected. | `ShipModel.gather` empty-inventory branch, `CombatModel.gather`; event `gather` |
| CONVERT | With inventory, use it to change charge, including matching addition, white amplification, or incompatible loss. | Remaining `ShipModel.gather` branches; events `compact`, no event for white boost, or `fizzle` |
| REPLACE | Put the entire inventory at the selected lane's bottom; charge unchanged. | Inventory branch of `ShipModel.fire`, `CombatModel.synthesize`; event `synth` |
| FIRE | With empty inventory, spend one charge to remove at most one bottom gem of any color. Empty lanes still cost one. | Other branch of `ShipModel.fire`, `CombatModel.fire`; event `fire` |
| inventory (held gems) | One color and count above the ship. Not ammunition yet; no fixed carrying capacity is implied. | `ShipModel.inventory`; clean model `inventory` |
| charge (stored shots) | One color and count below the ship. Color controls conversion compatibility, not damage. | `ShipModel.capacitor`; clean model `capacitor` |
| lane | One of 20 vertical ordered stacks; actions target its bottom. | `ShipModel.pos`, `Main.n`; clean model `lanes` / `pos` |
| gem | A field object, called an “orb” in original instructions and an enemy in code. “Gem” is the current project's consistent editorial term, not a claim about original wording. | `Enemy`, combat lane lists; clean model color entries |
| ship | The controlled chevron, between inventory and charge. | `ShipModel`, including its `glyph` |
| white gem | Collectable gem whose conversion into existing nonwhite charge adds `5*n²` shots. Into empty/white charge it adds normally. | `Wavelength.White`; clean model `white` |
| black gem | Uncollectable obstacle; FIRE can remove it like any other gem. | `Wavelength.Black`; clean model `black` |

The original `gather()` is an overloaded entry point: it implements both COLLECT
and CONVERT. Likewise `fire()` implements both REPLACE and FIRE. These method
names must not replace the more precise player-facing move vocabulary. `fizzle`
is also overloaded: a boundary bump is not necessarily lost resources.

## Feedback labels: descriptive, not newly canonical rules

The sheet names the consequences separately from the moves that cause them.
These names are **editorial mappings of the current prototype**, pending Adam's
approval as a stable feedback vocabulary. They are not additional actions or
historical UI terms.

| Sheet label | Move and consequence | Current `feedback.mjs` kind / visible wording |
| --- | --- | --- |
| reload | CONVERT inventory matching existing charge; normal additive gain. | `matching-reload`; `+N COLOR charge` |
| white amplification | CONVERT white inventory into nonwhite existing charge. | `white-boost`; `+N COLOR charge` |
| mix loss | CONVERT incompatible nonwhite inventory; both stores disappear. | `mismatch`; two actual-color loss lines |
| dry fire | FIRE into an empty lane; lose one shot. | `dry-shot`; `−1 COLOR charge`, `empty lane` |
| breakthrough | FIRE removes a black gem and opens access behind it. | `black-break`; `path opened` |
| setup is valid | REPLACE may prepare later runs; it is not inherently bad play. | `replace`; no punitive annotation |
| ordinary white storage | CONVERT white into empty or white charge; ordinary addition without amplification. | `white-stored`; `stored, no boost` |

`new-charge`, `colored-kill`, `blocked-gather`, `empty-gather`, `boundary`, `move`,
and `idle` remain implementation classifications, not extra sheet terminology.
Feedback may outlive a move but never blocks another action or postpones state.

## Evidence order

1. Original instruction art for nouns and verbs.
2. Recovered `Main.as`, `ShipModel.as`, `CombatModel.as` and bytecode corrections
   summarized in `../../02-decompilation/MECHANICS.md` for semantics.
3. `../../03-svg-demake/model.mjs` for the maintained model's exact branches.
4. `../../04-rendering-lab/motion-playable/FEEDBACK-PLAN.md` and `feedback.mjs`
   for presentational meaning and current classification names.

No autoplay lab clearing objective is included. The live game is survival:
arrivals continue, and a lane over 14 gems loses at the next simulation check.
