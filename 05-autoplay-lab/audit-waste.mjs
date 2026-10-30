// Diagnostic only: quantify intentional mismatch actions in frozen HTN plans.
// Run: node 05-autoplay-lab/audit-waste.mjs
import {HTN} from './htn.mjs';
import {fixture} from './fixtures.mjs';
import {act} from '../03-svg-demake/model.mjs';
import {classifyAction} from '../04-rendering-lab/motion-playable/feedback.mjs';

const report = [];
for (const [name, seed] of [['seeded', 2009], ['natural', 2009], ['natural', 87]]) {
  const initial = fixture(name, seed), planner = new HTN(initial);
  while (!planner.done) planner.run(200);
  const result = planner.result(), state = structuredClone(initial), losses = [];
  for (const [at, command] of result.plan.entries()) {
    const before = structuredClone(state), events = act(state, command);
    const semantic = classifyAction(before, state, command, events);
    if (semantic.kind === 'mismatch') losses.push({at, command,
      before: {inventory: before.inventory, charge: before.capacitor},
      after: structuredClone({inventory: state.inventory, charge: state.capacitor}), semantic});
  }
  report.push({fixture: name, seed, status: result.status, termination: result.termination,
    nodes: result.nodes, arrows: result.plan.length, mismatchCount: losses.length,
    chargeDiscarded: losses.reduce((n, x) => n + x.before.charge.n, 0), losses,
    intentionalMethods: result.trace.filter(x => x.method === 'ConvertHeld' || x.method.startsWith('ConvertColor@'))});
}
console.log(JSON.stringify(report, null, 2));
