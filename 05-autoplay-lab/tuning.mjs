// Shared Node/real-Worker protocol. Held-out cases must not be used for selection.
import {Search} from './search.mjs';
import {fixture} from './fixtures.mjs';
import {cases} from './perf.mjs';
import {act} from '../03-svg-demake/model.mjs';
import {pack,features,actions} from './sim.mjs';

export function boards(split) {
  return split==='train' ? [ ['seeded-2009',fixture('seeded',2009)],
    ['natural-2009',fixture('natural',2009)],['natural-731',fixture('natural',731)] ] :
    [['seeded-87',fixture('seeded',87)],['natural-87',fixture('natural',87)],
      ['natural-31415',fixture('natural',31415)],cases().find(([n])=>n==='heavy')];
}
export function outcome(snapshot,r) {
  const end=structuredClone(snapshot);for(const a of r.plan) {
    if(!['left','right','up','down'].includes(a))throw Error('Invalid arrow');act(end,a);
  }
  if(JSON.stringify(end)!==JSON.stringify(r.endSnapshot) || r.plan.length!==r.primitiveCost)throw Error('Replay mismatch');
  const s=pack(end),f=features(s);
  return {clear:f.clear,remaining:f.remaining,black:f.black,arrows:r.plan.length,
    charge:s.cap,deadEnd:!f.clear&&!actions(s).length,replayVerified:true};
}
export function settings(policy,seed) {
  return {policy:policy==='restarts'?'resource':policy,seed,
    maxNodes:policy==='restarts'?1:12000,...(policy==='legacy'?{horizon:48}:{})};
}
export function nodeRun(snapshot,policy,seed,mode,budget) {
  const start=performance.now(),search=new Search(snapshot,settings(policy,seed));
  if(mode==='iterations')search.run(budget);
  else do {search.run(1);}while(performance.now()-start<budget);
  const elapsed=performance.now()-start,r=search.result();
  return {mode,budget,totalMs:elapsed,...outcome(snapshot,r),result:r};
}
export async function workerSuite(split, policies=['legacy','resource','seeded','restarts']) {
  const rows=[],workers=new Set();
  try {
    for(const [name,snapshot] of boards(split))for(const policy of policies)for(let repeat=0;repeat<3;repeat++)for(const seed of [37,53]) {
      const w=new Worker('./worker.mjs',{type:'module'});workers.add(w);
      const run=(mode,budget)=>new Promise((resolve,reject)=>{
        const start=performance.now();w.onerror=reject;
        w.onmessage=({data:r})=>{
          if(r.type==='error')reject(Error(r.message));
          if(r.type==='result')resolve({mode,budget,totalMs:performance.now()-start,...outcome(snapshot,r),result:r});
        };
        w.postMessage({type:'search',jobID:`${name}-${policy}-${seed}-${mode}-${budget}`,snapshot,
          options:settings(policy,seed),budgetMs:mode==='iterations'?60000:budget,iterations:mode==='iterations'?budget:10000000});
      });
      await run('iterations',30); // Cold module/JIT startup excluded, reported explicitly.
      for(const [mode,budget] of [['iterations',500],['wall',500],['wall',1000]]) {
        rows.push({name,policy,repeat,seed,...await run(mode,budget)});
      }
      w.terminate();workers.delete(w);
    }
    return rows;
  } finally {for(const w of workers)w.terminate();}
}
