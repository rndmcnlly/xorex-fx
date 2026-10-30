import { color } from './palette.mjs';

export function draw(ctx, state, gamut, plain = false) {
  const ink = id => color(id, gamut);
  ctx.clearRect(0, 0, 800, 600);
  ctx.fillStyle = '#404040'; ctx.fillRect(0, 0, 800, 600);
  if (!state) return;
  const circle = (x, y, r, fill, alpha = 1, stroke = false, width = 1) => {
    ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(x, y, r, 0, 2*Math.PI);
    ctx.fillStyle = ctx.strokeStyle = fill; ctx.lineWidth = width;
    if (stroke) ctx.stroke(); else ctx.fill(); ctx.globalAlpha = 1;
  };
  const chevron = (x, y, fill, width) => {
    ctx.beginPath(); ctx.moveTo(x-20, y+20); ctx.lineTo(x,y); ctx.lineTo(x+20,y+20);
    ctx.strokeStyle = fill; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  };
  const x = state.pos * 40 + 20;
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha = .045; ctx.fillRect(x-15,0,30,540); ctx.globalAlpha = 1;
  for (const [laneIndex, lane] of state.lanes.entries()) {
    lane.forEach((id, row) => {
      const gx = laneIndex*40+20, gy = row*40, pigment = ink(id);
      if (plain) {
        circle(gx,gy,26,pigment,.12,true,2); circle(gx,gy,16,pigment,.25); circle(gx,gy,10,pigment);
        return;
      }
      // Small radial aura, never a blur filter over gameplay. Black emits nothing.
      if (id !== 'black') {
        const halo = ctx.createRadialGradient(gx,gy,10,gx,gy,24);
        halo.addColorStop(0,pigment); halo.addColorStop(1,'transparent');
        circle(gx,gy,24,halo,.13);
      }
      circle(gx,gy,15.5,id === 'black' ? '#181818' : pigment,1);
      circle(gx,gy,15.5,id === 'black' ? '#777777' : pigment,.45,true,1);
      // Deliberately flat core plus a dark lower lip, not realistic glass marbles.
      ctx.save(); ctx.beginPath(); ctx.arc(gx,gy,15,0,Math.PI*2); ctx.clip();
      ctx.beginPath(); ctx.ellipse(gx,gy+13,17,5,0,0,2*Math.PI); ctx.fillStyle='#000'; ctx.globalAlpha=.18;ctx.fill();ctx.globalAlpha=1;
      // A nearly Euclidean pair of streak catchlights; tiny top-heavy grease cue.
      ctx.strokeStyle = id === 'black' ? '#999' : '#fff'; ctx.globalAlpha = id === 'white' ? .45 : .68;
      ctx.lineWidth = 1.5; ctx.lineCap='round'; ctx.beginPath();ctx.moveTo(gx-7,gy-8);ctx.lineTo(gx+2,gy-11);ctx.stroke();
      ctx.globalAlpha=.18;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(gx+4,gy-10);ctx.lineTo(gx+8,gy-8);ctx.stroke();
      ctx.restore();ctx.globalAlpha=1;
      // Central identity remains saturated and free of catchlights.
      circle(gx,gy+1,6,id === 'black' ? '#000' : pigment);
    });
  }
  for(let i=0;i<state.inventory.n;i++) {
    // Rings are the original count grammar, not a second resource system.
    const r=(i+2)*6; if(r>1000) break;
    circle(x,500,r,ink(state.inventory.color),1,true,2);
  }
  chevron(x,540,'#fff',8);
  for(let i=0;i<state.capacitor.n && 540+(i+2)*6<620;i++) chevron(x,540+(i+2)*6,ink(state.capacitor.color),2);
  // Counts outside the stage are exact, including glyphs naturally offscreen.
}
