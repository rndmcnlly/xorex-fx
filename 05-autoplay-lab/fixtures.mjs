import { createGame, seededRandom, tick } from '../03-svg-demake/model.mjs';
function authored(lanes, inventory = {color: null, n: 0}, capacitor = {color: null, n: 0}, pos = 0) {
  const s = createGame(seededRandom(1), 0); s.pos = pos;
  lanes.forEach((l, i) => s.lanes[i] = l); s.inventory = inventory; s.capacitor = capacitor;
  return s;
}
export const FIXTURES = {
  'black-plateau': () => authored([['black', 'black'], ['black']]),
  'one-shot': () => authored([['black']], undefined, {color: 'red', n: 1}),
  'white-rescue': () => authored([['black', 'black', 'black'], ['white', 'white'], ['red']], undefined, {color: 'red', n: 1}),
  'white-cap-trap': () => authored([['black', 'black'], ['red'], ['white']], undefined, {color: 'white', n: 1}),
  'buried-white': () => authored([['white', 'white', 'black'], ['red', 'red'], ['black', 'black', 'black']], undefined, {color: 'blue', n: 1}),
  'replace-merge': () => authored([['white'], ['black', 'black', 'black', 'black'], ['red']], {color: 'white', n: 1}, {color: 'red', n: 1}),
  'mismatch-reset': () => authored([['black'], ['blue']], {color: 'red', n: 1}, {color: 'blue', n: 2}),
};
export function fixture(name = 'seeded', seed = 2009) {
  if (FIXTURES[name]) return FIXTURES[name]();
  const rng = seededRandom(seed), s = createGame(rng);
  // Natural snapshot generator only. Search and replay NEVER call tick.
  if (name === 'natural') for (let i = 0; i < 700 && !s.lost; i++) tick(s, rng);
  // If loss occurred, expose a live frozen copy, explicitly without a tick loss check.
  s.lost = false;
  return s;
}
