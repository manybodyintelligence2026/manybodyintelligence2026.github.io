// stage.js: fit the 1920x1080 stage to the window and paint the page grain.
// Stage.init(onScale, opt) calls onScale(k) whenever the device-pixel scale k changes. opt.paper: options for the
// page grain (Stipple.paper), e.g. a different stock for the title slide.
(function (G) {
  'use strict';
  const W = 1920, H = 1080;
  function init(onScale, opt) {
    const paperOpt = Object.assign({ seed: 21, base: [251, 250, 247], blank: [251, 250, 247], wear: 0 }, opt && opt.paper);
    const stage = document.getElementById('stage'), bg = document.getElementById('bg');
    let k = 0;
    function fit() {
      const s = Math.min(innerWidth / W, innerHeight / H);
      stage.style.transform = `translate(${(innerWidth - W * s) / 2}px, ${(innerHeight - H * s) / 2}px) scale(${s})`;
      const nk = Math.max(0.5, Math.min(3, s * (window.devicePixelRatio || 1)));
      if (Math.abs(nk - k) < 1e-3) return;
      k = nk;
      if (bg) {
        bg.width = Math.round(W * k); bg.height = Math.round(H * k);
        bg.getContext('2d').drawImage(Stipple.paper(bg.width, bg.height, Object.assign({ s: k }, paperOpt)), 0, 0);
      }
      onScale(k);
    }
    addEventListener('resize', fit);
    fit();
    // canvases drawn before the deck font arrived used the fallback: draw everything once more when it is in
    if (document.fonts && !document.fonts.check('900 20px "Fira Sans"')) {
      Promise.all(['300', '400', '700', '900'].map(w => document.fonts.load(w + ' 20px "Fira Sans"')))
        .then(() => { k = 0; fit(); }).catch(() => {});
    }
  }
  // Render every element with a data-tex attribute through KaTeX (if it has loaded).
  function tex(root) {
    if (!G.katex) return;
    (root || document).querySelectorAll('[data-tex]').forEach(el => {
      G.katex.render(el.getAttribute('data-tex'), el, { throwOnError: false, displayMode: false });
    });
  }
  G.Stage = { init, tex, W, H };
})(window);
