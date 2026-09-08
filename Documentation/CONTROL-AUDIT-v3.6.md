# ANGEL SWARM — dead-control audit

**Read-only audit. No application file was changed.**

Date: 2026-08-24 · Build: v3.5 · Server: `http://127.0.0.1:8791` serving `/home/build/angel/app`
Method: headless Chromium (SwiftShader), 1680×1050, real pointer presses (`page.mouse.click` at the
element's centre — never `locator.click()` and never `element.click()`), 600 ms settle, wide state
snapshot before and after, destination restored between presses.

> **Point-in-time.** Other agents were editing this codebase while the audit ran (12:46–14:20 UTC).
> Every line reference below was re-checked against the working tree after the last measurement and
> was still correct; anything landed after 14:20 is not reflected. Two modules that did not exist
> when the walk started — `app/js/detail.js` and `app/css/detail.css` — were never pressed.

---

## 1. Summary

| | |
|---|---:|
| Destinations walked (`#rail [data-view]`) | 24 |
| Roles walked | 4 (COMMANDER full 24; LOGISTICIAN / SURGEON / ANALYST on their own panes) |
| Interactive elements pressed | **1 131** |
| Live — something observably changed | **929** (876 first pass + 53 proved live on a clean-page re-test) |
| Correct no-op / readout (not a bug) | **53** |
| **Dead presses** | **25** — which are **7 distinct controls** |
| Not exercised (duplicate rows that scrolled/collapsed away) | 124 |

### Dead controls, by classification

| Class | Count (distinct controls) | Which |
|---|---:|---|
| **(c) UNBOUND** — no handler at all | **1** | `#ingestChip` ("INGEST OFF") |
| **(b) ORPHANED** — handler runs, targets DOM that no longer exists | **1 (+2 partial)** | `#lqFleetMore` on Aircraft/FLEET; partial: `#lqSupplyMore`, the MISSION folds while the 3D map is showing |
| **(d) BLOCKED** — handler exists, pointer cannot reach it | **2** | `#g3Play` and `#g3Scrub` on the 3D tactical map, in LOGISTICIAN and SURGEON |
| **(a) CORRECT NO-OP** — pressing something already in that state | 6 | `#btnZoomOut`, `#btnReset`, `#btnHome`, right-rail **Fit**, the three ORBAT `−` steppers, `#mcMetric` |

The user's two reports are both confirmed, and both are real defects:

* **"the Drones page 'hide the detail' / 'show the detail' button does NOTHING"** → `#lqFleetMore`, **ORPHANED**.
  It is the only fold control in the whole application that is broken; the other 17 all work.
* **"The Ingest button does nothing"** → `#ingestChip`, **UNBOUND**, and additionally
  **entirely off-screen at every viewport narrower than about 1 580 px** (§4).

---

## 2. The defects

### 2.1 `#ingestChip` — UNBOUND, and off-screen below 1 580 px

| | |
|---|---|
| Destination | every one (it lives in `#toolbar .tool-r`) |
| Selector | `#ingestChip` |
| Class | **(c) UNBOUND** |
| What changed on press | nothing: `classSig`, `attrSig`, `paneSig`, every `APP.*` field, every class count — all identical. The only difference is a focus ring. |
| Source | `app/js/telemetry.js` **158–171** (`chipEl()`), `el.tabIndex = 0` at **169** |
| Evidence | Chrome DevTools `DOMDebugger.getEventListeners` on the element returns **an empty list**, and `grep -rn "ingestChip" app/js app/css app/index.html` finds it only in `telemetry.js` (which never calls `addEventListener`, `onclick`, or `.click`) and in `css/app.css:2182`. |

It advertises itself as pressable twice over — `tabIndex = 0` (so it is a keyboard tab stop) and
`role`-less but focusable — while `css/app.css:2182` gives it `cursor:help`. So it is simultaneously
a tab stop, a tooltip, and not a button.

There is already a natural destination for the press: `telemetry.js` **232–243** mounts a full
`#ingCard` "Telemetry ingest" card on the SENSOR pane.

> **Recommended fix:** in `chipEl()` add `el.setAttribute('role','button')` and
> `el.addEventListener('click', () => { goView('SENSOR'); APP._paneForce = true; render();
> setTimeout(() => document.getElementById('ingCard')?.scrollIntoView({block:'center'}), 80); })`,
> and change `.ingChip{cursor:help}` to `cursor:pointer` in `css/app.css:2187`.

### 2.2 `#lqFleetMore` — ORPHANED (the user's "Drones page" button)

| | |
|---|---|
| Destination | FLEET ("Drones" / "Aircraft"), LOGISTICIAN role only |
| Selector | `#lqFleetMore` (`button.lqMore`) |
| Class | **(b) ORPHANED** |
| What changed on press | `.viewport` gains/loses `lqOpen`, the button's own `aria-expanded` and label flip. **Nothing else.** Measured on a clean page: visible elements in the pane **178 → 178**, pane text **1 898 → 1 898 characters**. |
| Created at | `app/js/role-logistician.js` **1070** (`foldControl('lqFleetMore', tools, 'show the detail')`) |
| Handler | `app/js/role-logistician.js` **1382–1404** (`foldControl`), which toggles `lqOpen` on `.viewport` |
| The rule it drives | `app/js/role-logistician.js` **314–316**: `body[data-role-profile="LOGISTICIAN"] [data-pane="FLEET"]:not(.lqOpen) .tableWrap .grid tr > *:nth-child(5){display:none !important}` |
| Why it is orphaned | `app/js/page-grouped.js` **264–288** (`host()`) deletes every child of `.pane` after `.paneHead` that does not carry `data-roles`, and replaces it with its own `.gpBody`. The `<div class="tableWrap"><table class="grid">` that the rule keys on (`app/index.html` **817–830**) is destroyed on the first FLEET render, so the selector matches nothing and the class toggle has no target. |

`page-grouped.js` already knew about this hazard for one other module — **180–195** restates the
surgeon's CASUALTIES fold against `.gpBody` in its own stylesheet, with a comment explaining exactly
this failure mode. The logistician's FLEET fold was not given the same treatment.

> **Recommended fix:** in `app/js/page-grouped.js`, beside the existing `.sgOpen` restatement at
> lines 183–195, add the FLEET equivalent keyed on this file's own container, e.g.
> `body[data-role-profile="LOGISTICIAN"] [data-pane="FLEET"]:not(.lqOpen) .gpBody .gpGroup .gpDetail{display:none}`
> — or delete `#lqFleetMore` (`role-logistician.js:1068–1071`) so no control claims to do something it cannot.

### 2.3 `#lqSupplyMore` — PARTIALLY ORPHANED

Pressing it does change the pane (visible elements 160 → 167, pane text 2 898 → 2 931), so it is not
dead — but two of its four CSS rules are orphaned by the same `page-grouped.js` rewrite:

| Rule (`app/js/role-logistician.js`) | Target | Status |
|---|---|---|
| **292–294** `.cardHead .proj` | the stockout projection in a card head | **orphaned** — `page-grouped.js` emits no `.proj` |
| **295–297** `.card:has(#supplyB)` | old "supply B" chart card | **orphaned** — the chart is `#chartBlood` now (`page-grouped.js:1317`) |
| **295–297** `.card:has(#chartWaste)` | wasted-sorties chart card | works (`page-grouped.js:1320`) |
| **301–303** `.split:has(#supplyB) / :has(#chartWaste)` | column collapse | **orphaned** — the container is `.gpCharts` now, not `.split` |

> **Recommended fix:** repoint those three selectors at `#chartBlood` and `.gpCharts` in `role-logistician.js:292–303`.

### 2.4 `#g3Play` and `#g3Scrub` — BLOCKED on the 3D map in two roles

| | |
|---|---|
| Destination | MISSION, "Tactical 3D" map view |
| Selectors | `#g3Play` (run/pause), `#g3Scrub` (seek) |
| Class | **(d) BLOCKED** |
| Evidence | `document.elementFromPoint` at each control's centre returns `#lqMissionStrip` (LOGISTICIAN) / `#sgMissionStrip` (SURGEON) instead of the control. In COMMANDER both are reachable, so it is purely an overlay collision. |
| The overlays | `app/js/role-logistician.js` **328–333** and mounted at **1176–1181**; `app/js/role-surgeon.js` **290–295**, mounted at **1032–1037**. Both are `position:absolute; left:12px; bottom:12px; z-index:6` inside `#stage`. |
| The victims | the 3D transport bar, measured at `y ≈ 956`, `x ≈ 397…1372` — directly under the strip. |

`#g3Rate`, `#g3Fit`, `#g3Top2` and `#g3Follow` sit further right (x ≥ 1383) and stay reachable.

> **Recommended fix:** give `#lqMissionStrip` / `#sgMissionStrip` `bottom: 52px` (clear of the 3D
> transport bar) — or `pointer-events:none` on the strip with `pointer-events:auto` on its own
> `.lqMore` / `.sgMore` button.

### 2.5 The six correct no-ops — not bugs, but four of them should say so

| Control | Selector | Why it does nothing | Source |
|---|---|---|---|
| Tool-row zoom out | `#btnZoomOut` | `zoomBy()` clamps to a minimum of 1.0 and the map opens at 1.0 | handler `app/js/app.js:5005`; clamp `app/js/app.js:506–517` |
| Tool-row reset | `#btnReset` | `resetSim(false)` at T+00:00 with nothing run reproduces the identical state | `app/js/app.js:4560` |
| Wordmark / home | `#btnHome` | already on Overview (it only registered a change in COMMANDER because it also closed "all destinations") | `app/js/app.js:4684` |
| Right rail **Fit** | `button.ri[data-act="fit"]` | `fitAnyMap()` on an already-fitted map | `app/js/app.js:4727`, `app/js/app.js:578` |
| ORBAT `−` steppers ×3 | `.cqStp button` (`data-cmd="bulk:…:-1"`) | `Math.max(0, …)` and the quantity is already 0 | `app/js/role-commander.js:1621–1626` |
| Scenario metric | `#mcMetric` | it is a native `<select>`; it answers `change`, not `click` | `app/js/montecarlo.js:850, 920` |

> **Recommended fix (cosmetic):** set `disabled`/`aria-disabled` on `#btnZoomOut` at zoom 1.0, on
> **Fit** when the map is already fitted, and on a `−` stepper at 0 — a control that is at its limit
> should look like it, which is the difference between "nothing happened" and "nothing can happen".

---

## 3. Everything that is NOT broken (so it is not re-reported)

Forty-seven of the 82 first-pass "dead" readings were **contamination**, not defects: a previous
press in the same page session had left the application in a state where the next control genuinely
had nothing to do. Re-pressed on a freshly loaded page, they all work. The notable ones:

* **All 8 doctrine preset chips** and `#docGo` on DOCTRINE — they only appear dead when pressed in
  quick succession, because `run()` (`app/js/doctrine.js:638`) returns immediately while `BUSY` is
  true. A queued question or a disabled state during retrieval would fix the impression.
* **The 4 STREAM filter chips** (`[data-stf]`, `app/js/app.js:4858–4864`) — they do move the `.on`
  class and set `APP.streamFilter`; with the run paused at T+00:00 the table is empty either way.
* **All 9 SENSOR waveform chips** (`[data-scn]` / `[data-ins]`, `app/js/device.js:505–520`).
* **Every 3D-map control** — `#g3Canvas`, `#deckgl-overlay`, `#g3Scrub`, `#g3Rate`, `#g3Fit`, `#g3Top2`.
* **All three ORBAT packages** (`button.cqPkg`, `app/js/role-commander.js:1633–1637`).
* **Both `.cqPkg` / `+` steppers, "Change operation →", and the inspector's fold headers**
  (`div.nsp-sec`, `app/js/inspector.js:1096–1099`).

### 3.1 Every fold control, pressed and measured

Eighteen fold controls exist across the three reduced roles, measured in 21 states (MISSION is
measured on both the 2D and the 3D map). **Seventeen work. One does not.**

| Role | Destination | Map view | Fold control | Label | Visible elements before → after | Pane text before → after | Verdict |
|---|---|---|---|---|---|---|---|
| COMMANDER | MISSION | 3D | `#cqMissionMore` | show the detail | 194 → 195 | 1338 → 1356 | works |
| COMMANDER | MISSION | 2D | `#cqMissionMore` | hide the detail | 49 → 15 | 358 → 117 | works |
| COMMANDER | TASKING | — | `#cqTaskingMore` | show the policy | 130 → 159 | 1164 → 2407 | works |
| COMMANDER | COMPARE | — | `#cqCompareMore` | show the detail | 39 → 137 | 888 → 1696 | works |
| LOGISTICIAN | MISSION | 3D | `button.lqMore[data-lq="fold"]` | show the detail | 207 → 208 | 1416 → 1434 | works |
| LOGISTICIAN | MISSION | 2D | `button.lqMore[data-lq="fold"]` | show the detail | 43 → 62 | 316 → 436 | works |
| LOGISTICIAN | FLEET | — | `#lqFleetMore` | show the detail | 178 → 178 | 1898 → 1898 | **ORPHANED** |
| LOGISTICIAN | SUPPLY | — | `#lqSupplyMore` | show the detail | 160 → 167 | 2898 → 2931 | works |
| LOGISTICIAN | TASKING | — | `#lqTaskingMore` | show the policy | 129 → 158 | 1246 → 2489 | works |
| LOGISTICIAN | COST | — | `button.lqMore[data-lq="fold"]` | the rest of the argument | 86 → 103 | 2101 → 2878 | works |
| LOGISTICIAN | DASHBOARD | — | `button.lqMore[data-lq="fold"]` | show the theatre picture | 254 → 588 | 2382 → 5814 | works |
| LOGISTICIAN | STREAM | — | `#lqStreamMore` | the whole stream | 48 → 115 | 718 → 1249 | works |
| SURGEON | MISSION | 3D | `button.sgMore[data-sg="fold"]` | the airframes and the layers | 207 → 208 | 1451 → 1474 | works |
| SURGEON | MISSION | 2D | `button.sgMore[data-sg="fold"]` | the airframes and the layers | 43 → 62 | 316 → 476 | works |
| SURGEON | CASUALTIES | — | `#sgCasMore` | the full register | 70 → 154 | 1788 → 2843 | works |
| SURGEON | TASKING | — | `#sgTaskingMore` | the escalation policy | 128 → 157 | 1363 → 2611 | works |
| SURGEON | UNITS | — | `#sgUnitsMore` | the relay and the poll log | 193 → 239 | 1476 → 2003 | works |
| SURGEON | STREAM | — | `#sgStreamMore` | the whole stream | 57 → 124 | 1352 → 1890 | works |
| SURGEON | FLOW | — | `button.sgMore[data-sg="fold"]` | the mission clock, six ways | 63 → 63 | 922 → 917 | works |
| SURGEON | SENSOR | — | `#sgSensorMore` | the model and how it was validated | 132 → 217 | 1939 → 3292 | works |
| SURGEON | DOCTRINE | — | `#sgDocMore` | the encoder and how it was measured | 146 → 251 | 4535 → 6765 | works |

Two caveats on rows that read "works" by a thin margin:

* `cqMissionMore` / `lqMore` / `sgMore` on **MISSION while the 3D map is showing** move only the
  button's own label (visible elements 194 → 195, 207 → 208). Their rules
  (`role-commander.js:295–301`, `role-logistician.js:324–325`, `role-surgeon.js:286–287`) key on
  `#dock`, `#legend` and `.mapTools`, which belong to the flat 2D canvas. On the 2D map — which is
  what a clean load opens on — they work properly (49 → 15, 43 → 62). **Partially orphaned in 3D.**
* `sgMore` on **FLOW** changed pane text by 5 characters and no visible-element count
  (`role-surgeon.js:328` targets `.flowGrid > .chCard:nth-child(2)`; `charts.js:672` builds a
  `.flowGrid` whose children may not be `.chCard`). Worth a look.

---

## 4. Overflow at narrow viewports

The tool row is `white-space:nowrap; overflow:hidden` (`app/css/polish.css:759–763`) and
`#toolbar .tool-r` is `flex:1; min-width:0` (**768–771**) with every child `flex:none` /
`flex:0 0 auto`. Nothing shrinks, nothing wraps, and the overflow is **clipped rather than
scrolled** — so whatever sits at the right-hand end of the row is not merely cut off, it is
**unreachable by pointer and by scroll**.

`#ingestChip` is appended last (`app/js/telemetry.js:170`, `host.appendChild(el)`), so it is always
the first thing to go.

### 4.1 The two casualties, measured

Measured on the MAP destination (where the zoom / layout / map-view segments are also present —
the worst case):

| Viewport | `#toolbar .tool-r` overflows by | `#ingestChip` right edge | `#ingestChip` past viewport | `#onlineStat` past viewport |
|---:|---:|---:|---:|---:|
| 1152 px | 420 px | 1572 px | **+420 px** (100 % hidden) | +315 px |
| 1280 px | 292 px | 1572 px | **+292 px** (100 % hidden) | +187 px |
| 1366 px | 206 px | 1572 px | **+206 px** (100 % hidden) | +101 px |
| 1440 px | 132 px | 1572 px | **+132 px** (100 % hidden) | +27 px |
| 1680 px | 0 | 1672 px | fits (8 px of slack) | fits |

Measured on the Overview destination (map tools absent, so a little more room):

| Viewport | `#ingestChip` past viewport | `#onlineStat` past viewport | `#wallClock` past viewport | `#seedStat` past viewport |
|---:|---:|---:|---:|---:|
| 1152 px | **+381 px** | +276 px | +219 px | +276 px |
| 1280 px | **+253 px** | +148 px | +91 px | +148 px |
| 1366 px | **+167 px** | +62 px | +5 px | +62 px |
| 1440 px | **+93 px** | +77 px (on AFTER-ACTION) | +20 px | +77 px |
| 1680 px | fits | fits | fits | fits |

`#ingestChip` is `93 px` wide and its whole box is past the viewport edge at every tested width
below 1680, so at 1152–1440 the chip the user is asking about **does not exist on screen at all**.
The chip is 100 % clipped from 1152 px right up to roughly **1 580 px** on the map destinations.

`#scrubwrap` (the mission clock and seek bar) also crosses the edge by 16 px at 1152 px, and
`#foot .rb.last` ("DEATHS COUNTED, NEVER SCORED") by 86 px at 1280 px — `css/polish.css:851` hides
it only below 1240 px, which is 40 px too late.

> **Recommended fix:** give `#toolbar .tool-r` `overflow-x:auto` **and** a real priority order — the
> simplest correct version is to move `#ingestChip` and `#onlineStat` to the front of `.tool-r`
> (or set `order:-1`), so the first things clipped are the ones that repeat elsewhere, and add a
> `@media (max-width:1520px)` rule that drops `#wallClock` and `#seedStat` (both are duplicated in
> the foot ribbon) before anything pressable is lost.

### 4.2 Everything measured as overflowing, by width

| Viewport | Destination | Element | Box (L,R) | Past viewport | Past parent | Clipped by | Text |
|---|---|---|---|---:|---:|---|---|
| 1152px | DECIDE | `h1` | 48, 225 | — | +4 px | — | ANGEL SWARM |
| 1152px | DECIDE | `#onlineStat` | 1133, 1428 | +276 px | +276 px | #toolbar | ONLINE MON 24 AUG 2026, 13:28… |
| 1152px | DECIDE | `span.ok` | 1133, 1185 | +33 px | — | #toolbar | ONLINE |
| 1152px | DECIDE | `#wallClock` | 1194, 1371 | +219 px | — | #toolbar | MON 24 AUG 2026, 13:28:18Z |
| 1152px | DECIDE | `#seedStat` | 1380, 1428 | +276 px | — | #toolbar | SEED 42 |
| 1152px | DECIDE | `#ingestChip` | 1440, 1533 | +381 px | +381 px | #toolbar | INGEST OFF |
| 1152px | DECIDE | `i` | 1448, 1454 | +302 px | — | #toolbar |  |
| 1152px | DECIDE | `b` | 1460, 1525 | +373 px | — | #toolbar | INGEST OFF |
| 1152px | DECIDE | `span.navAi` | 23, 34 | — | +2 px | — |  |
| 1152px | DECIDE | `span.rb` | 1100, 1164 | +12 px | +12 px | #foot | SEED 42 |
| 1152px | DECIDE | `#ftSeed` | 1110, 1154 | +2 px | — | #foot | SEED 42 |
| 1152px | AFTERACTION | `div.scrubwrap` | 1122, 1218 | +66 px | +66 px | #toolbar | T+00:00 |
| 1152px | AFTERACTION | `#clock` | 1122, 1170 | +18 px | — | #toolbar | T+00:00 |
| 1152px | AFTERACTION | `#scrub` | 1177, 1218 | +66 px | — | #toolbar |  |
| 1152px | AFTERACTION | `#scrubHead` | 1176, 1179 | +27 px | — | #toolbar |  |
| 1152px | AFTERACTION | `i.statDot` | 1222, 1228 | +76 px | — | #toolbar |  |
| 1280px | DECIDE | `h1` | 48, 225 | — | +4 px | — | ANGEL SWARM |
| 1280px | DECIDE | `#onlineStat` | 1133, 1428 | +148 px | +148 px | #toolbar | ONLINE MON 24 AUG 2026, 13:28… |
| 1280px | DECIDE | `#wallClock` | 1194, 1371 | +91 px | — | #toolbar | MON 24 AUG 2026, 13:28:44Z |
| 1280px | DECIDE | `#seedStat` | 1380, 1428 | +148 px | — | #toolbar | SEED 42 |
| 1280px | DECIDE | `#ingestChip` | 1440, 1533 | +253 px | +253 px | #toolbar | INGEST OFF |
| 1280px | DECIDE | `i` | 1448, 1454 | +174 px | — | #toolbar |  |
| 1280px | DECIDE | `b` | 1460, 1525 | +245 px | — | #toolbar | INGEST OFF |
| 1280px | DECIDE | `span.navAi` | 23, 34 | — | +2 px | — |  |
| 1280px | DECIDE | `table.cqTable` | 393, 905 | — | +28 px | div.card | Operation Still down Died of … |
| 1280px | DECIDE | `span.rb.last` | 1164, 1366 | +86 px | +86 px | #foot | DEATHS COUNTED, NEVER SCORED |
| 1280px | LAUNCHPOINTS | `table.grid.tight` | 393, 1254 | — | +31 px | div.lpScroll | Launch point Siting Aircraft … |
| 1366px | DECIDE | `#onlineStat` | 1133, 1428 | +62 px | +62 px | #toolbar | ONLINE MON 24 AUG 2026, 13:29… |
| 1366px | DECIDE | `#wallClock` | 1194, 1371 | +5 px | — | #toolbar | MON 24 AUG 2026, 13:29:11Z |
| 1366px | DECIDE | `#seedStat` | 1380, 1428 | +62 px | — | #toolbar | SEED 42 |
| 1366px | DECIDE | `#ingestChip` | 1440, 1533 | +167 px | +167 px | #toolbar | INGEST OFF |
| 1366px | DECIDE | `i` | 1448, 1454 | +88 px | — | #toolbar |  |
| 1366px | DECIDE | `b` | 1460, 1525 | +159 px | — | #toolbar | INGEST OFF |
| 1366px | DECIDE | `span.navAi` | 23, 34 | — | +2 px | — |  |
| 1440px | DECIDE | `#ingestChip` | 1440, 1533 | +93 px | +93 px | #toolbar | INGEST OFF |
| 1440px | DECIDE | `i` | 1448, 1454 | +14 px | — | #toolbar |  |
| 1440px | DECIDE | `b` | 1460, 1525 | +85 px | — | #toolbar | INGEST OFF |
| 1440px | DECIDE | `span.navAi` | 23, 34 | — | +2 px | — |  |
| 1440px | AFTERACTION | `#onlineStat` | 1222, 1517 | +77 px | +77 px | #toolbar | ONLINE MON 24 AUG 2026, 13:29… |
| 1440px | AFTERACTION | `#wallClock` | 1283, 1460 | +20 px | — | #toolbar | MON 24 AUG 2026, 13:29:51Z |
| 1440px | AFTERACTION | `#seedStat` | 1469, 1517 | +77 px | — | #toolbar | SEED 42 |
| 1680px | DECIDE | `span.navAi` | 23, 34 | — | +2 px | — |  |


Elements whose only overflow is `past parent` by 1–4 px (`h1` in `.brand`, `span.navAi`,
`table.grid.tight` inside its own `overflow-x:auto` scroller) are sub-pixel rounding or
intentionally scrollable, and are listed for completeness rather than as defects.

---

## 5. Coverage, by destination

Ten of the 24 rail destinations are the default route; the other fourteen live behind
"Show every destination" (`#btnNavAll`), which the harness opened before every walk.
`BRIEF` (Copilot) is **absent from the rail entirely** on this build — `app/index.html:1144`
removes both `[data-view='BRIEF']` and `[data-pane='BRIEF']` from its `onerror` handler, and the
pane is not in the document at run time, which is why the rail carries 24 destinations and not 25.
`js/copilot.js` itself returns HTTP 200 and passes `node --check`, so the removal is happening at
module-evaluation time; worth a separate look, and out of scope for this audit.

Each destination was walked twice: once as it opens, and once with every disclosure
(`button.gpFold`, `summary`, `[aria-expanded="false"]`) expanded first, so controls that only exist
inside a collapsed group were pressed too.

| Role | Destination | Controls pressed | Live | Dead | Correct no-op / readout | Not exercised |
|---|---|---:|---:|---:|---:|---:|
| COMMANDER | GLOBAL@DECIDE | 71 | 55 | 3 | 9 | 4 |
| COMMANDER | GLOBAL@MISSION | 16 | 8 | 1 | 3 | 4 |
| COMMANDER | DECIDE | 39 | 35 | 3 | 0 | 1 |
| COMMANDER | MISSION | 18 | 18 | 0 | 0 | 0 |
| COMMANDER | CASUALTIES | 20 | 19 | 0 | 1 | 0 |
| COMMANDER | CASUALTIES (expanded) | 5 | 4 | 0 | 0 | 1 |
| COMMANDER | FLEET | 13 | 13 | 0 | 0 | 0 |
| COMMANDER | FLEET (expanded) | 57 | 6 | 0 | 0 | 51 |
| COMMANDER | LAUNCHPOINTS | 12 | 8 | 0 | 0 | 4 |
| COMMANDER | SUPPLY | 12 | 12 | 0 | 0 | 0 |
| COMMANDER | SUPPLY (expanded) | 18 | 13 | 0 | 0 | 5 |
| COMMANDER | TASKING | 18 | 18 | 0 | 0 | 0 |
| COMMANDER | TASKING (expanded) | 4 | 4 | 0 | 0 | 0 |
| COMMANDER | CONFIDENCE | 9 | 8 | 1 | 0 | 0 |
| COMMANDER | AFTERACTION | 11 | 10 | 0 | 0 | 1 |
| COMMANDER | STANDARD | 13 | 13 | 0 | 0 | 0 |
| COMMANDER | COMPARE | 4 | 4 | 0 | 0 | 0 |
| COMMANDER | ANALYSIS | 19 | 19 | 0 | 0 | 0 |
| COMMANDER | ROI | 9 | 9 | 0 | 0 | 0 |
| COMMANDER | COST | 14 | 14 | 0 | 0 | 0 |
| COMMANDER | DASHBOARD | 36 | 36 | 0 | 0 | 0 |
| COMMANDER | UNITS | 22 | 22 | 0 | 0 | 0 |
| COMMANDER | STREAM | 13 | 12 | 0 | 1 | 0 |
| COMMANDER | FLOW | 8 | 8 | 0 | 0 | 0 |
| COMMANDER | AUDIT | 9 | 9 | 0 | 0 | 0 |
| COMMANDER | SENSOR | 21 | 19 | 0 | 1 | 1 |
| COMMANDER | DOCTRINE | 21 | 21 | 0 | 0 | 0 |
| COMMANDER | QUERY | 19 | 18 | 0 | 0 | 1 |
| COMMANDER | DATA | 8 | 8 | 0 | 0 | 0 |
| COMMANDER | SETTINGS | 26 | 25 | 0 | 1 | 0 |
| LOGISTICIAN | GLOBAL@DECIDE | 51 | 39 | 4 | 8 | 0 |
| LOGISTICIAN | GLOBAL@MISSION | 9 | 5 | 1 | 3 | 0 |
| LOGISTICIAN | DASHBOARD | 6 | 6 | 0 | 0 | 0 |
| LOGISTICIAN | MISSION | 9 | 7 | 0 | 0 | 2 |
| LOGISTICIAN | FLEET | 13 | 13 | 0 | 0 | 0 |
| LOGISTICIAN | FLEET (expanded) | 18 | 14 | 0 | 0 | 4 |
| LOGISTICIAN | SUPPLY | 13 | 13 | 0 | 0 | 0 |
| LOGISTICIAN | SUPPLY (expanded) | 20 | 15 | 0 | 0 | 5 |
| LOGISTICIAN | STREAM | 3 | 3 | 0 | 0 | 0 |
| LOGISTICIAN | TASKING | 17 | 17 | 0 | 0 | 0 |
| LOGISTICIAN | TASKING (expanded) | 5 | 5 | 0 | 0 | 0 |
| LOGISTICIAN | COST | 10 | 9 | 0 | 0 | 1 |
| LOGISTICIAN | CASUALTIES | 20 | 19 | 0 | 1 | 0 |
| LOGISTICIAN | CASUALTIES (expanded) | 5 | 4 | 0 | 0 | 1 |
| SURGEON | GLOBAL@DECIDE | 51 | 39 | 4 | 8 | 0 |
| SURGEON | GLOBAL@MISSION | 9 | 6 | 0 | 3 | 0 |
| SURGEON | CASUALTIES | 6 | 4 | 0 | 0 | 2 |
| SURGEON | CASUALTIES (expanded) | 19 | 1 | 0 | 0 | 18 |
| SURGEON | MISSION | 9 | 7 | 0 | 0 | 2 |
| SURGEON | STREAM | 3 | 3 | 0 | 0 | 0 |
| SURGEON | SENSOR | 18 | 16 | 0 | 1 | 1 |
| SURGEON | DOCTRINE | 18 | 18 | 0 | 0 | 0 |
| SURGEON | TASKING | 17 | 17 | 0 | 0 | 0 |
| SURGEON | TASKING (expanded) | 5 | 5 | 0 | 0 | 0 |
| SURGEON | UNITS | 15 | 15 | 0 | 0 | 0 |
| SURGEON | FLOW | 7 | 7 | 0 | 0 | 0 |
| ANALYST | GLOBAL@DECIDE | 59 | 45 | 4 | 9 | 1 |
| ANALYST | GLOBAL@MISSION | 9 | 5 | 1 | 3 | 0 |
| ANALYST | DECIDE | 39 | 35 | 3 | 0 | 1 |
| ANALYST | SETTINGS | 26 | 25 | 0 | 1 | 0 |
| ANALYST | FLEET | 10 | 10 | 0 | 0 | 0 |
| ANALYST | FLEET (expanded) | 17 | 9 | 0 | 0 | 8 |
| ANALYST | SUPPLY | 12 | 12 | 0 | 0 | 0 |
| ANALYST | SUPPLY (expanded) | 18 | 13 | 0 | 0 | 5 |


---

## 6. Appendix — the full press-test matrix

Every element that matched `button`, `.chip`, `[data-act]`, `[data-lq]`, `[data-cq]`, `[data-sg]`,
`[role="button"]`, `.seg span`, `summary`, `.tab`, `[data-tab]`, `[data-mapview]`, `[data-mapscope]`,
`[data-filter]`, `[data-speed]`, `[data-layer]`, `[data-theaterpick]`, `[data-opmode]`,
`[data-roleset]`, `[data-active]`, `[data-mode]`, `[data-deploy]`, `[data-approve]`, `[data-hold]`,
`[data-sort]`, `[data-cas]`, `[data-jump]`, `[data-view]`, `[onclick]`, `[tabindex="0"]`,
`input[type=checkbox]`, `input[type=radio]`, `select`, `.btn`, `.tbtn` or `.icon`
and had `getBoundingClientRect().height > 0`, with a real pointer press at its centre.

`GLOBAL@…` rows are the chrome outside `#views` (command bar, tool row, rails, inspector), pressed
once per role rather than once per destination. `NOT EXERCISED` marks a duplicate table row that
scrolled or collapsed out of the list between enumeration and press — in every such case a sibling
row of the identical kind was pressed and was live.

State watched on every press: `APP.view`, `APP.mapMode`, `APP.mapView`, `APP.filter`, `APP.sel`,
`APP.speed`, `APP.mode`, `APP.role`, `APP.theme`, `APP.layers`, `APP.mapViewport.{zoom,cx,cy}`,
`APP.showScore`, `APP.running`, `APP.dwOpen`, `APP.sort`, `APP.theaterView`, `APP.scenarioKey`,
`APP.seed`, `APP.unitSel`, `APP.basemapKey`, `document.body.className`, `data-role-profile`,
`data-theme`, counts of `.show` / `.open` / `.on` / `.active` / `[aria-expanded="true"]` /
`[aria-expanded="false"]` / `[aria-pressed=…]` / `details[open]` / `[hidden]` / `dialog[open]` /
modals / toasts / selected / `input:checked` / `[disabled]`, the innerText length of `body`, the
active pane, `#insp`, `#rail`, `#toolbar` and `#cmdbar`, the pane's innerHTML length and scrollTop,
`location.hash`, the focused element, and — on the re-test pass — a hash of every `class` attribute
in the document, a hash of every state attribute (`aria-*`, `hidden`, `disabled`, `open`, `value`,
`checked`, `data-state`, `style`), a hash of the active pane's innerHTML, and a screenshot digest.

| Role | Destination | Control (label) | Selector | Result | What changed |
|---|---|---|---|---|---|
| COMMANDER | GLOBAL@DECIDE | ANGEL SWARM v3.5 | `#btnHome` | LIVE | bodyClass: "navOpen standby notdeployed navAll" -> "navOpen standby notdeployed"; nOn: 32 -> 31; nAriaPress: … |
| COMMANDER | GLOBAL@DECIDE | JOA CORAL ▾ | `#btnOpPick` | LIVE | bodyClass: "navOpen standby notdeployed" -> "navOpen standby notdeployed opPickOpen"; nAriaExp: 3 -> 4; nHidd… |
| COMMANDER | GLOBAL@DECIDE | ◈ ANGEL SWARM | `span.chip.act[data-active="on"]` | LIVE | bodyClass: "navOpen standby notdeployed" -> "navOpen notdeployed"; nToast: 0 -> 1; bodyLen: 6245 -> 6337; foc… |
| COMMANDER | GLOBAL@DECIDE | STANDBY | `span.chip.act.on[data-active="off"]` | ERROR | vanished before press |
| COMMANDER | GLOBAL@DECIDE | Deploy → | `#btnDeployBar` | LIVE | nShow: 0 -> 1; nOn: 31 -> 34; bodyLen: 6337 -> 7168; focus: "navOpen notdeployed" -> "btnDeployBar" |
| COMMANDER | GLOBAL@DECIDE | COMMANDER | `span.chip.on[data-roleset="COMMANDER"]` | NOOP-already-selected | focus: "btnDeployBar" -> "chip on" |
| COMMANDER | GLOBAL@DECIDE | LOGISTICIAN | `span.chip[data-roleset="LOGISTICIAN"]` | LIVE | role: "COMMANDER" -> "LOGISTICIAN"; bodyAttrs: "COMMANDER\|console-dark" -> "LOGISTICIAN\|console-dark"; nOn: 3… |
| COMMANDER | GLOBAL@DECIDE | SURGEON | `span.chip[data-roleset="SURGEON"]` | LIVE | role: "COMMANDER" -> "SURGEON"; bodyAttrs: "COMMANDER\|console-dark" -> "SURGEON\|console-dark"; nOn: 34 -> 33;… |
| COMMANDER | GLOBAL@DECIDE | ANALYST | `span.chip[data-roleset="ANALYST"]` | LIVE | role: "COMMANDER" -> "ANALYST"; bodyAttrs: "COMMANDER\|console-dark" -> "ANALYST\|console-dark"; nOn: 34 -> 33;… |
| COMMANDER | GLOBAL@DECIDE | Console dark | `#btnTheme` | LIVE | nShow: 0 -> 1; nOn: 34 -> 36; nAriaExp: 3 -> 4; nHidden: 2 -> 1; cmdLen: 151 -> 507; nAriaExpF: 17 -> 16; bod… |
| COMMANDER | GLOBAL@DECIDE | {Who decides, and who answers for it} | `#btnAcct` | LIVE | nShow: 0 -> 1; bodyLen: 6245 -> 13170; focus: "btnTheme" -> "btnAcct" |
| COMMANDER | GLOBAL@DECIDE | [Back to the theater overview] | `#btnBackTheater` | LIVE | view: "DECIDE" -> "DASHBOARD"; bodyClass: "navOpen notdeployed" -> "navOpen notdeployed theaterMode theater3d… |
| COMMANDER | GLOBAL@DECIDE | − | `#btnZoomOut` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| COMMANDER | GLOBAL@DECIDE | 1.0× | `#zoomLabel` | NOT-A-CONTROL | — |
| COMMANDER | GLOBAL@DECIDE | + | `#btnZoomIn` | LIVE | zoom: 1 -> 1.5 |
| COMMANDER | GLOBAL@DECIDE | Fit | `#btnZoomFit` | LIVE | zoom: 1.5 -> 1 |
| COMMANDER | GLOBAL@DECIDE | Single | `span.chip.on[data-mapview="COP"]` | NOOP-already-selected | — |
| COMMANDER | GLOBAL@DECIDE | Side by side | `span.chip[data-mapview="COMPARE"]` | LIVE | mapView: "COP" -> "COMPARE"; nOn: 35 -> 36 |
| COMMANDER | GLOBAL@DECIDE | Theatre | `span.chip[data-mapscope="THEATRE"]` | LIVE | view: "DECIDE" -> "DASHBOARD"; bodyClass: "navOpen notdeployed theater3d" -> "navOpen notdeployed theater3d t… |
| COMMANDER | GLOBAL@DECIDE | Tactical | `span.chip[data-mapscope="2D"]` | LIVE | view: "DECIDE" -> "MISSION"; bodyClass: "navOpen notdeployed theater3d" -> "navOpen notdeployed theater3d com… |
| COMMANDER | GLOBAL@DECIDE | Tactical 3D | `span.chip[data-mapscope="3D"]` | LIVE | view: "DECIDE" -> "MISSION"; mapMode: "2D" -> "3D"; bodyClass: "navOpen notdeployed theater3d compare" -> "na… |
| COMMANDER | GLOBAL@DECIDE | V | `span.chip.mmKey` | NOT-A-CONTROL | — |
| COMMANDER | GLOBAL@DECIDE | e.g. CAS-084 · LP 2 KILO · blood ⌘K | `#btnSearch` | LIVE | nShow: 0 -> 1; nSelected: 0 -> 1; bodyLen: 6537 -> 7011 |
| COMMANDER | GLOBAL@DECIDE | {Reset run (R)} | `#btnReset` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| COMMANDER | GLOBAL@DECIDE | ▶ | `#btnPlay` | LIVE | running: false -> true; nOn: 32 -> 33; inspHtmlLen: 2952 -> 2953; toolLen: 191 -> 190; bodyLen: 6537 -> 6683;… |
| COMMANDER | GLOBAL@DECIDE | 1× | `span.chip[data-speed="1"]` | LIVE | speed: 2 -> 1 |
| COMMANDER | GLOBAL@DECIDE | 2× | `span.chip.on[data-speed="2"]` | NOOP-already-selected | — |
| COMMANDER | GLOBAL@DECIDE | 4× | `span.chip[data-speed="4"]` | LIVE | speed: 2 -> 4 |
| COMMANDER | GLOBAL@DECIDE | 10× | `span.chip[data-speed="10"]` | LIVE | speed: 2 -> 10 |
| COMMANDER | GLOBAL@DECIDE | INGEST OFF | `#ingestChip` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| COMMANDER | GLOBAL@DECIDE | Send ANGEL SWARM → | `button.dsBtn.q` | LIVE | nShow: 0 -> 1; nOn: 32 -> 35; bodyLen: 6537 -> 7368 |
| COMMANDER | GLOBAL@DECIDE | Overview | `a.navItem.big.on[data-view="DECIDE"]` | NOOP-already-selected | — |
| COMMANDER | GLOBAL@DECIDE | Map | `a.navItem.big[data-view="MISSION"]` | LIVE | view: "DECIDE" -> "MISSION"; nOpen: 0 -> 1; nOn: 35 -> 49; nAriaPress: 1 -> 10; toolLen: 191 -> 186; bodyLen:… |
| COMMANDER | GLOBAL@DECIDE | Casualties | `a.navItem.big[data-view="CASUALTIES"]` | LIVE | view: "DECIDE" -> "CASUALTIES"; toolLen: 191 -> 193; nAriaExpF: 15 -> 18; bodyLen: 6537 -> 3954; paneLen: 427… |
| COMMANDER | GLOBAL@DECIDE | Aircraft | `a.navItem.big[data-view="FLEET"]` | LIVE | view: "DECIDE" -> "FLEET"; nAriaExpF: 18 -> 21; bodyLen: 6537 -> 3455; paneLen: 4279 -> 1197; paneHtmlLen: 25… |
| COMMANDER | GLOBAL@DECIDE | Launch points | `a.navItem.big[data-view="LAUNCHPOINTS"]` | LIVE | view: "DECIDE" -> "LAUNCHPOINTS"; toolLen: 191 -> 196; nAriaExpF: 21 -> 24; bodyLen: 6537 -> 3423; paneLen: 4… |
| COMMANDER | GLOBAL@DECIDE | Supplies | `a.navItem.big[data-view="SUPPLY"]` | LIVE | view: "DECIDE" -> "SUPPLY"; nAriaExpF: 24 -> 27; bodyLen: 6537 -> 3554; paneLen: 4279 -> 1297; paneHtmlLen: 2… |
| COMMANDER | GLOBAL@DECIDE | Approvals | `a.navItem.big[data-view="TASKING"]` | LIVE | view: "DECIDE" -> "TASKING"; toolLen: 191 -> 192; nAriaExpF: 27 -> 30; bodyLen: 6537 -> 3423; paneLen: 4279 -… |
| COMMANDER | GLOBAL@DECIDE | Scenarios | `a.navItem.big[data-view="CONFIDENCE"]` | LIVE | view: "DECIDE" -> "CONFIDENCE"; nOn: 45 -> 46; toolLen: 191 -> 192; bodyLen: 6537 -> 5175; paneLen: 4279 -> 2… |
| COMMANDER | GLOBAL@DECIDE | After-action report | `a.navItem.big[data-view="AFTERACTION"]` | LIVE | view: "DECIDE" -> "AFTERACTION"; toolLen: 191 -> 202; bodyLen: 6537 -> 5687; paneLen: 4279 -> 3419; paneHtmlL… |
| COMMANDER | GLOBAL@DECIDE | Why this exists | `a.navItem[data-view="STANDARD"]` | LIVE | view: "DECIDE" -> "STANDARD"; nOn: 45 -> 47; toolLen: 191 -> 198; bodyLen: 6537 -> 7415; paneLen: 4279 -> 515… |
| COMMANDER | GLOBAL@DECIDE | The difference | `a.navItem[data-view="COMPARE"]` | LIVE | view: "DECIDE" -> "COMPARE"; nOn: 45 -> 47; toolLen: 191 -> 197; bodyLen: 6537 -> 3151; paneLen: 4279 -> 888;… |
| COMMANDER | GLOBAL@DECIDE | Evidence | `a.navItem[data-view="ANALYSIS"]` | LIVE | view: "DECIDE" -> "ANALYSIS"; nOn: 45 -> 46; nHidden: 2 -> 3; nAriaExpF: 30 -> 31; bodyLen: 6537 -> 4497; pan… |
| COMMANDER | GLOBAL@DECIDE | The case beyond lives | `a.navItem[data-view="ROI"]` | LIVE | view: "DECIDE" -> "ROI"; nOn: 45 -> 46; nHidden: 3 -> 4; toolLen: 191 -> 204; nAriaExpF: 31 -> 32; bodyLen: 6… |
| COMMANDER | GLOBAL@DECIDE | What it costs | `a.navItem[data-view="COST"]` | LIVE | view: "DECIDE" -> "COST"; nOn: 45 -> 46; toolLen: 191 -> 196; bodyLen: 6537 -> 4771; paneLen: 4279 -> 2509; p… |
| COMMANDER | GLOBAL@DECIDE | Where the fight is | `a.navItem[data-view="DASHBOARD"]` | LIVE | view: "DECIDE" -> "DASHBOARD"; nOn: 45 -> 48; toolLen: 191 -> 186; bodyLen: 6537 -> 5884; paneLen: 4279 -> 35… |
| COMMANDER | GLOBAL@DECIDE | Units & overwatch drone | `a.navItem[data-view="UNITS"]` | LIVE | view: "DECIDE" -> "UNITS"; nHidden: 4 -> 5; toolLen: 191 -> 206; nAriaExpF: 32 -> 33; bodyLen: 6537 -> 4073; … |
| COMMANDER | GLOBAL@DECIDE | Ground truth stream | `a.navItem[data-view="STREAM"]` | LIVE | view: "DECIDE" -> "STREAM"; nHidden: 5 -> 6; toolLen: 191 -> 202; nAriaExpF: 33 -> 34; bodyLen: 6537 -> 2998;… |
| COMMANDER | GLOBAL@DECIDE | Casualty flow | `a.navItem[data-view="FLOW"]` | LIVE | view: "DECIDE" -> "FLOW"; nHidden: 6 -> 7; toolLen: 191 -> 196; nAriaExpF: 34 -> 35; bodyLen: 6537 -> 2992; p… |
| COMMANDER | GLOBAL@DECIDE | Decision log | `a.navItem[data-view="AUDIT"]` | LIVE | view: "DECIDE" -> "AUDIT"; nOn: 45 -> 46; nHidden: 7 -> 8; toolLen: 191 -> 195; nAriaExpF: 35 -> 36; bodyLen:… |
| COMMANDER | GLOBAL@DECIDE | Sensor & model | `a.navItem[data-view="SENSOR"]` | LIVE | view: "DECIDE" -> "SENSOR"; nOn: 32 -> 35; nHidden: 2 -> 3; toolLen: 191 -> 197; nAriaExpF: 15 -> 16; bodyLen… |
| COMMANDER | GLOBAL@DECIDE | Doctrine retrieval | `a.navItem[data-view="DOCTRINE"]` | LIVE | view: "DECIDE" -> "DOCTRINE"; nHidden: 3 -> 4; toolLen: 191 -> 201; nAriaExpF: 16 -> 17; bodyLen: 6537 -> 841… |
| COMMANDER | GLOBAL@DECIDE | Analytical console | `a.navItem[data-view="QUERY"]` | LIVE | view: "DECIDE" -> "QUERY"; nOn: 34 -> 36; nHidden: 4 -> 5; toolLen: 191 -> 201; nAriaExpF: 17 -> 18; bodyLen:… |
| COMMANDER | GLOBAL@DECIDE | Export the database | `a.navItem[data-view="DATA"]` | LIVE | view: "DECIDE" -> "DATA"; nHidden: 5 -> 6; toolLen: 191 -> 202; nAriaExpF: 18 -> 19; bodyLen: 6537 -> 3920; p… |
| COMMANDER | GLOBAL@DECIDE | Back to the route | `#btnNavAll` | LIVE | nOn: 35 -> 34; nAriaPress: 1 -> 0; railLen: 449 -> 157; nAriaPressF: 0 -> 1; bodyLen: 6537 -> 6245 |
| COMMANDER | GLOBAL@DECIDE | Search everything | `#btnPalette` | LIVE | nShow: 0 -> 1; nSelected: 0 -> 1; bodyLen: 6245 -> 6719 |
| COMMANDER | GLOBAL@DECIDE | ◍ Sound off | `#audBtn` | LIVE | nOn: 34 -> 35; railLen: 157 -> 162; bodyLen: 6245 -> 6250 |
| COMMANDER | GLOBAL@DECIDE | Settings | `a.navItem[data-view="SETTINGS"]` | LIVE | view: "DECIDE" -> "SETTINGS"; bodyLen: 6250 -> 4776; paneLen: 4279 -> 2805; paneHtmlLen: 25634 -> 10736 |
| COMMANDER | GLOBAL@DECIDE | DECISIONS | `button.nsp-cs.on` | NOOP-already-selected | — |
| COMMANDER | GLOBAL@DECIDE | RUN DETAIL | `button.nsp-cs` | LIVE | inspLen: 600 -> 684; inspHtmlLen: 2952 -> 3932; bodyLen: 6250 -> 6333 |
| COMMANDER | GLOBAL@DECIDE | [Previous] | `button.nsp-tb` | NOOP-disabled | — |
| COMMANDER | GLOBAL@DECIDE | [Run or pause] | `button.nsp-tb.hi` | LIVE | running: false -> true; nOn: 35 -> 36; inspHtmlLen: 3932 -> 3933; toolLen: 191 -> 190; bodyLen: 6333 -> 6479;… |
| COMMANDER | GLOBAL@DECIDE | [Next] | `button.nsp-tb` | NOOP-disabled | — |
| COMMANDER | GLOBAL@DECIDE | WAITING ON YOU | `div.nsp-sec` | ERROR | vanished before press |
| COMMANDER | GLOBAL@DECIDE | EXCEPTIONS — WHAT IS OFF TRACK | `div.nsp-sec` | ERROR | vanished before press |
| COMMANDER | GLOBAL@DECIDE | DIED OF WOUNDS THEY COULD HAVE SURVIVED | `div.nsp-sec` | ERROR | vanished before press |
| COMMANDER | GLOBAL@DECIDE | Theatre map | `button.ri` | LIVE | view: "DECIDE" -> "DASHBOARD"; nOn: 35 -> 39; toolLen: 191 -> 186; bodyLen: 6479 -> 5680; paneLen: 4425 -> 35… |
| COMMANDER | GLOBAL@DECIDE | Tactical map | `button.ri` | LIVE | view: "DECIDE" -> "MISSION"; nOn: 35 -> 39; toolLen: 191 -> 186; bodyLen: 6479 -> 2261; paneLen: 4425 -> 117;… |
| COMMANDER | GLOBAL@DECIDE | Tactical map, 3D | `button.ri` | LIVE | view: "DECIDE" -> "MISSION"; nOpen: 0 -> 1; nOn: 35 -> 50; nAriaPress: 0 -> 9; toolLen: 191 -> 186; bodyLen: … |
| COMMANDER | GLOBAL@DECIDE | Approvals awaiting a human | `button.ri[data-act="approvals"]` | LIVE | view: "DECIDE" -> "TASKING"; toolLen: 191 -> 192; nAriaExpF: 19 -> 22; bodyLen: 6479 -> 3219; paneLen: 4425 -… |
| COMMANDER | GLOBAL@DECIDE | Keyboard shortcuts (?) | `button.ri[data-act="keys"]` | LIVE | nShow: 0 -> 1; bodyLen: 6479 -> 8370 |
| COMMANDER | GLOBAL@MISSION | Tactical 3D | `span.chip.on[data-mapscope="3D"]` | NOOP-already-selected | focus: "ri" -> "chip on" |
| COMMANDER | GLOBAL@MISSION | Overview | `a.navItem.big[data-view="DECIDE"]` | LIVE | view: "MISSION" -> "DECIDE"; nOn: 50 -> 45; toolLen: 186 -> 191; bodyLen: 3433 -> 6479; paneLen: 1313 -> 4425… |
| COMMANDER | GLOBAL@MISSION | Map | `a.navItem.big.on[data-view="MISSION"]` | NOOP-already-selected | — |
| COMMANDER | GLOBAL@MISSION | Show every destination | `#btnNavAll` | LIVE | bodyClass: "navOpen standby notdeployed theater3d map3d" -> "navOpen standby notdeployed theater3d map3d navA… |
| COMMANDER | GLOBAL@MISSION | ◉ Sound on | `#audBtn` | LIVE | nOn: 51 -> 50; railLen: 454 -> 449; bodyLen: 3725 -> 3720; focus: "btnNavAll" -> "audBtn" |
| COMMANDER | GLOBAL@MISSION | DECISIONS | `button.nsp-cs` | LIVE | inspLen: 684 -> 600; inspHtmlLen: 3932 -> 2952; bodyLen: 3720 -> 3637; focus: "audBtn" -> "navOpen standby no… |
| COMMANDER | GLOBAL@MISSION | RUN DETAIL | `button.nsp-cs.on` | ERROR | vanished before press |
| COMMANDER | GLOBAL@MISSION | RUN SUMMARY | `div.nsp-sec` | ERROR | vanished before press |
| COMMANDER | GLOBAL@MISSION | LATEST EVENTS | `div.nsp-sec` | ERROR | vanished before press |
| COMMANDER | GLOBAL@MISSION | TAGS | `div.nsp-sec` | ERROR | vanished before press |
| COMMANDER | GLOBAL@MISSION | Map layers | `button.ri.on[data-act="legend"]` | LIVE | nOn: 50 -> 49; bodyLen: 3637 -> 2834; paneLen: 1313 -> 510; paneHtmlLen: 53185 -> 53192; focus: "navOpen stan… |
| COMMANDER | GLOBAL@MISSION | Draw every layer | `button.ri[data-act="layersAll"]` | LIVE | nOn: 49 -> 40; nAriaPress: 10 -> 1; nAriaPressF: 0 -> 9; bodyLen: 2834 -> 2833; paneLen: 510 -> 509; paneHtml… |
| COMMANDER | GLOBAL@MISSION | Fit the area of operations | `button.ri[data-act="fit"]` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| COMMANDER | GLOBAL@MISSION | Zoom in | `button.ri[data-act="zoomIn"]` | LIVE (re-test) | fresh-page re-test: zoom: 1 -> 1.5; focus: "navOpen standby notdeployed navAll" -> "ri" |
| COMMANDER | GLOBAL@MISSION | Zoom out | `button.ri[data-act="zoomOut"]` | LIVE | bodyLen: 2834 -> 2833; paneLen: 510 -> 509; paneHtmlLen: 53174 -> 53173 |
| COMMANDER | GLOBAL@MISSION | Tactical map, 3D | `button.ri.on` | NOOP-already-selected | focus: "ri" -> "ri on" |
| COMMANDER | DECIDE | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 6683 -> 23913; focus: "ri" -> "pMark detAttr" |
| COMMANDER | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7397 -> 23913; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| COMMANDER | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7383 -> 23913 |
| COMMANDER | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7262 -> 23913 |
| COMMANDER | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7262 -> 23913 |
| COMMANDER | DECIDE | Send the drones → | `button.btn.ok[data-deploy="1"]` | LIVE | nOn: 36 -> 39; bodyLen: 7262 -> 7514; focus: "pMark detAttr pmC" -> "btn ok" |
| COMMANDER | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 6683 -> 23913; focus: "btn ok" -> "pMark detAttr pmC" |
| COMMANDER | DECIDE | AI: CRI-Net | `span.pMark.aiAttr.pmC` | LIVE | bodyLen: 7262 -> 23913; focus: "pMark detAttr pmC" -> "pMark aiAttr pmC" |
| COMMANDER | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7342 -> 23913; focus: "pMark aiAttr pmC" -> "pMark detAttr pmC" |
| COMMANDER | DECIDE | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | bodyLen: 7320 -> 23913; focus: "pMark detAttr pmC" -> "pMark detAttr" |
| COMMANDER | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7383 -> 23913; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| COMMANDER | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 6683 -> 23913 |
| COMMANDER | DECIDE | + TRV-150C | `button.cqAddB` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; bodyLen: 7320 -> 6779; paneLen: 4425 -> 4443; paneHtmlLen: 25780 -> 25916; foc… |
| COMMANDER | DECIDE | + Soaring M25 | `button.cqAddB` | LIVE | nToast: 1 -> 2; bodyLen: 6779 -> 6878; paneLen: 4443 -> 4464; paneHtmlLen: 25916 -> 26055 |
| COMMANDER | DECIDE | + FVR-90 (Crimson) | `button.cqAddB` | LIVE | nToast: 2 -> 3; inspLen: 600 -> 601; inspHtmlLen: 2952 -> 2953; bodyLen: 6878 -> 6984; paneLen: 4464 -> 4490;… |
| COMMANDER | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 6984 -> 24214; focus: "navOpen standby notdeployed theater3d map3d navAll" -> "pMark … |
| COMMANDER | DECIDE | + TRV-150C | `button.cqAddB` | LIVE | nShow: 1 -> 0; nToast: 2 -> 3; bodyLen: 7543 -> 7001; paneLen: 4490 -> 4508; paneHtmlLen: 26200 -> 26336; foc… |
| COMMANDER | DECIDE | + Soaring M25 | `button.cqAddB` | LIVE | nToast: 2 -> 3; bodyLen: 6923 -> 7021; paneLen: 4508 -> 4529; paneHtmlLen: 26336 -> 26475 |
| COMMANDER | DECIDE | + FVR-90 (Crimson) | `button.cqAddB` | LIVE | nToast: 2 -> 3; bodyLen: 6943 -> 7046; paneLen: 4529 -> 4555; paneHtmlLen: 26475 -> 26619 |
| COMMANDER | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 7046 -> 24276; focus: "navOpen standby notdeployed theater3d map3d navAll" -> "pMark … |
| COMMANDER | DECIDE | + TRV-150C | `button.cqAddB` | LIVE | nShow: 1 -> 0; nToast: 2 -> 3; bodyLen: 7606 -> 7065; paneLen: 4555 -> 4573; paneHtmlLen: 26619 -> 26756; foc… |
| COMMANDER | DECIDE | + Soaring M25 | `button.cqAddB` | LIVE | nToast: 2 -> 3; bodyLen: 6988 -> 7087; paneLen: 4573 -> 4594; paneHtmlLen: 26756 -> 26896 |
| COMMANDER | DECIDE | + FVR-90 (Crimson) | `button.cqAddB` | LIVE | nToast: 2 -> 3; bodyLen: 7010 -> 7114; paneLen: 4594 -> 4620; paneHtmlLen: 26896 -> 27041 |
| COMMANDER | DECIDE | − | `button` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| COMMANDER | DECIDE | + | `button` | LIVE | nDisabled: 3 -> 2; bodyLen: 7036 -> 7060; paneLen: 4620 -> 4644; paneHtmlLen: 27041 -> 27104; focus: "BUTTON"… |
| COMMANDER | DECIDE | − | `button` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| COMMANDER | DECIDE | + | `button` | LIVE | nDisabled: 3 -> 2 |
| COMMANDER | DECIDE | − | `button` | DEAD | no state change (PIXELS ONLY) |
| COMMANDER | DECIDE | + | `button` | LIVE (re-test) | fresh-page re-test: nDisabled: 3 -> 2; bodyLen: 6241 -> 6265; paneLen: 4279 -> 4303 |
| COMMANDER | DECIDE | Choose how many first | `button.mini.ok` | ERROR | vanished before press |
| COMMANDER | DECIDE | LITTORAL LIGHT 2× Soaring M25 · 4× TRV-150C  | `button.cqPkg` | LIVE | nToast: 0 -> 3; inspLen: 600 -> 601; inspHtmlLen: 2952 -> 2953 |
| COMMANDER | DECIDE | BLUE-WATER REACH 2× TRV-150C · 3× FVR-90 (Cr | `button.cqPkg` | LIVE (re-test) | fresh-page re-test: nToast: 0 -> 3; inspLen: 305 -> 306; inspHtmlLen: 2116 -> 2117 |
| COMMANDER | DECIDE | MASCAL SURGE 8× TRV-150C — maximum slots, mi | `button.cqPkg` | LIVE (re-test) | fresh-page re-test: nToast: 0 -> 3; inspLen: 305 -> 306; inspHtmlLen: 2116 -> 2117 |
| COMMANDER | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; nOff: 0 -> 1 |
| COMMANDER | DECIDE | Change operation → | `button.mini` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; bodyLen: 6241 -> 6401; focus: "navOpen standby notdeployed navAll" -> "min… |
| COMMANDER | DECIDE | Change operation → | `button.mini` | LIVE | nShow: 0 -> 1; nToast: 3 -> 0 |
| COMMANDER | DECIDE | Change operation → | `button.mini` | LIVE | nShow: 0 -> 1 |
| COMMANDER | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1 |
| COMMANDER | DECIDE | ARMED | `span.chip.on` | LIVE | nShow: 1 -> 0 |
| COMMANDER | MISSION | [Tactical map. Arrow keys pan, plus and m] | `#g3Canvas` | LIVE (re-test) | fresh-page re-test: attrSig,paneSig,paneHtmlLen |
| COMMANDER | MISSION | *(no label)* | `#deckgl-overlay` | LIVE (re-test) | fresh-page re-test: attrSig,paneSig,paneHtmlLen |
| COMMANDER | MISSION | Real geography | `button.g3Tog.on` | LIVE | nOn: 44 -> 43; nAriaPress: 10 -> 9; nAriaPressF: 0 -> 1; focus: "deckgl-overlay" -> "navOpen standby notdeplo… |
| COMMANDER | MISSION | Sector terrain | `button.g3Tog.on` | LIVE | nOn: 43 -> 42; nAriaPress: 9 -> 8; nAriaPressF: 1 -> 2 |
| COMMANDER | MISSION | Route arcs | `button.g3Tog.on` | LIVE | nOn: 42 -> 41; nAriaPress: 8 -> 7; nAriaPressF: 2 -> 3 |
| COMMANDER | MISSION | Aircraft trails | `button.g3Tog.on` | LIVE | nOn: 41 -> 40; nAriaPress: 7 -> 6; nAriaPressF: 3 -> 4 |
| COMMANDER | MISSION | Casualties | `button.g3Tog.on` | LIVE | nOn: 40 -> 39; nAriaPress: 6 -> 5; nAriaPressF: 4 -> 5 |
| COMMANDER | MISSION | Time columns | `button.g3Tog.on` | LIVE | nOn: 39 -> 38; nAriaPress: 5 -> 4; nAriaPressF: 5 -> 6 |
| COMMANDER | MISSION | Threat envelopes | `button.g3Tog.on` | LIVE | nOn: 38 -> 37; nAriaPress: 4 -> 3; nAriaPressF: 6 -> 7 |
| COMMANDER | MISSION | Sectors & units | `button.g3Tog.on` | LIVE | nOn: 37 -> 36; nAriaPress: 3 -> 2; nAriaPressF: 7 -> 8 |
| COMMANDER | MISSION | Labels | `button.g3Tog.on` | LIVE | nOn: 36 -> 35; nAriaPress: 2 -> 1; nAriaPressF: 8 -> 9 |
| COMMANDER | MISSION | ▶ | `#g3Play` | LIVE | nOn: 35 -> 34; focus: "navOpen standby notdeployed map3d navAll" -> "g3Play" |
| COMMANDER | MISSION | [Simulation time] | `#g3Scrub` | LIVE (re-test) | fresh-page re-test: nOn,classSig,attrSig,paneSig,bodyLen,paneLen,paneHtmlLen |
| COMMANDER | MISSION | 4× | `#g3Rate` | LIVE (re-test) | fresh-page re-test: attrSig,paneSig,bodyLen,paneLen,paneHtmlLen |
| COMMANDER | MISSION | LIVE | `#g3Follow` | LIVE | nOn: 34 -> 35; focus: "g3Rate" -> "g3Follow" |
| COMMANDER | MISSION | FIT | `#g3Fit` | LIVE (re-test) | fresh-page re-test: attrSig,paneSig,paneHtmlLen |
| COMMANDER | MISSION | TOP-DOWN | `#g3Top2` | LIVE (re-test) | fresh-page re-test: attrSig,paneSig,paneHtmlLen |
| COMMANDER | MISSION | show the detail | `#cqMissionMore` | LIVE | nAriaExp: 3 -> 4; nAriaExpF: 15 -> 14; focus: "g3Top2" -> "cqMissionMore" |
| COMMANDER | CASUALTIES | AI: CRI-Net · Predicts collapse | `span.pMark.aiAttr` | LIVE | nShow: 0 -> 1; bodyLen: 3956 -> 21186; focus: "navOpen standby notdeployed map3d navAll" -> "pMark aiAttr" |
| COMMANDER | CASUALTIES | Export CSV | `#btnExportCas` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; bodyLen: 4624 -> 3992; focus: "pMark aiAttr" -> "btnExportCas" |
| COMMANDER | CASUALTIES | All | `span.chip.on` | NOOP-already-selected | focus: "btnExportCas" -> "navOpen standby notdeployed map3d navAll" |
| COMMANDER | CASUALTIES | Open | `span.chip` | LIVE | filter: "{\"cas\":\"ALL\",\"q\":\"\"}" -> "{\"cas\":\"OPEN\",\"q\":\"\"}" |
| COMMANDER | CASUALTIES | Critical | `span.chip` | LIVE | filter: "{\"cas\":\"OPEN\",\"q\":\"\"}" -> "{\"cas\":\"CRITICAL\",\"q\":\"\"}" |
| COMMANDER | CASUALTIES | Treated | `span.chip` | LIVE | filter: "{\"cas\":\"CRITICAL\",\"q\":\"\"}" -> "{\"cas\":\"TREATED\",\"q\":\"\"}"; nToast: 1 -> 0; bodyLen: 3… |
| COMMANDER | CASUALTIES | Died of wounds | `span.chip` | LIVE | filter: "{\"cas\":\"TREATED\",\"q\":\"\"}" -> "{\"cas\":\"DIED\",\"q\":\"\"}" |
| COMMANDER | CASUALTIES | High-value | `span.chip` | LIVE | filter: "{\"cas\":\"DIED\",\"q\":\"\"}" -> "{\"cas\":\"HVA\",\"q\":\"\"}" |
| COMMANDER | CASUALTIES | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3956 -> 21186; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr pm… |
| COMMANDER | CASUALTIES | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4535 -> 21186 |
| COMMANDER | CASUALTIES | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4535 -> 21186 |
| COMMANDER | CASUALTIES | + | `button.gpFold` | LIVE | nShow: 1 -> 0; nAriaExp: 4 -> 5; nAriaExpF: 17 -> 16; bodyLen: 4593 -> 4007; paneLen: 1694 -> 1745; paneHtmlL… |
| COMMANDER | CASUALTIES | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4007 -> 21237; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr pm… |
| COMMANDER | CASUALTIES | Open launch point → | `button.mini` | LIVE | view: "CASUALTIES" -> "LAUNCHPOINTS"; nShow: 1 -> 0; nSelected: 0 -> 1; toolLen: 193 -> 196; bodyLen: 4586 ->… |
| COMMANDER | CASUALTIES | + | `button.gpFold` | LIVE | nAriaExp: 5 -> 6; nAriaExpF: 16 -> 15; bodyLen: 4007 -> 4058; paneLen: 1745 -> 1796; paneHtmlLen: 10431 -> 10… |
| COMMANDER | CASUALTIES | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4058 -> 21288; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr pm… |
| COMMANDER | CASUALTIES | Open launch point → | `button.mini` | LIVE | view: "CASUALTIES" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 193 -> 196; bodyLen: 4637 -> 4123; paneLen: 179… |
| COMMANDER | CASUALTIES | + | `button.gpFold` | LIVE | nAriaExp: 6 -> 7; nAriaExpF: 15 -> 14; bodyLen: 4058 -> 4109; paneLen: 1796 -> 1847; paneHtmlLen: 10506 -> 10… |
| COMMANDER | CASUALTIES | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4109 -> 21339; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr pm… |
| COMMANDER | CASUALTIES | Open launch point → | `button.mini` | LIVE | view: "CASUALTIES" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 193 -> 196; bodyLen: 4688 -> 4123; paneLen: 184… |
| COMMANDER | CASUALTIES (expanded) | All | `span.chip` | LIVE | filter: "{\"cas\":\"HVA\",\"q\":\"\"}" -> "{\"cas\":\"ALL\",\"q\":\"\"}" |
| COMMANDER | CASUALTIES (expanded) | High-value | `span.chip.on` | ERROR | vanished before press |
| COMMANDER | CASUALTIES (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 7 -> 6; nAriaExpF: 14 -> 15; bodyLen: 4109 -> 4058; paneLen: 1847 -> 1796; paneHtmlLen: 10581 -> 10… |
| COMMANDER | CASUALTIES (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 6 -> 5; nAriaExpF: 15 -> 16; bodyLen: 4058 -> 4007; paneLen: 1796 -> 1745; paneHtmlLen: 10506 -> 10… |
| COMMANDER | CASUALTIES (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 5 -> 4; nAriaExpF: 16 -> 17; bodyLen: 4007 -> 3956; paneLen: 1745 -> 1694; paneHtmlLen: 10431 -> 10… |
| COMMANDER | FLEET | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 3466 -> 20696; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr" |
| COMMANDER | FLEET | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4142 -> 20696; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| COMMANDER | FLEET | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4045 -> 20696 |
| COMMANDER | FLEET | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4045 -> 20696 |
| COMMANDER | FLEET | + | `button.gpFold` | LIVE | nShow: 1 -> 0; nAriaExp: 4 -> 5; nAriaExpF: 20 -> 29; bodyLen: 4045 -> 4935; paneLen: 1206 -> 2675; paneHtmlL… |
| COMMANDER | FLEET | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4935 -> 22165; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr pm… |
| COMMANDER | FLEET | Open launch point → | `button.mini` | LIVE | view: "FLEET" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; bodyLen: 5514 -> 4123; paneLen: 2675 -> … |
| COMMANDER | FLEET | + | `button.gpFold` | LIVE | nAriaExp: 5 -> 6; nAriaExpF: 29 -> 35; bodyLen: 4935 -> 5981; paneLen: 2675 -> 3721; paneHtmlLen: 16913 -> 22… |
| COMMANDER | FLEET | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5981 -> 23211; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr pm… |
| COMMANDER | FLEET | Open launch point → | `button.mini` | LIVE | view: "FLEET" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; bodyLen: 6560 -> 4123; paneLen: 3721 -> … |
| COMMANDER | FLEET | + | `button.gpFold` | LIVE | nAriaExp: 6 -> 7; nAriaExpF: 35 -> 44; bodyLen: 5981 -> 7448; paneLen: 3721 -> 5188; paneHtmlLen: 22356 -> 29… |
| COMMANDER | FLEET | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 7448 -> 24678; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr pm… |
| COMMANDER | FLEET | Open launch point → | `button.mini` | LIVE | view: "FLEET" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; bodyLen: 8027 -> 4123; paneLen: 5188 -> … |
| COMMANDER | FLEET (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 7 -> 6; nAriaExpF: 44 -> 35; bodyLen: 7448 -> 5979; paneLen: 5188 -> 3719; paneHtmlLen: 29940 -> 22… |
| COMMANDER | FLEET (expanded) | M25-01 Soaring M25 READY awaiting tasking 5– | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="1"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-02 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="2"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | M25-08 Soaring M25 READY awaiting tasking 5– | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="8"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-11 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="11"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | FVR-14 FVR-90 (Crimson) READY awaiting taski | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="14"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-15 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="15"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | FVR-18 FVR-90 (Crimson) READY awaiting taski | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="18"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-20 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="20"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-23 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="23"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-26 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="26"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 6 -> 5; nAriaExpF: 35 -> 29; bodyLen: 5979 -> 4933; paneLen: 3719 -> 2673; paneHtmlLen: 22351 -> 16… |
| COMMANDER | FLEET (expanded) | TRV-03 TRV-150C READY awaiting tasking 12–34 | `tr` | LIVE | nAriaExp: 5 -> 6; nSelected: 1 -> 2; nAriaExpF: 29 -> 28; bodyLen: 4933 -> 5420; paneLen: 2673 -> 3160; paneH… |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="3"]` | LIVE | nToast: 0 -> 1; bodyLen: 4933 -> 5002; paneLen: 2673 -> 2722; paneHtmlLen: 16908 -> 16962; focus: "TR" -> "na… |
| COMMANDER | FLEET (expanded) | TRV-04 TRV-150C READY awaiting tasking 12–34 | `tr` | LIVE | nAriaExp: 5 -> 6; nSelected: 1 -> 2; nAriaExpF: 29 -> 28; bodyLen: 5002 -> 5489; paneLen: 2722 -> 3209; paneH… |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="4"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | FVR-05 FVR-90 (Crimson) READY awaiting taski | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="5"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | M25-09 Soaring M25 READY awaiting tasking 5– | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="9"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-12 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="12"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-16 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="16"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | FVR-19 FVR-90 (Crimson) READY awaiting taski | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="19"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-21 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="21"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-24 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="24"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-27 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="27"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | − | `button.gpFold` | LIVE | nSelected: 1 -> 0 |
| COMMANDER | FLEET (expanded) | M25-06 Soaring M25 READY awaiting tasking 5– | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="6"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-07 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="7"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-10 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="10"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-13 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="13"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | FVR-17 FVR-90 (Crimson) READY awaiting taski | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="17"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-22 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="22"]` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | TRV-25 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| COMMANDER | FLEET (expanded) | Hold | `button.mini[data-hold="25"]` | ERROR | vanished before press |
| COMMANDER | LAUNCHPOINTS | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 3423 -> 20653; focus: "navOpen standby notdeployed map3d navAll" -> "pM… |
| COMMANDER | LAUNCHPOINTS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4135 -> 20653; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| COMMANDER | LAUNCHPOINTS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4002 -> 20653 |
| COMMANDER | LAUNCHPOINTS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4020 -> 20653 |
| COMMANDER | LAUNCHPOINTS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4123 -> 20653 |
| COMMANDER | LAUNCHPOINTS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4060 -> 20653 |
| COMMANDER | LAUNCHPOINTS | FARP ALPHA 2 airframes assigned ASHORE 2 / 2 | `tr` | LIVE | nShow: 1 -> 0; nAriaExp: 3 -> 4; nSelected: 0 -> 1; nAriaExpF: 21 -> 20; bodyLen: 4060 -> 3954; paneLen: 1160… |
| COMMANDER | LAUNCHPOINTS | Open → | `button.mini` | LIVE | nSelected: 0 -> 1; nAriaExpF: 21 -> 18; bodyLen: 3423 -> 3456; paneLen: 1160 -> 1193; paneHtmlLen: 9754 -> 93… |
| COMMANDER | LAUNCHPOINTS | LHA BOXER 3 airframes assigned AFLOAT 3 / 3  | `tr` | ERROR | vanished before press |
| COMMANDER | LAUNCHPOINTS | Open → | `button.mini` | ERROR | vanished before press |
| COMMANDER | LAUNCHPOINTS | FARP BRAVO 2 airframes assigned ASHORE 2 / 2 | `tr` | ERROR | vanished before press |
| COMMANDER | LAUNCHPOINTS | Open → | `button.mini` | ERROR | vanished before press |
| COMMANDER | SUPPLY | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 3554 -> 20784; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr" |
| COMMANDER | SUPPLY | + | `button.gpFold` | LIVE | nShow: 1 -> 0; nAriaExp: 3 -> 4; nAriaExpF: 21 -> 25; bodyLen: 4222 -> 3864; paneLen: 1297 -> 1607; paneHtmlL… |
| COMMANDER | SUPPLY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3864 -> 21094; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr pm… |
| COMMANDER | SUPPLY | Open launch point → | `button.mini` | LIVE | view: "SUPPLY" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; bodyLen: 4443 -> 3456; paneLen: 1607 ->… |
| COMMANDER | SUPPLY | + | `button.gpFold` | LIVE | nAriaExp: 4 -> 5; nAriaExpF: 25 -> 29; bodyLen: 3864 -> 4175; paneLen: 1607 -> 1918; paneHtmlLen: 11772 -> 14… |
| COMMANDER | SUPPLY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4175 -> 21405; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr pm… |
| COMMANDER | SUPPLY | Open launch point → | `button.mini` | LIVE | view: "SUPPLY" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; bodyLen: 4754 -> 3456; paneLen: 1918 ->… |
| COMMANDER | SUPPLY | + | `button.gpFold` | LIVE | nAriaExp: 5 -> 6; nAriaExpF: 29 -> 33; bodyLen: 4175 -> 4485; paneLen: 1918 -> 2228; paneHtmlLen: 14966 -> 18… |
| COMMANDER | SUPPLY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4485 -> 21715; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr pm… |
| COMMANDER | SUPPLY | Open launch point → | `button.mini` | LIVE | view: "SUPPLY" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; bodyLen: 5064 -> 3456; paneLen: 2228 ->… |
| COMMANDER | SUPPLY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4485 -> 21715; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr pm… |
| COMMANDER | SUPPLY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 5064 -> 21715 |
| COMMANDER | SUPPLY (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 6 -> 5; nAriaExpF: 33 -> 29; bodyLen: 4485 -> 4175; paneLen: 2228 -> 1918; paneHtmlLen: 18160 -> 14… |
| COMMANDER | SUPPLY (expanded) | Whole Blood (1 u) BLOOD 5 0 0 5 | `tr` | LIVE | nAriaExp: 5 -> 6; nSelected: 1 -> 2; nAriaExpF: 29 -> 28; bodyLen: 4175 -> 4595; paneLen: 1918 -> 2338; paneH… |
| COMMANDER | SUPPLY (expanded) | Freeze-Dried Plasma PLASMA 4 0 0 4 | `tr` | LIVE | nAriaExp: 5 -> 6; nSelected: 1 -> 2; nAriaExpF: 29 -> 28; bodyLen: 4175 -> 4594; paneLen: 1918 -> 2337; paneH… |
| COMMANDER | SUPPLY (expanded) | TXA 2g TXA 9 0 not modelled 9 | `tr` | LIVE | nAriaExp: 5 -> 6; nSelected: 1 -> 2; nAriaExpF: 29 -> 28; bodyLen: 4175 -> 4544; paneLen: 1918 -> 2287; paneH… |
| COMMANDER | SUPPLY (expanded) | Hemorrhage Kit HEM KIT 20 0 not modelled 20 | `tr` | LIVE | nAriaExp: 5 -> 6; nSelected: 1 -> 2; nAriaExpF: 29 -> 28; bodyLen: 4175 -> 4555; paneLen: 1918 -> 2298; paneH… |
| COMMANDER | SUPPLY (expanded) | Chest Seal / NPA SEAL 9 0 not modelled 9 | `tr` | LIVE | nAriaExp: 5 -> 6; nSelected: 1 -> 2; nAriaExpF: 29 -> 28; bodyLen: 4175 -> 4553; paneLen: 1918 -> 2296; paneH… |
| COMMANDER | SUPPLY (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 5 -> 4; nAriaExpF: 29 -> 25; bodyLen: 4175 -> 3864; paneLen: 1918 -> 1607; paneHtmlLen: 14966 -> 11… |
| COMMANDER | SUPPLY (expanded) | Whole Blood (1 u) BLOOD 5 0 0 5 | `tr` | LIVE | nAriaExp: 4 -> 5; nSelected: 1 -> 2; nAriaExpF: 25 -> 24; bodyLen: 3864 -> 4284; paneLen: 1607 -> 2027; paneH… |
| COMMANDER | SUPPLY (expanded) | Freeze-Dried Plasma PLASMA 4 0 0 4 | `tr` | LIVE | nAriaExp: 4 -> 5; nSelected: 1 -> 2; nAriaExpF: 25 -> 24; bodyLen: 3864 -> 4283; paneLen: 1607 -> 2026; paneH… |
| COMMANDER | SUPPLY (expanded) | TXA 2g TXA 9 0 not modelled 9 | `tr` | LIVE | nAriaExp: 4 -> 5; nSelected: 1 -> 2; nAriaExpF: 25 -> 24; bodyLen: 3864 -> 4233; paneLen: 1607 -> 1976; paneH… |
| COMMANDER | SUPPLY (expanded) | Hemorrhage Kit HEM KIT 20 0 not modelled 20 | `tr` | LIVE | nAriaExp: 4 -> 5; nSelected: 1 -> 2; nAriaExpF: 25 -> 24; bodyLen: 3864 -> 4244; paneLen: 1607 -> 1987; paneH… |
| COMMANDER | SUPPLY (expanded) | Chest Seal / NPA SEAL 9 0 not modelled 9 | `tr` | LIVE | nAriaExp: 4 -> 5; nSelected: 1 -> 2; nAriaExpF: 25 -> 24; bodyLen: 3864 -> 4242; paneLen: 1607 -> 1985; paneH… |
| COMMANDER | SUPPLY (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 4 -> 3; nAriaExpF: 25 -> 21; bodyLen: 3864 -> 3554; paneLen: 1607 -> 1297; paneHtmlLen: 11772 -> 85… |
| COMMANDER | SUPPLY (expanded) | Whole Blood (1 u) BLOOD 5 0 0 5 | `tr` | ERROR | vanished before press |
| COMMANDER | SUPPLY (expanded) | Freeze-Dried Plasma PLASMA 4 0 0 4 | `tr` | ERROR | vanished before press |
| COMMANDER | SUPPLY (expanded) | TXA 2g TXA 9 0 not modelled 9 | `tr` | ERROR | vanished before press |
| COMMANDER | SUPPLY (expanded) | Hemorrhage Kit HEM KIT 20 0 not modelled 20 | `tr` | ERROR | vanished before press |
| COMMANDER | SUPPLY (expanded) | Chest Seal / NPA SEAL 9 0 not modelled 9 | `tr` | ERROR | vanished before press |
| COMMANDER | TASKING | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 3423 -> 20653; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr" |
| COMMANDER | TASKING | show the policy | `#cqTaskingMore` | LIVE | nShow: 1 -> 0; nAriaExp: 3 -> 4; nAriaExpF: 24 -> 23; bodyLen: 4104 -> 4666; paneLen: 1164 -> 2407; paneHtmlL… |
| COMMANDER | TASKING | Approve all pending | `#btnApproveAll` | LIVE | nToast: 0 -> 1; bodyLen: 4666 -> 4699; focus: "cqTaskingMore" -> "btnApproveAll" |
| COMMANDER | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4699 -> 21929; focus: "btnApproveAll" -> "pMark detAttr pmC" |
| COMMANDER | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 5399 -> 21929 |
| COMMANDER | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 5280 -> 21929 |
| COMMANDER | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 5247 -> 21896 |
| COMMANDER | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 5247 -> 21896 |
| COMMANDER | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 5247 -> 21896 |
| COMMANDER | TASKING | + | `button.gpFold` | LIVE | nShow: 1 -> 0; nAriaExp: 4 -> 5; nAriaExpF: 23 -> 22; bodyLen: 5247 -> 4820; paneLen: 2407 -> 2561; paneHtmlL… |
| COMMANDER | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 3127 -> 23161 |
| COMMANDER | TASKING | Open launch point → | `button.mini` | LIVE | view: "TASKING" -> "LAUNCHPOINTS"; toolLen: 192 -> 196; bodyLen: 4820 -> 3456; paneLen: 2561 -> 1193; paneHtm… |
| COMMANDER | TASKING | + | `button.gpFold` | LIVE (re-test) | fresh-page re-test: nAriaExp: 0 -> 1; nAriaExpF: 21 -> 20; bodyLen: 3127 -> 3280 |
| COMMANDER | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4820 -> 22050; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr pm… |
| COMMANDER | TASKING | Open launch point → | `button.mini` | LIVE | view: "TASKING" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 192 -> 196; bodyLen: 5399 -> 3456; paneLen: 2561 -… |
| COMMANDER | TASKING | + | `button.gpFold` | LIVE | nAriaExp: 5 -> 6; nAriaExpF: 22 -> 21; bodyLen: 4820 -> 4973; paneLen: 2561 -> 2714; paneHtmlLen: 15229 -> 15… |
| COMMANDER | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4973 -> 22203; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr pm… |
| COMMANDER | TASKING | Open launch point → | `button.mini` | LIVE | view: "TASKING" -> "LAUNCHPOINTS"; toolLen: 192 -> 196; bodyLen: 4973 -> 3456; paneLen: 2714 -> 1193; paneHtm… |
| COMMANDER | TASKING (expanded) | hide the detail | `#cqTaskingMore` | LIVE | nAriaExp: 6 -> 5; nAriaExpF: 21 -> 22; bodyLen: 4973 -> 3730; paneLen: 2714 -> 1471; paneHtmlLen: 15419 -> 15… |
| COMMANDER | TASKING (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 5 -> 4; nAriaExpF: 22 -> 23; bodyLen: 3730 -> 3576; paneLen: 1471 -> 1317; paneHtmlLen: 15420 -> 15… |
| COMMANDER | TASKING (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 4 -> 3; nAriaExpF: 23 -> 24; bodyLen: 3576 -> 3423; paneLen: 1317 -> 1164; paneHtmlLen: 15229 -> 15… |
| COMMANDER | TASKING (expanded) | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3423 -> 20653; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr pm… |
| COMMANDER | CONFIDENCE | NOT AI REPLICATED TRIAL | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 5182 -> 22405; paneLen: 2924 -> 2917; paneHtmlLen: 12264 -> 11363; focus: "navOpen st… |
| COMMANDER | CONFIDENCE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 5928 -> 22405; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| COMMANDER | CONFIDENCE | None — headline run only Fleet size Launch p | `#mcLever` | LIVE | nShow: 1 -> 0; bodyLen: 5897 -> 5175; focus: "pMark detAttr pmC" -> "mcLever" |
| COMMANDER | CONFIDENCE | Deaths among survivable wounds All deaths | `#mcMetric` | DEAD | no state change (ERR) |
| COMMANDER | CONFIDENCE | Run replications | `#mcRun` | LIVE | nDisabled: 3 -> 4; bodyLen: 5175 -> 6061; paneLen: 2917 -> 3803; paneHtmlLen: 11363 -> 13742; focus: "mcMetri… |
| COMMANDER | CONFIDENCE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 6088 -> 23320; paneLen: 3830 -> 3832; paneHtmlLen: 12873 -> 12875; focus: "navOpen st… |
| COMMANDER | CONFIDENCE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 6097 -> 23334; paneLen: 3839 -> 3846; paneHtmlLen: 12884 -> 13783 |
| COMMANDER | CONFIDENCE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 6826 -> 23327; paneLen: 3846 -> 3839; paneHtmlLen: 13783 -> 12883 |
| COMMANDER | CONFIDENCE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 6819 -> 23327 |
| COMMANDER | AFTERACTION | NOT AI ARITHMETIC | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 5281 -> 22511; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr" |
| COMMANDER | AFTERACTION | NOT AI | `span.pMark.detAttr.pmC` | ERROR | vanished before press |
| COMMANDER | AFTERACTION | Watch it run → | `button.mini[data-view="CONFIDENCE"]` | LIVE | view: "AFTERACTION" -> "CONFIDENCE"; nShow: 1 -> 0; nOn: 32 -> 35; toolLen: 202 -> 192; bodyLen: 5847 -> 6105… |
| COMMANDER | AFTERACTION | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5282 -> 5861 |
| COMMANDER | AFTERACTION | The difference → | `button.mini[data-view="COMPARE"]` | LIVE | view: "AFTERACTION" -> "COMPARE"; nOn: 32 -> 34; toolLen: 202 -> 197; bodyLen: 5282 -> 3151; paneLen: 3014 ->… |
| COMMANDER | AFTERACTION | Why this exists → | `button.mini[data-view="STANDARD"]` | LIVE | view: "AFTERACTION" -> "STANDARD"; nOn: 32 -> 34; toolLen: 202 -> 198; bodyLen: 5282 -> 7415; paneLen: 3014 -… |
| COMMANDER | AFTERACTION | Evidence → | `button.mini[data-view="ANALYSIS"]` | LIVE | view: "AFTERACTION" -> "ANALYSIS"; nOn: 32 -> 33; nHidden: 2 -> 3; toolLen: 202 -> 191; nAriaExpF: 24 -> 25; … |
| COMMANDER | AFTERACTION | The case beyond lives → | `button.mini[data-view="ROI"]` | LIVE | bodyLen: 5296 -> 5282; paneLen: 3028 -> 3014; paneHtmlLen: 7800 -> 6160 |
| COMMANDER | AFTERACTION | What it costs → | `button.mini[data-view="COST"]` | LIVE | view: "AFTERACTION" -> "COST"; nOn: 32 -> 33; toolLen: 202 -> 196; bodyLen: 5282 -> 4771; paneLen: 3014 -> 25… |
| COMMANDER | AFTERACTION | Scenarios → | `button.mini[data-view="CONFIDENCE"]` | LIVE | view: "AFTERACTION" -> "CONFIDENCE"; nOn: 32 -> 35; toolLen: 202 -> 192; bodyLen: 5282 -> 6132; paneLen: 3014… |
| COMMANDER | AFTERACTION | Decision log → | `button.mini[data-view="AUDIT"]` | LIVE | view: "AFTERACTION" -> "AUDIT"; nOn: 32 -> 33; nHidden: 3 -> 4; toolLen: 202 -> 195; nAriaExpF: 25 -> 26; bod… |
| COMMANDER | STANDARD | NOT AI PUBLISHED FIGURE | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 7415 -> 24645; focus: "navOpen standby notdeployed map3d navAll" -> "pMark detAttr" |
| COMMANDER | STANDARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7989 -> 24645; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| COMMANDER | STANDARD | ▶ | `#filmPlay` | LIVE | bodyLen: 7415 -> 7416; paneLen: 5151 -> 5152; paneHtmlLen: 14081 -> 14096; focus: "pMark detAttr pmC" -> "fil… |
| COMMANDER | STANDARD | ⛶ | `#filmFs` | LIVE | paneHtmlLen: 14096 -> 14094; focus: "filmPlay" -> "filmFs" |
| COMMANDER | STANDARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 7415 -> 24645; focus: "navOpen standby notdeployed map3d navAll" -> "pM… |
| COMMANDER | STANDARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 7415 -> 24645 |
| COMMANDER | STANDARD | AI: CRI-Net · Predicts collapse | `span.pMark.aiAttr` | LIVE | bodyLen: 7983 -> 24645; focus: "pMark detAttr pmC" -> "pMark aiAttr" |
| COMMANDER | STANDARD | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | bodyLen: 7981 -> 24645; focus: "pMark aiAttr" -> "pMark detAttr" |
| COMMANDER | STANDARD | NOT AI ARITHMETIC | `span.pMark.detAttr` | LIVE | bodyLen: 8027 -> 24645 |
| COMMANDER | STANDARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7933 -> 24645; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| COMMANDER | STANDARD | Show me what this force will lose, and what  | `button.btn.ok.big` | LIVE | view: "STANDARD" -> "ANALYSIS"; nOn: 33 -> 32; nHidden: 2 -> 3; toolLen: 198 -> 191; nAriaExpF: 15 -> 16; bod… |
| COMMANDER | STANDARD | The case beyond lives | `button.btn` | LIVE | view: "STANDARD" -> "ROI"; nOn: 33 -> 32; nHidden: 3 -> 4; toolLen: 198 -> 204; nAriaExpF: 16 -> 17; bodyLen:… |
| COMMANDER | STANDARD | Take me to the fight | `button.btn` | LIVE | view: "STANDARD" -> "DASHBOARD"; bodyClass: "navOpen standby notdeployed map3d navAll" -> "navOpen standby no… |
| COMMANDER | COMPARE | NOT AI ARITHMETIC | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 3151 -> 20381; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark … |
| COMMANDER | COMPARE | Send the drones → | `button.mini.ok[data-deploy="1"]` | LIVE | nOn: 33 -> 36; bodyLen: 3732 -> 3982; focus: "pMark detAttr" -> "mini ok" |
| COMMANDER | COMPARE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3151 -> 20381; focus: "mini ok" -> "pMark detAttr pmC" |
| COMMANDER | COMPARE | show the detail | `#cqCompareMore` | LIVE | nShow: 1 -> 0; nAriaExp: 3 -> 4; nAriaExpF: 17 -> 16; bodyLen: 3732 -> 3959; paneLen: 888 -> 1696; paneHtmlLe… |
| COMMANDER | ANALYSIS | NOT AI ARITHMETIC | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 6354 -> 23584; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark … |
| COMMANDER | ANALYSIS | WHY THIS MATTERS | `button.kpiWhyBtn` | LIVE | nShow: 1 -> 0; nAriaExp: 4 -> 5; nHidden: 4 -> 3; nAriaExpF: 16 -> 15; bodyLen: 6924 -> 6501; paneLen: 4097 -… |
| COMMANDER | ANALYSIS | Capture current run | `#btnSaveRun` | LIVE | nToast: 0 -> 1; bodyLen: 6501 -> 6561; focus: "kpiWhyBtn" -> "btnSaveRun" |
| COMMANDER | ANALYSIS | Run 40-run sweep | `#btnSweep` | LIVE | bodyLen: 6561 -> 6759; paneLen: 4244 -> 4442; paneHtmlLen: 21513 -> 24639; focus: "btnSaveRun" -> "btnSweep" |
| COMMANDER | ANALYSIS | Export JSON | `#btnExportRuns` | LIVE | nToast: 1 -> 2; bodyLen: 6760 -> 6763; paneLen: 4443 -> 4415; paneHtmlLen: 24657 -> 21674; focus: "btnSweep" … |
| COMMANDER | ANALYSIS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; nToast: 1 -> 2; bodyLen: 6703 -> 24018; paneLen: 4415 -> 4443; paneHtmlLen: 21658 -> 24674; fo… |
| COMMANDER | ANALYSIS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7367 -> 24018 |
| COMMANDER | ANALYSIS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nToast: 2 -> 1; bodyLen: 7367 -> 23987 |
| COMMANDER | ANALYSIS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7336 -> 23987 |
| COMMANDER | ANALYSIS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7279 -> 23930 |
| COMMANDER | ANALYSIS | Run the requirement analysis | `#btnReq` | LIVE | nShow: 1 -> 0; bodyLen: 7279 -> 6031; paneLen: 4443 -> 3774; paneHtmlLen: 24674 -> 22361; focus: "pMark detAt… |
| COMMANDER | ANALYSIS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 6800 -> 24030; focus: "btnReq" -> "pMark detAttr pmC" |
| COMMANDER | ANALYSIS | NOT AI ARITHMETIC | `span.pMark.detAttr` | LIVE | bodyLen: 7379 -> 24030; focus: "pMark detAttr pmC" -> "pMark detAttr" |
| COMMANDER | ANALYSIS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 6800 -> 24030; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| COMMANDER | ANALYSIS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nToast: 1 -> 0; bodyLen: 7379 -> 23930 |
| COMMANDER | ANALYSIS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7279 -> 23930 |
| COMMANDER | ANALYSIS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7442 -> 23930 |
| COMMANDER | ANALYSIS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7279 -> 23930 |
| COMMANDER | ANALYSIS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7279 -> 23930 |
| COMMANDER | ROI | NOT AI COST ARITHMETIC | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 2791 -> 20021; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark … |
| COMMANDER | ROI | WHY THIS MATTERS | `button.kpiWhyBtn` | LIVE | nShow: 1 -> 0; nAriaExp: 5 -> 6; nHidden: 3 -> 2; nAriaExpF: 15 -> 14; bodyLen: 3368 -> 3112; paneLen: 521 ->… |
| COMMANDER | ROI | Measure across 35 runs | `#btnRoiSweep` | LIVE | bodyLen: 3112 -> 8093; paneLen: 842 -> 5823; paneHtmlLen: 6247 -> 15953; focus: "kpiWhyBtn" -> "btnRoiSweep" |
| COMMANDER | ROI | Export CSV | `#btnExportRoi` | LIVE | nToast: 0 -> 1; bodyLen: 8091 -> 8119; paneLen: 5821 -> 5820; paneHtmlLen: 15189 -> 15191; focus: "btnRoiSwee… |
| COMMANDER | ROI | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 8127 -> 25350; paneLen: 5828 -> 5821; paneHtmlLen: 15990 -> 15195; focus: "btnExportR… |
| COMMANDER | ROI | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 8802 -> 25453 |
| COMMANDER | ROI | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 8802 -> 25453 |
| COMMANDER | ROI | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 8773 -> 25424 |
| COMMANDER | ROI | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; nToast: 1 -> 0; bodyLen: 8194 -> 25328 |
| COMMANDER | COST | NOT AI COST ARITHMETIC | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 6990 -> 24220; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark … |
| COMMANDER | COST | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7552 -> 24220; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| COMMANDER | COST | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7569 -> 24220 |
| COMMANDER | COST | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7569 -> 24220 |
| COMMANDER | COST | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7569 -> 24220 |
| COMMANDER | COST | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7569 -> 24220 |
| COMMANDER | COST | Re-measure across 35 engagements | `button.btn` | LIVE | nShow: 1 -> 0; bodyLen: 7579 -> 6945; paneLen: 4728 -> 4683; paneHtmlLen: 18861 -> 14946; focus: "pMark detAt… |
| COMMANDER | COST | The full argument, with citations → | `button.btn` | LIVE | view: "COST" -> "ROI"; toolLen: 196 -> 204; bodyLen: 6951 -> 8097; paneLen: 4689 -> 5827; paneHtmlLen: 14951 … |
| COMMANDER | COST | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 6954 -> 24184; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark … |
| COMMANDER | COST | NOT AI ARITHMETIC | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 7086 -> 24316; focus: "pMark detAttr pmC" -> "pMark detAttr" |
| COMMANDER | COST | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7688 -> 24316; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| COMMANDER | COST | How much of this is the seed? → | `button.btn` | LIVE | view: "COST" -> "CONFIDENCE"; nShow: 1 -> 0; nOn: 35 -> 36; toolLen: 196 -> 192; bodyLen: 7665 -> 5271; paneL… |
| COMMANDER | COST | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; nToast: 1 -> 0; bodyLen: 7086 -> 24220; focus: "navOpen standby notdeployed map3d navAll theat… |
| COMMANDER | COST | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 6990 -> 24220 |
| COMMANDER | DASHBOARD | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 23114; focus: "navOpen standby notdeployed map3d navAll theater3d theaterMode… |
| COMMANDER | DASHBOARD | [Theatre map. Drag to pan, scroll to zoom] | `#t3Canvas` | LIVE | nShow: 1 -> 0; bodyLen: 6565 -> 5884; paneHtmlLen: 25317 -> 25340; focus: "pMark detAttr" -> "deckgl-overlay" |
| COMMANDER | DASHBOARD | *(no label)* | `#deckgl-overlay` | LIVE (re-test) | fresh-page re-test: paneHtmlLen: 25317 -> 25340; focus: "navOpen standby notdeployed navAll theaterMode theat… |
| COMMANDER | DASHBOARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 23114; focus: "deckgl-overlay" -> "pMark detAttr pmC" |
| COMMANDER | DASHBOARD | JOA CORAL LIVE 3d Marine Littoral Regiment ( | `#joaList` | LIVE | nShow: 1 -> 0; bodyLen: 6463 -> 5884; focus: "pMark detAttr pmC" -> "joaList" |
| COMMANDER | DASHBOARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 23114; focus: "joaList" -> "pMark detAttr pmC" |
| COMMANDER | DASHBOARD | Open picture | `button.mini` | LIVE | view: "DASHBOARD" -> "MISSION"; bodyClass: "navOpen standby notdeployed map3d navAll theater3d theaterMode" -… |
| COMMANDER | DASHBOARD | Deploy here → | `button.mini.ok` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 6715; focus: "navOpen standby notdeployed map3d navAll theater3d theaterMode"… |
| COMMANDER | DASHBOARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 23114; focus: "mini ok" -> "pMark detAttr pmC" |
| COMMANDER | DASHBOARD | Open picture | `button.mini` | LIVE | view: "DASHBOARD" -> "MISSION"; cx: 46 -> 39; cy: 59 -> 52; scenarioKey: "PACOM_CORAL" -> "PACOM_BASALT"; bas… |
| COMMANDER | DASHBOARD | Change operation → | `button.mini` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 6044 |
| COMMANDER | DASHBOARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 23114 |
| COMMANDER | DASHBOARD | Open picture | `button.mini` | LIVE | view: "DASHBOARD" -> "MISSION"; cx: 46 -> 52; cy: 59 -> 48; scenarioKey: "PACOM_CORAL" -> "PACOM_MARINER"; ba… |
| COMMANDER | DASHBOARD | Change operation → | `button.mini` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 6046 |
| COMMANDER | DASHBOARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 23114 |
| COMMANDER | DASHBOARD | Open picture | `button.mini` | LIVE | view: "DASHBOARD" -> "MISSION"; cx: 46 -> 59; cy: 59 -> 44; scenarioKey: "PACOM_CORAL" -> "PACOM_TIMBER"; bas… |
| COMMANDER | DASHBOARD | Change operation → | `button.mini` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 6044 |
| COMMANDER | DASHBOARD | − | `button.thZbtn` | LIVE | theaterView: {"k":1,"tx":0,"ty":0} -> {"k":1,"tx":12.782789057992755,"ty":10.879999999999999} |
| COMMANDER | DASHBOARD | + | `button.thZbtn` | LIVE | theaterView: {"k":1,"tx":12.782789057992755,"ty":10.879999999999999} -> {"k":1.6,"tx":20.452462492788406,"ty"… |
| COMMANDER | DASHBOARD | FIT | `button.thZbtn.wide` | LIVE | theaterView: {"k":1.6,"tx":20.452462492788406,"ty":17.407999999999987} -> {"k":1,"tx":0,"ty":0} |
| COMMANDER | DASHBOARD | Send the drones → | `#btnDeployTop` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 6715 |
| COMMANDER | DASHBOARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 23114 |
| COMMANDER | DASHBOARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 6463 -> 23114 |
| COMMANDER | DASHBOARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 6463 -> 23114 |
| COMMANDER | DASHBOARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 6463 -> 23114 |
| COMMANDER | DASHBOARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 23114 |
| COMMANDER | DASHBOARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 6463 -> 23114 |
| COMMANDER | DASHBOARD | Change operation → | `button.mini` | LIVE | bodyLen: 6463 -> 6044 |
| COMMANDER | DASHBOARD | Change operation → | `button.mini` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 6046 |
| COMMANDER | DASHBOARD | Change operation → | `button.mini` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 6044 |
| COMMANDER | DASHBOARD | Deploy here → | `button.mini.ok` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 6715 |
| COMMANDER | DASHBOARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 23114 |
| COMMANDER | DASHBOARD | Send the drones → | `#btnDeployEmpty` | LIVE | bodyLen: 6463 -> 6715 |
| COMMANDER | DASHBOARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5884 -> 23114 |
| COMMANDER | DASHBOARD | Armed | `#thArm` | LIVE | bodyLen: 5884 -> 5887; paneLen: 3587 -> 3590 |
| COMMANDER | DASHBOARD | Confirm first | `#thAuto` | LIVE | bodyLen: 5887 -> 5883; paneLen: 3590 -> 3586; paneHtmlLen: 25317 -> 25316 |
| COMMANDER | UNITS | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 4073 -> 21303; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark … |
| COMMANDER | UNITS | WHY THIS MATTERS | `button.kpiWhyBtn` | LIVE | nShow: 1 -> 0; nAriaExp: 3 -> 4; nHidden: 3 -> 2; nAriaExpF: 16 -> 15; bodyLen: 4735 -> 4270; paneLen: 1801 -… |
| COMMANDER | UNITS | Poll all units now | `#btnPingAll` | LIVE | nToast: 0 -> 1; bodyLen: 4270 -> 4305; paneLen: 1998 -> 1986; paneHtmlLen: 16540 -> 16530; focus: "kpiWhyBtn"… |
| COMMANDER | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4305 -> 21535; focus: "btnPingAll" -> "pMark detAttr pmC" |
| COMMANDER | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4884 -> 21535 |
| COMMANDER | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nToast: 1 -> 0; bodyLen: 4884 -> 21488 |
| COMMANDER | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4837 -> 21488 |
| COMMANDER | UNITS | On demand | `span.chip.on` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; bodyLen: 4837 -> 4319; focus: "pMark detAttr pmC" -> "navOpen standby notdeplo… |
| COMMANDER | UNITS | Every 5 min | `span.chip` | LIVE | nToast: 1 -> 2; bodyLen: 4319 -> 4388 |
| COMMANDER | UNITS | Every 10 min | `span.chip` | LIVE | nToast: 2 -> 3; bodyLen: 4388 -> 4458 |
| COMMANDER | UNITS | Every 20 min | `span.chip` | LIVE | bodyLen: 4458 -> 4467 |
| COMMANDER | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4467 -> 21697; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark … |
| COMMANDER | UNITS | Poll health status | `button.mini.ping` | LIVE | nShow: 1 -> 0; bodyLen: 5046 -> 4443; focus: "pMark detAttr pmC" -> "mini ping" |
| COMMANDER | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; nToast: 3 -> 2; bodyLen: 4443 -> 21603; focus: "mini ping" -> "pMark detAttr pmC" |
| COMMANDER | UNITS | Poll health status | `button.mini.ping` | LIVE | nShow: 1 -> 0; bodyLen: 4952 -> 4348; focus: "pMark detAttr pmC" -> "mini ping" |
| COMMANDER | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4348 -> 21578; focus: "mini ping" -> "pMark detAttr pmC" |
| COMMANDER | UNITS | Poll health status | `button.mini.ping` | LIVE | nShow: 1 -> 0; bodyLen: 4927 -> 4348; focus: "pMark detAttr pmC" -> "mini ping" |
| COMMANDER | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4348 -> 21578; focus: "mini ping" -> "pMark detAttr pmC" |
| COMMANDER | UNITS | Poll health status | `button.mini.ping` | LIVE | nShow: 1 -> 0; nToast: 1 -> 2; bodyLen: 4882 -> 4348; focus: "pMark detAttr pmC" -> "mini ping" |
| COMMANDER | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4348 -> 21578; focus: "mini ping" -> "pMark detAttr pmC" |
| COMMANDER | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4882 -> 21533 |
| COMMANDER | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4923 -> 21533 |
| COMMANDER | STREAM | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 2998 -> 20228; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark … |
| COMMANDER | STREAM | WHY THIS MATTERS | `button.kpiWhyBtn` | LIVE | nShow: 1 -> 0; nAriaExp: 4 -> 5; nHidden: 3 -> 2; nAriaExpF: 16 -> 15; bodyLen: 3667 -> 3160; paneLen: 730 ->… |
| COMMANDER | STREAM | All | `button.seg.on` | NOOP-already-selected | focus: "kpiWhyBtn" -> "seg on" |
| COMMANDER | STREAM | Deliveries | `button.seg` | LIVE (re-test) | fresh-page re-test: classSig,paneSig |
| COMMANDER | STREAM | Failures | `button.seg` | LIVE (re-test) | fresh-page re-test: classSig,paneSig |
| COMMANDER | STREAM | Received late | `button.seg` | LIVE (re-test) | fresh-page re-test: classSig,paneSig |
| COMMANDER | STREAM | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 3160 -> 20390; focus: "seg on" -> "pMark detAttr" |
| COMMANDER | STREAM | Export CSV | `#btnExportStream` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; bodyLen: 3866 -> 3220; focus: "pMark detAttr" -> "btnExportStream" |
| COMMANDER | STREAM | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3220 -> 20450; focus: "btnExportStream" -> "pMark detAttr pmC" |
| COMMANDER | STREAM | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3799 -> 20450 |
| COMMANDER | STREAM | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3799 -> 20450 |
| COMMANDER | STREAM | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3739 -> 20390 |
| COMMANDER | STREAM | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3739 -> 20390 |
| COMMANDER | FLOW | NOT AI ARITHMETIC | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 2992 -> 20222; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark … |
| COMMANDER | FLOW | WHY THIS MATTERS | `button.kpiWhyBtn` | LIVE | nShow: 1 -> 0; nAriaExp: 5 -> 6; nHidden: 3 -> 2; nAriaExpF: 16 -> 15; bodyLen: 3567 -> 3280; paneLen: 730 ->… |
| COMMANDER | FLOW | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3280 -> 20510; focus: "kpiWhyBtn" -> "pMark detAttr pmC" |
| COMMANDER | FLOW | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3859 -> 20510 |
| COMMANDER | FLOW | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3859 -> 20517; paneLen: 1018 -> 1025; paneHtmlLen: 6544 -> 7314 |
| COMMANDER | FLOW | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3859 -> 20510 |
| COMMANDER | FLOW | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3859 -> 20510 |
| COMMANDER | FLOW | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3859 -> 20510 |
| COMMANDER | AUDIT | NOT AI HASH CHAIN | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 3038 -> 20268; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark … |
| COMMANDER | AUDIT | WHY THIS MATTERS | `button.kpiWhyBtn` | LIVE | nShow: 1 -> 0; nAriaExp: 6 -> 7; nHidden: 3 -> 2; nAriaExpF: 16 -> 15; bodyLen: 3675 -> 3077; paneLen: 777 ->… |
| COMMANDER | AUDIT | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3077 -> 20314; paneLen: 816 -> 823; paneHtmlLen: 7033 -> 7864; focus: "kpiWhyBtn" -> … |
| COMMANDER | AUDIT | Export CSV | `#btnExportAudit` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; bodyLen: 3655 -> 3108; focus: "pMark detAttr pmC" -> "btnExportAudit" |
| COMMANDER | AUDIT | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3108 -> 20338; focus: "btnExportAudit" -> "pMark detAttr pmC" |
| COMMANDER | AUDIT | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3686 -> 20338 |
| COMMANDER | AUDIT | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3686 -> 20338 |
| COMMANDER | AUDIT | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3721 -> 20307 |
| COMMANDER | AUDIT | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3717 -> 20314; paneLen: 816 -> 823; paneHtmlLen: 7033 -> 7864 |
| COMMANDER | SENSOR | AI: CRI-Net · Predicts collapse | `span.pMark.aiAttr` | LIVE | nShow: 0 -> 1; bodyLen: 4848 -> 22071; paneLen: 2584 -> 2577; paneHtmlLen: 15705 -> 14973; focus: "navOpen st… |
| COMMANDER | SENSOR | WHY THIS MATTERS | `button.kpiWhyBtn` | LIVE | nShow: 1 -> 0; nAriaExp: 7 -> 8; nHidden: 3 -> 2; nAriaExpF: 16 -> 15; bodyLen: 5508 -> 5157; paneLen: 2584 -… |
| COMMANDER | SENSOR | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5157 -> 22394; paneLen: 2893 -> 2900; paneHtmlLen: 15923 -> 16655; focus: "kpiWhyBtn"… |
| COMMANDER | SENSOR | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 5823 -> 22387 |
| COMMANDER | SENSOR | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 5830 -> 22387; paneLen: 2900 -> 2893; paneHtmlLen: 16655 -> 15923 |
| COMMANDER | SENSOR | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 5823 -> 22394; paneLen: 2893 -> 2900; paneHtmlLen: 15923 -> 16655 |
| COMMANDER | SENSOR | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 5884 -> 5779; paneLen: 2954 -> 2947; paneHtmlLen: 16711 -> 15979; focus: "pMark detAttr pmC" -> "nav… |
| COMMANDER | SENSOR | AI: CRI-Net · Predicts collapse | `span.pMark.aiAttr` | LIVE | bodyLen: 5721 -> 22394; paneLen: 2889 -> 2900; paneHtmlLen: 15919 -> 16655; focus: "navOpen standby notdeploy… |
| COMMANDER | SENSOR | Stable | `span.chip` | LIVE | bodyLen: 5165 -> 5132; paneLen: 2901 -> 2868; paneHtmlLen: 16656 -> 16623; focus: "pMark aiAttr" -> "navOpen … |
| COMMANDER | SENSOR | Slow bleed | `span.chip.on` | ERROR | vanished before press |
| COMMANDER | SENSOR | Arterial bleed | `span.chip` | LIVE | bodyLen: 5186 -> 5196; paneLen: 2922 -> 2932; paneHtmlLen: 16689 -> 16699 |
| COMMANDER | SENSOR | Blood given at T+6 | `span.chip` | LIVE | bodyLen: 5135 -> 5138; paneLen: 2871 -> 2874; paneHtmlLen: 15911 -> 16639 |
| COMMANDER | SENSOR | Clean signal | `span.chip.on` | NOOP-already-selected | — |
| COMMANDER | SENSOR | Casualty moving | `span.chip` | LIVE (re-test) | fresh-page re-test: classSig,attrSig,paneSig,bodyLen,paneLen,paneHtmlLen |
| COMMANDER | SENSOR | Poor perfusion | `span.chip` | LIVE | bodyLen: 5140 -> 5186; paneLen: 2876 -> 2922; paneHtmlLen: 16629 -> 16678 |
| COMMANDER | SENSOR | Electrical noise | `span.chip` | LIVE (re-test) | fresh-page re-test: classSig,attrSig,paneSig,bodyLen,paneLen,paneHtmlLen |
| COMMANDER | SENSOR | Sensor off skin | `span.chip` | LIVE | bodyLen: 5179 -> 5186; paneLen: 2915 -> 2922; paneHtmlLen: 15946 -> 16678 |
| COMMANDER | SENSOR | AI: CRI-Net · Predicts collapse | `span.pMark.aiAttr` | LIVE | nShow: 0 -> 1; bodyLen: 5186 -> 22409; paneLen: 2922 -> 2915; paneHtmlLen: 16678 -> 15946; focus: "navOpen st… |
| COMMANDER | SENSOR | AI: CRI-Net · Predicts collapse | `span.pMark.aiAttr` | LIVE | bodyLen: 5706 -> 22428; paneLen: 2876 -> 2934; paneHtmlLen: 16639 -> 16689 |
| COMMANDER | SENSOR | AI: CRI-Net · Predicts collapse | `span.pMark.aiAttr` | LIVE | bodyLen: 5706 -> 22370 |
| COMMANDER | SENSOR | AI: CRI-Net · Refuses when unsure | `span.pMark.aiAttr` | LIVE | bodyLen: 5706 -> 22363; paneLen: 2876 -> 2869; paneHtmlLen: 16639 -> 15897 |
| COMMANDER | DOCTRINE | AI: MiniLM · Quotes doctrine | `span.pMark.aiAttr` | LIVE | nShow: 0 -> 1; bodyLen: 8419 -> 25649; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark … |
| COMMANDER | DOCTRINE | WHY THIS MATTERS | `button.kpiWhyBtn` | LIVE | nShow: 1 -> 0; nAriaExp: 8 -> 9; nHidden: 3 -> 2; nAriaExpF: 16 -> 15; bodyLen: 9027 -> 8776; paneLen: 6151 -… |
| COMMANDER | DOCTRINE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 8776 -> 25995; paneLen: 6508 -> 6497; paneHtmlLen: 21055 -> 20213; focus: "kpiWhyBtn"… |
| COMMANDER | DOCTRINE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 9355 -> 26006; paneLen: 6497 -> 6508; paneHtmlLen: 20213 -> 21055 |
| COMMANDER | DOCTRINE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 9355 -> 25995 |
| COMMANDER | DOCTRINE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 9355 -> 25995 |
| COMMANDER | DOCTRINE | Search | `#docGo` | LIVE | nShow: 1 -> 0; bodyLen: 9355 -> 8767; paneLen: 6497 -> 6499; paneHtmlLen: 20213 -> 20215; focus: "pMark detAt… |
| COMMANDER | DOCTRINE | How long can whole blood stay out of refrige | `span.chip` | LIVE (re-test) | fresh-page re-test: bodyLen: 8123 -> 8125; paneLen: 6151 -> 6153; paneHtmlLen: 20236 -> 20238 |
| COMMANDER | DOCTRINE | What is the MARCH sequence? | `span.chip` | LIVE | bodyLen: 8767 -> 8745; paneLen: 6499 -> 6477; paneHtmlLen: 20215 -> 20181 |
| COMMANDER | DOCTRINE | When is a casualty categorised URGENT? | `span.chip` | LIVE | bodyLen: 8745 -> 8428; paneLen: 6477 -> 6160; paneHtmlLen: 20181 -> 19852 |
| COMMANDER | DOCTRINE | Can I convert a tourniquet after two hours? | `span.chip` | LIVE | bodyLen: 8428 -> 8577; paneLen: 6160 -> 6309; paneHtmlLen: 19852 -> 20001 |
| COMMANDER | DOCTRINE | How long after wounding can TXA still be giv | `span.chip` | LIVE | bodyLen: 8577 -> 8552; paneLen: 6309 -> 6284; paneHtmlLen: 20001 -> 20831 |
| COMMANDER | DOCTRINE | What is the Golden Hour policy and where did | `span.chip` | LIVE | bodyLen: 8541 -> 8868; paneLen: 6273 -> 6600; paneHtmlLen: 19989 -> 20304 |
| COMMANDER | DOCTRINE | What can a Role 2 do that a Role 1 cannot? | `span.chip` | LIVE | bodyLen: 8868 -> 8587; paneLen: 6600 -> 6319; paneHtmlLen: 20304 -> 20011 |
| COMMANDER | DOCTRINE | Can an unmanned aircraft carry blood forward | `span.chip` | LIVE | bodyLen: 8587 -> 8944; paneLen: 6319 -> 6676; paneHtmlLen: 20011 -> 20380 |
| COMMANDER | DOCTRINE | What is prolonged casualty care when evacuat | `span.chip` | LIVE | bodyLen: 8944 -> 8642; paneLen: 6676 -> 6374; paneHtmlLen: 20380 -> 20897 |
| COMMANDER | DOCTRINE | AI: MiniLM · Quotes doctrine | `span.pMark.aiAttr` | LIVE | nShow: 0 -> 1; bodyLen: 8631 -> 9284 |
| COMMANDER | DOCTRINE | AI: MiniLM · Quotes doctrine | `span.pMark.aiAttr` | LIVE | bodyLen: 9284 -> 25861; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark aiAttr" |
| COMMANDER | DOCTRINE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 8631 -> 25872; paneLen: 6363 -> 6374; paneHtmlLen: 20055 -> 20897; focus: "pMark aiAt… |
| COMMANDER | DOCTRINE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 9221 -> 25872; paneLen: 6363 -> 6374; paneHtmlLen: 20055 -> 20897 |
| COMMANDER | DOCTRINE | AI: MiniLM | `span.pMark.aiAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 8631 -> 25861; focus: "pMark detAttr pmC" -> "pMark aiAttr pmC" |
| COMMANDER | QUERY | NOT AI YOUR QUERY | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 7700 -> 24930; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark … |
| COMMANDER | QUERY | WHY THIS MATTERS | `button.kpiWhyBtn` | LIVE | nShow: 1 -> 0; nAriaExp: 9 -> 10; nHidden: 3 -> 2; nAriaExpF: 16 -> 15; bodyLen: 8224 -> 7921; paneLen: 5433 … |
| COMMANDER | QUERY | Reload from mission | `#q2Reload` | LIVE (re-test) | fresh-page re-test: paneSig |
| COMMANDER | QUERY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 7921 -> 25151; focus: "q2Reload" -> "pMark detAttr pmC" |
| COMMANDER | QUERY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 8508 -> 25151 |
| COMMANDER | QUERY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 8508 -> 25151 |
| COMMANDER | QUERY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 8508 -> 25151 |
| COMMANDER | QUERY | Who died, and by how much window function | `button.q2Preset` | LIVE | nShow: 1 -> 0; bodyLen: 8508 -> 8370; paneLen: 5654 -> 6103; paneHtmlLen: 32281 -> 34483; focus: "pMark detAt… |
| COMMANDER | QUERY | Median and 90th percentile quantile_cont + P | `button.q2Preset` | LIVE | bodyLen: 8370 -> 8071; paneLen: 6103 -> 5804; paneHtmlLen: 34483 -> 32812 |
| COMMANDER | QUERY | State at the moment of delivery ASOF JOIN | `button.q2Preset.hero.on` | ERROR | vanished before press |
| COMMANDER | QUERY | The binding constraint QUALIFY + ROW_NUMBER | `button.q2Preset` | LIVE | bodyLen: 8071 -> 7963; paneLen: 5804 -> 5696; paneHtmlLen: 32812 -> 32544 |
| COMMANDER | QUERY | Where the reserve fell away LAG + QUALIFY | `button.q2Preset` | LIVE | bodyLen: 7963 -> 7629; paneLen: 5696 -> 5362; paneHtmlLen: 32544 -> 32005 |
| COMMANDER | QUERY | Deaths against the clock running total | `button.q2Preset` | LIVE | bodyLen: 7629 -> 7529; paneLen: 5362 -> 5262; paneHtmlLen: 32005 -> 30819 |
| COMMANDER | QUERY | What the allocator believed decision record | `button.q2Preset` | LIVE | bodyLen: 7529 -> 7850; paneLen: 5262 -> 5583; paneHtmlLen: 30819 -> 31721 |
| COMMANDER | QUERY | What is in here row counts | `button.q2Preset` | LIVE | bodyLen: 7850 -> 7639; paneLen: 5583 -> 5372; paneHtmlLen: 31721 -> 32376 |
| COMMANDER | QUERY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 7639 -> 24869; focus: "q2Preset on" -> "pMark detAttr pmC" |
| COMMANDER | QUERY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 8196 -> 24869 |
| COMMANDER | QUERY | Run | `#q2Run` | LIVE (re-test) | fresh-page re-test: bodyLen: 7304 -> 7404; paneLen: 5333 -> 5433; paneHtmlLen: 32006 -> 32304 |
| COMMANDER | QUERY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 7639 -> 24869; focus: "q2Run" -> "pMark detAttr pmC" |
| COMMANDER | DATA | NOT AI ARITHMETIC | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 3920 -> 21150; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark … |
| COMMANDER | DATA | WHY THIS MATTERS | `button.kpiWhyBtn` | LIVE | nShow: 1 -> 0; nAriaExp: 10 -> 11; nHidden: 3 -> 2; nAriaExpF: 16 -> 15; bodyLen: 4498 -> 4297; paneLen: 1651… |
| COMMANDER | DATA | Export .sqlite | `#btnDbExport` | LIVE | nToast: 0 -> 1; bodyLen: 4297 -> 4427; paneLen: 2028 -> 2090; paneHtmlLen: 7895 -> 8769; focus: "kpiWhyBtn" -… |
| COMMANDER | DATA | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4427 -> 21657; focus: "btnDbExport" -> "pMark detAttr pmC" |
| COMMANDER | DATA | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 5008 -> 21657 |
| COMMANDER | DATA | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 5008 -> 21657 |
| COMMANDER | DATA | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4940 -> 21589 |
| COMMANDER | DATA | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4940 -> 21589 |
| COMMANDER | SETTINGS | NOT AI WRITTEN RULE | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 5063 -> 22293; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark … |
| COMMANDER | SETTINGS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 5674 -> 22293; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| COMMANDER | SETTINGS | Enabled | `#hitlToggle` | LIVE | nShow: 1 -> 0; nOn: 38 -> 37; nToast: 0 -> 1; bodyLen: 5684 -> 5125; paneLen: 2805 -> 2808; focus: "pMark det… |
| COMMANDER | SETTINGS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5125 -> 22355; focus: "navOpen standby notdeployed map3d navAll theater3d" -> "pMark … |
| COMMANDER | SETTINGS | Fair | `span.chip.on[data-mode="fair"]` | LIVE | nShow: 1 -> 0; bodyLen: 5746 -> 5125; focus: "pMark detAttr pmC" -> "navOpen standby notdeployed map3d navAll… |
| COMMANDER | SETTINGS | Realistic | `span.chip[data-mode="realistic"]` | LIVE | mode: "fair" -> "realistic" |
| COMMANDER | SETTINGS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5063 -> 25097 |
| COMMANDER | SETTINGS | Enabled | `#tmToggle` | LIVE | nShow: 1 -> 0; bodyLen: 5684 -> 5064; paneLen: 2805 -> 2806; paneHtmlLen: 10736 -> 10734 |
| COMMANDER | SETTINGS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5064 -> 25098 |
| COMMANDER | SETTINGS | Rifleman | `span.chip.role` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; bodyLen: 5685 -> 5124; paneHtmlLen: 10734 -> 10737 |
| COMMANDER | SETTINGS | Team leader | `span.chip.role` | LIVE | nToast: 1 -> 2; bodyLen: 5124 -> 5187; paneHtmlLen: 10737 -> 10740 |
| COMMANDER | SETTINGS | Combat medic | `span.chip.role` | LIVE | nToast: 2 -> 3; bodyLen: 5187 -> 5251; paneHtmlLen: 10740 -> 10743 |
| COMMANDER | SETTINGS | JTAC | `span.chip.role` | LIVE | bodyLen: 5251 -> 5247; paneHtmlLen: 10743 -> 10746 |
| COMMANDER | SETTINGS | EOD technician | `span.chip.role` | LIVE | bodyLen: 5247 -> 5250; paneHtmlLen: 10746 -> 10749 |
| COMMANDER | SETTINGS | Signals / RTO | `span.chip.role` | LIVE | bodyLen: 5250 -> 5251; paneHtmlLen: 10749 -> 10752 |
| COMMANDER | SETTINGS | UAS operator | `span.chip.role` | LIVE | bodyLen: 5251 -> 5259; paneHtmlLen: 10752 -> 10755 |
| COMMANDER | SETTINGS | Combat engineer | `span.chip.role` | LIVE | bodyLen: 5259 -> 5260; paneHtmlLen: 10755 -> 10758 |
| COMMANDER | SETTINGS | Linguist | `span.chip.role` | LIVE | bodyLen: 5260 -> 5255; paneHtmlLen: 10758 -> 10761 |
| COMMANDER | SETTINGS | Aircrew | `span.chip.role` | LIVE | bodyLen: 5255 -> 5250; paneHtmlLen: 10761 -> 10764 |
| COMMANDER | SETTINGS | Sniper / recon | `span.chip.role` | LIVE | bodyLen: 5250 -> 5249; paneHtmlLen: 10764 -> 10767 |
| COMMANDER | SETTINGS | Clear all | `#btnClearHva` | LIVE | bodyLen: 5249 -> 5248; paneHtmlLen: 10767 -> 10734 |
| COMMANDER | SETTINGS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5248 -> 25282 |
| COMMANDER | SETTINGS | PACOM | `span.chip.on[data-theaterpick="PACOM"]` | LIVE | view: "SETTINGS" -> "DASHBOARD"; nShow: 1 -> 0; nToast: 2 -> 1; toolLen: 191 -> 186; bodyLen: 5810 -> 5943; p… |
| COMMANDER | SETTINGS | EUCOM | `span.chip[data-theaterpick="EUCOM"]` | LIVE | view: "SETTINGS" -> "DASHBOARD"; toolLen: 191 -> 186; bodyLen: 5064 -> 5610; paneLen: 2806 -> 3313; paneHtmlL… |
| COMMANDER | SETTINGS | Single | `span.chip.on[data-mapview="COP"]` | NOOP-already-selected | — |
| COMMANDER | SETTINGS | Side by side | `span.chip[data-mapview="COMPARE"]` | LIVE | mapView: "COP" -> "COMPARE" |
| LOGISTICIAN | GLOBAL@DECIDE | ANGEL SWARM v3.5 | `#btnHome` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| LOGISTICIAN | GLOBAL@DECIDE | JOA CORAL ▾ | `#btnOpPick` | LIVE | bodyClass: "navOpen standby notdeployed" -> "navOpen standby notdeployed opPickOpen"; nAriaExp: 3 -> 4; nHidd… |
| LOGISTICIAN | GLOBAL@DECIDE | Deploy → | `#btnDeployBar` | LIVE | nShow: 0 -> 1; nOn: 30 -> 33; bodyLen: 5997 -> 6828; focus: "btnOpPick" -> "btnDeployBar" |
| LOGISTICIAN | GLOBAL@DECIDE | COMMANDER | `span.chip[data-roleset="COMMANDER"]` | LIVE | role: "LOGISTICIAN" -> "COMMANDER"; bodyAttrs: "LOGISTICIAN\|console-dark" -> "COMMANDER\|console-dark"; nOn: 3… |
| LOGISTICIAN | GLOBAL@DECIDE | LOGISTICIAN | `span.chip.on[data-roleset="LOGISTICIAN"]` | NOOP-already-selected | focus: "chip" -> "chip on" |
| LOGISTICIAN | GLOBAL@DECIDE | SURGEON | `span.chip[data-roleset="SURGEON"]` | LIVE | role: "LOGISTICIAN" -> "SURGEON"; bodyAttrs: "LOGISTICIAN\|console-dark" -> "SURGEON\|console-dark"; inspLen: 7… |
| LOGISTICIAN | GLOBAL@DECIDE | ANALYST | `span.chip[data-roleset="ANALYST"]` | LIVE | role: "LOGISTICIAN" -> "ANALYST"; bodyAttrs: "LOGISTICIAN\|console-dark" -> "ANALYST\|console-dark"; cmdLen: 12… |
| LOGISTICIAN | GLOBAL@DECIDE | Console dark | `#btnTheme` | LIVE | nShow: 0 -> 1; nOn: 33 -> 35; nAriaExp: 3 -> 4; nHidden: 2 -> 1; cmdLen: 122 -> 478; nAriaExpF: 17 -> 16; bod… |
| LOGISTICIAN | GLOBAL@DECIDE | [Back to the theater overview] | `#btnBackTheater` | LIVE | view: "DECIDE" -> "DASHBOARD"; bodyClass: "navOpen standby notdeployed" -> "navOpen standby notdeployed theat… |
| LOGISTICIAN | GLOBAL@DECIDE | − | `#btnZoomOut` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| LOGISTICIAN | GLOBAL@DECIDE | 1.0× | `#zoomLabel` | NOT-A-CONTROL | — |
| LOGISTICIAN | GLOBAL@DECIDE | + | `#btnZoomIn` | LIVE | zoom: 1 -> 1.5 |
| LOGISTICIAN | GLOBAL@DECIDE | Fit | `#btnZoomFit` | LIVE | zoom: 1.5 -> 1 |
| LOGISTICIAN | GLOBAL@DECIDE | Single | `span.chip.on[data-mapview="COP"]` | NOOP-already-selected | — |
| LOGISTICIAN | GLOBAL@DECIDE | Side by side | `span.chip[data-mapview="COMPARE"]` | LIVE | mapView: "COP" -> "COMPARE"; nOn: 34 -> 35 |
| LOGISTICIAN | GLOBAL@DECIDE | Theatre | `span.chip[data-mapscope="THEATRE"]` | LIVE | view: "DECIDE" -> "DASHBOARD"; bodyClass: "navOpen standby notdeployed theater3d" -> "navOpen standby notdepl… |
| LOGISTICIAN | GLOBAL@DECIDE | Tactical | `span.chip[data-mapscope="2D"]` | LIVE | view: "DECIDE" -> "MISSION"; bodyClass: "navOpen standby notdeployed theater3d" -> "navOpen standby notdeploy… |
| LOGISTICIAN | GLOBAL@DECIDE | Tactical 3D | `span.chip[data-mapscope="3D"]` | LIVE | view: "DECIDE" -> "MISSION"; mapMode: "2D" -> "3D"; bodyClass: "navOpen standby notdeployed theater3d compare… |
| LOGISTICIAN | GLOBAL@DECIDE | V | `span.chip.mmKey` | NOT-A-CONTROL | — |
| LOGISTICIAN | GLOBAL@DECIDE | e.g. CAS-084 · LP 2 KILO · blood ⌘K | `#btnSearch` | LIVE | nShow: 0 -> 1; nSelected: 0 -> 1; bodyLen: 5997 -> 6471 |
| LOGISTICIAN | GLOBAL@DECIDE | {Reset run (R)} | `#btnReset` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| LOGISTICIAN | GLOBAL@DECIDE | ▶ | `#btnPlay` | LIVE | running: false -> true; nOn: 30 -> 31; inspHtmlLen: 3659 -> 3660; toolLen: 191 -> 190; bodyLen: 5997 -> 6143;… |
| LOGISTICIAN | GLOBAL@DECIDE | 1× | `span.chip[data-speed="1"]` | LIVE | speed: 2 -> 1 |
| LOGISTICIAN | GLOBAL@DECIDE | 2× | `span.chip.on[data-speed="2"]` | NOOP-already-selected | — |
| LOGISTICIAN | GLOBAL@DECIDE | 4× | `span.chip[data-speed="4"]` | LIVE | speed: 2 -> 4 |
| LOGISTICIAN | GLOBAL@DECIDE | 10× | `span.chip[data-speed="10"]` | LIVE | speed: 2 -> 10 |
| LOGISTICIAN | GLOBAL@DECIDE | INGEST OFF | `#ingestChip` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| LOGISTICIAN | GLOBAL@DECIDE | Overview | `a.navItem.big.on[data-view="DECIDE"]` | NOOP-already-selected | — |
| LOGISTICIAN | GLOBAL@DECIDE | Map | `a.navItem.big[data-view="MISSION"]` | LIVE | view: "DECIDE" -> "MISSION"; nOpen: 0 -> 1; nOn: 30 -> 44; nAriaPress: 0 -> 9; toolLen: 191 -> 186; nAriaExpF… |
| LOGISTICIAN | GLOBAL@DECIDE | Casualties | `a.navItem.big[data-view="CASUALTIES"]` | LIVE | view: "DECIDE" -> "CASUALTIES"; toolLen: 191 -> 193; nAriaExpF: 16 -> 19; bodyLen: 5997 -> 3292; paneLen: 440… |
| LOGISTICIAN | GLOBAL@DECIDE | Aircraft | `a.navItem.big[data-view="FLEET"]` | LIVE | view: "DECIDE" -> "FLEET"; nAriaExpF: 19 -> 22; bodyLen: 5997 -> 3494; paneLen: 4401 -> 1898; paneHtmlLen: 25… |
| LOGISTICIAN | GLOBAL@DECIDE | Launch points | `a.navItem.big[data-view="LAUNCHPOINTS"]` | LIVE | view: "DECIDE" -> "LAUNCHPOINTS"; toolLen: 191 -> 196; nAriaExpF: 22 -> 25; bodyLen: 5997 -> 2761; paneLen: 4… |
| LOGISTICIAN | GLOBAL@DECIDE | Supplies | `a.navItem.big[data-view="SUPPLY"]` | LIVE | view: "DECIDE" -> "SUPPLY"; nAriaExpF: 25 -> 28; bodyLen: 5997 -> 4493; paneLen: 4401 -> 2898; paneHtmlLen: 2… |
| LOGISTICIAN | GLOBAL@DECIDE | Approvals | `a.navItem.big[data-view="TASKING"]` | LIVE | view: "DECIDE" -> "TASKING"; toolLen: 191 -> 192; nAriaExpF: 28 -> 31; bodyLen: 5997 -> 2843; paneLen: 4401 -… |
| LOGISTICIAN | GLOBAL@DECIDE | Scenarios | `a.navItem.big[data-view="CONFIDENCE"]` | LIVE | view: "DECIDE" -> "CONFIDENCE"; nOn: 40 -> 41; toolLen: 191 -> 192; bodyLen: 5997 -> 4513; paneLen: 4401 -> 2… |
| LOGISTICIAN | GLOBAL@DECIDE | After-action report | `a.navItem.big[data-view="AFTERACTION"]` | LIVE | view: "DECIDE" -> "AFTERACTION"; toolLen: 191 -> 202; bodyLen: 5997 -> 5025; paneLen: 4401 -> 3419; paneHtmlL… |
| LOGISTICIAN | GLOBAL@DECIDE | Show every destination | `#btnNavAll` | LIVE | nOn: 40 -> 41; nAriaPress: 9 -> 10; railLen: 157 -> 446; nAriaPressF: 1 -> 0; bodyLen: 5997 -> 6286 |
| LOGISTICIAN | GLOBAL@DECIDE | Search everything | `#btnPalette` | LIVE | nShow: 0 -> 1; nSelected: 0 -> 1; railLen: 446 -> 449; bodyLen: 6286 -> 6760 |
| LOGISTICIAN | GLOBAL@DECIDE | ◍ Sound off | `#audBtn` | LIVE | nOn: 41 -> 42; railLen: 449 -> 454; bodyLen: 6289 -> 6294 |
| LOGISTICIAN | GLOBAL@DECIDE | Settings | `a.navItem[data-view="SETTINGS"]` | LIVE | view: "DECIDE" -> "SETTINGS"; bodyLen: 6294 -> 4698; paneLen: 4401 -> 2805; paneHtmlLen: 25634 -> 10736 |
| LOGISTICIAN | GLOBAL@DECIDE | [Previous] | `button.nsp-tb` | NOOP-disabled | — |
| LOGISTICIAN | GLOBAL@DECIDE | [Run or pause] | `button.nsp-tb.hi` | LIVE | running: false -> true; nOn: 42 -> 43; inspHtmlLen: 3659 -> 3660; toolLen: 191 -> 190; bodyLen: 6294 -> 6440;… |
| LOGISTICIAN | GLOBAL@DECIDE | [Next] | `button.nsp-tb` | NOOP-disabled | — |
| LOGISTICIAN | GLOBAL@DECIDE | RUN SUMMARY | `div.nsp-sec` | LIVE | nAriaExp: 3 -> 2; inspLen: 732 -> 291; inspHtmlLen: 3659 -> 2214; nAriaExpF: 31 -> 32; nShut: 0 -> 1; bodyLen… |
| LOGISTICIAN | GLOBAL@DECIDE | LATEST EVENTS | `div.nsp-sec` | LIVE | nAriaExp: 2 -> 1; inspLen: 291 -> 243; inspHtmlLen: 2214 -> 2080; nAriaExpF: 32 -> 33; nShut: 1 -> 2; bodyLen… |
| LOGISTICIAN | GLOBAL@DECIDE | TAGS | `div.nsp-sec` | LIVE | nAriaExp: 1 -> 0; inspLen: 243 -> 191; inspHtmlLen: 2080 -> 1786; nAriaExpF: 33 -> 34; nShut: 2 -> 3; bodyLen… |
| LOGISTICIAN | GLOBAL@DECIDE | Theatre map | `button.ri` | LIVE | view: "DECIDE" -> "DASHBOARD"; nOn: 42 -> 46; toolLen: 191 -> 186; nAriaExpF: 34 -> 35; bodyLen: 5899 -> 3773… |
| LOGISTICIAN | GLOBAL@DECIDE | Tactical map | `button.ri` | LIVE | view: "DECIDE" -> "MISSION"; nOn: 42 -> 46; toolLen: 191 -> 186; bodyLen: 5899 -> 1758; paneLen: 4547 -> 316;… |
| LOGISTICIAN | GLOBAL@DECIDE | Tactical map, 3D | `button.ri` | LIVE | view: "DECIDE" -> "MISSION"; nOn: 42 -> 47; toolLen: 191 -> 186; bodyLen: 5899 -> 2791; paneLen: 4547 -> 1373… |
| LOGISTICIAN | GLOBAL@DECIDE | Approvals awaiting a human | `button.ri[data-act="approvals"]` | LIVE | view: "DECIDE" -> "TASKING"; toolLen: 191 -> 192; bodyLen: 5899 -> 2599; paneLen: 4547 -> 1246; paneHtmlLen: … |
| LOGISTICIAN | GLOBAL@DECIDE | Keyboard shortcuts (?) | `button.ri[data-act="keys"]` | LIVE | nShow: 0 -> 1 |
| LOGISTICIAN | GLOBAL@MISSION | Tactical 3D | `span.chip.on[data-mapscope="3D"]` | NOOP-already-selected | focus: "ri" -> "chip on" |
| LOGISTICIAN | GLOBAL@MISSION | Overview | `a.navItem.big[data-view="DECIDE"]` | LIVE | view: "MISSION" -> "DECIDE"; nOn: 44 -> 40; toolLen: 186 -> 191; bodyLen: 2555 -> 5456; paneLen: 1434 -> 4401… |
| LOGISTICIAN | GLOBAL@MISSION | Map | `a.navItem.big.on[data-view="MISSION"]` | NOOP-already-selected | — |
| LOGISTICIAN | GLOBAL@MISSION | Map layers | `button.ri.on[data-act="legend"]` | LIVE | nOn: 44 -> 43; bodyLen: 2555 -> 1752; paneLen: 1434 -> 631; paneHtmlLen: 52598 -> 52605; focus: "navOpen stan… |
| LOGISTICIAN | GLOBAL@MISSION | Draw every layer | `button.ri[data-act="layersAll"]` | LIVE | nOn: 43 -> 34; nAriaPress: 9 -> 0; nAriaPressF: 1 -> 10; bodyLen: 1752 -> 1751; paneLen: 631 -> 630; paneHtml… |
| LOGISTICIAN | GLOBAL@MISSION | Fit the area of operations | `button.ri[data-act="fit"]` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| LOGISTICIAN | GLOBAL@MISSION | Zoom in | `button.ri[data-act="zoomIn"]` | LIVE | paneHtmlLen: 52587 -> 52588 |
| LOGISTICIAN | GLOBAL@MISSION | Zoom out | `button.ri[data-act="zoomOut"]` | LIVE | paneHtmlLen: 52588 -> 52587 |
| LOGISTICIAN | GLOBAL@MISSION | Tactical map, 3D | `button.ri.on` | NOOP-already-selected | focus: "ri" -> "ri on" |
| LOGISTICIAN | DASHBOARD | show the theatre picture | `button.lqMore[data-lq="fold"]` | LIVE | nAriaExp: 0 -> 1; nAriaExpF: 20 -> 19; bodyLen: 3476 -> 6908; paneLen: 2382 -> 5814; paneHtmlLen: 23185 -> 37… |
| LOGISTICIAN | DASHBOARD | Send the drones → | `button.btn.ok[data-deploy="1"]` | LIVE | nShow: 0 -> 1; nOn: 34 -> 37; bodyLen: 6908 -> 7739; focus: "navOpen standby notdeployed map3d theaterMode th… |
| LOGISTICIAN | DASHBOARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 6908 -> 26942; focus: "btn ok" -> "pMark detAttr pmC" |
| LOGISTICIAN | DASHBOARD | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | bodyLen: 7487 -> 26942; focus: "pMark detAttr pmC" -> "pMark detAttr" |
| LOGISTICIAN | DASHBOARD | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 7644 -> 26942; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| LOGISTICIAN | DASHBOARD | NOT AI ARITHMETIC | `span.pMark.detAttr` | LIVE | bodyLen: 7487 -> 26942; focus: "pMark detAttr pmC" -> "pMark detAttr" |
| LOGISTICIAN | MISSION | [Tactical map. Arrow keys pan, plus and m] | `#g3Canvas` | LIVE | paneHtmlLen: 52587 -> 52610; focus: "navOpen standby notdeployed map3d theater3d" -> "deckgl-overlay" |
| LOGISTICIAN | MISSION | *(no label)* | `#deckgl-overlay` | NOT EXERCISED | not present on a clean load |
| LOGISTICIAN | MISSION | ▶ | `#g3Play` | LIVE | paneHtmlLen: 52598 -> 52621 |
| LOGISTICIAN | MISSION | [Simulation time] | `#g3Scrub` | LIVE | paneHtmlLen: 52598 -> 52621 |
| LOGISTICIAN | MISSION | 4× | `#g3Rate` | LIVE | bodyLen: 2555 -> 2556; paneLen: 1434 -> 1435; paneHtmlLen: 52621 -> 52622; focus: "navOpen standby notdeploye… |
| LOGISTICIAN | MISSION | LIVE | `#g3Follow` | LIVE | nOn: 44 -> 43; paneHtmlLen: 52622 -> 52619; focus: "g3Rate" -> "g3Follow" |
| LOGISTICIAN | MISSION | FIT | `#g3Fit` | NOT EXERCISED | not present on a clean load |
| LOGISTICIAN | MISSION | TOP-DOWN | `#g3Top2` | LIVE | paneHtmlLen: 52619 -> 52618; focus: "g3Fit" -> "g3Top2" |
| LOGISTICIAN | MISSION | show the detail | `button.lqMore[data-lq="fold"]` | LIVE | nAriaExp: 0 -> 1; nAriaExpF: 19 -> 18; paneHtmlLen: 52618 -> 52617; focus: "g3Top2" -> "navOpen standby notde… |
| LOGISTICIAN | FLEET | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 2953 -> 22987; focus: "navOpen standby notdeployed map3d" -> "pMark det… |
| LOGISTICIAN | FLEET | show the detail | `#lqFleetMore` | LIVE | nShow: 1 -> 0; nAriaExp: 1 -> 2; nAriaExpF: 21 -> 20; bodyLen: 3629 -> 2953; paneHtmlLen: 11452 -> 11451; foc… |
| LOGISTICIAN | FLEET | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 2953 -> 22987; focus: "lqFleetMore" -> "pMark detAttr pmC" |
| LOGISTICIAN | FLEET | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3629 -> 22987 |
| LOGISTICIAN | FLEET | + | `button.gpFold` | LIVE | nShow: 1 -> 0; nAriaExp: 2 -> 3; nAriaExpF: 20 -> 21; bodyLen: 3629 -> 3299; paneLen: 1898 -> 2244; paneHtmlL… |
| LOGISTICIAN | FLEET | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3299 -> 23333; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| LOGISTICIAN | FLEET | Open launch point → | `button.mini` | LIVE | view: "FLEET" -> "LAUNCHPOINTS"; nShow: 1 -> 0; nSelected: 0 -> 1; toolLen: 191 -> 196; bodyLen: 3878 -> 2253… |
| LOGISTICIAN | FLEET | + | `button.gpFold` | LIVE | nAriaExp: 3 -> 4; nAriaExpF: 21 -> 22; bodyLen: 3299 -> 3646; paneLen: 2244 -> 2591; paneHtmlLen: 13320 -> 15… |
| LOGISTICIAN | FLEET | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3646 -> 23680; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| LOGISTICIAN | FLEET | Open launch point → | `button.mini` | LIVE | view: "FLEET" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; bodyLen: 4225 -> 2253; paneLen: 2591 -> … |
| LOGISTICIAN | FLEET | + | `button.gpFold` | LIVE | nAriaExp: 4 -> 5; nAriaExpF: 22 -> 24; bodyLen: 3646 -> 4137; paneLen: 2591 -> 3082; paneHtmlLen: 15189 -> 17… |
| LOGISTICIAN | FLEET | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4137 -> 24192; paneLen: 3082 -> 3103; paneHtmlLen: 17775 -> 20037; focus: "navOpen st… |
| LOGISTICIAN | FLEET | Open launch point → | `button.mini` | LIVE | view: "FLEET" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; bodyLen: 4716 -> 2253; paneLen: 3082 -> … |
| LOGISTICIAN | FLEET (expanded) | hide the detail | `#lqFleetMore` | LIVE | nAriaExp: 5 -> 4; nAriaExpF: 24 -> 25; paneHtmlLen: 17775 -> 17776; focus: "navOpen standby notdeployed map3d… |
| LOGISTICIAN | FLEET (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 4 -> 3; nAriaExpF: 25 -> 24; bodyLen: 4137 -> 3791; paneLen: 3082 -> 2736; paneHtmlLen: 17776 -> 15… |
| LOGISTICIAN | FLEET (expanded) | M25-01 Soaring M25 READY awaiting tasking 5– | `tr` | ERROR | vanished before press |
| LOGISTICIAN | FLEET (expanded) | Hold | `button.mini[data-hold="1"]` | ERROR | vanished before press |
| LOGISTICIAN | FLEET (expanded) | TRV-02 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| LOGISTICIAN | FLEET (expanded) | Hold | `button.mini[data-hold="2"]` | ERROR | vanished before press |
| LOGISTICIAN | FLEET (expanded) | − | `button.gpFold` | LIVE (re-test) | fresh-page re-test: nAriaExp: 6 -> 4; nSelected: 1 -> 0; bodyLen: 4333 -> 3494 |
| LOGISTICIAN | FLEET (expanded) | TRV-03 TRV-150C READY awaiting tasking 12–34 | `tr` | LIVE | nAriaExp: 3 -> 4; nSelected: 1 -> 2; nAriaExpF: 24 -> 23; bodyLen: 3791 -> 4278; paneLen: 2736 -> 3223; paneH… |
| LOGISTICIAN | FLEET (expanded) | Hold | `button.mini[data-hold="3"]` | LIVE | nToast: 0 -> 1; bodyLen: 3791 -> 3866; paneLen: 2736 -> 2791; paneHtmlLen: 15907 -> 15971; focus: "TR" -> "na… |
| LOGISTICIAN | FLEET (expanded) | TRV-04 TRV-150C READY awaiting tasking 12–34 | `tr` | LIVE | nAriaExp: 3 -> 4; nSelected: 1 -> 2; nAriaExpF: 24 -> 23; bodyLen: 3866 -> 4353; paneLen: 2791 -> 3278; paneH… |
| LOGISTICIAN | FLEET (expanded) | Hold | `button.mini[data-hold="4"]` | LIVE | nToast: 1 -> 2; bodyLen: 3866 -> 3913; paneLen: 2791 -> 2818; paneHtmlLen: 15971 -> 16003; focus: "TR" -> "na… |
| LOGISTICIAN | FLEET (expanded) | FVR-05 FVR-90 (Crimson) READY awaiting taski | `tr` | LIVE | nAriaExp: 3 -> 4; nSelected: 1 -> 2; nAriaExpF: 24 -> 23; bodyLen: 3913 -> 4414; paneLen: 2818 -> 3319; paneH… |
| LOGISTICIAN | FLEET (expanded) | Hold | `button.mini[data-hold="5"]` | LIVE | nToast: 1 -> 2; bodyLen: 3893 -> 3937; paneLen: 2818 -> 2842; paneHtmlLen: 16003 -> 16036; focus: "TR" -> "na… |
| LOGISTICIAN | FLEET (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 3 -> 2; nAriaExpF: 24 -> 22; bodyLen: 3937 -> 3372; paneLen: 2842 -> 2277; paneHtmlLen: 16036 -> 13… |
| LOGISTICIAN | FLEET (expanded) | M25-06 Soaring M25 READY awaiting tasking 5– | `tr` | LIVE | nAriaExp: 2 -> 3; nSelected: 1 -> 2; nAriaExpF: 22 -> 21; bodyLen: 3352 -> 3845; paneLen: 2277 -> 2770; paneH… |
| LOGISTICIAN | FLEET (expanded) | Hold | `button.mini[data-hold="6"]` | LIVE | nToast: 1 -> 2; bodyLen: 3352 -> 3444; paneLen: 2277 -> 2349; paneHtmlLen: 13361 -> 15679; focus: "TR" -> "na… |
| LOGISTICIAN | FLEET (expanded) | TRV-07 TRV-150C READY awaiting tasking 12–34 | `tr` | LIVE | nAriaExp: 2 -> 3; nSelected: 1 -> 2; nAriaExpF: 22 -> 21; bodyLen: 3403 -> 3890; paneLen: 2328 -> 2815; paneH… |
| LOGISTICIAN | FLEET (expanded) | Hold | `button.mini[data-hold="7"]` | LIVE | nToast: 1 -> 2; bodyLen: 3403 -> 3448; paneLen: 2328 -> 2353; paneHtmlLen: 13417 -> 13451; focus: "TR" -> "na… |
| LOGISTICIAN | SUPPLY | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; nToast: 1 -> 0; bodyLen: 3972 -> 23986; focus: "navOpen standby notdeployed map3d" -> "pMark d… |
| LOGISTICIAN | SUPPLY | show the detail | `#lqSupplyMore` | LIVE | nShow: 1 -> 0; nAriaExp: 2 -> 3; nAriaExpF: 25 -> 24; bodyLen: 4620 -> 3985; paneLen: 2898 -> 2931; paneHtmlL… |
| LOGISTICIAN | SUPPLY | NOT AI ARITHMETIC | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 3985 -> 24019; focus: "lqSupplyMore" -> "pMark detAttr" |
| LOGISTICIAN | SUPPLY | + | `button.gpFold` | LIVE | nShow: 1 -> 0; nAriaExp: 3 -> 4; nAriaExpF: 24 -> 28; bodyLen: 4588 -> 4295; paneLen: 2931 -> 3241; paneHtmlL… |
| LOGISTICIAN | SUPPLY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4295 -> 24329; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| LOGISTICIAN | SUPPLY | Open launch point → | `button.mini` | LIVE | view: "SUPPLY" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; bodyLen: 4874 -> 2253; paneLen: 3241 ->… |
| LOGISTICIAN | SUPPLY | + | `button.gpFold` | LIVE | nAriaExp: 4 -> 5; nAriaExpF: 28 -> 32; bodyLen: 4295 -> 4606; paneLen: 3241 -> 3552; paneHtmlLen: 15791 -> 18… |
| LOGISTICIAN | SUPPLY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4606 -> 24640; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| LOGISTICIAN | SUPPLY | Open launch point → | `button.mini` | LIVE | view: "SUPPLY" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; bodyLen: 5185 -> 2253; paneLen: 3552 ->… |
| LOGISTICIAN | SUPPLY | + | `button.gpFold` | LIVE | nAriaExp: 5 -> 6; nAriaExpF: 32 -> 36; bodyLen: 4606 -> 4916; paneLen: 3552 -> 3862; paneHtmlLen: 18985 -> 22… |
| LOGISTICIAN | SUPPLY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4916 -> 24950; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| LOGISTICIAN | SUPPLY | Open launch point → | `button.mini` | LIVE | view: "SUPPLY" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; bodyLen: 5495 -> 2253; paneLen: 3862 ->… |
| LOGISTICIAN | SUPPLY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4916 -> 24950; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| LOGISTICIAN | SUPPLY (expanded) | hide the detail | `#lqSupplyMore` | LIVE | nAriaExp: 6 -> 5; nAriaExpF: 36 -> 37; bodyLen: 4916 -> 4883; paneLen: 3862 -> 3829; paneHtmlLen: 22179 -> 22… |
| LOGISTICIAN | SUPPLY (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 5 -> 4; nAriaExpF: 37 -> 33; bodyLen: 4883 -> 4573; paneLen: 3829 -> 3519; paneHtmlLen: 22176 -> 18… |
| LOGISTICIAN | SUPPLY (expanded) | Whole Blood (1 u) BLOOD 5 0 0 5 | `tr` | LIVE | nAriaExp: 4 -> 5; nSelected: 1 -> 2; nAriaExpF: 33 -> 32; bodyLen: 4573 -> 4993; paneLen: 3519 -> 3939; paneH… |
| LOGISTICIAN | SUPPLY (expanded) | Freeze-Dried Plasma PLASMA 4 0 0 4 | `tr` | LIVE | nAriaExp: 4 -> 5; nSelected: 1 -> 2; nAriaExpF: 33 -> 32; bodyLen: 4573 -> 4992; paneLen: 3519 -> 3938; paneH… |
| LOGISTICIAN | SUPPLY (expanded) | TXA 2g TXA 9 0 not modelled 9 | `tr` | LIVE (re-test) | fresh-page re-test: bodyLen: 5257 -> 5206; paneLen: 3662 -> 3611; paneHtmlLen: 18181 -> 18023 |
| LOGISTICIAN | SUPPLY (expanded) | Hemorrhage Kit HEM KIT 20 0 not modelled 20 | `tr` | LIVE | nAriaExp: 4 -> 5; nSelected: 1 -> 2; nAriaExpF: 33 -> 32; bodyLen: 4573 -> 4953; paneLen: 3519 -> 3899; paneH… |
| LOGISTICIAN | SUPPLY (expanded) | Chest Seal / NPA SEAL 9 0 not modelled 9 | `tr` | LIVE | nAriaExp: 4 -> 5; nSelected: 1 -> 2; nAriaExpF: 33 -> 32; bodyLen: 4573 -> 4951; paneLen: 3519 -> 3897; paneH… |
| LOGISTICIAN | SUPPLY (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 4 -> 3; nAriaExpF: 33 -> 29; bodyLen: 4573 -> 4262; paneLen: 3519 -> 3208; paneHtmlLen: 18982 -> 15… |
| LOGISTICIAN | SUPPLY (expanded) | Whole Blood (1 u) BLOOD 5 0 0 5 | `tr` | LIVE | nAriaExp: 3 -> 4; nSelected: 1 -> 2; nAriaExpF: 29 -> 28; bodyLen: 4262 -> 4682; paneLen: 3208 -> 3628; paneH… |
| LOGISTICIAN | SUPPLY (expanded) | Freeze-Dried Plasma PLASMA 4 0 0 4 | `tr` | LIVE | nAriaExp: 3 -> 4; nSelected: 1 -> 2; nAriaExpF: 29 -> 28; bodyLen: 4262 -> 4681; paneLen: 3208 -> 3627; paneH… |
| LOGISTICIAN | SUPPLY (expanded) | TXA 2g TXA 9 0 not modelled 9 | `tr` | LIVE | nAriaExp: 3 -> 4; nSelected: 1 -> 2; nAriaExpF: 29 -> 28; bodyLen: 4262 -> 4631; paneLen: 3208 -> 3577; paneH… |
| LOGISTICIAN | SUPPLY (expanded) | Hemorrhage Kit HEM KIT 20 0 not modelled 20 | `tr` | LIVE | nAriaExp: 3 -> 4; nSelected: 1 -> 2; nAriaExpF: 29 -> 28; bodyLen: 4262 -> 4642; paneLen: 3208 -> 3588; paneH… |
| LOGISTICIAN | SUPPLY (expanded) | Chest Seal / NPA SEAL 9 0 not modelled 9 | `tr` | LIVE | nAriaExp: 3 -> 4; nSelected: 1 -> 2; nAriaExpF: 29 -> 28; bodyLen: 4262 -> 4640; paneLen: 3208 -> 3586; paneH… |
| LOGISTICIAN | SUPPLY (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 3 -> 2; nAriaExpF: 29 -> 25; bodyLen: 4262 -> 3952; paneLen: 3208 -> 2898; paneHtmlLen: 15788 -> 12… |
| LOGISTICIAN | SUPPLY (expanded) | Whole Blood (1 u) BLOOD 5 0 0 5 | `tr` | ERROR | vanished before press |
| LOGISTICIAN | SUPPLY (expanded) | Freeze-Dried Plasma PLASMA 4 0 0 4 | `tr` | ERROR | vanished before press |
| LOGISTICIAN | SUPPLY (expanded) | TXA 2g TXA 9 0 not modelled 9 | `tr` | ERROR | vanished before press |
| LOGISTICIAN | SUPPLY (expanded) | Hemorrhage Kit HEM KIT 20 0 not modelled 20 | `tr` | ERROR | vanished before press |
| LOGISTICIAN | SUPPLY (expanded) | Chest Seal / NPA SEAL 9 0 not modelled 9 | `tr` | ERROR | vanished before press |
| LOGISTICIAN | SUPPLY (expanded) | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3952 -> 23986; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| LOGISTICIAN | STREAM | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 1783 -> 21817; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr" |
| LOGISTICIAN | STREAM | Export CSV | `#btnExportStream` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; bodyLen: 2452 -> 1843; focus: "pMark detAttr" -> "btnExportStream" |
| LOGISTICIAN | STREAM | the whole stream | `#lqStreamMore` | LIVE | nAriaExp: 2 -> 3; nAriaExpF: 26 -> 25; bodyLen: 1843 -> 2374; paneLen: 718 -> 1249; paneHtmlLen: 10221 -> 102… |
| LOGISTICIAN | TASKING | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 2302 -> 22336; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr" |
| LOGISTICIAN | TASKING | Approve all pending | `#btnApproveAll` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; bodyLen: 2983 -> 2335; focus: "pMark detAttr" -> "btnApproveAll" |
| LOGISTICIAN | TASKING | show the policy | `#lqTaskingMore` | LIVE | nAriaExp: 3 -> 4; nAriaExpF: 28 -> 27; bodyLen: 2335 -> 3578; paneLen: 1246 -> 2489; paneHtmlLen: 14420 -> 14… |
| LOGISTICIAN | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3578 -> 23612; focus: "lqTaskingMore" -> "pMark detAttr pmC" |
| LOGISTICIAN | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4159 -> 23612 |
| LOGISTICIAN | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4126 -> 23579 |
| LOGISTICIAN | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4126 -> 23579 |
| LOGISTICIAN | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4126 -> 23579 |
| LOGISTICIAN | TASKING | + | `button.gpFold` | LIVE | nShow: 1 -> 0; nAriaExp: 4 -> 5; nAriaExpF: 27 -> 26; bodyLen: 4126 -> 3699; paneLen: 2489 -> 2643; paneHtmlL… |
| LOGISTICIAN | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 2843 -> 22877 |
| LOGISTICIAN | TASKING | Open launch point → | `button.mini` | LIVE | view: "TASKING" -> "LAUNCHPOINTS"; toolLen: 192 -> 196; bodyLen: 3699 -> 2253; paneLen: 2643 -> 1193; paneHtm… |
| LOGISTICIAN | TASKING | + | `button.gpFold` | LIVE | nAriaExp: 5 -> 6; nAriaExpF: 26 -> 25; bodyLen: 3699 -> 3853; paneLen: 2643 -> 2797; paneHtmlLen: 14610 -> 14… |
| LOGISTICIAN | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3853 -> 23887; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| LOGISTICIAN | TASKING | Open launch point → | `button.mini` | LIVE | view: "TASKING" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 192 -> 196; bodyLen: 4432 -> 2253; paneLen: 2797 -… |
| LOGISTICIAN | TASKING | + | `button.gpFold` | LIVE | nAriaExp: 6 -> 7; nAriaExpF: 25 -> 24; bodyLen: 3853 -> 4006; paneLen: 2797 -> 2950; paneHtmlLen: 14801 -> 14… |
| LOGISTICIAN | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4006 -> 24040; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| LOGISTICIAN | TASKING | Open launch point → | `button.mini` | LIVE | view: "TASKING" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 192 -> 196; bodyLen: 4585 -> 2253; paneLen: 2950 -… |
| LOGISTICIAN | TASKING (expanded) | hide the detail | `#lqTaskingMore` | LIVE | nAriaExp: 7 -> 6; nAriaExpF: 24 -> 25; bodyLen: 4006 -> 2763; paneLen: 2950 -> 1707; paneHtmlLen: 14991 -> 14… |
| LOGISTICIAN | TASKING (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 6 -> 5; nAriaExpF: 25 -> 26; bodyLen: 2763 -> 2609; paneLen: 1707 -> 1553; paneHtmlLen: 14992 -> 14… |
| LOGISTICIAN | TASKING (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 5 -> 4; nAriaExpF: 26 -> 27; bodyLen: 2609 -> 2455; paneLen: 1553 -> 1399; paneHtmlLen: 14801 -> 14… |
| LOGISTICIAN | TASKING (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 4 -> 3; nAriaExpF: 27 -> 28; bodyLen: 2455 -> 2302; paneLen: 1399 -> 1246; paneHtmlLen: 14610 -> 14… |
| LOGISTICIAN | TASKING (expanded) | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 2302 -> 22336; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| LOGISTICIAN | COST | NOT AI COST ARITHMETIC | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 3160 -> 23194; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr" |
| LOGISTICIAN | COST | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3722 -> 23194; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| LOGISTICIAN | COST | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3739 -> 23194 |
| LOGISTICIAN | COST | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3739 -> 23194 |
| LOGISTICIAN | COST | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3739 -> 23194 |
| LOGISTICIAN | COST | the rest of the argument | `button.lqMore[data-lq="fold"]` | LIVE | nShow: 1 -> 0; nAriaExp: 3 -> 4; nAriaExpF: 29 -> 28; bodyLen: 3739 -> 3937; paneLen: 2101 -> 2878; paneHtmlL… |
| LOGISTICIAN | COST | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3937 -> 23971; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| LOGISTICIAN | COST | Measure across 35 engagements | `button.btn.ok` | LIVE | nShow: 1 -> 0; bodyLen: 4526 -> 5916; paneLen: 2878 -> 4857; paneHtmlLen: 11137 -> 18420; focus: "pMark detAt… |
| LOGISTICIAN | COST | Run this mission | `button.btn` | ERROR | vanished before press |
| LOGISTICIAN | COST | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5893 -> 6485; paneLen: 4834 -> 4837; paneHtmlLen: 15300 -> 15321 |
| LOGISTICIAN | CASUALTIES | AI: CRI-Net · Predicts collapse | `span.pMark.aiAttr` | LIVE | nShow: 0 -> 1; nToast: 1 -> 0; bodyLen: 2847 -> 22785; focus: "navOpen standby notdeployed map3d" -> "pMark a… |
| LOGISTICIAN | CASUALTIES | Export CSV | `#btnExportCas` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; bodyLen: 3419 -> 2787; focus: "pMark aiAttr" -> "btnExportCas" |
| LOGISTICIAN | CASUALTIES | All | `span.chip.on` | NOOP-already-selected | focus: "btnExportCas" -> "navOpen standby notdeployed map3d" |
| LOGISTICIAN | CASUALTIES | Open | `span.chip` | LIVE | filter: "{\"cas\":\"ALL\",\"q\":\"\"}" -> "{\"cas\":\"OPEN\",\"q\":\"\"}" |
| LOGISTICIAN | CASUALTIES | Critical | `span.chip` | LIVE | filter: "{\"cas\":\"OPEN\",\"q\":\"\"}" -> "{\"cas\":\"CRITICAL\",\"q\":\"\"}" |
| LOGISTICIAN | CASUALTIES | Treated | `span.chip` | LIVE | filter: "{\"cas\":\"CRITICAL\",\"q\":\"\"}" -> "{\"cas\":\"TREATED\",\"q\":\"\"}"; nToast: 1 -> 0; bodyLen: 2… |
| LOGISTICIAN | CASUALTIES | Died of wounds | `span.chip` | LIVE | filter: "{\"cas\":\"TREATED\",\"q\":\"\"}" -> "{\"cas\":\"DIED\",\"q\":\"\"}" |
| LOGISTICIAN | CASUALTIES | High-value | `span.chip` | LIVE | filter: "{\"cas\":\"DIED\",\"q\":\"\"}" -> "{\"cas\":\"HVA\",\"q\":\"\"}" |
| LOGISTICIAN | CASUALTIES | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 2751 -> 22785; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| LOGISTICIAN | CASUALTIES | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3330 -> 22785 |
| LOGISTICIAN | CASUALTIES | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3330 -> 22785 |
| LOGISTICIAN | CASUALTIES | + | `button.gpFold` | LIVE | nShow: 1 -> 0; nAriaExp: 4 -> 5; nAriaExpF: 31 -> 30; bodyLen: 3388 -> 2802; paneLen: 1694 -> 1745; paneHtmlL… |
| LOGISTICIAN | CASUALTIES | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 2802 -> 22836; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| LOGISTICIAN | CASUALTIES | Open launch point → | `button.mini` | LIVE | view: "CASUALTIES" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 193 -> 196; bodyLen: 3381 -> 2253; paneLen: 174… |
| LOGISTICIAN | CASUALTIES | + | `button.gpFold` | LIVE | nAriaExp: 5 -> 6; nAriaExpF: 30 -> 29; bodyLen: 2802 -> 2853; paneLen: 1745 -> 1796; paneHtmlLen: 10493 -> 10… |
| LOGISTICIAN | CASUALTIES | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 2853 -> 22887; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| LOGISTICIAN | CASUALTIES | Open launch point → | `button.mini` | LIVE | view: "CASUALTIES" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 193 -> 196; bodyLen: 3432 -> 2253; paneLen: 179… |
| LOGISTICIAN | CASUALTIES | + | `button.gpFold` | LIVE | nAriaExp: 6 -> 7; nAriaExpF: 29 -> 28; bodyLen: 2853 -> 2904; paneLen: 1796 -> 1847; paneHtmlLen: 10568 -> 10… |
| LOGISTICIAN | CASUALTIES | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 2904 -> 22938; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| LOGISTICIAN | CASUALTIES | Open launch point → | `button.mini` | LIVE | view: "CASUALTIES" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 193 -> 196; bodyLen: 3483 -> 2253; paneLen: 184… |
| LOGISTICIAN | CASUALTIES (expanded) | All | `span.chip` | LIVE | filter: "{\"cas\":\"HVA\",\"q\":\"\"}" -> "{\"cas\":\"ALL\",\"q\":\"\"}" |
| LOGISTICIAN | CASUALTIES (expanded) | High-value | `span.chip.on` | ERROR | vanished before press |
| LOGISTICIAN | CASUALTIES (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 7 -> 6; nAriaExpF: 28 -> 29; bodyLen: 2904 -> 2853; paneLen: 1847 -> 1796; paneHtmlLen: 10643 -> 10… |
| LOGISTICIAN | CASUALTIES (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 6 -> 5; nAriaExpF: 29 -> 30; bodyLen: 2853 -> 2802; paneLen: 1796 -> 1745; paneHtmlLen: 10568 -> 10… |
| LOGISTICIAN | CASUALTIES (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 5 -> 4; nAriaExpF: 30 -> 31; bodyLen: 2802 -> 2751; paneLen: 1745 -> 1694; paneHtmlLen: 10493 -> 10… |
| SURGEON | GLOBAL@DECIDE | ANGEL SWARM v3.5 | `#btnHome` | DEAD | no state change (PIXELS ONLY) |
| SURGEON | GLOBAL@DECIDE | JOA CORAL ▾ | `#btnOpPick` | LIVE | bodyClass: "navOpen standby notdeployed" -> "navOpen standby notdeployed opPickOpen"; nAriaExp: 3 -> 4; nHidd… |
| SURGEON | GLOBAL@DECIDE | Deploy → | `#btnDeployBar` | LIVE | nShow: 0 -> 1; nOn: 30 -> 33; bodyLen: 5941 -> 6772; focus: "btnOpPick" -> "btnDeployBar" |
| SURGEON | GLOBAL@DECIDE | COMMANDER | `span.chip[data-roleset="COMMANDER"]` | LIVE | role: "SURGEON" -> "COMMANDER"; bodyAttrs: "SURGEON\|console-dark" -> "COMMANDER\|console-dark"; nOn: 33 -> 34;… |
| SURGEON | GLOBAL@DECIDE | LOGISTICIAN | `span.chip[data-roleset="LOGISTICIAN"]` | LIVE | role: "SURGEON" -> "LOGISTICIAN"; bodyAttrs: "SURGEON\|console-dark" -> "LOGISTICIAN\|console-dark"; inspLen: 6… |
| SURGEON | GLOBAL@DECIDE | SURGEON | `span.chip.on[data-roleset="SURGEON"]` | NOOP-already-selected | focus: "chip" -> "chip on" |
| SURGEON | GLOBAL@DECIDE | ANALYST | `span.chip[data-roleset="ANALYST"]` | LIVE | role: "SURGEON" -> "ANALYST"; bodyAttrs: "SURGEON\|console-dark" -> "ANALYST\|console-dark"; inspLen: 676 -> 73… |
| SURGEON | GLOBAL@DECIDE | Console dark | `#btnTheme` | LIVE | nShow: 0 -> 1; nOn: 33 -> 35; nAriaExp: 3 -> 4; nHidden: 2 -> 1; cmdLen: 122 -> 478; nAriaExpF: 17 -> 16; bod… |
| SURGEON | GLOBAL@DECIDE | [Back to the theater overview] | `#btnBackTheater` | LIVE | view: "DECIDE" -> "DASHBOARD"; bodyClass: "navOpen standby notdeployed" -> "navOpen standby notdeployed theat… |
| SURGEON | GLOBAL@DECIDE | − | `#btnZoomOut` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| SURGEON | GLOBAL@DECIDE | 1.0× | `#zoomLabel` | NOT-A-CONTROL | — |
| SURGEON | GLOBAL@DECIDE | + | `#btnZoomIn` | LIVE | zoom: 1 -> 1.5 |
| SURGEON | GLOBAL@DECIDE | Fit | `#btnZoomFit` | LIVE | zoom: 1.5 -> 1 |
| SURGEON | GLOBAL@DECIDE | Single | `span.chip.on[data-mapview="COP"]` | NOOP-already-selected | — |
| SURGEON | GLOBAL@DECIDE | Side by side | `span.chip[data-mapview="COMPARE"]` | LIVE | mapView: "COP" -> "COMPARE"; nOn: 34 -> 35 |
| SURGEON | GLOBAL@DECIDE | Theatre | `span.chip[data-mapscope="THEATRE"]` | LIVE | view: "DECIDE" -> "DASHBOARD"; bodyClass: "navOpen standby notdeployed theater3d" -> "navOpen standby notdepl… |
| SURGEON | GLOBAL@DECIDE | Tactical | `span.chip[data-mapscope="2D"]` | LIVE | view: "DECIDE" -> "MISSION"; bodyClass: "navOpen standby notdeployed theater3d" -> "navOpen standby notdeploy… |
| SURGEON | GLOBAL@DECIDE | Tactical 3D | `span.chip[data-mapscope="3D"]` | LIVE | view: "DECIDE" -> "MISSION"; mapMode: "2D" -> "3D"; bodyClass: "navOpen standby notdeployed theater3d compare… |
| SURGEON | GLOBAL@DECIDE | V | `span.chip.mmKey` | NOT-A-CONTROL | — |
| SURGEON | GLOBAL@DECIDE | e.g. CAS-084 · LP 2 KILO · blood ⌘K | `#btnSearch` | LIVE | nShow: 0 -> 1; nSelected: 0 -> 1; bodyLen: 5941 -> 6415 |
| SURGEON | GLOBAL@DECIDE | {Reset run (R)} | `#btnReset` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| SURGEON | GLOBAL@DECIDE | ▶ | `#btnPlay` | LIVE | running: false -> true; nOn: 30 -> 31; inspHtmlLen: 3729 -> 3730; toolLen: 191 -> 190; bodyLen: 5941 -> 6087;… |
| SURGEON | GLOBAL@DECIDE | 1× | `span.chip[data-speed="1"]` | LIVE | speed: 2 -> 1 |
| SURGEON | GLOBAL@DECIDE | 2× | `span.chip.on[data-speed="2"]` | NOOP-already-selected | — |
| SURGEON | GLOBAL@DECIDE | 4× | `span.chip[data-speed="4"]` | LIVE | speed: 2 -> 4 |
| SURGEON | GLOBAL@DECIDE | 10× | `span.chip[data-speed="10"]` | LIVE | speed: 2 -> 10 |
| SURGEON | GLOBAL@DECIDE | INGEST OFF | `#ingestChip` | DEAD | no state change (PIXELS ONLY) |
| SURGEON | GLOBAL@DECIDE | Overview | `a.navItem.big.on[data-view="DECIDE"]` | NOOP-already-selected | — |
| SURGEON | GLOBAL@DECIDE | Map | `a.navItem.big[data-view="MISSION"]` | LIVE | view: "DECIDE" -> "MISSION"; nOpen: 0 -> 1; nOn: 30 -> 44; nAriaPress: 0 -> 9; toolLen: 191 -> 186; bodyLen: … |
| SURGEON | GLOBAL@DECIDE | Casualties | `a.navItem.big[data-view="CASUALTIES"]` | LIVE | view: "DECIDE" -> "CASUALTIES"; toolLen: 191 -> 193; nAriaExpF: 17 -> 20; bodyLen: 5941 -> 3330; paneLen: 440… |
| SURGEON | GLOBAL@DECIDE | Aircraft | `a.navItem.big[data-view="FLEET"]` | LIVE | view: "DECIDE" -> "FLEET"; nAriaExpF: 20 -> 23; bodyLen: 5941 -> 2716; paneLen: 4401 -> 1176; paneHtmlLen: 25… |
| SURGEON | GLOBAL@DECIDE | Launch points | `a.navItem.big[data-view="LAUNCHPOINTS"]` | LIVE | view: "DECIDE" -> "LAUNCHPOINTS"; toolLen: 191 -> 196; nAriaExpF: 23 -> 26; bodyLen: 5941 -> 2705; paneLen: 4… |
| SURGEON | GLOBAL@DECIDE | Supplies | `a.navItem.big[data-view="SUPPLY"]` | LIVE | view: "DECIDE" -> "SUPPLY"; nAriaExpF: 26 -> 29; bodyLen: 5941 -> 2836; paneLen: 4401 -> 1297; paneHtmlLen: 2… |
| SURGEON | GLOBAL@DECIDE | Approvals | `a.navItem.big[data-view="TASKING"]` | LIVE | view: "DECIDE" -> "TASKING"; toolLen: 191 -> 192; nAriaExpF: 29 -> 32; bodyLen: 5941 -> 2904; paneLen: 4401 -… |
| SURGEON | GLOBAL@DECIDE | Scenarios | `a.navItem.big[data-view="CONFIDENCE"]` | LIVE | view: "DECIDE" -> "CONFIDENCE"; nOn: 40 -> 41; toolLen: 191 -> 192; bodyLen: 5941 -> 4457; paneLen: 4401 -> 2… |
| SURGEON | GLOBAL@DECIDE | After-action report | `a.navItem.big[data-view="AFTERACTION"]` | LIVE | view: "DECIDE" -> "AFTERACTION"; toolLen: 191 -> 202; bodyLen: 5941 -> 4969; paneLen: 4401 -> 3419; paneHtmlL… |
| SURGEON | GLOBAL@DECIDE | Show every destination | `#btnNavAll` | LIVE | nOn: 40 -> 41; nAriaPress: 9 -> 10; railLen: 157 -> 449; nAriaPressF: 1 -> 0; bodyLen: 5941 -> 6233 |
| SURGEON | GLOBAL@DECIDE | Search everything | `#btnPalette` | LIVE | nShow: 0 -> 1; nSelected: 0 -> 1; bodyLen: 6233 -> 6707 |
| SURGEON | GLOBAL@DECIDE | ◍ Sound off | `#audBtn` | LIVE | nOn: 41 -> 42; railLen: 449 -> 454; bodyLen: 6233 -> 6238 |
| SURGEON | GLOBAL@DECIDE | Settings | `a.navItem[data-view="SETTINGS"]` | LIVE | view: "DECIDE" -> "SETTINGS"; bodyLen: 6238 -> 4642; paneLen: 4401 -> 2805; paneHtmlLen: 25634 -> 10736 |
| SURGEON | GLOBAL@DECIDE | [Previous] | `button.nsp-tb` | NOOP-disabled | — |
| SURGEON | GLOBAL@DECIDE | [Run or pause] | `button.nsp-tb.hi` | LIVE | running: false -> true; nOn: 42 -> 43; inspHtmlLen: 3729 -> 3730; toolLen: 191 -> 190; bodyLen: 6238 -> 6384;… |
| SURGEON | GLOBAL@DECIDE | [Next] | `button.nsp-tb` | NOOP-disabled | — |
| SURGEON | GLOBAL@DECIDE | RUN SUMMARY | `div.nsp-sec` | LIVE | nAriaExp: 3 -> 2; inspLen: 676 -> 291; inspHtmlLen: 3729 -> 2214; nAriaExpF: 32 -> 33; nShut: 0 -> 1; bodyLen… |
| SURGEON | GLOBAL@DECIDE | LATEST EVENTS | `div.nsp-sec` | LIVE | nAriaExp: 2 -> 1; inspLen: 291 -> 243; inspHtmlLen: 2214 -> 2080; nAriaExpF: 33 -> 34; nShut: 1 -> 2; bodyLen… |
| SURGEON | GLOBAL@DECIDE | TAGS | `div.nsp-sec` | LIVE | nAriaExp: 1 -> 0; inspLen: 243 -> 191; inspHtmlLen: 2080 -> 1786; nAriaExpF: 34 -> 35; nShut: 2 -> 3; bodyLen… |
| SURGEON | GLOBAL@DECIDE | Theatre map | `button.ri` | LIVE | view: "DECIDE" -> "DASHBOARD"; nOn: 42 -> 46; toolLen: 191 -> 186; bodyLen: 5899 -> 4978; paneLen: 4547 -> 35… |
| SURGEON | GLOBAL@DECIDE | Tactical map | `button.ri` | LIVE | view: "DECIDE" -> "MISSION"; nOn: 42 -> 46; toolLen: 191 -> 186; bodyLen: 5899 -> 1758; paneLen: 4547 -> 316;… |
| SURGEON | GLOBAL@DECIDE | Tactical map, 3D | `button.ri` | LIVE | view: "DECIDE" -> "MISSION"; nOn: 42 -> 47; toolLen: 191 -> 186; bodyLen: 5899 -> 2826; paneLen: 4547 -> 1408… |
| SURGEON | GLOBAL@DECIDE | Approvals awaiting a human | `button.ri[data-act="approvals"]` | LIVE | view: "DECIDE" -> "TASKING"; toolLen: 191 -> 192; bodyLen: 5899 -> 2716; paneLen: 4547 -> 1363; paneHtmlLen: … |
| SURGEON | GLOBAL@DECIDE | Keyboard shortcuts (?) | `button.ri[data-act="keys"]` | LIVE | nShow: 0 -> 1 |
| SURGEON | GLOBAL@MISSION | Tactical 3D | `span.chip.on[data-mapscope="3D"]` | NOOP-already-selected | focus: "ri" -> "chip on" |
| SURGEON | GLOBAL@MISSION | Overview | `a.navItem.big[data-view="DECIDE"]` | LIVE | view: "MISSION" -> "DECIDE"; nOn: 44 -> 40; toolLen: 186 -> 191; bodyLen: 2590 -> 5456; paneLen: 1469 -> 4401… |
| SURGEON | GLOBAL@MISSION | Map | `a.navItem.big.on[data-view="MISSION"]` | NOOP-already-selected | — |
| SURGEON | GLOBAL@MISSION | Map layers | `button.ri.on[data-act="legend"]` | LIVE | nOn: 44 -> 43; bodyLen: 2590 -> 1787; paneLen: 1469 -> 666; paneHtmlLen: 52672 -> 52679; focus: "navOpen stan… |
| SURGEON | GLOBAL@MISSION | Draw every layer | `button.ri[data-act="layersAll"]` | LIVE | nOn: 43 -> 34; nAriaPress: 9 -> 0; nAriaPressF: 1 -> 10; bodyLen: 1787 -> 1786; paneLen: 666 -> 665; paneHtml… |
| SURGEON | GLOBAL@MISSION | Fit the area of operations | `button.ri[data-act="fit"]` | LIVE | bodyLen: 1786 -> 1787; paneLen: 665 -> 666; paneHtmlLen: 52660 -> 52661 |
| SURGEON | GLOBAL@MISSION | Zoom in | `button.ri[data-act="zoomIn"]` | LIVE | paneHtmlLen: 52661 -> 52662 |
| SURGEON | GLOBAL@MISSION | Zoom out | `button.ri[data-act="zoomOut"]` | LIVE | paneHtmlLen: 52662 -> 52661 |
| SURGEON | GLOBAL@MISSION | Tactical map, 3D | `button.ri.on` | NOOP-already-selected | focus: "ri" -> "ri on" |
| SURGEON | CASUALTIES | AI: CRI-Net · Predicts collapse | `span.pMark.aiAttr` | LIVE | nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 2845 -> 22879; focus: "ri" -> "pMark aiAttr" |
| SURGEON | CASUALTIES | Export CSV | `#btnExportCas` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; bodyLen: 3513 -> 2881; focus: "pMark aiAttr" -> "btnExportCas" |
| SURGEON | CASUALTIES | the full register | `#sgCasMore` | LIVE | nAriaExp: 0 -> 1; nAriaExpF: 23 -> 22; bodyLen: 2881 -> 3936; paneLen: 1788 -> 2843; paneHtmlLen: 16048 -> 16… |
| SURGEON | CASUALTIES | AI: CRI-Net · Predicts collapse | `span.pMark.aiAttr` | LIVE | nShow: 0 -> 1; bodyLen: 3936 -> 23970; focus: "sgCasMore" -> "pMark aiAttr" |
| SURGEON | CASUALTIES | AI: CRI-Net | `span.pMark.aiAttr.pmC` | ERROR | vanished before press |
| SURGEON | CASUALTIES | AI: CRI-Net | `span.pMark.aiAttr.pmC` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | hide the full register | `#sgCasMore` | LIVE | nShow: 1 -> 0; nAriaExp: 3 -> 2; nAriaExpF: 20 -> 21; bodyLen: 4670 -> 2845; paneLen: 2945 -> 1788; paneHtmlL… |
| SURGEON | CASUALTIES (expanded) | All | `span.chip.on` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | Open | `span.chip` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | Critical | `span.chip` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | Treated | `span.chip` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | Died of wounds | `span.chip` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | High-value | `span.chip` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | NOT AI | `span.pMark.detAttr.pmC` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | NOT AI | `span.pMark.detAttr.pmC` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | NOT AI | `span.pMark.detAttr.pmC` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | − | `button.gpFold` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | NOT AI | `span.pMark.detAttr.pmC` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | Open launch point → | `button.mini` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | − | `button.gpFold` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | NOT AI | `span.pMark.detAttr.pmC` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | Open launch point → | `button.mini` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | + | `button.gpFold` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | NOT AI | `span.pMark.detAttr.pmC` | ERROR | vanished before press |
| SURGEON | CASUALTIES (expanded) | Open launch point → | `button.mini` | ERROR | vanished before press |
| SURGEON | MISSION | [Tactical map. Arrow keys pan, plus and m] | `#g3Canvas` | LIVE | paneHtmlLen: 52661 -> 52684; focus: "navOpen standby notdeployed map3d" -> "deckgl-overlay" |
| SURGEON | MISSION | *(no label)* | `#deckgl-overlay` | NOT EXERCISED | not present on a clean load |
| SURGEON | MISSION | ▶ | `#g3Play` | LIVE | paneHtmlLen: 52672 -> 52695 |
| SURGEON | MISSION | [Simulation time] | `#g3Scrub` | LIVE | paneHtmlLen: 52672 -> 52695 |
| SURGEON | MISSION | 4× | `#g3Rate` | LIVE | bodyLen: 2590 -> 2591; paneLen: 1469 -> 1470; paneHtmlLen: 52695 -> 52696; focus: "navOpen standby notdeploye… |
| SURGEON | MISSION | LIVE | `#g3Follow` | LIVE | nOn: 44 -> 43; paneHtmlLen: 52696 -> 52693; focus: "g3Rate" -> "g3Follow" |
| SURGEON | MISSION | FIT | `#g3Fit` | NOT EXERCISED | not present on a clean load |
| SURGEON | MISSION | TOP-DOWN | `#g3Top2` | LIVE | paneHtmlLen: 52693 -> 52692; focus: "g3Fit" -> "g3Top2" |
| SURGEON | MISSION | the airframes and the layers | `button.sgMore[data-sg="fold"]` | LIVE | nAriaExp: 0 -> 1; nAriaExpF: 20 -> 19; bodyLen: 2591 -> 2596; paneLen: 1470 -> 1475; paneHtmlLen: 52692 -> 52… |
| SURGEON | STREAM | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 2418 -> 22452; focus: "navOpen standby notdeployed map3d" -> "pMark det… |
| SURGEON | STREAM | Export CSV | `#btnExportStream` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; bodyLen: 3087 -> 2478; focus: "pMark detAttr" -> "btnExportStream" |
| SURGEON | STREAM | the whole stream | `#sgStreamMore` | LIVE | nAriaExp: 1 -> 2; nAriaExpF: 20 -> 19; bodyLen: 2478 -> 3015; paneLen: 1352 -> 1890; paneHtmlLen: 11051 -> 11… |
| SURGEON | SENSOR | AI: CRI-Net · Predicts collapse | `span.pMark.aiAttr` | LIVE | nShow: 0 -> 1; focus: "navOpen standby notdeployed map3d" -> "pMark aiAttr" |
| SURGEON | SENSOR | the model and how it was validated | `#sgSensorMore` | LIVE | nShow: 1 -> 0; nAriaExp: 2 -> 3; nAriaExpF: 20 -> 19; focus: "pMark aiAttr" -> "sgSensorMore" |
| SURGEON | SENSOR | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; focus: "sgSensorMore" -> "pMark detAttr pmC" |
| SURGEON | SENSOR | NOT AI | `span.pMark.detAttr.pmC` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 3484 -> 23518 |
| SURGEON | SENSOR | NOT AI | `span.pMark.detAttr.pmC` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 3484 -> 23511 |
| SURGEON | SENSOR | NOT AI | `span.pMark.detAttr.pmC` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 3484 -> 23518 |
| SURGEON | SENSOR | NOT AI | `span.pMark.detAttr.pmC` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 3484 -> 23511 |
| SURGEON | SENSOR | AI: CRI-Net · Predicts collapse | `span.pMark.aiAttr` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 3477 -> 23511 |
| SURGEON | SENSOR | Stable | `span.chip` | LIVE (re-test) | fresh-page re-test: bodyLen: 3484 -> 3451; paneLen: 1939 -> 1906; paneHtmlLen: 16708 -> 16675 |
| SURGEON | SENSOR | Slow bleed | `span.chip.on` | ERROR | vanished before press |
| SURGEON | SENSOR | Arterial bleed | `span.chip` | LIVE (re-test) | fresh-page re-test: bodyLen: 3477 -> 3461; paneLen: 1932 -> 1916; paneHtmlLen: 15976 -> 16685 |
| SURGEON | SENSOR | Blood given at T+6 | `span.chip` | LIVE (re-test) | fresh-page re-test: bodyLen: 3477 -> 3457; paneLen: 1932 -> 1912; paneHtmlLen: 15976 -> 16681 |
| SURGEON | SENSOR | Clean signal | `span.chip.on` | NOOP-already-selected | — |
| SURGEON | SENSOR | Casualty moving | `span.chip` | LIVE (re-test) | fresh-page re-test: classSig,attrSig,paneSig,bodyLen,paneLen,paneHtmlLen |
| SURGEON | SENSOR | Poor perfusion | `span.chip` | LIVE (re-test) | fresh-page re-test: classSig,attrSig,paneSig,bodyLen,paneLen,paneHtmlLen |
| SURGEON | SENSOR | Electrical noise | `span.chip` | LIVE (re-test) | fresh-page re-test: classSig,attrSig,paneSig,bodyLen,paneLen,paneHtmlLen |
| SURGEON | SENSOR | Sensor off skin | `span.chip` | LIVE (re-test) | fresh-page re-test: classSig,attrSig,paneSig,bodyLen,paneLen,paneHtmlLen |
| SURGEON | SENSOR | AI: CRI-Net · Predicts collapse | `span.pMark.aiAttr` | LIVE | nShow: 0 -> 1; focus: "navOpen standby notdeployed map3d" -> "pMark aiAttr" |
| SURGEON | DOCTRINE | AI: MiniLM · Quotes doctrine | `span.pMark.aiAttr` | LIVE | nShow: 0 -> 1; focus: "navOpen standby notdeployed map3d" -> "pMark aiAttr" |
| SURGEON | DOCTRINE | the encoder and how it was measured | `#sgDocMore` | LIVE | nShow: 1 -> 0; nAriaExp: 3 -> 4; nAriaExpF: 20 -> 19; focus: "pMark aiAttr" -> "sgDocMore" |
| SURGEON | DOCTRINE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; focus: "sgDocMore" -> "pMark detAttr pmC" |
| SURGEON | DOCTRINE | NOT AI | `span.pMark.detAttr.pmC` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 6085 -> 26119 |
| SURGEON | DOCTRINE | NOT AI | `span.pMark.detAttr.pmC` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 6085 -> 26119 |
| SURGEON | DOCTRINE | NOT AI | `span.pMark.detAttr.pmC` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 6085 -> 26119 |
| SURGEON | DOCTRINE | AI: MiniLM · Quotes doctrine | `span.pMark.aiAttr` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 6085 -> 26130 |
| SURGEON | DOCTRINE | MARCH — the sequence | `span.chip[data-sg="ask"]` | LIVE | nShow: 1 -> 0; focus: "pMark aiAttr" -> "navOpen standby notdeployed map3d" |
| SURGEON | DOCTRINE | Whole blood or components in haemorrhagic sh | `span.chip[data-sg="ask"]` | LIVE (re-test) | fresh-page re-test: bodyLen: 6085 -> 6125; paneLen: 4535 -> 4575; paneHtmlLen: 22700 -> 22716 |
| SURGEON | DOCTRINE | TXA — how late is too late | `span.chip[data-sg="ask"]` | LIVE (re-test) | fresh-page re-test: bodyLen: 6085 -> 5859; paneLen: 4535 -> 4309; paneHtmlLen: 22700 -> 22474 |
| SURGEON | DOCTRINE | Tourniquet conversion after two hours | `span.chip[data-sg="ask"]` | LIVE (re-test) | fresh-page re-test: bodyLen: 6085 -> 5897; paneLen: 4535 -> 4347; paneHtmlLen: 22700 -> 22488 |
| SURGEON | DOCTRINE | Blood out of refrigeration | `span.chip[data-sg="ask"]` | LIVE (re-test) | fresh-page re-test: bodyLen: 6085 -> 6087; paneLen: 4535 -> 4537; paneHtmlLen: 22700 -> 22702 |
| SURGEON | DOCTRINE | Freeze-dried plasma — storage and reconstitu | `span.chip[data-sg="ask"]` | LIVE (re-test) | fresh-page re-test: bodyLen: 6085 -> 5657; paneLen: 4535 -> 4107; paneHtmlLen: 22700 -> 22248 |
| SURGEON | DOCTRINE | Prolonged casualty care when evacuation is d | `span.chip[data-sg="ask"]` | LIVE (re-test) | fresh-page re-test: bodyLen: 6085 -> 5949; paneLen: 4535 -> 4399; paneHtmlLen: 22700 -> 22540 |
| SURGEON | DOCTRINE | What a Role 2 can do that a Role 1 cannot | `span.chip[data-sg="ask"]` | LIVE (re-test) | fresh-page re-test: bodyLen: 6085 -> 5907; paneLen: 4535 -> 4357; paneHtmlLen: 22700 -> 22498 |
| SURGEON | DOCTRINE | Search | `#docGo` | LIVE (re-test) | fresh-page re-test: bodyLen: 6085 -> 6087; paneLen: 4535 -> 4537; paneHtmlLen: 22700 -> 22702 |
| SURGEON | DOCTRINE | AI: MiniLM · Quotes doctrine | `span.pMark.aiAttr` | LIVE | nShow: 0 -> 1; focus: "docGo" -> "navOpen standby notdeployed map3d" |
| SURGEON | DOCTRINE | AI: MiniLM | `span.pMark.aiAttr.pmC` | LIVE | nShow: 0 -> 1; focus: "navOpen standby notdeployed map3d" -> "pMark aiAttr pmC" |
| SURGEON | TASKING | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 2419 -> 22453; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr" |
| SURGEON | TASKING | Approve all pending | `#btnApproveAll` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; bodyLen: 3100 -> 2452; focus: "pMark detAttr" -> "btnApproveAll" |
| SURGEON | TASKING | the escalation policy | `#sgTaskingMore` | LIVE | nAriaExp: 4 -> 5; nAriaExpF: 22 -> 21; bodyLen: 2452 -> 3700; paneLen: 1363 -> 2611; paneHtmlLen: 14536 -> 14… |
| SURGEON | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3700 -> 23734; focus: "sgTaskingMore" -> "pMark detAttr pmC" |
| SURGEON | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4281 -> 23734 |
| SURGEON | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4248 -> 23701 |
| SURGEON | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4248 -> 23701 |
| SURGEON | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4248 -> 23701 |
| SURGEON | TASKING | + | `button.gpFold` | LIVE | nShow: 1 -> 0; nAriaExp: 5 -> 6; nAriaExpF: 21 -> 20; bodyLen: 4248 -> 3821; paneLen: 2611 -> 2765; paneHtmlL… |
| SURGEON | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 2904 -> 22938 |
| SURGEON | TASKING | Open launch point → | `button.mini` | LIVE | view: "TASKING" -> "LAUNCHPOINTS"; nSelected: 0 -> 1; toolLen: 192 -> 196; bodyLen: 3821 -> 2253; paneLen: 27… |
| SURGEON | TASKING | + | `button.gpFold` | LIVE | nAriaExp: 6 -> 7; nAriaExpF: 20 -> 19; bodyLen: 3821 -> 3975; paneLen: 2765 -> 2919; paneHtmlLen: 14731 -> 14… |
| SURGEON | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3975 -> 24009; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| SURGEON | TASKING | Open launch point → | `button.mini` | LIVE | view: "TASKING" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 192 -> 196; bodyLen: 4554 -> 2253; paneLen: 2919 -… |
| SURGEON | TASKING | + | `button.gpFold` | LIVE | nAriaExp: 7 -> 8; nAriaExpF: 19 -> 18; bodyLen: 3975 -> 4128; paneLen: 2919 -> 3072; paneHtmlLen: 14922 -> 15… |
| SURGEON | TASKING | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 4128 -> 24162; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| SURGEON | TASKING | Open launch point → | `button.mini` | LIVE | view: "TASKING" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 192 -> 196; bodyLen: 4707 -> 2253; paneLen: 3072 -… |
| SURGEON | TASKING (expanded) | hide the escalation policy | `#sgTaskingMore` | LIVE | nAriaExp: 8 -> 7; nAriaExpF: 18 -> 19; bodyLen: 4128 -> 2880; paneLen: 3072 -> 1824; paneHtmlLen: 15112 -> 15… |
| SURGEON | TASKING (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 7 -> 6; nAriaExpF: 19 -> 20; bodyLen: 2880 -> 2726; paneLen: 1824 -> 1670; paneHtmlLen: 15108 -> 14… |
| SURGEON | TASKING (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 6 -> 5; nAriaExpF: 20 -> 21; bodyLen: 2726 -> 2572; paneLen: 1670 -> 1516; paneHtmlLen: 14917 -> 14… |
| SURGEON | TASKING (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 5 -> 4; nAriaExpF: 21 -> 22; bodyLen: 2572 -> 2419; paneLen: 1516 -> 1363; paneHtmlLen: 14726 -> 14… |
| SURGEON | TASKING (expanded) | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 2419 -> 22453; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| SURGEON | UNITS | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 2545 -> 22579; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr" |
| SURGEON | UNITS | Poll all units now | `#btnPingAll` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; bodyLen: 3207 -> 2592; paneHtmlLen: 17106 -> 17096; focus: "pMark detAttr" -> … |
| SURGEON | UNITS | the relay and the poll log | `#sgUnitsMore` | LIVE | nAriaExp: 4 -> 5; nAriaExpF: 23 -> 22; bodyLen: 2592 -> 3107; paneLen: 1476 -> 1991; paneHtmlLen: 17096 -> 17… |
| SURGEON | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3107 -> 23141; focus: "sgUnitsMore" -> "pMark detAttr pmC" |
| SURGEON | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3686 -> 23141 |
| SURGEON | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3639 -> 23094 |
| SURGEON | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3639 -> 23094 |
| SURGEON | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 3639 -> 23094 |
| SURGEON | UNITS | Poll health status | `button.mini.ping` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; bodyLen: 3639 -> 3105; focus: "pMark detAttr pmC" -> "mini ping" |
| SURGEON | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3105 -> 23139; focus: "mini ping" -> "pMark detAttr pmC" |
| SURGEON | UNITS | Poll health status | `button.mini.ping` | LIVE | nShow: 1 -> 0; nToast: 1 -> 2; bodyLen: 3684 -> 3150; focus: "pMark detAttr pmC" -> "mini ping" |
| SURGEON | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3150 -> 23184; focus: "mini ping" -> "pMark detAttr pmC" |
| SURGEON | UNITS | Poll health status | `button.mini.ping` | LIVE | nShow: 1 -> 0; bodyLen: 3729 -> 3150; focus: "pMark detAttr pmC" -> "mini ping" |
| SURGEON | UNITS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3150 -> 23184; focus: "mini ping" -> "pMark detAttr pmC" |
| SURGEON | UNITS | Poll health status | `button.mini.ping` | LIVE | nShow: 1 -> 0; nToast: 1 -> 2; bodyLen: 3684 -> 3150; focus: "pMark detAttr pmC" -> "mini ping" |
| SURGEON | FLOW | NOT AI ARITHMETIC | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; paneLen: 922 -> 929; paneHtmlLen: 7110 -> 7880; focus: "navOpen standby notdeployed map3d" -> … |
| SURGEON | FLOW | NOT AI | `span.pMark.detAttr.pmC` | LIVE | paneLen: 922 -> 929; paneHtmlLen: 7110 -> 7880; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| SURGEON | FLOW | NOT AI | `span.pMark.detAttr.pmC` | LIVE | paneLen: 922 -> 929; paneHtmlLen: 7110 -> 7880 |
| SURGEON | FLOW | NOT AI | `span.pMark.detAttr.pmC` | LIVE | paneLen: 922 -> 929; paneHtmlLen: 7110 -> 7880 |
| SURGEON | FLOW | NOT AI | `span.pMark.detAttr.pmC` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 2466 -> 22507 |
| SURGEON | FLOW | NOT AI | `span.pMark.detAttr.pmC` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 2466 -> 22500 |
| SURGEON | FLOW | the mission clock, six ways | `button.sgMore[data-sg="foldFlow"]` | LIVE | nShow: 1 -> 0; nAriaExp: 5 -> 6; nAriaExpF: 23 -> 22; paneLen: 922 -> 917; paneHtmlLen: 7110 -> 7104; focus: … |
| ANALYST | GLOBAL@DECIDE | ANGEL SWARM v3.5 | `#btnHome` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| ANALYST | GLOBAL@DECIDE | JOA CORAL ▾ | `#btnOpPick` | LIVE | bodyClass: "navOpen standby notdeployed" -> "navOpen standby notdeployed opPickOpen"; nAriaExp: 3 -> 4; nHidd… |
| ANALYST | GLOBAL@DECIDE | PACOM | `span.chip.on[data-theaterpick="PACOM"]` | LIVE | view: "DECIDE" -> "DASHBOARD"; bodyClass: "navOpen standby notdeployed" -> "navOpen standby notdeployed theat… |
| ANALYST | GLOBAL@DECIDE | EUCOM | `span.chip[data-theaterpick="EUCOM"]` | LIVE | view: "DECIDE" -> "DASHBOARD"; bodyClass: "navOpen standby notdeployed theater3d" -> "navOpen standby notdepl… |
| ANALYST | GLOBAL@DECIDE | ◈ ANGEL SWARM | `span.chip.act[data-active="on"]` | LIVE | bodyClass: "navOpen standby notdeployed theater3d" -> "navOpen notdeployed theater3d"; nToast: 0 -> 1; bodyLe… |
| ANALYST | GLOBAL@DECIDE | STANDBY | `span.chip.act.on[data-active="off"]` | ERROR | vanished before press |
| ANALYST | GLOBAL@DECIDE | Deploy → | `#btnDeployBar` | LIVE | nShow: 0 -> 1; nOn: 30 -> 33; bodyLen: 6144 -> 6975; focus: "navOpen notdeployed theater3d" -> "btnDeployBar" |
| ANALYST | GLOBAL@DECIDE | EXERCISE | `span.chip.on[data-opmode="EXERCISE"]` | NOOP-already-selected | focus: "btnDeployBar" -> "navOpen notdeployed theater3d" |
| ANALYST | GLOBAL@DECIDE | LIVE | `span.chip[data-opmode="LIVE"]` | LIVE | bodyClass: "navOpen notdeployed theater3d" -> "navOpen notdeployed theater3d livemode"; bodyLen: 6144 -> 6155… |
| ANALYST | GLOBAL@DECIDE | COMMANDER | `span.chip[data-roleset="COMMANDER"]` | LIVE | role: "ANALYST" -> "COMMANDER"; bodyAttrs: "ANALYST\|console-dark" -> "COMMANDER\|console-dark"; nOn: 33 -> 34;… |
| ANALYST | GLOBAL@DECIDE | LOGISTICIAN | `span.chip[data-roleset="LOGISTICIAN"]` | LIVE | role: "ANALYST" -> "LOGISTICIAN"; bodyAttrs: "ANALYST\|console-dark" -> "LOGISTICIAN\|console-dark"; cmdLen: 17… |
| ANALYST | GLOBAL@DECIDE | SURGEON | `span.chip[data-roleset="SURGEON"]` | LIVE | role: "ANALYST" -> "SURGEON"; bodyAttrs: "ANALYST\|console-dark" -> "SURGEON\|console-dark"; inspLen: 732 -> 67… |
| ANALYST | GLOBAL@DECIDE | ANALYST | `span.chip.on[data-roleset="ANALYST"]` | NOOP-already-selected | focus: "chip" -> "chip on" |
| ANALYST | GLOBAL@DECIDE | Console dark | `#btnTheme` | LIVE | nShow: 0 -> 1; nOn: 33 -> 35; nAriaExp: 3 -> 4; nHidden: 2 -> 1; cmdLen: 177 -> 533; nAriaExpF: 17 -> 16; bod… |
| ANALYST | GLOBAL@DECIDE | {Who decides, and who answers for it} | `#btnAcct` | LIVE | nShow: 0 -> 1; bodyLen: 6063 -> 12988; focus: "btnTheme" -> "btnAcct" |
| ANALYST | GLOBAL@DECIDE | {Model & sources} | `#btnModel` | LIVE | nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 6063 -> 26097; focus: "btnAcct" -> "btnModel" |
| ANALYST | GLOBAL@DECIDE | [Back to the theater overview] | `#btnBackTheater` | LIVE | view: "DECIDE" -> "DASHBOARD"; bodyClass: "navOpen notdeployed theater3d livemode" -> "navOpen notdeployed th… |
| ANALYST | GLOBAL@DECIDE | − | `#btnZoomOut` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| ANALYST | GLOBAL@DECIDE | 1.0× | `#zoomLabel` | NOT-A-CONTROL | — |
| ANALYST | GLOBAL@DECIDE | + | `#btnZoomIn` | LIVE | zoom: 1 -> 1.5 |
| ANALYST | GLOBAL@DECIDE | Fit | `#btnZoomFit` | LIVE | zoom: 1.5 -> 1 |
| ANALYST | GLOBAL@DECIDE | Single | `span.chip.on[data-mapview="COP"]` | NOOP-already-selected | — |
| ANALYST | GLOBAL@DECIDE | Side by side | `span.chip[data-mapview="COMPARE"]` | LIVE | mapView: "COP" -> "COMPARE"; nOn: 34 -> 35 |
| ANALYST | GLOBAL@DECIDE | Theatre | `span.chip[data-mapscope="THEATRE"]` | LIVE | view: "DECIDE" -> "DASHBOARD"; bodyClass: "navOpen notdeployed theater3d livemode" -> "navOpen notdeployed th… |
| ANALYST | GLOBAL@DECIDE | Tactical | `span.chip[data-mapscope="2D"]` | LIVE | view: "DECIDE" -> "MISSION"; bodyClass: "navOpen notdeployed theater3d livemode" -> "navOpen notdeployed thea… |
| ANALYST | GLOBAL@DECIDE | Tactical 3D | `span.chip[data-mapscope="3D"]` | LIVE | view: "DECIDE" -> "MISSION"; mapMode: "2D" -> "3D"; bodyClass: "navOpen standby notdeployed" -> "navOpen stan… |
| ANALYST | GLOBAL@DECIDE | V | `span.chip.mmKey` | NOT-A-CONTROL | — |
| ANALYST | GLOBAL@DECIDE | e.g. CAS-084 · LP 2 KILO · blood ⌘K | `#btnSearch` | LIVE | nShow: 0 -> 1; nSelected: 0 -> 1; bodyLen: 6052 -> 6526 |
| ANALYST | GLOBAL@DECIDE | {Reset run (R)} | `#btnReset` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| ANALYST | GLOBAL@DECIDE | ▶ | `#btnPlay` | LIVE | running: false -> true; nOn: 30 -> 31; inspHtmlLen: 3659 -> 3660; toolLen: 191 -> 190; bodyLen: 6052 -> 6198;… |
| ANALYST | GLOBAL@DECIDE | 1× | `span.chip[data-speed="1"]` | LIVE | speed: 2 -> 1 |
| ANALYST | GLOBAL@DECIDE | 2× | `span.chip.on[data-speed="2"]` | NOOP-already-selected | — |
| ANALYST | GLOBAL@DECIDE | 4× | `span.chip[data-speed="4"]` | LIVE | speed: 2 -> 4 |
| ANALYST | GLOBAL@DECIDE | 10× | `span.chip[data-speed="10"]` | LIVE | speed: 2 -> 10 |
| ANALYST | GLOBAL@DECIDE | INGEST OFF | `#ingestChip` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| ANALYST | GLOBAL@DECIDE | Overview | `a.navItem.big.on[data-view="DECIDE"]` | NOOP-already-selected | — |
| ANALYST | GLOBAL@DECIDE | Map | `a.navItem.big[data-view="MISSION"]` | LIVE | view: "DECIDE" -> "MISSION"; nOpen: 0 -> 1; nOn: 30 -> 44; nAriaPress: 0 -> 9; toolLen: 191 -> 186; bodyLen: … |
| ANALYST | GLOBAL@DECIDE | Casualties | `a.navItem.big[data-view="CASUALTIES"]` | LIVE | view: "DECIDE" -> "CASUALTIES"; toolLen: 191 -> 193; nAriaExpF: 15 -> 18; bodyLen: 6052 -> 3347; paneLen: 440… |
| ANALYST | GLOBAL@DECIDE | Aircraft | `a.navItem.big[data-view="FLEET"]` | LIVE | view: "DECIDE" -> "FLEET"; nAriaExpF: 18 -> 21; bodyLen: 6052 -> 2827; paneLen: 4401 -> 1176; paneHtmlLen: 25… |
| ANALYST | GLOBAL@DECIDE | Launch points | `a.navItem.big[data-view="LAUNCHPOINTS"]` | LIVE | view: "DECIDE" -> "LAUNCHPOINTS"; toolLen: 191 -> 196; nAriaExpF: 21 -> 24; bodyLen: 6052 -> 2816; paneLen: 4… |
| ANALYST | GLOBAL@DECIDE | Supplies | `a.navItem.big[data-view="SUPPLY"]` | LIVE | view: "DECIDE" -> "SUPPLY"; nAriaExpF: 24 -> 27; bodyLen: 6052 -> 2947; paneLen: 4401 -> 1297; paneHtmlLen: 2… |
| ANALYST | GLOBAL@DECIDE | Approvals | `a.navItem.big[data-view="TASKING"]` | LIVE | view: "DECIDE" -> "TASKING"; toolLen: 191 -> 192; nAriaExpF: 27 -> 30; bodyLen: 6052 -> 3891; paneLen: 4401 -… |
| ANALYST | GLOBAL@DECIDE | Scenarios | `a.navItem.big[data-view="CONFIDENCE"]` | LIVE | view: "DECIDE" -> "CONFIDENCE"; nOn: 40 -> 41; toolLen: 191 -> 192; bodyLen: 6052 -> 4568; paneLen: 4401 -> 2… |
| ANALYST | GLOBAL@DECIDE | After-action report | `a.navItem.big[data-view="AFTERACTION"]` | LIVE | view: "DECIDE" -> "AFTERACTION"; toolLen: 191 -> 202; bodyLen: 6052 -> 5080; paneLen: 4401 -> 3419; paneHtmlL… |
| ANALYST | GLOBAL@DECIDE | Show every destination | `#btnNavAll` | LIVE | nOn: 40 -> 41; nAriaPress: 9 -> 10; railLen: 157 -> 449; nAriaPressF: 1 -> 0; bodyLen: 6052 -> 6344 |
| ANALYST | GLOBAL@DECIDE | Search everything | `#btnPalette` | LIVE | nShow: 0 -> 1; nSelected: 0 -> 1; bodyLen: 6344 -> 6818 |
| ANALYST | GLOBAL@DECIDE | ◍ Sound off | `#audBtn` | LIVE | nOn: 41 -> 42; railLen: 449 -> 454; bodyLen: 6344 -> 6349 |
| ANALYST | GLOBAL@DECIDE | Settings | `a.navItem[data-view="SETTINGS"]` | LIVE | view: "DECIDE" -> "SETTINGS"; bodyLen: 6349 -> 4753; paneLen: 4401 -> 2805; paneHtmlLen: 25634 -> 10736 |
| ANALYST | GLOBAL@DECIDE | [Previous] | `button.nsp-tb` | NOOP-disabled | — |
| ANALYST | GLOBAL@DECIDE | [Run or pause] | `button.nsp-tb.hi` | LIVE | running: false -> true; nOn: 42 -> 43; inspHtmlLen: 3659 -> 3660; toolLen: 191 -> 190; bodyLen: 6349 -> 6495;… |
| ANALYST | GLOBAL@DECIDE | [Next] | `button.nsp-tb` | NOOP-disabled | — |
| ANALYST | GLOBAL@DECIDE | RUN SUMMARY | `div.nsp-sec` | LIVE | nAriaExp: 3 -> 2; inspLen: 732 -> 291; inspHtmlLen: 3659 -> 2214; nAriaExpF: 15 -> 16; nShut: 0 -> 1; bodyLen… |
| ANALYST | GLOBAL@DECIDE | LATEST EVENTS | `div.nsp-sec` | LIVE | nAriaExp: 2 -> 1; inspLen: 291 -> 243; inspHtmlLen: 2214 -> 2080; nAriaExpF: 16 -> 17; nShut: 1 -> 2; bodyLen… |
| ANALYST | GLOBAL@DECIDE | TAGS | `div.nsp-sec` | LIVE | nAriaExp: 1 -> 0; inspLen: 243 -> 191; inspHtmlLen: 2080 -> 1786; nAriaExpF: 17 -> 18; nShut: 2 -> 3; bodyLen… |
| ANALYST | GLOBAL@DECIDE | Theatre map | `button.ri` | LIVE | view: "DECIDE" -> "DASHBOARD"; nOn: 30 -> 33; toolLen: 191 -> 186; bodyLen: 5511 -> 4736; paneLen: 4401 -> 35… |
| ANALYST | GLOBAL@DECIDE | Tactical map | `button.ri` | LIVE | view: "DECIDE" -> "MISSION"; nOn: 30 -> 33; toolLen: 191 -> 186; bodyLen: 5511 -> 1542; paneLen: 4401 -> 342;… |
| ANALYST | GLOBAL@DECIDE | Tactical map, 3D | `button.ri` | LIVE | view: "DECIDE" -> "MISSION"; nOpen: 0 -> 1; nOn: 30 -> 44; nAriaPress: 0 -> 9; toolLen: 191 -> 186; bodyLen: … |
| ANALYST | GLOBAL@DECIDE | Approvals awaiting a human | `button.ri[data-act="approvals"]` | LIVE | view: "DECIDE" -> "TASKING"; toolLen: 191 -> 192; nAriaExpF: 18 -> 21; bodyLen: 5511 -> 3350; paneLen: 4401 -… |
| ANALYST | GLOBAL@DECIDE | Keyboard shortcuts (?) | `button.ri[data-act="keys"]` | LIVE | nShow: 0 -> 1; bodyLen: 5511 -> 7402 |
| ANALYST | GLOBAL@MISSION | Tactical 3D | `span.chip.on[data-mapscope="3D"]` | NOOP-already-selected | focus: "ri" -> "chip on" |
| ANALYST | GLOBAL@MISSION | Overview | `a.navItem.big[data-view="DECIDE"]` | LIVE | view: "MISSION" -> "DECIDE"; nOn: 44 -> 40; toolLen: 186 -> 191; bodyLen: 2516 -> 5511; paneLen: 1340 -> 4401… |
| ANALYST | GLOBAL@MISSION | Map | `a.navItem.big.on[data-view="MISSION"]` | NOOP-already-selected | — |
| ANALYST | GLOBAL@MISSION | Map layers | `button.ri.on[data-act="legend"]` | LIVE | nOn: 44 -> 43; bodyLen: 2516 -> 1713; paneLen: 1340 -> 537; paneHtmlLen: 53335 -> 53342; focus: "navOpen stan… |
| ANALYST | GLOBAL@MISSION | Draw every layer | `button.ri[data-act="layersAll"]` | LIVE | nOn: 43 -> 34; nAriaPress: 9 -> 0; nAriaPressF: 1 -> 10; bodyLen: 1713 -> 1712; paneLen: 537 -> 536; paneHtml… |
| ANALYST | GLOBAL@MISSION | Fit the area of operations | `button.ri[data-act="fit"]` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| ANALYST | GLOBAL@MISSION | Zoom in | `button.ri[data-act="zoomIn"]` | LIVE | paneHtmlLen: 53324 -> 53325 |
| ANALYST | GLOBAL@MISSION | Zoom out | `button.ri[data-act="zoomOut"]` | LIVE | paneHtmlLen: 53325 -> 53324 |
| ANALYST | GLOBAL@MISSION | Tactical map, 3D | `button.ri.on` | NOOP-already-selected | focus: "ri" -> "ri on" |
| ANALYST | DECIDE | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 5511 -> 25545; focus: "ri" -> "pMark detAttr" |
| ANALYST | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 6225 -> 25545; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| ANALYST | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 6211 -> 25545 |
| ANALYST | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 6090 -> 25545 |
| ANALYST | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 6090 -> 25545 |
| ANALYST | DECIDE | Send the drones → | `button.btn.ok[data-deploy="1"]` | LIVE | nOn: 31 -> 34; bodyLen: 6090 -> 6342; focus: "pMark detAttr pmC" -> "btn ok" |
| ANALYST | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5511 -> 25545; focus: "btn ok" -> "pMark detAttr pmC" |
| ANALYST | DECIDE | AI: CRI-Net | `span.pMark.aiAttr.pmC` | LIVE | bodyLen: 6090 -> 25545; focus: "pMark detAttr pmC" -> "pMark aiAttr pmC" |
| ANALYST | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 6170 -> 25545; focus: "pMark aiAttr pmC" -> "pMark detAttr pmC" |
| ANALYST | DECIDE | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | bodyLen: 6148 -> 25545; focus: "pMark detAttr pmC" -> "pMark detAttr" |
| ANALYST | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 6211 -> 25545; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| ANALYST | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 6090 -> 25545 |
| ANALYST | DECIDE | + TRV-150C | `button.cqAddB` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; bodyLen: 6148 -> 5607; paneLen: 4401 -> 4419; paneHtmlLen: 25634 -> 25770; foc… |
| ANALYST | DECIDE | + Soaring M25 | `button.cqAddB` | LIVE | nToast: 1 -> 2; bodyLen: 5607 -> 5706; paneLen: 4419 -> 4440; paneHtmlLen: 25770 -> 25909 |
| ANALYST | DECIDE | + FVR-90 (Crimson) | `button.cqAddB` | LIVE | nToast: 2 -> 3; bodyLen: 5706 -> 5811; paneLen: 4440 -> 4466; paneHtmlLen: 25909 -> 26054 |
| ANALYST | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5811 -> 25845; focus: "navOpen standby notdeployed theater3d map3d" -> "pMark detAttr… |
| ANALYST | DECIDE | + TRV-150C | `button.cqAddB` | LIVE | nShow: 1 -> 0; nToast: 2 -> 3; bodyLen: 6370 -> 5828; paneLen: 4466 -> 4484; paneHtmlLen: 26054 -> 26190; foc… |
| ANALYST | DECIDE | + Soaring M25 | `button.cqAddB` | LIVE | nToast: 2 -> 3; bodyLen: 5750 -> 5848; paneLen: 4484 -> 4505; paneHtmlLen: 26190 -> 26329 |
| ANALYST | DECIDE | + FVR-90 (Crimson) | `button.cqAddB` | LIVE | nToast: 2 -> 3; bodyLen: 5770 -> 5873; paneLen: 4505 -> 4531; paneHtmlLen: 26329 -> 26473 |
| ANALYST | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5873 -> 25907; focus: "navOpen standby notdeployed theater3d map3d" -> "pMark detAttr… |
| ANALYST | DECIDE | + TRV-150C | `button.cqAddB` | LIVE | nShow: 1 -> 0; nToast: 2 -> 3; bodyLen: 6433 -> 5892; paneLen: 4531 -> 4549; paneHtmlLen: 26473 -> 26610; foc… |
| ANALYST | DECIDE | + Soaring M25 | `button.cqAddB` | LIVE | nToast: 2 -> 3; bodyLen: 5815 -> 5914; paneLen: 4549 -> 4570; paneHtmlLen: 26610 -> 26750 |
| ANALYST | DECIDE | + FVR-90 (Crimson) | `button.cqAddB` | LIVE | nToast: 2 -> 3; bodyLen: 5837 -> 5941; paneLen: 4570 -> 4596; paneHtmlLen: 26750 -> 26895 |
| ANALYST | DECIDE | − | `button` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| ANALYST | DECIDE | + | `button` | LIVE | nDisabled: 3 -> 2; bodyLen: 5863 -> 5887; paneLen: 4596 -> 4620; paneHtmlLen: 26895 -> 26958; focus: "BUTTON"… |
| ANALYST | DECIDE | − | `button` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| ANALYST | DECIDE | + | `button` | LIVE | nDisabled: 3 -> 2; bodyLen: 5511 -> 5535; paneLen: 4401 -> 4425; paneHtmlLen: 25634 -> 25697 |
| ANALYST | DECIDE | − | `button` | DEAD | no state change (PIXELS ANIMATED - inconclusive) |
| ANALYST | DECIDE | + | `button` | LIVE | bodyLen: 5535 -> 5536; paneLen: 4425 -> 4426; paneHtmlLen: 25697 -> 25698 |
| ANALYST | DECIDE | Choose how many first | `button.mini.ok` | ERROR | vanished before press |
| ANALYST | DECIDE | LITTORAL LIGHT 2× Soaring M25 · 4× TRV-150C  | `button.cqPkg` | LIVE | nToast: 0 -> 3; bodyLen: 5536 -> 5910; paneLen: 4426 -> 4566; paneHtmlLen: 25698 -> 26667 |
| ANALYST | DECIDE | BLUE-WATER REACH 2× TRV-150C · 3× FVR-90 (Cr | `button.cqPkg` | LIVE | bodyLen: 5910 -> 6024; paneLen: 4566 -> 4680; paneHtmlLen: 26667 -> 27374 |
| ANALYST | DECIDE | MASCAL SURGE 8× TRV-150C — maximum slots, mi | `button.cqPkg` | LIVE | bodyLen: 6024 -> 6172; paneLen: 4680 -> 4828; paneHtmlLen: 27374 -> 28471 |
| ANALYST | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 6172 -> 26206 |
| ANALYST | DECIDE | Change operation → | `button.mini` | LIVE | bodyLen: 6751 -> 6332 |
| ANALYST | DECIDE | Change operation → | `button.mini` | LIVE | nShow: 0 -> 1; bodyLen: 6172 -> 6334 |
| ANALYST | DECIDE | Change operation → | `button.mini` | LIVE | nShow: 0 -> 1; bodyLen: 5939 -> 6099 |
| ANALYST | DECIDE | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 5939 -> 25973 |
| ANALYST | DECIDE | ARMED | `span.chip.on` | LIVE | nShow: 1 -> 0; bodyLen: 6545 -> 5940; paneLen: 4828 -> 4829; paneHtmlLen: 28471 -> 28470 |
| ANALYST | SETTINGS | NOT AI WRITTEN RULE | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; bodyLen: 3916 -> 23950; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr" |
| ANALYST | SETTINGS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | bodyLen: 4527 -> 23950; focus: "pMark detAttr" -> "pMark detAttr pmC" |
| ANALYST | SETTINGS | Enabled | `#hitlToggle` | LIVE | nShow: 1 -> 0; nOn: 28 -> 27; nToast: 0 -> 1; bodyLen: 4537 -> 3978; paneLen: 2805 -> 2808; focus: "pMark det… |
| ANALYST | SETTINGS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3978 -> 24012; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| ANALYST | SETTINGS | Fair | `span.chip.on[data-mode="fair"]` | LIVE | nShow: 1 -> 0; bodyLen: 4599 -> 3977; focus: "pMark detAttr pmC" -> "navOpen standby notdeployed map3d" |
| ANALYST | SETTINGS | Realistic | `span.chip[data-mode="realistic"]` | LIVE | mode: "fair" -> "realistic" |
| ANALYST | SETTINGS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| ANALYST | SETTINGS | Enabled | `#tmToggle` | LIVE | nShow: 1 -> 0; paneLen: 2805 -> 2806; paneHtmlLen: 10736 -> 10734; focus: "pMark detAttr pmC" -> "navOpen sta… |
| ANALYST | SETTINGS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| ANALYST | SETTINGS | Rifleman | `span.chip.role` | LIVE | nShow: 1 -> 0; nToast: 0 -> 1; paneHtmlLen: 10734 -> 10737; focus: "pMark detAttr pmC" -> "navOpen standby no… |
| ANALYST | SETTINGS | Team leader | `span.chip.role` | LIVE | nToast: 1 -> 2; paneHtmlLen: 10737 -> 10740 |
| ANALYST | SETTINGS | Combat medic | `span.chip.role` | LIVE | nToast: 2 -> 3; paneHtmlLen: 10740 -> 10743 |
| ANALYST | SETTINGS | JTAC | `span.chip.role` | LIVE | paneHtmlLen: 10743 -> 10746 |
| ANALYST | SETTINGS | EOD technician | `span.chip.role` | LIVE | paneHtmlLen: 10746 -> 10749 |
| ANALYST | SETTINGS | Signals / RTO | `span.chip.role` | LIVE | paneHtmlLen: 10749 -> 10752 |
| ANALYST | SETTINGS | UAS operator | `span.chip.role` | LIVE | paneHtmlLen: 10752 -> 10755 |
| ANALYST | SETTINGS | Combat engineer | `span.chip.role` | LIVE | paneHtmlLen: 10755 -> 10758 |
| ANALYST | SETTINGS | Linguist | `span.chip.role` | LIVE | paneHtmlLen: 10758 -> 10761 |
| ANALYST | SETTINGS | Aircrew | `span.chip.role` | LIVE | paneHtmlLen: 10761 -> 10764 |
| ANALYST | SETTINGS | Sniper / recon | `span.chip.role` | LIVE | paneHtmlLen: 10764 -> 10767 |
| ANALYST | SETTINGS | Clear all | `#btnClearHva` | LIVE | paneHtmlLen: 10767 -> 10734; focus: "navOpen standby notdeployed map3d" -> "btnClearHva" |
| ANALYST | SETTINGS | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 2; focus: "btnClearHva" -> "pMark detAttr pmC" |
| ANALYST | SETTINGS | PACOM | `span.chip.on[data-theaterpick="PACOM"]` | LIVE | view: "SETTINGS" -> "DASHBOARD"; bodyClass: "navOpen standby notdeployed map3d" -> "navOpen standby notdeploy… |
| ANALYST | SETTINGS | EUCOM | `span.chip[data-theaterpick="EUCOM"]` | LIVE | view: "SETTINGS" -> "DASHBOARD"; bodyClass: "navOpen standby notdeployed map3d theater3d" -> "navOpen standby… |
| ANALYST | SETTINGS | Single | `span.chip.on[data-mapview="COP"]` | NOOP-already-selected | — |
| ANALYST | SETTINGS | Side by side | `span.chip[data-mapview="COMPARE"]` | LIVE | mapView: "COP" -> "COMPARE" |
| ANALYST | FLEET | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 2286 -> 22320; focus: "navOpen standby notdeployed map3d" -> "pMark det… |
| ANALYST | FLEET | + | `button.gpFold` | LIVE | nShow: 1 -> 0; nAriaExp: 0 -> 1; nAriaExpF: 21 -> 22; bodyLen: 2962 -> 2632; paneLen: 1176 -> 1522; paneHtmlL… |
| ANALYST | FLEET | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 2632 -> 22666; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| ANALYST | FLEET | Open launch point → | `button.mini` | LIVE | view: "FLEET" -> "LAUNCHPOINTS"; nShow: 1 -> 0; nSelected: 0 -> 1; toolLen: 191 -> 196; bodyLen: 3211 -> 2308… |
| ANALYST | FLEET | + | `button.gpFold` | LIVE | nAriaExp: 1 -> 2; nAriaExpF: 22 -> 23; bodyLen: 2632 -> 2979; paneLen: 1522 -> 1869; paneHtmlLen: 8976 -> 108… |
| ANALYST | FLEET | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 2979 -> 23013; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| ANALYST | FLEET | Open launch point → | `button.mini` | LIVE | view: "FLEET" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; bodyLen: 3558 -> 2308; paneLen: 1869 -> … |
| ANALYST | FLEET | + | `button.gpFold` | LIVE | nAriaExp: 2 -> 3; nAriaExpF: 23 -> 25; bodyLen: 2979 -> 3470; paneLen: 1869 -> 2360; paneHtmlLen: 10845 -> 13… |
| ANALYST | FLEET | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; bodyLen: 3470 -> 23504; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| ANALYST | FLEET | Open launch point → | `button.mini` | LIVE | view: "FLEET" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; bodyLen: 4049 -> 2308; paneLen: 2360 -> … |
| ANALYST | FLEET (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 3 -> 2; nAriaExpF: 25 -> 24; bodyLen: 3470 -> 3145; paneLen: 2360 -> 2035; paneHtmlLen: 13431 -> 13… |
| ANALYST | FLEET (expanded) | M25-01 Soaring M25 READY awaiting tasking 5– | `tr` | ERROR | vanished before press |
| ANALYST | FLEET (expanded) | Hold | `button.mini[data-hold="1"]` | ERROR | vanished before press |
| ANALYST | FLEET (expanded) | TRV-02 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| ANALYST | FLEET (expanded) | Hold | `button.mini[data-hold="2"]` | ERROR | vanished before press |
| ANALYST | FLEET (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 2 -> 1; nAriaExpF: 24 -> 23; bodyLen: 3124 -> 2777; paneLen: 2014 -> 1667; paneHtmlLen: 11562 -> 96… |
| ANALYST | FLEET (expanded) | TRV-03 TRV-150C READY awaiting tasking 12–34 | `tr` | LIVE | nAriaExp: 1 -> 2; nSelected: 1 -> 2; nAriaExpF: 23 -> 22; bodyLen: 2777 -> 3264; paneLen: 1667 -> 2154; paneH… |
| ANALYST | FLEET (expanded) | Hold | `button.mini[data-hold="3"]` | LIVE | nToast: 0 -> 1; bodyLen: 2777 -> 2847; paneLen: 1667 -> 1717; paneHtmlLen: 9693 -> 9748; focus: "TR" -> "navO… |
| ANALYST | FLEET (expanded) | TRV-04 TRV-150C READY awaiting tasking 12–34 | `tr` | LIVE | nAriaExp: 1 -> 2; nSelected: 1 -> 2; nAriaExpF: 23 -> 22; bodyLen: 2847 -> 3355; paneLen: 1717 -> 2225; paneH… |
| ANALYST | FLEET (expanded) | Hold | `button.mini[data-hold="4"]` | LIVE | nToast: 1 -> 2; bodyLen: 2847 -> 2892; paneLen: 1717 -> 1742; paneHtmlLen: 9748 -> 9778; focus: "TR" -> "navO… |
| ANALYST | FLEET (expanded) | FVR-05 FVR-90 (Crimson) READY awaiting taski | `tr` | LIVE | nAriaExp: 1 -> 2; nSelected: 1 -> 2; nAriaExpF: 23 -> 22; bodyLen: 2892 -> 3393; paneLen: 1742 -> 2243; paneH… |
| ANALYST | FLEET (expanded) | Hold | `button.mini[data-hold="5"]` | LIVE | nToast: 1 -> 2; bodyLen: 2872 -> 2916; paneLen: 1742 -> 1766; paneHtmlLen: 9778 -> 9807; focus: "TR" -> "navO… |
| ANALYST | FLEET (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 1 -> 0; nAriaExpF: 23 -> 21; bodyLen: 2916 -> 2351; paneLen: 1766 -> 1201; paneHtmlLen: 9807 -> 7132 |
| ANALYST | FLEET (expanded) | M25-06 Soaring M25 READY awaiting tasking 5– | `tr` | ERROR | vanished before press |
| ANALYST | FLEET (expanded) | Hold | `button.mini[data-hold="6"]` | ERROR | vanished before press |
| ANALYST | FLEET (expanded) | TRV-07 TRV-150C READY awaiting tasking 12–34 | `tr` | ERROR | vanished before press |
| ANALYST | FLEET (expanded) | Hold | `button.mini[data-hold="7"]` | ERROR | vanished before press |
| ANALYST | SUPPLY | NOT AI SCHEDULING | `span.pMark.detAttr` | LIVE | nShow: 0 -> 1; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr" |
| ANALYST | SUPPLY | + | `button.gpFold` | LIVE | nShow: 1 -> 0; nAriaExp: 0 -> 1; nAriaExpF: 24 -> 28; paneLen: 1297 -> 1607; paneHtmlLen: 8659 -> 11853; focu… |
| ANALYST | SUPPLY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| ANALYST | SUPPLY | Open launch point → | `button.mini` | LIVE | view: "SUPPLY" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; paneLen: 1607 -> 1193; paneHtmlLen: 118… |
| ANALYST | SUPPLY | + | `button.gpFold` | LIVE | nAriaExp: 1 -> 2; nAriaExpF: 28 -> 32; paneLen: 1607 -> 1918; paneHtmlLen: 11853 -> 15047 |
| ANALYST | SUPPLY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| ANALYST | SUPPLY | Open launch point → | `button.mini` | LIVE | view: "SUPPLY" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; paneLen: 1918 -> 1193; paneHtmlLen: 150… |
| ANALYST | SUPPLY | + | `button.gpFold` | LIVE | nAriaExp: 2 -> 3; nAriaExpF: 32 -> 36; paneLen: 1918 -> 2228; paneHtmlLen: 15047 -> 18241 |
| ANALYST | SUPPLY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| ANALYST | SUPPLY | Open launch point → | `button.mini` | LIVE | view: "SUPPLY" -> "LAUNCHPOINTS"; nShow: 1 -> 0; toolLen: 191 -> 196; paneLen: 2228 -> 1193; paneHtmlLen: 182… |
| ANALYST | SUPPLY | NOT AI | `span.pMark.detAttr.pmC` | LIVE | nShow: 0 -> 1; focus: "navOpen standby notdeployed map3d" -> "pMark detAttr pmC" |
| ANALYST | SUPPLY | NOT AI | `span.pMark.detAttr.pmC` | LIVE (re-test) | fresh-page re-test: nShow: 0 -> 1; nOff: 0 -> 1; bodyLen: 2947 -> 22981 |
| ANALYST | SUPPLY (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 3 -> 2; nAriaExpF: 36 -> 32; bodyLen: 3337 -> 3027; paneLen: 2228 -> 1918; paneHtmlLen: 18241 -> 15… |
| ANALYST | SUPPLY (expanded) | Whole Blood (1 u) BLOOD 5 0 0 5 | `tr` | LIVE | nAriaExp: 2 -> 3; nSelected: 1 -> 2; nAriaExpF: 32 -> 31; bodyLen: 3027 -> 3447; paneLen: 1918 -> 2338; paneH… |
| ANALYST | SUPPLY (expanded) | Freeze-Dried Plasma PLASMA 4 0 0 4 | `tr` | LIVE | nAriaExp: 2 -> 3; nSelected: 1 -> 2; nAriaExpF: 32 -> 31; bodyLen: 3027 -> 3446; paneLen: 1918 -> 2337; paneH… |
| ANALYST | SUPPLY (expanded) | TXA 2g TXA 9 0 not modelled 9 | `tr` | LIVE | nAriaExp: 2 -> 3; nSelected: 1 -> 2; nAriaExpF: 32 -> 31; bodyLen: 3027 -> 3396; paneLen: 1918 -> 2287; paneH… |
| ANALYST | SUPPLY (expanded) | Hemorrhage Kit HEM KIT 20 0 not modelled 20 | `tr` | LIVE | nAriaExp: 2 -> 3; nSelected: 1 -> 2; nAriaExpF: 32 -> 31; bodyLen: 3027 -> 3407; paneLen: 1918 -> 2298; paneH… |
| ANALYST | SUPPLY (expanded) | Chest Seal / NPA SEAL 9 0 not modelled 9 | `tr` | LIVE | nAriaExp: 2 -> 3; nSelected: 1 -> 2; nAriaExpF: 32 -> 31; bodyLen: 3027 -> 3405; paneLen: 1918 -> 2296; paneH… |
| ANALYST | SUPPLY (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 2 -> 1; nAriaExpF: 32 -> 28; bodyLen: 3027 -> 2716; paneLen: 1918 -> 1607; paneHtmlLen: 15047 -> 11… |
| ANALYST | SUPPLY (expanded) | Whole Blood (1 u) BLOOD 5 0 0 5 | `tr` | LIVE | nAriaExp: 1 -> 2; nSelected: 1 -> 2; nAriaExpF: 28 -> 27; bodyLen: 2716 -> 3136; paneLen: 1607 -> 2027; paneH… |
| ANALYST | SUPPLY (expanded) | Freeze-Dried Plasma PLASMA 4 0 0 4 | `tr` | LIVE | nAriaExp: 1 -> 2; nSelected: 1 -> 2; nAriaExpF: 28 -> 27; bodyLen: 2716 -> 3135; paneLen: 1607 -> 2026; paneH… |
| ANALYST | SUPPLY (expanded) | TXA 2g TXA 9 0 not modelled 9 | `tr` | LIVE | nAriaExp: 1 -> 2; nSelected: 1 -> 2; nAriaExpF: 28 -> 27; bodyLen: 2716 -> 3085; paneLen: 1607 -> 1976; paneH… |
| ANALYST | SUPPLY (expanded) | Hemorrhage Kit HEM KIT 20 0 not modelled 20 | `tr` | LIVE | nAriaExp: 1 -> 2; nSelected: 1 -> 2; nAriaExpF: 28 -> 27; bodyLen: 2716 -> 3096; paneLen: 1607 -> 1987; paneH… |
| ANALYST | SUPPLY (expanded) | Chest Seal / NPA SEAL 9 0 not modelled 9 | `tr` | LIVE | nAriaExp: 1 -> 2; nSelected: 1 -> 2; nAriaExpF: 28 -> 27; bodyLen: 2716 -> 3094; paneLen: 1607 -> 1985; paneH… |
| ANALYST | SUPPLY (expanded) | − | `button.gpFold` | LIVE | nAriaExp: 1 -> 0; nAriaExpF: 28 -> 24; bodyLen: 2716 -> 2406; paneLen: 1607 -> 1297; paneHtmlLen: 11853 -> 86… |
| ANALYST | SUPPLY (expanded) | Whole Blood (1 u) BLOOD 5 0 0 5 | `tr` | ERROR | vanished before press |
| ANALYST | SUPPLY (expanded) | Freeze-Dried Plasma PLASMA 4 0 0 4 | `tr` | ERROR | vanished before press |
| ANALYST | SUPPLY (expanded) | TXA 2g TXA 9 0 not modelled 9 | `tr` | ERROR | vanished before press |
| ANALYST | SUPPLY (expanded) | Hemorrhage Kit HEM KIT 20 0 not modelled 20 | `tr` | ERROR | vanished before press |
| ANALYST | SUPPLY (expanded) | Chest Seal / NPA SEAL 9 0 not modelled 9 | `tr` | ERROR | vanished before press |

