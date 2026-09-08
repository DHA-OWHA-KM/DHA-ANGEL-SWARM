# CANONICAL SECTION — "COMPLEMENT, NOT SUPPLANT"

This is the single approved text. Every document that carries this argument carries
THIS wording, adapted only in heading level and length. Do not paraphrase the claims.
Do not add a program that is not named here. Sources: RESEARCH/complement-landscape.md.

---

## Where this sits in what the Department has already bought

**BLUF.** In May 2026 the 44th Medical Brigade, XVIII Airborne Corps, completed an
operational validation of autonomous Class VIII aerial resupply using Soaring M25
aircraft. The aircraft are autonomous and fielded. The rule that decides which
aircraft flies to which casualty is bought by no program in the portfolio: DIU's
triage program, TATRC's MEDRAS portfolio and NAVAIR's PMA-263 each place allocation
outside their own stated scope. The Department has bought, fielded and made
permanent every layer around the decision this system makes, and has bought none of
that decision. ANGEL SWARM is
the missing tasking rule for aircraft the Services have already procured. It is not a
new aircraft, not a new command system, and not a replacement for anything currently
funded.

### The layer below — the airframes already exist and already fly themselves

NAVAIR PMA-263 fields the TRV-150 through the Unmanned Logistics Systems–Air line;
the Marine Corps TRUAS variant has reached initial operational capability. Its
published behaviour is automated launch, waypoint navigation, automated landing and
payload release. It flies the mission it is given. ANGEL SWARM produces the mission
it is given. Those are two different problems and only one of them has a program.

This system's airframe parameters are set **at or below** published performance
figures for the TRV-150C, the Soaring M25 and the FVR-90. It does not assume a better
aircraft than the one that exists.

### The layer beside — the sensing and documentation layer is being competed now

DIU announced the AI-Assisted Triage and Treatment Tool on 25 February 2026
(PROJ00628). Its stated scope is digital triage, patient assessment and
documentation, replacing an analog paper process. It does not buy allocation or
tasking of evacuation and resupply assets — that is the program's own scope
statement, not an inference about it. ANGEL SWARM consumes what that program
produces and produces an aircraft assignment. Two adjacent buys, zero overlap.

TATRC's MEDRAS portfolio funds autonomous **transport** (including just-in-time whole
blood delivery by UAS), autonomous **documentation** and autonomous **treatment**
across sixteen projects. Allocation is not a category in that portfolio — that is
TATRC's own taxonomy. ANGEL SWARM tasks those transport programs; it does not
duplicate them.

Project Crimson demonstrated refrigerated FVR-90 whole-blood delivery to field medics
at Project Convergence 2022, with BATDOK carrying patient data at the medic edge.
That is prior art this work builds on, and it is four years old.

### The layer above — the host is already designated

On 9 March 2026 the Deputy Secretary of Defense designated the Maven Smart System a
program of record and moved its administration to the CDAO MSS Program Office. The
FY27 request funds third-party vendors to develop and field applications on MSS.
ANGEL SWARM is an application for that pipeline, not a parallel command-and-control
system. Open DAGIR's OTA mechanism is the named path by which an outside capability is
onboarded to that application layer without owning the data beneath it.

CDAO's Agent Network, announced June 2026, is architecturally the same object as this
system: bounded agents that deliver decision options to a commander in seconds and
make no targeting or strike decisions. Its published operating partners are EUCOM,
INDOPACOM and SOUTHCOM, and its published use cases do not include medical logistics.
**ANGEL SWARM is an Agent Network-class capability for the medical lane.** Stated
plainly, that is a lane to be filled, not a program to be displaced.

### The clinical lane — DHA already owns the record of truth

The Operational Medicine Care Delivery Platform, owned by Defense Healthcare
Management Systems, integrates with MHS GENESIS, references Joint Trauma System
guidance, and is built to run disconnected and intermittent. This system's exported
casualty and decision resources are shaped for that lane. The physiological deadline
itself traces to Joint Trauma System Clinical Practice Guidelines, which is what makes
"deadline" a clinical term rather than a product term.

### Policy — this is an RMF question, not an autonomy-in-weapons question

DoD Directive 3000.09 (25 January 2023), paragraph 1.1.b, excludes from its
applicability "unarmed platforms, whether remotely operated or operated by onboard
personnel, and whether autonomous or semi-autonomous," and "autonomous or
semi-autonomous systems that are not weapon systems." This system tasks unarmed
aircraft carrying blood. The Directive excludes it on both counts, in its own words.
The rulebook that does apply is DoDI 8510.01 and the Risk Management Framework, and
that assessment is written down in the security annex rather than asserted here.

### How it is subsumed, concretely

1. **As an application on the MSS third-party layer,** onboarded through the Open
   DAGIR OTA mechanism. It contributes a decision surface; it does not stand up a
   data environment.
2. **As the medical-logistics lane inside an Agent Network-style agent framework** —
   the same bounded-agent contract, human on the loop, no strike authority.
3. **As a tasking service behind an existing ground control station.** The assignment
   this system produces is a mission for a specific airframe; STANAG 4586 is the
   correct NATO interface for handing it to the control station that already flies
   that airframe. That is the target interface, not an implemented one, and is stated
   here as an integration path rather than a capability.
4. **As a data producer into the DHA clinical lane,** by exporting casualty and
   decision resources shaped to the same standard the operational medicine platform
   and MHS GENESIS consume.

### What is deliberately NOT claimed

Honest boundaries, stated here so no reviewer has to find them:

- **CoT is ingested, not emitted.** The telemetry listener is receive-only, off by
  default, and bound to loopback unless explicitly opened. This system consumes the
  Cursor on Target feed a joint operations area already produces; it adds a track
  consumer, not a new interface. An emit path is the obvious next step and is not
  claimed today.
- **The exported health resources are FHIR-shaped, not conformance-tested,** and every
  exported resource carries that tag. The word "compliant" is not used anywhere.
- **STANAG 4586 is a target interface, not an implemented one.**
- **No Replicator alignment is claimed.** Replicator 1 and 2 scope is attritable
  combat autonomy and counter-UAS. Medical logistics is not in either, and claiming
  the lineage would be an unforced error.
- **No Link 16, VMF or MIL-STD-6017 compatibility is claimed.** Those are
  platform-to-platform tactical data links for track and fires. A medical-logistics
  decision layer has no business asserting them.
- **The allocation mathematics is not claimed as novel.** Published academic work
  addresses military medical evacuation dispatching and redeployment directly. What is
  offered here is a fielded decision layer with a provenance record attached to every
  decision — which is what the published work does not provide.
- **"Swarm" here does not mean attritable strike mass.** It is a fleet of unarmed
  logistics aircraft carrying blood.
- **The Army training article is not evidence about tasking.** army.mil 292841
  (27 May 2026) reports soldiers learning "how to manually operate the systems."
  That is about flying the aircraft by hand. It is not a statement about who decides
  which aircraft goes to which casualty, and it must never be offered as one. The
  44th Medical Brigade validation is cited here for exactly one thing — the mission
  is real and the aircraft are fielded. The claim that the allocation rule is unbought
  rests on three published scope statements (DIU PROJ00628, the MEDRAS portfolio
  taxonomy, NAVAIR PMA-263's published TRUAS behaviour), which are explicit scope
  and a documented absence rather than an inference.
