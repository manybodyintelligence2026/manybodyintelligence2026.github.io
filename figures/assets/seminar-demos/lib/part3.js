// part3.js: helpers for the Part 3 (superconducting Peierls) slides, built on data/part3.js.
//   P3.C                 role colours (condensate / Delta_0 green, ABS / quasiparticles blue, coupling violet)
//   P3.edgeRGB(xc)       colour for a BdG state by its x-centre: blue at either edge, light grey in the bulk
//   P3.drawSpectrum(ax, spec, opt)   scatter of a BdG spectrum, coloured by x-centre
//   P3.trig(row)         periodic trigonometric interpolant of a row sampled on integer sites
//   P3.delta0Grid(...)   smooth Delta_0(x, y) window (mean over y + deviation), for 3D surfaces
(function (G) {
  'use strict';
  const C = {
    green: '#3F7330', greenFill: '#8EB36B', greenTint: '#DCE8CF',
    blue: '#2E6FC2', blueTint: '#CFE4FB', violet: '#7B4FA0', violetTint: '#E3D6EE',
    black: '#161414', grey: '#8F8A84', page: '#FBFAF7', ink: '#F4EFE3', hook: '#FFD375'
  };
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const BLUE = hex(C.blue), GREY = [200, 197, 191];

  function edgeRGB(xc, Nx) {
    Nx = Nx || 20;
    const d = Math.min(xc - 1, Nx - xc) / (Nx / 2 - 1);      // 0 at an edge, 1 in the middle
    const t = Math.min(1, Math.max(0, d / 0.32));
    return BLUE.map((b, i) => Math.round(b + (GREY[i] - b) * t));
  }

  // opt: { size, alpha, Nx, emax }
  function drawSpectrum(ax, spec, opt) {
    const o = Object.assign({ size: 3.4, alpha: 1, Nx: 20, emax: 3 }, opt), c = ax.ctx;
    const n = spec.ky.length, order = [];
    for (let i = 0; i < n; i++) if (Math.abs(spec.E[i]) <= o.emax) order.push(i);
    // bulk first, edge states on top
    order.sort((a, b) => Math.min(spec.xc[b] - 1, o.Nx - spec.xc[b]) - Math.min(spec.xc[a] - 1, o.Nx - spec.xc[a]));
    c.save(); c.globalAlpha = o.alpha;
    for (const i of order) {
      const [px, py] = ax.toPix(spec.ky[i], spec.E[i]), [r, g, b] = edgeRGB(spec.xc[i], o.Nx);
      c.fillStyle = `rgb(${r},${g},${b})`;
      c.fillRect(px - o.size / 2, py - o.size / 2, o.size, o.size);
    }
    c.restore();
  }

  // Trigonometric interpolant of a periodic row f[0..N-1] sampled at integer positions.
  function trig(row) {
    const N = row.length, M = Math.floor(N / 2), a = new Float64Array(M + 1), b = new Float64Array(M + 1);
    for (let m = 0; m <= M; m++) {
      let sa = 0, sb = 0;
      for (let j = 0; j < N; j++) { const t = 2 * Math.PI * m * j / N; sa += row[j] * Math.cos(t); sb += row[j] * Math.sin(t); }
      const w = (m === 0 || (N % 2 === 0 && m === M)) ? 1 / N : 2 / N;
      a[m] = sa * w; b[m] = sb * w;
    }
    return y => {
      let s = 0;
      for (let m = 0; m <= M; m++) { const t = 2 * Math.PI * m * y / N; s += a[m] * Math.cos(t) + b[m] * Math.sin(t); }
      return s;
    };
  }

  // Smooth Delta_0 on a window: x in [0, nxSites) (0 = edge), y in [y0, y0 + span), ny samples along y,
  // nxs samples across x (linear between sites). Returns { mean[nxs], dev[nxs][ny] } for blending.
  function delta0Grid(P, nxSites, y0, span, ny, nxs) {
    const A = P.delta0.amplitude, Ny = A.length;
    const cols = [];
    for (let x = 0; x < nxSites; x++) {
      const row = A.map(r => r[x]);
      const mean = row.reduce((s, v) => s + v, 0) / Ny;
      cols.push({ mean, f: trig(row.map(v => v - mean)) });
    }
    const mean = new Float64Array(nxs), dev = [];
    for (let k = 0; k < nxs; k++) {
      const xf = k / (nxs - 1) * (nxSites - 1), x0 = Math.floor(xf), x1 = Math.min(nxSites - 1, x0 + 1);
      const w0 = xf - x0, w = w0 * w0 * (3 - 2 * w0);                // smoothstep: no kinks at the sites
      mean[k] = cols[x0].mean * (1 - w) + cols[x1].mean * w;
      const d = new Float64Array(ny);
      for (let j = 0; j < ny; j++) {
        const y = y0 + span * j / (ny - 1);
        d[j] = cols[x0].f(y) * (1 - w) + cols[x1].f(y) * w;
      }
      dev.push(d);
    }
    return { mean, dev };
  }

  // ---- left / right edge colouring (as the paper's Fig. 3 and the QMT pptx 14, 5 Nov), data in data/fig3.js ----
  // <x> = 1 (left edge) blue -> bulk near-black -> <x> = Nx (right edge) red; the paper's edge_localization_colormap.
  const LR = { left: [140, 166, 255], bulk: [15, 20, 28], right: [255, 148, 145] };
  function lrRGB(xc, Nx) {
    const f = Math.min(1, Math.max(0, (xc - 1) / ((Nx || 20) - 1)));
    const [a, b, t] = f < 0.5 ? [LR.left, LR.bulk, f * 2] : [LR.bulk, LR.right, f * 2 - 1];
    return a.map((v, i) => Math.round(v + (b[i] - v) * t));
  }
  const lrCss = (xc, Nx) => `rgb(${lrRGB(xc, Nx).join(',')})`;
  const edgeness = (xc, Nx) => Math.abs((xc - 1) / ((Nx || 20) - 1) - 0.5);    // 0 bulk .. 0.5 edge
  // uniform state: each band as a line coloured segment by segment by <x>; bulk bands first, edge on top
  function drawBandsLR(ax, U, opt) {
    const o = Object.assign({ width: 2.6, Nx: 20, emax: 3 }, opt), c = ax.ctx;
    const nb = U.E.length, segs = [];
    for (let b = 0; b < nb; b++) for (let i = 0; i + 1 < U.ky.length; i++) {
      const e0 = U.E[b][i], e1 = U.E[b][i + 1];
      if (e0 === null || e1 === null || Math.abs(e0) > o.emax && Math.abs(e1) > o.emax) continue;
      const xc = 0.5 * (U.xc[b][i] + U.xc[b][i + 1]);
      segs.push([edgeness(xc, o.Nx), U.ky[i], e0, U.ky[i + 1], e1, xc]);
    }
    segs.sort((p, q) => p[0] - q[0]);
    c.save(); c.lineWidth = o.width; c.lineCap = 'round';
    for (const s of segs) {
      const [x0, y0] = ax.toPix(s[1], s[2]), [x1, y1] = ax.toPix(s[3], s[4]);
      c.strokeStyle = lrCss(s[5], o.Nx);
      if (o.rightAlpha !== undefined) {                         // fade the right-edge branches (one-edge focus)
        const f = (s[5] - 1) / (o.Nx - 1), w = Math.min(1, Math.max(0, (f - 0.6) * 4));
        c.globalAlpha = 1 - (1 - o.rightAlpha) * w;
      }
      if (o.bulkWidth) c.lineWidth = o.bulkWidth + (o.width - o.bulkWidth) * Math.min(1, s[0] * 4);   // edge branches bolder
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    }
    c.globalAlpha = 1; c.restore();
  }
  // PDW state: the momentum cloud as dots coloured by <x> (paper Fig. 3c), bulk first
  function drawCloudLR(ax, S, opt) {
    const o = Object.assign({ size: 4, Nx: 15, emax: 3, alpha: 0.85 }, opt), c = ax.ctx;
    const idx = [];
    for (let i = 0; i < S.ky.length; i++) if (Math.abs(S.E[i]) <= o.emax) idx.push(i);
    idx.sort((a, b) => edgeness(S.xc[a], o.Nx) - edgeness(S.xc[b], o.Nx));
    c.save(); c.globalAlpha = o.alpha;
    for (const i of idx) {
      const [px, py] = ax.toPix(S.ky[i], S.E[i]);
      c.fillStyle = lrCss(S.xc[i], o.Nx);
      if (o.rightAlpha !== undefined) {                         // fade the right-edge states (one-edge focus), as drawBandsLR
        const f = (S.xc[i] - 1) / (o.Nx - 1), w = Math.min(1, Math.max(0, (f - 0.6) * 4));
        c.globalAlpha = o.alpha * (1 - (1 - o.rightAlpha) * w);
      }
      c.beginPath(); c.arc(px, py, o.size / 2, 0, 2 * Math.PI); c.fill();
    }
    c.restore();
  }
  // the localisation colour bar: "left edge [blue - bulk - red] right edge", as a positioned DOM block
  function lrBar(parent, x, y, opt) {
    const o = Object.assign({ w: 200, h: 22, font: 24 }, opt);
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:${x}px;top:${y}px;display:flex;align-items:center;gap:12px;font-size:${o.font}px;`;
    const g = `linear-gradient(90deg, rgb(${LR.left}), rgb(${LR.bulk}), rgb(${LR.right}))`;
    d.innerHTML = `<span>left edge</span>` +
      `<span style="position:relative;display:inline-block;width:${o.w}px;height:${o.h}px;background:${g};border:2px solid #161414">` +
      `<span style="position:absolute;left:50%;bottom:${o.h + 4}px;transform:translateX(-50%);font-size:${o.font * 0.85}px;color:#161414">bulk</span></span>` +
      `<span>right edge</span>`;
    parent.appendChild(d);
    return d;
  }

  G.P3 = { C, edgeRGB, drawSpectrum, trig, delta0Grid, LR, lrRGB, drawBandsLR, drawCloudLR, lrBar };
})(window);
