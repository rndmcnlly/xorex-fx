import test from 'node:test';
import assert from 'node:assert/strict';
import {LESSONS,lessonSnapshot,witness,audit,ammoUpperBound,restrictedReachability} from './curriculum.mjs';
import {pack,actions} from './sim.mjs';
import {Search} from './search.mjs';
import {canonicalPlan} from './curriculum-witnesses.mjs';

test('eight authored twenty-lane witnesses clear with empty inventory and exact ammo accounting',()=>{
  for(const [i,l] of LESSONS.entries()) {
    const s=lessonSnapshot(l.id),before=structuredClone(s),w=witness(l.id),a=audit(s,w.plan);
    assert.deepEqual(w.plan,canonicalPlan(l.id),l.id);
    assert.equal(s.lanes.length,20);assert.equal(a.clear,true,l.id);
    assert.deepEqual(a.endSnapshot,w.endSnapshot);assert.deepEqual(s,before);
    assert.deepEqual(a.groups,l.groups,l.id);assert.equal(a.shots,l.shots,l.id);
    assert.equal(s.capacitor.n+a.chargeAdded,l.charge,l.id);
    assert.equal(a.endSnapshot.capacitor.n,l.remaining,l.id);
    assert.equal(l.charge-a.shots-a.discarded,l.remaining,l.id);
    assert.equal(a.endSnapshot.frames,s.frames);assert.equal(a.endSnapshot.lost,false);
    assert.ok(a.maxLane<=14,l.id);assert.equal(l.prerequisite,i?LESSONS[i-1].id:null);
    assert.ok(w.plan.every(a=>['left','right','up','down'].includes(a)));
    // Exported fixtures, plans, metadata and final stores never alias one another.
    s.lanes[0].push('pink');s.capacitor.n=999;w.plan.push('left');w.endSnapshot.capacitor.n=999;
    assert.deepEqual(lessonSnapshot(l.id),before);assert.equal(witness(l.id).endSnapshot.capacitor.n,l.remaining);
  }
});
test('conservation proves the stated mandatory white group sizes, not perceived difficulty',()=>{
  for(const id of ['03-relocate','04-three','07-bootstrap','08-bastion']) {
    const l=LESSONS.find(l=>l.id===id),s=lessonSnapshot(id),black=s.lanes.flat().filter(c=>c==='black').length;
    assert.ok(ammoUpperBound(s,l.requiredGroup-1)<black,id);
    assert.ok(ammoUpperBound(s,l.requiredGroup)>=black,id);
    const unmerged=s.capacitor.n+s.lanes.flat().filter(c=>c!=='white'&&c!=='black').length+
      s.lanes.reduce((sum,lane)=>{let run=0,value=0;for(const c of [...lane,'end']) {if(c==='white')run++;else{value+=5*run*run;run=0;}}return sum+value;},0);
    assert.equal(unmerged,l.noMergeUpper,id);assert.ok(unmerged<black,id);
  }
});
test('prerequisite milestones are mechanically meaningful',()=>{
  const first=audit(lessonSnapshot('01-activate'),witness('01-activate').plan);
  assert.equal(first.events.find(e=>e.cap.color!==null).cap.color,'red');
  for(const id of ['05-uncover','07-bootstrap']) {
    const a=audit(lessonSnapshot(id),witness(id).plan);
    assert.equal(a.events[0].arrow,'up');assert.deepEqual(a.events[0].sounds,['fire']);
    assert.ok(a.events.find(e=>e.sounds.includes('gather')&&e.held.color==='white'));
    for(const e of a.events.filter(e=>e.arrow==='down'&&e.held.color==='white'))assert.equal(e.cap.color,'red');
  }
  const a=audit(lessonSnapshot('06-park'),witness('06-park').plan);
  assert.deepEqual(a.events[0].sounds,['synth']);assert.deepEqual(a.events[1].sounds,['fire']);
  assert.equal(a.discarded,1); // Cleanup intentionally discards the last red charge.
});
test('small exact no-replacement proof and unchanged tuned-filter counterexample',()=>{
  const s=lessonSnapshot('06-park');
  const proof=restrictedReachability(s,{noReplace:true,maxStates:5000});
  assert.deepEqual({clear:proof.clear,exhausted:proof.exhausted},{clear:false,exhausted:true});
  assert.ok(proof.states<5000);
  assert.ok(actions(pack(s)).some(a=>a===7)); // Up on canonical empty lane 3 is legal.
  const r=new Search(s,{policy:'resource',seed:37});r.run(100);
  assert.notEqual(r.result().status,'clear');
});
test('dense finale has an analytic macro-horizon obstruction',()=>{
  const w=witness('08-bastion');
  assert.equal(w.macros.length,201);
  // 191 shots, four gather/replace pairs, final gather/convert: 201 edges.
  // All seven whites must merge, so five initial runs require four joins.
  assert.equal(LESSONS.at(-1).shots+4*2+2,201);
});
