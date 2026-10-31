// ORC-OHST engine: Peng-Robinson EOS + ORC cycle, pinch search, OHST, exergy, optimizer, dual-fluid.
// Prototype property model (not REFPROP/CoolProp). Units: T in degC at API level, K internally; p in bar; h kJ/kg; s kJ/(kg K).
(function (root) {
  const RU = 8.314462618; // J/(mol K)
  const TK = 273.15;
  const SQ2 = Math.SQRT2;

  // Tc [degC], pc [bar], omega, M [g/mol], cp0 at 20 C [kJ/kgK] (Table 2), pmax [bar] (Table 2)
  // omega and M are literature values; R152a is absent from Table 2 but plotted in Fig. 11.
  const FLUIDS = {
    'R1233zd(E)': { tc: 165.6, pc: 35.73, w: 0.3025, M: 130.50, cp20: 0.8197, pmax: 30, gwp: 5, inTable: true },
    'R1234ze(Z)': { tc: 150.12, pc: 35.33, w: 0.3274, M: 114.04, cp20: 0.8516, pmax: 30, gwp: 6, inTable: true },
    'R245fa': { tc: 154.01, pc: 36.51, w: 0.3776, M: 134.05, cp20: 0.9176, pmax: 30, gwp: 1030, inTable: true },
    'R142b': { tc: 137.11, pc: 40.55, w: 0.2321, M: 100.50, cp20: 0.8454, pmax: 30, gwp: 2310, inTable: true },
    'R236ea': { tc: 139.29, pc: 35.02, w: 0.3794, M: 152.04, cp20: 0.8657, pmax: 30, gwp: 1410, inTable: true },
    'R152a': { tc: 113.26, pc: 45.17, w: 0.2752, M: 66.05, cp20: 1.0130, pmax: 30, gwp: 124, inTable: false },
    'R124': { tc: 122.28, pc: 36.24, w: 0.2881, M: 136.48, cp20: 0.7357, pmax: 30, gwp: 609, inTable: true },
    'R236fa': { tc: 124.92, pc: 32.00, w: 0.3772, M: 152.04, cp20: 0.8332, pmax: 30, gwp: 9810, inTable: true },
    'R1234ze(E)': { tc: 109.37, pc: 36.36, w: 0.3130, M: 114.04, cp20: 0.8791, pmax: 30, gwp: 6, inTable: true },
    'R134a': { tc: 101.06, pc: 40.59, w: 0.3268, M: 102.03, cp20: 0.8435, pmax: 30, gwp: 1430, inTable: true },
    'R1234yf': { tc: 94.7, pc: 33.82, w: 0.2760, M: 114.04, cp20: 0.8963, pmax: 30, gwp: 4, inTable: true },
    'R227ea': { tc: 101.75, pc: 29.25, w: 0.3570, M: 170.03, cp20: 0.8061, pmax: 28, gwp: 3220, inTable: true },
    'R218': { tc: 71.87, pc: 26.4, w: 0.3172, M: 188.02, cp20: 0.7896, pmax: 26, gwp: 8830, inTable: true },
  };
  const CP0_EXP = 0.6; // cp0(T) = cp20 * (T/293.15)^n, generic exponent for halocarbons

  function mk(name) {
    const f = FLUIDS[name];
    if (f._k) return f;
    f.name = name;
    f.Tc = f.tc + TK; f.Pc = f.pc * 1e5; f.R = RU / f.M; // kJ/kgK (J/molK / g/mol)
    f.kap = 0.37464 + 1.54226 * f.w - 0.26992 * f.w * f.w;
    f.ac = 0.45724 * RU * RU * f.Tc * f.Tc / f.Pc; f.b = 0.07780 * RU * f.Tc / f.Pc;
    f.Tref = 273.15; f._k = true;
    return f;
  }
  function aT(f, T) { const s = 1 + f.kap * (1 - Math.sqrt(T / f.Tc)); return f.ac * s * s; }
  function daT(f, T) { const s = 1 + f.kap * (1 - Math.sqrt(T / f.Tc)); return -f.ac * f.kap * s / Math.sqrt(T * f.Tc); }

  function cubicRoots(c2, c1, c0) { // z^3 + c2 z^2 + c1 z + c0
    const q = (3 * c1 - c2 * c2) / 9, r = (9 * c2 * c1 - 27 * c0 - 2 * c2 * c2 * c2) / 54;
    const D = q * q * q + r * r;
    if (D > 0) { const sD = Math.sqrt(D); return [Math.cbrt(r + sD) + Math.cbrt(r - sD) - c2 / 3]; }
    const th = Math.acos(r / Math.sqrt(-q * q * q)), m = 2 * Math.sqrt(-q);
    return [m * Math.cos(th / 3) - c2 / 3, m * Math.cos((th + 2 * Math.PI) / 3) - c2 / 3, m * Math.cos((th + 4 * Math.PI) / 3) - c2 / 3].sort((a, b) => a - b);
  }
  function Zroots(f, T, P) {
    const A = aT(f, T) * P / (RU * RU * T * T), B = f.b * P / (RU * T);
    const z = cubicRoots(-(1 - B), A - 3 * B * B - 2 * B, -(A * B - B * B - B * B * B)).filter(x => x > B);
    return { A, B, zl: z[0], zv: z[z.length - 1] };
  }
  function lnphi(Z, A, B) {
    return Z - 1 - Math.log(Z - B) - A / (2 * SQ2 * B) * Math.log((Z + (1 + SQ2) * B) / (Z + (1 - SQ2) * B));
  }
  // ideal gas parts (per kg)
  function hig(f, T) { const n = CP0_EXP, c = f.cp20 / Math.pow(293.15, n); return c * (Math.pow(T, n + 1) - Math.pow(f.Tref, n + 1)) / (n + 1); }
  function sig(f, T, P) { const n = CP0_EXP, c = f.cp20 / Math.pow(293.15, n); return c * (Math.pow(T, n) - Math.pow(f.Tref, n)) / n - f.R * Math.log(P / 1e5); }
  function props(f, T, P, phase) { // phase 'l' or 'v'
    if (f.tab) return phase === 'l' ? tab.liq(f, T, P / 1e5) : tab.vap(f, T); // vapour table exists only on the condenser isobar
    const { A, B, zl, zv } = Zroots(f, T, P);
    const Z = phase === 'l' ? zl : zv;
    const a = aT(f, T), da = daT(f, T);
    const L = Math.log((Z + (1 + SQ2) * B) / (Z + (1 - SQ2) * B));
    const hdep = (RU * T * (Z - 1) + (T * da - a) / (2 * SQ2 * f.b) * L) / f.M; // J/mol / g/mol = kJ/kg
    const sdep = (RU * Math.log(Z - B) + da / (2 * SQ2 * f.b) * L) / f.M;
    const v = Z * RU * T / P / f.M; // m3/mol / g/mol -> m3/g; *1000 = m3/kg
    return { h: hig(f, T) + hdep + 200, s: sig(f, T, P) + sdep + 1, v: v * 1000, Z };
  }
  const satCache = new Map();
  function psat(f, T) { // Pa
    if (f.tab) return tab.psat(f, T);
    const key = f.name + T.toFixed(4);
    if (satCache.has(key)) return satCache.get(key);
    let P = f.Pc * Math.exp(5.373 * (1 + f.w) * (1 - f.Tc / T));
    for (let i = 0; i < 300; i++) {
      const { A, B, zl, zv } = Zroots(f, T, P);
      if (Math.abs(zl - zv) < 1e-9) { P *= (T / f.Tc > 0.99 ? 0.999 : 0.98); continue; }
      const d = lnphi(zl, A, B) - lnphi(zv, A, B);
      P *= Math.exp(d);
      if (Math.abs(d) < 1e-11) break;
    }
    satCache.set(key, P); return P;
  }
  function Tsat(f, Pbar) { // degC
    if (f.tab) return tab.Tsat(f, Pbar);
    const P = Pbar * 1e5;
    if (P >= f.Pc) return NaN;
    let lo = 150, hi = f.Tc - 1e-4;
    for (let i = 0; i < 60; i++) { const m = 0.5 * (lo + hi); if (psat(f, m) > P) hi = m; else lo = m; }
    return 0.5 * (lo + hi) - TK;
  }
  function satL(f, T) { return f.tab ? tab.sat(f, T, 'l') : props(f, T, psat(f, T), 'l'); }
  function satV(f, T) { return f.tab ? tab.sat(f, T, 'v') : props(f, T, psat(f, T), 'v'); }

  // ---------- Tabulated backend (CoolProp tables from data/gen_props.py) ----------
  // When tables are loaded, these replace psat/Tsat/satL/satV/props for that fluid.
  const tab = {
    psat(f, T) { const s = f.tab.sat; return interp(s.T, s.p, T - TK) * 1e5; },
    Tsat(f, Pbar) { const s = f.tab.sat; return Pbar * 1e5 >= f.Pc ? NaN : interp(s.p, s.T, Pbar); },
    sat(f, T, ph) { const s = f.tab.sat, t = T - TK; return ph === 'l' ? { h: interp(s.T, s.hl, t), s: interp(s.T, s.sl, t), v: interp(s.T, s.vl, t) } : { h: interp(s.T, s.hv, t), s: interp(s.T, s.sv, t), v: NaN }; },
    // Liquid at (T, P): interpolate between the two bracketing isobars at the same
    // reduced temperature u = (T - T0) / (tsat(P) - T0), so both end at saturation.
    liq(f, T, Pbar) {
      const L = f.tab.liq, t = T - TK;
      let i = 0; while (i < L.length - 2 && L[i + 1].p < Pbar) i++;
      const a = L[i], b = L[i + 1] || a, T0 = a.T[0];
      const ts = Math.min(tab.Tsat(f, Pbar), f.tab.tc - 0.3), u = (t - T0) / (ts - T0);
      const at = iso => { const Ti = T0 + u * (iso.tsat - T0); return [interp(iso.T, iso.h, Ti), interp(iso.T, iso.s, Ti)]; };
      const [ha, sa] = at(a), [hb, sb] = at(b), w = b.p > a.p ? (Pbar - a.p) / (b.p - a.p) : 0;
      return { h: ha + w * (hb - ha), s: sa + w * (sb - sa), v: NaN };
    },
    vap(f, T) { const V = f.tab.vap, t = T - TK; return { h: interp(V.T, V.h, t), s: interp(V.T, V.s, t), v: NaN }; },
  };
  let MODEL = 'Peng–Robinson EOS (prototype)';
  function useTables(fl, htf) {
    if (fl && fl.fluids) {
      for (const n in fl.fluids) {
        const t = fl.fluids[n], f = FLUIDS[n]; if (!f) continue;
        f.tab = t; f.tc = t.tc; f.pc = t.pc; f.pmax = Math.min(f.pmax, t.pmax); f._k = false; mk(n);
      }
      MODEL = 'CoolProp ' + (fl.version || '') + ' (HEOS)';
    }
    if (htf) for (const k in htf) if (HTF[k]) { HTF[k].T = htf[k].T; HTF[k].cp = htf[k].cp; buildHTF(k); }
    satCache.clear(); wfCache.clear();
  }

  // ---------- Heat transfer fluids: cp tables (kJ/kgK) vs degC ----------
  const HTF = {
    water: { label: 'Thermal water (10 bar)', T: [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260], cp: [4.217, 4.182, 4.179, 4.185, 4.197, 4.216, 4.245, 4.285, 4.339, 4.408, 4.497, 4.61, 4.77, 4.98] },
    air: { label: 'Hot air (1 bar)', T: [0, 50, 100, 150, 200, 250, 300], cp: [1.004, 1.006, 1.009, 1.015, 1.023, 1.033, 1.044] },
    vp1: { label: 'Therminol VP-1 (1 bar)', T: [0, 50, 100, 150, 200, 250, 300], cp: [1.52, 1.68, 1.84, 1.99, 2.14, 2.28, 2.42] },
  };
  for (const k in HTF) buildHTF(k);
  function buildHTF(k) { // build fine h, s tables 0..260 C at 0.1 K
    const t = HTF[k], N = 2601; t.tt = new Float64Array(N); t.hh = new Float64Array(N); t.ss = new Float64Array(N);
    const cpAt = x => interp(t.T, t.cp, x);
    for (let i = 0; i < N; i++) {
      const T = i * 0.1; t.tt[i] = T;
      if (i === 0) { t.hh[i] = 0; t.ss[i] = 0; continue; }
      const c = 0.5 * (cpAt(T) + cpAt(T - 0.1));
      t.hh[i] = t.hh[i - 1] + c * 0.1; t.ss[i] = t.ss[i - 1] + c * Math.log((T + TK) / (T - 0.1 + TK));
    }
    t.cpAt = cpAt;
  }
  function interp(xs, ys, x) {
    if (x <= xs[0]) return ys[0] + (ys[1] - ys[0]) * (x - xs[0]) / (xs[1] - xs[0]);
    const n = xs.length;
    if (x >= xs[n - 1]) return ys[n - 1] + (ys[n - 1] - ys[n - 2]) * (x - xs[n - 1]) / (xs[n - 1] - xs[n - 2]);
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] > x) hi = m; else lo = m; }
    return ys[lo] + (ys[hi] - ys[lo]) * (x - xs[lo]) / (xs[hi] - xs[lo]);
  }
  const hsH = (k, T) => interp(HTF[k].tt, HTF[k].hh, T);
  const hsS = (k, T) => interp(HTF[k].tt, HTF[k].ss, T);
  const hsT = (k, h) => interp(HTF[k].hh, HTF[k].tt, h);

  // ---------- Simple ORC ----------
  const DEF = { Tcond: 20, T0: 7, dtpp: 10, etaT: 0.9, etaP: 0.8, mhs: 2, htf: 'water', N: 60 };

  // working-fluid side, independent of heat source
  const wfCache = new Map();
  function wfSide(name, pevp, o) {
    o = Object.assign({}, DEF, o);
    const key = [name, pevp.toFixed(4), o.Tcond, o.etaT, o.etaP, o.N].join('|');
    if (wfCache.has(key)) return wfCache.get(key);
    const f = mk(name);
    const T1 = o.Tcond + TK, P1 = psat(f, T1), P = pevp * 1e5;
    const tevp = Tsat(f, pevp), T3 = tevp + TK;
    if (!(tevp > o.Tcond + 1)) return null;
    const s1p = satL(f, T1); const h1 = s1p.h, s1 = s1p.s, v1 = s1p.v;
    const h2 = h1 + v1 * (P - P1) / 1000 / o.etaP; // kJ/kg
    // T2 from h on liquid isobar
    let lo = T1 - 5, hi = T1 + 10;
    for (let i = 0; i < 50; i++) { const m = 0.5 * (lo + hi); if (props(f, m, P, 'l').h > h2) hi = m; else lo = m; }
    const T2 = 0.5 * (lo + hi), s2 = props(f, T2, P, 'l').s;
    const L3 = satL(f, T3), V4 = satV(f, T3);
    // preheater curve T-h from T2 to T3
    const pre = [];
    for (let i = 0; i <= o.N; i++) { const T = T2 + (T3 - T2) * i / o.N; const pp = i === o.N ? L3 : props(f, T, P, 'l'); pre.push([T - TK, pp.h, pp.s]); }
    // turbine
    const Pc = P1, L1 = s1p, V1 = satV(f, T1);
    let h5is, x5 = 1;
    if (V4.s >= V1.s) {
      let a = T1, b = T3 + 60;
      for (let i = 0; i < 60; i++) { const m = 0.5 * (a + b); if (props(f, m, Pc, 'v').s > V4.s) b = m; else a = m; }
      h5is = props(f, 0.5 * (a + b), Pc, 'v').h;
    } else { x5 = (V4.s - L1.s) / (V1.s - L1.s); h5is = L1.h + x5 * (V1.h - L1.h); }
    const h5 = V4.h - o.etaT * (V4.h - h5is);
    let T5, s5, x5a = 1;
    if (h5 >= V1.h) {
      let a = T1, b = T3 + 60;
      for (let i = 0; i < 60; i++) { const m = 0.5 * (a + b); if (props(f, m, Pc, 'v').h > h5) b = m; else a = m; }
      T5 = 0.5 * (a + b); s5 = props(f, T5, Pc, 'v').s;
    } else { x5a = (h5 - L1.h) / (V1.h - L1.h); T5 = T1; s5 = L1.s + x5a * (V1.s - L1.s); }
    // mean cp in preheater per Eq. 16 with t_pre,in = t_cond (paper assumption)
    const hLc = props(f, T1, P, 'l').h;
    const cpPre = (L3.h - hLc) / (T3 - T1);
    const r = {
      fluid: name, pevp, tevp, tcond: o.Tcond, P1bar: P1 / 1e5,
      st: { 1: { T: o.Tcond, h: h1, s: s1 }, 2: { T: T2 - TK, h: h2, s: s2 }, 3: { T: tevp, h: L3.h, s: L3.s }, 4: { T: tevp, h: V4.h, s: V4.s }, 5: { T: T5 - TK, h: h5, s: s5 } },
      hevp: V4.h - L3.h, cpPre, pre, wnet: (V4.h - h5) - (h2 - h1), wt: V4.h - h5, wp: h2 - h1, x5is: x5, x5: x5a,
    };
    wfCache.set(key, r); return r;
  }

  function ohst(name, pevp, o) { // Eq. 15
    o = Object.assign({}, DEF, o);
    const w = wfSide(name, pevp, o); if (!w) return NaN;
    return w.hevp / w.cpPre + w.tevp + o.dtpp;
  }
  function predictPinch(oh, ths, band = 0.2) { // Eq. 20-22
    if (Math.abs(oh - ths) < band) return 'pre-parallel';
    return oh > ths ? 'evap-inlet' : 'pre-inlet';
  }

  function solveSimple(name, pevp, ths, o) {
    o = Object.assign({}, DEF, o);
    const w = wfSide(name, pevp, o);
    if (!w) return { feasible: false, reason: 'Evaporation pressure is below the condensation pressure.' };
    const k = o.htf, T0 = o.T0, h0 = hsH(k, T0), s0 = hsS(k, T0);
    if (ths <= w.tevp + o.dtpp) return { feasible: false, reason: `Heat source (${ths.toFixed(1)} °C) must exceed T_evp + Δt_pp = ${(w.tevp + o.dtpp).toFixed(1)} °C.`, w };
    const h6 = hsH(k, ths), h2 = w.st[2].h, h4 = w.st[4].h;
    // wf points ordered from cold end (state 2) to hot end (state 4)
    const pts = w.pre.map(p => [p[0], p[1]]); pts.push([w.tevp, h4]);
    const minDT = r => { let m = 1e9, idx = 0; for (let i = 0; i < pts.length; i++) { const Tw = hsT(k, h6 - r * (h4 - pts[i][1])); const d = Tw - pts[i][0]; if (d < m) { m = d; idx = i; } } return [m, idx]; };
    let lo = 0, hi = (h6 - hsH(k, w.st[2].T)) / (h4 - h2);
    for (let i = 0; i < 60; i++) { const m = 0.5 * (lo + hi); if (minDT(m)[0] > o.dtpp) lo = m; else hi = m; }
    const r = lo;
    const dtCold = hsT(k, h6 - r * (h4 - h2)) - w.st[2].T, dtEvIn = hsT(k, h6 - r * (h4 - w.st[3].h)) - w.tevp;
    const [, pIdx] = minDT(r);
    const nPre = pts.length - 2; // index of state 3 (evaporator inlet)
    let pinchAt;
    if (Math.abs(dtCold - dtEvIn) < 0.3) pinchAt = 'pre-parallel';
    else if (pIdx >= nPre) pinchAt = 'evap-inlet';
    else if (pIdx === 0) pinchAt = 'pre-inlet';
    else pinchAt = 'pre-interior';
    const pinchPt = pts[Math.min(pIdx, nPre)];
    const h7 = h6 - r * (h4 - w.st[3].h), h8 = h6 - r * (h4 - h2);
    const T7 = hsT(k, h7), T8 = hsT(k, h8);
    const Qhe = r * (h4 - h2);
    const etaTh = w.wnet / (h4 - h2), etaHE = Qhe / (h6 - h0), etaSys = r * w.wnet / (h6 - h0);
    const ex = (h, s) => h - h0 - (T0 + TK) * (s - s0);
    const e6 = ex(h6, hsS(k, ths)), e8 = ex(h8, hsS(k, T8));
    const ewf = (h4 - h2) - (T0 + TK) * (w.st[4].s - w.st[2].s);
    const exIn = r * ewf;
    const etaExHE = exIn / e6;
    // T-Q profile (Q normalised to heat available down to T0)
    const Qmax = h6 - h0;
    const q8 = h8 - h0;
    const TQwf = pts.map(p => [100 * (q8 + r * (p[1] - h2)) / Qmax, p[0]]);
    TQwf.splice(TQwf.length - 1, 0, [100 * (q8 + r * (w.st[3].h - h2)) / Qmax, w.tevp]);
    const TQhs = []; for (let i = 0; i <= 40; i++) { const T = T0 + (ths - T0) * i / 40; TQhs.push([100 * (hsH(k, T) - h0) / Qmax, T]); }
    return {
      feasible: true, w, ths, r, mwf: r * o.mhs, pinchAt, pinchT: pinchPt[0], pinchQ: 100 * ((h8 - h0) + r * (pinchPt[1] - h2)) / (h6 - h0), dtCold, dtEvIn, T7, T8, h6, h7, h8,
      etaTh, etaHE, etaSys, etaExHE, P: r * o.mhs * w.wnet, Qhe: Qhe * o.mhs,
      ex: { in: e6 * o.mhs, wf: exIn * o.mhs, loss: e8 * o.mhs, destr: (e6 - e8 - exIn) * o.mhs },
      TQ: { wf: TQwf, hs: TQhs, Q8: 100 * (h8 - h0) / Qmax, Q7: 100 * (h7 - h0) / Qmax },
      ohst: w.hevp / w.cpPre + w.tevp + o.dtpp,
    };
  }

  // ---------- optimisation ----------
  function golden(fn, a, b, tol = 1e-3, maxIt = 60) { // maximise
    const a0 = a, b0 = b;
    const g = (Math.sqrt(5) - 1) / 2;
    let c = b - g * (b - a), d = a + g * (b - a), fc = fn(c), fd = fn(d);
    for (let i = 0; i < maxIt && Math.abs(b - a) > tol; i++) {
      if (fc > fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = fn(c); }
      else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = fn(d); }
    }
    const x = 0.5 * (a + b), fx = fn(x);
    const fa = fn(a0), fb = fn(b0);
    if (fb >= fx && fb >= fa) return { x: b0, fx: fb };
    if (fa > fx) return { x: a0, fx: fa };
    return { x, fx };
  }
  function pRange(name, ths, o) {
    o = Object.assign({}, DEF, o);
    const f = mk(name);
    const plo = Math.max(psat(f, o.Tcond + 15 + TK) / 1e5, 0.5);
    let phi = Math.min(f.pmax, 0.985 * f.pc);
    if (ths != null) { const Tlim = ths - o.dtpp - 0.3; if (Tlim + TK < f.Tc) phi = Math.min(phi, psat(f, Tlim + TK) / 1e5); }
    return [plo, phi];
  }
  function optimizeSimple(name, ths, o) {
    const [a, b] = pRange(name, ths, o);
    if (!(b > a)) return null;
    const fn = p => { const s = solveSimple(name, p, ths, o); return s.feasible ? s.etaSys : -1; };
    const g = golden(fn, a, b, 1e-3);
    return { pOEP: g.x, sol: solveSimple(name, g.x, ths, o), atBound: Math.abs(g.x - b) < 0.02 };
  }
  function ohstFromSim(name, pevp, o) { // argmax of exergetic efficiency in HE over ths
    o = Object.assign({}, DEF, o);
    const w = wfSide(name, pevp, o); if (!w) return NaN;
    const fn = t => { const s = solveSimple(name, pevp, t, o); return s.feasible ? s.etaExHE : -1; };
    return golden(fn, w.tevp + o.dtpp + 0.5, Math.min(w.tevp + o.dtpp + 160, 255), 0.02).x;
  }

  // ---------- Dual-fluid ORC (Fig. 13): HT evaporator first, split to LT ORC and HT preheater ----------
  function solveDual(ht, lt, pHT, pLT, ths, o) {
    o = Object.assign({}, DEF, o);
    const k = o.htf, T0 = o.T0, h0 = hsH(k, T0), s0 = hsS(k, T0), TK0 = T0 + TK;
    const wH = wfSide(ht, pHT, o); if (!wH) return { feasible: false, reason: 'HT pressure too low' };
    const T2 = wH.tevp + o.dtpp; // water after HT evaporator (pinch at HT evaporator inlet)
    if (ths <= T2) return { feasible: false, reason: 'HT evaporation temperature too high for the heat source' };
    const h1 = hsH(k, ths), h2 = hsH(k, T2);
    const mHT = o.mhs * (h1 - h2) / wH.hevp; // Eq. 11 analogue
    // HT preheater duty and feasibility as function of water fraction y = m6/mhs
    const QpreHT = mHT * (wH.st[3].h - wH.st[2].h);
    const preOK = y => { // check pinch in HT preheater with water y*mhs from T2 downward
      const m = y * o.mhs; let mn = 1e9;
      for (const p of wH.pre) { const Tw = hsT(k, h2 - mHT * (wH.st[3].h - p[1]) / m); mn = Math.min(mn, Tw - p[0]); }
      return mn;
    };
    let lo = 1e-4, hi = 1; // find minimal y with pinch >= dtpp
    if (preOK(1) < o.dtpp) return { feasible: false, reason: 'HT preheater cannot be fed even with all the water' };
    for (let i = 0; i < 60; i++) { const m = 0.5 * (lo + hi); if (preOK(m) >= o.dtpp) hi = m; else lo = m; }
    const yMin = hi;
    const y = o.split != null ? Math.max(o.split, yMin) : yMin; // fraction to HT preheater
    const x = 1 - y; // fraction to LT ORC
    const h7 = h2 - mHT * (wH.st[3].h - wH.st[2].h) / (y * o.mhs), T7 = hsT(k, h7);
    const L = solveSimple(lt, pLT, T2, Object.assign({}, o, { mhs: x * o.mhs }));
    if (!L.feasible) return { feasible: false, reason: 'LT ORC: ' + L.reason };
    const PHT = mHT * wH.wnet, PLT = L.P;
    const h5 = L.h8, h8 = (x * h5 + y * h7);
    const T8 = hsT(k, h8);
    const ex = (h, T) => h - h0 - TK0 * (hsS(k, T) - s0);
    const exw = wf => (wf.st[4].h - wf.st[2].h) - TK0 * (wf.st[4].s - wf.st[2].s);
    const e1 = ex(h1, ths);
    const etaSys = (PHT + PLT) / (o.mhs * (h1 - h0));
    const etaExHE = (mHT * exw(wH) + L.mwf * exw(L.w)) / (o.mhs * e1);
    // Per-loop T-Q profiles in kW, measured from each loop's cold end.
    // HT loop: water branch y through the HT preheater (T7 -> T2), then the full stream through the HT evaporator (T2 -> T1).
    const QpreH = mHT * (wH.st[3].h - wH.st[2].h), QevH = mHT * wH.hevp;
    const htWf = wH.pre.map(p => [mHT * (p[1] - wH.st[2].h), p[0]]).concat([[QpreH + QevH, wH.tevp]]);
    const htHs = [];
    for (let i = 0; i <= 20; i++) { const h = h7 + (h2 - h7) * i / 20; htHs.push([y * o.mhs * (h - h7), hsT(k, h)]); }
    for (let i = 1; i <= 10; i++) { const h = h2 + (h1 - h2) * i / 10; htHs.push([QpreH + o.mhs * (h - h2), hsT(k, h)]); }
    // LT loop: branch x from T2 down to the LT outlet
    const Qb = x * o.mhs * (L.h6 - h0);
    const ltWf = L.TQ.wf.map(p => [p[0] / 100 * Qb, p[1]]);
    const ltHs = L.TQ.hs.map(p => [p[0] / 100 * Qb, p[1]]);
    const Q0 = x * o.mhs * (L.h8 - h0); // heat the LT branch leaves in the water
    return {
      feasible: true, ht, lt, pHT, pLT, ths, T2, T7, T8, y, x, yMin, mHT, mLT: L.mwf, PHT, PLT, etaSys, etaExHE,
      wH, L, TQ: { ht: { wf: htWf, hs: htHs }, lt: { wf: ltWf, hs: ltHs, Q0 } },
    };
  }
  function optimizeDual(ht, lt, ths, o) {
    o = Object.assign({}, DEF, o);
    const [la, lb] = pRange(lt, null, o);
    // Step 0: LT at its maximum allowable pressure (fluid-II behaviour), Step 1: pick pHT so that T2 = OHST_LT
    const pLT = lb;
    const target = ohst(lt, pLT, o);
    const f = mk(ht);
    const TevpHT = target - o.dtpp;
    const pHT0 = psat(f, TevpHT + TK) / 1e5;
    // Step 2: refine pHT by maximising efficiency around that point
    const fn = p => { const s = solveDual(ht, lt, p, pLT, ths, o); return s.feasible ? s.etaSys : -1; };
    const [ha, hb] = pRange(ht, ths, o);
    const g = golden(fn, Math.max(ha, pHT0 * 0.7), Math.min(hb, pHT0 * 1.3), 1e-3);
    return { pHT0, pHT: g.x, pLT, ohstLT: target, sol: solveDual(ht, lt, g.x, pLT, ths, o) };
  }

  // saturation dome for T-s plots
  function dome(name, n = 60) {
    const f = mk(name), lo = -30 + TK, hi = f.Tc - 0.3;
    const L = [], V = [];
    for (let i = 0; i <= n; i++) { const T = lo + (hi - lo) * Math.pow(i / n, 0.7); const l = satL(f, T), v = satV(f, T); L.push([l.s, T - TK]); V.push([v.s, T - TK]); }
    return { L, V: V.reverse() };
  }
  // liquid cp on an isobar (Fig. 5)
  function cpLiquid(name, pbar, T) { const f = mk(name), P = pbar * 1e5, TT = T + TK; return (props(f, TT + 0.05, P, 'l').h - props(f, TT - 0.05, P, 'l').h) / 0.1; }
  // isobar path for T-s (liquid from T to Tsat)
  function isobarL(name, pbar, Ta, Tb, n = 20) { const f = mk(name), P = pbar * 1e5; const o = []; for (let i = 0; i <= n; i++) { const T = Ta + (Tb - Ta) * i / n; o.push([props(f, T + TK, P, 'l').s, T]); } return o; }
  function isobarV(name, pbar, Ta, Tb, n = 20) { const f = mk(name), P = pbar * 1e5; const o = []; for (let i = 0; i <= n; i++) { const T = Ta + (Tb - Ta) * i / n; o.push([props(f, T + TK, P, 'v').s, T]); } return o; }

  const api = { FLUIDS, HTF, DEF, mk, useTables, get MODEL() { return MODEL; }, psat: (n, T) => psat(mk(n), T + TK) / 1e5, Tsat: (n, p) => Tsat(mk(n), p), wfSide, ohst, predictPinch, solveSimple, optimizeSimple, ohstFromSim, solveDual, optimizeDual, golden, pRange, dome, cpLiquid, isobarL, isobarV, hsH, hsS, hsT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ORC = api;
})(typeof window !== 'undefined' ? window : globalThis);
