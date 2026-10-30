import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Search} from './legacy-search.mjs';
import {cases,options,signature,iterations} from './perf.mjs';
// SHA-256 of pre-throughput-pass full outputs, every retained tree node and
// next PRNG value. These intentionally freeze policy, not just plan legality.
// Tuning boundary: these six expectations now pin the durable LEGACY policy.
// New policy tests are separate; mechanics and scratch tests remain unchanged.
const expected = {
  seeded:['1ac9c1b9aec65699b08e8e84b07a4df6a052d33252ddd2d35068d1eebd219ff0','ac3a992c1f65636398fc75be80e332ece8759eb2201d1bc96e0b7835881d1993'],
  natural:['29d0cf3df0404ea79570b22a430f8e7a9458aeb079a9e1f8989cc83fc86734a1','f7ac455cedd46293af6355fa88ebe27398e42d3e9e08c3fc9a4027eb59cc6523'],
  heavy:['08579a503e21aa7992470b78210c15f2fa6bac325668c27c65dbf8b79daf0f76','b9f47e364437945c067a0afb5eb7eb11fd7ca42566fe8f0d456965d8169478ba']
};
for(const [name,snapshot] of cases()) for(const [i,seed] of [11,22].entries()) {
  test(`pre-optimization full search golden: ${name}/${seed}`,()=>{
    const data=signature(new Search(snapshot,options(seed)).run(iterations));
    assert.equal(createHash('sha256').update(JSON.stringify(data)).digest('hex'),expected[name][i]);
  });
}
