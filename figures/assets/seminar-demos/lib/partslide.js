// partslide.js: the section slide that opens each of the four main parts (after slides 3 and 11 of the reference
// pptx). The page is the part's tint; a bar in the part's colour runs along the top of the title and down the left
// as a column, the title in white on the bar, a two-line subtitle in ink below it, and a picture at the foot of the
// column. Colours and the title come from parts.js (the entry whose start is this slide).
//   PartSlide.build({ start: 'proto/p1_prologue.html', sub: 'line one<br>line two', image: 'balls' })
// image: 'balls' (stippled balls freezing into a lattice), 'portrait' (assets/peierls.png), 'edge' (live 3D edge
// pair-density wave, as on the title), 'bulk' (live 3D bulk pair-density wave).
(function (G) {
  'use strict';
  const BAR_TOP = 400, BAR_H = 92, COL_X = 120, COL_W = 250, TITLE_X = 520;
  const rgb = h => [1, 3, 5].map(j => parseInt(h.substr(j, 2), 16));

  function build(o) {
    const part = (G.PARTS || []).find(p => p.start === o.start) || { name: '', color: '#161414', tint: '#FBFAF7' };
    const stage = document.getElementById('stage'), add = (tag, css, html) => {
      const el = document.createElement(tag); Object.assign(el.style, { position: 'absolute' }, css);
      if (html !== undefined) el.innerHTML = html;
      stage.appendChild(el); return el;
    };
    add('div', { left: COL_X + 'px', top: BAR_TOP + 'px', width: COL_W + 'px', height: (1080 - BAR_TOP) + 'px', background: part.color });
    const title = add('div', { left: TITLE_X + 'px', top: BAR_TOP + 'px', height: BAR_H + 'px', lineHeight: BAR_H + 'px', color: '#fff',
      fontSize: '76px', fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.005em' }, part.name);
    const bar = add('div', { left: COL_X + 'px', top: BAR_TOP + 'px', height: BAR_H + 'px', background: part.color, zIndex: 0 });
    title.style.zIndex = 1;
    // (6 Nov) the bar runs to the right edge of the slide: measuring the title failed when the slide loaded hidden
    // (offsetWidth 0), leaving long white titles off the bar
    bar.style.width = (1920 - COL_X) + 'px';
    add('div', { left: TITLE_X + 'px', top: (BAR_TOP + BAR_H + 22) + 'px', fontSize: '54px', fontWeight: 700, lineHeight: 1.18,
      color: '#161414' }, o.sub || '');

    const pic = { left: 84, top: 620, w: 430, h: 460 };              // picture area at the foot of the column
    let drawPic = null;
    if (o.image === 'portrait') {
      const img = add('img', { left: '70px', bottom: '0', height: '470px' });
      img.src = '../assets/peierls.png'; img.alt = 'Rudolf Peierls';
    } else {
      const cv = add('canvas', { left: pic.left + 'px', top: pic.top + 'px', width: pic.w + 'px', height: pic.h + 'px' });
      drawPic = o.image === 'balls' ? balls(cv, pic) : surface(cv, pic, o.image === 'bulk');
    }
    const T = rgb(part.tint);
    Stage.init(k => { if (drawPic) drawPic.layout(k); },
      { paper: { base: T, blank: T.map(v => Math.min(255, v + 8)), wear: 0.35, seed: 21 } });
    if (drawPic && drawPic.frame) {
      let t0 = null;
      const loop = now => { if (t0 === null) t0 = now; drawPic.frame((now - t0) / 1000); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
  }

  // stippled balls: a disordered liquid above freezing into a square lattice below (static)
  function balls(cv, pic) {
    const ctx = cv.getContext('2d'), D = 40, rnd = Stipple.rng(11), pts = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) pts.push([50 + c * 46, pic.h - 34 - r * 46]);
    const liquid = [[70, 140], [150, 110], [235, 155], [290, 100], [110, 205], [200, 220], [275, 215], [60, 250]];
    liquid.forEach(([x, y]) => pts.push([x + (rnd() - 0.5) * 10, y + (rnd() - 0.5) * 10]));
    return {
      layout(k) {
        cv.width = Math.round(pic.w * k); cv.height = Math.round(pic.h * k);
        const sp = [0, 1, 2].map(i => Stipple.ball(D * k / 2, { seed: 3 + 5 * i, s: k })), sh = Stipple.shadow(D * k / 2, { seed: 9 });
        ctx.clearRect(0, 0, cv.width, cv.height);
        pts.forEach(([x, y], i) => {
          const s = sp[i % 3], o = 0.16 * D * k / 2;
          ctx.drawImage(sh, Math.round(x * k + o - sh.width / 2), Math.round(y * k + 1.3 * o - sh.height / 2));
          ctx.drawImage(s, Math.round(x * k - s.width / 2), Math.round(y * k - s.height / 2));
        });
      }
    };
  }

  // a small 3D pair-density wave breathing on a 6 s clock: at the edge only (edge) or through the whole bulk (bulk)
  function surface(cv, pic, bulk) {
    const ctx = cv.getContext('2d'), SPAN = 300, DEPTH = 240, VAC = 50, Q = 2 * Math.PI / 100, XI = 45, T = 6;
    const ramp = Surface3D.ramp(['#EEF1E8', '#E2EBD6', '#C9DCB3', '#8EB36B', '#3F7330']);
    let k = 1, paper = null;
    return {
      layout(kk) {
        k = kk; cv.width = Math.round(pic.w * k); cv.height = Math.round(pic.h * k);
        const W = Math.round(SPAN * k), H = Math.round((DEPTH + VAC) * k);
        paper = Stipple.paper(W, H, { s: k, seed: 7, base: [244, 239, 227], blank: [250, 247, 240], wear: 0.35 });
        const pc = paper.getContext('2d'); pc.fillStyle = '#161414'; pc.fillRect(0, DEPTH * k, W, H);
      },
      frame(t) {
        const phi = 0.5 - 0.5 * Math.cos(2 * Math.PI * t / T);
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
        Surface3D.draw(ctx, {
          nx: 90, ny: 40, w: SPAN * k, h: DEPTH * k,
          z: (i, j) => {
            const x = i / 89 * SPAN, d = DEPTH * (1 - j / 39), env = bulk ? 1 : Math.exp(-d / XI);
            return (0.32 - (bulk ? 0 : (1 - phi) * 0.26 * Math.exp(-d / XI)) + phi * (bulk ? 0.2 : 0.3) * env * Math.cos(Q * x)) * 300 * k;
          },
          zTop: 0.62 * 300 * k, zBot: 0, fitZ: 0.62 * 300 * k, yaw: -0.5, elev: 0.5, persp: 1.1,
          fit: { x: 14 * k, y: 14 * k, w: cv.width - 28 * k, h: cv.height - 28 * k },
          flatFit: { x: 0, y: 0, w: cv.width, h: cv.height }, blend: 1,
          ground: { img: paper, sx: 0, sy: 0, sw: SPAN * k, sh: (DEPTH + VAC) * k, extra: VAC * k },
          ramp, alpha: 0.9, frontLine: '#2F5A22', frontWidth: 2.5 * k, skirt: 'rgba(214,232,196,0.7)'
        });
      }
    };
  }

  G.PartSlide = { build };
})(window);
