/* --------------------------------------------------------------------------
   ANGEL SWARM — THE SHELL
   --------------------------------------------------------------------------
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
   -------------------------------------------------------------------------- */
(function () {
  'use strict';

  /* ---- the operator's workflow order ------------------------------------ */
  const NAV = [
    { k:'dash',    page:'dash', label:'Command Overview', icon:'grid',   badge:null },
    { k:'map',     page:'map',  label:'Theater Map',      icon:'map',    badge:null,
      views:['MISSION','DASHBOARD'] },
    { k:'ops',     page:'ops',  label:'Ops Center Wall',  icon:'wall',   badge:null },
    { k:'dec',     page:'dec',  label:'Decisions',        icon:'fork',   badge:'esc' },
    { k:'cas',     page:'cas',  label:'Live Casualties',  icon:'heart',  badge:'open' },
    { k:'wargame', page:'ev',   label:'War Game',         icon:'feed',   badge:null,
      sec:'CONFIDENCE', tabGroup:'ev', tab:'CONF' },
    { k:'sensor',  page:'tty',  label:'Sensor & Model',   icon:'term',   badge:null,
      sec:'SENSOR', tabGroup:'tty', tab:'SENSOR' },
    { k:'track',   page:'track', label:'Resupply Tracking', icon:'air',  badge:null,
      virtual:'TRACK' },
    { k:'ev',      page:'ev',   label:'Evidence',         icon:'shield', badge:null,
      sec:'ANALYSIS', tabGroup:'ev', tab:'EV' },
    { k:'chat',    page:'chat', label:'Ask Angel',        icon:'chat',   badge:'ai' }
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
    track:['TRACK'],
    ops:  ['DASHBOARD'],
    ev:   ['CONFIDENCE', 'COMPARE', 'ANALYSIS', 'ROI', 'COST', 'AFTERACTION'],
    chat: ['BRIEF'],
    map:  ['MISSION']
  };
  const OWNER = {};
  for (const page in SECTIONS) for (const v of SECTIONS[page]) OWNER[v] = page;
  OWNER.CONFIDENCE = 'wargame';
  OWNER.SENSOR = 'sensor';
  OWNER.AUDIT = 'auth';
  OWNER.STREAM = 'auth';
  OWNER.DATA = 'data';

  const SECONDARY = {
    tty:      { page:'tty', sec:'QUERY', tabGroup:'tty', tab:'TTY' },
    auth:     { page:'feed', sec:'AUDIT' },
    data:     { page:'tty', sec:'DATA', tabGroup:'tty', tab:'DATA' },
    settings: { page:'settings', utility:true }
  };
  const VIEW_TABS = {
    QUERY:['tty','QUERY'], DOCTRINE:['tty','DOCTRINE'], DATA:['tty','DATA'], SENSOR:['tty','SENSOR'],
    CONFIDENCE:['ev','CONF'], COMPARE:['ev','CMP'], ANALYSIS:['ev','ANA'], ROI:['ev','ROI'],
    COST:['ev','COST'], AFTERACTION:['ev','AAR']
  };

  function setViewTab(view) {
    const intent = VIEW_TABS[view];
    if (intent && window.DPB && typeof window.DPB.setTab === 'function') {
      window.DPB.setTab(intent[0], intent[1]);
    }
  }

  function destination(k) {
    return NAV.find(n => n.k === k) || SECONDARY[k] || { k, page:k };
  }

  function owns(k, view) {
    const n = destination(k);
    if (['CONFIDENCE','SENSOR','AUDIT','STREAM','DATA'].includes(view) &&
        OWNER[view] && OWNER[view] !== k) return false;
    if (n.views) return n.views.includes(view);
    if (n.sec) return n.sec === view;
    return (SECTIONS[n.page] || []).includes(view);
  }

  const ICON = {
    grid:  '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5" fill="oklch(0.72 0.14 165)"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" fill="oklch(0.55 0.09 165)"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" fill="oklch(0.55 0.09 165)"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" fill="oklch(0.72 0.14 165)"/>',
    heart: '<path d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 5.8-8.5 11.3-8.5 11.3Z" fill="oklch(0.62 0.19 25)"/><path d="M4 12.6h4l1.6-3 2.6 5.4 1.8-2.4H20" stroke="oklch(0.97 0.02 25)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    fork:  '<path d="M12 21V11m0 0L5 4m7 7 7-7" stroke="oklch(0.8 0.15 75)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="19" cy="4" r="2.6" fill="oklch(0.85 0.15 75)"/><circle cx="5" cy="4" r="2.6" fill="oklch(0.55 0.1 75)"/>',
    feed:  '<circle cx="5" cy="6" r="2.4" fill="oklch(0.72 0.14 210)"/><circle cx="5" cy="12" r="2.4" fill="oklch(0.72 0.14 210)"/><circle cx="5" cy="18" r="2.4" fill="oklch(0.5 0.09 210)"/><path d="M10 6h11M10 12h11M10 18h7" stroke="oklch(0.68 0.12 210)" stroke-width="2.2" stroke-linecap="round"/>',
    term:  '<rect x="2.5" y="4" width="19" height="16" rx="2.5" fill="oklch(0.26 0.05 145)" stroke="oklch(0.6 0.13 145)" stroke-width="1.5"/><path d="M6.5 9.5 9.5 12l-3 2.5M12 15h5.5" stroke="oklch(0.85 0.19 145)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    air:   '<path d="M12 2.4c.8 0 1.4.6 1.4 1.4v4.6l7.6 4.3v2.1l-7.6-2.2v3.9l2.4 1.9v1.6L12 18.8 8.2 20v-1.6l2.4-1.9v-3.9L3 14.8v-2.1l7.6-4.3V3.8c0-.8.6-1.4 1.4-1.4Z" fill="oklch(0.8 0.14 165)"/><path d="M12 5.4V18" stroke="oklch(0.3 0.05 165)" stroke-width="1.4"/>',
    wall:  '<rect x="2" y="4" width="20" height="13" rx="2" fill="oklch(0.32 0.07 200)" stroke="oklch(0.68 0.13 200)" stroke-width="1.5"/><path d="M8 21h8M12 17v4" stroke="oklch(0.68 0.13 200)" stroke-width="2" stroke-linecap="round"/><path d="M5.5 13.5 9 9l3 3.5L15 7l3.5 6.5" stroke="oklch(0.85 0.16 200)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    shield:'<path d="M12 2.5 4 6v6.2c0 4.6 3.4 8.4 8 9.3 4.6-.9 8-4.7 8-9.3V6l-8-3.5Z" fill="oklch(0.42 0.12 300)" stroke="oklch(0.72 0.16 300)" stroke-width="1.4"/><path d="m8.4 12.2 2.5 2.5 4.7-4.9" stroke="oklch(0.93 0.1 300)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    chat:  '<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-5 4v-4H5.5A2.5 2.5 0 0 1 3 14.5v-8Z" fill="oklch(0.4 0.12 330)" stroke="oklch(0.72 0.16 330)" stroke-width="1.4"/><path d="m12 7 1.1 2.6L15.7 11l-2.6 1.1L12 14.7l-1.1-2.6L8.3 11l2.6-1.1L12 7Z" fill="oklch(0.93 0.11 330)"/>',
    map:   '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z" fill="oklch(0.28 0.05 210)" stroke="oklch(0.7 0.13 210)" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 4v13.5M15 6.5V20" stroke="oklch(0.7 0.13 210)" stroke-width="1.4"/>'
  };
  const svg = k => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none">' + ICON[k] + '</svg>';

  const S = {
    page: 'dash',
    heldView: null,
    query: '',
    search: null,
    blockedAttempt: false
  };
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const fpconVars = condition => `--fpcon-bg:${condition.bg};--fpcon-line:${condition.line};` +
    `--fpcon-text:${condition.text};--fpcon-mark:${condition.mark}`;

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
  const CS = window.ContextSearch;

  function searchContext(placeholder, noun) {
    S.search = placeholder ? { placeholder, noun: noun || 'records' } : null;
  }
  function query() { return S.query; }
  function matches() {
    return CS.matches.apply(null, [S.query].concat(Array.prototype.slice.call(arguments)));
  }
  function noMatches(noun) {
    return `<div class="d-no-match" role="status">No ${esc(noun || (S.search && S.search.noun) || 'records')} match “${esc(S.query)}”.</div>`;
  }
  function missionActive() {
    return CS.missionActive(window.APP);
  }
  function wallRemaining() {
    return CS.wallRemaining(window.APP);
  }
  function countdown(s) {
    return CS.countdown(s);
  }

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
    return `<button type="button" class="d-brand" data-page="dash"
        aria-label="ANGEL SWARM home — Command Overview">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style="flex:none"><path d="M12 3 4 7v5c0 4.4 3.2 8.2 8 9 4.8-.8 8-4.6 8-9V7l-8-4Z" stroke="oklch(0.7 0.16 25)" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 8v8M8 12h8" stroke="oklch(0.8 0.17 25)" stroke-width="2.4" stroke-linecap="round"/></svg>
        <div style="display:flex;flex-direction:column;gap:3px">
          <span class="d-brand-n">ANGEL SWARM</span>
          <span class="d-brand-s">DHA &middot; PHYSIOLOGICAL-DEADLINE BLOOD ALLOCATION</span>
        </div></button>
      <nav class="d-nav" aria-label="Primary navigation">${NAV.map(n =>
        `<button type="button" class="d-nav-i${S.page===n.k?' on':''}" data-page="${n.k}"
           ${n.sec ? `data-sec="${n.sec}"` : ''}
           aria-current="${S.page===n.k?'page':'false'}">${svg(n.icon)}
           <span class="l">${n.label}</span>${badge(n)}</button>`).join('')}</nav>
      <div class="d-nav-sep" role="navigation" aria-label="Secondary navigation">
        <button type="button" class="d-nav-i${S.page==='tty'?' on':''}" data-page="tty" data-sec="QUERY"
          aria-current="${S.page==='tty'?'page':'false'}"><span class="l">Analyst Terminal</span></button>
        <button type="button" class="d-nav-i${S.page==='auth'?' on':''}" data-page="auth" data-sec="AUDIT"
          aria-current="${S.page==='auth'?'page':'false'}"><span class="l">Authority &amp; Policy</span></button>
        <button type="button" class="d-nav-i${S.page==='data'?' on':''}" data-page="data" data-sec="DATA"
          aria-current="${S.page==='data'?'page':'false'}"><span class="l">Data Sources</span></button>
        <button type="button" class="d-nav-i${S.page==='settings'?' on':''}" data-page="settings"
          aria-current="${S.page==='settings'?'page':'false'}"><span class="l">Settings</span></button>
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
    const fpcon = window.FPCON.current();
    const t = L ? L.now : 0;
    const hh = String(Math.floor(t / 60)).padStart(2,'0');
    const mm = String(Math.floor(t % 60)).padStart(2,'0');
    const ss = String(Math.floor((t % 1) * 60)).padStart(2,'0');
    const auth = A && A.angelActive ? 'ALLOCATION AUTHORITY' : 'STANDBY — NO AUTHORITY';
    const active = missionActive();
    const searchLabel = S.search ? `Filter ${S.search.noun} on this screen` : '';
    const search = S.search ? `<div class="d-search-wrap">
      <label class="d-search">
        <span class="d-sr">${esc(searchLabel)}</span>
        <input id="dContextSearch" type="search" autocomplete="off"
          aria-label="${esc(searchLabel)}" placeholder="${esc(S.search.placeholder)}"
          value="${esc(S.query)}" ${active ? 'aria-disabled="true"' : ''}>
        ${S.query ? '<button type="button" data-search-clear aria-label="Clear screen search">×</button>' : ''}
      </label>
      ${S.blockedAttempt && active ? `<span class="d-search-block" role="status" aria-live="polite">
        Search unavailable until this mission finishes · ${countdown(wallRemaining())} wall time${
          A && !A.running ? ' · paused' : ''}</span>` : ''}
    </div>` : '';
    return `<div class="d-top">
      <div style="display:flex;gap:12px;align-items:center">
        ${search}
        <span class="d-fpcon d-fpcon--${esc(fpcon.tone)}"
          style="${fpconVars(fpcon)}">FPCON ${esc(fpcon.key)}</span>
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
      if (ev.target.closest('[data-search-clear]')) {
        S.query = ''; S.blockedAttempt = false; paint(); return;
      }
      const fpcon = ev.target.closest('[data-fpcon]');
      if (fpcon) {
        window.FPCON.set(fpcon.dataset.fpcon);
        paint();
        return;
      }
      const b = ev.target.closest('[data-page]');
      if (!b) return;
      go(b.dataset.page, b.dataset.sec);
    });
    host.addEventListener('input', ev => {
      if (!ev.target || ev.target.id !== 'dContextSearch') return;
      CS.input(S, ev.target.value, window.APP);
      ev.target.value = S.query;
      paint();
    });
    host.addEventListener('beforeinput', ev => {
      if (ev.target && ev.target.id === 'dContextSearch' && missionActive()) {
        ev.preventDefault();
        S.blockedAttempt = true;
        paint();
      }
    });
    host.addEventListener('keydown', ev => {
      const brand = ev.target.closest && ev.target.closest('.d-brand[data-page="dash"]');
      if (brand && (ev.key === ' ' || ev.key === 'Enter')) {
        /* app.js owns a window-level Space shortcut for Play/Pause. Consume
           brand activation inside the shell before that shortcut sees it. */
        ev.preventDefault();
        ev.stopPropagation();
        go('dash');
        const home = host.querySelector('.d-brand[data-page="dash"]');
        if (home) home.focus();
        return;
      }
      const option = ev.target.closest && ev.target.closest('[data-fpcon]');
      if (!option) return;
      if (ev.key === ' ' || ev.key === 'Enter') {
        /* The legacy console owns a window-level Space shortcut for mission
           Play/Pause. A focused display radio must consume activation here,
           before that shortcut sees it, or changing a label starts the run. */
        ev.preventDefault();
        ev.stopPropagation();
        const key = option.dataset.fpcon;
        window.FPCON.set(key);
        paint();
        const selected = host.querySelector(`[data-fpcon="${key}"]`);
        if (selected) selected.focus();
        return;
      }
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(ev.key)) return;
      ev.preventDefault();
      const conditions = window.FPCON.CONDITIONS;
      const at = conditions.findIndex(condition => condition.key === option.dataset.fpcon);
      const step = (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') ? 1 : -1;
      const next = ev.key === 'Home' ? 0 : ev.key === 'End' ? conditions.length - 1
        : (at + step + conditions.length) % conditions.length;
      const key = conditions[next].key;
      window.FPCON.set(key);
      paint();
      const selected = host.querySelector(`[data-fpcon="${key}"]`);
      if (selected) selected.focus();
    });
    /* The legacy keyboard listener renders synchronously. Prime the page tab
       during capture so a previously-open subsection cannot reclaim the view
       before the shell's selected destination synchronizes. */
    window.addEventListener('keydown', ev => {
      const path = typeof ev.composedPath === 'function' ? ev.composedPath() : [];
      if (path.some(node => node && node.tagName === 'ANGEL-RESUPPLY-TRACK')) return;
      const target = ev.target;
      const editing = target && target.closest &&
        target.closest('input,textarea,[contenteditable="true"]');
      if (ev.ctrlKey || ev.metaKey || ev.altKey || editing) return;
      const key = ev.key;
      let fallback = null;
      if (key === 'd' || key === 'D' || key === '0') { setViewTab('DATA'); fallback = 'DATA'; }
      else if (key === '4') { setViewTab('COMPARE'); fallback = 'COMPARE'; }
      else if (key === 'c' || key === 'C') { setViewTab('ROI'); fallback = 'ROI'; }
      else if (key === 'q' || key === 'Q') { setViewTab('QUERY'); fallback = 'QUERY'; }
      else if (key === 'm' || key === 'M') { setViewTab('SENSOR'); fallback = 'SENSOR'; }
      else if (key === 'u' || key === 'U') { setViewTab('CONFIDENCE'); fallback = 'CONFIDENCE'; }
      if (fallback) setTimeout(() => {
        if (fallback === 'SENSOR') {
          const palette = window.ANGEL && window.ANGEL.get && window.ANGEL.get('palette');
          if (!palette || !palette.items().some(item => item.id === 'view:SENSOR')) return;
        }
        openView(fallback);
      }, 0);
    }, true);
  }

  function openView(view) {
    setViewTab(view);
    if (typeof window.goView === 'function') window.goView(view);
    const owner = OWNER[view];
    if (owner) CS.navigate(S, owner);
    S.heldView = null;
    if (window.APP) window.APP._paneForce = true;
    paint();
  }
  function go(page, sec) {
    CS.navigate(S, page);
    const n = destination(page);
    const ownedPage = n.page;
    const ownedSec = sec || n.sec;
    if (n.tabGroup && window.DPB && typeof window.DPB.setTab === 'function') {
      window.DPB.setTab(n.tabGroup, n.tab);
    }
    if (n.virtual || n.utility) S.heldView = window.APP && window.APP.view;
    else {
      S.heldView = null;
      if (ownedSec && typeof window.goView === 'function') window.goView(ownedSec);
      else {
        const first = (SECTIONS[ownedPage] || [])[0];
        if (first && typeof window.goView === 'function') window.goView(first);
      }
    }
    if (window.APP) window.APP._paneForce = true;
    paint();
  }

  /* The page itself is live and may be replaced. The search field is not:
     keeping that one DOM node stable preserves focus, selection, IME
     composition and virtual-keyboard state across both input-driven and
     one-second simulation repaints. */
  function syncTop(main, L) {
    const box = document.createElement('div');
    box.innerHTML = topHTML(L);
    const next = box.firstElementChild;
    const cur = main.querySelector(':scope > .d-top');
    if (!cur) { main.insertBefore(next, main.firstChild); return; }
    const curFpcon = cur.querySelector('.d-fpcon');
    const nextFpcon = next.querySelector('.d-fpcon');
    if (curFpcon && nextFpcon) curFpcon.replaceWith(nextFpcon.cloneNode(true));
    const curWrap = cur.querySelector('.d-search-wrap');
    const nextWrap = next.querySelector('.d-search-wrap');
    if (!curWrap || !nextWrap) { cur.replaceWith(next); return; }

    const field = curWrap.querySelector('#dContextSearch');
    const nextField = nextWrap.querySelector('#dContextSearch');
    field.placeholder = nextField.placeholder;
    field.setAttribute('aria-label', nextField.getAttribute('aria-label'));
    if (nextField.hasAttribute('aria-disabled')) field.setAttribute('aria-disabled', 'true');
    else field.removeAttribute('aria-disabled');
    if (field.value !== S.query) field.value = S.query;

    const oldClear = curWrap.querySelector('[data-search-clear]');
    const newClear = nextWrap.querySelector('[data-search-clear]');
    if (oldClear && !newClear) oldClear.remove();
    else if (!oldClear && newClear)
      curWrap.querySelector('.d-search').appendChild(newClear);

    const oldBlock = curWrap.querySelector('.d-search-block');
    const newBlock = nextWrap.querySelector('.d-search-block');
    if (oldBlock && newBlock) oldBlock.replaceWith(newBlock);
    else if (oldBlock) oldBlock.remove();
    else if (newBlock) curWrap.appendChild(newBlock);

    cur.children[1].replaceWith(next.children[1]);
  }

  function paint() {
    const L = live();
    const rail = document.getElementById('dRail');
    const main = document.getElementById('dMain');
    if (!rail || !main) return;
    const view = window.APP && window.APP.view;
    const owner = view && OWNER[view];
    const currentDestination = destination(S.page);
    const holdingDetached = (currentDestination.virtual || currentDestination.utility) &&
      S.heldView === view;
    /* Detached pages do not own a legacy APP.view. Keep them open while that
       underlying view is unchanged, then yield to explicit legacy navigation. */
    if (!holdingDetached && owner && !owns(S.page, view)) {
      CS.navigate(S, owner);
      S.heldView = null;
    }
    if (missionActive() && S.query) S.query = '';
    if (!missionActive()) S.blockedAttempt = false;
    const cls = document.querySelector('#dShell > .d-class');
    if (cls) cls.outerHTML = classHTML(L);
    rail.innerHTML = railHTML(L);
    const page = window.DPAGES && window.DPAGES[destination(S.page).page];
    S.search = null;
    const body = page ? page(L) : emptyPage(S.page);
    syncTop(main, L);
    let pageHost = main.querySelector(':scope > #dPage');
    if (!pageHost) {
      pageHost = document.createElement('div');
      pageHost.id = 'dPage';
      main.appendChild(pageHost);
    }
    const focusedFpcon = pageHost.contains(document.activeElement) &&
      document.activeElement.dataset ? document.activeElement.dataset.fpcon : null;
    const preserveTracker = S.page === 'track' &&
      pageHost.querySelector('angel-resupply-track');
    if (!preserveTracker) pageHost.innerHTML = body;
    if (focusedFpcon) {
      const focused = pageHost.querySelector(`[data-fpcon="${focusedFpcon}"]`);
      if (focused) focused.focus();
    }
  }

  function emptyPage(k) {
    const n = NAV.find(x => x.k === k);
    return `<div class="d-head"><div><h1>${esc(n ? n.label : k)}</h1>
      <p>Not yet adapted to this design.</p></div></div>`;
  }

  function settingsPage() {
    const current = window.FPCON.get();
    return `<div class="d-head"><div><h1>Settings</h1>
      <p>Operator display and console preferences.</p></div></div>
      <div class="d-settings">
        <section class="d-card d-setting-card" aria-labelledby="dFpconTitle">
          <header><div><h2 id="dFpconTitle">Force Protection Condition</h2>
            <p>Operator-set force-protection status. This display setting does not change, pause, or restart the mission simulation.</p>
          </div></header>
          <div class="d-fpcon-options" role="radiogroup" aria-labelledby="dFpconTitle">
            ${window.FPCON.CONDITIONS.map(condition => {
              const checked = condition.key === current;
              return `<button type="button"
                class="d-fpcon-option d-fpcon--${esc(condition.tone)}${checked ? ' on' : ''}"
                role="radio" aria-checked="${checked}" tabindex="${checked ? '0' : '-1'}"
                data-fpcon="${esc(condition.key)}" style="${fpconVars(condition)}">
                <span class="d-fpcon-dot" aria-hidden="true"></span>
                <span><b>FPCON ${esc(condition.key)}</b><small>${esc(condition.label)}</small></span>
              </button>`;
            }).join('')}
          </div>
        </section>
      </div>`;
  }

  window.DSHELL = {
    mount, paint, go, NAV, SECTIONS, OWNER, live, esc, MIN, svg, casId, dueAt,
    searchContext, query, matches, noMatches, missionActive, wallRemaining, countdown, openView
  };
  window.DPAGES = window.DPAGES || {};
  window.DPAGES.settings = settingsPage;

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => { mount(); paint(); });
  else { mount(); paint(); }
  setInterval(() => { if (document.getElementById('dShell')) paint(); }, 1000);
})();
