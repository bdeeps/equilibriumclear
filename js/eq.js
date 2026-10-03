// Shared parts for the chemical equilibrium box: constants, the thermodynamics behind every number
// (equilibrium constants from published data), colours, chart boards, a box of reacting molecules
// and a few helpers. Scenes are in "scene units": +x right, +y up.
import { THREE, M, box, beam, sphere, arrow, clamp } from './kit.js';

// ---------------------------------------------------------------- constants
export const R = 8.314462618;          // J/(mol·K), the gas constant (exact since the 2019 SI)
export const K0 = 273.15;              // 0 °C in kelvin
export const ATM = 1.01325;            // bar in one standard atmosphere
export const TAU = Math.PI * 2;
const L10 = Math.log10;

// ---------------------------------------------------------------- N₂O₄ ⇌ 2 NO₂
// Standard values at 298 K (NIST-JANAF tables): ΔfH° NO₂ = +33.10, N₂O₄ = +9.08 kJ/mol;
// S° NO₂ = 240.04, N₂O₄ = 304.38 J/(mol·K). So ΔH° = +57.1 kJ/mol (Wikipedia quotes +57.23) and
// ΔS° = +175.7 J/(mol·K). Taking both as steady from 0 to 100 °C (the van 't Hoff equation):
//   Kp = exp(−ΔH°/RT + ΔS°/R), in bar: 0.018 at 0 °C, 0.148 at 25 °C, 1.67 at 60 °C, 15 at 100 °C.
export const N2O4 = { dH: 57120, dS: 175.7 };
export const kpN2O4 = (T) => Math.exp(-N2O4.dH / (R * T) + N2O4.dS / R);

// ---------------------------------------------------------------- N₂ + 3 H₂ ⇌ 2 NH₃ (Haber–Bosch)
// The equilibrium constant comes from the Gillespie and Beattie (1930) fit to measured equilibria,
// the form used in ammonia-converter design (Dyson and Simon, Ind. Eng. Chem. Fundam. 7, 605, 1968):
//   log₁₀ Ka = −2.691122 log₁₀T − 5.519265×10⁻⁵ T + 1.848863×10⁻⁷ T² + 2001.6/T + 2.6899
// for ½N₂ + 1½H₂ ⇌ NH₃, T in kelvin, pressures in atm. Squared for the equation as written here, it
// gives 1.6×10⁻⁴ at 400 °C, 4.4×10⁻⁵ at 450 °C and 1.4×10⁻⁵ at 500 °C (per atm²), within 4 % of the
// table in Wikipedia's "Haber process". At 25 °C, ΔG° = −32.8 kJ gives K ≈ 6×10⁵.
export const kaHaber = (T) => Math.pow(10, 2 * (-2.691122 * L10(T) - 5.519265e-5 * T + 1.848863e-7 * T * T + 2001.6 / T + 2.6899));
// At hundreds of bar the gases are not ideal. Fugacity coefficients from Dyson and Simon (1968),
// T in kelvin and P in atm (fitted for roughly 300–600 °C and up to 600 atm):
export function phiHaber(T, P) {
  return {
    N2: 0.93431737 + 0.3101804e-3 * T + 0.295896e-3 * P - 0.2707279e-6 * T * T + 0.4775207e-6 * P * P,
    NH3: 0.1438996 + 0.2028538e-2 * T - 0.4487672e-3 * P - 0.1142945e-5 * T * T + 0.2761216e-6 * P * P,
    H2: Math.exp(Math.exp(-3.8402 * Math.pow(T, 0.125) + 0.541) * P - Math.exp(-0.1263 * Math.sqrt(T) - 15.980) * P * P + 300 * Math.exp(-0.011901 * T - 5.941) * (Math.exp(-P / 300) - 1)),
  };
}
// The constant that mole fractions must satisfy: y²NH₃ ÷ (yN₂ · y³H₂ · P²) = Ka ÷ Kφ. P in bar.
// With these two pieces a 1:3 feed gives 16.5 % NH₃ at 450 °C and 100 atm and 35.7 % at 300 atm,
// matching the classic measurements of Larson and Dodge (1923–24): 16.4 % and 35.5 %.
export function kHaber(T, Pbar, real = true) {
  const Ka = kaHaber(T);
  if (!real) return Ka;
  const P = Pbar / ATM, f = phiHaber(T, P);
  return Ka / ((f.NH3 * f.NH3) / (f.N2 * f.H2 * f.H2 * f.H2));
}
// Reaction quotient from amounts (any unit) at total pressure P (bar): Q in atm⁻².
export function qHaber(n, Pbar) {
  const nt = n.N2 + n.H2 + n.NH3 + (n.Ar || 0), P = Pbar / ATM;
  if (n.N2 <= 0 || n.H2 <= 0) return Infinity;
  return (n.NH3 * n.NH3 * nt * nt) / (n.N2 * n.H2 * n.H2 * n.H2 * P * P);
}
// Equilibrium extent ξ (N₂ used up) for a mixture at steady T and P. Bisection on Q = K.
export function haberEq(n, T, Pbar, real = true) {
  const K = kHaber(T, Pbar, real);
  let lo = -n.NH3 / 2, hi = Math.min(n.N2, n.H2 / 3);
  for (let i = 0; i < 60; i++) {
    const x = (lo + hi) / 2;
    const q = qHaber({ N2: n.N2 - x, H2: n.H2 - 3 * x, NH3: n.NH3 + 2 * x, Ar: n.Ar || 0 }, Pbar);
    if (q < K) lo = x; else hi = x;
  }
  const x = (lo + hi) / 2, out = { N2: n.N2 - x, H2: n.H2 - 3 * x, NH3: n.NH3 + 2 * x, Ar: n.Ar || 0 };
  out.x = x; out.y = out.NH3 / (out.N2 + out.H2 + out.NH3 + out.Ar);
  return out;
}
// Mole fraction of ammonia at equilibrium from a 1 N₂ : 3 H₂ feed.
export const haberY = (T, Pbar) => haberEq({ N2: 1, H2: 3, NH3: 0 }, T, Pbar).y;

// ---------------------------------------------------------------- the ammonia reaction as live kinetics
// A model rate law that any correct one must agree with at balance:
//   forward  = k · V · √(pN₂ · pH₂³)             (crowded reactants react faster)
//   backward = forward × Q ÷ K                    (so the two are equal exactly when Q = K)
// with k = k₀ · cat · exp(−Ea/R · (1/T − 1/723 K)). Both directions share k, so a catalyst (cat)
// speeds both by the same factor and cannot move the balance. Real kinetics on iron (Temkin and
// Pyzhev, 1940) are of this kind but more detailed. Speeds are compressed so you can watch: the
// model uses Ea = 40 kJ/mol and "no catalyst" as 40 times slower, while the real reaction is far
// more sensitive to temperature and without iron it does not measurably run at all.
// Amounts n are in molecules of the visible box; V ∝ n_total ÷ P, so forward = k · n_total · P · √(yN₂ · yH₂³).
export const HABER = { k0: 1.04e-3, Ea: 40000, noCat: 1 / 40, pass: 1.5 };
export function haberRates(n, T, Pbar, cat, real = true) {
  const nt = n.N2 + n.H2 + n.NH3 + (n.Ar || 0);
  if (n.N2 <= 0 || n.H2 <= 0 || nt <= 0) return [0, 0];
  const k = HABER.k0 * (cat ? 1 : HABER.noCat) * Math.exp((-HABER.Ea / R) * (1 / T - 1 / 723.15));
  const rf = k * nt * (Pbar / ATM) * Math.sqrt((n.N2 / nt) * Math.pow(n.H2 / nt, 3));
  return [rf, (rf * qHaber(n, Pbar)) / kHaber(T, Pbar, real)];
}
// Ammonia mole fraction after fresh 1:3 gas has spent `time` model seconds over the catalyst.
export function haberPass(T, Pbar, cat, time = HABER.pass) {
  const n = { N2: 30, H2: 90, NH3: 0 }, dt = 0.02;
  for (let t = 0; t < time; t += dt) { const [rf, rb] = haberRates(n, T, Pbar, cat); const d = Math.min((rf - rb) * dt, n.N2 * 0.5); n.N2 -= d; n.H2 -= 3 * d; n.NH3 += 2 * d; }
  return n.NH3 / (n.N2 + n.H2 + n.NH3);
}

// ---------------------------------------------------------------- CO₂ in water (Henry's law)
// NIST Chemistry WebBook (Sander's compilation): kH = 0.034 mol/(kg·bar) at 25 °C, and
// d ln kH ÷ d(1/T) = 2400 K. So cold water holds far more: 0.063 at 4 °C, 0.023 at 40 °C.
export const kHenry = (T) => 0.034 * Math.exp(2400 * (1 / T - 1 / 298.15));
export const M_CO2 = 44.01;            // g/mol

// ---------------------------------------------------------------- oxygen and haemoglobin
// The standard human curve (Severinghaus 1979): S = 1 ÷ (1 + 23,400 ÷ (p³ + 150 p)), p in mmHg,
// for pH 7.4 and 37 °C. Half the sites are full at P50 = 26.8 mmHg. Acid and heat shift it right:
// Δlog P50 = −0.48 ΔpH and +0.024 per °C (Severinghaus 1966), so a working muscle at pH 7.2 and
// 39 °C has P50 ≈ 37 mmHg. The shift is applied by scaling p.
export const P50 = 26.8;
export const hbSat = (p, p50 = P50) => { const q = p * P50 / p50; return 1 / (1 + 23400 / (q * q * q + 150 * q)); };
// Air pressure with height (West's model atmosphere, fitted to mountain measurements; h in km,
// mmHg): 760 at sea level, 505 at Leh (3.5 km), 253 on the summit of Everest.
export const pBaro = (hKm) => Math.exp(6.63268 - 0.1112 * hKm - 0.00149 * hKm * hKm);
// Oxygen in the air sacs: the alveolar gas equation, PAO₂ = 0.2093 (Pb − 47) − PaCO₂ ÷ 0.8.
// People breathe harder at height, so arterial CO₂ falls: about 40 mmHg at sea level, near 30 at
// 3.5 km and 13 on Everest (West 1983); a straight line through those is used here.
export function pAlveolar(hKm) { const pco2 = Math.max(10, 40 - 2.9 * hKm); return Math.max(5, 0.2093 * (pBaro(hKm) - 47) - pco2 / 0.8); }

// ---------------------------------------------------------------- limestone, water and CO₂
// CaCO₃(s) + CO₂ + H₂O ⇌ Ca²⁺ + 2 HCO₃⁻. Its constant is K = Ksp · K1 · KH ÷ K2, with each piece
// from Plummer and Busenberg (Geochim. Cosmochim. Acta 46, 1011, 1982), T in kelvin, 0–90 °C
// (used a little beyond, to 100 °C). At 25 °C: log KH = −1.468, log K1 = −6.352, log K2 = −10.329,
// log Ksp(calcite) = −8.480.
export function kCalcite(T) {
  const lg = L10(T);
  const KH = 108.3865 + 0.01985076 * T - 6919.53 / T - 40.45154 * lg + 669365 / (T * T);
  const K1 = -356.3094 - 0.06091964 * T + 21834.37 / T + 126.8339 * lg - 1684915 / (T * T);
  const K2 = -107.8871 - 0.03252849 * T + 5151.79 / T + 38.92561 * lg - 563713.9 / (T * T);
  const Ksp = -171.9065 - 0.077993 * T + 2839.319 / T + 71.595 * lg;
  return { KH: Math.pow(10, KH), K: Math.pow(10, Ksp + K1 + KH - K2) };
}
// With only limestone dissolved, [HCO₃⁻] = 2 [Ca²⁺], so K = 4 [Ca]³ ÷ pCO₂. The water can hold
// [Ca] = ∛(K · pCO₂ ÷ 4): 48 mg/L (as CaCO₃) under today's air at 25 °C, as textbooks give.
// Activity corrections are left out; they raise real solubilities by 10–30 % in hard water.
export const M_CACO3 = 100.09;         // g/mol
export const caSat = (T, pCO2) => Math.cbrt((kCalcite(T).K * pCO2) / 4) * M_CACO3 * 1000;   // mg/L as CaCO₃
export const pForCa = (T, mgL) => (4 * Math.pow(mgL / (M_CACO3 * 1000), 3)) / kCalcite(T).K;   // atm
export const P_AIR_CO2 = 4.2e-4;       // atm, CO₂ in outdoor air (about 420 ppm)

// ---------------------------------------------------------------- colours and numbers
export const COL = {
  fwd: '#5ce1a9',      // the forward reaction
  back: '#ff7a59',     // the backward reaction
  K: '#ffb547',        // the equilibrium constant
  Q: '#6fb6ff',        // the reaction quotient
  a: '#cfd6e4', b: '#d98a3a',   // N₂O₄ (pale), NO₂ (brown)
  n2: '#6f8cff', h2: '#e8eef8', nh3: '#5ce1a9', ar: '#c49bff',
  co2: '#e8eef8', ca: '#5ce1a9', hco3: '#6fb6ff', stone: '#efe7d6',
  o2: '#ff5a5a', hb: '#7a5cc8',
  hot: '#ff7a59', cold: '#6fb6ff', text: '#e8eef8',
};
export const hex = (c) => new THREE.Color(c).getHex();
export const fmt = (v, d = 1) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-IN') : v.toFixed(d));
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
export function sci(v, d = 2) {
  if (!isFinite(v)) return '∞';
  if (v === 0) return '0';
  const e = Math.floor(L10(Math.abs(v)));
  if (e >= -2 && e < 4) return v.toFixed(Math.max(0, d - e));
  return `${(v / 10 ** e).toFixed(d - 1)} × 10${String(e).split('').map((c) => SUP[c]).join('')}`;
}

// ---------------------------------------------------------------- statistics
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function gauss(r) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
// How many events happen in a short time when each is rare and independent.
export function poisson(r, mean) {
  if (!(mean > 0)) return 0;
  if (mean > 30) return Math.max(0, Math.round(mean + Math.sqrt(mean) * gauss(r)));
  const L = Math.exp(-mean); let k = 0, p = 1;
  do { k++; p *= r(); } while (p > L);
  return k - 1;
}
// A smoothed events-per-second counter.
export function meter(tau = 1.2) {
  let rate = 0, seen = false;
  return { add(n, dt) { if (dt <= 0) return; const inst = n / dt; rate = seen ? rate + (inst - rate) * (1 - Math.exp(-dt / tau)) : inst; seen = true; }, get rate() { return rate; }, reset() { rate = 0; seen = false; } };
}

// ---------------------------------------------------------------- boards (live charts in 3D)
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h); }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => { draw(g, pxW, pxH); tex.needsUpdate = true; };
  redraw();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); root.add(m);
  return { tex, redraw, canvas: c, mesh: m };
}
export function axes(g, w, h, { x0 = 84, x1 = w - 28, y0 = h - 64, y1 = 70, xMax, yMax, xMin = 0, yMin = 0, xTicks, yTicks, xFmt = String, yFmt = String, xLabel = '', yLabel = '', logX = false }) {
  const X = logX
    ? (x) => x0 + ((L10(Math.max(x, 1e-30)) - L10(xMin)) / (L10(xMax) - L10(xMin))) * (x1 - x0)
    : (x) => x0 + ((x - xMin) / (xMax - xMin)) * (x1 - x0);
  const Y = (y) => y0 - ((y - yMin) / (yMax - yMin)) * (y0 - y1);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '19px sans-serif';
  for (const t of xTicks) { g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); const s = xFmt(t); g.fillText(s, X(t) - g.measureText(s).width / 2, y0 + 26); }
  for (const t of yTicks) { g.beginPath(); g.moveTo(x0, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); const s = yFmt(t); g.fillText(s, x0 - 10 - g.measureText(s).width, Y(t) + 6); }
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '18px sans-serif';
  if (xLabel) g.fillText(xLabel, x1 - g.measureText(xLabel).width, y0 + 52);
  if (yLabel) g.fillText(yLabel, x0 + 8, y1 - 10);
  return { X, Y, x0, x1, y0, y1 };
}
export function title(g, text, sub = '') {
  g.fillStyle = COL.text; g.font = 'bold 24px sans-serif'; g.fillText(text, 20, 34);
  if (sub) { const x = 34 + g.measureText(text).width; g.font = '17px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(sub, x, 34); }
}
export function line(g, pts, X, Y, col, wdt = 5, dash = null) {
  if (pts.length < 2) return;
  g.strokeStyle = col; g.lineWidth = wdt; g.setLineDash(dash || []); g.lineJoin = 'round'; g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.stroke(); g.setLineDash([]);
}
export function dot(g, x, y, col, r = 10) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
export function legend(g, items, x = 24, y = 54, font = 18) {
  g.font = `bold ${font}px sans-serif`;
  for (const [n, c] of items) { g.fillStyle = c; g.fillRect(x, y, 16, 16); g.fillStyle = COL.text; g.fillText(n, x + 22, y + 15); x += 36 + g.measureText(n).width; }
}
export function text(g, s, x, y, col = COL.text, font = '18px sans-serif', align = 'left') {
  g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left';
}
// Q against K on a log scale that keeps K in the middle: three powers of ten each way.
// Q left of K means the forward reaction is winning; right of K, the backward one.
export function qkBar(g, x0, x1, y, Q, K, { span = 3, fwd = 'forward wins', back = 'backward wins', qTxt = null, kTxt = null } = {}) {
  const mid = (x0 + x1) / 2, half = (x1 - x0) / 2;
  const d = !isFinite(Q) ? span : Q <= 0 ? -span : clamp(L10(Q / K), -span, span);
  const grad = g.createLinearGradient(x0, 0, x1, 0);
  grad.addColorStop(0, 'rgba(92,225,169,.5)'); grad.addColorStop(0.5, 'rgba(255,255,255,.08)'); grad.addColorStop(1, 'rgba(255,122,89,.5)');
  g.fillStyle = grad; g.fillRect(x0, y - 9, x1 - x0, 18);
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1;
  for (let i = -span; i <= span; i++) { const x = mid + (i / span) * half; g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x, y + 14); g.stroke(); }
  text(g, '← ' + fwd, x0, y + 40, COL.fwd, 'bold 17px sans-serif');
  text(g, back + ' →', x1, y + 40, COL.back, 'bold 17px sans-serif', 'right');
  g.strokeStyle = COL.K; g.lineWidth = 4; g.beginPath(); g.moveTo(mid, y - 26); g.lineTo(mid, y + 22); g.stroke();
  const kLab = kTxt || 'K = ' + sci(K);
  text(g, kLab, mid, y - 34, COL.K, 'bold 19px sans-serif', 'center');
  const qx = mid + (d / span) * half;
  dot(g, qx, y, COL.Q, 11);
  const lab = qTxt || 'Q = ' + sci(Q);
  g.font = 'bold 19px sans-serif';
  const tw = g.measureText(lab).width, kw = g.measureText(kLab).width, lx = clamp(qx, x0 + tw / 2, x1 - tw / 2);
  text(g, lab, lx, Math.abs(lx - mid) < (tw + kw) / 2 + 14 ? y + 68 : y - 34, COL.Q, 'bold 19px sans-serif', 'center');
  return d;
}
// Words for where Q stands against K.
export function verdict(Q, K, tol = 0.06) {
  const d = !isFinite(Q) ? 9 : Q <= 0 ? -9 : Math.log(Q / K);
  return Math.abs(d) < tol ? 0 : d < 0 ? -1 : 1;
}

// ---------------------------------------------------------------- 3D pieces
// Glowing dots, one instanced mesh, each with its own colour.
export function dots(n, r, color = 0xffffff, seg = 8, lit = false) {
  const mat = lit ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0 }) : new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), mat, n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const o = new THREE.Object3D(), col = new THREE.Color(color);
  for (let i = 0; i < n; i++) { mesh.setColorAt(i, col); o.position.set(0, -99, 0); o.scale.setScalar(0.0001); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); }
  mesh.place = (i, x, y, z, s = 1) => { o.position.set(x, y, z); o.scale.setScalar(Math.max(0.0001, s)); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); };
  mesh.tint = (i, c) => mesh.setColorAt(i, c);
  mesh.done = () => { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; };
  return mesh;
}
// An arrow that ignores depth, aimed from a point along a direction with a length.
const UP = new THREE.Vector3(0, 1, 0), tmpV = new THREE.Vector3();
export function flowArrow(color, r = 0.05, head = 0.28) {
  const a = arrow(color, 1, head, r);
  a.traverse((o) => { if (o.material) { o.material.depthTest = false; o.renderOrder = 10; } });
  a.aim = (from, dir, len) => {
    a.position.set(...from);
    tmpV.set(...dir); if (tmpV.lengthSq() < 1e-9) tmpV.set(1, 0, 0);
    a.quaternion.setFromUnitVectors(UP, tmpV.normalize());
    a.set(Math.max(0.001, len));
    if (len < 0.05) a.visible = false;
  };
  return a;
}
// A glass tank with a sliding lid (a piston): setH(h) sets the height of the gas space.
export function tank(parent, { w = 2.6, d = 1.6, y0 = 0.45, hMax = 3.4, lid = 0xb9bec8, handle = 0xff7a59 } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const glassM = M.clear(0xcfe8ff, 0.1);
  const geo = new THREE.BoxGeometry(w, 1, d);
  const glass = new THREE.Mesh(geo, glassM); g.add(glass);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.7 })); g.add(edges);
  const rail = M.metal(0x6c7684, { roughness: 0.4 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(beam([sx * (w / 2 + 0.03), y0, sz * (d / 2 + 0.03)], [sx * (w / 2 + 0.03), y0 + hMax + 0.25, sz * (d / 2 + 0.03)], 0.028, rail, 8));
  const floor = box(w + 0.4, 0.16, d + 0.4, M.matte(0x2b3039)); floor.position.y = y0 - 0.08; g.add(floor);
  const piston = new THREE.Group(); g.add(piston);
  const lidM = M.metal(lid, { roughness: 0.3 });
  const plate = box(w - 0.03, 0.14, d - 0.03, lidM); plate.position.y = 0.07; piston.add(plate);
  piston.add(beam([0, 0.14, 0], [0, 0.85, 0], 0.06, lidM));
  const hd = box(0.9, 0.09, 0.3, M.plastic(handle)); hd.position.y = 0.88; piston.add(hd);
  g.piston = piston; g.glass = glass; g.glassM = glassM; g.floor = floor; g.dim = { w, d, y0, hMax };
  g.setH = (h) => { glass.scale.y = edges.scale.y = h; glass.position.y = edges.position.y = y0 + h / 2; piston.position.y = y0 + h; };
  g.bounds = (h, m = 0.1) => ({ x0: -w / 2 + m, x1: w / 2 - m, y0: y0 + m, y1: y0 + Math.max(0.3, h) - m, z0: -d / 2 + m, z1: d / 2 - m });
  g.setH(2);
  return g;
}

// ---------------------------------------------------------------- a box of reacting molecules
// Each molecule is a few coloured balls. They fly, bounce off the walls and tumble. react() swaps a
// set of molecules for another set at the place where they met, with a flash.
// species: { key: { atoms: [[x, y, z, r, colour], ...], speed } }  (speed relative, ∝ 1/√mass)
export function molBox(parent, species, { cap = 1400, rnd = rng(7), flashes = 30 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0 });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), mat, cap);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.count = 0;
  parent.add(mesh);
  const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), flashes);
  fl.instanceMatrix.setUsage(THREE.DynamicDrawUsage); fl.frustumCulled = false; parent.add(fl);
  const F = Array.from({ length: flashes }, () => ({ t: 9, p: [0, 0, 0], c: new THREE.Color() }));
  let fi = 0;
  const o = new THREE.Object3D(), col = new THREE.Color();
  const cols = {};
  for (const k in species) cols[k] = species[k].atoms.map((a) => new THREE.Color(a[4]));
  let mols = [];
  const n = {}; for (const k in species) n[k] = 0;
  let B = { x0: -1, x1: 1, y0: 0, y1: 2, z0: -1, z1: 1 };
  const spawn = (sp, p) => {
    const m = { sp, p: p ? [...p] : [B.x0 + rnd() * (B.x1 - B.x0), B.y0 + rnd() * (B.y1 - B.y0), B.z0 + rnd() * (B.z1 - B.z0)], u: [gauss(rnd), gauss(rnd), gauss(rnd)], a: rnd() * TAU, b: rnd() * TAU, w: (rnd() - 0.5) * 6, age: p ? 0 : 1 };
    mols.push(m); n[sp]++;
    return m;
  };
  const flash = (p, c) => { const f = F[fi++ % flashes]; f.t = 0; f.p = [...p]; f.c.set(c); };
  const api = {
    mesh, n,
    get mols() { return mols; },
    setBounds(b) { B = b; },
    clear() { mols = []; for (const k in n) n[k] = 0; },
    add(sp, k = 1, at = null, vel = null) { for (let i = 0; i < k; i++) { const m = spawn(sp, at ? [at[0] + (rnd() - 0.5) * 0.2, at[1] + (rnd() - 0.5) * 0.2, at[2] + (rnd() - 0.5) * 0.2] : null); if (vel) m.u = [vel[0] + gauss(rnd) * 0.4, vel[1] + gauss(rnd) * 0.4, vel[2] + gauss(rnd) * 0.4]; } },
    remove(sp, k = 1) {
      let left = Math.min(k, n[sp]);
      const took = left;
      for (let i = mols.length - 1; i >= 0 && left > 0; i--) if (mols[i].sp === sp) { mols.splice(i, 1); left--; }
      n[sp] -= took;
      return took;
    },
    // take: species keys used up; make: species keys created. low: prefer molecules near the floor
    // (a catalyst bed). Returns false when the molecules needed are not there.
    react(take, make, colour, low = false) {
      for (const k in n) { const need = take.filter((t) => t === k).length; if (n[k] < need) return false; }
      const pool = mols.filter((m) => m.sp === take[0]);
      let first = pool[Math.floor(rnd() * pool.length)];
      if (low) for (let i = 0; i < 5; i++) { const c = pool[Math.floor(rnd() * pool.length)]; if (c.p[1] < first.p[1]) first = c; }
      const used = [first];
      for (let j = 1; j < take.length; j++) {
        let best = null, bd = Infinity;
        for (const m of mols) {
          if (m.sp !== take[j] || used.includes(m)) continue;
          const d = (m.p[0] - first.p[0]) ** 2 + (m.p[1] - first.p[1]) ** 2 + (m.p[2] - first.p[2]) ** 2;
          if (d < bd) { bd = d; best = m; }
        }
        if (!best) return false;
        used.push(best);
      }
      const c = [0, 0, 0];
      // The meeting point leans to the first molecule, so partners are seen to come to it.
      used.forEach((m, i) => { const wgt = i === 0 ? 2 : 1; c[0] += m.p[0] * wgt; c[1] += m.p[1] * wgt; c[2] += m.p[2] * wgt; });
      c[0] /= used.length + 1; c[1] /= used.length + 1; c[2] /= used.length + 1;
      mols = mols.filter((m) => !used.includes(m));
      take.forEach((k) => { n[k]--; });
      make.forEach((k) => { const m = spawn(k, [c[0] + (rnd() - 0.5) * 0.16, c[1] + (rnd() - 0.5) * 0.16, c[2] + (rnd() - 0.5) * 0.16]); m.p[0] = clamp(m.p[0], B.x0, B.x1); m.p[1] = clamp(m.p[1], B.y0, B.y1); m.p[2] = clamp(m.p[2], B.z0, B.z1); });
      if (colour != null) flash(c, colour);
      return true;
    },
    // speed: scene units per second for a species of speed 1.
    step(dt, speed) {
      let k = 0;
      for (const m of mols) {
        const S = species[m.sp], v = speed * S.speed * 0.6;
        m.age = Math.min(1, m.age + dt * 4);
        for (let i = 0; i < 3; i++) m.p[i] += m.u[i] * v * dt;
        m.a += m.w * dt;
        if (m.p[0] < B.x0) { m.p[0] = Math.min(B.x1, 2 * B.x0 - m.p[0]); m.u[0] = Math.abs(m.u[0]); } else if (m.p[0] > B.x1) { m.p[0] = Math.max(B.x0, 2 * B.x1 - m.p[0]); m.u[0] = -Math.abs(m.u[0]); }
        if (m.p[1] < B.y0) { m.p[1] = Math.min(B.y1, 2 * B.y0 - m.p[1]); m.u[1] = Math.abs(m.u[1]); } else if (m.p[1] > B.y1) { m.p[1] = Math.max(B.y0, Math.min(B.y1, 2 * B.y1 - m.p[1])); m.u[1] = -Math.abs(m.u[1]); }
        if (m.p[2] < B.z0) { m.p[2] = Math.min(B.z1, 2 * B.z0 - m.p[2]); m.u[2] = Math.abs(m.u[2]); } else if (m.p[2] > B.z1) { m.p[2] = Math.max(B.z0, 2 * B.z1 - m.p[2]); m.u[2] = -Math.abs(m.u[2]); }
        const ca = Math.cos(m.a), sa = Math.sin(m.a), cb = Math.cos(m.b), sb = Math.sin(m.b), grow = 0.4 + 0.6 * m.age;
        const at = S.atoms, cc = cols[m.sp];
        for (let j = 0; j < at.length && k < cap; j++) {
          const a = at[j];
          const x1 = a[0] * ca - a[1] * sa, y1 = a[0] * sa + a[1] * ca, z1 = a[2];
          o.position.set(m.p[0] + (x1 * cb + z1 * sb) * grow, m.p[1] + y1 * grow, m.p[2] + (-x1 * sb + z1 * cb) * grow);
          o.scale.setScalar(a[3] * grow); o.updateMatrix();
          mesh.setMatrixAt(k, o.matrix); mesh.setColorAt(k, cc[j]); k++;
        }
      }
      mesh.count = k;
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      for (let i = 0; i < flashes; i++) {
        const f = F[i]; f.t += dt * 2.6;
        const q = clamp(f.t, 0, 1);
        o.position.set(f.p[0], f.p[1], f.p[2]); o.scale.setScalar(f.t < 1 ? 0.08 + 0.26 * q : 0.0001); o.updateMatrix();
        fl.setMatrixAt(i, o.matrix); fl.setColorAt(i, col.copy(f.c).multiplyScalar((1 - q) * 0.9));
      }
      fl.instanceMatrix.needsUpdate = true; if (fl.instanceColor) fl.instanceColor.needsUpdate = true;
    },
  };
  return api;
}
// Molecule shapes (ball sizes in scene units).
export const SHAPES = {
  // NO₂: a bent molecule (134°), brown. N₂O₄: two of them joined N to N, colourless (drawn pale).
  NO2: { speed: 1, atoms: [[0, 0.03, 0, 0.066, 0xc9772f], [0.08, -0.022, 0, 0.052, 0xe2562f], [-0.08, -0.022, 0, 0.052, 0xe2562f]] },
  N2O4: { speed: 0.71, atoms: [[-0.07, 0, 0, 0.062, 0xcfd6e4], [0.07, 0, 0, 0.062, 0xcfd6e4], [-0.125, 0.075, 0, 0.048, 0xf1c9c0], [-0.125, -0.075, 0, 0.048, 0xf1c9c0], [0.125, 0.075, 0, 0.048, 0xf1c9c0], [0.125, -0.075, 0, 0.048, 0xf1c9c0]] },
  // Speeds scale as 1/√(molar mass), relative to N₂ (28): H₂ (2) is 3.7 times faster.
  N2: { speed: 1, atoms: [[-0.055, 0, 0, 0.075, 0x6f8cff], [0.055, 0, 0, 0.075, 0x6f8cff]] },
  H2: { speed: 2.4, atoms: [[-0.035, 0, 0, 0.045, 0xf2f5fb], [0.035, 0, 0, 0.045, 0xf2f5fb]] },   // drawn slower than the true 3.7× so the eye can follow
  NH3: { speed: 1.28, atoms: [[0, 0.02, 0, 0.08, 0x5ce1a9], [0.075, -0.035, 0.03, 0.045, 0xf2f5fb], [-0.075, -0.035, 0.03, 0.045, 0xf2f5fb], [0, -0.035, -0.08, 0.045, 0xf2f5fb]] },
  Ar: { speed: 0.84, atoms: [[0, 0, 0, 0.085, 0xc49bff]] },
};

// On a phone-width stage: hide minor labels and nudge the picture down, clear of the readout.
export function fitNarrow(stage, minor = []) {
  const narrow = stage.host.clientWidth < 560;
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = narrow && !inReel() ? -0.2 : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  return narrow;
}
// True while the Glassbox studio records the reel: scenes then choose their own camera views.
export const inReel = () => document.body.classList.contains('gb-reel');
// Chart boards sit to the right of the model on screen. In the tall reel video they stack above the
// model instead, so everything fits the portrait frame.
export function reelBoards(boards, x = 0, yTop = 9.6, gap = 3.05) {
  const r = inReel();
  boards.forEach((b, i) => {
    if (!b.home) b.home = b.mesh.position.clone();
    if (r) { b.mesh.position.set(x, yTop - i * gap, 0); b.mesh.scale.setScalar(1.3); }
    else { b.mesh.position.copy(b.home); b.mesh.scale.setScalar(1); }
  });
}
export { clamp, beam, box, sphere };
