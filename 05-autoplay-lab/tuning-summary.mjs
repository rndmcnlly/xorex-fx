import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const median=a=>{const b=a.slice().sort((x,y)=>x-y);return (b[Math.floor((b.length-1)/2)]+b[Math.floor(b.length/2)])/2;};
const reports={};
for(const label of ['train-node','heldout-node','heldout-browser']) {
  const path=new URL(`./generated/tuning-${label}.json`,import.meta.url);if(!existsSync(path))continue;
  const {rows}=JSON.parse(readFileSync(path)),groups=new Map();
  for(const r of rows) {
    const k=JSON.stringify([r.name,r.mode,r.budget,r.policy]);
    if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);
  }
  reports[label]=[...groups.values()].map(g=>({name:g[0].name,mode:g[0].mode,budget:g[0].budget,policy:g[0].policy,
    n:g.length,clears:g.filter(r=>r.clear).length,remaining:median(g.map(r=>r.remaining)),
    remainingRange:[Math.min(...g.map(r=>r.remaining)),Math.max(...g.map(r=>r.remaining))],
    black:median(g.map(r=>r.black)),arrows:median(g.map(r=>r.arrows)),charge:median(g.map(r=>r.charge)),
    deadEnds:g.filter(r=>r.deadEnd).length,iterations:median(g.map(r=>r.result.iterations)),
    totalMs:median(g.map(r=>r.totalMs)),nodes:median(g.map(r=>r.result.nodes)),
    mctsIncumbents:g[0].policy==='restarts'?0:g.filter(r=>r.result.incumbentOrigin==='mcts').length,
    greedyRemaining:g[0].policy==='seeded'?median(g.map(r=>r.result.greedyRemaining)):null}));
}
writeFileSync(new URL('./generated/tuning-summary.json',import.meta.url),JSON.stringify(reports,null,2)+'\n');
for(const [label,groups]of Object.entries(reports)) {
  console.log(label);
  for(const r of groups)console.log(`${r.name} ${r.mode}/${r.budget} ${r.policy}: clear ${r.clears}/${r.n}, remaining ${r.remaining} [${r.remainingRange}], black ${r.black}, arrows ${r.arrows}, charge ${r.charge}, dead ${r.deadEnds}, iterations ${r.iterations}, ms ${r.totalMs.toFixed(1)}, originMCTS ${r.mctsIncumbents}`);
}
