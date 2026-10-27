// Torn edges on label tape, and the animated mbi logo on the home page.
(function () {
  // small seeded random, so the page looks the same on every load
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // torn label tape: jagged polygon along all four edges
  document.querySelectorAll(".tape, .signup").forEach(function (el, i) {
    var r = rng(17 + i), pts = [], n = 14, j = 5;
    for (var k = 0; k <= n; k++) pts.push((k / n * 100).toFixed(1) + "% " + (r() * j).toFixed(1) + "%");
    for (var k = 1; k < 4; k++) pts.push((100 - r() * 1.2).toFixed(1) + "% " + (k * 25).toFixed(1) + "%");
    for (var k = n; k >= 0; k--) pts.push((k / n * 100).toFixed(1) + "% " + (100 - r() * j).toFixed(1) + "%");
    for (var k = 3; k > 0; k--) pts.push((r() * 1.2).toFixed(1) + "% " + (k * 25).toFixed(1) + "%");
    el.style.clipPath = "polygon(" + pts.join(",") + ")";
  });

  // The mbi logo: plays once on load (the wave rolls through and the letters dry out behind it),
  // then stays settled with the sea moving gently. Clicking it plays it again.
  var logo = document.getElementById("logo");
  if (!logo || !window.WordArt || !window.MBILogo) return;
  var COLS = 150, ROWS = 46;
  function fit() {                      // scale the characters so the whole logo fits the width
    logo.style.fontSize = (logo.parentNode.clientWidth / (COLS * 0.6)) + "px";
  }
  fit();
  window.addEventListener("resize", fit);
  function start() {
    var h = WordArt.mount(logo, {
      cols: COLS, rows: ROWS, edge: 0.9, staticTime: MBILogo.settled, build: MBILogo.build("open")
    });
    logo.addEventListener("click", function () { h.restart(); });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
