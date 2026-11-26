// editor.js: a light GUI editor for deck slides (loaded on demand by deckslide.js; Ctrl+Shift+E or F2 toggles).
//
// Click an element to select it, drag to move it, drag the corner handle to scale it, the right / bottom edge
// handles to change its width / height alone, double-click text to edit it in place, arrow keys nudge (Shift =
// 10 px). While dragging, edges and centres snap to the other blocks, the stage centre and the side margins (Alt
// drags freely, or turn Snap off). While text is being edited a small toolbar offers size, bold, italic and the
// deck's colours. Delete resets the selected element, Ctrl+Z / Ctrl+Y undo / redo, Ctrl+S saves; the toolbar at
// the bottom has a button for each of these. Edit mode stays on across slides: Prev / Next (or PageUp / PageDown)
// save and move on, and the shell opens the next slide's editor. Comment (or M) hands the mouse to the review
// comments (lib/comments.js) without leaving edit mode. Edits are stored as overrides (overrides/<slide>.json, written by
// tools/serve.py) and applied on top of the slide when it loads (Deck.applyOverrides), so the slide's code stays
// the source of truth. Moves use the CSS `translate` property and resizing the `scale` property, which compose
// with any transform the slide sets itself. Canvas content (plots, simulations) moves and scales as a whole.
(function (G) {
  'use strict';
  const D = G.Deck;
  const stage = () => document.getElementById('stage');
  const sc = () => stage().getBoundingClientRect().width / 1920;          // screen px per stage px
  let on = false, sel = null, ui = null, undo = [], redo = [], dirty = false;
  const inTools = e => e.target.closest && e.target.closest('#edTools, #edBar');
  const commenting = () => G.__deckCommenting || G.__deckTyping;            // the comments own the mouse and keys
  let snapOn = true;
  const INKS = [['ink', '#161414'], ['field', '#3F7330'], ['electrons', '#2E6FC2'], ['coupling', '#7B4FA0'], ['grey', '#5E5858']];
  const SNAP = 6, MARGIN = 79;                                              // stage px

  // Selectable elements: the innermost positioned block at the point (a label, a plot, a box, a pill), and inside
  // it the text-like leaves (headings, labels, legend entries) so they can be retyped. Slides built from layers
  // (the roadmap: full-stage containers stacked on one another) are hit-tested through: anything covering the
  // whole stage is a container, never a block. Shift+click takes the block's enclosing group instead.
  function isFull(el) {
    const r = el.getBoundingClientRect(), s = stage().getBoundingClientRect();
    return r.width >= 0.95 * s.width && r.height >= 0.95 * s.height;
  }
  const skip = el => el.id === 'bg' || el.classList.contains('rail') || isFull(el);
  function blockOf(t) {
    const st = stage();
    for (let el = t; el && el !== st; el = el.parentElement) {
      if (skip(el)) return null;
      const p = getComputedStyle(el).position;
      if (p === 'absolute' || p === 'fixed' || el.parentElement === st) return el;
    }
    return null;
  }
  function hit(e) {
    const st = stage();
    if (!st) return null;
    for (const t of document.elementsFromPoint(e.clientX, e.clientY)) {
      if (!st.contains(t) || t === st || skip(t)) continue;
      const block = blockOf(t);
      if (block) return { leaf: t, block };
    }
    return null;
  }
  function pick(e) {
    const h = hit(e);
    if (!h) return null;
    if (e.shiftKey) { const up = blockOf(h.block.parentElement); if (up) return up; }
    return h.block;
  }
  const isText = el => !el.querySelector('canvas, svg, .katex, input, button') && el.textContent.trim().length > 0;

  function snapshot(el) {
    const o = D.overrides[D.path(el)] || {};
    return JSON.parse(JSON.stringify(o));
  }
  function commit(el, before) {
    const key = D.path(el), after = D.overrides[key] ? JSON.parse(JSON.stringify(D.overrides[key])) : null;
    undo.push({ key, before, after }); redo = []; dirty = true; status();
  }
  function setOv(el, patch) {
    const key = D.path(el);
    const o = Object.assign(D.overrides[key] || {}, patch);
    D.overrides[key] = o;
    D.applyOne(el, o);
    place();
  }
  function restore(key, val) {
    const added = key[0] === '+';
    let el = D.byPath(key);
    if (val) D.overrides[key] = val; else delete D.overrides[key];
    if (added && !val) { if (el) el.remove(); if (sel === el) sel = null; el = null; }   // an added box goes away
    else if (added && !el) el = D.ensureAdded(key, val);
    if (el) { D.resetOne(el); if (val) D.applyOne(el, val); }
    dirty = true; place(); status();
  }

  // a new text box at the pointer (or the stage centre), opened for typing
  let lastPt = null;
  function addText() {
    const st = stage().getBoundingClientRect(), k = sc();
    let x = 860, y = 510;
    if (lastPt && lastPt.x > st.left && lastPt.x < st.right && lastPt.y > st.top && lastPt.y < st.bottom) {
      x = Math.round((lastPt.x - st.left) / k); y = Math.round((lastPt.y - st.top) / k);
    }
    const key = '+' + Date.now().toString(36), o = { x, y, html: 'Text', fs: 40 };
    D.overrides[key] = o;
    const el = D.ensureAdded(key, o);
    D.applyOne(el, o);
    undo.push({ key, before: null, after: JSON.parse(JSON.stringify(o)) }); redo = []; dirty = true;
    sel = el; place(); status();
    textEl = el; textBefore = snapshot(el);
    el.contentEditable = 'true'; el.focus();
    document.getSelection().selectAllChildren(el);
    showTools();
  }

  // ---- UI: outline, handle, status bar ----------------------------------------------------------
  function build() {
    ui = document.createElement('div');
    ui.innerHTML = '<div id="edBox"></div><div id="edHandle"></div><div id="edHR"></div><div id="edHB"></div><div id="edBar"></div>'
      + '<div id="edGx"></div><div id="edGy"></div><div id="edTools"></div>';
    ui.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;';
    document.body.appendChild(ui);
    const box = ui.querySelector('#edBox'), bar = ui.querySelector('#edBar');
    box.style.cssText = 'position:fixed;border:2px dashed #2E6FC2;display:none;';
    const handle = (id, cursor, mode, w, hh) => {
      const h = ui.querySelector(id);
      h.style.cssText = 'position:fixed;width:' + w + 'px;height:' + hh + 'px;background:#2E6FC2;border:2px solid #fff;border-radius:3px;'
        + 'display:none;pointer-events:auto;cursor:' + cursor + ';';
      h.title = { scale: 'scale (keeps the shape)', w: 'width only', h: 'height only' }[mode];
      h.addEventListener('pointerdown', e => startResize(e, mode), true);
    };
    handle('#edHandle', 'nwse-resize', 'scale', 14, 14);
    handle('#edHR', 'ew-resize', 'w', 10, 26);
    handle('#edHB', 'ns-resize', 'h', 26, 10);
    // the toolbar along the bottom: a button for every action, then the status line
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;background:#2E6FC2;color:#fff;font:14px Arial;padding:5px 10px;'
      + 'display:flex;align-items:center;gap:5px;pointer-events:auto;';
    const bbtn = (label, title, fn) => {
      const b = document.createElement('button');
      b.innerHTML = label; b.title = title;
      b.style.cssText = 'height:28px;border:1px solid #fff;border-radius:4px;background:#fff;color:#2E6FC2;font:bold 13px Arial;padding:0 9px;cursor:pointer;white-space:nowrap;flex:none;';
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); });
      b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); fn(b); });
      bar.appendChild(b);
      return b;
    };
    const gap = () => { const s = document.createElement('span'); s.style.cssText = 'width:10px;'; bar.appendChild(s); };
    bbtn('&#9664; Prev', 'previous build / slide, saving first (PageUp)', () => navigate(-1));
    bbtn('Next &#9654;', 'next build / slide, saving first (PageDown)', () => navigate(1));
    gap();
    bbtn('+ Text', 'new text box (T)', () => addText());
    bbtn('Undo', 'Ctrl+Z', () => doUndo());
    bbtn('Redo', 'Ctrl+Y', () => doRedo());
    bbtn('Reset', 'reset the selected element; removes an added text box (Del)', () => resetSel());
    bbtn('Layer below', 'select the element underneath the last click (e.g. a box behind a title) (L)', () => layerBelow());
    bbtn('Snap: on', 'snap to other blocks, the centre and the margins while dragging', b => { snapOn = !snapOn; b.textContent = 'Snap: ' + (snapOn ? 'on' : 'off'); });
    gap();
    commentBtn = bbtn('Comment', 'pin a comment for Claude on this slide (M); click again to go back to editing', () => comment());
    gap();
    bbtn('Save', 'Ctrl+S', () => save());
    bbtn('Done', 'leave edit mode, saving first (Ctrl+Shift+E)', () => set(false));
    const st = document.createElement('span');
    st.id = 'edStatus'; st.style.cssText = 'margin-left:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    bar.appendChild(st);
    ui.querySelector('#edGx').style.cssText = 'position:fixed;top:0;bottom:0;width:0;border-left:1px solid #E0338A;display:none;';
    ui.querySelector('#edGy').style.cssText = 'position:fixed;left:0;right:0;height:0;border-top:1px solid #E0338A;display:none;';
    const tl = ui.querySelector('#edTools');
    tl.style.cssText = 'position:fixed;display:none;pointer-events:auto;background:#fff;border:1px solid #2E6FC2;box-shadow:0 2px 6px rgba(0,0,0,.2);'
      + 'padding:3px;gap:3px;font:bold 14px Arial;align-items:center;';
    const btn = (label, title, fn, css) => {
      const b = document.createElement('button');
      b.innerHTML = label; b.title = title;
      b.style.cssText = 'min-width:28px;height:28px;border:1px solid #ccc;background:#fff;cursor:pointer;font:inherit;padding:0 5px;' + (css || '');
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });   // keep the text selection
      tl.appendChild(b);
    };
    btn('A&minus;', 'smaller', () => resize(-2));
    btn('A+', 'larger', () => resize(2));
    btn('B', 'bold', () => cmd('bold'));
    btn('<i>I</i>', 'italic', () => cmd('italic'));
    for (const [n, c] of INKS) btn('', n, () => cmd('foreColor', c), 'background:' + c + ';border-color:' + c + ';');
    status();
  }
  function showTools() {
    const tl = ui && ui.querySelector('#edTools');
    if (!tl) return;
    if (!textEl) { tl.style.display = 'none'; return; }
    const r = textEl.getBoundingClientRect();
    Object.assign(tl.style, { display: 'flex', left: Math.max(4, r.left) + 'px', top: Math.max(4, r.top - 40) + 'px' });
  }
  // bold / italic / colour act on the selected words, or on the whole text when nothing is selected
  function cmd(c, v) {
    if (!textEl) return;
    const sl = document.getSelection();
    if (!sl.rangeCount || sl.isCollapsed || !textEl.contains(sl.anchorNode)) sl.selectAllChildren(textEl);
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(c, false, v);
  }
  function resize(d) {
    if (!textEl) return;
    const b = snapshot(textEl), fs = parseFloat(getComputedStyle(textEl).fontSize);
    setOv(textEl, { fs: Math.max(8, Math.round(fs + d)) });
    commit(textEl, b); showTools();
  }
  let commentBtn = null;
  function status(msg) {
    if (!ui) return;
    if (commentBtn) commentBtn.style.background = commenting() ? '#FFD375' : '#fff';
    ui.querySelector('#edStatus').textContent = (commenting() ? 'COMMENTING: click the slide to pin a note · '
      : 'EDIT ' + D.name + ': drag to move · handles: corner scale, edges width / height · double-click text · ')
      + (msg || (dirty ? 'unsaved changes' : 'saved'));
  }
  function place() {
    if (!ui) return;
    const box = ui.querySelector('#edBox'), hs = ['#edHandle', '#edHR', '#edHB'].map(id => ui.querySelector(id));
    if (!sel) { box.style.display = 'none'; hs.forEach(h => { h.style.display = 'none'; }); return; }
    const r = sel.getBoundingClientRect();
    Object.assign(box.style, { display: 'block', left: r.left - 3 + 'px', top: r.top - 3 + 'px', width: r.width + 2 + 'px', height: r.height + 2 + 'px' });
    Object.assign(hs[0].style, { display: 'block', left: r.right - 8 + 'px', top: r.bottom - 8 + 'px' });
    Object.assign(hs[1].style, { display: 'block', left: r.right - 6 + 'px', top: r.top + r.height / 2 - 15 + 'px' });
    Object.assign(hs[2].style, { display: 'block', left: r.left + r.width / 2 - 15 + 'px', top: r.bottom - 6 + 'px' });
  }

  // ---- moving and scaling --------------------------------------------------------------------
  let drag = null, downPt = null;
  function down(e) {
    if (!on || commenting() || e.target.closest && e.target.closest('#edHandle, #edHR, #edHB') || inTools(e)) return;
    if (e.target.isContentEditable) return;                                    // typing: leave the caret alone
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    downPt = { x: e.clientX, y: e.clientY };
    const el = pick(e);
    finishText();
    sel = el; place();
    if (!el) return;
    const o = D.overrides[D.path(el)] || {};
    drag = { el, x: e.clientX, y: e.clientY, dx: o.dx || 0, dy: o.dy || 0, before: snapshot(el), moved: false, ...targets(el) };
  }
  // snap lines for a move: the block's own box, and the x / y lines it may snap to (all in stage px)
  function targets(el) {
    const st = stage().getBoundingClientRect(), k = sc();
    const box = r => ({ l: (r.left - st.left) / k, t: (r.top - st.top) / k, w: r.width / k, h: r.height / k });
    const xs = [MARGIN, 960, 1920 - MARGIN], ys = [540];
    for (const c of stage().querySelectorAll('*')) {
      if (c === el || c.contains(el) || el.contains(c) || skip(c) || blockOf(c) !== c) continue;
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const b = box(r);
      xs.push(b.l, b.l + b.w / 2, b.l + b.w); ys.push(b.t, b.t + b.h / 2, b.t + b.h);
    }
    return { r0: box(el.getBoundingClientRect()), xs, ys };
  }
  function snap(lo, size, d, lines) {
    let best = null;
    for (const p of [lo + d, lo + d + size / 2, lo + d + size])
      for (const L of lines) if (Math.abs(L - p) <= SNAP && (!best || Math.abs(L - p) < Math.abs(best.off))) best = { off: L - p, at: L };
    return best;
  }
  function guide(id, at) {
    const g = ui.querySelector(id);
    if (at == null) { g.style.display = 'none'; return; }
    const st = stage().getBoundingClientRect(), k = sc();
    g.style.display = 'block';
    if (id === '#edGx') g.style.left = st.left + at * k + 'px'; else g.style.top = st.top + at * k + 'px';
  }
  function move(e) {
    if (on) lastPt = { x: e.clientX, y: e.clientY };
    if (!on || commenting() || inTools(e)) return;
    e.stopPropagation(); e.stopImmediatePropagation();
    if (!drag) return;
    const k = sc();
    let ddx = (e.clientX - drag.x) / k, ddy = (e.clientY - drag.y) / k;
    if (!drag.mode) {
      const free = e.altKey || !snapOn;
      const sx = free ? null : snap(drag.r0.l, drag.r0.w, ddx, drag.xs), sy = free ? null : snap(drag.r0.t, drag.r0.h, ddy, drag.ys);
      if (sx) ddx += sx.off;
      if (sy) ddy += sy.off;
      guide('#edGx', sx && sx.at); guide('#edGy', sy && sy.at);
    }
    if (Math.abs(ddx) + Math.abs(ddy) > 1) drag.moved = true;
    const r3 = v => Math.round(v * 1000) / 1000;
    if (drag.mode === 'scale') {
      setOv(drag.el, { s: r3(Math.max(0.2, drag.s0 * (1 + ddx / Math.max(40, drag.w)))) });
    } else if (drag.mode === 'w' || drag.mode === 'h') {
      // a plain box gets a new width / height (drag distance in its own, unscaled px); a picture is stretched
      const wide = drag.mode === 'w', d = wide ? ddx : ddy, size = wide ? drag.w : drag.h;
      if (drag.media) setOv(drag.el, { [wide ? 'sx' : 'sy']: r3(Math.max(0.1, drag.f0 * (1 + d / Math.max(40, size)))) });
      else setOv(drag.el, { [drag.mode]: Math.max(4, Math.round(drag.c0 + d / drag.sc)) });
    } else setOv(drag.el, { dx: Math.round(drag.dx + ddx), dy: Math.round(drag.dy + ddy) });
  }
  function up(e) {
    if (!on || commenting() || inTools(e)) return;
    e.stopPropagation(); e.stopImmediatePropagation();
    if (drag && drag.moved) commit(drag.el, drag.before);
    drag = null; guide('#edGx'); guide('#edGy');
  }
  function startResize(e, mode) {
    if (!sel) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const o = D.overrides[D.path(sel)] || {}, r = sel.getBoundingClientRect(), cs = getComputedStyle(sel), k = sc();
    const media = sel.matches('canvas, img, svg') || !!sel.querySelector('canvas, img, svg');
    drag = { el: sel, x: e.clientX, y: e.clientY, mode, media, before: snapshot(sel), moved: false,
      s0: o.s || 1, w: r.width / k, h: r.height / k, f0: (mode === 'w' ? o.sx : o.sy) || 1,
      sc: (o.s || 1),                                                         // the box's own scale: drag px -> its px
      c0: parseFloat(mode === 'w' ? cs.width : cs.height) || 0 };             // its CSS width / height now
  }

  // ---- text editing ----------------------------------------------------------------------------
  let textEl = null, textBefore = null;
  function dbl(e) {
    if (!on || commenting()) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const h = hit(e);
    if (!h) return;
    let t = h.leaf;
    const block = h.block;
    // the innermost element whose own content is text (an added box is always edited as a whole)
    if (block.dataset.add) t = block;
    while (t !== block && !isText(t)) t = t.parentElement;
    if (!isText(t)) return;
    finishText();
    textEl = t; textBefore = snapshot(t);
    t.contentEditable = 'true'; t.focus();
    document.getSelection().selectAllChildren(t);
    showTools();
  }
  function finishText() {
    if (!textEl) return;
    const t = textEl; textEl = null;
    t.contentEditable = 'false'; showTools();
    const key = D.path(t), o = D.overrides[key] || {};
    if (t.dataset.add && !t.textContent.trim()) {                                // an emptied added box is removed
      const b = snapshot(t); restore(key, null); undo.push({ key, before: b, after: null }); return;
    }
    if (o.html !== t.innerHTML && t.innerHTML !== (t.__origHTML || '')) {
      if (t.__origHTML === undefined) t.__origHTML = t.innerHTML;
      D.overrides[key] = Object.assign(o, { html: t.innerHTML });
      commit(t, textBefore);
    }
  }

  // ---- keys -----------------------------------------------------------------------------------
  // every block under the last click, top first; step to the one below the current selection (wrapping round)
  function layerBelow() {
    if (!downPt) return;
    const st = stage(), list = [];
    for (const t of document.elementsFromPoint(downPt.x, downPt.y)) {
      if (!st.contains(t) || t === st || skip(t)) continue;
      const b = blockOf(t);
      if (b && list.indexOf(b) < 0) list.push(b);
    }
    if (!list.length) return;
    sel = list[(list.indexOf(sel) + 1) % list.length]; place();
    status('selected ' + (list.indexOf(sel) + 1) + ' of ' + list.length + ' layers here');
  }
  function doUndo() { const u = undo.pop(); if (u) { redo.push(u); restore(u.key, u.before && Object.keys(u.before).length ? u.before : null); } }
  function doRedo() { const r = redo.pop(); if (r) { undo.push(r); restore(r.key, r.after); } }
  function resetSel() { if (!sel) return; const key = D.path(sel), b = snapshot(sel); restore(key, null); undo.push({ key, before: b, after: null }); }
  // to the previous / next build or slide, saving first; the shell keeps edit mode on for the next slide
  async function navigate(dir) {
    finishText();
    if (dirty && !(await save())) return;
    if (dir > 0) D.forward(); else D.back();
  }
  // review comments: comments.js takes the mouse and keys until Comment (or M, or Esc) is pressed again
  function comment() {
    finishText(); sel = null; place();
    D.toggleComments();
    [300, 1200].forEach(t => setTimeout(status, t));                           // comments.js may still be loading
  }

  function key(e) {
    if (!on) return;
    const k = e.key, ctrl = e.ctrlKey || e.metaKey;
    if (commenting()) {                                                       // only M / Esc (leave comments) for us
      if (!G.__deckTyping && (k === 'm' || k === 'M' || k === 'Escape')) { e.preventDefault(); e.stopImmediatePropagation(); comment(); }
      return;
    }
    if (textEl) { if (k === 'Escape' || (k === 'Enter' && !e.shiftKey)) { e.preventDefault(); finishText(); } e.stopImmediatePropagation(); return; }
    if (k === 'F2' || (ctrl && e.shiftKey && (k === 'E' || k === 'e'))) return;   // toggle: handled by deckslide
    e.preventDefault(); e.stopImmediatePropagation();
    if (ctrl && (k === 's' || k === 'S')) return save();
    if (ctrl && (k === 'z' || k === 'Z')) return doUndo();
    if (ctrl && (k === 'y' || k === 'Y')) return doRedo();
    if (k === 'PageDown' || k === 'PageUp') return navigate(k === 'PageDown' ? 1 : -1);
    if (!ctrl && (k === 't' || k === 'T')) return addText();
    if (!ctrl && (k === 'm' || k === 'M')) return comment();
    if (!ctrl && (k === 'l' || k === 'L')) return layerBelow();
    if (!sel) return;
    if (k === 'Delete' || k === 'Backspace') return resetSel();
    const step = e.shiftKey ? 10 : 1, mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[k];
    if (mv) { const b = snapshot(sel), o = D.overrides[D.path(sel)] || {}; setOv(sel, { dx: (o.dx || 0) + mv[0], dy: (o.dy || 0) + mv[1] }); commit(sel, b); }
  }

  async function save() {
    finishText();
    const content = JSON.stringify(D.overrides, null, 2) + '\n';
    try {
      const r = await fetch('/save', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'overrides/' + D.name + '.json', content }) });
      if (!r.ok) throw new Error(r.status);
      dirty = false; status('saved to overrides/' + D.name + '.json');
      return true;
    } catch (err) {
      // no save server: offer the file as a download instead
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      a.download = D.name + '.json'; a.click();
      status('no save server (run tools/serve.py); downloaded ' + D.name + '.json instead');
      return false;
    }
  }

  // on / off. quiet: set by the shell (moving between slides), which already knows the deck's edit mode;
  // otherwise the shell is told, so the next slide opens in the same mode. Unsaved edits are saved on the way out.
  function set(v, quiet) {
    v = !!v;
    if (v === on) return;
    on = v;
    G.__deckEditing = on;
    if (on) { if (!ui) build(); ui.style.display = 'block'; status(); }
    else {
      finishText(); sel = null; place(); if (ui) ui.style.display = 'none';
      if (G.__deckCommenting && D.comments) D.comments.off();
      if (dirty) save();
    }
    if (!quiet && D.onEdit) D.onEdit(on);
  }
  const toggle = () => set(!on);
  for (const [t, f] of [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['dblclick', dbl], ['keydown', key]])
    G.addEventListener(t, f, true);
  G.addEventListener('click', e => { if (on && !commenting() && !e.target.isContentEditable && !inTools(e)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  G.addEventListener('resize', place);
  D.editor = { toggle, set, get on() { return on; } };
})(window);
