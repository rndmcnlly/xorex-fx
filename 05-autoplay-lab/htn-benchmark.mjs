import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {LESSONS,lessonSnapshot,audit} from './curriculum.mjs';
import {heldouts} from './htn-cases.mjs';
import {planHTN} from './htn.mjs';
import {Search} from './search.mjs';
import {fixture} from './fixtures.mjs';
const budgetMs=Number(process.argv[2]||150),dir=new URL('./generated/',import.meta.url);
const prefix=process.argv[3]||'htn';
mkdirSync(dir,{recursive:true});
function measure(snapshot,policy,seed) {
  const started=performance.now();let result;
  if(policy==='htn')result=planHTN(snapshot,{},budgetMs);
  else {
    const s=new Search(snapshot,{policy:'resource',seed,...(policy==='restarts'?{maxNodes:1}:{})});
    do{s.run(1);}while(performance.now()-started<budgetMs);
    result=s.result(null,{budgetMs});
  }
  const elapsedMs=performance.now()-started,replay=audit(snapshot,result.plan);
  assert.deepEqual(replay.endSnapshot,result.endSnapshot);
  assert.equal(replay.endSnapshot.frames,snapshot.frames);
  return {result,outcome:{clear:replay.clear,remaining:result.remaining,black:result.blackRemaining,
    board:replay.endSnapshot.lanes.flat().length,held:replay.endSnapshot.inventory.n,
    arrows:result.plan.length,macros:result.macros.length,charge:replay.endSnapshot.capacitor.n,
    groups:replay.groups,shots:replay.shots,budgetMs,elapsedMs}};
}
const cases=heldouts();
const hold=cases.map(c=>({...c,...measure(c.snapshot,'htn',0)}));
writeFileSync(new URL(`${prefix}-heldout.json`,dir),JSON.stringify(hold,null,2));
// Training templates remain labeled training, never counted as novel holdouts.
const compare=[...LESSONS.map(l=>({id:l.id,kind:'training',snapshot:lessonSnapshot(l.id)})),
  ...cases.filter(c=>c.kind==='new-resource-layout'&& /\/(0|1)$/.test(c.id)),
  ...[87,31415].map(seed=>({id:`natural/${seed}`,kind:'new-natural',snapshot:fixture('natural',seed)}))];
const rows=[];
for(const c of compare) {
  const warm=new Search(c.snapshot,{policy:'resource',seed:1});warm.run(10);
  for(const policy of ['htn','resource','restarts'])for(const seed of [37,53,71])for(let repeat=0;repeat<2;repeat++)
    rows.push({id:c.id,kind:c.kind,policy,seed,repeat,snapshot:c.snapshot,...measure(c.snapshot,policy,seed)});
}
writeFileSync(new URL(`${prefix}-comparison.json`,dir),JSON.stringify(rows,null,2));
const summary={budgetMs,heldout:Object.fromEntries(['transformed','new-resource-layout','random-order'].map(kind=>{
  const r=hold.filter(c=>c.kind===kind);return [kind,{clears:r.filter(c=>c.outcome.clear).length,total:r.length,
    failures:r.filter(c=>!c.outcome.clear).map(c=>({id:c.id,...c.outcome,reason:c.result.reason}))}];})),
  comparison:compare.map(c=>({id:c.id,kind:c.kind,policies:Object.fromEntries(['htn','resource','restarts'].map(policy=>{
    const r=rows.filter(r=>r.id===c.id&&r.policy===policy),median=key=>{
      const a=r.map(r=>r.outcome[key]).sort((a,b)=>a-b);return (a[2]+a[3])/2;};
    return [policy,{clears:r.filter(r=>r.outcome.clear).length,total:r.length,remaining:median('remaining'),
      black:median('black'),arrows:median('arrows'),ms:median('elapsedMs')}];}))}))};
writeFileSync(new URL(`${prefix}-summary.json`,dir),JSON.stringify(summary,null,2));
console.log(JSON.stringify({budgetMs,comparisonRows:rows.length,heldout:Object.fromEntries(
  Object.entries(summary.heldout).map(([k,v])=>[k,`${v.clears}/${v.total}`])),summaryFile:`${prefix}-summary.json`},null,2));
