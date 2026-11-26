// scenes.js: self-contained, resizable versions of the two simulation boxes, for slides that
// show them side by side or at another size. Same physics and look as proto/01 and proto/02.
//   ClassicalScene: Langevin soft discs on a commensurate triangular box (lib/md2d.js).
//   QuantumScene:   small particles slaved to a schematic superfluid density (lib/swarm.js).
// Usage: const s = new XScene(canvas, {width}); s.layout(k); each frame s.update(dt); s.draw().
(function (G) {
  'use strict';

  // Draw sprites at every periodic image that pokes into the canvas.
  function drawParticles(ctx, xs, ys, n, sk, W, H, balls, shade, R) {
    const bS = balls[0].width, sS = shade.width, sh = 0.16 * R, pos = [];
    for (let i = 0; i < n; i++) {
      const X = xs[i] * sk, Y = ys[i] * sk, px = [X], py = [Y];
      if (X < R + sh) px.push(X + W); else if (X > W - R - sh) px.push(X - W);
      if (Y < R + sh) py.push(Y + H); else if (Y > H - R - sh) py.push(Y - H);
      for (const a of px) for (const b of py) pos.push(a, b, i % balls.length);
    }
    for (let p = 0; p < pos.length; p += 3)
      ctx.drawImage(shade, Math.round(pos[p] + sh - sS / 2), Math.round(pos[p + 1] + 1.3 * sh - sS / 2));
    for (let p = 0; p < pos.length; p += 3)
      ctx.drawImage(balls[pos[p + 2]], Math.round(pos[p] - bS / 2), Math.round(pos[p + 1] - bS / 2));
  }

  // ---- classical solid -------------------------------------------------------------------
  function ClassicalScene(canvas, opt) {
    const o = Object.assign({ width: 1300, nx: 14, ny: 10, ballD: 0.55, T: 0.001, seed: 3, paperSeed: 7 }, opt);
    this.o = o; this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.md = new MD2D({ nx: o.nx, ny: o.ny, sigma: 0.85, gamma: 0.6, dt: 0.005, T: o.T, seed: o.seed });
    this.width = o.width; this.height = Math.round(o.width * this.md.Ly / this.md.Lx);
    canvas.style.width = this.width + 'px'; canvas.style.height = this.height + 'px';
    this.stepsPerSec = T => 1200 * Math.min(1, Math.sqrt(0.45 / T));
    this.k = 0;
  }
  ClassicalScene.prototype.layout = function (k) {
    if (Math.abs(k - this.k) < 1e-3) return;
    this.k = k;
    const cv = this.cv;
    cv.width = Math.round(this.width * k); cv.height = Math.round(this.height * k);
    this.paper = Stipple.paper(cv.width, cv.height, { s: k, seed: this.o.paperSeed });
    const R = this.o.ballD * (cv.width / this.md.Lx) / 2;
    this.R = R;
    this.balls = [0, 1, 2, 3, 4, 5].map(i => Stipple.ball(R, { seed: 11 + 7 * i, s: Math.min(k, R / 25) }));
    this.shade = Stipple.shadow(R, { seed: 5 });
  };
  ClassicalScene.prototype.update = function (dt) {
    this.md.step(Math.max(1, Math.round(this.stepsPerSec(this.md.T) * dt)));
  };
  ClassicalScene.prototype.draw = function () {
    const { ctx, cv, md } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.paper, 0, 0);
    drawParticles(ctx, md.x, md.y, md.N, cv.width / md.Lx, cv.width, cv.height, this.balls, this.shade, this.R);
  };

  // ---- quantum solid (schematic) -----------------------------------------------------------
  // Superfluid density rho = (1 - m) + m P(S)/<P>, P = exp(KAP (S - 1)) on a 6 x 4 triangular
  // lattice; the particles feel V = -PULL T ln rho. Simulation units are stage px of a 1300-px box.
  const SIM_W = 1300, KAP = 1.6, PULL = 2;
  const SHEET = [142, 179, 107], ALPHA0 = 0.22, ALPHA_MAX = 0.78;   // s-wave green on eggshell
  function QuantumScene(canvas, opt) {
    // nx, ny: lattice of maxima (default 6 x 4); qp: draw the faint quasiparticles (default on)
    const o = Object.assign({ width: 1300, m: 0.92, sf: 1, ballPx: 12, seed: 4, paperSeed: 7, nx: 6, ny: 4, qp: true }, opt);
    this.o = o; this.cv = canvas; this.ctx = canvas.getContext('2d');
    const field = this.field = new TriField(o.nx, o.ny, SIM_W / o.nx);
    if (o.alignMD) field.x0 = field.a / 4;          // maxima on the sites of MD2D's lattice (x = (k + j/2 + 1/4) a)
    this.width = o.width; this.height = Math.round(o.width * field.Ly / field.Lx);
    canvas.style.width = this.width + 'px'; canvas.style.height = this.height + 'px';
    this.P = S => Math.exp(KAP * (S - 1));
    let pm = 0;
    for (let j = 0; j < 120; j++) for (let i = 0; i < 200; i++) pm += this.P(field.S((i + 0.5) * field.Lx / 200, (j + 0.5) * field.Ly / 120));
    this.pMean = pm / 24000;
    this.m = o.m;                     // modulation (0 = uniform superfluid)
    this.sf = o.sf;                   // overlay opacity (0 = hidden)
    const sw = this.sw = new Swarm({ N: 1600, Lx: field.Lx, Ly: field.Ly, d: 12, T: 1, gamma: 0.05, dt: 0.12, seed: o.seed });
    sw.external = (x, y) => {
      if (this.m < 1e-4) return [0, 0];
      const S = field.S(x, y), g = field.gradS(x, y);
      const f = PULL * sw.T * (this.m * KAP * this.P(S) / this.pMean) / this.rho(S);
      return [f * g[0], f * g[1]];
    };
    this.k = 0; this.ovM = -1;
  }
  QuantumScene.prototype.rho = function (S) { return (1 - this.m) + this.m * this.P(S) / this.pMean; };
  QuantumScene.prototype.layout = function (k) {
    if (Math.abs(k - this.k) < 1e-3) return;
    this.k = k;
    const cv = this.cv, field = this.field;
    cv.width = Math.round(this.width * k); cv.height = Math.round(this.height * k);
    this.paper = Stipple.paper(cv.width, cv.height, { s: k, seed: this.o.paperSeed });
    const R = this.R = this.o.ballPx * (cv.width / SIM_W) / 2;
    // condensed electrons: only the faint quasiparticles are drawn (deck particle language, quasi.js)
    this.qpScale = Math.max(0.8, this.width / SIM_W);         // keep quasiparticles legible in small boxes
    this.qpSprite = Quasi.sprite(Quasi.QP_D * this.qpScale, k);
    if (!this.isQP) this.isQP = Quasi.flags(this.sw.N, 13);
    const ow = Math.round(cv.width * 0.5), oh = Math.round(cv.height * 0.5);
    this.ov = Stipple.canvas(ow, oh);
    this.ovCtx = this.ov.getContext('2d'); this.ovImg = this.ovCtx.createImageData(ow, oh);
    this.ovS = new Float32Array(ow * oh); this.ovU = new Float32Array(ow * oh);
    const rand = Stipple.rng(77);
    for (let j = 0; j < oh; j++) for (let i = 0; i < ow; i++) {
      this.ovS[j * ow + i] = field.S((i + 0.5) / ow * field.Lx, (j + 0.5) / oh * field.Ly);
      this.ovU[j * ow + i] = rand();
    }
    this.ovM = -1;
  };
  QuantumScene.prototype.buildOverlay = function () {
    const n = this.ovS.length, d = this.ovImg.data, dyn = this.o.dyn, t = this.t || 0;
    if (dyn) {
      // (6 Nov) each maximum jiggles on its own and keeps its round shape: every pixel belongs to its nearest lattice
      // site, and the density there is the field rigidly shifted by that site's own displacement u_k(t) (a few
      // incommensurate sines per site). The seams lie where the density is low, so they do not show.
      const f = this.field, a = f.a, ow = this.ov.width, oh = this.ov.height, h = a * Math.sqrt(3) / 2;
      const NXs = Math.round(f.Lx / a), NYs = Math.round(f.Ly / h);
      if (!this.sites) {
        const rnd = Stipple.rng(23); this.sites = [];
        for (let k = 0; k < NXs * NYs; k++) {
          const w = [], q = [];
          for (let m = 0; m < 3; m++) { w.push(1.1 + 1.8 * rnd()); q.push(rnd() * 6.2832); }
          this.sites.push({ w, q, w2: 1.0 + 1.9 * rnd(), q2: rnd() * 6.2832 });
        }
      }
      const A = 0.06 * a, U = this.sites.map(s => [
        A * (Math.sin(s.w[0] * t + s.q[0]) + 0.6 * Math.sin(s.w[1] * t + s.q[1])) / 1.6,
        A * (Math.sin(s.w2 * t + s.q2) + 0.6 * Math.sin(s.w[2] * t + s.q[2])) / 1.6]);
      for (let jj = 0; jj < oh; jj++) for (let ii = 0; ii < ow; ii++) {
        const x = (ii + 0.5) / ow * f.Lx, y = (jj + 0.5) / oh * f.Ly;
        const r0 = Math.round((y - f.y0) / h);
        let best = Infinity, bi = 0, bj = 0;
        for (let r = r0 - 1; r <= r0 + 1; r++) {
          const c = Math.round((x - f.x0) / a - r / 2), X = f.x0 + a * (c + r / 2), Y = f.y0 + r * h, d = (x - X) ** 2 + (y - Y) ** 2;
          if (d < best) { best = d; bi = c; bj = r; }
        }
        const k = (((bj % NYs) + NYs) % NYs) * NXs + (((bi % NXs) + NXs) % NXs), u = U[k];
        this.ovS[jj * ow + ii] = f.S(x - u[0], y - u[1]);
      }
    }
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      // the speckle twinkles: each grain pulses with its own phase
      const u = dyn ? 0.5 + 0.5 * Math.sin(6.2832 * (this.ovU[i] + 0.4 * t)) : this.ovU[i];
      const a = Math.min(ALPHA_MAX, ALPHA0 * this.rho(this.ovS[i])) * (0.75 + 0.5 * u);
      d[p] = SHEET[0]; d[p + 1] = SHEET[1]; d[p + 2] = SHEET[2]; d[p + 3] = 255 * a;
    }
    this.ovCtx.putImageData(this.ovImg, 0, 0);
    this.ovM = this.m;
  };
  QuantumScene.prototype.update = function (dt) {
    this.t = (this.t || 0) + dt;
    this.sw.step(Math.max(1, Math.round(330 * dt)));
  };
  QuantumScene.prototype.draw = function () {
    const { ctx, cv, sw } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.paper, 0, 0);
    const sk = cv.width / SIM_W, d = Quasi.QP_D * this.qpScale * this.k;
    ctx.globalAlpha = Quasi.QP_ALPHA;
    for (let i = 0; i < sw.N && this.o.qp; i++) {
      if (!this.isQP[i]) continue;
      ctx.drawImage(this.qpSprite, sw.x[i] * sk - d / 2, sw.y[i] * sk - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
    if (this.sf > 0.003) {
      if (this.o.dyn || Math.abs(this.m - this.ovM) > 0.002) this.buildOverlay();
      ctx.globalAlpha = this.sf;
      ctx.drawImage(this.ov, 0, 0, cv.width, cv.height);
      ctx.globalAlpha = 1;
    }
  };

  G.ClassicalScene = ClassicalScene;
  G.QuantumScene = QuantumScene;
})(window);
