/* =========================================================================
   GROUPED INVENTORY PANES — casualties, aircraft, supplies, approvals.

   THE DEFECT THIS EXISTS TO CORRECT. Four panes in this application were each
   one flat table of the whole operation: two hundred wounded in one list,
   every airframe in a second, five shelves in a third, every proposal in a
   fourth. Nothing on any of them said *where*. But everything in this
   operation belongs to a launch point — an aircraft is based at one, blood
   sits on its shelf, a proposal is raised by one of its aircraft, and a
   wounded soldier is either inside the reach of one or is inside the reach of
   none. The place is the organising fact and it was the one fact the console
   would not show.

   THE SHAPE IS THE LAUNCH POINTS PAGE'S, deliberately, and IRON VEIN's behind
   that: a list of places, a place is a section, the section holds the rows
   that belong to it. One collapsible group per launch point in a stable
   order, then one honestly-named group for whatever belongs to no launch
   point. Nothing is silently dropped into a site it does not belong to, and
   nothing is dropped at all.

   WHAT IS NOT HERE, AND WHY.

   No death is attributed to a launch point. The model records who died; it
   does not record which site failed to reach them — reachN counts airframes
   across the whole force, not by site — so a per-group death count would be a
   number this file invented. Row status still says DIED, because that is a
   fact about the person and not an accusation against a place. The
   operation-wide reconciliation is printed once, from COUNT, at the foot.

   Every death, sortie and casualty total on these pages comes from COUNT.
   Where a group needs its own share of a total, it is partitioned out of the
   transactional log (arm.sortieLog carries a droneId, and an aircraft's
   baseIdx is fixed when it is built) so the parts sum to the whole the rest
   of the application prints, and the remainder is named rather than buried.

   GROUPING A CASUALTY IS DONE WITH THE ALLOCATOR'S OWN GEOMETRY, not a second
   copy of it: effectiveRadiusKm(platform, one unit of whole blood) against
   dist(), which is exactly scoreCoverage()'s test in optimizer.js narrowed to
   the aircraft of one site. A casualty goes to the site whose fastest capable
   airframe would arrive soonest, and the row says how many other sites could
   also have reached them. If that geometry is not loaded the pane says so and
   groups by nothing rather than by a radius it made up.

   This module owns one file and touches no other. It renders into the pane
   markup that is already in index.html, below the existing .paneHead, which
   it leaves alone.
   ========================================================================= */

(function () {
  'use strict';

  /* ------------------------------------------------------------ plumbing */
  /* APP, COUNT, PARAMS, PAYLOADS, STOCK_CAP, ROLES and TIERS are top-level
     `const` declarations in classic scripts: they resolve by bare name but
     are NOT properties of the global object, and a reference to one still in
     its temporal dead zone throws even under `typeof`. Hence the try/catch on
     every one. This module has to survive loading into a document where sim.js
     failed, and fail by rendering nothing rather than by taking the render
     loop down with it. */
  function theApp() {
    try { if (typeof APP !== 'undefined' && APP) return APP; } catch (e) { /* not declared */ }
    return (typeof window !== 'undefined' && window.APP) ? window.APP : null;
  }
  function theCount() {
    try { if (typeof COUNT !== 'undefined' && COUNT) return COUNT; } catch (e) { /* not declared */ }
    return (typeof window !== 'undefined' && window.COUNT) ? window.COUNT : null;
  }
  function theParams() { try { return (typeof PARAMS !== 'undefined') ? PARAMS : null; } catch (e) { return null; } }
  function thePayloads() { try { return (typeof PAYLOADS !== 'undefined') ? PAYLOADS : null; } catch (e) { return null; } }
  function theCap() { try { return (typeof STOCK_CAP !== 'undefined') ? STOCK_CAP : null; } catch (e) { return null; } }
  function theRoles() { try { return (typeof ROLES !== 'undefined') ? ROLES : null; } catch (e) { return null; } }
  function theTiers() { try { return (typeof TIERS !== 'undefined') ? TIERS : null; } catch (e) { return null; } }

  /* Function declarations DO land on the global object, so the shell's
     helpers are reachable this way — asked for rather than assumed, with a
     local fallback only where one is honest. */
  const G = k => (typeof window[k] === 'function' ? window[k] : null);
  const esc = G('esc') || (s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])));
  const fmtT = G('fmtT') || (m => 'T+' + Number(m).toFixed(0));
  const pill = G('pill') || ((t, c) => `<span class="pill ${c || ''}">${t}</span>`);

  const n0 = v => (v === null || v === undefined || !isFinite(v)) ? '—' : Math.round(v).toLocaleString();
  const n1 = v => (v === null || v === undefined || !isFinite(v)) ? '—' : Number(v).toFixed(1);
  const plural = (n, one, many) => n === 1 ? one : (many || one + 's');
  const pad = (v, n) => String(v).padStart(n, '0');

  /* CALLSIGN and PAYSHORT are top-level consts inside map.js — a rendering
     module these panes have no business depending on — so the strings are
     restated here, as optimizer.js, role-commander.js and page-launchpoints.js
     all restate them. A handful of duplicated strings is cheaper than the
     dependency, and an edit that changes them fails visibly on the next
     screenshot rather than quietly. */
  const TAIL = { HEAVY: 'TRV', LIGHT: 'M25', LONG: 'FVR' };
  const tailOf = d => (TAIL[d.type] || d.type) + '-' + pad(d.id, 2);
  const SHORT = { BLOOD: 'BLOOD', PLASMA: 'PLASMA', TXA: 'TXA', TQ_KIT: 'HEM KIT', CHEST_SEAL: 'SEAL' };
  const casId = id => 'CAS-' + pad(id, 3);

  /* The five Class VIII items, in the order every other pane shows them. */
  const ITEMS = ['BLOOD', 'PLASMA', 'TXA', 'TQ_KIT', 'CHEST_SEAL'];
  /* Destruction is recorded per site only for the items whose loss the model
     actually simulates. The rest come home and go back on the shelf, so a
     "0 destroyed" against them would answer a question nobody asked. */
  const DESTROY_TRACKED = { BLOOD: 1, PLASMA: 1 };

  /* GROUPS OPEN CLOSED. A page of nine launch points with every group
     expanded is the flat table again with headings in it — the operator
     arrives at a wall and has to scroll to find out how many groups there
     even are. Closed by default, every group states its counts on its own
     header, and the one you want is one press away.

     This set therefore holds the groups the operator has OPENED, and the
     default answer to "is this group open" is no. Held here rather than on
     APP because it is a property of these four panes and of nothing else. */
  const OPENED = { CASUALTIES: new Set(), FLEET: new Set(), SUPPLY: new Set(), TASKING: new Set() };

  /* -------------------------------------------------------------- styling */
  /* Layout and spacing only. Every colour is a token — four themes ride on
     these panes and one hard-coded hex breaks three of them — and the
     structural classes (.card, .cardHead, table.grid, .pill, .meter, .kpi,
     .mini, .chip) belong to the shell, not to this file.

     THE SPACING IS THE POINT AS MUCH AS THE GROUPING IS. The flat tables read
     as one undifferentiated mass because they were packed to the millimetre.
     Groups stand 22px apart, a group's header stands 14px clear of its first
     row, cells are 11px tall inside, sections are padded 16px. Nothing here is
     tightened to fit more rows on a screen; a commander reads this standing
     up. */
  const CSS = `
/* ---------------------------------------------- GROUPED INVENTORY PANES -- */
.gpBody{display:flex; flex-direction:column; gap:20px; min-height:0; overflow:auto; padding:2px 2px 28px}
.gpTop{display:flex; align-items:center; gap:14px; flex-wrap:wrap;
  border:1px solid var(--line); border-radius:12px; background:var(--panel); padding:14px 16px}
.gpTop .gpChips{display:flex; gap:8px; flex-wrap:wrap}
.gpTop .gpKpis{margin-left:auto; display:flex; gap:22px; flex-wrap:wrap}
.gpTop .gpKpis .kpi{background:transparent; border:none; padding:0; min-width:0; text-align:right}
.gpLede{margin:0; font:400 11px/1.65 var(--sans); color:var(--dim); max-width:72ch}
.gpLede b{color:var(--text); font-weight:600}

.gpGroups{display:flex; flex-direction:column; gap:22px}
.gpGroup{border:1px solid var(--line); border-radius:12px; background:var(--panel); padding:16px}
/* A group that holds what belongs to no launch point is a different kind of
   thing and is allowed to look like one. Never a fill, only an edge. */
.gpGroup.gpOrphan{border-color:var(--warn)}
.gpGroup.gpVoid{border-color:var(--bad)}

.gpHead{display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:16px}
.gpFold{flex:0 0 auto; width:26px; height:26px; border:1px solid var(--line); border-radius:7px;
  background:var(--panel2); color:var(--dim); font:600 14px/1 var(--mono); cursor:pointer}
.gpFold:hover{color:var(--text); border-color:var(--line2)}
.gpId{min-width:0}
.gpName{display:block; font:700 13px/1.25 var(--mono); letter-spacing:.05em; color:var(--text)}
.gpWhere{display:block; margin-top:5px; font:400 10px/1.4 var(--sans); color:var(--faint)}
.gpCounts{margin-left:auto; display:flex; gap:20px; flex-wrap:wrap; align-items:baseline}
.gpCount{text-align:right; white-space:nowrap}
.gpCount b{display:block; font:700 15px/1.1 var(--mono); color:var(--text)}
.gpCount b.warn{color:var(--warn)} .gpCount b.bad{color:var(--bad)} .gpCount b.ok{color:var(--ok)}
.gpCount span{display:block; margin-top:5px; font:600 8.5px/1.25 var(--mono);
  letter-spacing:.11em; text-transform:uppercase; color:var(--faint)}
.gpHead .mini{flex:0 0 auto}

.gpRows{overflow-x:auto}
.gpRows table.grid{width:100%}
/* Ten pixels of vertical padding was the floor; eleven is what these read
   best at with the 11.5px type the shell uses. */
.gpGroup table.grid td{padding:11px 14px; vertical-align:middle}
.gpGroup table.grid th{padding:9px 14px 11px}
.gpGroup table.grid tbody tr:last-child td{border-bottom:0}
.gpStatic tbody tr{cursor:default}
.gpStatic tbody tr:hover{background:transparent}

.gpFolded{margin:0; padding:4px 2px 2px; font:400 11px/1.55 var(--sans); color:var(--faint)}
.gpNote{margin:0; padding:14px 16px; font:400 11px/1.7 var(--sans); color:var(--dim);
  border:1px solid var(--line); border-radius:12px; background:var(--panel)}
.gpNote b{color:var(--text); font-weight:600}
.gpNote + .gpNote{margin-top:-8px}
/* The caveats live inside the shared .disc now (css injected by
   js/page-kpi.js). Inside it they are already one press away, so they drop
   the panel chrome and read as the paragraphs they are. */
.gpDisc{margin-top:16px}
.gpDisc .gpNote{padding:0; border:0; background:none; border-radius:0}
.gpDisc .gpNote + .gpNote{margin-top:9px}
.gpUnk{font:400 10.5px/1.35 var(--sans); color:var(--faint)}
.gpSub{display:block; margin-top:4px; font:400 9.5px/1.35 var(--sans); color:var(--faint)}
.gpStack{display:flex; align-items:center; gap:8px; white-space:nowrap}
.gpLink{color:var(--angel); cursor:pointer; font-family:var(--mono); text-decoration:none}
.gpLink:hover{text-decoration:underline}
.gpEmpty{padding:22px 4px; font:400 11px/1.6 var(--sans); color:var(--faint)}

/* THE SURGEON'S FOLD. role-surgeon reduces the casualty pane to a worklist
   and keeps the full register one control away — a rule keyed on .tableWrap,
   which is the element this file replaced. Restating it here against this
   file's own container keeps that fold working without editing a stylesheet
   this file does not own. It applies only where the surgeon's worklist
   actually rendered, so a profile set with role-surgeon absent is left with
   the register rather than with nothing. */
body[data-role-profile="SURGEON"] [data-pane="CASUALTIES"]:not(.sgOpen) > .pane:has(#sgCas .card) > .gpBody{
  display:none !important;
}
body[data-role-profile="SURGEON"] [data-pane="CASUALTIES"].sgOpen > .pane > .gpBody{
  flex:1 1 auto; min-height:260px;
}

/* The charts kept from the old supply pane. They sit under the groups
   because they are about the operation, not about one shelf. */
.gpCharts{display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:start}
@media (max-width:1080px){ .gpCharts{grid-template-columns:1fr} }
.gpCharts .chart{width:100%; height:180px; display:block}
`;

  function injectCSS() {
    if (document.getElementById('gpCss')) return;
    const s = document.createElement('style');
    s.id = 'gpCss'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* Write only when the markup actually changed. These panes are rebuilt at
     the shell's 3 Hz cadence and replacing identical HTML would move a row
     out from under the operator's cursor for nothing. */
  function paint(el, html) {
    if (!el) return false;
    if (el._gpH === html) return false;
    el._gpH = html; el.innerHTML = html;
    return true;
  }
  /* The KPI chips that live inside .paneHead belong to index.html and stay
     where they are; the built-in renderer that used to feed them no longer
     runs, so this file feeds them instead. */
  function setNum(id, v) {
    const el = document.getElementById(id);
    if (el && el.textContent !== String(v)) el.textContent = String(v);
  }

  /* THE ROLE PROFILES HOOK THE SHELL'S RENDERERS, NOT THE VIEW REGISTRY.
     role-commander, role-surgeon and role-logistician each wrap the global
     renderCasualties / renderFleet / renderSupply / renderTasking and mount
     their own cards from inside that wrapper. A registered view takes the
     frame instead of the built-in renderer, so those wrappers stopped firing
     the moment this file loaded, and a commander's tasking line went blank
     rather than wrong — which is worse, because blank looks deliberate.

     So the shell renderer is still called, once per tick, before this file
     paints. Its own output goes nowhere: setHTML and setText both no-op on a
     missing element, and every id it writes to left with the flat table
     except #policyBox and the two supply canvases, which this page re-creates
     on purpose so the shell keeps owning what it drew. Calling it first also
     means that on the first tick the role modules mount against the anchors
     that are still in the document, so their cards end up above this body
     rather than under it. */
  let inShell = false;
  function keepRoleChrome(name) {
    const fn = G(name);
    if (!fn || inShell) return;
    inShell = true;
    try { fn(); } catch (err) { console.warn(name + ' (role chrome)', err); }
    finally { inShell = false; }
  }

  /* The one mount point per pane. The flat table this file replaces is taken
     out once, the first time the pane is rendered, and thereafter this file
     owns its own container and nothing else in the document. If a pane has no
     .paneHead — someone is mid-edit in index.html — this renders nothing
     rather than guessing which children were safe to destroy.

     Anything carrying data-roles was mounted by a role profile
     (role-commander, role-surgeon, role-logistician), belongs to that module
     and is left exactly where it is. Those modules rebuild by id every tick,
     so destroying their nodes would work; leaving them alone is the version
     that does not flicker. */
  function host(view) {
    const sec = document.querySelector('[data-pane="' + view + '"]');
    if (!sec) return null;
    const pane = sec.querySelector('.pane') || sec;
    let h = pane.querySelector(':scope > .gpBody');
    if (h) return h;
    const head = pane.querySelector(':scope > .paneHead');
    if (!head) return null;
    let n = head.nextSibling;
    while (n) {
      const nx = n.nextSibling;
      const keep = n.nodeType === 1 && n.hasAttribute && n.hasAttribute('data-roles');
      if (!keep) pane.removeChild(n);
      n = nx;
    }
    h = document.createElement('div');
    h.className = 'gpBody';
    pane.appendChild(h);
    return h;
  }

  /* ----------------------------------------------------------- the facts */

  /* The reach model, or null. Both halves of the allocator's own test have to
     be present: the radius function, which knows combat radius is quoted at
     full payload and grows as the load falls, and the mass of the thing being
     carried — one unit of whole blood in its container, read from PAYLOADS so
     the two cannot drift apart. */
  function reachModel() {
    const eff = G('effectiveRadiusKm'), dist = G('dist'), P = thePayloads();
    if (!eff || !dist || !P || !P.BLOOD) return null;
    return {
      km: plat => eff(plat, P.BLOOD.kg),
      dist: dist,
      expected: G('expectedFlightMinutes')
    };
  }

  /* Everything the four pages read, gathered once so they cannot disagree
     with each other about what is on the ground. */
  function survey() {
    const APP = theApp();
    if (!APP || !APP.armA || !APP.world || !APP.world.scn) return null;
    const A = APP.armA;
    if (!A.bases || !A.bases.length) return null;

    const C = theCount();
    const now = APP.tView;
    const RM = reachModel();
    const scn = APP.world.scn;

    /* An aircraft's baseIdx is fixed at the moment it is built and never
       reassigned, so this partitions the fleet exactly. An airframe whose
       baseIdx matches no base on this list is not dropped — it is collected
       below and shown in its own group. */
    const claimed = new Set();
    const sites = A.bases.map((b, i) => {
      const idx = (b._idx === undefined ? i : b._idx);
      const scnB = scn.bases ? scn.bases[idx] : null;
      const mine = (A.drones || []).filter(d => d.baseIdx === idx);
      mine.forEach(d => claimed.add(d.id));
      const ids = new Set(mine.map(d => d.id));
      return {
        i: idx, b, scnB, drones: mine, ids,
        ready: mine.filter(d => d.state === 'IDLE' && !d.held).length,
        air: mine.filter(d => d.state === 'OUTBOUND' || d.state === 'RETURNING').length,
        lost: mine.filter(d => d.state === 'LOST').length,
        held: mine.filter(d => d.held).length,
        sorties: (A.sortieLog || []).filter(r => ids.has(r.droneId)).length
      };
    });
    const strays = (A.drones || []).filter(d => !claimed.has(d.id));

    return { APP, A, B: APP.armB || null, C, now, sites, strays, RM, scn, cap: theCap(), P: theParams() };
  }

  /* Which launch point would reach this casualty soonest, and how many could
     reach them at all. The test is the allocator's: an aircraft based here can
     fly to the position and get home carrying a unit of whole blood. The time
     is the one-way transit of the fastest airframe at that site that passes
     the test — a fact about the geometry and the platform, not a promise about
     a sortie that has not been planned. */
  function placeCasualty(S, c) {
    if (!S.RM) return { site: null, min: null, n: null };
    let best = null, bestT = Infinity, n = 0;
    for (const s of S.sites) {
      const dd = S.RM.dist(s.b.x, s.b.y, c.x, c.y);
      let t = Infinity;
      for (const d of s.drones) {
        if (d.state === 'LOST') continue;              // it is not going anywhere
        if (dd <= S.RM.km(d.plat)) {
          const leg = S.RM.expected
            ? S.RM.expected(S.A, d, s.b.x, s.b.y, c.x, c.y)
            : (dd / d.plat.speedKmh) * 60;
          t = Math.min(t, leg);
        }
      }
      if (t < Infinity) { n++; if (t < bestT) { bestT = t; best = s; } }
    }
    return { site: best, min: best ? bestT : null, n: n };
  }

  /* -------------------------------------------------------------- pieces */

  function meter(n, capN, cls) {
    if (capN === null || capN === undefined || !isFinite(capN) || capN <= 0) return '';
    const w = Math.max(0, Math.min(100, (n / capN) * 100));
    return `<span class="meter sm"><i class="${cls}" style="width:${w.toFixed(0)}%"></i></span>`;
  }

  function sitingPill(s) {
    /* The scenario is the only thing that knows whether a site is a ship or a
       patch of ground. Where it does not say, this does not guess. */
    if (!s.scnB) return '<span class="gpUnk">siting not recorded</span>';
    return s.scnB.afloat ? pill('AFLOAT', 'info') : pill('ASHORE', '');
  }

  function counts(list) {
    return list.filter(Boolean).map(c =>
      `<div class="gpCount"><b${c.cls ? ' class="' + c.cls + '"' : ''}>${c.v}</b><span>${esc(c.k)}</span></div>`
    ).join('');
  }

  function openLp(i) {
    /* data-goto is the delegated route app.js binds for renderer-created
       cross-links; data-lpopen is this file's own, and selects the site once
       the launch points pane has drawn itself. */
    return `<button class="mini" data-goto="LAUNCHPOINTS" data-lpopen="${i}">Open launch point →</button>`;
  }

  function group(view, key, o) {
    const folded = !OPENED[view].has(key);
    const cls = 'gpGroup' + (o.orphan ? ' gpOrphan' : '') + (o.void ? ' gpVoid' : '');
    return `<section class="${cls}">
      <header class="gpHead">
        <button class="gpFold" data-gpfold="${view}:${esc(key)}" aria-expanded="${folded ? 'false' : 'true'}"
          title="${folded ? 'Show these rows' : 'Hide these rows'}">${folded ? '+' : '−'}</button>
        <div class="gpId"><span class="gpName">${esc(o.name)}</span>${
          o.sub ? `<span class="gpWhere">${o.sub}</span>` : ''}</div>
        ${o.pill || ''}
        <div class="gpCounts">${o.counts || ''}</div>
        ${o.open || ''}
      </header>
      ${folded
        ? `<p class="gpFolded">${o.folded || 'Collapsed.'}</p>`
        : `<div class="gpRows">${o.body}</div>`}
    </section>`;
  }

  /* ========================= THE RECORD DETAIL =========================
     The four panes stopped handing a selection to the inspector rail. A row
     is now the handle for its own record, and the record opens beneath it in
     the main column with tabs across the top — js/detail.js owns the shape,
     the keyboard and the ARIA; this section owns what goes inside, which for
     these four lists is figures, compact tables and status lines.

     NOTHING HERE INVENTS A FIGURE. Where the model does not record something
     the field is omitted rather than estimated: detail.figs() drops any item
     whose value is null, which is why so many of these read `x ? y : null`
     rather than `x ? y : '—'`. A dash is a claim that the field exists and
     is empty; an omission is the truth. */

  const DT = () => {
    const A = window.ANGEL;
    if (!A) return null;
    return (typeof A.get === 'function' ? A.get('detail') : null) || A.detail || null;
  };
  /* Widths are measured after the pane has painted, not guessed while it is
     being built. */
  function dtSync() {
    const D = DT(); if (!D) return;
    requestAnimationFrame(() => { try { D.sync(); } catch (e) { /* nothing to do */ } });
  }
  /* The handle attributes, or nothing at all if js/detail.js is not loaded —
     in which case the rows stay rows and the pane still draws. */
  function dtRow(view, id) { const D = DT(); return D ? D.rowAttrs(view, id) : ''; }

  const T_PLUS = t => (t === null || t === undefined || !isFinite(t)) ? null : esc(fmtT(t));
  const MIN = v => (v === null || v === undefined || !isFinite(v)) ? null : n0(v) + ' <small>min</small>';

  /* Who signed for a sortie. launch() stamps every sortie with the actor that
     released it — a person, or the standing authorisation — so this is read
     rather than reconstructed. */
  function sortieRec(S, id) {
    if (id === null || id === undefined) return null;
    return (S.A.sortieLog || []).find(r => r.id === id) || null;
  }

  /* ------------------------------------------------------ 1 · CASUALTY */

  function casDetail(S, c, place, colspan) {
    const D = DT(); if (!D || !D.isOpen('CASUALTIES', c.id)) return '';
    const R = theRoles(), T = theTiers(), P = S.P, PL = thePayloads();
    const now = S.now;
    const crm = (typeof c.crmAt === 'function') ? c.crmAt(now) : null;
    const since = now - c.tInjury;
    const timed = c.deadlineMin < 9000;
    const left = timed ? Math.max(0, c.deadlineMin - since) : null;
    let rc = ''; if (crm !== null && P) rc = crm < P.CRM_RED ? 'bad' : crm < P.CRM_YELLOW ? 'warn' : 'ok';

    const drone = c.assignedTo != null ? (S.A.drones || []).find(d => d.id === c.assignedTo) : null;
    const leg = drone && drone.route ? drone.route.find(l => l.casId === c.id) : null;
    const deliv = (S.A.deliveryLog || []).filter(r => r.casId === c.id);
    const props = (S.A.queue || []).filter(p => (p.route || []).some(l => l.casId === c.id));

    const st = c.outcome === 'SAVED' ? pill('SURVIVED', 'ok')
      : c.outcome === 'DIED' ? pill('DIED', 'bad')
      : c.treated ? pill('TREATED', 'ok')
      : c.assignedTo ? pill('TASKED', 'info') : pill('AWAITING', 'warn');

    /* --- who and where ------------------------------------------------ */
    const build_record = () =>
      D.group('WHO', 'cas.who', D.figs([
        { k: 'record', v: esc(casId(c.id)) },
        { k: 'duty role', v: R && R[c.role] ? esc(R[c.role].label) : null },
        { k: 'unit', v: c.unitName ? esc(c.unitName) : null },
        { k: 'triage', v: esc(c.cls), cls: c.cls === 'IMMEDIATE' ? 'bad' : c.cls === 'DELAYED' ? 'warn' : 'dim' },
        { k: 'injury', v: esc(String(c.injury || '').replace(/_/g, ' ').toLowerCase()) },
        { k: 'responder on scene', v: T && T[c.responder] ? esc(T[c.responder].name) : null,
          note: T && T[c.responder] ? esc(T[c.responder].training) + ' of training' : null }
      ])) +
      D.group('WHERE', 'cas.where', D.figs([
        { k: 'east', v: n1(c.x) + ' <small>km</small>' },
        { k: 'south', v: n1(c.y) + ' <small>km</small>', note: 'from the area’s north-west corner' },
        { k: 'nearest launch point', v: place && place.site ? esc(place.site.b.name) : null },
        { k: 'one way at cruise', v: place && place.min !== null ? MIN(place.min) : null,
          note: place && place.n > 1 ? 'also inside the reach of ' + n0(place.n - 1) + ' other' : null },
        { k: 'aircraft in range', v: c.reachN === undefined ? null : n0(c.reachN),
          cls: c.reachN === 0 ? 'bad' : c.reachN === 1 ? 'warn' : 'ok' }
      ])) +
      (place && !place.site && S.RM
        ? D.status('OUT OF REACH — no aircraft at any launch point can fly here and get home carrying blood.', 'bad')
        : D.status('SOONEST REACH · ' + (place && place.site ? esc(place.site.b.name) : 'not scored'), 'info'));

    /* --- the clock ---------------------------------------------------- */
    const build_clock = () =>
      D.group('THE PHYSIOLOGICAL CLOCK', 'cas.clock', D.figs([
        { k: 'wounded at', v: T_PLUS(c.tInjury) },
        { k: 'on the ground', v: MIN(since) },
        { k: 'compensatory reserve', v: crm === null ? null : Math.round(crm) + '<small>%</small>',
          cls: rc, meter: D.meter(crm, rc) },
        { k: 'collapse in', v: timed ? MIN(left) : 'not time-critical',
          cls: timed && left <= 10 ? 'bad' : timed && left <= 20 ? 'warn' : 'dim',
          note: timed ? 'reserve runs out ' + n0(c.deadlineMin) + ' min after wounding' : null },
        { k: 'treated at', v: c.treated ? T_PLUS(c.tTreated) : null,
          note: c.treatedWith && PL && PL[c.treatedWith] ? esc(PL[c.treatedWith].label) : null },
        { k: 'outcome', v: c.outcome ? esc(c.outcome === 'SAVED' ? 'SURVIVED' : c.outcome) : null,
          cls: c.outcome === 'DIED' ? 'bad' : c.outcome ? 'ok' : 'dim' }
      ])) +
      (c.outcome === 'DIED'
        ? D.status('DIED OF WOUNDS · ONE MORE DEAD, AND THE TARGET IS ZERO', 'bad')
        : !timed ? D.status('MINIMAL — no physiological deadline is modelled for this casualty.', '')
        : D.status('CLOCK RUNNING · ' + n0(left) + ' MIN OF RESERVE LEFT', left <= 10 ? 'bad' : 'warn'));

    /* --- what they need ----------------------------------------------- */
    const build_needs = () => {
      const can = G('capabilitiesAt') ? G('capabilitiesAt')(c, S.A.telementor) : (T && T[c.responder] ? T[c.responder].can : []);
      const rows = (c.needs || []).map((k, i) => {
        const p = PL ? PL[k] : null;
        const onScene = can.indexOf(k) >= 0;
        const shelf = place && place.site && place.site.b.stock ? place.site.b.stock[k] : null;
        return [
          `<b class="mono">${esc(String(i + 1))}</b>`,
          `${p ? esc(p.label) : esc(k)}<span class="gpSub">${esc(SHORT[k] || k)}</span>`,
          p ? `<span class="mono">${n1(p.kg)} kg</span>` : '<span class="gpUnk">not recorded</span>',
          onScene ? pill('CAN GIVE IT', 'ok') : pill('CANNOT GIVE IT', 'warn'),
          shelf === null || shelf === undefined ? '<span class="gpUnk">shelf not read</span>'
            : `<b class="mono${shelf <= 1 ? ' warn' : ''}">${n0(shelf)}</b>`
        ];
      });
      return D.group('INTERVENTIONS THAT HELP, IN ORDER OF EFFECT', 'cas.needs',
        D.table([
          { h: '#', w: '48px' }, { h: 'Item', w: '220px' }, { h: 'Mass', w: '110px' },
          { h: 'Responder on scene', w: '190px', sub: 'with what is on them now' },
          { h: 'On the nearest shelf', w: '180px', sub: 'units held forward' }
        ], rows) || D.empty('No intervention is recorded against this record.')) +
        D.status(can.indexOf((c.needs || [])[0]) >= 0
          ? 'FIRST-LINE ITEM CAN BE ADMINISTERED ON SCENE ONCE IT ARRIVES'
          : 'FIRST-LINE ITEM IS ABOVE THE RESPONDER’S SCOPE — TELEMENTORING OR A MEDIC IS NEEDED',
          can.indexOf((c.needs || [])[0]) >= 0 ? 'ok' : 'warn');
    };

    /* --- what is coming, and who released it -------------------------- */
    const build_resp = () => {
      const eta = leg && leg.eta !== undefined ? leg.eta : (drone ? drone.tArrive : null);
      const inbound = D.group('WHAT IS COMING', 'cas.inbound', D.figs([
        { k: 'aircraft', v: drone ? esc(tailOf(drone)) : null, note: drone ? esc(drone.plat.label) : null },
        { k: 'state', v: drone ? esc(drone.state) : null, cls: drone && drone.state === 'LOST' ? 'bad' : 'dim' },
        { k: 'carrying for this record', v: leg && PL && PL[leg.payloadKey] ? esc(PL[leg.payloadKey].label) : null },
        { k: 'on station', v: T_PLUS(eta), cls: 'ok' },
        { k: 'from', v: drone ? esc(drone.baseName) : null }
      ]) || D.empty('Nothing is assigned to this record.'));

      const dl = deliv.slice(-8).map(r => [
        `<span class="mono">${esc(fmtT(r.t))}</span>`,
        PL && PL[r.payload] ? esc(PL[r.payload].label) : esc(r.payload),
        r.ok ? pill('ADMINISTERED', 'ok') : pill('WASTED', 'bad'),
        `<span class="mono">${n0(r.delay)} min</span>`,
        r.coldC === null || r.coldC === undefined ? '<span class="gpUnk">not carried cold</span>'
          : `<span class="mono">${n1(r.coldC)} °C</span>`,
        (() => { const s = sortieRec(S, r.sortieId); return s ? `<span class="mono">${esc(s.actor)}</span>`
          : '<span class="gpUnk">sortie not in the log</span>'; })()
      ]);
      const auth = D.group('WHAT ARRIVED, AND WHO RELEASED IT', 'cas.authority',
        D.table([
          { h: 'At', w: '80px' }, { h: 'Item', w: '200px' }, { h: 'Outcome', w: '150px' },
          { h: 'Delay', w: '100px', sub: 'from wounding' }, { h: 'Container', w: '130px' },
          { h: 'Released by', w: '200px', sub: 'person or standing authority' }
        ], dl) || D.empty('Nothing has reached this record yet.'));

      const pend = props.filter(p => p.state === 'PENDING').length;
      return inbound + auth +
        (pend ? D.status(n0(pend) + ' PROPOSAL' + (pend === 1 ? '' : 'S') + ' FOR THIS RECORD IS WAITING ON A PERSON', 'warn')
          : props.length ? D.status(n0(props.length) + ' PROPOSAL' + (props.length === 1 ? '' : 'S') +
              ' RAISED FOR THIS RECORD · NONE WAITING ON YOU', '')
          : D.status('NO PROPOSAL HAS BEEN RAISED FOR THIS RECORD', ''));
    };

    return D.region('CASUALTIES', c.id, colspan, {
      title: esc(casId(c.id)),
      sub: [R && R[c.role] ? R[c.role].label : null, c.unitName || null,
            String(c.injury || '').replace(/_/g, ' ').toLowerCase()].filter(Boolean).map(esc).join(' · '),
      badges: pill(c.cls, c.cls === 'IMMEDIATE' ? 'bad' : c.cls === 'DELAYED' ? 'warn' : '') + st +
        (c.hva ? pill('HIGH VALUE', 'warn') : ''),
      tone: c.outcome === 'DIED' ? 'bad' : (timed && left !== null && left <= 10 && !c.treated) ? 'warn' : '',
      tabs: [
        { k: 'REC', label: 'RECORD', build: build_record },
        { k: 'CLK', label: 'CLOCK', build: build_clock },
        { k: 'NED', label: 'WHAT THEY NEED', count: (c.needs || []).length, build: build_needs },
        { k: 'RSP', label: 'RESPONSE', count: deliv.length, build: build_resp }
      ],
      notes: [
        'Every figure is read from the run. Reach is a fact about the laydown, not a promise about a sortie.',
        'The target is zero dead. Every number on this record is one person.'
      ]
    });
  }

  /* ------------------------------------------------------ 2 · AIRCRAFT */

  function acDetail(S, d, colspan) {
    const D = DT(); if (!D || !D.isOpen('FLEET', d.id)) return '';
    const P = S.P, PL = thePayloads();
    const eff = G('effectiveRadiusKm');
    const loadKg = Object.entries(d.manifest || {})
      .reduce((n, [k, q]) => n + (PL && PL[k] ? PL[k].kg * q : 0), 0);
    const aboard = Object.values(d.manifest || {}).reduce((n, q) => n + q, 0);
    const reach = eff ? eff(d.plat, loadKg) : null;
    const hasBlood = !!(d.manifest && d.manifest.BLOOD);
    let coldCls = 'dim';
    if (hasBlood && P) coldCls = d.coldC > P.COLD_MAX_C ? 'bad' : d.coldC > P.COLD_MAX_C - 2 ? 'warn' : 'ok';
    const logs = (S.A.sortieLog || []).filter(r => r.droneId === d.id).slice(-8).reverse();

    const build_air = () =>
      D.group('AIRFRAME', 'ac.air', D.figs([
        { k: 'tail', v: esc(tailOf(d)) },
        { k: 'platform', v: esc(d.plat.label) },
        { k: 'state', v: d.held ? 'HELD' : d.state === 'IDLE' ? 'READY' : esc(d.state),
          cls: d.state === 'LOST' ? 'bad' : d.held ? 'warn' : d.state === 'IDLE' ? 'dim' : 'ok' },
        { k: 'launch point', v: esc(d.baseName || '') },
        { k: 'cruise', v: n0(d.plat.speedKmh) + ' <small>km/h</small>' },
        { k: 'reach at this load', v: reach === null ? null : n0(reach) + ' <small>km</small>',
          note: 'radius is quoted at full payload and grows as the load falls' },
        { k: 'slots', v: n0(d.plat.slots), note: n1(d.plat.payloadKg) + ' kg capacity' }
      ])) +
      D.group('COLD CHAIN', 'ac.cold', D.figs([
        { k: 'container', v: d.state === 'LOST' ? null : n1(d.coldC) + ' <small>°C</small>', cls: coldCls,
          note: hasBlood && P ? (d.coldC > P.COLD_MAX_C ? 'outside the transfusable band' : 'inside the transfusable band')
            : 'holding cold, nothing aboard' },
        { k: 'ceiling', v: P ? n1(P.COLD_MAX_C) + ' <small>°C</small>' : null }
      ])) +
      (d.state === 'LOST' ? D.status('AIRFRAME LOST — it is not going anywhere and reports nothing.', 'bad')
        : d.held ? D.status('HELD BY THE OPERATOR — the allocator is routing around it.', 'warn')
        : d.state === 'IDLE' ? D.status('READY TO LAUNCH', 'ok')
        : D.status('AIRBORNE · ' + esc(d.state), 'info'));

    const build_man = () => {
      const keys = ITEMS.filter(k => (d.manifest && d.manifest[k]) || (d.cumulative && d.cumulative[k]));
      const rows = keys.map(k => [
        `${PL && PL[k] ? esc(PL[k].label) : esc(k)}<span class="gpSub">${esc(SHORT[k] || k)}</span>`,
        `<b class="mono${d.manifest && d.manifest[k] ? ' ok' : ''}">${n0((d.manifest && d.manifest[k]) || 0)}</b>`,
        `<span class="mono dim">${n0((d.cumulative && d.cumulative[k]) || 0)}</span>`,
        PL && PL[k] ? `<span class="mono">${n1(PL[k].kg)} kg</span>` : '<span class="gpUnk">not recorded</span>',
        PL && PL[k] ? (PL[k].coldChain ? pill('COLD CHAIN', 'info') : pill('AMBIENT', '')) : ''
      ]);
      return D.group('WHAT IT IS CARRYING', 'ac.manifest', D.figs([
        { k: 'units aboard', v: n0(aboard), cls: aboard ? 'ok' : 'dim' },
        { k: 'mass aboard', v: n1(loadKg) + ' <small>kg</small>' },
        { k: 'of capacity', v: d.plat.payloadKg ? n0((loadKg / d.plat.payloadKg) * 100) + '<small>%</small>' : null,
          meter: D.meter(d.plat.payloadKg ? (loadKg / d.plat.payloadKg) * 100 : null, 'ok') }
      ])) +
        D.group('BY LINE', 'ac.lines', D.table([
          { h: 'Item', w: '220px' }, { h: 'Aboard now', w: '130px' },
          { h: 'Flown to date', w: '140px' }, { h: 'Mass each', w: '120px' }, { h: 'Handling', w: '150px' }
        ], rows) || D.empty('The bay is clear and nothing has been flown by this airframe yet.'));
    };

    const build_task = () => {
      const legs = (d.route || []).map((l, i) => {
        const c = (S.A.casualties || []).find(k => k.id === l.casId);
        return [
          `<b class="mono">${esc(String(i + 1))}</b>${i === d.legIdx ? ' ' + pill('NEXT', 'info') : ''}`,
          `<span class="mono">${esc(casId(l.casId))}</span>`,
          c ? esc(String(c.injury || '').replace(/_/g, ' ').toLowerCase()) : '<span class="gpUnk">record not held</span>',
          c ? pill(c.cls, c.cls === 'IMMEDIATE' ? 'bad' : c.cls === 'DELAYED' ? 'warn' : '') : '',
          PL && PL[l.payloadKey] ? esc(PL[l.payloadKey].label) : esc(l.payloadKey),
          l.eta === undefined || l.eta === null ? '<span class="gpUnk">not planned</span>'
            : `<span class="mono">${esc(fmtT(l.eta))}</span>`
        ];
      });
      /* The clock fields on an airframe are stamped by the sortie it is
         flying and are not cleared when it lands, so they are only shown
         while it is actually out. Printing the last sortie's times against a
         drone on the pad would be a figure about nothing. */
      const flying = d.state === 'OUTBOUND' || d.state === 'RETURNING';
      return D.group('THE SORTIE IN HAND', 'ac.task', D.figs([
        { k: 'stops', v: (d.route || []).length ? n0(d.route.length) : null },
        { k: 'on station', v: flying ? T_PLUS(d.tArrive) : null },
        { k: 'home', v: flying ? T_PLUS(d.tHome) : null },
        { k: 'departed', v: flying ? T_PLUS(d.tDepart) : null }
      ])) +
        D.table([
          { h: 'Leg', w: '110px' }, { h: 'Record', w: '110px' }, { h: 'Injury', w: '190px' },
          { h: 'Triage', w: '120px' }, { h: 'Payload', w: '200px' }, { h: 'On station', w: '110px' }
        ], legs) +
        (legs.length ? '' : D.empty('No route is planned for this airframe.')) +
        (d.held ? D.status('HELD — no route will be planned until it is released.', 'warn')
          : legs.length ? D.status('ROUTED · ' + n0(legs.length) + ' STOP' + (legs.length === 1 ? '' : 'S'), 'ok')
          : D.status('AWAITING TASKING', ''));
    };

    const build_rec = () => {
      const rows = logs.map(r => [
        `<span class="mono">${esc(String(r.id))}</span>`,
        `<span class="mono">${esc(fmtT(r.tLaunch))}</span>`,
        r.tReturn === null || r.tReturn === undefined ? pill('OUT', 'info') : `<span class="mono">${esc(fmtT(r.tReturn))}</span>`,
        `<span class="mono">${n0(r.stops)}</span>`,
        `<span class="mono">${esc(r.actor)}</span>`,
        r.proposalId === null || r.proposalId === undefined ? '<span class="gpUnk">no escalation</span>'
          : `<span class="mono">PROP-${esc(pad(r.proposalId, 3))}</span>`
      ]);
      return D.group('RECORD', 'ac.record', D.figs([
        { k: 'sorties', v: n0(d.sorties) },
        { k: 'units delivered', v: n0(d.delivered), cls: d.delivered ? 'ok' : 'dim' },
        { k: 'sorties wasted', v: n0(d.wasted), cls: d.wasted ? 'warn' : 'dim',
          note: 'flown, and reached nobody it could help' }
      ])) +
        D.group('LAST SORTIES, MOST RECENT FIRST', 'ac.log', D.table([
          { h: 'Sortie', w: '90px' }, { h: 'Launched', w: '110px' }, { h: 'Home', w: '110px' },
          { h: 'Stops', w: '90px' }, { h: 'Released by', w: '210px' }, { h: 'Escalation', w: '150px' }
        ], rows) || D.empty('This airframe has not flown.'));
    };

    return D.region('FLEET', d.id, colspan, {
      title: esc(tailOf(d)),
      sub: [d.plat.label, d.baseName].filter(Boolean).map(esc).join(' · '),
      badges: (d.state === 'LOST' ? pill('LOST', 'bad') : d.held ? pill('HELD', 'warn')
        : d.state === 'IDLE' ? pill('READY', '') : pill(d.state, 'info')) +
        (aboard ? pill(n0(aboard) + ' ABOARD', 'ok') : pill('BAY CLEAR', '')),
      acts: d.state === 'LOST' ? '' :
        `<button class="mini" data-hold="${d.id}">${d.held ? 'Release' : 'Hold'}</button>`,
      tone: d.state === 'LOST' ? 'bad' : d.held ? 'warn' : '',
      tabs: [
        { k: 'AIR', label: 'AIRFRAME', build: build_air },
        { k: 'MAN', label: 'MANIFEST', count: aboard, build: build_man },
        { k: 'TSK', label: 'NEXT TASK', count: (d.route || []).length, build: build_task },
        { k: 'REC', label: 'RECORD', count: d.sorties, build: build_rec }
      ],
      notes: ['A container only warms while it is out; an airframe on the pad holds at its loading temperature.']
    });
  }

  /* -------------------------------------------------------- 3 · SHELF */

  function supDetail(S, s, k, colspan) {
    const D = DT(); const key = s.i + '-' + k;
    if (!D || !D.isOpen('SUPPLY', key)) return '';
    const PL = thePayloads(), cap = S.cap, T = theTiers();
    const b = s.b, cb = S.B && S.B.bases ? S.B.bases[s.i] : null;
    const p = PL ? PL[k] : null;
    const on = b.stock && b.stock[k] !== undefined ? b.stock[k] : null;
    const spent = b.spent && b.spent[k] !== undefined ? b.spent[k] : null;
    const de = DESTROY_TRACKED[k] && b.wastedUnits ? (b.wastedUnits[k] || 0) : null;
    const capN = cap ? cap[k] : null;
    const moves = (S.A.stockLog || []).filter(r => r.baseIdx === s.i && r.item === k).slice(-12).reverse();
    const low = (k === 'BLOOD' || k === 'PLASMA') && on !== null && on <= 1;

    const build_shelf = () =>
      D.group('ON THIS SHELF', 'sup.shelf', D.figs([
        { k: 'held here now', v: on === null ? null : n0(on), cls: low ? 'warn' : 'ok',
          meter: D.meter(capN ? (on / capN) * 100 : null, low ? 'warn' : 'ok') },
        { k: 'shelf capacity', v: capN === null ? null : n0(capN) },
        { k: 'issued from here', v: spent === null ? null : n0(spent), note: 'put on an aircraft at this launch point' },
        { k: 'destroyed', v: de === null ? null : n0(de), cls: de ? 'warn' : 'dim',
          note: de === null ? null : 'spent, and reached nobody' },
        { k: 'current triage and proximity', v: cb && cb.stock && cb.stock[k] !== undefined ? n0(cb.stock[k]) : null,
          cls: 'dim', note: 'the control arm’s same shelf' }
      ])) +
      (low ? D.status('ONE UNIT LEFT — the next transfusion here is the last without a resupply run.', 'warn')
        : on === 0 ? D.status('STOCKED OUT AT THIS LAUNCH POINT', 'bad')
        : D.status('SHELF HOLDING · ' + (on === null ? 'not read' : n0(on) + ' UNITS'), 'ok'));

    const build_hand = () => {
      const tiers = T ? Object.keys(T).filter(t => T[t].can.indexOf(k) >= 0) : [];
      return D.group('HANDLING', 'sup.handling', D.figs([
        { k: 'mass each', v: p ? n1(p.kg) + ' <small>kg</small>' : null },
        { k: 'cold chain', v: p ? (p.coldChain ? 'REQUIRED' : 'NONE') : null,
          cls: p && p.coldChain ? 'info' : 'dim' },
        { k: 'lowest scope that can give it', v: tiers.length && T ? esc(T[tiers[0]].name) : null,
          note: tiers.length && T ? esc(T[tiers[0]].training) + ' of training' : null }
      ])) +
        (p && p.note ? D.status(esc(p.note), 'info') : '');
    };

    const build_move = () => {
      const rows = moves.map(r => [
        `<span class="mono">${esc(fmtT(r.t))}</span>`,
        `<b class="mono ${r.delta < 0 ? 'warn' : 'ok'}">${r.delta > 0 ? '+' : '−'}${n0(Math.abs(r.delta))}</b>`,
        esc(r.reason)
      ]);
      return D.group('MOVEMENT ON THIS SHELF, MOST RECENT FIRST', 'sup.move',
        D.table([{ h: 'At', w: '110px' }, { h: 'Change', w: '120px' }, { h: 'Reason', w: '320px' }], rows) ||
        D.empty('Nothing has moved on or off this shelf in this run.'));
    };

    return D.region('SUPPLY', key, colspan, {
      title: p ? esc(p.label) : esc(k.replace(/_/g, ' ')),
      sub: esc(b.name) + ' · Class VIII held forward',
      badges: (p && p.coldChain ? pill('COLD CHAIN', 'info') : pill('AMBIENT', '')) +
        (low ? pill('ONE UNIT LEFT', 'warn') : ''),
      tone: low || on === 0 ? 'warn' : '',
      tabs: [
        { k: 'SHF', label: 'SHELF', build: build_shelf },
        { k: 'HND', label: 'HANDLING', build: build_hand },
        { k: 'MOV', label: 'MOVEMENT', count: moves.length, build: build_move }
      ],
      notes: ['Destruction is recorded only for the cold-chain items; anything else flown home goes back on the shelf.']
    });
  }

  /* ----------------------------------------------------- 4 · PROPOSAL */

  function qDetail(S, p, d, colspan) {
    const D = DT(); if (!D || !D.isOpen('TASKING', p.id)) return '';
    const PL = thePayloads(), T = theTiers();
    const lead = p.leadId != null ? (S.A.casualties || []).find(c => c.id === p.leadId) : null;
    const urgent = p.leadDeadline !== null && p.leadDeadline !== undefined && p.leadDeadline < 12;
    const audit = (S.A.audit || []).filter(e => e.meta && e.meta.proposal === p.id);
    const st = p.state === 'PENDING' ? pill('PENDING', urgent ? 'bad' : 'warn')
      : p.state === 'APPROVED' ? pill('APPROVED', 'ok')
      : p.state === 'REJECTED' ? pill('REJECTED', 'bad') : pill('EXPIRED', '');

    const build_prop = () =>
      D.group('THE PROPOSAL', 'q.prop', D.figs([
        { k: 'raised at', v: T_PLUS(p.tRaised) },
        { k: 'aircraft', v: d ? esc(tailOf(d)) : null, note: d ? esc(d.plat.label) : null },
        { k: 'launch point', v: d ? esc(d.baseName) : null },
        { k: 'payload', v: (p.payloads || []).length ? esc(p.payloads.join(' + ')) : null },
        { k: 'on station', v: p.eta === null || p.eta === undefined ? null : n0(p.eta) + ' <small>min</small>',
          note: 'after the lead casualty was wounded' },
        { k: 'expected gain', v: (p.gain >= 0 ? '+' : '−') + Math.abs(p.gain), cls: p.gain >= 0 ? 'ok' : 'bad',
          note: 'survival points across the whole route' }
      ])) +
      (p.state === 'PENDING'
        ? D.status('WAITING ON A PERSON · AUTHORITY LAPSES AT ' + esc(fmtT(p.tRaised + 8)), urgent ? 'bad' : 'warn')
        : D.status('DECIDED · ' + esc(p.state) + (p.tActed !== undefined && p.tActed !== null ? ' AT ' + esc(fmtT(p.tActed)) : ''),
          p.state === 'APPROVED' ? 'ok' : ''));

    const build_why = () => {
      const rows = (p.reasons || []).map(r => [
        pill(r, r.startsWith('THREAT') ? 'bad' : r === 'LOW CONFIDENCE' ? '' : 'warn')
      ]);
      return D.group('WHY YOU ARE BEING ASKED', 'q.why',
        D.table([{ h: 'Escalation trigger', w: '340px', sub: 'each one is a rule the allocator will not decide alone' }], rows) ||
        D.empty('No trigger is recorded against this proposal.')) +
        D.figs([
          { k: 'triggers', v: n0((p.reasons || []).length), cls: (p.reasons || []).length > 1 ? 'warn' : 'dim' },
          { k: 'deadline on the lead', v: p.leadDeadline === null || p.leadDeadline === undefined ? null
            : n0(p.leadDeadline) + ' <small>min</small>', cls: urgent ? 'bad' : 'warn' }
        ]);
    };

    const build_lead = () => {
      if (!lead) return D.empty('The casualty this proposal leads with is not on the current register.');
      const rows = (p.route || []).map((l, i) => {
        const c = (S.A.casualties || []).find(k => k.id === l.casId);
        return [
          `<b class="mono">${esc(String(i + 1))}</b>`,
          `<span class="mono">${esc(casId(l.casId))}</span>`,
          c ? pill(c.cls, c.cls === 'IMMEDIATE' ? 'bad' : c.cls === 'DELAYED' ? 'warn' : '') : '',
          PL && PL[l.payloadKey] ? esc(PL[l.payloadKey].label) : esc(l.payloadKey),
          l.eta === undefined || l.eta === null ? '<span class="gpUnk">not planned</span>'
            : `<span class="mono">${esc(fmtT(l.eta))}</span>`
        ];
      });
      return D.group('THE PERSON THIS DECISION IS ABOUT', 'q.lead', D.figs([
        { k: 'record', v: esc(casId(lead.id)) },
        { k: 'triage', v: esc(lead.cls), cls: lead.cls === 'IMMEDIATE' ? 'bad' : lead.cls === 'DELAYED' ? 'warn' : 'dim' },
        { k: 'compensatory reserve', v: p.leadReserve === null || p.leadReserve === undefined ? null : n0(p.leadReserve) + '<small>%</small>',
          meter: D.meter(p.leadReserve, urgent ? 'bad' : 'warn') },
        { k: 'collapse in', v: p.leadDeadline === null || p.leadDeadline === undefined ? null : MIN(p.leadDeadline),
          cls: urgent ? 'bad' : 'warn' },
        { k: 'responder on scene', v: T && T[lead.responder] ? esc(T[lead.responder].name) : esc(p.responder || '') }
      ])) +
        D.group('EVERY STOP ON THE ROUTE', 'q.route', D.table([
          { h: 'Leg', w: '80px' }, { h: 'Record', w: '110px' }, { h: 'Triage', w: '130px' },
          { h: 'Payload', w: '210px' }, { h: 'On station', w: '120px' }
        ], rows));
    };

    const build_dec = () => {
      const rows = audit.map(e => [
        `<span class="mono">${esc(String(e.seq))}</span>`,
        `<span class="mono">${esc(fmtT(e.t))}</span>`,
        `<b class="mono">${esc(e.actor)}</b>`,
        esc(e.action),
        `<span class="mono dim" title="first 12 of the entry's 64-character SHA-256">${esc(auditHashShort(e.hash))}</span>`
      ]);
      const decided = audit.filter(e => e.action === 'APPROVE' || e.action === 'REJECT')[0] || null;
      return D.group('WHO DECIDED', 'q.decision', D.figs([
        { k: 'state', v: esc(p.state), cls: p.state === 'APPROVED' ? 'ok' : p.state === 'REJECTED' ? 'bad' : 'warn' },
        { k: 'decided by', v: decided ? esc(decided.actor) : null },
        { k: 'decided at', v: T_PLUS(p.tActed) },
        { k: 'reason given', v: p.reason ? esc(p.reason) : null }
      ])) +
        D.group('THE AUDIT CHAIN FOR THIS PROPOSAL', 'q.audit', D.table([
          { h: 'Seq', w: '80px' }, { h: 'At', w: '100px' }, { h: 'Actor', w: '190px' },
          { h: 'Action', w: '150px' }, { h: 'Hash', w: '140px' }
        ], rows) || D.empty('No audit entry carries this proposal.'));
    };

    return D.region('TASKING', p.id, colspan, {
      title: 'PROP-' + esc(pad(p.id, 3)),
      sub: esc(p.summary),
      badges: st + (urgent && p.state === 'PENDING' ? pill('INSIDE 12 MIN', 'bad') : ''),
      acts: p.state === 'PENDING'
        ? `<button class="mini ok" data-approve="${p.id}">Approve</button>
           <button class="mini" data-reject="${p.id}">Reject</button>` : '',
      tone: p.state === 'PENDING' ? (urgent ? 'bad' : 'warn') : '',
      tabs: [
        { k: 'PRP', label: 'PROPOSAL', build: build_prop },
        { k: 'WHY', label: 'WHY YOU', count: (p.reasons || []).length, build: build_why },
        { k: 'CAS', label: 'THE CASUALTY', count: (p.route || []).length, build: build_lead },
        { k: 'DEC', label: 'DECISION', count: audit.length, build: build_dec }
      ],
      notes: ['An escalated proposal lapses eight minutes after it was raised. Hesitation has a cost and the log records it.']
    });
  }


  /* ============================== CASUALTIES ============================= */

  const CAS_HEAD = `<thead><tr>
    <th style="width:44px" title="Commander designation">★</th>
    <th data-gsort="id" style="width:92px">ID</th>
    <th data-gsort="role" style="width:132px">Duty role</th>
    <th data-gsort="triage" style="width:106px">Triage</th>
    <th style="width:170px">Injury</th>
    <th data-gsort="reserve" style="width:180px">Compensatory reserve</th>
    <th data-gsort="deadline" style="width:118px">Collapse in</th>
    <th data-gsort="responder" style="width:158px">Responder on scene</th>
    <th style="width:126px" title="How many aircraft in the whole force can physically reach this position">Aircraft in range</th>
    <th style="width:130px">From here<span class="thSub">one way at cruise</span></th>
    <th style="width:112px">Status</th></tr></thead>`;

  function casRow(S, c, place) {
    const APP = S.APP, now = S.now, P = S.P;
    const R = theRoles(), T = theTiers();
    const crm = (typeof c.crmAt === 'function') ? c.crmAt(now) : null;
    const left = c.outcome ? '—'
      : (c.deadlineMin >= 9000 ? 'n/a'
        : Math.max(0, c.deadlineMin - (now - c.tInjury)).toFixed(0) + ' min');
    const st = c.outcome === 'SAVED' ? pill('SURVIVED', 'ok')
      : c.outcome === 'DIED' ? pill('DIED', 'bad')
      : c.treated ? pill('TREATED', 'ok')
      : c.assignedTo ? pill('TASKED', 'info') : pill('AWAITING', 'warn');
    let rc = '';
    if (crm !== null && P) rc = crm < P.CRM_RED ? 'bad' : crm < P.CRM_YELLOW ? 'warn' : 'ok';
    /* covPill is the shell's own, so "1 IN RANGE" means the same thing here as
       it does everywhere else. Where it is absent this prints the count and no
       judgement rather than inventing a threshold. */
    const cov = G('covPill') ? G('covPill')(c)
      : (c.reachN === undefined ? '<span class="gpUnk">not scored yet</span>' : `<span class="mono">${n0(c.reachN)}</span>`);
    /* THE ROW IS THE HANDLE FOR ITS OWN RECORD. It no longer carries
       data-cas, which is the attribute app.js binds to hand a selection to
       the inspector rail — that routing is what the operator was complaining
       about. The record opens beneath the row instead, in this column. */
    const other = (place && place.n !== null && place.n > 1)
      ? `<span class="gpSub">also inside the reach of ${n0(place.n - 1)} other ${plural(place.n - 1, 'launch point')}</span>`
      : '';
    return `<tr ${dtRow('CASUALTIES', c.id)} class="${c.hva ? 'hva' : ''}">
      <td class="hvacell"><button class="star${c.hva ? ' on' : ''}" data-hva="${c.id}"
        title="${c.hva ? 'Revoke high-value designation' : 'Designate as high-value asset'}">${c.hva ? '★' : '☆'}</button></td>
      <td class="mono">${casId(c.id)}</td>
      <td class="dim">${R && R[c.role] ? esc(R[c.role].label) : '<span class="gpUnk">not recorded</span>'}</td>
      <td>${pill(c.cls, c.cls === 'IMMEDIATE' ? 'bad' : c.cls === 'DELAYED' ? 'warn' : '')}</td>
      <td class="dim">${esc(String(c.injury || '').replace(/_/g, ' ').toLowerCase())}</td>
      <td>${crm === null ? '<span class="gpUnk">not known</span>'
        : `<span class="gpStack"><span class="meter"><i class="${rc}" style="width:${Math.max(0, Math.min(100, crm))}%"></i></span>` +
          `<b class="mono ${rc}">${Math.round(crm)}%</b></span>`}</td>
      <td class="mono">${left}</td>
      <td class="dim">${T && T[c.responder] ? esc(T[c.responder].name) : esc(String(c.responder || '—'))}</td>
      <td>${cov}</td>
      <td>${place && place.min !== null
        ? `<b class="mono">${n0(place.min)} min</b>${other}`
        : '<span class="gpUnk">out of reach</span>'}</td>
      <td>${st}</td></tr>` + casDetail(S, c, place, 11);
  }

  const CAS_FILTERS = [
    ['ALL', 'All'], ['OPEN', 'Open'], ['CRITICAL', 'Critical'],
    ['TREATED', 'Treated'], ['DIED', 'Died of wounds'], ['HVA', 'High-value']
  ];

  function renderCasualties() {
    keepRoleChrome('renderCasualties');
    const h = host('CASUALTIES'); if (!h) return;
    const S = survey(); if (!S) { paint(h, ''); return; }

    /* casRows() is the shell's: the filter chips, the search box in the pane
       head and the sort column all live in it. Reusing it is what keeps this
       page answering to the controls the operator already has. */
    const rowsFn = G('casRows');
    const all = rowsFn ? rowsFn()
      : (S.A.casualties || []).filter(c => c.tInjury <= S.now);

    setNum('casCount', all.length);

    /* One pass, then the rows are already in the group they belong to. */
    const buckets = new Map();       // site index -> rows
    S.sites.forEach(s => buckets.set(s.i, []));
    const nowhere = [];
    const unplaced = [];
    for (const c of all) {
      const p = placeCasualty(S, c);
      if (!S.RM) { unplaced.push([c, p]); continue; }
      if (p.site) buckets.get(p.site.i).push([c, p]);
      else nowhere.push([c, p]);
    }

    const f = (S.APP.filter && S.APP.filter.cas) || 'ALL';
    const chips = CAS_FILTERS.map(([k, label]) =>
      `<span class="chip${f === k ? ' on' : ''}" data-gpfilter="${k}">${esc(label)}</span>`).join('');

    const top = `<div class="gpTop">
      <div class="gpChips">${chips}</div>
      <div class="gpKpis">
        <div class="kpi"><b class="mono">${n0(all.length)}</b><span>SHOWN</span></div>
        <div class="kpi"><b class="mono">${n0(all.filter(c => c.outcome === null).length)}</b><span>STILL ON THE GROUND</span></div>
        ${S.RM ? `<div class="kpi"><b class="mono${nowhere.length ? ' bad' : ''}">${n0(nowhere.length)}</b>
          <span>OUT OF REACH OF EVERY LAUNCH POINT</span></div>` : ''}
      </div>
    </div>`;

    let printed = 0;
    const CAP = 400;                  // what the flat table showed, kept
    const take = list => {
      const room = Math.max(0, CAP - printed);
      const use = list.slice(0, room);
      printed += use.length;
      return use;
    };

    const groups = [];
    for (const s of S.sites) {
      const rows = buckets.get(s.i) || [];
      const open = rows.filter(([c]) => c.outcome === null);
      const unassigned = open.filter(([c]) => !c.assignedTo && !c.treated);
      const imm = open.filter(([c]) => c.cls === 'IMMEDIATE');
      const shown = take(rows);
      groups.push(group('CASUALTIES', String(s.i), {
        name: s.b.name,
        sub: S.RM
          ? `${rows.length ? n0(rows.length) : 'no'} ${plural(rows.length, 'wounded soldier')} this launch point would reach soonest`
          : 'reach not computable',
        pill: sitingPill(s),
        counts: counts([
          { v: n0(rows.length), k: 'in this group' },
          { v: n0(open.length), k: 'still on the ground' },
          { v: n0(imm.length), k: 'immediate', cls: imm.length ? 'bad' : '' },
          { v: n0(unassigned.length), k: 'no aircraft assigned', cls: unassigned.length ? 'warn' : '' }
        ]),
        open: openLp(s.i),
        folded: `${n0(rows.length)} ${plural(rows.length, 'row')} hidden.`,
        body: rows.length
          ? `<table class="grid tight">${CAS_HEAD}<tbody>${
              shown.map(([c, p]) => casRow(S, c, p)).join('')}</tbody></table>` +
            (shown.length < rows.length
              ? `<p class="gpFolded">${n0(rows.length - shown.length)} further ${
                  plural(rows.length - shown.length, 'row')} in this group are not printed; the page stops at ${n0(CAP)}.</p>`
              : '')
          : `<p class="gpEmpty">Nobody in the current filter is inside this launch point's reach.</p>`
      }));
    }

    if (nowhere.length) {
      const shown = take(nowhere);
      groups.push(group('CASUALTIES', 'none', {
        name: 'Out of reach of every launch point',
        sub: 'No aircraft at any launch point in this operation can fly to them and get home carrying a unit of whole blood.',
        counts: counts([
          { v: n0(nowhere.length), k: 'in this group', cls: 'bad' },
          { v: n0(nowhere.filter(([c]) => c.outcome === null).length), k: 'still on the ground' }
        ]),
        void: true,
        folded: `${n0(nowhere.length)} ${plural(nowhere.length, 'row')} hidden.`,
        body: `<table class="grid tight">${CAS_HEAD}<tbody>${
          shown.map(([c, p]) => casRow(S, c, p)).join('')}</tbody></table>` +
          (shown.length < nowhere.length
            ? `<p class="gpFolded">${n0(nowhere.length - shown.length)} further ${
                plural(nowhere.length - shown.length, 'row')} are not printed; the page stops at ${n0(CAP)}.</p>`
            : '')
      }));
    }

    if (unplaced.length) {
      const shown = take(unplaced);
      groups.push(group('CASUALTIES', 'ungrouped', {
        name: 'Not grouped — the reach geometry is not loaded',
        sub: 'effectiveRadiusKm, dist or the mass of one unit of whole blood is unavailable, so no casualty can be attached to a launch point without inventing a radius.',
        counts: counts([{ v: n0(unplaced.length), k: 'in this group', cls: 'warn' }]),
        orphan: true,
        folded: `${n0(unplaced.length)} ${plural(unplaced.length, 'row')} hidden.`,
        body: `<table class="grid tight">${CAS_HEAD}<tbody>${
          shown.map(([c, p]) => casRow(S, c, p)).join('')}</tbody></table>`
      }));
    }

    /* Two methodological caveats. The honest one — that this page attributes
       no death to a launch point — is the summary line and stays readable
       without a press; the grouping rule and what the quoted minutes exclude
       go behind it, closed on arrival, rather than sitting as eleven lines of
       prose under every table. Nothing is deleted, and the death bridge keeps
       its figures inside. */
    const notes = [];
    notes.push(`A soldier is grouped under the launch point whose fastest airframe could reach them soonest — ` +
      `the allocator's own test, narrowed to the aircraft of one site: can it fly there and get home carrying a unit ` +
      `of whole blood. Where more than one site could reach them the row says so. <b>Reach is a fact about the ` +
      `laydown, not a promise about a sortie</b>; the minutes quoted are one-way transit at the platform's cruise ` +
      `speed and do not include launch, loading or the hold.`);
    notes.push(`The model records who died; it does not record which site failed to reach them, so a per-group ` +
      `death count would be a number this page made up. ` +
      (S.C ? esc(S.C.deathBridge(S.A)) : ''));
    if (!S.RM) notes.push(`The grouping is withheld rather than approximated: the geometry that decides it is not loaded.`);

    paint(h, top + `<div class="gpGroups">${groups.join('')}</div>` +
      `<details class="disc gpDisc" data-nofold><summary>` +
      `<b>No death here is attributed to a launch point</b>` +
      `<b class="q">and how a soldier is grouped</b></summary>` +
      notes.map(t => `<p class="gpNote">${t}</p>`).join('') + `</details>`);
    dtSync();
  }

  /* ================================ FLEET =============================== */

  const AC_HEAD = `<thead><tr>
    <th style="width:100px">Callsign</th><th style="width:150px">Platform</th>
    <th style="width:104px">State</th><th style="width:210px">Current task</th>
    <th style="width:210px">Manifest</th><th style="width:130px">Container</th>
    <th style="width:80px">Sorties</th><th style="width:92px">Delivered</th>
    <th style="width:104px">Sorties wasted</th><th style="width:96px"></th></tr></thead>`;

  function loadStr(m) {
    return Object.entries(m || {}).filter(([, n]) => n > 0)
      .map(([k, n]) => (SHORT[k] || k) + '×' + n).join(', ');
  }

  function acRow(S, d) {
    const P = S.P;
    const carrying = loadStr(d.manifest);
    const flown = loadStr(d.cumulative);
    const st = d.state === 'LOST' ? pill('LOST', 'bad')
      : d.held ? pill('HELD', 'warn')
      : d.state === 'IDLE' ? pill('READY', '') : pill(d.state, 'info');
    const hasBlood = !!(d.manifest && d.manifest.BLOOD);
    let coldCls = 'dim';
    if (hasBlood && P) coldCls = d.coldC > P.COLD_MAX_C ? 'bad' : d.coldC > P.COLD_MAX_C - 2 ? 'warn' : 'ok';
    /* A lost airframe has no cold chain to report. The container reading it
       carried at the moment it went down is not a fact about anything now. */
    const cold = d.state === 'LOST'
      ? '<span class="gpUnk">airframe lost</span>'
      : `<b class="mono ${coldCls}">${n1(d.coldC)} °C</b>` +
        `<span class="gpSub">${hasBlood
          ? (P ? (d.coldC > P.COLD_MAX_C ? 'out of the transfusable band' : 'inside the transfusable band') : 'carrying blood')
          : 'holding cold, nothing aboard'}</span>`;
    const leg = (d.state === 'OUTBOUND' && d.route && d.route[d.legIdx]) ? d.route[d.legIdx] : null;
    const task = leg
      ? `<b class="gpLink" data-gpsel="cas:${leg.casId}">${casId(leg.casId)}</b>` +
        `<span class="gpSub">${esc(SHORT[leg.payloadKey] || leg.payloadKey)}${
          d.tArrive != null ? ' · on station ' + esc(fmtT(d.tArrive)) : ''}</span>`
      : d.state === 'RETURNING' ? `<span class="dim">returning to ${esc(d.baseName || 'base')}</span><span class="gpSub">rearm and refuel</span>`
      : d.state === 'LOST' ? '<span class="bad">lost</span>'
      : d.held ? '<span class="warn">held by the operator</span><span class="gpSub">the allocator is routing around it</span>'
      : `<span class="dim">awaiting tasking</span><span class="gpSub">${esc(d.plat.radiusKm)}–${esc(d.plat.maxRadiusKm)} km radius</span>`;
    return `<tr ${dtRow('FLEET', d.id)}>
      <td class="mono">${esc(tailOf(d))}</td>
      <td class="dim">${esc(d.plat.label)}</td>
      <td>${st}</td>
      <td class="stack">${task}</td>
      <td class="stack">${carrying ? `<b class="ok">${esc(carrying)}</b>` : '<span class="dim">empty — bay clear</span>'}${
        flown ? `<span class="gpSub">flown to date: ${esc(flown)}</span>` : '<span class="gpSub">no sorties yet</span>'}</td>
      <td class="stack">${cold}</td>
      <td class="mono">${n0(d.sorties)}</td>
      <td class="mono">${n0(d.delivered)}</td>
      <td class="mono ${d.wasted ? 'warn' : 'dim'}">${n0(d.wasted)}</td>
      <td>${d.state === 'LOST' ? ''
        : `<button class="mini" data-hold="${d.id}">${d.held ? 'Release' : 'Hold'}</button>`}</td></tr>` +
      acDetail(S, d, 10);
  }

  function renderFleet() {
    keepRoleChrome('renderFleet');
    const h = host('FLEET'); if (!h) return;
    const S = survey(); if (!S) { paint(h, ''); return; }
    const A = S.A;

    /* The KPI chips in the pane head are index.html's and stay there. */
    setNum('fleetReady', (A.drones || []).filter(d => d.state === 'IDLE' && !d.held).length);
    setNum('fleetAir', (A.drones || []).filter(d => d.state === 'OUTBOUND' || d.state === 'RETURNING').length);
    setNum('fleetLost', A.stats ? A.stats.dronesLost : 0);

    const groups = S.sites.map(s => group('FLEET', String(s.i), {
      name: s.b.name,
      sub: `${s.drones.length ? n0(s.drones.length) : 'no'} ${plural(s.drones.length, 'airframe')} based here` +
        (s.held ? ` · ${n0(s.held)} held by the operator` : ''),
      pill: sitingPill(s),
      counts: counts([
        { v: `${n0(s.ready)}<span style="color:var(--faint)">/${n0(s.drones.length)}</span>`, k: 'ready to launch' },
        { v: n0(s.air), k: 'airborne', cls: s.air ? 'ok' : '' },
        { v: n0(s.lost), k: 'lost', cls: s.lost ? 'bad' : '' },
        { v: n0(s.sorties), k: 'sorties from here' }
      ]),
      open: openLp(s.i),
      folded: `${n0(s.drones.length)} ${plural(s.drones.length, 'airframe')} hidden.`,
      body: s.drones.length
        ? `<table class="grid tight">${AC_HEAD}<tbody>${s.drones.map(d => acRow(S, d)).join('')}</tbody></table>`
        : `<p class="gpEmpty">No aircraft are assigned to ${esc(s.b.name)}. Its shelf can be drawn on by nobody, and
           its reach is nil — a laydown decision, not a tasking one.</p>`
    }));

    if (S.strays.length) {
      groups.push(group('FLEET', 'stray', {
        name: 'Not based at any launch point on this list',
        sub: 'These airframes carry a base index that matches no launch point in the current operation. They are shown rather than dropped.',
        counts: counts([{ v: n0(S.strays.length), k: 'airframes', cls: 'warn' }]),
        orphan: true,
        folded: `${n0(S.strays.length)} ${plural(S.strays.length, 'airframe')} hidden.`,
        body: `<table class="grid tight">${AC_HEAD}<tbody>${S.strays.map(d => acRow(S, d)).join('')}</tbody></table>`
      }));
    }

    const partSum = S.sites.reduce((n, s) => n + s.sorties, 0);
    const whole = S.C ? S.C.sorties(A) : null;
    const orphan = (whole === null || whole === undefined) ? null : whole - partSum;
    const notes = [];
    notes.push(`Sorties are partitioned out of the sortie log by aircraft, and an aircraft's launch point is fixed ` +
      `when it is built, so the column sums to what the rest of this console prints: <b>${n0(partSum)}</b> from the ` +
      `launch points above` +
      (orphan === null ? '.'
        : orphan > 0
          ? ` of <b>${n0(whole)}</b> flown in this operation. The other <b>${n0(orphan)}</b> were flown by airframes ` +
            `no longer on the order of battle and belong to no site on this page.`
          : `, which is every sortie this operation has flown.`));
    notes.push(`A container only warms while it is out. An aircraft on the pad holds at its loading temperature, so ` +
      `the reading is a cold-chain figure only for the airframes that are carrying. Holding an aircraft takes it out ` +
      `of the allocator's hands without stopping the operation; the release is logged.`);

    paint(h, `<div class="gpGroups">${groups.join('')}</div>` +
      notes.map(t => `<p class="gpNote">${t}</p>`).join(''));
    dtSync();
  }

  /* =============================== SUPPLY =============================== */

  function stockCell(n, item, cap) {
    /* One unit left is the last transfusion this site can give without a
       resupply run, so it is called out at one and not at zero — by the time
       it is zero the decision it should have prompted is behind you. */
    if (n === null || n === undefined) return '<span class="gpUnk">not held</span>';
    const low = (item === 'BLOOD' || item === 'PLASMA') && n <= 1;
    const cls = low ? 'warn' : 'ok';
    return `<span class="gpStack">${meter(n, cap ? cap[item] : null, cls)}` +
      `<b class="mono${low ? ' warn' : ''}">${n0(n)}</b></span>`;
  }

  /* The stockout projection the old pane carried in its card head, computed
     the way it was computed there: the burn rate over the last twelve samples
     of this arm's own history. It is an arm-wide figure, not a per-shelf one,
     so it is printed once at the foot and not against a group. */
  function stockoutIn(hist) {
    if (!hist || hist.length < 12) return null;
    const a = hist[hist.length - 12], b = hist[hist.length - 1];
    const rate = (a.blood - b.blood) / Math.max(1, b.t - a.t);
    if (b.blood <= 0) return 'stocked out';
    if (rate <= 0.0001) return 'stable at the current burn rate';
    const mins = b.blood / rate;
    return mins > 600 ? 'more than 10 hours' : Math.round(mins) + ' min';
  }

  function renderSupply() {
    keepRoleChrome('renderSupply');
    const h = host('SUPPLY'); if (!h) return;
    const S = survey(); if (!S) { paint(h, ''); return; }
    const P = thePayloads(), cap = S.cap;
    const ctl = S.B && S.B.bases ? S.B.bases : null;   // the control arm's shelves

    const groups = S.sites.map(s => {
      const b = s.b;
      const cb = ctl ? ctl[s.i] : null;
      const rows = ITEMS.map(k => {
        const on = b.stock && b.stock[k] !== undefined ? b.stock[k] : null;
        const sp = (b.spent && b.spent[k] !== undefined) ? b.spent[k] : null;
        const de = DESTROY_TRACKED[k] && b.wastedUnits ? (b.wastedUnits[k] || 0) : null;
        const label = (P && P[k]) ? P[k].label : k.replace(/_/g, ' ');
        return `<tr ${dtRow('SUPPLY', s.i + '-' + k)}>
          <td>${esc(label)}<span class="gpSub">${esc(SHORT[k] || k)}</span></td>
          <td>${stockCell(on, k, cap)}</td>
          <td class="mono">${sp === null ? '—' : n0(sp)}</td>
          <td class="mono${de ? ' warn' : ''}">${de === null
            ? '<span class="gpUnk" title="Only the cold-chain items can be destroyed in this model; anything else still aboard when an aircraft turns for home goes back on the shelf.">not modelled</span>'
            : n0(de)}</td>
          <td class="mono dim">${cb && cb.stock && cb.stock[k] !== undefined ? n0(cb.stock[k]) : '—'}</td>
        </tr>` + supDetail(S, s, k, 5);
      }).join('');
      const blood = b.stock ? b.stock.BLOOD : null;
      const wasted = b.wastedUnits ? (b.wastedUnits.BLOOD || 0) : null;
      return group('SUPPLY', String(s.i), {
        name: b.name,
        sub: 'Class VIII held forward at this launch point',
        pill: sitingPill(s),
        counts: counts([
          { v: n0(blood), k: 'units whole blood', cls: (blood !== null && blood <= 1) ? 'warn' : '' },
          { v: n0(b.stock ? b.stock.PLASMA : null), k: 'units plasma' },
          { v: n0(wasted), k: 'blood units destroyed', cls: wasted ? 'warn' : '' }
        ]),
        open: openLp(s.i),
        folded: 'Five Class VIII lines hidden.',
        body: `<table class="grid tight">
          <thead><tr><th style="width:220px">Item</th>
            <th style="width:190px">On the shelf<span class="thSub">units here now</span></th>
            <th style="width:120px">Issued<span class="thSub">put on an aircraft from here</span></th>
            <th style="width:150px">Destroyed<span class="thSub">spent, reached nobody</span></th>
            <th style="width:150px">current triage and proximity<span class="thSub">control arm, same shelf</span></th>
          </tr></thead><tbody>${rows}</tbody></table>`
      });
    });

    const fwd = S.C ? S.C.bloodForward(S.A) : null;
    const dst = S.C ? S.C.bloodDestroyed(S.A) : null;
    const sum = S.sites.reduce((n, s) => n + ((s.b.stock && s.b.stock.BLOOD) || 0), 0);
    const notes = [];
    notes.push(`Blood on the shelves above sums to <b>${n0(sum)}</b> ${plural(sum, 'unit')}` +
      (fwd === null ? '.' : `, which is the <b>${n0(fwd)}</b> this operation holds forward.`) +
      (dst === null ? '' : ` <b>${n0(dst)}</b> ${plural(dst, 'unit')} ${plural(dst, 'has', 'have')} been destroyed — ` +
        `spent, and reached nobody. Every one of them is a transfusion that can no longer be given.`));
    const pa = stockoutIn(S.APP.histA), pb = stockoutIn(S.APP.histB);
    if (pa || pb) {
      notes.push(`At the burn rate of the last twelve samples, whole blood runs out in <b>${esc(pa || 'not yet known')}</b> ` +
        `under ANGEL SWARM and <b>${esc(pb || 'not yet known')}</b> under current triage and proximity. Twelve samples is not a ` +
        `forecast; it is the recent rate carried forward.`);
    }
    notes.push(`Destroyed units are recorded only for the cold-chain items — blood and plasma. Everything else still ` +
      `aboard when an aircraft turns for home goes back on the shelf, so those cells say the loss is not modelled ` +
      `rather than printing a zero that reads as a measurement.`);

    /* The two run-wide charts the old pane carried. They are kept because they
       answer a question no per-shelf table can — the shape of the burn over
       time — and they are drawn by the shell's own sparkline, not a second
       implementation of it. */
    const canDraw = G('sparkline') && S.APP.histA && theCap();
    const charts = canDraw ? `<div class="gpCharts">
        <div class="card"><div class="cardHead">Whole blood on hand, both arms</div>
          <canvas id="chartBlood" class="chart"></canvas></div>
        <div class="card"><div class="cardHead">Cumulative wasted sorties</div>
          <canvas id="chartWaste" class="chart"></canvas></div>
      </div>` : '';

    const wrote = paint(h, `<div class="gpGroups">${groups.join('')}</div>` +
      notes.map(t => `<p class="gpNote">${t}</p>`).join('') + charts);
    dtSync();

    /* The shell's own renderSupply redraws these every tick — it is called
       above — so this only has to cover the tick on which the canvases were
       replaced, and the case where the shell renderer is gone. */
    if (canDraw && (wrote || !G('renderSupply'))) {
      try {
        const cap2 = theCap();
        G('sparkline')(document.getElementById('chartBlood'), S.APP.histA, S.APP.histB, 'blood', cap2.BLOOD * 3);
        G('sparkline')(document.getElementById('chartWaste'), S.APP.histA, S.APP.histB, 'wasted', 60);
      } catch (err) { /* a chart that cannot draw must not take the pane down */ }
    }
  }

  /* =============================== TASKING ============================== */

  const Q_HEAD = `<thead><tr>
    <th style="width:82px">Raised</th><th style="width:118px">Aircraft</th>
    <th style="width:200px">Proposal</th>
    <th style="width:220px">Why you are being asked</th>
    <th style="width:150px">Payload</th><th style="width:100px">Deadline</th>
    <th style="width:82px">ETA</th><th style="width:150px">Receiver</th>
    <th style="width:74px">Gain</th><th style="width:96px">State</th>
    <th style="width:170px"></th></tr></thead>`;

  function qRow(S, p, d) {
    const urgent = p.leadDeadline !== null && p.leadDeadline !== undefined && p.leadDeadline < 12;
    const st = p.state === 'PENDING' ? pill('PENDING', urgent ? 'bad' : 'warn')
      : p.state === 'APPROVED' ? pill('APPROVED', 'ok')
      : p.state === 'REJECTED' ? pill('REJECTED', 'bad') : pill('EXPIRED', '');
    /* The row opens the proposal itself — the casualty it leads with, the
       route, the triggers and the audit chain are all inside it. It no longer
       pushes a selection at the inspector rail. */
    return `<tr class="${p.state === 'PENDING' ? 'live' : 'dimrow'}" ${dtRow('TASKING', p.id)}>
      <td class="mono">${esc(fmtT(p.tRaised))}</td>
      <td>${d ? `<b class="gpLink mono" data-gpsel="drone:${d.id}">${esc(tailOf(d))}</b>
        <span class="gpSub">${esc(d.plat.label)}</span>`
        : '<span class="gpUnk">airframe not on the order of battle</span>'}</td>
      <td class="mono">${esc(p.summary)}</td>
      <td class="why">${(p.reasons || []).map(r =>
        pill(r, r.startsWith('THREAT') ? 'bad' : r === 'LOW CONFIDENCE' ? '' : 'warn')).join(' ')}</td>
      <td class="dim">${esc((p.payloads || []).join(' + '))}</td>
      <td class="mono ${urgent ? 'bad' : ''}">${p.leadDeadline === null || p.leadDeadline === undefined
        ? '—' : Number(p.leadDeadline).toFixed(0) + ' min'}</td>
      <td class="mono">${p.eta === null || p.eta === undefined ? '—' : 'T+' + Number(p.eta).toFixed(0)}</td>
      <td class="dim">${esc(p.responder || '—')}</td>
      <td class="mono ${p.gain >= 0 ? 'ok' : 'bad'}">${p.gain >= 0 ? '+' : '−'}${Math.abs(p.gain)}</td>
      <td>${st}</td>
      <td class="act">${p.state === 'PENDING'
        ? `<button class="mini ok" data-approve="${p.id}">Approve</button>
           <button class="mini" data-reject="${p.id}">Reject</button>` : ''}</td></tr>` +
      qDetail(S, p, d, 11);
  }

  function renderTasking() {
    keepRoleChrome('renderTasking');
    const h = host('TASKING'); if (!h) return;
    const S = survey(); if (!S) { paint(h, ''); return; }
    const A = S.A, q = A.queue || [];
    const byDrone = new Map((A.drones || []).map(d => [d.id, d]));

    /* Pending first, everywhere, then the recent history. A decision waiting
       on a person does not get sorted below a decision already made. */
    const pending = q.filter(p => p.state === 'PENDING');
    const past = q.filter(p => p.state !== 'PENDING').slice(-40).reverse();
    const ordered = pending.concat(past);

    const buckets = new Map();
    S.sites.forEach(s => buckets.set(s.i, []));
    const stray = [];
    for (const p of ordered) {
      const d = byDrone.get(p.droneId);
      const s = d ? S.sites.find(x => x.i === d.baseIdx) : null;
      if (s) buckets.get(s.i).push([p, d]); else stray.push([p, d || null]);
    }

    const st = A.stats || {};
    const top = `<div class="gpTop">
      <div class="gpKpis">
        <div class="kpi"><b class="mono${pending.length ? ' warn' : ''}">${n0(pending.length)}</b><span>PENDING</span></div>
        <div class="kpi"><b class="mono ok">${n0(st.approved)}</b><span>APPROVED</span></div>
        <div class="kpi"><b class="mono bad">${n0(st.rejected)}</b><span>REJECTED</span></div>
        <div class="kpi"><b class="mono">${n0(st.autoApproved)}</b><span>AUTO-DISPATCHED</span></div>
        <div class="kpi"><b class="mono">${n0(st.expired)}</b><span>EXPIRED UNACTIONED</span></div>
      </div>
    </div>
    <div class="card"><div class="cardHead">Escalation policy — when a person is asked</div>
      <div id="policyBox" class="policyBox"></div></div>`;

    const groups = S.sites.map(s => {
      const rows = buckets.get(s.i) || [];
      const pend = rows.filter(([p]) => p.state === 'PENDING');
      const urgent = pend.filter(([p]) => p.leadDeadline !== null && p.leadDeadline !== undefined && p.leadDeadline < 12);
      return group('TASKING', String(s.i), {
        name: s.b.name,
        sub: `Raised by aircraft based here${s.drones.length ? ` · ${n0(s.drones.length)} ${plural(s.drones.length, 'airframe')}` : ''}`,
        pill: sitingPill(s),
        counts: counts([
          { v: n0(pend.length), k: 'waiting on you', cls: pend.length ? 'warn' : '' },
          { v: n0(urgent.length), k: 'inside 12 min', cls: urgent.length ? 'bad' : '' },
          { v: n0(rows.length), k: 'shown here' }
        ]),
        open: openLp(s.i),
        folded: `${n0(rows.length)} ${plural(rows.length, 'proposal')} hidden.`,
        body: rows.length
          ? `<table class="grid tight">${Q_HEAD}<tbody>${rows.map(([p, d]) => qRow(S, p, d)).join('')}</tbody></table>`
          : `<p class="gpEmpty">Nothing from ${esc(s.b.name)} is waiting on you, and nothing from it has been
             actioned recently. Sorties that meet the standing authorisation launch without asking and are logged.</p>`
      });
    });

    if (stray.length) {
      groups.push(group('TASKING', 'stray', {
        name: 'Raised by an aircraft no longer on the order of battle',
        sub: 'The airframe that raised these proposals is not in the current fleet, so they belong to no launch point on this page.',
        counts: counts([{ v: n0(stray.length), k: 'proposals', cls: 'warn' }]),
        orphan: true,
        folded: `${n0(stray.length)} ${plural(stray.length, 'proposal')} hidden.`,
        body: `<table class="grid tight">${Q_HEAD}<tbody>${stray.map(([p, d]) => qRow(S, p, d)).join('')}</tbody></table>`
      }));
    }

    const note = `<p class="gpNote">A proposal is grouped under the launch point whose aircraft raised it, because that
      is the shelf the sortie spends and the pad it launches from. Pending proposals sort above actioned ones inside
      every group; the last forty actioned proposals are shown. Escalated proposals expire after eight minutes of
      simulated time — hesitation has a cost and the log records it.</p>`;

    paint(h, top + `<div class="gpGroups">${groups.join('')}</div>` + note);
    dtSync();

    /* The escalation policy box is the shell's own renderer writing into the
       element above. Reimplementing it here would be a second copy of the
       policy list, and the two would drift. */
    const rp = G('renderPolicy');
    if (rp) { try { rp(); } catch (err) { /* leave the box empty rather than fail the pane */ } }
  }

  /* =============================== BINDING ============================== */

  /* Open a record in the pane that owns it: switch view, expand the group it
     is grouped under — a collapsed group would otherwise swallow the row the
     link just pointed at — and open its detail. The group is worked out with
     the same test the pane itself groups by, never a second one. */
  function crossOpen(kind, id) {
    const D = DT(), APP = theApp(), render = G('render'), goto = G('goView');
    if (!D || Number.isNaN(id)) return;
    const S = survey();
    if (kind === 'cas') {
      const c = S ? (S.A.casualties || []).find(k => k.id === id) : null;
      if (S && c) {
        const pl = placeCasualty(S, c);
        OPENED.CASUALTIES.add(pl.site ? String(pl.site.i) : (S.RM ? 'none' : 'ungrouped'));
      }
      D.open('CASUALTIES', id);
      if (goto) goto('CASUALTIES');
    } else if (kind === 'drone') {
      const d = S ? (S.A.drones || []).find(k => k.id === id) : null;
      if (S && d) {
        const site = S.sites.find(x => x.i === d.baseIdx);
        OPENED.FLEET.add(site ? String(site.i) : 'stray');
      }
      D.open('FLEET', id);
      if (goto) goto('FLEET');
    } else return;
    if (APP) APP._paneForce = true;
    if (render) render();
    requestAnimationFrame(() => {
      try { D.sync(); } catch (e) { /* nothing to do */ }
      const el = document.querySelector('[data-dtrow="' + (kind === 'cas' ? 'CASUALTIES' : 'FLEET') + ':' + id + '"]');
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
    });
  }

  function bind() {
    if (document._gpBound) return;
    document._gpBound = true;
    document.addEventListener('click', e => {
      if (!e.target || !e.target.closest) return;
      const APP = theApp(), render = G('render');

      /* Collapse. Nothing else on the page changes. */
      const fold = e.target.closest('[data-gpfold]');
      if (fold) {
        e.preventDefault(); e.stopPropagation();
        const raw = fold.getAttribute('data-gpfold') || '';
        const at = raw.indexOf(':');
        const view = raw.slice(0, at), key = raw.slice(at + 1);
        if (OPENED[view]) {
          OPENED[view].has(key) ? OPENED[view].delete(key) : OPENED[view].add(key);
          if (APP) APP._paneForce = true;
          if (render) render();
        }
        return;
      }

      /* The casualty filter chips. The pane's own were bound at start-up and
         went with the markup they were bound to; the state they wrote is
         APP.filter.cas and casRows() still reads it, so these write the same
         field rather than a second one. */
      const chip = e.target.closest('[data-gpfilter]');
      if (chip) {
        e.preventDefault();
        if (APP && APP.filter) {
          APP.filter.cas = chip.getAttribute('data-gpfilter');
          APP._paneForce = true;
          if (render) render();
        }
        return;
      }

      /* Column sort, written the way app.js writes it so a click here and a
         click on any other sortable table mean the same thing. */
      const so = e.target.closest('[data-gsort]');
      if (so) {
        e.preventDefault();
        if (APP && APP.sort) {
          const k = so.getAttribute('data-gsort');
          APP.sort = { key: k, dir: APP.sort.key === k ? -APP.sort.dir : 1 };
          APP._paneForce = true;
          if (render) render();
        }
        return;
      }

      /* THE CROSS-LINKS. A casualty named inside an aircraft's task cell, and
         a tail named inside a proposal. These used to write APP.sel and let
         the inspector rail answer. They now open the record where the record
         lives: the other pane, the group it belongs to, and its own accordion
         beneath its own row. */
      const gs = e.target.closest('[data-gpsel]');
      if (gs && !e.target.closest('[data-approve],[data-reject],[data-gpfold]')) {
        e.preventDefault(); e.stopPropagation();
        const raw = gs.getAttribute('data-gpsel') || '';
        const at = raw.indexOf(':');
        crossOpen(raw.slice(0, at), Number(raw.slice(at + 1)));
        return;
      }

      /* "Open launch point". The button also carries data-goto, which app.js
         has already acted on by the time this runs — body's listener fires
         before document's — so the launch points pane is drawn and its rows
         exist. Selecting the site is that pane's business, so this asks it in
         its own language rather than reaching into its state. */
      const lp = e.target.closest('[data-lpopen]');
      if (lp) {
        const i = Number(lp.getAttribute('data-lpopen'));
        if (Number.isNaN(i)) return;
        const A = window.ANGEL;
        if (A && A.launchpoints && typeof A.launchpoints.select === 'function') {
          try { A.launchpoints.select(i); } catch (err) { /* fall through */ }
          return;
        }
        const row = document.querySelector('#lpBody button[data-lpsel="' + i + '"], #lpBody [data-lpsel="' + i + '"]');
        if (row && typeof row.click === 'function') row.click();
        return;
      }
    });
  }

  /* ============================== BOOTSTRAP ============================= */

  const VIEWS = {
    CASUALTIES: renderCasualties,
    FLEET: renderFleet,
    SUPPLY: renderSupply,
    TASKING: renderTasking
  };

  if (window.ANGEL && typeof ANGEL.ready === 'function') {
    ANGEL.ready('page-grouped', async () => {
      if (!theApp()) {
        if (ANGEL.setStatus) ANGEL.setStatus('page-grouped', 'withheld', 'application shell not present');
        return null;
      }
      ANGEL.views = ANGEL.views || {};
      injectCSS();
      bind();
      for (const k of Object.keys(VIEWS)) {
        const fn = VIEWS[k];
        /* A throw here would take the render loop down with it and the pane
           it broke would be the least of it. */
        ANGEL.views[k] = () => { try { fn(); } catch (err) { console.warn(k, err); } };
      }
      /* One entry point for any other pane that wants to open a record where
         the record lives rather than push a selection at the inspector rail.
         page-launchpoints uses it for the aircraft rows on a launch point. */
      /* THE REACH MODEL IS THE ALLOCATOR'S, AND IT SHOULD HAVE ONE OWNER.
         The design shell needs the same two answers this pane needs — which
         launch point reaches a casualty soonest, and how many can reach them
         at all — and a second implementation of that would be a second set
         of numbers that drift. Published rather than copied. */
      if (typeof ANGEL.provide === 'function') ANGEL.provide('grouped', {
        open: crossOpen,
        survey: survey,
        place: placeCasualty
      });
      if (ANGEL.mark) ANGEL.mark('page-grouped ready', { views: Object.keys(VIEWS) });
      return true;
    });
  }
})();
