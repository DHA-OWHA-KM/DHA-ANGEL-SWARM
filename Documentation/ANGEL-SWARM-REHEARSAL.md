# ANGEL SWARM — Rehearsal Pack
## NDIA 2026 · Team DHA RESCUE · Junayd S. Park

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

**Version 1.1 · 9 September 2026.** Every figure in here
was checked against the shipped engine or measured off the running application.
Where a build change contradicted a line this script used to carry, the old line
was cut rather than softened — a presenter saying something the demo then
contradicts is the worst failure this pack can cause.

**New optional tracker beat.** Open **Resupply Tracking** and select a synthetic
commitment fixture. Let its own deterministic clock move through nominal phases,
then seek backward, play forward, toggle normal/8× playback with `SPEED ×8` and
`SPEED ×1`, reroute, and show a diverted, aborted, lost,
deadline-miss, cold-chain-failure or delivered fixture. The synthetic
margin-sorted queue, Canvas 2D schematic and Arm B scheduled-push comparison are
tracker-only states. Make clear that the speed toggle changes only the tracker's
deterministic clock, never host playback or engine state, and that all names,
times, routes and payloads are
synthetic demonstration fixtures, not operational output; the tracker is not a
projection of tasking, scenarios, casualties, host playback, run snapshots, fleet
history or Arm B ledgers. This is optional answer material, not an addition to the
four-minute script.

Two fifteen-second disarms:

> **“Isn't this package tracking?”** “No. This is a standalone synthetic
> demonstration: its names, times, routes and payloads are tracker-only fixtures,
> and its deterministic clock, seek, play/pause, `SPEED ×8` / `SPEED ×1`, and
> reroute controls demonstrate the UI without changing host playback or engine state. It
> cannot be treated as operational output.”

> **“Does this improve the result?”** “No. It changes no assignment and models
> no medic behaviour. Twenty-three against thirty-four is produced by the
> allocation, not by this display.”

The ATAK button is also a disarm: press it only to show the boundary. The modal
describes a proposed path and **nothing is transmitted**. No BATDOK-J, ATAK or
TAK integration exists; CoT is ingested, not emitted. If asked about EMSEC:
“A casualty grid with an aircraft inbound is targeting data. TLS protects the
link, not the emission pattern. That question must be answered before fielding.”

**v6.5 adds one spoken beat and takes the seconds out of a named place.** The beat
is *where this sits in what the Department has already bought* — the complement
argument. Every program, date and quotation in it comes from
`RESEARCH/COMPLEMENT-SECTION.md`, which was fact-checked by search on 5 September
2026. **Do not extend those claims by a word.** If a line you want is not in that
file, it is not sourced, and this room punishes that faster than it punishes a
gap.

---

## 0 · The budget

A hackathon slot is **5 minutes, 10 at the outside, and that includes questions.**
Plan for 5. Everything below is built to land at **4:00 spoken**, leaving a minute
of slack and every second of Q&A to the judges.

The single most common way a good prototype loses is the presenter running long
and being cut off before the result. **Get to the number in the first 90 seconds.**

| | |
|---|---|
| Target spoken length | 4:00 |
| Hard stop | 5:00 |
| Live run wall-clock at 10× | **18 seconds** (150 ticks × 120 ms) |
| Films available | 60 s cut · 3 min 15 s cut — both measured, both exact |
| If the slot collapses | **The one-minute version, §2a** |
| Destinations in the rail | **13.** Show three |
| Map scales | **4** — GLOBE, THEATRE, TACTICAL 2D, TACTICAL 3D |

Use the **60-second cut**. The 3-minute cut is for the submission package and for
anyone who asks for it afterwards. Playing it live would eat 60% of your slot.

### The guided walkthrough — use it for your team, not for the judges

Settings → Display → Guided walkthrough. Off by default. On, a bar at the foot
of the window walks the five screens of this brief in order — Command Overview,
Theater Map, Evidence, Ops Center Wall, Engine self-test — with one line about
each. It only navigates; no screen renders differently because it is up.

**Use it when you rehearse with the team and when someone else has to give this
brief. Turn it off in front of judges** — a guided mode reads as on-rails, and
it undercuts the strongest offer you can make in that room, which is *take the
keyboard, it is a real tool*.

If you do leave it on and step off the path, the bar says `OFF THE PATH`, names
the step you left and offers `RESUME`. It never steals a key: ← → and Escape
are inert while it is off and inert again while you are typing.

---

## 0a · What changed since you last rehearsed this

**Nothing in the build moved between v6.4 and v6.5.** What changed is this script:
a five-second disarm at 0:00, a twenty-second beat at 3:30, six new questions
(Q16–Q21) and four sentences you must never say. The demo you rehearsed still
behaves exactly as it did. Skip to §2 if you already know the v6.4 interface
changes below.

v6.4 was six interface defects and one architectural seam. **Nothing in the engine
moved.** But two of the six change a stage direction you may have memorised, so
read those two twice.

| | |
|---|---|
| **The route-stage strip no longer opens by itself** | Through v6.3 it defaulted to a sortie and was already on screen when you arrived at a tactical scale. **It is now closed until you click.** Click a casualty and it opens the sortie that carried to them; click an aircraft and it opens that airframe's most recent sortie. The ✕ on its header or Escape puts it away. **Any stage direction that assumed the strip was already there is now wrong.** Q14. |
| **The globe is legible, and its zoom now goes where you are looking** | The world outline was regenerated four times finer — 34,416 vertices against 8,235, about 220 kB, still embedded in the source rather than fetched. Japan reads as Honshu, Shikoku, Kyushu, Hokkaido and the Ryukyus. And the handoff was broken: **every zoom anywhere on the planet used to land on JOA CORAL.** It now flies to the operation you selected, or to the nearest one under the camera, or it declines and says `NO OPERATION UNDER THIS ZOOM`. Q13. |
| **The theatre picker and the map are finally the same picker** | Two engines run behind this shell and nothing joined them: picking JOA BASALT on Settings moved the classification stamp to BASALT while the map underneath carried on drawing CORAL. Both directions are wired now. **This one matters if a judge takes the keyboard** — see §5. |
| **The doctrine badges no longer name MiniLM** | Analyst Terminal → Doctrine now reads `TERM OVERLAP · NO MODEL ON THIS PATH` and Ask ANGEL's doctrine answers read `DOCTRINE · QUOTED VERBATIM, NOT GENERATED`. The old instruction to steer around those two screens is withdrawn. Q15 changed with it. |
| **One scrollbar per column on the map, none sideways** | Cosmetic, and it is exactly the kind of thing a judge's eye lands on while you are talking about something else. |

Carried over from v6.3 and still true:

| | |
|---|---|
| **The comparison line is on every screen** | `23 ANGEL SWARM ▍34 CURRENT — TRIAGE & PROXIMITY`, at the same size, under thirteen of the fourteen destination titles — every one but Run Setup — and on the navigation rail. You no longer have to hold the 34 in your head. **This is the one change that makes the talk easier.** *The rail copy of it needs a window at least 800 px tall; the line under the title is there at every size, so you are never without it.* |
| **A guided walkthrough** | Settings → Display. Off by default. Leave it off in front of judges — see §0. |

**Reference result unchanged: 23 / 34 / 35 on 20 / 38 / 0 sorties** — seed 42, JOA
CORAL, capability deployed. The self-test covers the shipped engine, host UI,
War Game worker behavior and the standalone RESUPPLY TRACK path; use its live
summary rather than memorising a copied check total.

---

## 1 · The one sentence

Memorise this. It is the whole thesis and it must come out clean under nerves.

> **Today we decide which wounded soldier gets blood by triage category and by who
> is nearest. ANGEL SWARM decides by when each soldier's own physiology says they
> run out of time — and on the same casualties, the same aircraft and the same
> blood, that one change takes the dead from thirty-four to twenty-three.**

Do not open with your name, the team name, or the agenda. Open with that.

---

## 2 · The 4:00 script

Times are cumulative. Click cues are in **bold**.

### 0:00 – 0:20 · The disarm, the sentence, then the gap

> "First, because the name invites it: **this is not a strike swarm.** These are
> unarmed aircraft carrying blood.
>
> Today we decide which wounded soldier gets blood by triage category and by who
> is nearest. ANGEL SWARM decides by when each soldier's own physiology says they
> run out of time.
>
> I went looking for the doctrine that names the current rule. **There isn't one.**
> It's convention, not policy. That means it can be replaced without changing a
> single line of doctrine."

*That "there isn't one" is your strongest sentence in the whole talk. Pause after it.*

**Why the first line is there, and why it is not optional.** *Swarm Forge* is
Pace-Setting Project #1 in the January 2026 *Artificial Intelligence Strategy for
the Department of War*, and in current departmental usage "swarm" carries the
Replicator connotation of attritable strike mass. **At least one judge will walk
in assuming you are a strike-swarm product**, and every minute they spend holding
that assumption is a minute your argument is landing on the wrong shelf. Kill it
in six words before the thesis, not in Q&A after it. Do not elaborate, do not
name Swarm Forge, do not joke about it — say it flat and move.

*It costs five seconds. It is paid for: "No publication names the assignment rule"
came out of this block (it restated "there isn't one"), and "This is the
application on open" came out of 1:20. Nothing else in the run moved.*

### 0:20 – 1:20 · The 60-second film

**Play `app/video/ANGEL-SWARM-film-60s-HQ.mp4`.** Say nothing over it. Let it work.

*Have it already open in a second window, paused on frame one. Do not fumble for a
file picker in front of judges.*

### 1:20 – 1:50 · Screen one — the answer, before you touch anything

**Open ANGEL SWARM. Command Overview, cold, nothing pressed.**

> "Before I press anything, it already tells you the three tolls of this battle."

Point at the strip:

> "**Thirty-five** die of survivable wounds if nothing is flown forward at all.
> **Thirty-four** under the tasking in use today — thirty-eight sorties to convert
> a single death. **Twenty-three** under ANGEL SWARM, on twenty sorties.
>
> Same casualties. Same aircraft. Same blood. Same random seed. The only thing that
> differs between those three lines is what the aircraft are tasked against."

*Those figures are read out of the engine when the screen draws. If a judge changes
the theatre on Settings, they change with it. Say so if asked — do not volunteer it
here, it costs eight seconds.*

### 1:50 – 2:30 · Run it in front of them

**DEPLOY → · SEND 7 AIRFRAMES FROM 3 LAUNCH POINTS → · 10× · PLAY →**

*The screen labels these `STEP 1 OF 2` and `STEP 2 OF 2`. `MISSION IN PROGRESS`
appears in red in the top bar while the clock runs and disappears when it stops
— so if you lose your place, the top bar tells you whether it is running.*

The run takes **eighteen seconds**. Narrate over it:

> "It starts not deployed on purpose — ANGEL SWARM is a capability handed into a
> fight already in progress, so both arms begin doing it today's way. I'm handing
> tasking authority over now.
>
> Seven airframes, three launch points, a hundred and twenty-five casualties over a
> hundred and eighty minutes. Both arms are flying the identical battle — the same
> soldiers are wounded at the same minute with the same injuries — because they
> share one casualty stream and one set of random draws. That's what makes the
> difference attributable to the tasking decision and to nothing else."

The result sheet opens on its own at T+180.

### 2:30 – 3:00 · The result sheet

> "Eleven fewer dead of survivable wounds. Thirty-two percent. On eighteen fewer
> sorties — it is not doing more, it is doing different.
>
> And the third arm matters: current tasking flies thirty-eight sorties to move
> thirty-five to thirty-four. **It converts one death for thirty-eight sorties.**
> Almost all of that lift is being spent on soldiers who were going to live anyway,
> or arriving after the physiology already closed."

**Scroll the sheet to "Where those 23 survivable deaths came from."**

> "And here is the part I'd rather show you than have you find. Of the twenty-three
> ANGEL SWARM still loses, the largest single bucket — ten of them — is *nobody on
> scene could administer what arrived*. That is not a tasking failure. That is a
> training and telementoring finding, and it's the honest answer to 'what would you
> do next'."

### 3:00 – 3:30 · Proof

**Settings → Engine self-test.** *It opens `selftest.html` in a new tab and leaves
your run untouched — know that before you press it, and know how you are getting
back. Have the tab already open behind the application if you can.*

> "You should not take any of that on my word. This page ships in the package. It
> checks the shipped engine and host UI in your browser, offline, with nothing
> mocked — determinism, the common random numbers,
> the conservation invariants, the deadline arithmetic, the SHA-256 audit chain and
> its tamper-evidence, all scenarios and the War Game worker path. The
> reference result I just showed you is asserted here rather than asserted in a
> slide."

### 3:30 – 3:50 · Where this sits in what has already been bought

**Data Sources → DATA PRODUCTS.** One sentence on this screen, then look up at
the room for the rest of the beat. *The screen is scenery here; the beat is spoken.*

> "It consumes a point-of-injury feed and produces a FHIR-shaped bundle — shaped,
> not conformance-tested, and the screen says so.
>
> Where this sits. In May 2026 the 44th Medical Brigade validated autonomous Class
> VIII resupply with Soaring M25 aircraft. **The aircraft are bought. The allocation
> rule is not** — not by DIU's triage program, not by TATRC's portfolio, not by
> NAVAIR, which flies the mission it's given. This is that missing rule, riding the
> Maven Smart System third-party layer FY27 funds.
>
> Not a new aircraft. Not a new command system. Not a replacement for anything you
> fund today."

*Know which source carries which half of this beat, because they are not
interchangeable.* **The 44th Medical Brigade validation — sUAS News and army.mil,
May 2026 — proves the mission is real and the aircraft are fielded. That is all it
proves and that is all you may use it for.** *The allocation half rests on three
programs describing their own scope, and you should be able to name all three
cold: DIU's AI-Assisted Triage and Treatment Tool, announced 25 February 2026
(PROJ00628) — triage, assessment and documentation, and it does not buy allocation
or tasking of evacuation and resupply assets; TATRC's MEDRAS portfolio — sixteen
projects across autonomous transport, documentation and treatment, with allocation
not a category in it; NAVAIR PMA-263's TRUAS — automated launch, waypoint
navigation, automated landing and payload release, which is an aircraft that flies
the mission it is given.*

**The one thing you must not do is cite the training article for the tasking
claim.** *army.mil 292841, 27 May 2026 says soldiers learned "how to manually
operate the systems." That is about flying the aircraft by hand. It is not a
statement about who decides which aircraft goes to which casualty, and offered as
evidence for that it is a misattribution a judge can catch in one search. Cite it
only for what it literally says, or not at all. Have the date and the unit right or
do not use the beat: **44th Medical Brigade, XVIII Airborne Corps, May 2026,
Soaring M25.***

**This is your complement argument and it is four sentences long. Do not grow it
on stage.** Everything else — Agent Network, Open DAGIR, DIU triage, TATRC,
3000.09 — is Q&A, and it is written out at Q16 through Q21. The whole point of
this beat is that it does not sound like a program pitch.

### 3:50 – 4:00 · Stop

> "Nothing in this application originates an outbound request — measured at the
> browser, not asserted. The threat model, the RMF pathway to an IL5 ATO and a
> CycloneDX bill of materials with every dependency hashed are in the package.
>
> That's ANGEL SWARM. Questions."

**Stop talking. Do not add a summary slide.**

### What the beat cost, and what paid for it

**Twenty seconds, and the money came from Data Sources.** The old 3:30 – 4:00 block
spoke BATDOK-J and the 4,151-resource FHIR bundle in full. That is now the single
sentence above — the exact compression this pack already carried as the way to fund
the optional globe. Interoperability is the row the rubric marks *cut first if
long*; this spends it and keeps its one load-bearing clause, the audible hedge.

**Running total is unchanged: 4:00 spoken, 5:00 hard stop.** Disarm +5 s at 0:00,
paid by two trims in §2. Complement beat +20 s at 3:30, paid by the Data Sources
collapse. Nothing else in the four minutes moved.

### Optional · twenty seconds of globe — and it is now the beat you cannot afford

**Read this before you plan to use it.** Through v6.4 the globe beat was funded by
collapsing Data Sources. **v6.5 spent that twenty seconds on the complement beat.
There is no second twenty seconds.** The globe and the complement beat now compete
for the same slack, and they are not close:

- The complement beat is the only thing in the run that answers *why does this
  belong in a portfolio you already fund* — a question this room asks and this
  prototype otherwise never addresses on stage.
- The globe earns **Usability & Design and nothing else**, and that row is already
  earned twice over by the cold screen carrying the answer and by the 18-second
  live run.
- The globe is **already fully written as answer material at Q13**, where a judge's
  own question pays for it instead of your clock.

**So: drop the globe from the spoken run.** Take it only if you arrive at 3:30
genuinely ahead *and* someone has already asked about the map — in which case you
are answering Q13 early, not adding a beat. If you find yourself choosing between
them under pressure, the complement beat wins every time.

The stage directions below stand for when you do run it, at Q13 or ahead of clock.

**Theater Map → GLOBE → scroll in over the operation.**

> "Four scales, one fight, and nothing on any of them is fetched — no tile
> server, no basemap key. Watch the bottom of the zoom."

Then say nothing. The last of the gesture is flown for you: **1.1 seconds**, and
it lands on the tactical sheet at about the same ground width the sheet opens on,
so the two pictures meet at the same scale across the cut.

*Rehearse the scroll. Zoom in over open water and it declines and says
`NO OPERATION UNDER THIS ZOOM — SPIN OR PICK ONE`, which is correct behaviour
and a bad twenty seconds. Put the operation under the middle of the frame first,
or click it in the list beside the map — an explicit selection wins outright.*

---

## 2a · The one-minute version

If the slot collapses — a lightning round, a hallway, a judge who says *"give me
the short one"* — this is the whole talk and it is already written down.

0. **The disarm, ahead of the sentence.** *"This is not a strike swarm — unarmed
   aircraft carrying blood."* Three seconds.
1. **The one sentence from §1.** Verbatim. Twenty seconds.
2. **Play the 60-second cut** (`app/video/ANGEL-SWARM-film-60s-HQ.mp4`, exactly
   60 s) and say nothing over it. It is a separate edit, not a trim of the long
   film: it stands alone with nobody narrating.

That is the one-minute version, and it is 83 seconds if you speak the disarm and
the sentence first. If you have only sixty, play the film and let both go — the
film carries `23 against 34, same casualties, same aircraft, same blood` on its own.

**The disarm made this cut. The complement beat did not, and here is why.** In a
hallway or a lightning round the misread costs you the whole minute — a judge who
hears "swarm" and files you under strike autonomy will not be corrected by a film
about blood, and three seconds buys the film the right audience. The complement
beat is twenty seconds against a sixty-second film and a twenty-second thesis, and
there is nothing left in that minute to displace that is not the argument itself.
So it is not a beat here — **it is your first answer**, ready the moment anyone
asks how this fits what they already fund:

> "It's the allocation rule for aircraft the Services have already bought. The
> 44th Medical Brigade validated autonomous Class VIII resupply in May. DIU's
> triage buy, TATRC's portfolio and NAVAIR's airframe all put allocation outside
> their own scope. This rides the Maven Smart System application layer; it doesn't
> replace anything."

**Do not try to compress the four-minute script into one minute.** It has a live
run in it and the run takes eighteen seconds of wall clock you cannot shorten.

---

## 3 · What not to do

- **Do not run the 3-minute film.** It costs 60% of the slot.
- **Do not tour the rail.** Fourteen destinations is a strength in the package and a
  liability on stage. Three screens: Command Overview, the result sheet, self-test.
- **Do not say "air-gapped."** It describes a prototype limitation as if it were a design
  goal, and it dies to the obvious question — *then how does a reading from a monitor on
  a casualty ever reach you?* Say **"no outbound request, measured"** and **"no dependency
  on enterprise reachback to decide."** Both are true and both are stronger.
- **The doctrine screens are safe to open now — the document is what is behind.** Both
  surfaces used to badge a term-overlap score with the sentence encoder's name. They no
  longer do: Analyst Terminal → Doctrine reads `TERM OVERLAP · NO MODEL ON THIS PATH`
  and Ask ANGEL's doctrine answers read `DOCTRINE · QUOTED VERBATIM, NOT GENERATED`,
  both in neutral rather than the violet this application reserves for model output.
  **What has not caught up is the residual risk register in the security document,
  which still carries R-11 in its pre-fix wording.** Do not volunteer either. If a
  judge reads R-11 back to you, see Q15.
- **Do not explain the architecture unasked.** DuckDB, deck.gl, ONNX, the Go launcher —
  all of it is answer material, none of it is script material.
- **Do not say "AI" about the tasking.** The optimiser is arithmetic. Claiming otherwise
  is the fastest way to lose a technically literate judge. See Q6.
- **Do not oversell CRI-Net.** Its output does not reach tasking, the application says so
  on its own Sensor screen, and a judge who catches you inflating it will discount
  everything else you said.

### The five sentences that will get you caught

**These are not style notes. Each one is a claim this project was about to make and
cannot support, and each was found by checking the build against the record. Read
them out loud once before you present.**

- **Never say the system EMITS CoT.** It does not. The telemetry listener is
  **receive-only**, off by default, and bound to loopback unless you explicitly open
  it. Say **"we consume the CoT feed the JOA already produces"** — that is true, it
  still answers the interface question, and it is what your own security annex says.
  "Emits" is a false claim about your own build, in front of judges, contradicted by
  a document in your own package. An emit path is the obvious next step and is not
  claimed today.
- **Never say FHIR-compliant.** It is **FHIR-shaped and not conformance-tested**, and
  every one of the 4,151 resources carries that tag in `meta.tag`. Keep the hedge
  audible on stage: it is assessed as the strongest single credibility signal in the
  whole package, and it only works if the room hears you volunteer it. The word
  "compliant" appears nowhere in the documents. Do not be the one who introduces it.
- **Never claim Replicator alignment.** Replicator 1 and 2 scope is attritable combat
  autonomy and counter-UAS. Medical logistics is in neither. Claiming the lineage is an
  unforced error and it is the kind a judge in this room will know. The same applies to
  **Link 16, VMF and MIL-STD-6017** — those are platform-to-platform tactical data links
  for track and fires, and a medical-logistics decision layer has no business asserting
  them. CoT, FHIR and STANAG 4586 are the right three, and STANAG 4586 is a *target*
  interface, not an implemented one. Say "target."
- **Never say "the tasking was manual — that is the Army's own account."** The
  argument is right and that source does not carry it. The article behind that line
  — army.mil 292841, 27 May 2026 — says soldiers were trained in "how to manually
  operate the systems," which is about **flying the aircraft by hand**, not about
  who decides which aircraft goes to which casualty. Attributing the allocation
  claim to it is the one misattribution in this package a judge can check in a
  single search. Say instead: **"the aircraft are bought, the allocation rule is
  not — DIU's triage program does not buy it, TATRC's portfolio has no such
  category, and NAVAIR's airframe flies the mission it is given."** Three programs,
  each stating its own scope, each checkable. The 44th Medical Brigade validation
  stays exactly where it belongs: it proves the mission is real and the aircraft
  are fielded. Q21.
- **Say "at or below published performance," not "we cite published envelopes."** The
  airframe parameters in this build are set **at or below** the published figures for
  the TRV-150C, the Soaring M25 and the FVR-90 — several are materially below. That is
  under-claiming, it is a strength, and it only counts if you say it aloud: *"the
  aircraft in this model are no better than the ones that exist, and in places they are
  worse."* A judge who checks will find you conservative, which is the best thing they
  can find.

---

## 4 · Hostile questions

The ones you should want them to ask are marked ★. The ones that can hurt you are
marked ⚠ — rehearse those out loud until they are boring.

### ★ Q1 · "Isn't this just a routing optimiser? Where's the innovation?"

> "The innovation isn't the router, it's the objective. Every fielded allocation
> scheme I could find sorts by triage category and then by distance. This one sorts
> by a per-casualty physiological deadline and asks whether the aircraft can beat it —
> which means it will decline to fly a sortie it cannot win and spend that airframe on
> one it can. That's why it flies eighteen fewer sorties for eleven fewer deaths. I
> also went looking for the doctrine that names the current rule, and there isn't one.
> It's convention, not policy."

### ⚠ Q2 · "Your simulator produced every number you just showed us. Why should we believe it?"

Do not get defensive. This is the right question.

> "You shouldn't believe the absolute numbers, and I'm not asking you to. What the
> simulator gives you is a *paired comparison* — both arms fly one identical casualty
> stream per seed under common random numbers, so the difference is the tasking rule
> and nothing else. That's a much weaker claim than 'twenty-three people die' and it's
> the only one I'm making. Across fourteen hundred paired battles on seven theatres,
> ANGEL SWARM wins all seven — every ninety-five percent interval excludes zero — and
> in five individual battles out of fourteen hundred it produced one more death. That's
> nought point three six percent, and never worse by more than one. The self-test
> page in the package lets you re-derive the reference result yourself in under a
> second."

### ★ Q3 · "Does it ever lose?"

**Distinguish a battle from a theatre. That distinction is the answer, and it makes
you look like you understand your own statistics — which most presenters do not.**

> "It wins all seven theatres — every ninety-five percent interval excludes zero.
> Individual battles vary, because that's what a distribution is: across fourteen
> hundred paired battles it produced one more death in five of them. Nought point three
> six percent, and never worse by more than one soldier.
>
> The weakest theatre is EUCOM FJORD — a compressed laydown where distance stops
> discriminating between casualties, so a deadline sort has less to work with. It
> still wins, by one point nine fewer dead against four point nine in CORAL, on a
> hundred and seventy-four of two hundred battles. Three of those five adverse draws
> are in FJORD.
>
> If you pick one seed you can find one of the five, and I'd rather you knew that from
> me than found it and thought I'd hidden it."

**If a judge produces a losing seed live** — they can, seed 42 in FJORD is one:

> "That's one of the five. One battle isn't a theatre — the interval for FJORD is minus
> two point zero five to minus one point six nine, and it doesn't touch zero. Run it
> two hundred times and you get the mean, not the draw."

*Do not say "it does not win every theatre." It wins every theatre. Say "individual
battles vary" — that is the true statement and it is also the stronger one.*

### ★ Q3a · "Can I reproduce a War Game result?"

> "Yes. War Game opens on the operation/scenario you selected and prints that
> scenario's force assumptions. Pick fleet size, launch points, datalink outage,
> triage error, or responder qualification/mix; pick twenty, thirty or forty paired
> battles per setting; and pick nominal timing or observed-flight variability.
> The seeds are deterministic from one thousand onward, and both arms receive the
> same altered world and common random numbers.
>
> Triage error changes only CURRENT — TRIAGE & PROXIMITY because ANGEL does not
> consume triage category. The screen also declares telementoring and ANGEL-only
> in-flight abort/hold logic as method differences. A completed sweep binds the
> scenario, settings, seed range and variability to the paired gap, ninety-five
> percent interval and better/tied/worse record. Restore those displayed inputs
> and run it again to reproduce it."

**If asked to cancel it live:** press **CANCEL SWEEP**. Progress counts completed
paired battles. Cancellation terminates every worker and retains no partial finding.
The same all-or-nothing rule applies to worker load, handshake timeout, protocol and
runtime failures. Changing scenario or variability cancels work in progress,
invalidates completed results and regenerates the scenario labels.

### ⚠ Q4 · "Your biggest bucket is 'nobody could administer'. Doesn't that mean the answer is more medics, not more drones?"

This is the strongest attack available. Have the numbers.

> "It's a real finding and it's on the result sheet by design. But I measured it rather
> than argued about it. Take the responder qualification/mix from one qualified receiver in ten up to five in
> ten: ANGEL SWARM goes from twenty-three point five to twenty point nine, current
> tasking goes from twenty-seven point seven to twenty-six point two. Both improve —
> and **the gap widens**, from four point two to five point four. Better-trained
> responders make the tasking decision matter *more*, not less. They're complements.
> The other half of that answer is that 'nobody could administer' is completely inert
> to fleet size — twelve point zero deaths at every fleet size we swept. You cannot buy
> your way out of it with airframes, which is exactly why it belongs on the screen."

### ⚠ Q5 · "Where does the physiological deadline come from? Is that model driving the tasking?"

> "No, and the application says so on its own Sensor screen. CRI-Net is real — a
> hundred and four thousand parameter one-dimensional CNN over five seconds of
> photoplethysmogram at a hundred hertz, mean absolute error 0.069 against 0.159 for
> heart rate alone, on seventy held-out subjects, and it refuses to answer when the
> signal is poor. But its output does not reach the allocator in this build. The
> deadlines the tasking uses come from the scenario's own physiology model. I'd rather
> tell you that than have you assume a tighter integration than exists."

### Q6 · "How much of this is AI?"

> "Deliberately less than you'd expect. Two sets of trained weights ship — a hundred
> and four thousand parameter CNN for the physiology, and a sentence encoder for
> doctrine retrieval — and two destinations of the fourteen carry the mark at all.
> **There is no language model. Nothing on any screen is generated**, and Ask ANGEL's
> own header says exactly that. That is the stronger claim, not the weaker one: a
> template over the run record cannot hallucinate a casualty count, and a verbatim
> quote cannot invent doctrine. The tasking optimiser carries no mark and never has —
> it is arithmetic against hard constraints, and an earlier build that marked it as AI
> was corrected on the screen itself. The absence of the mark is what makes the mark
> mean anything."

### Q7 · "Could this actually get an ATO?"

> "Not as it stands, and the package says that in those words. What it does have is a
> STRIDE threat model over ten assets and seven trust boundaries with every mitigation
> split into what's in place and what's still required, a residual risk register, and
> an RMF pathway naming the NIST 800-53 Rev 5 families already partly satisfied by
> design. Some things are genuinely in our favour: zero network egress — measured, not
> asserted — loopback only, no PHI, synthetic data, a static CGO-free Go binary, every
> dependency vendored and hashed in a CycloneDX bill of materials. The hard part isn't
> the architecture, it's that CC SRG revision five now pulls IL5 to the FedRAMP High
> baseline, and that's a programme timeline, not a hackathon one."

### Q8 · "What would you do with three more months?"

> "Three things, in order. One: telementoring, because 'nobody could administer' is the
> largest remaining bucket and it is the only one that doesn't respond to more
> aircraft. Two: close the loop from CRI-Net to the allocator, which is the honest gap
> I flagged a moment ago. Three: validate the receive-only CoT path against real
> acquisition components. Keep the roles exact: Sempulse Halo (example), CipherOx
> CRI M1 (reference), and BATDOK-J as a separate plausible producer/interface.
> ANGEL SWARM has not tested an integration with any real one of them."

### Q9 · "Why drones? Why not just evacuate faster?"

> "Because the premise of the scenario is that you can't. Colonel Jason Corley,
> Director of the Armed Services Blood Program, June 2026 — evacuation delayed beyond
> seventy-two hours. The Golden Hour was an evacuation mandate and it assumed air
> superiority we should not assume in the Pacific. The blood standard is thirty-six
> minutes, JTS clinical practice guideline eighteen. If you can't move the casualty
> inside thirty-six minutes, the only remaining variable is moving the blood."

### Q10 · "What happens when the datalink goes down?"

> "It's a lever on the War Game screen, so you can sweep it rather than take my word.
> Aircraft already tasked continue on their last order; the allocator degrades to
> local state without reachback and the interface says which of the two it's doing.
> Denial makes both arms worse. It doesn't invert the result."

### Q11 · "Is any of this real data?"

> "None of it, and that's deliberate — the banner says SYNTHETIC DATA on every screen.
> No PHI has ever touched this and the ATO conversation is much shorter for it. The
> physiology, the doctrine quotes and the blood standards are real and cited; the
> casualties are not."

### Q12 · "Who else is doing this?"

> "For medical resupply specifically, tasking by physiological deadline is not
> something I could find in doctrine or in a fielded system — which is the whole reason
> I built it. Deadline-driven scheduling is old and well understood in other domains.
> The novelty is the objective function and the domain, not the mathematics."

### ★ Q13 · "Where does that map come from? Is it hitting a tile service?"

**Want this one. It is a strength and it is not in the four minutes.**

> "Nothing on that screen is fetched. There is no tile server, no basemap key, no
> network call at any of the four scales. The coastlines and the international
> boundaries are Natural Earth one-to-fifty-million, generalised offline and shipped
> inside the build — the globe's world outline is embedded in the source file itself
> as integer deltas, about two hundred and twenty kilobytes, so it is not even a
> separate asset to fetch. The terrain under it is computed procedurally at load, and
> the map says so on its own face: **relief is shading, not elevation.** Every line
> that carries a claim — coastline, boundary, area of responsibility, where an
> operation actually is — is real data drawn over the top of it.
>
> And you can test that in one gesture. **Pull the cable and spin the globe.**"

**Pull the network cable, or turn Wi-Fi off, then spin the globe and switch scales.**
It is a ten-second demonstration and it is worth more than any sentence you can say
about air-gapping.

#### The stage directions, because this is the part you will actually do

**Theater Map → the `GLOBE` chip.** You arrive on the map at THEATRE; the globe is
one press to its left in the scope switch. Drag to spin. Leave it alone for three and
a half seconds pulled all the way out and it turns by itself.

**Then pick your operation before you zoom.** Either click it on the sphere or click
its card in the list beside the map — both push the same selection down. **An explicit
selection wins outright**, so the zoom honours it even if something else is nearer the
middle of the frame. If you spin away from your selection it is dropped, deliberately,
so the two rules can never argue.

**Then scroll in.** Past about half the width of the command that owns the operation,
the last of the gesture is flown for you: an **1,100 ms** flight ending at about
**350 km across**, which is within a few per cent of what the tactical sheet opens on.
The disc fades over the last third of the flight and the scale chip changes *after* it
lands, not during — so what the room sees is one continuous move rather than a chip
changing under your hand. The classification stamp moves with it.

**Zoom in over open ocean and it declines.** The zoom is held at its floor rather than
snapped back, and the picture says `NO OPERATION UNDER THIS ZOOM — SPIN OR PICK ONE`.
That is correct behaviour, not a fault — but it is a bad twenty seconds in front of
judges, so put the operation under the middle of the frame first.

*If it is asked, and only then:* **through v6.3 every zoom on this globe landed on
JOA CORAL** — the handoff read the loaded scenario and never looked at the camera,
and the host then discarded even that answer. Both ends are fixed and all seven
theatres were verified by zoom. Saying so is evidence the project tests itself;
volunteering it is not.

*Three details to have, and only if you are pushed. The globe is drawn in **canvas
2D**, not on the GPU — deck.gl's globe view is not in the bundle we vendored, and
doing it in 2D means it holds no GPU context, which is what a browser evicts first on
a laptop with switchable graphics. The coastline carries **34,416 vertices**, four
times what it carried a week ago, which is why Japan reads as five islands and the
Philippines as seven rather than as blocks. And the theatre map is **north-up by
default**, with the oblique camera as a control you press: a pitched map makes a hero
shot and a bad chart.*

**Do not** call it a deck.gl globe or a 3-D globe. It is canvas 2-D and someone in
that room will know the difference.

### Q14 · "What's that strip along the bottom of the map?"

**You have to open it first — it is not on screen when you arrive.** Click a casualty
on either tactical picture and it opens the sortie that carried something to *that*
casualty; click an aircraft and it opens that airframe's most recent sortie. Nothing
else opens it. The ✕ on its header or Escape puts it away, and it stays shut until you
pick something different.

> "That's one sortie, stop by stop. A route line tells you where an aircraft went; it
> can't tell you what it was *for*. That strip does: every casualty on a chained run,
> what each one was given, and how much of their own deadline was left when it
> arrived. The stop it's flying at this minute is ringed. A stop it hasn't reached
> yet prints an ETA rather than a fact, and prints no margin at all — this
> application doesn't colour a slack figure it hasn't measured yet."

*It appears on the two tactical scales only, and only where there is 150 px of clear
width between the panel columns. The globe and the theatre are command-wide pictures
and one sortie's stops are not at their scale. Everything in it comes off the engine's
own sortie log and delivery ledger — including the failures: a stop overtaken before
the aircraft arrived, or a payload nobody present could use, is named rather than
dropped.*

**If you click a casualty and nothing opens, that is the answer, not a bug.** No
sortie ever reached them, so there is no sortie status to show and the record panel is
what acknowledges the click. Say that out loud if it happens — it is a better line
than any strip: *"nothing was ever flown to him, and the application will not invent a
route to fill the space."*

*Through v6.3 the strip defaulted to a sortie and was on screen the moment you arrived
— an arbitrary aircraft's route that nobody had asked about. It is a detail view and it
behaves like one now. If a judge saw an earlier build, that is what changed.*

### ⚠ Q15 · "Is MiniLM actually scoring that doctrine panel?" — or — "Your risk register says R-11 is open."

**The badge was wrong and it was corrected. Say that immediately and do not defend
the old wording.**

> "No, and the screen now says so. That panel reads `TERM OVERLAP · NO MODEL ON THIS
> PATH`, and Ask ANGEL's doctrine answers read `DOCTRINE · QUOTED VERBATIM, NOT
> GENERATED` — neither carries the violet mark this application reserves for model
> output. It scores an eleven-passage inline set by term overlap, the score is honest
> and the floor was measured on twenty-two questions the set answers against
> twenty-four it doesn't. The encoder is real — twenty-two point nine megabytes of
> int8 ONNX, it ships, it loads, and it runs the doctrine view in the analyst console
> over the full hundred-and-sixty-one-passage corpus. It just isn't on this path, and
> the label used to say it was."

**If they are reading R-11 out of the security document:**

> "That entry describes the badges before they were fixed, and it hasn't been
> rewritten. The screen is ahead of the register, not behind it — open the panel and
> read the chip."

*Then move on. Conceding a label fast costs far less than being caught defending it,
and the register entry being stale is a documentation lag rather than a claim on
screen. This is the same class of error the team found and fixed on Ask ANGEL's
header in an earlier version, and saying so is evidence that the project audits
itself.*

---

### The portfolio questions — Q16 to Q21

**Every name, date and quotation below is in `RESEARCH/COMPLEMENT-SECTION.md` and was
verified by search on 8 September 2026. Do not add a program to these answers. Do not
round a date. If you are asked about something not in here, Q8's answer applies: "I
don't know — I'd have to look."**

### ★ Q16 · "How is this not just another program competing with what we already fund?"

**Want this one.** It is the question the 3:30 beat was built to invite.

> "Because the Department has already bought every layer around this decision and has
> not bought the decision. Below it, the airframes exist and fly themselves — NAVAIR's
> PMA-263 fields the TRV-150 through Unmanned Logistics Systems–Air, and the Marine
> Corps variant has reached initial operational capability. Its published behaviour is
> automated launch, waypoint navigation, automated landing and payload release. It
> flies the mission it is given. We produce the mission it is given.
>
> Beside it, DIU announced the AI-Assisted Triage and Treatment Tool on 25 February
> 2026 — digital triage, assessment and documentation, replacing a paper process. Its
> scope does not include allocating or tasking evacuation and resupply assets. We
> consume what that program produces and we produce an aircraft assignment. Two
> adjacent buys, zero overlap.
>
> Above it, the command layer consolidated on the Maven Smart System in March. We are
> an application for that layer.
>
> This is not a new aircraft, not a new command system, and not a replacement for
> anything currently funded. It is the one rule none of those programs bought."

*If you have to shorten it, keep the airframe half — "it flies the mission it is given,
we produce the mission it is given" is the sentence that does the work.*

### Q17 · "Why isn't this part of Maven, or CJADC2?"

**The correct answer is "it should be," said without hesitation.** Hedging here reads
as not having thought about acquisition.

> "It should be, and there is a named path. On 9 March 2026 the Deputy Secretary
> designated the Maven Smart System a program of record and moved its administration to
> the CDAO MSS Program Office. The FY27 request funds third-party vendors to develop
> and field applications on MSS. We are an application for that pipeline, not a parallel
> command-and-control system — we contribute a decision surface, we do not stand up a
> data environment.
>
> The contractual mechanism is Open DAGIR's OTA, which exists specifically to onboard an
> outside capability to that application layer without it owning the data underneath."

*Why this matters more than it looks: the Department has decided the C2 application layer
consolidates on MSS. To a 2026 acquisition audience, a standalone application with no
described path onto MSS reads as something that will be consolidated away. Naming Open
DAGIR is the mitigation. Do not describe CDAO as ascendant — it was realigned under
USD(R&E) in August 2025 and that was publicly read as a demotion. Describe it only as the
office that owns the program office you would ride.*

### ⚠ Q18 · "CDAO already has Agent Network. Aren't you duplicating it?"

**Claim the lane first. Say this before a judge says it to you — if it comes out of
their mouth first you are a feature, and if it comes out of yours you are a gap being
filled.** This is the single most dangerous question in the set and the answer is to
agree with the premise and then use it.

> "Architecturally we are the same object, and I'd rather say that than have you point
> it out. Agent Network — announced June 2026 — is bounded agents that deliver decision
> options to a commander in seconds and make no targeting or strike decisions. That is
> exactly what this is. Its published operating partners are EUCOM, INDOPACOM and
> SOUTHCOM, and its published use cases do not include medical logistics.
>
> **So: this is an Agent Network-class capability for the medical lane.** Same bounded-
> agent contract, human on the loop, no strike authority, in the one mission area the
> framework has not populated. That is a lane to be filled, not a program to displace."

*Do not claim to be inside Agent Network — you are not, and there is no public
enrolment you can point to. Claim the architecture and the empty lane, which are both
public and both checkable. And do not say "competitor." You are describing where you
fit inside something the Department already chose.*

### ★ Q19 · "Isn't this DoD Directive 3000.09 territory? Autonomy in weapon systems?"

**Want this one badly. It is the strongest policy claim in the package because it is
verbatim, and it is a paragraph number you can cite from memory.**

> "No, and the Directive says so in its own words. DoD Directive 3000.09, 25 January
> 2023, paragraph 1.1.b excludes from applicability 'unarmed platforms, whether remotely
> operated or operated by onboard personnel, and whether autonomous or semi-autonomous,'
> and 'autonomous or semi-autonomous systems that are not weapon systems.' We task
> unarmed aircraft carrying blood. The Directive excludes us on both counts.
>
> The rulebook that does apply is DoDI 8510.01 and the Risk Management Framework, and
> that assessment is written down in the security annex rather than asserted here — see
> Q7 for how far it actually goes, which is not all the way."

*Saying which rulebook applies, unprompted, is what shows you know the difference. Do not
overreach into Q7's territory: the honest answer there is still "not as it stands."*

### ⚠ Q20 · "TATRC is already doing autonomous blood delivery."

**Draw the line yourself. A judge from TATRC will draw it for you otherwise, and their
version will not be flattering.** Concede the adjacency immediately and completely —
these programs are real, they are close, and pretending otherwise is the fastest way to
lose the room.

> "They are, and this builds on that rather than around it. The MEDRAS portfolio funds
> autonomous **transport** — including just-in-time whole blood delivery by UAS —
> autonomous **documentation**, and autonomous **treatment**, across sixteen projects.
> Allocation is not a category in that portfolio. **We task those transport programs. We
> do not duplicate them.**
>
> And the mission is not speculative: Project Crimson flew refrigerated FVR-90 whole
> blood to field medics at Project Convergence 2022, with BATDOK carrying patient data
> at the medic edge. That is prior art I build on, and it is four years old."

*Be exact about Crimson's date — say "2022" out loud. Presenting four-year-old prior art
as current is the error that would cost you the person most likely to know it. And do not
name a MEDRAS project you cannot describe; "sixteen projects, three categories, allocation
is not one of them" is the whole claim and it is enough. Do not turn historical BATDOK
prior art into an ANGEL SWARM integration claim: BATDOK-J is only a plausible
producer/interface here, and the receive-only, off-by-default listener accepts a
prototype CoT `<detail>` dialect. No real Sempulse Halo (example), CipherOx CRI M1
(reference), or BATDOK-J integration has been tested.*

### ⚠ Q21 · "That army.mil article says they were trained to operate the aircraft manually — that's not the same as the tasking being manual."

**This is the most likely hostile follow-up in the whole deck, because it is the one
place a judge can read the source faster than you can explain it. They are right.
Concede it in one sentence and hand them the three scope statements — the claim does
not need that article and never rested on it.** Do not defend the reading. Do not say
"well, in context." The moment you argue with a document the judge has open, you have
traded a correct argument for a wrong citation.

> "You're right, and I don't use it for that. That article is about flying the
> aircraft by hand — soldiers trained to operate the systems manually. It tells you
> nothing about who decides which aircraft goes to which casualty, and I'm not going
> to stretch it into saying that.
>
> The allocation claim rests on three programs describing their own scope. DIU's
> AI-Assisted Triage and Treatment Tool, announced 25 February 2026: triage,
> assessment and documentation. It does not buy allocation or tasking of evacuation
> and resupply assets. TATRC's MEDRAS portfolio: sixteen projects, three categories —
> autonomous transport, autonomous documentation, autonomous treatment. Allocation is
> not a category in it. And NAVAIR PMA-263's TRUAS: automated launch, waypoint
> navigation, automated landing, payload release. It flies the mission it is given.
>
> What the 44th Medical Brigade validation proves is the other half — the mission is
> real and the aircraft are fielded. That is all I claim from it."

*Three scope statements, three programs, each one a program saying what it is not
buying — that is a documented absence, not an inference, and it is the difference
between an argument that survives a judge with a laptop and one that does not. If you
can only hold one of the three, hold DIU: it is the most recent, it is the most
specific, and it is the program most likely to be in the room.*

---

## 5 · Failure drills

Rehearse each of these once. Thirty seconds each.

| If | Then |
|---|---|
| The run doesn't start | Say "let me show you the resolved record instead" and go straight to **Evidence → Counterfactual**, which carries the same three numbers without a clock. |
| The projector loses the laptop | The 60-second film is your fallback deck. Have it on a phone as well. |
| A judge takes the keyboard | Let them. Settings → change the theatre. The headline strip re-reads from the engine and the numbers change, **and since v6.4 the map underneath follows** — the classification stamp and the picture name the same operation. Through v6.3 they did not, so if you rehearsed this drill on an older build, expect it to look better than you remember. That is a better demo than yours. |
| You're at 4:30 and not done | Skip the Data Sources sentence and the security sentence. **Keep the complement beat** — it is four sentences and it is the only thing in the run that places you in the portfolio. Land on it and stop. |
| **TACTICAL 3D is blank or flat pale** | Do not wait on it. Switch to **TACTICAL 2D** and say "the GPU view is the same fight with time drawn as height — the flat sheet is the one that carries the argument." The application recovers a lost GPU context on its own within about a second, and falls back to a canvas map if it cannot; either way the picture comes back, but not on your clock. |
| **THEATRE won't draw** | Same move — 2D. The theatre picture is context, not evidence. |
| **The globe is slow to appear on the projector** | Give it one beat, then move on to THEATRE. The globe is a bonus, not a beat in the four minutes; save it for Q13 when someone asks about the map. |
| **You zoom the globe too far and it flies you to the tactical map** | That is the design, not a fault. Say so: "past the command's own width there's nothing left to see up there, so it hands the view down." Do not apologise for it. |
| **The globe says `NO OPERATION UNDER THIS ZOOM`** | You are zooming over open water. It is declining rather than guessing, and the zoom is held rather than snapped back. Say "there's nothing under here — it won't invent a destination", spin to the operation or click its card, and go again. Correct behaviour, said confidently, is worth more than a smooth zoom. |
| **You click a casualty and no route strip appears** | Also correct. No sortie ever reached them, so there is no sortie status to show. Say "nothing was ever flown to him" and read the record panel instead, which is what acknowledges the click. **Do not click around hunting for the strip** — click an aircraft if you need one on screen. |
| **The route strip is not on screen and you expected it** | It has not opened by itself since v6.4. Click a casualty or an aircraft. Escape closes it again. |
| Asked something you don't know | "I don't know — I'd have to measure it." Then say what you *would* measure. Every judge has heard a bluff before. |

---

## 6 · Against the scoring rubric

Where each part of the four minutes is earning points, so that if you have to cut,
you cut the cheapest thing.

| Criterion | Earned by | Cut last? |
|---|---|---|
| Technical Innovation | The "no doctrine names it" opening + the objective-function answer (Q1) | **Never cut** |
| Mission Impact | 35 / 34 / 23, and the 38-sorties-per-death line | **Never cut** |
| Usability & Design | The cold screen carrying the answer, and the 18-second run | Keep — it costs 30 s |
| Usability & Design (in reserve) | The map, if asked: four scales, nothing fetched, spins with the cable pulled, and the globe's zoom flies you into the operation you chose (Q13) | **Answer material only.** The twenty seconds that used to fund it on stage now fund the complement beat — see §2. Take it at Q13, where the judge pays for it |
| Security & Sustainability | The self-test page + one sentence on *no outbound request, measured* and the SBOM — **not** the word air-gapped, see §3 | Keep — it costs 30 s |
| Interoperability | **The 3:30 beat.** Where this sits: the 44th Medical Brigade validation, the unbought allocation rule and the three scope statements that carry it, the MSS third-party application layer — plus the one surviving Data Sources clause, *FHIR-shaped, not conformance-tested* | **Never cut.** This row changed in v6.5: it used to be BATDOK-J and the FHIR bundle in full, and it used to be *cut first if long*. It is now the beat that answers where this fits a funded portfolio, and it is the cheapest place in the run to lose the most |
| Interoperability (in reserve) | Q16 – Q20: the airframe layer, DIU triage, Maven and Open DAGIR, the Agent Network lane, 3000.09, TATRC | Answer material only. Do not spend clock on it — the beat exists to make them ask |
| Team Collaboration | Not on stage — it's in how you answer "what would you do next" | — |

**Two rows moved, and the total did not.** *Interoperability* changed both what earns it
and its cut priority: it was Data Sources spoken in full and marked *cut first if long*;
it is now the complement beat and marked never cut, because it is the only place in four
minutes that answers *why does this belong in a portfolio you already fund* — and because
what remains of Data Sources inside it is one clause, so there is nothing cheap left to
cut. *Usability & Design (in reserve)* lost its on-stage funding to that change and is now
strictly answer material at Q13. Nothing was added to the rubric's criteria and no
criterion's weight changed.

---

## 7 · The three numbers, cold

If you remember nothing else under pressure:

- **35 → 34 → 23.** Nothing flown, today's tasking, ANGEL SWARM. On **0, 38 and 20** sorties.
- **38 sorties to convert one death.** That is what today's tasking buys.
- **The self-test covers engine and host UI behavior**, including determinism,
  common random numbers, scenarios, War Game worker failure/cancellation and
  standalone RESUPPLY TRACK behavior. Read its live summary; do not quote a stale total.
- **Seven theatres out of seven.** 1,400 paired battles, adverse in 5, never by more
  than one. Wins the scenario every time; individual battles vary.
- **10 of the 23 are "nobody on scene could administer."** The largest bucket, and the
  one that does not move with more aircraft — 12.0 deaths at seven airframes and 12.0
  at twenty-one.
- **Zero-network baseline.** The current Windows launcher and its adjacent `app/`
  loaded the core application and self-test with egress blocked on 9 September
  2026. The earlier full navigation measurement covered the then-current thirteen
  destinations, all four map scales and two screen sizes with zero off-origin
  requests.
- **44th Medical Brigade, May 2026, Soaring M25.** The aircraft are bought — that
  validation is what proves it, and it proves nothing else. **The allocation rule is
  unbought: DIU (25 Feb 2026), TATRC MEDRAS, NAVAIR PMA-263 — outside all three
  scopes.** If you get one fact wrong on stage, do not let it be these — they are the
  whole complement argument and every one is checkable in one search. Never offer the
  training article as evidence about the tasking; it is about operating the aircraft
  by hand. Q21.
- **Maven Smart System, program of record 9 March 2026.** FY27 funds third-party
  applications on it. That is the layer this rides.

**And the five you must never say:** *emits CoT* (it ingests), *FHIR-compliant* (it is
FHIR-shaped, not conformance-tested), *Replicator-aligned* (medical logistics is in
neither Replicator's scope), *air-gapped* (§3), and *"the tasking was manual — the
Army's own account"* (the article says soldiers operated the aircraft by hand; the
allocation claim rests on DIU, TATRC and NAVAIR's own scope statements). Read §3 once
more before you walk in.
