# ANGEL SWARM against the DHA ask

## Alignment of a functional prototype with the direction set by DHA leadership at DHITS 2026

**NDIA Global Defense Hackathon 2026 · Military Health System / Defense Health Agency Combat Support**

**UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY**

*Version 6.5 · 5 September 2026*

**Source for every quotation in this document:** Robert Hammer, Defense Health Agency Communications, "Data, technology, people vital for warfighter health advantage, says Defense Health Agency director," Aug. 13, 2026. https://dha.mil/News/2026/08/14/14/56/Data-technology-people-vital-for-warfighter — reporting the 2026 Defense Health Information Technology Symposium, Aug. 11, New Orleans, Louisiana.

---

## The claim, for a judge who reads only this section

At DHITS 2026 the Director of the Defense Health Agency, Vice Adm. Darin K. Via, presented under the theme "From Data to Dominance: Forging a Warfighter Health Advantage" and named the problem precisely: "We have the data" … "The struggle is to translate it into knowledge to make timely decisions that give us an advantage. It's sitting in silos … and data repositories, and not purpose-built to achieve outcomes."

ANGEL SWARM is one instance of that translation, built end to end and running. It reads a physiological signal that already reaches the force, turns it into a number a scheduler can use — how many minutes this wounded soldier has before their body stops compensating — and then decides which autonomous resupply aircraft flies to which casualty, in what order, carrying what. **The trained network that reads the waveform demonstrates that the signal is learnable; it is not the source of the deadlines the tasking runs on in this build, and §3.1 says so plainly.** In the reference run of the shipped prototype (joint operations area CORAL, PACOM, seed 42, 125 casualties, 180 minutes) it ended the engagement with 23 dead of medically survivable wounds against 34 for the current triage and proximity baseline on the same casualty stream, the same aircraft and the same blood. Eleven fewer dead. The target is zero.

It is AI-driven in the specific sense DHA's Chief Data and Analytics Officer, Dr. Jesus Caban, set out — "The Department of War's AI strategy is very clear — we will become an AI-first workforce across all domains." … "But AI-first does not mean AI-only or AI-dependent" — and it is built to be inspected on that point rather than trusted on it. **Two sets of learned weights ship in the folder — `models/ppg_cri.onnx` and `models/minilm/minilm.onnx` — and neither reaches a tasking decision.** The tasking optimiser itself is deterministic constrained scheduling and is marked on the face of the screen as **not machine learning**, because a reviewer who works that out for himself has been handed a reason to disbelieve the parts that are true.

It is positioned to be subsumed into architectures the Department has already bought — an application on the Maven Smart System third-party layer, a medical-logistics agent inside an Agent Network-style framework, a tasking service behind a ground control station, and a data producer into the DHA clinical lane — rather than to stand alone or to displace anything currently funded; **§9** states each of those seams and the boundaries on them.

The prototype runs with no dependency on enterprise reachback, from a folder, on a laptop, with no install and no network. The casualties are synthetic and the physiology is a model. What is real is the tasking logic, the trained network that reads the physiology, the decision record, and the arithmetic of the comparison.

---

## Compact mapping: the ask, the component, the view

| The ask, as stated at DHITS 2026 | What in ANGEL SWARM answers it | Machine learning? | Where a judge sees it |
|---|---|---|---|
| Via: data "sitting in silos … and data repositories, and not purpose-built to achieve outcomes" | CRI-Net turns a raw pulse waveform into a compensatory-reserve estimate and its own interval; the optimiser consumes deadlines, fleet state and forward stock in one solve. **The two are not yet joined — §3.1** | CRI-Net: **yes**. The solve: **no** — deterministic | **Sensor & model** · **The fight** · **Analytical console** |
| Via: "put this information into the hands of the providers, in the hands of medics and corpsmen" | Four role profiles — Commander, Logistician, Surgeon, Analyst — switched from the command bar with no reload; inference runs on the soldier's own device so the medic keeps a number with no link | CRI-Net at the edge: **yes**. The profiles: **no** — interface composition | Role selector in the command bar · **Wounded soldiers** · **Reading the pulse** (Surgeon's name for **Sensor & model**) |
| Via: "This is a warfighting function … not just a support function" | Tasking authority is deployed into a fight in progress; both arms run unaided until a human presses Deploy, and the switch is logged | Optimiser: **no** — deterministic scheduling, marked as such | **Where the fight is** · **The fight** · **The difference** · **Decision log** |
| Caban: "AI-first does not mean AI-only or AI-dependent" | Two-mark provenance convention: the violet AI mark names the model that produced a number; the neutral f(x) mark says OPTIMISER or COMPUTED and makes no model claim | Both marks, by construction | Every marked number in the application · **Model & sources** · **Who decides, and who answers for it** |
| Caban: "human accountability, clinical judgments … are preserved in every AI-enabled process" | CRI-Net's uncertainty head refuses above 0.591 interval width; doctrine retrieval declines below its measured floor rather than returning the least-bad passage; proposals queue for a named human on named grounds; the log is hash-chained | Trust gate: **yes**. Encoder: **yes**. Queue and log: **no** | **Sensor & model** (live trust line) · **Doctrine retrieval** · **Approvals** · **Decision log** |
| Caban: "mission-critical functions retain the human proficiency and fallback" | STANDBY from the command bar returns both arms to identical unaided logic; no language model is loaded and no GGUF ships, so every answer surface already works with none present | **No** — nothing anywhere is generated | Command bar STANDBY · **Ask ANGEL** · **Model & sources** |
| Via: a proactive system that catches illness "instead of only treating patients after a devastating diagnosis" | Compensatory reserve falls before heart rate and blood pressure move; that lead time is the proactive catch, and held-out error is 0.069 against 0.159 for heart rate alone | CRI-Net: **yes** | **Sensor & model** · reserve trace and predicted collapse on **Wounded soldiers** |
| Via: "the specific IT solutions are secondary to the outcomes. We're not looking for cool capabilities if they can't be operationalized" | The outcome is the headline and the breakdown underneath it is published: only 1 of the remaining 23 survivable deaths changes if you buy more aircraft | Monte Carlo and sensitivity: **no** — statistics, marked COMPUTED | **The difference** · **Evidence** · **How much is the seed?** · **What it costs** |
| Flanders: "our medical system, in that moment, can't blink" | One self-contained binary per platform, serving on 127.0.0.1 only, with zero outbound requests at runtime. The single optional inbound path is a receive-only CoT telemetry listener, off unless started with `-cot`. Cut the feed and the tasking layer keeps deciding on last-known state | **No** — deployment engineering, and models run locally on CPU | Any view, with reachback cut · **Sensor & ingest** (link state, device count) · **Model & sources** (file paths and sizes) |
| Caban: "Technology alone will not transform DHA. The workforce is the one that will transform DHA" | The console is built for a staff officer's judgement: commander's designation, the standing-authorisation bar, and a per-soldier record that answers a family in sentences | Designation and bar: **no** — human inputs, deliberately unmarked | **What to decide** · **Approvals** · **Wounded soldiers** · **Who decides, and who answers for it** |

---

## 1. Data trapped in silos, turned into knowledge at the point of need

**The ask.** Vice Adm. Darin K. Via, director of the Defense Health Agency:

> "We have the data" … "The struggle is to translate it into knowledge to make timely decisions that give us an advantage. It's sitting in silos … and data repositories, and not purpose-built to achieve outcomes."

And on where that knowledge has to land:

> "We need to put it all together. We need to put this information into the hands of the providers, in the hands of medics and corpsmen … and every medical professional who touches a patient."

**What ANGEL SWARM does.** Wearable physiological monitoring already reaches the commander's common operating picture. Nothing acts on it. ANGEL SWARM is the layer that acts on it.

CRI-Net reads five seconds of photoplethysmogram at 100 Hz and emits compensatory reserve — how much bleeding the casualty can still tolerate before they crash — together with its own variance. That estimate is converted into a time-to-decompensation with a stated uncertainty. A triage category tells a dispatcher that someone is urgent. It does not say whether that person has eleven minutes or fifty-one, which is the only fact that decides whether an aircraft launched now arrives in time. The conversion from waveform to deadline is the silo-to-knowledge step, and the network's half of it happens in 0.8 ms on a CPU. **Stated before it is asked: in this build the deadlines the tasking actually runs on come from the scenario's own physiology model, not from CRI-Net. Closing that loop is named as the second of the next steps. §3.1 has the detail.**

The knowledge then reaches a decision in the same program rather than in a different system. The tasking optimiser solves against every open deadline, the current fleet, the current forward Class VIII stock and the current threat picture at once. It is worth being precise about what the optimiser is: deadline-constrained multi-stop routing and assignment, re-solved every few seconds, contention between aircraft settled by auction on total route value. **That is deterministic software, not machine learning.** It has no weights and nothing about it was learned, the same inputs give the same answer every time, and its objective and constraints are written down and inspectable. That property is what makes it accreditable, and it is why the application marks it OPTIMISER and not AI.

**Where a judge sees it.** **Sensor & model** shows the live waveform, the network's estimate, its interval and its latency. **The fight** shows deadlines running against aircraft in flight. **Analytical console** is an in-browser columnar database over 11 tables of the run's own data, both arms under a discriminator, with a SQL editor — the silo opened, queryable, exportable to a file from **Export the database**.

---

## 2. "This is a warfighting function … not just a support function"

**The ask.** Vice Adm. Via said DHA must capture, move, and protect data faster, and turn it into useful knowledge at the point of need:

> "This is a warfighting function … not just a support function."

He also framed why:

> "Warfare is changing fast" — with artificial intelligence, drones, unmanned aerial vehicles, and sensor saturation. "The character of warfare is shifting under our feet, and health IT isn't on the sidelines of that shift — it's part of it."

Pat Flanders, DHA chief information officer, described the symposium's focus as how DHA is "transforming data, technology, and people into decisive combat support advantage through innovation and modernization," and stressed that DHA is building a resilient digital health enterprise designed to enable readiness rather than simply support it.

**What ANGEL SWARM does.** It is a tasking layer, not a dashboard. It emits dispatch orders under standing authority. Swarm tasking frameworks exist today for strike, ISR and counter-drone; they have never been applied to medicine. We have autonomy for taking lives and none for saving them. ANGEL SWARM is the missing half.

The prototype makes the warfighting-function claim testable rather than rhetorical. It starts NOT DEPLOYED, on purpose, because a capability like this gets deployed into a fight already in progress. Both arms run current triage and proximity — what is done today, implemented fairly with the same fleet, stock, casualty stream and multi-stop routing — until a human presses Deploy and hands tasking authority to the system. From that moment the two arms separate, and the separation is the whole argument. If the operator never deploys, the death toll is identical in both arms; that is correct behaviour, not a defect.

Enabling readiness rather than supporting it shows up in what the tool produces as a by-product. It now carries **five levers on a War Game screen** — fleet size, launch points, datalink outage, triage error and responder qualification — each swept as a paired Monte Carlo against the shipped engine, and **each applied to the shared world so that it moves the force for both arms**. There is no no-drones arm on that screen and nothing there measures whether unmanned lift works; what it measures is how much of the result is the tasking decision and how much of it survives a worse world.

Varying launch points from one to three moves the mean paired difference from 1.33 to 4.23 fewer dead. **Fleet size is not inert** — an earlier version of this document said so and it was wrong: tripling every airframe count improves the deadline-tasked arm by 1.2 survivable deaths across a hundred paired battles, worse on none of them. But because the lever moves both arms, **seven airframes tasked on a physiological deadline still beat twenty-one tasked on triage and proximity, by 3.0 survivable deaths, on 92 of 100 identical battles.**

The lever that moves the result furthest is **responder qualification**, and it is the one a programme office is least likely to have costed. Taking the proportion on scene who can give blood from one in ten to five in ten improves both arms monotonically **and widens the gap between them, from 4.2 to 5.4**: a delivery that arrives in time is only worth something if somebody present can give it. **Forward positioning and trained receivers compound.** That is a force-design finding, generated because the tool can run the counterfactual at all, and it points procurement at basing and at training rather than at buying more airframes.

**Where a judge sees it.** **Where the fight is** to pick an operation and send the drones. Deploy in the command bar. **The fight** for the live picture. **The difference** for the two arms side by side. **Evidence** for the sensitivity sweeps and the requirement analysis. **Decision log** records the moment authority changed hands, because the switch itself is logged.

---

## 3. AI-first, but not AI-only and not AI-dependent — the strongest match

**The ask.** DHA Chief Data and Analytics Officer Dr. Jesus Caban:

> "The Department of War's AI strategy is very clear — we will become an AI-first workforce across all domains." … "But AI-first does not mean AI-only or AI-dependent … human accountability, clinical judgments, security, privacy, and mission continuity are preserved in every AI-enabled process, and mission-critical functions retain the human proficiency and fallback."

Caban recognised how AI can bring bold, forward-looking solutions to modern military medicine, and stressed that it should empower IT healthcare professionals and not replace decision-making.

**What ANGEL SWARM does.** This is the ask the prototype was designed against, and it is answered in five separate mechanisms. All five are visible on screen.

### 3.1 Two marks, and they are not allowed to be confused with each other

The application marks provenance on the face of the screen. The authoritative statement of the convention lives in the code, in the `PROV` object:

> "THE AI MARK — violet, a filled network glyph, the word AI, and the name of the model that produced the number. It is used for exactly four things … and each of them is a set of learned weights that ships in this folder."
>
> "THE DETERMINISTIC MARK — neutral, an f(x) glyph, the words NOT AI and then the kind of arithmetic — SCHEDULING, GEOMETRY, REPLICATED TRIAL, HASH CHAIN. No colour claim at all, because there is no model. Ten of the twelve entries below are this, and between them they cover every calculation the application performs."

And on why an earlier, looser convention was wrong:

> "The previous version of this convention put the word AI on all three senses — LEARNED, AUTONOMOUS and DERIVED — which meant the badge appeared on the constrained scheduler and on ordinary aggregation. Both of those are good engineering and neither is machine learning, and a reviewer who works that out for himself has been given a reason to disbelieve the parts that are true. … Nothing that is not a trained model carries the AI mark anywhere in this application."

Anything unmarked is fixed doctrine, published physiology, or a human decision, left unmarked deliberately so that the marks mean something. Triage categories, the TCCC scope of practice, the 1–10 °C transfusable band, the three-hour tranexamic acid window and every commander designation are not machine learning and carry no mark.

**Counted, because the comment above says "four" and the folder says two.** The `PROV` table carries four AI marks — CRI-Net, its trust gate, the doctrine encoder, and one for a language model. **Two model files ship: `models/ppg_cri.onnx` (419,797 bytes) and `models/minilm/minilm.onnx` (22,898,176 bytes).** Three of the four marks resolve to those two files; the fourth resolves to weights that are **not in this package**, and it is not drawn when they are absent. **So: two sets of learned weights ship in this build, and neither steers an aircraft.**

| Component | What it is | What it is allowed to decide |
|---|---|---|
| **CRI-Net** | 1-D convolutional network, 104,162 parameters, trained from scratch for this prototype, ONNX Runtime Web on CPU | Estimates compensatory reserve from a pulse waveform, with its own calibrated interval. **Its output does not reach the allocator in this build**, and the application says so on its own Sensor & Model screen — see below. |
| **CRI-Net's uncertainty head** | The second output of the same network — a calibrated variance, not a confidence heuristic bolted on afterwards | Decides when the network declines to be trusted. Act below 0.469 interval width, refuse above 0.591; MAE 0.063 when it says act, 0.115 when it says do not. |
| **all-MiniLM-L6-v2** | 6-layer sentence transformer, int8, 22.9 MB, 384 dimensions, encoder only | Ranks the 161-passage doctrine corpus by cosine similarity and re-ranks at sentence level, in the analyst console. **It cannot generate text**, which is why it cannot invent a citation. |

**A precision this document previously got wrong, and it is the kind a judge checks.** CRI-Net does *not* produce the deadlines the tasking runs on. The deadlines come from the scenario's own physiology model; CRI-Net's estimate is a demonstration that the physiological signal is learnable, and closing the loop from it to the allocator is named in this package as the second of three things to do next. Claiming a tighter integration than exists would not survive one question, and the honest version is still a strong claim: **the only learned quantity anywhere near this system is one a human can refuse, and it is not steering an aircraft today.**

**No language model is loaded and none ships.** No GGUF is in the package. Nothing on any screen is generated by a language model, and the Ask ANGEL header says exactly that: **NO LANGUAGE MODEL · NOTHING HERE IS GENERATED.** Its run answers are computed from the run's own record and badged `RUN RECORD · COMPUTED, NOT GENERATED`; its doctrine answers are quoted verbatim. A `wllama` runtime ships and an operator may supply their own weights, but nothing in the delivered build exercises that path, and no material describing this product should say prose is drafted by a model.

The large pieces that are named, on the same page, as **not** machine learning: the tasking optimiser (`js/optimizer.js`), the paired Monte Carlo (`js/montecarlo.js`, `js/mc.worker.js`), the simulation with its maps and charts, and the SQL console. **No large language model is involved anywhere, and none is involved in the tasking path least of all.**

### 3.2 The model refuses

CRI-Net's uncertainty head is the clinically load-bearing part. Thresholds were measured on 8,000 fresh windows, not chosen:

- Interval width below **0.469** — act. Tasking may commit an aircraft on the reading.
- Between 0.469 and **0.591** — hold at lower confidence and prefer corroboration.
- Above 0.591 — refuse. Tasking will not commit an aircraft on the reading alone.

Those two boundaries are the 75th and 97th percentiles of interval width on genuinely clean signal. The gate earns its keep because the two populations differ: mean absolute error is **0.063** when the network says act and **0.115** when it says do not. It refuses 3% of clean signal and 13% of degraded signal. A model that refuses is more useful on a shaking casualty in a moving vehicle than a model that is confidently wrong 13% of the time.

When the signal is bad the casualty's record says SIGNAL POOR — READING UNRELIABLE rather than showing a plausible number, because a plausible-looking value on a casualty who is visibly bleeding is the failure mode that gets someone killed.

### 3.3 The retrieval declines

Doctrine retrieval returns verbatim sentences with a similarity score. Below 0.35 similarity it reports that the corpus does not cover the question rather than returning the least-bad passage. It has no ability to generate text, which is precisely why it cannot invent a citation — every word it returns is already in the corpus.

Stated plainly, because it matters: the 161 passages are summaries written for this prototype with their source publications named. **They are not extracts from those publications.** That disclaimer is displayed on screen against every quotation, and operational use requires the actual publication. A known defect is shown rather than hidden: one test query ranks the correct passage 40th.

### 3.4 A human authorises, and hesitation is recorded

A single confidence threshold is a poor authorisation rule. It either escalates everything, reproducing the human dispatcher as the constraint, or it escalates nothing, which is indefensible. ANGEL SWARM implements standing authority for routine resupply with escalation on named, auditable grounds:

| Escalation ground | Meaning |
|---|---|
| **LOW CONFIDENCE** | Modelled benefit falls below the standing-authorisation bar, which the operator sets. |
| **THREAT TRANSIT** | The routing crosses a known air-defence envelope. The loss probability is stated on the proposal. |
| **LAST BLOOD / LAST PLASMA** | The sortie would take a launch point to zero units of a scarce blood product. |
| **IMMEDIATE UNASSIGNED** | It serves a lower-precedence casualty while an IMMEDIATE inside that aircraft's radius has no aircraft assigned. |

Escalated proposals expire after eight minutes of simulated time, and expiry is written to the log as an event with its own timestamp, because failing to decide is a decision. In the reference run: 20 sorties launched on standing authority, 0 left awaiting a human at end of run, and 3 expired unanswered. Those three are three tasking decisions that did not happen, and they are in the record.

### 3.5 The record is tamper-evident

Every proposal, escalation, approval, rejection, hold, delivery, waste and policy change is written to a hash-chained audit log. Each entry chains over the previous hash plus its own payload. The chain is verified on every render. Altering one character of one entry flips the badge from CHAIN INTACT to CHAIN BROKEN AT ENTRY *n*, live, on screen. The log exports to CSV.

For any soldier, the record names the aircraft that went, where it came from, when it arrived against their predicted collapse, the physiological reading it acted on and how old that reading was — and every other aircraft in the force with the specific reason it was not the answer. The answer to a family is a sentence like "the nearest aircraft that could carry blood was 47 km away against a 34 km radius at that load," not a shrug about an algorithm.

**The fallback Caban asked for.** STANDBY from the command bar returns both arms to identical unaided logic, and the switch is logged. **No language model ships and none is loaded — there is no GGUF in the package** — so the module withdraws its own pane and its own rail entry, and the AI mark for it is not drawn anywhere in the application. Everything else works unchanged. That is not a fallback that has been designed and left untested; it is the only state this build has ever run in.

**Where a judge sees it.** **Model & sources** for the complete inventory — every model's size, inputs, outputs, validation set, licence and file path, read from the models' own metadata at render time so the page cannot drift from what actually loaded. **Who decides, and who answers for it** for the accountability argument in the product rather than in a briefing. **Sensor & model** for the live trust line, repainted four times a second from the network's own interval. **Doctrine retrieval** for the refusal at 0.35. **Approvals** for the queue and the named grounds. **Decision log** for the chain and its verification badge. Pressing any provenance mark opens the inventory at that entry.

---

## 4. Information into the hands of medics, corpsmen and providers

**The ask.** Vice Adm. Via:

> "We need to put it all together. We need to put this information into the hands of the providers, in the hands of medics and corpsmen … and every medical professional who touches a patient" — to ensure medical warrior currency.

Rear Adm. Tracy Farrill, director, Office of Warfighter Health Advantage:

> "Our Office of Warfighter Health Advantage will serve as DHA's lead for data-driven decision-making, performance optimization, and innovation." … "We've assembled a corps of experts to include strategy, data and analytics, health informatics, and digital platforms with the goal of increased, cross-functional collaboration to ensure synergy across planning, development, and execution."

**What ANGEL SWARM does.** The prototype ships four role profiles, selected from the command bar, switching instantly with no reload. They map onto the staff functions Farrill named.

- **Commander — decision support.** What do I decide, what does it cost, and what happens if I do nothing? Five screens: the one decision outstanding, the map, the difference between the two methods, the approvals queue, and what it costs. This is also where commander's intent enters the system: high-value duty role designation, the autonomy policy, and the standing-authorisation bar.
- **Logistician — the supply chain.** Will I have blood where it is needed, and what am I wasting? Forward Class VIII stock at each launch point for both arms, burn rates, projected time to blood stockout, cold-chain state per container, fleet readiness, launch-point coverage and resupply timing.
- **Surgeon — medical operations.** Who is deteriorating, and who on scene is qualified to treat them? The Command Surgeon is a real staff billet and the natural owner of the clinical half of the tool: casualty state and physiological deadlines, the compensatory reserve trace for an individual casualty with the model's own stated uncertainty, responder capability on scene, telemedicine and remote supervision policy, and the clinical constraints the optimiser is enforcing.
- **Analyst — everything.** Do I believe any of this? The full instrument, including the hash-chained log with chain verification on screen, Kaplan-Meier survival curves with right-censoring, the Monte Carlo workbench, and a SQL console over the run's own data.

The other three profiles are compositions, not amputations: every capability remains reachable from Analyst.

For the medic and the corpsman specifically, the architecture matters more than the interface. CRI-Net inference runs on the soldier's own end-user device, so **the medic on scene keeps a live number even with no link**. The tasking system receives a burst on zone change or on a fixed cadence. When the link is down, readings buffer on the soldier's device and the casualty's record says how many are held. Telemetry age is displayed per unit, so outside the relay footprint the commander's picture ages visibly rather than silently.

And the finding the Surgeon profile owns is the one that speaks directly to medical warrior currency: in the reference run, the largest single cause of survivable death was not aircraft availability. Ten of the 23 were people **nobody on scene was qualified to treat**. That is a training and scope-of-practice problem, and the tool quantifies what fixing it would be worth before anyone commits to one answer.

**Where a judge sees it.** The role selector in the command bar; flipping from Commander to Analyst mid-sentence is itself part of the demonstration. **Wounded soldiers** for the per-casualty record and its device panel. **Reading the pulse** — the Surgeon's name for **Sensor & model**. **Units & overwatch drone** for responder capability and remote supervision policy. **Drone reports** — the Logistician's and Surgeon's name for **Ground truth stream** — for what actually happened on the ground.

---

## 5. Proactive rather than reactive medicine

**The ask.** Vice Adm. Via envisioned a proactive healthcare system that uses technology to catch and prevent serious illnesses instead of only treating patients after a devastating diagnosis. Tools like precision treatments, genetic testing, early detection assessments and tests, and the use of nanotech, he said, will be the standard of "the most advanced healthcare system of the future." He added:

> "That is the art of the possible, and it is within our grasp."

**What ANGEL SWARM does.** In trauma, reactive means acting when the vital signs move. By then the compensation has already failed. The application states the mechanism plainly on the casualty's own record:

> "Reserve falls before heart rate and blood pressure move, which is what buys the lead time."

That lead time is the proactive catch, and it is measurable. A fit young adult holds normal-looking vital signs while compensating for substantial blood loss, then decompensates without warning — so the triage category is assigned before the information that would change it exists. CRI-Net reads morphology rather than rate, and the comparison that decides whether reading the waveform was worth doing is held-out mean absolute error **0.069 against 0.159 for heart rate alone**, on 70 subjects who appear in no training window. The split is by person, not by sample.

Why 2.3x better than rate matters clinically rather than statistically: roughly a seventh of subjects are chronotropic non-responders or paradoxical, and a further sixth are blunted, mirroring beta blockade, high vagal tone and the paradoxical bradycardia of severe haemorrhage. A rate-based rule misclassifies exactly the people it most needs to catch.

The network mirrors the operating principle of CipherOx CRM, FDA 510(k) K173929. It is not that device and makes no claim to be. It is trained on synthetic waveforms, and the next step is not a bigger network — it is the same architecture and the same calibrated trust gate trained and validated on real waveform data from instrumented human subjects, with the refusal thresholds re-measured on that data. The training and calibration code ships so that this is a re-run rather than a rewrite.

**Where a judge sees it.** **Sensor & model** for the live waveform, the estimate, the interval and the trust line. **Wounded soldiers** for a named casualty's reserve trace, predicted collapse, trend in percent per minute, and waveform quality. The tactical map encodes time-to-deadline in the pulse period of the casualty symbol, so a screen full of soldiers reads as a screen full of clocks.

---

## 6. Outcomes over cool capabilities, and it must be operationalisable

**The ask.** Vice Adm. Via, on acquisition:

> "We're making changes in how we acquire products and services; and I want our industry partners to know that the specific IT solutions are secondary to the outcomes. We're not looking for cool capabilities if they can't be operationalized."

He said DHA will be "soliciting commercial solution offerings with a more rapid process." And on the standard:

> "If we want to call ourselves the premier health system in the world, we need to back it up with integrated systems that are incomparable in using technology to gain a warfighter advantage."

**What ANGEL SWARM does.** It leads with an outcome and then publishes the arithmetic that would let a sceptic take it apart.

| Outcome, reference run | ANGEL SWARM | CURRENT — TRIAGE & PROXIMITY |
|---|---|---|
| Died of survivable wounds | **23** | **34** |
| Died, all triage categories | 31 | 42 |

Eleven fewer dead of survivable wounds. The target is zero.

The baseline is implemented favourably rather than as a straw man: it gets the same fleet, the same stock, the same casualty stream and the same multi-stop routing, and in fair mode it also gets perfect triage classification, which no human achieves. Common random numbers are used, so the same random draw decides a given casualty's fate in both arms and the measured difference is attributable to the tasking decision rather than to sampling luck. The only difference between the two arms is judgment.

Beyond one run: **200 paired replications in each of the seven theatres the engine carries, 1,400 in total.** In the reference theatre the mean paired difference is **4.905 fewer dead**, 95% interval **4.595 to 5.215**, and **0 of 200** replications were worse.

> **ANGEL SWARM wins all seven theatres. Every 95% interval excludes zero. Across 1,400 paired battles it produced more dead in 6 — 0.43% — and never by more than one.**

**No p-value is claimed, deliberately** — the replications come from a deterministic program that can be run as many times as compute allows, so a p-value over them would measure the compute budget rather than the strength of the evidence.

**Reported rather than smoothed over:** the weakest theatre is EUCOM FJORD, a compressed laydown where distance stops discriminating between casualties, so a deadline sort has less to work with. It still wins — mean −1.865, interval −2.045 … −1.685, better on 173 of 200 — and it holds four of the six adverse battles anywhere. Seed 42 in FJORD is one of them. One battle is not a theatre; the full table is `ANGEL-SWARM-WIN-PROBABILITY-v5.9.md` and `winprob.mjs` re-derives it.

**And the engine asserts its own reference result rather than having it asserted in a slide.** `app/selftest.html` ships in the package and runs 118 assertions against the shipped engine, in the browser, offline, nothing mocked — determinism and common random numbers, the reference result, the conservation invariants, the deadline arithmetic, the SHA-256 audit chain and its tamper-evidence, and all seven theatres. **118 pass, in 861 ms.**

The Monte Carlo, the sensitivity sweeps and every aggregate on these pages are marked COMPUTED, not AI. They are statistics over the run's own transactional log. No model is involved.

The part that speaks directly to "secondary to the outcomes" is the breakdown of the 23 who still died:

| Cause | Count |
|---|---|
| Nobody on scene qualified to administer what they needed | 10 |
| No launch point within reach | 9 |
| Reached in time and died anyway | 3 |
| Every aircraft committed elsewhere | 1 |

**Only one of the 23 changes if you buy more aircraft.** Ten are a training and scope-of-practice problem. Nine are a basing and forward-positioning problem. Three are the limit of prehospital medicine. Reach is the structural constraint underneath: 27 of 125 casualties were reachable by one aircraft or by none at all. An optimiser that cannot fix the dominant cause of death in its own reference run should say so, and this one does.

On operationalisability, the honest position is that the blocking item is not engineering. DoD Directive 3000.09 applies only to weapon systems and expressly excludes *"unarmed platforms"* and *"autonomous or semi-autonomous systems that are not weapon systems"*, so it does not reach this. **No DoD or DHA issuance governs autonomy in triage, casualty prioritisation, or the allocation of scarce medical resources.** GAO found no department-wide DoD guidance for acquiring AI (GAO-23-105850); OMB M-25-21 names *"the allocation of care"* as high-impact AI and then excludes DoD from its scope; and the FDA already regulates time-critical decision software of this class as a device. The looser claim — that 3000.09 simply has no medical equivalent — is refutable on stage, because the DoD AI Ethical Principles of 24 Feb 2020 state expressly that they apply to combat *and non-combat* functions. ANGEL SWARM implements a candidate accountability pattern — standing authority, named escalation grounds, expiry with a recorded cost, and a tamper-evident decision record — precisely so there is something concrete to adjudicate. No amount of engineering substitutes for that adjudication, and the tool says so on screen.

The cheapest and highest-value next step needs no new technology at all: the launch-points-dominate finding is a force-design study that can be run today, in this tool, against real theatre geometry and real basing options.

**Where a judge sees it.** **The difference** for the two arms. **How much is the seed?** for the 200 replications, the confidence interval, and the count of replications where the system did worse — that last number being the one worth knowing. **Evidence** for the requirement analysis, the sensitivity sweeps and the floor. **What it costs** for the trade. **The case beyond lives** for the second-order argument. **Casualty flow** for a fixed-layout Sankey that is byte-identical between runs so the two arms compare directly, with a Kaplan-Meier curve and a deadline-versus-arrival scatter.

---

## 7. "Can't blink" — resilience on a contested battlefield

**The ask.** Pat Flanders, DHA chief information officer:

> "When a wounded warrior is evacuated from a contested battlefield … our medical system, in that moment, can't blink. They have to work. It's a promise to the warfighter."

**What ANGEL SWARM does.** It has no network dependency to lose.

- Four platform launchers — Windows x64, macOS Apple Silicon, macOS Intel, Linux x64 — each a single self-contained binary. Double-click. That is the whole install.
- The launcher serves the application on the loopback interface only, binding 127.0.0.1, with an additional loopback check on every request. **Nothing in the application originates an outbound request.** This is asserted in automated verification, not assumed. Telemetry ingest is the one inbound path, and it is off unless the launcher is started with `-cot`; it binds 127.0.0.1 unless `-cot-external` is also passed, it is receive-only, and it never replies to a sender. A judge can verify the posture by cutting reachback mid-run: the ingest chip falls to LINK DOWN and the tasking layer keeps deciding on last-known state.
- Both shipped models run locally on the CPU. CRI-Net through ONNX Runtime Web at 0.8 ms; the sentence encoder through ONNX Runtime Web, full corpus search in 6.9 ms. **No language model ships and none is loaded.** There are no content delivery networks and no default model hosts in any code path.
- Nothing is fetched at any of the four map scales — GLOBE, THEATRE, TACTICAL 2D, TACTICAL 3D. Coastlines and international boundaries ship inside the build: the globe's own world outline is **223,486 bytes of integer deltas embedded in `js/theater3d.js`**, 34,416 vertices across 1,380 coast rings and 174 boundary runs, rather than a file or a tile. The relief beneath them is computed at runtime and labelled on the map's own face as shading rather than elevation. The globe is **canvas 2D and orthographic — it holds no GPU context**, because deck.gl's `GlobeView` is not in the vendored bundle and rebuilding that bundle would have risked the two views that work.
- No administrator rights. Nothing written outside the folder. Delete the folder and nothing remains. Verified from the packaged folder: **thirteen destinations populated, 0 uncaught page errors, 0 off-origin requests**, at two viewport sizes and in all four map modes.

Inside the simulated fight, degraded operations are modelled rather than assumed away. On a communications outage ANGEL SWARM holds its last-known-good plan and keeps flying, while voice-dispatched tasking simply stops. Telemetry age is displayed per unit so a stale picture ages visibly. Where hardware acceleration for the 3-D map is absent, the view is removed rather than shown broken.

This posture is not incidental. A medical tasking tool that a surgeon, a planner or a judge cannot open without an account, a network and an accreditation is a tool that does not get evaluated. This one opens on a laptop on an aircraft.

**Where a judge sees it.** Any view, with the network cable out. **Model & sources** lists the file path and byte size of every model in the folder. **Ground truth stream** shows the communications outage events and the re-taskings they caused.

---

## 8. The workforce, not the technology alone

**The ask.** DHA Chief Data and Analytics Officer Dr. Jesus Caban:

> "We can provide the best technology up there, the best models out there. Technology alone will not transform DHA. The workforce is the one that will transform DHA."

Vice Adm. Via, on the standard he holds the enterprise to:

> "This is what we mean when we talk about a warfighter health advantage. I believe the Military Health System can be the most advanced health system in the world, and my interest is in taking actions every day that move us in that direction."

> "We have an obligation … to be on the front edge of medicine."

**What ANGEL SWARM does.** It is built for a staff officer's judgement, not as a replacement for it. Three design decisions carry that.

**Commander's intent is a first-class input.** Under mission analysis a commander decides, before contact, which capabilities the mission cannot replace inside the fight. Designating those duty roles — or an individual soldier — gives that casualty first claim on an airframe. The priority weight is applied **after** the clinical break-even test, so a designation changes who is served first and can never manufacture a sortie that was not worth flying. The trade is explicit, it is paid out of the rest of the queue, it is reversible, and it is logged with the time it was made. CURRENT — TRIAGE & PROXIMITY sequences by triage category and then by who is nearest, and has nowhere to record a mission-critical duty role at all. A commander's designation is a human decision and carries no AI mark.

**The authorisation bar is the operator's to set.** The standing-authorisation threshold, the autonomy policy and the human-in-the-loop setting are controls, not constants. The system does not tell the commander how much autonomy to delegate; it makes the consequence of the choice visible and writes both the choice and its consequences down.

**The tool is designed to survive scepticism, because that is what a professional workforce brings to it.** The Analyst profile exists because the correct response to a claim like "eleven fewer dead" is disbelief. So the raw casualty register, the decision log with live chain verification, the SQL console and the exportable database are all in the product. The limits are printed alongside the results: the casualties are synthetic and no real casualty data was used to build the system; the physiology is a model, not a patient; the comparison is between two tasking policies inside one model of the world, not a field trial; reaching a casualty before their deadline is not the same as saving them, and the 3 who were reached in time and died anyway are a real category.

What the workforce keeps is the part that was never the machine's. What ANGEL SWARM decides is the order in which aircraft are dispatched when there are more casualties than there is capacity to serve, and what each aircraft carries given who is standing next to each casualty. That is the whole of it. It does not choose who lives, it does not withhold treatment, and it does not rank people by worth, rank or unit. It decides who is reached first, and every casualty it can reach with something usable, it reaches.

And the trade it orders is being made right now, on a radio net, by a dispatcher working from a triage card with no physiological deadline, no knowledge of who is standing next to the casualty, and no written record of the reasoning. ANGEL SWARM does not introduce the trade-off. It orders it by evidence instead of by who called first, and it writes down why. That is more accountability than the current process produces, not less.

**Where a judge sees it.** **What to decide** for the Commander's one outstanding decision. **Approvals** for the queue, the named grounds and the expiries. **Who decides, and who answers for it** for the accountability argument, including the row that names the missing policy. **Wounded soldiers** for the per-soldier record and every aircraft in the force with the specific reason it was not the answer. **Settings** for the autonomy policy and the authorisation bar.

---

## 9. Where this sits in what the Department has already bought

**BLUF.** In May 2026 the 44th Medical Brigade, XVIII Airborne Corps, completed an operational validation of autonomous Class VIII aerial resupply using Soaring M25 aircraft. The aircraft are autonomous and fielded. The rule that decides which aircraft flies to which casualty is bought by no program in the portfolio: DIU's AI-Assisted Triage and Treatment Tool (25 February 2026, PROJ00628) states its scope as triage, assessment and documentation and does not buy allocation or tasking of evacuation and resupply assets; TATRC's MEDRAS portfolio funds autonomous transport, documentation and treatment across sixteen projects, and allocation is not a category in it; NAVAIR PMA-263's TRUAS performs automated launch, waypoint navigation, automated landing and payload release — it flies the mission it is given. The Department has bought, fielded and made permanent every layer around the decision this system makes, and has bought none of that decision. ANGEL SWARM is the missing tasking rule for aircraft the Services have already procured. It is not a new aircraft, not a new command system, and not a replacement for anything currently funded.

### 9.1 The clinical lane — DHA already owns the record of truth

This is the seam this agency owns, so it is stated first.

The Operational Medicine Care Delivery Platform, owned by Defense Healthcare Management Systems, integrates with MHS GENESIS, references Joint Trauma System guidance, and is built to run disconnected and intermittent. This system's exported casualty and decision resources are shaped for that lane. The physiological deadline itself traces to Joint Trauma System Clinical Practice Guidelines, which is what makes "deadline" a clinical term rather than a product term.

### 9.2 The layer below — the airframes already exist and already fly themselves

NAVAIR PMA-263 fields the TRV-150 through the Unmanned Logistics Systems–Air line; the Marine Corps TRUAS variant has reached initial operational capability. Its published behaviour is automated launch, waypoint navigation, automated landing and payload release. It flies the mission it is given. ANGEL SWARM produces the mission it is given. Those are two different problems and only one of them has a program.

This system's airframe parameters are set **at or below** published performance figures for the TRV-150C, the Soaring M25 and the FVR-90. It does not assume a better aircraft than the one that exists.

### 9.3 The layer beside — the sensing and documentation layer is being competed now

DIU announced the AI-Assisted Triage and Treatment Tool on 25 February 2026. Its stated scope is digital triage, patient assessment and documentation, replacing an analog paper process. It does not buy allocation or tasking of evacuation and resupply assets. ANGEL SWARM consumes what that program produces and produces an aircraft assignment. Two adjacent buys, zero overlap.

TATRC's MEDRAS portfolio funds autonomous **transport** (including just-in-time whole blood delivery by UAS), autonomous **documentation** and autonomous **treatment** across sixteen projects. Allocation is not a category in that portfolio. ANGEL SWARM tasks those transport programs; it does not duplicate them.

Project Crimson demonstrated refrigerated FVR-90 whole-blood delivery to field medics at Project Convergence 2022, with BATDOK carrying patient data at the medic edge. That is prior art this work builds on, and it is four years old.

### 9.4 The layer above — the host is already designated

On 9 March 2026 the Deputy Secretary of Defense designated the Maven Smart System a program of record and moved its administration to the CDAO MSS Program Office. The FY27 request funds third-party vendors to develop and field applications on MSS. ANGEL SWARM is an application for that pipeline, not a parallel command-and-control system. Open DAGIR's OTA mechanism is the named path by which an outside capability is onboarded to that application layer without owning the data beneath it.

CDAO's Agent Network, announced June 2026, is architecturally the same object as this system: bounded agents that deliver decision options to a commander in seconds and make no targeting or strike decisions. Its published operating partners are EUCOM, INDOPACOM and SOUTHCOM, and its published use cases do not include medical logistics. **ANGEL SWARM is an Agent Network-class capability for the medical lane.** Stated plainly, that is a lane to be filled, not a program to be displaced.

### 9.5 Policy — this is an RMF question, not an autonomy-in-weapons question

DoD Directive 3000.09 (25 January 2023), paragraph 1.1.b, excludes from its applicability *"unarmed platforms, whether remotely operated or operated by onboard personnel, and whether autonomous or semi-autonomous,"* and *"autonomous or semi-autonomous systems that are not weapon systems."* This system tasks unarmed aircraft carrying blood. The Directive excludes it on both counts, in its own words. The rulebook that does apply is DoDI 8510.01 and the Risk Management Framework, and that assessment is written down in the security annex rather than asserted here.

### 9.6 How it is subsumed, concretely

1. **As an application on the MSS third-party layer,** onboarded through the Open DAGIR OTA mechanism. It contributes a decision surface; it does not stand up a data environment.
2. **As the medical-logistics lane inside an Agent Network-style agent framework** — the same bounded-agent contract, human on the loop, no strike authority.
3. **As a tasking service behind an existing ground control station.** The assignment this system produces is a mission for a specific airframe; STANAG 4586 is the correct NATO interface for handing it to the control station that already flies that airframe. That is the target interface, not an implemented one, and is stated here as an integration path rather than a capability.
4. **As a data producer into the DHA clinical lane,** by exporting casualty and decision resources shaped to the same standard the operational medicine platform and MHS GENESIS consume.

### 9.7 What is deliberately NOT claimed about any of this

Honest boundaries, stated here so no reviewer has to find them. They are about where this system sits; the boundaries on what it measures are in **What is not claimed**, below.

- **CoT is ingested, not emitted.** The telemetry listener is receive-only, off by default, and bound to loopback unless explicitly opened. This system consumes the Cursor on Target feed a joint operations area already produces; it adds a track consumer, not a new interface. An emit path is the obvious next step and is not claimed today.
- **The exported health resources are FHIR-shaped, not conformance-tested,** and every exported resource carries that tag. The word "compliant" is not used anywhere.
- **STANAG 4586 is a target interface, not an implemented one.**
- **No Replicator alignment is claimed.** Replicator 1 and 2 scope is attritable combat autonomy and counter-UAS. Medical logistics is not in either, and claiming the lineage would be an unforced error.
- **No Link 16, VMF or MIL-STD-6017 compatibility is claimed.** Those are platform-to-platform tactical data links for track and fires. A medical-logistics decision layer has no business asserting them.
- **The allocation mathematics is not claimed as novel.** Published academic work addresses military medical evacuation dispatching and redeployment directly. What is offered here is a fielded decision layer with a provenance record attached to every decision — which is what the published work does not provide.
- **"Swarm" here does not mean attritable strike mass.** It is a fleet of unarmed logistics aircraft carrying blood.

---

## What is not claimed

Stated here so that what is claimed can be trusted.

- **The casualties are synthetic.** No real casualty data is in this system and none was used to build it. The generator ships and is inspectable.
- **The physiology is a model, not a patient.** Deterioration, response to intervention and time-to-decompensation are modelled from published survival relationships, with the parameters and their sources listed in the tool.
- **CRI-Net is trained on synthetic waveforms.** Real-waveform training and re-measured refusal thresholds are the next step, not a completed one.
- **The comparison is internal.** Both arms are implementations inside the same simulation. The measured difference is between two tasking policies inside one model of the world. It is not evidence about how either policy performs against reality.
- **The doctrine passages are summaries written for this prototype**, with their source publications named. They are not extracts. Operational use requires the actual publication.
- **Zero is not achievable and the system does not claim it.** Treat every survivable casualty one minute after injury with exactly the right product and a residue still dies — that is the ceiling of the treatment, not of the tasking. Any system promising zero preventable deaths is misrepresenting what medicine can do. The target is still zero, and every number in this document is a person.

---

## Closing

Vice Adm. Via set the bar: "If we want to call ourselves the premier health system in the world, we need to back it up with integrated systems that are incomparable in using technology to gain a warfighter advantage." He also said what he did not want: "We're not looking for cool capabilities if they can't be operationalized."

ANGEL SWARM answers both by being narrow and finishable. It does one thing — decide which autonomous medical resupply aircraft flies to which casualty, in what order, carrying what — using a deterministic and inspectable optimiser with **no trained network in the decision path at all**, a trained network alongside it that reads the physiology and a calibrated refusal on that network, a retrieval that quotes and cannot fabricate, a named human authority, and a tamper-evident record. It runs from a folder on a laptop with no dependency on enterprise reachback to decide. It reports the deaths it did not prevent and the reasons, including the finding that only one of them would have been prevented by more aircraft.

Twenty-three dead of survivable wounds against thirty-four. Eleven fewer dead. The target is zero.

---

**UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY**

*All casualties referenced are synthetic. All physiology is modelled. All figures are measured from the shipped prototype and reproducible from the stated seed. All quotations of DHA leadership are from Robert Hammer, "Data, technology, people vital for warfighter health advantage, says Defense Health Agency director," Defense Health Agency Communications, Aug. 13, 2026, reporting the 2026 Defense Health Information Technology Symposium.*
