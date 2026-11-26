// qrcard.js: the title slide's QR code (data from tools/make_qr.py, window.QR) in the style of Chrome's codes:
// round dots, softly rounded finder squares, and a square left empty in the middle, which holds four dots that pair up
// and relax with the rest of the slide (the Peierls distortion in miniature).
//   QRCard.draw(ctx, size, phi): draw into a size x size (device px) square at the context origin;
//   phi in [0, 1] is the shared distortion amplitude; an optional 4th argument draws another code (default window.QR).
// The empty square is 9 x 9 of 33 x 33 modules (37 x 37 for the poll); the error correction (level H) covers it. The dots stay inside it.
(function (G) {
  'use strict';
  const INK = '#161414';

  function finder(ctx, x, y, m) {
    const rr = (x0, y0, w, r) => { ctx.beginPath(); ctx.roundRect(x0, y0, w, w, r); ctx.fill(); };
    // corners only gently rounded: with Chrome's rounder finders (1.6 / 1.1 / 0.8 m) OpenCV stopped reading the code
    // below ~5 px per module, these still read at 3 px
    ctx.fillStyle = INK; rr(x, y, 7 * m, 0.6 * m);
    ctx.fillStyle = '#fff'; rr(x + m, y + m, 5 * m, 0.4 * m);
    ctx.fillStyle = INK; rr(x + 2 * m, y + 2 * m, 3 * m, 0.3 * m);
  }

  function draw(ctx, size, phi, code) {
    const Q = code || G.QR, n = Q.n, m = size / n, h = Q.hole, c0 = (n - h) >> 1;
    const inFinder = (i, j) => (i < 7 && j < 7) || (i < 7 && j >= n - 7) || (i >= n - 7 && j < 7);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = INK;
    for (let i = 0; i < n; i++) {
      const row = Q.rows[i];
      for (let j = 0; j < n; j++) {
        if (row[j] !== '1' || inFinder(i, j)) continue;
        if (i >= c0 && i < c0 + h && j >= c0 && j < c0 + h) continue;
        ctx.beginPath(); ctx.arc((j + 0.5) * m, (i + 0.5) * m, 0.5 * m, 0, 2 * Math.PI); ctx.fill();
      }
    }
    finder(ctx, 0, 0, m); finder(ctx, (n - 7) * m, 0, m); finder(ctx, 0, (n - 7) * m, m);
    // the pairing dots: four ions on a bond, neighbours (0,1) and (2,3) moving together as phi grows
    const y = (c0 + h / 2) * m, x0 = (c0 + 1.25) * m, dx = 2.17 * m, d = 0.42 * m * phi;
    ctx.strokeStyle = INK; ctx.lineWidth = 0.22 * m;
    ctx.beginPath(); ctx.moveTo((c0 + 0.35) * m, y); ctx.lineTo((c0 + h - 0.35) * m, y); ctx.stroke();
    for (let q = 0; q < 4; q++) {
      const x = x0 + q * dx + (q % 2 ? -d : d);
      ctx.beginPath(); ctx.arc(x, y, 0.78 * m, 0, 2 * Math.PI); ctx.fill();
    }
  }

  G.QRCard = { draw };
})(window);
