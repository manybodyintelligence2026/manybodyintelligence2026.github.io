// Word art: shapes filled with repeated words, drawn as plain text.
// Each shape is a signed distance function (negative inside), measured in character columns.
// Animation redraws the text about 10 times a second, pauses when off screen or in a background
// tab, and is switched off for people who ask their system for reduced motion.
(function (global) {
  "use strict";

  // ---------- small helpers ----------
  function mod(a, n) { return ((a % n) + n) % n; }
  function hash(x, y, z) {
    var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1103515245);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // ---------- distance functions (in whatever units the caller uses) ----------
  var V = {
    circle: function (cx, cy, r) { return function (x, y) { return Math.hypot(x - cx, y - cy) - r; }; },
    seg: function (ax, ay, bx, by, r) {
      var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1e-9;
      return function (x, y) {
        var px = x - ax, py = y - ay, h = Math.max(0, Math.min(1, (px * dx + py * dy) / L));
        return Math.hypot(px - dx * h, py - dy * h) - r;
      };
    },
    ring: function (cx, cy, R, r) { return function (x, y) { return Math.abs(Math.hypot(x - cx, y - cy) - R) - r; }; },
    union: function (fs) { return function (x, y) { var d = 1e9; for (var i = 0; i < fs.length; i++) d = Math.min(d, fs[i](x, y)); return d; }; },
    clip: function (f, g) { return function (x, y) { return Math.max(f(x, y), g(x, y)); }; },
    above: function (cy) { return function (x, y) { return y - cy; }; },   // keeps y < cy (screen y points down)
    rightOf: function (cx) { return function (x, y) { return cx - x; }; }  // keeps x > cx
  };

  // ---------- letter shapes: x-height (or cap height) = 1, top at y = 0, baseline at y = 1 ----------
  // Each returns { w: advance width, parts: [{ f: sdf, key: name }] }.
  function glyph(ch, r) {
    var s = V.seg, ring = V.ring, clip = V.clip, U = V.union;
    switch (ch) {
      case "m": {
        var R = 0.42, s2 = 2 * R, s3 = 4 * R;
        return { w: s3, parts: [{ f: U([
          s(0, 0.05, 0, 1, r), s(s2, R, s2, 1, r), s(s3, R, s3, 1, r),
          clip(ring(R, R, R, r), V.above(R)), clip(ring(s2 + R, R, R, r), V.above(R))
        ]) }] };
      }
      case "b":
        return { w: 1.0, parts: [{ f: U([s(0, -0.78, 0, 1, r), ring(0.5, 0.5, 0.5, r)]) }] };
      case "i":
        return { w: 0, parts: [{ f: s(0, 0.02, 0, 1, r) }, { f: V.circle(0, -(2.25 * r + 0.24), r * 1.25), key: "dot" }] };
      case "M":
        return { w: 0.95, parts: [{ f: U([s(0, 0, 0, 1, r), s(0.95, 0, 0.95, 1, r),
          s(0, 0, 0.475, 0.62, r), s(0.95, 0, 0.475, 0.62, r)]) }] };
      case "B":
        return { w: 0.62, parts: [{ f: U([s(0, 0, 0, 1, r),
          s(0, 0, 0.3, 0, r), s(0, 0.48, 0.32, 0.48, r), s(0, 1, 0.34, 1, r),
          clip(ring(0.3, 0.24, 0.24, r), V.rightOf(0.3)), clip(ring(0.34, 0.74, 0.26, r), V.rightOf(0.34))]) }] };
      case "I":
        return { w: 0, parts: [{ f: U([s(0, 0, 0, 1, r), s(-0.24, 0, 0.24, 0, r), s(-0.24, 1, 0.24, 1, r)]) }] };
    }
    return { w: 0, parts: [] };
  }

  // Lay out a word of glyphs to fit a box (in columns), and return shapes in column units.
  // words: one fill word per letter; dotWord: fill word for the dot of an "i".
  function lettering(text, words, opts) {
    var r = opts.stroke || 0.17, gap = opts.gap || 0.5;
    var gs = [], width = 0;
    for (var i = 0; i < text.length; i++) {
      var g = glyph(text[i], r); g.x = width; gs.push(g);
      width += g.w + (i < text.length - 1 ? gap : 0);
    }
    var lower = text === text.toLowerCase();
    var top = lower ? Math.min(-0.78 - r, -(3.5 * r + 0.24)) : -r, bottom = 1 + r;     // vertical extent in letter units
    var left = (text[0] === "I" ? -0.24 : 0) - r, right = width + r + (text[text.length - 1] === "I" ? 0.24 : 0);
    return function build(cols, rowsPhys, aspect) {
      var S = Math.min(opts.fillH * rowsPhys / (bottom - top), opts.fillW * cols / (right - left));
      var ox = (cols - S * (right - left)) / 2 - S * left;
      var oy = (opts.oy != null ? opts.oy * rowsPhys : (rowsPhys - S * (bottom - top)) / 2) - S * top;
      var shapes = [];
      shapes.meta = { S: S, ox: ox, oy: oy, baseline: oy + S };
      gs.forEach(function (g, k) {
        g.parts.forEach(function (p) {
          var dot = p.key === "dot";
          if (dot) shapes.meta.dotX = ox + S * g.x;
          (shapes.meta.centres = shapes.meta.centres || [])[k] = ox + S * (g.x + g.w / 2);
          shapes.push({
            word: dot ? (opts.dotWord || words[k]) : words[k],
            dir: k % 2 ? -1 : 1,
            sdf: (function (f, gx) {
              return function (X, Y, t) {
                var bob = dot && opts.bob ? 0.06 * Math.sin(t * 1.6) : 0;
                var lift = opts.lift ? opts.lift(t, dot, k) : 0;     // in letter units, positive = lower
                return S * f((X - ox) / S - gx, (Y - oy) / S - bob - lift);
              };
            })(p.f, g.x)
          });
        });
      });
      return shapes;
    };
  }

  // ---------- the renderer ----------
  function mount(el, cfg) {
    var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var animate = cfg.animate !== false && (!reduce || cfg.manual);   // manual: frames drawn on request
    var fps = cfg.fps || 10, t0 = performance.now(), visible = true, timer = null, paused = false;
    var cols, rows, aspect, shapes, last = null;
    function now() { return animate ? (performance.now() - t0) / 1000 : (cfg.staticTime || 0); }

    function measure() {
      var probe = document.createElement("span");
      probe.textContent = "MMMMMMMMMM";
      el.textContent = ""; el.appendChild(probe);
      var b = probe.getBoundingClientRect();
      el.removeChild(probe);
      var cw = b.width / 10, lh = parseFloat(getComputedStyle(el).lineHeight) || b.height;
      aspect = lh / cw;
      cols = cfg.cols || Math.max(30, Math.floor(el.clientWidth / cw));
      rows = typeof cfg.rows === "function" ? cfg.rows(cols) : cfg.rows;
      var seaRows = cfg.sea ? (typeof cfg.sea.rows === "function" ? cfg.sea.rows(cols) : cfg.sea.rows) : 0;
      shapes = cfg.build(cols, (rows - seaRows) * aspect, aspect, cols < 60);
      shapes.seaRows = seaRows;
    }

    function frame(t) {
      var e = cfg.edge || 1.6, flick = Math.floor(t * (cfg.flicker || 3));
      var seaRows = shapes.seaRows, html = [], grid = [];
      for (var y = 0; y < rows; y++) {
        var line = "", run = "", runCls = null, gl = [];
        for (var x = 0; x < cols; x++) {
          var ch = " ", cls = "";
          if (y >= rows - seaRows) {
            var k = y - (rows - seaRows), depth = seaRows > 1 ? k / (seaRows - 1) : 1;
            var w = cfg.sea.word, sp = animate ? Math.floor(t * (0.8 + (k % 3) * 0.5)) : 0;
            ch = w[mod(x + y * 3 + (k % 2 ? sp : -sp), w.length)];
            cls = depth < 0.34 ? "sea f2" : depth < 0.67 ? "sea f1" : "sea";
          } else {
            var X = x + 0.5, Y = (y + 0.5) * aspect;
            for (var s = 0; s < shapes.length; s++) {
              var S = shapes[s], d = S.sdf(X, Y, t);
              if (d < 0) {
                if (S.blank) break;
                var off = S.offset ? S.offset(y, t, animate)
                  : y * 3 + s * 5 + (animate ? (S.dir || 1) * Math.floor(t * (S.speed || cfg.speed || 2.2)) : 0);
                ch = S.word[mod(x + off, S.word.length)];
                if (S.prob) {
                  // the character is present with probability p (e.g. a Fermi-Dirac occupation)
                  var p = S.prob(X, Y, t), u2 = hash(x, y, animate ? flick : 0);
                  if (u2 >= p) {
                    ch = " ";
                    if (S.fall) continue;      // not drawn here: let the next shape draw this cell
                  }
                  else if (p < 0.45) cls = "f2";
                  else if (p < 0.8) cls = "f1";
                }
                if (ch !== " " && !S.noEdge && d > -e) {
                  var u = hash(x, y, animate ? flick : 0), q = (d + e) / e;   // q: 0 inside, 1 at the edge
                  if (u < 0.5 * q) ch = " ";
                  else if (u < 0.8 * q) cls = "f2";
                  else if (u < q) cls = "f1";
                }
                if (S.cls) cls = S.cls + (cls ? " " + cls : "");
                break;
              }
            }
          }
          gl.push([ch, cls]);
          if (ch === " ") cls = runCls || "";
          if (cls !== runCls) {
            if (run) line += runCls ? '<span class="' + runCls + '">' + run + "</span>" : run;
            run = ""; runCls = cls;
          }
          run += ch;
        }
        if (run) line += runCls ? '<span class="' + runCls + '">' + run + "</span>" : run;
        html.push(line); grid.push(gl);
      }
      el.innerHTML = html.join("\n");
      last = grid;
    }

    function tick() {
      timer = null;
      if (!animate || paused || !visible || document.hidden) return;
      frame(now());
      timer = setTimeout(tick, 1000 / fps);
    }
    function start() { if (!timer) tick(); }

    measure(); frame(now());
    if (animate && !cfg.manual) {
      if ("IntersectionObserver" in global) {
        new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }).observe(el);
      }
      document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
      start();
    }
    var rt;
    global.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { measure(); frame(now()); }, 150);
    });

    return {
      pause: function () { paused = true; },
      play: function () { if (!animate) return; paused = false; start(); },
      setAnimate: function (on) { animate = on && !reduce; if (animate) { paused = false; start(); } else { frame(now()); } },
      restart: function () { t0 = performance.now(); if (animate) { paused = false; start(); } },
      grid: function () { return last; },
      renderAt: function (t) { frame(t); return last; },
      el: el
    };
  }

  // ---------- export the current frame as a PNG ----------
  function toPNG(handle, opts) {
    var el = handle.el, grid = handle.grid(), cs = getComputedStyle(el);
    var scale = opts.scale || 4, fs = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight);
    var ctx = document.createElement("canvas").getContext("2d");
    ctx.font = cs.fontWeight + " " + fs + "px " + cs.fontFamily;
    var cw = ctx.measureText("M").width, pad = opts.pad == null ? 2 : opts.pad;
    var c = ctx.canvas;
    c.width = Math.ceil((grid[0].length + 2 * pad) * cw * scale);
    c.height = Math.ceil((grid.length + 2 * pad) * lh * scale);
    ctx = c.getContext("2d");
    if (opts.background) { ctx.fillStyle = opts.background; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.font = cs.fontWeight + " " + fs * scale + "px " + cs.fontFamily;
    ctx.textBaseline = "middle";
    var root = getComputedStyle(document.documentElement);
    var ink = opts.ink || cs.color, sea = opts.sea || root.getPropertyValue("--faded").trim() || ink;
    grid.forEach(function (row, y) {
      row.forEach(function (cell, x) {
        if (cell[0] === " ") return;
        var cl = cell[1] || "";
        ctx.globalAlpha = cl.indexOf("f2") >= 0 ? 0.28 : cl.indexOf("f1") >= 0 ? 0.55 : 1;
        ctx.fillStyle = cl.indexOf("sea") >= 0 ? sea : ink;
        ctx.fillText(cell[0], (x + pad) * cw * scale, (y + pad + 0.5) * lh * scale);
      });
    });
    return c.toDataURL("image/png");
  }

  global.WordArt = { mount: mount, lettering: lettering, V: V, toPNG: toPNG };
})(window);
