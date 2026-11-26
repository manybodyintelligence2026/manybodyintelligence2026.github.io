// roadmap.js: the two-row roadmap (Peierls / superconducting Peierls), built from the same physics as the slides,
// laid out as in the reference pptx (slide 2): per row, the real-space picture (a) above its spectrum (b), a large
// instability plot (c) in the middle, then the ordered real-space picture (d) above its spectrum (e); block arrows
// with the transition named on them run b -> c -> d/e. The row heading is a pill centred over the row.
//   Roadmap.build(stage) -> { layout(k), start(), show(n), ghost(keys), c2Box }
// show(n): the first n panels in reading order (a1 b1 c1 d1 e1 a2 ... e2) in full, the rest as faint ghosts (n = 10:
// everything). Each panel carries its labels; a row's pill (and the SC row's tint) goes with its a panel, the
// arrow into c with c, the arrow out of c with d. A c panel replays its softening series when it appears.
// Row 1 (exact, generic filling n = 0.7): a1 uniform chain, b1 metallic band, c1 Kohn softening series,
//   d1 distorted chain, e1 gapped band.
// Row 2: a2 uniform order parameter at the edge (3D, with the ABS), b2 ABS dispersion (data), c2 superconducting Kohn anomaly (schematic,
//   mirrors c1, with grey higher branches), d2 edge PDW (3D, growing from the uniform edge and back on the
//   title's 6 s clock), e2 gapped ABS (schematic: the data's gap, 0.07 t, is
//   invisible at this scale, so the two edge branches anticross with an exaggerated gap).
// Needs: stipple.js, plot.js, chain.js, peierls.js, quasi.js and data/part3.js.
(function (G) {
  'use strict';
  const PI = Math.PI, GREEN = '#3F7330', BLUE = '#2E6FC2', BLACK = '#161414', MUTED = '#5E5858', VIOLET = '#7B4FA0';
  const SHADES = ['#B9D4A0', '#8EB36B', '#5C8F43', '#2A5420'];
  // columns (stage px): left (a over b), arrow, centre (c), arrow, right (d over e)
  const XL = 110, XA1 = 548, XC = 705, XA2 = 1256, XR = 1440, WS = 440, WC = 530, WA = 190;   // c panels wider (6 Nov)
  const PAD = [70, 10, 14, 58], PAD_C = [100, 10, 14, 58], FONT = 20, BOX_H = 88, SPEC_H = 215, GAP = 20;
  const BOX_W = WS - PAD[0] - PAD[2] - 6;                        // inner width: the box's border sits on the frame
  const ROWS = [{ top: 232, pill: 168, picH: BOX_H, color: VIOLET, name: 'Conventional Peierls instability',
    arrows: ['Phonon instability<br>at 2<i>k</i><sub>F</sub>', 'Lattice + electronic<br>phase transition'] },
  { top: 662, pill: 592, picH: 128, color: GREEN, name: 'Superconducting Peierls instability', tint: 'rgba(220,232,207,0.6)',
    arrows: ['Pair fluctuation<br>instability at 2<i>k</i><sub>c</sub>', 'Superconducting + ABS<br>phase transition'] }];
  const NF = 0.7, T = 0.02, GHOST = 0.12;
  const ORDER = ['a1', 'b1', 'c1', 'd1', 'e1', 'a2', 'b2', 'c2', 'd2', 'e2'];

  function el(tag, css, parent, html) {
    const e = document.createElement(tag); e.style.cssText = css; parent.appendChild(e);
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function axesAt(parent, x, y, w, h, o) {
    const wrap = el('div', `position:absolute;left:${x}px;top:${y}px;`, parent);
    return new Axes(el('canvas', 'display:block;', wrap), Object.assign({ width: w, height: h, pad: PAD, font: FONT }, o));
  }
  function inkBox(parent, x, y) {
    const box = el('div', `position:absolute;left:${x}px;top:${y}px;border:3px solid ${BLACK};box-shadow:5px 5px 0 ${BLACK};`, parent);
    return el('canvas', `display:block;width:${BOX_W}px;height:${BOX_H}px;`, box);
  }
  // a label inside a picture or plot (stage px, top-left anchored unless its css says otherwise)
  function label(parent, x, y, html, css) {
    return el('div', `position:absolute;left:${x}px;top:${y}px;font-size:18px;line-height:1.15;white-space:nowrap;${css || ''}`, parent, html);
  }
  function blockArrow(parent, x, yMid, color, html) {
    const lab = el('div', `position:absolute;left:${x - 30}px;top:${yMid - 42}px;width:${WA + 60}px;transform:translateY(-100%);` +
      `text-align:center;font-size:20px;font-weight:700;line-height:1.2;color:${color};`, parent, html);
    const svg = `<svg style="display:block" width="150" height="64" viewBox="0 0 150 64"><path d="M0 18 H96 V0 L150 32 L96 64 V46 H0 Z" fill="${color}"/></svg>`;
    return [lab, el('div', `position:absolute;left:${x + 20}px;top:${yMid - 32}px;`, parent, svg)];
  }

  // two-band Peierls dispersion at generic filling (as on slide 10)
  function peierlsBand(n, D) {
    const Q = n * PI, mu = Peierls.mu(n), xi = k => -2 * Math.cos(k) - mu;
    return k => {
      const a = xi(k), b = xi(k - Math.sign(k || 1) * Q), m = (a + b) / 2, h = (a - b) / 2;
      return m + Math.sign(h || 1) * Math.sqrt(h * h + D * D);
    };
  }
  // linear interpolation through (xs, ys): the data's two edge (ABS) branches as functions of k_y
  function interp(xs, ys) {
    return x => {
      let lo = 0, hi = xs.length - 1;
      if (x <= xs[0]) return ys[0]; if (x >= xs[hi]) return ys[hi];
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; }
      const t = (x - xs[lo]) / (xs[hi] - xs[lo]);
      return ys[lo] + t * (ys[hi] - ys[lo]);
    };
  }

  function build(stage) {
    const root = el('div', 'position:absolute;inset:0;', stage);
    const layer = () => el('div', 'position:absolute;inset:0;transition:opacity .6s;', root);
    const tint2 = layer(), grp = {}, fade = {};               // the SC row's tint lies under every panel
    ORDER.forEach(key => { grp[key] = layer(); fade[key] = [grp[key]]; });
    fade.a2.push(tint2);
    const geo = ROWS.map(r => ({ box: r.top, spec: r.top + r.picH + 6 + GAP, cH: r.picH + 6 + GAP + SPEC_H }));
    ROWS.forEach((r, i) => {
      const d = grp['a' + (i + 1)], g = geo[i];
      if (r.tint) el('div', `position:absolute;left:92px;right:26px;top:${r.pill - 14}px;height:${g.cH + r.top - r.pill + 30}px;` +
        `background:${r.tint};border-radius:24px;`, tint2);
      el('div', `position:absolute;left:${XC + WC / 2}px;top:${r.pill}px;transform:translateX(-50%);background:${r.color};` +
        'color:#F5F2EC;font-weight:bold;font-size:28px;letter-spacing:.06em;text-transform:uppercase;padding:9px 30px;' +
        'border-radius:999px;white-space:nowrap;', d, r.name);
      const yMid = g.spec + PAD[1] + (SPEC_H - PAD[1] - PAD[3]) / 2;
      blockArrow(grp['c' + (i + 1)], XA1, yMid, r.color, r.arrows[0]);
      const arr = blockArrow(grp['d' + (i + 1)], XA2, yMid, r.color, r.arrows[1]);
      if (i === 1) { arr[0].dataset.id = 'sc-arrowLab'; arr[1].dataset.id = 'sc-arrow'; }   // auto-animate from slide 28
    });
    const P = G.PART3, kc = P.meta.kc;
    let k = 1, tStart = null;
    const tC = { c1: null, c2: null };                       // when each c panel's softening series started
    const xL = XL + PAD[0], xR = XR + PAD[0], chip = 'background:rgba(244,239,227,0.85);padding:1px 6px;border-radius:4px;';

    // ---- row 1 ------------------------------------------------------------------------------------
    const g1 = geo[0];
    const a1cv = inkBox(grp.a1, xL, g1.box), d1cv = inkBox(grp.d1, xR, g1.box);
    const chainOpt = { width: BOX_W, height: BOX_H, ionD: 20, yIon: 0.6, springWidth: 2, coils: 3, springAmp: 5 };
    const a1 = new Chain(a1cv, Object.assign({ N: 8 }, chainOpt));
    const d1 = new Chain(d1cv, Object.assign({ N: 9 }, chainOpt, { yIon: 0.5 }));
    for (const c of [a1, d1]) Object.assign(c.cloud, { n: NF, dotsPerElectron: 60, sigmaY: 0.28 });
    // (6 Nov) captions above the pictures, as in row 2
    label(grp.a1, xL, g1.box - 24, 'Uniform lattice', `color:${MUTED};`);
    label(grp.d1, xR, g1.box - 24, 'Distorted lattice', `color:${MUTED};`);
    const kF = Peierls.kF(NF), muF = Peierls.mu(NF), q2kF = Math.min(2 * kF, 2 * PI - 2 * kF);
    const bandOpt = { xlim: [-PI, PI], ylim: [-2.6, 2.6], xticks: [[-kF, '−k_F'], [kF, '+k_F']], yticks: [[0, '0']],
      xlabel: 'k', ylabel: 'E', ylabelAt: 1.7 };          // y labels up the axis, away from the 0 tick (6 Nov)
    const b1 = axesAt(grp.b1, XL, g1.spec, WS, SPEC_H, bandOpt);
    const e1 = axesAt(grp.e1, XR, g1.spec, WS, SPEC_H, bandOpt);
    const c1 = axesAt(grp.c1, XC, g1.box, WC, g1.cH, { pad: PAD_C, xlim: [0, PI], ylim: [-1.1, 4.4], xticks: [[0, '0'], [q2kF, '2k_F']],
      yticks: [[0, '0']], xlabel: 'q', ylabel: 'ω^2_{ph}', ylabelAt: 3.1 });
    const cur = Peierls.chiCurve(NF, T), gc = Math.sqrt(Peierls.lambdaC(NF, T)), gs = [0.45, 0.7, 0.9, 1.06].map(f => f * gc);
    const gapped = peierlsBand(NF, 0.55);

    // ---- row 2 ------------------------------------------------------------------------------------
    const g2 = geo[1], PIC_W = WS, PIC_H = ROWS[1].picH;
    const pic = (parent, x) => {
      const cv = el('canvas', `position:absolute;left:${x}px;top:${g2.box}px;width:${PIC_W}px;height:${PIC_H}px;`, parent);
      return cv;
    };
    const a2cv = pic(grp.a2, XL), d2cv = pic(grp.d2, XR);
    label(grp.a2, xL, g2.box - 24, 'Uniform pair density along edge', `color:${MUTED};`).dataset.id = 'sc-capU';
    label(grp.d2, xR, g2.box - 24, 'Pair density wave (PDW) along edge', `color:${MUTED};`).dataset.id = 'sc-capP';
    const absOpt = { xlim: [-PI, PI], ylim: [-2.2, 2.2], xticks: [[-kc, '−k_c'], [kc, '+k_c']], yticks: [[0, '0']],
      xlabel: 'k_y', ylabel: 'E', ylabelAt: 1.45 };
    const b2 = axesAt(grp.b2, XL, g2.spec, WS, SPEC_H, absOpt);
    const e2 = axesAt(grp.e2, XR, g2.spec, WS, SPEC_H, absOpt);
    // (6 Nov) data-ids: slide 28 (17_pdw_spectrum) glides its pictures, plots and arrow into these on ?kohn
    a2cv.dataset.id = 'sc-edgeU'; d2cv.dataset.id = 'sc-edgeP'; b2.cv.parentNode.dataset.id = 'sc-bandsU'; e2.cv.parentNode.dataset.id = 'sc-bandsP';
    const c2 = axesAt(grp.c2, XC, g2.box, WC, g2.cH, { pad: PAD_C, xlim: [0, 1.25], ylim: [-1.1, 4.4], xticks: [[0, '0'], [1, '2k_c']],
      yticks: [[0, '0']], xlabel: 'q_y', ylabel: 'λ_n', ylabelAt: 3.1 });
    c1.cv.parentNode.dataset.id = 'kohn-c1'; c2.cv.parentNode.dataset.id = 'kohn-c2';   // -> the merged Kohn slide (20_sc_kohn)
    // bulk continuum edge per k_y bin: smallest |E| among bulk-localised states
    const NB = 90, gapEdge = new Float32Array(NB).fill(9);
    const sp = P.spec_uniform;
    for (let i = 0; i < sp.ky.length; i++) {
      if (sp.xc[i] < 6 || sp.xc[i] > 15) continue;
      const b = Math.min(NB - 1, Math.floor((sp.ky[i] + PI) / (2 * PI) * NB));
      gapEdge[b] = Math.min(gapEdge[b], Math.abs(sp.E[i]));
    }
    const absL = interp(P.abs.ky, P.abs.left.E), absR = interp(P.abs.ky, P.abs.right.E);
    // (6 Nov, as the pptx) one ABS branch (the left edge); gapped: the same branch mixed with itself shifted by 2k_c,
    // a Peierls gap at +-k_c (as e1), schematic gap size
    const wrapK = k => ((k + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
    const gappedABS = kk => { const a = absL(kk), b = absL(wrapK(kk - Math.sign(kk || 1) * 2 * kc)), m = (a + b) / 2, h = (a - b) / 2;
      return m + Math.sign(h || 1) * Math.sqrt(h * h + 0.1); };
    // c2 schematic: rising stiffness with a softening dip at 2k_c, plus two grey higher branches
    const c2base = x => 0.25 + 3.2 * (1 - Math.cos(PI * x / 1.25)) / 2;
    const c2dip = x => Math.exp(-(((x - 1) / 0.05) ** 2));

    // labels on the plots (stage px from the axes' data coordinates)
    const at = (ax, x0, y0, X, Y) => { const [px, py] = ax.toPix(X, Y); return [x0 + px, y0 + py]; };
    const mid = `transform:translateX(-50%);color:${BLUE};${chip}`;
    // band captions in the same chip style as row 2, under row 1's shallow bands
    let [lx, ly] = at(b1, XL, g1.spec, 0, -1.55); label(grp.b1, lx, ly, 'Metallic band', mid);
    [lx, ly] = at(e1, XR, g1.spec, 0, -1.55); label(grp.e1, lx, ly, 'Insulating band', mid);
    [lx, ly] = at(b2, XL, g2.spec, 0, -0.45); label(grp.b2, lx, ly, 'Dispersing ABS', mid);
    [lx, ly] = at(e2, XR, g2.spec, 0, -0.45); label(grp.e2, lx, ly, 'Gapped ABS', mid);
    [lx, ly] = at(c1, XC, g1.box, q2kF - 0.1, 4.3); label(grp.c1, lx, ly, 'Kohn anomaly', `color:${GREEN};transform:translateX(-100%);`);
    [lx, ly] = at(c1, XC, g1.box, q2kF + 0.12, -0.12); label(grp.c1, lx, ly, 'Softened<br>phonon', `color:${GREEN};`);
    [lx, ly] = at(c2, XC, g2.box, 0.96, 4.3); label(grp.c2, lx, ly, 'Superconducting<br>Kohn anomaly', `color:${GREEN};text-align:right;transform:translateX(-100%);`);
    [lx, ly] = at(c2, XC, g2.box, 0.94, -0.12); label(grp.c2, lx, ly, 'Softened<br>pair fluctuation', `color:${GREEN};text-align:right;transform:translateX(-100%);`);

    let pd = null, absSpr = null, staticDone = false, d2Done = false;
    function layout(kk) {
      k = kk;
      [b1, c1, e1, b2, c2, e2].forEach(a => a.layout(k));
      a1.layout(k); d1.layout(k);
      for (const cv of [a2cv, d2cv]) { cv.width = Math.round(PIC_W * k); cv.height = Math.round(PIC_H * k); }
      const GW = Math.round(SPAN3 * k), GH = Math.round((DEPTH3 + VAC3) * k);
      pd = Stipple.paper(GW, GH, { s: k, seed: 7 });
      const pc = pd.getContext('2d'); pc.fillStyle = BLACK; pc.fillRect(0, DEPTH3 * k, GW, GH);
      absSpr = Quasi.sprite(Quasi.ABS_D * 0.7, k);
      staticDone = false; d2Done = false;                   // canvases were resized: redraw
    }

    // double-headed arrow with a label above it (axes coordinates; the nesting vector on b1 / b2)
    function nesting(ax, x0, x1, y, lab) {
      const c = ax.ctx, [p0, py] = ax.toPix(x0, y), [p1] = ax.toPix(x1, y), h = 7;
      c.strokeStyle = BLACK; c.fillStyle = BLACK; c.lineWidth = 2; c.setLineDash([]);
      c.beginPath(); c.moveTo(p0 + 2, py); c.lineTo(p1 - 2, py); c.stroke();
      for (const [x, s] of [[p0, 1], [p1, -1]]) { c.beginPath(); c.moveTo(x, py); c.lineTo(x + s * 2 * h, py - h); c.lineTo(x + s * 2 * h, py + h); c.fill(); }
      c.textBaseline = 'bottom'; Axes.rich(c, lab, (p0 + p1) / 2, py - 6, 21, 'center', true);
    }
    function band(ax, pieces, kf) {
      ax.clear(); ax.clip(true);
      ax.fillRect(-PI, ax.o.ylim[0], PI, 0, 'rgba(22,20,20,0.06)');
      ax.hline(0, { color: BLACK, width: 1.2, dash: [] });
      for (const s of [-1, 1]) ax.vline(s * kf, { color: BLUE, width: 1.6, dash: [6, 5] });
      for (const [f, range, occ] of pieces) ax.line(f, { color: BLUE, width: occ ? 5 : 2.4, range });
      ax.clip(false); ax.frame();
    }
    function bulk(ax) {
      const cc = ax.ctx;
      cc.fillStyle = 'rgba(160,156,150,0.45)';
      for (let b = 0; b < NB; b++) {
        if (gapEdge[b] > 8) continue;
        const x0 = -PI + 2 * PI * b / NB, x1 = x0 + 2 * PI / NB, [p0, py0] = ax.toPix(x0, gapEdge[b]), [p1, py1] = ax.toPix(x1, 2.2);
        cc.fillRect(p0, py1, p1 - p0 + 0.5, py0 - py1);
        const [, q0] = ax.toPix(x0, -gapEdge[b]), [, q1] = ax.toPix(x1, -2.2);
        cc.fillRect(p0, q0, p1 - p0 + 0.5, q1 - q0);
      }
    }
    // a bracket with its label to the right (device px on a picture canvas: d1 under the ions, d2 in the vacuum)
    function bracket(c, x0, x1, y, lab, color) {
      const h = 6 * k;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 2 * k; c.setLineDash([]);
      c.beginPath(); c.moveTo(x0, y - h); c.lineTo(x0, y); c.lineTo(x1, y); c.lineTo(x1, y - h); c.stroke();
      c.textBaseline = 'middle'; c.setTransform(k, 0, 0, k, 0, 0);
      Axes.rich(c, lab, x1 / k + 8, y / k - 2, 17, 'left', true);
      c.setTransform(1, 0, 0, 1, 0, 0);
    }
    // the order parameter at the edge as a 3D surface, in the title slide's style: pdw = 0 is the uniform edge
    // (a2, with its Andreev bound states), pdw = 1 the full pair-density wave (d2). y runs along the edge.
    const SPAN3 = 520, DEPTH3 = 120, VAC3 = 62, PER3 = SPAN3 / 4, XI3 = 30, ZS = 130;
    const ramp3 = Surface3D.ramp(['#EEF1E8', '#E2EBD6', '#C9DCB3', '#8EB36B', '#3F7330']);
    function edge3D(cv, pdw) {
      const c = cv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      let P0 = null, P1 = null, PL = null;
      Surface3D.draw(c, {
        nx: 104, ny: 26, w: SPAN3 * k, h: DEPTH3 * k,
        z: (i, j) => {
          const x = i / 103 * SPAN3, d = DEPTH3 * (1 - j / 25), e = Math.exp(-d / XI3);
          return (0.32 - (1 - pdw) * 0.22 * e + pdw * 0.3 * e * Math.cos(2 * PI * x / PER3)) * ZS * k;
        },
        zTop: 0.62 * ZS * k, zBot: 0, fitZ: 0.62 * ZS * k, yaw: 0, elev: 0.62, persp: 0.5,
        fit: { x: 2 * k, y: 2 * k, w: cv.width - 4 * k, h: cv.height - 4 * k },
        flatFit: { x: 0, y: 0, w: cv.width, h: cv.height }, blend: 1,
        ground: { img: pd, sx: 0, sy: 0, sw: SPAN3 * k, sh: (DEPTH3 + VAC3) * k, extra: VAC3 * k },
        onGround: proj => {
          const yv = (DEPTH3 + 0.55 * VAC3) * k;              // a line along the middle of the vacuum strip
          PL = proj(0.03 * SPAN3 * k, yv, 0);
          P0 = proj(2.5 * PER3 * k, yv, 0); P1 = proj(3.5 * PER3 * k, yv, 0);
          if (pdw < 1) for (let q = 0; q < 12; q++) {         // ABS along the edge, gapped out as the PDW grows
            const [X, Y, sc] = proj((q + 0.5) * SPAN3 / 12 * k, (DEPTH3 - 6) * k, 3 * k), dd = absSpr.width * sc * (1 - 0.5 * pdw);
            c.globalAlpha = 1 - 0.85 * pdw; c.drawImage(absSpr, X - dd / 2, Y - dd / 2, dd, dd); c.globalAlpha = 1;
          }
        },
        ramp: ramp3, alpha: 0.88, frontLine: '#2F5A22', frontWidth: 2 * k, skirt: 'rgba(214,232,196,0.6)'
      });
      // labels on the vacuum strip: the order parameter, and the period of the PDW
      c.setTransform(k, 0, 0, k, 0, 0); c.fillStyle = '#F5F2EC'; c.textBaseline = 'middle';
      // (6 Nov) no Delta ~ const / Delta(y) ~ cos(2k_c y) labels
      if (cv === d2cv) {
        c.setTransform(1, 0, 0, 1, 0, 0); c.strokeStyle = '#F5F2EC'; c.lineWidth = 2 * k;
        const h = 5 * k;
        c.beginPath(); c.moveTo(P0[0], P0[1] - h); c.lineTo(P0[0], P0[1]); c.lineTo(P1[0], P1[1]); c.lineTo(P1[0], P1[1] - h); c.stroke();
        c.setTransform(k, 0, 0, k, 0, 0); Axes.rich(c, 'π/k_c', P1[0] / k + 6, P1[1] / k - 1, 16, 'left', true);
      }
      c.setTransform(1, 0, 0, 1, 0, 0);
    }
    function drawStatic() {
      // row 1: metallic band (occupied part thick), gapped band in three pieces (no lines through the gap)
      band(b1, [[kk => Peierls.eps(kk) - muF, [-PI, PI]], [kk => Peierls.eps(kk) - muF, [-kF, kF], true]], kF);
      nesting(b1, -kF, kF, 1.15, '2k_F');
      band(e1, [[gapped, [-PI, -kF - 1e-4]], [gapped, [-kF + 1e-4, kF - 1e-4], true], [gapped, [kF + 1e-4, PI]]], kF);
      // row 2: ABS branches (data) over the bulk continuum; gapped: the branches anticross at +-k_c
      for (const [ax, pdw] of [[b2, false], [e2, true]]) {
        ax.clear(); ax.clip(true);
        ax.fillRect(-PI, -2.2, PI, 0, 'rgba(22,20,20,0.06)');
        bulk(ax);
        ax.hline(0, { color: BLACK, width: 1.2, dash: [] });
        for (const s of [-1, 1]) ax.vline(s * kc, { color: BLUE, width: 1.6, dash: [6, 5] });
        if (!pdw) ax.line(absL, { color: BLUE, width: 3.5 });
        else for (const r of [[-PI, -kc - 1e-4], [-kc + 1e-4, kc - 1e-4], [kc + 1e-4, PI]]) ax.line(gappedABS, { color: BLUE, width: 3.5, range: r });
        ax.clip(false); ax.frame();
      }
      nesting(b2, -kc, kc, 0.55, '2k_c');
      edge3D(a2cv, 0);
      staticDone = true;
    }
    function series(ax, curves, nShow, bare, extra) {
      ax.clear(); ax.clip(true);
      ax.fillRect(ax.o.xlim[0], ax.o.ylim[0], ax.o.xlim[1], 0, 'rgba(22,20,20,0.06)');
      ax.hline(0, { color: BLACK, width: 1.2, dash: [] });
      if (bare) ax.line(bare, { color: GREEN, width: 1.8, dash: [7, 6] });
      if (extra) extra();
      ax.line(curves, { color: SHADES[3], width: 4 });          // (6 Nov) one curve, animated (see frame)
      ax.clip(false); ax.frame();
    }
    function downArrow(ax, x, yTop, yTip) {
      const c = ax.ctx, [px, p0] = ax.toPix(x, yTop), [, p1] = ax.toPix(x, yTip);
      c.strokeStyle = GREEN; c.fillStyle = GREEN; c.lineWidth = 2.2; c.setLineDash([]);
      c.beginPath(); c.moveTo(px, p0); c.lineTo(px, p1 - 12); c.stroke();
      c.beginPath(); c.moveTo(px, p1); c.lineTo(px - 7, p1 - 14); c.lineTo(px + 7, p1 - 14); c.fill();
    }
    const c1curves = gs.map(g => [Array.from(cur.q), Array.from(cur.q, (q, j) => Peierls.w0sq(q) * (1 - g * g * cur.s[j]))]);
    const xs2 = Array.from({ length: 300 }, (_, i) => 1.25 * i / 299);
    const c2curves = [0.15, 0.45, 0.75, 1.08].map(s => [xs2, xs2.map(x => c2base(x) * (1 - s * 0.92 * c2dip(x)) - (s > 1 ? 0.6 * c2dip(x) : 0))]);
    const ys1 = c1curves[0][1], dip1 = Math.min(...ys1.filter((_, j) => Math.abs(cur.q[j] - q2kF) < 0.15));
    function frame(now) {
      if (tStart === null) tStart = now;
      for (const key in tC) if (tC[key] === null) tC[key] = now;
      const t = (now - tStart) / 1000;
      // (6 Nov) the Kohn anomaly as one curve that softens and recovers on a loop: 3 s soften, 1.5 s hold at the
      // softened mode, 1.5 s back to the bare dispersion; restarts when the panel appears
      const soft = key => { const u = ((now - tC[key]) / 1000) % 6;
        return u < 3 ? 0.5 - 0.5 * Math.cos(PI * u / 3) : u < 4.5 ? 1 : 0.5 + 0.5 * Math.cos(PI * (u - 4.5) / 1.5); };
      const s1 = soft('c1'), s2 = soft('c2'), g1 = s1 * gs[3];
      if (!staticDone) drawStatic();
      if (!d2Done) { edge3D(d2cv, 1); d2Done = true; }            // the PDW, static (6 Nov)
      series(c1, [cur.q, Array.from(cur.q, (q, j) => Peierls.w0sq(q) * (1 - g1 * g1 * cur.s[j]))], 0, q => Peierls.w0sq(q),
        () => downArrow(c1, q2kF, 4.25, dip1 + 0.3));
      const c2now = [xs2, xs2.map(x => c2base(x) * (1 - s2 * 1.08 * 0.92 * c2dip(x)) - (s2 * 1.08 > 1 ? 0.6 * (s2 * 1.08 - 1) / 0.08 * c2dip(x) : 0))];
      series(c2, c2now, 0, x => c2base(x), () => {                    // dashed bare branch (as c1); grey higher branches
        for (const off of [1.0, 1.9]) c2.line([xs2, xs2.map(x => 0.6 * c2base(x) + off + 0.3 * x)], { color: '#A8A39C', width: 2 });
        downArrow(c2, 1, 4.25, c2base(1) * (1 - 0.15 * 0.92) + 0.3);
      });
      // chains: a1 uniform, d1 frozen 2k_F distortion with the matching CDW (period 3 shown)
      for (let i = 0; i < a1.N; i++) a1.u[i] = 0.01 * Math.sin(2 * t + 1.7 * i);
      const Qd = 2 * PI / 3;
      for (let i = 0; i < d1.N; i++) d1.u[i] = 0.17 * Math.cos(Qd * i);
      Object.assign(d1.cloud, { q: Qd, phase: 0, mod: 0.75 });
      a1.draw(); d1.draw();
      const a = d1.a * k;                                     // the period pi/k_F under the ions (three sites)
      bracket(d1.ctx, 3.5 * a, 6.5 * a, d1.cv.height * 0.84, 'π/k_F', BLACK);
      requestAnimationFrame(frame);
    }
    let shown = ORDER.length;
    function show(n) {
      ORDER.forEach((key, q) => {
        const on = q < n;
        if (on && q >= shown && key in tC) tC[key] = null;      // a c panel appearing replays its softening
        fade[key].forEach(d => { d.style.opacity = on ? 1 : GHOST; });
      });
      shown = n;
    }
    // c2Box: the c2 panel's footprint (stage px), for the 'Did I find a superconducting Kohn anomaly?' frame
    // ghost(keys): those panels faint (as the ghosts of show), the rest untouched; ?kohn ghosts c2 (6 Nov)
    // ghost(keys, op, grey): opacity op (default GHOST), optionally greyscale (?kohn greys the conventional row)
    function ghost(keys, op, grey) { keys.forEach(key => fade[key].forEach(d => { d.style.opacity = op === undefined ? GHOST : op; if (grey) d.style.filter = 'grayscale(0.85)'; })); }
    return { layout, start() { requestAnimationFrame(frame); }, show, ghost, c2Box: { x: XC, y: g2.box, w: WC, h: g2.cH } };
  }
  G.Roadmap = { build };
})(window);
