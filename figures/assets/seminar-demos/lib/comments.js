// comments.js: review comments pinned on a slide (loaded on demand by deckslide.js; M toggles comment mode).
//
// In comment mode a click anywhere on the slide drops a numbered pin there and opens a note box: type, Enter
// saves (Shift+Enter = new line), Esc cancels. Click a pin to read it, edit it, resolve / reopen it or delete it;
// drag a pin to move it. Pins made on another build of the slide are drawn faded. Nothing reaches the slide
// itself while the mode is on, and nothing is mirrored to the other window: the pins live in this window only.
// Comments are stored per slide in comments/<slide>.json (written by tools/serve.py):
//   { slide, comments: [{ id, n, x, y, step, text, status: 'open' | 'resolved', reply, created, updated, target }] }
// x, y are stage px (1920 x 1080). target describes what was under the point when the pin was placed or moved:
//   { path (Deck.path of the block), tag, id, cls, text (first words), canvas: { id, x, y } (canvas css px) }
// Claude reads these files, acts on the open comments and writes a one-line reply when resolving them.
(function (G) {
  'use strict';
  const D = G.Deck, RED = '#E8392A', DONE = '#7C8F6A';
  const stage = () => document.getElementById('stage');
  const FILE = 'comments/' + D.name + '.json';
  const URL_ = new URL('../' + FILE, document.querySelector('script[src*="deckslide.js"]').src);
  let on = false, data = { slide: D.name, comments: [] }, loaded = false, root = null, layer = null, chip = null;
  let box = null;                 // the open note box: { el, c (comment or null for a new one), x, y }
  let drag = null, saveMsg = '';

  // ---- storage ----------------------------------------------------------------------------------
  function load() {
    return fetch(URL_.href, { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(o => {
      data = { slide: D.name, comments: Array.isArray(o.comments) ? o.comments : [] };
      loaded = true;
    });
  }
  function save() {
    const content = JSON.stringify(data, null, 2) + '\n';
    return fetch('/save', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: FILE, content }) }).then(r => r.ok).catch(() => false)
      .then(ok => { saveMsg = ok ? '' : 'not saved: run tools/serve.py'; status(); return ok; });
  }

  // ---- what is under a point ----------------------------------------------------------------------
  function isFull(el) {
    const r = el.getBoundingClientRect(), s = stage().getBoundingClientRect();
    return r.width >= 0.95 * s.width && r.height >= 0.95 * s.height;
  }
  function blockOf(t) {
    const st = stage();
    for (let el = t; el && el !== st; el = el.parentElement) {
      const p = getComputedStyle(el).position;
      if (p === 'absolute' || p === 'fixed' || el.parentElement === st) return el;
    }
    return t;
  }
  function describe(x, y) {
    const st = stage(), sr = st.getBoundingClientRect(), k = sr.width / 1920;
    const cx = sr.left + x * k, cy = sr.top + y * k;
    root.style.display = 'none';
    const hits = document.elementsFromPoint(cx, cy);
    root.style.display = '';
    const t = hits.find(el => st.contains(el) && el !== st && el.id !== 'bg' && !isFull(el));
    if (!t) return { path: '', tag: 'stage', text: '' };
    const block = blockOf(t), out = { path: D.path(block), tag: t.tagName.toLowerCase() };
    if (t.id) out.id = t.id;
    if (typeof t.className === 'string' && t.className) out.cls = t.className;
    const words = (t.innerText || t.textContent || block.innerText || '').replace(/\s+/g, ' ').trim();
    if (words) out.text = words.length > 80 ? words.slice(0, 79) + '…' : words;
    if (t.tagName === 'CANVAS') {
      const r = t.getBoundingClientRect();
      out.canvas = { id: t.id || '', x: Math.round((cx - r.left) / k), y: Math.round((cy - r.top) / k) };
    }
    return out;
  }
  function where(tg) {
    if (!tg) return '';
    let s = tg.tag + (tg.id ? '#' + tg.id : '') + (tg.cls ? '.' + tg.cls.split(/\s+/)[0] : '');
    if (tg.canvas) s += ' at (' + tg.canvas.x + ', ' + tg.canvas.y + ')';
    else if (tg.text) s += ' “' + (tg.text.length > 40 ? tg.text.slice(0, 39) + '…' : tg.text) + '”';
    return s;
  }

  // ---- UI -------------------------------------------------------------------------------------------
  // A fixed root over the window catches every pointer event; inside it, a layer with the stage's own size and
  // scale holds the pins and the note box in stage px.
  const CSS = `
  #cmRoot { position: fixed; inset: 0; z-index: 9500; cursor: crosshair; font-family: 'Fira Sans', Arial, sans-serif; }
  #cmLayer { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; transform-origin: 0 0; }
  .cmPin { position: absolute; width: 46px; height: 46px; margin: -46px 0 0 -6px; border-radius: 50% 50% 50% 0;
    background: ${RED}; color: #fff; font: 700 24px/46px 'Fira Sans', Arial, sans-serif; text-align: center;
    box-shadow: 0 3px 8px rgba(0,0,0,.35); cursor: grab; user-select: none; }
  .cmPin span { display: inline-block; }
  .cmPin.done { background: ${DONE}; }
  .cmPin.other { opacity: .45; }
  .cmPin.draft { background: #161414; }
  .cmBox { position: absolute; width: 470px; background: #fff; border: 3px solid #161414; border-radius: 14px;
    box-shadow: 8px 8px 0 rgba(22,20,20,.85); padding: 14px 16px; font-size: 22px; color: #161414; cursor: default; }
  .cmBox textarea { box-sizing: border-box; width: 100%; height: 118px; font: 22px/1.35 'Fira Sans', Arial, sans-serif;
    border: 2px solid #c9c4bc; border-radius: 8px; padding: 8px 10px; resize: vertical; outline: none; }
  .cmBox textarea:focus { border-color: #161414; }
  .cmBox .txt { white-space: pre-wrap; line-height: 1.35; }
  .cmBox .meta { margin-top: 8px; font-size: 16px; color: #8F8A84; }
  .cmBox .reply { margin-top: 10px; padding: 8px 10px; background: #EEF3E6; border-radius: 8px; font-size: 19px; white-space: pre-wrap; }
  .cmBox .reply b { color: ${DONE}; }
  .cmBox .row { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
  .cmBox button { font: 600 18px 'Fira Sans', Arial, sans-serif; padding: 6px 14px; border-radius: 999px;
    border: 2px solid #161414; background: #F5F2EC; color: #161414; cursor: pointer; }
  .cmBox button.main { background: #161414; color: #fff; }
  .cmBox button.del { border-color: ${RED}; color: ${RED}; background: #fff; margin-left: auto; }
  #cmChip { position: fixed; left: 50%; top: 10px; transform: translateX(-50%); z-index: 9600; background: #161414;
    color: #fff; font: 600 15px 'Fira Sans', Arial, sans-serif; padding: 7px 16px; border-radius: 999px;
    box-shadow: 0 2px 8px rgba(0,0,0,.3); pointer-events: none; white-space: nowrap; }
  #cmChip i { font-style: normal; color: #FFD375; }`;
  function build() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'cmRoot';
    layer = document.createElement('div'); layer.id = 'cmLayer'; root.appendChild(layer);
    chip = document.createElement('div'); chip.id = 'cmChip';
    root.addEventListener('pointerdown', down);
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerup', up);
    root.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    ['click', 'dblclick', 'contextmenu'].forEach(t => root.addEventListener(t, e => { if (!e.target.closest('.cmBox')) e.preventDefault(); e.stopPropagation(); }));
    addEventListener('resize', fit);
  }
  function fit() {
    if (!on) return;
    const r = stage().getBoundingClientRect();
    layer.style.left = r.left + 'px'; layer.style.top = r.top + 'px'; layer.style.transform = 'scale(' + r.width / 1920 + ')';
  }
  const toStage = e => { const r = stage().getBoundingClientRect(), k = r.width / 1920; return [(e.clientX - r.left) / k, (e.clientY - r.top) / k]; };
  function status() {
    if (!chip) return;
    const open = data.comments.filter(c => c.status !== 'resolved').length;
    chip.innerHTML = 'Comments: click to add · drag a pin to move it · <i>M</i> or <i>Esc</i> leaves · ' + open + ' open'
      + (saveMsg ? ' · <i>' + saveMsg + '</i>' : '');
  }
  function render() {
    if (!layer) return;
    layer.querySelectorAll('.cmPin').forEach(p => p.remove());
    for (const c of data.comments) {
      const p = document.createElement('div');
      p.className = 'cmPin' + (c.status === 'resolved' ? ' done' : '') + (c.step !== D.step ? ' other' : '');
      p.style.left = c.x + 'px'; p.style.top = c.y + 'px';
      p.innerHTML = '<span>' + c.n + '</span>';
      p.title = (c.step !== D.step ? '(build ' + c.step + ') ' : '') + c.text;
      p.cm = c;
      layer.appendChild(p);
    }
    if (box && !box.c) {                                   // the new comment's pin
      const p = document.createElement('div');
      p.className = 'cmPin draft'; p.style.left = box.x + 'px'; p.style.top = box.y + 'px';
      p.innerHTML = '<span>' + nextN() + '</span>';
      layer.appendChild(p);
    }
    status();
  }
  const nextN = () => data.comments.reduce((m, c) => Math.max(m, c.n), 0) + 1;
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  // ---- the note box -----------------------------------------------------------------------------------
  function closeBox() { if (box) { box.el.remove(); box = null; G.__deckTyping = false; render(); } }
  function placeBox(el, x, y) {
    layer.appendChild(el);
    const w = 470 + 40, h = el.offsetHeight + 20;
    el.style.left = Math.max(10, Math.min(1920 - w, x + 30)) + 'px';
    el.style.top = Math.max(10, Math.min(1080 - h, y - 30)) + 'px';
  }
  function editor(x, y, c) {
    closeBox();
    const el = document.createElement('div'); el.className = 'cmBox';
    el.innerHTML = '<textarea placeholder="What should change here?"></textarea>'
      + '<div class="meta">' + esc(where(c ? c.target : describe(x, y))) + ' · build ' + (c ? c.step : D.step) + '</div>'
      + '<div class="row"><button class="main" data-a="save">Save</button><button data-a="cancel">Cancel</button></div>';
    box = { el, c, x, y };
    render();
    placeBox(el, x, y);
    const ta = el.querySelector('textarea');
    ta.value = c ? c.text : '';
    ta.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(ta.value); }
      else if (e.key === 'Escape') { e.preventDefault(); closeBox(); }
    });
    ta.addEventListener('keyup', e => e.stopPropagation());
    el.addEventListener('click', e => {
      const a = e.target.dataset && e.target.dataset.a;
      if (a === 'save') commit(ta.value); else if (a === 'cancel') closeBox();
    });
    G.__deckTyping = true;
    setTimeout(() => ta.focus(), 0);
  }
  function commit(text) {
    text = text.trim();
    const b = box;
    if (!b) return;
    if (!text) { closeBox(); return; }
    const now = new Date().toISOString();
    if (b.c) { b.c.text = text; b.c.updated = now; if (b.c.status === 'resolved') b.c.status = 'open'; }
    else {
      data.comments.push({ id: Math.random().toString(36).slice(2, 8), n: nextN(), x: Math.round(b.x), y: Math.round(b.y),
        step: D.step, text, status: 'open', reply: '', created: now, target: describe(b.x, b.y) });
    }
    closeBox(); save();
  }
  function viewer(c) {
    closeBox();
    const el = document.createElement('div'); el.className = 'cmBox';
    el.innerHTML = '<div class="txt">' + esc(c.text) + '</div>'
      + (c.reply ? '<div class="reply"><b>Claude:</b> ' + esc(c.reply) + '</div>' : '')
      + '<div class="meta">#' + c.n + ' · ' + esc(where(c.target)) + ' · build ' + c.step + (c.status === 'resolved' ? ' · resolved' : '') + '</div>'
      + '<div class="row"><button data-a="edit">Edit</button>'
      + '<button class="main" data-a="toggle">' + (c.status === 'resolved' ? 'Reopen' : 'Resolve') + '</button>'
      + '<button data-a="close">Close</button><button class="del" data-a="del">Delete</button></div>';
    box = { el, c, x: c.x, y: c.y, view: true };
    placeBox(el, c.x, c.y);
    el.addEventListener('click', e => {
      const a = e.target.dataset && e.target.dataset.a;
      if (a === 'edit') editor(c.x, c.y, c);
      else if (a === 'toggle') { c.status = c.status === 'resolved' ? 'open' : 'resolved'; c.updated = new Date().toISOString(); closeBox(); save(); }
      else if (a === 'close') closeBox();
      else if (a === 'del') { data.comments = data.comments.filter(o => o !== c); closeBox(); save(); }
    });
  }

  // ---- pointer: click empty space = new comment; click a pin = open it; drag a pin = move it ------------
  function down(e) {
    if (e.target.closest('.cmBox')) return;
    e.preventDefault(); e.stopPropagation();
    const pin = e.target.closest('.cmPin');
    if (pin && pin.cm) {
      const [x, y] = toStage(e);
      drag = { c: pin.cm, pin, x0: x, y0: y, cx: pin.cm.x, cy: pin.cm.y, moved: false };
      root.setPointerCapture(e.pointerId);
      return;
    }
    if (box) { closeBox(); return; }                  // the first click outside only closes the open box
    const [x, y] = toStage(e);
    editor(x, y, null);
  }
  function move(e) {
    if (!drag) return;
    e.stopPropagation();
    const [x, y] = toStage(e);
    if (!drag.moved && Math.hypot(x - drag.x0, y - drag.y0) < 5) return;
    drag.moved = true;
    drag.c.x = Math.round(drag.cx + x - drag.x0); drag.c.y = Math.round(drag.cy + y - drag.y0);
    drag.pin.style.left = drag.c.x + 'px'; drag.pin.style.top = drag.c.y + 'px';
  }
  function up(e) {
    if (!drag) return;
    e.stopPropagation();
    const d = drag; drag = null;
    if (d.moved) { d.c.target = describe(d.c.x, d.c.y); d.c.updated = new Date().toISOString(); closeBox(); save(); render(); }
    else viewer(d.c);
  }

  // ---- mode -------------------------------------------------------------------------------------------
  function setOn(v) {
    if (v === on) return;
    on = v;
    if (!root) build();
    if (on) {
      document.body.appendChild(root); document.body.appendChild(chip);
      G.__deckCommenting = true;
      fit();
      (loaded ? Promise.resolve() : load()).then(render);
    } else {
      closeBox(); drag = null;
      root.remove(); chip.remove();
      G.__deckCommenting = false; G.__deckTyping = false;
    }
    if (D.onComments) D.onComments(on);
  }
  D.comments = {
    toggle() { setOn(!on); },
    off() { setOn(false); },
    refresh() { if (on) render(); },
    get on() { return on; }
  };
})(window);
