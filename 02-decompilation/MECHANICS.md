# Xorex mechanics: evidence-backed reconstruction

Status: source/bytecode reviewed, not yet an original-runtime differential test.
Recovered `.as` is FFDec pseudocode from **Haxe-compiled AVM2**, not the original
source. Preserve quirks rather than silently implementing intended behavior.

## Evidence and provenance

`recovered/as/` and `recovered/pcode/` contain unchanged FFDec 26.4.0 exports of
the ten game-specific classes. Full exports, including Haxe, Tweener, Mochi,
and Kongregate support, are reproducible in ignored `generated/`.

The Haxe provenance is strong: `haxe.Timer`, `haxe.Log`, `Boot_e5d4ab`, `IntIter`,
the Haxe `List`, enum `__isenum`/`__constructs__`, and runtime initialization.
A `haXe2 1.33.74` string occurs in the linked Tweener code; it is **not** proof
of the exact compiler used for the game. No original `.hx` files recovered.

Important decompiler defects:

- `ShipModel.gather()` contains unresolved `_temp_1`/`_temp_2` receivers.
  Bytecode confirms both refer to the capacitor (`pcode/ShipModel.pcode`,
  lines 475–483 and 512–526).
- Haxe's initializer function 315 is omitted from readable script output.
  `inspect.py` decodes its instruction subset from FFDec XML into
  `generated/initializer.txt`. Initial values below come from that bytecode.
- `CombatModel.fire()` really does exit after ONE removal. Its loop does not
  clear `capacitor.n` enemies. `pcode/CombatModel.pcode`, lines 447–511:
  the successful removal jumps to the function's redraw/exit label.

## State and space

- SWF v9, one timeline frame, **30 frames/second**, 800×600 stage, `#404040`.
- 20 lanes. Lane center x = `40 * lane + 20`, lane indices 0–19.
- Each lane is an ordered list rendered top-to-bottom with y = `40 * index`.
- Ship y = 540, initially a uniformly random lane.
- Inventory and capacitor each hold `{color, count}` or `{null, 0}`.
- Spawn 20 initial enemies, after choosing ship position.
- Color weights: red 15, green 15, blue 15, yellow 7, pink 1, white 1,
  black 30. Total 84. Independent weighted color and uniform lane draws.
- Colors: `ff0000`, `00ff00`, `0000ff`, `ffff00`, `ff00ff`, `ffffff`, `000000`.

See `Main`, `Random`, `Energy`, `Wavelengths`, and initializer function 315.

## Real time and input

Each `ENTER_FRAME`: with probability **0.0725**, spawn one enemy, then check
loss. At nominal 30Hz this averages 2.175 spawns/second. There is no progression
of this probability in the recovered game. New enemies enter the **head/top**
of a lane: Haxe `List.push` prepends (not JavaScript `Array.push`). Existing
enemies shift down. All collection, replacement, and firing operate at the tail.

Lose when any lane length **exceeds 14**. This is checked on frame events,
not inside actions: a lane can temporarily exceed the limit and be rescued by
input before the next check. Score is elapsed wall-clock milliseconds.

The ready screen starts on mouse-down or UP/DOWN keydown. That event begins
play; it does not also perform a gameplay action. Each key fires once until
released; OS key-repeat events are suppressed using a per-key held flag.
Independent key presses can execute without a cooldown or an animation gate.
Left/right stop at edges, with a fizzle; they do not wrap.

See `Main.onKeyDown`, `onKeyUp`, `onEnter`, `beginPlay`, and `terminate`.

## DOWN: collect or convert

1. If inventory is empty, take the maximal contiguous same-color tail run from
   the current lane. **Black is never collectable** and blocks collection.
   Empty lane or black at tail leaves inventory empty.
2. Otherwise, if capacitor is empty or matches inventory color: set capacitor
   color to inventory color, add inventory count, and clear inventory.
3. Otherwise, if inventory is white: add `5 * inventory.count²` to the existing
   capacitor count, retaining its color; clear inventory.
4. Otherwise: clear **both** inventory and capacitor (fizzle).

Order matters: white goes through ordinary addition if the capacitor is empty
or already white. The bonus applies only against a different existing color.
It is additive quadratic amplification, despite the historical listing's
informal description as multiplicative.

See `ShipModel.gather`, `CombatModel.gather`, and P-code corrections above.

## UP: replace or fire

- With inventory: append the whole inventory run to the current lane's tail,
  then clear inventory. Capacitor unchanged.
- With no inventory but a capacitor: remove **one** tail enemy if any, with
  **no color comparison**, then decrement capacitor by one. A shot at an empty
  lane still consumes one charge. Clear capacitor color when count reaches zero.
- With neither: no operation.

See `ShipModel.fire`, `CombatModel.synthesize`, `CombatModel.fire`, `Energy`.

## Presentation and services

Enemy geometry is generated, not embedded art: ring r26/stroke2/alpha .125,
disk r16/alpha .25, core r10/alpha1, all in the gem's color. Ship is a white
8px chevron with two glow filters and a lane beam (30px white at .05 alpha).
Inventory is concentric rings centered 40px above ship, radius `(i+2)*6`.
Capacitor is repeated chevrons offset down by `(i+2)*6`.

Original opening uses two-second wrapper translations, separate from model
coordinates. Instructions/title and loss screen are external SWFs. Eight MP3s
provide seven effects plus music. Music control is separate from effect triggering.

Mochi: pregame advertisement and loss leaderboard. Kongregate: elapsed-time
and white-chain statistics. The personal HTML additionally has Google Analytics.
None of these services defines the core mechanics. `enableGoodies` can append a
white option but has no recovered call site; it is not enabled by the modern port.

## Architecture notes

The small ship/board/resource split makes reconstruction tractable. However,
the models inherit MovieClip and redraw themselves; `Main` is a global static
service locator for RNG, assets, rendering and analytics. The modern port should
keep the domain boundaries while removing these presentation/platform couplings.

## Fidelity boundaries and next checks

FFDec XML roundtrip: uncompressed SWF and ABC payload bytes match, compressed
file bytes differ. This tests lossless inspection, **not** Haxe recompilation.
By Adam's direction, no obsolete compiler/Mochi byte-matching source rebuild
will be pursued. The readable modern implementation is the maintained artifact.

Remaining checks: original-runtime state traces, timing/input delivery under
different browsers and monitor rates, complete sound/music behavior, visual
comparison of glow/tween effects, and any overflow behavior at enormous charge.
