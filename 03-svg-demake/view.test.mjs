import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './model.mjs';
import { drawState, shipFilter, flashAlpha, circlePath } from './view.mjs';

test('source geometry preserves black, exact circle radii/alphas, and lane coordinates', () => {
  const game = createGame(() => .5, 0);
  game.lanes[2] = ['black', 'red'];
  const { orbs } = drawState(game);
  assert.match(orbs, /data-circle="100 0 26"/);
  assert.match(orbs, /data-circle="100 0 16"/);
  assert.match(orbs, /data-circle="100 40 10"/);
  assert.ok(orbs.includes(`stroke="#000000" stroke-width="2" stroke-opacity="${31 / 255}"`));
  assert.ok(orbs.includes(`fill="#000000" fill-opacity="${63 / 255}"`));
  assert.match(orbs, /fill="#ff0000"/);
});

test('Flash alpha channels truncate, rather than rounding or retaining floats', () => {
  assert.equal(flashAlpha(.125), 31 / 255);
  assert.equal(flashAlpha(.25), 63 / 255);
  assert.equal(flashAlpha(.05), 12 / 255);
});

test('whole ship including beam and resource glyphs is inside the filter', () => {
  const game = createGame(() => .5, 0);
  game.inventory = { color: 'blue', n: 2 };
  game.capacitor = { color: 'green', n: 20 };
  const before = structuredClone(game);
  const { ship } = drawState(game);
  assert.match(ship, /^<g transform="translate\(420 0\)" filter="url\(#ship-glow\)">/);
  assert.match(ship, /M0 540V-960/);
  assert.match(ship, /stroke-width="8" stroke-linecap="round"/);
  assert.match(ship, /data-circle="0 500 12"/);
  assert.match(ship, /data-circle="0 500 18"/);
  assert.match(ship, /M0 606l-20 20M0 606l20 20/); // below-stage halo must survive culling
  assert.deepEqual(game, before);
});

test('circles use eight quadratic arcs and twip-truncated control points', () => {
  const path = circlePath(26);
  assert.equal((path.match(/Q/g) || []).length, 8);
  assert.ok(path.startsWith('M18.35 18.35Q10.75 26 0 26'));
  assert.ok(circlePath(12, -40).startsWith('M8.45 -31.5'));
});

test('second anisotropic box glow consumes the first composited result', () => {
  assert.match(shipFilter, /order="25 1"/);
  assert.match(shipFilter, /order="1 5"/);
  assert.match(shipFilter, /in="pass1" type="matrix"/);
  assert.match(shipFilter, /in="pass1alpha" order="5 1"/);
  assert.match(shipFilter, /order="1 51"/);
  assert.match(shipFilter, /divisor="50"/);
});
