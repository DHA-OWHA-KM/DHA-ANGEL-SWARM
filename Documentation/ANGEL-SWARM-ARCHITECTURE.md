# ANGEL SWARM — architecture and decision record

**Current as of v1.0, 5 September 2026.** The body of this document is the
v3.1 decision record — how the local-deployment build and its telemetry
ingest tier were built, what was measured, and every trap that was hit. That
record is still accurate about the things it describes and is deliberately
kept. **§0 below states what has changed since, and it takes precedence
wherever the two disagree.**

---

## 0. What has changed since the v3.1 record

| | |
|---|---|
| **Package** | **Three** archives, not two, split only by a 30 MB delivery limit. The checksums for parts 2 and 3 travel inside part 1 at `CHECKSUMS.txt` |
| **What is presented** | The **design application**, `app/index.html` — thirteen destinations, four map scales. The standalone analyst console `app/console.html` still ships, still works, and is what most of the sections below describe. Both are served from the same folder |
| **Arms** | **Three**, not two: ANGEL SWARM **23**, CURRENT — TRIAGE & PROXIMITY **34**, NO FORWARD DELIVERY **35**, on **20 / 38 / 0** sorties. Seed 42, JOA CORAL, 125 casualties, 47 of them in the survivable cohort |
| **Scenarios** | **All seven are selectable**, grouped by combatant command — PACOM CORAL, BASALT, MARINER, TIMBER; EUCOM GRANITE, AMBER, FJORD. They were previously pinned to CORAL with the rest shown but inert |
| **Proof** | `app/selftest.html`, reached from Settings → Engine self-test: **118 assertions against the shipped engine**, in the browser, offline, nothing mocked — **118 pass, 0 fail**, in well under a second. Re-run against the v6.4 build for this revision |
| **Replication** | The v3.1 Monte Carlo figures below are superseded by `ANGEL-SWARM-WIN-PROBABILITY-v5.9.md` — 200 paired replications in each of seven theatres, **1,400 in total**. See §0.1 |
| **Interoperability** | `app/js/dataproducts.js` — a FHIR-shaped bundle (**4,151 resources**), the decision record with full 64-hex SHA-256 digests, the run result as JSON and CSV, five JSON Schemas validated under ajv 8 draft 2020-12 offline, and `datacatalog.json` |
| **Security** | `ANGEL-SWARM-SECURITY-AND-ATO.md` and a CycloneDX 1.6 SBOM with every hash measured off disk |
| **Language model** | **None is loaded and none is shipped.** See §0.2 — this materially changes the *Mission brief — wllama* section below |
| **Fourth map scale** | A **canvas-2D orthographic globe** above the theatre. It is **not** deck.gl and holds **no GPU context**. See §0.3 |
| **Two engines, now synchronised** | The design shell and the map frame each run their own instance of the simulation, and nothing joined them until v6.4. See §0.4 — it explains a whole class of behaviour and its absence explained a whole class of defect |
| **Subsumption interfaces** | The four concrete paths by which this enters an architecture that already exists — MSS third-party application via Open DAGIR OTA, a medical-logistics lane in an Agent Network-style framework, a tasking service behind a ground control station over STANAG 4586, and a FHIR-shaped export into the DHA clinical lane — with the boundary on each. **CoT is ingest-only; 4586 is a target interface, not an implemented one.** New in v6.5. See §0.5 |

### 0.1 The v3.1 replication figures are superseded

The two 200-replication tables further down were measured on the v2.2 engine.
They have been re-measured on the shipped engine in the exact configuration
`angel-engine.js:runEngine()` uses, across all seven theatres, and **that
table is the one to quote**:

> **ANGEL SWARM wins all seven theatres. Every 95% interval excludes zero.
> Across 1,400 paired battles it produced more dead in 6 — 0.43% — and never
> by more than one.**

PACOM CORAL is **−4.905** (95% interval −5.215 … −4.595), worse in **0 of
200**. Reproduce with `winprob.mjs <SCENARIO> 200`, which ships in
`documents/`.

**Two sensitivity claims in the v3.1 record are wrong and are corrected
here.** "Fleet size is nearly flat" and "growing the fleet did not improve
ANGEL SWARM at all" were both measured on a single seed and generalised.
Swept over 100 paired seeds at five fleet sizes: **tripling every airframe
count improves ANGEL SWARM by 1.2 survivable deaths — 23.4 → 22.2, worse on
not one seed of the hundred** — and **two** cause buckets shrink rather than
one. What survives is the stronger claim, because the lever moves both arms:
**seven airframes tasked on a physiological deadline still beat twenty-one
tasked on triage and proximity, by 3.0 survivable deaths, on 92 of 100
identical battles.** And *nobody on scene who could administer* does not move
at all — 12.0 deaths at seven airframes and 12.0 at twenty-one.

### 0.2 There is no language model in this build

No GGUF ships. Nothing on any screen of the design application is generated
by a language model, and the Ask ANGEL header says so in those words:
**NO LANGUAGE MODEL · NOTHING HERE IS GENERATED.** Run answers are computed
from the run's own record and badged `RUN RECORD · COMPUTED, NOT GENERATED`;
doctrine is quoted verbatim.

`wllama` still ships as a vendored runtime and the *Mission brief — wllama*
section below is an accurate record of how that path was built and tested
against a purpose-built 156 KB GGUF. **It is not a description of a
capability that is running.** Any material that says Qwen drafts prose in
this build is wrong.

**And a matching precision about MiniLM.** `all-MiniLM-L6-v2` ships, is
loaded, and is the retrieval behind the doctrine view drawn by
`js/doctrine.js` in `app/console.html`, over the full 161-passage corpus.
**It is not what scores the design application's own doctrine tab or Ask
ANGEL** — both of those rank an eleven-passage inline reference set by term
overlap. Describe the encoder by where it runs.

### 0.3 The globe is canvas 2D, and its geography ships inside a source file

deck.gl's `GlobeView` is **not in the vendored bundle** — `deck.min.js` is a
tree-shaken build with exactly twelve exports, `Deck`, `MapView` and ten
layers, and `GlobeView` is not among them. The globe is drawn in canvas 2D and
holds no GPU context.

**Its world coastlines and international boundaries are embedded in
`app/js/theater3d.js` as integer deltas in hundredths of a degree**, generated
offline from the same `world-atlas` package that produced `data/basemap.json`,
Natural Earth 1:50m, Douglas–Peucker'd at 0.025° for coast and 0.035° for
boundaries with longitude scaled by each ring's own mid-latitude cosine so the
tolerance is a **ground** distance rather than a coordinate one.

| | |
|---|---:|
| Coast rings / vertices | 1,380 / 28,735 |
| Boundary runs / vertices | 174 / 5,681 |
| Total vertices | 34,416 |
| **Embedded bytes** | **223,486** |
| `app/js/theater3d.js` on disk | **443,996 bytes** |

*Both counts were taken for this revision by parsing the two array literals out
of the shipped file; the file size is the SBOM's own measured value.*

**The v6.3 figures were 46,744 bytes, 279 coast rings, 187 boundary runs and
8,235 vertices**, generalised at 0.18° / 0.22° on a grid of tenths of a degree.
That grid is 11 km — half a pixel at the whole-earth camera but **4.8 pixels at
the closest camera this scale reaches**, so it stair-stepped exactly where a
viewer looks hardest, and the whole point of adding the scale was that a
commander could not pick a country out of the flat theatre picture. It was
regenerated in v6.4 at **4.18× the vertex count**.

**Four times the geography added no asset and no request.** It was never a file
— it is source text inside a module that already ships. **No new HTTP resource,
still zero off-origin requests**, measured across the whole destination at
1680×1050 and 1280×800.

**The cost was measured and is stated as a trade.** Under SwiftShader the globe's
frame interval went 27.9 ms (35.9 fps) to 35.6 ms (28.1 fps) — Skia rasterising
a denser coastline stroke off-thread, isolated by suppressing the stroke
(23 → 46 fps) against suppressing the fill (23 → 25). SwiftShader is a software
rasteriser, so those are pessimistic; on GPU raster it is negligible. The path
*building* went the other way, 2.91 ms → 2.58 ms carrying 4.18× the geometry,
because decoding is now done once into unit vectors (the projection is three
dot products with no trigonometry), every ring carries a bounding cap culled on
horizon and sub-pixel size, and a redundant `ctx.closePath()` was removed —
`closePath` is O(total path size) in Blink and 853 of them cost **23.2 ms of a
25 ms frame**.

### 0.4 Two engines, and the seam that was missing

**This is an architectural fact about the running product that no previous
revision of this document recorded, and its absence explains a class of
defect rather than a single one.**

There are two instances of the simulation alive on the Theater Map:

- the **design shell** reads `angel-engine.js`'s `WORLD` — the classification
  stamp, the KPI screens, the Ops Center wall, every figure on every
  destination that is not the map;
- the **map frame** — `app/angel-map.js` mounts ANGEL SWARM's own application
  in a same-origin frame — runs its **own** instance, driven by `app.js`.

**Nothing synchronised them in either direction.** On the unmodified build,
picking JOA BASALT on the Settings screen moved the stamp to BASALT while the
map underneath carried on drawing CORAL: two answers to *what is loaded* on one
screen. It predates the globe, the route strip and the walkthrough; it was
found while fixing the globe's handoff.

Both directions are now wired, each deliberately **one function wide**:

| Direction | Seam | Notes |
|---|---|---|
| Map → shell | `ANGEL_DESIGN.setScenario(key)` | Called by `angel-map.js` after a globe handoff. Validates the key against the engine's own `SCENARIO_LIST` rather than trusting the caller, and is guarded against re-entrancy so a caller that fires twice on one handoff cannot rebuild the world twice |
| Shell → map | `ANGELMAP.setScenario(key)` | Called when Settings changes theatre. Drives the frame through `app.js`'s **original** `selectJoa`, captured at bind time, so the frame takes the path it would have taken had the operation been picked on the picture itself |

**Both are no-ops when the scenario asked for is already the loaded one**, which
is what makes them idempotent by scenario key and is why the handoff and the
picker cannot ping-pong. Each one does exactly what pressing that row on
Settings does: the clock back to T+0 and stopped, both arms rebuilt, and every
filter or expansion naming a casualty of the outgoing battle cleared.

The frame is otherwise **read and never written**: `angel-map.js` publishes a
contract over it, and the two things the shell needs that are not on that
contract — what the operator last clicked (`APP.sel`) and which scenario the
frame has loaded (`APP.scenarioKey`) — are read straight off the frame,
same-origin, inside `try`/`catch`, and read-only.

---

### 0.5 Subsumption interfaces — the four paths into an existing architecture

**This system is designed to be absorbed by architectures that already exist
rather than to stand beside them.** Four paths are concrete enough to state as
interfaces. Each carries a boundary, and the boundaries below are architecture
facts about this build, not caveats about ambition.

1. **As an application on the Maven Smart System third-party layer**, onboarded
   through the Open DAGIR OTA mechanism. On 9 March 2026 the Deputy Secretary
   of Defense designated MSS a program of record and moved its administration
   to the CDAO MSS Program Office; the FY27 request funds third-party vendors
   to develop and field applications on MSS. The shipped artefact is already
   the right shape for that pipeline: one static Go binary serving `app/` over
   loopback, **no API server, no application server, no database at runtime,
   and no outbound request in any code path**. It contributes a decision
   surface; it does not stand up a data environment.
2. **As the medical-logistics lane inside an Agent Network-style agent
   framework.** CDAO's Agent Network, announced June 2026, is architecturally
   the same object as this system: bounded agents that deliver decision options
   to a commander in seconds and make no targeting or strike decisions. Its
   published use cases do not include medical logistics. The contract this
   build already implements is that contract — proposals below the operator-set
   bar queue for a named human on named grounds, expiries are logged, and the
   decision record is hash-chained with full 64-hex SHA-256 digests.
3. **As a tasking service behind an existing ground control station.** The
   assignment this system produces is a mission for a specific airframe;
   **STANAG 4586** is the correct NATO interface for handing it to the control
   station that already flies that airframe. **This is the target interface,
   not an implemented one.** Nothing in `cmd/` or `app/js/` speaks 4586; the
   export surface is `dataproducts.js` and the airframe hand-off is an open
   item, recorded as an integration path rather than a capability.
4. **As a data producer into the DHA clinical lane.** `app/js/dataproducts.js`
   emits a FHIR-shaped bundle of **4,151 resources** alongside the decision
   record, the run result as JSON and CSV, five JSON Schemas validated under
   ajv 8 draft 2020-12 offline, and `datacatalog.json`. The Operational
   Medicine Care Delivery Platform, owned by Defense Healthcare Management
   Systems, integrates with MHS GENESIS and references Joint Trauma System
   guidance; that lane is what the export is shaped for.

**The boundaries, as architecture:**

- **CoT is ingest-only. Nothing in this build emits, publishes or pushes CoT
  or TAK data.** `cmd/angelswarm/telemetry.go` is a receive-only UDP listener:
  off unless `-cot` is passed, bound to `127.0.0.1` unless `-cot-external` is
  **also** passed, it parses and **never replies**, it never originates a
  packet, and a datagram over `cotMaxDatagram` (8192) is dropped unread. The
  system *consumes* the Cursor on Target feed a joint operations area already
  produces — it adds a track consumer, not a new interface. `cmd/cotsim` does
  emit CoT, but it is a device simulator standing in for fielded monitors so
  the ingest path is exercised by a real socket from outside the program; it is
  not part of the application and not a device driver. An emit path is the
  obvious next step and is **not claimed today**.
- **The exported health resources are FHIR-shaped, not conformance-tested.**
  Every exported resource carries that tag in its own `meta.tag`. The word
  "compliant" is not used in the build or in this record.
- **STANAG 4586 is not implemented.** It is named as the correct target
  interface and nothing more.

---

## The v3.1 record

### What ships (as of v3.1)

Two archives that merge into one folder (split only because of a 30 MB
delivery limit — `ANGEL-SWARM-v3.0-FINAL-2026-08-20-part1of2.zip` 22.6 MB,
`-part2of2.zip` 23.4 MB). **The current package is three parts** — see §0.

```
ANGEL_SWARM/
  ANGEL-SWARM-windows-x64.exe        the launcher, one per platform
  ANGEL-SWARM-macos-apple-silicon
  ANGEL-SWARM-macos-intel
  ANGEL-SWARM-linux-x64
  cotsim-windows-x64.exe             the device emitter, one per platform
  cotsim-macos-apple-silicon
  cotsim-macos-intel
  cotsim-linux-x64
  app/                               served assets
  src/                               launcher and emitter source
  train/                             ppg_cri.py, calibrate.py, export_minilm.py
  get-model.sh / .ps1 / GET-MODEL.txt
  START-HERE.txt, CHECKSUMS.txt, ANGEL-SWARM-CHANGELOG.txt
  documents/                         every written deliverable — .md and
                                     .docx for the papers, plus the SBOM as
                                     .json, three verification records as
                                     .txt, and winprob.mjs
  video/                             both films, mp4 and VP9 webm
```

**The `documents/` folder as it ships now** — the use case and its public
variant, this architecture record, the DHA alignment and its one-pager, the
IL5 cost and impact analysis, the security and ATO assessment, the CycloneDX
SBOM (`.json`, `.md` and its validation log), the doctrinal terminology
ruling, the seven-theatre win probability and the `winprob.mjs` harness that
re-derives it, the design specification, the map specification, the rehearsal
pack, the engine contract, the three SPEC-INPUT inventories, the control
audit and rail-button verification, and the changelog. `START-HERE.txt` at
the package root lists all of them.

A CGO-free Go launcher serves `app/` on `127.0.0.1` and opens the browser.
No install, no admin rights, nothing written outside the folder, loopback
only. Verified from the packaged folder at v3.1: **22 console views, 0 page
errors, 0 console errors, 0 requests off 127.0.0.1**.

**Re-verified on v6.4:** the design application's **thirteen destinations** all
populate after a run, at 1680×1050 and 1280×800, in all four map modes —
**13 of 13 destinations, 0 uncaught page errors, 0 off-origin requests**, with
at most one column scrollbar and zero horizontal ones and 0 px² of
element-under-element overlap. *Do not quote "22 views" as a count of
destinations: it was a count of the analyst console's panes, and the presented
application has thirteen.*

**Network posture, stated precisely.** There are zero *outbound* requests at
runtime; that invariant is unchanged from v2 and is still asserted in
automated verification. v3 adds exactly one *inbound* path — the telemetry
listener below. It is off unless the launcher is started with `-cot`, it
binds `127.0.0.1` unless `-cot-external` is **also** passed, it is
receive-only and never replies to a sender, and it drops datagrams over
8192 bytes unread. "Air-gapped" has been retired as a description of the
concept: it described a prototype limitation as though it were a design
goal, and it could not survive the obvious question of how a reading from a
monitor on a casualty ever reaches the tasking layer. The precise claim is
stronger — **ANGEL SWARM has no dependency on enterprise reachback to
decide.**

## Why a folder and not one file

A `file://` document has an opaque origin, so browsers refuse to construct
Web Workers from it. Verified empirically — MapLibre renders zero pixels from
disk and the failure is upstream of tiles. That ceiling blocked DuckDB,
deck.gl, ONNX Runtime, wllama and Monte Carlo workers simultaneously. A real
HTTP origin removes it.

## The problem v2 solves

v27 said "AI" in ~forty places and contained no model. Every sparkle badge
pointed at a hand-written heuristic. v2's rule: every AI claim must be
demonstrable on the judge's machine, offline.

### Console views (22, as of v3.1)

Narrative path — Why this exists / Where the fight is / The fight / The
difference. During the run — Wounded soldiers, Units & overwatch, Drones,
Blood & supplies, Approvals, Ground truth stream, **Tactical map (3D)**. The
record — Decision log, **Casualty flow**, Evidence, The case beyond lives.
How it works — Sensor & model, **Doctrine retrieval**, **Mission brief**,
**How much is the seed?**, **Analytical console**, Database.

## Telemetry ingest — the acquisition tier (new in v3)

Through v2 every physiological reading was produced by the simulation and
read back out of the simulation's own memory. That demonstrates the tasking
logic and demonstrates nothing about acquisition. v3 closes it.

The architecture is three tiers, and only one of them is this program. The
**edge** is the monitor on the soldier. The **tactical network** is the feed
the force already carries forward — this is the tier the tasking decision is
made on. The **enterprise** tier (Maven Smart System, War Data Platform)
supplies fleet state, theatre stock, the cross-JOA picture and the audit
archive when reachback exists. They are layers, not alternatives.

- `src/cmd/angelswarm/telemetry.go` — a receive-only **Cursor on Target**
  listener over UDP, the format TAK already carries across tactical
  networks, parsing a medical detail extension (CRI, signal quality, heart
  rate, source device), plus a **Server-Sent Events** bridge that pushes
  parsed readings to the page. Routes `/telemetry/status` and
  `/telemetry/stream`, both behind the same loopback check as everything
  else. Constants: `cotMaxDatagram` 8192, `hubBuffer` 256, `subBuffer` 64.
- `src/cmd/cotsim` — a device emitter shipped for all four platforms. It
  stands in for fielded monitors so the ingest path is exercised by a real
  socket from outside the program. It is **not** a device driver and the
  medical detail extension it emits is **not** a ratified CoT schema; both
  are stated in the source and in START-HERE.txt.
- `app/js/telemetry.js` — device registry, message rate, and a link state of
  **LIVE / STALE / DOWN** (`STALE_MS` 6000, `DOWN_MS` 15000). Renders an
  ingest chip into the toolbar and an ingest card into the SENSOR pane.
  Exposes `TELEMETRY.readingFor(id)`, which returns `null` past `DOWN_MS`.
- The seam is in `optimizer.js`: where a live reading exists for a casualty
  it supersedes the simulated one, writing the same `knownCrm` / `knownAt` /
  `knownQ` fields the tasking already read, so everything downstream is
  untouched. When the feed dies the reading falls away and the tasking layer
  continues on last-known state. It does not stall and it does not blank.

**Measured on the shipped package, 20 Aug 2026.** 125 emitted devices,
62.0 msg/s sustained, 8,662 messages in one session and over 14,000 across
the build, **0 dropped**. Transitions confirmed with a browser open across
the cut: `LIVE 125 dev · 62.0/s` → **STALE** at +9 s → **DOWN** at +20 s. A
page that loads *after* the feed is already dead reads WAITING, which is the
correct state for "ingest enabled, nothing has ever arrived". With ingest
off the chip reads INGEST OFF and the simulation is bit-identical to v2.2 —
seed 42, fair, PACOM CORAL, still **23 versus 34**.

## CRI-Net — the trained network

1-D CNN reading 5 s of photoplethysmogram at 100 Hz, emitting compensatory
reserve. Mirrors the operating principle of CipherOx CRM, FDA 510(k)
K173929. Trained from scratch; `train/ppg_cri.py` ships.

- **104,162 parameters**, 419,797-byte ONNX, opset 13
- 62,400 windows from 240 synthetic subjects, 14 epochs, CPU, 633 s
- Validated on 70 subjects in **no** training window — split by person

| Metric | Value |
|---|---|
| MAE overall | **0.0694** |
| MAE clean / degraded | 0.0641 / 0.0879 |
| **MAE, heart rate alone** | **0.1588** |
| 95% interval coverage | 96.2% |
| Alarm sensitivity, CRI < 0.30 | 83.2% (precision 85.4%) |

**Not a heart-rate lookup.** ~14% of subjects are chronotropic
non-responders or paradoxical, another 16% blunted — mirroring beta
blockade, high vagal tone, and the paradoxical bradycardia of severe
haemorrhage. Rate alone is 2.3× worse.

**Reports its own uncertainty.** Two heads (estimate, log-variance) under
Gaussian NLL. `train/calibrate.py` measures thresholds on 8,000 fresh
windows: act below 0.469 interval width, refuse above 0.591. **MAE 0.063
when it says act, 0.115 when it says do not.** Refuses 3% of clean signal,
13% of degraded. Inference 0.8 ms p50 via ORT Web.

## Doctrine retrieval — the second network

all-MiniLM-L6-v2, sourced from npm (`@lat.md/embed-minilm-fp16`, Apache-2.0)
because HuggingFace is unreachable. Exported to ONNX opset 14 by
`train/export_minilm.py`. **This is the retrieval in `app/console.html`'s
doctrine view, drawn by `js/doctrine.js` — see §0.2 for where it does and
does not run.**

- fp32 90.4 MB → **shipped int8 22.9 MB**; torch-vs-ONNX min cosine
  **0.9999995**
- Hand-written WordPiece tokeniser (~150 lines), diffed against the Python
  `tokenizers` reference over **674 cases — 0 mismatches**. Avoids
  transformers.js (~1 MB and a second ORT loader).
- **161 passages, 499 sentences, 8 publications**; passage retrieval then
  sentence-level re-rank
- Query embed **p50 6.7 ms**, full search **p50 6.9 ms**
- Top-1 15/23, top-5 22/23 on questions written before tuning
- Below 0.35 similarity it says **"No answer in this corpus"** rather than
  returning the least-bad passage

**Honesty:** every passage is a summary written for the prototype with its
source publication named, never an extract, and no paragraph numbers are
fabricated. Stated on screen against every quotation. Known defect shown in
the UI, not hidden: "MEDEVAC vs CASEVAC" ranks the correct passage 40th.

## Analytical console — DuckDB-WASM

11 tables loaded via Arrow IPC (types declared, not inferred), both arms
under an `arm` discriminator. 9,437 rows materialised in 354–536 ms.
CodeMirror 6 editor, Ctrl-Enter to run, schema browser, 8 validated presets.

| Query | Rows | Warm |
|---|---|---|
| ASOF JOIN delivery → preceding telemetry | 54 | 31.2 ms |
| quantile_cont + PIVOT by triage | 2 | 15.2 ms |
| QUALIFY + ROW_NUMBER over candidates | 3 | 15.6 ms |
| self-join, ~1.1M pairs | 1 | 34.2 ms |

The ASOF JOIN is labelled as something the previous embedded database
literally could not express.

## Tactical map — deck.gl

Custom 11-symbol build, **756 KB vs 1.65 MB stock**. MapView anchored to the
JOA's real lon/lat from `THEATERS`, so CORAL sits in the Luzon Strait.
Basemap generated from `world-atlas` TopoJSON (npm, ISC) — clipped,
3 dp rounded, Douglas-Peucker simplified, delta-encoded to **330 KB** with a
two-tier LOD. The simulation's own terrain is drawn as an opaque shaded-relief
sheet inside the AO with a bright frame, and the footer names which is which.

Casualty pulse **period** encodes time-to-deadline (2.0 s → 0.25 s);
verified rate-ordered. Deterministic precomputed replay (140–220 ms for a
180-minute run) so scrubbing backwards works. Degrades honestly: WebGL2
absent → view and nav entry removed entirely; software renderer detected →
detail reduced and the footer says so.

## Casualty flow — ECharts + uPlot

Sankey-only ECharts build **497 KB vs 1.14 MB stock**; uPlot 52 KB. Five
fixed columns, `layoutIterations: 0` and a fixed node table so the diagram is
byte-identical between runs and the two arms compare directly. Plus six
synchronised uPlot series, a **Kaplan-Meier survival curve** with proper
right-censoring and the Golden Hour marked at 60 min, and a
deadline-vs-arrival scatter on a true 45° diagonal.

## Monte Carlo — answering "how much is the seed?"

200 paired replications across Web Workers running the **shipped engine**
(verified: reproduces 23 vs 34 at seed 42). Re-verified 19 Aug 2026 by running
the shipped engine headlessly: seed 42, fair mode, PACOM CORAL, **23 versus
34**. This settles open item (a) in the 18 August changelog, where this
document said 24 and the use case said 23 — the use case was right.
15.2–16.8 replications/second on 2 cores; main-thread p95 stays 19–20 ms, no
UI freeze.

**Re-measured 20 Aug 2026** after fixing a defect that had stopped the engine
running at all: the telemetry seam added to `optimizer.js` in v3.0 read
`window.TELEMETRY`, and a Web Worker has no `window`, so every replication
threw on its first casualty. Guarded with `typeof window !== 'undefined'`.
The figures below were then checked against v2.2 — the last build in which
the worker ran — and are identical to it, so the fix restored the engine
rather than changing it.

PACOM CORAL, fair, 200 paired replications:

| | |
|---|---|
| Mean paired difference | **−4.705 dead** |
| 95% CI | **−5.011 to −4.399** |
| Cohen's d_z | **−2.145** |
| Paired SD | 2.19 |
| **Worse with ANGEL SWARM** | **0 of 200** (2 ties) |

EUCOM GRANITE, fair, 200 paired replications:

| | |
|---|---|
| Mean paired difference | **−4.070 dead** |
| 95% CI | **−4.359 to −3.781** |
| Paired SD | 2.07 |
| **Worse with ANGEL SWARM** | **0 of 200** (5 ties) |

Sensitivity: launch points dominate (1 → −1.33, 3 → −4.23). **The claim that
once stood here — that fleet size is "nearly flat" — is wrong and is
corrected in §0.1.** At 2 launch points **1 of 30 replications was worse** —
reported, not suppressed. **No p-value is printed**, and the pane says why:
replications come from a deterministic program on demand, so a p-value
measures compute budget, not evidence.

A fourth lever, **triage error**, scales both START error rates about the
measured METASTART rates (over-triage **14%**, under-triage **10%**;
Franc JM et al., Prehosp Disaster Med 2022;37(1):106–116). 20 replications per
point, forced to realistic mode:

| Triage error (× METASTART rate) | ANGEL SWARM | CURRENT — TRIAGE & PROXIMITY | Difference |
|---|---|---|---|
| 0 | 23.80 | 27.70 | −3.90 |
| 0.5 | 23.80 | 27.75 | −3.95 |
| 1 | 23.80 | 27.75 | −3.95 |
| 2 | 23.80 | 27.90 | −4.10 |
| 3 | 23.80 | 27.80 | −4.00 |
| 4 | 23.80 | 27.80 | −4.00 |

**0 of 20 replications worse** at every point. The ANGEL SWARM column is
**exactly flat at 23.80** across the whole range, because that arm never reads
the triage category at all. This is the one lever whose two arms are
structurally asymmetric, and the flat line is the evidence for that asymmetry
rather than a claim about it. The baseline moves only slightly even at four
times the measured error rate — **27.70 to 27.80 dead**, a drift of **0.20**
across the sweep.

## The force is not a pool (v3.1)

An aircraft belongs to a launch point, a launch point belongs to one joint
operations area, and a JOA belongs to one combatant command. That was always
the data model — `SCENARIOS[key].bases[].fleet`, and `createArm()` builds
every drone against a base index — but three things in the interface implied
otherwise, and one of them was destructive.

- **`Send drones here →`** appeared against every operation in *both*
  combatant commands on the commander's DECIDE pane and the theatre
  dashboard. It sent no drones. It set `APP.scenarioKey` and called
  `resetSim(false)` — discarding the run in progress, before any
  confirmation, and cancelling the dialogue that opened afterwards did not
  restore it. Replaced by `joaActionHTML()`, called from all three places a
  JOA row is drawn, with three states: open the live operation, change to an
  operation in this command (behind a confirm that names what is lost), or
  show an out-of-theatre operation inert.
- **A bare airframe count.** The foot ribbon, the deployment badge and the
  deploy dialogue now carry the owning JOA.
- **"in the force"** in the deploy dialogue became "at these launch points".

**Reinforcement** is offered from the order-of-battle card: one airframe at a
time to a named launch point, in bulk across the launch points, or as a saved
force package. `addAirframeToBoth(armA, armB, type, baseIdx)` takes the two
arms together and gives the same tail number to both — there is no way to
reinforce one arm, because the difference figure would then be an artefact of
the reinforcement rather than of the tasking.

Measured, PACOM CORAL, seed 42, fair:

| Fleet | ANGEL SWARM | sorties | CURRENT — TRIAGE & PROXIMITY | sorties |
|---|---|---|---|---|
| 7  | 23 dead | 20 | 34 dead | 38 |
| 11 | 23 dead | 20 | 33 dead | 70 |
| 15 | 23 dead | 20 | 32 dead | 94 |
| 23 | 23 dead | 20 | 31 dead | 141 |

At **this seed** ANGEL SWARM is flat and leaves 15 of 23 aircraft on the
ground, because flying them would not change *these* outcomes — 7 of its
remaining deaths are casualties no aircraft in the force can reach from any
launch point, and that is a laydown fact, not a tasking one.

**Do not generalise this single seed.** Across 100 paired seeds a threefold
fleet does improve ANGEL SWARM, by 1.2 survivable deaths — see §0.1. The
argument that survives is not "aircraft do nothing"; it is that **the lever
moves both arms, so aircraft cannot close the gap**, and that the largest
remaining bucket is inert to fleet size at every point swept.

## The commander's decision bar (v3.1)

A third chrome row, present for one role. Three slots — *am I winning*, *does
anything need me*, *what is about to go wrong* — rendered by
`role-commander.js` from the same `situation()` the DECIDE pane is built
from, so the two cannot answer one question with different arithmetic.
`--barH` is measured across `#cmdbar`, `#toolbar` and `#decbar`, so the row
collapses for the other three roles and `#shell`, the four sheets and the
welcome overlay all reposition. Amber is reserved to the decision slot.

The left column (`inspector.js`, no-selection state) opens for a commander on
the operation, the decisions waiting with Approve and Reject on the card, and
the exceptions; `DECISIONS | RUN DETAIL` switches back to RUN SUMMARY and the
event ticker, which stay the default for every other role. The switch is
rendered in **both** states — a filtered view with no way back reads as a
broken one.

## Mission brief — wllama

llama.cpp compiled to WASM (`@wllama/wllama`, 303 KB + 7.6 MB wasm), chosen
over CGO-linked native llama.cpp: no cross-compilation for four platforms,
CPU-only, universal. The launcher sends no COOP/COEP so `crossOriginIsolated`
is false and the **single-thread path runs** — stated on screen with the
reason.

Grounded, not conversational: 56 figures read from live state (each row shows
its source field), 4 rows from DuckDB, 3 verbatim doctrine passages with
scores. The prompt is refusal-first. The context block displayed is the one
actually sent after trimming. The DuckDB path compares the toll in the
database against the toll in the page and re-materialises on mismatch, so it
cannot brief a different run's numbers.

**Model not included, and in the shipped build nothing calls this path** —
see §0.2. Verified end-to-end against a purpose-built 156 KB GGUF: loads in
339 ms, streamed 420 tokens, over-long context self-corrected and retried.
**Never run against real Qwen weights, and no GGUF ships.** This section is a
record of an engineering path, not a description of a running capability.

## Sourcing constraints (for future sessions)

Reachable: **npm, PyPI, crates.io, proxy.golang.org, raw.githubusercontent**.
Not reachable: huggingface.co, unpkg, jsdelivr, protomaps, storage.googleapis.

- MiniLM weights → npm `@lat.md/embed-minilm-fp16`
- GGUF weights → **impossible**; no npm package carries weights (checked —
  all runtimes and parsers). Ships as a one-time `get-model` script the user
  runs once on any connected machine; the folder is offline thereafter.
  **No SHA-256 is pinned** because the release digest could not be observed;
  the script verifies the distributor's declared digest at download time and
  ships `EXPECTED_SHA256=""` with instructions. This is stated in the script,
  in GET-MODEL.txt, and on screen.
- Basemap tiles → generated from `world-atlas`, not downloaded
- DistilBERT-SQuAD → unobtainable; extractive QA replaced by MiniLM
  passage-then-sentence retrieval

## Dependencies

ONNX Runtime Web (MIT), DuckDB-WASM (MIT), deck.gl (MIT), ECharts
(Apache-2.0), uPlot (MIT), CodeMirror 6 (MIT), world-atlas (ISC), wllama
(MIT), Qwen2.5-0.5B-Instruct (Apache-2.0), all-MiniLM-L6-v2 (Apache-2.0).
**No GPL, no bespoke licences.**

Rejected: **GSAP** (proprietary Webflow licence — the one SBOM flag);
**WebGPU compute** (a discrete-event sim is a sequential priority queue, the
canonical anti-pattern); **rrweb** (canvas capture is lossy at ~15 fps and
the audit log is already a lossless semantic replay); **React/shadcn**
(2–4 days to look like every other shadcn app); **CesiumJS** (5.97 MB +
23 MB runtime assets); **WebLLM** (no CPU fallback; measured
`shader-f16: false`); **Lenis** (scroll-hijacking is marketing grammar);
**Monaco** (97 MB for a SQL box).

## Traps recorded — all hit, all real

- **`window.APP` is undefined.** `APP` is a top-level `const` in a classic
  script, so it never becomes a property of the global object. Three separate
  modules failed **silently** on this. Now exported explicitly in `app.js`.
- **DuckDB-WASM does not statically link `json`, `parquet`, `icu`** — they
  autoload from `extensions.duckdb.org`. Load via Arrow, avoid JSON
  functions. Autoload/autoinstall are set false and read back on screen.
- **`@duckdb/duckdb-wasm@latest` is a dev build.** Pin exact versions.
- **transformers.js defaults to `allowLocalModels=false`,
  `allowRemoteModels=true` at huggingface.co** in a browser.
- **ORT `wasmPaths` resolves against the module URL, not the page.**
- **deck.gl bundles three CDN strings**; dormant only if `data` is a plain JS
  array and `debug` is never set.
- **wllama's binary frame protocol desynchronises on invalid UTF-8 deltas**
  (`"GLUE"` read as a length). Mitigated by dropping the engine on that error
  class and keeping the prose already written.
- **`device.js` gated a repaint on `.contains('on')` but the shell applies
  `active`** — the interval never fired; the sensor readout was frozen.
- **`<select>` was unguarded in the shortcut dispatcher** — pressing `d` in
  the Monte Carlo metric selector navigated away. All key handlers now pass
  one guard covering input/textarea/select/contenteditable/CodeMirror.
- **`optimizer.js` reaches for `CALLSIGN`, which lives in `map.js`** — a
  rendering module. The Monte Carlo worker restates the three strings; a
  future edit reaching further will throw on load rather than report numbers
  from a half-loaded engine.
- **`window` does not exist in a Web Worker, and `optimizer.js` runs in one.**
  The trap above was written as a warning and then walked into from the other
  direction: v3.0's telemetry seam added `window.TELEMETRY` to `optimizer.js`,
  which is loaded verbatim into `mc.worker.js`. Every replication threw
  ReferenceError on its first casualty and the whole Monte Carlo pane went
  down with it. The worker did exactly what its header promised — it reported
  the error rather than reporting numbers — which is why this was found at
  all. Any main-thread global reached from `sim.js` or `optimizer.js` must be
  guarded with `typeof x !== 'undefined'`.
- **A CoT uid is not a casualty id.** The network calls a track `CAS-084`;
  the model calls it `84`. v3.0's ingest tier stored readings under the uid
  and looked them up by the integer, so every lookup missed and no live
  reading reached the tasking layer for a whole release. Both forms are now
  reduced to their trailing digits at both ends.

## Build

```
python3 build.py                       # assemble app/ from ../build
python3 train/ppg_cri.py               # retrain CRI-Net (~10 min, CPU)
python3 train/calibrate.py             # re-measure trust thresholds
python3 train/export_minilm.py         # re-export the sentence encoder
for t in windows/amd64 darwin/arm64 darwin/amd64 linux/amd64; do
  GOOS=… GOARCH=… CGO_ENABLED=0 go build -ldflags="-s -w" ./cmd/angelswarm
  GOOS=… GOARCH=… CGO_ENABLED=0 go build -ldflags="-s -w" ./cmd/cotsim
done

./ANGEL-SWARM-linux-x64 -port 8080 -cot 127.0.0.1:6969   # ingest on, loopback
./cotsim-linux-x64 -target 127.0.0.1:6969 -devices 125 -rate 0.5
```

## Open items

- Real-GPU frame rate unmeasured — no hardware in the build sandbox. 16 draw
  calls at 2 FPS under SwiftShader; hardware performance is an inference.
- `get-model.ps1` is hand-reviewed but never executed (no PowerShell).
- The brief's LLM path is unverified against real Qwen weights, and **no GGUF
  ships**, so nothing in the delivered build exercises it.
- **The design application's doctrine tab and Ask ANGEL badge a term-overlap
  score with the MiniLM name.** The score itself is honest and the floors are
  measured; the badge names the wrong machine. Recorded rather than hidden.
- sql.js (926 KB) still ships alongside DuckDB for the legacy DATABASE pane.
- The `addEventListener` wrapper in `palette.js` is a deliberate intrusion on
  a platform method, documented in place; the alternative was six edits
  across five files and a repeat for every new pane.
