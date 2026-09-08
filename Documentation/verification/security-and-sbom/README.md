# Security and supply-chain evidence

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

The captured evidence behind the security and SBOM documents: the instrumented network and storage measurement, and six screenshots of the shipped application taken during that run. Nothing here is a claim on its own — each file is the artefact a claim made elsewhere in the package points at.

## Contents

| File | What it proves |
|---|---|
| `verification.txt` | The instrumented run itself: 121 requests, one distinct origin, zero off-origin, zero uncaught errors, one `localStorage` key and nothing else in browser storage, across all thirteen destinations and every path that touches a WebAssembly module or an ONNX model. Rendered at [`verification.md`](verification.md). |
| `selftest.png` | That the self-test passes and what it asserts: the summary strip reads 118 passed, 0 failed, 118 total, 1,046 ms, ALL ASSERTIONS PASSED, and the visible groups assert the reference result directly — 125 casualties, ARM A 23 survivable deaths, ARM B 34, ARM C 35, on 20 / 38 / 0 sorties. |
| `selftest-full.png` | That nothing has been cropped: the whole 5,697-pixel page in one capture, all fourteen assertion groups green — determinism, the reference result, conservation and physical constraints, the physiological deadline, payload rules and cold chain, range setting, triage precedence in the control arm, the audit chain, the seekable snapshot, all seven joint operating areas, the levers and Monte Carlo path, and directional sanity. |
| `selftest-bottom.png` | That the levers and the honesty panel are real: a second run at 893 ms showing the lever assertions, the six directional-sanity assertions, and the WHAT THIS PAGE IS NOT panel disclaiming clinical validation and accreditation. The footer stamps the run — 2026-08-28 17:45:19Z, against `js/sim.js`, `js/optimizer.js`, `js/mc.worker.js` and `angel-engine.js`, offline, that tab only. |
| `selftest-levers.png` | Nominally the lever group — that more combat medics reduces survivable deaths in **both** arms and widens the gap, and that a real Monte Carlo worker loads the shipped engine off disk. In fact it is **byte-identical to `selftest-bottom.png`** (same SHA-256, both 143,360 bytes), so it is a duplicate under a second name and proves nothing the previous file does not. |
| `settings-row.png` | That the self-test is reachable from the running application: the Settings destination scrolled to the Engine self-test row, whose OPEN control opens `selftest.html` in a new tab and states the run in progress is not disturbed. The same view shows Telemetry ingest OFF, the default. |
| `settings-full.png` | That the run parameters the documents quote are the ones the application uses: seed 42, 180 min at 0.25 min steps, 125 casualties, 7 airframes per arm, the 58 / 32 / 10 responder mix, the standing-authority bar at 0.10 — and all seven joint operating areas across PACOM and EUCOM, with JOA CORAL selected. Fixed chrome appears twice where the full-height capture was stitched. |

## A note on the duplicate

`selftest-levers.png` and `selftest-bottom.png` are the same file. Two names for one capture is not a defect in the application, but it means the folder holds five distinct screenshots rather than six, and the lever assertions have one capture behind them rather than a dedicated one. This is recorded here rather than passed over.
