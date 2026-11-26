// swarm.js: many small soft discs in a periodic box (pixel units), Langevin dynamics,
// with an optional external force. Used for the schematic quantum-liquid slides, where the
// particles are slaved to a prescribed superfluid density field (see TriField).
(function (G) {
  'use strict';

  const HALF_SHELL = [[0, 0], [1, 0], [1, 1], [0, 1], [-1, 1]];
  const F_MAX = 3;                       // cap on a single pair force (contact force is ~1)

  function Swarm(opt) {
    // wallsY: hard walls at y = 0 and y = Ly instead of periodic wrapping in y.
    // maxScale > 1 allows per-particle diameters d * size[i] (size[i] in [1, maxScale]).
    const o = Object.assign({ N: 2000, Lx: 1300, Ly: 750, d: 12, eps: 1, T: 1, gamma: 0.05, dt: 0.12, seed: 4, wallsY: false, maxScale: 1 }, opt);
    Object.assign(this, o);
    const N = o.N;
    this.x = new Float64Array(N); this.y = new Float64Array(N);
    this.vx = new Float64Array(N); this.vy = new Float64Array(N);
    this.fx = new Float64Array(N); this.fy = new Float64Array(N);
    this.rc = 1.5 * o.d * o.maxScale;
    this.size = o.maxScale > 1 ? new Float32Array(N).fill(1) : null;
    this.ncx = Math.max(3, Math.floor(o.Lx / this.rc));
    this.ncy = Math.max(3, Math.floor(o.Ly / this.rc));
    this.head = new Int32Array(this.ncx * this.ncy);
    this.next = new Int32Array(N);
    this.rand = G.Stipple.rng(o.seed);
    this._g = null;
    this.external = null;                 // function (x, y, i) -> [fx, fy]
    this.reset();
  }

  Swarm.prototype.gauss = function () {
    if (this._g !== null) { const g = this._g; this._g = null; return g; }
    let u = 0;
    while (u === 0) u = this.rand();
    const v = this.rand(), r = Math.sqrt(-2 * Math.log(u));
    this._g = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };

  // Random sequential placement without overlaps, then thermal velocities.
  Swarm.prototype.reset = function () {
    const { N, Lx, Ly, d } = this, dmin2 = (0.9 * d) ** 2;
    let placed = 0, tries = 0;
    while (placed < N && tries < N * 200) {
      tries++;
      const x = this.rand() * Lx, y = this.wallsY ? d / 2 + this.rand() * (Ly - d) : this.rand() * Ly;
      let ok = true;
      for (let j = 0; j < placed && ok; j++) {
        let dx = x - this.x[j], dy = y - this.y[j];
        dx -= Lx * Math.round(dx / Lx); if (!this.wallsY) dy -= Ly * Math.round(dy / Ly);
        if (dx * dx + dy * dy < dmin2) ok = false;
      }
      if (ok) { this.x[placed] = x; this.y[placed] = y; placed++; }
    }
    for (let i = placed; i < N; i++) { this.x[i] = this.rand() * Lx; this.y[i] = this.rand() * Ly; }
    const s = Math.sqrt(this.T);
    for (let i = 0; i < N; i++) { this.vx[i] = s * this.gauss(); this.vy[i] = s * this.gauss(); }
    this.forces();
  };

  Swarm.prototype.forces = function () {
    const { N, x, y, fx, fy, ncx, ncy, head, next, Lx, Ly } = this, walls = this.wallsY;
    const cwx = Lx / ncx, cwy = Ly / ncy, hx = Lx / 2, hy = walls ? Infinity : Ly / 2;
    const rc2 = this.rc * this.rc, s2 = this.d * this.d, e12 = 12 * this.eps, size = this.size;
    fx.fill(0); fy.fill(0); head.fill(-1);
    for (let i = 0; i < N; i++) {
      const cx = Math.min(ncx - 1, Math.floor(x[i] / cwx)), cy = Math.min(ncy - 1, Math.floor(y[i] / cwy));
      const c = cx + cy * ncx;
      next[i] = head[c]; head[c] = i;
    }
    for (let cy = 0; cy < ncy; cy++) for (let cx = 0; cx < ncx; cx++) {
      const c = cx + cy * ncx;
      for (const [ox, oy] of HALF_SHELL) {
        if (walls && (cy + oy < 0 || cy + oy >= ncy)) continue;
        const c2 = ((cx + ox + ncx) % ncx) + ((cy + oy + ncy) % ncy) * ncx;
        for (let i = head[c]; i >= 0; i = next[i]) {
          for (let j = c2 === c ? next[i] : head[c2]; j >= 0; j = next[j]) {
            let dx = x[i] - x[j], dy = y[i] - y[j];
            if (dx > hx) dx -= Lx; else if (dx < -hx) dx += Lx;
            if (dy > hy) dy -= Ly; else if (dy < -hy) dy += Ly;
            let r2 = dx * dx + dy * dy;
            if (r2 >= rc2) continue;
            let ss2 = s2;
            if (size) { const m = 0.5 * (size[i] + size[j]); ss2 = s2 * m * m; if (r2 >= 2.25 * ss2) continue; }
            if (r2 < 0.25 * ss2) r2 = 0.25 * ss2;
            const sr2 = ss2 / r2, sr6 = sr2 * sr2 * sr2;
            const f = Math.min(e12 * sr6 * sr6 / r2, F_MAX / Math.sqrt(r2));   // capped, so overlaps can't explode
            fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
          }
        }
      }
    }
    if (walls) {                                  // soft walls: (d/r)^12 repulsion from each wall
      const w = this.d / 2;
      for (let i = 0; i < N; i++) {
        const a = Math.max(y[i], 0.3 * w), b = Math.max(Ly - y[i], 0.3 * w);
        if (a < 1.5 * w) fy[i] += 12 * this.eps * Math.pow(w / a, 12) / a;
        if (b < 1.5 * w) fy[i] -= 12 * this.eps * Math.pow(w / b, 12) / b;
      }
    }
    if (this.external) for (let i = 0; i < N; i++) {
      const f = this.external(x[i], y[i], i);
      fx[i] += f[0]; fy[i] += f[1];
    }
  };

  // BAOAB Langevin integrator.
  Swarm.prototype.step = function (n) {
    const { N, x, y, vx, vy, fx, fy, Lx, Ly } = this, dt = this.dt, h = dt / 2;
    const c1 = Math.exp(-this.gamma * dt), c2 = Math.sqrt((1 - c1 * c1) * this.T);
    for (let s = 0; s < n; s++) {
      for (let i = 0; i < N; i++) {
        vx[i] += fx[i] * h; vy[i] += fy[i] * h;
        x[i] += vx[i] * h; y[i] += vy[i] * h;
        vx[i] = c1 * vx[i] + c2 * this.gauss(); vy[i] = c1 * vy[i] + c2 * this.gauss();
        x[i] += vx[i] * h; y[i] += vy[i] * h;
        x[i] -= Lx * Math.floor(x[i] / Lx);
        if (!this.wallsY) y[i] -= Ly * Math.floor(y[i] / Ly);
        else if (y[i] < 0) { y[i] = -y[i]; vy[i] = -vy[i]; }
        else if (y[i] > Ly) { y[i] = 2 * Ly - y[i]; vy[i] = -vy[i]; }
      }
      this.forces();
      for (let i = 0; i < N; i++) { vx[i] += fx[i] * h; vy[i] += fy[i] * h; }
    }
  };

  // Triangular density modulation commensurate with a periodic box of nx * ny cells:
  // S(r) = (1/3) sum_j cos(G_j . (r - r0)), in [-1/2, 1], maxima on the lattice sites.
  // The schematic superfluid density is rho(r) = exp(kappa S(r)) / <exp(kappa S)>.
  function TriField(nx, ny, a) {
    this.a = a; this.Lx = nx * a; this.Ly = ny * a * Math.sqrt(3) / 2;
    const k = 2 * Math.PI / a, s3 = Math.sqrt(3);
    this.G = [[k, -k / s3], [0, 2 * k / s3], [k, k / s3]];
    this.x0 = a / 2; this.y0 = a * s3 / 4;     // keep the maxima off the box edges
  }
  TriField.prototype.S = function (x, y) {
    const X = x - this.x0, Y = y - this.y0, G = this.G;
    return (Math.cos(G[0][0] * X + G[0][1] * Y) + Math.cos(G[1][0] * X + G[1][1] * Y) + Math.cos(G[2][0] * X + G[2][1] * Y)) / 3;
  };
  TriField.prototype.gradS = function (x, y) {
    const X = x - this.x0, Y = y - this.y0, G = this.G;
    let gx = 0, gy = 0;
    for (let j = 0; j < 3; j++) {
      const s = Math.sin(G[j][0] * X + G[j][1] * Y);
      gx -= G[j][0] * s; gy -= G[j][1] * s;
    }
    return [gx / 3, gy / 3];
  };

  G.Swarm = Swarm;
  G.TriField = TriField;
})(window);
