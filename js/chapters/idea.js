// Chapter 1: a reaction that runs both ways, finds its balance, and pushes back when disturbed.
// The reaction is N₂O₄(g) ⇌ 2 NO₂(g): colourless dinitrogen tetroxide splitting into brown nitrogen
// dioxide, the classic sealed-tube demonstration. ΔH° = +57.1 kJ/mol and ΔS° = +175.7 J/(mol·K)
// (NIST-JANAF), so Kp = exp(−ΔH°/RT + ΔS°/R) = 0.148 bar at 25 °C (see eq.js).
//
// The model is real kinetics, not a script:
//   forward  N₂O₄ → 2 NO₂   rate = kf · n(N₂O₄)          (each molecule splits on its own)
//   backward 2 NO₂ → N₂O₄   rate = kb · n(NO₂)² ÷ V      (two must meet, so crowding matters)
// The backward step needs no climb (two radicals simply pair up), so kb is taken as steady with
// temperature, and the forward step carries the whole ΔH as its activation energy: kf = kb · K.
// Nothing tells the box where to stop. The amounts level off by themselves where the two rates
// match, and that point is exactly Q = K.
// Scale: the box starts with 120 N₂O₄ molecules, standing for 1 bar of N₂O₄ in 1 litre at 25 °C,
// so a partial pressure is p = (n ÷ 120) × (T ÷ 298.15) ÷ V bar. Time is slowed enormously (the
// real reaction settles in microseconds). The bold chart lines are the same rate laws followed for
// a whole flask (no noise); the thin ones count the molecules you can see, which wobble.
import { THREE, M, box, beam, tube, approach } from '../kit.js';
import {
  K0, COL, hex, kpN2O4, board, panelBg, axes, title, line, legend, text, qkBar, verdict, tank, molBox, SHAPES,
  rng, poisson, meter, fitNarrow, inReel, reelBoards, clamp, sci, flowArrow,
} from '../eq.js';

const N0 = 120, KB = 0.004, HPER = 1.7, WIN = 24;
const TK = (s) => s.T + K0;
const press = (n, T, V) => (n / N0) * (T / 298.15) / V;      // bar

export default {
  id: 'idea',
  short: 'Both ways at once',
  title: 'A reaction that pushes back',
  subtitle: 'Molecules split and join until the two rates match. Disturb the balance and it shifts to undo part of what you did.',
  view: { pos: [2.0, 3.7, 10.0], target: [2.0, 3.25, 0] },
  learn: `<p>Many reactions run <b>both ways</b>. Here pale <b>N₂O₄</b> molecules split into two brown <b>NO₂</b> molecules, and pairs of NO₂ join back up. Chemists write it with a double arrow: N₂O₄ ⇌ 2NO₂.</p>
    <p>Start with only N₂O₄. At first splitting wins, and the box turns brown. But the more NO₂ there is, the more often two of them meet and join. Soon the <b>forward rate</b> and the <b>backward rate</b> are equal, and the amounts stop changing. That is <b>equilibrium</b>. Look closely: nothing has stopped. Molecules are still splitting and joining, flash after flash. It is a <b>dynamic</b> balance, like a busy shop where as many people walk in as walk out.</p>
    <p>The balance point has a number. <b>Q</b> (the <b>reaction quotient</b>) is the NO₂ pressure squared, divided by the N₂O₄ pressure, right now. At equilibrium Q always ends up at one value, the <b>equilibrium constant K</b>, which depends only on temperature. If Q is below K, forward wins. If Q is above K, backward wins. So <b>Q always moves to K</b>.</p>
    <p><b>Le Chatelier's principle</b> is the shortcut: <b>disturb a system at equilibrium and it shifts to undo part of the change</b>. Add NO₂, and some of it joins up. Squeeze the box, and the reaction shifts to the side with <b>fewer molecules</b> (N₂O₄), which eases the pressure. Heat it, and it shifts the way that <b>soaks up heat</b> (splitting takes in heat), so it turns darker brown. The shift never cancels the change completely.</p>
    <p class="tip"><b>Try it:</b> press <b>Start: all N₂O₄</b> and watch the lines level off. Then squeeze the volume to 0.5 L: Q jumps above K and the NO₂ count falls. Heat it to 80 °C: K itself climbs and the box turns brown. Each time, watch the blue Q dot walk back to the amber K line.</p>`,
  terms: [
    { t: 'Reversible reaction', d: 'A reaction that can run forwards and backwards, written with ⇌.' },
    { t: 'Dynamic equilibrium', d: 'The state where forward and backward reactions run at the same rate, so the amounts stay steady while molecules keep reacting.' },
    { t: 'Equilibrium constant (K)', d: 'The value the mixture settles at: for this reaction, NO₂ pressure squared ÷ N₂O₄ pressure. It changes only with temperature.' },
    { t: 'Reaction quotient (Q)', d: 'The same sum as K but worked out for the mixture right now. Q below K: forward wins. Q above K: backward wins.' },
    { t: "Le Chatelier's principle", d: 'Disturb an equilibrium and it shifts in the direction that undoes part of the disturbance.' },
    { t: 'Endothermic', d: 'Taking heat in. Splitting N₂O₄ is endothermic, so heating favours it.' },
  ],
  defaults: { T: 25, V: 1 },
  controls: [
    { key: 'T', type: 'range', label: 'Temperature (the water bath)', min: 0, max: 100, step: 1, ends: ['0 °C', '100 °C'], fmt: (v) => `${Math.round(v)} °C`, hint: 'Splitting N₂O₄ takes in heat, so K grows as you warm it.' },
    { key: 'V', type: 'range', label: 'Volume (move the piston)', min: 0.5, max: 2, step: 0.01, ends: ['0.5 L: squeezed', '2 L'], fmt: (v) => v.toFixed(2) + ' L' },
    { key: 'add', type: 'buttons', label: 'Add gas', items: [{ label: '+ 40 NO₂', act: (s, inst) => inst.add('NO2', 40) }, { label: '+ 30 N₂O₄', act: (s, inst) => inst.add('N2O4', 30) }] },
    { key: 'go', type: 'buttons', label: 'Start again', items: [{ label: 'Start: all N₂O₄', act: (s, inst) => { s.T = 25; s.V = 1; inst.reset('N2O4', s); } }, { label: 'Start: all NO₂', act: (s, inst) => { s.T = 25; s.V = 1; inst.reset('NO2', s); } }] },
  ],
  quiz: [
    { q: 'A sealed tube of N₂O₄ and NO₂ has reached equilibrium. What are the molecules doing?', options: ['Nothing: the reaction has finished', 'Only splitting', 'Splitting and joining at equal rates', 'Only joining'], answer: 2, why: 'Equilibrium is dynamic. Both reactions keep running, but at the same rate, so the amounts stay steady.' },
    { q: 'You squeeze the gas into half the volume. Which way does N₂O₄ ⇌ 2NO₂ shift?', options: ['Towards N₂O₄, the side with fewer molecules', 'Towards NO₂, the side with more molecules', 'It does not shift', 'It depends on the catalyst'], answer: 0, why: 'Squeezing raises the pressure. Shifting to the side with fewer gas molecules eases it. In numbers: Q doubles, so Q is above K and the backward reaction wins.' },
    { q: 'For this mixture Q = 0.05 and K = 0.15. What happens next?', options: ['Backward wins until Q falls further', 'Forward wins: more NO₂ forms until Q reaches 0.15', 'K falls to 0.05', 'Nothing, it is at equilibrium'], answer: 1, why: 'Q below K means too little product for balance. The forward reaction outruns the backward one until Q equals K. K itself only changes with temperature.' },
  ],
  reel: [
    { ms: 5600, caption: 'Some reactions run both ways. Molecules split and join until the two rates match.', set: { T: 25, V: 1 }, act: (s, inst) => inst.reset('N2O4', s), view: { pos: [0, 4.8, 7.4], target: [0, 4.6, 0] }, spin: 0.05 },
    { ms: 5600, caption: 'Squeeze it and the balance shifts to the side with fewer molecules. That is Le Chatelier’s principle.', set: { T: 25, V: 1.8 }, act: (s, inst) => inst.settle(s), anim: { V: [1.8, 0.55] }, view: { pos: [0, 4.8, 7.4], target: [0, 4.6, 0] }, spin: 0.05 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(23);
    const tk = tank(root, { w: 2.6, d: 1.6, y0: 0.5, hMax: 3.4 });
    // the water bath / heater plate under the tank
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x555a66, emissive: 0x000000, roughness: 0.4, metalness: 0.4 });
    const plate = box(3.1, 0.2, 2.1, plateMat); plate.position.y = 0.24; root.add(plate);
    const base = box(4.9, 0.12, 2.8, M.matte(0x232832)); base.position.set(-0.6, 0.06, 0); root.add(base);
    // two gas bottles with a shared inlet
    const bottle = (x, colr) => { const g = new THREE.Group(); g.position.set(x, 0.12, -0.1); root.add(g); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.3, 28), M.plastic(colr, { roughness: 0.35 })); m.position.y = 0.65; m.castShadow = true; g.add(m); const t = new THREE.Mesh(new THREE.SphereGeometry(0.28, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.plastic(colr, { roughness: 0.35 })); t.position.y = 1.3; g.add(t); g.add(beam([0, 1.55, 0], [0, 1.75, 0], 0.06, M.metal(0xc0a060))); return g; };
    bottle(-2.0, 0xb5651f); bottle(-2.62, 0xaeb7c6);
    root.add(tube([[-2.62, 1.87, -0.1], [-2.62, 2.05, -0.1], [-2.0, 2.05, -0.1], [-1.66, 1.95, 0], [-1.6, 0.9, 0], [-1.32, 0.85, 0]], 0.045, M.metal(0xc0a060)));
    root.add(beam([-2.0, 1.87, -0.1], [-2.0, 2.05, -0.1], 0.045, M.metal(0xc0a060)));

    const mb = molBox(root, { N2O4: SHAPES.N2O4, NO2: SHAPES.NO2 }, { rnd, cap: 1500 });
    const bulk = { A: N0, B: 0 };
    let S = { T: 25, V: 1 }, vShow = 1, t = 0, lastRec = -1, key = '';
    const hist = [], marks = [];
    const mF = meter(), mB = meter();
    let prevT = 25, prevV = 1;
    const mark = (label) => { const m = marks[marks.length - 1]; if (m && m.label === label && t - m.t < 1.5) return; marks.push({ t, label }); if (marks.length > 12) marks.shift(); };
    const fill = () => { mb.setBounds(tk.bounds(vShow * HPER)); };
    const reset = (which, s2) => {
      if (s2) S = s2;
      mb.clear(); fill(); hist.length = 0; marks.length = 0; mF.reset(); mB.reset();
      if (which === 'N2O4') { bulk.A = N0; bulk.B = 0; mb.add('N2O4', N0); } else { bulk.A = 0; bulk.B = 2 * N0; mb.add('NO2', 2 * N0); }
      vShow = S.V; prevT = S.T; prevV = S.V; fill();
    };
    // Jump straight to equilibrium for the current settings (used by the video storyboard).
    const settle = (s2) => {
      if (s2) S = s2;
      const T = TK(S), Kn = (kpN2O4(T) * N0 * 298.15) / T, tot = N0;
      // (2x)² ÷ (tot − x) = Kn·V  →  4x² + c x − c·tot = 0
      const c = Kn * S.V, x = (-c + Math.sqrt(c * c + 16 * c * tot)) / 8;
      mb.clear(); vShow = S.V; fill(); hist.length = 0; marks.length = 0;
      bulk.A = tot - x; bulk.B = 2 * x; mb.add('N2O4', Math.round(tot - x)); mb.add('NO2', Math.round(2 * x));
      prevT = S.T; prevV = S.V;
    };
    reset('N2O4');

    const lPist = stage.label('', [0, 0, 0], root, 'hot'), lBath = stage.label('', [0, 0.24, 1.25], root, 'hot');
    const lA = stage.label('N₂O₄', [-2.75, 2.35, -0.1], root), lB = stage.label('NO₂', [-1.95, 2.35, -0.1], root);
    const lCount = stage.label('', [0, 0, 0.95], root);
    const push = flowArrow(hex(COL.Q), 0.05, 0.25); root.add(push);

    const rates = (T, V, A, B) => { const Kn = (kpN2O4(T) * N0 * 298.15) / T; return [KB * Kn * A, (KB * B * B) / V]; };
    const QK = () => { const T = TK(S); const pB = press(bulk.B, T, vShow), pA = press(bulk.A, T, vShow); return { Q: pA > 1e-9 ? (pB * pB) / pA : Infinity, K: kpN2O4(T), pA, pB }; };

    const amounts = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h);
      title(g, 'Molecules in the box', 'levelling off by themselves');
      const t1 = Math.max(WIN, t), t0 = t1 - WIN;
      let yMax = 140; for (const p of hist) yMax = Math.max(yMax, p.A, p.B, p.a, p.b);
      yMax = Math.ceil(yMax * 1.08 / 40) * 40;
      const yt = []; for (let v = 0; v <= yMax; v += yMax > 240 ? 80 : 40) yt.push(v);
      const xt = []; for (let v = Math.ceil(t0 / 4) * 4; v <= t1; v += 4) xt.push(v);
      const { X, Y, y0, y1 } = axes(g, w, h, { x0: 64, y1: 84, y0: h - 40, xMin: t0, xMax: t1, yMax, xTicks: xt, yTicks: yt, xFmt: (v) => v + ' s' });
      for (const m of marks) {
        if (m.t < t0) continue;
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.setLineDash([5, 5]); g.lineWidth = 2; g.beginPath(); g.moveTo(X(m.t), y1); g.lineTo(X(m.t), y0); g.stroke(); g.setLineDash([]);
        text(g, m.label, Math.min(X(m.t) + 5, w - 110), y1 + 14, 'rgba(255,255,255,.85)', '15px sans-serif');
      }
      const vis = hist.filter((p) => p.t >= t0);
      line(g, vis.map((p) => [p.t, p.a]), X, Y, 'rgba(207,214,228,.4)', 1.5);
      line(g, vis.map((p) => [p.t, p.b]), X, Y, 'rgba(217,138,58,.5)', 1.5);
      line(g, vis.map((p) => [p.t, p.A]), X, Y, COL.a, 4);
      line(g, vis.map((p) => [p.t, p.B]), X, Y, COL.b, 4);
      legend(g, [['N₂O₄', COL.a], ['NO₂', COL.b]], 24, 50, 17);
      text(g, 'thin lines: the molecules you can see', w - 20, 64, 'rgba(255,255,255,.55)', '15px sans-serif', 'right');
    }, [4.95, 3.75, 0]);

    const qk = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h);
      const { Q, K } = QK(), v = verdict(Q, K);
      title(g, 'Q against K', v === 0 ? 'balanced: Q = K' : v < 0 ? 'Q below K: splitting wins' : 'Q above K: joining wins');
      qkBar(g, 40, w - 40, 128, Q, K, { fwd: 'forward wins', back: 'backward wins', kTxt: `K = ${sci(K)} bar`, qTxt: `Q = ${sci(Q)}` });
      const [rf, rb] = rates(TK(S), vShow, bulk.A, bulk.B), mx = Math.max(rf, rb, 1) * 1.15, bx = 190, bw = w - bx - 120;
      const bar = (y, lab, r, c, seen) => {
        text(g, lab, 20, y + 16, COL.text, 'bold 17px sans-serif');
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(bx, y, bw, 20);
        g.fillStyle = c; g.fillRect(bx, y, bw * clamp(r / mx, 0, 1), 20);
        g.fillStyle = '#fff'; g.fillRect(bx + bw * clamp(seen / mx, 0, 1) - 1.5, y - 4, 3, 28);
        text(g, r.toFixed(r < 10 ? 1 : 0) + ' /s', w - 20, y + 16, c, 'bold 18px sans-serif', 'right');
      };
      bar(232, 'forward: splits', rf, COL.fwd, mF.rate);
      bar(272, 'backward: joins', rb, COL.back, mB.rate);
      text(g, 'bars: the rate laws. white ticks: flashes counted in the box.', 20, 334, 'rgba(255,255,255,.55)', '15px sans-serif');
    }, [4.95, 1.4, 0]);

    const cPale = new THREE.Color(0xcfe8ff), cBrown = new THREE.Color(0xb5651f);
    return {
      add(sp, k) { if (sp === 'NO2') bulk.B += k; else bulk.A += k; mb.add(sp, k, [-1.05, 0.95, 0], [2.2, 0.6, 0]); mark(sp === 'NO2' ? 'added NO₂' : 'added N₂O₄'); },
      reset, settle,
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        const narrow = fitNarrow(stage, [lA, lB, lCount]);
        reelBoards([amounts, qk], 0, 9.6);
        const T = TK(s);
        if (Math.abs(s.T - prevT) > 0.5) { mark(s.T > prevT ? 'heated' : 'cooled'); prevT = s.T; }
        if (Math.abs(s.V - prevV) > 0.02) { mark(s.V < prevV ? 'squeezed' : 'let out'); prevV = s.V; }
        vShow = approach(vShow, s.V, 7, dt);
        const hgt = vShow * HPER;
        tk.setH(hgt); fill();
        // the whole flask: the rate laws followed smoothly
        for (let i = 0; i < 6; i++) { const [rf, rb] = rates(T, vShow, bulk.A, bulk.B); let d = ((rf - rb) * dt) / 6; d = clamp(d, -bulk.B / 2, bulk.A); bulk.A -= d; bulk.B += 2 * d; }
        // the molecules you can see: each event happens by chance at the same rates
        const [vf, vb] = rates(T, vShow, mb.n.N2O4, Math.sqrt(Math.max(0, mb.n.NO2 * (mb.n.NO2 - 1))));
        let ef = 0, eb = 0;
        for (let i = poisson(rnd, vf * dt); i > 0; i--) if (mb.react(['N2O4'], ['NO2', 'NO2'], hex(COL.fwd))) ef++;
        for (let i = poisson(rnd, vb * dt); i > 0; i--) if (mb.react(['NO2', 'NO2'], ['N2O4'], hex(COL.back))) eb++;
        if (dt > 0) { mF.add(ef, dt); mB.add(eb, dt); }
        mb.step(dt, 1.5 * Math.sqrt(T / 298.15));
        t += dt;
        if (t - lastRec > 0.1) { lastRec = t; hist.push({ t, A: bulk.A, B: bulk.B, a: mb.n.N2O4, b: mb.n.NO2 }); while (hist.length && hist[0].t < t - WIN - 1) hist.shift(); }
        // the brown of NO₂ deepens with how crowded it is
        const c = clamp(bulk.B / vShow / 260, 0, 1);
        tk.glassM.color.copy(cPale).lerp(cBrown, Math.min(1, c * 1.6)); tk.glassM.opacity = 0.08 + 0.3 * c;
        plateMat.emissive.setRGB(clamp((s.T - 25) / 75, 0, 1) * 0.55, clamp((s.T - 25) / 75, 0, 1) * 0.12, clamp((25 - s.T) / 25, 0, 1) * 0.5);
        lPist.position.set(0, tk.dim.y0 + hgt + 1.25, 0);
        const { Q, K, pA, pB } = QK();
        lPist.element.innerHTML = `piston: <b>${s.V.toFixed(2)} L</b>, ${(pA + pB).toFixed(2)} bar`;
        lPist.element.style.setProperty('--c', COL.Q);
        lBath.element.innerHTML = `bath: <b>${Math.round(s.T)} °C</b>`;
        lBath.element.style.setProperty('--c', s.T > 40 ? COL.hot : s.T < 15 ? COL.cold : COL.K);
        lCount.position.set(1.0, tk.dim.y0 + hgt + 0.35, 0.95);
        lCount.element.innerHTML = `in view: <b>${mb.n.N2O4}</b> N₂O₄, <b>${mb.n.NO2}</b> NO₂`;
        lCount.visible = !narrow;
        const dv = s.V - vShow;
        push.aim([0.9, tk.dim.y0 + hgt + 1.05, 0.5], [0, dv < 0 ? -1 : 1, 0], Math.abs(dv) > 0.01 ? 0.6 : 0);
        const kk = `${Math.round(t * 10)}`;
        if (kk !== key) { key = kk; amounts.redraw(); qk.redraw(); }
        void Q; void K;
      },
      readout: (s) => {
        const { Q, K, pA, pB } = QK(), v = verdict(Q, K), [rf, rb] = rates(TK(s), vShow, bulk.A, bulk.B);
        return `<div class="big">N₂O₄ ⇌ 2NO₂</div>
          <div class="row"><span>K at ${Math.round(s.T)} °C</span><b style="color:${COL.K}">${sci(K)} bar</b></div>
          <div class="row"><span>Q now = p(NO₂)² ÷ p(N₂O₄)</span><b style="color:${COL.Q}">${sci(Q)} bar</b></div>
          <div class="row"><span>So</span><b class="${v === 0 ? 'ok' : ''}">${v === 0 ? 'balanced: Q = K' : v < 0 ? 'Q < K: forward wins' : 'Q > K: backward wins'}</b></div>
          <div class="row"><span>NO₂ and N₂O₄ pressure</span><b>${pB.toFixed(2)} and ${pA.toFixed(2)} bar</b></div>
          <div class="row"><span>Splits and joins per second</span><b><span style="color:${COL.fwd}">${rf.toFixed(1)}</span> and <span style="color:${COL.back}">${rb.toFixed(1)}</span></b></div>
          <small>Slowed down: the real reaction settles in microseconds. Even balanced, both rates are far from zero.</small>`;
      },
    };
  },
};
