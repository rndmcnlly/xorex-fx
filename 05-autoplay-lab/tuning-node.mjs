import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cpus} from 'node:os';
import {boards,nodeRun} from './tuning.mjs';
const split=process.argv[2]??'train';
const policies=split==='train'?['legacy','long','deliberate','resource','terminal']:['legacy','resource','seeded','restarts'];
const rows=[];
const hashes=Object.fromEntries(['search.mjs','legacy-search.mjs','sim.mjs','tuning.mjs','tuning-node.mjs'].map(name=>
  [name,createHash('sha256').update(readFileSync(new URL(name,import.meta.url))).digest('hex')]));
for(const [name,snapshot] of boards(split)) {
  for(const policy of policies)nodeRun(snapshot,policy,11,'iterations',30);
  for(let repeat=0;repeat<(split==='train'?2:3);repeat++)for(const policy of policies)for(const seed of split==='train'?[11,22]:[37,53]) {
    for(const [mode,budget] of split==='train'?[['iterations',500],['wall',500]]:[['iterations',500],['wall',500],['wall',1000]]) {
      rows.push({name,policy,repeat,seed,...nodeRun(snapshot,policy,seed,mode,budget)});
    }
  }
}
mkdirSync(new URL('./generated/',import.meta.url),{recursive:true});
const path=new URL(`./generated/tuning-${split}-node.json`,import.meta.url);
writeFileSync(path,JSON.stringify({environment:{node:process.version,platform:process.platform,arch:process.arch,cpu:cpus()[0].model},hashes,split,policies,rows},null,2)+'\n');
console.log(path.pathname, rows.length+' replay-verified rows');
