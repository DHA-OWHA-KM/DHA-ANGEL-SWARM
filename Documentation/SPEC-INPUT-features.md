# ANGEL SWARM — SPEC INPUT: FEATURES, CONTROLS AND STATES

**Scope.** The user-facing surface of `/home/build/angel/app`, as served at
`http://127.0.0.1:8791`. Read-only inventory. Nothing in the application was modified.

**Method.** Source read at `/home/build/angel/app/js/*.js` and `index.html`; every behavioural claim
below was then verified in headless Chromium (SwiftShader, 1600×1000) driving the real build. Screenshots
of every state are in
`/tmp/build-0/-home-build/8be0bac1-19e5-5a26-a5c6-5999484e54f4/scratchpad/shots/`.

**Two registers are used throughout and are never merged:**

- **DOES** — what the build does today, verified in a browser.
- **BROKEN** — a defect. Stated as a defect, with the file:line that causes it.

No designs are proposed anywhere in this document.

---

## 0. THE ONE-PARAGRAPH SUMMARY A DESIGNER NEEDS FIRST

The application is a nine-destination shell (`js/shell.js` `NAV`, lines 22–32) that draws itself into
`#dShell` and, by a CSS allow-list (`css/design.css:317`), hides **every other direct child of `<body>`**.
That allow-list is the single most consequential fact about this build. Six dialogs were rescued from it
by hand (`js/shell.js:225`); **the welcome card and the operation picker were not**, and the old command
bar — which held Deploy, Play, Reset, Search, theme, model and the accountability record — is hidden
whole. The consequence is that **a person who opens this application cannot deploy ANGEL SWARM, cannot
start the clock, and therefore cannot reach the comparison that is the entire point of the product,
using any visible control on any of the nine screens.** The only routes are the keyboard (`Space`) and
the command palette (`Ctrl-K`), neither of which is advertised anywhere on screen because the card that
used to advertise them is one of the two things the allow-list ate.

The second most consequential fact: **`#dMain` is rewritten wholesale every 1000 ms** (`js/shell.js:274`).
Every control on every screen is destroyed and recreated once a second. Only `page-chat.js` compensates
(it carries the draft and caret across the rewrite, `js/page-chat.js:297–303`). Everything else loses
focus, selection and any transient state on the next tick.

---

## 1. THE FEATURE INVENTORY

Capabilities, not navigation. The 24 older views (`SECTIONS`, `js/shell.js:39–49`) are folded into the
nine destinations either by **native re-implementation** (a new module draws the same thing from the live
engine) or by **docking** (`DPB.dock()`, `js/page-tty.js:60–75`, adopts the whole old `#views` element
into `#dDock` and positions it over a slot inside the new page). The column below says which.

| # | Capability | What the user does | What happens | What they get | How it is provided |
|---|---|---|---|---|---|
| F1 | **Deploy ANGEL SWARM into the operation** | `Ctrl-K` → "deploy" → `Enter`; or `openDeployModal('ON_DEMAND')` from console | Deploy sheet opens: 7 airframes, 3 launch points, per-site blood/plasma/cold-chain, deselectable sites | Tasking authority transfers to ANGEL SWARM; `APP.angelActive` true; top bar flips `STANDBY — NO AUTHORITY` → `ALLOCATION AUTHORITY` | `app.js:629`, `index.html:1589–1630` |
| F2 | **Run / pause the mission clock** | `Space`, or palette "Run the mission" | Both arms step in lockstep on identical inputs | A live paired battle | `index.html:378` (`#btnPlay`), hidden |
| F3 | **Reset the run** | `R`, or palette "Reset the run" | `APP.t=0`, `deploy.state='NOT_DEPLOYED'` — verified | Cold start again, same seed | `index.html:377` (`#btnReset`), hidden |
| F4 | **Command overview** | Rail → Command Overview | 5 tiles, allocation brief, deadline queue (top 8), escalation card, theater doorway | The state of the fight in one screen | `js/page-dash.js` (native) |
| F5 | **Live casualty board** | Rail → Live Casualties | Every open casualty as a deadline bar, grouped by location or by deadline, with reach, slack, tasking, reading age | Who will be missed, and why | `js/page-cas.js` (native) |
| F6 | **Group the board** | GROUP BY `LOCATION` / `DEADLINE` | Re-groups in place | Two readings of the same board | `js/page-cas.js:104–110` |
| F7 | **Expand the board** | `SHOW EVERY ROW` / `SHOW FEWER` | Lifts the 6-rows-per-group cap | Full register | `js/page-cas.js:170` |
| F8 | **Supply state** | Live Casualties → SUPPLY | Per-launch-point table: whole blood, plasma, TXA, haem kit, chest seal, drawn-down | What is on the shelf and where | `js/page-cas.js:334` (native) |
| F9 | **Fleet state** | Live Casualties → FLEET | Per-airframe: call, platform, launch point, state, carrying, tasked-to, sorties | Where the lift is | `js/page-cas.js:365` (native) |
| F10 | **Launch-point state** | Live Casualties → LAUNCH POINTS | Per-site: siting (ashore/afloat), ready, airborne, lost, sorties, casualties soonest from here | Where the laydown binds | `js/page-cas.js:396` (native) |
| F11 | **Decide an escalation** | Rail → Decision → `AUTHORISE A · COMMIT` or `AUTHORISE B · HOLD` | Calls the engine's own `approveProposal()` / `rejectProposal()`; launches or holds the aircraft; writes an APPROVE/REJECT entry into the hash chain | A real decision, taken and recorded | `js/page-dec.js:42–57` |
| F12 | **See the grounds for escalation** | Decision page, `WHY YOU AND NOT IT` | Names the tripped ground: benefit below threshold, threat transit, last unit off a shelf, triage displacement | Why the machine refused to choose | `js/page-dec.js` |
| F13 | **See what was handled without you** | Decision page, right column | Sorties dispatched under standing authority, with T+ and "no trade-off to state" | The delegation boundary made visible | `js/page-dec.js:277` |
| F14 | **Read the decision record** | Rail → Decision Feed | Every audit entry newest-first, in prose, with `#seq`, actor and `sha`; deaths interleaved with their cause | The accountability record | `js/page-feed.js` (native) |
| F15 | **Filter the record** | `FILTER` → ALL / ESCALATED / AUTHORISED / WITHHELD / DELIVERED / NOT PREVENTED | Filters by entry tag prefix | A slice of the record | `js/page-feed.js:27, 84–88` |
| F16 | **Page the record** | `SHOW 40 EARLIER` | `S.limit += 40` | Older entries | `js/page-feed.js:115` |
| F17 | **Export the record** | `EXPORT FOR IO` | Calls `window.exportAudit()`; **verified download** `angel_swarm_audit.csv` | A CSV of the chain | `js/page-feed.js:53`, `app.js:3009` |
| F18 | **Verify the chain** | Decision Feed, `CHAIN INTEGRITY` panel | Runs `verifyAudit()`; reports `n of n verified` and the head hash, or `CHAIN BROKEN AT ENTRY n` | Tamper evidence | `js/page-feed.js:121–127` |
| F19 | **Ground stream** | Decision Feed → GROUND STREAM | What each aircraft reported: PAYLOAD AWAY / RECOVERED / ADMINISTERED, with relay | Telemetry as reported, distinct from the delivery log | `js/page-feed.js` |
| F20 | **Analyst transcript** | Rail → Analyst Terminal | A synthetic shell session: `angel status`, `angel queue --sort deadline`, `angel escalations`, `angel compare --baseline class-viii-push --same-inputs`, `angel explain --last`, `record verify --chain` | The whole run as a terminal readout | `js/page-tty.js` (native) |
| F21 | **SQL over the run** | Analyst Terminal → SQL CONSOLE | Docks the old QUERY pane: DuckDB v1.1.1 in-tab, 11 tables / 194 columns / both arms under an arm discriminator, preset queries | Query the transactional record | dock → `QUERY` pane, `js/db.js` |
| F22 | **Doctrine retrieval** | Analyst Terminal → DOCTRINE | Docks DOCTRINE: 161 passages, 499 sentences, MiniLM, 8 publications, median search ms | A verbatim doctrine quote with its citation | dock → `DOCTRINE`, `js/doctrine.js` |
| F23 | **Sensor & model** | Analyst Terminal → SENSOR MODEL | Docks SENSOR: CRI-Net 104,162 params, MAE 0.069 vs 0.159, 70 held-out people, 410 KB ONNX; live waveform toy; telemetry ingest card | How the reading is acquired and trusted | dock → `SENSOR`, `js/telemetry.js:255` |
| F24 | **Data file** | Analyst Terminal → DATA FILE | Docks DATA | Provenance of every input | dock → `DATA` |
| F25 | **Ops centre wall** | Rail → Ops Center Wall | Ten-foot-readable: three band figures (tightest deadline / unreachable / awaiting authority), 5-row deadline board, posture block (LTOWB, lift, sorties, vs push, authority, link) | A wall display | `js/page-ops.js` (native) |
| F26 | **Theatre picker** | Ops Center Wall → THEATRE | Docks DASHBOARD: PACOM, 4 operations, per-JOA casualties / still down / airborne / blood forward, `Open →` per operation | The combatant command | dock → `DASHBOARD` |
| F27 | **The counterfactual** | Rail → Evidence | One sentence claim + three tiles (CURRENT — TRIAGE & PROXIMITY / ANGEL SWARM TASKING / TARGET 0), the lever panel, live column, deaths-not-prevented by cause, policy posture | The comparison result | `js/page-ev.js` (native) |
| F28 | **Replication study** | Evidence → REPLICATIONS | Docks CONFIDENCE: replications count, sensitivity parameter (none / fleet size / launch points / datalink outage / triage error), reps per sweep point, metric, `Run replications`, difference distribution | Whether one seed is a finding | dock → `CONFIDENCE`, `js/montecarlo.js` |
| F29 | **Head-to-head compare** | Evidence → COMPARE | Docks COMPARE: the survivable-death bars, and where those deaths came from | The headline claim | dock → `COMPARE` |
| F30 | **Capture a run / sweep / export** | Evidence → ANALYSIS | Docks ANALYSIS: `Capture current run`, `Run 40-run sweep`, `Export JSON`, runs-captured count, full analysis of last mission | A saved run | dock → `ANALYSIS`, `app.js:2298, 3048` |
| F31 | **Return on the capability** | Evidence → RETURN | Docks ROI: blood destroyed, sorties wasted, sorties flown, per-1000 figures, `Measure across 35 runs`, `Export CSV` | The case beyond lives | dock → `ROI`, `app.js:3028` |
| F32 | **Cost** | Evidence → COST | Docks COST: died where the laydown was binding, casualties one airframe reaches or none, `Measure across 35 engagements`, `The full argument, with citations →` | What it costs | dock → `COST` |
| F33 | **After-action report** | Evidence → AFTER ACTION | Docks AFTERACTION: fewer-dead figure, both-arm table, what drove it, what to change (ranked) | The AAR | dock → `AFTERACTION`, `js/page-afteraction.js` |
| F34 | **Ask ANGEL** | Rail → Ask ANGEL; type or press a suggestion | Eight rule-matched resolvers over live state, a refusal rule for "who should I save", else MiniLM retrieval quoting the corpus verbatim | A figure computed from the run, or a quoted passage, or an explicit "I cannot" | `js/page-chat.js` |
| F35 | **Provenance chip discipline** | Any AI-produced answer | Violet `✦` chip marks trained-model output only; arithmetic and retrieval are labelled differently | A defensible AI-provenance claim | `js/page-chat.js`, `js/palette.js` |
| F36 | **Theater map, three renderers** | Rail → Theater Map → THEATRE / TACTICAL 2D / TACTICAL 3D | Docks DASHBOARD / MISSION / MISSION(3D). 2D offers layers + side-by-side both arms; 3D offers the GPU picture with replay scrub, layer set, legend | The fight, at three scales | `js/page-map.js` |
| F37 | **Map camera** | `− ZOOM OUT` / `+ ZOOM IN` / `FIT` | Reaches the active renderer's own camera | Navigation | `js/page-map.js:225` `ORDER` |
| F38 | **Scale-aware controls** | Switch scope | The tool row is rebuilt from a capability table; a control that cannot act in this scope is **absent, not disabled** (3 controls at THEATRE, 6 at 2D, 5 at 3D) | Honest affordances | `js/page-map.js:284–292` |
| F39 | **Command palette** | `Ctrl-K` | Search across views, actions, doctrine passages, SQL presets, scenarios, casualties, themes, roles | The one surface that still reaches everything | `js/palette.js` |
| F40 | **Keyboard sheet** | `?` | Full binding list, grouped: running the mission / the argument / during the run / the record / how it works / who this screen is for / how it looks / anywhere / on the 3D map | Discoverability | `js/palette.js` (`KS`) |
| F41 | **Themes** | `T` / `Shift-T`, or palette | Four themes: console dark, night ops, field slate, high contrast. **Verified**: `T` set `data-theme="night-ops"` and the new shell honoured it | Readability under different lighting | `js/theme.js` |
| F42 | **Role profiles** | `` ` `` or `Alt-1..4` | Cycles COMMANDER / LOGISTICIAN / SURGEON / ANALYST | See §7 — no longer changes the nine-destination rail | `js/role-*.js` |
| F43 | **Model & sources** | Palette → "Model and sources" | Modal: four sets of learned weights, 3 loaded this session, each with what it decides, params, held-out error, licence | The provenance record | `index.html:1647`, `#modal` |
| F44 | **Accountability record** | Palette → "Who decides, and who answers for it" | Modal: where the marks appear, what the ML is precisely, what is deliberately unmarked | The accountability position | `index.html:1680`, `#acctModal` |
| F45 | **Mission-complete summary** | Automatic at `APP.finished` | Modal `#runModal`: fewer-dead headline, cause breakdown, full both-arm table (10 rows), and a "Why" narrative | The result, pushed | `app.js:2249` |
| F46 | **Save the run** | `#runModal` → `Save this run and open the full analysis →` | Guarded: refuses with a toast unless `APP.finished` | A captured run | `app.js:2298` |
| F47 | **Operation switch** | Palette → "Switch operation" | Opens `#opMenu` — see §7, it opens invisible | (nothing reaches the user) | `index.html:1543` |
| F48 | **Scenario switch** | Palette → "Run <scenario>" | Sets `APP.scenarioKey`, calls `resetSim(false)` | A different fight | `js/palette.js:641–660` |
| F49 | **Export CSV / JSON / .sqlite** | Inside docked panes: `Export CSV` (casualties, stream, audit, ROI), `Export JSON` (runs), `Export .sqlite` | Downloads | Data out | `index.html:758, 1089, 1113, 1139, 1232, 1332` |
| F50 | **The film** | — | See §8. Present in the build, unreachable in this shell | — | `index.html:1004–1021` |
| F51 | **Casualty record drawer** | — | See §7. Present in the build (`js/detail.js`), wired only into the old docked panes | — | `js/detail.js:99, 310` |

---

## 2. THE STATE MATRIX

### 2.0 Definitions used in every table below

| State | Precise condition | How it is reached |
|---|---|---|
| **Cold start** | `APP.t === 0`, `APP.deploy.state === 'NOT_DEPLOYED'`, `APP.angelActive === false`, `armA.casualties.length === 0` | Open the page. **This is what a person sees.** |
| **Deployed, clock stopped** | `deploy.state === 'DEPLOYED'`, `angelActive === true`, `t === 0` | Deploy, do not press Space |
| **Running, early** | `t ≈ 20–70`, fewer than ~10 resolved casualties | Space |
| **Running, mid** | `t ≈ 70–150`, board populated, sorties in the air | — |
| **Finished** | `APP.finished === true`, `t = 180`; **`L.open` collapses to 0** | run to completion |
| **Decision pending** | `armA.queue` has ≥1 `PENDING` | occurs naturally (first seen T+19 in seed 42) |
| **Undeployed but running** | clock running, `angelActive === false` — **a real and reachable state**, because Space works without deploying | press Space without deploying |
| **Loading** | `!APP.world` | never observed; at 150 ms after navigation-commit the shell was already fully painted |
| **`L === null`** | `!APP \|\| !APP.world \|\| !APP.armA` (`js/shell.js:98`) | **not reachable in practice** — see the BROKEN note under each table |

> **A note that applies to all nine tables.** Every page module carries an `if (!L)` "Waiting for the run"
> empty state. **None of them is ever seen.** `live()` returns non-null the moment `APP.world` exists,
> which is before first paint. What a person actually sees on a cold start is the *full populated layout
> with zeros in it* — which reads as a finished run with nothing in it, not as a system waiting to start.

---

### 2.1 COMMAND OVERVIEW (`dash`) — `js/page-dash.js`

Fixed furniture in every state: `<h1>Command Overview</h1>`, the subtitle "Every open casualty ranked by
time remaining, not by appearance.", `T+n MIN · LOCAL`, `RE-RUN ALLOCATION`, 5 tiles, Allocation brief,
Deadline queue, Escalation, Live theater.

| State | Tiles | Allocation brief | Deadline queue | Escalation card | Live theater | Verified |
|---|---|---|---|---|---|---|
| **Cold start** | UNREACHABLE **0** casualties · TIGHTEST **—** none open · BLOOD FORWARD **27**U 3 sites · LIFT **7** of 7, 0 airborne · VS CURRENT — TRIAGE & PROXIMITY **—** *not deployed* | one line: `STATE — Nothing is open. No allocation is being made.` (`:116`) | header row only + `No casualty is inside a deadline this system holds.` (`:155`) | `NONE OPEN` + "Nothing is waiting on you. Everything inside standing authority has gone." (`:165`) | grid placeholder, `OPEN THEATER MAP`, `0 airborne · 0 open` | `cold-dash.png` |
| **Deployed, clock stopped** | identical **except** delta tile becomes **`0` / "level, same inputs"** in the red death family | unchanged | unchanged | unchanged | unchanged | `deployed-dash.png` |
| **Running, early** (T+69) | UNREACHABLE **4** · TIGHTEST **00:00** CAS-049 · BLOOD **36**U · LIFT **2** of 7, 5 airborne · delta live | up to 3 lines: `TOP RISK` (worst casualty, with either "No launch point can reach this casualty at all", "arrives N minutes late", or "Inside the reach of N launch points"), `ACTION` (first outbound aircraft), `CHANGE` (n casualties with a reading the network will not act on) | 8 rows: CASUALTY / SITE · MECHANISM / DEADLINE / ARRIVAL / SLACK / TASKING; breach rows red; `NO ASSET` where reach is null | still NONE OPEN unless a proposal is pending | `n airborne · n open` | `early-dash.png` |
| **Running, mid** | same shape, larger figures | same | same | same | same | `pending-dash.png` |
| **Decision pending** | unchanged | unchanged | unchanged | **card turns amber**, header `ESCALATION · AWAITING YOU`, `n open`, "One decision is not delegable under standing authority.", `OPEN THE DECISION →`, note "Failure to decide is recorded with its cost." (`:167–177`) | unchanged | `pending-dash.png` |
| **Finished** (T+180) | UNREACHABLE **0** · TIGHTEST **—** none open · BLOOD **39**U · LIFT **4** of 7, 3 airborne · **VS CURRENT — TRIAGE & PROXIMITY −11 dead, same inputs** | back to `STATE — Nothing is open. No allocation is being made.` | back to the empty message | back to NONE OPEN | `3 airborne · 0 open` | `finished-dash.png` |
| **Undeployed, running** | figures move; delta tile stays **`—` / not deployed** | live | live | NONE OPEN (nothing escalates when ANGEL is not tasking) | live | `undeployed-running-dash.png` |
| **No casualties yet** | = cold start | = cold start | = cold start | — | — | — |
| **Telemetry / link degraded** | **no effect on this page** — the link only shows in the rail's EDGE STATE box | — | — | — | — | — |
| **Loading / error** | not observed | — | — | — | — | — |

**BROKEN — Command Overview**

| # | Defect | Evidence |
|---|---|---|
| B1 | `RE-RUN ALLOCATION` does nothing. The button emits `data-dcmd="rerun"` and **no handler for `dcmd` exists anywhere in the codebase** (`grep -rn dcmd js/ css/ index.html` returns one hit — the button itself). Clicking it left `t`, the queue, the audit length and the rendered text byte-identical. | `js/page-dash.js:49` |
| B2 | **Finished looks like cold start.** At T+180 four of the five tiles, the brief, the queue and the escalation card all return to their zero-state text, because every one of them is driven by `L.open`, which is empty when the run is over. The only cell on the screen that says the run produced a result is the delta tile. Nothing anywhere says "COMPLETE". | `js/shell.js:105–107`, verified `finished-dash.png` vs `cold-dash.png` |
| B3 | **Deployed-at-T+0 asserts a comparison it has not made.** The delta tile reads `0 / level, same inputs` before a single minute has run, because the branch is on `L.deployed`, not on whether anything has been allocated. | `js/page-dash.js:38–43` |
| B4 | There is **no deploy control and no play control** on this screen — the screen a person lands on. | §5 |

---

### 2.2 LIVE CASUALTIES (`cas`) — `js/page-cas.js`

Fixed furniture: `<h1>Live Casualties</h1>`, "n casualties on wearable telemetry. Each bar ends at that
soldier's physiological deadline.", GROUP BY segment, four-tab strip, `T+n MIN · <scenario>`.

| State | CASUALTIES tab | SUPPLY | FLEET | LAUNCH POINTS | Verified |
|---|---|---|---|---|---|
| **Cold start** | subtitle reads **"0 casualties on wearable telemetry"**; three tiles all **0** (MISSED IF NOTHING CHANGES / INSIDE DEADLINE / DEADLINE NOT ASSERTABLE); the time ruler `NOW +10 +20 +30 +40 +50 MIN` is drawn over an empty board; body message "Nothing is open. No casualty is inside a deadline this system holds."; footer "Every open casualty is drawn · 0 groups"; `SHOW EVERY ROW` still offered | populated — 3 launch points, full stock table, `0 issued` | populated — 7 airframes, all `IDLE`, carrying `—`, `0` sorties | populated — 3 sites, ready counts, `0 soonest from here` | `cold-cas.png` |
| **Deployed, clock stopped** | identical to cold start | identical | identical | identical | `deployed-cas.png` |
| **Running, early** (T+69, 41 open) | MISSED **4** (red tile), INSIDE **12**, NOT ASSERTABLE **25**. Groups by location (`CENTRAL KEY`, `EAST SPIT`, …) each with `n casualties · n on tasking · n readings over 2 min old` and a red group verdict `n WILL BE MISSED IF NOTHING CHANGES`. Each row: `CAS-nnn · TRIAGE · ROLE`, mechanism + payload, a bar to the physiological deadline against a fixed 60-min window, a filled transit segment labelled with the reaching site and time, `T-n`, then slack / tasked / reading age. Unreachable rows read `NOTHING REACHES THIS BAR` and `MISS −n`. `+ n further in this group` where capped at 6. | live stock, `n issued` per site | live states: `IDLE` / `OUTBOUND`, `1× FDP, 1× haemorrhage kit`, `TASKED TO CAS-nnn` | live: ready / airborne / lost / sorties per site | `early-cas.png`, `tab-cas-*.png` |
| **Running, mid** | same shape, `SHOW EVERY ROW` matters | same | same | same | — |
| **Decision pending** | footer gains a second button `AUTHORISE n SORTIES →` (`data-page="dec"`) | — | — | — | `js/page-cas.js:171` |
| **Finished** | **collapses entirely back to the cold-start empty board** — "0 casualties on wearable telemetry", three zero tiles, empty ruler | stock as left | fleet as left | sites as left | `finished-cas.png` |
| **Empty group set** | `0 groups` in the footer; the ruler still drawn | — | — | — | — |
| **Degraded: reach model absent** | if `ANGEL.get('grouped')` has not published, arrival is stated as **unknown** rather than guessed — the ARRIVAL column shows `—` and slack shows `NO ASSET` | — | — | — | `js/shell.js:91–102` |
| **Degraded: stale reading** | a row whose reading is older than 2 min is **annotated** `reading n min old` and its reported reserve is dropped — not asserted away | — | — | — | `js/page-cas.js` header comment |

**BROKEN — Live Casualties**

| # | Defect | Evidence |
|---|---|---|
| B5 | **Finished is indistinguishable from cold start.** After a 125-casualty run in which 31 people died, this screen says "0 casualties on wearable telemetry" and draws an empty board. There is no completed-run view. | `finished-cas.png` |
| B6 | **No row opens a record.** `document.querySelectorAll('#dMain [data-dtrow]').length === 0`. The detail drawer (`js/detail.js`) exists and is fully built, but only `page-grouped.js:426` and `page-launchpoints.js:441` — old panes — request regions from it. Clicking a casualty row here changed nothing (2934 chars before, 2934 after). | verified |
| B7 | The three summary tiles and the group verdicts are **rendered identically at T+0 and at T+180** — three zeros — so the reader cannot tell "not started" from "over". | — |

---

### 2.3 DECISION (`dec`) — `js/page-dec.js`

| State | Left column | Right column (always present) | Verified |
|---|---|---|---|
| **Cold start** | `NOTHING REQUIRES YOU` chip, `T+0 MIN`, "Nothing is waiting on you. Everything inside standing authority has already gone, and every escalation raised this shift has been disposed of." — **a claim about a shift that has not happened**; `WHAT WOULD REACH YOU` (the four named grounds); `HANDLED WITHOUT YOU — Nothing has been dispatched under standing authority yet.` | `THEATER STATE`: open 0 / inside deadline 0 / not reachable 0 / whole blood forward 15U 3 sites / lift 7 of 7. `AGAINST CURRENT — TRIAGE & PROXIMITY: —` + "ANGEL SWARM is not deployed. Both arms are running the same current triage and proximity, so there is no difference to report." | `cold-dec.png` |
| **Deployed, clock stopped** | identical | `AGAINST CURRENT — TRIAGE & PROXIMITY: level` + "0 died of survivable wounds under ANGEL SWARM against 0 under current triage and proximity. Same casualties, same aircraft, same blood; the baseline is implemented at its strongest, not as a straw man." | `deployed-dec.png` |
| **Running, no proposal pending** | as cold start, but `HANDLED WITHOUT YOU` fills with real dispatches (`TRV-150C-2 → CAS-18 · dispatched under standing authority · T+20.5 · no trade-off to state`), delivery lines, and a `n casualties carry no asserted deadline / MINIMAL triage` note | live figures | — |
| **Decision pending** (verified at T+24, 1 pending) | chip `1 DECISION REQUIRES YOU`; a lapse line `raised T+19.0 · 05:00 elapsed · authority lapses in 03:00 and the cost of not deciding is written to the record`; a lede assembled from the proposal's own numbers ("TRV-03 at LHA BOXER reaches CAS-011 in 07:54, 7 minutes after the deadline runs out. The expected benefit scored 0, under the threshold…"); **OPTION A · COMMIT** (allocator plan, per-leg reach, expected survival benefit ×100, the standing-authority bar of 10) and **OPTION B · HOLD** (what is not served, deadline, "Nothing flies, so nothing is claimed"); `WHY YOU AND NOT IT` naming the ground; three buttons: `AUTHORISE A · COMMIT`, `AUTHORISE B · HOLD`, `ask ANGEL what else this aircraft could do` | live | `pending-dec.png` |
| **More than one pending** | an `others()` block listing the rest, each with `OPEN →` (`data-dec="focus:id"`) | live | `js/page-dec.js:234` |
| **Just decided** | a `record()` block echoing the entry read back out of the chain — `seq`, `hash`, `actor`, `action`, `detail`, `t` | live | `js/page-dec.js:59–65` |
| **Proposal lapsed** | drops out of PENDING after 8 minutes (`EXPIRE_MIN`); the run summary later reports `n proposals expired unactioned` | — | `js/page-dec.js:31` |
| **Finished** | back to `NOTHING REQUIRES YOU` | delta now real | `finished-dec.png` |

**BROKEN — Decision**

| # | Defect | Evidence |
|---|---|---|
| B8 | **The cold-start copy is false.** "every escalation raised this shift has been disposed of" and "Nothing has been dispatched under standing authority yet" are written for a mid-run lull. At T+0 nothing has been raised, nothing has been dispatched, and no shift has occurred. There is no separate not-started state. | `js/page-dec.js:260–275`, `cold-dec.png` |
| B9 | **Zero controls on the page at cold start.** The enumeration found `0` buttons in `#dMain`. This screen is a dead end until a proposal happens to exist. | verified |
| B10 | Three screens report three different "blood forward" figures from the same shelf at the same instant. `page-dec.js:299` sums `stock.BLOOD` only → **15U · 3 sites**, labelled *Whole blood forward*. `page-dash.js:74–83` sums `BLOOD + PLASMA` → **27U · 3 sites**, labelled *BLOOD FORWARD*. `page-tty.js:193–200` sums `BLOOD + PLASMA` and labels it **LTOWB 27U/3 sites** — the Ops wall repeats it as `LTOWB FORWARD 27U`. LTOWB is whole blood by definition; the figure carrying that label includes plasma. | `js/page-dash.js:74–83`, `js/page-dec.js:299`, `js/page-tty.js:193–200`, `js/page-ops.js` |

---

### 2.4 DECISION FEED (`feed`) — `js/page-feed.js`

Two tabs: `DECISIONS`, `GROUND STREAM`. Right rail is always three panels: THIS SHIFT, DEATHS NOT PREVENTED, CHAIN INTEGRITY.

| State | DECISIONS | Right rail | Verified |
|---|---|---|---|
| **Cold start** | header "Nothing is taken that is not written. **1 entry** this shift · chain verified at T+0." Exactly one entry: `0000:00Z RUN-START — JOA CORAL — First Island Chain · seed 42 · control fair · telementoring on · EXERCISE · ANGEL SWARM NOT DEPLOYED. #0001 · SYSTEM · sha ea07f932` | THIS SHIFT: six counters, all **0** (decisions taken / under standing authority / escalated / authorised after escalation / withheld for low confidence / lapsed unactioned). DEATHS NOT PREVENTED **· 0** with five zero causes. CHAIN INTEGRITY `1 of 1 entries verified`, `head ea07f932` | `cold-feed.png` |
| **Deployed, clock stopped** | a second entry appears (the deployment) | counters still 0 | — |
| **Running, early** | entries accrue newest-first: `AUTHORISED · STANDING` (with the `✦ ALLOCATOR` chip and the expected-benefit score), `DELIVERED`, `NOT PREVENTED` (with the death's cause, triage, unit and reserve-from-wounding), `ESCALATED` | counters live; deaths panel fills by cause | `early-feed.png` |
| **Running, mid** | `SHOW 40 EARLIER` appears once the list exceeds 40 | — | `js/page-feed.js:115` |
| **Decision pending** | the escalation entry carries an `OPEN →` button (`data-page="dec"`) | `Escalated to a human` counter increments | `pending-feed.png` |
| **Finished** | top entry becomes `RUN-COMPLETE — 23 died of survivable wounds of 31 dead in all categories (control 34 of 42).` 49 entries. | THIS SHIFT and DEATHS NOT PREVENTED fully populated | `finished-feed.png` |
| **Filter set, no matches** | `Nothing under this filter yet.` | — | `js/page-feed.js:112` |
| **Chain broken** | header switches to `CHAIN BROKEN AT ENTRY n`; the integrity panel reports the break | — | `js/page-feed.js:73–75` |
| **No deaths** | DEATHS NOT PREVENTED shows `· 0` and "Died of wounds they could have survived, out of 0 dead in every triage category. Reported because a capability that hides its failures cannot be trusted with its successes." | — | `cold-feed.png` |
| **GROUND STREAM, cold** | (not separately captured cold; at T+70 it shows `24 SHOWN · THE STREAM IS WHAT WAS REPORTED, THE DELIVERY LOG IS WHAT HAPPENED` and a TIME / CALL / REPORT / CASUALTY / RELAY table) | — | `tab-feed-STREAM.png` |

**Assessment — Decision Feed.** This is the one destination whose cold start is *not* misleading: it says
one entry, shows that entry, and its counters are honestly zero. **No BROKEN entries.**

---

### 2.5 ANALYST TERMINAL (`tty`) — `js/page-tty.js`

Five tabs: `TRANSCRIPT` (native), `SQL CONSOLE`, `DOCTRINE`, `SENSOR MODEL`, `DATA FILE` (all docked).

| State | TRANSCRIPT | Docked tabs | Verified |
|---|---|---|---|
| **Cold start** | header `ANGEL SWARM // ALLOC-TTY // ANALYST SESSION // SYNTHETIC DATA` and `0000:00Z · 51Q · LINK DOWN · LAST-KNOWN-GOOD PLAN HELD`. Six command blocks: `angel status` → "0 open · 0 inside deadline · 0 unreachable · 0 not assertable · lift 7/7 · LTOWB 27U/3 sites · authority NOT DELEGATED"; `angel queue --sort deadline` → column header + "no casualty is inside a deadline this system holds"; `angel escalations` → "nothing is waiting on a person. 0 approved · 0 taken under standing authority · 0 rejected · 0 expired"; `angel compare` → "ANGEL SWARM is not deployed. There is no allocation to compare."; `angel explain --last` → "no tasking has been recorded yet"; footer `record verify --chain · chain intact · 1 entries`; a live `$` prompt | all four dock and render fully at T+0 — DuckDB reports its schema, the doctrine corpus reports 161 passages, the sensor card reports the CRI-Net figures and `INGEST OFF` | `cold-tty.png`, `tab-tty-*.png` |
| **Running** | every block fills; the queue table gains rows with `CRM`, `DEADLINE`, `ASSET`, `ARRIVE`, `SLACK`, `PAYLOAD`, `AUTHORITY` columns; `angel explain --last` narrates the last tasking | live | `early-tty.png` |
| **Decision pending** | an authorise line appears: `$ angel authorise E-0001 --approve|--reject`, clickable to the Decision page | — | `js/page-tty.js:346` |
| **Finished** | blocks return to their zero forms except the compare line and the chain count | — | `finished-tty.png` |
| **Degraded: link** | header always reads `LINK DOWN · LAST-KNOWN-GOOD PLAN HELD` — see B11 | the SENSOR tab correctly reads `INGEST OFF / SOURCE none — ingest listener not enabled` | — |
| **Degraded: DuckDB absent** | tab still offered | pane would report its own failure | — |

**BROKEN — Analyst Terminal**

| # | Defect | Evidence |
|---|---|---|
| B11 | **The link is permanently reported as DOWN, in every state, on a machine with no telemetry listener at all.** `telemetry.js:290` publishes `window.TELEMETRY = { readingFor, state, available: function(){…} }` — `available` is a **function**. `page-tty.js:204` and `shell.js:165` both test `if (T && T.available)`, which a function always satisfies. The code then reads `T.lastAt`, which is not on the public object, so `age = -1`, `live = false`, and the false branch — "LINK DOWN · LAST-KNOWN-GOOD PLAN HELD" — is the only branch that can ever run. The correct string for this machine, `LOCAL DECIDE · NO REACHBACK REQUIRED`, is unreachable. Confirmed: `/telemetry/status` returns `{"enabled":false}` and the SENSOR pane correctly says `INGEST OFF` on the same screen that says LINK DOWN. | `js/telemetry.js:290`, `js/page-tty.js:202–209`, `js/shell.js:162–176` |
| B12 | If the link ever *did* go live, the live branch would throw: `(T.rate \|\| 0).toFixed(1)` — `T.rate` is not on the public object at all in `shell.js`, and in `page-tty.js` it resolves to `undefined`, so `.toFixed` on the fallback `0` is fine there but `shell.js` has the same shape. The live string has never executed. | `js/shell.js:168` |
| B13 | `P.dock('ttySlot', tab)` passes the **tab key** where a **view name** is expected. It works only because four of the five keys happen to equal their view names. | `js/page-tty.js:243` |

---

### 2.6 OPS CENTER WALL (`ops`) — `js/page-ops.js`

Two tabs: `WALL` (native), `THEATRE` (docks `DASHBOARD`).

| State | WALL | Verified |
|---|---|---|
| **Cold start** | band: TIGHTEST DEADLINE **0 OPEN** / "nothing open inside a deadline"; UNREACHABLE IN TIME **0 CASUALTIES** / "every open casualty is inside the reach of an aircraft"; AWAITING AUTHORITY **0 NONE** / "nothing is not delegable under standing authority". Board header + "No casualty is inside a deadline this system holds." Posture: LTOWB FORWARD 27U 3 sites / LIFT READY 7/7 0 airborne / SORTIES FLOWN 0 · 0 administered / **VS CURRENT — TRIAGE & PROXIMITY: NOT DEPLOYED** / AUTHORITY: NOT DELEGATED / LINK: **DOWN** | `cold-ops.png` |
| **Running** | band figures live; each band cell's sub-line names the actual casualties (`CAS-049 no asset · CAS-042 −11 · …`); 5-row board with `DELIVERED` / callsign / `WITHHELD` / `NO ASSET` / `QUEUED` in the asset column | `early-ops.png` |
| **Decision pending** | AWAITING AUTHORITY cell turns amber, shows `n` and the longest wait in minutes, and its sub-line quotes the proposal summary and its named grounds | `pending-ops.png` |
| **Finished** | band back to zeros; posture keeps the sortie count and the delta | `finished-ops.png` |
| **THEATRE tab** | docks the combatant-command picture: PACOM, 4 operations, per-JOA rollup, `Open →` per operation | `tab-ops-THEATER.png` |

**BROKEN — Ops Center Wall**

| # | Defect | Evidence |
|---|---|---|
| B14 | The band cell reads `0 OPEN` at cold start, where `OPEN` is the *unit* slot standing in for `MIN`. On a ten-foot display "TIGHTEST DEADLINE 0 OPEN" reads as a deadline of zero minutes, which is the most alarming possible reading of the least alarming possible state. |  `js/page-ops.js:73–75` |
| B15 | `LINK: DOWN` — same root cause as B11. On the wall display this is a standing alarm state that can never clear. | `js/page-ops.js:126, 149` |
| B16 | Cold start and finished are the same picture apart from the posture column. | — |

---

### 2.7 EVIDENCE (`ev`) — `js/page-ev.js`

Seven tabs: `EVIDENCE` (native), then six docked panes.

| State | The claim sentence | Three tiles | Lever panel | Live column | Cause column | Policy column | Verified |
|---|---|---|---|---|---|---|---|
| **Cold start** | "ANGEL SWARM is not deployed. Nothing has been allocated, so there is no counterfactual to state — the control arm is running and the comparison begins when this one does." | CURRENT — TRIAGE & PROXIMITY **0** · 0 sorties / ANGEL SWARM TASKING **0** · 0 sorties / TARGET **0** | `ONE SEED IS NOT A FINDING` / `NO SWEEP RUN IN THIS SESSION`, both bars 0, and the standing paragraph directing the reader to REPLICATIONS | `LIVE NOW · 0000:00Z` + "Nothing is open inside a deadline this system holds." + `OPEN THE LIVE BOARD →` | `DEATHS NOT PREVENTED · 0` + "Nobody has died of a survivable wound in this run." | 3 dots: policy posture paragraph; "Human accountability preserved · 0 proposals raised to a person, 0 taken under standing authority"; "Every decision reconstructable · chain intact, 1 entries"; "Decides without reachback · **link down · last-known-good plan held**" | `cold-ev.png` |
| **Deployed, clock stopped** | **"Deadline-ordered allocation and current triage and proximity resupply are *level* on deaths of survivable wounds so far, with the baseline implemented at its strongest."** — asserted at T+0 with zero data | 0 / 0 / 0 | unchanged | unchanged | unchanged | unchanged | `deployed-ev.png` |
| **Running, early** (T+70, 4 vs 6) | "…left *2 fewer dead* of survivable wounds than current triage and proximity resupply **so far**…" | 6 / 4 / 0 | still `NO SWEEP RUN` | live tightest | causes fill | proposals/entries live | `early-ev.png` |
| **Running, mid** | same, larger | — | — | — | — | — | — |
| **Finished** (34 vs 23) | "…left *11 fewer dead* … **over the full run** …" (`done` flips the tense, `js/page-ev.js:75–77`) | 34 / 23 / 0 | `NO SWEEP RUN IN THIS SESSION` **unless** replications were run | "Nothing is open inside a deadline" | DEATHS NOT PREVENTED **· 23** broken into 4 named causes (`3 / 10 / 9 / 1`) with the standing note that only the first is a tasking failure and only the last a fleet-size failure | `3 proposals raised to a person, 20 taken under standing authority · chain intact, 49 entries` | `finished-ev.png` |
| **Undeployed, running** | the not-deployed sentence, **but the two tiles show 6 and 6** — both arms running the same current triage and proximity | 6 / 6 / 0 | — | live | live | live | `undeployed-running-ev.png` |
| **After a sweep** | lever panel replaces `NO SWEEP RUN` with the sweep's two extreme knots | — | — | — | — | — | `js/page-ev.js:94–130` |
| **Docked tabs, cold** | all six dock and render at T+0 — REPLICATIONS offers its full control set with "No replications yet. Press Run replications to draw the rest of the distribution."; ANALYSIS says "0 RUNS CAPTURED THIS SESSION"; ROI/COST/AAR draw the in-progress run | — | — | — | — | — | `tab-ev-*.png` |

**BROKEN — Evidence**

| # | Defect | Evidence |
|---|---|---|
| B17 | **The headline sentence asserts a finding on zero data.** The moment ANGEL SWARM is deployed and before the clock has moved, the page states as fact that the two arms "are level on deaths of survivable wounds so far, with the baseline implemented at its strongest". The branch is `d === 0`, and `0 === 0` at T+0. It stays that way through the whole noise window (verified level at T+0, 2-fewer at T+70, 11-fewer at T+180). Nothing on the page marks the early figures as not yet meaningful — the only such warning is in the *lever* panel, about sweeps, not about the headline. | `js/page-ev.js:73–77` |
| B18 | `Decides without reachback · link down · last-known-good plan held` on the **policy posture** panel — the panel whose job is to make a defensible claim about edge autonomy — is the B11 bug appearing on the most load-bearing sentence in the product. | `js/page-ev.js:195, 208` |
| B19 | The `EVIDENCE` tab is the only one of the seven that is native; switching to any other tab replaces the entire body with a docked legacy pane whose visual language is the old build's. Six of seven tabs therefore do not look like the destination they are in. | verified `tab-ev-*.png` |

---

### 2.8 ASK ANGEL (`chat`) — `js/page-chat.js`

| State | What is on screen | Verified |
|---|---|---|
| **Cold start** | `<h1>Ask ANGEL</h1>` + red chip **`NO LANGUAGE MODEL INSTALLED`**; strap "ANSWERS RUN AGAINST LIVE STATE · EVERY QUESTION IS WRITTEN TO THE DECISION RECORD"; thread empty state `NOTHING ASKED YET` with the capability statement ("I answer with figures computed from the live allocation, or with a passage quoted verbatim out of the reference corpus by the sentence encoder on this machine. I do not write prose, and where I cannot answer I say so…") and the standing line "Standing on 0 open casualties, 7 of 7 airframes ready, 27U forward across 3 launch points."; input + `ASK`; five `SUGGESTED` chips; right rail `ANSWERING FROM` (link line, seed, T+), corpus/DuckDB counts, `NO LANGUAGE MODEL HERE` (Qwen2.5-0.5B-Instruct, 398 MB, run get-model.sh), and `✦ WHAT THE CHIP MEANS` | `cold-chat.png` |
| **Answer: figures** | question echoed, chip `COMPUTED FROM LIVE STATE · NOT A MODEL`, `T+ · Q-nnnn · n ms`, a lead sentence, per-casualty cards, and a `CITED` line naming the live allocation state, seed, JOA and reach model | `tab-chat-answer.png` |
| **Answer: quote** | chip `MiniLM RETRIEVAL`, the passage verbatim, its publication | `js/page-chat.js:240` |
| **Answer: refusal** | `kind:'refuse'` — triggered by "who should I save"-shaped questions about casualties | `js/page-chat.js:213` |
| **Answer: none** | "I cannot answer that", or the retrieval-index failure message | `js/page-chat.js:226, 234, 278` |
| **Busy** | `ASK` button label becomes `WORKING` | `js/page-chat.js:326` |
| **Not deployed** | `aToll` has a dedicated `!L.deployed` branch | `js/page-chat.js:129` |
| **Model present** | the drafting surface returns on next load; the violet `✦` chip then marks generated prose | `js/page-chat.js` |
| **Nothing open** | `aTightest` returns "Nothing is open inside a deadline this system holds." | `js/page-chat.js:116` |
| **Finished** | thread persists; answers computed against the finished state | `finished-chat.png` |

**Assessment — Ask ANGEL.** The degraded state (no model) is the *default* state and it is handled with
more care than any other screen in the build: it is named in the header chip, explained in the right rail,
and the answer path is honest about what produced each answer. It is also the only page that survives the
1-second repaint with focus and a half-typed question intact. **No BROKEN entries** beyond the shared
link string in `ANSWERING FROM` (B11).

---

### 2.9 THEATER MAP (`map`) — `js/page-map.js`

Three scopes; the tool row is rebuilt per scope from a capability table.

| State | Scope row | Tool row | Note line | Stage | Tiles | Verified |
|---|---|---|---|---|---|---|
| **Cold start, THEATRE** | THEATRE / TACTICAL 2D / TACTICAL 3D | `− ZOOM OUT`, `+ ZOOM IN`, `FIT` | "The combatant command and every operation inside it. This picture draws no layers and carries one arm, so the layer panel and the side-by-side comparison are not offered here." + `3 CONTROLS IN THIS SCALE` | docked DASHBOARD | OPERATIONS **4** / WOUNDED **0** / STILL DOWN **0** / DIED OF WOUNDS **0** / AIRCRAFT COMMITTED **0** of 28 | `cold-map.png` |
| **2D** | — | + `LAYER PANEL`, `HIDE ALL LAYERS`, `SIDE BY SIDE` → `6 CONTROLS IN THIS SCALE` | "The tactical ground. Layers, and the only scale that can hold both arms at once — deadline-ordered allocation beside current triage and proximity, same casualties." | docked MISSION with layer panel | OPEN ON THIS GROUND / UNREACHABLE IN TIME / AIRBORNE / BLOOD FORWARD / LAUNCH POINTS | `tab-map-2D.png` |
| **3D** | — | 5 controls (no SIDE BY SIDE) | "The same fight on the GPU. Its camera and its layer set belong to that renderer…" | GPU picture: pitched terrain, sortie arcs, threat envelopes, launch-point chips, casualty reserve rings, a full legend, a **replay transport** (`▶`, `T+01:10`, scrub with event ticks, `4×`, `LIVE`, `FIT`, `TOP-DOWN`), a `SELECTION` panel, a scale bar and north arrow | same five tiles | `tab-map-3D.png` |
| **3D unavailable** | **the TACTICAL 3D button is not rendered at all**, and a session sitting on 3D is moved to 2D | — | — | — | — | `js/page-map.js:271–279` |
| **3D warming up** | note line adds `bringing the GPU renderer up — the controls appear when it is drawing` | — | — | — | — | `js/page-map.js:329` |
| **Software renderer** | the 3D footer states `2 FPS · 12 LAYERS · SOFTWARE RENDERER — DETAIL REDUCED` | — | — | — | — | `tab-map-3D.png` |
| **Running** | tiles live; theatre scope reports the whole command (198 wounded, 98 still down, 34 died, 19 of 28 committed) | — | — | — | — | `tab-map-THEATRE.png` |
| **Finished** | tiles collapse to `0 open` on the tactical scales; theatre keeps the command rollup | — | — | — | — | `finished-map.png` |

**Assessment — Theater Map.** The capability-table approach to the tool row (a control that cannot act
in this scope is **absent**, not greyed) and the honest software-renderer banner are the best-handled
degraded states in the build. **BROKEN:** the `THEATRE` scope's tiles are `WOUNDED 0 / STILL DOWN 0 /
DIED 0` at cold start while simultaneously claiming `4 OPERATIONS in this command` — the other three
JOAs are synthetic feeds that only produce figures once the clock moves, so the screen states that four
operations exist and that none of them has a single casualty.

---

### 2.10 SETTINGS (rail item, no page module)

| State | What is on screen |
|---|---|
| **All states** | The literal string **`settings`**, lowercase, as an `<h1>`, and the subtitle **"Not yet adapted to this design."** Nothing else. |

**BROKEN — Settings.** `NAV` has nine entries and `settings` is not one of them, so `emptyPage()` cannot
even find a label and falls back to the raw key (`js/shell.js:262–266`). The rail offers it as a peer of
the nine. Verified `cold-settings.png`. The real settings surface — seed, thresholds, HITL toggle,
auto-approve bar, operating mode — exists in the hidden `SETTINGS` pane and is reachable only through
the palette's "Change the seed" action.

---

### 2.11 GLOBAL CHROME — states

| Element | States | Notes |
|---|---|---|
| **Classification band** (top) | one state: `UNCLASSIFIED // PUBLIC RELEASE // SYNTHETIC DATA // FOR DEMONSTRATION ONLY` · `<scenario> · PACOM` | `js/shell.js:139–145` |
| **Rail badges** | `Live Casualties` carries a red pill = open count (absent when 0); `Decision` carries an amber pill = PENDING proposals (absent when 0); `Ask ANGEL` carries a permanent static `✦ AI` chip | `js/shell.js:118–126` |
| **EDGE STATE box** | two designed states — green "Deciding on local state — no reachback required" and amber "Link down — holding last-known-good plan, aircraft still flying". **Only the amber one is reachable** (B11). | `js/shell.js:162–176` |
| **Authority pill** (top right) | `STANDBY — NO AUTHORITY` (grey) ↔ `ALLOCATION AUTHORITY` — the single clearest deployed/not-deployed signal in the build | `js/shell.js:180` |
| **Clock** | `HHMM:SSZ`, always drawn, `0000:00Z` at cold start | `js/shell.js:176–179` |
| **Seed chip** | `SEED 42`, static readout | `js/shell.js:184` |
| **FPCON chip** | `FPCON BRAVO`, hard-coded, never changes | `js/shell.js:186` |
| **Search field** | a `<label>` with a `<span>` inside. **No `<input>`, no handler.** | `js/shell.js:186` |
| **Toasts** | `#toasts` is `d-keep`, so toasts *do* reach the user — verified `Deployment recommended / Casualty rate threshold exceeded` at T+24 | `app.js:799` |

### 2.12 MODALS AND OVERLAYS — states

| Overlay | States | Reachable? |
|---|---|---|
| `#deployModal` | **READY** (7 airframes ready, 7 at these launch points, 3 launch points committed; per-site cards with tails, platform, stock, `cold chain nominal`; deselectable; `Send 7 drones from 3 launch points →`) → **DEPLOYING** (`n of 7 airframes online`, `57%`, a rolling per-tail line: `uplink established · ONLINE`, `manifest loaded · ONLINE`, `cold chain verified · ONLINE`, `tasking authority accepted · ONLINE`) → closes on DEPLOYED | `d-keep` ✔ — but **no visible control opens it** |
| `#runModal` | one state, fires automatically at `APP.finished`: headline `11 FEWER DEAD OF SURVIVABLE WOUNDS`, the "32% fewer" line, the all-categories line, the 4-cause breakdown, the 10-row both-arm table, a `Why` narrative (wasted sorties, blood preserved, sorties saved, proposals expired), `Close`, `Save this run and open the full analysis →` | `d-keep` ✔ — fires on its own |
| `#modal` (Model & Sources) | one state: four sets of learned weights, 3 loaded this session, per-model rows | `d-keep` ✔ — palette only |
| `#acctModal` (accountability) | one state: where the marks appear and what they mean; what the ML is precisely; what is deliberately unmarked and why | `d-keep` ✔ — palette only |
| `#confirmModal` | destructive-act confirm (changing operation ends the run) | `d-keep` ✔ |
| `#cmdk` (palette) | closed / open-with-default-list / open-filtered / no-results | created lazily, caught by the MutationObserver ✔ |
| `#keysheet` (`?`) | one state, full binding list | created lazily ✔ |
| `#welcome` (first-run) | markup present, `class="show"` still set — **`display:none`** | ✘ **never rendered** |
| `#opMenu` (operation picker) | markup built, `hidden=false` after the palette opens it — **`display:none`, 0×0** | ✘ **opens invisible** |

---

## 3. EVERY CONTROL

### 3.1 Persistent chrome

| Control | Where | Available | What it does | Status |
|---|---|---|---|---|
| 9 rail destination buttons | rail | always | `DSHELL.go(k)`, sets `S.page`, calls `goView(SECTIONS[k][0])`, repaints | **live** |
| `Authority & Policy` | rail, below the separator | always | `data-page="ev" data-sec="AUDIT"` | **misleading** — `AUDIT` is not one of Evidence's seven tabs, so `go()` sets a hidden pane and Evidence opens on its default `EVIDENCE` tab. Verified: `tabOn: "EVIDENCE"`. Functionally a duplicate of the Evidence rail item. |
| `Data Sources` | rail | always | `data-page="tty" data-sec="DATA"` | **misleading** — lands on the `TRANSCRIPT` tab, not `DATA FILE`. Verified: `tabOn: "TRANSCRIPT"`. |
| `Settings` | rail | always | `DSHELL.go('settings')` | **dead end** — "settings / Not yet adapted to this design." |
| Search field | top bar | always | — | **dead** — a `<label><span>` with no input and no handler (`js/shell.js:186`) |
| `FPCON BRAVO` | top bar | always | — | **static readout**, never changes |
| Authority pill | top bar | always | — | live readout |
| Clock / `SEED n` | top bar | always | — | live readout |
| EDGE STATE box | rail foot | always | — | live readout, **stuck on one branch** (B11) |

### 3.2 Per-destination

| Destination | Control | Available | Does | Status |
|---|---|---|---|---|
| dash | `RE-RUN ALLOCATION` | always | nothing | **DEAD** — no `dcmd` handler exists |
| dash | `OPEN FULL BOARD` | always | → Live Casualties | live |
| dash | Live-theater panel | always | → Theater Map | live |
| dash | `OPEN THE DECISION →` | only when `awaiting > 0` | → Decision | live |
| cas | `LOCATION` / `DEADLINE` | always | regroups the board | live |
| cas | `CASUALTIES` / `SUPPLY` / `FLEET` / `LAUNCH POINTS` | always | switches tab, also drives `goView` | live |
| cas | `SHOW EVERY ROW` / `SHOW FEWER` | always | lifts the 6-per-group cap | live |
| cas | `AUTHORISE n SORTIES →` | only when pending | → Decision | live |
| cas | any casualty row | — | nothing | **DEAD as an affordance** — rows look like handles, carry no `data-dtrow`, open nothing |
| dec | `AUTHORISE A · COMMIT` | only when pending | `approveProposal()` — launches, draws product, writes APPROVE | live |
| dec | `AUTHORISE B · HOLD` | only when pending | `rejectProposal()` — releases reservations, writes REJECT | live |
| dec | `ask ANGEL what else this aircraft could do` | only when pending | → Ask ANGEL | live (navigates only; does not pre-fill the question) |
| dec | `OPEN →` per other proposal | only when >1 pending | focuses that proposal | live |
| feed | `DECISIONS` / `GROUND STREAM` | always | switches tab | live |
| feed | `FILTER` | always | toggles the 6-chip strip | live |
| feed | 6 filter chips | when strip open | filters by tag prefix | live |
| feed | `EXPORT FOR IO` | always | `window.exportAudit()` | **live — verified download** `angel_swarm_audit.csv` |
| feed | `SHOW n EARLIER` | when >40 entries | `S.limit += 40` | live |
| feed | `OPEN →` on an escalation entry | when open | → Decision | live |
| tty | 5 tab buttons | always | tab + dock | live |
| tty | `CAS-nnn` spans in the transcript | always | → Live Casualties **board** | **misleading** — the transcript says "click a casualty to open its record"; it navigates to the list, not to that casualty |
| tty | `angel authorise E-nnnn` line | when pending | → Decision | live |
| ops | `WALL` / `THEATRE` | always | tab + dock | live |
| ops | board rows | always | → Live Casualties | live |
| ev | 7 tab buttons | always | tab + dock | live |
| ev | `OPEN THE REPLICATION STUDY →` | always | → REPLICATIONS tab | live |
| ev | `OPEN THE LIVE BOARD →` | always | → Live Casualties | live |
| chat | text input | always | `S.draft`; `Enter` submits | live |
| chat | `ASK` / `WORKING` | always | resolves the question | live |
| chat | 5 suggestion chips | always | asks that question | live |
| map | `THEATRE` / `TACTICAL 2D` / `TACTICAL 3D` | 3D only when the GPU renderer is up | switches scope, re-docks | live |
| map | `− ZOOM OUT` / `+ ZOOM IN` / `FIT` | all scopes | reaches the active renderer's camera | live |
| map | `LAYER PANEL` / `HIDE ALL LAYERS` | 2D and 3D only | toggles layers | live |
| map | `SIDE BY SIDE` | 2D only | both arms at once | live |
| map | 3D replay transport (`▶`, scrub, `4×`, `LIVE`, `FIT`, `TOP-DOWN`) | 3D only | inside the docked GPU pane | live |

### 3.3 Keyboard

Full sheet at `?`. Behaviour in **this** shell:

| Key | Sheet says | Actually does in the nine-destination shell |
|---|---|---|
| `Space` | Run or pause the mission clock | **works** — verified `t: 0 → 2.25`, `running: true` |
| `R` | Reset the run to T+00:00 | **works** — verified `t: 0`, `deploy: NOT_DEPLOYED` |
| `Ctrl-K` | Command palette | **works** |
| `?` | This sheet | **works** |
| `T` / `Shift-T` | Cycle the colour theme | **works** — verified `data-theme="night-ops"`; the new shell honours it |
| `Esc` | Close an overlay | works for overlays |
| `` ` `` / `Alt-1..4` | Cycle / set the role profile | **changes `APP.role` only.** Verified: role became `LOGISTICIAN`; the rail still showed all 9 destinations. Role no longer restricts or reshapes anything the user sees. |
| `1` `2` `3` `4` | Why this exists / where the fight is / the fight live / the difference | **DEAD.** Verified: `APP.view` changed (`UNITS`, `AUDIT`, …) and `#dMain` did not change one character. The shell reads `S.page`, never `APP.view`. |
| `5` `6` `7` `8` `9` `0` | Units / drones / supplies / approvals / decision log / evidence | **DEAD**, same cause |
| `S` `G` `V` `F` `C` `M` `U` `Q` `D` | stream / 3D / 2D-3D toggle / flow / cost / model / seed sweep / console / db export | **DEAD**, same cause |
| `+` `−` `0` | Zoom in / out / fit the tactical map | reach the hidden panes; the visible map has its own buttons |
| `Ctrl-↵` | Run the query | works inside the docked SQL pane |
| `P` `,` `.` `←` `→` | 3D replay | work inside the docked 3D pane |

**BROKEN — keyboard.** The keyboard sheet is the application's own promise of what it binds, and roughly
**nineteen of its bindings no longer move the screen.** The sheet's closing sentence — "A shortcut is
listed here only if the pane it reaches is present in this build" — is now false: the panes are present
but unreachable, so the sheet lists them.

### 3.4 Command palette (`Ctrl-K`) — status of every action class

| Palette section | Status |
|---|---|
| `Do` → **Deploy ANGEL SWARM into this operation** | **works** — clicks the hidden `#btnDeployBar`, verified end-to-end. **This is the only route to deployment in the entire visible product.** |
| `Do` → Run the mission / Pause / Reset the run | **works** (hidden buttons, programmatic click) |
| `Do` → Keyboard shortcuts / Model and sources / Who decides, and who answers for it | **works** — the three modals are `d-keep` |
| `Do` → theme entries, `Cycle the colour theme` | **works** |
| `Do` → role entries | runs, but has no visible effect (§3.3) |
| `Do` → **Switch operation** | **DEAD** — clicks `#btnOpPick`, which builds and un-hides `#opMenu`; `#opMenu` is a direct child of `<body>`, was **not** added to the `d-keep` list, and computes to `display:none`, 0×0. Verified. |
| `Do` → Run the Monte Carlo replications | runs `goView('CONFIDENCE')` (no visible effect) then clicks `mcRun` in the hidden pane; the result is only visible if the user then finds Evidence → REPLICATIONS |
| `Do` → Set operating mode / Show the … theater / Sync the run into the database / Change the seed / speed 1×,2×,4×,10× | act on hidden controls; effects are indirect and unannounced |
| `Go to` (every one of the 24 old views) | **DEAD** — `run: () => goView(v)`; `goView` moves `APP.view`, which the shell never reads |
| `Scenario` (7 operations) | `resetSim(false)` fires, so the scenario **does** change; the trailing `goView('DASHBOARD')` is a no-op |
| `Analytical console` (SQL presets) | `goView('QUERY')` is a no-op, then it clicks the preset chip in the hidden pane — the query runs where the user cannot see it unless they navigate to Analyst Terminal → SQL CONSOLE themselves |
| `Doctrine` (161 passages) | same shape — the passage opens in a pane the user is not taken to |

### 3.5 Controls that do nothing — the consolidated list

| Control | Where | Why |
|---|---|---|
| **`RE-RUN ALLOCATION`** | Command Overview header | `data-dcmd="rerun"` — no handler exists in the codebase |
| **Search field** | top bar, every screen | no `<input>`, no handler |
| **`Authority & Policy`** | rail | `data-sec="AUDIT"` is not an Evidence tab; opens Evidence's default tab |
| **`Data Sources`** | rail | `data-sec="DATA"` is not applied to the tab group; opens the Transcript tab |
| **`Settings`** | rail | no page module; renders `settings / Not yet adapted to this design.` |
| **Every casualty row** | Command Overview queue, Live Casualties board, Ops wall board | no `data-dtrow`; the record drawer is wired only into the old docked panes |
| **`CAS-nnn` in the terminal** | Analyst Terminal transcript | navigates to the board, not to the casualty, despite the on-screen instruction |
| **Palette → Switch operation** | `Ctrl-K` | `#opMenu` is `display:none` |
| **Palette → all 24 `Go to` entries** | `Ctrl-K` | `goView()` no longer moves the shell |
| **~19 keyboard view shortcuts** (`1`–`0`, `S`, `G`, `V`, `F`, `C`, `M`, `U`, `Q`, `D`) | anywhere | same cause |
| **Role cycling** (`` ` ``, `Alt-1..4`) | anywhere | changes `APP.role`; the nine-destination rail is unaffected |
| **`FPCON BRAVO`** | top bar | static label (not a defect — but it looks like a chip) |

---

## 4. ONBOARDING AND FIRST RUN

### 4.1 What the welcome card offers

`index.html:1546–1585` builds a full-screen first-run overlay: the mark, the title, the line "Replacing
the Golden Hour with a deadline you can measure, and a plan you can compute", and **three numbered
steps** — (1) everything in military medicine is planned against sixty minutes; (2) in the next fight it
cannot be kept, and 58% stop compensating before the hour is up while 42% could have waited longer;
(3) a wearable gives every casualty their own deadline, which turns a transport problem into a scheduling
problem with a right answer. Two buttons: **`Show me why the Golden Hour is gone →`** (`#wcStart`) and
**`Explore on my own`** (`#wcSkip`), plus the line "Everything here is simulated. No real people, no real
data." `js/palette.js:1175–1192` appends a fourth block, `AND WHAT IS ACTUALLY IN HERE`, listing the
destinations.

### 4.2 BROKEN — the welcome card never appears

`#welcome` still carries `class="show"` — nothing dismissed it — and computes to **`display: none`**,
`0 × 0`. Cause: `css/design.css:317` hides every direct child of `<body>` that is not on the allow-list,
and `js/shell.js:225` rescues `deployModal, modal, confirmModal, acctModal, runModal, keysheet, toasts`.
`welcome` is not on that list, and unlike `cmdk` and `keysheet` it is not built lazily, so the
`MutationObserver` at `js/shell.js:229–233` never sees it either.

Verified directly:

```
welcome:     { cls: "show", display: "none", w: 0, h: 0 }
opMenu:      { hidden: false, display: "none", w: 0, h: 0 }
deployModal: { cls: "d-keep", display: "none" }        ← rescued
```

Consequence: **there is no onboarding in this build.** The first thing a new person sees is the
Command Overview at T+0 with a zero in every tile.

### 4.3 The path from opening the application to seeing a comparison result

| Step | What the person must do | Is the control visible? |
|---|---|---|
| 1 | Open the application. Lands on **Command Overview**, T+0, five tiles reading 0 / — / 27U / 7 / —, an empty queue, an empty escalation card. No instruction anywhere. | — |
| 2 | Deploy ANGEL SWARM. | **NO VISIBLE CONTROL.** The full enumeration of every visible interactive element at cold start returns **15 items**: 9 rail destinations, 3 secondary rail links, `RE-RUN ALLOCATION` (dead), `OPEN FULL BOARD`, and the Live-theater panel. `#btnDeployBar` ("Deploy →", `index.html:277`) is inside `#cmdbar`, which computes to `display:none`. |
| 3 | Discover `Ctrl-K` — **advertised nowhere on screen**, only in the `?` sheet, which is itself only advertised in the `?` sheet and in the welcome card that does not render. | ✘ |
| 4 | Type `deploy`, press `Enter`. The deploy sheet opens (READY phase). | ✔ once step 3 is known |
| 5 | Press `Send 7 drones from 3 launch points →`. Watch DEPLOYING reach 7 of 7. | ✔ |
| 6 | Start the clock. | **NO VISIBLE CONTROL.** `#btnPlay` (`index.html:378`) is inside the hidden `#cmdbar`; Playwright refused to click it — "element is not visible" — 47 retries. The only routes are `Space` and the palette. |
| 7 | Wait. At 1× real time the run is 180 simulated minutes. There is **no visible speed control** either (`[data-speed]` chips are in the hidden bar; palette offers 1×/2×/4×/10×). | ✘ |
| 8 | Navigate to **Evidence** to read the comparison. Nothing prompts this; the Command Overview's delta tile is the only other place the result appears. | ✔ |
| 9 | At completion, `#runModal` opens on its own with the full after-action summary. | ✔ — the one moment the product pushes its own result |

**Count: nine steps, of which three (2, 6, 7) require a control that is not visible on any screen, and
one (3) requires a keyboard shortcut that is not advertised on any screen.**

### 4.4 What the application does instead

At roughly T+24 in a run started without deploying, the engine trips a standing threshold and fires a
toast: **"Deployment recommended — Casualty rate threshold exceeded · 35 casualties per hour against a
standing threshold of 34"** (`app.js:786, 799`). Toasts *are* on the allow-list, so this reaches the user.
It recommends an action for which no visible control exists. `APP.thresholds.auto` is `false`
(`app.js:27`), so the deploy sheet does not open itself.

### 4.5 A second consequence: the undeployed-but-running state

Because `Space` works and deployment does not, the most likely state a curious user reaches is
**clock running, ANGEL SWARM never deployed**. In that state both arms run the identical current triage and proximity:
Evidence shows `CURRENT — TRIAGE & PROXIMITY 6` and `ANGEL SWARM TASKING 6`, the Command Overview delta tile shows
`—`, and casualties accumulate and die on both arms equally. The product's entire claim is invisible, and
five of the nine screens do say "ANGEL SWARM is not deployed" — but Live Casualties, Theater Map and
Ask ANGEL do not.

---

## 5. THE FILM AND THE DOCUMENTS

### 5.1 The film

| Property | Fact |
|---|---|
| What it is | A deterministic canvas renderer, **not a video**. `renderFrame(t)` draws the complete frame for absolute time `t`; a rAF loop walks `t` forward. It was an embedded MP4 until sandboxed viewers refused to load either a blob or a data URL. 37 KB of source instead of 5 MB of base64. |
| Where | `js/film_inline.js` (991 lines), `window.FILM`; player chrome at `index.html:1004–1021` |
| Runtime | `2:53` (`#filmDur`), `HOLD = 1.55` stretches every caption plateau |
| Controls | `#filmPlay` (▶ / pause), `#filmT` elapsed, `#filmScrub` with `#filmFill` and `#filmHead`, `#filmDur`, `#filmFs` full screen; `Esc` leaves the expanded film |
| Host | The `STANDARD` pane — "What it looks like from the ground", kicker `UNDER THREE MINUTES` |
| Reachability | **BROKEN.** `STANDARD` is listed under `dash` in `SECTIONS` (`js/shell.js:40`), but `page-dash.js` does not dock anything — it draws its own markup. Every `.viewport` is `position:fixed; visibility:hidden; z-index:-1` (`css/design.css:340–343`). Verified: after `goView('STANDARD')`, `#filmCv` measures **0 × 0** inside a hidden viewport. `filmDraw()` would render into a zero-size canvas. There is no film in this build's user surface. |

### 5.2 The exports

| Export | Control | Where it lives | Reachable from the nine? |
|---|---|---|---|
| Audit CSV | `EXPORT FOR IO` | Decision Feed header | **YES — verified download `angel_swarm_audit.csv`** |
| Audit CSV (legacy) | `#btnExportAudit` | AUDIT pane | not docked anywhere |
| Casualty CSV | `#btnExportCas` | CASUALTIES pane | not docked anywhere (Live Casualties is a native re-implementation and has no export) |
| Ground-stream CSV | `#btnExportStream` | STREAM pane | not docked; the new GROUND STREAM tab is native and has no export |
| ROI CSV | `#btnExportRoi` | ROI pane | **YES** — Evidence → RETURN |
| Runs JSON | `#btnExportRuns` | ANALYSIS pane | **YES** — Evidence → ANALYSIS |
| `.sqlite` | `#btnDbExport` | DATA pane | **YES** — Analyst Terminal → DATA FILE |

### 5.3 The run save

`#btnSaveRun` "Capture current run" and `#btnSweep` "Run 40-run sweep" live in the ANALYSIS pane, which
Evidence → ANALYSIS docks — so both are reachable. `saveRun()` is guarded: if `APP.finished` is false it
refuses with the toast **"Run not finished — Let the mission complete before saving it."** (`app.js:2298`).
`#runModal`'s footer button `Save this run and open the full analysis →` is the same capability at the
moment it is legal.

### 5.4 The accountability record

| Document | Where | Content | Reachable? |
|---|---|---|---|
| **The hash chain** | Decision Feed | Every entry hashes its predecessor; `#seq`, actor, `sha`, and the `CHAIN INTEGRITY` panel reporting `n of n verified` and the head hash. At cold start: 1 of 1, head `ea07f932`. After a full run: 49 of 49. | **YES** |
| **`#acctModal` — "Who decides, and who answers for it"** | palette only | Two marks and what they mean; where the four models appear; what the machine learning is precisely (CRI-Net's variance is the trust gate that decides when a reading may be acted on); what is deliberately left unmarked (triage categories, TCCC scope, the 1–10 °C band, the 3-hour TXA window, commander designations) and the explicit note that an earlier version wrongly marked the optimiser as AI. | **only via `Ctrl-K`** — the rail's `Authority & Policy` entry does *not* open it |
| **`#modal` — Model & Sources** | palette only | Four sets of learned weights, 3 loaded this session, each with what it is allowed to decide, parameters, held-out error and licence. | **only via `Ctrl-K`** |
| **The policy posture panel** | Evidence, always visible | "Unarmed medical delivery. Outside DoDD 3000.09. The DoD AI Ethical Principles apply. No issuance governs autonomy in casualty prioritisation, which is why every trade-off between two casualties is escalated rather than resolved." Plus three live dots: proposals raised to a person vs taken under standing authority; chain intact with entry count; decides-without-reachback. | **YES** |
| **The refusal rule** | Ask ANGEL | A question shaped "who should I save" about casualties is refused rather than answered. | **YES** |

---

## 6. WHAT IS BROKEN — CONSOLIDATED

Ordered by consequence.

| # | Defect | File:line | Verified how |
|---|---|---|---|
| **1** | **No visible control deploys ANGEL SWARM.** `#btnDeployBar` is inside `#cmdbar`, hidden by the allow-list. Only `Ctrl-K → deploy` reaches it. | `css/design.css:317`, `index.html:277` | 15 visible interactive elements enumerated at cold start; none deploys |
| **2** | **No visible control starts the clock.** `#btnPlay` likewise. Only `Space` or the palette. | `index.html:378` | Playwright: "element is not visible", 47 retries |
| **3** | **The first-run welcome card never renders.** Not on the `d-keep` allow-list, not lazily created, still `class="show"`. | `js/shell.js:225`, `css/design.css:317` | `display:none`, 0×0 |
| **4** | **The link state is permanently and falsely "DOWN"** on the rail, the terminal header, the ops wall and the Evidence policy panel — on a machine whose telemetry listener is `enabled:false`. `TELEMETRY.available` is a **function**; `if (T && T.available)` is always true; `T.lastAt` is not exposed; the live branch is unreachable. | `js/telemetry.js:290`, `js/shell.js:165`, `js/page-tty.js:204` | `/telemetry/status → {"enabled":false}` while four surfaces say LINK DOWN and the SENSOR pane says INGEST OFF |
| **5** | **Five of nine screens are visually identical at "finished" and at "cold start"** — dash, cas, dec, ops and (partly) tty all collapse to their zero states when `L.open` empties at the end of the run. Nothing anywhere reads "COMPLETE". | `js/shell.js:105–107` | `finished-*.png` vs `cold-*.png` |
| **6** | **Evidence asserts a finding on zero data** the instant ANGEL SWARM is deployed: "level on deaths of survivable wounds so far, with the baseline implemented at its strongest." No screen marks the early comparison as noise. | `js/page-ev.js:73–77` | `deployed-ev.png` |
| **7** | **`RE-RUN ALLOCATION` does nothing** — the only action button on the landing screen. | `js/page-dash.js:49` | state byte-identical before and after |
| **8** | **The Decision page's cold-start copy is false** ("every escalation raised this shift has been disposed of") and the page carries **zero controls** in that state. | `js/page-dec.js:260–275` | `cold-dec.png`, 0 buttons |
| **9** | **No casualty row anywhere opens a record.** `js/detail.js` is complete and wired only into old docked panes. | `js/detail.js:310`, `js/page-grouped.js:426` | `[data-dtrow]` count 0 |
| **10** | **~19 keyboard shortcuts and all 24 palette "Go to" entries are dead** — `goView()` moves `APP.view`, which the shell never reads. The `?` sheet advertises them all. | `js/shell.js:255–260` | `APP.view` changed, `#dMain` unchanged |
| **11** | **`Settings` renders the raw key `settings` and "Not yet adapted to this design."** | `js/shell.js:154, 262–266` | `cold-settings.png` |
| **12** | **`Authority & Policy` and `Data Sources` ignore their `data-sec`** and open their destination's default tab — functional duplicates of two rail items directly above them. | `js/shell.js:241–249` | `tabOn: EVIDENCE` / `TRANSCRIPT` |
| **13** | **The film is unreachable** — its canvas measures 0×0 inside a hidden viewport; no destination docks the `STANDARD` pane. | `css/design.css:340`, `js/page-dash.js` | `#filmCv` 0×0 |
| **14** | **The operation picker opens invisible.** `#opMenu` is a body child, not on the allow-list. | `index.html:1543`, `js/shell.js:225` | `hidden:false, display:none, 0×0` |
| **15** | **The top-bar search field is not a field** — a `<label>` with a `<span>`, no input, no handler. | `js/shell.js:186` | `querySelectorAll('input').length === 0` |
| **16** | **`#dMain` is rewritten every 1000 ms**, destroying every control, focus, selection and transient state. Only `page-chat.js` compensates. Playwright could not complete an ordinary `.click()` on tab buttons — "element was detached from the DOM" — which is exactly what a human's mis-click feels like. | `js/shell.js:274`, `js/page-chat.js:297–303` | repeated detach failures |
| **17** | **Three screens report three different blood-forward figures from the same shelf.** Decision: 15U (`BLOOD` only, "Whole blood forward"). Command Overview: 27U (`BLOOD+PLASMA`, "BLOOD FORWARD"). Analyst Terminal and Ops wall: 27U labelled **LTOWB** — a label that means whole blood specifically, on a figure that includes plasma. | `js/page-dec.js:299`, `js/page-dash.js:74–83`, `js/page-tty.js:193–200` | `cold-dash.png` / `cold-dec.png` / `cold-tty.png` / `cold-ops.png` |
| **18** | **Role profiles no longer do anything visible.** `` ` `` sets `APP.role = 'LOGISTICIAN'`; the rail still shows all nine destinations. | `js/shell.js` (no role awareness) | verified |
| **19** | **Ops wall reads "TIGHTEST DEADLINE 0 OPEN"** at cold start, where `OPEN` occupies the unit slot that otherwise holds `MIN`. |  `js/page-ops.js:73–75` | `cold-ops.png` |
| **20** | **Every page's `if (!L)` empty state is dead code** — `live()` is non-null before first paint. The states these were written for are unreachable; the states people actually see are the populated-with-zeros ones. | `js/shell.js:98` | painted at 150 ms |
| **21** | Theater Map's THEATRE scope claims `4 OPERATIONS in this command` and `WOUNDED 0 / STILL DOWN 0 / DIED 0` simultaneously at cold start. | `js/page-map.js:344–360` | `cold-map.png` |
| **22** | The Analyst Terminal instructs "click a casualty to open its record"; clicking navigates to the board instead. | `js/page-tty.js:310` | verified |

---

## 7. WHAT IS *WELL* HANDLED — worth preserving

Stated because a designer redrawing every screen should know which behaviours were deliberate.

| Behaviour | Where |
|---|---|
| A control that cannot act in the current map scope is **absent, not disabled**, and the note line states how many controls this scale has | `js/page-map.js:284–292` |
| `TACTICAL 3D` is not offered at all on a machine that cannot render it, and a session sitting on 3D is moved to 2D rather than shown a broken stage | `js/page-map.js:271` |
| The GPU pane states `SOFTWARE RENDERER — DETAIL REDUCED` and its real frame rate | verified |
| The missing language model is named in the header chip, explained in the right rail, and the answer path labels every answer by what produced it | `js/page-chat.js` |
| A question that asks the system to rank two casualties is refused | `js/page-chat.js:213` |
| A death figure is red everywhere — number, bar and marker — and is never phrased as lives saved | `js/page-dash.js:9–13`, `js/page-map.js:349` |
| The allocation brief omits a line rather than manufacturing a sentence: "an empty slot is honest and a manufactured sentence is not" | `js/page-dash.js:103–118` |
| Arrival is stated as **unknown** when the allocator's reach model has not published, rather than computed a second time by a module that could disagree with the allocator | `js/shell.js:91–102` |
| A stale reading is **annotated** on the row rather than asserted away, with an explicit refusal to claim a withheld tasking that did not happen | `js/page-cas.js:21–31` |
| `deadlineMin >= 9000` means "not time-critical" and those casualties are drawn **without a bar**, not given a deadline they do not have | `js/shell.js:72–76` |
| The deaths-not-prevented panel separates four causes and states which one is a tasking failure and which a fleet-size failure, rather than folding them into one number | `js/page-ev.js:170–192` |
| The lever panel refuses to draw a sensitivity curve that no sweep produced: `NO SWEEP RUN IN THIS SESSION` | `js/page-ev.js:127` |
| The escalation lapse is shown as a countdown with its consequence stated: "authority lapses in 03:00 and the cost of not deciding is written to the record" | `js/page-dec.js:107–109` |
| The decision record is read back **out of the chain** after an action rather than composed from what the code thinks it just did | `js/page-dec.js:59–65` |
| `saveRun()` refuses on an unfinished run instead of saving a partial one | `app.js:2298` |
| Both arms are stated as "same casualties, same aircraft, same blood… the baseline is implemented at its strongest, not as a straw man" wherever the comparison appears | `js/page-dec.js:321`, `js/page-ev.js:75` |

---

## 8. FILES

| File | Lines | Role |
|---|---|---|
| `js/shell.js` | 275 | The nine destinations, the rail, the top bar, the classification band, `live()`, the 1 s repaint |
| `js/page-dash.js` | 192 | Command Overview |
| `js/page-cas.js` | 431 | Live Casualties + SUPPLY / FLEET / LAUNCH POINTS |
| `js/page-dec.js` | 329 | Decision |
| `js/page-feed.js` | 335 | Decision Feed + GROUND STREAM |
| `js/page-tty.js` | 428 | Analyst Terminal, and `DPB` — the docking runtime the tabbed pages share |
| `js/page-ops.js` | 153 | Ops Center Wall |
| `js/page-ev.js` | 211 | Evidence |
| `js/page-chat.js` | 436 | Ask ANGEL |
| `js/page-map.js` | 384 | Theater Map |
| `js/palette.js` | 1263 | Command palette, keyboard sheet, the welcome extension that never renders |
| `js/detail.js` | 444 | The record drawer — built, unreferenced by the nine |
| `js/film_inline.js` | 991 | The film — built, unreachable |
| `js/telemetry.js` | 297 | CoT/SSE ingest; source of the link-state defect |
| `css/design.css` | — | The allow-list at line 317 that governs everything above |
| `index.html` | 1754 | The old chrome, the 24 panes, and every dialog |

**Screenshots.** `/tmp/build-0/-home-build/8be0bac1-19e5-5a26-a5c6-5999484e54f4/scratchpad/shots/` —
`cold-*.png` (all nine + settings), `deployed-*.png`, `early-*.png`, `pending-*.png`, `finished-*.png`,
`tab-*.png` (every tab of every tabbed destination), `deploy-modal.png`, `deploying.png`, `runmodal.png`,
`acct.png`, `keysheet.png`, `palette*.png`, `undeployed-running-*.png`, `loading-*.png`, `toast-1.png`.

**Related.** `/home/build/angel/DEAD-CONTROLS.md` audits the **old 24-view rail** (1131 presses, 7 dead
controls) and does not cover the nine-destination shell; this document does. The two do not overlap.
