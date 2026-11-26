// lattice.js: the strip geometry of Part 3, shared by the slides after "The model" (5 Nov).
// A JS port of draw_pobc_lattice (Paper Figures/Animation Concepts/make_animation_1_lattice_frames.m): nx sites
// across (open; x = 1 blue, x = nx red), ny around / along (periodic), MATLAB camera view(-48, 27).
// Plot axes as in the MATLAB surface(Yp, Xp, Zp): p = [along, across, up].
//   Lattice.view3(p)                    -> [screen right, screen up, depth towards the viewer] (orthographic)
//   Lattice.geometry(u, nx, ny)          -> { P[i][j] = [Y, X, Z], seam }: u = 0 cylinder .. 1 flat strip
//   Lattice.camera(points, rect, opt)    -> { proj(p) -> [sx, sy, depth], s }: fits world points into rect
//   Lattice.drawSites(ctx, Q, opt)       paints bonds and sites far to near (Q: projected P, same shape)
//   Lattice.FOOT                         the flat strip's footprint: along [0, ny-1], across [0, nx-1] (site units)
//   Lattice.inset(parent, x, y, w, h)    a canvas with the flat strip (and x / y arrows), fitted into w x h
(function (G) {
  'use strict';
  const NX = 15, NY = 28;
  const AZ = -48 * Math.PI / 180, EL = 27 * Math.PI / 180;
  const smoother = p => p * p * p * (p * (6 * p - 15) + 10);
  const LEFT = 'rgb(112,150,250)', RIGHT = 'rgb(250,120,120)', BULK = '#0E1114';
  const BOND = 'rgb(' + [0.20, 0.23, 0.27].map((c, i) => Math.round(255 * 0.56 * c + 0.44 * [251, 250, 247][i])).join(',') + ')';

  function view3(p) {
    const [x, y, z] = p, ca = Math.cos(AZ), sa = Math.sin(AZ), ce = Math.cos(EL), se = Math.sin(EL);
    return [ca * x + sa * y, -se * sa * x + se * ca * y + ce * z, ce * sa * x - ce * ca * y + se * z];
  }

  function geometry(u, nx, ny) {
    nx = nx || NX; ny = ny || NY;
    const R = ny / (2 * Math.PI), YC = 0.5 * (ny + 1), CUT = 0.16;
    u = Math.max(0, Math.min(1, u));
    const op = smoother(Math.max(0, Math.min(1, (u - CUT) / (1 - CUT)))), curv = (1 - op) / R, P = [];
    for (let i = 0; i < nx; i++) {
      const row = [];
      for (let j = 0; j < ny; j++) {
        const s = R * (-Math.PI + 2 * Math.PI * j / ny);
        row.push(curv > 2e-4 ? [YC + Math.sin(curv * s) / curv, nx - i, (1 - Math.cos(curv * s)) / curv] : [YC + s, nx - i, 0]);   // mirrored: x = 1 back-left
      }
      P.push(row);
    }
    return { P, seam: 1 - smoother(Math.max(0, Math.min(1, u / CUT))) };
  }

  // fit world points into rect = {x, y, w, h} (screen px), centred; weak perspective (D in world units)
  function camera(points, rect, opt) {
    const o = Object.assign({ D: 400, pad: 10 }, opt);
    let c = [0, 0, 0];
    points.forEach(p => { c = c.map((v, i) => v + p[i] / points.length); });
    const raw = p => {
      const [h, v, d] = view3([p[0] - c[0], p[1] - c[1], p[2] - c[2]]), f = o.D / (o.D - d);
      return [h * f, v * f, d];
    };
    let a = [Infinity, -Infinity, Infinity, -Infinity];
    points.forEach(p => { const q = raw(p); a = [Math.min(a[0], q[0]), Math.max(a[1], q[0]), Math.min(a[2], q[1]), Math.max(a[3], q[1])]; });
    const s = o.s || Math.min((rect.w - 2 * o.pad) / (a[1] - a[0]), (rect.h - 2 * o.pad) / (a[3] - a[2]));
    const ox = rect.x + rect.w / 2 - s * (a[0] + a[1]) / 2, oy = rect.y + rect.h / 2 + s * (a[2] + a[3]) / 2;
    return { s, proj: p => { const q = raw(p); return [ox + s * q[0], oy - s * q[1], q[2]]; } };
  }

  // bonds and sites, far to near; opt: { seam (alpha of the j = ny-1 -> 0 bonds), r (bulk radius), re (edge
  // radius), bond (line width), plain (edge sites drawn as bulk ones) }
  function drawSites(ctx, Q, opt) {
    const o = Object.assign({ seam: 0, r: 4.6, re: 7.5, bond: 2.2 }, opt), nx = Q.length, ny = Q[0].length, items = [];
    const bond = (a, b, al) => items.push({ d: (a[2] + b[2]) / 2 - 0.01, f: () => {
      ctx.globalAlpha = al; ctx.strokeStyle = BOND; ctx.lineWidth = o.bond;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.globalAlpha = 1; } });
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      if (i + 1 < nx) bond(Q[i][j], Q[i + 1][j], 1);
      if (j + 1 < ny) bond(Q[i][j], Q[i][j + 1], 1); else if (o.seam > 1e-3) bond(Q[i][j], Q[i][0], o.seam);
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const q = Q[i][j], edge = !o.plain && (i === 0 || i === nx - 1);   // plain: no edge colours (slide 34)
      items.push({ d: q[2], f: () => {
        ctx.globalAlpha = i === nx - 1 && o.rightAlpha !== undefined ? o.rightAlpha : 1;
        ctx.beginPath(); ctx.arc(q[0], q[1], edge ? o.re : o.r, 0, 2 * Math.PI);
        ctx.fillStyle = edge ? (i === 0 ? LEFT : RIGHT) : BULK; ctx.fill();
        if (edge) { ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(0.6, o.re * 0.16); ctx.stroke(); }
        ctx.globalAlpha = 1;
      } });
    }
    items.sort((a, b) => a.d - b.d).forEach(it => it.f());
  }

  // the flat strip in plot axes with its footprint starting at 0: along [0, ny-1], across [0, nx-1]
  const FOOT = { along: NY - 1, across: NX - 1 };
  const flatP = () => { const P = []; for (let i = 0; i < NX; i++) { const r = []; for (let j = 0; j < NY; j++) r.push([j, NX - 1 - i, 0]); P.push(r); } return P; };   // x = 1 (blue) back-left

  // arrows for the in-plane axes from the front corner (x = 1, j = 0): y along the strip, x across it
  function axesArrows(ctx, cam, len, font) {
    const O = [-2.4, NX + 0.6, 0], o = cam.proj(O);            // origin just off the blue (x = 1) corner
    const tip = (p, lab) => {
      const t = cam.proj(p), ang = Math.atan2(t[1] - o[1], t[0] - o[0]);
      ctx.strokeStyle = '#161414'; ctx.fillStyle = '#161414'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(t[0], t[1]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(t[0], t[1]);
      ctx.lineTo(t[0] - 9 * Math.cos(ang - 0.4), t[1] - 9 * Math.sin(ang - 0.4));
      ctx.lineTo(t[0] - 9 * Math.cos(ang + 0.4), t[1] - 9 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
      ctx.font = `italic ${font}px "Fira Sans", Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(lab, t[0] + 14 * Math.cos(ang), t[1] + 14 * Math.sin(ang) + 2);
    };
    tip([O[0] + len, O[1], 0], 'y'); tip([O[0], O[1] - len, 0], 'x');   // y along the blue edge, x from blue to red
  }

  // a flat-strip inset: canvas at (x, y), w x h stage px; opt.s fixes the world -> px scale (to match other plots)
  function inset(parent, x, y, w, h, opt) {
    const o = Object.assign({ arrows: true }, opt);
    const cv = document.createElement('canvas');
    cv.className = 'latInset';
    cv.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;pointer-events:none;`;
    parent.appendChild(cv);
    const P = flatP();
    function draw(k) {
      cv.width = Math.round(w * k); cv.height = Math.round(h * k);
      const ctx = cv.getContext('2d'); ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, w, h);
      const pts = [].concat(...P).concat(o.arrows ? [[-4, NX + 2, 0], [-4, NX - 7, 0]] : []);
      const cam = camera(pts, { x: 0, y: 0, w, h }, { s: o.s, pad: 8 });
      const rs = cam.s / 14;                                  // site radii scale with the drawing (14 px / site at s = 14)
      drawSites(ctx, P.map(r => r.map(cam.proj)), { r: 2.6 * rs * 1.2, re: 4.2 * rs * 1.2, bond: Math.max(0.8, 1.3 * rs), rightAlpha: o.rightAlpha });
      if (o.arrows) axesArrows(ctx, cam, 6, Math.max(16, Math.round(1.5 * cam.s)));
    }
    // draws itself at the stage's device scale (as stage.js computes it) and again on resize
    const kNow = () => Math.max(0.5, Math.min(3, Math.min(innerWidth / 1920, innerHeight / 1080) * (G.devicePixelRatio || 1)));
    draw(kNow()); addEventListener('resize', () => draw(kNow()));
    if (document.fonts) document.fonts.ready.then(() => draw(kNow()));
    return { cv, draw, setRight(a) { o.rightAlpha = a; draw(kNow()); } };
  }

  G.Lattice = { NX, NY, AZ, EL, view3, geometry, camera, drawSites, FOOT, inset, smoother };
})(window);
