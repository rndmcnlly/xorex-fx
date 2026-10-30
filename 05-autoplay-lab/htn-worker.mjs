import {HTN} from './htn.mjs';
let current = null;
onmessage = ({data}) => {
  if (data.type === 'cancel') {
    if (current?.jobID === data.jobID) {
      current.cancelled = true;
      postMessage({type:'cancelled', jobID:data.jobID, sourceFingerprint:current.fingerprint});
      current = null;
    }
    return;
  }
  if (data.type !== 'search') return;
  if (current) current.cancelled = true;
  try {
    const budgetMs = Math.max(1, Math.min(60000, Number(data.budgetMs) || 1000));
    const started = performance.now();
    const planner = new HTN(data.snapshot, data.options);
    const job = current = {jobID:data.jobID, planner, fingerprint:planner.result().sourceFingerprint,
      cancelled:false, deadline:started+budgetMs, last:0};
    const chunk = () => {
      if (current !== job || job.cancelled) return;
      try {
        const start = performance.now();
        while (!planner.done && performance.now() < job.deadline && performance.now()-start < 8) planner.run();
        if (!planner.done && performance.now() >= job.deadline) planner.finish('time-budget');
        if (planner.done || performance.now()-job.last > 200) {
          postMessage({...planner.result(job.jobID, {budgetMs}), type:planner.done?'result':'progress'});
          job.last = performance.now();
        }
        if (planner.done) current = null; else setTimeout(chunk, 0);
      } catch(error) {if(current===job) {postMessage({type:'error',jobID:job.jobID,message:error.message});current=null;}}
    };
    setTimeout(chunk, 0);
  } catch(error) {postMessage({type:'error',jobID:data.jobID,message:error.message});}
};
