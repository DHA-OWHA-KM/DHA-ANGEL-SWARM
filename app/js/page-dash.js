/* ==========================================================================
   COMMAND OVERVIEW — the canvas's dash page, on live figures
   ==========================================================================
   Layout, type, colour and spacing are the canvas's. Every number is read
   out of the running simulation at the moment it is drawn. The canvas's own
   figures (18 casualties, 6 lift, 31U, −12) were placeholders for spacing
   and none of them appear here.

   THE DELTA TILE IS RED, NOT TEAL. The canvas draws "−12 deaths, same
   inputs" as a teal success tile. The instruction on this project is that a
   death figure is red — the number, the bar and the marker. The tile keeps
   its shape and its position; only the family changes.
   ========================================================================== */
(function () {
  'use strict';
  const D = () => window.DSHELL;

  function tile(lab, fig, unit, kind) {
    const cls = kind ? ' ' + kind : '';
    return `<div class="d-tile${cls}${kind==='crit'?' d-death':''}">
      <span class="d-lab">${lab}</span>
      <div class="d-val"><span class="d-fig">${fig}</span>
      <span class="d-unit">${unit}</span></div></div>`;
  }

  window.DPAGES = window.DPAGES || {};
  window.DPAGES.dash = function (L) {
    const esc = D().esc, MIN = D().MIN;
    D().searchContext('Search casualty, site, injury, tasking…', 'queue and brief records');
    if (!L) return `<div class="d-head"><div><h1>Command Overview</h1>
      <p>Waiting for the run.</p></div></div>`;

    const tight = L.tightest;               // a row: { c, left, eta, slack, ... }
    const tightMin = tight ? Math.max(0, tight.left) : null;
    const delta = L.deadB - L.deadA;      // positive = fewer dead under ANGEL SWARM
    const blood = shelf(L);
    const queue = L.timed.filter(r => timedMatches(r));

    /* THE DELTA IS A DEATH FIGURE. Red, and never phrased as lives saved. */
    const deltaTile = !L.deployed
      ? tile('VS CURRENT — TRIAGE & PROXIMITY', '—', 'not deployed', '')
      : tile('VS CURRENT — TRIAGE & PROXIMITY',
             (delta > 0 ? '−' : delta < 0 ? '+' : '') + Math.abs(delta),
             delta === 0 ? 'level, same inputs' : 'dead, same inputs', 'crit');

    return `<div class="d-head">
        <div><h1>Command Overview</h1>
        <p>Every open casualty ranked by time remaining, not by appearance.</p></div>
        <div style="display:flex;gap:9px;align-items:center">
          <span class="d-meta">T+${Math.floor(L.now)} MIN &middot; LOCAL</span>
          <button class="d-btn" type="button" data-dcmd="rerun">RE-RUN ALLOCATION</button>
        </div></div>

      <div class="d-tiles">
        ${tile('UNREACHABLE IN TIME', L.unreachable, L.unreachable === 1 ? 'casualty' : 'casualties',
               L.unreachable ? 'crit' : '')}
        ${tile('TIGHTEST DEADLINE', tight ? MIN(tightMin) : '—',
               tight ? 'min &middot; ' + esc(D().casId(tight.c)) : 'none open', '')}
        ${tile('BLOOD FORWARD', blood.units, 'U &middot; ' + blood.sites +
               (blood.sites === 1 ? ' site' : ' sites'), '')}
        ${tile('LIFT AVAILABLE', L.lift.ready, 'of ' + L.lift.all + ' &middot; ' + L.lift.air + ' airborne', '')}
        ${deltaTile}
      </div>

      <div class="d-cols">
        <div class="d-stack">
          ${briefCard(L, queue)}
          ${queueCard(L, queue)}
        </div>
        <div class="d-stack">
          ${escCard(L)}
          ${theaterCard(L)}
        </div>
      </div>`;
  };

  /* ---- what is actually on the shelf, per launch point ------------------ */
  function shelf(L) {
    let units = 0, sites = 0;
    for (const b of (L.A.bases || [])) {
      const s = b.stock || {};
      const u = (s.BLOOD || 0) + (s.PLASMA || 0);
      if (u > 0) sites++;
      units += u;
    }
    return { units, sites };
  }

  /* ---- the allocation brief --------------------------------------------- */
  /* Three lines, the canvas's three labels. Each one is a real statement
     about this run or it is not drawn at all — an empty slot is honest and a
     manufactured sentence is not. */
  function briefCard(L, timed) {
    const esc = D().esc, MIN = D().MIN;
    const rows = [];
    const worst = timed.find(r => r.unreachable || (r.slack !== null && r.slack < 0)) || timed[0];
    if (worst) {
      const c = worst.c;
      rows.push(['TOP RISK', 'risk',
        `${esc(D().casId(c))} at ${esc(c.unitName || 'the line')} is inside ${MIN(Math.max(0, worst.left))}. ` +
        (worst.unreachable
          ? 'No launch point can reach this casualty at all.'
          : worst.slack !== null && worst.slack < 0
            ? `The nearest aircraft arrives ${Math.abs(Math.round(worst.slack))} minutes late.`
            : `Inside the reach of ${worst.sites} launch point${worst.sites === 1 ? '' : 's'}.`)]);
    }
    const flying = (L.A.drones || []).filter(d => d.state === 'OUTBOUND' && d.task)
      .filter(d => D().matches(d.tail, d.id, d.type, d.plat && d.plat.label,
        d.baseName, d.state, d.task, d.target != null ? D().casId({ id:d.target }) : '',
        'action outbound tasked standing authority'));
    if (flying.length) {
      const d = flying[0];
      rows.push(['ACTION', 'act',
        `${esc(d.tail || ('AC-' + d.id))} is outbound. Executed under standing authority.`]);
    }
    const stale = L.open.filter(c => (L.now - c.tPinged) > 2)
      .filter(c => casualtyMatches(c)).length;
    if (stale) rows.push(['CHANGE', '',
      `${stale} ${stale === 1 ? 'casualty has' : 'casualties have'} a reading the network ` +
      `will not act on. No deadline is asserted and no sortie is tasked against an estimate.`]);

    if (!rows.length && !D().query())
      rows.push(['STATE', '', 'Nothing is open. No allocation is being made.']);

    return `<section class="d-card"><header>
        <h2>Allocation brief</h2>
        <span class="d-meta">GENERATED LOCALLY &middot; T+${Math.floor(L.now)}</span></header>
      <div class="body">${rows.length ? rows.map(([k, cls, v]) =>
        `<div class="d-line-item ${cls}"><span class="k">${k}</span><span class="v">${v}</span></div>`
      ).join('') : D().noMatches('brief records')}</div></section>`;
  }

  /* ---- the deadline queue ----------------------------------------------- */
  const COLS = '96px 1fr 88px 92px 72px 128px';
  function queueCard(L, queue) {
    const esc = D().esc, MIN = D().MIN;
    const INJ = { TRUNCAL_HEM:'truncal haem', JUNCTIONAL_HEM:'junctional haem',
                  EXTREMITY_HEM:'extremity haem', AIRWAY:'airway', OTHER:'other' };
    const rows = queue.slice(0, 8).map(r => {
      const c = r.c, breach = r.unreachable || (r.slack !== null && r.slack < 0);
      return `<div class="row${breach ? ' breach' : ''}" style="grid-template-columns:${COLS}">
        <span class="id">${esc(D().casId(c))}</span>
        <span class="sub">${esc((r.site ? r.site.b.name : c.unitName || '—') + ' · ' +
                                (INJ[c.injury] || String(c.injury || '').toLowerCase()))}</span>
        <span class="r">${MIN(Math.max(0, r.left))}</span>
        <span class="r">${r.eta === null ? '—' : MIN(r.eta)}</span>
        <span class="r">${r.slack === null
          ? '<span style="color:var(--d-t6);font-size:10px">NO ASSET</span>'
          : `<span class="d-slack ${r.slack < 0 ? 'neg' : 'pos'}">${r.slack > 0 ? '+' : ''}${Math.round(r.slack)}</span>`}</span>
        <span class="r" style="font-size:10px;color:${c.assignedTo ? 'oklch(0.74 0.05 165)' : 'var(--d-t5)'}">${
          c.assignedTo ? 'TASKED' : (r.unreachable ? 'NO ASSET' : 'QUEUED')}</span></div>`;
    }).join('');

    return `<section class="d-card"><header>
        <h2>Deadline queue</h2>
        <span class="d-meta" style="color:var(--d-cyan-2);cursor:pointer" data-page="cas">OPEN FULL BOARD</span></header>
      <div class="d-tbl">
        <div class="hd" style="grid-template-columns:${COLS}">
          <span>CASUALTY</span><span>SITE &middot; MECHANISM</span>
          <span class="r">DEADLINE</span><span class="r">ARRIVAL</span>
          <span class="r">SLACK</span><span class="r">TASKING</span></div>
        ${rows || (D().query() ? D().noMatches('queue records') : '<div class="row" style="grid-template-columns:1fr;color:var(--d-t6)">No casualty is inside a deadline this system holds.</div>')}
      </div></section>`;
  }

  function casualtyMatches(c) {
    return D().matches(D().casId(c), c.id, c.cls, c.role, c.unitName,
      c.injury, c.needs, c.assignedTo,
      c.assignedTo != null ? 'tasked' : 'queued', 'stale reading change');
  }

  function timedMatches(r) {
    const c = r.c;
    return D().matches(D().casId(c), c.id, c.cls, c.role, c.unitName,
      c.injury, c.needs, c.assignedTo, r.site && r.site.b.name,
      r.unreachable ? 'unreachable no asset breach' : '',
      r.slack !== null && r.slack < 0 ? 'late negative slack' : 'inside deadline',
      c.assignedTo != null ? 'tasked' : 'queued',
      r.left, r.eta, r.slack);
  }

  /* ---- the escalation card ---------------------------------------------- */
  function escCard(L) {
    const esc = D().esc;
    if (!L.awaiting) {
      return `<section class="d-card"><header><h2>Escalation</h2>
        <span class="d-meta">NONE OPEN</span></header>
        <div class="body"><span style="font-size:12.5px;color:var(--d-t4)">Nothing is waiting on you. Everything inside standing authority has gone.</span></div></section>`;
    }
    return `<section class="d-card esc"><header>
        <h2>ESCALATION &middot; AWAITING YOU</h2>
        <span class="d-meta" style="color:oklch(0.85 0.05 75)">${L.awaiting} open</span></header>
      <div class="body">
        <span style="font-size:12.5px;line-height:1.55;color:oklch(0.9 0.006 250)">${
          L.awaiting === 1 ? 'One decision is not delegable under standing authority.'
                           : L.awaiting + ' decisions are not delegable under standing authority.'}</span>
        <button class="d-btn" type="button" data-page="dec" style="align-self:flex-start">OPEN THE DECISION &rarr;</button>
        <span class="d-note">Failure to decide is recorded with its cost.</span>
      </div></section>`;
  }

  /* ---- live theater, a doorway to the map ------------------------------- */
  function theaterCard(L) {
    const esc = D().esc;
    return `<section class="d-card"><header>
        <h2>Live theater</h2><span class="d-meta">${esc(L.scn.gridZone || '')}</span></header>
      <div id="dTheaterSlot" style="height:214px;position:relative;background:oklch(0.14 0.012 250);cursor:pointer" data-page="map">
        <div style="position:absolute;inset:0;background-image:linear-gradient(oklch(0.22 0.01 250) 1px,transparent 1px),linear-gradient(90deg,oklch(0.22 0.01 250) 1px,transparent 1px);background-size:34px 34px"></div>
        <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center">
          <div style="font:600 10px var(--d-mono);letter-spacing:.1em;color:var(--d-t6)">OPEN THEATER MAP</div>
          <div style="font:400 10px var(--d-mono);color:var(--d-t7);margin-top:6px">${L.lift.air} airborne &middot; ${L.open.length} open</div>
        </div>
      </div></section>`;
  }
})();
