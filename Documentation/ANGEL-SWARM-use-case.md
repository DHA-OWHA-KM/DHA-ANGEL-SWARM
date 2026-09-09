# ANGEL SWARM

## Autonomous Medical Resupply Tasking Against Physiological Deadlines

**NDIA Global Defense Hackathon 2026 · Military Health System / Defense Health Agency Combat Support**

**UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY**

*Use case document · Version 1.1 · 9 September 2026*

---

## BLUF

ANGEL SWARM tasks autonomous medical resupply aircraft against wounded soldiers' **physiological deadlines** — how long each casualty has before they die of their wounds — rather than against the nearest available airframe and a best guess at who needs it most — the practice everywhere today, which no doctrine actually names.

In the reference run of the shipped prototype — joint operations area CORAL, PACOM, seed 42, 125 casualties, 180 minutes — ANGEL SWARM ended the engagement with **23 dead of wounds that were medically survivable**, against **34** for CURRENT — TRIAGE & PROXIMITY running on the same casualty stream, the same aircraft and the same blood. Across all triage categories, 31 dead against 42.

**Eleven fewer dead of survivable wounds. The target is zero.**

Everything in this document is measured from a prototype that runs from a folder, on a laptop, with no dependency on enterprise reachback to decide. The casualties are synthetic and the physiology is a model. What is real is the tasking logic, the trained network that reads the physiology, the decision record, and the arithmetic of the comparison.

---

## 1. The operational problem

### 1.1 The Golden Hour is gone in a peer fight

The evacuation model that underwrote two decades of trauma care — a helicopter inside sixty minutes, a surgical facility at the end of it — depends on conditions that a peer adversary is specifically resourced to deny. Distributed maritime operations put small elements on islands and ships spread across hundreds of kilometres of water. Contested logistics means the route to the casualty is itself a target. Without guaranteed air superiority, a rotary-wing casualty evacuation aircraft is a slow, predictable, uncontested-airspace platform flying into airspace that is not uncontested.

The result is not a slower Golden Hour. It is a different problem entirely: evacuation times measured in **hours, not minutes**, and in the worst planning cases in days. The Director of the Armed Services Blood Program stated in June 2026 that evacuation should be expected to be delayed *"greater than 72 hours, maybe even longer."* Army doctrine writers have called the 72-hour prolonged-care standard *"more aspirational than medically attainable."*

### 1.2 The arithmetic does not close

Large-scale combat operations planning estimates run to tens of thousands of casualties in the first days of a fight for a corps-sized force. A division's air ambulance company manages on the order of thirty casualties per operational cycle. Role 2 surgical elements hold ten to forty patients and are then full. Evacuation capacity is short of demand by one to two orders of magnitude, and no realistic procurement of rotary-wing airframes closes that gap inside the timelines that matter.

The unavoidable conclusion, and the premise of this entire concept:

> **The casualty cannot go to the intervention. The intervention has to go to the casualty.**

### 1.3 Triage is the wrong shape for this problem

Battlefield triage sorts casualties into categories by how bad they look at the moment of assessment. That method is a reasonable answer to a mass-casualty event with a fixed set of treatment slots at a fixed location. It is a poor answer to a distributed problem where the constraint is not treatment capacity but *aircraft-minutes against clocks running at different speeds in different places*.

Two specific failures matter here:

- **Appearance lags physiology.** A fit young adult holds normal-looking vital signs while compensating for substantial blood loss, and then decompensates without warning. The categories are assigned before the information that would change them exists.
- **A category is not a deadline.** "IMMEDIATE" tells a dispatcher that someone is urgent. It does not tell them whether that casualty has eleven minutes or fifty-one, which is the only fact that determines whether an aircraft launched now arrives in time.

### 1.4 What exists, and what does not

The airframes exist and are programs of record. Casualty detection and assessment from an uncrewed platform is a crowded field with well-funded competitors. Blood packaging and aerial delivery of blood products have validated guidance behind them. Wearable physiological monitoring can feed a tactical picture; **Sempulse Halo is an example monitor, CipherOx CRI M1 is the compensatory-reserve reference, and BATDOK-J is a separate plausible producer/interface.** That is an architectural distinction, not a claim that ANGEL SWARM has tested any of them.

What does not exist is the layer that consumes all of that and decides **which aircraft flies to which casualty, in what order, carrying what**. Swarm tasking frameworks exist — for strike, ISR and counter-drone. They have never been applied to medicine.

> **We have autonomy for taking lives. We have none for saving them.**

ANGEL SWARM is a working demonstration of that missing layer.

---

## 2. The concept

**Triage stops being a sorting problem and becomes a scheduling problem.**

Every casualty in ANGEL SWARM carries a countdown rather than a colour: an estimate, derived from pulse waveform morphology rather than from vital-sign numbers, of how many minutes remain before their body stops compensating. Not *"this one looks worse."* Instead: *this one has 19 minutes, that one has 42, the one shouting has 90.*

A deadline is the input an optimizer can use. Scheduling problems with deadlines have optimal answers and measurable regret. Sorting by appearance has neither.

From there, tasking becomes a constrained routing and allocation problem. ANGEL SWARM builds multi-stop routes that maximise expected survival, subject to constraints evaluated at the **cumulative arrival time of each leg** rather than at launch:

| Constraint | What it enforces |
|---|---|
| **Physiological deadline** | Will this aircraft arrive before this casualty decompensates? Arriving after the deadline scores zero, not partial credit. |
| **Receiver capability** | Blood, plasma and tranexamic acid are combat-medic skills. Do not deliver something nobody present is trained to administer. |
| **Cold chain in the loop** | Whole blood must arrive within its temperature band. Container temperature is modelled *in flight*; a routing that would break the chain triggers a substitution to a product with no cold chain to break. |
| **Time-limited pharmacology** | Some interventions have a window beyond which they harm rather than help. The window is a hard constraint, not a preference. |
| **Finite blood** | Forward stock is limited. A unit spent on someone who cannot receive it is a unit denied to someone who can. |
| **Threat exposure** | Route value is discounted by the probability of losing the aircraft, then re-tested against break-even. |

Contention between aircraft resolves by auction on total route value, which is how fielded swarm tasking frameworks already resolve it.

**The baseline it is measured against is what is done today: CURRENT — TRIAGE & PROXIMITY.** A unit calls for resupply, a standard medical bundle leaves an aid station or forward arming and refuelling point on the next available airframe, casualties are sequenced by triage category, each sortie serves one destination, and the bundle carries the clinically indicated item, because the dispatcher does not know who is standing next to the casualty.

That baseline has no doctrinal name, and the absence is the point. Doctrine names the function — medical regulating, which covers patients and bed space rather than materiel (JP 4-02). It names the cell that performs it, the evacuation precedence categories (ATP 4-02.2, Table 2-1), the nine-line request format and the launch authority. It does not name the rule that decides which aircraft serves which casualty; that is left to unit standing operating procedure. The operations-research literature has to construct the baseline rather than cite it, describing current practice as a *"myopic policy, which tasks the closest-available MEDEVAC unit to service an incoming request"* and attributing it to no publication. It is called **CURRENT — TRIAGE & PROXIMITY** throughout this document because that is what it does, not because doctrine calls it anything.

It is emphatically **not** a Class VIII push. A push is anticipatory — preconfigured, scheduled, sent before anyone asks, and explicitly a substitute for requisitioning *"until line item requisition procedures can be established"* (JP 4-02.1, Ch II; FM 4-02.1, §4-8a). Nothing in either arm of this run is a push: both are triggered by a casualty on the board. What ANGEL SWARM performs has a doctrinal name of its own — **emergency movement of Class VIII, blood, and blood products**, a named MEDEVAC primary task (ATP 4-02.2, Ch 2, Sec IV). The baseline arm gets the same fleet, the same stock, the same casualty stream and the same multi-stop routing. The only difference between the two arms is judgment.

---

## 3. Concept of operations

### 3.1 Where it sits

ANGEL SWARM is a tasking and decision-support layer, not a platform and not a sensor. It sits between three things that already exist and one that does not:

```
  wearable physiology  ─┐
  casualty detection   ─┼─►  ANGEL SWARM  ─►  autonomous medical
  medical logistics    ─┘   (tasking layer)    resupply airframes
      common operating picture / C2 network
```

It consumes casualty position and physiological state, fleet state, and forward Class VIII stock. It emits tasking proposals, and — under standing authority — dispatch orders. It writes everything it does to an auditable record.

Those inputs arrive across three tiers — the **edge** (the monitor on the soldier), the **tactical network** (the feed the force already carries forward), and the **enterprise** (fleet state, theatre stock, the cross-joint-operations-area picture and the audit archive, when reachback exists). They are layers, not alternatives. The tactical tier is the one that was missing and is now built; §7.5 describes it.

### 3.2 The mission thread

1. **Casualty occurs.** Wearable telemetry, a medic's report, or an overhead sensor puts a casualty on the picture with a position and a physiological state.
2. **A deadline is computed.** The compensatory reserve estimate is converted into a time-to-decompensation with a stated uncertainty. Where the signal is too degraded to trust, the system says so rather than guessing.
3. **The optimizer solves.** Against the current fleet, current stock, current threat picture and every open deadline, it constructs multi-stop routes and scores them by expected survival at the arrival time of each leg.
4. **Authority is applied.** Routine proposals dispatch under standing authority. Proposals meeting named escalation grounds stop and ask a human.
5. **The aircraft flies.** Cold chain and route are monitored in flight; a thermal excursion or a threat change is a re-tasking event, not a post-flight discovery.
6. **The record is written.** Every proposal, escalation, approval, rejection, hold, delivery, waste and policy change goes into a hash-chained log with the physiology that produced it.
7. **The picture updates and it re-solves.** Casualties deteriorate, aircraft are lost, new casualties arrive. The solution is continuous, not a one-shot plan.

### 3.3 Authority — a human in the loop who is not the bottleneck

A single confidence threshold is a poor authorisation rule: it either escalates everything, which reproduces the human dispatcher as the constraint, or it escalates nothing, which is indefensible. ANGEL SWARM implements what a fielded system would need instead — **standing authority for routine resupply, escalation on named and auditable grounds**:

| Escalation ground | Meaning |
|---|---|
| **LOW CONFIDENCE** | Modelled benefit falls below the standing-authorisation bar, which the operator sets. |
| **THREAT TRANSIT** | The routing crosses a known air-defence envelope. The loss probability is stated on the proposal. |
| **LAST BLOOD / LAST PLASMA** | The sortie would take a launch point to zero units of a scarce blood product. |
| **IMMEDIATE UNASSIGNED** | It serves a lower-precedence casualty while an IMMEDIATE inside that aircraft's radius has no aircraft assigned. |

Escalated proposals **expire after eight minutes of simulated time**. Hesitation has a cost and the record shows it. In the reference run, **20 sorties launched on standing authority, 0 were left awaiting a human, and 3 expired unanswered.**

That last number is not hidden. Three proposals that a human never answered are three tasking decisions that did not happen, and they are in the log.

### 3.4 Commander's intent

Every casualty carries a duty role. Under mission analysis a commander decides, before contact, which capabilities the mission cannot replace inside the fight. Designating those duty roles — or an individual soldier — gives that casualty **first claim on an airframe**: the proposal list sorts designated first, then by expected benefit within each tier, with a priority weight applied *after* the break-even test, so a designation changes who is served first and never manufactures a sortie that was not worth flying.

The trade is explicit and it is paid out of the rest of the queue. It is a command decision, it is reversible, and it is logged with the time it was made. CURRENT — TRIAGE & PROXIMITY sequences by triage category and then by who is nearest, and has nowhere to record a mission-critical duty role at all.

### 3.5 Degraded operations

- **Communications outage.** ANGEL SWARM holds its last-known-good plan and keeps flying. Voice-dispatched tasking simply stops.
- **Telemetry link loss.** The state of the ingest link is on the face of the display: **LIVE**, **STALE** at six seconds, **DOWN** at fifteen. At DOWN the live readings expire and the tasking layer continues on last-known state. This is demonstrated by killing the feed mid-run, not asserted (§7.5).
- **Stale picture.** Telemetry age is displayed per unit. Outside the relay footprint the commander's picture ages visibly rather than silently.
- **Standby.** The system can be placed in STANDBY from the command bar, at which point both arms run identical unaided logic. Activating it mid-run hands tasking authority to the optimizer from that moment forward, and the switch itself is logged.

### 3.6 Protected status

Every medical airframe broadcasts a machine-readable protective emblem, and the system refuses to assign a protected platform a non-medical task. This matters because the same airframe classes used for medical resupply are being test-fitted with weapons; a platform that does both forfeits protection under the law of armed conflict. ANGEL SWARM enforces the separation in software.

---

## 4. Who uses it, and how

The prototype ships four role profiles. The role is selected from the command bar and switches instantly, with no reload — flipping from Commander to Analyst mid-sentence is itself part of the demonstration. Every capability remains reachable from the Analyst profile; the other three are compositions, not amputations.

### 4.1 Commander — decision support

**The question:** What do I decide, what does it cost, and what happens if I do nothing?

Five screens: the theatre picture with the one decision outstanding; the map; the difference between the two methods; the approvals queue; and what it costs. Few numbers, each of them actionable.

The minimum viable Commander interface is five screens and one line: *eleven fewer dead — 23 against 34 — the target is zero.*

The Commander is also where commander's intent enters the system — high-value duty role designation, the autonomy policy, and the standing-authorisation bar.

### 4.2 Logistician — the supply chain

**The question:** Will I have blood where it is needed, and what am I wasting?

Forward Class VIII stock at each launch point for both arms, burn rates, projected time to blood stockout, cold-chain state per container, fleet readiness and serviceability, launch-point coverage, and resupply timing. This is the role that sees the allocation problem most directly: the difference between the arms shows up as much in what is still on the shelf at the end of the engagement as in the casualty count.

### 4.3 Surgeon — medical operations

**The question:** Who is deteriorating, and who on scene is qualified to treat them?

The Command Surgeon is a real staff billet and the natural owner of the clinical half of the tool: casualty state and physiological deadlines, triage composition, the compensatory reserve trace for an individual casualty with the model's own stated uncertainty, responder capability on scene, telemedicine and remote supervision policy, and the clinical constraints the optimizer is enforcing.

This is also the role that owns the most important clinical finding in the reference run — that the largest single cause of survivable death was not aircraft availability but the fact that nobody on scene was qualified to administer what arrived.

### 4.4 Analyst — everything

**The question:** Do I believe any of this?

The full instrument: the raw casualty register, the hash-chained decision log with chain verification on screen, the Sankey casualty flow, Kaplan-Meier survival curves with right-censoring, deadline-versus-arrival scatter, the Monte Carlo workbench, the sensitivity sweeps, the sensor and model pane, doctrine retrieval, and a SQL console over the run's own data with an exportable database.

The Analyst profile exists because the correct response to a claim like "eleven fewer dead" is scepticism, and the tool has to survive it.

---

## 5. What the prototype demonstrates, and what it measured

### 5.1 The reference run

Joint operations area CORAL, PACOM. Seed 42. 125 casualties over 180 minutes. Both arms, same stream, same aircraft, same blood, common random numbers — the same random draw decides a given casualty's fate in both arms, so the measured difference is attributable to the tasking decision rather than to sampling luck.

| Outcome | ANGEL SWARM | CURRENT — TRIAGE & PROXIMITY |
|---|---|---|
| **Died of survivable wounds** | **23** | **34** |
| Died, all triage categories | 31 | 42 |

**Eleven fewer dead of survivable wounds. The target is zero.**

### 5.2 The 23 — where the remaining deaths came from

This is the most useful table in the document, and it is the one that argues against the reflexive procurement answer.

| Cause | Count |
|---|---|
| Nobody on scene qualified to administer what they needed | **10** |
| No launch point within reach | **9** |
| Reached in time and died anyway | **3** |
| Every aircraft committed elsewhere | **1** |

**Only one of the 23 changes if you buy more aircraft.** Ten are a training and scope-of-practice problem. Nine are a basing and forward-positioning problem. Three are the limit of prehospital medicine.

Reach is the structural constraint underneath this. **27 of 125 casualties were reachable by one aircraft or by none at all.** The worst site, EAST SPIT, accounted for 9 dead, 8 of them survivable — a location problem, not a tasking problem, and one no optimizer can solve after the fact.

### 5.2a Buying more aircraft does not close it — measured, not asserted

The table above says it. The prototype now lets a commander test it, by adding airframes to a named launch point and re-running. Every aircraft added is given to **both** arms, so the comparison stays attributable to the tasking and nothing else.

Same battle, same seed, same three launch points, fleet grown from 7 to 23:

| Aircraft | ANGEL SWARM | Sorties | CURRENT — TRIAGE & PROXIMITY | Sorties |
|---|---|---|---|---|
| 7  | **23 dead** | 20 | 34 dead | 38 |
| 11 | **23 dead** | 20 | 33 dead | 70 |
| 15 | **23 dead** | 20 | 32 dead | 94 |
| 23 | **23 dead** | 20 | 31 dead | **141** |

At this seed, tripling the fleet buys the current method three fewer dead at nearly four times the sorties, and ANGEL SWARM does not move. It also declines to fly fifteen of the twenty-three aircraft, because flying them would not change these outcomes — and every sortie it does not fly is blood not committed to somebody who cannot use it, and an airframe not exposed inside a threat envelope for nothing.

**One seed is not the finding, and an earlier version of this document over-read it.** Swept over **100 paired seeds** at five fleet sizes, a threefold fleet *does* help ANGEL SWARM: **23.4 → 22.2 survivable deaths, worse on not one seed of the hundred**, and two cause buckets shrink rather than one — *every aircraft committed* 0.9 → 0.4 and *no launch point in reach* 4.7 → 4.1.

**What survives is the stronger claim, and it is the answer to the obvious rebuttal.** Because every airframe added is given to both arms, more aircraft cannot close the gap:

> **Seven airframes tasked on a physiological deadline still beat twenty-one tasked on triage and proximity, by 3.0 survivable deaths, on 92 of 100 identical battles.**

And one cause of death does not move at all. *Nobody on scene who could administer* is **12.0 deaths at seven airframes and 12.0 at twenty-one**, identical to two decimal places. Aircraft cannot touch it.

The constraint is where the launch points are and who is standing next to the casualty — not how many aircraft sit on a pad. Those are a basing decision and a training decision, and both are decisions this tool can inform before the money is spent.

### 5.3 Autonomy in practice

| | |
|---|---|
| Sorties launched on standing authority | **20** |
| Proposals left awaiting a human at end of run | **0** |
| Proposals that expired unanswered | **3** |

The system did not require a human to be the dispatcher. It did require a human on three occasions and did not get one, and the record says so.

### 5.4 Beyond one run — 1,400 paired battles across seven theatres

200 paired replications in **each of the seven theatres the engine carries**, run against the shipped engine in the exact configuration the application itself uses. Reproduce with `winprob.mjs <SCENARIO> 200`, which ships in `documents/`.

> **ANGEL SWARM wins all seven theatres. Every 95% interval excludes zero. Across 1,400 paired battles it produced more dead in 5 — 0.36% — and never by more than one.**

The reference theatre, PACOM CORAL:

| | |
|---|---|
| Mean paired difference | **4.905 fewer dead** |
| 95% confidence interval | **4.595 to 5.215** |
| Cohen's d_z | **−2.19** |
| Replications where ANGEL SWARM was worse | **0 of 200** (1 tie) |

The full seven-theatre table is `ANGEL-SWARM-WIN-PROBABILITY-v5.9.md`. **The weakest theatre is EUCOM FJORD** — a compressed laydown where distance stops discriminating between casualties, so a deadline sort has less to work with. It still wins: mean **−1.875**, interval −2.053 … −1.697, better on **174 of 200** battles. Three of the five adverse battles anywhere are in FJORD, and seed 42 is one of them. **One battle is not a theatre.** Quote the interval, not the seed.

**No p-value is claimed, deliberately.** The replications come from a deterministic program that can be run as many times as compute allows. A p-value computed over them would measure the compute budget, not the strength of the evidence. Saying so is more useful than printing a number that would not survive a knowledgeable reader.

### 5.5 Sensitivity — the procurement-relevant finding

The single most decision-relevant output of the whole prototype is not the headline number. It is which input moves it.

War Game opens on the selected operation/scenario and its scenario-specific force assumptions. It carries five levers, each swept as a paired Monte Carlo against the shipped engine and applied to the same altered world after the casualty stream is fixed and before either arm is built.

| Lever | What it varies |
|---|---|
| **Fleet size** | Every airframe count at every launch point |
| **Launch points** | How many sites are sited |
| **Datalink outage** | How long every denial window lasts |
| **Triage error** | The START over- and under-triage rates |
| **Responder qualification/mix** | The receiver-on-scene mix: how many can administer the required product |

The UI supports **20, 30 or 40 paired battles per setting**, using deterministic contiguous seeds from **1000**. It runs either nominal published platform timing or the shipped observed-flight variability profile. Common random numbers keep ANGEL SWARM and **CURRENT — TRIAGE & PROXIMITY** in the same altered world at each seed. Triage error is the one asymmetric lever: it changes only CURRENT — TRIAGE & PROXIMITY, because ANGEL SWARM does not consume triage category. Declared method differences also remain: ANGEL SWARM has telementoring and ANGEL-only in-flight abort/hold logic; CURRENT — TRIAGE & PROXIMITY does not.

**Launch points dominate the geometry, and responder qualification/mix dominates everything.** Where an aircraft can start from moves the result more than how many aircraft there are; and who is standing next to the casualty when it lands moves it more than either.

The responder lever, measured at five points, 30 paired seeds each:

| Qualified receivers on scene | ANGEL SWARM | CURRENT — TRIAGE & PROXIMITY | Gap |
|---|---|---|---|
| 1 in 10 | 23.5 | 27.7 | 4.2 |
| 2 in 10 | 22.9 | 27.3 | 4.4 |
| 3 in 10 | 22.2 | 26.9 | 4.8 |
| 4 in 10 | 21.7 | 26.7 | 5.0 |
| 5 in 10 | 20.9 | 26.2 | 5.4 |

**Both arms improve monotonically, and the gap widens — 4.2 to 5.4.** Putting a trained receiver on the ground is worth *more* under deadline tasking than under triage and proximity, because a delivery that arrives in time is only worth something if somebody present can give it. **The two investments compound.** That is a finding about force design the tool produces as a by-product of being able to run the counterfactual at all, and it points at basing and at training rather than at buying more airframes.

A sweep is all-or-nothing. Progress counts completed paired battles; cancellation terminates every worker and retains no partial findings. Worker load, handshake timeout, protocol mismatch and engine/runtime failure do the same. Completed results bind the scenario, lever settings, seed range, variability and control mode to the paired gap, 95% confidence interval and better/tied/worse counts. Changing scenario or variability invalidates those results and regenerates their labels. To reproduce one, restore the displayed scenario and variability mode, select the displayed lever and 20/30/40 count, and rerun the displayed seed range beginning at 1000.

---

## 6. The evidence, and its limits

This section exists because the concept is only worth anything if the claims survive examination. Everything below is a limitation that is stated on screen in the prototype as well as here.

**The casualties are synthetic.** There is no real casualty data in this system and none was used to build it. The casualty stream is generated from a seeded model with published distributions for triage composition, injury pattern and responder capability. The generator ships and is inspectable.

**The physiology is a model.** Deterioration, response to intervention and time-to-decompensation are modelled from published survival relationships. Where a steep published hazard would compound to an implausible figure if applied globally, the gentler general-case relationship is used and the steep one is applied only locally and capped. The parameters and their sources are listed in the tool.

**The comparison is internal.** Both arms are implementations inside the same simulation. The measured difference is between two tasking policies inside one model of the world — it is not a field trial, and it is not evidence about how either policy performs against reality.

**The baseline is implemented favourably.** The control arm gets the same fleet, stock, casualty stream and multi-stop routing, and in fair mode it also gets perfect triage classification, which no human achieves. It is a stronger baseline than current practice, not a weaker one.

**Replication count is not statistical power.** See §5.4. Deterministic replications are cheap; that is exactly why a p-value over them is not informative.

**The 3 who were reached in time and died anyway are a real category.** Reaching a casualty before their deadline is not the same as saving them. The model does not pretend otherwise.

**Some findings are structural and unflattering.** 27 of 125 casualties were reachable by one aircraft or none. The most common cause of survivable death was receiver capability, not tasking. An optimizer that cannot fix the dominant cause of death in its own reference run should say so, and this one does.

**Reported, not suppressed:** across 1,400 paired battles in seven theatres, **5 produced one more death under ANGEL SWARM** — 0.36%, and never worse by more than one. Three of the five are in EUCOM FJORD, and seed 42 in FJORD is one of them. The theatre still wins on its interval. Both the finding and the seed are in the tool and in `ANGEL-SWARM-WIN-PROBABILITY-v5.9.md`.

**The engine asserts its own reference result.** `app/selftest.html` ships in the package and checks the engine and host UI in the browser, offline, with nothing mocked. Coverage includes determinism and common random numbers, the reference result, conservation, physiological deadlines, payload/cold-chain/receiver constraints, range gating, CURRENT — TRIAGE & PROXIMITY precedence, the audit chain, seekable snapshots, every scenario, levers, the War Game worker path, directional sanity and Resupply Tracking. Its live summary is authoritative; this document does not hardcode a check total.

---

## 7. Technical approach

### 7.1 CRI-Net — the physiology network

The deadline comes from a network trained from scratch for this prototype.

- **1-D convolutional network, 104,162 parameters**, reading **5 seconds of photoplethysmogram at 100 Hz** and emitting an estimate of compensatory reserve **and its own variance**, from two heads under a Gaussian negative log-likelihood objective.
- Trained on 62,400 windows from 240 synthetic subjects. **Validated on 70 subjects that appear in no training window** — the split is by person, not by window.
- **Held-out mean absolute error 0.069**, against **0.159 for heart rate alone**. It is **2.3× better than rate**, which is the point: roughly a seventh of subjects are chronotropic non-responders or paradoxical and a further sixth are blunted, mirroring beta blockade, high vagal tone and the paradoxical bradycardia of severe haemorrhage. A rate-based rule misclassifies exactly the people it most needs to catch.
- It **mirrors the operating principle represented here by CipherOx CRI M1 (reference)**. It is not that device and makes no claim to be.

**The calibrated trust gate is the part that matters clinically.** Thresholds were measured on 8,000 fresh windows, so the network declares when it should not be believed:

| | |
|---|---|
| MAE when it says **act** | **0.063** |
| MAE when it says **do not** | **0.115** |
| Refusal rate, clean signal | **3%** |
| Refusal rate, degraded signal | **13%** |
| Inference latency | **0.8 ms** |

A model that refuses is more useful in this setting than a model that is confidently wrong 13% of the time on a shaking casualty in a moving vehicle.

### 7.2 Doctrine retrieval

A second network, **all-MiniLM-L6-v2** (Apache-2.0), quantised to int8 and shipped locally, provides semantic search over the doctrine corpus of **161 passages and 499 sentences** in the analyst console. Full search runs in **6.9 ms**. It returns **verbatim sentences with a similarity score**, and **below 0.35 similarity it refuses** — "no answer in this corpus" — rather than returning the least-bad passage.

**Where retrieval runs, stated precisely, because a claim about a model is checkable in ten seconds.** The encoder is the retrieval behind the analyst console's doctrine view. The design application's own doctrine tab and its Ask ANGEL screen rank an **eleven-passage inline reference set by term overlap** — Ask ANGEL at a measured floor of 0.55 requiring two matched content terms, chosen off a plateau rather than a cliff. **Neither generates text.** No language model is loaded anywhere in this build and no GGUF ships, which is why Ask ANGEL's header reads NO LANGUAGE MODEL · NOTHING HERE IS GENERATED — a template over the run record cannot hallucinate a casualty count, and a verbatim quote cannot invent doctrine.

**Stated plainly, because it matters:** the passages are **summaries written for the prototype with their source publications named. They are not extracts from those publications.** No paragraph numbers are fabricated. This is displayed on screen against every quotation. A known defect is also shown rather than hidden: one test query ranks the correct passage 40th.

### 7.3 The simulation

A deterministic discrete-event simulation of both arms over shared world state: procedurally generated terrain that actually drives the simulation (where casualties fall, whether a launch point is ashore or afloat), a fleet with endurance and payload limits, forward Class VIII stock with modelled cold chain, threat envelopes, and communications outage events. Seeded and reproducible: the same seed produces the same run, on any machine, every time.

### 7.4 Analysis and record

- **Hash-chained audit log.** Every entry chains over the previous hash plus the payload. The chain is verified on every render. Altering one character of one entry flips the badge to CHAIN BROKEN AT ENTRY *n*, live, on screen. Exportable to CSV.
- **Analytical console.** An in-browser columnar database over 11 tables of the run's own data, both arms under a discriminator, with a SQL editor and validated presets — including an as-of join from each delivery to the telemetry immediately preceding it.
- **Monte Carlo workbench.** 200 paired replications across web workers running the shipped engine, with the pairing benefit quantified, driven from a five-lever War Game screen.
- **Data products.** A FHIR-shaped bundle of **4,151 resources** — 125 Patient, 3,985 Observation, 21 ServiceRequest, 20 Procedure, **zero dangling references** — the decision record with full 64-hex SHA-256 digests, the run result as JSON and CSV, five JSON Schemas that validate offline under ajv 8 draft 2020-12, and a data catalogue naming five products, two consumed feeds, and the vertical path point of injury → OMDS → MHS GENESIS. The caveat **FHIR-SHAPED, NOT CONFORMANCE-TESTED** appears in five places including `meta.tag` on every single resource, so it cannot be lost by copying one file out of the bundle.
- **A self-test that ships.** Browser-offline coverage of the engine and host UI, including determinism, common random numbers, scenarios, War Game worker behavior and standalone RESUPPLY TRACK behavior. Use its live summary; see §6.
- **Casualty flow.** A fixed-layout Sankey that is byte-identical between runs so the two arms compare directly, a Kaplan-Meier survival curve with proper right-censoring, and a deadline-versus-arrival scatter on a true diagonal.
- **Tactical map.** **Four scales on one page** — a canvas-2D orthographic **GLOBE** carrying 34,416 vertices of world coastline and international boundary, a north-up **THEATRE** chart of the whole combatant command, a flat **TACTICAL 2D** map of the operation's ground, and a pitched GPU **TACTICAL 3D** view where time remaining is drawn as vertical columns. All four are anchored to the joint operations area's real coordinates, with casualty symbology whose pulse period encodes time-to-deadline. Zooming past the bottom of the globe's range flies the rest of the way in and hands the view down to the tactical sheet — to the operation under the camera, or, over open ocean, to nothing, with a caption saying so. The globe holds no GPU context; TACTICAL 2D and 3D are hardware-accelerated and degrade honestly, in that no hardware acceleration means the 3-D view is removed rather than shown broken. On the two tactical scales a route-stage strip opens along the bottom on a click — on a casualty, or on an aircraft — and shows that sortie's stops with the stage it is flying now highlighted; it is closed until asked for.

Exports: audit log and casualty register to CSV, run results to JSON, the analytical database to a file. It is built as a system of record, not a demo reel.

### 7.5 Telemetry ingest — how the reading arrives

Everything above rests on a physiological reading reaching the tasking layer. Until this tier existed, every reading in the application was produced by the simulation and read back out of the simulation's own memory. That demonstrates the tasking logic and demonstrates nothing whatever about acquisition, and a reviewer who works in tactical medicine asks *how does the reading get here* inside the first minute.

**The architecture is three tiers. The tactical one is the tier that was missing.**

| Tier | What it is | State |
|---|---|---|
| **Edge** | The monitor on the soldier — Sempulse Halo (example); CipherOx CRI M1 (reference). | Not ours. A prospective input, not a tested integration. |
| **Tactical network** | Cursor on Target over TAK / ATAK; BATDOK-J is a separate plausible producer/interface. | **The generic receive path is built. Described below.** |
| **Enterprise** | Maven Smart System or the War Data Platform — fleet state, theatre stock, the cross-joint-operations-area picture, the audit archive. | Integration work, when reachback exists. |

**The tactical and enterprise tiers are layers, not alternatives.** The tasking decision is made on the tactical tier and does not wait for the enterprise one.

**What is built.** The launcher accepts **Cursor on Target (CoT) over UDP** — the message format TAK already carries across tactical networks — parses the medical detail out of the `<detail>` extension, and republishes it to the browser over **Server-Sent Events**. Where a live reading exists for a casualty it supersedes the simulated one, writing the same fields the tasking already reads. Everything downstream — the deadline, the trust gate, the tasking order, the inspector — is untouched, which is the property that makes this an acquisition path rather than a second simulation.

**What it does not claim.** The medical values ride in a `<detail>` extension. CoT detail is open by design and this is that extension mechanism used as intended, but **it is not a ratified medical CoT schema** and nothing here should be read as one. The device roles are deliberately distinct: **Sempulse Halo (example)** is an example wearable, **CipherOx CRI M1 (reference)** is the compensatory-reserve reference, and **BATDOK-J** is a separate plausible producer/interface at the medic edge. **ANGEL SWARM has not tested an integration with any real Sempulse Halo, CipherOx CRI M1, or BATDOK-J.** No compatibility, military fielding, regulatory status or completed integration is claimed. The implemented claim is narrower: the launcher can receive the prototype's documented CoT `<detail>` dialect.

**The security posture, stated plainly.** The listener is **off unless `-cot :6969` is passed**. When enabled it binds `127.0.0.1` unless **`-cot-external` is also passed** — two flags, not one, to put a socket on a real interface. It is **receive-only**: it parses, it never replies, and it never originates a packet. The parser is bounded — a datagram over 8,192 bytes is dropped unread. With no listener running, behaviour is bit-identical to the build that had no ingest path at all: seed 42 in fair mode is still 23 against 34, the full sweep across four themes and four roles is clean, and there are zero off-origin requests.

**A device emitter ships alongside it.** `cotsim` stands in for the wearables, emitting CoT at a realistic cadence with a compensatory reserve that falls the way a bleeding casualty's does. It is **not a device driver** and it is **not a claim that any monitor speaks this dialect today**. It exists so that the acquisition path is exercised by a real socket from outside the program rather than by the simulation reading its own memory.

**Measured.** 125 devices, approximately 62 messages per second, over 14,000 messages, **0 dropped**. Link state degrades honestly and was verified by killing the emitter mid-run: **LIVE → STALE at 6 seconds → DOWN at 15 seconds**. At DOWN the live readings expire and the tasking layer carries on with the link gone — the behaviour the whole concept rests on, and which until now there was no way to demonstrate, because there was no link to pull.


### 7.6 Resupply Tracking — a standalone synthetic demonstration

**What is built.** Resupply Tracking owns immutable synthetic demonstration
commitments and its own deterministic clock. It shows nominal phases plus diverted,
aborted, lost, deadline-miss, cold-chain-failure and delivered fixtures, with
seek, play/pause, a tracker-owned normal/8× playback toggle (`SPEED ×8` /
`SPEED ×1`), reroute and exception controls, a synthetic margin-sorted queue, Canvas 2D
schematic and an Arm B scheduled-push comparison state. It is not a projection of
engine tasking, scenarios, casualties, host playback, run snapshots, fleet history
or Arm B ledgers; no model runs on this path. The speed toggle changes only the
tracker's deterministic clock, never host playback or engine state.

All tracker names, times, routes and payloads are synthetic demonstration fixtures
and cannot be treated as operational output. The tracker changes no engine state or
outcome. Its local schematic adds no external map, dependency, socket or request.
`Send to medic's ATAK` opens an informational, future-only modal and emits nothing.
**No BATDOK-J, ATAK, TAK Server, Marti REST or CoT-emission integration exists;
“CoT is ingested, not emitted” remains true.**

Release verification is responsible for checking the standalone controls,
exceptional states, Arm B comparison state, responsive layout, keyboard operation,
no new requests and the unchanged engine result. This section does not turn those
checks into evidence until they have been run and recorded.

---

## 8. Where this sits in what the Department has already bought

**BLUF.** In May 2026 the 44th Medical Brigade, XVIII Airborne Corps, completed an operational validation of autonomous Class VIII aerial resupply using Soaring M25 aircraft. The aircraft are autonomous and fielded. The rule that decides which aircraft flies to which casualty is bought by no program in the portfolio: DIU's AI-Assisted Triage and Treatment Tool (25 February 2026, PROJ00628) states its scope as triage, assessment and documentation and does not buy allocation or tasking of evacuation and resupply assets; TATRC's MEDRAS portfolio funds autonomous transport, documentation and treatment across sixteen projects, and allocation is not a category in it; NAVAIR PMA-263's TRUAS performs automated launch, waypoint navigation, automated landing and payload release — it flies the mission it is given. The Department has bought, fielded and made permanent every layer around the decision this system makes, and has bought none of that decision. ANGEL SWARM is the missing tasking rule for aircraft the Services have already procured. It is not a new aircraft, not a new command system, and not a replacement for anything currently funded.

### 8.1 The layer below — the airframes already exist and already fly themselves

NAVAIR PMA-263 fields the TRV-150 through the Unmanned Logistics Systems–Air line; the Marine Corps TRUAS variant has reached initial operational capability. Its published behaviour is automated launch, waypoint navigation, automated landing and payload release. It flies the mission it is given. ANGEL SWARM produces the mission it is given. Those are two different problems and only one of them has a program.

This system's airframe parameters are set **at or below** published performance figures for the TRV-150C, the Soaring M25 and the FVR-90. It does not assume a better aircraft than the one that exists.

### 8.2 The layer beside — the sensing and documentation layer is being competed now

DIU announced the AI-Assisted Triage and Treatment Tool on 25 February 2026. Its stated scope is digital triage, patient assessment and documentation, replacing an analog paper process. It does not buy allocation or tasking of evacuation and resupply assets. ANGEL SWARM consumes what that program produces and produces an aircraft assignment. Two adjacent buys, zero overlap.

TATRC's MEDRAS portfolio funds autonomous **transport** (including just-in-time whole blood delivery by UAS), autonomous **documentation** and autonomous **treatment** across sixteen projects. Allocation is not a category in that portfolio. ANGEL SWARM tasks those transport programs; it does not duplicate them.

Project Crimson demonstrated refrigerated FVR-90 whole-blood delivery to field medics at Project Convergence 2022, with BATDOK carrying patient data at the medic edge. That is prior art this work builds on, and it is four years old.

### 8.3 The layer above — the host is already designated

On 9 March 2026 the Deputy Secretary of Defense designated the Maven Smart System a program of record and moved its administration to the CDAO MSS Program Office. The FY27 request funds third-party vendors to develop and field applications on MSS. ANGEL SWARM is an application for that pipeline, not a parallel command-and-control system. Open DAGIR's OTA mechanism is the named path by which an outside capability is onboarded to that application layer without owning the data beneath it.

CDAO's Agent Network, announced June 2026, is architecturally the same object as this system: bounded agents that deliver decision options to a commander in seconds and make no targeting or strike decisions. Its published operating partners are EUCOM, INDOPACOM and SOUTHCOM, and its published use cases do not include medical logistics. **ANGEL SWARM is an Agent Network-class capability for the medical lane.** Stated plainly, that is a lane to be filled, not a program to be displaced.

### 8.4 The clinical lane — DHA already owns the record of truth

The Operational Medicine Care Delivery Platform, owned by Defense Healthcare Management Systems, integrates with MHS GENESIS, references Joint Trauma System guidance, and is built to run disconnected and intermittent. This system's exported casualty and decision resources are shaped for that lane. The physiological deadline itself traces to Joint Trauma System Clinical Practice Guidelines, which is what makes "deadline" a clinical term rather than a product term.

### 8.5 Policy — this is an RMF question, not an autonomy-in-weapons question

DoD Directive 3000.09 (25 January 2023), paragraph 1.1.b, excludes from its applicability *"unarmed platforms, whether remotely operated or operated by onboard personnel, and whether autonomous or semi-autonomous,"* and *"autonomous or semi-autonomous systems that are not weapon systems."* This system tasks unarmed aircraft carrying blood. The Directive excludes it on both counts, in its own words. The rulebook that does apply is DoDI 8510.01 and the Risk Management Framework, and that assessment is written down in the security annex rather than asserted here.

### 8.6 How it is subsumed, concretely

1. **As an application on the MSS third-party layer,** onboarded through the Open DAGIR OTA mechanism. It contributes a decision surface; it does not stand up a data environment.
2. **As the medical-logistics lane inside an Agent Network-style agent framework** — the same bounded-agent contract, human on the loop, no strike authority.
3. **As a tasking service behind an existing ground control station.** The assignment this system produces is a mission for a specific airframe; STANAG 4586 is the correct NATO interface for handing it to the control station that already flies that airframe. That is the target interface, not an implemented one, and is stated here as an integration path rather than a capability.
4. **As a data producer into the DHA clinical lane,** by exporting casualty and decision resources shaped to the same standard the operational medicine platform and MHS GENESIS consume.

### 8.7 What is deliberately NOT claimed

Honest boundaries, stated here so no reviewer has to find them:

- **CoT is ingested, not emitted.** The telemetry listener is receive-only, off by default, and bound to loopback unless explicitly opened (§7.5). This system consumes the Cursor on Target feed a joint operations area already produces; it adds a track consumer, not a new interface. An emit path is the obvious next step and is not claimed today.
- **The exported health resources are FHIR-shaped, not conformance-tested,** and every exported resource carries that tag. The word "compliant" is not used anywhere.
- **STANAG 4586 is a target interface, not an implemented one.**
- **No Replicator alignment is claimed.** Replicator 1 and 2 scope is attritable combat autonomy and counter-UAS. Medical logistics is not in either, and claiming the lineage would be an unforced error.
- **No Link 16, VMF or MIL-STD-6017 compatibility is claimed.** Those are platform-to-platform tactical data links for track and fires. A medical-logistics decision layer has no business asserting them.
- **The allocation mathematics is not claimed as novel.** Published academic work addresses military medical evacuation dispatching and redeployment directly. What is offered here is a fielded decision layer with a provenance record attached to every decision — which is what the published work does not provide.
- **"Swarm" here does not mean attritable strike mass.** It is a fleet of unarmed logistics aircraft carrying blood.

---

## 9. Deployment

**It runs from a folder, with no install, and it has no dependency on enterprise reachback to decide.**

- Four platform launchers — Windows x64, macOS Apple Silicon, macOS Intel, Linux x64 — each a single self-contained binary.
- The launcher serves the application on **loopback only** and opens the browser. **Nothing in the application originates an outbound request** — no content delivery network, no default model host, no telemetry home, in any code path. This is asserted in automated verification, not assumed.
- The one socket that faces outward is the telemetry ingest listener of §7.5, and it is **off unless asked for, loopback-bound unless asked twice, and receive-only in every configuration**. With no listener running the application behaves bit-identically to the build that had no ingest path at all.
- No administrator rights. Nothing written outside the folder. Delete the folder and nothing remains.
- Every asset — models, basemap, database engine, fonts — is a file inside the folder.
- Verified from the packaged folder: **thirteen destinations populated, 0 uncaught page errors, 0 off-origin requests**, at 1680×1050 and 1280×800, in all four map modes. Nothing is fetched from a network at any map scale: coastlines and international boundaries ship inside the build, and the relief under them is computed at runtime and labelled on the map's own face as shading rather than elevation.

**The precise claim, because the loose one does not survive the obvious question.** This is not an air-gap claim, and calling it one conflated two different things: that the runtime needs no network for its models and its compute, which is true and verified; and that the system is operationally deployable disconnected, which was not demonstrated, because there was no way for a reading to arrive at all. The correct claim is stronger. **ANGEL SWARM has no dependency on enterprise reachback to decide.** It consumes the telemetry feed the force already carries on its tactical network, it decides locally, and it continues on last-known state when reachback drops. A tactical network is not the internet, and the distinction is the whole architecture.

The deployment posture is not incidental. A medical tasking tool that a judge, a surgeon or a planner cannot open without an account, a network and an accreditation is a tool that does not get evaluated. This one opens on a laptop on an aircraft.

---

## 10. What it would take to go further

Ordered by what actually blocks progress, not by what is most interesting to build.

**1. Policy, before anything else.** DoD Directive 3000.09 applies only to weapon systems and expressly excludes *"unarmed platforms"* and *"autonomous or semi-autonomous systems that are not weapon systems"*, so it does not reach this. **No DoD or DHA issuance governs autonomy in triage, casualty prioritisation, or the allocation of scarce medical resources.** GAO found no department-wide DoD guidance for acquiring AI (GAO-23-105850); OMB M-25-21 names *"the allocation of care"* as high-impact AI and then excludes DoD from its scope; and the FDA already regulates time-critical decision software of this class as a device. The looser claim — that 3000.09 simply has no medical equivalent — is refutable on stage, because the DoD AI Ethical Principles of 24 Feb 2020 state expressly that they apply to combat *and non-combat* functions. ANGEL SWARM implements a candidate accountability pattern — standing authority, named escalation grounds, expiry with a recorded cost, and a tamper-evident decision record — precisely so there is something concrete to argue about. That pattern needs to be adjudicated by the people who own the policy, and no amount of engineering substitutes for it.

**2. Real physiology.** CRI-Net is trained on synthetic waveforms. The next step is not a bigger network; it is the same architecture and the same calibrated trust gate trained and validated on real waveform data from instrumented human subjects, with the refusal thresholds re-measured on that data. The training and calibration code ships so that this is a re-run rather than a rewrite.

**3. Integration with the real picture.** The tactical tier now exists: the application accepts Cursor on Target over UDP and the tasking layer consumes what arrives (§7.5). What remains is validation against real feeds rather than the synthetic emitter — including the separately identified Sempulse Halo (example), CipherOx CRI M1 (reference), and BATDOK-J as a plausible producer/interface — and then the enterprise tier: fleet state, theatre stock and the cross-joint-operations-area picture from Maven Smart System or the War Data Platform, with the audit chain mirrored to a platform archive. Those two tiers are layers, not alternatives; the tasking decision is made on the tactical one and does not wait for the enterprise one. As §7.5 states, no integration with any real named device has been tested.

**3a. Outbound delivery status, future only.** A fielded program could serialize the existing assignment, route, estimate and deadline as a CoT delivery event for an ATAK map. That path is **not implemented in this release**. It would create a new outbound interface and an eighth trust boundary; require deployment-specific validation of TAK Server, multicast or Marti endpoints rather than assuming defaults; and require mutual authentication, authorization, anti-replay and stale-event handling, audit, data minimization and an EMSEC decision. A casualty grid paired with an inbound aircraft is targeting data. TLS can protect a link; it does not conceal the emission pattern. BATDOK-J remains a record-of-care system and is not modified to carry this tactical object.

**4. Integration with the airframes.** The tasking layer emits routes and manifests. Fielding requires the message interface to autonomous resupply platforms already under contract, and the flight-following and cold-chain telemetry return path that makes in-flight re-tasking real rather than modelled.

**5. Force design analysis, which is available now.** The sensitivity result — launch points and responder qualification/mix dominate, and the two compound — is a study that can be run today, in this tool, against real theatre geometry, real basing options and real qualified-receiver densities. That is the cheapest and highest-value next step in the list, and it requires no new technology at all.

**6. Field experimentation.** Run the tasking layer against a live casualty-play exercise with instrumented mannequins and real airframes. The measured claim then becomes about the world rather than about a model.

**7. The receiver-capability problem.** Ten of the 23 remaining survivable deaths were people nobody present could treat. That is answerable by scope-of-practice change, by pushing shelf-stable products further forward, and by remote supervision of a less-qualified responder — each of which is a decision outside this tool's control but *measurable inside it*. The tool's most useful contribution here may be quantifying what each of those changes is worth before anyone commits to one.

---

## 11. Summary

The next fight will produce more casualties than the evacuation system can move, in places it cannot reach quickly, with the aircraft that used to reach them contested. The intervention has to go to the casualty. The airframes to do that exist and are funded. The sensors to know who needs what exist and are fielded. The judgment layer that connects them does not exist.

ANGEL SWARM is a working demonstration of that layer, running on a laptop, taking its readings off the tactical feed the force already carries and needing no reachback to decide, measured against CURRENT — TRIAGE & PROXIMITY on identical inputs: **23 dead of survivable wounds against 34, eleven fewer, with 20 sorties dispatched on standing authority and every decision in a tamper-evident record.**

The most honest thing the prototype produces is not that number. It is the breakdown underneath it — that only one of the remaining 23 deaths would have been prevented by more aircraft, that nine were beyond the reach of any launch point, and that ten were people nobody present was qualified to treat.

**The target is zero.**

---

**UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY**

*All casualties in this document are synthetic. All physiology is modelled. All figures are measured from the shipped prototype and reproducible from the stated seed.*
