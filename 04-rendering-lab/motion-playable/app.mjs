import { COLORS, createGame, seededRandom, act } from '../../03-svg-demake/model.mjs';
import { createKeyboard } from '../../03-svg-demake/input.mjs';
import { chooseGamut } from './palette.mjs';
import { createTape, anticipation, FRAME_MS, nextDeadline } from './schedule.mjs';
import { createPresentation } from './presentation.mjs';
import { draw } from './renderer.mjs';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search), seed = params.get('seed');
let random, tape, game = null, paused = false, context, actual = 'srgb';
// Independent deterministic visual stream: dust/effect counts never perturb spawns.
const presentation = createPresentation(seededRandom(0x5f3759df));
let deadline = performance.now() + FRAME_MS;
const reducedPreference = matchMedia('(prefers-reduced-motion: reduce)');
$('reduced').checked = reducedPreference.matches;
reducedPreference.addEventListener('change', event => { $('reduced').checked = event.matches; clearMotion(); });
const probe = space => document.createElement('canvas').getContext('2d', { colorSpace: space })?.getContextAttributes?.().colorSpace ?? 'unreported';
const caps = { cssP3: CSS.supports('color', 'color(display-p3 1 0 0)'), displayP3: matchMedia('(color-gamut: p3)').matches,
  p3Context: probe('display-p3'), srgbContext: probe('srgb'), hdrMediaQuery: matchMedia('(dynamic-range: high)').matches, userAgent: navigator.userAgent };
const moving = () => $('effects').checked && !$('reduced').checked && !$('plain').checked && !document.hidden;
function selectContext() {
  const wanted = chooseGamut($('gamut').value, caps);
  if (!context || actual !== wanted) {
    const canvas = document.createElement('canvas'); canvas.id = 'board'; canvas.width = 800; canvas.height = 600;
    canvas.setAttribute('aria-label', '20-lane game board');
    context = canvas.getContext('2d', { colorSpace: wanted });
    if (!context) throw Error('Canvas 2D unavailable');
    actual = context.getContextAttributes?.().colorSpace ?? 'unreported';
    $('board').replaceWith(canvas);
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
  $('capability').textContent = `Active canvas: ${actual}. Display P3 query: ${caps.displayP3}. SDR output, no HDR. ${actual !== 'display-p3' && $('gamut').value === 'display-p3' ? 'Explicit sRGB fallback.' : ''}`;
  $('caps').textContent = JSON.stringify({ ...caps, requested: $('gamut').value, activeContext: actual, output: 'SDR', rngLookaheadFrames: 3 }, null, 2);
  $('debug').textContent = game ? `Frame ${game.frames}\nLane lengths: ${game.lanes.map(l => l.length).join(' ')}\n${JSON.stringify({ inventory: game.inventory, capacitor: game.capacitor })}` : 'No game yet';
  $('pause').disabled = !game || game.lost; $('pause').textContent = paused ? 'Resume (developer)' : 'Pause (developer)';
  $('step').disabled = !paused || !game || game.lost;
}
function start() {
  random = seed === null ? Math.random : seededRandom(Number(seed));
  game = createGame(random); tape = createTape(random); paused = false;
  presentation.clearMemories();
  deadline = performance.now() + FRAME_MS; presentation.clear(game.pos);
  $('overlay').hidden = true; $('stage').focus(); updateText(); render();
}
const keyboard = createKeyboard({ mode: () => !game || game.lost ? 'ready' : paused || document.hidden ? 'blocked' : 'playing', start,
  action: command => {
    const before = structuredClone(game), events = act(game, command), now = performance.now();
    presentation.action(before, game, command, events, now, moving());
    updateText(); render(now);
  } });
window.addEventListener('keydown', event => { if (!['INPUT', 'SELECT', 'BUTTON', 'SUMMARY', 'A'].includes(document.activeElement?.tagName)) keyboard.down(event); });
window.addEventListener('keyup', keyboard.up);
window.addEventListener('blur', keyboard.clear);
document.addEventListener('visibilitychange', () => {
  keyboard.clear(); presentation.clear(game?.pos ?? 0); deadline = performance.now() + FRAME_MS; updateText(); render();
});
function clearMotion() { presentation.clear(game?.pos ?? 0, true); render(); }
$('start').onclick = start;
$('gamut').onchange = () => { selectContext(); updateText(); $('stage').focus(); };
for (const id of ['effects', 'reduced', 'plain']) $(id).onchange = () => { clearMotion(); $('stage').focus(); };
$('intensity').oninput = () => render();
$('pause').onclick = () => { paused = !paused; keyboard.clear(); deadline = performance.now() + FRAME_MS; clearMotion(); updateText(); $('stage').focus(); };
$('step').onclick = () => { if (paused) advance(performance.now()); };
function advance(now) {
  if (!game || game.lost) return;
  const warning = anticipation(tape.preview(), deadline, now).get(tape.preview()[0].lane) ?? 0;
  const { lane } = tape.commit(game);
  if (lane !== null && moving()) presentation.arrival(lane, now, warning);
  if (game.lost) {
    $('overlay').hidden = false; $('heading').textContent = 'Stability lost';
    $('message').textContent = `A lane exceeded 14 gems after ${game.frames} frames. Final state retained.`; $('start').textContent = 'Play again';
  }
  updateText(); render(now);
}
// Independent 30 Hz timer, one trial per delivered deadline, no hidden catch-up.
function pulse() {
  const now = performance.now();
  if (now >= deadline) {
    if (!paused && !document.hidden) advance(now);
    deadline = nextDeadline(deadline, now);
  }
  setTimeout(pulse, Math.max(1, deadline - performance.now()));
}
setTimeout(pulse, FRAME_MS);
function animate(now) { if (!document.hidden) { presentation.cleanup(now); render(now); } requestAnimationFrame(animate); }
$('seed-note').textContent = seed === null ? 'Live Math.random. RNG-only three-frame lookahead. Separate visual RNG. Hidden tabs suspend.' : `Mulberry32 seed ${seed}, not original Flash randomness. Three-frame RNG tape.`;
selectContext(); updateText(); requestAnimationFrame(animate);
if (params.has('inspect')) window.motionInspection = {
  exportState: () => structuredClone(game), capabilities: () => ({ ...caps, activeContext: actual }),
  metrics: () => { const now = performance.now(); return { ...presentation.metrics(now),
    feedback: presentation.annotation(now),
    memories: presentation.memories(now),
    actionEffects: presentation.effects(now).filter(e => !['arrival', 'rubble'].includes(e.kind)).length,
    rubble: presentation.effects(now).filter(e => e.kind === 'rubble').length }; },
  preview: () => tape?.preview(),
  loadFixture(state) {
    if (state.lanes?.length !== 20 || !state.lanes.every(l => Array.isArray(l) && l.length <= 1000 && l.every(c => Object.hasOwn(COLORS, c))) || !Number.isInteger(state.pos) || state.pos < 0 || state.pos >= 20 ||
      ![state.inventory, state.capacitor].every(e => e && Number.isInteger(e.n) && e.n >= 0 && e.n <= 10000 && (e.n === 0 ? e.color === null : Object.hasOwn(COLORS, e.color))) || !Number.isInteger(state.frames) || state.frames < 0 || typeof state.lost !== 'boolean') throw Error('Invalid fixture');
    game = structuredClone(state); random = seededRandom(Number(seed ?? 2009)); tape = createTape(random);
    presentation.clearMemories();
    paused = true; keyboard.clear(); presentation.clear(game.pos); deadline = performance.now() + FRAME_MS;
    $('overlay').hidden = true; updateText(); render();
  },
};
