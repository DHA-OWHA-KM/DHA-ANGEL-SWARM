/* ==========================================================================
   OPS CENTRE WALL — ten-foot readable
   ==========================================================================
   The one screen in this application designed to be read from the other side
   of a room: three figures at 92px, a deadline board at 20px, and a posture
   column. It takes the full width of the main column and carries no cards,
   because a card border is a thing you can only see from a desk.

   It absorbs the old DASHBOARD — the theatre picker and its stage — which is
   the second tab. The wall itself is the default, because a wall that opens
   on a map is a map.

   THE DELTA AGAINST THE CONTROL ARM IS RED. The canvas draws it as a teal
   success tile reading "−12 DEAD". Every figure in it is a count of people
   who died, so it takes the red family and the words are "fewer dead".
   ========================================================================== */
(function () {
  'use strict';
  const P = window.DPB;
  const D = () => window.DSHELL;
  if (!P) return;
  const esc = P.esc;

  const TABS = [
    { k: 'WALL',    label: 'WALL' },
    { k: 'THEATER', label: 'THEATRE', view: 'DASHBOARD' }
  ];

  window.DPAGES = window.DPAGES || {};
  window.DPAGES.ops = function (L) {
    const tab = P.tab('ops', 'WALL');
    const head = `<div class="b-wall-bar">
        <span>OPS CENTRE WALL &middot; TEN-FOOT READABLE &middot; SYNTHETIC DATA</span>
        <span>ANGEL SWARM &middot; ${esc(L && L.scn ? (L.scn.name || '') : '')} &middot; ${L ? P.zulu(L.now) : '----:--Z'}</span>
      </div>
      <div class="b-segbar">${P.seg('ops', 'WALL', TABS)}
        <span class="d-meta">THE THEATRE PICKER AND ITS STAGE ARE THE SECOND TAB</span></div>`;

    if (tab !== 'WALL') {
      P.dock('opsSlot', 'DASHBOARD');
      return `<div class="b-wall">${head}<div style="padding:10px 20px 24px">${P.slot('opsSlot')}</div></div>`;
    }
    P.release();
    D().searchContext('Search wall records', 'wall records');

    if (!L) return `<div class="b-wall">${head}
      <div class="b-h">NO RUN IS LOADED IN THIS PAGE YET</div></div>`;

    return `<div class="b-wall">${head}${band(L)}
      <div class="b-low"><div class="l">${board(L)}</div><div>${posture(L)}</div></div></div>`;
  };

  /* ---- the three figures ------------------------------------------------- */
  function band(L) {
    const MIN = D().MIN;
    const t = L.tightest;
    const breach = L.timed.filter(r => r.unreachable || (r.slack !== null && r.slack < 0));
    const q = P.pending(L.A);
    const wait = q.length ? Math.max(...q.map(p => Math.max(0, L.now - p.tRaised))) : 0;

    const tightSub = !t ? 'nothing open inside a deadline'
      : esc(D().casId(t.c)) + ' &middot; ' + esc(t.site ? t.site.b.name : (t.c.unitName || 'the line')) +
        (t.eta === null ? ' &middot; no aircraft in reach' : ' &middot; reached in ' + MIN(t.eta));

    const breachSub = !breach.length ? 'every open casualty is inside the reach of an aircraft'
      : breach.slice(0, 3).map(r => esc(D().casId(r.c)) + ' ' +
          (r.unreachable ? 'no asset' : P.sgn(r.slack))).join(' &middot; ');

    const escSub = !q.length ? 'nothing is not delegable under standing authority'
      : esc(q[0].summary) + ' &middot; ' + esc((q[0].reasons || []).join(' · ') || 'raised to a person');

    return `<div class="b-band">
      <div>
        <span class="k">TIGHTEST DEADLINE</span>
        <div class="v"><span class="n">${t ? Math.max(0, Math.round(t.left)) : 0}</span>
          <span class="u">${t ? 'MIN' : 'OPEN'}</span></div>
        <span class="s">${tightSub}</span>
      </div>
      <div class="${breach.length ? 'crit d-death' : ''}">
        <span class="k">UNREACHABLE IN TIME</span>
        <div class="v"><span class="n">${breach.length}</span>
          <span class="u">${breach.length === 1 ? 'CASUALTY' : 'CASUALTIES'}</span></div>
        <span class="s">${breachSub}</span>
      </div>
      <div class="${q.length ? 'amb' : ''}">
        <span class="k">AWAITING AUTHORITY</span>
        <div class="v"><span class="n">${q.length}</span>
          <span class="u">${q.length ? Math.round(wait) + ' MIN' : 'NONE'}</span></div>
        <span class="s">${escSub}</span>
      </div></div>`;
  }

  /* ---- the deadline board ------------------------------------------------ */
  function board(L) {
    const MIN = D().MIN;
    const SHOW = 5;
    const found = L.timed.filter(r => {
      const c = r.c;
      const stale = (L.now - c.tPinged) > 2;
      const d = P.droneOf(L.A, c.assignedTo);
      const asset = c.treated ? 'delivered' : d ? P.call(d) : stale ? 'withheld' :
        r.unreachable ? 'no asset unreachable' : 'queued';
      return D().matches(D().casId(c), r.site && r.site.b.name, c.unitName,
        asset, r.left, r.slack, 'deadline casualty');
    });
    const rows = found.slice(0, SHOW).map(r => {
      const c = r.c;
      const breach = r.unreachable || (r.slack !== null && r.slack < 0);
      const stale = (L.now - c.tPinged) > 2;
      const d = P.droneOf(L.A, c.assignedTo);
      const slack = r.slack === null
        ? '<span class="r" style="font-size:16px;color:var(--d-t6)">none</span>'
        : `<span class="r" style="color:${r.slack < 0 ? 'var(--d-red)' : 'var(--d-teal)'};font-weight:${r.slack < 0 ? 700 : 400}">${P.sgn(r.slack)}</span>`;
      const asset = c.treated ? 'DELIVERED' : d ? P.call(d) : stale ? 'WITHHELD' : r.unreachable ? 'NO ASSET' : 'QUEUED';
      return `<div class="b-brow${breach ? ' breach' : ''}" data-page="cas">
        <span style="font-weight:${breach ? 700 : 600}">${esc(D().casId(c))}</span>
        <span class="site">${esc(r.site ? r.site.b.name : (c.unitName || '—'))}</span>
        <span class="r">${Math.max(0, Math.round(r.left))}</span>
        ${slack}
        <span class="as">${esc(asset)}</span></div>`;
    }).join('');
    const rest = found.length - Math.min(SHOW, found.length);
    const empty = D().query()
      ? D().noMatches('casualties')
      : '<div class="b-bfoot">No casualty is inside a deadline this system holds.</div>';
    return `<div class="b-h">DEADLINE BOARD &middot; BY TIME REMAINING</div>
      <div class="b-board">
        <div class="b-bhd"><span>CASUALTY</span><span>SITE</span>
          <span class="r">DEADLINE</span><span class="r">SLACK</span><span class="r">ASSET</span></div>
        ${rows || empty}
        ${rest > 0 ? `<div class="b-bfoot">+ ${rest} more open, further out</div>` : ''}
      </div>`;
  }

  /* ---- posture ------------------------------------------------------------ */
  function posture(L) {
    const C = window.COUNT;
    const s = P.shelf(L.A);
    const lk = P.link();
    const delta = L.deadB - L.deadA;
    const auth = window.APP && window.APP.angelActive ? 'STANDING' : 'NOT DELEGATED';

    const deltaTile = !L.deployed
      ? `<div class="b-delta" style="background:var(--d-panel);border-color:var(--d-line-hard)">
           <span class="d-lab" style="color:var(--d-t6)">VS CURRENT — TRIAGE & PROXIMITY &middot; SAME INPUTS</span>
           <span class="d-fig" style="color:var(--d-t4)">NOT DEPLOYED</span></div>`
      : `<div class="b-delta d-death">
           <span class="d-lab">VS CURRENT — TRIAGE & PROXIMITY &middot; SAME INPUTS</span>
           <span class="d-fig">${delta === 0 ? 'LEVEL' : Math.abs(delta) + (delta > 0 ? ' FEWER DEAD' : ' MORE DEAD')}</span></div>`;

    return `<div class="b-h">POSTURE</div>
      <div class="b-post">
        <div class="b-prow"><span>LTOWB FORWARD</span>
          <b>${s.units}<i>U · ${s.sites} site${s.sites === 1 ? '' : 's'}</i></b></div>
        <div class="b-prow"><span>LIFT READY</span>
          <b>${L.lift.ready}<i>/${L.lift.all} · ${L.lift.air} airborne</i></b></div>
        <div class="b-prow"><span>SORTIES FLOWN</span>
          <b>${C ? C.sorties(L.A) : '—'}<i>${C ? ' · ' + C.administered(L.A) + ' administered' : ''}</i></b></div>
        ${deltaTile}
        <div class="b-chips">
          <div class="ok"><span>AUTHORITY</span><b>${esc(auth)}</b></div>
          <div class="${lk.live ? 'ok' : 'warn'}"><span>LINK</span><b>${esc(lk.live ? 'LOCAL DECIDE' : 'DOWN')}</b></div>
        </div>
      </div>`;
  }
})();
