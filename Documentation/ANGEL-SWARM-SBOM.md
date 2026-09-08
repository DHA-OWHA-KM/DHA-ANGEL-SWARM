# ANGEL SWARM — Software Bill of Materials

**Format:** CycloneDX 1.6 JSON — `OUT/ANGEL-SWARM-SBOM.json`. This document is the human-readable rendering of that file; the JSON is authoritative.
**Generated:** 2026-09-05T06:17:20Z by `_sbom_gen.mjs`, which measures every hash and size off the file on disk.
**Serial number:** `urn:uuid:ad5fac77-ad58-45c8-b6f1-e3ed7aa14853`
**Classification:** UNCLASSIFIED // PUBLIC RELEASE // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

---

## How to read this

Three rules were applied, and they are the reason a few cells say `NOASSERTION` where a tidier document would have guessed.

1. **Versions come from `package-lock.json`, not from the caret ranges in `package.json`** — except where the vendored artefact itself declares a different version, in which case the artefact wins and the discrepancy is recorded. There is one such case and it matters: see React below.
2. **Licences are read from the package** — its own `package.json` `license` field, corroborated by a `LICENSE` file shipped inside it. Where neither exists, the licence is `NOASSERTION`. Nothing here is inferred from what a library is usually licensed under.
3. **Provenance is stated as VERBATIM or REBUNDLED.** A vendored file whose SHA-256 matches the published package byte for byte is marked VERBATIM. A file produced by re-bundling with esbuild cannot be checked that way and is marked REBUNDLED. Both are legitimate; only one is verifiable by digest, and an assessor needs to know which is which.

---

## 1. What ships — third-party libraries vendored into `app/vendor/`

| Package | Version | Licence | Licence evidence | Version source |
|---|---|---|---|---|
| `react` | 18.3.1 | MIT | `node_modules/react/package.json "license"`<br>`node_modules/react/LICENSE` | the string "18.3.1" inside the vendored UMD bundle and app/vendor/react/README.txt |
| `react-dom` | 18.3.1 | MIT | `node_modules/react-dom/package.json "license"`<br>`node_modules/react-dom/LICENSE` | the string "18.3.1" inside the vendored UMD bundle and app/vendor/react/README.txt |
| `@duckdb/duckdb-wasm` | 1.29.0 | MIT | `node_modules/@duckdb/duckdb-wasm/package.json "license"` | package-lock.json (resolved) |
| `apache-arrow` | 21.2.0 | Apache-2.0 | `node_modules/apache-arrow/package.json "license"`<br>`node_modules/apache-arrow/LICENSE.txt` | package-lock.json (resolved) |
| `onnxruntime-web` | 1.27.0 | MIT | `node_modules/onnxruntime-web/package.json "license"` | package-lock.json (resolved) |
| `@wllama/wllama` | 3.5.1 | MIT | `node_modules/@wllama/wllama/package.json "license"`<br>`node_modules/@wllama/wllama/LICENCE` | package-lock.json (resolved) |
| `echarts` | 6.1.0 | Apache-2.0 | `node_modules/echarts/package.json "license"`<br>`node_modules/echarts/LICENSE` | package-lock.json (resolved) |
| `deck.gl` | 9.3.10 | MIT | `node_modules/deck.gl/package.json "license"`<br>`node_modules/deck.gl/LICENSE` | package-lock.json (resolved) |
| `uplot` | 1.6.32 | MIT | `node_modules/uplot/package.json "license"`<br>`node_modules/uplot/LICENSE` | package-lock.json (resolved) |
| `codemirror` | 6.0.2 | MIT | `node_modules/codemirror/package.json "license"`<br>`node_modules/codemirror/LICENSE` | package-lock.json (resolved) |
| `@codemirror/state` | 6.7.1 | MIT | `node_modules/@codemirror/state/package.json "license"`<br>`node_modules/@codemirror/state/LICENSE` | package-lock.json (resolved) |
| `@codemirror/view` | 6.43.8 | MIT | `node_modules/@codemirror/view/package.json "license"`<br>`node_modules/@codemirror/view/LICENSE` | package-lock.json (resolved) |
| `@codemirror/lang-sql` | 6.10.0 | MIT | `node_modules/@codemirror/lang-sql/package.json "license"`<br>`node_modules/@codemirror/lang-sql/LICENSE` | package-lock.json (resolved) |
| `@codemirror/theme-one-dark` | 6.1.3 | MIT | `node_modules/@codemirror/theme-one-dark/package.json "license"`<br>`node_modules/@codemirror/theme-one-dark/LICENSE` | package-lock.json (resolved) |

### 1.1 The one version discrepancy, stated plainly

- **`react`** — package-lock.json resolves react to 19.2.8. React 19 publishes no UMD build; the file that actually ships here is 18.3.1.
- **`react-dom`** — package-lock.json resolves react-dom to 19.2.8. Same UMD reason as react.

This is not a packaging slip to be smoothed over in a table. The lock file and the shipped bytes disagree, and an SBOM that quoted the lock file would have told an assessor the wrong thing about the code actually executing in the browser. The vendored files were taken from React 18.3.1, which is the last line to publish a UMD build; the canvas runtime (`support.js`) looks for `window.React` before it reaches for a CDN, and these two files are what stop it reaching.

### 1.2 Vendored files, with digests

| File | Bytes | SHA-256 | Provenance |
|---|---:|---|---|
| `app/vendor/react/react.production.min.js` | 10,751 | `d949f1c3687aedadcedac85261865f29b17cd273997e7f6b2bfc53b2f9d4c4dd` | **UNVERIFIED** — node_modules holds react 19.2.8, which publishes no UMD build, so there is nothing here to compare this file against |
| `app/vendor/react/LICENSE` | 1,086 | `52412d7bc7ce4157ea628bbaacb8829e0a9cb3c58f57f99176126bc8cf2bfc85` | **SUPPORTING** — licence, notice or provenance text vendored beside the artefact |
| `app/vendor/react/README.txt` | 337 | `95b9918eea5d82506a4979c7dd84e2eede670cde37c6fa23e9588f0e1f14c133` | **SUPPORTING** — licence, notice or provenance text vendored beside the artefact |
| `app/vendor/react/react-dom.production.min.js` | 131,835 | `35f4f974f4b2bcd44da73963347f8952e341f83909e4498227d4e26b98f66f0d` | **UNVERIFIED** — node_modules holds react-dom 19.2.8, which publishes no UMD build, so there is nothing here to compare this file against |
| `app/vendor/duckdb/duckdb.mjs` | 439,212 | `edc2f3240dd54e9341be0b5135f04e16e18cbfef9872a44e7d824a4b9715bc01` | **REBUNDLED** — differs from node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser.mjs — re-bundled or minified from it |
| `app/vendor/duckdb/duckdb-eh.wasm` | 35,659,694 | `00d45e5e074b7f7e17e45daabacb0fb67248eac8bd638a72cd1b42dad23788e4` | **VERBATIM** — byte-identical to node_modules/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm |
| `app/vendor/duckdb/duckdb-browser-eh.worker.js` | 760,530 | `260b4773d2d78e5ab1106bc163ffd5b0b6eaeddedacf23190e9cafc9cc010d3d` | **VERBATIM** — byte-identical to node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js |
| `app/vendor/ort/ort.wasm.bundle.min.mjs` | 72,799 | `1db5e1c5cd2b860eed85e6eeff23e2aaa7cffcc407f67093bcc888f631b94ba9` | **VERBATIM** — byte-identical to node_modules/onnxruntime-web/dist/ort.wasm.bundle.min.mjs |
| `app/vendor/ort/ort-wasm-simd-threaded.mjs` | 24,180 | `0a1e718d99c41b22c21f2520ff4f9e883a6b5533856e398d21816ee8eb8185d3` | **VERBATIM** — byte-identical to node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs |
| `app/vendor/ort/ort-wasm-simd-threaded.wasm` | 13,479,978 | `d1ab1b94b16a65b29d710d0b587b29e7bed336827577623913479b8afe8113e6` | **VERBATIM** — byte-identical to node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm |
| `app/vendor/wllama/wllama.mjs` | 302,750 | `caaed385c32d3e84516a130749dd4afd9360384e3d152a8b85e3371b493afce1` | **REBUNDLED** — differs from node_modules/@wllama/wllama/esm/index.min.js — re-bundled or minified from it |
| `app/vendor/wllama/wllama.wasm` | 7,656,521 | `4197ce6d3dc9240c42ee52b4197dc99638875a06b0083901f8a57767338a0cfa` | **VERBATIM** — byte-identical to node_modules/@wllama/wllama/esm/wasm/wllama.wasm |
| `app/vendor/wllama/LICENCE` | 1,071 | `5866e3bd7e3cbd3f7c8bea6efd8a1e7fa7cc8de68c30f428aff7c6584a0fb720` | **SUPPORTING** — licence, notice or provenance text vendored beside the artefact |
| `app/vendor/echarts/echarts.sankey.min.mjs` | 497,252 | `fbacff1011d8a33e83eb66f345a2b43e8b554f3fbd40f1c0284893fe8558cf37` | **REBUNDLED** — differs from node_modules/echarts/dist/echarts.esm.min.mjs — re-bundled or minified from it |
| `app/vendor/echarts/LICENSE` | 11,990 | `634293835b43a6dd2094fa39182a3d9a6b9ca43b7fdb9ac354e8037af2a3093a` | **SUPPORTING** — licence, notice or provenance text vendored beside the artefact |
| `app/vendor/echarts/NOTICE` | 168 | `d491d358344f842685c1b1585970999db65fe30ecf7ef3867af8814f4016c016` | **SUPPORTING** — licence, notice or provenance text vendored beside the artefact |
| `app/vendor/deck/deck.min.js` | 755,932 | `e5f7c30e73f86414535fbadbae781bba823ad7ce5964a50d47c3df04d064ba8f` | **REBUNDLED** — differs from node_modules/deck.gl/dist.min.js — re-bundled or minified from it |
| `app/vendor/uplot/uplot.min.mjs` | 52,010 | `19d450490609919e177eb185db8a901fb7861b194e31f9ba78e9929d8c88958f` | **REBUNDLED** — differs from node_modules/uplot/dist/uPlot.esm.js — re-bundled or minified from it |
| `app/vendor/uplot/uPlot.min.css` | 1,857 | `df630c6a8d6f8eeaff264b50f73ce5b114f646ffd9a0bb74f049b0a00135fa04` | **VERBATIM** — byte-identical to node_modules/uplot/dist/uPlot.min.css |
| `app/vendor/uplot/LICENSE` | 1,078 | `8f989229699b4fe2f1a0432d0e9edc338a8a911e250e2d1b01ecd770a5f5b1bd` | **SUPPORTING** — licence, notice or provenance text vendored beside the artefact |
| `app/vendor/cm/cm.mjs` | 427,067 | `8dd32fcd90938f392618b2fa89021b9f8b724a5f04a2a5de2a02140d7f56769d` | **REBUNDLED** — esbuild bundle of the five CodeMirror packages above |

Four labels appear in that last column and they mean different things.

- **VERBATIM** — the vendored file is byte-identical to the published npm artefact. Seven files qualify, including the two largest things in the build: the 35.7 MB DuckDB WebAssembly module and the 13.5 MB ONNX Runtime WebAssembly module. A reviewer can reproduce those digests straight from the registry without trusting this build at all.
- **REBUNDLED** — the file was produced from the upstream package with esbuild, so the digest legitimately differs and cannot be checked against the registry. This is where the residual supply-chain question in this architecture actually sits, and it is the same place the IL5 analysis put it (§5, supply-chain row, roughly a third of the one-time STIG hours).
- **UNVERIFIED** — the two React UMD files. Nothing in this repository can corroborate them, because the installed React is 19.x and 19.x publishes no UMD build. This is a weaker position than REBUNDLED, not a stronger one, and it is labelled separately for that reason.
- **SUPPORTING** — licence, notice and provenance text carried beside an artefact. Hashed for completeness; not executable.

`apache-arrow 21.2.0` (Apache-2.0) has no file of its own: it is **inlined into `app/vendor/duckdb/duckdb.mjs`** by the re-bundle. Upstream `duckdb-browser.mjs` is 29,927 bytes; the vendored bundle is 439,212 bytes and contains Arrow symbols. It is listed as a component because it ships, even though it is not a file you can point at.

---

## 2. The Go launcher

| Property | Value |
|---|---|
| Module | `angelswarm` (devel — the module is not published) |
| `go` directive in `go.mod` | `1.24` |
| Toolchain that built the shipped binaries | **go1.24.7**, read back out of `ANGEL-SWARM-linux-x64` with `go version -m` |
| Third-party Go dependencies | **none** — `go.sum` is empty and every import is standard library |
| Build flags | `CGO_ENABLED=0`, `-trimpath`, `-ldflags="-s -w"`, `-buildmode=exe`, `compiler=gc` |
| Licence | NOASSERTION (first-party, no licence file in the repository) |

An empty `go.sum` is the strongest supply-chain statement in this whole document. The server tier has **no** third-party code in it at all, which is why the Application Server SRG and every database STIG line in the IL5 analysis are zero rather than small.

| Binary | Bytes | SHA-256 |
|---|---:|---|
| `ANGEL-SWARM-linux-x64` | 6,164,664 | `44a60f5983c816923fdbdd7ce9b28c3525dd86d46a8ae912d6043f00e1bb4cdc` |
| `ANGEL-SWARM-macos-apple-silicon` | 5,917,714 | `6e8c412a1d849430dece2a203d181ec24ed930b1bde160a26d2c2b37c988b0df` |
| `ANGEL-SWARM-macos-intel` | 6,293,840 | `9d7aa3be00f4e669cae80d6516e40e5c9636523b81ac9d5b7228fbc6fef3a00c` |
| `ANGEL-SWARM-windows-x64.exe` | 6,348,288 | `53a189e5c1af3cca8fdcfaf2a6f4798697db5be6566e795c9df2fd6af67a70e7` |

---

## 3. The two ONNX models

| | CRI-Net | all-MiniLM-L6-v2 (int8) |
|---|---|---|
| File | `app/models/ppg_cri.onnx` | `app/models/minilm/minilm.onnx` |
| Bytes | 419,797 | 22,898,176 |
| SHA-256 | `c74bf4c69e3ad743453b997a8d2d456c74475f9408d77a2e4ccf7cf0906ec2b5` | `18b24a03ba4a5c4e4ffa6b091cf6b73e48fc78ee0f74d795fb75f9c9238fab34` |
| Parameters | 104,162 | 22,565,376 |
| ONNX opset | 13 | 14 |
| Licence | **NOASSERTION** — trained in this repository, no licence file written | **Apache-2.0**, declared in `app/models/minilm/meta.json` and matching the upstream `sentence-transformers` model card |
| Provenance | Synthetic cohort. Waveform morphology follows the published response of the peripheral pulse to central volume loss; it is not patient data and no patient data was used. The fielded analogue is CipherOx CRM, FDA 510(k) K173929. | npm @lat.md/embed-minilm-fp16 (fp16 safetensors + tokenizer); huggingface.co is unreachable from the build sandbox |
| Quality | MAE 0.0694 on held-out subjects (split by subject — no person appears in both sets); 95% interval coverage 0.9616 | fp32→int8 minimum cosine similarity 0.9686230421066284; 15/23 evaluation questions correct at rank 1, 22/23 within the top 5 |
| Model card in build | `app/models/ppg_cri.meta.json` | `app/models/minilm/meta.json` |

**A correction worth making explicitly.** The MiniLM weights are commonly described in this project's materials as coming from Hugging Face. The model *is* the Hugging Face `sentence-transformers/all-MiniLM-L6-v2`, and its Apache-2.0 licence is that model's. But the file in this build did not come from huggingface.co: `app/models/minilm/meta.json` records that huggingface.co was unreachable from the build sandbox and the fp16 safetensors and tokenizer were obtained through the npm package `@lat.md/embed-minilm-fp16`, then converted and dynamically quantised to int8 here. That npm package is **not** in `package-lock.json` and is **not** in `node_modules`, so its own integrity hash cannot be produced from this repository. **That is an open supply-chain item, not a closed one.**

Neither model is accompanied by a signature or an in-build integrity check today. Load-time hash verification on both ONNX artefacts is exactly the line the IL5 analysis carries under client-side integrity (§5), and this SBOM is the input that makes it cheap to implement: the two digests above are the values to pin.

---

## 4. First-party code and data

| File | Bytes | SHA-256 | What it is |
|---|---:|---|---|
| `app/index.html` | 658,929 | `fed55e125de4f1ce…` | The shipped single-page application (Claude Design canvas template plus component logic). |
| `app/design.html` | 658,929 | `fed55e125de4f1ce…` | Byte-identical copy of index.html held for the design canvas. |
| `app/selftest.html` | 51,055 | `090aaf6e520a2ccc…` | Standalone engine self-test: 118 assertions against the simulation engine. |
| `app/support.js` | 69,150 | `8fe7df74405f3c55…` | Claude Design canvas runtime (React-based renderer for the x-dc template). |
| `app/angel-engine.js` | 41,243 | `f1e36b5f221544f7…` | Engine adapter: buildRun({seed, deployed, scenario}) and snapshot(run, t). |
| `app/js/sim.js` | 56,334 | `979ca6b062f71741…` | Simulation engine: world, casualty stream, scenarios, payloads, platforms. |
| `app/js/optimizer.js` | 62,098 | `6aea2ba4b945e54e…` | Allocators for both arms, plus the SHA-256 (FIPS 180-4) hash-chained audit log. |
| `app/js/mc.worker.js` | 10,490 | `1bbf2fce4286813f…` | Monte Carlo worker: loads sim.js and optimizer.js verbatim off disk. |
| `app/js/montecarlo.js` | 45,777 | `fa8fc5401cdaa238…` | Monte Carlo pool driver. |
| `app/js/telemetry.js` | 17,254 | `cd6576ac9bef8b8c…` | Receive-only Cursor on Target ingest client (browser side). |
| `app/js/dataproducts.js` | 55,758 | `28bfb449fa50df33…` | FHIR-shaped exports, decision records, JSON Schemas, data catalogue. |
| `app/angel-map.js` | 74,103 | `b07ceddbc97293ff…` | Map host: mounts a renderer into the page, publishes panel insets, owns the scale switch. |
| `app/js/basemap.js` | 6,157 | `6a981fa9f94e0b87…` | Basemap decoder and the procedural relief field. No tile is fetched from anywhere. |
| `app/js/map.js` | 68,337 | `5d915b67dcaa5e1d…` | Flat tactical renderer, both arms, and the map theme tokens every renderer reads. |
| `app/js/geo.js` | 106,450 | `033bfbae15d07f27…` | Theatre geography clipped to the two combatant commands, and the place-name gazetteer. |
| `app/js/geo3d.js` | 201,238 | `9447a1516deb66b1…` | Tactical GPU renderer (deck.gl) with its own transport bar and comms banner. |
| `app/js/theater.js` | 19,575 | `11cafbf75d7feecc…` | Canvas theatre renderer — the fallback that takes the picture back on GPU context loss. |
| `app/js/theater3d.js` | 443,996 | `5a925b072180be77…` | GPU theatre renderer, and the canvas-2D globe. Carries the world coastline and international-boundary geometry embedded as integer deltas (Natural Earth 1:50m via world-atlas, generalised offline) — no separate asset and no HTTP resource. |
| `cmd/angelswarm/main.go` | 10,881 | `19b0d398345b2265…` | Go launcher: serves app/ on 127.0.0.1 and rejects non-loopback peers. |
| `cmd/angelswarm/telemetry.go` | 9,640 | `dff806d385106ac0…` | Optional receive-only CoT/UDP listener, off unless -cot is passed. |
| `cmd/cotsim/main.go` | 4,947 | `b8a69cf5646e7c0d…` | CoT device emitter used to exercise the ingest path. |
| `app/data/basemap.json` | 329,624 | `21ffbf3737f13e28…` | In-folder basemap. No tile server and no tile CDN anywhere in this system. |
| `app/data/doctrine.json` | 448,266 | `ff1889ab266de03b…` | Paraphrased doctrine corpus for retrieval. Demonstration text, not an extract of any publication. |

Digests are truncated here for width; the JSON carries all 64 characters. All of this is first-party and carries **no licence file**, so it is `NOASSERTION` throughout rather than assumed to be permissive.

---

## 5. Typefaces

11 woff2 faces ship in `app/fonts/` — IBM Plex Sans, IBM Plex Mono and Barlow Condensed — so that no paint ever reaches `fonts.googleapis.com`. That is a real security property and it is the reason they are vendored at all.

**Their licence is `NOASSERTION` and that is a finding, not an omission.** The filenames follow the Fontsource naming convention exactly, but no `@fontsource/*` package is installed in `node_modules`, no face matches any file in `node_modules` by digest, and no licence file ships beside them. IBM Plex and Barlow are both distributed upstream under the SIL Open Font License 1.1, but this repository contains nothing that proves the bytes in `app/fonts/` came from those distributions. **Resolve before any release: obtain the faces from a named source, vendor the OFL text beside them, and re-run this generator.**

| Face | Bytes | SHA-256 |
|---|---:|---|
| `barlow-condensed-latin-500-normal.woff2` | 21,424 | `460f141ec8f6c9a1…` |
| `barlow-condensed-latin-600-normal.woff2` | 22,308 | `215a93c696f44203…` |
| `barlow-condensed-latin-700-normal.woff2` | 22,444 | `3787a5a419171630…` |
| `ibm-plex-mono-latin-400-normal.woff2` | 14,708 | `08949f728dc52d52…` |
| `ibm-plex-mono-latin-500-normal.woff2` | 14,888 | `01d285447409c8a5…` |
| `ibm-plex-mono-latin-600-normal.woff2` | 15,620 | `0d1f0b8d0722224e…` |
| `ibm-plex-mono-latin-700-normal.woff2` | 14,908 | `4f84d86cfd060f4d…` |
| `ibm-plex-sans-latin-400-normal.woff2` | 22,588 | `3b646991d30055a9…` |
| `ibm-plex-sans-latin-500-normal.woff2` | 24,184 | `0717336fb31fcdcd…` |
| `ibm-plex-sans-latin-600-normal.woff2` | 24,252 | `8960851d691c054e…` |
| `ibm-plex-sans-latin-700-normal.woff2` | 22,832 | `42e7b0c143c19df9…` |

---

## 6. Declared but not shipped

These are resolved in `package-lock.json` and used at build or asset-preparation time. **None of them is vendored into `app/` and none of them reaches a browser.** They are carried in the JSON with `scope: "excluded"` so an assessor reading the lock file does not have to work out on their own which half of it ships.

| Package | Version | Licence | Role |
|---|---|---|---|
| `esbuild` | 0.25.10 | MIT | build / asset preparation only |
| `maplibre-gl` | 6.3.0 | BSD-3-Clause | build / asset preparation only |
| `pmtiles` | 4.5.0 | BSD-3-Clause | build / asset preparation only |
| `topojson-client` | 3.1.0 | ISC | build / asset preparation only |
| `world-atlas` | 2.0.2 | ISC | build / asset preparation only |
| `@huggingface/transformers` | 4.2.0 | Apache-2.0 | build / asset preparation only |

---

## 7. Validation performed

The JSON was validated against **the CycloneDX project's own published JSON Schema**, obtained from the specification repository and hashed, using ajv with formats enforced. The full record is in `OUT/ANGEL-SWARM-SBOM-validation.txt`; it is reproduced here verbatim.

```
ANGEL SWARM — SBOM validation record
date: 2026-09-05T06:17:53.292Z

file        : OUT/ANGEL-SWARM-SBOM.json
declared    : bomFormat=CycloneDX  specVersion=1.6
components  : 49 top-level, 38 nested file sub-components

validator   : ajv 8.20.0 + ajv-formats 3.0.1
schema      : CycloneDX bom-1.6.schema.json (draft-07), fetched from
              https://raw.githubusercontent.com/CycloneDX/specification/master/schema/bom-1.6.schema.json
              sha256 18f57f7482593bad9f21b4feed09084640cbeff419d62ad5090c5ceccca5b37d
              with its two companion schemas spdx.schema.json and jsf-0.82.schema.json
options     : strict:false (the CycloneDX schema uses $comment and non-standard keywords ajv
              rejects in strict mode); allErrors:true; formats enforced via ajv-formats, with
              iri and iri-reference registered explicitly since ajv-formats does not carry them.
              One format in the schema, idn-email, is not implemented by ajv-formats and is
              reported as ignored. No field in this document uses it.

RESULT      : VALID — the document conforms to the CycloneDX 1.6 JSON Schema

WHAT THIS DOES AND DOES NOT ESTABLISH
  It establishes that the document is well-formed CycloneDX 1.6: every required field is
  present, every enumerated value (hash algorithms, component types, licence identifiers,
  lifecycle phases, external-reference types) is one the specification allows, and every
  bom-ref resolves. It establishes nothing about whether the contents are TRUE. The hashes,
  sizes and versions in the document were measured off the files on disk by _sbom_gen.mjs at
  generation time and can be re-measured by anyone with the repository; the licence
  determinations were read out of the packages themselves and are cited per component.
  No software-composition-analysis scan has been run against this SBOM.
```

---

## 8. What this SBOM does not tell you

- It does **not** attest that any of these components is free of known vulnerabilities. No SCA scan has been run against it. Feeding this file to a scanner is the next step, not a step already taken.
- It does **not** carry an SSDF (NIST SP 800-218) attestation, a signature, or an in-toto/SLSA provenance statement. The build is not reproducible today.
- The REBUNDLED rows cannot be verified against the registry by digest. Establishing a reproducible bundling step is what would turn those rows into VERBATIM ones.
- Two licence cells are genuinely unresolved — the typefaces, and the npm route the MiniLM weights arrived by. Both are named above rather than papered over.

_End of bill of materials._
