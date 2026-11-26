// stipple.js: the photocopied-print look for the seminar deck.
// paper(): worn orange-red stock with grain, wear patches, specks and scratches.
// ball():  a halftone-stippled sphere with a dark rim (the "grain" reference image).
// shadow(): a stippled drop shadow that sits a ball on the page.
// All sprites are built once at device resolution, so the grain stays one device pixel.
(function (G) {
  'use strict';

  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth = (e0, e1, v) => { const t = clamp((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

  // Smooth value noise in [0,255] (red channel), from a blurred, upsampled random grid.
  function valueNoise(w, h, cell, rand) {
    const gw = Math.ceil(w / cell) + 3, gh = Math.ceil(h / cell) + 3;
    const small = canvas(gw, gh), sx = small.getContext('2d');
    const id = sx.createImageData(gw, gh);
    for (let i = 0; i < gw * gh; i++) {
      const v = rand() * 255;
      id.data[4 * i] = id.data[4 * i + 1] = id.data[4 * i + 2] = v;
      id.data[4 * i + 3] = 255;
    }
    sx.putImageData(id, 0, 0);
    const big = canvas(w, h), bx = big.getContext('2d');
    bx.imageSmoothingEnabled = true;
    bx.imageSmoothingQuality = 'high';
    bx.filter = `blur(${Math.max(1, cell * 0.45)}px)`;
    bx.drawImage(small, -cell, -cell, gw * cell, gh * cell);
    return bx.getImageData(0, 0, w, h).data;
  }

  // Worn print stock. base = ink colour; s = device px per stage px (keeps features stage-sized).
  function paper(w, h, opt) {
    // default stock: eggshell (#F4EFE3, as in the master's deck); the orange print was base [251, 88, 66]
    const o = Object.assign({ base: [244, 239, 227], blank: [250, 247, 240], seed: 7, s: 1, wear: 0.35 }, opt);
    const R = rng(o.seed), s = o.s;
    const n1 = valueNoise(w, h, Math.round(320 * s), R);
    const n2 = valueNoise(w, h, Math.round(90 * s), R);
    const n3 = valueNoise(w, h, Math.round(18 * s), R);
    const c = canvas(w, h), x = c.getContext('2d');
    const img = x.createImageData(w, h), d = img.data;
    const [br, bg, bb] = o.base, [wr, wg, wb] = o.blank;
    for (let p = 0; p < w * h * 4; p += 4) {
      const m = 0.55 * (n1[p] / 255 - 0.5) + 0.3 * (n2[p] / 255 - 0.5) + 0.15 * (n3[p] / 255 - 0.5);
      // where the ink has worn thin, the blank stock shows through, broken up by fine grain
      const grain = R();
      let k = smooth(0.06, 0.2, m + 0.12 * (grain - 0.5)) * 0.55 * o.wear;
      k += smooth(0.16, 0.3, m) * 0.25 * o.wear;
      const dark = Math.max(0, -m - 0.12) * 0.3;              // slightly heavier ink elsewhere
      const g = (grain - 0.5) * 16;
      d[p]     = (br + (wr - br) * k) * (1 - dark) + g;
      d[p + 1] = (bg + (wg - bg) * k) * (1 - dark) + g;
      d[p + 2] = (bb + (wb - bb) * k) * (1 - dark) + g;
      d[p + 3] = 255;
    }
    x.putImageData(img, 0, 0);

    // specks: small clumps where no ink took
    const nSpeck = Math.round(w * h * 0.00006 / (s * s));
    for (let i = 0; i < nSpeck; i++) {
      x.fillStyle = `rgba(${wr},${wg},${wb},${0.35 + 0.5 * R()})`;
      x.beginPath();
      x.arc(R() * w, R() * h, (0.4 + 1.6 * R() * R()) * s, 0, 2 * Math.PI);
      x.fill();
    }
    // a few dark flecks of stray toner
    for (let i = 0; i < nSpeck / 6; i++) {
      x.fillStyle = `rgba(60,12,10,${0.25 + 0.4 * R()})`;
      x.beginPath();
      x.arc(R() * w, R() * h, (0.4 + 1.0 * R()) * s, 0, 2 * Math.PI);
      x.fill();
    }
    // scratches: long, thin, pale, mostly vertical
    x.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const x0 = R() * w, y0 = R() * h * 0.7, len = (120 + 520 * R()) * s;
      const ang = Math.PI / 2 + (R() - 0.5) * 0.5;
      x.strokeStyle = `rgba(${wr},${wg},${wb},${0.12 + 0.3 * R()})`;
      x.lineWidth = (0.5 + 0.9 * R()) * s;
      x.beginPath();
      x.moveTo(x0, y0);
      x.quadraticCurveTo(x0 + (R() - 0.5) * 40 * s + Math.cos(ang) * len / 2, y0 + Math.sin(ang) * len / 2,
                         x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len);
      x.stroke();
    }
    return c;
  }

  // Halftone sphere of radius R device px.
  function ball(R, opt) {
    const o = Object.assign({
      seed: 1, light: [-0.38, -0.5, 0.78], hi: [240, 239, 236], lo: [26, 25, 29],
      contrast: 2.2, ambient: 0.0, falloff: 1.5, rimPx: 1.2, rimShadow: 1.2, s: 1
    }, opt);
    const rand = rng(o.seed);
    const S = Math.ceil(2 * R + 4), c = canvas(S, S), x = c.getContext('2d');
    const img = x.createImageData(S, S), d = img.data;
    const u = new Float32Array(S * S).map(() => rand());     // fine, unclustered grain
    const ln = Math.hypot(...o.light), L = o.light.map(v => v / ln);
    const lxy = Math.hypot(L[0], L[1]);
    const cx = S / 2, cy = S / 2;
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const dx = (px + 0.5 - cx) / R, dy = (py + 0.5 - cy) / R, r = Math.hypot(dx, dy);
      const a = clamp((1 - r) * R + 0.5, 0, 1);
      if (a <= 0) continue;
      const nz = Math.sqrt(Math.max(0, 1 - r * r));
      const diff = Math.max(0, dx * L[0] + dy * L[1] + nz * L[2]);
      let I = o.ambient + (1 - o.ambient) * Math.pow(diff, o.falloff);
      I = Math.min(1, I * 1.18);                                  // let the lit cap burn out to paper
      I *= 1 - 0.45 * smooth(0.7, 1.0, r);                        // limb darkening
      let t = clamp((I - u[py * S + px]) * o.contrast + 0.5, 0, 1);
      // inked outline, heavier on the side away from the light
      const away = r > 0 ? Math.max(0, -(dx * L[0] + dy * L[1]) / (r * lxy)) : 0;
      const rim = o.s * (o.rimPx + o.rimShadow * away * away);
      t *= 1 - smooth(R - rim - 0.8, R - rim + 0.4, r * R);
      const p = 4 * (py * S + px);
      d[p]     = o.lo[0] + (o.hi[0] - o.lo[0]) * t;
      d[p + 1] = o.lo[1] + (o.hi[1] - o.lo[1]) * t;
      d[p + 2] = o.lo[2] + (o.hi[2] - o.lo[2]) * t;
      d[p + 3] = 255 * a;
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  // Stippled drop shadow, same footprint as ball(R).
  function shadow(R, opt) {
    const o = Object.assign({ seed: 99, ink: [92, 18, 16], alpha: 0.42, soft: 0.22 }, opt);
    const rand = rng(o.seed);
    const S = Math.ceil(2 * R * (1 + o.soft) + 4), c = canvas(S, S), x = c.getContext('2d');
    const img = x.createImageData(S, S), d = img.data;
    const cx = S / 2, cy = S / 2;
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const r = Math.hypot(px + 0.5 - cx, py + 0.5 - cy) / R;
      const dens = 1 - smooth(1 - o.soft, 1 + o.soft, r);
      if (dens <= 0) continue;
      const p = 4 * (py * S + px);
      d[p] = o.ink[0]; d[p + 1] = o.ink[1]; d[p + 2] = o.ink[2];
      d[p + 3] = rand() < dens ? 255 * o.alpha : 0;
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  // Interpolated lookup into a list of hex stops; t in [0,1] -> [r,g,b].
  function ramp(stops) {
    const rgb = stops.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
    return function (t) {
      const f = clamp(t, 0, 1) * (rgb.length - 1), i = Math.min(rgb.length - 2, Math.floor(f)), w = f - i;
      return [0, 1, 2].map(k => rgb[i][k] * (1 - w) + rgb[i + 1][k] * w);
    };
  }

  // Crameri lajolla (Scientific Colour Maps 8), 17 samples, dark -> light.
  const LAJOLLA = ['#191900', '#261e08', '#362411', '#4b2b1b', '#653329', '#833d38', '#a44544', '#c44e4a',
    '#d85f4d', '#e1744f', '#e58751', '#e99a52', '#ecac54', '#f1c159', '#f7d971', '#fcef9f', '#fffecb'];

  G.Stipple = { rng, canvas, paper, ball, shadow, ramp, LAJOLLA };
})(window);
