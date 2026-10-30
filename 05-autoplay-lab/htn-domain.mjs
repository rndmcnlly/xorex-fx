// Domain knowledge, not mechanics. All operators use the unchanged simulator.
import {unpack, features} from './sim.mjs';
export const task = (name, args = {}) => ({name, ...args});
const op = (lane, up = false) => task('ArrowMacro', {macro: lane * 2 + Number(up)});
const again = task('ClearBoard');
export function inspect(s) {
  const lanes = unpack(s).lanes;
  return {...features(s), lanes, runs: lanes.flatMap((l, lane) => {
    const color = l.at(-1); if (!color || color === 'black') return [];
    let n = 1; while (l.at(-1 - n) === color) n++;
    return [{lane, color, n}];
  }), gates: lanes.flatMap((l, lane) => {
    let shots = 0; while (l.at(-1 - shots) === 'black') shots++;
    return shots && shots < l.length ? [{lane, shots, color: l.at(-1 - shots)}] : [];
  })};
}
// The engine receives tasks and alternatives, never board names or witness metadata.
export function decompose(t, s, round = 2) {
  const f = inspect(s), methods = [], rejected = [];
  const method = (name, precondition, tasks, estimate = {}, why = '') => {
    if (precondition) methods.push({name, tasks, estimate, why});
    else rejected.push({task: t.name, method: name, reason: why || 'precondition false', estimate});
  };
  const whites = f.runs.filter(r => r.color === 'white');
  const ordinary = f.runs.filter(r => r.color !== 'white');
  if (t.name === 'ClearBoard') {
    if (f.clear) method('AlreadyClear', true, []);
    else if (s.inv) method('CleanupHeld', true, [task('CleanupHeld'), again]);
    else {
      method('ObtainAmmo', f.runs.length > 0 || f.gates.length > 0,
        [task('ObtainAmmo'), again], {}, 'gatherable resource or buried resource required');
      method('ClearBlackBanks', s.cap > 0 && f.black > 0,
        [task('ClearBlackBanks'), again], {shots: f.black, available: s.cap}, 'charged and black remaining');
    }
  } else if (t.name === 'ObtainAmmo') {
    method('EstablishColoredCharge', ordinary.length > 0, [task('EstablishColoredCharge')], {}, 'requires an exposed ordinary run');
    method('AssembleWhiteRun', whites.length > 0, [task('AssembleWhiteRun', {lanes: whites.map(r => r.lane)})],
      {whiteGroup: whites.reduce((n, r) => n + r.n, 0)}, 'requires an exposed white run');
    if (round >= 2 && f.gates.length && whites.length > 1) for (const r of whites) {
      method(`BootstrapNow@${r.lane}`, true, [task('AssembleWhiteRun', {lanes: [r.lane]})],
        {whiteGroup: r.n, laterWhite: f.white - r.n}, 'spend a smaller group now, preserve others for a later reservoir');
    }
    method('FundAccess', f.gates.some(g => g.shots <= s.cap), [task('ExposeResources')],
      {available: s.cap}, 'requires an affordable black-tail gate');
  } else if (t.name === 'EstablishColoredCharge') {
    for (const r of ordinary) method(`ConvertColor@${r.lane}`, true,
      [op(r.lane), op(r.lane)], {gather: r.n, capColor: s.cc, compatible: !s.cc || f.lanes[r.lane].at(-1) === unpack(s).capacitor.color},
      'matching/empty cap adds the run; ordinary mismatch legally discards both stores');
  } else if (t.name === 'AssembleWhiteRun') {
    const lanes = t.lanes, target = lanes[0];
    const tasks = lanes.slice(1).flatMap(lane => [op(lane), op(target, true)]);
    tasks.push(op(target), op(target));
    const n = lanes.reduce((n, lane) => n + f.runs.find(r => r.lane === lane).n, 0);
    const added = s.cc && s.cc !== 6 ? 5 * n * n : n;
    const ordinaryTotal = f.lanes.flat().filter(c => c !== 'black' && c !== 'white').length;
    const beforeUpper = s.cap + ordinaryTotal + 5 * f.white ** 2;
    const afterUpper = s.cap + added + ordinaryTotal + 5 * (f.white - n) ** 2;
    method('JoinExposedThenConvert', round < 2 || beforeUpper < f.black || afterUpper >= f.black, tasks,
      {whiteGroup: n, added, coloredReserve: s.cap, blackDemand: f.black, afterOptimisticShots: afterUpper},
      afterUpper < f.black ? 'partial white group destroys a previously possible optimistic ammo budget' :
        'replace onto white, regather, convert; empty/white cap adds n, nonwhite cap adds 5*n*n');
  } else if (t.name === 'ExposeResources') {
    for (const g of f.gates) method(`Expose@${g.lane}`, g.shots <= s.cap,
      [task('RepeatShot', {lane: g.lane, n: g.shots})],
      {shots: g.shots, reserve: s.cap - g.shots, exposes: g.color}, 'gate must be affordable');
  } else if (t.name === 'ClearBlackBanks') {
    // Repetition is a task, not a whole-column kill. Each repetition is one Up.
    const lanes = f.lanes.map((l, lane) => ({lane, n: l.every(c => c === 'black') ? l.length : 0})).filter(l => l.n);
    let budget = s.cap;
    const tasks = [];
    for (const l of lanes) {const n = Math.min(budget, l.n); if (n) tasks.push(task('RepeatShot', {lane: l.lane, n})); budget -= n;}
    method('ShootPureBanks', tasks.length > 0, tasks, {shots: s.cap - budget}, 'requires a pure-black bank and charge');
  } else if (t.name === 'CleanupHeld') {
    method('ConvertHeld', true, [op(s.pos)], {held: s.inv, cap: s.cap}, 'conversion follows real cap asymmetry');
    if (round >= 2) {
      const color = unpack(s).inventory.color;
      const matching = f.lanes.flatMap((l, lane) => l.at(-1) === color ? [lane] : []);
      const empty = f.lanes.map((l, lane) => ({l, lane})).filter(x => !x.l.length)
        .sort((a,b) => Math.abs(a.lane-s.pos)-Math.abs(b.lane-s.pos))[0]?.lane;
      for (const lane of [...matching, ...(empty === undefined ? [] : [empty])]) {
        method(`ParkInventory@${lane}`, s.cap > 0 && f.black > 0, [op(lane, true)],
          {held: s.inv, preservedCharge: s.cap}, 'free inventory for firing without a destructive conversion');
      }
    }
  } else throw Error(`Unknown HTN task: ${t.name}`);
  return {methods, rejected};
}
