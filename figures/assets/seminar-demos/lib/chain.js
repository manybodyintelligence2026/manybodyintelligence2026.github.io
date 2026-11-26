// chain.js: the Peierls toy model drawn in the deck's print style.
// A periodic 1D chain of N ions (stippled balls) joined by springs, with an optional electron
// cloud: blue stipple re-sampled every frame from the electron density n(x), so the electrons read
// as delocalised and their amount (the filling) as the density of dots. Lengths in stage px; the
// chain fills the canvas width exactly (spacing a = width / N), so the periodic wrap is seamless.
(function (G) {
  'use strict';

  function Chain(canvas, opt) {
    // coils, springAmp: spring drawing (default 5 coils, 9 px); fewer and smaller for short springs.
    // springColor: the springs carry the phonons, so they take the phonon role colour (deck: green).
    // paper: false draws on a transparent canvas (no box of its own); fadeEdges (px) lets the ends of the
    // chain fade into the page.
    const o = Object.assign({ N: 20, width: 1760, height: 230, ionD: 52, yIon: 0.45, seed: 5,
      springColor: '#3F7330', springWidth: 3.4, paper: true, fadeEdges: 0 }, opt);
    this.o = o; this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.N = o.N; this.a = o.width / o.N;
    canvas.style.width = o.width + 'px'; canvas.style.height = o.height + 'px';
    this.u = new Float64Array(o.N);          // displacements in units of a
    this.v = new Float64Array(o.N);
    this.K = 1;                               // spring constant (sets omega units)
    this.damp = 0;
    this.rand = Stipple.rng(o.seed);
    this.k = 0;
    // Electron cloud. n: electrons per site (0..2). mod, q, phase: a charge-density wave
    // n(x) -> n(x)[1 + mod sin(q x - phase)] (x in site units). Off when n = 0.
    this.cloud = { n: 0, mod: 0, q: Math.PI, phase: 0, dotsPerElectron: 260, sigmaW: 0.26, sigmaY: 0.42,
      color: '22,72,165', alpha: 0.9, dot: 2.8, refresh: 0.35 };
    this.dots = null;
    // Annotation of the displacement: dashed outlines at the undistorted sites (showRef) and a
    // bracket labelled u under one ion (uLabel = ion index, or null).
    this.showRef = false;
    this.uLabel = null;
    this.period = null;                       // {i0, len} in sites: a bracket labelled π/k_F above the chain
    // Fade state: target and current opacity of the ion layer (balls, springs, outlines, orange
    // background) and the electron layer. setFade(key, faded) eases towards FADE_LOW or 1.
    this.fadeTarget = { ions: 1, el: 1 };
    this.fade = { ions: 1, el: 1 };
  }

  // Phonon dispersion of the chain (units: sqrt(K/m) = 1).
  Chain.omega = q => 2 * Math.abs(Math.sin(q / 2));

  Chain.prototype.layout = function (k) {
    if (Math.abs(k - this.k) < 1e-3) return;
    this.k = k;
    const cv = this.cv, o = this.o;
    cv.width = Math.round(o.width * k); cv.height = Math.round(o.height * k);
    this.paper = o.paper ? Stipple.paper(cv.width, cv.height, { s: k, seed: 31 }) : null;
    const R = o.ionD * k / 2;
    this.ions = [0, 1, 2].map(i => Stipple.ball(R, { seed: 3 + 5 * i, s: k }));
    this.shade = Stipple.shadow(R, { seed: 9 });
  };

  // ---- ion dynamics --------------------------------------------------------------------------
  Chain.prototype.setMode = function (m, amp) {      // play the phonon q = 2 pi m / N exactly
    this.mode = { m: m, amp: amp === undefined ? 0.28 : amp, t: 0 };
  };
  Chain.prototype.free = function () {                // switch to free (Newtonian) evolution from now
    this.mode = null;
  };
  Chain.prototype.step = function (dt) {
    const N = this.N, u = this.u, v = this.v;
    if (this.mode) {
      const md = this.mode, q = 2 * Math.PI * md.m / N, w = Chain.omega(q) * 2.2;
      md.t += dt;
      for (let i = 0; i < N; i++) {
        u[i] = md.amp * Math.cos(q * i - w * md.t);
        v[i] = md.amp * w * Math.sin(q * i - w * md.t);
      }
      return;
    }
    const sub = 8, h = dt / sub, K = this.K * 2.2 * 2.2;
    for (let s = 0; s < sub; s++) {
      for (let i = 0; i < N; i++) {
        const f = K * (u[(i + 1) % N] + u[(i - 1 + N) % N] - 2 * u[i]);
        v[i] += (f - this.damp * v[i]) * h;
      }
      if (this.held !== undefined) v[this.held] = 0;
      for (let i = 0; i < N; i++) if (i !== this.held) u[i] += v[i] * h;
    }
  };
  // Pick the ion nearest a stage-px x (canvas-local); returns its index.
  Chain.prototype.nearest = function (x) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < this.N; i++) {
      const d = Math.abs(this.xOf(i) - x);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  Chain.prototype.xOf = function (i) { return (i + 0.5 + this.u[i]) * this.a; };

  // ---- electron cloud ----------------------------------------------------------------------
  // Density along the chain (site units, periodic): Gaussian "Wannier" peaks on the (displaced)
  // ions on top of a smooth background, times the CDW factor. Normalised to n electrons per site.
  Chain.prototype.density = function (nx) {
    const N = this.N, c = this.cloud, rho = new Float64Array(nx), dx = N / nx;
    for (let j = 0; j < nx; j++) {
      const x = (j + 0.5) * dx;
      let g = 0;
      for (let i = 0; i < N; i++) {
        let d = x - (i + 0.5 + (c.frozen ? 0 : this.u[i]));     // frozen: electrons ignore the distortion
        d -= N * Math.round(d / N);
        g += Math.exp(-0.5 * d * d / (c.sigmaW * c.sigmaW));
      }
      rho[j] = (0.35 + g) * Math.max(0, 1 + c.mod * Math.sin(c.q * (x - 0.5) - c.phase));
    }
    return rho;
  };
  // Draw the dots: positions from the inverse CDF of n(x); a fraction `refresh` of the dots is
  // re-drawn each frame, so the cloud shimmers rather than flickers.
  Chain.prototype.drawCloud = function () {
    const c = this.cloud, N = this.N;
    if (c.n <= 0.001) return;
    const { ctx, cv, k, a } = this, nDots = Math.round(c.dotsPerElectron * c.n * N);
    const nx = 8 * N, rho = this.density(nx), cdf = new Float64Array(nx + 1);
    for (let j = 0; j < nx; j++) cdf[j + 1] = cdf[j] + rho[j];
    const sample = () => {
      const r = this.rand() * cdf[nx];
      let lo = 0, hi = nx;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cdf[m] <= r) lo = m; else hi = m; }
      const x = (lo + (r - cdf[lo]) / Math.max(rho[lo], 1e-12)) * N / nx;
      let g = 0; for (let t = 0; t < 4; t++) g += this.rand(); g = (g - 2) * 1.73;      // ~N(0,1)
      return [x, g];
    };
    if (!this.dots || this.dots.length !== nDots * 2) {
      this.dots = new Float32Array(nDots * 2);
      for (let i = 0; i < nDots; i++) { const [x, y] = sample(); this.dots[2 * i] = x; this.dots[2 * i + 1] = y; }
    } else {
      const nNew = Math.round(c.refresh * nDots);
      for (let t = 0; t < nNew; t++) {
        const i = Math.floor(this.rand() * nDots), [x, y] = sample();
        this.dots[2 * i] = x; this.dots[2 * i + 1] = y;
      }
    }
    const y0 = this.o.yIon * cv.height, sy = c.sigmaY * a * k, d = c.dot * k;
    ctx.fillStyle = `rgba(${c.color},${c.alpha})`;
    for (let i = 0; i < nDots; i++) {
      const X = this.dots[2 * i] * a * k, Y = y0 + this.dots[2 * i + 1] * sy;
      ctx.fillRect(X - d / 2, Y - d / 2, d, d);
    }
  };

  // ---- drawing -------------------------------------------------------------------------------
  function spring(ctx, x0, x1, y, k, coils, amp0) {
    const L = x1 - x0, lead = Math.min(10 * k, L * 0.15), amp = (amp0 || 9) * k, n = coils * 2;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + lead, y);
    const span = L - 2 * lead;
    for (let j = 0; j <= n * 6; j++) {
      const t = j / (n * 6);
      ctx.lineTo(x0 + lead + span * t, y + amp * Math.sin(Math.PI * n * t));
    }
    ctx.lineTo(x1, y);
    ctx.stroke();
  }

  const FADE_LOW = 0.1;
  Chain.prototype.setFade = function (key, faded) { this.fadeTarget[key] = faded ? FADE_LOW : 1; };
  Chain.prototype.isFaded = function (key) { return this.fadeTarget[key] < 1; };

  Chain.prototype.draw = function (showIons) {
    const { ctx, cv, o, k, N, a } = this;
    for (const key of ['ions', 'el']) this.fade[key] += (this.fadeTarget[key] - this.fade[key]) * 0.18;
    const fI = this.fade.ions;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    if (!this.paper) ctx.clearRect(0, 0, cv.width, cv.height);
    else if (fI < 0.999) { ctx.fillStyle = '#FBFAF7'; ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.globalAlpha = fI;
    if (this.paper) ctx.drawImage(this.paper, 0, 0);
    const yI = o.yIon * cv.height, R = o.ionD * k / 2, W = cv.width;
    // springs, wrapping periodically
    ctx.strokeStyle = o.springColor; ctx.lineWidth = o.springWidth * k; ctx.lineJoin = 'round';
    for (let i = 0; i < N; i++) {
      const xa = this.xOf(i) * k, xb = this.xOf((i + 1) % N) * k + (i === N - 1 ? W : 0);
      for (const off of [0, -W]) spring(ctx, xa + off + R * 0.85, xb + off - R * 0.85, yI, k, o.coils || 5, o.springAmp);
    }
    if (showIons !== false) {
      const bS = this.ions[0].width, sS = this.shade.width, sh = 0.16 * R;
      for (let i = 0; i < N; i++) {
        const X = this.xOf(i) * k;
        for (const off of [0, -W, W]) {
          const x = X + off;
          if (x < -R * 2 || x > W + R * 2) continue;
          ctx.drawImage(this.shade, Math.round(x + sh - sS / 2), Math.round(yI + 1.3 * sh - sS / 2));
          ctx.drawImage(this.ions[i % 3], Math.round(x - bS / 2), Math.round(yI - bS / 2));
        }
      }
    }
    ctx.globalAlpha = this.fade.el;
    this.drawCloud();
    ctx.globalAlpha = fI;
    if (this.showRef) {
      ctx.save();
      ctx.setLineDash([7 * k, 6 * k]); ctx.lineWidth = 3 * k; ctx.strokeStyle = '#161414';
      for (let i = 0; i < N; i++) {
        if (Math.abs(this.u[i]) < 0.02) continue;
        ctx.beginPath(); ctx.arc((i + 0.5) * a * k, yI, R, 0, 2 * Math.PI); ctx.stroke();
      }
      ctx.restore();
    }
    if (this.uLabel !== null && Math.abs(this.u[this.uLabel]) > 0.02) {
      const i = this.uLabel, x0 = (i + 0.5) * a * k, x1 = this.xOf(i) * k, y = yI + R + 16 * k, h = 10 * k;
      ctx.strokeStyle = '#161414'; ctx.lineWidth = 3.5 * k; ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x0, y - h); ctx.lineTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1, y - h);
      ctx.stroke();
      ctx.fillStyle = '#161414'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = `italic ${Math.round(44 * k)}px "Times New Roman", serif`;
      ctx.fillText('u', (x0 + x1) / 2, y + 4 * k);
    }
    if (this.period) {
      const { i0, len } = this.period, x0 = (i0 + 0.5) * a * k, x1 = (i0 + 0.5 + len) * a * k;
      const y = yI - R - 26 * k, h = 12 * k;
      ctx.strokeStyle = '#161414'; ctx.lineWidth = 3.5 * k; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x0, y + h); ctx.lineTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1, y + h); ctx.stroke();
      ctx.fillStyle = '#161414'; ctx.textBaseline = 'bottom';
      const f = Math.round(36 * k), fs = Math.round(24 * k), xm = (x0 + x1) / 2;
      if (this.period.label) {                               // a custom label (e.g. the wavelength on slide 07)
        ctx.font = `italic ${Math.round(32 * k)}px "Times New Roman", serif`; ctx.textAlign = 'center';
        ctx.fillText(this.period.label, xm, y - 4 * k);
      } else {
      ctx.font = `italic ${f}px "Times New Roman", serif`;
      const w1 = ctx.measureText('π/k').width; ctx.font = `italic ${fs}px "Times New Roman", serif`;
      const w2 = ctx.measureText('F').width, xs = xm - (w1 + w2) / 2;
      ctx.textAlign = 'left'; ctx.font = `italic ${f}px "Times New Roman", serif`; ctx.fillText('π/k', xs, y - 4 * k);
      ctx.font = `${fs}px "Times New Roman", serif`; ctx.fillText('F', xs + w1, y + 2 * k);
      }
    }
    if (o.fadeEdges > 0) {                                  // fade both ends into the page
      const f = o.fadeEdges * k / cv.width, g = ctx.createLinearGradient(0, 0, cv.width, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(f, 'rgba(0,0,0,1)');
      g.addColorStop(1 - f, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  };

  G.Chain = Chain;
})(window);
