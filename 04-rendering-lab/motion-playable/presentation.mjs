// Read-only presentation records. All times are monotonic milliseconds.
import { classifyAction, nextAnnotation } from './feedback.mjs';
export const MAX_EFFECTS = 220;
export const MAX_MEMORIES = 96;
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => 1 - (1 - clamp(x)) ** 3;
const lerp = (a, b, t) => a + (b - a) * t;
export const laneX = lane => 20 + lane * 40;

export function createPresentation(random) {
  let ship = { from: 20, to: 20, at: -1000, duration: 80 };
  let effects = [], lanes = new Map(), annotation = null, memories = [], serial = 0;
  // Sparse persistent individual motes, biased toward the top of the board.
  const dust = Array.from({ length: 140 }, () => ({ x: random() * 800,
    y: random() ** 2 * 590, angle: random() * Math.PI * 2,
    size: .35 + random() * .7, phase: random() * 6.28 }));
  const shipX = now => lerp(ship.from, ship.to, ease((now - ship.at) / ship.duration));
  const add = effect => { effects.push(effect); if (effects.length > MAX_EFFECTS) effects.splice(0, effects.length - MAX_EFFECTS); };
  const pulse = (kind, color, now, strength = 1) => add({ kind, color, x: ship.to, y: 518, at: now, life: 320, strength });
  function clear(pos = 0, preserveAnnotation = false) {
    if (!preserveAnnotation) annotation = null;
    effects = []; lanes.clear(); ship = { from: laneX(pos), to: laneX(pos), at: -1000, duration: 80 };
  }
  function cleanup(now) {
    if (annotation && now - annotation.at >= annotation.life) annotation = null;
    effects = effects.filter(e => now - e.at < e.life);
    memories = memories.filter(e => memoryAlpha(e, now, serial) > .001);
    for (const [lane, entry] of lanes) if (now - entry.at > 180) lanes.delete(lane);
  }
  return {
    dust, shipX, clear, cleanup,
    annotation: now => { cleanup(now); return annotation; },
    memories: now => { cleanup(now); return memories.map(e => ({ ...e,
      alpha: memoryAlpha(e, now, serial) * .82 ** e.overlapCount })); },
    clearMemories() { memories = []; serial = 0; },
    effects: now => { cleanup(now); return effects; },
    metrics: now => { cleanup(now); return { effects: effects.length, laneEffects: lanes.size, shipX: shipX(now), targetX: ship.to }; },
    laneOffset(lane, now) {
      const entry = lanes.get(lane); if (!entry) return 0;
      const t = clamp((now - entry.at) / 180);
      // Forty-pixel arrival travel, slight overshoot, then settle. Purely decorative.
      return entry.from * (1 - ease(t)) + 5 * Math.sin(Math.PI * t) ** 2;
    },
    arrival(lane, now, warning = 0) {
      const prior = this.laneOffset(lane, now);
      lanes.set(lane, { at: now, from: Math.max(-82, prior - 40 + warning) });
      add({ kind: 'arrival', color: 'white', x: laneX(lane), y: 0, at: now, life: 180, strength: .5 });
    },
    action(before, after, command, events, now, enabled = true) {
      const semantic = classifyAction(before, after, command, events);
      annotation = nextAnnotation(annotation, semantic, now);
      const memoryKind = { mismatch: 'mixed-loss', 'black-break': 'black-scar', 'white-boost': 'white-echo' }[semantic.kind];
      if (memoryKind) {
        cleanup(now);
        const x = laneX(after.pos), y = memoryKind === 'black-scar' ? (before.lanes[before.pos].length - 1) * 40 : 526;
        // Spatial aging is cumulative: an old trace never brightens again just
        // because a newer, shorter-lived white echo expires nearby.
        for (const memory of memories) if (Math.abs(memory.x - x) < 60 && Math.abs(memory.y - y) < 55) memory.overlapCount++;
        memories.push({ kind: memoryKind, x, y, lane: after.pos, at: now,
          life: memoryKind === 'mixed-loss' ? 18000 : memoryKind === 'black-scar' ? 22000 : 9000,
          serial: ++serial, overlapCount: 0, held: { ...before.inventory }, charge: { ...before.capacitor },
          losses: semantic.losses.map(e => ({ ...e })), gain: semantic.gains[0] ? { ...semantic.gains[0] } : null,
          shards: memoryKind === 'white-echo' ? [] : debrisFootprint(random, memoryKind === 'mixed-loss' ? 12 : 10),
          killerColor: memoryKind === 'black-scar' ? before.capacitor.color : null });
        if (memories.length > MAX_MEMORIES) memories.splice(0, memories.length - MAX_MEMORIES);
      }
      if (!enabled) { clear(after.pos, true); return; }
      const x = laneX(after.pos), previousX = shipX(now);
      // Resource gestures interrupt, rather than pile up incompatible afterimages.
      // Long-lived rubble and lateral movement retain their independent lifetimes.
      if (!['idle', 'move', 'boundary', 'blocked-gather', 'empty-gather'].includes(semantic.kind)) {
        effects = effects.filter(e => ['rubble', 'juke', 'arrival'].includes(e.kind));
      }
      if (before.pos !== after.pos) {
        ship = { from: previousX, to: x, at: now, duration: 80 };
        // Immediate nonzero/full initial velocity, ease out; interrupts rebase here.
        add({ kind: 'juke', color: 'white', x: previousX, endX: x, y: 552, at: now, life: 95 });
      }
      const oldLane = before.lanes[before.pos], newLane = after.lanes[after.pos];
      if (events.includes('gather')) {
        const count = Math.min(24, before.lanes[before.pos].length - after.lanes[before.pos].length);
        for (let i = 0; i < count; i++) add({ kind: 'transport', color: after.inventory.color,
          x, y: (oldLane.length - 1 - i) * 40, endY: 500, at: now, life: 210, travel: 140, direction: 1 });
        pulse('gather', after.inventory.color, now, .65);
      }
      if (events.includes('synth')) {
        for (let i = 0; i < Math.min(24, before.inventory.n); i++) add({ kind: 'transport', color: before.inventory.color,
          x, y: 500, endY: (newLane.length - 1 - i) * 40, at: now, life: 210, travel: 140, direction: -1 });
      }
      if (semantic.source) {
        const kind = semantic.kind === 'white-boost' ? 'amplify' : semantic.kind === 'mismatch' ? 'discharge' : 'compact';
        add({ kind, semantic, color: after.capacitor.color ?? before.inventory.color,
          x, y: 518, at: now, life: kind === 'amplify' ? 440 : kind === 'discharge' ? 460 : 240 });
      }
      if (semantic.kind === 'boundary') pulse('edge', 'white', now, .3);
      if (events.includes('fire')) {
        if (semantic.kind !== 'black-break') pulse('recoil', before.capacitor.color, now);
        const y = Math.max(0, oldLane.length - 1) * 40;
        add({ kind: semantic.kind === 'dry-shot' ? 'dry-shot' : 'shot', x, y: 535,
          endY: oldLane.length ? y : 0, color: before.capacitor.color, at: now, life: semantic.kind === 'dry-shot' ? 260 : 110 });
        if (semantic.kind === 'black-break') add({ kind: 'breakthrough', color: before.capacitor.color,
          x, y, at: now, life: 280 });
        const footprint = semantic.kind === 'black-break' ? memories.at(-1).shards : debrisFootprint(random, 10);
        if (oldLane.length) for (let i = 0; i < 10; i++) {
          const id = oldLane.at(-1), a = random() * 6.28, drag = .075 + random() * .055;
          add({ kind: 'rubble', color: id, x, y, vx: footprint[i].dx / drag,
            killerColor: id === 'black' ? before.capacitor.color : null,
            vy: footprint[i].dy / drag, angle: a, spin: (random() - .5) * 13,
            lift: 20 + random() * 30, drag,
            size: (id === 'black' ? 3.5 : 2.8) + random() * 3.2,
            at: now, life: (id === 'black' ? 4800 : 3000) + random() * 1500 });
        }
      }
    },
  };
}

export function debrisFootprint(random, count) {
  // One strongly biased lateral spill, two unequal forward clumps and a small
  // counter-clump. No symmetric radial explosion or evenly spaced ring.
  const direction = random() < .5 ? -1 : 1, tilt = (random() - .5) * .18;
  const centers = [direction * (30 + random() * 40), direction * (80 + random() * 35), -direction * (12 + random() * 24)];
  return Array.from({ length: count }, (_, i) => {
    const clump = i < Math.ceil(count * .5) ? 0 : i < Math.ceil(count * .83) ? 1 : 2;
    const dx = centers[clump] + (random() + random() - 1) * [20, 11, 15][clump];
    return { dx, dy: dx * tilt + (random() + random() - 1) * [7, 4, 8][clump],
      angle: random() * 6.28, size: 2.7 + random() * 3.1, clump };
  });
}

export function memoryAlpha(memory, now, newestSerial = memory.serial) {
  const age = Math.max(0, now - memory.at);
  if (age >= memory.life) return 0;
  // Long hold, gradual time fade. Pool pressure fades the oldest 16 records
  // before recycling them; a juke or short-lived effect never evicts history.
  const timeFade = 1 - clamp((age / memory.life - .55) / .45);
  const pressureFade = clamp((MAX_MEMORIES - newestSerial + memory.serial) / 16);
  return timeFade * pressureFade;
}

export function transportSample(effect, now, lag = 0) {
  const t = clamp((now - effect.at - lag) / effect.travel);
  const k = ease(t);
  return { x: effect.x, y: lerp(effect.y, effect.endY, k), stretch: 1 + Math.sin(t * Math.PI) * 2.1,
    alpha: Math.max(0, 1 - (now - effect.at) / effect.life) };
}

export function rubbleSample(effect, now) {
  const t = Math.max(0, now - effect.at) / 1000;
  // Looking down: XY is the board plane. Gravity acts along height, away from
  // the camera, never toward screen-bottom. Strong friction yields short skitters.
  const settled = t >= .38;
  const travel = effect.drag * (1 - Math.exp(-Math.min(t, .38) / effect.drag));
  const height = Math.max(0, effect.lift * t - 160 * t * t);
  const remaining = effect.life - (now - effect.at);
  return { x: effect.x + effect.vx * travel, y: effect.y + effect.vy * travel,
    angle: effect.angle + effect.spin * travel, height, settled,
    // Firm opaque chunks come to rest fast, remain, then fade over their last 1.6s.
    alpha: Math.max(0, Math.min(1, remaining / 1600)) };
}

export function poseOffset(effects, now) {
  let offset = 0;
  const beat = (elapsed, duration) => Math.sin(Math.PI * clamp(elapsed / duration));
  for (const e of effects) {
    const elapsed = now - e.at;
    if (elapsed < 0) continue;
    if (e.kind === 'recoil') offset += 7 * beat(elapsed, 140) * (1 - clamp(elapsed / 140));
    if (e.kind === 'discharge') offset += 4 * beat(elapsed, 220);
    if (e.kind === 'amplify') offset -= 5 * beat(elapsed, 300);
    if (e.kind === 'breakthrough' && elapsed >= 55) offset -= 7 * beat(elapsed - 55, 170);
  }
  return Math.max(-7, Math.min(7, offset));
}
