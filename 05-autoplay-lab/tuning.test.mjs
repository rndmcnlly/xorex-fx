import test from 'node:test';
import assert from 'node:assert/strict';
import {Search,POLICIES} from './search.mjs';
import {Search as LegacySearch} from './legacy-search.mjs';
import {fixture,FIXTURES} from './fixtures.mjs';
import {outcome} from './tuning.mjs';
import {pack,apply,clone,key} from './sim.mjs';

test('tuned policies: fixed-seed exact reproducibility, bounded nodes, oracle replay and immutable exports',()=>{
  for(const policy of POLICIES.filter(p=>p!=='legacy')) {
    const snapshot=fixture('natural',87),original=structuredClone(snapshot);
    const make=()=>new Search(snapshot,{policy,seed:71,maxNodes:60}).run(200);
    const a=make(),b=make(),r=a.result();
    for(const field of ['plan','macros','score','nodes','cycleStops','transitions','duplicateExpansions','incumbentOrigin'])assert.deepEqual(r[field],b.result()[field]);
    assert.ok(r.nodes<=60);assert.ok(outcome(snapshot,r).replayVerified);assert.deepEqual(snapshot,original);
    r.options.policy='bogus';r.plan.push('invalid');r.endSnapshot.lanes[0].push('black');
    assert.ok(outcome(snapshot,a.result()).replayVerified);
    const s=pack(snapshot),seen=new Set([key(s)]);
    for(const move of a.best.macros){apply(s,move);assert.ok(!seen.has(key(s)));seen.add(key(s));}
  }
});
test('tuned resource value does not penalize spending the last useful shot; holding is not progress',()=>{
  const snapshot=fixture('natural');snapshot.lanes[0].push('black');snapshot.capacitor={color:'red',n:1};
  // A large board made the legacy coverage discontinuity observable.
  const a=new Search(snapshot,{policy:'resource'}),b=clone(a.root);b.pos=0;apply(b,1);
  assert.ok(a.evaluate(b)>a.evaluate(a.root));
  const s=pack(fixture('white-rescue')),search=new Search(fixture('white-rescue'),{policy:'resource'});
  const before=search.evaluate(s);apply(s,2);assert.equal(search.evaluate(s),before);
});
test('tuned small tactics, unsolvable plateau and node-cap-one rollout baseline remain legal',()=>{
  for(const name of Object.keys(FIXTURES))for(const policy of ['resource','seeded']) {
    const snapshot=fixture(name),s=new Search(snapshot,{policy,seed:5}).run(1000),r=s.result();
    assert.ok(outcome(snapshot,r).replayVerified);
    assert.equal(r.status,name==='black-plateau'?'plateau':'clear');
  }
  const snapshot=fixture('natural'),s=new Search(snapshot,{policy:'resource',maxNodes:1}).run(100);
  assert.equal(s.nodes.length,1);outcome(snapshot,s.result());
  assert.equal(s.result().incumbentOrigin,'rollout-restart');
  const stuck=fixture('black-plateau');stuck.inventory={color:'red',n:1};stuck.capacitor={color:'blue',n:1};
  const r=new Search(stuck,{policy:'resource'}).run(100).result();
  assert.equal(r.remaining,3);assert.equal(r.termination,'no-productive-actions');outcome(stuck,r);
});
test('legacy dispatcher retains original options and deterministic full tree',()=>{
  assert.equal(new Search(fixture('natural')).options.policy,'resource');
  const s=fixture('seeded'),a=new Search(s,{policy:'legacy',seed:19}).run(100),b=new LegacySearch(s,{seed:19}).run(100);
  assert.deepEqual(a.nodes,b.nodes);assert.deepEqual(a.result().plan,b.result().plan);assert.deepEqual(a.options,b.options);
  assert.throws(()=>new Search(s,{policy:'bogus'}));
});
test('known restriction regression: inventory must sometimes be stashed on an empty lane to preserve ammo',()=>{
  const snapshot=fixture('one-shot');snapshot.inventory={color:'blue',n:1};
  const tuned=new Search(snapshot,{policy:'resource',seed:5}).run(500).result();
  assert.equal(tuned.remaining,1);assert.equal(tuned.termination,'no-productive-actions');
  // Independently supplied legal clear, excluded by the experimental action filter.
  const legacy=new LegacySearch(snapshot,{seed:5}).run(1000).result();
  assert.equal(legacy.status,'clear');outcome(snapshot,legacy);outcome(snapshot,tuned);
});
