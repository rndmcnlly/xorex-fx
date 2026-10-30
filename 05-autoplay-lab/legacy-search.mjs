import { seededRandom } from '../03-svg-demake/model.mjs';
import { pack, unpack, clone, copyInto, key, actions, apply, expand, evaluator, features, fingerprint } from './sim.mjs';

export class Search {
  constructor(snapshot, options = {}) {
    this.options = { seed: 2009, horizon: 48, exploration: .65, maxNodes: 12000, ...options };
    const o = this.options;
    if (!Number.isInteger(o.horizon) || o.horizon < 1 || o.horizon > 200 ||
        !Number.isInteger(o.maxNodes) || o.maxNodes < 1 || o.maxNodes > 100000 ||
        !Number.isFinite(o.exploration) || o.exploration < 0 || o.exploration > 5) throw Error('Invalid search bounds');
    this.root = pack(snapshot); this.sourceFingerprint = fingerprint(snapshot); this.sourceFrames = snapshot.frames;
    this.random = seededRandom(o.seed); this.evaluate = evaluator(this.root);
    this.nodes = [this.node(null)]; this.iterations = 0; this.cycles = 0; this.transitions = 0;
    this.keys = new Set([key(this.root, true)]); this.duplicates = 0;
    this.best = { score: this.evaluate(this.root), macros: [], cost: 0, state: clone(this.root) };
    this.working = clone(this.root); this.candidate = clone(this.root); this.available = [];
    this.started = performance.now(); this.activeMs = 0;
  }
  node(move) { return { move, visits: 0, total: 0, children: [], untried: null }; }
  consider(s, moves, cost) {
    const score = this.evaluate(s);
    if (score > this.best.score + 1e-12 || (Math.abs(score - this.best.score) < 1e-12 && cost < this.best.cost))
      this.best = { score, macros: moves.slice(), cost, state: clone(s) };
    return score;
  }
  // One genuine MCTS iteration: UCT selection, one expansion, stochastic
  // heuristic-biased rollout, backpropagation of best executable prefix utility.
  iteration() {
    const s = copyInto(this.working, this.root), path = [0], seen = new Set([key(s)]), moves = [];
    let index = 0, cost = 0, utility = this.evaluate(s), stopped = false;
    const step = move => {
      cost += apply(s, move); this.transitions++; moves.push(move);
      const k = key(s);
      if (seen.has(k)) { this.cycles++; stopped = true; return; }
      seen.add(k); utility = Math.max(utility, this.consider(s, moves, cost));
    };
    while (moves.length < this.options.horizon && (s.size !== 0 || s.inv !== 0)) {
      const n = this.nodes[index];
      n.untried ??= actions(s);
      if (n.untried.length && this.nodes.length < this.options.maxNodes) {
        const pick = Math.floor(this.random() * n.untried.length);
        const move = n.untried[pick]; n.untried[pick] = n.untried.at(-1); n.untried.pop();
        step(move);
        const child = this.nodes.length; this.nodes.push(this.node(move)); n.children.push(child); path.push(child);
        const k = key(s, true);
        if (this.keys.has(k)) this.duplicates++; else this.keys.add(k);
        break;
      }
      if (!n.children.length) break;
      let chosen = -1, best = -Infinity;
      for (const child of n.children) {
        const c = this.nodes[child];
        const uct = c.total / c.visits + this.options.exploration * Math.sqrt(Math.log(n.visits + 1) / c.visits);
        if (uct > best) { best = uct; chosen = child; }
      }
      index = chosen; path.push(index); step(this.nodes[index].move);
      if (stopped) break;
    }
    while (!stopped && moves.length < this.options.horizon && (s.size !== 0 || s.inv !== 0)) {
      const available = actions(s, this.available);
      if (!available.length) break;
      // Random 30%; otherwise choose the strongest of up to six sampled moves.
      // This is a rollout policy, not a replacement for the UCT tree.
      let move = available[Math.floor(this.random() * available.length)];
      if (this.random() >= .3) {
        let best = -Infinity;
        for (let j = 0; j < Math.min(6, available.length); j++) {
          const candidate = available[Math.floor(this.random() * available.length)], t = copyInto(this.candidate, s);
          const travel = apply(t, candidate);
          if (seen.has(key(t))) continue;
          const value = this.evaluate(t) - travel * 1e-6;
          if (value > best) { best = value; move = candidate; }
        }
      }
      step(move);
    }
    for (const i of path) { const n = this.nodes[i]; n.visits++; n.total += utility; }
    this.iterations++;
  }
  run(count = 100) {
    const start = performance.now();
    for (let i = 0; i < count; i++) this.iteration();
    this.activeMs += performance.now() - start;
    return this;
  }
  result(jobID = null, budget = {}) {
    const f = features(this.best.state), root = features(this.root);
    const elapsedMs = performance.now() - this.started;
    return { type: 'result', jobID, sourceFingerprint: this.sourceFingerprint,
      seed: this.options.seed, options: {...this.options}, budget: {...budget},
      iterations: this.iterations, nodes: this.nodes.length, uniqueTreeStates: this.keys.size,
      duplicateExpansions: this.duplicates, cycleStops: this.cycles, transitions: this.transitions,
      activeMs: this.activeMs, elapsedMs,
      iterationsPerSecond: this.activeMs ? this.iterations * 1000 / this.activeMs : 0,
      wallIterationsPerSecond: elapsedMs ? this.iterations * 1000 / elapsedMs : 0,
      memory: null, memoryNote: 'No portable per-worker heap measurement; retained node cap is explicit, bytes are not inferred.',
      score: this.best.score, status: f.clear ? 'clear' : this.best.macros.length ? 'partial' : 'plateau',
      termination: f.clear ? 'clear' : !actions(this.best.state).length ? 'no-productive-actions' : 'bounded-search',
      remaining: f.remaining, blackRemaining: f.black, initialRemaining: root.remaining,
      endSnapshot: {...unpack(this.best.state), frames: this.sourceFrames, lost: false},
      macros: this.best.macros.slice(), plan: expand(this.root.pos, this.best.macros), primitiveCost: this.best.cost };
  }
}

export function baseline(snapshot, kind, {seed = 2009, horizon = 48} = {}) {
  const s = pack(snapshot), random = seededRandom(seed), evaluate = evaluator(s), seen = new Set([key(s)]);
  let best = {score: evaluate(s), macros: [], cost: 0}, cost = 0; const moves = [];
  for (let i = 0; i < horizon && !features(s).clear; i++) {
    const candidates = [];
    for (const move of actions(s)) {
      const t = clone(s), travel = apply(t, move);
      if (!seen.has(key(t))) candidates.push({move, score: evaluate(t), travel});
    }
    if (!candidates.length) break;
    candidates.sort((a, b) => b.score - a.score || a.travel - b.travel || a.move - b.move);
    const c = kind === 'random' ? candidates[Math.floor(random() * candidates.length)] : candidates[0];
    cost += apply(s, c.move); moves.push(c.move); seen.add(key(s));
    const score = evaluate(s);
    if (score > best.score + 1e-12 || (score === best.score && cost < best.cost)) best = {score, macros: moves.slice(), cost};
  }
  const end=pack(snapshot);for(const move of best.macros) apply(end,move);
  const f=features(end);
  return { ...best, kind, seed, status: f.clear ? 'clear' : best.macros.length ? 'partial' : 'plateau',
    remaining: f.remaining, blackRemaining: f.black, primitiveCost: best.cost,
    sourceFingerprint: fingerprint(snapshot), endSnapshot: {...unpack(end), frames:snapshot.frames, lost:false},
    plan: expand(snapshot.pos, best.macros) };
}
