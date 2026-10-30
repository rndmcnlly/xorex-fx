// Reproducible frozen integration audit, not a policy quality benchmark.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createGame, seededRandom, act } from '../03-svg-demake/model.mjs';
import { HTN } from '../05-autoplay-lab/htn.mjs';
import { pack, apply, expand, unpack } from '../05-autoplay-lab/sim.mjs';
import { classifyAction } from '../04-rendering-lab/motion-playable/feedback.mjs';
import { createController } from './controller.mjs';

export function frozenCase(seed) {
  const snapshot = createGame(seededRandom(seed)), planner = new HTN(snapshot);
  while (!planner.done) planner.run(100);
  const result = planner.result(), state = structuredClone(snapshot), packed = pack(snapshot);
  const transport = [], trace = [];
  let now = 0;
  const controller = createController({ profile: 'frozen', read: () => state, now: () => now,
    perform: command => act(state, command), send: message => transport.push(message), cancel() {},
    observe: entry => trace.push(entry) });
  controller.enable(true); controller.pulse(now);
  controller.receive({ ...result, type: 'result', jobID: transport[0].jobID });
  const offline = structuredClone(snapshot), semanticCounts = {}, mismatches = [];
  for (const [index, command] of result.plan.entries()) {
    const before = structuredClone(offline), events = act(offline, command);
    const feedback = classifyAction(before, offline, command, events);
    semanticCounts[feedback.kind] = (semanticCounts[feedback.kind] ?? 0) + 1;
    if (feedback.kind === 'mismatch') mismatches.push({ index, command, before, after: structuredClone(offline), feedback });
    now = index * 100 + 1; controller.pulse(now);
    // Every finite-speed actual primitive must equal the independent frozen replay.
    assert.deepEqual(state, offline);
  }
  assert.deepEqual(state, result.endSnapshot);
  // Macro execution and expanded arrows must land on exactly the same state.
  assert.deepEqual(expand(snapshot.pos, result.macros), result.plan);
  for (const macro of result.macros) apply(packed, macro);
  assert.deepEqual(unpack(packed), { lanes: state.lanes, pos: state.pos, inventory: state.inventory, capacitor: state.capacitor });
  assert.equal(controller.status().invalidated, 0);
  assert.ok(trace.filter(e => e.type === 'action').every(e => e.postconditionMatches));
  return { seed, snapshot, result, semanticCounts, mismatches, controller: controller.status(), trace };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cases = [1, 7, 42, 2009].map(frozenCase);
  await mkdir(new URL('./generated/', import.meta.url), { recursive: true });
  await writeFile(new URL('./generated/frozen-diagnosis.json', import.meta.url), JSON.stringify({ cases }, null, 2));
  console.log(JSON.stringify(cases.map(c => ({ seed: c.seed, arrows: c.result.plan.length,
    plannedMismatches: c.mismatches.length, unexpectedExecution: c.controller.invalidated })), null, 2));
}
