// ringchain.js: the Peierls chain of chain.js closed into a rounded square, drawn as a frame (the title slide wraps it
// around the QR code). N ions sit at equal arc lengths along the square's path, joined by springs that follow the
// path round the corners; u[i] are the displacements along the path in units of the spacing, as in Chain.
//   const r = new RingChain(canvas, { side, radius, N, ionD });  r.layout(k);  r.u[i] = ...;  r.draw();
// side is the path's side length (ion centres), radius its corner radius; the canvas is sized to hold the ions.
(function (G) {
  'use strict';

  function RingChain(canvas, opt) {
    const o = Object.assign({ side: 194, radius: 20, N: 16, ionD: 22, springColor: '#3F7330', springWidth: 1.6,
      coils: 3, amp: 3.2, seed: 3 }, opt);
    this.o = o; this.cv = canvas; this.ctx = canvas.getContext('2d'); this.N = o.N;
    this.size = o.side + o.ionD + 8;                                   // canvas side (stage px)
    canvas.style.width = canvas.style.height = this.size + 'px';
    const st = o.side - 2 * o.radius;                                  // straight part of each side
    this.seg = [st / 2, st / 2 + Math.PI * o.radius / 2];              // within a quarter: straight half, then the arc
    this.P = 4 * (st + Math.PI * o.radius / 2);
    this.u = new Float64Array(o.N);
    this.k = 0;
  }

  // Point and unit tangent at arc length s (clockwise from the middle of the top side), in stage px from the centre.
  RingChain.prototype.at = function (s) {
    const o = this.o, Pq = this.P / 4, h = o.side / 2, r = o.radius;
    s = ((s % this.P) + this.P) % this.P;
    const q = Math.floor(s / Pq), t = s - q * Pq;
    let x, y, tx, ty;                                                  // in the frame of the top-right quarter
    if (t < this.seg[0]) { x = t; y = -h; tx = 1; ty = 0; }
    else if (t < this.seg[1]) {
      const a = (t - this.seg[0]) / r;                                 // 0 .. pi/2 round the corner
      x = h - r + r * Math.sin(a); y = -h + r - r * Math.cos(a); tx = Math.cos(a); ty = Math.sin(a);
    } else { x = h; y = -h + r + (t - this.seg[1]); tx = 0; ty = 1; }
    // rotate the quarter by q * 90 degrees clockwise
    for (let j = 0; j < q; j++) { [x, y] = [-y, x]; [tx, ty] = [-ty, tx]; }
    return [x, y, tx, ty];
  };

  RingChain.prototype.layout = function (k) {
    if (Math.abs(k - this.k) < 1e-3) return;
    this.k = k;
    this.cv.width = this.cv.height = Math.round(this.size * k);
    const R = this.o.ionD * k / 2;
    this.ions = [0, 1, 2].map(i => Stipple.ball(R, { seed: this.o.seed + 5 * i, s: k }));
    this.shade = Stipple.shadow(R, { seed: 9 });
  };

  RingChain.prototype.draw = function () {
    const { ctx, cv, o, k, N } = this, a = this.P / N, c = cv.width / 2, R = o.ionD / 2;
    const sOf = i => (i + 0.5 + this.u[i]) * a;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = o.springColor; ctx.lineWidth = o.springWidth * k; ctx.lineJoin = 'round';
    for (let i = 0; i < N; i++) {                                      // springs along the path
      let s0 = sOf(i) + R * 0.85, s1 = sOf((i + 1) % N) - R * 0.85;
      if (i === N - 1) s1 += this.P;
      const n = 2 * o.coils, steps = n * 8, lead = Math.min(3, (s1 - s0) * 0.15);
      ctx.beginPath();
      for (let j = 0; j <= steps; j++) {
        const s = s0 + (s1 - s0) * j / steps, f = (s - s0 - lead) / (s1 - s0 - 2 * lead);
        const w = f > 0 && f < 1 ? o.amp * Math.sin(Math.PI * n * f) : 0;
        const [x, y, tx, ty] = this.at(s);
        const X = c + (x - ty * w) * k, Y = c + (y + tx * w) * k;
        j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.stroke();
    }
    const bS = this.ions[0].width, sS = this.shade.width, sh = 0.16 * R * k;
    for (let i = 0; i < N; i++) {
      const [x, y] = this.at(sOf(i)), X = c + x * k, Y = c + y * k;
      ctx.drawImage(this.shade, Math.round(X + sh - sS / 2), Math.round(Y + 1.3 * sh - sS / 2));
      ctx.drawImage(this.ions[i % 3], Math.round(X - bS / 2), Math.round(Y - bS / 2));
    }
  };

  G.RingChain = RingChain;
})(window);
