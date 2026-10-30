import {Search as LegacySearch, baseline} from './legacy-search.mjs';
import {clone, copyInto, key, actions, apply, features} from './sim.mjs';
export {baseline};

// Bounded, coherent ablations, not arbitrary independent public switches.
export const POLICIES = ['legacy', 'long', 'deliberate', 'resource', 'terminal', 'seeded'];
export class Search extends LegacySearch {
  constructor(snapshot, options = {}) {
    const {policy = 'resource', ...rest} = options;
    if (!POLICIES.includes(policy)) throw Error('Unknown search policy');
    if (policy === 'legacy') return new LegacySearch(snapshot, rest);
    super(snapshot, {...rest, horizon: rest.horizon ?? Math.min(200, Math.max(48,
      2 * (snapshot.lanes.reduce((n,l)=>n+l.length,0) + snapshot.inventory.n) + 8))});
    this.options.policy = policy;
    this.deliberate = policy !== 'long';
    this.terminal = policy === 'terminal';
    if (['resource','terminal','seeded'].includes(policy)) {
      const base = Math.max(1, features(this.root).weighted);
      this.evaluate = s => {
        const f = features(s);
        return f.clear ? 1 : .9 * (1 - f.weighted/base) + .08 * Math.min(s.cap,f.black)/base;
      };
      this.best.score = this.evaluate(this.root);
    }
    this.incumbentOrigin = 'root';
    if (policy === 'seeded') {
      // One separately reported deterministic greedy trajectory, not tree work.
      this.seedGreedy();
    }
  }
  choices(s, output = []) {
    actions(s, output);
    if (!this.deliberate || !s.inv) return output;
    let p=0; const tails=[];
    for (let i=0;i<20;i++) {p+=s.lengths[i];tails[i]=s.lengths[i] ? s.board[p-1] : 0;}
    let n=0;
    for (const move of output) if (!(move&1) || tails[move>>1]===s.ic) output[n++]=move;
    output.length=n; return output;
  }
  seedGreedy() {
    const s=clone(this.root), seen=new Set([key(s)]), moves=[]; let cost=0;
    for(let depth=0;depth<this.options.horizon && (s.size || s.inv);depth++) {
      let chosen=-1, best=-Infinity;
      for(const move of this.choices(s)) {
        const t=copyInto(this.candidate,s), travel=apply(t,move);
        if(seen.has(key(t))) continue;
        const value=this.evaluate(t)-travel*1e-6;
        if(value>best) {best=value;chosen=move;}
      }
      if(chosen<0) break;
      cost+=apply(s,chosen);moves.push(chosen);seen.add(key(s));this.consider(s,moves,cost);
    }
    this.incumbentOrigin = this.best.macros.length ? 'greedy-seed' : 'root';
    this.greedyRemaining = features(this.best.state).remaining;
  }
  iteration() {
    const s=copyInto(this.working,this.root), path=[0], seen=new Set([key(s)]), moves=[];
    let index=0,cost=0,utility=this.evaluate(s), stopped=false;
    const step=move=>{
      cost+=apply(s,move);this.transitions++;moves.push(move);
      const k=key(s);
      if(seen.has(k)) {this.cycles++;stopped=true;return;}
      seen.add(k);
      const old=this.best;
      const score=this.consider(s,moves,cost);
      if(this.best!==old) this.incumbentOrigin='mcts';
      utility=this.terminal ? score : Math.max(utility,score);
    };
    while(moves.length<this.options.horizon && (s.size || s.inv)) {
      const n=this.nodes[index];n.untried??=this.choices(s);
      if(n.untried.length && this.nodes.length<this.options.maxNodes) {
        const pick=Math.floor(this.random()*n.untried.length), move=n.untried[pick];
        n.untried[pick]=n.untried.at(-1);n.untried.pop();step(move);
        const child=this.nodes.length;this.nodes.push(this.node(move));n.children.push(child);path.push(child);
        const k=key(s,true);if(this.keys.has(k))this.duplicates++;else this.keys.add(k);
        break;
      }
      if(!n.children.length) break;
      let chosen=-1,best=-Infinity;
      for(const child of n.children) {
        const c=this.nodes[child],uct=c.total/c.visits+this.options.exploration*Math.sqrt(Math.log(n.visits+1)/c.visits);
        if(uct>best){best=uct;chosen=child;}
      }
      index=chosen;path.push(index);step(this.nodes[index].move);if(stopped)break;
    }
    while(!stopped && moves.length<this.options.horizon && (s.size || s.inv)) {
      const available=this.choices(s,this.available);if(!available.length)break;
      let move=available[Math.floor(this.random()*available.length)];
      if(this.random()>=(this.deliberate ? .1 : .3)) {
        let best=-Infinity;
        const count=Math.min(this.deliberate ? 10 : 6,available.length);
        for(let j=0;j<count;j++) {
          // Deliberate policy samples without replacement, retaining legacy order elsewhere.
          const pick=this.deliberate ? j+Math.floor(this.random()*(available.length-j)) : Math.floor(this.random()*available.length);
          if(this.deliberate) [available[j],available[pick]]=[available[pick],available[j]];
          const candidate=available[this.deliberate ? j : pick],t=copyInto(this.candidate,s);
          const travel=apply(t,candidate);if(seen.has(key(t)))continue;
          const value=this.evaluate(t)-travel*1e-6;
          if(value>best){best=value;move=candidate;}
        }
      }
      step(move);
    }
    for(const i of path){const n=this.nodes[i];n.visits++;n.total+=utility;}
    this.iterations++;
  }
  result(...args) {
    const origin=this.options.maxNodes===1 && this.incumbentOrigin==='mcts' ? 'rollout-restart' : this.incumbentOrigin;
    return {...super.result(...args),incumbentOrigin:origin,greedyRemaining:this.greedyRemaining??null};
  }
}
