// Independent accepted-model replay of every preserved experimental plan.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {act} from '../03-svg-demake/model.mjs';
import {pack,actions,primitive,features,fingerprint,expand} from './sim.mjs';
const here=new URL('./',import.meta.url),dir=new URL('./generated/',import.meta.url);
let replayed=0,arrows=0;
const files=['htn-round-1.json','htn-round-2.json','htn-heldout.json','htn-comparison.json',
  'htn-final-heldout.json','htn-final-comparison.json'];
for(const file of files) {
  const path=new URL(file,dir);if(!existsSync(path))continue;
  for(const row of JSON.parse(readFileSync(path))) {
    const {snapshot,result}=row,s=structuredClone(snapshot),p=pack(snapshot);
    assert.equal(result.sourceFingerprint,fingerprint(snapshot));
    assert.deepEqual(result.plan,expand(snapshot.pos,result.macros));
    for(const a of result.plan) {
      assert.ok(['left','right','down','up'].includes(a));
      if(a==='left')assert.ok(s.pos>0);if(a==='right')assert.ok(s.pos<19);
      if(a==='down'||a==='up')assert.ok(actions(p).includes(s.pos*2+Number(a==='up')));
      act(s,a);primitive(p,a);arrows++;
    }
    assert.deepEqual(s,result.endSnapshot);assert.equal(s.frames,snapshot.frames);
    const f=features(p);assert.equal(f.remaining,result.remaining);assert.equal(f.black,result.blackRemaining);
    assert.equal(f.clear,result.status==='clear');replayed++;
  }
}
const hash=name=>createHash('sha256').update(readFileSync(new URL(name,here))).digest('hex');
const old=JSON.parse(readFileSync(new URL('tuning-verification.json',dir))).finalSourceHashes;
for(const name of ['sim.mjs','legacy-search.mjs','search.mjs','worker.mjs'])assert.equal(hash(name),old[name],`${name} changed`);
const report={replayed,arrows,unchanged:['sim.mjs','legacy-search.mjs','search.mjs','worker.mjs'],
  sourceHashes:Object.fromEntries(['htn.mjs','htn-domain.mjs','htn-worker.mjs','app.mjs','index.html',
    'sim.mjs','legacy-search.mjs','search.mjs','worker.mjs'].map(name=>[name,hash(name)]))};
writeFileSync(new URL('htn-verification.json',dir),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
