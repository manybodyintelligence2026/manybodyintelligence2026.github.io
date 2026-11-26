// opsurf.js: an order parameter as a 3D surface over the strip, in the lattice's camera (lib/lattice.js), for
// "Order parameters" (13) and "The edge PDW" (16), drawn like the condensate on slide 10: smooth height ramp,
// translucent, no mesh, dark outlines along the edges.
//   OPSurf.draw(ctx, { cam, A, B, HZ, grid, nx, ny, lo, hi, col, labels })
//     cam: Lattice.camera fitted to the box; A, B, HZ: box along / across / height (world units)
//     grid(i, j): value at across index i (0 = x = 1, the blue edge) and along index j, or null; nx x ny samples
//     lo, hi: value range of the box; col: [r, g, b]; labels: draw min / max on the leftmost vertical edge
//     xAt(i), xN: optional site position (1..xN) of across sample i (bond channels sit at half-integer x)
(function (G) {
  'use strict';
  function draw(ctx, o) {
    const { cam, A, B, HZ, nx, ny, lo, hi, col } = o, P = q => cam.proj(q);
    // x = 1 sits at across = B (back-left, as the mirrored lattice); along runs 0..A
    const xAt = o.xAt || (i => 1 + i * ((o.xN || nx) - 1) / (nx - 1)), xN = o.xN || nx;   // site position of sample i
    const X = i => B * (1 - (xAt(i) - 1) / (xN - 1)), Y = j => A * j / (ny - 1), Z = v => (v - lo) / (hi - lo || 1) * HZ;
    const line = (q1, q2) => { const a1 = P(q1), a2 = P(q2); ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.stroke(); };
    ctx.strokeStyle = '#C9C5BE'; ctx.lineWidth = 1.5;
    for (const z of [0, HZ]) { line([0, 0, z], [A, 0, z]); line([A, 0, z], [A, B, z]); line([A, B, z], [0, B, z]); line([0, B, z], [0, 0, z]); }
    for (const [a, b] of [[0, 0], [A, 0], [A, B], [0, B]]) line([a, b, 0], [a, b, HZ]);
    // the condensate look of slide 10 (Surface3D in 04_edge_pdw): a smooth height ramp from near-white (low) to the
    // channel colour (high), translucent, no mesh, and a dark outline along the edges
    const mix = f => col.map(c => c + f * (255 - c)), STOPS = [mix(0.9), mix(0.72), mix(0.42), mix(0.08)];
    const ramp = t => { const u = Math.max(0, Math.min(1, t)) * 3, k0 = Math.min(2, Math.floor(u)), f = u - k0;
      return STOPS[k0].map((c, m) => c + f * (STOPS[k0 + 1][m] - c)); };
    const deep = col.map(c => Math.round(0.45 * c));
    const L = (() => { const v = [-0.45, 0.55, 0.7], n = Math.hypot(...v); return v.map(c => c / n); })();
    // across samples refined 3x (linear) so the profile reads smooth
    const SUB = 3, NXF = (nx - 1) * SUB + 1;
    const gf = (I, j) => { const i0 = Math.floor(I / SUB), f = I / SUB - i0; if (f === 0) return o.grid(i0, j);
      const a = o.grid(i0, j), b = o.grid(i0 + 1, j); return a === null || b === null || a === undefined || b === undefined ? null : a + f * (b - a); };
    const XF = I => { const i0 = Math.floor(I / SUB), f = I / SUB - i0; return f === 0 ? X(i0) : X(i0) + f * (X(i0 + 1) - X(i0)); };
    const quads = [];
    for (let I = 0; I + 1 < NXF; I++) for (let j = 0; j + 1 < ny; j++) {
      const v = [gf(I, j), gf(I + 1, j), gf(I + 1, j + 1), gf(I, j + 1)];
      if (v.some(t => t === null || t === undefined || !isFinite(t))) continue;
      const w = [[Y(j), XF(I), Z(v[0])], [Y(j), XF(I + 1), Z(v[1])], [Y(j + 1), XF(I + 1), Z(v[2])], [Y(j + 1), XF(I), Z(v[3])]];
      const u1 = w[2].map((c, m) => c - w[0][m]), u2 = w[3].map((c, m) => c - w[1][m]);
      const nrm = [u1[1] * u2[2] - u1[2] * u2[1], u1[2] * u2[0] - u1[0] * u2[2], u1[0] * u2[1] - u1[1] * u2[0]];
      const nn = Math.hypot(...nrm) || 1, dot = Math.abs((nrm[0] * L[0] + nrm[1] * L[1] + nrm[2] * L[2]) / nn);
      const pts = w.map(P);
      quads.push({ d: pts.reduce((s2, t) => s2 + t[2], 0) / 4, pts, zt: (w[0][2] + w[1][2] + w[2][2] + w[3][2]) / (4 * HZ), sh: 0.9 + 0.12 * dot });
    }
    quads.sort((a, b) => a.d - b.d);
    const outline = () => { ctx.strokeStyle = `rgb(${deep.join(',')})`; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; };
    const curve = pts => { ctx.beginPath(); let on = false;
      for (const q of pts) { if (!q) { on = false; continue; } const p = P(q); on ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); on = true; } ctx.stroke(); };
    const row = i => Array.from({ length: ny }, (_, j) => { const v = o.grid(i, j); return v === null || v === undefined ? null : [Y(j), X(i), Z(v)]; });
    outline(); ctx.save(); ctx.globalAlpha = 0.6; curve(row(0)); ctx.restore();   // the far edge row (x = 1), behind
    ctx.save(); ctx.globalAlpha = o.alpha === undefined ? 0.86 : o.alpha;
    for (const q of quads) {
      const rgb = ramp(q.zt).map(c => Math.min(255, Math.round(c * q.sh)));
      ctx.fillStyle = ctx.strokeStyle = `rgb(${rgb.join(',')})`; ctx.lineWidth = 0.8;   // stroke in the fill colour hides seams
      ctx.beginPath(); q.pts.forEach((p, m) => m ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    // outlines in front: the near cross-section (along = 0) and the near edge row (x = Nx, along y)
    outline();
    curve(Array.from({ length: NXF }, (_, I) => { const v = gf(I, 0); return v === null || v === undefined ? null : [0, XF(I), Z(v)]; }));
    curve(row(nx - 1));
    if (o.labels !== false) {
      const edges = [[0, 0], [A, 0], [A, B], [0, B]].map(([a, b]) => [P([a, b, HZ]), P([a, b, 0])]);
      const [top, bot] = edges.reduce((m, e) => e[0][0] < m[0][0] ? e : m);
      const fmt = u => (Math.abs(u) < 5e-3 ? 0 : u).toFixed(2);
      ctx.fillStyle = '#161414'; ctx.font = 'bold 24px "Fira Sans", Arial, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(fmt(hi), top[0] - 8, top[1]); ctx.fillText(fmt(lo), bot[0] - 8, bot[1]);
    }
  }
  G.OPSurf = { draw };
})(window);
