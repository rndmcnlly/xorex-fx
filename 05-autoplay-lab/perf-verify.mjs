// Run after archiving the original sources, as described in THROUGHPUT.md.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Search,baseline} from './legacy-search.mjs';
import {Search as Before,baseline as baselineBefore} from './generated/perf-before-src/search.mjs';
import {cases,options,signature} from './perf.mjs';
import {fixture,FIXTURES} from './fixtures.mjs';
const rows=[];
for(const [name,snapshot] of [...Object.keys(FIXTURES).map(n=>[n,fixture(n)]),...cases()]) {
  for(const seed of [11,22]) {
    const o=options(seed), a=new Before(snapshot,o), b=new Search(snapshot,o);
    const drawsA=[],drawsB=[],ra=a.random,rb=b.random;
    a.random=()=>{const r=ra();drawsA.push(r);return r;};
    b.random=()=>{const r=rb();drawsB.push(r);return r;};
    for(let i=0;i<10;i++) {
      a.run(50);b.run(50);
      assert.deepEqual(signature(b),signature(a),`${name}/${seed} at ${(i+1)*50}`);
      assert.deepEqual(drawsB,drawsA,'PRNG order');
    }
    for(const kind of ['random','greedy']) assert.deepEqual(baseline(snapshot,kind,o),baselineBefore(snapshot,kind,o));
    rows.push({name,seed,iterations:500,checkpoints:10,randomDraws:drawsA.length,exactTreeAndOutput:true});
  }
}
for(const maxNodes of [1,30,600]) {
  const snapshot=fixture('natural'),o={...options(17),maxNodes,horizon:200};
  assert.deepEqual(signature(new Search(snapshot,o).run(100)),signature(new Before(snapshot,o).run(100)));
}
writeFileSync(new URL('./generated/perf-parity.json',import.meta.url),JSON.stringify({rows,capAndHorizonCases:3},null,2)+'\n');
console.log(`Exact parity: ${rows.length} searches, 200 checkpoints, all tree nodes, outputs and PRNG draws; 40 baselines; 3 cap/horizon cases`);
