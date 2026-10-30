import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, WEIGHTS, chooseColor, seededRandom, createGame, sprinkle, tick, act } from './model.mjs';
import { createKeyboard } from './input.mjs';

const fixture = () => { const s = createGame(() => 0, 0); s.pos = 0; return s; };
const energy = (color, n) => ({ color, n });
const empty = { color: null, n: 0 };

test('initialization chooses ship before twenty lane/color draws', () => {
  const draws = [0.95, ...Array.from({ length: 20 }, () => [0.1, 0]).flat()];
  const s = createGame(() => { assert.ok(draws.length); return draws.shift(); });
  assert.equal(s.pos, 19);
  assert.equal(s.lanes[2].length, 20);
  assert.equal(s.lanes.flat().length, 20);
  assert.equal(s.lost, false); // Initial overflow is checked on the first frame, not here.
  assert.equal(draws.length, 0);
});

test('weighted selection has exact interval widths and boundary ordering', () => {
  let sum = 0;
  for (const [color, weight] of WEIGHTS) {
    assert.equal(chooseColor(() => (sum + 0.01) / 84), color);
    assert.equal(chooseColor(() => (sum + weight - 0.01) / 84), color);
    sum += weight;
  }
  assert.equal(sum, 84);
  assert.equal(chooseColor(() => 15 / 84), 'green');
  assert.equal(chooseColor(() => 54 / 84), 'black');
});

test('sprinkle prepends while replacement appends to the tail', () => {
  const s = fixture(); s.lanes[0] = ['blue'];
  const draws = [0, 0];
  sprinkle(s, () => draws.shift());
  assert.deepEqual(s.lanes[0], ['red', 'blue']);
  s.inventory = energy('green', 2);
  assert.deepEqual(act(s, 'up'), ['synth']);
  assert.deepEqual(s.lanes[0], ['red', 'blue', 'green', 'green']);
  assert.deepEqual(s.inventory, empty);
});

test('gather removes maximal same-color bottom run, not same colors farther up', () => {
  const s = fixture(); s.lanes[0] = ['red', 'blue', 'red', 'red'];
  assert.deepEqual(act(s, 'down'), ['gather']);
  assert.deepEqual(s.inventory, energy('red', 2));
  assert.deepEqual(s.lanes[0], ['red', 'blue']);
});

test('black tail blocks gathering, including colored gems behind it', () => {
  const s = fixture(); s.lanes[0] = ['red', 'black', 'black'];
  assert.deepEqual(act(s, 'down'), []);
  assert.deepEqual(s.inventory, empty);
  assert.equal(s.lanes[0].length, 3);
});

test('empty gather and uncharged fire are no-ops', () => {
  const s = fixture(), before = structuredClone(s);
  assert.deepEqual(act(s, 'down'), []);
  assert.deepEqual(act(s, 'up'), []);
  assert.deepEqual(s, before);
});

test('empty capacitor and matching capacitor compact normally', () => {
  const s = fixture(); s.inventory = energy('red', 3);
  assert.deepEqual(act(s, 'down'), ['compact']);
  assert.deepEqual(s.capacitor, energy('red', 3));
  s.inventory = energy('red', 2);
  act(s, 'down');
  assert.deepEqual(s.capacitor, energy('red', 5));
  assert.deepEqual(s.inventory, empty);
});

test('white only receives quadratic bonus when capacitor is a different color', () => {
  const s = fixture(); s.inventory = energy('white', 3);
  assert.deepEqual(act(s, 'down'), ['compact']);
  assert.deepEqual(s.capacitor, energy('white', 3));
  s.inventory = energy('white', 2);
  act(s, 'down');
  assert.deepEqual(s.capacitor, energy('white', 5));
  s.capacitor = energy('blue', 7); s.inventory = energy('white', 3);
  assert.deepEqual(act(s, 'down'), []);
  assert.deepEqual(s.capacitor, energy('blue', 52));
  assert.deepEqual(s.inventory, empty);
});

test('nonwhite mismatch resets both stores, even against a white capacitor', () => {
  const s = fixture(); s.inventory = energy('red', 2); s.capacitor = energy('white', 50);
  assert.deepEqual(act(s, 'down'), ['fizzle']);
  assert.deepEqual(s.inventory, empty);
  assert.deepEqual(s.capacitor, empty);
});

test('charged fire removes exactly one bottom enemy of any color', () => {
  const s = fixture(); s.lanes[0] = ['red', 'blue', 'black']; s.capacitor = energy('green', 100);
  assert.deepEqual(act(s, 'up'), ['fire']);
  assert.deepEqual(s.lanes[0], ['red', 'blue']);
  assert.deepEqual(s.capacitor, energy('green', 99));
});

test('empty firing consumes charge; last charge resets color as well as count', () => {
  const s = fixture(); s.capacitor = energy('yellow', 2);
  assert.deepEqual(act(s, 'up'), ['fire']);
  assert.deepEqual(s.capacitor, energy('yellow', 1));
  act(s, 'up');
  assert.deepEqual(s.capacitor, empty);
});

test('inventory replacement takes priority over firing and preserves capacitor', () => {
  const s = fixture(); s.capacitor = energy('blue', 9); s.inventory = energy('red', 2);
  act(s, 'up');
  assert.deepEqual(s.lanes[0], ['red', 'red']);
  assert.deepEqual(s.capacitor, energy('blue', 9));
});

test('moving has no wrap and no action cooldown', () => {
  const s = fixture();
  assert.deepEqual(act(s, 'left'), ['fizzle']);
  for (let i = 0; i < 19; i++) act(s, 'right');
  assert.equal(s.pos, 19);
  assert.deepEqual(act(s, 'right'), ['fizzle']);
  act(s, 'left'); assert.equal(s.pos, 18);
});

test('overflow from replacement can be rescued before a simulation frame', () => {
  const s = fixture(); s.lanes[0] = Array(14).fill('red'); s.inventory = energy('blue', 2);
  act(s, 'up'); assert.equal(s.lost, false);
  act(s, 'down'); assert.equal(s.lanes[0].length, 14);
  tick(s, () => 1); assert.equal(s.lost, false);
});

test('loss is checked after spawn, including unselected lanes', () => {
  const s = fixture(); s.lanes[19] = Array(14).fill('black');
  const draws = [0, 0.99, 0];
  assert.deepEqual(tick(s, () => draws.shift()), ['infest', 'logo', 'fizzle']);
  assert.equal(s.lanes[19].length, 15);
  assert.equal(s.lost, true);
  const before = structuredClone(s);
  act(s, 'right'); tick(s, () => 0);
  assert.deepEqual(s, before);
});

test('fourteen is safe; unrescued overflow loses even when no spawn occurs', () => {
  const s = fixture(); s.lanes[0] = Array(14).fill('black');
  tick(s, () => 1); assert.equal(s.lost, false);
  s.inventory = energy('red', 1); act(s, 'up');
  act(s, 'right'); assert.equal(s.lost, false);
  assert.deepEqual(tick(s, () => 1), ['logo', 'fizzle']);
  assert.equal(s.lost, true);
});

test('spawn threshold is strict and each frame is an independent trial', () => {
  const s = fixture();
  assert.deepEqual(tick(s, () => RULES.spawnChance), []);
  for (let i = 0; i < 3; i++) {
    const draws = [0, 0.5, 0];
    assert.deepEqual(tick(s, () => draws.shift()), ['infest']);
  }
  assert.equal(s.frames, 4);
  assert.equal(s.lanes[10].length, 3);
});

test('a seeded fixture reproduces a mixed action/frame trace', () => {
  function trace() {
    const random = seededRandom(2009), s = createGame(random);
    for (let i = 0; i < 100; i++) {
      act(s, ['down', 'down', 'up', 'right', 'left'][i % 5]);
      tick(s, random);
    }
    return s;
  }
  assert.deepEqual(trace(), trace());
  // Snapshot protects the fixture PRNG and draw order, not equivalence to the SWF.
  assert.deepEqual(createGame(seededRandom(1), 0).pos, 12);
});

function inputFixture() {
  const actions = []; let mode = 'ready'; let starts = 0;
  const input = createKeyboard({ mode: () => mode, start: () => { starts++; mode = 'playing'; }, action: a => actions.push(a) });
  const down = (key, repeat = false) => input.down({ key, repeat, preventDefault() {} });
  return { input, down, actions, starts: () => starts, block: () => { mode = 'blocked'; } };
}

test('Up/Down starts without action; repeat suppressed until keyup', () => {
  for (const key of ['ArrowUp', 'ArrowDown']) {
    const f = inputFixture(); f.down(key); f.down(key); f.down(key, true);
    assert.equal(f.starts(), 1); assert.deepEqual(f.actions, []);
    f.input.up({ key }); f.down(key);
    assert.deepEqual(f.actions, [key === 'ArrowUp' ? 'up' : 'down']);
  }
});

test('simultaneous keys latch independently; focus clear and blocked mode are safe', () => {
  const f = inputFixture(); f.down('ArrowLeft'); assert.equal(f.starts(), 0);
  f.input.up({ key: 'ArrowLeft' }); f.down('ArrowUp');
  f.down('ArrowLeft'); f.down('ArrowDown'); f.down('ArrowRight');
  assert.deepEqual(f.actions, ['left', 'down', 'right']);
  f.input.clear(); f.down('ArrowLeft');
  assert.equal(f.actions.at(-1), 'left');
  f.block(); f.input.clear(); f.down('ArrowDown');
  assert.equal(f.actions.length, 4);
});
