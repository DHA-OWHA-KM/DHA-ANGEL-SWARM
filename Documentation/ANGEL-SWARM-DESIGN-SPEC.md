# ANGEL SWARM — design specification

**For Claude Design.** Every feature, what it does, what the operator expects, and what comes back.

Junayd S. Park · Team DHA RESCUE · NDIA Global Defense Hackathon 2026
Version 1.3 · 5 September 2026 · **current as of v6.4**

UNCLASSIFIED // PUBLIC RELEASE // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

---

## How to read this document

Each feature is written as four things:

| | |
|---|---|
| **What it is** | the capability, in one sentence |
| **Functionality** | what the operator does and what the machine does |
| **Expectation** | what the operator believes will happen when they act |
| **Outcome** | what actually comes back, including when it comes back empty |

Anywhere a figure appears, its **source** is named. A figure with no source must not be drawn.

**§0 is not optional reading.** It is the list of claims the application once made that were not true. **Every one of them has since been closed in the build**, and §0 records how, because the standing rule on this project is that the written record and the running product must not disagree.

### How this document changed after 25 August

This was written as a brief *against* the build of 25 August, so much of it was originally phrased as "currently broken". Where a defect named here has since been fixed, the row now says so and names the version. Where something is still open, it is marked **STILL OPEN**. Nothing has been quietly deleted.

| Since 25 August | |
|---|---|
| Destinations | **Thirteen**, not nine — War Game, Sensor & Model, Authority & Policy and Data Sources were promoted out of tabs. See §4 |
| Map scales | **Four**, not three — a canvas-2D globe was added above the theatre in v6.3 and its geography regenerated at four times the detail in v6.4. See §5.9 |
| The route-stage strip | **It no longer opens by itself.** Through v6.3 it defaulted to an arbitrary sortie on arrival; since v6.4 it is a detail view opened by clicking a casualty or an aircraft. See §5.9 |
| Panel scrolling | **One scroller per column, zero horizontal.** Nested panel-body scrollers were removed in v6.4. See §5.9 |
| The globe's handoff | Zooming out of the globe now flies to **the operation under the camera**, not to the loaded one, and declines over open ocean. See §5.9 |
| Arms | **Three**, not two — NO FORWARD DELIVERY (35 dead) joined ANGEL SWARM (23) and CURRENT — TRIAGE & PROXIMITY (34) |
| The comparison | Since v6.2, **an ANGEL SWARM figure never appears without the CURRENT figure beside it at the same size.** See §6.6 |
| Proof | `app/selftest.html` ships in the package: **118 assertions against the shipped engine**, in the browser, offline, nothing mocked — **118 pass, 0 fail**, in well under a second. Re-run against the v6.4 build for this revision |
| Language model | **There is none.** No GGUF is shipped and nothing on any screen is generated. See §5.8 |

---

## 0. Read this first — six claims that were not true, and what was done

These were found by reading the engine against the interface. They matter more than any layout decision, because the standing rule on this project is that *there can never be a case where what is presented is not true.*

**All six are closed in the shipped build.** Each is kept here with its resolution, because a design that does not know why a rule exists will break it again.

### 0.1 CRI-Net does not produce the deadlines the tasking runs on

The interface says the trained network "produces every casualty's physiological deadline… the only learned quantity that reaches a tasking decision." It does not.

- Deadlines come from `rng.normal(18.3, 7.94)` — a random draw (`sim.js:648`).
- Compensatory reserve is `frac × 100`, straight-line arithmetic (`sim.js:678`).
- `ANGEL.emit('cri')` has **zero listeners** (`device.js:269`). The model's output goes nowhere.

**What CRI-Net genuinely does:** on the Sensor & model screen it takes a real PPG waveform and estimates compensatory reserve with a calibrated uncertainty interval, and it refuses when that interval is too wide. That is a real, defensible, validated capability. It is a demonstration that the physiological signal is learnable — not the thing steering the aircraft.

**Design consequence.** The AI mark must **not** appear on collapse times or reserve figures anywhere else.

**RESOLVED.** The claim came off every screen. Sensor & Model now states that CRI-Net's output does not reach the allocator in this build, and the rehearsal answer to "is that model driving the tasking" is *no, and the application says so on its own screen*. **STILL OPEN as engineering:** closing the loop from CRI-Net to the allocator is named in the package as the second of three things to do next.

### 0.2 Both arms start identical, and an undeployed run proves nothing

Arm A is created with `allocatorKey: 'CURRENT'` (`app.js:337`). Until someone deploys, **ANGEL SWARM is running current triage and proximity too.** An undeployed run is not a tie — separate attrition random streams desynchronise the arms, and at seed 42 ANGEL SWARM finishes one death *worse*.

**Design consequence.** Deployment is not a setting, it is the experiment. Every screen must make the undeployed state unmistakable, and no comparison may be presented before it.

**RESOLVED.** The comparison line prints, in the undeployed state, `ANGEL SWARM IS NOT DEPLOYED — BOTH ARMS ARE RUNNING THE CURRENT METHOD, SO THERE IS NO COMPARISON TO DRAW`, with **no figures at all**. The paired Ops Center Wall grid drops to three cards rather than offering a second arm that does not exist.

### 0.3 The comparison is meaningless early and the interface states it anyway

Under about ten resolved survivable casualties, one unlucky draw is the whole margin.

**Design consequence.** Below that threshold the comparison is drawn as *not yet readable*, with the resolved count shown, rather than as a number with a caveat beside it.

**RESOLVED.** The middle state of the comparison line reads `NOT YET READABLE — n OF THE SURVIVABLE COHORT RESOLVED, FLOOR IS 10 · AS AT T+n`, with both live counts.

### 0.4 Two switches disagree about whether ANGEL SWARM is on

`APP.deploy.state` and `APP.angelActive` can legally hold different answers, and different screens read different ones.

**Design consequence.** One posture indicator, one source, on every screen.

**RESOLVED.** `POSTURE · ONE SOURCE` on the navigation rail, on screen whatever destination is open.

### 0.5 The fairness contract has two real leaks

The claim is identical casualties, identical aircraft, identical stock. Two things differ that are not tasking consequences: telementoring is enabled for ANGEL SWARM and hardwired off for the control (`app.js:340-341`), and in-flight cold-chain abort plus operator holds are honoured only by the ANGEL allocator.

**Design consequence.** Either close them in the engine or state them wherever the comparison is presented.

**RESOLVED by stating them.** Evidence carries a `DECLARED DIFFERENCES BETWEEN THE ARMS` block naming telementoring and the in-flight cold-chain abort in words, as a capability difference on top of the tasking difference rather than a consequence of it. This is the honest half of the fairness claim and it belongs on the screen, not in a footnote.

### 0.6 Figures that cannot be traced to a source

Do not draw these until each is sourced or removed: the "factor of three and a half" pairing gain; "24 vs 34 at seed 42"; "23, 31 and 248 in the reference run"; doctrine "correct answers score from 0.43 upward"; the baseline triage "57.8% sensitivity / 26% over-triage" (the code itself retracts these as mis-sourced and uses 0.90/0.14); the "16–25 minute field range" (the source says that is two individual casualties, not a cohort); and every dollar and schedule figure in the IL5 cost analysis.

**RESOLVED as a standing rule, and the rule now has a machine behind it.** The reference figures are asserted by `app/selftest.html` — 118 assertions against the shipped engine — rather than transcribed. The reference battle is **23 / 34 / 35 survivable deaths on 20 / 38 / 0 sorties**, 125 casualties, 47 of them in the survivable cohort, seed 42, JOA CORAL, capability deployed. Anything a screen or a document states about this run must be derivable from that page.

**Everything CRI-Net claims about itself is sound** and read live from the model's own metadata: MAE 0.0694 against 0.1588 for heart rate alone, 96.16% interval coverage, act below 0.4689 and refuse above 0.5911, 70 held-out subjects split by subject.

**MiniLM's numbers are sound but its placement in this document was not** — see §5.5 and §6.1, which have been corrected.

---

## 1. What the product is

A commander in a contested theatre cannot evacuate casualties. Airspace is denied, evacuation is measured in days, and the arithmetic does not close — evacuation capacity is short of demand by one to two orders of magnitude. So the medicine has to move instead of the patient.

ANGEL SWARM tasks autonomous delivery aircraft against **each casualty's own physiological deadline** rather than against a triage category. It runs the same battle **three times** — its own tasking, a faithful implementation of current practice, and no forward delivery at all — on identical casualties, identical aircraft and identical stock, under common random numbers, and reports the difference in dead of survivable wounds.

**The reference battle** — seed 42, JOA CORAL, capability deployed, 125 casualties, 47 of them survivable, 180 minutes:

| Arm | Dead of survivable wounds | Sorties |
|---|---|---|
| NO FORWARD DELIVERY | **35** | 0 |
| CURRENT — TRIAGE & PROXIMITY | **34** | 38 |
| ANGEL SWARM | **23** | 20 |

Current tasking flies **38 sorties to convert one death**. These three figures are asserted by `app/selftest.html` rather than asserted in a slide.

**The product's single claim:** *fewer dead of survivable wounds than current practice produces from the same inputs.* The target is zero. Every number is a person.

---

## 2. Non-negotiable rules

These are absolute. A design that breaks one is wrong regardless of how it looks.

| Rule | |
|---|---|
| **Deaths are red** | Every death figure — the number, the bar, the marker — is red. Never green, never teal, never a success colour. The delta against current triage and proximity is a death figure. |
| **Never "lives saved"** | The phrase is **"fewer dead"**. The target is zero. Every number is a person. The footer reads DEATHS COUNTED, NEVER SCORED. |
| **PACOM** | Never USINDOPACOM, never INDOPACOM. |
| **No emoji** | Anywhere. |
| **Never claim AI where there is none** | A mark is a claim. A written rule, arithmetic or a solver carries no AI mark. |
| **Never invent a figure** | If the engine does not produce it, the field is omitted. An estimate presented as a measurement is a failure. |
| **Never show ANGEL SWARM losing as a headline** | Where the comparison is not yet readable, say so. Do not print a negative delta as a result. |
| **Offline** | The application originates no outbound request. No webfont link, no CDN, no remote tiles. Everything is served from the loopback port. |
| **External agencies** | The Department will comply with the law to the maximum extent, but has its own policies and standards and is not beholden to the FDA. Do not frame the capability as awaiting FDA clearance. |
| **The comparison is never absent** | An ANGEL SWARM figure never appears without the CURRENT — TRIAGE & PROXIMITY figure beside it, at the same size. See §6.6. |
| **The control arm has a name** | **CURRENT — TRIAGE & PROXIMITY**, everywhere. Never "Class VIII push" — a push is anticipatory resupply and using it for the tasking baseline inverts the meaning. See `ANGEL-SWARM-DOCTRINAL-TERMINOLOGY.md`. |
| **The globe is canvas 2D** | Not deck.gl, not WebGL, holds no GPU context. No material may say otherwise. |
| **A detail view opens on a click** | Nothing that describes *one* selected object — one sortie, one casualty, one airframe — may appear before the operator has picked that object. A true statement about an arbitrary one is worse than no statement. See §5.9. |
| **One scroller per column** | No panel body carries its own scrollbar, and nothing on the map page scrolls horizontally. |
| **One answer to "what is loaded"** | The classification stamp and the map picture always name the same operation. See §6.8. |

---

## 3. The run lifecycle — the thing the current design missed

The existing canvas drew **one moment**: mid-run, deployed, one escalation pending. The application has at least eight states and every screen must be designed for all of them.

```
  COLD START ─────► DEPLOYED ─────► RUNNING ─────► FINISHED
   T+0, nothing      aircraft up      clock moving    T+180, report
   deployed          clock still      both arms
                     stopped          diverging
```

**Two independent switches, in any order:**

1. **Deploy** — brings ANGEL SWARM's aircraft up and switches arm A onto the ANGEL allocator. Aircraft come online one at a time on a real-time interval, not instantly. *Does not start the clock.*
2. **Play** — starts the mission clock. Advances in fixed 0.25-minute steps at a chosen speed. *Does not require deployment.*

**This is the defect that matters most.** A person can start the clock without deploying, in which case both arms run the identical current triage and proximity, the result is 6 versus 6, and the product's entire claim is invisible. At T+24 the application recommends deploying — and in the current build there is no visible control to do it.

### 3.1 The path a new operator must take — design this explicitly

| Step | What they must do | In the shipped build |
|---|---|---|
| 1 | Open the application | Lands on Command Overview at T+0 — and the **three tolls of this battle are already on the screen**, above the fold, before anything is pressed. They are read out of the engine's own resolved runs, not typed in, so changing the scenario on Settings changes them |
| 2 | **Deploy ANGEL SWARM** | `DEPLOY →`, the primary action, `STEP 1 OF 2` |
| 3 | Choose launch points, confirm | `SEND 7 AIRFRAMES FROM 3 LAUNCH POINTS →` |
| 4 | **Start the clock** | `PLAY →`, `STEP 2 OF 2` |
| 5 | **Choose a speed** | A `1× 2× 4× 10×` segmented control beside `PLAY`. At 10× the 180-minute run takes **18 seconds** — 150 ticks of 120 ms, 1.2 simulated minutes each |
| 6 | Watch, or go to a screen | `MISSION IN PROGRESS` sits in the top bar in red with a lit indicator for exactly as long as the run is live, and is gone the moment it stops |
| 7 | Read the result | The completion sheet opens itself at T+180, with its action row pinned to the bottom at every height |

**Requirement, and it is met.** The primary action is the most prominent object on the opening screen and it changes as the run progresses: *Deploy ANGEL SWARM* → *Start the clock* → *(speed control)* → *Open the result*. One control, always present, always naming the next step.

**And a guided walkthrough exists, off by default.** Settings → Display → Guided walkthrough puts a floating bar at the foot of the content column that walks the five-screen brief in order — Command Overview, Theater Map, Evidence, Ops Center Wall, Settings → Engine self-test — printing one line about each. **It navigates between existing screens and changes nothing about what any screen renders**, which is the only reason it was safe to add days before the brief. Navigating away by the rail does not break it: the bar reads `OFF THE PATH`, names the step it left, and offers `RESUME`. Its arrow and Escape keys are inert while it is off, and inert again while focus is in an input.

### 3.2 Every state, and what each screen owes it

| State | Definition | What the interface must convey |
|---|---|---|
| **Cold start** | T+0, `NOT_DEPLOYED`, clock stopped | "Nothing has happened yet, and here is how to begin." Zeros must not read as results. |
| **Deployed, stopped** | Aircraft up, clock at 0 | "The force is ready. Start the clock." |
| **Deploying** | Aircraft coming up one at a time | Progress — *n of m airborne* |
| **Running, early** | Fewer than ~10 resolved survivable casualties | The comparison is **not yet readable**. Show the resolved count, not a delta. |
| **Running, mid** | Comparison meaningful | The live picture: deadlines, tasking, the divergence |
| **Finished** | T+180, both arms finalised | The result, and how it was reached |
| **Decision pending** | A proposal needs a human | Unmissable, with a clock on it |
| **Degraded** | Link down, GPU withheld, model absent | State it plainly; never fake the capability |

### 3.3 Empty states — design each one

Not deployed · clock not started · no casualties yet · no sorties yet · no proposals · no deaths · no audit entries beyond RUN-START · no replication study run · no telemetry listener · **nothing selected on a tactical map, which is the arrival state and draws no route-stage strip at all** · a casualty clicked that no sortie ever reached (still no strip; the record panel answers the click) · a globe zoomed to its floor over open ocean · GPU context lost and recovered.

**Rule.** An empty state says what is missing, why, and what would fill it. A screen of zeros that looks identical to a finished run is the single most common failure in the current build.

---

## 4. The thirteen destinations

The product has thirteen places to be, in this rail order. Everything else is a tab inside one of them.

| # | Destination | The question it answers |
|---|---|---|
| 1 | **Command Overview** | Am I winning, what needs me, what is about to go wrong |
| 2 | **Theater Map** | Show me the ground — at four scales |
| 3 | **Live Casualties** | Who is on the ground, how long have they got, is anyone coming |
| 4 | **Decisions** | What is waiting on my authority, what has been decided, and on what grounds |
| 5 | **Analyst Terminal** | Let me ask the run anything — transcript, SQL, doctrine, the data file |
| 6 | **Sensor & Model** | What the trained network reads, and where its output does and does not go |
| 7 | **Ops Center Wall** | The ten-foot-readable picture for a room |
| 8 | **Evidence** | Prove it |
| 9 | **War Game** | What survives a worse world — five levers, swept |
| 10 | **Ask ANGEL** | Explain this to me in words |
| 11 | **Authority & Policy** | Who decides, who answers for it, and the film |
| 12 | **Data Sources** | What this consumes, what it produces, and what is machine-produced |
| 13 | **Settings** | Scenario, display, clock rate, guided walkthrough, engine self-test |

Decision and Decision Feed merged into **Decisions**, with `AWAITING AUTHORITY` and `DECISION LOG` as its two tabs. War Game, Sensor & Model, Authority & Policy and Data Sources were promoted out of tabs into destinations of their own.

**Do not tour all thirteen in a brief.** Thirteen destinations is a strength in a package and a liability on a stage.

---

## 5. Feature specifications

### 5.1 Command Overview

**What it is.** The landing screen and the answer to three questions a commander asks in that order: am I winning, does anything need me, what is about to go wrong.

**Functionality.** Five figures across the top, a written brief, the deadline queue, the open escalation, and a doorway to the map. Refreshes as the run advances.

**Expectation.** "I can tell in four seconds whether this is going well, and if something needs me I can see it without hunting."

**Outcome.**

| Figure | Meaning | Source |
|---|---|---|
| Unreachable in time | Open casualties no launch point can reach, or whose nearest aircraft arrives after the deadline | reach model, base→casualty |
| Tightest deadline | Minutes remaining on the most urgent open casualty, and who | `tInjury + deadlineMin − now` |
| Blood forward | Units on the shelf and how many sites hold them | launch-point stock |
| Lift available | Ready aircraft of total, and how many airborne | drone states |
| **Versus current triage and proximity** | **Fewer dead of survivable wounds, same inputs — RED** | both arms' survivable death counts |

The written brief is three labelled lines — **top risk**, **action**, **change** — each a real statement about this run or omitted entirely. Never a manufactured sentence.

**States.** Cold start: the primary action dominates, tiles read as *not started* rather than zero, the delta tile says *not deployed*. Early: the delta tile says *not yet readable — n of the cohort resolved*. Pending decision: the escalation card is the loudest object on the screen.

---

### 5.2 Live Casualties

**What it is.** Every wounded soldier the system knows about, ordered by time remaining rather than by appearance.

**Functionality.** Group by location or by deadline. Each row is a casualty against a time ruler: their deadline, when the nearest aircraft could arrive, and the slack between. Opening a row expands the full record **in the main column** — never in a narrow side rail.

**Expectation.** "I can see who is going to be missed, and why, and open any one of them without losing my place."

**Outcome.** Per casualty: identifier, unit, triage class, injury, deadline, arrival, slack, responder on scene, what they need, whether anything is coming. Three summary figures: **missed if nothing changes** (red), **inside deadline**, **deadline not assertable**.

**Absorbs:** supplies on the shelf, aircraft by launch point, launch-point detail.

**States.** Cold start: no casualties — say so, and say the clock has not started. Stale telemetry: show reading age; do not quote a stale reserve as current. Resolved: died and treated casualties leave the open board but stay reachable.

---

### 5.3 Decision

**What it is.** The one screen where a human is required, and the record of why.

**Functionality.** A proposal the allocator will not take on its own is presented as a trade-off: what it wants to do, what it costs, what the alternative costs, and the named grounds for escalation. The operator authorises or holds. Failure to decide is itself recorded, with its cost, when the window lapses.

**Expectation.** "I am being asked because a machine should not make this call. I can see both costs in the same units and decide in under a minute."

**Outcome.** Each option shows the casualties served and missed with slack in minutes. The grounds are named, not paraphrased. The decision is written to the hash-chained record with sequence number, actor and hash, and that entry is shown back.

**States.** Nothing pending — say what has been disposed of, and do not write mid-run copy at T+0. Lapsing — a visible countdown. Lapsed — recorded as a non-decision with its cost.

---

### 5.4 Decision Feed

**What it is.** Every decision this run made, in order, in words.

**Functionality.** A chronological record: escalated, authorised under standing authority, authorised after escalation, withheld for low confidence, delivered, and **not prevented** — deaths, filed under the cause that bound. Filterable, exportable for an investigating officer. Chain integrity shown.

**Expectation.** "I can reconstruct any decision and hand this to someone who was not here."

**Outcome.** Each entry: what happened, one supporting sentence built from the entry's own data, and provenance — sequence, actor, hash. Shift statistics: decisions taken, under standing authority, escalated, withheld, lapsed, median time to decide.

**Caution.** This screen runs long — around 1,800 words once a run has history. Design it as a scannable ledger, not prose. The eye should land on the tag and the identifier.

---

### 5.5 Analyst Terminal

**What it is.** Ask the run anything, in SQL or in doctrine.

**Functionality.** Four tabs: `TRANSCRIPT`, `SQL CONSOLE`, `DOCTRINE`, `DATA FILE`. A database of the run's own record — casualties, sorties, decisions, stock — queryable directly. Alongside it, doctrine retrieval that returns passages **verbatim with their score** and declines below its floor. It quotes and cannot generate, which is why it cannot invent a citation.

**Expectation.** "If I doubt a number, I can go get it myself."

**Outcome.** Query results as a table, exportable. Retrieval returns the passage, the publication, the section and the score, plus the next three candidates. **Output is coloured by meaning rather than decoration**: deaths red without exception, escalation and anything awaiting a person amber, delivered and authorised teal, the audit chain violet, headers cyan, everything else neutral. Zero counts drop to dim — **except death counts, which stay red at zero**.

**A correction about which machine is behind this tab, and it must be honoured by any redesign.** `all-MiniLM-L6-v2` — a 22.9 MB int8 ONNX sentence encoder — **does ship in the build and is loaded**, and it is the retrieval behind the doctrine view drawn by `app/js/doctrine.js` in the standalone analyst console (`app/console.html`), over the full 161-passage, 499-sentence corpus at `app/data/doctrine.json`, declining below 0.35.

**It is not what scores the Analyst Terminal's doctrine tab inside the design application, and it is not what scores Ask ANGEL.** Both of those rank an **eleven-passage inline reference set by term overlap** — Analyst Terminal at a floor of 0.35, Ask ANGEL at a measured floor of 0.55 requiring two matched content terms. A design must not badge a term-overlap score with a model's name, and a document must not describe the encoder as running on a screen that does not call it. **STILL OPEN in the build: the Analyst Terminal doctrine tab and Ask ANGEL's doctrine answers still carry a MiniLM badge over a term-overlap score.** See §6.1.

---

### 5.6 Ops Center Wall

**What it is.** The picture for a room, readable at ten feet.

**Functionality.** Very large type. Tightest deadline, unreachable count, casualties, awaiting authority, and the deadline board by time remaining.

**Expectation.** "I can read this from the back of the watch floor."

**Outcome.** No control that needs a pointer. Nothing under about 18px. Posture stated in words: deployed or not, authority delegated or not, link up or down.

**Cold-start caution.** "Tightest deadline: 0 open" currently reads as a zero-minute deadline. An empty board must say *no casualties yet*, never a zero in a unit slot.

---

### 5.7 Evidence

**What it is.** The screen that answers "prove it".

**Functionality.** Four things:

1. **The paired replication study.** The same battle run a few hundred times with common random numbers, arms paired. Reports the mean difference in survivable deaths, a confidence interval, how many replications were worse, and how many tied.
2. **The counterfactual.** Where the deaths that remain came from, by binding constraint — no responder on scene, no launch point in reach, past the limit of prehospital medicine, every aircraft committed.
3. **The fleet experiment.** **The claim that used to sit here was false and was corrected in v5.8.** It said fleet size was "close to inert" and that growing the fleet threefold "did not improve this arm at all." Swept over 100 paired seeds at five fleet sizes, both assertions are wrong: tripling every airframe count improves ANGEL SWARM by **1.2 survivable deaths — 23.4 → 22.2, worse on not one seed of the hundred** — and **two** buckets shrink rather than one, "every aircraft committed" 0.9 → 0.4 and "no launch point in reach" 4.7 → 4.1.

   What survives is the stronger claim, and it is the answer to the obvious rebuttal — because the lever moves **both** arms, more aircraft cannot close the gap: **seven airframes tasked on a physiological deadline still beat twenty-one tasked on triage and proximity, by 3.0 survivable deaths, on 92 of 100 identical battles.** And one bucket does not move at all: *nobody on scene who could administer* is 12.0 deaths at seven airframes and 12.0 at twenty-one, identical to two decimal places. Aircraft cannot touch it.

   **Forward positioning is the binding lever.** The deaths that remain are mostly out of reach of every launch point; moving a pad moves the result.
4. **The after-action report.** The result, the three largest causes, and what to change first. **Every row that is a death figure is drawn red** — the flag existed and was not honoured, so the one screen that exists to state the toll printed 23 and 34 as though they were sortie counts.

**Expectation.** "Show me this is not a lucky seed."

**Outcome.** Every figure sourced. The direction of the result and the interval, not just a point estimate. **Where the deaths that remain came from, at the reference battle:** nobody on scene could administer 10 · no launch point in reach 9 · reached in time and died anyway 4 · collapsed faster than any flight 0 · every aircraft committed 0. A bucket names the **first binding constraint, not the only one**, and the screen says so.

**States.** No study run — say so, and offer to run it. **Never assert a finding on zero data.**

---

### 5.8 Ask ANGEL

**What it is.** The run, explained in words, with every figure it used printed underneath.

**NO LANGUAGE MODEL IS LOADED, AND NOTHING HERE IS GENERATED.** No GGUF ships in this build. The header chip says exactly that, which is both true and the stronger claim: **a template over the run record cannot hallucinate a casualty count, and a verbatim quote cannot invent doctrine.**

**Functionality.** A router with three outcomes and no fourth:

| Outcome | What it does | Badge |
|---|---|---|
| **Run figure** | Answered from the run's own record — the frame the engine published for that minute, or the closed casualty record | `RUN RECORD · COMPUTED, NOT GENERATED`, teal. **It does not wear the violet ✦**, because arithmetic over a record is not a model output |
| **Doctrine** | The reference corpus, **scored on the question**, quoted verbatim, with the passage id, publication, score and matched-term count | Retrieval badge |
| **Neither** | Says so, prints the closest passage and its score under the floor, and lists what it *can* be asked | `NO ANSWER · NOT IN THE RUN OR THE CORPUS` |

There is also a **refusal**, and it is the only one: asked to rank two casualties against each other it declines and points at the Decisions screen, because that trade-off is escalated to a person by design.

**The floor is measured, not chosen.** 22 questions the corpus answers and 24 it does not were scored. Requiring **two matched content terms and 0.55** keeps 21 of 22 and admits 0 of 24, and 0.55 sits on a plateau — every floor from 0.550 to 0.650 gives the identical result — rather than on a cliff.

**Expectation.** "Explain this to me the way a staff officer would."

**Outcome.** An answer, the figures it rests on, and citations where doctrine is quoted. It sits outside the tasking path entirely — **nothing it writes is read back by any decision**, and the side panel says so.

**Two design rules this screen paid for.** Enter submits — you must not have to reach for the button. And the answer opens **below** the question, not above it, so the reading order is question then answer.

**Boundary.** It must decline what it cannot answer — a decision requiring human authority is handed to the Decisions screen, not answered. **STILL OPEN in the build: the doctrine answer's badge names MiniLM over a term-overlap score.** See §5.5.

---

### 5.9 Theater Map

**What it is.** The ground, at four scales. **See `ANGEL-SWARM-MAP-SPEC.md` for the full specification of this destination.**

**Functionality.** Four renderers, one switch:

| Scale | Shows | Has |
|---|---|---|
| **Globe** | The planet, both combatant commands on it, at Natural Earth 1:50m generalised to under 3 km | Spin, zoom, fit. No layers, one arm. **Canvas 2D — not deck.gl, no GPU context** |
| **Theatre** | The combatant command and every operation in it | Its own zoom. No layers, one arm. **North-up and flat by default**, with an `OBLIQUE` toggle |
| **Tactical 2D** | The flat tactical map of this operation | Layers, zoom, side-by-side comparison of both arms |
| **Tactical 3D** | The same fight on the GPU | Its own layer set and camera. Withheld where the machine cannot run it |

**Expectation.** "Switch scale and the controls that apply come with me."

**Outcome.** **A control that cannot act at the current scale is not drawn** — not drawn disabled. **Three controls on the globe, three on the theatre, six on the flat map, five on the GPU map**, with one line beneath saying why and a count. *Re-counted off the shipped v6.4 build at 1680×1050: 3 / 3 / 6 / 5, and the buttons drawn are exactly the ones the map specification lists.* Each renderer keeps its own camera; a zoom moves the map on screen.

**The one exception to "a zoom does not navigate".** Zoom past the bottom of the globe's range and it flies the rest of the way in — 1,100 ms — and hands the view to the tactical scale at about the same ground width the tactical sheet opens on. It is announced by the flight rather than by a cut.

**And it flies to what is under the camera.** Through v6.3 the handoff read the *loaded* scenario and never consulted the camera at all, so every zoom anywhere on the planet arrived at JOA CORAL. It now takes an explicit selection first, else the nearest operation by great-circle distance to the camera centre, and **over open ocean it declines** — the zoom is clamped and the picture says `NO OPERATION UNDER THIS ZOOM — SPIN OR PICK ONE` rather than guessing.

**The route-stage strip, and the fact that it is closed when you arrive.** On the two tactical scales a floating strip along the bottom shows one selected sortie's stops — launch, each delivery, recovery — with **DONE / ACTIVE / PENDING** states and the stage being flown at this minute ringed in teal. A pending stop prints an ETA rather than a fact and prints no margin at all, because this application does not colour a slack figure it has not measured. Not drawn on the globe or the theatre: those are command-wide pictures and one sortie's stops are not at their scale.

**It opens on exactly two clicks and on nothing else** — a casualty (the sortie that carried to them) or an aircraft or sortie (that airframe's latest sortie) — and closes on the **✕** in its header or on **Escape**. Escape is taken only on the map page, only while the strip is open, and only while the walkthrough and all three sheets are closed. The dismissal is remembered against the selection that opened it.

Through v6.3 it **defaulted** to a sortie — most recent airborne while running, most recent completed at T+180 — so a cold arrival met a route nobody had asked about reading `20 OF 20 · SORTIE TRV-02 · COMPLETE`. A true statement about an arbitrary aircraft is exactly what makes an operator distrust the rest of the screen. **There is now no default**, and an empty box is not one of the answers: a casualty no sortie ever reached draws no strip, and the record panel is what acknowledges that click.

**One scrollbar per column, and never a horizontal one.** The legend body and the record body each used to carry their own `overflow-y: auto` inside a column that already had one — three open panels gave three nested vertical scrollers, and because CSS computes `overflow-x` to `auto` on any box whose `overflow-y` is `auto` and whose `overflow-x` is unset, each could also grow a horizontal bar. Collapsed in v6.4 to the one box that genuinely has to scroll — the column — with `overflow-x` pinned `hidden`: **worst case per column 3 vertical scrollers → 1, and 4 horizontally-capable boxes → 0**, measured across the four scales at six viewports. Panel bodies do not scroll.

**The operations list scrolls its selected card fully into view.** Selecting JOA MARINER used to leave the card half under the RUN CONTROL panel with its own Select button unreachable. The reveal now computes the visible band — the column's rectangle less its padding less anything actually standing over its foot, such as the walkthrough bar — and aligns the top of a card taller than that band.

**The two engines behind this page are now synchronised in both directions.** See §6.8.

**Nothing is fetched, at any scale.** Coastlines, boundaries, relief, icon atlas and font atlas are local or computed at runtime. Zero off-origin requests, measured across the whole destination at 1680×1050 and 1280×800.

---

## 6. Cross-cutting

### 6.1 The provenance mark

Use the mark from `ai-marks-v2.html`: one inline `.ai-attr` unit, colourway on `--m1/--m2/--m3`, glyph as `.ai-mark` at 1em, wordmark as real text in `.ai-attr-label` with a clipped gradient, glow as a drop-shadow on the wrapper. There is **no second mark** — a written rule carries none.

Hovering opens a card: which model, what it produced, how, and the validation figure.

**It belongs on exactly two things** (see §0.1): CRI-Net's estimate, interval and trust band on Sensor & Model; and MiniLM's ranking and scores **where MiniLM actually ranks** — the doctrine view in the standalone analyst console.

**Three rules the mark has already been broken by, and must not be again:**

1. **The allocator carries no mark and never should.** It is arithmetic against hard constraints, not a model. An earlier build marked it as AI; that was corrected and is recorded on the screen itself.
2. **A run figure carries no mark.** Arithmetic over the run's own record is not a model output. Ask ANGEL's run answers are badged `RUN RECORD · COMPUTED, NOT GENERATED` in teal, deliberately not in the violet the mark uses.
3. **A term-overlap score must not be badged with a model's name.** This is the rule the build is still breaking on two surfaces — see §5.5. **The mark is a claim, and a claim a judge can check in ten seconds is the most expensive kind to get wrong.**

**Do not draw a mark for a language model.** None is loaded.

### 6.2 The posture indicator

One indicator, one source, on every screen: **deployed or not · authority delegated or not · link up or down · clock running or stopped**.

### 6.3 Telemetry

The application can accept live casualty telemetry over Cursor on Target — the format TAK already carries — receive-only, on loopback unless asked otherwise, off unless enabled. Where a live reading exists it supersedes the simulated one and the tasking layer cannot tell a simulated emitter from a real monitor. **Stop the emitter and the link drops; tasking continues on last-known state.** That behaviour is the edge-autonomy claim and is worth showing.

Link states: off · waiting · live · stale · down. With no listener the chip reads `INGEST OFF` and costs nothing. *(The earlier defect — `TELEMETRY.available` being a function, so a truthiness test always passed — is fixed; it is a boolean set from the launcher's own status response.)*

**BATDOK-J is named as the plausible producer** — the JOMIS point-of-injury and en-route care application, government-owned, built by AFRL's 711th Human Performance Wing, selected 2022, fielding FY26. **The interface is stated as `INTERFACE ACCEPTED · NOT TESTED AGAINST A REAL BATDOK-J`**, which is the truth and is worth more than a claim that would not survive one question.

### 6.4 Roles

Four profiles — commander, logistician, surgeon, analyst — change what the interface offers on arrival, never what an operator is allowed to reach.

### 6.5 Keyboard

Every destination reachable by key, a command palette, and a shortcut sheet. **If a shortcut is advertised it must work.** The audit of every control in the build is `CONTROL-AUDIT-v3.6.md`, which ships beside this document; the rail-button matrix is `RAIL-BUTTON-VERIFICATION-v3.5.txt`.

**The guided walkthrough's keys steal nothing.** Its arrow and Escape handlers return on their first line while it is off, and again while focus is in an input. Verified: typing in the top-bar search and pressing ← twice moved the caret and did not change the step; the same in the Ask ANGEL input did the same.

**Escape is shared, and the order of precedence is written down.** Since v6.4 Escape also dismisses the route-stage strip — but only on the map page, only while the strip is open, and only while the guided walkthrough and all three sheets (deploy, result, reset) are closed. The three sheets and the walkthrough keep the key exactly as they had it, and no other surface answers Escape.

### 6.6 The comparison rule — added v6.2

**AN ANGEL SWARM FIGURE NEVER APPEARS WITHOUT THE CURRENT — TRIAGE & PROXIMITY FIGURE BESIDE IT, AT THE SAME SIZE.**

One comparison line, under twelve screen titles, built once and placed from a byte-identical fragment on every destination, so a future figure change lands in one place rather than twelve:

```
DEAD OF SURVIVABLE WOUNDS  ▍23 ANGEL SWARM  ▍34 CURRENT — TRIAGE & PROXIMITY
· SAME CASUALTIES, SAME AIRCRAFT, SAME BLOOD
```

**It does not print a comparison that does not exist** — three states, not deployed / not readable / complete (see §0.2 and §0.3). It is deliberately left off Settings: that is the configuration screen, not a board anyone presents a result from.

**Both tolls also stand on the navigation rail**, under `POSTURE · ONE SOURCE`, on screen whatever destination is open, in a compact form on short viewports and withdrawn entirely where the rail would otherwise scroll.

**The two arms carry hues, and the hue is a callsign and not a verdict:** ANGEL SWARM teal, hue 165; CURRENT — TRIAGE & PROXIMITY orange, hue 50 — deliberately *not* the escalation amber at hue 75, because an operator seeing amber needs to read "somebody has to decide this". **Every death figure on both arms stays red, hue 25, without exception**, because a death is a death whichever tasking produced it. ANGEL SWARM is drawn first everywhere — left column, top row — without exception.

### 6.7 Hierarchy — one figure per screen, and it must be obvious which

The complaint that produced this rule was "it was hard to locate things overall", and the cause was that almost everything was the same size, so nothing was the answer. The Ops Center Wall's own 52 : 24 ratio between the headline and the tile row is the model; it is applied one screen over wherever a screen has a single answer. **More than half the application was looked at and deliberately left alone** — a terminal transcript, a record and a board that already leads with the right thing do not need a bigger number.

### 6.8 One screen, one answer to "what is loaded" — added v6.4

**Two simulation instances run behind the Theater Map, and until v6.4 nothing synchronised them in either direction.** The design shell reads `angel-engine.js`'s world — the classification stamp, the KPI screens, every figure that is not the map. The map frame (`app/angel-map.js` mounts the application in a same-origin frame) runs its own instance.

On the unmodified build, **picking JOA BASALT on Settings moved the classification stamp to BASALT while the map underneath carried on drawing CORAL.** Two answers to *what is loaded* on one screen. Given §2's standing rule — there can never be a case where what is presented is not true — that is the worst class of defect this application can have, and it predated every feature it was found alongside.

Both directions are wired now, each one function wide:

| Direction | Seam |
|---|---|
| The map moves the shell, after a globe handoff | `ANGEL_DESIGN.setScenario(key)` |
| The shell moves the map, when Settings changes theatre | `ANGELMAP.setScenario(key)` — driving the frame through `app.js`'s **original** `selectJoa`, captured at bind time, so the frame takes the path it would have taken had the operation been picked on the picture |

Each validates the key against the engine's own scenario list rather than trusting its caller, and each is a **no-op when the scenario asked for is already loaded** — idempotent by scenario key, so the two cannot ping-pong. Changing scenario is the most expensive run setting in the product and behaves like one at both ends: the clock returns to T+0 and stops, both arms are rebuilt, and anything naming a casualty of the battle that just went away is dropped.

**Design rule that comes out of it.** No mock-up, and no screen, may show a classification stamp and a map picture naming different operations.

---

## 7. Data model

### 7.1 Casualty

| Field | Type | Meaning |
|---|---|---|
| `id` | integer | Displayed `CAS-nnn`, zero-padded to 3 |
| `tInjury` | minutes | When wounded |
| `deadlineMin` | minutes | Window from wounding. **`>= 9000` means not time-critical** — exclude, do not sort last |
| `cls` | enum | `IMMEDIATE` · `DELAYED` · `MINIMAL` · `EXPECTANT` |
| `injury` | enum | `TRUNCAL_HEM` · `JUNCTIONAL_HEM` · `EXTREMITY_HEM` · `AIRWAY` · `OTHER` |
| `needs` | array | Ordered payload keys that help this casualty |
| `responder`/`role` | string | Who is on scene and their qualification |
| `unitName` | string | Parent unit |
| `tPinged` | minutes | Last telemetry refresh — reading age |
| `assignedTo` | id or null | Aircraft tasked |
| `treated`, `tTreated`, `treatedWith` | | Null until treated |
| `outcome` | `SAVED`·`DIED`·null | Null while open |

Absolute deadline = `tInjury + deadlineMin`. Time remaining = that minus now.

### 7.2 Aircraft

States `IDLE` · `OUTBOUND` · `RETURNING` · `LOST`. **There is no on-station state** — hovering is `OUTBOUND` with a non-null `onStation` whose phase is `RELEASING` or `RECOVERING`.

Reach is measured **base to casualty, never from the aircraft's current position**, and effective radius grows as payload falls.

### 7.3 Payload

`BLOOD` · `PLASMA` · `TXA` · `TQ_KIT` · `CHEST_SEAL`. Blood carries a temperature band and a shelf clock; both bind.

### 7.4 The three death counts — never interchange them

| Count | Population |
|---|---|
| **Survivable** | `IMMEDIATE` and `DELAYED` only — **the headline** |
| **All categories** | Every triage class in this operation |
| **Theatre-wide** | Across every operation. *Caution: sums both combatant commands and mixes one real figure with six synthetic feeds.* |

Death causes are a **first-match cascade** — treated → no responder → no launch point → too fast → every aircraft busy. A bucket names the **first binding constraint, not the only one**. Say so wherever causes are shown.

---

## 8. What a screen owes the operator

1. **Say what state the run is in**, always, in one place.
2. **Name the next action** and make it the most prominent thing until it is taken.
3. **A figure with no source is not drawn.**
4. **An empty state says what is missing and what would fill it.**
5. **A control that cannot act is not drawn** — not drawn disabled.
6. **Deaths are red**, and the phrase is *fewer dead*.
7. **A number that is not yet readable is labelled as such**, not caveated.
8. **Detail opens where the eye is** — in the main column, never a narrow rail.
9. **Nothing flashes.** A mark, a figure or a control that repaints must not disappear between frames.
10. **Nothing leaves the machine.** No external font, script, tile or endpoint.

---

## Appendix — source inventories

Three detailed factual inventories accompany this specification, each citing file and line:

- `SPEC-INPUT-engine.md` — lifecycle, entities, optimiser, deployment, audit chain, death accounting
- `SPEC-INPUT-models.md` — the trained models, replication study, database, telemetry, maps, provenance
- `SPEC-INPUT-features.md` — the feature and state matrix, every control, and what is currently broken
- `CONTROL-AUDIT-v3.6.md` and `RAIL-BUTTON-VERIFICATION-v3.5.txt` — every control in the build, exercised
- `ANGEL-SWARM-MAP-SPEC.md` — the Theater Map destination in full, all four scales
- `ANGEL-SWARM-DOCTRINAL-TERMINOLOGY.md` — the authoritative naming, and why each term was changed
- `ANGEL-SWARM-WIN-PROBABILITY-v5.9.md` — 1,400 paired battles across seven theatres
