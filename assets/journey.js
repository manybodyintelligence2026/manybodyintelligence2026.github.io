// The day in one picture, under the top line of the home page: a new idea, the team round a table with Claude,
// and the foundation of a paper, with the day's timeline (09:00 to 17:00) underneath. It plays once when it comes
// into view (about 12 s, at the logo's stop-motion pace), stays on the finished picture, and plays again on click.
// For people who ask for reduced motion it shows the finished picture straight away.
(function () {
  "use strict";
  var root = document.getElementById("journey");
  if (!root) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DURATION = 12, FPS = 10;
  // the day's phases (EVENT_PLAN.md), in hours after 09:00
  var PHASES = [["Scope", 0.25], ["First attempt", 1.25], ["First result", 2.25], ["Lunch", 3.25], ["Check", 4],
    ["Make figures", 5], ["Write", 6], ["Talks", 6.75], ["Review", 7.5]];
  var FIKA = [1, 6];                         // fika at 10:00 and 15:00, on their own row


  function mod(a, n) { return ((a % n) + n) % n; }
  function hash(x, y, z) {
    var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1103515245);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function ease(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }

  // a small grid of characters, as in the logo: text put at cells, shapes filled with a repeated word
  function CharGrid(el, cols, rows) {
    var aspect = 1.1 / 0.6, cells;
    function fit() { el.style.fontSize = (el.parentNode.clientWidth / (cols * 0.6)) + "px"; }
    fit(); addEventListener("resize", fit);
    var g = {
      aspect: aspect,
      clear: function () { cells = []; for (var y = 0; y < rows; y++) { cells.push([]); for (var x = 0; x < cols; x++) cells[y].push([" ", ""]); } },
      put: function (x, y, s, cls) {
        for (var i = 0; i < s.length; i++) if (s[i] !== " " && x + i >= 0 && x + i < cols && y >= 0 && y < rows) cells[y][x + i] = [s[i], cls || ""];
      },
      fill: function (sdf, word, off, seed) {
        var edge = 1.2;
        for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
          var d = sdf(x + 0.5, (y + 0.5) * aspect), c = "";
          if (d >= 0) continue;
          if (d > -edge) {
            var u = hash(x, y, seed), q = (d + edge) / edge;
            if (u < 0.5 * q) continue;
            c = u < 0.8 * q ? "f2" : u < q ? "f1" : "";
          }
          cells[y][x] = [word[mod(x + y * 3 + off, word.length)], c];
        }
      },
      render: function () {
        el.innerHTML = cells.map(function (row) {
          var out = "", run = "", rc = null;
          row.forEach(function (c) {
            var cl = c[0] === " " ? rc : c[1];
            if (cl !== rc) { if (run) out += rc ? '<span class="' + rc + '">' + run + "</span>" : run; run = ""; rc = cl; }
            run += c[0];
          });
          if (run) out += rc ? '<span class="' + rc + '">' + run + "</span>" : run;
          return out;
        }).join("\n");
      }
    };
    g.clear();
    return g;
  }

  // a person as a line drawing (head and shoulders) centred on (x, y)
  function person(x, y, r) {
    return '<g transform="translate(' + x + " " + y + ')" fill="none" stroke="currentColor" stroke-width="1.6">' +
      '<circle cx="0" cy="' + (-r * 0.55) + '" r="' + (r * 0.42) + '"/><path d="M' + (-r * 0.85) + " " + (r * 0.75) + " Q" + (-r * 0.8) + " " + (r * 0.05) +
      " 0 " + (r * 0.05) + " Q" + (r * 0.8) + " " + (r * 0.05) + " " + (r * 0.85) + " " + (r * 0.75) + '"/></g>';
  }

  root.innerHTML =
    '<div class="j-panels">' +
      '<div class="j-panel"><span class="tape">New idea</span><div class="j-art"></div></div>' +
      '<div class="j-arrow" aria-hidden="true">&#9654;</div>' +
      '<div class="j-panel"><span class="tape">Team + Claude</span><div class="j-mid"></div></div>' +
      '<div class="j-arrow" aria-hidden="true">&#9654;</div>' +
      '<div class="j-panel"><span class="tape">Paper foundation</span><div class="j-art"></div></div>' +
    '</div><div class="j-strip"><div class="j-line"></div><div class="j-done"></div><div class="j-cur"></div>' +
      '<span class="j-end" style="left:0">09:00</span><span class="j-end" style="right:0">17:00</span></div>';
  var panels = root.querySelectorAll(".j-panel"), arts = root.querySelectorAll(".j-art");
  var spark = CharGrid(arts[0], 30, 12), page = CharGrid(arts[1], 30, 12), A = spark.aspect;

  // the team: three people and a laptop running Claude round a table, seen from the front; ideas pass across as dots
  var mid = root.querySelector(".j-mid");
  mid.innerHTML = '<svg viewBox="0 0 190 128" width="100%" style="display:block;overflow:visible">' +
    '<ellipse cx="95" cy="64" rx="44" ry="30" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
    person(95, 18, 13) + person(30, 66, 13) + person(95, 118, 13) +
    '<g transform="translate(150 64)"><rect x="-13" y="-10" width="26" height="17" rx="2" fill="var(--paper-deep)" stroke="var(--mark)" stroke-width="1.6"/>' +
    '<text x="-8" y="2" font-size="8" fill="var(--mark)">&gt;_</text><path d="M-16 9 H16" stroke="var(--mark)" stroke-width="1.6"/></g>' +
    '<text x="168" y="90" text-anchor="middle" font-size="10" fill="var(--mark)" font-weight="600">Claude</text>' +
    '<circle class="j-q" r="2.6"/><circle class="j-q" r="2.6"/><circle class="j-q" r="2.6"/></svg>';
  var dots = mid.querySelectorAll(".j-q"), seat = [[95, 40], [57, 64], [95, 88], [133, 64]];
  var pairs = [[3, 0], [1, 3], [2, 1], [0, 2], [3, 2], [1, 0]];

  // the timeline
  var strip = root.querySelector(".j-strip"), done = strip.querySelector(".j-done"), cur = strip.querySelector(".j-cur");
  var labs = PHASES.map(function (ph, i) {
    var f = ph[1] / 8, t = document.createElement("div"), l = document.createElement("span");
    t.className = "j-tick"; t.style.left = (f * 100) + "%";
    l.className = "j-lab " + (i % 2 ? "dn" : "up") + (f < 0.08 ? " first" : f > 0.92 ? " last" : "");
    l.style.left = (f * 100) + "%"; l.textContent = ph[0];
    strip.appendChild(t); strip.appendChild(l); return l;
  });
  FIKA.forEach(function (h) {
    var t = document.createElement("div"), l = document.createElement("span");
    t.className = "j-tick fk"; t.style.left = (h / 8 * 100) + "%";
    l.className = "j-lab fk"; l.style.left = (h / 8 * 100) + "%"; l.textContent = "☕ Fika";
    strip.appendChild(t); strip.appendChild(l);
  });

  var LINES = ["TITLE TITLE", "question qu", "question", "result resu", "figure figu", "checks chec", "method meth", "", "[1] [2] [3]"];
  function draw(p, t) {
    var stage = p < 0.12 ? 0 : p < 0.75 ? 1 : 2;
    Array.prototype.forEach.call(panels, function (el, i) { el.classList.toggle("dim", i > stage); });
    // the idea: a four-pointed star filled with IDEA, pulsing gently
    var s = 1 + 0.08 * Math.sin(t * 3) * (p < 1 ? 1 : 0), mx = 15, my = 6 * A;
    spark.clear();
    spark.fill(function (x, y) {
      var dx = Math.abs(x - mx) / s, dy = Math.abs(y - my) / s / 1.1;
      return Math.min(Math.pow(dx, 0.62) + Math.pow(dy, 0.62) - Math.pow(10.5, 0.62), Math.hypot(dx, dy) - 4);
    }, "IDEA", Math.floor(t * 2), 7);
    spark.render();
    // the team: dots pass between the seats while the day runs
    for (var k = 0; k < 3; k++) {
      var tt = t * 0.6 + k * 0.7, j = Math.floor(tt) % pairs.length, u = ease(tt % 1), a = seat[pairs[j][0]], b = seat[pairs[j][1]];
      dots[k].setAttribute("cx", (a[0] + (b[0] - a[0]) * u).toFixed(1));
      dots[k].setAttribute("cy", (a[1] + (b[1] - a[1]) * u).toFixed(1));
      dots[k].setAttribute("fill", pairs[j][0] === 3 ? "var(--mark)" : "currentColor");
      dots[k].style.display = p > 0.12 && p < 1 ? "" : "none";
    }
    // the paper: its lines appear as the day goes on
    page.clear();
    page.put(7, 0, "+" + "-".repeat(15) + "+", "fd");
    for (var y = 1; y < 11; y++) { page.put(7, y, "|", "fd"); page.put(23, y, "|", "fd"); }
    page.put(7, 11, "+" + "-".repeat(15) + "+", "fd");
    var n = Math.floor(LINES.length * Math.max(0, Math.min(1, (p - 0.12) / 0.8)));
    LINES.slice(0, n).forEach(function (l, k) { page.put(9, 1 + k, l, k === 0 ? "" : "f1"); });
    page.render();
    // the timeline
    done.style.width = (p * 100) + "%"; cur.style.left = (p * 100) + "%";
    labs.forEach(function (l, i) { l.classList.toggle("on", 8 * p >= PHASES[i][1]); });
  }

  var timer = null, t0 = 0;
  function step() {
    var t = (performance.now() - t0) / 1000, p = Math.min(1, t / DURATION);
    draw(p, t);
    timer = p < 1 ? setTimeout(step, 1000 / FPS) : null;
  }
  function play() { if (reduce) return draw(1, 0); clearTimeout(timer); t0 = performance.now(); step(); }

  draw(reduce ? 1 : 0, 0);
  if (reduce) return;
  root.addEventListener("click", play);
  // start when it comes into view (and once the font is in, so the character art is measured right)
  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () {
    if (!("IntersectionObserver" in window)) return play();
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); play(); } }, { threshold: 0.4 });
    io.observe(root);
  });
})();
