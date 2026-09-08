# SPEC INPUT — Models, analysis, data, ingest, maps, provenance, roles

Factual inventory of everything at `/home/claude/angel/app` **except** the simulation
engine (`sim.js`, `optimizer.js` step loop, `app.js` lifecycle), which a parallel
document covers. Every claim below cites a file and line. Where a figure on screen
cannot be traced to a source in the repository it is called out explicitly in
**§9 UNTRACEABLE AND CONTRADICTED CLAIMS** — a designer must not enshrine those.

Verified against the running dev server at `http://127.0.0.1:8791`.

---

## 0. THE HEADLINE FINDING A DESIGNER MUST KNOW FIRST

**CRI-Net's output does not reach the tasking path.** It is confined to one pane.

- `js/device.js:269` emits `ANGEL.emit('cri', r)`. **Nothing listens.** The only
  `ANGEL.on(...)` registrations in the codebase are for `map3d-ready`, `theme`,
  `role`, `status` and `view` (`js/app.js:1250,4682,4739`; `js/geo3d.js:3654`;
  `js/inspector.js:1514`; `js/map.js:171`; `js/page-kpi.js:764`; `js/role-surgeon.js:1675`;
  `js/theater3d.js:1945`).
- The only two consumers of `ANGEL.get('cri-net')` are the model-inventory sheet
  (`js/app.js:5385`) and a KPI strip (`js/page-kpi.js:383`). Both read the model's
  *metadata*, not its inference output.
- Every casualty's compensatory reserve on every other screen comes from
  `casualty.crmAt(t)` — a linear ramp, `js/sim.js:678-680`:
  `frac = 1 - (t - tInjury) / deadlineMin; return frac * 100`.
- Every physiological deadline comes from a normal draw at casualty creation,
  `js/sim.js:647-651`.
- The single writer of the value the optimiser reads is `js/optimizer.js:809`
  (`c.knownCrm = vv`), fed from `c.crmAt(tNow)` or from live CoT telemetry — never
  from the ONNX network.

Consequently the following on-screen strings are **false as written** and are listed
again in §9: `js/app.js:5403` ("Produces every casualty's physiological deadline …
the only learned quantity that reaches a tasking decision"), `js/app.js:5649`
(CASUALTIES: "every compensatory reserve and every collapse time in this table is a
CRI-Net estimate"), `js/app.js:5659` (MISSION: "the collapse time each soldier is
tasked against is a CRI-Net estimate"), and the ~14 selector rules at
`js/app.js:5768-5884` that stamp the CRI mark on any table header matching
`/collapse in|compensatory reserve|time to collapse/i`.

What *is* true and demonstrable: on the SENSOR pane the simulation renders a
photoplethysmogram with a known ground truth, the ONNX network reads the reserve
back out of that waveform without seeing the truth, and both are drawn together.
That is a genuine, self-contained demonstration of the model. It is not wired to
tasking.

---

## 1. THE TRAINED MODELS

Three models ship or are referenced. The application's own inventory calls it "four
sets of learned weights" (`js/app.js:5397-5462`) by counting CRI-Net's regression
head and its variance head as two entries; they are one 419,797-byte ONNX file.

### 1.1 Summary table

| | CRI-Net | all-MiniLM-L6-v2 | Qwen2.5-0.5B-Instruct |
|---|---|---|---|
| PROV key | `CRI` + `TRUST` | `RETRIEVAL` | `LLM` |
| Module | `js/device.js` | `js/doctrine.js` | `js/copilot.js` |
| Architecture | 1-D CNN, 5 strided conv blocks + 2-layer head | 6-layer sentence transformer, encoder only | decoder-only transformer |
| Parameters | 104,162 (`models/ppg_cri.meta.json`) | 22,565,376 (`models/minilm/meta.json`) | 494 M (claimed, `js/copilot.js:70`) |
| Weights file | `app/models/ppg_cri.onnx` | `app/models/minilm/minilm.onnx` | `app/models/llm.gguf` |
| Size on disk | 419,797 B (410 KB) — **verified** | 22,898,176 B (22.9 MB) — **verified** | 398 MB claimed — **file absent** |
| Format | ONNX, opset 13, fp32 | ONNX, opset 14, dynamic int8 | GGUF, Q4_K_M |
| Ships in folder? | **Yes** | **Yes** | **No** — fetched by `get-model.sh` / `get-model.ps1` |
| Runtime | ONNX Runtime Web (`app/vendor/ort/`), WASM, 1 thread | same ORT instance, WASM, 1 thread | wllama 3.5.1 = llama.cpp→WASM (`app/vendor/wllama/`) |
| Device | CPU only | CPU only | CPU only, `n_gpu_layers: 0` |
| Licence | trained for this prototype; ships with it | Apache-2.0 | Apache-2.0 (not redistributed) |

Confirmed absent on this checkout: `ls app/models/` returns only `minilm/`,
`ppg_cri.meta.json`, `ppg_cri.onnx`, `ppg_traces.json`. **There is no `llm.gguf`, so
the BRIEF pane and its rail entry are withdrawn in the shipped state**
(`js/copilot.js:1413,1439-1443`).

### 1.2 CRI-Net — the compensatory-reserve network

**What it is.** A 1-D convolutional network that reads five seconds of
photoplethysmogram and estimates the Compensatory Reserve Index — the fraction of an
individual's capacity to compensate for central volume loss that remains before
haemodynamic decompensation. 1.0 = euvolaemia, 0.0 = collapse. Trained from scratch
for this prototype; `train/ppg_cri.py`.

**Architecture** (`train/ppg_cri.py:221-249`):

| Stage | Definition |
|---|---|
| Block 1 | Conv1d(1→32, k=9, stride 2, no bias) → BatchNorm1d → SiLU |
| Block 2 | Conv1d(32→48, k=7, stride 2) → BN → SiLU |
| Block 3 | Conv1d(48→64, k=5, stride 2) → BN → SiLU |
| Block 4 | Conv1d(64→96, k=5, stride 2) → BN → SiLU |
| Block 5 | Conv1d(96→96, k=3, stride 2) → BN → SiLU |
| Head pool | `concat(mean over time, amax over time)` → 192 features |
| Head | Linear(192→96) → SiLU → Dropout(0.15) → Linear(96→2) |
| Outputs | `sigmoid(o[:,0])` → CRI in [0,1]; `clamp(o[:,1], −7, 2)` → log-variance |

**Input.** Tensor `ppg`, float32, shape `[1,1,500]`, dynamic batch axis. 500 samples
= 5.0 s at 100 Hz. Normalised per window to zero mean, unit variance — done in JS at
`js/device.js` `standardise()` (lines ~136-150), matching `train/ppg_cri.py:189-190`.
Deliberate: absolute optical level depends on skin, sensor pressure and site, so
removing it forces the network onto morphology.

**Output.** Two named tensors, `cri` and `logvar`. `js/device.js` `CRINet.read()`
returns `{cri, sd = exp(0.5·logvar), ms, lo = max(0, cri−1.96·sd), hi = min(1, cri+1.96·sd)}`.
Units: CRI is dimensionless in [0,1]; the interval is a 95% interval in the same units.

**Loss.** Gaussian negative log-likelihood, heteroscedastic
(`train/ppg_cri.py:252-257`): `0.5·(exp(−logvar)·(y−mu)² + logvar)`.

**Training data.** Fully synthetic. 240 subjects × 260 windows = 62,400 training
windows; 70 subjects × 150 = 10,500 held-out windows; **split by subject, no person
in both sets** (`train/ppg_cri.py:268-269`). 22% of windows carry a forced
signal-quality insult drawn from `motion | lowperf | dropout | noise`
(`train/ppg_cri.py:194,206-207`). 14 epochs, batch 256, AdamW lr 3e-3, OneCycleLR,
grad-clip 4.0, seed 1729, CPU, total 632.6 s (`train/train.log`).

**Provenance string shown on screen** (`app/models/ppg_cri.meta.json`, rendered at
`js/device.js:471`): "Synthetic cohort. Waveform morphology follows the published
response of the peripheral pulse to central volume loss; it is not patient data and
no patient data was used. The fielded analogue is CipherOx CRM, FDA 510(k) K173929."

**Validation figures — every one traceable.** Source of truth is
`app/models/ppg_cri.meta.json`, produced by `train/ppg_cri.py:376-386` and
independently reproduced in `train/train.log`. The UI reads them at render time and
never transcribes them.

| Metric | Value | JSON key | Rendered at |
|---|---|---|---|
| Held-out MAE, overall | 0.0694 CRI | `metrics.mae` | `device.js:479`, `app.js:5406`, `page-kpi.js:389` |
| MAE, clean signal | 0.0641 | `metrics.mae_clean` | `device.js:481` |
| MAE, degraded signal | 0.0879 | `metrics.mae_degraded` | `device.js:482` |
| MAE, heart rate alone (optimal linear fit) | 0.1588 | `metrics.mae_heart_rate_only` | `device.js:483` |
| MAE, most-confident half | 0.0529 | `metrics.mae_most_confident_half` | `device.js:484` |
| Uncertainty↔error correlation | +0.351 | `metrics.uncertainty_error_corr` | not rendered; in meta only |
| 95% interval coverage | 96.16% | `metrics.coverage_95` | `device.js:485` |
| Alarm sensitivity, CRI<0.30 | 83.19% | `metrics.alarm_sensitivity_cri_lt_030` | `device.js:486` |
| Alarm precision, CRI<0.30 | 85.4% | `metrics.alarm_precision_cri_lt_030` | not rendered on Sensor |
| Held-out people / windows | 70 / 10,500 | `heldout` | `device.js:477`, `app.js:5404` |
| Parameters | 104,162 | `parameters` | `device.js:463` |
| ONNX bytes | 419,797 | `onnx_bytes` | `device.js:466` |

The heart-rate baseline is computed as a least-squares linear fit of CRI on heart
rate over the same held-out set (`train/ppg_cri.py:332-334`) — the fairest possible
version of the "it's just tachycardia" objection.

**Trust gate — thresholds and behaviour.** Boundaries are **measured, not chosen**,
by `train/calibrate.py` on a fresh cohort (5,000 clean + 3,000 degraded windows over
120 new subjects, seed 20260814). Interval width `w = 2·1.96·sd`. `act_below` is the
75th percentile of `w` on clean signal, `refuse_above` the 97th
(`train/calibrate.py:61-71`). Written back into `ppg_cri.meta.json` under `trust`.
Applied at `js/device.js:585-600` (`trustGate`).

| Band | Condition on `w = hi − lo` | State key | On-screen sentence | Tasking claim |
|---|---|---|---|---|
| Actionable | `w < 0.4689` | `ok` | "Interval inside the actionable band. Tasking may commit on this reading." | act |
| Caution | `0.4689 ≤ w < 0.5911` | `warn` | "Interval wider than three quarters of clean readings. Tasking holds this casualty at a lower confidence and prefers corroboration." | act, degraded |
| Refuse | `w ≥ 0.5911` | `bad` | "Wider than 97% of clean readings. The model is telling you not to use this. Tasking will not commit an aircraft on it alone." | refuse |

Hard-coded fallback if `net.meta.trust` is missing: `{act_below: 0.47, refuse_above: 0.59}`
(`js/device.js:586`).

**The trust gate's payoff figures** (`ppg_cri.meta.json.trust`, from
`train/calibrate.py:100-104`, rendered `js/device.js:498-503`):

| Figure | Value |
|---|---|
| MAE when the model says *act* (clean, `w < act`) | 0.0630 |
| MAE when it says *do not* (clean, `w ≥ refuse`) | 0.1148 |
| Clean signal refused | 3.0% |
| Degraded signal refused | 13.27% |
| Clean median interval width | 0.3648 |
| Degraded median interval width | 0.4252 |
| Degraded MAE overall / when actionable | 0.0952 / 0.0773 |

**Where the trust gate is actually applied:** only the live trust line on the SENSOR
pane, repainted 4×/s (`js/device.js:560-580`, driven by `setInterval(…, 250)` at
`js/device.js:625`). It is **not** applied anywhere in tasking. See §9.

**Display band (separate from the trust gate)** — `js/device.js:208-212`:
CRI ≥ 0.60 COMPENSATING (green) · 0.30–0.60 MARGINAL (amber) · < 0.30 DECOMPENSATING (red).
A 0.30 threshold line is drawn on the estimate chart.

**Live monitor mechanics** (`js/device.js` `Monitor`). Ring buffer of 1,500 samples.
Waveform synthesised at 100 Hz from a direct JS port of the training generator
(`makeSubject`, `synth`, `pulse`) so the demonstration is a fair test, not a canned
trace. **One inference per second over the trailing 5 s window**, mirroring the
fielded device's cadence. History capped at 180 readings, latency ring at 400
samples. Drawn: scrolling PPG on top; below it the estimate line, the 95% interval
as a filled ribbon, and the withheld ground truth as a dashed line.

**Four casualty scenarios** (`js/device.js:684-689`), each a 45 s ramp from `from` to `to`:
Stable 0.93→0.90 · Slow bleed 0.88→0.22 · Arterial bleed 0.80→0.05 · Blood given at
T+6 0.30→0.78.
**Five signal-quality insults** (`js/device.js:691-697`): Clean · Casualty moving
(`motion`) · Poor perfusion (`lowperf`) · Electrical noise (`noise`) · Sensor off
skin (`dropout`).

**Failure behaviour.** `ANGEL.ready('cri-net', …)` (`js/device.js:604`) catches, sets
status `failed` with the error string (`js/boot.js:151-155`). `renderSensor()`
(`js/device.js:412-419`) replaces the pane body with a "Model unavailable" card
naming the error and saying "Everything else on this page continues to work. Nothing
here was going to reach the network — the model is a file in this folder — so this is
a local fault, not a connectivity one." **The pane and the rail entry are NOT
removed** — unlike doctrine and copilot. The AI sparkle on SENSOR / CASUALTIES /
MISSION is still drawn (see §9).

**Numbers on the SENSOR pane — model vs arithmetic:**

| Element | Origin |
|---|---|
| `criVal` (the big CRI number) | **model** — `out.cri.data[0]` |
| `criCI` (95% interval) | **model** — `exp(0.5·logvar)` × 1.96, arithmetic on a model output |
| `criBand` (COMPENSATING/MARGINAL/DECOMPENSATING) | arithmetic — thresholding a model output |
| `criTruth` (ground truth) | arithmetic — the scenario ramp, `paintReadout()` |
| `criErr` ("off by X") | arithmetic — `abs(cri − truth)` |
| `criHR` (heart rate) | arithmetic — `state.hr` from the synthesiser |
| `criLat` (inference p50) | measurement — wall-clock over real inferences |
| `criN` (inferences) | measurement — counter |
| Trust line | arithmetic on a model output, against measured percentiles |
| Model card & held-out tables | file constants, read live from `ppg_cri.meta.json` |
| The PPG waveform itself | arithmetic — the JS port of the training generator |

`app/models/ppg_traces.json` (25,639 B, six labelled 500-sample traces produced at
`train/ppg_cri.py:398-409`) ships but **is not referenced by any file under `app/js/`** —
dead payload.

### 1.3 all-MiniLM-L6-v2 — the doctrine encoder

**What it is.** A 6-layer sentence transformer used as an **encoder only**. There is
no decoder, no sampling, no temperature. It ranks; it cannot write. Mean pooling and
L2 normalisation are **inside the ONNX graph**, so the browser tokenises and does
nothing else that could silently disagree with the build-time reference
(`js/doctrine.js:26-30`).

**Files.**

| File | Bytes | Purpose |
|---|---|---|
| `app/models/minilm/minilm.onnx` | 22,898,176 | int8 dynamically-quantised graph, opset 14 |
| `app/models/minilm/vocab.txt` | 231,507 | WordPiece vocabulary, 30,522 entries |
| `app/models/minilm/tokenizer.json` | 279 | BertNormalizer + WordPiece config |
| `app/models/minilm/meta.json` | 2,213 | model card + export-quality + eval results |
| `app/data/doctrine.json` | 448,266 | corpus + int8 passage/sentence vectors + eval set |

Source, stated on screen (`meta.json.source`): "npm `@lat.md/embed-minilm-fp16`
(fp16 safetensors + tokenizer); huggingface.co is unreachable from the build
sandbox". fp32 export was 90,398,862 B; int8 is 22,898,176 B — a 3.95× reduction.

**Tokeniser.** WordPiece, hand-written in `js/doctrine.js:88-180` rather than pulled
from transformers.js, explicitly because transformers.js defaults to
`allowRemoteModels = true` against huggingface.co (`js/doctrine.js:44-58`). Config
from `tokenizer.json`: lowercase, strip accents, handle CJK, `##` continuing prefix,
`maxInputCharsPerWord` 100, `maxLen` 256, `[UNK]/[CLS]/[SEP]/[PAD]`, hidden 384.
Emitted by `train/export_minilm.py` and diffed token-by-token against the Python
reference over the whole corpus at build time.

**Input / output.** In: `input_ids` and `attention_mask`, int64, shape `[1, n]`,
n ≤ 256 including `[CLS]`/`[SEP]`. Out: `embedding`, 384-dimensional, already
mean-pooled and L2-normalised → a unit vector. Batch of one; the corpus side was
embedded at build time.

**Corpus.** `app/data/doctrine.json`: **161 passages, 499 sentences, 8 publications**.
Vectors ship as int8 + a float32 per-vector scale (`pv`, `sv`), dequantised and
re-normalised at load (`js/doctrine.js:202-217`) so a similarity is a plain dot
product. Passage fields: `id`, `pub`, `section`, `tags[]`, `text`, `sent[[start,end],…]`.
Publications:

1. TCCC Guidelines (CoTCCC)
2. JTS Clinical Practice Guidelines
3. ATP 4-02.2 Medical Evacuation
4. FM 4-02.1 Army Medical Logistics
5. JP 4-02 Joint Health Services
6. Blood Product Handling (JTS / AABB derived)
7. Golden Hour policy (2009 SecDef directive; JTS outcome analyses)
8. Unmanned resupply concepts (ATP 4-48 Aerial Delivery; service UAS logistics concepts — emerging, not settled doctrine)

**Every passage is a paraphrase, not an extract.** Stated three times: in
`doctrine.json.note`, in `minilm/meta.json.disclaimer`, and on screen as a warning
band headed **SUMMARIES, NOT EXTRACTS** at the top of the pane (`js/doctrine.js:715-723`)
plus a `SUMMARY — NOT AN EXTRACT` chip beside every quotation (`js/doctrine.js:521`).

**Retrieval algorithm** (`js/doctrine.js:314-347`): embed the query → cosine against
all 161 passage vectors → sort → for the top *k* (6 from the pane, default 5 from the
service API) re-rank the sentences *inside* each winning passage → return
`{id, pub, section, tags, text, score, sentence, span, sentenceScore}`. The
highlighted span comes from the build-time sentence boundaries, so it never lands
mid-word.

**Refusal threshold.** `const WEAK = 0.35` (`js/doctrine.js:380`). If
`hits[0].score < 0.35` the pane renders a **"No answer in this corpus"** card giving
the best score and the floor, then lists the closest passages with their scores
anyway (`js/doctrine.js:508-514`). Above the floor it renders the single closest
sentence as the headline with a `RETRIEVED · NOT GENERATED` chip, the passage it came
from with the sentence marked, the tags, the publication, the passage id, and both
the passage and sentence similarity scores.

**Validation figures — traceable.** Source: `minilm/meta.json.quality` and
`doctrine.json.eval`.

| Figure | Value | Key |
|---|---|---|
| Evaluation questions (written before tuning) | 23 | `eval.n` |
| Correct passage ranked first (int8, shipped config) | 15 / 23 | `eval.top1` |
| Correct passage in top five | 22 / 23 | `eval.top5` |
| Same set, fp32 model | 16 top-1, 22 top-5 | `quality.eval_top1_fp32_model` |
| int8 model with fp32 corpus vectors | 15 top-1, 22 top-5 | `quality.eval_top1_int8_model_fp32_vectors` |
| Torch vs fp32 ONNX, min cosine | 0.9999995 | `quality.torch_vs_onnx_fp32_min_cos` |
| fp32 vs int8 ONNX, min / mean cosine | 0.9686 / 0.9802 | `quality.onnx_fp32_vs_int8_*` |
| Pair-similarity shift, worst / mean | 0.0308 / 0.0130 | `quality.pair_similarity_*` |
| int8 passage vectors vs fp32, min cosine | 0.999940 | `quality.passage_quant_min_cos` |
| int8 sentence vectors vs fp32, min cosine | 0.999946 | `quality.sentence_quant_min_cos` |

The eight misses are listed by name with what was returned instead
(`meta.json.quality.eval_misses`; the pane shows the first four,
`js/doctrine.js:571,617-619`). The stated defect: *"What is the difference between
MEDEVAC and CASEVAC?"* wants A4-001 and returns J4-015 at **rank 40** — the pane
calls this out as "a real defect" while framing the others as neighbouring-passage
near misses (`js/doctrine.js:615-616`).

**Coverage, stated on screen** (`js/doctrine.js:623-631`). Covers: TCCC, damage
control resuscitation, blood handling and cold chain, evacuation precedence and the
nine-line, roles of care, medical logistics, the Golden Hour policy, unmanned
resupply — at summary depth. Does **not** cover: paediatric or host-nation care,
CBRN casualty management, burns beyond one passage, veterinary or dental, or
anything below section-heading level.

**Five preset questions** (`js/doctrine.js:367-373`): whole blood out of
refrigeration · MARCH sequence · when a casualty is URGENT · TXA window · the Golden
Hour policy.

**Integration into the rest of the app.** One link, in the casualty drawer, under
"Clinically indicated" (`js/doctrine.js:788-843`). Question wording is a fixed map
keyed on the casualty's first need (`js/doctrine.js:774-780`), chosen by measuring
what each phrasing retrieves:

| Need | Question sent to the encoder |
|---|---|
| BLOOD | "Is whole blood or component therapy preferred for haemorrhagic shock?" |
| PLASMA | "How is freeze-dried plasma stored and reconstituted?" |
| TXA | "How long after wounding can tranexamic acid still be given?" |
| TQ_KIT | "How do I apply a tourniquet to a bleeding limb?" |
| CHEST_SEAL | "How is a tension pneumothorax treated in the field?" |

Delegated `pointerdown` (not `click`) because the drawer is rebuilt ~2×/s.

**Published service** (`js/doctrine.js:884-905`): `{ready, meta, ask, needQuery,
search, passages, publications, disclaimer, stats()}`. `stats()` returns
`{passages, sentences, queries, p50ms}` — consumed by the KPI strip
(`js/page-kpi.js:407-424`) and by the copilot's grounding block.

**Failure behaviour.** Two distinct paths.
- **No WebAssembly** → `withdraw()` (`js/doctrine.js:858-862`) deletes every
  `[data-view="DOCTRINE"]` rail entry and the `[data-pane="DOCTRINE"]` section, then
  throws. The destination ceases to exist.
- **Model or corpus fails to load** → status `failed`; the pane survives and
  `renderDoctrine()` (`js/doctrine.js:690-697`) renders "Retrieval unavailable" with
  the error in a `<code>`. Rail entry remains (see §9).
- `index.html:1188` also carries an `onerror` on the `<script type="module">` that
  removes rail entry and pane if the module itself will not parse.

**Numbers on the DOCTRINE pane — model vs arithmetic:**

| Element | Origin |
|---|---|
| passage similarity (`0.xxx`) | **model** — cosine of two model-produced unit vectors |
| sentence similarity | **model** |
| the quoted sentence and passage | **not model** — verbatim bytes from `doctrine.json` |
| "Also matched" ranking | **model** ordering |
| `embed X ms · N tokens` | measurement — wall clock + tokeniser count |
| `search X ms`, `p50`, `model load X s` | measurement |
| corpus / sentence / publication counts | file constants |
| model card, export-quality and eval tables | file constants from `meta.json` |
| the 0.35 floor | a written constant |

### 1.4 Qwen2.5-0.5B-Instruct — the brief writer

**Shipped state: not installed.** `app/models/llm.gguf` does not exist in this
checkout. The pane and its rail entry are withdrawn (`js/copilot.js:1413,1439-1443`),
`ANGEL.get('copilot').installed === false`, and the `LLM` provenance mark is
therefore drawn nowhere in the application.

**Claimed model card** (`js/copilot.js:68-75`, shown on screen in both states):
Qwen2.5-0.5B-Instruct · 494 million parameters · Q4_K_M (4-bit, k-quant medium) ·
398,000,000 bytes · Apache-2.0 · Alibaba Cloud / Qwen team. Once loaded, the card
gains measured rows read from the GGUF itself via `w.getModelMetadata()` —
architecture, layer count, embedding width, trained context length, load time, bytes.

**Runtime.** wllama 3.5.1, llama.cpp compiled to WebAssembly, vendored at
`app/vendor/wllama/wllama.mjs` + `wllama.wasm`. Three CDN string constants inside the
upstream bundle are rewritten at vendoring time to unresolvable schemes
(`angel-offline:no-remote-worker`, `…no-remote-wasm`, `…no-remote-hub`) —
`js/copilot.js:37-49`. `setCompat(null)` closes the compatibility profile; the model
is handed over as a `Blob` this module fetched itself so the model manager never
resolves a URL; `n_gpu_layers: 0`.

**Load parameters** (`js/copilot.js:247-253`): `n_ctx 4096`, `n_threads 1`,
`n_gpu_layers 0`, `n_batch 128`, `warmup false`, `seed 42`.
**Generation** (`js/copilot.js:264-274`): streaming, `temperature 0.15`,
`max_tokens` 420 for the brief and 260 for a follow-up.

**Why one thread** (`js/copilot.js:106-122`): the Go launcher deliberately sends
neither COOP nor COEP, so the page is not cross-origin isolated, `SharedArrayBuffer`
is unavailable, and llama.cpp is single-threaded. The number is displayed as the
honest explanation for the tokens/sec figure beside it.

**Capability gates** (`js/copilot.js:1383-1386`). Requires WebAssembly **SIMD**
(9-byte v128 probe) **and native exception handling** (28-byte `try` probe). Missing
either → `withdraw()`, rail entry and pane removed, throws.

**Presence probe** (`js/copilot.js:137-176`). First asks the launcher for a directory
index of `models/` (a request that succeeds, so the *normal* shipped state does not
paint a red 404 in the console). If the name is present, or if there is no index,
falls back to a `Range: bytes=0-15` request and checks the four-byte `GGUF` magic and
the little-endian version word, and reads the true size from `Content-Range`. Three
outcomes:

| Probe result | Pane | Rail |
|---|---|---|
| `present: true` | rendered, load button live | present |
| `present: false` | **withdrawn** | **removed** |
| `corrupt: true` (file exists, not GGUF) | rendered, headed "The model file is not a model", tells you to delete and re-fetch | present |

**Grounding — three sources, assembled at press time** (`js/copilot.js:341-757`).

1. **Run figures (`F`-tagged).** Read straight off the live simulation objects. Each
   fact carries `{k label, v value, src:'SIM', from: field path}` so the printed
   table names the field. Includes: scenario/theatre/duration/clock/seed/area,
   casualty count, launch points and aircraft per arm, allocator, telementoring,
   comms state; both arms' `died` and `survivableDeaths` and both differences by
   name; then per-arm `treated`, `coverageDeaths`, `sorties`, `wastedSorties`,
   `stops`, `dronesLost`, `bloodUsed`, `bloodWasted`, `coldAborts`, `stockouts`,
   `missedDeadline`; then the five-way death attribution from `deathCauses()`; then
   a per-triage-class wounded/died breakdown.
2. **SQL (`Q`-tagged).** One aggregate against DuckDB (`js/copilot.js:486-495`):
   `SELECT arm, triage, count(*), sum(outcome='DIED'), round(avg(deadline_min),1)
   FROM casualties WHERE triage IN ('IMMEDIATE','DELAYED') GROUP BY arm, triage`.
   Before running it, the module compares the DB toll against the page toll and
   re-materialises the run if they disagree — guarding the worst failure, briefing
   figures from a *different* run (`js/copilot.js:518-534`).
3. **Doctrine (`D`-tagged).** Three verbatim passages with their similarity scores.
   The query is derived from the run, not typed: whichever death cause is largest
   picks the question (`js/copilot.js:590-607`).

**Prompt.** A refusal-first system message (`js/copilot.js:614-626`), verbatim:
every number must appear in CONTEXT exactly as written; say "not in the record" and
move on rather than estimating or inferring; no clinical advice, no treatment
recommendation, no judgement on whether a medical decision was correct; quote
doctrine and name its publication; sober register, "fewer dead" never "lives saved",
no bullets, no headings, no emoji. The brief task asks for four short paragraphs of
plain prose, ~200 words, no conclusion or recommendation.

**Context fitting** (`js/copilot.js:677-704`). Budget = `4096 − max_tokens − 96`.
Token count is estimated from characters at 3.2 chars/token (conservative for Qwen
BPE) because the tokeniser lives behind a worker. Trim order: **retrieved passages
first** (down to 1), then figures in blocks of 4 (never below 20). If llama.cpp still
refuses, the overflow message names the measured token count, `charsPerToken` is
recalibrated once from it, and the request is retried (`js/copilot.js:722-736`).
**The screen shows what was SENT, not what was assembled** (`js/copilot.js:891-892`).

**Failure behaviour beyond absence.** Abort → "(stopped)". A wllama framing desync
(matched by `/typed array length|out of bounds|detached/i`) drops the engine, keeps
whatever prose was already written, and says the engine was reset
(`js/copilot.js:1205-1230`). Any other error is printed in place with "Everything
else on this page is unaffected."

**Numbers on the BRIEF pane — model vs arithmetic.** **No figure on this pane is
model-produced.** Every `F` fact is read from simulation state, every `Q` fact is a
DuckDB result, every `D` passage is verbatim corpus text with a MiniLM similarity.
The only model output is **the prose**. The performance readout — `tokens/sec`,
tokens written, elapsed, `prompt_n` tokens of context read at N/sec — is measurement
of the model, not output of it.

**Install path.** `get-model.sh` / `get-model.ps1` beside the launcher; plain-language
`GET-MODEL.txt`. Primary source `Qwen/Qwen2.5-0.5B-Instruct-GGUF` →
`qwen2.5-0.5b-instruct-q4_k_m.gguf`; fallback `bartowski/Qwen2.5-0.5B-Instruct-GGUF`.
Size sanity band 300–600 MB. The script computes SHA-256 and compares against the
digest the repository declares, but **`EXPECTED_SHA256` ships empty**
(`get-model.sh:71`) because the build sandbox is denied egress and the digest could
not be pinned — the script says so in its own comments and prints the digest for the
operator to check by hand.

---

## 2. THE REPLICATION STUDY

`js/montecarlo.js` (the CONFIDENCE pane, keyboard **U**) + `js/mc.worker.js`.

**What is replicated.** The **real engine**, not a surrogate. The worker
`importScripts('sim.js', 'optimizer.js')` — the same two files the live application
runs (`js/mc.worker.js:37`). This is possible because neither touches the DOM. The
one free global `optimizer.js` needs from `map.js` is `CALLSIGN`, restated as three
strings in the worker (`js/mc.worker.js:33`); a future edit reaching for anything
else in `map.js` makes the worker throw on load and the panel says so rather than
reporting numbers from a half-loaded engine.

**How many.** Default **200** headline replications (`DEFAULT_REPS`,
`js/montecarlo.js:29`), operator-settable 10–2000. Sweep default **40 per point**,
settable 10–400 (`MC.sweepReps`, `js/montecarlo.js:249`).

**Seeding.** Replication *i* uses seed `1000 + i` (`SEED_BASE`, `js/montecarlo.js:30`).
The same seed set is reused at every sweep point (`js/montecarlo.js:388-396`), so the
response curve is a curve in the lever, not the lever plus fresh battles per knot.

**Paired or unpaired — and how far the pairing goes.** Paired.
`createWorld(scenario, seed)` builds the casualty stream **once** and both arms are
constructed against that same world (`js/mc.worker.js:134-140`) — the strong form of
common random numbers, and the reason this is a within-battle difference. Each arm's
own stochastic draws (wind, attrition, receiver performance) start from the same seed
when `crn` is set (`js/mc.worker.js:143-144`) but **desynchronise as the arms
diverge, because they consume draws at different rates**. The module states this in
its own header as "the weaker half of the pairing" (`js/mc.worker.js:110-117`).
`liveConfig()` hard-sets `crn: true` (`js/montecarlo.js:288`); there is no UI to
turn it off.

**The statistic reported.** The **paired difference in deaths per battle**,
`d_i = a_i − b_i` where the metric is selectable:
- `survivable` (default): `survivableDeaths` — casualties triaged IMMEDIATE or
  DELAYED. Excludes MINIMAL (live regardless) and EXPECTANT (die regardless).
- `total`: all deaths in every triage category.
Both come back from every replication, so switching the metric re-derives from
results already in hand without re-running (`js/montecarlo.js:924-937`).

**Confidence interval method.** Paired-sample Student's *t*
(`pairedStats`, `js/montecarlo.js:141-161`):

| Quantity | Formula / source |
|---|---|
| mean | `Σd/n` |
| SD | sample SD, **n−1** denominator, of the difference vector |
| SE | `sd / √n` |
| critical value | `tCrit(n−1, 0.975)` |
| 95% CI | `mean ± t·SE` |
| effect size | Cohen's **d_z** = `mean / sd` (the paired form; the module notes the unpaired *d* would flatter the result) |
| median, Q1, Q3 | linear-interpolated quantiles |
| min / max | order statistics |

`tCrit` is a Cornish-Fisher expansion around the normal quantile, with `invNorm`
being Acklam's rational approximation (abs error < 1.15e-9). Documented accuracy:
1.9720 at df 199 vs tabulated 1.9720; 2.5707 at df 5 vs 2.5706 (`js/montecarlo.js:124-127`).

**"Worse" and "ties" — exact definitions** (`js/montecarlo.js:147-148`), on the
difference `d = ANGEL − PUSH`:
- **worse**: `d > 0` — ANGEL SWARM produced **more** dead in that replication.
- **tie**: `d === 0` — no difference between the arms in that replication.
- **better**: `d < 0`.
Displayed as "**W of N** replications where ANGEL SWARM produced more dead; T with no
difference — P%" and again as two rows in the thirteen-row detail table. The module's
caveat block states plainly that this count is printed whether it is zero or not and
that a configuration where it is large "is a finding about the system and it belongs
in the record, not in a footnote."

**What the pairing bought.** `unpairedSE(a, b) = √(sa²/n + sb²/n)`
(`js/montecarlo.js:165-168`) is computed **for display only and never used for an
interval**, and shown as "×N tighter" = `unpairedSE / pairedSE`. The header comment
asserts "roughly a factor of three and a half", but the number on screen is the live
measured ratio, not that constant.

**No p-value, deliberately** (`js/montecarlo.js:895-899`): the replications are drawn
from a deterministic program on demand, so any p-value could be driven arbitrarily
low by running longer, making it a measure of compute budget. Mean difference, its
interval, effect size and the worse-count are reported instead.

**The Web Worker.** `Pool` (`js/montecarlo.js:181-240`).

| Property | Value |
|---|---|
| Pool size | `clamp((navigator.hardwareConcurrency − 1), 1, 12)` — one core left to the page |
| Model | **work queue**, not a partition: each worker takes one replication and asks for the next |
| Why | replications vary ~2× in cost, so a static split idles cores at the end |
| Handshake | every worker answers `hello` with `{ok, error, engine}`; if any reports a load failure or a missing engine, `start()` throws and the pane reports it |
| Statefulness | the worker holds **no state between replications**; each message in is a complete spec, each message out a complete result |
| Progress | `MC.stats` is recomputed **on every arrival**, so the interval visibly tightens as replications land |

**Runtime.** Not a fixed number — the pane reports **elapsed seconds and rep/s
measured live** for that machine, and repeats the worker/core counts. `ANGEL.mark`
records `{reps, sec, repsPerSec, workers}` for both the headline run and each sweep.
An idle pane states the core count and how many workers *will* be used.

**Withheld if no Web Workers** (`js/montecarlo.js:955-962`): rail entry and pane are
removed, status set to `withheld` with "No Web Workers on this browser".

**Per-replication result payload** (`js/mc.worker.js:156-173`): `seed`, `value`,
`casualties`, `a`/`b` (survivable deaths), `aTotal`/`bTotal`, `aSaved`/`bSaved`,
`survivable` (cohort size), `sortiesA/B`, `wastedA/B`, `bloodA/B`, `ms`.

**Every number on the CONFIDENCE pane is arithmetic. No model touches this pane.**

---

## 3. THE ANALYSIS SUITE

### 3.1 The parameter sweep (`js/montecarlo.js:35-65`, `js/mc.worker.js:54-103`)

Five levers. All hold scenario, casualty stream and seed identical — possible only
because `createWorld()` hands out a private deep copy of the scenario and builds the
casualty stream *before* any lever is applied.

| Lever | Label | Points | Unit | What it mutates |
|---|---|---|---|---|
| `none` | Headline run only | — | — | nothing |
| `fleet` | Fleet size | 0.5, 0.75, 1, 1.25, 1.5, 2 | × baseline | every airframe count at every launch point, `max(1, round(n·v))` |
| `launch` | Launch points | 1 … (scenario's base count) | sites | `scn.bases.slice(0, k)`, in siting order |
| `comms` | Datalink outage | 0, 1, 2, 3, 4 | × scenario window | multiplies every outage **duration**; start times untouched; 0 = clean EM environment |
| `triage` | Triage error | 0, 0.5, 1, 2, 3, 4 | × METASTART rate | `START_SENSITIVITY = clamp(1 − 0.10·v)`, `START_OVERTRIAGE = clamp(0.14·v)` |

The `triage` lever is the only one that writes outside `scn` — it writes `PARAMS`,
set per replication before the world is built so `perceivedClass()` memoises against
the right value, and restored afterwards (`js/mc.worker.js:125,155`). It also
**forces `mode = 'realistic'`** for that lever only (`js/mc.worker.js:132`), because
in fair mode `perceivedClass()` returns the true category and the sweep would draw a
flat line. Only current triage and proximity arm reads triage category at all, so this lever
moves the baseline and leaves ANGEL SWARM alone.

**Sweep output.** Per point: mean deaths on each arm, per-arm 95% half-widths
(`t·sd/√n`), the paired mean difference, its 95% interval, and the worse-count — as a
canvas curve with bands plus a six-column table (`js/montecarlo.js:805-820`).

**Claim made:** the sweep says how the paired difference responds to that one
parameter over the swept range, on this scenario family, at 40 replications per knot.
It makes no claim beyond the seed (see the caveat block, §2).

### 3.2 The fleet-size / requirement experiment (`js/app.js:2376-2445`)

**Not the Monte Carlo.** Seven full single-arm re-runs of the *current* scenario and
seed with one constraint relaxed each time. `reqRun()` builds a fresh world, mutates
it, runs **arm A only** at `dt = 0.25` for the full duration, then attributes.

| # | Row label | Fleet × | Other change |
|---|---|---|---|
| 1 | As it is fielded today | 1 | — |
| 2 | Twice the aircraft, same launch points | 2 | — |
| 3 | Four times the aircraft | 4 | — |
| 4 | One more launch point, forward | 1 | `extraBase` = FARP FORWARD, sited at the least-covered casualty cluster, fleet `[LIGHT×1, HEAVY×1]` |
| 5 | Every buddy trained to combat lifesaver | 1 | every T1 responder → T2 |
| 6 | A combat medic with every element | 1 | every responder → T3 |
| 7 | Forward launch point AND a medic with every element | 1 | both |

**Outputs per row:** airframes, launch points, sorties, `survivableDeaths`, the
five-way cause decomposition, and the delta against row 1.

**The floor row.** `floor = Σ (1 − survivalIfTreatedAt(c, tInjury + 1, needs[0]))`
over the IMMEDIATE + DELAYED cohort — the expected deaths if every casualty were
treated one minute after injury with the ideal product. Labelled "Deaths the
treatment itself cannot prevent … No fleet size, laydown or training reaches below
this line."

**Exact claim made** (`js/app.js:2442`): "Doubling the aircraft changed the death
count by nothing at all — the fleet is not what is short," or, if it did move,
"Doubling the aircraft moved the count by N." Both branches are generated from the
run; neither number is written down.

### 3.3 The counterfactual / after-action attribution

**`deathCauses(arm)`** — `js/optimizer.js:252-268`. Runs over every casualty with
`outcome === 'DIED'` **and** `cls ∈ {IMMEDIATE, DELAYED}`, and assigns exactly one
cause by a **first-match cascade**:

| Order | Cause key | Condition | Plain-language label |
|---|---|---|---|
| 1 | `treatedDied` | `c.treated` | Reached in time, died anyway — *the ceiling of the treatment* |
| 2 | `noResponder` | `usablePayloads(c, telementor).length === 0` | Nobody on scene qualified |
| 3 | `noLaunchPoint` | `lpInRange(c) ≤ 1` | No launch point in reach |
| 4 | `tooFast` | `c.deadlineMin < 10` | Collapsed too fast to fly — *the floor of the treatment* |
| 5 | `busy` | otherwise | Every aircraft committed |

`lpInRange` counts distinct base indices whose `effectiveRadiusKm(plat, 1.45 kg)`
covers the casualty. Note the cascade is **order-dependent and mutually exclusive** —
a casualty who was both out of reach and had no qualified responder is counted only
as `noResponder`. `reqRun()` reimplements the identical cascade inline
(`js/app.js:2398-2409`).

**The after-action report** (`js/page-afteraction.js`). Four blocks:
1. **The result as figures** — the difference, then dead-of-survivable-wounds,
   dead-in-every-triage-category, and sorties flown, both arms.
2. **What drove it** — the three largest causes, each as a figure + label + one clause.
3. **What to change** — only the three causes that have a resourcing lever, largest
   first, each as "Addresses N of TOTAL". The word is **"addresses"**, never "saves"
   (`js/page-afteraction.js:282-284`).

   | Cause | Action offered |
   |---|---|
   | `noLaunchPoint` | Move a launch point forward |
   | `busy` | Buy airframes |
   | `noResponder` | Qualify responders forward |

   `tooFast` and `treatedDied` are deliberately **not** offered as actions — they are
   the floor and the ceiling of the treatment and are named as such in the method note.
4. **Everything else behind shut `<details>`** — the five causes in full, the cost
   table, the replication study, the re-runs, sources, method note.

**Honesty rules the pane enforces.** Zero is stated as a measurement ("Nobody died of
a wound that could have been survived"); *unavailable* attribution is stated
differently ("Cause attribution is not available in this session"); it never prints a
zero that reads as a measurement, and never prints a distribution it has not sampled.
When ANGEL SWARM was never deployed, both arms tasked by current triage and proximity and the head
says so rather than reporting the gap as a result.

**The commander's procurement finding** (`js/role-commander.js:1215-1290`,
`findingSensitivity()`). Three sources, first available used, all shown if present:
1. `deathCauses()`: "Buying airframes buys down `busy` of `total`. Moving a launch
   point forward addresses `noLaunchPoint`."
2. `APP.req` if the requirement analysis has run: doubling the aircraft moved
   survivable deaths by X; one more forward launch point moved it by Y — "each of
   those is a full re-run of this operation with one constraint relaxed, not an
   estimate."
3. The Monte Carlo sweep if one has been run: mean fewer-dead at the lowest and
   highest swept point, and the span; "The entire swept range moves the toll by less
   than one soldier" when `span < 1`.

The claim the pane leads with: **launch points move the death count, fleet size does
not** — because combat radius falls as payload rises, so a casualty outside every
launch point's radius stays outside it however many aircraft are bought.

### 3.4 Cost and ROI

**Two published rates, and only two** (`ROI_RATES`, `js/app.js:3856-3860`):

| Constant | Value | Stated source |
|---|---|---|
| `bloodAcq` | USD 250 | ASBP average cost of a unit bought from outside sources |
| `bloodMult` | 3.2 | fully-loaded multiplier, low end of Shander et al. 2010 (3.2–4.8×) |
| `uh60Hr` | USD 4,364 | official Army FY26 UH-60M reimbursement rate per flight hour |

`uh60Hr` is used **for scale only**, explicitly not to cost the UAS: "Cost per flight
hour for Group 1–3 UAS is **not published by DoD**, so no dollar figure is claimed
here" (`js/app.js:4045-4047`).

**`roiFrom(A, B, casN)`** (`js/app.js:3862-3886`) — all counted quantities go through
the `COUNT` glossary, never through `arm.stats` directly. Emits `deaths`
(survivable), `deathsAll`, `bloodLost`, `bloodFwd` (stock on shelf), `sorties`,
`wasted`, `hours` (`Σ(tReturn − tLaunch)/60`), `drops`, `ok`, `hit` (ok/drops), and a
`per(v) = v/casN·1000` normaliser.

**`runRoiSweep()`** (`js/app.js:3896-3939`) — **35 engagements**: 7 scenarios
(`PACOM_CORAL`, `EUCOM_GRANITE`, `PACOM_BASALT`, `PACOM_MARINER`, `PACOM_TIMBER`,
`EUCOM_AMBER`, `EUCOM_FJORD`) × 5 seeds (7, 42, 101, 555, 2026), both arms, `fair`
mode, telementoring on for A and off for B, stepped at `dt = 0.25`. Accumulates and
sets `wide: true`. Runs incrementally with `setTimeout(step, 8)` so the UI stays live
and the pane shows `i/35`.

**Note on CRN in the ROI sweep**: unlike the Monte Carlo, `runRoiSweep` uses
`makeRNG(sd*3+1)` for A and `makeRNG(sd*3+2)` for B — different per-arm streams. The
casualty stream is still shared (one `createWorld` per job), so the strong pairing
holds; the weak half does not.

**The three claims the ROI pane makes** (`js/app.js:3949-4076`):

| # | Headline | Computed as | External anchor cited on screen |
|---|---|---|---|
| 1 | "X% less blood thrown away" | `pct(bloodLost[0], bloodLost[1])` | USCENTCOM shipped 26,892 units in 2022 and transfused 84 = 0.3%; 81–99.7% never transfused 2017–2022 *(Military Medicine 2024;189:249)*. Rwanda drone delivery cut wastage 67% across 12,733 orders *(Lancet Global Health 2022)* |
| 2 | "The evacuation model is already mathematically dead" | not computed — a framing claim over two measured bars | 3,000 casualties/day needing beds, 30,000–35,000 needing theatre evacuation, against a strategic ceiling of 250–1,000 = 3–4% of demand *(Army War College, citing FM 4-02)*; ~4,000 deployable beds vs 13,000 in Desert Storm; 27 trauma surgeons; JTS PCC CPG ID:91, 21 Dec 2021 |
| 3 | "X% fewer airframe hours, Y% fewer wasted sorties" | `pct(hours[0], hours[1])`, `pct(wasted[0], wasted[1])` | no published Group 1–3 UAS hourly rate; UH-60M $4,364/hr given for scale only |
| $ | dollars | `bloodSaved × 250 × 3.2`, and the same per 1,000 casualties | ASBP fact sheet; Shander et al., Transfusion 2010 |

Airframe hours saved are shown in the money table with the value column reading "—"
and "no published UAS rate — not costed". **Deliberately excluded, stated on screen:**
any dollar value on a casualty — "Putting a price on a dead soldier next to an
efficiency chart is not an argument worth winning."

The commander's COST pane (`js/role-commander.js:1292-1420`) *composes* the same
`roiAggregate()` object rather than recomputing — pressing "Measure across 35
engagements" on either pane moves both.

### 3.5 The IL5 deployment cost analysis

`OUT/ANGEL-SWARM-IL5-deployment-cost-impact-analysis.md` (also `.docx`, also in the
claude.ai project). **It is a document, not a screen** — nothing under `app/js/`
references IL5. Its architecture assertions do check out against this repo: three
models run locally in the browser on CPU; a 104,162-parameter 1-D CNN via ONNX
Runtime Web; a 22.9 MB int8 sentence encoder; an optional small LM via
llama.cpp/WebAssembly that is not shipped; ~330 KB basemap in-folder (329,624 B
measured); a single static Go binary on 127.0.0.1 with no API server, no database at
runtime, no auth; one optional receive-only telemetry listener off by default.

Its **dollar and schedule figures are Rough Order of Magnitude planning estimates**
and the document says so on its own line 6: "Not a bid. Every dollar figure is a
planning range with the driving assumption stated next to it." Headline ROM (most
likely): $2.1 M cyber/engineering one-time + $1.7 M PHI/clinical overlay one-time =
$3.8 M; $1.25 M/yr recurring; 3-year TCO ~$6.9 M; 5-year ~$9.5 M; IATT on synthetic
data ~9 months, IATT on real physiology ~16 months, full ATO ~22 months.
**None of these is derivable from anything in the repository** — they are stated
judgement with an assumption named beside each. That is a legitimate document
posture, but a designer must not render them as measured outputs.

---

## 4. THE DATABASE AND QUERY PATH

**Two engines ship, and they are different products.**

| | `js/data2.js` — the analytical console | `js/db.js` — the mission record |
|---|---|---|
| Engine | **DuckDB-WASM** in a Worker | **SQLite** via sql.js, in-page |
| Assets | `app/vendor/duckdb/duckdb.mjs`, `duckdb-eh.wasm`, `duckdb-browser-eh.worker.js` | `app/js/sqlwasm.js` (926 KB, wasm inline as base64) |
| Pane | `QUERY` (keyboard **Q**) | `DATA` |
| Service | `ANGEL.provide('db', …)` | global `DB` object |
| Editor | CodeMirror (`app/vendor/cm/cm.mjs`) | plain textarea |
| Arms | both arms in one set of tables under an `arm` discriminator | one arm per database |
| Export | none | `angel_swarm_mission.sqlite` (`js/app.js:2989-2998`) |

The copilot's `Q`-tagged facts come from the **DuckDB** side (`ANGEL.has('db')`).

### 4.1 DuckDB — what it holds

Materialised from the live run by `buildTables(armA, armB, world, {seed})`
(`js/data2.js:240-350`), loaded as Arrow IPC with **explicit column types** (never
inference — a column that is entirely null until something happens would otherwise
arrive as an Arrow Null vector that no predicate can touch). Every table is dropped
and recreated on load; an empty table still exists so a preset returns no rows rather
than a missing-relation error. Type codes: `i` = INT32, `d` = DOUBLE, `s` = VARCHAR,
`b` = BOOLEAN.

**`runs`** — one row per arm. *"The headline figures, so a query can normalise against them."*

| Column | T | | Column | T |
|---|---|---|---|---|
| arm | s | | sorties | i |
| label | s | | stops | i |
| allocator | s | | wasted_sorties | i |
| control_mode | s | | drones_lost | i |
| scenario_key | s | | blood_used | i |
| scenario | s | | blood_wasted | i |
| theater | s | | plasma_used | i |
| joa | s | | stockouts | i |
| seed | i | | cold_aborts | i |
| duration_min | d | | cold_swaps | i |
| casualties | i | | approved | i |
| died | i | | rejected | i |
| saved | i | | expired | i |
| treated | i | | auto_approved | i |
| survivable_deaths | i | | telementoring | b |
| survivable_total | i | | human_in_the_loop | b |
| survivable_saved | i | | | |
| coverage_deaths | i | | | |
| missed_deadline | i | | | |

**Two death columns, deliberately**: `died` is every casualty whose outcome was DIED
in any triage category; `survivable_deaths` is the subset triaged IMMEDIATE or
DELAYED — the only deaths a resupply decision could have changed, and the figure the
scoreboard carries.

**`casualties`** — one row per wounded soldier per arm, 51 columns.

| Group | Columns (type) |
|---|---|
| identity | `arm` s, `id` i, `x_km` d, `y_km` d, `t_injury` d, `triage` s, `injury` s, `responder` s, `role` s, `unit` s, `unit_name` s |
| need | `needs` s (comma-joined), `n_needs` i, `penetrating` b, `hva` b, `hva_reason` s |
| physiology | `t_pinged` d, `reported_crm` d, `deadline_min` d, `p0` d, **`deadline_at` d** (= `t_injury + deadline_min`, precomputed so "did help arrive in time" is one predicate) |
| outcome | `treated` b, `t_treated` d, `treated_with` s, `outcome` s, `assigned_to` i, `survivable` b (= triage ∈ {IMMEDIATE, DELAYED}) |
| what tasking knew | `reach_n` i, `known_crm` d, `known_at` d, `known_q` d |
| delivery | `t_on_station` d, `t_recovered` d, `release_method` s, `t_resolved` d, `tele_n` i |
| the tasking decision, flattened | `dec_t` d, `dec_drone` i, `dec_call` s, `dec_platform` s, `dec_base` s, `dec_payload` s, `dec_arrive_from_injury` d, `dec_margin_min` d, `dec_crm_used` d, `dec_crm_age_min` d, `dec_crm_q` d, `dec_p_untreated` d, `dec_p_treated` d, `dec_gain` d, `dec_stops` i, `dec_telementored` b, `dec_candidates` i |

**`telemetry`** — `arm` s, `cas_id` i, `t` d, `crm` d, `zone` s, `q` d, `trigger` s.
*"The time series an ASOF join reaches back into."*

**`candidates`** — `arm` s, `cas_id` i, `drone_id` i, `call` s, `platform` s, `base` s,
`dist_km` d, `flight_min` d, `chosen` b, `verdict` s.
*"Every airframe the allocator considered for a casualty, and why it lost."*

**`drones`** — `arm` s, `id` i, `type` s, `platform` s, `speed_kmh` d, `payload_kg` d,
`base_idx` i, `base_name` s, `base_x` d, `base_y` d, `x_km` d, `y_km` d, `state` s,
`payload_key` s, `target` i, `t_depart` d, `t_arrive` d, `t_home` d, `sorties` i,
`delivered` i, `wasted` i, `cold_c` d, `held` b, `sectors` i.

**`bases`** — `arm` s, `idx` i, `name` s, `x_km` d, `y_km` d, `airframes` i,
`blood` i, `plasma` i, `txa` i, `tq_kit` i, `chest_seal` i,
`blood_spent` i, `plasma_spent` i, `txa_spent` i, `tq_kit_spent` i, `chest_seal_spent` i,
`blood_wasted` i, `plasma_wasted` i.

**`deliveries`** — `arm` s, `sortie_id` i, `cas_id` i, `payload` s, `t` d,
`delay_min` d, `ok` b, `waste_reason` s, `cold_c` d.

**`sorties`** — `arm` s, `id` i, `drone_id` i, `platform` s, `base` s, `t_launch` d,
`t_return` d, `duration_min` d, `stops` i, `actor` s, `proposal_id` i.

**`stock`** — `arm` s, `t` d, `base_idx` i, `base_name` s, `item` s, `delta` d,
`reason` s. *Negative deltas leave the shelf.*

**`audit`** — `arm` s, `seq` i, `t` d, `actor` s, `action` s, `detail` s, `meta` s,
`prev` s, `hash` s. *`meta` is text, not JSON.*

**`stream`** — `arm` s, `t` d, `t_recv` d, `latency_min` d, `phase` s, `cas_id` i,
`drone_id` i, `call` s, `payload` s, `relay` s, `text` s.

Arm discriminator values: `'ANGEL'` and `'PUSH'` (`js/data2.js:73-74`). The copilot
translates them to the full names before showing them to the model
(`js/copilot.js:499-505`).

### 4.2 Offline assertions, made twice

At `open()` (`js/data2.js:428-435`) DuckDB is told
`SET autoinstall_known_extensions=false` and `SET autoload_known_extensions=false`,
then those settings are **read back** and displayed, and `duckdb_extensions()` is
queried for how many optional extensions are actually loaded — the answer wanted is
zero (`js/data2.js:444-455`). Rationale on screen: DuckDB-WASM does not statically
link json, parquet or icu and would otherwise fetch them from a public host on first
use, which in an air-gapped tent is a stall and then a confusing error.
`castBigIntToDouble: true` is set so `COUNT(*)` comes back as a number that
JSON-serialises and compares.

Bundle selection is bypassed — the `eh` wasm and worker are named outright, removing
the probe and the chance of the library reaching for a default host.

### 4.3 What a person can ask — the eight presets

Each is captioned with a plain-English question and the DuckDB feature it exists to
demonstrate (`js/data2.js:532-760`):

| id | Label | Feature | Question |
|---|---|---|---|
| `late` | Who died, and by how much | window function | For every soldier who died of a survivable wound, how far past their physiological deadline did help arrive — if it arrived at all? |
| `quantile` | *(time to treatment)* | `quantile_cont` + `PIVOT` | Time from wounding to treatment by triage category, both arms side by side. Not the mean — the mean hides the tail, and the tail is where people die. |
| `asof` | *(reserve at landing)* | **ASOF JOIN** | For every pod that landed, what was that casualty's compensatory reserve at the last reading before it touched down? |
| `binding` | *(the binding constraint)* | `QUALIFY` + `ROW_NUMBER` | When the nearest airframe could not be used, which launch point was it sitting on, and what stopped it? |
| `cliff` | *(fastest decompensation)* | `LAG` + `QUALIFY` | Which casualties decompensated fastest, and had anything been tasked to them by then? |
| `clock` | *(the toll over time)* | running total | How did the toll accumulate in each arm as the sixty minutes ran? |
| `margin` | *(was the solve right)* | decision record | When ANGEL SWARM committed an aircraft it computed an expected gain. Was it right? |
| `shape` | *(the whole record)* | row counts | The whole record, table by table, with the arms broken out. |

The presets are the argument for choosing an analytical engine: ASOF JOIN,
`quantile_cont`, `PIVOT` and `QUALIFY` are all things a row-store cannot express
without a correlated subquery over the whole table (`js/data2.js:14-24`).

### 4.4 What the SQL console can and cannot do

**Can:**
- Execute **arbitrary SQL**, exactly as typed, against the live in-memory DuckDB
  database. `runQuery()` (`js/data2.js:844-880`) passes the editor buffer straight to
  `conn.query(sql)` with **no rewriting, no allow-list, no statement filter**. DDL and
  DML both work — the database is in-memory and disposable.
- CodeMirror editing with history, search keymap, and **Ctrl/Cmd+Enter to run**.
- Report the **true** row count and the **end-to-end** elapsed time — worker round
  trip and Arrow transfer included, not the engine's own accounting.
- Show `version()`, the bundle name, the two autoload settings and the loaded-extension
  list, as the offline assertion.
- Reload automatically when the run's shape changes, never mid-query — keyed on a
  coarse signature `[scenarioKey, seed, casA, casB, auditLen, deliveryLen, finished]`
  (`js/data2.js:778-784`).

**Cannot:**
- Reach a network, open a file, or name an extension. Every table is loaded through
  Arrow IPC from memory.
- **Paint more than 2,000 rows.** `RENDER_CAP = 2000` (`js/data2.js:47`). Above that
  the footer reads "Showing the first 2,000 of N rows. The engine returned all N;
  the cap is on painting, not on querying." The cap is on rendering only.
- Persist anything. `path: ':memory:'`; a new run replaces every table wholesale.
- Export a result set (only the SQLite side has an export button).
- Affect the simulation. The module reads the two arms after the fact; nothing it
  does can change an outcome.

**Failure:** requires Workers **and** WebAssembly; without either, `ANGEL.ready('data2')`
throws "DuckDB needs Web Workers and WebAssembly" and the console never mounts. A
query error is caught and printed in a red block; the stat line reads "error" and the
mission clock is unaffected.

**Editing a preset re-captions it** (`js/data2.js:849-859`): once the SQL no longer
matches a preset verbatim, the question above it is replaced by "**Your query.** The
record is the same one the presets read; nothing here is a view over a summary." —
so somebody's own work is never captioned with somebody else's claim.

### 4.5 SQLite — the mission record (`js/db.js`)

Eleven normalised tables with declared foreign keys but **enforcement left off**,
because a mission can end mid-sortie with references that never resolved and a
partial record is still worth keeping (`js/db.js:25-29`).

| Table | Columns |
|---|---|
| `mission` | id INTEGER PK, theater TEXT, joa TEXT, scenario TEXT, mode TEXT ('EXERCISE'\|'LIVE'), seed INTEGER, control_arm TEXT, telementoring INTEGER 0/1, started_min REAL, duration_min REAL |
| `launch_point` | id PK, mission_id, name TEXT, afloat INTEGER, x REAL, y REAL |
| `unit` | id PK, mission_id, name TEXT, assigned_strength INTEGER, x REAL, y REAL |
| `airframe` | id PK, mission_id, callsign TEXT, platform TEXT, launch_point_id, cruise_kmh REAL, payload_kg REAL, deployed_min REAL (null until pushed forward — doubles as the fleet arrival curve) |
| `casualty` | id PK, mission_id, unit_id, role TEXT, triage TEXT, injury TEXT, penetrating INTEGER, hva INTEGER, hva_reason TEXT, responder_tier TEXT (T1\|T2\|T3), t_injury REAL, deadline_min REAL, x REAL, y REAL, outcome TEXT (SAVED\|DIED\|null), t_resolved REAL, treated_with TEXT, t_treated REAL |
| `deployment` | id PK, mission_id, t_requested REAL, t_complete REAL, `"trigger"` TEXT ('ON_DEMAND'\|'THRESHOLD'), actor TEXT, airframes INTEGER, launch_points INTEGER |
| `proposal` | id PK, mission_id, t_raised REAL, airframe_id, lead_casualty_id, gain INTEGER (percentage points), escalation_reasons TEXT (comma-separated), state TEXT (PENDING\|APPROVED\|REJECTED\|EXPIRED), t_acted REAL, actor TEXT |
| `sortie` | id PK, mission_id, airframe_id, t_launch REAL, t_return REAL, stops INTEGER, authorised_by TEXT, proposal_id (null = delegated authority) |
| `delivery` | id PK, sortie_id, casualty_id, payload TEXT, t_arrive REAL, delay_min REAL (injury→handover), delivered INTEGER, waste_reason TEXT, container_c REAL |
| `stock_txn` | id PK, mission_id, launch_point_id, item TEXT, delta INTEGER (signed), reason TEXT, t REAL |
| `telemetry_poll` | id PK, mission_id, unit_id, t REAL, actor TEXT, effectiveness REAL 0..1, level TEXT (GREEN\|AMBER\|RED), wounded INTEGER, critical INTEGER, killed INTEGER |
| `audit_event` | seq PK, mission_id, t REAL, actor TEXT, action TEXT, detail TEXT, prev_hash TEXT, hash TEXT |

Ten indexes, following the joins the saved queries actually make. `"trigger"` is
quoted everywhere because TRIGGER is a SQLite keyword.

**Thirteen saved queries** (`DB_QUERIES`, `js/db.js:542+`), each with a name, a
plain-English question and editable SQL: Preventable deaths · Delay to delivery by
launch point · Waste by responder tier · Blood ledger and waste rate · Escalations and
the human decision · Treatment inside the deadline · Airframe utilisation ·
Commander-designated casualties · Unit effectiveness over time · Cold chain
excursions · Cost of being the second stop · Fleet deployment latency · Audit log by
actor.

`DB.exec()` returns errors as **values, never exceptions** — "a typo in the query box
must not stop the mission clock" (`js/db.js:344`). The schema browser reads
`sqlite_master` + `PRAGMA table_info`, so anything an analyst creates in the query box
appears alongside the mission tables. `DB.reset()` creates a **new** database rather
than truncating, dropping any stray objects an analyst made. Export writes
`angel_swarm_mission.sqlite`, openable in any SQLite client.

Failure: if `initSqlJs` or `SQL_WASM_B64` is missing the layer degrades to empty
results with an error string; the application does not go down with it.

---

## 5. TELEMETRY INGEST

Three pieces: a Go UDP listener + SSE republisher inside the launcher
(`cmd/angelswarm/telemetry.go`), a Go device emitter (`cmd/cotsim/main.go`), and the
browser client (`app/js/telemetry.js`).

### 5.1 Transport and format

| Hop | Transport | Format |
|---|---|---|
| emitter → launcher | **UDP datagram** | **Cursor on Target (CoT) XML**, one event per datagram |
| launcher → browser | **HTTP Server-Sent Events**, `GET /telemetry/stream` | one JSON object per `data:` frame |
| launcher → browser | `GET /telemetry/status`, `Cache-Control: no-store` | JSON status object |

**The CoT event on the wire** (`cmd/cotsim/main.go:142-157`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<event version="2.0" uid="CAS-001" type="a-f-G-U-C-I" how="m-g"
       time="…RFC3339" start="…" stale="…+2m">
  <point lat="21.600000" lon="122.400000" hae="0.0" ce="25.0" le="9999999.0"/>
  <detail>
    <contact callsign="CAS-001"/>
    <_medical_ cri="0.8123" quality="0.914" hr="98.4" source="CRI-MONITOR-SIM"/>
  </detail>
</event>
```

`<_medical_>` is a **prototype extension**, not a ratified medical CoT schema, and
every layer says so — `cmd/angelswarm/telemetry.go:29-32`,
`cmd/cotsim/main.go:139-141`, `js/telemetry.js:18-23`. CoT `<detail>` is open by
design; this is that mechanism used as intended.

**The normalised JSON the browser receives** (`cmd/angelswarm/telemetry.go:56-67`):
`{uid, callsign, cri (0..1), quality (0..1), hr (bpm, 0 if absent), lat, lon, device,
at (CoT event time, RFC3339), rxAt (receiver wall clock, ms)}`.

### 5.2 Bind address and flags

| Flag | Default | Effect |
|---|---|---|
| `-port` | 8787 | preferred loopback HTTP port; binds the first free port in `[port, port+40)` on `127.0.0.1`, else an ephemeral one |
| `-no-browser` | false | do not open a browser window |
| `-quiet` | false | suppress request logging |
| **`-cot`** | `""` (**off**) | accept CoT telemetry on this UDP address, e.g. `:6969` |
| **`-cot-external`** | false | allow the listener to bind a non-loopback interface |

**Two flags, not one, to put a socket on a real interface.** With `-cot` alone, a host
that is not `localhost` and not a loopback IP is **refused** with an explicit error
naming `-cot-external` (`cmd/angelswarm/telemetry.go:193-199`). An address with no
host defaults to `127.0.0.1`. The listener is **receive-only**: it parses, never
replies, and never originates a packet. Datagrams ≥ `cotMaxDatagram` (8,192 B) are
dropped unread; the XML decoder is fed a fixed slice, never a stream. Both HTTP
endpoints are additionally wrapped in `loopbackOnly` (`cmd/angelswarm/telemetry.go:329-339`),
which 403s any non-loopback `RemoteAddr`.

Startup log line (`cmd/angelswarm/telemetry.go:341-351`):
`ingest   off — pass -cot :6969 to accept CoT telemetry`, or
`ingest   CoT/UDP on 127.0.0.1:6969 (loopback only)` /
`(EXTERNAL INTERFACE — receive-only, never replies)`.

**cotsim flags** (`cmd/cotsim/main.go:47-53`): `-target` (default `127.0.0.1:6969`),
`-devices` (24), `-rate` (0.25 reports/device/second), `-lat` (21.6), `-lon` (122.4),
`-seed` (42, deterministic), `-quiet`. Each simulated casualty starts at
CRI 0.55–1.00, loses 0.004–0.030 per minute, heart rate rises with `(1−cri)` and caps
at 178, quality decays 0.0016 per report to a floor of 0.18, and a casualty whose CRI
reaches 0 is marked dead and stops emitting. The physiology is deliberately crude —
the application has a trained network for the hard part.

**Hub back-pressure**: publish is non-blocking per subscriber (`subBuffer` 64). A tab
that has stopped draining loses the reading and it is counted as `dropped` — "losing
the oldest reading is always better than blocking the newest"
(`cmd/angelswarm/telemetry.go:140-154`). SSE sends a `: keepalive` comment frame every
15 s.

### 5.3 Link states

Client-side, `linkState()` (`js/telemetry.js:49-57`). `STALE_MS = 6000`,
`DOWN_MS = 15000`.

| State | Chip label | Trigger | Chip detail |
|---|---|---|---|
| `OFF` | **INGEST OFF** | `/telemetry/status` says `enabled: false`, or the endpoint is unreachable | none |
| `DOWN` | **LINK DOWN** | listener enabled but the `EventSource` is not open, **or** the last message is > 15 s old | none |
| `STALE` | **LINK STALE** | last message 6–15 s old | `N dev · R/s` |
| `WAITING` | **WAITING** | stream open, no message has arrived yet | none |
| `LIVE` | **LIVE** | last message < 6 s old | `N dev · R/s` |

The chip lives in the toolbar's right-hand group beside ONLINE, is a real `<button>`,
and navigates to the SENSOR pane and flashes the ingest card
(`js/telemetry.js:181-199`). The full account — SOURCE, LINK, DEVICES REPORTING,
MESSAGE RATE, MESSAGES RECEIVED — is a card injected into the SENSOR pane
(`js/telemetry.js:234-273`).

`deviceCount()` counts only devices heard from inside the 15 s window — "a monitor
that has stopped reporting stops being counted … a count that only ever goes up is a
lie by omission." Message rate is a 4-second sliding window.

**Verified on the running dev server:** `GET /telemetry/status` →
`{"bind":"","devices":0,"dropped":0,"enabled":false,"external":false,
"lastAgeSec":-1,"messages":0,"transport":"CoT/UDP"}` → state **OFF**.

### 5.4 What happens to tasking when the link drops

**Nothing stops.** `readingFor(id)` returns `null` when the reading is older than
15 s (`js/telemetry.js:121`), and the optimiser's ingest seam
(`js/optimizer.js:802-806`) simply falls through to the simulated value. Tasking keeps
running on **last-known state**: `c.knownCrm / knownAt / knownQ` retain their previous
values and the age is shown. The ingest card states this as the point of the exercise:
"Stop the emitter and the link goes down; the tasking layer keeps running on
last-known state."

Separately, the *simulation's own* comms model (`arm.commsDown`, `js/optimizer.js:810-812`)
buffers on the end-user device — `c.teleHeld++` — and ANGEL SWARM holds its
last-known-good plan and keeps flying while current triage and proximity, requested by voice,
cannot task at all.

The OFF-state card says the honest thing: "No listener. Every reading on this screen
is produced by the simulation and read back out of its own memory — which
demonstrates the tasking logic and demonstrates nothing about acquisition."

### 5.5 How a live reading supersedes a simulated one

Exactly one seam, `js/optimizer.js:770-813`, inside the per-tick telemetry loop:

1. The device is due to report if no prior reading exists, or `≥ 45 s` since the last
   one (`DEVICE.cadence`), or the zone changed.
2. The simulation computes `v = c.crmAt(t)` and `q = signalQuality(c, t)`.
3. If `window.TELEMETRY` exists and `readingFor(c.id)` returns a live reading,
   `vv = live.crm` and `qq = live.q` replace them, and `c.teleLive = true` is set.
4. Zone is recomputed from `vv`, a telemetry row `{t, v, zone, q, trigger}` is pushed
   (ring capped at 40), and `c.knownCrm/knownAt/knownQ` are written.

Everything downstream — the deadline, the tasking order, the inspector, the DuckDB
`telemetry` table — is untouched, which is what makes this an acquisition path rather
than a second simulation.

**UID matching** (`js/telemetry.js:99-115`). A CoT event names a track the way the
tactical network does — `CAS-084` — while the model carries the bare integer `84`.
`keyOf()` matches on the **trailing digits** of either form. Stated limitation: a real
monitor's uid will be a device or a person, not a casualty number; that mapping is the
roster problem and is out of scope. **Unit conversion: CRI arrives on 0..1 and the
application carries CRM on 0..100**, so `crm = cri × 100` (`js/telemetry.js:122`).

**Worker guard** (`js/optimizer.js:791-801`). `window` does not exist in a Web Worker
and `optimizer.js` is loaded verbatim into `mc.worker.js`. The `typeof window !== 'undefined'`
guard is the fix for a bug where a bare `window.TELEMETRY` threw on the first casualty
of every replication and took the whole CONFIDENCE pane down. Replications correctly
take the simulated reading.

**Published service** (`js/telemetry.js:280-291`): `ANGEL.provide('telemetry',
{readingFor, state, available, devices, rate, messages})`, plus a global
`window.TELEMETRY = {readingFor, state, available}` — the global is what `optimizer.js`
reads, because a classic script cannot rely on module timing.

---

## 6. THE MAPS

### 6.1 The renderers

**Three destinations, four renderers.** `js/page-map.js` presents three scopes; the
theatre scope has a canvas renderer and a GPU renderer that silently substitutes for
it when WebGL2 is available.

| Scope | Renderer | Kind | Camera | Layer set |
|---|---|---|---|---|
| **THEATRE** | `js/theater.js` → `#mapTheater` | 2D canvas | `APP.theaterView {k, tx, ty}` | none (fixed content) |
| **THEATRE** (GPU) | `js/theater3d.js` | deck.gl / WebGL2 | its own deck view state | its own |
| **TACTICAL 2D** | `js/map.js` + `js/basemap.js` | 2D canvas | `APP.mapViewport {zoom, cx, cy}` | `APP.layers`, 12 keys |
| **TACTICAL 3D** | `js/geo3d.js` | deck.gl / WebGL2 | deck.gl view state inside the module, reachable only via `ANGEL.get('theater3d').camera` | `G3.layers`, 9 keys |

`js/geo.js` and `js/geo3d.js` are named for geography but are different things:
**`js/geo.js` is pure data** — it declares exactly two top-level constants, `GEO`
(coastline and border runs as flat `[lon,lat,lon,lat,…]` arrays per theatre) and
`GEO_LABELS`. It contains no functions. `js/geo3d.js` is the tactical GPU renderer.

**Which map is under the operator** — `mapScopeNow()` (`js/app.js:543-548`):
`APP.view === 'DASHBOARD'` → `THEATRE`; `APP.view !== 'MISSION'` → `null` (no map, so
no map control is offered); otherwise `APP.mapMode === '3D' && map3dReady()` ? `'3D'`
: `'2D'`.

**Which controls each map offers** — `MAP_TOOLS_BY_SCOPE` (`js/app.js:593-597`):

| Scope | legend | layersAll | fit | zoomIn | zoomOut | sideBySide |
|---|---|---|---|---|---|---|
| THEATRE | — | — | ✓ | ✓ | ✓ | — |
| 2D | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3D | ✓ | ✓ | ✓ | ✓ | ✓ | — |

The theatre picture draws no layers and has no second arm, so those controls are
**not offered rather than offered-and-disabled**. "A control that is present is a
control that works." The 3D segment is not drawn at all on a machine that cannot run
it — `map3dReady()` is the whole availability test.

### 6.2 THEATRE — `js/theater.js`

Draws the combatant command, not the map sheet. Equirectangular with a `cos(lat)`
correction at the theatre centre (`theaterProjector`, `js/theater.js:22-38`). The
projection is `px = k·fit(lon) + tx`, so the inverse and the scale bar both fall out of
one number and the 1,000 km bar is correct at any zoom without knowing zoom exists.

**Camera.** `{k, tx, ty}` — a multiplier on the fit and a translation in canvas
pixels. `THEATER_ZOOM = [1, 8]`. `{k:1, tx:0, ty:0}` is the whole AOR fitted to the
frame, which is where it opens and where reset and double-click put it back.
`clampTheaterView()` keeps at least a third of the AOR rectangle over the canvas in
each axis, so there is no drag that ends on empty ocean.
**Symbol sizes and type deliberately do NOT scale** — this is a symbol map, and a JOA
box that grew to 120 px at 4× would say something untrue about the size of a brigade
fight.

**What it draws, in order** (`js/theater.js:78-215`): ocean gradient → graticule
(and the equator if it crosses) → landmasses filled from `GEO[th.key].coast` →
international boundaries from `.border` → everything outside the command boundary
masked with an even-odd fill → the translucent blue AOR field → place names from
`GEO_LABELS` → the combatant command HQ → **every joint operations area at its true
lon/lat**, each as a friendly infantry unit symbol with an engagement footprint (a JOA
is genuinely this small at theatre scale), a readiness pip, a live pulse on whichever
JOA is being simulated, and a label → hovered-JOA highlight → scale bar.

### 6.3 TACTICAL 2D — `js/map.js` + `js/basemap.js`

Draws the common operating picture: shaded-relief basemap, graticule, threat
envelopes, casualty symbology, launch points, aircraft, flown tracks, planned routes,
reach rings.

**Camera.** `APP.mapViewport {zoom, cx, cy}` — `cx/cy` in scenario kilometres. Fitted
at scenario load to the AO centre (`js/app.js:504`).

**Layer set — `APP.layers`, 12 keys** (`js/app.js:32-33`), gated through
`L(key)` (`js/map.js:588`):

| Key | Draws | Gate at |
|---|---|---|
| `stable` | casualties whose reserve is above the yellow band | `map.js:585` |
| `falling` | casualties below CRM_YELLOW (70) | `map.js:584` |
| `critical` | casualties below CRM_RED (40) | `map.js:583` |
| `saved` | resolved SAVED | `map.js:580` |
| `died` | resolved DIED, and the death marks at zoom > 3.4 px/km | `map.js:579,835` |
| `hva` | commander-designated high-value casualties | `map.js:578` |
| `air` | aircraft | `map.js:1013` |
| `uav` | the command UAV / overwatch | `map.js:1115` |
| `base` | launch points, reach rings, base labels | `map.js:887,918,977` |
| `threat` | threat envelopes | `map.js:725` |
| `geo` | coastline / terrain detail and the scenario boundary | `map.js:672,696` |
| `grid` | the graticule | `map.js:651` |

`layersAll` toggles every key on if any is off, otherwise all off (`js/app.js:4768-4773`).

**The basemap is generated, not tiled** (`js/basemap.js`). `buildBasemap(scn)`
samples the scenario's own procedural elevation field into an offscreen canvas at
**9 px/km**, extended 66 km in X and 26 km in Y beyond the AO, and paints:
hypsometric tints (7-stop ramp, green-grey low ground to warm rock at 340 m),
hillshade, **25 m contours with every 4th as an index contour**, a 3-stop bathymetric
ramp with 30 m bathymetric contours, and a coastline. Built once per scenario and
blitted under the symbology. **No tile server, no external tile CDN, no network.**

**Colour contract.** No hex literal for a semantic quantity anywhere in `map.js`.
Every colour is a CSS custom property declared four times in `css/theme.css`, read off
the live `<body>` through `MAPTHEME` in **one** `getComputedStyle` call, cached, and
invalidated on exactly two events: `ANGEL.emit('theme', key)` and a mutation of the
`data-theme` attribute. `js/geo3d.js` and `js/theater3d.js` reach it through
`window.MAPTHEME`, each with a local fallback palette so a missing service degrades to
console-dark rather than throwing inside a GPU frame.

### 6.4 TACTICAL 3D — `js/geo3d.js`

The same fight on the GPU: a pitched, rotatable, deck.gl-rendered surface with the
sector's shaded-relief sheet under it, every sortie as an arc, and every casualty
carrying a light column whose height is how much time that soldier has left.

**Camera.** deck.gl `MapView({repeat: false})` view state `{longitude, latitude, zoom,
pitch, bearing}`, held in `G3.view` and owned entirely by this module — it never looks
at `APP.mapViewport` or `APP.theaterView`. Fit default: `pitch 48`, `bearing −16`
(`js/geo3d.js:2996-3010`). Interaction: arrow keys pan, +/− zoom, shift-drag to pitch
and rotate. Presets: **FIT**, **TOP-DOWN** (flattens the camera and stays on the GPU
map — renamed from "2D" because a camera preset labelled 2D read as the renderer
switch, which it is not). Rail zoom/fit/layer controls reach it through the four
functions on `ANGEL.get('theater3d').camera`.

**Layers drawn** (`js/geo3d.js:2263-2540`):

| deck.gl layer | id | Content |
|---|---|---|
| LineLayer | `g3-grat` | graticule (major only below zoom 7.4; **dropped entirely on a software renderer**) |
| SolidPolygonLayer | `g3-ne-land` | Natural Earth land fill |
| PathLayer | `g3-ne-lines` | Natural Earth coastlines and borders |
| BitmapLayer | `g3-sheet` | the sector's shaded-relief sheet (a **flat** image, not extruded) |
| SolidPolygonLayer | `g3-ao` | the AO field |
| PathLayer | `g3-control` | control measures |
| PathLayer | `g3-dyn` | dynamic paths |
| PolygonLayer | `g3-threats` | threat envelopes |
| ArcLayer | `g3-arcs` | sorties as arcs over the water |
| TripsLayer | `g3-trips` | aircraft trails |
| LineLayer | `g3-spikes` | casualty time columns |
| ScatterplotLayer | `g3-pulse` | casualty dots, **pulse rate = time left** |
| IconLayer | `g3-icons` | symbol atlas, billboarded, de-rotated against camera bearing |
| TextLayer | `g3-chips` | non-overlapping label chips |

**Nine operator layer toggles** (`TOGGLES`, `js/geo3d.js:2782-2786`):
Real geography · Sector terrain · Route arcs · Aircraft trails · Casualties ·
Time columns · Threat envelopes · Sectors & units · Labels.

**It is a replay, not a live read.** The run is re-executed once, deterministically,
from the same scenario key and seed the application is using, and every position is
recorded (`js/geo3d.js:28-33`). That is why scrubbing backwards works and is instant.
Transport bar: play/pause, `T+MM:SS` clock, scrubber with marks, replay rate, **LIVE**
(follow the application clock), FIT, TOP-DOWN. Footer states seed, whether ANGEL SWARM
was deployed and from when, FPS and layer count, and
`TERRAIN FROM THE SIMULATION · COAST NATURAL EARTH 1:50M`.

**Terrain sheet.** `TERRAIN_CELL_KM = 1.2`, `TERRAIN_MARGIN_KM = 24`, `Z_GROUND = 0`.
Deliberately **flat**: an earlier build extruded the cells and it read as
low-resolution rather than as landform, and casualties on high ground were swallowed
inside the geometry. Relief is carried by hillshade and contours. Height in this view
belongs to the data — the arcs and the columns — not to the ground.

**Authority statement** (`js/geo3d.js:15-19`): inside the sector the authority is the
simulation's own terrain field, not Natural Earth; the extruded terrain block is drawn
over the real coastline to say so.

**When the GPU map is withheld** (`removeSelf()`, `js/geo3d.js:3540-3568`;
dispatch at `js/geo3d.js:3576-3580`):

| Condition | Result |
|---|---|
| `!ANGEL.caps.webgl2` | withheld — "WebGL2 unavailable on this machine — the 2D maps remain the path" |
| `createWorld`/`stepArm` missing | withheld — "simulation not loaded" |
| deck.gl bundle will not import | withheld — "deck.gl bundle would not load — the 2D maps remain the path" |
| any exported symbol missing from the bundle | withheld (the bundle is audited symbol-by-symbol before a single layer is constructed) |
| `index.html:631` module `onerror` | removes `#mapModeSw` and `#g3Host` |

Withdrawal removes the mode switch and the host element, clears `body.map3d`, forces
`APP.mapMode = '2D'`, and sets status `withheld` (a first-class state distinct from
`failed`). It **deliberately does not write `'2D'` to storage** — the machine that
cannot run this today may be a different machine tomorrow with the same profile, and a
capability withdrawal should not look like a preference.

**Software-renderer degradation** (`js/geo3d.js:3670-3673`): if
`ANGEL.caps.glRenderer` matches `/swiftshader|llvmpipe|software|basic render/i`,
`G3.lowGPU` is set — the relief sheet is sampled at half resolution and the two
decorative line layers come off. **Everything that carries information stays**, and the
footer prints `SOFTWARE RENDERER — DETAIL REDUCED` in amber.

### 6.5 The basemap — confirmed local

**`app/data/basemap.json`, 329,624 bytes.** Self-describing:

- `note`: *"Natural Earth 1:50m via world-atlas 2.0.2 (ISC). Coordinates are [lon,lat] in degrees, rounded to 3 [decimals]…"*
- `encoding`: *"flat delta-encoded integer millidegrees; [lon,lat] pairs, first pair absolute"*
- `regions.PACOM`: `bbox`, `land` (467 polygons), `coarse` (41), `borders` (22), `bboxes` (467)
- `regions.EUCOM`: `bbox`, `land` (213), `coarse` (15), `borders` (81), `bboxes` (213)

Read by `js/geo3d.js:41` and `js/theater3d.js:56`. `js/theater3d.js:67` also probes for
an optional `data/theater-basemap.json` and checks a directory listing before
requesting it (`js/theater3d.js:359`); **that file is not present in this build**, so
that path is inert.

The second geographic dataset is **embedded in `js/geo.js` as source** — GSHHS
shoreline and CIA WDB-II boundaries as shipped with matplotlib-basemap,
Douglas-Peucker decimated to roughly 0.13° and clipped per theatre. Used by
`js/theater.js` only.

**Everything on every map is local.** `ANGEL.asset()` (`js/boot.js:116`) resolves every
path against `document.baseURI`; there is no absolute host anywhere in the
application. Three CDN strings inside the vendored deck.gl bundle are only reachable
if a layer is handed a URL as `data` or debug mode is on; every layer is handed a plain
JavaScript array and debug is never set. A Playwright check asserts zero requests off
`127.0.0.1` (`js/geo3d.js:20-26`). At theatre scale there is **no terrain dataset** —
`js/theater3d.js:26-32` states plainly that the land tint and hillshade are computed
from distance-to-coastline plus a seeded noise field, that it is a cartographic wash,
and that it is labelled on the map as such; only the coastline, borders, AOR boundary
and operation positions are real data.

---

## 7. PROVENANCE MARKING

`PROV`, `js/app.js:3108-3226`. Fifteen keys in two kinds.

### 7.1 The marks

**AI marks (`kind: 'ai'`) — four. These are the only marks that render.**

| Key | Label on the mark | Compact | Tag | Claim |
|---|---|---|---|---|
| `CRI` | AI: CRI-Net · Predicts collapse | AI: CRI-Net | PREDICTS COLLAPSE | "A trained model produced this." CRI-Net — a 104,162-parameter convolutional network. Reads 5 s of pulse waveform at 100 Hz; answers how long before the body stops compensating; reports its own uncertainty. Held-out error 0.069 against 0.159 for heart rate alone. |
| `TRUST` | AI: CRI-Net · Refuses when unsure | AI: trust gate | REFUSES WHEN UNSURE | "A trained model produced this — and it is allowed to decline." Act below 0.469, refuse above 0.591. Measured percentiles of clean signal. Error inside the first is 0.063; past the second, 0.115. |
| `RETRIEVAL` | AI: MiniLM · Quotes doctrine | AI: MiniLM | QUOTES DOCTRINE | "A trained model found this passage. It did not write it." all-MiniLM-L6-v2, 384 dimensions. Ranks and returns verbatim words with the score. Below 0.35 it declines. It quotes and cannot generate, which is why it cannot invent a citation. |
| `LLM` | AI: Qwen 0.5B · Drafts the brief | AI: Qwen 0.5B | DRAFTS THE BRIEF | "A language model wrote this prose." Outside the tasking path entirely; nothing it writes is read back by any decision; every figure it was given is printed underneath the draft. |

**Deterministic keys (`kind: 'det'`) — eleven. `prov()` returns an empty string for
every one of them, so they draw nothing** (`js/app.js:3283-3284`).

| Key | Glyph / word / tag | Names |
|---|---|---|
| `OPTIMISER` | f(x) · NOT AI · SCHEDULING | The tasking optimiser — deterministic constrained scheduling |
| `COMPUTED` | Σ · NOT AI · ARITHMETIC | Computed from this run's own record |
| `SIM` | Σ · NOT AI · SIMULATION | The scenario engine — a deterministic discrete-step simulation |
| `MONTECARLO` | Σ · NOT AI · REPLICATED TRIAL | 200 paired replications under common random numbers |
| `COSTING` | f(x) · NOT AI · COST ARITHMETIC | Cost and return arithmetic |
| `GEOMETRY` | f(x) · NOT AI · GEOMETRY | Distance, reach and endurance arithmetic |
| `PUBLISHED` | Σ · NOT AI · PUBLISHED FIGURE | A figure taken from the literature or from doctrine |
| `HASHCHAIN` | f(x) · NOT AI · HASH CHAIN | The audit chain over this run's decision record |
| `SQL` | f(x) · NOT AI · YOUR QUERY | A database engine over this run's own tables |
| `RULE` | f(x) · NOT AI · WRITTEN RULE | A doctrinal threshold, applied |

**Legacy aliases** (`AI_KIND`, `js/app.js:3313`): `ai('LEARNED')` → `CRI`,
`ai('AUTONOMOUS')` → `OPTIMISER`, `ai('DERIVED')` → `COMPUTED`. Every existing call
site keeps working; the last two now resolve to a mark that draws nothing.

### 7.2 The rendered mark

`prov(key, detail, opts)` (`js/app.js:3281-3298`). One inline `.ai-attr` unit from the
`ai-marks-v2` sheet, mark 03 "sparkle trio": an `<svg class="ai-mark">` using
`#i-sparkle3`, plus the wordmark as **real text** in `.ai-attr-label` with a clipped
gradient — selectable, searchable, in the console's own font. The glow is a
`drop-shadow` on the **wrapper**, never on the SVG, because a filter on the SVG alone
leaves the label unlit.

Colourway `AI_RAMP = ['#A78BFA', '#22D3EE', '#67E8F9']` (`js/app.js:3305`) — the
sheet's Nebula ramp with the third stop replaced by the console's cyan, because the
sheet's native `#F0ABFC` "drifts anywhere near magenta — this is the military and that
colour is not available to us."

Every mark is `tabindex="0" role="button" aria-haspopup="dialog"` with an
`aria-label` built by `provSay()` = `lead + name + text + where + (detail ? ' Here: ' + detail : '')`.
Pressing it opens the model inventory scrolled to that model's card
(`js/app.js:6086`). `opts.compact` drops the tag and keeps the word, for dense strips
where the same badge repeats down a column of tiles.

### 7.3 The rule for when a figure carries a mark

**Three levels, all declarative.**

1. **The view stamp** — `VIEW_PROV`, `js/app.js:5647-5687`. Every one of the 25 panes
   is listed with a key, an optional selector, a note, and `nav: 1` for the four
   destinations whose *substance* a trained model produced. `paintViewProvFor()`
   inserts the mark into the pane's `.ph1 h2` (or the named selector), is idempotent
   (skips a heading already carrying `.pMark`), and bails before insert if `prov()`
   returned empty — so a deterministic view is not stamped with a stray space every
   frame. `sel: null` means rail glyph only, by design (MISSION and SETTINGS).
2. **The rail glyph** — `paintViewProv()` appends a `.navAi` sparkle to every
   `.navItem[data-view=…]` whose `VIEW_PROV` entry has `nav: 1`, with
   `title="Machine learning on this screen. {model name} — {tag}."`
3. **One mark per figure-group** — a declarative, per-destination selector table
   (`js/app.js:5740-5910`). A figure-group is *the thing that owns a calculation* — a
   stat tile, a card head, a chart head, a counts strip, or a table column whose
   provenance differs from its table's — **never a digit**. The enforced rule: a group
   already carrying a mark, or sitting inside one that does, is skipped. Rules match on
   the tile's own **words**, not its position, so re-ordering a strip cannot silently
   mislabel it. `at` names where inside the group the mark mounts, so it lands in the
   label and not on top of the number.

**The four AI destinations** (`VIEW_PROV`, `nav: 1`): SENSOR, CASUALTIES, DOCTRINE,
BRIEF, MISSION — five entries, four keys, and BRIEF's pane is removed in the shipped
state, leaving four live: **SENSOR, CASUALTIES, MISSION** (`CRI`) and **DOCTRINE**
(`RETRIEVAL`). Every other pane carries nothing.

The rendered "where it is, in the rail" paragraph computes both counts live
(`provViewCount()`, `js/app.js:5372-5375`) from panes actually present, so it cannot
drift; only the *comment* above it says "Four out of twenty-two", and 25 panes exist.

### 7.4 What the marks claim is NOT machine learning

Ten named entries in the model sheet's second block (`js/app.js:5465-5501`), each with
what it is and why it is not learning: the tasking optimiser (`js/optimizer.js`), the
confidence sweep (`js/montecarlo.js`), the simulation + maps + charts, the query
console (DuckDB-WASM), the arithmetic over the run's record (`js/app.js`), the cost
and return arithmetic, the distance/reach/endurance arithmetic, the audit chain, the
doctrinal thresholds, and the published figures.

The strongest sentence in the product is on the optimiser card: *"This is the heart of
the product and it is **not machine learning**. It has no weights and nothing about it
was learned. The same inputs give the same answer every time, which is the property
that makes it accreditable and the property a network would not have."*

---

## 8. ROLES AND THEMES

### 8.1 The four role profiles

`ROLE_PROFILES`, `js/app.js:6266-6273`. Storage key `angel.role`.

| Key | Label | Blurb | `views` |
|---|---|---|---|
| `COMMANDER` | COMMANDER | Decision support | `PRIMARY_VIEWS` |
| `LOGISTICIAN` | LOGISTICIAN | Supply chain | `PRIMARY_VIEWS` |
| `SURGEON` | SURGEON | Medical operations | `PRIMARY_VIEWS` |
| `ANALYST` | ANALYST | Everything, unchanged | `null` = every pane in the document, rail untouched |

`PRIMARY_VIEWS` = `DECIDE, MISSION, CASUALTIES, FLEET, LAUNCHPOINTS, SUPPLY, TASKING,
CONFIDENCE, AFTERACTION, BRIEF` — the **same ten destinations, in the same order,
under the same names, for every role**.

**What a role does NOT change any more.** Before v3.2 each profile carried its own
`views` list *and* its own `labels` map, so the same screen was "Waiting on you" to a
commander and "Approvals" to a logistician. `labels` is gone; the rail is identical for
everybody. "It was defensible as tailoring and it read as chaos: a person who had
learned the console in one profile could not find anything in another."

**What a role does change:** which figures lead on each pane, which column the
inspector shows, and what the decision bar says.

**Mechanism.** A pure CSS attribute rule on `data-roles`, so a pane rebuilt 60×/s is
filtered 60×/s with no work done by anybody, and markup the engine has never seen is
filtered the instant it enters the document. `filter(root)` exists only for the two
cases CSS cannot reach — a subtree not yet inserted, and a caller needing
`aria-hidden` for a screen reader.

**API** — `ANGEL.role`, also `ANGEL.get('role')`, also `window.setRole(k)`:
`current()`, `has(k)`, `keys()`, `profile(k)`, `views(k?)`, `landing(k?)`, `set(k)`,
`cycle(step?)`, `on(fn)`/`off(fn)`, `filter(root)`.

**Safety rules.** `roleViews(k)` applies two filters — the profile's own list, and
whether the pane is still in the document, because modules delete their own pane and
rail entry when they fail. A pane marked `data-placeholder` stays on the rail but is
excluded from the landing rule, so a role switch never drops an operator onto an empty
pane. `ROLE_FALLBACK = ['MISSION', 'DASHBOARD', 'COMPARE', 'SETTINGS']` is the last
line of the no-blank-screen rule and is deliberately made of shell panes rather than
module panes. A listener that throws is caught and logged and cannot take out the
switch.

**The three composition files.**

| File | Destinations | The one question the role is asking | Panes genuinely overridden |
|---|---|---|---|
| `js/role-commander.js` (97 KB) | DECIDE, MISSION, COMPARE, TASKING, COST | "What do I decide, what does it cost, and what happens if I do nothing" | DECIDE and COST (both shipped as bare mount points) |
| `js/role-logistician.js` (88 KB) | DASHBOARD, SUPPLY, FLEET, MISSION, STREAM, TASKING, COST | "Do I have the right stuff, in the right place, at the right temperature, and what am I about to run out of" | DASHBOARD |
| `js/role-surgeon.js` (94 KB) | CASUALTIES, MISSION, FLOW, STREAM, SENSOR, DOCTRINE, TASKING, UNITS | "Who is dying, how fast, who can reach them, and is anyone on scene qualified to treat what they need" | CASUALTIES |

**The rule held throughout: roles remove surface, never capability.** Where a role's
composition drops a block, the block is collapsed behind one affordance labelled
"show the detail" and is one click away, never deleted. Every pane remains one ⌘K away
from every role. Inherited panes are *reduced*, not rebuilt: the native renderer runs
first and unconditionally, the role file adds its answer at the top. Nothing is removed
from the document, so switching to ANALYST mid-sentence returns every pane whole.

**Named substantive changes:**
- **Commander / COST** leads with the procurement finding — launch points move the
  death count, fleet size does not — and adds an order-of-battle editor whose
  reinforcements are given to **both arms** so the comparison stays level.
- **Logistician / SUPPLY** splits "wasted" into the **three distinct logistics
  failures** the simulation actually distinguishes: delivered to an unqualified
  responder (a matching failure), above the transfusable band on arrival (a cold-chain
  failure), released and never recovered (a delivery failure). Collapsing them into one
  column "throws away the only part of the number that tells anyone what to do about
  it." DASHBOARD leads with projected time to stockout per item per launch point,
  computed from `arm.stockLog` against the scheduled resupply rate, and says which of
  "too little history" or "resupply outrunning demand" applies rather than printing a
  number that reads like a forecast.
- **Surgeon / CASUALTIES** replaces a 2,306-element, 133-control register with four
  counts and a worklist ordered by time remaining; the full register, its search box,
  six filters and 125 star toggles are one labelled control away, unmodified. The
  third of the four counts is **the tier gap** — whole blood and plasma are Tier 3
  skills, the tier mix is 58% buddy / 32% combat lifesaver / 10% medic, so most
  casualties who need blood have somebody on scene who is not allowed to give it.

**Shared vocabulary rules all three enforce:** every counted noun comes from `COUNT`;
a death count is never green and never "saved" — the two colours are `--tollHi` and
`--tollLo`, and the better of the two is **amber**, because fewer dead is still dead;
the phrase is "fewer dead"; the target is zero and the interface says so on the screen
where the number is largest; and every figure names its population, because three
different quantities in this application can honestly be called "died".

### 8.2 The four themes

`js/theme.js:47-56`. One attribute write is the whole mechanism —
`data-theme` on both `<body>` and `<html>`. `css/theme.css` declares every token four
times. Storage key `angel.theme`, default `console-dark`.

| Key | Label | What it is for (verbatim blurb) |
|---|---|---|
| `console-dark` | Console dark | "The approved console. Near-monochrome chrome, colour only where it means something." |
| `night-ops` | Night ops | "Deeper and colder for a darkened room. Nothing on the chrome competes with the map." |
| `field-slate` | Field slate | "Warmer, greyer, wider tone steps. For a bright tent or a daylit vehicle." |
| `high-contrast` | High contrast | "Maximum separation. Every coloured run measured at 7:1 or better." |

**Flash prevention:** the attribute is written by four inlined lines at the top of
`<body>` in `index.template.html`, before the first style resolves. `theme.js`'s job on
boot is only to agree with what is already on the element. If that block is removed the
application still works and flashes — "the block is the fix, not the mechanism."

**Canvas and WebGL redraw:** those renderers cannot inherit a custom property. They
read tokens at draw time and redraw on `ANGEL.emit('theme', key)`, fired on **every**
apply including a set to the already-active theme, so a listener that resyncs
unconditionally is correct. For `js/geo3d.js` a theme change is a **rebuild, not a
repaint**, because two of its assets are baked images — the symbol atlas and the
shaded-relief sheet — and neither can be restyled by a CSS custom property
(`js/geo3d.js:3690-3710`).

**Migration:** a retired two-state light/dark toggle (`APP.theme`, `#themeToggle`,
`body.light`) is translated once on first boot — `'light'` → `high-contrast`,
`'dark'` → `console-dark` — and the old key removed so the translation cannot run
twice.

**API:** `ANGEL.get('theme')` → `list()`, `keys()`, `label(k)`, `current()`, `set(k)`,
`cycle(n)`, `on(fn)`, `off(fn)`, `token(name)`. `token()` is the one supported way for
a canvas or a shader to learn a colour (see `THEME_CONTRACT.md`).

Adding a fifth theme is one entry in `THEMES` plus one block in `css/theme.css` and no
other edit anywhere: the picker, the command palette and the shortcut sheet all read
the list.

---

## 9. UNTRACEABLE AND CONTRADICTED CLAIMS

**Every item below is a figure or statement on screen (or in a shipped document) that
cannot be traced to a source in this repository, or that the repository contradicts.
A designer must not enshrine any of them.**

### 9.1 Contradicted by the code — highest severity

**C1. "CRI-Net produces every casualty's physiological deadline."**
`js/app.js:5403`, `js/app.js:5649` (CASUALTIES view note), `js/app.js:5659` (MISSION
view note), and the ~14 selector rules at `js/app.js:5768-5884` that stamp the `CRI`
mark on any header matching `/collapse in|compensatory reserve|time to collapse/i`.
**Contradiction:** deadlines are `rng.normal(18.3, 7.94)` etc. at `js/sim.js:647-651`;
reserve is `frac × 100` at `js/sim.js:678-680`; the only writer of the value tasking
reads is `js/optimizer.js:809`; nothing in the codebase subscribes to `ANGEL.emit('cri')`.
**Effect:** the CRI mark is applied by class-and-wording selectors across at least
eight destinations, so the AI claim lands on a large and unbounded set of figures that
are arithmetic. (`js/app.js:3097` records that an earlier revision of the mark system
had "eleven badges covering thirteen hundred figures" — the same order of magnitude.)
This is the exact failure the provenance system exists to prevent.

**C2. "The only learned quantity that reaches a tasking decision."** `js/app.js:5403`.
**Contradiction:** no learned quantity reaches any tasking decision.

**C3. The trust gate's `surf` claim.** `js/app.js:5430`: "SIGNAL POOR — READING
UNRELIABLE on a casualty's record, which is the same refusal as it reaches the tasking
system: the flag is carried on the telemetry rather than recomputed."
**Contradiction:** that flag is `signalQuality(c, now) < DEVICE.qualityFloor` where
`qualityFloor = 0.42` (`js/sim.js:887`, applied `js/app.js:3327,3335`). `signalQuality`
is a closed-form function of `crmAt()` and a per-casualty hash (`js/sim.js:891-897`).
It has nothing to do with CRI-Net's variance head or with the 0.4689 / 0.5911
boundaries. Two different mechanisms are presented as one.

**C4. Baseline triage figures on the model sheet.** `js/app.js:5610-5611`: "**Realistic**
applies START's published error: 57.8% sensitivity, 26% over-triage" / "Pooled
meta-analysis, ~360,000 patients: START relative sensitivity 57.8%, specificity 93.6%."
**Contradiction:** `js/sim.js:83-84` sets `START_SENSITIVITY: 0.90`,
`START_OVERTRIAGE: 0.14`, sourced to METASTART (Franc JM et al., Prehosp Disaster Med
2022;37(1):106-116). `js/sim.js:62-78` explicitly records that 26.0/13.6 "came from
medical undergraduates triaging simulated patients, described here as a pooled
meta-analysis of ~360k patients, which it is not" and that 57.8/93.6 "were RELATIVE
figures from a head-to-head comparison, not absolute accuracy." **The constants were
corrected; the model sheet was not.** `js/montecarlo.js:52-63` also uses the corrected
values. The model sheet is the one screen written to survive a hostile reading, and it
carries the retracted numbers.

**C5. The CRM lead-time citation on the model sheet.** `js/app.js:5608`: "Field testing
flagged casualties 16–25 min ahead, ordering triage priority correctly in 93% of cases
(Mil Med 2025;190 Suppl 2:371)." **Contradiction:** `js/sim.js:106` states the 16:35
and 25:44 figures "often quoted as a '16-25 min field range' are **TWO INDIVIDUAL
CASUALTIES** at the 2024 Army Warfighter Expeditionary Experiment, not a cohort range."
The model sheet presents them as a cohort finding.

**C6. "Both marks draw now."** `js/app.js:3095-3100` and `js/app.js:5573-5580` both
assert at length that the deterministic mark renders and that "every calculation on
every screen carries one of these two." **Contradiction:** `prov()` returns `''` for
every `kind !== 'ai'` key (`js/app.js:3283-3284`), and the immediately preceding
comment block ("AND THERE IS NO SECOND MARK", `js/app.js:3266-3279`) says the second
mark was removed as not-in-the-sheet. **Only the four AI marks render.** The model
sheet's key section renders a row for each deterministic key with an **empty mark
cell**, and its closing paragraph makes a claim about a mark that is not drawn.

### 9.2 Untraceable figures

**U1. "roughly a factor of three and a half in standard error, measured."**
`js/montecarlo.js:15-17`. No stored measurement, no fixture, no test. The pane shows
the live `unpairedSE / pairedSE` ratio, which may or may not be 3.5 on any given run.
*(Comment only — not on screen. Low risk, but it seeds a number people repeat.)*

**U2. "24 dead with ANGEL SWARM against 34 on current triage and proximity, PACOM CORAL, seed 42."**
`js/montecarlo.js:4-5`. No fixture in the repository records this run's output.

**U3. "They are 23, 31 and 248 in the reference run."** `js/role-commander.js:42-43`
(the three populations that can be called "died"). No fixture records these.

**U4. Doctrine's refusal floor rationale.** `js/doctrine.js:376-379`: "Set from the
observed floor of the build-time evaluation: correct answers in that set score from
0.43 upward, and the retrievals that fall under 0.35 are the ones where the corpus
genuinely has nothing." **`doctrine.json.eval` stores `n`, `top1`, `top5`,
`questions` and `misses` — it does not store any similarity scores.** The 0.43 figure
cannot be checked against anything that ships. The 0.35 constant is real; its
justification is not verifiable.

**U5. Doctrine's question-wording claim.** `js/doctrine.js:768-772`: "'When should
whole blood be transfused' returns the transfusion-reaction passage; the phrasing below
returns the passage that states the preference, at **0.84 instead of 0.69**." Neither
score is recorded anywhere in the repository.

**U6. Qwen's parameter count and file size.** `js/copilot.js:70,72`: "494 million",
"398,000,000 bytes". Both are `TARGET` constants, unverifiable in this build because
the weights are absent. The card does substitute measured values (`general.size_label`,
`general.file_type`, layer count, embedding width, byte count) once the file is loaded
— so this is honest *if* the file arrives, and unverifiable until then.

**U7. `EXPECTED_SHA256` is empty.** `get-model.sh:71`. The script verifies against the
digest the repository declares at download time, but there is no pinned trust anchor in
the package. The script says so in its own comments; a designer showing an "installed
and verified" state must not imply a pinned digest.

**U8. wllama CDN-string rewrite.** `js/copilot.js:37-49` documents three literals
replaced with unresolvable schemes at vendoring time. Not re-verified here (the bundle
is minified); the claim is a build-process assertion, not a checkable artefact.

**U9. Every dollar and schedule figure in the IL5 analysis.**
`OUT/ANGEL-SWARM-IL5-deployment-cost-impact-analysis.md`. ROM planning estimates, not
derived from anything in the repository. The document labels itself correctly ("Not a
bid"), but nothing in the repository computes or substantiates them.

*(Checked and found TRACEABLE, so not a defect: the surgeon pane's "58% buddy, 32%
combat lifesaver, 10% medic" tier mix is `TIER_MIX = [['T1',0.58],['T2',0.32],
['T3',0.10]]` at `js/sim.js:126`, and the Tier-3 gating of BLOOD, PLASMA and TXA is on
the payload definitions at `js/sim.js:130-134`.)*

### 9.3 Conditional inconsistencies a designer should design around

**I1. The AI sparkle survives model failure — for three of the four destinations.**
`paintViewProv()` (`js/app.js:5713-5731`) draws the rail sparkle for every `nav: 1`
entry whose pane exists, with **no check that the model actually loaded**. The model
sheet claims "Where a model is absent, the row says so and the badge for it is not
drawn anywhere in the application" (`js/app.js:5353-5354`), and repeats it for the LLM
row at `js/app.js:5462`. That holds only for `LLM`, because
`js/copilot.js` removes its pane. If `cri-net` or `doctrine` fails to load, their panes
survive (showing "Model unavailable" / "Retrieval unavailable") and **the sparkle is
still drawn on SENSOR, CASUALTIES, MISSION and DOCTRINE.**

**I2. Two withdrawal idioms that look different to a user.** `doctrine` withdraws on
`!wasm` but survives a load failure; `copilot` withdraws on absent weights but survives
a corrupt file; `montecarlo` and `geo3d` withdraw and set an explicit `withheld` status;
`cri-net` never withdraws. There are four behaviours for "this subsystem is not
available" and a designer needs one visual vocabulary that covers all of them:
**withheld** (deliberate, capability-based), **failed** (unexpected), **not installed**
(user-fixable), and **absent** (module removed).

**I3. `ppg_traces.json` ships but is never loaded.** 25,639 bytes of demonstration
waveforms in `app/models/` with no reference anywhere in `app/js/`. Either wire it or
drop it.

**I4. `data/theater-basemap.json` is probed for and does not exist.**
`js/theater3d.js:67,359`. The optional path is inert in this build.

**I5. Two SQL engines with overlapping stories.** DuckDB (`QUERY`) and SQLite (`DATA`)
both present a schema browser, a saved-query list and a query box over "the run's own
record", with different table names, different arm handling, and only one export
button. A designer must decide whether both destinations survive; today a reviewer can
run "how many died" in two places and get results shaped differently.

---

## 10. QUICK REFERENCE — MODEL-PRODUCED VS ARITHMETIC

**Model-produced numbers, exhaustively:**

| Number | Model | Where |
|---|---|---|
| CRI estimate (`criVal`) | CRI-Net regression head | SENSOR pane only |
| 95% interval `lo`–`hi` (`criCI`), and the interval ribbon | CRI-Net variance head | SENSOR pane only |
| The trust band (ok / warn / bad) | CRI-Net variance head vs measured percentiles | SENSOR pane only |
| Passage cosine similarity | all-MiniLM-L6-v2 | DOCTRINE pane; the copilot's `D` blocks |
| Sentence cosine similarity | all-MiniLM-L6-v2 | DOCTRINE pane |
| The passage ranking / "also matched" order | all-MiniLM-L6-v2 | DOCTRINE pane |
| The prose of the after-action brief and follow-up answers | Qwen2.5-0.5B | BRIEF pane — **withdrawn in this build** |

**That is the complete list. Everything else on every screen is arithmetic,** including:
every compensatory reserve and every collapse time on every casualty record, table,
inspector column and map column; the SIGNAL POOR flag; every death count, sortie
count, waste figure and cost figure; every confidence interval, effect size and
sweep curve; every SQL result; every distance, reach and endurance; every hash; every
map. The quoted doctrine text is not model-produced either — it is verbatim bytes from
`app/data/doctrine.json`, which is the whole point of using an encoder with no decoder.

**Measurements that are neither** (they are timings and counters of the models, not
outputs of them): inference p50 latency, inference count, model load time, embed ms,
search ms, p50 query latency, tokens/sec, tokens written, prompt tokens read.
