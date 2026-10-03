// Chapter 5: where the simple "it opposes the change" rule misleads, and Q against K does not.
// Four pokes at an ammonia mixture (N₂ + 3 H₂ ⇌ 2 NH₃) balanced at 450 °C and 200 bar:
//   1. Add a catalyst: both rates jump by the same factor, Q stays on K, nothing shifts.
//   2. Pump argon into a rigid tank: total pressure rises, but the partial pressures of N₂, H₂ and
//      NH₃ are untouched, so Q is unchanged and nothing shifts.
//   3. Add argon under a free piston (steady pressure): the volume grows, every reacting gas is
//      thinner, Q = y²NH₃·n²ₜ… rises by (n_total after ÷ before)², and ammonia breaks up.
//   4. Add N₂ at steady pressure to a mixture that is already more than half N₂: Q rises, because
//      d ln Q ÷ dn(N₂) = 2 ÷ n_total − 1 ÷ n(N₂) is positive when N₂ is over half the molecules. The
//      reaction runs backwards and makes still more N₂: the textbook exception to the simple rule
//      (see e.g. Atkins' Physical Chemistry; de Heer, J. Chem. Educ. 34, 375, 1957).
// The gas is treated as ideal here (K = Ka from Gillespie–Beattie), so that case 2 is exactly zero;
// in a real gas at these pressures there is a small second-order shift. Kinetics: eq.js, haberRates.
import { THREE, M, box, beam, approach } from '../kit.js';
import {
  K0, COL, hex, kaHaber, qHaber, haberEq, haberRates, board, panelBg, axes, title, line, legend, text, qkBar, verdict,
  tank, molBox, SHAPES, rng, poisson, meter, fitNarrow, reelBoards, clamp, dots,
} from '../eq.js';

const T = 450 + K0, P0 = 200, WIN = 20, HF = 1.7;
const EXP = {
  cat: { name: 'Add a catalyst', mix: { N2: 30, H2: 90 }, guess: 'More product.', truth: 'Both rates jump 40 times, together. Q never leaves K, so nothing shifts. You only get there sooner.', span: 1 },
  inertV: { name: 'Argon into a rigid tank', mix: { N2: 30, H2: 90 }, guess: 'Pressure is up: more ammonia.', truth: 'Argon takes no part. The pressures of N₂, H₂ and NH₃ are just what they were, so Q is unchanged. No shift.', span: 1 },
  inertP: { name: 'Argon under a free piston', mix: { N2: 30, H2: 90 }, guess: 'Argon is inert: no change.', truth: 'The piston rises and the reacting gases are spread thinner. Q jumps above K and ammonia breaks up.', span: 1 },
  n2: { name: 'More N₂ into an N₂-rich mix', mix: { N2: 105, H2: 45 }, guess: 'More reactant: more ammonia.', truth: 'Nitrogen is already over half the gas. More of it thins the hydrogen more than it helps. Q rises above K: ammonia breaks up, making even more nitrogen.', span: 0.5 },
};

export default {
  id: 'limits',
  short: 'Where the rule slips',
  title: 'Four pokes that fool the simple rule',
  subtitle: 'A catalyst, an inert gas and one famous exception. Le Chatelier in words can mislead; Q against K never does.',
  view: { pos: [2.0, 3.7, 10.0], target: [2.0, 3.25, 0] },
  learn: `<p>"It shifts to oppose the change" is a handy rule, but it is words, not maths. Here are the places where it trips people up.</p>
    <p><b>Myth: a catalyst gives more product.</b> No. A catalyst lowers the energy hill for the forward <b>and</b> the backward reaction, so both speed up by the same factor. The balance point does not move by a hair. You reach the same mixture, sooner.</p>
    <p><b>An inert gas.</b> Pump argon into a sealed steel tank of ammonia mixture and the pressure gauge climbs. The rule seems to say "shift to fewer molecules". But argon does not change how crowded the N₂, H₂ or NH₃ molecules are, so <b>nothing shifts</b>. Add the same argon under a free piston and the gas expands: now the reacting molecules are thinner, and the balance moves <b>back</b> towards the side with more molecules.</p>
    <p><b>The famous exception.</b> Adding a reactant "should" make more product. Yet if nitrogen is already more than half of the gas, adding more nitrogen at steady pressure makes the reaction run <b>backwards</b> and produce even more nitrogen. The rule fails; the sum does not. Work out <b>Q</b>, compare it with <b>K</b>, and you always get the right direction.</p>
    <p>Three more limits. The shift only <b>partly</b> undoes a change, never fully. Equilibrium says <b>where</b> a reaction is heading, not <b>how fast</b>: hydrogen and oxygen can sit together for years at room temperature although K for making water is enormous (see <a href="https://glassbox.how/rateclear/">RateClear</a>). And the principle only speaks about systems <b>at equilibrium</b>. A living cell, a flame and a running engine are kept far from balance by a steady flow of matter and energy. A battery is a reaction on its way to equilibrium: when it gets there, the battery is flat (see <a href="https://glassbox.how/redoxclear/">RedoxClear</a>).</p>
    <p class="tip"><b>Try it:</b> pick each poke, read the simple guess, then switch <b>Poke it</b> on. Watch the blue Q dot. Only when it leaves the amber K line does the ammonia level move, and it always moves in the direction that brings Q back.</p>`,
  terms: [
    { t: 'Inert gas', d: 'A gas that takes no part in the reaction, such as argon. It matters only if it changes how crowded the reacting gases are.' },
    { t: 'Partial pressure', d: 'The pressure one gas in a mixture would have if it were alone in the container. Q is built from these.' },
    { t: 'Position of equilibrium', d: 'The make-up of the mixture at balance. Concentration and pressure changes move it; only temperature changes K.' },
    { t: 'Kinetics', d: 'The study of how fast reactions go. Equilibrium tells you the destination; kinetics tells you the travel time.' },
    { t: 'Steady state', d: 'A system held away from equilibrium by a constant flow through it, like a living cell or a candle flame.' },
  ],
  defaults: { poke: 'cat', on: false },
  controls: [
    { key: 'poke', type: 'seg', label: 'The poke', options: [{ v: 'cat', label: 'Catalyst' }, { v: 'inertV', label: 'Argon, rigid tank' }, { v: 'inertP', label: 'Argon, free piston' }, { v: 'n2', label: 'More N₂' }], fmt: (v) => EXP[v].name },
    { key: 'on', type: 'toggle', label: 'Poke it', hint: 'Off puts the mixture back as it was, balanced at 450 °C and 200 bar.' },
  ],
  onChange(s, key) { if (key === 'poke') s.on = false; },
  quiz: [
    { q: 'An ammonia mixture is at equilibrium in a rigid steel tank. You pump in argon. What happens to the amount of ammonia?', options: ['It rises', 'It falls', 'It stays the same', 'It doubles'], answer: 2, why: 'In a fixed volume, argon does not change the partial pressures of N₂, H₂ or NH₃. Q is unchanged, so nothing shifts, even though the total pressure rose.' },
    { q: 'What does a catalyst change?', options: ['The equilibrium constant K', 'The final amounts of products', 'How quickly the mixture reaches equilibrium', 'The heat given out'], answer: 2, why: 'A catalyst speeds forward and backward reactions equally. It changes the time taken, never the destination.' },
    { q: 'Hydrogen and oxygen at room temperature have a huge K for making water, yet a mixture sits unchanged. Why?', options: ['Le Chatelier forbids it', 'The reaction is at equilibrium already', 'K says where the balance lies, not how fast it is reached; the reaction is far too slow without a spark or catalyst', 'Water is unstable'], answer: 2, why: 'Equilibrium and speed are separate questions. A large K only says the products are favoured. The energy hill in the way sets the speed.' },
  ],
  reel: [
    { ms: 5600, caption: 'Myth: a catalyst gives more product. It speeds both directions equally, so the balance does not move at all.', set: { poke: 'cat', on: false }, anim: { on: [false, true] }, view: { pos: [0, 4.8, 7.4], target: [0, 4.6, 0] }, spin: 0.05 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(91);
    const base = box(4.9, 0.12, 2.8, M.matte(0x232832)); base.position.set(-0.6, 0.06, 0); root.add(base);
    const tk = tank(root, { w: 2.6, d: 1.6, y0: 0.5, hMax: 3.3, lid: 0x5b6470, handle: 0x8a93a3 });
    const pins = new THREE.Group(); tk.piston.add(pins);
    for (const z of [-0.55, 0.55]) pins.add(beam([-1.65, 0.2, z], [1.65, 0.2, z], 0.06, M.plastic(0xff5a5a)));
    const bed = dots(70, 0.075, 0x555b66, 6, true); root.add(bed);
    const bedPos = Array.from({ length: 70 }, () => [(rnd() - 0.5) * 2.4, 0.55 + rnd() * 0.07, (rnd() - 0.5) * 1.4, 0.7 + rnd() * 0.7]);
    // a gas bottle for whatever is pumped in
    const botM = M.plastic(0xc49bff, { roughness: 0.35 });
    const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.4, 28), botM); bot.position.set(-2.2, 0.82, 0); bot.castShadow = true; root.add(bot);
    root.add(beam([-2.2, 1.52, 0], [-2.2, 1.75, 0], 0.06, M.metal(0xc0a060)), beam([-2.2, 1.75, 0], [-1.32, 1.1, 0], 0.045, M.metal(0xc0a060)));

    const mb = molBox(root, { N2: SHAPES.N2, H2: SHAPES.H2, NH3: SHAPES.NH3, Ar: SHAPES.Ar }, { rnd, cap: 1000 });
    const bulk = { N2: 0, H2: 0, NH3: 0, Ar: 0 };
    let S = { poke: 'cat', on: false }, cur = '', poked = false, cat = true, constV = false, ntRef = 1, nt0 = 1, before = 0, hShow = HF, t = 0, tPoke = -1, lastRec = -1, key = '';
    const hist = [], mF = meter(), mB = meter();
    const NT = () => bulk.N2 + bulk.H2 + bulk.NH3 + bulk.Ar;
    const press = () => (constV ? (P0 * NT()) / ntRef : P0);
    const start = (which) => {
      cur = which; poked = false;
      const e = haberEq({ ...EXP[which].mix, NH3: 0 }, T, P0, false);
      Object.assign(bulk, { N2: e.N2, H2: e.H2, NH3: e.NH3, Ar: 0 });
      cat = which !== 'cat'; constV = which === 'inertV'; ntRef = nt0 = NT(); before = bulk.NH3;
      hShow = HF; mb.clear(); mb.setBounds(tk.bounds(HF, 0.16));
      const nh = Math.round(e.NH3 / 2) * 2, x = nh / 2;
      mb.add('N2', EXP[which].mix.N2 - x); mb.add('H2', EXP[which].mix.H2 - 3 * x); mb.add('NH3', nh);
      hist.length = 0; mF.reset(); mB.reset(); t = 0; tPoke = -1; lastRec = -1;
    };
    const poke = () => {
      poked = true; tPoke = t; before = bulk.NH3;
      if (cur === 'cat') cat = true;
      else if (cur === 'n2') { bulk.N2 += 60; mb.add('N2', 60, [-1.05, 1.1, 0], [2.2, 0.4, 0]); }
      else { bulk.Ar += 50; mb.add('Ar', 50, [-1.05, 1.1, 0], [2.2, 0.4, 0]); }
    };
    start('cat');

    const lLid = stage.label('', [0, 0, 0], root, 'hot'), lBot = stage.label('', [-2.2, 2.05, 0], root), lBed = stage.label('', [0, 0.5, 1.15], root, 'hot');

    const top = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h);
      title(g, 'Ammonia in the mixture', 'molecules');
      const t1 = Math.max(WIN, t), t0 = t1 - WIN, xt = []; for (let v = Math.ceil(t0 / 4) * 4; v <= t1; v += 4) xt.push(v);
      let lo = before, hi = before; for (const p of hist) { lo = Math.min(lo, p.A); hi = Math.max(hi, p.A); }
      const pad = Math.max(3, (hi - lo) * 0.6), yMin = Math.max(0, Math.floor(lo - pad)), yMax = Math.ceil(hi + pad), st = Math.max(1, Math.round((yMax - yMin) / 4)), yt = []; for (let v = yMin; v <= yMax; v += st) yt.push(v);
      const { X, Y, y0, y1 } = axes(g, w, h, { x0: 60, y1: 84, y0: h - 40, xMin: t0, xMax: t1, yMin, yMax, xTicks: xt, yTicks: yt, xFmt: (v) => v + ' s' });
      g.save(); g.beginPath(); g.rect(60, y1, w - 88, y0 - y1); g.clip();
      line(g, [[t0, before], [t1, before]], X, Y, COL.K, 2, [8, 6]);
      const vis = hist.filter((p) => p.t >= t0);
      line(g, vis.map((p) => [p.t, p.a]), X, Y, 'rgba(92,225,169,.4)', 1.5);
      line(g, vis.map((p) => [p.t, p.A]), X, Y, COL.nh3, 4);
      g.restore();
      if (tPoke >= t0 && tPoke >= 0) { g.strokeStyle = 'rgba(255,255,255,.6)'; g.setLineDash([5, 5]); g.lineWidth = 2; g.beginPath(); g.moveTo(X(tPoke), y1); g.lineTo(X(tPoke), y0); g.stroke(); g.setLineDash([]); text(g, 'poked', X(tPoke) + 5, y1 + 14, '#fff', '15px sans-serif'); }
      legend(g, [['the whole mixture', COL.nh3], ['before the poke', COL.K]], 20, 50, 16);
      text(g, 'thin line: molecules in view', w - 20, 64, 'rgba(255,255,255,.55)', '15px sans-serif', 'right');
    }, [4.95, 3.75, 0]);

    const bar = (g, w, y, lab, r, mx, c, seen) => {
      const bx = 200, bw = w - bx - 120;
      text(g, lab, 20, y + 16, COL.text, 'bold 17px sans-serif');
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(bx, y, bw, 20);
      g.fillStyle = c; g.fillRect(bx, y, bw * clamp(r / mx, 0, 1), 20);
      g.fillStyle = '#fff'; g.fillRect(bx + bw * clamp(seen / mx, 0, 1) - 1.5, y - 4, 3, 28);
      text(g, r.toFixed(r < 10 ? 2 : 1) + ' /s', w - 20, y + 16, c, 'bold 18px sans-serif', 'right');
    };
    const qk = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h);
      const P = press(), Q = qHaber(bulk, P), K = kaHaber(T), v = verdict(Q, K, 0.012);
      title(g, 'Q against K', v === 0 ? 'Q = K: no shift' : v > 0 ? 'Q above K: ammonia breaks up' : 'Q below K: more ammonia forms');
      qkBar(g, 40, w - 40, 128, Q, K, { span: EXP[cur].span, fwd: 'makes ammonia', back: 'breaks ammonia', kTxt: 'K', qTxt: `Q = ${(Q / K).toFixed(2)} × K` });
      const [rf, rb] = haberRates(bulk, T, P, cat, false), mx = 5;
      bar(g, w, 232, 'forward', rf, mx, COL.fwd, mF.rate);
      bar(g, w, 272, 'backward', rb, mx, COL.back, mB.rate);
      text(g, 'bars: the rate laws. white ticks: flashes counted in the box.', 20, 334, 'rgba(255,255,255,.55)', '15px sans-serif');
    }, [4.95, 1.4, 0]);

    return {
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        fitNarrow(stage, [lBot, lBed]);
        reelBoards([top, qk], 0, 9.6);
        if (s.poke !== cur || (!s.on && poked)) start(s.poke);
        if (s.on && !poked) poke();
        const P = press();
        for (let i = 0; i < 6; i++) { const [rf, rb] = haberRates(bulk, T, press(), cat, false); const d = clamp(((rf - rb) * dt) / 6, -bulk.NH3 / 2, Math.min(bulk.N2, bulk.H2 / 3) * 0.5); bulk.N2 -= d; bulk.H2 -= 3 * d; bulk.NH3 += 2 * d; }
        const vnt = mb.n.N2 + mb.n.H2 + mb.n.NH3 + mb.n.Ar, vP = constV ? (P0 * vnt) / ntRef : P0;
        const [vf, vb] = haberRates({ N2: mb.n.N2, H2: mb.n.H2, NH3: Math.sqrt(Math.max(0, mb.n.NH3 * (mb.n.NH3 - 1))), Ar: mb.n.Ar }, T, vP, cat, false);
        let ef = 0, eb = 0;
        for (let i = poisson(rnd, vf * dt); i > 0; i--) if (mb.react(['N2', 'H2', 'H2', 'H2'], ['NH3', 'NH3'], hex(COL.fwd), cat)) ef++;
        for (let i = poisson(rnd, vb * dt); i > 0; i--) if (mb.react(['NH3', 'NH3'], ['N2', 'H2', 'H2', 'H2'], hex(COL.back), cat)) eb++;
        if (dt > 0) { mF.add(ef, dt); mB.add(eb, dt); }
        hShow = approach(hShow, constV ? HF : (HF * NT()) / nt0, 5, dt);
        tk.setH(hShow); mb.setBounds(tk.bounds(hShow, cat ? 0.16 : 0.1));
        mb.step(dt, 1.1);
        t += dt;
        if (t - lastRec > 0.1) { lastRec = t; hist.push({ t, A: bulk.NH3, a: mb.n.NH3 }); while (hist.length && hist[0].t < t - WIN - 1) hist.shift(); }
        bedPos.forEach((p, i) => bed.place(i, p[0], cat ? p[1] : -9, p[2], p[3])); bed.done();
        pins.visible = constV;
        botM.color.set(cur === 'n2' ? hex(COL.n2) : cur === 'cat' ? 0x555b66 : hex(COL.ar));
        lLid.position.set(0, tk.dim.y0 + hShow + 1.25, 0);
        lLid.element.innerHTML = constV ? `rigid tank: <b>${Math.round(P)} bar</b>` : `free piston: held at <b>${P0} bar</b>`;
        lLid.element.style.setProperty('--c', constV ? '#ff5a5a' : COL.Q);
        lBot.element.innerHTML = cur === 'n2' ? 'nitrogen' : cur === 'cat' ? 'iron catalyst' : 'argon';
        lBed.element.innerHTML = cat ? 'iron catalyst: in' : 'no catalyst yet';
        lBed.element.style.setProperty('--c', cat ? COL.fwd : COL.back);
        const kk = `${cur}|${Math.round(t * 8)}`;
        if (kk !== key) { key = kk; top.redraw(); qk.redraw(); }
      },
      readout: () => {
        const e = EXP[cur], P = press(), Q = qHaber(bulk, P), K = kaHaber(T), [rf, rb] = haberRates(bulk, T, P, cat, false);
        const end = constV ? bulk.NH3 : haberEq(bulk, T, P0, false).NH3;
        return `<div class="big">${e.name}</div>
          <div class="row"><span>The simple guess</span><b style="color:${COL.back};text-align:right">${e.guess}</b></div>
          <div class="row"><span>Q now</span><b style="color:${COL.Q}">${(Q / K).toFixed(2)} × K</b></div>
          <div class="row"><span>Forward, backward rate</span><b><span style="color:${COL.fwd}">${rf.toFixed(2)}</span> and <span style="color:${COL.back}">${rb.toFixed(2)}</span> per second</b></div>
          <div class="row"><span>Ammonia: before, now, final</span><b style="color:${COL.nh3}">${before.toFixed(1)}, ${bulk.NH3.toFixed(1)}, ${end.toFixed(1)}</b></div>
          <small>${poked ? `<b style="color:${COL.fwd}">What Q says:</b> ${e.truth}` : 'Balanced at 450 °C and 200 bar. Switch “Poke it” on.'}</small>`;
      },
    };
  },
};
