// Measurement only. Curriculum/witness modules are NEVER runtime planner inputs.
import {writeFileSync, mkdirSync} from 'node:fs';
import {LESSONS, lessonSnapshot, audit} from './curriculum.mjs';
import {planHTN} from './htn.mjs';
const round = Number(process.argv[2] || 1), budgetMs = Number(process.argv[3] || 500);
const rows = LESSONS.map(l => {
  const snapshot = lessonSnapshot(l.id), result = planHTN(snapshot, {round}, budgetMs);
  const replay = audit(snapshot, result.plan);
  if (JSON.stringify(replay.endSnapshot) !== JSON.stringify(result.endSnapshot)) throw Error('model replay mismatch');
  return {board: l.id, snapshot, result, groups: replay.groups, shots: replay.shots};
});
mkdirSync(new URL('./generated/', import.meta.url), {recursive:true});
writeFileSync(new URL(`./generated/htn-round-${round}.json`, import.meta.url), JSON.stringify(rows,null,2));
console.log(rows.map(r=>({board:r.board,remaining:r.result.remaining,black:r.result.blackRemaining,
  groups:r.groups,nodes:r.result.nodes,reason:r.result.reason,ms:Math.round(r.result.wallMs)})));
