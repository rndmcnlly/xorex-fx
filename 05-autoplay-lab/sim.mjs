// Compact, frozen-board action simulator. No time, spawns, RNG, sounds, or DOM.
export const NAMES = [null, 'red', 'green', 'blue', 'yellow', 'pink', 'white', 'black'];
export function pack(source) {
  if (source.lanes.length !== 20 || source.lost) throw Error('Need 20 lanes and a live snapshot');
  const count = source.lanes.reduce((n, l) => n + l.length, 0);
  if (count + source.inventory.n > 5000) throw Error('Lab snapshot limit: 5000 gems including inventory');
  const s = { board: new Uint8Array(Math.max(1, count + source.inventory.n)), lengths: new Uint32Array(20),
    size: count, pos: source.pos, ic: NAMES.indexOf(source.inventory.color), inv: source.inventory.n,
    cc: NAMES.indexOf(source.capacitor.color), cap: source.capacitor.n };
  for (const v of [s.pos, s.ic, s.inv, s.cc, s.cap]) if (!Number.isSafeInteger(v) || v < 0) throw Error('Invalid snapshot');
  if (s.pos > 19 || (s.ic === 0) !== (s.inv === 0) || (s.cc === 0) !== (s.cap === 0)) throw Error('Invalid stores/position');
  let offset = 0;
  source.lanes.forEach((lane, i) => {
    s.lengths[i] = lane.length;
    for (const c of lane) {
      const code = NAMES.indexOf(c);
      if (code < 1) throw Error('Unknown gem');
      s.board[offset++] = code;
    }
  });
  return s;
}
export function clone(s) { return { ...s, board: s.board.slice(), lengths: s.lengths.slice() }; }
// Search-private scratch states have the root's capacity. Never use for retained
// incumbents or exported snapshots: those must continue to own their arrays.
export function copyInto(target, s) {
  target.board.set(s.board); target.lengths.set(s.lengths);
  target.size = s.size; target.pos = s.pos; target.ic = s.ic; target.inv = s.inv;
  target.cc = s.cc; target.cap = s.cap;
  return target;
}
export function unpack(s) {
  let p = 0;
  return { lanes: Array.from(s.lengths, n => Array.from(s.board.subarray(p, p += n), c => NAMES[c])),
    pos: s.pos, inventory: {color: NAMES[s.ic], n: s.inv}, capacitor: {color: NAMES[s.cc], n: s.cap} };
}
export function end(s, lane = s.pos) {
  let p = 0;
  for (let i = 0; i <= lane; i++) p += s.lengths[i];
  return p;
}
export function primitive(s, action) {
  if (action === 'left') { s.pos = Math.max(0, s.pos - 1); return; }
  if (action === 'right') { s.pos = Math.min(19, s.pos + 1); return; }
  const p = end(s), n = s.lengths[s.pos];
  if (action === 'up') {
    if (s.ic) {
      s.board.copyWithin(p + s.inv, p, s.size);
      s.board.fill(s.ic, p, p + s.inv);
      s.lengths[s.pos] += s.inv; s.size += s.inv; s.ic = s.inv = 0;
    } else if (s.cc) {
      if (n) { s.board.copyWithin(p - 1, p, s.size); s.size--; s.lengths[s.pos]--; }
      if (--s.cap === 0) s.cc = 0;
    }
  } else if (action === 'down') {
    if (!s.ic) {
      const c = n ? s.board[p - 1] : 0;
      if (!c || c === 7) return;
      let k = 1;
      while (k < n && s.board[p - 1 - k] === c) k++;
      s.ic = c; s.inv = k;
      s.board.copyWithin(p - k, p, s.size); s.size -= k; s.lengths[s.pos] -= k;
    } else {
      if (!s.cc || s.cc === s.ic) { s.cc = s.ic; s.cap += s.inv; }
      else if (s.ic === 6) s.cap += 5 * s.inv * s.inv;
      else s.cc = s.cap = 0;
      s.ic = s.inv = 0;
    }
  }
}
// Encode macro as lane*2 + (down=0, up=1). Conversion is lane-independent.
export function actions(s, a = []) {
  a.length = 0;
  if (s.ic) {
    a.push(s.pos * 2);
    for (let i = 0; i < 20; i++) a.push(i * 2 + 1);
    return a;
  }
  let p = 0;
  for (let lane = 0; lane < 20; lane++) {
    const n = s.lengths[lane]; p += n;
    if (!n) continue;
    if (s.board[p - 1] !== 7) a.push(lane * 2);
    if (s.cc) a.push(lane * 2 + 1);
  }
  return a;
}
export function apply(s, macro) {
  const lane = macro >> 1, travel = Math.abs(lane - s.pos);
  s.pos = lane; primitive(s, macro & 1 ? 'up' : 'down');
  return travel + 1;
}
export function expand(pos, macros) {
  const result = [];
  for (const m of macros) {
    const lane = m >> 1;
    while (pos < lane) { result.push('right'); pos++; }
    while (pos > lane) { result.push('left'); pos--; }
    result.push(m & 1 ? 'up' : 'down');
  }
  return result;
}
// Exact state encoding, not a collision-prone numeric hash. Position can be
// omitted for path cycles: revisiting a board/stores only to relocate is waste.
export function key(s, withPosition = false) {
  // Typed-array spreading invokes its iterator and materializes arguments on
  // every sampled candidate. Direct reads preserve the exact UTF-16 encoding.
  let board = '';
  for (let i = 0; i < s.size; i++) board += String.fromCharCode(s.board[i]);
  return `${withPosition ? s.pos : ''}|${s.ic},${s.inv},${s.cc},${s.cap}|${s.lengths.join(',')}|${board}`;
}
export function features(s) {
  let black = 0, white = s.ic === 6 ? s.inv : 0;
  for (let i = 0; i < s.size; i++) { black += s.board[i] === 7; white += s.board[i] === 6; }
  return { black, white, remaining: s.size + s.inv, weighted: s.size + s.inv + 2 * black,
    clear: s.size === 0 && s.inv === 0 };
}
export function evaluator(root) {
  const base = Math.max(1, features(root).weighted);
  return s => {
    const f = features(s);
    if (f.clear) return 1;
    // Bounded, state-derived utility. No cumulative rewards for revisits.
    const progress = 1 - f.weighted / base;
    const coverage = Math.min(s.cap, f.black) / Math.max(1, f.black);
    const whitePotential = s.cc && s.cc !== 6 ? Math.min(1, f.white / 3) : 0;
    return Math.max(-1, Math.min(.99, .82 * progress + .12 * coverage + .03 * whitePotential));
  };
}
export function fingerprint(snapshot) {
  const text = JSON.stringify(snapshot);
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++) hash = BigInt.asUintN(64, (hash ^ BigInt(text.charCodeAt(i))) * 0x100000001b3n);
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}
