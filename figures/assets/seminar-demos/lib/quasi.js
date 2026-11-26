// quasi.js: electrons, quasiparticles and Andreev bound states in the deck's particle language.
//   electrons:        small blue squares, as in the Part 2 electron cloud
//   quasiparticles:   slightly bigger blue stippled balls, faint (what remains after condensation)
//   bound states:     the same blue balls, bigger still and at full strength (dense at an edge)
// White stippled balls are reserved for classical/heavy particles (atoms, ions).
(function (G) {
  'use strict';
  const Q = {
    ELECTRON_D: 4.4, QP_D: 12, ABS_D: 22,     // drawn diameters, stage px
    QP_ALPHA: 0.72, EL_ALPHA: 0.95, QP_FRACTION: 0.15,
    BLUE: '22,72,165',
    // A blue stippled ball sprite of diameter d stage px at device scale k.
    sprite(d, k) {
      return Stipple.ball(d * k / 2, { seed: 41, s: Math.max(0.6, k * d / 24), hi: [150, 200, 255], lo: [10, 40, 120] });
    },
    // Per-particle flags: which particles survive condensation as quasiparticles.
    flags(N, seed) {
      const r = Stipple.rng(seed || 13), f = new Uint8Array(N);
      for (let i = 0; i < N; i++) f[i] = r() < Q.QP_FRACTION ? 1 : 0;
      return f;
    },
    // Draw one particle at device px (X, Y). cond in [0, 1]: 0 = free electron, 1 = condensed.
    // A quasiparticle morphs from an electron dot into a faint, bigger ball; the others fade out.
    // mE, mQ: extra opacity factors for the electron and quasiparticle layers (legend fades).
    draw(ctx, X, Y, k, cond, isQP, spr, mE, mQ) {
      if (mE === undefined) mE = 1;
      if (mQ === undefined) mQ = 1;
      const ae = Q.EL_ALPHA * (1 - cond) * mE;
      if (ae > 0.01) {
        const d = Q.ELECTRON_D * k;
        ctx.fillStyle = `rgba(${Q.BLUE},${ae})`;
        ctx.fillRect(X - d / 2, Y - d / 2, d, d);
      }
      if (isQP && cond > 0.01) {
        const d = (Q.ELECTRON_D + (Q.QP_D - Q.ELECTRON_D) * cond) * k;
        ctx.globalAlpha = Q.QP_ALPHA * cond * mQ;
        ctx.drawImage(spr, X - d / 2, Y - d / 2, d, d);
        ctx.globalAlpha = 1;
      }
    }
  };
  // Legend swatches (draw into a square canvas context of side S device px).
  Q.swatch = {
    electrons(c, S) {
      const r = Stipple.rng(5); c.fillStyle = `rgba(${Q.BLUE},0.95)`;
      for (let i = 0; i < 26; i++) {
        const rr = S * 0.4 * Math.sqrt(r()), th = 2 * Math.PI * r();
        c.fillRect(S / 2 + rr * Math.cos(th) - S * 0.05, S / 2 + rr * Math.sin(th) - S * 0.05, S * 0.1, S * 0.1);
      }
    },
    quasiparticle(c, S) {
      const b = Q.sprite(S * 0.55, 1); c.globalAlpha = Q.QP_ALPHA; c.drawImage(b, (S - b.width) / 2, (S - b.height) / 2); c.globalAlpha = 1;
    },
    bound(c, S) { const b = Q.sprite(S * 0.9, 1); c.drawImage(b, (S - b.width) / 2, (S - b.height) / 2); },
    condensate(c, S) {
      c.fillStyle = '#F4EFE3'; c.beginPath(); c.arc(S / 2, S / 2, S * 0.48, 0, 2 * Math.PI); c.fill();
      const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.48);
      g.addColorStop(0, 'rgba(210,240,185,0.95)'); g.addColorStop(1, 'rgba(210,240,185,0.35)');
      c.fillStyle = g; c.beginPath(); c.arc(S / 2, S / 2, S * 0.48, 0, 2 * Math.PI); c.fill();
      c.lineWidth = S * 0.04; c.strokeStyle = '#161414'; c.stroke();
    }
  };
  // Eased layer fades driven by a legend: fades.get(key) in [LOW, 1].
  Q.fades = function (keys) {
    const LOW = 0.08, cur = {}, tgt = {};
    for (const k of keys) { cur[k] = 1; tgt[k] = 1; }
    return {
      set(k, faded) { tgt[k] = faded ? LOW : 1; },
      step() { for (const k of keys) cur[k] += (tgt[k] - cur[k]) * 0.18; },
      get(k) { return cur[k]; }
    };
  };
  G.Quasi = Q;
})(window);
