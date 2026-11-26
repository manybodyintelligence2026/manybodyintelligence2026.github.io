// rail.js: where the talk is, as a mini Peierls chain down the left edge of every numbered slide.
// One ion per part of the talk (parts.js): the four signposted parts are larger balls stippled in their colour, the
// roadmap / acknowledgements / summary small ink balls. Springs join them; the parts still to come are faded. The
// current part's ion carries a shimmering blue electron cloud (the deck's electrons). Hovering an ion names its part;
// clicking it jumps to the part's first slide.
//   Rail.show(info, go): info = { parts, cur, starts } from the shell (index.html meta()); go(i) asks for slide i.
// Loaded by lib/deckslide.js the first time the shell sends part information; needs Stipple (lib/stipple.js).
(function (G) {
  'use strict';
  const X = 40, Y0 = 215, Y1 = 945, W = 80;            // stage px: the rail's axis and its extent
  const R_MAIN = 16, R_MINOR = 9, CLOUD = 'rgba(22,72,165,0.7)';
  let info = null, go = null, cv = null, ctx = null, lab = null, k = 0, sprites = [], shade = [], dots = null,
    hover = -1, running = false;
  const rand = Stipple.rng(17);
  const hex = h => [1, 3, 5].map(j => parseInt(h.substr(j, 2), 16));
  const yOf = q => Y0 + (Y1 - Y0) * q / Math.max(1, info.parts.length - 1);
  const rOf = q => info.parts[q].main ? R_MAIN : R_MINOR;

  function scale() {
    const stage = document.getElementById('stage');
    return Math.max(0.5, Math.min(3, stage.getBoundingClientRect().width / 1920 * (G.devicePixelRatio || 1)));
  }
  function layout() {
    const nk = scale();
    if (Math.abs(nk - k) < 1e-3 && sprites.length === info.parts.length) return;
    k = nk;
    cv.width = Math.round(W * k); cv.height = Math.round(1080 * k);
    sprites = info.parts.map((p, q) => Stipple.ball(rOf(q) * k, { seed: 5 + 3 * q, s: k,
      lo: p.main ? hex(p.color).map(v => Math.round(v * 0.8)) : [26, 25, 29], contrast: p.main ? 1.6 : 2.2 }));
    shade = info.parts.map((p, q) => Stipple.shadow(rOf(q) * k, { seed: 9 + q }));
  }

  function spring(y0, y1, alpha) {
    const n = 8, amp = 3.2 * k, x = X * k, lead = 3 * k;
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + lead);
    for (let j = 0; j <= n * 6; j++) {
      const t = j / (n * 6);
      ctx.lineTo(x + amp * Math.sin(Math.PI * n * t), y0 + lead + (y1 - y0 - 2 * lead) * t);
    }
    ctx.lineTo(x, y1); ctx.stroke();
  }

  // electron cloud around the current ion: Gaussian, a little longer along the chain; a third of the dots is redrawn
  // every frame, so it shimmers as on the chain slides
  function cloud() {
    const N = 190, y = yOf(info.cur), sx = 13, sy = 17;
    const g = () => { let s = 0; for (let t = 0; t < 4; t++) s += rand(); return (s - 2) * 1.73; };
    if (!dots) { dots = new Float32Array(2 * N); for (let i = 0; i < N; i++) { dots[2 * i] = g(); dots[2 * i + 1] = g(); } }
    for (let t = 0; t < N / 3; t++) { const i = Math.floor(rand() * N); dots[2 * i] = g(); dots[2 * i + 1] = g(); }
    const d = 2.2 * k;
    ctx.globalAlpha = 1; ctx.fillStyle = CLOUD;
    for (let i = 0; i < N; i++) ctx.fillRect((X + dots[2 * i] * sx) * k - d / 2, (y + dots[2 * i + 1] * sy) * k - d / 2, d, d);
  }

  function draw() {
    if (!info) return;
    layout();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const P = info.parts, later = q => q > info.cur ? 0.45 : 1;
    ctx.strokeStyle = '#3B3838'; ctx.lineWidth = 1.8 * k; ctx.lineJoin = 'round';
    for (let q = 0; q + 1 < P.length; q++) spring((yOf(q) + rOf(q)) * k, (yOf(q + 1) - rOf(q + 1)) * k, later(q + 1));
    P.forEach((p, q) => {
      const s = sprites[q], h = shade[q], y = yOf(q) * k, sh = 0.16 * rOf(q) * k;
      ctx.globalAlpha = later(q);
      ctx.drawImage(h, Math.round(X * k + sh - h.width / 2), Math.round(y + 1.3 * sh - h.height / 2));
      ctx.drawImage(s, Math.round(X * k - s.width / 2), Math.round(y - s.height / 2));
    });
    if (info.cur >= 0) cloud();
    ctx.globalAlpha = 1;
    if (!running) return;
    G.requestAnimationFrame(draw);
  }

  function pick(e) {
    const r = cv.getBoundingClientRect(), sx = (e.clientX - r.left) / r.width * W, sy = (e.clientY - r.top) / r.height * 1080;
    let best = -1;
    info.parts.forEach((p, q) => { if (Math.hypot(sx - X, sy - yOf(q)) < Math.max(18, rOf(q) + 8)) best = q; });
    return best;
  }
  function setHover(q) {
    hover = q;
    cv.style.cursor = q >= 0 ? 'pointer' : 'default';
    if (q < 0) { lab.style.display = 'none'; return; }
    const p = info.parts[q];
    lab.textContent = p.name; lab.style.color = p.main ? p.color : '#161414';
    lab.style.top = (yOf(q) - 17) + 'px'; lab.style.display = 'block';
  }

  function show(i, onGo) {
    info = i; go = onGo; dots = null;
    if (!cv) {
      const stage = document.getElementById('stage');
      cv = document.createElement('canvas'); ctx = cv.getContext('2d');
      cv.className = 'rail';
      Object.assign(cv.style, { position: 'absolute', left: '0', top: '0', width: W + 'px', height: '1080px', zIndex: 20 });
      lab = document.createElement('div');
      Object.assign(lab.style, { position: 'absolute', left: (X + 26) + 'px', display: 'none', zIndex: 21, pointerEvents: 'none',
        font: '700 20px "Fira Sans", Arial, sans-serif', padding: '4px 10px', background: 'rgba(255,255,255,0.92)',
        borderRadius: '6px', whiteSpace: 'nowrap' });
      stage.appendChild(cv); stage.appendChild(lab);
      cv.addEventListener('pointermove', e => { const q = pick(e); if (q !== hover) setHover(q); });
      cv.addEventListener('pointerleave', () => setHover(-1));
      cv.addEventListener('click', e => { const q = pick(e); if (q >= 0 && info.starts[q] >= 0 && go) go(info.starts[q]); });
      G.addEventListener('resize', () => { k = 0; });
    }
    sprites = [];
    if (!running) { running = true; G.requestAnimationFrame(draw); }
  }

  G.Rail = { show };
})(window);
