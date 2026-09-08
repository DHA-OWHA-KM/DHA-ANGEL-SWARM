# GITHUB-PREP — measurements, findings, and the decisions that are yours

**Prepared 5 September 2026.** Everything below was measured on this tree, not assumed. Nothing was deleted, moved or committed. Two files were created: `/README.md` and `/.gitignore`. This file is the third.

---

## 1. What the repository actually weighs

**Total working tree: 2.7 GB.** Every directory over 5 MB:

| Directory | Size | Disposition |
|---|---:|---|
| `node_modules/` | 1.4 GB | ignored — restorable from `package-lock.json` |
| `OUT/` | 778 MB | **split**: 860 KB of Markdown/JSON docs tracked, 599 MB of release zips + 113 MB of video + 96 MB of screenshot subdirectories ignored |
| `BACKUP/` | 240 MB | ignored |
| `app/` | 115 MB | **tracked in full** — this is the product |
| `MOCKUPS/` | 13 MB | ignored |
| `TEAMMATE/` | 11 MB | ignored — **see decision 3** |
| `shots/` | 9.7 MB | ignored |
| `shots_sha/` | 9.0 MB | ignored |
| `dp_out/` | 8.5 MB | ignored |
| `spike/` | 8.2 MB | ignored |
| `shots3/` | 8.2 MB | ignored |
| `_cw/` | 7.0 MB | ignored |
| `shots_dp/` | 6.5 MB | ignored |
| `final-draft/` | 5.0 MB | ignored |
| `DECK/` | 5.0 MB | ignored — **see decision 6** |

Plus, at the top level: **35 MB of prebuilt Go binaries** (nine files across four platforms), **89 MB of loose PNG screenshots** (103 files), and ~250 single-purpose `.mjs` probe scripts.

**Result after `.gitignore`: approximately 121 MB tracked**, down from 2.7 GB — a 96% reduction.

### GitHub file-size limits

GitHub warns above **50 MB** per file and rejects above **100 MB**.

- **Nothing in this repository exceeds 100 MB.** Nothing would be rejected.
- **Four files exceed 50 MB and would warn** — all four are `BACKUP/*.tar.gz` at ~61 MB each, and all four are ignored.
- **The largest file that will actually be tracked is 34.0 MB** (`app/vendor/duckdb/duckdb-eh.wasm`). The full tracked-file-over-5-MB list:

| File | Size | Why it is tracked |
|---|---:|---|
| `app/vendor/duckdb/duckdb-eh.wasm` | 34.0 MB | the analytical database the app runs on |
| `app/models/minilm/minilm.onnx` | 21.8 MB | the retrieval embedding model |
| `app/video/ANGEL-SWARM-film-v3-HQ.mp4` | 17.6 MB | the film pane loads it by relative path; the app breaks without it |
| `app/vendor/ort/ort-wasm-simd-threaded.wasm` | 12.9 MB | ONNX Runtime |
| `app/vendor/wllama/wllama.wasm` | 7.3 MB | the optional LLM runtime |
| `app/video/ANGEL-SWARM-film-60s-HQ.mp4` | 6.3 MB | second cut, loaded by the same pane |

---

## 2. Findings

### 2.1 The Go binaries ARE reproducible from source in this tree — verified, not assumed

`go.mod` declares **zero module requirements**, so `cmd/` builds fully offline. Tested on this machine with Go 1.24.7:

```
go build -ldflags="-s -w" -o angel ./cmd/angelswarm     →  6,226,212 bytes
                                shipped linux-x64       →  6,164,664 bytes   (+1.0%)
go build -ldflags="-s -w" -o cotsim ./cmd/cotsim        →  2,236,708 bytes
                                shipped cotsim linux    →  2,183,352 bytes   (+2.4%)
```

The binaries built here run correctly — the built launcher served `app/`, the app booted with **zero page errors**, and `selftest.html` returned **118 passed / 0 failed**. They are not byte-identical to the shipped August binaries, which is expected: those were compiled with a different Go point release and Go embeds build metadata. **This is not a finding against the repository — the source is the artefact.** The nine prebuilt binaries are `.gitignore`d and the build command is in the README.

### 2.2 There is an empty git repository nested inside `OUT/` — this will silently break your commit

`OUT/.git` exists. It has **no commits, no remote, and zero objects**. If you run `git init` at the repository root with that directory in place, git treats `OUT/` as a **gitlink** — a submodule pointer — and **every document in `OUT/` is silently excluded from your commit**. You will get a repository whose README links to fourteen documents that are not there.

**Recommended action, for you to take (I did not touch `OUT/`):** `rm -rf OUT/.git` before `git init`. Nothing is lost — it has never held a commit.

### 2.3 Secrets and credentials: nothing found

Scanned the tree for API keys, secret keys, access tokens, bearer tokens, passwords, private-key PEM headers, AWS access-key IDs, Slack `xox*` tokens, GitHub `ghp_*` tokens and OpenAI `sk-*` tokens, across `.js .mjs .json .html .go .py .md .sh .ps1 .yml .yaml .env*`.

| Location | Verdict |
|---|---|
| `app/data/doctrine.json` line 1 | **False positive.** The string `AkIAQ…` occurs inside a base64 payload and matched the AWS `AKIA` pattern by coincidence. Not a credential. |
| `app/js/sqlwasm.js` line 3 | **False positive.** Four `AKIA`-shaped substrings inside the base64-encoded SQLite WASM blob. Not credentials. |

**No real credential, key, token or secret was found anywhere in the tree.** No `.env` file exists outside `TEAMMATE/`, where the only two are `.env.example` templates with no values.

Email-address scan across all source and document files (excluding `node_modules/`): **no personal or organisational email addresses.** The only matches anywhere were `@example.com` test fixtures and `@openssh.com` protocol identifiers inside `node_modules/`, which is ignored.

### 2.4 Personal and third-party content that is not ANGEL SWARM

- `DECK/jefferson.pptx` (1.2 MB) is an **unrelated internal work presentation** — `docProps/core.xml` gives its title as *"API/KM Introduction and Recommendation"*, creator *Junayd S. Park*. It is fully extracted into `DECK/jx/` and has thumbnails at `DECK/jefferson-thumbs.jpg` and `DECK/slide-1.jpg`. It appears to have been used as a visual style reference. **It has nothing to do with this project and should not be published from this repository.** `DECK/` is ignored.
- `DECK/seal.png` (494 KB) is an official seal image. Reproduction of DoD and Service seals is restricted (32 CFR Part 507); a public repository is a different exposure from a slide shown once in a room. Ignored with the rest of `DECK/`.

---

## 3. Decisions — yours, not mine

These are the five you asked for, plus one I found. Each has a recommendation and the cost of taking it.

---

### Decision 1 — The licence

**I have not picked one and you should not let anyone pick one for you.** This is the single decision on this list with legal consequence, and the situation is genuinely mixed.

**What makes it mixed:**

1. **17 U.S.C. § 105.** Works prepared by an officer or employee of the US Government *as part of that person's official duties* are not subject to copyright protection in the United States. If this work is within your official duties as a DHA employee, **you cannot license it, because you do not hold a copyright to license.** Applying an MIT or Apache header to such a work asserts a right that does not exist. Note the statute is silent about foreign jurisdictions, where US Government works may still attract protection — which is why CC0 exists as a belt-and-braces option.
2. **Contractor-authored content is different.** § 105 does not reach works by contractors; those are ordinarily copyrightable by the contractor, with the Government taking a licence under the relevant data-rights clause. **If any part of this tree was written by anyone other than a federal employee acting in official duties, § 105 does not cover that part**, and you need to know which parts before you publish.
3. **The vendored third-party components carry their own licences regardless.** DuckDB-WASM, ONNX Runtime Web, wllama, deck.gl, ECharts, CodeMirror, µPlot, MiniLM and the icon set are all separately licensed — mostly MIT and Apache-2.0 — and stay licensed that way no matter what you do at the top level. The SBOM (`OUT/ANGEL-SWARM-SBOM.md`) enumerates them.
4. **Two licence cells are unresolved.** The eleven vendored typefaces are **NOASSERTION** (security register **R-6**), and the MiniLM acquisition route through an npm package absent from `package-lock.json` is **R-5**.

**The options:**

| Option | What it says | Cost |
|---|---|---|
| **No `LICENSE` file** | Nothing. Under GitHub's terms of service the default is **all rights reserved** — viewers may view and fork within GitHub, and nothing else. | Your work cannot be reused by the program offices you are arguing it should be subsumed into. This is the *loudest* option, not the quietest. |
| **`LICENSE` = "US Government work, 17 U.S.C. § 105, public domain in the United States"** | The legally accurate statement if this is all official-duty work. Often paired with a CC0-1.0 dedication for non-US jurisdictions. | Requires you to be certain every contributor was a federal employee on official duties. Get that in writing. |
| **MIT or Apache-2.0** | The default open-source answer. Apache-2.0 additionally grants patent rights and requires notice preservation. | **If § 105 applies, this asserts a copyright you do not hold.** Legally incoherent, and a sharp reviewer will notice. |
| **CC0-1.0** | Waives whatever rights may exist anywhere, without asserting that they do. | The safest hedge, and increasingly the pattern for federal open-source. Not a software licence, so no patent grant and no warranty disclaimer. |
| **Explicit "not licensed for reuse; published for evaluation only"** | Honest about a hackathon prototype nobody should build on yet. | Closes the door you spent the complement section opening. |

**My recommendation:** ship a `LICENSE` file **only after your DHA legal or public-affairs office tells you which of these applies.** In the meantime the README says plainly that no licence file exists and that this is an open decision, which is more defensible before a judge than a licence chosen by guesswork. **Whatever you choose, add a `NOTICE` or `THIRD-PARTY-LICENSES` file pointing at the SBOM** — the third-party obligations are real and are independent of the top-level choice.

**Do not resolve this by silence.** Publishing with no `LICENSE` is a decision with a default, and the default is the most restrictive outcome available.

---

### Decision 2 — Public or private repository

**The content is UNCLASSIFIED, synthetic throughout, and carries no PHI** — that part is settled and documented. The live question is different: the README and the document set discuss **DoD program alignment** in specific terms — Maven Smart System, Open DAGIR, CDAO Agent Network, DIU AI-Assisted Triage, TATRC MEDRAS, PMA-263, a named May 2026 44th Medical Brigade validation.

Every one of those claims is sourced to an open, citable public statement in `RESEARCH/complement-landscape.md`, with a URL and a date. **The aggregation is nevertheless new.** Assembling public facts into "here is where the Department's autonomy portfolio has a gap, and here is a system that fills it" is an analytic product. That is not a classification problem, but it can be a **public-affairs and pre-publication-review problem** for a federal employee.

| Option | Consequence |
|---|---|
| **Public** | Maximum credibility for the hackathon: judges can clone it, run the self-test and check every number. Anyone can read your gap analysis, including the vendors currently competing in those lanes. |
| **Private, with judges added as collaborators** | Same verifiability for the people who matter, no public exposure. Costs you the "here, run it yourself" moment in the room, and adding collaborators mid-event is friction. |
| **Public, but strip program-alignment specifics to a separate document you share directly** | Weakens the strongest section in the package. Not recommended — the specifics *are* the value. |

**My recommendation: private first, flipped to public once your PAO or supervisor has seen the README.** Flipping private→public takes ten seconds. Un-publishing does not work — forks, caches and archives persist. Given you are presenting in days and this is the one irreversible step on the list, take the reversible order.

---

### Decision 3 — `TEAMMATE/` — someone else's repository

**`TEAMMATE/physiological_deadline_app-main/` (11 MB) is a complete copy of another person's project**, given to you to review. It is a Streamlit + Python medical-logistics decision-support application, version 2.10.0, with its own README, CHANGELOG, `.github/` workflows, tests and docs.

**Publishing it in your repository would be republishing someone else's code under your repository's name and licence, without their permission.** It is the clearest and most serious hygiene issue in this tree.

I have **not deleted it** — you were given it for a reason and it is not mine to remove. It is `.gitignore`d, with the reasoning written inline in the ignore file so nobody removes that line casually.

| Option | Consequence |
|---|---|
| **Keep it ignored** (what I set up) | Safe. It stays on your disk, out of the repository. Risk: a future `git add -f` or an ignore-file edit re-admits it. |
| **Move it out of the tree entirely** — e.g. `~/review/` | Safest. Eliminates the accident case. Recommended if you will not need it during the event. |
| **Ask the author** whether they want it referenced, and link to their repository instead | The collegial option, and worth doing regardless — a link costs nothing and credits them properly. |

**My recommendation: keep the ignore, and move the directory out of the tree before you run `git init`.** Then a mistake is impossible rather than merely unlikely.

---

### Decision 4 — The eleven unlicensed typefaces

`app/fonts/` ships eleven `.woff2` faces — IBM Plex Sans, IBM Plex Mono, Barlow Condensed — so that no paint ever reaches `fonts.googleapis.com`. **That is a real security property and it is why they are vendored at all.**

Their licence is **NOASSERTION** and the SBOM is explicit that this is a finding, not an omission: the filenames follow the Fontsource convention exactly, but **no `@fontsource/*` package is installed, no face matches any file in `node_modules` by digest, and no licence file ships beside them.** IBM Plex and Barlow are both distributed upstream under the SIL Open Font License 1.1 — but nothing in this repository proves the bytes in `app/fonts/` came from those distributions. This is risk **R-6**.

**Why a public repository is a different exposure from a demo zip.** A zip handed to a judge is a private transfer to a named recipient for evaluation. A public repository is **redistribution to the world, in perpetuity, indexed and forkable** — which is precisely the act a font licence governs. OFL 1.1 permits redistribution freely, *but requires the licence text to accompany the fonts*. Right now it does not. So even in the near-certain case that these files are OFL, **you are currently out of compliance with the licence you are relying on**, and the fix is fifteen minutes.

| Option | Consequence |
|---|---|
| **Re-fetch from a named source and vendor the OFL text** (`npm i @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono @fontsource/barlow-condensed`, copy the faces and each package's `LICENSE`, re-run `_sbom_gen.mjs`) | Closes R-6 completely and turns NOASSERTION into OFL-1.1 with evidence. **Recommended.** ~15 minutes. |
| **Ship as-is with the SBOM finding visible** | Defensible — you disclosed it — but you are redistributing type without licence text. |
| **Drop the vendored fonts, use system stacks** | Loses the visual identity and, more importantly, loses the zero-egress property that was the point. Not recommended. |

**My recommendation: fix it before publishing.** It is the cheapest open finding on the whole list and the only one that changes character when the repository goes public.

---

### Decision 5 — Git LFS

**Recommendation: do not use LFS.** Reasoning:

- **Nothing requires it.** No file exceeds 100 MB. No *tracked* file exceeds 50 MB. The largest is 34.0 MB.
- **LFS breaks the thing this repository is for.** LFS files are stored as pointer text at their paths. Raw file URLs, GitHub Pages and most "download the tree and serve `app/`" workflows **fetch the pointer, not the binary**. Someone who downloads a ZIP of a repository whose `app/vendor/*.wasm` is in LFS gets an application that does not run, with no error that explains why. For a repository whose entire purpose is "clone it and run the self-test", that is a bad trade.
- **LFS has quotas.** Free accounts get 1 GB storage and 1 GB/month bandwidth. A 121 MB repository going viral for one day exhausts the bandwidth quota and **LFS fetches then fail for everyone** until you pay or the month rolls over.
- **The cost of not using it is one 121 MB clone.** That is a normal size for a repository that vendors a database engine and an ML runtime.

**When to revisit:** if you later commit new versions of the WASM or video binaries repeatedly, history grows by the full size each time and a shallow-clone or LFS migration becomes worth it. For a prototype published once, it is not.

---

### Decision 6 — `DECK/` (I found this one; you should look at it)

`DECK/` is ignored, but you should know what is in it rather than trusting an ignore line. It contains **`jefferson.pptx` — an unrelated internal work presentation titled "API/KM Introduction and Recommendation"** — fully extracted into `DECK/jx/`, plus thumbnails, plus an official seal image (`seal.png`, restricted reproduction under 32 CFR Part 507), alongside the two genuine ANGEL SWARM decks.

**Recommendation:** move `jefferson.pptx`, `jefferson-thumbs.jpg`, `slide-1.jpg` and `DECK/jx/` out of the tree entirely. If you want the two ANGEL SWARM decks published, move *those* to a clean `docs/deck/` and un-ignore that path specifically. Do not resolve this by un-ignoring `DECK/`.

---

## 4. Suggested order of operations

1. Move `TEAMMATE/` out of the tree (decision 3).
2. Move the `jefferson*` files and `DECK/jx/` out of the tree (decision 6).
3. `rm -rf OUT/.git` (finding 2.2) — **do this or your documents will not commit.**
4. Re-fetch the fonts with their OFL text and re-run `_sbom_gen.mjs` (decision 4).
5. Ask legal about the licence; add `LICENSE` and `THIRD-PARTY-LICENSES` when you have the answer (decision 1).
6. `git init`, `git add -A`, and **read `git status` before committing** — confirm the tracked count is in the low thousands of files and roughly 121 MB, not 2.7 GB.
7. Create the repository **private** (decision 2). Flip it public after review.

---

## 5. What was verified, and how

Everything asserted in the README was checked against this tree rather than carried over from a prior document.

| Claim | How it was verified | Result |
|---|---|---|
| 23 / 34 / 35 deaths on 20 / 38 / 0 sorties, seed 42, PACOM_CORAL, deployed | `app/selftest.html` lines 290–293, 642, run headless against the built launcher | asserted and passing |
| 118 assertions | ran the self-test in headless Chromium | **118 passed, 0 failed** |
| PACOM CORAL row of the win table | `node winprob.mjs PACOM_CORAL 200` | 24.23 / 29.14, mean −4.905, CI −5.215…−4.595, d<sub>z</sub> −2.191, 0 worse / 1 tie / 199 better — **identical to the published table** |
| EUCOM FJORD row (the weakest theatre) | `node winprob.mjs EUCOM_FJORD 200` | 16.75 / 18.61, mean −1.865, CI −2.045…−1.685, 4 worse / 23 tie / 173 better, **worst single-battle diff = +1** — identical, and confirms "never worse by more than one" |
| A server is required; `file://` breaks it | `cmd/angelswarm/main.go` header comment and the Web Worker constraint | confirmed |
| The launcher works, built from source | built it, served `app/`, loaded `index.html` in headless Chromium | title correct, **0 page errors** |
| `python3 -m http.server` is a valid alternative | served `app/` on 8899 | `index.html` 200, `selftest.html` 200, `.wasm` 200 with `content-type: application/wasm` |
| `winprob.mjs` needs no `npm install` | read its imports | `fs` and `vm` only — Node builtins |
| Two model files ship; no LLM weights ship | `find app/models -type f`; searched the tree for `*.gguf` | `ppg_cri.onnx` (420 KB) and `minilm/minilm.onnx` (22.9 MB). **No GGUF anywhere.** `get-model.sh` fetches Qwen2.5-0.5B on request to `app/models/llm.gguf`. |
| Eleven typefaces, no licence file | `ls app/fonts/` | 11 `.woff2`, no `LICENSE`/`OFL.txt` beside them |
| Risk register is open | counted rows in `OUT/ANGEL-SWARM-SECURITY-AND-ATO.md` §6 | **R-1 through R-11** |
| Arm names | `app/js/app.js:339` and throughout `charts.js` | `'CURRENT — TRIAGE & PROXIMITY'` is the literal in the code, in `app.js`, `charts.js` and `winprob.mjs` alike. The superseded arm name from the 19 August table appears nowhere in the shipped engine; every remaining `Class VIII` string in the code is the correct doctrinal supply-class usage. |

---

## 6. On `CONTRIBUTING.md` — not written, and why

**I judged it does not earn its place, and writing one would have been actively wrong.**

A `CONTRIBUTING.md` exists to answer "how do I send you a change and under what terms will you take it." **You cannot answer the second half of that question yet.** Until decision 1 is settled you do not know whether this work is a § 105 Government work, and an outside contribution is *unambiguously* copyrightable by its author. Merging one into a public-domain Government work creates a mixed-rights codebase — the exact problem a CLA or DCO exists to manage, and neither exists here. A file that says "PRs welcome" would be inviting a legal tangle three days before a presentation.

The two things such a file would legitimately carry are already placed better:

- **How to verify the claims** — run `selftest.html`, run `winprob.mjs`. That belongs in the README where a judge will actually see it, and it is there.
- **How to challenge a number** — worth having, and worth having as a GitHub Issue template rather than a contributing guide, if you want it at all. The project's credibility rests on the numbers being checkable, so an issue template titled "This figure is wrong" would be a genuinely good look. It is a five-minute addition and it is not required to publish.

**Revisit after the licence is settled.** At that point a real `CONTRIBUTING.md` with a DCO line is worth ten minutes.
