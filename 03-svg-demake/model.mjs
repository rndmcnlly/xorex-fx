// Source-reviewed translation. Lane arrays run from screen top (head) to bottom (tail).
export const RULES = Object.freeze({ lanes: 20, initialEnemies: 20, fps: 30, spawnChance: 0.0725, limit: 14 });
export const COLORS = Object.freeze({ red: '#ff0000', green: '#00ff00', blue: '#0000ff', yellow: '#ffff00', pink: '#ff00ff', white: '#ffffff', black: '#000000' });
export const WEIGHTS = Object.freeze([['red', 15], ['green', 15], ['blue', 15], ['yellow', 7], ['pink', 1], ['white', 1], ['black', 30]]);
export const emptyEnergy = () => ({ color: null, n: 0 });

// Mulberry32 is a reproducible fixture generator, not Flash's Math.random implementation.
export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    let t = value += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function chooseColor(random) {
  const draw = random() * 84;
  let sum = 0;
  for (const [color, weight] of WEIGHTS) {
    sum += weight;
    if (draw < sum) return color;
  }
  return 'black';
}

export function sprinkle(state, random) {
  const lane = Math.floor(random() * RULES.lanes);
  state.lanes[lane].unshift(chooseColor(random));
}

export function createGame(random = Math.random, initialEnemies = RULES.initialEnemies) {
  const state = {
    lanes: Array.from({ length: RULES.lanes }, () => []),
    pos: Math.floor(random() * RULES.lanes),
    inventory: emptyEnergy(), capacitor: emptyEnergy(), frames: 0, lost: false,
  };
  for (let i = 0; i < initialEnemies; i++) sprinkle(state, random);
  return state;
}

// One simulation frame, never called as a side effect of an action.
export function tick(state, random = Math.random) {
  if (state.lost) return [];
  state.frames++;
  const sounds = [];
  if (random() < RULES.spawnChance) {
    sprinkle(state, random);
    sounds.push('infest');
  }
  if (state.lanes.some(lane => lane.length > RULES.limit)) {
    state.lost = true;
    sounds.push('logo', 'fizzle');
  }
  return sounds;
}

export function act(state, action) {
  if (state.lost) return [];
  const lane = state.lanes[state.pos];
  const inv = state.inventory;
  const cap = state.capacitor;
  if (action === 'left' || action === 'right') {
    const next = state.pos + (action === 'left' ? -1 : 1);
    if (next < 0 || next >= RULES.lanes) return ['fizzle'];
    state.pos = next;
  } else if (action === 'up') {
    if (inv.color !== null) {
      for (let i = 0; i < inv.n; i++) lane.push(inv.color);
      state.inventory = emptyEnergy();
      return ['synth'];
    }
    if (cap.color !== null) {
      lane.pop(); // Exactly one enemy, irrespective of color or capacitor size.
      if (--cap.n === 0) state.capacitor = emptyEnergy();
      return ['fire']; // Empty lanes still consume charge and play the sound.
    }
  } else if (action === 'down') {
    if (inv.color === null) {
      const color = lane.at(-1);
      if (color === undefined || color === 'black') return [];
      inv.color = color;
      while (lane.at(-1) === color) { lane.pop(); inv.n++; }
      return ['gather'];
    }
    if (cap.color === null || cap.color === inv.color) {
      cap.color = inv.color;
      cap.n += inv.n;
      state.inventory = emptyEnergy();
      return ['compact'];
    }
    if (inv.color === 'white') {
      cap.n += 5 * inv.n * inv.n;
      state.inventory = emptyEnergy();
      return []; // The original white mismatch branch does not trigger compact.
    }
    state.inventory = emptyEnergy();
    state.capacitor = emptyEnergy();
    return ['fizzle'];
  }
  return [];
}
