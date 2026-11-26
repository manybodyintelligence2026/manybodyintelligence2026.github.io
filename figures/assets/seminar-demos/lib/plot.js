// plot.js: deck-style 2D axes on a canvas (full frame, ticks in, Fira Sans, no gridlines).
// const ax = new Axes(canvas, {width, height, xlim, ylim, xticks, yticks, xlabel, ylabel, ylabelAt});
// ylabelAt: draw the y label upright at that y value (else rotated, centred on the axis).
// ax.layout(k); ax.clear(); ax.frame(); ax.line(f or [xs, ys], style); ... ax.toPix / ax.fromPix.
(function (G) {
  'use strict';

  function Axes(canvas, opt) {
    const o = Object.assign({ width: 760, height: 460, pad: [96, 30, 30, 84], font: 30,
      xlim: [0, 1], ylim: [0, 1], xticks: [], yticks: [], xlabel: '', ylabel: '' }, opt);
    this.o = o; this.cv = canvas; this.ctx = canvas.getContext('2d'); this.k = 1;
    canvas.style.width = o.width + 'px'; canvas.style.height = o.height + 'px';
  }
  // pad = [left, top, right, bottom] in stage px
  Axes.prototype.layout = function (k) {
    this.k = k;
    this.cv.width = Math.round(this.o.width * k); this.cv.height = Math.round(this.o.height * k);
  };
  Axes.prototype.box = function () {
    const [l, t, r, b] = this.o.pad;
    return { x0: l, y0: t, x1: this.o.width - r, y1: this.o.height - b };
  };
  Axes.prototype.toPix = function (x, y) {
    const B = this.box(), [xa, xb] = this.o.xlim, [ya, yb] = this.o.ylim;
    return [B.x0 + (x - xa) / (xb - xa) * (B.x1 - B.x0), B.y1 - (y - ya) / (yb - ya) * (B.y1 - B.y0)];
  };
  Axes.prototype.fromPix = function (px, py) {
    const B = this.box(), [xa, xb] = this.o.xlim, [ya, yb] = this.o.ylim;
    return [xa + (px - B.x0) / (B.x1 - B.x0) * (xb - xa), ya + (B.y1 - py) / (B.y1 - B.y0) * (yb - ya)];
  };
  Axes.prototype.clear = function () {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.cv.width, this.cv.height);
    c.setTransform(this.k, 0, 0, this.k, 0, 0);
  };
  Axes.prototype.clip = function (on) {
    const c = this.ctx, B = this.box();
    if (on) { c.save(); c.beginPath(); c.rect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0); c.clip(); } else c.restore();
  };
  // Text with simple markup: _x subscript, ^x superscript (single token after the mark, or {...}).
  function rich(c, s, x, y, size, align, italicVars) {
    const parts = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if ((ch === '_' || ch === '^') && i + 1 < s.length) {
        let tok;
        if (s[i + 1] === '{') { const j = s.indexOf('}', i); tok = s.slice(i + 2, j); i = j + 1; } else { tok = s[i + 1]; i += 2; }
        parts.push({ t: tok, sub: ch === '_', sup: ch === '^' });
      } else { parts.push({ t: ch }); i++; }
    }
    const fontOf = p => `${italicVars && /[A-Za-z]/.test(p.t) && p.t.length === 1 && !p.sub ? 'italic ' : ''}${(p.sub || p.sup) ? Math.round(size * 0.68) : size}px "Fira Sans", Arial`;
    let w = 0;
    for (const p of parts) { c.font = fontOf(p); w += c.measureText(p.t).width; }
    let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    c.textAlign = 'left';
    for (const p of parts) {
      c.font = fontOf(p);
      c.fillText(p.t, cx, y + (p.sub ? size * 0.28 : p.sup ? -size * 0.38 : 0));
      cx += c.measureText(p.t).width;
    }
  }
  Axes.rich = rich;

  Axes.prototype.frame = function () {
    const c = this.ctx, o = this.o, B = this.box(), tick = 12;
    c.strokeStyle = '#161414'; c.fillStyle = '#161414'; c.lineWidth = 2.5;
    c.strokeRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0);
    c.textBaseline = 'middle';
    for (const t of o.xticks) {
      const [v, lab] = Array.isArray(t) ? t : [t, String(t)];
      const [px] = this.toPix(v, 0);
      c.beginPath(); c.moveTo(px, B.y1); c.lineTo(px, B.y1 - tick); c.moveTo(px, B.y0); c.lineTo(px, B.y0 + tick); c.stroke();
      rich(c, lab, px, B.y1 + o.font * 0.9, o.font, 'center', false);
    }
    for (const t of o.yticks) {
      const [v, lab] = Array.isArray(t) ? t : [t, String(t)];
      const [, py] = this.toPix(0, v);
      c.beginPath(); c.moveTo(B.x0, py); c.lineTo(B.x0 + tick, py); c.moveTo(B.x1, py); c.lineTo(B.x1 - tick, py); c.stroke();
      rich(c, lab, B.x0 - 12, py, o.font, 'right', false);
    }
    if (o.xlabel) rich(c, o.xlabel, (B.x0 + B.x1) / 2, B.y1 + o.font * 2.1, o.font * 1.15, 'center', true);
    if (o.ylabel && o.ylabelAt !== undefined) {       // upright, level with y = ylabelAt, left of the tick labels
      rich(c, o.ylabel, B.x0 - 12 - o.font * 1.1, this.toPix(0, o.ylabelAt)[1], o.font * 1.15, 'right', true);
    } else if (o.ylabel) {
      c.save(); c.translate(B.x0 - o.font * 2.4, (B.y0 + B.y1) / 2); c.rotate(-Math.PI / 2);
      rich(c, o.ylabel, 0, 0, o.font * 1.15, 'center', true); c.restore();
    }
  };
  Axes.prototype.line = function (f, style) {
    const c = this.ctx, s = Object.assign({ color: '#161414', width: 3, dash: [], n: 400 }, style);
    c.strokeStyle = s.color; c.lineWidth = s.width; c.setLineDash(s.dash); c.lineJoin = 'round';
    c.beginPath();
    if (typeof f === 'function') {
      const [xa, xb] = s.range || this.o.xlim;
      for (let i = 0; i <= s.n; i++) {
        const x = xa + (xb - xa) * i / s.n, [px, py] = this.toPix(x, f(x));
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
    } else {
      const [xs, ys] = f;
      for (let i = 0; i < xs.length; i++) { const [px, py] = this.toPix(xs[i], ys[i]); i ? c.lineTo(px, py) : c.moveTo(px, py); }
    }
    c.stroke(); c.setLineDash([]);
  };
  Axes.prototype.vline = function (x, style) {
    const [ya, yb] = this.o.ylim;
    this.line([[x, x], [ya, yb]], Object.assign({ dash: [10, 8], width: 2 }, style));
  };
  Axes.prototype.hline = function (y, style) {
    const [xa, xb] = this.o.xlim;
    this.line([[xa, xb], [y, y]], Object.assign({ dash: [10, 8], width: 2 }, style));
  };
  Axes.prototype.fillRect = function (x0, y0, x1, y1, color) {
    const [a, b] = this.toPix(x0, y0), [cc, d] = this.toPix(x1, y1);
    this.ctx.fillStyle = color; this.ctx.fillRect(Math.min(a, cc), Math.min(b, d), Math.abs(cc - a), Math.abs(d - b));
  };
  Axes.prototype.dot = function (x, y, r, fill, stroke) {
    const c = this.ctx, [px, py] = this.toPix(x, y);
    c.beginPath(); c.arc(px, py, r, 0, 2 * Math.PI);
    c.fillStyle = fill || '#161414'; c.fill();
    if (stroke) { c.lineWidth = 3; c.strokeStyle = stroke; c.stroke(); }
  };
  Axes.prototype.text = function (x, y, s, size, align, color) {
    const c = this.ctx, [px, py] = this.toPix(x, y);
    c.fillStyle = color || '#161414'; c.textBaseline = 'middle';
    rich(c, s, px, py, size || this.o.font, align || 'left', true);
  };

  G.Axes = Axes;
})(window);
