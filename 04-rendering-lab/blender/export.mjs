// The renderer consumes model results; it never implements game rules.
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {act, createGame, seededRandom, tick, RULES} from '../../03-svg-demake/model.mjs';
import {drawState, shipFilter} from '../../03-svg-demake/view.mjs';

export function makeStudy() {
  const random = seededRandom(2026), state = createGame(random, 0);
  // Authored layout for coverage, not a claimed naturally played original run.
  const colors = ['red', 'green', 'blue', 'yellow', 'pink', 'white', 'black'];
  state.lanes = state.lanes.map((_, lane) =>
    Array.from({length: 2 + lane % 5}, (_, row) => colors[(lane + row * 2) % colors.length]));
  state.pos = 8;
  state.lanes[8] = ['black', 'blue', 'red', 'red', 'red'];
  state.lanes[9] = ['green', 'black', 'white', 'white'];
  state.lanes[10] = ['yellow', 'black', 'black'];
  const snapshots = [], events = [];
  function capture(name, frame) {
    snapshots.push({name, frame, state: structuredClone(state)});
  }
  capture('overview', 1);
  for (const [name, frame, action] of [
    ['gathered', 13, 'down'], ['charged', 25, 'down'],
    ['white-lane', 37, 'right'], ['white-held', 49, 'down'],
    ['amplified', 61, 'down'], ['black-lane', 73, 'right'], ['fired', 85, 'up'],
  ]) {
    const before = structuredClone(state), sounds = act(state, action);
    events.push({frame, action, sounds, before, after: structuredClone(state)});
    capture(name, frame);
  }
  return {schema: 'xorex-lookdev-v1', fps: RULES.fps, stage: {width: 800, height: 600},
    provenance: 'Authored board; every action evaluated by unchanged 03-svg-demake/model.mjs. No elapsed spawn frames in this controlled material study.',
    snapshots, events};
}

export function makeSeededRun(seed = 2009) {
  const random = seededRandom(seed), state = createGame(random), snapshots = [];
  snapshots.push({name: 'natural-start', frame: 1, state: structuredClone(state)});
  for (let frame = 1; frame <= 300; frame++) {
    tick(state, random);
    if (frame % 60 === 0) snapshots.push({name: `natural-${frame}`, frame: frame + 1, state: structuredClone(state)});
  }
  return {schema: 'xorex-lookdev-v1', fps: RULES.fps, stage: {width: 800, height: 600},
    provenance: 'Seeded model run with real spawn ticks, no actions. Fixture RNG is not Flash RNG.', snapshots, events: []};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = resolve(process.argv[2] || `${dirname(fileURLToPath(import.meta.url))}/generated`);
  mkdirSync(out, {recursive: true});
  for (const [name, bundle] of [['study', makeStudy()], ['seeded', makeSeededRun()]]) {
    writeFileSync(`${out}/${name}.json`, JSON.stringify(bundle, null, 2) + '\n');
    for (const snapshot of bundle.snapshots) {
      const {orbs, ship} = drawState(snapshot.state);
      writeFileSync(`${out}/${snapshot.name}-reference.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><defs>${shipFilter}</defs><rect width="800" height="600" fill="#404040"/>${orbs}${ship}</svg>`);
    }
    console.log(`${name}: ${bundle.snapshots.length} states, ${bundle.events.length} model-evaluated actions -> ${out}`);
  }
}
