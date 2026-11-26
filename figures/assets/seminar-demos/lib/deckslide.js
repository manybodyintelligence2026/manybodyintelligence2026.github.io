// deckslide.js: the slide side of the deck shell (index.html shows one slide page at a time in an iframe).
//
// A slide page includes this script and may declare builds and the keys it uses itself:
//   Deck.slide({ steps: 3, onStep: k => ..., claims: ['ArrowLeft', 'ArrowRight', ' '] })
// steps   number of builds after the initial state (default 0); onStep(k) shows build k = 0 .. steps
// claims  keys the slide uses for its own controls; the shell then leaves them alone
// Navigation: PageDown/PageUp always mean "next build, else next slide"; ArrowRight/ArrowLeft and space do the
// same unless claimed. The slide decides (it knows its builds) and asks the shell to change slide when done.
// The shell tells the slide when it becomes active (and whether it was entered backwards), sets the header
// number, and pauses the slide's animation loop while it is hidden. Opened on its own (no shell), a slide works
// as before: builds advance, navigation keys at the ends do nothing.
//
// Presenter mirroring: the same slide runs in the audience window and in the presenter view. Interactive input
// (pointer drags and clicks in stage coordinates, keys the slide handles itself) and build changes are reported
// to the shell, which relays them to the other window; there they are replayed here. Navigation keys are not
// mirrored as keys: their result (build step, slide change) is, so the two windows cannot drift apart.
(function (G) {
  'use strict';
  const inShell = G.parent && G.parent !== G;
  const cfg = { steps: 0, onStep: null, claims: [] };
  let step = 0, active = !inShell;

  function post(msg) { if (inShell) G.parent.postMessage(Object.assign({ deck: true }, msg), '*'); }
  function setStep(k, remote) {
    const prev = step;
    step = Math.max(0, Math.min(cfg.steps, k));
    if (cfg.onStep) cfg.onStep(step);
    if (!remote && step !== prev) post({ type: 'step', step });
    if (step !== prev && G.Deck) setTimeout(reportIds, 700);             // after the build's own transition
    if (G.Deck && G.Deck.comments) G.Deck.comments.refresh();          // pins of this build at full strength
  }
  function forward() { if (step < cfg.steps) setStep(step + 1); else post({ type: 'nav', dir: 1 }); }
  function back() { if (step > 0) setStep(step - 1); else post({ type: 'nav', dir: -1 }); }

  const NEXT = { PageDown: 1, ArrowRight: 1, ' ': 1 }, PREV = { PageUp: 1, ArrowLeft: 1 };
  const SHELL_KEYS = { b: 'black', B: 'black', '.': 'black', f: 'full', F: 'full', Home: 'home', End: 'end',
    p: 'presenter', P: 'presenter', o: 'overview', O: 'overview' };
  // (6 Nov) the arrows always step the deck: the Logitech Spotlight's forward / back buttons send ArrowRight / ArrowLeft,
  // so no slide may claim them (slide controls use [ and ] instead)
  const isClaimed = k => k !== 'ArrowLeft' && k !== 'ArrowRight' && cfg.claims.indexOf(k) >= 0 || (k.length === 1 && cfg.claims.indexOf(k.toLowerCase()) >= 0);

  function onKey(e) {
    if (e.__deckSynthetic) return;
    const k = e.key;
    // edit mode: Ctrl+Shift+E (F2 also works where the function keys are free)
    if (k === 'F2' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 'E' || k === 'e'))) {
      e.preventDefault(); e.stopImmediatePropagation(); toggleEditor(); return;
    }
    if (G.__deckEditing || G.__deckTyping) return;                   // the editor / a comment box owns the keyboard
    if (isClaimed(k)) { post({ type: 'input', ev: { kind: 'key', key: k } }); return; }
    if (extraKey(k)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (NEXT[k] || PREV[k]) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (NEXT[k]) forward(); else back();
    } else if (SHELL_KEYS[k] && inShell) {
      e.preventDefault(); e.stopImmediatePropagation();
      post({ type: SHELL_KEYS[k] });
    } else if (k.length === 1 || /^Arrow/.test(k)) {
      post({ type: 'input', ev: { kind: 'key', key: k } });          // a slide key (Q, R, 3, ...): mirror it
    }
  }
  G.addEventListener('keydown', onKey, true);   // capture: runs before the slide's own handlers

  // ---- pointer mirroring (stage coordinates, 1920 x 1080) ----------------------------------------
  function toStage(e) {
    const st = document.getElementById('stage');
    if (!st) return null;
    const r = st.getBoundingClientRect();
    return [(e.clientX - r.left) * 1920 / r.width, (e.clientY - r.top) * 1080 / r.height];
  }
  function fromStage(x, y) {
    const r = document.getElementById('stage').getBoundingClientRect();
    return [r.left + x * r.width / 1920, r.top + y * r.height / 1080];
  }
  let down = false;
  function onPointer(e) {
    if (!e.isTrusted || !inShell || G.__deckEditing || G.__deckCommenting || e.altKey || inkMode === 'pen' || inkMode === 'zoom') return;   // zoom, pen: not slide input
    if (e.type === 'pointerdown') down = true;
    if (e.type === 'pointermove' && !down) return;                   // only drags, not hover
    if (e.type === 'pointerup' || e.type === 'pointercancel') down = false;
    const p = toStage(e);
    if (p) post({ type: 'input', ev: { kind: e.type, x: p[0], y: p[1] } });
  }
  ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click'].forEach(t => G.addEventListener(t, onPointer, true));
  // replayed events carry an invalid pointerId; pointer capture must not throw for them
  for (const fn of ['setPointerCapture', 'releasePointerCapture']) {
    const orig = Element.prototype[fn];
    Element.prototype[fn] = function (id) { try { return orig.call(this, id); } catch (err) { return undefined; } };
  }
  let dragTarget = null;
  function replay(ev) {
    if (ev.kind === 'key') {
      const synth = new KeyboardEvent('keydown', { key: ev.key, bubbles: true });
      synth.__deckSynthetic = true;
      (document.activeElement || document.body).dispatchEvent(synth);
      return;
    }
    if (!document.getElementById('stage')) return;
    const [cx, cy] = fromStage(ev.x, ev.y);
    let target = document.elementFromPoint(cx, cy);
    if (ev.kind === 'pointerdown') dragTarget = target;
    else if (ev.kind !== 'click' && dragTarget) target = dragTarget;
    if (!target) return;
    const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, pointerId: 9, isPrimary: true,
      button: 0, buttons: ev.kind === 'pointerup' || ev.kind === 'click' ? 0 : 1, pointerType: 'mouse' };
    target.dispatchEvent(ev.kind === 'click' ? new MouseEvent('click', opts) : new PointerEvent(ev.kind, opts));
    if (ev.kind === 'pointerup' || ev.kind === 'pointercancel') dragTarget = null;
  }

  // ---- presenting extras --------------------------------------------------------------------------------
  // Alt+click asks the shell to zoom about that point (again, or Esc, zooms out). L laser pointer, D pen, X clears
  // the ink, Esc leaves the mode. The presenter view's buttons do the same through 'tool' messages. Ink lives on a canvas over the slide, in stage coordinates, and is relayed to
  // the other window (presenter <-> audience); it is cleared when the slide is left. A horizontal swipe on a touch
  // screen changes build / slide. Auto-animate: see flip().
  const INK = '#E8392A';
  let inkMode = null, ink = null, inkLoop = false;
  function inkLayer() {
    if (ink) return ink;
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:9000;';
    document.body.appendChild(cv);
    const hide = document.createElement('style');
    document.head.appendChild(hide);
    ink = { cv, ctx: cv.getContext('2d'), strokes: [], trail: [], dot: null, hide };
    return ink;
  }
  function drawInk() {
    const I = inkLayer(), dpr = G.devicePixelRatio || 1, st = document.getElementById('stage');
    if (!st) return;
    if (I.cv.width !== Math.round(innerWidth * dpr) || I.cv.height !== Math.round(innerHeight * dpr)) {
      I.cv.width = Math.round(innerWidth * dpr); I.cv.height = Math.round(innerHeight * dpr);
    }
    const r = st.getBoundingClientRect(), k = r.width / 1920, c = I.ctx;
    c.setTransform(dpr * k, 0, 0, dpr * k, dpr * r.left, dpr * r.top);
    c.clearRect(-r.left / k, -r.top / k, innerWidth / k, innerHeight / k);
    c.lineCap = c.lineJoin = 'round'; c.strokeStyle = INK; c.lineWidth = 6;
    for (const s of I.strokes) {
      c.beginPath(); s.forEach(([x, y], j) => j ? c.lineTo(x, y) : c.moveTo(x, y));
      if (s.length === 1) c.lineTo(s[0][0] + 0.1, s[0][1]);
      c.stroke();
    }
    // laser: a glowing dot with a short fading trail
    const now = performance.now();
    I.trail = I.trail.filter(p => now - p[2] < 250);
    c.shadowColor = INK;
    I.trail.forEach(([x, y, t]) => {
      const a = 1 - (now - t) / 250;
      c.globalAlpha = 0.5 * a; c.shadowBlur = 0; c.fillStyle = INK;
      c.beginPath(); c.arc(x, y, 9 * a, 0, 2 * Math.PI); c.fill();
    });
    c.globalAlpha = 1;
    if (I.dot) {
      c.shadowBlur = 24 * k * dpr; c.fillStyle = INK;
      c.beginPath(); c.arc(I.dot[0], I.dot[1], 11, 0, 2 * Math.PI); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#FFE6E0';
      c.beginPath(); c.arc(I.dot[0], I.dot[1], 4, 0, 2 * Math.PI); c.fill();
    }
    c.shadowBlur = 0;
    if (I.dot || I.trail.length) realRAF(drawInk); else inkLoop = false;
  }
  function kick() { if (!inkLoop) { inkLoop = true; realRAF(drawInk); } }
  // one ink event, local or relayed from the other window: laser x y | off | start x y | pt x y | clear
  function applyInk(ev, local) {
    const I = inkLayer();
    if (ev.k === 'laser') { if (I.dot) I.trail.push([I.dot[0], I.dot[1], performance.now()]); I.dot = [ev.x, ev.y]; }
    else if (ev.k === 'off') I.dot = null;
    else if (ev.k === 'start') I.strokes.push([[ev.x, ev.y]]);
    else if (ev.k === 'pt') { const s = I.strokes[I.strokes.length - 1]; if (s) s.push([ev.x, ev.y]); }
    else if (ev.k === 'clear') I.strokes = [];
    kick(); if (!inkLoop) drawInk();
    if (local) post({ type: 'ink', ev });
  }
  // modes: laser, pen, zoom (armed by the presenter view's Zoom button: the next click zooms there)
  function setMode(m) { applyMode(inkMode === m ? null : m, false); }
  // (6 Nov) the mode is set exactly here; quiet = set by the shell (kept across slides and windows), not reported back
  let idleT = null;
  function applyMode(m, quiet) {
    inkMode = m;
    const I = inkLayer();
    I.hide.textContent = { laser: '*{cursor:none!important}', pen: '*{cursor:crosshair!important}', zoom: '*{cursor:zoom-in!important}' }[inkMode] || '';
    if (inkMode !== 'laser' && I.dot) applyInk({ k: 'off' }, true);
    if (!quiet) post({ type: 'mode', mode: inkMode });                // the shell shares it with the other window
  }
  function extraKey(k) {
    if (k === 'm' || k === 'M') { toggleComments(); return true; }
    if (k === 'Escape' && G.__deckCommenting) { G.Deck.comments.off(); return true; }
    if (k === 'l' || k === 'L') setMode('laser');
    else if (k === 'd' || k === 'D') setMode('pen');
    else if (k === 'x' || k === 'X') applyInk({ k: 'clear' }, true);
    else if (k === 'Escape') { if (inkMode) setMode(inkMode); post({ type: 'zoom', off: true }); }
    else return false;
    return true;
  }
  let penDown = false, swipe = null;
  function onExtraPointer(e) {
    if (!e.isTrusted || G.__deckEditing || G.__deckCommenting) return;
    if (e.altKey || inkMode === 'zoom') {                              // zoom: the click is not the slide's
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.type === 'pointerdown' && inShell) {
        post({ type: 'zoom', x: e.clientX / innerWidth, y: e.clientY / innerHeight });
        if (inkMode === 'zoom') setMode('zoom');
      }
      return;
    }
    const p = (e.type.startsWith('pointer') && (inkMode || e.pointerType === 'touch')) ? toStage(e) : null;
    if (inkMode === 'pen') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!p) return;
      if (e.type === 'pointerdown') { penDown = true; applyInk({ k: 'start', x: p[0], y: p[1] }, true); }
      else if (e.type === 'pointermove' && penDown) applyInk({ k: 'pt', x: p[0], y: p[1] }, true);
      else if (e.type === 'pointerup' || e.type === 'pointercancel') penDown = false;
      return;
    }
    if (inkMode === 'laser' && e.type === 'pointermove' && p) {
      applyInk({ k: 'laser', x: p[0], y: p[1] }, true);
      clearTimeout(idleT); idleT = setTimeout(() => applyInk({ k: 'off' }, true), 2500);   // hide when the pointer rests
    }
    if (e.pointerType === 'touch' && p) {
      if (e.type === 'pointerdown') swipe = { x: p[0], y: p[1], t: performance.now() };
      else if (e.type === 'pointerup' && swipe) {
        const dx = p[0] - swipe.x, dy = p[1] - swipe.y;
        if (Math.abs(dx) > 120 && Math.abs(dy) < 0.6 * Math.abs(dx) && performance.now() - swipe.t < 700) { if (dx < 0) forward(); else back(); }
        swipe = null;
      }
    }
  }
  ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click', 'dblclick'].forEach(t => G.addEventListener(t, onExtraPointer, true));
  // the pointer leaves this slide (e.g. onto the presenter's notes): the laser dot goes, in both windows
  document.documentElement.addEventListener('pointerleave', () => { if (inkMode === 'laser' && ink && ink.dot) applyInk({ k: 'off' }, true); });

  // Auto-animate. The slide tells the shell where its data-id elements are (stage px) and whether it animates in
  // (body[data-auto-animate]); entering from a neighbour, the shell passes the neighbour's boxes, and each element
  // here with the same data-id glides from the old box to its own (move + scale, composed on top of whatever
  // transform it has); everything else fades in.
  // a frame the shell has just shown learns its size a frame later: run fn once the stage has one
  function sized(fn, tries) {
    const st = document.getElementById('stage');
    if (!st) return;
    if (st.getBoundingClientRect().width > 0) fn(st);
    else if ((tries || 0) < 30) realRAF(() => sized(fn, (tries || 0) + 1));
  }
  function reportIds() {
    if (!inShell) return;
    post({ type: 'ids', auto: document.body.hasAttribute('data-auto-animate') });   // known before any layout
    sized(sendIds);
  }
  function sendIds(st) {
    const r0 = st.getBoundingClientRect(), k = r0.width / 1920;
    const list = Array.prototype.map.call(st.querySelectorAll('[data-id]'), el => {
      const r = el.getBoundingClientRect();
      return { id: el.dataset.id, x: (r.left - r0.left) / k, y: (r.top - r0.top) / k, w: r.width / k, h: r.height / k };
    });
    post({ type: 'ids', ids: list, auto: document.body.hasAttribute('data-auto-animate') });
  }
  function flip(from) { sized(st => { flipNow(st, from); post({ type: 'flipped' }); }); }
  function flipNow(st, from) {
    if (!from || !from.length) return;
    const sr = st.getBoundingClientRect(), k = sr.width / 1920, old = new Map(from.map(o => [o.id, o])), moved = [];
    const ease = { duration: 800, easing: 'cubic-bezier(.4, 0, .2, 1)', composite: 'add' };
    const probe = (el, f) => { const a = el.animate([{ transform: f }, { transform: f }], { duration: 1e6, composite: 'add' }); a.pause(); const q = el.getBoundingClientRect(); a.cancel(); return q; };
    st.querySelectorAll('[data-id]').forEach(el => {
      const o = old.get(el.dataset.id), r = el.getBoundingClientRect();
      if (!o || !r.width) return;
      moved.push(el);
      // (6 Nov) already in place (same box on both slides): no animation at all
      if (Math.abs(sr.left + o.x * k - r.left) < 1 && Math.abs(sr.top + o.y * k - r.top) < 1 && Math.abs(o.w * k - r.width) < 1) return;
      const s = o.w * k / r.width, r1 = probe(el, `scale(${s})`);
      const r2 = probe(el, `translate(100px,0) scale(${s})`), r3 = probe(el, `translate(0,100px) scale(${s})`);
      const fx = (sr.left + o.x * k - r1.left) / ((r2.left - r1.left) / 100 || 1);
      const fy = (sr.top + o.y * k - r1.top) / ((r3.top - r1.top) / 100 || 1);
      el.animate([{ transform: `translate(${fx}px,${fy}px) scale(${s})` }, { transform: 'translate(0,0) scale(1)' }], ease);
    });
    if (!moved.length) return;
    // persistent furniture (page, rail, header, part pill) stays put; the rest fades in quickly. (6 Nov) A container
    // holding a moving element is entered rather than skipped, so its other contents fade in too; the fade ends on
    // each element's own opacity (implicit end keyframe), so ghosted panels stay ghosted.
    const fadeIn = node => {
      for (const c of node.children) {
        if (node === st && (c.id === 'bg' || c.classList.contains('rail') || c.classList.contains('header') || c.classList.contains('pill'))) continue;
        if (moved.includes(c)) continue;
        if (moved.some(m => c.contains(m))) { fadeIn(c); continue; }
        c.animate([{ opacity: 0 }], { duration: 450, delay: 150, fill: 'backwards' });
      }
    };
    fadeIn(st);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(reportIds, 0));
  else setTimeout(reportIds, 0);

  // pause the animation loop while hidden: requestAnimationFrame callbacks wait until the slide is active
  const realRAF = G.requestAnimationFrame.bind(G);
  let waiting = [];
  G.requestAnimationFrame = function (cb) {
    if (active) return realRAF(cb);
    waiting.push(cb);
    return -waiting.length;
  };
  function resume() {
    const cbs = waiting; waiting = [];
    cbs.forEach(cb => realRAF(cb));
  }

  // The part this slide belongs to (sent by the shell from parts.js): the pill takes the part's name and colour,
  // and the left-hand rail (lib/rail.js, loaded on first use) shows where the talk is.
  const LIB = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '');
  let railInfo = null, railLoading = false;
  function partInfo(r) {
    const p = r.parts[r.cur], pill = document.querySelector('.pill');
    if (pill && p && p.main) { pill.textContent = p.pill || p.name; pill.style.background = p.color; }
    railInfo = r;
    if (G.Rail) { G.Rail.show(r, i => post({ type: 'goto', i })); return; }
    if (railLoading || !G.Stipple || !document.getElementById('stage')) return;
    railLoading = true;
    const sc = document.createElement('script');
    sc.src = LIB + 'rail.js?v=10';
    sc.onload = () => G.Rail.show(railInfo, i => post({ type: 'goto', i }));
    document.head.appendChild(sc);
  }

  G.addEventListener('message', e => {
    const m = e.data;
    if (!m || !m.deck) return;
    if (m.type === 'enter') {
      active = true;
      setStep(m.step != null ? m.step : (m.dir < 0 ? cfg.steps : 0));
      resume();
      const num = document.querySelector('.header .num');
      if (num && m.num != null) num.textContent = m.num;
      if (m.rail) partInfo(m.rail);
      if (m.from) flip(m.from);
      reportIds();
      if (!m.noFocus) { try { G.focus(); } catch (err) { /* ignore */ } }
      if (m.edit && !m.noFocus) toggleEditor(true);                   // edit mode carries over from the last slide
    } else if (m.type === 'leave') {
      active = false;
      toggleEditor(false);                                           // quietly; unsaved edits are saved first
      if (ink) { if (inkMode) applyMode(null, true); ink.strokes = []; ink.dot = null; ink.trail = []; drawInk(); }   // quietly: the shell keeps the mode
      if (G.Deck.comments) G.Deck.comments.off();
    } else if (m.type === 'ink') {
      applyInk(m.ev, false);
    } else if (m.type === 'setmode') {                                 // the shell's laser / pen mode
      applyMode(m.mode || null, true);
    } else if (m.type === 'tool') {                                    // a presenter-view button
      if (m.tool === 'clear') applyInk({ k: 'clear' }, true); else if (m.tool === 'comment') toggleComments(); else setMode(m.tool);
    } else if (m.type === 'editor') {
      toggleEditor(m.on);
    } else if (m.type === 'setstep') {
      if (m.step !== step) setStep(m.step, true);
    } else if (m.type === 'replay') {
      replay(m.ev);
    } else if (m.type === 'key') {
      // a key pressed while the shell had focus: handle navigation here, replay anything else to the slide
      if (NEXT[m.key] || PREV[m.key]) {
        if (!isClaimed(m.key)) { if (NEXT[m.key]) forward(); else back(); return; }
      }
      if (!isClaimed(m.key) && extraKey(m.key)) return;
      post({ type: 'input', ev: { kind: 'key', key: m.key } });
      replay({ kind: 'key', key: m.key });
    }
  });

  // ---- overrides (written by the GUI editor, lib/editor.js; applied to every slide on load) -----------
  const SELF = (document.currentScript && document.currentScript.src) || '';
  const name = location.pathname.split('/').pop().replace(/\.html$/, '');
  const overrides = {};
  // a stable address for an element: child indices from #stage, e.g. "4/0"; text boxes added in the editor are
  // addressed by their own key ("+k3x9", see ensureAdded), so they never shift the indices of the slide's elements
  const kids = el => Array.prototype.filter.call(el.children, c => !(c.dataset && c.dataset.add));
  function path(el) {
    const st = document.getElementById('stage'), out = [];
    while (el && el !== st) {
      if (el.dataset && el.dataset.add) { out.unshift(el.dataset.add); break; }
      out.unshift(kids(el.parentElement).indexOf(el)); el = el.parentElement;
    }
    return out.join('/');
  }
  function byPath(p) {
    let el = document.getElementById('stage');
    for (const i of String(p).split('/')) {
      if (!el) return null;
      el = i[0] === '+' ? el.querySelector('[data-add="' + i + '"]') : kids(el)[+i];
    }
    return el || null;
  }
  // an added text box: created from its override { x, y, html, fs } (stage px) if it isn't on the page yet
  function ensureAdded(key, o) {
    const st = document.getElementById('stage');
    let el = st.querySelector('[data-add="' + key + '"]');
    if (!el) {
      el = document.createElement('div');
      el.dataset.add = key; el.className = 'added';
      Object.assign(el.style, { position: 'absolute', left: o.x + 'px', top: o.y + 'px', whiteSpace: 'nowrap',
        fontSize: '40px', lineHeight: 1.25, color: '#161414', zIndex: 10, minWidth: '1em', minHeight: '1em' });
      el.__origFS = '40px'; el.__origHTML = '';
      st.appendChild(el);
    }
    return el;
  }
  function applyOne(el, o) {
    if (o.html != null) { if (el.__origHTML === undefined) el.__origHTML = el.innerHTML; el.innerHTML = o.html; }
    if (o.fs) { if (el.__origFS === undefined) el.__origFS = el.style.fontSize; el.style.fontSize = o.fs + 'px'; }
    else if (el.__origFS !== undefined) el.style.fontSize = el.__origFS;
    if (o.dx || o.dy) el.style.translate = (o.dx || 0) + 'px ' + (o.dy || 0) + 'px'; else el.style.translate = '';
    // s scales uniformly; sx / sy stretch (blocks holding a canvas, image or SVG)
    const s = o.s || 1, sx = s * (o.sx || 1), sy = s * (o.sy || 1);
    if (sx !== 1 || sy !== 1) {
      if (!el.style.transformOrigin && getComputedStyle(el).transform === 'none') el.style.transformOrigin = '0 0';
      el.style.scale = sx === sy ? String(sx) : sx + ' ' + sy;
    } else el.style.scale = '';
    sizeRule(el, o);
  }
  // w / h (stage px) set a plain box's width / height through an !important rule, so the slide's own code (e.g.
  // partslide's fitBar, which sets the bar's width after the fonts load) can't undo them
  let sizeSheet = null;
  const sizes = {};
  function sizeRule(el, o) {
    const key = path(el);
    if (o && (o.w || o.h)) {
      el.dataset.ov = key;
      sizes[key] = (o.w ? 'width:' + o.w + 'px!important;' : '') + (o.h ? 'height:' + o.h + 'px!important;' : '');
    } else delete sizes[key];
    if (!sizeSheet) { sizeSheet = document.createElement('style'); document.head.appendChild(sizeSheet); }
    sizeSheet.textContent = Object.keys(sizes).map(k => '[data-ov="' + k + '"]{' + sizes[k] + '}').join('\n');
  }
  function resetOne(el) {
    el.style.translate = ''; el.style.scale = ''; sizeRule(el, null);
    if (el.__origFS !== undefined) el.style.fontSize = el.__origFS;
    if (el.__origHTML !== undefined) el.innerHTML = el.__origHTML;
  }
  function loadOverrides() {
    const use = o => {
      Object.assign(overrides, o || {});
      for (const k in o) { const el = k[0] === '+' ? ensureAdded(k, o[k]) : byPath(k); if (el) applyOne(el, o[k]); }
    };
    // opened from disk, fetch() is blocked: read overrides/all.js (written by tools/serve.py on every save) instead
    if (location.protocol === 'file:') {
      const sc = document.createElement('script');
      sc.src = new URL('../overrides/all.js', SELF || location.href).href + '?v=' + Date.now();
      sc.onload = () => use((G.DECK_OVERRIDES || {})[name]);
      document.head.appendChild(sc);
      return;
    }
    fetch(new URL('../overrides/' + name + '.json', SELF || location.href), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : {}).then(use).catch(() => {});
  }
  // after the slide's own (synchronous) scripts have built the page, before images/fonts/CDN libraries finish
  if (document.readyState !== 'loading') setTimeout(loadOverrides, 0);
  else document.addEventListener('DOMContentLoaded', () => setTimeout(loadOverrides, 0));
  // the editor: toggled by the keys / the presenter's Edit button; set on or off by the shell, which keeps edit
  // mode on while moving between slides (on = undefined toggles)
  function toggleEditor(on) {
    const go = () => on === undefined ? G.Deck.editor.toggle() : G.Deck.editor.set(on, true);
    if (G.Deck.editor) return go();
    if (on === false) return;
    const sc = document.createElement('script');
    sc.src = new URL('editor.js', SELF || location.href).href + '?v=' + Date.now();   // never a stale cached copy
    sc.onload = go;
    document.head.appendChild(sc);
  }

  // ---- review comments (lib/comments.js, loaded on first use; M toggles comment mode) ----------------
  function toggleComments() {
    if (G.Deck.comments) return G.Deck.comments.toggle();
    const sc = document.createElement('script');
    sc.src = new URL('comments.js', SELF || location.href).href + '?v=' + Date.now();
    sc.onload = () => G.Deck.comments.toggle();
    document.head.appendChild(sc);
  }

  G.Deck = {
    name, overrides, path, byPath, applyOne, resetOne, ensureAdded,
    slide(o) {
      Object.assign(cfg, o || {});
      setStep(0, true);
      // ?deckstep=N shows build N (used by tools/export_pdf.py and handy for checking a build)
      const ds = new URLSearchParams(location.search).get('deckstep');
      if (ds !== null) setTimeout(() => setStep(+ds, true), 0);
    },
    get steps() { return cfg.steps; },
    get step() { return step; },
    setStep, forward, back, toggleComments: () => toggleComments(),
    inShell,
    onComments: on => post({ type: 'cmode', on }),
    onEdit: on => post({ type: 'emode', on })
  };
  post({ type: 'hello' });
})(window);
