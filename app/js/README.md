# `app/js/` — the modules

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

Forty-five files: the simulation and the tasking optimiser, the workers that run them off the main thread, the shell that draws the console, the thirteen destinations, the four map renderers, the bindings for the two trained models, and the analytical layer. `app/console.html` loads most of them by hand in a declared order; `app/index.html` reaches them through `app/angel-engine.js` and the docked console frame.

Two of these files are the engine. `sim.js` and `optimizer.js` touch no DOM and hold no state outside the objects they are handed, which is why the Monte Carlo worker, the self-test page, the design adapter and `Documentation/verification/winprob.mjs` can all load them verbatim and get the same numbers. Any death count quoted anywhere in this package is a claim about those two files.

Longer, per-file descriptions are in [`../../Documentation/CODE-MAP.md`](../../Documentation/CODE-MAP.md).

## Engine, workers and harnesses

| File | What it does |
|---|---|
| `sim.js` | The simulation: seeded PRNG, scenario table, terrain and weather fields, the casualty stream, the physiology that drives compensatory reserve and the deadline clock. Every parameter carries a citation. |
| `optimizer.js` | The two allocators — deadline-constrained routing against triage-and-proximity dispatch — plus the tier model, escalation, the proposal queue and the hash-chained audit log. |
| `montecarlo.js` | The confidence pane: hundreds of paired replications across a worker pool, reporting the within-battle difference rather than two independent means. |
| `mc.worker.js` | One replication at a time off the main thread; `importScripts` the shipped engine verbatim and holds no state between messages. |
| `palcheck.mjs` | A Playwright script, not shipped code: drives headless Chromium against the command palette and asserts the selection reaches the inspector. |

## Host, shell and chrome

| File | What it does |
|---|---|
| `boot.js` | Runs first: probes what the machine can actually do (WebGL2, workers, wasm, threads) and provides the promise-based service registry so nothing is drawn for a capability that has not been confirmed. |
| `app.js` | The `APP` state object, `render()`, the pointer bindings on every canvas, the role profiles, and `COUNT` — the one vocabulary of counted nouns, so "died" cannot mean three things on three screens. |
| `shell.js` | Navigation and the page frame: nine destinations in the canvas's order, with the only written-down mapping of the older twenty-four into them. |
| `palette.js` | The keyboard guard, the Ctrl/Cmd-K command palette over every view and record, the generated shortcut sheet, and the welcome orientation. |
| `inspector.js` | The left record column: selection, triage chip, transport strip, nearest-launch-point measurement and tasking history, with an explicit table from destination to blocks. |
| `detail.js` | The in-flow record accordion that survives the shell replacing `innerHTML` on every tick; one row open at a time, notes clamped rather than merely advised. |
| `theme.js` | The theme service. One attribute write is the whole mechanism; it re-notifies the canvas and WebGL renderers, which cannot inherit a custom property. |
| `audio.js` | Sonification for an operations floor, where people are turned away from the screen: the shape of the fight rather than its detail. |

## Destinations

| File | What it does |
|---|---|
| `page-dash.js` | Command Overview — the canvas's dashboard on live figures, every number read at paint time. |
| `page-cas.js` | Live Casualties — the register grouped under site headers with a verdict on each group. |
| `page-dec.js` | Decision — one escalation drawn as a trade-off, with the grounds on which the machine refused to choose. |
| `page-feed.js` | Decision Feed — every decision, in order, in words. |
| `page-ev.js` | Evidence — the counterfactual: the paired replication study, the arm comparison and the outcome analysis. |
| `page-ops.js` | Ops Centre Wall — the one screen designed to be read from across a room. |
| `page-tty.js` | Analyst Terminal — the transcript, and the dock for the four analyst subsystems (SQL, doctrine retrieval, export, sensor). |
| `page-map.js` | Theatre Map — the destination the canvas left as a bare mount point, built from the canvas's own shell language. |
| `page-chat.js` | Ask ANGEL — a question-and-answer surface that will not make anything up; it withdraws itself when the language-model weights are absent. |
| `page-afteraction.js` | The after-action briefing: the artefact a commander reads once the run is over. |
| `page-launchpoints.js` | Launch Points — the place rather than the abstraction, since "no launch point close enough" is the model's largest single cause of death. |
| `page-grouped.js` | The four inventory panes — casualties, aircraft, supplies, approvals — grouped rather than served as one flat table each. |
| `page-kpi.js` | The stat strip that opens eleven destinations with figures instead of a paragraph; it restates no number of its own. |

## Roles

| File | What it does |
|---|---|
| `role-commander.js` | Fills and reduces the five destinations a commander is given: decide, mission, compare, tasking, cost. |
| `role-logistician.js` | Reshapes the seven a logistician is given, all of which were written for an analyst. |
| `role-surgeon.js` | Reshapes the eight a surgeon is given, on the same grounds. |

## Maps, geography and terrain

| File | What it does |
|---|---|
| `geo.js` | Real coastlines and international boundaries from GSHHS and CIA WDB-II, decimated and clipped per theatre; the first island chain is where it actually is. |
| `basemap.js` | Renders the scenario's elevation field into a shaded-relief sheet — hypsometric tints, hillshade, contours, bathymetry — once per scenario, then blits it under the symbology. |
| `map.js` | The tactical common operating picture: relief, graticule, threat envelopes, casualty symbology, launch points and aircraft. |
| `geo3d.js` | The same tactical data on a GPU: a pitched, rotatable surface with the sector's terrain extruded under it. |
| `theater.js` | The combatant command rather than the map sheet — every joint operating area plotted where it actually sits. |
| `theater3d.js` | The theatre overview on a GPU, with its coastline geometry embedded in the file rather than fetched. |

## Models, signal and acquisition

| File | What it does |
|---|---|
| `device.js` | CRI-Net's input path: renders the casualty's photoplethysmogram, the same generator the network was trained against, and runs the ONNX session over it. |
| `doctrine.js` | Semantic retrieval, and the opposite of a chatbot: the encoder turns the question into a 384-dimensional vector, the corpus vectors were computed at build time, and passages are quoted rather than generated. |
| `copilot.js` | The mission-brief language model, deliberately given nothing to know. It probes for weights on load and withdraws its own pane when they are absent. |
| `telemetry.js` | The browser end of the Cursor on Target ingest: consumes the launcher's Server-Sent Events and supersedes the simulated reading where a live one exists. |

## Records, analysis and data products

| File | What it does |
|---|---|
| `db.js` | The mission record as SQLite, so an analyst can ask their own question of the transactional record rather than read someone else's chart. |
| `sqlwasm.js` | The SQLite WebAssembly build inlined as base64, so the console stays a single file with no network dependency. |
| `data2.js` | The analytical console over DuckDB: the record queryable while the analyst is still holding the thought. |
| `dataproducts.js` | The export path, which is what stops the application being a consumer only: everything computed during a run survives the tab. |
| `charts.js` | Casualty flow — a Sankey and three companion charts answering where casualties were lost rather than what happened. |
| `film_inline.js` | The film rendered live rather than decoded: the same deterministic renderer that produced the MP4, drawing frames in the page, for viewers whose sandbox blocks media. |
