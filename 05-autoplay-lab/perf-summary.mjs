import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const load=name=>JSON.parse(readFileSync(new URL(`./generated/${name}`,import.meta.url)));
const report={};
for(const runtime of ['node','browser']) {
  const before=load(`perf-before-${runtime}.json`),after=load(`perf-after-${runtime}.json`);
  const rows=[];
  for(const name of ['seeded','natural','heavy']) {
    const a=before.rows.filter(r=>r.name===name),b=after.rows.filter(r=>r.name===name);
    for(let i=0;i<a.length;i++) {
      if(runtime==='node') assert.deepEqual(a[i].signature,b[i].signature);
      else for(const key of ['plan','macros','score','iterations','nodes','transitions','cycleStops','duplicateExpansions','uniqueTreeStates','endSnapshot'])
        assert.deepEqual(a[i][key],b[i][key]);
    }
    for(const field of runtime==='node'?['activeMs','elapsedMs']:['activeMs','elapsedMs','roundTripMs']) {
      // Six measurements: use arithmetic average of middle two, not upper median.
      const mid=xs=>{const s=xs.slice().sort((a,b)=>a-b);return (s[2]+s[3])/2;};
      const beforeMs=mid(a.map(r=>r[field])),afterMs=mid(b.map(r=>r[field]));
      rows.push({name,field,beforeMs,afterMs,speedup:beforeMs/afterMs});
    }
  }
  report[runtime]={fixedWorkParity:true,rows};
  if(runtime==='node') report.micro=before.micro.map((a,i)=>({name:a.name,operation:a.operation,
    beforeMs:a.medianMs,afterMs:after.micro[i].medianMs,speedup:a.medianMs/after.micro[i].medianMs}));
}
writeFileSync(new URL('./generated/perf-summary.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
