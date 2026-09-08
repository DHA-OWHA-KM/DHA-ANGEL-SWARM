# ANGEL SWARM — Complement, Not Compete: Landscape as of 5 September 2026

Research conducted 5 Sep 2026. Every claim below carries a URL and a date. Anything
I could not source is marked **UNVERIFIED** and must not be spoken.

**Terminology warning before anything else.** Executive Order 14347 (5 Sep 2025) makes
"Department of War" a **secondary designation only**. Section 2(e): "Statutory references
to the Department of Defense, Secretary of Defense, and subordinate officers and components
shall remain controlling until changed subsequently by the law." So "DoD" is still legally
correct, "Department of War" is correct in non-statutory usage, and the January 2026 AI
strategy is formally titled *Artificial Intelligence Strategy for the Department of War*.
Use the document's own name when citing it. Do not "correct" a judge who says DoD.

---

## A. BLUF

The Department has now bought, fielded and made permanent every layer **around** the
decision ANGEL SWARM makes, and has bought none of that decision. Below it, autonomous
medical resupply is fielded and validated: the 44th Medical Brigade (XVIII Airborne Corps)
completed an operational validation of autonomous Class VIII aerial resupply with Soaring
M25 aircraft in May 2026, and NAVAIR PMA-263 is fielding the TRV-150 TRUAS through the
Unmanned Logistics Systems–Air line. Beside it, the sensing and documentation layer is
being competed right now: DIU's *AI-Assisted Triage and Treatment Tool* (announced
25 Feb 2026, PROJ00628) explicitly buys digital triage and patient assessment and
explicitly does **not** buy allocation or tasking of evacuation and resupply assets.
Above it, the command-and-control host became a program of record on 9 March 2026, when
Deputy Secretary Feinberg's memo *Maven and Combined JADC2 in the AI Era* designated the
Maven Smart System a POR and moved its administration to the CDAO MSS Program Office —
with the FY27 request seeking over $2B for CJADC2 and explicitly funding "third party
vendors to develop and field applications on MSS." And the nearest thing to a competitor,
CDAO's *Agent Network* Pace-Setting Project (announced June 2026), is a decision-support
agent framework that delivers "decision options to commanders within seconds," makes no
targeting or strike decisions, and — in every public description — says nothing about
logistics or medical. **ANGEL SWARM is the medical-logistics agent that Agent Network does
not have, riding the MSS application layer that DoD has already decided to fund for third
parties, consuming the triage data DIU is buying, and tasking the airframes PMA-263 and the
44th Medical Brigade have already validated — the one thing none of those programs bought is
the rule that decides which airframe flies to which casualty and when, and today that rule is
a soldier with a whiteboard.**

The strongest single sentence the evidence supports:

> *When the 44th Medical Brigade validated autonomous medical resupply in May 2026, it proved
> the mission is real and the aircraft are fielded. The rule that decides which aircraft flies
> to which casualty is bought by no program in the portfolio — DIU's triage program, TATRC's
> MEDRAS portfolio and NAVAIR's PMA-263 each place allocation outside their own stated scope.
> ANGEL SWARM is that missing rule, not a new aircraft and not a new command system.*

> **CORRECTION, 5 September 2026 — read this before reusing any sentence from this file.**
> An earlier version of this BLUF read "the aircraft were autonomous and the tasking was
> manual — soldiers were trained to 'manually operate the systems.'" That is a
> MISATTRIBUTION. army.mil 292841 (27 May 2026) says soldiers learned "how to manually
> operate the systems," which is about flying the aircraft by hand. It is not a statement
> about who decides which aircraft goes to which casualty. The 44th Medical Brigade
> validation may be cited only as proof that the mission is real and the aircraft are
> fielded. The allocation claim rests on the three scope statements above and nowhere else.

---

## B. The seams

| Program / standard | Status (as of Sep 2026) | The named seam ANGEL SWARM plugs into | Source + date |
|---|---|---|---|
| **Maven Smart System (MSS)** | **Program of record**, designated 9 Mar 2026 by DepSec Feinberg memo *Maven and Combined JADC2 in the AI Era*. Admin moved NGA → CDAO MSS Program Office within 30 days; USD(R&E) is authorizing official; new MSS program director appointed Aug 2026. | **The MSS third-party application layer.** The FY27 budget funds "third party vendors to develop and field applications on MSS" through a DevSecOps pipeline. ANGEL SWARM is an application on that pipeline, not a parallel C2 system. This is the single best seam. | [memo PDF](https://img.jangomail.com/2576619/Attachments/Maven%20and%20Combined%20JADC2%20in%20the%20AI%20era.pdf) 9 Mar 2026; [DefenseScoop](https://defensescoop.com/2026/04/03/palantir-maven-feinberg-directive/) 3 Apr 2026; [DefenseScoop FY27](https://defensescoop.com/2026/05/28/dod-fy27-budget-cjadc2-maven-smart-system-palantir/) 28 May 2026 |
| **CJADC2** | Described in the FY27 request as "fragmented"; moving "from rapidly deployed product to program of record." FY25 $103M → FY26 $240M → FY27 >$2B requested (>$1.5B for Maven expansion, $60M Virtual JOC). CTO Emil Michael owed a *CJADC2 Acceleration Plan* within 120 days of the March memo. | **The mission-command application tier of CJADC2, via MSS.** Not "integrates with JADC2" — specifically, an application riding the consolidation the Department has already ordered and funded. | [DefenseScoop](https://defensescoop.com/2026/05/28/dod-fy27-budget-cjadc2-maven-smart-system-palantir/) 28 May 2026 |
| **CDAO** | **Active, not renamed.** Realigned 14 Aug 2025 from reporting to DepSecDef to reporting to **USD(R&E)**. Cameron Stanley is CDAO (testified to House Armed Services 14 May 2026). Owns MSS Program Office and leads Agent Network. | **CDAO is the sponsor of record for exactly this class of software.** It now owns both the host (MSS PO) and the agent framework (Agent Network). A medical-logistics decision agent has one obvious front door. | [CRS IN12615](https://www.everycrsreport.com/reports/IN12615.html) 2025; [ai.mil bio](https://www.ai.mil/About/Leadership/Bio-Page/Article/3940370/cameron-stanley/); [House witness bio](https://www.congress.gov/119/meeting/house/119184/witnesses/HHRG-119-AS35-Bio-StanleyC-20260514.pdf) 14 May 2026 |
| **Agent Network** (Pace-Setting Project #2) | Announced **June 2026**, CDAO-led, partners Palantir and Lumbra; initial operating partners EUCOM, INDOPACOM, SOUTHCOM. Agents "continuously monitor operational systems… deliver decision options to commanders within seconds." Explicitly "does not make targeting or strike decisions." No public mention of logistics or medical. | **The vacant medical-logistics lane inside Agent Network.** ANGEL SWARM is the same architectural object — a bounded agent producing decision options for a human commander — in the one mission area Agent Network has not populated. Also the closest thing to a competitor; see Risks. | [Potomac Officers Club](https://www.potomacofficersclub.com/articles/agent-network-pentagon-ai-c2-psp/) Jun 2026; [ExecutiveGov](https://www.executivegov.com/articles/dow-agent-network-ai-battle-management-psp-2) 2026 |
| **AI Strategy for the Department of War** | Issued **9 Jan 2026**, SecWar memorandum. Seven Pace-Setting Projects: Swarm Forge, Agent Network, Ender's Foundry, Open Arsenal, Project Grant, GenAI.mil, Enterprise Agents. "The risks of not moving fast enough outweigh the risks of imperfect alignment." Creates a Barrier Removal Board and Service AI Integration Leads. | **The stated policy preference for small, fast, externally-built agents over centrally planned programs.** A working prototype with a provenance record is the artifact this strategy asks for. | [Strategy PDF](https://media.defense.gov/2026/Jan/12/2003855671/-1/-1/0/ARTIFICIAL-INTELLIGENCE-STRATEGY-FOR-THE-DEPARTMENT-OF-WAR.PDF) 9 Jan 2026; [Inside Government Contracts](https://www.insidegovernmentcontracts.com/2026/02/pentagon-releases-artificial-intelligence-strategy/) Feb 2026 |
| **Open DAGIR** | CDAO initiative, three layers (infrastructure / data / applications), government-owned contractor-operated; OTA prototype mechanism to "rapidly and securely onboard third-party vendor and government capabilities." Initially supports CJADC2. | **The OTA onboarding mechanism for the application layer.** This is the named contractual path by which an outside decision app enters the CJADC2 data environment without owning the data. | [CDAO fact sheet PDF](https://media.defense.gov/2024/Oct/27/2003571833/-1/-1/0/2024-07-18-CDAO-OPEN-DAGIR-FACT-SHEET.PDF) 18 Jul 2024 |
| **Replicator** | **R1 transitioned / effectively concluded.** Former R1 director T.S. Allen: "hundreds of drones" delivered late 2023–summer 2025, "thousands more on contract." DIU now characterizes it as a "prototype effort" being transitioned to the Services; DIU director Doug Beck resigned. **R2** = counter-UAS; first R2 contract awarded by the JIATF Jan 2026. **No Replicator 3 found — UNVERIFIED.** | **None that is honest.** Replicator's scope is attritable combat autonomy and counter-UAS. **Logistics and medical autonomy are not in scope in any source I found.** Do not claim Replicator alignment. Cite it only as precedent for *fielding autonomy fast*, if at all. | [DefenseScoop](https://defensescoop.com/2025/09/03/dod-replicator-drone-tech-transition-fielding-questions-linger/) 3 Sep 2025; [DIU](https://www.diu.mil/replicator); [CRS IF12611](https://www.congress.gov/crs-product/IF12611); [DroneLife](https://dronelife.com/2026/01/14/jiatf-awards-first-replicator-2-contract-for-c-uas-system/) 14 Jan 2026 |
| **ULS-A / TRUAS (TRV-150)** | Active, **NAVAIR PMA-263**. TRV-150 fielded; USMC TRUAS reached IOC. Published envelope: 120 lb cargo, 50 kt, 12 km combat radius, automated launch / waypoint nav / automated landing and payload drop. Follow-ons MARV-EL and BLUE WATER in development. Apr 2026: Sikorsky + Robinson Unmanned won a USMC autonomous aerial logistics contract. | **PMA-263 owns the airframe and its autopilot; nobody owns the fleet-level allocation rule.** TRUAS executes "automated launch, waypoint navigation, and automated landing" — i.e. it flies a mission it is given. ANGEL SWARM produces the mission it is given. | [NAVAIR ULS-A](https://www.navair.navy.mil/product/Unmanned-Logistics-Systems-Air); [UASweekly](https://uasweekly.com/2026/04/28/sikorsky-and-robinson-unmanned-win-u-s-marine-corps-contract-for-autonomous-aerial-logistics-uas/) 28 Apr 2026 |
| **Army autonomous medical resupply** | **Fielded and validated May 2026.** Soaring M25 (2 aircraft; 25 lb payload, 10 km round trip, ~13 min setup-to-launch) in a 44th Medical Brigade / XVIII Airborne Corps operational validation of Class VIII resupply. Separately, "Project Hermes," 28 Apr 2026, four soldiers trained via Clemson Drone Academy — the Army article says they learned "how to manually operate the systems." | **Proof the mission is real and the aircraft are fielded — and nothing more.** Do NOT cite the training article as evidence about tasking; see the correction in §A. The allocation gap is carried by the DIU, TATRC and PMA-263 scope statements, which are the defensible seam. | [sUAS News](https://www.suasnews.com/2026/05/soaring-showcases-autonomous-aerial-medical-resupply-capability-during-u-s-army-xviii-airborne-corps-44th-medical-brigade-operational-validation/) May 2026; [army.mil 292841](https://www.army.mil/article/292841/army_medical_brigade_integrates_drones_into_resupply_operations) 27 May 2026 |
| **DIU AI-Assisted Triage and Treatment Tool** | Announced **25 Feb 2026** (PROJ00628). ~$1M across up to 8 finalists; demos spring 2026; winners announced June 2026; up to 15,000 units in year one. Targets "analog, paper-based" triage. **Scope is digital triage and documentation; it does not address evacuation or resupply asset allocation/tasking.** | **The upstream data producer.** DIU is buying the thing that generates casualty state; ANGEL SWARM consumes casualty state and produces an aircraft assignment. Two adjacent buys, zero overlap — and DIU's own scope statement is the proof. | [DefenseScoop](https://defensescoop.com/2026/02/25/military-medical-triage-systems-modern-combat-diu/) 25 Feb 2026 |
| **TATRC MEDRAS / Autonomous Casualty Care (AC2)** | Active, 16 MEDRAS projects. Categories: autonomous **transport** ("Just-In-Time" Delivery and Recovery of Whole Blood via UAS — Triton Systems and Near Earth Autonomy variants; DP-14; CEMM; ACE; BRACE), autonomous **documentation** (APOLLO, RPC3), autonomous **treatment** (ARC3-I, TRON, CMU trauma care). **No project in the public list is a tasking/allocation or mission-assignment decision engine.** | **The empty cell in TATRC's own portfolio taxonomy.** TATRC funds transport, documentation and treatment autonomy. Allocation autonomy is not in the portfolio. Say it exactly that way. | [MEDRAS projects](https://www.tatrc.org/www/divisions/medras/projects.html); [AC2 press release](https://www.tatrc.org/www/news-and-media/press-release/20240628-press-release-autonomous-casualty-care-ac2-research-portfolio.html) 28 Jun 2024 |
| **Project Crimson (TATRC)** | Demonstrated at Project Convergence 2022, Fort Irwin (Sep–Nov 2022). Refrigerated FVR-90 delivering whole blood to field medics in a simulated mass-casualty scenario; **BATDOK** used for patient data. Historic, not a current program of record. | **Precedent, and the BATDOK interface.** Crimson proves the mission is real and DoD-run; BATDOK is the named patient-data interface at the medic edge. Cite Crimson as prior art you build on, and be explicit it is 2022. | [PopSci](https://www.popsci.com/technology/project-crimson-army-emergency-medicine/); [army.mil 262022](https://www.army.mil/article/262022/pc22_experiments_with_new_medical_technology_for_the_battlefield) 2022 |
| **OpMed Care Delivery Platform (OpMed CDP)** | Active DHA-side clinical platform, fact sheet dated Jan 2026 (posted 24 Mar 2026). Owned by **Defense Healthcare Management Systems (DHMS)**; integrates with **MHS GENESIS**; references Joint Trauma System medication guidelines; built for "disconnected, intermittent, and low-bandwidth" operation. | **The clinical record of truth on the DHA side.** ANGEL SWARM's FHIR-shaped export is aimed at this lane (point of injury → OMDS → MHS GENESIS). This is the DHA-internal seam and it is the one the user's own organization owns. | [health.mil fact sheet](https://www.health.mil/Reference-Center/Fact-Sheets/2026/03/24/Operational-Medicine-Care-Delivery-Platform-Fact-Sheet) 24 Mar 2026 |
| **Joint Trauma System (JTS)** | Active, governed by **DoDI 6040.47**. Publishes Clinical Practice Guidelines, the DoD Trauma Registry, and *Joint En Route Care Guidelines FY26*. | **The clinical-authority citation for the deadline itself.** ANGEL SWARM's physiological deadlines must trace to JTS CPGs — that is what makes "deadline" a clinical term rather than a product term. | [JTS](https://jts.health.mil/); [DoDI 6040.47](https://www.esd.whs.mil/portals/54/documents/dd/issuances/dodi/604047p.pdf); [Joint En Route Care Guidelines FY26](https://jts.health.mil/assets/docs/cpgs/CoERCCC%20Guidelines%20FY26.pdf) |
| **Cursor on Target / TAK** | TAK developed by **Air Force Research Laboratory (Rome, NY)**; government-owned, free to government and public-safety users; TAK Server is the hub for TAK clients. CoT is the XML event format. | **The existing TAK server the JOA already runs.** ANGEL SWARM **ingests** CoT today — see the correction in §D. The honest statement is: *it consumes the CoT feed the JOA already produces, adding a track consumer, not a new interface.* An emit path is the obvious next step, not a current claim. | [DHS TAK fact sheet PDF](https://www.dhs.gov/sites/default/files/publications/tactical_awareness_kit_508.pdf); [tak.gov](https://tak.gov/solutions/military) |
| **FHIR / US Core / MHS GENESIS** | FHIR R4 + US Core is the mainstream US health interoperability stack; MHS GENESIS is the federal EHR and OpMed CDP integrates with it. | **The DHA data lane.** ANGEL SWARM exports FHIR-*shaped* resources — see §D for why the hedge is what makes this defensible. | [ONC SVAP 2026](https://healthit.gov/blog/standards/advancements-in-health-it-oncs-2026-approved-svap-standards/); [health.mil fact sheet](https://www.health.mil/Reference-Center/Fact-Sheets/2026/03/24/Operational-Medicine-Care-Delivery-Platform-Fact-Sheet) 24 Mar 2026 |
| **NIEM / NIEMOpen** | Now an **OASIS Open Project**, sponsored by **Joint Staff J6**; identified as a key enabler in the **JADC2 Reference Architecture** at Application, Interface and Data levels. | Secondary. Worth one clause if a judge asks about joint data exchange; not worth pitch time. | [NIEMOpen](https://en.wikipedia.org/wiki/NIEMOpen) |
| **STANAG 4586** | NATO standard for UAV Control System interfaces (Data Link Interface / Command and Control Interface). Still the NATO UAS control interoperability standard. | **Correct standard for the tasking hand-off to a ground control station** — i.e. how an assignment becomes a mission on a specific airframe. Claim as the *target* interface, and say so, unless it is implemented. | [STANAG 4586 (NATO STO)](https://publications.sto.nato.int/publications/STO%20Educational%20Notes/STO-EN-SCI-271/EN-SCI-271-03.pdf) |
| **Link 16 / VMF / MIL-STD-6017** | Active tactical data link standards. MIL-STD-6017 defines Variable Message Format. | **Wrong lane. Do not claim these.** They are platform-to-platform tactical data links for combat track and fires messaging. A medical-logistics decision layer has no business asserting Link 16 compatibility, and a judge who knows Link 16 will punish it. | [MIL-STD-6017](https://everyspec.com/MIL-STD/MIL-STD-3000-9999/MIL-STD-6017A_NOTICE-1_24274/); [VMF](https://en.wikipedia.org/wiki/Variable_Message_Format) |
| **OMS/UCI** | Air Force open mission systems / universal C2 interface architecture. | Marginal. Relevant to airframe payload/mission-system integration, not to a tasking layer. Do not lead with it. | [DTIC AD1060226](https://apps.dtic.mil/sti/trecms/pdf/AD1060226.pdf) |
| **MAVLink** | Open-source UAS telemetry/command protocol, widely used on small UAS. | Real but low-prestige in this room. Useful only as a statement about small-UAS reach; STANAG 4586 is the credible claim. | (general; no authoritative DoD source found — **UNVERIFIED as a DoD standard**) |
| **DoDD 3000.09** | Current version **25 Jan 2023**. Paragraph 1.1.b excludes from applicability: *"unarmed platforms, whether remotely operated or operated by onboard personnel, and whether autonomous or semi-autonomous"* and *"autonomous or semi-autonomous systems that are not weapon systems."* | **Verbatim exclusion — the strongest policy claim in the deck.** Quote 1.1.b directly. ANGEL SWARM tasks unarmed platforms and is not a weapon system; the directive excludes both, explicitly. | [DoDD 3000.09 PDF](https://www.esd.whs.mil/portals/54/documents/dd/issuances/dodd/300009p.pdf) 25 Jan 2023 |
| **DoDI 8510.01 / RMF** | Active; the authorization path for DoD IT. | **The correct compliance frame.** ANGEL SWARM's exposure is an RMF/ATO question, not a 3000.09 question. Saying that unprompted shows you know which rulebook applies. | [DoDI 8510.01 PDF](https://www.esd.whs.mil/Portals/54/Documents/DD/issuances/dodi/851001p.pdf) |
| **Responsible AI** | The Jan 2026 strategy **redefines** "responsible AI" toward models "free from ideological 'tuning'" with "no usage policy constraints… beyond those imposed by statute," and prefers "Hard-Nosed Realism" over "Utopian Idealism." The older DoD RAI Toolkit framing is no longer the department's rhetorical center of gravity. | **Lead with human-on-the-loop and auditability, not with "ethical AI" language.** The current department rewards provenance and speed. ANGEL SWARM's decision record with SHA-256 digests is the right thing to show. | [Inside Government Contracts](https://www.insidegovernmentcontracts.com/2026/02/pentagon-releases-artificial-intelligence-strategy/) Feb 2026; [Strategy PDF](https://media.defense.gov/2026/Jan/12/2003855671/-1/-1/0/ARTIFICIAL-INTELLIGENCE-STRATEGY-FOR-THE-DEPARTMENT-OF-WAR.PDF) 9 Jan 2026 |
| **NSPM-11** | National Security Presidential Memorandum 11, June 2026. Found in search; **contents not verified against the primary text.** | **UNVERIFIED — do not cite in the pitch.** | [whitehouse.gov](https://www.whitehouse.gov/presidential-actions/2026/06/national-security-presidential-memorandum-nspm-11/) Jun 2026 |

---

## C. Spoken lines (each defensible, each names something real)

1. "In May 2026 the 44th Medical Brigade validated autonomous Class VIII resupply with Soaring
   M25 aircraft. The aircraft are bought and fielded. The rule that decides which aircraft flies
   to which casualty is not — not by DIU's triage program, not by TATRC's portfolio, not by
   NAVAIR, which flies the mission it is given. ANGEL SWARM is that missing rule."
   *(Never cite the Army training article for the tasking half — see the correction in §A.)*

2. "DIU is buying the triage layer right now — the AI-Assisted Triage and Treatment Tool,
   announced 25 February 2026 — and its scope is assessment and documentation, not allocation
   of evacuation or resupply assets. We consume what that program produces. We do not compete
   with it."

3. "NAVAIR's PMA-263 owns the airframe: the TRV-150 does automated launch, waypoint navigation
   and automated landing. It flies the mission it is given. We decide the mission it is given.
   Those are two different programs and only one of them exists."

4. "On 9 March 2026 the Deputy Secretary made the Maven Smart System a program of record and
   moved it under the CDAO program office, and the FY27 request funds third-party vendors to
   field applications on MSS. We are an application for that pipeline — a medical-logistics
   agent in the lane CDAO's Agent Network has not populated."

5. "DoD Directive 3000.09 paragraph 1.1.b excludes, in its own words, 'unarmed platforms' and
   'autonomous or semi-autonomous systems that are not weapon systems.' We task unarmed
   aircraft carrying blood. The directive excludes us by name. Our compliance question is
   RMF and an ATO under DoDI 8510.01, and we have written that assessment."

---

## D. Risks to this framing

**1. The CoT claim as stated in the task brief is wrong, and it is the one that would get caught.**
The brief's example line — "it emits CoT events over the existing TAK server" — does not match
the build. `OUT/ANGEL-SWARM-SECURITY-AND-ATO.md` and `OUT/ANGEL-SWARM-ARCHITECTURE.md` describe
a **receive-only** CoT UDP listener in `cmd/angelswarm/telemetry.go`: off by default, enabled
with `-cot`, bound to loopback unless `-cot-external` is *also* passed, "never replying," with
an 8,192-byte datagram bound. The security doc calls unauthenticated external CoT ingest "the
single largest unmitigated spoofing exposure." So: **ANGEL SWARM ingests CoT; it does not emit
CoT.** Say "we consume the CoT feed the JOA already produces" — that is true, defensible, and
still answers the interface question. Saying "emits" is a false claim about your own build, in
front of judges, and it is contradicted by your own security annex.

**2. "Swarm" is a name collision with an actual Pace-Setting Project.** *Swarm Forge* is PSP #1
in the 9 Jan 2026 AI strategy. Separately, "swarm" in current DoD usage connotes attritable
strike mass (Replicator lineage). ANGEL SWARM is neither. Expect at least one judge to arrive
assuming you are a strike-swarm product. Disarm it in the first fifteen seconds.

**3. Agent Network is the real competitive risk, and it is only four months old.** CDAO's Agent
Network (June 2026) is architecturally the same object: bounded AI agents delivering "decision
options to commanders within seconds," explicitly not making targeting decisions, built with
Palantir and Lumbra. If CDAO decides medical logistics is an Agent Network use case, ANGEL SWARM
is a feature, not a program. **The framing that survives this is to say so first** — "this is an
Agent Network-class capability for the medical lane" — rather than being told it.

**4. Maven's POR status cuts both ways.** The department has decided the C2 application layer
consolidates on MSS. A standalone application that does not describe a path onto MSS reads, to a
2026 acquisition audience, as something that will be consolidated away. The mitigation is the
Open DAGIR OTA onboarding path — name it.

**5. The allocation math is not novel and someone in the room may know it.** There is published
academic work on exactly this problem: "Solving the military medical evacuation dispatching,
preemptive rerouting, redeploying, and delivering problem via tree-based machine learning and
approximate dynamic programming approaches" (Expert Systems with Applications, 2025). Do not
claim the algorithm is new. Claim the *fielded decision layer with a provenance record* is new —
that is defensible and the academic work does not touch it.

**6. TATRC's whole-blood UAS projects are the closest adjacency.** MEDRAS funds "Just-In-Time
Delivery and Recovery of Whole Blood via UAS" with Triton Systems and Near Earth Autonomy, and
the Army Applications Laboratory selected LIFT Aircraft and Near Earth Autonomy (Oct 2024) for a
modular blood/CASEVAC payload. These are transport and payload programs, not allocation engines —
but they are close enough that you must say explicitly that ANGEL SWARM *tasks* these, not
replaces them. If you do not draw the line, a judge from TATRC will.

**7. Do not claim Replicator alignment.** I found no source placing logistics or medical autonomy
in Replicator 1 or 2 scope; R1 is transitioning out and DIU now calls it a "prototype effort."
Claiming Replicator lineage is an unforced error.

**8. Do not claim Link 16 / VMF / MIL-STD-6017.** Wrong standards for this layer. CoT, FHIR,
STANAG 4586 are the right three. OMS/UCI and MAVLink are marginal; NIEM is a footnote.

**9. CDAO's own standing is contested.** The Aug 2025 realignment under USD(R&E) was publicly
characterized as a demotion (Lt Gen Jack Shanahan, ret.). The CDAO seam is real and it now owns
MSS and Agent Network, but do not describe CDAO as ascendant — describe it as the office that
owns the program office you would ride.

**10. No source found for a Replicator 3, or for any DLA autonomous distribution program of
record.** Both **UNVERIFIED**. Do not mention either.

### Verdict on the four existing ANGEL SWARM claims

| Claim | Verdict |
|---|---|
| Ships CoT ingest (`-cot-external`) | **Confirmed as ingest — challenge the word "emits."** CoT/TAK is AFRL-developed and government-owned, so the interface claim is sound; the direction of data flow is not what the brief said. Say "ingest." |
| Exports FHIR-shaped resources (4,151) | **Defensible precisely because it is hedged.** The docs tag every one of the 4,151 resources `FHIR-SHAPED, NOT CONFORMANCE-TESTED` in `meta.tag`, in five places. Keep the hedge audible in the spoken pitch — it is the strongest credibility signal in the package. Never say "FHIR-compliant." |
| Cites TRV-150C / Soaring M25 / FVR-90 envelopes | **Confirmed, and conservative — but restate the claim precisely.** App values (`app/js/sim.js`): TRV-150C 92 km/h ≈ 50 kt ✓ and 12 km radius ✓ both match NAVAIR exactly; payload 30 kg is *below* NAVAIR's 120 lb (54 kg). M25 5 km radius ✓ matches Soaring's "10 km round trip"; payload 6.8 kg is below the published 25 lb (11.3 kg). FVR-90 payload 9.1 kg ≈ published 10 kg ✓; 90 km radius consistent with the 100 km data link; 83 km/h is below the 65 kt max loiter. So the honest phrasing is **"parameters set at or below published performance figures,"** not "cites published envelopes." Under-claiming is a strength — say it out loud. |
| DoDD 3000.09 does not apply | **Confirmed verbatim, strongest claim in the deck.** Para 1.1.b, DoDD 3000.09 (25 Jan 2023), excludes "unarmed platforms… whether autonomous or semi-autonomous" and "autonomous or semi-autonomous systems that are not weapon systems." Quote the directive, cite the paragraph number, and pair it with DoDI 8510.01 as the rulebook that *does* apply. |

---

## E. Sources

**Policy and strategy**
- DoDD 3000.09, *Autonomy in Weapon Systems*, 25 Jan 2023 — https://www.esd.whs.mil/portals/54/documents/dd/issuances/dodd/300009p.pdf
- DoDI 8510.01, *Risk Management Framework for DoD Systems* — https://www.esd.whs.mil/Portals/54/Documents/DD/issuances/dodi/851001p.pdf
- *Artificial Intelligence Strategy for the Department of War*, 9 Jan 2026 — https://media.defense.gov/2026/Jan/12/2003855671/-1/-1/0/ARTIFICIAL-INTELLIGENCE-STRATEGY-FOR-THE-DEPARTMENT-OF-WAR.PDF
- Inside Government Contracts, *Pentagon Releases Artificial Intelligence Strategy*, Feb 2026 — https://www.insidegovernmentcontracts.com/2026/02/pentagon-releases-artificial-intelligence-strategy/
- Executive Order 14347, *Restoring the United States Department of War*, 5 Sep 2025 — https://www.whitehouse.gov/presidential-actions/2025/09/restoring-the-united-states-department-of-war/
- NSPM-11, Jun 2026 (**UNVERIFIED**) — https://www.whitehouse.gov/presidential-actions/2026/06/national-security-presidential-memorandum-nspm-11/

**C2 / CJADC2 / CDAO**
- DepSecDef memo, *Maven and Combined JADC2 in the AI Era*, 9 Mar 2026 — https://img.jangomail.com/2576619/Attachments/Maven%20and%20Combined%20JADC2%20in%20the%20AI%20era.pdf
- DefenseScoop, *Feinberg's new Maven directive…*, 3 Apr 2026 — https://defensescoop.com/2026/04/03/palantir-maven-feinberg-directive/
- DefenseScoop, *DOD components face 'aggressive' timeline for MSS transition*, 15 Apr 2026 — https://defensescoop.com/2026/04/15/palantir-maven-smart-system-pentagon-program-transition-feinberg/
- DefenseScoop, *DOD wants more than $2B in FY27…*, 28 May 2026 — https://defensescoop.com/2026/05/28/dod-fy27-budget-cjadc2-maven-smart-system-palantir/
- DefenseScoop, *Pentagon appoints new MSS program director*, 5 Aug 2026 — https://defensescoop.com/2026/08/05/pentagon-appoints-new-maven-smart-system-program-director/
- CRS IN12615, *Realignment of DOD's CDAO* — https://www.everycrsreport.com/reports/IN12615.html
- CDAO leadership bio, Cameron Stanley — https://www.ai.mil/About/Leadership/Bio-Page/Article/3940370/cameron-stanley/
- HASC witness bio, Cameron Stanley, 14 May 2026 — https://www.congress.gov/119/meeting/house/119184/witnesses/HHRG-119-AS35-Bio-StanleyC-20260514.pdf
- Potomac Officers Club, *Agent Network*, Jun 2026 — https://www.potomacofficersclub.com/articles/agent-network-pentagon-ai-c2-psp/
- ExecutiveGov, *Pentagon Launches 'Agent Network'* — https://www.executivegov.com/articles/dow-agent-network-ai-battle-management-psp-2
- CDAO Open DAGIR fact sheet, 18 Jul 2024 — https://media.defense.gov/2024/Oct/27/2003571833/-1/-1/0/2024-07-18-CDAO-OPEN-DAGIR-FACT-SHEET.PDF
- CSIS, *What Is Maven Smart System* — https://www.csis.org/analysis/what-maven-smart-system-and-what-does-it-do

**Replicator**
- DefenseScoop, *DOD touts 'successful transition' for Replicator*, 3 Sep 2025 — https://defensescoop.com/2025/09/03/dod-replicator-drone-tech-transition-fielding-questions-linger/
- DIU Replicator page — https://www.diu.mil/replicator
- CRS IF12611, *DOD Replicator Initiative* — https://www.congress.gov/crs-product/IF12611
- DroneLife, *JIATF Awards First Replicator 2 Contract*, 14 Jan 2026 — https://dronelife.com/2026/01/14/jiatf-awards-first-replicator-2-contract-for-c-uas-system/

**Autonomous logistics**
- NAVAIR, Unmanned Logistics Systems – Air (PMA-263) — https://www.navair.navy.mil/product/Unmanned-Logistics-Systems-Air
- UASweekly, *Sikorsky and Robinson Unmanned win USMC autonomous aerial logistics contract*, 28 Apr 2026 — https://uasweekly.com/2026/04/28/sikorsky-and-robinson-unmanned-win-u-s-marine-corps-contract-for-autonomous-aerial-logistics-uas/
- SURVICE TRV-150c — https://www.survice.com/trv-150c/
- Army Recognition, *USMC tests TRV-150C from San Antonio-class*, 2026 — https://www.armyrecognition.com/news/navy-news/2026/u-s-marines-test-trv-150c-cargo-drone-from-san-antonio-class-amphibious-warship-to-expand-naval-resupply
- L3Harris FVR-90 specifications — https://www.airforce-technology.com/projects/fvr-90-vtol-unmanned-aerial-system/

**Medical autonomy and data**
- sUAS News, *Soaring… 44th Medical Brigade Operational Validation*, May 2026 — https://www.suasnews.com/2026/05/soaring-showcases-autonomous-aerial-medical-resupply-capability-during-u-s-army-xviii-airborne-corps-44th-medical-brigade-operational-validation/
- army.mil, *Army medical brigade integrates drones into resupply operations*, 27 May 2026 — https://www.army.mil/article/292841/army_medical_brigade_integrates_drones_into_resupply_operations
- DefenseScoop, *U.S. military trying to shed 'paper-based' triage systems* (DIU AI-Assisted Triage and Treatment Tool, PROJ00628), 25 Feb 2026 — https://defensescoop.com/2026/02/25/military-medical-triage-systems-modern-combat-diu/
- TATRC MEDRAS projects — https://www.tatrc.org/www/divisions/medras/projects.html
- TATRC AC2 research portfolio press release, 28 Jun 2024 — https://www.tatrc.org/www/news-and-media/press-release/20240628-press-release-autonomous-casualty-care-ac2-research-portfolio.html
- PopSci, *Project Crimson* — https://www.popsci.com/technology/project-crimson-army-emergency-medicine/
- army.mil, *PC22 experiments with new medical technology*, 2022 — https://www.army.mil/article/262022/pc22_experiments_with_new_medical_technology_for_the_battlefield
- UAS Magazine, *Army selects Near Earth Autonomy & LIFT for autonomous blood & CASEVAC*, 2 Oct 2024 — https://uasmagazine.com/articles/us-army-selects-near-lift-autonomy-lift-for-autonomous-blood-casevac-transportation-system
- health.mil, *Operational Medicine Care Delivery Platform fact sheet*, 24 Mar 2026 — https://www.health.mil/Reference-Center/Fact-Sheets/2026/03/24/Operational-Medicine-Care-Delivery-Platform-Fact-Sheet
- Joint Trauma System — https://jts.health.mil/
- DoDI 6040.47, *Joint Trauma System* — https://www.esd.whs.mil/portals/54/documents/dd/issuances/dodi/604047p.pdf
- *Joint En Route Care Guidelines FY26* — https://jts.health.mil/assets/docs/cpgs/CoERCCC%20Guidelines%20FY26.pdf
- DHA Armed Services Blood Program — https://dha.mil/Offices-and-Programs/ASBP
- DoDI 6480.04, *Armed Services Blood Program* — https://www.esd.whs.mil/Portals/54/Documents/DD/issuances/dodi/648004p.pdf
- *Solving the military medical evacuation dispatching… problem*, Expert Systems with Applications, 2025 — https://www.sciencedirect.com/science/article/abs/pii/S0957417425022018

**Standards**
- DHS Team Awareness Kit fact sheet (AFRL Rome origin) — https://www.dhs.gov/sites/default/files/publications/tactical_awareness_kit_508.pdf
- tak.gov — https://tak.gov/solutions/military
- STANAG 4586, NATO STO educational note — https://publications.sto.nato.int/publications/STO%20Educational%20Notes/STO-EN-SCI-271/EN-SCI-271-03.pdf
- DTIC AD1060226, *Unmanned Systems Interoperability Standards* — https://apps.dtic.mil/sti/trecms/pdf/AD1060226.pdf
- MIL-STD-6017A (VMF) — https://everyspec.com/MIL-STD/MIL-STD-3000-9999/MIL-STD-6017A_NOTICE-1_24274/
- NIEMOpen — https://en.wikipedia.org/wiki/NIEMOpen
- ONC 2026 approved SVAP standards (FHIR/US Core) — https://healthit.gov/blog/standards/advancements-in-health-it-oncs-2026-approved-svap-standards/

**Internal (ANGEL SWARM repo, read for claim verification only)**
- `/home/claude/angel/OUT/ANGEL-SWARM-SECURITY-AND-ATO.md` — CoT listener is receive-only, off by default, loopback unless `-cot-external`
- `/home/claude/angel/OUT/ANGEL-SWARM-ARCHITECTURE.md` — same, plus the 4,151-resource FHIR-shaped bundle
- `/home/claude/angel/OUT/ANGEL-SWARM-use-case.md` — FHIR resource breakdown and the not-conformance-tested caveat
- `/home/claude/angel/app/js/sim.js` lines 184–188 — airframe envelope parameters
