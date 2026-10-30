import test from 'node:test';
import assert from 'node:assert/strict';
import {makeStudy, makeSeededRun} from './export.mjs';

test('authored study covers all seven materials and twenty lanes', () => {
  const study = makeStudy(), state = study.snapshots[0].state;
  assert.equal(state.lanes.length, 20);
  assert.equal(new Set(state.lanes.flat()).size, 7);
  assert.equal(study.stage.width / study.stage.height, 4 / 3);
});
test('resource sequence is evaluated by real model, including white bonus and black shot', () => {
  const by = Object.fromEntries(makeStudy().snapshots.map(x => [x.name, x.state]));
  assert.deepEqual(by.gathered.inventory, {color: 'red', n: 3});
  assert.deepEqual(by.charged.capacitor, {color: 'red', n: 3});
  assert.deepEqual(by['white-held'].inventory, {color: 'white', n: 2});
  assert.deepEqual(by.amplified.capacitor, {color: 'red', n: 23});
  assert.equal(by.fired.capacitor.n, 22);
  assert.equal(by.fired.lanes[10].length, by['black-lane'].lanes[10].length - 1);
});
test('snapshots do not alias and seeded simulation reproduces', () => {
  assert.equal(makeStudy().snapshots[0].state.inventory.n, 0);
  assert.deepEqual(makeSeededRun(), makeSeededRun());
  assert.equal(makeSeededRun().snapshots.at(-1).state.frames, 300);
});
