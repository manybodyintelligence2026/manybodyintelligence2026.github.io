// corr.js: the two-point correlation of the translational order parameter, for the order slides (01, 02).
// Each particle p gets the local density-wave amplitude of its neighbourhood (radius rc), for each of the three
// shortest reciprocal vectors G of the lattice: psi_G(p) = mean over neighbours q of exp(i G.r_q). Its phase says
// where the local crystal sits. C(r) = Re < psi_G(p)* psi_G(q) > over pairs at distance r, divided by < |psi_G|^2 >:
// in a liquid the local amplitudes are unrelated beyond a few spacings and C falls to 0; in a crystal (or a
// supersolid) every neighbourhood has the same phase and C stays flat out to the box size (long-range order).
//   const c = Corr.compute({ x, y, idx, Lx, Ly, G, rc, rmax, bins })      Float64Array, NaN for an empty bin
//   const card = new Corr.Card(canvas, { width, height, rmax, bins });  card.layout(k); card.push(c); card.draw();
(function (G) {
  'use strict';

  function compute(o) {
    const { x, y, Lx, Ly, G: Gs, rc, rmax, bins } = o, idx = o.idx || Array.from({ length: x.length }, (_, i) => i);
    const n = idx.length, X = new Float64Array(n), Y = new Float64Array(n);
    for (let p = 0; p < n; p++) { X[p] = x[idx[p]]; Y[p] = y[idx[p]]; }
    const nG = Gs.length, cr = new Float64Array(n * nG), ci = new Float64Array(n * nG);
    for (let p = 0; p < n; p++) for (let g = 0; g < nG; g++) {
      const a = Gs[g][0] * X[p] + Gs[g][1] * Y[p];
      cr[p * nG + g] = Math.cos(a); ci[p * nG + g] = Math.sin(a);
    }
    // local amplitudes (minimum image); keep the pair distances for the second pass
    const re = new Float64Array(n * nG), im = new Float64Array(n * nG), cnt = new Float64Array(n);
    const rc2 = rc * rc, sum = new Float64Array(bins), num = new Float64Array(bins);
    const dist = new Float32Array(n * n);
    for (let p = 0; p < n; p++) for (let q = p; q < n; q++) {
      let dx = X[p] - X[q], dy = Y[p] - Y[q];
      dx -= Lx * Math.round(dx / Lx); dy -= Ly * Math.round(dy / Ly);
      const r2 = dx * dx + dy * dy;
      dist[p * n + q] = Math.sqrt(r2);
      if (r2 < rc2) {
        for (let g = 0; g < nG; g++) {
          re[p * nG + g] += cr[q * nG + g]; im[p * nG + g] += ci[q * nG + g];
          if (q !== p) { re[q * nG + g] += cr[p * nG + g]; im[q * nG + g] += ci[p * nG + g]; }
        }
        cnt[p]++; if (q !== p) cnt[q]++;
      }
    }
    let norm = 0;
    for (let p = 0; p < n; p++) for (let g = 0; g < nG; g++) {
      re[p * nG + g] /= cnt[p]; im[p * nG + g] /= cnt[p];
      norm += re[p * nG + g] ** 2 + im[p * nG + g] ** 2;
    }
    norm /= n * nG;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      const r = dist[p * n + q];
      if (r >= rmax) continue;
      let s = 0;
      for (let g = 0; g < nG; g++) s += re[p * nG + g] * re[q * nG + g] + im[p * nG + g] * im[q * nG + g];
      const b = Math.floor(r / rmax * bins);
      sum[b] += s / nG; num[b]++;
    }
    const out = new Float64Array(bins);
    for (let b = 0; b < bins; b++) out[b] = num[b] > 3 ? sum[b] / num[b] / norm : NaN;
    return out;
  }

  // the card's plot: C against distance, smoothed in time; axes "distance" and "correlation", 0 and 1 marked
  function Card(canvas, opt) {
    this.o = Object.assign({ width: 520, height: 250, rmax: 1, bins: 20, tau: 0.5 }, opt);
    this.ax = new G.Axes(canvas, { width: this.o.width, height: this.o.height, pad: [62, 14, 16, 58], font: 22,
      xlim: [0, this.o.rmax], ylim: [-0.15, 1.1], xticks: [], yticks: [[0, '0'], [1, '1']],
      xlabel: 'distance', ylabel: 'correlation' });
    this.c = null;
  }
  Card.prototype.layout = function (k) { this.ax.layout(k); this.draw(); };
  // blend a new measurement in; dt (s) since the last one sets the weight (time constant tau)
  Card.prototype.push = function (c, dt) {
    if (!this.c) { this.c = Float64Array.from(c); return; }
    const w = 1 - Math.exp(-(dt || 0.1) / this.o.tau);
    for (let b = 0; b < c.length; b++) {
      if (isNaN(c[b])) { this.c[b] = NaN; continue; }                         // no pairs at that distance now
      this.c[b] = isNaN(this.c[b]) ? c[b] : this.c[b] + w * (c[b] - this.c[b]);
    }
  };
  Card.prototype.draw = function () {
    const ax = this.ax, { rmax, bins } = this.o;
    ax.clear();
    ax.hline(0, { color: '#5E5858', width: 2 });
    if (this.c) {
      const xs = [], ys = [];
      for (let b = 0; b < bins; b++) if (!isNaN(this.c[b])) { xs.push((b + 0.5) / bins * rmax); ys.push(Math.max(-0.15, Math.min(1.1, this.c[b]))); }
      ax.clip(true); ax.line([xs, ys], { width: 4 }); ax.clip(false);
    }
    ax.frame();
  };

  G.Corr = { compute, Card };
})(window);
