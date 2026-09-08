# ANGEL SWARM — Verification evidence

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

The reviewer's checklist: what can be checked in this package without taking anything on trust, and how. Rendered from `README.txt`, with the file paths corrected to this repository's layout.

## What you can check yourself, without taking anything on trust

### 1. The engine

Open `app/selftest.html` in any browser, offline. It runs 118 assertions against the shipped engine — the same `app/js/sim.js` and `app/js/optimizer.js` the application runs — with nothing mocked. Among them is the reference result quoted in every document in this package:

> seed 42 · JOA CORAL · capability deployed
> 23 / 34 / 35 survivable deaths on 20 / 38 / 0 sorties

A red row would be a real disagreement between what this engine does and what this package claims it does. There are none.

### 2. The seven-theatre result

`Documentation/verification/winprob.mjs` re-derives the whole win-probability table — 200 paired battles per theatre, 1,400 in total — from the shipped engine. Run it **from the repository root**, because it reads `app/js/sim.js` and `app/js/optimizer.js` by a path relative to the working directory:

```sh
node Documentation/verification/winprob.mjs PACOM_CORAL 200
```

It reproduces `Documentation/ANGEL-SWARM-WIN-PROBABILITY-v5.9` exactly: seven theatres won from seven, every 95% interval excluding zero, adverse in 6 of 1,400 battles and never by more than one.

### 3. The network claim

Pull the network cable, or switch off the adapter, and run the application. Nothing changes. Every basemap in it is either computed from the scenario's elevation field or drawn from coastline data that ships inside the build; there is no tile server and no request ever leaves the machine. Instrumented runs measure zero off-origin requests across all thirteen destinations and all four map scales.

### 4. The bill of materials

`Documentation/ANGEL-SWARM-SBOM-validation.txt` records the validation actually performed on `Documentation/ANGEL-SWARM-SBOM.json` — CycloneDX 1.6, validated with ajv against the CycloneDX project's own schema. Every component digest in it was measured off disk.

## What is in this folder

| Path | What it is |
|---|---|
| `security-and-sbom/` | Screenshots and instrumented output from the security and supply-chain verification: the zero-egress measurement, the browser-storage audit, and the Settings row that reaches the self-test. |
| `build_docx_any.cjs` | The generator that builds every `.docx` in `Documentation/` from its Markdown source, so the Word files can be regenerated and are not a separate hand-maintained copy that could drift. |
| `winprob.mjs` | The seven-theatre re-derivation described above. |
| `ANGEL-SWARM-SBOM-validation.txt` | A second copy of the SBOM validation record, differing from the one in `Documentation/` only in its timestamp. |

## The captured evidence

The six screenshots below are the instrumented captures held in `security-and-sbom/`. The measurements they were taken alongside are recorded in [`security-and-sbom/verification.md`](security-and-sbom/verification.md).

![The engine self-test, top of page](security-and-sbom/selftest.png)

*`selftest.png` — the head of `app/selftest.html`, evidencing the summary strip (118 passed, 0 failed, 118 total, 1,046 ms, ALL ASSERTIONS PASSED) and the first two assertion groups. The reference result is asserted here rather than asserted in a slide: ARM A 23 survivable deaths, ARM B 34, ARM C 35, on 20 / 38 / 0 sorties, out of a 125-casualty battle.*

![The engine self-test, whole page](security-and-sbom/selftest-full.png)

*`selftest-full.png` — the same page captured top to bottom (1600 × 5,697 px), evidencing that all fourteen assertion groups pass and that no group has been cropped out of the shorter captures: determinism and common random numbers, the reference result, conservation and physical constraints, the physiological deadline, payload rules and cold chain, range setting, triage precedence in the control arm, the audit chain, the seekable snapshot, all seven joint operating areas, the commander's levers and the Monte Carlo path, and directional sanity.*

![The engine self-test, foot of page](security-and-sbom/selftest-bottom.png)

*`selftest-bottom.png` — the foot of the page on a re-run (118 passed, 0 failed, 893 ms), evidencing the lever and Monte Carlo assertions, the six directional-sanity assertions, and the WHAT THIS PAGE IS NOT panel that states the page is not a clinical validation and not an accreditation artefact. The footer records the run: 2026-08-28 17:45:19Z, against `js/sim.js`, `js/optimizer.js`, `js/mc.worker.js` and `angel-engine.js`, offline, in that tab only.*

![The lever assertions](security-and-sbom/selftest-levers.png)

*`selftest-levers.png` — intended as the lever-group capture, and evidencing those assertions: the fleet, launch-point, comms, triage-accuracy and medic levers each move the outcome, more combat medics reduces survivable deaths in **both** arms and widens the gap, and a real Monte Carlo worker loads the shipped engine off disk. **This file is byte-identical to `selftest-bottom.png`** — same SHA and same 143,360 bytes — so it is the same capture under a second name rather than an independent one.*

![Settings, the engine self-test row](security-and-sbom/settings-row.png)

*`settings-row.png` — the Settings destination scrolled to the Engine self-test row, evidencing that the self-test is reachable from the running application rather than only as a loose file: the row's OPEN control opens `selftest.html` in a new tab and states that the run in progress is not disturbed. The same capture shows Telemetry ingest set to OFF, which is the default posture.*

![Settings, whole page](security-and-sbom/settings-full.png)

*`settings-full.png` — the whole Settings destination captured top to bottom, evidencing the run parameters the documents quote: seed 42, 180 min at 0.25 min steps, 125 casualties in stream, 7 airframes per arm, the 58% buddy aid / 32% combat lifesaver / 10% combat medic responder mix, and all seven joint operating areas across two combatant commands with JOA CORAL selected. The fixed left rail and command bar appear twice because the page's fixed chrome is re-rendered where the full-height capture was stitched.*

## What is not here, deliberately

The working screenshot archives from the development sessions — roughly 95 MB of intermediate captures. They prove nothing a reader cannot verify directly by the four steps above, and they would treble the size of this package.
