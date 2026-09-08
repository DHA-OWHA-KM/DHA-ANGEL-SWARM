/* ==========================================================================
   ANGEL SWARM — THE SHELL
   ==========================================================================
   The navigation, the chrome and the page frame, rebuilt to the Design Canvas
   canvas in DESIGN/ANGEL_SWARM.dc.html.

   NINE DESTINATIONS, NOT TWENTY-FOUR. The canvas draws nine and the
   instruction is that the other fifteen fold into them. Nothing is deleted:
   every one of the old destinations is reachable, as a tab or a section
   inside the destination that owns it. SECTIONS below is that mapping, and
   it is the only place it is written down.

   The engine underneath is untouched. Every figure on every screen is read
   out of the running simulation at the moment it is drawn — the canvas's own
   numbers were placeholders for spacing, and this file does not carry any of
   them.
   ========================================================================== */
(function () {
  'use strict';

  /* ---- the nine, in the canvas's order ---------------------------------- */
  const NAV = [
    { k:'dash', label:'Command Overview', icon:'grid',   badge:null },
    { k:'cas',  label:'Live Casualties',  icon:'heart',  badge:'open' },
    { k:'dec',  label:'Decision',         icon:'fork',   badge:'esc' },
    { k:'feed', label:'Decision Feed',    icon:'feed',   badge:null },
    { k:'tty',  label:'Analyst Terminal', icon:'term',   badge:null },
    { k:'ops',  label:'Ops Center Wall',  icon:'wall',   badge:null },
    { k:'ev',   label:'Evidence',         icon:'shield', badge:null },
    { k:'chat', label:'Ask ANGEL',        icon:'chat',   badge:'ai' },
    { k:'map',  label:'Theater Map',      icon:'map',    badge:null }
  ];

  /* ---- WHERE THE OTHER FIFTEEN WENT -------------------------------------
     Read this as the answer to "I used to be able to get to X". Nothing was
     removed; each of these is a tab inside the destination named on the
     left, and the old view key still resolves so a link or a keyboard
     shortcut that named it still arrives somewhere sensible. */
  const SECTIONS = {
    dash: ['DECIDE', 'STANDARD', 'UNITS', 'FLOW'],
    cas:  ['CASUALTIES', 'SUPPLY', 'FLEET', 'LAUNCHPOINTS'],
    dec:  ['TASKING'],
    feed: ['AUDIT', 'STREAM'],
    tty:  ['QUERY', 'DOCTRINE', 'DATA', 'SENSOR'],
    ops:  ['DASHBOARD'],
    ev:   ['CONFIDENCE', 'COMPARE', 'ANALYSIS', 'ROI', 'COST', 'AFTERACTION'],
    chat: ['BRIEF'],
    map:  ['MISSION']
  };
  const OWNER = {};
  for (const page in SECTIONS) for (const v of SECTIONS[page]) OWNER[v] = page;

  const ICON = {
    grid:  '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5" fill="oklch(0.72 0.14 165)"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" fill="oklch(0.55 0.09 165)"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" fill="oklch(0.55 0.09 165)"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" fill="oklch(0.72 0.14 165)"/>',
    heart: '<path d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 5.8-8.5 11.3-8.5 11.3Z" fill="oklch(0.62 0.19 25)"/><path d="M4 12.6h4l1.6-3 2.6 5.4 1.8-2.4H20" stroke="oklch(0.97 0.02 25)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    fork:  '<path d="M12 21V11m0 0L5 4m7 7 7-7" stroke="oklch(0.8 0.15 75)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="19" cy="4" r="2.6" fill="oklch(0.85 0.15 75)"/><circle cx="5" cy="4" r="2.6" fill="oklch(0.55 0.1 75)"/>',
    feed:  '<circle cx="5" cy="6" r="2.4" fill="oklch(0.72 0.14 210)"/><circle cx="5" cy="12" r="2.4" fill="oklch(0.72 0.14 210)"/><circle cx="5" cy="18" r="2.4" fill="oklch(0.5 0.09 210)"/><path d="M10 6h11M10 12h11M10 18h7" stroke="oklch(0.68 0.12 210)" stroke-width="2.2" stroke-linecap="round"/>',
    term:  '<rect x="2.5" y="4" width="19" height="16" rx="2.5" fill="oklch(0.26 0.05 145)" stroke="oklch(0.6 0.13 145)" stroke-width="1.5"/><path d="M6.5 9.5 9.5 12l-3 2.5M12 15h5.5" stroke="oklch(0.85 0.19 145)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    wall:  '<rect x="2" y="4" width="20" height="13" rx="2" fill="oklch(0.32 0.07 200)" stroke="oklch(0.68 0.13 200)" stroke-width="1.5"/><path d="M8 21h8M12 17v4" stroke="oklch(0.68 0.13 200)" stroke-width="2" stroke-linecap="round"/><path d="M5.5 13.5 9 9l3 3.5L15 7l3.5 6.5" stroke="oklch(0.85 0.16 200)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    shield:'<path d="M12 2.5 4 6v6.2c0 4.6 3.4 8.4 8 9.3 4.6-.9 8-4.7 8-9.3V6l-8-3.5Z" fill="oklch(0.42 0.12 75)" stroke="oklch(0.72 0.16 75)" stroke-width="1.4"/><path d="m8.4 12.2 2.5 2.5 4.7-4.9" stroke="oklch(0.93 0.1 75)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    chat:  '<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-5 4v-4H5.5A2.5 2.5 0 0 1 3 14.5v-8Z" fill="oklch(0.4 0.12 330)" stroke="oklch(0.72 0.16 330)" stroke-width="1.4"/><path d="m12 7 1.1 2.6L15.7 11l-2.6 1.1L12 14.7l-1.1-2.6L8.3 11l2.6-1.1L12 7Z" fill="oklch(0.93 0.11 330)"/>',
    map:   '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z" fill="oklch(0.28 0.05 210)" stroke="oklch(0.7 0.13 210)" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 4v13.5M15 6.5V20" stroke="oklch(0.7 0.13 210)" stroke-width="1.4"/>'
  };
  const svg = k => '<svg' + (k === 'shield' ? ' class="evidence-nav-icon"' : '') +
    ' width="17" height="17" viewBox="0 0 24 24" fill="none">' + ICON[k] + '</svg>';

  const S = { page: 'dash' };
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  /* ---- live figures, read at the moment of drawing ---------------------- */
  /* A casualty's absolute deadline is the minute they were wounded plus the
     window the network gives them. `deadlineMin >= 9000` is the simulation's
     way of saying "not time-critical", not a deadline nine thousand minutes
     out, so those are excluded rather than sorted to the bottom. */
  const dueAt = c => c.tInjury + c.deadlineMin;
  const timeCritical = c => c.deadlineMin < 9000;
  const casId = c => 'CAS-' + String(c.id).padStart(3, '0');

  function live() {
    const A = window.APP;
    if (!A || !A.world || !A.armA) return null;
    const arm = A.armA, ctl = A.armB;
    const now = A.tView == null ? A.t : A.tView;
    const open = arm.casualties.filter(c =>
      c.outcome === null && !c.treated && c.tInjury <= now);

    /* Reach comes from the allocator's own model, published by page-grouped,
       so the queue's arrival column and the casualty register cannot disagree
       about whether an aircraft can get there. If that module has not loaded,
       arrival is stated as unknown rather than guessed. */
    let S = null, place = null;
    try {
      const g = window.ANGEL && ANGEL.get && ANGEL.get('grouped');
      if (g && g.survey && g.place) { S = g.survey(); place = g.place; }
    } catch (e) { /* contained: the shell must draw without it */ }

    const timed = open.filter(timeCritical).map(c => {
      const p = (S && place) ? place(S, c) : { site: null, min: null, n: null };
      const left = dueAt(c) - now;
      return { c, left, eta: p.min, sites: p.n, site: p.site,
               slack: (p.min == null) ? null : left - p.min,
               unreachable: p.n === 0 };
    }).sort((a, b) => a.left - b.left);
    const drones = arm.drones || [];
    return {
      A: arm, ctl, now,
      scn: A.world.scn,
      open,
      timed,
      tightest: timed[0] || null,
      unreachable: timed.filter(r => r.unreachable || (r.slack !== null && r.slack < 0)).length,
      deadA: window.COUNT ? COUNT.deathsSurvivable(arm) : 0,
      deadB: window.COUNT ? COUNT.deathsSurvivable(ctl) : 0,
      lift: { ready: drones.filter(d => d.state === 'IDLE' && !d.held).length,
              air: drones.filter(d => d.state !== 'IDLE' && d.state !== 'DOWN').length,
              all: drones.length },
      /* `A.approvals` never existed — I wrote the field name from memory
         rather than from the engine, so the rail's escalation badge and the
         overview's escalation card were permanently zero while the Decision
         page, reading the real queue, correctly showed proposals waiting.
         The queue is on the arm and a proposal awaiting a human is PENDING. */
      awaiting: (arm.queue || []).filter(p => p.state === 'PENDING').length,
      deployed: A.deploy && A.deploy.state === 'DEPLOYED'
    };
  }

  const MIN = m => (m == null || !isFinite(m)) ? '—'
    : (m < 0 ? '−' : '') + String(Math.floor(Math.abs(m))).padStart(2,'0') + ':' +
      String(Math.round((Math.abs(m) % 1) * 60)).padStart(2,'0');

  /* ---- the rail --------------------------------------------------------- */
  function railHTML(L) {
    const badge = n => {
      if (n.badge === 'open') { const v = L ? L.open.length : 0;
        return v ? `<span class="d-pill red">${v}</span>` : ''; }
      if (n.badge === 'esc')  { const v = L ? L.awaiting : 0;
        return v ? `<span class="d-pill amb">${v}</span>` : ''; }
      if (n.badge === 'ai')   return '<span class="d-ai">&#10022; AI</span>';
      return '';
    };
    return `<div class="d-brand">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style="flex:none"><path d="M12 3 4 7v5c0 4.4 3.2 8.2 8 9 4.8-.8 8-4.6 8-9V7l-8-4Z" stroke="oklch(0.7 0.16 25)" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 8v8M8 12h8" stroke="oklch(0.8 0.17 25)" stroke-width="2.4" stroke-linecap="round"/></svg>
        <div style="display:flex;flex-direction:column;gap:3px">
          <span class="d-brand-n">ANGEL SWARM</span>
          <span class="d-brand-s">DHA &middot; PHYSIOLOGICAL-DEADLINE BLOOD ALLOCATION</span>
        </div></div>
      <nav class="d-nav">${NAV.map(n =>
        `<button type="button" class="d-nav-i${S.page===n.k?' on':''}" data-page="${n.k}"
           aria-current="${S.page===n.k?'page':'false'}">${svg(n.icon)}
           <span class="l">${n.label}</span>${badge(n)}</button>`).join('')}</nav>
      <div class="d-nav-sep">
        <button type="button" class="d-nav-i" data-page="ev" data-sec="AUDIT"><span class="l">Authority &amp; Policy</span></button>
        <button type="button" class="d-nav-i" data-page="tty" data-sec="DATA"><span class="l">Data Sources</span></button>
        <button type="button" class="d-nav-i" data-page="settings"><span class="l">Settings</span></button>
      </div>
      ${edgeHTML(L)}`;
  }

  /* THE EDGE STATE BOX IS NOT DECORATION. It reports whether this machine is
     deciding on its own state, which is the claim the whole prototype rests
     on, so it reads the real link rather than a fixed string. */
  function edgeHTML(L) {
    const T = window.TELEMETRY;
    let txt = 'Deciding on local state — no reachback required', live = true;
    if (T && T.available) {
      const age = T.lastAt ? (Date.now() - T.lastAt) / 1000 : -1;
      live = age >= 0 && age < 12;
      txt = live ? 'Telemetry live — ' + (T.rate || 0).toFixed(1) + '/s from the force'
                 : 'Link down — holding last-known-good plan, aircraft still flying';
    }
    return `<div class="d-edge"><b>EDGE STATE</b>
      <div class="r"><i style="background:${live?'oklch(0.72 0.14 165)':'oklch(0.78 0.14 75)'}"></i>
      <span style="color:${live?'oklch(0.84 0.06 165)':'oklch(0.86 0.03 75)'}">${esc(txt)}</span></div></div>`;
  }

  /* ---- the top bar ------------------------------------------------------ */
  function topHTML(L) {
    const A = window.APP;
    const t = L ? L.now : 0;
    const hh = String(Math.floor(t / 60)).padStart(2,'0');
    const mm = String(Math.floor(t % 60)).padStart(2,'0');
    const ss = String(Math.floor((t % 1) * 60)).padStart(2,'0');
    const auth = A && A.angelActive ? 'ALLOCATION AUTHORITY' : 'STANDBY — NO AUTHORITY';
    return `<div class="d-top">
      <div style="display:flex;gap:12px;align-items:center">
        <label class="d-search"><span>Search casualty, asset, site</span></label>
        <span class="d-fpcon">FPCON BRAVO</span>
      </div>
      <div style="display:flex;gap:16px;align-items:center">
        <span class="d-auth">${auth}</span>
        <span class="d-clock">${hh}${mm}:${ss}Z</span>
        <span class="d-date">SEED ${esc(A ? A.seed : '')}</span>
      </div></div>`;
  }

  /* ---- classification --------------------------------------------------- */
  /* PACOM, not INDOPACOM. The canvas says INDOPACOM; the instruction on this
     project has been PACOM throughout and it wins here. */
  function classHTML(L) {
    const aor = L && L.scn ? (L.scn.name || '') : '';
    return `<div class="d-class">
      <span>UNCLASSIFIED // PUBLIC RELEASE // SYNTHETIC DATA // FOR DEMONSTRATION ONLY</span>
      <span>${esc(aor)} &middot; PACOM</span></div>`;
  }

  /* ---- the frame -------------------------------------------------------- */
  function mount() {
    if (document.getElementById('dShell')) return;
    const host = document.createElement('div');
    host.id = 'dShell';
    host.className = 'd-app';
    host.innerHTML = `${classHTML(null)}
      <div class="d-grid">
        <aside class="d-rail" id="dRail"></aside>
        <div class="d-main" id="dMain"></div>
      </div>`;
    document.body.appendChild(host);

    /* Exempt the dialogs from the allow-list that hides the old chrome. It
       has to be a class rather than a stylesheet rule: the allow-list
       selector is more specific than any id-plus-class exemption written
       after it, so a CSS-only carve-out loses the tie even with !important.
       `:not(.d-keep)` is in that selector; this puts these elements outside
       it, and their own stylesheet governs them again. */
    ['deployModal','modal','confirmModal','acctModal','runModal','keysheet','toasts']
      .forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('d-keep'); });
    new MutationObserver(ms => {
      for (const m of ms) for (const n of m.addedNodes) {
        if (n.nodeType === 1 && n.parentElement === document.body) n.classList.add('d-keep');
      }
    }).observe(document.body, { childList: true });
    host.addEventListener('click', ev => {
      const b = ev.target.closest('[data-page]');
      if (!b) return;
      go(b.dataset.page, b.dataset.sec);
    });
  }

  function go(page, sec) {
    S.page = page;
    if (sec && typeof window.goView === 'function') window.goView(sec);
    else {
      const first = (SECTIONS[page] || [])[0];
      if (first && typeof window.goView === 'function') window.goView(first);
    }
    if (window.APP) window.APP._paneForce = true;
    paint();
  }

  function paint() {
    const L = live();
    const rail = document.getElementById('dRail');
    const main = document.getElementById('dMain');
    if (!rail || !main) return;
    const cls = document.querySelector('#dShell > .d-class');
    if (cls) cls.outerHTML = classHTML(L);
    rail.innerHTML = railHTML(L);
    const page = window.DPAGES && window.DPAGES[S.page];
    main.innerHTML = topHTML(L) + (page ? page(L) : emptyPage(S.page));
  }

  function emptyPage(k) {
    const n = NAV.find(x => x.k === k);
    return `<div class="d-head"><div><h1>${esc(n ? n.label : k)}</h1>
      <p>Not yet adapted to this design.</p></div></div>`;
  }

  window.DSHELL = { mount, paint, go, NAV, SECTIONS, OWNER, live, esc, MIN, svg, casId, dueAt };
  window.DPAGES = window.DPAGES || {};

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => { mount(); paint(); });
  else { mount(); paint(); }
  setInterval(() => { if (document.getElementById('dShell')) paint(); }, 1000);
})();
