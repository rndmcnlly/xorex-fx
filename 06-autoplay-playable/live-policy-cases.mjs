import {createGame,seededRandom} from '../03-svg-demake/model.mjs';
import {HTN} from '../05-autoplay-lab/htn.mjs';
import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
const state=(lanes,cap={color:null,n:0},held={color:null,n:0},pos=0)=>{
  const s=createGame(seededRandom(1),0);s.pos=pos;s.capacitor=cap;s.inventory=held;
  for(const [lane,colors] of Object.entries(lanes))s.lanes[Number(lane)]=colors;
  return s;
};
export const cases={
  largeChargeWrongHeld:state({0:['black','black'],1:['blue']},{color:'red',n:50},{color:'blue',n:2}),
  heldWhiteNeedsActivation:state({1:['red'],2:['black','black']},{color:null,n:0},{color:'white',n:2}),
  whiteBehindLastShot:state({0:['white','black'],1:['red']},{color:'red',n:1}),
  urgentBlackBeforeDistantWhites:state({0:Array(12).fill('black'),18:['white'],19:['white']},{color:'red',n:2}),
  multicolorStacks:state({0:['black','red','blue'],1:['red'],2:['white','green'],3:['black']},{color:'red',n:2}),
  whiteCapAsymmetry:state({0:['black','black'],1:['white'],2:['red']},{color:'white',n:2}),
  noAmmoPlateau:state({0:Array(4).fill('black')}),
  exceptionalDiscard:state(Object.fromEntries(Array.from({length:20},(_,i)=>[i,['green']])),{color:'red',n:8},{color:'blue',n:1}),
};
export function probe(){return Object.entries(cases).map(([name,snapshot])=>{
  const p=new HTN(snapshot,{profile:'live'});while(!p.done)p.run(100);
  return {name,snapshot,result:p.result()};
});}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const results=probe();await writeFile(new URL(`./generated/live-policy-${process.argv[2]??'final'}-cases.json`,import.meta.url),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(r=>({name:r.name,arrows:r.result.plan.length,methods:r.result.trace.map(t=>t.method),end:r.result.endSnapshot.capacitor})),null,2));
}
