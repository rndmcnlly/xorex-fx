import { COLORS, createGame, seededRandom, act } from '../03-svg-demake/model.mjs';
import { createKeyboard } from '../03-svg-demake/input.mjs';
import { chooseGamut } from '../04-rendering-lab/motion-playable/palette.mjs';
import { createTape, anticipation, FRAME_MS, nextDeadline } from '../04-rendering-lab/motion-playable/schedule.mjs';
import { createPresentation } from '../04-rendering-lab/motion-playable/presentation.mjs';
import { draw } from '../04-rendering-lab/motion-playable/renderer.mjs';
import { createController, createTabToggle, BUDGET_MS } from './controller.mjs';
import { classifyAction } from '../04-rendering-lab/motion-playable/feedback.mjs';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search), seed = params.get('seed');
// Bounded, opt-in causal evidence, no always-visible logging or UI.
const inspectionTrace = [], TRACE_LIMIT = 1024;
function recordTrace(entry) {
  inspectionTrace.push(entry);
  if (inspectionTrace.length > TRACE_LIMIT) inspectionTrace.shift();
}
function semantic(before, after, command) {
  const replay = structuredClone(before), events = act(replay, command);
  return classifyAction(before, after, command, events);
}
let random, tape, game = null, paused = false, context, actual = 'srgb', worker = null, watchdog = null, watchdogJob = null;
const presentation = createPresentation(seededRandom(0x5f3759df));
let deadline = performance.now() + FRAME_MS;
const reducedPreference = matchMedia('(prefers-reduced-motion: reduce)');
$('reduced').checked = reducedPreference.matches;
reducedPreference.addEventListener('change', event => { $('reduced').checked = event.matches; clearMotion(); });
const probe = space => document.createElement('canvas').getContext('2d', { colorSpace: space })?.getContextAttributes?.().colorSpace ?? 'unreported';
const caps = { cssP3: CSS.supports('color', 'color(display-p3 1 0 0)'), displayP3: matchMedia('(color-gamut: p3)').matches,
  p3Context: probe('display-p3'), srgbContext: probe('srgb'), hdrMediaQuery: matchMedia('(dynamic-range: high)').matches, userAgent: navigator.userAgent };
const moving = () => $('effects').checked && !$('reduced').checked && !$('plain').checked && !document.hidden;
function killWorker() { clearTimeout(watchdog); watchdog = null; watchdogJob = null; worker?.terminate(); worker = null; }
const auto = createController({ profile: params.get('profile') === 'frozen' ? 'frozen' : 'live', read: () => game, perform,
  observe: params.has('inspect') ? entry => {
    if (entry.type === 'action') {
      entry.feedback = semantic(entry.before, entry.after, entry.command);
      entry.expectedFeedback = semantic(entry.expectedBefore, entry.expectedAfter, entry.command);
    }
    recordTrace(entry);
  } : undefined,
  send(message) {
    if (!worker) {
      worker = new Worker(new URL('../05-autoplay-lab/htn-worker.mjs', import.meta.url), { type: 'module' });
      const owner = worker;
      worker.onmessage = event => {
        if (event.data.jobID === watchdogJob && ['result', 'error'].includes(event.data.type)) {
          clearTimeout(watchdog); watchdog = null; watchdogJob = null;
        }
        auto.receive(event.data); updateText();
      };
      worker.onerror = event => {
        event.preventDefault();
        if (worker !== owner) return;
        setAuto(false); $('auto-status').textContent = 'Worker failed: manual play remains available.';
      };
    }
    worker.postMessage(message);
    clearTimeout(watchdog); watchdogJob = message.jobID;
    watchdog = setTimeout(() => { auto.expire(message.jobID); updateText(); }, BUDGET_MS);
  },
  // Termination also bounds supersession when an indivisible planner chunk overruns.
  cancel() { killWorker(); },
});
function selectContext() {
  const wanted = chooseGamut($('gamut').value, caps);
  if (!context || actual !== wanted) {
    const canvas = document.createElement('canvas'); canvas.id = 'board'; canvas.width = 800; canvas.height = 600;
    canvas.setAttribute('aria-label', '20-lane game board');
    context = canvas.getContext('2d', { colorSpace: wanted });
    if (!context) throw Error('Canvas 2D unavailable');
    actual = context.getContextAttributes?.().colorSpace ?? 'unreported'; $('board').replaceWith(canvas);
  }
  render();
}
function render(now = performance.now()) {
  const warnings = tape && !paused && !document.hidden && game && !game.lost ? anticipation(tape.preview(), deadline, now) : new Map();
  draw(context, game, actual === 'display-p3' ? actual : 'srgb', presentation, now,
    { plain: $('plain').checked, motion: moving(), intensity: Number($('intensity').value), warnings });
}
function updateText() {
  const energy = e => e.n ? `${e.n} ${e.color}` : 'empty';
  const mode = !game ? 'Ready' : game.lost ? 'Game over' : document.hidden ? 'Hidden: suspended' : paused ? 'Developer pause' : 'Playing';
  $('status').textContent = game ? `${mode} · Lane ${game.pos + 1} · Held: ${energy(game.inventory)} · Charge: ${energy(game.capacitor)}` : 'Ready. Up or Down starts. Audio off.';
  const a = auto.status(); $('auto').checked = a.enabled;
  $('auto-status').textContent = `${a.enabled ? 'AUTO' : 'Manual'} · ${a.note}${a.planning && a.queued ? ' + planning' : ''} · HTN ${a.profile} / 1 second · ${a.queued} queued${a.sourceAgeMs === null ? '' : ` · source ${(a.sourceAgeMs / 1000).toFixed(1)}s old`}`;
  $('capability').textContent = `Active canvas: ${actual}. Display P3 query: ${caps.displayP3}. SDR output, no HDR. ${actual !== 'display-p3' && $('gamut').value === 'display-p3' ? 'Explicit sRGB fallback.' : ''}`;
  $('caps').textContent = JSON.stringify({ ...caps, requested: $('gamut').value, activeContext: actual, output: 'SDR', rngLookaheadFrames: 3 }, null, 2);
  $('debug').textContent = game ? `Frame ${game.frames}\nLane lengths: ${game.lanes.map(l => l.length).join(' ')}\n${JSON.stringify({ inventory: game.inventory, capacitor: game.capacitor })}\n${JSON.stringify(a)}` : 'No game yet';
  $('pause').disabled = !game || game.lost; $('pause').textContent = paused ? 'Resume (developer)' : 'Pause (developer)';
  $('step').disabled = !paused || !game || game.lost;
}
function start() {
  auto.suspend('Waiting for new game snapshot'); killWorker();
  random = seed === null ? Math.random : seededRandom(Number(seed));
  game = createGame(random); tape = createTape(random); paused = false;
  presentation.clearMemories(); presentation.clear(game.pos); keyboard.clear(); tab.clear();
  deadline = performance.now() + FRAME_MS;
  $('overlay').hidden = true; $('stage').focus(); updateText(); render();
}
function perform(command) {
  const before = structuredClone(game), events = act(game, command), now = performance.now();
  if (params.has('inspect') && !auto.status().enabled) recordTrace({ type: 'manual-action', at: now, command,
    before, after: structuredClone(game), feedback: classifyAction(before, game, command, events) });
  presentation.action(before, game, command, events, now, moving());
  updateText(); render(now);
}
function setAuto(value) {
  auto.enable(value);
  if (!value) killWorker();
  if (value && (!game || game.lost)) start();
  updateText();
}
const keyboard = createKeyboard({ mode: () => !game || game.lost ? 'ready' : paused || document.hidden ? 'blocked' : 'playing', start,
  action: command => { auto.manual(); killWorker(); perform(command); } });
const tab = createTabToggle(() => setAuto(!auto.status().enabled));
const gameFocus = () => document.activeElement === document.body || document.activeElement === $('stage') || document.activeElement === $('board');
window.addEventListener('keydown', event => {
  if (tab.down(event, gameFocus())) return;
  if (!gameFocus()) return;
  // Even an arrow during pause/ready takes ownership, without phantom gameplay.
  if (event.key.startsWith('Arrow') && auto.status().enabled) { auto.manual(); killWorker(); updateText(); }
  keyboard.down(event);
});
window.addEventListener('keyup', event => { keyboard.up(event); tab.up(event); });
window.addEventListener('blur', () => { keyboard.clear(); tab.clear(); auto.suspend('Focus lost'); killWorker(); });
document.addEventListener('visibilitychange', () => {
  keyboard.clear(); tab.clear(); auto.suspend(document.hidden ? 'Hidden: suspended' : 'Waiting for fresh snapshot'); killWorker();
  presentation.clear(game?.pos ?? 0); deadline = performance.now() + FRAME_MS; updateText(); render();
});
function clearMotion() { presentation.clear(game?.pos ?? 0, true); render(); }
$('start').onclick = start;
$('restart').onclick = start;
$('auto').onchange = () => setAuto($('auto').checked);
$('rate').oninput = () => { auto.setRate($('rate').value); $('rate-value').value = $('rate').value; };
$('gamut').onchange = () => { selectContext(); updateText(); };
for (const id of ['effects', 'reduced', 'plain']) $(id).onchange = clearMotion;
$('intensity').oninput = () => render();
$('pause').onclick = () => { paused = !paused; auto.suspend(paused ? 'Developer pause' : 'Waiting for fresh snapshot'); killWorker(); keyboard.clear(); deadline = performance.now() + FRAME_MS; clearMotion(); updateText(); $('stage').focus(); };
$('step').onclick = () => { if (paused) advance(performance.now()); };
function advance(now) {
  if (!game || game.lost) return;
  const warning = anticipation(tape.preview(), deadline, now).get(tape.preview()[0].lane) ?? 0;
  const { lane } = tape.commit(game);
  if (lane !== null && moving()) presentation.arrival(lane, now, warning);
  if (game.lost) {
    auto.enable(false); killWorker();
    $('overlay').hidden = false; $('heading').textContent = 'Stability lost';
    $('message').textContent = `A lane exceeded 14 gems after ${game.frames} frames. Final state retained.`; $('start').textContent = 'Play again';
  }
  updateText(); render(now);
}
function pulse() {
  const now = performance.now();
  if (now >= deadline) {
    if (!paused && !document.hidden) advance(now);
    deadline = nextDeadline(deadline, now);
  }
  setTimeout(pulse, Math.max(1, deadline - performance.now()));
}
setTimeout(pulse, FRAME_MS);
function animate(now) {
  if (!document.hidden) {
    // One primitive at most per presented frame; missed beats never catch up.
    auto.pulse(now, !paused && document.hasFocus());
    presentation.cleanup(now); render(now); updateText();
  }
  requestAnimationFrame(animate);
}
$('seed-note').textContent = seed === null ? 'Live Math.random. Three-frame RNG tape. Independent visual RNG. Hidden tabs suspend.' : `Mulberry32 seed ${seed}. Three-frame RNG tape. Hidden tabs suspend.`;
selectContext(); updateText(); requestAnimationFrame(animate);
if (params.has('inspect')) window.autoplayInspection = {
  exportTrace: () => structuredClone(inspectionTrace), clearTrace: () => { inspectionTrace.length = 0; },
  exportState: () => structuredClone(game), capabilities: () => ({ ...caps, activeContext: actual }),
  controller: () => auto.status(), metrics: () => ({ ...presentation.metrics(performance.now()), memories: presentation.memories(performance.now()) }),
  loadFixture(state) {
    if (state.lanes?.length !== 20 || !state.lanes.every(l => Array.isArray(l) && l.length <= 1000 && l.every(c => Object.hasOwn(COLORS, c))) || !Number.isInteger(state.pos) || state.pos < 0 || state.pos >= 20 ||
      ![state.inventory, state.capacitor].every(e => e && Number.isInteger(e.n) && e.n >= 0 && e.n <= 10000 && (e.n === 0 ? e.color === null : Object.hasOwn(COLORS, e.color))) || !Number.isInteger(state.frames) || state.frames < 0 || typeof state.lost !== 'boolean') throw Error('Invalid fixture');
    auto.enable(false); killWorker(); game = structuredClone(state); random = seededRandom(Number(seed ?? 2009)); tape = createTape(random);
    presentation.clearMemories(); paused = false; keyboard.clear(); presentation.clear(game.pos); deadline = performance.now() + FRAME_MS;
    $('overlay').hidden = true; updateText(); render();
  },
};
