// Chapter 3: two equilibria between a gas and something that holds it.
// (a) A fizzy drink: CO₂(gas) ⇌ CO₂(dissolved). Henry's law: at balance the dissolved concentration
//     is c = kH(T) · p. kH = 0.034 mol/(L·atm) at 25 °C and d ln kH ÷ d(1/T) = 2400 K (NIST WebBook),
//     so 0.063 at 4 °C and 0.023 at 40 °C. A cola holds about 3.7 "volumes" of CO₂ (3.5–4 is the usual
//     range for colas): 3.7 L of gas per litre of drink = 0.165 mol/L = 7.3 g/L. In a sealed 600 mL
//     bottle with 30 mL of headspace that needs about 4 bar of CO₂ above the drink at 20 °C.
//     Kinetics: leaving rate = k · n(dissolved); entering rate = k · kH · p · V. Sealed, they balance.
//     Open the cap and p falls to almost nothing (outdoor air has 0.0004 atm of CO₂), so Q = c ÷ p
//     shoots far above K and the gas leaves, as bubbles while the drink holds more than 1 atm of pure
//     CO₂ could keep in. The fizzing is shown in time-lapse (a real bottle takes hours to go flat).
// (b) Blood: Hb + O₂ ⇌ HbO₂. The balance follows the standard human curve (Severinghaus 1979), with
//     P50 = 26.8 mmHg; a working muscle (pH 7.2, 39 °C) shifts it to about 37 mmHg (the Bohr effect).
//     Each site lets go at a steady rate and fills at a rate set by the oxygen pressure, so the share
//     of full sites settles on the curve by itself. One gram of haemoglobin carries 1.34 mL of O₂;
//     blood has about 150 g/L, so full blood carries about 200 mL of O₂ per litre.
//     Oxygen in the lungs at height: West's model atmosphere and the alveolar gas equation (eq.js).
import { THREE, M, box, approach } from '../kit.js';
import {
  K0, COL, hex, kHenry, M_CO2, hbSat, P50, pBaro, pAlveolar, P_AIR_CO2, board, panelBg, axes, title, line, dot, legend, text, qkBar, verdict,
  rng, gauss, poisson, meter, fitNarrow, reelBoards, clamp, dots, TAU,
} from '../eq.js';

const RL = 0.082057;                       // L·atm/(mol·K)
const VL = 0.6, VG = 0.03, VOLS = 3.7, C0 = VOLS / 22.414;
// Filled so that 3.7 volumes are dissolved at 20 °C; the rest sits in the neck.
const N_TOT = C0 * VL + ((C0 / (0.034 * Math.exp(2400 * (1 / 293.15 - 1 / 298.15)))) * VG) / (RL * 293.15), ND = 240, MPD = N_TOT / ND, WIN = 24;
const LEVEL = 3.05, P50_WORK = 37.3;
const rAt = (y) => (y < 2.9 ? 0.8 : y < 3.7 ? 0.8 - ((y - 2.9) / 0.8) * 0.54 : 0.26);
const PLACES = { lungs: 'in the lungs', rest: 'in a resting muscle', muscle: 'in a working muscle' };

export default {
  id: 'fizz',
  short: 'Fizz and breath',
  title: 'Gas in, gas out: a fizzy bottle and your blood',
  subtitle: 'Carbon dioxide in a drink and oxygen on haemoglobin are both held by a balance that pressure can tip.',
  view: { pos: [2.0, 3.7, 10.0], target: [2.0, 3.25, 0] },
  learn: `<p><b>A fizzy drink</b> is an equilibrium in a bottle: CO₂ gas in the neck ⇌ CO₂ dissolved in the drink. At the factory the drink is loaded with about <b>7 grams of CO₂ per litre</b>, and the sealed bottle holds about <b>4 bar</b> of gas above it. Molecules leave the liquid and others dive back in at the same rate.</p>
    <p>Twist the cap and the gas above escapes. Now far fewer molecules dive in than leave. In symbols, <b>Q is far above K</b>, so the balance shifts towards gas: the drink <b>fizzes</b>. This is <b>Henry's law</b>: the amount of gas a liquid holds is proportional to the pressure of that gas above it. Warmth also shifts it towards gas, because dissolving gives out heat. That is why a warm bottle sprays and a cold one keeps its fizz.</p>
    <p><b>Your blood</b> uses the same idea. <b>Haemoglobin</b> in red cells and oxygen form a reversible pair: Hb + O₂ ⇌ HbO₂. In the lungs oxygen pressure is high, so the balance sits far to the right and haemoglobin fills up, about 98 % full. In a working muscle oxygen is being used up, so its pressure is low: the balance shifts left and haemoglobin <b>lets go</b>. Acid and heat from the working muscle tip it further (the <b>Bohr effect</b>).</p>
    <p>Climb to <b>Leh</b> at 3,500 m and the air is thinner, so there is less oxygen pressure in your lungs and haemoglobin fills only to about 90 %. You breathe faster to make up. Over weeks the body makes more red cells. Go up slowly: mountain sickness is real. LungsClear and RespirationClear follow the oxygen further.</p>
    <p class="tip"><b>Try it:</b> open the cap and watch Q leap away from K while bubbles pour out. Close it again and a new, lower balance forms. Then switch to <b>Blood</b>, slide the altitude up to Khardung La, and compare the lungs with a working muscle.</p>`,
  terms: [
    { t: "Henry's law", d: 'The amount of gas dissolved in a liquid is proportional to the pressure of that gas above it. William Henry, 1803.' },
    { t: 'Solubility', d: 'How much of something a liquid can hold at balance. For gases it falls as the liquid warms.' },
    { t: 'Partial pressure', d: 'The share of the total pressure that belongs to one gas in a mixture. Only CO₂ pressure keeps CO₂ dissolved.' },
    { t: 'Haemoglobin', d: 'The red protein in blood cells. Each molecule has four sites that can each hold one oxygen molecule.' },
    { t: 'Saturation', d: 'The share of haemoglobin sites that hold oxygen. A finger clip (pulse oximeter) reads it.' },
    { t: 'Bohr effect', d: 'Acid and CO₂ make haemoglobin hold oxygen less tightly, so busy tissues get more. Christian Bohr, 1904.' },
  ],
  defaults: { scene: 'bottle', T: 20, open: false, alt: 0, where: 'lungs' },
  controls: [
    { key: 'scene', type: 'seg', label: 'Which balance', options: [{ v: 'bottle', label: 'Fizzy bottle' }, { v: 'blood', label: 'Blood' }], fmt: (v) => (v === 'bottle' ? 'CO₂ and a drink' : 'oxygen and haemoglobin') },
    { key: 'open', type: 'toggle', label: 'Bottle: cap off', hint: 'Lets the gas above the drink escape.' },
    { key: 'T', type: 'range', label: 'Bottle: temperature', min: 2, max: 45, step: 1, ends: ['2 °C: fridge', '45 °C: car in the sun'], fmt: (v) => `${Math.round(v)} °C` },
    { key: 'new', type: 'buttons', label: 'Bottle', items: [{ label: 'New sealed bottle', act: (s, inst) => { s.scene = 'bottle'; s.open = false; inst.fresh(s); } }] },
    { key: 'alt', type: 'range', label: 'Blood: how high you are', min: 0, max: 8849, step: 1, ends: ['sea level', 'Everest 8,849 m'], fmt: (v) => `${Math.round(v).toLocaleString('en-IN')} m` },
    { key: 'place', type: 'buttons', label: 'Blood: go to', items: [{ label: 'Mumbai, 0 m', act: (s) => { s.scene = 'blood'; s.alt = 0; } }, { label: 'Leh, 3,500 m', act: (s) => { s.scene = 'blood'; s.alt = 3500; } }, { label: 'Khardung La, 5,359 m', act: (s) => { s.scene = 'blood'; s.alt = 5359; } }] },
    { key: 'where', type: 'seg', label: 'Blood: where in the body', options: [{ v: 'lungs', label: 'Lungs' }, { v: 'rest', label: 'Resting muscle' }, { v: 'muscle', label: 'Working muscle' }], fmt: (v) => PLACES[v] },
  ],
  onChange(s, key) { if (key === 'open' || key === 'T') s.scene = 'bottle'; if (key === 'alt' || key === 'where') s.scene = 'blood'; },
  quiz: [
    { q: 'Why does a fizzy drink bubble when you open it?', options: ['Air rushes in and pushes the gas out', 'The CO₂ pressure above the drink drops, so the drink now holds more gas than the balance allows', 'Opening it warms the drink', 'The cap was holding the bubbles down'], answer: 1, why: 'Dissolved CO₂ is in balance with the CO₂ pressure above it. Let that pressure out and the dissolved gas is too much (Q above K), so it leaves until a new balance is reached.' },
    { q: 'Which bottle keeps more fizz dissolved at the same pressure?', options: ['A warm one', 'A cold one', 'Both the same', 'Whichever is fuller'], answer: 1, why: 'Dissolving CO₂ gives out heat, so cold favours the dissolved side. At 4 °C water holds almost three times as much CO₂ as at 40 °C.' },
    { q: 'Why does haemoglobin release oxygen in a working muscle?', options: ['The muscle squeezes it out', 'Oxygen pressure there is low, so Hb + O₂ ⇌ HbO₂ shifts back towards free oxygen', 'Haemoglobin is destroyed there', 'The blood is moving too fast'], answer: 1, why: 'The muscle uses oxygen, lowering its pressure. With less O₂ on the left, the balance shifts left and haemoglobin lets go. Acid and heat from the muscle help it along.' },
  ],
  reel: [
    { ms: 5400, caption: 'A sealed fizzy drink is a balance: gas leaves the liquid as fast as it dives back in. Open it and the gas wins.', set: { scene: 'bottle', T: 20, open: false }, act: (s, inst) => inst.fresh(s), anim: { open: [false, true] }, view: { pos: [0, 4.8, 7.4], target: [0, 4.6, 0] }, spin: 0.05 },
    { ms: 5400, caption: 'Blood does the same with oxygen: haemoglobin fills up in the lungs and lets go where oxygen is scarce.', set: { scene: 'blood', alt: 0, where: 'lungs' }, anim: { where: ['lungs', 'muscle'] }, view: { pos: [0, 4.8, 7.4], target: [0, 4.6, 0] }, spin: 0.05 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(57), col = new THREE.Color();
    const base = box(4.4, 0.12, 2.8, M.matte(0x232832)); base.position.set(0, 0.06, 0); root.add(base);
    const gB = new THREE.Group(), gH = new THREE.Group(); root.add(gB, gH);
    gB.scale.setScalar(0.86);

    // ---------------------------------------------------------------- the bottle
    const prof = [[0.001, 0.2], [0.72, 0.2], [0.8, 0.32], [0.8, 2.9], [0.26, 3.7], [0.26, 4.0]].map(([r, y]) => new THREE.Vector2(r, y));
    const pet = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), M.clear(0xcfe8ff, 0.16)); gB.add(pet);
    const lprof = [[0.001, 0.24], [0.7, 0.24], [0.77, 0.34], [0.77, 2.9], [0.77 - ((LEVEL - 2.9) / 0.8) * 0.54, LEVEL], [0.001, LEVEL]].map(([r, y]) => new THREE.Vector2(r, y));
    const cola = new THREE.Mesh(new THREE.LatheGeometry(lprof, 48), new THREE.MeshStandardMaterial({ color: 0x8a4a1c, transparent: true, opacity: 0.26, roughness: 0.2, depthWrite: false })); gB.add(cola);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.24, 32), M.plastic(0xe53935)); cap.castShadow = true; gB.add(cap);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.815, 0.815, 0.45, 48, 1, true), M.plastic(0xe53935, { side: THREE.DoubleSide, transparent: true, opacity: 0.4, depthWrite: false })); band.position.y = 0.75; gB.add(band);
    const gas = dots(ND, 0.045, 0xffffff, 8); gB.add(gas);
    const D = Array.from({ length: ND }, () => ({ st: 0, p: [0, 1, 0], u: [0, 0, 0] }));
    const bulk = { aq: 0, g: 0 };
    let S = { scene: 'bottle', T: 20, open: false, alt: 0, where: 'lungs' };
    const hist = [], mOut = meter(), mIn = meter();
    let t = 0, lastRec = -1, key = '', capK = 0, scene = '';
    const pGas = (nG, T) => (nG * RL * T) / VG;
    const inLiquid = (d) => { const y = 0.4 + rnd() * (LEVEL - 0.5), a = rnd() * TAU, rr = Math.sqrt(rnd()) * (rAt(y) - 0.1); d.p = [rr * Math.cos(a), y, rr * Math.sin(a)]; d.u = [gauss(rnd), gauss(rnd), gauss(rnd)]; };
    const inNeck = (d) => { const y = LEVEL + 0.05 + rnd() * (3.9 - LEVEL), a = rnd() * TAU, rr = Math.sqrt(rnd()) * (rAt(y) - 0.07); d.p = [rr * Math.cos(a), y, rr * Math.sin(a)]; d.u = [gauss(rnd), gauss(rnd), gauss(rnd)]; };
    const fresh = (s2) => {
      if (s2) S = s2;
      const T = S.T + K0, p = N_TOT / (kHenry(T) * VL + VG / (RL * T));
      bulk.g = (p * VG) / (RL * T); bulk.aq = N_TOT - bulk.g;
      const ng = Math.round(bulk.g / MPD);
      D.forEach((d, i) => { if (i < ng) { d.st = 1; inNeck(d); } else { d.st = 0; inLiquid(d); } });
      hist.length = 0; mOut.reset(); mIn.reset();
    };
    fresh();
    // leaving and entering rates (mol/s in model time) for amounts aq, g
    const kx = (aq, T, open) => { const sup = aq / VL / kHenry(T); return open ? 0.012 + 0.1 * Math.max(0, sup - 1) : 0.8; };
    const flows = (aq, g, T, open) => { const k = kx(aq, T, open), p = open ? P_AIR_CO2 : pGas(g, T); return [k * aq, k * kHenry(T) * p * VL, p]; };

    const lCap = stage.label('', [0, 4.75, 0], gB, 'hot'), lDrink = stage.label('', [1.25, 1.2, 0.3], gB), lNeck = stage.label('', [1.1, 3.5, 0.3], gB);

    // ---------------------------------------------------------------- the blood
    const NH = 10, hbPos = [], lobes = dots(NH * 4, 0.19, 0xffffff, 14, true), o2s = dots(NH * 4, 0.075, hex(COL.o2), 8), free = dots(60, 0.06, hex(COL.o2), 8);
    gH.add(lobes, o2s, free);
    for (let i = 0; i < NH; i++) hbPos.push([-1.5 + (i % 5) * 0.75, 1.45 + Math.floor(i / 5) * 1.35, 0]);
    const off4 = [[-0.16, 0.16, 0.05], [0.16, 0.16, -0.05], [-0.16, -0.16, -0.05], [0.16, -0.16, 0.05]];
    const site = Array.from({ length: NH * 4 }, () => rnd() < 0.97);
    const F = Array.from({ length: 60 }, () => ({ p: [(rnd() - 0.5) * 3.8, 0.6 + rnd() * 3.0, (rnd() - 0.5) * 1.0], u: [gauss(rnd), gauss(rnd), gauss(rnd)] }));
    const plasma = new THREE.Mesh(new THREE.BoxGeometry(4.0, 3.2, 1.2), M.clear(0xffc7c0, 0.07)); plasma.position.set(0, 2.1, 0); gH.add(plasma);
    const pe = new THREE.LineSegments(new THREE.EdgesGeometry(plasma.geometry), new THREE.LineBasicMaterial({ color: 0xd08a86, transparent: true, opacity: 0.6 })); pe.position.copy(plasma.position); gH.add(pe);
    const lHb = stage.label('', [0, 4.0, 0], gH, 'hot'), lO2 = stage.label('red dots: oxygen molecules', [0, 0.38, 0.7], gH);
    let sBulk = 0.97;
    const KOFF = 0.7;
    const place = (s) => {
      const lung = pAlveolar(s.alt / 1000);
      const p = s.where === 'lungs' ? lung : Math.min(s.where === 'rest' ? 40 : 20, lung - 5);
      const p50 = s.where === 'muscle' ? P50_WORK : P50;
      return { lung, p, p50, sat: hbSat(p, p50), satLung: hbSat(lung) };
    };
    const cFull = new THREE.Color(0xff3b30), cEmpty = new THREE.Color(0x6a4fb0);

    // ---------------------------------------------------------------- boards
    const top = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h);
      if (S.scene === 'bottle') {
        const T = S.T + K0, [, , p] = flows(bulk.aq, bulk.g, T, S.open);
        title(g, 'CO₂ dissolved in the drink', 'grams per litre');
        const t1 = Math.max(WIN, t), t0 = t1 - WIN, xt = []; for (let v = Math.ceil(t0 / 4) * 4; v <= t1; v += 4) xt.push(v);
        const { X, Y } = axes(g, w, h, { x0: 60, y1: 84, y0: h - 40, xMin: t0, xMax: t1, yMax: 8, xTicks: xt, yTicks: [0, 2, 4, 6, 8], xFmt: (v) => v + ' s' });
        const vis = hist.filter((q) => q.t >= t0);
        line(g, vis.map((q) => [q.t, q.can]), X, Y, COL.K, 3, [8, 6]);
        line(g, vis.map((q) => [q.t, q.v]), X, Y, 'rgba(255,255,255,.35)', 1.5);
        line(g, vis.map((q) => [q.t, q.c]), X, Y, COL.Q, 4);
        legend(g, [['in the drink', COL.Q], ['what it can hold at the pressure above', COL.K]], 20, 50, 16);
        void p;
      } else {
        const P = place(S);
        title(g, 'How full is haemoglobin?', 'share of sites holding oxygen');
        const { X, Y } = axes(g, w, h, { x0: 70, y1: 64, y0: h - 44, xMax: 120, yMax: 100, xTicks: [0, 20, 40, 60, 80, 100, 120], yTicks: [0, 25, 50, 75, 100], yFmt: (v) => v + '%' });
        const curve = (p50) => { const pts = []; for (let p = 0; p <= 120; p += 2) pts.push([p, hbSat(p, p50) * 100]); return pts; };
        if (S.where === 'muscle') line(g, curve(P50), X, Y, 'rgba(255,255,255,.3)', 2, [6, 6]);
        line(g, curve(P.p50), X, Y, COL.o2, 4);
        text(g, 'oxygen pressure, mmHg', X(120), h - 6, 'rgba(255,255,255,.7)', '16px sans-serif', 'right');
        dot(g, X(P.lung), Y(P.satLung * 100), '#fff', 8); text(g, `lungs ${(P.satLung * 100).toFixed(0)}%`, X(P.lung) - 8, Y(P.satLung * 100) + 28, '#fff', 'bold 17px sans-serif', 'center');
        if (S.where !== 'lungs') { dot(g, X(P.p), Y(P.sat * 100), COL.K, 10); text(g, `${S.where === 'rest' ? 'resting' : 'working'} muscle ${(P.sat * 100).toFixed(0)}%`, X(P.p) + 16, Y(P.sat * 100) + 8, COL.K, 'bold 17px sans-serif'); }
        if (S.where === 'muscle') text(g, 'dashed: normal curve. Acid and heat shift it right.', X(120), Y(5), 'rgba(255,255,255,.6)', '15px sans-serif', 'right');
      }
    }, [4.95, 3.75, 0]);
    const bar = (g, w, y, lab, r, mx, c, seen, unit) => {
      const bx = 200, bw = w - bx - 120;
      text(g, lab, 20, y + 16, COL.text, 'bold 17px sans-serif');
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(bx, y, bw, 20);
      g.fillStyle = c; g.fillRect(bx, y, bw * clamp(r / mx, 0, 1), 20);
      if (seen != null) { g.fillStyle = '#fff'; g.fillRect(bx + bw * clamp(seen / mx, 0, 1) - 1.5, y - 4, 3, 28); }
      text(g, r.toFixed(r < 10 ? 1 : 0) + unit, w - 20, y + 16, c, 'bold 18px sans-serif', 'right');
    };
    const bot = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h);
      if (S.scene === 'bottle') {
        const T = S.T + K0, [out, inn, p] = flows(bulk.aq, bulk.g, T, S.open), Q = bulk.aq / VL / Math.max(p, 1e-9), K = kHenry(T), v = verdict(Q, K);
        title(g, 'Q against K', v === 0 ? 'balanced' : v > 0 ? 'too much dissolved: gas leaves' : 'room for more: gas dissolves');
        qkBar(g, 40, w - 40, 128, Q, K, { fwd: 'gas dissolves', back: 'gas leaves', kTxt: `K = ${K.toFixed(3)} mol/L per atm`, qTxt: Q > K * 900 ? 'Q: hundreds of times K' : `Q = ${Q.toFixed(3)}` });
        const mx = Math.max(out, inn, 0.001) * 1.15 / MPD;
        bar(g, w, 232, 'leaving the drink', out / MPD, mx, COL.back, mOut.rate, ' /s');
        bar(g, w, 272, 'diving back in', inn / MPD, mx, COL.fwd, mIn.rate, ' /s');
        text(g, 'molecules per second, of the 240 drawn. white ticks: counted.', 20, 334, 'rgba(255,255,255,.55)', '15px sans-serif');
      } else {
        const P = place(S), Q = sBulk / Math.max(1e-6, 1 - sBulk), K = P.sat / (1 - P.sat), v = verdict(Q, K, 0.08);
        title(g, 'Q against K', v === 0 ? 'balanced' : v > 0 ? 'too full for here: oxygen is let go' : 'room to spare: oxygen is picked up');
        qkBar(g, 40, w - 40, 128, Q, K, { span: 2, fwd: 'picks up O₂', back: 'lets go of O₂', kTxt: `balance here: ${(P.sat * 100).toFixed(0)} % full`, qTxt: `now: ${(sBulk * 100).toFixed(0)} % full` });
        const on = KOFF * K * (1 - sBulk) * 40, off = KOFF * sBulk * 40, mx = Math.max(on, off, 1) * 1.15;
        bar(g, w, 232, 'O₂ picked up', on, mx, COL.fwd, null, ' /s');
        bar(g, w, 272, 'O₂ let go', off, mx, COL.back, null, ' /s');
        text(g, 'events per second across the 40 sites drawn', 20, 334, 'rgba(255,255,255,.55)', '15px sans-serif');
      }
    }, [4.95, 1.4, 0]);

    return {
      fresh,
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        const narrow = fitNarrow(stage, [lDrink, lNeck, lO2]);
        reelBoards([top, bot], 0, 9.6);
        if (s.scene !== scene) { scene = s.scene; gB.visible = scene === 'bottle'; gH.visible = scene === 'blood'; key = ''; }
        t += dt;
        if (scene === 'bottle') {
          const T = s.T + K0;
          // the whole bottle, followed smoothly
          for (let i = 0; i < 5; i++) {
            const h = dt / 5, [out, inn] = flows(bulk.aq, bulk.g, T, s.open), d = clamp((out - inn) * h, -bulk.g, bulk.aq);
            bulk.aq -= d; bulk.g += d;
            if (s.open) bulk.g += ((P_AIR_CO2 * VG) / (RL * T) - bulk.g) * (1 - Math.exp(-h / 0.5));
          }
          // the dots you can see
          let nAq = 0, nG = 0; for (const d of D) { if (d.st === 0) nAq++; else if (d.st === 1) nG++; }
          const [vo, vi] = flows(nAq * MPD, nG * MPD, T, s.open), sup = (nAq * MPD) / VL / kHenry(T);
          let eo = 0, ei = 0;
          for (let i = poisson(rnd, (vo / MPD) * dt); i > 0 && nAq > 0; i--) { const d = D[Math.floor(rnd() * ND)]; if (d.st !== 0) { i++; if (rnd() < 0.02) break; continue; } if (s.open && sup > 1) { d.st = 2; } else { d.st = 1; d.p[1] = LEVEL + 0.06; d.u = [gauss(rnd), Math.abs(gauss(rnd)), gauss(rnd)]; } nAq--; eo++; }
          for (let i = poisson(rnd, (vi / MPD) * dt); i > 0 && nG > 0; i--) { const d = D[Math.floor(rnd() * ND)]; if (d.st !== 1) { i++; if (rnd() < 0.02) break; continue; } d.st = 0; d.p[1] = LEVEL - 0.08; d.u = [gauss(rnd), -Math.abs(gauss(rnd)), gauss(rnd)]; nG--; ei++; }
          if (dt > 0) { mOut.add(eo, dt); mIn.add(ei, dt); }
          const vg = 1.3 * Math.sqrt(T / 293);
          D.forEach((d, i) => {
            if (d.st === 3) { gas.place(i, 0, -99, 0, 0.0001); return; }
            if (d.st === 0) {
              if (rnd() < dt * 2) d.u = [gauss(rnd), gauss(rnd), gauss(rnd)];
              for (let k = 0; k < 3; k++) d.p[k] += d.u[k] * 0.22 * dt;
              d.p[1] = clamp(d.p[1], 0.36, LEVEL - 0.05);
            } else if (d.st === 2) {
              d.p[1] += 1.6 * dt; d.p[0] += Math.sin(t * 9 + i) * 0.25 * dt;
              if (d.p[1] > LEVEL) { d.st = 1; d.u = [gauss(rnd), 1.5, gauss(rnd)]; }
            } else {
              for (let k = 0; k < 3; k++) d.p[k] += d.u[k] * vg * 0.6 * dt;
              if (s.open) { d.u[1] += 3 * dt; d.u[0] -= d.p[0] * 4 * dt; d.u[2] -= d.p[2] * 4 * dt; if (d.p[1] > 4.5) d.st = 3; }
              else if (d.p[1] > 3.93) { d.p[1] = 3.93; d.u[1] = -Math.abs(d.u[1]); }
              if (d.p[1] < LEVEL + 0.03) { d.p[1] = LEVEL + 0.03; d.u[1] = Math.abs(d.u[1]); }
            }
            const yy = Math.min(d.p[1], 4.0), rm = rAt(yy) - 0.07, rr = Math.hypot(d.p[0], d.p[2]);
            if (rr > rm && d.p[1] < 4.05) { const nx = d.p[0] / rr, nz = d.p[2] / rr, dn = d.u[0] * nx + d.u[2] * nz; if (dn > 0) { d.u[0] -= 2 * dn * nx; d.u[2] -= 2 * dn * nz; } d.p[0] = nx * rm; d.p[2] = nz * rm; }
            gas.place(i, d.p[0], d.p[1], d.p[2], d.st === 2 ? 1.9 : 1);
            gas.tint(i, col.set(d.st === 0 ? 0xffd9a0 : 0xffffff));
          });
          gas.done();
          capK = approach(capK, s.open ? 1 : 0, 6, dt);
          cap.position.set(capK * 0.95, 4.02 + capK * 0.55, 0); cap.rotation.z = -capK * 0.9;
          const [, , p] = flows(bulk.aq, bulk.g, T, s.open);
          lCap.element.innerHTML = s.open ? 'cap off: the gas above escapes' : `sealed: <b>${(p * 1.01325).toFixed(1)} bar</b> of CO₂ above the drink`;
          lCap.element.style.setProperty('--c', s.open ? COL.back : COL.Q);
          lDrink.element.innerHTML = `dissolved: <b>${((bulk.aq / VL) * M_CO2).toFixed(1)} g/L</b>`;
          lNeck.element.innerHTML = 'gas in the neck'; lNeck.visible = !narrow && !s.open;
          if (t - lastRec > 0.1) { lastRec = t; hist.push({ t, c: (bulk.aq / VL) * M_CO2, v: ((nAq * MPD) / VL) * M_CO2, can: Math.min(8, kHenry(T) * p * M_CO2) }); while (hist.length && hist[0].t < t - WIN - 1) hist.shift(); }
        } else {
          const P = place(s), ratio = P.sat / (1 - P.sat), kOn = KOFF * ratio;
          sBulk += (kOn * (1 - sBulk) - KOFF * sBulk) * dt; sBulk = clamp(sBulk, 0, 1);
          let full = 0;
          for (let i = 0; i < site.length; i++) { if (site[i]) { if (rnd() < KOFF * dt) site[i] = false; } else if (rnd() < Math.min(1, kOn * dt)) site[i] = true; if (site[i]) full++; }
          for (let i = 0; i < NH; i++) for (let j = 0; j < 4; j++) {
            const k = i * 4 + j, hp = hbPos[i], o = off4[j], wob = Math.sin(t * 1.3 + i) * 0.03;
            lobes.place(k, hp[0] + o[0], hp[1] + o[1] + wob, hp[2] + o[2]); lobes.tint(k, site[k] ? cFull : cEmpty);
            o2s.place(k, hp[0] + o[0] * 2.0, hp[1] + o[1] * 2.0 + wob, hp[2] + o[2] + 0.12, site[k] ? 1 : 0.0001);
          }
          lobes.done(); o2s.done();
          const nf = Math.round(clamp(P.p * 0.5, 2, 60));
          F.forEach((f, i) => {
            for (let k = 0; k < 3; k++) f.p[k] += f.u[k] * 0.5 * dt;
            if (Math.abs(f.p[0]) > 1.9) { f.p[0] = Math.sign(f.p[0]) * 1.9; f.u[0] *= -1; }
            if (f.p[1] < 0.6) { f.p[1] = 0.6; f.u[1] *= -1; } else if (f.p[1] > 3.6) { f.p[1] = 3.6; f.u[1] *= -1; }
            if (Math.abs(f.p[2]) > 0.5) { f.p[2] = Math.sign(f.p[2]) * 0.5; f.u[2] *= -1; }
            free.place(i, f.p[0], f.p[1], f.p[2], i < nf ? 1 : 0.0001);
          });
          free.done();
          lHb.element.innerHTML = `${PLACES[s.where]}: <b>${full} of 40</b> sites hold oxygen`;
          lHb.element.style.setProperty('--c', COL.o2);
        }
        const kk = `${scene}|${Math.round(t * 8)}`;
        if (kk !== key) { key = kk; top.redraw(); bot.redraw(); }
      },
      readout: (s) => {
        if (s.scene === 'bottle') {
          const T = s.T + K0, [, , p] = flows(bulk.aq, bulk.g, T, s.open), c = bulk.aq / VL, K = kHenry(T), Q = c / Math.max(p, 1e-9), v = verdict(Q, K);
          return `<div class="big">CO₂ gas ⇌ CO₂ dissolved</div>
            <div class="row"><span>CO₂ pressure above the drink</span><b style="color:${COL.Q}">${p < 0.01 ? 'almost none (open air)' : (p * 1.01325).toFixed(2) + ' bar'}</b></div>
            <div class="row"><span>Dissolved in the drink</span><b>${(c * M_CO2).toFixed(2)} g/L (${(c * 22.414).toFixed(1)} volumes)</b></div>
            <div class="row"><span>It can hold, at this pressure</span><b style="color:${COL.K}">${(K * p * M_CO2).toFixed(2)} g/L</b></div>
            <div class="row"><span>K at ${Math.round(s.T)} °C (Henry's law)</span><b style="color:${COL.K}">${(K * M_CO2).toFixed(2)} g/L per atm</b></div>
            <div class="row"><span>So</span><b class="${v === 0 ? 'ok' : ''}">${v === 0 ? 'balanced: Q = K' : v > 0 ? 'Q > K: gas is leaving' : 'Q < K: gas is dissolving'}</b></div>
            <small>A 600 mL cola. Fizzing is shown in time-lapse: a real open bottle takes hours to go flat.</small>`;
        }
        const P = place(s), carried = 1.34 * 150 * P.sat, lungC = 1.34 * 150 * P.satLung;
        return `<div class="big">Hb + O₂ ⇌ HbO₂</div>
          <div class="row"><span>Height and air pressure</span><b>${Math.round(s.alt).toLocaleString('en-IN')} m, ${Math.round(pBaro(s.alt / 1000))} mmHg</b></div>
          <div class="row"><span>Oxygen pressure ${PLACES[s.where]}</span><b style="color:${COL.Q}">${P.p.toFixed(0)} mmHg</b></div>
          <div class="row"><span>Haemoglobin at balance</span><b style="color:${COL.K}">${(P.sat * 100).toFixed(0)} % full</b></div>
          <div class="row"><span>Oxygen carried per litre of blood</span><b>${carried.toFixed(0)} mL</b></div>
          <div class="row"><span>${s.where === 'lungs' ? 'Leaving the lungs with' : 'Dropped off since the lungs'}</span><b style="color:${COL.o2}">${(s.where === 'lungs' ? lungC : Math.max(0, lungC - carried)).toFixed(0)} mL per litre</b></div>
          <small>Typical healthy adult values. Half the sites are full at ${P.p50.toFixed(1)} mmHg${s.where === 'muscle' ? ' in a warm, acid muscle' : ''}.</small>`;
      },
    };
  },
};
