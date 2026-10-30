import { act, COLORS } from '../03-svg-demake/model.mjs';
import { FIXTURES, fixture } from './fixtures.mjs';
import { baseline } from './search.mjs';
import { fingerprint } from './sim.mjs';
import {LESSONS,lessonSnapshot,witness} from './curriculum.mjs';
const $ = id => document.getElementById(id), copy = s => structuredClone(s);
for (const name of Object.keys(FIXTURES)) $('scenario').add(new Option(name, name));
for (const l of LESSONS) {$('lesson').add(new Option(l.name,l.id));$('scenario').add(new Option(`Drill: ${l.name}`,l.id));}
let state, source, result = null, worker = null, serial = 0, active = null, stepIndex = 0, timer = null;
const canvas = $('board'), ctx = canvas.getContext('2d');
function render() {
  ctx.fillStyle = '#404040'; ctx.fillRect(0, 0, 800, 600);
  for (let lane = 0; lane < 20; lane++) {
    ctx.strokeStyle = lane === state.pos ? '#777' : '#494949'; ctx.beginPath(); ctx.moveTo(lane * 40 + 20, 0); ctx.lineTo(lane * 40 + 20, 520); ctx.stroke();
    state.lanes[lane].forEach((color, row) => {
      const x = lane * 40 + 20, y = row * 36 + 18; // Lab-only fit: all 14 rows fully visible, including head gems.
      ctx.fillStyle = COLORS[color]; ctx.strokeStyle = color === 'black' ? '#9b9b9b' : '#ddd'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  }
  const x = state.pos * 40 + 20;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - 17, 553); ctx.lineTo(x, 536); ctx.lineTo(x + 17, 553); ctx.lineTo(x, 545); ctx.closePath(); ctx.fill();
  if (state.inventory.color) { ctx.strokeStyle = COLORS[state.inventory.color]; for (let i = 0; i < Math.min(8, state.inventory.n); i++) {ctx.beginPath(); ctx.arc(x, 500, 8 + 4 * i, 0, Math.PI * 2); ctx.stroke();} }
  if (state.capacitor.color) { ctx.strokeStyle = COLORS[state.capacitor.color]; for (let i = 0; i < Math.min(8, state.capacitor.n); i++) {ctx.beginPath();ctx.moveTo(x - 10, 565 + 4 * i);ctx.lineTo(x, 560 + 4 * i);ctx.lineTo(x + 10, 565 + 4 * i);ctx.stroke();} }
  $('stores').textContent = `Lane ${state.pos + 1}/20 · inventory ${state.inventory.color ?? 'empty'} × ${state.inventory.n} · capacitor ${state.capacitor.color ?? 'empty'} × ${state.capacitor.n} · frames frozen at ${state.frames}`;
  $('snapshot').textContent = JSON.stringify(state, null, 2);
}
function stopReplay() { clearInterval(timer); timer = null; $('replay').textContent = 'Replay plan'; }
function cancel(message = 'Cancelled. Best received incumbent remains inspectable.') {
  if (active !== null) { worker?.postMessage({type: 'cancel', jobID: active}); worker?.terminate(); worker = null; active = null; serial++; }
  $('cancel').disabled = true; if (message) $('status').textContent = message;
}
function showResult(r) {
  result = r;
  $('stats').textContent = JSON.stringify({status: r.status, score: r.score, iterations: r.iterations,
    activeIterationsPerSecond: r.trace ? undefined : Math.round(r.iterationsPerSecond ?? 0), wallIterationsPerSecond: r.trace ? undefined : Math.round(r.wallIterationsPerSecond ?? 0),
    nodes: r.nodes, ...(r.trace ? {wallMs:Math.round(r.wallMs),reason:r.reason,backtracks:r.backtracks,bounds:r.bounds} : {activeMs:Math.round(r.activeMs ?? 0)}), policy: r.options?.policy ?? (r.options ? 'legacy' : 'legacy baseline'),
    horizon: r.options?.horizon, incumbentOrigin: r.incumbentOrigin, greedyRemaining: r.greedyRemaining,
    cycleStops: r.cycleStops, duplicateExpansions: r.duplicateExpansions, remaining: r.remaining, blackRemaining: r.blackRemaining,
    sourceFingerprint: r.sourceFingerprint, jobID: r.jobID, memory: r.memory}, null, 2);
  $('plan').textContent = `${r.plan.length} primitive arrows / ${r.macros.length} macros\n${r.plan.join(' → ') || '(empty incumbent)'}`;
  $('tracePanel').hidden = !r.trace;
  $('trace').textContent = r.trace ? [
    `${r.reason}; ${r.backtracks} backtracks; ${r.cycleStops} cycle stops`,
    'Chosen methods (offsets are arrow macros):',
    ...r.trace.slice(0,32).map(e=>`@${e.atMacro} ${e.task} > ${e.method} ${JSON.stringify(e.estimate)}`),
    ...(r.trace.length>32?[`… ${r.trace.length-32} more chosen records in export`]:[]),
    'Rejected methods / failed branches (bounded sample):',
    ...r.rejected.slice(0,12).map(e=>`${e.task??'bound'}${e.method?` > ${e.method}`:''}: ${e.reason} ${JSON.stringify(e.estimate??e.resources??{})}`),
    ...(r.rejected.length>12?[`… ${r.rejected.length-12} more sampled rejections in export`]:[])
  ].join('\n') : '';
  $('step').disabled = !r.plan.length; $('replay').disabled = !r.plan.length; $('rewind').disabled = false; $('export').disabled = false;
}
function load() {
  cancel(null); stopReplay(); const l=LESSONS.find(l=>l.id===$('scenario').value);
  state = l ? lessonSnapshot(l.id) : fixture($('scenario').value, Number($('seed').value)); source = copy(state); result = null; stepIndex = 0;
  $('lesson').value=l?.id??'';$('lessonCard').hidden=!l;
  if(l) {
    $('lessonName').textContent=l.name;$('lessonConcept').textContent=l.concept;$('lessonTrap').textContent=`Trap: ${l.trap}`;
    $('lessonBudget').textContent=`Witness white groups: ${l.groups.join(' + ')}. Total generated + initial charge: ${l.charge}; real shots: ${l.shots}; remaining: ${l.remaining}. Without merging original white runs: at most ${l.noMergeUpper} shots (optimistic).`;
    $('lessonPrerequisite').textContent=`Prerequisite: ${l.prerequisite??'none'}. ${l.constraint==='no-replace'?'Exact small-state proof: replacement is necessary.':l.id==='08-bastion'?'Analytic minimum 201 macros exceeds the UCT cap 200, not the HTN bound.':''}`;
  }
  for (const id of ['step', 'replay', 'rewind', 'export']) $(id).disabled = true;
  $('tracePanel').hidden=true;
  $('plan').textContent = 'No plan yet.'; $('stats').textContent = 'Worker idle.'; $('status').textContent = 'Frozen snapshot loaded.'; render();
}
function options() {return {policy: $('policy').value, seed: Number($('searchSeed').value),
  ...(Number($('horizon').value) ? {horizon: Number($('horizon').value)} : {}),
  exploration: Number($('exploration').value), maxNodes: Number($('maxNodes').value)};}
function run(extra = {}) {
  cancel(null); stopReplay(); source = copy(state); stepIndex = 0; result = null;
  for (const id of ['step', 'replay', 'rewind', 'export']) $(id).disabled = true;
  const jobID = active = ++serial, sourceFingerprint = fingerprint(source);
  worker?.terminate();
  worker = new Worker($('policy').value === 'htn' ? './htn-worker.mjs' : './worker.mjs', {type: 'module'});
  worker.onmessage = ({data}) => {
    if (data.jobID !== active || (data.sourceFingerprint && data.sourceFingerprint !== sourceFingerprint)) return;
    if (data.type === 'error') { $('status').textContent = data.message; active = null; $('cancel').disabled = true; return; }
    if (data.type !== 'progress' && data.type !== 'result') return;
    showResult(data);
    $('status').textContent = data.type === 'result' ? `Finished: ${data.status}. Replay stays frozen.` : `Searching: ${data.iterations} iterations. Incumbent available.`;
    if (data.type === 'result') { active = null; $('cancel').disabled = true; }
  };
  worker.onerror = event => { $('status').textContent = `Worker error: ${event.message}`; cancel(null); };
  $('status').textContent = 'Searching in worker…'; $('cancel').disabled = false;
  worker.postMessage({type: 'search', jobID, snapshot: source, options: options(), budgetMs: Number($('budget').value), ...extra});
  return jobID;
}
function step() {
  if (!result || stepIndex >= result.plan.length) {stopReplay(); return;}
  cancel(null); act(state, result.plan[stepIndex++]); render();
  $('status').textContent = `Replay arrow ${stepIndex}/${result.plan.length}: ${result.plan[stepIndex - 1]}. No ticks.`;
  if (stepIndex === result.plan.length) {stopReplay(); $('step').disabled = true; $('replay').disabled = true;}
}
$('load').onclick = load; $('run').onclick = () => run(); $('cancel').onclick = () => cancel(); $('step').onclick = step;
$('lesson').onchange=()=>{if($('lesson').value){$('scenario').value=$('lesson').value;load();}};
$('witness').onclick=()=>{
  const id=$('lesson').value;if(!id)return;
  $('scenario').value=id;load();const w=witness(id);
  showResult({...w,type:'oracle',status:'authored witness (not search)',jobID:`oracle-${++serial}`,
    sourceFingerprint:fingerprint(source),options:{policy:'explicit-oracle'},incumbentOrigin:'authored-oracle',
    lesson:id,primitiveCost:w.plan.length,remaining:0,blackRemaining:0});
  $('status').textContent='Explicit authored oracle: reset to its fixture, replaying with the accepted model. Not a search result.';
  timer=setInterval(step,50);$('replay').textContent='Pause replay';
};
$('replay').onclick = () => { if (timer) stopReplay(); else {timer = setInterval(step, 50); $('replay').textContent = 'Pause replay';} };
$('rewind').onclick = () => {cancel(null);stopReplay();state = copy(source);stepIndex = 0;render();$('step').disabled = $('replay').disabled = !result.plan.length;};
for (const kind of ['greedy', 'random']) $(kind).onclick = () => {
  cancel(null);stopReplay();source = copy(state);stepIndex = 0;
  const r = baseline(source, kind, options());
  showResult({...r, type: 'baseline', status: `${kind}: ${r.status}`, jobID: ++serial});
  $('status').textContent = `Legacy ${kind} baseline, one trajectory, horizon ${options().horizon ?? 48}. Not equal-compute MCTS.`;
};
$('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({snapshot: source, result}, null, 2)], {type: 'application/json'}));
  const a = document.createElement('a');a.href = url;a.download = `xorex-plan-${result.jobID}.json`;a.click();setTimeout(() => URL.revokeObjectURL(url), 1000);
};
// Explicit test/inspection surface, not an integration API for the actual game.
window.lab = {run, load, step, cancel, get state() {return copy(state);}, get result() {return result && copy(result);}, get active() {return active;}};
load();
