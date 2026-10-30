// Bounded task-network DFS. Domain alternatives are separate from this engine.
import {pack, clone, apply, expand, actions, features, key, unpack, fingerprint} from './sim.mjs';
import {decompose, task} from './htn-domain.mjs';
import {decomposeLive} from './htn-live-domain.mjs';
const bound = (value, fallback, max) => Math.floor(Math.max(1, Math.min(max,
  Number.isFinite(Number(value)) ? Number(value) : fallback)));
export class HTN {
  constructor(snapshot, options = {}) {
    this.started = performance.now();
    this.source = structuredClone(snapshot); this.root = pack(this.source);
    this.options = {policy: 'htn', maxNodes: bound(options.maxNodes,12000,100000),
      maxDepth: bound(options.maxDepth,2000,10000), maxFrontier: bound(options.maxFrontier,256,2000),
      maxActions: bound(options.maxActions,20000,30000), round: options.round === 1 ? 1 : 2,
      profile: options.profile === 'live' ? 'live' : 'frozen'};
    this.nodes = 0; this.backtracks = 0; this.cycleStops = 0;
    this.rejected = []; this.seen = new Set(); this.done = false; this.reason = null;
    this.bounds = {depth:0, actions:0, frontier:0};
    this.best = {state: clone(this.root), macros: [], trace: [], tasks: [], depth: 0};
    this.stack = [{...this.best, state: clone(this.root), tasks: [task(this.options.profile==='live'?'LiveMaintenance':'ClearBoard')]}];
  }
  reject(event) { if (this.rejected.length < 64) this.rejected.push(structuredClone(event)); }
  consider(n) {
    if(this.options.profile==='live') {
      // Preserve the actually executed dependency prefix, including parking.
      // This is not the frozen weighted-clear incumbent objective.
      if(n.macros.length>this.best.macros.length) this.best={...n,state:clone(n.state),macros:[...n.macros],trace:structuredClone(n.trace)};
      if(!n.tasks.length){this.best={...n,state:clone(n.state)};this.done=true;this.reason='live-task-boundary';}
      return;
    }
    const a = features(n.state), b = features(this.best.state);
    const quality = (f, s) => -f.weighted + Math.min(s.cap, f.black) * .01;
    if (a.clear || quality(a, n.state) > quality(b, this.best.state) ||
        (quality(a, n.state) === quality(b, this.best.state) && expand(this.root.pos, n.macros).length < expand(this.root.pos, this.best.macros).length)) {
      this.best = {...n, state: clone(n.state), macros: [...n.macros], trace: structuredClone(n.trace)};
    }
    if (a.clear) { this.done = true; this.reason = 'clear'; }
  }
  run(count = 1) {
    for (let i = 0; i < count && !this.done; i++) {
      if (this.nodes >= this.options.maxNodes) {this.finish('node-budget'); break;}
      const n = this.stack.pop();
      if (!n) {this.finish(Object.values(this.bounds).some(Boolean) ?
        'bounded-methods-exhausted (incomplete domain)' : 'methods-exhausted (incomplete domain)'); break;}
      this.nodes++; this.consider(n); if (this.done) break;
      if (!n.tasks.length) {this.backtracks++; continue;}
      if (n.depth >= this.options.maxDepth || n.macros.length >= this.options.maxActions) {
        if (n.depth >= this.options.maxDepth) this.bounds.depth++;
        if (n.macros.length >= this.options.maxActions) this.bounds.actions++;
        this.backtracks++; this.reject({reason: 'depth/action bound', depth: n.depth}); continue;
      }
      const signature = key(n.state) + JSON.stringify(n.tasks);
      if (this.seen.has(signature)) {this.cycleStops++; this.backtracks++; continue;}
      this.seen.add(signature);
      const [t, ...rest] = n.tasks;
      if (t.name === 'ArrowMacro' || t.name === 'RepeatShot') {
        const macro = t.name === 'RepeatShot' ? t.lane * 2 + 1 : t.macro;
        if (!actions(n.state).includes(macro) || (t.name === 'RepeatShot' && n.state.inv)) {
          this.backtracks++; this.reject({task: t.name, reason: 'operator precondition failed', macro}); continue;
        }
        const state = clone(n.state); apply(state, macro);
        const tasks = t.name === 'RepeatShot' && t.n > 1 ? [{...t, n: t.n - 1}, ...rest] : rest;
        this.stack.push({...n, state, tasks, macros: [...n.macros, macro], depth: n.depth + 1});
      } else {
        const {methods, rejected} = this.options.profile==='live' ? decomposeLive(t,n.state) : decompose(t, n.state, this.options.round);
        rejected.forEach(r => this.reject(r));
        if (!methods.length) {this.backtracks++; this.reject({task: t.name, reason: 'no applicable method',
          atMacro: n.macros.length, lastMethods: n.trace.slice(-3).map(e => e.method),
          resources: {cap: n.state.cap, held: n.state.inv, ...features(n.state)}});}
        for (const m of [...methods].reverse()) {
          const event = {task: t.name, method: m.name, estimate: m.estimate, why: m.why, atMacro: n.macros.length};
          this.stack.push({...n, state: clone(n.state), tasks: [...m.tasks, ...rest], macros: [...n.macros],
            trace: [...n.trace, event], depth: n.depth + 1});
        }
        if (this.stack.length > this.options.maxFrontier) {
          this.bounds.frontier += this.stack.length-this.options.maxFrontier;
          this.reject({reason:'frontier-budget: dropped deferred alternatives'});
          this.stack.splice(0, this.stack.length-this.options.maxFrontier);
        }
      }
    }
    return this;
  }
  finish(reason) {this.done = true; this.reason = reason;}
  result(jobID = null, budget = {}) {
    const b = this.best, f = features(b.state), elapsed = performance.now() - this.started;
    return structuredClone({jobID, sourceFingerprint: fingerprint(this.source), options: this.options, budget,
      objective: this.options.profile==='live'?'live-maintenance':'frozen-full-clear',
      outcome: this.options.profile==='live'?(b.macros.length?'continue':'wait-for-observation'):(f.clear?'terminal':'continue'),
      status: f.clear ? 'clear' : b.macros.length ? 'partial' : 'plateau', termination: this.reason || 'searching',
      reason: this.reason || 'searching', plan: expand(this.root.pos, b.macros), macros: b.macros,
      endSnapshot: {...this.source, ...unpack(b.state)}, remaining: f.remaining, blackRemaining: f.black,
      nodes: this.nodes, iterations: this.nodes, backtracks: this.backtracks, cycleStops: this.cycleStops,
      activeMs: elapsed, wallMs: elapsed, incumbentOrigin: 'htn',
      trace: b.trace, rejected: this.rejected, pendingTasks: f.clear ? [] : b.tasks, bounds: this.bounds, memory: null});
  }
}
export function planHTN(snapshot, options = {}, budgetMs = 500) {
  budgetMs = bound(budgetMs,500,60000);
  const deadline = performance.now() + budgetMs, p = new HTN(snapshot, options);
  while (!p.done && performance.now() < deadline) p.run();
  if (!p.done) p.finish('time-budget');
  return p.result(null, {budgetMs});
}
