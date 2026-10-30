import test from 'node:test';
import assert from 'node:assert/strict';
import { act, createGame, seededRandom } from '../03-svg-demake/model.mjs';
import { pack, unpack, clone, copyInto, primitive, key, apply, expand, actions, features, evaluator } from './sim.mjs';
// Original simulator/legacy-policy coverage stays exact across the tuning boundary.
// New default-policy coverage lives in tuning.test.mjs.
import { Search, baseline } from './legacy-search.mjs';
import { fixture, FIXTURES } from './fixtures.mjs';

function comparable(s) {return {lanes: s.lanes, pos: s.pos, inventory: s.inventory, capacitor: s.capacitor};}
function replay(snapshot, plan) {const s = structuredClone(snapshot); for (const a of plan) {assert.ok(['up', 'down', 'left', 'right'].includes(a)); act(s, a);} return s;}
test('compact simulator: 5000 seeded live states, 64 mixed arrows each = 320000 transitions', () => {
  const random = seededRandom(711), colors = ['red', 'green', 'blue', 'yellow', 'pink', 'white', 'black'];
  const energy = () => random() < .3 ? {color: null, n: 0} : {color: colors[Math.floor(random() * 6)], n: 1 + Math.floor(random() * 20)};
  for (let i = 0; i < 5000; i++) {
    const s = createGame(random, 0);s.frames = Math.floor(random() * 10000);
    for (const lane of s.lanes) for (let j = Math.floor(random() * 16); j > 0; j--) lane.push(colors[Math.floor(random() * 7)]);
    s.inventory = energy();s.capacitor = energy();const compact = pack(s);
    for (let j = 0; j < 64; j++) {
      const a = ['up', 'down', 'left', 'right'][Math.floor(random() * 4)];act(s, a);primitive(compact, a);
      assert.deepEqual(unpack(compact), comparable(s), `state ${i}, arrow ${j}: ${a}`);
    }
  }
});
test('explicit asymmetries, append, no wrapping, black blocking and one-enemy shots', () => {
  const s = createGame(seededRandom(3), 0);s.pos = 0;
  function check(action) {const c = pack(s);primitive(c, action);act(s, action);assert.deepEqual(unpack(c), comparable(s));}
  s.inventory = {color:'white',n:3};s.capacitor = {color:'red',n:2};check('down');assert.deepEqual(s.capacitor,{color:'red',n:47});
  s.inventory = {color:'white',n:3};s.capacitor = {color:'white',n:2};check('down');assert.equal(s.capacitor.n,5);
  s.inventory = {color:'white',n:3};s.capacitor = {color:null,n:0};check('down');assert.deepEqual(s.capacitor,{color:'white',n:3});
  s.inventory = {color:'red',n:2};check('down');assert.equal(s.inventory.n,0);assert.equal(s.capacitor.n,0);
  s.inventory = {color:'red',n:3};s.lanes[0] = ['blue'];check('up');assert.deepEqual(s.lanes[0],['blue','red','red','red']);
  check('down');assert.equal(s.inventory.n,3);check('down');
  s.lanes[0] = ['white','black'];check('down');assert.equal(s.inventory.n,0);
  check('up');assert.deepEqual(s.lanes[0],['white']);assert.equal(s.capacitor.n,2);
  s.lanes[0] = [];check('up');assert.equal(s.capacitor.n,1);check('up');assert.equal(s.capacitor.color,null);
  check('left');assert.equal(s.pos,0);s.pos=19;check('right');assert.equal(s.pos,19);
});
test('macro edges replay exactly through actual model including travel; snapshots immutable', () => {
  for (const name of [...Object.keys(FIXTURES), 'seeded', 'natural']) {
    const s = fixture(name), original = structuredClone(s), compact = pack(s);
    for (const m of actions(compact)) {
      const t = pack(s), plan = expand(s.pos, [m]);const cost = apply(t, m);
      assert.equal(cost, plan.length);assert.deepEqual(unpack(t), comparable(replay(s, plan)));
    }
    const search = new Search(s, {horizon:32, maxNodes:300});search.run(200);
    assert.deepEqual(s, original);assert.ok(search.nodes.length <= 300);
    const result = search.result('test');const end = replay(s, result.plan);
    assert.equal(end.frames,s.frames);assert.equal(end.lost,false);
    assert.deepEqual(comparable(end),unpack(search.best.state));
    assert.deepEqual(end,result.endSnapshot);
    assert.equal(result.primitiveCost,result.plan.length);
    assert.equal(evaluator(pack(s))(pack(end)),result.score);
  }
});
test('exported snapshots, options and macro plans do not alias retained search data', () => {
  const search = new Search(fixture('one-shot')).run(20), exported=search.result();
  exported.macros.push(99);exported.options.horizon=199;exported.endSnapshot.lanes[0].push('pink');
  const clean=search.result();assert.deepEqual(clean.macros,[1]);assert.equal(clean.options.horizon,48);assert.deepEqual(clean.endSnapshot.lanes[0],[]);
});
test('fixed iteration count reproduces exact plan, score and tree diagnostics', () => {
  const s = fixture('buried-white');const a = new Search(s,{seed:42}).run(750).result();const b = new Search(s,{seed:42}).run(750).result();
  for (const k of ['plan','macros','score','nodes','iterations','sourceFingerprint','cycleStops','duplicateExpansions','transitions']) assert.deepEqual(a[k],b[k]);
});
test('reward fixtures: real clear, plateau, no gather hoarding, white rescue; baselines explicit', () => {
  assert.equal(new Search(fixture('black-plateau')).run(50).result().status,'plateau');
  const single = new Search(fixture('one-shot')).run(50).result();assert.equal(single.status,'clear');assert.deepEqual(single.plan,['up']);
  const s = fixture('white-rescue'), c = pack(s), evaluate = evaluator(c), before = evaluate(c);
  apply(c, 2);assert.ok(evaluate(c) <= before + .03); // Holding gems is not clearing them.
  apply(c, 2);assert.equal(c.cap,21);assert.ok(evaluate(c)>before);
  const r = new Search(s,{seed:5,horizon:32}).run(2000).result();assert.equal(r.status,'clear');
  assert.ok(features(pack(replay(s,r.plan))).clear);
  for (const kind of ['random','greedy']) {
    const b=baseline(s,kind);assert.ok(Number.isFinite(b.score));assert.deepEqual(replay(s,b.plan),b.endSnapshot);
  }
  const failure=fixture('black-plateau');failure.lanes[0]=Array(5).fill('black');failure.lanes[1]=[];
  failure.inventory={color:'red',n:1};failure.capacitor={color:'blue',n:5};
  const failed=pack(failure), score=evaluator(failed), start=score(failed);primitive(failed,'down');
  assert.ok(score(failed)<start,'Resetting the ammo needed for five black gems is costly');
});
test('cycle keys ignore relocation but retain resources, lanes and order; hard node cap works', () => {
  const a = pack(fixture('replace-merge')), b=pack(fixture('replace-merge'));b.pos=19;
  assert.equal(key(a),key(b));assert.notEqual(key(a,true),key(b,true));
  const search=new Search(fixture('natural'),{maxNodes:1,horizon:30}).run(100);
  assert.equal(search.nodes.length,1);assert.ok(search.cycles>0);
});
test('scratch reuse preserves exact keys, macro ordering and independent states, including maximum capacity', () => {
  const source=fixture('natural');
  source.lanes=Array.from({length:20},(_,lane)=>Array.from({length:250},(_,i)=>['red','white','black'][(lane+i)%3]));
  const state=pack(source), scratch=clone(state), reused=[999];
  const legacyKey=(s,pos=false)=>`${pos?s.pos:''}|${s.ic},${s.inv},${s.cc},${s.cap}|${s.lengths.join(',')}|${String.fromCharCode(...s.board.subarray(0,s.size))}`;
  const random=seededRandom(810);
  for(let i=0;i<2000;i++) {
    for(const pos of [false,true]) assert.equal(key(state,pos),legacyKey(state,pos));
    const expected=state.ic?[state.pos*2,...Array.from({length:20},(_,i)=>i*2+1)]:
      source.lanes.flatMap((_,lane)=>{let p=0;for(let j=0;j<=lane;j++)p+=state.lengths[j];return state.lengths[lane]?[...(state.board[p-1]!==7?[lane*2]:[]),...(state.cc?[lane*2+1]:[])]:[];});
    assert.deepEqual(actions(state,reused),expected);
    copyInto(scratch,state);
    const before=unpack(state), a=['up','down','left','right'][Math.floor(random()*4)];
    primitive(scratch,a);assert.deepEqual(unpack(state),before);
    primitive(state,a);assert.deepEqual(unpack(scratch),unpack(state));
  }
});
