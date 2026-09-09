/* ==========================================================================
   COMMAND OVERVIEW — commander's live decision brief
   All figures are read from DSHELL.live() or the arm ledgers at render time.
   ========================================================================== */
(function () {
  'use strict';
  const D = () => window.DSHELL;
  const DECISION_WINDOW_MIN = 8;
  const MIN_DECISION_RESPONSE_MS = 15000;
  const INJ = { TRUNCAL_HEM:'truncal haemorrhage', JUNCTIONAL_HEM:'junctional haemorrhage',
    EXTREMITY_HEM:'extremity haemorrhage', AIRWAY:'airway', MINOR:'minor', OTHER:'other' };

  const destination = (page, sec) =>
    ` data-page="${page}"${sec ? ` data-sec="${sec}"` : ''}` +
    (page === 'cas' && sec ? ` data-cas="tab:${sec}"` : '') +
    (page === 'ev' && sec ? ` data-bgrp="ev" data-btab="${sec === 'COMPARE' ? 'CMP' : sec}" data-bview="${sec}"` : '');

  const action = (label, page, sec, cls) =>
    `<button type="button" class="${cls || 'do-link'}"${destination(page, sec)}>${label}</button>`;

  function tile(label, figure, unit, kind, page, sec) {
    return `<button type="button" class="d-tile do-tile${kind ? ' ' + kind : ''}${kind === 'crit' ? ' d-death' : ''}"
      ${destination(page, sec)}>
      <span class="d-lab">${label}</span><span class="d-val"><span class="d-fig">${figure}</span>
      <span class="d-unit">${unit}</span></span></button>`;
  }

  function shelf(L) {
    let blood = 0, plasma = 0, sites = 0, constrained = 0;
    for (const b of (L.A.bases || [])) {
      const s = b.stock || {}, n = (s.BLOOD || 0) + (s.PLASMA || 0);
      blood += s.BLOOD || 0; plasma += s.PLASMA || 0;
      if (n > 0) sites++; else constrained++;
    }
    return { blood, plasma, units:blood + plasma, sites, constrained };
  }

  function outbound(L) {
    const sorties = L.A.sortieLog || [];
    return (L.A.drones || []).filter(d => d.state === 'OUTBOUND').map(d => {
      const sortie = sorties.find(s => s.id === d.sortieId);
      return { d, actor: sortie && sortie.actor ? sortie.actor : 'authority not recorded' };
    });
  }

  function stale(L) {
    return L.open.filter(c => (L.now - c.tPinged) > 2);
  }

  function matches(r) {
    const c = r.c;
    return D().matches(D().casId(c), c.id, c.cls, c.role, c.unitName, c.injury,
      INJ[c.injury], c.needs, c.assignedTo, r.site && r.site.b.name,
      r.unreachable ? 'unreachable no asset breach' : '',
      r.slack !== null && r.slack < 0 ? 'late negative slack' : '',
      c.assignedTo != null ? 'tasked outbound' : 'queued');
  }

  window.DPAGES = window.DPAGES || {};
  window.DPAGES.dash = function (L) {
    D().searchContext('Search casualty, site, injury, tasking…', 'command overview records');
    if (!L) return `<div class="do-page"><div class="d-head"><div><h1>Command Overview</h1>
      <p>Waiting for the run. No operational claim is available yet.</p></div></div>
      <section class="do-empty" role="status"><b>RUN STATE UNAVAILABLE</b><span>The command brief will populate when the simulation publishes.</span></section></div>`;

    const stock = shelf(L), flying = outbound(L), old = stale(L);
    const visible = L.timed.filter(matches);
    const pending = (L.A.queue || []).filter(p => p.state === 'PENDING');
    const tight = L.tightest, delta = L.deadB - L.deadA;
    const status = !L.deployed ? 'PRE-DEPLOYMENT'
      : L.unreachable || pending.length ? 'COMMAND ATTENTION' : old.length ? 'STALE TELEMETRY' : 'RUN ACTIVE';

    return `<div class="do-page">
      <div class="d-head do-head"><div><div class="do-eyebrow">${status}</div>
        <h1>Command Overview</h1>
        <p>${!L.deployed ? 'Capability is not deployed. Both arms are running current triage and proximity.'
          : 'Exceptions first: casualty deadlines, machine action, and decisions held for human authority.'}</p></div>
        <div class="do-head-actions"><span class="d-meta">T+${Math.floor(L.now)} MIN · LOCAL</span>
          ${action('THEATER MAP', 'map', '', 'd-btn')}</div></div>

      <div class="do-kpis">
        ${tile('PROJECTED LATE OR UNREACHABLE', L.unreachable, L.unreachable === 1 ? 'casualty' : 'casualties',
          L.unreachable ? 'crit' : '', 'cas', 'CASUALTIES')}
        ${tile('TIGHTEST DEADLINE', tight ? D().MIN(Math.max(0, tight.left)) : '—',
          tight ? D().casId(tight.c) : 'none open', tight && tight.left <= 0 ? 'crit' : '', 'cas', 'CASUALTIES')}
        ${tile('PENDING AUTHORIZATION', pending.length, pending.length === 1 ? 'decision' : 'decisions',
          pending.length ? 'warn' : '', 'dec')}
        ${tile('LIFT READY', L.lift.ready, `of ${L.lift.all} · ${L.lift.air} airborne`,
          L.lift.all && !L.lift.ready ? 'warn' : '', 'cas', 'FLEET')}
        ${tile('BLOOD / PLASMA FORWARD', `${stock.blood}/${stock.plasma}`, `${stock.units}U · ${stock.sites} stocked sites`,
          stock.constrained ? 'warn' : '', 'cas', 'SUPPLY')}
        ${!L.deployed
          ? tile('VS CURRENT — TRIAGE & PROXIMITY', '—', 'not deployed', '', 'ev', 'COMPARE')
          : tile('VS CURRENT — TRIAGE & PROXIMITY', delta === 0 ? '0' : (delta > 0 ? '−' : '+') + Math.abs(delta),
            delta === 0 ? 'level, same inputs' : 'dead, same inputs', 'crit', 'ev', 'COMPARE')}
      </div>

      ${!L.deployed ? `<section class="do-notice"><div><b>PRE-DEPLOYMENT</b>
        <span>No ANGEL SWARM outcome comparison is asserted until capability is deployed. Readiness below reflects the force presently loaded.</span></div>
        ${action('REVIEW EVIDENCE', 'ev', '', 'do-link')}</section>` : ''}

      <div class="do-primary">
        ${riskCard(L, visible)}
        ${decisionCard(L, pending)}
      </div>
      <div class="do-readiness">
        ${coverageCard(L, old)}
        ${networkCard(L, stock)}
        ${activityCard(L, flying)}
      </div>
      <nav class="do-routes" aria-label="Operational tools">
        ${route('Decision Feed', 'Every action and outcome in order.', 'feed')}
        ${route('Evidence', 'Inspect comparison and provenance.', 'ev')}
        ${route('Ask ANGEL', 'Query live state or the installed corpus.', 'chat')}
        ${route('Theater Map', 'Open the full operational picture.', 'map')}
      </nav>
    </div>`;
  };

  function riskCard(L, rows) {
    const shown = rows.slice(0, 7);
    return `<section class="d-card do-risk"><header><div><span class="do-section-k">CASUALTY RISK</span>
      <h2>Deadline exceptions</h2></div>${action('OPEN CASUALTY BOARD', 'cas', 'CASUALTIES')}</header>
      <div class="do-table-head"><span>CASUALTY / RESPONDING SITE</span><span>DEADLINE</span><span>ARRIVAL</span><span>SLACK</span><span>ACTION</span></div>
      <div class="do-risk-list">${shown.map(r => riskRow(L, r)).join('') ||
        (D().query() ? D().noMatches('casualty risks') :
          `<div class="do-zero" role="status"><b>NO DEADLINE ALERTS</b><span>${L.open.length ? 'Every open, time-critical casualty is inside present reach.' : 'Nothing is open. No allocation is being made.'}</span></div>`)}</div>
      ${rows.length > shown.length ? `<footer>${rows.length - shown.length} further matching casualties on the full board</footer>` : ''}</section>`;
  }

  function riskRow(L, r) {
    const c = r.c, breach = r.unreachable || (r.slack !== null && r.slack < 0);
    return `<button type="button" class="do-risk-row${breach ? ' breach' : ''}"${destination('cas', 'CASUALTIES')}>
      <span><b>${D().esc(D().casId(c))}</b><small>${D().esc((r.site && r.site.b ? r.site.b.name : 'no responding site') + ' · ' + (INJ[c.injury] || String(c.injury || '').toLowerCase()))}</small></span>
      <span>${D().MIN(Math.max(0, r.left))}</span><span>${r.eta === null ? '—' : D().MIN(r.eta)}</span>
      <span class="${breach ? 'bad' : 'ok'}">${r.slack === null ? 'NO ASSET' : (r.slack > 0 ? '+' : '−') + Math.abs(Math.round(r.slack)) + ' min'}</span>
      <span>${c.assignedTo != null ? 'TASKED' : r.unreachable ? 'NO ASSET' : 'QUEUED'}</span></button>`;
  }

  function decisionCard(L, pending) {
    const p = pending[0], elapsed = p ? Math.max(0, L.now - p.tRaised) : 0;
    const simLeft = Math.max(0, DECISION_WINDOW_MIN - elapsed);
    const wallLeft = p && p.tWallRaised != null
      ? Math.max(0, Math.ceil((MIN_DECISION_RESPONSE_MS - (Date.now() - p.tWallRaised)) / 1000))
      : null;
    const simUrgency = simLeft > 0
      ? `${D().MIN(simLeft)} SIMULATION WINDOW REMAINING`
      : 'SIMULATION WINDOW ELAPSED';
    const wallUrgency = wallLeft === null ? ''
      : wallLeft > 0
        ? `${Math.floor(wallLeft / 60)}:${String(wallLeft % 60).padStart(2, '0')} MINIMUM RESPONSE PROTECTION REMAINING`
        : 'MINIMUM RESPONSE PROTECTION ELAPSED';
    const urgency = simUrgency + (wallUrgency ? ` · ${wallUrgency}` : '');
    return `<section class="d-card do-decision${p ? ' active' : ''}"><header><div>
      <span class="do-section-k">HUMAN AUTHORIZATION</span><h2>${p ? `${pending.length} ${pending.length === 1 ? 'decision requires' : 'decisions require'} you` : 'Nothing requires you'}</h2></div>
      ${action('OPEN DECISIONS', 'dec')}</header>${p ? `<div class="do-decision-body">
        <span class="do-decision-time">RAISED T+${Number(p.tRaised).toFixed(1)} · ${D().MIN(elapsed)} ELAPSED · ${urgency}</span>
        <strong>${D().esc(p.summary || 'Allocation proposal awaiting authority')}</strong>
        <div class="do-grounds"><span>WHY ESCALATED</span><b>${D().esc((p.reasons || []).join(' · ') || 'Named grounds are recorded on the decision.')}</b></div>
        <p>The machine has stopped at its authority boundary. Open the proposal to commit or hold the route; failure to decide is recorded with its cost.</p>
        ${action('REVIEW AND AUTHORIZE', 'dec', '', 'do-primary-action')}
      </div>` : `<div class="do-zero"><b>NO OPEN ESCALATION</b><span>Everything inside standing authority has gone. New exceptions will appear here.</span>
        ${action('READ DECISION FEED', 'feed')}</div>`}</section>`;
  }

  function coverageCard(L, old) {
    const timed = L.timed.length, inside = timed - L.unreachable, pct = timed ? Math.round(inside / timed * 100) : null;
    return `<section class="d-card do-summary"><header><h2>Casualty coverage</h2>${action('OPEN BOARD', 'cas', 'CASUALTIES')}</header>
      <div class="do-summary-body"><strong>${pct === null ? '—' : pct + '%'}</strong><span>${inside} of ${timed} casualties projected inside deadline on present reach</span>
      <dl><div><dt>Open casualties</dt><dd>${L.open.length}</dd></div><div><dt>Stale readings</dt><dd class="${old.length ? 'warn' : ''}">${old.length}</dd></div></dl>
      ${old.length ? `<p class="warn">${old.length} reading${old.length === 1 ? ' is' : 's are'} more than two minutes old. Review before relying on the telemetry.</p>` : '<p>No stale telemetry exception is open.</p>'}</div></section>`;
  }

  function networkCard(L, stock) {
    return `<section class="d-card do-summary"><header><h2>Lift and forward supply</h2></header>
      <div class="do-summary-body"><strong>${L.lift.ready}/${L.lift.all}</strong><span>airframes ready · ${L.lift.air} airborne</span>
      <dl><div><dt>Whole blood</dt><dd>${stock.blood}U</dd></div><div><dt>Plasma</dt><dd>${stock.plasma}U</dd></div>
      <div><dt>Without blood / plasma</dt><dd class="${stock.constrained ? 'warn' : ''}">${stock.constrained} launch point${stock.constrained === 1 ? '' : 's'}</dd></div></dl>
      <div class="do-inline-actions">${action('SUPPLY', 'cas', 'SUPPLY')}${action('FLEET', 'cas', 'FLEET')}</div></div></section>`;
  }

  function activityCard(L, flying) {
    return `<section class="d-card do-summary"><header><h2>Machine action</h2>${action('DECISION FEED', 'feed')}</header>
      <div class="do-summary-body"><strong>${flying.length}</strong><span>active outbound tasking${flying.length === 1 ? '' : 's'}</span>
      <div class="do-activity">${flying.slice(0, 3).map(({ d, actor }) => `<div><b>${D().esc(d.tail || ('AC-' + d.id))}</b>
        <span>${d.target != null ? D().esc(D().casId({id:d.target})) : 'target not recorded'} · ${D().esc(String(actor).toLowerCase())}</span></div>`).join('') ||
        '<p>No aircraft is outbound. The machine has no active tasking to report.</p>'}</div></div></section>`;
  }

  function route(label, desc, page) {
    return `<button type="button" data-page="${page}" class="do-route"><span><b>${label}</b><small>${desc}</small></span><i aria-hidden="true">→</i></button>`;
  }
})();