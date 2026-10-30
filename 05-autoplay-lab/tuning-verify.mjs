import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {boards,outcome} from './tuning.mjs';
const json=name=>JSON.parse(readFileSync(new URL(`./generated/${name}.json`,import.meta.url)));
const train=json('tuning-train-node'),node=json('tuning-heldout-node'),browser=json('tuning-heldout-browser');
let replayed=0,parity=0;
for(const [report,split]of [[train,'train'],[node,'heldout'],[browser,'heldout']]) {
  const snapshots=new Map(boards(split));
  for(const r of report.rows) {
    const f=outcome(snapshots.get(r.name),r.result);
    for(const k of Object.keys(f))assert.deepEqual(r[k],f[k]);replayed++;
  }
}
for(const r of browser.rows.filter(r=>r.mode==='iterations')) {
  const match=node.rows.find(n=>n.mode==='iterations'&&n.name===r.name&&n.policy===r.policy&&n.seed===r.seed&&n.repeat===r.repeat);
  assert.ok(match);
  for(const k of ['plan','macros','score','endSnapshot','remaining','blackRemaining','iterations','nodes','transitions','cycleStops','duplicateExpansions'])
    assert.deepEqual(r.result[k],match.result[k],`${r.name}/${r.policy}/${r.seed}: ${k}`);
  parity++;
}
const before=json('tuning-before-src/hashes');
const hash=name=>createHash('sha256').update(readFileSync(new URL(name,import.meta.url))).digest('hex');
assert.equal(hash('sim.mjs'),before['sim.mjs'],'simulator source must remain unchanged');
assert.equal(hash('legacy-search.mjs'),before['search.mjs'],'durable legacy must exactly preserve stage one');
const sources=['search.mjs','legacy-search.mjs','sim.mjs','worker.mjs','tuning.mjs','tuning-node.mjs',
  'tuning-browser.py','tuning-summary.mjs','tuning-verify.mjs','tuning.test.mjs','browser_check.py','app.mjs','index.html'];
const report={replayed,nodeWorkerFixedIterationParity:parity,simulatorUnchanged:true,legacySourceExact:true,
  finalSourceHashes:Object.fromEntries(sources.map(name=>[name,hash(name)])),
  note:'Final metadata-only correction labels cap-one incumbents rollout-restart; original measured reports are preserved.'};
writeFileSync(new URL('./generated/tuning-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
