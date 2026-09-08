/* =========================================================================
   SURGEON — eight destinations, and one question.

   The role engine gives a surgeon eight places to stand: CASUALTIES,
   MISSION, FLOW, STREAM, SENSOR, DOCTRINE, TASKING, UNITS. All eight
   already existed; all eight were written for an analyst. This file makes
   them the shape of the question the person reading them is actually
   asking, which is never "what did it cost". It is:

       who is dying, how fast, who can reach them, and is anyone on scene
       qualified to treat what they need.

   Four things follow from that, and they govern every line below.

   CASUALTIES WAS THE WORST PANE IN THE APPLICATION AND IT IS THIS ROLE'S
   LANDING VIEW. Measured at 2,306 visible elements and 133 controls — six
   screens of register, 125 of those controls being one star per row — it
   was more than half of everything this profile put in front of a surgeon.
   A clinician does not read a register. He reads a worklist: the casualties
   whose clock is running out, worst first, and nothing else above the fold.
   So this pane leads with four counts and a worklist of the wounded who are
   still losing compensatory reserve, ordered by how long they have left.
   The 125-row register, its search box, its six filters and its 125 star
   toggles are all still there, one labelled control away, unmodified.

   THE TIER GAP IS THE CLINICAL FAILURE MODE THIS MODEL EXISTS TO SHOW, AND
   IT WAS NOWHERE ON THE LANDING VIEW. Whole blood and plasma are Tier 3
   skills — a 68W combat medic. The tier mix in this simulation is 58%
   buddy, 32% combat lifesaver, 10% medic, so most casualties who need blood
   have somebody on scene who is not allowed to give it. That is not a
   supply problem and no quantity of aircraft touches it; it is fixed by
   choosing the payload against the responder, or by telementoring the
   responder through the procedure. It is now the third of the four counts
   at the top of CASUALTIES and it is called by its name.

   ROLES REMOVE SURFACE, NEVER CAPABILITY. CASUALTIES is the one pane this
   file genuinely overrides, and the override delegates to the native
   renderer — for every other role untouched, and for this one the moment
   the register is unfolded. The other seven are *reduced*: the native
   renderer runs first and unconditionally, this file adds the clinical
   answer at the top, and the blocks a surgeon does not act on are folded
   behind one control rather than deleted. Nothing is removed from the
   document, so switching to ANALYST mid-sentence returns every pane whole.

   DEATHS ARE NEVER GREEN. Nothing in here colours a toll green and nothing
   says "saved". "Fewer dead" is the phrase, the target is zero, and on this
   role's panes a death is a casualty whose physiological deadline passed
   with nobody qualified, or nobody in range, or nobody in time.

   EVERY COUNTED NOUN COMES FROM `COUNT`. The quantities this file prints —
   deaths of survivable wounds, deaths in every triage category, ground-stream
   events, payloads administered — are defined once at the head of app.js and
   read from there, never re-derived. Two of them had drifted: the whole-
   stream figure on STREAM read 77 against the shell's 78, and the strip above
   it read "27 DEAD" against a run of 31, because both were filtered at the
   mission clock rather than at COUNT.clock(), which opens to the whole record
   the moment the run is finished. Both are now COUNT calls. The labels come
   from COUNT.LABEL for the same reason: three different populations in this
   application can be described as "died", and a figure that does not name
   its population is a figure a reviewer is entitled to distrust.

   HOW THIS ATTACHES. renderCasualties, renderDrawer, renderMission,
   renderStream, renderTasking and renderUnits are called by name from
   render() in app.js, ahead of the ANGEL.views registry, so this file wraps
   those six globals. Each native binding is captured in a local const
   before its wrapper is installed, so no wrapper can resolve back to itself
   — the mistake that costs a stack overflow on first call and has been made
   once in this application already (ROLE_CONTRACT §3). FLOW, SENSOR and
   DOCTRINE are contributed by deferred ES modules through ANGEL.views and
   may not exist when this file runs, or ever; those three are wrapped
   opportunistically on every 'status' event from the boot registry, which
   is what fires when such a module finishes loading.

   WHAT IS MARKED, AND THE PREFIX. Every element this file creates carries
   data-roles="SURGEON" as it is created, per the contract's "mark up, do
   not filter" rule, so it is correct on arrival and stays correct through a
   rebuild without this module being told anything. Every stylesheet rule
   that hides a native block is scoped to body[data-role-profile="SURGEON"].
   The prefix is `sg`, checked against every class, id and identifier in
   app/ before a line was written: it collides with nothing. (`sq` was the
   obvious choice and would have sat one character from the .sqlGrid /
   .sqlBox / .sqlPad family on the DATA pane; the logistician profile lost
   an afternoon to `lg` landing on the map legend's own class.)
   ========================================================================= */

(function () {
  'use strict';

  /* Above-the-fold budget on the design viewport: 1000px of window, less the
     22px classification band, less a 52px single-row command bar, less the
     pane's 34px of vertical padding and its ~46px head. That leaves ~845px,
     and the two blocks that answer the question — the four counts, and the
     worklist — are sized to fit inside it with fourteen rows showing. */

  const CSS = `
/* ------------------------------------------------------------- SURGEON --
   A clinical screen: four counts a surgeon can act on, then a worklist in
   the order the bodies will fail. Dense, monospaced where it is a number,
   and never a chart where a row would do. Nothing here loads unless this
   file loads, and every rule that hides a native block is scoped to the
   surgeon profile so the other three roles cannot see it.
   ---------------------------------------------------------------------- */

/* ---- mounts ------------------------------------------------------------ */
/* .pane is a flex column that scrolls, and style.css gives flex:0 0 auto to
   the child types it knows about (.card, .split, .kpis, .filters …). A mount
   this file adds is not one of those, so it would default to flex:0 1 auto,
   be shrunk by the pane, and — its children being overflow:hidden cards —
   collapse to their own borders. Both the mount and its blocks are pinned. */
#sgCas, #sgStream, #sgUnits, #sgTaskTop, #sgDocTop, #sgSensorTop, #sgFlowTop{
  display:flex; flex-direction:column; gap:12px; flex:0 0 auto; min-width:0;
}
#sgCas > *, #sgStream > *, #sgUnits > *{flex:0 0 auto}
/* One exception, and it has to come after the rule above to beat it on
   source order: the clinical event list is the thing on STREAM that should
   take whatever height is left. */
#sgStream > .sgScroll{flex:1 1 auto; min-height:140px}

/* ---- the four counts --------------------------------------------------- */
.sgTiles{display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px}
@media (max-width:1180px){ .sgTiles{grid-template-columns:repeat(2,minmax(0,1fr))} }
.sgTile{
  background:var(--panel); border:1px solid var(--line); border-radius:11px;
  padding:12px 15px; display:flex; flex-direction:column; gap:6px; min-width:0;
}
.sgTile.hot{border-color:rgba(255,66,87,.45);
  background:linear-gradient(180deg, rgba(255,66,87,.09), rgba(255,66,87,.015))}
body.light .sgTile.hot{background:linear-gradient(180deg, rgba(214,31,56,.08), rgba(214,31,56,.015))}
.sgTile h4{margin:0; font:700 8.5px/1.3 var(--mono); letter-spacing:.13em; color:var(--faint)}
.sgTile .sgN{display:flex; align-items:baseline; gap:9px; min-width:0}
.sgTile .sgN b{font:800 38px/1 var(--mono); letter-spacing:-.025em; color:var(--text)}
.sgTile .sgN b.bad{color:var(--bad)} .sgTile .sgN b.warn{color:var(--warn)}
.sgTile .sgN b.calm{color:var(--dim)}
.sgTile .sgN i{font:500 10.5px/1.3 var(--sans); font-style:normal; color:var(--dim); min-width:0}
.sgTile p{margin:0; font:400 10.5px/1.55 var(--sans); color:var(--dim)}
.sgTile p b{color:var(--text)}

/* The plain-language line under a term of art. It is said once per pane,
   the first time the term appears, and never repeated further down. */
.sgGloss{
  margin:0; padding:8px 12px; border-left:2px solid var(--line2); border-radius:0 6px 6px 0;
  background:var(--panel2); font:400 11px/1.6 var(--sans); color:var(--dim);
}
.sgGloss b{color:var(--text)}

/* ---- the worklist ------------------------------------------------------ */
.sgTable{width:100%; border-collapse:collapse; font-size:11.5px}
/* The header wraps. The worklist names nine columns whose preferred widths
   sum to 1320px; nowrap on the header turned that sum into a minimum, so the
   table could only overflow its card — and the card, being overflow:hidden,
   would have taken the last column off rather than showing it. Wrapping lets
   the columns compress first, and polish.css §7 scrolls the card rather than
   clipping it if they cannot compress far enough. */
.sgTable th{
  text-align:left; padding:7px 11px; background:var(--panel2); border-bottom:1px solid var(--line);
  font:700 8.5px/1.25 var(--mono); letter-spacing:.11em; color:var(--faint);
  white-space:normal; overflow-wrap:break-word; min-width:0;
}
.sgTable td{min-width:0}
.sgTable th.num, .sgTable td.num{text-align:right}
.sgTable td{padding:6px 11px; border-bottom:1px solid var(--line);
  vertical-align:middle; white-space:nowrap}
.sgTable tr:last-child td{border-bottom:0}
.sgTable tbody tr{cursor:pointer}
.sgTable tbody tr:hover{background:rgba(125,165,205,.07)}
.sgTable tbody tr.sel{background:rgba(49,214,138,.10); box-shadow:inset 2px 0 0 var(--angel)}
.sgTable tbody tr.past td{background:rgba(255,66,87,.07)}
.sgTable tbody tr.past:hover td{background:rgba(255,66,87,.11)}
.sgTable td.wide{white-space:normal; font:400 11px/1.5 var(--sans); color:var(--dim)}
.sgTable .mono{font-family:var(--mono)}
.sgTable td.hot{color:var(--bad)} .sgTable td.warm{color:var(--warn)} .sgTable td.calm{color:var(--dim)}
.sgStar{color:#ffd24a; margin-right:5px}

/* The one flag that is this role's whole argument: what the wound needs and
   what the person kneeling next to it is allowed to give are two different
   lists. Amber, not red — the casualty is not beyond help, the help simply
   is not authorised to be there. */
.sgGap{
  display:inline-block; margin-left:6px; padding:2px 6px; border-radius:4px;
  font:700 8.5px/1.3 var(--mono); letter-spacing:.06em;
  background:rgba(255,179,64,.16); color:var(--warn);
}
.sgOk{color:var(--ok)}

/* ---- the strip carried onto the reduced panes -------------------------- */
.sgLine{
  display:flex; align-items:baseline; gap:14px; flex-wrap:wrap;
  border:1px solid var(--line); border-radius:10px; padding:10px 15px; background:var(--panel);
}
.sgLine .sgV{font:800 27px/1 var(--mono); letter-spacing:-.02em; color:var(--text)}
.sgLine .sgV.bad{color:var(--bad)} .sgLine .sgV.warn{color:var(--warn)}
.sgLine .sgV.calm{color:var(--dim)}
.sgLine .sgT{font:500 12px/1.45 var(--sans); color:var(--text); flex:1 1 340px; min-width:0}
.sgLine .sgT em{font-style:normal; color:var(--dim)}
.sgLine .sgT b{font-family:var(--mono)}
.sgLine .sgTag{
  font:700 8.5px/1 var(--mono); letter-spacing:.14em; color:var(--faint);
  border:1px solid var(--line); border-radius:4px; padding:5px 7px; white-space:nowrap;
}
.sgBody{padding:11px 14px; display:flex; flex-direction:column; gap:9px}
.sgBody p{margin:0; font:400 11px/1.6 var(--sans); color:var(--dim)}
.sgBody p b{color:var(--text)}
.sgChips{display:flex; flex-wrap:wrap; gap:6px}
.sgChips .chip{
  border:1px solid var(--line); background:var(--panel2); border-radius:7px;
  padding:7px 11px; cursor:pointer; font:500 11px/1.25 var(--sans); color:var(--dim);
}
.sgChips .chip:hover{color:var(--text); border-color:var(--line2)}

/* ---- the "show the register" affordance -------------------------------- */
/* One control per reduced pane. It never deletes anything: the blocks a
   surgeon does not act on are folded, and the fold is labelled and
   tab-reachable. */
.sgMore{
  display:inline-flex; align-items:center; gap:7px; cursor:pointer;
  border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:6px 10px;
  font:700 9.5px/1 var(--mono); letter-spacing:.1em; color:var(--dim);
}
.sgMore:hover{color:var(--text); border-color:var(--line2)}
.sgMore::after{content:'+'; font-size:12px; line-height:1}
.sgOpen .sgMore::after{content:'−'}

/* =======================================================================
   CASUALTIES — overridden, not reduced.
   The register, its search box, its six filter chips, its count and its 125
   star toggles are one control away and are the native pane, unmodified.
   What stands above the fold instead is four counts and a worklist.
   ======================================================================= */
body[data-role-profile="SURGEON"] [data-pane="CASUALTIES"] .ph1 p{display:none}
body[data-role-profile="SURGEON"] [data-pane="CASUALTIES"]:not(.sgOpen) .filters,
body[data-role-profile="SURGEON"] [data-pane="CASUALTIES"]:not(.sgOpen) #casSearch,
body[data-role-profile="SURGEON"] [data-pane="CASUALTIES"]:not(.sgOpen) > .pane > .tableWrap{
  display:none !important;
}
/* Unfolded, this pane is the register again. The four counts and the gloss
   stay — they are the reading of the register, not a second copy of it —
   and the worklist folds, because a worklist stacked above the register it
   is drawn from is two tables of the same people and a screen and a half of
   scrolling before the operator reaches the thing he asked for. */
body[data-role-profile="SURGEON"] [data-pane="CASUALTIES"].sgOpen #sgCas > .card{
  display:none !important;
}
body[data-role-profile="SURGEON"] [data-pane="CASUALTIES"].sgOpen > .pane > .tableWrap{
  flex:1 1 auto; min-height:260px;
}

/* =======================================================================
   THE RECORD DRAWER — reduced.
   189 elements is larger than six entire views in this application, and it
   opens on top of whichever pane the operator is standing on. What a
   clinician acts on stays: the wound, what it indicates, who is on scene
   and what that person is qualified to give, the reserve and its trend, the
   time to collapse, and what was delivered and when. What folds is the
   device card and its six-row telemetry feed, the aircraft-selection table,
   and the authorisation record — evidence, all of it, and all of it one
   control away at the foot of the drawer.
   ======================================================================= */
body[data-role-profile="SURGEON"] #drawer:not(.sgOpen) .sgFold{display:none !important}
#sgDw{
  display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin:0 0 12px;
}
#sgDw .sgDwCell{
  background:var(--panel2); border:1px solid var(--line); border-radius:8px; padding:8px 10px; min-width:0;
}
#sgDw .sgDwCell.wide{grid-column:1/-1}
#sgDw .sgDwCell.hot{border-color:rgba(255,66,87,.45); background:rgba(255,66,87,.07)}
#sgDw .sgDwCell.warm{border-color:rgba(255,179,64,.42); background:rgba(255,179,64,.06)}
#sgDw span{display:block; font:600 8.5px/1 var(--mono); letter-spacing:.1em; color:var(--faint)}
#sgDw b{display:block; margin-top:5px; font:700 15px/1.2 var(--mono); letter-spacing:-.01em}
#sgDw b.sm{font:600 12px/1.35 var(--sans); letter-spacing:0}
#sgDw i{display:block; margin-top:4px; font:400 10px/1.45 var(--sans); font-style:normal; color:var(--dim)}
/* Inside the note, a <b> is emphasis in a sentence, not a figure. Without
   this it inherits the 15px block rule above and the clause that follows it
   lands on its own line halfway down the cell. */
#sgDw i b{display:inline; margin:0; font:700 10px/1.45 var(--sans); letter-spacing:0}
#sgDwMore{margin-top:14px; width:100%; justify-content:center; text-align:center}

/* =======================================================================
   MISSION — the map is the destination; the surgeon's rail stays.
   The dock carries two lists. The upper one is the wounded on the ground,
   which is this role's, and it stays. The lower one duplicates FLEET
   wholesale and FLEET is not on this rail at all, so it folds with the
   layer filter. The strip in the corner is what a surgeon wants while
   looking at a map: who is out of time and who nobody can reach.
   ======================================================================= */
body[data-role-profile="SURGEON"] [data-pane="MISSION"]:not(.sgOpen) #dock .hud.grow,
body[data-role-profile="SURGEON"] [data-pane="MISSION"]:not(.sgOpen) #legend{
  display:none !important;
}
/* Same fix as the logistician's strip: it sat on top of the GPU map's own
   transport at z-index 6 and swallowed the pointer, so play and the scrubber
   were unpressable for a surgeon and worked for a commander. */
body.map3d #sgMissionStrip{bottom:96px}
#sgMissionStrip{
  position:absolute; left:12px; bottom:12px; z-index:6; max-width:640px;
  display:flex; align-items:center; gap:14px; flex-wrap:wrap;
  border:1px solid rgba(150,190,225,.22); border-radius:10px; padding:9px 14px;
  background:rgba(6,12,19,.93); backdrop-filter:blur(6px);
}
body.light #sgMissionStrip{background:rgba(255,255,255,.95); border-color:rgba(30,60,90,.16)}
#sgMissionStrip .sgMs{display:flex; flex-direction:column; gap:3px; min-width:0}
#sgMissionStrip .sgMs b{font:800 19px/1 var(--mono); letter-spacing:-.02em; color:var(--text)}
#sgMissionStrip .sgMs b.bad{color:var(--bad)} #sgMissionStrip .sgMs b.warn{color:var(--warn)}
#sgMissionStrip .sgMs b.calm{color:var(--dim)}
#sgMissionStrip .sgMs span{font:600 8px/1.3 var(--mono); letter-spacing:.11em; color:var(--faint)}
#sgMissionStrip .sgMore{margin-left:4px; background:transparent}

/* =======================================================================
   FLOW — the Sankey and the survival curve are clinically legible; the
   six-panel mission clock is an analyst's instrument panel and folds.
   #flowBody is absolutely positioned over the whole section, so the strip
   above it is paid for by moving its top edge — which is also what tells
   the chart pack's own ResizeObserver to re-fit every plot.
   ======================================================================= */
/* This pane already has two owners before this file arrives: charts.js
   paints an absolutely positioned scroller into the bare section, and
   palette.js injects a .paneShim header above it and publishes that
   header's measured height as --flowTop, which is what the scroller is
   positioned against. So the strip stacks under the shim rather than at
   top:0 — written at top:0 it landed exactly on top of that header and
   printed two paragraphs through each other — and the scroller is moved
   down by the sum of the two.

   Both heights are measured, neither is guessed: --flowTop by palette.js's
   own ResizeObserver on the shim, --sgFlowH by composeFlow() below, because
   the strip is one line at 1900px of window and two at 1400. */
body[data-role-profile="SURGEON"] [data-pane="FLOW"] .paneShim .ph1 p{display:none}
body[data-role-profile="SURGEON"] [data-pane="FLOW"] #sgFlowTop{top:var(--flowTop, 96px)}
body[data-role-profile="SURGEON"] [data-pane="FLOW"] #flowBody{
  top:calc(var(--flowTop, 96px) + var(--sgFlowH, 58px));
}
body[data-role-profile="SURGEON"] [data-pane="FLOW"]:not(.sgOpen) .flowGrid > .chCard:nth-child(2){
  display:none !important;
}
#sgFlowTop{
  position:absolute; left:0; right:0; top:0; z-index:3;
  padding:0 22px 8px; gap:0;
}
#sgFlowTop .sgLine{padding:8px 14px}

/* =======================================================================
   STREAM — filtered to the clinical record.
   A logistician's stream is packages; a surgeon's is people. What is left
   is the casualty call, the treatment, the outcome of that treatment, and
   the four ways a casualty got nothing — including the one this whole model
   exists to show, which is a package that arrived in hands not qualified to
   use it. The native table is untouched and is one click away.
   ======================================================================= */
body[data-role-profile="SURGEON"] [data-pane="STREAM"] .ph1 p{display:none}
/* The four filter chips and the event count belong to the native table.
   With that table folded they would be four controls that appear to do
   nothing, so they fold with it and come back with it. Export CSV stays: it
   writes the whole stream and is a capability, not a filter. */
body[data-role-profile="SURGEON"] [data-pane="STREAM"]:not(.sgOpen) .strTiles,
body[data-role-profile="SURGEON"] [data-pane="STREAM"]:not(.sgOpen) #stFilters,
body[data-role-profile="SURGEON"] [data-pane="STREAM"]:not(.sgOpen) #stCount,
body[data-role-profile="SURGEON"] [data-pane="STREAM"]:not(.sgOpen) #stAi,
body[data-role-profile="SURGEON"] [data-pane="STREAM"]:not(.sgOpen) > .pane > .tableWrap{
  display:none !important;
}
body[data-role-profile="SURGEON"] [data-pane="STREAM"] #sgStream{flex:1 1 auto; min-height:0}
body[data-role-profile="SURGEON"] [data-pane="STREAM"].sgOpen #sgStream .sgScroll{max-height:260px}
.sgScroll{
  flex:1 1 auto; min-height:120px; overflow:auto;
  border:1px solid var(--line); border-radius:10px; background:var(--panel);
}
.sgScroll table{width:100%}
.sgScroll thead th{position:sticky; top:0; z-index:2}

/* =======================================================================
   SENSOR — a clinical instrument, not a model demo.
   The waveform, the estimate and its interval stay exactly as they are; the
   two evidence cards — the architecture table and the held-out performance
   tables — fold. What goes on top is what the reading means for a casualty,
   which is the one thing the pane never said.
   ======================================================================= */
body[data-role-profile="SURGEON"] [data-pane="SENSOR"] .ph1 p{display:none}
body[data-role-profile="SURGEON"] [data-pane="SENSOR"]:not(.sgOpen) .senseGrid > .senseCard{
  display:none !important;
}
.sgRead{
  display:grid; grid-template-columns:auto 1px minmax(0,1fr); align-items:center; gap:20px;
  border:1px solid var(--line); border-radius:12px; padding:14px 18px; background:var(--panel);
}
@media (max-width:1100px){ .sgRead{grid-template-columns:1fr} .sgRead .sgRule{display:none} }
.sgRead.hot{border-color:rgba(255,66,87,.5);
  background:linear-gradient(180deg, rgba(255,66,87,.09), rgba(255,66,87,.02))}
.sgRead.warm{border-color:rgba(255,179,64,.45);
  background:linear-gradient(180deg, rgba(255,179,64,.08), rgba(255,179,64,.02))}
.sgRule{width:1px; align-self:stretch; background:var(--line); margin:2px 0}
.sgBig{display:flex; flex-direction:column; gap:6px; min-width:150px}
.sgBig b{font:800 50px/.9 var(--mono); letter-spacing:-.035em; color:var(--text)}
.sgBig b.bad{color:var(--bad)} .sgBig b.warn{color:var(--warn)} .sgBig b.ok{color:var(--ok)}
.sgBig span{font:600 9px/1.35 var(--mono); letter-spacing:.1em; color:var(--faint)}
.sgSay{margin:0; font:400 12px/1.65 var(--sans); color:var(--dim); max-width:96ch}
.sgSay b{color:var(--text); font-weight:700}
.sgSay + .sgSay{margin-top:8px}

/* =======================================================================
   DOCTRINE — the questions a surgeon actually asks, and the notice.
   The caveat block stays exactly where the module puts it, at the top,
   because for this audience it is the most important thing on the pane. The
   architecture table, the quantisation table and the retrieval evaluation
   fold; "where this corpus is thin" does not, because a clinician has to
   know the scope limits of anything he quotes.
   ======================================================================= */
body[data-role-profile="SURGEON"] [data-pane="DOCTRINE"] .ph1 p{display:none}
body[data-role-profile="SURGEON"] [data-pane="DOCTRINE"]:not(.sgOpen) #docPre,
body[data-role-profile="SURGEON"] [data-pane="DOCTRINE"]:not(.sgOpen) #docStat,
body[data-role-profile="SURGEON"] [data-pane="DOCTRINE"]:not(.sgOpen) .docGrid > div:last-child > .card:nth-child(-n+3){
  display:none !important;
}

/* =======================================================================
   TASKING — one of the five escalation grounds is a clinical ground.
   IMMEDIATE UNASSIGNED stops a sortie because it would serve a lower-acuity
   casualty while an IMMEDIATE inside that aircraft's reach has nobody
   coming. That is this role's, and it goes at the top. The seven-line
   policy essay and the five-ground table fold.
   ======================================================================= */
body[data-role-profile="SURGEON"] [data-pane="TASKING"]:not(.sgOpen) .ph1 p,
body[data-role-profile="SURGEON"] [data-pane="TASKING"]:not(.sgOpen) .card:has(#policyBox){
  display:none !important;
}
body[data-role-profile="SURGEON"] [data-pane="TASKING"] .kpi b{font-size:24px}

/* =======================================================================
   UNITS — combat effectiveness is a commander's metric; below-reserve-floor
   is a clinical one, and they are rows three and four of the same card. The
   cards stay. The overwatch status bar, the polling interval chips and the
   nine-column health-report table — which reads "No polls yet" in every
   default state and takes half the pane's height doing it — fold.
   ======================================================================= */
body[data-role-profile="SURGEON"] [data-pane="UNITS"] .ph1 p{display:none}
body[data-role-profile="SURGEON"] [data-pane="UNITS"]:not(.sgOpen) .uavStatus,
body[data-role-profile="SURGEON"] [data-pane="UNITS"]:not(.sgOpen) .intervalRow,
body[data-role-profile="SURGEON"] [data-pane="UNITS"]:not(.sgOpen) .card:has(+ .tableWrap),
body[data-role-profile="SURGEON"] [data-pane="UNITS"]:not(.sgOpen) > .pane > .tableWrap{
  display:none !important;
}
`;

  /* ------------------------------------------------------------ plumbing */
  /* Every host function this file leans on is a top-level declaration in a
     classic script and is reachable by bare name. It is still asked for
     rather than assumed: a module that throws inside render() takes the
     whole application down with it, and the contract for this file is that
     it fails silently and leaves everything else working. */
  const APP = window.APP;
  const G = k => (typeof window[k] === 'function' ? window[k] : null);

  /* COUNT — the counted nouns, defined once at the head of app.js and read
     from here by every pane that renders one of them. Reachable by bare name
     because both files are classic scripts and this one is parsed after that
     one; `window.COUNT` and `ANGEL.need('counts')` are the same object.

     Nothing in this file re-derives a quantity COUNT publishes. Two of the
     three defects the correctness audit found on this profile were exactly
     that: a stream count written inline that read 77 where the shell read 78,
     and a death total assembled from a locally filtered event list that read
     27 where the shell read 31. Both agreed with themselves and with nothing
     else. If a count is wanted that COUNT does not have, it is added there
     with its label, not here. The bootstrap withholds this module outright if
     COUNT is absent, so every call below can assume it. */

  const fmtT = G('fmtT') || (m => 'T+' + Number(m).toFixed(0));
  const esc = G('esc') || (s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])));
  const pill = G('pill') || ((t, c) => `<span class="pill ${c || ''}">${t}</span>`);
  const ai = G('ai') || (() => '');

  /* Simulation constants are `const` declarations in classic scripts: in
     scope by bare name, but not properties of window. A typeof guard is the
     only safe way to read one — if sim.js failed to load there is nothing
     here to render anyway, but this file must not be the thing that throws.
     The local names are deliberately not the global ones: `const TIERS =
     … TIERS …` reads its own binding in the temporal dead zone and throws
     ReferenceError before anything else in this file runs. */
  const TIER = (typeof TIERS !== 'undefined') ? TIERS
    : { T1: { name: 'ASM (buddy)', training: '6-8 hrs', can: ['TQ_KIT'] },
        T2: { name: 'CLS', training: '40 hrs', can: ['TQ_KIT', 'CHEST_SEAL'] },
        T3: { name: 'Combat Medic (68W)', training: '8-10 days', can: ['TQ_KIT', 'CHEST_SEAL', 'TXA', 'PLASMA', 'BLOOD'] } };
  const SHORT = (typeof PAYSHORT !== 'undefined') ? PAYSHORT
    : { BLOOD: 'BLOOD', PLASMA: 'PLASMA', TXA: 'TXA', TQ_KIT: 'HEM KIT', CHEST_SEAL: 'SEAL' };
  const ROLES_ = (typeof ROLES !== 'undefined') ? ROLES : null;
  const CRM_RED = (typeof PARAMS !== 'undefined' && PARAMS.CRM_RED) ? PARAMS.CRM_RED : 40;
  const CRM_YELLOW = (typeof PARAMS !== 'undefined' && PARAMS.CRM_YELLOW) ? PARAMS.CRM_YELLOW : 70;

  /* Telementoring unlocks plasma and TXA for a combat lifesaver, and never
     unlocks whole blood for anybody. Read from the optimizer where it is
     declared rather than restated, so a policy change there moves this. */
  const capsAt = G('capabilitiesAt') ||
    (c => (TIER[c.responder] || { can: [] }).can);

  /* Minutes to the physiological deadline. 9000 is the model's stand-in for
     "no deadline" — the walking wounded, who have no clock running and do
     not belong on a worklist. Absent, not zero. */
  const INF = 9000;
  function leftFor(c, now) {
    if (c.deadlineMin >= INF) return Infinity;
    return c.deadlineMin - (now - c.tInjury);
  }

  const n0 = v => (v === null || v === undefined || !isFinite(v)) ? '—' : Math.round(v).toLocaleString();
  const plural = (n, one, many) => n === 1 ? one : (many || one + 's');
  const casId = id => 'CAS-' + String(id).padStart(3, '0');

  /* The two death labels this profile prints beside a figure, taken from
     COUNT.LABEL and upper-cased for the mono tags rather than restated. Three
     "died" quantities exist in this application — survivable deaths this
     operation, all deaths this operation, all deaths across every operation —
     and a figure carrying the bare word "dead" does not say which.

     Read through a guard for the same reason TIERS above is: this runs at
     parse time, ahead of the ANGEL.ready() that withholds the module, and a
     ReferenceError here would take the file out before it could report why.
     The fallbacks are the shipped strings, so a withheld module cannot be the
     thing that puts an unlabelled death count on a screen. */
  const HAS_COUNT = (typeof COUNT !== 'undefined') && !!COUNT && !!COUNT.LABEL;
  const DIED_SURV = HAS_COUNT ? COUNT.LABEL.DIED_SURVIVABLE_SHORT.toUpperCase()
    : 'DEAD OF SURVIVABLE WOUNDS';
  const DIED_ALL = HAS_COUNT ? COUNT.LABEL.DIED_ALL_SHORT.toUpperCase()
    : 'DIED OF WOUNDS, ALL CATEGORIES';

  /* Minutes, said the way a person says them. */
  function dur(m) {
    if (m === null || m === undefined || !isFinite(m)) return '—';
    if (m <= 0) return 'past';
    if (m < 90) return Math.round(m) + ' min';
    const h = Math.floor(m / 60);
    return h + ' h ' + String(Math.round(m - h * 60)).padStart(2, '0');
  }

  function injectCSS() {
    if (document.getElementById('sgCss')) return;
    const s = document.createElement('style');
    s.id = 'sgCss'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  const isSurgeon = () =>
    !!(window.ANGEL && ANGEL.role ? ANGEL.role.current() === 'SURGEON' : APP && APP.role === 'SURGEON');

  /* Write only if it changed. These panes are re-rendered up to three times
     a second — MISSION on every frame — and replacing identical markup
     churns the DOM under the operator's cursor for nothing. */
  function paint(el, html) {
    if (!el) return false;
    if (el._sgH === html) return false;
    el._sgH = html; el.innerHTML = html;
    return true;
  }

  function now() { return (APP.tView !== undefined && APP.tView !== null) ? APP.tView : APP.t; }

  /* ============================ THE CLINICAL PICTURE ==================== */
  /* One place that reads the run, so no two blocks in this file can
     disagree about how many casualties are out of time — the defect the UI
     inventory found in the shipped panes, where "critical" was computed
     three different ways on three different screens.

     Four facts, and they are the four a surgeon asks for:

       DETERIORATING   open, untreated, and still losing compensatory
                       reserve — a clock is running on this person.
       OUT OF TIME     past the deadline, or inside fifteen minutes of it.
       TIER GAP        the leading clinically-indicated treatment is one the
                       responder standing there is not qualified to give.
       OUT OF REACH    no launch point in the force can fly to this position
                       with a usable load. Not a tasking failure — a laydown
                       one, and nothing this pane offers can fix it.

     The tier gap is computed against the live telementoring policy, so
     turning telementoring off in Settings moves this number on the next
     frame, which is the point of having it on the screen at all. */
  function clinical() {
    if (!APP || !APP.world || !APP.armA) return null;
    const A = APP.armA, t = now();

    /* TWO TIMES, AND THEY ARE NOT THE SAME TIME.

       `t` is the minute the operator is standing on. It is what time-to-
       collapse, compensatory reserve and "how long since he was wounded" are
       computed against, and it is never Infinity.

       `hz` is the *horizon* — how much of the record is visible — and it is
       COUNT.clock(). While the run is in progress the two are the same
       number. Once it has finished the horizon becomes the whole record,
       because an event the simulation stamped a few seconds past the scenario
       duration is part of what happened. Four deaths in the reference run are
       stamped past the 180-minute clock; filtering them against `t` forever
       made this profile's own STREAM strip read 27 dead where the shell read
       31, while the FLOW header two panes away said "of 31 dead in all".

       The rule below is mechanical: anything asking *has this happened yet*
       compares against `hz`; anything doing arithmetic on the clock uses `t`. */
    const hz = COUNT.clock();
    const seen = A.casualties.filter(c => c.tInjury <= hz);
    const open = seen.filter(c => c.outcome === null && !c.treated);

    /* On the clock: open, and with a physiological deadline running. Reserve
       in this model falls from 100 to 0 across that deadline, so "still
       losing reserve" and "has a deadline" are the same population — said
       here once, plainly, rather than dressed up as a trend calculation
       that would only re-derive the deadline. */
    const clocked = open.filter(c => c.deadlineMin < INF);
    const withLeft = clocked.map(c => ({ c, left: leftFor(c, t) }));
    const pastN = withLeft.filter(x => x.left <= 0).length;
    const soonN = withLeft.filter(x => x.left > 0 && x.left <= 15).length;

    const tm = !!APP.telementor;
    const gapOf = c => {
      const need = (c.needs && c.needs[0]) || null;
      if (!need) return null;
      const can = capsAt(c, tm) || [];
      return can.indexOf(need) >= 0 ? null : need;
    };
    const gapped = clocked.filter(c => gapOf(c));
    const gapBlood = gapped.filter(c => c.needs[0] === 'BLOOD').length;

    /* reachN is written by the allocator on each tasking pass. Before the
       first pass it is absent, and absent is not zero. */
    const known = open.filter(c => c.reachN !== undefined);
    const noReach = known.filter(c => c.reachN === 0).length;
    const oneReach = known.filter(c => c.reachN === 1).length;

    const work = withLeft.sort((a, b) => a.left - b.left).map(x => x.c);

    /* The four death figures this profile is allowed to print, all four read
       from COUNT and none of them recomputed. `dead` is the survivable
       cohort — the only deaths a resupply decision could have touched, and
       the headline everywhere on this profile. `deadAll` is every triage
       category in the same operation, which is the larger number and the one
       the FLOW header, the units roster and the theatre table carry. The two
       are never shown without saying which is which. */
    const B = APP.armB;
    return {
      t, hz, A, B, seen, open, clocked, work, pastN, soonN,
      gapped, gapN: gapped.length, gapBlood, gapOf, tm,
      noReach, oneReach,
      dead: COUNT.deathsSurvivable(A), deadAll: COUNT.deathsAll(A),
      deadB: B ? COUNT.deathsSurvivable(B) : 0,
      deadAllB: B ? COUNT.deathsAll(B) : 0,
      deployed: !!(APP.deploy && APP.deploy.state === 'DEPLOYED'),
      started: seen.length > 0 || t > 0
    };
  }

  /* Reserve trend from the wearable's own record, computed the same way the
     device card computes it, so the two cannot print different slopes. */
  function trend(c) {
    const T = c.tele || [];
    if (T.length < 2) return null;
    const a = T[0], b = T[T.length - 1];
    const dt = Math.max(1, b.t - a.t);
    return (b.v - a.v) / dt;
  }

  /* What the responder on scene may administer, in words. */
  function scene(c, tm) {
    const tier = TIER[c.responder] || { name: c.responder, training: '', can: [] };
    const can = capsAt(c, tm) || tier.can;
    const need = (c.needs && c.needs[0]) || null;
    return {
      tier, can, need,
      gap: need && can.indexOf(need) < 0 ? need : null,
      telementored: tm && c.responder === 'T2'
    };
  }

  /* ============================== CASUALTIES ============================ */

  function tiles(S) {
    const clocked = S.clocked.length;
    const timeN = S.pastN + S.soonN;
    const reachN = S.noReach;
    return `<div class="sgTiles">
      <div class="sgTile">
        <h4>DETERIORATING NOW</h4>
        <div class="sgN"><b class="${clocked ? '' : 'calm'}">${n0(clocked)}</b>
          <i>${clocked ? 'of ' + n0(S.open.length) + ' still on the ground' : 'nobody is on a clock'}</i></div>
        <p>${clocked
          ? `Wounded, untreated, and still losing compensatory reserve. <b>${n0(S.seen.length)}</b>
             ${plural(S.seen.length, 'soldier has', 'soldiers have')} been wounded so far.`
          : (S.started
            ? 'Everyone wounded so far has been treated, has been resolved, or has no physiological clock running.'
            : 'The mission has not started. Press play on the command bar.')}</p>
      </div>
      <div class="sgTile${S.pastN ? ' hot' : ''}">
        <h4>OUT OF TIME, OR INSIDE FIFTEEN MINUTES</h4>
        <div class="sgN"><b class="${S.pastN ? 'bad' : timeN ? 'warn' : 'calm'}">${n0(timeN)}</b>
          <i>${S.pastN ? n0(S.pastN) + ' already past it' : 'none past it yet'}</i></div>
        <p>Past, or within fifteen minutes of, the minute at which the body can no longer make up for the
          blood it has lost. ${timeN ? `<b>${n0(S.soonN)}</b> ${plural(S.soonN, 'is', 'are')} inside that
          window now.` : 'Nobody is inside that window.'}</p>
      </div>
      <div class="sgTile${S.gapN ? ' hot' : ''}">
        <h4>NOBODY ON SCENE QUALIFIED TO GIVE IT</h4>
        <div class="sgN"><b class="${S.gapN ? 'bad' : 'calm'}">${n0(S.gapN)}</b>
          <i>${S.gapBlood ? n0(S.gapBlood) + ' of them need whole blood' : 'of those on a clock'}</i></div>
        <p>${S.gapN
          ? `The treatment their wound indicates first is one the responder standing there is not qualified
             to administer. <b>Whole blood and plasma are Tier 3 — a 68W combat medic</b>, and most casualties
             have a buddy or a combat lifesaver on scene.`
          : `Every casualty on a clock has somebody on scene qualified to give what the wound indicates
             first.`} ${S.tm
          ? 'Telementoring is on, so a combat lifesaver counts as qualified for plasma and TXA — never for blood.'
          : '<b>Telementoring is off.</b> Turning it on in Settings makes a combat lifesaver qualified for plasma and TXA.'}</p>
      </div>
      <div class="sgTile${reachN ? ' hot' : ''}">
        <h4>NOBODY CAN REACH IN TIME</h4>
        <div class="sgN"><b class="${reachN ? 'bad' : S.oneReach ? 'warn' : 'calm'}">${n0(reachN)}</b>
          <i>${S.oneReach
            ? n0(S.oneReach) + (reachN ? ' more have' : ' have') + ' one aircraft only'
            : 'no aircraft at all in range'}</i></div>
        <p>No launch point in the force can fly to that position with a usable load and get home. Combat
          radius falls as payload rises, so this is a question about where the launch points are — not
          about how the aircraft are tasked.</p>
      </div>
    </div>`;
  }

  function workRow(c, S) {
    const t = S.t;
    const left = leftFor(c, t);
    const crm = typeof c.crmAt === 'function' ? c.crmAt(t) : null;
    const rc = crm === null ? 'calm' : crm < CRM_RED ? 'bad' : crm < CRM_YELLOW ? 'warn' : 'ok';
    const sc = scene(c, S.tm);
    const past = left <= 0;
    const sel = APP.sel && APP.sel.kind === 'cas' && APP.sel.id === c.id;
    const reach = c.reachN === undefined ? '<span class="calm">—</span>'
      : c.reachN === 0 ? pill('NONE IN RANGE', 'bad')
      : c.reachN === 1 ? pill('1 IN RANGE', 'warn')
      : '<span class="mono calm">' + c.reachN + '</span>';
    const st = c.assignedTo ? pill('AIRCRAFT TASKED', 'info') : pill('AWAITING', 'warn');
    return `<tr data-cas="${c.id}" class="${past ? 'past' : ''}${sel ? ' sel' : ''}">
      <td class="mono">${c.hva ? '<span class="sgStar">★</span>' : ''}${casId(c.id)}</td>
      <td>${pill(c.cls, c.cls === 'IMMEDIATE' ? 'bad' : c.cls === 'DELAYED' ? 'warn' : '')}</td>
      <td class="calm">${esc(String(c.injury).replace(/_/g, ' ').toLowerCase())}</td>
      <td class="num"><span class="meter sm"><i class="${rc}" style="width:${Math.max(0, crm === null ? 0 : crm)}%"></i></span
        ><b class="mono ${rc}">${crm === null ? '—' : Math.round(crm) + '%'}</b></td>
      <td class="num mono ${past ? 'hot' : left <= 15 ? 'warm' : 'calm'}">${past ? 'PAST' : dur(left)}</td>
      <td>${esc(sc.tier.name)}${sc.gap
        ? `<span class="sgGap">CANNOT GIVE ${esc(SHORT[sc.gap] || sc.gap)}</span>`
        : `<span class="sgOk"> ✓</span>`}</td>
      <td class="calm">${(c.needs || []).map(k => esc(SHORT[k] || k)).join(' › ')}</td>
      <td>${reach}</td>
      <td>${st}</td></tr>`;
  }

  const WORK_ROWS = 14;

  function worklist(S) {
    const rows = S.work.slice(0, WORK_ROWS).map(c => workRow(c, S)).join('');
    const more = Math.max(0, S.work.length - WORK_ROWS);
    return `<div class="card" id="sgWork">
      <div class="cardHead">The worklist — everyone still on a clock, least time first
        ${ai('LEARNED', 'compensatory reserve and the minute of collapse are read from the wearable by the network on this machine')}</div>
      <table class="sgTable"><thead><tr>
        <th style="width:104px">Casualty</th><th style="width:104px">Triage</th>
        <th style="width:170px">Injury</th><th class="num" style="width:132px">Reserve</th>
        <th class="num" style="width:86px">Collapse in</th>
        <th style="width:290px">Responder on scene</th>
        <th style="width:180px">Clinically indicated</th>
        <th style="width:124px">Aircraft in range</th><th style="width:130px">Status</th>
      </tr></thead><tbody>${rows || `<tr><td colspan="9" class="empty">${S.started
        ? 'Nobody is on a physiological clock at this minute. The full register is one control away.'
        : 'The mission has not started. Nobody has been wounded yet.'}</td></tr>`}</tbody></table>
      <div class="sgBody"><p class="foot" style="color:var(--faint)">${!S.seen.length
        ? `This becomes a worklist, ordered by time to collapse, the moment the first casualty is
           reported. The full register is one control away and is the pane as it was.`
        : more
          ? `<b>${n0(more)}</b> more ${plural(more, 'casualty is', 'casualties are')} on a clock and not
             shown here. Open the full register for all ${n0(S.seen.length)}, with search, the six
             filters and the high-value designation. Click any row for the record.`
          : `All ${n0(S.work.length)} ${plural(S.work.length, 'casualty', 'casualties')} on a clock
             ${plural(S.work.length, 'is', 'are')} shown. The full register carries all
             ${n0(S.seen.length)} wounded so far, including the treated, the resolved and the walking
             wounded. Click any row for the record.`}</p></div>
    </div>`;
  }

  /* When the last casualty on a clock has been resolved — which is every
     completed run, and any quiet minute inside a live one — a worklist is
     the wrong thing to be looking at and an empty table is the wrong thing
     to print. What a clinician wants then is the record: who died, and
     which of the five reasons it was.

     The aggregate is deathCauses(), the same decomposition COMPARE and COST
     read, so the total under this table cannot disagree with the total on
     those. The per-row reason runs the *same five tests in the same order*,
     against the same arithmetic — including the launch-point count, which
     is recomputed here from dist() and effectiveRadiusKm() exactly as that
     function computes it rather than being approximated by reachN. reachN
     counts airframes and the coverage test counts launch points, and a row
     labelled from one while the summary under it was written from the other
     is how a table ends up contradicting its own footnote. It did, once,
     between writing this block and reading the first screenshot of it. */
  const usable = G('usablePayloads') || (c => (c.needs || []));
  const distFn = G('dist');
  const radiusFn = G('effectiveRadiusKm');

  function launchPointsInRange(c, arm) {
    if (!distFn || !radiusFn) return null;
    const set = new Set();
    for (const d of (arm.drones || []))
      if (distFn(d.baseX, d.baseY, c.x, c.y) <= radiusFn(d.plat, 1.45)) set.add(d.baseIdx);
    return set.size;
  }

  function deathReason(c, arm) {
    if (c.treated) return 'TREATED, DIED ANYWAY';
    if (!usable(c, arm.telementor).length) return 'NOBODY ON SCENE QUALIFIED';
    const lp = launchPointsInRange(c, arm);
    if (lp !== null && lp <= 1) return lp === 0 ? 'NO LAUNCH POINT IN RANGE' : 'ONE LAUNCH POINT ONLY';
    if (c.deadlineMin < 10) return 'TOO FAST FOR ANY FLIGHT';
    return 'EVERY AIRCRAFT COMMITTED ELSEWHERE';
  }

  function record(S) {
    /* COUNT.SURVIVABLE, not a local copy of it. This predicate decides which
       rows appear under a total that is read from COUNT.deathsSurvivable, and
       a table filtered by one definition under a total written from another is
       how a pane ends up disagreeing with its own footer. S.seen is already
       cut at COUNT.clock(), so a death stamped past the scenario duration is a
       row here rather than a row nobody can ever reach. */
    const dead = S.seen.filter(c => c.outcome === 'DIED' && COUNT.SURVIVABLE(c))
      .sort((a, b) => (a.tResolved || 0) - (b.tResolved || 0));
    const cz = (G('deathCauses') && S.A.casualties.length) ? G('deathCauses')(S.A) : null;
    const shown = dead.slice(0, WORK_ROWS);
    const more = dead.length - shown.length;
    const rows = shown.map(c => {
      const sc = scene(c, S.tm);
      const why = deathReason(c, S.A);
      return `<tr data-cas="${c.id}">
        <td class="mono">${c.hva ? '<span class="sgStar">★</span>' : ''}${casId(c.id)}</td>
        <td>${pill(c.cls, c.cls === 'IMMEDIATE' ? 'bad' : 'warn')}</td>
        <td class="calm">${esc(String(c.injury).replace(/_/g, ' ').toLowerCase())}</td>
        <td class="num mono hot">${c.tResolved != null
          ? (c.tResolved - c.tInjury).toFixed(0) + ' min' : '—'}</td>
        <td>${esc(sc.tier.name)}${sc.gap
          ? `<span class="sgGap">CANNOT GIVE ${esc(SHORT[sc.gap] || sc.gap)}</span>` : ''}</td>
        <td class="num mono ${c.reachN === 0 ? 'hot' : c.reachN === 1 ? 'warm' : 'calm'}">${
          c.reachN === undefined ? '—' : c.reachN}</td>
        <td>${pill(why, 'bad')}</td></tr>`;
    }).join('');
    return `<div class="card">
      <div class="cardHead">The record — who died, and why
        ${ai('DERIVED', 'attributed per casualty from the same run the death count comes from')}</div>
      <table class="sgTable"><thead><tr>
        <th style="width:104px">Casualty</th><th style="width:104px">Triage</th>
        <th style="width:190px">Injury</th><th class="num" style="width:104px">Died after</th>
        <th style="width:290px">Responder on scene</th>
        <th class="num" style="width:126px" title="Airframes that could physically fly to this position with a usable load">Airframes in range</th>
        <th style="width:250px">Why</th>
      </tr></thead><tbody>${rows ||
        '<tr><td colspan="7" class="empty">Nobody has died of a survivable wound.</td></tr>'}</tbody></table>
      <div class="sgBody">
        <p><b style="color:var(--tollHi)">${n0(S.dead)}</b> dead of wounds they could have survived, of
          <b>${n0(S.seen.length)}</b> wounded and <b>${n0(S.deadAll)}</b> dead of wounds in every triage
          category. Every row in this table is one of the first figure. The same fight run the way it is
          run today ended with <b>${n0(S.deadB)}</b> of survivable wounds and <b>${n0(S.deadAllB)}</b> in
          all. ${more ? `The ${n0(shown.length)} earliest are shown; ${n0(more)} more are
          in the full register. ` : ''}<b>Every number here is a person. The target is zero.</b></p>
        ${cz && cz.total ? `<p>Of those ${n0(cz.total)}: <b>${n0(cz.noResponder)}</b> had nobody on scene
          qualified to administer what the wound indicated, <b>${n0(cz.noLaunchPoint)}</b> had no launch
          point close enough to reach them, <b>${n0(cz.treatedDied)}</b> were treated and died anyway,
          <b>${n0(cz.tooFast)}</b> had less than ten minutes from wounding, and <b>${n0(cz.busy)}</b> died
          while every aircraft was committed elsewhere — and that last figure is the only one a larger
          fleet would have touched.</p>
        <p class="foot" style="color:var(--faint)">The reason on each row is the first of those five
          tests it meets, run in that order against the same arithmetic as the totals above. The column
          beside it counts <b>airframes</b> that could reach the position; the coverage test counts
          <b>launch points</b>. They are different questions and they are labelled differently.</p>` : ''}
      </div>
    </div>`;
  }

  const GLOSS = `<p class="sgGloss"><b>Compensatory reserve</b> is how much of the body's ability to
    hold blood pressure against blood loss is left — 100% is uninjured, 0% is the point at which it
    fails and pressure falls. It moves before heart rate and blood pressure do, which is what buys the
    lead time. Here it is read from the pulse waveform by a network running on this machine, and the
    minute it reaches zero is what the deadline column counts down to.</p>`;

  /* The one control that brings the register back. It sits beside Export
     CSV, which is never folded — that button writes the whole register and
     is a capability, not a filter. */
  function seedCasualties() {
    mountBefore('[data-pane="CASUALTIES"]', 'sgCas', '.filters');
    const tools = document.querySelector('[data-pane="CASUALTIES"] .phTools');
    if (tools) foldControl('sgCasMore', tools, 'the full register');
  }

  let nativeCasualties = null;
  function renderSurgCasualties() {
    seedCasualties();
    const host = document.getElementById('sgCas');
    const sec = document.querySelector('[data-pane="CASUALTIES"]');
    const open = !!(sec && sec.classList.contains('sgOpen'));
    /* Folded, the 125-row register is not merely hidden — it is not built.
       Unfolded, the native renderer runs and what comes back underneath is
       live rather than whatever was last painted for some other role. */
    if (open && nativeCasualties) {
      try { nativeCasualties(); } catch (e) { console.warn('CASUALTIES native', e); }
    }
    if (!host) return;
    const S = clinical();
    if (!S) {
      paint(host, `<p class="lede">The mission has not been built yet. This pane populates as soon as
        the simulation is loaded.</p>`);
      return;
    }
    /* A worklist while anybody is still on a clock; the record of the dead
       when nobody is. Never both — the pane is one screen, and after a
       completed run an empty worklist above a live register is a pane that
       reads as broken when in fact it is reporting that everyone has been
       resolved. */
    paint(host, tiles(S) + GLOSS +
      (S.work.length || !S.seen.length ? worklist(S) : record(S)));
  }

  /* ========================= THE RECORD DRAWER ========================== */
  /* Reduced by tagging, not by rewriting. The native renderer builds the
     whole drawer first — including the reserve-trace canvas it draws into
     after setting innerHTML, and the doctrine module's "what the doctrine
     says" link, which attaches itself to the clinically-indicated cell by
     MutationObserver — and this runs afterwards over the finished subtree.
     Nothing is removed; three blocks are marked .sgFold and a stylesheet
     rule hides them until the control at the foot is pressed. */
  let dwBox = null, dwMore = null;
  function composeDrawer() {
    const el = document.getElementById('drawer');
    if (!el || !isSurgeon()) return;
    if (!APP.sel || APP.sel.kind !== 'cas' || !APP.armA) return;
    const c = APP.armA.casualties.find(k => k.id === APP.sel.id);
    if (!c) return;

    /* The device card, the aircraft-selection table and the authorisation
       record, with the section headings that introduce them. A heading whose
       block is not folded — the "no aircraft was tasked" note, which says
       why nobody is coming and is clinical — keeps its heading. */
    for (const n of el.querySelectorAll('.devBox, .decBox, .dwLog')) n.classList.add('sgFold');
    for (const s of el.querySelectorAll('.dwSect')) {
      const nx = s.nextElementSibling;
      if (nx && nx.classList.contains('sgFold')) s.classList.add('sgFold');
    }
    /* And the cells of the native grid that the block below now states in
       one place. Two readouts of the same figure eighty pixels apart is how
       an operator ends up checking which one is stale. What is left of that
       grid is the status, and the clinically-indicated ladder — which is
       where the doctrine module attaches its own link, so it is left exactly
       where that module expects to find it. */
    for (const cell of el.querySelectorAll('.dwGrid > .dwCell')) {
      const lab = cell.querySelector('span');
      if (lab && /^(Compensatory reserve|Predicted collapse|Time since injury|Responder on scene|Can administer|Treated with)/
        .test(lab.textContent.trim())) cell.classList.add('sgFold');
    }

    const t = now();
    const resolved = c.outcome !== null || c.treated;
    const tRef = c.treated && c.tTreated != null ? c.tTreated
      : c.outcome && c.tResolved != null ? c.tResolved : t;
    const crm = typeof c.crmAt === 'function' ? c.crmAt(tRef) : null;
    const rc = crm === null ? '' : crm < CRM_RED ? 'bad' : crm < CRM_YELLOW ? 'warn' : 'ok';
    const left = leftFor(c, t);
    const sl = trend(c);
    const sc = scene(c, !!APP.telementor);

    const head = el.querySelector('.dwHead');
    if (!head) return;
    /* The drawer's innerHTML is replaced wholesale several times a second,
       which detaches both of these nodes. They are held here rather than
       looked up: document.getElementById cannot find a node that is no
       longer in the document, so looking them up would build a new pair on
       every frame and the fold state would be lost with them. */
    if (!dwBox) {
      dwBox = document.createElement('div');
      dwBox.id = 'sgDw';
      dwBox.setAttribute('data-roles', 'SURGEON');
    }
    if (dwBox.parentElement !== el || dwBox.previousElementSibling !== head)
      el.insertBefore(dwBox, head.nextSibling);
    const box = dwBox;

    const timeCls = resolved ? '' : left <= 0 ? 'hot' : left <= 15 ? 'warm' : '';
    paint(box, `
      <div class="sgDwCell ${timeCls}"><span>${resolved ? 'PREDICTED COLLAPSE WAS' : 'TIME TO COLLAPSE'}</span>
        <b class="${timeCls === 'hot' ? 'bad' : timeCls === 'warm' ? 'warn' : ''}">${
          c.deadlineMin >= INF ? 'no clock'
            : resolved ? 'T+' + c.deadlineMin.toFixed(0) + ' min'
            : left <= 0 ? 'PAST' : dur(left)}</b>
        <i>${((resolved ? tRef : t) - c.tInjury).toFixed(0)} min since wounding</i></div>
      <div class="sgDwCell"><span>COMPENSATORY RESERVE${resolved ? ' AT HANDOFF' : ''}</span>
        <b class="${rc}">${crm === null ? '—' : Math.round(crm) + '%'}</b>
        <i>${sl === null ? 'no trend yet — one reading' : sl > -0.02 ? 'holding steady'
          : 'falling ' + Math.abs(sl).toFixed(2) + ' points a minute'}</i></div>
      <div class="sgDwCell wide ${sc.gap ? 'warm' : ''}"><span>ON SCENE</span>
        <b class="sm">${esc(sc.tier.name)} · ${esc(sc.tier.training)}${sc.telementored ? ' · telementored' : ''}</b>
        <i>${sc.gap
          ? `Qualified for ${sc.can.map(k => esc(SHORT[k] || k)).join(', ')}. <b style="color:var(--warn)">Not
             qualified to give ${esc(SHORT[sc.gap] || sc.gap)}</b>, which is what this wound indicates first.`
          : `Qualified for ${sc.can.map(k => esc(SHORT[k] || k)).join(', ')} — including
             ${esc(SHORT[sc.need] || sc.need || '—')}, which is what this wound indicates first.`}</i></div>
      <div class="sgDwCell wide"><span>DELIVERED</span>
        <b class="sm ${c.treatedWith ? 'ok' : ''}">${c.treatedWith
          ? esc(SHORT[c.treatedWith] || c.treatedWith) + ' at T+' + (c.tTreated - c.tInjury).toFixed(0) +
            ' min after wounding'
          : c.outcome === 'DIED' ? 'nothing arrived' : c.assignedTo ? 'an aircraft is on the way' : 'nothing yet'}</b>
        <i>${c.outcome === 'DIED'
          ? 'This soldier died of wounds. ' + (c.reachN === 0
            ? 'No launch point in the force could reach the position.'
            : 'The record below carries every aircraft that was checked against him.')
          : c.outcome === 'SAVED' ? 'Stabilised where he fell.'
          : 'Status ' + (c.assignedTo ? 'tasked' : 'awaiting') + '.'}</i></div>`);

    if (!dwMore) {
      dwMore = document.createElement('button');
      dwMore.id = 'sgDwMore';
      dwMore.type = 'button';
      dwMore.className = 'sgMore';
      dwMore.setAttribute('data-roles', 'SURGEON');
      dwMore.setAttribute('data-sg', 'foldDrawer');
    }
    if (dwMore !== el.lastElementChild) el.appendChild(dwMore);
    const on = el.classList.contains('sgOpen');
    dwMore.setAttribute('aria-expanded', String(on));
    const label = on ? 'hide device, tasking, audit trail' : 'device, tasking, audit trail';
    if (dwMore.textContent !== label) dwMore.textContent = label;
  }

  /* =============================== MISSION ============================== */

  let missAt = 0;
  function composeMission() {
    const stage = document.getElementById('stage');
    if (!stage) return;
    let strip = document.getElementById('sgMissionStrip');
    if (!strip) {
      strip = document.createElement('div');
      strip.id = 'sgMissionStrip';
      strip.setAttribute('data-roles', 'SURGEON');
      stage.appendChild(strip);
    }
    if (!isSurgeon()) return;
    /* MISSION is not on render()'s throttled branch — it is rebuilt on every
       animation frame. paint() keeps the DOM still, but building the string
       sixty times a second is work nobody asked for. The first paint is
       never delayed, so the strip is populated on arrival. */
    const ms = performance.now();
    if (strip._sgH && ms - missAt < 300) return;
    missAt = ms;
    const S = clinical();
    if (!S) { paint(strip, ''); return; }
    const sec = strip.closest('.viewport');
    const open = !!(sec && sec.classList.contains('sgOpen'));
    const timeN = S.pastN + S.soonN;
    paint(strip, `
      <div class="sgMs"><b class="${S.clocked.length ? '' : 'calm'}">${n0(S.clocked.length)}</b>
        <span>STILL LOSING RESERVE</span></div>
      <div class="sgMs"><b class="${S.pastN ? 'bad' : timeN ? 'warn' : 'calm'}">${n0(timeN)}</b>
        <span>OUT OF TIME OR INSIDE 15 MIN</span></div>
      <div class="sgMs"><b class="${S.gapN ? 'bad' : 'calm'}">${n0(S.gapN)}</b>
        <span>NOBODY QUALIFIED ON SCENE</span></div>
      <div class="sgMs"><b class="${S.noReach ? 'bad' : 'calm'}">${n0(S.noReach)}</b>
        <span>NOBODY IN RANGE</span></div>
      <button type="button" class="sgMore" data-sg="fold" aria-expanded="${open}">${
        open ? 'hide the airframes and the layers' : 'the airframes and the layers'}</button>`);
  }

  /* ================================ FLOW ================================ */
  /* The strip is absolutely positioned over the top of the pane and the
     chart host's top edge is moved down to make room for it — which has the
     useful side effect of being the one geometry change the chart pack's
     ResizeObserver is watching, so folding the six-panel clock re-fits every
     plot that is left. Without that nudge the plots inside a card that was
     hidden when they were built come back 120px wide. */
  function nudgeFlow() {
    const b = document.getElementById('flowBody');
    if (!b) return;
    b.style.top = '59px';
    requestAnimationFrame(() => requestAnimationFrame(() => { b.style.top = ''; }));
  }

  function composeFlow() {
    const sec = document.querySelector('[data-pane="FLOW"]');
    if (!sec) return;
    let host = document.getElementById('sgFlowTop');
    if (!host) {
      host = document.createElement('div');
      host.id = 'sgFlowTop';
      host.setAttribute('data-roles', 'SURGEON');
      sec.insertBefore(host, sec.firstChild);
    }
    if (!isSurgeon()) return;
    const S = clinical();
    if (!S) { paint(host, ''); return; }
    const open = sec.classList.contains('sgOpen');
    const delta = S.deadB - S.dead;
    const all = S.deadAll;
    const changed = paint(host, `
      <div class="sgLine">
        <span class="sgV ${S.dead ? 'bad' : 'calm'}">${n0(S.dead)}</span>
        <span class="sgT">dead of wounds they could have survived${S.deadB !== S.dead
          ? ` — <b>${n0(delta > 0 ? delta : -delta)}</b> ${delta > 0 ? 'fewer' : 'more'} than the same fight
             run the way it is run today` : ''}${all > S.dead
          ? `, of <b>${n0(all)}</b> dead of wounds in all triage categories` : ''}.
          <em>Every ribbon below is people. Read the second column first: a casualty the baseline never saw
          as a physiological deadline can still be tasked, but only after somebody asked.</em></span>
        <span class="sgTag">THE TARGET IS ZERO</span>
        <button type="button" class="sgMore" data-sg="foldFlow" aria-expanded="${open}">${
          open ? 'hide the mission clock' : 'the mission clock, six ways'}</button>
      </div>`);
    /* Give the chart host back exactly the room this strip took, and no
       more. Only while the pane is on screen — a hidden element measures
       zero and would put the charts under the strip on the next visit. */
    const h = Math.round(host.getBoundingClientRect().height);
    if (h > 20 && (changed || sec._sgH2 !== h)) {
      sec._sgH2 = h;
      sec.style.setProperty('--sgFlowH', (h + 4) + 'px');
    }
  }

  /* =============================== STREAM =============================== */
  /* The clinical record, assembled from two places the shipped pane keeps
     apart: the aircraft stream, which carries what was delivered and what
     happened when it was given, and the run log, which carries the deaths —
     a casualty who decompensated before the aircraft arrived, and a casualty
     nobody could reach. Neither of those is in the stream at all, so the
     pane about what is happening on the ground did not carry the two events
     that matter most to the person reading it. */

  const CLINICAL_PHASES = /^(ADMINISTERED|UNDELIVERABLE|COLD CHAIN BROKEN|NOT RECOVERED)/;

  /* `hz` is the horizon, COUNT.clock(), not the mission clock — see the note
     in clinical(). Every one of the four filters below is a "has this happened
     yet" test, and every one of them was written against the mission clock,
     which is why four deaths stamped past the final minute never appeared in
     this list and the strip above it read 27 where the shell read 31. */
  function clinicalEvents(arm, hz) {
    const rows = [];
    for (const e of (arm.stream || [])) {
      if (e.t > hz || !CLINICAL_PHASES.test(e.phase)) continue;
      const stable = /CASUALTY STABLE$/.test(e.phase);
      const lost = /CASUALTY LOST$/.test(e.phase);
      rows.push({
        t: e.t, tRecv: e.tRecv, casId: e.casId, call: e.call, text: e.text,
        phase: stable ? 'TREATED · STABLE' : lost ? 'TREATED · DIED'
          : e.phase === 'UNDELIVERABLE' ? 'NOT QUALIFIED TO GIVE IT'
          : e.phase === 'COLD CHAIN BROKEN' ? 'UNUSABLE ON ARRIVAL'
          : 'NEVER FOUND',
        cls: stable ? 'ok' : 'bad'
      });
    }
    /* The run log carries the two death events the stream does not — a
       casualty who decompensated before the aircraft arrived, and one who
       died where nothing in the force could reach him — with the place name
       and the aircraft's remaining flight time written into the sentence.
       They are indexed by casualty and used as the wording below rather
       than pushed as rows of their own, because the log records only those
       two kinds of death and a stream that showed those and not the rest
       would undercount the dead. It did, on the first screenshot of this
       pane: eleven deaths on a screen whose own run killed twenty-three. */
    const said = {};
    for (const e of (arm.log || [])) {
      if (e.t > hz || (e.kind !== 'LATE' && e.kind !== 'COVERAGE')) continue;
      const m = /\bCAS-(\d+)\b/.exec(e.text || '');
      if (m) said[+m[1]] = e.text;
    }

    for (const c of (arm.casualties || [])) {
      if (c.tInjury > hz) continue;
      const sc = scene(c, !!APP.telementor);

      /* The casualty call, for the IMMEDIATE category only. Every casualty
         in the run is one of these and rendering 125 would put this pane
         back where it started; the IMMEDIATE ones are the calls a surgeon
         is woken for. */
      if (c.cls === 'IMMEDIATE') rows.push({
        t: c.tInjury, tRecv: c.tPinged != null ? c.tPinged : c.tInjury, casId: c.id, call: 'CALL',
        phase: 'WOUNDED · IMMEDIATE', cls: 'warn',
        text: String(c.injury).replace(/_/g, ' ').toLowerCase() +
          (ROLES_ && ROLES_[c.role] ? ' · ' + ROLES_[c.role].label : '') +
          ' · ' + sc.tier.name + ' on scene' +
          (sc.gap ? ' — not qualified to give ' + String(SHORT[sc.gap] || sc.gap).toLowerCase() : '')
      });

      /* The death. Every casualty who died without a treatment arriving —
         a treated casualty who died anyway already has an ADMINISTERED —
         CASUALTY LOST event above and is not counted twice. */
      if (c.outcome === 'DIED' && !c.treated && c.tResolved != null && c.tResolved <= hz) {
        const why = deathReason(c, arm);
        rows.push({
          t: c.tResolved, tRecv: c.tResolved, casId: c.id, call: '—',
          phase: 'DIED OF WOUNDS', cls: 'bad',
          text: said[c.id] || `${(c.tResolved - c.tInjury).toFixed(0)} min after wounding · ` +
            String(c.injury).replace(/_/g, ' ').toLowerCase() + ' · ' + why.toLowerCase() + '.'
        });
      }
    }
    rows.sort((a, b) => a.t - b.t);
    return rows;
  }

  const STREAM_ROWS = 36;

  function composeStream() {
    const head = document.querySelector('[data-pane="STREAM"] .paneHead');
    const host = mountBefore('[data-pane="STREAM"]', 'sgStream', '.strTiles');
    if (head) {
      const tools = head.querySelector('.phTools');
      if (tools) foldControl('sgStreamMore', tools, 'the whole stream');
    }
    if (!host || !isSurgeon()) return;
    const S = clinical();
    if (!S) { paint(host, ''); return; }
    const rows = clinicalEvents(S.A, S.hz);
    const treated = rows.filter(r => r.phase === 'TREATED · STABLE').length;
    const lost = rows.filter(r => r.phase === 'TREATED · DIED').length;
    const unq = rows.filter(r => r.phase === 'NOT QUALIFIED TO GIVE IT').length;
    const died = rows.filter(r => r.phase === 'DIED OF WOUNDS').length;
    const shown = rows.slice(-STREAM_ROWS).reverse();
    const body = shown.map(r => `<tr${r.casId ? ` data-cas="${r.casId}"` : ''}>
      <td class="mono">${fmtT(r.t)}</td>
      <td class="mono ${r.tRecv === null ? 'hot' : r.tRecv > r.t + 0.01 ? 'warm' : 'calm'}">${
        r.tRecv === null ? 'not yet' : fmtT(r.tRecv)}</td>
      <td class="mono">${r.casId ? casId(r.casId) : '—'}</td>
      <td>${pill(r.phase, r.cls)}</td>
      <td class="wide">${esc(r.text)}</td></tr>`).join('');

    paint(host, `
      <div class="sgLine">
        <span class="sgTag">CLINICAL EVENTS ONLY</span>
        <span class="sgV ${died ? 'bad' : 'calm'}">${n0(rows.length)}</span>
        <span class="sgT">${plural(rows.length, 'event', 'events')} that changed a casualty's clinical
          state — the call, the treatment, and the outcome of the treatment.
          <em>On station, payload away and recovered are the logistics record and are in the whole stream,
          one click away.</em></span>
        <span class="sgTag">${n0(treated)} TREATED AND STABLE · ${n0(S.deadAll)} ${DIED_ALL} ·
          ${n0(S.dead)} ${DIED_SURV}</span>
      </div>
      <div class="sgTiles">
        <div class="sgTile"><h4>TREATED, AND STABLE AFTER IT</h4>
          <div class="sgN"><b>${n0(treated)}</b><i>the moment that counts</i></div>
          <p>A package reached a pair of hands qualified to use it, in time.</p></div>
        <div class="sgTile${lost ? ' hot' : ''}"><h4>TREATED, AND DIED ANYWAY</h4>
          <div class="sgN"><b class="${lost ? 'bad' : 'calm'}">${n0(lost)}</b><i>too late, or too little</i></div>
          <p>The treatment arrived and the casualty did not survive it.</p></div>
        <div class="sgTile${unq ? ' hot' : ''}"><h4>ARRIVED, NOBODY QUALIFIED</h4>
          <div class="sgN"><b class="${unq ? 'bad' : 'calm'}">${n0(unq)}</b><i>a matching failure</i></div>
          <p>The package was on the ground and the responder was not trained to administer it.</p></div>
        <div class="sgTile${died ? ' hot' : ''}"><h4>DIED WITH NOTHING ARRIVING</h4>
          <div class="sgN"><b class="${died ? 'bad' : 'calm'}">${n0(died)}</b><i>before, or out of range</i></div>
          <p>Decompensated before the aircraft arrived, or no launch point could reach the position.
            This tile is one way of dying, and not the whole toll:
            ${esc(COUNT.deathBridge(S.A))}</p></div>
      </div>
      <div class="sgScroll">
        <table class="sgTable"><thead><tr>
          <th style="width:78px">Happened</th><th style="width:78px">Received</th>
          <th style="width:92px">Casualty</th><th style="width:200px">What happened</th><th>Report</th>
        </tr></thead><tbody>${body || `<tr><td colspan="5" class="empty">${S.deployed
          ? 'Nothing clinical has happened yet.' : 'Nothing has happened yet. Send the drones.'}</td></tr>`}</tbody></table>
      </div>
      <p class="sgGloss">${rows.length > STREAM_ROWS
        ? `The most recent <b>${n0(STREAM_ROWS)}</b> of <b>${n0(rows.length)}</b> clinical events, newest
           first. The whole stream — every aircraft report, all ${n0(COUNT.streamTo(S.A).length)}
           of them — is one control away and is unfiltered.`
        : `Newest first. The whole stream — every aircraft report, on station and payload away included —
           is one control away and is unfiltered.`} Click a row with a casualty on it for the record.</p>`);
  }

  /* =============================== SENSOR =============================== */
  /* device.js builds this pane once and then repaints its own numbers on a
     250 ms interval, so there is no render pass to hang a strip off. The
     strip therefore reads the numbers the module has already published to
     the DOM — the estimate, its interval and its own trust verdict — rather
     than running a second inference or keeping a second copy of the
     calibration. Two readouts of one network cannot disagree if only one of
     them does the arithmetic. */
  function composeSensor() {
    const pane = document.querySelector('[data-pane="SENSOR"] .pane');
    if (!pane) return;
    let host = document.getElementById('sgSensorTop');
    if (!host) {
      host = document.createElement('div');
      host.id = 'sgSensorTop';
      host.setAttribute('data-roles', 'SURGEON');
      const body = document.getElementById('sensorBody');
      pane.insertBefore(host, body || null);
    }
    const head = pane.querySelector('.paneHead');
    if (head) {
      let tools = head.querySelector('.phTools');
      if (!tools) {
        tools = document.createElement('div');
        tools.className = 'phTools';
        tools.setAttribute('data-roles', 'SURGEON');
        head.appendChild(tools);
      }
      foldControl('sgSensorMore', tools, 'the model and how it was validated');
    }
    if (!isSurgeon()) return;

    const val = document.getElementById('criVal');
    const ci = document.getElementById('criCI');
    const bandEl = document.getElementById('criBand');
    const trust = document.getElementById('criTrust');
    const cri = val ? parseFloat(val.textContent) : NaN;

    if (!val || !isFinite(cri)) {
      paint(host, `<div class="sgRead">
        <div class="sgBig"><b class="">—</b><span>COMPENSATORY RESERVE</span></div>
        <span class="sgRule"></span>
        <div><p class="sgSay"><b>The network has not read a waveform yet.</b> It reads a five-second
          window at 100 Hz, so the first estimate lands about five seconds after this pane opens and
          once a second after that — the cadence the fielded device reports on. The sensor below
          produces a photoplethysmogram, the optical pulse waveform a wrist device actually makes, and a
          104,162-parameter network reads the casualty's remaining compensatory reserve out of it on
          this machine, with no access to the true value.</p>
          <p class="sgSay"><b>Compensatory reserve</b> is how much of the body's ability to hold blood
          pressure against blood loss is left. It falls before heart rate and blood pressure move, which
          is the lead time this whole system is tasked against.</p></div>
      </div>`);
      return;
    }

    const pct = Math.round(cri * 100);
    const cls = cri < 0.30 ? 'bad' : cri < 0.50 ? 'warn' : 'ok';
    const box = cri < 0.30 ? 'hot' : cri < 0.50 ? 'warm' : '';
    const tk = trust ? (trust.className.split(/\s+/).find(k => k === 'ok' || k === 'warn' || k === 'bad') || '') : '';
    const verdict = tk === 'bad'
      ? `<b>The model is telling you not to use this reading.</b> Its interval is wider than 97% of the
         intervals it produces on clean signal, and tasking will not commit an aircraft on it alone.`
      : tk === 'warn'
        ? `<b>Corroborate before committing.</b> The interval is wider than three quarters of clean
           readings, so tasking holds this casualty at lower confidence.`
        : `<b>Tasking may commit on this reading.</b> The interval is inside the actionable band measured
           at calibration, where the mean absolute error is 0.063.`;
    const meaning = cri < 0.30
      ? `At this reserve the body is at or past the point where it can no longer hold blood pressure
         against the loss. Heart rate and pressure may still look survivable; they are about to stop
         looking that way.`
      : cri < 0.50
        ? `Reserve is falling into the band where the casualty has minutes rather than an hour. This is
           the window a Golden Hour policy misses.`
        : `Reserve is intact. Nothing here is asking for an aircraft.`;

    paint(host, `<div class="sgRead ${box}">
      <div class="sgBig"><b class="${cls}">${pct}%</b>
        <span>COMPENSATORY RESERVE${bandEl && bandEl.textContent && bandEl.textContent !== '—'
          ? ' · ' + esc(bandEl.textContent.toUpperCase()) : ''}</span></div>
      <span class="sgRule"></span>
      <div><p class="sgSay"><b>What this means for the casualty.</b> ${meaning}
        The network also reports its own uncertainty: the 95% interval on this reading is
        <b>${ci ? esc(ci.textContent) : '—'}</b> — the width of that interval is the message, not a defect.
        ${prov('TRUST', 'the verdict in the next sentence is the gate\u2019s, computed from the interval width beside it')}
        ${verdict}</p>
        <p class="sgSay"><b>Compensatory reserve</b> is how much of the body's ability to hold blood
        pressure against blood loss remains: 100% uninjured, 0% the point at which pressure falls. It
        moves before heart rate and blood pressure do. Roughly one casualty in seven never mounts the
        tachycardia everyone looks for, which is why this reads the waveform instead of counting beats.</p></div>
    </div>`);
  }

  /* ============================== DOCTRINE ============================== */
  /* The questions a surgeon actually asks, in the words a surgeon uses. They
     drive the module's own search box and its own Search control — the same
     code path as typing the question — so nothing here embeds a second
     retrieval, a second score, or a second opinion about what the corpus
     says. */
  const ASKS = [
    ['MARCH — the sequence', 'What is the MARCH sequence?'],
    ['Whole blood or components in haemorrhagic shock', 'Is whole blood or component therapy preferred for haemorrhagic shock?'],
    ['TXA — how late is too late', 'How long after wounding can tranexamic acid still be given?'],
    ['Tourniquet conversion after two hours', 'Can I convert a tourniquet after two hours?'],
    ['Blood out of refrigeration', 'How long can whole blood stay out of refrigeration?'],
    ['Freeze-dried plasma — storage and reconstitution', 'How is freeze-dried plasma stored and reconstituted?'],
    ['Prolonged casualty care when evacuation is delayed', 'What is prolonged casualty care when evacuation is delayed?'],
    ['What a Role 2 can do that a Role 1 cannot', 'What can a Role 2 do that a Role 1 cannot?']
  ];

  function composeDoctrine() {
    const pane = document.querySelector('[data-pane="DOCTRINE"] .pane');
    if (!pane) return;
    let host = document.getElementById('sgDocTop');
    if (!host) {
      host = document.createElement('div');
      host.id = 'sgDocTop';
      host.setAttribute('data-roles', 'SURGEON');
      pane.insertBefore(host, document.getElementById('doctrineBody') || null);
    }
    const head = pane.querySelector('.paneHead');
    if (head) {
      let tools = head.querySelector('.phTools');
      if (!tools) {
        tools = document.createElement('div');
        tools.className = 'phTools';
        tools.setAttribute('data-roles', 'SURGEON');
        head.appendChild(tools);
      }
      foldControl('sgDocMore', tools, 'the encoder and how it was measured');
    }
    if (!isSurgeon()) return;
    paint(host, `<div class="card">
      <div class="cardHead">Ask it something ${prov('RETRIEVAL', 'the encoder ranks the corpus for this question and the answer is quoted from it, never written')}</div>
      <div class="sgBody">
        <div class="sgChips">${ASKS.map(([label, q]) =>
          `<span class="chip" data-sg="ask" data-sgq="${esc(q)}">${esc(label)}</span>`).join('')}</div>
        <p><b>Every answer below is quoted, not written</b> — and every passage it quotes from is a
          summary prepared for this prototype, not an extract. Read the notice directly under these
          chips before you read an answer, and use the actual publication for anything operational.</p>
      </div>
    </div>`);
  }

  /* =============================== TASKING ============================== */

  function composeTasking() {
    const pane = document.querySelector('[data-pane="TASKING"] .pane');
    if (!pane) return;
    let line = document.getElementById('sgTaskTop');
    if (!line) {
      line = document.createElement('div');
      line.id = 'sgTaskTop';
      line.setAttribute('data-roles', 'SURGEON');
      const head = pane.querySelector('.paneHead');
      pane.insertBefore(line, head ? head.nextSibling : pane.firstChild);
    }
    const tools = pane.querySelector('.phTools');
    if (tools) foldControl('sgTaskingMore', tools, 'the escalation policy');
    if (!isSurgeon()) return;
    const S = clinical();
    if (!S) { paint(line, ''); return; }
    const q = S.A.queue || [];
    const ground = k => q.filter(p => (p.reasons || []).indexOf(k) >= 0).length;
    const imm = ground('IMMEDIATE UNASSIGNED');
    const lowc = ground('LOW CONFIDENCE');
    const pending = q.filter(p => p.state === 'PENDING').length;
    const expired = (S.A.stats && S.A.stats.expired) || 0;
    paint(line, `
      <div class="sgLine">
        <span class="sgV ${imm ? 'bad' : 'calm'}">${n0(imm)}</span>
        <span class="sgT">${plural(imm, 'proposal was', 'proposals were')} stopped on a clinical ground —
          the sortie would have served a lower-acuity casualty while an IMMEDIATE inside that aircraft's
          reach still had nobody coming.
          <em><b>${n0(lowc)}</b> ${plural(lowc, 'was', 'were')} stopped because the reserve reading behind
          the decision was one the network said not to trust.
          ${pending ? n0(pending) + ' ' + plural(pending, 'proposal is', 'proposals are') + ' waiting on a person now.'
            : 'Nothing is waiting on a person now.'}
          ${expired ? n0(expired) + ' expired unactioned — hesitation is logged with the minute it happened.' : ''}</em></span>
        <span class="sgTag">${n0((S.A.stats && S.A.stats.autoApproved) || 0)} LAUNCHED ON STANDING AUTHORITY</span>
      </div>`);
  }

  /* ================================ UNITS =============================== */

  function composeUnits() {
    const host = mountBefore('[data-pane="UNITS"]', 'sgUnits', '.uavStatus');
    const head = document.querySelector('[data-pane="UNITS"] .paneHead');
    if (head) {
      const tools = head.querySelector('.phTools');
      if (tools) foldControl('sgUnitsMore', tools, 'the relay and the poll log');
    }
    if (!host || !isSurgeon()) return;
    const S = clinical();
    const roll = G('unitRoll');
    if (!S || !roll || !APP.units) { paint(host, ''); return; }
    /* The per-unit roll is summed for the three quantities that are only ever
       stated per unit — open, below-floor, high-value. The death figure is
       NOT summed here: it is an operation-wide total that four other panes
       also print, so it is read from COUNT, and a rounding of the roster into
       units that happened to omit one casualty could not move it. */
    let open = 0, urgent = 0, hva = 0, stale = 0;
    for (const un of APP.units) {
      let r; try { r = roll(un.key); } catch (e) { continue; }
      open += r.open || 0; urgent += r.urgent || 0; hva += r.hva || 0;
      stale = Math.max(stale, r.stale || 0);
    }
    paint(host, `
      <div class="sgLine">
        <span class="sgV ${urgent ? 'bad' : 'calm'}">${n0(urgent)}</span>
        <span class="sgT">${plural(urgent, 'soldier is', 'soldiers are')} below the reserve floor across
          ${n0(APP.units.length)} ${plural(APP.units.length, 'unit')} —
          <b>${n0(open)}</b> wounded on the ground in total${hva
            ? `, <b>${n0(hva)}</b> of them holding a capability the commander designated as
               irreplaceable` : ''}.
          <em>Below the reserve floor means the wearable is reading under ${n0(CRM_RED)}% compensatory
          reserve: the body is close to the point where it can no longer hold blood pressure against the
          blood it has lost.</em></span>
        <span class="sgTag">${n0(S.deadAll)} ${DIED_ALL} · TELEMETRY ${
          stale < 0.2 ? 'LIVE' : n0(stale) + ' MIN OLD'}</span>
      </div>`);
  }

  /* ------------------------------------------------- mounts and controls */

  function mountBefore(paneSel, id, beforeSel, cls) {
    const pane = document.querySelector(paneSel + ' .pane');
    if (!pane) return null;
    let el = document.getElementById(id);
    if (el) return el;
    el = document.createElement('div');
    el.id = id;
    if (cls) el.className = cls;
    el.setAttribute('data-roles', 'SURGEON');
    /* The anchor may be nested rather than a direct child, and insertBefore
       throws on a node that is not a child of the parent. Walk up to the
       child of .pane that contains it. */
    let anchor = beforeSel ? pane.querySelector(beforeSel) : null;
    while (anchor && anchor.parentElement !== pane) anchor = anchor.parentElement;
    pane.insertBefore(el, anchor || null);
    return el;
  }

  /* One control per reduced pane. It never deletes anything: the blocks a
     surgeon does not act on are folded, and the fold is labelled and
     tab-reachable. */
  function foldControl(id, host, label) {
    if (!host) return null;
    const found = document.getElementById(id);
    if (found) return found;
    const b = document.createElement('button');
    b.id = id;
    b.className = 'sgMore';
    b.type = 'button';
    b.setAttribute('data-roles', 'SURGEON');
    b.setAttribute('data-sg', 'fold');
    b.setAttribute('data-sglabel', label);
    b.setAttribute('aria-expanded', 'false');
    b.textContent = label;
    host.appendChild(b);
    return b;
  }

  /* ------------------------------------------------------------- actions */
  /* One delegated handler for the controls this file creates. The host's own
     delegated actions — data-cas, data-hva, data-approve — are reused as
     they are rather than reimplemented, so a surgeon's row and an analyst's
     row are literally the same code path. */
  function bind() {
    if (document._sgBound) return;
    document._sgBound = true;
    document.addEventListener('click', ev => {
      const el = ev.target.closest && ev.target.closest('[data-sg]');
      if (!el) return;
      const cmd = el.dataset.sg;
      ev.preventDefault(); ev.stopPropagation();
      const render = G('render');
      if (APP) APP._paneForce = true;

      if (cmd === 'fold' || cmd === 'foldFlow') {
        const sec = el.closest('.viewport');
        if (sec) {
          const on = sec.classList.toggle('sgOpen');
          el.setAttribute('aria-expanded', String(on));
          const label = el.getAttribute('data-sglabel');
          if (label) el.textContent = on ? 'hide ' + label : label;
          missAt = 0;
          if (cmd === 'foldFlow') nudgeFlow();
        }
        if (render) render();
        return;
      }
      if (cmd === 'foldDrawer') {
        const dw = document.getElementById('drawer');
        if (dw) dw.classList.toggle('sgOpen');
        if (render) render();
        return;
      }
      if (cmd === 'ask') {
        /* The module's own search box and its own Search button, driven the
           way a person would drive them. */
        const box = document.getElementById('docQ');
        const go = document.getElementById('docGo');
        if (box) box.value = el.getAttribute('data-sgq') || '';
        if (go) go.click();
        return;
      }
    }, true);
  }

  /* --------------------------------------------------- late-arriving views */
  /* FLOW, SENSOR and DOCTRINE are contributed by deferred ES modules through
     ANGEL.views, each of which may finish loading long after this classic
     script has run — or never, in which case the module deletes its own pane
     and rail entry and there is nothing here to wrap. So the wrap is
     attempted at boot and again on every status event from the registry,
     which is what fires when one of them reports ready. Each wrapper is
     idempotent: the flag is on the function, not in a list this file keeps. */
  function wrapView(key, after) {
    const V = window.ANGEL && ANGEL.views;
    if (!V) return;
    const native = V[key];
    if (typeof native !== 'function' || native._sgWrapped) return;
    const w = function () {
      const r = native.apply(this, arguments);
      try { after(); } catch (e) { console.warn(key + ' (surgeon)', e); }
      return r;
    };
    w._sgWrapped = true;
    V[key] = w;
  }
  function wrapLateViews() {
    wrapView('FLOW', composeFlow);
    wrapView('SENSOR', composeSensor);
    wrapView('DOCTRINE', composeDoctrine);
  }

  /* ----------------------------------------------------------- bootstrap */
  ANGEL.ready('role-surgeon', async () => {
    /* Without the shell there is nothing to compose. Fail silently: the
       eight panes keep the interface they already had. */
    if (!APP || !window.ANGEL) {
      if (window.ANGEL && ANGEL.setStatus)
        ANGEL.setStatus('role-surgeon', 'withheld', 'application shell not present');
      return null;
    }
    /* Every figure this profile prints is a COUNT quantity or is derived from
       the horizon COUNT publishes. Without it there is no way to compose these
       eight panes that is guaranteed to agree with the rest of the
       application, and a screen that quietly disagrees with the shell is worse
       than the eight panes as they shipped. So this is withheld, not
       approximated. */
    if (!HAS_COUNT) {
      if (ANGEL.setStatus)
        ANGEL.setStatus('role-surgeon', 'withheld', 'COUNT (the counted nouns) not present');
      return null;
    }

    injectCSS();
    bind();

    /* CASUALTIES and the drawer are overridden; the rest are reduced. Both
       forms wrap a global that render() calls by name, and in both the
       native binding is captured in a local const before the wrapper is
       installed, so no wrapper can resolve back to itself. */
    const override = (name, mine) => {
      const native = window[name];
      if (typeof native !== 'function' || native._sgWrapped) return;
      if (name === 'renderCasualties') nativeCasualties = native;
      const w = function () {
        if (isSurgeon()) {
          try { return mine(); } catch (e) { console.warn(name + ' (surgeon)', e); return; }
        }
        return native.apply(this, arguments);
      };
      w._sgWrapped = true;
      window[name] = w;
    };
    const reduce = (name, after) => {
      const native = window[name];
      if (typeof native !== 'function' || native._sgWrapped) return;
      const w = function () {
        const r = native.apply(this, arguments);
        try { after(); } catch (e) { console.warn(name + ' (surgeon)', e); }
        return r;
      };
      w._sgWrapped = true;
      window[name] = w;
    };

    /* The mount has to exist before the override can paint into it, and it
       has to exist for every role — hidden by the attribute for the other
       three — because the stylesheet rule that empties this pane is keyed on
       the profile, not on whether a module happened to run. */
    seedCasualties();
    override('renderCasualties', renderSurgCasualties);

    reduce('renderDrawer', composeDrawer);
    reduce('renderMission', composeMission);
    reduce('renderStream', composeStream);
    reduce('renderTasking', composeTasking);
    reduce('renderUnits', composeUnits);

    wrapLateViews();
    ANGEL.on('status', ev => {
      if (ev && ev.detail && ev.detail.state === 'ready') wrapLateViews();
    });

    /* device.js repaints its own readout on a 250 ms interval with no render
       pass behind it, so the clinical line above it is refreshed on the same
       cadence and only while that pane is the one on screen. Everything else
       here is driven by render(). */
    setInterval(() => {
      if (!isSurgeon()) return;
      const p = document.querySelector('[data-pane="SENSOR"]');
      if (p && p.classList.contains('active')) { try { composeSensor(); } catch (e) { } }
    }, 400);

    /* The fold controls and mounts are created on first render of their
       pane, which leaves every pane but the landing view without one until
       first visit. Create them all now so a surgeon never meets a reduced
       pane with no way to unfold it. */
    const seed = () => {
      seedCasualties();
      composeStream(); composeTasking(); composeUnits(); composeMission();
      composeSensor(); composeDoctrine(); composeFlow(); wrapLateViews();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', seed, { once: true });
    else seed();

    /* A role change is a presentation change and must not disturb the run.
       All this does is force the next frame to rebuild — the reduced and
       unreduced compositions differ by more than a stylesheet rule can
       express, because the strips carry live text — and re-fit the charts on
       FLOW, whose host moves by the height of this profile's strip. */
    ANGEL.need('role').then(role => role.on(() => {
      APP._paneForce = true;
      missAt = 0;
      seed();
      nudgeFlow();
    })).catch(() => { });

    ANGEL.mark('role-surgeon ready', {
      overridden: ['CASUALTIES', 'record drawer'],
      reduced: ['MISSION', 'FLOW', 'STREAM', 'SENSOR', 'DOCTRINE', 'TASKING', 'UNITS']
    });
    return true;
  });
})();
