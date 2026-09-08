# ANGEL SWARM — Engine Inventory (input to the design specification)

Factual inventory of the simulation engine at `/home/claude/angel/app`, read from
source. Every claim cites `file:line`. Nothing here is a design recommendation and
nothing here describes the current UI.

Sources of truth:

| File | Lines | Role |
|---|---|---|
| `/home/claude/angel/app/js/sim.js` | 1013 | Constants, scenarios, terrain, casualty/drone construction, world + arm construction |
| `/home/claude/angel/app/js/optimizer.js` | 1137 | Both allocators, HITL/proposals, audit chain, flight mechanics, delivery resolution, death causes |
| `/home/claude/angel/app/js/app.js` | 6586 | `APP` state, `COUNT` counting contract, run lifecycle, deployment, telemetry/polling, exports |

Load order matters: all three are classic scripts. `sim.js` and `optimizer.js` are
plain top-level `const`/`function` declarations shared by bare name; `app.js`
publishes `window.APP`, `window.UI`, `window.COUNT` (`app.js:79-81`, `app.js:330`).
`CALLSIGN` is **not** in these three files — it is `const CALLSIGN = { HEAVY:'TRV',
LIGHT:'M25', LONG:'FVR' }` in `map.js:201`, and `optimizer.js` reads it
(`optimizer.js:277`, `optimizer.js:301`, `optimizer.js:985`).

---

## 1. THE RUN LIFECYCLE

### 1.1 The two independent clocks

There are **two orthogonal state machines** and confusing them is the single
easiest mistake to make in this product.

1. **The mission clock** — `APP.t` / `APP.running` / `APP.finished`. Governs whether
   the battle is advancing.
2. **The deployment state** — `APP.deploy.state`. Governs whether ANGEL SWARM is the
   thing doing the tasking in arm A.

Neither implies the other. The clock runs with ANGEL SWARM undeployed (that is the
intended opening condition). Deployment can be performed while the clock is paused.

### 1.2 Clock fields

| Field | File:line | Type | Meaning |
|---|---|---|---|
| `APP.t` | `app.js:10` | number, sim-minutes | Authoritative simulation time. Advanced only in `stepSim()` by `APP.dt`. |
| `APP.tView` | `app.js:10` | number, sim-minutes | The clock **panes read**. Equals `APP.t + APP.acc` while running (interpolated between steps), and exactly `APP.t` when paused (`app.js:417-418`). |
| `APP.dt` | `app.js:10` | number, sim-minutes | Fixed step, `0.25` min (15 s). Never changed anywhere. |
| `APP.speed` | `app.js:10` | number | Sim-minutes per real second. Default `2`. UI offers `1, 2, 4, 10` (`index.html` `data-speed`). |
| `APP.acc` | `app.js:53` | number | Sub-step accumulator. |
| `APP.running` | `app.js:10` | boolean | Play/pause. |
| `APP.finished` | `app.js:53` | boolean | Run complete. |
| `APP.lastMin` | `app.js:64` | number | Last integer minute sampled into `APP.histA/histB`. |

`loop()` (`app.js:408-422`) is a `requestAnimationFrame` loop that runs for the life
of the page. Per frame: `real = min(0.1, elapsed_seconds)`; `APP.acc += real *
APP.speed`; then up to **400** `stepSim()` calls while `APP.acc >= APP.dt`
(`app.js:415`). `render()` is called every frame regardless of run state.

### 1.3 `APP.deploy` — the deployment state machine

`APP.deploy` is declared at `app.js:23-25` and re-initialised identically in
`resetSim` at `app.js:362-363`.

| Field | Type | Meaning |
|---|---|---|
| `state` | `'NOT_DEPLOYED' \| 'DEPLOYING' \| 'DEPLOYED'` | The only three values written anywhere (`app.js:362`, `app.js:697`, `app.js:743`, `app.js:763`). |
| `tRequested` | number \| null | `APP.t` when `beginDeployment()` ran (`app.js:697`). |
| `tComplete` | number \| null | `APP.t` when authority transferred (`app.js:743`). |
| `trigger` | `'ON_DEMAND' \| 'THRESHOLD'` | Set by `openDeployModal(trigger)`, defaulting to `'ON_DEMAND'` (`app.js:633`). |
| `actor` | string \| null | Hardcoded `'COMMANDER'` (`app.js:700`). |
| `airframes` | integer | Count of serviceable airframes committed (`app.js:698`). |
| `launchPoints` | integer | Distinct launch points committed (`app.js:699`). |
| `progress` | 0..1 | Fraction of committed airframes reported online. |
| `lines` | array | Newest-first feed rows `{tail, lp, plat, step, ok}` (`app.js:713-714`). |
| `sel` | `Set<number>` \| null | Launch-point indices the commander has ticked. Rebuilt on every `openDeployModal` (`app.js:632`). |
| `timer` | interval handle \| null | `setInterval` at **260 ms** wall-clock (`app.js:723`). |

`deployState()` (`app.js:805-810`) maps state to `{k, label, cls}`:
`DEPLOYED → 'DEPLOYED'/'ok'`, `DEPLOYING → 'DEPLOYING'/'warn'`,
`NOT_DEPLOYED → 'NOT DEPLOYED'/'bad'`.

### 1.4 "Capability held / STANDBY"

The literal string `STANDBY` appears in `setAngelActive` (`app.js:2263-2277`), which
is a **second, independent** path to the same effect as deploy/recall. There are
therefore two mechanisms that both set `APP.armA.allocatorKey`:

| Path | Sets `angelActive` | Sets `armA.allocatorKey` | Sets `deploy.state` | Audit action |
|---|---|---|---|---|
| `completeDeployment()` `app.js:741-758` | `true` | `'ANGEL'` | `'DEPLOYED'` | `DEPLOY-COMPLETE` |
| `recallDeployment()` `app.js:760-771` | `false` | `'CURRENT'` | `'NOT_DEPLOYED'` | `RECALL` |
| `setAngelActive(true)` `app.js:2263` | `true` | `'ANGEL'` | **untouched** | `SYSTEM-ACTIVATE` |
| `setAngelActive(false)` `app.js:2263` | `false` | `'CURRENT'` | **untouched** | `SYSTEM-STANDBY` |

**Ambiguity in source:** `setAngelActive` can put `APP.angelActive === false` and
`armA.allocatorKey === 'CURRENT'` while `APP.deploy.state === 'DEPLOYED'`, and vice
versa. The two are only consistent because `recallDeployment` and
`completeDeployment` happen to write both. Panes disagree about which they read:
`buildRunReport` reads `APP.deploy.state !== 'DEPLOYED'` for its verdict
(`app.js:2084`, `app.js:2160`) but reads `!APP.angelActive` for the "was in standby"
bullet (`app.js:2127`). No call site of `setAngelActive` was found in `app.js`
bindings, so in the shipped UI it is reachable only via other modules or the console.

"Capability held" as a phrase does not exist in the engine. The behavioural meaning
of held/standby is exactly: **arm A is running current triage and proximity allocator.**

### 1.5 What each lifecycle function actually does

**`resetSim(keepRunning)` — `app.js:335-373`.** A full rebuild, not a rewind:
1. `APP.world = createWorld(APP.scenarioKey, APP.seed)` — new deep-copied scenario, new casualty stream.
2. `APP.armA = createArm(world, 'ANGEL SWARM', 'CURRENT', APP.mode)` — **note the allocator key is `'CURRENT'`, not `'ANGEL'`** (`app.js:337`).
3. `APP.armB = createArm(world, 'CURRENT — TRIAGE & PROXIMITY', 'CURRENT', APP.mode)` (`app.js:339`).
4. `armA.telementor = APP.telementor`; `armB.telementor = false` (`app.js:340-341`) — see §3.3.
5. `armA.hitl = APP.hitl`; `armA.autoApproveAbove = APP.autoApproveAbove`; `armA.hvaWeight = APP.hvaWeight`. Arm B gets none of these.
6. `APP.rngA = makeRNG(seed*3+1)`, `APP.rngB = makeRNG(seed*3+2)` — separate attrition streams.
7. Zeroes `t/tView/acc/finished/lastMin/sel/histA/histB`, clears the log DOM.
8. `if (!keepRunning) APP.running = false`.
9. Rebuilds the basemap **only if the scenario changed** (`app.js:352-356`).
10. Clears `runReport`, `pings`, `pingSweep`, `unitSel`; rebuilds `APP.units`.
11. Clears any deploy timer and resets `APP.deploy` to `NOT_DEPLOYED`; `APP.angelActive = false`; `APP.alert = null`.
12. Writes audit `RUN-START` to arm A, and `DESIGNATE` if any HVA roles are set.

**`openDeployModal(trigger)` — `app.js:629-636`.** Read-only preparation. Returns
early if already `DEPLOYING`. Calls `readinessRoll()`, pre-selects **every launch
point with ≥1 ready airframe**, stores `trigger`, shows `#deployModal` with
`data-phase="READY"`. It does not touch the clock, the arms, or `deploy.state`.

**`readinessRoll()` — `app.js:612-627`.** Per launch point, per airframe:
`serviceable = ((d.id * 2654435761) >>> 0) % 100 >= 12` **and** `d.state !== 'LOST'`.
Deterministic per tail number (~12% down), so reopening the dialog does not reroll.
`reason` is `'destroyed'` / `'scheduled maintenance'` / `null`. Returns per-LP
`{idx, name, afloat, blood, plasma, rows, ready, total}` plus force totals.

**`beginDeployment()` — `app.js:687-725`.** The commit.
- Rebuilds the queue from `readinessRoll()` ∩ `deploy.sel`, serviceable only. Returns silently if empty.
- Sets `state = 'DEPLOYING'`, `tRequested = APP.t`, `airframes`, `launchPoints`, `actor='COMMANDER'`; sets modal `data-phase="DEPLOYING"`.
- Writes audit `DEPLOY-REQUEST`.
- Starts a **wall-clock** `setInterval` at 260 ms. Each tick brings one airframe online, unshifts a feed line, stamps `d.deployedAt = APP.t`, updates `progress`. Steps cycle through `['uplink established','manifest loaded','cold chain verified','tasking authority accepted']` (`app.js:707`).
- **The sim clock is not started, stopped, or advanced by this.** If `APP.running` is false the whole sequence plays out at T+00:00.

**`completeDeployment()` — `app.js:741-758`.** `state='DEPLOYED'`, `tComplete=APP.t`,
`APP.angelActive=true`, **`APP.armA.allocatorKey = 'ANGEL'`**, `armA.deployedAt=APP.t`,
`APP.alert=null`, audit `DEPLOY-COMPLETE`, toast. After **900 ms** it closes the modal
and forces `APP.view='MISSION'`, `APP.missionMode='TACTICAL'`.

**`recallDeployment()` — `app.js:760-771`.** Only acts if currently `DEPLOYED`.
Returns to `NOT_DEPLOYED` and `allocatorKey='CURRENT'`. Aircraft already airborne are
**not** recalled; only future tasking changes.

**`evaluateThresholds()` — `app.js:773-804`.** Called from `stepSim` every step.
Guards: `thresholds.armed`, `deploy.state === 'NOT_DEPLOYED'`, `armA` exists, `APP.t >= 8`.
Three trip conditions, evaluated in order, first match wins:
| Condition | Test |
|---|---|
| Casualty rate | `casualties / max(0.25, t/60) >= thresholds.casPerHour` (default 34) |
| Reserve floor | count of open, time-critical casualties with `crmAt(t) < PARAMS.CRM_RED` (40) `>= thresholds.critical` (default 4) |
| Unit readiness | worst unit's readiness band rank `>=` `thresholds.readiness` rank (default `'AMBER'`) |
On trip (and only if `APP.alert` is currently null): sets `APP.alert = {title, detail}`,
audits `THRESHOLD`, toasts. If `thresholds.auto` (default **false**) it runs
`openDeployModal('THRESHOLD') || beginDeployment()`.
**Bug/ambiguity:** `openDeployModal` returns `undefined`, so `|| beginDeployment()`
**always executes** — auto mode opens the dialog and immediately commits it in the
same tick, with no chance to deselect a launch point.

**`stepSim()` — `app.js:374-399`.** One `APP.dt` tick:
`stepArm(armA, world, APP.t, dt, rngA)` → `stepArm(armB, …, rngB)` → `applyHVA()` →
`refreshTelemetry()` → `evaluateThresholds()` → `APP.t += dt`. On a new integer minute
it pushes a `snapshot()` into `APP.histA/histB`.

**Finishing.** When `APP.t >= scn.durationMin` (always 180): `APP.t` is clamped to 180,
`finalize()` runs on both arms, `APP.finished = true`, `APP.running = false`, audit
`RUN-COMPLETE` is written, `syncChrome()`, `showRunReport()` (opens `#runModal`), and
`captureRun(true)` pushes a record into `APP.runs` (`app.js:388-397`).
`finalize(arm)` (`optimizer.js:1122-1136`) resolves every casualty still `outcome ===
null` by the *untreated* survival draw with the same common random number
`makeRNG(c.id * 6151)`.

**`snapshot(arm, m)` — `app.js:400-407`.** `{t, blood, plasma, deaths, saved, sorties, wasted}`.
`deaths`/`saved` here are the **survivable** figures, not the all-category ones.

### 1.6 The ordered path from cold start to a result

1. `DOMContentLoaded` → `bindUI()`, `mountFilm()`, `initMapMode()`, then
   `resetSim(false)` and `requestAnimationFrame(loop)` (`app.js:6575-6584`).
   State at this instant: `view='DECIDE'`, `scenarioKey='PACOM_CORAL'`, `seed=42`,
   `mode='fair'`, `running=false`, `t=0`, `deploy.state='NOT_DEPLOYED'`,
   `armA.allocatorKey='CURRENT'`, welcome overlay `#welcome` visible (`index.html:1546`).
2. Dismiss the welcome overlay — `wcStart` (`app.js:5159`), `wcSkip`, backdrop
   pointerdown, Escape, or any pointerdown on the command bar (`app.js:5150-5158`).
   `wcStart` additionally sets `APP.view='STANDARD'`. **None of these start the clock**
   — the comment at `app.js:5163-5168` says so explicitly.
3. *(optional, in any order relative to 4)* Deploy: open the deploy dialog
   (`btnDeployBar`, `#btnDeployTop`, `#btnDeployAlert`, `#btnDeployEmpty`,
   `#btnDeployMission`, `[data-deploy]`, or a `data-deployjoa` row — `app.js:4946`,
   `app.js:5185`), optionally deselect launch points, press `#dpConfirm`
   (`app.js:5174` → `beginDeployment`). Wait ~260 ms × airframes for the progress feed,
   then 900 ms for the modal to auto-close.
4. Press Play (`#btnPlay`, or Space — `app.js:4605`, `app.js:5235`). If `APP.finished`
   the button calls `resetSim(true)` **first**, then flips `APP.running`.
5. The clock advances until `APP.t >= 180`. `#runModal` opens automatically with the
   run report and the run is saved to `APP.runs`.
6. Alternatives to (4): drag/click the `#scrub` bar (`app.js:5216-5223`), which
   fast-forwards by calling `stepSim()` in a loop up to 6000 times — and calls
   `resetSim(false)` if you seek **backwards**, discarding the run. Same code in
   `seekAppTo()` (`app.js:1318-1330`).
7. `R` or `#btnReset` → `resetSim(false)` at any time (`app.js:4609`, `app.js:5236`).

**Anything that silently discards the run in progress:** changing seed
(`#seedInput`), changing control mode (`[data-mode]`), toggling telementoring
(`#tmToggle`), `[data-scn]`, `changeOperation()` (guarded by a confirm sheet —
`app.js:930-953`), `selectJoa()` to a different JOA, seeking backwards on the scrub.
All call `resetSim`, which resets `deploy.state` to `NOT_DEPLOYED`.

---

## 2. THE ENTITIES

### 2.1 Casualty

Constructed in `makeCasualty` (`sim.js:615-685`), deep-copied per arm by
`cloneCasualty` (`sim.js:1005-1012`). The stream is built once per world and shared.

| Field | Type / units | Set where | Meaning |
|---|---|---|---|
| `id` | integer ≥1 | `sim.js:958` (renumbered after sort) | Stable ID, identical in both arms. |
| `x`, `y` | km, scenario-local | `sim.js:617-625` | Position. Origin top-left of the `widthKm × heightKm` box; always on land (`elev > 4`). |
| `tInjury` | sim-minutes | `sim.js:615` | Time of wounding. |
| `cls` | `'IMMEDIATE' \| 'DELAYED' \| 'MINIMAL' \| 'EXPECTANT'` | `sim.js:627` | True triage class. |
| `injury` | `'TRUNCAL_HEM' \| 'JUNCTIONAL_HEM' \| 'EXTREMITY_HEM' \| 'AIRWAY' \| 'MINOR'` | `sim.js:640-646` | Injury pattern. `MINOR` only for `MINIMAL`. |
| `responder` | `'T1' \| 'T2' \| 'T3'` | `sim.js:628` | TCCC tier standing next to them. Mix 58/32/10. |
| `role` | key of `ROLES` (11 values) | `sim.js:629` | Duty role. |
| `needs` | array of payload keys, ordered by efficacy | `sim.js:658-662` | Interventions that help. Position drives efficacy `[1.0, 0.86, 0.62, 0.45]` (`sim.js:695`). |
| `penetrating` | boolean | `sim.js:664` | True for `TRUNCAL_HEM`/`JUNCTIONAL_HEM`; selects the steeper mortality OR. |
| `hva` | boolean | `applyHVA` `app.js:459-474` | Commander-designated high-value. |
| `hvaReason` | string \| null | same | `'designated individually by the commander'` or `'<Role label> — designated mission-critical role'`. Null when `hva` is false. |
| `unit`, `unitName` | `'U0'..'U3'` / e.g. `'A/1-27 IN'` | `sim.js:631-634` | Nearest manoeuvre element. |
| `tPinged` | sim-minutes | init `sim.js:667`, updated `app.js:1966` | Last telemetry refresh in the **commander's** picture (UAV footprint or poll sweep). |
| `reportedCrm` | 0–100 | init `100`, `app.js:1966` | The possibly-stale CRM the commander's roll-up uses. |
| `deadlineMin` | minutes from injury | `sim.js:650-654` | Physiological deadline. `9999` sentinel for `MINIMAL` — every consumer tests `>= 9000`. |
| `p0` | 0–1 | `sim.js:657` | Survival if treated instantly. IMMEDIATE .93, DELAYED .97, MINIMAL .998, EXPECTANT .22. |
| `treated` | boolean | `optimizer.js:1096` | Payload administered. |
| `tTreated` | sim-minutes \| **null until treated** | `optimizer.js:1096` | Time of **administration**, i.e. `tRecovered + admin`, not arrival. |
| `treatedWith` | payload key \| **null until treated** | `optimizer.js:1096` | |
| `outcome` | `'SAVED' \| 'DIED'` \| **null until resolved** | `optimizer.js:1105`, `optimizer.js:900`, `optimizer.js:1126` | |
| `assignedTo` | drone id \| null | `optimizer.js:485`, cleared on delivery/release | Reservation. **Cleared the moment a payload lands** — cannot be used to answer "was an aircraft tasked". |
| `crmAt(t)` | method → 0–100 | `sim.js:676-681` | Linear `100 → 0` over `deadlineMin`. Returns a flat `88` for `MINIMAL`. |

Fields that **do not exist until a later state**:

| Field | Appears when | File:line |
|---|---|---|
| `reachN`, `reachIds` | on admission, `scoreCoverage` | `optimizer.js:703-709`, called `optimizer.js:753` |
| `tele[]`, `knownCrm`, `knownAt`, `knownQ` | first telemetry burst | `optimizer.js:816-819` |
| `teleLive` | only if `window.TELEMETRY` supplies a live reading | `optimizer.js:812` |
| `teleHeld` | only during comms denial | `optimizer.js:821` |
| `_perceived` | only in `mode === 'realistic'`, only in the Class VIII allocator | `optimizer.js:530-539` |
| `decision` | only when an aircraft is actually tasked to them (ANGEL arm only) | `optimizer.js:300-316` |
| `tOnStation`, `tRecovered`, `releaseMethod` | on a successful recovery only | `optimizer.js:1097` |
| `tResolved` | when `outcome` is set | `optimizer.js:901`, `optimizer.js:1106`, `optimizer.js:1128` |
| `deployedAt` (on drones, not casualties) | see §5 | `app.js:715` |

`tele[]` entries: `{t, v (0-100), zone ('GREEN'|'AMBER'|'RED'), q (0-1), trigger ('ZONE CHANGE'|'ROUTINE')}`,
capped at 40 (`optimizer.js:817`). Cadence 45 s or on zone change (`sim.js:883-889`).

`c.decision` (`optimizer.js:300-316`) — the "why this aircraft" record:
`{t, drone, call, plat, base, payload, arriveFromInjury, marginMin, crmUsed, crmAgeMin,
crmQ, pUntreated, pTreated, gain, responder, telementored, coldC, stops, alsoOnSortie[],
hva, reachN, candidates[]}`. Each `candidates[]` row is
`{id, plat, call, base, distKm, flightMin, chosen, verdict}` where `verdict` is one of
the eight strings at `optimizer.js:284-297`: `LOST EARLIER IN THE MISSION`,
`OUT OF RANGE — …`, `<PAYLOAD> NOT IN STOCK AT <base>`, `COLD CHAIN BREAKS — …`,
`<STATE> on another tasking`, `HELD BY THE OPERATOR`,
`ELIGIBLE — LOST ON EXPECTED BENEFIT`, `TASKED`.
**This record is written for candidates the allocator scored, so its presence does
not mean an aircraft was committed** — see `COUNT.tasked` (`app.js:174-192`).

### 2.2 Aircraft / drone

`makeDrone` (`sim.js:730-763`).

| Field | Type / units | Meaning |
|---|---|---|
| `id` | integer | Tail number. `_droneId` is reset to 0 in `createArm` (`sim.js:967`), so **arm A and arm B use the same id for the same airframe**. |
| `type` | `'HEAVY' \| 'LIGHT' \| 'LONG'` | Platform key. |
| `plat` | reference to `PLATFORMS[type]` | |
| `baseIdx`, `baseX`, `baseY`, `baseName` | integer, km, km, string | Owning launch point. **The whole of the ownership model** (`sim.js:750-770`). |
| `x`, `y` | km | Current position, interpolated per step. |
| `state` | `'IDLE' \| 'OUTBOUND' \| 'RETURNING' \| 'LOST'` | The only four values (`sim.js:736`). |
| `route` | `[{casId, payloadKey, x, y, eta, coldSwap?}]` | Multi-stop plan, ≤ `min(MAX_STOPS=4, plat.slots)`. |
| `legIdx` | integer | Index of the leg being flown. |
| `target` | casualty id \| null | Current leg's casualty. |
| `payloadKey` | payload key \| null | Current leg's item. |
| `tArrive`, `tHome`, `tDepart` | sim-minutes \| null | |
| `destX/destY`, `fromX/fromY` | km | Interpolation endpoints. |
| `held` | boolean | Operator hold; excludes from ANGEL tasking (`optimizer.js:320`). **Arm B's allocator does not check `held`** (`optimizer.js:542`). |
| `coldC` | °C | Container temperature. Init `3.0`, recomputed in flight when carrying blood. |
| `coldStartMin` | sim-minutes \| null | Set at launch. |
| `manifest` | `{payloadKey: count}` | What is still aboard. |
| `sorties`, `delivered`, `wasted` | integers | Per-airframe tallies. |
| `cumulative` | `{payloadKey: count}` | Lifetime items carried. |
| `lastLoad` | null | Declared, set to null at launch (`optimizer.js:628`), **never given a value anywhere**. |
| `emblem` | boolean `true` | Broadcasting machine-readable protective emblem. Never mutated. |
| `sortieId` | integer | Added at launch (`optimizer.js:629`), keys `arm.sortieLog`. |
| `onStation` | `{seq, tRelease, tRecover, phase}` \| null | Present **only while overhead** (`optimizer.js:892-905`). `phase` ∈ `'RELEASING' \| 'RECOVERING'`. |
| `sectors` | `[{x, y, r}]` | Sole-coverage sectors this airframe is held for (`optimizer.js:731`, `optimizer.js:743`). |
| `deployedAt` | sim-minutes | Only on airframes that came online through `beginDeployment` (`app.js:715`). |

**There is no `ON_STATION` drone state.** An aircraft holding over a casualty for the
release/recover sequence has `state === 'OUTBOUND'` and a non-null `onStation`.
A designer who filters on `state` alone cannot distinguish transit from hover.

### 2.3 Launch point / base

`createArm` (`sim.js:968-974`) builds a per-arm base object from `scn.bases[i]`:

| Field | Type | Meaning |
|---|---|---|
| `name` | string | e.g. `'FARP ALPHA'`, `'LHA BOXER'`, `'BSA CENTER'`. |
| `x`, `y` | km | Position. |
| `_idx` | integer | Index; same index in both arms. |
| `stock` | `{BLOOD, PLASMA, TXA, TQ_KIT, CHEST_SEAL}` counts | Current on-hand. |
| `spent` | same keys | Cumulative issued (decremented on return — `optimizer.js:676`). |
| `wastedUnits` | `{BLOOD, PLASMA}` | Cold-chain units destroyed. |

Scenario-side base fields (`sim.js:322-326` and per-scenario): `name`, `x`, `y`,
`fleet` (`[[typeKey, n], …]`), `afloat` (boolean, only on `LHA BOXER` and
`ESB TRIPOLI`). `afloat` is surfaced in `readinessRoll` (`app.js:619`).

Stock constants (`sim.js:166-169`):
| Item | INIT | RESUP (per 45 min) | CAP |
|---|---|---|---|
| BLOOD | 5 | 2 | 8 |
| PLASMA | 4 | 2 | 7 |
| TXA | 9 | 4 | 14 |
| TQ_KIT | 20 | 10 | 30 |
| CHEST_SEAL | 9 | 4 | 14 |

Resupply is per-base, capped, every `RESUPPLY_EVERY_MIN = 45` (`optimizer.js:756-766`).
**Note a double-write in the source:** the `stockLog` rows are pushed in one loop
(`optimizer.js:758-762`) and the stock is actually added in a second loop
(`optimizer.js:765-766`). The logged `delta` is `min(RESUP, CAP - stock)` computed
before the add, so log and stock agree; but the two loops are separate and a future
edit to one will silently desynchronise them.

### 2.4 Payloads

`PAYLOADS` (`sim.js:129-142`). Five keys, exactly.

| key | label | kg | coldChain | tier (min) | admin min (`sim.js:848`) | note |
|---|---|---|---|---|---|---|
| `BLOOD` | Whole Blood (1 u) | 1.45 | **true** | T3 | 4.0 | 1 unit LTOWB, Golden Hour container, 48 h at 1–10 °C |
| `PLASMA` | Freeze-Dried Plasma | 0.62 | false | T3 | 3.2 | EZPLAZ / French FDP, reconstitutes 1–5 min |
| `TXA` | TXA 2g | 0.06 | false | T3 | 1.2 | Hard 3-hour window from injury |
| `TQ_KIT` | Hemorrhage Kit | 0.34 | false | T1 | 0.8 | CAT Gen 7 + hemostatic gauze + pressure dressing |
| `CHEST_SEAL` | Chest Seal / NPA | 0.12 | false | T2 | 1.0 | Vented chest seal + NPA |

Administration time is `ADMIN_MIN[pk] × TIER_ADMIN_FACTOR[responder]` where the
factors are `T1: 1.5, T2: 1.2, T3: 1.0` (`sim.js:851`, `sim.js:853-857`).

### 2.5 Responder tiers

`TIERS` (`sim.js:120-124`), mix `TIER_MIX` (`sim.js:126`).

| key | name | training | can administer | share |
|---|---|---|---|---|
| `T1` | ASM (buddy) | 6-8 hrs | `TQ_KIT` | 0.58 |
| `T2` | CLS | 40 hrs | `TQ_KIT`, `CHEST_SEAL` | 0.32 |
| `T3` | Combat Medic (68W) | 8-10 days | all five | 0.10 |

Telementoring (`TELEMENTOR_UNLOCK`, `optimizer.js:33`) adds `PLASMA` and `TXA` to
**T2 only**, at an 0.82 efficacy penalty (`tmPenalty`, `optimizer.js:48-52`).
It never unlocks anything for T1 and never unlocks `BLOOD`.

### 2.6 Duty roles

`ROLES` (`sim.js:181-193`), `ROLE_MIX` (`sim.js:194-198`).

| key | label | short | weight |
|---|---|---|---|
| `RIFLEMAN` | Rifleman | RFLMN | 0.40 |
| `TEAM_LEADER` | Team leader | TL | 0.13 |
| `ENGINEER` | Combat engineer | ENGR | 0.09 |
| `SIGNALS` | Signals / RTO | SIG | 0.08 |
| `COMBAT_MEDIC` | Combat medic | MEDIC | 0.06 |
| `UAS_OPERATOR` | UAS operator | UAS | 0.06 |
| `JTAC` | JTAC | JTAC | 0.05 |
| `SNIPER` | Sniper / recon | RECON | 0.05 |
| `EOD_TECH` | EOD technician | EOD | 0.04 |
| `AIRCREW` | Aircrew | AIR | 0.02 |
| `LINGUIST` | Linguist | LING | 0.02 |

### 2.7 Sortie, delivery and stock rows

Transactional ledgers on the arm (`sim.js:983`).

`arm.sortieLog[]` — pushed in `launch` (`optimizer.js:630-632`):
`{id, droneId, tLaunch, tReturn (null until home), stops, actor, proposalId (null unless approved)}`.
`actor` is `'STANDING AUTHORITY'` unless an approval set `arm._authActor`.

`arm.deliveryLog[]` — one row per **delivery attempt**, success or failure
(`optimizer.js:1014`, `1044`, `1075`, `1098`):
`{sortieId, casId, payload, t, delay (t − tInjury), ok (boolean), wasteReason (string|null), coldC (°C|null)}`.
The four `wasteReason` values:
`'responder is <tier name> and cannot administer'`,
`` `cold chain broken — <n>°C on arrival` ``,
`'package not recovered on the ground'`,
`null` (success).

`arm.stockLog[]` — `{baseIdx, item, delta (±n), reason, t}`. `reason` ∈
`'ISSUE'` (`optimizer.js:58`), `'RETURN'` (`optimizer.js:677`),
`'RESUPPLY'` (`optimizer.js:760`), `'WASTE — undeliverable'` (`optimizer.js:1021`).

`arm.stream[]` — the ground report (`optimizer.js:980-993`), capped at 4000:
`{t, tRecv (null while comms down), phase, casId, droneId, call, payload, relay, text}`.
`relay` ∈ `'OVERWATCH'`, `'BUFFERED ON AIRCRAFT'`, `'OVERWATCH (DELAYED)'`
(the last written by `flushStream`, `optimizer.js:995-998`, preserving the original `t`).
`phase` enumeration — 8 values: `ON STATION`, `PAYLOAD AWAY`, `RECOVERED`,
`UNDELIVERABLE`, `COLD CHAIN BROKEN`, `NOT RECOVERED`,
`ADMINISTERED — CASUALTY STABLE`, `ADMINISTERED — CASUALTY LOST` (`optimizer.js:1108`).

`arm.log[]` — narrative lines `{t, kind, text}`. `kind` ∈ `TASK`, `SAVE`, `WASTE`,
`COLD`, `LOSS`, `LATE`, `COVERAGE`.

### 2.8 Proposals

`queueProposal` (`optimizer.js:147-171`). Only arm A, only when `arm.hitl` is true and
at least one escalation ground fired.

| Field | Type | Meaning |
|---|---|---|
| `id` | integer | Global `_propId`, **not reset by `resetSim`** — it keeps counting across runs (`optimizer.js:146`). |
| `tRaised` | sim-minutes | |
| `droneId` | integer | |
| `route` | leg array | |
| `value` | float | Total route expected-lives-saved, post-discount. |
| `state` | `'PENDING' \| 'APPROVED' \| 'REJECTED' \| 'EXPIRED'` | The only four (`optimizer.js:153`, `183`, `189`, `217`). |
| `summary` | string | `` `<plat.label>-<id> → CAS-n, CAS-m` `` |
| `payloads` | string[] | Payload labels in route order. |
| `leadId` | casualty id \| null | |
| `leadReserve` | integer 0–100 \| null | Lead's CRM at `tRaised`. |
| `leadDeadline` | minutes \| null | Minutes of deadline remaining. |
| `eta` | minutes | Arrival **measured from the lead's injury**, not from now. |
| `responder` | string | Lead's tier name, or `'—'`. |
| `gain` | integer | `round(value × 100)`. |
| `reasons` | string[] | Escalation grounds; falls back to `['LOW CONFIDENCE']` if empty. |
| `tActed` | sim-minutes | Added on approve/reject/expire. |
| `reason` | string | Added on reject only; defaults `'operator judgement'`. |

Queue is trimmed to the last 400 (`optimizer.js:223`).

---

## 3. THE TWO ARMS

### 3.1 Structure

Both arms are built by the same `createArm(world, label, allocatorKey, mode)`
(`sim.js:966-1003`) from the same `world`.

| | `APP.armA` | `APP.armB` |
|---|---|---|
| `label` | `'ANGEL SWARM'` | `'CURRENT — TRIAGE & PROXIMITY'` |
| `allocatorKey` at reset | `'CURRENT'` | `'CURRENT'` |
| `allocatorKey` after deploy | `'ANGEL'` | `'CURRENT'` (never changes) |
| `mode` | `APP.mode` | `APP.mode` |
| `telementor` | `APP.telementor` (default **true**) | **always `false`** (`app.js:341`) |
| `hitl` | `APP.hitl` (default **true**) | `false` (the `createArm` default, `sim.js:981`) |
| `autoApproveAbove` | `APP.autoApproveAbove` = **0.10** | `0.55` (the `createArm` default) — inert, `hitl` is false |
| `hvaWeight` | `APP.hvaWeight` = 1.6 | undefined (unused; the Class VIII allocator ignores `hva`) |
| attrition RNG | `APP.rngA = makeRNG(seed*3+1)` | `APP.rngB = makeRNG(seed*3+2)` |

`allocatorKey` is read in exactly one place — `stepArm` step 6
(`optimizer.js:975-978`): `'ANGEL' → allocateAngelSwarm`, anything else →
`allocateCurrentMethod`. It is also read at `optimizer.js:930` to gate the in-flight
cold-chain abort, which **only arm A ever performs**.

### 3.2 The fairness contract — what is guaranteed identical

- **One casualty stream.** `createWorld` builds `world.stream` once from one seeded RNG (`sim.js:941-959`); both arms clone from it via `cloneCasualty`. Same ids, positions, injuries, deadlines, responders, roles, arrival times.
- **Same fleet, same tail numbers.** `_droneId` reset per arm (`sim.js:967`); `addAirframeToBoth` forces the same id in both (`sim.js:771-791`) and refuses to add to one arm only.
- **Same launch points and the same opening stock** (`STOCK_INIT`, `sim.js:968-972`).
- **Same multi-stop routing capability** — both allocators use `MAX_STOPS = 4` and `plat.slots`.
- **Common random numbers on outcomes.** Every survival draw uses `makeRNG(c.id * 6151)` — the untreated path (`optimizer.js:899`), the treated path (`optimizer.js:1104`) and `finalize` (`optimizer.js:1125`). Package-recovery uses `makeRNG(c.id * 7919)` (`optimizer.js:1069`). Triage mis-classification uses `makeRNG(c.id * 7919 + 13)` (`optimizer.js:533`). Signal quality is a deterministic function of `c.id` and `t` (`sim.js:893-899`). All are properties of the casualty, not the arm.
- **HVA designation is applied to both arms** (`applyHVA`, `app.js:459-474`), though only the ANGEL allocator acts on it.

**What is NOT identical, and would surprise a designer:**

1. **Telementoring is on for arm A and hardwired off for arm B** (`app.js:340-341`). This changes `capabilitiesAt()` and therefore which payloads are usable and which deliveries are wasted. It is a real capability difference on top of the tasking difference, not a tasking consequence. The UI exposes one toggle (`#tmToggle`), which resets the sim and only ever affects arm A.
2. **Separate attrition RNGs** (`rngA`, `rngB`, `app.js:344-345`) drive threat losses in `stepArm` step 4 (`optimizer.js:783`). They are consumed at different rates because the arms fly different routes, so the streams desynchronise. This is acknowledged in `app.js:2143-2157`: at seed 42 with nobody deployed, the two arms — running *the same allocator* — do **not** tie.
3. **In-flight cold-chain abort is ANGEL-only** (`optimizer.js:930`).
4. **Operator holds (`d.held`) are honoured by the ANGEL allocator only** (`optimizer.js:320` vs `optimizer.js:542`).
5. **`arm.mode`** is the same for both, but `perceivedClass` only alters behaviour inside `allocateCurrentMethod`. Before deployment arm A runs that allocator too, so in `realistic` mode arm A also mis-triages until the moment authority transfers.

### 3.3 `arm.stats.*`

Declared at `sim.js:984-991`; two more keys are created lazily.

| Key | Where incremented | Meaning |
|---|---|---|
| `saved` | `optimizer.js:897`, `1110`, `1131` | Casualties with `outcome === 'SAVED'`, **all categories**. |
| `died` | `optimizer.js:900`, `1113`, `1133` | All-category deaths. |
| `treated` | `optimizer.js:1101` | Payloads successfully administered (= casualties with `treated === true`). |
| `sorties` | `optimizer.js:653` | Aircraft launches. Equals `sortieLog.length` (asserted, `app.js:319`). |
| `stops` | `optimizer.js:1101` | Successful delivery stops. Incremented alongside `treated`, so it is always equal to it. |
| `wastedSorties` | `optimizer.js:1017`, `1039`, `1072` | Deliveries where nothing usable reached the casualty. Counted **per failed delivery**, not per sortie, despite the name. |
| `dronesLost` | `optimizer.js:791` | Airframes destroyed in a threat envelope. |
| `coldAborts` | `optimizer.js:931` | In-flight cold-chain aborts (arm A only). |
| `bloodWasted` | `optimizer.js:673`, `789`, `1019`, `1041`, `1071` | Cold-chain units destroyed — on abort/return, on airframe loss, on undeliverable, on broken chain, on non-recovery. |
| `bloodUsed` | `optimizer.js:1086` | Cold-chain units actually transfused. |
| `stockouts` | `optimizer.js:597` | Class VIII allocator only: no in-stock item for a casualty's needs. |
| `missedDeadline` | `optimizer.js:900` | Deaths resolved by passing the physiological deadline untreated. |
| `coldSwaps` | `optimizer.js:475` | Routings where blood was in stock and indicated but plasma was substituted because blood would arrive out of band. ANGEL only. |
| `plasmaUsed` | `optimizer.js:1087` | |
| `approved` | `optimizer.js:182` | Proposals a human approved. |
| `rejected` | `optimizer.js:195` | |
| `expired` | `optimizer.js:219` | Proposals that went stale (8-minute window, or the drone/casualty resolved). |
| `autoApproved` | `optimizer.js:467` | Dispatched under standing authority **while `hitl` is on**. Not incremented when `hitl` is off. |
| `survivableDeaths` | `optimizer.js:902`, `1115`, `1135` | **The headline.** Deaths where `cls ∈ {IMMEDIATE, DELAYED}`. |
| `survivableTotal` | `optimizer.js:754` | Size of the survivable cohort admitted so far. |
| `survivableSaved` | `optimizer.js:897`, `1110`, `1131` | Survivable-cohort casualties with `outcome === 'SAVED'`. |
| `coverageDeaths` | `optimizer.js:909` — **lazily created** | Survivable deaths where `reachN <= 1`. Read via `COUNT.deathsFromCoverage` which coalesces to 0 (`app.js:161`). |
| `lostPackages` | `optimizer.js:1070` — **lazily created** | Packages released but not recovered. |

---

## 4. THE TASKING OPTIMISER

`allocateAngelSwarm` (`optimizer.js:318-528`). Re-solved **every simulation step**,
i.e. every `APP.dt = 0.25` sim-minutes, from `stepArm` step 6 (`optimizer.js:975-978`)
— but **only when `arm.commsDown` is false**.

### 4.1 The objective

Marginal **expected lives saved** per stop:
`value = survivalIfTreatedAt(c, eta, pk) × tmPenalty(...) − survivalIfUntreated(c)`
(`optimizer.js:379-381`). The route's `totalValue` is the sum over stops.

Modifiers, applied in this order (`optimizer.js:382-411`):
1. Break-even gate: `value <= 0.003` → discard the stop.
2. **Scarcity price** on BLOOD/PLASMA: `value × (1 − 0.45 × scarcity)`, `scarcity = 1 − min(1, stock/10)`.
3. **Risk discount**: `value = value × (1 − pLoss) − pLoss × 0.28`, where `pLoss = routeThreat(...)` integrated over 24 steps along the straight leg (`sim.js:598-612`).
4. Break-even gate re-tested after the risk discount.
5. **HVA multiplier** `× arm.hvaWeight` (default 1.6) — applied **after** break-even, so it reorders but never manufactures a sortie (`optimizer.js:399-402`).
6. Long-range penalty: `× 0.88` if a `LONG` airframe is sent inside 12 km of its own base.
7. Route-cohesion penalty: for stops after the first, `× exp(−legMin/55)`.

### 4.2 Hard constraints — all confirmed in source

Evaluated at the **cumulative** arrival time of each leg (`optimizer.js:369-378`):

| Constraint | Test | Line |
|---|---|---|
| In stock | `sim[pk] >= 1` against a hypothetical draw-down copy of base stock | `optimizer.js:371` |
| Payload mass | `loadKg + P.kg <= plat.payloadKg` | `optimizer.js:372` |
| Reach | `inRange(d, c.x, c.y, loadKg + P.kg)` → `dist(baseX, baseY, tx, ty) <= effectiveRadiusKm(plat, load)` | `optimizer.js:373`, `sim.js:912-918` |
| Cold chain | blood only: `coldTempAfter(eta − tNow, ambientAt(world.ambientC, eta), d.type) <= PARAMS.COLD_MAX_C` (10 °C) | `optimizer.js:375-378` |
| TXA window | `eta − c.tInjury <= PARAMS.TXA_WINDOW_MIN` (180 min) | `optimizer.js:380` |
| Receiver qualification | `usablePayloads(c, telementor)` = `c.needs ∩ capabilitiesAt(c, telementor)` | `optimizer.js:366`, `optimizer.js:35-46` |

**Reach is measured base→casualty, not current-position→casualty** (`sim.js:914`).
An aircraft partway through a route is still tested against its home pad.

**Sector commitment** (`commitSectors`, `optimizer.js:729-745`; run once per arm, then
`arm.sectorsBuilt`). For each scenario cluster, the airframes that can cover the whole
cluster (`dist(base, cluster) + cluster.r <= effectiveRadiusKm(plat, 1.45)`) are
counted. Where exactly one covers it, that airframe gets `sectors.push({x, y, r: r*1.6})`
and is thereafter **restricted to open casualties inside its sectors and nothing else**
(`optimizer.js:340-342`). The source calls this "the single highest-leverage constraint
in the model" (`optimizer.js:725`).

### 4.3 Contention

Not an auction in the bidding sense. Each idle, unheld airframe builds its own greedy
route independently; all routes go into `proposals[]` and are then sorted
**lexicographically** (`optimizer.js:445-447`):

1. any HVA on the route (descending),
2. `sole` — the route came from a sector-restricted airframe (descending),
3. `totalValue` (descending).

Then assigned greedily down the list. A drone already used is skipped; a casualty
already claimed by an earlier proposal is **dropped from the later route** and the
remainder re-validated against real base stock (`optimizer.js:452-461`).
The header comment at `optimizer.js:236` describes this as "auction on total route value".

### 4.4 Standing authority vs escalation

`autoOK = !arm.hitl || esc.length === 0` (`optimizer.js:465`).

- `arm.hitl === false` → everything launches, nothing is escalated, and `autoApproved` is **not** incremented.
- `arm.hitl === true` → escalate iff `escalationReasons()` returns a non-empty array. Otherwise dispatch under standing authority, increment `autoApproved`, write audit `AUTO-DISPATCH`.

`escalationReasons(arm, world, d, route, value, tNow)` — `optimizer.js:107-145`.
Four named grounds, all four evaluated, all matches returned:

| Ground | Exact string | Test |
|---|---|---|
| 1. Marginal benefit | `LOW CONFIDENCE` | `value < arm.autoApproveAbove` (default 0.10 for arm A) |
| 2. Airframe risk | `THREAT TRANSIT <n>%` | `max` per-leg `routeThreat` over the route `> 0.10` |
| 3. Last scarce unit | `LAST WHOLE BLOOD (1 U)` / `LAST FREEZE-DRIED PLASMA` | for BLOOD and PLASMA: `base.stock[key] − wanted <= 0`. String is `'LAST ' + PAYLOADS[key].label.toUpperCase()` |
| 4. Triage displacement | `IMMEDIATE UNASSIGNED` | lead casualty is `MINIMAL`/`EXPECTANT` **and** some `IMMEDIATE` is open, untreated, unassigned, already injured, and within `d.plat.maxRadiusKm` of the drone's **current** position |

Note ground 4 uses `maxRadiusKm` (ferry radius) from the drone's live position, not
`effectiveRadiusKm` from its base — a deliberately looser test than the tasking
constraint. The proposal renders whatever this returns; if it is somehow empty the
proposal shows `['LOW CONFIDENCE']` (`optimizer.js:165`).

**Proposal lifecycle.** `PENDING` → `approveProposal` (`optimizer.js:172-186`) checks
the drone is still `IDLE` (else `EXPIRED`), filters legs to those still in stock (if
none, `EXPIRED`), stamps `arm._authActor`/`_authProposal`, launches, sets `APPROVED`.
`rejectProposal` (`optimizer.js:187-198`) sets `REJECTED`, releases all `assignedTo`
reservations, records `reason`. `reapQueue` (`optimizer.js:207-224`), run every step
when `hitl` is on, expires a pending proposal when the drone is gone or no longer
`IDLE`, the lead casualty has resolved, or **`tNow − tRaised > 8` sim-minutes**.

`holdDrone(arm, droneId, tNow, on)` (`optimizer.js:199-206`) toggles `d.held` and
audits `HOLD`/`RELEASE`.

### 4.5 The control arm

`allocateCurrentMethod` (`optimizer.js:541-624`):
- Sorts open casualties by `TRIAGE_RANK[perceivedClass(arm, c)]` then `tInjury`.
- For each lead, picks the **nearest idle airframe by current position** that satisfies `inRange(k, lead.x, lead.y, 3)` — a fixed 3 kg assumed load, not the real one.
- Chains up to `min(4, slots)` stops by pure **nearest-neighbour**, refusing any stop more than one triage rank worse than the lead.
- Payload is `pick.needs[0]` — the clinically indicated item — with a fallback to the first in-stock item in `needs`. **No receiver-capability check**, no cold-chain look-ahead, no TXA window, no inventory strategy, no risk discount, no `held` check, no HVA.

`perceivedClass` (`optimizer.js:530-539`) is a no-op unless `arm.mode === 'realistic'`,
in which case: IMMEDIATE downgraded to DELAYED with probability `1 − START_SENSITIVITY`
(0.10), non-IMMEDIATE upgraded to IMMEDIATE with probability `START_OVERTRIAGE` (0.14).
Memoised in `cas._perceived`.

---

## 5. DEPLOYMENT AND FLEET

### 5.1 Platforms

`PLATFORMS` (`sim.js:143-154`).

| key | label | speedKmh | radiusKm (at full load) | maxRadiusKm (ferry) | payloadKg | slots |
|---|---|---|---|---|---|---|
| `HEAVY` | TRV-150C | 92 | 12 | 34 | 30 | 10 |
| `LIGHT` | Soaring M25 | 60 | 5 | 14 | 6.8 | 4 |
| `LONG` | FVR-90 (Crimson) | 83 | 90 | 200 | 9.1 | 8 |

Callsign prefixes (`map.js:201`): `HEAVY → TRV`, `LIGHT → M25`, `LONG → FVR`.
Rendered as `` `${CALLSIGN[type]}-${String(id).padStart(2,'0')}` `` (`optimizer.js:277`).

### 5.2 Effective radius

`effectiveRadiusKm(plat, loadKg)` — `sim.js:156-159`:
```
frac = clamp(loadKg / plat.payloadKg, 0, 1)
r    = maxRadiusKm − (maxRadiusKm − radiusKm) × frac
```
Linear between ferry radius at zero load and combat radius at full load. Worked values
for one unit of blood (1.45 kg):

| Platform | at 0 kg | at 1.45 kg | at 3 kg | at full |
|---|---|---|---|---|
| HEAVY (30 kg) | 34.0 km | 32.9 km | 31.8 km | 12 km |
| LIGHT (6.8 kg) | 14.0 km | 12.1 km | 10.0 km | 5 km |
| LONG (9.1 kg) | 200.0 km | 182.5 km | 163.7 km | 90 km |

`effectiveRadiusKm(plat, 1.45)` is the canonical "can this pad reach this person"
measure and appears in `scoreCoverage` (`optimizer.js:704`), `commitSectors`
(`optimizer.js:735`), `deathCauses` (`optimizer.js:255`) and `funnel` (`app.js:2508`).
`inRange` defaults to **2 kg** when `loadKg` is undefined (`sim.js:913`).

### 5.3 Release and recovery

`RELEASE` (`sim.js:836-845`) — a property of the platform, not the payload.

| Platform | method | releaseMin | recoverMin | missRate | note |
|---|---|---|---|---|---|
| LONG | CHUTE DROP | 0.4 | 1.6 | 0.06 | chute from 100 ft AGL, aircraft holds overhead as relay |
| HEAVY | HOVER AND LOWER | 0.9 | 0.6 | 0.015 | descends to a hover, lowers the pod on a tether |
| LIGHT | HOVER RELEASE | 0.6 | 0.7 | 0.03 | low hover, direct release |

`deliverySequence` (`sim.js:853-857`) returns `{release, recover, admin, method, note,
missRate, onStation}` where `onStation = release + recover`.

### 5.4 The aircraft state machine

```
IDLE ──launch()──▶ OUTBOUND ──(tNow >= tArrive)──▶ [onStation: RELEASING → RECOVERING]
                     │                                        │
                     │                          resolveDelivery(); legIdx++
                     │                             ├─ more legs → OUTBOUND (next leg,
                     │                             │   tDepart = tNow + HANDOFF_MIN 1.2)
                     │                             └─ last leg → beginReturn()
                     │
                     ├─ cold excursion (ANGEL only, coldC > 9.4 && frac < 0.9) → beginReturn(discardCold=true)
                     ├─ lead casualty dies while inbound → beginReturn(discardCold=false)
                     └─ threat roll fails → LOST  (terminal, never leaves)
                                       ▼
                                  RETURNING ──(tNow >= tHome + TURNAROUND_MIN 3)──▶ IDLE
```

Details:
- **Threat attrition** is rolled every step for any non-`IDLE`, non-`LOST` aircraft standing inside a threat circle: `rng() < 1 − (1 − z.lossPerMin)^dt` (`optimizer.js:783`). On loss: route released, cold-chain manifest counted as `bloodWasted`, `state = 'LOST'`, `dronesLost++`. **A LOST airframe never returns** — there is no repair or replacement path.
- **Position** is linear interpolation on `frac`, clamped to `[0,1]` at both ends (`optimizer.js:807-811`, `optimizer.js:955-959`). During a handoff `tDepart` is 1.2 min in the future, so `frac` is pinned at 0 and the aircraft parks over the casualty.
- **Cold-chain abort** fires only for `allocatorKey === 'ANGEL'`, only while carrying blood, only when `coldC > COLD_MAX_C − 0.6` (9.4 °C) and `frac < 0.9` (`optimizer.js:929-940`).
- **`beginReturn`** (`optimizer.js:682-696`) stamps `sortieLog.tReturn`, releases all remaining `assignedTo`, returns unused stock (`returnStock`, `optimizer.js:667-680`) — **except cold-chain items when `discardCold` is true**, which are destroyed.
- **Turnaround**: `TURNAROUND_MIN = 3` min after touchdown before `IDLE` (`optimizer.js:965`). At that moment `x/y` snap to base and `payloadKey`, `target`, `manifest` clear, `coldC` resets to 3.0.
- **Handoff between legs**: `HANDOFF_MIN = 1.2` min (`optimizer.js:16`).

### 5.5 Cold chain physics

`coldTempAfter(minutes, ambientC, platKey)` — `sim.js:928-933`:
`ambient − (ambient − 3.0) × exp(−minutes / tau)`, with `tau = {HEAVY: 210, LONG: 260, LIGHT: 62}`.
`ambientAt(baseC, tMin) = baseC + 5.5 × sin((t/240)·2π − 1.1)` (`sim.js:922-926`).
`world.ambientC` is **31 °C for PACOM scenarios, 22 °C for EUCOM** (`sim.js:961`) —
keyed on `SCENARIOS[key].theater`, so `PACOM_BASALT` (EUCOM-derived geometry, PACOM
theater tag) gets 31.
Band: `COLD_MIN_C = 1`, `COLD_MAX_C = 10` (`sim.js:60`).

### 5.6 Adding and removing airframes

`addAirframeToBoth(armA, armB, typeKey, baseIdx)` (`sim.js:771-791`) — deliberately
takes both arms and cannot add to one. Same tail number in both. Returns
`{id, type, baseIdx, baseName, a, b}`.
`removeAirframeFromBoth(armA, armB, droneId)` (`sim.js:794-807`) — refuses unless the
airframe is `IDLE` with an empty route **in both arms**.

---

## 6. THE AUDIT CHAIN

**Only arm A carries an audit log in practice.** `createArm` gives both arms an
`audit: []` (`sim.js:982`) but every `app.js` call site passes `APP.armA`, and the
`optimizer.js` call sites are inside HITL/delivery paths that fire for whichever arm
reaches them (so arm B does accumulate `TREAT` and `WASTE` entries). `renderAudit`,
`exportAudit` and `verifyAudit` all read `APP.armA` only (`app.js:1934`, `app.js:3009`).

### 6.1 Entry shape

`audit(arm, t, actor, action, detail, meta)` — `optimizer.js:80-88`:

| Field | Type | Meaning |
|---|---|---|
| `seq` | integer, 1-based | Position in the chain. |
| `t` | sim-minutes | |
| `actor` | string | See below. |
| `action` | string | See below. |
| `detail` | string | Free text. |
| `meta` | object \| null | Structured payload, **not covered by the hash**. |
| `prev` | 8 hex chars, or `'GENESIS'` for seq 1 | Previous entry's hash. |
| `hash` | 8 hex chars | `auditHash(prev, payload)`. |

### 6.2 The hash

`auditHash(prev, payload)` — `optimizer.js:71-78` — is **FNV-1a 32-bit**, hex-padded
to 8 characters, over the string `prev + '|' + payload`, where
`payload = [t.toFixed(2), actor, action, detail].join('|')` (`optimizer.js:82`).

It is not a cryptographic hash. It is a 32-bit non-keyed checksum chain: it detects
accidental corruption and casual edits, not a determined forger. The `meta` object is
outside the hash entirely, so `meta` can be altered without breaking the chain.

`verifyAudit(arm)` (`optimizer.js:90-99`) walks from `'GENESIS'`, recomputing each
`payload` and hash, and returns `{ok: false, at: seq}` on the first mismatch of either
`prev` or `hash`, otherwise `{ok: true, n}`. It verifies **linkage and content
integrity**, not authorship or ordering by wall clock.

### 6.3 Actors and actions

Actors observed: `SYSTEM`, `COMMANDER`, `OPERATOR`, `ANGEL SWARM`, and
`CMDUAV.callsign` = `'OVERWATCH'` (`app.js:2016`).

| Action | Actor | Written where |
|---|---|---|
| `RUN-START` | SYSTEM | `app.js:365` |
| `RUN-COMPLETE` | SYSTEM | `app.js:392` |
| `DESIGNATE` / `REVOKE` | COMMANDER | `app.js:368`, `485`, `496` |
| `DEPLOY-REQUEST` | COMMANDER | `app.js:703` |
| `DEPLOY-COMPLETE` | COMMANDER | `app.js:748` |
| `RECALL` | COMMANDER | `app.js:766` |
| `THRESHOLD` | SYSTEM | `app.js:798` |
| `HEALTH-POLL` | COMMANDER or SYSTEM (if scheduled) | `app.js:2002` |
| `HEALTH-REPORT` | OVERWATCH | `app.js:2016` |
| `SYSTEM-ACTIVATE` / `SYSTEM-STANDBY` | OPERATOR | `app.js:2268` |
| `POLICY` | OPERATOR | `app.js:4648` |
| `MODE` | COMMANDER | `app.js:5188` |
| `ESCALATE` | ANGEL SWARM | `optimizer.js:167` |
| `AUTO-DISPATCH` | ANGEL SWARM | `optimizer.js:468` |
| `PRIORITY` | ANGEL SWARM | `optimizer.js:494` |
| `APPROVE` / `REJECT` | OPERATOR (or caller-supplied actor) | `optimizer.js:184`, `196` |
| `HOLD` / `RELEASE` | OPERATOR | `optimizer.js:203` |
| `EXPIRE` | SYSTEM | `optimizer.js:220` |
| `WASTE` | SYSTEM | `optimizer.js:1023` |
| `TREAT` | SYSTEM | `optimizer.js:1112` |

### 6.4 Export

`exportAudit()` (`app.js:3009-3015`) downloads `angel_swarm_audit.csv` with header
`seq, time_min, actor, action, detail, prev_hash, hash`. `detail` is double-quoted
with `"` doubled. **`meta` is not exported.** The CSV carries the full chain, so a
recipient can re-run the same FNV-1a walk and verify it offline.

Other exports (all `download()`, `app.js:3001-3007`):

| Function | File | Content |
|---|---|---|
| `exportStream` `app.js:3017` | `angel_swarm_ground_stream.csv` | `happened_min, received_min, relay_lag_min, aircraft, platform_type, casualty_id, payload, phase, relay, report` — arm A only. Refuses if the stream is empty. |
| `exportCasualties` `app.js:3053` | `angel_swarm_casualties.csv` | `id, triage, injury, reserve_pct, minutes_to_collapse, responder, treated_with, outcome` at `max(APP.t, APP.tView)`; `outcome` renders `'OPEN'` when null. |
| `exportRoi` `app.js:3028` | `angel_swarm_roi.csv` | Per-1000-casualty normalised comparison. |
| `exportRuns` `app.js:3048` | `angel_swarm_runs.json` | `APP.sweep.results` if a sweep exists, else `APP.runs`. |
| `exportSqlite` `app.js:2989` | `angel_swarm_mission.sqlite` | Whole DuckDB/SQLite snapshot via `DB.export()`. |

---

## 7. THE DEATH ACCOUNTING

`app.js:83-331` is a hard contract: no renderer may compute a death count itself.
The comment at `app.js:87-92` states the defect this prevents — "died" previously
meant three different numbers on three different panes.

### 7.1 The three counts

**(A) Survivable deaths — `COUNT.deathsSurvivable(arm)` (`app.js:147`) → `arm.stats.survivableDeaths`.**
The headline. Incremented at exactly three sites, each guarded by
`cls === 'IMMEDIATE' || cls === 'DELAYED'`:
- `optimizer.js:902` — died past the physiological deadline, untreated.
- `optimizer.js:1115` — died after a payload was administered.
- `optimizer.js:1135` — resolved by `finalize()` at end of run.

Population: `COUNT.SURVIVABLE = c => c.cls === 'IMMEDIATE' || c.cls === 'DELAYED'`
(`app.js:120`). `MINIMAL` (survives regardless) and `EXPECTANT` (does not) are excluded.
Denominator `arm.stats.survivableTotal` is incremented on admission (`optimizer.js:754`).
The mirror `survivableSaved` uses the same guard.

**Note: the population is the casualty's TRUE `cls`, not the perceived one.** Even in
`realistic` mode where the control arm mis-triages, the cohort is defined by ground truth.

**(B) All-category deaths — `COUNT.deathsAll(arm)` (`app.js:141`) → `arm.stats.died`.**
Every `outcome === 'DIED'`, all four triage classes. Always ≥ (A). `COUNT.selfTest()`
asserts both against a direct filter of `arm.casualties` and fails if survivable
exceeds all (`app.js:307-322`).

`COUNT.deathBridge(arm)` (`app.js:298-302`) emits the reconciliation sentence.
`COUNT.LABEL` (`app.js:274-288`) forbids the bare word: `DIED_SURVIVABLE = 'Died of
wounds they could have survived'`, `DIED_ALL = 'Died of wounds — every triage
category'`, `DIED_THEATRE = 'Died of wounds across every operation'`.

**(C) Theatre-wide deaths — `COUNT.deathsAcrossTheatre()` (`app.js:165-167`).**
`Object.keys(THEATERS).reduce((s,k) => s + theaterRoll(k).died, 0)` — i.e. **both
combatant commands, all 7 JOAs**, not just the current theatre. `theaterRoll(thKey)`
(`app.js:917-925`) sums `joaStatus(j.key).died` over that theatre's JOAs.

`joaStatus` (`app.js:825-866`) has two branches:
- **The live JOA** (`joaKey === SCENARIOS[APP.scenarioKey].joa`): `died = armA.casualties.filter(c => c.outcome === 'DIED').length` — the **all-category** count for arm A only. Arm B is invisible to the theatre roll-up.
- **Every other JOA**: a deterministic synthetic feed. `createWorld(j.scenario, 900 + joaKey.length * 7)` cached in `_joaCache`; `arrived = stream.filter(tInjury <= APP.t)`; `resolved = arrived.filter(t − tInjury > 26)`; **`died = round(resolved.length × 0.31)`**; `saved = resolved − died`; `open = arrived − resolved`. Marked `live: false`, `active: false`.

Three consequences a designer must know:
1. (C) mixes one simulated all-category figure with six synthetic 31%-of-resolved figures. It is **not** commensurable with (A) or (B), and the comment at `app.js:161-164` says so: a survivable-only theatre figure "would be an invention" because the synthetic feed does not model triage.
2. The synthetic seed is `900 + joaKey.length * 7`, so JOAs with equal-length keys share a seed (`CORAL`/`AMBER`/`FJORD` → 935; `BASALT`/`TIMBER` → 942; `MARINER`/`GRANITE` → 949). Different scenarios make the streams differ anyway, but the seed is not distinct per JOA.
3. The synthetic feed advances off `APP.t`, so the whole theatre freezes when the run is paused and resets when `resetSim` runs — but `_joaCache` is **never cleared**, so the streams themselves persist for the life of the page.

**(D) A fourth, narrower count that is easy to mistake for a category:**
`COUNT.deathsFromCoverage(arm)` (`app.js:161`) → `arm.stats.coverageDeaths`. Survivable
deaths where `c.reachN <= 1`. Incremented **only** on the missed-deadline path
(`optimizer.js:907-916`), never on the treated-and-died or `finalize` paths. It is a
strict subset of (A) but is not derivable from the other counts.

### 7.2 Death causes — `deathCauses(arm)` (`optimizer.js:252-270`)

Population: `outcome === 'DIED' && (cls === 'IMMEDIATE' || cls === 'DELAYED')` —
identical to (A). `COUNT.selfTest` asserts `deathCauses(arm).total === COUNT.deathsSurvivable(arm)`
(`app.js:323-324`).

Attribution is a **first-match cascade** — each death lands in exactly one bucket, and
the order is load-bearing:

| Order | Key | Test | Label (`CAUSE_LABELS`, `app.js:2203-2209`) |
|---|---|---|---|
| 1 | `treatedDied` | `c.treated` | "reached in time and died anyway" |
| 2 | `noResponder` | `usablePayloads(c, arm.telementor).length === 0` | "nobody on scene could administer what they needed" |
| 3 | `noLaunchPoint` | `lpInRange(c) <= 1` | "no launch point close enough to reach them" |
| 4 | `tooFast` | `c.deadlineMin < 10` | "collapsed faster than any aircraft could fly" |
| 5 | `busy` | everything else | "every aircraft was committed elsewhere" |

`lpInRange(c)` counts **distinct `baseIdx`** whose airframes satisfy
`dist(baseX, baseY, c.x, c.y) <= effectiveRadiusKm(plat, 1.45)` (`optimizer.js:253-258`).
Note it counts launch points, whereas `scoreCoverage`'s `c.reachN` counts **airframes**
(`optimizer.js:704-706`). The two are different numbers and both are `<= 1`-tested
in different places (`optimizer.js:264` vs `optimizer.js:907`, `app.js:220`).

`causeStrip` (`app.js:2210-2222`) states that only `cz.busy` would have been touched
by a larger fleet. Because the cascade is ordered, a casualty who was both untreatable
by their responder *and* out of reach is attributed to `noResponder`, never to
`noLaunchPoint`. **The bucket names describe the first binding constraint, not the
only one.**

### 7.3 Where a death is decided

Three and only three resolution points, all using the same common random number
`makeRNG(c.id * 6151)`:

| Path | Line | Threshold | Timing |
|---|---|---|---|
| Deadline exceeded, untreated | `optimizer.js:894-901` | `r() < survivalIfUntreated(c)` | when `elapsed > deadlineMin + 8` (an 8-minute grace) |
| Payload administered | `optimizer.js:1103-1106` | `r() < survivalIfTreatedAt(c, tAdmin, pk) × tmPenalty(...)` | at `tAdmin = tRecovered + admin` |
| End of run | `optimizer.js:1122-1136` | `r() < survivalIfUntreated(c)` | at `tEnd` (called with no argument from `stepSim`, so `tResolved` falls back to `c.tInjury + min(deadlineMin, 9000)`) |

`survivalIfUntreated` (`sim.js:721-726`): MINIMAL 0.995, DELAYED 0.42, EXPECTANT 0.02,
IMMEDIATE 0.06.

`survivalIfTreatedAt(cas, tTreat, payloadKey)` (`sim.js:687-719`):
- Wrong item (`needs.indexOf(pk) < 0`) → returns the untreated probability.
- `efficacy = [1.0, 0.86, 0.62, 0.45][min(idx, 3)]` by position in `needs`.
- TXA past 180 min → `untreated × 0.94` (net harm).
- `TQ_KIT` applied by a T1 responder → `efficacy × (BUDDY_TQ_SUCCESS 0.62 + TELEMENTOR_UPLIFT 0.18) = ×0.80`.
- Odds decay: `odds = odds0 × orPerMin^effDelay`, where `orPerMin` is 1.11/min for penetrating and 1.020/min otherwise, and `effDelay = min(delay, penetrating ? 45 : 180)` — the compounding window is **capped**.
- Past the deadline: `decompPenalty = exp(−(delay − deadlineMin)/6)`.
- Final: `pUntreated + (pTreated − pUntreated) × efficacy × decompPenalty`.

**The clock that decides is administration time, not arrival time.** `tAdmin = tNow
(recovery complete) + admin` and the survival probability is evaluated at `tAdmin`
(`optimizer.js:1092-1095`). Arrival overhead is `release + recover` earlier.

---

## 8. THE SCENARIO

### 8.1 What defines a scenario

A scenario object (`sim.js:300-383`) carries:

| Field | Type | Meaning |
|---|---|---|
| `key`, `theater`, `joa` | strings | Identity and ownership. |
| `name`, `blurb` | strings | Display. |
| `widthKm`, `heightKm` | km | The AO box. All positions are in this frame. |
| `land` | `'archipelago' \| 'continuous'` | Selects the terrain engine (`makeTerrain`, `sim.js:543-591`). |
| `terrainSeed` | integer | Procedural elevation seed. |
| `islands[]` | `{x, y, r, h (m), sx, sy, name?}` | Archipelago only; empty for continuous. |
| `bases[]` | `{name, x, y, fleet: [[type, n]], afloat?}` | Launch points and their fleets. |
| `threats[]` | `{x, y, r (km), lossPerMin, label}` | Attrition circles. |
| `clusters[]` | `{x, y, r}` | Casualty spawn regions **and** the sectors `commitSectors` reasons over **and** the seed for `unitsFor`. |
| `aor`, `gridZone`, `hostileBearing`, `friendly` | strings | Labels. |
| `places[]` | `{name, x, y, kind: 'sea'\|'land'\|'strait', size}` | Named features; `placeNameAt` uses land places and named islands only (`sim.js:903-910`). |
| `boundary` | `{label, pts: [[x,y],…], ticks?}` | FLOT / claim line. |
| `durationMin` | minutes | **180 in every scenario** — never overridden by a variant. |
| `baseRatePerMin` | casualties/min | Poisson background rate. |
| `mascalEvents[]` | `{atMin, n}` | Mass-casualty bursts; each casualty jittered `+0..3.5` min. |
| `comms[]` | `{atMin, durMin, label}` | Comms-denial windows. |

`unitsFor(scn)` (`sim.js:210-216`) builds one unit per cluster, named from
`UNIT_NAMES` cyclically, with `assigned = 34 + ((i*7) % 11)` — so a 4-cluster scenario
has strengths 34, 41, 37, 44 = **156** assigned.

### 8.2 The seven that ship

Two are written out in full (`PACOM_CORAL` `sim.js:301`, `EUCOM_GRANITE` `sim.js:340`);
five are `joaVariant` deep-copies with overrides (`sim.js:385-514`).

| Scenario | Theater / JOA | Derived from | AO (km) | Land | Ambient | Clusters | Bases (fleet) | Threats (lossPerMin) | Rate/min | MASCAL (at, n) | Comms window |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `PACOM_CORAL` | PACOM / CORAL | — | 92 × 118 | archipelago (6 islands) | 31 °C | 4 | FARP ALPHA (L1,H1); LHA BOXER *afloat* (H2,LONG1); FARP BRAVO (L1,H1) | A2/AD .009; C-UAS PICKET .006 | 0.34 | 18/13, 62/18, 116/16, 154/12 | SATCOM DENIED @88, 12 min |
| `PACOM_BASALT` | PACOM / BASALT | `EUCOM_GRANITE` | 78 × 104 | continuous | 31 °C | 4 | BSA HAWK (L1,H1); BSA TIGER (H2,LONG1); BSA EAGLE (L1,H1) | MASSED TUBE ARTILLERY .007; SHORAD BELT .006 | **0.52** (highest) | 11/17, 48/23, 98/26, 145/19 | EW JAMMING @52, 14 min |
| `PACOM_MARINER` | PACOM / MARINER | `PACOM_CORAL` | 104 × 96 | archipelago (5 islands) | 31 °C | 4 | FARP NORTH (L1,H1); ESB TRIPOLI *afloat* (H2,LONG1); FARP MAIN (L1,H1) | LONG-RANGE FIRES FAN .005 | **0.20** (lowest) | 26/9, 74/12, 132/11 | SATCOM DENIED @96, 10 min |
| `PACOM_TIMBER` | PACOM / TIMBER | `PACOM_CORAL` | 118 × 88 | archipelago (4 islands) | 31 °C | 4 | FARP WEST (L1,H1); FARP CENTRE (H2,LONG1); FARP EAST (L1,H1) | IRREGULAR C-UAS .004; CONTESTED STRAIT .003 | 0.26 | 20/11, 68/14, 126/13 | HF RELAY ONLY @80, **16 min** |
| `EUCOM_GRANITE` | EUCOM / GRANITE | — | 86 × 116 | continuous | 22 °C | 4 | BSA NORTH (L1,H1); BSA CENTER (H2,LONG1); BSA SOUTH (L1,H1) | FPV SATURATION .006; COUNTER-BATTERY/EW .005 | 0.45 | 14/15, 54/21, 104/24, 150/17 | EW JAMMING @60, 15 min |
| `EUCOM_AMBER` | EUCOM / AMBER | `EUCOM_GRANITE` | 96 × 74 | continuous | 22 °C | 4 | BSA WEST (L1,H1); BSA CENTRE (H2,LONG1); BSA SOUTH (L1,H1) | NORTHERN FIRES .008; SOUTHERN FIRES .007 | 0.48 | 16/16, 58/22, 108/25, 152/18 | EW JAMMING @44, **18 min** |
| `EUCOM_FJORD` | EUCOM / FJORD | `EUCOM_GRANITE` | 122 × 92 | continuous | 22 °C | 4 | FOB NORTH (L1,H1); FOB CENTRE (H2,LONG1); FOB SOUTH (L1,H1) | COASTAL MISSILE BATTERY .004 | 0.22 | 30/10, 84/13, 140/12 | AURORAL HF BLACKOUT @70, **20 min** |

Invariants across all seven: `durationMin = 180`; 4 clusters; 3 launch points; the
same fleet shape — `[LIGHT 1, HEAVY 1]`, `[HEAVY 2, LONG 1]`, `[LIGHT 1, HEAVY 1]`,
i.e. **7 airframes per arm: 2 LIGHT, 4 HEAVY, 1 LONG**. An afloat base exists only in
CORAL (`LHA BOXER`) and MARINER (`ESB TRIPOLI`).
Expected casualty count = `baseRatePerMin × 180` + sum of MASCAL `n`; e.g. GRANITE
≈ 81 + 77 = **~158**, MARINER ≈ 36 + 32 = **~68**.

### 8.3 Theatres

`THEATERS` (`sim.js:251-298`): two combatant commands.

| Key | Label | lon0/lon1, lat0/lat1 | HQ | JOAs |
|---|---|---|---|---|
| `PACOM` | Indo-Pacific | 92→178, −18→52 | PACOM HQ — CAMP H.M. SMITH (176, 21.3) | CORAL (DECISIVE, 3d MLR), BASALT (SHAPING, 2ID Fwd), MARINER (SUSTAINMENT, JTF MARIANAS), TIMBER (ECONOMY OF FORCE, CJTF SOUTHERN APPROACH) |
| `EUCOM` | Europe | 2→46, 33→72 | EUCOM HQ — PATCH BARRACKS (9.1, 48.7) | GRANITE (DECISIVE, 2 BCT), AMBER (SHAPING, MND North-East), FJORD (ECONOMY OF FORCE, MRF Europe) |

Each JOA entry carries `{key, name, lon, lat, scenario, force, posture, note}`.
`posture` enumeration: `DECISIVE`, `SHAPING`, `SUSTAINMENT`, `ECONOMY OF FORCE`.
Aircraft cannot cross a combatant command — `joaActionHTML` renders
`OUT OF THEATRE — NOT YOURS TO TASK` for a JOA outside `APP.theaterKey`
(`app.js:888-894`), and `changeOperation` refuses with a toast (`app.js:934-938`).

### 8.4 Comms denial

`arm.commsDown = scn.comms.some(w => t >= w.atMin && t < w.atMin + w.durMin)`
(`optimizer.js:773`). While down:
- **No telemetry burst reaches the tasking picture**; `c.teleHeld` increments instead (`optimizer.js:821`).
- **No allocator runs at all, in either arm** (`optimizer.js:975`). The source comment at `optimizer.js:768-770` says ANGEL SWARM "holds its last-known-good plan and keeps flying" while current triage and proximity "cannot task at all" — but the code gates **both** arms identically. Aircraft already airborne continue their routes; neither arm generates new tasking.
- Stream events are stamped `tRecv: null` / `relay: 'BUFFERED ON AIRCRAFT'`, then back-filled by `flushStream` with `'OVERWATCH (DELAYED)'` and the original `t` preserved.

### 8.5 The command UAV

`CMDUAV` (`sim.js:225-233`): `MQ-1C ER (C2/ISR relay)`, callsign `OVERWATCH`,
`orbitPeriodMin: 26`, `footprintKm: 26`, `pollSweepMin: 2.5`. It carries no payload
and flies no casualty sorties. Position: an ellipse racetrack about the AO centre,
semi-axes `0.30 × widthKm` and `0.32 × 0.9 × heightKm` (`sim.js:235-241`).

`refreshTelemetry()` (`app.js:1956-1972`, called every `stepSim`) refreshes
`c.tPinged`/`c.reportedCrm` for any open casualty inside the footprint **or** inside
an active poll sweep. `staleness(c) = max(0, APP.tView − c.tPinged)`.
`requestPing(unitKey, actor)` (`app.js:1998-2007`) starts a 2.5-min sweep, one at a
time; `finishPing` (`app.js:2008-2027`) writes a record into `APP.pings` (capped at
60) and audits `HEALTH-REPORT`. `APP.pingInterval` (default 0 = off) can schedule them.

Unit readiness bands (`readiness(eff)`, `app.js:1993-1996`):
`eff >= 0.90 GREEN`, `>= 0.80 AMBER`, `>= 0.70 RED`, else `BLACK`.
`eff = max(0, (assigned − died − open) / assigned)` — **open wounded count against
effectiveness exactly as heavily as the dead** (`app.js:1985`).

---

## 9. Genuine ambiguities and defects found in source

Listed so a designer does not design around a behaviour that is unintended, or assume
consistency that is not there.

1. **`setAngelActive` and `APP.deploy.state` can disagree** (§1.4). Two panes read two different flags for "is ANGEL SWARM running".
2. **`if (T.auto) openDeployModal('THRESHOLD') || beginDeployment();`** (`app.js:801`) — `openDeployModal` returns `undefined`, so auto-deploy always commits immediately.
3. **The comms-denial comment contradicts the code** (§8.4): the prose says only the control arm is grounded; `optimizer.js:975` grounds both.
4. **`d.lastLoad`** is declared (`sim.js:761`) and cleared (`optimizer.js:628`) but never assigned a value.
5. **`arm.stats.stops`** is always exactly equal to `arm.stats.treated` — same increment site (`optimizer.js:1101`).
6. **`arm.stats.wastedSorties`** counts failed *deliveries*, not sorties; a 4-stop sortie can add 4.
7. **`_propId`** (`optimizer.js:146`) and the `_joaCache` (`app.js:817`) are module-level and survive `resetSim`. Proposal ids keep climbing across runs; the theatre's synthetic streams are built once per page.
8. **`c.reachN` (airframes) and `deathCauses`'s `lpInRange` (launch points)** are different measures both compared against `<= 1`. `COUNT.coverageSectors` publishes a third, `coverN` — airframes covering the *whole* cluster — and the comment at `app.js:243-249` says explicitly the two do not always agree.
9. **`c.decision` exists for scored candidates, not only for committed taskings**; `COUNT.tasked` (`app.js:174-192`) deliberately excludes it, and the comment records that counting it produced a "21-against-20" defect.
10. **`inRange` measures from the drone's home base, not its current position** (`sim.js:914`), while `escalationReasons` ground 4 measures from the drone's current position against ferry radius (`optimizer.js:139`).
11. **Arm B accumulates audit entries** (`TREAT`, `WASTE` from `optimizer.js`) that nothing ever renders or exports.
12. **The `RESUPPLY` stock-log rows and the actual stock addition are written in two separate loops** (`optimizer.js:758-762` vs `765-766`). They agree today only because both recompute `min(RESUP, CAP − stock)` against the same pre-add value; nothing enforces it.
13. **`APP.autoApproveAbove` defaults to 0.10 in `APP` (`app.js:19`) but `createArm` defaults `autoApproveAbove` to 0.55 (`sim.js:982`).** Arm A is overwritten to 0.10 by `resetSim`; arm B keeps 0.55 and never uses it. Any pane that reads `arm.autoApproveAbove` off arm B will show the wrong number.
