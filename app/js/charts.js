/* =========================================================================
   CASUALTY FLOW — the analytical layer.

   The rest of this application answers "what happened". This module answers
   "where were they lost", which is a different question and needs different
   pictures.

   Four of them. A Sankey diagram that follows every casualty from triage
   category to outcome, so the point at which the cohort narrows is visible
   rather than inferred. A stack of synchronised time series over the mission
   clock, because a death at minute 40 usually has a cause at minute 25 in a
   different series. A Kaplan-Meier survival curve, which is the chart a
   military medical officer already knows how to read, with the doctrinal
   Golden Hour drawn on it. And a scatter of physiological deadline against
   the minute help actually arrived, where the diagonal is the whole thesis:
   below the line the casualty lived, above it they did not.

   Two libraries, both bundled from node_modules into app/vendor and served
   from this folder. ECharts (Apache-2.0) supplies the Sankey layout only —
   the bundle here carries the Sankey chart, the tooltip and the canvas
   renderer, nothing else. uPlot (MIT) draws everything else; it is 52 KB and
   redraws six stacked plots inside a frame, which is what makes a shared
   cursor across all six feel like one instrument instead of six charts.

   Nothing in this file fetches anything. Nothing in it writes to the
   simulation. Every number is derived from the casualty, sortie, delivery
   and stock records the run already produced, which means these charts and
   the tables elsewhere in the application cannot disagree.

   The two bundles in app/vendor were produced from node_modules with the
   local esbuild, from these entry points:

     // echarts entry — Sankey, tooltip and canvas renderer only
     import * as echarts from 'echarts/core';
     import { SankeyChart } from 'echarts/charts';
     import { TooltipComponent } from 'echarts/components';
     import { CanvasRenderer } from 'echarts/renderers';
     echarts.use([SankeyChart, TooltipComponent, CanvasRenderer]);
     export default echarts;

     // uplot entry
     import uPlot from 'uplot'; export default uPlot;

     npx esbuild <entry> --bundle --minify --format=esm --outfile=...

   That build is 497 KB against 1,142 KB for the whole of ECharts; uPlot is
   52 KB. Neither bundle contains a URL that is not a licence comment.
   ========================================================================= */

const ECHARTS_PATH = 'vendor/echarts/echarts.sankey.min.mjs';
const UPLOT_PATH   = 'vendor/uplot/uplot.min.mjs';
const UPLOT_CSS    = 'vendor/uplot/uPlot.min.css';

let ECH = null;      // ECharts core, Sankey + canvas renderer registered
let UP  = null;      // uPlot constructor

/* Timing, reported on screen rather than only in a console nobody opens. */
const PERF = { sankeyMs: 0, seriesMs: 0, kmMs: 0, scatterMs: 0, points: 0 };

/* --------------------------------------------------------------- palette
   Every colour is read back out of the stylesheet at draw time, so the two
   themes are handled by the same code path as the rest of the application
   and there is no second palette to keep in step. The only additions are the
   triage tape colours, which are doctrine (red / yellow / green / black) and
   not a design choice, and the two toll colours — a death count is drawn in
   red or muted amber here exactly as it is everywhere else, never green. */
function palette() {
  const cs = getComputedStyle(document.body);
  const v = (n, d) => ((cs.getPropertyValue(n) || '').trim() || d);
  const light = document.body.classList.contains('light');
  return {
    light,
    text:   v('--text', '#dfe8f2'),
    dim:    v('--dim', '#8ea3b8'),
    faint:  v('--faint', '#63768a'),
    line:   v('--line', '#1e2b3a'),
    panel:  v('--panel', '#0d141d'),
    angel:  v('--angel', '#31d68a'),
    current:v('--current', '#f0813f'),
    ok:     v('--ok', '#31d68a'),
    warn:   v('--warn', '#ffb340'),
    bad:    v('--bad', '#ff4257'),
    info:   v('--info', '#5bb4ff'),
    tollHi: v('--tollHi', '#ff4257'),
    tollLo: v('--tollLo', '#e0a94a'),
    grid:   light ? 'rgba(20,45,75,.11)' : 'rgba(255,255,255,.055)',
    // Triage tape. EXPECTANT is black on a card and mid-grey on a screen.
    triage: {
      IMMEDIATE: light ? '#c81a30' : '#e04058',
      DELAYED:   light ? '#b57200' : '#e0a94a',
      MINIMAL:   light ? '#0f9b62' : '#31d68a',
      EXPECTANT: light ? '#6b7787' : '#5b6a7c'
    },
    neutral: light ? '#7f8fa1' : '#46586d',
    mono: '11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  };
}

/* ===================================================================== data
   Everything below reconstructs series from the transactional records the
   simulation keeps. Nothing is sampled as the run proceeds, which matters
   for two reasons: the charts are identical whether you watch the run or
   scrub back through it afterwards, and the resolution is ours to choose
   rather than the frame rate's. */

const SURVIVABLE = c => c.cls === 'IMMEDIATE' || c.cls === 'DELAYED';

function live() {
  if (typeof APP === 'undefined' || !APP || !APP.world || !APP.armA || !APP.armB) return null;
  const a = APP.armA, b = APP.armB;
  if (!a.casualties || !b.casualties) return null;
  return {
    world: APP.world,
    t: APP.t || 0,
    dur: APP.world.scn.durationMin,
    arms: [
      { key: 'A', arm: a, label: a.label || 'ANGEL SWARM' },
      { key: 'B', arm: b, label: b.label || 'CURRENT — TRIAGE & PROXIMITY' }
    ]
  };
}

/* A run is identified by everything that could change what the charts show.
   Redrawing costs milliseconds, but redrawing while an operator is dragging
   a zoom window costs them the gesture, so we only redraw when this moves. */
function signature(L) {
  if (!L) return 'empty';
  const s = [APP.scenarioKey, APP.seed, APP.mode, APP.telementor ? 1 : 0,
             Math.floor(L.t), APP.finished ? 1 : 0,
             document.body.classList.contains('light') ? 'L' : 'D'];
  for (const { arm } of L.arms) {
    s.push(arm.casualties.length, arm.stats.died, arm.stats.saved,
           arm.stats.treated, arm.deliveryLog.length, arm.allocatorKey);
  }
  return s.join('|');
}

/* Which casualties an aircraft was actually committed to.

   ONE definition, and it lives in the COUNT glossary at the head of app.js
   so the chain-of-survival funnel on the Evidence pane and the TASKED node
   in this diagram cannot mean two different things. They used to: this
   diagram read 20 for ANGEL SWARM while the funnel read 21, because the
   funnel also counted casualties the allocator had merely scored.

   The local fallback is only for the case where this module is loaded into
   a page that does not carry app.js. It is a copy of the same predicate and
   it is not the definition. */
function taskedSet(arm) {
  if (typeof COUNT !== 'undefined' && COUNT && COUNT.tasked) return COUNT.tasked(arm);
  const s = new Set();
  for (const d of arm.deliveryLog) s.add(d.casId);
  for (const c of arm.casualties) {
    if (c.assignedTo != null || c.treated || c.tOnStation != null) s.add(c.id);
  }
  return s;
}

/* --------------------------------------------------------- series sampling
   One pass per arm producing every time series the stacked plots need. The
   casualty, sortie and stock records are all event lists with timestamps, so
   each series is a sweep rather than a simulation replay. */
function sampleArm(arm, tMax, n) {
  const xs = new Float64Array(n);
  const alive = new Float64Array(n);
  const dead = new Float64Array(n);
  const air = new Float64Array(n);
  const blood = new Float64Array(n);
  const waiting = new Float64Array(n);
  const pending = new Float64Array(n);
  const marginMed = new Float64Array(n);
  const marginMin = new Float64Array(n);

  const cas = arm.casualties;
  const inj = cas.map(c => c.tInjury).sort((p, q) => p - q);
  const deaths = cas.filter(c => c.outcome === 'DIED' && SURVIVABLE(c) && c.tResolved != null)
                    .map(c => c.tResolved).sort((p, q) => p - q);
  const resolved = cas.filter(c => c.outcome != null && c.tResolved != null)
                      .map(c => c.tResolved).sort((p, q) => p - q);
  const allDeaths = cas.filter(c => c.outcome === 'DIED' && c.tResolved != null)
                       .map(c => c.tResolved).sort((p, q) => p - q);

  /* Blood on hand. The stock log is complete and signed, so the level at any
     minute is the current level walked backwards to the start and then
     forwards again — no need to know the initial issue. */
  const bl = arm.stockLog.filter(e => e.item === 'BLOOD').slice().sort((p, q) => p.t - q.t);
  let cur = 0;
  for (const b of arm.bases) cur += b.stock.BLOOD;
  let start = cur;
  for (const e of bl) start -= e.delta;

  /* Aircraft in the air and authorisations outstanding are both interval
     counts. Flattening each interval into a +1 and a -1 turns them into the
     same kind of sweep as everything else, which is what keeps this whole
     function linear in the number of records rather than quadratic. */
  const steps = arr => arr.slice().sort((p, q) => p.t - q.t);
  const air$ = steps([].concat(
    arm.sortieLog.map(s => ({ t: s.tLaunch, d: 1 })),
    arm.sortieLog.filter(s => s.tReturn != null).map(s => ({ t: s.tReturn, d: -1 }))));
  const pend$ = steps([].concat(
    arm.queue.map(p => ({ t: p.tRaised, d: 1 })),
    arm.queue.filter(p => p.tActed != null).map(p => ({ t: p.tActed, d: -1 }))));

  let iInj = 0, iDeath = 0, iAllDeath = 0, iRes = 0, iBl = 0, iAir = 0, iPend = 0;
  let cInj = 0, cDeath = 0, cAllDeath = 0, cRes = 0, cBl = start, cAir = 0, cPend = 0;
  const open = [];   // reused scratch for the margin quantiles
  const byInj = cas.slice().sort((a, b) => a.tInjury - b.tInjury);
  const active = [];
  let iAct = 0;

  for (let i = 0; i < n; i++) {
    const t = tMax * (n === 1 ? 0 : i / (n - 1));
    xs[i] = t;
    while (iInj < inj.length && inj[iInj] <= t) { iInj++; cInj++; }
    while (iDeath < deaths.length && deaths[iDeath] <= t) { iDeath++; cDeath++; }
    while (iAllDeath < allDeaths.length && allDeaths[iAllDeath] <= t) { iAllDeath++; cAllDeath++; }
    while (iRes < resolved.length && resolved[iRes] <= t) { iRes++; cRes++; }
    while (iBl < bl.length && bl[iBl].t <= t) { cBl += bl[iBl].delta; iBl++; }
    while (iAir < air$.length && air$[iAir].t <= t) { cAir += air$[iAir].d; iAir++; }
    while (iPend < pend$.length && pend$[iPend].t <= t) { cPend += pend$[iPend].d; iPend++; }

    alive[i] = cInj - cAllDeath;
    dead[i] = cDeath;
    blood[i] = cBl;
    air[i] = cAir;
    pending[i] = cPend;

    /* Open cases and how much of their physiological clock is left. A
       negative margin is a casualty who is past the point the model says
       they decompensate and has not been reached. The active list is carried
       forward between samples rather than rebuilt, because it is short and
       the full cohort is not. */
    while (iAct < byInj.length && byInj[iAct].tInjury <= t) active.push(byInj[iAct++]);
    let k = 0;
    for (let j = 0; j < active.length; j++) {
      const c = active[j];
      if (c.tResolved != null && c.tResolved <= t) continue;
      active[k++] = c;
    }
    active.length = k;
    open.length = 0;
    for (const c of active) if (c.deadlineMin < 9000) open.push(c.deadlineMin - (t - c.tInjury));
    /* Walking wounded are open cases for the whole run and would swamp this
       line without saying anything about tasking, so the count here is the
       casualties who actually have a clock running. */
    waiting[i] = open.length;
    if (open.length) {
      open.sort((p, q) => p - q);
      marginMin[i] = open[0];
      marginMed[i] = open[open.length >> 1];
    } else {
      marginMin[i] = NaN; marginMed[i] = NaN;
    }
  }

  // uPlot wants nulls, not NaN, for gaps.
  const nul = arr => Array.from(arr, v => (v === v ? v : null));
  return { xs: Array.from(xs), alive: Array.from(alive), dead: Array.from(dead),
           air: Array.from(air), blood: Array.from(blood), waiting: Array.from(waiting),
           pending: Array.from(pending), marginMed: nul(marginMed), marginMin: nul(marginMin) };
}

/* ------------------------------------------------------------ Kaplan-Meier
   Proper product-limit estimator with right censoring, not a running count.
   During a live run a casualty who is still alive has been observed for
   (now - injury) minutes and no longer, so they leave the risk set at that
   point rather than being counted as a survivor to the end of the horizon.
   Doing this the lazy way makes the curve look better than it is, early in
   a run, which is precisely the kind of flattery this application refuses. */
function kaplanMeier(cas, tNow) {
  const ev = [];
  for (const c of cas) {
    if (c.tInjury > tNow) continue;
    if (c.outcome === 'DIED' && c.tResolved != null) {
      ev.push({ t: Math.max(0, c.tResolved - c.tInjury), dead: 1 });
    } else {
      ev.push({ t: Math.max(0, tNow - c.tInjury), dead: 0 });
    }
  }
  if (!ev.length) return { x: [], s: [], n: 0, maxT: 0 };
  ev.sort((a, b) => a.t - b.t || b.dead - a.dead);
  const maxT = ev[ev.length - 1].t;
  const x = [0], s = [1];
  let atRisk = ev.length, S = 1, i = 0;
  while (i < ev.length) {
    const t = ev[i].t;
    let d = 0, leaving = 0;
    while (i < ev.length && ev[i].t === t) { d += ev[i].dead; leaving++; i++; }
    if (d > 0 && atRisk > 0) {
      S *= (1 - d / atRisk);
      x.push(t); s.push(S);
    }
    atRisk -= leaving;
  }
  return { x, s, n: ev.length, maxT };
}

/* ===================================================================== CSS
   Injected from here rather than added to the application stylesheet, so
   this module is one file plus two vendor bundles and removing it removes
   everything it did. Colours come from the theme's custom properties. */
const CSS = `
#flowBody{position:absolute; inset:0}
.flowWrap{position:absolute; inset:0; overflow:auto; padding:12px 14px 26px}
.flowGrid{display:flex; flex-direction:column; gap:10px}
.chCard{background:var(--panel); border:1px solid var(--line); border-radius:11px;
  display:flex; flex-direction:column; overflow:hidden}
.chHead{display:flex; align-items:center; gap:10px; padding:10px 14px 8px;
  font:700 11px/1.2 var(--sans); letter-spacing:.06em; color:var(--text)}
.chHead .chSub{font:400 10.5px/1.4 var(--sans); letter-spacing:0; color:var(--dim);
  margin-left:auto; text-align:right; max-width:56%}
.chNote{margin:0; padding:2px 14px 12px; font:400 10.5px/1.6 var(--sans); color:var(--dim)}
.chNote b{color:var(--text); font-weight:600}
.chSeg{display:flex; gap:4px; margin-left:auto}
.chSeg .chChip{font:600 9.5px/1 var(--mono); letter-spacing:.09em; padding:6px 9px;
  border:1px solid var(--line2, var(--line)); border-radius:6px; color:var(--dim);
  background:transparent; cursor:pointer; user-select:none}
.chSeg .chChip.on{color:var(--text); border-color:var(--info); background:var(--chartbg)}
.chSankeys{display:grid; grid-template-columns:1fr 1fr; gap:2px; padding:0 6px 6px}
.chSankeys.one{grid-template-columns:1fr}
.chSankey{position:relative; height:340px; min-width:0}
.chSankeyHost{position:absolute; inset:0}
.chSankeyStat{position:absolute; left:12px; bottom:2px; z-index:2; pointer-events:none;
  font:500 10px/1.4 var(--sans); color:var(--dim); padding-right:12px}
.chSankeyStat b{color:var(--text); font-weight:600}
.chSankeyTag{position:absolute; top:4px; left:12px; z-index:2; pointer-events:none;
  font:700 9px/1 var(--mono); letter-spacing:.16em}
.chStack{padding:0 10px 8px}
.chPlot{position:relative}
.chFoot{display:flex; gap:16px; flex-wrap:wrap; padding:0 14px 12px;
  font:500 9.5px/1.5 var(--mono); letter-spacing:.06em; color:var(--faint)}
.chKey{display:flex; gap:14px; flex-wrap:wrap; padding:2px 14px 11px;
  font:500 10px/1.4 var(--sans); color:var(--dim)}
.chKey span{display:flex; align-items:center; gap:5px}
.chKey i{width:10px; height:10px; border-radius:2px; display:inline-block}
.chKey i.ring{background:transparent; border:1.5px solid currentColor; border-radius:50%}
.chEmpty{padding:16px 14px 18px; font:400 12px/1.7 var(--sans); color:var(--dim)}
.chEmpty b{color:var(--text)}
.chPair{display:grid; grid-template-columns:1fr 1fr; gap:10px}
@media (max-width:1240px){ .chPair{grid-template-columns:1fr} .chSankeys{grid-template-columns:1fr} }

/* uPlot chrome, themed. The library ships layout only; every colour below
   resolves through the same custom properties as the rest of the shell. */
.chPlot .u-title{font:700 10px/1.2 var(--mono); letter-spacing:.1em; color:var(--dim);
  text-align:left; padding-left:2px}
.chPlot .u-legend{font:500 10px/1.5 var(--sans); color:var(--dim); margin-top:-2px}
.chPlot .u-legend .u-marker{margin-right:4px}
.chPlot .u-legend th{font-weight:600}
.chPlot .u-legend .u-value{color:var(--text); font-family:var(--mono); font-size:10px}
.chPlot .u-legend.u-inline tr{margin-right:12px}
.chPlot .u-select{background:rgba(91,180,255,.13)}
.chPlot .u-cursor-x,.chPlot .u-cursor-y{border-color:rgba(142,163,184,.5)}

/* The line that replaced the duplicate chart pair on COMPARE and ANALYSIS. */
.chXlink{
  border:1px solid var(--line); border-left:3px solid var(--info); border-radius:8px;
  background:var(--panel); padding:10px 13px; margin:10px 0;
  font:400 11.5px/1.6 var(--sans); color:var(--dim);
}
.chXlink b{color:var(--text); font-weight:600}
.chXlink a{color:var(--info); text-decoration:none; border-bottom:1px solid rgba(91,180,255,.4)}
.chXlink a:hover{border-bottom-color:var(--info)}
`;

function injectCSS() {
  if (document.getElementById('chartsCss')) return;
  if (!document.getElementById('uplotCss')) {
    const l = document.createElement('link');
    l.id = 'uplotCss'; l.rel = 'stylesheet'; l.href = ANGEL.asset(UPLOT_CSS);
    document.head.appendChild(l);
  }
  const s = document.createElement('style');
  s.id = 'chartsCss';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/* ================================================================== Sankey */

/* Node order is fixed in this table, and the layout runs with zero
   iterations, so the diagram is identical between runs and between arms.
   An automatic layout that reorders nodes to minimise crossings would look
   marginally tidier and would make two runs impossible to compare, which is
   the only thing this chart is for. */
/* Link keys are two node names joined by a separator that cannot occur in
   one — the names themselves contain spaces. */
const SEP = '\u001f';

const STAGES = [
  { d: 0, ids: ['IMMEDIATE', 'DELAYED', 'MINIMAL', 'EXPECTANT'] },
  { d: 1, ids: ['DEADLINE', 'TRIAGE ONLY'] },
  { d: 2, ids: ['TASKED', 'NOT TASKED'] },
  { d: 3, ids: ['IN TIME', 'TOO LATE', 'NO DELIVERY', 'NO SORTIE'] },
  { d: 4, ids: ['OPEN', 'SURVIVED', 'DIED'] }
];

/* Node names are short because five columns of them have to fit side by
   side twice over. The sentence each one stands for is in the tooltip, and
   the chain they form is written under the chart. */
const DESC = {
  IMMEDIATE: 'Triaged IMMEDIATE at the point of wounding',
  DELAYED: 'Triaged DELAYED',
  MINIMAL: 'Triaged MINIMAL — walking wounded, no time-critical deadline',
  EXPECTANT: 'Triaged EXPECTANT',
  'DEADLINE': 'The tasking system held a physiological deadline for this casualty',
  'TRIAGE ONLY': 'Visible to tasking as a triage category only — no deadline',
  'TASKED': 'An aircraft was committed to this casualty',
  'NOT TASKED': 'No aircraft was ever committed',
  'IN TIME': 'Payload administered inside the physiological deadline',
  'TOO LATE': 'Payload administered, but after the deadline had passed',
  'NO DELIVERY': 'Sortie flown, nothing reached the casualty',
  'NO SORTIE': 'Nothing was sent',
  'OPEN': 'Still alive and unresolved at this point in the run',
  'SURVIVED': 'Survived',
  'DIED': 'Died of wounds'
};

function sankeyModel(entry) {
  const { arm } = entry;
  const tasked = taskedSet(arm);
  /* Only an arm running the ANGEL SWARM allocator consumes a physiological
     deadline. Telemetry reaches the picture in both arms — the wearable does
     not know which allocator is running — but current triage and proximity tasks on the
     triage card, so for that arm the honest answer is that no casualty was
     ever visible to it as a deadline. */
  const deadlineAware = arm.allocatorKey === 'ANGEL';
  const links = new Map();
  const add = (a, b) => links.set(a + SEP + b, (links.get(a + SEP + b) || 0) + 1);
  const counts = new Map();
  const bump = k => counts.set(k, (counts.get(k) || 0) + 1);

  for (const c of arm.casualties) {
    const s0 = c.cls;
    const s1 = (deadlineAware && c.knownAt !== undefined) ? 'DEADLINE' : 'TRIAGE ONLY';
    const s2 = tasked.has(c.id) ? 'TASKED' : 'NOT TASKED';
    let s3;
    if (c.treated && c.tTreated != null) {
      s3 = (c.tTreated - c.tInjury) <= c.deadlineMin ? 'IN TIME' : 'TOO LATE';
    } else s3 = tasked.has(c.id) ? 'NO DELIVERY' : 'NO SORTIE';
    const s4 = c.outcome === 'DIED' ? 'DIED' : c.outcome === 'SAVED' ? 'SURVIVED' : 'OPEN';
    add(s0, s1); add(s1, s2); add(s2, s3); add(s3, s4);
    [s0, s1, s2, s3, s4].forEach(bump);
  }
  return { links, counts };
}

/* The one line a judge reads if they read nothing else on this chart. */
function sankeyCaption(entry, model) {
  const c = model.counts;
  const g = k => c.get(k) || 0;
  const total = g('IMMEDIATE') + g('DELAYED') + g('MINIMAL') + g('EXPECTANT');
  const tasked = g('TASKED');
  const inTime = g('IN TIME');
  const died = g('DIED');
  /* Scope belongs in the sentence. This diagram counts every casualty in
     every triage category, which is why its death figure is larger than the
     survivable-cohort figure the scoreboard and THE DIFFERENCE carry, and
     why its tasked figure is larger than the survivable-cohort funnel on the
     Evidence pane. Both differences are stated rather than left to be
     worked out. */
  const surv = (typeof COUNT !== 'undefined' && COUNT)
    ? COUNT.deathsSurvivable(entry.arm) : null;
  return `<b>${tasked}</b> of ${total} casualties in all four triage categories had an aircraft ` +
         `committed · <b>${inTime}</b> received a payload inside their deadline · ` +
         `<b>${died}</b> died of wounds` +
         (surv === null ? '' : `, <b>${surv}</b> of them of wounds that could have been survived`);
}

function sankeyOption(entry, pal, model) {
  const { links, counts } = model || sankeyModel(entry);
  const nodes = [];
  for (const st of STAGES) {
    for (const id of st.ids) {
      if (!counts.get(id)) continue;
      let col = pal.neutral;
      if (pal.triage[id]) col = pal.triage[id];
      else if (id === 'DIED') col = pal.tollHi;                       // never green
      else if (id === 'SURVIVED') col = pal.info;
      else if (id === 'OPEN') col = pal.faint;
      else if (id === 'IN TIME') col = pal.info;
      else if (id === 'TOO LATE' || id === 'NO SORTIE' || id === 'NO DELIVERY') col = pal.warn;
      else if (id === 'DEADLINE') col = pal.info;
      nodes.push({
        name: id, depth: st.d,
        itemStyle: { color: col, borderWidth: 0 },
        label: {
          position: 'right',
          color: id === 'DIED' ? pal.tollHi : pal.dim,
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
          fontSize: 10,
          fontWeight: (id === 'DIED' || id === 'SURVIVED') ? 700 : 400,
          formatter: p => p.name + '  ' + counts.get(p.name)
        }
      });
    }
  }
  const data = [];
  for (const [k, v] of links) {
    const [source, target] = k.split(SEP);
    data.push({ source, target, value: v });
  }
  /* Deterministic link order too: the layout is stable, but the paint order
     decides which ribbon sits on top where they overlap. */
  const rank = n => nodes.findIndex(x => x.name === n);
  data.sort((a, b) => rank(a.source) - rank(b.source) || rank(a.target) - rank(b.target));

  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item', triggerOn: 'mousemove',
      backgroundColor: pal.panel, borderColor: pal.line,
      textStyle: { color: pal.text, fontSize: 11,
                   fontFamily: 'ui-monospace, Menlo, Consolas, monospace' },
      formatter: p => p.dataType === 'edge'
        ? `${p.data.source} → ${p.data.target}<br/><b>${p.data.value}</b> casualt${p.data.value === 1 ? 'y' : 'ies'}`
        : `<b>${p.name}</b> · ${p.value} casualt${p.value === 1 ? 'y' : 'ies'}<br/>${DESC[p.name] || ''}`
    },
    series: [{
      type: 'sankey',
      left: 8, right: 96, top: 22, bottom: 26,
      nodeWidth: 11, nodeGap: 9,
      layoutIterations: 0,        // fixed order — see STAGES
      nodeAlign: 'justify',
      draggable: false,
      emphasis: { focus: 'adjacency' },
      lineStyle: { color: 'gradient', opacity: pal.light ? 0.34 : 0.28, curveness: 0.5 },
      data: nodes,
      links: data
    }]
  };
}

/* =================================================================== uPlot */

function axis(pal, opts) {
  return Object.assign({
    stroke: pal.dim,
    grid: { stroke: pal.grid, width: 1 },
    ticks: { stroke: pal.grid, width: 1, size: 4 },
    font: pal.mono,
    labelFont: pal.mono,
    labelSize: 14,
    size: 34
  }, opts || {});
}

/* One stacked plot. The cursor is synchronised across every plot built with
   the same key, so reading down the stack at a single mission minute is one
   movement rather than six. */
function plotOpts(pal, { title, height, series, isLast, syncKey, band }) {
  const o = {
    title,
    width: 600, height,
    padding: [8, 12, isLast ? 0 : 2, 0],
    cursor: {
      y: false,
      drag: { x: true, y: false, setScale: true },
      sync: { key: syncKey, setSeries: false, scales: ['x', null] },
      points: { size: 5 }
    },
    scales: { x: { time: false } },
    legend: { live: true },
    series: [{ label: 'min', value: (u, v) => v == null ? '--' : 'T+' + v.toFixed(1) }].concat(series),
    axes: [
      axis(pal, { show: !!isLast, size: isLast ? 28 : 16, values: (u, s) => s.map(v => v) }),
      axis(pal, { size: 44, scale: 'y' })
    ]
  };
  if (band) o.bands = band;
  return o;
}

function line(label, stroke, extra) {
  return Object.assign({
    label, stroke, width: 1.6, points: { show: false },
    value: (u, v) => v == null ? '--' : (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1))
  }, extra || {});
}

/* The Golden Hour, and any other fixed vertical reference. Drawn under the
   series so it never obscures a data point. */
function markerPlugin(pal, marks) {
  return {
    hooks: {
      draw: u => {
        const ctx = u.ctx;
        ctx.save();
        for (const m of marks) {
          const x = u.valToPos(m.x, 'x', true);
          if (x < u.bbox.left || x > u.bbox.left + u.bbox.width) continue;
          ctx.strokeStyle = m.color || pal.warn;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x, u.bbox.top);
          ctx.lineTo(x, u.bbox.top + u.bbox.height);
          ctx.stroke();
          ctx.setLineDash([]);
          if (m.label) {
            ctx.fillStyle = m.color || pal.warn;
            ctx.font = '700 9px ui-monospace, Menlo, Consolas, monospace';
            ctx.textAlign = 'left';
            ctx.fillText(m.label, x + 5, u.bbox.top + 11);
          }
        }
        ctx.restore();
      }
    }
  };
}

/* ============================================================ chart panels
   Each panel builds its DOM once and thereafter only pushes new data into
   the instances it already made. Rebuilding a uPlot on every tick would
   throw away the operator's zoom window, and rebuilding an ECharts instance
   would restart its layout. */

class FlowPanel {
  constructor(host) {
    this.host = host;
    this.built = false;
    this.sig = null;
    this.mode = 'both';           // both | A | B
    this.sankeys = [];
    this.plots = [];
    this.syncKey = 'angel-flow';
    this._syncing = false;
    this.ro = null;
  }

  destroy() {
    for (const c of this.sankeys) { try { c.dispose(); } catch (e) {} }
    for (const p of this.plots) { try { p.destroy(); } catch (e) {} }
    this.sankeys = []; this.plots = [];
    if (this.ro) { this.ro.disconnect(); this.ro = null; }
    this.built = false; this.sig = null;
    this.host.innerHTML = '';
  }

  empty(msg) {
    this.destroy();
    this.host.innerHTML =
      '<div class="flowWrap"><div class="chCard"><div class="chHead">Casualty flow</div>' +
      '<div class="chEmpty">' + msg + '</div></div></div>';
  }

  render() {
    const L = live();
    if (!L || !L.arms[0].arm.casualties.length) {
      this.empty('<b>No casualties yet.</b> Start a mission from the toolbar. ' +
        'Every chart on this page is built from the run’s own casualty, sortie, ' +
        'delivery and stock records, so they appear as soon as the first casualty does.');
      this.emptyShown = true;
      return;
    }
    if (this.emptyShown) { this.destroy(); this.emptyShown = false; }
    const sig = signature(L);
    if (this.built && sig === this.sig) return;
    const themeChanged = this.built && this.pal &&
      this.pal.light !== document.body.classList.contains('light');
    if (themeChanged) this.destroy();
    this.pal = palette();
    if (!this.built) this.build();
    this.update(L);
    this.sig = sig;
  }

  build() {
    const pal = this.pal;
    this.host.innerHTML = `
      <div class="flowWrap"><div class="flowGrid">

        <div class="chCard">
          <div class="chHead">Where the casualties are lost
            <div class="chSeg" id="chArmSeg">
              <span class="chChip on" data-arm="both">BOTH ARMS</span>
              <span class="chChip" data-arm="A">ANGEL SWARM</span>
              <span class="chChip" data-arm="B">CURRENT — TRIAGE & PROXIMITY</span>
            </div>
          </div>
          <div class="chSankeys" id="chSankeys">
            <div class="chSankey" data-arm="A"><span class="chSankeyTag" style="color:${pal.angel}">ANGEL SWARM</span><div class="chSankeyHost"></div><span class="chSankeyStat"></span></div>
            <div class="chSankey" data-arm="B"><span class="chSankeyTag" style="color:${pal.current}">CURRENT — TRIAGE & PROXIMITY</span><div class="chSankeyHost"></div><span class="chSankeyStat"></span></div>
          </div>
          <div class="chKey">
            <span><i style="background:${pal.triage.IMMEDIATE}"></i>IMMEDIATE</span>
            <span><i style="background:${pal.triage.DELAYED}"></i>DELAYED</span>
            <span><i style="background:${pal.triage.MINIMAL}"></i>MINIMAL</span>
            <span><i style="background:${pal.triage.EXPECTANT}"></i>EXPECTANT</span>
            <span style="margin-left:auto"><i style="background:${pal.tollHi}"></i>died of wounds</span>
          </div>
          <p class="chNote">Every casualty in the run enters on the left in the triage category the
            responder assigned, and leaves on the right in the state the run ended them in. The width of
            each ribbon is a number of people. <b>Read the second column first:</b> a casualty Class VIII
            push never saw as a physiological deadline can still be tasked, but only on triage precedence
            and only after somebody asked. Node order is fixed, so the same run always draws the same
            diagram and two runs can be laid side by side.</p>
        </div>

        <div class="chCard">
          <div class="chHead">The mission clock, six ways
            <span class="chSub">Drag across any plot to zoom all six. Double-click to reset.
              The cursor is shared — one mission minute, read straight down.</span>
          </div>
          <div class="chStack" id="chStack"></div>
          <div class="chFoot" id="chFoot"></div>
        </div>

        <div class="chPair">
          <div class="chCard">
            <div class="chHead">Survival after wounding</div>
            <div class="chStack"><div class="chPlot" id="chKM"></div></div>
            <p class="chNote">Kaplan-Meier product-limit estimate, one curve per arm, measured from the
              minute of wounding rather than from the start of the mission. Casualties still alive and
              unresolved are censored at their current follow-up time, so the curve never flatters an
              unfinished run. The dashed line is the doctrinal Golden Hour — note how far to the left of
              it most of this cohort is already lost.</p>
          </div>
          <div class="chCard">
            <div class="chHead">Deadline against arrival</div>
            <div class="chStack"><div class="chPlot" id="chScatter"></div></div>
            <p class="chNote">One mark per casualty. Along the bottom, the minute at which the model says
              they exhaust compensatory reserve; up the side, the minute help actually reached them.
              <b>The diagonal is the deadline.</b> Below it, help arrived with time in hand; above it,
              it arrived too late to matter. Marks on the top rule are casualties nothing reached at all.</p>
          </div>
        </div>

      </div></div>`;

    const hosts = this.host.querySelectorAll('.chSankeyHost');
    this.sankeys = [
      ECH.init(hosts[0], null, { renderer: 'canvas' }),
      ECH.init(hosts[1], null, { renderer: 'canvas' })
    ];

    const seg = this.host.querySelector('#chArmSeg');
    seg.addEventListener('click', e => {
      const c = e.target.closest('[data-arm]'); if (!c) return;
      seg.querySelectorAll('.chChip').forEach(x => x.classList.remove('on'));
      c.classList.add('on');
      this.mode = c.dataset.arm;
      const wrap = this.host.querySelector('#chSankeys');
      wrap.classList.toggle('one', this.mode !== 'both');
      this.host.querySelectorAll('.chSankey').forEach(el => {
        el.style.display = (this.mode === 'both' || el.dataset.arm === this.mode) ? '' : 'none';
      });
      this.resize();
    });

    this.buildStack();
    this.buildKM();
    this.buildScatter();

    /* Panels are laid out by the shell, not by us, so the plots follow the
       container rather than the window. */
    if (typeof ResizeObserver === 'function') {
      let raf = 0;
      this.ro = new ResizeObserver(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => this.resize());
      });
      this.ro.observe(this.host);
    }
    this.built = true;
  }

  buildStack() {
    const pal = this.pal;
    const stack = this.host.querySelector('#chStack');
    const A = pal.angel, B = pal.current;
    const defs = [
      { t: 'CASUALTIES ALIVE', h: 116, s: [line('ANGEL SWARM', A), line('CURRENT — TRIAGE & PROXIMITY', B)] },
      { t: 'DIED OF SURVIVABLE WOUNDS · CUMULATIVE', h: 116,
        s: [line('ANGEL SWARM', pal.tollLo, { width: 2 }), line('CURRENT — TRIAGE & PROXIMITY', pal.tollHi, { width: 2 })] },
      { t: 'DRONES OUTBOUND OR ON STATION', h: 100, s: [line('ANGEL SWARM', A), line('CURRENT — TRIAGE & PROXIMITY', B)] },
      { t: 'BLOOD UNITS ON HAND · ALL LAUNCH POINTS', h: 100, s: [line('ANGEL SWARM', A), line('CURRENT — TRIAGE & PROXIMITY', B)] },
      { t: 'AWAITING HELP · CASUALTIES WITH A CLOCK RUNNING', h: 100,
        s: [line('ANGEL SWARM waiting', A), line('CURRENT — TRIAGE & PROXIMITY waiting', B),
            line('authorisations pending', pal.info, { dash: [3, 3], width: 1.2 })] },
      { t: 'MINUTES OF PHYSIOLOGICAL MARGIN LEFT · OPEN CASUALTIES', h: 124,
        s: [line('ANGEL median', A), line('ANGEL worst', A, { dash: [3, 3], width: 1.1 }),
            line('CL VIII median', B), line('CL VIII worst', B, { dash: [3, 3], width: 1.1 })] }
    ];
    this.plots = defs.map((d, i) => {
      const el = document.createElement('div');
      el.className = 'chPlot';
      stack.appendChild(el);
      const isLast = i === defs.length - 1;
      const o = plotOpts(pal, { title: d.t, height: d.h, series: d.s, isLast, syncKey: this.syncKey });
      /* Zero is the line that matters on the margin plot: below it a
         casualty is past the minute the model says they decompensate. */
      if (i === 5) o.plugins = [zeroRulePlugin(pal)];
      o.hooks = {
        setScale: [(u, key) => {
          if (key !== 'x' || this._syncing) return;
          this._syncing = true;
          const { min, max } = u.scales.x;
          for (const p of this.plots) {
            if (p !== u && p.scales.x.min !== min) p.setScale('x', { min, max });
          }
          this._syncing = false;
        }]
      };
      const n = 2;
      const blank = [[0, 1]].concat(d.s.map(() => [null, null]));
      return new UP(o, blank, el);
    });
  }

  buildKM() {
    const pal = this.pal;
    const el = this.host.querySelector('#chKM');
    const stepped = UP.paths.stepped({ align: 1 });
    const o = {
      width: 400, height: 236,
      padding: [10, 14, 0, 0],
      scales: { x: { time: false }, y: { range: [0, 1] } },
      cursor: { y: false, drag: { x: true, y: false } },
      legend: { live: true },
      series: [
        { label: 'min since wounding', value: (u, v) => v == null ? '--' : 'T+' + v.toFixed(0) },
        { label: 'ANGEL SWARM', stroke: pal.angel, width: 2, paths: stepped,
          points: { show: false }, value: (u, v) => v == null ? '--' : (v * 100).toFixed(1) + '%' },
        { label: 'CURRENT — TRIAGE & PROXIMITY', stroke: pal.current, width: 2, paths: stepped,
          points: { show: false }, value: (u, v) => v == null ? '--' : (v * 100).toFixed(1) + '%' }
      ],
      axes: [
        axis(pal, { size: 28, label: 'minutes since wounding' }),
        axis(pal, { size: 44, values: (u, s) => s.map(v => (v * 100).toFixed(0) + '%') })
      ],
      plugins: [markerPlugin(pal, [{ x: 60, label: 'GOLDEN HOUR', color: pal.warn }])]
    };
    this.km = new UP(o, [[0, 1], [1, 1], [1, 1]], el);
  }

  buildScatter() {
    const pal = this.pal;
    const el = this.host.querySelector('#chScatter');
    /* Outcome decides colour, arm decides shape. Colouring by arm would put
       a green dot on a dead soldier, which this application does not do. */
    const mk = (label, color, shape) => ({
      label, stroke: color, fill: color,
      paths: () => null,
      points: { show: pointDrawer(color, shape), size: 7 },
      value: (u, v) => v == null ? '--' : v.toFixed(1)
    });
    const o = {
      width: 400, height: 236,
      padding: [10, 14, 0, 0],
      scales: { x: { time: false, range: squareRange }, y: { range: squareRange } },
      cursor: { y: true, drag: { x: false, y: false } },
      legend: { show: false },
      series: [
        { label: 'deadline (min)', value: (u, v) => v == null ? '--' : v.toFixed(1) },
        mk('ANGEL · lived', pal.info, 'circle'),
        mk('ANGEL · died', pal.tollHi, 'circle'),
        mk('CL VIII · lived', pal.info, 'square'),
        mk('CL VIII · died', pal.tollHi, 'square')
      ],
      axes: [
        axis(pal, { size: 30, label: 'physiological deadline (min)', labelSize: 16 }),
        axis(pal, { size: 46, label: 'help arrived (min)', labelSize: 16 })
      ],
      plugins: [diagonalPlugin(pal)]
    };
    this.scatter = new UP(o, [[0, 1], [null, null], [null, null], [null, null], [null, null]], el);
    // A hand-built key: uPlot's own legend cannot show the two mark shapes.
    const key = document.createElement('div');
    key.className = 'chKey';
    key.innerHTML =
      `<span style="color:${pal.info}"><i class="ring"></i>ANGEL SWARM · lived</span>` +
      `<span style="color:${pal.tollHi}"><i class="ring"></i>ANGEL SWARM · died</span>` +
      `<span style="color:${pal.info}"><i style="background:${pal.info}"></i>CLASS VIII · lived</span>` +
      `<span style="color:${pal.tollHi}"><i style="background:${pal.tollHi}"></i>CLASS VIII · died</span>`;
    el.parentNode.appendChild(key);
  }

  /* ------------------------------------------------------------- updating */

  update(L) {
    const t0 = performance.now();
    const stats = this.host.querySelectorAll('.chSankeyStat');
    for (let i = 0; i < 2; i++) {
      const model = sankeyModel(L.arms[i]);
      this.sankeys[i].setOption(sankeyOption(L.arms[i], this.pal, model), true);
      if (stats[i]) stats[i].innerHTML = sankeyCaption(L.arms[i], model);
    }
    PERF.sankeyMs = performance.now() - t0;

    const t1 = performance.now();
    const tMax = Math.max(1, Math.min(L.dur, Math.max(L.t, 1)));
    /* Full resolution once the run is over and the operator is reading it;
       a coarser grid while it is still moving, because at 10x a mission
       minute passes every few frames. */
    const n = APP.finished ? Math.max(60, Math.min(1500, Math.round(tMax * 12)))
                           : Math.max(60, Math.min(600, Math.round(tMax * 6)));
    const SA = sampleArm(L.arms[0].arm, tMax, n);
    const SB = sampleArm(L.arms[1].arm, tMax, n);
    PERF.seriesMs = performance.now() - t1;
    PERF.points = n * 15;   // 15 plotted y-series across the six plots

    const pend = SA.pending.map((v, i) => v + SB.pending[i]);
    const sets = [
      [SA.xs, SA.alive, SB.alive],
      [SA.xs, SA.dead, SB.dead],
      [SA.xs, SA.air, SB.air],
      [SA.xs, SA.blood, SB.blood],
      [SA.xs, SA.waiting, SB.waiting, pend],
      [SA.xs, SA.marginMed, SA.marginMin, SB.marginMed, SB.marginMin]
    ];
    /* This measures the six setData calls. uPlot rasterises on the next
       animation frame, so treat the figure as the cost of handing the data
       over, not as the cost of the paint. */
    const t2 = performance.now();
    this.plots.forEach((p, i) => p.setData(sets[i], true));
    const drawMs = performance.now() - t2;

    const t3 = performance.now();
    this.updateKM(L);
    PERF.kmMs = performance.now() - t3;
    const t4 = performance.now();
    this.updateScatter(L);
    PERF.scatterMs = performance.now() - t4;

    const foot = this.host.querySelector('#chFoot');
    if (foot) {
      foot.innerHTML =
        `<span>${(n).toLocaleString()} SAMPLES × 15 SERIES = ${PERF.points.toLocaleString()} POINTS</span>` +
        `<span>SERIES BUILT ${PERF.seriesMs.toFixed(1)} MS</span>` +
        `<span>SIX PLOTS UPDATED ${drawMs.toFixed(1)} MS</span>` +
        `<span>SANKEY ${PERF.sankeyMs.toFixed(1)} MS</span>` +
        `<span>SURVIVAL ${PERF.kmMs.toFixed(1)} MS</span>` +
        `<span>SCATTER ${PERF.scatterMs.toFixed(1)} MS</span>`;
    }
    this.resize();
  }

  updateKM(L) {
    const kA = kaplanMeier(L.arms[0].arm.casualties, L.t);
    const kB = kaplanMeier(L.arms[1].arm.casualties, L.t);
    const data = kmPair(kA, kB);
    if (this.km) this.km.setData(data, true);
  }

  updateScatter(L) {
    const d = scatterData(L);
    if (this.scatter) this.scatter.setData(d, true);
  }

  resize() {
    const w = el => Math.max(120, Math.floor(el.getBoundingClientRect().width));
    for (const c of this.sankeys) { try { c.resize(); } catch (e) {} }
    const stack = this.host.querySelector('#chStack');
    if (stack) {
      const width = w(stack);
      for (const p of this.plots) if (p.width !== width) p.setSize({ width, height: p.height });
    }
    for (const [id, u] of [['#chKM', this.km], ['#chScatter', this.scatter]]) {
      const el = this.host.querySelector(id);
      if (el && u) {
        const width = w(el);
        if (u.width !== width) u.setSize({ width, height: u.height });
      }
    }
  }
}

/* Both survival curves on one shared x axis. uPlot takes a single x array,
   so the two step functions are merged onto the union of their event times
   and each carried forward — which is what a step function means anyway. */
/* The horizon is the longest follow-up anyone in the cohort actually has,
   not the length of the mission. Drawing the curve past that point would be
   drawing a survival estimate for minutes nobody has been observed for. */
function kmPair(kA, kB) {
  const tEnd = Math.max(kA.maxT || 0, kB.maxT || 0, 1);
  const xs = Array.from(new Set([0].concat(kA.x, kB.x, [tEnd])))
    .filter(v => isFinite(v)).sort((a, b) => a - b);
  const at = (k, t) => {
    let s = 1;
    for (let i = 0; i < k.x.length; i++) { if (k.x[i] <= t) s = k.s[i]; else break; }
    return s;
  };
  return [xs, xs.map(t => (kA.n ? at(kA, t) : null)), xs.map(t => (kB.n ? at(kB, t) : null))];
}

/* Deadline against arrival. Casualties nothing reached have no arrival time,
   so they are drawn on a rule above the latest real arrival rather than
   dropped — they are the most important marks on the chart. */
function scatterData(L) {
  const pts = [[], [], [], []];   // A lived, A died, B lived, B died
  let latest = 1, never = 0, minimal = 0;
  const rows = [];
  L.arms.forEach((entry, ai) => {
    for (const c of entry.arm.casualties) {
      if (c.deadlineMin >= 9000) { minimal++; continue; }   // no time-critical deadline
      const arrived = (c.treated && c.tTreated != null) ? c.tTreated - c.tInjury : null;
      if (arrived != null && arrived > latest) latest = arrived;
      if (c.deadlineMin > latest) latest = c.deadlineMin;
      rows.push({ ai, x: c.deadlineMin, y: arrived, died: c.outcome === 'DIED' });
      if (arrived == null) never++;
    }
  });
  /* Both axes share one range so the diagonal really is 45°. A scatter where
     "arrived exactly in time" is not a 45° line is a scatter that argues the
     opposite of what it means to. */
  const span = latest * 1.10 + 2;
  const rule = span * 0.96;
  for (const r of rows) {
    const idx = r.ai * 2 + (r.died ? 1 : 0);
    pts[idx].push([r.x, r.y == null ? rule : r.y]);
  }
  /* uPlot wants one ascending x array shared by every series. Ties get a
     deterministic epsilon so the ordering is strict without moving a mark
     by anything a human can see. */
  const all = [];
  pts.forEach((p, si) => p.forEach(([x, y]) => all.push({ x, y, si })));
  all.sort((a, b) => a.x - b.x || a.si - b.si || a.y - b.y);
  const xs = all.map((p, i) => p.x + i * 1e-6);
  const ys = [[], [], [], []];
  all.forEach((p, i) => { for (let s = 0; s < 4; s++) ys[s].push(s === p.si ? p.y : null); });
  const out = [xs].concat(ys);
  out._never = never; out._minimal = minimal; out._rule = rule; out._span = span;
  return out;
}

/* Both axes are pinned to the same range. uPlot would otherwise fit each one
   to its own data and quietly tilt the diagonal, and a scatter whose
   "arrived exactly in time" line is not at 45° argues the opposite of what
   it means to. Zoom is off here for the same reason. */
const squareRange = (u, min, max) => {
  const s = u.data && u.data._span;
  return s ? [0, s] : [Math.min(0, min), max];
};

/* Mark shapes. uPlot lets a series draw its own points; returning false
   tells it not to draw the default circles on top of ours. */
function pointDrawer(color, shape) {
  return (u, si, i0, i1) => {
    const ctx = u.ctx;
    const d = u.data[si];
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    for (let i = i0; i <= i1; i++) {
      const y = d[i];
      if (y == null) continue;
      const x = u.valToPos(u.data[0][i], 'x', true);
      const py = u.valToPos(y, 'y', true);
      ctx.beginPath();
      if (shape === 'circle') { ctx.arc(x, py, 3.4, 0, 6.2832); ctx.stroke(); }
      else { ctx.rect(x - 3, py - 3, 6, 6); ctx.fill(); }
    }
    ctx.restore();
    return false;
  };
}

/* The diagonal, and the rule that carries casualties nothing reached. */
function diagonalPlugin(pal) {
  return {
    hooks: {
      draw: u => {
        const ctx = u.ctx, b = u.bbox;
        const lo = Math.max(u.scales.x.min, u.scales.y.min);
        const hi = Math.min(u.scales.x.max, u.scales.y.max);
        ctx.save();
        if (hi > lo) {
          ctx.strokeStyle = pal.dim;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(u.valToPos(lo, 'x', true), u.valToPos(lo, 'y', true));
          ctx.lineTo(u.valToPos(hi, 'x', true), u.valToPos(hi, 'y', true));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;

          /* The caption rides the line itself. Anywhere else on this chart it
             would either collide with the rule at the top or read as a label
             for the corner it sits in. */
          const x0 = u.valToPos(lo, 'x', true), y0 = u.valToPos(lo, 'y', true);
          const x1 = u.valToPos(hi, 'x', true), y1 = u.valToPos(hi, 'y', true);
          const f = 0.52;
          ctx.save();
          ctx.translate(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
          ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
          ctx.fillStyle = pal.dim;
          ctx.font = '700 9px ui-monospace, Menlo, Consolas, monospace';
          ctx.textAlign = 'center';
          ctx.fillText('ARRIVED EXACTLY AT THE DEADLINE', 0, -5);
          ctx.restore();

          ctx.fillStyle = pal.faint;
          ctx.textAlign = 'left';
          ctx.fillText('ABOVE THE LINE — TOO LATE', b.left + 8, b.top + b.height * 0.30);
          ctx.textAlign = 'right';
          ctx.fillText('BELOW THE LINE — IN TIME', b.left + b.width - 8, b.top + b.height - 10);
        }
        const rule = u.data && u.data._rule;
        if (rule != null && rule <= u.scales.y.max && rule >= u.scales.y.min) {
          const y = u.valToPos(rule, 'y', true);
          ctx.strokeStyle = pal.warn;
          ctx.globalAlpha = 0.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(b.left, y); ctx.lineTo(b.left + b.width, y); ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          ctx.fillStyle = pal.warn;
          ctx.textAlign = 'left';
          ctx.font = '700 9px ui-monospace, Menlo, Consolas, monospace';
          ctx.fillText('NOTHING ARRIVED', b.left + 6, y + 13);   // under the rule; the marks are above it
        }
        ctx.restore();
      }
    }
  };
}

function zeroRulePlugin(pal) {
  return {
    hooks: {
      draw: u => {
        if (u.scales.y.min == null || u.scales.y.min > 0 || u.scales.y.max < 0) return;
        const y = u.valToPos(0, 'y', true), b = u.bbox;
        const ctx = u.ctx;
        ctx.save();
        ctx.strokeStyle = pal.tollHi;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(b.left, y); ctx.lineTo(b.left + b.width, y); ctx.stroke();
        ctx.restore();
      }
    }
  };
}

/* ========================================================= embedded panels
   COMPARE and ANALYSIS used to embed a second and a third copy of the
   survival curve and the deadline scatter, built from the same data as the
   pair on FLOW. That class has been deleted, not disabled: three renderings
   of one chart cost a second and a half of scroll and invited the question
   of whether the copies agreed. Both charts live on FLOW, which is the pane
   whose subject they are, and the two panes that carried copies now carry a
   cross-link built by crossLink() below. */

/* ================================================================ lifecycle */

const PANELS = { flow: null };

function paneActive(key) {
  const p = document.querySelector('[data-pane="' + key + '"]');
  return !!(p && p.classList.contains('active'));
}

/* The host application has no run or step event to subscribe to — it drives
   its panes from one render function. Ours is called the same way for the
   FLOW pane; the two embedded panels sit inside panes owned by the shell, so
   they are refreshed from a slow tick that does nothing at all unless the
   pane is on screen and the run signature has moved. */
function tick() {
  try {
    if (PANELS.flow && paneActive('FLOW')) PANELS.flow.render();
  } catch (e) {
    console.warn('[charts] ' + e);
  }
}

/* The survival curve and the deadline-against-arrival scatter used to be
   drawn three times a session — here on COMPARE, here on ANALYSIS, and on
   FLOW — from the same data, at three different sizes. Three copies of one
   chart is not three pieces of evidence; it is one piece of evidence and two
   opportunities for a reviewer to wonder whether they agree. They are drawn
   once, on the pane whose subject they actually are, and the two panes that
   used to carry copies now carry a line saying where they went. */
function crossLink(where) {
  const a = document.createElement('div');
  a.className = 'chXlink';
  /* One line, one destination. The reason the charts live there rather than
     here is a sentence about this application, and this pane is about the
     casualties. */
  a.innerHTML = `<b>Survival after wounding</b> and <b>deadline against arrival</b>:
    <a href="#" data-chgo="FLOW">Casualty flow &rarr;</a>`;
  a.addEventListener('click', ev => {
    const t = ev.target.closest('[data-chgo]');
    if (!t) return;
    ev.preventDefault();
    if (typeof goView === 'function') goView('FLOW');
  });
  where.appendChild(a);
  return a;
}

function mountEmbedded() {
  const anaPane = document.querySelector('[data-pane="ANALYSIS"] .pane');
  if (anaPane && !document.getElementById('chAnalysis')) {
    const box = document.createElement('div');
    box.id = 'chAnalysis';
    const firstCard = anaPane.querySelector('.card');
    if (firstCard && firstCard.nextSibling) anaPane.insertBefore(box, firstCard.nextSibling);
    else anaPane.appendChild(box);
    crossLink(box);
  }
  const cmpBottom = document.querySelector('[data-pane="COMPARE"] .cmpBottom');
  if (cmpBottom && !document.getElementById('chCompare')) {
    const box = document.createElement('div');
    box.id = 'chCompare';
    box.style.gridColumn = '1 / -1';
    cmpBottom.appendChild(box);
    crossLink(box);
  }
}

function withdraw() {
  document.querySelectorAll('[data-view="FLOW"]').forEach(e => e.remove());
  const s = document.querySelector('[data-pane="FLOW"]');
  if (s) s.remove();
}

ANGEL.ready('charts', async () => {
  const pane = document.querySelector('[data-pane="FLOW"]');
  /* The pane's own <div> rather than the section, because the section also
     holds the script tag that loaded this module. */
  const host = pane && (pane.querySelector('#flowBody') || pane);
  if (!host) throw new Error('no FLOW pane in this build');

  const t0 = performance.now();
  const [e, u] = await Promise.all([
    import(ANGEL.asset(ECHARTS_PATH)),
    import(ANGEL.asset(UPLOT_PATH))
  ]);
  ECH = e.default || e;
  UP = u.default || u;
  if (!ECH || !ECH.init || !UP) { withdraw(); throw new Error('charting bundles did not load'); }
  const loadMs = performance.now() - t0;

  injectCSS();
  PANELS.flow = new FlowPanel(host);
  mountEmbedded();

  ANGEL.views = ANGEL.views || {};
  ANGEL.views.FLOW = () => { if (PANELS.flow) PANELS.flow.render(); };

  /* A theme change repaints every pane in the shell; ours have to be told,
     because the colours live inside canvas draw calls rather than in CSS. */
  /* Themes are `body[data-theme]` now, not `body.light` — four of them, and
     palette() already reads every colour back out of the stylesheet at draw
     time, so all this has to notice is that the attribute moved. The class is
     still watched: the retired light theme is gone but nothing else on this
     element's class list is ours to assume about. */
  let wasTheme = document.body.getAttribute('data-theme') + '|' + document.body.classList.contains('light');
  const repaint = () => {
    const now = document.body.getAttribute('data-theme') + '|' + document.body.classList.contains('light');
    if (now === wasTheme) return;
    wasTheme = now;
    for (const k in PANELS) if (PANELS[k]) { PANELS[k].destroy(); }
    tick();
  };
  new MutationObserver(repaint)
    .observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });

  /* The navigation entry advertises F, so F has to work. The shell's own
     shortcut table is not ours to edit, and a module that registers its own
     key is also a module that disappears cleanly when it fails to load. */
  window.addEventListener('keydown', ev => {
    if (ev.key !== 'f' && ev.key !== 'F') return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const tag = ev.target && ev.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || ev.target.isContentEditable) return;
    APP.view = 'FLOW'; APP.sel = null; APP._paneForce = true;
    document.body.classList.add('navOpen');
    render();
  });

  setInterval(tick, 500);
  tick();

  ANGEL.mark('charts loaded', { ms: Math.round(loadMs) });

  ANGEL.provide('charts', {
    ready: true,
    perf: () => Object.assign({}, PERF),
    kaplanMeier,
    sampleArm,
    sankeyModel,
    refresh: tick
  });
  return true;
});
