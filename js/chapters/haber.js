// Chapter 2: the Haber–Bosch process, N₂ + 3 H₂ ⇌ 2 NH₃, the worked example of Le Chatelier's
// principle, and the loop that turns a poor one-pass yield into almost complete conversion.
// Equilibrium numbers are real: Ka(T) from the Gillespie–Beattie (1930) fit with Dyson and Simon's
// (1968) fugacity corrections (see eq.js). A 1:3 feed at 450 °C gives 16 % NH₃ at 100 bar, 27 % at
// 200 bar and 35 % at 300 bar; at 200 bar it gives 38 % at 400 °C but only 19 % at 500 °C.
// The reaction gives out heat (ΔH° = −92 kJ per mole of N₂; −46 kJ per mole of NH₃) and turns four
// gas molecules into two, so cold and pressure favour ammonia. But cold is slow. The kinetics here
// are a model (eq.js: haberRates) with speeds compressed for watching; where the balance lies is not
// a model, it is the measured thermodynamics.
// Plant practice (Ullmann's Encyclopedia, "Ammonia"; Wikipedia "Haber process"): roughly 400–500 °C,
// 150–250 bar, promoted iron catalyst, about 15 % conversion per pass, 97–98 % overall with recycling.
// India (Department of Fertilizers, via PIB and Parliament answers, 2024–25): 314 lakh tonnes of urea
// made in 2023–24, 358 lakh tonnes used. Sindri (now Jharkhand) began production on 31 October 1951.
import { THREE, M, box, beam, tube, approach } from '../kit.js';
import {
  K0, COL, hex, kaHaber, kHaber, qHaber, haberEq, haberY, haberRates, haberPass, HABER, board, panelBg, axes, title, line, dot, legend, text,
  verdict, tank, molBox, SHAPES, rng, poisson, fitNarrow, reelBoards, clamp, sci, dots,
} from '../eq.js';

const NT = 120, HFULL = 2.4;
const TK = (s) => s.T + K0;
// yield colour: deep blue (little ammonia) through teal to warm yellow (a lot)
function ramp(y) {
  const k = clamp(y, 0, 1), st = [[0, 16, 24, 64], [0.15, 30, 80, 150], [0.35, 40, 150, 140], [0.6, 120, 200, 110], [1, 250, 220, 90]];
  for (let i = 1; i < st.length; i++) if (k <= st[i][0]) { const a = st[i - 1], b = st[i], u = (k - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u]; }
  return [250, 220, 90];
}

export default {
  id: 'haber',
  short: 'Bread from air',
  title: 'The Haber process: a bargain with equilibrium',
  subtitle: 'Nitrogen and hydrogen make ammonia for fertiliser, but only if you choose the pressure, the heat and the catalyst with care.',
  view: { pos: [2.0, 3.7, 10.0], target: [2.0, 3.25, 0] },
  learn: `<p>Plants need nitrogen, and the air is 78 % nitrogen, but its molecules are locked by a triple bond. The <b>Haber–Bosch process</b> turns it into <b>ammonia</b>: N₂ + 3H₂ ⇌ 2NH₃. Most ammonia becomes fertiliser such as <b>urea</b>. India made about <b>314 lakh tonnes</b> of urea in 2023–24, and roughly half the food the world eats is grown with nitrogen fixed this way.</p>
    <p>The reaction is reversible, so Le Chatelier's principle tells you how to push it. <b>Four</b> gas molecules become <b>two</b>, so <b>high pressure</b> favours ammonia: plants squeeze the gas to about <b>200 bar</b>. And making ammonia <b>gives out heat</b>, so a <b>cooler</b> reactor favours ammonia too. At 200 bar the balance holds 87 % ammonia at 200 °C but only 19 % at 500 °C.</p>
    <p>So why not run it cold? Because cold is <b>slow</b>: the molecules rarely have the energy to react. Plants settle on a <b>compromise temperature of about 400–450 °C</b> and add an <b>iron catalyst</b>. The catalyst speeds the forward and the backward reaction by the same factor, so it gets you to the balance sooner but <b>cannot move it</b> (for how catalysts work, see <a href="https://glassbox.how/rateclear/">RateClear</a>).</p>
    <p>Even then one pass over the catalyst turns only about <b>15 %</b> of the gas into ammonia. The trick is the <b>loop</b>: cool the gas, the ammonia turns liquid and is tapped off, and the leftover gas goes round again with fresh feed. Taking the product away is Le Chatelier once more: Q drops to zero and the forward reaction starts afresh. Overall about <b>97 %</b> ends up as ammonia.</p>
    <p class="tip"><b>Try it:</b> drop the temperature to 250 °C. The map says the yield should be huge, but watch how slowly the ammonia appears. Switch the catalyst off at 450 °C: the amber "most possible" line does not move, only the speed does. Then tap off the ammonia a few times and watch the overall conversion climb.</p>`,
  terms: [
    { t: 'Haber–Bosch process', d: 'Making ammonia from nitrogen and hydrogen at high pressure over an iron catalyst. Fritz Haber showed it in 1909; Carl Bosch made it an industry by 1913.' },
    { t: 'Yield', d: 'How much product you get compared with the most you could. Here: the share of ammonia in the gas.' },
    { t: 'Exothermic', d: 'Giving out heat. Making ammonia is exothermic, so heat pushes the balance back towards nitrogen and hydrogen.' },
    { t: 'Catalyst', d: 'A substance that speeds a reaction without being used up. It speeds both directions equally, so K does not change.' },
    { t: 'Compromise temperature', d: 'Hot enough to be fast, cool enough to leave a useful yield: about 400–450 °C for ammonia.' },
    { t: 'Recycle loop', d: 'Removing the product and sending unreacted gas round again, so little is wasted.' },
  ],
  defaults: { T: 450, P: 200, cat: true },
  controls: [
    { key: 'T', type: 'range', label: 'Temperature', min: 200, max: 600, step: 5, ends: ['200 °C: slow', '600 °C: fast'], fmt: (v) => `${Math.round(v)} °C` },
    { key: 'P', type: 'range', label: 'Pressure', min: 1, max: 400, step: 1, ends: ['1 bar', '400 bar'], fmt: (v) => `${Math.round(v)} bar` },
    { key: 'cat', type: 'toggle', label: 'Iron catalyst', hint: 'Speeds both directions. Watch what it does not change.' },
    { key: 'go', type: 'buttons', label: 'Run the plant', items: [
      { label: 'Tap off ammonia, top up', act: (s, inst) => inst.tap() },
      { label: 'Fresh gas (1 N₂ : 3 H₂)', act: (s, inst) => inst.fresh() },
      { label: 'Plant settings', act: (s, inst) => { s.T = 450; s.P = 200; s.cat = true; } },
    ] },
  ],
  quiz: [
    { q: 'Why does high pressure give more ammonia in N₂ + 3H₂ ⇌ 2NH₃?', options: ['Pressure makes molecules hotter', 'Four gas molecules become two, so the shift to ammonia eases the squeeze', 'The catalyst only works at high pressure', 'Pressure raises K'], answer: 1, why: 'The ammonia side has fewer gas molecules. Squeeze the mixture and the balance shifts that way. K itself does not change with pressure; Q does.' },
    { q: 'Cold favours ammonia at equilibrium. Why do plants still run at about 450 °C?', options: ['Cold iron rusts', 'At low temperature the reaction is far too slow, so they trade some yield for speed', 'Ammonia freezes below 400 °C', 'Hot gas is cheaper'], answer: 1, why: 'Equilibrium says how much you could get; it says nothing about how long it takes. 400–450 °C is the compromise between a good yield and a useful speed.' },
    { q: 'What does the iron catalyst do to the equilibrium yield?', options: ['Raises it', 'Lowers it', 'Nothing: it only gets there faster', 'Doubles it'], answer: 2, why: 'A catalyst speeds the forward and backward reactions by the same factor. The balance point, K, stays exactly where it was.' },
  ],
  reel: [
    { ms: 5600, caption: 'Fertiliser starts as ammonia. Four gas molecules become two, so plants squeeze the gas to 200 bar.', set: { T: 450, P: 20, cat: true }, act: (s, inst) => inst.fresh(), anim: { P: [20, 300] }, view: { pos: [0, 4.8, 7.4], target: [0, 4.6, 0] }, spin: 0.05 },
    { ms: 5600, caption: 'Cool gives more ammonia but far too slowly. About 450 °C with an iron catalyst is the compromise.', set: { T: 250, P: 200, cat: true }, act: (s, inst) => inst.fresh(), anim: { T: [250, 520] }, view: { pos: [0, 4.8, 7.4], target: [0, 4.6, 0] }, spin: 0.05 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(41);
    const base = box(4.9, 0.12, 2.8, M.matte(0x232832)); base.position.set(-0.6, 0.06, 0); root.add(base);
    const tk = tank(root, { w: 2.6, d: 1.6, y0: 0.5, hMax: 3.2, lid: 0x5b6470, handle: 0x8a93a3 });
    // weights on the lid stand for the pressure
    const weights = [];
    for (let i = 0; i < 4; i++) { const wgt = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 28), M.metal(0x4a505c, { roughness: 0.5 })); wgt.position.y = 1.0 + i * 0.16; wgt.castShadow = true; tk.piston.add(wgt); weights.push(wgt); }
    // the catalyst bed: dark iron granules on the floor
    const bed = dots(70, 0.075, 0x555b66, 6, true); root.add(bed);
    const bedPos = Array.from({ length: 70 }, () => [(rnd() - 0.5) * 2.4, 0.5 + 0.05 + rnd() * 0.07, (rnd() - 0.5) * 1.4, 0.7 + rnd() * 0.7]);
    // condenser: a cold glass pot where liquid ammonia collects
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.5, 32, 1, true), M.clear(0xcfe8ff, 0.16)); pot.position.set(-2.2, 0.87, 0); root.add(pot);
    const potBase = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 32), M.metal(0x8a93a3)); potBase.position.set(-2.2, 0.14, 0); root.add(potBase);
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1, 32), new THREE.MeshStandardMaterial({ color: hex(COL.nh3), transparent: true, opacity: 0.75, roughness: 0.2 })); root.add(liq);
    root.add(tube([[-1.32, 0.75, 0], [-1.6, 0.75, 0], [-1.75, 1.3, 0], [-1.95, 1.78, 0], [-2.2, 1.62, 0]], 0.045, M.metal(0xc0a060)));
    root.add(tube([[-1.32, 2.3, 0.3], [-1.65, 2.4, 0.3], [-1.85, 3.0, 0.3], [-2.7, 3.0, 0.3]], 0.045, M.metal(0x9fb4c8)));

    const mb = molBox(root, { N2: SHAPES.N2, H2: SHAPES.H2, NH3: SHAPES.NH3 }, { rnd, cap: 900 });
    const bulk = { N2: 30, H2: 90, NH3: 0 };
    let S = { T: 450, P: 200, cat: true }, hShow = HFULL, fed = 30, got = 0, key = '', t = 0, mapImg = null, passKey = '', passPts = null;
    const fresh = (s2) => {
      if (s2) S = s2;
      mb.clear(); mb.setBounds(tk.bounds(HFULL)); mb.add('N2', 30); mb.add('H2', 90);
      Object.assign(bulk, { N2: 30, H2: 90, NH3: 0 }); fed = 30; got = 0; hShow = HFULL;
    };
    const tap = () => {
      got += bulk.NH3; bulk.NH3 = 0;
      const d = NT - (bulk.N2 + bulk.H2); bulk.N2 += d / 4; bulk.H2 += (3 * d) / 4; fed += d / 4;
      mb.remove('NH3', mb.n.NH3);
      const dv = Math.max(0, Math.round((NT - mb.n.N2 - mb.n.H2) / 4));
      mb.add('N2', dv, [-1.05, 2.3, 0.3], [2, 0, 0]); mb.add('H2', 3 * dv, [-1.05, 2.3, 0.3], [2, 0, 0]);
    };
    fresh();

    const lLid = stage.label('', [0, 0, 0], root, 'hot'), lBed = stage.label('', [0, 0.5, 1.15], root, 'hot');
    const lPot = stage.label('', [-1.9, 2.0, 0.5], root), lFeed = stage.label('fresh N₂ + 3H₂', [-2.3, 3.3, 0.3], root);

    const map = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h);
      title(g, 'Ammonia at equilibrium', 'the most the gas can hold, % by moles');
      const A = { x0: 92, x1: w - 64, y0: h - 58, y1: 60 };
      const { X, Y } = axes(g, w, h, { ...A, xMin: 200, xMax: 600, yMin: 0, yMax: 400, xTicks: [200, 300, 400, 500, 600], yTicks: [0, 100, 200, 300, 400], xFmt: (v) => v + ' °C', yFmt: (v) => (v === 400 ? '400 bar' : v + '') });
      if (!mapImg) {
        const iw = 80, ih = 50; mapImg = document.createElement('canvas'); mapImg.width = iw; mapImg.height = ih;
        const c = mapImg.getContext('2d'), im = c.createImageData(iw, ih);
        for (let j = 0; j < ih; j++) for (let i = 0; i < iw; i++) { const y = haberY(200 + ((i + 0.5) / iw) * 400 + K0, Math.max(1, 400 * (1 - (j + 0.5) / ih))); const [r, gg, b] = ramp(y); const k = (j * iw + i) * 4; im.data[k] = r; im.data[k + 1] = gg; im.data[k + 2] = b; im.data[k + 3] = 255; }
        c.putImageData(im, 0, 0);
        mapImg.cont = [10, 20, 40, 60, 80].map((lv) => { const pts = []; for (let T = 200; T <= 600; T += 10) { let lo = 1, hi = 400; if (haberY(T + K0, 400) * 100 < lv) continue; if (haberY(T + K0, 1) * 100 > lv) continue; for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (haberY(T + K0, m) * 100 < lv) lo = m; else hi = m; } pts.push([T, (lo + hi) / 2]); } return { lv, pts }; });
      }
      g.imageSmoothingEnabled = true; g.drawImage(mapImg, X(200), Y(400), X(600) - X(200), Y(0) - Y(400));
      for (const c of mapImg.cont) { line(g, c.pts, X, Y, 'rgba(255,255,255,.7)', 1.5); const p = c.pts[c.pts.length - 1]; if (p) text(g, c.lv + '%', X(p[0]) + (p[0] >= 590 ? 6 : -4), Y(p[1]) + (p[0] >= 590 ? 6 : -6), '#fff', 'bold 15px sans-serif'); }
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.setLineDash([6, 5]); g.strokeRect(X(400), Y(250), X(500) - X(400), Y(150) - Y(250)); g.setLineDash([]);
      text(g, 'plants', X(450), Y(250) - 6, '#fff', 'bold 15px sans-serif', 'center');
      dot(g, X(S.T), Y(S.P), COL.K, 10);
      const yy = (haberY(TK(S), S.P) * 100).toFixed(yyFix(S));
      text(g, yy + ' %', clamp(X(S.T), 110, w - 110), Y(S.P) + (S.P > 340 ? 30 : -16), '#fff', 'bold 20px sans-serif', 'center');
      text(g, '← more ammonia, but slow', X(200) + 6, h - 8, COL.Q, '16px sans-serif'); text(g, 'fast, but less →', X(600), h - 8, COL.hot, '16px sans-serif', 'right');
    }, [4.95, 3.75, 0]);
    function yyFix(s) { return haberY(TK(s), s.P) < 0.1 ? 1 : 0; }

    const comp = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h);
      title(g, 'The compromise', `at ${Math.round(S.P)} bar`);
      const pk = `${Math.round(S.P)}`;
      if (pk !== passKey) { passKey = pk; passPts = { eq: [], on: [], off: [] }; for (let T = 200; T <= 600; T += 10) { passPts.eq.push([T, haberY(T + K0, S.P) * 100]); passPts.on.push([T, haberPass(T + K0, S.P, true) * 100]); passPts.off.push([T, haberPass(T + K0, S.P, false) * 100]); } }
      const yMax = clamp(Math.ceil((Math.max(...passPts.on.map((q) => q[1])) * 2.6) / 10) * 10, 10, 100), yt = []; for (let v = 0; v <= yMax; v += yMax > 60 ? 20 : 10) yt.push(v);
      const { X, Y } = axes(g, w, h, { x0: 70, x1: w - 44, y0: h - 44, y1: 92, xMin: 200, xMax: 600, yMax, xTicks: [200, 300, 400, 500, 600], yTicks: yt, xFmt: (v) => v + ' °C', yFmt: (v) => v + '%' });
      g.save(); g.beginPath(); g.rect(X(200), Y(yMax), X(600) - X(200), Y(0) - Y(yMax) + 2); g.clip();
      line(g, passPts.eq, X, Y, COL.K, 3, [8, 6]);
      line(g, passPts.off, X, Y, COL.back, 3);
      line(g, passPts.on, X, Y, COL.fwd, 5);
      g.restore();
      legend(g, [['most possible', COL.K], ['one pass, iron', COL.fwd], ['one pass, no catalyst', COL.back]], 20, 50, 16);
      const now = bulk.NH3 / (bulk.N2 + bulk.H2 + bulk.NH3) * 100;
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.setLineDash([4, 5]); g.lineWidth = 2; g.beginPath(); g.moveTo(X(S.T), Y(0)); g.lineTo(X(S.T), Y(yMax)); g.stroke(); g.setLineDash([]);
      dot(g, X(S.T), Y(Math.min(now, yMax)), COL.nh3, 10);
      text(g, `now ${now.toFixed(1)} %`, clamp(X(S.T) + 14, 80, w - 120), Y(Math.min(now, yMax)) - 12, '#fff', 'bold 18px sans-serif');
    }, [4.95, 1.4, 0]);

    return {
      fresh, tap,
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        fitNarrow(stage, [lPot, lFeed, lBed]);
        reelBoards([map, comp], 0, 9.6);
        const T = TK(s), nt = bulk.N2 + bulk.H2 + bulk.NH3;
        hShow = approach(hShow, (HFULL * nt) / NT, 6, dt);
        tk.setH(hShow); mb.setBounds(tk.bounds(hShow, s.cat ? 0.16 : 0.1));
        for (let i = 0; i < 6; i++) { const [rf, rb] = haberRates(bulk, T, s.P, s.cat); const d = clamp(((rf - rb) * dt) / 6, -bulk.NH3 / 2, Math.min(bulk.N2, bulk.H2 / 3) * 0.5); bulk.N2 -= d; bulk.H2 -= 3 * d; bulk.NH3 += 2 * d; }
        const vn = { N2: mb.n.N2, H2: mb.n.H2, NH3: Math.sqrt(Math.max(0, mb.n.NH3 * (mb.n.NH3 - 1))) };
        const [vf, vb] = haberRates(vn, T, s.P, s.cat);
        for (let i = poisson(rnd, vf * dt); i > 0; i--) mb.react(['N2', 'H2', 'H2', 'H2'], ['NH3', 'NH3'], hex(COL.fwd), s.cat);
        for (let i = poisson(rnd, vb * dt); i > 0; i--) mb.react(['NH3', 'NH3'], ['N2', 'H2', 'H2', 'H2'], hex(COL.back), s.cat);
        mb.step(dt, 1.1 * Math.sqrt(T / 723.15));
        t += dt;
        bedPos.forEach((p, i) => bed.place(i, p[0], s.cat ? p[1] : -9, p[2], p[3])); bed.done();
        const nw = clamp(Math.ceil(s.P / 100), 1, 4); weights.forEach((wg, i) => { wg.visible = i < nw; });
        const lv = clamp(got / 160, 0.01, 1) * 1.4; liq.scale.y = lv; liq.position.set(-2.2, 0.18 + lv / 2, 0);
        lLid.position.set(1.2, tk.dim.y0 + hShow + 0.55, 0.6);
        lLid.element.innerHTML = `held at <b>${Math.round(s.P)} bar</b>, ${Math.round(s.T)} °C`;
        lLid.element.style.setProperty('--c', COL.Q);
        lBed.element.innerHTML = s.cat ? 'iron catalyst: on' : 'no catalyst';
        lBed.element.style.setProperty('--c', s.cat ? COL.fwd : COL.back);
        lPot.element.innerHTML = `tapped: <b>${Math.round(got)}</b> NH₃ (<b>${Math.round((100 * got) / (2 * fed))} %</b> of N fed)`;
        const kk = `${Math.round(s.T)}|${Math.round(s.P)}|${s.cat}|${Math.round(t * 5)}`;
        if (kk !== key) { key = kk; map.redraw(); comp.redraw(); }
      },
      readout: (s) => {
        const T = TK(s), nt = bulk.N2 + bulk.H2 + bulk.NH3, now = bulk.NH3 / nt, eq = haberEq(bulk, T, s.P), Q = qHaber(bulk, s.P), K = kHaber(T, s.P), v = verdict(Q, K, 0.08);
        const rel = (s.cat ? 1 : HABER.noCat) * Math.exp((-HABER.Ea / 8.314) * (1 / T - 1 / 723.15)) * (s.P / 200);
        const one = haberPass(T, s.P, s.cat);
        return `<div class="big">N₂ + 3H₂ ⇌ 2NH₃</div>
          <div class="row"><span>K at ${Math.round(s.T)} °C</span><b style="color:${COL.K}">${sci(kaHaber(T))} per atm²</b></div>
          <div class="row"><span>Most ammonia possible here</span><b style="color:${COL.K}">${(eq.y * 100).toFixed(1)} %</b></div>
          <div class="row"><span>Ammonia in the gas now</span><b style="color:${COL.nh3}">${(now * 100).toFixed(1)} % ${v === 0 ? '(balanced)' : v < 0 ? '(Q < K: rising)' : '(Q > K: falling)'}</b></div>
          <div class="row"><span>One pass over the bed gives</span><b>${(one * 100).toFixed(1)} %</b></div>
          <div class="row"><span>Speed against plant settings</span><b>${rel < 0.1 ? rel.toFixed(3) : rel.toFixed(2)} ×</b></div>
          <small>Yields are measured thermodynamics. Speeds are a model, compressed so you can watch: really, no iron means no ammonia at all.</small>`;
      },
    };
  },
};
