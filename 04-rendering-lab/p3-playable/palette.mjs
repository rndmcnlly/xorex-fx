// Design palette, indexed by authoritative model color ID, never by spawn order.
import { COLORS } from '../../03-svg-demake/model.mjs';
export const P3 = Object.freeze({ red: [1, 0.035, 0.015], green: [0.04, 1, 0.08], blue: [0.025, 0.10, 1], yellow: [1, 0.96, 0.015], pink: [1, 0.02, 0.74], white: [1, 1, 1], black: [0, 0, 0] });
export const color = (id, gamut) => gamut === 'display-p3' ? `color(display-p3 ${P3[id].join(' ')})` : COLORS[id];
export function chooseGamut(requested, caps) {
  return requested === 'display-p3' && caps.cssP3 && caps.displayP3 && caps.p3Context === 'display-p3' ? 'display-p3' : 'srgb';
}
// D65 Display-P3 linear RGB -> XYZ -> linear sRGB. Negative or >1 channels
// establish out-of-sRGB-gamut chromaticities, not HDR or display brightness.
export function p3ToLinearSRGB(rgb) {
  const decode = x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
  const [r, g, b] = rgb.map(decode);
  return [1.224940176*r - .224940176*g, -.042056955*r + 1.042056955*g,
    -.019637555*r - .078636046*g + 1.098273601*b];
}
