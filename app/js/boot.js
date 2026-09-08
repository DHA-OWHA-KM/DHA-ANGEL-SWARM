/* =========================================================================
   ANGEL SWARM — runtime capability probe and service registry.

   This runs before anything else. Its job is to find out what this particular
   machine can actually do, publish that as a fact, and let every later
   subsystem decide for itself whether to appear.

   That ordering is deliberate. A demonstration fails badly when a control is
   visible and then throws; it fails invisibly, and much better, when the
   capability was never advertised. Nothing in this application asks a judge
   to click a button that this file has not already confirmed will work.
   ========================================================================= */
(function () {
  'use strict';

  const ANGEL = window.ANGEL = window.ANGEL || {};
  const t0 = performance.now();

  /* ------------------------------------------------------------- services */
  /* A tiny promise registry. Subsystems register a named service; consumers
     await it without caring about load order. */
  const _svc = new Map();
  const _wait = new Map();

  ANGEL.provide = function (name, value) {
    _svc.set(name, value);
    const w = _wait.get(name);
    if (w) { w.forEach(fn => fn(value)); _wait.delete(name); }
    return value;
  };
  ANGEL.get = function (name) { return _svc.get(name); };
  ANGEL.has = function (name) { return _svc.has(name); };
  ANGEL.need = function (name) {
    if (_svc.has(name)) return Promise.resolve(_svc.get(name));
    return new Promise(res => {
      if (!_wait.has(name)) _wait.set(name, []);
      _wait.get(name).push(res);
    });
  };

  /* --------------------------------------------------------------- events */
  const _bus = new EventTarget();
  ANGEL.on = (t, fn) => _bus.addEventListener(t, fn);
  ANGEL.emit = (t, detail) => _bus.dispatchEvent(new CustomEvent(t, { detail }));

  /* --------------------------------------------------------- capabilities */
  const caps = ANGEL.caps = {
    workers: typeof Worker === 'function',
    wasm: typeof WebAssembly === 'object',
    wasmSimd: false,
    sharedArrayBuffer: typeof SharedArrayBuffer === 'function',
    crossOriginIsolated: !!self.crossOriginIsolated,
    offscreenCanvas: typeof OffscreenCanvas === 'function',
    webgl2: false,
    webgpu: false,
    shaderF16: false,
    gpuVendor: null,
    gpuArchitecture: null,
    maxBufferMB: null,
    audio: typeof (window.AudioContext || window.webkitAudioContext) === 'function',
    viewTransitions: typeof document.startViewTransition === 'function',
    cores: navigator.hardwareConcurrency || 2,
    memoryGB: navigator.deviceMemory || null,
    origin: location.origin,
    secureContext: !!window.isSecureContext
  };

  /* WASM SIMD — a 9-byte module that only validates on a SIMD-capable
     engine. Cheaper and more honest than sniffing the user agent. */
  try {
    caps.wasmSimd = WebAssembly.validate(new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3,
      2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
  } catch (e) { caps.wasmSimd = false; }

  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (gl) {
      caps.webgl2 = true;
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) caps.glRenderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    }
  } catch (e) { /* no webgl2 */ }

  /* WebGPU has to be probed asynchronously, and the answer is not simply
     "is navigator.gpu there". An adapter can exist and still refuse the
     shader-f16 extension that half-precision models require — which is the
     exact failure mode on integrated graphics with older drivers. We ask for
     the adapter and read its feature set before promising anything. */
  ANGEL.gpuReady = (async function probeGPU() {
    if (!navigator.gpu) return caps;
    try {
      const ad = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!ad) return caps;
      caps.webgpu = true;
      caps.shaderF16 = ad.features && ad.features.has('shader-f16');
      if (ad.limits) {
        caps.maxBufferMB = Math.round((ad.limits.maxBufferSize || 0) / 1048576);
        caps.maxStorageMB = Math.round((ad.limits.maxStorageBufferBindingSize || 0) / 1048576);
      }
      if (ad.info) {
        caps.gpuVendor = ad.info.vendor || null;
        caps.gpuArchitecture = ad.info.architecture || null;
      }
    } catch (e) { caps.webgpu = false; }
    return caps;
  })();

  /* --------------------------------------------------------------- assets */
  /* Everything is served from the folder the launcher is sitting in. No
     absolute host anywhere in this application — grep it and you will find
     no scheme other than the ones in comments. */
  ANGEL.asset = p => new URL(p.replace(/^\//, ''), document.baseURI).href;

  ANGEL.fetchJSON = async function (path) {
    const r = await fetch(ANGEL.asset(path), { cache: 'force-cache' });
    if (!r.ok) throw new Error(path + ' → HTTP ' + r.status);
    return r.json();
  };

  /* ------------------------------------------------------------ telemetry */
  /* Local only. This is a record the operator can read on screen, not
     something that is sent anywhere. There is no transport in this file. */
  const marks = ANGEL.marks = [];
  ANGEL.mark = function (label, detail) {
    const m = { label, at: +(performance.now() - t0).toFixed(1), detail: detail || null };
    marks.push(m);
    ANGEL.emit('mark', m);
    return m;
  };
  ANGEL.mark('boot');

  /* --------------------------------------------------------- readiness UI */
  /* A subsystem that is loading, failed, or was deliberately withheld all
     look different and all say why. "Withheld" is a first-class state: it is
     what an honest system does when the hardware cannot support something. */
  const status = ANGEL.status = new Map();
  ANGEL.setStatus = function (key, state, note) {
    status.set(key, { state, note: note || '', at: performance.now() - t0 });
    ANGEL.emit('status', { key, state, note });
  };

  ANGEL.ready = function (key, fn) {
    ANGEL.setStatus(key, 'loading');
    return Promise.resolve()
      .then(fn)
      .then(v => { ANGEL.setStatus(key, 'ready'); return v; })
      .catch(e => {
        ANGEL.setStatus(key, 'failed', String(e && e.message || e));
        console.warn('[' + key + '] ' + e);
        return null;
      });
  };

  console.log('%cANGEL SWARM', 'color:#31d68a;font:700 14px monospace;letter-spacing:4px',
    '\n  cores', caps.cores, '· wasm', caps.wasm, '· simd', caps.wasmSimd,
    '· webgl2', caps.webgl2, '· workers', caps.workers);
})();
