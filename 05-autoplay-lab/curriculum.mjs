// Authored static drills. Never imported by search or worker: witnesses are oracle-only.
import {act, createGame, seededRandom} from '../03-svg-demake/model.mjs';
const B = n => Array(n).fill('black'), W = n => Array(n).fill('white');
const energy = (color, n) => ({color, n});
function board(lanes, cap = energy(null, 0), inv = energy(null, 0)) {
  const s = createGame(seededRandom(1), 0); s.pos = 0;
  lanes.forEach((lane, i) => s.lanes[i] = [...lane]);
  s.capacitor = {...cap}; s.inventory = {...inv}; return s;
}
// Commands are [zero-based lane, arrow, repetitions]. Travel expands to real arrows.
const gather = lane => [[lane, 'down'], [lane, 'down']];
const merge = (from, to) => [[from, 'down'], [to, 'up']];
const shoot = (lane, n) => [lane, 'up', n];
const red = n => energy('red', n);
const definitions = [
  {id:'01-activate', name:'A color before white', prerequisite:null,
    concept:'Activate a colored capacitor before converting white.',
    trap:'White into an empty capacitor is only one ordinary charge, not five.',
    make:()=>board([['red'], W(1), B(6)]), commands:[...gather(0), ...gather(1), shoot(2,6)],
    groups:[1], charge:6, shots:6, remaining:0, noMergeUpper:6, requiredGroup:1},
  {id:'02-run', name:'Read the whole bottom run', prerequisite:'01-activate',
    concept:'Gather both adjacent whites together: 5 × 2² = 20 additive shots.',
    trap:'Two white gems do not mean two shots, and Up never shoots a whole column.',
    make:()=>board([W(2), B(10), B(10)],red(1)), commands:[...gather(0),shoot(1,10),shoot(2,10)],
    groups:[2], charge:21, shots:20, remaining:1, noMergeUpper:21, requiredGroup:2},
  {id:'03-relocate', name:'Move one white onto another', prerequisite:'02-run',
    concept:'Replace a held white onto another white tail, then regather their combined run.',
    trap:'Converting the singles separately creates only ten bonus shots.',
    make:()=>board([W(1),W(1),B(8),B(7)],red(1)),
    commands:[...merge(0,1),...gather(1),shoot(2,8),shoot(3,7)],
    groups:[2],charge:21,shots:15,remaining:6,noMergeUpper:11,requiredGroup:2},
  {id:'04-three', name:'Three tributaries, one reservoir', prerequisite:'03-relocate',
    concept:'Combine three separated whites. Even a pair plus a single is insufficient.',
    trap:'All nonwhite resources count in the bound: the two red gems add two, not an unlimited supply.',
    make:()=>board([W(1),W(1),W(1),['red','red'],B(14),B(14),B(12)]),
    commands:[...gather(3),...merge(0,2),...merge(1,2),...gather(2),shoot(4,14),shoot(5,14),shoot(6,12)],
    groups:[3],charge:47,shots:40,remaining:7,noMergeUpper:17,requiredGroup:3},
  {id:'05-uncover', name:'Spend to expose the engine', prerequisite:'04-three',
    concept:'Spend two real shots removing the black tail before gathering the hidden white pair.',
    trap:'Down cannot reach through black. Spend two of three charges, preserving a colored charge for the bonus.',
    make:()=>board([[...W(2),...B(2)],B(14),B(4)],red(3)),
    commands:[shoot(0,2),...gather(0),shoot(1,14),shoot(2,4)],
    groups:[2],charge:23,shots:20,remaining:3,noMergeUpper:23,requiredGroup:2},
  {id:'06-park', name:'Park the wrong color', prerequisite:'05-uncover',
    concept:'Temporarily replace blue on an empty lane so Up can spend the red charge and uncover red.',
    trap:'Up with inventory replaces instead of firing; converting blue first destroys the only opening shot.',
    make:()=>board([['red','black'],W(1),B(5)],red(1),energy('blue',1)),
    commands:[[3,'up'],shoot(0,1),...gather(0),...gather(1),shoot(2,5),...gather(3)],
    groups:[1],charge:7,shots:6,remaining:0,noMergeUpper:8,requiredGroup:1,
    constraint:'no-replace'},
  {id:'07-bootstrap', name:'Bootstrap, uncover, then consolidate', prerequisite:'06-park',
    concept:'Use one white now to unlock two buried whites, then merge those with the final accessible single.',
    trap:'The opening two charges cannot expose all buried whites. Boost before the second gate, retaining a colored charge.',
    make:()=>board([[...W(1),...B(1)],[...W(2),...B(4)],W(1),B(14),B(14),B(12)],red(2)),
    commands:[shoot(0,1),...gather(0),shoot(1,4),...merge(1,2),...gather(2),shoot(3,14),shoot(4,14),shoot(5,12)],
    groups:[1,3],charge:52,shots:45,remaining:7,noMergeUpper:32,requiredGroup:3},
  {id:'08-bastion', name:'The structured black bastion', prerequisite:'07-bootstrap',
    concept:'Consolidate seven whites before paying one shot for each of 191 black gems.',
    trap:'A six-white group plus a single yields only 186 shots including the initial charge. No whole-column kills.',
    make:()=>board([W(1),W(1),W(1),W(2),W(2),...Array.from({length:13},()=>B(14)),B(9)],red(1)),
    commands:[...merge(1,0),...merge(2,0),...merge(3,0),...merge(4,0),...gather(0),
      ...Array.from({length:13},(_,i)=>shoot(i+5,14)),shoot(18,9)],
    groups:[7],charge:246,shots:191,remaining:55,noMergeUpper:56,requiredGroup:7},
];

export const LESSONS = Object.freeze(definitions.map(({make,commands,...metadata})=>Object.freeze({...metadata,groups:Object.freeze([...metadata.groups])})));
export function lessonSnapshot(id) {
  const d = definitions.find(d=>d.id===id); if(!d) throw Error(`Unknown lesson ${id}`);
  return d.make();
}
export function witness(id) {
  const d=definitions.find(d=>d.id===id), s=lessonSnapshot(id), plan=[], macros=[];
  for(const [lane,arrow,repeats=1] of d.commands) for(let i=0;i<repeats;i++) {
    while(s.pos!==lane) {const a=s.pos<lane?'right':'left';plan.push(a);act(s,a);}
    macros.push(lane*2+(arrow==='up'?1:0));plan.push(arrow);act(s,arrow);
  }
  return {plan,macros,endSnapshot:s};
}
// Trace independent of compact search simulator. Events are observations of act().
export function audit(snapshot, plan) {
  const s=structuredClone(snapshot), groups=[], events=[];
  let shots=0, chargeAdded=0, discarded=0, maxLane=Math.max(...s.lanes.map(l=>l.length));
  for(let index=0;index<plan.length;index++) {
    const a=plan[index], before=structuredClone(s), sounds=act(s,a);
    if(a==='up'&&!before.inventory.n&&before.capacitor.n) shots++;
    if(a==='down'&&before.inventory.n) {
      const delta=s.capacitor.n-before.capacitor.n;
      if(delta>0)chargeAdded+=delta; else if(delta<0)discarded-=delta;
      if(before.inventory.color==='white'&&before.capacitor.color&&before.capacitor.color!=='white') groups.push(before.inventory.n);
    }
    maxLane=Math.max(maxLane,...s.lanes.map(l=>l.length));
    if(a==='up'||a==='down')events.push({index,lane:before.pos,arrow:a,sounds,held:{...s.inventory},cap:{...s.capacitor}});
  }
  return {endSnapshot:s,groups,shots,chargeAdded,discarded,maxLane,events,
    clear:s.inventory.n===0&&s.lanes.every(l=>l.length===0)};
}

// Optimistic conservation bound with all ordinary gems available for free.
// If every white bonus group has at most k gems, sum squares is maximized by
// packing groups of k. This even permits splitting original runs: safe upper bound.
export function ammoUpperBound(snapshot,k=Infinity) {
  const gems=[...snapshot.lanes.flat(),...Array(snapshot.inventory.n).fill(snapshot.inventory.color)];
  const whites=gems.filter(c=>c==='white').length;
  const ordinary=gems.filter(c=>c!=='white'&&c!=='black').length;
  const size=Math.min(k,whites)||1, q=Math.floor(whites/size),r=whites%size;
  return snapshot.capacitor.n+ordinary+5*(q*size*size+r*r);
}

// Exact small-state reachability with interchangeable lanes canonicalized.
// Position is irrelevant to reachability (lateral movement is always available).
// This is only for tiny restricted proof cases, not the large boards.
export function restrictedReachability(snapshot,{noReplace=false,maxStates=20000}={}) {
  const key=s=>JSON.stringify([s.lanes.map(l=>l.join(',')).sort(),s.inventory,s.capacitor]);
  const queue=[structuredClone(snapshot)],seen=new Set([key(snapshot)]);
  for(let at=0;at<queue.length;at++) {
    const s=queue[at];
    if(!s.inventory.n&&s.lanes.every(l=>!l.length))return {clear:true,states:seen.size,exhausted:false};
    for(let lane=0;lane<20;lane++) for(const a of ['down','up']) {
      if(noReplace&&a==='up'&&s.inventory.n)continue;
      const next=structuredClone(s);next.pos=lane;act(next,a);next.pos=0;
      const k=key(next);if(seen.has(k))continue;
      if(seen.size>=maxStates)return {clear:false,states:seen.size,exhausted:false};
      seen.add(k);queue.push(next);
    }
  }
  return {clear:false,states:seen.size,exhausted:true};
}
