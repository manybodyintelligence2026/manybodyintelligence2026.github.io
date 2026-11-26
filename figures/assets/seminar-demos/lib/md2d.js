// md2d.js: 2D Langevin molecular dynamics of soft repulsive discs, U(r) = eps (sigma/r)^12.
// Lengths are in units of the triangular lattice constant a; the periodic box is nx * ny rows,
// commensurate with a perfect triangular crystal of N = nx*ny particles, so slow cooling can
// produce a single crystal. Energies in eps, k_B = m = 1.
// Rendering is kept elsewhere: this module only owns positions, and later "quantum" slides can
// reuse the same particles (e.g. as wavepackets of width lambda_dB(T)).
(function (G) {
  'use strict';

  const HALF_SHELL = [[0, 0], [1, 0], [1, 1], [0, 1], [-1, 1]];

  function MD2D(opt) {
    const o = Object.assign({ nx: 25, ny: 16, sigma: 0.85, eps: 1, rc: 1.8, gamma: 0.6, dt: 0.005, T: 2.0, seed: 3 }, opt);
    Object.assign(this, o);
    this.h = 0; this.ph = [0, 0, 0];                    // the nudge (off), see forces()
    this.Lx = o.nx;
    this.Ly = o.ny * Math.sqrt(3) / 2;
    this.N = o.nx * o.ny;
    const N = this.N;
    this.x = new Float64Array(N); this.y = new Float64Array(N);
    this.vx = new Float64Array(N); this.vy = new Float64Array(N);
    this.fx = new Float64Array(N); this.fy = new Float64Array(N);
    this.psiRe = new Float64Array(N); this.psiIm = new Float64Array(N); this.psiAbs = new Float64Array(N);
    this.ncx = Math.max(3, Math.floor(this.Lx / o.rc));
    this.ncy = Math.max(3, Math.floor(this.Ly / o.rc));
    this.head = new Int32Array(this.ncx * this.ncy);
    this.next = new Int32Array(N);
    this.rand = (G.Stipple ? G.Stipple.rng : null)(o.seed);
    this._g = null;
    this.reset(o.T);
  }

  MD2D.prototype.gauss = function () {
    if (this._g !== null) { const g = this._g; this._g = null; return g; }
    let u = 0, v = 0;
    while (u === 0) u = this.rand();
    v = this.rand();
    const r = Math.sqrt(-2 * Math.log(u));
    this._g = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };

  // Start from the lattice, then melt it at temperature T before anyone sees it.
  MD2D.prototype.reset = function (T, warmSteps) {
    const { nx, ny } = this, h = Math.sqrt(3) / 2;
    for (let j = 0, i = 0; j < ny; j++) for (let k = 0; k < nx; k++, i++) {
      this.x[i] = k + 0.5 * (j % 2) + 0.25;
      this.y[i] = (j + 0.5) * h;
    }
    this.T = T;
    const s = Math.sqrt(T);
    for (let i = 0; i < this.N; i++) { this.vx[i] = s * this.gauss(); this.vy[i] = s * this.gauss(); }
    this.forces();
    this.step(warmSteps === undefined ? 4000 : warmSteps);
  };

  MD2D.prototype.buildCells = function () {
    const { N, x, y, ncx, ncy, head, next } = this;
    const cwx = this.Lx / ncx, cwy = this.Ly / ncy;
    head.fill(-1);
    for (let i = 0; i < N; i++) {
      const cx = Math.min(ncx - 1, Math.floor(x[i] / cwx)), cy = Math.min(ncy - 1, Math.floor(y[i] / cwy));
      const c = cx + cy * ncx;
      next[i] = head[c]; head[c] = i;
    }
  };

  // Visit every pair closer than rmax once (half-shell cell list, minimum image).
  MD2D.prototype.pairs = function (rmax, fn) {
    const { x, y, ncx, ncy, head, next, Lx, Ly } = this;
    const r2max = rmax * rmax, hx = Lx / 2, hy = Ly / 2;
    for (let cy = 0; cy < ncy; cy++) for (let cx = 0; cx < ncx; cx++) {
      const c = cx + cy * ncx;
      for (const [ox, oy] of HALF_SHELL) {
        const c2 = ((cx + ox + ncx) % ncx) + ((cy + oy + ncy) % ncy) * ncx;
        for (let i = head[c]; i >= 0; i = next[i]) {
          for (let j = c2 === c ? next[i] : head[c2]; j >= 0; j = next[j]) {
            let dx = x[i] - x[j], dy = y[i] - y[j];
            if (dx > hx) dx -= Lx; else if (dx < -hx) dx += Lx;
            if (dy > hy) dy -= Ly; else if (dy < -hy) dy += Ly;
            const r2 = dx * dx + dy * dy;
            if (r2 < r2max) fn(i, j, dx, dy, r2);
          }
        }
      }
    }
  };

  MD2D.prototype.forces = function () {
    const { fx, fy } = this, s2 = this.sigma * this.sigma, e12 = 12 * this.eps;
    fx.fill(0); fy.fill(0);
    this.buildCells();
    this.pairs(this.rc, (i, j, dx, dy, r2) => {
      if (r2 < 0.16) r2 = 0.16;                       // guard against a pathological overlap
      const sr2 = s2 / r2, sr6 = sr2 * sr2 * sr2, f = e12 * sr6 * sr6 / r2;
      fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
    });
    // optional nudge: a weak field conjugate to the crystal's density wave, V = -h sum_j sum_G cos(G.r_j - phi_G),
    // aligned with the phases phi_G the particles already have (see order()), so it only speeds the growth of
    // the crystal that is forming
    if (this.h) {
      const { N, x, y } = this, Gs = MD2D.G, ph = this.ph;
      for (let i = 0; i < N; i++) for (let g = 0; g < 3; g++) {
        const s = this.h * Math.sin(Gs[g][0] * x[i] + Gs[g][1] * y[i] - ph[g]);
        fx[i] -= Gs[g][0] * s; fy[i] -= Gs[g][1] * s;
      }
    }
  };

  // The three shortest reciprocal vectors of the box's triangular lattice (rows along x, lattice constant 1).
  MD2D.G = [[2 * Math.PI, -2 * Math.PI / Math.sqrt(3)], [0, 4 * Math.PI / Math.sqrt(3)], [2 * Math.PI, 2 * Math.PI / Math.sqrt(3)]];
  // Global translational order |rho_G| = |sum_j exp(i G.r_j)| / N, averaged over the three G (0 in a liquid, up to
  // the Debye-Waller factor in a single crystal). Also stores the phases phi_G for the nudge, made consistent
  // (G_2 = G_3 - G_1) so the field's maxima form one lattice.
  MD2D.prototype.order = function () {
    const { N, x, y } = this, Gs = MD2D.G, ph = [0, 0, 0];
    let m = 0;
    for (let g = 0; g < 3; g++) {
      let re = 0, im = 0;
      for (let i = 0; i < N; i++) { const a = Gs[g][0] * x[i] + Gs[g][1] * y[i]; re += Math.cos(a); im += Math.sin(a); }
      m += Math.hypot(re, im) / N; ph[g] = Math.atan2(im, re);
    }
    ph[1] = ph[2] - ph[0];
    this.ph = ph;
    return m / 3;
  };

  // BAOAB Langevin integrator at the current this.T.
  MD2D.prototype.step = function (n) {
    const { N, x, y, vx, vy, fx, fy, Lx, Ly } = this, dt = this.dt, h = dt / 2;
    const c1 = Math.exp(-this.gamma * dt), c2 = Math.sqrt((1 - c1 * c1) * Math.max(this.T, 0));
    for (let s = 0; s < n; s++) {
      for (let i = 0; i < N; i++) {
        vx[i] += fx[i] * h; vy[i] += fy[i] * h;
        x[i] += vx[i] * h; y[i] += vy[i] * h;
        vx[i] = c1 * vx[i] + c2 * this.gauss(); vy[i] = c1 * vy[i] + c2 * this.gauss();
        x[i] += vx[i] * h; y[i] += vy[i] * h;
        if (x[i] < 0) x[i] += Lx; else if (x[i] >= Lx) x[i] -= Lx;
        if (y[i] < 0) y[i] += Ly; else if (y[i] >= Ly) y[i] -= Ly;
      }
      this.forces();
      for (let i = 0; i < N; i++) { vx[i] += fx[i] * h; vy[i] += fy[i] * h; }
    }
  };

  MD2D.prototype.kineticT = function () {
    let k = 0;
    for (let i = 0; i < this.N; i++) k += this.vx[i] * this.vx[i] + this.vy[i] * this.vy[i];
    return k / (2 * this.N);
  };

  // Local bond-orientational order psi_6 over first-shell neighbours; returns the mean |psi_6|.
  MD2D.prototype.psi6 = function (rshell) {
    const { N, psiRe, psiIm, psiAbs } = this, cnt = new Int32Array(N);
    psiRe.fill(0); psiIm.fill(0);
    this.buildCells();
    this.pairs(rshell || 1.35, (i, j, dx, dy) => {
      const th = 6 * Math.atan2(dy, dx), c = Math.cos(th), s = Math.sin(th);   // 6(theta+pi) = 6 theta mod 2pi
      psiRe[i] += c; psiIm[i] += s; psiRe[j] += c; psiIm[j] += s;
      cnt[i]++; cnt[j]++;
    });
    let m = 0;
    for (let i = 0; i < N; i++) {
      if (cnt[i]) { psiRe[i] /= cnt[i]; psiIm[i] /= cnt[i]; }
      psiAbs[i] = Math.hypot(psiRe[i], psiIm[i]);
      m += psiAbs[i];
    }
    return m / N;
  };

  // Static structure factor S(q) = |sum_j exp(-i q.r_j)|^2 / N on the box's reciprocal grid,
  // q = 2 pi (m/Lx, n/Ly), |m| <= K1, |n| <= K2. Returns a row-major Float32Array, rows n = -K2..K2.
  MD2D.prototype.structureFactor = function (K1, K2) {
    const { N, x, y, Lx, Ly } = this, W = 2 * K1 + 1, H = 2 * K2 + 1;
    const re = new Float64Array(W * H), im = new Float64Array(W * H);
    const pxr = new Float64Array(W), pxi = new Float64Array(W), pyr = new Float64Array(H), pyi = new Float64Array(H);
    const fill = (pr, pi, K, ang) => {
      const c = Math.cos(ang), s = Math.sin(ang);
      pr[K] = 1; pi[K] = 0;
      for (let m = 1; m <= K; m++) {
        pr[K + m] = pr[K + m - 1] * c - pi[K + m - 1] * s;
        pi[K + m] = pr[K + m - 1] * s + pi[K + m - 1] * c;
        pr[K - m] = pr[K + m]; pi[K - m] = -pi[K + m];
      }
    };
    for (let j = 0; j < N; j++) {
      fill(pxr, pxi, K1, -2 * Math.PI * x[j] / Lx);
      fill(pyr, pyi, K2, -2 * Math.PI * y[j] / Ly);
      for (let n = 0; n < H; n++) {
        const br = pyr[n], bi = pyi[n], row = n * W;
        for (let m = 0; m < W; m++) {
          re[row + m] += pxr[m] * br - pxi[m] * bi;
          im[row + m] += pxr[m] * bi + pxi[m] * br;
        }
      }
    }
    const S = new Float32Array(W * H);
    for (let k = 0; k < W * H; k++) S[k] = (re[k] * re[k] + im[k] * im[k]) / N;
    S[K2 * W + K1] = 0;                               // drop forward scattering
    return S;
  };

  G.MD2D = MD2D;
})(window);
