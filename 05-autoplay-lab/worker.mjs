import { Search } from './search.mjs';
let current = null;
function send(result) { postMessage(result); }
onmessage = ({data}) => {
  if (data.type === 'cancel') {
    if (current?.jobID === data.jobID) { current.cancelled = true; send({type: 'cancelled', jobID: data.jobID}); }
    return;
  }
  if (data.type !== 'search') return;
  if (current) current.cancelled = true;
  try {
    const budgetMs = Math.max(1, Math.min(60000, Number(data.budgetMs) || 1000));
    const iterations = Math.floor(Math.max(1, Math.min(10000000, Number(data.iterations) || 10000000)));
    const deadline = performance.now() + budgetMs;
    const job = current = { jobID: data.jobID, search: new Search(data.snapshot, data.options),
      budget: {budgetMs, iterations}, cancelled: false, deadline, last: 0 };
    const chunk = () => {
      if (job.cancelled || current !== job) return;
      const start = performance.now();
      // Yield between individual iterations (normally much less than 12 ms).
      do { job.search.run(1); }
      while (performance.now() - start < 12 && performance.now() < job.deadline && job.search.iterations < iterations);
      const done = performance.now() >= job.deadline || job.search.iterations >= iterations;
      if (done || performance.now() - job.last > 200) {
        const result = job.search.result(job.jobID, job.budget);
        send({...result, type: done ? 'result' : 'progress'}); job.last = performance.now();
      }
      if (!done) setTimeout(chunk, 0); else current = null;
    };
    setTimeout(chunk, 0);
  } catch (error) { send({type: 'error', jobID: data.jobID, message: error.message}); }
};
