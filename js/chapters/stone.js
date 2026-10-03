// Chapter 4: one reaction, two places. CaCO₃(s) + CO₂ + H₂O ⇌ Ca²⁺ + 2 HCO₃⁻.
// More dissolved CO₂ pushes it right (limestone dissolves); losing CO₂ pushes it left (stone comes
// back out). K = Ksp·K1·KH ÷ K2 from Plummer and Busenberg (1982), see eq.js. With only limestone
// dissolved, [HCO₃⁻] = 2[Ca²⁺], so Q = 4[Ca]³ ÷ pCO₂ and the water can hold [Ca] = ∛(K·pCO₂ ÷ 4):
// 48 mg/L (counted as CaCO₃) under outdoor air at 25 °C, 200 mg/L under 3 % CO₂.
// (a) Kettle or geyser: hard tap water left its aquifer carrying extra CO₂. Heating drives the CO₂
//     out (and lowers K about six-fold between 20 and 100 °C), so Q rises far above K and CaCO₃
//     comes out as scale. The model follows three numbers per litre: dissolved Ca, the CO₂ pressure
//     the water is in balance with, and the scale formed. CO₂ escapes faster the hotter the water;
//     scale forms at a rate proportional to the excess over what the water can hold. Rates are
//     time-lapse; the end point is the thermodynamics. Real kettles deposit only part of the limit
//     per boil. Hardness guide (IS 10500:2012, the Indian drinking-water standard): 200 mg/L
//     acceptable, 600 mg/L permissible.
// (b) Limestone cave: rain soaks through soil where roots and microbes raise CO₂ to 1–10 % (outdoor
//     air: 0.042 %), dissolves limestone, then drips into cave air with far less CO₂. The CO₂ leaves
//     the drop, Q exceeds K, and a film of calcite is left behind. Stalactites grow about 0.13 mm a
//     year on average (Wikipedia, "Stalactite"); the drawing runs in time-lapse.
import { THREE, M, box, approach } from '../kit.js';
import {
  K0, COL, hex, kCalcite, caSat, pForCa, P_AIR_CO2, M_CACO3, board, panelBg, axes, title, line, dot, legend, text, qkBar, verdict,
  rng, gauss, fitNarrow, reelBoards, clamp, dots, TAU, sci,
} from '../eq.js';

const MOL = M_CACO3 * 1000;                 // mg of CaCO₃ per mole
const pct = (p) => (p >= 0.001 ? (p * 100).toFixed(p >= 0.01 ? 1 : 2) + ' %' : Math.round(p * 1e6) + ' ppm');

export default {
  id: 'stone',
  short: 'Scale and caves',
  title: 'Stone that comes and goes',
  subtitle: 'The crust in a kettle and the stalactites of a limestone cave are the same balance, tipped by carbon dioxide.',
  view: { pos: [2.0, 3.7, 10.0], target: [2.0, 3.25, 0] },
  learn: `<p>Limestone is <b>calcium carbonate</b>, CaCO₃. Pure water barely dissolves it. Water with <b>carbon dioxide</b> in it does: CaCO₃ + CO₂ + H₂O ⇌ Ca²⁺ + 2HCO₃⁻. It is a reversible reaction, and CO₂ is the lever. More CO₂ pushes it right and stone dissolves. Take CO₂ away and it runs left: stone comes back.</p>
    <p><b>Hard water</b> is groundwater that has dissolved limestone on its way through rock. Heat it in a <b>kettle</b> or geyser and the CO₂ is driven out, just as a warm fizzy drink goes flat. With its CO₂ gone, the water can hold far less: Q is suddenly far above K. The extra comes out as the white crust called <b>scale</b>. It does not dissolve again when the water cools, because the CO₂ that held it has left.</p>
    <p>To remove scale you add an acid such as vinegar or lemon juice. The acid turns carbonate into CO₂ and water, taking away a product, so the balance shifts towards dissolving. That is Le Chatelier's principle cleaning your kettle (for acids, see <a href="https://glassbox.how/acidbaseclear/">AcidBaseClear</a>; for the geyser, WaterHeaterClear).</p>
    <p>A <b>limestone cave</b> is the same reaction run by nature. Rain soaks through soil, where roots and microbes breathe out CO₂: soil air can hold a hundred times more CO₂ than open air. That water dissolves the rock and widens cracks into caves. When a drop reaches the cave roof, it meets air with much less CO₂. The CO₂ leaves the drop and a film of stone is left. Drop by drop, over thousands of years, a <b>stalactite</b> grows down and a <b>stalagmite</b> grows up. A stalagmite from <b>Mawmluh cave</b> in Meghalaya records a great drought 4,200 years ago, and gave its name to the <b>Meghalayan Age</b> we live in.</p>
    <p class="tip"><b>Try it:</b> heat the kettle to 100 °C and watch the CO₂ bubble out and the scale grow. Refill a few times, then descale with vinegar. In the cave, raise the soil CO₂ and see more stone left by every litre; then make the cave air stuffier than the soil and watch the stalactite start to dissolve.</p>`,
  terms: [
    { t: 'Hard water', d: 'Water with dissolved calcium (and magnesium). Hardness is counted as milligrams of CaCO₃ per litre.' },
    { t: 'Temporary hardness', d: 'The part held as calcium bicarbonate. Boiling removes it as scale.' },
    { t: 'Scale (limescale)', d: 'The crust of calcium carbonate left when hard water is heated.' },
    { t: 'Bicarbonate', d: 'HCO₃⁻, the ion that carries dissolved limestone. Two form for every calcium ion.' },
    { t: 'Stalactite and stalagmite', d: 'Stalactites hang tight to the ceiling; stalagmites grow from the ground. Both are calcite left by dripping water.' },
    { t: 'Karst', d: 'Landscape of caves and sinkholes made where water has dissolved limestone.' },
  ],
  defaults: { scene: 'kettle', hard: 300, T: 20, soil: 0.02, cave: 0.0008, caveT: 18 },
  controls: [
    { key: 'scene', type: 'seg', label: 'Where', options: [{ v: 'kettle', label: 'Kettle' }, { v: 'cave', label: 'Limestone cave' }], fmt: (v) => (v === 'kettle' ? 'hard water, heated' : 'drip water, in cave air') },
    { key: 'hard', type: 'range', label: 'Kettle: hardness of the tap water', min: 50, max: 500, step: 10, ends: ['50: soft', '500 mg/L: very hard'], fmt: (v) => `${Math.round(v)} mg/L` },
    { key: 'T', type: 'range', label: 'Kettle: water temperature', min: 20, max: 100, step: 1, ends: ['20 °C', '100 °C: boiling'], fmt: (v) => `${Math.round(v)} °C` },
    { key: 'go', type: 'buttons', label: 'Kettle', items: [{ label: 'Refill with cold tap water', act: (s, inst) => { s.scene = 'kettle'; s.T = 20; inst.refill(s, false); } }, { label: 'Descale with vinegar', act: (s, inst) => { s.scene = 'kettle'; inst.descale(); } }] },
    { key: 'soil', type: 'log', label: 'Cave: CO₂ in the soil above', min: 0.0004, max: 0.1, ends: ['0.04 %: bare rock', '10 %: rich soil'], fmt: (v) => pct(v) },
    { key: 'cave', type: 'log', label: 'Cave: CO₂ in the cave air', min: 0.0004, max: 0.02, ends: ['400 ppm: well aired', '2 %: stuffy'], fmt: (v) => pct(v) },
    { key: 'caveT', type: 'range', label: 'Cave: temperature', min: 5, max: 30, step: 1, ends: ['5 °C', '30 °C'], fmt: (v) => `${Math.round(v)} °C` },
  ],
  onChange(s, key) { if (key === 'hard' || key === 'T') s.scene = 'kettle'; if (key === 'soil' || key === 'cave' || key === 'caveT') s.scene = 'cave'; },
  quiz: [
    { q: 'Why does boiling hard water leave scale?', options: ['The water evaporates and leaves salt', 'Heat drives out the CO₂ that kept the limestone dissolved, so the balance shifts back to solid CaCO₃', 'The kettle metal reacts with water', 'Boiling makes new calcium'], answer: 1, why: 'Dissolved limestone needs dissolved CO₂. Heating removes the CO₂, so Ca²⁺ + 2HCO₃⁻ → CaCO₃ + CO₂ + H₂O runs forward and solid comes out.' },
    { q: 'Why does vinegar remove kettle scale?', options: ['It scratches the scale off', 'The acid turns carbonate into CO₂ that escapes, so the balance keeps shifting towards dissolving', 'Vinegar is hotter than water', 'It makes the water harder'], answer: 1, why: 'Acid uses up carbonate and the CO₂ bubbles away. With a product constantly removed, the solid keeps dissolving.' },
    { q: 'Drip water enters a cave carrying dissolved limestone. What makes it leave stone behind?', options: ['The water freezes', 'It loses CO₂ to the cave air, which has much less CO₂ than the soil it came through', 'Cave air is very hot', 'Bats'], answer: 1, why: 'The water was in balance with CO₂-rich soil air. In cave air the CO₂ escapes from the drop, Q rises above K, and calcite is deposited.' },
  ],
  reel: [
    { ms: 5400, caption: 'Boil hard water and its carbon dioxide escapes. The balance tips, and dissolved limestone drops out as scale.', set: { scene: 'kettle', hard: 400, T: 20 }, act: (s, inst) => inst.refill(s, true), anim: { T: [20, 100] }, view: { pos: [0, 4.8, 7.4], target: [0, 4.6, 0] }, spin: 0.05 },
    { ms: 5400, caption: 'Caves run the same reaction. Each drop loses carbon dioxide to the cave air and leaves a little stone.', set: { scene: 'cave', soil: 0.004, cave: 0.0008, caveT: 18 }, anim: { soil: [0.004, 0.06, true] }, view: { pos: [0, 4.8, 7.4], target: [0, 4.6, 0] }, spin: 0.05 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(77);
    const base = box(4.4, 0.12, 2.8, M.matte(0x232832)); base.position.set(0, 0.06, 0); root.add(base);
    const gK = new THREE.Group(), gC = new THREE.Group(); root.add(gK, gC);

    // ---------------------------------------------------------------- kettle
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.8, 48, 1, true), M.clear(0xcfe8ff, 0.14)); glass.position.y = 1.8; gK.add(glass);
    const kb = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.12, 0.3, 48), M.plastic(0x30343c)); kb.position.y = 0.27; gK.add(kb);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.04, 8, 48), M.metal(0x9fb4c8)); rim.rotation.x = Math.PI / 2; rim.position.y = 3.2; gK.add(rim);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.09, 10, 32, Math.PI), M.plastic(0x30343c)); handle.rotation.z = Math.PI / 2; handle.position.set(-1.0, 1.9, 0); gK.add(handle);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 0.96, 2.2, 48), new THREE.MeshStandardMaterial({ color: 0x7fc4ff, transparent: true, opacity: 0.22, roughness: 0.1, depthWrite: false })); water.position.y = 1.52; gK.add(water);
    const coilMat = new THREE.MeshStandardMaterial({ color: 0x8a8f99, emissive: 0x000000, metalness: 0.6, roughness: 0.4 });
    for (const R of [0.3, 0.62]) { const c = new THREE.Mesh(new THREE.TorusGeometry(R, 0.07, 10, 48), coilMat); c.rotation.x = Math.PI / 2; c.position.y = 0.56; gK.add(c); }
    const NCA = 50, ca = dots(NCA, 0.075, hex(COL.ca), 8), hc = dots(NCA * 2, 0.055, hex(COL.hco3), 8), bub = dots(40, 0.06, 0xffffff, 8), crust = dots(90, 0.085, hex(COL.stone), 6, true);
    gK.add(ca, hc, bub, crust);
    const ion = () => { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 0.85; return { p: [r * Math.cos(a), 0.8 + rnd() * 1.75, r * Math.sin(a)], u: [gauss(rnd), gauss(rnd), gauss(rnd)] }; };
    const CA = Array.from({ length: NCA }, ion), HC = Array.from({ length: NCA * 2 }, ion);
    const BU = Array.from({ length: 40 }, () => ({ life: 0, p: [0, -9, 0], big: 1 }));
    const CR = Array.from({ length: 90 }, (_, i) => { const R = i % 3 === 0 ? 0.3 : 0.62, a = rnd() * TAU, b = rnd() * TAU; return [(R + Math.cos(b) * 0.08) * Math.cos(a), 0.56 + Math.sin(b) * 0.08 + 0.02, (R + Math.cos(b) * 0.08) * Math.sin(a), 0.6 + rnd() * 0.8]; });
    const W = { ca: 300, p: 0.01, scale: 0, boil: 0, acid: false, T: 20, hard: 300, p0: 0.01 };
    let S = { scene: 'kettle', hard: 300, T: 20, soil: 0.02, cave: 0.0008, caveT: 18 };
    const refill = (s2, clean) => {
      if (s2) S = s2;
      W.hard = S.hard; W.ca = S.hard; W.p = W.p0 = Math.max(P_AIR_CO2, pForCa(293.15, S.hard)); W.boil = 0; W.acid = false; W.T = 20;
      if (clean) W.scale = 0;
    };
    refill(null, true);
    let bubAcc = 0, scene = '', key = '', t = 0, grow = 0.45;
    const lK = stage.label('', [0, 3.65, 0], gK, 'hot'), lScale = stage.label('', [1.5, 0.62, 0.6], gK), lIon = stage.label('green: Ca²⁺ &nbsp; blue: HCO₃⁻', [1.75, 2.3, 0.4], gK);

    // ---------------------------------------------------------------- cave (a slice through the hill)
    const rock = M.matte(0x6f6c64), dark = M.matte(0x2f2d2a);
    gC.scale.setScalar(0.8);
    const soil = box(4.2, 0.45, 1.8, M.matte(0x5b4028)); soil.position.set(0, 4.55, 0); gC.add(soil);
    for (let i = 0; i < 9; i++) { const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 6), M.matte(0x4c9a4a)); tuft.position.set(-1.8 + i * 0.45 + (rnd() - 0.5) * 0.2, 4.93, (rnd() - 0.5) * 1.2); gC.add(tuft); }
    for (const sx of [-1, 1]) { const r1 = box(2.06, 1.3, 1.8, rock); r1.position.set(sx * 1.07, 3.68, 0); gC.add(r1); const wall = box(0.5, 2.75, 1.8, rock); wall.position.set(sx * 1.85, 1.65, 0); gC.add(wall); }
    const back = box(3.2, 2.75, 0.3, dark); back.position.set(0, 1.65, -0.75); gC.add(back);
    const flo = box(4.2, 0.3, 1.8, rock); flo.position.set(0, 0.27, 0); gC.add(flo);
    const stoneM = M.matte(hex(COL.stone));
    const tite = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1, 20), stoneM); tite.rotation.x = Math.PI; gC.add(tite);
    const mite = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1, 20), stoneM); gC.add(mite);
    const drops = dots(4, 0.06, 0x8fd0ff, 8), seep = dots(10, 0.045, 0x8fd0ff, 8), co2 = dots(18, 0.05, 0xffffff, 8);
    gC.add(drops, seep, co2);
    const CO = Array.from({ length: 18 }, () => ({ life: 0, p: [0, -9, 0], v: [0, 0, 0] }));
    let coAcc = 0;
    const lSoil = stage.label('', [0, 5.25, 0], gC, 'hot'), lCave = stage.label('', [1.0, 1.1, 0.7], gC, 'hot'), lTite = stage.label('', [-1.05, 2.3, 0.7], gC);
    const caveN = (s) => { const T = s.caveT + K0, a = caSat(T, s.soil), b = caSat(T, s.cave); return { T, a, b, dep: a - b }; };

    // ---------------------------------------------------------------- boards
    const top = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h);
      title(g, 'How much limestone water can hold', 'mg per litre');
      const { X, Y } = axes(g, w, h, { x0: 64, y1: 84, y0: h - 58, xMin: 1e-4, xMax: 1, yMax: 500, logX: true, xTicks: [1e-4, 1e-3, 1e-2, 1e-1, 1], yTicks: [0, 100, 200, 300, 400, 500], xFmt: (v) => +(v * 100).toPrecision(1) + ' %' });
      text(g, 'CO₂ in the air the water is in balance with', X(1), h - 8, 'rgba(255,255,255,.7)', '15px sans-serif', 'right');
      const curve = (T) => { const pts = []; for (let e = -4; e <= 0.001; e += 0.1) pts.push([10 ** e, Math.min(520, caSat(T, 10 ** e))]); return pts; };
      g.save(); g.beginPath(); g.rect(X(1e-4), Y(500), X(1) - X(1e-4), Y(0) - Y(500)); g.clip();
      if (S.scene === 'kettle') {
        line(g, curve(293.15), X, Y, COL.cold, 3);
        if (W.T > 25) line(g, curve(W.T + K0), X, Y, COL.hot, 4);
        g.restore();
        legend(g, W.T > 25 ? [['at 20 °C', COL.cold], [`at ${Math.round(W.T)} °C`, COL.hot]] : [['at 20 °C', COL.cold]], 20, 50, 16);
        g.strokeStyle = 'rgba(255,255,255,.5)'; g.setLineDash([5, 5]); g.lineWidth = 2; g.beginPath(); g.moveTo(X(W.p0), Y(Math.min(500, W.hard))); g.lineTo(X(clamp(W.p, 1e-4, 1)), Y(Math.min(500, W.ca))); g.stroke(); g.setLineDash([]);
        dot(g, X(W.p0), Y(Math.min(500, W.hard)), 'rgba(255,255,255,.5)', 6);
        dot(g, X(clamp(W.p, 1e-4, 1)), Y(Math.min(500, W.ca)), COL.ca, 10);
        text(g, 'the water now', X(clamp(W.p, 1e-4, 1)) + 14, Y(Math.min(500, W.ca)) - 10, COL.ca, 'bold 17px sans-serif');
      } else {
        const c = caveN(S);
        line(g, curve(c.T), X, Y, COL.Q, 4);
        g.restore();
        const ya = Math.min(500, c.a), yb = Math.min(500, c.b);
        g.strokeStyle = c.dep >= 0 ? COL.stone : COL.back; g.lineWidth = 3; g.beginPath(); g.moveTo(X(S.soil), Y(ya)); g.lineTo(X(S.cave), Y(ya)); g.lineTo(X(S.cave), Y(yb)); g.stroke();
        dot(g, X(S.soil), Y(ya), '#b98a5a', 9); text(g, 'in the rock', X(S.soil) + 12, Y(ya) + 22, '#d9b48a', 'bold 17px sans-serif');
        dot(g, X(S.cave), Y(yb), COL.K, 9); text(g, 'in cave air', X(S.cave) + 12, Y(yb) + 22, COL.K, 'bold 17px sans-serif');
        text(g, c.dep >= 0 ? `${c.dep.toFixed(0)} mg of stone left per litre` : 'this water dissolves the cave', 20, 62, c.dep >= 0 ? COL.stone : COL.back, 'bold 18px sans-serif');
      }
    }, [4.95, 3.75, 0]);
    const bot = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h);
      const rows = [];
      let Q, K;
      if (S.scene === 'kettle') {
        K = kCalcite(W.T + K0).K; Q = W.acid ? K * 1e-4 : (4 * Math.pow(W.ca / MOL, 3)) / W.p;
        rows.push(['CO₂ left in the water', `${(100 * clamp((W.p - P_AIR_CO2) / Math.max(1e-9, W.p0 - P_AIR_CO2), 0, 1)).toFixed(0)} % of the extra it came with`], ['Still dissolved', `${W.ca.toFixed(0)} of ${W.hard} mg/L`], ['Scale on the element', `${W.scale.toFixed(0)} mg`]);
      } else {
        const c = caveN(S); K = kCalcite(c.T).K; Q = (4 * Math.pow(c.a / MOL, 3)) / S.cave;
        rows.push(['Picked up in the rock', `${c.a.toFixed(0)} mg/L`], ['Can hold in the cave air', `${c.b.toFixed(0)} mg/L`], [c.dep >= 0 ? 'Left behind as stone' : 'Extra it can still dissolve', `${Math.abs(c.dep).toFixed(0)} mg per litre`]);
      }
      const v = verdict(Q, K, 0.1);
      title(g, 'Q against K', v === 0 ? 'balanced' : v > 0 ? 'holding too much: stone comes out' : 'room to spare: stone dissolves');
      qkBar(g, 40, w - 40, 128, Q, K, { fwd: 'stone dissolves', back: 'stone forms', kTxt: `K = ${sci(K)}`, qTxt: W.acid && S.scene === 'kettle' ? 'Q: acid has removed the carbonate' : `Q = ${sci(Q)}` });
      rows.forEach(([a, b], i) => { text(g, a, 20, 236 + i * 36, 'rgba(255,255,255,.7)', '18px sans-serif'); text(g, b, w - 20, 236 + i * 36, COL.text, 'bold 19px sans-serif', 'right'); });
    }, [4.95, 1.4, 0]);

    return {
      refill,
      descale() { W.acid = true; },
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        const narrow = fitNarrow(stage, [lScale, lIon, lTite]);
        reelBoards([top, bot], 0, 9.6);
        if (s.scene !== scene) { scene = s.scene; gK.visible = scene === 'kettle'; gC.visible = scene === 'cave'; key = ''; }
        t += dt;
        if (scene === 'kettle') {
          if (s.hard !== W.hard) refill(s, false);
          W.T = approach(W.T, s.T, 2.5, dt);
          const T = W.T + K0, hot = clamp((W.T - 20) / 80, 0, 1), KH = kCalcite(T).KH;
          let out = 0;
          for (let i = 0; i < 4; i++) {
            const h = dt / 4, kg = 0.004 + 1.6 * hot * hot;
            const esc = (W.p - P_AIR_CO2) * (1 - Math.exp(-kg * h)); W.p -= esc; out += esc * KH;
            if (W.acid) { const d = Math.min(W.scale, (0.9 * W.scale + 4) * h); W.scale -= d; W.ca += d; out += d / MOL; continue; }
            const sat = caSat(T, W.p);
            if (W.ca > sat) { const d = (0.25 + 0.6 * hot) * (W.ca - sat) * h; W.ca -= d; W.scale += d; W.boil += d; W.p += d / MOL / KH; }
            else if (W.scale > 0) { const d = Math.min(W.scale, 0.3 * (sat - W.ca) * h, (W.p - 1e-6) * KH * MOL * 0.5); if (d > 0) { W.scale -= d; W.ca += d; W.p -= d / MOL / KH; } }
          }
          // ions: one green dot per 10 mg/L
          const nCa = Math.round(clamp(Math.min(W.ca, 500) / 10, 0, NCA));
          const move = (arr, mesh, n, sp) => { arr.forEach((q, i) => { for (let k = 0; k < 3; k++) q.p[k] += q.u[k] * sp * dt; if (rnd() < dt) q.u = [gauss(rnd), gauss(rnd), gauss(rnd)]; const rr = Math.hypot(q.p[0], q.p[2]); if (rr > 0.86) { q.p[0] *= 0.86 / rr; q.p[2] *= 0.86 / rr; q.u[0] *= -1; q.u[2] *= -1; } if (q.p[1] < 0.78) { q.p[1] = 0.78; q.u[1] = Math.abs(q.u[1]); } else if (q.p[1] > 2.55) { q.p[1] = 2.55; q.u[1] = -Math.abs(q.u[1]); } mesh.place(i, q.p[0], q.p[1], q.p[2], i < n ? 1 : 0.0001); }); mesh.done(); };
          const sp = 0.25 + 0.6 * hot;
          move(CA, ca, nCa, sp); move(HC, hc, nCa * 2, sp);
          // bubbles: CO₂ leaving, plus steam at the boil
          const boil = W.T > 97 ? 14 : 0;
          bubAcc += (clamp(out / Math.max(dt, 1e-4) * 2500, 0, 26) + boil) * dt;
          BU.forEach((b, i) => {
            if (b.life <= 0 && bubAcc >= 1) { bubAcc -= 1; const a = rnd() * TAU, R = rnd() < 0.4 ? 0.3 : 0.62; b.p = [R * Math.cos(a), 0.66, R * Math.sin(a)]; b.life = 1; b.big = 0.8 + rnd() * 0.9; }
            if (b.life > 0) { b.p[1] += (1.1 + b.big * 0.5) * dt; if (b.p[1] > 2.62) b.life = 0; }
            bub.place(i, b.p[0], b.p[1], b.p[2], b.life > 0 ? b.big : 0.0001);
          });
          bub.done(); if (bubAcc > 12) bubAcc = 12;
          const nCr = clamp(Math.round(W.scale / 12), 0, 90);
          CR.forEach((c, i) => crust.place(i, c[0], c[1], c[2], i < nCr ? c[3] * (0.7 + Math.min(1, W.scale / 900)) : 0.0001)); crust.done();
          coilMat.emissive.setRGB(hot * 0.7, hot * 0.16, 0);
          coilMat.color.set(0x8a8f99).lerp(new THREE.Color(hex(COL.stone)), clamp(W.scale / 600, 0, 0.85));
          lK.element.innerHTML = W.acid ? 'vinegar in: the scale fizzes away' : `water at <b>${Math.round(W.T)} °C</b>`;
          lK.element.style.setProperty('--c', W.acid ? COL.fwd : W.T > 40 ? COL.hot : COL.cold);
          lScale.element.innerHTML = `scale: <b>${W.scale.toFixed(0)} mg</b>`;
          void narrow;
        } else {
          const c = caveN(s);
          grow = clamp(grow + (c.dep / 250) * 0.05 * dt, 0.12, 1.25);
          tite.scale.set(0.7 + grow * 0.5, grow, 0.7 + grow * 0.5); tite.position.set(0, 3.03 - grow / 2, 0);
          const mg = grow * 0.75; mite.scale.set(0.7 + grow * 0.5, mg, 0.7 + grow * 0.5); mite.position.set(0, 0.42 + mg / 2, 0);
          const tip = 3.03 - grow, landing = 0.42 + mg;
          for (let i = 0; i < 4; i++) { const ph = (t * 0.55 + i / 4) % 1, fall = ph * ph; drops.place(i, 0, tip - 0.05 - fall * (tip - landing - 0.1), 0, ph < 0.08 ? 0.5 + ph * 6 : 1); }
          drops.done();
          for (let i = 0; i < 10; i++) { const ph = (t * 0.25 + i / 10) % 1; seep.place(i, Math.sin(i * 2.1) * 0.03, 4.32 - ph * 1.3, 0.3 + Math.cos(i) * 0.2); }
          seep.done();
          coAcc += clamp(c.dep / 20, 0, 9) * dt;
          CO.forEach((q, i) => {
            if (q.life <= 0 && coAcc >= 1) { coAcc -= 1; q.life = 1.6; q.p = [0, tip - 0.08, 0.05]; const a = rnd() * TAU; q.v = [Math.cos(a) * 0.5, 0.15 + rnd() * 0.3, Math.sin(a) * 0.25]; }
            if (q.life > 0) { q.life -= dt; for (let k = 0; k < 3; k++) q.p[k] += q.v[k] * dt; }
            co2.place(i, q.p[0], q.p[1], q.p[2], q.life > 0 ? 0.4 + 0.6 * (q.life / 1.6) : 0.0001);
          });
          co2.done(); if (coAcc > 6) coAcc = 6;
          lSoil.element.innerHTML = `soil air: <b>${pct(s.soil)}</b> CO₂`; lSoil.element.style.setProperty('--c', '#d9b48a');
          lCave.element.innerHTML = `cave air: <b>${pct(s.cave)}</b> CO₂`; lCave.element.style.setProperty('--c', COL.K);
          lTite.element.innerHTML = c.dep >= 0 ? 'CO₂ leaves the drop, stone stays' : 'the drop takes stone away';
        }
        const kk = `${scene}|${Math.round(t * 8)}`;
        if (kk !== key) { key = kk; top.redraw(); bot.redraw(); }
      },
      readout: (s) => {
        if (s.scene === 'kettle') {
          const T = W.T + K0, K = kCalcite(T).K, Q = (4 * Math.pow(W.ca / MOL, 3)) / W.p, v = W.acid ? -1 : verdict(Q, K, 0.1), sat = caSat(T, W.p);
          return `<div class="big">Ca²⁺ + 2HCO₃⁻ ⇌ CaCO₃ + CO₂ + H₂O</div>
            <div class="row"><span>Tap water hardness</span><b>${Math.round(W.hard)} mg/L</b></div>
            <div class="row"><span>CO₂ the water still carries</span><b style="color:${COL.Q}">${(W.p / P_AIR_CO2).toFixed(W.p / P_AIR_CO2 < 10 ? 1 : 0)} × open-air level</b></div>
            <div class="row"><span>It can hold now, at ${Math.round(W.T)} °C</span><b style="color:${COL.K}">${W.acid ? 'acid: all of it' : sat.toFixed(0) + ' mg/L'}</b></div>
            <div class="row"><span>Still dissolved</span><b style="color:${COL.ca}">${W.ca.toFixed(0)} mg/L</b></div>
            <div class="row"><span>Scale on the element</span><b>${W.scale.toFixed(0)} mg (this fill: ${W.boil.toFixed(0)})</b></div>
            <div class="row"><span>So</span><b class="${v === 0 ? 'ok' : ''}">${W.acid ? 'acid shifts it: scale dissolves' : v === 0 ? 'balanced: Q = K' : v > 0 ? 'Q > K: scale is forming' : 'Q < K: nothing comes out'}</b></div>
            <small>One litre, in time-lapse. This is the most that can come out; a real boil leaves part of it. At ${W.boil.toFixed(0)} mg a litre, 2 L a day is up to ${((W.boil * 2 * 365) / 1000).toFixed(0)} g a year.</small>`;
        }
        const c = caveN(s);
        return `<div class="big">CaCO₃ + CO₂ + H₂O ⇌ Ca²⁺ + 2HCO₃⁻</div>
          <div class="row"><span>CO₂ in the soil air</span><b>${pct(s.soil)} (${(s.soil / P_AIR_CO2).toFixed(0)} × open air)</b></div>
          <div class="row"><span>Limestone picked up in the rock</span><b style="color:${COL.ca}">${c.a.toFixed(0)} mg/L</b></div>
          <div class="row"><span>CO₂ in the cave air</span><b>${pct(s.cave)}</b></div>
          <div class="row"><span>The water can hold there</span><b style="color:${COL.K}">${c.b.toFixed(0)} mg/L</b></div>
          <div class="row"><span>${c.dep >= 0 ? 'Stone left by each litre' : 'Stone each litre can still dissolve'}</span><b class="${c.dep >= 0 ? 'ok' : 'no'}">${Math.abs(c.dep).toFixed(0)} mg</b></div>
          <small>At ${Math.round(s.caveT)} °C. Real stalactites grow about 0.13 mm a year on average, so this is thousands of years in time-lapse.</small>`;
      },
    };
  },
};
