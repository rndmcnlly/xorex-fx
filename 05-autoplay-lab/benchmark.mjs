import { Search, baseline } from './search.mjs';
import { fixture, FIXTURES } from './fixtures.mjs';
import { act } from '../03-svg-demake/model.mjs';
import { pack, features } from './sim.mjs';
const iterations = Number(process.argv[2] || 1000), seeds = [11,22,33];
const rows=[];
for (const name of [...Object.keys(FIXTURES),'seeded','natural']) {
  const source=fixture(name);
  for (const seed of seeds) {
    for (const kind of ['random','greedy','mcts']) {
      const start=performance.now();
      const result=kind==='mcts' ? new Search(source,{seed,horizon:48,maxNodes:12000}).run(iterations).result() : baseline(source,kind,{seed,horizon:48});
      const ms=performance.now()-start, end=structuredClone(source);
      for(const action of result.plan) act(end,action);
      const f=features(pack(end));
      rows.push({fixture:name,seed,kind,score:result.score,clear:f.clear,remaining:f.remaining,black:f.black,
        arrows:result.plan.length,ms,iterations:result.iterations??null,nodes:result.nodes??null,ips:result.iterationsPerSecond??null});
    }
  }
}
console.log(JSON.stringify({runtime:process.version,platform:process.platform,arch:process.arch,
  iterations,seeds,horizon:48,maxNodes:12000,
  processMemory:process.memoryUsage(),memoryNote:'Process-wide Node sample after all runs, not a per-tree or browser memory measurement.',rows},null,2));
