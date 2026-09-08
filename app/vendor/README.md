# `app/vendor/` — third-party libraries

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

Eight libraries vendored as files and loaded from this folder over loopback. Nothing here is fetched at run time, and that is the point: the application's claim is that it originates no outbound request, and a CDN reference would break it on first paint. Versions, digests and per-file provenance grading (VERBATIM / REBUNDLED / UNVERIFIED / SUPPORTING) are recorded in `Documentation/ANGEL-SWARM-SBOM.md` and `ANGEL-SWARM-SBOM.json`.

The licence column below lists what actually ships in the folder, which is not the same thing as the licence being unknown — every one of these is MIT or Apache-2.0 by its own package metadata, and the SBOM cites it per component. Four folders carry no licence text beside the code.

| Folder | Library and version | Licence | Licence file shipped here |
|---|---|---|---|
| `react/` | react and react-dom 18.3.1, UMD production builds. Loaded before `app/support.js` so the design runtime's unpkg fallback short-circuits and no request leaves loopback. | MIT | `LICENSE`, and `README.txt` recording why the pair is vendored |
| `ort/` | ONNX Runtime Web 1.27.0 — the bundle, the SIMD-threaded loader and its 13.5 MB wasm. Runs both trained models. | MIT | none |
| `duckdb/` | @duckdb/duckdb-wasm 1.29.0 — module, a 35.7 MB EH wasm and the browser worker. The analytical console. | MIT | none |
| `wllama/` | @wllama/wllama 3.5.1 — llama.cpp compiled to wasm, 7.7 MB. The mission-brief engine, which has no weights to load unless `get-model.sh` has been run. | MIT | `LICENCE` |
| `deck/` | deck.gl 9.3.10, minified bundle. Both GPU maps. | MIT | none |
| `echarts/` | Apache ECharts 6.1.0, rebundled to the Sankey chart, tooltip and canvas renderer only. | Apache-2.0 | `LICENSE` and `NOTICE` |
| `uplot/` | uPlot 1.6.32, 52 KB. The five non-Sankey charts. | MIT | `LICENSE`, and `uPlot.min.css` verbatim |
| `cm/` | CodeMirror 6 — an esbuild bundle of `codemirror` 6.0.2, `@codemirror/state`, `view`, `lang-sql` and `theme-one-dark`. The SQL query box. | MIT | none |

Four folders — `ort/`, `duckdb/`, `deck/` and `cm/` — ship no licence text. Of those, `cm/` is also a re-bundle rather than a published artefact, so its digest cannot be checked against the npm registry; the SBOM labels it accordingly rather than blurring the distinction. This is the same class of gap as the font finding in [`../fonts/README.md`](../fonts/README.md), and it is cheaper to close: the licence text is in each package.
