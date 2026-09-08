/* ==========================================================================
   ANALYST TERMINAL — the canvas's tty page, on live data
   ==========================================================================
   The canvas draws a terminal transcript. This destination is also where the
   four analyst subsystems went: the DuckDB console (QUERY), the MiniLM
   retrieval index (DOCTRINE), the SQLite export (DATA) and the CRI-Net
   sensor model (SENSOR). Those are real working software, not a picture of
   software, so none of them is redrawn here. The transcript is the terminal's
   first tab; the other four tabs mount the actual panes.

   NOTHING ON THIS PAGE IS A LANGUAGE MODEL. The canvas puts an
   "AI GENERATED EXPLANATION" chip on `angel explain`. The explanation this
   application actually has is `c.decision`, which the allocator writes at the
   moment of tasking from the same arithmetic it used to choose — a record,
   not a generation. It carries no chip. The two trained models in this
   destination are CRI-Net, inside the sensor pane, and MiniLM, inside the
   retrieval pane, and each carries its own chip in its own pane.

   The canvas's own figures — 18 open, CAS-114, UAS-07, 41 against 29 — were
   placeholders for spacing. None of them appears here.
   ========================================================================== */
(function () {
  'use strict';

  /* ======================================================================
     DPB — the small runtime the four pages in this set share
     ======================================================================
     Declared here because page-tty.js loads first. Everything is guarded so
     that a page loading without it degrades to no tabs rather than to an
     exception.
     ====================================================================== */
  if (!window.DPB) window.DPB = (function () {

    const TABS = {};                 // group -> selected key
    const H = {};                    // slot id -> last measured dock height
    const ACT = {};                  // action name -> handler
    let slotId = null;               // the slot the dock is currently over
    let home = null, homeNext = null;

    const esc = s => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    /* ---- the dock --------------------------------------------------- */
    /* <main id="views"> is adopted, once, into a box that hangs off #dShell
       and therefore survives the shell's one-second repaint of #dMain. The
       page then draws an empty slot and the dock is positioned over it. */
    function dockEl() {
      let d = document.getElementById('dDock');
      if (d) return d;
      const shell = document.getElementById('dShell');
      if (!shell) return null;
      d = document.createElement('div');
      d.id = 'dDock';
      shell.appendChild(d);
      return d;
    }

    function dock(id, view) {
      const views = document.getElementById('views');
      const d = dockEl();
      if (!views || !d) return false;
      slotId = id;
      if (views.parentNode !== d) {
        home = views.parentNode;
        homeNext = views.nextSibling;
        d.appendChild(views);
      }
      if (view && typeof window.goView === 'function' && window.APP && window.APP.view !== view) {
        window.goView(view);
        window.APP._paneForce = true;
      }
      d.hidden = false; miss = 0;
      sync();
      return true;
    }

    function release() {
      slotId = null; miss = 0;
      const views = document.getElementById('views');
      const d = document.getElementById('dDock');
      if (d) d.hidden = true;
      if (views && home && views.parentNode !== home) {
        try { home.insertBefore(views, homeNext && homeNext.parentNode === home ? homeNext : null); }
        catch (e) { home.appendChild(views); }
      }
    }

    let miss = 0;
    function sync() {
      const d = document.getElementById('dDock');
      if (!d || slotId === null) return;
      const slot = document.getElementById(slotId);
      /* The page function calls dock() before the shell has written the new
         markup, so the slot is legitimately absent for a frame or two. Only a
         sustained absence means the operator has navigated away. */
      if (!slot) { if (++miss > 4) release(); return; }
      miss = 0;
      const shell = document.getElementById('dShell');
      if (!shell) return;
      const s = slot.getBoundingClientRect(), r = shell.getBoundingClientRect();
      d.hidden = false;
      d.style.left = (s.left - r.left) + 'px';
      d.style.top = (s.top - r.top) + 'px';
      d.style.width = s.width + 'px';
      const h = d.offsetHeight;
      if (h > 0) {
        H[slotId] = h;
        if (Math.abs(h - slot.offsetHeight) > 1) slot.style.height = h + 'px';
      }
    }

    (function loop() { try { sync(); } catch (e) { /* never break the frame */ }
      requestAnimationFrame(loop); })();

    /* ---- a slot, with the height it had last time already applied ----- */
    function slot(id) {
      const h = H[id] ? ' style="height:' + H[id] + 'px"' : '';
      return '<div class="b-slot" id="' + esc(id) + '"' + h + '></div>';
    }

    /* ---- tabs --------------------------------------------------------- */
    function tab(grp, def) { return TABS[grp] || def; }
    function seg(grp, def, items) {
      const on = tab(grp, def);
      return '<div class="d-seg">' + items.map(it =>
        '<button type="button" class="' + (on === it.k ? 'on' : '') + '"' +
        ' data-bgrp="' + esc(grp) + '" data-btab="' + esc(it.k) + '"' +
        (it.view ? ' data-bview="' + esc(it.view) + '"' : '') + '>' +
        esc(it.label) + '</button>').join('') + '</div>';
    }

    function act(name, fn) { ACT[name] = fn; }

    document.addEventListener('click', ev => {
      const t = ev.target;
      if (!t || !t.closest) return;
      const b = t.closest('[data-btab]');
      if (b) {
        TABS[b.dataset.bgrp] = b.dataset.btab;
        const v = b.dataset.bview;
        if (v && typeof window.goView === 'function') {
          window.goView(v);
          if (window.APP) window.APP._paneForce = true;
        }
        if (window.DSHELL) window.DSHELL.paint();
        return;
      }
      const a = t.closest('[data-bact]');
      if (a && ACT[a.dataset.bact]) {
        ev.preventDefault();
        ACT[a.dataset.bact](a, ev);
      }
    });

    /* ---- shared formatting ------------------------------------------- */
    const pad = (s, n) => { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); };
    const lpad = (s, n) => { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; };

    /* An aircraft's callsign, from the same table the map uses, and a
       payload's label from the one the simulation uses. Both of those are
       top-level `const` in a classic script, which puts them in the global
       lexical scope rather than on `window` — so they are read by bare name
       with a typeof guard, not off `window`, where they are undefined. */
    function call(d) {
      if (!d) return '—';
      const C = (typeof CALLSIGN !== 'undefined') ? CALLSIGN : null;
      return (C && C[d.type] ? C[d.type] : 'AC') + '-' + String(d.id).padStart(2, '0');
    }
    function pay(k) {
      return (typeof PAYLOADS !== 'undefined' && PAYLOADS[k]) ? PAYLOADS[k].label : String(k);
    }
    /* The terminal and the wall have a column's worth of room, not a
       sentence's. These are the same five payloads under the abbreviations
       the manifest itself uses. */
    const SHORT = { BLOOD:'1U WB', PLASMA:'FDP', TXA:'TXA 2g', TQ_KIT:'HEM KIT', CHEST_SEAL:'SEAL' };
    function payShort(k) { return SHORT[k] || String(k); }
    /* A signed figure with the design's minus sign, not the keyboard's. */
    function sgn(n) { n = Math.round(n); return (n > 0 ? '+' : n < 0 ? '\u2212' : '') + Math.abs(n); }
    function droneOf(arm, id) {
      if (id == null || !arm) return null;
      return (arm.drones || []).find(d => d.id === id) || null;
    }
    /* The mission clock as the top bar draws it. */
    function zulu(t) {
      const hh = String(Math.floor(t / 60)).padStart(2, '0');
      const mm = String(Math.floor(t % 60)).padStart(2, '0');
      const ss = String(Math.floor((t % 1) * 60)).padStart(2, '0');
      return hh + mm + ':' + ss + 'Z';
    }
    /* Blood and plasma on the shelf forward, and at how many sites. */
    function shelf(arm) {
      let units = 0, sites = 0;
      for (const b of (arm.bases || [])) {
        const u = (b.stock.BLOOD || 0) + (b.stock.PLASMA || 0);
        if (u > 0) sites++;
        units += u;
      }
      return { units, sites };
    }
    /* Whether this machine is deciding on its own state. */
    function link() {
      const T = window.TELEMETRY;
      if (!T || !T.available) return { live: true, txt: 'LOCAL DECIDE · NO REACHBACK REQUIRED' };
      const age = T.lastAt ? (Date.now() - T.lastAt) / 1000 : -1;
      const live = age >= 0 && age < 12;
      return { live, txt: live ? 'TELEMETRY LIVE · ' + (T.rate || 0).toFixed(1) + '/s'
                               : 'LINK DOWN · LAST-KNOWN-GOOD PLAN HELD' };
    }
    function pending(arm) {
      return ((arm && arm.queue) || []).filter(p => p.state === 'PENDING');
    }

    return { esc, dock, release, slot, tab, seg, act, pad, lpad, call, pay, payShort, sgn, droneOf,
             zulu, shelf, link, pending, H };
  })();

  const P = window.DPB;
  const D = () => window.DSHELL;
  const esc = P.esc;

  const TABS = [
    { k: 'TTY',      label: 'TRANSCRIPT' },
    { k: 'QUERY',    label: 'SQL CONSOLE',  view: 'QUERY' },
    { k: 'DOCTRINE', label: 'DOCTRINE',     view: 'DOCTRINE' },
    { k: 'SENSOR',   label: 'SENSOR MODEL', view: 'SENSOR' },
    { k: 'DATA',     label: 'DATA FILE',    view: 'DATA' }
  ];

  window.DPAGES = window.DPAGES || {};
  window.DPAGES.tty = function (L) {
    const tab = P.tab('tty', 'TTY');
    const lk = P.link();
    const head = `<div class="b-tty-bar">
        <span>ANGEL SWARM // ALLOC-TTY // ANALYST SESSION // SYNTHETIC DATA</span>
        <span>${L ? P.zulu(L.now) : '----:--Z'} &middot; ${esc(L && L.scn ? (L.scn.gridZone || L.scn.name || '') : '')} &middot; ${esc(lk.txt)}</span>
      </div>
      <div class="b-segbar">${P.seg('tty', 'TTY', TABS)}
        <span class="d-meta">FOUR SUBSYSTEMS, ONE SESSION &middot; QUERY &middot; DOCTRINE &middot; SENSOR &middot; DATA</span>
      </div>`;

    if (tab !== 'TTY') {
      P.dock('ttySlot', tab);
      return `<div class="b-tty">${head}
        <div style="padding:14px 20px 26px">${P.slot('ttySlot')}</div></div>`;
    }
    P.release();

    if (!L) return `<div class="b-tty">${head}
      <div class="b-blk"><span class="b-cmd">$ angel status</span>
      <span class="b-out">no run is loaded in this page yet</span></div></div>`;

    return `<div class="b-tty">${head}
      ${statusBlock(L)}
      ${queueBlock(L)}
      ${escBlock(L)}
      ${compareBlock(L)}
      ${explainBlock(L)}
      ${footBlock(L)}</div>`;
  };

  /* ---- $ angel status ---------------------------------------------------- */
  function statusBlock(L) {
    const s = P.shelf(L.A);
    const inside = L.timed.filter(r => r.slack !== null && r.slack >= 0).length;
    const stale = L.open.filter(c => (L.now - c.tPinged) > 2).length;
    const auth = window.APP && window.APP.angelActive
      ? (window.APP.hitl ? 'STANDING, PROPOSALS ABOVE THRESHOLD' : 'STANDING')
      : 'NOT DELEGATED';
    return `<div class="b-blk">
      <span class="b-cmd">$ angel status</span>
      <span class="b-out">${L.open.length} open &middot; ${inside} inside deadline &middot; ` +
      `<span class="b-neg">${L.unreachable} unreachable</span> &middot; ${stale} not assertable &middot; ` +
      `lift ${L.lift.ready}/${L.lift.all} &middot; LTOWB ${s.units}U/${s.sites} site${s.sites === 1 ? '' : 's'} &middot; ` +
      `authority ${esc(auth)}</span>
      <span class="b-note">// every ID below resolves — click a casualty to open its record</span>
    </div>`;
  }

  /* ---- $ angel queue --sort slack ---------------------------------------- */
  /* The canvas's column set, with one substitution. It draws SI, a shock
     index; what this system actually asserts is the compensatory reserve the
     network read off the waveform, and where the reading is stale it asserts
     nothing at all. That distinction is the point of the column, so the
     column is CRM and a withheld reading prints as three dashes. */
  const MECH = { TRUNCAL_HEM: 'truncal haemorrhage', JUNCTIONAL_HEM: 'junctional haemorrhage',
                 EXTREMITY_HEM: 'extremity haemorrhage', AIRWAY: 'airway compromise',
                 OTHER: 'other mechanism' };

  function queueBlock(L) {
    const MIN = D().MIN;
    const SHOW = 8;
    const rows = L.timed.slice(0, SHOW).map(r => {
      const c = r.c;
      const breach = r.unreachable || (r.slack !== null && r.slack < 0);
      const stale = (L.now - c.tPinged) > 2;
      const d = P.droneOf(L.A, c.assignedTo);
      const crm = stale ? '---'
        : (c.knownCrm !== undefined ? String(Math.round(c.knownCrm))
          : (typeof c.crmAt === 'function' ? String(Math.round(c.crmAt(L.now))) : '---'));
      const needs = (c.needs || []).map(P.payShort).join(' + ') || '—';
      const authority = c.treated ? 'delivered'
        : d ? 'auto'
        : r.unreachable ? 'no asset'
        : stale ? 'withheld · stale ' + Math.round(L.now - c.tPinged) + 'm'
        : 'queued';
      const slack = r.slack === null ? '<span class="qt">   --</span>'
        : `<span class="${r.slack < 0 ? 'b-neg' : 'b-pos'}">${P.lpad(P.sgn(r.slack), 5)}</span>`;
      return `<div class="${breach ? 'brc' : ''}${stale ? ' qt' : ''}">` +
        `<span class="b-id${breach ? ' r' : ''}" data-page="cas">${esc(D().casId(c))}</span>  ` +
        P.pad(esc(r.site ? r.site.b.name : (c.unitName || '—')), 16) +
        P.pad(esc(MECH[c.injury] || String(c.injury || '').toLowerCase()), 24) +
        P.lpad(crm, 4) + '   ' +
        P.lpad(MIN(Math.max(0, r.left)), 8) + '  ' +
        P.pad(d ? esc(P.call(d)) : '—', 9) +
        P.lpad(r.eta === null ? '—' : MIN(r.eta), 7) + '  ' + slack + '  ' +
        P.pad(esc(needs), 26) + esc(authority) + '</div>';
    }).join('');
    const rest = L.timed.length - Math.min(SHOW, L.timed.length);
    return `<div class="b-blk"><span class="b-cmd">$ angel queue --sort deadline</span></div>
      <div class="b-tbl">
        <div class="hd">${P.pad('ID', 9)}${P.pad('SITE', 16)}${P.pad('MECHANISM', 24)} CRM     DEADLINE  ${P.pad('ASSET', 9)} ARRIVE  SLACK  ${P.pad('PAYLOAD', 26)}AUTHORITY</div>
        ${rows || '<div class="qt">no casualty is inside a deadline this system holds</div>'}
        ${rest > 0 ? `<div class="qt" style="padding-top:6px">... ${rest} row${rest === 1 ? '' : 's'} suppressed — \`queue --all\`</div>` : ''}
      </div>`;
  }

  /* ---- $ angel escalations ----------------------------------------------- */
  function escBlock(L) {
    const q = P.pending(L.A);
    const st = (L.A.stats || {});
    if (!q.length) {
      return `<div class="b-blk"><span class="b-cmd">$ angel escalations</span>
        <div class="b-esc" style="border-left-color:var(--d-line-hard)">
          <span class="q">nothing is waiting on a person.</span>
          <span class="q">        ${st.approved || 0} approved &middot; ${st.autoApproved || 0} taken under standing authority &middot; ${st.rejected || 0} rejected &middot; ${st.expired || 0} expired before a person acted</span>
        </div></div>`;
    }
    const body = q.slice(0, 3).map(p => {
      const wait = Math.max(0, L.now - p.tRaised);
      return `<span>E-${String(p.id).padStart(4, '0')}  ${esc(p.summary)} — ` +
        `${esc((p.reasons || []).join(' · ') || 'not delegable under standing authority')}</span>
        <span class="q">        deadline ${p.leadDeadline === null ? '—' : p.leadDeadline.toFixed(0) + ' min'} &middot; ` +
        `arrival T+${p.eta === null ? '—' : p.eta.toFixed(0)} &middot; responder ${esc(p.responder)} &middot; ` +
        `waiting ${wait.toFixed(0)} min and the cost of waiting is being recorded</span>
        <span class="q" style="color:var(--d-cyan-2);cursor:pointer" data-page="dec">        $ angel authorise E-${String(p.id).padStart(4, '0')} --approve|--reject</span>`;
    }).join('');
    return `<div class="b-blk"><span class="b-cmd">$ angel escalations</span>
      <div class="b-esc">${body}</div></div>`;
  }

  /* ---- $ angel compare ---------------------------------------------------
     THE DEATH RULE. Both arms are death counts and both are red. The
     difference is a death count too — it is written "fewer dead", never
     "lives saved", and it is red rather than teal because a page that paints
     it teal is a page that has turned a toll into a score. */
  function compareBlock(L) {
    if (!L.deployed) {
      return `<div class="b-blk"><span class="b-cmd">$ angel compare --baseline class-viii-push --same-inputs</span>
        <div style="margin-top:8px;font-size:12px;line-height:1.95;color:var(--d-t5)">
          ANGEL SWARM is not deployed. There is no allocation to compare.</div></div>`;
    }
    const C = window.COUNT;
    const dot = n => '.'.repeat(Math.max(3, 46 - n));
    const a = L.deadA, b = L.deadB, d = b - a;
    const sa = C ? C.sorties(L.A) : null, sb = C ? C.sorties(L.ctl) : null;
    const line = (label, val, extra) =>
      `<div>${esc(label)} ${dot(label.length)} <span class="b-neg">${val}</span>` +
      (extra ? ` <span style="color:var(--d-t6)">&middot; ${esc(extra)}</span>` : '') + '</div>';
    return `<div class="b-blk">
      <span class="b-cmd">$ angel compare --baseline class-viii-push --same-inputs</span>
      <div style="margin-top:8px;font-size:12px;line-height:1.95;color:oklch(0.84 0.006 250)">
        ${line('current triage and proximity, strongest implementation', b + ' dead of survivable wounds',
               sb === null ? '' : sb + ' sorties')}
        ${line('deadline allocation, this run', a + ' dead of survivable wounds',
               sa === null ? '' : sa + ' sorties')}
        ${line('difference', (d === 0 ? 'level' : Math.abs(d) + (d > 0 ? ' fewer dead' : ' more dead')),
               'same casualties, same aircraft, same blood')}
        <div style="color:var(--d-t6);padding-top:6px">one seed is an anecdote — the paired replication study is on
          <span class="b-id" data-page="ev">evidence</span></div>
      </div></div>`;
  }

  /* ---- $ angel explain CAS-nnn --why-this-route --------------------------
     NOT A LANGUAGE MODEL, AND SO NOT CHIPPED. `c.decision` is written by the
     allocator at the moment of tasking, out of the same arithmetic it used to
     choose, and it re-checks every airframe in the force against this one
     casualty. It is a record of a computation. The canvas puts an AI chip
     here; there is no model in this path and the chip would be a lie. */
  function explainBlock(L) {
    const pick = L.A.casualties
      .filter(c => c.decision && c.decision.t != null && c.decision.t <= L.now)
      .sort((x, y) => y.decision.t - x.decision.t)[0];
    if (!pick) {
      return `<div class="b-blk"><span class="b-cmd">$ angel explain --last</span>
        <div style="margin-top:8px;font-size:12px;color:var(--d-t5)">no tasking has been recorded yet</div></div>`;
    }
    const k = pick.decision;
    const lost = (k.candidates || []).filter(c => !c.chosen).slice(0, 3);
    return `<div class="b-blk">
      <span class="b-cmd">$ angel explain ${esc(D().casId(pick))} --why-this-route</span>
      <div class="b-why">
        <span class="d-note" style="letter-spacing:.09em">ALLOCATOR RECORD &middot; WRITTEN AT THE MOMENT OF TASKING &middot; NO MODEL WROTE THIS</span>
        <span class="t">${esc(k.call)} (${esc(k.plat)}) out of ${esc(k.base)} carrying
          ${esc(P.pay(k.payload))},
          on the ground ${k.arriveFromInjury < 10 ? k.arriveFromInjury.toFixed(1) : k.arriveFromInjury.toFixed(0)} minutes after wounding${
          k.marginMin === null ? '' : ` and ${Math.abs(k.marginMin).toFixed(0)} minutes ${k.marginMin < 0 ? 'past' : 'inside'} the deadline`}.
          Survival without it ${(k.pUntreated * 100).toFixed(0)}%, with it ${(k.pTreated * 100).toFixed(0)}% —
          the expected gain of ${(k.gain * 100).toFixed(0)} points is what won the airframe.
          ${k.stops > 1 ? `One sortie, ${k.stops} stops.` : 'Single stop.'}
          Reserve read ${k.crmUsed}${k.crmAgeMin ? `, ${k.crmAgeMin.toFixed(0)} minutes old` : ''}.
          Responder on scene ${esc(k.responder)}.</span>
        ${lost.length ? `<span class="t" style="color:var(--d-t5)">Airframes checked and not sent: ${
          lost.map(c => esc(c.call) + ' — ' + esc(String(c.verdict).toLowerCase())).join(' · ')}</span>` : ''}
      </div></div>`;
  }

  /* ---- the chain ---------------------------------------------------------- */
  function footBlock(L) {
    let v = null;
    try { v = window.verifyAudit ? window.verifyAudit(L.A) : null; } catch (e) { v = null; }
    const txt = !v ? 'chain not verifiable in this session'
      : v.ok ? `chain intact · ${v.n} entries` : `CHAIN BROKEN AT ENTRY ${v.at}`;
    return `<div class="b-foot">
      <span>every line above is reconstructable and tamper-evident &middot; \`record verify --chain\` &middot; ${esc(txt)}</span>
      <span style="color:var(--d-t3)">$ <span class="b-caret"></span></span></div>`;
  }
})();
