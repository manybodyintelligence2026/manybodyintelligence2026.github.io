// "mbi" emerging from a Fermi sea.
//
// - The sea is made of ELECTRONs, filled up to the Fermi level. Its surface is smeared by a
//   Fermi-Dirac occupation, so near the surface there are a few excited electrons above it and a
//   few holes below it, flickering like thermal fluctuations.
// - Underneath are PHONONs: the rows do not flow, they jiggle back and forth (lattice vibrations).
// - Each letter is made of excitations starting with that letter: m = MAGNON, b = BOGOLIUBON,
//   i = IMPURITY. They are revealed
//   by a single breaking wave. A part of a letter appears only once the crest has passed it and
//   the water has drained off: briefly wet, in the sea's characters, then dry, in its own word.
// - The dot of the i is a single ELECTRON that pops out of the sea once the wave has passed,
//   leaving a hole behind.
//
// The wave. One swell crosses the sea. Far from the letters it is a low KdV solitary wave
//   eta = A sech^2((x - x_c)/Delta),  Delta = sqrt(4 h^3 / 3A),  c = c0 (1 + A/2h)
// (h: depth of the electron sea). As it nears the letters it grows until it is taller than the b,
// its front steepens and its back lengthens, and at its tallest the crest leans forward a little;
// then it subsides. The surface is stored as a curve rather than a height field, so the slight
// overhang of the leaning crest is allowed. The growth towards the letters is artistic.
//
// Two layouts: "open" (a flat sea across the full width) and "band" (the sea fills a parabolic
// band E(k) up to E_F, like a textbook band diagram).
(function (global) {
  "use strict";

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smooth(a, b, x) { var u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); }
  function easeOutBack(x) { var c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function sech2(x) { var c = Math.cosh(x); return 1 / (c * c); }

  var WAVE_START = 0.6, WAVE_TIME = 6.5;      // the crest crosses the whole width in this time
  var DOT_DELAY = 0.6, DOT_TIME = 1.4;        // after the wave has passed the i
  var SETTLED = WAVE_START + WAVE_TIME + 1.5;

  function build(layout) {
    return function (cols, H, aspect) {
      var band = layout === "band";
      var nRows = Math.round(H / aspect);
      var yF = (band ? 0.56 : 0.6) * H;                  // Fermi level (screen y, column units)
      var yL = (band ? 1.2 : 0.84) * H;                  // top of the lattice (open layout only)
      var kT = 0.7;                                      // thermal smearing, in rows
      var cx = cols / 2, w = 0.36 * cols, yB = 0.985 * H, a = (yB - yF) / (w * w);
      function par(X) { return yB - a * (X - cx) * (X - cx); }     // E(k): screen y of the band

      // ---------- the letters ----------
      var holeDepth = 0, dotStart = 0;
      function lift(t, dot) {
        if (!dot) return 0;                      // letters stay in place: the wave reveals them
        var d = easeOutBack(clamp01((t - dotStart) / DOT_TIME));
        return (1 - d) * holeDepth + 0.04 * Math.sin(1.4 * t) * d;
      }
      var letters = WordArt.lettering("mbi", ["MAGNON", "BOGOLIUBON", "IMPURITY"], {
        stroke: 0.3, gap: 0.62, fillH: 0.86, fillW: band ? 0.5 : 0.6, dotWord: "ELECTRON", lift: lift
      })(cols, yF, aspect);
      var m = letters.meta, S = m.S;
      var dy = (yF + 0.1 * S) - m.baseline;                 // feet just below the surface
      var base = m.baseline + dy, top = base - S * (1 + 0.78 + 0.3);
      var holeY = yF + 0.75 * S, holeR = 0.3 * 1.25 * S;
      var dotY = base - S * (1 + 2.25 * 0.3 + 0.24);
      holeDepth = (holeY - dotY) / S;
      var xL = m.ox - 0.3 * S, xR = m.dotX + 0.3 * S;      // left and right ends of the letters

      // ---------- the wave's height, width and path ----------
      var h = (band ? 0.3 * H : yL - yF);                   // depth of the electron sea
      var x0 = -0.2 * cols, x1 = 1.25 * cols;
      var A0 = (band ? 3 : 4) * aspect, Abig = (yF - top) + 2 * aspect;
      // Timeline along the crest's path: the swell rolls in from the left already at full size,
      // is tallest while it crosses the letters (where the crest leans forward a little), then
      // subsides.
      function rise(xc) { return smooth(x0, x0 + 0.12 * cols, xc); }          // full size before it comes on screen
      function fade(xc) { return smooth(xR - 0.02 * cols, xR + 0.3 * cols, xc); }
      function ampAt(xc) {
        var ends = smooth(x0, x0 + 0.12 * cols, xc) * (1 - smooth(x1 - 0.12 * cols, x1, xc));
        return (A0 + (Abig - A0) * rise(xc) * (1 - 0.75 * fade(xc))) * ends;
      }
      function width(A) { return Math.sqrt(4 * h * h * h / (3 * Math.max(A, 1e-3))); }
      function steep(xc) { return smooth(x0 + 0.25 * cols, xL + 0.15 * (xR - xL), xc); }
      function lean(xc) { return 0.3 * smooth(xL - 0.05 * cols, xL + 0.4 * (xR - xL), xc) * (1 - fade(xc)); }

      // integrate dx/dt = c0 (1 + A(x)/2h), with c0 chosen so the crossing takes WAVE_TIME
      var DT = 0.02, path = [x0], xx = x0, n = 0;
      while (xx < x1 && n < 100000) { xx += DT * (1 + ampAt(xx) / (2 * h)); path.push(xx); n++; }
      var c0 = (n * DT) / WAVE_TIME;
      function crestX(t) {
        var k = (t - WAVE_START) * c0 / DT;
        if (k <= 0) return x0;
        if (k >= path.length - 1) return path[path.length - 1] + (k - path.length + 1) * DT;
        var i = Math.floor(k), f = k - i;
        return path[i] + f * (path[i + 1] - path[i]);
      }
      function timeAt(xq) {
        for (var i = 0; i < path.length; i++) if (path[i] >= xq) return WAVE_START + i * DT / c0;
        return WAVE_START + WAVE_TIME;
      }
      dotStart = timeAt(xR + 0.3 * cols) + DOT_DELAY;

      // ---------- the water surface ----------
      // For each frame: build the surface as a polyline, then record where it crosses each row and
      // each column, so "is this cell in the water?" and "how far is it from the surface?" are cheap.
      var bottom = 2 * H;
      var cache = { t: NaN };
      // The surface: a swell with a steeper front than back (widths: the KdV width for a low
      // swell, tied to the height once it is big). The upper part of the wave tilts forward in
      // proportion to its height, and only the very tip bends down a little.
      function curve(A, st, ln) {
        var D = Math.max(width(A), 0.9 * A);
        var Lb = D * (1 + 0.39 * st), Lf = D * (1 - 0.44 * st);
        var X = [], Yu = [], N = 400;
        for (var i = 0; i <= N; i++) {
          var s = -4 * Lb + (4 * Lb + 4 * Lf) * i / N;
          var e = A * sech2(s / (s > 0 ? Lf : Lb)), q = A > 0 ? e / A : 0;
          var carry = ln * A * q * q;
          var drop = carry > 0.75 * ln * A ? 3 * Math.pow(carry - 0.75 * ln * A, 2) / A : 0;
          X.push(s + carry); Yu.push(e - drop);
        }
        return { x: X, y: Yu };
      }
      function water(t) {
        if (cache.t === t) return cache;
        var xc = crestX(t), A = ampAt(xc), cv = curve(A, steep(xc), lean(xc));
        var px = [], py = [], i, X;
        var xa0 = xc + cv.x[0], xb0 = xc + cv.x[cv.x.length - 1];
        for (X = sMinX; X < xa0; X += 1) { px.push(X); py.push(yF - calmAt(X, t)); }      // calm sea before
        for (i = 0; i < cv.x.length; i++) {
          X = xc + cv.x[i];
          px.push(X); py.push(yF - calmAt(X, t) - cv.y[i]);
        }
        for (X = Math.ceil(xb0) + 1; X <= sMaxX; X += 1) { px.push(X); py.push(yF - calmAt(X, t)); } // and after
        px.push(sMaxX, sMinX); py.push(bottom, bottom);   // close the polygon underneath
        var rowsX = [], colsY = [], m2 = px.length;
        for (var r = 0; r < nRows; r++) {
          var yr = (r + 0.5) * aspect, xs = [];
          for (var j = 0; j < m2; j++) {
            var k2 = (j + 1) % m2, ya = py[j], yb = py[k2];
            if ((ya <= yr) !== (yb <= yr)) xs.push(px[j] + (yr - ya) / (yb - ya) * (px[k2] - px[j]));
          }
          rowsX.push(xs.sort(function (p, q2) { return p - q2; }));
        }
        for (var c = 0; c < cols; c++) {
          var xcol = c + 0.5, ys = [];
          for (var j2 = 0; j2 < m2; j2++) {
            var k3 = (j2 + 1) % m2, xa = px[j2], xb = px[k3];
            if ((xa <= xcol) !== (xb <= xcol)) ys.push(py[j2] + (xcol - xa) / (xb - xa) * (py[k3] - py[j2]));
          }
          colsY.push(ys);
        }
        cache = { t: t, rowsX: rowsX, colsY: colsY };
        return cache;
      }
      var sMinX = -0.5 * cols, sMaxX = 1.5 * cols;
      function calmAt(X, t) { return aspect * (0.3 * Math.sin(0.12 * X - 0.9 * t) + 0.18 * Math.sin(0.31 * X + 0.55 * t)); }
      function inWater(X, Y, t) {
        var xs = water(t).rowsX[Math.round(Y / aspect - 0.5)];
        if (!xs) return Y > yF;
        var k = 0; while (k < xs.length && xs[k] < X) k++;
        return k % 2 === 1;
      }
      // approximate signed distance to the surface (negative in the water)
      function sdist(X, Y, t) {
        var wt = water(t), xs = wt.rowsX[Math.round(Y / aspect - 0.5)] || [], ys = wt.colsY[Math.round(X - 0.5)] || [];
        var d = 1e9, i;
        for (i = 0; i < xs.length; i++) d = Math.min(d, Math.abs(X - xs[i]));
        for (i = 0; i < ys.length; i++) d = Math.min(d, Math.abs(Y - ys[i]));
        return inWater(X, Y, t) ? -d : d;
      }
      function occ(X, Y, t) {
        // thermal smearing belongs to the Fermi level; the wave itself keeps a crisp edge
        var T = Y > yF - 2 * aspect ? kT : 0.25 * kT;
        var p = 1 / (Math.exp(sdist(X, Y, t) / (T * aspect)) + 1);
        return p;
      }
      function past(X, t) { return crestX(t) - X; }         // positive once the crest has gone by

      // ---------- shapes, front to back ----------
      var body = letters.slice(0, -1), dot = letters[letters.length - 1];
      var shapes = [];
      shapes.push({                                         // the dot: an electron that pops out later
        word: dot.word, dir: dot.dir,
        sdf: function (X, Y, t) { return inWater(X, Y, t) ? 1 : dot.sdf(X, Y - dy, t); }
      });
      function exposed(X, Y, t) { return past(X, t) > 0 && !inWater(X, Y, t); }
      function dryness(X, Y, t) { return smooth(0.3, 2.6, sdist(X, Y, t) / aspect); }
      body.forEach(function (Lt) {                          // dry: in the letter's own word
        shapes.push({
          word: Lt.word, dir: Lt.dir, fall: true, prob: dryness,
          sdf: function (X, Y, t) { return exposed(X, Y, t) ? Lt.sdf(X, Y - dy, t) : 1; }
        });
      });
      body.forEach(function (Lt) {                          // still wet: the sea's characters
        shapes.push({
          word: "ELECTRON ", cls: "sea", offset: seaOffset,
          sdf: function (X, Y, t) { return exposed(X, Y, t) ? Lt.sdf(X, Y - dy, t) : 1; }
        });
      });

      // the hole left by the electron that became the dot
      shapes.push({
        word: " ", blank: true,
        sdf: function (X, Y, t) {
          if (t < dotStart + 0.1) return 1;
          return Math.hypot(X - m.dotX, (Y - holeY) * 1.15) - holeR;
        }
      });

      // the Fermi sea
      function seaOffset(y, t, anim) {
        return y * 3 + (anim ? (y % 2 ? 1 : -1) * Math.floor(t * (0.8 + (y % 3) * 0.45)) : 0);
      }
      shapes.push({
        word: "ELECTRON ", cls: "sea", offset: seaOffset, prob: occ, noEdge: true,
        sdf: function (X, Y, t) {
          var d = Math.max(sdist(X, Y, t) - 3 * kT * aspect, Y - yL);
          return band ? Math.max(d, Y - par(X)) : d;
        }
      });

      // the lattice: rigid columns, each row jiggling by a character (phonons)
      function latOffset(y, t, anim) {
        return (y % 2) * 4 + (anim ? Math.round(0.9 * Math.sin(1.1 * t + y * 0.9)) : 0);
      }
      if (band) {
        shapes.push({
          word: "PHONON ", cls: "sea f2", offset: latOffset, noEdge: true,
          sdf: function (X, Y) { return Math.max(yF + aspect - Y, par(X) - Y); }
        });
        shapes.push({                         // the empty band above E_F, as a faint line
          word: "ELECTRON ", cls: "sea f2", offset: seaOffset, noEdge: true,
          sdf: function (X, Y) { return Y < yF ? Math.abs(Y - par(X)) - 0.55 * aspect : 1; }
        });
      } else {
        shapes.push({
          word: "PHONON ", cls: "sea", offset: latOffset, noEdge: true,
          sdf: function (X, Y) { return yL - Y; }
        });
      }
      return shapes;
    };
  }

  global.MBILogo = { build: build, settled: SETTLED };
})(window);
