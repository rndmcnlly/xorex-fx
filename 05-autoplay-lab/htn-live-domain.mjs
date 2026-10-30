// Live knowledge only. No ticks, arrival prediction, fixtures or new operators.
import {unpack} from './sim.mjs';
import {inspect, task} from './htn-domain.mjs';
const op=(lane,up=false)=>task('ArrowMacro',{macro:lane*2+Number(up)});
export function decomposeLive(t,s){
  const f=inspect(s), u=unpack(s), cap=u.capacitor, held=u.inventory;
  const methods=[],rejected=[];
  const add=(name,tasks,estimate={},why='')=>methods.push({name,tasks,estimate,why});
  const distance=lane=>Math.abs(lane-s.pos);
  // Pressure and travel are visible snapshot facts, not predicted arrivals.
  const priority=lane=>(f.lanes[lane].length>=10?100:0)+f.lanes[lane].length*2-distance(lane);
  const ranked=items=>[...items].sort((a,b)=>priority(b.lane)-priority(a.lane));
  const ordinary=ranked(f.runs.filter(r=>r.color!=='white'));
  const whites=ranked(f.runs.filter(r=>r.color==='white'));
  const blacks=ranked(f.lanes.flatMap((l,lane)=>{
    let n=0;while(l.at(-1-n)==='black')n++;
    return n?[{lane,n}]:[];
  }));
  const parking=color=>ranked(f.lanes.flatMap((l,lane)=>!l.length||l.at(-1)===color?[{lane}]:[]))[0]?.lane;
  if(t.name==='LiveMaintenance'){
    if(t.left===0 || (!f.remaining && !s.inv) || (!s.cap&&!s.inv&&!f.runs.length))add('SnapshotTaskBoundary',[],{outcome:!f.runs.length&&!s.cap?'wait-for-observation':'continue'},'live maintenance does not require empty inventory or charge; no-ammo plateau stops decomposition');
    else add('MaintainResourcesAndPressure',[task('LiveWork'),task('LiveMaintenance',{left:(t.left??6)-1})],{},'bounded dependency tasks on this snapshot; reobserve arrivals in next job');
  }else if(t.name==='LiveWork'){
    if(s.inv){
      if(held.color==='white' && !s.cap && ordinary.length && parking('white')!==undefined){
        const lane=parking('white'),r=ordinary[0],n=held.n+(whites.find(w=>w.lane===lane)?.n??0);
        add('ParkWhiteActivateRegather',[op(lane,true),op(r.lane),op(r.lane),op(lane),op(lane)],
          {whiteGroup:n,added:5*n*n,activationLane:r.lane,stashLane:lane},'held white waits for ordinary activation; dependency chain avoids empty-cap underconversion');
      }else if(!s.cap || held.color===cap.color || held.color==='white'){
        add('PreserveOrAmplifyHeld',[op(s.pos)],{held:s.inv,added:held.color==='white'&&cap.color&&cap.color!=='white'?5*s.inv*s.inv:s.inv},'compatible conversion or real asymmetric white amplification');
      }else{
        const lane=parking(held.color);
        if(lane!==undefined && (blacks.length||whites.length))add('StashThenUseCharge',[op(lane,true),task('LiveSpend')],{preservedCharge:s.cap,held:s.inv,stashLane:lane},'park held gems before useful firing or amplification, not a gather/replace cycle');
        else add('ExceptionalDiscardHeld',[op(s.pos)],{lossCharge:s.cap,lossHeld:s.inv},'no encoded empty/matching-park plus black/white-work task; deliberate incompatible disposal, not a proof that alternatives are impossible');
      }
    }else{
      const urgent=blacks.find(b=>f.lanes[b.lane].length>=10 && distance(b.lane)<=4);
      const reserve=whites.length&&cap.color&&cap.color!=='white'?1:0;
      if(s.cap>reserve && urgent)add('RelieveImmediateBlackThreat',[task('RepeatShot',{lane:urgent.lane,n:Math.min(urgent.n,s.cap-reserve)})],
        {lane:urgent.lane,height:f.lanes[urgent.lane].length,shots:Math.min(urgent.n,s.cap-reserve),reserve},'nearby tall black lane precedes distant white assembly; retain colored white activation');
      if(whites.length && cap.color && cap.color!=='white' && s.cap<=f.black+2)add('WhiteEngine',[task('LiveWhite')],{reserve:s.cap},'amplify before losing colored activation');
      if(s.cap && blacks.length)add('AddressBlackPressure',[task('LiveSpend')],{available:s.cap},'spend existing charge usefully before changing colors');
      for(const r of ordinary.filter(r=>!s.cap||r.color===cap.color))add('CompatibleReload',[op(r.lane),op(r.lane)],{lane:r.lane,gather:r.n,preservedCharge:s.cap},'only empty or matching ordinary reloads');
      if(whites.length)add('UseWhiteResource',[task('LiveWhite')],{},'white conversion is not an ordinary mismatch');
      if(s.cap && !blacks.length && ordinary.length){
        const r=ordinary[0];add('RemoveOrdinaryBlocker',[task('RepeatShot',{lane:r.lane,n:Math.min(r.n,s.cap)})],{shots:Math.min(r.n,s.cap),lane:r.lane},'productive pressure relief when incompatible ordinary tails block reloading');
      }
      if(!methods.length)add('SnapshotMaintained',[],{outcome:'continue'},'no productive task on this snapshot');
    }
  }else if(t.name==='LiveSpend'){
    if(whites.length && cap.color && cap.color!=='white' && s.cap<=f.black+2)add('AmplifyReserveFirst',[task('LiveWhite')],{reserve:s.cap},'retain colored activation instead of exhausting it before accessible white');
    for(const b of blacks)add('OpenGateOrReduceBank',[task('RepeatShot',{lane:b.lane,n:Math.min(b.n,s.cap)})],{lane:b.lane,shots:Math.min(b.n,s.cap),height:f.lanes[b.lane].length},'black-tail gate and pure bank both useful; pressure/travel ordering');
  }else if(t.name==='LiveWhite'){
    const target=whites[0];
    if(target){
      // Keep the resource task local when the snapshot already has tall lanes.
      // Otherwise preserve the useful nonlinear grouping of exposed whites.
      const group=f.lanes.some(l=>l.length>=10)?whites.filter(r=>Math.abs(r.lane-target.lane)<=4):whites;
      const tasks=group.slice(1).flatMap(r=>[op(r.lane),op(target.lane,true)]);
      tasks.push(op(target.lane),op(target.lane));
      const n=group.reduce((n,r)=>n+r.n,0);
      add('AssembleAndAmplify',tasks,{whiteGroup:n,added:cap.color&&cap.color!=='white'?5*n*n:n,target:target.lane},'replace compatible whites, regather, convert with exact cap asymmetry');
    }
  }else throw Error(`Unknown live task ${t.name}`);
  return {methods,rejected};
}
