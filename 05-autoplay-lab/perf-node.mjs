import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import os from 'node:os';
import {nodeSuite} from './perf.mjs';
const label=process.argv[2] || 'unlabelled';
mkdirSync(new URL('./generated/',import.meta.url),{recursive:true});
const hashes=Object.fromEntries(['sim.mjs','search.mjs','legacy-search.mjs','worker.mjs','perf.mjs'].map(name=>
  [name,createHash('sha256').update(readFileSync(new URL(name,import.meta.url))).digest('hex')]));
const report={label,date:new Date().toISOString(),environment:{node:process.version,platform:process.platform,
  arch:process.arch,cpu:os.cpus()[0].model},hashes,...nodeSuite()};
writeFileSync(new URL(`./generated/perf-${label}-node.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({label,rows:report.rows.length,micro:report.micro.length,hashes}));
