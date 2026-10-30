// Holdout diagnostic only: no oracle imports, no policy tuning or witness seeding.
import {mkdirSync,writeFileSync} from 'node:fs';
import {LESSONS,lessonSnapshot} from './curriculum.mjs';
import {nodeRun} from './tuning.mjs';
const budget=Number(process.argv[2]??500),rows=[];
for(const l of LESSONS)for(const policy of ['legacy','resource','restarts']) {
  nodeRun(lessonSnapshot(l.id),policy,37,'iterations',20);
  for(const seed of [37,53])rows.push({lesson:l.id,policy,seed,...nodeRun(lessonSnapshot(l.id),policy,seed,'wall',budget)});
}
const summary=LESSONS.map(l=>({lesson:l.id,policies:Object.fromEntries(['legacy','resource','restarts'].map(policy=>{
  const rs=rows.filter(r=>r.lesson===l.id&&r.policy===policy);
  return [policy,{clears:rs.filter(r=>r.clear).length,runs:rs.length,remaining:rs.map(r=>r.remaining),black:rs.map(r=>r.black),charge:rs.map(r=>r.charge)}];
}))}));
mkdirSync(new URL('./generated/',import.meta.url),{recursive:true});
writeFileSync(new URL('./generated/curriculum-benchmark.json',import.meta.url),JSON.stringify({budget,environment:{node:process.version,platform:process.platform,arch:process.arch},seeds:[37,53],rows,summary},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
