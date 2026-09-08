# ANGEL SWARM — Network and storage verification record

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

The machine-written record of the zero-egress and browser-storage measurement, produced by driving the application under headless Chromium with every request intercepted in the browser rather than sampled from a proxy log. It is reproduced verbatim from `verification.txt`, which remains the authoritative copy.

```text
ANGEL SWARM — network and storage verification record
date              : 2026-08-28T17:37:24.877Z
method            : Playwright/Chromium 141.0.7390.37, headless, every request intercepted at the browser
                    (page.on("request")), not sampled from a proxy log.
origin under test : http://127.0.0.1:8791 (a static server standing in for the Go launcher, same asset tree)

SCREENS EXERCISED : all 13 navigation destinations, plus tactical 3D, the DuckDB SQL
                    terminal, the CRI-Net sensor screen and the MiniLM retrieval screen —
                    i.e. every path that touches a WebAssembly module or an ONNX model.

TOTAL REQUESTS    : 121
DISTINCT ORIGINS  : 1  ["http://127.0.0.1:8791"]
OFF-ORIGIN        : 0  — none
UNCAUGHT ERRORS   : 0
CONSOLE ERRORS    : 22  ["Error: <circle> attribute cx: Expected length, \"{{ z.x }}\".","Error: <circle> attribute cy: Expected length, \"{{ z.y }}\".","Error: <circle> attribute r: Expected length, \"{{ z.r }}\".","Error: <rect> attribute x: Expected length, \"{{ b.rx }}\".","Error: <rect> attribute y: Expected length, \"{{ b.ry }}\"."]

BROWSER STORAGE AFTER THE FULL RUN
  localStorage keys   : ["angel.mapMode"]
  localStorage values : {"angel.mapMode":"3D"}
  sessionStorage keys : []
  cookies             : (none)
  IndexedDB databases : []
  service worker      : none

REFERENCE RESULT (seed 42 / JOA CORAL / deployed)
  survivable deaths A/B/C : 23 / 34 / 35   as published
  sorties          A/B/C : 20 / 38 / 0   as published

ENGINE SELF-TEST (selftest.html, same origin, separate tab)
  assertions : 118 passed, 0 failed, 118 total, 1046 ms
  off-origin requests from that page : 0 — none
  uncaught errors on that page       : 0
```

## Reading the record

Three things in it are worth stating plainly rather than leaving to the reader.

The **console errors are not zero**. Twenty-two were recorded, of five distinct kinds, and all five are the same defect: an SVG attribute painted with an unsubstituted template expression — `{{ z.x }}`, `{{ z.y }}`, `{{ z.r }}`, `{{ b.rx }}`, `{{ b.ry }}` — which the browser rejects as a length. They are template-binding faults in the drawing layer, not network or storage findings, and the record reports them rather than filtering them out.

The **storage footprint is one key**. After exercising every destination, every WebAssembly module and both ONNX models, the browser holds a single `localStorage` entry recording which map framing was last open. No cookies, no session storage, no IndexedDB database, no service worker.

The **origin under test is a static server, not the Go launcher**. It serves the same asset tree over the same loopback interface; the substitution is stated in the record so the measurement is not read as covering the launcher's own code paths.

The screenshots captured alongside this run are indexed in [`README.md`](README.md).
