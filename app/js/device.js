/* =========================================================================
   CRI-NET — the wearable, and the network that reads it.

   Everywhere else in this application, a casualty's compensatory reserve is
   a number the simulation knows. Here it is not. Here the simulation renders
   the casualty's photoplethysmogram — the optical pulse waveform a wrist
   sensor actually produces — and a convolutional network reads the reserve
   back out of that waveform, with no access to the underlying truth.

   That gap is the point. The tasking engine downstream consumes the
   network's estimate and the network's stated uncertainty, not the ground
   truth. When the sensor is on a casualty who is moving, or shut down
   peripherally, the estimate degrades and the network says so, and the
   tasking engine can decline to act on a reading it was told not to trust.

   The model is 104,162 parameters trained on a synthetic cohort of 240
   people and validated on 70 people it never saw. It runs on the CPU in
   under a millisecond. Nothing here talks to a network interface.
   ========================================================================= */

const ORT_PATH = 'vendor/ort/';
const FS = 100;           // sensor sample rate, Hz
const WIN = 500;          // 5 s inference window

/* ---------------------------------------------------------------- physiology
   A direct port of the generator the network was trained against. It lives
   here so the waveform on screen is produced the same way the training data
   was, which is what makes the demonstration a fair test rather than a
   rehearsal. */

function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rnd) {
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* One synthetic individual. Drawn once per casualty and held, because these
   are properties of the person rather than of the wound.

   THE CHRONOTROPIC TERM IS THE WHOLE ARGUMENT FOR READING THE WAVEFORM.
   14% of subjects here blunt or invert the heart-rate response to volume
   loss outright and a further 16% blunt it, so 30% of the population is
   poorly served by a monitor that watches pulse rate. That figure was
   uncited in this file until now, and it is close to the measured one:
   Victorino GP, Battistella FD, Wisner DH, J Am Coll Surg 2003;196(5):
   679-684 found 35% of hypotensive trauma patients aged 16-49 — the
   military age band — were NOT tachycardic. The 30% modelled here is
   conservative against that. */
export function makeSubject(seed) {
  const r = mulberry(seed);
  const u = (a, b) => a + r() * (b - a);
  const k = r();
  const hrGain = k < 0.14 ? u(-8, 8) : (k < 0.30 ? u(12, 30) : u(45, 80));
  return {
    hr0: u(52, 88), hrGain,
    tone0: u(0.34, 0.62), toneGain: u(0.18, 0.42),
    notch0: u(0.30, 0.42), width0: u(0.20, 0.30),
    amp0: u(0.75, 1.0), resp0: u(0.14, 0.28), dpopGain: u(0.16, 0.40),
    skin: u(0.55, 1.0), drift: u(0.004, 0.020),
    responder: k < 0.14 ? 'non-responder' : (k < 0.30 ? 'blunted' : 'normal'),
    _r: r
  };
}

function pulse(phase, tone, notchAt, width) {
  const sys = Math.exp(-0.5 * Math.pow((phase - 0.16) / width, 2));
  const ref = tone * Math.exp(-0.5 * Math.pow((phase - notchAt) / (width * 1.35), 2));
  const tail = 0.16 * Math.exp(-3.2 * Math.max(0, phase - 0.45));
  return sys + ref + tail;
}

/* Render `n` samples of this subject's waveform at compensatory reserve
   `cri`, continuing from `state` so the trace is continuous across calls. */
export function synth(subj, cri, n, state, insult) {
  const r = subj._r;
  const loss = 1 - cri;
  let hr = subj.hr0 + subj.hrGain * Math.pow(loss, 1.25) + gauss(r) * 1.6;
  hr = Math.min(190, Math.max(38, hr));
  const tone = subj.tone0 + subj.toneGain * loss;
  const notchAt = subj.notch0 + 0.055 * loss;
  const width = subj.width0 * (1 - 0.24 * loss);
  let amp = subj.amp0 * (1 - 0.62 * loss) * subj.skin;
  const dpop = 0.05 + subj.dpopGain * loss;
  let noise = 0.006 / Math.max(subj.skin, 0.3);

  if (insult === 'lowperf') { amp *= 0.18; noise *= 3; }
  else if (insult === 'noise') { noise *= 7; }

  const out = new Float32Array(n);
  const hrv = Math.max(0.004, 0.030 * (1 - 0.55 * loss));

  for (let i = 0; i < n; i++) {
    // Advance through the cardiac cycle; draw a fresh interval each beat.
    if (state.phase >= 1) {
      state.phase -= 1;
      state.interval = Math.min(1.6, Math.max(0.28, 60 / hr + gauss(r) * hrv));
    }
    const t = state.t;
    const resp = 1 + dpop * Math.sin(2 * Math.PI * subj.resp0 * t + state.respPhase);
    let v = pulse(state.phase, tone, notchAt, width) * amp * resp;
    v += subj.drift * Math.sin(2 * Math.PI * subj.resp0 * t + 1.1);
    v += gauss(r) * noise;

    if (insult === 'motion') {
      state.walk += gauss(r) * 0.05;
      state.walk *= 0.995;
      v += state.walk;
    } else { state.walk *= 0.9; }

    if (insult === 'dropout') v = gauss(r) * 0.02;

    out[i] = Math.round(v * 4096) / 4096;   // 12-bit converter
    state.t += 1 / FS;
    state.phase += 1 / (state.interval * FS);
  }
  state.hr = hr;
  return out;
}

export function newState() {
  return { t: 0, phase: 0, interval: 0.9, respPhase: Math.random() * 6.28, walk: 0, hr: 70 };
}

/* The network never sees absolute optical level — it cannot, because that
   depends on skin tone, sensor pressure and site, none of which say anything
   about blood volume. Standardising here is what forces it onto morphology. */
function standardise(buf) {
  let m = 0;
  for (let i = 0; i < buf.length; i++) m += buf[i];
  m /= buf.length;
  let s = 0;
  for (let i = 0; i < buf.length; i++) { const d = buf[i] - m; s += d * d; }
  s = Math.sqrt(s / buf.length) + 1e-6;
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = (buf[i] - m) / s;
  return out;
}

/* ------------------------------------------------------------------ engine */

class CRINet {
  constructor() {
    this.session = null;
    this.meta = null;
    this.ort = null;
    this.lat = [];          // rolling inference latencies, ms
    this.count = 0;
  }

  async load() {
    const ort = this.ort = await import(ANGEL.asset(ORT_PATH + 'ort.wasm.bundle.min.mjs'));
    // Absolute path: wasmPaths resolves against the module URL, not the page,
    // and getting this wrong produces a 404 and an unhelpful "no available
    // backend" error.
    ort.env.wasm.wasmPaths = ANGEL.asset(ORT_PATH);
    ort.env.wasm.numThreads = 1;   // measured: threads gain nothing at this size
    ort.env.logLevel = 'error';

    const t0 = performance.now();
    this.session = await ort.InferenceSession.create(
      ANGEL.asset('models/ppg_cri.onnx'), { executionProviders: ['wasm'] });
    this.loadMs = performance.now() - t0;
    this.meta = await ANGEL.fetchJSON('models/ppg_cri.meta.json');
    ANGEL.mark('cri-net loaded', { ms: Math.round(this.loadMs) });
    return this;
  }

  /* One inference. Returns the estimate, the standard deviation the network
     predicts for its own estimate, and how long it took. */
  async read(window500) {
    const x = standardise(window500);
    const t = new this.ort.Tensor('float32', x, [1, 1, WIN]);
    const t0 = performance.now();
    const out = await this.session.run({ ppg: t });
    const ms = performance.now() - t0;
    this.lat.push(ms); if (this.lat.length > 400) this.lat.shift();
    this.count++;
    const cri = out.cri.data[0];
    const sd = Math.exp(0.5 * out.logvar.data[0]);
    return { cri, sd, ms, lo: Math.max(0, cri - 1.96 * sd), hi: Math.min(1, cri + 1.96 * sd) };
  }

  percentile(p) {
    if (!this.lat.length) return 0;
    const s = this.lat.slice().sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(s.length * p))];
  }
}

/* --------------------------------------------------------------------- UI */

const C = {
  ink: '#e6eef8', dim: '#8ea3ba', faint: '#4d5f74',
  trace: '#5bb4ff', good: '#31d68a', warn: '#ffb340', bad: '#ff4257', grid: '#16202c'
};

function band(cri) {
  if (cri >= 0.60) return { label: 'COMPENSATING', color: C.good };
  if (cri >= 0.30) return { label: 'MARGINAL', color: C.warn };
  return { label: 'DECOMPENSATING', color: C.bad };
}

/* A live monitor: scrolling waveform on top, estimate with its uncertainty
   band below. The uncertainty is drawn, not printed, because the width of
   that band is the thing an operator needs to read at a glance. */
export class Monitor {
  constructor(canvas, net) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.net = net;
    this.ring = new Float32Array(WIN * 3);
    this.w = 0;
    this.hist = [];         // {t, cri, lo, hi, truth}
    this.state = newState();
    this.subject = makeSubject(20260814);
    this.truth = 0.92;
    this.insult = null;
    this.last = null;
    this.running = false;
    this._acc = 0;
  }

  setSubject(seed) { this.subject = makeSubject(seed); this.state = newState(); }
  setTruth(v) { this.truth = Math.max(0, Math.min(1, v)); }
  setInsult(k) { this.insult = k; }

  start() {
    if (this.running) return;
    this.running = true;
    this.tPrev = performance.now();
    const loop = async (now) => {
      if (!this.running) return;
      const dt = Math.min(0.25, (now - this.tPrev) / 1000);
      this.tPrev = now;

      // Generate the samples that elapsed, at the sensor's real rate.
      const n = Math.max(1, Math.round(dt * FS));
      const chunk = synth(this.subject, this.truth, n, this.state, this.insult);
      for (let i = 0; i < n; i++) {
        this.ring[this.w % this.ring.length] = chunk[i];
        this.w++;
      }

      // The device reports once a second over the trailing five seconds,
      // which is what the fielded analogue does.
      this._acc += dt;
      if (this._acc >= 1.0 && this.w >= WIN && this.net.session) {
        this._acc = 0;
        const win = new Float32Array(WIN);
        for (let i = 0; i < WIN; i++) win[i] = this.ring[(this.w - WIN + i) % this.ring.length];
        try {
          const r = await this.net.read(win);
          r.truth = this.truth;
          r.hr = this.state.hr;
          this.last = r;
          this.hist.push(r);
          if (this.hist.length > 180) this.hist.shift();
          ANGEL.emit('cri', r);
        } catch (e) { /* keep drawing */ }
      }

      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() { this.running = false; }

  draw() {
    const cv = this.cv, ctx = this.ctx;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== W * dpr || cv.height !== H * dpr) {
      cv.width = W * dpr; cv.height = H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const traceH = Math.round(H * 0.52);
    const gap = 14;

    // ---- waveform
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const y = Math.round(i * traceH / 4) + 0.5;
      ctx.moveTo(0, y); ctx.lineTo(W, y);
    }
    ctx.stroke();

    const n = Math.min(this.w, WIN * 2);
    if (n > 2) {
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < n; i++) {
        const v = this.ring[(this.w - n + i) % this.ring.length];
        if (v < lo) lo = v; if (v > hi) hi = v;
      }
      const span = Math.max(1e-3, hi - lo);
      ctx.strokeStyle = this.insult ? C.warn : C.trace;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const v = this.ring[(this.w - n + i) % this.ring.length];
        const x = i / (n - 1) * W;
        const y = traceH - 8 - ((v - lo) / span) * (traceH - 20);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = C.faint;
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillText('PPG  ' + FS + ' Hz  ·  wrist', 6, 13);
    if (this.insult) {
      ctx.fillStyle = C.warn;
      ctx.fillText(({ motion: 'MOTION ARTEFACT', lowperf: 'POOR PERFUSION',
        dropout: 'SENSOR OFF SKIN', noise: 'ELECTRICAL NOISE' })[this.insult], 6, 27);
    }

    // ---- estimate history with uncertainty band
    const y0 = traceH + gap, hh = H - y0 - 2;
    if (hh > 20 && this.hist.length > 1) {
      const m = this.hist.length;
      const X = i => i / Math.max(1, m - 1) * W;
      const Y = v => y0 + (1 - v) * hh;

      // 95% interval as a filled ribbon — the width IS the message.
      ctx.beginPath();
      for (let i = 0; i < m; i++) ctx.lineTo(X(i), Y(this.hist[i].hi));
      for (let i = m - 1; i >= 0; i--) ctx.lineTo(X(i), Y(this.hist[i].lo));
      ctx.closePath();
      ctx.fillStyle = 'rgba(91,180,255,0.16)';
      ctx.fill();

      // Ground truth the network is not allowed to see.
      ctx.strokeStyle = 'rgba(230,238,248,0.30)';
      ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < m; i++) ctx.lineTo(X(i), Y(this.hist[i].truth));
      ctx.stroke(); ctx.setLineDash([]);

      // The estimate.
      ctx.strokeStyle = C.trace; ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < m; i++) ctx.lineTo(X(i), Y(this.hist[i].cri));
      ctx.stroke();

      // Decompensation threshold.
      ctx.strokeStyle = 'rgba(255,66,87,0.45)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(0, Y(0.30)); ctx.lineTo(W, Y(0.30)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,66,87,0.75)';
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillText('0.30', W - 26, Y(0.30) - 3);

      ctx.fillStyle = C.faint;
      ctx.fillText('CRI ESTIMATE  ·  shaded = 95% interval  ·  dashed = truth (withheld from model)', 6, y0 + 11);
    }
  }
}

/* ------------------------------------------------------------------- view */

const SCENARIOS = [
  { k: 'stable', label: 'Stable', note: 'No haemorrhage. Reserve intact.', from: 0.93, to: 0.90 },
  { k: 'slow', label: 'Slow bleed', note: 'Reserve falling over minutes. The window the Golden Hour misses.', from: 0.88, to: 0.22 },
  { k: 'fast', label: 'Arterial bleed', note: 'Reserve collapsing. Minutes, not an hour.', from: 0.80, to: 0.05 },
  { k: 'treated', label: 'Blood given at T+6', note: 'Reserve recovering after transfusion.', from: 0.30, to: 0.78 }
];

const INSULTS = [
  { k: null, label: 'Clean signal' },
  { k: 'motion', label: 'Casualty moving' },
  { k: 'lowperf', label: 'Poor perfusion' },
  { k: 'noise', label: 'Electrical noise' },
  { k: 'dropout', label: 'Sensor off skin' }
];

let VIEW = null;

/* The provenance mark. js/app.js owns the component, the four-model registry
   and the hover panel behind it, and declares `prov()` at the top level of a
   classic script — so it is on the global object by the time any module
   function runs. Guarded anyway: this pane must render if the host bundle is
   ever loaded without it, badge or no badge. See app.js § PROVENANCE MARKS.

   Everything on this pane is CRI-Net, which is why the marks here are not
   decoration: the pane exists to be the evidence for one claim, and the mark
   is what ties the claim to the model. */
const mark = (k, d) => (typeof window.prov === 'function' ? window.prov(k, d) : '');

function fmt(v, d) { return (v == null || !isFinite(v)) ? '—' : v.toFixed(d == null ? 3 : d); }

function renderSensor() {
  const host = document.getElementById('sensorBody');
  if (!host) return;
  const net = ANGEL.get('cri-net');

  if (!net) {
    const st = ANGEL.status.get('cri-net');
    host.innerHTML = '<div class="card"><div class="cardHead">Model unavailable</div>' +
      '<p class="lede">The compensatory-reserve network did not load' +
      (st && st.note ? ': <code>' + st.note + '</code>' : '.') +
      ' Everything else on this page continues to work. Nothing here was going to reach the ' +
      'network — the model is a file in this folder — so this is a local fault, not a connectivity one.</p></div>';
    return;
  }

  if (VIEW && host.querySelector('#criCanvas')) { paintReadout(); return; }

  const m = net.meta || {};
  const q = m.metrics || {};

  host.innerHTML = `
    <div class="senseGrid">
      <div class="card senseLive">
        <div class="cardHead">Live sensor ${mark('CRI', 'the trace under this waveform is the network\u2019s output, one inference a second')}</div>
        <canvas id="criCanvas" class="criCanvas"></canvas>
        <div class="senseCtl">
          <div class="senseRow"><label>Casualty state</label>
            <div class="seg small" id="criScn">${SCENARIOS.map((s, i) =>
              `<span class="chip${i === 1 ? ' on' : ''}" data-scn="${s.k}">${s.label}</span>`).join('')}</div>
          </div>
          <div class="senseRow"><label>Signal quality</label>
            <div class="seg small" id="criIns">${INSULTS.map((s, i) =>
              `<span class="chip${i === 0 ? ' on' : ''}" data-ins="${s.k || ''}">${s.label}</span>`).join('')}</div>
          </div>
          <p class="senseNote" id="criNote"></p>
        </div>
      </div>

      <div class="card senseRead">
        <div class="cardHead">What the model reports ${mark('CRI')}</div>
        <div class="criBig"><b id="criVal">—</b><span id="criBand">—</span></div>
        <div class="criInt">95% interval <b id="criCI">—</b></div>
        <div class="criTruth">Ground truth, withheld from the model <b id="criTruth">—</b>
          <em id="criErr"></em></div>
        <div class="senseStats">
          <div><b id="criHR">—</b><span>heart rate</span></div>
          <div><b id="criLat">—</b><span>inference p50</span></div>
          <div><b id="criN">0</b><span>inferences</span></div>
        </div>
        <div class="senseTrust" id="criTrust"></div>
      </div>

      <div class="card senseCard">
        <div class="cardHead">The model ${mark('CRI')}</div>
        <details class="disc"><summary><b>CRI-Net</b><b class="q">${(m.parameters || 0).toLocaleString()} parameters &middot; ${((m.onnx_bytes || 0) / 1024).toFixed(0)} KB ONNX, CPU only</b></summary>
        <table class="kv">
          <tr><td>Architecture</td><td>1-D convolutional network, 5 blocks</td></tr>
          <tr><td>Parameters</td><td>${(m.parameters || 0).toLocaleString()}</td></tr>
          <tr><td>File</td><td>${((m.onnx_bytes || 0) / 1024).toFixed(0)} KB ONNX, opset ${m.opset || '—'}</td></tr>
          <tr><td>Input</td><td>5 s of photoplethysmogram at 100 Hz</td></tr>
          <tr><td>Output</td><td>reserve estimate <b>and its variance</b></td></tr>
          <tr><td>Runs on</td><td>CPU. No GPU required.</td></tr>
        </table>
        <p class="senseProv">${m.provenance || ''}</p>
        </details>
      </div>

      <div class="card senseCard">
        <div class="cardHead">Held-out performance ${mark('CRI')}</div>
        <p class="lede">Validated on ${m.heldout ? m.heldout.subjects : 70} people who appear in
           no training window. Split by person, not by sample.</p>
        <details class="disc"><summary><b>${fmt(q.mae)} CRI</b><b class="q">mean absolute error, against ${fmt(q.mae_heart_rate_only)} from pulse rate alone</b></summary>
        <table class="kv">
          <tr><td>Mean absolute error</td><td><b>${fmt(q.mae)}</b> CRI</td></tr>
          <tr><td>&nbsp;&nbsp;clean signal</td><td>${fmt(q.mae_clean)}</td></tr>
          <tr><td>&nbsp;&nbsp;degraded signal</td><td>${fmt(q.mae_degraded)}</td></tr>
          <tr class="kvHi"><td>Heart rate alone</td><td><b>${fmt(q.mae_heart_rate_only)}</b></td></tr>
          <tr><td>Most-confident half</td><td>${fmt(q.mae_most_confident_half)}</td></tr>
          <tr><td>95% interval coverage</td><td>${((q.coverage_95 || 0) * 100).toFixed(1)}%</td></tr>
          <tr><td>Alarm at CRI&lt;0.30</td><td>${((q.alarm_sensitivity_cri_lt_030 || 0) * 100).toFixed(0)}% sensitivity</td></tr>
        </table>
        </details>
        <div class="cardHead" style="margin-top:2px">Does the uncertainty earn its keep? ${mark('TRUST')}</div>
        <details class="disc"><summary><b>${fmt(m.trust && m.trust.mae_when_actionable)} vs ${fmt(m.trust && m.trust.mae_when_refused)}</b><b class="q">error when it says act, against error when it refuses</b></summary>
        <table class="kv">
          <tr><td>Error when the model says <b>act</b></td><td><b>${fmt(m.trust && m.trust.mae_when_actionable)}</b></td></tr>
          <tr class="kvHi"><td>Error when it says <b>do not</b></td><td><b>${fmt(m.trust && m.trust.mae_when_refused)}</b></td></tr>
          <tr><td>Clean signal refused</td><td>${m.trust ? (m.trust.clean.share_refuse * 100).toFixed(0) : '—'}%</td></tr>
          <tr><td>Degraded signal refused</td><td>${m.trust ? (m.trust.degraded.share_refuse * 100).toFixed(0) : '—'}%</td></tr>
        </table>
        <p class="senseProv"><b>Why that fourth row matters.</b> Roughly one casualty in seven never
          mounts the tachycardia everyone looks for — beta blockade, high vagal tone, or the paradoxical
          bradycardia of severe haemorrhage. Pulse rate alone is more than twice as wrong as the waveform.
          That is the whole reason the fielded device reads the waveform instead of counting beats.</p>
        </details>
      </div>
    </div>`;

  const cv = host.querySelector('#criCanvas');
  const mon = new Monitor(cv, net);
  VIEW = { mon, scn: SCENARIOS[1], t0: performance.now() };
  mon.setTruth(VIEW.scn.from);
  mon.start();

  host.querySelector('#criScn').addEventListener('click', e => {
    const c = e.target.closest('[data-scn]'); if (!c) return;
    host.querySelectorAll('#criScn .chip').forEach(x => x.classList.remove('on'));
    c.classList.add('on');
    VIEW.scn = SCENARIOS.find(s => s.k === c.dataset.scn);
    VIEW.t0 = performance.now();
    mon.hist.length = 0;
  });
  host.querySelector('#criIns').addEventListener('click', e => {
    const c = e.target.closest('[data-ins]'); if (!c) return;
    host.querySelectorAll('#criIns .chip').forEach(x => x.classList.remove('on'));
    c.classList.add('on');
    mon.setInsult(c.dataset.ins || null);
  });

  paintReadout();
}

/* Drive the casualty's true reserve along the selected trajectory and paint
   the numbers. The trajectory is the simulation's business; the network sees
   only what the sensor produces. */
function paintReadout() {
  if (!VIEW) return;
  const { mon, scn } = VIEW;
  const el = id => document.getElementById(id);

  const u = Math.min(1, (performance.now() - VIEW.t0) / 45000);
  mon.setTruth(scn.from + (scn.to - scn.from) * u);

  const nEl = el('criNote');
  if (nEl) nEl.textContent = scn.note;

  const r = mon.last;
  if (!r) return;
  const b = band(r.cri);
  const v = el('criVal'); if (v) { v.textContent = r.cri.toFixed(2); v.style.color = b.color; }
  const bd = el('criBand'); if (bd) { bd.textContent = b.label; bd.style.color = b.color; }
  const ci = el('criCI'); if (ci) ci.textContent = r.lo.toFixed(2) + ' – ' + r.hi.toFixed(2);
  const tr = el('criTruth'); if (tr) tr.textContent = r.truth.toFixed(2);
  const er = el('criErr');
  if (er) {
    const e = Math.abs(r.cri - r.truth);
    er.textContent = '· off by ' + e.toFixed(2);
    er.style.color = e <= 1.96 * r.sd ? 'var(--dim)' : 'var(--warn, #ffb340)';
  }
  const hr = el('criHR'); if (hr) hr.textContent = Math.round(r.hr) + ' bpm';
  const la = el('criLat'); if (la) la.textContent = mon.net.percentile(0.5).toFixed(2) + ' ms';
  const nn = el('criN'); if (nn) nn.textContent = mon.net.count.toLocaleString();

  /* The trust line. This is the part that matters operationally: a wide
     interval is not a defect, it is the system refusing to pretend. */
  const t = el('criTrust');
  if (t) {
    const g = trustGate(mon.net, r);
    t.className = 'senseTrust ' + g.k;
    /* This line is repainted four times a second, and rebuilding the badge
       with it would throw away the element the hover panel is anchored to
       mid-hover. The mark is written once, into its own child, and only the
       sentence beside it is touched afterwards. */
    if (!t.firstChild || t.dataset.marked !== '1') {
      t.innerHTML = mark('TRUST') + '<span class="senseTrustTx"></span>';
      t.dataset.marked = '1';
    }
    const tx = t.querySelector('.senseTrustTx');
    if (tx) tx.textContent = g.text;
  }
}

/* The boundary between "act on this" and "do not" is not a taste judgement.
   It is measured — see train/calibrate.py — as the 75th and 97th percentile
   of the interval width the model produces on signal that is genuinely
   clean. Readings inside the first boundary carry a mean absolute error of
   0.063; readings past the second carry 0.115. The gate is worth having
   because those two numbers differ. */
export function trustGate(net, r) {
  const cal = (net.meta && net.meta.trust) || { act_below: 0.47, refuse_above: 0.59 };
  const w = r.hi - r.lo;
  if (w < cal.act_below) {
    return { k: 'ok', act: true,
      text: 'Interval inside the actionable band. Tasking may commit on this reading.' };
  }
  if (w < cal.refuse_above) {
    return { k: 'warn', act: true,
      text: 'Interval wider than three quarters of clean readings. Tasking holds this ' +
            'casualty at a lower confidence and prefers corroboration.' };
  }
  return { k: 'bad', act: false,
    text: 'Wider than 97% of clean readings. The model is telling you not to use this. ' +
          'Tasking will not commit an aircraft on it alone.' };
}

/* ---------------------------------------------------------------- bootstrap */

ANGEL.ready('cri-net', async () => {
  const net = new CRINet();
  await net.load();
  ANGEL.provide('cri-net', net);
  ANGEL.provide('cri-api', { CRINet, Monitor, makeSubject, synth, newState, band, FS, WIN });
  ANGEL.views = ANGEL.views || {};
  ANGEL.views.SENSOR = renderSensor;
  // The application only repaints a pane on its own cadence; the live numbers
  // need to move between those repaints.
  //
  // The class to test is `active`, not `on`. The shell marks the visible
  // section with `.viewport.active` (see `#views .viewport{display:none}` /
  // `.viewport.active{display:block}` in css/app.css); `on` is the rail's
  // idiom for the highlighted nav item and never lands on a pane. Tested
  // against the wrong class this interval fired the guard 4× a second and
  // never repainted, so the waveform froze the moment the pane rendered.
  setInterval(() => {
    const pane = document.querySelector('[data-pane="SENSOR"]');
    if (pane && pane.classList.contains('active')) paintReadout();
  }, 250);
  return net;
});
