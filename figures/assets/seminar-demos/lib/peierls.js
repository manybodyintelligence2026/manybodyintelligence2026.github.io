// peierls.js: exact formulas for the 1D Peierls toy model (t = 1, lattice spacing 1, K = 1).
//   band:     E(k) = -2t cos k (deck notation; minus mu where it matters),   filling n (electrons per site, spin included) => k_F = n pi / 2
//   phonons:  w0^2(q) = 2K (1 - cos q)
//   Lindhard: chi0(q) = (2/N) sum_k [f(eps_k) - f(eps_{k+q})] / (eps_{k+q} - eps_k)   (spin factor 2)
//   dressed:  w^2(q) = w0^2(q) [1 - g^2 s(q)], s = the singular (Kohn) part of chi0(q)/chi0(0) (6 Nov; see chiCurve)
// Checked against a Python evaluation: at half filling chi0(pi)/chi0(0) = 4.5, 5.4, 6.1 for T = 0.05, 0.02, 0.01.
(function (G) {
  'use strict';
  const TWO_PI = 2 * Math.PI;

  const eps = k => -2 * Math.cos(k);
  const kF = n => n * Math.PI / 2;
  const mu = n => -2 * Math.cos(kF(n));
  const w0sq = q => 2 * (1 - Math.cos(q));

  function chi0(q, n, T, Nk) {
    Nk = Nk || 2400;
    const m = mu(n);
    const f = e => { const x = (e - m) / T; return x > 40 ? 0 : x < -40 ? 1 : 1 / (Math.exp(x) + 1); };
    let s = 0;
    for (let i = 0; i < Nk; i++) {
      const k = -Math.PI + TWO_PI * (i + 0.5) / Nk, e1 = eps(k), e2 = eps(k + q), d = e2 - e1;
      if (Math.abs(d) < 1e-7) { const fe = f(e1); s += fe * (1 - fe) / T; }
      else s += (f(e1) - f(e2)) / d;
    }
    return 2 * s / Nk;
  }

  // chi0 on a q grid over [0, 2pi], normalised by chi0(0); cached per (n, T).
  const cache = new Map();
  function chiCurve(n, T, nq) {
    nq = nq || 361;
    const key = n.toFixed(3) + '|' + T + '|' + nq;
    if (cache.has(key)) return cache.get(key);
    const q = new Float64Array(nq), c = new Float64Array(nq), c0 = chi0(1e-5, n, T);
    for (let i = 0; i < nq; i++) { q[i] = TWO_PI * i / (nq - 1); c[i] = chi0(Math.max(q[i], 1e-5), n, T) / c0; }
    // (6 Nov) the singular part s(q): chi0/chi0(0) minus the chord across a window around each nesting vector
    // (2k_F and 2pi - 2k_F), clipped at 0 and tapered by a cos^2 window: the log peak alone, zero outside, smooth at the window ends.
    // The dressed phonon uses s, so only the Kohn cusp moves; chi0 itself (c) is kept for its own plot.
    const s = new Float64Array(nq), qa = Math.min(n * Math.PI, TWO_PI - n * Math.PI);
    for (const qn of [qa, TWO_PI - qa]) {
      const w = Math.min(0.6, 0.8 * Math.min(qn, TWO_PI - qn)), a = qn - w, b = qn + w;
      const at = x => { const t = x / TWO_PI * (nq - 1), i = Math.min(nq - 2, Math.floor(t)); return c[i] + (t - i) * (c[i + 1] - c[i]); };
      const ca = at(a), cb = at(b);
      for (let i = 0; i < nq; i++) if (q[i] > a && q[i] < b) {
        const win = Math.cos(Math.PI * (q[i] - qn) / (2 * w)) ** 2;     // smooth window: no corner at the ends
        s[i] = Math.max(s[i], win * Math.max(0, c[i] - (ca + (cb - ca) * (q[i] - a) / (b - a))));
      }
    }
    const out = { q, c, c0, s };
    if (cache.size > 60) cache.clear();
    cache.set(key, out);
    return out;
  }

  // The critical coupling: smallest lambda at which w^2 touches zero somewhere (max of chi/chi0 over q).
  function lambdaC(n, T) {
    const { s } = chiCurve(n, T);
    return 1 / Math.max(...s);
  }

  G.Peierls = { eps, kF, mu, w0sq, chi0, chiCurve, lambdaC };
})(window);
