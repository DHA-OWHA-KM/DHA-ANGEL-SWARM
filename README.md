# ANGEL SWARM — Autonomous medical resupply tasking against physiological deadlines

ANGEL SWARM tasks autonomous medical resupply aircraft — whole blood, TXA, freeze-dried plasma — against wounded soldiers' **physiological deadlines** rather than by triage category and proximity. It is a decision and allocation layer, not an aircraft and not a command system: it decides which airframe flies to which casualty, and when.

The whole thing is one static binary and a folder. It installs nothing, writes nothing outside its own directory, originates no outbound request, and opens exactly one socket — the loopback HTTP port that lets a browser construct a Web Worker. Two trained networks ship and run on the CPU already in the endpoint. No language model weights ship, no inference endpoint is called, and nothing on any screen is generated prose.

> `UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY`
>
> **Version:** v1.0, 8 September 2026
> **AOR in the shipped scenarios:** PACOM and EUCOM — seven theatres, `PACOM_CORAL` by default
> **Default posture:** NOT DEPLOYED, on purpose — press **Deploy** to hand tasking authority to the system mid-fight
> **Author:** Junayd S. Park, DHA Office of Warfighter Health Advantage · Team DHA RESCUE · NDIA Hackathon 2026
> **Visual identity:** IBM Plex and Barlow Condensed, vendored; no paint reaches `fonts.googleapis.com`; no emoji anywhere

---

## Table of contents

1. [The result, with its conditions attached](#the-result-with-its-conditions-attached)
2. [What's in the box](#whats-in-the-box)
3. [The artifacts](#the-artifacts)
4. [Quick start](#quick-start)
5. [Architecture at a glance](#architecture-at-a-glance)
6. [Interface surface](#interface-surface)
7. [Roles & tasking posture](#roles--tasking-posture)
8. [Where this sits in what the Department has already bought](#where-this-sits-in-what-the-department-has-already-bought)
9. [Engineering notes](#engineering-notes)
10. [Operational impact](#operational-impact)
11. [How decision support becomes near-instantaneous](#how-decision-support-becomes-near-instantaneous)
12. [Module operating manual](#module-operating-manual)
13. [Provenance and AI marking](#provenance-and-ai-marking)
14. [Security posture](#security-posture)
15. [DoW IL5 deployment posture](#dow-il5-deployment-posture)
16. [Scope, honestly](#scope-honestly)
17. [Repository map](#repository-map)
18. [License & status](#license--status)

---

## The result, with its conditions attached

Three arms are run against one world, under common random numbers, so they fight the **identical casualty stream** — the same soldiers wounded at the same minute with the same injuries and the same deadlines.

| Arm | | Survivable deaths | Sorties |
|---|---|---|---|
| **A** | ANGEL SWARM | **23** | 20 |
| **B** | CURRENT — TRIAGE & PROXIMITY | **34** | 38 |
| **C** | NO FORWARD DELIVERY | **35** | 0 |

**Conditions: seed 42, PACOM_CORAL, capability deployed.** That is one draw, and one draw is not a claim. Over **200 paired replications in each of seven theatres — 1,400 paired battles** — ANGEL SWARM wins **all seven**, every 95% interval excluding zero. It produced more dead in **6 of 1,400 battles (0.43%)**, and **never by more than one**.

| Theatre | ANGEL | Current | Mean diff | 95% interval | Worse |
|---|---|---|---|---|---|
| PACOM CORAL | 24.23 | 29.14 | −4.905 | −5.215 … −4.595 | 0 / 200 |
| PACOM TIMBER | 14.98 | 19.61 | −4.630 | −4.920 … −4.340 | 0 / 200 |
| PACOM BASALT | 39.81 | 44.37 | −4.555 | −4.853 … −4.257 | 1 / 200 |
| EUCOM GRANITE | 33.91 | 38.36 | −4.445 | −4.749 … −4.141 | 1 / 200 |
| EUCOM AMBER | 37.16 | 40.73 | −3.565 | −3.812 … −3.318 | 0 / 200 |
| PACOM MARINER | 12.70 | 15.90 | −3.210 | −3.460 … −2.960 | 0 / 200 |
| EUCOM FJORD | 16.75 | 18.61 | −1.865 | −2.045 … −1.685 | 4 / 200 |

The control arm is given **perfect triage**, which no human achieves. EUCOM FJORD is the weakest theatre and it still wins; at seed 42 alone FJORD gives ARM A 16 against ARM B 15, which is one draw from a distribution whose interval does not touch zero. **Quote the interval, not the seed.**

Full method, per-theatre effect sizes and the reproduction commands: [`Documentation/ANGEL-SWARM-WIN-PROBABILITY-v5.9.md`](Documentation/ANGEL-SWARM-WIN-PROBABILITY-v5.9.md). Every figure above was re-measured on the shipped v6.5 engine.

---

## What's in the box

Everything needed to run the system, verify its numbers and read the case for it. Nothing is fetched at first run.

| Path | What is in it |
|---|---|
| `ANGEL-SWARM-*` (4 files) | **The program.** Static Go launcher for Windows x64, macOS Apple Silicon, macOS Intel and Linux x64. No installer, no runtime, no dependencies. |
| `cotsim-*` (4 files) | Synthetic Cursor-on-Target emitter, same four platforms — stands in for the monitors on the soldiers so the ingest path is exercised over a real socket. |
| [`app/`](app/) | **The application.** Everything the launcher serves: the console, the engine, four map renderers, two ONNX models, the vendored runtime, the fonts and the films. |
| [`Documentation/`](Documentation/) | **Every written deliverable** — use cases, DHA alignment, architecture, security and ATO pathway, SBOM, IL5 cost analysis, specifications, the win table, the rehearsal pack, the decks, the design decisions and the verification evidence. Each is present as Markdown for reading in the browser and as `.docx` where a Word copy ships. |
| [`Videos/`](Videos/) | The two films as standalone downloads — a 3 min 15 s cut and a 60-second cut. |
| [`src/`](src/) | Go source for the launcher and for `cotsim`. `go.mod` declares **zero requirements**, so it builds offline. |
| [`train/`](train/) | CRI-Net training, MiniLM export, the calibration script and the training log. |
| [`design/`](design/) | The design canvases the interface was drawn in. |
| [`TASKING.md`](TASKING.md) | NDIA 2026 team tasking — who owns what, mapped onto what is actually in this repository. Update it in place as items close. |
| [`START-HERE.md`](START-HERE.md) | The orientation document: how to run it, the first five minutes, what to test, and what is deliberately not claimed. Read this one first. |
| [`CHECKSUMS-REPO.txt`](CHECKSUMS-REPO.txt) | SHA-256 of every tracked file at its path in this repository. |

**Repository weight: ~183 MB, 255 files.** Nothing approaches GitHub's 50 MB per-file warning; the largest tracked file is `app/vendor/duckdb/duckdb-eh.wasm` at 34.0 MB. **Git LFS is deliberately not used** — LFS stores pointer text at the file's path, and a reviewer who downloads a ZIP of an LFS repository gets an application that does not run, with no error explaining why. The reasoning is in [`Documentation/GITHUB-PREP.md`](Documentation/GITHUB-PREP.md), decision 5.

---

## The artifacts

Five things run. All five are in `app/`, all five are served by the same launcher over the same loopback port, and all five work with the network cable pulled.

| Artifact | Path served | What it is |
|---|---|---|
| **Operations console** | `/` → [`app/index.html`](app/index.html) | The design build. Thirteen destinations down the left rail, four role profiles, the answer on the first screen. This is what opens when you double-click the binary. |
| **Analyst console** | `/console.html` → [`app/console.html`](app/console.html) | The full analyst shell: the DuckDB SQL console, the doctrine retrieval view over the complete 161-passage corpus, and the raw engine panes. |
| **Design build** | `/design.html` → [`app/design.html`](app/design.html) | An alternate shell over the same engine, byte-identical to `index.html` in this build. |
| **Engine self-test** | `/selftest.html` → [`app/selftest.html`](app/selftest.html) | **118 assertions against the shipped engine**, in your own browser, offline, in under a second. Nothing is mocked. Last run: 118 passed, 0 failed. |
| **Telemetry emitter** | `cotsim-*` | Not served — a separate binary. Emits Cursor on Target over UDP at a configurable device count and rate, so the ingest path is driven from outside the program. |

Two decks and two films ship alongside them:

| Artifact | Where | What it is |
|---|---|---|
| **Pitch deck** | [`Documentation/deck/ANGEL-SWARM-pitch.pptx`](Documentation/deck/ANGEL-SWARM-pitch.pptx) | 3 slides — the problem, what it costs, what changes. Rendered for the browser at [`ANGEL-SWARM-pitch.md`](Documentation/deck/ANGEL-SWARM-pitch.md). |
| **Leadership opener** | [`Documentation/deck/ANGEL-SWARM-leadership-opener.pptx`](Documentation/deck/ANGEL-SWARM-leadership-opener.pptx) | 3 slides — title, stakes, deliver. Rendered at [`ANGEL-SWARM-leadership-opener.md`](Documentation/deck/ANGEL-SWARM-leadership-opener.md). |
| **The film, full** | [`Videos/ANGEL-SWARM-film-full-3m15s.mp4`](Videos/) | 3 min 15 s, 1920×1080, H.264, silent. |
| **The film, short** | [`Videos/ANGEL-SWARM-film-short-60s.mp4`](Videos/) | 60 s cut for a five-minute slot. |

The application plays its own copies from [`app/video/`](app/video/), where the VP9 WebM fallbacks also live. **Those must not be moved** — the film pane loads them by relative path and the app breaks without them. `Videos/` holds standalone copies for download.

---

## Quick start

**A server is required.** A page opened with `file://` has an opaque origin, and browsers refuse to construct Web Workers from an opaque origin. The neural network, the analytical database and the map all run in workers. The launcher serves `app/` over loopback and nothing else.

### The fastest path — download and run

1. **Code → Download ZIP**, or `git clone https://github.com/DHA-OWHA-KM/DHA-ANGEL-SWARM-DEV.git`
2. Unzip it. Keep the folder intact — the binary looks for `app/` beside itself.
3. Run the binary for your platform:

| Platform | Command |
|---|---|
| Windows | double-click `ANGEL-SWARM-windows-x64.exe` |
| macOS (M1–M4) | `chmod +x ANGEL-SWARM-macos-apple-silicon && ./ANGEL-SWARM-macos-apple-silicon` |
| macOS (Intel) | `chmod +x ANGEL-SWARM-macos-intel && ./ANGEL-SWARM-macos-intel` |
| Linux | `chmod +x ANGEL-SWARM-linux-x64 && ./ANGEL-SWARM-linux-x64` |

Your browser opens at `http://127.0.0.1:8787`. That is the whole install.

> **The `chmod +x` is not optional on macOS or Linux.** GitHub's ZIP export does not preserve the Unix execute bit. A `git clone` does preserve it and needs no `chmod`.
>
> **On macOS the first launch may be blocked** because the binary is not notarised. Right-click → Open → Open again, or `xattr -d com.apple.quarantine ANGEL-SWARM-macos-apple-silicon`.

### Building it yourself

Requires Go 1.24+. `go.mod` declares no module requirements, so this builds fully offline. **`go.mod` lives in `src/`, so build from there:**

```bash
cd src
go build -ldflags="-s -w" -o ../angel-swarm ./cmd/angelswarm
go build -ldflags="-s -w" -o ../cotsim      ./cmd/cotsim
cd ..
./angel-swarm
```

| Flag | Effect |
|---|---|
| `-port N` | preferred loopback port (default 8787) |
| `-no-browser` | do not open a browser window |
| `-quiet` | suppress request logging |
| `-cot ADDR` | accept CoT telemetry on a UDP address, e.g. `:6969`. **Off by default.** |
| `-cot-external` | allow that listener to bind a non-loopback interface |

### Any static server

```bash
cd app && python3 -m http.server 8899 --bind 127.0.0.1
```

Works, and serves `.wasm` with the correct MIME type on Python 3.11+. You lose the CoT listener and the banner; everything in the browser is identical.

### Verifying the claims

```bash
# 118 assertions against the shipped engine — open in the browser with a server running
open http://127.0.0.1:8787/selftest.html

# Re-derive the seven-theatre win table from the same engine files.
# Run from the repository root: winprob.mjs reads app/js/*.js relative to the working directory.
node Documentation/verification/winprob.mjs PACOM_CORAL   200
node Documentation/verification/winprob.mjs PACOM_TIMBER  200
node Documentation/verification/winprob.mjs PACOM_BASALT  200
node Documentation/verification/winprob.mjs PACOM_MARINER 200
node Documentation/verification/winprob.mjs EUCOM_GRANITE 200
node Documentation/verification/winprob.mjs EUCOM_AMBER   200
node Documentation/verification/winprob.mjs EUCOM_FJORD   200

# Verify every file in this repository against its recorded digest
shasum -a 256 -c CHECKSUMS-REPO.txt
```

`winprob.mjs` uses only Node builtins — no `npm install` — and loads `app/js/sim.js` and `app/js/optimizer.js` **verbatim off disk**, so there is no harness variant of the engine to disagree with.

### Exercising the telemetry ingest path

```bash
./angel-swarm -cot :6969                                          # window 1
./cotsim -target 127.0.0.1:6969 -devices 125 -rate 0.05           # window 2
```

Watch the INGEST chip go LIVE. Then **stop the emitter**: the chip goes LINK STALE after six seconds and LINK DOWN after fifteen, and the tasking layer carries on using the last reading it holds. That behaviour is the concept.

### Optional: the Mission brief prose pane

One pane's second half uses a small language model this repository **does not redistribute**. `./get-model.sh` (or `.\get-model.ps1`) fetches Qwen2.5-0.5B-Instruct — Apache-2.0, ~400 MB — into `app/models/llm.gguf`, once, over the internet. If you do not run it nothing breaks: the pane says the model is not installed and still shows every figure and every doctrinal passage it would have used. See [`GET-MODEL.md`](GET-MODEL.md).

---

## Architecture at a glance

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │  cotsim / a real wearable feed                                         │
  │      Cursor on Target over UDP, medical values in a <detail> extension │
  └───────────────────────────────┬────────────────────────────────────────┘
                                  │  receive-only · off by default · loopback
                                  │  unless -cot AND -cot-external
  ┌───────────────────────────────▼────────────────────────────────────────┐
  │  src/cmd/angelswarm — the launcher (Go, zero dependencies)             │
  │      finds app/ beside the executable · serves it on 127.0.0.1:8787    │
  │      opens the browser · parses CoT · never replies, never originates  │
  └───────────────────────────────┬────────────────────────────────────────┘
                                  │  HTTP, loopback only
  ┌───────────────────────────────▼────────────────────────────────────────┐
  │  app/ — the single-page application                                    │
  │                                                                        │
  │   app/js/sim.js + app/js/optimizer.js      THE ENGINE                  │
  │     no DOM, no ambient state. Loaded verbatim by the self-test, by     │
  │     the Monte Carlo worker, by the design adapter and by winprob.mjs.  │
  │     Every death count in this package is a claim about these two files.│
  │                                                                        │
  │   app/js/mc.worker.js     paired Monte Carlo, common random numbers    │
  │   app/js/geo.js/geo3d.js  four map scales: globe, theatre, 2D, 3D      │
  │   app/js/basemap.js       procedural shaded relief from the scenario's │
  │                           own elevation field — no tile server         │
  │   app/js/db.js            DuckDB-WASM analytical database              │
  │   app/js/telemetry.js     ingest, link-state, last-known-state carry   │
  │                                                                        │
  │   app/models/ppg_cri.onnx        CRI-Net · 104,162 parameters          │
  │   app/models/minilm/minilm.onnx  all-MiniLM-L6-v2 int8 · 22.9 MB       │
  │   (no GGUF ships — nothing on any screen is generated prose)           │
  └────────────────────────────────────────────────────────────────────────┘
```

Two things are worth naming because they are load-bearing.

**The engine is a pure function of a seed.** `createWorld(seed)` generates the casualty stream from a seeded PRNG; the three arms then consume the same draws in the same order, which is what makes "the same battle, fought three ways" a true statement rather than a figure of speech. It is also why the self-test can assert an exact death count and why `winprob.mjs` can pair replications.

**Nothing renders from the network.** Coastlines and international boundaries are Natural Earth 1:50m, generalised offline and embedded in `app/js/geo.js` as integer deltas — 34,416 vertices in roughly 218 kB of source text, so the globe is not even a separate file to fetch. Terrain is computed on the endpoint at load, and the map says so on its own face: `RELIEF IS SHADING, NOT ELEVATION`.

File-by-file detail for every module: [`Documentation/CODE-MAP.md`](Documentation/CODE-MAP.md).

---

## Interface surface

There is no REST API and no server-side state — the launcher serves static files and, optionally, listens. What the system exposes is an **ingest interface** and a set of **data products**.

| Direction | Interface | Detail |
|---|---|---|
| **In** | Cursor on Target over UDP | Medical values ride in a `<detail>` extension — CoT's own extension mechanism, used as intended. **Not a ratified medical CoT schema**, and nothing here claims otherwise. Receive-only: it parses, it never replies, it never originates a packet. Datagrams over 8192 bytes are dropped unread. |
| **In** | `-cot ADDR` / `-cot-external` | Two flags, not one, to put a socket on a real interface. Off entirely without `-cot`. |
| **Out** | FHIR-shaped bundle | 4,151 resources. **FHIR-shaped, not conformance-tested** — every resource carries that caveat in its own `meta.tag` so it cannot be lost by copying one file out. |
| **Out** | Hash-chained decision record | Every tasking decision, with full 64-character SHA-256 digests. Tamper-evidence is asserted by the self-test. |
| **Out** | Run result | JSON and CSV. |
| **Out** | Five JSON Schemas + a data catalogue | The shape of everything above. |
| **Out** *(target, not implemented)* | STANAG 4586 | The correct NATO interface for handing a mission to the ground control station that already flies the airframe. **A target interface, not an implemented one.** |

All ten exports are on **Data Sources → DATA PRODUCTS**.

---

## Roles & tasking posture

Four role profiles change what the interface offers you on arrival — never what you are allowed to reach. They switch live, mid-run, without a reload.

| Role | Opens on | Emphasises |
|---|---|---|
| **Commander** | Command Overview | The three tolls, the comparison, deploy authority, the after-action summary |
| **Logistician** | Ops Center Wall | Sorties, payload composition, cold chain, launch-point utilisation |
| **Surgeon** | Live Casualties | Deadlines, injury patterns, what arrived and how much margin was left |
| **Analyst** | Analyst Terminal | The SQL console, the replication study, the sensor and model cards, provenance |

**The system starts NOT DEPLOYED, on purpose.** ANGEL SWARM is a capability that gets deployed into a fight already in progress, so the simulation begins with the unit handling casualties the way it does today. Press **Deploy** in the top bar to hand tasking authority to the system, then watch the two arms separate. If you never deploy, both arms task by CURRENT — TRIAGE & PROXIMITY, the two tolls land a death or two apart because each arm consumes its own random draws at a slightly different rate, and the after-action summary refuses to declare a winner. That is correct behaviour, not a bug, and it is not a result.

**Human on the loop, not in the way.** A person is asked before a sortie launches whenever the system is not confident. Everything else launches under standing authority — and every decision is written down.

**The comparison follows you.** An ANGEL SWARM figure never appears in this application without the CURRENT — TRIAGE & PROXIMITY figure beside it, at the same size — under twelve screen titles and on the navigation rail, whatever destination is open. Before the comparison is readable it says so in words rather than printing a number it cannot stand behind.

---

## Where this sits in what the Department has already bought

**This is built to be subsumed, not to compete.** The Department has bought, fielded and made permanent every layer around the decision this system makes, and has bought none of that decision. ANGEL SWARM is the missing tasking rule for aircraft the Services have already procured.

**The layer below — the airframes already exist and already fly themselves.** In May 2026 the 44th Medical Brigade, XVIII Airborne Corps, completed an operational validation of autonomous Class VIII aerial resupply using Soaring M25 aircraft. The aircraft are autonomous and fielded; the rule that decides which aircraft flies to which casualty is bought by no program in the portfolio. NAVAIR PMA-263 fields the TRV-150 through the Unmanned Logistics Systems–Air line, and the Marine Corps TRUAS variant has reached initial operational capability; its published behaviour is automated launch, waypoint navigation, automated landing and payload release. It flies the mission it is given. ANGEL SWARM produces the mission it is given. This system's airframe parameters are set **at or below** published performance for the TRV-150C, the Soaring M25 and the FVR-90 — it does not assume a better aircraft than the one that exists.

**The layer beside — sensing and documentation is being competed now.** DIU announced the AI-Assisted Triage and Treatment Tool on 25 February 2026 (PROJ00628); its stated scope is digital triage, patient assessment and documentation, and it does not buy allocation or tasking of evacuation and resupply assets. ANGEL SWARM consumes what that program produces and produces an aircraft assignment — two adjacent buys, zero overlap. TATRC's MEDRAS portfolio funds autonomous transport, documentation and treatment across sixteen projects; **allocation is not a category in that portfolio.** Project Crimson demonstrated refrigerated FVR-90 whole-blood delivery to field medics at Project Convergence 2022, with BATDOK at the medic edge — prior art this work builds on, and four years old.

**The layer above — the host is already designated.** On 9 March 2026 the Deputy Secretary of Defense designated the Maven Smart System a program of record and moved its administration to the CDAO MSS Program Office; the FY27 request funds third-party vendors to develop and field applications on MSS. ANGEL SWARM is an application for that pipeline, not a parallel C2 system, and Open DAGIR's OTA mechanism is the named path for onboarding an outside capability without owning the data beneath it. CDAO's Agent Network, announced June 2026, is architecturally the same object: bounded agents that deliver decision options to a commander in seconds and make no targeting or strike decisions. Its published operating partners are EUCOM, INDOPACOM and SOUTHCOM, and its published use cases do not include medical logistics. **ANGEL SWARM is an Agent Network-class capability for the medical lane** — a lane to be filled, not a program to be displaced.

**The clinical lane — DHA already owns the record of truth.** The Operational Medicine Care Delivery Platform, owned by Defense Healthcare Management Systems, integrates with MHS GENESIS, references Joint Trauma System guidance, and is built to run disconnected and intermittent. This system's exported casualty and decision resources are shaped for that lane. The physiological deadline itself traces to Joint Trauma System Clinical Practice Guidelines, which is what makes "deadline" a clinical term rather than a product term.

**Policy — this is an RMF question, not an autonomy-in-weapons question.** DoD Directive 3000.09 (25 January 2023), paragraph 1.1.b, excludes from its applicability "unarmed platforms, whether remotely operated or operated by onboard personnel, and whether autonomous or semi-autonomous," and "autonomous or semi-autonomous systems that are not weapon systems." This system tasks unarmed aircraft carrying blood. The Directive excludes it on both counts, in its own words. The rulebook that applies is DoDI 8510.01 and the Risk Management Framework.

### How it is subsumed, concretely

1. **As an application on the MSS third-party layer,** onboarded through the Open DAGIR OTA mechanism. It contributes a decision surface; it does not stand up a data environment.
2. **As the medical-logistics lane inside an Agent Network-style agent framework** — the same bounded-agent contract, human on the loop, no strike authority.
3. **As a tasking service behind an existing ground control station.** The assignment it produces is a mission for a specific airframe; STANAG 4586 is the correct NATO interface for handing it to the control station that already flies that airframe.
4. **As a data producer into the DHA clinical lane,** exporting casualty and decision resources shaped to the same standard the operational medicine platform and MHS GENESIS consume.

### What is deliberately NOT claimed

Honest boundaries, stated here so no reviewer has to find them.

- **CoT is ingested, not emitted.** The telemetry listener is receive-only, off by default, and bound to loopback unless explicitly opened. It adds a track consumer, not a new interface. An emit path is the obvious next step and is not claimed today.
- **CRI-Net's estimate does not reach the allocator in this build.** The deadlines the tasking runs on come from the scenario's own physiology model. The Sensor & Model screen says so, and closing that loop is named in the documents as the next piece of work.
- **The exported health resources are FHIR-shaped, not conformance-tested,** and every exported resource carries that tag. The word "compliant" is not used anywhere.
- **STANAG 4586 is a target interface, not an implemented one.**
- **No Replicator alignment is claimed.** Replicator 1 and 2 scope is attritable combat autonomy and counter-UAS. Medical logistics is in neither.
- **No Link 16, VMF or MIL-STD-6017 compatibility is claimed.** Those are platform-to-platform tactical data links for track and fires.
- **The allocation mathematics is not claimed as novel.** Published academic work addresses military medical evacuation dispatching and redeployment directly. What is offered here is a fielded decision layer with a provenance record attached to every decision — which the published work does not provide.
- **"Swarm" here does not mean attritable strike mass.** It is a fleet of unarmed logistics aircraft carrying blood.

Sources, with a URL and a date for every claim above: [`Documentation/COMPLEMENT-LANDSCAPE-sources.md`](Documentation/COMPLEMENT-LANDSCAPE-sources.md).

---

## Engineering notes

- **Zero runtime dependencies in the launcher.** `src/go.mod` declares no requirements. The binary is `embed` plus the standard library. It builds offline on Go 1.24 in seconds.
- **Everything the browser needs is vendored.** DuckDB-WASM, ONNX Runtime Web, wllama, deck.gl, ECharts, CodeMirror and µPlot sit in `app/vendor/` at the exact files the application loads. `node_modules/` is not in this repository and is not needed to run it.
- **The globe is Canvas 2-D, not WebGL, on purpose.** It holds no graphics context, so it cannot be the thing that evicts one of the two contexts the tactical maps do hold.
- **The engine is loaded verbatim by four different callers** — the self-test page, the Monte Carlo worker, the design adapter and `winprob.mjs`. There is no harness variant of the simulation that could quietly disagree with the shipped one.
- **The decision log is hash-chained**, and the self-test asserts both the chain and its tamper-evidence.
- **Reproducibility of the binaries was measured, not assumed.** A Go 1.24.7 rebuild produced a launcher within 1.0% of the shipped linux-x64 size and a `cotsim` within 2.4%; the rebuilt launcher served `app/`, the application booted with zero page errors and the self-test returned 118 passed / 0 failed. They are not byte-identical to the shipped binaries because Go embeds build metadata — expected, and recorded in [`Documentation/GITHUB-PREP.md`](Documentation/GITHUB-PREP.md) §2.1.
- **Known open defect in the drawing layer.** The instrumented network verification run records 22 console errors, all of them unsubstituted template expressions painted into SVG attributes (`{{ z.x }}`, `{{ b.rx }}` and similar). They do not affect any figure and do not reach the engine, but they are real and they are in [`Documentation/verification/security-and-sbom/verification.md`](Documentation/verification/security-and-sbom/verification.md) rather than buried.
- **`Documentation/winprob.mjs` and `Documentation/verification/winprob.mjs` are byte-identical.** The `verification/` copy is the documented one.

---

## Operational impact

**Commander.** The answer is on the first screen before anything is pressed: three tolls for the same battle, with the comparison attached. Deploy authority is a single control, and the after-action summary states what changed and refuses to state it when the comparison is not readable.

**Logistician.** Sortie count, payload composition and cold-chain state per aircraft, and the finding that matters most for a buy: **tripling the fleet from 7 to 23 aircraft does not move the toll.** Where the launch points sit is the binding constraint — and moving a launch point is the cheaper purchase. The system says so on its own screen, against its own interest.

**Medical planner / Surgeon.** Every casualty carries a deadline in minutes rather than a triage category, and every delivered payload is scored on how much of that casualty's own deadline was left when it arrived. A stop the aircraft has not reached yet prints an ETA rather than a fact, and prints no margin at all.

**Analyst.** Arbitrary SQL over the run through DuckDB-WASM; the paired Monte Carlo with five levers; doctrine retrieval that answers in verbatim quotes with a similarity score and refuses when nothing in the corpus matches; and the full model inventory read out of the models' own metadata at the moment the sheet is drawn.

---

## How decision support becomes near-instantaneous

Four steps, one loop, all of it on the endpoint.

| | Step | What happens | Where |
|---|---|---|---|
| **01** | **SENSE** | Compensatory reserve arrives off a wearable, carried on Cursor on Target — the feed TAK and ATAK already move. No reachback required. | `app/js/telemetry.js`, `src/cmd/angelswarm/telemetry.go` |
| **02** | **PREDICT** | CRI-Net reads five seconds of photoplethysmogram at 100 Hz and estimates when the body can no longer compensate — and **declines to answer** when the signal is too poor to trust. Held-out MAE 0.069 against 0.159 for heart rate alone, on 70 subjects in no training window. | `app/models/ppg_cri.onnx`, `app/angel-ppg.js` |
| **03** | **TASK** | The deadline sets the order: whoever runs out first is served first. Payload matched to the wound, cold chain enforced, a person asked only when the system is not confident. | `app/js/optimizer.js` |
| **04** | **PROVE** | The same battle is fought twice — once this way, once the way it is done today, same casualties, same aircraft, same seed — and scored on one number: dead of wounds that could have been survived. | `app/js/sim.js`, `app/js/mc.worker.js` |

The reason this is fast is that none of it leaves the machine. There is no inference endpoint, no tile request, no database round trip and no reachback in the decision path. The measured claim from the ingest test is **125 devices at 62 messages a second, nothing dropped**, and when the feed is cut the tasking layer carries on from last-known state.

---

## Module operating manual

Thirteen destinations run down the left rail. Two of the thirteen carry an AI mark; the other eleven do not, and that is what makes the mark mean something.

| # | Destination | What it does |
|---|---|---|
| 1 | **Command Overview** | The three tolls of this battle before anything is pressed, read out of the engine at the moment the screen is drawn. |
| 2 | **Theater Map** | The same fight at four scales — GLOBE, THEATRE, TACTICAL 2D, TACTICAL 3D. Click a casualty or an aircraft for the one-sortie strip, stop by stop, with the current stop highlighted. Closed on arrival, on purpose. |
| 3 | **Live Casualties** | Every casualty with a deadline in minutes, their injury pattern, and what has reached them. |
| 4 | **Decisions** | The hash-chained decision record — what was tasked, why, and under whose authority. |
| 5 | **Analyst Terminal** | DuckDB SQL console over the run, plus the doctrine view. |
| 6 | **Sensor & Model** *(AI)* | CRI-Net's card: parameters, validation, the uncertainty channel and the refusal behaviour. Also states plainly that its estimate does not reach the allocator in this build. |
| 7 | **Ops Center Wall** | The result as a board, readable across a room. |
| 8 | **Evidence** | Where the deaths that remain came from. |
| 9 | **War Game** | Five-lever paired Monte Carlo with common random numbers. Reports the confidence interval **and** the number of replications where the system did worse. |
| 10 | **Ask ANGEL** *(AI)* | Answers questions about the run from the run's own record, badged `RUN RECORD · COMPUTED, NOT GENERATED`; quotes doctrine verbatim; and where it can do neither, says so and lists what it can be asked instead. |
| 11 | **Authority & Policy** | The policy argument, the films, and the DoDD 3000.09 exclusion in its own words. |
| 12 | **Data Sources** | Every model's parameters, validation, file path and licence, read from the models' own metadata; the named list of what is **not** a model; and the ten data-product exports. |
| 13 | **Settings** | Scenario, role, display, the guided walkthrough (off by default) and the engine self-test. |

`Ctrl-K` (`Cmd-K`) searches every view, every action, every casualty and the doctrine library. `?` lists the keyboard shortcuts.

---

## Provenance and AI marking

The standing rule on this project is that **what is presented must be true**, and the interface enforces it structurally: every figure a calculation produced carries **exactly one** mark, and the two marks are never allowed to blur.

| | AI mark | Deterministic mark |
|---|---|---|
| Means | a trained model produced this number | no model — a written rule, arithmetic, geometry, a seed, a hash or a query |
| Says | mixed-case, **names the model** | upper-case mono, leads with **NOT AI** |

Nothing that is not a set of learned weights may borrow the AI styling. Only four provenance entries are `kind:'ai'`, and adding a fifth means shipping weights.

**Two model files ship, and no language model weights ship.**

| | CRI-Net | all-MiniLM-L6-v2 (int8) |
|---|---|---|
| File | `app/models/ppg_cri.onnx` (420 KB) | `app/models/minilm/minilm.onnx` (22.9 MB) |
| Licence | **NOASSERTION** — trained in this repository, no licence file written | **Apache-2.0** |
| Provenance | Synthetic cohort. Waveform morphology follows the published response of the peripheral pulse to central volume loss; no patient data was used. | Obtained via npm `@lat.md/embed-minilm-fp16`, then converted and dynamically quantised to int8 here — **not** from huggingface.co, which was unreachable from the build sandbox. That package is not in `package-lock.json`, so its integrity hash cannot be produced from this repository. **An open supply-chain item.** |

No language model is loaded in the shipped build, so nothing in the interface is generated prose — every figure is computed from the run's own state. The optional Qwen fetch is the one exception and it is opt-in, marked, and not redistributed here.

**One thing we would rather tell you than have you find.** On two surfaces — Analyst Terminal → DOCTRINE, and Ask ANGEL's doctrine answers — the similarity score shown is produced by term overlap over an eleven-passage inline reference set, and the badge above it names the sentence encoder. The encoder is real, it ships, and it does run the doctrine view in `app/console.html` over the full 161-passage corpus — but not those two panels. The score is honest and its floor was measured; the label names the wrong machine. It is recorded as **R-11** in the security document.

Every shipped component is enumerated, digested and graded **VERBATIM / REBUNDLED / UNVERIFIED / SUPPORTING** in the CycloneDX 1.6 SBOM: [`Documentation/ANGEL-SWARM-SBOM.md`](Documentation/ANGEL-SWARM-SBOM.md) and [`.json`](Documentation/ANGEL-SWARM-SBOM.json), with its validation record at [`ANGEL-SWARM-SBOM-validation.md`](Documentation/ANGEL-SWARM-SBOM-validation.md).

---

## Security posture

The full assessment is [`Documentation/ANGEL-SWARM-SECURITY-AND-ATO.md`](Documentation/ANGEL-SWARM-SECURITY-AND-ATO.md) — a STRIDE threat model and an RMF pathway, **not an accreditation artefact and not a System Security Plan**. Every statement in it is bucketed **MEASURED**, **IN PLACE** or **REQUIRED**, and anything that is none of the three is not asserted.

### What is measured

| Property | Measurement |
|---|---|
| **Zero egress** | Instrumented runs record **zero off-origin requests** across all thirteen destinations and all four map scales. No tile server, no basemap key, no font CDN, no telemetry beacon, no analytics. |
| **One socket** | With no `-cot` flag the launcher opens exactly one: the loopback HTTP port on 127.0.0.1. It never originates an outbound request. Unplug the network and behaviour is identical. |
| **Receive-only ingest** | The CoT listener parses and never replies. Datagrams over 8192 bytes are dropped unread. It binds 127.0.0.1 unless `-cot` **and** `-cot-external` are both passed — two flags, not one. |
| **No filesystem reach** | Nothing is written outside the folder you copied. Nothing is installed. No registry key, no launch agent, no service. |
| **Browser storage** | Audited. The application holds no credential and no persistent identity. |
| **Supply chain** | Every shipped component hashed off disk and graded in a CycloneDX 1.6 SBOM, validated with `ajv` against the CycloneDX project's own schema. |
| **Tamper-evidence** | The decision record is SHA-256 hash-chained, and the self-test asserts that breaking the chain is detected. |
| **Secrets** | The tree was scanned for API keys, access and bearer tokens, passwords, PEM private-key headers, AWS key IDs, Slack `xox*` and GitHub `ghp_*` tokens, and OpenAI `sk-*` tokens. **No credential, key, token or secret was found.** Two `AKIA`-shaped matches are coincidental substrings inside base64 payloads (`app/data/doctrine.json`, `app/js/sqlwasm.js`) and are documented as false positives. No personal or organisational email address appears anywhere in the source or documents. |

### What is open — the risk register

**Eleven residual risks are recorded and open, R-1 through R-11.** The two that any reviewer should read first:

- **R-1 — There is no authentication, no identity and no access control.** Certain, and stated first. The four role profiles change what the interface offers, not what a user is permitted to reach. This is a demonstration, not a fielded system, and the security document says so before anyone else has to.
- **R-6 — The eleven vendored typefaces carry no licence evidence.** The filenames follow the Fontsource convention exactly, but no `@fontsource/*` package is installed, no face matches any file in `node_modules` by digest, and no licence file ships beside them. IBM Plex and Barlow are both distributed upstream under SIL OFL 1.1, but nothing in this repository proves these bytes came from those distributions. **A public repository is redistribution, which is precisely the act a font licence governs** — so this changes character on publication and is the cheapest open finding to close. The fix is to re-fetch from a named source, vendor the OFL text and regenerate the SBOM.

Also open and worth naming: `app/vendor/ort/`, `duckdb/`, `deck/` and `cm/` ship no licence text either, and `cm/` is a re-bundle whose digest cannot be checked against npm. See [`app/vendor/README.md`](app/vendor/README.md).

### What an operational fielding would still require

No ATO, no IATT, no interim authorisation of any kind. No Authorizing Official has seen it. Authentication, identity federation, access control, audit forwarding, key management, continuous monitoring and a System Security Plan are all **REQUIRED** and none of them is **IN PLACE**. The pathway is section 8 of the security document and the cost of walking it is the next section.

**Read the register before quoting the posture.**

---

## DoW IL5 deployment posture

Full analysis: [`Documentation/ANGEL-SWARM-IL5-deployment-cost-impact-analysis.md`](Documentation/ANGEL-SWARM-IL5-deployment-cost-impact-analysis.md) — a fifteen-section Rough Order of Magnitude planning estimate in the same shape as [`DHA-IRON-VEIN/docs/il5-deployment-impact-analysis.md`](https://github.com/DHA-OWHA-KM/DHA-IRON-VEIN/blob/main/docs/il5-deployment-impact-analysis.md). **Not a bid.** Every dollar figure is a planning range with its driving assumption stated beside it.

**Prepared for:** DHA / PACOM J4 program leadership, comptroller, and the supporting ISSM
**Decision sought:** Go / no-go and budget approval for fielding out of the single-folder prototype configuration into a DoW Cloud Computing SRG **Impact Level 5** environment as an **MVP**, hosted as a capability inside an already-authorised platform
**Classification ceiling priced:** CUI, **including PHI**, on IL5. IL6 (SIPR / Secret) is explicitly out of scope
**Date:** August 2026, revised against the shipped v6.5 build on 5 September 2026

### The four MVP levers

Three are standard; the fourth is specific to this system and is the reason several lines a comptroller expects come out at **zero, not small**.

1. **A very small cleared team — 2 to 3 people.** One ISSO, one to two cleared engineers, fractional government ISSM oversight, the assessor engaged once for IATT and reused for the full ATO.
2. **DISA ICAM / CAC identity inherited as a sunk cost.** ANGEL SWARM has **no authentication layer today**, so this is a greenfield adapter, not a migration: one OIDC/SAML adapter and a CAC-claim-to-role mapping onto the four shipped role profiles.
3. **Host platform inheritance.** Fielded inside the **War Data Platform** (Advana's successor) or **Maven Smart System**, inheriting the boundary, runtime, identity, SIEM, secrets, encryption, backups, monitoring and the bulk of NIST SP 800-53 Rev. 5 — an **inheritance-delta assessment**, not a full ATO.
4. **No inference spend.** Two models ship and run locally in the browser on the CPU already in the endpoint. **No AI provider, no API key, no token spend, no GPU, no inference endpoint.** No managed database and no tile service either — there is no database and no tile server.

### The counterweight

**The dominant cost is PHI.** Once the tool ingests a real casualty's photoplethysmogram, the DoW Privacy Program, a Privacy Impact Assessment and DHA clinical governance under DoDI 6025.13 arrive together — **~$1.7M most likely** — and it dominates the schedule, not the cyber work.

### Hosting

| Option | Inheritance | Verdict |
|---|---|---|
| **A — War Data Platform** (Advana's successor) | Highest | **Recommended baseline.** |
| **B — Maven Smart System** | High | Viable; the designated third-party application pipeline. |
| **C — Dedicated DHA IL5 enclave** | ~50–60% | **Not recommended for MVP** — roughly $3.6M one-time against ~$2.1M, and about a year later to first authorisation. |

### Headline figures

| Metric | Most likely |
|---|---|
| One-time — cyber and engineering | **~$2.1M** |
| One-time — PHI and clinical governance overlay | **~$1.7M** |
| Annual recurring | see §10.3 |
| Time to IATT | §9 timeline, months from contract / ATP |
| Time to full ATO | §9 timeline |
| Dedicated-enclave comparison | ~$3.6M one-time, ~1 year later |

The per-line tables — one-time costs, the PHI overlay, annual recurring, and 3- and 5-year TCO — are §10.1 through §10.4 of the analysis. The ten-row MVP risk register is §11. The STIG inheritance table, with hours by category, is §5.

### IL6 / SIPR

Out of scope and **not priced**. Movement to IL6 would still inherit platform patterns but would require TS-cleared labour uplift, SCIF facility and a self-hosted language model; the analysis estimates a delta of roughly **+30–50%** above the IL5 MVP figures and says so in one paragraph rather than pretending to a number it has not built.

### Authorities cited

DoDI 8510.01 · DoD Cloud Computing SRG · NIST SP 800-37, 800-53 Rev. 5, 800-171, 800-172 · DISA STIG library · DoDD 3000.09 ¶1.1.b · DoDI 6025.13 · Joint Trauma System CPGs. Full bibliography in §15, organised by category, with the estimated lines flagged as having no public source.

---

## Scope, honestly

- **This is a hackathon prototype on synthetic data.** The casualty stream is generated by `createWorld(seed)` from a seeded PRNG. No real casualty, unit or operation appears anywhere.
- **It has never processed protected health information,** and none of the privacy, clinical-governance or records-retention work that PHI would trigger has begun.
- **It is not accredited.** No ATO, no IATT, no interim authorisation of any kind.
- **It is not clinically validated.** The physiological deadline model is a demonstration model traceable to published Joint Trauma System guidance; it is not clinical authority and is not a basis for treatment or flight decisions.
- **The doctrine passages are summaries written for this prototype** with their source publications named. They are not extracts, and operational use requires the actual publication.
- **The Monte Carlo reports the number of replications where the system did worse**, because that number is the one worth knowing. Six of 1,400, never by more than one, four of the six in EUCOM FJORD — which still wins on its interval. Seed 42 in FJORD is one of the six and it is left in the scenario list rather than hidden.

---

## Repository map

| Path | What is in it |
|---|---|
| [`app/`](app/) | **The application.** Everything the launcher serves. |
| [`app/index.html`](app/index.html) | The single-page console. `console.html` and `design.html` are alternate shells. |
| [`app/js/`](app/js/) | Engine and interface modules. `sim.js` and `optimizer.js` are the simulation core the self-test and `winprob.mjs` load verbatim. |
| [`app/selftest.html`](app/selftest.html) | 118 assertions against the shipped engine. |
| [`app/css/`](app/css/), [`app/fonts/`](app/fonts/) | Four themes; eleven vendored woff2 faces so no paint reaches `fonts.googleapis.com`. |
| [`app/models/`](app/models/) | CRI-Net and MiniLM ONNX, with model cards beside them. |
| [`app/vendor/`](app/vendor/) | Vendored runtime: DuckDB-WASM, ONNX Runtime Web, wllama, deck.gl, ECharts, CodeMirror, µPlot. |
| [`app/data/`](app/data/), [`app/video/`](app/video/) | Basemap and doctrine JSON; the four films the app plays. |
| [`src/cmd/angelswarm/`](src/cmd/angelswarm/) | The Go launcher and the receive-only CoT telemetry listener. |
| [`src/cmd/cotsim/`](src/cmd/cotsim/) | Synthetic CoT feed generator for exercising `-cot`. |
| [`Documentation/`](Documentation/) | **The document set** — architecture, design spec, map spec, SBOM, security and ATO pathway, IL5 cost analysis, DHA alignment, doctrinal terminology, use case, win probability, changelog, and the specification inputs. |
| [`Documentation/deck/`](Documentation/deck/) | The two decks, with every slide rendered to PNG and to Markdown. |
| [`Documentation/design-decisions/`](Documentation/design-decisions/) | Four design questions put up as rendered mockups, reviewed, and decided — including the one that was rejected and why. |
| [`Documentation/verification/`](Documentation/verification/) | What you can check yourself: `winprob.mjs`, the SBOM validation record, the instrumented security measurements and their screenshots. |
| [`Documentation/CODE-MAP.md`](Documentation/CODE-MAP.md) | File-by-file reference to every source file in the tree. |
| [`Videos/`](Videos/) | The two films as standalone downloads. |
| [`train/`](train/) | CRI-Net training, MiniLM export and the training log. |
| [`design/`](design/) | The design canvases the interface was drawn in. |

### Differences from the v6.5 package

This repository is the v6.5 package, restructured and renumbered for publication as v1.0. **No application logic was modified** — the only edits inside files the application loads are comments and one label in the dependency table. The changes are:

| Change | Why |
|---|---|
| `documents/` → `Documentation/`; `deck/`, `design-decisions/`, `verification/` moved under it | One folder for every written deliverable. Nothing in the application references these paths. |
| `Videos/` added with standalone HQ copies | The application still plays its own from `app/video/`, which is unchanged. |
| A `.md` rendering created for every document and a `README.md` for every folder | So the whole repository is readable in the browser without downloading anything. |
| The eight prebuilt binaries un-ignored in `.gitignore`; `train/train.log` re-admitted | So a plain ZIP download is a working program. Reasoning is inline in `.gitignore`. |
| This `README.md` rewritten | The v6.5 README's links pointed at `OUT/`, `RESEARCH/` and `cmd/` — paths that do not exist in this layout. Preserved unchanged at [`Documentation/README-original-v6.5.md`](Documentation/README-original-v6.5.md). |
| Version renumbered to **v1.0** | Public release numbering. Applied to the current-version markers only; the recorded build history (v1.1–v6.5) is unchanged in the changelog, and `CHECKSUMS.txt` is preserved as the v6.5 package record. |
| The vendored canvas runtime is referred to as **Design Canvas** | Naming normalised across the document set, the CSS headers and the in-app dependency table. `app/support.js` itself is byte-for-byte unchanged; its SBOM entry, hash and size are unchanged. |
| `CHECKSUMS-REPO.txt` added | `CHECKSUMS.txt` records the original package paths and is preserved unchanged; this one records the repository layout. See [`CHECKSUMS.md`](CHECKSUMS.md). |

---

## License & status

**There is no `LICENSE` file in this repository yet, and that is an open decision, not an oversight.** This is US Government / DHA work, which raises 17 U.S.C. § 105 — works prepared by a federal employee as part of official duties are not subject to copyright protection in the United States, and applying an MIT or Apache header to such a work asserts a right that does not exist. Contractor-authored content is not covered by § 105. The vendored third-party components carry their own licences regardless, and two licence cells in the SBOM are genuinely unresolved. The options and the consequence of each are laid out in [`Documentation/GITHUB-PREP.md`](Documentation/GITHUB-PREP.md), decision 1.

**Publishing without a `LICENSE` file is itself a choice** — under GitHub's terms the default is all rights reserved, and no one may reuse this code. That is the loudest option, not the quietest. The recommendation in `GITHUB-PREP.md` is to ship a `LICENSE` only after DHA legal or public affairs says which case applies, and to add a `NOTICE` or `THIRD-PARTY-LICENSES` file pointing at the SBOM whatever the answer, because the third-party obligations are real and independent of the top-level choice.

**Status: NDIA Hackathon 2026 submission. A functional prototype on synthetic data. Not accredited, not clinically validated, and not for operational use.**

`UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY`
