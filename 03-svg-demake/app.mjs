import { RULES, COLORS, createGame, seededRandom, tick, act } from './model.mjs';
import { createKeyboard } from './input.mjs';
import { drawState, shipFilter } from './view.mjs';

const $ = id => document.getElementById(id);
$('board').innerHTML = `<defs>${shipFilter}</defs><g id="orbs"></g><g id="ship"></g>`;
const seed = new URLSearchParams(location.search).get('seed');
let random = seed === null ? Math.random : seededRandom(Number(seed));
let game = null;
let paused = false;
const music = new Audio('../01-ruffle/sound/thoracks-phase.mp3');
music.loop = true;
music.volume = 0.5;
const sounds = Object.fromEntries(['logo', 'fire', 'gather', 'fizzle', 'synth', 'infest', 'compact'].map(name => [name, new Audio(`../01-ruffle/sound/${name === 'synth' ? 'synthesize' : name}.mp3`)]));

function play(events) {
  if (!$('sound').checked) return;
  for (const event of events) {
    // Independent instances let rapid actions overlap rather than cutting each other off.
    const voice = sounds[event].cloneNode();
    voice.volume = 0.6;
    voice.play().catch(() => {}); // Browser autoplay restrictions must never block input.
  }
}
function start() {
  if (seed !== null) random = seededRandom(Number(seed));
  game = createGame(random);
  paused = false;
  $('overlay').hidden = true;
  $('pause').disabled = false;
  $('pause').textContent = 'Pause (developer)';
  $('step').disabled = true;
  $('stage').focus();
  render();
  // Presentation never gates the keyboard or authoritative state.
  for (const [id, offset] of [['orbs', -150], ['ship', 150]]) {
    $(id).getAnimations().forEach(animation => animation.cancel());
    $(id).animate([{ transform: `translateY(${offset}px)` }, { transform: 'translateY(0)' }],
      { duration: 2000, easing: 'cubic-bezier(.215, .61, .355, 1)' });
  }
}
const keyboard = createKeyboard({
  mode: () => !game || game.lost ? 'ready' : paused || document.hidden ? 'blocked' : 'playing',
  start,
  action: command => { play(act(game, command)); render(); },
});
window.addEventListener('keydown', event => {
  // Let ordinary UI controls retain their keyboard interaction.
  if (['INPUT', 'BUTTON', 'SUMMARY', 'A'].includes(document.activeElement?.tagName)) return;
  keyboard.down(event);
});
window.addEventListener('keyup', keyboard.up);
window.addEventListener('blur', keyboard.clear);
document.addEventListener('visibilitychange', () => { keyboard.clear(); render(); });
$('start').onclick = start;
$('overlay').onclick = event => { if (!event.target.closest('button')) start(); };
$('original-art').animate([{ transform: 'scale(10)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
  { duration: 1000, easing: 'cubic-bezier(.215, .61, .355, 1)' });
$('music').onchange = () => {
  if ($('music').checked) music.play().catch(() => { $('music').checked = false; });
  else music.pause();
};
$('pause').onclick = () => {
  paused = !paused;
  keyboard.clear();
  $('pause').textContent = paused ? 'Resume (developer)' : 'Pause (developer)';
  $('step').disabled = !paused;
  $('stage').focus();
  render();
};
$('step').onclick = () => { if (paused) advance(); };

function advance() {
  if (!game || game.lost) return;
  play(tick(game, random));
  if (game.lost) {
    $('original-art').src = 'assets/termination/1.svg';
    $('overlay').hidden = false;
    $('heading').textContent = 'Stability lost';
    $('message').textContent = `A lane exceeded 14 gems after ${game.frames} simulation frames. The final board remains behind this panel.`;
    $('start').textContent = 'Play again';
    $('pause').disabled = true;
    $('step').disabled = true;
  }
  render();
}
// Deadline scheduling preserves fractional milliseconds at 30 Hz, independently
// of monitor refresh. At most one trial per callback: never replay a backlog.
const frameDuration = 1000 / RULES.fps;
let deadline = performance.now() + frameDuration;
function pulse() {
  const now = performance.now();
  if (now >= deadline) {
    if (!paused && !document.hidden) advance();
    deadline += frameDuration;
    if (deadline <= now) deadline = now + frameDuration;
  }
  setTimeout(pulse, Math.max(1, deadline - performance.now()));
}
setTimeout(pulse, frameDuration);

function render() {
  if (!game) return;
  const drawing = drawState(game);
  // A narrow filter surface saves work, but large inventory rings must expand
  // it. Do not crop a ring's glow merely because the ship itself is narrow.
  const extent = Math.max(70, (game.inventory.n + 1) * 6 + 16);
  const x = game.pos * 40 + 20;
  const left = Math.max(-extent, -x - 32), right = Math.min(extent, 800 - x + 32);
  $('ship-glow').setAttribute('x', left);
  $('ship-glow').setAttribute('width', right - left);
  $('orbs').innerHTML = drawing.orbs;
  $('ship').innerHTML = drawing.ship;
  const energy = e => e.n ? `${e.n} ${e.color}` : 'empty';
  const mode = game.lost ? 'Game over' : document.hidden ? 'Hidden: suspended' : paused ? 'Developer pause' : 'Playing';
  $('status').textContent = `${mode} · Lane ${game.pos + 1} · Held: ${energy(game.inventory)} · Charge: ${energy(game.capacitor)}`;
  $('debug').textContent = `Frame ${game.frames}\nLane lengths: ${game.lanes.map(l => l.length).join(' ')}\nInventory: ${JSON.stringify(game.inventory)}\nCapacitor: ${JSON.stringify(game.capacitor)}`;
}
$('seed-note').textContent = seed === null ? 'Live randomness: browser Math.random. Add ?seed=123 for a repeatable fixture (Mulberry32).' : `Seeded fixture: ${Number(seed)} (Mulberry32, not original Flash randomness). Restart repeats this fixture.`;

// Explicit opt-in inspection surface, never enabled by normal play. Fixtures
// are paused snapshots, not another route for gameplay actions or randomness.
if (new URLSearchParams(location.search).has('inspect')) {
  window.xorexInspection = {
    exportState: () => structuredClone(game),
    loadFixture(state) {
      if (state.lanes?.length !== 20 || !state.lanes.every(l => Array.isArray(l) && l.every(c => c in COLORS)) ||
          !Number.isInteger(state.pos) || state.pos < 0 || state.pos >= 20 ||
          ![state.inventory, state.capacitor].every(e => e && Number.isInteger(e.n) && e.n >= 0 && e.n <= 10000 && (e.n === 0 || e.color in COLORS))) {
        throw new Error('Invalid visual fixture');
      }
      game = structuredClone(state);
      paused = true;
      keyboard.clear();
      $('overlay').hidden = true;
      $('pause').disabled = false;
      $('pause').textContent = 'Resume (developer)';
      $('step').disabled = false;
      for (const id of ['orbs', 'ship']) $(id).getAnimations().forEach(animation => animation.cancel());
      render();
    },
  };
}
