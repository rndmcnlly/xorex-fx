import { RULES, COLORS, createGame, seededRandom, tick, act } from '../../03-svg-demake/model.mjs';
import { createKeyboard } from '../../03-svg-demake/input.mjs';
import { chooseGamut } from './palette.mjs';
import { draw } from './renderer.mjs';
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search), seed = params.get('seed');
let random = seed === null ? Math.random : seededRandom(Number(seed));
let game = null, paused = false, context, actual = 'srgb';
const probe = space => document.createElement('canvas').getContext('2d', { colorSpace: space })?.getContextAttributes?.().colorSpace ?? 'unreported';
const caps = { cssP3: CSS.supports('color', 'color(display-p3 1 0 0)'), displayP3: matchMedia('(color-gamut: p3)').matches,
  p3Context: probe('display-p3'), srgbContext: probe('srgb'), hdrMediaQuery: matchMedia('(dynamic-range: high)').matches, userAgent: navigator.userAgent };
function selectContext() {
  const wanted = chooseGamut($('gamut').value,caps);
  // Canvas context attributes are immutable. Replace only the presentation surface.
  if (!context || actual !== wanted) {
    const canvas=document.createElement('canvas'); canvas.id='board';canvas.width=800;canvas.height=600;canvas.setAttribute('aria-label','20-lane game board');
    context=canvas.getContext('2d',{colorSpace:wanted});
    if (!context) throw Error('Canvas 2D unavailable');
    actual=context.getContextAttributes?.().colorSpace ?? 'unreported';
    $('board').replaceWith(canvas);
  }
  render();
}
function render() {
  draw(context,game,actual === 'display-p3' ? 'display-p3':'srgb',$('plain').checked);
  const energy = e => e.n ? `${e.n} ${e.color}` : 'empty';
  const mode = !game ? 'Ready' : game.lost ? 'Game over' : document.hidden ? 'Hidden: suspended' : paused ? 'Developer pause' : 'Playing';
  $('status').textContent=game ? `${mode} · Lane ${game.pos+1} · Held: ${energy(game.inventory)} · Charge: ${energy(game.capacitor)}` : 'Ready. Up or Down starts.';
  $('capability').textContent=`Active canvas: ${actual}. Display P3 query: ${caps.displayP3}. ${$('gamut').value === 'display-p3' && actual !== 'display-p3' ? 'P3 unavailable: using explicit sRGB fallback.' : 'Switch color path without restarting.'}`;
  $('caps').textContent=JSON.stringify({...caps, requested:$('gamut').value,activeContext:actual, output:'SDR, no HDR request'},null,2);
  $('debug').textContent=game ? `Frame ${game.frames}\nLane lengths: ${game.lanes.map(l=>l.length).join(' ')}\n${JSON.stringify({inventory:game.inventory,capacitor:game.capacitor})}` : 'No game yet';
  $('pause').disabled=!game||game.lost; $('pause').textContent=paused?'Resume (developer)':'Pause (developer)';$('step').disabled=!paused||!game||game.lost;
}
function play(events) {
  if(!$('sound').checked) return;
  for(const event of events) {
    const voice=new Audio(`../../01-ruffle/sound/${event === 'synth' ? 'synthesize' : event}.mp3`);
    voice.volume=.5;voice.play().catch(()=>{});
  }
}
function start() {
  if(seed !== null) random=seededRandom(Number(seed));
  game=createGame(random); paused=false;$('overlay').hidden=true;$('stage').focus();render();
}
const keyboard=createKeyboard({mode:()=>!game||game.lost?'ready':paused||document.hidden?'blocked':'playing',start,
  action:command=>{play(act(game,command));render();}});
window.addEventListener('keydown',event=>{if(!['INPUT','SELECT','BUTTON','SUMMARY','A'].includes(document.activeElement?.tagName))keyboard.down(event);});
window.addEventListener('keyup',keyboard.up);window.addEventListener('blur',keyboard.clear);
document.addEventListener('visibilitychange',()=>{keyboard.clear();render();});
$('start').onclick=start;
$('gamut').onchange=()=>{selectContext();$('stage').focus();};
$('plain').onchange=()=>{render();$('stage').focus();};
$('pause').onclick=()=>{paused=!paused;keyboard.clear();$('stage').focus();render();};
$('step').onclick=()=>{if(paused)advance();};
function advance(){
  if(!game||game.lost)return;
  play(tick(game,random));
  if(game.lost){$('overlay').hidden=false;$('heading').textContent='Stability lost';$('message').textContent=`A lane exceeded 14 gems after ${game.frames} simulation frames. Final state retained.`;$('start').textContent='Play again';}
  render();
}
// Same fractional 30 Hz deadlines and no-backlog browser adaptation as accepted port.
const duration=1000/RULES.fps;let deadline=performance.now()+duration;
function pulse(){const now=performance.now();if(now>=deadline){if(!paused&&!document.hidden)advance();deadline+=duration;if(deadline<=now)deadline=now+duration;}setTimeout(pulse,Math.max(1,deadline-performance.now()));}
setTimeout(pulse,duration);
$('seed-note').textContent=seed === null?'Live browser Math.random; 30 Hz independent spawn trials. Hidden tabs suspend.':`Seeded Mulberry32 fixture ${seed}, not original Flash randomness.`;
selectContext();
if(params.has('inspect'))window.p3Inspection={
  exportState:()=>structuredClone(game), capabilities:()=>({...caps,activeContext:actual}),
  loadFixture(state){
    if(state.lanes?.length!==20||!state.lanes.every(l=>Array.isArray(l)&&l.every(c=>Object.hasOwn(COLORS,c)))||!Number.isInteger(state.pos)||state.pos<0||state.pos>=20||
      ![state.inventory,state.capacitor].every(e=>e&&Number.isInteger(e.n)&&e.n>=0&&e.n<=10000&&(e.n===0?e.color===null:Object.hasOwn(COLORS,e.color)))||!Number.isInteger(state.frames)||state.frames<0||typeof state.lost!=='boolean')throw Error('Invalid fixture');
    game=structuredClone(state);paused=true;keyboard.clear();$('overlay').hidden=true;render();
  }
};
