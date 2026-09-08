/* =========================================================================
   LOGISTICIAN — seven destinations, and one question.

   The role engine gives a logistician seven places to stand: DASHBOARD,
   SUPPLY, FLEET, MISSION, STREAM, TASKING, COST. All seven already existed;
   all seven were written for an analyst. This file makes them the shape of
   the question the person reading them is actually asking, which is never
   "how many died". It is:

       do I have the right stuff, in the right place, at the right
       temperature, and what am I about to run out of.

   Four things follow from that, and they govern every line below.

   THE STOCKOUT IS THE HEADLINE. A projected time to stockout is the single
   most logistician-shaped number this simulation can produce and it was not
   displayed anywhere except as one word ("stable", "> 10 h") in the corner
   of a card head. It is computed here per item and per launch point from
   arm.stockLog — the authoritative record of every unit issued, wasted,
   returned and resupplied — against the scheduled resupply rate, and it
   leads the landing view. Where the arithmetic cannot honestly support a
   projection (too little history, or resupply outrunning demand) it says
   which, rather than printing a number that reads like a forecast.

   THE TWO WASTES ARE NOT THE SAME WASTE. The simulation distinguishes three
   ways a unit is destroyed and they are three different logistics failures
   with three different fixes:

     · delivered to a responder not qualified to administer it — a matching
       failure, fixed by payload selection or by telementoring, not by
       buying anything;
     · above the transfusable band on arrival — a cold-chain failure, fixed
       by a shorter leg or by aborting in flight;
     · released and never recovered — a delivery failure, fixed by the
       release method.

   Collapsing them into one "wasted" column, which is what every pane in
   this application did, throws away the only part of the number that tells
   anyone what to do about it. The waste ledger here is split three ways
   across both arms and is the centrepiece of SUPPLY.

   ROLES REMOVE SURFACE, NEVER CAPABILITY. DASHBOARD is the one pane this
   file genuinely overrides — the theatre picture is a commander's screen and
   a logistician standing on it learns nothing about his shelves — and the
   override delegates to the native renderer for every other role, untouched.
   The other five are *reduced*: the native renderer runs first and
   unconditionally, this file adds the answer at the top, and the blocks a
   logistician does not act on are folded behind one control labelled "show
   the detail" rather than deleted. Nothing is removed from the document, so
   switching to ANALYST mid-sentence returns every pane whole.

   DEATHS ARE NEVER GREEN. Nothing in here colours a toll green and nothing
   says "saved". Where a death count appears at all it appears because a unit
   of blood did not get somewhere, which is this role's business.

   HOW THIS ATTACHES. renderDashboard, renderSupply, renderFleet,
   renderStream, renderTasking and renderMission are called by name from
   render() in app.js, ahead of the ANGEL.views registry, so this file wraps
   the six globals. Each native binding is captured in a local const before
   its wrapper is installed, so no wrapper can resolve back to itself — the
   mistake that costs a stack overflow on first call and has been made once
   in this application already (ROLE_CONTRACT §3). COST belongs to
   role-commander and is reduced from the outside: a strip inserted as a
   sibling of #costBody, which that module rebuilds wholesale, plus
   stylesheet rules that fold three of its cards. Nothing here writes into
   another module's mount.

   WHAT IS MARKED. Every element this file creates carries
   data-roles="LOGISTICIAN" as it is created, per the contract's "mark up, do
   not filter" rule, so it is correct on arrival and stays correct through a
   rebuild without this module being told anything. Every stylesheet rule
   that hides a native block is scoped to
   body[data-role-profile="LOGISTICIAN"]. Measured: the analyst, commander
   and surgeon profiles come to the same element and control counts with this
   file loaded as without it, in all three run states.
   ========================================================================= */

(function () {
  'use strict';

  /* Above-the-fold budget on the design viewport: 1000px of window, less the
     22px classification band, less a 52px single-row command bar, less the
     pane's 34px of vertical padding. That leaves ~880px, and the three
     blocks that answer the question — what runs out first, what is on the
     shelf and in the air, what has been destroyed and why — are sized to
     fit inside it. Everything below that line is supporting detail. */

  const CSS = `
/* -------------------------------------------------------- LOGISTICIAN --
   A supply screen read standing up, at a wall, by somebody who has to say a
   number out loud. One figure large enough to carry the room, dense tables
   underneath it, and no chart that does not change a decision. Nothing here
   loads unless this file loads, and every rule that hides a native block is
   scoped to the logistician profile so the other three roles cannot see it.
   ---------------------------------------------------------------------- */

/* ---- the mount points -------------------------------------------------- */
#lqDash{display:flex; flex-direction:column; gap:12px}
.lqStack{display:flex; flex-direction:column; gap:12px}
/* Every block in a mount is its natural height and the pane scrolls.
   Without this they are flex items in a column shorter than their content,
   and flexbox pays for the overrun by shrinking them — and a flex item whose
   overflow is hidden, which every .card and the ledger strip are, has an
   automatic minimum size of zero. Measured: the four-cell ledger row
   collapsed to its own two borders, two pixels tall, and stayed there.
   The id selector keeps the mounts themselves free to fill. */
.lqStack{flex:0 0 auto}
.lqStack > *{flex:0 0 auto}
#lqStream > .lqScroll{flex:1 1 auto}

/* ---- the lead: what runs out first ------------------------------------ */
.lqLead{
  display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:24px;
  border:1px solid var(--line); border-radius:12px; padding:13px 20px; background:var(--panel);
}
.lqLead.tight{border-color:rgba(255,66,87,.55);
  background:linear-gradient(180deg, rgba(255,66,87,.10), rgba(255,66,87,.02))}
body.light .lqLead.tight{background:linear-gradient(180deg, rgba(214,31,56,.09), rgba(214,31,56,.02))}
.lqLead.soon{border-color:rgba(255,179,64,.5);
  background:linear-gradient(180deg, rgba(255,179,64,.09), rgba(255,179,64,.02))}
.lqKick{display:flex; align-items:center; gap:9px; margin-bottom:8px;
  font:700 9px/1 var(--mono); letter-spacing:.19em; color:var(--faint)}
.lqLead.tight .lqKick{color:var(--bad)} .lqLead.soon .lqKick{color:var(--warn)}
.lqHeadline{margin:0; font:800 21px/1.22 var(--sans); letter-spacing:.005em}
.lqFigs{display:flex; align-items:flex-end; gap:24px; margin-top:11px; flex-wrap:wrap}
.lqFig{display:flex; flex-direction:column; gap:5px; min-width:0}
.lqFig b{font:800 50px/.88 var(--mono); letter-spacing:-.035em; color:var(--text)}
.lqFig.hot b{color:var(--bad)} .lqFig.warm b{color:var(--warn)} .lqFig.calm b{color:var(--ok)}
.lqFig.sm b{font-size:27px; line-height:1}
.lqFig span{font:600 9px/1.35 var(--mono); letter-spacing:.1em; color:var(--dim); max-width:28ch}
.lqRule{width:1px; align-self:stretch; background:var(--line); margin:2px 0}
.lqSay{margin:11px 0 0; font:400 11.5px/1.65 var(--sans); color:var(--dim); max-width:100ch}
.lqSay b{color:var(--text); font-weight:700}
.lqSay em{font-style:normal; color:var(--faint)}
.lqAct{display:flex; flex-direction:column; align-items:stretch; gap:8px; min-width:190px}
.lqAct .btn{padding:11px 16px; font-size:12px; text-align:center}
.lqAct .lqSub{font:500 10px/1.45 var(--sans); color:var(--faint); text-align:center; max-width:200px}

/* ---- the three-across row --------------------------------------------- */
/* Measured, not guessed. The shelf table is eight columns, five of them
   carrying a bar and a figure, and it needs ~760px before anything in it is
   clipped; a third of the content area is 545px and clipped the two columns
   that matter most — how much was lost there, and how long it lasts. So the
   shelf takes the wide side of a two-column row and the cold chain sits
   beside it, and the burn table and the waste ledger take the row under. */
.lqRowA{display:grid; grid-template-columns:1.62fr 1fr; gap:12px; align-items:start}
.lqRowB{display:grid; grid-template-columns:1fr 1.15fr; gap:12px; align-items:start}
@media (max-width:1240px){ .lqRowA, .lqRowB{grid-template-columns:1fr} }
.lqRow2{display:grid; grid-template-columns:1fr 1fr; gap:12px; align-items:start}
@media (max-width:1100px){ .lqRow2{grid-template-columns:1fr} }

.lqBody{padding:11px 14px; display:flex; flex-direction:column; gap:9px}
.lqBody p{margin:0; font:400 11px/1.6 var(--sans); color:var(--dim)}
.lqBody p b{color:var(--text)}
.lqBody p.foot{font-size:10.5px; color:var(--faint); border-top:1px solid var(--line); padding-top:8px}
.lqBody p.foot b{color:var(--dim)}

/* ---- tables: the shell's .grid idiom, one notch tighter ---------------- */
.lqTable{width:100%; border-collapse:collapse; font-size:11.5px}
/* The header wraps. Under table-layout:auto a width on a column is a
   preferred width, not a floor — until nowrap on the header makes the whole
   heading string the column's minimum, at which point the table can only
   grow. Measured at 1280px before this: "What is on the shelf, and where"
   wanted 722px inside a 608px card and "Blood runs out" was clipped away by
   the card's overflow. Wrapping lets the columns give way first; polish.css
   §7 scrolls the card if even that is not enough. */
.lqTable th{
  text-align:left; padding:7px 11px; background:var(--panel2); border-bottom:1px solid var(--line);
  font:700 8.5px/1.25 var(--mono); letter-spacing:.11em; color:var(--faint);
  white-space:normal; overflow-wrap:break-word; min-width:0;
}
.lqTable td{min-width:0}
.lqTable th.num, .lqTable td.num{text-align:right}
.lqTable td{padding:6px 11px; border-bottom:1px solid var(--line); vertical-align:middle; white-space:nowrap}
.lqTable tr:last-child td{border-bottom:0}
.lqTable tr.total td{background:var(--panel2); font-weight:700}
.lqTable td.wide{white-space:normal; font:400 11px/1.55 var(--sans); color:var(--dim)}
.lqTable td.wide b{color:var(--text)}
.lqTable .mono{font-family:var(--mono)}
.lqTable td.hot{color:var(--bad)} .lqTable td.warm{color:var(--warn)}
.lqTable td.calm{color:var(--dim)}
.lqTable tbody tr.dry td{background:rgba(255,66,87,.07)}

/* ---- the ledger cells: on the shelf / in the air / spent / destroyed --- */
.lqCells{
  display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:0;
  border:1px solid var(--line); border-radius:11px; overflow:hidden; background:var(--panel);
}
.lqCell{padding:11px 14px; border-right:1px solid var(--line); min-width:0}
.lqCell:last-child{border-right:0}
.lqCell b{display:block; font:800 27px/1 var(--mono); letter-spacing:-.02em; color:var(--text)}
.lqCell b.hot{color:var(--bad)} .lqCell b.warm{color:var(--warn)} .lqCell b.calm{color:var(--ok)}
.lqCell span{display:block; margin-top:5px; font:600 8.5px/1.35 var(--mono); letter-spacing:.1em; color:var(--faint)}
.lqCell i{display:block; margin-top:5px; font:400 10.5px/1.5 var(--sans); font-style:normal; color:var(--dim)}

/* ---- cold chain -------------------------------------------------------- */
.lqTemp{display:inline-flex; align-items:center; gap:7px}
.lqTemp b{font:700 12px/1 var(--mono)}
.lqBand{
  position:relative; width:74px; height:7px; border-radius:4px; overflow:hidden;
  background:linear-gradient(90deg, rgba(91,180,255,.5) 0%, rgba(49,214,138,.5) 22%,
    rgba(49,214,138,.5) 72%, rgba(255,179,64,.55) 86%, rgba(255,66,87,.6) 100%);
}
.lqBand i{position:absolute; top:-2px; width:2px; height:11px; background:var(--text); border-radius:1px}
.lqOk{color:var(--ok)} .lqWarn{color:var(--warn)} .lqBad{color:var(--bad)} .lqDim{color:var(--dim)}

/* ---- waste: three causes, three fixes, two arms ------------------------ */
.lqWaste th.arm{text-align:right; width:106px}
.lqWaste td.arm{text-align:right; font-family:var(--mono)}
.lqWaste td.arm b{font:700 15px/1 var(--mono)}
.lqWaste td.arm span{display:block; margin-top:3px; font:400 9.5px/1.3 var(--sans); color:var(--faint)}
.lqWaste .cause{font:600 11.5px/1.4 var(--sans); color:var(--text); white-space:normal; max-width:22ch}
.lqWaste .fix{font:400 10.5px/1.55 var(--sans); color:var(--dim); white-space:normal; max-width:56ch}
.lqWaste .fix b{color:var(--text)}
.lqZero{color:var(--ok)}
.lqNote{
  margin:0; padding:9px 12px; border-left:2px solid var(--line2); border-radius:0 6px 6px 0;
  background:var(--panel2); font:400 10.5px/1.6 var(--sans); color:var(--dim);
}
.lqNote b{color:var(--text)}

/* ---- the headline strip carried onto the reduced panes ----------------- */
.lqLine{
  display:flex; align-items:baseline; gap:14px; flex-wrap:wrap;
  border:1px solid var(--line); border-radius:10px; padding:10px 15px; background:var(--panel);
}
.lqLine .lqN{font:800 27px/1 var(--mono); letter-spacing:-.02em; color:var(--text)}
.lqLine .lqN.hot{color:var(--bad)} .lqLine .lqN.warm{color:var(--warn)}
.lqLine .lqN.calm{color:var(--ok)} .lqLine .lqN.flat{color:var(--dim)}
.lqLine .lqT{font:500 12px/1.45 var(--sans); color:var(--text); flex:1 1 340px; min-width:0}
.lqLine .lqT em{font-style:normal; color:var(--dim)}
.lqLine .lqT b{font-family:var(--mono)}
.lqLine .lqTag{
  font:700 8.5px/1 var(--mono); letter-spacing:.14em; color:var(--faint);
  border:1px solid var(--line); border-radius:4px; padding:5px 7px; white-space:nowrap;
}

/* ---- the "show the detail" affordance --------------------------------- */
/* One control per reduced pane. It never deletes anything: the blocks a
   logistician does not act on are folded, and the fold is labelled. */
.lqMore{
  display:inline-flex; align-items:center; gap:7px; cursor:pointer;
  border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:6px 10px;
  font:700 9.5px/1 var(--mono); letter-spacing:.1em; color:var(--dim);
}
.lqMore:hover{color:var(--text); border-color:var(--line2)}
.lqMore::after{content:'+'; font-size:12px; line-height:1}
.lqOpen .lqMore::after{content:'−'}

/* =======================================================================
   DASHBOARD — overridden, not reduced.
   The theatre picture, the four command tiles, the operations ranking and
   the threshold settings are a commander's screen end to end. A logistician
   standing on it learns nothing about his shelves, so the whole pane is
   replaced for this role and restored, untouched, for every other.
   ======================================================================= */
/* The native head names the theatre; the mount draws its own. That one is
   hidden in both fold states, because two pane heads on one pane is a bug in
   anybody's reading. */
body[data-role-profile="LOGISTICIAN"] [data-pane="DASHBOARD"] .pane > .paneHead{display:none !important}
/* Everything else is folded, not deleted — and the fold runs the native
   renderer, so what comes back underneath is live rather than whatever was
   last painted for some other role. */
body[data-role-profile="LOGISTICIAN"] [data-pane="DASHBOARD"]:not(.lqOpen) .pane > *:not(#lqDash),
body[data-role-profile="LOGISTICIAN"] [data-pane="DASHBOARD"]:not(.lqOpen) > *:not(.pane){
  display:none !important;
}
/* The pane is a flex column that scrolls, and the mount must be its own
   natural height inside it. Measured with the fold open: at flex:1 1 auto
   the mount was shrunk to nought by the theatre picture underneath it and,
   its overflow being visible, went on painting its five blocks over the top
   of the four it had just revealed. */
body[data-role-profile="LOGISTICIAN"] [data-pane="DASHBOARD"] #lqDash{flex:0 0 auto}

/* =======================================================================
   SUPPLY — reduced and deepened.
   The two stock tables are the best thing on this pane and they stay. What
   goes above them is the answer; what folds is the comparison arm's table
   (the waste ledger below states both arms in the same row, which is what
   the second table was for) and the cumulative-wasted-sorties chart, which
   is drawn four times in this application and answers nothing the ledger
   does not answer better.
   ======================================================================= */
body[data-role-profile="LOGISTICIAN"] [data-pane="SUPPLY"] .ph1 p{display:none}
/* "blood stockout in stable" in the card head is the same claim as the
   headline strip eighteen pixels above it, computed a different way — the
   net change in on-hand over the last twelve minutes, which lands on a
   different answer depending on where those twelve minutes fall relative to
   a resupply. Two projections of the same thing disagreeing on one screen is
   the defect this application was audited for. The one with its arithmetic
   written out stays; the other folds with the detail. */
body[data-role-profile="LOGISTICIAN"] [data-pane="SUPPLY"]:not(.lqOpen) .cardHead .proj{
  display:none !important;
}
body[data-role-profile="LOGISTICIAN"] [data-pane="SUPPLY"]:not(.lqOpen) .card:has(#supplyB),
body[data-role-profile="LOGISTICIAN"] [data-pane="SUPPLY"]:not(.lqOpen) .card:has(#chartWaste){
  display:none !important;
}
/* With one of the pair folded, the survivor takes the whole row rather than
   leaving a column-shaped hole where the other card was. */
body[data-role-profile="LOGISTICIAN"] [data-pane="SUPPLY"]:not(.lqOpen) .split:has(#supplyB),
body[data-role-profile="LOGISTICIAN"] [data-pane="SUPPLY"]:not(.lqOpen) .split:has(#chartWaste){
  grid-template-columns:1fr;
}
body[data-role-profile="LOGISTICIAN"] [data-pane="SUPPLY"] .split.grow{flex:0 0 auto; min-height:190px}

/* =======================================================================
   FLEET — reduced to the availability story.
   Callsign, platform, launch point, state, what it is carrying, container
   temperature, cycle count. What folds is the "current task" column, which
   is the tactical story and belongs on MISSION and STREAM.
   ======================================================================= */
body[data-role-profile="LOGISTICIAN"] [data-pane="FLEET"] .ph1 p{display:none}
body[data-role-profile="LOGISTICIAN"] [data-pane="FLEET"]:not(.lqOpen) .tableWrap .grid tr > *:nth-child(5){
  display:none !important;
}

/* =======================================================================
   MISSION — the map is the destination; the furniture around it is not.
   The wounded-soldier rail is the surgeon's, the layer filter is nobody's
   on this role, and the airframe rail beside them duplicates FLEET — but it
   duplicates FLEET, which is this role's own pane, so it stays.
   ======================================================================= */
body[data-role-profile="LOGISTICIAN"] [data-pane="MISSION"]:not(.lqOpen) #dock .hud:first-child,
body[data-role-profile="LOGISTICIAN"] [data-pane="MISSION"]:not(.lqOpen) #legend{
  display:none !important;
}
/* The GPU map draws its own transport — play, scrub, rate — along the bottom
   of the pane. This strip sat on top of it at z-index 6 and swallowed the
   pointer: elementFromPoint over #g3Play returned this element, so play and
   the scrubber were unpressable for a logistician and a surgeon and worked
   for a commander, which is exactly the "works in some views" the user
   reported. Lifted clear of the transport rather than layered over it. */
body.map3d #lqMissionStrip{bottom:96px}
#lqMissionStrip{
  position:absolute; left:12px; bottom:12px; z-index:6; max-width:660px;
  display:flex; align-items:center; gap:14px; flex-wrap:wrap;
  border:1px solid rgba(150,190,225,.22); border-radius:10px; padding:9px 14px;
  background:rgba(6,12,19,.93); backdrop-filter:blur(6px);
}
body.light #lqMissionStrip{background:rgba(255,255,255,.95); border-color:rgba(30,60,90,.16)}
#lqMissionStrip .lqMs{display:flex; flex-direction:column; gap:3px; min-width:0}
#lqMissionStrip .lqMs b{font:800 19px/1 var(--mono); letter-spacing:-.02em; color:var(--text)}
#lqMissionStrip .lqMs b.hot{color:var(--bad)} #lqMissionStrip .lqMs b.warm{color:var(--warn)}
#lqMissionStrip .lqMs b.calm{color:var(--ok)}
#lqMissionStrip .lqMs span{font:600 8px/1.3 var(--mono); letter-spacing:.11em; color:var(--faint)}
#lqMissionStrip .lqMore{margin-left:4px; background:transparent}

/* =======================================================================
   STREAM — filtered to the events that move stock.
   On station and the two administered phases are the clinical record; a
   logistician's stream is deliveries, the three ways a unit was destroyed,
   and the in-flight cold-chain aborts, which the shipped stream does not
   carry at all because they are written to the run log instead. The full
   stream is one click away and is the native table, unmodified.
   ======================================================================= */
body[data-role-profile="LOGISTICIAN"] [data-pane="STREAM"] .ph1 p{display:none}
/* The four filter chips and the event count belong to the native table. With
   that table folded they would be four controls that appear to do nothing,
   which is worse than four controls that are not offered — so they fold with
   it and come back with it. "Export CSV" stays: it writes the whole stream
   and is a capability, not a filter. */
body[data-role-profile="LOGISTICIAN"] [data-pane="STREAM"]:not(.lqOpen) .strTiles,
body[data-role-profile="LOGISTICIAN"] [data-pane="STREAM"]:not(.lqOpen) #stFilters,
body[data-role-profile="LOGISTICIAN"] [data-pane="STREAM"]:not(.lqOpen) #stCount,
body[data-role-profile="LOGISTICIAN"] [data-pane="STREAM"]:not(.lqOpen) #stAi,
body[data-role-profile="LOGISTICIAN"] [data-pane="STREAM"]:not(.lqOpen) > .pane > .tableWrap{
  display:none !important;
}
body[data-role-profile="LOGISTICIAN"] [data-pane="STREAM"].lqOpen #lqStream .lqScroll{
  max-height:280px;
}
#lqStream{display:flex; flex-direction:column; gap:12px; min-height:0; flex:1 1 auto}
.lqScroll{
  flex:1 1 auto; min-height:120px; overflow:auto;
  border:1px solid var(--line); border-radius:10px; background:var(--panel);
}
.lqScroll table{width:100%}
.lqScroll thead th{position:sticky; top:0; z-index:2}

/* =======================================================================
   TASKING — two of the five escalation grounds are supply grounds.
   LAST BLOOD and LAST PLASMA stop a sortie because it would take a launch
   point to zero. Those are this role's, and they go at the top. The
   seven-line policy essay and the full five-ground table fold.
   ======================================================================= */
body[data-role-profile="LOGISTICIAN"] [data-pane="TASKING"]:not(.lqOpen) .ph1 p,
body[data-role-profile="LOGISTICIAN"] [data-pane="TASKING"]:not(.lqOpen) .card:has(#policyBox){
  display:none !important;
}
body[data-role-profile="LOGISTICIAN"] [data-pane="TASKING"] .kpi b{font-size:24px}

/* =======================================================================
   COST — reduced from outside role-commander's mount.
   #costBody is rebuilt wholesale by that module on every render, so nothing
   is inserted into it. The strip goes in as a sibling and three of its six
   blocks fold: the percentage band and the procurement finding are the
   commander's argument, and the dollar table is the comptroller's. What
   stays is the per-1 000 comparison, which is entirely made of units of
   blood, units on the shelf and sorties.
   ======================================================================= */
body[data-role-profile="LOGISTICIAN"] [data-pane="COST"]:not(.lqOpen) #costBody > .cqBand,
body[data-role-profile="LOGISTICIAN"] [data-pane="COST"]:not(.lqOpen) #costBody > .card:has(.cqFind),
body[data-role-profile="LOGISTICIAN"] [data-pane="COST"]:not(.lqOpen) #costBody > .card:has(table.cqTable){
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

  const fmtT = G('fmtT') || (m => 'T+' + Number(m).toFixed(0));
  const esc = G('esc') || (s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])));
  const pill = G('pill') || ((t, c) => `<span class="pill ${c || ''}">${t}</span>`);
  const ai = G('ai') || (() => '');

  /* Simulation constants live as `const` declarations in classic scripts, so
     they are in scope by bare name but not on `window`. A typeof guard is
     the only safe way to read one: if sim.js failed to load there is no
     module here to render anyway, but this file must not be the thing that
     throws. */
  const PAY = (typeof PAYLOADS !== 'undefined') ? PAYLOADS : {};
  const SHORT = (typeof PAYSHORT !== 'undefined') ? PAYSHORT
    : { BLOOD: 'BLOOD', PLASMA: 'PLASMA', TXA: 'TXA', TQ_KIT: 'HEM KIT', CHEST_SEAL: 'SEAL' };
  const CALL = (typeof CALLSIGN !== 'undefined') ? CALLSIGN : { HEAVY: 'TRV', LIGHT: 'M25', LONG: 'FVR' };
  const CAP = (typeof STOCK_CAP !== 'undefined') ? STOCK_CAP
    : { BLOOD: 8, PLASMA: 7, TXA: 14, TQ_KIT: 30, CHEST_SEAL: 14 };
  const RESUP = (typeof STOCK_RESUP !== 'undefined') ? STOCK_RESUP
    : { BLOOD: 2, PLASMA: 2, TXA: 4, TQ_KIT: 10, CHEST_SEAL: 4 };
  const RESUP_MIN = (typeof RESUPPLY_EVERY_MIN !== 'undefined') ? RESUPPLY_EVERY_MIN : 45;
  const COLD_MAX = (typeof PARAMS !== 'undefined' && PARAMS.COLD_MAX_C) ? PARAMS.COLD_MAX_C : 10;
  const COLD_MIN = (typeof PARAMS !== 'undefined' && PARAMS.COLD_MIN_C) ? PARAMS.COLD_MIN_C : 1;

  /* The five Class VIII lines, in the order a logistician reads them: the
     two that are scarce and time-critical first. */
  const ITEMS = ['BLOOD', 'PLASMA', 'TXA', 'TQ_KIT', 'CHEST_SEAL'];
  const NAME = {
    BLOOD: 'Whole blood', PLASMA: 'Plasma', TXA: 'TXA',
    TQ_KIT: 'Hemorrhage kit', CHEST_SEAL: 'Chest seal'
  };

  const n0 = v => (v === null || v === undefined || !isFinite(v)) ? '—' : Math.round(v).toLocaleString();
  const n1 = v => (v === null || v === undefined || !isFinite(v)) ? '—' : v.toFixed(1);
  const plural = (n, one, many) => n === 1 ? one : (many || one + 's');

  /* Minutes, said the way a person says them. Anything past ten hours is
     longer than any engagement this simulation runs and is not a forecast
     worth printing to the minute. */
  function dur(m) {
    if (m === null || m === undefined || !isFinite(m)) return '—';
    if (m < 1) return 'now';
    if (m < 90) return Math.round(m) + ' min';
    if (m > 600) return 'over 10 h';
    const h = Math.floor(m / 60);
    return h + ' h ' + String(Math.round(m - h * 60)).padStart(2, '0') + ' min';
  }

  function injectCSS() {
    if (document.getElementById('lqCss')) return;
    const s = document.createElement('style');
    s.id = 'lqCss'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  const isLog = () =>
    !!(window.ANGEL && ANGEL.role ? ANGEL.role.current() === 'LOGISTICIAN' : APP && APP.role === 'LOGISTICIAN');

  /* Write only if it changed. These panes are re-rendered up to three times
     a second — DASHBOARD and MISSION on every frame — and replacing
     identical markup churns the DOM under the operator's cursor for nothing.
     The cached string is also what tells a renderer whether it has ever
     painted, which is how the throttles below avoid showing an empty pane on
     arrival. */
  function paint(el, html) {
    if (!el) return false;
    if (el._lqH === html) return false;
    el._lqH = html; el.innerHTML = html;
    return true;
  }

  /* ============================ THE LEDGER ============================== */
  /* One place that reads the stock, so no two blocks in this file can
     disagree about how much blood is on the shelf — which is the defect the
     UI inventory found in the shipped panes, where "blood forward" was
     stated twice with no shared label and "wasted" meant three different
     events under one word. */

  function now() { return (APP.tView !== undefined && APP.tView !== null) ? APP.tView : APP.t; }

  /* Projected time to stockout.

     The naive form of this — take the change in on-hand over the last few
     minutes and divide — is wrong here, and wrong in a way that matters: a
     scheduled resupply lands every 45 minutes, so a window that happens to
     sit just after one reads as "holding" and a window just before one reads
     as a crisis. Both are artefacts of where the window fell.

     So demand and supply are separated. Demand is read from the stock log,
     which records every unit issued to an aircraft and every unit written
     off, with a timestamp; supply is the scheduled rate, which is known
     exactly rather than inferred. The projection is on-hand divided by the
     difference. Where demand does not exceed scheduled resupply the honest
     answer is that nothing is running out, and that is what it says. */
  function project(arm) {
    if (!arm || !arm.bases) return null;
    const t = now();
    const nBases = arm.bases.length || 1;
    /* One full resupply cycle of history, or everything there is if the run
       is younger than that. Below eight minutes there is not enough demand
       observed to divide by and the projection is withheld rather than
       guessed. */
    const win = Math.min(RESUP_MIN, t);
    const from = t - win;
    const log = (arm.stockLog || []).filter(x => x.t > from && x.t <= t);

    const out = {};
    for (const k of ITEMS) out[k] = { issued: 0, wasted: 0, back: 0 };
    for (const x of log) {
      const o = out[x.item]; if (!o) continue;
      if (x.delta < 0) {
        if (/WASTE/.test(x.reason)) o.wasted += -x.delta; else o.issued += -x.delta;
      } else if (!/RESUPPLY/.test(x.reason)) o.back += x.delta;
    }

    const items = ITEMS.map(k => {
      const onHand = arm.bases.reduce((s, b) => s + (b.stock[k] || 0), 0);
      const o = out[k];
      const demandPerMin = win >= 8 ? (o.issued + o.wasted - o.back) / win : null;
      const supplyPerMin = (RESUP[k] || 0) * nBases / RESUP_MIN;
      const net = demandPerMin === null ? null : demandPerMin - supplyPerMin;
      const mins = (net !== null && net > 0.0005) ? onHand / net : null;
      return {
        key: k, label: NAME[k] || k, onHand,
        cap: (CAP[k] || 1) * nBases,
        issued: o.issued, wasted: o.wasted,
        demandPerHr: demandPerMin === null ? null : demandPerMin * 60,
        supplyPerHr: supplyPerMin * 60,
        netPerHr: net === null ? null : net * 60,
        mins, dry: onHand <= 0
      };
    });

    /* What runs out first. A line already at zero outranks any projection —
       it is not going to run out, it has run out. */
    const dryNow = items.filter(i => i.dry);
    const timed = items.filter(i => i.mins !== null).sort((a, b) => a.mins - b.mins);
    const first = dryNow.length
      ? { ...dryNow.sort((a, b) => ITEMS.indexOf(a.key) - ITEMS.indexOf(b.key))[0], mins: 0 }
      : (timed[0] || null);

    return { t, win, items, byKey: Object.fromEntries(items.map(i => [i.key, i])), first, enough: win >= 8 };
  }

  /* The same arithmetic at one launch point. Blood only: it is the line that
     binds, and a five-item projection per base is a spreadsheet, not a
     screen. */
  function projectBase(arm, b) {
    const t = now();
    const win = Math.min(RESUP_MIN, t);
    if (win < 8) return null;
    let d = 0;
    for (const x of (arm.stockLog || [])) {
      if (x.baseIdx !== b._idx || x.item !== 'BLOOD' || x.t <= t - win || x.t > t) continue;
      if (x.delta < 0) d += -x.delta; else if (!/RESUPPLY/.test(x.reason)) d -= x.delta;
    }
    const net = d / win - (RESUP.BLOOD || 0) / RESUP_MIN;
    if ((b.stock.BLOOD || 0) <= 0) return 0;
    return net > 0.0005 ? b.stock.BLOOD / net : null;
  }

  /* What is committed against what is available. "In the air" is stock that
     has left the shelf and is not yet in anybody's hands — it is spoken for,
     it is not on the shelf, and it can still come back if the sortie aborts. */
  function committed(arm) {
    const air = {};
    let carrying = 0;
    for (const d of (arm.drones || [])) {
      if (d.state === 'LOST') continue;
      let any = 0;
      for (const k of ITEMS) {
        const n = (d.manifest && d.manifest[k]) || 0;
        if (n) { air[k] = (air[k] || 0) + n; any += n; }
      }
      if (any) carrying++;
    }
    return { air, carrying, total: Object.values(air).reduce((s, n) => s + n, 0) };
  }

  /* The three ways a unit is destroyed, kept apart.

     Sorties and units are counted separately and labelled separately on
     purpose. A wasted sortie is an airframe hour; a destroyed unit is a unit
     of blood off the shelf, and only cold-chain payloads are written off as
     units by the model — which is exactly what arm.stats.bloodWasted counts,
     so the two figures on this screen and the "Wasted" column on the stock
     table above it cannot disagree. */
  function waste(arm) {
    const z = () => ({ sorties: 0, units: 0 });
    const o = { unqualified: z(), cold: z(), unrecovered: z(), other: z(), delivered: 0, attempts: 0 };
    for (const r of (arm.deliveryLog || [])) {
      if (r.t > now()) continue;
      o.attempts++;
      if (r.ok) { o.delivered++; continue; }
      const w = String(r.wasteReason || '');
      const bin = /cannot administer/i.test(w) ? o.unqualified
        : /cold chain/i.test(w) ? o.cold
        : /not recovered/i.test(w) ? o.unrecovered : o.other;
      bin.sorties++;
      if (PAY[r.payload] && PAY[r.payload].coldChain) bin.units++;
    }
    o.aborts = (arm.stats && arm.stats.coldAborts) || 0;
    o.sorties = o.unqualified.sorties + o.cold.sorties + o.unrecovered.sorties + o.other.sorties;
    o.units = o.unqualified.units + o.cold.units + o.unrecovered.units + o.other.units;
    return o;
  }

  /* Cold chain, right now. Every aircraft holding blood, with the container
     reading the tasking engine is acting on — not a reading taken on
     landing, which is the difference the whole cold-chain claim rests on. */
  function coldChain(arm) {
    const t = now();
    const carrying = (arm.drones || []).filter(d =>
      d.state !== 'LOST' && d.manifest && (d.manifest.BLOOD || 0) > 0);
    const hot = carrying.filter(d => d.coldC > COLD_MAX).length;
    const near = carrying.filter(d => d.coldC > COLD_MAX - 2 && d.coldC <= COLD_MAX).length;
    const warmest = carrying.length
      ? carrying.reduce((a, b) => (a.coldC > b.coldC ? a : b)) : null;
    return {
      carrying, hot, near, warmest,
      rows: carrying.map(d => ({
        call: (CALL[d.type] || d.type) + '-' + String(d.id).padStart(2, '0'),
        base: d.baseName, units: d.manifest.BLOOD, c: d.coldC,
        held: d.coldStartMin != null ? Math.max(0, t - d.coldStartMin) : null,
        eta: d.state === 'OUTBOUND' && d.tArrive != null ? d.tArrive - t : null,
        state: d.state
      })).sort((a, b) => b.c - a.c)
    };
  }

  /* Everything the panes below read, assembled once. */
  function picture() {
    if (!APP || !APP.world || !APP.armA || !APP.armB) return null;
    const A = APP.armA, B = APP.armB;
    return {
      t: now(), A, B,
      pA: project(A), pB: project(B),
      cA: committed(A), cB: committed(B),
      wA: waste(A), wB: waste(B),
      cold: coldChain(A),
      deployed: APP.deploy && APP.deploy.state === 'DEPLOYED',
      started: (A.deliveryLog && A.deliveryLog.length > 0) || now() > 0
    };
  }

  /* ============================= DASHBOARD ============================== */

  /* Block one, and the reason this pane exists. */
  function blockStockout(S) {
    const p = S.pA, q = S.pB;
    const f = p && p.first;

    if (!p || !p.enough) {
      const onHand = p ? p.byKey.BLOOD.onHand : 0;
      return `<div class="lqLead">
        <div>
          <div class="lqKick">WHAT RUNS OUT FIRST</div>
          <h3 class="lqHeadline">Not enough has been issued yet to project a stockout.</h3>
          <div class="lqFigs">
            <div class="lqFig"><b>${n0(onHand)}</b><span>UNITS OF WHOLE BLOOD ON THE SHELF</span></div>
            <span class="lqRule"></span>
            <div class="lqFig sm"><b>${n0(p ? p.byKey.PLASMA.onHand : 0)}</b><span>UNITS OF PLASMA</span></div>
            <span class="lqRule"></span>
            <div class="lqFig sm"><b>${n0(RESUP_MIN)}</b><span>MINUTES BETWEEN SCHEDULED RESUPPLIES</span></div>
          </div>
          <p class="lqSay">A projection needs demand to divide by. This one is withheld until eight minutes of
            issues have been observed rather than printed from two data points and read as a forecast.
            <em>Scheduled resupply brings ${n0((RESUP.BLOOD || 0) * (S.A.bases.length || 1))} units of blood
            every ${n0(RESUP_MIN)} minutes across ${n0(S.A.bases.length)} launch
            ${plural(S.A.bases.length, 'point')}.</em></p>
        </div>
        <div class="lqAct">
          ${S.deployed
            ? `<button class="btn" data-lq="go:SUPPLY">Open the shelf →</button>`
            : `<button class="btn ok" data-deploy="1">Send the drones →</button>`}
          <span class="lqSub">${S.deployed
            ? 'Stock by launch point, and the waste ledger.'
            : 'Nothing has flown, so nothing has been issued.'}</span>
        </div>
      </div>`;
    }

    /* Nothing is running out. Say so plainly and name the tightest line, so
       the screen is still worth standing in front of. */
    if (!f) {
      const tight = p.items.slice().sort((a, b) =>
        (a.onHand / Math.max(1, a.cap)) - (b.onHand / Math.max(1, b.cap)))[0];
      return `<div class="lqLead">
        <div>
          <div class="lqKick">WHAT RUNS OUT FIRST</div>
          <h3 class="lqHeadline">Nothing is running out. Resupply is keeping up with demand.</h3>
          <div class="lqFigs">
            <div class="lqFig calm"><b>${n0(p.byKey.BLOOD.onHand)}</b><span>UNITS OF WHOLE BLOOD ON THE SHELF</span></div>
            <span class="lqRule"></span>
            <div class="lqFig sm"><b>${n1(p.byKey.BLOOD.demandPerHr)}</b><span>UNITS OF BLOOD DEMANDED AN HOUR</span></div>
            <span class="lqRule"></span>
            <div class="lqFig sm"><b>${n1(p.byKey.BLOOD.supplyPerHr)}</b><span>UNITS OF BLOOD RESUPPLIED AN HOUR</span></div>
          </div>
          <p class="lqSay">The tightest line is <b>${esc(tight.label.toLowerCase())}</b> at
            <b>${n0(tight.onHand)}</b> of ${n0(tight.cap)} held forward.
            Measured over the last ${n0(p.win)} minutes, against a scheduled resupply every
            ${n0(RESUP_MIN)} minutes. <em>This turns the moment demand exceeds it.</em></p>
        </div>
        <div class="lqAct">
          <button class="btn" data-lq="go:SUPPLY">Open the shelf →</button>
          <span class="lqSub">Stock by launch point, and the waste ledger.</span>
        </div>
      </div>`;
    }

    const cls = f.mins <= 0 ? 'tight' : f.mins < 30 ? 'tight' : f.mins < 90 ? 'soon' : '';
    const figCls = f.mins <= 0 ? 'hot' : f.mins < 30 ? 'hot' : f.mins < 90 ? 'warm' : '';
    const qf = q && q.first;
    const left = APP.world.scn.durationMin - S.t;
    const outlasts = f.mins > left;

    return `<div class="lqLead ${cls}">
      <div>
        <div class="lqKick">WHAT RUNS OUT FIRST ${ai('DERIVED', 'projected from the issue and write-off rate of the last ' + Math.round(p.win) + ' minutes against the scheduled resupply rate')}</div>
        <h3 class="lqHeadline">${f.mins <= 0
          ? esc(f.label) + ' is out. There is none on any shelf.'
          : esc(f.label) + ' runs out ' + (outlasts ? 'after this engagement ends' : 'first') + '.'}</h3>
        <div class="lqFigs">
          <div class="lqFig ${figCls}"><b>${f.mins <= 0 ? 'NONE' : dur(f.mins)}</b>
            <span>${f.mins <= 0 ? 'ON HAND, ACROSS EVERY LAUNCH POINT' : 'UNTIL THE LAST UNIT OF ' + esc(f.label.toUpperCase())}</span></div>
          <span class="lqRule"></span>
          <div class="lqFig sm"><b>${n0(f.onHand)}</b><span>ON HAND NOW, OF ${n0(f.cap)} HELD FORWARD</span></div>
          <span class="lqRule"></span>
          <div class="lqFig sm"><b>${n1(f.netPerHr)}</b><span>NET DRAW PER HOUR, DEMAND LESS RESUPPLY</span></div>
        </div>
        <p class="lqSay">Demand over the last <b>${n0(p.win)}</b> minutes ran at
          <b>${n1(f.demandPerHr)}</b> a hour — ${n0(f.issued)} issued to aircraft and
          ${n0(f.wasted)} written off — against <b>${n1(f.supplyPerHr)}</b> a hour arriving on the
          scheduled push. ${outlasts
            ? `That is longer than the ${dur(left)} left in this engagement, so on this rate the shelf holds.`
            : `On that rate the shelf is empty ${f.mins <= 0 ? 'now' : 'in ' + dur(f.mins)}, and a sortie tasked after that is a sortie with nothing to carry.`}
          ${qf ? `<em>The same fight run the way it is run today reaches its first stockout in
            ${qf.mins === null ? 'no projected time' : dur(qf.mins)}.</em>` : ''}</p>
      </div>
      <div class="lqAct">
        <button class="btn" data-lq="go:SUPPLY">Stock by launch point →</button>
        <span class="lqSub">Which shelf is short, and what has been destroyed getting there.</span>
      </div>
    </div>`;
  }

  /* Block two: on the shelf, in the air, spent, destroyed. Four cells, one
     row, and they sum to the whole of the blood this force has touched. */
  function blockLedger(S) {
    const p = S.pA, c = S.cA;
    const shelf = p ? p.byKey.BLOOD.onHand : 0;
    const air = c.air.BLOOD || 0;
    const used = (S.A.stats && S.A.stats.bloodUsed) || 0;
    const lost = (S.A.stats && S.A.stats.bloodWasted) || 0;
    return `<div class="lqCells">
      <div class="lqCell"><b class="${shelf <= 2 ? 'hot' : shelf <= 6 ? 'warm' : ''}">${n0(shelf)}</b>
        <span>ON THE SHELF</span>
        <i>units of blood available to task, across ${n0(S.A.bases.length)} launch
           ${plural(S.A.bases.length, 'point')}</i></div>
      <div class="lqCell"><b>${n0(air)}</b><span>COMMITTED, IN THE AIR</span>
        <i>${c.carrying ? n0(c.carrying) + ' ' + plural(c.carrying, 'aircraft') + ' carrying ' +
             n0(c.total) + ' ' + plural(c.total, 'item') + ' in total'
          : 'no aircraft is carrying anything'} — spoken for, and still recoverable if the sortie aborts</i></div>
      <div class="lqCell"><b>${n0(used)}</b><span>INTO A CASUALTY</span>
        <i>units administered on the ground — the only ones that did the job they were shipped for</i></div>
      <div class="lqCell"><b class="${lost ? 'hot' : 'calm'}">${n0(lost)}</b><span>DESTROYED</span>
        <i>${lost ? 'written off — see why, below' : 'not one unit written off so far'}</i></div>
    </div>`;
  }

  /* Block three, left: the shelf itself, by launch point, with the blood
     projection on each row. This is the table a logistician points at. */
  function blockShelf(S) {
    const known = !!(S.pA && S.pA.enough);
    const rows = S.A.bases.map(b => {
      const m = projectBase(S.A, b);
      const cell = k => {
        const v = b.stock[k] || 0, cap = CAP[k] || 1;
        const cls = v <= 1 ? 'bad' : v <= cap * 0.35 ? 'warn' : 'ok';
        return `<td class="num"><span class="meter sm"><i class="${cls}" style="width:${Math.min(100, v / cap * 100)}%"></i></span><b class="mono ${cls}">${v}</b></td>`;
      };
      const dry = (b.stock.BLOOD || 0) <= 0;
      return `<tr class="${dry ? 'dry' : ''}">
        <td class="mono">${esc(b.name)}</td>
        ${ITEMS.map(cell).join('')}
        <td class="num mono ${(b.wastedUnits && b.wastedUnits.BLOOD) ? 'warm' : 'calm'}">${n0((b.wastedUnits && b.wastedUnits.BLOOD) || 0)}</td>
        <td class="num mono ${m === 0 ? 'hot' : m !== null && m < 45 ? 'hot' : m !== null && m < 120 ? 'warm' : 'calm'}">${
          /* "holds" is a claim about the future and it needs demand to have
             been observed. Before that there is nothing to say, and an
             em dash says it. */
          m === 0 ? 'out' : !known ? '—' : m === null ? 'holds' : dur(m)}</td>
      </tr>`;
    }).join('');
    const tot = k => S.A.bases.reduce((s, b) => s + (b.stock[k] || 0), 0);
    return `<div class="card">
      <div class="cardHead">What is on the shelf, and where</div>
      <table class="lqTable"><thead><tr>
        <th>Launch point</th>${ITEMS.map(k => `<th class="num">${esc(SHORT[k] || k)}</th>`).join('')}
        <th class="num">Blood lost</th><th class="num" style="width:88px">Blood runs out</th>
      </tr></thead><tbody>${rows || '<tr><td colspan="8" class="empty">No launch points.</td></tr>'}
        <tr class="total"><td class="mono">ALL</td>
          ${ITEMS.map(k => `<td class="num mono">${n0(tot(k))}</td>`).join('')}
          <td class="num mono">${n0((S.A.stats && S.A.stats.bloodWasted) || 0)}</td>
          <td class="num mono">${S.pA && S.pA.byKey.BLOOD.onHand <= 0 ? 'out'
            : !known ? '—' : S.pA.byKey.BLOOD.mins !== null ? dur(S.pA.byKey.BLOOD.mins) : 'holds'}</td></tr>
      </tbody></table>
    </div>`;
  }

  /* Block three, middle: the cold chain, as it reads this minute. */
  function blockCold(S) {
    const k = S.cold, w = S.wA;
    const rows = k.rows.slice(0, 6).map(r => {
      const cls = r.c > COLD_MAX ? 'lqBad' : r.c > COLD_MAX - 2 ? 'lqWarn' : 'lqOk';
      const pos = Math.max(0, Math.min(100, (r.c - 0) / (COLD_MAX + 4) * 100));
      return `<tr>
        <td class="mono">${esc(r.call)}</td>
        <td class="mono num">${r.units}</td>
        <td><span class="lqTemp"><span class="lqBand"><i style="left:${pos.toFixed(0)}%"></i></span>
          <b class="${cls}">${r.c.toFixed(1)}°C</b></span></td>
        <td class="mono num calm">${r.held === null ? '—' : Math.round(r.held) + ' min'}</td>
      </tr>`;
    }).join('');
    return `<div class="card">
      <div class="cardHead">Cold chain, right now ${ai('AUTONOMOUS', 'container temperature is read in flight and the sortie is aborted before the unit spoils, not after it lands')}</div>
      <div class="lqBody">
        ${k.carrying.length
          ? `<table class="lqTable"><thead><tr><th>Aircraft</th><th class="num">Units</th>
               <th style="width:132px">Container (band ${COLD_MIN}–${COLD_MAX}°C)</th><th class="num">Held</th>
             </tr></thead><tbody>${rows}</tbody></table>
             ${k.hot ? `<p><b class="lqBad">${n0(k.hot)} ${plural(k.hot, 'container is', 'containers are')} above
               ${COLD_MAX}°C.</b> Blood arriving above the band is not transfusable and is written off on arrival.</p>`
               : k.near ? `<p><b class="lqWarn">${n0(k.near)} ${plural(k.near, 'container is', 'containers are')} within
                 two degrees of the limit.</b> The system aborts and turns for home before the unit is lost.</p>`
               : `<p>Every container carrying blood is inside the transfusable band.</p>`}`
          : `<p>No aircraft is carrying blood at this moment. ${S.deployed
              ? 'Containers are held cold whether or not there is a unit aboard, so the next sortie leaves in band.'
              : 'Nothing has been sent yet.'}</p>`}
        <p class="foot"><b>${n0(w.aborts)}</b> ${plural(w.aborts, 'sortie', 'sorties')} aborted in flight
          on temperature and brought the unit home; <b>${n0(w.cold.units)}</b>
          ${plural(w.cold.units, 'unit')} arrived out of band and ${plural(w.cold.units, 'was', 'were')} destroyed.
          <b>current triage and proximity has no in-flight check</b> — it finds out on arrival, and lost
          ${n0(S.wB.cold.units)}.</p>
      </div>
    </div>`;
  }

  /* Block three, right: demand against supply, line by line. The five rows
     that say which line is the one to watch next. */
  function blockBurn(S) {
    const p = S.pA;
    if (!p) return '';
    const rows = p.items.map(i => {
      const m = i.dry ? 0 : i.mins;
      const cls = m === 0 ? 'hot' : m !== null && m < 45 ? 'hot' : m !== null && m < 120 ? 'warm' : 'calm';
      return `<tr>
        <td>${esc(i.label)}</td>
        <td class="num mono">${n0(i.onHand)}</td>
        <td class="num mono calm">${i.demandPerHr === null ? '—' : n1(i.demandPerHr)}</td>
        <td class="num mono calm">${n1(i.supplyPerHr)}</td>
        <td class="num mono ${cls}">${m === 0 ? 'out' : !p.enough ? '—' : m === null ? 'holds' : dur(m)}</td>
      </tr>`;
    }).join('');
    return `<div class="card">
      <div class="cardHead">Demand against resupply, per hour</div>
      <table class="lqTable"><thead><tr>
        <th>Line</th><th class="num">On hand</th><th class="num">Out /h</th>
        <th class="num">In /h</th><th class="num" style="width:80px">Runs out</th>
      </tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  }

  /* The waste ledger. Three causes, three fixes, both arms — the block this
     whole role profile is worth building for. */
  function blockWaste(S, compact) {
    const a = S.wA, b = S.wB;
    const cell = (o, zero) => `<td class="arm"><b class="${o.sorties ? '' : 'lqZero'}">${n0(o.sorties)}</b>
      <span>${o.units ? n0(o.units) + ' ' + plural(o.units, 'unit') + ' of blood' : zero}</span></td>`;
    const causes = [
      ['unqualified', 'Delivered to someone not qualified to give it',
       'The package reached the ground and the responder on scene was a buddy or a combat lifesaver, ' +
       'not a medic. Blood and plasma need a 68W. <b>This is a matching failure, not a shortage</b> — ' +
       'it is fixed by reading who is on scene before choosing the payload, or by telementoring the ' +
       'responder through it. No quantity of aircraft or blood touches it.'],
      ['cold', 'Above the transfusable band on arrival',
       'The container came out of ' + COLD_MIN + '–' + COLD_MAX + '°C before it landed, so the unit was ' +
       'discarded. <b>This is a leg-length failure</b> — it is fixed by a launch point closer to the ' +
       'casualty, or by reading the container in flight and turning back while the unit is still good.'],
      ['unrecovered', 'Released but never recovered',
       'The sortie flew, the package left the aircraft, and nobody found it. <b>This is a delivery-method ' +
       'failure</b> — a chute drift, a canopy, water. It is fixed at the release, not in the plan.']
    ];
    const rows = causes.map(([k, cause, fix]) => `<tr>
      <td class="cause">${esc(cause)}</td>
      ${compact ? '' : `<td class="fix">${fix}</td>`}
      ${cell(a[k], 'no units lost')}${cell(b[k], 'no units lost')}
    </tr>`).join('');
    return `<div class="card">
      <div class="cardHead">What was destroyed, and why it was destroyed ${ai('DERIVED', 'read per delivery from the run’s own delivery log, not from a summary')}</div>
      <table class="lqTable lqWaste"><thead><tr>
        <th>Why the unit was lost</th>${compact ? '' : '<th>What would fix it</th>'}
        <th class="arm">ANGEL SWARM</th><th class="arm">CURRENT — TRIAGE & PROXIMITY</th>
      </tr></thead><tbody>${rows}
        <tr class="total"><td class="cause">All causes</td>${compact ? '' : '<td class="fix"></td>'}
          ${cell(a, 'nothing destroyed')}${cell(b, 'nothing destroyed')}</tr>
      </tbody></table>
      <div class="lqBody">
        <p class="lqNote">${a.sorties || b.sorties
          ? `<b>These are not the same failure and they do not have the same fix.</b> ` +
            `${b.unqualified.sorties > a.unqualified.sorties
              ? `Current triage and proximity flew <b>${n0(b.unqualified.sorties)}</b> ${plural(b.unqualified.sorties, 'sortie')} to
                 somebody who could not use what arrived; ANGEL SWARM flew ${n0(a.unqualified.sorties)}, because it
                 reads the responder's tier before it chooses the payload. `
              : ''}${b.cold.units > a.cold.units
              ? `The baseline lost <b>${n0(b.cold.units)}</b> ${plural(b.cold.units, 'unit')} to temperature;
                 ANGEL SWARM lost ${n0(a.cold.units)}${a.aborts
                   ? `, and turned ${n0(a.aborts)} ${plural(a.aborts, 'sortie')} around in flight to do it`
                   : ', reading the container in flight rather than on arrival'}. `
              : ''}A single column headed "wasted" hides all of that, and with it the only part of the
              number that says what to do next.`
          : `Nothing has been destroyed in either arm yet. When it is, it will be split three ways here,
             because "wasted" on its own tells a logistician nothing he can act on.`}</p>
        ${compact ? '' : `<p class="foot">Sorties are airframe hours. Units are blood off the shelf; the model
          writes off a unit only where the payload is cold-chain, which is why a wasted sortie carrying kit
          costs flying and not stock. <b>The same figures, and the same source, as the "Blood lost" column
          above.</b></p>`}
      </div>
    </div>`;
  }

  let dashAt = 0;
  let nativeDashboard = null;          // captured by override(), below
  function renderLogDashboard() {
    const host = document.getElementById('lqDash');
    if (!host) return;
    /* The theatre picture, the four command tiles, the operations ranking
       and the threshold settings are the only place in the application those
       controls live. Folded away they would be gone from this role rather
       than merely off-screen, and roles do not remove capability — so the
       fold runs the native renderer as well and the whole commander's
       dashboard comes back underneath, one click away, live. */
    const sec = document.querySelector('[data-pane="DASHBOARD"]');
    const open = !!(sec && sec.classList.contains('lqOpen'));
    if (open && nativeDashboard) { try { nativeDashboard(); } catch (e) { console.warn('DASHBOARD native', e); } }

    /* DASHBOARD is not on render()'s throttled branch — it is rebuilt on
       every animation frame. paint() keeps the DOM still, but building ten
       kilobytes of string sixty times a second is work nobody asked for.
       The first paint is never delayed, so the pane is populated on
       arrival in every run state. */
    const ms = performance.now();
    if (host._lqH && ms - dashAt < 260) return;
    dashAt = ms;

    const S = picture();
    if (!S) {
      paint(host, `<div class="lqLine"><span class="lqN flat">—</span>
        <span class="lqT">The mission has not been built yet.
          <em>This pane populates as soon as the simulation is loaded.</em></span></div>`);
      return;
    }
    paint(host, [
      /* The fold control is inside the painted markup rather than bound as a
         node, because this mount is replaced wholesale on every rebuild and a
         listener attached to a node inside it would not survive one. It is
         driven by the same delegated handler as the two buttons below, and
         its label is computed from the class it toggles, so it cannot get
         out of step with the state it describes. */
      `<div class="paneHead"><div class="ph1">
        <h2>What is on hand, and what runs out first</h2>
        <p class="lede">What is on each shelf, what is committed to an aircraft, what has been destroyed and
          for which of three quite different reasons, and how long the shelf lasts at the rate it is going
          out. <span class="jarg">Doctrine calls this Class VIII — blood and plasma are VIIIB, the rest VIIIA.</span></p>
      </div>
      <div class="phTools"><button type="button" class="lqMore" data-lq="fold" aria-expanded="${open}">${
        open ? 'hide the theatre picture' : 'show the theatre picture'}</button></div></div>`,
      blockStockout(S),
      blockLedger(S),
      `<div class="lqRowA">${blockShelf(S)}${blockCold(S)}</div>`,
      /* Compact here, in full on SUPPLY. The landing view owes a logistician
         the split — three causes, two arms — because that is the shape of
         the failure. What each of them would take to fix is a paragraph per
         row and belongs on the pane he goes to next, not above the fold. */
      `<div class="lqRowB">${blockBurn(S)}${blockWaste(S, true)}</div>`
    ].join(''));
  }

  /* =============================== SUPPLY =============================== */
  /* The native pane keeps its two stock tables and its blood-on-hand chart.
     What this adds is the answer at the top and the waste ledger under it;
     what folds is the comparison arm's table and the cumulative-wasted
     chart, both of which the ledger states better and in one place. */

  function mountBefore(paneSel, id, beforeSel, cls) {
    const pane = document.querySelector(paneSel + ' .pane');
    if (!pane) return null;
    let el = document.getElementById(id);
    if (el) return el;
    el = document.createElement('div');
    el.id = id; el.className = cls || 'lqStack';
    el.setAttribute('data-roles', 'LOGISTICIAN');
    /* The anchor is named by a selector that may match something nested —
       #theaterStage is not always a direct child of .pane — and
       insertBefore() throws on a node that is not a child of the parent.
       Walk up to the child of .pane that contains it. */
    let anchor = beforeSel ? pane.querySelector(beforeSel) : null;
    while (anchor && anchor.parentElement !== pane) anchor = anchor.parentElement;
    pane.insertBefore(el, anchor || null);
    return el;
  }

  function composeSupply() {
    const head = document.querySelector('[data-pane="SUPPLY"] .paneHead');
    const host = mountBefore('[data-pane="SUPPLY"]', 'lqSupplyTop', '.split');
    /* The removal cannot live inside the "does not exist yet" branch — by the
       time page-grouped has rendered, the button DOES exist (an earlier tick
       created it before the pane was replaced), so that branch never runs
       again and the orphan survives forever. Withdraw first, then decide
       whether to offer. */
    if (!ownsDetail('SUPPLY')) {
      const dead = document.getElementById('lqSupplyMore'); if (dead) dead.remove();
    }
    if (head && ownsDetail('SUPPLY') && !document.getElementById('lqSupplyMore')) {
      let tools = head.querySelector('.phTools');
      if (!tools) {
        tools = document.createElement('div');
        tools.className = 'phTools';
        tools.setAttribute('data-roles', 'LOGISTICIAN');
        tools.style.marginLeft = 'auto';
        head.appendChild(tools);
      }
      foldControl('lqSupplyMore', tools, 'show the detail');
    }
    if (!host || !isLog()) return;
    const S = picture();
    if (!S) { paint(host, ''); return; }
    const p = S.pA, f = p && p.first;
    const w = S.wA;
    const cls = !f ? 'calm' : f.mins <= 0 ? 'hot' : f.mins < 30 ? 'hot' : f.mins < 90 ? 'warm' : '';
    paint(host, `
      <div class="lqLine">
        <span class="lqTag">T+${Math.round(S.t)} · ${esc(APP.world.scn.name)}</span>
        <span class="lqN ${cls}">${!p || !p.enough ? '—' : !f ? 'HOLDS' : f.mins <= 0 ? 'OUT' : dur(f.mins)}</span>
        <span class="lqT">${!p || !p.enough
          ? `Too little has been issued to project a stockout. <em>${n0(p ? p.byKey.BLOOD.onHand : 0)} units of
             blood and ${n0(p ? p.byKey.PLASMA.onHand : 0)} of plasma are on the shelf.</em>`
          : !f
            ? `Nothing is running out — resupply is keeping up.
               <em>${n0(p.byKey.BLOOD.onHand)} units of blood on the shelf, going out at
               ${n1(p.byKey.BLOOD.demandPerHr)} an hour against ${n1(p.byKey.BLOOD.supplyPerHr)} arriving.</em>`
            : `until the last unit of <b>${esc(f.label.toLowerCase())}</b>.
               <em>${n0(f.onHand)} on hand, net draw ${n1(f.netPerHr)} an hour over the last
               ${n0(p.win)} minutes.</em>`}</span>
        <span class="lqTag">${n0(w.units)} ${plural(w.units, 'UNIT')} DESTROYED · ${n0(w.sorties)}
          ${plural(w.sorties, 'SORTIE')} WASTED</span>
      </div>
      ${blockWaste(S, false)}`);
  }

  /* ================================ FLEET =============================== */
  /* Availability, not tasking. Ready, airborne, held, down; what is in the
     bays; and the turn time, which is the number that says whether the fleet
     can carry the demand the shelf is seeing. */

  function composeFleet() {
    const head = document.querySelector('[data-pane="FLEET"] .paneHead');
    const host = mountBefore('[data-pane="FLEET"]', 'lqFleetTop', '.tableWrap');
    if (head) {
      const tools = head.querySelector('.phTools');
      const deadF = document.getElementById('lqFleetMore');
      if (!ownsDetail('FLEET')) { if (deadF) deadF.remove(); }
      else if (tools) foldControl('lqFleetMore', tools, 'show the detail');
    }
    if (!host || !isLog()) return;
    const S = picture();
    if (!S) { paint(host, ''); return; }
    const A = S.A;
    const D = A.drones || [];
    const ready = D.filter(d => d.state === 'IDLE' && !d.held).length;
    const air = D.filter(d => d.state === 'OUTBOUND' || d.state === 'RETURNING' || d.state === 'ONSTATION').length;
    const held = D.filter(d => d.held).length;
    const lost = (A.stats && A.stats.dronesLost) || 0;

    /* Turn time from the sortie log: launch to back on the ground. Sorties
       still airborne are excluded rather than being closed at "now", which
       would drag the mean down every frame. */
    const closed = (A.sortieLog || []).filter(s => s.tReturn != null && s.tLaunch <= S.t);
    const cycles = closed.map(s => s.tReturn - s.tLaunch);
    const meanCycle = cycles.length ? cycles.reduce((a, b) => a + b, 0) / cycles.length : null;
    const sorties = (A.stats && A.stats.sorties) || 0;
    const wasted = (A.stats && A.stats.wastedSorties) || 0;

    /* Where the fleet is based, which is the other half of availability: a
       launch point with four aircraft and no blood is as grounded as one
       with blood and no aircraft. */
    const byBase = A.bases.map(b => {
      const here = D.filter(d => d.baseIdx === b._idx && d.state !== 'LOST');
      return {
        name: b.name,
        n: here.length,
        ready: here.filter(d => d.state === 'IDLE' && !d.held).length,
        air: here.filter(d => d.state !== 'IDLE').length,
        held: here.filter(d => d.held).length,
        sorties: here.reduce((s, d) => s + (d.sorties || 0), 0),
        blood: b.stock.BLOOD || 0,
        carrying: here.reduce((s, d) => s + ((d.manifest && d.manifest.BLOOD) || 0), 0)
      };
    });

    paint(host, `
      <div class="lqCells">
        <div class="lqCell"><b class="${ready ? 'calm' : 'warm'}">${n0(ready)}</b><span>READY TO TASK</span>
          <i>on the ground, serviceable, not held</i></div>
        <div class="lqCell"><b>${n0(air)}</b><span>AIRBORNE</span>
          <i>${n0(S.cA.total)} ${plural(S.cA.total, 'item')} in the bays, of which
             ${n0(S.cA.air.BLOOD || 0)} ${plural(S.cA.air.BLOOD || 0, 'is', 'are')} blood</i></div>
        <div class="lqCell"><b class="${held ? 'warm' : ''}">${n0(held)}</b><span>HELD BY AN OPERATOR</span>
          <i>${held ? 'the system is routing around ' + plural(held, 'it', 'them') : 'nothing is being held back'}</i></div>
        <div class="lqCell"><b class="${lost ? 'hot' : ''}">${n0(lost)}</b><span>DOWN</span>
          <i>${lost ? 'not coming back — the manifest went with ' + plural(lost, 'it', 'them')
            : 'no airframe lost'}</i></div>
      </div>
      <div class="lqRow2">
        <div class="card">
          <div class="cardHead">Availability by launch point</div>
          <table class="lqTable"><thead><tr>
            <th>Launch point</th><th class="num">Based</th><th class="num">Ready</th>
            <th class="num">Out</th><th class="num">Sorties</th>
            <th class="num">Blood on shelf</th><th class="num">Blood in the air</th>
          </tr></thead><tbody>${byBase.map(b => `<tr>
            <td class="mono">${esc(b.name)}</td>
            <td class="num mono">${n0(b.n)}</td>
            <td class="num mono ${b.ready ? '' : 'warm'}">${n0(b.ready)}</td>
            <td class="num mono calm">${n0(b.air)}</td>
            <td class="num mono calm">${n0(b.sorties)}</td>
            <td class="num mono ${b.blood <= 1 ? 'hot' : b.blood <= 3 ? 'warm' : ''}">${n0(b.blood)}</td>
            <td class="num mono calm">${n0(b.carrying)}</td></tr>`).join('')
            || '<tr><td colspan="7" class="empty">No launch points.</td></tr>'}</tbody></table>
        </div>
        <div class="card">
          <div class="cardHead">Turn time</div>
          <div class="lqBody">
            <p><b>${meanCycle === null ? 'No sortie has come home yet' : dur(meanCycle) + ' from launch to back on the ground'}</b>,
              ${meanCycle === null ? '' : `averaged over ${n0(cycles.length)} completed
              ${plural(cycles.length, 'sortie')}. `}The fleet has flown <b>${n0(sorties)}</b>
              ${plural(sorties, 'sortie')} in total${wasted
                ? `, of which <b>${n0(wasted)}</b> delivered nothing usable` : ''}.</p>
            <p>${meanCycle === null
              ? 'Turn time appears here once an aircraft has completed a round trip. It is the number that says whether the fleet can carry the demand the shelf is seeing.'
              : `At that turn time, ${n0(ready + air)} serviceable
                 ${plural(ready + air, 'airframe')} can make about
                 <b>${n0((ready + air) * 60 / Math.max(1, meanCycle))}</b> deliveries an hour if every
                 sortie carries one stop. Demand for blood is running at
                 <b>${S.pA && S.pA.byKey.BLOOD.demandPerHr !== null ? n1(S.pA.byKey.BLOOD.demandPerHr) : '—'}</b>
                 units an hour.`}</p>
            <p class="foot">Sorties still airborne are excluded from the mean rather than closed at the current
              minute, which would drag it down on every frame. Combat radius falls as payload rises, so a
              longer leg is a heavier aircraft, not just a further one.</p>
          </div>
        </div>
      </div>`);
  }

  /* =============================== MISSION ============================== */
  /* The map is the destination and is untouched. The strip in the corner is
     the one thing a logistician wants while looking at it: how much blood is
     on the shelf, how much is in the air, and how long the shelf lasts. */

  let missAt = 0;
  function composeMission() {
    const stage = document.getElementById('stage');
    if (!stage) return;
    /* The fold lives inside the strip rather than floating on its own.
       Measured: floating it bottom-right put it over the area-of-operations
       card the map draws into the canvas, and every other corner of this
       stage is already spoken for — the scoreboard at top centre, the map
       tools at top right, the airframe dock down the right edge. */
    let strip = document.getElementById('lqMissionStrip');
    if (!strip) {
      strip = document.createElement('div');
      strip.id = 'lqMissionStrip';
      strip.setAttribute('data-roles', 'LOGISTICIAN');
      stage.appendChild(strip);
    }
    if (!isLog()) return;
    const ms = performance.now();
    if (strip._lqH && ms - missAt < 300) return;
    missAt = ms;
    const S = picture();
    if (!S) { paint(strip, ''); return; }
    const p = S.pA, f = p && p.first;
    const shelf = p ? p.byKey.BLOOD.onHand : 0;
    const sec = strip.closest('.viewport');
    const open = !!(sec && sec.classList.contains('lqOpen'));
    paint(strip, `
      <div class="lqMs"><b class="${shelf <= 2 ? 'hot' : shelf <= 6 ? 'warm' : ''}">${n0(shelf)}</b>
        <span>BLOOD ON THE SHELF</span></div>
      <div class="lqMs"><b>${n0(S.cA.air.BLOOD || 0)}</b><span>BLOOD IN THE AIR</span></div>
      <div class="lqMs"><b class="${S.cold.hot ? 'hot' : S.cold.near ? 'warm' : ''}">${
        S.cold.warmest ? S.cold.warmest.coldC.toFixed(1) + '°' : '—'}</b><span>WARMEST CONTAINER</span></div>
      <div class="lqMs"><b class="${!f ? 'calm' : f.mins < 30 ? 'hot' : f.mins < 90 ? 'warm' : ''}">${
        !p || !p.enough ? '—' : !f ? 'HOLDS' : f.mins <= 0 ? 'OUT' : dur(f.mins)}</b>
        <span>${!f || !p.enough ? 'FIRST STOCKOUT' : 'UNTIL NO ' + esc((f.label || '').toUpperCase())}</span></div>
      <button type="button" class="lqMore" data-lq="fold" aria-expanded="${open}">${
        open ? 'hide the detail' : 'show the detail'}</button>`);
  }

  /* =============================== STREAM =============================== */
  /* Filtered to the events that move stock, and merged with the in-flight
     cold-chain aborts, which the shipped stream does not carry at all — they
     are written to the run log instead, so the one class of event that
     proves the cold chain is being managed rather than merely reported was
     invisible on the pane about reporting. The native table is untouched and
     is one click away. */

  const SUPPLY_PHASES = /^(PAYLOAD AWAY|RECOVERED|NOT RECOVERED|UNDELIVERABLE|COLD CHAIN BROKEN)$/;

  function supplyEvents(arm) {
    const t = now();
    const rows = (arm.stream || [])
      .filter(e => e.t <= t && SUPPLY_PHASES.test(e.phase))
      .map(e => ({ t: e.t, tRecv: e.tRecv, call: e.call, phase: e.phase, text: e.text, relay: e.relay }));
    for (const e of (arm.log || [])) {
      if (e.kind !== 'COLD' || e.t > t) continue;
      rows.push({ t: e.t, tRecv: e.t, call: '—', phase: 'COLD CHAIN ABORT', text: e.text, relay: 'RUN LOG' });
    }
    rows.sort((a, b) => a.t - b.t);
    return rows;
  }

  function composeStream() {
    const head = document.querySelector('[data-pane="STREAM"] .paneHead');
    const host = mountBefore('[data-pane="STREAM"]', 'lqStream', '.strTiles');
    if (head) {
      const tools = head.querySelector('.phTools');
      if (tools) foldControl('lqStreamMore', tools, 'the whole stream');
    }
    if (!host || !isLog()) return;
    const S = picture();
    if (!S) { paint(host, ''); return; }
    const rows = supplyEvents(S.A);
    const w = S.wA;
    const delivered = rows.filter(r => r.phase === 'RECOVERED').length;
    const away = rows.filter(r => r.phase === 'PAYLOAD AWAY').length;
    const aborts = rows.filter(r => r.phase === 'COLD CHAIN ABORT').length;
    const cls = {
      'RECOVERED': 'ok', 'PAYLOAD AWAY': 'info', 'NOT RECOVERED': 'bad',
      'UNDELIVERABLE': 'bad', 'COLD CHAIN BROKEN': 'bad', 'COLD CHAIN ABORT': 'warn'
    };
    const body = rows.slice(-200).reverse().map(r => {
      const lag = r.tRecv === null ? null : r.tRecv - r.t;
      return `<tr>
        <td class="mono">${fmtT(r.t)}</td>
        <td class="mono ${lag === null ? 'lqBad' : lag > 0.01 ? 'lqWarn' : 'calm'}">${
          r.tRecv === null ? 'not yet' : fmtT(r.tRecv)}</td>
        <td class="mono">${esc(r.call)}</td>
        <td>${pill(r.phase, cls[r.phase] || '')}</td>
        <td class="wide">${esc(r.text)}</td>
      </tr>`;
    }).join('');

    paint(host, `
      <div class="lqLine">
        <span class="lqTag">SUPPLY EVENTS ONLY</span>
        <span class="lqN ${w.sorties ? 'warm' : 'calm'}">${n0(rows.length)}</span>
        <span class="lqT">${plural(rows.length, 'event')} that moved stock — a package leaving an aircraft,
          reaching a pair of hands, or being destroyed.
          <em>On station and the two administered phases are the clinical record and are in the whole stream,
          one click away.</em></span>
        <span class="lqTag">${n0(aborts)} COLD-CHAIN ${plural(aborts, 'ABORT')}</span>
      </div>
      <div class="lqCells">
        <div class="lqCell"><b>${n0(away)}</b><span>PACKAGES RELEASED</span>
          <i>stock that left an aircraft</i></div>
        <div class="lqCell"><b class="calm">${n0(delivered)}</b><span>IN A RESPONDER'S HANDS</span>
          <i>the only outcome that is not a loss</i></div>
        <div class="lqCell"><b class="${w.sorties ? 'hot' : ''}">${n0(w.sorties)}</b><span>DESTROYED OR LOST</span>
          <i>${w.unqualified.sorties} to an unqualified responder · ${w.cold.sorties} out of band ·
             ${w.unrecovered.sorties} never found</i></div>
        <div class="lqCell"><b class="${aborts ? 'warm' : ''}">${n0(aborts)}</b><span>ABORTED IN FLIGHT</span>
          <i>turned back on container temperature — the unit came home and went back on the shelf</i></div>
      </div>
      <div class="lqScroll">
        <table class="lqTable"><thead><tr>
          <th style="width:78px">Happened</th><th style="width:78px">Received</th>
          <th style="width:88px">Aircraft</th><th style="width:190px">What happened</th><th>Report</th>
        </tr></thead><tbody>${body ||
          `<tr><td colspan="5" class="empty">Nothing has moved yet. ${S.deployed
            ? 'No package has left an aircraft.' : 'Send the drones.'}</td></tr>`}</tbody></table>
      </div>`);
  }

  /* =============================== TASKING ============================== */
  /* Two of the five escalation grounds are supply grounds: a sortie that
     would take a launch point to its last unit of blood, or of plasma. Those
     are the ones a logistician is being asked about, and they are the answer
     this pane owes him at the top rather than in row three of a five-row
     table under a seven-line essay. */

  function composeTasking() {
    const pane = document.querySelector('[data-pane="TASKING"] .pane');
    if (!pane) return;
    let line = document.getElementById('lqTaskLine');
    if (!line) {
      line = document.createElement('div');
      line.id = 'lqTaskLine';
      line.className = 'lqStack';
      line.setAttribute('data-roles', 'LOGISTICIAN');
      const head = pane.querySelector('.paneHead');
      pane.insertBefore(line, head ? head.nextSibling : pane.firstChild);
    }
    const tools = pane.querySelector('.phTools');
    if (tools) foldControl('lqTaskingMore', tools, 'show the policy');
    if (!isLog()) return;
    const S = picture();
    if (!S) { paint(line, ''); return; }
    const q = S.A.queue || [];
    const ground = k => q.filter(p => (p.reasons || []).indexOf(k) >= 0).length;
    const lastBlood = ground('LAST BLOOD'), lastPlasma = ground('LAST PLASMA');
    const supply = lastBlood + lastPlasma;
    const pending = q.filter(p => p.state === 'PENDING').length;
    const expired = (S.A.stats && S.A.stats.expired) || 0;
    paint(line, `
      <div class="lqLine">
        <span class="lqN ${supply ? 'warm' : 'flat'}">${n0(supply)}</span>
        <span class="lqT">${plural(supply, 'proposal was', 'proposals were')} raised on a supply ground —
          the sortie would have taken a launch point to its last unit.
          <em><b>${n0(lastBlood)}</b> on the last unit of blood, <b>${n0(lastPlasma)}</b> on the last unit of
          plasma. ${pending ? n0(pending) + ' ' + plural(pending, 'proposal is', 'proposals are') + ' waiting on a person now.'
            : 'Nothing is waiting on a person now.'}
          ${expired ? n0(expired) + ' expired unactioned.' : ''}</em></span>
        <span class="lqTag">${n0((S.A.stats && S.A.stats.autoApproved) || 0)} LAUNCHED ON STANDING AUTHORITY</span>
      </div>`);
  }

  /* ================================ COST ================================ */
  /* role-commander owns #costBody and rebuilds it wholesale, so nothing is
     written into it. The strip is a sibling, and the fold is a stylesheet
     rule over three of that module's six blocks. */

  function composeCost() {
    const pane = document.querySelector('[data-pane="COST"] .pane');
    if (!pane) return;
    let line = document.getElementById('lqCostTop');
    if (!line) {
      line = document.createElement('div');
      line.id = 'lqCostTop';
      line.className = 'lqStack';
      line.setAttribute('data-roles', 'LOGISTICIAN');
      const head = pane.querySelector('.paneHead');
      pane.insertBefore(line, head ? head.nextSibling : pane.firstChild);
    }
    if (!isLog()) return;
    const S = picture();
    if (!S) return;
    let strip = document.getElementById('lqCostLine');
    if (!strip) {
      strip = document.createElement('div');
      strip.id = 'lqCostLine'; strip.className = 'lqLine';
      line.appendChild(strip);
    }
    const sec = pane.closest('.viewport');
    const open = !!(sec && sec.classList.contains('lqOpen'));
    const a = S.wA, b = S.wB;
    const savedUnits = b.units - a.units, savedSorties = b.sorties - a.sorties;
    paint(strip, `
      <span class="lqN ${savedUnits > 0 ? 'calm' : 'flat'}">${n0(Math.abs(savedUnits))}</span>
      <span class="lqT">${savedUnits === 0 ? 'no difference in units of blood destroyed'
        : savedUnits > 0 ? 'fewer units of blood destroyed' : 'more units of blood destroyed'} —
        <b>${n0(a.units)}</b> against <b>${n0(b.units)}</b>, and
        <b>${n0(a.sorties)}</b> wasted sorties against <b>${n0(b.sorties)}</b>.
        <em>${savedSorties > 0 ? n0(savedSorties) + ' ' + plural(savedSorties, 'sortie') + ' of flying not done, '
          : ''}on the same fleet, the same blood and the same launch points. The only difference is who
        decides where an aircraft goes.</em></span>
      <span class="lqTag">${n0(a.aborts)} ABORTED BEFORE THE UNIT SPOILED</span>
      <button type="button" class="lqMore" data-lq="fold" aria-expanded="${open}">${
        open ? 'hide the rest' : 'the rest of the argument'}</button>`);
  }

  /* ------------------------------------------------------- fold controls */
  /* One per reduced pane. It never deletes anything: the blocks a
     logistician does not act on are folded, and the fold is labelled and
     tab-reachable. */
  /* A FOLD CONTROL THAT OWNS NOTHING MUST NOT BE DRAWN.

     These buttons toggle `.lqOpen` on the viewport, and the CSS that answers
     that class keys on markup this module used to render — `.tableWrap .grid
     tr > *:nth-child(5)`, `#supplyB`, `.split`, `.proj`. FLEET and SUPPLY are
     now rendered by page-grouped.js, which replaces that markup wholesale. So
     the class toggled, the label flipped to "hide the detail", and not one
     pixel moved: measured 178 visible elements before and 178 after, pane
     text 1,898 characters before and 1,898 after.

     The honest fix is not to re-point the selector at markup that has a
     different shape and a different owner. It is to not offer the control
     where there is nothing behind it. Ask the DOM whether this module's own
     detail is actually present, and withdraw if it is not. */
  function ownsDetail(pane) {
    const p = document.querySelector('[data-pane="' + pane + '"]');
    if (!p) return false;
    /* `.tableWrap .grid` was too loose — page-grouped.js renders its own
       grid inside a tableWrap, so the probe answered "yes, my detail is
       here" about markup belonging to a different module. Ask only for
       markup this file actually writes. */
    if (p.querySelector('[data-gpview], .gpGroup, .gpRow')) return false;
    return !!p.querySelector('.lqDetail, #supplyB, .proj');
  }

  function foldControl(id, host, label) {
    if (!host) return null;
    const found = document.getElementById(id);
    if (found) return found;
    const b = document.createElement('button');
    b.id = id;
    b.className = 'lqMore';
    b.type = 'button';
    b.setAttribute('data-roles', 'LOGISTICIAN');
    b.setAttribute('aria-expanded', 'false');
    b.textContent = label;
    b.addEventListener('click', ev => {
      ev.preventDefault(); ev.stopPropagation();
      const sec = b.closest('.viewport');
      if (!sec) return;
      const open = sec.classList.toggle('lqOpen');
      b.setAttribute('aria-expanded', String(open));
      b.textContent = open ? 'hide the detail' : label;
      if (APP) APP._paneForce = true;
      const r = G('render'); if (r) r();
    });
    host.appendChild(b);
    return b;
  }

  /* ------------------------------------------------------------- actions */
  /* One delegated handler for the controls this file creates. The host's own
     delegated actions — data-deploy, data-approve, data-hold — are reused as
     they are rather than reimplemented, so a logistician's button and an
     analyst's button are literally the same code path. */
  function bind() {
    if (document._lqBound) return;
    document._lqBound = true;
    document.addEventListener('click', ev => {
      const el = ev.target.closest('[data-lq]');
      if (!el) return;
      const cmd = el.dataset.lq;
      ev.preventDefault();
      if (APP) APP._paneForce = true;
      const render = G('render'), sync = G('syncChrome'), go = G('goView');
      if (cmd === 'fold') {
        const sec = el.closest('.viewport');
        if (sec) { sec.classList.toggle('lqOpen'); dashAt = 0; missAt = 0; }
        if (render) render();
        return;
      }
      if (cmd.startsWith('go:')) {
        const v = cmd.slice(3);
        if (!document.querySelector('[data-pane="' + v + '"]')) return;
        if (go) go(v); else { APP.view = v; APP.sel = null; }
        if (sync) sync(); if (render) render();
      }
    });
  }

  /* The rail entry for DASHBOARD is labelled "Where the fight is" by the
     profile table — the right words for the theatre picture, the wrong words
     for the pane this file puts there.

     The label is changed in the profile table itself rather than in the
     rail, and that is not fussiness. applyRoleRail() is re-run by a
     MutationObserver on #rail, and it writes the profile's label back
     whenever it finds something else there. Writing the rail directly
     therefore produces a fight: this module writes, the observer fires,
     app.js writes back, the observer fires, forever at sixteen hertz.
     Changing the one entry in ROLE_PROFILES.LOGISTICIAN.labels — the
     documented mechanism for rail wording, and a plain property on a live
     object — makes what app.js writes the right words in the first place.
     Only the logistician's map is touched; the analyst, the commander and
     the surgeon read their own, and the shipped wording is what an analyst
     still restores to. */
  function relabelRail() {
    try {
      if (typeof ROLE_PROFILES !== 'undefined' &&
          ROLE_PROFILES.LOGISTICIAN && ROLE_PROFILES.LOGISTICIAN.labels)
        ROLE_PROFILES.LOGISTICIAN.labels.DASHBOARD = 'What is on hand';
    } catch (e) { /* the profile table is app.js's; if it is not there, live without it */ }
    if (!isLog()) return;
    const el = document.querySelector('#rail [data-view="DASHBOARD"] em');
    if (el && el.innerHTML !== 'What is on hand') el.innerHTML = 'What is on hand';
  }

  /* ----------------------------------------------------------- bootstrap */
  ANGEL.ready('role-logistician', async () => {
    /* Without the shell there is nothing to compose. Fail silently: the
       seven panes keep the interface they already had. */
    if (!APP || !window.ANGEL) {
      if (window.ANGEL && ANGEL.setStatus)
        ANGEL.setStatus('role-logistician', 'withheld', 'application shell not present');
      return null;
    }

    injectCSS();
    bind();

    /* DASHBOARD is overridden; the other five are reduced. Both forms wrap a
       global that render() calls by name, and in both the native binding is
       captured in a local const before the wrapper is installed, so no
       wrapper can resolve back to itself. */
    const override = (name, mine) => {
      const native = window[name];
      if (typeof native !== 'function' || native._lqWrapped) return;
      if (name === 'renderDashboard') nativeDashboard = native;
      const w = function () {
        if (isLog()) { try { return mine(); } catch (e) { console.warn(name + ' (logistician)', e); return; } }
        return native.apply(this, arguments);
      };
      w._lqWrapped = true;
      window[name] = w;
    };
    const reduce = (name, after) => {
      const native = window[name];
      if (typeof native !== 'function' || native._lqWrapped) return;
      const w = function () {
        const r = native.apply(this, arguments);
        try { after(); } catch (e) { console.warn(name + ' (logistician)', e); }
        return r;
      };
      w._lqWrapped = true;
      window[name] = w;
    };

    /* The mount has to exist before the override can paint into it, and it
       has to exist for every role — hidden by the attribute for the other
       three — because the stylesheet rule that empties this pane is keyed on
       the profile, not on whether a module happened to run. */
    mountBefore('[data-pane="DASHBOARD"]', 'lqDash', '#theaterStage', 'lqStack');
    override('renderDashboard', renderLogDashboard);

    reduce('renderSupply', composeSupply);
    reduce('renderFleet', composeFleet);
    reduce('renderStream', composeStream);
    reduce('renderTasking', composeTasking);
    reduce('renderMission', composeMission);

    /* COST is rendered through ANGEL.views by role-commander, which may not
       be present. Wrap it if it is, and fall back to a listener on the view
       registry if it registers later. Either way the strip is created now,
       so a logistician who lands on COST before that module has painted
       finds the pane framed rather than blank. */
    composeCost();
    const wrapCost = () => {
      const v = window.ANGEL && ANGEL.views && ANGEL.views.COST;
      if (typeof v !== 'function' || v._lqWrapped) return;
      const w = function () { const r = v.apply(this, arguments); try { composeCost(); } catch (e) { } return r; };
      w._lqWrapped = true;
      ANGEL.views.COST = w;
    };
    wrapCost();

    /* The fold controls and mounts are created on first render of their
       pane, which leaves every pane but the landing view without one until
       first visit. Create them all now so a logistician never meets a
       reduced pane with no way to unfold it. */
    const seed = () => {
      composeSupply(); composeFleet(); composeStream();
      composeTasking(); composeMission(); wrapCost();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', seed, { once: true });
    else seed();

    /* A role change is a presentation change and must not disturb the run.
       All this does is force the next frame to rebuild — the reduced and
       unreduced compositions differ by more than a stylesheet rule can
       express, because the strips carry live text — and put the rail wording
       back to something a logistician recognises. */
    ANGEL.need('role').then(role => role.on(() => {
      APP._paneForce = true;
      dashAt = 0; missAt = 0;
      relabelRail();
    })).catch(() => { });
    relabelRail();

    ANGEL.mark('role-logistician ready', {
      overridden: ['DASHBOARD'],
      reduced: ['SUPPLY', 'FLEET', 'MISSION', 'STREAM', 'TASKING', 'COST']
    });
    return true;
  });
})();
