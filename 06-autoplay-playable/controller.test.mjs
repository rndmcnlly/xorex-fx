import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, seededRandom, act } from '../03-svg-demake/model.mjs';
import { createController, reconcile, dependencies, validStep, project, createTabToggle, JOURNAL_LIMIT } from './controller.mjs';
import { fingerprint } from '../05-autoplay-lab/sim.mjs';

function empty() { return createGame(seededRandom(7), 0); }
function harness(state = empty()) {
  let time = 0;
  const sent = [], cancelled = [], actions = [];
  const controller = createController({ read: () => state, now: () => time,
    perform(command) { actions.push(command); act(state, command); },
    send(message) { sent.push(structuredClone(message)); }, cancel(id) { cancelled.push(id); } });
  function pulse(t) { time = t; controller.pulse(t); }
  function result(plan, extra = {}, request = sent.at(-1)) {
    return controller.receive({ type: 'result', jobID: request.jobID, sourceFingerprint: fingerprint(request.snapshot), plan, ...extra });
  }
  controller.enable(true); pulse(0);
  return { state, sent, cancelled, actions, controller, pulse, result };
}

test('each request owns its immutable snapshot, matching job and fingerprint are mandatory', () => {
  const h = harness(); const request = structuredClone(h.sent[0]);
  assert.equal(request.sourceFingerprint, fingerprint(request.snapshot));
  h.state.lanes[19].push('red');
  assert.deepEqual(h.sent[0], request);
  assert.equal(h.result(['down'], { jobID: 999 }), false);
  assert.equal(h.result(['down'], { sourceFingerprint: 'wrong' }), false);
  assert.equal(h.actions.length, 0);
  h.pulse(1000);
  assert.deepEqual(h.cancelled, [request.jobID]);
  assert.equal(h.result(['right'], {}, request), false);
  assert.equal(h.sent[1].budgetMs, 1000);
  assert.equal(h.sent.length, 2);
});

test('finite pacing: no full-plan burst, no catch-up, adjustable 8–30 arrows/s', () => {
  const h = harness(); h.result(Array(12).fill('up'));
  h.pulse(1); h.pulse(2); h.pulse(50);
  assert.equal(h.actions.length, 1);
  h.pulse(90); assert.equal(h.actions.length, 2);
  h.pulse(900); assert.equal(h.actions.length, 3);
  h.controller.setRate(100); assert.equal(h.controller.status().rate, 30);
  h.controller.setRate(1); assert.equal(h.controller.status().rate, 8);
});

test('unrelated lane arrivals allow a good vertical plan, relevant lane arrivals stop it', () => {
  const s = empty(); s.lanes[s.pos] = ['red'];
  const h = harness(s); h.result(['down', 'down']);
  h.state.lanes[(s.pos + 1) % 20].unshift('blue'); h.state.frames++;
  h.pulse(1); assert.equal(s.inventory.color, 'red');
  h.state.lanes[s.pos].unshift('green');
  h.pulse(100); assert.equal(h.actions.length, 1);
  assert.equal(h.controller.status().invalidated, 1);
  assert.equal(h.controller.status().queued, 0);
  h.pulse(999); assert.equal(h.sent.length, 1);
  h.pulse(1000); assert.equal(h.sent.length, 2);
});

test('lateral travel ignores all lanes, but not position or stores', () => {
  const s = empty(), expected = structuredClone(s);
  for (const lane of s.lanes) lane.push('black');
  assert.equal(validStep(expected, s, 'right'), true);
  s.inventory = { color: 'white', n: 1 };
  assert.equal(validStep(expected, s, 'right'), false);
  s.inventory = { color: null, n: 0 }; s.pos++;
  assert.equal(validStep(expected, s, 'right'), false);
});

test('local position, held color/count, cap color/count, lost state are exact preconditions', () => {
  const s = empty(); s.lanes[s.pos] = ['green'];
  s.inventory = { color: 'red', n: 2 }; s.capacitor = { color: 'blue', n: 3 };
  for (const change of [x => x.pos = (x.pos + 1) % 20, x => x.inventory.n++, x => x.inventory.color = 'white',
    x => x.capacitor.n++, x => x.capacitor.color = 'green', x => x.lost = true]) {
    const live = structuredClone(s); change(live);
    assert.equal(validStep(s, live, 'down'), false);
  }
});

test('actual model projections preserve legal mismatch, empty shot and blocked/noop semantics', () => {
  const s = empty(); s.inventory = { color: 'red', n: 2 }; s.capacitor = { color: 'blue', n: 4 };
  const h = harness(s); h.result(['down', 'up', 'down']);
  h.pulse(1); assert.deepEqual(s.inventory, { color: null, n: 0 }); assert.equal(s.capacitor.n, 0);
  h.pulse(100); h.pulse(200); assert.equal(h.actions.length, 3); assert.equal(h.controller.status().invalidated, 0);
  const shot = empty(); shot.capacitor = { color: 'white', n: 1 };
  assert.equal(project(shot, 'up').capacitor.n, 0);
  assert.equal(shot.capacitor.n, 1);
});

test('matching actual primitive prefix rebases a returning plan without replaying old root', () => {
  const s = empty(); s.lanes[s.pos] = Array(12).fill('black'); s.capacitor = { color: 'green', n: 12 };
  const h = harness(s); h.result(Array(12).fill('up'));
  h.pulse(1); h.pulse(1000); // New snapshot, then old executor shoots during the job.
  assert.equal(h.controller.status().journalLength, 1);
  assert.equal(h.result(Array(11).fill('up')), true);
  assert.equal(h.controller.status().queued, 10);
  assert.equal(h.controller.status().rebased, 1);
  h.pulse(1100); assert.equal(s.capacitor.n, 9);
});

test('nonmatching response prefix is discarded while a still-valid old plan continues', () => {
  const s = empty(); s.capacitor = { color: 'green', n: 12 };
  const h = harness(s); h.result(Array(12).fill('up')); h.pulse(1); h.pulse(1000);
  const queued = h.controller.status().queued;
  assert.equal(h.result(['right', 'up']), false);
  assert.equal(h.controller.status().queued, queued);
  h.pulse(1100); assert.equal(h.actions.length, 3);
});

test('matching command alone cannot rebase a changed semantic gather', () => {
  const root = empty(); root.lanes[root.pos] = ['red'];
  const live = structuredClone(root); live.lanes[live.pos] = ['white'];
  const record = { command: 'down', before: dependencies(live, 'down') }; act(live, 'down');
  assert.equal(reconcile(root, ['down', 'down'], [record], live), null);
  assert.equal(reconcile(root, ['down'], Array(JOURNAL_LIMIT + 1).fill(record), live), null);
});

test('progress plan and final result can be reconciled with intervening execution', () => {
  const h = harness(); const r = h.sent[0];
  assert.equal(h.result(['up', 'up'], { type: 'progress' }), true); h.pulse(1);
  assert.equal(h.result(['up', 'up', 'up'], {}, r), true);
  assert.equal(h.controller.status().queued, 2);
});

test('manual/off clears jobs and plans without changing game, late result cannot reclaim control', () => {
  const h = harness(); h.result(['right', 'down'], { type: 'progress' });
  const before = structuredClone(h.state); h.controller.manual(); h.pulse(1000);
  assert.deepEqual(h.state, before); assert.equal(h.controller.status().enabled, false);
  assert.equal(h.controller.status().queued, 0); assert.equal(h.result(['up']), false);
  assert.equal(h.cancelled.length, 1);
});

test('reset, hidden, focus loss and developer pause suspend in-flight work with fresh resumption', () => {
  for (const reason of ['reset', 'hidden', 'focus loss', 'developer pause']) {
    const h = harness(); h.result(['up'], { type: 'progress' }); h.controller.suspend(reason);
    assert.equal(h.controller.status().queued, 0); assert.equal(h.controller.status().planning, false);
    assert.equal(h.controller.status().enabled, true);
    h.controller.pulse(1000, false); assert.equal(h.sent.length, 1);
    h.pulse(1100); assert.equal(h.sent.length, 2);
  }
});

test('loss never executes a pending arrow', () => {
  const h = harness(); h.result(['up']); h.state.lost = true; h.pulse(100);
  assert.equal(h.actions.length, 0);
});

test('watchdog expires only its own job, retaining an already validated usable prefix', () => {
  const h = harness(); const id = h.sent[0].jobID;
  h.result(['up', 'up'], { type: 'progress' });
  h.controller.expire(id + 1); assert.equal(h.controller.status().planning, true);
  h.controller.expire(id); assert.equal(h.controller.status().planning, false);
  assert.equal(h.controller.status().queued, 2); assert.equal(h.cancelled.length, 1);
  assert.equal(h.result(['right']), false);
  h.pulse(1); assert.deepEqual(h.actions, ['up']);
});

test('Tab uses a single edge, ignores repeat, native form navigation is untouched', () => {
  let toggles = 0, prevented = 0;
  const tab = createTabToggle(() => toggles++), event = { key: 'Tab', repeat: false, preventDefault() { prevented++; } };
  tab.down(event, true); tab.down(event, true); tab.down({ ...event, repeat: true }, true);
  assert.equal(toggles, 1); assert.equal(prevented, 3);
  tab.up(event); assert.equal(tab.down(event, false), false);
  assert.equal(prevented, 3); assert.equal(toggles, 1);
  tab.down(event, true); assert.equal(toggles, 2);
  tab.clear(); tab.down(event, true); assert.equal(toggles, 3);
  tab.clear(); assert.equal(tab.down({ ...event, shiftKey: true }, true), false);
  assert.equal(toggles, 3); assert.equal(prevented, 5);
});

test('reconciliation and response arrays cannot alias the worker input or accepted plan', () => {
  const h = harness(), commands = ['up', 'up']; h.result(commands);
  commands[0] = 'right'; h.sent[0].snapshot.pos = 19;
  h.pulse(1); assert.deepEqual(h.actions, ['up']);
});

test('late delivery beyond budget cannot install a plan even before the next request callback', () => {
  let time = 0; const state = empty(), sent = [], killed = [];
  const c = createController({ read: () => state, perform: command => act(state, command), now: () => time,
    send: message => sent.push(message), cancel: id => killed.push(id) });
  c.enable(true); c.pulse(0); time = 1001;
  assert.equal(c.receive({ type: 'result', jobID: sent[0].jobID, sourceFingerprint: fingerprint(sent[0].snapshot), plan: ['down'] }), false);
  assert.equal(c.status().queued, 0); assert.equal(c.status().planning, false); assert.equal(killed.length, 1);
});

test('fresh job results tolerate unrelated arrivals while related changes reject before first execution', () => {
  const root = empty(); root.lanes[root.pos] = ['red'];
  const h = harness(root); h.state.lanes[(root.pos + 1) % 20].unshift('green');
  assert.equal(h.result(['down']), true); h.pulse(1); assert.equal(root.inventory.color, 'red');
  const other = harness(); other.state.lanes[other.state.pos].unshift('white');
  assert.equal(other.result(['down']), false); other.pulse(1); assert.equal(other.actions.length, 0);
});
