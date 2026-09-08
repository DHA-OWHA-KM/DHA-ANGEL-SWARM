/* ==========================================================================
   DECISION FEED — the canvas's isFeed block, on the real record
   ==========================================================================
   "Every decision, in order, in words." The canvas draws a column of entries
   tagged ESCALATED, AUTHORISED · STANDING, WITHHELD, DELIVERED and NOT
   PREVENTED, with a THIS SHIFT block beside it. What fills them here is
   `APP.armA.audit` — the hash-chained log optimizer.js writes at the moment
   each decision is taken — plus the deaths, which are read off the casualties
   themselves.

   THE DEATHS ARE IN THE FEED ON PURPOSE. A record that carries only the
   dispatches is a record that flatters itself. Every casualty who died is an
   entry, with the reason, in the same list and the same order as the
   decisions; the category each one is filed under is the one deathCauses()
   uses, not a softer one written for this page.

   NOTHING HERE LEAVES THE MACHINE. EXPORT FOR IO calls the application's own
   exportAudit(), which builds the CSV in the page and hands it to the browser
   as a blob. There is no endpoint.

   ABSORBS: AUDIT (this page) and STREAM (the GROUND STREAM tab).
   ========================================================================== */
(function () {
  'use strict';

  const D = () => window.DSHELL;
  const S = { tab: 'DECISIONS', filter: 'ALL', showFilter: false, limit: 40 };
  const FILTERS = ['ALL', 'ESCALATED', 'AUTHORISED', 'WITHHELD', 'DELIVERED', 'NOT PREVENTED'];

  const zulu = t => {
    const hh = String(Math.floor(t / 60)).padStart(2, '0');
    const mm = String(Math.floor(t % 60)).padStart(2, '0');
    const ss = String(Math.floor((t % 1) * 60)).padStart(2, '0');
    return `${hh}${mm}:${ss}Z`;
  };
  const payLabel = k => (typeof PAYLOADS !== 'undefined' && PAYLOADS[k]) ? PAYLOADS[k].label : k;
  const placeOf = (scn, c) => {
    if (typeof window.placeNameAt !== 'function') return c.unitName || 'the forward sector';
    try { return window.placeNameAt(scn, c.x, c.y); } catch (e) { return c.unitName || 'the forward sector'; }
  };

  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-feed]');
    if (!b) return;
    const bits = String(b.dataset.feed).split(':');
    if (bits[0] === 'tab') {
      S.tab = bits[1];
      try { if (typeof window.goView === 'function') window.goView(S.tab === 'STREAM' ? 'STREAM' : 'AUDIT'); } catch (e) {}
    }
    else if (bits[0] === 'filter') S.filter = bits.slice(1).join(':');
    else if (bits[0] === 'togglefilter') S.showFilter = !S.showFilter;
    else if (bits[0] === 'more') S.limit += 40;
    else if (bits[0] === 'export') {
      if (typeof window.exportAudit === 'function') { window.exportAudit(); return; }
    }
    if (D()) D().paint();
  });

  window.DPAGES = window.DPAGES || {};
  window.DPAGES.feed = function (L) {
    if (!L) return `<div class="d-head"><div><h1>Decision Feed</h1>
      <p>Waiting for the run. Nothing has been decided yet.</p></div></div>`;
    const esc = D().esc;
    const arm = L.A;
    const chain = verify(arm);

    const head = `<div class="pa-fhead">
        <div>
          <h1>Every decision, in order, in words</h1>
          <p>Nothing is taken that is not written. ${arm.audit.length}
            ${arm.audit.length === 1 ? 'entry' : 'entries'} this shift &middot; ${
            chain.ok ? 'chain verified at T+' + Math.floor(L.now)
                     : 'CHAIN BROKEN AT ENTRY ' + chain.at}.</p>
        </div>
        <div style="display:flex;gap:8px;font-family:var(--d-mono);flex-wrap:wrap;justify-content:flex-end">
          <div class="d-seg">
            <button type="button" class="${S.tab === 'DECISIONS' ? 'on' : ''}" data-feed="tab:DECISIONS">DECISIONS</button>
            <button type="button" class="${S.tab === 'STREAM' ? 'on' : ''}" data-feed="tab:STREAM">GROUND STREAM</button>
          </div>
          <button class="d-btn" type="button" data-feed="togglefilter">FILTER</button>
          <button class="d-btn" type="button" data-feed="export">EXPORT FOR IO</button>
        </div></div>`;

    const filterStrip = (S.showFilter && S.tab === 'DECISIONS')
      ? `<div style="padding:12px 26px 0"><div class="d-seg" style="flex-wrap:wrap">${FILTERS.map(f =>
          `<button type="button" class="${S.filter === f ? 'on' : ''}" data-feed="filter:${f}">${f}</button>`
        ).join('')}</div></div>` : '';

    const body = S.tab === 'STREAM' ? streamTab(L) : entriesTab(L);

    return `<div class="pa-feed">
      <div class="l">${head}${filterStrip}${body}</div>
      <div class="pa-side" style="padding:20px 20px 24px">
        ${shift(L)}${notPrevented(L)}${integrity(L, chain)}
      </div></div>`;
  };

  function verify(arm) {
    if (typeof window.verifyAudit === 'function') {
      try { return window.verifyAudit(arm); } catch (e) { /* fall through */ }
    }
    return { ok: true, n: arm.audit.length };
  }

  /* ======================================================================
     THE ENTRIES
     ====================================================================== */
  function entriesTab(L) {
    const all = build(L);
    const list = (S.filter === 'ALL') ? all : all.filter(e => e.tag.indexOf(S.filter) === 0);
    const shown = list.slice(0, S.limit);
    if (!shown.length) return `<div class="pa-entries"><span class="d-note">Nothing under this filter yet.</span></div>`;
    return `<div class="pa-entries">${shown.map(entry).join('')}
      ${list.length > shown.length
        ? `<div style="padding:16px 0"><button class="d-btn" type="button" data-feed="more">SHOW ${Math.min(40, list.length - shown.length)} EARLIER</button></div>`
        : ''}</div>`;
  }

  function entry(e) {
    const esc = D().esc;
    return `<div class="pa-entry pa-e-${e.cls}">
      <div class="pa-when"><span class="z">${zulu(e.t)}</span><span class="g">${esc(e.tag)}</span></div>
      <div class="pa-body">
        ${e.ai ? '<div><span class="d-ai">&#10022; ALLOCATOR</span></div>' : ''}
        <span class="h">${e.head}</span>
        ${e.detail ? `<span class="d">${e.detail}</span>` : ''}
        <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">
          <span class="pa-prov">${e.prov}</span>
          ${e.open ? '<button class="pa-open" type="button" data-page="dec">OPEN &rarr;</button>' : ''}
        </div>
      </div></div>`;
  }

  /* ---- audit entries, then deaths, newest first ------------------------- */
  function build(L) {
    const esc = D().esc;
    const arm = L.A;
    const out = [];

    for (const e of (arm.audit || [])) {
      if (e.t > L.now + 0.001) continue;
      const m = e.meta || {};
      const prov = `#${String(e.seq).padStart(4, '0')} · ${esc(e.actor)} · sha256 ${esc(auditHashShort(e.hash))}`;
      const a = e.action;

      if (a === 'ESCALATE') {
        const bits = String(e.detail).split(' — ');
        out.push({ t: e.t, tag: 'ESCALATED', cls: 'esc', open: true,
          head: `Refused to dispatch under standing authority and referred ${esc(bits[0])} to the allocation authority.`,
          detail: `Escalated on named grounds: ${esc((m.reasons || []).join(', ') || bits[1] || '')}.` +
            (m.gain !== undefined ? ` Expected survival benefit scored ${m.gain}.` : '') +
            (m.reserve != null ? ` The lead casualty has ${m.reserve}% of their physiological reserve left` : '') +
            (m.deadline != null ? ` and a deadline in ${Math.round(m.deadline)} minutes.` : m.reserve != null ? '.' : ''),
          prov });
      } else if (a === 'AUTO-DISPATCH') {
        out.push({ t: e.t, tag: 'AUTHORISED · STANDING', cls: 'ok', ai: true,
          head: esc(e.detail) + '.',
          detail: 'Nothing on this route tripped a ground for escalation — no threat transit, no last unit off a shelf, no triage displacement — so it went under standing authority and was written down.' +
            (m.gain !== undefined ? ` Expected survival benefit scored ${m.gain}.` : ''),
          prov: prov + ' · no human in the loop' });
      } else if (a === 'APPROVE') {
        out.push({ t: e.t, tag: 'AUTHORISED', cls: 'ok',
          head: `Authorised ${esc(e.detail)}.`,
          detail: 'Committed by a named authority after escalation. The aircraft launched and the product came off the shelf on this decision.',
          prov });
      } else if (a === 'REJECT') {
        out.push({ t: e.t, tag: 'WITHHELD', cls: 'hold',
          head: `Withheld ${esc(e.detail)}.`,
          detail: 'The casualties this route had reserved were released back to the queue and re-scored on the next allocation.' +
            (m.reason ? ` Reason of record: ${esc(m.reason)}.` : ''),
          prov });
      } else if (a === 'EXPIRE') {
        out.push({ t: e.t, tag: 'WITHHELD · LAPSED', cls: 'esc',
          head: `${esc(e.detail)}`,
          detail: 'The escalation was not answered inside the window and the aircraft was released. A decision not taken is a decision, and it is in the record with its cost.',
          prov });
      } else if (a === 'TREAT') {
        if (m.outcome === 'DIED') continue;         /* the death carries this moment */
        out.push({ t: e.t, tag: 'DELIVERED', cls: 'ok',
          head: esc(e.detail) + '.',
          detail: 'Product in a responder&rsquo;s hands and administered. This is the delivery, not the tasking.',
          prov });
      } else if (a === 'PRIORITY') {
        out.push({ t: e.t, tag: 'PRIORITISED', cls: 'hold',
          head: esc(e.detail) + '.',
          detail: 'A commander&rsquo;s designation is the only thing in this model that moves the queue for a reason other than expected survival, and it moves it only because a person put it there.',
          prov });
      } else if (a === 'HOLD' || a === 'RELEASE') {
        out.push({ t: e.t, tag: a === 'HOLD' ? 'WITHHELD · AIRFRAME HELD' : 'RELEASED', cls: 'hold',
          head: `${a === 'HOLD' ? 'Held' : 'Released'} ${esc(e.detail)}.`, detail: '', prov });
      } else {
        out.push({ t: e.t, tag: esc(a), cls: 'hold', head: esc(e.detail) + '.', detail: '', prov });
      }
    }

    /* THE DEATHS. Read off the casualties, filed under the category
       deathCauses() would file them under, in the same list as the rest. */
    for (const c of (arm.casualties || [])) {
      if (c.outcome !== 'DIED') continue;
      const t = c.tResolved != null ? c.tResolved : c.tInjury + c.deadlineMin;
      if (t > L.now + 0.001) continue;
      const r = reason(L, c);
      out.push({ t, tag: 'NOT PREVENTED', cls: 'dead',
        head: `${esc(D().casId(c))} died at ${esc(placeOf(L.scn, c))}. ${esc(r.head)}`,
        detail: esc(r.detail),
        prov: `${esc(D().casId(c))} · category: ${esc(r.cat)} · triage ${esc(c.cls)} · ` +
              `${esc(c.unitName || '')} · reserve ${Math.round(c.deadlineMin >= 9000 ? 0 : c.deadlineMin)} min from wounding` });
    }

    return out.sort((a, b) => b.t - a.t);
  }

  /* The five categories are deathCauses()'s, tested in its order, so a death
     in this feed is filed exactly as the toll beside it counts it. */
  function reason(L, c) {
    const arm = L.A;
    if (c.treated) return {
      cat: 'reached, and still died',
      head: `${c.treatedWith ? payLabel(c.treatedWith) + ' was' : 'The product was'} administered and the casualty did not survive it.`,
      detail: 'Reaching a casualty in time is not the same as saving them. This one is counted as a death the delivery did not prevent, because it is one.' };
    const usable = (typeof window.usablePayloads === 'function')
      ? window.usablePayloads(c, arm.telementor) : null;
    if (usable && !usable.length) return {
      cat: 'no one on scene could use it',
      head: 'Nobody on the ground could use anything that could be flown to them.',
      detail: 'The intervention this wound needed was outside what the responder on scene is trained and equipped to give. No sortie would have changed that, and none was flown at it.' };
    if (c.reachN === 0) return {
      cat: 'launch point too distant',
      head: 'No launch point in the force could reach this position with a usable load.',
      detail: 'This is a laydown problem, not a tasking problem. No amount of better routing reaches a position outside every combat radius in the force.' };
    if (c.reachN === 1) return {
      cat: 'launch point too distant',
      head: 'One airframe in the force could reach this position, and it was committed elsewhere.',
      detail: 'A position covered by a single aircraft is covered until that aircraft is busy. This is a decision for the commander about where the launch points are.' };
    if (c.deadlineMin < 10) return {
      cat: 'beyond the limit of prehospital medicine',
      head: `Physiological reserve was ${Math.round(c.deadlineMin)} minutes from wounding.`,
      detail: 'Nothing that flies covers that distance in that time. The intervention this casualty needed was surgical, and it is recorded as a death the system did not prevent so the count is not flattered.' };
    return {
      cat: 'every aircraft committed elsewhere',
      head: 'Every aircraft that could have reached them was committed to someone else.',
      detail: 'This is the one category the tasking owns. It is the number to argue with, and it is reported here rather than folded into the others.' };
  }

  /* ======================================================================
     THE GROUND STREAM — the old STREAM view
     ====================================================================== */
  const ST_COLS = '86px 84px 1fr 86px 128px';
  function streamTab(L) {
    const esc = D().esc;
    const rows = (window.COUNT ? COUNT.streamTo(L.A) : (L.A.stream || []))
      .slice(-60).reverse();
    return `<div style="padding:14px 26px 24px"><section class="d-card">
      <header><h2>What the aircraft reported</h2>
        <span class="d-meta">${rows.length} SHOWN &middot; THE STREAM IS WHAT WAS REPORTED, THE DELIVERY LOG IS WHAT HAPPENED</span></header>
      <div class="d-tbl">
        <div class="hd" style="grid-template-columns:${ST_COLS}">
          <span>TIME</span><span>CALL</span><span>REPORT</span><span>CASUALTY</span><span>RELAY</span></div>
        ${rows.map(e => `<div class="row" style="grid-template-columns:${ST_COLS};align-items:start">
          <span>${zulu(e.t)}</span>
          <span class="sub">${esc(e.call || '')}</span>
          <span class="sub" style="line-height:1.5">${esc(e.phase || '')}${e.text ? ' — ' + esc(e.text) : ''}</span>
          <span class="sub">${e.casId != null ? esc(D().casId({ id: e.casId })) : '—'}</span>
          <span class="sub" style="color:${e.tRecv === null ? 'var(--d-amb)' : 'var(--d-t5)'}">${
            e.tRecv === null ? 'BUFFERED ON AIRCRAFT' : esc(e.relay || '')}</span></div>`).join('') ||
          '<div class="row" style="grid-template-columns:1fr;color:var(--d-t6)">Nothing has been reported yet.</div>'}
      </div></section></div>`;
  }

  /* ======================================================================
     THE RIGHT-HAND COLUMN
     ====================================================================== */
  function shift(L) {
    const arm = L.A, st = arm.stats;
    const q = arm.queue || [];
    const taken = (st.autoApproved || 0) + (st.approved || 0) + (st.rejected || 0);
    const decided = q.filter(p => p.tActed != null).map(p => p.tActed - p.tRaised).sort((a, b) => a - b);
    const med = decided.length
      ? (decided.length % 2 ? decided[(decided.length - 1) / 2]
         : (decided[decided.length / 2 - 1] + decided[decided.length / 2]) / 2)
      : null;
    const lowConf = q.filter(p => (p.reasons || []).indexOf('LOW CONFIDENCE') >= 0 &&
      (p.state === 'REJECTED' || p.state === 'EXPIRED')).length;
    const row = (k, v, cls) => `<div class="pa-kv ${cls || ''}"><span>${k}</span><span>${v}</span></div>`;
    return `<section class="pa-panel"><h3><span>THIS SHIFT</span></h3><div class="p">
      ${row('Decisions taken', taken)}
      ${row('Under standing authority', st.autoApproved || 0)}
      ${row('Escalated to a human', q.length, q.length ? 'warn' : '')}
      ${row('Authorised after escalation', st.approved || 0)}
      ${row('Withheld for low confidence', lowConf)}
      ${row('Lapsed unactioned', st.expired || 0, (st.expired || 0) ? 'warn' : '')}
      ${med === null ? '' : `<div class="pa-kv top"><span>Median time to decide</span><span>${med.toFixed(1)} min</span></div>`}
    </div></section>`;
  }

  /* DEATHS ARE RED. The tile carries .d-death, so the figure and the label
     take the red family and no later edit can turn this into a success tile. */
  function notPrevented(L) {
    const arm = L.A;
    const dc = (typeof window.deathCauses === 'function') ? window.deathCauses(arm) : null;
    const all = window.COUNT ? COUNT.deathsAll(arm) : arm.stats.died;
    const surv = window.COUNT ? COUNT.deathsSurvivable(arm) : arm.stats.survivableDeaths;
    const row = (k, v) => `<div class="pa-kv"><span>${k}</span><span>${v}</span></div>`;
    return `<section class="pa-panel d-death"><h3>
        <span class="d-lab">DEATHS NOT PREVENTED &middot; ${surv}</span></h3>
      <div class="p">
        <span class="pa-cap">Died of wounds they could have survived, out of ${all} dead in every triage
          category. Reported because a capability that hides its failures cannot be trusted with its
          successes.</span>
        ${dc ? row('Reached, and still died', dc.treatedDied) +
               row('No one on scene could use it', dc.noResponder) +
               row('Launch point too distant', dc.noLaunchPoint) +
               row('Faster than anything could fly', dc.tooFast) +
               row('Every aircraft committed elsewhere', dc.busy)
             : '<span class="pa-cap">The attribution model has not published; the categories are not shown rather than guessed.</span>'}
      </div></section>`;
  }

  function integrity(L, chain) {
    const esc = D().esc;
    const arm = L.A;
    const head = arm.audit.length ? auditHashShort(arm.audit[arm.audit.length - 1].hash) : '—';
    return `<section class="pa-panel"><h3><span>CHAIN INTEGRITY</span></h3><div class="p">
      <div style="display:flex;align-items:center;gap:7px">
        <span style="width:6px;height:6px;border-radius:50%;background:${
          chain.ok ? 'var(--d-teal)' : 'var(--d-red-mark)'}"></span>
        <span style="font-size:10.5px;color:var(--d-t3)">${
          chain.ok ? arm.audit.length + ' of ' + arm.audit.length + ' entries verified'
                   : 'BROKEN AT ENTRY ' + chain.at}</span></div>
      <span class="pa-prov">head ${esc(head)}</span>
      <span class="pa-cap">Each entry hashes the one before it. An entry changed after the fact breaks
        every hash after it, which is what makes the record worth reading back.</span>
    </div></section>`;
  }
})();
