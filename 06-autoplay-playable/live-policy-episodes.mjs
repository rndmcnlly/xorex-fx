// Controlled virtual time: 60 Hz presentation, 30 Hz model, 12 arrows/s.
// Each synchronous planner result is delivered on the NEXT presentation frame.
// Actual CPU latency is recorded, not charged to virtual time. No future tape
// is provided to planner. This optimistic ~16.7 ms latency is not real-browser time.
import {createGame, seededRandom, tick, act} from '../03-svg-demake/model.mjs';
import {HTN} from '../05-autoplay-lab/htn.mjs';
import {createController} from './controller.mjs';
import {classifyAction} from '../04-rendering-lab/motion-playable/feedback.mjs';
import {mkdir, writeFile, readFile, copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const TRAIN = [1,7,2009], HELDOUT = [42,87,31415];
export async function episode(seed, profile='frozen', seconds=90) {
  const random=seededRandom(seed), state=createGame(random), initial=structuredClone(state);
  const tape=Array.from({length:seconds*30},()=>{const d=[random()];if(d[0]<.0725)d.push(random(),random());return d;});
  let now=0, pending=null, maxHeight=Math.max(...state.lanes.map(l=>l.length));
  const trace=[], windows=[], jobs=[];
  const metrics={mismatches:0,lostCharge:0,lostHeld:0,emptyShots:0,blackKills:0,amplifications:0,amplificationGain:0,
    productive:0,moves:0,actions:0,planningMs:0,maxPlanningMs:0};
  const c=createController({profile,read:()=>state,now:()=>now,cancel(){pending=null;},
    observe:e=>{if(e.type==='action' || e.type==='invalidated')trace.push(e);},
    perform:command=>{
      const before=structuredClone(state),events=act(state,command),f=classifyAction(before,state,command,events);
      metrics.actions++; if(f.kind==='move')metrics.moves++;
      if(['gather','matching-reload','new-charge','white-boost','white-stored','black-break','colored-kill'].includes(f.kind))metrics.productive++;
      if(f.kind==='mismatch'){metrics.mismatches++;metrics.lostCharge+=before.capacitor.n;metrics.lostHeld+=before.inventory.n;}
      if(f.kind==='dry-shot')metrics.emptyShots++;
      if(f.kind==='black-break')metrics.blackKills++;
      if(f.kind==='white-boost'){metrics.amplifications++;metrics.amplificationGain+=state.capacitor.n-before.capacitor.n;}
    },send:message=>{
      const p=new HTN(message.snapshot,message.options),start=performance.now();
      while(!p.done && performance.now()-start<1000)p.run(1);
      if(!p.done)p.finish('time-budget');
      const elapsed=performance.now()-start;
      metrics.planningMs+=elapsed;metrics.maxPlanningMs=Math.max(metrics.maxPlanningMs,elapsed);
      const result=p.result(message.jobID);jobs.push({at:now,source:message.snapshot,result});
      pending={...result,type:'result',delivery:now+1000/60};
    }});
  c.enable(true);
  for(let frame=0;frame<seconds*60&&!state.lost;frame++){
    now=frame*1000/60;
    if(frame%2===1){const draws=tape[(frame-1)/2];let i=0;tick(state,()=>draws[i++]);}
    if(pending && now+1e-6>=pending.delivery){const m=pending;pending=null;c.receive(m);}
    c.pulse(now);
    maxHeight=Math.max(maxHeight,...state.lanes.map(l=>l.length));
    if(frame%600===599)windows.push({seconds:(frame+1)/60,board:state.lanes.flat().length,black:state.lanes.flat().filter(x=>x==='black').length,...metrics});
  }
  return {seed,profile,seconds,latencyModel:'next-60Hz-frame; CPU not charged; bounded 1000ms planner',initial,
    arrivalHash:createHash('sha256').update(JSON.stringify(tape)).digest('hex'),...metrics,maxHeight,
    elapsedSeconds:state.frames/30,lost:state.lost,censored:!state.lost,remaining:state.lanes.flat().length,
    blackLoad:state.lanes.flat().filter(x=>x==='black').length,held:state.inventory,charge:state.capacitor,
    controller:c.status(),windows,trace,jobs,final:state};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const label=process.argv[2]??'before',profile=process.argv[3]??'frozen',split=process.argv[4]??'train';
  const dir=new URL('./generated/',import.meta.url);await mkdir(dir,{recursive:true});
  const sources=['03-svg-demake/model.mjs','05-autoplay-lab/sim.mjs','05-autoplay-lab/legacy-search.mjs','05-autoplay-lab/search.mjs','05-autoplay-lab/worker.mjs','05-autoplay-lab/htn-worker.mjs','05-autoplay-lab/htn-domain.mjs','05-autoplay-lab/htn.mjs','06-autoplay-playable/controller.mjs','06-autoplay-playable/app.mjs'];
  const hashes={};for(const path of sources){const data=await readFile(path);hashes[path]=createHash('sha256').update(data).digest('hex');if(label==='before')await copyFile(path,new URL(`live-policy-before-${path.replaceAll('/','_')}`,dir));}
  try {const data=await readFile('05-autoplay-lab/htn-live-domain.mjs');hashes['05-autoplay-lab/htn-live-domain.mjs']=createHash('sha256').update(data).digest('hex');}catch(error){if(error.code!=='ENOENT')throw error;}
  await writeFile(new URL(`live-policy-${label}-${split}-hashes.json`,dir),JSON.stringify(hashes,null,2));
  const results=[];for(const seed of split==='train'?TRAIN:HELDOUT){
    const r=await episode(seed,profile);results.push(r);
    console.log(JSON.stringify({...r,controller:{...r.controller,policy:undefined},initial:undefined,final:undefined,trace:undefined,jobs:undefined,windows:undefined}));
  }
  await writeFile(new URL(`live-policy-${label}-${split}.jsonl`,dir),results.map(r=>JSON.stringify(r)).join('\n')+'\n');
}
