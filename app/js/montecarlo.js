/* =========================================================================
   CONFIDENCE — how much of the result is the seed?

   Everywhere else this application reports one run: 24 dead with ANGEL SWARM
   against 34 under current triage and proximity, PACOM CORAL, seed 42. That is a true
   statement about one battle. It is not yet a claim about the system, and an
   analyst's first question is the right one — run it again with a different
   seed and what happens?

   This pane answers that by running the real engine, sim.js and optimizer.js
   unmodified, a few hundred times across Web Workers. Both arms of every
   replication face the identical casualty stream, generated once from that
   replication's seed, so the comparison is paired: the quantity being
   estimated is the difference in deaths within a battle, not the gap between
   two averages taken over different battles. That pairing is worth roughly a
   factor of three and a half in standard error, measured, and it is reported
   below rather than asserted.

   What the pane will not do is tell you the system works. The simulation is
   synthetic. Its casualty stream, its physiology and its platform parameters
   are traceable to published sources but they were not observed in this
   fight or any other. A confidence interval computed over its replications
   is a statement about the model's internal variability and nothing else. It
   bounds the seed. It does not bound reality, and no number of replications
   will make it do so. That distinction is stated on screen, in those terms,
   because a judge who finds it missing is right to stop reading.
   ========================================================================= */

const DEFAULT_REPS = 200;
const SEED_BASE = 1000;          // replication i uses seed SEED_BASE + i

/* Sweep points per lever. Fewer replications per point than the headline run
   — a response curve needs shape, not a tight interval at every knot, and
   the bands drawn around it say how tight each knot actually is. */
const LEVERS = {
  none:   { label: 'None — headline run only', unit: '', points: [] },
  fleet:  { label: 'Fleet size', unit: '× baseline',
            points: [0.5, 0.75, 1, 1.25, 1.5, 2],
            note: 'Every airframe count at every launch point, scaled. The baseline force is 1.0.' },
  launch: { label: 'Launch points', unit: 'sites',
            points: [1, 2, 3],
            note: 'Bases are removed in reverse siting order. Each remaining site keeps its own fleet.' },
  comms:  { label: 'Datalink outage', unit: '× scenario window',
            points: [0, 1, 2, 3, 4],
            note: 'Multiplies the duration of every scheduled jamming or SATCOM-denial window. ' +
                  'Zero is a clean electromagnetic environment.' },
  /* Triage accuracy. The baseline arm sorts by triage category, so its whole
     performance rests on that category being right; ANGEL SWARM sorts by a
     physiological deadline and never reads the category at all. That makes
     this the one lever whose two arms are not symmetric, and the question it
     answers — does the result survive at the error rate the literature
     actually measures — is one a reviewer asks in the first five minutes.

     1.0 is METASTART: over-triage 14%, under-triage 10% (Franc JM et al.,
     Prehosp Disaster Med 2022;37(1):106-116). 0 is a perfect triage officer,
     which is the baseline arm's best case and therefore the honest one to
     show. 3.0 is roughly the rate this prototype itself shipped with before
     the constants were corrected, and 4.0 is past anything reported. */
  triage: { label: 'Triage error', unit: '× METASTART rate',
            points: [0, 0.5, 1, 2, 3, 4],
            note: 'Scales both START error rates together. 1.0 is the measured rate — 14% over, ' +
                  '10% under. Only the current triage and proximity arm reads triage category at all, so this ' +
                  'lever moves the baseline and leaves ANGEL SWARM alone.' }
};

/* ---------------------------------------------------------------- statistics

   Written out rather than pulled from a library, because every one of these
   is four lines and a reviewer should be able to check them without leaving
   the file. */

function mean(v) { let s = 0; for (const x of v) s += x; return v.length ? s / v.length : 0; }

/* Sample standard deviation, n-1. On a paired difference vector this is the
   paired standard deviation — the spread of the within-battle difference,
   which is the only spread the interval below is entitled to use. */
function sd(v) {
  const n = v.length;
  if (n < 2) return 0;
  const m = mean(v);
  let s = 0;
  for (const x of v) { const d = x - m; s += d * d; }
  return Math.sqrt(s / (n - 1));
}

function quantile(sorted, p) {
  if (!sorted.length) return NaN;
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h), hi = Math.ceil(h);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

/* Inverse standard normal. Acklam's rational approximation; absolute error
   below 1.15e-9 over the whole range, which is four orders of magnitude
   better than anything downstream of it needs. */
function invNorm(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
             3.754408661907416e+00];
  const pl = 0.02425, ph = 1 - pl;
  let q, r;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > ph) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
         (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/* Two-sided 97.5th percentile of Student's t on `df` degrees of freedom, via
   the Cornish-Fisher expansion around the normal quantile. At df = 199 this
   returns 1.9720, against the tabulated 1.9720. At df = 5 it returns 2.5707
   against 2.5706 — accurate enough that the sweep's small-sample bands are
   honest and not quietly using a normal quantile. */
function tCrit(df, p) {
  if (!(df > 0)) return NaN;
  const z = invNorm(p == null ? 0.975 : p);
  const v = df, z2 = z * z, z3 = z2 * z, z5 = z3 * z2, z7 = z5 * z2, z9 = z7 * z2;
  return z
    + (z3 + z) / (4 * v)
    + (5 * z5 + 16 * z3 + 3 * z) / (96 * v * v)
    + (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * v * v * v)
    + (79 * z9 + 776 * z7 + 1482 * z5 - 1920 * z3 - 945 * z) / (92160 * v * v * v * v);
}

/* Everything a paired comparison is entitled to say, and nothing more. */
function pairedStats(diffs) {
  const n = diffs.length;
  const m = mean(diffs), s = sd(diffs);
  const se = n > 1 ? s / Math.sqrt(n) : NaN;
  const t = n > 1 ? tCrit(n - 1, 0.975) : NaN;
  const srt = diffs.slice().sort((a, b) => a - b);
  let worse = 0, tie = 0, better = 0;
  for (const d of diffs) { if (d > 0) worse++; else if (d === 0) tie++; else better++; }
  return {
    n, mean: m, sd: s, se, tCrit: t,
    lo: m - t * se, hi: m + t * se,
    /* Cohen's d_z: the mean difference in units of the standard deviation of
       the difference. This is the paired form. Reporting the unpaired d here
       would flatter the result, because the unpaired denominator is much
       larger. */
    dz: s > 0 ? m / s : NaN,
    median: quantile(srt, 0.5), q1: quantile(srt, 0.25), q3: quantile(srt, 0.75),
    min: srt[0], max: srt[srt.length - 1],
    worse, tie, better, sorted: srt
  };
}

/* Independent-sample standard error for the same data, computed only so the
   pane can show what the pairing bought. Never used for an interval. */
function unpairedSE(a, b) {
  const sa = sd(a), sb = sd(b), n = a.length;
  return Math.sqrt(sa * sa / n + sb * sb / n);
}

/* --------------------------------------------------------------- the pool

   A work queue, not a partition. Each worker is handed one replication and
   asks for the next when it finishes. Replications vary in cost by a factor
   of two — a battle with more casualties is more expensive — so a static
   split would leave cores idle at the end of every run.

   One core is left to the page. The point of this whole exercise is that the
   interface keeps running while two hundred replications execute; saturating
   every core would make the map stutter and prove the opposite. */

class Pool {
  constructor() {
    this.workers = [];
    this.free = [];
    this.queue = [];
    this.pending = 0;
    this.onResult = null;
    this.onDone = null;
    this.onError = null;
    this.cancelled = false;
    this.size = Math.max(1, Math.min(12, (ANGEL.caps.cores || 2) - 1));
  }

  async start() {
    const url = ANGEL.asset('js/mc.worker.js');
    const hellos = [];
    for (let i = 0; i < this.size; i++) {
      const w = new Worker(url);
      w.onmessage = ev => this._msg(w, ev.data);
      w.onerror = e => { if (this.onError) this.onError(e.message || 'worker error'); };
      this.workers.push(w);
      this.free.push(w);
      hellos.push(new Promise(res => {
        const h = ev => {
          if (ev.data && ev.data.type === 'hello') { w.removeEventListener('message', h); res(ev.data); }
        };
        w.addEventListener('message', h);
        w.postMessage({ type: 'hello' });
      }));
    }
    const rs = await Promise.all(hellos);
    const bad = rs.find(r => !r.ok || !r.engine);
    if (bad) throw new Error('worker could not load the simulation: ' + (bad.error || 'engine missing'));
    return this;
  }

  _msg(w, m) {
    if (m.type === 'hello') return;
    this.pending--;
    if (m.type === 'result' && this.onResult && !this.cancelled) this.onResult(m.result);
    if (m.type === 'error' && this.onError) this.onError(m.error);
    this.free.push(w);
    this._pump();
  }

  _pump() {
    if (this.cancelled) return;
    while (this.free.length && this.queue.length) {
      const w = this.free.pop();
      const job = this.queue.shift();
      this.pending++;
      w.postMessage({ type: 'run', id: job.id, cfg: job.cfg });
    }
    if (!this.queue.length && !this.pending && this.onDone) { const f = this.onDone; this.onDone = null; f(); }
  }

  submit(jobs) { this.queue.push(...jobs); this._pump(); }

  cancel() { this.cancelled = true; this.queue.length = 0; }

  dispose() { this.cancel(); this.workers.forEach(w => w.terminate()); this.workers = []; this.free = []; }
}

/* ------------------------------------------------------------------- state */

const MC = {
  reps: DEFAULT_REPS,
  lever: 'none',
  sweepReps: 40,
  results: [],            // headline replications
  stats: null,
  sweep: null,            // {lever, points:[{value, results, stats}]}
  running: false,
  phase: '',
  done: 0, total: 0,
  t0: 0, elapsed: 0, repsPerSec: 0,
  pool: null,
  error: null,
  cfg: null,              // the configuration the last run actually used
  metric: 'survivable'    // 'survivable' | 'total'
};

/* app.js declares its state as `const APP` and sim.js declares `const
   SCENARIOS`. A script-level `const` does not become a property of the global
   object, so `window.APP` is undefined and always will be — the bare name is
   the only way to reach either from a module, as the module brief says. The
   try/catch covers this module somehow running before those scripts, when the
   binding would still be in its temporal dead zone. */
let _app = null, _scn = null;
function app() {
  if (_app) return _app;
  try { _app = APP; } catch (e) { _app = null; }
  return _app;
}
function scenarios() {
  if (_scn) return _scn;
  try { _scn = SCENARIOS; } catch (e) { _scn = null; }
  return _scn;
}

/* The replications inherit whatever the operator is looking at, so the
   distribution is a distribution of the run on screen rather than of some
   other configuration chosen here. */
function liveConfig() {
  const A = app() || {};
  return {
    scenario: A.scenarioKey || 'PACOM_CORAL',
    mode: A.mode || 'fair',
    telementor: A.telementor === undefined ? false : !!A.telementor,
    observedFlightVariability: !!A.observedFlightVariability,
    crn: true
  };
}

function diffsOf(rows, metric) {
  return rows.map(r => (metric === 'total' ? r.aTotal - r.bTotal : r.a - r.b));
}

/* --------------------------------------------------------------- the runs */

async function ensurePool() {
  if (MC.pool) return MC.pool;
  const p = new Pool();
  await p.start();
  MC.pool = p;
  ANGEL.mark('mc pool', { workers: p.size, cores: ANGEL.caps.cores });
  return p;
}

async function runHeadline() {
  if (MC.running) return;
  MC.running = true; MC.error = null; MC.phase = 'replications';
  MC.results = []; MC.stats = null; MC.sweep = null;
  MC.done = 0; MC.total = MC.reps;
  MC.cfg = liveConfig();
  MC.t0 = performance.now();
  paint();

  let pool;
  try { pool = await ensurePool(); }
  catch (e) { MC.error = String(e.message || e); MC.running = false; paint(); return; }

  pool.cancelled = false;
  const jobs = [];
  for (let i = 0; i < MC.reps; i++) {
    jobs.push({ id: i, cfg: Object.assign({ seed: SEED_BASE + i, lever: 'none' }, MC.cfg) });
  }

  await new Promise(res => {
    pool.onResult = r => {
      MC.results.push(r);
      MC.done++;
      MC.elapsed = (performance.now() - MC.t0) / 1000;
      MC.repsPerSec = MC.done / Math.max(0.001, MC.elapsed);
      /* Recompute on every arrival. Two hundred numbers is nothing, and a
         live interval that visibly tightens as replications land is the
         clearest possible demonstration that this is a sampling problem. */
      MC.stats = pairedStats(diffsOf(MC.results, MC.metric));
      schedulePaint();
    };
    pool.onError = e => { MC.error = String(e); schedulePaint(); };
    pool.onDone = res;
    pool.submit(jobs);
  });

  MC.elapsed = (performance.now() - MC.t0) / 1000;
  MC.repsPerSec = MC.done / Math.max(0.001, MC.elapsed);
  MC.running = false; MC.phase = '';
  ANGEL.mark('mc headline', {
    reps: MC.done, sec: +MC.elapsed.toFixed(2), repsPerSec: +MC.repsPerSec.toFixed(2),
    workers: pool.size
  });
  paint();

  if (MC.lever !== 'none') await runSweep();
}

async function runSweep() {
  const spec = LEVERS[MC.lever];
  if (!spec || !spec.points.length) return;

  /* Launch points cannot exceed the number this scenario actually has. */
  let points = spec.points.slice();
  if (MC.lever === 'launch') {
    const S = scenarios();
    const n = (S && S[MC.cfg.scenario]) ? S[MC.cfg.scenario].bases.length : 3;
    points = [];
    for (let k = 1; k <= n; k++) points.push(k);
  }

  MC.running = true; MC.phase = 'sweep';
  MC.sweep = { lever: MC.lever, unit: spec.unit, note: spec.note || '',
               points: points.map(v => ({ value: v, results: [] })) };
  MC.done = 0; MC.total = points.length * MC.sweepReps;
  const t0 = performance.now();
  paint();

  const pool = MC.pool;
  pool.cancelled = false;

  const jobs = [];
  points.forEach((v, pi) => {
    for (let i = 0; i < MC.sweepReps; i++) {
      /* The same seed set at every sweep point. This is common random
         numbers along the sweep axis as well as between arms: the response
         curve is then a curve in the lever, not a curve in the lever plus
         forty fresh battles per knot. */
      jobs.push({ id: pi * 10000 + i,
        cfg: Object.assign({ seed: SEED_BASE + i, lever: MC.lever, value: v }, MC.cfg) });
    }
  });

  await new Promise(res => {
    pool.onResult = r => {
      const pi = Math.floor(r.id / 10000);
      if (MC.sweep.points[pi]) MC.sweep.points[pi].results.push(r);
      MC.done++;
      schedulePaint();
    };
    pool.onDone = res;
    pool.submit(jobs);
  });

  for (const p of MC.sweep.points) {
    p.stats = pairedStats(diffsOf(p.results, MC.metric));
    p.meanA = mean(p.results.map(r => MC.metric === 'total' ? r.aTotal : r.a));
    p.meanB = mean(p.results.map(r => MC.metric === 'total' ? r.bTotal : r.b));
    const A = p.results.map(r => MC.metric === 'total' ? r.aTotal : r.a);
    const B = p.results.map(r => MC.metric === 'total' ? r.bTotal : r.b);
    const t = tCrit(A.length - 1, 0.975);
    p.ciA = t * sd(A) / Math.sqrt(A.length);
    p.ciB = t * sd(B) / Math.sqrt(B.length);
  }

  const sec = (performance.now() - t0) / 1000;
  ANGEL.mark('mc sweep', { lever: MC.lever, reps: MC.done, sec: +sec.toFixed(2),
    repsPerSec: +(MC.done / sec).toFixed(2) });
  MC.running = false; MC.phase = '';
  paint();
}

function cancelRun() {
  if (MC.pool) MC.pool.cancel();
  MC.running = false; MC.phase = '';
  paint();
}

/* ------------------------------------------------------------------ charts

   charts.js publishes a service, and it is checked for. What it exposes is a
   Sankey builder, a Kaplan-Meier estimator and a sampler — the ECharts build
   in this folder is compiled with the Sankey chart alone, so there is no
   line or bar renderer behind that service to borrow. Rather than pull a
   second charting bundle into the application for two plots, both are drawn
   directly. If the service ever exposes a general plotter, the branch below
   picks it up; nothing here depends on it. */

let _rendererMarked = false;
function haveCharts() {
  const c = ANGEL.has('charts') ? ANGEL.get('charts') : null;
  const yes = !!(c && c.uPlot);
  /* Recorded once, at the moment the decision is actually taken, rather than
     at load — charts.js may still be resolving its own imports when this
     module boots, and a snapshot from before that would be a false record. */
  if (!_rendererMarked) {
    _rendererMarked = true;
    ANGEL.mark('mc renderer', { chartsService: ANGEL.has('charts'), plotter: yes ? 'uplot' : 'canvas' });
  }
  return yes;
}

function fitCanvas(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = cv.clientWidth, H = cv.clientHeight;
  if (!W || !H) return null;
  if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  return { ctx, W, H };
}

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/* The difference distribution. Integer-valued, so the bins are integers —
   binning integers into fractional-width buckets produces a comb, and a comb
   in a histogram is an artefact that a reviewer will, correctly, distrust. */
function drawHistogram(cv, stats) {
  haveCharts();          // records which renderer this machine ended up using
  const f = fitCanvas(cv);
  if (!f || !stats || !stats.n) return;
  const { ctx, W, H } = f;
  const ink = cssVar('--text', '#dfe8f2'), dim = cssVar('--dim', '#8ea3b8');
  const faint = cssVar('--faint', '#63768a'), line = cssVar('--line', '#1e2b3a');
  const bad = cssVar('--bad', '#ff4257'), info = cssVar('--info', '#5bb4ff');

  const lo = Math.floor(stats.min), hi = Math.ceil(stats.max);
  const nb = Math.max(1, hi - lo + 1);
  const counts = new Array(nb).fill(0);
  for (const d of stats.sorted) counts[Math.min(nb - 1, Math.max(0, Math.round(d) - lo))]++;
  const peak = Math.max(1, ...counts);

  const padL = 34, padR = 12, padT = 16, padB = 40;
  const pw = W - padL - padR, ph = H - padT - padB;
  const X = v => padL + ((v - lo + 0.5) / nb) * pw;
  const bw = Math.max(2, pw / nb - 2);

  ctx.strokeStyle = line; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = Math.round(padT + i * ph / 4) + 0.5;
    ctx.moveTo(padL, y); ctx.lineTo(W - padR, y);
  }
  ctx.stroke();

  ctx.font = '9px ui-monospace, monospace';
  ctx.fillStyle = faint; ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = padT + i * ph / 4;
    ctx.fillText(String(Math.round(peak * (1 - i / 4))), padL - 6, y + 3);
  }

  /* Bars. The body of the distribution is drawn in a neutral steel — a
     distribution is not good news, it is a distribution, and colouring the
     mass of it in the arm's own green would read as a scoreboard. What is
     coloured is the failure region: any bar at or above zero is a battle in
     which the system did not reduce the dead, and it is never hidden. */
  for (let i = 0; i < nb; i++) {
    const v = lo + i;
    const h = (counts[i] / peak) * ph;
    const x = X(v) - bw / 2;
    ctx.fillStyle = v > 0 ? bad : (v === 0 ? faint : info);
    ctx.globalAlpha = v > 0 ? 0.85 : 0.62;
    ctx.fillRect(x, padT + ph - h, bw, h);
    ctx.globalAlpha = 1;
    if (counts[i] && nb <= 26) {
      ctx.fillStyle = dim; ctx.textAlign = 'center';
      ctx.fillText(String(counts[i]), X(v), padT + ph - h - 4);
    }
  }

  // Axis.
  ctx.strokeStyle = line;
  ctx.beginPath();
  ctx.moveTo(padL, padT + ph + 0.5); ctx.lineTo(W - padR, padT + ph + 0.5);
  ctx.stroke();
  ctx.fillStyle = faint; ctx.textAlign = 'center'; ctx.font = '9px ui-monospace, monospace';
  const step = nb > 20 ? 2 : 1;
  for (let v = lo; v <= hi; v += step) ctx.fillText(String(v), X(v), padT + ph + 13);

  // Zero — the line that matters. Left of it ANGEL SWARM produced fewer
  // dead; on or right of it, it did not.
  if (lo <= 0 && hi >= 0) {
    const zx = Math.round(X(0) + (nb ? 0 : 0)) + 0.5;
    ctx.strokeStyle = 'rgba(255,66,87,0.55)';
    ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(zx, padT); ctx.lineTo(zx, padT + ph); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Mean and its 95% interval, drawn on the axis beneath the bars.
  const yb = padT + ph + 24;
  ctx.strokeStyle = ink; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(X(stats.lo), yb); ctx.lineTo(X(stats.hi), yb); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(X(stats.lo), yb - 4); ctx.lineTo(X(stats.lo), yb + 4);
  ctx.moveTo(X(stats.hi), yb - 4); ctx.lineTo(X(stats.hi), yb + 4);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.beginPath(); ctx.arc(X(stats.mean), yb, 3, 0, 6.284); ctx.fill();
  ctx.fillStyle = faint; ctx.textAlign = 'left'; ctx.font = '9px ui-monospace, monospace';
  ctx.fillText('mean and 95% interval', padL, padT + ph + 36);
  ctx.textAlign = 'right';
  ctx.fillText('difference in dead per battle  (ANGEL SWARM − current triage and proximity)', W - padR, padT + ph + 36);
}

/* Response curve with confidence bands, one line per arm. Bands are the 95%
   interval of the mean at each knot; they are drawn rather than tabulated
   because whether two bands overlap is the question the chart is being asked
   and it should be answerable without arithmetic. */
function drawSweep(cv, sweep) {
  const f = fitCanvas(cv);
  if (!f || !sweep || !sweep.points.length || !sweep.points[0].stats) return;
  const { ctx, W, H } = f;
  const faint = cssVar('--faint', '#63768a'), line = cssVar('--line', '#1e2b3a');
  const angel = cssVar('--angel', '#31d68a'), current = cssVar('--current', '#f0813f');

  const pts = sweep.points;
  const xs = pts.map(p => p.value);
  const xlo = Math.min(...xs), xhi = Math.max(...xs);
  let ylo = Infinity, yhi = -Infinity;
  for (const p of pts) {
    ylo = Math.min(ylo, p.meanA - p.ciA, p.meanB - p.ciB);
    yhi = Math.max(yhi, p.meanA + p.ciA, p.meanB + p.ciB);
  }
  const pad = Math.max(1, (yhi - ylo) * 0.12);
  ylo = Math.max(0, ylo - pad); yhi = yhi + pad;

  const padL = 40, padR = 108, padT = 16, padB = 34;
  const pw = W - padL - padR, ph = H - padT - padB;
  const X = v => padL + (xhi === xlo ? 0.5 : (v - xlo) / (xhi - xlo)) * pw;
  const Y = v => padT + (1 - (v - ylo) / Math.max(1e-6, yhi - ylo)) * ph;

  ctx.strokeStyle = line; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = Math.round(padT + i * ph / 4) + 0.5;
    ctx.moveTo(padL, y); ctx.lineTo(W - padR, y);
  }
  ctx.stroke();
  ctx.font = '9px ui-monospace, monospace'; ctx.fillStyle = faint; ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = yhi - (yhi - ylo) * i / 4;
    ctx.fillText(v.toFixed(0), padL - 6, padT + i * ph / 4 + 3);
  }

  const series = [
    { key: 'B', col: current, m: p => p.meanB, ci: p => p.ciB, label: 'CURRENT — TRIAGE & PROXIMITY' },
    { key: 'A', col: angel, m: p => p.meanA, ci: p => p.ciA, label: 'ANGEL SWARM' }
  ];

  for (const s of series) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) ctx.lineTo(X(pts[i].value), Y(s.m(pts[i]) + s.ci(pts[i])));
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(X(pts[i].value), Y(s.m(pts[i]) - s.ci(pts[i])));
    ctx.closePath();
    ctx.fillStyle = s.col; ctx.globalAlpha = 0.16; ctx.fill(); ctx.globalAlpha = 1;
  }
  for (const s of series) {
    ctx.strokeStyle = s.col; ctx.lineWidth = 1.9;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) ctx.lineTo(X(pts[i].value), Y(s.m(pts[i])));
    ctx.stroke();
    ctx.fillStyle = s.col;
    for (const p of pts) { ctx.beginPath(); ctx.arc(X(p.value), Y(s.m(p)), 2.6, 0, 6.284); ctx.fill(); }
    const last = pts[pts.length - 1];
    ctx.textAlign = 'left'; ctx.font = '700 9px ui-monospace, monospace';
    ctx.fillText(s.label, W - padR + 8, Y(s.m(last)) + 3);
  }

  ctx.strokeStyle = line;
  ctx.beginPath(); ctx.moveTo(padL, padT + ph + 0.5); ctx.lineTo(W - padR, padT + ph + 0.5); ctx.stroke();
  ctx.fillStyle = faint; ctx.textAlign = 'center'; ctx.font = '9px ui-monospace, monospace';
  for (const p of pts) ctx.fillText(String(p.value), X(p.value), padT + ph + 13);
  ctx.textAlign = 'right';
  ctx.fillText((LEVERS[sweep.lever] ? LEVERS[sweep.lever].label : sweep.lever) +
    (sweep.unit ? '  (' + sweep.unit + ')' : ''), W - padR, padT + ph + 26);
  ctx.textAlign = 'left'; ctx.fillStyle = faint;
  ctx.fillText('dead per battle, mean of ' + pts[0].results.length + ' replications · shaded = 95% interval of the mean',
    padL, padT + ph + 26);
}

/* --------------------------------------------------------------------- UI */

const CSS = `
#mcBody .mcGrid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:12px}
#mcBody .mcWide{grid-column:1 / -1}
@media (max-width:1180px){#mcBody .mcGrid{grid-template-columns:1fr}}
#mcBody .mcCtl{display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:2px 0 4px}
#mcBody .mcCtl label{font:700 8px/1 var(--mono);letter-spacing:.16em;color:var(--faint);
  display:block;margin-bottom:5px}
#mcBody .mcCtl .fld{display:flex;flex-direction:column}
#mcBody .mcCtl input[type=number],#mcBody .mcCtl select{background:var(--panel2);color:var(--text);
  border:1px solid var(--line2);border-radius:5px;padding:5px 7px;font:600 12px/1 var(--mono);min-width:74px}
#mcBody .mcCtl select{font-family:var(--sans);min-width:190px}
#mcBody .mcProg{height:5px;border-radius:3px;background:var(--line);overflow:hidden;margin:8px 0 6px}
#mcBody .mcProg i{display:block;height:100%;background:var(--info);width:0%;transition:width .18s linear}
#mcBody .mcProgTxt{font:600 10px/1.5 var(--mono);color:var(--dim);display:flex;gap:16px;flex-wrap:wrap}
#mcBody .mcHead{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin:2px 0 10px}
#mcBody .mcBig{font:700 38px/1 var(--mono);letter-spacing:-1px;color:var(--tollLo)}
#mcBody .mcBig small{font:700 13px/1 var(--mono);color:var(--dim);letter-spacing:0;margin-left:7px}
#mcBody .mcCi{font:600 13px/1.4 var(--mono);color:var(--text)}
#mcBody .mcHistCard{display:flex;flex-direction:column}
#mcBody .mcHistCard .mcCanvas{flex:1 1 auto;min-height:260px;max-height:560px}
#mcBody .mcCanvas{width:100%;height:260px;display:block}
#mcBody .mcSweepCanvas{width:100%;height:270px;display:block}
#mcBody table.mcKv{width:100%;border-collapse:collapse;font:400 12px/1.5 var(--sans)}
#mcBody table.mcKv td{padding:4px 0;border-bottom:1px solid var(--line);vertical-align:top}
#mcBody table.mcKv td:last-child{text-align:right;font:600 12px/1.5 var(--mono);white-space:nowrap;
  padding-left:10px;color:var(--text)}
#mcBody table.mcKv tr:last-child td{border-bottom:none}
#mcBody table.mcKv tr.hi td{color:var(--text)}
#mcBody table.mcKv tr.hi td:last-child{color:var(--tollHi)}
#mcBody .mcCaveat{border-left:2px solid var(--warn);padding:2px 0 2px 12px;margin:4px 0 0}
#mcBody .mcCaveat p{margin:0 0 8px;font:400 12px/1.6 var(--sans);color:var(--dim)}
#mcBody .mcCaveat p:last-child{margin-bottom:0}
#mcBody .mcCaveat b{color:var(--text)}
#mcBody .mcWorse{font:400 13px/1.6 var(--sans);color:var(--text);margin:10px 0 0}
#mcBody .mcWorse b{font:700 13px/1.6 var(--mono);color:var(--tollHi)}
#mcBody .mcNote{font:400 11px/1.55 var(--sans);color:var(--faint);margin:8px 0 0}
#mcBody .mcSweepTbl{width:100%;border-collapse:collapse;font:600 11px/1.5 var(--mono);margin-top:8px}
#mcBody .mcSweepTbl th{font:700 8px/1 var(--mono);letter-spacing:.14em;color:var(--faint);
  text-align:right;padding:0 0 6px;border-bottom:1px solid var(--line)}
#mcBody .mcSweepTbl th:first-child{text-align:left}
#mcBody .mcSweepTbl td{padding:4px 0;text-align:right;border-bottom:1px solid var(--line);color:var(--text)}
#mcBody .mcSweepTbl td:first-child{text-align:left;color:var(--dim)}
#mcBody .mcIdle{font:400 13px/1.65 var(--sans);color:var(--dim)}
`;

let painting = false;
function schedulePaint() {
  if (painting) return;
  painting = true;
  requestAnimationFrame(() => { painting = false; paint(); });
}

function fmt(v, d) { return (v == null || !isFinite(v)) ? '—' : v.toFixed(d == null ? 2 : d); }
function sgn(v, d) { return (v > 0 ? '+' : '') + fmt(v, d); }
function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

function paint() {
  const host = document.getElementById('mcBody');
  if (!host) return;
  /* Repaints driven by arriving replications are skipped when the operator is
     looking at something else. The check is against APP.view rather than the
     pane's own class, because the shell applies that class after it dispatches
     to the view, so the class is one frame stale at exactly the moment this
     runs. */
  const A = app();
  if (host.dataset.built && A && A.view !== 'CONFIDENCE') return;

  if (!host.dataset.built) { build(host); host.dataset.built = '1'; }

  const el = id => host.querySelector('#' + id);
  const s = MC.stats;

  // ---- progress
  const prog = el('mcProgBar'), ptxt = el('mcProgTxt');
  if (prog) prog.style.width = (MC.total ? (MC.done / MC.total * 100) : 0).toFixed(1) + '%';
  if (ptxt) {
    const bits = [];
    if (MC.running) {
      bits.push((MC.phase === 'sweep' ? 'SWEEP' : 'REPLICATIONS') + '  ' + MC.done + ' / ' + MC.total);
      bits.push(fmt(MC.repsPerSec, 2) + ' rep/s');
      bits.push(plural(MC.pool ? MC.pool.size : 0, 'worker') + ' of ' + (ANGEL.caps.cores || '?') + ' cores');
    } else if (MC.done) {
      bits.push('COMPLETE  ' + MC.results.length + ' replications');
      bits.push(fmt(MC.elapsed, 1) + ' s');
      bits.push(fmt(MC.repsPerSec, 2) + ' rep/s');
      bits.push(MC.pool ? plural(MC.pool.size, 'worker') : '');
    } else {
      bits.push('IDLE');
      bits.push((ANGEL.caps.cores || '?') + ' cores detected · ' +
        plural(Math.max(1, Math.min(12, (ANGEL.caps.cores || 2) - 1)), 'worker') + ' will be used');
    }
    ptxt.innerHTML = bits.filter(Boolean).map(b => '<span>' + b + '</span>').join('');
  }

  const btnRun = el('mcRun'), btnStop = el('mcStop');
  if (btnRun) { btnRun.disabled = MC.running; btnRun.textContent = MC.running ? 'Running…' : 'Run replications'; }
  if (btnStop) btnStop.style.display = MC.running ? '' : 'none';

  const err = el('mcErr');
  if (err) {
    err.style.display = MC.error ? '' : 'none';
    err.textContent = MC.error ? ('The replication engine reported: ' + MC.error) : '';
  }

  // ---- headline
  const head = el('mcResultHead');
  if (head) head.textContent = (s && s.n) ? ('What ' + s.n + ' battles say') : 'The distribution';

  const box = el('mcResult');
  if (box) {
    if (!s || !s.n) {
      box.innerHTML = '<p class="mcIdle" data-nofold>No replications yet. Press <b>Run ' +
        'replications</b> to draw the rest of the distribution.</p>';
    } else {
      const cfg = MC.cfg || {};
      const uSE = unpairedSE(
        MC.results.map(r => MC.metric === 'total' ? r.aTotal : r.a),
        MC.results.map(r => MC.metric === 'total' ? r.bTotal : r.b));
      const mA = mean(MC.results.map(r => MC.metric === 'total' ? r.aTotal : r.a));
      const mB = mean(MC.results.map(r => MC.metric === 'total' ? r.bTotal : r.b));
      const worsePct = s.worse / s.n * 100;

      box.innerHTML =
        '<div class="mcHead"><span class="mcBig">' + sgn(s.mean, 2) +
          '<small>MEAN DIFFERENCE IN DEAD PER BATTLE</small></span></div>' +
        '<div class="mcCi">95% interval ' + fmt(s.lo, 2) + ' to ' + fmt(s.hi, 2) +
          '  ·  paired SD ' + fmt(s.sd, 2) + '  ·  n = ' + s.n + '</div>' +
        '<p class="mcWorse" data-nofold><b>' + s.worse + ' of ' + s.n + '</b> replications where ANGEL ' +
          'SWARM produced more dead' + (s.tie ? ('; ' + s.tie + ' with no difference') : '') +
          (s.worse === 0 ? '.' : ' &mdash; ' + fmt(worsePct, 1) + '%.') +
        '</p>' +
        '<details class="disc"><summary><b>' + fmt(mA, 2) + ' vs ' + fmt(mB, 2) + '</b>' +
          '<b class="q">dead per battle, ANGEL SWARM against current triage and proximity &mdash; and the ' +
          'thirteen rows behind the interval</b></summary>' +
        '<table class="mcKv" style="margin-top:12px">' +
        '<tr><td>Dead per battle, ANGEL SWARM</td><td>' + fmt(mA, 2) + '</td></tr>' +
        '<tr><td>Dead per battle, current triage and proximity</td><td>' + fmt(mB, 2) + '</td></tr>' +
        '<tr class="hi"><td>Mean difference (paired)</td><td>' + sgn(s.mean, 3) + '</td></tr>' +
        '<tr><td>Standard deviation of the difference</td><td>' + fmt(s.sd, 3) + '</td></tr>' +
        '<tr><td>Standard error of the mean difference</td><td>' + fmt(s.se, 4) + '</td></tr>' +
        '<tr><td>95% confidence interval</td><td>' + fmt(s.lo, 3) + ' … ' + fmt(s.hi, 3) + '</td></tr>' +
        '<tr><td>Critical value used (t, ' + (s.n - 1) + ' df)</td><td>' + fmt(s.tCrit, 4) + '</td></tr>' +
        '<tr><td>Paired effect size (Cohen’s d<sub>z</sub>)</td><td>' + fmt(s.dz, 3) + '</td></tr>' +
        '<tr><td>Median difference (IQR)</td><td>' + fmt(s.median, 1) + ' (' + fmt(s.q1, 1) + ' … ' + fmt(s.q3, 1) + ')</td></tr>' +
        '<tr><td>Worst and best replication</td><td>' + sgn(s.max, 0) + ' … ' + sgn(s.min, 0) + '</td></tr>' +
        '<tr class="hi"><td>Replications where the system did worse</td><td>' + s.worse + ' / ' + s.n + '</td></tr>' +
        '<tr><td>Replications where it made no difference</td><td>' + s.tie + ' / ' + s.n + '</td></tr>' +
        '<tr><td>Standard error if the arms were treated as independent</td><td>' + fmt(uSE, 4) + '</td></tr>' +
        '<tr><td>What the pairing bought</td><td>×' + fmt(uSE / s.se, 2) + ' tighter</td></tr>' +
        '</table></details>' +
        '<p class="mcNote">Configuration: ' + (cfg.scenario || '—') + ' · ' +
          (cfg.mode === 'fair' ? 'perfect triage classification' : 'START error profile') + ' · telementoring ' +
          (cfg.telementor ? 'on' : 'off') + ' · seeds ' + SEED_BASE + '–' + (SEED_BASE + s.n - 1) +
          ' · metric: ' + (MC.metric === 'total' ? 'all deaths' :
            'deaths among casualties whose wounds were survivable with timely intervention') + '.</p>';
    }
  }

  const hcv = el('mcHist');
  if (hcv && s && s.n) drawHistogram(hcv, s);

  // ---- sweep
  const sw = el('mcSweepBox');
  if (sw) {
    if (!MC.sweep) {
      sw.innerHTML = '<p class="mcIdle" data-nofold>Choose a parameter above and run again. Each ' +
        'setting re-runs the same battles, so the curve responds to the parameter, not to new ' +
        'casualties.</p>';
    } else if (!MC.sweep.points[0].stats) {
      sw.innerHTML = '<p class="mcIdle">Sweeping… ' + MC.done + ' of ' + MC.total + ' replications.</p>';
    } else {
      const spec = LEVERS[MC.sweep.lever] || {};
      sw.innerHTML =
        '<canvas id="mcSweepCv" class="mcSweepCanvas"></canvas>' +
        (spec.note ? '<p class="mcNote">' + spec.note + '</p>' : '') +
        '<table class="mcSweepTbl"><thead><tr><th>' + (spec.label || MC.sweep.lever) + '</th>' +
        '<th>ANGEL</th><th>CL VIII</th><th>Difference</th><th>95% interval</th><th>Worse</th></tr></thead><tbody>' +
        MC.sweep.points.map(p => '<tr><td>' + p.value + '</td><td>' + fmt(p.meanA, 2) + '</td><td>' +
          fmt(p.meanB, 2) + '</td><td>' + sgn(p.stats.mean, 2) + '</td><td>' +
          fmt(p.stats.lo, 2) + ' … ' + fmt(p.stats.hi, 2) + '</td><td>' +
          p.stats.worse + '/' + p.stats.n + '</td></tr>').join('') +
        '</tbody></table>';
      const scv = sw.querySelector('#mcSweepCv');
      if (scv) drawSweep(scv, MC.sweep);
    }
  }
}

function build(host) {
  const opts = Object.keys(LEVERS).map(k =>
    '<option value="' + k + '"' + (k === MC.lever ? ' selected' : '') + '>' + LEVERS[k].label + '</option>').join('');

  host.innerHTML = `
    <div class="pane">
      <div class="paneHead">
        <div class="ph1"><h2>How much of this is the seed?</h2>
          <p class="lede">The same battle, a few hundred seeds, both arms paired inside each one.
             Every other page reports a single draw from the distribution below. Both arms of a
             replication fight the identical battle, so the quantity estimated is the difference
             <i>within</i> a battle &mdash; a far tighter thing to measure than the gap between two
             averages.</p></div>
      </div>

      <div class="card">
        <div class="cardHead">Run</div>
        <div class="mcCtl">
          <div class="fld"><label>Replications</label>
            <input type="number" id="mcReps" min="10" max="2000" step="10" value="${MC.reps}"></div>
          <div class="fld"><label>Sensitivity parameter</label>
            <select id="mcLever">${opts}</select></div>
          <div class="fld"><label>Replications per sweep point</label>
            <input type="number" id="mcSweepReps" min="10" max="400" step="10" value="${MC.sweepReps}"></div>
          <div class="fld"><label>Metric</label>
            <select id="mcMetric" style="min-width:230px">
              <option value="survivable">Deaths among survivable wounds</option>
              <option value="total">All deaths</option>
            </select></div>
          <div class="fld"><label>&nbsp;</label>
            <div style="display:flex;gap:8px">
              <button class="btn ok" id="mcRun">Run replications</button>
              <button class="btn" id="mcStop" style="display:none">Stop</button>
            </div></div>
        </div>
        <div class="mcProg"><i id="mcProgBar"></i></div>
        <div class="mcProgTxt" id="mcProgTxt"></div>
        <div class="uavStatus bad" id="mcErr" style="display:none;margin-top:10px"></div>
      </div>

      <div class="mcGrid">
        <div class="card mcHistCard">
          <div class="cardHead">The difference distribution</div>
          <canvas id="mcHist" class="mcCanvas"></canvas>
          <p class="mcNote">One bar per whole casualty; left of the dashed line is fewer dead.
             Bars on or right of the line are replications in which ANGEL SWARM did not do better.
             The target is zero dead, and neither arm reaches it.</p>
        </div>
        <div class="card">
          <div class="cardHead" id="mcResultHead">The distribution</div>
          <div id="mcResult"></div>
        </div>

        <div class="card mcWide">
          <div class="cardHead">Sensitivity</div>
          <div id="mcSweepBox"></div>
        </div>

        <div class="card mcWide">
          <div class="cardHead">The interval bounds the seed, not reality</div>
          <div class="mcCaveat">
            <p data-fold-label="what the interval is">It says that if you keep drawing seeds from the
               same generator and running the same model, the average within-battle difference lands in
               that range 95 times in 100. It bounds the seed. Nothing more.</p>
            <p data-fold-label="what it is not">Not evidence that fielding this system would produce that
               result. The casualty stream, the physiological deadlines, the platform performance and the
               receiver capability are all modelled. Their parameters are traceable to published sources
               &mdash; see the provenance table on the model page &mdash; but the model has never been
               checked against an observed engagement, because there is not one to check it against. A
               tight interval around a wrong model is a tight interval around a wrong answer.</p>
            <p data-fold-label="why there is no p-value">The replications are drawn from a deterministic
               program on demand. Any p-value could be driven as low as you like by running longer, making
               it a measure of the compute budget rather than of the evidence. The mean difference, its
               interval, the effect size and the count of replications in which the system did worse are
               reported instead, and they do not have that defect.</p>
            <p data-fold-label="the number to argue with">The count of replications in which ANGEL SWARM
               produced more dead is printed whether it is zero or not. If a configuration is found where
               it is large, that is a finding about the system and it belongs in the record, not in a
               footnote.</p>
          </div>
        </div>
      </div>
    </div>`;

  const el = id => host.querySelector('#' + id);
  el('mcMetric').value = MC.metric;

  el('mcRun').addEventListener('click', () => {
    MC.reps = Math.max(10, Math.min(2000, parseInt(el('mcReps').value, 10) || DEFAULT_REPS));
    MC.sweepReps = Math.max(10, Math.min(400, parseInt(el('mcSweepReps').value, 10) || 40));
    MC.lever = el('mcLever').value;
    MC.metric = el('mcMetric').value;
    runHeadline();
  });
  el('mcStop').addEventListener('click', cancelRun);
  el('mcLever').addEventListener('change', () => { MC.lever = el('mcLever').value; });
  el('mcMetric').addEventListener('change', () => {
    MC.metric = el('mcMetric').value;
    /* Re-derive from the replications already in hand rather than re-running
       them. Both metrics come back from every replication. */
    if (MC.results.length) MC.stats = pairedStats(diffsOf(MC.results, MC.metric));
    if (MC.sweep) {
      for (const p of MC.sweep.points) {
        if (!p.results.length) continue;
        p.stats = pairedStats(diffsOf(p.results, MC.metric));
        const A = p.results.map(r => MC.metric === 'total' ? r.aTotal : r.a);
        const B = p.results.map(r => MC.metric === 'total' ? r.bTotal : r.b);
        p.meanA = mean(A); p.meanB = mean(B);
        const t = tCrit(A.length - 1, 0.975);
        p.ciA = t * sd(A) / Math.sqrt(A.length);
        p.ciB = t * sd(B) / Math.sqrt(B.length);
      }
    }
    paint();
  });
}

function injectCSS(id, css) {
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id; s.textContent = css;
  document.head.appendChild(s);
}

/* ------------------------------------------------------------- bootstrap */

ANGEL.ready('montecarlo', async () => {
  /* Without workers this pane would have to run two hundred replications on
     the thread that draws the map, and the freeze is the exact failure the
     pane exists to avoid. The nav entry and the pane are removed rather than
     left to disappoint. */
  if (!ANGEL.caps.workers) {
    document.querySelectorAll('[data-view="CONFIDENCE"]').forEach(e => e.remove());
    const p = document.querySelector('[data-pane="CONFIDENCE"]');
    if (p) p.remove();
    ANGEL.setStatus('montecarlo', 'withheld', 'No Web Workers on this browser');
    return null;
  }

  injectCSS('mcCss', CSS);
  ANGEL.views = ANGEL.views || {};
  ANGEL.views.CONFIDENCE = paint;

  /* The nav advertises U, so U has to work. Registered here rather than in
     the shell's own table, so that it goes away with this module. */
  window.addEventListener('keydown', ev => {
    if (ev.key !== 'u' && ev.key !== 'U') return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const tag = ev.target && ev.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || ev.target.isContentEditable) return;
    const A = app();
    if (A) {
      A.view = 'CONFIDENCE'; A.sel = null; A._paneForce = true;
      document.body.classList.add('navOpen');
      if (typeof render === 'function') render();
    }
  });

  window.addEventListener('resize', () => {
    const A = app();
    if (A && A.view === 'CONFIDENCE') schedulePaint();
  });


  ANGEL.provide('montecarlo', {
    run: (n, lever) => { if (n) MC.reps = n; if (lever) MC.lever = lever; return runHeadline(); },
    cancel: cancelRun,
    state: () => MC,
    stats: () => MC.stats,
    results: () => MC.results.slice(),
    pairedStats, tCrit, invNorm
  });
  ANGEL.mark('montecarlo ready', { workers: Math.max(1, (ANGEL.caps.cores || 2) - 1) });
  return true;
});
