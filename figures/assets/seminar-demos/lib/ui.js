// ui.js: small helpers shared by the slide controls (thermometer, interaction slider).
(function (G) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  // A labelled transition mark on a vertical control: a long, heavy tick at height y (svg units)
  // with an italic symbol and an upright subscript to its right, e.g. mark(svg, 300, 'T', 'c').
  function mark(svg, y, sym, sub, opt) {
    const o = Object.assign({ x: 132, len: 46, size: 34 }, opt);
    const g = document.createElementNS(NS, 'g');
    g.innerHTML =
      `<line x1="${o.x}" x2="${o.x + o.len}" y1="${y}" y2="${y}" stroke="#161414" stroke-width="7" stroke-linecap="round"/>` +
      `<text x="${o.x + o.len + 10}" y="${y + o.size * 0.35}" font-family="Fira Sans, Arial, sans-serif" font-size="${o.size}" fill="#161414">` +
      `<tspan font-style="${o.plain ? 'normal' : 'italic'}">${sym}</tspan><tspan font-size="${Math.round(o.size * 0.68)}" dy="${o.size * 0.28}">${sub}</tspan></text>`;
    svg.appendChild(g);
  }

  // Remove plain ticks (lines in group g) that sit within tol of a labelled mark, so marks read cleanly.
  function clearNear(g, ys, tol) {
    for (const ln of Array.from(g.querySelectorAll('line'))) {
      const y = +ln.getAttribute('y1');
      if (ys.some(m => Math.abs(m - y) < (tol || 30))) ln.remove();
    }
  }

  // Order-parameter-like onset: 0 below a, rises steeply just past a, saturates at b.
  function onset(g, [a, b]) {
    const t = Math.min(1, Math.max(0, (g - a) / (b - a)));
    return 1 - (1 - t) * (1 - t);
  }

  // A vertical slider in the deck style (same geometry as the interaction slider on the
  // quantum-fluid slide). Returns { svg, get, set(v, silent), yOf(v), relabel }.
  // opt: { parent, x, y, label, labelColor, value, ticks, onInput }
  function vslider(opt) {
    const o = Object.assign({ x: 0, y: 196, value: 0, ticks: 8, label: '', labelColor: '#161414', scale: 1, onInput: () => {} }, opt);
    const BOT = 590, TOP = 50;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', 290 * o.scale); svg.setAttribute('height', 640 * o.scale); svg.setAttribute('viewBox', '0 0 290 640');
    svg.style.cssText = `position:absolute; left:${o.x}px; top:${o.y}px; cursor:ns-resize; touch-action:none;`;
    const id = 'g' + Math.random().toString(36).slice(2, 8);
    svg.innerHTML =
      `<defs><clipPath id="${id}"><rect x="76" y="20" width="38" height="600" rx="19"/></clipPath></defs>` +
      `<rect x="76" y="20" width="38" height="600" rx="19" fill="#F5F2EC"/>` +
      `<g clip-path="url(#${id})"><rect class="fill" x="76" y="320" width="38" height="320" fill="#161414"/></g>` +
      `<rect x="76" y="20" width="38" height="600" rx="19" fill="none" stroke="#161414" stroke-width="6"/>` +
      `<g class="ticks" stroke="#161414" stroke-width="5" stroke-linecap="round"></g>` +
      `<g class="marks"></g>` +
      `<circle class="knob" cx="95" cy="320" r="34" fill="#161414" stroke="#F5F2EC" stroke-width="5"/>`;
    o.parent.appendChild(svg);
    const ticks = svg.querySelector('.ticks'), marks = svg.querySelector('.marks');
    const fill = svg.querySelector('.fill'), knob = svg.querySelector('.knob');
    const yOf = v => BOT - v * (BOT - TOP);
    function drawTicks(markYs) {
      ticks.innerHTML = '';
      for (let i = 0; i <= o.ticks; i++) {
        const y = yOf(i / o.ticks), len = i % (o.ticks / 2) === 0 ? 30 : 16;
        if ((markYs || []).some(m => Math.abs(m - y) < 30)) continue;
        ticks.insertAdjacentHTML('beforeend', `<line x1="132" x2="${132 + len}" y1="${y}" y2="${y}"/>`);
      }
    }
    // marks: [{v, sym, sub}] ; replaces any previous marks
    function relabel(list) {
      marks.innerHTML = '';
      for (const m of list) mark(marks, yOf(m.v), m.sym, m.sub || '', { plain: !!m.plain });
      drawTicks(list.map(m => yOf(m.v)));
    }
    drawTicks([]);
    const lab = document.createElement('div');
    lab.textContent = o.label;
    lab.style.cssText = `position:absolute; left:${o.x + 95 * o.scale - 150}px; top:${o.y + 650 * o.scale}px; width:300px; text-align:center; font-weight:bold; font-size:34px; color:${o.labelColor};`;
    o.parent.appendChild(lab);
    let v = o.value;
    function set(nv, silent) {
      v = Math.min(1, Math.max(0, nv));
      const y = yOf(v);
      knob.setAttribute('cy', y.toFixed(1));
      fill.setAttribute('y', y.toFixed(1)); fill.setAttribute('height', (640 - y).toFixed(1));
      if (!silent) o.onInput(v);
    }
    let drag = false;
    const fromEv = e => { const r = svg.getBoundingClientRect(); set((BOT - (e.clientY - r.top) * 640 / r.height) / (BOT - TOP)); };
    svg.addEventListener('pointerdown', e => { drag = true; svg.setPointerCapture(e.pointerId); fromEv(e); });
    svg.addEventListener('pointermove', e => { if (drag) fromEv(e); });
    svg.addEventListener('pointerup', () => { drag = false; });
    set(v, true);
    return { svg, get: () => v, set, yOf, relabel, label: lab };
  }

  // A clickable legend: a row of entries (swatch canvas + label), right-aligned at (right, top).
  // items: [{ key, label, color, swatch(ctx, size) }]; onToggle(key, faded). Faded entries dim.
  function legend(opt) {
    const o = Object.assign({ right: 1849, top: 196, size: 34, gap: 34, onToggle: () => {} }, opt);
    const row = document.createElement('div');
    row.style.cssText = `position:absolute; right:${1920 - o.right}px; top:${o.top}px; display:flex; gap:${o.gap}px; align-items:center;`;
    const state = {};
    for (const it of o.items) {
      const el = document.createElement('div');
      el.style.cssText = `display:flex; align-items:center; gap:12px; cursor:pointer; font-size:32px; font-weight:bold; color:${it.color}; transition:opacity .3s; user-select:none;`;
      const cv = document.createElement('canvas');
      cv.width = cv.height = o.size * 2; cv.style.width = cv.style.height = o.size + 'px';
      it.swatch(cv.getContext('2d'), o.size * 2);
      const lab = document.createElement('span'); lab.textContent = it.label;
      el.append(cv, lab);
      state[it.key] = false;
      el.addEventListener('click', () => {
        state[it.key] = !state[it.key];
        el.style.opacity = state[it.key] ? 0.35 : 1;
        o.onToggle(it.key, state[it.key]);
      });
      it.el = el;
      row.appendChild(el);
    }
    o.parent.appendChild(row);
    return { toggle: key => o.items.find(i => i.key === key).el.click(), state };
  }

  // The standard ions / electrons legend for chain slides, wired to a Chain's fades (keys I / E).
  function chainLegend(parent, chain, opt) {
    const ball = Stipple.ball(30, { seed: 3, s: 1 }), elRand = Stipple.rng(5);
    const lg = legend(Object.assign({
      parent,
      items: [
        { key: 'ions', label: 'ions', color: '#3F7330',
          swatch: (c, S) => c.drawImage(ball, (S - ball.width) / 2, (S - ball.height) / 2) },
        { key: 'el', label: 'electrons', color: '#2E6FC2',
          swatch: (c, S) => {
            c.fillStyle = 'rgba(22,72,165,0.95)';
            for (let i = 0; i < 70; i++) {
              const r = S * 0.42 * Math.sqrt(elRand()), th = 2 * Math.PI * elRand();
              c.fillRect(S / 2 + r * Math.cos(th) - 2.5, S / 2 + r * Math.sin(th) - 2.5, 5, 5);
            }
          } }
      ],
      onToggle: (key, faded) => chain.setFade(key, faded)
    }, opt));
    addEventListener('keydown', e => {
      if (e.key === 'i' || e.key === 'I') lg.toggle('ions');
      else if (e.key === 'e' || e.key === 'E') lg.toggle('el');
    });
    return lg;
  }

  G.UI = { mark, clearNear, onset, vslider, legend, chainLegend };
})(window);
