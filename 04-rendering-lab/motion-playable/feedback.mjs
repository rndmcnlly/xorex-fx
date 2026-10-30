// Pure interpretation, never a second rules engine. Snapshots and model events
// describe committed consequences; no presentation clock or random stream here.
export function classifyAction(before, after, command, events) {
  const held = before.inventory, cap = before.capacitor;
  const tail = before.lanes[before.pos].at(-1);
  const result = { kind: 'idle', lane: after.pos, losses: [], gains: [], priority: 0, lines: [] };
  const energy = (store, e, n = e.n) => ({ store, color: e.color, n });
  if (before.lost) return result;
  if (command === 'left' || command === 'right') {
    result.kind = before.pos !== after.pos ? 'move' : events.includes('fizzle') ? 'boundary' : 'idle';
  } else if (events.includes('gather')) {
    result.kind = 'gather'; result.gains = [energy('held', after.inventory, after.inventory.n - held.n)];
  } else if (events.includes('synth')) {
    result.kind = 'replace'; result.gains = [energy('lane', held)];
  } else if (events.includes('fire')) {
    result.losses = [energy('charge', cap, cap.n - after.capacitor.n)];
    result.target = tail ?? null;
    result.kind = tail === undefined ? 'dry-shot' : tail === 'black' ? 'black-break' : 'colored-kill';
    if (result.kind === 'dry-shot') { result.priority = 2; result.lines = [`−1 ${cap.color} charge`, 'empty lane']; }
    if (result.kind === 'black-break') { result.priority = 2; result.lines = ['path opened']; }
  } else if (command === 'down' && held.n && after.inventory.n === 0) {
    result.source = energy('held', held);
    result.receiving = energy('charge', cap);
    const gain = after.capacitor.n - cap.n;
    if (events.includes('fizzle') && after.capacitor.n === 0) {
      result.kind = 'mismatch'; result.priority = 4;
      result.losses = [energy('held', held), energy('charge', cap)];
      result.lines = [`−${held.n} ${held.color} held`, `−${cap.n} ${cap.color} charge`];
    } else {
      result.gains = [energy('charge', after.capacitor, gain)];
      result.kind = held.color === 'white' && cap.n && cap.color !== 'white' ? 'white-boost'
        : held.color === 'white' ? 'white-stored' : cap.n ? 'matching-reload' : 'new-charge';
      result.priority = result.kind === 'white-boost' ? 4 : 1;
      result.lines = [`+${gain} ${after.capacitor.color} charge`];
      if (result.kind === 'white-stored') result.lines.push('stored, no boost');
    }
  } else if (command === 'down' && !held.n) result.kind = tail === 'black' ? 'blocked-gather' : 'empty-gather';
  return result;
}

// A single local lesson, not a log or queue. A high-consequence lesson gets a
// short reading window; repeated actions replace rather than stack annotations.
export function nextAnnotation(current, semantic, now) {
  if (!semantic.lines.length) return current && now - current.at < current.life ? current : null;
  if (current && now - current.at < 220 && current.priority > semantic.priority) return current;
  return { ...semantic, at: now, life: semantic.priority === 4 ? 1000 : 720 };
}

export function annotationX(siteLane, liveLane, width) {
  const siteX = 20 + siteLane * 40, liveX = 20 + liveLane * 40;
  const fit = x => Math.max(6, Math.min(794 - width, x));
  let x = fit(siteX + (siteLane < 10 ? 44 : -width - 44));
  if (x < liveX + 28 && x + width > liveX - 28) x = fit(liveX < 400 ? liveX + 44 : liveX - width - 44);
  return x;
}
