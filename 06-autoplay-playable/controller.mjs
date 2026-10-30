// Transport-free live executor. Search stays in the existing HTN Worker.
import { act } from '../03-svg-demake/model.mjs';
import { fingerprint } from '../05-autoplay-lab/sim.mjs';

export const PERIOD_MS = 1000, BUDGET_MS = 1000, JOURNAL_LIMIT = 64;
const arrows = new Set(['left', 'right', 'up', 'down']);
const vertical = command => command === 'up' || command === 'down';

// Dependency projection, not a whole-world freshness check. Vertical verbs
// deliberately require the entire target lane, even lane-independent conversion.
export function dependencies(state, command) {
  return JSON.stringify([state.lost, state.pos, state.inventory, state.capacitor,
    vertical(command) ? state.lanes[state.pos] : null]);
}
export function validStep(expected, live, command) {
  return arrows.has(command) && !live.lost && dependencies(expected, command) === dependencies(live, command);
}
export function project(state, command) {
  const next = structuredClone(state);
  act(next, command);
  return next;
}

// Rebase only an actually executed, semantically identical primitive prefix.
// Related arrivals during that prefix cannot masquerade as a matching command.
export function reconcile(snapshot, plan, journal, live) {
  if (!Array.isArray(plan) || plan.length > 30000 || !plan.every(a => arrows.has(a)) || journal.length > JOURNAL_LIMIT) return null;
  let expected = structuredClone(snapshot);
  for (let i = 0; i < journal.length; i++) {
    const record = journal[i], command = plan[i];
    if (command !== record.command || dependencies(expected, command) !== record.before) return null;
    expected = project(expected, command);
  }
  const index = journal.length;
  if (index < plan.length && !validStep(expected, live, plan[index])) return null;
  return { expected, arrows: [...plan], index };
}

export function createController({ read, perform, send, cancel, observe, profile = 'live', now = () => performance.now() }) {
  profile = profile === 'frozen' ? 'frozen' : 'live';
  let enabled = false, job = null, plan = null, serial = 0, nextRequest = 0, nextBeat = 0, rate = 12;
  let note = 'Manual', acceptedAt = null, sourceAt = null;
  let policy = null;
  const resourceLoss = { mismatches: 0, lostCharge: 0, lostHeld: 0 };
  const counts = { requests: 0, accepted: 0, executed: 0, rejected: 0, invalidated: 0, rebased: 0 };
  // Opt-in evidence only: callers cannot mutate retained jobs/plans via the trace.
  const trace = (type, detail) => { if (observe) observe(structuredClone({ type, at: now(), ...detail })); };
  function stopJob() { if (job) cancel(job.id); job = null; }
  function suspend(reason = 'Suspended') { stopJob(); plan = null; nextRequest = 0; note = reason; }
  function enable(value) {
    enabled = Boolean(value);
    suspend(enabled ? 'Waiting for snapshot' : 'Manual');
    nextBeat = now();
  }
  function request(time) {
    stopJob();
    const snapshot = structuredClone(read());
    job = { id: ++serial, snapshot, fingerprint: fingerprint(snapshot), journal: [], time };
    counts.requests++; nextRequest = time + PERIOD_MS; note = 'Planning';
    trace('request', { jobID: job.id, sourceFingerprint: job.fingerprint, snapshot });
    send({ type: 'search', jobID: job.id, sourceFingerprint: job.fingerprint, snapshot: structuredClone(snapshot), budgetMs: BUDGET_MS,
      options: { profile, maxNodes: 12000, maxDepth: 2000, maxActions: 20000 } });
  }
  function receive(message) {
    if (!enabled || !job || message.jobID !== job.id) { counts.rejected++; return false; }
    if (now() - job.time >= BUDGET_MS) {
      stopJob(); counts.rejected++; note = plan ? 'Executing retained plan' : 'Waiting: worker deadline'; return false;
    }
    if (message.type === 'error') { stopJob(); note = `Worker error: ${message.message}`; return false; }
    if (!['progress', 'result'].includes(message.type)) return false;
    if (message.sourceFingerprint !== job.fingerprint) { counts.rejected++; return false; }
    const diagnostics = { profile: message.options?.profile ?? 'unknown', objective: message.objective,
      outcome: message.outcome, reason: message.reason, decisions: (message.trace ?? []).slice(0,32) };
    trace('response', { jobID: job.id, responseType: message.type, plan: message.plan, endSnapshot: message.endSnapshot, journal: job.journal, policy: diagnostics });
    const candidate = reconcile(job.snapshot, message.plan, job.journal, read());
    if (candidate && candidate.index < candidate.arrows.length) {
      plan = candidate; acceptedAt = now(); sourceAt = job.time;
      policy = structuredClone(diagnostics);
      plan.jobID = job.id;
      trace('accepted', { jobID: job.id, index: candidate.index, length: candidate.arrows.length });
      counts.accepted++; counts.rebased += candidate.index > 0 ? 1 : 0;
      note = 'Executing';
    } else {
      trace('rejected', { jobID: job.id, reason: candidate ? 'empty or completed prefix' : 'prefix or next dependency differs' });
      counts.rejected++; note = plan ? 'Executing retained plan' : 'Waiting for fresh snapshot';
    }
    if (message.type === 'result') job = null;
    return Boolean(candidate);
  }
  function pulse(time, runnable = true) {
    if (!enabled || !runnable || !read() || read().lost) return;
    if (time >= nextRequest) request(time);
    if (!plan || time < nextBeat) return;
    const command = plan.arrows[plan.index], live = read();
    if (!validStep(plan.expected, live, command)) {
      trace('invalidated', { jobID: plan.jobID, index: plan.index, command, expected: plan.expected, live,
        reason: 'precondition', expectedGuard: dependencies(plan.expected, command), actualGuard: dependencies(live, command) });
      plan = null; counts.invalidated++; note = job ? 'Planning after changed precondition' : 'Waiting: target changed';
      return;
    }
    const before = dependencies(live, command), expected = project(plan.expected, command);
    const evidence = observe ? { jobID: plan.jobID, index: plan.index, command, before: structuredClone(live),
      expectedBefore: structuredClone(plan.expected), expectedAfter: expected, expectedGuard: dependencies(plan.expected, command), actualGuard: before } : null;
    const heldBefore = {...live.inventory}, chargeBefore = {...live.capacitor};
    perform(command); // Same immediate model/presentation path as manual actions.
    if(command==='down' && heldBefore.n && chargeBefore.n && heldBefore.color!=='white' && heldBefore.color!==chargeBefore.color && !read().inventory.n && !read().capacitor.n){
      resourceLoss.mismatches++;resourceLoss.lostCharge+=chargeBefore.n;resourceLoss.lostHeld+=heldBefore.n;
    }
    if (evidence) trace('action', { ...evidence, after: read(), postconditionMatches: validStep(expected, read(), command) });
    counts.executed++; nextBeat = time + 1000 / rate;
    if (job) {
      job.journal.push({ command, before });
      if (job.journal.length > JOURNAL_LIMIT) stopJob();
    }
    if (!validStep(expected, read(), command)) {
      plan = null; counts.invalidated++; note = 'Waiting: model projection changed'; return;
    }
    plan.expected = expected; plan.index++;
    if (plan.index >= plan.arrows.length) { plan = null; note = job ? 'Planning' : 'Waiting for next snapshot'; }
  }
  return { enable, suspend, receive, pulse,
    expire(id) {
      if (!job || job.id !== id) return;
      stopJob(); note = plan ? 'Executing budget-limited prefix' : 'Waiting: worker deadline';
    },
    manual() { enable(false); },
    setRate(value) { rate = Math.max(8, Math.min(30, Number(value) || 12)); },
    status() { return { enabled, planning: Boolean(job), queued: plan ? plan.arrows.length - plan.index : 0,
      note, rate, jobID: job?.id ?? null, sourceAgeMs: sourceAt === null ? null : Math.round(now() - sourceAt),
       acceptedAt, journalLength: job?.journal.length ?? 0, profile, policy: structuredClone(policy), resourceLoss: {...resourceLoss}, ...counts }; },
  };
}

// Separate Tab edge latch; leave native form navigation untouched.
export function createTabToggle(toggle) {
  let held = false;
  return {
    down(event, gameFocus) {
      if (event.key !== 'Tab' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || !gameFocus) return false;
      event.preventDefault();
      if (!held && !event.repeat) { held = true; toggle(); }
      return true;
    },
    up(event) { if (event.key === 'Tab') held = false; },
    clear() { held = false; },
  };
}
