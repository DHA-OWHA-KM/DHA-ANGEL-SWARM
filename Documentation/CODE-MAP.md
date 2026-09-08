# ANGEL SWARM — Code map

A file-by-file reference to every source file in this repository, written so that a reader browsing the tree on GitHub can tell what a file does before opening it. Each entry describes what the code actually does at run time rather than what its name suggests; where a file is load-bearing for a claim made elsewhere in the package, that is said in the entry. The prototype is a single-page browser application served by a small Go launcher over loopback, with two trained networks, two embedded databases and three map renderers; nothing in it originates an outbound request.

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

---

## Two shells, one engine

The tree carries two working front ends over the same simulation. `app/console.html` is the analyst console: it loads the forty-odd modules in `app/js/` directly as classic scripts and deferred ES modules. `app/index.html` is the design build: a Claude Design canvas document (`<x-dc>` template plus a `text/x-dc` script) driven by the vendored runtime in `app/support.js`, which reads its live figures through the adapter `app/angel-engine.js` and mounts the console itself, unmodified, in a same-origin frame wherever a real map or a real analyst pane is required.

Underneath both, `app/js/sim.js` and `app/js/optimizer.js` are the engine. They touch no DOM and hold no state outside the objects they are handed, which is why the Monte Carlo worker (`app/js/mc.worker.js`), the self-test page (`app/selftest.html`), the design adapter (`app/angel-engine.js`) and the verification script (`Documentation/verification/winprob.mjs`) can all load those same two files verbatim and get the same numbers. Any claim in this package that quotes a death count is a claim about those two files.

---

## `app/` — top level

| File | What it does |
|---|---|
| `angel-engine.js` | Runs the shipped engine headlessly once, end to end (T+0 to T+180 at a 0.25 min step), records its casualty, sortie, delivery, stock and audit ledgers plus a per-step fleet trace, and exposes `buildRun({seed, deployed})` and a memoised `snapshot(run, t)` so the design canvas can seek to any minute; it computes no outcome of its own and loads `js/sim.js` and `js/optimizer.js` itself when its host has not already done so. |
| `angel-map.js` | Draws no map. It mounts the whole console in a same-origin iframe and docks that frame over the slot the design draws, so the three real renderers (`js/theater.js`, `js/geo.js` + `js/map.js`, `js/geo3d.js`) keep their own cameras and bindings while React rewrites the surrounding page; it also servos the run clock as a rate rather than stepping it, and measures the design's columns to keep the map inset in scale. |
| `angel-ppg.js` | Renders the photoplethysmogram at the rate it is produced: it dynamically imports `synth()` from `js/device.js` — the same generator CRI-Net was trained against — advances a 100 Hz sample clock against `performance.now()` inside `requestAnimationFrame`, and paints a 500-sample window, the model's actual `float32[1,1,500]` input tensor. Nothing is interpolated or resampled. Written as a classic-script IIFE publishing one custom element, because the canvas loader evaluates modules as text through `new Function`. |
| `support.js` | The Claude Design runtime, generated from `dc-runtime/src/*.ts` and not edited by hand: it parses the `<x-dc>` template out of the document, binds props, walks and re-renders text nodes, and resolves `<x-import>` elements against globals such as `angel-map` and `angel-ppg`. It expects `window.React` and `window.ReactDOM` and fetches them from unpkg only if they are absent, which is why `vendor/react/` is loaded first. |
| `index.html` | The design build: a 7,565-line canvas document carrying every screen's markup, the `text/x-dc` script that drives them, the component manifest, and the `x-import` slots for the live waveform and the docked map. Loads the vendored React pair, `support.js`, `js/telemetry.js` and `js/dataproducts.js`, and carries the favicon inline so no `/favicon.ico` request is ever issued. |
| `design.html` | Byte-identical copy of `index.html` (md5 `61e4da7c…`), kept under the name the design canvas addresses it by. |
| `console.html` | The analyst console shell: declares the thirteen stylesheets by hand in load order (`theme.css` first so tokens resolve, `polish.css` after the shell sheet, `scale.css` last) and loads the forty-two modules of `app/js/` that make up the console. This is the surface the map, terminal, evidence and wall panes actually live on. |
| `selftest.html` | An offline test page that loads `js/sim.js`, `js/optimizer.js`, `js/mc.worker.js` and `angel-engine.js` as plain scripts and runs 118 assertions against them with nothing mocked — including the reference result every document in this package quotes (seed 42, JOA CORAL, 23/34/35 survivable deaths on 20/38/0 sorties), the audit chain's SHA-256 self-check, and an assertion that `angel-engine.js` has not drifted from `sim.js` plus `optimizer.js`. It publishes its result on `window.__SELFTEST__`. |

---

## `app/js/` — the modules

### Engine core

| File | What it does |
|---|---|
| `sim.js` | The simulation: a seeded mulberry32 PRNG, the scenario table, terrain and weather fields, the casualty stream, the physiology that drives compensatory reserve and the deadline clock, and `stepArm()`/`finalize()`. Every physiological and platform parameter carries a citation in `PARAMS.provenance`. Touches no DOM. |
| `optimizer.js` | The two allocators: ANGEL SWARM's deadline-constrained, receiver-aware, cold-chain-aware multi-stop routing over expected lives saved, and the control arm's triage-precedence plus nearest-available dispatch. Owns the TCCC tier model, the telementoring policy switch, escalation grounds, `queueProposal`/`approveProposal`/`rejectProposal`, `deathCauses()` and the hash-chained audit log with its own load-time SHA-256 self-test. Touches no DOM; its one free global is `CALLSIGN`. |
| `montecarlo.js` | The confidence pane. Runs the real engine a few hundred times across a pool of Web Workers with both arms of each replication facing an identical casualty stream, so the estimand is the paired within-battle difference in deaths; reports the measured variance reduction from pairing, and states on screen that the interval bounds the seed and not reality. |

### Workers and harnesses

| File | What it does |
|---|---|
| `mc.worker.js` | One replication at a time off the main thread. It `importScripts` the shipped `sim.js` and `optimizer.js` verbatim and restates only the three-string `CALLSIGN` table from `map.js`, so a distribution produced here is a distribution of the engine on screen; it holds no state between messages, making the pool a work queue rather than a partition. If a future edit to `optimizer.js` reaches for anything else in `map.js`, this file throws on load and the pane says so. |
| `palcheck.mjs` | A Playwright script, not shipped code: launches headless Chromium against `127.0.0.1:8899`, steps the engine sixty minutes, opens the command palette, types a casualty identifier and asserts the selection reaches the inspector, collecting page errors throughout. |

### Application host, shell and chrome

| File | What it does |
|---|---|
| `boot.js` | Runs before everything else. Probes what the machine can actually do (WebGL2, workers, wasm, threads) and publishes it, and provides the promise-based service registry — `ANGEL.provide/get/has` plus `emit` — that lets later subsystems await one another without caring about load order. Its purpose is that no control is ever drawn for a capability that has not been confirmed. |
| `app.js` | The application: owns the `APP` state object (world, both arms, clock, deployment state, thresholds, viewports, layers), `render()`, the scope helpers, the pointer bindings on every canvas, the role profiles, the export paths, and `COUNT` — the single vocabulary of counted nouns and their labels that every pane and every KPI strip reads, so "died" cannot mean three different populations on three screens. |
| `shell.js` | The navigation and page frame rebuilt to the design canvas: nine destinations in the canvas's order, with `SECTIONS` as the only written-down mapping of the older twenty-four destinations into them, and the 1 Hz repaint of the main column. Nothing is deleted; every old destination remains reachable as a tab or section. |
| `palette.js` | The seam between the shell and the bolted-on subsystems. Installs a single keyboard guard in front of every window-level key listener in the application, provides the Ctrl/Cmd-K command palette over every view, action, SQL preset, doctrine passage, casualty and unit, generates the "?" shortcut sheet from the one table where a keystroke is written down, and carries the welcome orientation and the role keys. |
| `inspector.js` | The 336-pixel left record column: selection counter, mono identifier, triage chip, a transport strip for the selected object's own timeline, the nearest-launch-point measurement, a key/value grid and a reverse-chronological tasking history. `RAIL` is an explicit table from destination to the blocks that destination gets. Every value is read from `APP.armA` at paint time and shared figures come from `COUNT`. |
| `detail.js` | The record accordion that replaced reading records in the rail: a page asks `region()` while building its table and gets back a `<tr>` of markup to drop in after the row, so the region survives the shell replacing `innerHTML` on every tick. One row open at a time per list; `notes()` clamps a region to two lines of at most 140 characters each, which is enforcement rather than convention. |
| `theme.js` | The theme service. One attribute write, `body[data-theme="KEY"]`, is the whole mechanism; this file knows four keys, the `localStorage` slot and who to tell. It fires `ANGEL.emit('theme', key)` on every apply so canvas and WebGL renderers, which cannot inherit a custom property, can re-read their tokens, and it migrates the retired light/dark preference once. |
| `page-kpi.js` | Gives eleven destinations that previously opened with prose a row of large stat callouts instead. Every figure comes from `COUNT` where `COUNT` defines the noun and from the owning module live where it does not; the file restates no number of its own, and names the destinations it deliberately leaves alone. |
| `audio.js` | Sonification for an operations floor: one continuous tone whose rate and pitch track the mean fraction of each open casualty's deadline already spent, plus five discrete event cues. The death cue is quiet and ducks everything else to silence for two and a half seconds — the silence is the cue. Nothing sounds until a human presses the control, and the state is not persisted. |
| `film_inline.js` | The explanatory film, played live rather than decoded. `renderFrame(t)` draws the complete 1920×1080 frame for absolute time `t` into a supersampled canvas and a rAF loop walks `t` forward, so there is nothing for a sandboxed viewer to block; it is the same deterministic renderer that produced the MP4, at 37 KB of source instead of 5 MB of base64. Wrapped in an IIFE because it declares names the application also uses. |

### Destinations

| File | What it does |
|---|---|
| `page-dash.js` | Command Overview: the canvas's tile layout on live figures, with the delta against the control arm drawn in the red family because it counts people who died. None of the canvas's placeholder figures survive. |
| `page-cas.js` | Live Casualties: the register grouped under site headers, each row's bar ending at that casualty's physiological deadline against a fixed sixty-minute window, with the filled segment taken from the allocator's own reach model rather than a second implementation. A `deadlineMin >= 9000` row is drawn without a bar; a row whose wearable reading has gone cold says so and drops the reserve rather than quoting it. |
| `page-dec.js` | Decision: one escalation drawn as a two-branch trade-off over `APP.armA.queue`. The two buttons call the application's real `approveProposal()` and `rejectProposal()`, which launch the aircraft, draw product off the shelf and write APPROVE or REJECT into the hash-chained audit log. Absorbs the old TASKING pane. |
| `page-feed.js` | Decision Feed: `APP.armA.audit` rendered in order as prose entries — escalated, authorised, withheld, delivered — with every death interleaved under the category `deathCauses()` assigns it. Export builds the CSV in the page and hands it over as a blob. Absorbs AUDIT and the ground stream. |
| `page-tty.js` | Analyst Terminal: the transcript, plus four tabs that mount the real subsystems rather than redrawing them (DuckDB console, MiniLM retrieval, SQLite export, CRI-Net sensor). Also declares `DPB`, the small shared runtime — tab state, the `#views` dock, escaping and Zulu formatting — that the other pages in this set use, because it loads first. |
| `page-ops.js` | Ops Centre Wall: three figures at 92px, a deadline board and a posture column, sized to be read from across a room, with no card borders. The theatre picker and its stage are the second tab; the delta against the control arm is red. |
| `page-ev.js` | Evidence: the counterfactual, with the paired replication study, arm comparison, outcome analysis, return and cost models and the after-action report each mounted as its own tab. Every death figure and every lever bar takes the red family and the difference is written "fewer dead"; no AI chip appears on this page because nothing on it is a trained network. |
| `page-chat.js` | Ask ANGEL: answers only from figures computed over the live allocation and from passages MiniLM quotes verbatim, and says on the page that the language-model weights are absent. A question that ranks one casualty against another is refused and handed to the human. Every question is written into the decision record before it is answered. |
| `page-map.js` | Theatre Map: builds the ninth destination out of the canvas's shell language around the three existing renderers, mounting the real one through the `DPB` dock. Controls dispatch through `mapScopeNow()`, `zoomAnyMap()`, `fitAnyMap()` and the `MAP_TOOLS_BY_SCOPE` table, which also decides which controls are drawn; the 3D segment is not drawn at all unless `map3dReady()` is true. |
| `page-grouped.js` | The four inventory panes — casualties, aircraft, supplies, approvals — regrouped so that each row sits under the launch point it belongs to, with one honestly-named group for whatever belongs to none. No death is attributed to a launch point, because the model does not record which site failed to reach a casualty; the operation-wide reconciliation is printed once from `COUNT`. |
| `page-launchpoints.js` | Launch Points: the forward sites themselves, each opening into five tabs in the order the questions are asked — aircraft parked, supplies on the shelf, who this site can and cannot reach, what is waiting on a person, and what has flown. An empty tab says what "nothing" means at that site rather than showing an empty box. |
| `page-afteraction.js` | After-Action Report as a briefing: the result as figures, a three-row scoreboard for both arms, the three largest causes of death, a lever list ordered by how many of the dead each addresses, and everything else — the five causes in full, the cost table, the replication study, the sources and the method note — behind disclosures that are shut when the page opens. |

### Role profiles

| File | What it does |
|---|---|
| `role-commander.js` | Composes DECIDE, MISSION, COMPARE, TASKING and COST for a commander: the outstanding decision answerable above the fold with the price of deferring it, and a cost pane leading with the procurement-relevant finding that launch points move the death count and fleet size does not. Reduced panes collapse blocks behind one "show the detail" affordance; nothing is removed from reach. |
| `role-surgeon.js` | Composes eight destinations around who is dying, how fast, who can reach them and whether anyone on scene is qualified to treat what they need. Replaces the 2,306-element casualty register as a landing view with four counts and a worklist ordered by time remaining, and puts the TCCC tier gap — whole blood and plasma being Tier 3 skills against a 58/32/10 tier mix — on the landing view. The full register and its controls stay one labelled control away. |
| `role-logistician.js` | Composes seven destinations around stock, place and temperature. Computes projected time to stockout per item and per launch point from `arm.stockLog` against the scheduled resupply rate, and says which arithmetic cannot honestly support a projection rather than printing one; separates the three distinct ways a unit is destroyed, because they are three different logistics failures with three different fixes. |

### Map, geography and terrain

| File | What it does |
|---|---|
| `geo.js` | The theatre geography as data: real coastlines and international boundaries from the GSHHS shoreline and CIA WDB-II boundary sets, decimated with Douglas–Peucker to roughly 0.13° and clipped per theatre, stored as flat `[lon, lat, …]` arrays in degrees. |
| `map.js` | The tactical common operating picture: basemap, graticule, threat envelopes, casualty symbology, launch points, reach rings and aircraft, drawn from `APP`. Carries no hex literal for a semantic quantity — every colour comes through `MAPTHEME`, which reads the whole token set from the live `<body>` in one `getComputedStyle` call and re-reads it only on a theme change. `MAPTHEME` is the one supported way for any canvas or shader in this application to learn a colour. |
| `basemap.js` | Renders the scenario's elevation field once per scenario into an offscreen canvas — hypsometric tints, hillshade, 25 m contours, bathymetry and coastline at 9 px/km with a generated margin beyond the AO — which is then blitted under the symbology. |
| `theater.js` | The combatant-command view: an equirectangular projection with a cos(lat) correction at the theatre centre, every joint operations area plotted where it actually sits, and a pan/zoom camera `{k, tx, ty}` applied after the fit so the scale bar and the inverse both fall out of one number. Symbol sizes deliberately do not scale with zoom. |
| `geo3d.js` | The tactical picture on the GPU via deck.gl: the sector's own terrain extruded under real Natural Earth coastline, every sortie an arc, every casualty a light column whose height is time remaining. The run is re-executed deterministically once and recorded, so scrubbing backwards is instant and correct; every layer is handed a plain array and debug is never set, so no CDN string inside deck.gl is ever reached. Removes its own navigation entry if WebGL2 is absent. |
| `theater3d.js` | The combatant command on the same GPU engine: an entire AOR with each operation at its true longitude and latitude, sized and coloured by severity, over Natural Earth coastlines and boundaries from `data/basemap.json`. The relief is an explicitly labelled cartographic wash computed from distance-to-coast plus a seeded noise field, not an elevation dataset; the canvas map in `theater.js` stays as the silent fallback, and a click calls the same `selectJoa()`. |

### Trained models, signal and acquisition

| File | What it does |
|---|---|
| `device.js` | CRI-Net in the browser. Ports the physiological generator the network was trained against, synthesises the casualty's photoplethysmogram at 100 Hz, and runs the 104,162-parameter ONNX model over a 500-sample window on the CPU to recover compensatory reserve plus its own predicted variance — with no access to the simulation's ground truth, which is the point: the tasking engine downstream consumes the estimate and the stated uncertainty. |
| `doctrine.js` | Semantic retrieval with no generation. Encodes the question to 384 dimensions with the int8 all-MiniLM-L6-v2 graph (mean pooling and L2 normalisation inside the graph, so the browser only tokenises), compares it against vectors precomputed at build time, and returns text physically present in `data/doctrine.json` with its cosine similarity shown as the honesty mechanism. States on screen that every passage is a summary written for this prototype, not an extract. |
| `copilot.js` | The mission-brief language model, kept on a very short leash: every number in its prompt comes out of the simulation state milliseconds earlier (and out of SQL against that run where the analytical engine is loaded), every doctrinal claim is a verbatim retrieved passage, and the whole context block is printed beside the answer item by item. Engine is the vendored wllama 3.5.1; the weights are not in this repository, and finding none the module withdraws its own pane and rail entry rather than leaving a destination that apologises. |
| `telemetry.js` | The acquisition path in the page: probes `/telemetry/status` on this origin and opens the launcher's Server-Sent Events stream only when a Cursor on Target listener actually exists, reporting INGEST OFF otherwise. Receive-only. It is shaped for BATDOK-J, and the module states plainly that this is an interface the application accepts and not an integration tested against a real instance. |

### Records, analysis and data products

| File | What it does |
|---|---|
| `db.js` | Writes every run to a real relational database — SQLite compiled to wasm, in the page, no server — with casualties, sorties, deliveries, stock movements, proposals, telemetry polls and the audit log in normalised tables, and an arbitrary-SQL query box over it. Deliberately inert: nothing in the simulation depends on it, and a failed initialisation degrades to empty results. |
| `sqlwasm.js` | SQLite 3 compiled to WebAssembly (sql.js, MIT), embedded as base64 so the record layer carries no network dependency. |
| `data2.js` | The analytical record: materialises both arms into DuckDB-wasm running in a worker and points a real SQL console at it. The engine choice is argued in the header — ASOF joins for matching a delivery to the preceding telemetry reading, `quantile_cont`, `PIVOT` and `QUALIFY` are what a row store cannot express. Injects its own `css/data2.css`; cannot change an outcome. |
| `charts.js` | Four analytical pictures over the run's own records: a Sankey of triage category to outcome, six synchronised time series on a shared cursor, a Kaplan–Meier survival curve with the Golden Hour drawn on it, and a scatter of physiological deadline against arrival minute where the diagonal is the thesis. ECharts supplies the Sankey layout only; uPlot draws the rest. Fetches nothing and writes nothing back to the simulation. |
| `dataproducts.js` | The producing half of interoperability: turns a run into files another system could read — a FHIR-shaped casualty care record set, the decision record with its whole hash chain, the run result as JSON and CSV, a JSON Schema for each, and a catalog manifest listing every product published and every source consumed. States explicitly that the record set is FHIR-shaped and not conformance-tested: no validator, no StructureDefinition check, no terminology server, no profile asserted. |

---

## `app/css/` — fourteen stylesheets

Load order is declared by hand in each shell and is load-bearing: `theme.css` first so tokens resolve, `polish.css` after the shell sheet, `scale.css` last.

| File | What it does |
|---|---|
| `theme.css` | The single source of colour: one token contract declared four times, once per theme, selected by `body[data-theme="KEY"]`. Deaths are never green, triage stays doctrinal, and no hue between 285 and 350 above 35% saturation is permitted. |
| `design.css` | The design system extracted verbatim from the Claude Design canvas — colour in oklch, type, spacing and component shape — and the only place a new colour or type size may be introduced. |
| `app.css` | The console shell: layout, panes, cards, tables, the command bar and the rail, driven from the custom properties it declares as a floor for a document that has lost the theme attribute. |
| `fonts.css` | Declares the three families as local `@font-face` rules against the woff2 files in `app/fonts/`, replacing the canvas's `fonts.googleapis.com` link so the first paint issues no off-origin request. |
| `polish.css` | The cross-cutting pass loaded third: fixes shell layout faults at densities the original design did not reach, reconciles separately authored panes onto the host's `.pane`/`.paneHead`/`.card` idiom, and carries the command palette and shortcut sheet chrome. |
| `scale.css` | Loaded last, the only position from which a cross-cutting spacing pass actually lands, and verified with `getComputedStyle` rather than grep: turns spacing into a scale rather than a per-pane setting. |
| `pages-a.css` | Live Casualties, Decision and Decision Feed — the canvas's `isCas`, `isDec` and `isFeed` shapes, resolving every colour to a `design.css` token and applying `.d-death` wherever a figure counts the dead. |
| `pages-b.css` | Analyst Terminal, Ops Centre Wall, Evidence and Ask ANGEL — the four destinations that dock a real subsystem through `#views` rather than redrawing it, plus the geometry that dock needs. |
| `page-map.css` | Geometry only for the Theatre Map destination: gives the docked pane a real box for the two renderers that were written as absolutely-positioned self-scrolling boxes. Declares no colour of its own. |
| `detail.css` | The in-flow record accordion: the region that opens beneath its row at the full width of the main column. |
| `aar.css` | Layout for the after-action briefing — the figures, the short findings and the shut-by-default disclosures. |
| `theater.css` | The theatre map's pan/zoom furniture and the operation picker hanging off the JOA crumb in the command bar; both are chrome that had no styling because neither existed before. |
| `data2.css` | The analytical console, injected by `js/data2.js`. Gives the largest type on the pane to the row count and the elapsed milliseconds, because the claim being made there is about the engine. |
| `prov.css` | Placement rules for the provenance and AI-attribution marks that `js/app.js`, `js/doctrine.js` and `js/inspector.js` inject, so a mark sits beside its label and never over a figure. |

---

## `app/data/`

Two generated JSON files read at run time and never fetched from anywhere.

| File | What it does |
|---|---|
| `basemap.json` | Natural Earth 1:50m coastlines, boundaries and labels via world-atlas 2.0.2 (ISC), `[lon, lat]` in degrees to three decimal places, converted offline; the geography behind both GPU maps. |
| `doctrine.json` | The 161-passage retrieval corpus with its 384-dimensional vectors precomputed at build time, plus the publication list. Every passage is a paraphrase written for this prototype, not an extract, and the file says so in its own `note` field. |

## `app/models/`

| Path | What it does |
|---|---|
| `ppg_cri.onnx` | CRI-Net: 104,162 parameters, opset 13, `float32[1,1,500]` in, estimate and log-variance out. Trained by `train/ppg_cri.py`. |
| `ppg_cri.meta.json` | The model card the interface reads at run time: input shape and rate, held-out metrics (MAE 0.0694 overall, 0.0641 clean, 0.0879 degraded against 0.1588 for heart rate alone), 95% coverage, and the trust thresholds `train/calibrate.py` measured. |
| `ppg_traces.json` | Reference waveform traces shipped beside the model. |
| `minilm/minilm.onnx` | all-MiniLM-L6-v2, 22,565,376 parameters, opset 14, dynamically quantised to int8, with mean pooling and L2 normalisation inside the graph. |
| `minilm/vocab.txt`, `minilm/tokenizer.json` | The 30,522-piece WordPiece vocabulary and tokeniser configuration; tokenisation is the only thing the browser does outside the graph. |
| `minilm/meta.json` | Provenance, sizes and the measured agreement between the PyTorch reference, the fp32 export and the int8 model, plus the retrieval evaluation. |

The language-model weights (`app/models/llm.gguf`) are not in this repository; `js/copilot.js` probes for them and withdraws its pane when they are absent. `GET-MODEL.txt`, `get-model.sh` and `get-model.ps1` at the repository root describe how to supply them.

## `app/fonts/`

Eleven woff2 files, subset to Latin: IBM Plex Sans 400/500/600/700, IBM Plex Mono 400/500/600/700, and Barlow Condensed 500/600/700. They exist so `css/fonts.css` can serve the design's typefaces from the same loopback port as everything else, which is what keeps the verified off-origin request count at zero on first paint.

## `app/vendor/`

Third-party libraries vendored as files, never fetched. Versions and licence evidence are recorded in `Documentation/ANGEL-SWARM-SBOM.md`; the licence column below lists the file, if any, that ships in the same folder.

| Directory | Library | Licence file shipped beside it |
|---|---|---|
| `vendor/react/` | react and react-dom 18.3.1 UMD production builds, loaded before `support.js` so its unpkg fallback short-circuits (MIT) | `LICENSE`, plus `README.txt` recording why the pair is here |
| `vendor/ort/` | ONNX Runtime Web 1.27.0 — `ort.wasm.bundle.min.mjs`, the SIMD-threaded loader and its wasm; runs both trained models (MIT) | none |
| `vendor/duckdb/` | @duckdb/duckdb-wasm 1.29.0 — module, EH wasm and browser worker; the analytical console (MIT) | none |
| `vendor/wllama/` | @wllama/wllama 3.5.1 — llama.cpp compiled to wasm, the mission-brief engine (MIT) | `LICENCE` |
| `vendor/deck/` | deck.gl 9.3.10 minified bundle; both GPU maps (MIT) | none |
| `vendor/echarts/` | Apache ECharts 6.1.0, rebundled to the Sankey chart, tooltip and canvas renderer only (Apache-2.0) | `LICENSE`, `NOTICE` |
| `vendor/uplot/` | uPlot 1.6.32 — the five non-Sankey charts, 52 KB (MIT) | `LICENSE`, and `uPlot.min.css` verbatim |
| `vendor/cm/` | CodeMirror 6 — an esbuild bundle of `codemirror`, `@codemirror/state`, `view`, `lang-sql` and `theme-one-dark`; the SQL query box (MIT) | none |

---

## `src/cmd/angelswarm/` — the launcher

| File | What it does |
|---|---|
| `main.go` | Finds the `app` folder next to the executable, serves it over HTTP on loopback, and opens the browser at that address. The server exists because a `file://` page has an opaque origin and browsers refuse to construct Web Workers from one, and everything load-bearing here runs in a worker. It never originates an outbound request and never writes outside the copied folder; by default it opens exactly one socket. |
| `telemetry.go` | The Cursor on Target ingest, off unless `-cot` is passed: binds 127.0.0.1 unless `-cot-external` is passed as well, parses the CoT `<detail>` medical extension from a bounded slice rather than a stream, drops any datagram over the maximum size unread, republishes to the page over Server-Sent Events, and never replies or originates a packet. States that the detail extension is a prototype and not a ratified medical CoT schema. |
| `fallback/index.html` | Embedded with `go:embed` and served when the launcher starts but cannot find its `app` folder: a single page saying where it looked and what to do. |
| `../../go.mod` | Module `angelswarm`, Go 1.24, no third-party dependencies — `go.sum` is empty and every import is standard library. |

## `src/cmd/cotsim/` — the CoT simulator

| File | What it does |
|---|---|
| `main.go` | Stands in for the wearables: emits Cursor on Target over UDP at a configurable cadence, one event per casualty per reporting interval, with a compensatory reserve that falls the way a bleeding casualty's does and a signal-quality value that degrades with peripheral perfusion. Deterministic under `-seed`. It exists so the acquisition path is exercised by a real socket, a real parse and a real drop from outside the application, and the file states plainly that it is not a device driver and asserts nothing about what any fielded monitor speaks today. |

---

## `train/`

Build-time scripts. They run once, offline, and produce the files in `app/models/` and `app/data/`; nothing in them ships in the application.

| File | What it does |
|---|---|
| `ppg_cri.py` | Generates the synthetic cohort and trains CRI-Net: a 1-D convolutional network reading five seconds of photoplethysmogram and emitting an estimate and a predicted variance under a Gaussian negative log-likelihood. Each synthetic subject gets its own chronotropic responsiveness including non-responders, so a model leaning on heart rate alone cannot do well — and the script reports that comparison so the claim is checkable. Splits held-out data by subject, and mirrors the operating principle of the FDA-cleared CipherOx CRM (K173929) without claiming to be it. |
| `calibrate.py` | Measures the operational trust thresholds rather than choosing them by eye: reuses the exact generator the network was trained on, runs 5,000 clean and 3,000 degraded windows from 120 unseen subjects through the exported ONNX graph, and writes the resulting act/do-not-act boundary into the model card the interface reads at run time. |
| `export_minilm.py` | Exports the sentence encoder and embeds the corpus: builds a local `BertModel` from the fp16 safetensors of the npm package `@lat.md/embed-minilm-fp16` (huggingface.co being unreachable from the build sandbox), exports to ONNX with pooling and normalisation inside the graph, quantises to int8, and writes `minilm.onnx`, `vocab.txt`, `meta.json` and `doctrine.json`. Also carries the corpus text itself, which is why the file is 2,117 lines. |
| `ppg_cri.onnx`, `ppg_cri.meta.json`, `ppg_traces.json` | The training outputs, kept beside the scripts; the copies under `app/models/` are what the application loads. |
| `train.log` | The recorded run: 62,400 windows over 240 subjects trained, 10,500 windows over 70 disjoint subjects held out, fourteen epochs, and the held-out figures the model card quotes. |

## `design/`

The Claude Design canvases the console's visual language was extracted from, kept for provenance. These are the design artefacts, not the application: `app/` is what runs.

| File | What it does |
|---|---|
| `ANGEL_SWARM.dc.html` | The original canvas — the nine destinations, the rail, the command bar and the `isCas`/`isDec`/`isFeed` blocks that `app/css/design.css` and the page modules were built from. |
| `ANGEL_SWARM-v2.dc.html` | The larger second canvas, 3,122 lines, carrying the expanded screen set. |
| `Homepage_Directions.dc.html` | The homepage direction studies, in canvas mode with its own type ramp. |
| `support.js` | Byte-identical copy of `app/support.js` — the Claude Design runtime — so the canvases open standalone. |
| `angel-engine.js` | The canvas-era engine: a small self-contained deterministic run model with its own PRNG, platform table and `buildRun()`/`snapshot()`. It is superseded by `app/angel-engine.js`, which computes nothing itself and reads the shipped engine's ledgers instead; this copy is kept so the canvases still render. |
| `theater-map.js` | The canvas-era GPU map, drawing WebGL2 geometry through a perspective camera over CartoDB raster tiles. It is superseded and not shipped: the application's maps are `app/js/theater.js`, `map.js`, `geo3d.js` and `theater3d.js`, and none of them fetches a tile. |

## `Documentation/verification/`

| File | What it does |
|---|---|
| `winprob.mjs` | Re-derives the win-probability table from the shipped engine, not from a reimplementation: loads `app/js/sim.js` and `app/js/optimizer.js` into a Node `vm` context with the same `CALLSIGN` stub the worker uses, configures both arms exactly as `angel-engine.js` does for the application (mode `fair`, telementoring and human-in-the-loop on for arm A, `rngA = seed*3+1`, `rngB = seed*3+2`, `autoApproveAbove` 0.10, `hvaWeight` 1.6), steps 200 paired battles per theatre, and prints the mean paired difference, its 95% interval, the standardised effect and the win/tie/loss split as JSON. `node winprob.mjs PACOM_CORAL 200`. |
| `build_docx_any.cjs` | Converts a Markdown source in this package to the `.docx` shipped beside it: a `docx`-library renderer with the package's own palette, page geometry, heading levels, tables, headers and footers, and a small inline `**bold**`/`*italic*`/`` `code` `` tokeniser. It is the reason each `Documentation/*.md` has a matching `.docx` with identical wording. |
| `README.txt` | The reviewer's checklist of what can be verified without taking anything on trust, and how. |
| `security-and-sbom/` | The captured evidence — self-test screenshots, settings captures and `verification.txt` — referenced by the security and SBOM documents. |

---

## Files that are generated, not authored

Editing any of these by hand will be overwritten; the generator is named in each case.

| File or directory | Generated by |
|---|---|
| `app/support.js` (and its identical copy `design/support.js`) | `dc-runtime/src/*.ts` via `bun run build`, as the first line of the file states. |
| `app/design.html` | A byte-identical copy of `app/index.html`. |
| `app/js/sqlwasm.js` | SQLite 3 compiled to WebAssembly (sql.js) and embedded as base64. |
| `app/data/doctrine.json` | `train/export_minilm.py`, which also writes the vectors it contains. |
| `app/data/basemap.json` | An offline conversion of Natural Earth 1:50m via world-atlas 2.0.2, recorded in the file's own `note` field. |
| `app/models/ppg_cri.onnx`, `app/models/ppg_cri.meta.json` | `train/ppg_cri.py`, with the metrics block written by `train/calibrate.py`. |
| `app/models/minilm/*` | `train/export_minilm.py`. |
| `app/js/geo.js` | A Douglas–Peucker decimation of the GSHHS shoreline and CIA WDB-II boundary datasets, clipped per theatre. |
| `app/vendor/**` | npm packages, vendored verbatim or rebundled with esbuild; per-file provenance and SHA-256 are in `Documentation/ANGEL-SWARM-SBOM.md`. |
| `Documentation/*.docx` | `Documentation/verification/build_docx_any.cjs`, from the matching `.md`. |
| `ANGEL-SWARM-*` and `cotsim-*` binaries at the repository root | `go build` over `src/cmd/angelswarm` and `src/cmd/cotsim` with `CGO_ENABLED=0 -trimpath -ldflags="-s -w"`; they are listed in `.gitignore` and their hashes are in `CHECKSUMS.txt`. |
