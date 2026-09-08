# `app/` — the application

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

This is what the launcher serves. Everything the prototype does — the simulation, the tasking optimiser, both trained models, the analytical database, all three map renderers — runs inside this folder in the browser, over loopback, with no outbound request. The launcher binary at the repository root finds this folder beside itself, serves it over HTTP on 127.0.0.1 and opens a browser at that address.

**A server is necessary; opening the files directly is not enough.** A page loaded with `file://` has an opaque origin, and browsers refuse to construct Web Workers from an opaque origin. The Monte Carlo harness, the DuckDB console and the ONNX Runtime sessions all run in workers, so `file:///…/app/index.html` loads a page whose load-bearing parts cannot start. Serving from loopback costs nothing, installs nothing and touches no interface other than loopback.

For the file-by-file detail of every source file here — what each module actually does at run time, and which claims elsewhere in the package depend on it — see [`../Documentation/CODE-MAP.md`](../Documentation/CODE-MAP.md).

## Top level

| File | What it is |
|---|---|
| `index.html` | The design build, and the surface the demonstration is given on: the canvas document carrying every screen's markup, driven by the runtime in `support.js` and reading its figures through `angel-engine.js`. |
| `design.html` | A byte-identical copy of `index.html`, kept under the name the design canvas addresses it by. |
| `console.html` | The analyst console: loads the modules in `js/` directly and is the surface the real map, terminal, evidence and wall panes live on. `index.html` mounts it in a same-origin frame where a real pane is needed. |
| `selftest.html` | An offline page that loads the shipped engine as plain scripts and runs browser assertions against it with nothing mocked, including the reference result every document quotes. |
| `angel-engine.js` | Runs the engine headlessly once, end to end, records its ledgers, and exposes `buildRun()` and a memoised `snapshot()` so the canvas can seek to any minute. It computes no outcome of its own. |
| `angel-map.js` | Draws no map. It docks the console in a same-origin iframe over the slot the design draws, so the three real renderers keep their own cameras while React rewrites the page around them. |
| `angel-ppg.js` | The live photoplethysmogram element: advances a 100 Hz sample clock and paints the 500-sample window that is the model's actual input tensor. Nothing is interpolated. |
| `support.js` | The Design Canvas runtime, generated rather than hand-written. It expects `window.React` and `window.ReactDOM`, which is why `vendor/react/` is loaded first. |

## Subfolders

| Folder | What is in it |
|---|---|
| [`js/`](js/) | Forty-five files: the engine, the workers, the shell, the destinations, the maps, the model bindings and the data products. |
| [`css/`](css/) | Fourteen stylesheets whose load order is declared by hand and is load-bearing. |
| [`data/`](data/) | Two generated JSON files read at run time — the offline basemap and the doctrine corpus with its precomputed vectors. |
| [`models/`](models/) | The two ONNX graphs that ship: CRI-Net and an int8 all-MiniLM-L6-v2. |
| [`fonts/`](fonts/) | Eleven vendored woff2 faces, served locally so the first paint issues no off-origin request. |
| [`vendor/`](vendor/) | Third-party libraries vendored as files and never fetched. |
| [`video/`](video/) | The two film cuts the application plays, each with a WebM fallback. |
