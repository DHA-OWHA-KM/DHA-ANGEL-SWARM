# Physiological-Deadline Blood Support for Emergency Casualties in Distributed Combat Operations

## Getting the right medical materiel to the right casualty in time

**Public use case · NDIA Global Defense Hackathon 2026 · Military Health System / Defense Health Agency combat support**

**UNCLASSIFIED // PUBLIC RELEASE // SYNTHETIC DATA // FOR DEMONSTRATION ONLY**

*Version 6.4 · 8 September 2026*

---

## The requirement, stated by the people who own it

The Joint Trauma System Clinical Practice Guideline *Aerial Delivery of Fresh and Stored Blood Products*, dated 1 December 2025, lists among its unresolved gaps:

> "Dynamic joint entity tracking and allocating blood across battlespace with authority for fast (under 30 min) response, coordination, and delivery."

That is the Joint Trauma System, in a signed clinical practice guideline, naming this problem as an open requirement. It is not our framing but a stated gap in the trauma system of record. This use case is written against that gap.

---

## 1. The operational problem

**The Golden Hour was a promise underwritten by air superiority.** Two decades of trauma care rested on one assumption: a helicopter overhead inside sixty minutes and a surgical facility at the end of the flight. That requires uncontested airspace and short interior lines, and a peer adversary is resourced to deny both. In a distributed maritime fight, small elements sit across hundreds of kilometres of water, the route to the casualty is itself a target, and a rotary-wing evacuation aircraft is slow and predictable in airspace nobody has cleared.

The result is not a slower Golden Hour but a different problem: evacuation planned in hours, and in the worst cases days. The Director of the Armed Services Blood Program stated in June 2026 that evacuation should be expected to be delayed "greater than 72 hours, maybe even longer." Army doctrine writers have described the 72-hour prolonged-care standard as "more aspirational than medically attainable."

**The arithmetic does not close.** Large-scale combat operations planning estimates run to tens of thousands of casualties in the opening days for a corps-sized force. A division's air ambulance company handles about thirty casualties per operational cycle. Role 2 surgical elements hold ten to forty patients and are then full. Evacuation capacity falls short of demand by one to two orders of magnitude, and no realistic buy of airframes closes that gap inside the timelines that decide who lives.

There is one way out:

> **The casualty cannot go to the intervention. The intervention has to go to the casualty.**

**Which makes this a distribution problem against clocks.** Prolonged casualty care means holding a wounded soldier alive, forward, for hours or days, with what is physically present. The interventions that matter then — whole blood, plasma, freeze-dried products, tranexamic acid — are the ones most tightly bound to a clock. CRASH-2 established that tranexamic acid given within three hours of injury reduces death from bleeding, and that the same drug given later increases it. Blood carries a temperature band and a shelf clock. Getting the item there is not the requirement. Getting it there *in time* is.

**And the clock that governs it is not the clock everyone quotes.** The Golden Hour is a Secretary of Defense mandate for *evacuating* a casualty to a treatment facility within sixty minutes, and the outcome analysis behind it is real. It is not a standard for getting blood into a casualty. That standard is in the Department's own clinical guideline and it is shorter: *"early blood product resuscitation, ideally within 36 minutes of injury, provides the lowest early and late mortality rates"* (Joint Trauma System Clinical Practice Guideline ID 18, *Damage Control Resuscitation*, 12 July 2019). A distribution system built to the sixty-minute figure is built to the wrong number by almost half.

**Two different decisions, and neither is made against that clock.** Stock moves forward by *push* — Class VIII resupply configured in advance and positioned against a planner's estimate of what will be needed where, which is what doctrine means by a push package and is reasonable when demand is predictable and transport is cheap. The delivery to an individual casualty is the opposite: it is *pulled*, triggered when that casualty appears, and served by whichever aircraft is closest and free. The push is a forecasting problem. The pull is a tasking problem. This use case is about the second one, and the cost of getting it wrong is a person who bled out waiting for an item that went somewhere else.

---

## 2. Why current practice cannot answer it

None of what follows is a failure of the people doing the work. It is a limit of the information they hold.

**Triage sorts by appearance.** It categorises casualties by how they present at the moment of assessment — the right method for a mass-casualty event with fixed treatment slots at a fixed location, and the wrong shape for a distributed problem where the binding constraint is aircraft-minutes against clocks running at different speeds.

**Appearance lags physiology.** A fit young adult holds normal-looking vital signs while compensating for substantial blood loss, then decompensates abruptly. The category is assigned before the information that would change it exists.

**A category is not a deadline.** "IMMEDIATE" tells a dispatcher that a casualty is urgent. It does not say whether that casualty has eleven minutes or fifty-one — the only fact that decides whether an airframe launched now arrives in time. Current practice does not produce it.

**Nothing closes the loop.** The airframes exist and are programs of record. Casualty detection from uncrewed platforms is a crowded, well-funded field. Aerial blood delivery has validated guidance behind it. Wearable physiological monitoring already reaches the common operating picture. Every component is present, and nothing consumes them together to decide which aircraft goes to which casualty, in what order, carrying what. That decision is made on a radio net, from a triage card, under time pressure, with no record of the reasoning.

---

## 3. The capability gap

Stated as an outcome, not a design:

> **The ability to allocate scarce, time-limited medical materiel and autonomous delivery capacity across a contested, distributed battlespace against each casualty's own physiological clock, fast enough to matter, and to account afterwards for every choice made.**

We have autonomy for taking lives and effectively none for saving them. Swarm tasking frameworks are fielded today for strike, ISR and counter-drone. They have never been applied to medicine.

---

## 4. Who is affected

Each is a real billet with a question no one can answer at speed today.

- **The commander.** What am I deciding, what does it cost the rest of the force, and what happens if I do nothing?
- **The command surgeon.** Who is deteriorating, how fast, and what can realistically be done where they are?
- **The medical logistician.** Will blood be where it is needed, what runs out and when, and what is wasted?
- **The medic or corpsman.** Is help coming, when, and what is on it?
- **The analyst, the accreditor and the investigating officer.** Why was that casualty served before this one, who authorised it, and can it be reconstructed?
- **The family.** A sentence that explains what happened, rather than a shrug about an algorithm.

---

## 5. What a solution must achieve

Outcomes only.

1. **Fewer dead of survivable wounds** than current practice produces from the same casualties, the same aircraft and the same blood. The target is zero. Every number is a person.
2. **Decisions ordered by time remaining**, not by appearance and not by who called first.
3. **Decisions at machine speed, with a human authority who is not the bottleneck.** A system that escalates everything reproduces the dispatcher as the constraint; one that escalates nothing is indefensible. Routine action must proceed under standing authority, escalation must occur on stated and auditable grounds, and failure to decide must itself be recorded with its cost.
4. **It must decide without reachback.** Where communications are contested, a capability that needs a link to the rear before it can decide is absent at the moment it is needed. It must take its readings from the telemetry the force already carries forward, decide locally, and continue on last-known state when reachback drops.
5. **Every decision must be reconstructable and tamper-evident**, sufficient to answer an investigating officer or a family.
6. **It must degrade honestly.** When the information is not good enough to act on, it must say so rather than produce a plausible number.
7. **It must be measurable against current practice on identical inputs**, with that alternative implemented at its strongest, not as a straw man. Doctrine names no rule for deciding which aircraft serves which casualty, so there is no doctrinal comparator to measure against; the comparator has to be built, named for what it does, and given every advantage.
8. **It must report the deaths it did not prevent, and why.**

---

## 5a. Why the obvious answer does not work

The reflexive answer to "casualties are not reached in time" is more aircraft. It has been tested against a modelled battle rather than argued, and it does not hold.

Growing the medical air fleet more than threefold, in the same battle with the same forward launch points, reduced the toll under current practice by three and cost nearly four times the sorties to do it.

**More aircraft do help — and they cannot close the gap.** Swept over a hundred paired battles at five fleet sizes, tripling every airframe count improves the deadline-tasked arm by 1.2 survivable deaths, and it is not worse on a single one of the hundred. But because the extra aircraft are given to **both** arms, growing the fleet moves both and the difference between them survives:

> **Seven airframes tasked on a physiological deadline still beat twenty-one tasked on triage and proximity, by three survivable deaths, on 92 of 100 identical battles.**

And one cause of death does not move at all. The largest single category of remaining survivable death — *nobody on scene who could administer what arrived* — is **12.0 deaths at seven airframes and 12.0 at twenty-one**, identical to two decimal places. It is inert to fleet size. The other deaths that remain are waiting on a launch point that is simply too far away, or are past the limit of prehospital medicine.

The implication for a programme office is worth stating plainly. **The two levers that move this are where the aircraft start from and who is standing next to the casualty when one arrives — and those two compound.** Taking the proportion of responders qualified to give blood from one in ten to five in ten improves both arms monotonically *and widens the gap between them*, from 4.2 fewer dead to 5.4, because a delivery that arrives in time is only worth something if somebody present can give it. Any capability proposed against this gap should be able to show which lever it is buying, and buying airframes is the most expensive of the three.

## 6. Why nobody has done it

The seam has no owner and the policy question is genuinely open.

DoD Directive 3000.09 governs autonomy in weapon systems and expressly excludes "unarmed platforms" and "autonomous or semi-autonomous systems that are not weapon systems." It does not reach an unarmed medical delivery capability. The DoD AI Ethical Principles of 24 February 2020 do apply, expressly to combat and non-combat functions alike, but they are principles, not an issuance that adjudicates a specific decision. **No DoD or DHA issuance governs autonomy in triage, in casualty prioritisation, or in the allocation of scarce medical resources.**

The surrounding record says the same from three directions. GAO found no department-wide DoD guidance for acquiring artificial intelligence (GAO-23-105850). OMB M-25-21 names "the allocation of care" as high-impact AI, then excludes the Department of Defense from its scope. The FDA already regulates time-critical decision software of this class as a medical device. The capability sits between an autonomy directive that does not cover it, a civil AI policy that excludes the department, and a device regime built for a clinic.

That is not a reason to avoid the problem. It is a reason to build something concrete enough to give the policy owners something specific to adjudicate.

---

## 7. Alignment to stated DHA direction

At the 2026 Defense Health Information Technology Symposium, DHA leadership set the direction this work is built against.

Vice Adm. Darin K. Via, Director of the Defense Health Agency:

> "We have the data" … "The struggle is to translate it into knowledge to make timely decisions that give us an advantage. It's sitting in silos … and data repositories, and not purpose-built to achieve outcomes."

> "This is a warfighting function … not just a support function."

> "The specific IT solutions are secondary to the outcomes. We're not looking for cool capabilities if they can't be operationalized."

Dr. Jesus Caban, DHA Chief Data and Analytics Officer:

> "The Department of War's AI strategy is very clear — we will become an AI-first workforce across all domains." … "But AI-first does not mean AI-only or AI-dependent … human accountability, clinical judgments … are preserved in every AI-enabled process, and mission-critical functions retain the human proficiency and fallback."

Pat Flanders, DHA Chief Information Officer:

> "When a wounded warrior is evacuated from a contested battlefield … our medical system, in that moment, can't blink. They have to work. It's a promise to the warfighter."

The gap in this document is the one DHA leadership named: data that already reaches the force, in a warfighting function, with nothing acting on it in time.

Source for every quotation above: Robert Hammer, "Data, technology, people vital for warfighter health advantage, says Defense Health Agency director," Defense Health Agency Communications, 13 August 2026, reporting DHITS 2026.

---

**UNCLASSIFIED // PUBLIC RELEASE // SYNTHETIC DATA // FOR DEMONSTRATION ONLY**

*All casualties referenced are synthetic. All physiology is modelled. No real casualty data was used.*

*Priority record. The complete internal use case, from which this release is derived, has SHA-256 `cc9ac1ae86efa96f2fe7afd6ef99fde4ecaf3aed293fcd75a744f2f912305ada` as of 8 September 2026. That document has since been revised; the current internal use case is `ANGEL-SWARM-use-case.md` in the same package and the digest above no longer matches it.*

*Revised 8 September 2026 against the shipped v6.4 build.*
