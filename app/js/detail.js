/* =========================================================================
   ANGEL SWARM — THE RECORD DETAIL. One accordion, opened in the main window.

   WHAT THIS REPLACES. Selecting a row anywhere in this console painted the
   record into the 336-pixel inspector rail on the far left, while the main
   column — thirteen hundred pixels of it — went on showing the list the row
   came from. A casualty record has to answer six questions at once (who,
   where, the clock, what they need, what is coming and when, and who
   authorised it) and none of them fit in a rail, so they arrived as prose.
   Two complaints, one cause.

   THE SHAPE, and it is DHA IRON VEIN's: the row is the handle, the detail
   opens directly beneath it, in flow, inside the main column and the full
   width of it, with a tab strip across the top. One row open at a time per
   list, because two open regions push the second one off the screen and the
   operator loses the row he was comparing against.

   WHAT A DETAIL REGION IS ALLOWED TO CONTAIN. Figures with labels, compact
   tables, and status lines. Not prose. This file enforces that rather than
   asking politely: notes() takes at most two lines per region and clamps each
   to 140 characters. If a page wants to say more than that it has to find a
   figure to say it with, which is the point.

   HOW IT SURVIVES THE RENDER LOOP. The panes repaint by replacing innerHTML
   at the shell's cadence, so a region mounted as a detached DOM node would be
   destroyed on the next tick. The region is therefore MARKUP: a page asks for
   region() while it is building its table and gets back a <tr> to drop in
   after the row. All the state lives here — which row is open in which list,
   and which tab — and the pages read it rather than keeping their own.

   PROVENANCE. Every figure group is wrapped in .dtGroup with its own key and
   an empty .dtProv slot beside the heading. When ANGEL.get('prov') appears,
   sync() fills those slots. Nothing here waits on that module and nothing
   breaks if it never arrives.
   ========================================================================= */

(function () {
  'use strict';

  const ANGEL = window.ANGEL = window.ANGEL || {};

  /* ---------------------------------------------------------- plumbing */
  function theApp() {
    try { if (typeof APP !== 'undefined' && APP) return APP; } catch (e) { /* not declared */ }
    return (typeof window !== 'undefined' && window.APP) ? window.APP : null;
  }
  const G = k => (typeof window[k] === 'function' ? window[k] : null);
  const esc = G('esc') || (s => String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));

  /* An id can be a number (a casualty), or a string (a shelf line is a site
     and an item). Everything is compared as a string so the two cannot
     disagree about whether 3 is 3. */
  const sid = v => String(v);
  const slug = v => sid(v).replace(/[^A-Za-z0-9_-]/g, '_');

  /* ------------------------------------------------------------- state */
  /* listKey -> { id, tab }. id null means nothing is open in that list. */
  const ST = new Map();
  function st(list) {
    let s = ST.get(list);
    if (!s) { s = { id: null, tab: null }; ST.set(list, s); }
    return s;
  }

  /* What to put the keyboard back on after the pane repaints. innerHTML is
     replaced wholesale by the pages, so focus has to be re-established by
     selector rather than by node. */
  let refocus = null;

  function repaint() {
    const APP = theApp(), render = G('render');
    if (APP) APP._paneForce = true;
    /* The launch points pane draws itself outside the shell's table cadence
       as well as inside it; asking it directly makes the click land on the
       same frame rather than the next one. */
    if (ANGEL.views && typeof ANGEL.views.LAUNCHPOINTS === 'function') {
      try { ANGEL.views.LAUNCHPOINTS(); } catch (e) { /* its own problem */ }
    }
    if (render) { try { render(); } catch (e) { /* never take the loop down */ } }
    requestAnimationFrame(() => {
      sync();
      if (refocus) {
        const el = document.querySelector(refocus);
        refocus = null;
        if (el && typeof el.focus === 'function') el.focus({ preventScroll: true });
      }
    });
  }

  /* ---------------------------------------------------------- the API */

  function isOpen(list, id) {
    const s = st(list);
    return s.id !== null && s.id === sid(id);
  }
  function openId(list) { return st(list).id; }

  function open(list, id, tab) {
    const s = st(list);
    const next = sid(id);
    if (s.id !== next) { s.id = next; s.tab = tab || null; }
    else if (tab) s.tab = tab;
  }
  function close(list) { const s = st(list); s.id = null; s.tab = null; }

  function toggle(list, id) {
    const s = st(list);
    if (s.id === sid(id)) { s.id = null; s.tab = null; }
    else { s.id = sid(id); s.tab = null; }
  }

  /* The attributes a page puts on the <tr> that acts as the handle. The row
     keeps its table semantics — it is still a row of a table and a screen
     reader should read it as one — and carries the disclosure state, the id
     of the region it controls, and a tab stop. */
  function rowAttrs(list, id) {
    const on = isOpen(list, id);
    return `data-dtrow="${esc(list)}:${esc(sid(id))}" tabindex="0"` +
      ` aria-expanded="${on ? 'true' : 'false'}" aria-controls="dt-${slug(list)}-${slug(id)}"`;
  }

  /* ------------------------------------------------------- the content */

  /* A figure: one number, one label, and at most one short qualifier under
     it. Preferred over a sentence every single time. Where a value is not
     recorded the page omits the figure rather than printing a guess — this
     helper drops any item whose value is null or undefined for exactly that
     reason. */
  function figs(items) {
    const out = (items || []).filter(f => f && f.v !== null && f.v !== undefined && f.v !== '');
    if (!out.length) return '';
    /* The value first, the bar under it, the label under that. A figure with
       a meter and one without have to sit on the same baseline or a row of
       them reads as two rows. */
    return `<div class="dtFigs">` + out.map(f => {
      const plain = textOf(String(f.v));
      const cls = (f.cls ? f.cls + ' ' : '') + (plain.length > 13 ? 'dtLong' : '');
      return `<div class="dtFig"><b${cls.trim() ? ` class="${esc(cls.trim())}"` : ''}>${f.v}</b>` +
        `${f.meter || ''}<span>${esc(f.k)}</span>${f.note ? `<i>${clamp(f.note)}</i>` : ''}</div>`;
    }).join('') + `</div>`;
  }

  /* A figure group. The wrapper and its key are stable so a provenance badge
     can be dropped into .dtProv later without this file changing. */
  function group(label, key, html) {
    if (!html) return '';
    return `<section class="dtGroup" data-dtgroup="${esc(key || label)}">
      <div class="dtGroupHead"><h4>${esc(label)}</h4><span class="dtProv" data-dtprov="${esc(key || label)}"></span>
        <span class="dtRule"></span></div>
      ${html}</section>`;
  }

  /* A compact table. cols: [{h, w, sub}] — rows: [[cell, …]] already escaped
     by the caller, because half of them carry a pill or a meter. */
  function table(cols, rows) {
    if (!rows || !rows.length) return '';
    const head = cols.map(c =>
      `<th${c.w ? ` style="width:${c.w}"` : ''}>${esc(c.h)}${c.sub ? `<span class="thSub">${esc(c.sub)}</span>` : ''}</th>`
    ).join('');
    const body = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
    return `<div class="dtTable"><table class="grid tight"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  /* One line, in the currency of a status board rather than a paragraph —
     and deliberately NOT a <p>. The only paragraphs a detail region is
     allowed to contain are the two footnotes at the bottom of it, so that
     "how many paragraphs does this region have" is answerable by counting
     them. */
  function status(text, cls) {
    if (!text) return '';
    return `<div class="dtStatus${cls ? ' ' + cls : ''}">${clamp(text)}</div>`;
  }

  function empty(text) { return `<div class="dtEmpty">${clamp(text)}</div>`; }

  function meter(pct, cls) {
    if (pct === null || pct === undefined || !isFinite(pct)) return '';
    const w = Math.max(0, Math.min(100, pct));
    return `<span class="meter"><i class="${cls || ''}" style="width:${w.toFixed(0)}%"></i></span>`;
  }

  /* THE 140-CHARACTER RULE, enforced rather than requested. Tags are counted
     out of the budget — a note is measured as the reader reads it. */
  const LIMIT = 140;
  function textOf(html) { return String(html).replace(/<[^>]*>/g, ''); }
  function clamp(html) {
    const s = String(html === null || html === undefined ? '' : html);
    if (textOf(s).length <= LIMIT) return s;
    /* Over budget: fall back to the plain text, cut at a word boundary. */
    const t = textOf(s);
    const cut = t.slice(0, LIMIT - 1);
    const sp = cut.lastIndexOf(' ');
    return esc((sp > 40 ? cut.slice(0, sp) : cut).replace(/[ ,;:.]+$/, '')) + '…';
  }
  /* At most two, each clamped. A third line is a sign the page is writing
     prose again and is dropped here rather than argued about. */
  function notes(list) {
    const use = (list || []).filter(Boolean).slice(0, 2);
    return use.map(t => `<p class="dtNote">${clamp(t)}</p>`).join('');
  }

  /* -------------------------------------------------------- the region */

  /* spec = {
       title, sub, badges (html), acts (html), tone ('bad'|'warn'|''),
       tabs: [{ k, label, count, build: () => html }],
       notes: [ 'one short line', … ]
     }
     Only the active tab is built, so a page pays for one tab and not five. */
  function region(list, id, colspan, spec) {
    if (!isOpen(list, id)) return '';
    const s = st(list);
    const tabs = (spec.tabs || []).filter(Boolean);
    if (!tabs.length) return '';
    let k = s.tab;
    if (!tabs.some(t => t.k === k)) { k = tabs[0].k; s.tab = k; }
    const rid = `dt-${slug(list)}-${slug(id)}`;
    const pid = rid + '-p';

    const strip = tabs.map(t => {
      const on = t.k === k;
      return `<button class="dtTab" role="tab" id="${rid}-t-${slug(t.k)}"
        aria-selected="${on ? 'true' : 'false'}" aria-controls="${pid}"
        tabindex="${on ? '0' : '-1'}" data-dttab="${esc(list)}:${esc(t.k)}">${esc(t.label)}${
        (t.count === null || t.count === undefined) ? '' : `<i>${esc(String(t.count))}</i>`}</button>`;
    }).join('');

    let body = '';
    const active = tabs.find(t => t.k === k);
    try { body = active.build() || ''; }
    catch (err) {
      console.warn('detail tab ' + list + '/' + k, err);
      body = empty('This section could not be built from the record. Nothing invented has been put in its place.');
    }

    return `<tr class="dtRow" data-dtfor="${esc(list)}:${esc(sid(id))}">
      <td class="dtCell" colspan="${colspan}">
        <div class="dtWrap">
          <section class="dt${spec.tone ? ' dt' + spec.tone.charAt(0).toUpperCase() + spec.tone.slice(1) : ''}"
            id="${rid}" role="region" aria-label="${esc(spec.title || 'Record')}">
            <header class="dtHead">
              <div class="dtId"><b>${spec.title || ''}</b>${spec.sub ? `<span>${clamp(spec.sub)}</span>` : ''}</div>
              ${spec.badges ? `<div class="dtBadges">${spec.badges}</div>` : ''}
              <div class="dtActs">${spec.acts || ''}
                <button class="dtClose" data-dtclose="${esc(list)}" aria-label="Close this record">CLOSE</button></div>
            </header>
            <div class="dtTabs" role="tablist" aria-label="${esc(spec.title || 'Record')} sections">${strip}</div>
            <div class="dtPanel" role="tabpanel" id="${pid}" aria-labelledby="${rid}-t-${slug(k)}" tabindex="0">${body}</div>
            ${notes(spec.notes)}
          </section>
        </div>
      </td></tr>`;
  }

  /* ----------------------------------------------------------- measure */

  /* A wide table scrolls sideways inside its pane, and a colspan cell is as
     wide as the table rather than as wide as the pane. The wrapper is stuck
     to the left edge of the scroller; this gives it the scroller's width, so
     the region is exactly as wide as the main column shows and never runs off
     the end of a 1,400-pixel table. Measured, never assumed. */
  function scroller(el) {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const s = getComputedStyle(p);
      if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && p.clientWidth > 0) return p;
      p = p.parentElement;
    }
    return null;
  }

  function sync() {
    const wraps = document.querySelectorAll('.dtWrap');
    for (const w of wraps) {
      const sc = scroller(w);
      const px = sc ? sc.clientWidth : (w.parentElement ? w.parentElement.clientWidth : 0);
      if (px > 0) {
        const v = px + 'px';
        if (w.style.width !== v) w.style.width = v;
      }
    }
    /* The provenance badges, if that module has landed. It is asked for on
       every sync rather than cached, because it can arrive after this one. */
    const prov = (typeof ANGEL.get === 'function') ? ANGEL.get('prov') : null;
    if (typeof prov === 'function') {
      for (const slot of document.querySelectorAll('.dtProv[data-dtprov]')) {
        if (slot._dtProvKey === slot.getAttribute('data-dtprov')) continue;
        let html = '';
        try { html = prov(slot.getAttribute('data-dtprov'), null) || ''; } catch (e) { html = ''; }
        slot._dtProvKey = slot.getAttribute('data-dtprov');
        slot.innerHTML = html;
      }
    }
  }

  /* ----------------------------------------------------------- binding */

  /* A row is the handle for its own region and nothing else on it is. Any
     control inside a row — the star, the hold button, an approve or reject,
     a link that goes somewhere — keeps doing its own job, so those are read
     first and the row is only opened when the click landed on the row. */
  const CONTROLS = 'button,a,input,select,textarea,label,[data-hva],[data-hold],' +
    '[data-approve],[data-reject],[data-gpfold],[data-lpsel],[data-goto],[data-lpopen],[data-gpsel]';

  function idOf(raw) {
    const at = String(raw).indexOf(':');
    return { list: String(raw).slice(0, at), id: String(raw).slice(at + 1) };
  }

  function bind() {
    if (document._dtBound) return;
    document._dtBound = true;

    document.addEventListener('click', e => {
      if (!e.target || !e.target.closest) return;

      const cl = e.target.closest('[data-dtclose]');
      if (cl) {
        e.preventDefault();
        const list = cl.getAttribute('data-dtclose');
        const was = st(list).id;
        close(list);
        if (was !== null) refocus = `[data-dtrow="${CSS.escape(list + ':' + was)}"]`;
        repaint();
        return;
      }

      const tb = e.target.closest('[data-dttab]');
      if (tb) {
        e.preventDefault();
        const p = idOf(tb.getAttribute('data-dttab'));
        st(p.list).tab = p.id;
        refocus = `[data-dttab="${CSS.escape(p.list + ':' + p.id)}"]`;
        repaint();
        return;
      }

      const row = e.target.closest('[data-dtrow]');
      if (row && !e.target.closest(CONTROLS)) {
        e.preventDefault();
        const p = idOf(row.getAttribute('data-dtrow'));
        toggle(p.list, p.id);
        refocus = `[data-dtrow="${CSS.escape(p.list + ':' + p.id)}"]`;
        repaint();
      }
    }, true);   /* Capture, so the handle is read before anything a pane binds
                   on the way back up. Propagation is deliberately NOT stopped:
                   the rows no longer carry data-cas / data-drone / data-lpsel,
                   so the shell's own row binding — the one that pushed a
                   selection at the inspector rail — no longer matches them,
                   and the click-away closers for the theme menu and the
                   provenance tip still get their event. */

    document.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target;
      if (!t || !t.closest) return;

      /* ESCAPE closes the region the keyboard is inside; from anywhere else
         in a list it closes that list's region. */
      if (e.key === 'Escape') {
        const inRegion = t.closest('.dt');
        const row = t.closest('[data-dtrow]');
        let list = null, id = null;
        if (inRegion) {
          const host = inRegion.closest('[data-dtfor]');
          if (host) { const p = idOf(host.getAttribute('data-dtfor')); list = p.list; id = p.id; }
        } else if (row) {
          const p = idOf(row.getAttribute('data-dtrow')); list = p.list; id = p.id;
        }
        if (list === null) {
          /* Nothing focused inside a list: close whatever single region is
             open, and only if exactly one is. */
          const open = [...ST.entries()].filter(([, s]) => s.id !== null);
          if (open.length !== 1) return;
          list = open[0][0]; id = open[0][1].id;
        }
        if (st(list).id === null) return;
        e.preventDefault(); e.stopPropagation();
        const was = st(list).id;
        close(list);
        refocus = `[data-dtrow="${CSS.escape(list + ':' + (id || was))}"]`;
        repaint();
        return;
      }

      /* ENTER / SPACE on the handle. */
      const row = t.closest('[data-dtrow]');
      if (row && (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar')) {
        if (t.closest(CONTROLS)) return;
        e.preventDefault(); e.stopPropagation();
        const p = idOf(row.getAttribute('data-dtrow'));
        toggle(p.list, p.id);
        refocus = `[data-dtrow="${CSS.escape(p.list + ':' + p.id)}"]`;
        repaint();
        return;
      }

      /* ARROW KEYS across the tab strip, with the tab activated as it is
         reached — the strip is short and every panel is already built from
         the record in hand. */
      const tab = t.closest('[data-dttab]');
      if (tab) {
        const strip = tab.closest('[role="tablist"]');
        if (!strip) return;
        const all = [...strip.querySelectorAll('[data-dttab]')];
        const at = all.indexOf(tab);
        let to = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (at + 1) % all.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (at - 1 + all.length) % all.length;
        else if (e.key === 'Home') to = 0;
        else if (e.key === 'End') to = all.length - 1;
        else return;
        e.preventDefault(); e.stopPropagation();
        const p = idOf(all[to].getAttribute('data-dttab'));
        st(p.list).tab = p.id;
        refocus = `[data-dttab="${CSS.escape(p.list + ':' + p.id)}"]`;
        repaint();
      }
    }, true);

    window.addEventListener('resize', () => { try { sync(); } catch (e) { /* nothing to do */ } });
  }

  /* --------------------------------------------------------- bootstrap */
  const API = {
    /* state */
    isOpen, openId, open, close, toggle, state: list => st(list),
    /* markup */
    rowAttrs, region,
    /* content */
    figs, group, table, status, empty, meter, notes, clamp,
    /* after a pane has painted */
    sync,
    LIMIT
  };

  bind();
  if (typeof ANGEL.provide === 'function') ANGEL.provide('detail', API);
  else ANGEL.detail = API;
  ANGEL.detail = API;
  if (typeof ANGEL.mark === 'function') ANGEL.mark('detail ready');
})();
