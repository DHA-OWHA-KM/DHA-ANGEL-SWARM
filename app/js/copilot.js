/* =========================================================================
   MISSION BRIEF — a language model that is not allowed to know anything.

   The other two networks in this application read a signal and retrieve a
   passage. This one writes prose, which is the most dangerous thing a model
   can be asked to do in front of this audience, because prose is where a
   model's recall and a model's invention become indistinguishable to the
   reader.

   So it is not permitted to recall. Every number that reaches the model
   comes out of the simulation state a few milliseconds earlier — and, where
   the analytical engine is loaded, out of SQL executed against that same run.
   Every doctrinal claim is a verbatim passage handed over by the retrieval
   index. The model is given that block, told it is the only thing it knows,
   and asked to compose. The block is then printed beside its answer, item by
   item, so that anybody who doubts a sentence can find the fact it was built
   from — or fail to, which is the more useful outcome.

   That is the whole argument. A medical officer writes this summary by hand
   today, from the same figures, and it takes them twenty minutes. The model
   is a writing aid with a very short leash. It is a 0.5-billion-parameter
   model running on the CPU of this laptop; it is not consulted about
   medicine, it is not asked what should have been done, and nothing it emits
   is used by any other part of the system.

   Engine: wllama 3.5.1 — llama.cpp compiled to WebAssembly. The runtime is
   vendored at app/vendor/wllama/ and the model file, if present, is read
   from app/models/llm.gguf. Nothing here has a remote host to fall back to:
   the three CDN string constants that ship inside the upstream bundle are
   rewritten to unresolvable schemes at vendoring time. The bundle was built
   with, and can be rebuilt with:

     npx esbuild --bundle --minify --format=esm --platform=browser \
       --outfile=app/vendor/wllama/wllama.mjs \
       node_modules/@wllama/wllama/esm/index.js
     cp node_modules/@wllama/wllama/src/wasm/wllama.wasm app/vendor/wllama/

   followed by replacing these three literals in the output — they are the
   only absolute URLs in it — with strings that cannot resolve:

     https://cdn.jsdelivr.net/.../wllama-compat@3.5.1/wasm/wllama.js
       -> angel-offline:no-remote-worker
     https://cdn.jsdelivr.net/.../wllama-compat@3.5.1/wasm/wllama.wasm
       -> angel-offline:no-remote-wasm
     https://huggingface.co
       -> angel-offline:no-remote-hub

   None of the three is reachable from any code path this module takes —
   setCompat(null) below closes the first two and the hub helpers are never
   called — but a string that cannot be resolved is a better guarantee than a
   code path that is not taken.

   THE DEFAULT STATE OF THIS FOLDER IS "NO MODEL FILE". The weights are
   400 MB of Apache-2.0 licensed Qwen and they are not redistributed here.
   With no model present this pane still assembles and displays the whole
   grounding context — the evidence half of the argument works with no
   neural network at all — and tells the operator the one command that
   installs the composing half.
   ========================================================================= */

const BUNDLE      = 'vendor/wllama/wllama.mjs';
const WASM_PATH   = 'vendor/wllama/wllama.wasm';
const MODEL_DIR   = 'models/';
const MODEL_NAME  = 'llm.gguf';
const MODEL_PATH  = MODEL_DIR + MODEL_NAME;

/* Target model, stated here and on screen so the claim and the code agree. */
const TARGET = {
  name: 'Qwen2.5-0.5B-Instruct',
  params: '494 million',
  quant: 'Q4_K_M (4-bit, k-quant medium)',
  bytes: 398_000_000,
  licence: 'Apache-2.0',
  vendor: 'Alibaba Cloud / Qwen team'
};

const N_CTX      = 4096;   // headroom for context block + brief
const MAX_BRIEF  = 420;    // tokens
const MAX_ANSWER = 260;    // tokens, follow-up questions
const MAX_PASSAGE_CHARS = 460;

/* =========================================================================
   CAPABILITY

   wllama's own constructor probes for WASM exception handling and SIMD and
   throws asynchronously if either is missing — an unhandled rejection in the
   console before we have a chance to catch it. So the same two probes run
   here first, and if either fails the pane is withdrawn and the constructor
   is never reached.
   ========================================================================= */

function wasmValidate(bytes) {
  try { return WebAssembly.validate(new Uint8Array(bytes)); } catch (e) { return false; }
}

/* A module whose only body is a `try` block — valid only on an engine with
   native exception handling. */
const HAS_EH = () => wasmValidate(
  [0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 8, 1, 6, 0, 6, 64, 25, 11, 11]);

/* A module returning a v128 — valid only with SIMD. Identical to the probe
   boot.js already runs; repeated rather than depended on, because this module
   must be able to say no on its own. */
const HAS_SIMD = () => wasmValidate(
  [0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);

/* Multi-threaded llama.cpp needs SharedArrayBuffer, which the browser only
   grants to a cross-origin-isolated document. The Go launcher sends neither
   Cross-Origin-Opener-Policy nor Cross-Origin-Embedder-Policy — deliberately,
   because COEP would also have to be reconciled with every other asset this
   application loads — so the answer here is always "one thread". The number
   is displayed rather than hidden: it is the honest explanation for the
   tokens-per-second figure beside it. */
function threadPlan() {
  const isolated = !!self.crossOriginIsolated && typeof SharedArrayBuffer === 'function';
  return {
    isolated,
    threads: 1,
    why: isolated
      ? 'cross-origin isolated, but this build is pinned to one thread for reproducibility'
      : 'the launcher does not send COOP/COEP, so SharedArrayBuffer is unavailable and llama.cpp runs single-threaded'
  };
}

/* =========================================================================
   IS THE MODEL THERE?

   Asked by listing the directory rather than by requesting the file. A
   request for a file that is not there is a 404, and a 404 is written to the
   browser console in red whether or not the code handles it — which would
   make the *normal* shipping state of this folder look like a fault. The
   launcher serves a directory index, so the question can be asked with a
   request that succeeds. If that index is ever turned off the Range probe
   below answers the same question the noisy way.
   ========================================================================= */

async function probeModel() {
  const url = ANGEL.asset(MODEL_DIR);
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (r.ok) {
      const html = await r.text();
      if (/<pre>/i.test(html) || /href=/i.test(html)) {
        if (html.indexOf(MODEL_NAME) === -1) return { present: false, how: 'directory index' };
        return await probeHeader('directory index');
      }
    }
  } catch (e) { /* fall through to the direct probe */ }
  return await probeHeader('range request');
}

/* Read the first sixteen bytes and check the magic and version. A truncated
   download — the failure mode the fetch script is written to prevent — leaves
   a file that exists, has the right name, and is not a model. */
async function probeHeader(how) {
  try {
    const r = await fetch(ANGEL.asset(MODEL_PATH), {
      cache: 'no-store', headers: { Range: 'bytes=0-15' }
    });
    if (!r.ok && r.status !== 206) return { present: false, how };
    const b = new DataView(await r.arrayBuffer());
    if (b.byteLength < 8) return { present: false, how };
    const magic = String.fromCharCode(b.getUint8(0), b.getUint8(1), b.getUint8(2), b.getUint8(3));
    if (magic !== 'GGUF') {
      return { present: false, how, corrupt: true,
        note: 'a file called ' + MODEL_NAME + ' is present but does not begin with the GGUF magic' };
    }
    const version = b.getUint32(4, true);
    let bytes = null;
    const cr = r.headers.get('Content-Range');
    if (cr) { const m = cr.match(/\/(\d+)$/); if (m) bytes = +m[1]; }
    return { present: true, how, version, bytes };
  } catch (e) {
    return { present: false, how, note: String(e && e.message || e) };
  }
}

/* =========================================================================
   ENGINE

   Everything about wllama that could reach a network is disabled explicitly
   rather than left to a default:

   - setCompat(null). The constructor sets a compatibility profile whose
     default value is a pair of jsdelivr URLs. It is only consulted on engines
     without JSPI or memory64, which this one has, but "only consulted when"
     is not a guarantee and this is one line.
   - the model is handed over as a Blob this module fetched itself, so the
     model manager — which knows how to download from a hub and cache in
     OPFS — is never asked to resolve anything.
   - n_gpu_layers: 0. CPU only, as claimed on screen. WebGPU offload exists
     in this build and is declined so that the tokens-per-second figure means
     what a reader will assume it means.
   ========================================================================= */

class Engine {
  constructor() {
    this.w = null;
    this.meta = null;
    this.plan = threadPlan();
    this.loadMs = 0;
    this.bytes = 0;
    this.state = 'idle';       // idle | fetching | loading | ready | failed
    this.progress = 0;
    this.note = '';
    this.gen = 0;              // generations completed
    this.lastRate = 0;         // tokens/sec
  }

  async load(onProgress) {
    this.state = 'fetching';
    const mod = await import(ANGEL.asset(BUNDLE));

    // Fetch the weights ourselves so the progress bar is real and so no
    // library code ever holds a URL it could substitute a remote one for.
    const url = ANGEL.asset(MODEL_PATH);
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(MODEL_NAME + ' → HTTP ' + res.status);
    const total = +(res.headers.get('Content-Length') || 0);
    const chunks = [];
    let got = 0;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      this.progress = total ? got / total : 0;
      this.bytes = got;
      if (onProgress) onProgress(this.progress, got, total);
    }
    const blob = new Blob(chunks, { type: 'application/octet-stream' });
    chunks.length = 0;

    this.state = 'loading';
    if (onProgress) onProgress(1, got, total);

    const w = new mod.Wllama(
      { default: ANGEL.asset(WASM_PATH) },
      { suppressNativeLog: true, allowOffline: true, logger: QUIET }
    );
    w.setCompat(null);
    this.w = w;

    const t0 = performance.now();
    await w.loadModel([blob], {
      n_ctx: N_CTX,
      n_threads: this.plan.threads,
      n_gpu_layers: 0,
      n_batch: 128,
      warmup: false,
      seed: 42
    });
    this.loadMs = performance.now() - t0;
    this.meta = w.getModelMetadata();
    this.state = 'ready';
    ANGEL.mark('copilot model loaded', { ms: Math.round(this.loadMs), bytes: this.bytes });
    return this;
  }

  /* One generation. `onToken` receives the running text; the return value
     carries the measured rate so the caller does not have to time it. */
  async run(messages, maxTokens, onToken, signal) {
    const t0 = performance.now();
    let text = '';
    let n = 0;
    let timings = null;
    const stream = await this.w.createChatCompletion({
      messages,
      stream: true,
      temperature: 0.15,     // composition, not creativity
      max_tokens: maxTokens,
      abortSignal: signal
    });
    for await (const chunk of stream) {
      const ch = chunk && chunk.choices && chunk.choices[0];
      const piece = ch && ch.delta && ch.delta.content;
      if (chunk && chunk.timings) timings = chunk.timings;
      if (!piece) continue;
      text += piece;
      n++;
      if (onToken) onToken(text, n);
    }
    const ms = performance.now() - t0;
    const rate = timings && timings.predicted_per_second
      ? timings.predicted_per_second
      : (n / Math.max(1e-3, ms / 1000));
    this.lastRate = rate;
    this.gen++;
    return { text, tokens: n, ms, rate, timings };
  }

  card() {
    const m = (this.meta && this.meta.meta) || {};
    const h = (this.meta && this.meta.hparams) || {};
    return {
      name: m['general.name'] || TARGET.name,
      arch: m['general.architecture'] || '—',
      sizeLabel: m['general.size_label'] || null,
      fileType: fileTypeName(m['general.file_type']),
      layers: h.nLayer, embd: h.nEmbd, vocab: h.nVocab, ctxTrain: h.nCtxTrain
    };
  }
}

/* llama.cpp's file-type enumeration. Only the values a 0.5B chat model is
   plausibly shipped in are named; anything else is reported as its number
   rather than guessed at. */
const FILE_TYPES = {
  0: 'F32', 1: 'F16', 2: 'Q4_0', 3: 'Q4_1', 7: 'Q8_0', 8: 'Q5_0', 9: 'Q5_1',
  10: 'Q2_K', 11: 'Q3_K_S', 12: 'Q3_K_M', 13: 'Q3_K_L', 14: 'Q4_K_S',
  15: 'Q4_K_M', 16: 'Q5_K_S', 17: 'Q5_K_M', 18: 'Q6_K', 30: 'BF16'
};
function fileTypeName(v) {
  if (v == null) return null;
  const k = typeof v === 'string' ? parseInt(v, 10) : v;
  return FILE_TYPES[k] || ('file_type ' + v);
}

/* llama.cpp is chatty on stderr and none of it belongs in a demonstration
   console. Warnings and errors are kept — a real failure should still be
   findable — and routed through ANGEL.mark so they land in the telemetry
   list on screen rather than only in devtools. */
const QUIET = {
  debug: () => {},
  log: () => {},
  warn: m => ANGEL.mark('copilot warn', String(m).slice(0, 200)),
  error: m => ANGEL.mark('copilot error', String(m).slice(0, 200))
};

/* =========================================================================
   GROUNDING — part one: the run

   Facts are pulled out of the live simulation objects at the moment the
   button is pressed. Each one carries the field it came from, because the
   context block printed on screen has to be checkable against the data
   dictionary in the brief, not merely plausible.
   ========================================================================= */

/* The live run is a script-scoped `const APP` in app.js, not a property of
   `window`. A module can read it by bare name, but only if it exists — this
   module has to be able to load in a page where the simulation never did. */
function app() { return (typeof APP === 'undefined') ? null : APP; }

function fact(k, v, src, from) {
  return { k, v: String(v), src: src || 'SIM', from: from || null };
}

function armFacts(arm, world, tag) {
  const s = arm.stats || {};
  const f = [];
  const P = (label, val, field) => f.push(fact(tag + ' ' + label, val, 'SIM', field));
  /* Every label here names its population. The model composes from these
     strings verbatim, so a label that says only "died" produces a sentence
     that says only "died" — and this run has two death counts, one for every
     triage category and one for the survivable cohort. The glossary at the
     head of app.js is the definition; these are its words. */
  /* The two death counts are emitted once each, for both arms, by the
     comparison block in facts() above. They are not repeated here: two
     context lines carrying the same figure under two slightly different
     wordings is exactly the drift this application spent a day removing,
     and a 0.5B model reading them is more likely than a person to treat
     them as two quantities. */
  P('treated in time', s.treated, 'stats.treated');
  P('deaths of survivable wounds where one aircraft or none could reach them',
    s.coverageDeaths, 'stats.coverageDeaths');
  P('sorties flown', s.sorties, 'stats.sorties');
  P('sorties that delivered nothing', s.wastedSorties, 'stats.wastedSorties');
  P('delivery stops', s.stops, 'stats.stops');
  P('aircraft lost', s.dronesLost, 'stats.dronesLost');
  P('blood units used', s.bloodUsed, 'stats.bloodUsed');
  P('blood units wasted', s.bloodWasted, 'stats.bloodWasted');
  P('cold chain aborts', s.coldAborts, 'stats.coldAborts');
  P('stockouts at a launch point', s.stockouts, 'stats.stockouts');
  P('deliveries that missed the deadline', s.missedDeadline, 'stats.missedDeadline');
  return f;
}

/* Where the losses came from. This is the paragraph a medical officer
   actually wants, and it is the one most at risk of being invented, so it is
   computed by the simulation's own attribution function and handed over as
   five named integers. */
function causeFacts(arm, tag) {
  let c;
  try { c = deathCauses(arm); } catch (e) { return []; }
  if (!c) return [];
  const L = [
    ['no responder on scene able to use what could be delivered', c.noResponder],
    ['no launch point within range', c.noLaunchPoint],
    ['deadline shorter than any possible flight', c.tooFast],
    ['every capable aircraft already committed', c.busy],
    ['reached and treated, died anyway', c.treatedDied]
  ];
  const out = [fact(tag + ' losses attributed, total', c.total, 'SIM', 'deathCauses().total')];
  for (const [label, v] of L) out.push(fact(tag + ' losses — ' + label, v, 'SIM', 'deathCauses()'));
  return out;
}

function triageFacts(arm, tag) {
  const cls = {};
  for (const c of arm.casualties || []) {
    const k = c.cls || 'UNKNOWN';
    cls[k] = cls[k] || { n: 0, died: 0 };
    cls[k].n++;
    if (c.outcome === 'DIED') cls[k].died++;
  }
  return Object.keys(cls).sort().map(k =>
    fact(tag + ' ' + k + ' casualties', cls[k].n + ' wounded, ' + cls[k].died + ' died',
      'SIM', 'casualties[].cls / .outcome'));
}

const NAME_A = 'ANGEL SWARM';
const NAME_B = 'CURRENT — TRIAGE & PROXIMITY';

function runFacts() {
  const P = app();
  const W = P && P.world;
  const A = P && P.armA;
  const B = P && P.armB;
  if (!W || !A || !B) return null;

  /* A world exists from the moment the page loads; a *run* does not. Asking
     the model to summarise a mission nobody has started would produce a
     paragraph of zeroes, which is worse than an empty pane. */
  if (!(A.casualties || []).length && !(B.casualties || []).length) return null;

  const nA = A.label || NAME_A;
  const nB = B.label || NAME_B;
  const scn = W.scn || {};
  const f = [];
  f.push(fact('scenario', (scn.name || scn.key || '—') + ' (' + (scn.key || '—') + ')', 'SIM', 'world.scn'));
  if (scn.theater) f.push(fact('theatre', scn.theater + (scn.joa ? ' / ' + scn.joa : ''), 'SIM', 'world.scn.theater'));
  f.push(fact('mission length', (scn.durationMin || 0) + ' minutes', 'SIM', 'world.scn.durationMin'));
  f.push(fact('clock at the moment this brief was drafted',
    (P.t == null ? (scn.durationMin || 0) : P.t).toFixed(0) + ' minutes', 'SIM', 'APP.t'));
  f.push(fact('seed', P.seed == null ? 'not recorded' : P.seed, 'SIM', 'APP.seed'));
  f.push(fact('area', (scn.widthKm || 0) + ' by ' + (scn.heightKm || 0) + ' km', 'SIM', 'world.scn'));
  f.push(fact('wounded soldiers in the run', (A.casualties || []).length, 'SIM', 'armA.casualties.length'));
  f.push(fact('launch points per arm', (A.bases || []).length, 'SIM', 'arm.bases.length'));
  f.push(fact('aircraft per arm', (A.drones || []).length, 'SIM', 'arm.drones.length'));
  f.push(fact('tasking allocator on the ' + nA + ' arm',
    A.allocatorKey === 'ANGEL' ? 'ANGEL SWARM deadline-driven tasking'
                               : 'current triage and proximity (the ANGEL allocator is on standby)',
    'SIM', 'armA.allocatorKey'));
  if (A.telementor) f.push(fact('remote clinical mentoring', 'enabled on the ' + nA + ' arm', 'SIM', 'armA.telementor'));
  if (A.commsDown) f.push(fact('communications', 'degraded during this run', 'SIM', 'armA.commsDown'));

  const dA = (A.stats && A.stats.died) || 0;
  const dB = (B.stats && B.stats.died) || 0;
  const sA = (A.stats && A.stats.survivableDeaths) || 0;
  const sB = (B.stats && B.stats.survivableDeaths) || 0;
  f.push(fact(nA + ' dead of wounds, all triage categories', dA, 'SIM', 'armA.stats.died'));
  f.push(fact(nB + ' dead of wounds, all triage categories', dB, 'SIM', 'armB.stats.died'));
  f.push(fact(nA + ' dead of wounds they could have survived', sA, 'SIM', 'armA.stats.survivableDeaths'));
  f.push(fact(nB + ' dead of wounds they could have survived', sB, 'SIM', 'armB.stats.survivableDeaths'));
  /* The headline difference in this application is the survivable one — it
     is the only one a resupply decision could have changed — so that is the
     difference the model is handed, named. */
  f.push(fact('difference in deaths of survivable wounds',
    Math.abs(sB - sA) + (sB >= sA ? ' fewer dead of survivable wounds under ' + nA
      : ' more dead of survivable wounds under ' + nA),
    'SIM', 'armB.stats.survivableDeaths - armA.stats.survivableDeaths'));
  f.push(fact('difference in deaths of all triage categories',
    Math.abs(dB - dA) + (dB >= dA ? ' fewer dead under ' + nA : ' more dead under ' + nA),
    'SIM', 'armB.stats.died - armA.stats.died'));

  f.push(...armFacts(A, W, nA));
  f.push(...causeFacts(A, nA));
  f.push(...triageFacts(A, nA));
  f.push(...armFacts(B, W, nB));
  f.push(...causeFacts(B, nB));
  return f;
}

/* =========================================================================
   GROUNDING — part two: SQL

   Optional. The analytical console materialises the run into DuckDB; if that
   module loaded, one aggregate is executed against it and the result becomes
   context in its own right, tagged so a reader can tell which numbers came
   through the query engine and which came straight off the objects. If it did
   not load, or the query fails for any reason, the brief is written without
   it and says so. Nothing here waits on it.
   ========================================================================= */

const SQL_BRIEF = [
  'SELECT arm, triage,',
  '       count(*) AS wounded,',
  "       sum(CASE WHEN outcome = 'DIED' THEN 1 ELSE 0 END) AS died,",
  '       round(avg(deadline_min), 1) AS avg_deadline_min',
  'FROM casualties',
  "WHERE triage IN ('IMMEDIATE','DELAYED')",
  'GROUP BY arm, triage',
  'ORDER BY arm, triage'
].join('\n');

/* The analytical engine labels the two arms ANGEL and PUSH; the page labels
   them by their full names. Translate rather than let the model see two
   different names for the same arm in one context block. */
function armName(a) {
  const k = String(a).toUpperCase();
  if (k === 'ANGEL' || k === 'A') return NAME_A;
  if (k === 'PUSH' || k === 'CURRENT' || k === 'B') return NAME_B;
  return String(a);
}

/* F for a figure read off the run, Q for a figure a query returned. The two
   must not share a prefix: the whole point of the tag is that a reader can
   look at a number in the prose and find where it came from. */
function tagOf(f, i) { return (f.src === 'SQL' ? 'Q' : 'F') + (i + 1); }

async function sqlFacts() {
  if (!ANGEL.has('db')) return { facts: [], note: 'the analytical engine is not loaded in this session' };
  const P = app();
  if (!P || !P.world) return { facts: [], note: 'no run to query' };
  const db = ANGEL.get('db');
  const q = async sql => (await db.query(sql)).arrow;

  /* The tables are created empty at start-up and only filled when somebody
     materialises a run — normally by opening the analytical console. Two
     things can therefore be wrong here: the tables can be empty, or they can
     hold a DIFFERENT run from the one being briefed, which is the worse
     failure because it produces figures that look right. So the toll in the
     database is compared against the toll in the page, and the run is
     re-materialised unless they agree. */
  let arrow;
  try {
    const P2 = await q('SELECT count(*) AS n, coalesce(sum(died),0) AS died FROM runs');
    const nRuns = Number(P2.getChildAt(0).get(0) || 0);
    const dbDied = Number(P2.getChildAt(1).get(0) || 0);
    const live = (P.armA.stats.died || 0) + (P.armB.stats.died || 0);
    if (nRuns !== 2 || dbDied !== live) {
      await db.loadRun(P.armA, P.armB, P.world, { seed: P.seed });
    }
    arrow = await q(SQL_BRIEF);
  } catch (e) {
    try {
      await db.loadRun(P.armA, P.armB, P.world, { seed: P.seed });
      arrow = await q(SQL_BRIEF);
    } catch (e2) {
      return { facts: [], note: 'the query could not be run: ' + (e2.message || e2) };
    }
  }
  if (!arrow || !arrow.numRows) {
    return { facts: [], note: 'the query returned no rows against this run' };
  }

  const out = [];
  try {
    const fields = arrow.schema.fields.map(x => x.name);
    for (let r = 0; r < arrow.numRows && r < 12; r++) {
      const row = {};
      fields.forEach((nm, i) => { row[nm] = arrow.getChildAt(i).get(r); });
      out.push(fact(
        armName(row.arm) + ' ' + row.triage,
        row.wounded + ' wounded, ' + row.died + ' died, mean physiological deadline ' +
        row.avg_deadline_min + ' minutes',
        'SQL', 'SELECT … FROM casualties GROUP BY arm, triage'));
    }
  } catch (e) {
    return { facts: [], note: 'the result set could not be read: ' + (e.message || e) };
  }
  return { facts: out, note: null, sql: SQL_BRIEF };
}

/* =========================================================================
   GROUNDING — part three: doctrine

   Verbatim passages with their similarity scores, from the retrieval module.
   The corpus is paraphrase written for this prototype and says so; that
   notice travels with the passages into the prompt and onto the screen,
   because a model that quotes a paraphrase as if it were a publication is
   exactly the failure this pane exists to make impossible.
   ========================================================================= */

/* A PASSAGE THAT DOES NOT ANSWER THE QUESTION IS NOT GROUNDING, IT IS NOISE.
   Every hit the index returned used to be handed to the model as context,
   whatever it scored, and the model is instructed to write only from its
   context — so a weak passage does not sit there harmlessly, it is the
   material the paragraph gets built out of, and it is printed underneath the
   answer as if it were the evidence for it.

   The floor is measured, not chosen. Scored over this build's own index,
   twenty-two questions the corpus answers run 0.231 to 0.795 with a median
   of 0.666; twenty-four it does not answer run 0.032 to 0.588 with a median
   of 0.352, and the highest of the genuinely unanswerable is 0.354. 0.42
   sits above that with margin, on a plateau where 0.400 to 0.425 give the
   same result on both sets, and keeps eighteen of the twenty-two.

   A dropped passage is reported rather than silently omitted: the count and
   the best score it reached go into the notes, which are printed on the
   context card. An empty passage list is a legitimate outcome — the brief is
   then written from figures alone and says so. */
const RETRIEVAL_FLOOR = 0.42;

async function doctrineFacts(query, k) {
  if (!ANGEL.has('doctrine')) return { hits: [], note: 'the retrieval index is not loaded in this session' };
  try {
    const d = ANGEL.get('doctrine');
    const r = await d.search(query, k || 3);
    const all = (r.hits || []).slice(0, k || 3);
    const keep = all.filter(h => h.score >= RETRIEVAL_FLOOR);
    const drop = all.length - keep.length;
    const best = all.length ? all[0].score : null;
    return { hits: keep, ms: r.ms, disclaimer: d.disclaimer,
      note: drop
        ? drop + ' retrieved passage' + (drop === 1 ? '' : 's') + ' held back below the ' +
          RETRIEVAL_FLOOR.toFixed(2) + ' similarity floor' +
          (keep.length ? '' : ' — the corpus does not answer this, so this brief is written from figures alone') +
          (best == null ? '' : ' (best score ' + best.toFixed(3) + ')')
        : null };
  } catch (e) {
    return { hits: [], note: 'retrieval failed: ' + (e.message || e) };
  }
}

/* The question put to the retrieval index for the brief itself is derived
   from the run rather than typed by anybody: whichever failure mode killed
   the most people is the doctrine worth quoting beside the losses. */
function briefQuery() {
  const P = app();
  const A = P && P.armA;
  let c = null;
  try { c = A && deathCauses(A); } catch (e) { /* no attribution available */ }
  const base = 'resupply of blood and haemorrhage control forward of the surgical team';
  if (!c) return base;
  const ranked = [
    [c.noResponder, 'who can transfuse blood at the point of injury and what training the responder needs'],
    [c.noLaunchPoint, 'distance and evacuation timelines from the point of injury to surgical care'],
    [c.tooFast, 'time to death from massive haemorrhage and the golden hour'],
    [c.busy, 'prioritising scarce medical evacuation assets between simultaneous casualties'],
    [c.treatedDied, 'blood product handling, cold chain and transfusion at the point of injury']
  ].sort((a, b) => b[0] - a[0]);
  return ranked[0][0] > 0 ? ranked[0][1] : base;
}

/* =========================================================================
   THE PROMPT

   Written as a refusal-first instruction. The model is small; small models
   comply with a short, absolute rule far better than with a nuanced one.
   ========================================================================= */

const SYSTEM = [
  'You are drafting an after-action medical summary for a military audience.',
  '',
  'You have no knowledge of your own. Everything you are allowed to state is',
  'in the CONTEXT block below, and nothing else is.',
  '',
  'RULES',
  '1. Every number you write must appear in CONTEXT exactly as written there.',
  '2. If CONTEXT does not answer part of the task, write "not in the record"',
  '   and move on. Never estimate. Never infer a figure from another figure.',
  '3. Do not give clinical advice, do not recommend a treatment, and do not',
  '   judge whether a medical decision was correct. Report what the record says.',
  '4. Refer to a doctrine item only by quoting it and naming its publication.',
  '5. Sober operational register. No marketing language. Write "fewer dead",',
  '   never "lives saved". No lists of bullet points, no headings, no emoji.'
].join('\n');

function contextBlock(ctx) {
  const L = [];
  L.push('CONTEXT');
  L.push('');
  L.push('Figures from the simulation run (F) and from SQL over that run (Q):');
  ctx.facts.forEach((f, i) => {
    L.push('[' + tagOf(f, i) + '] ' + f.k + ': ' + f.v);
  });
  if (ctx.hits.length) {
    L.push('');
    L.push('Doctrine passages retrieved for this run. These are paraphrases written');
    L.push('for this prototype, not extracts of the publications:');
    ctx.hits.forEach((h, i) => {
      const t = h.text.length > MAX_PASSAGE_CHARS
        ? h.text.slice(0, MAX_PASSAGE_CHARS).replace(/\s+\S*$/, '') + '…'
        : h.text;
      L.push('[D' + (i + 1) + '] (' + h.pub + ', ' + h.section + '; similarity ' +
        h.score.toFixed(2) + ') "' + t + '"');
    });
  }
  return L.join('\n');
}

const BRIEF_TASK = [
  'TASK',
  'Write the after-action summary of this run in four short paragraphs, plain',
  'prose, no headings:',
  '1. What the mission was and what happened.',
  '2. How many died and where the losses came from.',
  '3. What the tasking system did — sorties, deliveries, what it wasted.',
  '4. How the CURRENT — TRIAGE & PROXIMITY baseline arm compared over the same casualties.',
  'Around two hundred words. Do not add a conclusion or a recommendation.'
].join('\n');

/* The context has to fit, and it has to fit with room left for the answer.
   A run with several hundred casualties produces a longer fact list than a
   default one, and a context that overflows does not degrade — llama.cpp
   refuses the request outright. So the block is measured before it is sent
   and trimmed from the least load-bearing end: retrieved passages first,
   because a missing passage costs a quotation, whereas a missing figure
   silently changes the arithmetic the model is reasoning over.

   Characters, not tokens, because the tokeniser lives on the far side of a
   worker and the answer is needed before the prompt is built. Qwen's BPE
   averages a little under four characters per token on prose of this kind;
   3.2 is the conservative side of that. */
const CHARS_PER_TOKEN = 3.2;

/* Corrected downwards the first time the engine disagrees. See runGrounded. */
let charsPerToken = CHARS_PER_TOKEN;

function estimateTokens(s) { return Math.ceil(s.length / charsPerToken); }

function fitContext(ctx, task, maxTokens) {
  const budget = N_CTX - maxTokens - 96;         // 96 for the chat scaffolding
  const build = c => SYSTEM + '\n' + contextBlock(c) + '\n\n' + task;
  let c = { facts: ctx.facts, hits: ctx.hits };
  let trimmed = null;

  while (estimateTokens(build(c)) > budget && c.hits.length > 1) {
    c = { facts: c.facts, hits: c.hits.slice(0, c.hits.length - 1) };
    trimmed = 'passages';
  }
  while (estimateTokens(build(c)) > budget && c.facts.length > 20) {
    c = { facts: c.facts.slice(0, c.facts.length - 4), hits: c.hits };
    trimmed = 'figures';
  }
  return {
    facts: c.facts, hits: c.hits, trimmed,
    chars: build(c).length,
    tokens: estimateTokens(build(c)),
    budget
  };
}

function messagesFor(ctx, task, maxTokens) {
  const fit = fitContext(ctx, task, maxTokens);
  ctx.fit = fit;
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: contextBlock(fit) + '\n\n' + task }
  ];
}

/* llama.cpp refuses an over-long request rather than truncating it, and the
   refusal names both the size it measured and the window it had. That is
   enough to calibrate the estimate above against the model's actual
   tokeniser — which is on the far side of a worker and cannot be consulted
   before the prompt is built — and try once more. It happens at most once per
   session, and after it the estimate is the model's own arithmetic rather
   than an average over English prose. */
const OVERFLOW = /request \((\d+) tokens?\) exceeds the available context size \((\d+) tokens?\)/i;

async function runGrounded(eng, ctx, task, maxTokens, onToken, signal) {
  try {
    return await eng.run(messagesFor(ctx, task, maxTokens), maxTokens, onToken, signal);
  } catch (e) {
    const m = OVERFLOW.exec(String(e && e.message || e));
    if (!m || !ctx.fit) throw e;
    const measured = +m[1];
    charsPerToken = Math.max(1, (ctx.fit.chars / measured) * 0.95);
    ANGEL.mark('copilot recalibrated', {
      charsPerToken: +charsPerToken.toFixed(2), measuredTokens: measured });
    return await eng.run(messagesFor(ctx, task, maxTokens), maxTokens, onToken, signal);
  }
}

/* Assemble everything. Returns the context object that is both fed to the
   model and printed on screen — the same object, so the two cannot drift. */
async function assemble(question) {
  const facts = runFacts();
  const notes = [];
  if (!facts) {
    return { facts: [], hits: [], notes: ['no run is loaded in the page yet'], ready: false };
  }
  const q = await sqlFacts();
  if (q.note) notes.push(q.note);
  const d = await doctrineFacts(question || briefQuery(), 3);
  if (d.note) notes.push(d.note);
  return {
    facts: facts.concat(q.facts),
    hits: d.hits,
    sql: q.sql || null,
    retrievalQuery: question || briefQuery(),
    retrievalMs: d.ms,
    disclaimer: d.disclaimer,
    notes,
    ready: true
  };
}

/* =========================================================================
   VIEW
   ========================================================================= */

const S = {
  eng: null,
  probe: null,
  ctx: null,
  brief: '',
  answers: [],       // {q, a, tokens, rate, ms}
  busy: false,
  abort: null,
  built: false,
  loadPct: 0,
  sig: '',
  sigAt: 0,
  err: null
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function el(id) { return document.getElementById(id); }

function mb(n) {
  if (n == null) return '—';
  if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB';
}

const INSTALL_SH = './get-model.sh';
const INSTALL_PS = '.\\get-model.ps1';

/* ------------------------------------------------------------ the honesty
   card. Rendered in both states — with and without weights — because the
   claim being made about the model matters more than whether it is loaded. */
function modelCardHTML() {
  const plan = threadPlan();
  const c = S.eng && S.eng.state === 'ready' ? S.eng.card() : null;
  return `
    <div class="card cpCard">
      <div class="cardHead">The language model ${mark('LLM')}</div>
      <table class="kv">
        <tr><td>Model</td><td>${esc(c ? c.name : TARGET.name)}</td></tr>
        <tr><td>Parameters</td><td>${esc(TARGET.params)}${c && c.sizeLabel ? ' (' + esc(c.sizeLabel) + ')' : ''}</td></tr>
        <tr><td>Quantisation</td><td>${esc(c && c.fileType ? c.fileType : TARGET.quant)}</td></tr>
        <tr><td>Licence</td><td>${esc(TARGET.licence)}</td></tr>
        <tr><td>Runtime</td><td>llama.cpp compiled to WebAssembly (wllama)</td></tr>
        <tr><td>Runs on</td><td>this machine's CPU. No GPU. No network.</td></tr>
        <tr><td>Threads</td><td>${plan.threads} — ${esc(plan.why)}</td></tr>
        ${c ? `<tr><td>Architecture</td><td>${esc(c.arch)}, ${c.layers} layers, width ${c.embd}</td></tr>
        <tr><td>Context window</td><td>${N_CTX} tokens (trained to ${c.ctxTrain})</td></tr>
        <tr><td>Weights loaded in</td><td>${Math.round(S.eng.loadMs)} ms, ${mb(S.eng.bytes)}</td></tr>` : ''}
      </table>
      <p class="cpWarn"><b>What this model is used for.</b> Composition only. It turns a
        block of figures this application computed into English. It is a 0.5-billion-parameter
        model — small enough to run on a laptop, far too small to be trusted with recall — and
        it is never asked a clinical question, never consulted about a casualty, and never
        allowed to influence tasking. Nothing it writes is fed back into the simulation.
        Every figure it is given is printed beside its answer so you can check it.</p>
    </div>`;
}

/* --------------------------------------------------------- absent weights */
function absentHTML(p) {
  const bad = p && p.corrupt;
  return `
    <div class="cpGrid">
      <div class="cpMain">
        <div class="card cpAbsent">
          <div class="cardHead">${bad ? 'The model file is not a model' : 'The language model is not installed'}</div>
          <p class="lede">${bad
            ? esc(p.note) + '. The most likely cause is a download that stopped part way through. Delete <code>app/models/' + MODEL_NAME + '</code> and run the fetch script again.'
            : 'This folder ships without language-model weights. They are ' + Math.round(TARGET.bytes / 1e6) + ' MB of ' +
              esc(TARGET.licence) + '-licensed ' + esc(TARGET.name) + ', and redistributing them inside a demonstration package would be both large and presumptuous. Everything else on this pane works without them: the grounding context below is assembled from the live run, from SQL over that run, and from doctrinal retrieval, and it is exactly what the model would have been given.'}</p>
          <div class="cpCmd">
            <div class="cpCmdRow"><span>macOS or Linux</span><code>${esc(INSTALL_SH)}</code></div>
            <div class="cpCmdRow"><span>Windows PowerShell</span><code>${esc(INSTALL_PS)}</code></div>
          </div>
          <p class="cpFine">Run it once, on a machine with internet, from the folder holding the
            launcher. It downloads ${esc(TARGET.name)} in ${esc(TARGET.quant)} form, checks the
            file, and writes it to <code>app/models/${MODEL_NAME}</code>. After that the folder
            never needs a network again. Read <code>GET-MODEL.txt</code> first if you would
            rather see it in plain language. Detected by ${esc(p ? p.how : 'probe')}.</p>
        </div>
        ${contextHTML()}
      </div>
      <div class="cpSide">${modelCardHTML()}${pipelineHTML()}</div>
    </div>`;
}

/* ---------------------------------------------------------- the pipeline */
function pipelineHTML() {
  return `
    <div class="card cpCard">
      <div class="cardHead">How an answer is built</div>
      <ol class="cpSteps">
        <li><b>Figures</b> are read out of the live simulation objects — the same objects
            the tables on every other pane are drawn from.</li>
        <li><b>SQL</b> is executed against the run in the analytical engine, where that
            engine is loaded, so the aggregate has a query behind it and not a loop.</li>
        <li><b>Doctrine</b> is retrieved by the sentence encoder as verbatim passages
            with similarity scores.</li>
        <li>Those three things become the entire context. The model is told it knows
            nothing else and is asked to say so when the context runs out.</li>
        <li>The context is printed beside the answer, item by item.</li>
      </ol>
      <p class="cpFine">The model composes. It does not recall. If a figure in the prose is
        not in the list beside it, that is a defect you can see — which is the point of
        printing the list.</p>
    </div>`;
}

/* ------------------------------------------------------------- the context */
function contextHTML() {
  const c = S.ctx;
  if (!c) {
    return `<div class="card cpCtx"><div class="cardHead">Grounding context</div>
      <p class="lede">Assembling…</p></div>`;
  }
  if (!c.ready) {
    return `<div class="card cpCtx"><div class="cardHead">Grounding context</div>
      <p class="lede">No mission has been run in this page yet, so there is nothing to
      summarise. Start one from the mission pane — the figures appear here as soon as it
      stops, and this pane will pick them up on its own.</p></div>`;
  }
  /* If the block had to be trimmed to fit the window, show what was SENT,
     not what was assembled. A list on screen that is longer than the list the
     model saw would quietly defeat the point of printing it. */
  const facts = c.fit ? c.fit.facts : c.facts;
  const passages = c.fit ? c.fit.hits : c.hits;
  const nS = facts.filter(f => f.src === 'SIM').length;
  const nQ = facts.filter(f => f.src === 'SQL').length;
  const rows = facts.map((f, i) => `
    <tr class="cpSrc-${f.src}">
      <td class="cpTag">${tagOf(f, i)}</td>
      <td>${esc(f.k)}</td>
      <td class="cpVal">${esc(f.v)}</td>
      <td class="cpFrom">${esc(f.from || '')}</td>
    </tr>`).join('');

  const hits = passages.map((h, i) => `
    <div class="cpPassage">
      <div class="cpPhead"><b>D${i + 1}</b> ${esc(h.pub)} · ${esc(h.section)}
        <span class="cpScore">similarity ${h.score.toFixed(3)}</span></div>
      <blockquote>${esc(h.text.length > MAX_PASSAGE_CHARS
        ? h.text.slice(0, MAX_PASSAGE_CHARS).replace(/\s+\S*$/, '') + '…' : h.text)}</blockquote>
    </div>`).join('');

  return `
    <div class="card cpCtx">
      <div class="cardHead">Everything the model was given
        <span class="cpCount">${facts.length} figures · ${passages.length} passages</span></div>
      <p class="cpFine">This is the complete context. The model saw this and nothing else —
        no prior conversation, no training-time recall it was invited to use. ${nS} figures
        read from the simulation state${nQ ? ', ' + nQ + ' returned by SQL' : ''}.</p>
      <table class="cpFacts"><tbody>${rows}</tbody></table>
      ${c.sql ? `<div class="cpSql"><div class="cpSqlHead">The query</div><pre>${esc(c.sql)}</pre></div>` : ''}
      ${passages.length ? `<div class="cpPassages">
        <div class="cpSqlHead">Retrieved for &ldquo;${esc(c.retrievalQuery)}&rdquo;${
          c.retrievalMs != null ? ' in ' + Math.round(c.retrievalMs) + ' ms' : ''}
          ${mark('RETRIEVAL', 'these passages were selected by the sentence encoder, not by the language model')}</div>
        ${hits}
        <p class="cpFine cpDis">${esc(c.disclaimer || '')}</p></div>` : ''}
      ${c.fit ? `<p class="cpFine">Sent as ${c.fit.chars.toLocaleString()} characters,
        roughly ${c.fit.tokens.toLocaleString()} tokens against a ${N_CTX}-token window.${
        c.fit.trimmed ? ' The block was longer than the window allows and was trimmed at the ' +
        c.fit.trimmed + ' end; what is listed above is what was sent.' : ''}</p>` : ''}
      ${c.notes.length ? `<p class="cpFine cpNotes">Not available for this brief: ${
        c.notes.map(esc).join('; ')}.</p>` : ''}
    </div>`;
}

/* The provenance mark. js/app.js owns the component and the four-model
   registry; `prov()` is a top-level declaration in a classic script and is
   therefore on the global object before this module's functions run. Guarded
   anyway.

   The mark for this model withdraws with the model. Everything below is
   inside presentHTML(), which is only reached when the weights are actually
   on disk — and when they are not, ANGEL.ready() at the foot of this file
   removes the pane and the rail entry outright, so there is no surface left
   for a badge to sit on and claim a capability this build does not have. */
const mark = (k, d) => (typeof window.prov === 'function' ? window.prov(k, d) : '');

/* ------------------------------------------------------------ present path */
function presentHTML(p) {
  return `
    <div class="cpGrid">
      <div class="cpMain">
        <div class="card cpDraft">
          <div class="cardHead">After-action summary
            ${mark('LLM', 'the prose below is written by the model from the context listed on this page \u2014 every figure in it was computed elsewhere')}
            <span class="cpQuoted">COMPOSED FROM CONTEXT</span>
          </div>
          <p class="lede">The summary a medical officer would otherwise write by hand from the
            same figures. Drafted here from the context listed below, on this machine, in
            about the time it takes to read it.</p>
          <div class="cpBar">
            <button class="cpBtn" id="cpGo">Draft the brief</button>
            <button class="cpBtn ghost" id="cpStop" disabled>Stop</button>
            <span class="cpStat" id="cpStat">Model file present — ${p && p.bytes ? mb(p.bytes) : 'size unknown'}, GGUF v${p ? p.version : '?'}. Not loaded yet.</span>
          </div>
          <div class="cpProg" id="cpProg"><i></i></div>
          <div class="cpOut" id="cpOut"></div>
          <div class="cpMeter" id="cpMeter"></div>
        </div>

        <div class="card cpAsk">
          <div class="cardHead">Follow-up ${mark('LLM')}</div>
          <p class="cpFine">Grounded the same way: your question is put to the retrieval index,
            the run figures are attached, and the model is given nothing else. Ask it something
            the context does not cover and it should tell you it does not know — that is worth
            testing.</p>
          <div class="cpAskRow">
            <input id="cpQ" class="cpInput" placeholder="Where did the losses come from on the baseline arm?" />
            <button class="cpBtn" id="cpAsk">Ask</button>
          </div>
          <div class="cpChips" id="cpChips"></div>
          <div class="cpThread" id="cpThread"></div>
        </div>

        ${contextHTML()}
      </div>
      <div class="cpSide">${modelCardHTML()}${pipelineHTML()}</div>
    </div>`;
}

const SUGGEST = [
  'How many died on each arm and what is the difference?',
  'Where did the losses come from?',
  'What did the aircraft waste?',
  'What does doctrine say about the golden hour?',
  'What was the average temperature in the theatre?'
];

/* The last suggestion has no answer in the context on purpose. A judge
   should be able to press one button and watch the model decline. */

function renderBrief() {
  const host = el('briefBody');
  if (!host) return;

  if (S.built && host.querySelector('#cpRoot')) { paintLive(); return; }

  injectCSS();
  const p = S.probe;
  const inner = (p && p.present) ? presentHTML(p) : absentHTML(p);
  host.innerHTML = '<div id="cpRoot">' + inner + '</div>';
  S.built = true;
  if (p && p.present) bind();
  // Assemble the context immediately in both states — with no weights it is
  // the whole of what this pane has to show, and with weights it means the
  // list is on screen before the first token arrives.
  if (!S.ctx) refreshContext();
}

function refreshContext() {
  return assemble(null)
    .then(c => { S.ctx = c; refreshContextInPlace(); })
    .catch(() => { /* the pane stays usable without it */ });
}

function bind() {
  const go = el('cpGo'), stop = el('cpStop'), ask = el('cpAsk'), q = el('cpQ');
  if (go) go.addEventListener('click', () => draft());
  if (stop) stop.addEventListener('click', () => { if (S.abort) S.abort.abort(); });
  if (ask) ask.addEventListener('click', () => followUp(q && q.value));
  if (q) q.addEventListener('keydown', e => { if (e.key === 'Enter') followUp(q.value); });
  const chips = el('cpChips');
  if (chips) {
    chips.innerHTML = SUGGEST.map((s, i) =>
      `<span class="cpChip${i === SUGGEST.length - 1 ? ' cpChipNeg' : ''}" data-q="${esc(s)}">${esc(s)}</span>`).join('');
    chips.addEventListener('click', e => {
      const c = e.target.closest('[data-q]');
      if (!c) return;
      if (q) q.value = c.dataset.q;
      followUp(c.dataset.q);
    });
  }
}

function setStat(t) { const e = el('cpStat'); if (e) e.textContent = t; }

function setProgress(v) {
  const e = el('cpProg');
  if (!e) return;
  e.classList.toggle('on', v > 0 && v < 1);
  e.firstElementChild.style.width = Math.round(v * 100) + '%';
}

function busy(on) {
  S.busy = on;
  const go = el('cpGo'), ask = el('cpAsk'), stop = el('cpStop');
  if (go) go.disabled = on;
  if (ask) ask.disabled = on;
  if (stop) stop.disabled = !on;
}

/* A coarse fingerprint of the run. Deliberately coarse: it must change when
   the mission does and not when the clock ticks, because every change costs a
   retrieval and possibly a table rebuild in the analytical engine. */
function runSig() {
  const P = app();
  if (!P || !P.world) return '';
  return [P.scenarioKey || (P.world.scn && P.world.scn.key), P.seed,
    (P.armA.casualties || []).length, P.armA.stats.died, P.armB.stats.died,
    P.armA.allocatorKey].join('|');
}

/* Repaint of the live numbers only. The host application repaints this pane
   several times a second; rebuilding it would destroy a stream in flight. */
function paintLive() {
  if (S.eng && S.eng.state === 'fetching') setProgress(S.eng.progress);

  /* Keep the context honest about the run currently in the page. Only while
     the simulation is stopped — mid-run the figures are a moving target and
     re-retrieving on every tick would be an expensive way to display a number
     that is about to change. */
  const P = app();
  if (S.busy || (P && P.running)) return;
  const sig = runSig();
  if (!sig || sig === S.sig) return;
  const now = performance.now();
  if (now - S.sigAt < 1500) return;
  S.sig = sig;
  S.sigAt = now;
  refreshContext();
}

async function ensureEngine() {
  if (S.eng && S.eng.state === 'ready') return S.eng;
  if (!S.eng) S.eng = new Engine();
  setStat('Reading the weights…');
  await S.eng.load((pct, got, total) => {
    setProgress(pct);
    setStat('Reading the weights — ' + mb(got) + (total ? ' of ' + mb(total) : ''));
  });
  setProgress(0);
  const c = S.eng.card();
  setStat(c.name + ' · ' + (c.fileType || TARGET.quant) + ' · loaded in ' +
    Math.round(S.eng.loadMs) + ' ms on ' + S.eng.plan.threads + ' CPU thread');
  // The model card gains its measured rows once the file is open.
  const side = document.querySelector('#cpRoot .cpSide .cpCard');
  if (side) {
    const tmp = document.createElement('div');
    tmp.innerHTML = modelCardHTML();
    side.replaceWith(tmp.firstElementChild);
  }
  return S.eng;
}

function meter(r) {
  const e = el('cpMeter');
  if (!e) return;
  if (!r) { e.textContent = ''; return; }
  const fit = S.ctx && S.ctx.fit;
  e.innerHTML = `<b>${r.rate.toFixed(1)}</b> tokens/sec · ${r.tokens} tokens written · ` +
    `${(r.ms / 1000).toFixed(1)} s · ${S.eng ? S.eng.plan.threads : 1} CPU thread` +
    (r.timings && r.timings.prompt_n
      ? ` · ${r.timings.prompt_n} tokens of context read at ${r.timings.prompt_per_second.toFixed(0)}/sec`
      : (fit ? ` · context ${fit.chars.toLocaleString()} characters` : ''));
}

async function draft() {
  if (S.busy) return;
  busy(true);
  const out = el('cpOut');
  if (out) { out.textContent = ''; out.classList.add('on'); }
  meter(null);
  try {
    await ensureEngine();
    S.ctx = await assemble(null);
    refreshContextInPlace();
    if (!S.ctx.ready) {
      if (out) out.textContent = 'No run is loaded in this page, so there is nothing to summarise.';
      busy(false);
      return;
    }
    setStat('Composing…');
    S.abort = new AbortController();
    const r = await runGrounded(S.eng, S.ctx, BRIEF_TASK, MAX_BRIEF, (text, n) => {
      if (out) out.textContent = text;
      if (n % 8 === 0) setStat('Composing — ' + n + ' tokens');
    }, S.abort.signal);
    S.brief = r.text;
    meter(r);
    // The context card now knows how big the block actually was.
    refreshContextInPlace();
    setStat('Drafted from ' + (S.ctx.fit ? S.ctx.fit.facts.length : S.ctx.facts.length) + ' figures and ' + (S.ctx.fit ? S.ctx.fit.hits.length : S.ctx.hits.length) +
      ' retrieved passages, all listed below.');
  } catch (e) {
    fail(e, out);
  } finally {
    S.abort = null;
    busy(false);
    setProgress(0);
  }
}

async function followUp(question) {
  const q = (question || '').trim();
  if (!q || S.busy) return;
  busy(true);
  const thread = el('cpThread');
  const row = document.createElement('div');
  row.className = 'cpTurn';
  row.innerHTML = `<div class="cpQ">${esc(q)}</div><div class="cpA"></div><div class="cpM"></div>`;
  if (thread) thread.prepend(row);
  const a = row.querySelector('.cpA');
  try {
    await ensureEngine();
    S.ctx = await assemble(q);
    refreshContextInPlace();
    setStat('Answering…');
    S.abort = new AbortController();
    const task = 'TASK\nAnswer this question using CONTEXT only. If CONTEXT does not ' +
      'contain the answer, say plainly that the record does not contain it and stop.\n\n' +
      'QUESTION: ' + q;
    const r = await runGrounded(S.eng, S.ctx, task, MAX_ANSWER, text => {
      a.textContent = text;
    }, S.abort.signal);
    refreshContextInPlace();
    row.querySelector('.cpM').textContent =
      r.rate.toFixed(1) + ' tokens/sec · ' + r.tokens + ' tokens · grounded in ' +
      (S.ctx.fit ? S.ctx.fit.facts.length : S.ctx.facts.length) + ' figures and ' +
      (S.ctx.fit ? S.ctx.fit.hits.length : S.ctx.hits.length) + ' passages';
    S.answers.push({ q, a: r.text, rate: r.rate, tokens: r.tokens });
    setStat('Answered from the context listed below.');
  } catch (e) {
    fail(e, a);
  } finally {
    S.abort = null;
    busy(false);
  }
}

/* The worker talks to the WebAssembly side over a framed binary protocol. If
   a frame is ever mis-read the stream does not merely fail — the channel is
   left mid-message and every later request reads the next frame's header as a
   length, which surfaces as a nonsensical typed-array size. There is nothing
   to repair from this side, so the engine is dropped and the next attempt
   starts a new worker with a fresh channel. Whatever the model had already
   written is kept: a partial brief is worth more than an error where the
   partial brief used to be. */
const DESYNC = /typed array length|out of bounds|detached/i;

function fail(e, node) {
  const text = String(e && e.message || e);
  const aborted = e && (e.name === 'AbortError' || /abort/i.test(text));
  let msg;
  if (aborted) {
    msg = '(stopped)';
  } else if (DESYNC.test(text)) {
    S.eng = null;
    msg = 'The connection to the model was lost part way through (' + text + '). ' +
          'The engine has been reset; press the button again to start over. ' +
          'Everything above this line was written before the fault, and everything ' +
          'else on this page is unaffected.';
  } else {
    msg = 'The model could not complete this: ' + text +
          '. Everything else on this page is unaffected.';
  }
  if (node) node.textContent = (node.textContent ? node.textContent + '\n\n' : '') + msg;
  setStat(aborted ? 'Stopped.' : 'Generation failed — see the message above.');
  if (!aborted) ANGEL.mark('copilot generation failed', text);
}

function refreshContextInPlace() {
  const host = el('briefBody');
  if (!host) return;
  const old = host.querySelector('.cpCtx');
  const tmp = document.createElement('div');
  tmp.innerHTML = contextHTML();
  if (old) old.replaceWith(tmp.firstElementChild);
  else {
    const main = host.querySelector('.cpMain');
    if (main) main.appendChild(tmp.firstElementChild);
  }
}

/* =========================================================================
   CSS — injected from here rather than added to the shared stylesheet, so
   this module is one file that can be deleted without leaving anything
   behind.
   ========================================================================= */

const CSS = `
/* The host pane is already an absolutely-positioned scroll container with
   its own padding, so this root is a plain block. Positioning it would cover
   the pane heading, which is where the honesty notice lives. */
#cpRoot{min-width:0}
.cpGrid{display:grid; grid-template-columns:minmax(0,1fr) minmax(290px,352px);
  gap:14px; align-items:start}
@media (max-width:1240px){ .cpGrid{grid-template-columns:minmax(0,1fr)} }
.cpMain{display:flex; flex-direction:column; gap:14px; min-width:0}
.cpSide{display:flex; flex-direction:column; gap:14px; min-width:0}
#cpRoot .card{background:var(--panel); border:1px solid var(--line); border-radius:8px;
  padding:13px 15px 15px; min-width:0}
#cpRoot .cardHead{display:flex; align-items:center; gap:9px; flex-wrap:wrap;
  font:700 10px/1 var(--mono); letter-spacing:.16em; text-transform:uppercase;
  color:var(--dim); margin-bottom:9px}
#cpRoot .lede{margin:0 0 11px; color:var(--dim); font-size:12.5px; line-height:1.55; max-width:74ch}
#cpRoot code{font-family:var(--mono); font-size:11.5px; background:var(--panel2);
  border:1px solid var(--line); border-radius:4px; padding:1px 5px; color:var(--text)}
#cpRoot .kv{width:100%; border-collapse:collapse; font-size:12px}
#cpRoot .kv td{padding:4px 0; border-bottom:1px solid var(--line); vertical-align:top;
  text-align:left; line-height:1.5}
#cpRoot .kv td:first-child{color:var(--dim); width:38%; padding-right:11px}

.cpWarn{margin:11px 0 0; padding:9px 11px; border-left:2px solid var(--warn);
  background:var(--chartbg); color:var(--dim); font-size:11.5px; line-height:1.55}
.cpWarn b{color:var(--text)}
.cpFine{color:var(--faint); font-size:11.5px; line-height:1.55; margin:9px 0 0; max-width:78ch}
.cpDis{font-style:italic}
.cpNotes{color:var(--warn); opacity:.85}

.cpAbsent .cardHead{color:var(--warn)}
.cpCmd{display:flex; flex-direction:column; gap:7px; margin:12px 0 2px}
.cpCmdRow{display:flex; align-items:center; gap:11px; flex-wrap:wrap}
.cpCmdRow span{font:700 9px/1 var(--mono); letter-spacing:.14em; color:var(--faint);
  min-width:154px; text-transform:uppercase}
.cpCmdRow code{font-size:13px; padding:5px 10px; color:var(--ok)}

.cpBar{display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:2px 0 10px}
.cpBtn{background:var(--panel2); border:1px solid var(--line2); color:var(--text);
  border-radius:5px; padding:7px 14px; cursor:pointer; font:600 12px/1 var(--sans)}
.cpBtn:hover:not(:disabled){border-color:var(--info); color:var(--info)}
.cpBtn:disabled{opacity:.42; cursor:default}
.cpBtn.ghost{color:var(--dim)}
.cpStat{color:var(--faint); font:400 11.5px/1.5 var(--mono); flex:1; min-width:180px}

.cpProg{height:3px; background:var(--line); border-radius:2px; overflow:hidden;
  margin:0 0 10px; opacity:0; transition:opacity .2s}
.cpProg.on{opacity:1}
.cpProg i{display:block; height:100%; width:0; background:var(--info); transition:width .15s linear}

.cpOut{white-space:pre-wrap; font-size:13.5px; line-height:1.68; color:var(--text);
  min-height:0; word-break:break-word}
.cpOut.on{min-height:74px; border-top:1px solid var(--line); padding-top:11px}
.cpOut:empty{display:none}
.cpMeter{margin-top:10px; color:var(--faint); font:400 11px/1.5 var(--mono)}
.cpMeter b{color:var(--info); font-size:13px}

.cpAskRow{display:flex; gap:8px; margin:10px 0 0}
.cpInput{flex:1; min-width:0; background:var(--bg2); border:1px solid var(--line);
  border-radius:5px; padding:8px 11px; font-size:12.5px; color:var(--text)}
.cpInput:focus{outline:none; border-color:var(--info)}
.cpChips{display:flex; flex-wrap:wrap; gap:6px; margin-top:9px}
.cpChip{border:1px solid var(--line); border-radius:11px; padding:4px 10px; cursor:pointer;
  font-size:11px; color:var(--dim); background:var(--panel2)}
.cpChip:hover{border-color:var(--info); color:var(--info)}
.cpChipNeg{border-style:dashed}
.cpThread{display:flex; flex-direction:column; gap:12px; margin-top:13px}
.cpTurn{border-left:2px solid var(--line2); padding-left:11px}
.cpQ{font-weight:600; font-size:12.5px; color:var(--text); margin-bottom:5px}
.cpA{white-space:pre-wrap; font-size:12.5px; line-height:1.62; color:var(--dim); word-break:break-word}
.cpM{margin-top:5px; color:var(--faint); font:400 10.5px/1.4 var(--mono)}

.cpCtx .cardHead{color:var(--info)}
.cpCount{margin-left:auto; color:var(--faint); font-weight:400; letter-spacing:.08em}
.cpFacts{width:100%; border-collapse:collapse; font-size:11.5px; margin-top:9px;
  table-layout:fixed}
.cpFacts td{padding:3px 6px 3px 0; border-bottom:1px solid var(--line);
  vertical-align:top; word-break:break-word}
.cpTag{font-family:var(--mono); font-size:10px; color:var(--faint); width:38px}
.cpFacts td:nth-child(2){color:var(--dim); width:40%}
.cpVal{color:var(--text); font-family:var(--mono); font-size:11px; width:30%}
.cpFrom{color:var(--faint); font-family:var(--mono); font-size:9.5px; width:24%}
.cpSrc-SQL .cpTag{color:var(--ok)}
.cpSrc-SQL .cpVal{color:var(--ok)}

.cpSql{margin-top:12px}
.cpSqlHead{font:700 9px/1 var(--mono); letter-spacing:.16em; text-transform:uppercase;
  color:var(--faint); margin-bottom:6px}
.cpSql pre{margin:0; padding:9px 11px; background:var(--bg2); border:1px solid var(--line);
  border-radius:5px; font-family:var(--mono); font-size:11px; line-height:1.5;
  color:var(--dim); overflow-x:auto; white-space:pre}
.cpPassages{margin-top:13px}
.cpPassage{margin-bottom:10px}
.cpPhead{font-size:11px; color:var(--dim); margin-bottom:4px}
.cpPhead b{color:var(--info); font-family:var(--mono); margin-right:5px}
.cpScore{color:var(--faint); font-family:var(--mono); font-size:10px; margin-left:7px}
.cpPassage blockquote{margin:0; padding:8px 11px; border-left:2px solid var(--line2);
  background:var(--chartbg); color:var(--dim); font-size:11.5px; line-height:1.58}

.cpSteps{margin:0; padding-left:19px; color:var(--dim); font-size:11.5px; line-height:1.6}
.cpSteps li{margin-bottom:6px}
.cpSteps b{color:var(--text)}
/* The provenance mark styles itself from css/app.css; this pane only says
   what the second, uncoloured word beside it is. It is the more important
   half of the claim on this pane — the model composes, and every number it
   composes with was computed before it was started. */
#cpRoot .cpQuoted{margin-left:9px; font:700 8.5px/1 var(--mono); letter-spacing:.12em;
  color:var(--t-lo); vertical-align:1px}
`;

function injectCSS() {
  if (document.getElementById('copilotCss')) return;
  const s = document.createElement('style');
  s.id = 'copilotCss';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/* =========================================================================
   BOOTSTRAP
   ========================================================================= */

function withdraw() {
  document.querySelectorAll('[data-view="BRIEF"]').forEach(e => e.remove());
  const s = document.querySelector('[data-pane="BRIEF"]');
  if (s) s.remove();
}

ANGEL.ready('copilot', async () => {
  /* llama.cpp's WebAssembly build requires SIMD and native exception
     handling. Neither is negotiable and neither can be polyfilled, so a
     machine without them never sees the navigation entry. */
  if (!ANGEL.caps.wasm || !HAS_SIMD() || !HAS_EH()) {
    withdraw();
    throw new Error('WebAssembly SIMD and exception handling are required');
  }

  S.probe = await probeModel();

  /* The pane is withdrawn when the weights are not there.

     This folder ships without them — they are 398 MB — so the shipped state
     of the application had a navigation entry leading to two and three
     quarter screens whose headline was THE LANGUAGE MODEL IS NOT INSTALLED.
     That is an honest pane and it was the wrong thing to put on a rail: it
     advertises a destination and then apologises, and the reviewer who
     follows it has spent a click to be told nothing works. This module's own
     idiom, applied everywhere else in it, is that a subsystem which cannot
     run deletes its own rail entry and its own section. It now applies here
     too.

     Nothing is lost. `ANGEL.get('copilot')` still publishes `installed:false`
     and the whole grounding context, so anything that wants to know can ask;
     the install instructions live in GET-MODEL.txt beside the launcher and in
     get-model.sh / get-model.ps1, which is where somebody who wants the
     model is standing. Run either script and the pane is on the rail on the
     next load with no other change anywhere.

     A file that is present but is not a GGUF is a different case and it does
     keep the pane: something is wrong with a download the operator made
     deliberately, and they need to be told, on screen, where they went
     looking for it. */
  const showPane = S.probe.present || S.probe.corrupt;

  ANGEL.views = ANGEL.views || {};
  if (showPane) ANGEL.views.BRIEF = renderBrief;

  ANGEL.provide('copilot', {
    ready: true,
    installed: S.probe.present,
    probe: S.probe,
    target: TARGET,
    threads: threadPlan(),
    /* Published so another module can obtain the same grounding context this
       pane shows, without going through the model. */
    context: q => assemble(q || null),
    draft: () => draft(),
    engine: () => S.eng
  });

  ANGEL.mark('copilot ready', {
    model: S.probe.present ? 'installed' : 'not installed',
    how: S.probe.how
  });

  if (!showPane) {
    withdraw();
    ANGEL.mark('copilot withdrawn', { why: 'no model file' });
    return S.probe;
  }

  const pane = document.querySelector('[data-pane="BRIEF"]');
  if (pane && pane.classList.contains('active')) renderBrief();

  return S.probe;
});
