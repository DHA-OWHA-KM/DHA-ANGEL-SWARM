/* =========================================================================
   KPI STRIPS — every destination opens with numbers, not with a paragraph.

   THE DEFECT THIS EXISTS TO FIX. Eleven of this application's destinations
   opened with two or three sentences of explanation and no figure at all.
   A reviewer arriving on one of them had to read before he could look, and
   the pane that carried the argument looked exactly like the pane that
   carried the file format. The reference console every judge in the room has
   already seen opens each page with a row of large stat callouts — a figure,
   a caption naming what was counted, and one line saying what it is measured
   against. This file gives this application the same opening move.

   WHERE THE NUMBERS COME FROM. Every figure on every strip below is read
   from COUNT (app.js § THE COUNTED NOUNS) wherever COUNT defines the noun,
   and the caption is COUNT.LABEL wherever COUNT publishes one. That is not
   style. "Died" has meant three different populations in this application
   before now, and a strip is the worst possible place to reintroduce that:
   it is the largest type on the screen and the first thing read. Where a
   quantity is genuinely outside COUNT's vocabulary — how many passages are
   in the doctrine corpus, how many tables the DuckDB schema holds — it is
   read from the module that owns it, live, and never restated here.

   WHAT IS NOT HERE, AND WHY. DECIDE, MISSION, CASUALTIES, FLEET,
   LAUNCHPOINTS, SUPPLY, TASKING, AFTERACTION and CONFIDENCE already open
   with their own figures and are left alone. So are five of the fifteen
   destinations this file was pointed at:

     STANDARD  — opens with .stdFacts, four stat callouts above the fold,
                 and has no .paneHead to hang a strip beneath.
     COMPARE   — opens with the scoreboard, the largest number in the
                 application. No .paneHead either.
     DASHBOARD — the map's own thStats sit above the fold and #dbTiles
                 carries four coloured theatre-wide COUNT figures below it.
                 A strip above the map would restate the same four numbers
                 two hundred pixels higher up.
     STREAM    — #strTiles is already directly beneath the head: five tiles,
                 COUNT figures, semantic colour. It lacks nothing.
     SETTINGS  — nothing on it is a measurement. It is controls, and a strip
                 restating the positions of its own sliders would be
                 decoration wearing the clothes of evidence.

   Their ledes are still shortened where they run long, because that half of
   the complaint applies to a pane whether or not it needs tiles.

   HOW IT ATTACHES. ANGEL.views is full — every key this file touches is
   already spoken for by app.js's dispatch or by another module — so this
   file wraps window.render the way js/role-commander.js wraps it for the
   decision bar: the native binding is captured in a local before the wrapper
   is installed, so no wrapper can ever resolve back to itself, and a
   `_kpiTick` stamp makes double-wrapping impossible if the file is loaded
   twice. On each frame it looks at one pane — the active one — and does
   nothing anywhere else.

   THE COLOUR RULE. A strip printed entirely in one ink is a strip nobody
   reads; the eye needs to be told which tile is the toll and which is the
   capability. So a tile takes a semantic token where it has a meaning —
   --bad for a death toll, --tollLo for the difference between two tolls,
   --warn where a person has to act, --angel for the ANGEL SWARM arm,
   --current for the doctrinal one — and --text where it means nothing in
   particular. Every one of those is a custom property. There are four
   themes and not one hex code in this file.

   AND A DEATH COUNT IS NEVER GREEN. The words are "fewer dead", never
   "saved" and never "lives saved"; the qualifier says the target is zero;
   and where the difference runs the wrong way the tile says "more dead" in
   --bad rather than printing a negative number under a positive caption.
   ========================================================================= */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ CSS */
  /* Sized off .kpi/.kpis in css/app.css and off .lpHeadR on the launch-points
     page, because three strips built to three sets of numbers is how a
     console stops looking like one product. Big figure 20px mono bold,
     caption 8.5px mono uppercase letterspaced, qualifier 10px sans muted,
     tiles 26px apart. */
  const CSS = `
.kpiStrip{
  display:flex; align-items:flex-start; gap:26px; flex-wrap:wrap;
  margin:16px 0; padding:0;
}
/* .pane is a flex column with a 12px gap of its own, so a 16px margin inside
   one reads as 28. Trim to 4 and the strip keeps exactly the 16px of
   clearance it is supposed to have, in both kinds of parent. */
.pane > .kpiStrip{ margin:4px 0 }

.kpiStrip .kpi{
  background:transparent; border:0; padding:0; min-width:0;
  text-align:left; max-width:23ch;
}
/* A figure is one number and sits on one line. The launch-points strip
   learned this the hard way when "2 /2" wrapped its denominator under its
   numerator and dropped one tile in a row of six a line lower than the
   other five. */
.kpiStrip .kpi b{
  display:block; font:700 20px/1 var(--mono); color:var(--text);
  white-space:nowrap; letter-spacing:-.01em;
}
/* Captions run to two lines often and to one line often, and a row whose
   qualifiers sit at four different heights reads as four strips rather than
   one. Hold two lines of caption whether or not the second is used. */
.kpiStrip .kpi span{
  display:block; margin-top:7px; min-height:23px; font:600 8.5px/1.35 var(--mono);
  letter-spacing:.1em; text-transform:uppercase; color:var(--faint);
}
.kpiStrip .kpi i{
  display:block; margin-top:6px; font:400 10px/1.45 var(--sans);
  font-style:normal; color:var(--dim);
}

/* Semantic tokens only. Four themes, no hex. */
.kpiStrip .kpi b.kBad  { color:var(--bad) }
.kpiStrip .kpi b.kToll { color:var(--tollLo) }
.kpiStrip .kpi b.kWarn { color:var(--warn) }
.kpiStrip .kpi b.kAngel{ color:var(--angel) }
.kpiStrip .kpi b.kCtrl { color:var(--current) }

/* ---- the lede fold ----------------------------------------------------
   Nothing written is deleted. The first sentence stays in the open and the
   rest goes one click away, closed on arrival, so the pane opens on its
   figures instead of on its third subordinate clause. */
.kpiWhy{ display:inline }
.kpiWhyBtn{
  appearance:none; background:transparent; border:0; padding:0; margin-left:7px;
  cursor:pointer; font:700 9px/1 var(--mono); letter-spacing:.13em;
  text-transform:uppercase; color:var(--faint); border-bottom:1px solid var(--line);
}
.kpiWhyBtn:hover{ color:var(--text); border-bottom-color:var(--dim) }
.kpiWhyBtn:focus-visible{ outline:1px solid var(--angel); outline-offset:2px }
/* [hidden] is a display:none of the lowest possible weight and any rule at
   all beats it. State the closed case explicitly rather than trust it. */
.kpiWhyRest[hidden]{ display:none }
.kpiWhyRest:not([hidden]){ display:block; margin-top:7px; color:var(--dim) }

/* A block with no readable first sentence collapses whole, behind one line
   of label. The button then IS the paragraph, so it sits on its own line. */
.kpiWhyAll{ display:block }
.kpiWhyAll > .kpiWhyBtn{ margin-left:0 }

/* ---- the shared disclosure -------------------------------------------
   For a TABLE of evidence rather than a paragraph of it. Closed on arrival,
   always; a summary line that says what is inside and, where there is one,
   the single figure that matters; and the whole table one press away. Native
   <details>, so it is keyboard-operable and findable without a line of JS. */
.disc{ border-top:1px solid var(--line); margin-top:8px; padding-top:7px }
.disc > summary{
  list-style:none; cursor:pointer; display:flex; align-items:baseline; gap:10px;
  font:700 9px/1.5 var(--mono); letter-spacing:.13em; text-transform:uppercase;
  color:var(--faint);
}
.disc > summary::-webkit-details-marker{ display:none }
.disc > summary::after{ content:'+'; margin-left:auto; font:700 12px/1 var(--mono) }
.disc[open] > summary::after{ content:'–' }
.disc > summary:hover{ color:var(--text) }
.disc > summary:focus-visible{ outline:1px solid var(--angel); outline-offset:3px }
.disc > summary b{
  font:700 11px/1.4 var(--mono); letter-spacing:0; text-transform:none; color:var(--text);
}
.disc > summary b.q{ color:var(--dim); font-weight:500 }
.disc > *:not(summary){ margin-top:9px }
`;

  const WHY = 'why this matters';
  const DETAIL = 'detail';
  const LESS = 'less';

  function injectCSS() {
    if (document.getElementById('kpiCss')) return;
    const s = document.createElement('style');
    s.id = 'kpiCss'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* --------------------------------------------------------------- basics */
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  /* Write only when the markup actually changed. These run on the render
     tick, which is up to 3 Hz on a data pane and 60 Hz on a live one, and
     replacing identical markup churns the DOM under the operator's cursor
     for nothing — the defect that made table rows unclickable. */
  function paint(el, html) {
    if (!el) return;
    if (el._kpiH === html) return;
    el._kpiH = html; el.innerHTML = html;
  }

  const n0 = v => (v === null || v === undefined || !isFinite(v))
    ? null : Math.round(v).toLocaleString();
  const fx = (v, d) => (v === null || v === undefined || !isFinite(v))
    ? null : Number(v).toFixed(d);

  /* A tile with nothing honest in it is not a tile. Anything that cannot be
     derived returns null here and is dropped from the row rather than
     printed as a dash, a zero that means "unknown", or NaN. */
  function tile(v, caption, qualifier, tone) {
    const s = (typeof v === 'number') ? n0(v) : (v == null ? null : String(v));
    if (s === null || s === '' || s === 'NaN' || s === 'undefined') return null;
    return `<div class="kpi"><b class="mono ${tone || ''}">${esc(s)}</b>` +
           `<span>${esc(caption)}</span>` +
           (qualifier ? `<i>${esc(qualifier)}</i>` : '') + `</div>`;
  }

  /* COUNT by bare name: this is a classic script, same scope as app.js. The
     typeof guard is not decoration — this file can be dropped into a build
     whose app.js failed, and a strip is not worth a blank console. */
  const C = () => (typeof COUNT !== 'undefined' && COUNT && COUNT.LABEL) ? COUNT : null;

  /* Both arms or nothing. Every comparison below quotes the control arm in
     its qualifier, and a strip that shows one arm's figure with no statement
     of what it is measured against is the kind of number a reviewer is right
     to distrust. */
  function arms() {
    if (typeof APP === 'undefined' || !APP || !APP.world) return null;
    if (!APP.armA || !APP.armB || !APP.armA.casualties || !APP.armB.casualties) return null;
    return { A: APP.armA, B: APP.armB };
  }

  const svc = k => (window.ANGEL && typeof ANGEL.get === 'function') ? ANGEL.get(k) : null;

  /* THE DIFFERENCE BETWEEN TWO DEATH TOLLS, which is the one figure in this
     application most likely to be printed under a caption it contradicts.
     Three cases and three captions, and the number is always positive under
     a caption that says which direction it runs. Never green: fewer dead is
     still dead, so the good case takes --tollLo, which is amber. */
  function fewerDead(c, A, B) {
    const a = c.deathsSurvivable(A), b = c.deathsSurvivable(B);
    if (!isFinite(a) || !isFinite(b)) return null;
    const d = b - a;
    if (d > 0) return tile(d, 'Fewer dead of survivable wounds',
      n0(a) + ' still died under ANGEL SWARM; the target is zero', 'kToll');
    if (d < 0) return tile(-d, 'More dead of survivable wounds',
      n0(a) + ' under ANGEL SWARM against ' + n0(b) + ' under current triage and proximity', 'kBad');
    return tile(0, 'Fewer dead of survivable wounds',
      'level at ' + n0(a) + ' on both arms; the target is zero', 'kToll');
  }

  const against = (c, f, B) => 'against ' + n0(f(B)) + ' under current triage and proximity';
  const plural = (n, one, many) => n0(n) + ' ' + (n === 1 ? one : (many || one + 's'));

  /* ===================================================== THE STRIPS ======
     One builder per destination. Each returns an array of tile markup —
     nulls are dropped — or null to render no strip at all, which is what
     happens on a pane whose owning module has not loaded and therefore has
     no honest figure to publish. Three to five tiles; a row of one is a
     stray number, not a strip. */
  const SPEC = {

    /* THE CASE BEYOND LIVES. The three quantities this pane argues from are
       blood, flying and wasted flying — large, uncontested, and measured on
       the same run — with the toll last, where the pane's own lede puts it. */
    ROI() {
      const c = C(), m = arms(); if (!c || !m) return null;
      const { A, B } = m;
      return [
        tile(c.bloodDestroyed(A), c.LABEL.BLOOD_DESTROYED,
          against(c, c.bloodDestroyed, B), 'kAngel'),
        tile(c.sortiesWasted(A), 'Sorties wasted',
          'carrying what nobody there could use — ' + n0(c.sortiesWasted(B)) + ' under current triage and proximity',
          c.sortiesWasted(A) ? 'kWarn' : ''),
        tile(c.sorties(A), c.LABEL.SORTIES, against(c, c.sorties, B), ''),
        fewerDead(c, A, B)
      ];
    },

    /* WHAT IT COSTS. The procurement-relevant finding on this pane is that
       the laydown moves the death count, so the coverage figures lead and
       the consumables follow. */
    COST() {
      const c = C(), m = arms(); if (!c || !m) return null;
      const { A, B } = m;
      let t = null;
      try { t = c.thinlyCovered(A); } catch (e) { t = null; }
      /* The fewer-dead figure is deliberately absent. The commander's own
         headline line sits forty pixels below this strip and carries it, and
         the same integer twice on one screen under two different phrasings is
         how a reviewer starts counting the ways this application says things
         twice. What this pane alone can say is where the laydown, not the
         tasking, was the binding constraint. */
      return [
        tile(c.deathsFromCoverage(A), 'Died where the laydown was binding',
          'one airframe in the force could reach them, or none', 'kBad'),
        t ? tile(t.thin, 'Casualties one airframe reaches, or none',
          t.where ? 'worst at ' + t.where : 'across this operation', t.thin ? 'kWarn' : '') : null,
        tile(c.bloodDestroyed(A), c.LABEL.BLOOD_DESTROYED, against(c, c.bloodDestroyed, B), 'kAngel'),
        tile(c.sorties(A), c.LABEL.SORTIES, against(c, c.sorties, B), '')
      ];
    },

    /* EVIDENCE. What has been captured, and what the run on screen says —
       the pane's own sweep block reports the rest. */
    ANALYSIS() {
      const c = C(), m = arms(); if (!c || !m) return null;
      const { A, B } = m;
      const runs = (APP.runs || []);
      const live = runs.filter(r => r && r.live).length;
      return [
        tile(runs.length, 'Runs captured this session',
          live ? live + ' of them flown in front of you' : 'nothing captured yet — capture the run or sweep', ''),
        tile(c.deathsSurvivable(A), c.LABEL.DIED_SURVIVABLE,
          'in the run on screen, ' + against(c, c.deathsSurvivable, B), 'kBad'),
        fewerDead(c, A, B),
        tile(A.casualties.length, 'Casualties in the run on screen',
          n0(c.survivableTotal(A)) + ' of them in the survivable cohort', '')
      ];
    },

    /* DECISION LOG. The question this pane answers is who decided, so the
       split between delegated authority and a person's signature is the
       strip, and the chain is the fourth tile because a log nobody can prove
       is a log nobody should believe. */
    AUDIT() {
      const m = arms(); if (!m) return null;
      const log = m.A.audit || [];
      let v = null;
      if (typeof verifyAudit === 'function') { try { v = verifyAudit(m.A); } catch (e) { v = null; } }
      const byPerson = log.filter(e => e && e.actor === 'OPERATOR').length;
      const kinds = new Set(log.map(e => e && e.action).filter(Boolean)).size;
      /* The total is deliberately not its own tile. Until a person has signed
         something it is the same integer as the tile beside it, and two
         identical figures side by side under two captions is how a reviewer
         concludes one of them is wrong. It rides in the qualifier instead. */
      return [
        tile(log.length - byPerson, 'Entries the system wrote',
          'delegated authority, logged — ' + n0(log.length) + ' in the log altogether', 'kAngel'),
        tile(byPerson, 'Entries a person signed',
          'authorisations, holds and policy changes', byPerson ? 'kWarn' : ''),
        tile(kinds, 'Kinds of decision recorded',
          'each entry names its action and its grounds', ''),
        v ? tile(v.ok ? 0 : 1, 'Broken links in the chain',
          v.ok ? 'change one character and this stops being zero'
               : 'entry ' + v.at + ' no longer hashes to its predecessor',
          v.ok ? '' : 'kBad') : null
      ];
    },

    /* CASUALTY FLOW. The funnel below counts the survivable cohort only and
       the two death counts differ for a reason, so both are on the strip
       under the labels COUNT publishes for them. */
    FLOW() {
      const c = C(), m = arms(); if (!c || !m) return null;
      const { A, B } = m;
      let tasked = null;
      try { tasked = c.tasked(A).size; } catch (e) { tasked = null; }
      return [
        tile(c.survivableTotal(A), 'In the survivable cohort',
          'of ' + n0(A.casualties.length) + ' wounded, every triage category', ''),
        tile(tasked, c.LABEL.TASKED, 'the delivery log is the record, not the scores', ''),
        tile(c.administered(A), c.LABEL.ADMINISTERED,
          'reached the person and the responder put it in', 'kAngel'),
        tile(c.deathsSurvivable(A), c.LABEL.DIED_SURVIVABLE, against(c, c.deathsSurvivable, B), 'kBad'),
        tile(c.deathsAll(A), c.LABEL.DIED_ALL, 'the funnel counts the survivable cohort only', 'kBad')
      ];
    },

    /* UNITS. The roster's own death column and this tile are the same
       quantity read from the same place, which is the entire point of
       COUNT.deathsAll living where it does. */
    UNITS() {
      const c = C(), m = arms(); if (!c || !m) return null;
      if (typeof unitRoll !== 'function' || !APP.units) return null;
      let r = null;
      try { r = unitRoll('ALL'); } catch (e) { r = null; }
      if (!r) return null;
      return [
        tile(APP.units.length, 'Units on the roster',
          n0(r.assigned) + ' soldiers assigned across them', ''),
        tile(r.open, 'Wounded still on the ground', 'at the mission clock', ''),
        tile(r.urgent, 'Below the reserve floor',
          'reserve past the red line — these need a decision now', r.urgent ? 'kWarn' : ''),
        tile(c.deathsAll(m.A), c.LABEL.DIED_ALL,
          'the roster below counts this same number', 'kBad')
      ];
    },

    /* SENSOR & MODEL. Nothing here is a run figure; every number is a
       property of the network, read live from the module that loaded it. If
       the model did not load the pane says so in its own words and this
       strip does not appear. */
    SENSOR() {
      const net = svc('cri-net');
      if (!net || !net.meta) return null;
      const meta = net.meta, q = meta.metrics || {};
      const hr = fx(q.mae_heart_rate_only, 3);
      return [
        tile(meta.parameters, 'Parameters in the network',
          '1-D convolutional, five blocks, CPU only', ''),
        tile(fx(q.mae, 3), 'Mean absolute error, CRI',
          hr ? 'against ' + hr + ' from pulse rate alone' : 'on people held out of training', 'kAngel'),
        tile(meta.heldout && meta.heldout.subjects, 'People held out of training',
          'split by person, not by sample', ''),
        tile(meta.onnx_bytes ? Math.round(meta.onnx_bytes / 1024) : null, 'KB of ONNX on this machine',
          'nothing here reaches a network', '')
      ];
    },

    /* DOCTRINE RETRIEVAL. Corpus size is the claim this pane has to survive
       — a retrieval system that cannot say how much it is retrieving from is
       asking to be taken on trust. The latency tile appears only once
       somebody has actually run a search. */
    DOCTRINE() {
      const d = svc('doctrine');
      if (!d || typeof d.stats !== 'function') return null;
      let s = null;
      try { s = d.stats(); } catch (e) { s = null; }
      if (!s) return null;
      return [
        tile(s.passages, 'Passages in the corpus',
          'summaries written for this prototype — read the notice below', 'kAngel'),
        tile(s.sentences, 'Sentences indexed', 'the encoder ranks these and quotes one back', ''),
        tile(d.publications && d.publications.length, 'Publications they came from',
          'every answer names one', ''),
        /* The latency is the capability claim on this pane, not a footnote:
           doctrine retrieval that has to reach a network is doctrine
           retrieval that does not work in the place this is for. It takes
           the ANGEL SWARM token for that reason. It appears only once
           somebody has run a search, because a median over nothing is not a
           median. */
        s.queries ? tile(fx(s.p50ms, 1), 'Median search, ms',
          'over ' + plural(s.queries, 'query', 'queries') + ', on this machine, offline', 'kAngel') : null
      ];
    },

    /* ANALYTICAL CONSOLE. What is queryable, and the one figure in it a
       reviewer will want to check against the rest of the application. The
       schema counts come from the engine, not from a number typed here. */
    QUERY() {
      const c = C(), m = arms(); if (!c || !m) return null;
      const db = svc('db');
      if (!db || typeof db.tables !== 'function') return null;
      let tabs = null;
      try { tabs = db.tables() || []; } catch (e) { tabs = null; }
      if (!tabs) return null;
      const cols = tabs.reduce((s, t) => s + ((t && t.cols && t.cols.length) || 0), 0);
      const { A, B } = m;
      return [
        tile(tabs.length, 'Tables in the DuckDB schema', 'both arms, under an arm discriminator', 'kAngel'),
        tile(cols || null, 'Columns across them', 'click one on the left to insert it', ''),
        tile(A.casualties.length + B.casualties.length, 'Casualty rows, both arms',
          'the transactional record, not a summary of it', ''),
        tile(c.deathsSurvivable(A) + c.deathsSurvivable(B), 'Of them dead of survivable wounds',
          n0(c.deathsSurvivable(A)) + ' on the ANGEL SWARM arm, ' +
          n0(c.deathsSurvivable(B)) + ' under current triage and proximity', 'kBad')
      ];
    },

    /* THE FILE. Everything here describes what the operator is about to
       download. The row count is only real once the database has been
       built, so before that the tile is absent rather than zero — "0 rows"
       and "not built yet" are not the same statement. */
    DATA() {
      const c = C(), m = arms(); if (!c || !m) return null;
      const { A } = m;
      let tabs = null;
      if (typeof DB !== 'undefined' && DB && DB.ready && typeof DB.tables === 'function') {
        try { tabs = DB.tables() || []; } catch (e) { tabs = null; }
      }
      const rows = (typeof APP.dbRows === 'number' && APP.dbRows > 0) ? APP.dbRows : null;
      return [
        tabs && tabs.length ? tile(tabs.length, 'Tables in the SQLite file',
          'every table, with its types and its foreign keys', 'kAngel') : null,
        rows ? tile(rows, 'Rows written', 'from the run as it stood at that minute', '') : null,
        tile(A.casualties.length, 'Casualty records in the file',
          'the ANGEL SWARM arm only — the control arm is not in it', ''),
        tile((A.audit || []).length, 'Audit entries in the file',
          'the hash chain travels with them', ''),
        tile(c.deathsAll(A), c.LABEL.DIED_ALL, 'every one of them a row you can open elsewhere', 'kBad')
      ];
    }
  };

  /* The lede fold is now global — there is no exception list, because an
     exception list is how the wall of text grew back the last time. */

  /* ================================================== THE LEDE FOLD ======
     Keep the first sentence, put the rest one click away. Nothing is
     rewritten and nothing is deleted — the remainder is the author's own
     markup, moved.

     The split runs over the HTML rather than over the text because these
     ledes carry <b>, <span class="jarg"> and provenance marks inside the
     sentence being kept, and a split taken on textContent loses them. Tag
     depth is tracked so a full stop inside an element — "…Doctrine calls
     this Class VIII." sits inside a span on one of these panes — is never
     a candidate: cutting there would hand back two halves of unbalanced
     markup. At depth zero every tag opened has been closed, so both halves
     are balanced by construction. */
  const ABBREV = /^(e\.g|i\.e|vs|etc|Fig|No|Nos|Dr|Mr|Mrs|Ms|St|Col|Gen|Lt|Capt|Sgt|Maj|approx|cf|al|Jr|Sr)$/i;

  function splitLede(html) {
    const s = String(html || '');
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '<') {
        const end = s.indexOf('>', i);
        if (end < 0) return null;                       /* malformed; leave it alone */
        const tag = s.slice(i + 1, end);
        if (tag.charAt(0) === '/') depth--;
        else if (tag.charAt(tag.length - 1) !== '/' && !/^(br|img|hr|input|wbr|meta|link)\b/i.test(tag)) depth++;
        /* "<b>Not yet measured.</b> The figure…" — the terminator sits INSIDE
           the bold, one character deep, and a depth-zero-only scan walks
           straight past it and folds the whole paragraph away. A closing tag
           that lands back at depth zero on the heels of a full stop is a
           sentence end like any other. */
        if (depth === 0 && tag.charAt(0) === '/' && /[.!?]$/.test(s.slice(0, i))) {
          const rest0 = s.slice(end + 1);
          const m0 = /^\s+(\S)/.exec(rest0);
          if (m0 && (m0[1] === '<' || /["“A-Z0-9]/.test(m0[1]))) {
            const head0 = s.slice(0, end + 1);
            const tail0 = rest0.replace(/^\s+/, '');
            if (head0.replace(/<[^>]*>/g, '').trim().length >= 16 &&
                tail0.replace(/<[^>]*>/g, '').trim()) return { head: head0, tail: tail0 };
          }
        }
        i = end;
        continue;
      }
      if (depth > 0) continue;
      if (ch !== '.' && ch !== '!' && ch !== '?') continue;

      const rest = s.slice(i + 1);
      /* A terminator ends a sentence only when whitespace and then something
         that can start one follows it. This is also what keeps "3.4" and
         "1 000." out: a digit-decimal has no space after the stop. */
      const m = /^(["'’”)\]]?)\s+(\S)/.exec(rest);
      if (!m) continue;
      const next = m[2];
      if (!(next === '<' || next === '"' || next === '“' || /[A-Z0-9]/.test(next))) continue;

      /* An initial or a known abbreviation is not a sentence end. */
      const wordBefore = (/([A-Za-z][A-Za-z.]*)$/.exec(s.slice(0, i)) || [])[1] || '';
      if (wordBefore.length === 1 && /[A-Z]/.test(wordBefore)) continue;
      if (ABBREV.test(wordBefore)) continue;

      const cut = i + 1 + m[1].length;
      const head = s.slice(0, cut);
      const tail = s.slice(cut).replace(/^\s+/, '');
      if (head.replace(/<[^>]*>/g, '').trim().length < 16) continue;   /* too short to be the sentence */
      if (!tail.replace(/<[^>]*>/g, '').trim()) return null;           /* nothing left to fold */
      return { head: head, tail: tail };
    }
    return null;
  }

  /* ---- what may be folded ------------------------------------------------
     Prose, and only prose. Containers are listed before the paragraph tags
     so that document order puts a wrapper ahead of the paragraphs inside it
     and a block of four subordinate clauses collapses behind ONE label
     rather than four. */
  /* Leaves only. A WRAPPER is never a candidate: folding one takes its
     children's own labels down with it, and the pane ends up with a card
     whose entire body is the word "detail" — which is how the first cut of
     this went wrong. */
  const PROSE_SEL = [
    '.senseProv', '.docNone', '.mcNote', '.mcIdle', '.docCtx', '.cqPolicy',
    '.lede', '.note', '.hint', '.sub', '.subtle', '.desc', '.caption',
    '.cardNote', '.paneNote', '.foot', '.footnote', '.blurb', '.expl',
    'blockquote', 'p', 'li'
  ].join(',');

  /* A paragraph that carries a control, a figure, a link or a table is not
     prose — it is the pane. Nothing with one of these inside it is touched. */
  const NOT_PROSE = 'a,button,input,select,textarea,canvas,svg,table,img,video,.btn,.chip';

  const OPEN_LIMIT = 140;   /* the most text a block may leave on screen     */
  const FOLD_FLOOR = 120;   /* below this it is already one readable line    */

  /* A class list is always out of date. The rule that is not: an element
     whose OWN text — its direct text nodes, plus the inline runs of <b>,
     <i> and <code> that are part of the same sentence — runs past the floor
     is a paragraph, whatever tag its author reached for. A block element
     inside it makes it a wrapper, not a paragraph, and wrappers are left
     alone. */
  /* DIRECT text nodes only. A row of figures written as
     `<div><b>27</b><span>trauma surgeons</span></div>` has none, and it is a
     stat callout, not a paragraph — folding one of those away was the first
     thing this rule got wrong. A paragraph that happens to have been written
     in a <div> has plenty. */
  function ownText(el) {
    let n = 0;
    for (const k of el.childNodes) if (k.nodeType === 3) n += k.nodeValue.trim().length;
    return n;
  }

  /* ---- keeping a disclosure open across a repaint ------------------------
     Several panes are registered in ANGEL.views and have their innerHTML
     rewritten on the shell's own render tick, three times a second. A fold
     keyed only to the node would therefore snap shut under the operator's
     hand a third of a second after he opened it. The open set is keyed to
     the TEXT, which survives the rebuild because the text is what the module
     re-emits. */
  const OPEN = new Set();

  function keyOf(txt) {
    let h = 5381;
    for (let i = 0; i < txt.length; i++) h = ((h * 33) ^ txt.charCodeAt(i)) >>> 0;
    return 'k' + h.toString(36) + '_' + txt.length;
  }

  function foldOne(el, label) {
    if (el.dataset.kpiFold === '1') return;
    const raw = (el.textContent || '').trim();
    if (raw.length <= FOLD_FLOOR) { el.dataset.kpiFold = '1'; return; }

    const cut = splitLede(el.innerHTML);
    const key = keyOf(raw);
    const open = OPEN.has(key);
    const esc = t => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const btn = (txt) => '<button type="button" class="kpiWhyBtn" data-kpi-key="' + key +
      '" data-kpi-label="' + esc(txt) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
      esc(open ? LESS : txt) + '</button>';
    const rest = (html) => '<span class="kpiWhyRest"' + (open ? '' : ' hidden') + '>' + html + '</span>';
    el.dataset.kpiFold = '1';

    /* A clean first sentence that is itself short enough to read at a glance
       stays in the open and the remainder goes behind the button. */
    if (cut && cut.head.replace(/<[^>]*>/g, '').trim().length <= OPEN_LIMIT) {
      el.innerHTML = cut.head + '<span class="kpiWhy">' + btn(WHY) + rest(cut.tail) + '</span>';
      return;
    }

    /* No clean split, or a first sentence that is a paragraph in itself.
       The whole block goes behind one line of label. Nothing is deleted. */
    /* A pane's opening paragraph folds under the same words as every other
       lede on the console, so the label is a promise the reader has already
       learned rather than a bare "detail" hanging under a heading. */
    let fallback = DETAIL;
    try { if (el.matches('.lede, .ph1 p, .paneHead p')) fallback = WHY; } catch (e) { /* keep */ }
    el.innerHTML = '<span class="kpiWhy kpiWhyAll">' + btn(label || fallback) +
      rest(el.innerHTML) + '</span>';
  }

  /* An A/B switch, for measuring what the fold is actually worth:
     ?nofold=1 leaves every paragraph in the open. */
  let NOFOLD = false;
  try { NOFOLD = /[?&]nofold=1/.test(location.search); } catch (e) { NOFOLD = false; }

  function fold(pane) {
    if (!pane || NOFOLD) return;
    /* One document-ordered pass, so a wrapper is always reached before the
       paragraphs inside it and a block of four subordinate clauses collapses
       behind ONE label rather than four. */
    let all;
    try { all = pane.querySelectorAll('*'); } catch (e) { return; }
    for (const el of all) {
      if (el.dataset.kpiFold === '1') continue;
      let cand = false;
      try { cand = el.matches(PROSE_SEL); } catch (e) { cand = false; }
      if (!cand && ownText(el) <= FOLD_FLOOR) continue;
      if ((el.textContent || '').trim().length <= FOLD_FLOOR) continue;
      /* Opted out at the source: a retrieved quotation, a decision, a value. */
      if (el.closest('[data-nofold],.noFold,.kpiWhyRest,#provTip,pre,code,.cm-editor,.dw,.kpis,[data-kpi-fold="1"]')) continue;
      /* An opt-out anywhere inside is an opt-out for the whole block. */
      if (el.querySelector('[data-nofold],.noFold')) continue;
      if (el.querySelector(NOT_PROSE)) continue;
      foldOne(el, el.getAttribute('data-fold-label'));
    }
  }

  function bindFold() {
    if (document._kpiFoldBound) return;
    document._kpiFoldBound = true;
    document.addEventListener('click', function (e) {
      const b = e.target && e.target.closest ? e.target.closest('.kpiWhyBtn') : null;
      if (!b) return;
      e.preventDefault();
      const open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', open ? 'false' : 'true');
      /* The label the block was folded with is the label it folds back to. */
      b.textContent = open ? (b.dataset.kpiLabel || WHY) : LESS;
      const k = b.dataset.kpiKey;
      if (k) { if (open) OPEN.delete(k); else OPEN.add(k); }
      const wrap = b.parentNode;
      const rest = wrap && wrap.querySelector ? wrap.querySelector('.kpiWhyRest') : null;
      if (rest) rest.hidden = open;
    });
  }

  /* ======================================================== THE TICK ===== */
  const S = { key: null, at: 0 };

  function tick() {
    if (typeof APP === 'undefined' || !APP || !APP.view) return;
    const key = String(APP.view);
    if (!/^[A-Z0-9_]+$/.test(key)) return;              /* never build a selector out of arbitrary text */
    const pane = document.querySelector('[data-pane="' + key + '"]');
    if (!pane) return;

    fold(pane);

    const build = SPEC[key];
    if (!build) return;
    const head = pane.querySelector('.paneHead');
    if (!head || !head.parentNode) return;

    let strip = pane._kpiStrip;
    if (strip && (!strip.isConnected || !pane.contains(strip))) strip = pane._kpiStrip = null;

    /* Rebuilding the figures costs a walk of the casualty list on some of
       these panes, and the host itself only refreshes a data pane at 3 Hz.
       Match it: once the strip exists and the operator has not moved, hold
       off until the host's own interval has passed. Arriving on a pane is
       always immediate. */
    const now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (strip && key === S.key && now - S.at < 300) return;
    S.key = key; S.at = now;

    let tiles = null;
    try { tiles = build(); } catch (e) { tiles = null; }
    const html = tiles ? tiles.filter(Boolean).join('') : '';
    const n = tiles ? tiles.filter(Boolean).length : 0;

    /* Fewer than three honest figures is not a strip. Say nothing rather
       than pad the row out with a quantity nobody measured. */
    if (n < 3) {
      if (strip) { strip.remove(); pane._kpiStrip = null; }
      return;
    }

    if (!strip) {
      strip = document.createElement('div');
      strip.className = 'kpis kpiStrip';
      strip.setAttribute('data-kpi', key);
      head.parentNode.insertBefore(strip, head.nextSibling);
      pane._kpiStrip = strip;
    }
    paint(strip, html);
  }

  /* ----------------------------------------------------------- bootstrap */
  /* The wrapper, copied from the decision bar in js/role-commander.js: the
     native binding is taken into a local before the wrapper is installed, so
     there is no path by which the wrapper can resolve back to itself, and
     the stamp makes a second load a no-op rather than a second wrap.

     render() is defined by app.js, a classic script that may not have run
     when this one does. Retry on the frame clock, bounded, and give up
     quietly: a console with no strips is a console, and a console that
     throws on start-up is not. */
  function arm(tries) {
    const native = window.render;
    if (typeof native !== 'function') {
      if (tries <= 0) {
        if (window.ANGEL && ANGEL.setStatus) ANGEL.setStatus('page-kpi', 'withheld', 'no render() to wrap');
        return;
      }
      (window.requestAnimationFrame || setTimeout)(() => arm(tries - 1), 50);
      return;
    }
    if (native._kpiTick) return;
    const w = function () {
      native.apply(this, arguments);
      try { tick(); } catch (e) { console.warn('page-kpi', e); }
    };
    w._kpiTick = true;
    window.render = w;

    /* A view switch has to land on the same frame the pane becomes visible,
       not 300 ms later, so the throttle is reset rather than waited out. */
    if (window.ANGEL && typeof ANGEL.on === 'function') ANGEL.on('view', () => { S.key = null; });
  }

  const start = () => {
    injectCSS();
    bindFold();
    arm(200);
  };

  if (window.ANGEL && typeof ANGEL.ready === 'function') ANGEL.ready('page-kpi', start);
  else start();
})();
