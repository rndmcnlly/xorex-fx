import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {HTN} from '../05-autoplay-lab/htn.mjs';
import {act,createGame,seededRandom} from '../03-svg-demake/model.mjs';
import {classifyAction} from '../04-rendering-lab/motion-playable/feedback.mjs';
import {createController} from './controller.mjs';
import {cases,probe} from './live-policy-cases.mjs';
const plans=()=>Object.fromEntries(probe().map(r=>[r.name,r]));
test('live dependency plans independently replay, no dry shots, bounded tasks and deliberate exceptional loss',()=>{
  for(const {name,snapshot,result} of probe()){
    const s=structuredClone(snapshot);let mismatches=0;
    for(const command of result.plan){const before=structuredClone(s),events=act(s,command),f=classifyAction(before,s,command,events);
      assert.notEqual(f.kind,'dry-shot',name);
      if(f.kind==='mismatch'){mismatches++;assert.equal(name,'exceptionalDiscard');}
    }
    assert.deepEqual(s,result.endSnapshot,name);assert.equal(result.objective,'live-maintenance');
    assert.equal(result.reason,'live-task-boundary');assert.ok(result.nodes<200);
    assert.equal(mismatches,name==='exceptionalDiscard'?1:0);
  }
});
test('wrong held color preserves substantial charge; held white gets activation before bonus',()=>{
  const p=plans();assert.ok(p.largeChargeWrongHeld.result.endSnapshot.capacitor.n>=45);
  assert.ok(p.largeChargeWrongHeld.result.trace.some(e=>e.method==='StashThenUseCharge'));
  assert.ok(p.heldWhiteNeedsActivation.result.trace.some(e=>e.method==='ParkWhiteActivateRegather'&&e.estimate.added===20));
  assert.equal(p.heldWhiteNeedsActivation.result.endSnapshot.capacitor.n,19);
});
test('urgent black is addressed before distant white, without exhausting activation',()=>{
  const r=plans().urgentBlackBeforeDistantWhites.result;
  assert.equal(r.plan[0],'up');assert.equal(r.plan[1],'right');
  assert.ok(r.trace.some(e=>e.method==='RelieveImmediateBlackThreat'&&e.estimate.reserve===1));
  assert.equal(r.blackRemaining,0);
  assert.ok(r.trace.some(e=>e.estimate.whiteGroup===2&&e.estimate.added===20));
});
test('white-cap asymmetry, no-ammo plateau, explicit disposal reason and amount',()=>{
  const p=plans();assert.equal(p.whiteCapAsymmetry.result.endSnapshot.capacitor.color,'red');
  assert.equal(p.whiteCapAsymmetry.result.endSnapshot.capacitor.n,6);
  assert.deepEqual(p.noAmmoPlateau.result.plan,[]);assert.equal(p.noAmmoPlateau.result.outcome,'wait-for-observation');
  assert.equal(p.noAmmoPlateau.result.nodes,2);
  const discard=p.exceptionalDiscard.result.trace.find(e=>e.method==='ExceptionalDiscardHeld');
  assert.equal(discard.estimate.lossCharge,8);assert.equal(discard.estimate.lossHeld,1);assert.ok(discard.why.length>20);
});
test('default planner remains frozen, default playable requests live and diagnostics detached',()=>{
  const s=createGame(seededRandom(2009)),a=new HTN(s),b=new HTN(s,{profile:'frozen'});
  while(!a.done)a.run(100);while(!b.done)b.run(100);
  assert.deepEqual(a.result().plan,b.result().plan);assert.equal(a.result().objective,'frozen-full-clear');
  assert.equal(a.result().status,'clear');
  const sent=[];const c=createController({read:()=>s,perform:command=>act(s,command),send:m=>sent.push(m),cancel(){},now:()=>0});
  c.enable(true);c.pulse(0);assert.equal(sent[0].options.profile,'live');
  const p=new HTN(sent[0].snapshot,sent[0].options);while(!p.done)p.run(100);
  c.receive({...p.result(sent[0].jobID),type:'result'});
  const status=c.status();assert.equal(status.policy.objective,'live-maintenance');status.policy.decisions.length=0;
  assert.ok(c.status().policy.decisions.length>0);
});
test('live interrupted prefix is valid and frozen source/mechanics/worker files stay pinned',async()=>{
  const p=new HTN(cases.heldWhiteNeedsActivation,{profile:'live',maxNodes:4});while(!p.done)p.run();
  const r=p.result(),s=structuredClone(cases.heldWhiteNeedsActivation);
  for(const a of r.plan)act(s,a);assert.deepEqual(s,r.endSnapshot);assert.equal(r.reason,'node-budget');
  const hashes={
    '03-svg-demake/model.mjs':'d54f5cc99f90b05f3dd8a46325b6ed9ee72d7e52227b5411324a4542b3fc43d0',
    '05-autoplay-lab/sim.mjs':'5be302b69027561d2bf2a2a55917f01e172174458b1773f708e083f24f387ee3',
    '05-autoplay-lab/legacy-search.mjs':'0429e3010e3b53fee024ab59f1ef0198369deb2448526ff672a255ee3f32f656',
    '05-autoplay-lab/search.mjs':'8cea004e519eba4d384c6b8861db743d8b160f4a7fdc24158704a80e98c7e21f',
    '05-autoplay-lab/worker.mjs':'5ada741d8b34587fe2f3a4ec871b9bcbfd0a415b02c336a37f9adcbb181d190c',
    '05-autoplay-lab/htn-worker.mjs':'8690a1967a740cd94e4c410d9b7a1693c55a9424c981c8b5e137b5bf288e45c3',
    '05-autoplay-lab/htn-domain.mjs':'1bcee5e0f23652a22ac1324a8d3a52ff709c84d39d2bb25537609e2e36b732e6'};
  for(const path of ['03-svg-demake/model.mjs','05-autoplay-lab/sim.mjs','05-autoplay-lab/legacy-search.mjs','05-autoplay-lab/search.mjs','05-autoplay-lab/worker.mjs','05-autoplay-lab/htn-worker.mjs','05-autoplay-lab/htn-domain.mjs']){
    assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),hashes[path],path);
  }
});
test('exceptional live disposal is inspectable and counted, not silently renamed ammo',()=>{
  const s=structuredClone(cases.exceptionalDiscard),sent=[],trace=[];
  const c=createController({read:()=>s,perform:a=>act(s,a),send:m=>sent.push(m),cancel(){},now:()=>0,observe:e=>trace.push(e)});
  c.enable(true);c.pulse(0);
  const p=new HTN(sent[0].snapshot,sent[0].options);while(!p.done)p.run(100);
  c.receive({...p.result(sent[0].jobID),type:'result'});c.pulse(1);
  assert.deepEqual(c.status().resourceLoss,{mismatches:1,lostCharge:8,lostHeld:1});
  const decision=trace.find(e=>e.type==='response').policy.decisions.find(e=>e.method==='ExceptionalDiscardHeld');
  assert.equal(decision.estimate.lossCharge,8);assert.match(decision.why,/not a proof/);
});
