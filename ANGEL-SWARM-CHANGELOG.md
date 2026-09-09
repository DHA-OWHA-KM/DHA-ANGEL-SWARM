# ANGEL SWARM — Changelog

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

The complete release history of the ANGEL SWARM prototype, through repository version 1.1 (9 September 2026), recording defects found and corrected as well as features added. `ANGEL-SWARM-CHANGELOG.txt` remains the authoritative plain-text copy.

## Repository version 1.1 — 9 September 2026

### 1 · Resupply Tracking changes no number

Resupply Tracking is a standalone synthetic capability demonstration with immutable
tracker-only commitment fixtures. Its phase, deterministic clock, seek, play/pause,
normal/8× playback toggle (`SPEED ×8` / `SPEED ×1`), reroute, exception controls,
Canvas 2D schematic, margin-sorted queue and Arm B
scheduled-push comparison are tracker-owned; they are not projections of engine
tasking, scenarios, casualties, host playback, run snapshots, fleet history or
Arm B ledgers. The nominal, diverted, aborted, lost, deadline-miss, cold-chain
failure and delivered states are demonstration fixtures. It calls no model and
changes no engine state or outcome. The speed toggle changes only the tracker's
deterministic clock, never host playback or engine state.

All tracker names, times, routes and payloads are synthetic demonstration fixtures
and cannot be treated as operational output. The reference result remains **23 /
34 / 35 survivable deaths on 20 / 38 / 0 sorties at seed 42, JOA CORAL, deployed**;
23 against 34 is produced by the engine comparison, not by this tracker. The
live self-test result measured 9 September 2026 is **196 total checks covering
engine and host UI behavior; 195 pass and 1 fail**. **RESUPPLY TRACKING is
12/12 passing**, and the sole failure is the **EUCOM_FJORD nominal seed-42
directional assertion (16 > 15)**.

### 2 · What did not change

- Engine files were not edited. Their MD5 values at this documentation pass are:

  ```text
  6c1d79cd7efaa17526ae2b2950992470  app/js/sim.js
  919b75ffc96a0f680009506be2c68d25  app/js/optimizer.js
  e84bba6a71a1f43b5f6a255a8c4e01d2  app/js/mc.worker.js
  cc4f8e774b49927496d7fe0841362190  app/angel-engine.js
  ```

- The destination adds no external map, dependency, second deck.gl instance, socket or network request. Its track is Canvas 2D over local state.
- **CoT is ingested, not emitted.** The existing optional listener remains receive-only; the tracker itself has no network interface. No BATDOK-J, ATAK, TAK Server, Marti REST or outbound CoT interface is implemented.
- `Send to medic's ATAK` opens an informational, future-only explanation and transmits nothing; the page makes no request.

### 3 · Future interface and security boundary

An outbound delivery event is future work, not a hidden capability. It would create an eighth trust boundary and would require authenticated sender identity, authorization, integrity and anti-replay controls, stale-event handling, audit, deployment-specific endpoint validation and an EMSEC determination. A casualty grid paired with an inbound aircraft is targeting data; TLS protects the link, not the emission pattern. BATDOK-J remains the record of care and is not modified to hold the tactical delivery object.

### 4 · Documentation defects corrected

- The shipped documentation had no operating description for a dedicated, seekable tracker and no explicit statement that the tracker cannot move the published result.
- The medic-facing discussion said architecture mattered more than interface but did not describe the new standalone demonstration surface or separate it from an ATAK integration claim.
- The terminology record did not define the display-only phase names, signed margin, terminal phase, DTG or resupply track.
- The rehearsal pack lacked the seek-back, loss, Arm B, package-tracking and no-outcome-change beats.

No supportable source file for the requested broader resupply-tracking prior-art survey was present in this repository. No `RESEARCH/resupply-track-prior-art.md` was created from unsourced assertions.

### 5 · Generated artefacts

The repository does not contain the cited `_sbom_gen.mjs`, SBOM validator or a digest-generation script. Generated SBOM and checksum files were therefore **not hand-edited** and no regeneration or validation is claimed. They must be regenerated from disk with the release generators when those scripts are supplied.

## Version 6.5 — 8 September 2026 — FINAL

### WHAT CHANGED IN 6.5 — THE POSITIONING ARGUMENT, AND FOUR CLAIMS THAT WERE NOT TRUE

NOTHING IN THE ENGINE MOVED. app/js/sim.js, app/js/optimizer.js and app/angel-engine.js are byte-identical to v6.0, v6.3 and v6.4. The self-test returns 118 of 118 with zero page errors and zero off-origin requests. A presenter who rehearsed v6.4 will find the demo behaves identically. What changed is what the documents say, one terminology sweep the overhaul had missed, and two false strings on screen.

#### 1 · COMPLEMENT, NOT SUPPLANT — THE ARGUMENT THE PACKAGE DID NOT MAKE

The package could describe what the system does and could not say where it belongs. That is the question a program office asks first, and losing it costs more than any interface defect.

The argument is now written from evidence rather than assertion, researched against primary sources on 5 September and recorded with a URL and a date for every claim in RESEARCH/complement-landscape.md. The approved wording is RESEARCH/COMPLEMENT-SECTION.md and every document carries that wording rather than a paraphrase of it.

The load-bearing fact is empirical and four months old. In May 2026 the 44th Medical Brigade, XVIII Airborne Corps, completed an operational validation of autonomous Class VIII aerial resupply with Soaring M25 aircraft. THE AIRCRAFT ARE BOUGHT AND FIELDED. THE RULE THAT DECIDES WHICH AIRCRAFT FLIES TO WHICH CASUALTY IS NOT — and not by inference: DIU's triage program, TATRC's MEDRAS portfolio and NAVAIR's PMA-263 each place allocation outside their own stated scope. The Department has bought every layer around the decision this system makes and has bought none of that decision.

ONE CORRECTION MADE BEFORE PUBLICATION. The first draft of this argument rested the tasking claim on an Army training article that says soldiers learned "how to manually operate the systems." That sentence is about flying the aircraft by hand. It is not a statement about who decides which aircraft goes to which casualty, and offered as evidence for that it is a misattribution a judge can catch in one search. The claim now rests on three programs describing their own scope, and the rehearsal pack carries the correction as a sentence the presenter must never say.

```text
the layer below     NAVAIR PMA-263 fields the TRV-150; TRUAS has
                    reached IOC. It does automated launch, waypoint
                    navigation and automated landing — it flies the
                    mission it is given. This produces the mission
                    it is given.

the layer beside    DIU announced the AI-Assisted Triage and Treatment
                    Tool on 25 February 2026. Its scope is assessment
                    and documentation, explicitly not allocation of
                    evacuation or resupply assets. TATRC's MEDRAS
                    portfolio funds transport, documentation and
                    treatment across sixteen projects; allocation is
                    not a category in it.

the layer above     On 9 March 2026 the Deputy Secretary designated
                    the Maven Smart System a program of record and
                    moved it to the CDAO MSS Program Office. The FY27
                    request funds third-party applications on MSS.
                    Open DAGIR's OTA is the named onboarding path.

the clinical lane   The Operational Medicine Care Delivery Platform
                    integrates with MHS GENESIS and references Joint
                    Trauma System guidance. The deadline itself traces
                    to JTS Clinical Practice Guidelines, which is what
                    makes it a clinical term and not a product term.

the policy frame    DoDD 3000.09 (25 January 2023) paragraph 1.1.b
                    excludes "unarmed platforms … whether autonomous
                    or semi-autonomous" and "autonomous or
                    semi-autonomous systems that are not weapon
                    systems." This tasks unarmed aircraft carrying
                    blood. The applicable rulebook is DoDI 8510.01
                    and RMF, and that assessment is written.
```

CDAO's Agent Network, announced June 2026, is architecturally the same object as this system and its published use cases do not include medical logistics. The package now says so first — an Agent Network-class capability for the medical lane — rather than waiting to be told.

Carried in: use case, DHA alignment and its one pager, the IL5 cost analysis, the architecture (as four concrete interfaces), the security annex (as a new §6a showing none of the four widens the boundary today), the rehearsal script (a spoken beat, a fifteen-second disarm, and five new Q&A entries) and README.md.

#### 2 · FOUR CLAIMS THAT WERE NOT TRUE, FOUND BY CHECKING

The research was run to build an argument and returned four corrections to the project's own material. Each is now fixed everywhere.

> CoT IS INGESTED, NOT EMITTED. The listener is receive-only, off by default, bound to loopback unless -cot-external is also passed, and never replies. Draft positioning language said the system emits CoT over an existing TAK server. That is contradicted by this project's own security annex. The honest statement — "we consume the CoT feed the joint operations area already produces" — answers the interface question and is true.

> NO REPLICATOR ALIGNMENT. Replicator 1 and 2 scope is attritable combat autonomy and counter-UAS. No source places logistics or medical autonomy in either. Claiming the lineage would have been an unforced error.

> NO LINK 16, VMF OR MIL-STD-6017. Those are platform-to-platform tactical data links for track and fires. CoT, FHIR and STANAG 4586 are the three a medical-logistics decision layer can defend, and STANAG 4586 is stated as a target interface rather than an implemented one.

> "AT OR BELOW PUBLISHED PERFORMANCE," NOT "WE CITE PUBLISHED ENVELOPES." Measured against NAVAIR and Soaring published figures, this build's TRV-150C payload is 30 kg against 54 kg, and the M25's is 6.8 kg against 11.3 kg. The system under-claims the aircraft it tasks. That is a strength and the script now says it aloud.

#### 3 · THE TERMINOLOGY OVERHAUL HAD MISSED A FILE

"Change it to CURRENT — TRIAGE & PROXIMITY globally" reached app/index.html and app/design.html. It did not reach app/console.html, which still carried SEVEN occurrences of the superseded arm name across its Mission, Compare, Supply, Analysis and Settings panes.

None was visible in the demo — angel-map.js reduces that file by allow-list to the Dashboard pane's theatre stage and nothing else — but the analyst console is a real surface, it ships, and the file is about to be published to a public repository. It now carries none.

Fixing it exposed a pre-existing overlap the shorter name had hidden. Measured, not eyeballed: the compare banner covered ONE HUNDRED PER CENT of the arm-B pane tag at 1280, 1440 and 1920 — that tag had never been visible in side-by-side view. Both tags now sit below the banner in compare view, and every absolutely positioned box over the stage was pairwise intersected at three widths, deployed and not, to prove zero overlaps. The compare tag's descriptor is hidden below 1500px so the longer name holds one line. The theatre map inside the iframe is unchanged — identical screenshot MD5s across three runs, pixel diff bounding box empty.

#### 4 · R-11 WAS CLOSED IN v6.3 AND THE RISK REGISTER DID NOT KNOW

R-11 recorded that two surfaces in the design application badge a term-overlap score with a model's name — an all-MiniLM-L6-v2 mark and "161 passages" on the Analyst Terminal doctrine tab and on Ask ANGEL. Measured against the shipped build, both were replaced in v6.3 with TERM OVERLAP · NO MODEL ON THIS PATH and DOCTRINE · QUOTED VERBATIM, NOT GENERATED, neither carrying a model name or the mark.

The entry survived two revisions, and v6.4's own re-verification section repeated it as open. The register is not silently corrected: R-11 is struck through, marked closed, and the residual risk is recorded as procedural — A REGISTER ENTRY THAT OUTLIVES ITS DEFECT IS A FALSE CLAIM IN THE SAME WAY AN UNMARKED MODEL OUTPUT IS. See §2.0c of the security annex.

The same sweep found two live misattributions and fixed them:

```text
Sensor & Model, doctrine corpus row      credited "Analyst Terminal →
                                         Doctrine, Ask ANGEL citations"
                                         as the consumer

Ask ANGEL side panel, WHERE MiniLM RUNS  named Analyst Terminal
```

The design application makes NO HTTP REQUEST OF ANY KIND — there is not one fetch( call in the file — so it loads neither the corpus nor the encoder. Both belong to the analyst console, via app/js/doctrine.js. Both strings now name it.

#### 5 · THE SBOM WAS REGENERATED, WHICH IS THE POINT OF R-3

Three shipped files changed today. R-3 warns that digests are only as current as the last generator run, and five were found stale at v6.4 for exactly that reason. _sbom_gen.mjs was re-run rather than the document hand-edited: 49 top-level components, CycloneDX 1.6, validated VALID against the schema with ajv, and every one of the 62 resolvable SHA-256 digests re-hashed against disk and matching.

#### 6 · GITHUB PACKAGING

README.md and .gitignore are written and the repository was measured: 2.7 GB on disk, ~121 MB tracked after the ignore rules, nothing over GitHub's 100 MB hard limit and nothing needing Git LFS. The Go binaries are ignored because they were PROVEN reproducible — rebuilt offline to within 1.0% of the shipped artefact, then used to serve the app and pass 118/118 — not because it seemed likely.

Six decisions are left open for the author in RESEARCH/GITHUB-PREP.md rather than made on his behalf: the licence (17 U.S.C. § 105 versus the vendored components' own licences), public versus private, the teammate's private repository under TEAMMATE/, the eleven typefaces with no licence evidence (R-6 — publishing is redistribution, which is the act the licence governs), Git LFS, and an unrelated presentation found under DECK/.

ONE THING TO DO BEFORE git init: OUT/.git exists as an empty repository. Left in place it turns OUT/ into a gitlink and silently excludes every document in it from the commit, leaving a README that links to files that are not there.

#### VERIFICATION FOR THIS RELEASE

```text
engine files                 byte-identical to v6.0 / v6.3 / v6.4
self-test                    118 assertions, 0 failed, 0 page errors
off-origin requests          0
fetch( calls in index.html   0
app/index.html ≡ design.html identical (md5 61e4da7c…)
SBOM                         49 components, CycloneDX 1.6 VALID
SBOM digests                 62 of 62 re-hashed against disk, matching
seven-theatre sweep          re-run at 200 replications per theatre;
                             every published figure identical to the
                             digit, worst single-battle difference +1
```

## Version 6.4 — 8 September 2026 — FINAL

### WHAT CHANGED IN 6.4 — SIX DEFECTS FROM THE FIRST REAL USE OF THE GLOBE

#### 1 · BLOCKY COASTLINES

The offline generalisation was far too aggressive and defeated the whole point of the globe, since the original complaint was that countries could not be made out. Coast had been Douglas-Peucker'd at 0.18 degrees (20 km) and boundaries at 0.22 (24 km), on an integer grid of TENTHS of a degree — 11 km, which is half a pixel at the whole-earth camera but FOUR AND EIGHT TENTHS pixels at the deepest zoom the globe now reaches, so it visibly stair-stepped exactly where a viewer looks closest.

Regenerated at 0.025 / 0.035 degrees (2.8 / 3.9 km) on a grid of hundredths of a degree (1.1 km — under half a pixel at every camera this scale allows), with longitude scaled by each ring's own mid-latitude cosine so the tolerance is a ground distance rather than a coordinate one.

```text
coast rings / vertices      279 / 6,495   ->  1,380 / 28,735
boundary runs / vertices    187 / 1,740   ->    174 /  5,681
total vertices                    8,235   ->         34,416   (4.18x)
embedded bytes                   46,744   ->        223,486
```

Japan now reads as Honshu, Shikoku, Kyushu, Hokkaido and the Ryukyus; the Philippines resolve into Luzon, Mindoro, Panay, Negros, Cebu, Palawan and Mindanao; Italy has a boot, Sicily, Sardinia and Corsica; Indonesia has Sumatra, Java, Bali, the Lesser Sundas and Sulawesi's four arms. Still no new asset and no new HTTP request — it ships inside theater3d.js.

#### 2 · CHOPPY ROTATION — THREE CAUSES, MEASURED

THE SPIN WAS COUNTED IN FRAMES, NOT CLOCKED. A fixed 0.055 degrees per frame against a requestAnimationFrame interval whose standard deviation was 8.1 ms gave an angular-velocity coefficient of variation of 0.356. The picture was drawn correctly and moved unevenly. Integrated against elapsed time now, dt clamped: CV 0.356 -> 0.120.

THE REDRAW GATE QUANTISED THE CAMERA IN DEGREES, NOT PIXELS. A sixtieth of a degree is a third of a pixel at the whole earth and five thousandths of a degree per pixel of drag at depth. Driving the camera exactly one pixel per frame, the old gate repainted 58% of frames at a 1,094 km camera; a half-pixel gate repaints 99%. At the whole-earth camera both repaint 99%, so the fix costs nothing where the old one worked.

AND THE DOMINANT PER-FRAME COST WAS NOT WHERE ANYONE WOULD LOOK. ctx.closePath() is O(total path size) in Blink: 853 calls cost 23.2 ms of a 25 ms frame. A filled path closes its own subpaths, so the call was always redundant. Removing it took the same loop to 0.9 ms. Decoding is now done once into unit vectors — the projection is three dot products with no trig — each ring carries a bounding cap and is culled on horizon, sub-pixel size and off-canvas, and screen-space decimation runs at 1.2 px against a 1.4 px pen. Path building went 2.91 ms -> 2.58 ms carrying 4.18x the geometry.

STATED PLAINLY BECAUSE IT IS A REAL TRADE: under SwiftShader the frame interval still went 27.9 ms (35.9 fps) to 35.6 ms (28.1 fps). That is Skia rasterising a denser coastline stroke off-thread, which the draw timer cannot see — isolated by suppressing the stroke (23 -> 46 fps) versus the fill (23 -> 25). SwiftShader is a software rasteriser and these numbers are pessimistic; on GPU raster it is negligible. On this container it is 8 fps bought for four times the geography, taken deliberately.

#### 3 · THE ZOOM ALWAYS WENT TO JOA CORAL

Two causes, both real. gbHandoff() took the LOADED scenario's operation and never consulted the camera at all. And the host's callback was written `onHandoff(function (to) {...})` — it discarded the operation the globe passed, so even a correct answer was thrown away.

gbTarget() now resolves an explicit selection first, else the nearest operation by great-circle distance to the camera centre, else nothing. A selection the operator has spun away from is dropped (on drag and arrow keys only, never on idle spin) so "honour the selection" and "fly where I am zooming" cannot contradict. Over open ocean it declines rather than guessing, clamps the zoom and says NO OPERATION UNDER THIS ZOOM.

```text
before   1 of 10 pass — only CORAL, every other zoom went to CORAL
after    9 of 10; the one failure is a harness locator, and that case
         passes 4 of 4 in the dedicated list-selection test
```

All seven scenarios verified by zoom, and all four list selections verified from a camera parked over CORAL.

#### 4 · SCROLLBAR PARTY

The legend body and the record body each carried a measured max-height AND their own overflow-y:auto, INSIDE a column that already had one — so three open panels gave three nested vertical scrollers. Worse, CSS computes overflow-x to auto on any box whose overflow-y is auto and whose overflow-x is unset, so all three could grow a horizontal bar the moment a vertical one took its 15 px.

Collapsed to the one container that genuinely has to scroll: the column. It is the only box that knows the available height, and at 1024x768 no arrangement of inner maxima can make four panels fit. overflow-x is pinned hidden on both columns.

```text
worst case per column   3 vertical -> 1,  4 h-capable boxes -> 0
measured across four scales at six viewports
```

The de-duplicated single-line legend rows are untouched — every row's text dumped before and after and diffed clean, 12 rows on TACTICAL 2D and 9 on TACTICAL 3D.

#### 5 · THE OPERATIONS LIST DID NOT SCROLL TO THE SELECTED OPERATION

Selecting JOA MARINER left its card half under the RUN CONTROL panel with its Select button unreachable. opReveal() now computes the visible band — the column rect less padding less anything actually standing over its foot, such as the walkthrough bar — instead of scrollIntoView({block:'nearest'}), and aligns the top of a card taller than the band. The scroller is found by walking up from the card, so it survives the panel being moved columns.

Verified from BOTH selection sources at 1440x900 and 1280x800: the card's own button, and a click on the picture. Selecting MARINER from the map scrolls the column 0 -> 231, TIMBER -> 425, and every card lands fully inside the viewport.

A NOTE ON HOW THIS WAS NEARLY MISREPORTED AS UNFIXED. A synthetic element.click() on the Select span does not move the selection at all — the handler is bound on a parent and the framework's delegated listener does not see it. A real mouse click does. Two verification passes said "not fixed" before the harness was corrected; the feature was working throughout.

#### 6 · THE SORTIE STRIP OPENED BY ITSELF

It defaulted to a sortie — most recent airborne while running, most recent completed at T+180 — which is confusing when nobody asked for it. It now appears on exactly two clicks, both read off the frame's own selection:

```text
a casualty on a tactical picture  ->  the sortie that carried to them
an aircraft or sortie             ->  that airframe's latest sortie
```

Dismissed by an X on the header or by Escape (map page only, strip open only, and only when the walkthrough and all three sheets are closed), and the dismissal is remembered against the selection that opened it. Clicking a casualty no sortie ever stopped at draws no strip — there is no sortie status to show, and the record panel is what acknowledges that click.

Everything else about it is unchanged: the three stage states, the arrow stepping, the inset discipline and the collision avoidance.

#### 7 · TWO ENGINES THAT NEVER SPOKE

Found while fixing 3, and worth recording because it predates all of this work. The design shell reads angel-engine.js's WORLD — the classification stamp, the KPI screens, every figure that is not the map. The map frame runs app.js's own instance. NOTHING SYNCHRONISED THEM IN EITHER DIRECTION: on the unmodified build, picking JOA BASALT on Settings moved the stamp to BASALT while the map underneath carried on drawing CORAL.

Both directions are wired now. ANGEL_DESIGN.setScenario() lets the map move the shell after a globe handoff; ANGELMAP.setScenario() lets the shell move the map when Settings changes, driving the frame through app.js's ORIGINAL selectJoa captured at bind time. Both are idempotent by scenario key, so they cannot ping-pong. Verified end to end in both directions.

REFERENCE RESULT UNCHANGED: 23 / 34 / 35 on 20 / 38 / 0 sorties. Self-test 118 of 118. Four map scales, at most one column scrollbar and zero horizontal ones, 0 px2 of element-under-element overlap, 13 of 13 destinations, zero uncaught page errors, zero off-origin requests, at 1680x1050 and 1280x800.

## Version 6.3 — 8 September 2026 — FINAL

### WHAT CHANGED IN 6.3 — A MAP YOU CAN READ, A GLOBE, AND THREE LABELS THAT WERE LYING

#### 1 · THE THEATRE MAP WAS UNREADABLE, AND FOUR THINGS WERE WRONG

The operator's words: the map is "very hard to make out countries, and is just difficult to look at". He was right, and the cause was not the absence of a commercial basemap. This application already ships real geography — GSHHS shoreline and CIA WDB-II boundaries, 243 coastline runs and 31 boundary runs for PACOM alone. It was drawing all of it, badly.

A CORRECTION TO THE DIAGNOSIS, FOUND DURING THE FIX: the THEATRE scale on screen is not drawn by theater.js at all. theater3d.js takes the pane and puts theater.js to sleep with one early return. All four defects were in theater3d.js. They were fixed in BOTH, so the canvas fallback tells the same story as the GPU view.

```text
OBLIQUE PROJECTION     The picture opened at pitch 40 — a tilted
                       parallelogram. Japan and the Philippines came out
                       sheared, so the shapes a viewer already knows did
                       not match the shapes on screen. Default is now 0:
                       flat and north-up. The tilt survives as an
                       OBLIQUE / FLAT control and the `t` key.
LAND AND SEA           Muddy olive on near-black, with hillshade adding
                       noise on top. Sea ramp pulled toward the halo,
                       hypsometric ramp re-mixed toward the dim token
                       instead of amber — the mustard is gone —
                       hillshade swing cut from 0.62+0.74 to 0.85+0.32
                       and its noise term from 200 to 132. Coast stroke
                       lifted to 0.70 mix at alpha 236, 1.25 px.
BOUNDARIES             Drawn at grid colour over water of the same
                       value, alpha 120. You could not tell China from
                       Vietnam. Now 0.74 mix at alpha 214, dashed so it
                       reads as political rather than physical.
                       PathStyleExtension is not in the vendored bundle,
                       so the dash is cut into the geometry: three zoom
                       bands, memoised per theatre, bounded at 9,000
                       segments with a solid fallback.
LABELS                 The data was there — 24 PACOM names, 19 EUCOM —
                       and two things hid it. Every rank-3 name, which
                       is every country, was dropped whenever the whole
                       command was in view, and that is the only view
                       most people ever see. What survived was drawn at
                       alpha 180. The rank ladder now sheds names as the
                       view CLOSES IN rather than as it opens out, and
                       the ink is full strength.
```

A related artefact nobody had named: the relief sheet faded at its clip edge into the PANEL background, which is lighter than deep water, producing a bright smear down the western Pacific. A deep-water quad now sits under the sheet, so the dataset's edge fades into ocean.

In theater.js the labels now go through the existing collision table, and the operations' ground is claimed FIRST — that renderer had been printing sea names straight through an operation's own figures.

#### 2 · A GLOBE, AND WHY IT IS NOT WHAT WAS ASKED FOR

The operator asked for a spinning 3D earth with continuous zoom "from globe to street". Half of that is impossible here and it is worth writing down why: street level means tiled data at every zoom, tiles mean a tile server, and a tile server ends the zero-off-origin property this whole package rests on. There are exactly two datasets — world coastlines at 1:50M and a procedural 92x118 km terrain field — and nothing in between.

DECK.GL'S GlobeView IS NOT IN THE VENDORED BUNDLE. It has twelve exports: Deck, MapView and ten layers. The two GlobeView matches in the file are an internal warning string and a displayName on a class that is not exported. Rebuilding the bundle was possible and was rejected: that bundle is the shared failure domain of TACTICAL 3D and the GPU theatre, both of which work, and _GlobeView is experimental and would have held a THIRD WebGL context on exactly the hybrid-graphics laptop 6.1 was hardened against.

So GLOBE is canvas 2D, orthographic, and self-contained. It holds no GPU context, so it cannot lose one. Its geography is world coastline (279 rings) and internal boundaries (187 runs) generalised offline from the same world-atlas package that made data/basemap.json, embedded as integer deltas — 46,744 bytes inside theater3d.js. NO NEW ASSET, NO NEW HTTP RESOURCE, STILL ZERO OFF-ORIGIN REQUESTS.

Drag to spin, scroll to zoom, day/night terminator computed from the EXERCISE clock rather than the wall clock, atmosphere glow, idle spin after 3.5 seconds untouched, operations clickable through the same selection path as every other scale.

THE HANDOFF IS REAL AND WAS MEASURED, not a cross-fade over a jump: 7,742 km to 4,681 km to 345 km across, over 1,100 ms, monotonic, ~32 fps throughout, with the globe fading over the last 340 ms while the tactical sheet builds underneath. It lands within a few per cent of the scale TACTICAL 2D opens on, so the two pictures are the same size across the cut. It hands to 2D always — 3D takes seconds to compile and would put a BUILDING card at the end of the flight.

Two things that were hard and are recorded because they will recur. Filling a landmass that crosses the horizon by clamping far-side vertices to the limb makes Eurasia's silhouette wrap the disc and, under even-odd, fills the OCEAN — measured, the Atlantic came up land-green. It closes on the shorter limb arc now. And at theatre zoom the sphere radius is tens of thousands of pixels, at which the rasteriser silently dropped the entire coastline STROKE while still drawing the fill; coordinates are bounded to the canvas.

Performance under SwiftShader at 1920: 33-44 fps, 3.4-5.1 ms a frame, and it redraws only when the picture changes.

#### 3 · THE ROUTE-STAGE STRIP, WITH THE STAGE YOU ARE ON

Borrowed from a team member's concept — his was four fixed stages, source to pickup to casualty to return. ANGEL SWARM's sorties are multi-stop, so the strip carries the whole chain: every casualty on the run, what each one received, and the margin left against that casualty's own deadline.

#### THE STAGE HIGHLIGHT IS THE POINT, AND IT HAS THREE STATES:

```text
DONE      0.76 opacity, solid border, solid leg, the actual minute and
          the margin that was achieved
ACTIVE    26 px glyph, teal ring and glow, full-brightness text, a bar
          under the column, and the leg CURRENTLY BEING FLOWN drawn in
          the ARM A hue. The header names it: IN FLIGHT -> CAS-031
PENDING   0.46 opacity, dashed border, faint leg, an ETA and NO MARGIN
          FIGURE — a plan is not a record, and this application does not
          colour a slack it has not measured
```

Run closed, nothing is highlighted and the whole route reads as history. Failure modes are named rather than dropped: OVERTAKEN, NOT REACHED, NOT USABLE, NOT DELIVERED, NO DEADLINE.

It is drawn as a SIBLING of the panel layer, not a child. angel-map.js finds the design's panels by walking the panel row's children, so a strip placed inside that row would have been measured as a panel column and pushed every map-drawn label inward across the full height of the picture.

Two collisions were found and fixed during the work: moving a panel left the strip on the previous frame's column width with nothing to re-measure it while the clock was stopped; and the guided walkthrough bar is fixed at bottom 124px on this page and would have sat on top of the strip. Both measured at 0 px overlap now.

#### 4 · THREE LABELS THAT WERE LYING, ON SCREENS 6.1 DID NOT REACH

6.1 corrected Ask ANGEL's provenance panel. The same class of defect was still live on two other surfaces, and it is the kind a judge checks:

> Analyst Terminal -> DOCTRINE badged its result "✦ all-MiniLM-L6-v2 · RETRIEVED · NOT GENERATED" and printed "161 passages · 499 sentences". Ask ANGEL's doctrine answers carried "✦ MiniLM RETRIEVAL" in the violet this application reserves for model output. The models paragraph on Sensor & Model said Qwen "drafts prose".

None of it is true of this build. index.html loads no ONNX runtime on those paths; both surfaces score an ELEVEN-passage inline reference set by term overlap. No GGUF ships, so nothing anywhere is generated prose.

MiniLM IS REAL, ships in app/models, and runs the analyst console's doctrine view. It was a label naming the wrong machine. Every occurrence now says what the screen actually does — TERM OVERLAP · NO MODEL ON THIS PATH, and DOCTRINE · QUOTED VERBATIM, NOT GENERATED, in neutral rather than the model violet. The stronger claim was available all along: a verbatim quote cannot invent doctrine.

#### 5 · A PRE-EXISTING OVERLAP THE EARLIER MEASUREMENTS NEVER CAUGHT

At 1280x800 in TACTICAL 3D, WHILE A SATCOM WINDOW IS OPEN, the degraded- comms banner sat 1,054 px2 underneath the left panel column. It honoured COMMS_BANNER_OFFSET vertically but was centred on the whole dock horizontally — and at 1280 the left column is 293 px and the right is 0, so dock-centre is not screen-centre. The v6.1 "0 at nine combinations" figure never caught it because no measurement had been taken inside a comms window. It is centred on the visible map now, via the insets the host already publishes.

Also: OBLIQUE was persisted in localStorage, so anyone pressing it once in rehearsal would find the presenting machine still tilted on the next cold load. It is sessionStorage now — useful within a sitting, guaranteed flat on a fresh tab.

#### 6 · EVERY SHIPPED DOCUMENT REVERIFIED, AND NINE FALSE CLAIMS REMOVED

Every document in documents/ was checked against the running build. Nine claims were false and are corrected; they are listed in full in the session record. The ones that would have cost the most:

> "CRI-Net produces every casualty's physiological deadline. The only learned quantity that reaches a tasking decision."  It does not — the application's own Sensor & Model screen says so, and this directly contradicted the rehearsal script's own answer to that question.

> "Four sets of learned weights ship in the folder."  Two ship.

> "Fleet size is close to inert."  v5.8 measured the opposite. Dangerous because it invites "so buy more aircraft" — and the true answer is the stronger one.

> "Twenty-two destinations" in five places.  Thirteen. Twenty-two was the old analyst console's pane count.

> "Everything runs air-gapped."  The architecture document retired that word two versions ago; two shipped documents contradicted each other.

The SBOM was regenerated — 42 to 49 components, every digest re-measured, the five map renderers added because the globe's geography ships INSIDE theater3d.js and a bill of materials that omits the file omits the data. Re-validated against CycloneDX 1.6: VALID.

The rehearsal script gained the map question, the route-strip question, a concede-fast answer on the MiniLM badge, four new failure drills, and a recommendation on the guided walkthrough: use it to brief the team, turn it off for judges. One arithmetic error was fixed in the sentence the presenter memorises — "saves eleven of thirty-five" is wrong, because eleven is against thirty-four.

REFERENCE RESULT UNCHANGED: 23 / 34 / 35 on 20 / 38 / 0 sorties. Self-test 118 of 118. Four map scales, 0 px2 of element-under-element overlap at every viewport measured, zero uncaught page errors, zero off-origin requests.

## Version 6.2 — 8 September 2026 — FINAL

### WHAT CHANGED IN 6.2 — THE COMPARISON IS EVERYWHERE, AND NOTHING IS THE SAME SIZE AS EVERYTHING ELSE

This release answers one sentence from the team demo: "I messed up when explaining this because I didn't have a direct KPI comparing ANGEL SWARM against the current state." On most screens the operator could see ANGEL SWARM's toll and not the current method's, so the comparison had to be spoken from memory.

THE RULE NOW: AN ANGEL SWARM FIGURE NEVER APPEARS WITHOUT THE CURRENT — TRIAGE & PROXIMITY FIGURE BESIDE IT, AT THE SAME SIZE.

NO COLOUR CHANGED. Three palette options were put up and the one that changes nothing was chosen. Verified by diffing every colour literal in the file against the previous build: 480 distinct values before, 480 after, none added, none removed. Every improvement below is size, weight, spacing or position.

#### 1 · ONE COMPARISON LINE, UNDER TWELVE SCREEN TITLES

```text
DEAD OF SURVIVABLE WOUNDS  ▍23 ANGEL SWARM  ▍34 CURRENT — TRIAGE &
PROXIMITY  · SAME CASUALTIES, SAME AIRCRAFT, SAME BLOOD
```

28px tall, one line down to 1152px wide, built once in cmpVals() and placed from a byte-identical fragment on every destination — verified programmatically, so a future figure change lands in one place rather than twelve. The only variant is the Theater Map's, which differs solely in margin because it sits inside the floating head card.

IT DOES NOT PRINT A COMPARISON THAT DOES NOT EXIST. Three states, worded from what the application already says elsewhere:

```text
NOT DEPLOYED   "ANGEL SWARM IS NOT DEPLOYED — BOTH ARMS ARE RUNNING THE
               CURRENT METHOD, SO THERE IS NO COMPARISON TO DRAW."
               No figures at all.
NOT READABLE   both live counts, marked "NOT YET READABLE — n OF THE
               SURVIVABLE COHORT RESOLVED, FLOOR IS 10 · AS AT T+n"
COMPLETE       the full line above
```

Left off Settings, deliberately: it is the configuration screen, not a board anyone presents a result from, and a run toll under "Two kinds of setting live here" reads as an orphan.

#### 2 · THE FOUR PLACES THE NUMBER STILL STOOD ALONE

Theater Map → ON THIS GROUND → DIED OF WOUNDS is now two rows in one tile, each with its arm spine, both counts at the same size. Analyst Terminal's `angel status --final` and `angel deaths --survivable --list` now name and pair both arms. Live Casualties and Decisions are covered by the strip and were not doubled.

Eleven further places where ANGEL appears unpaired were surveyed and are recorded rather than changed — the cause-bar breakdowns, the all-categories tolls, two SQL presets. Most are ANGEL-only because the control arm has no commensurable figure; they are listed in the session record.

#### 3 · BOTH TOLLS ON THE NAVIGATION RAIL, AND THE 45 PIXELS THAT TOOK

A DEAD OF SURVIVABLE WOUNDS block under POSTURE · ONE SOURCE, on screen whatever destination is open.

THE RAIL WAS ALREADY EXACTLY FULL. Measured on the pristine build: rail content ended 774px down, the fold sits at VH − 27, and at 1280x800 the last role-chip row ended precisely at the fold — so at first the block simply could not be drawn below 850px of viewport height. 54px were reclaimed from the POSTURE card, which was padded generously for a card nobody reads closely: 143px → 89px.

```text
1680x1050   full block     role chips clear by 219px  (was 162)
1440x900    full block     clear by 69px              (was 12)
1366x768    no block       clear by 25px              (was 32px OVER)
1280x800    COMPACT BLOCK  clear by 13px              (was no block)
1024x768    no block       clear by 25px              (was 32px OVER)
```

So the block reaches a 1280x800 laptop, and 1024x768 went from 6px of rail scroll to none.

#### 4 · HIERARCHY — ONE FIGURE PER SCREEN, AND IT IS OBVIOUS WHICH

The complaint was "it was hard to locate things overall". The cause was that almost everything was the same size, so nothing was the answer.

```text
COMMAND OVERVIEW   headline figures 27px → 42px, KPI tiles 26px → 20px.
                   The three tolls now beat the tile row, which is the
                   Ops Wall's own 52:24 ratio applied one screen over.
LIVE CASUALTIES    three tiles were all 19px, so DIED OF WOUNDS looked
                   exactly like RESOLVED. Now 36px against 17px.
EVIDENCE           counterfactual figures 38px → 46px.
THEATER MAP        the intro paragraph over the map was the loudest
                   non-map thing on the screen: 10.5px → 9.5px, width
                   1020px → 900px. Panel neutrals 19px → 16px, the
                   paired DIED OF WOUNDS 17px → 20px. Panel widths,
                   tiers and legend untouched — a renderer measures
                   that geometry and it is days to the presentation.
```

EIGHT SCREENS WERE DELIBERATELY LEFT ALONE after being looked at: Ops Center Wall already is the model, Analyst Terminal is a terminal transcript and a big figure would break the metaphor, Decisions is a record rather than a number, and War Game, Ask ANGEL, Sensor & Model, Data Sources and Authority & Policy each already lead with the right thing. Doing nothing was the correct outcome on more than half the application.

#### 5 · GUIDED WALKTHROUGH — OFF BY DEFAULT

Settings → Display → Guided walkthrough. A floating bar, bottom centre of the content column, that walks the five-screen demo path: Command Overview, Theater Map, Evidence, Ops Center Wall, Engine self-test. It NAVIGATES between existing screens and changes nothing about what any screen renders, which is the only reason it is safe to add this late.

Off by default on purpose. In front of a panel a guided mode reads as on-rails and undercuts "take the keyboard, it is a real tool"; for briefing a team it is exactly right. The operator chooses.

Navigating away by the rail does not break it — the bar reads OFF THE PATH, names the step it left, and offers RESUME.

THE KEYBOARD STEALS NOTHING. Arrows step and Escape exits, but the handler returns immediately when the walkthrough is off and again when focus is in an input. Verified: typing in the top-bar search and pressing ← twice moved the caret 7→5 and did not change the step; the same in the Ask ANGEL input moved the caret 40→38 and did not change the step.

REFERENCE RESULT UNCHANGED: 23 / 34 / 35 on 20 / 38 / 0 sorties. Self-test 118 of 118. Thirteen destinations, zero uncaught page errors, zero off-origin requests.

## Version 6.1 — 8 September 2026 — FINAL

### WHAT CHANGED IN 6.1 — FIVE DEFECTS FOUND IN A TEAM DEMO

#### 1 · THE THEATRE MAP FAILED ON TWO MACHINES, AND THE CAUSE WAS SILENCE

Reported from a live demo: THEATRE would not load; both tactical views did. Instrumented first — the app creates exactly TWO WebGL2 contexts, nowhere near any browser cap, so context exhaustion was not it.

THE CAUSE: there was no webglcontextlost handling anywhere in this application. grep for webglcontextlost|webglcontextrestored|isContextLost across app/** returned zero. Injecting a real context loss reproduced the report exactly: the pane went to a flat pale rectangle (mean luminance 21.4 to 192.2), __ANGEL_T3D.active() stayed TRUE so the canvas fallback never fired, ZERO console errors were raised, and it stayed dead for the rest of the session including across view switches. A browser drops a context on its own — hybrid graphics switching adapters, a driver reset, eviction under process-wide pressure. SwiftShader in the test container never does, which is why it hit two real laptops and no harness.

Now: context loss is captured, the canvas theatre takes the picture back inside the same event, and one automatic remount is attempted after 900 ms. A second loss keeps the canvas map for the session and says so. A 20-second "mounted but never painted" watchdog takes the same path. Two aggravating bugs fixed alongside — fatal() left _looping true so a remount would have had no render loop, and the bootstrap tick stopped permanently on first give-up, so there was no way back.

Measured after: injected loss recovers to a real map at +1 s and to a new GPU context at +3 s. THEATRE drew content on 18 of 18 switch cycles.

Also corrected: THEATRE is not slow. Screenshot timing said 7.2 s; in-page onAfterRender timing says 431 ms cold and 94–168 ms on remount.

#### 2 · MAP CONTENT WAS PAINTED UNDER THE FLOATING PANELS

The JOA location card, the asset chips, the scale bar, the north arrow and the AREA OF OPERATIONS block were drawn against the full canvas rectangle while the page floats panel columns over its left and right edges.

publishSideInsets() now publishes MAP_INSET_L/R/T/B for the whole map, not just the transport band, mirrored as --map-inset-* custom properties, and all three renderers lay their painted chrome out inside them. The insets are folded into both renderers' scene keys — without that the first placement stood and never re-ran when the host's numbers arrived.

Measured overlap, map-painted chrome against the panel boxes, deployed and zoomed — the state it was demoed in:

```text
1680x1050   THEATRE 8,448   2D 2,174    3D 21,268   px²
1440x900    THEATRE 29,569  2D 2,174    3D 33,000
1280x800    THEATRE 53,309  2D 2,633    3D 43,798
TOTAL       196,373 px²  ->  0 at all nine combinations
```

A chip that cannot find clear ground is now dropped rather than printed under a panel, by the renderers' own existing rule.

#### 3 · ASK ANGEL ANSWERED EVERY QUESTION WITH THE SAME PASSAGE

"How many casualties were in the last run" returned a paragraph about blood cold-chain storage, badged as retrieval at similarity 0.586. Two faults:

FAULT ONE: no rule in the router matched a question about the run's own counts, so it fell through to the reference corpus.

FAULT TWO, AND THE SERIOUS ONE: the fall-through did not search the question. It read this.ttyVals(s).doctrine, which scores the corpus against state.dq — the query box on Analyst Terminal → Doctrine, whose default is 'How long can whole blood be out of refrigeration?'. EVERY question that reached the corpus returned that same passage at that same score, whatever was typed. Proof: holding the question constant and changing state.dq moved the answer from B6-004 at 0.586 to T1-002 at 0.725.

A baseline sweep found 12 of 21 test questions answered wrongly.

Now: run figures are answered from the run's own record; doctrine is quoted only for doctrine questions; the corpus is scored on the QUESTION; and a match that does not clear a measured floor returns nothing rather than its best guess. The scorer was fixed first (stopwords dropped, whole-word match, stemming) because on the old one the two sets did not separate at all — "what is the capital of France" scored 0.530, above eight genuine doctrine questions. After: 22 answerable questions run 0.400–0.920 with 21 at or above 0.660; 17 of 24 unanswerable collapse to the 0.140 floor. The gate — two matched content terms AND 0.55 — keeps 21 of 22 and admits 0 of 24. 0.55 sits on a plateau, not a cliff.

Six new run-fact rules added. 25 of 25 test questions now answer correctly.

#### 4 · THREE PROVENANCE CLAIMS ON ASK ANGEL WERE FALSE

Found while fixing the router, and recorded because a judge would have found them too.

The header chip read "✦ Qwen2.5-0.5B-Instruct LOADED" and the side panel named it as the language model. No GGUF is shipped — SRC_DEFS in the same file says ABSENT · not shipped, and a network trace of a full session requests no .gguf at all. Two body paragraphs also claimed answers were "drafted into prose by the language model on this machine."

The panel also claimed "all-MiniLM-L6-v2 · 161 passages · 499 sentences" as the retrieval for this screen. VERIFIED BY NETWORK TRACE: the MiniLM ONNX, its tokenizer and the ORT runtime ARE fetched and MiniLM IS real — it runs the Doctrine tab on Analyst Terminal. It does not run this router, which scores eleven inline passages by term overlap. Naming a model that runs elsewhere in the build, on a screen that does not call it, is a claim that does not survive one question.

All corrected to what this screen actually does. The chip now reads NO LANGUAGE MODEL · NOTHING HERE IS GENERATED, which is both true and the stronger claim: a template over the run record cannot hallucinate a casualty count, and a verbatim quote cannot invent doctrine. Run answers carry RUN RECORD · COMPUTED, NOT GENERATED and do not wear the violet ✦ this application reserves for model output.

The build inventory on Sensor & Model still describes the models, correctly, as models. Nothing was removed from the build.

#### 5 · THE LEGENDS, AND WHAT HAPPENS ON A SMALL SCREEN

Twenty-one legend rows printed a name and then a sub-line restating it — "COLLAPSE IMMINENT / collapse imminent", "COMMAND UAV / command UAV". Twelve sub-lines cut outright, eight trimmed to the part that added something, one kept. Rows are single-line now; group headings and counts unchanged.

Panels: fig and rec open on arrival, lay and run folded one click away. A panel the operator moves or opens is never re-arranged again that session.

Responsive, driven by the MEASURED map width rather than the window:

```text
>= 1340   two columns, width clamp(256, (RW*0.40-36)/2, 304)
>=  900   one column,  width clamp(240, RW*0.26, 292)
<   900   one column of folded headers, 236px
or VH < 700
```

Map width kept, measured across all three view modes:

```text
1920x1080   60.3-60.8%  ->  60.6%
1680x1050   53.7-54.3%  ->  58.9%
1440x900    44.4-45.1%  ->  72.4%
1366x768    40.7-41.4%  ->  70.6%
1280x800    35.8-36.6%  ->  70.3%
```

Horizontal scroll 0, panel overlap 0, column scroll 0 at every size. The record and legend bodies were bounded at 50vh/44vh, which knew nothing about the header card — which is what put the legend off the bottom of a 1280. They are bounded in px from measured available height now.

#### 6 · THE COMPARISON IS A COMPARISON, NOT A FOOTNOTE

The Ops Center Wall printed 23 at 52px under DEAD OF SURVIVABLE WOUNDS and put "against 34 under current triage and proximity" in 12px underneath it. Presenting from that board, the 34 had to be read from the sub-line and spoken from memory, and that is where the narrative broke in the demo.

Four cards now: ANGEL SWARM 23, CURRENT — TRIAGE & PROXIMITY 34, FEWER DEAD 11, RESOLVED 125. Two arms of equal weight, each with its own arm mark and its own 52px figure. Undeployed, both arms ARE the current method, so the second card is not offered and the grid sizes to three.

This is the first of a set — see the mockups reviewed on 2 September for the rest. That proposal was reviewed as images and never shipped as a document.

REFERENCE RESULT UNCHANGED: 23 / 34 / 35 on 20 / 38 / 0 sorties. Self-test 118 of 118. Thirteen destinations, zero uncaught page errors, zero off-origin requests, verified at 1680x1050 and 1280x800 in all three map modes.

## Version 6.0 — 8 September 2026 — FINAL

### WHAT CHANGED IN 6.0 — FIVE THINGS THE OPERATOR COULD NOT SEE OR REACH

#### 1 · THE TACTICAL 3D TRANSPORT BAR WAS NEVER DELETED. IT WAS HIDDEN.

geo3d.js still drew a complete transport — play glyph, clock, scrub track with fill and playhead, death ticks, MASCAL ticks. One line in the stylesheet angel-map.js injects into the frame turned it off:

```text
#g3Wrap .g3Bar { display: none !important }
```

with a comment saying its transport had been squared against the run controls in the chrome above. The caption row below it stayed visible, which is why the bottom strip looked half-present rather than absent.

Un-hiding it was not sufficient, and this is the part worth recording. window.ANGELMAP is a ONE-WAY channel: the page calls M.sync(t, deployed) and reads M.figures() back. There is no way for the map to set `running` or `t` on the host. A bare un-hide therefore produced a play button that visibly did nothing and a scrubber that sprang back on the next render.

The bar now drives the host by pressing the application's own transport button, located in the header strip by its label — PLAY / PAUSE / RESUME. That button's label IS the run state, so no second run state is kept and the two cannot disagree. This is a DOM coupling rather than a published API, and it is recorded as such: if the top bar's transport ever moves, the bar falls back to playing the recorded replay locally rather than breaking. Seeking still moves the replay only — there is no host seek entry point to press.

Restyled to the map's floating-chrome language, and margined clear of the design's floating panel columns, which overlay the bottom of the map and were sitting on top of the play button at both viewport sizes.

#### 2 · THE SATCOM DENIED BANNER, FOR THE SECOND AND LAST TIME

The v5.7 fix was correct and was working. publishTopInset() was measuring the head card properly and publishing COMMS_BANNER_OFFSET — 108 at 1680, 124 at 1280 — on a 250 ms interval plus a ResizeObserver, and 2D was already clear.

It was the wrong renderer. The 3D banner is not drawn by map.js at all. It is a DOM element, #g3Comms, positioned by a hardcoded top:64px in geo3d.js's own stylesheet, and it never read the offset. Measured before: banner at absolute 141 against a head card whose bottom is 175 — a 34 px overlap. After: banner 251 at 1680, 308 at 1280, both clear, in 2D and 3D.

#### 3 · THE RIGHT-CLICK MENU AFTER AN ORBIT DRAG

Right-drag rotates the deck.gl camera; on mouse-up the browser read the right button as a click and opened the native context menu over the map. Suppressed on #g3Canvas only, removed and re-added on mount so repeated mode switches cannot stack listeners. Verified: contextmenu on the canvas is prevented, contextmenu on the left navigation rail is NOT, and the orbit gesture still moves bearing and pitch.

#### 4 · SOMETHING WAS WAITING ON A PERSON AND NOTHING SAID SO

An escalation is raised and lapses eight simulated minutes later. Unless the operator happened to be standing on the Decisions board at that moment, the first they knew of it was the after-action line telling them how many they had missed. The rail chip existed but was amber, showed only what was open at that instant, and blinked out when it lapsed.

Three changes, one state machine:

```text
WHILE ONE IS OPEN   a red alert in the top bar carrying the count and
                    the words DECISION REQUIRES YOU, which opens the
                    Decisions board; the rail chip goes red — the same
                    red Live Casualties uses — and carries the count.
AFTER THE FACT      both become a standing tally, DECIDED / ASKED. A
                    run that ends 0 / 3 says so on the rail and in the
                    bar until it is reset.
```

The numerator is the operator's own answers, not the system's: `decisions` is written only when a person actually answers an escalation. 0 / 3 is a true statement about how that run was commanded, and it no longer takes an after-action report to find out.

#### 5 · YOU COULD NOT TELL THE CLOCK WAS MOVING

Away from the Theater Map the only evidence of a live run was an 8.5 px T+ readout in the far corner of the bar, and the boards change slowly enough that a paused run and a running one look the same for several seconds. MISSION IN PROGRESS now sits in the top bar in red with a lit indicator, for exactly as long as the run is live, and is gone the moment it stops.

#### 6 · THE WAR GAME SCREEN SAID "SEED" AND SAID TOO MUCH

"Seed" is a modeller's word and it was on the screen a commander uses to choose a force posture. Every occurrence on that screen is now BATTLE, SETTING or BATTLES AT EACH SETTING. The concept it carried — that both arms fight one identical battle, which is the honesty property the whole comparison rests on — is not lost; it is stated in words a commander owns: "Both arms fight the same battle, soldier for soldier."

The prose was cut 852 words to 396, a 54% reduction, measured across every string on the screen. Nothing load-bearing was deleted. The methods paragraph — the lever applied to the shared world after the casualty stream is fixed and before either arm is built, and why the no-delivery case is not swept here — moved behind WHY THIS IS A FAIR TEST, one click away, together with the run provenance that came out of the result stamp. A commander does not need it; a judge who challenges the pairing does.

The map's replay caption now reads BATTLE 42 rather than SEED 42 for the same reason. "Seed" survives elsewhere in the application — Evidence, Settings, the run-complete stamp — and has not been touched.

KNOWN AND NOT FIXED: at 1280x800 the 3D transport bar and the SATCOM banner are both squeezed between the design's floating panel columns. Both are legible and usable; neither is as wide as it is at 1680x1050. The panels are host chrome above the dock's z-index and the map cannot paint over them.

REFERENCE RESULT UNCHANGED: seed 42, JOA CORAL, capability deployed — 23 / 34 / 35 survivable deaths on 20 / 38 / 0 sorties. Self-test 118 of 118. Thirteen destinations populate, zero uncaught page errors, zero off-origin requests.

## Version 5.9 — 8 September 2026 — FINAL

### WHAT CHANGED IN 5.9 — INTEROPERABILITY, PROOF, AND THE ANSWER ON SCREEN ONE

Three streams landed in 5.9. Two of them exist because a judge is entitled to ask "what does this connect to" and "how do you know it works", and in 5.8 neither question had an artefact behind it. The third is the finding itself, which was reachable only by deploying, pressing play and waiting out a 180-minute run.

#### 1 · THE ANSWER IS ON THE FIRST SCREEN

Command Overview now opens with the three tolls of this battle, above the fold, before anything is pressed:

```text
NO FORWARD DELIVERY            35   nothing is flown at all
CURRENT — TRIAGE & PROXIMITY   34   38 sorties
ANGEL SWARM                    23   20 sorties
```

These are not typed in. buildBoth() already builds the complete deployed and undeployed runs the moment a scenario is selected, so the resolved result exists at T+0 and the strip reads it rather than asserting it. Change the scenario on Settings and the three numbers change with it, because they are that scenario's answer and not a slogan. The projection is memoised per scenario — snapshot() at T+180 walks the whole run and the value bag is rebuilt on every render.

The header is tense-aware: RESOLVES TO before the run, RESOLVED TO after it. The clock has not been watched yet and the wording says so.

#### 2 · THE RUN-COMPLETE SHEET NO LONGER HIDES ITS OWN BUTTONS

Measured, not assumed: the sheet's content is 1,043 px tall. On a 1050 px screen the card is clamped to 88vh = 924 px, so CLOSE / START OVER / OPEN THE ANALYSIS sat below the fold of an INNER scroller. The page behind does not scroll, so there was no visible cue that anything was down there — the third arm added in 5.8 is what pushed it over.

The card is now a flex column: header pinned, body the only thing that scrolls, action row pinned to the bottom at every height. Verified at 1280x700 and 1680x1050 — content 1,043 px against 482 px and 790 px of scroller, all three buttons in view at both extremes of scroll.

ONE DEFECT WAS INTRODUCED AND CAUGHT IN THE SAME PASS, and it is recorded here because it is the sort of thing that ships quietly. Making the body a height-constrained flex column let its children shrink — flex-shrink defaults to 1 — and the three-arm table collapsed into the counterfactual card. A screenshot caught it. The scroller and the column are now two elements: an unconstrained block that scrolls, with the natural-height column inside it.

#### 3 · INTEROPERABILITY — WHAT THIS CONSUMES AND WHAT IT PRODUCES

js/dataproducts.js, 1,067 lines, and a Data Sources screen that is now a contract rather than a list.

CONSUME. BATDOK-J is named as the plausible point-of-injury producer — JOMIS point-of-injury and en-route care, AFRL 711 HPW, selected 2022, fielding FY26. The interface is stated as INTERFACE ACCEPTED · NOT TESTED AGAINST A REAL BATDOK-J, which is the truth and is worth more than a claim that would not survive one question.

PRODUCE. Ten working download controls: a FHIR-shaped bundle (8.7 MB, 4,151 resources — 125 Patient, 3,985 Observation, 21 ServiceRequest, 20 Procedure, zero dangling references), the decision record with full 64-hex SHA-256 digests, the run result as JSON and as CSV, five JSON Schemas, and datacatalog.json describing five produces, two consumes and the vertical path point of injury → OMDS → MHS GENESIS.

The FHIR caveat — FHIR-SHAPED, NOT CONFORMANCE-TESTED — appears in five places including meta.tag on every single resource, so it cannot be lost by copying one file out of the bundle. All five schemas validate under ajv 8, draft 2020-12, offline.

#### 4 · SECURITY AND SUSTAINABILITY — THE PROOF THAT SHIPS

app/selftest.html, reached from Settings → Engine self-test. 118 assertions against the shipped engine, in the browser, offline, nothing mocked, 850 ms. Twelve groups: determinism and common random numbers, the reference result, conservation invariants, the physiological deadline, payload and cold chain and receiver tier, range gating, triage precedence, SHA-256 and the audit chain including tamper-evidence, the seekable snapshot, all seven theatres, the levers and the Monte Carlo path, and directional sanity. 118 pass.

documents/ANGEL-SWARM-SECURITY-AND-ATO — STRIDE threat model over ten assets, five actors and seven trust boundaries; 21 threat rows each split into the mitigation IN PLACE and the mitigation REQUIRED; deep-dives on supply chain, model integrity, audit-chain forgery and adversarial denial; a ten-item residual risk register; and the RMF pathway with the NIST SP 800-53 Rev 5 families that are already partly satisfied by design. Every control identifier was checked against the published catalogue.

documents/ANGEL-SWARM-SBOM — CycloneDX 1.6, 42 components, every hash measured off disk, validated against the CycloneDX project's own schema.

#### 5 · THREE FINDINGS THE SELF-TEST AND THE SBOM SURFACED

They are recorded rather than smoothed over, because a prototype that cannot name its own soft spots is not evidence of anything.

ONE BATTLE IS NOT A THEATRE, AND AN EARLIER DRAFT OF THIS ENTRY GOT THAT WRONG. A single-seed probe found that at seed 42, EUCOM_FJORD gives ARM A 16 against ARM B 15, and that was written up here as "ANGEL SWARM does not win every theatre." That statement was false and it has been removed.

Re-measured on this engine at 200 paired replications per theatre, 1,400 in total — see documents/ANGEL-SWARM-WIN-PROBABILITY-v5.9:

> ANGEL SWARM WINS ALL SEVEN THEATRES. EVERY 95% INTERVAL EXCLUDES ZERO. ACROSS 1,400 PAIRED BATTLES IT PRODUCED MORE DEAD IN 6 — 0.43% — AND NEVER BY MORE THAN ONE.

Four of the seven are never once worse in 200 battles; in those the worst case is a tie. EUCOM_FJORD is the weakest theatre and holds four of the six adverse draws — mean −1.865, interval −2.045 … −1.685, better on 173 of 200 — because it is a compressed laydown where distance stops discriminating and a deadline sort has less to work with. Seed 42 is one of those four draws. It is a draw from a distribution, not a property of the theatre.

The self-test asserts directionality on the reference scenario only. That is a limit of what 800 milliseconds in a browser tab can assert, not a hedge: a 1,400-replication sweep is a harness job, and the harness is winprob.mjs.

THE LEVERS ARE NOT ALL SYMMETRIC. At seed 42, RESPONDER QUALIFICATION moves both arms; FLEET SIZE and TRIAGE ERROR move only the control arm; DATALINK OUTAGE and LAUNCH POINTS move only ANGEL SWARM. Each assertion is written to the measurement rather than to the assumption.

THE CONTROL ARM'S STOP ORDER IS PROXIMITY, NOT RANK, and the header comment in optimizer.js said otherwise. The code was not changed; the comment was. Forcing the lead casualty to be served first was measured over 120 paired seeds: it moves the control arm by 0.08 deaths — worse on 40 seeds, better on 30, unchanged on 50. That is inside the noise, and it is in the direction that makes the control arm look WORSE. The behaviour on the page is now the behaviour the file describes.

REFERENCE RESULT UNCHANGED THROUGH ALL OF IT: seed 42, JOA CORAL, capability deployed — 23 / 34 / 35 survivable deaths on 20 / 38 / 0 sorties. Asserted by the self-test rather than asserted in a slide.

## Version 5.8 — 8 September 2026 — FINAL

### WHAT CHANGED IN 5.8 — A COMMANDER CAN WAR-GAME THIS NOW

THE CAPABILITY WAS BUILT AND THE INTERFACE DID NOT REACH IT. js/mc.worker.js is a paired Monte Carlo harness with four levers, running the real sim.js and optimizer.js off the main thread. It was loaded by the previous console and index.html contained zero references to it. Seven scenarios existed and one was reachable. The responder mix — the model's largest single killer — was a hard constant.

WAR GAME, a new destination between Evidence and Ask ANGEL. Five levers:

```text
FLEET SIZE               every airframe count at every launch point
LAUNCH POINTS            how many sites are sited
DATALINK OUTAGE          how long every denial window lasts
TRIAGE ERROR             the START over- and under-triage rates
RESPONDER QUALIFICATION  how many on scene can give blood        (new)
```

WHAT THE SCREEN SAYS FIRST, BECAUSE IT IS THE POINT. Every lever moves the force for BOTH arms — applyLever mutates the shared world after the casualty stream is fixed and before either arm is built. There is no no-drones arm on this screen and nothing here measures whether unmanned lift works. What the sweep measures is how much of the result is the tasking decision and how much of it survives a worse world.

The interval drawn on the gap is a PAIRED interval: both arms fly one casualty stream per seed under common random numbers, so the difference is formed inside a single battle before anything is averaged. That is what makes the remaining difference attributable to the tasking.

### A CLAIM ON THE EVIDENCE PAGE WAS FALSE, AND THE TRUTH IS BETTER

It said: "FLEET SIZE — close to inert. Only the 'every aircraft committed' bucket would shrink. Growing the fleet threefold did not improve this arm."

Swept over 100 paired seeds at five fleet sizes. Both assertions are wrong. Tripling every airframe count improves ANGEL SWARM by 1.2 survivable deaths (23.4 → 22.2, t = −11.5, worse on not one seed of the hundred), and two buckets shrink rather than one — "every aircraft committed" 0.9 → 0.4 and "no launch point in reach" 4.7 → 4.1.

What survives is the stronger claim, and it is the answer to the obvious rebuttal. Because the lever moves both arms, more aircraft cannot close the gap:

> SEVEN AIRFRAMES TASKED ON A PHYSIOLOGICAL DEADLINE STILL BEAT TWENTY-ONE TASKED ON TRIAGE AND PROXIMITY, BY 3.0 SURVIVABLE DEATHS, ON 92 OF 100 IDENTICAL BATTLES.

And one bucket does not move at all. Nobody on scene who could administer: 12.0 deaths at seven airframes, 12.0 at twenty-one, identical to two decimal places. Aircraft cannot touch it.

### WHICH IS WHY THE FIFTH LEVER EXISTS

TIER_MIX was a constant — 58% all-service-member, 32% combat lifesaver, 10% combat medic — so the largest killer in the model was the one thing a commander could not vary. It is a lever now. Measured, 5 points, 30 paired seeds each:

```text
medics       ANGEL SWARM   CURRENT — T&P   gap
1 in 10          23.5          27.7        4.2
2 in 10          22.9          27.3        4.4
3 in 10          22.2          26.9        4.8
4 in 10          21.7          26.7        5.0
5 in 10          20.9          26.2        5.4
```

Both arms improve, monotonically. And THE GAP WIDENS — 4.2 to 5.4. Putting a trained receiver on the ground is worth more under deadline tasking than under triage and proximity, because a delivery that arrives in time is only worth something if somebody present can give it. The two investments compound.

The lever holds the T1:T2 ratio fixed and rescales. It re-reads each casualty's own stored uniform against the new mix rather than redrawing, so the casualty stream is bit-identical at every sweep point — 121 casualties per battle at all five — and only casualties whose draw falls in the band that moved change tier. Common random numbers applied to the responder population.

### SEVEN SCENARIOS, ALL REACHABLE

The engine adapter pinned PACOM_CORAL at load and derived the scenario, the units, the site names and the world from it once. Settings showed four operations with a dot on CORAL and the rest tagged REPORTED ONLY, and pressing them did nothing — a picture of a choice.

All seven are selectable now, grouped by combatant command, each read out of the engine's own table rather than restated: PACOM CORAL, BASALT, MARINER, TIMBER and EUCOM GRANITE, AMBER, FJORD. Measured at seed 42, deployed:

```text
CORAL    125 casualties   23 v 34   20 v 38 sorties
GRANITE  151              24 v 28   15 v 24
BASALT   174              27 v 32   17 v 22
MARINER   71              16 v 24   18 v 41
TIMBER    81              17 v 20   17 v 44
AMBER    169              42 v 45   15 v 23
FJORD     78              16 v 15   12 v 21
```

The War Game sweep runs against whichever scenario is selected. FJORD is the one where ANGEL SWARM finishes a death worse, and it is left in the list rather than hidden.

### TWO MORE THINGS THE PICKER EXPOSED

Settings' "fixed for this run" panel stated the responder mix as 45/35/20. sim.js has always said 58/32/10. The panel is computed from the engine now rather than transcribed. The Ops Center Wall's live row was hardcoded to CORAL and follows the run.

### VERIFIED, NOT ASSERTED

13 of 13 destinations populated after a run. Reference result unchanged — 23 dead on 20 sorties against 34 on 38 — checked before the sim.js change, after it, and off the live page. Every death figure on every touched screen measured at hue 25. 0 uncaught page errors, 0 off-origin requests. A sweep of 150 replications completes in 15.7 s on a two-core container with a single worker; on an eight-core machine the pool takes seven and it is about a fifth of that.

## Version 5.7 — 8 September 2026 — FINAL

### WHAT CHANGED IN 5.7 — THE TWO ARMS HAVE COLOURS, AND SIX DEFECTS ARE FIXED

THE ARMS ARE TOLD APART NOW. Until this version the two tasking arms were distinguished by position and by a teal label on one of them, so a reader who had not been told what they were looking at could not say which column was which. Both arms now carry a hue, declared once as ARM in index.html and read from there by every screen that draws a comparison.

```text
ANGEL SWARM                    teal, hue 165
CURRENT — TRIAGE & PROXIMITY   orange, hue 50
```

WHY HUE 50 AND NOT THE ESCALATION AMBER. Hue 50 is the orange the films already use for the baseline, so the application and both films now agree without a frame of either being re-rendered. It is deliberately NOT the escalation amber at hue 75: an operator seeing amber needs to read "somebody has to decide this", not "this is the baseline arm". Twenty-six degrees keeps them apart, and the two roles never share a component shape — escalation is a state pill, an arm is a label with a spine.

WHAT THE COLOUR IS NOT. It is not a verdict. Teal is not "good" and orange is not "bad"; they are callsigns. EVERY DEATH FIGURE ON BOTH ARMS STAYS RED, hue 25, because a death is a death whichever tasking produced it. The comparison is carried by the size of the number and the length of the bar. And ANGEL SWARM is drawn first everywhere — left column, top row — without exception.

Applied on: the run-complete card, Command Overview, Evidence (all four tabs), Ops Center Wall, Decisions, Live Casualties, the Analyst Terminal's SQL console, and the theatre panels.

### THREE DEATH FIGURES WERE NOT RED, AND ONE WAS GREEN

Found while applying the scheme, all pre-existing:

- THE AFTER-ACTION REPORT WAS SETTING A FLAG IT NEVER READ. Every row in that table declared whether it was a death figure and the template printed all of them in the same neutral, so the one screen that exists to state the toll printed 23 and 34 as though they were sortie counts. The flag is honoured.

- "MEAN FEWER DEAD" IN THE REPLICATION STUDY WAS DRAWN ON THE TEAL SUCCESS FAMILY — a count of dead soldiers in the colour this application uses for things that went well. It is red. (Verified in source; the card only appears after a forty-run study has been run, so it was not exercised on screen.)

- THE DECISIONS THEATRE STRIP printed DIED OF WOUNDS in the same colour as ADMITTED and SORTIES FLOWN. It is red.

The Analyst Terminal also had a stray hue-145 green that rendered "31 dead all categories" green. Hue 145 is not in this application's palette and is now gone from that destination entirely.

### FIVE OTHER DEFECTS

THE DEGRADED-COMMS BANNER WAS BEING DRAWN BEHIND THE CHROME. The map paints "SATCOM DENIED — HOLDING LAST-KNOWN-GOOD PLAN, AIRCRAFT STILL FLYING" near the top of its own canvas, at a Y chosen to clear the standalone console's pane labels. Under this design the thing above the map is the floating header card, which is taller — so for the whole twelve-minute denial window the one warning the map exists to give was hidden. The host now measures its own chrome and publishes the offset; the renderers add it and fall back to zero when nothing publishes one, so the console standing alone is untouched.

ASK ANGEL IGNORED THE ENTER KEY. You had to reach for the button. Enter submits now.

ASK ANGEL PUT THE ANSWER ABOVE THE QUESTION. Measured before: the answer card opened 133 px above the input. It is 172 px below it now, so the reading order is question, then answer.

LIVE CASUALTIES DID NOT SAY WHICH ARM IT WAS SHOWING. A judge could read the whole board without knowing whether ANGEL SWARM was running. A chip in the header names it — TASKING ARM · ANGEL SWARM when deployed, TASKING ARM · CURRENT — TRIAGE & PROXIMITY when not, which is what both arms run when nothing is deployed.

THE ANALYST TERMINAL WAS MONOCHROME. Output is now coloured by meaning rather than decoration: deaths red without exception, escalation and things awaiting a person amber, delivered and authorised teal, the audit chain violet, headers cyan, everything else neutral. Zero counts drop to dim — except death counts, which stay red at zero.

### THE RUN-COMPLETE CARD READS AS A COMPARISON

Each metric is its own bounded block with the difference stated on its row, each arm carries a spine in its own colour, and the figures went from 14 px to 23 px.

### VERIFIED, NOT ASSERTED

Driven end to end with real pointer clicks. 12 of 12 destinations populated after the run, reference result 23 dead on 20 sorties against 34 on 38, 0 page errors, 0 off-origin requests. Every death figure on every touched destination measured at hue 25. The SATCOM banner photographed clear of the chrome at T+91. Ask ANGEL's geometry measured before and after.

## Version 5.6 — 8 September 2026 — FINAL

### WHAT CHANGED IN 5.6 — THE DOCUMENTS CATCH UP, AND THE PACKAGE IS THREE FILES

THE WRITTEN RECORD SAID "CLASS VIII PUSH" IN 60 PLACES. The application and both films had been corrected; the documents had not, which meant the written record contradicted the thing it described. Every shipped document now uses CURRENT — TRIAGE & PROXIMITY, and the phrase survives in exactly one place: the sentence in the use case explaining that this is NOT a push.

THE BASELINE IS NOW DEFINED PROPERLY. The use case had one sentence naming the baseline and it described a push package. It now says what the baseline actually is, and says plainly that it has no doctrinal name:

> Doctrine names the function — medical regulating, which covers patients and bed space rather than materiel (JP 4-02). It names the cell that performs it, the evacuation precedence categories (ATP 4-02.2, Table 2-1), the nine-line request format and the launch authority. It does not name the rule that decides which aircraft serves which casualty; that is left to unit standing operating procedure.

And it names what ANGEL SWARM does, which doctrine DOES have a term for: emergency movement of Class VIII, blood, and blood products, a named MEDEVAC primary task (ATP 4-02.2, Ch 2, Sec IV).

THE OPENING CLAIM WAS OVERSTATED IN THE OTHER DIRECTION. The use case's first line said ANGEL SWARM tasks "rather than against the doctrinal rule of nearest available airframe." There is no doctrinal rule. It now reads "rather than against the nearest available airframe and a best guess at who needs it most — the practice everywhere today, which no doctrine actually names." That is both accurate and the stronger claim.

THE PUBLIC USE CASE NOW SEPARATES THE TWO DECISIONS. It said "today it is pushed, not pulled," which is true of the supply chain and false of the tasking. Stock moves forward by push — configured in advance against a planner's estimate, which is what doctrine means by a push package. The delivery to an individual casualty is pulled, triggered when that casualty appears, served by whichever aircraft is closest and free. The push is a forecasting problem; the pull is a tasking problem; this use case is about the second one.

AND IT CARRIES THE RIGHT CLOCK. The Golden Hour stays as problem framing — it is a Secretary of Defense mandate for evacuating a casualty to a facility and the outcome analysis behind it is real. It is not a standard for getting blood into a casualty. That figure is in the Department's own guideline and it is shorter: "early blood product resuscitation, ideally within 36 minutes of injury" (JTS CPG ID 18, 12 Jul 2019). A distribution system built to the sixty-minute figure is built to the wrong number by almost half.

Word versions of all eight documents were rebuilt from the corrected source.

THREE FILES, AND EVERYTHING IS IN THEM. Both films have been inside ANGEL_SWARM/app/video/ since they were made — the sixty-second cut and the full film, each with its VP9 fallback — and they play from the application at Authority & Policy -> The film. Nothing is delivered outside the three parts any more, and the checksums for parts 2 and 3 travel inside part 1 at CHECKSUMS.txt rather than as a fourth download.

## Version 5.5 — 8 September 2026 — FINAL

### WHAT CHANGED IN 5.5 — TWO FILMS, AND THE FILM STOPS SAYING THINGS THAT ARE NOT TRUE ANY MORE

THE FILM HAD DRIFTED AWAY FROM THE ENGINE. It is drawn by app/js/film_inline.js — renderFrame(t) is deterministic, so every frame can be captured one at a time — but the figures in it were written by hand against an older build and never re-checked. Measured against the adapter at seed 42 and corrected:

```text
claimed                              measured
27 dead under ANGEL SWARM            23
1 wasted delivery, 1 unit lost       0 and 0
43 wasted deliveries (control)       45
97% of deliveries usable / 55%       95% / 34%
58% give out inside the hour / 42%   60% / 40%
16% fewer, 40 of 40, both theatres   18% fewer, better in 40 of 40
                                     paired runs, 95% CI 15-20%
"99% LESS BLOOD DESTROYED"           ANGEL destroys none, so the
                                     percentage was the wrong shape:
                                     28 UNITS OF BLOOD NOT DESTROYED
```

"BOTH THEATRES" came off entirely. There is one theatre — PACOM — with three JOA variants. The claim was not supported and is not made.

AND ONE THE APPLICATION HAD ALREADY WARNED ABOUT. The film said the sensor "PREDICTS COLLAPSE 16-25 MIN AHEAD". The provenance note against PARAMS.CRM_LEAD_MEAN in js/sim.js says, in as many words, that the 16:35 and 25:44 figures often quoted as a "16-25 min field range" are TWO INDIVIDUAL CASUALTIES at the 2024 Army Warfighter Expeditionary Experiment and not a cohort range. The film was repeating the error the engine had already written down. It now says 18.3 ± 7.9 min and cites Ortiz et al., Front Bioeng Biotechnol 2026;14:1756626.

THE QUOTE IS HELD. COL Jason Corley's line about evacuation delayed beyond 72 hours is the sentence the whole film is answering, and it went by in 5.4 seconds. It is on screen for 9.0 seconds now, and the scene grew to carry it.

AND THE BLOOD STANDARD FOLLOWS IT. The Golden Hour stays — it is real, it is a Secretary of Defense mandate, and it is the number the audience knows — but it governs EVACUATING a casualty to a treatment facility. The standard for getting blood into one is in DoD's own clinical guideline and it is shorter: "early blood product resuscitation, ideally within 36 minutes of injury" (JTS CPG ID 18, Damage Control Resuscitation, 12 Jul 2019). The film now says so, and adds the figure off this run's own casualties: 44% of the time-critical cohort are already inside 36 minutes when they are wounded.

SCENE TIMING IS DERIVED, NOT TRANSCRIBED. Every scene start used to be written out by hand beside its duration, so lengthening one scene meant editing nine numbers and the total. Get one wrong and the dispatch in renderFrame silently disagrees with the scene's own clock. Durations are now declared once and the starts are added up.

### THE SIXTY-SECOND CUT

A hackathon slot is five minutes and it includes questions. A 3m15s film spends most of it. This is a separate edit, not a trim: different beats, different pacing, and it stands alone with nobody narrating over it.

```text
00-09  87% die before reaching a doctor. One in four could have lived.
09-20  The Golden Hour, struck through. COL Corley on 72 hours. And
       sixty minutes was never the standard for blood — the guideline
       says 36.
20-28  Today the aircraft that goes is the one that is closest.
       Nothing asks how long this soldier has.
       NO DOCTRINE NAMES THE RULE THAT PICKS IT.
28-39  One casualty, one falling reserve, one number: a sensor reads
       the pulse and says how long he has, 18 minutes ahead, with vital
       signs still normal. Tasking runs against the deadline, not the
       distance.
39-51  23 against 34. Same casualties, same aircraft, same blood.
       11 fewer dead. Better in 40 of 40 paired runs.
51-60  The machine proposes. A human decides.
```

It shares every primitive with the long film — same palette, type, grid, brackets and sweep — so the two are unmistakably the same object. What it does not share is HOLD, the long film's 1.55x dwell multiplier: sixty seconds has no room for dwell.

The strongest thing in it is a negative claim, and it is the one worth standing on: doctrine names the function, the cell that performs it, the inputs and the launch authority, and never names the rule that decides which aircraft serves which casualty. Two independent doctrinal sweeps looked for that term. It does not exist.

Both cuts ship, and the film tab opens on the short one.

### VERIFIED, NOT ASSERTED

Every frame of both films was walked and measured for a black gap — the failure where two statements do not overlap and the picture drops out between them. It found one, six frames long, at five seconds into the short cut, and one single frame in its third scene. Both were cross-faded and re-measured:

```text
60-second cut   1,800 frames   near-black: 13, all in the opening fade
full film       5,850 frames   near-black: 14, all in the opening fade
```

Both encode to 1920x1080 · 30 fps · H.264, silent, with VP9 720p fallbacks, and both were checked by pulling frames back OUT of the encoded files rather than trusting the source frames.

```text
ANGEL-SWARM-film-60s-HQ.mp4     60.000 s   1,800 frames    6,631,789 B
ANGEL-SWARM-film-60s-720.webm   60.000 s                   1,163,403 B
ANGEL-SWARM-film-v3-HQ.mp4     195.000 s   5,850 frames   18,506,785 B
ANGEL-SWARM-film-v3-720.webm   195.000 s                   3,220,709 B
```

The application: driven end to end with real pointer clicks, 12 of 12 destinations populated after the run, reference result 23 dead on 20 sorties against 34 on 38, 0 page errors, 0 off-origin requests, no "Class VIII push" anywhere in the rendered text.

## Version 5.4 — 8 September 2026 — FINAL

### WHAT CHANGED IN 5.4 — THE TERMINOLOGY, AND A CASUALTY YOU CAN ACTUALLY REACH

"CLASS VIII PUSH" WAS WRONG, AND WRONG IN THE INVERTING DIRECTION.

A push package is anticipatory: preconfigured, scheduled, sent before anyone asks, and explicitly a SUBSTITUTE for requisitioning — "until line item requisition procedures can be established" (JP 4-02.1, 6 Oct 1997, Ch II); "each FSMC receives a preconfigured push-package every 48 hours" (FM 4-02.1, 28 Sep 2001, §4-8a).

The control arm does the opposite. optimizer.js sorts open casualties by TRIAGE_RANK over their triage category, breaks ties on earliest wounding, and sends the nearest available airframe that can reach. It fires because a casualty appeared. Doctrinally that is a pull.

The arm is now called CURRENT — TRIAGE & PROXIMITY, which is what the code has always done and what the file's own header comment always said. 141 occurrences across index.html, js/ and angel-engine.js. Every replaced line was read for grammar rather than swept: article drops, sentence-initial capitals and one possessive were corrected by hand afterwards.

AND THE THING IT REPLACES HAS NO DOCTRINAL NAME AT ALL. Two independent doctrinal sweeps, joint and Army, looked for a term naming the rule by which a medical asset is matched to a casualty. There is none. Doctrine names the function (medical regulating — patients and bed space, not materiel), the cell that performs it (PECC), the inputs, the request format and the launch authority, and stops. The operations-research literature has to construct the baseline rather than cite it: "myopic policy, which tasks the closest-available MEDEVAC unit to service an incoming request" (DTIC AD1133454), attributed to no publication.

What ANGEL SWARM does, on the other hand, is a named MEDEVAC primary task: "emergency movement of Class VIII, blood, and blood products" — ATP 4-02.2, Medical Evacuation, 12 Jul 2019, Ch 2 Sec IV.

CLASS VIIIB, WHERE IT IS ACTUALLY BLOOD. Blood and freeze-dried plasma are Class VIIIB; TXA, the haemorrhage kit and the chest seal are Class VIIIA (DoDI 5101.15, eff. 29 Sep 2023). The payload catalogue now carries the class per item and the shelf panes say which is which. Where the text means the whole five-item bundle it still reads Class VIII, because that is correct — a blanket replace would have mislabelled three of the five.

THE BLOOD STANDARD IS 36 MINUTES, NOT 60. The Golden Hour is kept, because it is real and it is the number the audience knows — but it is a SecDef mandate for evacuating a casualty to a treatment facility, not a standard for getting blood to one. The blood figure is in DoD's own guideline: "early blood product resuscitation (ideally within 36 minutes of injury) provides the lowest early and late mortality rates" — JTS CPG ID 18, Damage Control Resuscitation, 12 Jul 2019. Three reference-register entries were added for it, for the ATP 4-02.2 task and for the VIIIA/VIIIB split.

THE TWO ARMS ARE NOW COMPARED, NOT LISTED. The run-complete card printed six numbers in two columns and left the reader to do the subtraction. Each metric now draws both arms as bars on one shared scale with the difference stated beside it, so 23 against 34 and 20 sorties against 38 are seen rather than worked out. Deaths stay red on both arms and in the difference — the shorter bar is the better outcome and the length says so; colouring it green would score a death, which this application does not do. Two prose lines that restated the table were removed. The card is 854 pixels tall where it was about 1,490, so it no longer scrolls.

THE MARK IS THE VIC AGAIN. Three deltas in formation, the original vector geometry from the previous build, in the application's red. It is the rail mark and the favicon, and it is vector at every size.

CLICKING A CASUALTY NOW REACHES THAT CASUALTY. This was a real defect and it was global. Opening a record set the expanded casualty and switched to the board — and did nothing else. The board renders all 125 rows from the top, so a record for a casualty two thirds down opened at 1,316 or 1,772 pixels on a 1,050-pixel screen with the page scrolled to zero. The record WAS open, below the fold, which reads exactly as "it just dumped me on the casualty page."

Two causes, both fixed: - three of the six paths that open a record set the state inline and never called the opener, so they could not have scrolled; - the opener's retry budget expired before a cold board had built the card, so the first casualty clicked in a session never scrolled and every one after it did.

Measured after the fix, cold open from each destination, correct casualty every time:

```text
Ops Center Wall  -> CAS-007    card top  96 px   in view
Decisions        -> CAS-011    card top  96 px   in view
Command Overview -> CAS-012    card top  96 px   in view
```

Decisions was worse than the others: its escalation rows and its handled- without-you rows printed a casualty id and were not clickable at all. Both are now links to the record.

### VERIFIED, NOT ASSERTED

Driven end to end with real pointer clicks at 1680x1050: deploy, play at 10x to T+180, close the result, walk all twelve destinations, then open a record from each of four destinations.

```text
reference result    23 dead on 20 sorties against 34 on 38
destinations        12 of 12 populated after the run
page errors         0
off-origin requests 0
"Class VIII push" in rendered text   none
```

The one 404 is /telemetry/status, which the Go launcher serves and a plain static file server does not; it does not appear when the application is run the way it ships. index.html and design.html are byte-identical.

## Version 5.3 — 8 September 2026 — FINAL

If you are holding more than one copy of this package, this is the newer one. Anything carrying a VERSION.txt with a higher number supersedes this.

### WHAT CHANGED IN 5.3 — THE COMPLETED RUN STAYS ON THE BOARD

THE DEFECT. Reaching T+180 emptied the application. Command Overview, Live Casualties, Decisions, the Analyst Terminal and the Ops Center Wall all went blank the moment the run finished, which is the moment a reviewer actually wants to read them.

It was not that the data had gone. Called directly, the engine adapter at T+180 on seed 42 answered:

```text
open           0        admitted       125
rows           []       sortiesFlown    20
                        administered    20
                        audit entries   48
                        escalations      3
                        dead, ANGEL     23
                        dead, doctrine  34
```

Every screen was rendering the OPEN collections — who is still on the ground, what is still awaiting a decision — and at T+180 nothing is open, because everything is resolved. The run was intact and unread.

Every destination now draws the closed record when the run has ended, and says which it is drawing. Command Overview opens with "125 casualties admitted over 180 minutes, all resolved. This is the record of the run, not a live board." Nothing clears itself.

CLEARING IT IS NOW A DECISION. A RESET control sits in the command bar beside the run state, and it asks first — the confirmation names exactly what is discarded: the clock T+180 -> T+0, ANGEL SWARM withdrawn and seven airframes stood down, 125 casualties cleared from every destination, 48 audit entries discarded, and what you personally decided and asked. The result modal carries the same door as START OVER, beside KEEP THE RESULT.

THE PHOTOPLETHYSMOGRAM IS NOW WHAT ITS CAPTION SAYS IT IS. You asked whether it was unsmooth on purpose because it is 100 Hz. It was not. The trace ran at about 58.3 Hz on an irregular grid and was drawn 8.33 times a second, under a caption that read "100 Hz · TRAILING 5 s WINDOW". Both figures in that caption were wrong.

It is now driven at a true 100 Hz by device.js's own synth() — the same generator the network's weights were trained against — advanced as a rate against a wall clock on its own 60 fps animation frame, holding a 500-sample window. That window is not a display choice: 500 samples at 100 Hz is float32[1,1,500], the model's actual input tensor. Nothing is interpolated and nothing is resampled to make it look smoother.

THE CASUALTY IS NOW JOINED TO THE WHOLE PICTURE. Opening any casualty gives the full chain, in six parts: who and where (unit, role, site, mechanism, triage, first responder and their qualification, what they carried, what this wound needed); the clock (wounded at, deadline held, when it crossed the alarm line, how long the soldier decompensated, resolved at); what was sent (tail number, platform, launch point, payload, tasking order, launch, overhead, one-way transit, arrival against the deadline, cold chain, sorties to this soldier); under what authority (sortie, standing or escalated, escalated to a human or not, who disposed of it, when, the record entry and its hash, expected benefit); the record itself with every audit entry that names this soldier; and the outcome with the FIRST binding constraint named as first, not only.

Where no aircraft flew, the record says so in those words and invents no tail number.

AUTHORITY & POLICY READS AS A DOCUMENT. Card and section headers are oklch(0.78 0.07 195) at weight 700 against body text at oklch(0.8 0.006 250) weight 400 — so "Deliberately unmarked", "Policy posture" and "Reference register" are headers to the eye and not another line of prose. The card about the AI mark keeps the violet the mark itself uses.

DATA SOURCES IS A TABLE NOW. It was 19 entries in cards, and it was not the whole list. It is a seven-column register of 42 sources, grouped by what they are for, each row naming what the thing is, where it comes from, what it feeds, its size or rate, how it is delivered and its state — 25 shipping in the build, 5 made at runtime, 11 modelled. Every byte figure is measured off the file on disk. Qwen2.5-0.5B-Instruct is listed ABSENT, because it is not in this build, rather than being claimed.

THEATER MAP MOVED UP. It sits directly under Command Overview instead of last in the rail.

EVERY TAB CARRIES AN ICON. Nine tab strips, 26 tabs, 26 icons — 27 once the GPU renderer is up and TACTICAL 3D appears. The icons are drawn in the rail's own line vocabulary; none is imported.

### WHAT I FOUND AND FIXED MYSELF BEFORE SHIPPING THIS

THE THEATER MAP PRINTED FALSE ZEROS FOR SIX SECONDS. Opening the map after a completed run showed "51Q · T+0 MIN", CASUALTIES 0, AIRCRAFT AIRBORNE 0 and DIED OF WOUNDS 0 — under a run in which 23 soldiers died. It corrected itself once the renderers finished booting, but for those seconds the page stated something untrue.

The cause: ready() answers "is there an application in the dock", and that becomes true several seconds before that application's clock has been carried from T+0 to T+180. Every run figure in between is a real answer to the wrong minute. The map now withholds its run figures until its own clock agrees with the page around it, and says BRINGING THE RENDERERS UP, which is what is happening. Geometry — extent, force, launch points — is not withheld: it is as true at T+0 as at T+180.

Measured: at 1.2 s, 2.5 s and 4.0 s after opening the map the run figures are withheld and no false zero is on screen; at 7.0 s the map reads T+180. During a live run at 10x with the map already up, 70 consecutive samples showed the figures held continuously — zero withheld, zero transitions, so nothing blinks.

"−11 DEAD" WAS STILL GREEN IN ONE PLACE. The Decisions sidebar drew it on the design's teal success family. The standing instruction on this project is that a death figure is red, and the dashboard tile had already been moved; this card had been missed. It is now the same red, oklch(0.82 0.15 25). The footer of this application reads DEATHS COUNTED, NEVER SCORED.

### VERIFIED, NOT ASSERTED

Driven end to end with real pointer clicks at 1680x1050: deploy 7 airframes from 3 launch points, play at 10x to T+180, close the result, then walk all twelve destinations.

```text
reference result   ANGEL SWARM 23 dead on 20 sorties
                   against the Class VIII push's 34 on 38
destinations       12 of 12 populated after the run
page errors        0
off-origin requests 0
```

index.html and design.html are byte-identical.

## Version 5.2 — 8 September 2026 — FINAL

If you are holding more than one copy of this package, this is the newer one. The earlier set was named AS-part1of2.zip / AS-part2of2.zip and carries no VERSION.txt at all. Anything with this file in it supersedes it.

### WHAT CHANGED IN 5.2 — THE MAP, FULL BLEED, AND THE STUTTER EXPLAINED

THE STUTTER WAS NOT A FRAME-RATE PROBLEM. The frames were arriving; what was in them was teleporting. Every React render called sync(), and sync() SEEKED the engine — APP.running = false, then walk forward in whole 0.25 minute steps. So the renderer's own sixty-frame loop was switched off and the picture advanced in bursts six times a second.

Measured inside the render loop, the proportion of frames in which the mission clock actually moved:

```text
the standalone console      100%   median step 0.0167 min
the map, before             12.5%  median step 0.75 min
the map, after              100%   median step 0.071 min
```

A drone crossing 45 normal steps in one frame is what "jerky" looks like. sync() now servos the engine instead of seeking it: it reads the clock's RATE from the distance the host's t covers between calls, hands that to APP.speed, and takes drift out by leaning on the rate rather than by moving the map. Seeking is kept for what it is for — a backward scrub, a jump, a reset. A pause watch holds the map when the host stops talking.

Three other suspects were measured and cleared: the docking loop (0.08 ms per call), the host's own re-render (0.08 ms), and the state poll (0.03 ms). The docking loop is now event-driven anyway, because that is strictly better, but it was not the fault.

THE MAP FILLS THE VIEWPORT. Edge to edge from the rail to the right of the screen, top bar to bottom. No card frame, no side column, no page padding. Measured at 1680x1050: the surface is 1434 x 973.

EVERYTHING ELSE FLOATS OVER IT. Semi-translucent black behind a blur, in the design's own border, radius and type. Every panel collapses to a header and shifts to either side, and remembers where you put it:

```text
ON THIS GROUND        the five figures
MAP LAYERS AND LEGEND the full set, by section
RUN CONTROL           deploy, play, speed, pause
THIS OPERATION        the operation, or a selected casualty's record
```

A COLLAPSED PANEL STILL TELLS YOU WHEN A FIGURE MOVES. Collapsing takes a snapshot; anything that changes afterwards draws a chip on the header carrying the new number. The died-of-wounds chip is red, like every other death figure in this application.

THE RUN CONTROL IS ON THE MAP NOW. The map said "mission not started, press play" and offered nothing to press. It carries the same control the command bar does — the same state machine, not a copy — so a run can be started, paced and paused without leaving the picture.

THE LAYERS AND THE LEGEND ARE BACK IN FULL, each row with what it means rather than just its name, in collapsible sections. Twelve layers on the flat tactical map in three sections, nine on the GPU map in four. The theatre picture draws no layers, so the panel is not offered there and the tool row states that it carries three controls at that scale.

ONE HONEST NUMBER. A full-viewport map is 1.25 megapixels against the old card's 0.56 — 2.2 times the pixels to rasterise. On the software renderer used for testing, the frame interval roughly doubles with it. That is the cost of the size, it lands on the GPU on real hardware, and it is a different thing from the stutter above, which is fixed.

UNCHANGED, AND CHECKED: seed 42 gives ANGEL SWARM 23 dead of survivable wounds on 20 sorties against the Class VIII push's 34 on 38. Zero page errors, zero off-origin requests.

## WHAT CHANGED IN 5.1 — THE MAPS AND THE RUN MODEL, PUT BACK

5.0 shipped the design's own map component instead of this application's three renderers, and replaced the run model with the design's state switcher. Both were wrong, both were against instruction, and both are reverted.

THE THREE REAL RENDERERS ARE BACK, INSIDE THE DESIGN'S CHROME. The design's Theater Map page is unchanged — the THEATRE / TACTICAL 2D / TACTICAL 3D chips, the tool row, the layer panel, the side panel of operation cards. What sits under them is this application's own theatre picture, flat tactical map and GPU map. Every chip and every tool calls the real function; the scale dispatch is app.js's own, not a second copy of it. The design's theater-map.js is deleted, and with it the last raster basemap tile request.

Measured, with a real pointer, at every scale: zoom in, zoom out and fit move the camera that is on screen; the layer panel and the draw/hide-all control move real layer state; side by side switches the flat map to two arms. A control that cannot act at a scale is not drawn — three controls on the theatre picture, six on the flat map, five on the GPU map — and the GPU chip is removed outright on a machine that cannot run it. All three renderers verified painting by pixel sample, not by the presence of a canvas.

PRESS PLAY, WATCH IT RUN, READ THE RESULT. The COLD / STBY / EARLY / MID / PEND / DONE switcher is gone. In its place the primary action names the next step: Deploy, then Play with a speed control, and the clock runs to T+180 on its own. At the end the results modal opens by itself — the headline difference, both arms, where the remaining deaths came from, and the fairness contract. Dismiss it and the finished run is there to explore. The six states still exist; they are reached by running the scenario.

Every death figure in that modal is red.

#### FOUR CAPABILITIES RESTORED, AS TABS, IN THE DESIGN'S OWN LANGUAGE:

```text
The film            Authority & Policy — the argument end to end, 3:11
Accountability      Evidence — the hash chain, verified in the browser,
                    exported as a local file for an investigating officer
Replication study   Evidence — 40 paired replications on common random
                    numbers: mean 4.28 fewer dead, 95% CI 3.56-4.99,
                    39 better, 1 tied, 0 worse
Telemetry ingest    Sensor & Model — CoT over UDP, receive-only, with the
                    link states and what to run to enable it
```

AND A DEFECT THAT HAD BEEN LYING ON EVERY SCREEN: TELEMETRY.available is a function, so every `if (T && T.available)` was always true and every surface in the application reported LINK DOWN permanently, including the panel carrying the edge-autonomy claim. The export now publishes live values, and the message rate recomputes at read time rather than freezing at whatever it was when the emitter stopped.

A FALSE CLAIM REMOVED. Data Sources still listed "Basemap tiles · public tile service · the only outbound request this application makes." There is no such request. The row now reads theatre geometry, local, shipped inside the build.

UNCHANGED, AND CHECKED: seed 42 gives ANGEL SWARM 23 dead of survivable wounds on 20 sorties against the Class VIII push's 34 on 38. Zero page errors, zero off-origin requests.

## WHAT CHANGED IN 5.0 — THE DESIGN IS THE APPLICATION

The interface is no longer an interpretation of a design. It IS the design.

The Design Canvas — ANGEL_SWARM-v2.dc.html, its runtime support.js, and its theater-map.js — is served as the application's own front page, effectively verbatim. Nobody re-typed a colour, redrew an icon or estimated a margin, so none of those can drift. Every previous attempt on this project failed at exactly that seam.

WHAT WAS REPLACED IS THE ENGINE UNDERNEATH, NOT THE INTERFACE ON TOP. The canvas shipped with a 29 KB simulation of its own — good enough to make the screens move, not good enough to defend. It is gone. In its place is an adapter exposing the identical contract — buildRun(), snapshot(), tally(), WORLD, PAYLOADS, PLATFORMS — computed from the real engine: the two-arm simulation, the constrained tasking optimiser, the paired replication study, the hash-chained audit record.

THE REFERENCE RESULT IS REPRODUCED EXACTLY. buildRun({seed:42}) gives ANGEL SWARM 23 dead of survivable wounds on 20 sorties against the Class VIII push's 34 on 38. Both arms, 125 casualties, 180 minutes, asserted in a repeatable harness of 41 checks.

buildRun({deployed:false}) gives the honest undeployed case: 34 against 34. Nothing is being compared, and the interface says so rather than printing a delta nobody should read.

ALL THIRTEEN DESTINATIONS AND ALL SIX RUN STATES. The canvas carries what every previous design lacked — COLD, STBY, EARLY, MID, PEND and DONE, the deploy flow with airframes coming online one at a time, and a visible primary action. The question "how do I start a scenario" now has an answer on the screen.

FOUR HUNDRED AND NINETY-EIGHT OUTBOUND REQUESTS, REMOVED. The canvas's map fetched raster basemap tiles from a public CDN. Every one of them failed in the sandbox, so the map was paying an air-gap violation and getting a blank basemap for it. The tile path is deleted. The basemap is now drawn in process from Natural Earth geometry and scenario terrain that already ship inside the application — the same sources the console's own renderers use. Measured across the map, all three scales, every control and all six presets: zero requests to any host but the loopback port.

THE TRANSPORT BAR WAS A DEAD CONTROL. Play, the rate control and the follow toggle on the GPU map never fired: a pointer capture on the pane retargeted every click. Found by pressing them rather than by reading the code.

ONE DEPARTURE FROM THE CANVAS, ON A STANDING INSTRUCTION. The design draws "VS DOCTRINAL PUSH · −4 fewer dead" on a teal success tile. That figure is a count of dead soldiers. It is red. The tile keeps its shape, its position and its wording; only the colour family moves. The footer still reads DEATHS COUNTED, NEVER SCORED.

THE OLD CONSOLE IS NOT DELETED. It is at /console.html, working, for anything the new interface does not yet reach.

## WHAT CHANGED IN 4.0 — A NEW DESIGN, NOT A NEW COAT OF PAINT

The interface is rebuilt onto the design the user produced in Design Canvas (DESIGN/ANGEL_SWARM.dc.html). Every previous version of this console was an argument with itself about layout. This one has a drawing to answer to.

NINE DESTINATIONS, NOT TWENTY-FOUR. Command Overview, Live Casualties, Decision, Decision Feed, Analyst Terminal, Ops Center Wall, Evidence, Ask ANGEL, Theater Map. Nothing was deleted: the other fifteen destinations are tabs inside the nine, and the mapping is written down in one place — SECTIONS at the top of js/shell.js — rather than being discoverable only by clicking.

```text
Command Overview   the old DECIDE, STANDARD, UNITS, FLOW
Live Casualties    CASUALTIES, SUPPLY, FLEET, LAUNCHPOINTS
Decision           TASKING
Decision Feed      AUDIT, STREAM
Analyst Terminal   QUERY, DOCTRINE, DATA, SENSOR
Ops Center Wall    DASHBOARD
Evidence           CONFIDENCE, COMPARE, ANALYSIS, ROI, COST, AFTERACTION
Ask ANGEL          BRIEF
Theater Map        MISSION, and all three renderers
```

THE ENGINE IS UNTOUCHED AND STILL RUNNING. The simulation, the tasking optimiser, the three map renderers, the 200-replication study, the database and the trained models were not rewritten. What was replaced is everything a person looks at. Every figure on every screen is read out of the running simulation at the moment it is drawn; the canvas's own numbers — 18 casualties, 6 lift assets, 31U forward, −12 — were placeholders for spacing and not one of them appears in the build.

#### THREE DEPARTURES FROM THE CANVAS, EACH ON INSTRUCTION:

Deaths are RED. The canvas draws the delta against doctrinal push as a teal success tile. A death figure — the number, the bar, the marker — is red here, wherever it appears. The tile keeps its shape and its place in the row; only the family changes.

PACOM, not INDOPACOM.

The typefaces are served from this folder. The canvas links IBM Plex and Barlow Condensed from fonts.googleapis.com. This application's entire claim is that it decides locally and originates no outbound request — a webfont link would break that on the first paint, in front of a judge, on a machine with the network pulled. The three families are vendored as woff2 in app/fonts and served from the same loopback port as everything else. Verified at zero off-origin requests.

THE MAP IS THE MAP. Theater Map carries all three renderers — the theatre picture, the flat tactical map and the same fight on the GPU — with the scope switch drawn as the design's segmented control. A control that cannot act at the current scale is not drawn rather than drawn disabled: the theatre picture has no layers and no second arm, so the layer panel and the side-by-side control are absent there, and the GPU segment does not appear on a machine that cannot run it. Every control was pressed with a real pointer in every scale and the state it claims to change was recorded before and after.

#### TWO DEFECTS FOUND WHILE BUILDING IT, BOTH PRE-EXISTING:

The theatre map's zoom moved state and not pixels. Where the GPU module mounts, the theatre picture is a deck.gl surface and #mapTheater is display:none — so the zoom moved a canvas nobody was looking at. Both theatre cameras now move on one press.

The 2D layer panel was hidden by a role rule, so its control would have toggled a class on an invisible element.

AND ONE I INTRODUCED AND CAUGHT: the rule that stands the old chrome down is an allow-list, and every dialog in this application is a direct child of <body> — so the deploy sheet, the model sheet and the confirm were all invisible. The console came up and the control that starts the run opened nothing. Writing an exemption further down the stylesheet did not fix it: the allow-list selector carries an id inside :not() plus three classes and outranks any id-plus-class exemption written after it, !important or not. The dialogs are marked with a class the allow-list itself excludes. Verified by pressing the deploy button with a real pointer and watching the run start.

UNCHANGED, AND CHECKED: seed 42 still gives ANGEL SWARM 23 dead of survivable wounds on 20 sorties against the Class VIII push's 34 on 38. Zero page errors, zero console errors, zero off-origin requests.

## WHAT CHANGED IN 3.7 — UNDOING WHAT 3.6 GOT WRONG

THE MARKS FLASHED, AND THE CODE CALLED IT A DESIGN. A pane rewrites its own innerHTML, which destroys any mark inside it. 3.6 re-applied the marks on a 260ms timer and wrote a comment explaining the throttle as a performance choice. It was not a choice, it was a strobe: every badge on every screen went missing for up to a quarter of a second, four times a second, forever.

The stamp now runs in the SAME synchronous frame as the repaint that destroyed it, before the browser is given a chance to paint. There is no interval in which a figure is drawn without its mark. Measured over 240 consecutive animation frames on a live pane: zero changes in the mark count.

THE MARK IS THE ONE FROM THE ai-marks-v2 SHEET AGAIN. 3.6 invented a second badge — an `f(x) / NOT AI` mark — and hung it on arithmetic, geometry, costing and the simulation. It is not in the sheet, and it was wrong on the sheet's own terms: "the mark is a claim". A written rule makes no claim, so it carries no mark. What the sheet specifies is what is drawn: one inline `.ai-attr` unit, the colourway on `--m1/--m2/--m3`, the glyph as `.ai-mark` at 1em, the wordmark as real text in `.ai-attr-label` with a clipped gradient, and the glow as a drop-shadow on the wrapper rather than on the SVG. The invented mark is gone: zero instances of it anywhere in the build.

A DEATH COUNT WAS RENDERING GREEN. The decision bar's "11 fewer dead" asked for a CSS class named `good`, and the new semantic palette painted it green — so the largest number in the application, a count of dead soldiers, was drawn as a success metric. The footer of this same screen reads DEATHS COUNTED, NEVER SCORED. It is amber now, with a guard in the stylesheet so it cannot come back.

THE SCROLLBAR UNDER THE TOP BAR. 3.6 stopped the tool row amputating its own children by making it scroll, and left a visible track sitting under the command bar. The four controls that matter are pinned to the right and never leave, so nothing hides behind it; the track is gone and the row still scrolls by trackpad, wheel and keyboard.

THE LEFT RAIL STOPPED FOLLOWING YOU EVERYWHERE. A run summary was drawn on all 24 destinations, including the doctrine corpus, the SQL console and settings. There is now an explicit per-destination table: run context on the five destinations that are about the run, identity and clock on the registers, and on the twelve destinations it has nothing to say for, the rail is removed from the layout — the main column takes the width, 1192px to 1528px, rather than a 336px column holding an empty heading.

THE AFTER-ACTION REPORT READS LIKE A BRIEFING NOW. 493 words down to 175, longest paragraph 673 characters down to 76. The result as figures first, then the three largest causes, then what to change with the largest lever first — and everything else behind disclosures, shut on arrival.

SPACING, FROM A SCALE RATHER THAN FROM PATCHES. This has been reported three times and "fixed" twice, because both previous attempts wrote rules into a stylesheet that loses every specificity tie to the fifteen sheets loaded after it. Measured across all 24 destinations there were 33 distinct spacing values in use below 64px — 1, 2, 2.6, 2.7, 3, 3.6, 4, 5, 5.5, 6, 7, 8, 9, 10, 11, 12, 12.5, 13, 14 and on — which is what "haphazard" looks like from the inside. There are now 14, on an eight-step scale, with 99.8% of declarations on it, in a stylesheet loaded last.

COLOUR ON THE FIGURES. 134 of 231 figures were rendering as plain text — several semantic classes had been silently losing specificity ties for months and painting grey. Six states, each an existing theme token, each meaning the same thing on every pane, plus a 4px leading rail so state is a position and a shape as well as a colour. Minimum contrast across all four themes: 5.64:1. Every KPI colour clears AA; every semantic colour clears AAA.

UNCHANGED, AND CHECKED: seed 42 still gives ANGEL SWARM 23 dead of survivable wounds on 20 sorties against the Class VIII push's 34 on 38. Zero page errors, zero console errors, zero off-origin requests, zero pink or magenta computed colours anywhere.

## WHAT CHANGED IN 3.6 — IT READS LIKE A BRIEF NOW, NOT A DUMP

A REVIEWER CANNOT PRESENT FROM A WALL OF TEXT. The console carried 17,841 words across its 24 destinations and 1,620 rendered blocks longer than 140 characters. That is not a console, it is a report nobody asked for, and it is why a person who knows this application could not tell you where to start on any given screen.

It is now 11,459 words, and the number that matters more: THREE remaining prose blocks over 140 characters, down from 1,620. Nothing was deleted that carried information. Figures took the place of sentences; the explanation of HOW a figure was produced moved into the mark that sits beside it; genuinely narrative passages moved behind one line of label, shut on arrival. Every citation and every validation figure is still present and still checkable — a citation folded away is a citation withdrawn, so those carry an attribute that exempts them.

EVERY CALCULATION IS MARKED, AND THE MARK EXPLAINS ITSELF. There were 11 provenance marks visible in the whole application; 20 of the 24 destinations carried none at all, which is why the marks looked like a feature of the casualty register rather than a property of the console. There are now 177, on all 24, and the invariant is one mark per figure group rather than one per number — a badge on every digit is as unreadable as none.

The deterministic mark is back and it is deliberately NOT the AI mark. A trained model gets the sparkle, the violet ramp and the model's name. A written rule gets a neutral f(x), no colour claim, and the words NOT AI. Ten deterministic marks were added — the simulation, the paired Monte Carlo, costing, geometry, the hash chain, the SQL path, a doctrinal threshold, a published figure — because a screen that makes no model claim should say so rather than stay silent and let a reviewer assume.

The browser tooltip is gone. Each mark now opens a real card: which model or which rule, what it produced, HOW, and the validation figure where one exists. Escape dismisses it, it never traps focus, and it does not clip at the edge of the viewport.

DETAIL OPENS WHERE YOU ARE LOOKING. Selecting a casualty or an airframe pushed its whole record into the narrow left rail — the worst column on the screen for the densest content in the application. Casualties, aircraft, supplies, approvals and launch points now open an accordion in the main window, beneath the row, full width, with tabs inside it. The left rail went back to being context: 116 words on every destination, now 40.

Longest paragraph anywhere inside those detail regions: 109 characters.

THE DEAD CONTROLS. 1,131 interactive elements were pressed with a real pointer across 24 destinations and 4 role profiles, twice each, with the state before and after recorded. Seven were genuinely dead:

The ingest chip had no handler at all. It was a <span> with a focus ring and a help cursor that did nothing when pressed. It is a button now, and it goes where the link's full account is written.

"Show the detail" on Drones and on Supplies toggled a class whose CSS keys on markup a different module replaced months ago. Measured: 178 visible elements before the press and 178 after. They are withdrawn where they own nothing rather than re-pointed at somebody else's DOM.

Play and the scrubber on the GPU map were covered by the logistician's and the surgeon's own status strip, which sat on top of them at z-index 6. They worked for a commander. That is the "works in some views" again, and the strip has been lifted clear.

The doctrine chips declined silently while the encoder held the thread — no queued question, no disabled state, nothing. They now say they are busy, and the press is remembered and run rather than discarded.

THE TOOL ROW CLIPPED ITSELF AND CALLED IT LAYOUT. overflow:hidden, every child flex:none, the ingest chip appended last. At 1440 the row overflowed by 132px, at 1280 by 292px, at 1152 by 420px — and the chip, being last, went first: its entire box was off the page below roughly 1580px, unreachable by pointer or by tab. The instruments scroll now, and the four controls that answer "is this live, and which run am I looking at" are pinned to the right edge. Verified present and reachable at 1152, 1280, 1366, 1440 and 1680.

ONE HUE THAT SHOULD NEVER HAVE BEEN THERE. The SQL editor was painting keywords in the library's default orchid violet — the one colour this application is not allowed to draw. The editor now takes its palette from the console's own tokens and moves with the theme. Swept across every destination: zero pink or magenta computed colours anywhere.

UNCHANGED, AND CHECKED: seed 42 still gives ANGEL SWARM 23 dead of survivable wounds on 20 sorties against the Class VIII push's 34 on 38. Zero page errors, zero console errors, zero off-origin requests.

## WHAT CHANGED IN 3.5 — ONE RAIL, THREE MAPS, AND EVERY BUTTON ON IT WORKS

THE MAP CONTROLS WERE WIRED TO A MAP THAT WAS NOT ON SCREEN. This application draws the ground three ways — the theatre picture, the flat tactical map, and the same fight on the GPU — and each of them keeps its own idea of where the camera is. The theatre map carries a scale and an offset. The flat map carries APP.mapViewport. The GPU map keeps a deck.gl view state inside its own module and has never read either of the other two.

Every zoom, fit and layer control in the application drove APP.mapViewport and nothing else. That is one map out of three. On the theatre picture and on the GPU map those controls were live to the eye and dead to the touch: press zoom, nothing moves. That is the whole of "they don't work in some views and only partially on the others" — not a rendering fault, a wiring fault, and it had been there since the third map was added.

Every map control now asks which map is under it before it acts:

```text
Fit, zoom in, zoom out   theatre scale · flat viewport · GPU camera
Map layers               the flat map's legend · the GPU map's own panel
Draw every layer         APP.layers · G3.layers, whichever is drawing
Both arms side by side   the flat map only, where a second arm exists
```

The keyboard was wired the same wrong way and is fixed with it: + − and 0 now move the map the operator is looking at rather than a hidden canvas.

A CONTROL THAT IS PRESENT IS A CONTROL THAT WORKS. The theatre picture draws no layers and has no second arm, so a layer panel and a side-by-side switch are not "unavailable" there — they are meaningless, and they are no longer offered. The GPU map has layers but no second arm. Only the flat tactical map carries all six. Off the map entirely, none of them appear.

A ZOOM CONTROL NO LONGER NAVIGATES. Pressing zoom on the theatre map used to move the operator to a different map and zoom that one instead, because the "take me to a map first" fallback tested for the wrong destination. The theatre map has its own zoom and now answers with it.

THE STATE-CARRYING CONTROLS SHOW THEIR STATE. Map layers and side by side light when they are on, so pressing one twice to find out where you are is no longer necessary. Nothing is lit on a page that draws no map.

MEASURED, NOT ASSERTED. Every control on the rail was pressed with a real pointer in every destination and on all three maps — 69 presses — and the state each one claims to change was recorded before and after. Four presses change nothing, and all four are correct: pressing Approvals while standing on Approvals, and pressing the map you are already on. Zero page errors.

THE SLIDES ARE IN THE PACKAGE TOO. The pitch deck and the leadership opener were being handed over loose in the same way and are now in deck/. The rail verification matrix is in documents/.

THE FILM IS IN THE PACKAGE. It was being handed over as a loose file alongside the zips, which meant anyone who unzipped the package and looked for it did not find it. It now lives in video/ inside the package, where a person unpacking this looks for it. The package is three zips instead of two purely to keep every file under the 30 MB transfer limit.

THE PUBLIC USE CASE IS RENAMED AND DE-BRANDED. It is now:

Physiological-Deadline Blood Support for Emergency Casualties in Distributed Combat Operations

Physiological-Deadline-Blood-Support-USE-CASE-PUBLIC.md / .docx

A public use case states a problem. Naming it after a solution asserts the answer in the title and invites a reader to treat the whole document as marketing for one. The solution name no longer appears anywhere in it, and the sentence that read "ANGEL SWARM exists to close it" now reads "This use case is written against that gap."

Section 8, "Status", is removed with it. That section described the prototype's standing and results posture, which does not belong in a public problem statement either. The document now ends where it should: the problem, the required outcomes, the policy seam, and the provenance record.

## WHAT CHANGED IN 3.4 — A FRONT DOOR, AND THE SPACING ACTUALLY APPLIED

THERE IS A HOME PAGE NOW. The console opened on the map — the most detailed screen it has and the worst possible place to arrive cold — and a reload dropped a person into a tactical picture with no statement of where they were or what needed them. It opens on OVERVIEW, and the ANGEL SWARM wordmark is a button that takes you back there from anywhere.

WHY THE SPACING KEPT NOT WORKING. polish.css is the third stylesheet linked and FIFTEEN more arrive after it — every module that injects a <style> at runtime, plus data2.css. It loses every specificity tie. The .dsSlot padding added in 3.2 had never once applied, because role-commander.js declares .dsSlot too and declares it later; the decision bar had been painting the old values on all twenty-four pages. Every rule in the new spacing section is raised one level of specificity for that reason alone.

AND WHAT THE MEASUREMENT FOUND. A probe walked all twenty-four destinations and flagged every element whose ink sat closer than 12px to the box it was printed in: 133 of them. Now 5, and all five are deliberate — full-bleed map and film canvases that own their frame, tables that own a card edge, and CodeMirror's own gutter metric. The Scenarios page was the worst of them: montecarlo.js styles its cards' contents and never the gap to the card, so everything below each card head sat at zero. A second cause ran through six pages: 3.2's `.card > p{padding:16px 18px 0}` is one declaration and overwrote the padding-bottom five notes set for themselves, leaving closing sentences 0-4px off their own border while the heading above had 16.

GROUPS OPEN CLOSED. A page of launch-point groups with every one expanded is the flat table again with headings in it. Each header carries its own counts, and the group you want is one press away.

ONE COMMODITY, ONE COLOUR. Whole blood, plasma and cold chain were drawn in the same green, so three bars in a row read as one and the eye went back to the column header every time. Each item has its own hue at rest — and amber still overrides it the moment a number is low, because a warning has to beat a category or the category teaches the eye to ignore amber.

A MAP TOOL DOES NOT EXIST OFF THE MAP. Dimming them was the wrong answer and it was ours: a layer, zoom or fit control on the Casualties page is not temporarily unavailable, it is nonsense — there is no map under it. They are removed off the tactical map, and removed again on the theatre picture, which draws no layers and has its own zoom. Every one of them was verified operable on the map itself: legend, draw-every-layer, fit, zoom in, zoom out and side-by-side all move the state they claim to move.

NUMBERS BEFORE PROSE. Ten destinations that opened with two or three sentences and no figures now open with a stat row — Evidence, the cost case, the decision log, casualty flow, units, the sensor, doctrine retrieval, the analytical console, the export and ROI. Every figure comes from COUNT, the canonical counted-noun module. Each pane's lede is cut to its first sentence and the remainder folded behind a closed disclosure: nothing written was deleted, and nothing was rewritten.

A REGRESSION THIS RELEASE INTRODUCED AND FIXED. Making the wordmark a <button> so it could carry you home inherited the user agent's button chrome — a white box where the brand had been.

VERIFIED. Every destination, four themes, four roles, two widths: no missing or wrong panes, nothing escaping a scroll container, chrome geometry correct, zero page errors, zero console errors, zero requests off 127.0.0.1. Seed 42, fair, PACOM CORAL is still 23 v 34.

## WHAT CHANGED IN 3.3 — EVERYTHING BELONGS SOMEWHERE, AND HAS ROOM TO BREATHE

GROUPED BY LOCATION, THEN DETAIL. Casualties, Aircraft, Supplies and Approvals were each one flat table of the whole operation, which is why "where is this happening" was a question the console could not answer without going to the map. Everything in this fight belongs to a launch point — an aircraft is based at one, blood sits on its shelf, an approval was raised by its aircraft, and a casualty is or is not inside its reach — and all four pages are now grouped that way, with a header per site carrying the counts that matter for that page and a control that opens the site itself. Anything that belongs to no site gets its own group, named honestly: casualties out of reach of every launch point are not quietly dropped into the first one.

THE LAUNCH POINT IS A PAGE WITH TABS. Following the reference console's site detail: a breadcrumb, the site name, badges, the coordinate line, a KPI strip, and then five tabs — AIRCRAFT, SUPPLIES, REACH, APPROVALS, ACTIVITY. Reach is the one that matters most: it names the effective radius of each platform type held there at one unit of whole blood and counts the open casualties inside it, which is what turns "no launch point close enough to reach them" from an abstraction into a place you can go and look at. A tab with nothing in it says what nothing means there rather than showing an empty box.

THE RIGHT RAIL WAS A RELEASE BEHIND. It carried one button that toggled 2D against 3D — the whole of map switching before 3.2, and a stale half of it afterwards. It now mirrors the tool row exactly: Theatre, Tactical, Tactical 3D, as a radio group that shows which view is current. The GPU entry hides itself where WebGL2 cannot run. And the layer, fit and zoom tools, which mean nothing on the theatre picture, are dimmed there rather than looking live and doing nothing — the defect this rail was fixed for once already, in 1.2.

ROOM TO BREATHE. "Everything seems mashed together." Measured against the reference console, this one ran 12px of padding inside a card where the reference runs 16, 12px between blocks where it runs 16, and 7px of vertical room in a table row where it runs 10 to 12. Three or four pixels at a time, compounded across a pane with six cards and forty rows, is the whole difference between a screen that reads and one that has to be decoded. Pane gutters, card padding, block gaps, table rows, the inspector column and the decision bar have all been raised toward the reference, and the extra room comes back off below 1400px so nothing is pushed off a smaller display.

TWO DEFECTS FOUND WHILE DOING IT. - The spacing pass made #lpBody a flex column, which turned every child into a shrinkable flex item. The launch-point tab strip has no intrinsic height to defend, so it collapsed to a one-pixel rule and the five tabs vanished — while still reporting themselves 22px tall in the DOM, which is why the automated check passed and only a screenshot caught it. Spacing now adds air between siblings instead of taking over layout, and the strip declares flex:0 0 auto so it can never be the thing that gives way. - A KPI value wrapped its denominator under its numerator — "2" over "/2" — and dragged its caption down with it, leaving one tile in a row of six sitting a line lower than the rest.

VERIFIED. Every destination, four themes, four roles, two widths: no missing or wrong panes, nothing escaping a scroll container, chrome geometry correct everywhere, zero page errors, zero console errors, zero requests off 127.0.0.1. Seed 42, fair, PACOM CORAL is still 23 v 34.

## WHAT CHANGED IN 3.2 — THE RAIL IS A LIST OF THINGS, NOT A LIST OF ARGUMENTS

THE COMPLAINT THIS ANSWERS, IN THE USER'S WORDS: "a confusing, discombobulated mess of random KPIs, text, justification, calculations and maps all over the place. There are 3 different kinds of maps. I can't tell what I'm supposed to look at and then what next."

It was right, and the cause was not depth. It was that better than half the navigation was named for a CLAIM rather than for an OBJECT — "Why this exists", "The difference", "The case beyond lives", "What it costs", "How much is the seed?", "Evidence", "What to decide". A person cannot predict what is behind a claim, so every press was a surprise, and twenty-three surprises is not a console.

TEN DESTINATIONS, EVERY ONE A NOUN, IN THE ORDER A PERSON WALKS THEM. Overview · Map · Casualties · Aircraft · Launch points · Supplies · Approvals · Scenarios · After-action report · Copilot Where am I, what does the ground look like, who is down, what can fly, where does it fly from, what is on the shelf, what needs me, what if I ran it differently, what happened, what does it say in writing.

NOTHING WAS DELETED. The fourteen destinations that used to sit on the rail are still built and still reachable — through "Show every destination" at the foot of the rail, through the command palette, and from the after-action report, which is where an argument belongs.

ONE VOCABULARY, FOR EVERY ROLE. Each profile used to carry its own view list AND its own label map, so the same screen was "Waiting on you" to a commander and "Approvals" to a logistician, "Wounded soldiers" to a surgeon and "Casualties" to an analyst — four applications wearing one rail. A person who learned the console in one profile could not find anything in another. The rail is now identical in all four. A role still changes which figures lead on a pane, what the inspector column shows and what the decision bar says; it no longer changes the map of the application.

ONE MAP DESTINATION, THREE VIEWS. The three renderers this application has always had — the theatre picture, the tactical canvas and the GPU tactical view — were presented as separate places, one of them buried in a tool-row toggle. They are three scales of one question and they are switched on one control now: Theatre · Tactical · Tactical 3D. The GPU option hides itself where WebGL2 cannot run, rather than offering a view that will not draw. V walks the three in scale order.

TWO NEW DESTINATIONS, BOTH OF THEM THINGS. - LAUNCH POINTS. Every aircraft belongs to a launch point and the phrase "no launch point close enough to reach them" has carried a large share of the deaths in every run — and there was no page for one. There is now: a list with aircraft ready, blood and plasma on the shelf, warmest container, sorties flown from there, and casualties in and out of reach; click a row for that site's airframes, stock, reach by platform and sortie history. Reach is computed with the allocator's own test rather than a second one. Where the model cannot honestly attribute something to a site — deaths, for one — the page says so instead of inventing it. - AFTER-ACTION REPORT. Six numbered sections in one place: the one number, where the remaining deaths came from, what it cost, how much of it is the seed, what would change it, and where every figure came from with a link to the screen behind it. Before deployment it says NOTHING WAS COMPARED rather than showing a zeroed scoreboard.

A CRASH THAT HAD BEEN WAITING. `(p.labels && p.labels[v]) !== undefined` is true when labels is null — null is not undefined — and the ternary then read through the null. It never fired while every profile carried a label map. The moment one did not, the rail threw on its first entry and took the whole start-up with it.

VERIFIED. Every destination — the ten on the route and the fourteen behind the toggle — in four themes, four roles and two widths: no missing pane, no wrong pane, no content escaping a scroll container, chrome geometry correct everywhere, no empty panes, zero page errors, zero console errors, zero requests off 127.0.0.1. Seed 42, fair, PACOM CORAL is still 23 v 34. The Monte Carlo still runs.

## WHAT CHANGED IN 3.1 — THE FORCE IS NOT A POOL, AND THE COMMANDER'S SCREEN

TWO DEFECTS SHIPPED IN 3.0 ARE FIXED HERE. Both were found by testing 3.1, both were in the package delivered this morning, and both are stated first because they are the ones that mattered.

1. THE MONTE CARLO HAD BEEN DEAD SINCE 3.0. The telemetry seam added to optimizer.js in 3.0 read `window.TELEMETRY`. optimizer.js is loaded verbatim into mc.worker.js, and a Web Worker has no `window`, so every replication threw ReferenceError on its first casualty and "How much is the seed?" reported "The replication engine reported: window is not defined" instead of a distribution. The worker's own header had predicted this exact failure and it behaved as designed — it refused to report numbers from a half-loaded engine rather than reporting wrong ones. Guarded with `typeof window !== 'undefined'`. Re-measured after the fix and checked against v2.2, the last build in which the engine ran: the distribution is IDENTICAL. PACOM CORAL, fair, 200 paired replications — mean -4.705, 95% CI -5.011 to -4.399, Cohen's dz -2.145, 0 of 200 worse, 2 ties. EUCOM GRANITE — mean -4.070, CI -4.359 to -3.781, 0 of 200 worse, 5 ties.

2. NO LIVE READING EVER REACHED THE TASKING LAYER. The ingest tier received, parsed and displayed CoT telemetry correctly, and then every lookup missed. A CoT event identifies a track the way a tactical network does — "CAS-084" — and the model carries a bare integer, 84, so readingFor() never found anything and the seam was inert. The link-state demonstration was real; the consumption was not. Readings are now keyed on the digits, so both forms match. Measured after the fix: 125 of 125 casualties tasked on readings that arrived over the socket, in both arms, and the run still lands at 23 v 34.

THE FORCE IS NOT A POOL, AND NOW SAYS SO. - THE CROSS-THEATRE BUTTON IS GONE. "Send drones here" appeared against every operation in both combatant commands. It sent no drones anywhere: it silently discarded the run in progress and rebooted the simulation into the other theatre, before any confirmation, and cancelling the dialogue that opened afterwards did not put it back. An operation in another combatant command is now shown and inert — OUT OF THEATRE, NOT YOURS TO TASK. An operation in this command reads "Change operation", which is what the control does, and asks first, naming what is lost. - ONE CONTROL, THREE PLACES. The JOA row is drawn on the theatre cards, the theatre table and the commander's operations table. All three now call joaActionHTML(), so they cannot drift apart again. - THE ECHELON IS NAMED WHEREVER AIRCRAFT ARE COUNTED. The foot ribbon, the deployment badge and the deploy dialogue carry the owning JOA. A bare "7 AIRCRAFT" was the main thing implying a pool. - ORDER OF BATTLE. A new card on "What to decide" draws the ownership as it is: combatant command, joint operations area, launch point, airframe, with tail numbers, readiness, blood and cold chain per launch point.

```text
REINFORCEMENT, AND THE RULE THAT KEEPS IT HONEST.
- Add one airframe at a time to a named launch point, or in bulk across the
  launch points, or apply a saved force package.
- EVERY AIRCRAFT ADDED IS GIVEN TO BOTH ARMS. addAirframeToBoth() takes the
  two arms together; there is deliberately no way to reinforce one of them.
  Class VIII push flies the same fleet from the same launch points, so the
  difference that remains is the tasking decision and nothing else.
- WHAT IT SHOWS, MEASURED. PACOM CORAL, seed 42, fair, fleet 7 to 23:
      aircraft   ANGEL SWARM        CLASS VIII PUSH
           7     23 dead, 20 sorties    34 dead,  38 sorties
          11     23 dead, 20 sorties    33 dead,  70 sorties
          15     23 dead, 20 sorties    32 dead,  94 sorties
          23     23 dead, 20 sorties    31 dead, 141 sorties
  Tripling the fleet buys Class VIII push three fewer dead at nearly four
  times the sorties. ANGEL SWARM does not move at all, and leaves fifteen
  of twenty-three aircraft on the ground, because flying them would not
  change an outcome: the binding constraint is where the launch points are,
  not how many airframes sit on them. Seven of its remaining deaths are
  casualties no aircraft in the force could reach from any launch point.
  That is the argument the pane has always made in words. It can now be
  performed.
```

THE COMMANDER'S SCREEN. - A DECISION BAR, pinned above every screen in this role. Three slots, the same three questions, in the order they get asked: am I winning, does anything need me, what is about to go wrong. It is built from the same situation() the DECIDE pane is built from, so the bar and the pane cannot answer one question with two different numbers. - AMBER IS RESERVED. The decision slot is the only amber object on a commander's display. Deaths stay red; readiness levels carry a labelled chip rather than a colour alone. - EARLY IN A RUN THE DIFFERENCE IS NOISE and the bar says so — "too early to read, 7 of the cohort resolved" — rather than presenting a six-casualty margin as a result. The number is still printed. Suppressing it would be a lie by omission. - THE LEFT COLUMN IS THE COMMANDER'S, and switchable. It opens on the operation he is in, what is waiting on his decision with Approve and Reject on the same card, and the two or three things off track. RUN SUMMARY and the per-sortie LATEST EVENTS ticker are one press away under RUN DETAIL, and are still the default for the other three roles. The switch is present in both states, because a filtered view with no way back reads as a broken one — the rail taught that in 1.2. - THE MAP BANNER NO LONGER REPEATS THE BAR. On THE FIGHT it used to carry the delta, both arms' tolls, the target and the all-categories bridge — six figures at one size, directly under a bar now stating four of them. For this role it keeps only what the bar does not: that the aircraft are tasked by a model, that the target is zero, and the all-categories toll.

VERIFIED. 4 themes x 4 roles x every destination at 1680 and 1366: zero page errors, zero console errors, zero requests off 127.0.0.1, no AI mark clipped, and the shell top matches the measured chrome height in every combination — the decision bar is a third chrome row and --barH is measured, not assumed. Seed 42, fair, PACOM CORAL is still 23 v 34 with the ingest listener off, with it on, and with the feed cut mid-run.

## WHAT CHANGED IN 3.0 — THE TELEMETRY INGEST TIER

- THE BIGGEST HOLE IN THIS PROTOTYPE IS CLOSED. Until now every physiological reading was produced by the simulation and read back out of the simulation's own memory. That demonstrates the tasking logic and demonstrates nothing whatever about acquisition, and a reviewer who works in tactical medicine spots it in the first minute.
- THERE IS NOW A REAL ACQUISITION PATH. The launcher accepts Cursor on Target over UDP — the format TAK already carries across tactical networks — parses the medical detail, and republishes it to the page over Server-Sent Events. Where a live reading exists for a casualty it supersedes the simulated one, writing the same knownCrm / knownAt / knownQ fields the tasking already read, so everything downstream is untouched.
- A DEVICE EMITTER SHIPS WITH IT. cotsim stands in for the monitors. It is not a device driver and not a claim that any monitor speaks this dialect today; it exists so the ingest path is exercised by a real socket from outside the program. Point a real feed at the same port and the application cannot tell the difference.
- THE DEMO THIS UNLOCKS. Stop the emitter. The chip goes LINK STALE at six seconds and LINK DOWN at fifteen, and the tasking layer carries on using the last reading it holds. That is the behaviour the whole concept rests on and there was previously no way to show it.
- SECURITY POSTURE. The listener is OFF unless -cot is passed, binds 127.0.0.1 unless -cot-external is ALSO passed, is receive-only, and drops datagrams over 8192 bytes unread. With no flag, behaviour is bit-identical to 2.2 — verified: seed 42 fair is still 23 v 34, the sweep across four themes and four roles is clean, and off-origin requests remain zero.
- MEASURED: 125 devices, ~62 messages/second, 14,000+ messages, 0 dropped.
- "AIR-GAPPED" IS RETIRED as a claim, in the application and in every document. It conflated two different things: that the runtime needs no network for its models and compute, which is true, and that the system is operationally deployable disconnected, which was not demonstrated because nothing could arrive. The precise claim is stronger and it survives the obvious question: ANGEL SWARM has no dependency on enterprise reachback to decide.

## WHAT CHANGED IN 2.2

- AN UNDEPLOYED RUN NO LONGER REPORTS A LOSS. If nobody presses Deploy, both arms task by Class VIII push for the whole run — the same method twice — so nothing has been compared. The two tolls do not land exactly level, because each arm consumes its own random draws at a slightly different rate; at seed 42 that puts ANGEL SWARM one worse. The after-action summary was therefore printing "1 MORE DEAD OF SURVIVABLE WOUNDS" in red and the sentence "ANGEL SWARM lost this run" about an experiment that was never run. It now says NOT DEPLOYED — NOTHING WAS COMPARED, in amber, explains that the difference is the arms' own random draws rather than a result, and tells the operator to press Deploy and run it again.
- START-HERE.txt claimed the two tolls would be identical in that case. They are not. Corrected in both places.

## WHAT CHANGED IN 2.1

- THE AFTER-ACTION SUMMARY SAID THE SAME THING THREE TIMES, and one of the three was not a sentence. "Wounds medicine could have survived" has no subject that can survive anything — a person survives a wound, a wound does not survive. Underneath it the same fact was restated twice more in two further phrasings, and a bare "· 32%" hung off the end of the line with nothing to say what the percentage was of. It is one statement now: "23 soldiers died under ANGEL SWARM tasking of wounds that medicine could have treated in time. Under Class VIII push, 34 did — 11 more. That is 32% fewer dead."
- The reconciliation line no longer prints "Class VIII push: 42 and 34" and leave the reader to work out which is which. It reads: "Those are the survivable wounds only. Counting every triage category, 31 died under ANGEL SWARM and 42 under Class VIII push."

## WHAT CHANGED IN 2.0 — THE SCIENCE PATCH

- START TRIAGE CONSTANTS CORRECTED, and this one changes behaviour. START_SENSITIVITY 0.578 -> 0.90 and START_OVERTRIAGE 0.26 -> 0.14, from METASTART (Franc JM et al., Prehosp Disaster Med 2022;37(1):106-116): over-triage 14%, under-triage 10%. The old pair was wrong twice over. It was mis-sourced — 26.0/13.6 came from medical undergraduates triaging simulated patients, described here as a pooled meta-analysis of ~360k patients; 57.8/93.6 were relative figures from a head-to-head comparison, not absolute accuracy. And it was internally contradictory: 0.578 gave a 42.2% under-triage rate while the provenance string beside it claimed 13.6%, so two lines on the same screen disagreed with each other.
- MEASURED EFFECT, having re-run it rather than predicted it. Fair mode is bit-identical, as expected — perceivedClass() returns early unless the arm is realistic and the reference run is fair. Realistic mode did NOT narrow: across six seeds the mean margin went 6.17 to 6.33 fewer dead. The reason is that only 7-18 of ~125 casualties are IMMEDIATE, so the deaths are dominated by reach and by deadline rather than by category ordering.
- 23 vs 34 CONFIRMED at seed 42, fair mode. This settles the conflict between the architecture doc, which said 24, and the use case, which said 23. The use case was right; the architecture doc is corrected.
- SIX PROVENANCE STRINGS RE-SOURCED. Penetrating-trauma odds now Duchesne 2024 (Tulane, not LSUHSC). CRM lead time now Ortiz/Gonzalez/Snider 2026, with the "16-25 min field range" correctly described as two individual casualties rather than a cohort. TXA RR 1.44 attributed to the CRASH-2 exploratory analysis, Lancet 2011, not the 2010 primary paper, in the authors' own wording. Cold chain quoted verbatim with a note that the CPG carries no CPG ID. Tourniquet range corrected to include EMS. Class priors relabelled a prototype assumption, since no publication gives a full LSCO triage distribution.
- THE POLICY CLAIM NARROWED, in the application and in all three documents. "DoDD 3000.09 has no medical equivalent" is refutable on stage, because the DoD AI Ethical Principles of 24 Feb 2020 apply expressly to combat AND non-combat functions. Replaced with the checkable version: 3000.09 covers weapon systems and expressly excludes unarmed platforms; no DoD or DHA issuance governs autonomy in triage or in allocating scarce medical resources; GAO-23-105850; OMB M-25-21 names "the allocation of care" and then excludes DoD; FDA regulates this class of software as a device.
- NEW SENSITIVITY LEVER: TRIAGE ERROR, in "How much is the seed?". Scales both START error rates about the measured ones, forced to realistic mode because the lever is inert in fair. Result: the ANGEL SWARM column is exactly flat at 23.80 dead from 0x to 4x the measured error rate, because that arm never reads the triage category; the baseline moves 27.70 to 27.80. 0 of 20 replications worse at every point.
- The chronotropic claim in the sensor narrative is now cited: Victorino GP, Battistella FD, Wisner DH, J Am Coll Surg 2003;196(5):679-684 — 35% of hypotensive trauma patients aged 16-49 were not tachycardic.
- ADDED: ANGEL-SWARM-use-case-PUBLIC.md/.docx — the sponsor-facing release, with the method deliberately withheld.

## WHAT CHANGED IN 1.9

- The gap between the sparkle and its label is now optical rather than metric. The trio's lead star occupies about x=3..17 of a 24-unit box and the right third holds only the two faint satellites, so a correctly measured gap looked like a wide one. The label is pulled back into that corner; it cannot collide with the satellites, which sit at the top and bottom of the box while the label is centred between them.

## WHAT CHANGED IN 1.8

- Every label now leads with AI: — AI: CRI-Net · Predicts collapse, AI: MiniLM · Quotes doctrine, and so on. The sparkle says a model was involved; the two letters say it in words as well, which is what a screenshot in a slide deck needs.
- THE GLOW IS ON, on every marked asset, per the ai-marks-v2 sheet: drop-shadow(0 0 .3em) at 55% of the mark's own leading colour, applied to the WHOLE inline unit rather than to the SVG — a filter on the glyph alone leaves the wordmark unlit and the two stop reading as one object. The blur is in em, so it scales with the type it sits in: about 5px against a 17px heading, about 3px in a table header. Hover lifts it further, which is the affordance that says the mark is pressable.

## WHAT CHANGED IN 1.7

- THE AI MARK IS NOW MARK 03, SPARKLE TRIO, IN THE NEBULA COLOURWAY, taken from the ai-marks-v2 sheet: lead star at full weight, satellites stepped to 78% and 50% alpha and moved off the lead's points; ramp A #A78BFA to #22D3EE across the lead, ramp B #22D3EE to #F0ABFC across the satellites.
- The mark is one inline unit — glyph then wordmark, sharing a single gradient and a single glow — and the wordmark names the SOURCE: CRI-Net · Predicts collapse, CRI-Net · Refuses when unsure, MiniLM · Quotes doctrine, Qwen 0.5B · Drafts the brief.
- The label is real text with a clipped gradient, not SVG text, so it is selectable and searchable and set in the console's own face. It falls back to flat --ai-a where background-clip:text is unsupported.

## WHAT CHANGED IN 1.6

- THE SPARKLE CARRIES ITS CONTEXT. The mark is the AI sparkle plus the two words that say what the model did — AI | PREDICTS COLLAPSE, AI | REFUSES WHEN UNSURE, AI | QUOTES DOCTRINE, AI | DRAFTS THE BRIEF. The sparkle alone said only THAT a model was involved, which sent the reader back to hovering things. The model's own name stays one hover away, with the number it was validated on.
- Still no counterpart mark. Anything unmarked is not machine learning, and "Model & sources" names every one of those by name.

## WHAT CHANGED IN 1.5

- THE AI MARK BECAME A SPARKLE. The pill, the word AI, the model name on the badge and the matching NOT AI mark on everything that was not a model are all gone. A sparkle follows the heading, the column or the field a trained model produced; hovering it names the model and what it was validated on. Nothing else carries it, so the absence of one now means something, and the full statement of what is not a model lives in "Model & sources" rather than on every screen.

## WHAT CHANGED IN 1.4

- THE AI MARKS ARE READABLE WITHOUT DECIPHERING THEM. Every mark used to carry the same glyph and a model NAME — CRI-NET, ENCODER — which is precise and means nothing to somebody seeing it for the first time. There are now three channels: filled violet versus outlined grey for the binary question; six distinct silhouettes for which one; and plain words for what it did — AI PREDICTS COLLAPSE, AI REFUSES WHEN UNSURE, AI QUOTES DOCTRINE, AI DRAFTS THE BRIEF, NOT AI SCHEDULING, NOT AI ARITHMETIC. NOT AI is spelled out rather than implied by the word OPTIMISER.
- The hover panel answers before it explains. Its first line is now "A trained model produced this." or "No model produced this. It is a written rule, evaluated." The model's real name is the second line.
- "Model & sources" carries a key showing all six marks side by side, so they are learned once rather than one at a time across six screens.
- THE FOUR LARGE SHEETS WERE OPENING UNDERNEATH THE COMMAND BAR. Model & sources, the accountability sheet, the run report and the deploy dialogue were at z-index 80-95 against a command bar at 130, so each sheet's own heading and Close button sat under the masthead, unreadable and unclickable. They are now inset to the working area — below the classification band and the two chrome rows, above the foot ribbon — which also keeps the classification line visible behind them, where a defence console requires it to be.

## WHAT CHANGED IN 1.3

- THE LIVE OPERATION'S CARD ON "Where the fight is" WAS UNREADABLE. Its name, force, posture and numbers printed on top of each other and spilled out of the top of the card. Cause: the transport's LIVE/PAUSED/COMPLETE badge was styled as a bare `.live`, and three other things in this application use `live` as a modifier — the operation the fight is in, an approval still waiting on a human, and a drone in the air. All three were being handed the badge's `display:inline-flex; height:16px`. The rule is now scoped to the badge's own id. The approvals table was carrying the same defect silently.

## WHAT CHANGED IN 1.2

- THE LEFT RAIL IS FILTERED BY ROLE, AND NOW SAYS SO. A COMMANDER is offered six of twenty-two destinations on arrival and there was nothing on the screen to say the other sixteen existed, so a filtered rail read as a broken one. There is now a grid button at the foot of the rail that shows every destination in any role, and its tooltip states how many of how many you are seeing. Switching role resets it.
- THE RIGHT-HAND TOOL RAIL NO LONGER OFFERS DEAD CONTROLS. Five of its eight buttons are map tools, and pressed on a view with no map under them they used to do nothing at all, silently — including on the view the application opens on. They now take you to the map and then do the thing.
- Every button on that rail carries a tooltip. At 36 px none of them did.
- "Draw every layer" from the rail is a real toggle: every layer, or none. It used to proxy to the legend's own control, which hides itself when nothing is hidden, so the press went into nothing.
- START-HERE.txt now describes the first run you actually get.

## WHAT CHANGED IN 1.1

- Every screen now states, on its own heading, whether a trained model produced what is on it. Four destinations out of twenty-one carry the AI glyph in the navigation rail: The fight, Wounded soldiers, Sensor & model and Doctrine retrieval. Nothing else does, because nothing else is machine learning, and saying so plainly is the point.
- "Model & sources" now opens with WHERE IT IS, IN THE RAIL — the four destinations named, with the model that drives each one.
- The tasking optimiser, the Monte Carlo, the simulation, the maps, the SQL console and every chart carry the deterministic mark instead. They are good engineering and none of them learned anything.
- Added ANGEL-SWARM-DHA-alignment.docx / .md — the prototype set against what DHA leadership asked for at DHITS 2026, quotation by quotation.
- Command bar: larger masthead, colour-separated transport controls, and the after-action wording rewritten so it can no longer read as a double negative.

## FILES IN THIS PACKAGE

```text
START-HERE.txt                        how to run it, and what is inside
ANGEL-SWARM-<platform>                double-click; your browser opens
cotsim-<platform>                     the device emitter, for the ingest demo
app/                                  the application itself
src/                                  the launcher and emitter source
train/                                the CRI-Net training and calibration
GET-MODEL.txt, get-model.sh/.ps1      the one optional model, fetched once
ANGEL-SWARM-CHANGELOG.txt             this file, standalone
documents/                            everything written about this
                                      prototype, as .md and .docx:
  ANGEL-SWARM-use-case                the use case, in full
  ANGEL-SWARM-use-case-PUBLIC         the sponsor-facing release,
                                      method deliberately withheld
  ANGEL-SWARM-DHA-alignment           against the DHA ask, quote by quote
  ANGEL-SWARM-DHA-alignment-onepager  the same on one page
  ANGEL-SWARM-IL5-deployment-cost-
    impact-analysis                   what an IL5 MVP fielding would cost
  ANGEL-SWARM-ARCHITECTURE            how it is built, and what was rejected
  ANGEL-SWARM-CHANGELOG               a copy of this file
```

```text
RAIL-BUTTON-VERIFICATION-v3.5       every control on the right rail,
                                    pressed in every destination and on
                                    all three maps, with the state each
                                    one changed
```

And in deck/

```text
ANGEL-SWARM-pitch                   the 3-slide pitch
ANGEL-SWARM-leadership-opener       the 3-slide leadership opener
```

And in video/

```text
ANGEL-SWARM-film-v2-HQ.mp4          the film, 3 min 11 s: the whole
                                    argument end to end
```

This package ships in THREE zips. Unzip ALL THREE into the same place; they are thirds of one folder and none of them runs on its own.

```text
part1of3   the program, the four platform binaries, the source, the
           training code, and everything in documents/
part2of3   the database engine and the model weights under app/
part3of3   video/ — the film
```

The split exists only because of a 30 MB per-file transfer limit, not because the parts are optional. The film is IN the package, in video/.
