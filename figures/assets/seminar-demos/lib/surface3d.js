// surface3d.js: a shaded height field drawn with a simple 3D camera on a 2D canvas.
// World: X across (0..w), Y towards the viewer (0..h; Y = h is the front edge), Z up.
// Camera: yaw about Z, elevation e (90 deg = straight down), optional perspective. The projection is
// fitted into a target rectangle; at yaw 0, elevation 90 deg and no perspective it reproduces the flat
// top view exactly, so a slide can morph continuously from its 2D picture into 3D.
// Quads are painted far-to-near (sorted by camera depth) with Lambert shading and a height colour ramp.
//
// Surface3D.draw(ctx, {
//   nx, ny, w, h,            grid size and world footprint (device px)
//   z(i, j),                 height (device px) at grid point (i, j); j = ny-1 is the front edge
//   zTop, zBot,              heights mapped to the top / bottom of the colour ramp
//   yaw, elev, persp,        radians, radians, perspective strength (0 = orthographic)
//   fit: {x, y, w, h},       target rectangle; the projected surface is scaled to fill it
//   flatFit: {x, y, w, h},   where the top view sits (used when the camera is at the top view)
//   blend,                   0 = flatFit placement, 1 = fitted placement (interpolated)
//   fitZ,                    optional: also fit the box from z = 0 to fitZ, so a surface whose heights change
//                            (but stay below fitZ) keeps a fixed placement instead of rescaling every frame
//   ramp(t) -> [r, g, b], alpha, frontLine, frontWidth, skirt
//   ground: {img, sx, sy, sw, sh, extra}   optional textured plane at z = 0 under the surface: the image
//            region (sx, sy, sw, sh) covers world Y from 0 to h + extra (the extra part lies beyond the
//            front edge), mapped in perspective with small affine-textured triangles
//   onGround(proj)           optional callback after the ground, before the surface; proj(X, Y, z) returns
//                            [screenX, screenY, scale] for drawing objects (e.g. particles) in the scene
// Faces: the skirt colour fills all four sides of the block between the surface edge and z = 0; faces
// turned away from the camera are drawn behind the surface, faces towards it in front.
// })
(function (G) {
  'use strict';
  function draw(ctx, o) {   // ctx is reassigned to an offscreen layer while the surface is painted
    const { nx, ny, w, h } = o, N = nx * ny;
    const dx = w / (nx - 1), dy = h / (ny - 1);
    const cy = Math.cos(o.yaw), sy0 = Math.sin(o.yaw), ce = Math.cos(o.elev), se = Math.sin(o.elev);
    const Z = new Float32Array(N), U = new Float32Array(N), V = new Float32Array(N), Dp = new Float32Array(N);
    const D0 = Math.max(w, h) * 2.4;
    let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
    const project = (X, Y, z, out, p) => {
      const x = X - w / 2, y = Y - h / 2;
      const xr = x * cy - y * sy0, yr = x * sy0 + y * cy;      // yaw
      const v = yr * se - z * ce;                              // screen down
      const depth = -yr * ce - z * se;                         // larger = farther
      const f = 1 / (1 + (o.persp || 0) * depth / D0);
      out.U[p] = xr * f; out.V[p] = v * f; out.D[p] = depth;
      if (out.F) out.F[p] = f;
    };
    const buf = { U, V, D: Dp };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const p = j * nx + i, z = o.z(i, j);
      Z[p] = z; project(i * dx, j * dy, z, buf, p);
      if (U[p] < umin) umin = U[p]; if (U[p] > umax) umax = U[p];
      if (V[p] < vmin) vmin = V[p]; if (V[p] > vmax) vmax = V[p];
    }
    // the skirt's bottom edge (front edge at z = 0) also counts for the fit
    const sk = { U: new Float32Array(nx), V: new Float32Array(nx), D: new Float32Array(nx) };
    for (let i = 0; i < nx; i++) {
      project(i * dx, h, 0, sk, i);
      if (sk.V[i] > vmax) vmax = sk.V[i]; if (sk.V[i] < vmin) vmin = sk.V[i];
    }
    if (o.ground) {                                   // the ground's far corners count for the fit too
      const Ht = h + (o.ground.extra || 0), tmp = { U: [0], V: [0], D: [0] };
      for (const [X, Y] of [[0, 0], [w, 0], [0, Ht], [w, Ht]]) {
        project(X, Y, 0, tmp, 0);
        umin = Math.min(umin, tmp.U[0]); umax = Math.max(umax, tmp.U[0]);
        vmin = Math.min(vmin, tmp.V[0]); vmax = Math.max(vmax, tmp.V[0]);
      }
    }
    if (o.fitZ !== undefined) {                       // fit a fixed box (z from 0 to fitZ), not the moving surface
      const tmp = { U: [0], V: [0], D: [0] };
      for (const [X, Y] of [[0, 0], [w, 0], [0, h], [w, h]]) for (const z of [0, o.fitZ]) {
        project(X, Y, z, tmp, 0);
        umin = Math.min(umin, tmp.U[0]); umax = Math.max(umax, tmp.U[0]);
        vmin = Math.min(vmin, tmp.V[0]); vmax = Math.max(vmax, tmp.V[0]);
      }
    }
    // placement: fitted (3D) blended with the flat top-view placement
    const F = o.fit, s1 = Math.min(F.w / (umax - umin), F.h / (vmax - vmin));
    const ox1 = F.x + (F.w - s1 * (umax - umin)) / 2 - s1 * umin, oy1 = F.y + (F.h - s1 * (vmax - vmin)) / 2 - s1 * vmin;
    const P = o.flatFit, s0 = P.w / w, ox0 = P.x + P.w / 2, oy0 = P.y + P.h / 2;
    const b = o.blend === undefined ? 1 : o.blend, s = s0 + (s1 - s0) * b, ox = ox0 + (ox1 - ox0) * b, oy = oy0 + (oy1 - oy0) * b;
    const SX = u => ox + s * u, SY = v => oy + s * v;

    if (o.ground) {                                   // textured ground plane, drawn first (it is underneath)
      const g = o.ground, GX = 24, GY = 12, Ht = h + (g.extra || 0), tmp = { U: [0], V: [0], D: [0] };
      const pt = (X, Y) => { project(X, Y, 0, tmp, 0); return [SX(tmp.U[0]), SY(tmp.V[0])]; };
      ctx.save(); ctx.globalAlpha = o.groundAlpha === undefined ? 1 : o.groundAlpha;
      // solid underlay (hides seams between textured triangles) and a solid region beyond the front edge
      const poly = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([x, y], q) => q ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
      poly([pt(0, 0), pt(w, 0), pt(w, h), pt(0, h)], g.base || '#F4EFE3');
      if (g.extra) poly([pt(0, h), pt(w, h), pt(w, Ht), pt(0, Ht)], g.beyond || '#161414');
      const GYt = Math.max(1, Math.round(GY * h / Ht));           // texture only the part in front of the edge
      for (let j = 0; j < GYt; j++) for (let i = 0; i < GX; i++) {
        const X0 = w * i / GX, X1 = w * (i + 1) / GX, Y0 = h * j / GYt, Y1 = h * (j + 1) / GYt;
        const shT = g.sh * h / Ht;
        const s0 = [g.sx + g.sw * i / GX, g.sy + shT * j / GYt], s1 = [g.sx + g.sw * (i + 1) / GX, g.sy + shT * j / GYt];
        const s2 = [g.sx + g.sw * (i + 1) / GX, g.sy + shT * (j + 1) / GYt], s3 = [g.sx + g.sw * i / GX, g.sy + shT * (j + 1) / GYt];
        const d0 = pt(X0, Y0), d1 = pt(X1, Y0), d2 = pt(X1, Y1), d3 = pt(X0, Y1);
        texTri(ctx, g.img, s0, s1, s2, d0, d1, d2);
        texTri(ctx, g.img, s0, s2, s3, d0, d2, d3);
      }
      // ink outline of the ground plane, so it reads against a light page
      ctx.globalAlpha = 1; ctx.strokeStyle = g.outline || '#161414'; ctx.lineWidth = g.outlineWidth || 3; ctx.lineJoin = 'round';
      ctx.beginPath(); [pt(0, 0), pt(w, 0), pt(w, Ht), pt(0, Ht)].forEach(([x, y], q) => q ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath(); ctx.stroke();
      ctx.restore();
    }
    if (o.onGround) {
      const tmp = { U: [0], V: [0], D: [0], F: [0] };
      o.onGround((X, Y, z) => { project(X, Y, z, tmp, 0); return [SX(tmp.U[0]), SY(tmp.V[0]), s * tmp.F[0]]; });
    }

    // side faces of the block: each is the surface's boundary curve plus its foot at z = 0
    const faces = [];
    if (o.skirt) {
      const tmp = { U: [0], V: [0], D: [0] };
      const foot = (i, j) => { project(i * dx, j * dy, 0, tmp, 0); return [SX(tmp.U[0]), SY(tmp.V[0])]; };
      const edge = idx => idx.map(p => [SX(U[p]), SY(V[p])]);
      const mk = (list, ij) => {
        const top = edge(list), bot = ij.map(([i, j]) => foot(i, j)).reverse(), poly = top.concat(bot);
        let area = 0;                                            // screen orientation decides front/back
        for (let q = 0; q < poly.length; q++) { const [x1, y1] = poly[q], [x2, y2] = poly[(q + 1) % poly.length]; area += x1 * y2 - x2 * y1; }
        return { poly, area };
      };
      const r = (n, f) => Array.from({ length: n }, (_, t) => f(t));
      // walk each face so that a face pointing at the camera has positive screen area
      faces.push(mk(r(nx, i => (ny - 1) * nx + i), r(nx, i => [i, ny - 1])));             // front (y = h)
      faces.push(mk(r(nx, i => nx - 1 - i), r(nx, i => [nx - 1 - i, 0])));                 // back (y = 0)
      faces.push(mk(r(ny, j => j * nx), r(ny, j => [0, j])));                              // left (x = 0)
      faces.push(mk(r(ny, j => (ny - 1 - j) * nx + nx - 1), r(ny, j => [nx - 1, ny - 1 - j])));   // right
    }
    const fillFace = f => {
      ctx.beginPath(); f.poly.forEach(([x, y], q) => q ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
    };
    if (faces.length) {
      ctx.save(); ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha; ctx.fillStyle = o.skirt;
      faces.filter(f => f.area < 0).forEach(fillFace);
      ctx.restore();
    }

    // light from the upper left and slightly towards the viewer (world frame)
    const L = [-0.45, 0.35, 0.82], ln = Math.hypot(...L), lx = L[0] / ln, ly = L[1] / ln, lz = L[2] / ln;
    const quads = [];
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      quads.push([a, (Dp[a] + Dp[a + 1] + Dp[a + nx] + Dp[a + nx + 1]) / 4]);
    }
    quads.sort((p, q) => q[1] - p[1]);
    // The surface is painted opaque on an offscreen layer and composited once, so a translucent
    // surface shows no seams where neighbouring quads overlap.
    const outer = ctx, alphaS = o.alpha === undefined ? 1 : o.alpha;
    let layer = draw._layer;
    if (!layer || layer.width !== outer.canvas.width || layer.height !== outer.canvas.height) {
      layer = draw._layer = document.createElement('canvas');
      layer.width = outer.canvas.width; layer.height = outer.canvas.height;
    }
    ctx = layer.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, layer.width, layer.height);
    ctx.save();
    ctx.lineJoin = 'round';
    const zb = o.zBot || 0;
    for (const [a] of quads) {
      const bq = a + 1, c = a + nx + 1, d = a + nx;
      const gx = ((Z[bq] + Z[c]) - (Z[a] + Z[d])) / (2 * dx), gy = ((Z[d] + Z[c]) - (Z[a] + Z[bq])) / (2 * dy);
      const nl = Math.hypot(gx, gy, 1), lam = Math.max(0, (-gx * lx - gy * ly + lz) / nl);
      const shade = 0.42 + 0.72 * lam;
      const t = Math.min(1, Math.max(0, ((Z[a] + Z[bq] + Z[c] + Z[d]) / 4 - zb) / (o.zTop - zb)));
      const [r, g, bb] = o.ramp(t);
      const col = `rgb(${Math.min(255, r * shade) | 0},${Math.min(255, g * shade) | 0},${Math.min(255, bb * shade) | 0})`;
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(SX(U[a]), SY(V[a])); ctx.lineTo(SX(U[bq]), SY(V[bq])); ctx.lineTo(SX(U[c]), SY(V[c])); ctx.lineTo(SX(U[d]), SY(V[d]));
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    ctx = outer;
    ctx.save(); ctx.globalAlpha = alphaS; ctx.drawImage(layer, 0, 0); ctx.restore();
    ctx.save(); ctx.globalAlpha = alphaS;
    const front = i => (ny - 1) * nx + i;
    if (faces.length) { ctx.fillStyle = o.skirt; faces.filter(f => f.area >= 0).forEach(fillFace); }
    if (o.frontLine) {
      ctx.strokeStyle = o.frontLine; ctx.lineWidth = o.frontWidth || 3;
      ctx.beginPath();
      for (let i = 0; i < nx; i++) { const p = front(i); i ? ctx.lineTo(SX(U[p]), SY(V[p])) : ctx.moveTo(SX(U[p]), SY(V[p])); }
      ctx.stroke();
    }
    ctx.restore();
  }
  // Draw the source triangle (s0, s1, s2) of img onto the destination triangle (d0, d1, d2).
  // The clip is grown by ~0.6 px so neighbouring triangles leave no hairline seams.
  function texTri(ctx, img, s0, s1, s2, d0, d1, d2) {
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
    const grow = p => { const vx = p[0] - cx, vy = p[1] - cy, l = Math.hypot(vx, vy) || 1; return [p[0] + 0.6 * vx / l, p[1] + 0.6 * vy / l]; };
    const g0 = grow(d0), g1 = grow(d1), g2 = grow(d2);
    const [x0, y0] = s0, [x1, y1] = s1, [x2, y2] = s2;
    const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(den) < 1e-9) return;
    const a = ((d1[0] - d0[0]) * (y2 - y0) - (d2[0] - d0[0]) * (y1 - y0)) / den;
    const c = ((d2[0] - d0[0]) * (x1 - x0) - (d1[0] - d0[0]) * (x2 - x0)) / den;
    const b = ((d1[1] - d0[1]) * (y2 - y0) - (d2[1] - d0[1]) * (y1 - y0)) / den;
    const d = ((d2[1] - d0[1]) * (x1 - x0) - (d1[1] - d0[1]) * (x2 - x0)) / den;
    const e = d0[0] - a * x0 - c * y0, f = d0[1] - b * x0 - d * y0;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.lineTo(g2[0], g2[1]); ctx.closePath(); ctx.clip();
    ctx.setTransform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  function ramp(stops) {
    const rgb = stops.map(hx => [1, 3, 5].map(i => parseInt(hx.slice(i, i + 2), 16)));
    return t => {
      const f = Math.min(1, Math.max(0, t)) * (rgb.length - 1), i = Math.min(rgb.length - 2, Math.floor(f)), u = f - i;
      return [0, 1, 2].map(c => rgb[i][c] * (1 - u) + rgb[i + 1][c] * u);
    };
  }
  G.Surface3D = { draw, ramp };
})(window);
