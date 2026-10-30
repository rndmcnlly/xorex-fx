import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, seededRandom, tick, act } from '../../03-svg-demake/model.mjs';
import { createKeyboard } from '../../03-svg-demake/input.mjs';
import { createTape, FRAME_MS, anticipation, nextDeadline } from './schedule.mjs';
import { createPresentation, MAX_EFFECTS, transportSample, rubbleSample } from './presentation.mjs';

test('RNG-only tape matches direct tick states and exact consumption with intervening actions', () => {
  for (let seed = 0; seed < 100; seed++) {
    const logs = [[], []], sources = [seededRandom(seed), seededRandom(seed)];
    const rng = sources.map((source, i) => () => { const v = source(); logs[i].push(v); return v; });
    const direct = createGame(rng[0]), scheduled = createGame(rng[1]);
    const tape = createTape(rng[1]), actions = seededRandom(seed + 1000);
    for (let frame = 0; frame < 900 && !direct.lost; frame++) {
      for (let n = 0; n < 3; n++) {
        const command = ['left', 'right', 'up', 'down'][Math.floor(actions() * 4)];
        assert.deepEqual(act(scheduled, command), act(direct, command));
      }
      assert.deepEqual(tape.commit(scheduled).events, tick(direct, rng[0]));
      assert.deepEqual(scheduled, direct, `seed ${seed}, frame ${frame}`);
      assert.deepEqual(logs[1].slice(0, logs[0].length), logs[0], 'exact RNG prefix/order, not only distribution');
      assert.equal(tape.stats().pending, 3);
    }
  }
});

test('known adjacent spawns use trial/lane/color order, overlap warnings without queues', () => {
  const values = [.01, .51, .2, .02, .51, .8, .9, .9, .9, .9]; let at = 0;
  const tape = createTape(() => values[at++] ?? .9);
  const state = createGame(() => .9, 0);
  const warnings = anticipation(tape.preview(), 100, 40);
  assert.deepEqual([...warnings.keys()], [10]);
  assert.ok(warnings.get(10) < 0);
  assert.equal(tape.commit(state).lane, 10); assert.equal(state.lanes[10][0], 'green');
  act(state, 'down'); // Player actions cannot invalidate a recorded lane/color draw.
  assert.equal(tape.commit(state).lane, 10); assert.equal(state.lanes[10][0], 'black');
  assert.equal(tape.stats().committed, 6);
});

test('deadline contract: fractional 30 Hz, no missed-trial catch-up', () => {
  assert.equal(nextDeadline(100, 100), 100 + FRAME_MS);
  assert.equal(nextDeadline(100, 1000), 1000 + FRAME_MS);
  assert.equal(anticipation([{ index: 0, spawn: true, lane: 2 }], 1000, 800).size, 0);
});

test('jukes start at nonzero velocity, ease out in 80ms and rebase on presented x', () => {
  const p = createPresentation(seededRandom(1)), game = createGame(() => .2, 0); p.clear(game.pos);
  let before = structuredClone(game); act(game, 'right'); p.action(before, game, 'right', [], 0);
  const x0 = p.shipX(0), x1 = p.shipX(1), x2 = p.shipX(2), midway = p.shipX(25);
  assert.ok(x1 > x0); assert.ok(x1 - x0 > x2 - x1);
  before = structuredClone(game); act(game, 'left'); p.action(before, game, 'left', [], 25);
  assert.equal(p.shipX(25), midway, 'interruption does not snap to old target');
  assert.equal(p.shipX(105), game.pos * 40 + 20);
  assert.equal(p.metrics(105).targetX, game.pos * 40 + 20);
});

test('independent simultaneous keys commit gather/convert/fire during motion, no timer gates', () => {
  const game = createGame(() => .5, 0), p = createPresentation(seededRandom(2));
  game.lanes[10] = ['red', 'red']; p.clear(10);
  const keyboard = createKeyboard({ mode: () => 'playing', start() {}, action(command) {
    const before = structuredClone(game), events = act(game, command); p.action(before, game, command, events, 1);
  } });
  const down = key => keyboard.down({ key, repeat: false, preventDefault() {} });
  down('ArrowDown'); down('ArrowRight'); assert.equal(game.inventory.n, 2); assert.equal(game.pos, 11);
  down('ArrowDown'); assert.equal(game.inventory.n, 2, 'held key suppressed independently');
  keyboard.up({ key: 'ArrowDown' }); down('ArrowDown'); assert.equal(game.capacitor.n, 2);
  down('ArrowUp'); assert.equal(game.capacitor.n, 1); assert.ok(p.metrics(1).effects > 0);
});

test('white amplification, mismatch discharge, shaded transport, massy top-down debris and edge fizzle', () => {
  const p = createPresentation(seededRandom(5)), g = createGame(() => .5, 0); p.clear(g.pos);
  const command = (action, now) => { const b = structuredClone(g), events = act(g, action); p.action(b, g, action, events, now); };
  g.inventory = { color: 'white', n: 2 }; g.capacitor = { color: 'red', n: 3 }; command('down', 0);
  assert.equal(g.capacitor.n, 23); assert.ok(p.effects(0).some(e => e.kind === 'amplify'));
  g.inventory = { color: 'green', n: 1 }; command('down', 5);
  assert.ok(p.effects(5).some(e => e.kind === 'discharge')); assert.equal(g.capacitor.n, 0);
  g.lanes[g.pos] = ['blue', 'blue']; command('down', 10);
  const transport = p.effects(10).find(e => e.kind === 'transport'); assert.equal(transport.color, 'blue');
  assert.ok(transportSample(transport, 80).stretch > 1);
  command('down', 20); g.lanes[g.pos] = ['black']; command('up', 30);
  const rubble = p.effects(30).find(e => e.kind === 'rubble'); assert.equal(rubble.color, 'black');
  assert.ok(Number.isFinite(rubbleSample(rubble, 400).y));
  const rest = rubbleSample(rubble, 500), later = rubbleSample(rubble, 2000);
  assert.equal(rest.x, later.x); assert.equal(rest.y, later.y, 'no screen-bottom gravity or creep after settling');
  assert.equal(later.height, 0); assert.equal(later.settled, true); assert.equal(later.alpha, 1);
  assert.ok(Math.abs(later.y - rubble.y) < 35, 'short friction-limited skitter, not a falling spray');
  g.pos = 0; command('left', 40); assert.ok(p.effects(40).some(e => e.kind === 'edge'));
});

test('effects and lane offsets bounded under abuse, cleanup/hidden/reduced clear all motion', () => {
  const p = createPresentation(seededRandom(7)), g = createGame(() => .5, 0); p.clear(g.pos);
  for (let i = 0; i < 2000; i++) {
    g.capacitor = { color: 'red', n: 1 }; g.lanes[g.pos] = ['black'];
    const b = structuredClone(g), events = act(g, 'up'); p.action(b, g, 'up', events, i / 10);
    p.arrival(i % 20, i / 10, -6);
  }
  assert.ok(p.metrics(200).effects <= MAX_EFFECTS); assert.ok(p.metrics(200).laneEffects <= 20);
  assert.ok(p.metrics(2000).effects > 0, 'resting black rubble persists');
  assert.deepEqual(p.metrics(8000), { effects: 0, laneEffects: 0, shipX: 420, targetX: 420 });
  p.arrival(1, 2100); p.clear(g.pos); assert.equal(p.metrics(2100).laneEffects, 0);
  const b = structuredClone(g); act(g, 'right'); p.action(b, g, 'right', [], 2200, false);
  assert.equal(p.metrics(2200).effects, 0); assert.equal(p.shipX(2200), g.pos * 40 + 20);
});
