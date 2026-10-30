import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, seededRandom, act } from '../../03-svg-demake/model.mjs';
import { classifyAction, nextAnnotation, annotationX } from './feedback.mjs';
import { createPresentation, poseOffset, memoryAlpha, MAX_MEMORIES, debrisFootprint } from './presentation.mjs';

const empty = () => ({ color: null, n: 0 });
function fixture(held = empty(), charge = empty(), lane = []) {
  const state = createGame(seededRandom(2009), 0);
  state.inventory = held; state.capacitor = charge; state.lanes[state.pos] = lane;
  return state;
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function action(state, command) {
  const before = structuredClone(state), events = act(state, command);
  return { before, after: state, events, command, semantic: classifyAction(freeze(before), freeze(structuredClone(state)), command, freeze(events)) };
}

test('every held/charge conversion: exact store gains, white asymmetry, both actual loss colors', () => {
  const colors = ['red', 'green', 'blue', 'yellow', 'pink', 'white'];
  for (const held of colors) for (const charge of [null, ...colors]) for (const n of [1, 2, 5]) {
    const g = fixture({ color: held, n }, charge ? { color: charge, n: 7 } : empty());
    const { semantic: s, after, events } = action(g, 'down');
    if (charge && charge !== held && held !== 'white') {
      assert.equal(s.kind, 'mismatch', `${held} into ${charge}`);
      assert.deepEqual(s.losses, [{ store: 'held', color: held, n }, { store: 'charge', color: charge, n: 7 }]);
      assert.deepEqual(s.gains, []); assert.equal(after.capacitor.n, 0); assert.deepEqual(events, ['fizzle']);
      assert.ok(s.lines[1].includes(charge));
    } else {
      const boosted = held === 'white' && charge && charge !== 'white';
      assert.equal(s.kind, boosted ? 'white-boost' : held === 'white' ? 'white-stored' : charge ? 'matching-reload' : 'new-charge');
      assert.deepEqual(s.losses, [], 'conversion is transfer, not waste');
      assert.deepEqual(s.gains, [{ store: 'charge', color: charge || held, n: boosted ? 5 * n * n : n }]);
      assert.equal(after.inventory.n, 0);
      assert.equal(after.capacitor.n, (charge ? 7 : 0) + s.gains[0].n);
      if (boosted) assert.deepEqual(events, [], 'white boost has no compact event: snapshots are essential');
      if (held === 'white' && !boosted) assert.equal(s.lines[1], 'stored, no boost');
    }
  }
});

test('shot outcomes depend on actual target, not color match; only dry fire is waste', () => {
  for (const target of [null, 'black', 'red', 'green', 'white']) {
    const { semantic: s, after } = action(fixture(empty(), { color: 'red', n: 1 }, target ? [target] : []), 'up');
    assert.equal(s.kind, !target ? 'dry-shot' : target === 'black' ? 'black-break' : 'colored-kill');
    assert.equal(s.target, target);
    assert.deepEqual(s.losses, [{ store: 'charge', color: 'red', n: 1 }]);
    assert.equal(after.capacitor.n, 0);
    assert.equal(after.lanes[after.pos].length, 0);
  }
});

test('gather, replacement, blocked/empty actions, boundary, movement and loss are not conflated', () => {
  const gather = action(fixture(empty(), empty(), ['black', 'red', 'red', 'red']), 'down');
  assert.equal(gather.semantic.kind, 'gather');
  assert.deepEqual(gather.semantic.gains, [{ store: 'held', color: 'red', n: 3 }]);
  const replace = action(fixture({ color: 'blue', n: 4 }, { color: 'green', n: 7 }, ['black']), 'up');
  assert.equal(replace.semantic.kind, 'replace'); assert.deepEqual(replace.semantic.losses, []);
  assert.deepEqual(replace.after.capacitor, { color: 'green', n: 7 });
  assert.deepEqual(replace.after.lanes[replace.after.pos], ['black', 'blue', 'blue', 'blue', 'blue']);
  assert.equal(action(fixture(empty(), empty(), ['black']), 'down').semantic.kind, 'blocked-gather');
  assert.equal(action(fixture(), 'down').semantic.kind, 'empty-gather');
  assert.equal(action(fixture(), 'up').semantic.kind, 'idle');
  assert.equal(action(fixture(), 'right').semantic.kind, 'move');
  for (const [pos, command] of [[0, 'left'], [19, 'right']]) {
    const g = fixture(); g.pos = pos; const s = action(g, command).semantic;
    assert.equal(s.kind, 'boundary'); assert.deepEqual(s.losses, []); assert.deepEqual(s.lines, []);
  }
  const lost = fixture({ color: 'red', n: 1 }); lost.lost = true;
  assert.equal(action(lost, 'down').semantic.kind, 'idle');
  assert.equal(action(fixture(), 'unknown').semantic.kind, 'idle');
});

test('single annotation prioritizes actual consequences, never queues, expires exactly', () => {
  const loss = action(fixture({ color: 'red', n: 2 }, { color: 'white', n: 3 }), 'down').semantic;
  const reload = action(fixture({ color: 'green', n: 2 }, { color: 'green', n: 3 }), 'down').semantic;
  const note = nextAnnotation(null, loss, 100);
  assert.equal(nextAnnotation(note, reload, 319), note);
  assert.equal(nextAnnotation(note, reload, 320).kind, 'matching-reload');
  assert.equal(nextAnnotation(note, loss, 101).at, 101, 'equal priority replaces, never stacks');
  const idle = action(fixture(), 'up').semantic;
  assert.equal(nextAnnotation(note, idle, 1099), note);
  assert.equal(nextAnnotation(note, idle, 1100), null);
});

test('local annotation never obscures the live charge column, including after crossing its original site', () => {
  for (let site = 0; site < 20; site++) for (let live = 0; live < 20; live++) for (const width of [90, 180, 240]) {
    const x = annotationX(site, live, width), target = 20 + live * 40;
    assert.ok(x >= 6 && x + width <= 794);
    assert.ok(x >= target + 28 || x + width <= target - 28, `${site} -> ${live}, width ${width}`);
  }
});

test('semantic effects interrupt, independent rubble survives; reduced/steady retains lesson without stale movement', () => {
  const p = createPresentation(seededRandom(2009));
  function present(g, command, now, enabled = true) {
    const a = action(g, command); p.action(a.before, a.after, command, a.events, now, enabled); return a;
  }
  present(fixture(empty(), { color: 'blue', n: 1 }, ['black']), 'up', 0);
  assert.equal(p.effects(0).filter(e => e.kind === 'rubble').length, 10);
  present(fixture({ color: 'white', n: 2 }, { color: 'green', n: 3 }), 'down', 50);
  assert.ok(p.effects(50).some(e => e.kind === 'amplify' && e.life === 440));
  assert.ok(!p.effects(50).some(e => e.kind === 'breakthrough'));
  present(fixture({ color: 'red', n: 2 }, { color: 'white', n: 3 }), 'down', 60);
  assert.equal(p.effects(60).filter(e => e.kind === 'discharge').length, 1);
  assert.ok(!p.effects(60).some(e => e.kind === 'amplify'));
  assert.equal(p.effects(60).filter(e => e.kind === 'rubble').length, 10);
  assert.deepEqual(p.annotation(60).losses.map(e => e.color), ['red', 'white']);
  assert.ok(!p.effects(520).some(e => e.kind === 'discharge'));
  present(fixture({ color: 'white', n: 2 }, { color: 'green', n: 3 }), 'down', 1000, false);
  assert.equal(p.effects(1000).length, 0);
  assert.equal(p.annotation(1000).lines[0], '+20 green charge');
  p.clear(10, true); assert.equal(p.annotation(1001).kind, 'white-boost');
  assert.equal(p.annotation(2000), null);
  present(fixture({ color: 'red', n: 2 }, { color: 'white', n: 3 }), 'down', 2100, false);
  p.clear(10); assert.equal(p.annotation(2100), null, 'hidden/restart/fixture clears the lesson too');
});

test('poses have distinct signs, target-first black delay, bounded return and no residual offset', () => {
  const sample = (kind, now) => poseOffset([{ kind, at: 0 }], now);
  assert.ok(sample('recoil', 50) > 0);
  assert.ok(sample('discharge', 100) > 0);
  assert.ok(sample('amplify', 100) < 0);
  assert.equal(sample('breakthrough', 54), 0);
  assert.ok(sample('breakthrough', 100) < 0);
  for (const kind of ['recoil', 'discharge', 'amplify', 'breakthrough']) assert.ok(Math.abs(sample(kind, 1000)) < 1e-10);
  assert.ok(poseOffset(Array.from({ length: 100 }, () => ({ kind: 'discharge', at: 0 })), 100) <= 7);
});

test('persistent memories accumulate causal colors/counts and fixed sites independently of short gestures', () => {
  const p = createPresentation(seededRandom(3));
  const g = fixture({ color: 'red', n: 2 }, { color: 'white', n: 7 });
  const present = (command, now, enabled = true) => {
    const before = structuredClone(g), events = act(g, command), truth = structuredClone(g);
    p.action(before, g, command, events, now, enabled);
    assert.deepEqual(g, truth, 'memory never writes the model');
  };
  present('down', 0);
  g.inventory = { color: 'green', n: 3 }; g.capacitor = { color: 'blue', n: 4 }; present('down', 100);
  g.inventory = { color: 'white', n: 2 }; g.capacitor = { color: 'pink', n: 3 }; present('down', 200);
  const originalLane = g.pos; present('right', 220);
  g.lanes[g.pos] = ['black']; g.capacitor = { color: 'yellow', n: 1 }; present('up', 250);
  const memories = p.memories(1000);
  assert.equal(memories.length, 4);
  assert.deepEqual(memories.slice(0, 2).map(m => [m.held.color, m.charge.color]), [['red', 'white'], ['green', 'blue']]);
  assert.deepEqual(memories[0].losses.map(e => e.n), [2, 7]);
  assert.equal(memories[2].gain.n, 20); assert.equal(memories[2].gain.color, 'pink');
  assert.equal(memories[2].x, 20 + originalLane * 40, 'white triumph remains at its site after moving');
  assert.equal(memories[3].killerColor, 'yellow'); assert.equal(g.capacitor.color, null, 'scar remembers last consumed color');
  assert.ok(p.effects(1000).every(e => e.kind === 'rubble'));
  p.clear(g.pos, true); assert.equal(p.memories(2000).length, 4, 'motion toggles cannot erase history');
  g.inventory = { color: 'red', n: 1 }; g.capacitor = { color: 'green', n: 2 }; present('down', 2100, false);
  assert.equal(p.effects(2100).length, 0); assert.equal(p.memories(2100).length, 5, 'reduced motion creates static memory');
  p.clear(g.pos); assert.equal(p.memories(2200).length, 5, 'hidden clears motion, not remembered world');
  const aged = p.memories(9000)[0].alpha;
  assert.equal(p.memories(9300)[0].alpha, aged, 'expired neighboring white echo cannot make older debris brighten again');
  assert.equal(p.memories(25000).length, 0, 'eventual cleanup of all kinds');
  p.clearMemories(); assert.equal(p.memories(25000).length, 0);
});

test('memory time fade, spatial aging and pressure cap are independent of juke/effect budget', () => {
  const p = createPresentation(seededRandom(4));
  const g = fixture();
  for (let i = 0; i < MAX_MEMORIES + 30; i++) {
    g.inventory = { color: 'red', n: 2 }; g.capacitor = { color: 'blue', n: 2 };
    const before = structuredClone(g), events = act(g, 'down'); p.action(before, g, 'down', events, i);
  }
  const memories = p.memories(200);
  assert.equal(memories.length, MAX_MEMORIES);
  assert.ok(memories[0].alpha < .02, 'oldest memory already faint before pool recycling');
  assert.ok(memories.at(-1).alpha > .9);
  const newest = memories.at(-1);
  assert.equal(memoryAlpha(newest, newest.at + 9000), 1);
  assert.ok(memoryAlpha(newest, newest.at + 15000) < .5);
  assert.equal(memoryAlpha(newest, newest.at + newest.life), 0);
  for (let i = 0; i < 2000; i++) {
    const before = structuredClone(g), command = i % 2 ? 'left' : 'right', events = act(g, command);
    p.action(before, g, command, events, 250);
  }
  assert.equal(p.memories(250).length, MAX_MEMORIES, 'thousands of jukes do not evict causal history');
  assert.equal(p.memories(20000).length, 0);
});

test('debris spills asymmetrically across lanes in unequal anisotropic clumps, using only visual RNG', () => {
  for (let seed = 0; seed < 100; seed++) {
    const shards = debrisFootprint(seededRandom(seed), 12);
    assert.deepEqual(shards, debrisFootprint(seededRandom(seed), 12));
    assert.deepEqual([0, 1, 2].map(c => shards.filter(s => s.clump === c).length), [6, 4, 2]);
    const xs = shards.map(s => s.dx), ys = shards.map(s => s.dy);
    assert.ok(Math.max(...xs) - Math.min(...xs) > 80, 'crosses at least two lane widths');
    assert.ok(Math.max(...xs) - Math.min(...xs) > 3 * (Math.max(...ys) - Math.min(...ys)), 'long lateral, narrow cross-axis spread');
    assert.ok(Math.abs(xs.reduce((a, b) => a + b) / xs.length) > 20, 'biased center of mass, not a symmetric burst');
    assert.ok(ys.every(y => Math.abs(y) < 30));
  }
});
