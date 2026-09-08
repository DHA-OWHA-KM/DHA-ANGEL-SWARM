# ANGEL SWARM against the DHA ask — one page

**NDIA Global Defense Hackathon 2026 · Military Health System / Defense Health Agency Combat Support**
**UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY · Version 1.0 · revised 8 September 2026 against the shipped build**

All quotations: Robert Hammer, "Data, technology, people vital for warfighter health advantage, says Defense Health Agency director," Defense Health Agency Communications, Aug. 13, 2026 — https://dha.mil/News/2026/08/14/14/56/Data-technology-people-vital-for-warfighter — reporting the 2026 Defense Health Information Technology Symposium, Aug. 11, New Orleans.

---

## The ask, and the answer

Vice Adm. Darin K. Via, director of the Defense Health Agency, named the problem at DHITS 2026: **"We have the data"** … **"The struggle is to translate it into knowledge to make timely decisions that give us an advantage. It's sitting in silos … and data repositories, and not purpose-built to achieve outcomes."**

ANGEL SWARM is one instance of that translation, running. It reads a physiological deadline for every casualty — how many minutes this wounded soldier has before their body stops compensating — and decides which autonomous medical resupply aircraft flies to which casualty, in what order, carrying what. Reference run, JOA CORAL, PACOM, seed 42, 125 casualties, 180 minutes, three arms on one battle under common random numbers: **23 dead of survivable wounds under ANGEL SWARM, against 34 under current triage and proximity and 35 with nothing flown forward at all. Eleven fewer dead, on eighteen fewer sorties. The target is zero.** Those three figures are asserted by an engine self-test that ships in the package — 118 assertions, in the browser, offline — not by a slide.

The casualties are synthetic and the physiology is a model. The tasking logic, the trained network, the decision record and the arithmetic are real.

---

## AI-driven, stated exactly

DHA Chief Data and Analytics Officer Dr. Jesus Caban: **"The Department of War's AI strategy is very clear — we will become an AI-first workforce across all domains."** … **"But AI-first does not mean AI-only or AI-dependent … human accountability, clinical judgments, security, privacy, and mission continuity are preserved in every AI-enabled process, and mission-critical functions retain the human proficiency and fallback."**

**Two sets of learned weights ship in the folder — `models/ppg_cri.onnx` and `models/minilm/minilm.onnx`. Neither reaches a tasking decision, and the application says so on its own screens.**

- **CRI-Net** — 104,162-parameter 1-D convolutional network, trained from scratch. Reads 5 s of photoplethysmogram at 100 Hz, emits compensatory reserve and its own variance. Held-out error **0.069 against 0.159 for heart rate alone**, on 70 subjects in no training window; 0.8 ms on CPU. **Its output does not reach the allocator in this build** — the deadlines the tasking uses come from the scenario's physiology model, the Sensor & Model screen says so, and closing that loop is a named next step. Claiming a tighter integration than exists would not survive one question.
- **CRI-Net's uncertainty head — the calibrated trust gate.** Act below 0.469 interval width, refuse above 0.591 — measured percentiles of clean signal, not taste. Error is 0.063 when it says act and 0.115 when it says do not; above 0.591 tasking will not commit an aircraft on the reading alone.
- **all-MiniLM-L6-v2** — sentence encoder, int8, 22.9 MB, 384-dim, over the 161-passage doctrine corpus. Returns verbatim quotes with a similarity score and **declines below its measured floor** rather than returning the least-bad passage; it cannot generate text, therefore it cannot fabricate a citation. The passages are summaries written for this prototype with sources named — not extracts.

**And the claim stronger than either of them: nothing on any screen is generated.** No language model is loaded and no GGUF ships; Ask ANGEL's header reads **NO LANGUAGE MODEL · NOTHING HERE IS GENERATED**, and that is the point rather than a limitation — **a template over the run record cannot hallucinate a casualty count, and a verbatim quote cannot invent doctrine.** Answers are badged `RUN RECORD · COMPUTED, NOT GENERATED`, never in the violet reserved for a model, and a question neither the record nor the corpus answers is refused in words.

**Marked on the face of the screen as NOT machine learning:** the tasking optimiser (deterministic deadline-constrained routing and assignment, contention settled by auction on route value — no weights, same inputs give the same answer every time, objective and constraints inspectable, which is what makes it accreditable); the paired Monte Carlo behind the War Game; the simulation; all four map scales, none fetching from a network; the SQL console; the charts. Two marks, never confused: violet AI naming the model, neutral f(x) saying OPTIMISER or COMPUTED. Doctrine, published physiology and human decisions carry no mark at all, so that the marks mean something.

**Human accountability, kept.** Proposals below the operator-set bar queue for a human on named grounds — LOW CONFIDENCE, THREAT TRANSIT, LAST BLOOD/PLASMA, IMMEDIATE UNASSIGNED — and expire after eight minutes with the expiry logged, because failing to decide is a decision. Reference run: 20 sorties on standing authority, 0 awaiting a human, **3 expired unanswered, carried as a standing `0 / 3 DECIDED` tally until the run is reset rather than left for an after-action report to reveal**. Every entry is hash-chained; altering one character flips the badge to CHAIN BROKEN AT ENTRY *n*, live.

---

## Ask → component → view

*Right-hand column names are the analyst console's (`app/console.html`), which still ships; the design application carries the equivalents.*

| Quoted ask | Component | ML? | View |
|---|---|---|---|
| Via: data "sitting in silos … not purpose-built to achieve outcomes" | CRI-Net reads the waveform; one deterministic solve over deadlines, fleet, stock and threat | Net **yes**, solve **no** | **Sensor & model** · **The fight** · **Analytical console** |
| Via: "into the hands of the providers … medics and corpsmen" | Four role profiles; inference on the soldier's own device, so the medic keeps a number with no link | Edge net **yes**, profiles **no** | Role selector · **Wounded soldiers** · **Reading the pulse** |
| Via: "This is a warfighting function … not just a support function" | Tasking authority deployed into a fight in progress; both arms unaided until Deploy | **No** — deterministic | **Where the fight is** · **The difference** · **Decision log** |
| Caban: "AI-first does not mean AI-only or AI-dependent" | Two-mark provenance convention; every shipped model named with file, size and licence | Both marks | Every marked number · **Model & sources** · **Who decides, and who answers for it** |
| Caban: "human accountability, clinical judgments … preserved" | Trust gate refuses; retrieval declines below a measured floor rather than returning its best guess; human queue on named grounds; hash-chained log | Gate/encoder **yes**, queue/log **no** | **Sensor & model** · **Doctrine retrieval** · **Approvals** · **Decision log** |
| Caban: "retain the human proficiency and fallback" | STANDBY returns both arms to identical unaided logic, logged; every answer surface works with no model present, because none is used | **No** — nothing is generated | Command bar STANDBY · **Ask ANGEL** |
| Via: proactive, not "only treating patients after a devastating diagnosis" | Reserve falls before heart rate and blood pressure move — that lead time is the catch; 2.3x better than rate | **Yes** — CRI-Net | **Sensor & model** · reserve trace on **Wounded soldiers** |
| Via: "not looking for cool capabilities if they can't be operationalized" | Outcome first, then the breakdown, then five levers swept against the shipped engine. More aircraft cannot close the gap — seven tasked on a deadline beat twenty-one tasked on proximity on 92 of 100 identical battles, and the largest remaining cause of death is inert to fleet size. What moves it is basing and who is standing next to the casualty, and those two compound | **No** — statistics, marked COMPUTED | **Evidence** · **War Game** · **Ops Center Wall** |
| Flanders: "our medical system, in that moment, can't blink" | One self-contained binary, 127.0.0.1 only, zero outbound requests, all models local on CPU. Geography ships inside the code — 223,486 bytes of integer deltas in `js/theater3d.js`, not a tile. Telemetry ingest is receive-only and optional; cut it and tasking continues on last-known state | **No** — deployment | Any view with reachback cut · **Sensor & ingest** · **Model & sources** |
| Caban: "The workforce is the one that will transform DHA" | Commander's designation applied after the break-even test; operator-set authorisation bar; a per-soldier record that answers a family in sentences | **No** — human inputs, unmarked | **What to decide** · **Approvals** · **Wounded soldiers** |

---

## Where this sits in what the Department has already bought

**The aircraft are bought; the allocation rule is not.** In May 2026 the 44th Medical Brigade, XVIII Airborne Corps, completed an operational validation of autonomous Class VIII aerial resupply with Soaring M25 aircraft — the aircraft are fielded. The rule that decides which aircraft flies to which casualty is bought by no program in the portfolio: DIU's triage program (25 February 2026) excludes allocation and tasking of evacuation and resupply assets from its scope, allocation is not a category in TATRC's sixteen-project MEDRAS portfolio, and NAVAIR PMA-263's TRUAS flies the mission it is given. The Department has bought every layer around this decision and none of the decision. **ANGEL SWARM is the missing tasking rule for aircraft the Services have already procured: not a new aircraft, not a new command system, not a replacement for anything currently funded.**

- **Below** — NAVAIR PMA-263 fields the TRV-150 through Unmanned Logistics Systems–Air and the USMC TRUAS variant has reached IOC: automated launch, waypoint navigation, automated landing. It flies the mission it is given; we produce the mission it is given, with airframe parameters set at or below published figures for the TRV-150C, M25 and FVR-90.
- **Beside** — DIU's AI-Assisted Triage and Treatment Tool (25 February 2026) buys digital triage, assessment and documentation, **not** allocation or tasking of evacuation and resupply assets; TATRC's MEDRAS portfolio funds autonomous transport, documentation and treatment across sixteen projects, and allocation is not a category in it. We consume what they produce and produce an aircraft assignment.
- **Above** — on 9 March 2026 the Deputy Secretary of Defense made the Maven Smart System a program of record under the CDAO MSS Program Office; the FY27 request funds third-party vendors to field applications on MSS, onboarded through Open DAGIR's OTA mechanism. CDAO's Agent Network (June 2026) is the same architectural object — bounded agents, decision options in seconds, no targeting or strike decisions — and its published use cases do not include medical logistics. **This is an Agent Network-class capability for the medical lane: a lane to be filled, not a program to be displaced.**
- **The DHA lane** — the Operational Medicine Care Delivery Platform (DHMS) integrates with MHS GENESIS, references Joint Trauma System guidance and runs disconnected; our exported resources are shaped for it, and the deadline itself traces to JTS Clinical Practice Guidelines.
- **Policy** — DoD Directive 3000.09 (25 January 2023) ¶1.1.b excludes from its applicability *"unarmed platforms … whether autonomous or semi-autonomous"* and *"autonomous or semi-autonomous systems that are not weapon systems."* We task unarmed aircraft carrying blood; the Directive excludes us on both counts, in its own words. The rulebook that applies is DoDI 8510.01 and the RMF.

**What we do not claim.** CoT is **ingested, not emitted** — receive-only listener, off by default, loopback-bound unless explicitly opened; resources are FHIR-*shaped*, not conformance-tested; **STANAG 4586 is a target interface, not an implemented one**; no Replicator alignment and no Link 16 / VMF / MIL-STD-6017 compatibility is claimed. The allocation mathematics is not novel — what is new is a fielded decision layer with a provenance record on every decision. **"Swarm" here is not attritable strike mass; it is unarmed aircraft carrying blood.**

---

## What is not claimed

Casualties synthetic; no real casualty data used. Physiology modelled, not a patient. CRI-Net trained on synthetic waveforms, and its output does not reach the allocator in this build; real-waveform training, re-measured refusal thresholds and closing that loop are the next steps. The comparison is between two tasking policies inside one simulation, not a field trial. Doctrine passages are summaries with sources named, not extracts. The FHIR-shaped export is **not conformance-tested**, and every one of its 4,151 resources carries that caveat in its own `meta.tag`. The BATDOK-J interface is **accepted, not tested against a real BATDOK-J**. No p-value is claimed over deterministic replications, because it would measure the compute budget rather than the evidence. **Across 1,400 paired battles in seven theatres, 6 produced one more death under ANGEL SWARM — 0.43%, never worse by more than one — and four of the six are in EUCOM FJORD, which still wins on its interval.** Zero preventable deaths is not achievable and is not claimed — but the target is zero, and every number is a person.

The blocking item is not engineering. DoDD 3000.09 does not reach this, for the reason given above — and **no DoD or DHA issuance governs autonomy in triage, casualty prioritisation, or the allocation of scarce medical resources.** GAO found no department-wide DoD guidance for acquiring AI (GAO-23-105850); OMB M-25-21 names *"the allocation of care"* as high-impact AI and then excludes DoD from its scope; and the FDA already regulates time-critical decision software of this class as a device. The looser claim — that 3000.09 simply has no medical equivalent — is refutable on stage, because the DoD AI Ethical Principles of 24 Feb 2020 state expressly that they apply to combat *and non-combat* functions. This prototype implements a candidate accountability pattern — standing authority, named escalation grounds, expiry with a recorded cost, a tamper-evident record — so that there is something concrete for the policy owners to adjudicate.

---

Vice Adm. Via: **"That is the art of the possible, and it is within our grasp."**

**UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY**
