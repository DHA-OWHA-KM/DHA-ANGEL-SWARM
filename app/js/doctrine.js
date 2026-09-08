/* =========================================================================
   DOCTRINE — semantic retrieval over military medical reference material.

   This is the second neural network in the application, and it is the
   opposite of a chatbot. It generates nothing. A sentence encoder turns the
   question into a 384-dimensional vector, that vector is compared against
   vectors computed at build time for every passage in the corpus, and what
   comes back is text that is physically present in a file in this folder.
   There is no decoder, no sampling, no temperature. The system cannot
   invent a citation because it has no mechanism capable of inventing one:
   the only thing it can do is point at text it was given.

   The number beside each answer is the cosine similarity between the
   question vector and the passage vector. It is shown because it is the
   honesty mechanism. A low score means the corpus does not contain a good
   answer, and the interface says so rather than returning the least-bad
   passage with a confident face on it.

   ON THE CORPUS. Every passage here is a SUMMARY written for this prototype
   from knowledge of the named publication. None of it is an extract, none of
   it carries a paragraph number, and none of it should be used to make a
   clinical or planning decision. The publications themselves could not be
   brought into this sandbox. That limitation is stated on screen, at the top
   of the pane and again against every quotation, because a fabricated
   citation in front of this audience would be worse than no citation at all.

   Model: all-MiniLM-L6-v2, 22.6 M parameters, Apache-2.0, exported to ONNX
   at opset 14 and dynamically quantised to int8. Mean pooling and L2
   normalisation are inside the graph, so the browser tokenises and does
   nothing else that could silently disagree with the build-time reference.
   ========================================================================= */

const ORT_PATH = 'vendor/ort/';
const MODEL_PATH = 'models/minilm/minilm.onnx';
const VOCAB_PATH = 'models/minilm/vocab.txt';
const TOKCFG_PATH = 'models/minilm/tokenizer.json';
const META_PATH = 'models/minilm/meta.json';
const CORPUS_PATH = 'data/doctrine.json';

/* =========================================================================
   TOKENISER

   WordPiece, written out here rather than pulled from transformers.js.

   The justification is size and blast radius, in that order. transformers.js
   is already in node_modules and would work, but bundled it is roughly 1 MB
   of JavaScript to obtain one function, it drags in its own ONNX Runtime
   loader alongside the one this application already ships, and — the part
   that actually decides it — its defaults are `allowRemoteModels = true`
   against huggingface.co. Every one of those defaults would have to be
   turned off correctly, in a build that has no internet to fail loudly
   against, for the module to stay offline. A hundred and fifty lines that
   cannot reach a network at all is the smaller risk.

   The cost of writing it is that it has to be RIGHT. The configuration below
   is emitted by train/export_minilm.py from the same tokenizer.json the
   Python reference uses, and the two implementations are diffed token by
   token over the whole corpus in train/ as part of the build. A tokeniser
   that is subtly wrong does not throw; it quietly returns worse answers.
   ========================================================================= */

/* Categories, kept as pre-compiled expressions because these run per
   character over every query. Cc/Cf/Co/Cs is the set BERT treats as control
   characters and strips outright. */
const RE_CONTROL = /[\p{Cc}\p{Cf}\p{Co}\p{Cs}]/u;
const RE_SPACE = /\s/u;
const RE_PUNCT = /\p{P}/u;
const RE_MARK = /\p{Mn}/gu;

/* BERT treats these ASCII spans as punctuation even where Unicode calls them
   symbols — $ + < = > ^ ` | ~ are split off as their own tokens. */
function isPunct(ch) {
  const cp = ch.codePointAt(0);
  if ((cp >= 33 && cp <= 47) || (cp >= 58 && cp <= 64) ||
      (cp >= 91 && cp <= 96) || (cp >= 123 && cp <= 126)) return true;
  return RE_PUNCT.test(ch);
}

function isCJK(cp) {
  return (cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF) ||
         (cp >= 0x20000 && cp <= 0x2A6DF) || (cp >= 0x2A700 && cp <= 0x2B73F) ||
         (cp >= 0x2B740 && cp <= 0x2B81F) || (cp >= 0x2B820 && cp <= 0x2CEAF) ||
         (cp >= 0xF900 && cp <= 0xFAFF) || (cp >= 0x2F800 && cp <= 0x2FA1F);
}

export class WordPiece {
  constructor(vocabText, cfg) {
    this.cfg = cfg;
    this.vocab = new Map();
    const lines = vocabText.split('\n');
    for (let i = 0; i < lines.length; i++) this.vocab.set(lines[i], i);
    this.unk = this.vocab.get(cfg.unkToken);
    this.cls = this.vocab.get(cfg.clsToken);
    this.sep = this.vocab.get(cfg.sepToken);
    if (this.unk == null || this.cls == null || this.sep == null) {
      throw new Error('vocabulary is missing a special token');
    }
    this.size = lines.length;
  }

  /* BertNormalizer, in the order the reference applies it: strip controls,
     fold whitespace, isolate CJK, decompose and drop combining marks, then
     lower-case. The accent step runs before the case step because a
     decomposed capital with an acute must lose the acute before it is
     folded, or it will not match the vocabulary entry. */
  normalise(text) {
    let out = '';
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      if (cp === 0 || cp === 0xFFFD) continue;
      const tabish = ch === '\t' || ch === '\n' || ch === '\r';
      if (!tabish && RE_CONTROL.test(ch)) continue;
      if (tabish || RE_SPACE.test(ch)) { out += ' '; continue; }
      if (this.cfg.handleChineseChars && isCJK(cp)) { out += ' ' + ch + ' '; continue; }
      out += ch;
    }
    if (this.cfg.stripAccents) out = out.normalize('NFD').replace(RE_MARK, '');
    if (this.cfg.lowercase) out = out.toLowerCase();
    return out;
  }

  /* Split on the spaces normalisation left behind, then peel punctuation off
     as separate words. "9-line" becomes 9 / - / line, which is why the
     corpus retrieves for that query at all. */
  preTokenise(norm) {
    const words = [];
    for (const chunk of norm.split(' ')) {
      if (!chunk) continue;
      let cur = '';
      for (const ch of chunk) {
        if (isPunct(ch)) {
          if (cur) { words.push(cur); cur = ''; }
          words.push(ch);
        } else cur += ch;
      }
      if (cur) words.push(cur);
    }
    return words;
  }

  /* Greedy longest-match-first. A word that cannot be covered end to end
     becomes a single [UNK] — not a partial cover, which is a common and
     silently wrong reimplementation. */
  pieces(word, out) {
    const chars = Array.from(word);
    if (chars.length > this.cfg.maxInputCharsPerWord) { out.push(this.unk); return; }
    let start = 0;
    const found = [];
    while (start < chars.length) {
      let end = chars.length;
      let id;
      while (start < end) {
        let sub = chars.slice(start, end).join('');
        if (start > 0) sub = this.cfg.continuingSubwordPrefix + sub;
        id = this.vocab.get(sub);
        if (id !== undefined) break;
        end--;
      }
      if (id === undefined) { out.push(this.unk); return; }
      found.push(id);
      start = end;
    }
    for (const id of found) out.push(id);
  }

  /* [CLS] … [SEP], truncated to the length the model was exported against.
     Truncation counts the special tokens, matching the reference. */
  encode(text) {
    const words = this.preTokenise(this.normalise(text));
    const ids = [];
    for (const w of words) {
      this.pieces(w, ids);
      if (ids.length >= this.cfg.maxLen - 2) break;
    }
    ids.length = Math.min(ids.length, this.cfg.maxLen - 2);
    return [this.cls, ...ids, this.sep];
  }
}

/* =========================================================================
   VECTORS

   The corpus vectors are computed once, at build time, by the same ONNX
   graph the browser runs. They ship as int8 with a float32 scale per vector:
   161 passages and 499 sentences at 384 dimensions is 248 KB that way
   against about 1 MB as float32, and the measured cost is a minimum cosine
   of 0.99994 against the unquantised vectors — four decimal places below a
   difference that could reorder a result.

   At runtime this leaves exactly one embedding to compute: the query.
   ========================================================================= */

function b64Bytes(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* Undo the int8 quantisation and re-normalise, so a similarity is a plain
   dot product with no per-query division. */
function dequantise(block, dim) {
  const q = new Int8Array(b64Bytes(block.q).buffer);
  const sb = b64Bytes(block.s);
  const scale = new Float32Array(sb.buffer, sb.byteOffset, sb.byteLength / 4);
  const n = scale.length;
  const V = new Float32Array(n * dim);
  for (let i = 0; i < n; i++) {
    const o = i * dim;
    const k = scale[i];
    let ss = 0;
    for (let d = 0; d < dim; d++) { const v = q[o + d] * k; V[o + d] = v; ss += v * v; }
    const inv = 1 / Math.max(Math.sqrt(ss), 1e-12);
    for (let d = 0; d < dim; d++) V[o + d] *= inv;
  }
  return { V, n };
}

function dot(A, ao, B, bo, dim) {
  let s = 0;
  for (let d = 0; d < dim; d++) s += A[ao + d] * B[bo + d];
  return s;
}

/* =========================================================================
   ENGINE
   ========================================================================= */

class DoctrineIndex {
  constructor() {
    this.session = null;
    this.tok = null;
    this.doc = null;
    this.meta = null;
    this.lat = [];        // rolling query-embedding latencies, ms
    this.queries = 0;
  }

  async load() {
    const t0 = performance.now();

    const [vocabText, tokcfg, doc, meta] = await Promise.all([
      fetch(ANGEL.asset(VOCAB_PATH), { cache: 'force-cache' }).then(r => {
        if (!r.ok) throw new Error('vocab → HTTP ' + r.status);
        return r.text();
      }),
      ANGEL.fetchJSON(TOKCFG_PATH),
      ANGEL.fetchJSON(CORPUS_PATH),
      ANGEL.fetchJSON(META_PATH)
    ]);

    this.tok = new WordPiece(vocabText, tokcfg);
    this.doc = doc;
    this.meta = meta;
    this.dim = doc.dim;

    const P = dequantise(doc.pv, this.dim);
    const S = dequantise(doc.sv, this.dim);
    this.PV = P.V; this.SV = S.V;
    this.owner = doc.sentOwner;

    // sentence rows belonging to each passage, so the re-rank is a lookup
    // rather than a scan of five hundred vectors per hit.
    this.sentOf = doc.passages.map(() => []);
    for (let i = 0; i < this.owner.length; i++) this.sentOf[this.owner[i]].push(i);

    const ort = this.ort = await import(ANGEL.asset(ORT_PATH + 'ort.wasm.bundle.min.mjs'));
    // Absolute, for the same reason as in device.js: wasmPaths resolves
    // against the module URL rather than the page.
    ort.env.wasm.wasmPaths = ANGEL.asset(ORT_PATH);
    ort.env.wasm.numThreads = 1;   // no cross-origin isolation, so no threads
    ort.env.logLevel = 'error';

    this.session = await ort.InferenceSession.create(
      ANGEL.asset(MODEL_PATH), { executionProviders: ['wasm'] });

    // One warm pass. The first inference through ORT includes kernel
    // selection and arena allocation, and reporting that number as the
    // query latency would flatter or slander the model depending on when
    // the operator happened to type.
    await this.embed('warm up the session');
    this.lat.length = 0;
    this.loadMs = performance.now() - t0;
    ANGEL.mark('doctrine loaded', {
      ms: Math.round(this.loadMs),
      passages: doc.passages.length
    });
    return this;
  }

  /* One query vector. Batch of one: the corpus side was done at build time. */
  async embed(text) {
    const ids = this.tok.encode(text);
    const n = ids.length;
    const idArr = new BigInt64Array(n);
    const amArr = new BigInt64Array(n);
    for (let i = 0; i < n; i++) { idArr[i] = BigInt(ids[i]); amArr[i] = 1n; }
    const T = this.ort.Tensor;
    const t0 = performance.now();
    const out = await this.session.run({
      input_ids: new T('int64', idArr, [1, n]),
      attention_mask: new T('int64', amArr, [1, n])
    });
    const ms = performance.now() - t0;
    this.lat.push(ms); if (this.lat.length > 200) this.lat.shift();
    this.lastMs = ms;
    this.lastTokens = n;
    return out.embedding.data;   // already mean-pooled and L2-normalised
  }

  /* Retrieve. Passage similarity first, then the sentence re-rank INSIDE the
     winning passages — the headline is one sentence, the context is the
     passage it came from, and both are quoted rather than described. */
  async search(query, k) {
    if (!query || !query.trim()) return { query: '', hits: [], ms: 0 };
    k = k || 5;
    const t0 = performance.now();
    const qv = await this.embed(query);
    const dim = this.dim;
    const P = this.doc.passages;

    const order = new Array(P.length);
    for (let i = 0; i < P.length; i++) order[i] = [i, dot(qv, 0, this.PV, i * dim, dim)];
    order.sort((a, b) => b[1] - a[1]);

    const hits = [];
    for (let r = 0; r < Math.min(k, order.length); r++) {
      const [i, score] = order[r];
      const p = P[i];
      let best = -2, bestJ = -1;
      for (const j of this.sentOf[i]) {
        const s = dot(qv, 0, this.SV, j * dim, dim);
        if (s > best) { best = s; bestJ = j; }
      }
      const span = p.sent[this.sentOf[i].indexOf(bestJ)] || [0, p.text.length];
      hits.push({
        id: p.id, pub: p.pub, section: p.section, tags: p.tags,
        text: p.text, score,
        sentence: p.text.slice(span[0], span[1]),
        span, sentenceScore: best
      });
    }
    const ms = performance.now() - t0;
    this.queries++;
    return { query, hits, ms, embedMs: this.lastMs, tokens: this.lastTokens };
  }

  percentile(p) {
    if (!this.lat.length) return 0;
    const s = this.lat.slice().sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(s.length * p))];
  }
}

/* =========================================================================
   VIEW
   ========================================================================= */

/* Questions a medical officer would actually ask, in the words they would
   actually use. Two of them are deliberately awkward — the corpus is not
   uniformly strong and the presets should not hide that. */
/* Five, not nine. A row of chips is an invitation to try one, and nine of
   them is a paragraph of questions above the answer they are meant to
   produce. These five span the corpus: blood handling, the TCCC sequence,
   evacuation precedence, the drug with a clock on it, and the policy this
   whole application argues with. */
const PRESETS = [
  'How long can whole blood stay out of refrigeration?',
  'What is the MARCH sequence?',
  'When is a casualty categorised URGENT?',
  'How long after wounding can TXA still be given?',
  'What is the Golden Hour policy and where did it come from?'
];

/* Below this the interface says the corpus does not answer the question
   rather than presenting its best guess as an answer. Set from the observed
   floor of the build-time evaluation: correct answers in that set score from
   0.43 upward, and the retrievals that fall under 0.35 are the ones where
   the corpus genuinely has nothing. */
const WEAK = 0.35;

const CSS = `
.docWrap{display:flex; flex-direction:column; gap:12px; min-height:0}
.docWarn{
  border:1px solid var(--warn); border-left-width:3px; border-radius:8px;
  background:rgba(255,179,64,.07); padding:10px 13px;
}
.docWarn b{color:var(--warn); font:700 10px/1.6 var(--mono); letter-spacing:.09em}
.docWarn p{margin:3px 0 0; font:400 11.5px/1.6 var(--sans); color:var(--dim); max-width:92ch}
.docBar{display:flex; align-items:center; gap:8px; flex-wrap:wrap}
.docBar .search{width:min(560px,100%); font-size:12.5px; padding:10px 13px}
.docPresets{display:flex; flex-wrap:wrap; gap:6px}
.docPresets .chip{
  border:1px solid var(--line); background:var(--panel); text-transform:none;
  font:500 10.5px/1.4 var(--sans); letter-spacing:.01em; padding:5px 10px;
}
.docStat{display:flex; gap:18px; flex-wrap:wrap; align-items:baseline;
  font:500 10.5px/1.5 var(--mono); color:var(--faint); letter-spacing:.04em}
.docStat b{color:var(--text); font-weight:700}
.docGrid{display:grid; grid-template-columns:minmax(0,1.55fr) minmax(300px,1fr);
  gap:12px; align-items:start}
@media (max-width:1180px){.docGrid{grid-template-columns:minmax(0,1fr)}}
.docBody{padding:12px 14px}
.docLead{
  font:600 15.5px/1.62 var(--sans); color:var(--text); margin:0;
  border-left:3px solid var(--angel); padding-left:12px;
}
.docCtx{margin:10px 0 0; font:400 12px/1.68 var(--sans); color:var(--dim); max-width:88ch}
.docCtx mark{background:rgba(49,214,138,.16); color:var(--text); padding:1px 0; border-radius:2px}
.docSrc{
  display:flex; gap:10px; align-items:baseline; flex-wrap:wrap; margin-top:11px;
  padding-top:9px; border-top:1px solid var(--line);
  font:500 10.5px/1.5 var(--mono); color:var(--faint); letter-spacing:.04em;
}
.docSrc .pub{color:var(--text); font-weight:700}
.docSrc .sum{color:var(--warn)}
.docScore{margin-left:auto; display:flex; gap:12px; align-items:baseline}
.docScore b{color:var(--info); font-weight:700; font-size:12px}
.docHit{padding:11px 14px; border-top:1px solid var(--line)}
.docHit:first-child{border-top:0}
.docHit .q{margin:0; font:500 12.5px/1.6 var(--sans); color:var(--text)}
.docHit .q em{font-style:normal; color:var(--faint)}
.docHit .m{margin:5px 0 0; display:flex; gap:10px; flex-wrap:wrap; align-items:baseline;
  font:500 10px/1.5 var(--mono); color:var(--faint); letter-spacing:.04em}
.docHit .m .pub{color:var(--dim)}
.docHit .m .sc{margin-left:auto; color:var(--info); font-weight:700}
.docHit:hover{background:var(--panel2); cursor:pointer}
.docNone{padding:14px; font:400 12px/1.65 var(--sans); color:var(--dim)}
/* The AI mark says a model produced this ranking. This second word says what
   the model was NOT allowed to do, which is the more important half of the
   claim on this pane: the sentence above it is quoted, character for
   character, out of a file in this folder. --t-lo on --k1/--k2 is the text
   ramp; it makes no colour claim and it must not read as a status chip. */
.docQuoted{margin-left:9px; font:700 8.5px/1 var(--mono); letter-spacing:.12em;
  color:var(--t-lo); vertical-align:1px}
.docLinkMark{display:inline-block; vertical-align:middle}
.docLinkMark .pMark{margin-left:8px !important}
.docNone b{color:var(--warn)}
.docBusy{padding:14px; font:500 11px/1.5 var(--mono); color:var(--faint)}
.docTags{display:flex; gap:5px; flex-wrap:wrap; margin-top:8px}
.docTags span{
  font:500 9.5px/1 var(--mono); letter-spacing:.05em; color:var(--faint);
  border:1px solid var(--line); border-radius:4px; padding:3px 6px;
}
.docMiss{margin:0; padding:0 16px 14px; list-style:none}
.docMiss li{
  font:400 11px/1.55 var(--sans); color:var(--dim);
  padding:5px 0; border-top:1px solid var(--line);
}
.docMiss li:first-child{border-top:0}
.docMiss b{color:var(--text); font-weight:600}
.docMiss .r{font:600 10px/1 var(--mono); color:var(--warn); letter-spacing:.05em}
.docLink{
  display:inline-block; margin-top:2px; font:600 10.5px/1.5 var(--sans);
  color:var(--info); cursor:pointer; border-bottom:1px dotted currentColor;
}
.docLink:hover{color:var(--text)}
`;

function injectCSS() {
  if (document.getElementById('doctrineCss')) return;
  const s = document.createElement('style');
  s.id = 'doctrineCss';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

let IDX = null;
let LAST = null;      // last result set, so a repaint does not re-run the model
let BUSY = false;

/* The passage with the matched sentence marked inside it. The span comes
   from the build, not from a runtime split, so the highlight is guaranteed
   to land on a sentence boundary rather than one word off it. */
/* The provenance mark. Owned by js/app.js — the component, the registry of
   the four models in this system, and the hover panel that answers "what is
   it and how do you know it works" without a conversation. `prov()` is a
   top-level declaration in a classic script, so it is on the global object
   before any function in this module runs; guarded regardless, because a
   missing badge must never cost a reviewer the answer itself.

   RETRIEVAL is the encoder. It is machine learning and it is marked as such —
   but the pane's whole argument is that the encoder ranks and never writes,
   so the mark sits on the retrieval, not on the words, and the words keep
   saying NOT GENERATED beside it. */
const mark = (k, d) => (typeof window.prov === 'function' ? window.prov(k, d) : '');

function passageHTML(h) {
  const [a, b] = h.span;
  return esc(h.text.slice(0, a)) + '<mark>' + esc(h.text.slice(a, b)) + '</mark>' +
         esc(h.text.slice(b));
}

function answerHTML(r) {
  if (!r || !r.hits.length) return '';
  const top = r.hits[0];
  if (top.score < WEAK) {
    return `<div class="card"><div class="cardHead">No answer in this corpus
      ${mark('RETRIEVAL', 'the encoder scored every passage and the best of them fell below the floor, so it is declining rather than answering')}</div>
      <div class="docNone" data-nofold>Best score <b>${top.score.toFixed(3)}</b> &mdash; below the
        ${WEAK.toFixed(2)} floor. This corpus does not cover the question. Closest passages, with
        their scores, below.</div></div>`;
  }
  return `<div class="card">
      <div class="cardHead">Closest sentence in the corpus
        ${mark('RETRIEVAL', 'the encoder ranked this passage and then this sentence inside it \u2014 the words are quoted from the corpus, not generated')}
        <span class="docQuoted">RETRIEVED &middot; NOT GENERATED</span></div>
      <div class="docBody">
        <p class="docLead" data-nofold>${esc(top.sentence)}</p>
        <p class="docCtx" data-fold-label="the passage it came from">${passageHTML(top)}</p>
        <div class="docTags">${top.tags.map(t => '<span>' + esc(t) + '</span>').join('')}</div>
        <div class="docSrc" data-nofold>
          <span class="pub">${esc(top.pub)}</span>
          <span>${esc(top.section)}</span>
          <span class="mono">${esc(top.id)}</span>
          <span class="sum">SUMMARY — NOT AN EXTRACT</span>
          <span class="docScore">
            <span>passage <b>${top.score.toFixed(3)}</b></span>
            <span>sentence <b>${top.sentenceScore.toFixed(3)}</b></span>
          </span>
        </div>
      </div>
    </div>`;
}

function hitsHTML(r) {
  if (!r || !r.hits.length) return '';
  const rest = r.hits.slice(1);
  if (!rest.length) return '';
  /* The headline answer is the answer. The rest of the ranking is evidence
     that the ranking is a ranking — worth having, not worth reading first. */
  return `<div class="card">
      <div class="cardHead">Also matched</div>
      <details class="disc"><summary><b>${rest.length}</b><b class="q">more passages scored, ${rest[0].score.toFixed(3)} down to ${rest[rest.length - 1].score.toFixed(3)} &mdash; press one to promote it</b></summary>
      ${rest.map((h, i) => `<div class="docHit" data-hit="${i + 1}">
        <p class="q" data-nofold>${esc(h.sentence)}</p>
        <p class="m"><span class="pub">${esc(h.pub)}</span>
          <span>${esc(h.section)}</span>
          <span class="mono">${esc(h.id)}</span>
          <span class="sc">${h.score.toFixed(3)}</span></p>
      </div>`).join('')}
      </details>
    </div>`;
}

function statLine(r) {
  const n = IDX.doc.passages.length;
  const s = IDX.owner.length;
  /* The corpus size, the sentence count and the median search all sit in the
     strip above this line already. Restating them here is the same four
     numbers twice; what belongs here is what THIS query cost. */
  const bits = [];
  if (r) {
    bits.push(`<span>embed <b>${r.embedMs.toFixed(1)} ms</b> · ${r.tokens} tokens</span>`);
    bits.push(`<span>search <b>${r.ms.toFixed(1)} ms</b></span>`);
  } else {
    bits.push(`<span>corpus <b>${n}</b> passages · <b>${s}</b> sentences · <b>${IDX.doc.publications.length}</b> publications</span>`);
  }
  if (IDX.lat.length) bits.push(`<span>p50 <b>${IDX.percentile(0.5).toFixed(1)} ms</b> · ${IDX.queries} ${IDX.queries === 1 ? 'query' : 'queries'}</span>`);
  bits.push(`<span>model load <b>${(IDX.loadMs / 1000).toFixed(1)} s</b></span>`);
  return bits.join('');
}

function modelCard() {
  const m = IDX.meta || {};
  const q = m.quality || {};
  const ev = IDX.doc.eval || {};
  const misses = (ev.misses || []).slice(0, 4);
  return `
    <div class="card">
      <div class="cardHead">The model ${mark('RETRIEVAL')}</div>
      <details class="disc"><summary><b>all-MiniLM-L6-v2</b><b class="q">${(m.parameters || 0).toLocaleString()} parameters &middot; ${((m.onnx_int8_bytes || 0) / 1e6).toFixed(1)} MB on this machine</b></summary>
      <table class="kv">
        <tr><td>Encoder</td><td>all-MiniLM-L6-v2, 6-layer sentence transformer</td></tr>
        <tr><td>Parameters</td><td>${(m.parameters || 0).toLocaleString()}</td></tr>
        <tr><td>Licence</td><td>${esc(m.licence || '')}</td></tr>
        <tr><td>File</td><td>${((m.onnx_int8_bytes || 0) / 1e6).toFixed(1)} MB int8 ONNX,
          from ${((m.onnx_fp32_bytes || 0) / 1e6).toFixed(0)} MB fp32, opset ${m.opset || '—'}</td></tr>
        <tr><td>Output</td><td>${m.dim || 384}-d unit vector, pooled and normalised in-graph</td></tr>
        <tr><td>Runs on</td><td>CPU. One query embedding per search.</td></tr>
      </table>
      <p class="senseProv">${esc(m.source || '')}</p>
      </details>
    </div>

    <div class="card">
      <div class="cardHead">Did the export survive?</div>
      <details class="disc"><summary><b>${(q.pair_similarity_max_abs_delta || 0).toFixed(4)}</b><b class="q">worst-case shift in the similarity between a pair of sentences</b></summary>
      <table class="kv">
        <tr><td>Torch vs fp32 ONNX</td><td><b>${(q.torch_vs_onnx_fp32_min_cos || 0).toFixed(6)}</b> min cosine</td></tr>
        <tr><td>fp32 vs int8 ONNX</td><td>${(q.onnx_fp32_vs_int8_min_cos || 0).toFixed(4)} min,
          ${(q.onnx_fp32_vs_int8_mean_cos || 0).toFixed(4)} mean</td></tr>
        <tr class="kvHi"><td>Pair similarity shift</td><td>${(q.pair_similarity_max_abs_delta || 0).toFixed(4)} worst case</td></tr>
        <tr><td>int8 corpus vectors</td><td>${(q.passage_quant_min_cos || 0).toFixed(5)} min cosine</td></tr>
      </table>
      <p class="senseProv" data-fold-label="why the third row is the one that matters">Quantisation
        moves an individual vector by up to three per cent, but retrieval depends on the ORDER of
        similarities, not their absolute value. The similarity between a pair of sentences shifts by
        at most ${(q.pair_similarity_max_abs_delta || 0).toFixed(3)}, measured, not assumed.</p>
      </details>
    </div>

    <div class="card">
      <div class="cardHead">Retrieval, measured</div>
      <details class="disc"><summary><b>${ev.top1 || 0} / ${ev.n || 0}</b><b class="q">correct passage first, on questions written before any tuning</b></summary>
      <table class="kv">
        <tr><td>Evaluation questions</td><td>${ev.n || 0}, written before any tuning</td></tr>
        <tr><td>Correct passage first</td><td><b>${ev.top1 || 0} / ${ev.n || 0}</b></td></tr>
        <tr><td>Correct passage in top five</td><td><b>${ev.top5 || 0} / ${ev.n || 0}</b></td></tr>
      </table>
      <p class="senseProv" data-fold-label="where it fails">Most misses put a neighbouring passage
        from the same publication and section first &mdash; a near-miss a reader recovers from in one
        glance. The exception below is a real defect.</p>
      <ul class="docMiss">${misses.map(m2 =>
        `<li><b>${esc(m2.q)}</b><br><span class="r">rank ${m2.rank}</span> —
         wanted ${esc(m2.wanted)}, returned ${esc(m2.got)}</li>`).join('')}</ul>
      </details>
    </div>

    <div class="card">
      <div class="cardHead">Where this corpus is thin</div>
      <p class="senseProv" data-fold-label="what it covers and what it does not">It covers TCCC, damage control resuscitation, blood handling and cold
        chain, evacuation precedence and the nine-line, roles of care, medical logistics, the
        Golden Hour policy and unmanned resupply, at summary depth. It does NOT cover paediatric
        or host-nation care, chemical and biological casualty management, burns beyond a single
        passage, veterinary or dental support, or anything below the level of a section heading.
        A question outside that range should return a low score, and that is the behaviour to
        test it with rather than the questions it answers well.</p>
    </div>`;
}

function paint() {
  const host = document.getElementById('doctrineBody');
  if (!host) return;
  const ans = document.getElementById('docAnswer');
  if (!ans) return;
  ans.innerHTML = BUSY
    ? '<div class="card"><div class="docBusy">Embedding the question…</div></div>'
    : (answerHTML(LAST) + hitsHTML(LAST));
  const st = document.getElementById('docStat');
  if (st) st.innerHTML = statLine(LAST);
}

/* A CONTROL THAT SILENTLY DECLINES IS A CONTROL THAT LOOKS BROKEN.

   This returned on the first line while a search was in flight — no queued
   question, no disabled state, no acknowledgement. Press a preset chip while
   the encoder is working and nothing whatsoever happened, which from the
   outside is indistinguishable from a dead button. Two changes: the chips
   are visibly disabled for the ~200ms the encoder holds the thread, so the
   refusal is stated rather than mimed; and the last question pressed during
   that window is remembered and run when the thread comes back, so a press
   is never simply discarded. */
let QUEUED = null;

function setChipsBusy(on) {
  document.querySelectorAll('#docPresets [data-docq], .docChip').forEach(el => {
    el.classList.toggle('docBusy', !!on);
    if (el.tagName === 'BUTTON') el.disabled = !!on;
    el.setAttribute('aria-disabled', String(!!on));
  });
}

async function run(q) {
  if (!IDX) return;
  if (BUSY) { QUEUED = q; return; }
  const box = document.getElementById('docQ');
  if (box && box.value !== q) box.value = q;
  BUSY = true; setChipsBusy(true); paint();
  try {
    LAST = await IDX.search(q, 6);
  } catch (e) {
    LAST = null;
    console.warn('[doctrine] ' + e);
  }
  BUSY = false; setChipsBusy(false);
  paint();
  if (QUEUED !== null) { const nxt = QUEUED; QUEUED = null; run(nxt); }
}

function renderDoctrine() {
  const host = document.getElementById('doctrineBody');
  if (!host) return;

  if (!IDX) {
    const st = ANGEL.status.get('doctrine');
    host.innerHTML = '<div class="card"><div class="cardHead">Retrieval unavailable</div>' +
      '<div class="docNone">The sentence encoder did not load' +
      (st && st.note ? ': <code>' + esc(st.note) + '</code>' : '.') +
      '</div></div>';
    return;
  }

  // Already built. A question arriving from the casualty drawer still has to
  // be honoured here, because the host switches the pane before this runs.
  if (host.querySelector('#docQ')) {
    if (PENDING) { const q = PENDING; PENDING = null; run(q); }
    else paint();
    return;
  }

  host.innerHTML = `
    <div class="docWrap">
      <div class="docWarn">
        <b>SUMMARIES, NOT EXTRACTS</b>
        <p data-fold-label="what that means">Written for this prototype from the publication named
          against each passage. None is an extract, none carries a paragraph number, and none has
          been checked against a current edition; operational use requires the publication itself.
          What the system does guarantee is narrower: every word it returns is physically present
          in <code>app/data/doctrine.json</code>, quoted exactly, with the similarity score that
          produced it. It cannot generate a sentence, so it cannot invent one.</p>
      </div>

      <div class="docBar">
        <input id="docQ" class="search" type="search" autocomplete="off"
               placeholder="Ask in plain English — how long can whole blood stay out of the fridge?">
        <button class="btn ok" id="docGo">Search</button>
      </div>
      <div class="docPresets" id="docPre">
        ${PRESETS.map(p => `<span class="chip" data-q="${esc(p)}">${esc(p)}</span>`).join('')}
      </div>
      <div class="docStat" id="docStat">${statLine(null)}</div>

      <div class="docGrid">
        <div id="docAnswer"></div>
        <div style="display:flex; flex-direction:column; gap:12px">${modelCard()}</div>
      </div>
    </div>`;

  const box = host.querySelector('#docQ');
  box.addEventListener('keydown', e => { if (e.key === 'Enter') run(box.value); });
  host.querySelector('#docGo').addEventListener('click', () => run(box.value));
  host.querySelector('#docPre').addEventListener('click', e => {
    const c = e.target.closest('[data-q]');
    if (c) run(c.dataset.q);
  });
  // Promoting an "also matched" hit to the headline costs nothing — the
  // result set is already in hand, so no inference runs.
  host.querySelector('#docAnswer').addEventListener('click', e => {
    const c = e.target.closest('[data-hit]');
    if (!c || !LAST) return;
    const i = +c.dataset.hit;
    LAST = { ...LAST, hits: [LAST.hits[i], ...LAST.hits.filter((_, j) => j !== i)] };
    paint();
  });

  if (PENDING) { const q = PENDING; PENDING = null; run(q); }
  else if (!LAST) run(PRESETS[0]);
  else paint();
}

/* =========================================================================
   WIRING INTO THE APPLICATION

   One line, in the casualty drawer, under what the wound clinically
   indicates. A medical officer looking at "WHOLE BLOOD › TXA" and wondering
   what the standing guidance says should not have to retype the question,
   and equally should not have the pane taken over by something they did not
   ask for. It is a link, and it is the only place this subsystem touches the
   rest of the interface.
   ========================================================================= */

/* The wording of each question was chosen by measuring what it retrieves,
   not by guessing. "When should whole blood be transfused" returns the
   transfusion-reaction passage; the phrasing below returns the passage that
   states the preference, at 0.84 instead of 0.69. The corpus is fixed, so
   the only lever is the question, and it is worth pulling. */
const NEED_QUERY = {
  BLOOD: 'Is whole blood or component therapy preferred for haemorrhagic shock?',
  PLASMA: 'How is freeze-dried plasma stored and reconstituted?',
  TXA: 'How long after wounding can tranexamic acid still be given?',
  TQ_KIT: 'How do I apply a tourniquet to a bleeding limb?',
  CHEST_SEAL: 'How is a tension pneumothorax treated in the field?'
};

let PENDING = null;

function goToDoctrine(q) {
  PENDING = q;
  const nav = document.querySelector('[data-view="DOCTRINE"]');
  if (nav) nav.click();          // uses the application's own view switch
  else renderDoctrine();
}

/* The host application rebuilds the drawer wholesale several times a second,
   so anything appended to it is a node with a short life. The link is
   therefore re-inserted on mutation, and the click is handled by ONE
   delegated listener on the drawer itself rather than by a listener on the
   link — a handler bound to a node that is about to be replaced is a handler
   that intermittently does nothing. The query travels in a data attribute so
   the delegate needs no closure over the casualty. */
function watchDrawer() {
  const drawer = document.getElementById('drawer');
  if (!drawer) return;

  const attach = () => {
    if (!IDX) return;
    // `APP` is a top-level `const` in a classic script: it lives in the
    // global lexical scope and is reachable by bare name, but it is NOT a
    // property of `window`. Reading it as `window.APP` returns undefined and
    // fails silently, which is exactly how this was first written.
    if (typeof APP === 'undefined') return;
    const sel = APP.sel;
    if (!sel || sel.kind !== 'cas' || !APP.armA) return;
    const c = APP.armA.casualties.find(k => k.id === sel.id);
    const q = c && c.needs && NEED_QUERY[c.needs[0]];
    if (!q) return;
    for (const cell of drawer.querySelectorAll('.dwCell.wide')) {
      const lab = cell.querySelector('span');
      if (!lab || lab.textContent.trim() !== 'Clinically indicated') continue;
      if (cell.querySelector('.docLink')) return;
      const a = document.createElement('a');
      a.className = 'docLink';
      a.dataset.docq = q;
      a.title = q;
      a.textContent = 'What the doctrine says →';
      cell.appendChild(a);
      /* The link goes to a retrieval, so it carries the retrieval's mark.
         Written as a sibling rather than inside the anchor: pressing a
         provenance mark opens the model inventory, and nesting it in the link
         would make one of those two intentions unreachable. */
      const badge = mark('RETRIEVAL', 'this opens a search of the corpus for what this casualty needs \u2014 the encoder ranks the passages and the answer is quoted, not written');
      if (badge) {
        const w = document.createElement('span');
        w.className = 'docLinkMark';
        w.innerHTML = badge;
        cell.appendChild(w);
      }
      return;
    }
  };

  /* pointerdown, not click. The drawer is replaced roughly twice a second
     while the mission runs, and a `click` only fires if the element survives
     from press to release — so a link inside a container on that cadence
     swallows a real fraction of presses. Acting on the press is the correct
     behaviour for a control that is being rebuilt underneath the cursor. */
  drawer.addEventListener('pointerdown', ev => {
    const a = ev.target.closest && ev.target.closest('.docLink');
    if (!a) return;
    ev.stopPropagation();
    ev.preventDefault();
    goToDoctrine(a.dataset.docq);
  });
  new MutationObserver(attach).observe(drawer, { childList: true, subtree: true });
  attach();
}

/* =========================================================================
   BOOTSTRAP
   ========================================================================= */

function withdraw() {
  document.querySelectorAll('[data-view="DOCTRINE"]').forEach(e => e.remove());
  const s = document.querySelector('[data-pane="DOCTRINE"]');
  if (s) s.remove();
}

ANGEL.ready('doctrine', async () => {
  // No WebAssembly means no encoder. Withdraw the control rather than leave
  // a navigation entry that throws when a judge clicks it.
  if (!ANGEL.caps.wasm) { withdraw(); throw new Error('WebAssembly unavailable'); }

  injectCSS();
  const idx = new DoctrineIndex();
  await idx.load();
  IDX = idx;

  ANGEL.views = ANGEL.views || {};
  ANGEL.views.DOCTRINE = renderDoctrine;

  /* Published for other modules — the copilot grounds its answers in these
     passages rather than in anything it produces itself. `search` returns
     quoted corpus text and a score; a consumer that cannot show the score
     should not be using it. */
  ANGEL.provide('doctrine', {
    ready: true,
    /* The encoder's own metadata — parameters, licence, the held-out
       retrieval scores and what quantisation cost. The model inventory in
       "Model & sources" reads its MiniLM row out of this rather than
       carrying a second copy of the numbers that could drift from it. */
    meta: idx.meta,
    /* The drawer's own link is wired by watchDrawer() below. These two are
       the same capability offered to any other surface that shows a
       casualty's needs — the left inspector uses them — so the question
       wording stays in one place instead of being retyped somewhere it can
       drift from the corpus it was measured against. */
    ask: goToDoctrine,
    needQuery: k => NEED_QUERY[k] || null,
    search: (q, k) => idx.search(q, k || 5),
    passages: idx.doc.passages,
    publications: idx.doc.publications,
    disclaimer: idx.doc.note,
    stats: () => ({
      passages: idx.doc.passages.length,
      sentences: idx.owner.length,
      queries: idx.queries,
      p50ms: idx.percentile(0.5)
    })
  });

  watchDrawer();

  // If the operator is already standing on the pane when the model finishes
  // loading, replace the placeholder without waiting for the next repaint.
  const pane = document.querySelector('[data-pane="DOCTRINE"]');
  if (pane && pane.classList.contains('active')) renderDoctrine();

  return idx;
});
