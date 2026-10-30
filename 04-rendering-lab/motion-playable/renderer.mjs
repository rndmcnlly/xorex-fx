// Canvas2D presentation adapted from ../p3-playable/renderer.mjs.
// Analytic shaded spheres and point-light proxies, not a physical PBR renderer.
import { color } from './palette.mjs';
import { laneX, transportSample, rubbleSample, poseOffset } from './presentation.mjs';
import { annotationX } from './feedback.mjs';

export function draw(ctx, state, gamut, presentation, now, options) {
  const { plain, motion, intensity, warnings } = options;
  const ink = id => color(id ?? 'white', gamut);
  ctx.globalAlpha = 1; ctx.clearRect(0, 0, 800, 600);
  ctx.fillStyle = '#404040'; ctx.fillRect(0, 0, 800, 600);
  if (!state) return;
  const effects = motion ? presentation.effects(now) : [];
  const emitters = [];
  const circle = (x, y, r, fill, alpha = 1, stroke = false, width = 1) => {
    ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = ctx.strokeStyle = fill; ctx.lineWidth = width;
    if (stroke) ctx.stroke(); else ctx.fill(); ctx.globalAlpha = 1;
  };
  const chevron = (x, y, fill, width, alpha = 1) => {
    ctx.globalAlpha = alpha; ctx.beginPath(); ctx.moveTo(x - 18, y + 19); ctx.lineTo(x, y); ctx.lineTo(x + 18, y + 19);
    ctx.strokeStyle = fill; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.globalAlpha = 1;
  };
  const halo = (x, y, r, pigment, alpha) => {
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, pigment); g.addColorStop(.4, pigment); g.addColorStop(1, 'transparent');
    circle(x, y, r, g, alpha);
  };
  function sphere(x, y, id, alpha = 1, radius = 15.5, stretched = 1) {
    const pigment = ink(id);
    ctx.save(); ctx.translate(x, y); ctx.scale(1, stretched); ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(-4, -5, 0, 0, 0, radius);
    g.addColorStop(0, id === 'black' ? '#404247' : pigment);
    g.addColorStop(.44, id === 'black' ? '#17191c' : pigment);
    g.addColorStop(1, id === 'black' ? '#050607' : '#13151a');
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, 6.284); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = id === 'black' ? '#888b91' : pigment; ctx.lineWidth = .8; ctx.globalAlpha = alpha * .65; ctx.stroke();
    ctx.clip();
    // Broad low-contrast diffuse shoulder makes a sphere, not a flattened puck.
    const shoulder = ctx.createRadialGradient(-5, -7, 0, -4, -6, 16);
    shoulder.addColorStop(0, '#ffffff'); shoulder.addColorStop(1, 'transparent');
    ctx.globalAlpha = alpha * (id === 'white' ? .15 : .16); ctx.fillStyle = shoulder; ctx.fillRect(-16, -16, 32, 32);
    // A pair of streak catchlights rides the curved top; saturated center stays clear.
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.35; ctx.lineCap = 'round'; ctx.globalAlpha = alpha * .65;
    ctx.beginPath(); ctx.moveTo(-8, -8); ctx.quadraticCurveTo(-4, -11, 2, -11); ctx.stroke();
    ctx.globalAlpha = alpha * .22; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(8, -8); ctx.stroke();
    if (id === 'black') {
      // Stable object-space scuffs, no sparkling noise or changing game geometry.
      ctx.strokeStyle = '#a5a6a8'; ctx.globalAlpha = alpha * .2; ctx.lineWidth = .7;
      for (const [sx, sy, dx, dy] of [[-9, 2, 4, -2], [2, 8, 4, -1], [7, -3, 2, 3], [-3, -4, 2, 1]]) {
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + dx, sy + dy); ctx.stroke();
      }
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  const targetX = laneX(state.pos), visualX = motion ? presentation.shipX(now) : targetX;
  // Exact selected column never follows the decorative ship's interpolation.
  ctx.fillStyle = '#fff'; ctx.globalAlpha = .048; ctx.fillRect(targetX - 15, 0, 30, 540); ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff'; ctx.globalAlpha = .32; ctx.fillRect(targetX - 1, 440, 2, 94); ctx.globalAlpha = 1;

  // Causal memory is a separate, static board layer. It accumulates even with
  // reduced motion, stays at the event site after juking, and is always behind
  // live gems/resources. Angular flakes and wing-like etchings are not gems.
  const memories = presentation.memories(now);
  for (const m of memories) {
    const age = now - m.at;
    if (m.kind === 'white-echo') {
      const emergence = motion ? Math.min(1, age / 220) : 1;
      // A smooth long tail, not a sudden strong-glow to weak-echo switch.
      const glow = m.alpha * (.16 + .26 * Math.max(0, 1 - age / 4500)) * emergence;
      const receiving = ink(m.gain.color);
      halo(m.x, m.y, 43, receiving, glow * .65 * intensity);
      ctx.save(); ctx.translate(m.x, m.y); ctx.globalAlpha = glow;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(0, -13, 20, 4, 0, 0, Math.PI * 2); ctx.stroke();
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(side * 5, 6); ctx.bezierCurveTo(side * 14, 1, side * 33, -2, side * 29, -17);
        ctx.bezierCurveTo(side * 23, -10, side * 15, -12, side * 10, -4); ctx.stroke();
        ctx.strokeStyle = receiving; ctx.beginPath(); ctx.moveTo(side * 7, 9); ctx.quadraticCurveTo(side * 25, 5, side * 31, -4); ctx.stroke();
        ctx.strokeStyle = '#fff';
      }
      ctx.restore();
    } else {
      const loss = m.kind === 'mixed-loss';
      const settle = motion ? 1 - (1 - Math.max(0, Math.min(1, (age - (loss ? 140 : 0)) / 380))) ** 3 : 1;
      for (const shard of m.shards) {
        const x = m.x + shard.dx * settle, y = m.y + shard.dy * settle;
        ctx.save(); ctx.translate(x, y); ctx.rotate(shard.angle); ctx.scale(shard.size / 4, shard.size / 4);
        if (!loss) ctx.scale(1.35, 1.35);
        ctx.globalAlpha = m.alpha * .65 * (loss && motion ? Math.min(1, age / 140) : 1);
        ctx.fillStyle = loss ? '#202226' : '#131519'; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(5, -3); ctx.lineTo(3, 3); ctx.lineTo(-3, 2); ctx.closePath(); ctx.fill();
        // Each mixed shard bears both source pigments, not an averaged gray.
        // Black scars retain the spent charge pigment even at zero live charge.
        ctx.strokeStyle = ink(loss ? m.held.color : m.killerColor); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(0, 0); ctx.lineTo(3, -1); ctx.stroke();
        if (loss) { ctx.strokeStyle = ink(m.charge.color); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(3, 3); ctx.lineTo(-3, 2); ctx.stroke(); }
        ctx.restore();
      }
    }
  }

  // Settled debris is on the board, behind every actionable sphere and resource.
  for (const e of effects) if (e.kind === 'rubble') {
    const s = rubbleSample(e, now), pigment = ink(e.color);
    ctx.save(); ctx.translate(s.x + s.height * .16, s.y + s.height * .12);
    ctx.globalAlpha = s.alpha * .4; ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(0, 0, e.size * (1 + s.height * .025), e.size * .7, s.angle, 0, 6.284); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angle); ctx.globalAlpha = s.alpha * .94;
    ctx.beginPath(); ctx.moveTo(-e.size, -e.size * .6); ctx.lineTo(e.size * .9, -e.size); ctx.lineTo(e.size, e.size * .5); ctx.lineTo(-e.size * .6, e.size); ctx.closePath();
    const g = ctx.createLinearGradient(-e.size, -e.size, e.size, e.size); g.addColorStop(0, e.color === 'black' ? '#54565b' : pigment); g.addColorStop(1, '#101114');
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-e.size, -e.size * .6); ctx.lineTo(e.size * .9, -e.size); ctx.lineTo(0, -.1 * e.size); ctx.closePath();
    ctx.fillStyle = e.color === 'black' ? '#68696b' : pigment; ctx.globalAlpha = s.alpha * .55; ctx.fill();
    if (e.killerColor) {
      ctx.strokeStyle = ink(e.killerColor); ctx.lineWidth = 1.1; ctx.globalAlpha = s.alpha * .85;
      ctx.beginPath(); ctx.moveTo(-e.size, -e.size * .6); ctx.lineTo(0, 0); ctx.lineTo(e.size * .7, -e.size * .3); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  for (const [laneIndex, lane] of state.lanes.entries()) {
    const x = laneX(laneIndex);
    const offset = motion ? presentation.laneOffset(laneIndex, now) + (warnings.get(laneIndex) ?? 0) : 0;
    lane.forEach((id, row) => {
      const y = row * 40, pigment = ink(id);
      if (plain) {
        circle(x, y, 26, pigment, .12, true, 2); circle(x, y, 16, pigment, .25); circle(x, y, 10, pigment);
      } else {
        // Low-alpha moving silhouette explains an arrival without hiding its true slot.
        if (Math.abs(offset) > .3) sphere(x, y + offset, id, .22);
        if (id !== 'black') {
          halo(x, y, id === 'white' ? 33 : 25, pigment, (id === 'white' ? .32 : .21) * intensity);
          emitters.push({ x, y: y + offset * .3, id, strength: id === 'white' ? 2.5 : 1 });
        }
        sphere(x, y, id);
        if (warnings.has(laneIndex) && motion) circle(x, y, 18, pigment, .28 * intensity, true, .8);
      }
    });
  }
  emitters.push({ x: visualX, y: 543, id: state.capacitor.color ?? 'white', strength: 1.8 });

  // Action ghosts are short, translucent, shaded silhouettes. Never state objects.
  for (const e of effects) {
    if (e.kind === 'rubble') continue;
    const age = (now - e.at) / e.life, fade = Math.max(0, 1 - age), pigment = ink(e.color);
    if (e.kind === 'transport') {
      for (const [lag, weight] of [[40, .07], [18, .13], [0, .34]]) {
        const s = transportSample(e, now, lag);
        sphere(s.x, s.y, e.color, s.alpha * weight, 13, s.stretch);
      }
      const s = transportSample(e, now);
      emitters.push({ x: s.x, y: s.y, id: e.color, strength: fade * 2 });
    } else if (e.kind === 'juke') {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.globalAlpha = fade * .32;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(e.x, e.y + i * 4); ctx.lineTo(e.endX, e.y + i * 4); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (e.kind === 'shot') {
      ctx.strokeStyle = pigment; ctx.lineWidth = 3; ctx.globalAlpha = fade * .75;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x, e.endY); ctx.stroke(); ctx.globalAlpha = 1;
      emitters.push({ x: e.x, y: e.endY, id: e.color, strength: fade * 3 });
    } else if (e.kind === 'dry-shot') {
      // A trace that finds nothing contracts back to the spent charge, rather
      // than borrowing the explosion language of a successful destruction.
      const collapse = Math.max(0, (age - .2) / .8);
      ctx.strokeStyle = pigment; ctx.lineWidth = 1.5; ctx.globalAlpha = fade * .5;
      ctx.beginPath(); ctx.moveTo(e.x, 535); ctx.lineTo(e.x, 535 * collapse); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(e.x - 5, 568 + age * 16); ctx.lineTo(e.x + 5, 568 + age * 16); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (e.kind === 'discharge') {
      const meet = Math.min(1, (now - e.at) / 140), extinct = Math.max(0, (age - .3) / .7);
      for (const [i, loss] of e.semantic.losses.entries()) {
        const origin = i ? 566 : 500, y = origin + (527 - origin) * meet;
        // Actual incompatible pigments arrive from opposite stores, flatten,
        // then leave two dark extinct traces. No generic red punishment wash.
        ctx.save(); ctx.translate(e.x, y); ctx.scale(1 + meet * .45, 1 - meet * .78);
        circle(0, 0, 14, extinct > .3 ? '#17191c' : ink(loss.color), fade * .75, true, 3);
        ctx.restore();
        circle(e.x, origin, 18 + extinct * 6, extinct ? '#17191c' : ink(loss.color), fade * .6, true, 2);
      }
    } else if (e.kind === 'compact' || e.kind === 'amplify') {
      const amp = e.kind === 'amplify', travel = Math.min(1, (now - e.at) / (amp ? 140 : 110));
      const release = Math.max(0, (now - e.at - (amp ? 140 : 110)) / (amp ? 300 : 130));
      const y = 500 + 68 * (1 - (1 - travel) ** 3);
      const source = ink(e.semantic.source.color);
      if (travel < 1) {
        circle(e.x, y, 18 - travel * 11, source, .75, true, amp ? 3 : 2);
        ctx.strokeStyle = source; ctx.lineWidth = 2; ctx.globalAlpha = .55 * (1 - travel);
        ctx.beginPath(); ctx.moveTo(e.x - 8, y - 9); ctx.lineTo(e.x, y - 2); ctx.lineTo(e.x + 8, y - 9); ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (release > 0) {
        const strength = e.semantic.kind === 'matching-reload' ? 1 : .65;
        // Percussive lock closes toward the charge, the payoff opens in its
        // receiving pigment. White is only the lead-in, not the boosted store.
        const radius = amp ? 8 + release * 35 : 9 + (1 - release) * 11;
        circle(e.x, 568, radius, pigment, (1 - release) * (amp ? .9 : strength), true, amp ? 3 : 2);
        if (amp) halo(e.x, 568, 48, pigment, (1 - release) * .3 * intensity);
        else {
          ctx.strokeStyle = pigment; ctx.lineWidth = 2; ctx.globalAlpha = (1 - release) * strength;
          for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(e.x + side * 14, 562); ctx.lineTo(e.x + side * 9, 568); ctx.lineTo(e.x + side * 14, 574); ctx.stroke(); }
          ctx.globalAlpha = 1;
        }
        emitters.push({ x: e.x, y: 568, id: e.color, strength: (1 - release) * (amp ? 5 : 1.5) });
      }
    } else if (e.kind === 'breakthrough') {
      const targetFade = Math.max(0, 1 - (now - e.at) / 140);
      circle(e.x, e.y, 17 + age * 18, '#ddd', targetFade * .8, true, 2);
      const returnBeat = Math.max(0, (now - e.at - 55) / 225);
      if (returnBeat > 0) chevron(e.x, 536, pigment, 2, (1 - returnBeat) * .85);
    } else {
      const r = 7 + age * (e.kind === 'edge' ? 9 : 20);
      if (e.kind !== 'recoil') circle(e.x, e.kind === 'gather' ? 500 : e.y, r, pigment, fade * (e.kind === 'edge' ? .2 : .5) * intensity, true, 1.5);
      if (e.kind === 'edge') {
        ctx.globalAlpha = fade * .6; ctx.strokeStyle = pigment; ctx.lineWidth = 1.2;
        for (let i = 0; i < 7; i++) { const a = i * 2.399; ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r); ctx.lineTo(e.x + Math.cos(a) * (r + 5), e.y + Math.sin(a) * (r + 5)); ctx.stroke(); } ctx.globalAlpha = 1;
      }
      emitters.push({ x: e.x, y: e.y, id: e.color, strength: fade * e.strength });
    }
  }

  if (!plain) {
    // Point-mote reflectance proxy: one fixed tiny oriented lobe per mote, colored
    // by its strongest nearby emitter. No texture, streak field, or path tracing.
    const nearbyLights = emitters.slice(-320);
    for (const mote of presentation.dust) {
      let best = .025, chosen = 'white';
      for (const light of nearbyLights) {
        const dx = light.x - mote.x, dy = light.y - mote.y, d2 = dx * dx + dy * dy;
        if (d2 > 12000) continue;
        const lobe = Math.max(0, Math.cos(Math.atan2(dy, dx) - mote.angle)) ** 8;
        const response = light.strength * (.09 + .9 * lobe) / (1 + d2 / 900);
        if (response > best) { best = response; chosen = light.id; }
      }
      ctx.save(); ctx.translate(mote.x, mote.y); ctx.rotate(mote.angle);
      ctx.globalAlpha = Math.min(.8, best * intensity); ctx.fillStyle = ink(chosen);
      ctx.beginPath(); ctx.ellipse(0, 0, mote.size, mote.size * .65, 0, 0, 6.284); ctx.fill(); ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < Math.min(state.inventory.n, 165); i++) circle(targetX, 500, (i + 2) * 6, ink(state.inventory.color), 1, true, 2);
  // Target chevron is thinner and always at logical position; actual ship can juke.
  if (Math.abs(visualX - targetX) > .2) chevron(targetX, 540, '#fff', 1.5, .7);
  // One interruptible resource gesture at a time: loss retreats, payoff lifts,
  // black breakthrough knocks confidently forward after its target accent.
  const recoil = poseOffset(effects, now);
  if (!plain) halo(visualX, 549 + recoil, 34, ink(state.capacitor.color ?? 'white'), .18 * intensity);
  const satisfaction = memories.findLast(m => m.kind === 'white-echo' && now - m.at < 2600);
  if (satisfaction && !plain) halo(visualX, 549 + recoil, 39, ink(satisfaction.gain.color), .23 * (1 - (now - satisfaction.at) / 2600) * intensity);
  chevron(visualX, 540 + recoil, '#fff', 7);
  for (let i = 0; i < state.capacitor.n && 540 + (i + 2) * 6 < 620; i++) chevron(targetX, 540 + (i + 2) * 6, ink(state.capacitor.color), 2);
  // One compact stationary annotation, offset from the authoritative stores.
  // This survives reduced motion, effects-off and the steady reference view.
  const note = presentation.annotation(now);
  if (note) {
    ctx.font = '12px system-ui, sans-serif'; ctx.textBaseline = 'top';
    const width = Math.max(...note.lines.map(line => ctx.measureText(line).width)) + 16;
    const x = annotationX(note.lane, state.pos, width);
    const y = 556, h = note.lines.length * 16 + 10;
    ctx.fillStyle = '#282a2e'; ctx.fillRect(x, y, width, h);
    ctx.fillStyle = note.kind === 'mismatch' || note.kind === 'dry-shot' ? '#d5b5ae' : '#e6e7e8';
    note.lines.forEach((line, i) => ctx.fillText(line, x + 8, y + 5 + i * 16));
    // Static colored tabs preserve which two stores vanished without motion.
    const pigments = note.kind === 'mismatch' ? note.losses : note.gains;
    pigments.forEach((entry, i) => { ctx.fillStyle = ink(entry.color); ctx.fillRect(x, y + 5 + i * 16, 2, 12); });
  }
}
