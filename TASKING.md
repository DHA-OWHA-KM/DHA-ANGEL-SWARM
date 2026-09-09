# ANGEL SWARM — NDIA Hackathon 2026 tasking

`UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY`

Team assignments for the NDIA 2026 hackathon submission, taken from the team tasking note of 8 September 2026 and mapped onto what is actually in this repository. **Team DHA RESCUE.**

**The agreed baseline:** use JP's solution as the submission, with additional features carried over from Julian's app.

Contact details for the team are held off this repository deliberately. Coordinate through the channel the team agreed rather than through GitHub.

---

## Status at a glance

| # | Owner | Task | Status |
|---|---|---|---|
| 1.1 | Mr. Park | Get the solution into a Git repository | **Done** — this repository |
| 1.2 | Mr. Park | Get the presentation outline to the team | **Open** |
| 2.1 | Antoine | Polish both demo videos — narration, background music, smooth visuals | **Open** |
| 2.2 | Antoine | Upload the use case and the data — public version only | **Partly done** — public use case is in the repository; confirm it is the version to submit |
| 3.1 | Julian / Barinder | Deep-dive testing | **Open** |
| 4.1 | Malik | Get versed in the use case | **Open** |
| 4.2 | Malik | Assign individuals per section | **Open** |
| 5.1 | Barinder | Develop a methodology to communicate updates to each other | **Open** |
| 5.2 | Barinder | Create the slide deck | **Partly done** — two decks ship; confirm whether these are the submission deck or a starting point |

---

## 1 — Mr. Park

### 1.1 Get the solution in a Git repository — **DONE**

- [x] All three v6.5 zips merged into one tree
- [x] Restructured for publication: every written deliverable under [`Documentation/`](Documentation/), the two films under [`Videos/`](Videos/)
- [x] A `.md` rendering created for every document, and a `README.md` for every folder, so the whole repository reads in the browser
- [x] [`README.md`](README.md) rewritten in the DHA-IRON-VEIN format — What's in the box, The artifacts, Quick start, Architecture, Interface surface, Security posture, DoW IL5 deployment posture, License & status
- [x] The eight prebuilt binaries tracked so a plain **Download ZIP** is a working program
- [x] [`CHECKSUMS-REPO.txt`](CHECKSUMS-REPO.txt) regenerated for the repository layout

**Still to decide, and only Mr. Park can decide them** — the six open items in [`Documentation/GITHUB-PREP.md`](Documentation/GITHUB-PREP.md):

- [ ] **The licence.** No `LICENSE` file exists. 17 U.S.C. § 105 makes this a question for DHA legal or public affairs, not a default to pick. Publishing without one means all rights reserved — the loudest option, not the quietest.
- [ ] **Public or private.** Recommendation on file: private first, flipped public once PAO or a supervisor has read the README. Private→public takes ten seconds; un-publishing does not work.
- [ ] **The eleven vendored typefaces (R-6).** No licence text ships beside them. A public repository is redistribution, which is the act a font licence governs. Roughly fifteen minutes to close.
- [ ] **The DHA seal** appears on slide 1 of the pitch deck. Reproduction of DoD and Service seals is restricted under 32 CFR Part 507, and a public repository is a different exposure from a slide shown once in a room.

### 1.2 Get the presentation outline to the team — **OPEN**

The material for it already exists and should not be written from scratch:

- [ ] Start from [`Documentation/ANGEL-SWARM-REHEARSAL.md`](Documentation/ANGEL-SWARM-REHEARSAL.md) — the presenter's pack: the four-minute script, the click path, the hostile questions and the failure drills
- [ ] The five-screen tour is in [`START-HERE.md`](START-HERE.md): Command Overview → Theater Map → Evidence → Ops Center Wall → Settings → Engine self-test
- [ ] The three asks are already written on slide 3 of the pitch deck — ninety seconds, one theatre of their choosing, one honest question
- [ ] Circulate with section owners named, so 4.2 can be closed against it

---

## 2 — Antoine

### 2.1 Polish both demo videos — **OPEN**

Both cuts are silent H.264 today. Confirmed by inspection: single video stream, no audio stream in any of the four files.

| Cut | Repository copy | The app's own copy |
|---|---|---|
| Full, 3 min 15 s | [`Videos/ANGEL-SWARM-film-full-3m15s.mp4`](Videos/) | `app/video/ANGEL-SWARM-film-v3-HQ.mp4` + `-720.webm` |
| Short, 60 s | [`Videos/ANGEL-SWARM-film-short-60s.mp4`](Videos/) | `app/video/ANGEL-SWARM-film-60s-HQ.mp4` + `-720.webm` |

- [ ] **Narration** — script it from the rehearsal pack so the film and the spoken pitch do not contradict each other
- [ ] **Background music** — check the licence before it goes into a Government submission; a rights-cleared or public-domain bed only
- [ ] **Smooth visuals**
- [ ] **Re-encode all four files, not two.** The application plays its own copies from `app/video/` by relative path and needs both the MP4 and the VP9 WebM fallback. A polished pair in `Videos/` with the originals still in `app/video/` means the film pane shows the old cut.
- [ ] Keep the durations — `app/index.html` prints `3 min 15 s · 5,850 frames` and `1 min 00 s · 1,800 frames` on the Data Sources sheet, and those strings are in the page
- [ ] Regenerate `CHECKSUMS-REPO.txt` after any re-encode

### 2.2 Upload use case and data — **PARTLY DONE**

- [x] The public use case is in the repository: [`Documentation/Physiological-Deadline-Blood-Support-USE-CASE-PUBLIC.md`](Documentation/Physiological-Deadline-Blood-Support-USE-CASE-PUBLIC.md) — the sponsor-facing release, **with the method withheld**
- [ ] **Confirm this is the version to submit.** The full internal use case is [`Documentation/ANGEL-SWARM-use-case.md`](Documentation/ANGEL-SWARM-use-case.md) and it is a different document. The tasking note is explicit: *be sure the uploaded use case is the public version.*
- [ ] Decide what "the data" means for the submission. Candidates already in the repository, all synthetic:
  - the ten exports on **Data Sources → DATA PRODUCTS** — a FHIR-shaped bundle of 4,151 resources, the hash-chained decision record, the run result as JSON and CSV, five JSON Schemas and a data catalogue
  - [`app/data/doctrine.json`](app/data/) and [`app/data/basemap.json`](app/data/)
  - the CRI-Net training artefacts in [`train/`](train/)
- [ ] Nothing in the package is real. Every number comes from `createWorld(seed)`. Say so on the upload rather than letting a reviewer assume otherwise.

---

## 3 — Julian / Barinder

### 3.1 Deep-dive testing — **OPEN**

There is a lot of self-verification already built in. Start by running it rather than by writing new tests.

- [ ] **The engine self-test.** Serve the app and open `/selftest.html` offline. Use its live summary rather than a copied total. The 9 September 2026 Windows-package run recorded 196 total checks: 195 passed and the EUCOM_FJORD nominal seed-42 directional assertion failed (16 > 15). A red row is a real disagreement between what the engine does and what the package claims.
- [ ] **The seven-theatre table.** From the repository root:
      `node Documentation/verification/winprob.mjs PACOM_CORAL 200` and the other six. It should reproduce [`ANGEL-SWARM-WIN-PROBABILITY-v5.9.md`](Documentation/ANGEL-SWARM-WIN-PROBABILITY-v5.9.md) exactly.
- [ ] **The network claim.** Pull the cable, spin the globe, walk all fourteen destinations and all four map scales. Nothing should be fetched.
- [ ] **The ingest path.** `-cot :6969` plus `cotsim -devices 125 -rate 0.05`, then kill the emitter and watch LINK STALE → LINK DOWN while tasking continues on last-known state. This tests only the receive-only, off-by-default prototype CoT path and its non-ratified medical extension. Sempulse Halo (example), CipherOx CRI M1 (reference). BATDOK-J is a separate plausible producer/interface. ANGEL SWARM has not tested an integration with any real Sempulse Halo, CipherOx CRI M1 or BATDOK-J, and claims no compatibility, military fielding, FDA status or completed integration. That behaviour is the whole concept.
- [ ] **All four platforms.** The binaries are tracked now, so test the actual download path: Download ZIP → unzip → `chmod +x` → run. Windows, macOS Apple Silicon, macOS Intel, Linux.
- [ ] **The known open defect.** 22 console errors are recorded in [`Documentation/verification/security-and-sbom/verification.md`](Documentation/verification/security-and-sbom/verification.md) — unsubstituted template expressions painted into SVG attributes. Confirm whether they still occur in v6.5 and whether they are visible on screen.
- [ ] **The one we would rather find ourselves.** R-11: the doctrine similarity score on Analyst Terminal → DOCTRINE and in Ask ANGEL's doctrine answers is term overlap over eleven inline passages, while the badge above it names the sentence encoder. Confirm the wording of the fix before a judge finds the label.
- [ ] **Julian's app.** The agreed baseline is JP's solution *with additional features from Julian's app*. Name which features, and whether each is a port or a re-implementation — [`Documentation/design-decisions/port.md`](Documentation/design-decisions/port.md) records two ideas already ported and one deliberately not taken (the Mapbox satellite basemap, rejected because it is unreproducible offline and would trade away the zero-egress property the whole security posture rests on).
- [ ] File anything found as a GitHub Issue on this repository so it is not lost in chat.

---

## 4 — Malik

### 4.1 Get versed in the use case — **OPEN**

Reading order, shortest path to competence:

1. [ ] [`START-HERE.md`](START-HERE.md) — run it, take the five-screen tour, press Deploy and watch the arms separate
2. [ ] [`Documentation/Physiological-Deadline-Blood-Support-USE-CASE-PUBLIC.md`](Documentation/Physiological-Deadline-Blood-Support-USE-CASE-PUBLIC.md) — the public use case
3. [ ] [`README.md`](README.md) § *Where this sits in what the Department has already bought* — the answer to the first question a program office asks
4. [ ] [`README.md`](README.md) § *What is deliberately NOT claimed* — the boundaries, so nobody on the team overclaims in a room
5. [ ] [`Documentation/ANGEL-SWARM-DHA-alignment-onepager.md`](Documentation/ANGEL-SWARM-DHA-alignment-onepager.md) — the prototype against what DHA leadership asked for, on one page
6. [ ] [`Documentation/ANGEL-SWARM-REHEARSAL.md`](Documentation/ANGEL-SWARM-REHEARSAL.md) — the hostile questions and the prepared answers

The three numbers everyone on the team should be able to say without looking: **23 against 34** at seed 42 in PACOM CORAL; **seven theatres won from seven** over 1,400 paired battles; **worse in five of 1,400, never by more than one**. Quote the interval, not the seed.

### 4.2 Assign individuals per section — **OPEN**

Blocked on 1.2. Once the presentation outline exists:

- [ ] Map each section of the outline to a named owner
- [ ] Name a second for every section — one person unavailable should not remove a section from the pitch
- [ ] Decide who drives the live demonstration and who narrates it; they should not be the same person
- [ ] Rehearse the failure drills in the rehearsal pack, including what to say if the demo will not start in the room

---

## 5 — Barinder

### 5.1 Communication methodology — **OPEN**

- [ ] Pick the channel and say what belongs where. Suggested split, given the repository now exists: **code and defects → GitHub Issues on this repository**; **decisions → a dated note committed to `Documentation/`**; **scheduling and quick questions → the team's chat**.
- [ ] Set a standing check-in before the submission date
- [ ] Name one person as the single point of contact for the submission itself
- [ ] Agree the rule for the numbers: nothing quoted outside the team that is not in the repository and reproducible from it

### 5.2 Create the slide deck — **PARTLY DONE**

Two decks already ship, both 3 slides, both rendered to PNG and Markdown so they read on GitHub without PowerPoint:

| Deck | Purpose |
|---|---|
| [`ANGEL-SWARM-pitch.pptx`](Documentation/deck/ANGEL-SWARM-pitch.pptx) | The problem, what it costs, what changes |
| [`ANGEL-SWARM-leadership-opener.pptx`](Documentation/deck/ANGEL-SWARM-leadership-opener.pptx) | Title, stakes, deliver — a 90-second opener into the live demonstration |

- [ ] **Decide whether these are the submission deck or the starting point.** If the hackathon wants a longer format, both are 3 slides.
- [ ] Whatever ships, keep the rule the application enforces: an ANGEL SWARM figure never appears without the CURRENT — TRIAGE & PROXIMITY figure beside it at the same size, and the conditions travel with the number
- [ ] Resolve the DHA seal question on slide 1 before the deck is published anywhere public
- [ ] Re-render `Documentation/deck/slides/*.png` and the two `.md` files if the decks change, so the repository stops showing the old slides

---

## Cross-cutting — nobody's yet, and it needs an owner

- [ ] **Submission format and deadline.** Not recorded anywhere in this repository. Whoever holds the NDIA instructions should commit them to `Documentation/`.
- [ ] **Who submits.** One named person, agreed in advance.
- [ ] **The final rehearsal**, on the machine that will be in the room, with the network unplugged.

---

*Derived from the team tasking note of 8 September 2026. Update this file in place as items close — it is version-controlled, so the history of what changed and when is kept for you.*
