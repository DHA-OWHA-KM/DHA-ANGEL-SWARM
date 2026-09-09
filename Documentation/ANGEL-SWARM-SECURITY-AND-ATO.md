# ANGEL SWARM — Threat Model and ATO Pathway

**System:** ANGEL SWARM — autonomous medical resupply tasking against physiological deadlines
**Prepared for:** the supporting ISSM/ISSO, the prospective Authorizing Official, and the security assessor who will meet this code first
**Document type:** Threat model and accreditation pathway. **It is not an accreditation artefact and it is not a System Security Plan.** It is the input a program would use to write one.
**Companion document:** `OUT/ANGEL-SWARM-IL5-deployment-cost-impact-analysis.md` — the cost and schedule case. This document does not restate it, does not contradict it, and defers to it on every dollar figure and every date.
**Companion artefacts:** `OUT/ANGEL-SWARM-SBOM.json` / `.md` (CycloneDX 1.6), `app/selftest.html` (live result measured 9 September 2026: 196 total checks covering engine and host UI behavior; 195 pass and 1 fail; RESUPPLY TRACKING is 12/12 passing; the sole failure is the EUCOM_FJORD nominal seed-42 directional assertion, 16 > 15), `OUT/sec/verification.txt` (the measurement record behind §2).
**Date:** 9 September 2026. **Re-verified 4 September (§2.0), 5 September against v6.4 (§2.0b), and again 5 September against v6.5 (§2.0c); the Resupply Tracking boundary analysis was added 9 September (§2.2) without claiming a new instrumented run.** The body below is the 28 August assessment; where a measurement has been retaken, the later section says so and takes precedence.
**Classification:** UNCLASSIFIED // PUBLIC RELEASE // SYNTHETIC DATA // FOR DEMONSTRATION ONLY.

---

## 0. How to read this

Security documents about prototypes fail in one of two directions. They either claim properties the prototype does not have, or they retreat into "it's only a prototype" and claim nothing at all. This document tries to do neither, by splitting every statement into three buckets and never letting them blur:

| Bucket | What it means | Where it appears |
|---|---|---|
| **MEASURED** | Verified on this build by an instrumented run, and the measurement is in `OUT/sec/verification.txt` with the method stated. | §2 |
| **IN PLACE** | A design property of the code as written, readable in the file cited. Not the same as tested against an adversary. | §4, middle column |
| **REQUIRED** | Not present. Would have to exist before an operational deployment, and is priced or scoped in the IL5 analysis. | §4, right column; §6 |

Anything that is none of the three is not asserted.

---

## 1. What the system is, in security terms

Strip away the mission and ANGEL SWARM is an unusual shape for a defence application, and the shape is what most of its security posture comes from:

- **There is no server-side application.** One static Go binary (`CGO_ENABLED=0`, standard library only, empty `go.sum`) serves a folder of files over HTTP on `127.0.0.1` and refuses any peer that is not loopback.
- **All computation is client-side.** The simulation engine, the allocator, the audit chain, the SQL analytics (DuckDB-WASM), the map, and both ONNX models run in the browser tab and its Web Workers. There is no API tier, no application server, no database server, no session and no user store.
- **There is no identity layer at all today.** The four role profiles — Commander, Logistician, Surgeon, Analyst — are a display-and-workflow concept, persisted in `localStorage`, not an access-control boundary. This is stated plainly because an assessor will find it in ten minutes and because the IL5 analysis prices the fix as greenfield DISA ICAM federation rather than a migration.
- **There is exactly one server-side input path**, and it is off by default: the receive-only Cursor on Target (CoT) UDP listener in `cmd/angelswarm/telemetry.go`, enabled only with `-cot`, bound to loopback unless `-cot-external` is *also* passed, never replying, with an 8,192-byte bound on any datagram it will read.
- **The data is synthetic.** No protected health information has ever been processed by this system.

The consequence for a threat model is that the classical web attack surface — authentication bypass, session fixation, SQL injection against a server, SSRF, privilege escalation across tenants — is largely *absent rather than mitigated*, and the risk concentrates instead in three places that are unusual: **the supply chain of a large vendored WebAssembly tree**, **the integrity of artefacts that execute in the browser**, and **the trustworthiness of the decision record**.

---

## 2. What is demonstrably true today (MEASURED)

Every row below was measured on this build on 8 September 2026 by an instrumented headless Chromium run that intercepted **every** request at the browser, not sampled from a proxy log. The full record is `OUT/sec/verification.txt`; the harness is `_sec_verify.mjs`.

| Property | Measurement | Result |
|---|---|---|
| **No network egress** | All 13 navigation destinations exercised, plus tactical 3D, the DuckDB SQL terminal, the CRI-Net sensor screen and the doctrine retrieval screen — every path that pulls a WebAssembly module or an ONNX model. Every request logged. | **121 requests, 1 distinct origin (`http://127.0.0.1:8791`), 0 off-origin.** |
| **No off-origin request from the self-test page either** | `selftest.html` loaded in the same browser context and run to completion. | **0 off-origin.** |
| **No telemetry to an external endpoint** | Static scan of the shipped tree for `fetch`/`XMLHttpRequest`/`import()`/`new Worker`/`src=`/`href=` against an `http(s)://` literal. | **No match in first-party code.** Every `https://` string in the application's own JavaScript is a citation or a comment. The one exception is `app/support.js`, the vendored canvas runtime, which holds SRI-pinned CDN URLs on a fallback path that this build never reaches — read §2.1 before quoting this row. |
| **Loopback binding only** | `cmd/angelswarm/main.go:111` binds `127.0.0.1:<port>`; the handler at `main.go:180` additionally rejects any peer whose `RemoteAddr` is not loopback with 403. | Belt and braces, in code. |
| **No third-party Go code** | `go.sum` is empty; every import in `cmd/angelswarm/` and `cmd/cotsim/` is Go standard library. | **Zero** third-party server-side dependencies. |
| **Static, CGO-free binaries** | `go version -m ANGEL-SWARM-linux-x64` reports `CGO_ENABLED=0`, `-trimpath=true`, `-buildmode=exe`, `compiler=gc`, toolchain `go1.24.7`. | Four platform binaries, digests in the SBOM. |
| **No build-time or run-time network fetch of a dependency** | Everything the browser loads is under `app/`. Digest comparison in the SBOM shows the DuckDB WASM module, the DuckDB worker, all three ONNX Runtime Web artefacts and the wllama WASM module are **byte-identical** to the published npm packages. | Reproducible from the registry without trusting this build. |
| **No browser storage of casualty data** | After the full run: `localStorage` contained exactly one key, `angel.mapMode`. No cookies. No IndexedDB databases. No service worker. | The other `localStorage` keys the code can write (`angel.theme`, the role, the command-palette MRU, the inspector fold state, `angel.audio.level`) are all UI preferences. **No casualty record, no telemetry reading and no decision is persisted to the browser.** |
| **Synthetic data only** | The casualty stream is generated by `createWorld(seed)` in `app/js/sim.js` from a seeded PRNG. CRI-Net was trained on a synthetic cohort (`app/models/ppg_cri.meta.json`). | No PHI has ever entered the system. |
| **The engine does what it claims** | `app/selftest.html` — live result measured 9 September 2026: **196 total checks covering engine and host UI behavior; 195 pass and 1 fail**, with engine files loaded as plain scripts. **RESUPPLY TRACKING is 12/12 passing**; the sole failure is the **EUCOM_FJORD nominal seed-42 directional assertion (16 > 15)**. | Includes the reference result, determinism, conservation invariants, cold-chain enforcement, range gating, audit-chain tamper evidence, and standalone tracker checks. |
| **The reference result is stable** | seed 42 / JOA CORAL / deployed. | **23 / 34 / 35** survivable deaths on **20 / 38 / 0** sorties — the published figures. |

### 2.0 Re-verified on the current build, 8 September 2026

The measurements above were taken on 28 August. The application has changed
since — a fourth map scale, a route-stage strip, a guided walkthrough — and
the network posture was re-measured rather than assumed:

| Property | Measurement | Result |
|---|---|---|
| **No network egress, all four map scales** | All thirteen destinations exercised, then the Theater Map cycled through `GLOBE`, `THEATRE`, `TACTICAL 2D` and `TACTICAL 3D` at 1680×1050 and 1280×800, with every request intercepted at the browser | **0 off-origin requests, 0 uncaught page errors**, at both viewport sizes |
| **The new globe adds no asset and no request** | The globe's world coastlines and international boundaries are **embedded in `app/js/theater3d.js` as integer deltas** — generated offline from the `world-atlas` package. There is no new file to fetch and no new fetch to make. *(The geometry was 46,744 bytes when this was measured; it was regenerated at 223,486 bytes in v6.4 and the property is unchanged — see §2.0b)* | **No new HTTP resource on any path** |
| **The globe holds no GPU context** | It is canvas 2D. deck.gl's `GlobeView` is not in the vendored bundle — twelve exports, `Deck`, `MapView` and ten layers | The application still creates exactly **two** WebGL2 contexts, and both are released and recoverable |
| **Historical 8 September engine run** | `app/selftest.html` re-run in the same browser context for this dated measurement | **118 assertions were recorded at that time.** This is preserved historical evidence, not the current suite total; the live result measured 9 September 2026 is 196 total checks covering engine and host UI behavior, 195 pass and 1 fail, with RESUPPLY TRACKING 12/12 passing and the EUCOM_FJORD nominal seed-42 directional assertion (16 > 15) as the sole failure |
| **The reference result is unchanged** | seed 42 / JOA CORAL / deployed | **23 / 34 / 35** survivable deaths on **20 / 38 / 0** sorties, 125 casualties, 47 in the survivable cohort |
| **The SBOM was regenerated against the changed files** | `_sbom_gen.mjs` re-run; the map host and all five map renderers are now digested components in their own right, because the globe's geography ships **inside** one of them and a bill of materials that omits the file omits the data | **49 components**, every hash re-measured off disk, schema-validated against CycloneDX 1.6 |

### 2.0b Re-verified again on the v6.4 build, 8 September 2026

The globe's geography was regenerated at **4.18× the vertex count** on 5
September, its rotation and its zoom handoff were rebuilt, the panel scroll
containers were collapsed and the route-stage strip became click-to-open. None
of that touches the engine, and none of it was allowed to touch the network
posture. Both were re-measured rather than assumed.

| Property | Measurement | Result |
|---|---|---|
| **Four map scales, still four** | The scale switch enumerated off the running v6.4 build at 1680×1050 | `GLOBE` · `THEATRE` · `TACTICAL 2D` · `TACTICAL 3D`, with **3 / 3 / 6 / 5** controls respectively and no control drawn that cannot act at its scale |
| **No network egress** | Every request intercepted at the browser across the map destination at 1680×1050, including the enlarged globe | **0 off-origin requests, 0 uncaught page errors** |
| **The enlarged globe still adds no asset and no request** | The world outline grew from 46,744 to **223,486 bytes** — 1,380 coast rings and 174 boundary runs, **34,416 vertices** — and remains **source text inside `app/js/theater3d.js`** (now 443,996 bytes on disk), not a file | **No new HTTP resource, and no new fetch on any path.** Counted by parsing the two array literals out of the shipped file |
| **The globe still holds no GPU context** | Still canvas 2D. `GlobeView` is still absent from the vendored deck.gl bundle — twelve exports, `Deck`, `MapView` and ten layers | The application still creates exactly **two** WebGL2 contexts. Four times the geography added a rasterisation cost, not a context |
| **Historical v6.4 engine run** | `app/selftest.html` re-run against the v6.4 build, headless, offline | **118 assertions were recorded at that time, with 833 ms, 0 off-origin requests and 0 page errors recorded.** This is preserved historical evidence, not the current suite total; the live result measured 9 September 2026 is 196 total checks covering engine and host UI behavior, 195 pass and 1 fail, with RESUPPLY TRACKING 12/12 passing and the EUCOM_FJORD nominal seed-42 directional assertion (16 > 15) as the sole failure |
| **The reference result is unchanged** | seed 42 / JOA CORAL / deployed, asserted by the self-test itself | **23 / 34 / 35** survivable deaths on **20 / 38 / 0** sorties |
| **The SBOM was regenerated against the v6.4 files** | `_sbom_gen.mjs` re-run, then `_sbom_validate.mjs` against the CycloneDX 1.6 JSON Schema under ajv 8 with formats enforced | **49 top-level components and 38 nested file sub-components; VALID.** Every one of the **58** file digests in the document re-verified by re-hashing the file on disk: **58 of 58 match**, sizes included |

**One finding worth recording rather than smoothing over.** Before that
regeneration, **five digests in the shipped SBOM were stale** — `app/index.html`,
`app/design.html`, `app/angel-map.js`, `app/js/theater3d.js` and
`app/js/geo3d.js` had all changed in v6.4 while the bill of materials still
carried their v6.3 hashes and sizes. An SBOM whose digests do not match the
shipped bytes is worse than no SBOM, because §6 R-3 proposes verifying artefacts
*against these values* at load. It is corrected, and the lesson is in R-3:
regenerating the SBOM has to be a release step, not a periodic one.

**What did not change, and is deliberately not claimed to have.** No risk in §6
is closed by v6.4. The dormant CDN fallback (**R-2**) is still dormant rather
than forbidden; there is still no load-time integrity check (**R-3**); the
REBUNDLED and UNVERIFIED supply-chain rows are unchanged (**R-4**); the MiniLM
acquisition route (**R-5**) and the font licences (**R-6**) are exactly where
they were. v6.4 was six interface defects and one architectural seam; none of
them was a security control.

**The doctrine-badging entry (R-11) is the exception, and it is corrected in
§2.0c below.** When this section was written on 5 September it repeated R-11 as
open. That was wrong: the two badges it describes had already been replaced in
v6.3. The error was in this document, not in the build.

### 2.0c Re-verified on the v6.5 build, 8 September 2026 — and one finding against this document

v6.5 changed no engine code and no security control. `app/js/sim.js`,
`app/js/optimizer.js` and `app/angel-engine.js` are byte-identical to v6.0,
v6.3 and v6.4. At that historical v6.5 verification, the self-test returned
118 of 118. The zero-off-origin
property is unchanged: `app/index.html` contains no `fetch(` call at all.

**R-11 is closed, and this document was the last place still asserting it.**
The risk as written says two surfaces in the design application badge a
term-overlap score with `all-MiniLM-L6-v2` and print `161 passages`. Measured
against the shipped build:

| Surface | R-11 asserted | Actually shipped |
|---|---|---|
| Analyst Terminal → Doctrine | `✦ all-MiniLM-L6-v2 · 161 passages` | `TERM OVERLAP · NO MODEL ON THIS PATH` (`app/index.html:951`), no ✦ |
| Ask ANGEL → doctrine answers | `✦ MiniLM RETRIEVAL` | `DOCTRINE · QUOTED VERBATIM, NOT GENERATED`, `ai: false` (`app/index.html:4415`) |

Both were corrected in v6.3. R-11 survived in this register for two revisions
because a risk register is written once and re-read rarely, which is itself the
finding: **a register entry that outlives its defect is a false claim in the
same way an unmarked model output is.** It is recorded here rather than quietly
deleted.

Two residual misattributions were found on the same sweep and fixed in v6.5,
both in the Sensor & Model build inventory rather than on a provenance badge:
the doctrine corpus row credited `Analyst Terminal → Doctrine, Ask ANGEL
citations` as its consumer, and the Ask ANGEL side panel's `WHERE MiniLM RUNS`
row named Analyst Terminal. The design application makes **no HTTP request of
any kind** and therefore loads neither the corpus nor the encoder; both belong
to the analyst console (`app/console.html`, via `app/js/doctrine.js`). Both
strings now name the analyst console.

One terminology defect was also closed in v6.5: `app/console.html` still
carried seven occurrences of the superseded arm name after the global overhaul
reached `app/index.html`. It now carries none. The remaining occurrence in the
build is a prose code comment in `app/angel-map.js` and is not rendered.

### 2.1 One measured caveat, stated before anyone else finds it

The measurement above says **zero off-origin requests were made**. It does not say **no code path exists that could make one**.

`app/support.js` — the Design Canvas runtime, which is third-party code this project vendors rather than authors — contains a CDN fallback at lines 1142–1149 and 1838–1846: `https://unpkg.com/react@18.3.1/...`, `.../react-dom@18.3.1/...` and `https://unpkg.com/@babel/standalone@7.29.0/babel.min.js`, each with a Subresource Integrity hash. `loadReactUmd()` short-circuits when `window.React` already exists, which it does because `app/index.html` loads the two vendored React files first, on purpose, with a comment saying exactly that. `ensureBabel()` fires only for an external module needing a JSX transform, and this application registers none.

So the path is **dormant, not deleted**, and it is dormant because of load order rather than because of a policy. It is measured at zero and it should be *enforced* at zero. That is a one-line Content Security Policy on the Go handler and it is the single cheapest security improvement available to this system (§6, R-2).


### 2.2 Resupply Tracking — no new boundary in this release

Resupply Tracking is a standalone synthetic capability demonstration. It owns
immutable tracker-only commitments, a deterministic clock, seek, play/pause, a
tracker-owned normal/8× playback toggle (`SPEED ×8` / `SPEED ×1`), reroute and
exception controls, a margin-sorted queue, a Canvas 2D schematic and an Arm B
scheduled-push comparison state. Its nominal, diverted, aborted, lost, deadline-miss,
cold-chain-failure and delivered states are fixtures; names, times, routes and
payloads cannot be treated as operational output. It does not read engine tasking,
scenarios, casualties, host playback, run snapshots, fleet history or Arm B ledgers,
does not run a model, and does not modify engine state or outcomes. The speed
toggle changes only the tracker's deterministic clock, never host playback or
engine state.

The schematic is local and the destination has no network interface or request. The
control labelled `Send to medic's ATAK` opens an informational, future-only modal
and emits nothing. **No BATDOK-J, ATAK, TAK Server, Marti REST or outbound CoT
integration exists, and “CoT is ingested, not emitted” remains true.** The STRIDE
rows and residual-risk register for the shipped boundary are unchanged.

The proposed path would not be a cosmetic follow-on. Emitting assignment, casualty grid, aircraft position, estimate and deadline would create **TB8: browser tasking state → tactical recipient** and add at least two threat cases: a spoofed commitment that misdirects a receiver, and a replayed or stale estimate that presents an expired route as current. Operational design would require authenticated sender identity, authorization, integrity and replay protection, bounded cadence and staleness, delivery/audit semantics, endpoint validation against the actual TAK deployment, and an explicit EMSEC determination. Mutual TLS protects content in transit; it does not hide that a casualty and inbound aircraft are emitting. None of those controls is claimed to exist here.

---

## 3. Assets, actors and trust boundaries

### 3.1 Assets

| # | Asset | Why an adversary cares | Sensitivity today | Sensitivity fielded |
|---|---|---|---|---|
| A1 | **Casualty records** — identity, grid position, triage class, injury pattern, physiological deadline, responder tier, unit | Individually a wounded soldier. In aggregate, in near-real time, over a named joint operations area: **casualty rates and force disposition**. | Synthetic | **CUI / PHI**, and the aggregation argument makes it worse than the sum of its rows |
| A2 | **Tasking decisions and the escalation queue** | Where the aircraft are going is where the casualties are. Corrupting the ordering kills people slowly and deniably. | Synthetic | CUI, mission-critical integrity |
| A3 | **The audit chain** — hash-linked decision log (`app/js/optimizer.js`) | It is the evidence in any after-action review, investigation or inquiry. Its value is entirely in being unforgeable. | Demonstration | CUI, **integrity is the whole point** |
| A4 | **The two ONNX models** — CRI-Net (104,162 params) and all-MiniLM-L6-v2 int8 | CRI-Net's output is a sort key in the allocator. Move it and you move who gets served first. | Prototype weights | Mission-critical integrity |
| A5 | **The engine** — `sim.js`, `optimizer.js`, `angel-engine.js` | The allocator *is* the capability. Modifying it is the highest-leverage attack in the system. | — | Mission-critical integrity |
| A6 | **The vendored dependency tree** — ~60 MB of JavaScript and WebAssembly | The largest quantity of code in the build that this project did not write. | — | Supply-chain risk concentrates here |
| A7 | **Class VIII stock and launch-point laydown** | Where the blood is and where the aircraft launch from is a targeting product. | Synthetic | CUI, potentially higher in aggregate |
| A8 | **Exported data products** (`app/js/dataproducts.js`) — FHIR-shaped bundles, decision records, run results | The moment data leaves the tab it leaves this system's control entirely. | Synthetic | **PHI on export**; retention and marking obligations attach |
| A9 | **The launcher binary and its embedded asset tree** | Replace the binary and you own everything above. | — | Integrity of the delivered artefact |
| A10 | **The CoT ingest path** (when enabled) | The only unauthenticated input from outside the machine. | Off by default | The one place SC-7 genuinely bites |

### 3.2 Actors

| Actor | Capability assumed |
|---|---|
| **Operator** (Commander / Logistician / Surgeon / Analyst) | Full local access to the tab. **No authentication distinguishes them today.** |
| **Adversary on the tactical network** | Can inject, replay, drop or delay CoT datagrams; can jam GPS and SATCOM; can observe emissions. Cannot break loopback. |
| **Adversary with local access to the endpoint** | Can read and modify files in the served folder, replace the binary, or attach a debugger. |
| **Supply-chain adversary** | Can compromise an upstream npm package, a registry, or the build host, before the artefact is vendored. |
| **Insider** | Legitimate operator acting outside authority — a wrong approval, a suppressed escalation, a selective export. |

### 3.3 Trust boundaries

```
  [ physiological source / medic interface ]
            │  CoT XML over UDP  ── TB1 ── UNAUTHENTICATED, UNENCRYPTED in this build
            ▼
  ┌────────────────────────────────────────────────┐
  │ angelswarm (Go, static, stdlib only)           │
  │   ├─ CoT listener  (off unless -cot;           │
  │   │   loopback unless -cot-external;           │
  │   │   receive-only; 8,192-byte bound)  ── TB2 ─┼─ parser → SSE hub
  │   └─ static file handler, 127.0.0.1 only,      │
  │      non-loopback peers 403                    │
  └───────────────┬────────────────────────────────┘
                  │  HTTP over loopback  ── TB3 ── the only network hop
                  ▼
  ┌────────────────────────────────────────────────┐
  │ browser tab (same origin)                      │
  │   index.html → sim.js / optimizer.js /         │
  │   angel-engine.js / models / vendor tree       │
  │        │                                       │
  │        ├── TB4 ── Web Workers (mc.worker.js,   │
  │        │          DuckDB, ONNX Runtime)        │
  │        └── TB5 ── operator: screen, and export │
  │                   of data products to disk     │
  └────────────────────────────────────────────────┘

  TB6 ── build host → vendored artefact tree (supply chain; see the SBOM)
  TB7 ── machine proposes → human authorises (the escalation queue)
```

**The important observation about this diagram:** TB3 is the only network hop in the default configuration, and it never leaves the machine. TB1 does not exist unless an operator passes two separate flags. Everything else is an in-process or in-browser boundary. That is a genuinely small boundary argument, and §8 explains why an assessor should still not accept it without an SC-7 assessment of TB1.

The diagram is intentionally product-neutral. **Sempulse Halo (example)** is an
example physiological source, **CipherOx CRI M1 (reference)** is reference context
for the compensatory-reserve operating principle, and **BATDOK-J** remains a separate
plausible producer/interface. ANGEL SWARM has not tested integration with a real
Sempulse Halo, CipherOx CRI M1 or BATDOK-J and claims no compatibility, military
fielding, FDA or other regulatory status for any named relationship, or completed
integration. Its listener remains receive-only and off by default, and its medical
CoT extension is not ratified.

---

## 4. Threat model — STRIDE

STRIDE is used because it is the frame a DoD assessor will recognise, and because this system's threats really do cluster by category rather than smearing across it. Each row separates **what is in place today** from **what is required before an operational deployment**. NIST SP 800-53 Rev. 5 control identifiers are given for the required column so the rows map straight into an SSP.

### 4.1 Spoofing

| # | Threat | Assets | IN PLACE today | REQUIRED before operational deployment |
|---|---|---|---|---|
| S-1 | **Any local process or user can act as any role.** There is no login; the role is a `localStorage` string. | A1, A2, A3 | Nothing. The loopback bind and the non-loopback 403 mean only a local user can reach it at all — that is containment, not authentication. | CAC/PIV via DISA ICAM federation; role bound to CAC claims. **IA-2**, **IA-2(1)**, **IA-2(12)** (PIV credentials), **IA-5**, **IA-8**, **AC-2**, **AC-3**. Priced in the IL5 analysis §6.1 as greenfield. |
| S-2 | **A forged CoT datagram claims to be a casualty's monitor.** CoT carries no per-message authentication in this build. | A1, A10 | The listener is off by default; when on it binds loopback unless a second flag is passed. The parser is bounded and never replies. | Message-level authentication or a mutually authenticated transport for the ingest path; source allow-listing; rate limiting. **SC-8**, **SC-8(1)**, **SC-23**, **IA-3**, **IA-9**, **SI-10**. This is the single largest unmitigated spoofing exposure once `-cot-external` is used. |
| S-3 | **A replaced binary or asset folder impersonates the system.** | A9, A5, A6 | Nothing in the running artefact. Digests exist in the SBOM but are not checked at load. | Code signing of the four binaries; a signed asset manifest; load-time hash verification of both ONNX artefacts and every WASM module. **CM-14** (Signed Components), **SI-7**, **SI-7(1)**, **SI-7(6)**, **SR-11** (Component Authenticity). The IL5 analysis carries this under client-side integrity, §5. |

### 4.2 Tampering

| # | Threat | Assets | IN PLACE today | REQUIRED |
|---|---|---|---|---|
| T-1 | **Alteration of the decision record after the fact.** | A3 | **Real and demonstrable.** `optimizer.js` chains every entry as SHA-256 (FIPS 180-4) over `prev + '|' + payload`; `verifyAudit()` recomputes the whole chain; the CSV export carries the full 64-character digest so it can be recomputed offline. The self-test proves the property rather than asserting it: mutate one entry's detail and verification fails **at exactly that sequence number**, and the chain head changes. See §5.3. | The chain is *tamper-evident*, not *tamper-proof*: an attacker who can rewrite every subsequent entry can rewrite the chain. A fielded system needs the head anchored somewhere the attacker does not control — mirrored to the platform audit store on a cadence, per the IL5 analysis §6.8. **AU-9**, **AU-9(2)**, **AU-9(3)**, **AU-10** (Non-repudiation), **AU-11**. |
| T-2 | **Modification of the allocator to change who is served.** The highest-leverage attack in the system: it needs no privilege escalation, produces plausible output, and leaves the audit chain internally consistent because the chain records the decisions actually made. | A5, A2 | The engine is plain files on disk with no integrity check. `app/selftest.html` will *detect* a functional change — the reference result and the invariants are asserted — but only if someone runs it, and an attacker who edits the engine can edit the test. | Signed asset manifest verified by the launcher before serving; the self-test run as a release gate in CI rather than on demand. **SI-7**, **CM-5**, **CM-14**, **SA-11**. |
| T-3 | **Model weight substitution or poisoning.** | A4 | Nothing at run time. Provenance is documented (§5.2) and now digested in the SBOM. | Load-time digest verification against the SBOM values; provenance attestation for the acquisition route. **SI-7**, **SR-4** (Provenance), **SR-11**. See §5.2. |
| T-4 | **Compromise of a vendored dependency before it is vendored.** | A6 | Partial and now *stated*: seven of the vendored files are byte-identical to the published npm artefacts and can be re-derived from the registry. The rest are esbuild re-bundles whose digests cannot be checked that way. The SBOM labels every file VERBATIM / REBUNDLED / UNVERIFIED / SUPPORTING rather than blurring them. | Reproducible bundling; SSDF (**NIST SP 800-218**) attestation; SCA scanning of the SBOM; supplier review. **SR-3**, **SR-4**, **SR-5**, **SR-6**, **SR-11**, **SA-15**, **PM-30**. See §5.1. |
| T-5 | **Injection through the CoT parser.** | A10 | The datagram is size-bounded at 8,192 bytes and the XML decoder is fed a fixed slice rather than a stream. Go's `encoding/xml` is memory-safe. | Fuzzing of the parser; schema validation; explicit rejection of XML external entities and of unbounded nesting. **SI-10**, **SI-16**, **SA-11(8)**. |
| T-6 | **Cross-site scripting into the page.** | A1, A2 | No third-party content is embedded and no remote script is loaded (measured, §2). The application never renders untrusted HTML. | A Content Security Policy header from the launcher, with `script-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`. **SC-18** (Mobile Code), **SI-10**. This also deterministically closes §2.1. |

### 4.3 Repudiation

| # | Threat | Assets | IN PLACE today | REQUIRED |
|---|---|---|---|---|
| R-1 | **An operator denies having approved a tasking.** | A3 | Every proposal, approval, rejection, expiry, auto-dispatch, waste event and treatment is written to the chain with a timestamp, an actor string and named escalation grounds. `launch()` refuses to record an unattributed sortie: it stamps `STANDING AUTHORITY` where no operator acted. | The actor string is **whatever the caller passed**, because there is no identity. Non-repudiation is impossible without S-1 being fixed first. **AU-10** depends on **IA-2**. |
| R-2 | **The record does not survive the tab.** | A3 | The chain is exportable, with whole digests, from the Evidence screen. | Automatic mirroring to the platform audit store; a records-retention determination (the decision log is itself a PHI repository once fielded, per the IL5 analysis §2.2). **AU-4**, **AU-11**, **SI-12**. |

### 4.4 Information disclosure

| # | Threat | Assets | IN PLACE today | REQUIRED |
|---|---|---|---|---|
| I-1 | **Exfiltration by the application itself.** | A1, A7 | **Measured at zero.** 121 requests, one origin, no egress. No telemetry endpoint exists in the code. | CSP `connect-src 'self'` to make it enforced rather than observed; egress monitoring at the platform boundary. **SC-7**, **SC-7(4)**, **SC-7(5)**, **AC-4**. |
| I-2 | **Data at rest on the endpoint.** | A1, A8 | Nothing casualty-related is written to browser storage (measured: one key, `angel.mapMode`). Exports are user-initiated and go where the user puts them. | Full-disk encryption on the endpoint (platform-inherited); marking and handling on export; a minimum-necessary analysis. **SC-28**, **MP-6**, **SI-12**, and the DoW Privacy Program obligations the IL5 analysis prices in §10.2. |
| I-3 | **Aggregation.** Individually a pulse waveform and a blood inventory are sensitive; together, in near-real time over a named JOA, they describe force disposition and casualty rates. | A1, A7 | Nothing — this is a categorisation problem, not a code problem. | Make the aggregation argument explicitly at RMF Step 1, which the IL5 analysis already does (§8, Categorize: Moderate/Moderate/Moderate with the aggregation argument stated). **RA-3**, **PL-8**. |
| I-4 | **Emissions from the ingest path.** | A10 | The listener never transmits, so it is not itself an emitter. | EMCON discipline is a network property, not an application one; state it as an assumption on the hosting environment. **SC-7**, **PE-19**. |

### 4.5 Denial of service

| # | Threat | Assets | IN PLACE today | REQUIRED |
|---|---|---|---|---|
| D-1 | **GPS / SATCOM / datalink denial — the adversary's cheapest move, and the one this system is actually built for.** | A2 | **This is modelled, not hand-waved.** Every scenario carries a scheduled datalink-denial window (JOA CORAL: 12 minutes at T+88; JOA AMBER: 18 minutes at T+44; and so on). While the link is down `stepArm()` stops tasking, telemetry buffers on the soldier's own device (`teleHeld`), and ground events buffer on the aircraft and land with it — each event carrying both the time it happened and the time it arrived, so the record never pretends knowledge it did not have. The Monte Carlo `comms` lever multiplies the duration of every outage, and the self-test asserts that lever changes the outcome. | Degraded-mode behaviour written into the ICD as **acceptance criteria**, with an acceptance suite run on every release. The IL5 analysis makes exactly this point (§6.7) and calls it a design constraint rather than a caveat. **CP-2**, **CP-10**, **SI-13**, **SI-17**. |
| D-2 | **Datagram flood against the CoT listener.** | A10 | Off by default; loopback unless a second flag; bounded buffers (`hubBuffer` 256, `subBuffer` 64); oversized datagrams dropped unread. | Rate limiting and source allow-listing at the listener; network-layer protection at the boundary. **SC-5**, **SC-7**. |
| D-3 | **Resource exhaustion in the browser.** The heaviest asset is a 35.7 MB WebAssembly module; the Monte Carlo spawns a worker pool. | A5 | Workers are bounded by the pool driver; the proposal queue is capped at 400 entries (asserted in the self-test) and the ground stream at 4,000. | Endpoint sizing; browser STIG reconciliation for WebAssembly and Web Workers — the unusually heavy row in the IL5 analysis §5. **SC-5(2)**, **SC-6**. |

### 4.6 Elevation of privilege

| # | Threat | Assets | IN PLACE today | REQUIRED |
|---|---|---|---|---|
| E-1 | **There is no privilege to elevate.** Any local user has every capability. | all | The loopback bind and non-loopback rejection contain this to the machine. | Everything in S-1, plus least privilege across the four roles and an explicit deny for the Analyst role on approval actions. **AC-3**, **AC-6**, **AC-6(9)**, **AC-6(10)**. |
| E-2 | **The machine acts without a human where it should not.** The inverse of the classic case, and the one that matters for an autonomy system. | A2, A3 | **In place and auditable.** Escalation is on *named grounds*, not a single confidence number: `LOW CONFIDENCE`, `THREAT TRANSIT n%`, `LAST <scarce blood product>`, `IMMEDIATE UNASSIGNED`. Anything not tripping a ground dispatches under standing authority **and is still written to the chain** — `AUTO-DISPATCH` rows exist precisely so the delegated decisions are visible. | Standing authority thresholds set by the AO rather than by a settings panel; the grounds themselves under configuration control. **AC-3**, **AC-6(9)**, **CM-3**, **CM-5**, **AU-2**, **AU-12**. |
| E-3 | **Insider misuse of the approval gate** — approving a tasking that starves an IMMEDIATE casualty, or exporting selectively. | A2, A8 | The escalation record names the trade being made before it is made (`IMMEDIATE UNASSIGNED` is a grounds string, not a footnote), and the rejection path records a reason. | Separation of duties; export logging; behavioural monitoring at the platform. **AC-5**, **AU-6**, **AU-13**, **SI-4**. |

---

## 5. Four threats that deserve more than a table row

### 5.1 Supply chain — the largest residual risk in this architecture

Roughly 60 MB of the shipped build is JavaScript and WebAssembly this project did not write. That is where the risk is, and the IL5 analysis already puts about a third of its one-time STIG hours in the supply-chain row for exactly this reason. What `OUT/ANGEL-SWARM-SBOM.json` adds is that the risk is now **enumerated and graded** rather than gestured at:

- **Seven files are VERBATIM** — byte-identical to the published npm artefacts, including the two largest things in the build (the 35.7 MB DuckDB WebAssembly module and the 13.5 MB ONNX Runtime WebAssembly module). An assessor can reproduce those digests from the registry without trusting this build at all. That is the strongest supply-chain position available short of a reproducible build.
- **Several files are REBUNDLED** — produced from upstream with esbuild, so the digest legitimately differs and cannot be checked against the registry. This is where the residual question actually lives.
- **Two files are UNVERIFIED** — `react.production.min.js` and `react-dom.production.min.js`. Nothing in this repository can corroborate them, because `package-lock.json` resolves React to 19.2.8 and React 19 publishes no UMD build. **The lock file and the shipped bytes disagree**, and an SBOM that had quoted the lock file would have told an assessor the wrong thing about the code running in the browser. The vendored files are 18.3.1.
- **The server tier has no supply chain at all.** `go.sum` is empty. Every import is Go standard library. The Application Server SRG and every database STIG line are zero rather than small, and that is a structural property, not a scoping argument.
- **Two licence determinations are genuinely open** and are marked `NOASSERTION` rather than guessed: the eleven vendored woff2 faces (no licence file, no matching package in `node_modules`), and the npm route by which the MiniLM weights arrived.

**Required:** reproducible bundling, SSDF (NIST SP 800-218) attestation, SCA scanning of this SBOM, and supplier review — **SR-3**, **SR-4**, **SR-5**, **SR-6**, **SR-11**, **SA-15**, **PM-30**. No vulnerability scan has been run against this SBOM. Feeding it to a scanner is the next step, not a step already taken.

### 5.2 Model integrity and poisoning

Two ONNX graphs ship, and they carry different risk.

**CRI-Net** (104,162 parameters, opset 13) estimates compensatory reserve from a 5-second photoplethysmogram window. Its output is a **sort key inside a materiel tasking optimiser** — it is not a diagnosis and it is not surfaced to a clinician as a finding. That framing is what keeps this out of FDA device territory (the IL5 analysis §2.2 makes the full argument) and it also bounds the poisoning consequence: a corrupted CRI-Net changes the *order* in which casualties are served, not a treatment decision. It changes the order badly, though, and quietly, and the application would not notice.

Three properties reduce, but do not remove, that exposure:

1. **It was trained here, on a synthetic cohort, held out by subject** — no person appears in both the training and evaluation sets. The training-data poisoning vector that dominates most model threat models does not apply, because there is no external training corpus to poison.
2. **The application already refuses its own output when the signal is bad.** `app/models/ppg_cri.meta.json` carries an explicit trust gate (`act_below` 0.4689, `refuse_above` 0.5911 on predictive interval width), and the engine models the fact that peripheral vasoconstriction in haemorrhagic shock degrades the very waveform the estimate depends on. A model that started producing confident nonsense would have to produce *narrow-interval* nonsense to get past that gate.
3. **There is a documented fallback.** If the ONNX graph fails to load the screen falls back to a straight-line reserve model, marked on screen as `STRAIGHT-LINE · NOT A MODEL`.

**all-MiniLM-L6-v2 (int8)** retrieves doctrine passages for the Ask ANGEL screen. It touches no tasking decision. Its supply-chain provenance is the weaker of the two and the SBOM says so: the model is the Hugging Face `sentence-transformers/all-MiniLM-L6-v2` under Apache-2.0, but the weights in this build did **not** come from huggingface.co — `app/models/minilm/meta.json` records that huggingface.co was unreachable from the build sandbox and the fp16 safetensors and tokenizer were obtained through an npm package that is not in `package-lock.json` and not in `node_modules`. Its integrity hash therefore cannot be produced from this repository. **That is an open item.**

**Required for both:** load-time SHA-256 verification against the SBOM values, and a provenance attestation for the acquisition route — **SI-7**, **SI-7(1)**, **SR-4**, **SR-11**, **CM-14**. The SBOM is the input that makes the first of those cheap: the two digests to pin are already in it.

### 5.3 Audit-chain forgery, and why SHA-256 replaced FNV-1a

The audit chain used to be FNV-1a, 32-bit. That was a defect rather than a style choice, and the reasoning is recorded in `app/js/optimizer.js` at the function itself:

- **FNV-1a is a hash-table function.** Its own authors document it as non-cryptographic.
- **A 32-bit digest begins colliding by birthday at around 77,000 entries** — well inside the size of a real operational record.
- **Worse, FNV-1a is trivially invertible in the small.** Given whatever link you want a doctored entry to carry, you can solve for a few bytes to append and land on it, by hand, in microseconds.

The point of the chain is that an investigating officer can recompute it and catch an alteration. Against FNV-1a that check was decorative. It is now **SHA-256 (FIPS 180-4)** over the UTF-8 bytes of `prev + '|' + payload`, chained the same way.

Three implementation decisions are worth an assessor's attention because each is a deliberate trade:

- **It is a synchronous, hand-rolled implementation, not `crypto.subtle.digest`.** `crypto.subtle` is asynchronous, and `audit()` is called synchronously from inside the allocator's dispatch loop; `angel-engine.js` recomputes the whole chain while projecting a run; `mc.worker.js` calls both. Making the hash async would push promises through the simulation core. **The mitigation for a hand-rolled cryptographic primitive is that it is tested, and it is** — `optimizer.js` self-tests against two FIPS 180-4 vectors at load and logs an error if either fails, and `app/selftest.html` goes further: both published vectors, the 448-bit two-block message, and agreement with the browser's own WebCrypto SHA-256 on a 1,000-character message and on a non-BMP UTF-8 string with surrogate pairs.
- **The UTF-8 conversion is done by hand rather than with `TextEncoder`** so that the same bytes come out on the main thread, inside the worker, and in the design's restatement of the function.
- **The screens print a 12-character prefix and say on the page that it is a prefix.** The CSV export carries the whole 64-character digest, because the export is the copy somebody recomputes offline.

**What the chain is and is not.** It is **tamper-evident**: the self-test mutates one entry's detail and verification fails at exactly that sequence number, and the chain head changes. It is **not tamper-proof**: an attacker who can rewrite every subsequent entry can rewrite the chain, because nothing anchors the head outside the attacker's reach. **Required: mirror the head to the platform audit store on a cadence** (the IL5 analysis §6.8 already scopes local-authoritative-plus-mirror) — **AU-9(2)**, **AU-9(3)**, **AU-10**.

### 5.4 Adversarial denial — already a lever, not a caveat

Most systems treat comms denial as an assumption to be waved at. This one models it and lets a commander war-game it.

Every scenario carries at least one scheduled datalink-denial window, named for what it is — `SATCOM DENIED`, `EW JAMMING — DATALINK DEGRADED`, `HF RELAY ONLY — DATALINK LOST`, `AURORAL HF BLACKOUT`. While it is down: no tasking is issued; telemetry buffers on the soldier's end-user device because inference runs there, so the medic on scene keeps a live number while the tasking picture goes stale and *shows its staleness*; ground events buffer on the aircraft and land with it, carrying both the time they happened and the time they arrived. The Monte Carlo `comms` lever multiplies every outage duration from 0× to 4×, and `app/selftest.html` asserts that the lever actually moves the outcome — a sensitivity control that does nothing is worse than no control at all.

That is the honest version of the claim. The dishonest version would be "ANGEL SWARM operates through denial", and this system does not say that: under denial it holds its last-known-good plan and keeps the aircraft that are already flying, and it stops tasking. What it demonstrates is that the *degraded* behaviour is specified, implemented, measurable, and swept — which is precisely why the IL5 analysis insists (§6.7) that degraded-mode behaviour go into the ICD as acceptance criteria on day one rather than arriving as a caveat at Assess.

---

## 6. Residual risk register

Ranked by what an assessor would raise first, not by severity in the abstract.

| # | Risk | Likelihood a reviewer raises it | Cheapest honest answer |
|---|---|---|---|
| **R-1** | **No authentication, no identity, no access control.** | Certain | Say it first, before they find it. It is greenfield DISA ICAM federation, not a migration, and non-repudiation (**AU-10**) is blocked behind it. |
| **R-2** | **A dormant CDN fallback exists in `support.js` (React, ReactDOM, Babel via unpkg, SRI-pinned).** Measured at zero egress; not *enforced* at zero. | High — it is a `grep` away | A Content Security Policy header on the Go handler: `script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`. One line, closes §2.1 deterministically. **SC-18**, **SC-7(4)**. |
| **R-3** | **No load-time integrity check on any artefact** — not the models, not the WASM modules, not the engine. **And the digests are only as current as the last generator run:** five of them were found stale at v6.4 (§2.0b) because the SBOM had not been regenerated after the code changed. | High | The SBOM carries every digest. Verify them at load, sign the asset manifest, **and make `_sbom_gen.mjs` + `_sbom_validate.mjs` a release gate rather than a manual step** — a stale digest verified at load fails the build it was meant to protect. **SI-7**, **CM-14**, **SR-11**. |
| **R-4** | **REBUNDLED and UNVERIFIED supply-chain rows.** An assessor who meets unattested WebAssembly at Assess treats it as unvetted, and that is a rework cycle. | High | Reproducible bundling plus SSDF attestation. Already the largest STIG line in the IL5 analysis (§5). |
| **R-5** | **The MiniLM acquisition route cannot be reproduced from this repository.** | Medium | Re-acquire from a named, pinned source and record the integrity hash; or drop the retrieval feature from the accreditation boundary. |
| **R-6** | **The eleven vendored typefaces carry no licence evidence.** A licensing finding, not a security one, but it fails the same review. | Medium | Obtain from a named source, vendor the licence text beside them, re-run the SBOM generator. |
| **R-7** | **The CoT ingest path is unauthenticated when `-cot-external` is used.** | Medium (only if enabled) | Two flags is a good default. Enabling it on a real interface triggers **SC-7** and should be assessed at that point — which is exactly what the IL5 analysis §5 says. |
| **R-8** | **The audit chain head is not anchored outside the endpoint.** | Medium | Mirror to the platform audit store. **AU-9(2)**. |
| **R-9** | **No SCA scan has been run against the SBOM.** | Medium | Run one. The artefact now exists; that was the blocker. |
| **R-10** | **The self-test is a page a human opens, not a release gate.** | Low, but it is the difference between evidence and theatre | Run `selftest.html` headless in CI and fail the build on any assertion. **SA-11**, **CM-3**. |
| **R-11** | ~~**Two surfaces in the design application badge a term-overlap score with a model's name.**~~ **CLOSED at v6.3; this entry was stale until v6.5 and is retained rather than deleted.** The two surfaces now read `TERM OVERLAP · NO MODEL ON THIS PATH` and `DOCTRINE · QUOTED VERBATIM, NOT GENERATED`, neither carrying a model name or the ✦ mark. Two residual misattributions in the build inventory were fixed in v6.5. See §2.0c. | Closed. The residual risk is procedural, not technical: **this register was itself wrong for two revisions.** | Re-read the register against the build at each release rather than only appending to it. A stale risk entry is a false claim in the same way an unmarked model output is. **SI-7**, **CM-3**. |

---

## 6a. Subsumption interfaces — and why none of them widens the boundary today

This system is positioned to be **subsumed into existing architectures rather than
fielded beside them**, and an assessor is entitled to ask what that costs in attack
surface. Today it costs nothing, because none of the four integration paths is
implemented as an outbound interface.

| Path | What it would be | State in this build | Boundary effect today |
|---|---|---|---|
| An application on the Maven Smart System third-party layer, onboarded through the Open DAGIR OTA mechanism | A hosted decision surface inside an accredited enclave | Not implemented. Named as the intended host. | None. The accreditation would be inherited from the host, and §7 changes materially in the system's favour. |
| A medical-logistics agent in an Agent Network-style bounded-agent framework | The same object this already is — decision options to a commander, no strike authority | Not implemented. | None. |
| A tasking service behind an existing ground control station, handing an assignment over **STANAG 4586** | An outbound control-plane interface | **Not implemented, and stated as a target interface rather than a capability.** | None. This is the one path that *would* widen the boundary, and it is the one not built. |
| A data producer into the DHA clinical lane | FHIR-shaped casualty and decision resources | Implemented as a **file export**, not a network interface. Every resource is tagged FHIR-shaped and not conformance-tested. | None. An export written to disk is not a listener. |

The only network ingress that exists is the CoT listener already assessed above:
**receive-only, off by default, bound to loopback unless `-cot-external` is also
passed, and never replying.** This system **ingests** Cursor on Target; it does not
emit it. Any document, slide or spoken claim that says otherwise is wrong about this
build, and §2.1 already names unauthenticated external CoT ingest as the single
largest unmitigated spoofing exposure — which is a reason to be precise about the
direction of flow, not a reason to soften it.

The consequence for accreditation is the one §7 already argues: the applicable
rulebook is **DoDI 8510.01** and the Risk Management Framework. **DoD Directive
3000.09 (25 January 2023) does not apply**, and not by interpretation — paragraph
1.1.b excludes from its applicability "unarmed platforms, whether remotely operated
or operated by onboard personnel, and whether autonomous or semi-autonomous," and
"autonomous or semi-autonomous systems that are not weapon systems." This system
tasks unarmed aircraft carrying blood. It is excluded on both counts.

---

## 7. ATO pathway

### 7.1 The policy landscape as it actually stands in September 2026 — and why this section has to be careful

A document written a year ago would say "follow RMF under DoDI 8510.01" and stop. That is no longer the whole answer, and getting this wrong in front of a knowledgeable AO is worse than saying nothing.

On **24 September 2025** the DoD CIO announced the **Cybersecurity Risk Management Construct (CSRMC)** as the successor to RMF: five phases — **Design, Build, Test, Onboard, Operations** — and ten tenets, including automation, continuous monitoring and ATO, DevSecOps, cyber survivability, enterprise services and inheritance, reciprocity, and threat-informed assessments. Its central idea is a **constant ATO posture** driven by continuous monitoring rather than periodic authorisation decisions.

**But what was issued was a two-page policy outline, a phase graphic and a tenet list.** As of early 2026 the implementation plan had not been released (delayed by the government shutdown), funding detail was outstanding, and industry commentary was consistently that the direction is right and "more information is needed" — specifically on validation and stress-testing procedures, application to legacy systems, and acquisition language.

**The practical consequence for a program starting now, stated plainly:**

1. **Plan the package against RMF and DoDI 8510.01, and produce it in eMASS.** That is still what an AO and an SCA will ask for, and it is what the IL5 analysis prices in §8. Nothing in that plan is wasted.
2. **Build so that the CSRMC transition is cheap rather than disruptive.** Three of the ten tenets — continuous monitoring and ATO, enterprise services and inheritance, and reciprocity — are already the shape of this program: it is seeking an inheritance delta on an authorised host platform, not a standalone boundary. The cATO memorandum of 4 February 2022 (DoD SISO) is the bridge document and is already cited in the IL5 analysis.
3. **Do not claim CSRMC compliance.** There is not yet a published standard to be compliant with. Track it; do not bet the schedule on it.

### 7.2 RMF, step by step, with this system's actual posture

NIST SP 800-37 Rev. 2 defines **seven** steps. The IL5 analysis walks six of them (Categorize through Monitor) because those are the ones that carry cost; **Prepare** is added here because it is where the aggregation argument and the boundary definition get made, and both are load-bearing for this system.

| Step | What it means here | Posture today |
|---|---|---|
| **0 — Prepare** | Identify the AO and sponsor; define the authorisation boundary; state the aggregation argument; identify inherited controls from the host platform. | Not started. **The boundary decision is the most consequential one:** if the optional SLM and the CoT external listener are outside it, the assessment gets materially smaller. |
| **1 — Categorize** | FIPS 199 / CNSSI 1253 categorisation. | **Moderate / Moderate / Moderate**, with the aggregation argument made explicitly (individually a pulse waveform and a blood inventory are sensitive; together, in near-real time over a named JOA, they are force disposition). Per IL5 analysis §8. |
| **2 — Select** | Inherit the host baseline; layer only what ANGEL SWARM retains. | The delta is: application-layer access enforcement, application audit, input validation and the refusal gate, supply chain and artefact integrity, pseudonymisation, and degraded-mode behaviour under **CP-10**. |
| **3 — Implement** | Where the inheritance saving lands. AC, IA, SC and CP collapse or inherit almost entirely. | This is where **R-1, R-2 and R-3** get built. |
| **4 — Assess** | SCA assesses the delta; the platform's evidence carries the inherited controls. Pen test scoped to ingress, the data flows, the container, and the browser workload — **plus an artefact-integrity assessment of the ONNX and WebAssembly modules**. | The SBOM and the self-test are assessment inputs that do not currently exist for comparable prototypes. |
| **5 — Authorize** | IATT first, full ATO after the pilot. Two distinct IATTs: one on synthetic or de-identified physiology, one on real casualty physiology. | The synthetic-data IATT is reachable on the cyber path alone; the second is gated by privacy and clinical governance. |
| **6 — Monitor** | Quarterly STIG re-scan, monthly POA&M burn-down, dependency currency on the vendored WASM/JS tree and the Go toolchain, annual re-test of a delta subset, **and the degraded-mode acceptance suite on every release**. | Dependency currency is the recurring obligation this architecture creates by vendoring. The SBOM is what makes it tractable. |

Costs and durations for each step are in the IL5 analysis §8 and are not restated here.

### 7.3 Control families — where this system already stands

Only families where the prototype has a genuine position are listed. **"Partly satisfied by design" is not the same as implemented and assessed**, and the column says which.

| Family | Already partly satisfied by design | Not satisfied — must be built |
|---|---|---|
| **AC — Access Control** | **AC-4** (Information Flow Enforcement) has an unusually strong story: measured zero egress, one origin, loopback-only binding with non-loopback rejection. **AC-6(9)** (Log Use of Privileged Functions) partly — every approve, reject and hold is written to the audit chain. | **AC-2**, **AC-3**, **AC-5**, **AC-6**, **AC-17** — all of it. There is no identity. |
| **AU — Audit and Accountability** | **AU-2**, **AU-3**, **AU-12** are genuinely strong: every proposal, decision, dispatch, waste event and outcome is recorded with time, actor, action and detail. **AU-8** (time stamps) is inherent to the record. **AU-9** is *partly* satisfied by the SHA-256 chain — tamper-evident, and demonstrably so. | **AU-9(2)/(3)** (offload and cryptographic protection anchored off-endpoint), **AU-10** (blocked behind IA-2), **AU-11** (retention determination), **AU-6** (review process). |
| **CM — Configuration Management** | **CM-7** (Least Functionality) is close to exemplary by accident of architecture: no application server, no database server, no auth stack, one optional input path off by default. **CM-8** (System Component Inventory) is now met in substance by the CycloneDX SBOM. | **CM-2**, **CM-3**, **CM-5**, **CM-6** (STIG settings), **CM-14** (Signed Components). |
| **IA — Identification and Authentication** | Nothing. | **IA-2**, **IA-2(1)**, **IA-2(12)**, **IA-3**, **IA-5**, **IA-8**, **IA-9**. The whole family. |
| **SC — System and Communications Protection** | **SC-7** (Boundary Protection) is narrow and stated: one loopback hop by default. **SC-39** (Process Isolation) comes free from the browser's worker and origin model. **SC-13** — SHA-256 is a FIPS 180-4 approved algorithm, self-tested against published vectors; note that this is a *hash*, not a validated cryptographic module, and no FIPS 140-3 claim is made. | **SC-8** (nothing is encrypted in transit on the CoT path), **SC-12** (no keys exist to manage), **SC-18** (no CSP), **SC-28** (endpoint-inherited), **SC-5**. |
| **SI — System and Information Integrity** | **SI-10** partly, at the CoT parser (bounded datagram, fixed slice, memory-safe decoder). **SI-11** (error handling) — the application degrades to stated fallbacks rather than failing open. **SI-13**/**SI-17** partly, through modelled degraded-mode behaviour. | **SI-2** (no flaw-remediation process), **SI-3**, **SI-4**, **SI-7** (**the important gap** — no integrity verification of models, WASM or engine at load). |
| **SR — Supply Chain Risk Management** | **SR-4** (Provenance) is *partly* satisfied and newly evidenced: every shipped component enumerated, digested, and graded VERBATIM / REBUNDLED / UNVERIFIED. | **SR-3**, **SR-5**, **SR-6**, **SR-11**, and **PM-30**. |
| **CP — Contingency Planning** | **CP-10** has a real story: degraded operation under datalink denial is modelled, implemented and swept, not asserted. | **CP-2**, and CP-10 written as acceptance criteria rather than as behaviour. |
| **SA — System and Services Acquisition** | **SA-11** (Developer Testing) is partly satisfied by `app/selftest.html` — live result measured 9 September 2026: 196 total checks shipping inside the package, covering engine and host UI behavior; 195 pass and 1 fail. RESUPPLY TRACKING is 12/12 passing; the sole failure is the EUCOM_FJORD nominal seed-42 directional assertion (16 > 15). **SA-8** (Security Engineering Principles) shows in the architecture. | **SA-4**, **SA-15**, **SA-22**, and SA-11 as a gate rather than a page. |
| **RA — Risk Assessment** | This document. | **RA-3** formally, **RA-5** (no vulnerability scanning has been performed). |
| **PL / PM** | **PL-8** partly — the architecture is documented in unusual depth. | **PM-30**. |

### 7.4 IL5 hosting posture

The IL5 analysis recommends fielding as a hosted capability on the **War Data Platform** (Maven Smart System as strong alternate) rather than standing up a dedicated DHA IL5 enclave. Nothing in this threat model argues against that, and two things argue for it strongly: the audit-chain anchoring problem in §5.3 wants a platform audit store, and the identity problem in R-1 wants DISA ICAM rather than a bespoke stack.

Three points of accreditation detail that matter and that are current as of this writing:

- **The DoD Cloud Computing SRG is at Revision 5** (June 2024, with a DoD SSP Addendum update of 19 July 2024). It aligns to NIST SP 800-53 Rev. 5.
- **IL5 now requires the FedRAMP High controls baseline.** The FedRAMP Moderate pathway to IL5 is gone. A program planning against Moderate is planning against a superseded document.
- **Rev. 5 removed the accommodation that allowed IL5 workloads to sit within an IL4-authorised system on physical separation alone.** If a candidate host platform's IL5 story rests on that accommodation, it is no longer acceptable, and it should be tested in the first sponsorship conversation — alongside the §6.7 degraded-mode question the IL5 analysis already flags as the condition under which a dedicated enclave becomes correct.

### 7.5 eMASS artefacts a program would need

Produced in eMASS, inherited from the host platform wherever the platform's own package already carries them.

| Artefact | Status for ANGEL SWARM today |
|---|---|
| System Security Plan (SSP), with the inheritance mapping | Not written. The IL5 analysis explicitly excludes building it. |
| Security Assessment Plan and Report (SAP / SAR) | Not written. |
| Plan of Action and Milestones (POA&M) | Not written. §6 of this document is the raw material. |
| Categorisation record (FIPS 199 / CNSSI 1253) with the aggregation argument | Argued in the IL5 analysis §8; not formalised. |
| Hardware and software inventory | **Met in substance** by `OUT/ANGEL-SWARM-SBOM.json` (CycloneDX 1.6, schema-validated). |
| STIG checklists and SCAP scan results | Not run. Scope in IL5 analysis §5. |
| Vulnerability scan results (**RA-5**) | **None. No scan has been run.** |
| Ports, Protocols and Services Management (PPSM) registration | One TCP port on loopback; one optional UDP port. Not registered. |
| Contingency Plan and test results (**CP-2**, **CP-10**) | Degraded-mode behaviour implemented and swept; no plan document. |
| Incident Response Plan (**IR-4**, **IR-8**) | None. |
| Privacy Impact Assessment, SORN determination, minimum-necessary analysis | Not started. **The dominant schedule driver** per the IL5 analysis §10.2 — open these conversations in month 1. |
| SSDF attestation (NIST SP 800-218) and signed SBOM | SBOM exists and validates; **no attestation, no signature, no reproducible build.** |
| Model cards | **In build** — `app/models/ppg_cri.meta.json` and `app/models/minilm/meta.json`, both digested in the SBOM. |
| Test evidence | **In build** — `app/selftest.html`, live result measured 9 September 2026: 196 total checks covering engine and host UI behavior; 195 pass and 1 fail. RESUPPLY TRACKING is 12/12 passing and the sole failure is the EUCOM_FJORD nominal seed-42 directional assertion (16 > 15). Not yet a CI gate. |

### 7.6 Realistic timeline

The IL5 analysis owns the schedule and this document does not second-guess it: **IATT on synthetic or de-identified physiology at ~9 months** from ATP (range 7–12), **IATT on real casualty physiology at ~16 months** (12–22), **full ATO at ~22 months** (16–30). The gate on the second and third is privacy and clinical governance, not cyber.

What this threat model adds is a shorter, cheaper list — the work that would move this prototype from "interesting" to "assessable", which is not the same as accredited:

| Horizon | Work | Cost |
|---|---|---|
| **Days** | CSP header on the Go handler (**R-2**). Run `selftest.html` headless in CI as a release gate (**R-10**). Feed the SBOM to an SCA scanner (**R-9**). | Hours. |
| **Weeks** | Load-time digest verification of the models and WASM modules against the SBOM (**R-3**). Signed asset manifest. Resolve the font licensing (**R-6**) and the MiniLM acquisition route (**R-5**). | Days. |
| **Months** | Identity (**R-1**), reproducible bundling and SSDF attestation (**R-4**), audit-chain mirroring (**R-8**). | This is the §6/§8 work the IL5 analysis prices. |

---

## 8. What this prototype is NOT

Read this section before quoting anything above.

- **It is not accredited.** No ATO, no IATT, no interim authorisation of any kind. No Authorizing Official has seen it.
- **It has not been assessed.** No SCA has looked at it, no penetration test has been run against it, and no vulnerability or software-composition scan has been performed. §2 is a set of measurements taken by the developer, reproducible from the repository, not an independent assessment.
- **It is not conformance-tested.** The FHIR-shaped exports are FHIR-*shaped*: they have not been run against a FHIR validator or any conformance suite, and the application says so on its own Data Products screen. The CoT extension is a prototype use of CoT's deliberately open `<detail>` block, not a ratified medical CoT schema.
- **It is not connected to any live system.** No MHS GENESIS integration, no Med-COI connection, no platform tenancy, no live telemetry source. The CoT listener has only ever heard `cmd/cotsim`; it has not been tested with a real Sempulse Halo, CipherOx CRI M1 or BATDOK-J.
- **It has never been evaluated against a real adversary.** The threats in §4 are reasoned, not exercised. No red team, no adversarial ML evaluation of CRI-Net, no EW test event. The datalink-denial modelling in §5.4 is a *model* of denial, and models of denial are always kinder than denial.
- **It has never processed protected health information**, and no part of the privacy, clinical-governance or records-retention work that PHI would trigger has begun.
- **It is not a medical device and makes no clinical claim.** CRI-Net has had no clinical validation. The **CipherOx CRI M1 (reference)** is a different artefact by different people and appears here only as external-device reference context; this network is not it and inherits no regulatory status from it. Project materials cite external records under De Novo **DEN160020** and 510(k) **K173929**. Both identifiers remain in the historical record; this document does not invent a reconciliation or treat either as evidence of an ANGEL SWARM integration or status.
- **The security properties in §2 are properties of the artefact as built today.** They are not guaranteed by policy, and §2.1 gives a concrete example of the difference. Until there is a CSP, "no egress" is an observation about this build, not an enforced control.

---

## 9. Sources

**DoD / NIST guidance**
- NIST SP 800-37 Rev. 2, *Risk Management Framework for Information Systems and Organizations* (seven steps: Prepare, Categorize, Select, Implement, Assess, Authorize, Monitor) — https://csrc.nist.gov/pubs/sp/800/37/r2/final
- NIST SP 800-53 Rev. 5, *Security and Privacy Controls for Information Systems and Organizations* — https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf. Every control identifier in this document was checked against the published catalogue; none is invented.
- NIST SP 800-218, *Secure Software Development Framework (SSDF)*.
- DoD Instruction 8510.01, *Risk Management Framework for DoD Systems*, 19 July 2022 — https://www.esd.whs.mil/Portals/54/Documents/DD/issuances/dodi/851001p.pdf
- DoD Cloud Computing Security Requirements Guide (CC SRG), Revision 5, June 2024 (DoD SSP Addendum updated 19 July 2024); IL5 requires the FedRAMP High baseline, and physical separation of IL5 within an IL4-authorised system is no longer acceptable — https://public.cyber.mil/dccs/ · https://infusionpoints.com/blogs/disa-releases-rev-5-cloud-computing-security-requirements-guide
- *Continuous Authorization To Operate* memorandum, DoD SISO, 4 February 2022 — https://dodcio.defense.gov/Portals/0/Documents/Library/20220204-cATO-memo-Signed-Cleared.pdf
- **Cybersecurity Risk Management Construct (CSRMC)**, announced by the DoD CIO on 24 September 2025: five phases (Design, Build, Test, Onboard, Operations) and ten tenets. As of early 2026 the implementation plan, funding detail and validation guidance had not been published — https://www.akingump.com/en/insights/alerts/department-of-defense-launches-csrmc-a-new-cybersecurity-risk-management-construct · https://www.afcea.org/signal-media/cyber-edge/defense-industry-welcomes-initial-csrmc-policy
- DISA STIG Document Library — https://public.cyber.mil/stigs/downloads/
- eMASS (Enterprise Mission Assurance Support Service) — https://www.dcsa.mil/Systems-Applications/Enterprise-Mission-Assurance-Support-Service-eMASS/

**Companion documents in this repository**
- `OUT/ANGEL-SWARM-IL5-deployment-cost-impact-analysis.md` — cost, schedule, hosting, STIG scoping, RMF step costs, privacy and clinical governance. Authoritative for every figure and date.
- `OUT/ANGEL-SWARM-SBOM.json` / `OUT/ANGEL-SWARM-SBOM.md` / `OUT/ANGEL-SWARM-SBOM-validation.txt` — CycloneDX 1.6, schema-validated.
- `OUT/sec/verification.txt` — the measurement record behind §2.
- `app/selftest.html` — live result measured 9 September 2026: 196 total checks shipping inside the package, covering engine and host UI behavior; 195 pass and 1 fail. RESUPPLY TRACKING is 12/12 passing and the sole failure is the EUCOM_FJORD nominal seed-42 directional assertion (16 > 15).

**System of record for the assertions in §1, §2 and §5**
`cmd/angelswarm/main.go` (loopback bind at :111, non-loopback rejection at :180, response headers at :210–217) · `cmd/angelswarm/telemetry.go` (receive-only listener, `cotMaxDatagram` 8192) · `app/js/optimizer.js` (`SHA256_K`, `sha256Hex`, `auditHash`, `auditHashShort`, `AUDIT_HASH_SELFTEST`, `audit`, `verifyAudit`, `escalationReasons`) · `app/js/sim.js` (`createWorld`, scenario `comms` windows) · `app/support.js` (:1142–1149, :1838–1846 — the dormant CDN fallback) · `app/models/ppg_cri.meta.json` · `app/models/minilm/meta.json` · `go.mod`, empty `go.sum`.

---

_End of threat model and ATO pathway._
