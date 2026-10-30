import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act} from '../03-svg-demake/model.mjs';
import {LESSONS,lessonSnapshot} from './curriculum.mjs';
import {HTN,planHTN} from './htn.mjs';
import {heldouts} from './htn-cases.mjs';
import {pack,actions,primitive,features} from './sim.mjs';
export function verify(snapshot,r) {
  const s=structuredClone(snapshot), p=pack(snapshot);
  for(const arrow of r.plan) {
    if(arrow==='left')assert.ok(s.pos>0);
    if(arrow==='right')assert.ok(s.pos<19);
    if(arrow==='up'||arrow==='down')assert.ok(actions(p).includes(p.pos*2+Number(arrow==='up')),'productive legal operator');
    act(s,arrow);primitive(p,arrow);
  }
  assert.deepEqual(s,r.endSnapshot);assert.equal(s.frames,snapshot.frames);
  assert.equal(features(p).remaining,r.remaining);assert.equal(features(p).black,r.blackRemaining);
  assert.equal(features(p).clear,r.status==='clear');return s;
}
test('HTN curriculum: immediate snapshot-only methods, real replay, 191 individual bastion shots',()=>{
  for(const l of LESSONS){const s=lessonSnapshot(l.id),r=planHTN(s,{},500);verify(s,r);assert.equal(r.status,'clear',l.id);
    if(l.id==='08-bastion'){assert.equal(r.macros.filter(m=>m&1).length,195);assert.ok(r.macros.length>=201);}
    if(l.id==='07-bootstrap')assert.ok(r.rejected.some(e=>e.reason.includes('partial white')));
    if(l.id==='06-park')assert.ok(r.trace.some(e=>e.method.startsWith('ParkInventory')));
  }
});
test('128 held-out transformed, new resource/blocker and random-order inputs: every prefix replays',()=>{
  const rows=heldouts();assert.equal(rows.length,128);
  for(const row of rows){const before=structuredClone(row.snapshot);const r=planHTN(row.snapshot,{maxNodes:3000},100);
    verify(row.snapshot,r);assert.deepEqual(row.snapshot,before);
    if(row.kind==='transformed')assert.equal(r.status,'clear',row.id);
  }
});
test('bounded failure returns a real partial, clear is never inferred from ammo or bounds',()=>{
  const s=lessonSnapshot('08-bastion');
  for(const options of [{maxNodes:1},{maxDepth:2},{maxActions:3},{maxFrontier:1,maxNodes:20}]){
    const r=planHTN(s,options,100);verify(s,r);assert.notEqual(r.status,'clear');assert.ok(r.reason);}
  s.lanes=s.lanes.map(l=>l.filter(c=>c==='black'));s.capacitor={color:null,n:0};
  const r=planHTN(s);verify(s,r);assert.equal(r.plan.length,0);assert.notEqual(r.status,'clear');
  const large=structuredClone(s);large.lanes=Array.from({length:20},()=>[]);
  large.lanes[0]=Array(5000).fill('black');large.capacitor={color:'red',n:5000};
  const timed=planHTN(large,{maxNodes:100000,maxDepth:10000},1);
  verify(large,timed);assert.equal(timed.reason,'time-budget');assert.notEqual(timed.status,'clear');
});
test('rolling state, arrays, tasks, traces and exports do not alias; no gameplay RNG consumed',()=>{
  const s=lessonSnapshot('07-bootstrap'),original=structuredClone(s),p=new HTN(s);
  s.lanes[0].length=0;s.capacitor.n=999;
  p.run(15);const a=p.result(),frozen=structuredClone(a);a.endSnapshot.lanes[0].push('pink');a.macros.push(39);a.trace.length=0;
  assert.deepEqual(p.result().plan,frozen.plan);assert.deepEqual(p.source,original);
  const rng=Math.random;Math.random=()=>{throw Error('game RNG must not run');};
  try{while(!p.done)p.run(50);verify(original,p.result());}finally{Math.random=rng;}
  const one=planHTN(original),two=planHTN(original);assert.deepEqual(one.plan,two.plan);assert.deepEqual(one.trace,two.trace);
});
test('runtime import boundary: no fixtures, curriculum, witnesses, ticks or UCT relabeling',()=>{
  for(const name of ['htn.mjs','htn-domain.mjs','htn-worker.mjs']){
    const source=readFileSync(new URL(name,import.meta.url),'utf8');
    assert.doesNotMatch(source,/from ['"].*(curriculum|fixtures|search|cases)/);
    assert.doesNotMatch(source,/\btick\s*\(/);
  }
});
test('cap asymmetry and a pinned incomplete-domain counterexample, not a fake unsolvability claim',()=>{
  const s=lessonSnapshot('01-activate');s.lanes[1]=[];s.inventory={color:'white',n:1};
  const r=planHTN(s);verify(s,r);assert.notEqual(r.status,'clear');
  // Independent executable counterexample: parking is also useful with ZERO cap.
  // The locked domain permits parking only when charged black work remains.
  const legal=['right','up','left','down','down','right','down','down','right',...Array(6).fill('up')];
  const end=structuredClone(s);for(const a of legal)act(end,a);
  assert.equal(end.inventory.n,0);assert.ok(end.lanes.every(l=>!l.length));
  const white=lessonSnapshot('02-run');white.capacitor.color='white';
  const w=planHTN(white);verify(white,w);assert.notEqual(w.status,'clear');
  assert.ok(w.endSnapshot.capacitor.n<=3,'white cap never awards a white bonus');
});
test('explicit bootstrap-now alternative preserves a later group when merge-now cannot fund the board',()=>{
  const s=lessonSnapshot('01-activate');s.lanes=Array.from({length:20},()=>[]);
  s.lanes[0]=['white'];s.lanes[1]=['white'];
  s.lanes[2]=['white','white',...Array(4).fill('black')];s.lanes[3]=Array(41).fill('black');
  s.capacitor={color:'red',n:1};
  const r=planHTN(s);verify(s,r);assert.equal(r.status,'clear');
  assert.ok(r.trace.some(e=>e.method.startsWith('BootstrapNow')));
  assert.ok(r.trace.some(e=>e.method.startsWith('Expose@')&&e.estimate.reserve===2));
  assert.ok(r.rejected.some(e=>e.estimate?.whiteGroup===2&&e.estimate.afterOptimisticShots===41));
});
