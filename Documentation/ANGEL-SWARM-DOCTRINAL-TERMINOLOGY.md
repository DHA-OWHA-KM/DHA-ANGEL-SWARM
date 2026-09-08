# Doctrinal terminology audit

**ANGEL SWARM — Version 1.0 · 5 September 2026.** First issued 26 August 2026; adoption record added 4 September 2026; occurrence counts re-measured against the shipped build on 5 September 2026, and re-measured again the same day after the analyst console was swept — see §4a.
Prepared for a terminology overhaul of the solution, its documents and its film.
**This document is authoritative for naming across the application, every
shipped document and both films.** §4a records what was actually adopted, and
where the adopted term differs from the first recommendation, §4a wins.

Every term below is tagged with the publication that defines it. Where a term
could not be verified against a primary source it is listed in §7 and must not
be asserted.

---

## 1. The direct answer

**There is a doctrinal phrase for what ANGEL SWARM does. There is no doctrinal
phrase for what it replaces — because doctrine does not name that.**

The capability:

> **"emergency movement of Class VIII, blood, and blood products"**
> — ATP 4-02.2, *Medical Evacuation*, 12 July 2019, Ch 2 Sec IV

This is a **named MEDEVAC primary task**, not a coined phrase. ATP 4-02.2
Table 1-1 lists the task as *"Emergency movement of medical personnel,
equipment, and supplies"*, purpose *"Provide a rapid response for the emergency
movement of scarce medical resources throughout an operational environment."*
Chapter 1 states it plainly:

> "In addition to evacuating patients and providing en route medical care,
> MEDEVAC resources provide for the emergency movement of scarce medical
> resources such as critical Class VIII, blood, medical personnel, and medical
> equipment."

Army medical logistics doctrine carries the same idea from the supply side:
*"Coordinates for emergency delivery of Class VIII supplies"* — ATP 4-02.1,
*Army Medical Logistics*, 29 October 2015, paras 2-6 and 2-18.

---

## 2. "Class VIII push" is wrong, and it is wrong in the inverting direction

A push is **anticipatory**. It is preconfigured, scheduled, sent before anyone
asks, and it exists specifically as a *substitute* for requisitioning:

> "Requests for Class VIII items at Echelons I, II, and attached forward
> surgical teams in the division is initially provided by preconfigured push
> packages until line item requisition procedures can be established."
> — JP 4-02.1, 6 October 1997, Ch II, p. II-8

> "During the initial employment phase, each FSMC receives a preconfigured
> push-package every 48 hours from the supporting MEDLOG company."
> — FM 4-02.1, 28 September 2001, para 4-8a

> "Preplanned packages of selected supplies are sent forward to replenish
> expended supplies in anticipation of requirements of supported units."
> — FM 63-20, Ch 7 (the clearest push/pull contrast in Army text)

ANGEL SWARM's control arm does the opposite. `optimizer.js` sorts open
casualties by triage category, sends the nearest available aircraft to the
highest category first, and chains the next-nearest casualties onto the same
sortie. It is triggered by a casualty on the board. That is request-driven —
doctrinally a **pull**, not a push.

The code's own header comment has been accurate the whole time —
*"triage-derived evacuation precedence + nearest-available dispatch"* — and the
function is named `allocateCurrentMethod`. Only the on-screen label says push.

**Blast radius, as found at the time of the audit:** 76 occurrences of "Class
VIII push", 36 of "CLASS VIII PUSH", 10 of "doctrinal push" across
`index.html`, `js/` and `angel-engine.js`.

**As shipped at v6.4, re-counted on 5 September 2026:** across `index.html`,
`js/` and `angel-engine.js` there are **zero** occurrences of "Class VIII push"
in any casing, and **one** of "doctrinal push" — inside a copilot input-matching
regular expression, so that a judge who types the old phrase is still
understood. It is not a label on any screen. `CURRENT — TRIAGE & PROXIMITY`
appears 54 times across the same files. **The standalone analyst console
`app/console.html` was swept on 5 September 2026 and is now zero as well**, which
closes the last user-visible gap. See §4a for where the old phrase legitimately
survives.

---

## 3. The finding that should change the pitch

**Doctrine names no assignment rule.** Two independent doctrinal sweeps — joint
and Army — looked specifically for a term naming the algorithm by which a
medical asset is matched to a casualty, and found none.

What doctrine *does* provide:

- the **function** — *medical regulating*: "The actions and coordination
  necessary to arrange for the movement of patients through the roles of care
  and to match patients with an MTF that has the necessary HSS capabilities and
  available bed space." (JP 4-02, 11 Dec 2017 w/ Ch 1, Glossary) — **patients
  and bed space only; it does not cover materiel**
- the **organisation** — the patient evacuation coordination cell (PECC) at the
  tactical level; the USTRANSCOM PM requirements center at the operational
  level (JP 4-02, II-5)
- the **support relationship** — *area support*: "support relationships are
  determined by the location of the units requiring support" (ATP 4-02.2, Ch 1
  Sec II). Geographic, not nearest-asset.
- the **inputs** — evacuation precedence, medical rules of eligibility, MTF
  capability
- the **request format** — the 9-line MEDEVAC request (ATP 4-02.2, App C)
- the **authorities** — the brigade/division surgeon validates medical mission
  validity; the aviation commander holds launch authority

Then it stops. The decision rule itself is left to unit SOP and is nowhere
given a name in any JP, ATP or FM examined.

The operations-research literature confirms this by having to *construct* the
baseline rather than cite it. DTIC AD1133454 describes the current practice as
a *"myopic policy, which tasks the closest-available MEDEVAC unit to service an
incoming request"* — and attributes it to no publication. Jenkins, Robbins &
Lunday (*Annals of Operations Research* 271:641–678, 2018) evaluate *"three
practitioner-friendly myopic policies"* because none is doctrinally specified.

**This is the strongest honest claim available to the solution.** ANGEL SWARM is
not competing with a named doctrinal method; it is naming and formalising a
decision that doctrine has left unnamed. Say that, and it is both accurate and
more impressive than beating a "push" that was never the comparator.

There is a second, corroborating gap. DTIC AD1088639, *Autonomous Unmanned
Aerial Vehicles for Blood Delivery*: *"the Joint medical community currently
lacks a framework to assess the potential utility of autonomous UAVs for their
missions."*

---

## 4. Correction map

| On screen now | Status | Replace with | Authority |
|---|---|---|---|
| CLASS VIII PUSH (the control arm) | **Wrong — inverted meaning** | ~~EVACUATION PRECEDENCE~~ → **CURRENT — TRIAGE & PROXIMITY** (see §4a) | ATP 4-02.2, 12 Jul 2019, Table 2-1 |
| "the doctrinal push" | **Wrong** | "the current method" / "precedence and proximity" | — (doctrine names no rule; see §3) |
| Class VIII (for blood) | **Imprecise** | **Class VIIIB** | DoDI 5101.15, eff. 29 Sep 2023, Sec 1.1 |
| "cold chain" (85 occurrences) | **Not doctrinal vocabulary** | "1–6 °C storage requirement"; the container is the **Golden Hour Container** | Not found in DoDI 6480.04, AFI 44-105, ATP 4-02.1, FM 4-02.1, JTS CPG 21, JTS CPG 82 |
| Golden Hour (as capability authority) | **Misapplied** | Keep as *problem framing only* — it is a 60-minute **evacuation** mandate | 2009 SecDef mandate, via Kotwal, *JAMA Surg* 2016;151(1):15–24 |
| CRI | **Product term, not the Army term** | **CRM — Compensatory Reserve Measurement** for the physiology; keep CRI only when naming the FDA-cleared device | Convertino et al., *Mil Med* 2025;190(Suppl 2):371–378 |
| "nobody could administer" | **Sound, but do not attribute the gate to rank or MOS** | Gate is the **Unit Medical Director** under local protocol | JTS CPG ID 82, 30 Oct 2020 |

### 4a. What was actually adopted, and why one recommendation was overruled

**THE CONTROL ARM IS `CURRENT — TRIAGE & PROXIMITY`.** That string, in those
words, in that order, everywhere: the application, every shipped document,
both films, and the presenter's script. It is the name to use.

The first recommendation above was **EVACUATION PRECEDENCE**, and it was
overruled deliberately. Evacuation precedence is a real doctrinal term with a
real definition, and that is exactly the problem: it names a category assigned
to a *patient for movement*, not the rule that decides which aircraft serves
which casualty. Borrowing it for the control arm would have swapped one
inverted borrowing for another and invited the objection *"that is not what
evacuation precedence means"*. The two-part name says what the arm does —
sorts by triage category, then by who is nearest — and claims no doctrinal
pedigree it does not have.

**The honest framing, which is also the stronger one.** Doctrine names the
function — *medical regulating*, which covers patients and bed space rather
than materiel (JP 4-02). It names the cell that performs it, the evacuation
precedence categories (ATP 4-02.2, Table 2-1), the nine-line request format
and the launch authority. **It does not name the rule that decides which
aircraft serves which casualty**; that is left to unit standing operating
procedure. So the opening claim is not "ANGEL SWARM replaces the doctrinal
rule of nearest available airframe" — there is no such rule — but *"rather
than against the nearest available airframe and a best guess at who needs it
most, which is the practice everywhere today and which no doctrine actually
names."* That is both accurate and harder to argue with.

**The other adoptions, as shipped:**

| Adopted | Not | Note |
|---|---|---|
| `CURRENT — TRIAGE & PROXIMITY` | "Class VIII push", "the doctrinal push", "EVACUATION PRECEDENCE" | **The sweep is now complete across every presented surface.** In the **design application** (`app/index.html`, `app/design.html`, `app/js/`, `angel-engine.js`) the phrase is gone: zero occurrences. In the **standalone analyst console `app/console.html`** it is now also gone: the seven occurrences recorded in v6.4 — six as `CLASS VIII PUSH` on panel and card headings, one in running text — were corrected on 5 September 2026, and `grep -ic "class viii push" app/console.html` returns **0**. In the **shipped documents** the phrase survives only where it is deliberate: the sentences that explain the correction itself, in this document and in the use case's line that this is *not* a push. One occurrence remains in the codebase, in a **prose code comment** at `app/angel-map.js:1399` — narrative text inside a `/* */` block explaining deployment ordering, not a string the application ever renders. It is the only one left and it is not user-visible. Verified 5 September 2026 |
| **Class VIIIB** for blood and blood products | bare "Class VIII" | DoDI 5101.15 |
| **NO FORWARD DELIVERY** for the third arm | "do nothing", "the null arm" | It models no intervention reaching the casualty inside the 180-minute window; it does **not** claim evacuation never arrives, and it does not claim everyone dies |
| **36 minutes, JTS CPG ID 18** as the blood standard | the Golden Hour | The Golden Hour is kept as **problem framing only** — a 60-minute *evacuation* mandate. A distribution system built to the sixty-minute figure is built to the wrong number by almost half |
| **BATTLE / SETTING** on the War Game screen | "seed" | "Seed" is a modeller's word on a screen a commander uses to choose a force posture. It survives elsewhere — Evidence, Settings, the run-complete stamp — deliberately |
| **"fewer dead"** | "lives saved" | The target is zero. Every number is a person |
| **PACOM** | USINDOPACOM, INDOPACOM | House style, applied without exception |
| **"no dependency on enterprise reachback to decide"** | "air-gapped" | "Air-gapped" described a prototype limitation as though it were a design goal, and it could not survive the obvious question of how a reading from a monitor on a casualty ever reaches the tasking layer. **Do not say "air-gapped" on stage.** The precise claim is the stronger one: nothing in the application originates an outbound request — measured, not asserted — and the tasking layer decides locally and continues on last-known state when reachback drops |
| **"canvas-2D globe"** | "deck.gl globe", "WebGL globe", "3D globe" | `GlobeView` is not in the vendored deck.gl bundle. The globe is canvas 2D, holds no GPU context, and its geography is embedded in `js/theater3d.js` rather than fetched |
| **"NO LANGUAGE MODEL · NOTHING HERE IS GENERATED"** | "the model drafts the answer" | No GGUF ships. Nothing on any screen is generated |

---

### Definitions to adopt verbatim

**Class VIIIA** — "Medical consumable supplies not including blood and blood
products." (DoDD 5101.09E, 29 Sep 2015 w/ Ch 2)

**Class VIIIB** — "blood and blood components (e.g., whole blood, platelets,
plasma, packed red cells)." (DoDI 5101.15, eff. 29 Sep 2023)

**Evacuation precedence** (ATP 4-02.2, 12 Jul 2019, Table 2-1) —

| Category | Standard |
|---|---|
| Priority I — URGENT | "within a maximum of one hour" |
| Priority IA — URGENT-SURG | within one hour, requiring far forward surgical intervention |
| Priority II — PRIORITY | "within four hours" |
| Priority III — ROUTINE | "within 24 hours" |
| Priority IV — CONVENIENCE | no standard |

Note: this is formally *evacuation* precedence — assigned to a patient for
movement, not to a delivery request. If ANGEL SWARM reuses the names, it must
say it is extending them.

**Health Service Support (HSS)** is the correct umbrella — its components are
"casualty management, PM, medical treatment (organic and area support),
MEDEVAC, hospitalization, MEDLOG, blood management, and health information
management" (JP 4-02, 2017, II-1). Force Health Protection is the wrong branch;
it covers prevention.

**Unit distribution** — "a method of distributing supplies by which the
receiving unit is issued supplies in its own area, with transportation
furnished by the issuing agency." (ATP 4-11, 5 Jul 2013, para 1-16). This is the
correct distribution-method label for an aircraft flying supplies *to* the unit.

**Emergency requisitions** — "All emergency requests received by the MEDLOG
company are processed immediately for shipment by the most expedient
transportation available." (FM 4-02.1, 28 Sep 2001, para 4-11)

---

## 5. The recommended terminology stack

> **Emergency movement of Class VIIIB (blood and blood products)**, initiated by
> an **emergency requisition**, delivered by **unit distribution**, in support
> of an **URGENT (Priority I)** casualty, within the **one-hour** standard.

Every element of that sentence traces to a primary source in §4.

Two numbers strengthen the thesis considerably, and both are better than the
golden hour for this argument:

- **Time to blood, not time to transport.** JTS Clinical Practice Guideline,
  *Damage Control Resuscitation*, CPG ID 18, 12 Jul 2019: *"early blood product
  resuscitation (ideally within 36 minutes of injury) provides the lowest early
  and late mortality rates."* Thirty-six minutes is a blood-specific standard
  from DoD's own guideline, and it is shorter than the sixty-minute evacuation
  mandate. It is the number the deadline argument should rest on.

- **The size of the prize.** Eastridge et al., *J Trauma Acute Care Surg*
  2012;73(6 Suppl 5):S431–S437: *"24.3% (n = 976) were deemed potentially
  survivable"* and *"The injury/physiologic focus of PS acute mortality was
  largely associated with hemorrhage (90.9%)."*

And one that supports the sensor: the Army's 2024 Warfighter Expeditionary
Experiment field test of CRM reported a *"93% success rate for correct ordering
of casualty triage"*, with haemorrhaging casualties identified *"more than 16
minutes prior to the onset of decompensated shock despite the presence of
normal vital signs"* (Convertino et al., *Mil Med* 2025).

---

## 6. What must not be claimed

- **Do not call the capability MEDEVAC or CASEVAC.** Both move the casualty
  *away* from the point of injury. Wrong vector.
- **Do not use *medical regulating* for materiel.** Its definition is explicitly
  patient- and bed-space-scoped.
- **Do not present RDCR as DoD doctrine.** *Remote Damage Control
  Resuscitation* is a THOR Network / academic term (Jenkins et al., *Shock*
  2014). The doctrinal noun is **prehospital blood transfusion** — the literal
  title of JTS CPG ID 82.
- **Do not present "speedball" as doctrine.** It appears undefined and
  parenthetically in JTS CPG ID 91 (*"Blood resupply/Speedball"*) and in no ATP
  or FM.
- **Do not present "platinum ten minutes" as US military doctrine.** Civilian
  EMS lineage; absent from TCCC guidelines and JTS CPGs.
- **Do not state that blood administration requires TCCC Tier 3 or above.** No
  verbatim doctrinal rule was found. JTS CPG ID 82's scope explicitly includes
  *"non-medical personnel (e.g., flight medic, crew chief...)"*. The real gate is
  the Unit Medical Director under local protocol — which means "can administer"
  is a *local* property, not a fixed property of a role. The model simplifies
  here and should say so.
- **Do not describe CRM/CRI as fielded or accepted.** Honest wording: *an
  FDA-cleared, USAISR-developed monitoring technology under active Army field
  evaluation*. It appears in no JTS CPG and not in the TCCC Guidelines of
  01 May 2026, whose shock trigger remains *"altered mental status in the
  absence of brain injury and/or weak or absent radial pulse."*
- **The FDA clearance is narrow.** 510(k) K173929, CipherOx CRI M1, Flashback
  Technologies, 24 July 2018 — indicated for *"adults (19-36 years old) in the
  supine position under non-motion conditions and without cardiovascular
  disease."*
- **TCCC's first phase is now "Care Under Fire/Threat"**, per the TCCC
  Guidelines of 01 May 2026. Plain "Care Under Fire" is dated.

---

## 7. Not verified — do not assert without checking

1. **The current DoD Dictionary.** JEL+ is CAC-gated; every public mirror found
   was 2017 or older. Cite JP 4-02 directly rather than the Dictionary.
2. **FM 4-02 (November 2020)** and **FM 4-0 (March 2026)** — armypubs blocked
   automated retrieval. Army Health System principles above are cited from
   FM 4-02 (26 Aug 2013) and ATTP 4-02 (7 Oct 2011). Verify current wording.
3. **ATP 4-02.2 Appendix C, Table C-1** — title and location confirmed, text
   not retrieved. The 9-line content above comes from Army training task
   081-831-0101, which states URGENT = 2 hrs where ATP 4-02.2 Table 2-1 states
   1 hour. **Use the ATP figure.**
4. **Whether the current ATP 4-02.1 (2015) still uses "push"/"pull".** That
   language is confirmed in JP 4-02.1 (1997) and FM 4-02.1 (2001); it was not
   found in the retrievable portions of the 2015 rewrite.
5. **The 2009 SecDef golden-hour memorandum** — text not obtained. Cite Kotwal
   2016. The attribution specifically to Secretary Gates is unconfirmed.
6. **Shackelford et al., *JAMA* 2017;318(16):1581–1591** — the 36-minute figure
   is verified from JTS CPG ID 18 quoting it, not from the paper itself.
7. **"Emergency resupply"** is not a formally defined Army term; it appears only
   in running text.
8. **ASBP Operational Procedures** (TM 8-227-12 / NAVMED P-5123 / AFI 44-118) —
   militaryblood.dod.mil blocked automated retrieval. Likely the fullest ASBP
   glossary and worth a manual look.
9. **JTS DCR CPG date** — the JTS CPG Index of 31 Jul 2026 says 12 Jul 2019; one
   search result suggested a 29 Aug 2023 update. Unresolved.

---

## 8. Primary sources

ATP 4-02.2, *Medical Evacuation*, 12 Jul 2019 · ATP 4-02.1, *Army Medical
Logistics*, 29 Oct 2015 · ATP 4-11, 5 Jul 2013 · ATP 4-02.3, Jun 2014 ·
FM 4-02.1, 28 Sep 2001 and 8 Dec 2009 · FM 4-02, 26 Aug 2013 · FM 4-0,
14 Aug 2024 · JP 4-02, *Joint Health Services*, 11 Dec 2017 w/ Ch 1
28 Sep 2018 · JP 4-02, *Health Service Support*, 26 Jul 2012 · JP 4-02.1,
6 Oct 1997 · AFDP 4-02, 12 Nov 2019 · DoDD 5101.09E, 29 Sep 2015 w/ Ch 2 ·
DoDI 5101.15, eff. 29 Sep 2023 · DoDI 6480.04, 7 Jan 2022 w/ Ch 1 · AFI 44-105,
10 Jan 2019 · JTS CPG ID 18 *Damage Control Resuscitation*, 12 Jul 2019 · JTS
CPG ID 21 *Whole Blood Transfusion*, 15 May 2018 · JTS CPG ID 82 *Prehospital
Blood Transfusion*, 30 Oct 2020 · JTS CPG ID 91 *Prolonged Casualty Care*,
21 Dec 2021 · TCCC Guidelines, 01 May 2026 (CoTCCC) · Kotwal et al., *JAMA
Surg* 2016;151(1):15–24 · Eastridge et al., *J Trauma Acute Care Surg*
2012;73(6 Suppl 5) · Convertino et al., *Mil Med* 2025;190(Suppl 2):371–378 ·
Jenkins et al., *Shock* 2014;41 Suppl 1:3–12 · Jenkins, Robbins & Lunday, *Ann
Oper Res* 2018;271:641–678 · FDA 510(k) K173929, 24 Jul 2018 · DTIC AD1133454 ·
DTIC AD1088639
