/* ==========================================================================
   LIVE CASUALTIES — the canvas's isCas block, on the real register
   ==========================================================================
   The canvas draws a GROUP BY control, three summary counts, and casualties
   grouped under site headers with a verdict on each group. This is that
   shape, drawn from the running simulation. None of the canvas's own figures
   survive: they were placeholders for spacing.

   WHAT A BAR MEANS. The bar ends at that casualty's physiological deadline —
   `tInjury + deadlineMin` — measured against a fixed sixty-minute window so
   two bars on the screen are comparable. The filled segment inside it is the
   transit time of the launch point that reaches them soonest, taken from the
   allocator's own reach model (ANGEL.get('grouped')), not from a second
   implementation that could disagree with the allocator.

   `deadlineMin >= 9000` is the simulation saying "not time-critical", and
   those casualties are the whole of DEADLINE NOT ASSERTABLE: they are drawn
   without a bar rather than given a deadline they do not have.

   STALE TELEMETRY IS ANNOTATED, NOT ASSERTED AWAY. The canvas draws a row
   whose reading has gone cold as "no deadline asserted, no sortie tasked".
   This simulation does not work that way — the physiological clock runs from
   the minute of wounding and the allocator tasks against it whatever the age
   of the last wearable reading — so a row whose reading is old says exactly
   that, and the reported reserve is dropped rather than quoted as if it were
   current. Claiming a withheld tasking that did not happen would be a lie on
   the screen, which is worse than departing from the drawing.

   THREE OLD DESTINATIONS LIVE HERE. shell.js's SECTIONS maps SUPPLY, FLEET
   and LAUNCHPOINTS onto this page; the tab strip below is how they are
   reached, and each one still drives the engine's own view state so a
   deep-link or a keyboard route arrives in the same place.
   ========================================================================== */
(function () {
  'use strict';

  const D = () => window.DSHELL;
  const TABS = ['CASUALTIES', 'SUPPLY', 'FLEET', 'LAUNCHPOINTS'];
  const TAB_LABEL = { CASUALTIES:'CASUALTIES', SUPPLY:'SUPPLY', FLEET:'FLEET',
                      LAUNCHPOINTS:'LAUNCH POINTS' };
  const S = { tab: 'CASUALTIES', grp: 'LOCATION', all: false };

  const WINDOW_MIN = 60;                       /* the width of the board      */
  const BAR_MAX = 44;                          /* reserve a bounded annotation */
                                               /* lane beside the timeline     */
  const STALE_MIN = 2;                         /* as page-dash reads it       */
  const CAP = 6;                               /* rows drawn per group        */

  const INJ = { TRUNCAL_HEM:'truncal haem', JUNCTIONAL_HEM:'junctional haem',
                EXTREMITY_HEM:'extremity haem', AIRWAY:'airway', MINOR:'minor',
                OTHER:'other' };
  const NEED = { BLOOD:'whole blood', PLASMA:'FDP', TXA:'TXA',
                 TQ_KIT:'haemorrhage kit', CHEST_SEAL:'chest seal' };

  /* Constants declared with `const` in another classic script are in the
     global lexical scope but not on `window`, so they are reached by name
     with a guard rather than through window[]. */
  const callOf = d => {
    if (!d) return '—';
    const cs = (typeof CALLSIGN !== 'undefined') ? CALLSIGN[d.type] : null;
    return (cs || (d.plat && d.plat.label) || 'AC') + '-' + String(d.id).padStart(2, '0');
  };
  const payLabel = k => {
    if (typeof PAYLOADS !== 'undefined' && PAYLOADS[k]) return PAYLOADS[k].label;
    return k;
  };
  const roleOf = c => {
    if (typeof ROLES !== 'undefined' && ROLES[c.role])
      return ROLES[c.role].short || ROLES[c.role].label || c.role;
    return c.role || '';
  };
  const placeOf = (scn, c) => {
    const f = (typeof window.placeNameAt === 'function') ? window.placeNameAt : null;
    if (!f) return (c.unitName || 'THE FORWARD SECTOR').toUpperCase();
    try { return String(f(scn, c.x, c.y)).toUpperCase(); }
    catch (e) { return (c.unitName || 'THE FORWARD SECTOR').toUpperCase(); }
  };

  const stale = (L, c) => (L.now - c.tPinged) > STALE_MIN;
  const pct = v => (Math.max(0.04, Math.min(1, v)) * 100).toFixed(1) + '%';

  /* ---- one delegated listener, bound once ------------------------------- */
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-cas]');
    if (!b) return;
    const bits = String(b.dataset.cas).split(':');
    if (bits[0] === 'tab') {
      S.tab = bits[1];
      try { if (typeof window.goView === 'function') window.goView(S.tab); } catch (e) {}
    } else if (bits[0] === 'grp') S.grp = bits[1];
    else if (bits[0] === 'all') S.all = !S.all;
    if (D()) D().paint();
  });

  window.DPAGES = window.DPAGES || {};
  window.DPAGES.cas = function (L) {
    const noun = S.tab === 'CASUALTIES' ? 'casualties'
      : S.tab === 'SUPPLY' ? 'launch points'
      : S.tab === 'FLEET' ? 'airframes' : 'launch points';
    D().searchContext(S.tab === 'CASUALTIES'
      ? 'Search casualty, unit, injury, need…'
      : S.tab === 'SUPPLY'
        ? 'Search launch point or stock…'
        : S.tab === 'FLEET'
          ? 'Search call, platform, base, state…'
          : 'Search launch point or siting…', noun);
    if (!L) return `<div class="d-head"><div><h1>Live Casualties</h1>
      <p>Waiting for the run. Nothing is on telemetry yet.</p></div></div>`;
    const esc = D().esc;

    const open = L.open;
    const rowById = new Map(L.timed.map(r => [r.c.id, r]));
    const missed = L.timed.filter(r => r.unreachable || (r.slack !== null && r.slack < 0)).length;
    const inside = L.timed.length - missed;
    const notAssert = open.filter(c => c.deadlineMin >= 9000).length;

    const head = `<div class="d-head">
        <div><h1>Live Casualties</h1>
        <p>${open.length} ${open.length === 1 ? 'casualty' : 'casualties'} on wearable telemetry.
        Each bar ends at that soldier&rsquo;s physiological deadline.</p></div>
        <div class="pa-grpby">
          <span>GROUP BY</span>
          <div class="d-seg">
            <button type="button" class="${S.grp === 'LOCATION' ? 'on' : ''}" data-cas="grp:LOCATION">LOCATION</button>
            <button type="button" class="${S.grp === 'DEADLINE' ? 'on' : ''}" data-cas="grp:DEADLINE">DEADLINE</button>
          </div>
        </div></div>`;

    const tabs = `<div class="pa-tabs"><div class="d-seg">${TABS.map(t =>
        `<button type="button" class="${S.tab === t ? 'on' : ''}" data-cas="tab:${t}">${TAB_LABEL[t]}</button>`
      ).join('')}</div>
      <span class="d-meta">T+${Math.floor(L.now)} MIN &middot; ${esc(L.scn.name || '')}</span></div>`;

    if (S.tab === 'SUPPLY')       return head + tabs + supplyTab(L);
    if (S.tab === 'FLEET')        return head + tabs + fleetTab(L);
    if (S.tab === 'LAUNCHPOINTS') return head + tabs + lpTab(L);

    const visibleOpen = open.filter(c => casualtyMatches(L, c, rowById.get(c.id)));
    const tiles = `<div class="d-tiles pa-t3">
        <div class="d-tile${missed ? ' crit d-death' : ''}">
          <span class="d-lab">MISSED IF NOTHING CHANGES</span>
          <div class="d-val"><span class="d-fig">${missed}</span>
          <span class="d-unit">${missed === 1 ? 'casualty' : 'casualties'}</span></div></div>
        <div class="d-tile${inside ? ' good' : ''}">
          <span class="d-lab">INSIDE DEADLINE</span>
          <div class="d-val"><span class="d-fig">${inside}</span>
          <span class="d-unit">reached in time on present reach</span></div></div>
        <div class="d-tile">
          <span class="d-lab">DEADLINE NOT ASSERTABLE</span>
          <div class="d-val"><span class="d-fig">${notAssert}</span>
          <span class="d-unit">no deadline claimed</span></div></div>
      </div>`;

    return head + tabs + tiles + `<div class="pa-pad">${board(L, visibleOpen, rowById)}</div>`;
  };
  /* The browser regression renders representative states through the same
     function as the live board instead of maintaining a lookalike fixture. */
  if (new URL(location.href).searchParams.get('casualty-layout-selftest') === '1')
    window.DPAGES.cas.renderRow = row;

  function casualtyMatches(L, c, r) {
    const need = (c.needs || []).map(k => NEED[k] || k);
    return D().matches(D().casId(c), c.id, c.cls, roleOf(c), c.unitName,
      placeOf(L.scn, c), c.injury, INJ[c.injury], c.needs, need,
      c.assignedTo, r && r.site && r.site.b.name,
      r && r.unreachable ? 'unreachable no asset' : '',
      c.assignedTo != null ? 'tasked' : 'queued');
  }

  /* ---- the board -------------------------------------------------------- */
  function board(L, open, rowById) {
    const esc = D().esc;
    if (D().query() && !open.length) return D().noMatches('casualties');
    const groups = (S.grp === 'DEADLINE') ? byDeadline(L, open, rowById)
                                          : byLocation(L, open, rowById);
    let hidden = 0;
    const body = groups.map(g => {
      const shown = S.all ? g.list : g.list.slice(0, CAP);
      hidden += g.list.length - shown.length;
      return groupHead(L, g) + shown.map(c => row(L, c, rowById.get(c.id))).join('') +
        (g.list.length > shown.length
          ? `<div class="pa-more">+ ${g.list.length - shown.length} further in this group</div>` : '');
    }).join('');

    const pend = pending(L).length;
    return `<div class="pa-board">
        <div class="pa-ruler"><div></div><div class="pa-ruler-lanes">
          <div class="pa-ruler-ticks"><span>NOW</span><span>+10</span><span>+20</span>
            <span>+30</span><span>+40</span><span>+50 MIN</span></div><div></div>
        </div></div>
        ${body || `<div class="pa-more" style="padding-left:26px">Nothing is open. No casualty is inside a deadline this system holds.</div>`}
        <div class="pa-foot">
          <span class="t">${hidden ? hidden + ' further ' + (hidden === 1 ? 'casualty' : 'casualties') + ' not drawn' : 'Every open casualty is drawn'}
            &middot; ${groups.length} ${groups.length === 1 ? 'group' : 'groups'}</span>
          <div style="display:flex;gap:9px;align-items:center">
            <button class="d-btn" type="button" data-cas="all">${S.all ? 'SHOW FEWER' : 'SHOW EVERY ROW'}</button>
            ${pend ? `<button class="pa-go" type="button" data-page="dec">AUTHORISE ${pend} ${pend === 1 ? 'SORTIE' : 'SORTIES'} &rarr;</button>` : ''}
          </div>
        </div></div>`;
  }

  function pending(L) {
    return ((L.A && L.A.queue) || []).filter(p => p.state === 'PENDING');
  }

  /* ---- grouping --------------------------------------------------------- */
  function byLocation(L, open, rowById) {
    const m = new Map();
    for (const c of open) {
      const k = placeOf(L.scn, c);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(c);
    }
    return order([...m].map(([k, list]) => ({ key: k, list })), rowById);
  }

  const BUCKETS = [
    { key: 'INSIDE 10 MINUTES', t: 10 }, { key: '10 TO 30 MINUTES', t: 30 },
    { key: '30 TO 60 MINUTES', t: 60 },  { key: 'BEYOND 60 MINUTES', t: Infinity }
  ];
  function byDeadline(L, open, rowById) {
    const m = new Map();
    const put = (k, c) => { if (!m.has(k)) m.set(k, []); m.get(k).push(c); };
    for (const c of open) {
      const r = rowById.get(c.id);
      if (!r) { put('NO DEADLINE ASSERTED', c); continue; }
      put((BUCKETS.find(b => r.left <= b.t) || BUCKETS[3]).key, c);
    }
    const out = [];
    for (const b of BUCKETS) if (m.has(b.key)) out.push({ key: b.key, list: m.get(b.key) });
    if (m.has('NO DEADLINE ASSERTED')) out.push({ key: 'NO DEADLINE ASSERTED', list: m.get('NO DEADLINE ASSERTED') });
    for (const g of out) g.list.sort((a, b) => sortKey(rowById, a) - sortKey(rowById, b));
    return out;
  }

  const sortKey = (rowById, c) => {
    const r = rowById.get(c.id);
    return r ? r.left : 1e6;
  };
  function order(groups, rowById) {
    for (const g of groups) {
      g.list.sort((a, b) => sortKey(rowById, a) - sortKey(rowById, b));
      g.min = sortKey(rowById, g.list[0]);
    }
    return groups.sort((a, b) => a.min - b.min);
  }

  /* ---- a group header, with the group's verdict ------------------------- */
  function groupHead(L, g) {
    const esc = D().esc;
    const live = g.list.map(c => L.timed.find(r => r.c.id === c.id) || null).filter(Boolean);
    const breach = live.filter(r => r.unreachable || (r.slack !== null && r.slack < 0));
    const unreach = live.filter(r => r.unreachable);
    const tasked = g.list.filter(c => c.assignedTo != null).length;
    const st = g.list.filter(c => stale(L, c)).length;

    const ids = new Set(g.list.map(c => c.id));
    const esc_n = pending(L).filter(p => p.route.some(l => ids.has(l.casId))).length;

    const bits = [g.list.length + ' ' + (g.list.length === 1 ? 'casualty' : 'casualties')];
    if (tasked) bits.push(tasked + ' on tasking');
    if (st) bits.push(st + ' ' + (st === 1 ? 'reading' : 'readings') + ' over 2 min old');

    let v = '<span class="v dim">NO DEADLINE ASSERTED HERE</span>';
    if (live.length && unreach.length === live.length)
      v = '<span class="v bad">OUT OF RANGE OF EVERY LAUNCH POINT</span>';
    else if (breach.length)
      v = `<span class="v bad">${breach.length} WILL BE MISSED IF NOTHING CHANGES</span>`;
    else if (esc_n)
      v = `<span class="v esc" data-page="dec">${esc_n} ${esc_n === 1 ? 'DECISION' : 'DECISIONS'} AWAITING AUTHORITY &rarr;</span>`;
    else if (live.length)
      v = `<span class="v ok">${live.length === 1 ? 'INSIDE DEADLINE' : 'ALL INSIDE DEADLINE'} ON PRESENT REACH</span>`;

    return `<div class="pa-ghead${breach.length ? ' breach' : ''}">
      <div class="nm">
        ${S.grp === 'LOCATION' ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 22s7.5-6.6 7.5-12A7.5 7.5 0 0 0 4.5 10c0 5.4 7.5 12 7.5 12Z" fill="${
          breach.length ? 'var(--d-red-mark)' : 'oklch(0.6 0.008 250)'}"/><circle cx="12" cy="10" r="2.8" fill="oklch(0.2 0.01 250)"/></svg>` : ''}
        <b>${esc(g.key)}</b><span class="c">${esc(bits.join(' · '))}</span></div>
      ${v}</div>`;
  }

  /* ---- one casualty ----------------------------------------------------- */
  function row(L, c, r) {
    const esc = D().esc, MIN = D().MIN;
    const id = D().casId(c);
    const rl = roleOf(c);
    const need = (c.needs || []).slice(0, 2).map(k => NEED[k] || k).join(' + ');
    const sub = [INJ[c.injury] || String(c.injury || '').toLowerCase(),
                 stale(L, c) ? null : 'reserve ' + Math.round(c.reportedCrm) + '%',
                 need].filter(Boolean).join(' · ');
    const cls = c.cls === 'IMMEDIATE' ? 'imm' : c.cls === 'DELAYED' ? 'del' : 'exp';
    const left = `<div class="pa-id ${cls}">
        <span class="n">${esc(id)} &middot; ${esc(c.cls)}${rl ? ' &middot; ' + esc(rl) : ''}</span>
        <span class="s">${esc(sub)}</span></div>`;

    return `<div class="pa-row${(r && (r.unreachable || (r.slack !== null && r.slack < 0))) ? ' breach' : ''}">
      ${left}<div class="pa-track">${track(L, c, r)}</div></div>`;
  }

  function track(L, c, r) {
    const esc = D().esc, MIN = D().MIN;
    const layout = (bars, deadline, note, deadlineClass, noteClass) =>
      `<div class="pa-bars">${bars}</div><div class="pa-meta">
        ${deadline ? `<span class="pa-t${deadlineClass ? ' ' + deadlineClass : ''}">${deadline}</span>` : ''}
        ${note ? `<span class="pa-note${noteClass ? ' ' + noteClass : ''}">${note}</span>` : ''}
      </div>`;
    const resolved = c.treated || c.outcome;
    const resolution = () => [
      c.treated ? 'treated' : 'untreated',
      c.outcome === 'DIED' ? 'died' : c.outcome === 'SAVED' ? 'survived' : 'outcome pending'
    ].join(' · ');

    /* No deadline in the simulation, so none is drawn. */
    if (!r) {
      return layout('<div class="pa-bar dim" style="width:10%"></div>', '',
        `no deadline asserted &middot; not time-critical &middot; ${
          resolved ? esc(resolution()) : `untreated &middot; ${esc(c.cls)} triage`}`,
        '', c.outcome === 'DIED' ? 'bad' : 'dim');
    }

    const left = Math.max(0, r.left);
    const w = pct(Math.min(left, BAR_MAX) / WINDOW_MIN);
    const wide = left >= 14;                   /* room inside the bar for words */
    const breach = r.unreachable || (r.slack !== null && r.slack < 0);
    const expectant = c.cls === 'EXPECTANT';
    const kind = expectant ? 'dim' : breach || left <= 20 ? 'red' : left <= 45 ? 'amb' : 'dim';
    const tCls = expectant ? '' : breach || left <= 20 ? 'bad' : left <= 45 ? 'warn' : '';

    if (resolved) {
      const died = c.outcome === 'DIED';
      return layout(`<div class="pa-bar ${died ? 'red' : 'dim'}" style="width:${w}"></div>`,
        `T-${Math.round(left)}`, esc(resolution()), died ? 'bad' : '', died ? 'bad' : 'dim');
    }

    /* What is true about the reading, said as a reading and not as a policy. */
    const age = Math.round(L.now - c.tPinged);
    const tail = [];
    if (stale(L, c)) tail.push('reading ' + age + ' min old');
    if (expectant) tail.push('outside the survivable cohort');

    if (r.unreachable) {
      const bars = `<div class="pa-bar ${expectant ? 'dim' : 'red'}" style="width:${w}">
        ${wide ? `<span class="pa-inbar${expectant ? '' : ' bad'}">NO LAUNCH POINT REACHES THIS POSITION</span>` : ''}</div>`;
      return layout(bars, `T-${Math.round(left)}`,
        esc(['no launch point reaches this position'].concat(tail).join(' · ')),
        tCls, expectant ? 'dim' : 'bad');
    }

    const d = c.assignedTo != null
      ? (L.A.drones || []).find(k => k.id === c.assignedTo) : null;
    const who = d ? callOf(d) : (r.site ? r.site.b.name : '');

    if (breach) {
      const over = Math.min(BAR_MAX, r.eta);
      const bars = `<div class="pa-bar red" style="width:${w}">
          ${wide ? '<span class="pa-inbar bad">NOTHING REACHES THIS BAR</span>' : ''}</div>
        <div class="pa-bar none" style="width:${pct(Math.max(0, over - left) / WINDOW_MIN)}">
          ${(over - left) >= 14 ? `<span class="pa-inbar bad">${esc(who)} ARRIVES ${MIN(r.eta)}</span>` : ''}</div>`;
      return layout(bars, `T-${Math.round(left)} &middot; MISS &minus;${Math.abs(Math.round(r.slack))}`,
        `${esc(who || 'assigned response')} arrives ${MIN(r.eta)}`, 'bad', 'bad');
    }

    const fill = Math.max(0, Math.min(1, r.eta / Math.max(left, 0.1)));
    const note = [(r.slack >= 0 ? '+' : '\u2212') + Math.abs(Math.round(r.slack)) + ' slack',
                  c.assignedTo != null ? 'tasked' : 'not tasked',
                  'untreated'].concat(tail).join(' · ');
    const bars = `<div class="pa-bar ${kind}" style="width:${w}">
      <div class="pa-fill" style="width:${(fill * 100).toFixed(1)}%">
        ${wide ? `<span>${esc(who)} &middot; ${MIN(r.eta)}</span>` : ''}</div></div>`;
    return layout(bars, `T-${Math.round(left)}`, esc(note), tCls,
      expectant || stale(L, c) ? 'dim' : '');
  }

  /* ======================================================================
     THE THREE ABSORBED DESTINATIONS
     ====================================================================== */

  /* ---- SUPPLY: what is actually on the shelf, per launch point ---------- */
  const SUP_COLS = '1fr 92px 92px 72px 92px 84px 88px';
  function supplyTab(L) {
    const esc = D().esc;
    const keys = ['BLOOD', 'PLASMA', 'TXA', 'TQ_KIT', 'CHEST_SEAL'];
    const bases = L.A.bases || [];
    const shownBases = bases.filter(b => D().matches(
      b.name, b.stock, b.spent, b.wastedUnits,
      keys.map(k => [k, NEED[k], b.stock && b.stock[k], b.spent && b.spent[k]]),
      'stock shelf issued drawn down lost'));
    const tot = k => bases.reduce((s, b) => s + ((b.stock && b.stock[k]) || 0), 0);
    const rows = shownBases.map(b => {
      const issued = keys.reduce((s, k) => s + ((b.spent && b.spent[k]) || 0), 0);
      const lost = ((b.wastedUnits && b.wastedUnits.BLOOD) || 0) +
                   ((b.wastedUnits && b.wastedUnits.PLASMA) || 0);
      return `<div class="row" style="grid-template-columns:${SUP_COLS}">
        <span class="id">${esc(b.name)}</span>
        ${keys.map(k => `<span class="r">${(b.stock && b.stock[k]) || 0}</span>`).join('')}
        <span class="r sub">${issued} issued${lost ? ' · ' + lost + ' lost' : ''}</span></div>`;
    }).join('');
    return `<div class="pa-pad"><section class="d-card">
      <header><h2>Blood and materiel forward</h2>
        <span class="d-meta">${tot('BLOOD')}U WHOLE BLOOD &middot; ${tot('PLASMA')}U PLASMA ON THE SHELF</span></header>
      <div class="d-tbl">
        <div class="hd" style="grid-template-columns:${SUP_COLS}">
          <span>LAUNCH POINT</span><span class="r">WHOLE BLOOD</span><span class="r">PLASMA</span>
          <span class="r">TXA</span><span class="r">HAEM KIT</span><span class="r">CHEST SEAL</span>
          <span class="r">DRAWN DOWN</span></div>
        ${rows || (D().query() ? D().noMatches('launch points') : '<div class="row" style="grid-template-columns:1fr;color:var(--d-t6)">No launch point is stood up.</div>')}
      </div></section>
      <p class="d-note" style="margin:11px 2px 0">${esc(payLabel('BLOOD'))} &middot; ${
        typeof PAYLOADS !== 'undefined' && PAYLOADS.BLOOD ? esc(PAYLOADS.BLOOD.note) : ''}</p>
      </div>`;
  }

  /* ---- FLEET: every airframe, where it is and what it is carrying ------- */
  const FLT_COLS = '96px 132px 148px 104px 1fr 96px 70px';
  function fleetTab(L) {
    const esc = D().esc, MIN = D().MIN;
    const ds = (L.A.drones || []).filter(d => {
      const state = d.state === 'LOST' ? 'LOST' : d.held ? 'HELD' : d.state;
      const load = Object.keys(d.manifest || {}).filter(k => d.manifest[k] > 0)
        .map(k => [k, NEED[k], d.manifest[k]]);
      return D().matches(callOf(d), d.id, d.plat && d.plat.label, d.baseName,
        state, load, d.target != null ? D().casId({ id: d.target }) : '',
        d.sorties, d.held ? 'held' : '');
    }).sort((a, b) => a.baseIdx - b.baseIdx || a.id - b.id);
    const rows = ds.map(d => {
      const state = d.state === 'LOST' ? 'LOST' : d.held ? 'HELD' : d.state;
      const col = d.state === 'LOST' ? 'var(--d-red)'
                : d.state === 'IDLE' ? 'var(--d-t5)' : 'var(--d-teal-2)';
      const load = Object.keys(d.manifest || {}).filter(k => d.manifest[k] > 0)
        .map(k => d.manifest[k] + '× ' + (NEED[k] || k)).join(', ');
      const tgt = d.target != null ? D().casId({ id: d.target }) : '—';
      return `<div class="row" style="grid-template-columns:${FLT_COLS}">
        <span class="id">${esc(callOf(d))}</span>
        <span class="sub">${esc(d.plat.label)}</span>
        <span class="sub">${esc(d.baseName)}</span>
        <span style="color:${col}">${esc(state)}</span>
        <span class="sub">${esc(load || '—')}</span>
        <span class="sub">${esc(tgt)}</span>
        <span class="r">${d.sorties || 0}</span></div>`;
    }).join('');
    return `<div class="pa-pad"><section class="d-card">
      <header><h2>Lift</h2><span class="d-meta">${L.lift.ready} READY &middot; ${L.lift.air} AIRBORNE &middot; ${L.lift.all} IN THE FORCE</span></header>
      <div class="d-tbl">
        <div class="hd" style="grid-template-columns:${FLT_COLS}">
          <span>CALL</span><span>PLATFORM</span><span>LAUNCH POINT</span><span>STATE</span>
          <span>CARRYING</span><span>TASKED TO</span><span class="r">SORTIES</span></div>
        ${rows || (D().query() ? D().noMatches('airframes') : '<div class="row" style="grid-template-columns:1fr;color:var(--d-t6)">No airframe is stood up.</div>')}
      </div></section></div>`;
  }

  /* ---- LAUNCH POINTS: the laydown, and who it can reach ----------------- */
  const LP_COLS = '1fr 104px 76px 88px 72px 84px 132px';
  function lpTab(L) {
    const esc = D().esc;
    let S0 = null;
    try {
      const g = window.ANGEL && ANGEL.get && ANGEL.get('grouped');
      if (g && g.survey) S0 = g.survey();
    } catch (e) { S0 = null; }
    if (!S0) return `<div class="pa-pad"><section class="d-card"><header><h2>Launch points</h2></header>
      <div class="body"><span class="d-note">The reach model has not published yet.</span></div></section></div>`;

    const sites = S0.sites.filter(s => {
      const siting = s.scnB ? (s.scnB.afloat ? 'AFLOAT' : 'ASHORE') : 'not recorded';
      return D().matches(s.b.name, siting, s.ready, s.air, s.lost, s.sorties,
        L.timed.filter(r => r.site === s).map(r => [
          D().casId(r.c), r.c.unitName, r.c.injury, INJ[r.c.injury]
        ]));
    });
    const rows = sites.map(s => {
      const inReach = L.timed.filter(r => r.site === s).length;
      const siting = s.scnB ? (s.scnB.afloat ? 'AFLOAT' : 'ASHORE') : 'not recorded';
      return `<div class="row" style="grid-template-columns:${LP_COLS}">
        <span class="id">${esc(s.b.name)}</span>
        <span class="sub">${esc(siting)}</span>
        <span class="r">${s.ready}</span>
        <span class="r">${s.air}</span>
        <span class="r"${s.lost ? ' style="color:var(--d-red)"' : ''}>${s.lost}</span>
        <span class="r">${s.sorties}</span>
        <span class="r sub">${inReach} soonest from here</span></div>`;
    }).join('');
    const strays = S0.strays.length;
    return `<div class="pa-pad"><section class="d-card">
      <header><h2>Launch points</h2><span class="d-meta">${S0.sites.length} SITE${S0.sites.length === 1 ? '' : 'S'}${
        strays ? ' · ' + strays + ' AIRFRAME' + (strays === 1 ? '' : 'S') + ' WITH NO SITE ON THIS LIST' : ''}</span></header>
      <div class="d-tbl">
        <div class="hd" style="grid-template-columns:${LP_COLS}">
          <span>LAUNCH POINT</span><span>SITING</span><span class="r">READY</span><span class="r">AIRBORNE</span>
          <span class="r">LOST</span><span class="r">SORTIES</span><span class="r">OPEN CASUALTIES</span></div>
        ${rows || (D().query() ? D().noMatches('launch points') : '<div class="row" style="grid-template-columns:1fr;color:var(--d-t6)">No launch point is stood up.</div>')}
      </div></section>
      <p class="d-note" style="margin:11px 2px 0">Reach is the allocator&rsquo;s own test: an aircraft based here can fly to the position and get home carrying a unit of whole blood.</p>
      </div>`;
  }
})();
