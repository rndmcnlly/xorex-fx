import { RULES, tick } from '../../03-svg-demake/model.mjs';

// RNG tape, not a future-state simulation. tick alone decides what the draws mean.
// Rendering MUST use a separate random source. Initial board creation precedes this.
export function createTape(random, horizon = 3) {
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 4) throw Error('Tape horizon must be 1–4');
  const pending = [];
  let committed = 0;
  function fill() {
    while (pending.length < horizon) {
      const draws = [random()];
      if (draws[0] < RULES.spawnChance) draws.push(random(), random());
      pending.push(Object.freeze(draws));
    }
  }
  fill();
  return {
    preview: () => pending.map((draws, index) => ({ index, spawn: draws.length === 3,
      lane: draws.length === 3 ? Math.floor(draws[1] * RULES.lanes) : null })),
    commit(state) {
      if (state.lost) return { events: [], lane: null };
      const draws = pending.shift(); let cursor = 0;
      const events = tick(state, () => {
        if (cursor >= draws.length) throw Error('Model RNG contract changed: exhausted tape');
        return draws[cursor++];
      });
      if (cursor !== draws.length) throw Error('Model RNG contract changed: unused draws');
      committed += cursor; fill();
      return { events, lane: draws.length === 3 ? Math.floor(draws[1] * RULES.lanes) : null };
    },
    stats: () => ({ committed, pending: pending.length }),
  };
}

export const FRAME_MS = 1000 / RULES.fps;
// Same accepted no-backlog deadline advancement. Never synthesize missed ticks.
export function nextDeadline(previous, now) {
  const next = previous + FRAME_MS;
  return next <= now ? now + FRAME_MS : next;
}

// Collapse overlapping warning offsets by lane, rather than enqueueing animations.
export function anticipation(preview, deadline, now) {
  const offsets = new Map();
  for (const entry of preview) {
    const remaining = deadline + entry.index * FRAME_MS - now;
    if (!entry.spawn || remaining < 0 || remaining > 90) continue;
    const amount = -6 * (1 - remaining / 90);
    offsets.set(entry.lane, Math.min(offsets.get(entry.lane) ?? 0, amount));
  }
  return offsets;
}
