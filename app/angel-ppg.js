/* =========================================================================
   ANGEL SWARM — THE PHOTOPLETHYSMOGRAM, DRAWN AT THE RATE IT IS PRODUCED
   -------------------------------------------------------------------------
   WHAT WAS WRONG. The Sensor & Model waveform was generated inside the
   design's own 120 ms React interval: seven samples pushed into component
   state per tick, and the whole trace re-rendered as an SVG path. Measured on
   this build that is 120.0 ms between repaints — 8.3 a second — over a signal
   produced at 7 samples / 0.12 s = 58 Hz, on an irregular grid at that (seven
   samples 17 ms apart, then an 18 ms gap, because the loop stepped
   i * 0.017 seven times inside a 0.12 step).

   So it was BOTH. The caption said 100 Hz over a signal that was never 100 Hz,
   repainted eight times a second in seven-sample jumps.

   WHAT THIS DOES INSTEAD. It renders the real thing. synth() in
   app/js/device.js is the generator the CRI-Net weights were trained against
   — the same physiology, at FS = 100 Hz — and it is loaded here rather than
   restated, so the trace on screen is produced the way the training data was.
   NOTHING IS INTERPOLATED AND NOTHING IS RESAMPLED. Every point drawn is a
   sample the generator produced.

   THE CLOCK IS A RATE, NOT A STEP. Exactly as app/angel-map.js's clock()
   servos a rate rather than seeking in steps, this advances a sample clock
   against performance.now() inside requestAnimationFrame: each frame emits
   floor(100 x elapsed) new samples, carries the remainder, and repaints. At
   60 fps that is one or two samples a frame and a repaint every ~16.7 ms; at
   30 fps it is three or four and a repaint every ~33 ms. The waveform runs at
   100 Hz either way. The frame rate decides how smooth the paint is, never
   how fast the signal runs.

   The window is 500 samples — 5.00 s at 100 Hz — which is the model's actual
   input tensor, float32 [1,1,500]. The old SVG held 200 points at ~58 Hz,
   which is 3.4 s, under a caption claiming a trailing 5 s window.

   WHY THIS IS A CLASSIC SCRIPT. The design's x-import loader fetches a module
   as text and evaluates it with new Function (support.js), so a top-level
   `import` or `await` is a syntax error there. Same shape as angel-map.js: an
   IIFE that publishes one global and defines one custom element. device.js is
   an ES module, so it is brought in with a dynamic import() — which is legal
   in a classic script — and the trace waits for it rather than standing in
   for it.

   Nothing here is fetched off-origin. Nothing here reaches the tasking path.

   UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY
   ========================================================================= */
(function () {
  'use strict';
  var W = window;

  /* device.js ends in ANGEL.ready('cri-net', ...), a registration with the
     shipped application's own boot. This canvas is not that application, so
     the registration is given somewhere harmless to land rather than the file
     being edited or its physiology copied. A real ANGEL is left alone. */
  if (typeof W.ANGEL === 'undefined') {
    W.ANGEL = { ready: function () {}, provide: function () {}, views: {} };
  }

  var FS = 100;              /* the sensor's sample rate, and the model's */
  var WIN = 500;             /* 5.00 s — the model's input window          */
  var SUBJECT_SEED = 42;     /* pinned: the seed the run itself is pinned to */

  var INSULT = { clean: null, motion: 'motion', lowperf: 'lowperf', noise: 'noise', dropout: 'dropout' };

  var DEV = null, loadErr = null;
  var subj = null, sst = null;
  var buf = new Float32Array(WIN), filled = 0, head = 0;
  var cri = 0.9, insult = null, token = '';
  var samples = 0, frames = 0;
  var raf = 0, prev = 0, acc = 0, frameMs = 0;
  var slot = null, cv = null, ctx = null, dpr = 1, cw = 0, ch = 0;

  import('./js/device.js').then(function (m) {
    DEV = m;
    subj = DEV.makeSubject(SUBJECT_SEED);
    sst = DEV.newState();
  }).catch(function (e) {
    loadErr = e && e.message ? e.message : String(e);
  });

  function reset() {
    if (!DEV) return;
    sst = DEV.newState();
    filled = 0; head = 0; acc = 0;
    buf.fill(0);
  }

  function push(out) {
    for (var i = 0; i < out.length; i++) {
      buf[head] = out[i];
      head = (head + 1) % WIN;
      if (filled < WIN) filled++;
    }
    samples += out.length;
  }

  function fit() {
    if (!slot || !cv) return;
    var r = slot.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    var d = Math.min(3, W.devicePixelRatio || 1);
    if (w === cw && h === ch && d === dpr) return;
    cw = w; ch = h; dpr = d;
    cv.width = Math.round(w * d); cv.height = Math.round(h * d);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    ctx = cv.getContext('2d');
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  function draw() {
    if (!ctx || !cw || !ch) return;
    ctx.fillStyle = 'oklch(0.13 0.014 300)';
    ctx.fillRect(0, 0, cw, ch);
    if (filled < 2) return;

    /* The baseline is the window's own mean, so optical drift does not walk
       the trace off the top of the box. The gain is FIXED, so a signal whose
       amplitude collapses — poor perfusion — is drawn small, because that is
       the thing worth seeing. */
    var mean = 0, i;
    for (i = 0; i < filled; i++) mean += buf[i];
    mean /= filled;
    var mid = ch * 0.60, gain = ch * 0.50;
    var start = (head - filled + WIN) % WIN;

    ctx.beginPath();
    for (i = 0; i < filled; i++) {
      var v = buf[(start + i) % WIN];
      var x = (i / (WIN - 1)) * cw;
      var y = Math.max(1, Math.min(ch - 1, mid - (v - mean) * gain));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'oklch(0.86 0.14 300)';
    ctx.lineWidth = 1.3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function tick(now) {
    raf = W.requestAnimationFrame(tick);
    if (!slot || !slot.isConnected || document.hidden) { prev = 0; return; }
    fit();
    if (!DEV) { draw(); return; }
    if (!prev) { prev = now; draw(); return; }
    var gap = now - prev;
    var dt = gap / 1000;
    prev = now;
    frameMs = frameMs ? frameMs * 0.85 + gap * 0.15 : gap;
    if (!(dt > 0)) return;
    /* A backgrounded tab is owed no backlog. Cap the catch-up at a quarter of
       a second and carry on from where the sensor is now. */
    if (dt > 0.25) dt = 0.25;
    acc += dt * FS;
    var n = Math.floor(acc);
    if (n > 0) { acc -= n; push(DEV.synth(subj, cri, n, sst, insult)); }
    frames++;
    draw();
  }

  if (!W.customElements.get('angel-ppg')) {
    W.customElements.define('angel-ppg', class extends HTMLElement {
      connectedCallback() {
        this.style.display = 'block';
        this.style.width = '100%';
        this.style.height = this.getAttribute('height') || '118px';
        if (!cv) { cv = document.createElement('canvas'); cv.style.display = 'block'; }
        this.appendChild(cv);
        slot = this;
        cw = 0; ch = 0; prev = 0;
        fit(); draw();
        if (!raf) raf = W.requestAnimationFrame(tick);
      }
      disconnectedCallback() {
        if (slot !== this) return;
        slot = null; prev = 0;
        /* Leave nothing turning over behind a destination nobody is looking
           at. The next connectedCallback starts the loop again. */
        if (raf) { W.cancelAnimationFrame(raf); raf = 0; }
      }
    });
  }

  W.ANGELPPG = {
    /* The design hands over the WITHHELD GROUND TRUTH and the signal-quality
       insult it is asking for, on every render — the same two things
       device.js's generator takes, because the waveform is what the network
       reads, not what the network said. Nothing is read back into the run. */
    set: function (o) {
      if (!o) return;
      if (typeof o.cri === 'number') cri = Math.max(0, Math.min(1, o.cri));
      insult = INSULT[o.qual] !== undefined ? INSULT[o.qual] : null;
      if (o.token != null && o.token !== token) { token = o.token; reset(); }
    },
    /* The generator's own instantaneous rate, off this subject's chronotropic
       response — not an arithmetic stand-in. */
    hr: function () { return sst && sst.hr ? Math.round(sst.hr) : null; },
    subject: function () {
      return subj ? { seed: SUBJECT_SEED, responder: subj.responder, hr0: Math.round(subj.hr0) } : null;
    },
    stats: function () {
      return {
        fs: FS, win: WIN, seconds: WIN / FS,
        samples: samples, frames: frames, frameMs: +frameMs.toFixed(2),
        ready: !!DEV, error: loadErr,
        up: !!(DEV && slot && slot.isConnected)
      };
    }
  };
})();
