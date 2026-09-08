/* ==========================================================================
   DECISION — the canvas's isDec block, on the real escalation queue
   ==========================================================================
   ONE ESCALATION, DRAWN AS A TRADE-OFF. The canvas draws a casualty, two
   options, the grounds on which a machine refused to choose, the record line
   and two authorise buttons. Everything below is that shape; what fills it is
   `APP.armA.queue` — the allocator's own proposals, raised by
   optimizer.js:queueProposal when escalationReasons() returns a named ground.

   THE BUTTONS ARE THE APPLICATION'S REAL APPROVAL PATH. `approveProposal()`
   launches the aircraft, draws the product off the shelf and writes an
   APPROVE record into the hash-chained audit log; `rejectProposal()` releases
   the casualties the proposal had reserved and writes a REJECT record. They
   are the same two functions the old TASKING pane called. Nothing here
   simulates a decision or acknowledges one without taking it.

   WHY TWO OPTIONS AND NOT THREE. A pending proposal is a fork with exactly
   two branches: commit the aircraft to the route the allocator planned, or
   hold it. The canvas's HOLD ROUTE / DIVERT are that fork under the canvas's
   scenario; the labels here name the branches this simulation actually has,
   because a third option drawn for symmetry would be a fiction.

   ABSORBS: TASKING. Everything the old pane showed — pending, approved,
   rejected, expired — is on this page, under the escalation it belongs to.
   ========================================================================== */
(function () {
  'use strict';

  const D = () => window.DSHELL;
  const S = { focus: null, rec: null };
  const EXPIRE_MIN = 8;          /* optimizer.js:reapQueue — 8 minutes and it lapses */

  const callOf = d => {
    if (!d) return 'THE AIRCRAFT';
    const cs = (typeof CALLSIGN !== 'undefined') ? CALLSIGN[d.type] : null;
    return (cs || (d.plat && d.plat.label) || 'AC') + '-' + String(d.id).padStart(2, '0');
  };
  const payLabel = k => (typeof PAYLOADS !== 'undefined' && PAYLOADS[k])
    ? PAYLOADS[k].label : k;

  /* ---- the two real actions --------------------------------------------- */
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-dec]');
    if (!b) return;
    const bits = String(b.dataset.dec).split(':');
    const id = Number(bits[1]);
    const A = window.APP;
    if (bits[0] === 'focus') { S.focus = id; }
    else if (bits[0] === 'a' && A && typeof window.approveProposal === 'function') {
      if (window.approveProposal(A.armA, A.world, id, A.t, 'OPERATOR')) S.rec = mark(A.armA);
    } else if (bits[0] === 'b' && A && typeof window.rejectProposal === 'function') {
      if (window.rejectProposal(A.armA, id, A.t, 'OPERATOR',
          'held by the allocation authority')) S.rec = mark(A.armA);
    }
    if (D()) D().paint();
  });

  /* What the chain now says. Read back out of the log rather than composed
     from what we think we just did. */
  function mark(arm) {
    const e = arm.audit[arm.audit.length - 1];
    return e ? { seq: e.seq, hash: e.hash, actor: e.actor, action: e.action,
                 detail: e.detail, t: e.t } : null;
  }

  window.DPAGES = window.DPAGES || {};
  window.DPAGES.dec = function (L) {
    if (!L) return `<div class="d-head"><div><h1>Decision</h1>
      <p>Waiting for the run.</p></div></div>`;

    const q = (L.A.queue || []);
    const pend = q.filter(p => p.state === 'PENDING');
    if (S.focus != null && !pend.some(p => p.id === S.focus)) S.focus = null;
    const p = pend.find(x => x.id === S.focus) || pend[0] || null;

    return `<div class="pa-dec">
      <div>${p ? focus(L, p, pend) : quiet(L, q)}</div>
      <div class="pa-side">${handled(L)}${theater(L)}${toll(L)}</div>
    </div>`;
  };

  /* ---- the escalation itself -------------------------------------------- */
  function focus(L, p, pend) {
    const esc = D().esc, MIN = D().MIN;
    const arm = L.A;
    const d = (arm.drones || []).find(k => k.id === p.droneId) || null;
    const legs = p.route.map(l => {
      const c = arm.casualties.find(k => k.id === l.casId);
      if (!c) return null;
      const left = (c.tInjury + c.deadlineMin) - L.now;
      return { l, c, left: c.deadlineMin >= 9000 ? null : left,
               inMin: l.eta - L.now,
               slack: c.deadlineMin >= 9000 ? null : (c.tInjury + c.deadlineMin) - l.eta };
    }).filter(Boolean);
    const lead = legs[0];
    const elapsed = L.now - p.tRaised;
    const lapse = Math.max(0, EXPIRE_MIN - elapsed);

    return `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span class="pa-chip">${pend.length} ${pend.length === 1 ? 'DECISION REQUIRES YOU' : 'DECISIONS REQUIRE YOU'}</span>
        <span style="font:400 11px var(--d-mono);color:var(--d-t5)">raised T+${p.tRaised.toFixed(1)} &middot; ${
          MIN(elapsed)} elapsed &middot; authority lapses in ${MIN(lapse)} and the cost of not deciding is written to the record</span>
      </div>

      ${lede(L, p, d, lead, legs)}

      <div class="pa-opts">
        ${optA(L, p, d, legs)}
        ${optB(L, p, d, legs)}
      </div>

      ${why(L, p, d, lead)}
      ${S.rec ? record(L) : ''}

      <div class="pa-acts">
        <button class="pa-auth" type="button" data-dec="a:${p.id}">AUTHORISE A &middot; COMMIT</button>
        <button class="pa-auth alt" type="button" data-dec="b:${p.id}">AUTHORISE B &middot; HOLD</button>
        <button class="pa-link" type="button" data-page="chat">ask ANGEL what else this aircraft could do</button>
      </div>

      ${pend.length > 1 ? others(L, p, pend) : ''}
      ${history(L)}`;
  }

  /* The sentence at the top is assembled out of the proposal's own numbers
     and its own named grounds. Where the simulation does not have a figure
     the clause is left out rather than filled in. */
  function lede(L, p, d, lead, legs) {
    const esc = D().esc, MIN = D().MIN;
    if (!lead) return '';
    const id = D().casId(lead.c);
    const tight = lead.slack !== null && lead.slack < 0;
    const parts = [];
    parts.push(`${esc(callOf(d))} at ${esc(d ? d.baseName : 'the launch point')} reaches ` +
      `<span class="${tight ? 'r' : 'a'}">${esc(id)}</span> in ${MIN(Math.max(0, lead.inMin))}` +
      (lead.left === null ? '' :
        tight ? `, ${Math.abs(Math.round(lead.slack))} minutes after the deadline runs out`
              : `, ${Math.round(lead.slack)} minutes inside a deadline of ${MIN(Math.max(0, lead.left))}`) +
      (legs.length > 1 ? `, then ${legs.slice(1).map(x => esc(D().casId(x.c))).join(' and ')}` : '') + '.');
    const g = p.reasons || [];
    const last = g.find(r => r.indexOf('LAST ') === 0);
    if (last) parts.push(`It takes the ${esc(last.slice(5).toLowerCase())} off that shelf.`);
    if (g.indexOf('LOW CONFIDENCE') >= 0)
      parts.push(`The expected benefit scored ${p.gain}, under the threshold the network holds standing authority above.`);
    const thr = g.find(r => r.indexOf('THREAT TRANSIT') === 0);
    if (thr) parts.push(`The routing crosses a threat envelope at ${esc(thr.replace('THREAT TRANSIT ', ''))}.`);
    if (g.indexOf('IMMEDIATE UNASSIGNED') >= 0)
      parts.push('An IMMEDIATE inside this aircraft&rsquo;s reach is still unassigned.');
    parts.push('The network will not make this call on grounds it cannot state.');
    return `<div class="pa-lede">${parts.join(' ')}</div>`;
  }

  function optA(L, p, d, legs) {
    const esc = D().esc, MIN = D().MIN;
    const bar = Math.round(((L.A.autoApproveAbove !== undefined ? L.A.autoApproveAbove : 0)) * 100);
    return `<section class="pa-opt">
      <h3><span>OPTION A &middot; COMMIT ${esc(callOf(d))}</span>
        <span class="d-ai">&#10022; ALLOCATOR PLAN</span></h3>
      <div>
        ${legs.map(x => {
          const ok = x.slack === null ? null : x.slack >= 0;
          return `<div class="pa-kv ${ok === null ? '' : ok ? 'ok' : 'bad'}">
            <span>${esc(D().casId(x.c))} &middot; ${esc(payLabel(x.l.payloadKey))}</span>
            <span>${x.slack === null ? 'reached in ' + MIN(Math.max(0, x.inMin))
              : 'reached in ' + MIN(Math.max(0, x.inMin)) + ' &middot; ' +
                (x.slack >= 0 ? '+' + Math.round(x.slack) : '&minus;' + Math.abs(Math.round(x.slack)))}</span></div>`;
        }).join('')}
        <div class="pa-kv top"><span>Expected survival benefit, as scored</span><span>${p.gain}</span></div>
        <span class="pa-cap">The allocator&rsquo;s own score for this route &times;100, after the discount for threat transit and for how scarce the product is.${
          bar ? ' Standing authority dispatches above ' + bar + ' without asking.' : ''}</span>
      </div></section>`;
  }

  function optB(L, p, d, legs) {
    const esc = D().esc, MIN = D().MIN;
    const g = p.reasons || [];
    const keeps = [];
    const last = g.find(r => r.indexOf('LAST ') === 0);
    if (last) keeps.push('the ' + last.slice(5).toLowerCase() + ' stays at ' + (d ? d.baseName : 'the launch point'));
    if (g.some(r => r.indexOf('THREAT TRANSIT') === 0)) keeps.push('the airframe is not flown through the envelope');
    if (g.indexOf('IMMEDIATE UNASSIGNED') >= 0) keeps.push('the aircraft stays free for the unassigned IMMEDIATE');
    if (!keeps.length) keeps.push((d ? callOf(d) : 'the aircraft') + ' stays ready at ' + (d ? d.baseName : 'the launch point'));
    return `<section class="pa-opt">
      <h3><span>OPTION B &middot; HOLD</span></h3>
      <div>
        ${legs.map(x => `<div class="pa-kv ${x.left === null ? '' : 'bad'}">
            <span>${esc(D().casId(x.c))}</span>
            <span>${x.left === null ? 'no deadline asserted'
              : 'not served &middot; deadline in ' + MIN(Math.max(0, x.left))}</span></div>`).join('')}
        <div class="pa-kv top"><span>Nothing flies</span><span>no benefit claimed</span></div>
        <span class="pa-cap">Nothing flies, so nothing is claimed: ${esc(keeps.join('; '))}. The casualties above stay in the queue and are re-scored on the next allocation.</span>
      </div></section>`;
  }

  /* ---- the grounds, in words -------------------------------------------- */
  function why(L, p, d, lead) {
    const esc = D().esc;
    const bar = Math.round(((L.A.autoApproveAbove !== undefined ? L.A.autoApproveAbove : 0)) * 100);
    const out = [];
    for (const r of (p.reasons || [])) {
      if (r === 'LOW CONFIDENCE')
        out.push(`<b>Low confidence.</b> The expected benefit of this route scored ${p.gain}, below the ${bar} the network holds standing authority above. It will not spend a scarce unit on a marginal gain without a person saying so.`);
      else if (r.indexOf('THREAT TRANSIT') === 0)
        out.push(`<b>Threat transit.</b> The routing crosses a threat envelope at ${esc(r.replace('THREAT TRANSIT ', ''))} probability of losing the airframe in transit. Risking an aircraft is a command call, not a dispatcher&rsquo;s.`);
      else if (r.indexOf('LAST ') === 0)
        out.push(`<b>Last unit.</b> This route takes the ${esc(r.slice(5).toLowerCase())} off the shelf at ${esc(d ? d.baseName : 'that launch point')}. Emptying a launch point commits everyone who is wounded there next.`);
      else if (r === 'IMMEDIATE UNASSIGNED')
        out.push(`<b>Triage displacement.</b> The lead casualty on this route is ${esc(lead ? lead.c.cls : '')}, and an IMMEDIATE inside this aircraft&rsquo;s reach is still unassigned. A person should see that trade before it is made.`);
      else out.push(`<b>${esc(r)}.</b>`);
    }
    out.push('Both branches are written to the record with their reasoning, and a decision not taken lapses at ' +
      EXPIRE_MIN + ' minutes and is recorded with its cost.');
    return `<div class="pa-why"><span class="k">WHY YOU AND NOT IT</span>
      <span class="v">${out.join(' ')}</span></div>`;
  }

  function record(L) {
    const esc = D().esc;
    const r = S.rec;
    return `<div class="pa-rec">
      <span class="t">${esc(r.action)} &middot; ${esc(r.detail)}</span>
      <span class="h">WRITTEN TO RECORD &middot; CHAIN EXTENDED &middot; #${r.seq} sha256 ${esc(auditHashShort(r.hash))}</span></div>`;
  }

  /* ---- the rest of the queue, and what has already been disposed of ----- */
  function others(L, p, pend) {
    const esc = D().esc, MIN = D().MIN;
    const rest = pend.filter(x => x.id !== p.id);
    return `<section class="d-card" style="margin-top:22px"><header>
        <h2>Also awaiting you</h2><span class="d-meta">${rest.length} MORE</span></header>
      <div class="d-tbl">${rest.map(x => `<div class="row" style="grid-template-columns:1fr 150px 90px">
        <span class="sub">${esc(x.summary)}</span>
        <span class="sub">${esc((x.reasons || []).join(' · '))}</span>
        <button class="pa-open" type="button" data-dec="focus:${x.id}">OPEN &rarr;</button></div>`).join('')}
      </div></section>`;
  }

  const H_COLS = '1fr 116px 150px 92px';
  function history(L) {
    const esc = D().esc;
    const done = (L.A.queue || []).filter(p => p.state !== 'PENDING').slice(-8).reverse();
    if (!done.length) return '';
    const word = { APPROVED:'AUTHORISED', REJECTED:'WITHHELD', EXPIRED:'LAPSED UNACTIONED' };
    const col = { APPROVED:'var(--d-teal-2)', REJECTED:'var(--d-t4)', EXPIRED:'var(--d-amb)' };
    return `<section class="d-card" style="margin-top:22px"><header>
        <h2>Decided this shift</h2>
        <span class="d-meta">${L.A.stats.approved} AUTHORISED &middot; ${L.A.stats.rejected} WITHHELD &middot; ${L.A.stats.expired} LAPSED</span></header>
      <div class="d-tbl">
        <div class="hd" style="grid-template-columns:${H_COLS}">
          <span>PROPOSAL</span><span>DISPOSITION</span><span>GROUNDS FOR ESCALATION</span><span class="r">RAISED</span></div>
        ${done.map(p => `<div class="row" style="grid-template-columns:${H_COLS}">
          <span class="sub">${esc(p.summary)}</span>
          <span style="color:${col[p.state] || 'var(--d-t4)'}">${esc(word[p.state] || p.state)}</span>
          <span class="sub">${esc((p.reasons || []).join(' · '))}</span>
          <span class="r sub">T+${p.tRaised.toFixed(1)}</span></div>`).join('')}
      </div></section>`;
  }

  /* ---- nothing is waiting ------------------------------------------------ */
  function quiet(L, q) {
    return `<div style="display:flex;align-items:center;gap:12px">
        <span class="pa-chip" style="background:var(--d-panel-2);color:var(--d-t4)">NOTHING REQUIRES YOU</span>
        <span style="font:400 11px var(--d-mono);color:var(--d-t5)">T+${Math.floor(L.now)} MIN</span></div>
      <div class="pa-lede">Nothing is waiting on you. Everything inside standing authority has already gone,
        and every escalation raised this shift has been disposed of.</div>
      <div class="pa-why"><span class="k">WHAT WOULD REACH YOU</span>
        <span class="v">A route is escalated on named grounds and on nothing else: an expected benefit
        below the standing-authority threshold, a routing that crosses a threat envelope, a draw that
        takes the last unit of a product off a shelf, or a sortie that serves a walking-wounded casualty
        while an IMMEDIATE inside the same aircraft&rsquo;s reach is unassigned. Anything that trips none
        of those is dispatched without you and still written to the record.</span></div>
      ${S.rec ? record(L) : ''}
      ${history(L)}`;
  }

  /* ---- the right-hand column -------------------------------------------- */
  function handled(L) {
    const esc = D().esc;
    const arm = L.A;
    const auto = (arm.audit || []).filter(e => e.action === 'AUTO-DISPATCH').slice(-3).reverse();
    const treated = (arm.audit || []).filter(e => e.action === 'TREAT').slice(-2).reverse();
    const noDl = L.open.filter(c => c.deadlineMin >= 9000).length;
    const items = [];
    for (const e of auto) items.push([e.detail,
      `dispatched under standing authority · T+${e.t.toFixed(1)} · no trade-off to state`]);
    for (const e of treated) items.push([e.detail,
      `T+${e.t.toFixed(1)}${e.meta && e.meta.outcome ? ' · outcome reported ' + String(e.meta.outcome).toLowerCase() : ''}`]);
    if (noDl) items.push([noDl + (noDl === 1 ? ' casualty carries' : ' casualties carry') + ' no asserted deadline',
      'MINIMAL triage — the network holds no physiological clock for them and claims none']);
    return `<section class="pa-panel"><h3><span>HANDLED WITHOUT YOU</span></h3>
      ${items.length ? items.slice(0, 6).map(([a, b]) =>
        `<div class="pa-item"><span class="a">${esc(a)}</span><span class="b">${esc(b)}</span></div>`).join('')
        : '<div class="pa-item"><span class="b">Nothing has been dispatched under standing authority yet.</span></div>'}
      </section>`;
  }

  function theater(L) {
    const esc = D().esc;
    const blood = (L.A.bases || []).reduce((s, b) => s + ((b.stock && b.stock.BLOOD) || 0), 0);
    const sites = (L.A.bases || []).filter(b => b.stock && b.stock.BLOOD > 0).length;
    const inside = L.timed.length - L.unreachable;
    return `<section class="pa-panel"><h3><span>THEATER STATE</span></h3><div class="p">
      <div class="pa-kv"><span>Open casualties</span><span>${L.open.length}</span></div>
      <div class="pa-kv ok"><span>Inside deadline</span><span>${inside}</span></div>
      <div class="pa-kv ${L.unreachable ? 'bad' : ''}"><span>Not reachable in time</span><span>${L.unreachable}</span></div>
      <div class="pa-kv top"><span>Whole blood forward</span><span>${blood}U &middot; ${sites} ${sites === 1 ? 'site' : 'sites'}</span></div>
      <div class="pa-kv"><span>Lift available</span><span>${L.lift.ready} of ${L.lift.all}</span></div>
    </div></section>`;
  }

  /* AGAINST CURRENT — TRIAGE & PROXIMITY. The canvas draws this teal, as a success tile.
     It is a count of the dead, so it is red, and it is never phrased as lives
     saved: the word is fewer dead, the target is zero, and every one of them
     is a person. */
  function toll(L) {
    const delta = L.deadB - L.deadA;
    if (!L.deployed) {
      return `<section class="pa-toll" style="background:var(--d-panel);border:1px solid var(--d-line-hard)">
        <span class="k" style="color:var(--d-t5)">AGAINST CURRENT — TRIAGE & PROXIMITY</span>
        <span class="f" style="color:var(--d-t4)">&mdash;</span>
        <span class="n">ANGEL SWARM is not deployed. Both arms are running current triage and proximity, so there is no difference to report.</span></section>`;
    }
    return `<section class="pa-toll d-death" style="background:var(--d-red-bg);border:1px solid var(--d-red-line)">
      <span class="k d-lab">AGAINST CURRENT — TRIAGE & PROXIMITY</span>
      <span class="f d-fig">${delta > 0 ? delta + ' fewer dead' : delta < 0 ? Math.abs(delta) + ' more dead' : 'level'}</span>
      <span class="n">${L.deadA} died of survivable wounds under ANGEL SWARM against ${L.deadB} under current triage and proximity.
        Same casualties, same aircraft, same blood; the baseline is implemented at its strongest, not as a straw man.</span></section>`;
  }
})();
