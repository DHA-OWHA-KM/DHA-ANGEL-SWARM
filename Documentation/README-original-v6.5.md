> **Archive copy — preserved unchanged.**
>
> This is the `README.md` exactly as it shipped in the ANGEL SWARM v6.5 package on 8 September 2026, kept here as a record. It is not the repository's front page — see [`../README.md`](../README.md) for that.
>
> **Its relative links do not resolve in this repository.** It was written against the full working tree, where the documents lived in `OUT/`, the landscape research in `RESEARCH/`, the Go source in `cmd/` and the contracts at the root. In this repository those are `Documentation/`, `Documentation/`, `src/cmd/` and — in the case of `PROV_CONTRACT.md` — not published at all. Nothing below has been edited to fix that; the links are left broken on purpose, because correcting them would make this something other than the archive copy it exists to be.

---

# ANGEL SWARM

**Autonomous medical resupply tasking against physiological deadlines.**

ANGEL SWARM tasks autonomous medical resupply aircraft — whole blood, TXA, freeze-dried plasma — against wounded soldiers' **physiological deadlines** rather than by triage category and proximity. It is a decision and allocation layer, not an aircraft and not a command system: it decides which airframe flies to which casualty, and when.

`UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY`

NDIA 2026 hackathon prototype · Junayd S. Park, DHA Office of Warfighter Health Advantage · Team DHA RESCUE

---

## The result, with its conditions attached

Three arms are run against one world, under common random numbers, so they fight the **identical casualty stream** — the same soldiers wounded at the same minute with the same injuries and the same deadlines.

| Arm | | Survivable deaths | Sorties |
|---|---|---|---|
| **A** | ANGEL SWARM | **23** | 20 |
| **B** | CURRENT — TRIAGE & PROXIMITY | **34** | 38 |
| **C** | NO FORWARD DELIVERY | **35** | 0 |

**Conditions: seed 42, PACOM_CORAL, capability deployed.** That is one draw, and one draw is not a claim. Over **200 paired replications in each of seven theatres — 1,400 paired battles** — ANGEL SWARM wins **all seven**, every 95% interval excluding zero. It produced more dead in **6 of 1,400 battles (0.43%)**, and **never by more than one death**.

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

Full method, per-theatre effect sizes and the reproduction commands: [`OUT/ANGEL-SWARM-WIN-PROBABILITY-v5.9.md`](OUT/ANGEL-SWARM-WIN-PROBABILITY-v5.9.md). Every figure above was re-measured on the shipped v6.4 engine.

---

## Where this sits in what the Department has already bought

**This is built to be subsumed, not to compete.** The Department has bought, fielded and made permanent every layer around the decision this system makes, and has bought none of that decision. ANGEL SWARM is the missing tasking rule for aircraft the Services have already procured.

**The layer below — the airframes already exist and already fly themselves.** In May 2026 the 44th Medical Brigade, XVIII Airborne Corps, completed an operational validation of autonomous Class VIII aerial resupply using Soaring M25 aircraft. The aircraft are autonomous and fielded; the rule that decides which aircraft flies to which casualty is bought by no program in the portfolio. DIU's AI-Assisted Triage and Treatment Tool (25 February 2026, PROJ00628) states its scope as triage, assessment and documentation and does not buy allocation or tasking of evacuation and resupply assets; TATRC's MEDRAS portfolio funds autonomous transport, documentation and treatment across sixteen projects, and allocation is not a category in it. NAVAIR PMA-263 fields the TRV-150 through the Unmanned Logistics Systems–Air line, and the Marine Corps TRUAS variant has reached initial operational capability; its published behaviour is automated launch, waypoint navigation, automated landing and payload release. It flies the mission it is given. ANGEL SWARM produces the mission it is given. This system's airframe parameters are set **at or below** published performance for the TRV-150C, the Soaring M25 and the FVR-90 — it does not assume a better aircraft than the one that exists.

**The layer beside — sensing and documentation is being competed now.** DIU announced the AI-Assisted Triage and Treatment Tool on 25 February 2026; its stated scope is digital triage, patient assessment and documentation. It does not buy allocation or tasking of evacuation and resupply assets. ANGEL SWARM consumes what that program produces and produces an aircraft assignment — two adjacent buys, zero overlap. TATRC's MEDRAS portfolio funds autonomous transport (including just-in-time whole blood delivery by UAS), documentation and treatment across sixteen projects; **allocation is not a category in that portfolio.** Project Crimson demonstrated refrigerated FVR-90 whole-blood delivery to field medics at Project Convergence 2022, with BATDOK at the medic edge — prior art this work builds on, and four years old.

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
- **The exported health resources are FHIR-shaped, not conformance-tested,** and every exported resource carries that tag. The word "compliant" is not used anywhere.
- **STANAG 4586 is a target interface, not an implemented one.**
- **No Replicator alignment is claimed.** Replicator 1 and 2 scope is attritable combat autonomy and counter-UAS. Medical logistics is in neither.
- **No Link 16, VMF or MIL-STD-6017 compatibility is claimed.** Those are platform-to-platform tactical data links for track and fires.
- **The allocation mathematics is not claimed as novel.** Published academic work addresses military medical evacuation dispatching and redeployment directly. What is offered here is a fielded decision layer with a provenance record attached to every decision — which the published work does not provide.
- **"Swarm" here does not mean attritable strike mass.** It is a fleet of unarmed logistics aircraft carrying blood.

Sources, with a URL and a date for every claim above: [`RESEARCH/complement-landscape.md`](RESEARCH/complement-landscape.md).

---

## Running it

**A server is required.** A page opened with `file://` has an opaque origin and browsers refuse to construct Web Workers from one — and the neural network, the analytical database and the map all run in workers. The launcher serves `app/` over loopback and nothing else.

### The launcher (recommended)

Requires Go 1.24+. There are no module dependencies, so this builds offline.

```bash
go build -ldflags="-s -w" -o angel-swarm ./cmd/angelswarm
./angel-swarm                    # serves app/ on http://127.0.0.1:8787 and opens a browser
```

| Flag | Effect |
|---|---|
| `-port N` | preferred loopback port (default 8787) |
| `-no-browser` | do not open a browser window |
| `-quiet` | suppress request logging |
| `-cot ADDR` | accept CoT telemetry on a UDP address, e.g. `:6969`. **Off by default.** |
| `-cot-external` | allow that listener to bind a non-loopback interface |

With no `-cot` flag it opens exactly one socket — the loopback HTTP port — never originates an outbound request, and behaves identically with the network unplugged.

A second binary, `cmd/cotsim`, generates a synthetic CoT feed for exercising the `-cot` path: `go build -o cotsim ./cmd/cotsim`.

### Any static server

```bash
cd app && python3 -m http.server 8899 --bind 127.0.0.1
```

Works, and serves `.wasm` with the correct MIME type on Python 3.11+. You lose the CoT listener and the banner; everything in the browser is identical.

### The self-test

With a server running, open **`/selftest.html`** — e.g. `http://127.0.0.1:8787/selftest.html`. It runs **118 assertions directly against the shipped engine** (`app/js/sim.js`, `app/js/optimizer.js`), offline, in under a second, including the reference result quoted above. Last run: **118 passed, 0 failed.**

### Reproducing the headline numbers

`winprob.mjs` uses only Node builtins — no `npm install` — and loads `app/js/sim.js` and `app/js/optimizer.js` **verbatim off disk**, so there is no harness variant of the engine to disagree with.

```bash
node winprob.mjs PACOM_CORAL 200
node winprob.mjs PACOM_TIMBER 200
node winprob.mjs PACOM_BASALT 200
node winprob.mjs PACOM_MARINER 200
node winprob.mjs EUCOM_GRANITE 200
node winprob.mjs EUCOM_AMBER 200
node winprob.mjs EUCOM_FJORD 200
```

Each line prints the means, the 95% interval, Cohen's *d<sub>z</sub>*, the worse/tie/better split and the mean sortie counts. The seed-42 reference result is the `selftest.html` assertion; the tables are these seven commands.

### Optional: the Mission brief prose pane

One pane's second half uses a small language model that this repository **does not redistribute**. `./get-model.sh` (or `.\get-model.ps1`) fetches Qwen2.5-0.5B-Instruct — Apache-2.0, ~400 MB — into `app/models/llm.gguf`, once, over the internet. If you do not run it nothing breaks: the pane says the model is not installed and still shows every figure and every doctrinal passage it would have used.

---

## Scope, honestly

- **This is a hackathon prototype on synthetic data.** The casualty stream is generated by `createWorld(seed)` from a seeded PRNG. No real casualty, unit or operation appears anywhere.
- **It has never processed protected health information,** and none of the privacy, clinical-governance or records-retention work that PHI would trigger has begun.
- **It is not accredited.** No ATO, no IATT, no interim authorisation of any kind. No Authorizing Official has seen it.
- **It is not clinically validated.** The physiological deadline model is a demonstration model traceable to published Joint Trauma System guidance; it is not clinical authority and is not a basis for treatment or flight decisions.
- **The security assessment is written down and its risk register is open.** [`OUT/ANGEL-SWARM-SECURITY-AND-ATO.md`](OUT/ANGEL-SWARM-SECURITY-AND-ATO.md) is a threat model and accreditation pathway, not an accreditation artefact and not a System Security Plan. Every statement in it is bucketed MEASURED, IN PLACE or REQUIRED, and anything that is none of the three is not asserted. **Eleven residual risks are recorded and open**, including R-1 (no authentication, no identity, no access control — certain, and stated first) and R-6 (the eleven vendored typefaces carry no licence evidence). Read the register before quoting the posture.

---

## Provenance and AI marking

The standing rule on this project is that **what is presented must be true**, and the interface enforces it structurally: every figure a calculation produced carries **exactly one** mark, and the two marks are never allowed to blur.

| | AI mark | Deterministic mark |
|---|---|---|
| Means | a trained model produced this number | no model — a written rule, arithmetic, geometry, a seed, a hash or a query |
| Says | mixed-case, **names the model** | upper-case mono, leads with **NOT AI** |

Nothing that is not a set of learned weights may borrow the AI styling. Only four provenance entries are `kind:'ai'`, and adding a fifth means shipping weights. The contract is [`PROV_CONTRACT.md`](PROV_CONTRACT.md).

**Two model files ship, and no language model weights ship.**

| | CRI-Net | all-MiniLM-L6-v2 (int8) |
|---|---|---|
| File | `app/models/ppg_cri.onnx` (420 KB) | `app/models/minilm/minilm.onnx` (22.9 MB) |
| Licence | **NOASSERTION** — trained in this repository, no licence file written | **Apache-2.0** |
| Provenance | Synthetic cohort. Waveform morphology follows the published response of the peripheral pulse to central volume loss; no patient data was used. | Obtained via npm `@lat.md/embed-minilm-fp16`, then converted and dynamically quantised to int8 here — **not** from huggingface.co, which was unreachable from the build sandbox. That package is not in `package-lock.json`, so its integrity hash cannot be produced from this repository. **An open supply-chain item.** |

No language model is loaded in the shipped build, so nothing in the interface is generated prose — every figure is computed from the run's own state. The optional Qwen fetch above is the one exception and it is opt-in, marked, and not redistributed here.

Every shipped component is enumerated, digested and graded **VERBATIM / REBUNDLED / UNVERIFIED / SUPPORTING** in the CycloneDX 1.6 SBOM: [`OUT/ANGEL-SWARM-SBOM.md`](OUT/ANGEL-SWARM-SBOM.md) and [`.json`](OUT/ANGEL-SWARM-SBOM.json). Two licence cells are genuinely unresolved — the eleven vendored typefaces and the MiniLM acquisition route — and both are named there rather than papered over.

---

## Repository map

| Path | What is in it |
|---|---|
| `app/` | **The application.** Everything the launcher serves. |
| `app/index.html` | The single-page console. `console.html` and `design.html` are alternate shells. |
| `app/js/` | Engine and interface modules. `sim.js` and `optimizer.js` are the simulation core the self-test and `winprob.mjs` load verbatim. |
| `app/selftest.html` | 118 assertions against the shipped engine. |
| `app/css/`, `app/fonts/` | Four themes; eleven vendored woff2 faces so no paint reaches `fonts.googleapis.com`. |
| `app/models/` | CRI-Net and MiniLM ONNX, with model cards beside them. |
| `app/vendor/` | Vendored runtime: DuckDB-WASM, ONNX Runtime Web, wllama, deck.gl, ECharts, CodeMirror, µPlot. |
| `app/data/`, `app/video/` | Basemap and doctrine JSON; the four films the app plays. |
| `cmd/angelswarm/` | The Go launcher and the receive-only CoT telemetry listener. |
| `cmd/cotsim/` | Synthetic CoT feed generator for exercising `-cot`. |
| `OUT/` | **The document set** — architecture, design spec, map spec, SBOM, security and ATO pathway, IL5 cost analysis, DHA alignment, doctrinal terminology, use case, win probability, changelog. |
| `SPEC/`, `DESIGN/` | Specification inputs and design source. |
| `RESEARCH/` | Landscape research with sources, and the GitHub preparation notes. |
| `train/` | CRI-Net training and MiniLM export scripts. |
| `tools/`, `icons/` | Build helpers and the icon set with its licences. |
| `*.mjs` at root | Reproduction and measurement harnesses. `winprob.mjs` is the one the documents cite for the win table; `_sbom_gen.mjs` and `_sbom_validate.mjs` generate and check the SBOM. |
| `*_CONTRACT.md` at root | The rules the code is held to: provenance, roles, theme. |

Development scratch — screenshots, visual-regression output, release archives, backups, prebuilt binaries and dependencies — is excluded by `.gitignore`. See [`RESEARCH/GITHUB-PREP.md`](RESEARCH/GITHUB-PREP.md) for what was excluded and why, and for the decisions still open.

---

## Licence

**There is no `LICENSE` file in this repository yet, and that is an open decision, not an oversight.** This is US Government / DHA-adjacent work, which raises 17 U.S.C. § 105; the vendored third-party components carry their own licences; and two licence cells in the SBOM are unresolved. The options and the consequence of each are laid out in [`RESEARCH/GITHUB-PREP.md`](RESEARCH/GITHUB-PREP.md). **Publishing without a `LICENSE` file is itself a choice** — under GitHub's terms the default is all rights reserved, and no one may reuse this code.
