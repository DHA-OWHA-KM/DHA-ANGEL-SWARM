/* =========================================================================
   LAUNCH POINTS — the place, not the abstraction.

   Every other pane in this application talks about launch points without
   ever showing one. "No launch point close enough to reach them" is the
   single largest cause of death in the model and it has, until now, been a
   phrase in a sentence rather than a thing an officer could open. This file
   is the thing. A list of the forward sites that hold the aircraft and the
   blood, and behind each row the site itself: what is parked there, what is
   on the shelf, how far it can actually fly, what is waiting on a person,
   and what it has flown.

   THE SHAPE IS THE COMMAND-CONSOLE SHAPE, deliberately. A list of things; a
   row is a thing; opening the row drills into that one thing and nothing
   else. The detail is a header — where you are, what this place is, the few
   figures that decide everything — and beneath it a tab strip, and beneath
   that one bordered panel holding the tab you asked for. There is no third
   level, because there is no fourth question a commander asks about a FARP.

   FIVE TABS, IN THE ORDER THE QUESTIONS ARE ASKED. What is parked here
   (AIRCRAFT). What is on the shelf (SUPPLIES). Who this place can physically
   reach and who it cannot (REACH). What is waiting on a person (APPROVALS).
   What has flown from here (ACTIVITY). A tab that has nothing to show says
   what "nothing" means at this site rather than showing an empty box: no
   aircraft is a laydown decision, no pending proposal means everything from
   here cleared the standing bar and launched.

   WHAT IS NOT HERE, AND WHY.

   No deaths are attributed to a launch point. The model does not record
   which site failed to reach a casualty who died — reachN counts airframes
   across the whole force, not by site — so a "deaths attributable to this
   FARP" column would be a number this file made up. It is left out. The
   coverage argument is made instead in the honest currency the model does
   hold: who this site can physically fly to and get home from, and who it
   cannot.

   No figure on this page is estimated, interpolated or rounded up from
   something adjacent. Where a quantity is not yet known — reach is scored
   when a casualty is admitted to the first tasking pass, so before that pass
   it is genuinely unknown — the pane says it is not known. It never prints
   zero for "I have not been told".

   REACH IS COMPUTED WITH THE ALLOCATOR'S OWN GEOMETRY, not a second copy of
   it: effectiveRadiusKm(platform, one unit of whole blood) against dist()
   from the site to the casualty. That is exactly scoreCoverage()'s test in
   optimizer.js, narrowed from the whole force to the aircraft that belong to
   this one site. If either function is unavailable the reach columns are
   dropped rather than approximated — a laydown argument made with a radius
   this file invented is worse than no argument at all.

   SORTIES ARE READ FROM THE TRANSACTIONAL LOG. arm.sortieLog carries a
   droneId, and an aircraft's baseIdx is fixed at the moment it is built and
   is never reassigned, so grouping the log by aircraft partitions
   COUNT.sorties(arm) across the sites exactly — the parts sum to the whole
   the rest of the application prints, and the list's footer shows the whole
   beside them so a reviewer can check that in one glance.

   APPROVALS ARE THE LIVE QUEUE, narrowed to this site by the proposal's own
   droneId — the same field approveProposal() dispatches on — so the rows
   under that tab are the rows the tasking pane would show, not a per-site
   re-derivation of them. reapQueue() trims arm.queue to its last 400
   entries, so the decided tallies beneath the pending table are counts
   within the retained queue and are labelled as such. The operation's
   lifetime approve/reject totals live in arm.stats and are not held per
   site; this file does not pretend otherwise.

   THE COORDINATE LINE IS THE MODEL'S OWN GRID — kilometres east and south of
   the area's north-west corner, beside the joint operations area and grid
   zone the scenario declares. It is not an MGRS reference and does not
   pretend to be one; the inspector's grid-reference helper is private to
   that module and this pane will not restate a coordinate system it cannot
   read.
   ========================================================================= */

(function () {
  'use strict';

  /* ------------------------------------------------------------ plumbing */
  /* APP, COUNT, PLATFORMS, PAYLOADS, STOCK_CAP and PARAMS are top-level
     `const` declarations in classic scripts: they live in the global
     declarative record and resolve by bare name, but they are NOT properties
     of the global object, so `window.APP` cannot be relied on. A bare
     reference to a name that was never declared is a ReferenceError, and a
     reference to one still in its temporal dead zone throws even under
     `typeof` — hence the try/catch on every one of them. This module has to
     be able to load in a document where sim.js failed, and fail by rendering
     nothing rather than by taking the render loop down with it. */
  function theApp() {
    try { if (typeof APP !== 'undefined' && APP) return APP; } catch (e) { /* not declared yet */ }
    return (typeof window !== 'undefined' && window.APP) ? window.APP : null;
  }
  function theCount() {
    try { if (typeof COUNT !== 'undefined' && COUNT) return COUNT; } catch (e) { /* not declared yet */ }
    return (typeof window !== 'undefined' && window.COUNT) ? window.COUNT : null;
  }
  function thePlatforms() { try { return (typeof PLATFORMS !== 'undefined') ? PLATFORMS : null; } catch (e) { return null; } }
  function thePayloads() { try { return (typeof PAYLOADS !== 'undefined') ? PAYLOADS : null; } catch (e) { return null; } }
  function theCap() { try { return (typeof STOCK_CAP !== 'undefined') ? STOCK_CAP : null; } catch (e) { return null; } }
  function coldMaxC() {
    try { return (typeof PARAMS !== 'undefined' && PARAMS) ? PARAMS.COLD_MAX_C : null; } catch (e) { return null; }
  }

  /* Function declarations in a classic script DO land on the global object,
     so the shell's helpers are reachable this way. Asked for rather than
     assumed, with a local fallback where one is honest. */
  const G = k => (typeof window[k] === 'function' ? window[k] : null);
  const esc = G('esc') || (s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])));
  const fmtT = G('fmtT') || (m => 'T+' + Number(m).toFixed(0));

  const n0 = v => (v === null || v === undefined || !isFinite(v)) ? '—' : Math.round(v).toLocaleString();
  const n1 = v => (v === null || v === undefined || !isFinite(v)) ? '—' : Number(v).toFixed(1);
  const plural = (n, one, many) => n === 1 ? one : (many || one + 's');

  /* CALLSIGN is a top-level const inside map.js — a rendering module this
     pane has no business depending on — so the three strings are restated
     here, as optimizer.js and role-commander.js both restate them. Three
     duplicated strings are cheaper than a dependency, and an edit that
     changes them fails visibly on the next screenshot rather than quietly. */
  const TAIL = { HEAVY: 'TRV', LIGHT: 'M25', LONG: 'FVR' };
  const pad2 = v => ('0' + v).slice(-2);
  const tailOf = d => (TAIL[d.type] || d.type) + '-' + pad2(d.id);
  /* CAS-007, and CAS-1007 rather than CAS-007 when the run gets that far:
     the pad is a minimum width, never a truncation. */
  const casRef = id => 'CAS-' + (String(id).length >= 3 ? String(id) : ('00' + id).slice(-3));

  /* The five Class VIII items a launch point holds, in the order the supply
     pane shows them, so an officer reading both is reading one list. */
  const ITEMS = ['BLOOD', 'PLASMA', 'TXA', 'TQ_KIT', 'CHEST_SEAL'];
  /* Destruction is recorded per site only for the items whose loss is
     modelled — the cold chain ones. The rest come home and go back on the
     shelf, so a "0 destroyed" against them would be answering a question the
     model never asked. Those cells carry an em dash and say why on hover. */
  const DESTROY_TRACKED = { BLOOD: 1, PLASMA: 1 };

  /* Selection. -1 is the list; anything else is a launch-point index into
     APP.armA.bases. Held here rather than on APP because it is a property of
     this pane and of nothing else, and because writing to APP from a module
     that only reads it everywhere else invites the next author to do the
     same with something that matters. */
  let sel = -1;

  /* The open tab of the detail, in the same module-level place and for the
     same reason. It resets to AIRCRAFT whenever a different launch point is
     opened: the tab an officer was reading about one site is not a question
     he has asked about the next one. */
  const TABS = [
    { k: 'AIR', label: 'AIRCRAFT' },
    { k: 'SUP', label: 'SUPPLIES' },
    { k: 'RCH', label: 'REACH' },
    { k: 'APR', label: 'APPROVALS' },
    { k: 'ACT', label: 'ACTIVITY' }
  ];
  let tab = 'AIR';

  /* -------------------------------------------------------------- styling */
  /* Layout and spacing only. Every colour is a token — there are four themes
     in this application and one hard-coded hex breaks three of them — and the
     structural classes (.card, .cardHead, table.grid, .pill, .meter, .kpi,
     .mini) are the shell's, not this file's.

     THE SPACING IS THE POINT OF THIS PASS. The first cut of this pane packed
     five tables into a screen and read as a wall. Everything here is one
     scale: 18px between blocks, 16-20px inside a padded block, 10px of
     vertical room in a table row, and clear air between a heading and the
     thing it introduces. The table-row overrides are scoped to #lpBody so
     that no other pane in the application moves. */
  const CSS = `
/* ------------------------------------------------------ LAUNCH POINTS -- */
#lpBody{display:flex; flex-direction:column; gap:18px; min-height:0}
#lpBody table.grid.tight td{padding:10px 12px}
#lpBody table.grid.tight th{padding:11px 12px}
#lpBody .cardHead{padding:12px 16px}
.lpScroll{overflow-x:auto}
.lpNote{margin:0; padding:16px 18px; font:400 11px/1.75 var(--sans); color:var(--dim)}
.lpNote b{color:var(--text); font-weight:600}
.lpUnk{font:400 10.5px/1.4 var(--sans); color:var(--faint)}
.lpQ{font:700 10.5px/1 var(--mono); color:var(--text)}
.lpQ i{font-style:normal; font-weight:400; font-size:9.5px; color:var(--faint)}
.lpStack{display:flex; align-items:center; gap:8px; white-space:nowrap}
.lpSite{font:700 11.5px/1.2 var(--mono); letter-spacing:.05em; color:var(--text)}
.lpWhere{display:block; margin-top:5px; font:400 9.5px/1.3 var(--sans); color:var(--faint)}

/* ---- the detail: header, tab strip, one panel --------------------------- */
.lpDetail{display:flex; flex-direction:column; gap:18px; min-height:0}

.lpHead{display:flex; align-items:flex-start; justify-content:space-between;
  gap:28px; flex-wrap:wrap; padding:2px 2px 20px; border-bottom:1px solid var(--line)}
.lpHeadL{min-width:0}
.lpCrumb{appearance:none; background:transparent; border:0; padding:0; cursor:pointer;
  font:700 9.5px/1 var(--mono); letter-spacing:.14em; color:var(--faint)}
.lpCrumb:hover{color:var(--text)}
.lpHead h3{margin:14px 0 0; font:800 23px/1.15 var(--sans); letter-spacing:.055em;
  text-transform:uppercase; color:var(--text)}
.lpBadges{display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:14px}
.lpCoord{margin:14px 0 0; font:400 10.5px/1.65 var(--mono); color:var(--faint)}
.lpCoord b{color:var(--dim); font-weight:700}
.lpHeadR{display:flex; gap:26px; flex-wrap:wrap; padding-top:6px}
.lpHeadR .kpi{background:transparent; border:none; padding:0; min-width:0; text-align:right}
/* A KPI value is one figure and must sit on one line. "2 /2" wrapped its
   denominator under its numerator and dragged the caption down with it, so
   one tile in a row of six sat a line lower than the other five. */
.lpHeadR .kpi b{font-size:19px; white-space:nowrap}
.lpHeadR .kpi span{margin-top:7px; white-space:nowrap}

/* The four commodity hues. Semantic tokens only — nothing invented, and
   nothing that collides with the arm colours (cyan is ANGEL SWARM, slate is
   the doctrinal arm) or with red, which on this page means dead. */
#lpBody .meter i.lpBlood{ background:var(--blue) }
#lpBody .meter i.lpPlasma{ background:var(--nav-teal) }
#lpBody .meter i.lpDrug{ background:var(--nav-violet) }
#lpBody .meter i.lpKit{ background:var(--nav-olive) }
#lpBody .lpStack b.lpBlood{ color:var(--blue) }
#lpBody .lpStack b.lpPlasma{ color:var(--nav-teal) }

.lpTabs{display:flex; align-items:stretch; width:100%; gap:2px; background:transparent;
  border-bottom:1px solid var(--line); overflow-x:auto;
  /* .lpDetail is a flex column, so this strip is a flex ITEM as well as a
     flex container. Without flex:none it has no intrinsic height to defend
     and the column shrinks it to a one-pixel rule — the five tabs stayed in
     the DOM, still reporting themselves 22px tall, and simply were not on
     screen. A tab strip must never be the thing that gives way. */
  flex:0 0 auto; min-height:42px}
.lpTab{appearance:none; background:transparent; border:0; border-bottom:2px solid transparent;
  margin-bottom:-1px; padding:10px 16px; cursor:pointer; white-space:nowrap;
  font:700 10px/1.2 var(--mono); letter-spacing:.13em; color:var(--faint)}
.lpTab:hover{color:var(--text)}
.lpTab[aria-selected="true"]{color:var(--text); border-bottom-color:var(--angel)}
.lpTab i{font-style:normal; margin-left:8px; font-size:9.5px; font-weight:400; color:var(--faint)}
.lpTab[aria-selected="true"] i{color:var(--angel)}

.lpPanel{border:1px solid var(--line); border-radius:10px; background:var(--panel);
  min-height:360px; overflow:auto}
.lpPanelIn{display:flex; flex-direction:column; gap:16px; padding:16px}

.lpSecH{display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; margin:0 0 12px;
  font:700 9.5px/1.3 var(--mono); letter-spacing:.12em; color:var(--dim)}
.lpSecH em{margin-left:auto; font:500 10px/1.4 var(--sans); font-style:normal;
  letter-spacing:0; color:var(--faint)}
.lpSecH em b{font-family:var(--mono); color:var(--text); font-weight:700}
.lpWrap{border:1px solid var(--line); border-radius:9px; overflow:hidden}
.lpFoot{margin:0; font:400 11px/1.75 var(--sans); color:var(--dim)}
.lpFoot b{color:var(--text); font-weight:600}

/* An empty tab states what nothing means here. It is never an empty box. */
.lpEmpty{margin:0; padding:26px 20px; border:1px dashed var(--line); border-radius:9px;
  font:400 11.5px/1.8 var(--sans); color:var(--dim)}
.lpEmpty b{display:block; margin-bottom:8px; font:700 10px/1.3 var(--mono);
  letter-spacing:.12em; color:var(--text)}

/* Rows that do not drill anywhere must not look as though they do. */
.lpStatic tbody tr{cursor:default}
.lpStatic tbody tr:hover{background:transparent}

/* Reach, one line per platform type held here. */
.lpReach{display:flex; flex-direction:column; gap:14px}
.lpRe{display:grid; grid-template-columns:minmax(0,1fr) auto; gap:20px; align-items:baseline;
  padding:0 0 14px; border-bottom:1px solid var(--line)}
.lpRe:last-of-type{border-bottom:0; padding-bottom:0}
.lpRe b{font:700 11.5px/1.4 var(--mono); color:var(--text)}
.lpRe span{display:block; margin-top:7px; font:400 10.5px/1.7 var(--sans); color:var(--dim)}
.lpRe em{font-style:normal; color:var(--text); font-family:var(--mono)}
.lpRe .lpReN{font:800 22px/1 var(--mono); color:var(--text); text-align:right; white-space:nowrap}
.lpRe .lpReN i{display:block; margin-top:7px; font:600 8.5px/1.3 var(--mono);
  letter-spacing:.1em; color:var(--faint); font-style:normal}
.lpWhy{display:flex; gap:5px; flex-wrap:wrap}
`;

  function injectCSS() {
    if (document.getElementById('lpCss')) return;
    const s = document.createElement('style');
    s.id = 'lpCss'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* Write only when the markup actually changed. This pane is rebuilt at the
     shell's 3 Hz table cadence and replacing identical HTML would move the
     table out from under the operator's cursor for nothing. */
  function paint(el, html) {
    if (!el) return;
    if (el._lpH === html) return;
    el._lpH = html; el.innerHTML = html;
  }

  /* ----------------------------------------------------------- the facts */

  /* The reach model, or null. Both halves of the allocator's own test have to
     be present: the radius function, which knows that combat radius is quoted
     at full payload and grows as the load falls, and the mass of the thing
     being carried. One unit of whole blood in its container is what
     scoreCoverage() asks about, and it is read from PAYLOADS rather than
     written here, so the two cannot drift apart. */
  function reachModel() {
    const eff = G('effectiveRadiusKm'), dist = G('dist'), P = thePayloads();
    if (!eff || !dist || !P || !P.BLOOD) return null;
    return { km: plat => eff(plat, P.BLOOD.kg), dist: dist, kg: P.BLOOD.kg };
  }

  /* Everything the two views read, gathered once so the list and the detail
     cannot disagree with each other about what is on the ground. */
  function survey() {
    const APP = theApp();
    if (!APP || !APP.armA || !APP.world || !APP.world.scn) return null;
    const A = APP.armA;
    if (!A.bases || !A.bases.length) return null;

    const C = theCount();
    /* The horizon, not the mission clock. COUNT.clock() is the clock while
       the run is going and the whole record once it has finished, so the last
       minutes of a completed run are not silently empty. Without COUNT the
       view the operator is scrubbed to is the honest fallback. */
    const hz = C ? C.clock() : (APP.finished ? Infinity : APP.tView);

    const open = (A.casualties || []).filter(c => c.tInjury <= hz && c.outcome === null);
    /* reachN is written by the allocator when a casualty is admitted to a
       tasking pass. Before that pass it is absent, and absent is not zero —
       printing 0 here would tell an officer that nobody is out of reach at
       the exact moment nothing has been checked. */
    const scored = open.filter(c => c.reachN !== undefined);

    const RM = reachModel();
    const cap = theCap();
    const cMax = coldMaxC();
    const queue = A.queue || [];

    const sites = A.bases.map((b, i) => {
      const idx = (b._idx === undefined ? i : b._idx);
      const scnB = APP.world.scn.bases ? APP.world.scn.bases[idx] : null;
      const mine = (A.drones || []).filter(d => d.baseIdx === idx);
      const ready = mine.filter(d => d.state === 'IDLE' && !d.held).length;

      /* Worst container in the yard. Warmer is worse: the transfusable band
         has a ceiling and no floor that matters here. A container only warms
         while it is out, so whether anything is actually carrying blood is
         carried alongside the figure rather than left for the reader to
         assume. */
      let worstCold = null, carrying = false;
      for (const d of mine) {
        if (typeof d.coldC === 'number' && (worstCold === null || d.coldC > worstCold)) worstCold = d.coldC;
        if (d.manifest && d.manifest.BLOOD) carrying = true;
      }

      /* Sorties flown FROM HERE, out of the transactional log rather than out
         of a per-aircraft counter, because the log is what COUNT.sorties()
         counts and these parts have to sum to that whole. */
      const ids = new Set(mine.map(d => d.id));
      const sorties = (A.sortieLog || []).filter(r => ids.has(r.droneId));

      /* Proposals are attributed to a site by the aircraft that would fly
         them — the same droneId approveProposal() dispatches on. */
      const pending = queue.filter(p => p.state === 'PENDING' && ids.has(p.droneId));
      const decided = queue.filter(p => p.state !== 'PENDING' && ids.has(p.droneId));

      /* This site's reach is the furthest of its own aircraft can fly and
         still get home carrying a unit. A site with nothing parked on it
         reaches nobody, which is a fact worth showing rather than a blank. */
      let radiusKm = null;
      if (RM) { radiusKm = 0; for (const d of mine) radiusKm = Math.max(radiusKm, RM.km(d.plat)); }
      const inReach = (RM && radiusKm !== null)
        ? scored.filter(c => RM.dist(b.x, b.y, c.x, c.y) <= radiusKm).length
        : null;

      return {
        i: idx, b, scnB, mine, ready, worstCold, carrying, sorties, ids,
        pending, decided, radiusKm, inReach,
        outReach: inReach === null ? null : scored.length - inReach
      };
    });

    return { APP, A, C, hz, open, scored, sites, RM, cap, cMax, queue };
  }

  /* -------------------------------------------------------------- pieces */

  function meter(n, capN, cls) {
    if (capN === null || capN === undefined || !isFinite(capN) || capN <= 0) return '';
    const w = Math.max(0, Math.min(100, (n / capN) * 100));
    return `<span class="meter sm"><i class="${cls}" style="width:${w.toFixed(0)}%"></i></span>`;
  }

  /* ONE COMMODITY, ONE COLOUR. Every bar on this page was drawn in the same
     green, so a row of whole blood, plasma and cold chain read as three
     identical bars and the eye had to go back to the column header every
     time to find out which was which. Colour is doing nothing if it is the
     same colour. Each item now carries its own hue at rest, and the amber
     still overrides it the moment the number is low — a warning has to win
     over a category, or the category has taught the eye to ignore amber. */
  const ITEM_HUE = { BLOOD: 'lpBlood', PLASMA: 'lpPlasma', TXA: 'lpDrug',
                     TQ_KIT: 'lpKit', CHEST_SEAL: 'lpKit' };

  function stockCell(n, item, cap) {
    /* One unit of whole blood left is the last transfusion this site can
       give without a resupply run, so it is called out at one and not at
       zero — by the time it is zero the decision it should have prompted is
       already behind you. */
    const low = (item === 'BLOOD' || item === 'PLASMA') && n <= 1;
    const cls = low ? 'warn' : (ITEM_HUE[item] || 'ok');
    return `<span class="lpStack">${meter(n, cap ? cap[item] : null, cls)}` +
      `<b class="mono${low ? ' warn' : ''}">${n0(n)}</b></span>`;
  }

  function coldCell(s) {
    if (s.worstCold === null) return '<span class="lpUnk">no aircraft here</span>';
    const max = s.cMax;
    let cls = '';
    if (max !== null && max !== undefined) cls = s.worstCold > max ? 'bad' : s.worstCold > max - 2 ? 'warn' : 'ok';
    const why = s.carrying
      ? 'Warmest container among the aircraft at this launch point.'
      : 'Nothing here is carrying blood; this is the held temperature on the ground.';
    return `<b class="mono${cls ? ' ' + cls : ''}" title="${esc(why)}">${n1(s.worstCold)} °C</b>`;
  }

  function sitingPill(s) {
    /* The scenario is the only place that knows whether a site is a ship or
       a patch of ground. Where it does not say, this does not guess. */
    if (!s.scnB) return '<span class="lpUnk">siting not recorded</span>';
    return s.scnB.afloat ? '<span class="pill info">AFLOAT</span>' : '<span class="pill">ASHORE</span>';
  }

  function empty(title, body) {
    return `<p class="lpEmpty"><b>${esc(title)}</b>${body}</p>`;
  }

  function secH(label, right) {
    return `<div class="lpSecH">${esc(label)}${right ? `<em>${right}</em>` : ''}</div>`;
  }

  /* ========================= THE RECORD DETAIL =========================
     The list opens a site in place. Clicking a row used to be the only way
     into a launch point and it replaced the whole pane; the row now opens an
     accordion beneath itself — the same component every other list in this
     console uses — and the "Open →" button still takes an officer to the full
     page when he wants the five long tabs rather than the summary.

     js/detail.js owns the shape, the keyboard and the ARIA. This owns what is
     inside it, which is figures, compact tables and status lines. */

  const DT = () => {
    const A = window.ANGEL;
    if (!A) return null;
    return (typeof A.get === 'function' ? A.get('detail') : null) || A.detail || null;
  };
  function dtSync() {
    const D = DT(); if (!D) return;
    requestAnimationFrame(() => { try { D.sync(); } catch (e) { /* nothing to do */ } });
  }
  function dtRow(id) { const D = DT(); return D ? D.rowAttrs('LAUNCHPOINTS', id) : ''; }

  function lpDetail(S, s, colspan) {
    const D = DT(); if (!D || !D.isOpen('LAUNCHPOINTS', s.i)) return '';
    const P = thePayloads(), cap = S.cap, cMax = S.cMax;
    const b = s.b;
    const held = s.mine.filter(d => d.held).length;
    const lost = s.mine.filter(d => d.state === 'LOST').length;
    const air = s.mine.filter(d => d.state === 'OUTBOUND' || d.state === 'RETURNING').length;
    const blood = b.stock ? b.stock.BLOOD : null;
    const lowBlood = blood !== null && blood !== undefined && blood <= 1;
    let coldCls = 'dim';
    if (s.worstCold !== null && cMax !== null && cMax !== undefined)
      coldCls = s.worstCold > cMax ? 'bad' : s.worstCold > cMax - 2 ? 'warn' : 'ok';

    const build_ready = () =>
      D.group('READINESS', 'lp.ready', D.figs([
        { k: 'ready to launch', v: n0(s.ready) + '<small>/' + n0(s.mine.length) + '</small>',
          cls: s.ready ? 'ok' : 'warn', meter: D.meter(s.mine.length ? (s.ready / s.mine.length) * 100 : null, s.ready ? 'ok' : 'warn') },
        { k: 'airborne', v: n0(air), cls: air ? 'ok' : 'dim' },
        { k: 'held by an operator', v: held ? n0(held) : null, cls: 'warn' },
        { k: 'lost', v: lost ? n0(lost) : null, cls: 'bad' },
        { k: 'sorties from here', v: n0(s.sorties.length) },
        { k: 'waiting on a person', v: n0(s.pending.length), cls: s.pending.length ? 'warn' : 'dim' }
      ])) +
      D.group('WHAT IT HOLDS', 'lp.holds', D.figs([
        { k: 'whole blood', v: blood === null || blood === undefined ? null : n0(blood),
          cls: lowBlood ? 'warn' : 'ok', meter: D.meter(cap && cap.BLOOD ? (blood / cap.BLOOD) * 100 : null, lowBlood ? 'warn' : 'ok') },
        { k: 'plasma', v: b.stock && b.stock.PLASMA !== undefined ? n0(b.stock.PLASMA) : null },
        { k: 'warmest container', v: s.worstCold === null ? null : n1(s.worstCold) + ' <small>°C</small>',
          cls: coldCls, note: s.carrying ? 'a container aboard is carrying blood' : 'nothing here is carrying blood' },
        { k: 'reach', v: s.radiusKm === null ? null : n0(s.radiusKm) + ' <small>km</small>',
          note: 'furthest its own aircraft can go and get home carrying a unit' },
        { k: 'in reach', v: s.inReach === null ? null : n0(s.inReach), cls: 'ok' },
        { k: 'out of reach', v: s.outReach === null ? null : n0(s.outReach), cls: s.outReach ? 'warn' : 'dim' }
      ])) +
      (!s.mine.length ? D.status('NO AIRFRAMES ASSIGNED — its shelf can be drawn on by nobody.', 'bad')
        : lowBlood ? D.status('ONE UNIT OF WHOLE BLOOD LEFT ON THIS SHELF', 'warn')
        : D.status('LAUNCH POINT SERVICEABLE · ' + n0(s.ready) + ' OF ' + n0(s.mine.length) + ' READY', 'ok'));

    const build_air = () => {
      const rows = s.mine.map(d => [
        `<b class="mono">${esc(tailOf(d))}</b>`,
        esc(d.plat && d.plat.label ? d.plat.label : d.type),
        `<span class="pill${d.state === 'LOST' ? ' bad' : d.state === 'IDLE' ? '' : ' info'}">${esc(d.state)}</span>` +
          (d.held ? ' <span class="pill warn">HELD</span>' : ''),
        taskedTo(S, d, P),
        `<span class="mono">${n0(d.sorties)}</span>`,
        `<span class="mono">${n0(d.delivered)}</span>`,
        `<b class="mono${d.manifest && d.manifest.BLOOD && cMax !== null
          ? (d.coldC > cMax ? ' bad' : d.coldC > cMax - 2 ? ' warn' : ' ok') : ''}">${n1(d.coldC)} °C</b>`
      ]);
      return D.group('AIRFRAMES BASED HERE', 'lp.aircraft', D.table([
        { h: 'Tail', w: '110px' }, { h: 'Platform', w: '160px' }, { h: 'State', w: '150px' },
        { h: 'Current task', w: '300px' }, { h: 'Sorties', w: '90px' }, { h: 'Delivered', w: '100px' },
        { h: 'Container', w: '120px' }
      ], rows) || D.empty('Nothing launches from this site. That is a laydown decision, not a tasking one.'));
    };

    const build_shelf = () => {
      const rows = ITEMS.map(k => {
        const on = b.stock && b.stock[k] !== undefined ? b.stock[k] : null;
        const sp = b.spent && b.spent[k] !== undefined ? b.spent[k] : null;
        const de = DESTROY_TRACKED[k] && b.wastedUnits ? (b.wastedUnits[k] || 0) : null;
        return [
          `${P && P[k] ? esc(P[k].label) : esc(k.replace(/_/g, ' '))}`,
          on === null ? '<span class="lpUnk">not held</span>' : stockCell(on, k, cap),
          `<span class="mono">${cap && cap[k] !== undefined ? n0(cap[k]) : '—'}</span>`,
          `<span class="mono">${sp === null ? '—' : n0(sp)}</span>`,
          de === null ? '<span class="lpUnk">not modelled</span>' : `<span class="mono${de ? ' warn' : ''}">${n0(de)}</span>`
        ];
      });
      return D.group('CLASS VIII ON THIS SHELF', 'lp.shelf', D.table([
        { h: 'Item', w: '230px' }, { h: 'On the shelf', w: '200px', sub: 'units here now' },
        { h: 'Capacity', w: '110px' }, { h: 'Issued', w: '110px', sub: 'onto an aircraft' },
        { h: 'Destroyed', w: '130px', sub: 'spent, reached nobody' }
      ], rows));
    };

    const build_act = () => {
      const rows = s.sorties.slice(-10).reverse().map(r => [
        `<span class="mono">${esc(String(r.id))}</span>`,
        `<span class="mono">${esc(fmtT(r.tLaunch))}</span>`,
        r.tReturn === null || r.tReturn === undefined ? '<span class="pill info">OUT</span>'
          : `<span class="mono">${esc(fmtT(r.tReturn))}</span>`,
        `<span class="mono">${n0(r.stops)}</span>`,
        `<span class="mono">${esc(r.actor)}</span>`
      ]);
      return D.group('DECISIONS OUTSTANDING', 'lp.pending', D.figs([
        { k: 'waiting on a person', v: n0(s.pending.length), cls: s.pending.length ? 'warn' : 'dim' },
        { k: 'already decided', v: n0(s.decided.length) },
        { k: 'sorties flown', v: n0(s.sorties.length) }
      ])) +
        D.group('LAST SORTIES FROM HERE, MOST RECENT FIRST', 'lp.log', D.table([
          { h: 'Sortie', w: '100px' }, { h: 'Launched', w: '120px' }, { h: 'Home', w: '120px' },
          { h: 'Stops', w: '100px' }, { h: 'Released by', w: '220px', sub: 'person or standing authority' }
        ], rows) || D.empty('Nothing has launched from this site in this run.'));
    };

    return D.region('LAUNCHPOINTS', s.i, colspan, {
      title: esc(b.name),
      sub: (s.scnB ? (s.scnB.afloat ? 'Afloat' : 'Ashore') : 'Siting not recorded') +
        ' · ' + n0(s.mine.length) + ' ' + plural(s.mine.length, 'airframe') + ' assigned',
      badges: sitingPill(s) + (s.ready ? `<span class="pill ok">${n0(s.ready)} READY</span>`
        : '<span class="pill warn">NONE READY</span>') +
        (lowBlood ? '<span class="pill warn">BLOOD LOW</span>' : ''),
      acts: `<button class="mini" data-lpsel="${s.i}">Full launch point →</button>`,
      tone: !s.mine.length ? 'bad' : lowBlood ? 'warn' : '',
      tabs: [
        { k: 'RDY', label: 'READINESS', build: build_ready },
        { k: 'AIR', label: 'AIRCRAFT', count: s.mine.length, build: build_air },
        { k: 'SUP', label: 'SHELF', build: build_shelf },
        { k: 'ACT', label: 'ACTIVITY', count: s.sorties.length, build: build_act }
      ],
      notes: ['An aircraft belongs to a launch point from the moment it is built and is never reassigned.']
    });
  }

  /* ============================== THE LIST ============================== */

  function renderList(S) {
    const cMax = S.cMax;
    const showReach = !!S.RM;
    const rows = S.sites.map(s => {
      s.cMax = cMax;
      const reachCells = !showReach ? '' : (
        s.inReach === null || !S.scored.length
          ? `<td colspan="2"><span class="lpUnk">not scored yet</span></td>`
          : `<td class="mono">${n0(s.inReach)}</td>` +
            `<td class="mono${s.outReach ? ' warn' : ''}">${n0(s.outReach)}</td>`
      );
      return `<tr ${dtRow(s.i)}>
        <td><span class="lpSite">${esc(s.b.name)}</span>
          <span class="lpWhere">${s.mine.length
            ? esc(s.mine.length + ' ' + plural(s.mine.length, 'airframe') + ' assigned')
            : 'no airframes assigned'}</span></td>
        <td>${sitingPill(s)}</td>
        <td><span class="lpQ">${n0(s.ready)}<i> / ${n0(s.mine.length)} ready</i></span></td>
        <td>${stockCell(s.b.stock.BLOOD, 'BLOOD', S.cap)}</td>
        <td>${stockCell(s.b.stock.PLASMA, 'PLASMA', S.cap)}</td>
        <td>${coldCell(s)}</td>
        <td class="mono${s.pending.length ? ' warn' : ''}">${n0(s.pending.length)}</td>
        <td class="mono">${n0(s.sorties.length)}</td>
        ${reachCells}
        <td style="text-align:right"><button class="mini" data-lpsel="${s.i}">Open →</button></td>
      </tr>` + lpDetail(S, s, showReach ? 11 : 9);
    }).join('');

    const total = S.sites.reduce((n, s) => n + s.sorties.length, 0);
    /* The whole beside the parts. COUNT.sorties(arm) is the figure every
       other pane prints; the column above it partitions the same log by
       site, so the two are checkable against each other from the chair. */
    const armTotal = S.C ? S.C.sorties(S.A) : null;
    const foot = [];
    const airframes = S.sites.reduce((n, s) => n + s.mine.length, 0);
    foot.push(`<b>${n0(S.sites.length)} launch ${plural(S.sites.length, 'point')}</b> in this operation, ` +
      `holding <b>${n0(airframes)}</b> ${plural(airframes, 'airframe')} between them.`);
    /* The parts against the whole, and the remainder named rather than
       buried. An airframe can be taken off the order of battle while it is
       on the ground; its sorties stay in the log and stop belonging to any
       site, so the column above can legitimately sum to less than the
       operation's total. Saying which is which costs one sentence and keeps
       a reviewer from finding the discrepancy on his own. */
    const orphan = (armTotal === null || armTotal === undefined) ? null : armTotal - total;
    foot.push(`<b>${n0(total)}</b> ${plural(total, 'sortie')} flown from them` +
      (orphan === null ? '.'
        : orphan > 0
          ? ` of the <b>${n0(armTotal)}</b> this operation has flown. The other <b>${n0(orphan)}</b> were flown ` +
            `by airframes no longer on the order of battle and belong to no site on this list.`
          : ` — every sortie this operation has flown launched from one of them.`));
    if (showReach) {
      foot.push(S.scored.length
        ? `Reach is the allocator's own test: can an aircraft based here fly to the casualty, and get home, ` +
          `carrying one unit of whole blood. <b>${n0(S.scored.length)}</b> of the ` +
          `<b>${n0(S.open.length)}</b> still on the ground ${plural(S.scored.length, 'has', 'have')} been scored ` +
          `against it. A soldier can be inside two sites' reach and is counted in both.`
        : `Reach is scored when a casualty is admitted to a tasking pass. None has been scored yet, ` +
          `so this pane says so rather than printing zero.`);
    } else {
      foot.push(`The reach columns are not shown: the geometry that decides them ` +
        `(<b>effectiveRadiusKm</b> and the mass of one unit of whole blood) is not loaded, and this pane ` +
        `will not substitute a radius of its own.`);
    }

    return `<div class="card">
      <div class="cardHead">LAUNCH POINTS — ANGEL SWARM
        <span class="proj">an aircraft belongs to a launch point · a launch point belongs to one operation</span></div>
      <div class="lpScroll"><table class="grid tight">
        <thead><tr>
          <th>Launch point</th>
          <th>Siting</th>
          <th>Aircraft<span class="thSub">ready / assigned</span></th>
          <th>Whole blood<span class="thSub">units on the shelf</span></th>
          <th>Plasma<span class="thSub">units on the shelf</span></th>
          <th>Cold chain<span class="thSub">warmest container</span></th>
          <th>Waiting<span class="thSub">proposals needing a person</span></th>
          <th>Sorties<span class="thSub">flown from here</span></th>
          ${showReach ? `<th>In reach<span class="thSub">still on the ground</span></th>
          <th>Out of reach<span class="thSub">still on the ground</span></th>` : ''}
          <th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <p class="lpNote">${foot.join(' ')}</p>
    </div>`;
  }

  /* ======================== THE DETAIL — HEADER ========================= */

  /* Badges: what this place is, what it holds, and how much of that is ready
     to launch. Every one of the three is read from the model. Where the
     scenario does not record a siting, the badge says so instead of picking
     one. There is no doctrinal "role" or "tempo" field on a base in this
     model, and this file does not invent either — what it shows instead is
     the fleet actually parked here and its readiness, which is the same
     question answered in the currency the model holds. */
  function headBadges(s) {
    const out = [sitingPill(s)];
    if (!s.mine.length) {
      out.push('<span class="pill warn">NO AIRFRAMES ASSIGNED</span>');
      return out;
    }
    const byType = [];
    for (const d of s.mine) {
      let row = byType.find(r => r.t === d.type);
      if (!row) { row = { t: d.type, n: 0, label: d.plat && d.plat.label ? d.plat.label : d.type }; byType.push(row); }
      row.n++;
    }
    out.push('<span class="pill">' + byType.map(r => esc(r.n + ' × ' + r.label.toUpperCase())).join(' · ') + '</span>');
    out.push(`<span class="pill${s.ready ? ' ok' : ' warn'}">${n0(s.ready)} OF ${n0(s.mine.length)} READY TO LAUNCH</span>`);
    const held = s.mine.filter(d => d.held).length;
    if (held) out.push(`<span class="pill warn">${n0(held)} HELD BY AN OPERATOR</span>`);
    const lost = s.mine.filter(d => d.state === 'LOST').length;
    if (lost) out.push(`<span class="pill bad">${n0(lost)} LOST</span>`);
    return out;
  }

  /* The model's own grid, named as such. x is kilometres east and y is
     kilometres south of the area's north-west corner — that is the sense the
     map renders in, and it is stated rather than left for the reader to
     infer. No MGRS reference is printed, because this pane cannot read the
     one the inspector builds and will not build a second, different one. */
  function headCoords(S, s) {
    const scn = S.APP.world.scn;
    const bits = [];
    if (scn && scn.aor) bits.push(esc(scn.aor));
    if (scn && scn.gridZone) bits.push('GRID ' + esc(scn.gridZone));
    const x = s.b.x, y = s.b.y;
    const pos = (typeof x === 'number' && typeof y === 'number' && isFinite(x) && isFinite(y))
      ? `<b>${n1(x)} km E</b> · <b>${n1(y)} km S</b> of the area's north-west corner`
      : '<span class="lpUnk">position not recorded</span>';
    const extent = (scn && scn.widthKm && scn.heightKm)
      ? ` · area ${n0(scn.widthKm)} × ${n0(scn.heightKm)} km` : '';
    const title = 'The simulation’s own area grid, in kilometres. It is not a survey or MGRS reference.';
    return `<span title="${esc(title)}">${bits.join(' · ')}${bits.length ? ' — ' : ''}${pos}${extent}</span>`;
  }

  function renderHead(S, s) {
    const armTotal = S.C ? S.C.sorties(S.A) : null;
    return `<div class="lpHead">
      <div class="lpHeadL">
        <button class="lpCrumb" data-lpsel="-1">← ALL LAUNCH POINTS</button>
        <h3>${esc(s.b.name)}</h3>
        <div class="lpBadges">${headBadges(s).join('')}</div>
        <p class="lpCoord">${headCoords(S, s)}</p>
      </div>
      <div class="lpHeadR">
        <div class="kpi"><b class="mono">${n0(s.ready)}<span style="color:var(--faint)">/${n0(s.mine.length)}</span></b>
          <span>AIRCRAFT READY</span></div>
        <div class="kpi"><b class="mono${s.b.stock.BLOOD <= 1 ? ' warn' : ''}">${n0(s.b.stock.BLOOD)}</b>
          <span>WHOLE BLOOD, UNITS</span></div>
        <div class="kpi"><b class="mono">${n0(s.b.stock.PLASMA)}</b><span>PLASMA, UNITS</span></div>
        <div class="kpi"><b class="mono${s.pending.length ? ' warn' : ''}">${n0(s.pending.length)}</b>
          <span>WAITING ON A PERSON</span></div>
        <div class="kpi"><b class="mono">${n0(s.sorties.length)}</b><span>SORTIES FROM HERE</span></div>
        ${armTotal !== null && armTotal !== undefined
          ? `<div class="kpi"><b class="mono" style="color:var(--dim)">${n0(armTotal)}</b>
              <span>SORTIES, WHOLE OPERATION</span></div>` : ''}
      </div>
    </div>`;
  }

  function tabCount(k, s) {
    if (k === 'AIR') return s.mine.length;
    if (k === 'APR') return s.pending.length;
    if (k === 'ACT') return s.sorties.length;
    return null;                    /* SUPPLIES and REACH are not countable in one number */
  }

  function renderTabs(s) {
    return `<div class="lpTabs" role="tablist">` + TABS.map(t => {
      const on = t.k === tab;
      const c = tabCount(t.k, s);
      return `<button class="lpTab" role="tab" aria-selected="${on ? 'true' : 'false'}"
        data-lptab="${t.k}">${t.label}${c === null ? '' : `<i>${n0(c)}</i>`}</button>`;
    }).join('') + `</div>`;
  }

  /* ========================= THE DETAIL — TABS ========================== */

  /* 1 · AIRCRAFT — what is parked here and what each airframe is doing. */
  function tabAircraft(S, s) {
    if (!s.mine.length) {
      return empty('NO AIRCRAFT ARE BASED AT THIS SITE',
        `Nothing launches from ${esc(s.b.name)}. Its shelf can be drawn on by nobody and its reach is nil. ` +
        `That is a laydown decision rather than a tasking one: an aircraft belongs to a launch point from ` +
        `the moment it is built and is never reassigned, so this site changes only if the order of battle does.`);
    }
    const P = thePayloads();
    const rows = s.mine.map(d => {
      const held = d.held ? ' <span class="pill warn">HELD</span>' : '';
      const cls = d.state === 'LOST' ? 'bad' : d.state === 'IDLE' ? '' : 'info';
      const carrying = d.manifest && d.manifest.BLOOD;
      let coldCls = '';
      if (carrying && S.cMax !== null && S.cMax !== undefined)
        coldCls = d.coldC > S.cMax ? 'bad' : d.coldC > S.cMax - 2 ? 'warn' : 'ok';
      return `<tr data-lpdrone="${d.id}">
        <td><b class="mono">${esc(tailOf(d))}</b></td>
        <td>${esc(d.plat && d.plat.label ? d.plat.label : d.type)}</td>
        <td><span class="pill${cls ? ' ' + cls : ''}">${esc(d.state)}</span>${held}</td>
        <td>${taskedTo(S, d, P)}</td>
        <td class="mono">${n0(d.sorties)}</td>
        <td class="mono">${n0(d.delivered)}</td>
        <td><b class="mono${coldCls ? ' ' + coldCls : ''}">${n1(d.coldC)} °C</b>${carrying ? '' :
          ' <span class="lpUnk">not carrying</span>'}</td>
      </tr>`;
    }).join('');
    return `<div>
      ${secH('AIRFRAMES BASED HERE', `<b>${n0(s.ready)}</b> of <b>${n0(s.mine.length)}</b> ready to launch`)}
      <div class="lpWrap lpScroll"><table class="grid tight">
        <thead><tr><th>Tail</th><th>Platform</th><th>State</th>
          <th>Tasked to<span class="thSub">the stop it is flying now</span></th>
          <th>Sorties<span class="thSub">flown by this airframe</span></th>
          <th>Delivered<span class="thSub">payloads into a responder's hands</span></th>
          <th>Container<span class="thSub">1–10 °C transfusable band</span></th></tr></thead>
        <tbody>${rows}</tbody></table></div>
    </div>
    <p class="lpFoot">A container only warms while it is out. An aircraft sitting on the pad holds at its
      loading temperature, so a figure here is a cold-chain reading only for the airframes that are
      carrying. Click a row to put that aircraft in the inspector.</p>`;
  }

  /* What an airframe is tasked to, read from the route it is actually
     flying. An idle aircraft is tasked to nothing, and saying so is the
     point of the column — an idle airframe beside a casualty out of reach is
     the argument this pane exists to make. */
  function taskedTo(S, d, P) {
    if (d.state === 'LOST') return '<span class="lpUnk">lost — not recoverable in this run</span>';
    if (d.state === 'IDLE') {
      return d.held
        ? '<span class="lpUnk">nothing — held on the ground by an operator</span>'
        : '<span class="lpUnk">nothing — on the pad, available</span>';
    }
    if (d.state === 'RETURNING') {
      return `<span class="lpUnk">returning to ${esc(s0(d))}${d.tHome == null ? '' : ' · ' + esc(fmtT(d.tHome))}</span>`;
    }
    const leg = d.route && d.route[d.legIdx];
    if (!leg) return '<span class="lpUnk">tasked; the current leg is not readable</span>';
    const c = (S.A.casualties || []).find(k => k.id === leg.casId);
    const pay = (P && P[leg.payloadKey] && P[leg.payloadKey].label) ? P[leg.payloadKey].label : leg.payloadKey;
    const left = (d.route.length - d.legIdx) - 1;
    return `<b class="mono">${esc(casRef(leg.casId))}</b>` +
      (c && c.cls ? ` <span class="pill${c.cls === 'IMMEDIATE' ? ' bad' : ''}">${esc(c.cls)}</span>` : '') +
      `<span class="lpWhere">${esc(pay)}${d.tArrive == null ? '' : ' · arrives ' + esc(fmtT(d.tArrive))}` +
      `${left > 0 ? ' · ' + n0(left) + ' further ' + plural(left, 'stop') + ' on this route' : ''}</span>`;
  }
  function s0(d) { return d.baseName || 'its launch point'; }

  /* 2 · SUPPLIES — the whole shelf, not the two headline items. */
  function tabSupplies(S, s) {
    const P = thePayloads();
    const cap = S.cap;
    const rows = ITEMS.map(k => {
      const on = (s.b.stock && s.b.stock[k] !== undefined) ? s.b.stock[k] : null;
      const sp = (s.b.spent && s.b.spent[k] !== undefined) ? s.b.spent[k] : null;
      const de = DESTROY_TRACKED[k] && s.b.wastedUnits ? (s.b.wastedUnits[k] || 0) : null;
      const label = (P && P[k]) ? P[k].label : k.replace(/_/g, ' ');
      const capN = cap ? cap[k] : null;
      const low = (k === 'BLOOD' || k === 'PLASMA') && on !== null && on <= 1;
      return `<tr>
        <td><b class="mono">${esc(label)}</b></td>
        <td>${on === null ? '<span class="lpUnk">not held at this site</span>'
          : `<span class="lpStack">${meter(on, capN, low ? 'warn' : 'ok')}` +
            `<b class="mono${low ? ' warn' : ''}">${n0(on)}</b>` +
            (capN ? `<span class="lpUnk">of ${n0(capN)}</span>` : '') + `</span>`}</td>
        <td class="mono">${sp === null ? '—' : n0(sp)}</td>
        <td class="mono${de ? ' warn' : ''}">${de === null
          ? '<span class="lpUnk" title="Only the cold-chain items can be destroyed in this model; anything else still aboard when an aircraft turns for home goes back on the shelf.">—</span>'
          : n0(de)}</td>
      </tr>`;
    }).join('');
    const noCap = !cap;
    return `<div>
      ${secH('WHAT IS ON THE SHELF', 'doctrine calls this Class VIII \u2014 blood and plasma are VIIIB, the rest VIIIA')}
      <div class="lpWrap lpScroll"><table class="grid tight lpStatic"><thead><tr><th>Item</th>
        <th>On hand<span class="thSub">units at this launch point, against what it can hold</span></th>
        <th>Issued<span class="thSub">put on an aircraft from here</span></th>
        <th>Destroyed<span class="thSub">cold chain lost or unrecovered</span></th></tr></thead>
        <tbody>${rows}</tbody></table></div>
    </div>
    <p class="lpFoot">Destroyed units were spent and reached nobody. Every one of them is a transfusion this
      launch point can no longer give.${noCap ? ' The bars are not drawn: the table of what a site can hold ' +
      '(<b>STOCK_CAP</b>) is not loaded, and a bar drawn against a capacity this file guessed at would be worse ' +
      'than no bar.' : ' A bar is the count against what this site can hold, not against what it started with.'}</p>`;
  }

  /* 3 · REACH — the tab that makes "no launch point close enough" concrete. */
  function tabReach(S, s) {
    if (!S.RM) {
      return empty('REACH CANNOT BE COMPUTED HERE',
        `The geometry that decides it — <b>effectiveRadiusKm</b> and the mass of one unit of whole blood — ` +
        `is not loaded. This pane will not substitute a radius of its own: a laydown argument made with an ` +
        `invented radius is worse than no argument at all.`);
    }
    const types = [];
    for (const d of s.mine) if (types.indexOf(d.type) < 0) types.push(d.type);
    if (!types.length) {
      return empty('NOTHING IS PARKED HERE, SO THIS SITE REACHES NOBODY',
        `Reach is a property of the airframes on the ground, not of the ground. This site's shelf is only ` +
        `reachable by an aircraft that would first have to fly to it, and no casualty can be served from here ` +
        `until one is based here.`);
    }
    const scored = S.scored;
    const lines = types.map(t => {
      const d = s.mine.find(x => x.type === t);
      const n = s.mine.filter(x => x.type === t).length;
      const km = S.RM.km(d.plat);
      const within = scored.filter(c => S.RM.dist(s.b.x, s.b.y, c.x, c.y) <= km).length;
      return `<div class="lpRe">
        <div><b>${n0(n)} × ${esc(d.plat.label)}</b>
          <span><em>${n1(km)} km</em> carrying one unit of whole blood
            (${esc(d.plat.speedKmh)} km/h · ${esc(d.plat.radiusKm)} km at full load ·
             ${esc(d.plat.maxRadiusKm)} km ferry · ${esc(d.plat.payloadKg)} kg ·
             ${esc(d.plat.slots)} slots)</span></div>
        <div class="lpReN">${scored.length ? n0(within) : '—'}
          <i>${scored.length ? 'ON THE GROUND, INSIDE THIS RADIUS' : 'NOT SCORED YET'}</i></div>
      </div>`;
    }).join('');
    const foot = scored.length
      ? `Of the <b>${n0(S.open.length)}</b> wounded still on the ground, <b>${n0(scored.length)}</b> have been
         scored for reach. <b>${n0(s.inReach)}</b> of them ${plural(s.inReach, 'is', 'are')} inside this launch
         point's furthest radius and <b>${n0(s.outReach)}</b> ${plural(s.outReach, 'is', 'are')} outside it —
         out of reach of this site, whatever is on its shelf. Combat radius is quoted at full payload and grows
         as the load falls, which is why the figure above is not the platform's headline number.`
      : `Reach is scored when a casualty is admitted to a tasking pass, and none has been yet. The radii above
         are a property of the laydown and are true now; the counts beside them are not yet known, so they are
         not printed.`;
    return `<div>
      ${secH('WHO THIS LAUNCH POINT CAN FLY TO, AND GET HOME FROM', 'the allocator’s own test, narrowed to this site')}
      <div class="lpReach">${lines}</div>
    </div>
    <p class="lpFoot">${foot}</p>`;
  }

  /* 4 · APPROVALS — what this site's aircraft are waiting on a person for. */
  function tabApprovals(S, s) {
    const byDrone = new Map(s.mine.map(d => [d.id, d]));
    const P = thePayloads();
    const decided = s.decided;
    const tally = { APPROVED: 0, REJECTED: 0, EXPIRED: 0 };
    for (const p of decided) if (tally[p.state] !== undefined) tally[p.state]++;
    const record = decided.length
      ? `<p class="lpFoot">Within the proposal record the run still holds, <b>${n0(tally.APPROVED)}</b> raised by
         this site ${plural(tally.APPROVED, 'was', 'were')} approved, <b>${n0(tally.REJECTED)}</b> rejected and
         <b>${n0(tally.EXPIRED)}</b> expired before anyone acted. That record is trimmed to its most recent
         entries as a run goes on, so these are counts within what is retained — not the operation's lifetime
         totals, which are not kept per launch point.</p>`
      : '';

    if (!s.mine.length) {
      return empty('NOTHING FROM HERE IS WAITING ON A PERSON',
        `No aircraft are based at ${esc(s.b.name)}, so this site raises no proposals at all. A proposal belongs ` +
        `to the airframe that would fly it, and there is no airframe here to fly one.`);
    }
    if (!s.pending.length) {
      return empty('NOTHING FROM HERE IS WAITING ON A PERSON',
        `Every sortie this site has planned so far cleared the standing authorisation bar, so it launched under ` +
        `delegated authority and was written to the audit log. A proposal appears here only when the machine ` +
        `reaches a named limit — marginal benefit, a threat crossing, the last unit of blood or plasma on this ` +
        `shelf, or a walking-wounded run while an IMMEDIATE inside reach is unassigned.`) + record;
    }

    const rows = s.pending.slice().sort((a, b) => (b.tRaised || 0) - (a.tRaised || 0)).map(p => {
      const d = byDrone.get(p.droneId);
      const urgent = p.leadDeadline !== null && p.leadDeadline !== undefined && p.leadDeadline < 12;
      const stops = (p.route || []).map(l => casRef(l.casId));
      const pays = (p.payloads && p.payloads.length)
        ? p.payloads.join(' + ')
        : (p.route || []).map(l => (P && P[l.payloadKey] ? P[l.payloadKey].label : l.payloadKey)).join(' + ');
      const why = (p.reasons || []).map(r =>
        `<span class="pill ${r.indexOf('THREAT') === 0 ? 'bad' : r === 'LOW CONFIDENCE' ? '' : 'warn'}">${esc(r)}</span>`).join('');
      return `<tr>
        <td class="mono">${p.tRaised == null ? '—' : esc(fmtT(p.tRaised))}</td>
        <td><b class="mono">${d ? esc(tailOf(d)) : '—'}</b>
          <span class="lpWhere">proposal ${esc(String(p.id))}</span></td>
        <td><b class="mono">${esc(stops.join(', ')) || '—'}</b>
          <span class="lpWhere">${esc(pays || '')}</span></td>
        <td><span class="lpWhy">${why || '<span class="lpUnk">no ground recorded</span>'}</span></td>
        <td class="mono${urgent ? ' bad' : ''}">${p.leadDeadline === null || p.leadDeadline === undefined
          ? '—' : n0(p.leadDeadline) + ' min'}</td>
        <td class="mono">${p.gain === null || p.gain === undefined ? '—' : (p.gain >= 0 ? '+' : '−') + n0(Math.abs(p.gain))}</td>
        <td class="act"><button class="mini ok" data-approve="${p.id}">Approve</button>
          <button class="mini" data-reject="${p.id}">Reject</button></td>
      </tr>`;
    }).join('');

    return `<div>
      ${secH('WAITING ON A PERSON', `<b>${n0(s.pending.length)}</b> raised by aircraft based here`)}
      <div class="lpWrap lpScroll"><table class="grid tight lpStatic">
        <thead><tr><th>Raised</th>
          <th>Aircraft<span class="thSub">the airframe that would fly it</span></th>
          <th>Serves<span class="thSub">stops on the planned route</span></th>
          <th>Why a person was asked<span class="thSub">the named ground, not a score</span></th>
          <th>Time left<span class="thSub">for the lead casualty, when this was raised</span></th>
          <th>Modelled benefit<span class="thSub">the allocator's own score</span></th>
          <th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>
    </div>
    <p class="lpFoot">A proposal goes stale on its own: the casualty resolves, the aircraft is committed
      elsewhere, or it simply ages out. Approving one launches it against this site's shelf and writes both the
      decision and the person who made it to the audit log.</p>${record}`;
  }

  /* 5 · ACTIVITY — what has actually flown from here. */
  function tabActivity(S, s) {
    const log = S.A.sortieLog;
    if (!log) {
      return empty('THE SORTIE RECORD IS NOT AVAILABLE',
        `Without the transactional log there is no honest history of what flew from here, and a table of ` +
        `aggregates dressed up as events would be the worst thing on this page. Nothing is shown instead.`);
    }
    if (!s.sorties.length) {
      return empty('NOTHING HAS LAUNCHED FROM THIS SITE YET',
        s.mine.length
          ? `${n0(s.mine.length)} ${plural(s.mine.length, 'airframe')} ${plural(s.mine.length, 'is', 'are')} based ` +
            `here and nothing has launched yet. The record fills as sorties launch; it is the sortie log ` +
            `itself, not a summary of one.`
          : `No aircraft are based here, so no sortie can have launched from here.`);
    }
    const byDrone = new Map(s.mine.map(d => [d.id, d]));
    const dl = S.A.deliveryLog || [];
    const rows = s.sorties.slice().sort((a, b) => (b.tLaunch || 0) - (a.tLaunch || 0)).slice(0, 20)
      .map(r => {
        const d = byDrone.get(r.droneId);
        const legs = dl.filter(x => x.sortieId === r.id);
        const ok = legs.filter(x => x.ok).length;
        const bad = legs.length - ok;
        const flying = r.tReturn == null;
        return `<tr>
          <td class="mono">${esc(String(r.id))}</td>
          <td><b class="mono">${d ? esc(tailOf(d)) : '—'}</b></td>
          <td class="mono">${r.tLaunch == null ? '—' : esc(fmtT(r.tLaunch))}</td>
          <td class="mono">${flying ? '<span class="pill info">IN FLIGHT</span>' : esc(fmtT(r.tReturn))}</td>
          <td class="mono">${r.stops == null ? '—' : n0(r.stops)}</td>
          <td class="mono">${n0(ok)}</td>
          <td class="mono${bad ? ' warn' : ''}">${n0(bad)}</td>
          <td>${esc(r.actor || 'STANDING AUTHORITY')}${r.proposalId != null
            ? ` <span class="lpWhere">proposal ${esc(String(r.proposalId))}</span>` : ''}</td>
        </tr>`;
      }).join('');
    const shown = Math.min(20, s.sorties.length);
    return `<div>
      ${secH('SORTIES FLOWN FROM HERE', shown < s.sorties.length
        ? `<b>${n0(shown)}</b> most recent of <b>${n0(s.sorties.length)}</b>`
        : `<b>${n0(s.sorties.length)}</b> in the record`)}
      <div class="lpWrap lpScroll"><table class="grid tight lpStatic">
        <thead><tr><th>Sortie</th><th>Aircraft</th><th>Launched</th><th>Returned</th>
          <th>Stops<span class="thSub">casualties on the route</span></th>
          <th>Administered<span class="thSub">payloads into a responder's hands</span></th>
          <th>Failed<span class="thSub">flown, nothing delivered</span></th>
          <th>Authority<span class="thSub">who released it</span></th></tr></thead>
        <tbody>${rows}</tbody></table></div>
    </div>
    <p class="lpFoot">Rows are the sortie log and the delivery log joined on the sortie number — what was flown
      and what came of it, not a summary of either.</p>`;
  }

  function tabBody(S, s) {
    try {
      if (tab === 'SUP') return tabSupplies(S, s);
      if (tab === 'RCH') return tabReach(S, s);
      if (tab === 'APR') return tabApprovals(S, s);
      if (tab === 'ACT') return tabActivity(S, s);
      return tabAircraft(S, s);
    } catch (err) {
      console.warn('LAUNCHPOINTS tab', tab, err);
      return empty('THIS TAB COULD NOT BE BUILT',
        'Something it reads is not in the shape this pane expects. Nothing invented has been put in its place.');
    }
  }

  function renderDetail(S, s) {
    s.cMax = S.cMax;
    return `<div class="lpDetail">
      ${renderHead(S, s)}
      ${renderTabs(s)}
      <div class="lpPanel"><div class="lpPanelIn">${tabBody(S, s)}</div></div>
    </div>`;
  }

  /* =============================== RENDER =============================== */

  function build() {
    const S = survey();
    /* No run, no bases, no pane. The head of the section carries an honest
       standing line, so an empty body is the right thing to leave behind
       rather than a sentence this file made up about a run that may be one
       second from existing. */
    if (!S) return '';
    if (sel >= 0) {
      const s = S.sites.find(x => x.i === sel);
      /* A launch point can go away under the operator — a scenario change
         rebuilds the arms. Fall back to the list rather than to nothing. */
      if (!s) { sel = -1; tab = 'AIR'; return renderList(S); }
      return renderDetail(S, s);
    }
    return renderList(S);
  }

  function renderLaunchPoints() {
    const host = document.getElementById('lpBody');
    if (!host) return;
    paint(host, build());
    dtSync();
  }

  /* ------------------------------------------------------------- binding */
  function bind() {
    if (document._lpBound) return;
    document._lpBound = true;
    document.addEventListener('click', e => {
      const host = document.getElementById('lpBody');
      if (!host) return;

      /* The tab strip. Read before the selection control, because a tab is
         not a change of site and must not be allowed to look like one. */
      const tb = e.target.closest ? e.target.closest('[data-lptab]') : null;
      if (tb && host.contains(tb)) {
        e.preventDefault();
        const k = tb.getAttribute('data-lptab');
        if (TABS.some(t => t.k === k)) tab = k;
        const APP = theApp(), render = G('render');
        if (APP) APP._paneForce = true;
        renderLaunchPoints();
        if (render) render();
        return;
      }

      const pick = e.target.closest ? e.target.closest('[data-lpsel]') : null;
      if (pick && host.contains(pick)) {
        e.preventDefault();
        const raw = Number(pick.getAttribute('data-lpsel'));
        const next = Number.isNaN(raw) ? -1 : raw;
        /* A different site is a different set of questions: the tab an
           officer was reading about one launch point is not one he has asked
           about the next. Returning to the list resets it too, so opening
           any site always opens on what is parked there. */
        if (next !== sel) tab = 'AIR';
        sel = next;
        /* Force the next frame rather than waiting on the 320 ms table
           cadence: a click that takes a third of a second to answer reads as
           a click that did not land. */
        const APP = theApp(), render = G('render');
        if (APP) APP._paneForce = true;
        renderLaunchPoints();
        if (render) render();
        return;
      }

      /* An aircraft row opens that airframe's own record on the fleet pane —
         the accordion beneath its own row, in the main column. It used to
         hand the airframe to the inspector rail on the far left, which is the
         routing this pass exists to stop. Where page-grouped is not loaded
         the selection is still written, so the rail remains the fallback
         rather than the click doing nothing at all. */
      const ac = e.target.closest ? e.target.closest('[data-lpdrone]') : null;
      if (ac && host.contains(ac)) {
        const id = Number(ac.getAttribute('data-lpdrone'));
        if (Number.isNaN(id)) return;
        const A = window.ANGEL;
        const gp = A && typeof A.get === 'function' ? A.get('grouped') : null;
        if (gp && typeof gp.open === 'function') { gp.open('drone', id); return; }
        const APP = theApp(), render = G('render');
        if (APP) {
          APP.sel = { kind: 'drone', id: id };
          APP._paneForce = true;
          if (render) render();
        }
      }
    });
  }

  /* ----------------------------------------------------------- bootstrap */
  if (window.ANGEL && typeof ANGEL.ready === 'function') {
    ANGEL.ready('page-launchpoints', async () => {
      if (!theApp()) {
        if (ANGEL.setStatus) ANGEL.setStatus('page-launchpoints', 'withheld', 'application shell not present');
        return null;
      }
      ANGEL.views = ANGEL.views || {};
      injectCSS();
      bind();
      ANGEL.views.LAUNCHPOINTS = () => {
        try { renderLaunchPoints(); } catch (err) { console.warn('LAUNCHPOINTS', err); }
      };
      /* The contract in app.js: a section marked data-placeholder is a mount
         point waiting for a module, and roleUnbuilt() keeps an operator from
         being dropped on it. Registering the renderer already answers that
         test, but the attribute is also read as documentation by anyone
         grepping the markup, and leaving it on a pane that is now built is a
         lie in the source. Taking it off here — not in index.html, which
         other authors are editing — keeps this module's whole footprint to
         one file. */
      const sec = document.querySelector('[data-pane="LAUNCHPOINTS"]');
      if (sec) sec.removeAttribute('data-placeholder');

      if (ANGEL.mark) ANGEL.mark('page-launchpoints ready', { views: ['LAUNCHPOINTS'] });
      return true;
    });
  }
})();
