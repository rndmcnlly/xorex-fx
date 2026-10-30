// Shared, fixed-work Node and real Worker throughput protocol. No policy changes.
import {fixture} from './fixtures.mjs';
import * as sim from './sim.mjs';
import {Search} from './legacy-search.mjs';

export function cases() {
  const heavy = fixture('natural', 731);
  // Static held-out board: 240 gems, mixed tails and buried whites/black.
  heavy.lanes = Array.from({length:20}, (_,lane) => Array.from({length:12}, (_,i) =>
    sim.NAMES[1 + ((lane * 13 + i * 5 + (i >> 1)) % 7)]));
  heavy.capacitor = {color:'red', n:7};
  return [ ['seeded', fixture('seeded')], ['natural', fixture('natural')], ['heavy', heavy] ];
}
export const options = seed => ({seed, horizon:48, exploration:.65, maxNodes:12000});
export const iterations = 500;
export const median = a => a.slice().sort((a,b)=>a-b)[a.length >> 1];
export function signature(search) {
  const r = search.result();
  for (const k of ['activeMs','elapsedMs','iterationsPerSecond','wallIterationsPerSecond']) delete r[k];
  return {result:r, nodes:search.nodes, nextRandom:search.random()};
}
export function nodeSuite() {
  const rows = [], micro = [];
  for (const [name,snapshot] of cases()) {
    new Search(snapshot,options(11)).run(150); // Untimed per-case warmup.
    for (let batch=0;batch<3;batch++) for (const seed of [11,22]) {
      const start=performance.now(), search=new Search(snapshot,options(seed));
      search.run(iterations);
      const elapsedMs=performance.now()-start;
      rows.push({name,batch,seed,elapsedMs,activeMs:search.activeMs,signature:signature(search)});
    }
    const s=sim.pack(snapshot), moves=sim.actions(s), evaluate=sim.evaluator(s);
    const operations={clone:()=>sim.clone(s), key:()=>sim.key(s), actions:()=>sim.actions(s),
      transition:()=>{const t=sim.clone(s);sim.apply(t,moves[0]);return t;},
      candidate:()=>{const t=sim.clone(s);sim.apply(t,moves[0]);return [sim.key(t),evaluate(t)];}};
    for (const [operation,fn] of Object.entries(operations)) {
      let sink;
      for(let i=0;i<2000;i++) sink=fn();
      const samples=[];
      for(let batch=0;batch<5;batch++) {
        const start=performance.now();for(let i=0;i<20000;i++) sink=fn();
        samples.push(performance.now()-start);
      }
      micro.push({name,operation,count:20000,samplesMs:samples,medianMs:median(samples),sinkPresent:sink!==undefined});
    }
  }
  return {protocol:{iterations,seeds:[11,22],batches:3,warmupIterations:150,horizon:48},rows,micro};
}
export async function browserSuite() {
  const rows=[], workers=new Set();
  const run=(worker,snapshot,seed,jobID,count) => new Promise((resolve,reject)=>{
    const start=performance.now();
    worker.onerror=reject;
    worker.onmessage=({data})=>{
      if(data.type==='error') reject(Error(data.message));
      if(data.type==='result') resolve({roundTripMs:performance.now()-start,...data});
    };
    worker.postMessage({type:'search',snapshot,options:{...options(seed),policy:'legacy'},iterations:count,budgetMs:60000,jobID});
  });
  try {
    for(const [name,snapshot] of cases()) for(let batch=0;batch<3;batch++) for(const seed of [11,22]) {
      const w=new Worker('./worker.mjs',{type:'module'}); workers.add(w);
      await run(w,snapshot,seed,'warmup',150);
      const r=await run(w,snapshot,seed,`${name}-${batch}-${seed}`,iterations);
      if(r.iterations!==iterations) throw Error('Time budget replaced fixed work');
      rows.push({name,batch,seed,...r});w.terminate();workers.delete(w);
    }
    return {protocol:{iterations,seeds:[11,22],batches:3,warmupIterations:150,horizon:48,
      startup:'module/worker startup excluded by preceding warmup; roundTrip includes message transport',
      active:'excludes yield and scheduling; elapsed includes yields, excludes constructor'},rows};
  } finally {for(const w of workers) w.terminate();}
}
