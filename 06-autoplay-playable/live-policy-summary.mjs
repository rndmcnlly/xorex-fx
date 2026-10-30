// Independent outcome summary and pairing checks. No weighted policy score.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const dir=new URL('./generated/',import.meta.url), rows=[];
for(const split of ['train','heldout']){
  const load=async label=>(await readFile(new URL(`live-policy-${label}-${split}.jsonl`,dir),'utf8')).trim().split('\n').map(JSON.parse);
  const before=await load('final'),after=await load('simplified');
  for(let i=0;i<before.length;i++){
    assert.deepEqual(after[i].final,before[i].final);
    assert.deepEqual(after[i].jobs.map(j=>j.result.plan),before[i].jobs.map(j=>j.result.plan));
    assert.deepEqual(after[i].trace,before[i].trace);
  }
}
for(const split of ['train','heldout']){
  const baseline=new Map();
  for(const label of split==='train'?['before','r1','r2','final']:['before','final']){
    const text=await readFile(new URL(`live-policy-${label}-${split}.jsonl`,dir),'utf8');
    for(const line of text.trim().split('\n')){
      const r=JSON.parse(line);
      if(label==='before')baseline.set(r.seed,r);
      else {const b=baseline.get(r.seed);assert.equal(r.arrivalHash,b.arrivalHash);assert.deepEqual(r.initial,b.initial);assert.equal(r.seconds,b.seconds);}
      for(const e of r.trace.filter(e=>e.type==='action')){assert.ok(e.postconditionMatches);assert.equal(e.expectedGuard,e.actualGuard);}
      rows.push({label,split,seed:r.seed,mismatches:r.mismatches,lostCharge:r.lostCharge,emptyShots:r.emptyShots,
        blackKills:r.blackKills,amplifications:r.amplifications,amplificationGain:r.amplificationGain,productive:r.productive,
        moves:r.moves,actions:r.actions,nonActionSlots:r.seconds*12-r.actions,maxHeight:r.maxHeight,remaining:r.remaining,
        blackLoad:r.blackLoad,lost:r.lost,censored:r.censored,maxPlanningMs:r.maxPlanningMs,invalidations:r.controller.invalidated});
    }
  }
}
const groups=[];
for(const split of ['train','heldout'])for(const label of split==='train'?['before','r1','r2','final']:['before','final']){
  const subset=rows.filter(r=>r.split===split&&r.label===label),sum=field=>subset.reduce((n,r)=>n+r[field],0);
  groups.push({split,label,episodes:subset.length,mismatches:sum('mismatches'),lostCharge:sum('lostCharge'),emptyShots:sum('emptyShots'),
    blackKills:sum('blackKills'),amplifications:sum('amplifications'),amplificationGain:sum('amplificationGain'),productive:sum('productive'),
    actions:sum('actions'),nonActionSlots:sum('nonActionSlots'),remaining:sum('remaining'),blackLoad:sum('blackLoad'),
    maxHeight:Math.max(...subset.map(r=>r.maxHeight)),deaths:sum('lost'),censored:sum('censored')});
}
await writeFile(new URL('live-policy-summary.json',dir),JSON.stringify({pairingVerified:true,simplificationPlansAndActionsIdentical:true,rows,groups},null,2));
await writeFile(new URL('live-policy-summary.csv',dir),[Object.keys(rows[0]).join(','),...rows.map(r=>Object.values(r).join(','))].join('\n')+'\n');
console.log(JSON.stringify(groups,null,2));
