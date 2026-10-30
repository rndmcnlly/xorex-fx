// Drawing evidence: recovered Enemy.as and ShipModel.as. No model writes here.
import { COLORS } from './model.mjs';

// Ruffle/Flash drawCircle is eight quadratic arcs, not an SVG perfect ellipse.
// Control/anchor coordinates are truncated to twips (1/20 pixel). Keep that
// tiny geometric error: correcting it to a perfect circle worsens the match.
export function circlePath(r, cy = 0) {
  const d = r / Math.sqrt(2), t = r * (Math.sqrt(2) - 1);
  const point = (x, y) => `${Math.trunc(x * 20) / 20} ${Math.trunc((y + cy) * 20) / 20}`;
  return `M${point(d, d)}Q${point(t, r)} ${point(0, r)}Q${point(-t, r)} ${point(-d, d)}Q${point(-r, t)} ${point(-r, 0)}Q${point(-r, -t)} ${point(-d, -d)}Q${point(-t, -r)} ${point(0, -r)}Q${point(t, -r)} ${point(d, -d)}Q${point(r, -t)} ${point(r, 0)}Q${point(r, t)} ${point(d, d)}`;
}
const circle = (x, y, r, attrs, localY = 0) => `<path data-circle="${x} ${y} ${r}" transform="translate(${x} ${y - localY})" d="${circlePath(r, localY)}" stroke-linecap="round" stroke-linejoin="round" ${attrs}/>`;
// Flash stores Graphics/GlowFilter alpha as a truncated 8-bit channel. The
// difference from .125/.25/.05 is visible on the original #404040 background.
export const flashAlpha = value => Math.floor(value * 255) / 255;

// Flash defaults: strength=2, quality=1, outer glow, source composited above it.
// Each glow consumes the PREVIOUS filter's result, not just SourceAlpha.
// Separable box kernels follow Ruffle 0.7.1 blur.wgsl / blur.rs, not an unrelated
// CSS drop-shadow or Gaussian. Fractional end samples for width 50 are half-weight.
// GPU fixed-point rounding and Flash/SVG edge rasterization remain approximate.
const boxBlur = (input, width, height, result) => {
  const n = Math.max(width, height);
  const samples = n % 2 ? Array(n).fill(1) : [.5, ...Array(n - 1).fill(1), .5];
  return `<feConvolveMatrix in="${input}" order="${width > 1 ? samples.length : 1} ${height > 1 ? samples.length : 1}" kernelMatrix="${samples.join(' ')}" divisor="${n}" edgeMode="none" result="${result}"/>`;
};
export const shipFilter = `<filter id="ship-glow" filterUnits="userSpaceOnUse" x="-70" y="-1100" width="140" height="1800" color-interpolation-filters="sRGB">
  ${boxBlur('SourceAlpha', 25, 1, 'blur1x')}
  ${boxBlur('blur1x', 1, 5, 'blur1')}
  <feComponentTransfer in="blur1" result="strength1"><feFuncA type="linear" slope="2"/></feComponentTransfer>
  <feComponentTransfer in="strength1" result="alpha1"><feFuncA type="linear" slope="${flashAlpha(.25)}"/></feComponentTransfer>
  <feFlood flood-color="white" result="white"/>
  <feComposite in="white" in2="alpha1" operator="in" result="glow1"/>
  <feMerge result="pass1"><feMergeNode in="glow1"/><feMergeNode in="SourceGraphic"/></feMerge>
  <feColorMatrix in="pass1" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="pass1alpha"/>
  ${boxBlur('pass1alpha', 5, 1, 'blur2x')}
  ${boxBlur('blur2x', 1, 50, 'blur2')}
  <feComponentTransfer in="blur2" result="strength2"><feFuncA type="linear" slope="2"/></feComponentTransfer>
  <feComponentTransfer in="strength2" result="alpha2"><feFuncA type="linear" slope="${flashAlpha(.25)}"/></feComponentTransfer>
  <feComposite in="white" in2="alpha2" operator="in" result="glow2"/>
  <feMerge><feMergeNode in="glow2"/><feMergeNode in="pass1"/></feMerge>
</filter>`;

export function drawState(game) {
  const orbs = [];
  for (const [laneIndex, lane] of game.lanes.entries()) {
    lane.forEach((color, row) => {
      const x = laneIndex * 40 + 20, y = row * 40, fill = COLORS[color];
      orbs.push(circle(x, y, 26, `fill="none" stroke="${fill}" stroke-width="2" stroke-opacity="${flashAlpha(.125)}"`),
        circle(x, y, 16, `fill="${fill}" fill-opacity="${flashAlpha(.25)}"`), circle(x, y, 10, `fill="${fill}"`));
    });
  }
  const x = 0;
  // Flash draws two independent segments from the apex, with round end caps.
  const chevron = (y, color, width) => `<path d="M${x} ${y}l-20 20M${x} ${y}l20 20" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const ship = [`<path d="M${x} 540V-960" stroke="white" stroke-width="30" stroke-opacity="${flashAlpha(.05)}" stroke-linecap="round"/>`, chevron(540, 'white', 8)];
  for (let i = 0; i < game.inventory.n; i++) ship.push(circle(x, 500, (i + 2) * 6, `fill="none" stroke="${COLORS[game.inventory.color]}" stroke-width="2"`, -40));
  // Include glyphs BELOW the viewport: their filter halo still contributes.
  // Further chevrons cannot reach the stage through these finite filter kernels.
  for (let i = 0; i < game.capacitor.n && 540 + (i + 2) * 6 <= 680; i++) ship.push(chevron(540 + (i + 2) * 6, COLORS[game.capacitor.color], 2));
  return { orbs: orbs.join(''), ship: `<g transform="translate(${game.pos * 40 + 20} 0)" filter="url(#ship-glow)">${ship.join('')}</g>` };
}
