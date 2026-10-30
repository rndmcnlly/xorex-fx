// TEST / EXPERIMENT DATA ONLY. Not imported by either planner or either Worker.
import {createGame, seededRandom} from '../03-svg-demake/model.mjs';
import {LESSONS, lessonSnapshot} from './curriculum.mjs';
const colors = ['red','green','blue','yellow','pink'];
const B = n => Array(n).fill('black'), W = n => Array(n).fill('white');
function shuffled(a, rng) {const out = [...a]; for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];} return out;}
export function transform(snapshot, seed) {
  const rng = seededRandom(seed), s = structuredClone(snapshot), palette = shuffled(colors,rng);
  const rename = c => colors.includes(c) ? palette[colors.indexOf(c)] : c;
  s.lanes = shuffled(s.lanes.map(l=>l.map(rename)),rng); s.pos = Math.floor(rng()*20);
  s.inventory.color = rename(s.inventory.color); s.capacitor.color = rename(s.capacitor.color);
  return s;
}
function board(lanes, cap = {color:'red',n:2}, inventory={color:null,n:0}) {
  const s = createGame(seededRandom(1),0);s.pos=0;
  lanes.forEach((l,i)=>s.lanes[i]=[...l]);s.capacitor={...cap};s.inventory={...inventory};return s;
}
export function heldouts() {
  const rows = [];
  for (const l of LESSONS) for(let i=0;i<10;i++) rows.push({id:`transform/${l.id}/${i}`,kind:'transformed',
    snapshot:transform(lessonSnapshot(l.id),7001+i*97)});
  for(let i=0;i<24;i++) {
    const k=i%4, family=Math.floor(i/4), n=1+k;
    const layouts = [
      board([[...W(1),...B(1)], [...W(n+1),...B(3)], W(1), B(14+n)]),
      board([['red','black','black'], ['red'], W(n+1), B(8+n)],{color:'white',n:3}),
      board([['white','red','black'], ['white','blue','blue'], ['green','white'], B(8+n)],{color:'red',n:2}),
      board([['red','black'], W(1), ['blue','green'], B(4+n)],{color:'red',n:1},{color:'blue',n:1}),
      board([[...W(n),...B(2)], ['yellow','black'], ['yellow','white'], B(5*n)],{color:'yellow',n:3}),
      board([[...W(1),...B(n+2)],B(8+n)],{color:'pink',n:1}),
    ];
    rows.push({id:`new/${family}/${k}`,kind:'new-resource-layout',snapshot:transform(layouts[family],9001+i*53)});
  }
  const rng=seededRandom(424242), gems=[...colors,'white','black','black'];
  for(let i=0;i<24;i++) {
    const s=board([], {color:colors[i%5],n:i%5}); if(!s.capacitor.n)s.capacitor.color=null;
    for(let j=0;j<12+i;j++)s.lanes[Math.floor(rng()*20)].push(gems[Math.floor(rng()*gems.length)]);
    if(i%3===0)s.inventory={color:i%2?'white':colors[i%5],n:1+i%4};
    rows.push({id:`random-order/${i}`,kind:'random-order',snapshot:s});
  }
  return rows;
}
