// Offline evidence extraction only. Does not run or seed a planner.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {LESSONS,lessonSnapshot,witness,audit,restrictedReachability} from './curriculum.mjs';
import {canonicalPlan} from './curriculum-witnesses.mjs';
import {outcome} from './tuning.mjs';
const benchmark=JSON.parse(readFileSync(new URL('./generated/curriculum-benchmark.json',import.meta.url)));
const witnesses=LESSONS.map(l=>{
  const snapshot=lessonSnapshot(l.id),w=witness(l.id),trace=audit(snapshot,w.plan);
  assert.deepEqual(w.plan,canonicalPlan(l.id));assert.ok(trace.clear);
  return {lesson:l,snapshot,...w,trace};
});
const plans=benchmark.rows.map(row=>{
  const snapshot=lessonSnapshot(row.lesson),checked=outcome(snapshot,row.result),trace=audit(snapshot,row.result.plan);
  assert.equal(checked.clear,row.clear);assert.equal(checked.remaining,row.remaining);
  assert.equal(trace.endSnapshot.frames,snapshot.frames);
  return {lesson:row.lesson,policy:row.policy,seed:row.seed,...checked,
    shots:trace.shots,whiteBonusGroups:trace.groups,chargeAdded:trace.chargeAdded,discarded:trace.discarded};
});
assert.equal(plans.length,48);
const hashes=Object.fromEntries(['curriculum.mjs','curriculum-witnesses.mjs','curriculum.test.mjs',
  'search.mjs','legacy-search.mjs','sim.mjs','app.mjs','index.html'].map(name=>
  [name,createHash('sha256').update(readFileSync(new URL(name,import.meta.url))).digest('hex')]));
mkdirSync(new URL('./generated/',import.meta.url),{recursive:true});
writeFileSync(new URL('./generated/curriculum-verification.json',import.meta.url),JSON.stringify({
  hashes,witnesses,plans,noReplaceProof:restrictedReachability(lessonSnapshot('06-park'),{noReplace:true})},null,2)+'\n');
console.log(`${witnesses.length} canonical witnesses, ${plans.length} benchmark plans verified; charge and white-group traces exported.`);
