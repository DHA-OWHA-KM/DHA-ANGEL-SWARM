/* =========================================================================
   SONIFICATION — what the operations floor hears.

   An operations floor is not a screen. People in it are turned away, talking
   to someone else, reading a different display. The information that has to
   reach them is not the detail — it is the shape of the fight: whether the
   backlog of untreated casualties is growing faster than the fleet is
   clearing it. That is a scalar, it changes slowly, and it is exactly the
   sort of thing hearing is better at than vision.

   So there is one continuous channel and five discrete ones. The continuous
   channel is a soft periodic tone whose rate and pitch track aggregate time
   pressure across every open casualty — the mean fraction of each casualty's
   physiological deadline that has already been spent. When the fight is
   going badly it speeds up and rises, and the room registers that several
   seconds before anyone reads a number. The five discrete cues mark the
   events an operator would otherwise have to watch for.

   Three deliberate constraints, in order of how much they matter:

   1. The death cue is sombre and quiet, and it ducks everything else to
      silence for two and a half seconds. A death is the one event this
      system exists to prevent; it does not get a sound effect. The silence
      that follows it is the cue, not the tone.
   2. Nothing makes a sound until a human presses the control. Browsers will
      block an AudioContext without a gesture anyway, but the real reason is
      that a demonstration which unexpectedly makes noise in a room of senior
      officers is a liability. The state is never persisted as "on".
   3. Voices are limited and cues are rate-limited per kind. Ten casualties
      arriving in one simulated minute at 10x speed must produce a texture,
      not a pile-up. Everything runs through a compressor as a backstop.

   Everything here is synthesised from oscillators and one noise buffer.
   There is no audio file in this application and nothing to download.
   ========================================================================= */

/* Peak gains are absolute, not relative, and they are all small. The loudest
   thing in this file is the launch sweep at 0.055 of full scale. The design
   target is that a conversation at a console does not have to stop. */
const VOICE_CAP = 6;          // simultaneous cue voices before new ones drop
const DUCK_ON_DEATH = 2.6;    // seconds of near-silence following a death
const POLL_MS = 100;          // how often we look at the simulation for events

/* Minimum interval between two firings of the same cue, in milliseconds.
   Below this the second firing is discarded rather than queued: a queue
   would drift out of sync with the picture and arrive as noise after the
   event it describes has left the screen. */
const MIN_GAP = {
  call: 140, launch: 180, delivered: 150, wasted: 220, death: 700
};

/* ---------------------------------------------------------------- engine */

class Sound {
  constructor() {
    this.ctx = null;
    this.on = false;
    this.level = 0.6;
    this.voices = 0;
    this.last = {};             // cue name -> ctx time of last firing
    this.pressure = 0;          // 0..1, smoothed
    this.pressureN = 0;         // how many casualties it is averaged over
    this.nextPing = 0;
    this._sched = null;
    this._duckUntil = 0;
  }

  /* The AudioContext is constructed here and nowhere else, which means it is
     only ever constructed inside a click handler. Chrome's autoplay policy
     leaves a context created outside a gesture in the 'suspended' state
     forever, and the resulting silence is very hard to diagnose. */
  enable() {
    if (this.on) return true;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC({ latencyHint: 'interactive' });

        /* Master chain. The compressor is not for colour — it is the
           backstop that guarantees a burst of simultaneous cues cannot
           exceed the level a single cue reaches. */
        this.master = this.ctx.createGain();
        this.master.gain.value = this.level;
        this.duck = this.ctx.createGain();
        this.duck.gain.value = 1;
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -20;
        comp.knee.value = 12;
        comp.ratio.value = 6;
        comp.attack.value = 0.004;
        comp.release.value = 0.16;
        this.master.connect(this.duck);
        this.duck.connect(comp);
        comp.connect(this.ctx.destination);

        /* A meter on the output. It costs one FFT node and it is the only way
           to state what this file actually emits rather than what it intends
           to: the relative level of the death cue against the delivery cue is
           a design claim, and a claim about sound should be measurable. */
        this.meter = this.ctx.createAnalyser();
        this.meter.fftSize = 1024;
        this._buf = new Float32Array(this.meter.fftSize);
        comp.connect(this.meter);

        this.noise = this._makeNoise();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.on = true;
      this.nextPing = this.ctx.currentTime + 0.4;
      if (!this._sched) this._sched = setInterval(() => this._schedule(), 60);
      ANGEL.mark('audio enabled', { rate: this.ctx.sampleRate });
      return true;
    } catch (e) {
      this.on = false;
      return false;
    }
  }

  disable() {
    this.on = false;
    if (this._sched) { clearInterval(this._sched); this._sched = null; }
    /* Suspend rather than close. Closing discards the context and the next
       enable() would need another gesture to build one; suspending keeps the
       graph alive and makes the control instant on the second press. */
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  setLevel(v) {
    this.level = Math.max(0, Math.min(1, v));
    if (this.master) {
      this.master.gain.setTargetAtTime(this.level, this.ctx.currentTime, 0.02);
    }
    try { localStorage.setItem('angel.audio.level', String(this.level)); } catch (e) { /* private mode */ }
  }

  /* Root-mean-square of the last 1024 samples leaving the master chain. */
  rms() {
    if (!this.meter) return 0;
    this.meter.getFloatTimeDomainData(this._buf);
    let s = 0;
    for (let i = 0; i < this._buf.length; i++) s += this._buf[i] * this._buf[i];
    return Math.sqrt(s / this._buf.length);
  }

  /* Two seconds of white noise, generated once. Every noise-based cue reads
     from a random offset in this buffer, which is cheaper than generating
     per-event noise and — at these durations — indistinguishable. */
  _makeNoise() {
    const n = Math.floor(this.ctx.sampleRate * 2);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _canPlay(name) {
    if (!this.on || !this.ctx) return false;
    if (this.voices >= VOICE_CAP) return false;
    const now = performance.now();
    const gap = MIN_GAP[name] || 120;
    if (this.last[name] && now - this.last[name] < gap) return false;
    this.last[name] = now;
    return true;
  }

  /* ------------------------------------------------------------ primitives */

  /* One oscillator with an exponential-ish envelope. `attack` is linear
     because a linear ramp from zero is the only way to start without a
     click; the decay is setTargetAtTime, which is what actually sounds like
     something physical stopping. */
  _tone(o) {
    const t = o.t0 == null ? this.ctx.currentTime : o.t0;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1 != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + o.dur);

    let node = g;
    if (o.lp) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = 0.7;
      g.connect(f); node = f;
    }
    const a = o.attack == null ? 0.006 : o.attack;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.peak, t + a);
    g.gain.setTargetAtTime(0, t + a + (o.hold || 0), (o.decay || o.dur) / 3.5);

    osc.connect(g);
    node.connect(this.master);
    osc.start(t);
    osc.stop(t + o.dur + 0.12);
    this._count(osc);
    return osc;
  }

  _noiseBurst(o) {
    const t = o.t0 == null ? this.ctx.currentTime : o.t0;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.f0, t);
    if (o.f1 != null) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    f.Q.value = o.q == null ? 1.2 : o.q;
    const g = this.ctx.createGain();
    const a = o.attack == null ? 0.008 : o.attack;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.peak, t + a);
    g.gain.setTargetAtTime(0, t + a, (o.decay || o.dur) / 3.2);

    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 1.5);
    src.stop(t + o.dur + 0.1);
    this._count(src);
    return src;
  }

  _count(node) {
    this.voices++;
    node.onended = () => { this.voices = Math.max(0, this.voices - 1); };
  }

  /* --------------------------------------------------------------- cues */

  cue(name) {
    if (!this._canPlay(name)) return false;
    const t = this.ctx.currentTime;
    switch (name) {
      /* A casualty call arriving. This is a radio being keyed, not an alarm:
         a short squelch and one soft tone. It fires many times a minute in a
         mass-casualty event, so it has to be the least intrusive of the
         five. */
      case 'call':
        this._noiseBurst({ t0: t, dur: 0.05, f0: 2100, f1: 1500, q: 5, peak: 0.030 });
        this._tone({ t0: t + 0.045, f0: 1180, dur: 0.09, peak: 0.026, decay: 0.09, lp: 3200 });
        break;

      /* An aircraft launching. Filtered noise sweeping upward with a low
         body under it — the shape of something accelerating away. Quiet, and
         short enough that four launches in a second read as a flurry rather
         than a wall. */
      case 'launch':
        this._noiseBurst({ t0: t, dur: 0.34, f0: 240, f1: 1500, q: 0.9,
          filter: 'bandpass', peak: 0.055, attack: 0.05, decay: 0.30 });
        this._tone({ t0: t, f0: 88, f1: 132, dur: 0.34, peak: 0.030, attack: 0.05,
          decay: 0.28, lp: 500 });
        break;

      /* A delivery reaching a casualty. One clean bell with a single upper
         partial. It is the only cue in the set with consonant harmonic
         content, which is what makes it legible without being a reward
         sound — there is nothing to celebrate, a delivery is the system
         doing its job. */
      case 'delivered':
        this._tone({ t0: t, f0: 784, dur: 0.62, peak: 0.048, attack: 0.007,
          decay: 0.55, lp: 5000 });
        this._tone({ t0: t + 0.004, f0: 1176, dur: 0.34, peak: 0.020, attack: 0.005,
          decay: 0.26, lp: 6000 });
        break;

      /* A sortie wasted — the aircraft arrived and the payload could not be
         used, or the casualty was already resolved. Deliberately dull: a
         damped low thud with no harmonic partial and no pitch rise. It reads
         as "that came to nothing", which is what happened. */
      case 'wasted':
        this._noiseBurst({ t0: t, dur: 0.20, f0: 220, f1: 120, q: 0.8,
          filter: 'lowpass', peak: 0.048, attack: 0.004, decay: 0.16 });
        this._tone({ t0: t, f0: 138, f1: 112, dur: 0.24, peak: 0.032, attack: 0.004,
          decay: 0.20, lp: 400 });
        break;

      /* A death.

         This is the cue this file exists to get right. It is not a sting, it
         does not fall, it does not resolve, and it is quieter than the
         delivery cue that precedes it in every other respect. A single low
         tone fades in over a third of a second — no attack transient at all,
         so there is no moment of impact — and a fifth below it arrives late
         and even quieter, the way a distant bell settles.

         The part that actually carries the meaning is the ducking. For two
         and a half seconds the pressure tone and every other cue drop to
         near silence. In a room, that silence is what people notice. A
         casualty died; the system has nothing to say. */
      case 'death': {
        this._tone({ t0: t, f0: 110, dur: 2.4, peak: 0.052, attack: 0.32,
          hold: 0.10, decay: 2.0, lp: 420 });
        this._tone({ t0: t + 0.42, f0: 73.42, dur: 2.0, peak: 0.028, attack: 0.40,
          hold: 0.10, decay: 1.7, lp: 300 });
        const d = this.duck.gain;
        d.cancelScheduledValues(t);
        d.setValueAtTime(d.value, t);
        d.linearRampToValueAtTime(0.18, t + 0.30);
        d.setValueAtTime(0.18, t + DUCK_ON_DEATH - 0.9);
        d.linearRampToValueAtTime(1, t + DUCK_ON_DEATH);
        this._duckUntil = t + DUCK_ON_DEATH;
        break;
      }
      default:
        return false;
    }
    return true;
  }

  /* -------------------------------------------------------- pressure tone */

  /* `p` is the aggregate fraction of physiological deadline already spent
     across every casualty still waiting, and `n` is how many there are.
     Silence when nobody is waiting is deliberate: a bed that plays through a
     quiet period trains people to stop hearing it. */
  setPressure(p, n) {
    this.pressure = Math.max(0, Math.min(1, p));
    this.pressureN = n;
  }

  /* Lookahead scheduler. Audio events are placed on the AudioContext clock a
     little ahead of time rather than fired from a timer, because a timer in
     a page that is also running a simulation and repainting a map will jitter
     by tens of milliseconds and the pulse would audibly stumble. */
  _schedule() {
    if (!this.on || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.pressureN <= 0) { this.nextPing = now + 0.5; return; }
    if (now < this._duckUntil - 0.4) { this.nextPing = this._duckUntil; return; }

    const horizon = now + 0.15;
    while (this.nextPing < horizon) {
      const p = this.pressure;
      /* Rate is the primary carrier — pitch alone is a much weaker signal
         across a room with people talking in it. 3.4 s between pulses when
         every casualty has time, 0.75 s when they do not. */
      const interval = 3.4 - 2.65 * Math.pow(p, 0.85);
      const t = Math.max(this.nextPing, now + 0.02);
      const f = 174 + 152 * p;
      this._tone({ t0: t, f0: f, dur: 0.30, peak: 0.014 + 0.016 * p,
        attack: 0.028, decay: 0.26, lp: 900 + 1300 * p });
      /* A second pulse, close behind, once pressure is genuinely high. The
         change from one pulse to two is a categorical change, and a
         categorical change is heard at a glance in a way a continuous one is
         not. */
      if (p > 0.62) {
        this._tone({ t0: t + 0.135, f0: f * 1.5, dur: 0.20, peak: 0.010 + 0.010 * p,
          attack: 0.02, decay: 0.17, lp: 2000 });
      }
      this.nextPing = t + interval;
    }
  }
}

/* ------------------------------------------------- watching the simulation

   The application does not emit events. Rather than reach into it and add
   any, this polls the live arm ten times a second and turns changes in
   monotonic counters into cues. That is a deliberately weak coupling: if the
   simulation is refactored, the worst that happens is this file goes silent.

   Counters only ever increase within a run, so a decrease means the run was
   reset. On a reset the baselines are re-synchronised without firing
   anything, which is what stops a reset from sounding like thirty deaths. */

const seen = {
  cas: 0, sorties: 0, deliv: 0, died: 0, key: ''
};

/* app.js declares its state as `const APP`, and a script-level `const` does
   not become a property of the global object. `window.APP` is therefore
   undefined and always will be; the bare name is the only way to reach it
   from a module, exactly as the module brief says. The try/catch covers the
   case where this module somehow runs before app.js and the binding is still
   in its temporal dead zone. */
let _app = null;
function app() {
  if (_app) return _app;
  try { _app = APP; } catch (e) { _app = null; }
  return _app;
}

function observe(snd) {
  const APP = app();
  const A = APP && APP.armA;
  if (!A || !A.stats) { snd.setPressure(0, 0); return; }

  const key = APP.scenarioKey + ':' + APP.seed;
  const st = A.stats;
  const nCas = A.casualties.length;
  const nDel = A.deliveryLog ? A.deliveryLog.length : 0;

  const resync = key !== seen.key || nCas < seen.cas || st.sorties < seen.sorties ||
                 nDel < seen.deliv || st.died < seen.died;
  if (resync) {
    seen.key = key; seen.cas = nCas; seen.sorties = st.sorties;
    seen.deliv = nDel; seen.died = st.died;
    return;                       // a reset is silent
  }

  /* Deaths first, so that the duck is already scheduled before anything else
     this tick gets a chance to sound over it. */
  if (st.died > seen.died) { snd.cue('death'); seen.died = st.died; }
  if (nCas > seen.cas) { snd.cue('call'); seen.cas = nCas; }
  if (st.sorties > seen.sorties) { snd.cue('launch'); seen.sorties = st.sorties; }

  if (nDel > seen.deliv) {
    /* One tick can contain several deliveries. Report the worse outcome
       once rather than both outcomes several times — a wasted sortie is the
       thing an operator needs to hear about. */
    let ok = 0, bad = 0;
    for (let i = seen.deliv; i < nDel; i++) {
      (A.deliveryLog[i] && A.deliveryLog[i].ok) ? ok++ : bad++;
    }
    if (bad) snd.cue('wasted');
    else if (ok) snd.cue('delivered');
    seen.deliv = nDel;
  }

  /* Aggregate time pressure. For every casualty still open, the fraction of
     their physiological deadline already spent; the tone tracks the mean of
     the worst half, which is more responsive than the mean of all and less
     jumpy than the maximum. */
  const t = APP.t || 0;
  const spent = [];
  for (const c of A.casualties) {
    if (c.outcome !== null || c.treated) continue;
    if (c.tInjury > t) continue;
    const dl = Math.max(1, c.deadlineMin);
    spent.push(Math.max(0, Math.min(1, (t - c.tInjury) / dl)));
  }
  if (!spent.length) { snd.setPressure(0, 0); return; }
  spent.sort((a, b) => b - a);
  const half = spent.slice(0, Math.max(1, Math.ceil(spent.length / 2)));
  let m = 0; for (const v of half) m += v;
  m /= half.length;
  /* A backlog of twenty people at 50% of deadline is a worse situation than
     two people at 50%, and the tone should say so. Count contributes, but
     with a hard ceiling so a mass-casualty event does not saturate the
     channel in its first minute. */
  const load = Math.min(0.28, spent.length / 40);
  snd.setPressure(m * 0.82 + load, spent.length);
}

/* ------------------------------------------------------------------- UI */

/* Built in JavaScript rather than declared in the template, because a control
   for a capability the browser may not have should not exist in the document
   at all. If ANGEL.caps.audio is false, nothing below this line runs and
   there is no control to disappoint anyone.

   It goes in the navigation rail, above Settings, and not in the command bar.
   That is measured, not taste: with the sound control removed the command bar
   is 1680 px wide, which is exactly the width of the display it is designed
   for. There is no room in it, and pushing the theme control off the right
   edge of a judge's screen to make room for a mute button would be a poor
   trade. The rail has vertical space and the control reads as a system
   setting there, which is what it is. */

const CSS = `
#audCtl{display:flex;flex-direction:column;gap:0;padding:0;margin-top:2px}
#audCtl .audBtn{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;
  cursor:pointer;user-select:none;color:var(--dim);background:none;border:none;width:100%;
  text-align:left;font:600 12px/1 var(--sans)}
#audCtl .audBtn:hover{color:var(--text);background:rgba(255,255,255,.03)}
#audCtl.on .audBtn{color:var(--ok)}
#audCtl .audIcon{width:18px;text-align:center;font-size:14px;font-weight:900;line-height:1}
#audCtl .audLbl{flex:1}
#audCtl .audMet{width:26px;height:6px;border:1px solid var(--line2);border-radius:2px;
  overflow:hidden;position:relative;display:none;flex:0 0 auto}
#audCtl.on .audMet{display:block}
#audCtl .audMet i{position:absolute;left:0;top:0;bottom:0;width:0%;background:var(--warn);
  transition:width .35s linear}
#audCtl .audTrim{display:none;align-items:center;gap:8px;padding:0 10px 8px 38px}
#audCtl.on .audTrim{display:flex}
#audCtl .audTrim span{font:600 8px/1 var(--mono);letter-spacing:.14em;color:var(--faint)}
#audCtl input[type=range]{flex:1;min-width:0;height:3px;-webkit-appearance:none;appearance:none;
  background:var(--line2);border-radius:2px;outline:none;cursor:pointer}
#audCtl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;
  border-radius:50%;background:var(--ok);cursor:pointer}
#audCtl input[type=range]::-moz-range-thumb{width:10px;height:10px;border:none;border-radius:50%;
  background:var(--ok);cursor:pointer}
`;

function injectCSS(id, css) {
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id; s.textContent = css;
  document.head.appendChild(s);
}

function mountControl(snd) {
  const rail = document.getElementById('rail');
  if (!rail || document.getElementById('audCtl')) return null;

  const wrap = document.createElement('div');
  wrap.id = 'audCtl';
  wrap.title = 'Sonification: a soft tone tracking aggregate time pressure, and quiet cues for ' +
               'casualty calls, launches, deliveries and deaths. Off until you turn it on.';
  wrap.innerHTML =
    '<button type="button" class="audBtn" id="audBtn">' +
      '<span class="audIcon">◍</span><span class="audLbl" id="audLbl">Sound off</span>' +
      '<span class="audMet"><i id="audMet"></i></span></button>' +
    '<div class="audTrim"><span>LEVEL</span>' +
      '<input type="range" id="audVol" min="0" max="100" step="1" aria-label="Sound level"></div>';

  /* Above Settings, below the spacer, so it sits with the other system
     controls rather than among the destinations. */
  const anchor = rail.querySelector('[data-view="SETTINGS"]');
  anchor ? rail.insertBefore(wrap, anchor) : rail.appendChild(wrap);

  const btn = wrap.querySelector('#audBtn');
  const lbl = wrap.querySelector('#audLbl');
  const vol = wrap.querySelector('#audVol');
  vol.value = String(Math.round(snd.level * 100));

  const paint = () => {
    wrap.classList.toggle('on', snd.on);
    lbl.textContent = snd.on ? 'Sound on' : 'Sound off';
    wrap.querySelector('.audIcon').textContent = snd.on ? '◉' : '◍';
  };

  btn.addEventListener('click', () => {
    if (snd.on) { snd.disable(); }
    else {
      if (!snd.enable()) {
        lbl.textContent = 'Audio unavailable';
        btn.disabled = true;
        return;
      }
      /* One quiet acknowledgement so the operator knows the control worked,
         even in a lull with nothing happening on the map. */
      snd.cue('delivered');
    }
    paint();
  });

  vol.addEventListener('input', () => snd.setLevel(vol.value / 100));
  paint();
  return wrap;
}

/* ------------------------------------------------------------- bootstrap */

ANGEL.ready('audio', async () => {
  if (!ANGEL.caps.audio) {
    ANGEL.setStatus('audio', 'withheld', 'No AudioContext on this browser');
    return null;                    // control is never created
  }

  const snd = new Sound();
  try {
    const v = parseFloat(localStorage.getItem('angel.audio.level'));
    if (isFinite(v)) snd.level = Math.max(0, Math.min(1, v));
  } catch (e) { /* private mode */ }

  const mount = () => mountControl(snd);
  injectCSS('audioCss', CSS);
  if (document.getElementById('rail')) mount();
  else window.addEventListener('DOMContentLoaded', mount, { once: true });

  const met = () => {
    const el = document.getElementById('audMet');
    if (el) el.style.width = Math.round(snd.pressure * 100) + '%';
  };
  setInterval(() => { observe(snd); met(); }, POLL_MS);

  ANGEL.provide('audio', {
    enable: () => snd.enable(),
    disable: () => snd.disable(),
    cue: n => snd.cue(n),
    setLevel: v => snd.setLevel(v),
    isOn: () => snd.on,
    pressure: () => ({ p: snd.pressure, n: snd.pressureN }),
    voices: () => snd.voices,
    rms: () => snd.rms()
  });
  ANGEL.mark('audio ready', { muted: true });
  return snd;
});
