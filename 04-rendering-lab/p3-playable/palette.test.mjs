import test from 'node:test';
import assert from 'node:assert/strict';
import { COLORS } from '../../03-svg-demake/model.mjs';
import { P3, color, chooseGamut, p3ToLinearSRGB } from './palette.mjs';
test('palette is keyed by all seven model IDs, with actual out-of-sRGB colors',()=>{
  assert.deepEqual(Object.keys(P3),Object.keys(COLORS));
  for(const id of Object.keys(P3)) {
    assert.equal(color(id,'srgb'),COLORS[id]);
    assert.match(color(id,'display-p3'),/^color\(display-p3 /);
    const linear=p3ToLinearSRGB(P3[id]);
    if(!['black','white'].includes(id))assert.ok(linear.some(x=>x<-.0001||x>1.0001),`${id} must exercise P3-only color`);
  }
  assert.deepEqual(p3ToLinearSRGB(P3.black),[0,0,0]);
  for(const c of p3ToLinearSRGB(P3.white))assert.ok(Math.abs(c-1)<1e-6);
});
test('P3 output requires CSS, real P3 context AND display media query; sRGB explicit',()=>{
  const caps={cssP3:true,displayP3:true,p3Context:'display-p3'};
  assert.equal(chooseGamut('display-p3',caps),'display-p3');
  assert.equal(chooseGamut('srgb',caps),'srgb');
  for(const key of Object.keys(caps))assert.equal(chooseGamut('display-p3',{...caps,[key]:key==='p3Context'?'srgb':false}),'srgb');
});
