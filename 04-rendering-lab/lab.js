import {palette, names, gems, initialState, reduce} from './fixture.mjs';

const $ = id => document.getElementById(id);
let state = initialState();
let render3D = () => {};
let pulse = () => {};
const options = () => ({flat: $('mode').value === 'flat', glow: $('glow').checked,
  motion: $('motion').checked, background: $('background').checked ? '#404040' : '#18212b'});
const x = lane => (lane - 2) * 1.12;
const y = row => 3.08 - row * 1.04;

function drawReference() {
  const canvas = $('reference'), box = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio, 2);
  canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr);
  const c = canvas.getContext('2d');
  c.scale(canvas.width / 6.2, canvas.height / 8.68);
  c.translate(3.1, 4.34); c.scale(1, -1);
  c.fillStyle = options().background; c.fillRect(-3.1, -4.34, 6.2, 8.68);
  c.strokeStyle = '#667077'; c.lineWidth = .012;
  for (let lane = 0; lane < 5; lane++) { c.beginPath(); c.moveTo(x(lane), -3.7); c.lineTo(x(lane), 3.8); c.stroke(); }
  for (const gem of gems) {
    c.beginPath(); c.arc(x(gem.lane), y(gem.row), .37, 0, Math.PI * 2);
    c.fillStyle = palette[gem.color]; c.fill();
    c.strokeStyle = gem.color === 5 ? '#afbac9' : '#e1e8ee'; c.lineWidth = .025; c.stroke();
  }
  c.strokeStyle = '#d7eee9'; c.lineWidth = .025;
  c.strokeRect(x(state.lane) - .49, -3.98, .98, 1.04);
  c.fillStyle = palette[state.color]; c.beginPath();
  c.moveTo(x(state.lane), -3.06); c.lineTo(x(state.lane) - .32, -3.75);
  c.lineTo(x(state.lane), -3.59); c.lineTo(x(state.lane) + .32, -3.75); c.closePath(); c.fill(); c.stroke();
}
function refresh() {
  $('state').textContent = `Lane ${state.lane + 1} / ${names[state.color]} / ${state.actions} inputs`;
  drawReference(); render3D();
}
function act(action) { state = reduce(state, action); refresh(); if (action === 'pulse') pulse(); }
document.querySelectorAll('[data-action]').forEach(button => button.onclick = () => act(button.dataset.action));
$('reset').onclick = () => {state = initialState(); refresh();};
for (const id of ['mode', 'glow', 'motion', 'background']) $(id).onchange = refresh;
$('view').onkeydown = event => {
  const action = {ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'pulse', ArrowDown: 'color'}[event.key];
  if (action) { event.preventDefault(); act(action); }
};
new ResizeObserver(refresh).observe($('stage'));
refresh();

const evidence = {secureContext: isSecureContext, userAgent: navigator.userAgent,
  devicePixelRatio, displayDynamicRangeHigh: matchMedia('(dynamic-range: high)').matches,
  displayP3MediaQuery: matchMedia('(color-gamut: p3)').matches,
  output: 'SDR sRGB; display media queries do not demonstrate HDR output',
  rayTracing: 'Not implemented or probed; no ray-tracing claim',
  webgpu: 'probing adapter, not used for this rendering'};
function report() { $('capabilities').textContent = JSON.stringify(evidence, null, 2); }
report();
async function probeGPU() {
  try {
    const adapter = await navigator.gpu?.requestAdapter();
    evidence.webgpu = adapter ? {adapterAvailable: true, features: [...adapter.features],
      maxTextureDimension2D: adapter.limits.maxTextureDimension2D,
      note: 'Adapter request only, not a WebGPU rendering/performance test'} : {adapterAvailable: false};
  } catch (error) { evidence.webgpu = {error: String(error)}; }
  report();
}
probeGPU();

try {
  // Version-pinned CDN, no build step or vendored engine tree.
  const T = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
  const renderer = new T.WebGLRenderer({canvas: $('view'), antialias: true, alpha: false});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const gl = renderer.getContext();
  evidence.renderer = {engine: `Three.js r${T.REVISION}`, api: gl.getParameter(gl.VERSION),
    floatColorBufferExtension: !!gl.getExtension('EXT_color_buffer_float'),
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    note: 'Extension presence is not evidence of a tested float render target. This scene renders SDR.'};
  report();
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-3.1, 3.1, 4.34, -4.34, .1, 40);
  camera.position.set(0, 0, 15); camera.lookAt(0, 0, 0);
  scene.add(new T.HemisphereLight(0xd4e9ff, 0x282c3c, 2));
  const key = new T.DirectionalLight(0xffeee0, 3.3); key.position.set(-4, 6, 7); scene.add(key);
  const fill = new T.DirectionalLight(0x63bfff, 1.7); fill.position.set(4, -2, 3); scene.add(fill);
  const lit = palette.map((color, i) => new T.MeshPhysicalMaterial({color, metalness: .12,
    roughness: .25, clearcoat: 1, clearcoatRoughness: .18,
    emissive: color, emissiveIntensity: i === 5 ? 0 : .07}));
  const flat = palette.map(color => new T.MeshBasicMaterial({color, toneMapped: false}));
  const sphere = new T.SphereGeometry(.37, 32, 20);
  const meshes = [], halos = [];
  // Radial alpha sprite: intentionally not bloom or a physical light simulation.
  const textureCanvas = document.createElement('canvas'); textureCanvas.width = textureCanvas.height = 64;
  const ctx = textureCanvas.getContext('2d'), gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#ffffff90'); gradient.addColorStop(.45, '#ffffff30'); gradient.addColorStop(1, '#ffffff00');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  const texture = new T.CanvasTexture(textureCanvas);
  for (const gem of gems) {
    const mesh = new T.Mesh(sphere, lit[gem.color]); mesh.position.set(x(gem.lane), y(gem.row), .42);
    mesh.userData.color = gem.color; meshes.push(mesh); scene.add(mesh);
    const halo = new T.Sprite(new T.SpriteMaterial({map: texture, color: palette[gem.color],
      transparent: true, opacity: .24, depthWrite: false, toneMapped: false}));
    halo.position.set(mesh.position.x, mesh.position.y, -.15); halo.scale.set(1.18, 1.18, 1);
    halo.userData.dark = gem.color === 5; halos.push(halo); scene.add(halo);
    if (gem.color === 5) {
      const ring = new T.Mesh(new T.RingGeometry(.375, .389, 48), new T.MeshBasicMaterial({color: '#afbac9', toneMapped: false}));
      ring.position.set(mesh.position.x, mesh.position.y, .05); scene.add(ring);
    }
  }
  const laneMaterial = new T.LineBasicMaterial({color: '#667077', toneMapped: false});
  for (let lane = 0; lane < 5; lane++) {
    scene.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(x(lane), -3.7, -.3), new T.Vector3(x(lane), 3.8, -.3)]), laneMaterial));
  }
  const arrow = new T.Shape(); arrow.moveTo(0, .39); arrow.lineTo(-.32, -.3); arrow.lineTo(0, -.14); arrow.lineTo(.32, -.3); arrow.closePath();
  const ship = new T.Mesh(new T.ExtrudeGeometry(arrow, {depth: .12, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .025, bevelThickness: .025}), lit[0]);
  ship.position.y = -3.45; scene.add(ship);
  const selection = new T.LineLoop(new T.BufferGeometry().setFromPoints([
    new T.Vector3(-.49, -.53, .1), new T.Vector3(.49, -.53, .1), new T.Vector3(.49, .51, .1), new T.Vector3(-.49, .51, .1),
  ]), new T.LineBasicMaterial({color: '#d7eee9', toneMapped: false}));
  selection.position.y = -3.45; scene.add(selection);
  render3D = () => {
    const o = options(), box = $('stage').getBoundingClientRect();
    renderer.setSize(box.width, box.height, false);
    scene.background = new T.Color(o.background);
    for (const mesh of meshes) mesh.material = (o.flat ? flat : lit)[mesh.userData.color];
    for (const halo of halos) halo.visible = !o.flat && o.glow && !halo.userData.dark;
    ship.position.x = selection.position.x = x(state.lane);
    ship.material = (o.flat ? flat : lit)[state.color];
    renderer.render(scene, camera);
  };
  let frame = 0;
  pulse = () => {
    cancelAnimationFrame(frame);
    if (!options().motion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const start = performance.now();
    function animate(now) {
      const fade = Math.max(0, 1 - (now - start) / 450);
      for (const halo of halos) {halo.material.opacity = .24 + fade * .25; halo.scale.setScalar(1.18 + fade * .25);}
      render3D();
      if (fade > 0 && options().motion) frame = requestAnimationFrame(animate);
      else { for (const halo of halos) {halo.material.opacity = .24; halo.scale.set(1.18, 1.18, 1);} render3D(); }
    }
    frame = requestAnimationFrame(animate);
  };
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); $('error').textContent = 'WebGL context lost. The plain reference and input remain available. Reload to restore 3D.';
    cancelAnimationFrame(frame); render3D = () => {};
  });
  refresh();
  document.documentElement.dataset.ready = 'three';
} catch (error) {
  evidence.renderer = {error: String(error)}; report();
  $('error').textContent = `3D unavailable (${error.message}). The plain reference still works. Check CDN access and WebGL2 support.`;
  document.documentElement.dataset.ready = 'reference-only';
}
