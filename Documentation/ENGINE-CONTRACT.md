# ANGEL SWARM — `angel-engine.js` DATA CONTRACT

**Derived from:** `/home/build/angel/DESIGN/ANGEL_SWARM-v2.dc.html` (324,163 B, 3,122 lines)
**Method:** exhaustive trace of every `this.E.*`, `run()`, `snap()`, `runD`, `runU` read in the
`<script data-dc-script>` block, then every `{{ }}` binding in the `<x-dc>` template traced back
to the `renderVals()` local that produced it.
**All line numbers below are lines in `ANGEL_SWARM-v2.dc.html`.**

---

## 0. READ THIS FIRST — the design file is a spliced double

The file contains the component script **twice**, mis-spliced:

| Region | Lines | Content |
|---|---|---|
| `<head>` + `<x-dc>` template | 1 – 1048 | the authoritative template |
| `<script data-dc-script>` open | 1049 | props: `startState`, `showStateSwitcher`, `seed`, `defaultSpeed` |
| **Copy A** — complete `class Component` | 1050 – 2154 | constants, `state`, lifecycle, all 30 value methods |
| stray `</script></body></html>` | 2155 – 2157 | splice seam (the `</html>` is glued onto the next line) |
| **Copy B** — fragment | 2157 – 3119 | tail of `opsVals()` → `boardRow()` |
| real close | 3120 – 3122 | `</script></body></html>` |

I diffed the overlap. **From `evVals()` onward (940 lines) Copy A and Copy B are byte-identical.**
The *only* substantive difference is that **Copy B's `opsVals()` returns an extra key `scenRows`**
(lines 2157–2169) that Copy A's `opsVals()` (lines 1176–1214) does not. The template *does* bind
`{{ scenRows }}` (line 1023, Run Setup screen), so **Copy B is the newer one** and the authoritative
script is **Copy A + `scenRows` in `opsVals()`**.

`scenRows` is a hard-coded literal — it needs nothing from the engine. **So for contract purposes,
Copy A (lines 1050–2154) is complete and sufficient.** Everything below cites Copy A.

Two more files the design imports that are also absent from disk:

* `./angel-engine.js` — this contract (line 1084).
* `./theater-map.js?v=17` — the map renderer, mounted at line 850 via
  `<x-import component-from-global-scope="theater-map" data="{{ mapData }}">`. See §6.

---

## 0.5 Size of the job, at a glance

| | Top-level fields | Nested interfaces | Distinct leaf fields |
|---|---|---|---|
| `Run` (from `buildRun`) | 4 | 10 (`Arm`, `Casualty`, `Sortie`, `Stop`, `Proposal`, `AuditEntry`, `ArmStats`, `Base`, `Drone`, `StockLogEntry`) | **58** |
| `Frame` (from `snapshot`) | **34** | 6 (`Row`, `FleetUnit`, `Shelf`, `ArmTotals`, `Causes`, `StreamEvent`) + reuses `Proposal` and `AuditEntry` | **89** |
| `WORLD` | 8 | 3 (`bases`, `sites`, `threats` element shapes) | 17 |
| `PAYLOADS` | — | 1 | 1 (`short`) |

Screens that need **nothing** from the engine: `sensor`, `auth`. Screens that need only
`run.seed` + `run.stream.length`: `data`, `setup`.

---

## 1. Module surface

The design uses **exactly four exports**. Nothing else is touched.

```ts
// angel-engine.js
export function buildRun(opts: { seed: number; deployed: boolean }): Run;   // 1084, 1085, 1222
export function snapshot(run: Run, t: number): Frame;                        // 1125
export const WORLD: World;                                                   // 1355, 1721, 1977, 2071
export const PAYLOADS: Record<PayloadKey, { short: string }>;                // 1682, 1685, 1762, 1828
```

`buildRun` is called three ways:

| Call site | Line | Purpose |
|---|---|---|
| `E.buildRun({ seed: 42, deployed: true })` → `this.runD` | 1084 | the ANGEL SWARM arm |
| `E.buildRun({ seed: 42, deployed: false })` → `this.runU` | 1085 | the "not deployed" arm (both arms current triage and proximity) |
| `E.buildRun({ seed: 100 + i, deployed: true })`, i = 0..39 | 1222 | the Evidence → REPLICATIONS button; reads only `r.A.stats.survivableDeaths` and `r.B.stats.survivableDeaths` (line 1223) |

`buildRun` must be **synchronous and fast**: the replication loop builds 40 runs inside a
`setTimeout(…, 60)` (lines 1219–1244) with no progress UI.

`run()` (1124) selects `runD` when `state.deployed`, else `runU`.
`snap()` (1125) is called fresh on **every** `renderVals()`, i.e. every 120 ms tick (1096) —
so `snapshot()` must be cheap, or memoised on `(run, t)`.

`t` is **minutes since run start**, float, quantised to 0.25 min steps, domain **0 … 180**
(1094: `Math.min(180, t + speed * 0.12)`; 1607: `'180 min · 0.25 min steps'`).

---

## 2. `buildRun({ seed, deployed }) → Run`

### 2.1 Top level

```ts
interface Run {
  seed: number;        // echoed on Ask ANGEL side panel (1317), Data File (1721), Run Setup (1606)
  stream: unknown[];   // THE CASUALTY STREAM. Only `.length` is ever read (1607, 1721).
                       // NOTE: this is NOT the same thing as Frame.stream (§3.10).
  A: Arm;              // the ANGEL SWARM arm            (1240, 1669, 1734, 1884)
  B: Arm;              // the doctrinal-push control arm (1240, 1252, 1681)
}
```

When `deployed === false`, **both `A` and `B` must run current triage and proximity** — the design says so in
prose (1249, 1330, 1802) and reads `s.delta` as 0/unreadable in that state.

### 2.2 `Arm`

```ts
interface Arm {
  cas:       Casualty[];   // 1382, 1389, 1390, 1682   — every casualty in the run, all time
  sorties:   Sortie[];     // 1252, 1270(A/B), 1685
  proposals: Proposal[];   // 1131, 1843               — escalations raised across the whole run
  audit:     AuditEntry[]; // 1737, 1742               — full audit chain, ascending `t`
  stats:     ArmStats;     // 1207, 1223, 1283, 1681
  bases:     Base[];       // 1886, 1899               — index-aligned with Frame.stock (see §3.7)
  drones:    Drone[];      // 1888, 1898, 1904
  stockLog:  StockLogEntry[]; // 1242 — read into a DEAD LOCAL. See §7.
}
```

### 2.3 `Casualty` — `Arm.cas[]`

Consumed by the map (1361–1373), the map site roll-up (1389–1390), and the Analyst SQL
console (1682).

```ts
interface Casualty {
  cid:         string;   // 'CAS-017'                         1682
  x:           number;   // world km, same frame as WORLD.bases/sites   1367, 1375
  y:           number;   //                                             1367, 1375
  site:        string;   // must match a WORLD.sites[].name              1389, 1390
  cls:         TriageClass;                                  // 1370, 1390
  tInjury:     number;   // minutes; casualty appears when tInjury <= t  1361, 1363, 1389
  deadlineMin: number;   // minutes of survival budget from tInjury.
                         // >= 9000 is the SENTINEL for "no assertable deadline"  1363, 1683
  tResolved:   number|null; // minutes; null = still open                1362, 1389
  outcome:     Outcome;  // only 'DIED' is tested; printed raw in SQL    1364, 1390, 1682
  treated:     boolean;  //                                             1682
  tTreated:    number;   // minutes; only read when treated              1682
  treatedWith: PayloadKey; // index into PAYLOADS                        1682
  lpReach:     number|null; // launch points in reach. READ AT 1371 THEN
                            // IMMEDIATELY OVERWRITTEN at 1376 by the design's own
                            // recompute. See §7 — effectively optional.
}
```

Derived-in-design (do **not** supply): `tRem = tInjury + deadlineMin - t` (1363),
map `state` bucket (1364–1365), `frac`, `min`, `hv = cls === 'IMMEDIATE' && deadlineMin < 22` (1370).

### 2.4 `Sortie` — `Arm.sorties[]`

```ts
interface Sortie {
  tLaunch: number;   // minutes; `.filter(x => x.tLaunch <= t).length` is the sortie count  1252, 1270, 1685
  stops:   Stop[];   // 1685
}
interface Stop {
  casId:   number;      // numeric id → design formats as 'CAS-' + pad(3)   1685, 1960
  payload: PayloadKey;  //                                                  1685
  tAdmin:  number;      // minutes                                          1685
  fail:    string|null; // waste reason, human-readable; falsy = delivered  1685
}
```

### 2.5 `Proposal` — `Arm.proposals[]` (identical shape to `Frame.pending[]`)

`Arm.proposals` is read only for `tRaised` (1131, 1843) — to compute the **PEND** preset — but the
same objects surface as `Frame.pending`, where every field below is consumed.

```ts
interface Proposal {
  id:       number;      // formatted 'E-' + pad(4)                          1715, 1717, 1810
  tRaised:  number;      // minutes; printed .toFixed(1)                     1131, 1758, 1843
  call:     string;      // airframe callsign                                1748, 1757
  casId:    number;      // numeric casualty id → 'CAS-' + pad(3)            1748, 1757
  altId:    number|null; // the casualty NOT served if this commits          1763
  eta:      number;      // minutes from wounding to arrival, Math.round'd   1761, 1762
  deadline: number;      // minutes; aSlack = round(deadline - eta)          1762
  gain:     number;      // expected benefit, printed raw                    1762, 1953
  route:    { payload: PayloadKey }[];  // joined with ' + ' via PAYLOADS[].short  1762
  grounds:  string[];    // escalation grounds, rendered as chips            1764, 1769, 1955
}
```

**Lapse window is 8 minutes**, hard-coded in the design (1759, 1760, 1951): a proposal is shown as
lapsing at `tRaised + 8`. The engine must make `Frame.pending` agree with that.

### 2.6 `AuditEntry` — `Arm.audit[]` (identical shape to `Frame.feed[]`)

```ts
interface AuditEntry {
  seq:    number;        // '#' + pad(4)                        1801
  t:      number;        // minutes; printed .toFixed(1)        1737, 1738
  actor:  string;        // 'ANGEL' / 'OPERATOR' / …            1801
  action: AuditAction;   // see enum table §4                   1737, 1798
  detail: string;        // free text; ESCALATE entries must contain 'E-nnnn'  1738, 1801, 1804
  hash:   string;        // 8 hex chars, chain link             1801, 1677, 1818
}
```

`Arm.audit` is filtered at 1737 for `action === 'AUTO-DISPATCH'` and `t <= state.t`, last 6, reversed.
`Arm.audit.filter(e => e.t <= t).slice(-1)[0].seq` (1742) seeds the operator's own appended entries,
so **`audit` must be in ascending `t` order**.

### 2.7 `ArmStats`

```ts
interface ArmStats {
  allDeaths:        number;  // every triage category, full run   1207, 1681
  survivableDeaths: number;  // replications only                 1223
  coldSwaps:        number;  // routings refused on the cold-chain test  1283
}
```

### 2.8 `Base` and `Drone` — the deploy modal (1882–1907)

```ts
interface Base {
  name:   string;   // e.g. 'FLP …' / 'LHA …' (design strips those prefixes at 2113)  1888, 1890
  afloat: boolean;  // → 'AFLOAT · COLD CHAIN NOMINAL' vs 'ASHORE …'                  1892
}
interface Drone {
  call: string;                        // tail/callsign                    1888, 1898, 1904
  base: { name: string; idx: number }; // idx MUST equal the index of that base
}                                      //   inside Arm.bases (1898, 1904)
```

`Arm.bases` **must be index-aligned with `Frame.stock`**: `shelf(i) = s.stock[i]` at line 1885 is
paired with `A.bases[i]` at 1886.

### 2.9 `StockLogEntry` — read but unused

```ts
interface StockLogEntry { reason: string; item: string; t: number }  // 1242 — 'ISSUE' / 'BLOOD'
```

---

## 3. `snapshot(run, t) → Frame`

**34 top-level fields.** This is the object every screen reads. `renderVals()` also returns it whole
as `s` (1162), so the template binds three fields directly (`{{ s.missed }}`, `{{ s.inside }}`,
`{{ s.notAssertable }}` at template lines 246–248).

```ts
interface Frame {
  // ── counts of the live board ────────────────────────────────────────────────
  admitted:       number;   // casualties admitted so far          1207, 1292, 2097
  open:           number;   // still on the ground                 1162, 1207, 1402, 1728
  inside:         number;   // open AND inside an assertable deadline   1673, 1777, tmpl 247
  unreachable:    number;   // open, no launch point in reach      1182, 1484, 1673
  notAssertable:  number;   // open, deadlineMin >= 9000           1673, 1930, tmpl 248
  missed:         number;   // open with slack < 0                 1404, tmpl 246
  // ── escalation ledger ──────────────────────────────────────────────────────
  escalated:      number;   // raised this run                     1278, 1675, 1770
  approved:       number;   // authorised after escalation         1675, 1772, 1821
  lapsed:         number;   // lapsed unactioned                   1675, 1772, 1821
  pending:        Proposal[];  // still awaiting a human; [0] drives Decision  1162, 1183, 1675
  // ── the board ──────────────────────────────────────────────────────────────
  rows:           Row[];    // OPEN casualties, ordered by urgency 1182, 1190, 1196, 1962
  tightest:       Row|null; // sharpest deadline; null when nothing open  1179, 1916
  // ── platforms and supply ───────────────────────────────────────────────────
  fleet:          FleetUnit[];  //                                 1378, 1383, 1928, 2110
  stock:          Shelf[];      // index-aligned with run.A.bases  1343, 1684, 1885, 2109
  bloodU:         number;   // whole blood units forward, all sites    1199, 1342, 1402
  plasmaU:        number;   // plasma units forward                    1342
  sitesWithBlood: number;   // launch points holding blood             1199, 1342, 1673
  ready:          number;   // airframes IDLE                          1200, 1333, 1673
  total:          number;   // airframes in this arm                   1200, 1333, 1402
  airborne:       number;   // OUTBOUND + RETURNING                    1200, 1207, 1402
  sortiesFlown:   number;   //                                         1201, 1253, 1681
  administered:   number;   // payloads administered                   1201
  // ── the comparison ─────────────────────────────────────────────────────────
  dA:             number;   // survivable deaths, ANGEL arm            1207, 1253, 1264
  dB:             number;   // survivable deaths, current triage and proximity       1252, 1264
  delta:          number;   // dB - dA. > 0 means ANGEL is ahead       1202, 1249, 1263
  readable:       boolean;  // resolvedSurv >= 10                      1202, 1248
  resolvedSurv:   number;   // survivable cohort resolved so far       1248, 1269
  tA:             ArmTotals;  //                                       1268–1277
  tB:             ArmTotals;  //                                       1268–1277
  causes:         Causes;     // first-binding-cause histogram         1241, 1256, 1287
  // ── environment and record ─────────────────────────────────────────────────
  commsDown:      boolean;  // SATCOM denied window                    1162, 1204, 1420
  auditN:         number;   // entries in the chain                    1677, 1728, 1813
  feed:           AuditEntry[]; // NEWEST FIRST — feed[0].hash is "head"  1677, 1793, 1818
  stream:         StreamEvent[]; // ground/delivery event stream, newest first  1823
}
```

### 3.1 `Row` — `Frame.rows[]` (18 fields)

The single most-consumed shape. Rendered by `qRow()` (1961–1975), `boardRow()` (2118–2153),
the ops wall (1190), the Analyst transcript (1674), the Ask-ANGEL resolver (1331), the mini-map (1981).

```ts
interface Row {
  id:          number;   // stable numeric key. Drives expand state (1973) AND the
                         // mini-map scatter positions (1981: (id*37)%88, (id*53)%112)
  cid:         string;   // 'CAS-017'                                 1191, 1962
  name:        string;   // soldier name; searched (1996) and shown (2068)
  site:        string;   // 'SITE …' — matched against WORLD.sites[].name (2071–2072);
                         //            rendered with 'SITE ' stripped (1191, 1962)
  unit:        string;   // parent unit, expanded card                2137
  injury:      string;   // injury pattern                            1963, 2125
  si:          number|string;  // shock index; printed as 'SI ' + si  2125
  needs:       string;   // what they need                            2125
  responder:   string;   // who is on scene ('medic' / 'combat lifesaver' / 'buddy aid')  2125, 2138
  role:        string;   // role of care they resolve to              2138
  cls:         TriageClass;                                          // 1683, 2124, 2136
  tRem:        number|null;    // MINUTES remaining. null = no assertable deadline.
                               // Rendered by mmss() → 'MM:SS'        1191, 1674, 1963
  deadlineMin: number;   // total budget; >= 9000 sentinel (1683). Denominator of the
                         //   compensatory-reserve bar (2147–2150)
  arrival:     number|null;    // MINUTES to the tasked asset's arrival; null = no asset
                               // Rendered by mmss()                  1192, 1964
  slack:       number|null;    // MINUTES = deadline − arrival. NEGATIVE = will be missed.
                               // null = nothing reaches this bar     1192, 1965, 2132
  tasking:     string|null;    // fleet callsign, or the literal 'ESCALATED', or null  1192, 1966
  reach:       number;   // launch points in reach; 0 → "no launch point can reach"  1182, 1331
  staleMin:    number;   // MINUTES since telemetry refresh; > 2 prints a staleness warning  2151
}
```

`Frame.rows` is treated as **open casualties only**, ordered most-urgent-first: the dashboard shows
`'TOP 8 OF ' + s.rows.length` (1949) and titles the empty state `'RUN COMPLETE — 0 OPEN'` (2106).
`Frame.tightest` should be `rows[0]` in practice (see GAPS).

### 3.2 `FleetUnit` — `Frame.fleet[]` (10 fields)

```ts
interface FleetUnit {
  call:     string;      // callsign; compared against Row.tasking (2145)      2110
  plat:     string;      // platform type, e.g. 'TRV-150C'                     2110
  base:     string;      // base NAME — matched against WORLD.bases[].name (1374)
                         //   and Shelf.name (2114)                            2110
  state:    FleetState;  // see enum §4                                        1378, 1383, 1928
  eta:      number|null;  // MINUTES out; rendered as state + ' ' + eta + 'm'   1929, 2110
  carrying: string|null;  // payload description, free text                    1929, 2110
  target:   string|null;  // casualty/target label                             1929, 2110
  sorties:  number;       // sorties flown by this airframe                    2110, 2114
  x:        number;       // world km — map + mini-map                         1379, 1984
  y:        number;
}
```

### 3.3 `Shelf` — `Frame.stock[]` (8 fields)

```ts
interface Shelf {
  name:   string;   // launch point; matched against FleetUnit.base (2114)  1684, 2109
  afloat: boolean;  // → 'AFLOAT' / 'ASHORE'                                2109
  blood:  number;   // whole blood units on hand; <= 1 turns the cell red   1684, 2109
  plasma: number;   // plasma units                                         1343, 2109
  txa:    number;   // TXA doses                                            1684, 2109
  tq:     number;   // tourniquets                                          2109
  seal:   number;   // chest seals                                          2109
  issued: number|string; // issued so far; suffixed ' · DRAWN DOWN' when blood <= 1  2109
}
```

**Ordering constraint:** `stock[i]` must correspond to `run.A.bases[i]` (deploy modal, 1885–1886).

### 3.4 `ArmTotals` — `Frame.tA` / `Frame.tB` (9 fields)

Both arms' cumulative counters as at `t`. Rendered as the After-Action table (1268–1277) and the
ROI block (1292–1294).

```ts
interface ArmTotals {
  allDeaths:       number;  // every triage category            1268
  sorties:         number;  //                                  1270, 1294
  treated:         number;  // payloads administered            1271, 1294
  unusable:        number;  // deliveries the responder could not use  1272, 1293
  overtaken:       number;  // taskings overtaken before arrival 1273
  bloodIssued:     number;  // units                             1274, 1282
  bloodUsed:       number;  // units transfused                  1275, 1282
  bloodDestroyed:  number;  // units destroyed                   1276, 1292
  bloodAboard:     number;  // units aboard or in flight         1277
}
```

### 3.5 `Causes` — `Frame.causes` (5 fields, all counts)

A first-match cascade over the survivable cohort. The design does `Object.values(s.causes)` for the
bar scale (1241, 1287, 1789), so **the object must contain exactly these five keys and nothing else**.

```ts
interface Causes {
  noLaunchPoint: number;  // no launch point close enough to reach them
  noResponder:   number;  // nobody on scene could administer
  treatedDied:   number;  // reached in time and died anyway
  tooFast:       number;  // collapsed faster than any aircraft could fly
  busy:          number;  // every aircraft was committed elsewhere
}                          // 1256, 1287–1289, 1347, 1822
```

### 3.6 `StreamEvent` — `Frame.stream[]` (5 fields)

The Decision Feed → GROUND STREAM tab, first 40 entries (1823–1834).

```ts
interface StreamEvent {
  t:       number;        // minutes; rendered as zulu HHMM'Z' (240 + t)   1824
  call:    string|null;   // airframe callsign; '—' when absent            1827
  kind:    StreamKind;    // 'DELIVERED' | 'WASTE' | anything-else → 'PAYLOAD AWAY'  1827, 1830
  casId:   number;        // → 'CAS-' + pad(3)                             1828
  payload: PayloadKey|null; // → PAYLOADS[payload].short, else '—'         1828
}
```

### 3.7 Cross-object referential integrity the design assumes

| From | Must match | Line |
|---|---|---|
| `Row.site` | `WORLD.sites[].name` | 2071–2072 |
| `Row.tasking` | `FleetUnit.call` (or `'ESCALATED'`) | 2145 |
| `FleetUnit.base` | `WORLD.bases[].name` | 1374 |
| `FleetUnit.base` | `Shelf.name` | 2114 |
| `Casualty.site` | `WORLD.sites[].name` | 1389–1390 |
| `Drone.base.idx` | index into `Arm.bases` | 1898, 1904 |
| `Frame.stock[i]` | `run.A.bases[i]` | 1885–1886 |
| `Casualty.treatedWith`, `Stop.payload`, `Proposal.route[].payload`, `StreamEvent.payload` | key of `PAYLOADS` | 1682, 1685, 1762, 1828 |
| `AuditEntry.detail` (ESCALATE) | must contain `'E-' + pad(4, Proposal.id)` | 1804 |

---

## 4. `WORLD` and `PAYLOADS`

### 4.1 `WORLD`

```ts
interface World {
  name:        string;   // world/scenario name, shown on Analyst → Data File   1721
  joa:         string;   // 'CORAL' — the live JOA code                         1414, 1419, 1494
  widthKm:     number;   // extent, km                                          1414, 1419, 1471
  heightKm:    number;   //                                                     1414, 1419, 1471
  durationMin: number;   // 180 — map transport progress denominator            1424
  bases:  { x: number; y: number; name: string }[];   // world-km. `.length` shown as
                                                      // 'LAUNCH POINTS'         1374, 1416, 1500, 1978
  sites:  { x: number; y: number; r: number; name: string; unit: string }[];
                                                      // r = radius in world km  1388–1391, 2071–2073
  threats:{ x: number; y: number; r: number; label: string }[];   //             1417, 1977
}
```

The design hard-codes a **33 km launch-point reach radius** (1375, 1416) — it does not read it
from `WORLD`.

### 4.2 `PAYLOADS`

```ts
type PayloadKey = string;                     // opaque; see GAPS
const PAYLOADS: Record<PayloadKey, { short: string }>;   // only `.short` is ever read
```
Only `PAYLOADS[k].short` is consumed (1682, 1685, 1762, 1828). The design elsewhere names five
Class VIII items in static prose (1724): *whole blood, plasma, TXA, haemorrhage kit, chest seal*.

---

## 5. Enumerations

| Type | Values the design tests or switches on | Line |
|---|---|---|
| `TriageClass` | `IMMEDIATE` · `DELAYED` · `MINIMAL` · `EXPECTANT` | 2067 (colour map), 1390 |
| `FleetState` | `IDLE` · `OUTBOUND` · `RETURNING` · `LOST` | 1378, 1928, 2110, 2146 |
| `Outcome` | `DIED` is the only value tested; printed verbatim in the SQL console | 1364, 1390, 1682 |
| `StreamKind` | `DELIVERED` · `WASTE` · *(any other value renders as "PAYLOAD AWAY")* | 1827, 1830 |
| `AuditAction` | `ESCALATE` · `AUTO-DISPATCH` · `APPROVE` · `REJECT` · `TREAT` · `NOT-PREVENTED` · `WASTE` · `EXPIRE` · `LOSS` · `RUN-START` · `RUN-COMPLETE` | 1789–1793, 1737 |
| Sentinel | `deadlineMin >= 9000` ⇒ no assertable deadline ⇒ `tRem === null` | 1363, 1683 |
| Readability floor | `readable` is supplied by the engine; the design never computes it. Prose states the floor is 10 resolved survivable casualties | 1248, 1340 |
| Lapse window | 8 minutes from `tRaised` | 1759, 1951 |
| Reach radius | 33 km | 1376, 1416 |

### 5.1 Units and formats

| Field family | Unit | Format helper | Line |
|---|---|---|---|
| `t`, `tRem`, `arrival`, `slack`, `deadlineMin`, `tInjury`, `tResolved`, `tRaised`, `tLaunch`, `tAdmin`, `tTreated`, `eta`, `staleMin` | **minutes** (float) | `mmss(m)` → `MM:SS`, negative prefixed `−` | 1127 |
| audit / stream timestamps | minutes → **zulu** `HHMM'Z'` via `240 + t` (run starts 0400Z) | `pad()` | 1127, 1160, 1799 |
| header clock | `HHMM:SS'Z'` | 1160 | |
| `x`, `y`, `r`, `widthKm`, `heightKm` | **kilometres**, world frame | — | 1367, 1414 |
| `bloodU`, `plasmaU`, `blood`, `plasma`, `blood*` totals | **units of product** ("U") | — | 1199, 2109 |
| `txa`, `tq`, `seal` | **counts of item** | — | 2109 |
| `dA`, `dB`, `delta`, `allDeaths`, `causes.*`, `resolvedSurv` | **counts of people** | — | 1268 |
| `gain` | expected-benefit score, unitless, printed raw | — | 1762 |
| `si` | shock index, printed raw after `'SI '` | — | 2125 |
| `hash` | 8 lowercase hex chars | — | 1801 |
| `seq`, `Proposal.id` | integers, zero-padded to 4 | `pad()` | 1801, 1715 |
| `casId` | integer, zero-padded to 3 behind `'CAS-'` | `cidOf()` | 1960 |

---

## 6. Map event protocol — `theater-map.js`

The renderer mounts at **line 850**:

```html
<x-import component-from-global-scope="theater-map"
          from="./theater-map.js?v=17"
          data="{{ mapData }}" hint-size="100%,560px"></x-import>
```

`mapData` is a **JSON string** (`JSON.stringify(mapData)`, line 1508) rebuilt on every render.

### 6.1 Inbound payload — `data` prop (design → map)

Built at 1412–1427.

```ts
interface MapData {
  scope: 'theatre' | '2d' | '3d';
  side: boolean;                 // side-by-side arms; only ever true when scope === '2d'
  layers: Record<string, boolean>;  // lay2 keys when 2d/theatre, lay3 keys when 3d — see §6.4
  panelOpen: boolean;
  world: {
    joa: string; widthKm: number; heightKm: number;
    bases:   { x: number; y: number; name: string; reachKm: 33 }[];
    sites:   { x: number; y: number; r: number; name: string; count: number; surv: number }[];
             //   count = open casualties at that site; surv = survivable deaths there
    threats: { x: number; y: number; r: number; label: string }[];
  };
  cas:  MapCas[];   // ANGEL arm
  casB: MapCas[];   // control arm, for the side-by-side
  air:    { x: number; y: number; call: string; hdg: number /*deg*/; dx: number; dy: number }[];
  tracks: { x1: number; y1: number; x2: number; y2: number; ret: boolean }[];
  joas: { name: string; lon: number; lat: number; live?: boolean; force: string; role: string;
          context: string; cond: 'GREEN'|'AMBER'|'BLACK'|'RED';
          wounded: number; down: number; dead: number; air: number|string; blood: number }[];
  sel: string;              // selected JOA name — the map should highlight it
  commsDown: boolean;
  mounting: boolean;        // true for 1400 ms after switching to 3d
  gpuHead: string;          // caption line
  fig: { dead: number; down: number; treated: number };
  rate: number;             // playback multiplier (state.mapRate)
  playing: boolean;         // state.running
  follow: boolean;          // camera-follow toggle
  progress: number;         // 0..1 = t / WORLD.durationMin
  emptyNote: string|null;   // set only when the clock has not started
  emptySub:  string|null;
}
interface MapCas {
  x: number; y: number;
  state: 'hold' | 'fall' | 'crit' | 'treated' | 'dead';  // 1364–1365
  frac: number|null;   // 0..1 of deadline remaining — the 3d column height
  min:  number|null;   // whole minutes remaining
  hv:   boolean;       // high-value: IMMEDIATE with deadlineMin < 22
  reach: number;       // launch points within 33 km
}
```

### 6.2 Outbound — `angel-map-cmd` (design → map), dispatched on `window`

```ts
window.dispatchEvent(new CustomEvent('angel-map-cmd', { detail: { cmd } }));   // line 1122
```

| `detail.cmd` | Meaning | Offered in scope |
|---|---|---|
| `'out'` | zoom out one step | theatre, 2d, 3d |
| `'in'` | zoom in one step | theatre, 2d, 3d |
| `'fit'` | fit/reset the view to the full extent | theatre, 2d, 3d |

Those are the **only three** commands that ever leave the design (tool list 1428–1433; dispatch at
1443). The other three toolbar buttons — `panel`, `all`, `side` — are handled entirely inside the
design's own state and are **never** dispatched (1439–1442, 1508).

### 6.3 Inbound events (map → design), listened on `window`

```ts
window.addEventListener('angel-map-select', e => …);      // 1080, removed 1119
window.addEventListener('angel-map-transport', e => …);   // 1081, removed 1120
```

| Event | `detail` shape | Effect in the design | Line |
|---|---|---|---|
| `angel-map-select` | `{ joa: string }` | sets `state.selJoa` — swaps the operation record card. Ignored if `detail.joa` is falsy. | 1073 |
| `angel-map-transport` | `{ cmd: 'play' }` | toggles `state.running` (play/pause the run clock) | 1076 |
| `angel-map-transport` | `{ cmd: 'rate', rate: number }` | sets `state.mapRate = rate` and `state.speed = min(rate, 10)` | 1077 |
| `angel-map-transport` | `{ cmd: 'follow' }` | toggles `state.follow` (camera follow) | 1078 |

Note the asymmetry: `angel-map-select` carries only a **JOA name**, not a casualty — yet the record
card copy says *"Click a casualty on the picture to replace this card with that soldier's record"*
(1534). **That path is not wired.** See GAPS.

### 6.4 Layer keys

| scope | state key | keys (all `boolean`) |
|---|---|---|
| `theatre`, `2d` | `lay2` | `hold` `fall` `crit` `treated` `dead` `hv` `air` `routes` `lp` |
| `3d` | `lay3` | `geo` `terrain` `arcs` `trails` `cas` `columns` `threat` `sectors` `labels` |

Labels and swatch colours are at 1452–1462; the default layer state is at 1065–1066.

---

## 7. What the design computes ITSELF — do NOT supply these

These are the savings. None of it needs to come out of `angel-engine.js`.

| Thing | Where | Note |
|---|---|---|
| **The entire Sensor & Model screen** | `criTruth()` 1618–1623, `sensorVals()` 1624–1667, the PPG waveform generator in the tick 1093–1108 | Reads **zero** engine fields. Four scenarios (`stable`/`slow`/`arterial`/`given`) × five signal qualities (`clean`/`motion`/`lowperf`/`noise`/`dropout`) are simulated in-component; the model card and metrics are literals. |
| **The doctrine corpus and its retrieval** | `CORPUS` 1688–1697, token scoring 1698–1703 | 8 hard-coded passages, keyword-overlap similarity. The "161 passages / 499 sentences" figure is a label, not data. |
| **Ask ANGEL** | `resolve()` 1325–1353 | Five regex-matched canned answers computed off the `Frame`, plus a hard refusal branch. No LLM, no engine call. |
| **`SRC_DEFS` / `REF_DEFS`** | 1050, 1052 | 22 sources, 39 references, 7 groups — the whole Data & Sources and Authority & Policy screens are static JSON. |
| **Every colour** | throughout | oklch values are derived from thresholds in-component. |
| **All three synthetic JOAs** | 1394–1407, 1207–1213 | BASALT / MARINER / TIMBER figures are `Math.round(t * k)`. Only **CORAL** is live. |
| **`scenRows`** (Run Setup operations list) | 2157–2169 | hard-coded literal. |
| **Casualty reach on the map** | 1371, 1375–1376 | `lpReach` from the engine is read at 1371 then **immediately overwritten** by a recompute from `WORLD.bases` at a 33 km radius (1375–1376). Supply `lpReach` if convenient, but `Row.reach` is the one that matters. |
| **`Arm.stockLog`** | 1242 | `bloodIssued` is assigned and never used. Dead code — you can ship `stockLog: []`. |
| **Operator-appended audit entries** | 1745–1751 | APPROVE/REJECT rows are synthesised client-side (including a fake FNV-style hash) and prepended to the feed. The engine never sees them. |
| **The zulu clock, `T+` label, run progress** | 1129, 1159–1160, 1423 | derived from `t`. |
| **Deploy sequencing animation** | 1109–1116, 1904 | `depOnline` counter, not an engine concept. |
| **Replication statistics** | 1217–1244 | mean, SD, 95 % CI, histogram binning — computed from 40 `buildRun` calls. The engine supplies only two integers per run. |
| **`stub` / `isStub`** | 1166–1167, 1152 | Dead: `isStub` is always `false` on the ready path and the template never binds it. |

---

## 8. The 13 destinations and what each needs

Nav keys, in order (1146): `dash, cas, dec, feed, tty, sensor, ops, ev, chat, map, data, auth, setup`.
`feed` lights the `dec` nav item (`NAV_OF = { feed: 'dec' }`, 1143).

**Always-on chrome** (rendered on every screen): `Frame.open`, `Frame.pending.length`,
`Frame.commsDown` (nav badges, 1162); `Frame.readable`, `resolvedSurv`, `delta`, `dA`, `dB`
(the primary-action hero, 1866–1881); `Frame.stock` + `run.A.bases` + `run.A.drones` (deploy modal,
1883–1907).

| # | Key | Screen | `Frame` fields | `Run` / `E` fields |
|---|---|---|---|---|
| 1 | `dash` | Commander Dashboard | `unreachable` `tightest{tRem,cid}` `bloodU` `sitesWithBlood` `ready` `total` `airborne` `readable` `resolvedSurv` `delta` `rows[]` `fleet[]` `notAssertable` `causes` `pending[0]` `open` `escalated` `approved` `lapsed` `dA` `commsDown` | `WORLD.threats` `WORLD.bases` (mini-map, 1976–1985) |
| 2 | `cas` | Live Casualties (4 tabs: CASUALTIES / SUPPLY / FLEET / LAUNCH POINTS) | `rows[]` (full `Row`) `stock[]` `fleet[]` `admitted` `open` `inside` `missed` `notAssertable` | `WORLD.sites[].name/.unit` (2071–2073) |
| 3 | `dec` | Awaiting Authority | `pending[]` (full `Proposal`) `escalated` `approved` `lapsed` `open` `inside` `unreachable` `bloodU` `sitesWithBlood` `ready` `total` `readable` `resolvedSurv` `delta` `dA` `dB` | `run.A.audit` (AUTO-DISPATCH, 1737) · `PAYLOADS` (1762) |
| 4 | `feed` | Decision Log (+ GROUND STREAM tab) | `feed[]` `auditN` `pending[]` `causes` `dA` `approved` `lapsed` `sortiesFlown` `escalated` `stream[]` `commsDown` | `PAYLOADS` (1828) |
| 5 | `tty` | Analyst Terminal (TRANSCRIPT / SQL / DOCTRINE / DATA FILE) | `open` `inside` `unreachable` `notAssertable` `ready` `total` `bloodU` `sitesWithBlood` `escalated` `approved` `lapsed` `pending` `readable` `resolvedSurv` `dA` `dB` `delta` `auditN` `feed[0].hash` `causes` `rows[]` `stock[]` `sortiesFlown` `commsDown` | `run.A.cas` `run.A.sorties[].stops` `run.A.stats.allDeaths` `run.B.stats.allDeaths` `run.B.sorties` `run.seed` `run.stream.length` · `PAYLOADS` · `WORLD.name` |
| 6 | `sensor` | Sensor & Model | **none** | **none** — fully self-contained (§7) |
| 7 | `ops` | Ops Center Wall (WALL / THEATRE) | `tightest` `unreachable` `rows[]` `pending[]` `bloodU` `sitesWithBlood` `ready` `total` `airborne` `sortiesFlown` `administered` `readable` `delta` `commsDown` `admitted` `open` `dA` | `run.A.stats.allDeaths` (1207) |
| 8 | `ev` | Evidence (COUNTERFACTUAL / REPLICATIONS / AFTER ACTION) | `causes` `readable` `resolvedSurv` `delta` `dA` `dB` `sortiesFlown` `tA` `tB` (all 9 each) `escalated` `admitted` | `run.A.stats.coldSwaps` `run.B.sorties[].tLaunch` · **`buildRun` × 40** for replications |
| 9 | `chat` | Ask ANGEL | `rows[]` `ready` `total` `readable` `resolvedSurv` `delta` `dA` `dB` `bloodU` `plasmaU` `sitesWithBlood` `stock[]` `causes` | `run.seed` (1317) |
| 10 | `map` | Theater Map (THEATRE / TACTICAL 2D / TACTICAL 3D) | `fleet[]` (x, y, state, call, base) `admitted` `open` `dA` `airborne` `total` `bloodU` `missed` `unreachable` `commsDown` | `run.A.cas` `run.B.cas` (both, for side-by-side) · **all of `WORLD`** |
| 11 | `data` | Data & Sources | `commsDown` (one badge, 1594) | `run.seed` `run.stream.length` (1606–1607) |
| 12 | `auth` | Authority & Policy | **none** | **none** — `REF_DEFS` only |
| 13 | `setup` | Run Setup / Settings | **none** | `run.seed` `run.stream.length` (1606–1607) |

**Light-up order if you are staging the adapter:** `sensor` + `auth` first (zero engine surface),
then `data`/`setup` (`seed` + `stream.length`), then `dash`/`cas`/`ops` (`Frame` scalars + `rows` +
`fleet` + `stock`), then `dec`/`feed` (`pending`, `feed`, `stream`), then `map` (`WORLD` + both arms'
`cas`), then `ev` (`tA`/`tB` + 40 replication runs) last.

---

## 9. The six run presets

`preset(k)` at **1130–1139**; reverse-detection in `activePreset()` at **1836–1847**.
Every preset also clears `expand` and sets `running: false`.

| Preset | `deployed` | `t` | What it is meant to show |
|---|---|---|---|
| `COLD` | `false` | `0` | Nothing has happened: not deployed, clock not started. Every screen must render an empty state. `Frame` must be all-zero and `rows`/`pending`/`feed` empty. The design guards this with `cold = !st.deployed && st.t === 0` (1177, 1734, 1909). |
| `STBY` | `true` | `0` | Deployed, authority delegated, clock still at zero. Distinguishes "no authority" from "no events". |
| `EARLY` | `true` | `32` | Early run — first casualties, first sorties, comparison **not yet readable** (`resolvedSurv < 10`). |
| `MID` | `true` | `104` | **The default** (`state.t = 104`, 1057; `startState` prop default `MID`). The full board: open casualties, airborne fleet, a readable comparison. Also the minute the design's own copy is tuned against. |
| `PEND` | `true` | `P.tRaised + 1`, else `104` | An escalation sitting on the Decision screen. `P = runD.A.proposals.find(p => p.tRaised > 60)` (1131). **Requires:** `runD.A.proposals` must contain at least one proposal with `tRaised > 60`, and `snapshot(runD, P.tRaised + 1).pending` must be non-empty (the 8-minute lapse window makes +1 min safe). If no such proposal exists the preset silently degrades to MID. |
| `DONE` | `true` | `180` | Run complete. `finished = t >= 180` (1157) flips the hero to "OPEN THE RESULT", empties the queue, and the After Action tab reads the full-run figures. |

`activePreset()` is a pure function of `(deployed, t)` and matches `t === 32 / 104 / >= 180` exactly,
so **do not let `snapshot` change those thresholds.**

---

## 10. GAPS — fill these from the real simulation

The design never pins these down. Do **not** guess; each is listed with what the design *does* prove.

1. **`Run.stream` element shape.** Only `.length` is ever read (1607, 1721), labelled
   "CASUALTIES IN STREAM". Proven: it is an array whose length equals the casualty count. Unproven:
   anything about its elements. *(Distinct from `Frame.stream`, §3.6 — do not conflate them.)*
2. **`Outcome` enum.** Only `'DIED'` is tested (1364, 1390). The value is printed verbatim in the
   SQL console (1682), so the other values are visible to the user but never named.
3. **`PayloadKey` vocabulary.** The keys of `PAYLOADS` are never enumerated — only
   `PAYLOADS[k].short` is read. Static prose names five items (1724) but does not map them to keys.
   Also unknown: whether `PAYLOADS[k]` carries anything besides `short`.
4. **`Stop.fail` vocabulary.** Rendered raw as a "waste_reason" column (1685). No value is tested.
5. **`StreamEvent.kind` beyond `DELIVERED` / `WASTE`.** Everything else falls through to the label
   "PAYLOAD AWAY" (1827), so at least one more value exists but is unnamed.
6. **`Shelf.issued` type.** Concatenated with a string (2109), so it renders either way; the design
   does no arithmetic on it. Number is the safe reading.
7. **`Row.si` type and scale.** Printed as `'SI ' + r.si` (2125). No comparison, no formatting.
8. **`Frame.tightest` vs `Frame.rows[0]`.** They are used interchangeably in spirit but never
   asserted equal. `tightest` may be `null` while `rows` is non-empty (a board of non-assertable
   casualties). Confirm which invariant the sim guarantees.
9. **Whether `Frame.rows.length === Frame.open`.** Copy reads as if they are equal ("`s.open` open
   casualties ranked by time remaining", 1947) but the two are always rendered separately and never
   compared. If `rows` is capped or filtered, say so — the dashboard prints "TOP 8 OF `rows.length`".
10. **`ArmStats` beyond the three fields read.** `allDeaths`, `survivableDeaths`, `coldSwaps` are all
    the design touches. There may be more.
11. **`Frame.administered` semantics.** Read once (1201), rendered as
    `sortiesFlown + ' · ' + administered + ' ADMINISTERED'`. Presumably payloads administered so far
    (i.e. `tA.treated`), but it is never cross-checked against `tA.treated`, so confirm whether they
    are the same number.
12. **`Frame.feed` length vs `Frame.auditN`.** `auditN` is printed as "entries this shift" (1813) and
    `feed` is sliced to at most `state.limit` (default 30, 1061). Whether `feed` is the complete
    chain or a window is not determinable from the design.
13. **`AuditEntry.actor` vocabulary.** Rendered raw (1801). The design writes `'OPERATOR'` for its
    own appended rows (1745); the engine's values are unnamed.
14. **Casualty selection on the map.** The record card invites the user to *"Click a casualty on the
    picture"* (1534), but `angel-map-select` only ever carries `{ joa }` (1073) and no other listener
    exists. Either the map renderer is expected to emit a richer `detail` that this build ignores, or
    the feature is unfinished. **Decide before wiring your three renderers** — if you extend the
    `detail`, the design as written will silently drop it.
15. **`Frame.stock` ordering guarantee.** The deploy modal assumes `stock[i]` ↔ `run.A.bases[i]`
    (1885–1886) but nothing enforces it and `Shelf.name` is not checked against `Base.name` there.
16. **Whether `snapshot` must be pure/memoisable.** It is called on every 120 ms tick for every
    render (1125, 1096). Nothing in the design caches it. If the real sim's snapshot is expensive,
    the adapter must memoise on `(run, t)` — the design will not do it for you.
17. **`deployed: false` semantics inside `buildRun`.** The design asserts in prose that both arms
    then run current triage and proximity (1249, 1330, 1802) and expects `delta === 0` / `readable` handling to
    still work. Confirm the sim supports a "both arms are B" build rather than the adapter faking it.
