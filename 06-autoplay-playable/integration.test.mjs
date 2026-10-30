import test from 'node:test';
import assert from 'node:assert/strict';
import { frozenCase } from './diagnosis.mjs';
import { createGame, seededRandom, act } from '../03-svg-demake/model.mjs';
import { createController } from './controller.mjs';
import { fingerprint } from '../05-autoplay-lab/sim.mjs';
import { classifyAction } from '../04-rendering-lab/motion-playable/feedback.mjs';

test('real HTN natural plans execute every expanded arrow exactly, including any planned store destruction', () => {
  for (const seed of [1, 7, 42, 2009]) {
    const result = frozenCase(seed);
    // Preserve conformance, not the current policy's poor conversion choices.
    for (const mismatch of result.mismatches) {
      const actual = result.trace.find(e => e.type === 'action' && e.index === mismatch.index);
      assert.deepEqual(actual.before, mismatch.before);
      assert.deepEqual(actual.after, mismatch.after);
    }
    assert.equal(result.result.status, 'clear');
    assert.equal(result.controller.executed, result.result.plan.length);
  }
});

test('every held/charge color combination keeps actual and expected semantic branches identical', () => {
  const colors = ['red', 'green', 'blue', 'yellow', 'pink', 'white'];
  for (const held of colors) for (const charge of [null, ...colors]) {
    const state = createGame(seededRandom(7), 0), sent = [], trace = [];
    state.inventory = { color: held, n: 2 }; state.capacitor = { color: charge, n: charge ? 3 : 0 };
    const c = createController({ read: () => state, perform: command => act(state, command),
      send: message => sent.push(message), cancel() {}, now: () => 0, observe: entry => trace.push(entry) });
    c.enable(true); c.pulse(0);
    c.receive({ type: 'result', jobID: sent[0].jobID, sourceFingerprint: fingerprint(sent[0].snapshot), plan: ['down'] });
    c.pulse(1);
    const e = trace.find(e => e.type === 'action');
    assert.deepEqual(e.after, e.expectedAfter);
    const events = act(structuredClone(e.before), 'down');
    const kind = classifyAction(e.before, e.after, 'down', events).kind;
    const expected = !charge ? held === 'white' ? 'white-stored' : 'new-charge'
      : held === charge ? held === 'white' ? 'white-stored' : 'matching-reload'
      : held === 'white' ? 'white-boost' : 'mismatch';
    assert.equal(kind, expected, `${held} into ${charge}`);
    assert.equal(e.postconditionMatches, true);
  }
});

test('inspection evidence is detached and a genuinely miswired perform path fails its postcondition', () => {
  const state = createGame(seededRandom(7), 0), sent = [], trace = [];
  state.pos = 10;
  const c = createController({ read: () => state, perform: () => act(state, 'left'),
    send: message => sent.push(message), cancel() {}, now: () => 0,
    observe: entry => { trace.push(structuredClone(entry)); if (entry.snapshot) entry.snapshot.pos = 19; } });
  c.enable(true); c.pulse(0);
  assert.equal(sent[0].snapshot.pos, 10);
  c.receive({ type: 'result', jobID: sent[0].jobID, sourceFingerprint: sent[0].sourceFingerprint, plan: ['right'] });
  c.pulse(1);
  assert.equal(trace.find(e => e.type === 'action').postconditionMatches, false);
  assert.equal(c.status().invalidated, 1);
  assert.equal(c.status().queued, 0);
});
