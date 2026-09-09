/* ==========================================================================
   EVIDENCE — the counterfactual, and the page that is entirely about a toll
   ==========================================================================
   Same casualties, same aircraft, same blood, two allocation rules. This
   destination absorbs the paired replication study (CONFIDENCE), the arm
   comparison (COMPARE), the outcome analysis (ANALYSIS), the return model
   (ROI), the cost model (COST) and the after-action report (AFTERACTION).
   Every one of those is a working subsystem and every one of them is mounted
   here as its own tab rather than redrawn.

   THE DEATH RULE, ON THE PAGE IT MATTERS MOST.
   The canvas draws the ANGEL SWARM arm as a teal tile and the difference as
   a teal success figure. Both are counts of people who died. Both are red
   here, along with every bar in the lever chart, and the difference is
   written "fewer dead" — never "lives saved", never "saved". The target is
   zero and the distance from it is the only thing either arm has earned.

   NO AI CHIP ON THIS PAGE. The canvas puts "✦ AI SIMULATION" beside the
   headline. The simulation is a written model and arithmetic, the paired
   Monte Carlo is arithmetic over that model, and neither is a trained
   network. The chip marks CRI-Net, MiniLM and the language model, and
   nothing else, so it does not appear here.

   The canvas's figures — 41 against 29, fleet ×3.4, DEATHS NOT PREVENTED 29
   — were placeholders. None of them appears here.
   ========================================================================== */
(function () {
  'use strict';
  const P = window.DPB;
  const D = () => window.DSHELL;
  if (!P) return;
  const esc = P.esc;

  const TABS = [
    { k: 'EV',    label: 'EVIDENCE' },
    { k: 'CONF',  label: 'REPLICATIONS', view: 'CONFIDENCE' },
    { k: 'CMP',   label: 'COMPARE',      view: 'COMPARE' },
    { k: 'ANA',   label: 'ANALYSIS',     view: 'ANALYSIS' },
    { k: 'ROI',   label: 'RETURN',       view: 'ROI' },
    { k: 'COST',  label: 'COST',         view: 'COST' },
    { k: 'AAR',   label: 'AFTER ACTION', view: 'AFTERACTION' }
  ];

  window.DPAGES = window.DPAGES || {};
  window.DPAGES.ev = function (L) {
    const tab = P.tab('ev', 'EV');
    const head = `<div class="b-segbar">${P.seg('ev', 'EV', TABS)}
      <span class="d-meta">THE COUNTERFACTUAL, AND THE SIX SUBSYSTEMS BEHIND IT</span></div>`;

    if (tab !== 'EV') {
      const t = TABS.find(x => x.k === tab);
      P.dock('evSlot', t && t.view);
      return `${head}<div style="padding:16px 22px 24px">${P.slot('evSlot')}</div>`;
    }
    P.release();
    D().searchContext('Search evidence summary', 'evidence records');

    if (!L) return `${head}<div class="d-head"><div><h1>Evidence</h1>
      <p>No run is loaded in this page yet.</p></div></div>`;

    return `${head}<div class="b-ev">
      <div class="b-ev-top"><div>${claim(L)}</div>${lever(L)}</div>
      <div class="b-cols3">${liveCol(L)}${causeCol(L)}${policyCol(L)}</div>
    </div>`;
  };

  /* ---- the claim, and the two arms --------------------------------------- */
  function claim(L) {
    const C = window.COUNT;
    const a = L.deadA, b = L.deadB, d = b - a;
    const sa = C ? C.sorties(L.A) : null, sb = C ? C.sorties(L.ctl) : null;
    const done = window.APP && window.APP.finished;

    const sentence = !L.deployed
      ? `ANGEL SWARM is not deployed. Nothing has been allocated, so there is no counterfactual to state — the control arm is running and the comparison begins when this one does.`
      : d === 0
        ? `Deadline-ordered allocation and current triage and proximity resupply are <em>level</em> on deaths of survivable wounds ${done ? 'over the full run' : 'so far'}, with the baseline implemented at its strongest.`
        : `Deadline-ordered allocation left <em>${Math.abs(d)} ${d > 0 ? 'fewer' : 'more'} dead</em> of survivable wounds than current triage and proximity resupply ${done ? 'over the full run' : 'so far'}, with the baseline implemented at its strongest.`;

    const tile = (lab, fig, cap, death) =>
      `<div class="${death ? 'd-death' : ''}"><span class="d-lab">${lab}</span>
        <span class="d-fig">${fig}</span><span class="cap">${cap}</span></div>`;

    return `<div class="b-kick"><span>SAME CASUALTIES &middot; SAME AIRCRAFT &middot; SAME BLOOD</span>
        <span class="d-meta" style="letter-spacing:.08em">PAIRED RUN &middot; SEED ${esc(window.APP ? window.APP.seed : '')} &middot; T+${Math.floor(L.now)} MIN</span></div>
      <div class="b-claim">${sentence}</div>
      <div class="b-three">
        ${tile('CURRENT — TRIAGE & PROXIMITY', b, 'dead of survivable wounds' + (sb === null ? '' : ' &middot; ' + sb + ' sorties'), true)}
        ${tile('ANGEL SWARM TASKING', a, 'dead of survivable wounds' + (sa === null ? '' : ' &middot; ' + sa + ' sorties'), true)}
        ${tile('TARGET', 0, 'every number is a person', false)}
      </div>`;
  }

  /* ---- the lever ---------------------------------------------------------
     The canvas asserts that tripling the fleet buys three lives. This
     application does not assert it; it runs it. The bars below are the sweep
     the replication study actually executed in this session, at its two
     extreme knots, and where no sweep has been run the panel says so and
     shows the single paired run instead of inventing a curve. */
  function lever(L) {
    let MC = null;
    try { MC = (window.ANGEL && ANGEL.has && ANGEL.has('montecarlo')) ? ANGEL.get('montecarlo').state() : null; }
    catch (e) { MC = null; }
    const sw = MC && MC.sweep && MC.sweep.points && MC.sweep.points.length &&
               MC.sweep.points.every(p => p.meanA !== undefined) ? MC.sweep : null;

    let rows, title, right, foot;
    if (sw) {
      const label = { fleet: 'Fleet size', launch: 'Launch points', comms: 'Datalink outage',
                      triage: 'Triage error' }[sw.lever] || sw.lever;
      const lo = sw.points[0], hi = sw.points[sw.points.length - 1];
      const knot = p => label + ' ' + p.value + (sw.unit ? ' ' + sw.unit : '');
      rows = [
        ['current triage and proximity · ' + knot(lo), lo.meanB],
        ['current triage and proximity · ' + knot(hi), hi.meanB],
        ['ANGEL SWARM · ' + knot(lo), lo.meanA],
        ['ANGEL SWARM · ' + knot(hi), hi.meanA]
      ];
      title = 'THE ' + label.toUpperCase() + ' LEVER, MEASURED';
      right = sw.points.length + ' KNOTS &middot; ' + (lo.results ? lo.results.length : 0) + ' REPLICATIONS EACH';
      const move = (lo.meanA - hi.meanA);
      foot = `Mean dead of survivable wounds per battle, paired on seed at every knot. ` +
        `Moving ${label.toLowerCase()} from ${lo.value} to ${hi.value} changes the ANGEL SWARM toll by ` +
        `${Math.abs(move).toFixed(1)}. ${esc(sw.note || '')} The full curve, with its intervals, is on REPLICATIONS.`;
    } else {
      rows = [['current triage and proximity, this run', L.deadB], ['ANGEL SWARM, this run', L.deadA]];
      title = 'ONE SEED IS NOT A FINDING';
      right = 'NO SWEEP RUN IN THIS SESSION';
      foot = 'The two bars above are a single paired battle. Whether a lever — fleet size, launch ' +
        'points, datalink outage, triage error — moves the toll at all is a question the replication ' +
        'study answers and this panel will not answer for it. Open REPLICATIONS and run one.';
    }

    const found = rows.filter(([lab, v]) => D().matches(lab, v, title, right));
    const max = Math.max(1, ...found.map(r => r[1] || 0));
    const bars = found.map(([lab, v]) => v === null || v === undefined ? '' : `
      <div class="b-bar d-death"><div class="t"><span>${esc(lab)}</span>
        <span class="d-fig" style="font-size:11px">${typeof v === 'number' && v % 1 ? v.toFixed(1) : v}</span></div>
        <div class="d-bar"><i style="width:${Math.max(2, (v / max) * 100).toFixed(1)}%"></i></div></div>`).join('');

    return `<div class="b-lever"><div class="h"><span>${esc(title)}</span><span>${right}</span></div>
      <div class="b-bars">${bars || (D().query() ? D().noMatches('comparison rows') : '')}</div>
      <span class="foot">${foot}</span>
      <button class="b-link" type="button" data-bgrp="ev" data-btab="CONF" data-bview="CONFIDENCE">OPEN THE REPLICATION STUDY &rarr;</button>
    </div>`;
  }

  /* ---- live now ----------------------------------------------------------- */
  function liveCol(L) {
    const MIN = D().MIN;
    const found = L.timed.filter(r => {
      const c = r.c;
      const stale = (L.now - c.tPinged) > 2;
      const d = P.droneOf(L.A, c.assignedTo);
      return D().matches(D().casId(c), r.site && r.site.b.name, c.unitName,
        r.slack, d && P.call(d), stale ? 'withheld stale' : '',
        r.unreachable ? 'no asset unreachable' : 'deadline casualty');
    });
    const rows = found.slice(0, 4).map(r => {
      const c = r.c;
      const stale = (L.now - c.tPinged) > 2;
      const d = P.droneOf(L.A, c.assignedTo);
      const cls = r.slack === null ? 'dim' : r.slack < 0 ? 'neg' : 'pos';
      const right = r.slack === null
        ? (stale ? 'withheld · stale ' + Math.round(L.now - c.tPinged) + 'm' : 'no asset in reach')
        : P.sgn(r.slack) + (d ? ' · ' + P.call(d) : ' · unassigned');
      return `<div class="b-kv ${cls}"><span>${esc(D().casId(c))} &middot; ${esc(r.site ? r.site.b.name : (c.unitName || '—'))}</span>
        <span>${esc(right)}</span></div>`;
    }).join('');
    const empty = D().query()
      ? D().noMatches('live casualties')
      : '<span class="note">Nothing is open inside a deadline this system holds.</span>';
    return `<div><span class="h">LIVE NOW &middot; ${P.zulu(L.now)}</span>
      ${rows || empty}
      <button class="b-link" type="button" data-page="cas">OPEN THE LIVE BOARD &rarr;</button></div>`;
  }

  /* ---- deaths not prevented, with their reasons ---------------------------
     A death count with no decomposition invites the reader to assume the
     tasking lost them. The allocator publishes the attribution and it is
     printed whole — including the ones no aircraft could ever have closed,
     which is most of them. */
  const CAUSE = [
    ['treatedDied',   'The product arrived and was not enough'],
    ['noResponder',   'Nobody on scene could use what an aircraft carries'],
    ['noLaunchPoint', 'One launch point in reach, or none'],
    ['tooFast',       'Died faster than any aircraft could fly'],
    ['busy',          'Every airframe was already committed']
  ];

  function causeCol(L) {
    let c = null;
    try { c = window.deathCauses ? window.deathCauses(L.A) : null; } catch (e) { c = null; }
    if (!c) {
      return `<div><span class="h">DEATHS NOT PREVENTED &middot; ${L.deadA}</span>
        <span class="note">The attribution is not available in this session.</span></div>`;
    }
    const found = CAUSE.filter(([k]) => c[k])
      .filter(([k, lab]) => D().matches(lab, c[k], k, 'death cause'));
    const rows = found.map(([k, lab]) =>
      `<div class="b-kv"><span>${lab}</span><span class="d-fig" style="font-size:11px">${c[k]}</span></div>`).join('');
    const empty = D().query()
      ? D().noMatches('death causes')
      : '<span class="note">Nobody has died of a survivable wound in this run.</span>';
    return `<div class="d-death"><span class="h" style="color:var(--d-red-t)">DEATHS NOT PREVENTED &middot; ${c.total}</span>
      ${rows || empty}
      <span class="note">Only the first line is a tasking failure, and only the last is a fleet-size
        failure. Each is reported with its reason rather than folded into one number.</span></div>`;
  }

  /* ---- policy posture ------------------------------------------------------ */
  function policyCol(L) {
    const lk = P.link();
    let v = null;
    try { v = window.verifyAudit ? window.verifyAudit(L.A) : null; } catch (e) { v = null; }
    const raised = ((L.A.queue) || []).length;
    const st = L.A.stats || {};
    return `<div><span class="h">POLICY POSTURE</span>
      <span class="prose">Unarmed medical delivery. Outside DoDD 3000.09. The DoD AI Ethical Principles
        apply. No issuance governs autonomy in casualty prioritisation, which is why every trade-off
        between two casualties is escalated rather than resolved.</span>
      <div style="display:flex;flex-direction:column;gap:7px;padding-top:9px;border-top:1px solid var(--d-raise)">
        <div class="b-dot"><i></i><span>Human accountability preserved &middot; ${raised} proposal${raised === 1 ? '' : 's'} raised to a person, ${st.autoApproved || 0} taken under standing authority</span></div>
        <div class="b-dot"><i${v && !v.ok ? ' style="background:var(--d-red-mark)"' : ''}></i><span>Every decision reconstructable &middot; ${
          !v ? 'chain not verifiable here' : v.ok ? 'chain intact, ' + v.n + ' entries' : 'CHAIN BROKEN AT ENTRY ' + v.at}</span></div>
        <div class="b-dot"><i${lk.live ? '' : ' style="background:var(--d-amb-mark)"'}></i><span>Decides without reachback &middot; ${esc(lk.txt.toLowerCase())}</span></div>
      </div></div>`;
  }
})();
