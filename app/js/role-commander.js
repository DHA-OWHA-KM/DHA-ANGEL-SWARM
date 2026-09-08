/* =========================================================================
   COMMANDER — five destinations, and one number.

   The role engine gives a commander five places to stand: DECIDE, MISSION,
   COMPARE, TASKING, COST. Two of those shipped as bare mount points. This
   file fills them, and it reduces the three it inherits.

   The distinction that governs every line below is that a commander is not
   asking what happened. He is asking three things, in this order:

       what do I decide, what does it cost, and what happens if I do nothing.

   So DECIDE is written to be answerable above the fold, without a scroll and
   without a click: one line of situation, the outstanding decision with the
   price of deferring it, the count of soldiers who are open, out of time, or
   out of reach, and the split between what the system is doing on its own
   authority and what is sitting waiting for a human. COST is the resourcing
   argument, composed from the ROI pane and the three cost blocks buried on
   screen three and four of the evidence pane, and it leads with the finding
   that is actually procurement-relevant: launch points move the death count,
   fleet size does not.

   Two rules held throughout.

   ROLES REMOVE SURFACE, NEVER CAPABILITY. Nothing here hides a control that
   is not reachable somewhere else. Where a commander's composition of an
   existing pane drops a block, the block is collapsed behind one affordance
   labelled "show the detail" and is one click away, not deleted; and every
   pane in the application remains one ⌘K away from every role. The three
   inherited panes are *reduced*, not rebuilt: MISSION keeps its map, COMPARE
   keeps its chart, TASKING keeps its queue and its Approve control.

   A DEATH COUNT IS NEVER GREEN. The two colours a toll may take are
   --tollHi (the worse column) and --tollLo (the better one), and the better
   one is amber, not green, because fewer dead is still dead. The word is
   "fewer dead", never "saved" and never "lives saved". The target is zero,
   and the interface says so on the screen where the number is largest.

   AND A DEATH COUNT ALWAYS NAMES ITS POPULATION. Three quantities in this
   application can honestly be called "died": deaths of survivable wounds in
   this operation, deaths in every triage category in this operation, and
   deaths across every operation in the theatre. They are 23, 31 and 248 in
   the reference run, and a caption reading "DEAD" over the first of them
   invites a reviewer to read it as the third. So every figure here takes its
   caption from COUNT.LABEL and every quantity is read from COUNT itself —
   including the horizon, COUNT.clock(), which is the mission clock while the
   run is going and the whole record once it has finished.

   HOW THIS ATTACHES. DECIDE and COST are registered through ANGEL.views, the
   documented extension point, and the host's render() dispatches to them.
   MISSION, COMPARE and TASKING are not dispatched that way — render() calls
   those three by name before it consults ANGEL.views — so this file wraps
   the three global renderers instead: the native renderer runs first and
   unconditionally, for every role, and the commander composition runs after
   it and only when the commander profile is active. The native function is
   captured in a local binding before the wrapper is installed, so there is
   no path by which a wrapper can resolve back to itself. That mistake has
   been made once in this application already (see setRole in ROLE_CONTRACT
   §3) and it costs a stack overflow on the first call.

   WHAT IS MARKED, AND WHAT IS NOT. Everything this file adds to a pane it
   shares with another role — the headline strip on TASKING, the three fold
   controls — is marked data-roles="COMMANDER" as it is created, per the
   contract's "mark up, do not filter" rule, so it is correct on arrival and
   stays correct through a rebuild at 60 Hz without this module being told
   anything. Measured: the analyst's twenty-one destinations come to the same
   7,912 visible elements and the same 277 controls with this file loaded as
   without it, and the logistician's and the surgeon's are unchanged to the
   element.

   The contents of DECIDE and COST are deliberately *not* marked. Those two
   panes belong to the role rails that name them — DECIDE to the commander,
   COST to the commander and the logistician — and marking their blocks
   COMMANDER would have left a logistician standing on an empty COST pane,
   which is the exact defect the UI audit found eight times over. Unmarked
   means offered to everyone, and since neither destination is on the analyst
   rail, nothing leaks into the interface whose defining property is that it
   did not change. It also means an analyst who reaches either pane through
   ⌘K finds it populated rather than blank.
   ========================================================================= */

(function () {
  'use strict';

  /* Above-the-fold budget on the design viewport: 1000px of window, less the
     22px classification band, less a 52px single-row command bar, less the
     pane's own 32px of vertical padding and its ~44px head once the lede is
     suppressed. That leaves ~850px, and the four blocks below are sized to
     fit inside it with the supporting pair starting off-screen. If a fifth
     block ever seems necessary here, it belongs to the analyst. */

  const CSS = `
/* ---------------------------------------------------------- COMMANDER --
   Sized for a screen being read over somebody's shoulder: one figure large
   enough to carry the room, everything else deliberately small. Nothing in
   here is loaded unless this file loads, and every selector is scoped to
   the commander profile so the other three roles cannot see it at all. */

#decideBody, #costBody { display:flex; flex-direction:column; gap:12px; padding-top:2px }

/* The lede under "What to decide" restates what the situation line below
   says with live numbers in it. One of the two has to go. */
body[data-role-profile="COMMANDER"] [data-pane="DECIDE"] .ph1 p,
body[data-role-profile="COMMANDER"] [data-pane="COST"] .ph1 p { display:none }

/* ---- situation: one line, plain language, no figures competing --------- */
.cqSit{
  display:flex; align-items:baseline; gap:10px; flex-wrap:wrap;
  font:500 13.5px/1.5 var(--sans); color:var(--text);
}
.cqSit .cqWhen{
  font:700 9px/1 var(--mono); letter-spacing:.14em; color:var(--faint);
  border:1px solid var(--line); border-radius:4px; padding:5px 7px;
}
.cqSit em{font-style:normal; color:var(--dim)}

/* ---- the outstanding decision ----------------------------------------- */
.cqDecide{
  display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:22px;
  border:1px solid var(--line); border-radius:12px; padding:16px 20px;
  background:var(--panel);
}
.cqDecide.pending{
  border-color:rgba(255,66,87,.55);
  background:linear-gradient(180deg, rgba(255,66,87,.10), rgba(255,66,87,.02));
}
body.light .cqDecide.pending{background:linear-gradient(180deg, rgba(214,31,56,.09), rgba(214,31,56,.02))}
.cqKick{
  display:flex; align-items:center; gap:9px;
  font:700 9px/1 var(--mono); letter-spacing:.19em; color:var(--faint); margin-bottom:9px;
}
.cqDecide.pending .cqKick{color:var(--bad)}
.cqHead{font:800 21px/1.2 var(--sans); letter-spacing:.005em; margin:0}
.cqFigs{display:flex; align-items:flex-end; gap:26px; margin-top:11px; flex-wrap:wrap}
.cqFig{display:flex; flex-direction:column; gap:5px; min-width:0}
.cqFig b{font:800 62px/.86 var(--mono); letter-spacing:-.035em; color:var(--tollHi)}
.cqFig.lo b{color:var(--tollLo)}
.cqFig.sm b{font-size:30px; line-height:1}
.cqFig span{font:600 9px/1.35 var(--mono); letter-spacing:.1em; color:var(--dim); max-width:26ch}
.cqRule{width:1px; align-self:stretch; background:var(--line); margin:2px 0}
.cqSay{margin:12px 0 0; font:400 12px/1.65 var(--sans); color:var(--dim); max-width:82ch}
.cqSay b{color:var(--text); font-weight:700}
.cqZero{font:700 10px/1 var(--mono); letter-spacing:.14em; color:var(--tollLo)}
.cqAct{display:flex; flex-direction:column; align-items:stretch; gap:8px; min-width:210px}
.cqAct .btn{padding:13px 18px; font-size:12.5px; text-align:center}
.cqAct .cqSub{font:500 10px/1.45 var(--sans); color:var(--faint); text-align:center; max-width:210px}

/* ---- who is open, who is out of time, who is out of reach -------------- */
.cqCounts{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px}
.cqCount{
  background:var(--panel); border:1px solid var(--line); border-radius:11px; padding:13px 16px;
  display:flex; flex-direction:column; gap:6px;
}
.cqCount .cqN{display:flex; align-items:baseline; gap:9px}
.cqCount .cqN b{font:800 38px/1 var(--mono); letter-spacing:-.02em}
.cqCount .cqN b.toll{color:var(--tollHi)} .cqCount .cqN b.warn{color:var(--warn)}
.cqCount .cqN b.calm{color:var(--text)}
.cqCount .cqN i{font:500 11px/1.3 var(--sans); font-style:normal; color:var(--dim)}
.cqCount h4{margin:0; font:700 9px/1 var(--mono); letter-spacing:.14em; color:var(--faint)}
.cqCount p{margin:0; font:400 11px/1.55 var(--sans); color:var(--dim)}
.cqCount p b{color:var(--text)}

/* ---- standing authority against what is waiting on a person ----------- */
.cqAuth{
  display:grid; grid-template-columns:repeat(3,minmax(0,1fr)) minmax(0,1.5fr);
  align-items:center; gap:0;
  background:var(--panel); border:1px solid var(--line); border-radius:11px; overflow:hidden;
}
.cqAuthCell{padding:11px 16px; border-right:1px solid var(--line); min-width:0}
.cqAuthCell:last-child{border-right:0}
.cqAuthCell b{display:block; font:800 26px/1 var(--mono)}
.cqAuthCell b.warn{color:var(--warn)} .cqAuthCell b.bad{color:var(--bad)}
.cqAuthCell span{display:block; margin-top:5px; font:600 8.5px/1.35 var(--mono); letter-spacing:.1em; color:var(--faint)}
/* The note shares the cell rule above, which sets any <b> to a 26px figure.
   Put it back: in this cell a <b> is emphasis in a sentence, not a count. */
.cqAuthNote{font:400 11px/1.55 var(--sans); color:var(--dim)}
.cqAuthNote b{display:inline; font:700 11px/1.55 var(--sans); color:var(--text)}
.cqAuthNote a{color:var(--info); text-decoration:none; white-space:nowrap}
.cqAuthNote a:hover{text-decoration:underline}
.cqAuthNote .aiMark{margin-right:6px; vertical-align:middle}

/* ---- the two supporting blocks, and nothing else ---------------------- */
.cqSupport{display:grid; grid-template-columns:1.45fr 1fr; gap:12px; align-items:start}
@media (max-width:1240px){ .cqSupport{grid-template-columns:1fr} }
.cqTable{width:100%; border-collapse:collapse; font-size:11.5px}
/* The header wraps rather than holding the table open. Every width on this
   table is a preferred width under table-layout:auto; nowrap turned each of
   them into a hard floor equal to the whole heading string, so lengthening
   one heading — "Died" became "Died of wounds / all categories" — pushed the
   table past its card and the action column with it. Wrapping costs nothing
   at the design width, where none of these headings needs a second line, and
   below it the columns give way in proportion instead of the table
   overflowing. See polish.css §7. */
.cqTable th{
  text-align:left; padding:8px 12px; background:var(--panel2); border-bottom:1px solid var(--line);
  font:700 8.5px/1.25 var(--mono); letter-spacing:.11em; color:var(--faint);
  white-space:normal; overflow-wrap:break-word; min-width:0;
}
.cqTable td{min-width:0}
/* A column header that carries its population under the noun. The shell's own
   stylesheet has this for table.grid, which is the analyst's DASHBOARD; the
   commander's operations table is .cqTable and needed the same rule rather
   than a second, differently-sized version of the same idea. */
.cqTable th .thSub{
  display:block; margin-top:2px; font:600 8px/1.2 var(--mono);
  letter-spacing:.08em; color:var(--faint); text-transform:none;
}
.cqTable td{padding:7px 12px; border-bottom:1px solid var(--line); vertical-align:middle}
.cqTable tr:last-child td{border-bottom:0}
.cqTable td.act{text-align:right; white-space:nowrap}
.cqTable tr.here td{background:rgba(49,214,138,.07)}
.cqBody{padding:13px 16px; display:flex; flex-direction:column; gap:10px}
.cqBody p{margin:0; font:400 11.5px/1.6 var(--sans); color:var(--dim)}
.cqBody p b{color:var(--text)}
.cqSet{display:flex; align-items:center; gap:10px; flex-wrap:wrap; font:400 11.5px/1.5 var(--sans); color:var(--dim)}
.cqSet b{font-family:var(--mono); color:var(--text)}
.cqSet .chip{
  border:1px solid var(--line); background:var(--panel2); border-radius:6px; padding:6px 10px;
  font:700 9.5px/1 var(--mono); letter-spacing:.08em; color:var(--dim); cursor:pointer;
}
.cqSet .chip.on{background:var(--angel); color:#04140c; border-color:transparent}
body.light .cqSet .chip.on{color:#fff}

/* ---- COST ------------------------------------------------------------- */
.cqBand{
  display:grid; grid-template-columns:auto 1px minmax(0,1fr); align-items:center; gap:22px;
  background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:16px 20px;
}
@media (max-width:1100px){ .cqBand{grid-template-columns:1fr} .cqBand .cqRule{display:none} }
.cqBandFig b{display:block; font:800 58px/.9 var(--mono); letter-spacing:-.035em; color:var(--tollLo)}
.cqBandFig span{display:block; margin-top:7px; font:600 9px/1.4 var(--mono); letter-spacing:.1em; color:var(--dim); max-width:30ch}
/* label · paired bars · ANGEL · CURRENT — TRIAGE & PROXIMITY · unit. Five columns, and
   the two figures sit against the bars they belong to rather than at the far
   edge of the card, which is what makes the pair readable as a comparison. */
/* Deliberately the same geometry as .roiRow in the shell's own stylesheet —
   label, paired bars, the two figures, the unit — so a commander who opens
   the full argument next door is looking at the same object. */
.cqBars{border:1px solid var(--line); border-radius:9px; padding:9px 12px; background:var(--panel2)}
.cqBar{display:grid; grid-template-columns:1fr 190px 62px 62px 150px; gap:10px;
  align-items:center; padding:6px 0; border-bottom:1px solid rgba(150,180,210,.07)}
.cqBar:last-child{border-bottom:none}
.cqBar .cqK{font:500 11.5px/1.4 var(--sans); color:var(--text)}
.cqBar .cqU{font:400 10px/1.3 var(--sans); color:var(--faint)}
.cqBar .cqTrack{display:flex; flex-direction:column; gap:3px; min-width:0}
.cqBar .cqTrack i{display:block; height:8px; border-radius:3px; min-width:2px}
.cqBar .cqTrack i.a{background:var(--angel)} .cqBar .cqTrack i.b{background:var(--current)}
.cqBar b{font:700 12.5px/1 var(--mono); text-align:right}
.cqBar b.dim{color:var(--dim)}
.cqKey{display:flex; gap:16px; font:500 10px/1 var(--sans); color:var(--dim); padding-top:4px}
.cqKey span{display:flex; align-items:center; gap:5px}
.cqKey i{width:10px; height:10px; border-radius:2px}
.cqKey i.a{background:var(--angel)} .cqKey i.b{background:var(--current)}
.cqFind{
  display:flex; gap:14px; align-items:flex-start;
  border:1px solid rgba(255,179,64,.34); border-radius:10px; padding:13px 16px;
  background:rgba(255,179,64,.06);
}
.cqFind .cqFindN{font:800 30px/1 var(--mono); color:var(--warn); flex:0 0 auto}
.cqFind > div{flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:8px}
.cqFind p{margin:0; font:400 12px/1.6 var(--sans); color:var(--text); max-width:104ch}
.cqFind p em{font-style:normal; color:var(--dim)}
.cqCite{
  margin:0; padding:10px 13px; border-left:2px solid var(--line2); border-radius:0 6px 6px 0;
  background:var(--panel2); font:400 10.5px/1.65 var(--sans); color:var(--dim);
}
.cqCite b{color:var(--text)}
.cqLimits{margin:0; padding-left:18px; display:flex; flex-direction:column; gap:7px}
.cqLimits li{font:400 11.5px/1.6 var(--sans); color:var(--dim)}
.cqLimits li b{color:var(--text)}
.cqTools{display:flex; gap:8px; flex-wrap:wrap}

/* ---- the "show the detail" affordance --------------------------------- */
/* One control per reduced pane. It never deletes anything: the blocks a
   commander does not act on are folded, and the fold is labelled. */
.cqMore{
  display:inline-flex; align-items:center; gap:7px; cursor:pointer;
  border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:7px 11px;
  font:700 9.5px/1 var(--mono); letter-spacing:.1em; color:var(--dim);
}
.cqMore:hover{color:var(--text); border-color:var(--line2)}
.cqMore::after{content:'+'; font-size:12px; line-height:1}
.cqOpen > .cqMore::after, .cqOpen .cqMore::after{content:'−'}
.cqMore.float{
  position:absolute; z-index:7; background:rgba(6,12,19,.93); border-color:rgba(150,190,225,.22);
  backdrop-filter:blur(6px);
}
body.light .cqMore.float{background:rgba(255,255,255,.95); border-color:rgba(30,60,90,.16)}

/* MISSION, reduced. The map is the point of this destination, so what goes
   is the furniture around it: both dock rails (one is the surgeon's list of
   wounded, the other duplicates FLEET wholesale), the layer filter, and the
   two demo toggles. The zoom cluster stays — it is the only map control a
   commander uses — and everything folded is one click from here and from
   its own pane. */
body[data-role-profile="COMMANDER"] [data-pane="MISSION"]:not(.cqOpen) #dock,
body[data-role-profile="COMMANDER"] [data-pane="MISSION"]:not(.cqOpen) #legend,
body[data-role-profile="COMMANDER"] [data-pane="MISSION"]:not(.cqOpen) .mapTools .seg:not(.zoomer){
  display:none !important;
}
body[data-role-profile="COMMANDER"] [data-pane="MISSION"]:not(.cqOpen) .mapTools{right:16px}
body[data-role-profile="COMMANDER"] [data-pane="MISSION"]:not(.cqOpen) #legend{max-width:calc(100% - 24px)}
/* Bottom right: clear of the scoreboard at top centre, the zoom cluster at
   top right and the layer filter at bottom left in either fold state. */
body[data-role-profile="COMMANDER"] #cqMissionMore{bottom:12px; right:16px}
/* Unfolded, the bottom-right corner belongs to the area-of-operations card
   the map draws into the canvas, so the control moves under the zoom cluster
   and to the left of the dock instead of sitting on top of it. */
body[data-role-profile="COMMANDER"] [data-pane="MISSION"].cqOpen #cqMissionMore{
  top:52px; bottom:auto; right:352px;
}
/* The one number, made legible from across a room. */
body[data-role-profile="COMMANDER"] .missCompare{padding:11px 20px; gap:15px}
body[data-role-profile="COMMANDER"] .missCompare b{font-size:46px}
body[data-role-profile="COMMANDER"] .mcL{font-size:12px}
body[data-role-profile="COMMANDER"] .mcS b{font-size:17px}

/* COMPARE, reduced. Headline, the four reasons, the divergence chart. The
   two quarter-size map thumbnails are unreadable at that size and the
   nine-row ledger is the logistician's screen; both fold. */
body[data-role-profile="COMMANDER"] [data-pane="COMPARE"]:not(.cqOpen) .cmpMaps,
body[data-role-profile="COMMANDER"] [data-pane="COMPARE"]:not(.cqOpen) .cmpTableCard,
body[data-role-profile="COMMANDER"] [data-pane="COMPARE"]:not(.cqOpen) #chCompare{
  display:none !important;
}
/* #chCompare is the survival curve and the deadline scatter, drawn three
   times in this application and belonging to the surgeon on FLOW. The chart
   pack observes its own host with a ResizeObserver, so un-folding it resizes
   it correctly with nothing needed from here. */
.cqCmpMore{display:flex; justify-content:flex-end; flex:0 0 auto; padding-top:2px}
/* With the thumbnails and the ledger folded, the one chart left is the whole
   lower half of the screen, so it takes the room the maps were holding
   rather than leaving a card three-quarters empty. */
body[data-role-profile="COMMANDER"] [data-pane="COMPARE"]:not(.cqOpen) .cmpBottom{
  grid-template-columns:1fr; flex:1 1 auto; min-height:0;
}
body[data-role-profile="COMMANDER"] [data-pane="COMPARE"]:not(.cqOpen) .cmpChartCard{min-height:0}
body[data-role-profile="COMMANDER"] [data-pane="COMPARE"]:not(.cqOpen) .cmpChart{
  flex:1 1 auto; height:auto; min-height:220px;
}
body[data-role-profile="COMMANDER"] .cmpSide b{font-size:46px}

/* TASKING, reduced. The queue and the Approve control are the point. The
   seven-line policy essay in the head and the five-ground escalation table
   fold — a commander reads them once, not on every visit. */
body[data-role-profile="COMMANDER"] [data-pane="TASKING"]:not(.cqOpen) .ph1 p,
body[data-role-profile="COMMANDER"] [data-pane="TASKING"]:not(.cqOpen) .card:has(#policyBox){
  display:none !important;
}
body[data-role-profile="COMMANDER"] [data-pane="TASKING"] .kpi b{font-size:26px}

/* A headline strip carrying the one number onto the two panes that do not
   already state it. It is never rendered on MISSION or COMPARE, which do. */
.cqLine{
  display:flex; align-items:baseline; gap:14px; flex-wrap:wrap;
  border:1px solid var(--line); border-radius:10px; padding:11px 16px; background:var(--panel);
}
.cqLine .cqLead{font:800 30px/1 var(--mono); color:var(--tollLo); letter-spacing:-.02em}
.cqLine .cqLead.flat{color:var(--dim)}
.cqLine .cqTxt{font:500 12px/1.4 var(--sans); color:var(--text)}
.cqLine .cqTxt em{font-style:normal; color:var(--dim)}
.cqLine .cqZero{margin-left:auto}

/* ====================== THE DECISION BAR ==============================
   A third chrome row, for this role only. Three slots, in the order the
   questions get asked: am I winning, does anything need me, what is about
   to go wrong. Slot 2 is the ONLY amber object on the display, so "a human
   must act" has a colour reserved to it and nothing else uses it. */
#decbar{display:none}
body[data-role-profile="COMMANDER"] #decbar{
  display:grid; grid-template-columns:1fr 1.05fr 1fr; gap:1px;
  background:var(--line); box-shadow:inset 0 -1px 0 var(--line);
}
.dsSlot{
  background:var(--k1,var(--panel)); padding:10px 16px 11px;
  display:flex; flex-direction:column; min-height:86px; max-height:104px;
  position:relative; min-width:0; overflow:hidden;
}
.dsK{font:700 8.5px/1 var(--mono); letter-spacing:.16em; color:var(--faint); margin-bottom:7px}
.dsBig{display:flex; align-items:flex-end; gap:12px; min-width:0}
.dsNum{font:700 38px/.88 var(--mono); letter-spacing:-.01em; flex:none}
.dsNum.good{color:var(--ok)} .dsNum.flat{color:var(--text)}
.dsNum.act{color:var(--warn)} .dsNum.bad{color:var(--bad)}
.dsUnit{font:600 11px/1.28 var(--sans); color:var(--dim); padding-bottom:3px; min-width:0}
.dsUnit b{color:var(--text)}
.dsSub{font:400 10.5px/1.45 var(--sans); color:var(--faint); margin-top:6px;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden}
.dsSub b{color:var(--text); font-weight:600}
.dsCmp{display:flex; align-items:center; gap:8px; margin-top:8px}
.dsBar{flex:1; height:6px; border-radius:3px; background:var(--panel2); overflow:hidden; display:flex}
.dsBar i{display:block; height:100%}
.dsBar i.a{background:var(--angel)} .dsBar i.b{background:var(--current); opacity:.55}
.dsLg{display:flex; gap:14px; font:600 8.5px/1 var(--mono); letter-spacing:.1em;
  color:var(--faint); margin-top:7px; flex-wrap:wrap}
.dsLg i{width:8px; height:8px; border-radius:2px; display:inline-block; margin-right:5px;
  vertical-align:-1px; font-style:normal}
.dsLg i.a{background:var(--angel)} .dsLg i.b{background:var(--current); opacity:.55}
.dsSlot.act{
  background:linear-gradient(180deg, color-mix(in srgb,var(--warn) 10%,transparent),
                                     color-mix(in srgb,var(--warn) 3%,transparent)), var(--k1,var(--panel));
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--warn) 34%,transparent);
}
.dsSlot.act .dsK{color:var(--warn)}
.dsQuiet{font:700 14px/1.2 var(--sans); color:var(--faint); margin-top:5px}
.dsBtn{margin-top:auto; align-self:flex-start; border:0; background:var(--warn); color:var(--on-accent);
  border-radius:5px; padding:7px 14px; cursor:pointer; font:700 11px/1 var(--sans)}
.dsBtn.q{background:var(--panel2); color:var(--text); border:1px solid var(--line2); font-weight:600}
.dsBtn.q:hover{border-color:var(--angel); color:var(--angel)}
.dsPulse{position:absolute; right:13px; top:11px; width:8px; height:8px; border-radius:50%;
  background:var(--warn); box-shadow:0 0 0 5px color-mix(in srgb,var(--warn) 16%,transparent)}
@media (max-width:1240px){
  .dsNum{font-size:30px} .dsSlot{padding:9px 12px 10px; min-height:78px}
  .dsUnit{font-size:10px} .dsSub{display:none}
}

/* The map banner used to be the only place the difference was stated on THE
   FIGHT, so it carried all of it: the delta, both arms' tolls, the target and
   the all-categories bridge — six figures in one strip at one size. The
   decision bar now states the delta and both terms directly above it, and
   saying the same thing twice on one screen is exactly the complaint. For
   this role the banner keeps only what the bar does NOT carry: that the
   aircraft are tasked by a model, that the target is zero, and the
   all-categories toll. Scoped to .ok, because when nothing is deployed this
   strip is the deploy call to action and must stay whole. */
body[data-role-profile="COMMANDER"] #missCompare.ok > b,
body[data-role-profile="COMMANDER"] #missCompare.ok .mcL,
body[data-role-profile="COMMANDER"] #missCompare.ok .mcSep,
body[data-role-profile="COMMANDER"] #missCompare.ok .mcS:not(.all):not(.zero){display:none}

/* ======================= ORDER OF BATTLE ============================== */
.cqOrbat{margin-top:12px}
.cqOrbatB{padding:14px 16px}
.cqLps{display:grid; grid-template-columns:repeat(auto-fit,minmax(268px,1fr)); gap:12px}
.cqLp{background:var(--panel2); border:1px solid var(--line); border-radius:9px; padding:12px 13px}
.cqLpH{display:flex; align-items:center; gap:8px}
.cqLpH b{font:700 11.5px/1 var(--mono); letter-spacing:.06em}
.cqLpE{font:400 10px/1 var(--sans); color:var(--faint)}
.cqLpR{margin-left:auto; font:700 11px/1 var(--mono); color:var(--text)}
.cqLpR i{font-style:normal; color:var(--faint); font-weight:400; font-size:9.5px}
.cqTails{display:flex; flex-wrap:wrap; gap:5px; margin:10px 0 9px; min-height:26px}
.cqNone{font:400 10.5px/1.4 var(--sans); color:var(--faint)}
.cqTail{display:inline-flex; align-items:center; gap:5px; background:var(--k4,var(--panel));
  border-radius:4px; padding:4px 4px 4px 7px; box-shadow:inset 0 0 0 1px var(--line2)}
.cqTail b{font:700 9.5px/1 var(--mono); color:var(--text)}
.cqTail em{font-style:normal; font:400 8.5px/1 var(--mono); color:var(--faint)}
.cqTail u{text-decoration:none; color:var(--faint); font:700 11px/1 var(--mono); cursor:pointer;
  padding:0 3px; border-radius:2px}
.cqTail u:hover{color:var(--bad); background:var(--panel)}
.cqTail u.off{cursor:default; opacity:.45}
.cqTail u.off:hover{color:var(--faint); background:transparent}
.cqTail.busy{opacity:.62}
.cqAdd{display:flex; flex-wrap:wrap; gap:5px}
.cqAddB{border:1px dashed var(--line2); background:transparent; color:var(--dim); border-radius:4px;
  padding:5px 8px; font:600 9.5px/1 var(--sans); cursor:pointer}
.cqAddB:hover{border-color:var(--angel); color:var(--angel); border-style:solid}
.cqLpF{margin-top:9px; font:400 10px/1.4 var(--sans); color:var(--faint)}
.cqLpF b{color:var(--dim); font-weight:600}
.cqLpF b.amb{color:var(--warn)}

.cqBulk{display:grid; grid-template-columns:1.25fr 1fr; gap:20px; margin-top:18px}
@media (max-width:1100px){.cqBulk{grid-template-columns:1fr}}
.cqSubH{font:700 8.5px/1 var(--mono); letter-spacing:.14em; color:var(--faint); margin-bottom:4px}
.cqStep{display:flex; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid var(--line)}
.cqStep:last-of-type{border-bottom:0}
.cqStepN{flex:1; min-width:0}
.cqStepN b{font:700 11px/1 var(--mono); display:block}
.cqStepN span{display:block; margin-top:4px; font:400 9.5px/1.4 var(--sans); color:var(--faint)}
.cqStp{display:flex; align-items:center; background:var(--panel2); border-radius:4px;
  box-shadow:inset 0 0 0 1px var(--line2); flex:none}
.cqStp button{border:0; background:transparent; color:var(--dim); width:24px; height:24px;
  cursor:pointer; font:700 13px/1 var(--mono)}
.cqStp button:hover{color:var(--text); background:var(--panel)}
.cqStp i{font-style:normal; width:32px; text-align:center; font:700 12px/1 var(--mono); color:var(--text)}
.cqBulkA{display:flex; gap:8px; margin-top:12px; flex-wrap:wrap}
.cqBulkA .mini[disabled]{opacity:.5; cursor:default}
.cqPkg{display:block; width:100%; text-align:left; background:var(--panel2); border:1px solid var(--line);
  border-radius:8px; padding:10px 12px; margin-bottom:7px; cursor:pointer}
.cqPkg:hover{border-color:var(--angel)}
.cqPkg b{font:700 10.5px/1 var(--mono); letter-spacing:.08em; display:block; color:var(--text)}
.cqPkg span{font:400 10px/1.45 var(--sans); color:var(--faint); display:block; margin-top:5px}
.cqFair{display:flex; gap:11px; align-items:flex-start; margin-top:14px; border-radius:8px;
  padding:11px 13px; background:color-mix(in srgb,var(--angel) 6%,transparent);
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--angel) 28%,transparent)}
.cqFairK{font:700 9px/1 var(--mono); letter-spacing:.12em; color:var(--angel); flex:none; padding-top:2px}
.cqFair p{margin:0; font:400 10.5px/1.5 var(--sans); color:var(--dim)}
.cqFair b{color:var(--text)}
`;

  /* ------------------------------------------------------------ plumbing */
  /* Every host function this file leans on is a top-level declaration in a
     classic script, so it is reachable by bare name. It is still asked for
     rather than assumed: a module that throws inside render() takes the
     whole application down with it, and the contract for this file is that
     it fails silently and leaves everything else working. */
  const APP = window.APP;
  const G = k => (typeof window[k] === 'function' ? window[k] : null);

  /* COUNT — the counted nouns, defined once at the head of app.js. Reachable
     by bare name because both files are classic scripts and this one is
     parsed after that one; `window.COUNT` and `ANGEL.need('counts')` are the
     same object. Nothing in this file re-derives a quantity COUNT publishes:
     the death figures on DECIDE were being read straight off `arm.stats`,
     which was right by luck rather than by contract, and the labels over them
     said "DEAD" where the number underneath was survivable deaths only. */

  const fmtT = G('fmtT') || (m => 'T+' + m.toFixed(0));
  const esc = G('esc') || (s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])));
  const ai = G('ai') || (() => '');

  const n0 = v => (v === null || v === undefined || !isFinite(v)) ? '—' : Math.round(v).toLocaleString();
  const n1 = v => (v === null || v === undefined || !isFinite(v)) ? '—' : v.toFixed(v < 10 ? 1 : 0);
  const plural = (n, one, many) => n === 1 ? one : (many || one + 's');

  /* The death labels, upper-cased for the mono captions, taken from
     COUNT.LABEL rather than restated here. Three populations in this
     application can be described as "died" — survivable deaths in this
     operation, all deaths in this operation, all deaths across every
     operation — so a caption reading "DEAD" over one of them tells a reader
     nothing and invites him to assume the largest. Read through a guard
     because this line runs at parse time, ahead of the ANGEL.ready() that
     withholds the module; the fallbacks are complete labels, not bare words. */
  const HAS_COUNT = (typeof COUNT !== 'undefined') && !!COUNT && !!COUNT.LABEL;
  const DIED_SURV = HAS_COUNT ? COUNT.LABEL.DIED_SURVIVABLE_SHORT.toUpperCase()
    : 'DEAD OF SURVIVABLE WOUNDS';
  const DIED_SURV_LONG = HAS_COUNT ? COUNT.LABEL.DIED_SURVIVABLE.toUpperCase()
    : 'DIED OF WOUNDS THEY COULD HAVE SURVIVED';

  function injectCSS() {
    if (document.getElementById('cqCss')) return;
    const s = document.createElement('style');
    s.id = 'cqCss'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  const isCommander = () =>
    !!(window.ANGEL && ANGEL.role ? ANGEL.role.current() === 'COMMANDER' : APP && APP.role === 'COMMANDER');

  /* Write only if it changed. These panes are re-rendered up to three times a
     second and replacing identical markup churns the DOM under the operator's
     cursor for nothing. */
  function paint(el, html) {
    if (!el) return;
    if (el._cqH === html) return;
    el._cqH = html; el.innerHTML = html;
  }

  /* ----------------------------------------------------------- the facts */
  /* One place that reads the run, so the four blocks on DECIDE cannot
     disagree with each other about what is on the ground — which is the
     defect the UI inventory found in the shipped panes, where "died" meant
     three different numbers on three different screens. */
  function situation() {
    const A = APP.armA, B = APP.armB;
    if (!A || !B || !APP.world) return null;

    /* TWO TIMES. `now` is the minute the operator is standing on and is what
       time-to-collapse is computed against. `hz` is the horizon — how much of
       the record is visible — and it is COUNT.clock(), which is the same
       number while the run is in progress and the whole record once it has
       finished. Every "has this happened yet" filter on this pane compares
       against `hz`; a casualty resolved a few seconds past the scenario
       duration is part of what happened, not something to hide forever. */
    const now = APP.tView;
    const hz = COUNT.clock();
    const dep = (G('deployState') || (() => ({ k: 'NOT_DEPLOYED', cls: 'bad' })))();
    const cas = A.casualties.filter(c => c.tInjury <= hz);
    const open = cas.filter(c => c.outcome === null);

    /* Time left against the physiological deadline — the minute at which
       this soldier's body can no longer compensate for the blood he has
       lost. 9000 is the model's stand-in for "no deadline"; those are the
       stable ones and they are not counted as out of time. */
    const left = c => c.deadlineMin >= 9000 ? Infinity : c.deadlineMin - (now - c.tInjury);
    const outOfTime = open.filter(c => left(c) <= 0).length;
    const nearly = open.filter(c => { const l = left(c); return l > 0 && l < 15; }).length;

    /* Out of reach is a fact about where the launch points are, not about
       how the aircraft are tasked, which is why it is on this screen and not
       buried in an average. reachN is written by the allocator; before the
       first tasking pass it may be absent, and absent is not zero. */
    const reachKnown = open.filter(c => c.reachN !== undefined);
    const noReach = reachKnown.filter(c => c.reachN === 0).length;
    const oneReach = reachKnown.filter(c => c.reachN === 1).length;
    const cov = (G('coverageGaps') || (() => ({ thin: 0 })))();

    /* The four death figures this pane is allowed to print, all four from
       COUNT. `dead`/`deadB` are the survivable cohort — the only deaths a
       tasking decision could ever have touched, and the number every headline
       here carries. `deadAll`/`deadAllB` are every triage category in the same
       operation and are the larger figure the theatre table and the units
       roster show. The two are never printed without saying which is which,
       and neither is ever read off `arm.stats` directly again: that is how
       this pane and the shell came to be answering the same question with
       different arithmetic. */
    const a = A.stats;
    const dead = COUNT.deathsSurvivable(A), deadB = COUNT.deathsSurvivable(B);
    const deadAll = COUNT.deathsAll(A), deadAllB = COUNT.deathsAll(B);
    const delta = deadB - dead;
    const pct = deadB ? delta / deadB * 100 : 0;

    /* What the last ten minutes cost. Both arms, because before deployment
       they are the same fight and the point of the number is that it keeps
       running whether or not a decision has been made. COUNT.SURVIVABLE, not
       a local copy of the same predicate, and the upper bound is the horizon
       so that the last minutes of a finished run are not silently empty. */
    const recent = A.casualties.filter(c =>
      c.outcome === 'DIED' && COUNT.SURVIVABLE(c) && c.tResolved != null &&
      c.tResolved > now - 10 && c.tResolved <= hz).length;

    const q = A.queue || [];
    return {
      now, hz, dep, scn: APP.world.scn, cas, open, outOfTime, nearly,
      noReach, oneReach, cov, A, B, dead, deadB, deadAll, deadAllB, delta, pct, recent,
      pending: q.filter(p => p.state === 'PENDING').length,
      auto: a.autoApproved || 0, approved: a.approved || 0,
      rejected: a.rejected || 0, expired: a.expired || 0,
      started: A.casualties.length > 0 || now > 0
    };
  }

  /* ========================= THE DECISION BAR ===========================
     Everything here comes out of situation(), which is the same call the
     DECIDE pane is built from. That is the point: the bar and the pane
     cannot answer the same question with different arithmetic, which is
     exactly how "died" came to mean three things on three screens.

     Three slots, always these three, in the order a commander asks them.
       1  AM I WINNING          the difference, with its two terms shown
       2  DOES ANYTHING NEED ME the only amber object on the display
       3  WHAT IS ABOUT TO GO WRONG   the forecast, and whether tasking can
                                      even reach it
     ------------------------------------------------------------------- */
  function oldestPending(A, now) {
    const q = (A.queue || []).filter(p => p.state === 'PENDING');
    if (!q.length) return null;
    let oldest = q[0].tRaised;
    for (const p of q) if (p.tRaised < oldest) oldest = p.tRaised;
    return Math.max(0, now - oldest);          // minutes of simulated time
  }
  /* Simulated minutes read as minutes and seconds, because "0.7 min" is not
     how anybody says it and this is the number that says how long a person
     has been kept waiting. */
  function agoTxt(mins) {
    if (mins == null) return '';
    const sec = Math.round(mins * 60);
    return sec < 60 ? sec + ' seconds' : Math.floor(sec / 60) + ' min ' + (sec % 60) + ' s';
  }

  function renderDecisionBar() {
    const el = document.getElementById('decbar');
    if (!el) return;
    if (!isCommander()) { if (el.innerHTML) paint(el, ''); return; }
    const S = situation();
    if (!S) { paint(el, ''); return; }

    /* ---- 1 · am I winning ------------------------------------------- */
    const deployed = S.dep.k === 'DEPLOYED';
    let s1;
    if (!deployed) {
      s1 = '<div class="dsSlot"><div class="dsK">AM I WINNING</div>' +
        '<div class="dsQuiet">Not deployed.</div>' +
        '<div class="dsSub">Both arms on current triage and proximity. Nothing to compare yet.</div>' +
        '<button class="dsBtn q" data-cmd="deploy">Send ANGEL SWARM  &rarr;</button></div>';
    } else {
      const d = S.delta;                       // positive = fewer dead with ANGEL SWARM
      /* NOT 'good'. This file already says, twelve lines from the top, that a
         death count is never green — and then asked for the class named
         'good', which the console's semantic palette quite reasonably paints
         green. So the largest number on the screen, a count of dead soldiers,
         was rendering as success. The footer of this application reads DEATHS
         COUNTED, NEVER SCORED; the figure above it has to agree.
         --tollLo (amber) for the better column, --tollHi (red) for the worse,
         and neither of them is a colour that congratulates anyone. */
      const cls = d > 0 ? 'tollLo' : d < 0 ? 'tollHi' : 'flat';
      const num = d === 0 ? 'LEVEL' : n0(Math.abs(d));
      /* EARLY IN A RUN THE DIFFERENCE IS NOISE, and it can be negative — six
         casualties in, one unlucky draw is the whole margin. The number is
         printed anyway, because suppressing it would be a lie by omission,
         but it is printed with what it rests on. The threshold is the size
         of the RESOLVED survivable cohort, not the clock: a quiet first hour
         and a violent first ten minutes are different runs. */
      const settled = S.A.casualties.filter(c =>
        c.outcome !== null && COUNT.SURVIVABLE(c)).length;
      const early = settled < 10;
      const unit = (d === 0
        ? 'with current triage and proximity on wounds that could have been survived'
        : '<b>' + (d > 0 ? 'fewer' : 'more') + ' dead</b> of survivable wounds than current triage and proximity') +
        (early ? ' &mdash; <em style="font-style:normal;color:var(--faint)">too early to read, ' +
                 settled + ' of the cohort resolved</em>' : '');
      const tot = Math.max(1, S.dead + S.deadB);
      s1 = '<div class="dsSlot"><div class="dsK">AM I WINNING</div>' +
        '<div class="dsBig"><span class="dsNum ' + cls + '"' +
          (d === 0 ? ' style="font-size:26px"' : '') + '>' + num + '</span>' +
        '<span class="dsUnit">' + unit + '</span></div>' +
        '<div class="dsCmp"><span class="dsBar">' +
          '<i class="a" style="width:' + (S.dead / tot * 100).toFixed(1) + '%"></i>' +
          '<i class="b" style="width:' + (S.deadB / tot * 100).toFixed(1) + '%"></i></span></div>' +
        '<div class="dsLg"><span><i class="a"></i>ANGEL SWARM ' + n0(S.dead) + '</span>' +
        '<span><i class="b"></i>CURRENT — TRIAGE & PROXIMITY ' + n0(S.deadB) + '</span></div></div>';
    }

    /* ---- 2 · does anything need me ---------------------------------- */
    let s2;
    if (S.pending > 0) {
      const age = oldestPending(S.A, S.now);
      s2 = '<div class="dsSlot act"><span class="dsPulse"></span>' +
        '<div class="dsK">DOES ANYTHING NEED ME</div>' +
        '<div class="dsBig"><span class="dsNum act">' + n0(S.pending) + '</span>' +
        '<span class="dsUnit">' + (S.pending === 1 ? 'decision' : 'decisions') +
        ' waiting on you' + (age == null ? '' : ' &middot; oldest <b>' + agoTxt(age) + '</b>') +
        '</span></div>' +
        '<button class="dsBtn" data-cmd="go:TASKING">Decide now  &rarr;</button></div>';
    } else if (!deployed) {
      /* Before deployment nothing can be proposed, so "0 waiting" would be
         technically true and completely uninformative. Say why it is zero. */
      s2 = '<div class="dsSlot"><div class="dsK">DOES ANYTHING NEED ME</div>' +
        '<div class="dsQuiet">Nothing needs you.</div>' +
        '<div class="dsSub">Nothing can be proposed until it flies.</div></div>';
    } else {
      /* What "nothing is waiting" actually rests on differs with the policy,
         and printing an auto-approval count while the policy is autonomous
         would be printing a number that cannot move. */
      const sub = S.A.hitl
        ? '<b>' + n0(S.auto) + '</b> launched on standing authority &middot; <b>' +
          n0(S.expired) + '</b> expired unactioned.'
        : '<b>' + n0(COUNT.sorties(S.A)) + '</b> flown on standing authority.';
      s2 = '<div class="dsSlot"><div class="dsK">DOES ANYTHING NEED ME</div>' +
        '<div class="dsQuiet">Nothing needs you.</div>' +
        '<div class="dsSub">' + sub + '</div>' +
        '<button class="dsBtn q" data-cmd="go:TASKING">Review what launched  &rarr;</button></div>';
    }

    /* ---- 3 · what is about to go wrong ------------------------------ */
    const soon = S.outOfTime + S.nearly;
    let s3;
    if (!soon) {
      s3 = '<div class="dsSlot"><div class="dsK">WHAT IS ABOUT TO GO WRONG</div>' +
        '<div class="dsQuiet">Nobody is inside fifteen minutes.</div>' +
        '<div class="dsSub"><b>' + n0(S.open.length) + '</b> still on the ground.</div></div>';
    } else {
      const reach = S.noReach;
      s3 = '<div class="dsSlot"><div class="dsK">WHAT IS ABOUT TO GO WRONG</div>' +
        '<div class="dsBig"><span class="dsNum ' + (S.outOfTime ? 'bad' : 'flat') + '">' + n0(soon) + '</span>' +
        '<span class="dsUnit">past decompensation, or inside fifteen minutes of it</span></div>' +
        '<div class="dsSub">' +
        (reach
          ? '<b>' + n0(reach) + '</b> unreachable from the launch points as they stand &mdash; a ' +
            'laydown question, not a tasking one.'
          : 'All inside the reach of at least one aircraft.') +
        '</div>' +
        (reach ? '<button class="dsBtn q" data-cmd="go:MISSION">Look at the laydown  &rarr;</button>' : '') +
        '</div>';
    }

    paint(el, s1 + s2 + s3);
  }

  /* ============================== DECIDE ================================ */

  function blockSituation(S) {
    const D = APP.deploy;
    const where = esc(S.scn.name);
    const sent = S.dep.k === 'DEPLOYED'
      ? `flying since ${fmtT(D.tComplete || 0)} — ${D.airframes} aircraft, ` +
        `${D.launchPoints} launch ${plural(D.launchPoints, 'point')}`
      : S.dep.k === 'DEPLOYING'
        ? 'coming online now'
        : 'not sent — this fight is being run the way it is run today';
    /* The reconciliation sentence rather than one of the two numbers on its
       own: this line sits above a table that carries the all-categories
       figure and a headline that carries the survivable one, and printing
       either alone here is what made a reader believe they were the same
       quantity disagreeing. COUNT writes the sentence so it cannot drift. */
    const body = !S.started
      ? `Nothing has happened yet.`
      : `${n0(S.cas.length)} wounded so far, ${n0(S.open.length)} still on the ground. ` +
        esc(COUNT.deathBridge(S.A));
    return `<div class="cqSit">
      <span class="cqWhen">${where} · ${fmtT(S.now)}</span>
      <span>${body} <em>${sent}</em></span>
    </div>`;
  }

  function blockDecision(S) {
    const D = APP.deploy;
    /* NOT DEPLOYED is the outstanding decision, and the thing that makes it
       urgent is not rhetoric — it is that both columns of the comparison are
       the same number and will stay the same number until somebody acts. */
    if (S.dep.k !== 'DEPLOYED') {
      const deploying = S.dep.k === 'DEPLOYING';
      /* "N of them died in the last ten minutes" named no population and had
         no antecedent — the reader was left to guess whether it was the
         survivable cohort or the whole toll. It is the survivable cohort. */
      const cost = S.recent
        ? `<b>${n0(S.recent)} ${plural(S.recent, 'soldier has', 'soldiers have')} died of wounds
           they could have survived in the last ten minutes.</b> `
        : (S.started ? 'Nobody has died of a survivable wound in the last ten minutes. ' : '');
      return `<div class="cqDecide pending">
        <div>
          <div class="cqKick">${deploying ? 'DECISION MADE — AIRCRAFT COMING ONLINE' : 'OUTSTANDING DECISION'}</div>
          <h3 class="cqHead">${deploying ? 'ANGEL SWARM is deploying.' : 'ANGEL SWARM is not deployed.'}</h3>
          <div class="cqFigs">
            <div class="cqFig"><b>${n0(S.dead)}</b>
              <span>${DIED_SURV_LONG}</span></div>
            <span class="cqRule"></span>
            <div class="cqFig sm"><b>${n0(S.deadB)}</b>
              <span>${DIED_SURV}, THE SAME FIGHT WITHOUT ANGEL SWARM</span></div>
            <span class="cqRule"></span>
            <div class="cqFig sm lo"><b>0</b>
              <span>FEWER ${DIED_SURV}, BECAUSE NOTHING HAS BEEN SENT</span></div>
          </div>
          <p class="cqSay">${cost}Identical until the aircraft are sent. Deferring is itself the
            decision, and it is being taken every minute it is not made.
            <span class="cqZero">THE TARGET IS ZERO</span></p>
        </div>
        <div class="cqAct">
          <button class="btn ok" data-deploy="1">Send the drones →</button>
          <span class="cqSub">Opens the launch-point selection. Nothing flies until you commit it.</span>
        </div>
      </div>`;
    }

    /* DEPLOYED. One number, the arithmetic beside it, and the honest note
       that the deaths before the decision are in both columns. */
    /* COUNT.SURVIVABLE, not a local copy. The horizon here is deliberately
       NOT COUNT.clock(): this is not "what has happened yet", it is "what had
       already happened when the decision was taken", and that boundary is the
       minute the deployment completed. */
    const before = APP.armA.casualties.filter(c =>
      c.outcome === 'DIED' && COUNT.SURVIVABLE(c) && c.tResolved != null &&
      c.tResolved <= (D.tComplete || 0)).length;
    /* The figure under this caption is survivable deaths, both columns. Bare
       "FEWER DEAD" over it read as the whole toll and understated the
       operation by eight in the reference run. */
    const word = S.delta > 0 ? 'FEWER ' + DIED_SURV
      : S.delta < 0 ? 'MORE ' + DIED_SURV : 'LEVEL ON SURVIVABLE WOUNDS';
    return `<div class="cqDecide">
      <div>
        <div class="cqKick">DECISION TAKEN ${fmtT(D.tComplete || 0)} · ${D.airframes} AIRCRAFT ·
          ${D.launchPoints} LAUNCH ${plural(D.launchPoints, 'POINT', 'POINTS')} ${ai('AUTONOMOUS', 'the aircraft are tasked by the system, under your standing authority')}</div>
        <h3 class="cqHead">ANGEL SWARM is flying, and this is what it has changed.</h3>
        <div class="cqFigs">
          <div class="cqFig ${S.delta > 0 ? 'lo' : ''}"><b>${n0(Math.abs(S.delta))}</b><span>${word}</span></div>
          <span class="cqRule"></span>
          <div class="cqFig sm"><b>${n0(S.dead)}</b><span>${DIED_SURV}, WITH ANGEL SWARM</span></div>
          <span class="cqRule"></span>
          <div class="cqFig sm"><b>${n0(S.deadB)}</b><span>${DIED_SURV}, THE WAY IT IS DONE TODAY</span></div>
        </div>
        <p class="cqSay">${before
          ? `<b>${n0(before)} ${plural(before, 'soldier')} died of wounds they could have survived before
             you sent them</b>, and that number is in both columns — no tasking decision could reach back
             for it. `
          : ''}Both figures are the survivable cohort. Every number here is a person.
          <span class="cqZero">THE TARGET IS ZERO</span></p>
      </div>
      <div class="cqAct">
        <button class="btn" data-cmd="recall">Call the drones back</button>
        <span class="cqSub">Recall is logged with the minute you ordered it, like the deployment was.</span>
      </div>
    </div>`;
  }

  function blockCounts(S) {
    const openN = S.open.length;
    const timeN = S.outOfTime + S.nearly;
    const reachN = S.noReach + S.oneReach;
    /* One source for the coverage figure, and it is the same coverageGaps()
       the theatre pane's alert bar reads, so the two screens cannot disagree
       about how many soldiers are outside the reach of the force. The count
       is over the whole engagement; how many of them are still on the ground
       is said in the sentence under it rather than replacing it. */
    const cov = S.cov || { thin: 0, none: 0, died: 0, diedSurvivable: 0, where: null };
    const where = cov.where ? esc(cov.where) : null;
    return `<div class="cqCounts">
      <div class="cqCount">
        <h4>STILL ON THE GROUND</h4>
        <div class="cqN"><b class="calm">${n0(openN)}</b>
          <i>wounded, not yet treated or resolved</i></div>
        <p>${openN
          ? `of ${n0(S.cas.length)} wounded so far`
          : (S.started ? 'all resolved' : 'the mission has not started')}</p>
      </div>
      <div class="cqCount">
        <h4>OUT OF TIME, OR NEARLY</h4>
        <div class="cqN"><b class="${S.outOfTime ? 'toll' : timeN ? 'warn' : 'calm'}">${n0(timeN)}</b>
          <i>${S.outOfTime ? n0(S.outOfTime) + ' already past it' : 'none past it yet'}</i></div>
        <p>${openN
            ? `<b>${n0(S.nearly)}</b> inside the decompensation window now`
            : 'nobody on that clock'}</p>
      </div>
      <div class="cqCount">
        <h4>NOBODY CAN REACH</h4>
        <div class="cqN"><b class="${cov.died ? 'toll' : cov.thin ? 'warn' : 'calm'}">${n0(cov.thin || 0)}</b>
          <i>${cov.none ? n0(cov.none) + ' with no aircraft at all in range' : 'one aircraft or none in range'}</i></div>
        <p>${where ? `mostly at <b>${where}</b>` : ''}${cov.died
            ? `${where ? ' &middot; ' : ''}<b>${n0(cov.died)}</b> died there, <b>${n0(cov.diedSurvivable || 0)}</b>
               of survivable wounds` : ''}${
            reachN ? ` &middot; <b>${n0(reachN)}</b> still on the ground` : ''
          }${where || cov.died || reachN ? '' : 'a laydown question, not a tasking one'}</p>
      </div>
    </div>`;
  }

  function blockAuthority(S) {
    const policy = APP.hitl
      ? `A person is asked whenever the system is not confident. Also whenever a route crosses a
         threat envelope, whenever a launch point would be spent down to its last unit of blood or
         plasma, and whenever a lower-priority casualty would be served while an IMMEDIATE is still
         unassigned. Everything else launches under your standing authority and is logged.`
      : `Dispatching without asking. Every dispatch is in the audit log with the reasoning that
         produced it.`;
    return `<div class="cqAuth">
      <div class="cqAuthCell"><b>${n0(S.auto)}</b><span>LAUNCHED ON STANDING AUTHORITY</span></div>
      <div class="cqAuthCell"><b class="${S.pending ? 'warn' : ''}">${n0(S.pending)}</b><span>WAITING ON YOU NOW</span></div>
      <div class="cqAuthCell"><b class="${S.expired ? 'bad' : ''}">${n0(S.expired)}</b><span>EXPIRED — NOBODY ANSWERED</span></div>
      <div class="cqAuthCell cqAuthNote">${ai('AUTONOMOUS', 'the escalation grounds are evaluated by the system on every tasking pass')}
        <b>${APP.hitl ? 'Human-in-the-loop.' : 'Autonomous dispatch.'}</b>
        <span class="cqPolicy" data-fold-label="when it asks">${policy}</span>
        ${S.pending ? ` <a href="#" data-cmd="go:TASKING">Open the queue →</a>` : ''}</div>
    </div>`;
  }

  /* Supporting block one. The theatre-wide ranking, worst first, with the
     button that sends the capability somewhere. Five columns, not eight: a
     commander picks a place, he does not audit a spreadsheet. */
  function blockOperations() {
    const roll = G('theaterRoll'), score = G('needScore');
    const TH = (typeof THEATERS !== 'undefined') ? THEATERS : null;
    if (!roll || !score || !TH) return '';
    const all = Object.keys(TH).flatMap(k => {
      const r = roll(k);
      return r.rows.map(x => ({ ...x, theater: r.th }));
    }).sort((a, b) => score(b.st) - score(a.st)).slice(0, 6);
    const dep = APP.deploy.state === 'DEPLOYED';
    /* An operation in another combatant command is shown, because the scale of
       the problem is the point, and it is never actionable, because PACOM's
       medical aircraft do not fly to EUCOM. joaActionHTML() decides which of
       the three it is; it is the same control in all three places a JOA row
       is drawn, so they cannot drift apart again. */
    const act = G('joaActionHTML');
    const mine = G('inCurrentTheater');
    const rows = all.map(({ joa, st, theater }) => {
      const here = st.active;
      const flying = here && dep;
      const ours = mine ? mine(joa.key) : true;
      return `<tr class="${flying ? 'here' : ''}${ours ? '' : ' otherTheater'}">
        <td><b class="mono">${esc(joa.name.replace('JOA ', ''))}</b>
            <span class="dim"> · ${esc(theater.key)}</span></td>
        <td class="mono">${n0(st.open)}</td>
        <td class="mono ${st.died ? 'bad' : 'dim'}">${n0(st.died)}</td>
        <td>${(G('pill') || (t => t))(st.level, st.level === 'GREEN' ? 'ok' : st.level === 'AMBER' ? 'warn' : 'bad')}</td>
        <td class="act">${act ? act(joa.key, here, dep)
          : `<button class="mini" data-joa="${esc(joa.key)}">Open →</button>`}</td>
      </tr>`;
    }).join('');
    return `<div class="card">
      <div class="cardHead">Every operation, worst first</div>
      <table class="cqTable"><thead><tr>
        <th>Operation</th><th style="width:92px">Still down</th>
        <!-- This column is st.died: every death in that operation, every
             triage category, including the operations ANGEL SWARM is not
             flying in. It is NOT the survivable-cohort figure the headline
             above carries, and under the bare word "Dead" a reader compared
             the two and found this application disagreeing with itself. Same
             treatment as the analyst's DASHBOARD table, which is the other
             place this quantity is shown. -->
        <!-- 132px is what "Died of wounds" measures on one line in this face at
             this size. The width is a preferred width, not a floor — the header
             now wraps and the column compresses below this when the card is
             narrow — so it is set to the width the heading wants rather than to
             a number that has to sum with the other four. -->
        <th style="width:132px">Died of wounds<br><span class="thSub">all categories</span></th>
        <th style="width:88px">State</th>
        <th style="width:150px"></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="empty">No operations reporting.</td></tr>'}</tbody>
      </table>
    </div>`;
  }

  /* Supporting block two. The standing order — the one thing on this screen
     that is configuration rather than observation, and it is a commander's
     configuration: under what conditions the system is to interrupt him. */
  function blockStandingOrder(S) {
    const T = APP.thresholds || {};
    const alert = APP.alert;
    return `<div class="card">
      <div class="cardHead">Tell me when an operation needs help</div>
      <div class="cqBody">
        <div class="cqSet">
          <span class="chip ${T.armed ? 'on' : ''}" data-cmd="armed">${T.armed ? 'ARMED' : 'NOT ARMED'}</span>
          <span>${T.armed
            ? 'The system is watching every operation and will interrupt you.'
            : 'Nothing will interrupt you. You will have to come and look.'}</span>
        </div>
        <p>It interrupts on three grounds: more than <b>${n0(T.casPerHour)}</b> casualties an hour,
          <b>${n0(T.critical)}</b> or more soldiers predicted to lose the ability to compensate for
          blood loss, or any unit falling to <b>${esc(T.readiness || 'AMBER')}</b> combat
          effectiveness or below.</p>
        ${alert
          ? `<p><b>${esc(alert.title)}.</b> ${esc(alert.detail)}</p>
             <div class="cqTools"><button class="btn ok" data-deploy="1">Review and deploy →</button></div>`
          : `<p class="dim">${S.dep.k === 'DEPLOYED'
              ? 'No threshold has tripped since the aircraft were sent.'
              : 'No threshold has tripped. Nothing is asking for your attention.'}</p>`}
      </div>
    </div>`;
  }

  /* ========================= ORDER OF BATTLE ============================
     An aircraft belongs to a launch point. A launch point belongs to one
     joint operations area. A joint operations area belongs to one combatant
     command. That is the whole ownership model and it is drawn here rather
     than described, because "7 airframes" on its own reads as a pool and a
     pool is exactly what this is not.

     Reinforcement is offered because a commander's first instinct in front
     of this screen is to ask for more aircraft, and the honest answer — that
     more aircraft barely move the toll, and moving a launch point forward
     does — is worth a great deal more when he has just watched it happen
     than when a caption asserts it.                                       */

  const bulkQty = { HEAVY: 0, LIGHT: 0, LONG: 0 };
  const PACKAGES = [
    { key: 'LITTORAL', name: 'LITTORAL LIGHT', add: { LIGHT: 2, HEAVY: 4, LONG: 1 },
      why: 'the mixed laydown a littoral regiment fields today' },
    { key: 'REACH', name: 'BLUE-WATER REACH', add: { HEAVY: 2, LONG: 3 },
      why: 'buys radius, not payload — for casualties across open water' },
    { key: 'SURGE', name: 'MASCAL SURGE', add: { HEAVY: 8 },
      why: 'maximum slots, minimum reach — for a mass casualty close in' }
  ];

  function blockOrbat(S) {
    const A = S.A;
    const scnName = esc(S.scn.name);
    const thKey = esc(APP.theaterKey || '');
    const joa = esc((S.scn.joa || '').replace('JOA ', ''));

    const lps = A.bases.map((b, i) => {
      const mine = A.drones.filter(d => d.baseIdx === i);
      const ready = mine.filter(d => d.state === 'IDLE' && !d.held).length;
      const chips = mine.map(d => {
        const tail = tailOf(d);
        const busy = d.state !== 'IDLE' || d.route.length;
        return '<span class="cqTail' + (busy ? ' busy' : '') + '">' +
          '<b>' + esc(tail) + '</b><em>' + esc(d.plat.label) + '</em>' +
          (busy ? '<u class="off" title="' + esc(tail) + ' is on a sortie and cannot be removed">·</u>'
                : '<u data-cmd="rmac:' + d.id + '" title="Remove ' + esc(tail) +
                  ' from ' + esc(b.name) + ', in both arms">&times;</u>') +
          '</span>';
      }).join('');
      const blood = b.stock.BLOOD;
      return '<div class="cqLp">' +
        '<div class="cqLpH"><b>' + esc(b.name) + '</b>' +
        '<span class="cqLpE">' + (S.scn.bases[i] && S.scn.bases[i].afloat ? 'afloat' : 'ashore') + '</span>' +
        '<span class="cqLpR">' + ready + '<i>/' + mine.length + ' ready</i></span></div>' +
        '<div class="cqTails">' + (chips || '<span class="cqNone">no aircraft here</span>') + '</div>' +
        '<div class="cqAdd">' +
          Object.keys(PLATFORMS).map(function (k) {
            return '<button class="cqAddB" data-cmd="addac:' + k + ':' + i + '" title="Add one ' +
              esc(PLATFORMS[k].label) + ' to ' + esc(b.name) + ' — given to both arms">+ ' +
              esc(PLATFORMS[k].label) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="cqLpF"><b class="' + (blood <= 1 ? 'amb' : '') + '">' + blood +
        ' u</b> whole blood · <b>' + b.stock.PLASMA + ' u</b> plasma</div>' +
      '</div>';
    }).join('');

    const total = bulkQty.HEAVY + bulkQty.LIGHT + bulkQty.LONG;
    const steppers = Object.keys(PLATFORMS).map(function (k) {
      const P = PLATFORMS[k];
      return '<div class="cqStep"><span class="cqStepN"><b>' + esc(P.label) + '</b>' +
        '<span>' + P.speedKmh + ' km/h · ' + P.radiusKm + ' km radius at full load, ' +
        P.maxRadiusKm + ' km ferry · ' + P.payloadKg + ' kg · ' + P.slots + ' slots</span></span>' +
        '<span class="cqStp"><button data-cmd="bulk:' + k + ':-1" aria-label="one fewer">&minus;</button>' +
        '<i>' + bulkQty[k] + '</i>' +
        '<button data-cmd="bulk:' + k + ':1" aria-label="one more">+</button></span></div>';
    }).join('');

    return '<div class="card cqOrbat">' +
      '<div class="cardHead">YOUR ORDER OF BATTLE — ' + thKey + ' &rsaquo; JOA ' + joa +
      '<span class="proj">an aircraft belongs to a launch point · a launch point belongs to one JOA</span></div>' +
      '<div class="cqOrbatB">' +
        '<div class="cqLps">' + lps + '</div>' +
        '<div class="cqBulk">' +
          '<div class="cqBulkL">' +
            '<div class="cqSubH">ADD IN BULK — SPREAD ACROSS ALL ' + A.bases.length + ' LAUNCH POINTS</div>' +
            steppers +
            '<div class="cqBulkA">' +
              '<button class="mini ok" data-cmd="dist"' + (total ? '' : ' disabled') + '>' +
                (total ? 'Add ' + total + ' airframe' + (total === 1 ? '' : 's') +
                         ' across ' + A.bases.length + ' launch points  &rarr;'
                       : 'Choose how many first') + '</button>' +
              (total ? '<button class="mini" data-cmd="bulkclear">Clear</button>' : '') +
            '</div>' +
          '</div>' +
          '<div class="cqBulkR">' +
            '<div class="cqSubH">OR APPLY A FORCE PACKAGE</div>' +
            PACKAGES.map(function (pk) {
              const parts = Object.keys(pk.add).map(function (k) {
                return pk.add[k] + '\u00d7 ' + PLATFORMS[k].label; }).join(' · ');
              return '<button class="cqPkg" data-cmd="pkg:' + pk.key + '">' +
                '<b>' + esc(pk.name) + '</b><span>' + esc(parts) + ' — ' + esc(pk.why) + '</span></button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="cqFair"><span class="cqFairK">FAIRNESS</span>' +
        '<p>Every aircraft you add is given to <b>both arms</b>. Current triage and proximity flies the same fleet ' +
        'from the same launch points, so the difference that remains is the tasking decision and ' +
        'nothing else. Add aircraft and watch how little the toll moves; then move a launch point ' +
        'forward and watch what does.</p></div>' +
        '' +
      '</div></div>';
  }

  function pad2(v) { return ('0' + v).slice(-2); }
  /* CALLSIGN lives in map.js — a rendering module — and is a top-level const,
     so it never becomes a property of the global object and cannot be read
     from here. optimizer.js restates the same three strings for the same
     reason. Three strings duplicated is cheaper than this pane reaching into
     a module it has no business depending on, and a future edit that changes
     them will fail loudly on the next screenshot rather than silently. */
  const TAIL = { HEAVY: 'TRV', LIGHT: 'M25', LONG: 'FVR' };
  function tailOf(d) { return (TAIL[d.type] || d.type) + '-' + pad2(d.id); }

  /* Add n aircraft of a type to one launch point, in both arms, and write it
     to the audit. `where` is null for a bulk spread, which names the spread
     rather than each landing. */
  function addAircraft(typeKey, baseIdx, n) {
    const add = G('addAirframeToBoth'), aud = G('audit'), render = G('render'), t = G('toast');
    if (!add || !APP.armA) return 0;
    let made = 0, tails = [];
    for (let i = 0; i < n; i++) {
      const r = add(APP.armA, APP.armB, typeKey, baseIdx);
      if (!r) break;
      made++;
      tails.push((TAIL[typeKey] || typeKey) + '-' + pad2(r.id));
    }
    if (!made) return 0;
    const lp = APP.armA.bases[baseIdx];
    if (aud) aud(APP.armA, APP.t, 'COMMANDER', 'REINFORCE',
      made + ' × ' + PLATFORMS[typeKey].label + ' added to ' + lp.name +
      ' — given to both arms so the comparison stays level',
      { launchPoint: lp.name, platform: PLATFORMS[typeKey].label, count: made, tails: tails });
    if (t) t(made + ' airframe' + (made === 1 ? '' : 's') + ' added',
             tails.join(', ') + ' at ' + lp.name + '. Current triage and proximity has the same aircraft.', 'ok');
    if (render) { APP._paneForce = true; render(); }
    return made;
  }

  /* Spread the stepper quantities round-robin across the launch points, so
     two aircraft across three sites go to the first two rather than both to
     the first. A commander asking for reinforcement means the force, not one
     FARP; sending them all to one place is a different decision and the
     per-launch-point buttons above are how to make it. */
  function distributeBulk() {
    const n = APP.armA ? APP.armA.bases.length : 0;
    if (!n) return;
    let cursor = 0, total = 0;
    Object.keys(bulkQty).forEach(function (k) {
      for (let i = 0; i < bulkQty[k]; i++) {
        total += addAircraft(k, cursor % n, 1);
        cursor++;
      }
    });
    Object.keys(bulkQty).forEach(function (k) { bulkQty[k] = 0; });
    const render = G('render');
    if (render) { APP._paneForce = true; render(); }
    return total;
  }

  function applyPackage(pk) {
    const n = APP.armA ? APP.armA.bases.length : 0;
    if (!n) return;
    let cursor = 0;
    Object.keys(pk.add).forEach(function (k) {
      for (let i = 0; i < pk.add[k]; i++) { addAircraft(k, cursor % n, 1); cursor++; }
    });
    const render = G('render');
    if (render) { APP._paneForce = true; render(); }
  }

  function renderDecide() {
    const host = document.getElementById('decideBody');
    if (!host) return;
    const S = situation();
    if (!S) {
      paint(host, `<p class="lede">The mission has not been built yet. This pane populates as soon as
        the simulation is loaded.</p>`);
      return;
    }
    paint(host, [
      blockSituation(S),
      blockDecision(S),
      blockCounts(S),
      blockAuthority(S),
      blockOrbat(S),
      `<div class="cqSupport">${blockOperations()}${blockStandingOrder(S)}</div>`
    ].join(''));
  }

  /* =============================== COST ================================= */
  /* Composed, not recomputed. The ROI pane's aggregate is the same object
     this reads, so pressing "Measure across 35 runs" on either pane moves
     both, and the requirement analysis rendered here is the same APP.req the
     evidence pane draws. Two screens, one arithmetic. */

  function costBar(label, a, b, unit) {
    const max = Math.max(a, b, 0.0001);
    return `<div class="cqBar">
      <span class="cqK">${label}</span>
      <span class="cqTrack"><i class="a" style="width:${Math.max(1, a / max * 100)}%"></i>
        <i class="b" style="width:${Math.max(1, b / max * 100)}%"></i></span>
      <b>${n1(a)}</b><b class="dim">${n1(b)}</b>
      <span class="cqU">${unit} per 1 000</span>
    </div>`;
  }

  /* The procurement finding. Three sources, in order of how much they cost to
     produce, and the first one that exists is used. All three say the same
     thing in this model and it is worth saying plainly: the tasking decides
     an order, and an order only matters when the force is short of something.
     What it is short of is launch points, not airframes. */
  function findingSensitivity() {
    const causes = G('deathCauses');
    const cz = (causes && APP.armA && APP.armA.casualties.length) ? causes(APP.armA) : null;
    const mc = (window.ANGEL && ANGEL.get) ? ANGEL.get('montecarlo') : null;
    const mcState = (mc && mc.state) ? mc.state() : null;
    const sweep = mcState && mcState.sweep && mcState.sweep.points &&
                  mcState.sweep.points.some(p => p.stats) ? mcState.sweep : null;
    const req = APP.req && APP.req.rows && APP.req.rows.length >= 2 ? APP.req : null;

    let lead = '', body = '';

    if (cz && cz.total) {
      lead = n0(cz.noLaunchPoint);
      body = `<p>Of the <b>${n0(cz.total)}</b> who died of survivable wounds in this engagement,
        <b>${n0(cz.noLaunchPoint)}</b> had no launch point close enough to reach them and
        <b>${n0(cz.noResponder)}</b> had nobody on scene qualified to administer what they needed.
        <b>${n0(cz.busy)}</b> died because every aircraft was committed elsewhere — and that last
        number is the only one a larger fleet would have touched.
        <em>Buying airframes buys down ${n0(cz.busy)} of ${n0(cz.total)}. Moving a launch point
        forward addresses ${n0(cz.noLaunchPoint)}.</em></p>`;
    } else {
      lead = '—';
      body = `<p>No deaths have been attributed yet, so there is nothing to decompose. Run the mission
        and this decomposes the toll into the five reasons a soldier died — and names which of them
        more aircraft would have touched.</p>`;
    }

    if (req) {
      const base = req.rows[0];
      const row = lbl => req.rows.find(r => r.label === lbl);
      const dbl = row('Twice the aircraft, same launch points');
      const fwd = row('One more launch point, forward');
      /* req.rows[].deaths is survivableDeaths — the same population the
         evidence pane's own column heads "Died of survivable wounds". Said
         out loud here, because "the death count" on its own is one of three
         numbers and the reader cannot tell which from the sentence. */
      const bits = [];
      if (dbl) bits.push(`doubling the aircraft ${dbl.deaths === base.deaths ? 'changed it by nothing at all'
        : 'moved it by ' + n0(Math.abs(dbl.deaths - base.deaths))}`);
      if (fwd) bits.push(`one more launch point, sited forward, ${fwd.deaths === base.deaths ? 'changed nothing'
        : 'moved it by ' + n0(Math.abs(fwd.deaths - base.deaths))}`);
      if (bits.length) body += `<p><b>Re-flown against the same casualties, counting the dead of
        survivable wounds:</b> ${bits.join(', and ')}.
        Each of those is a full re-run of this operation with one constraint relaxed, not an estimate.</p>`;
    }

    if (sweep) {
      /* The replication engine reports the paired difference as ANGEL SWARM
         minus the way it is done today, so a negative mean is fewer dead.
         Flipped here once, where it is visible, rather than in four places
         downstream. */
      const pts = sweep.points.filter(p => p.stats);
      const lo = pts[0], hi = pts[pts.length - 1];
      const fewer = p => -p.stats.mean;
      const names = { fleet: 'fleet size', launch: 'launch points', comms: 'datalink outage' };
      const span = Math.abs(fewer(hi) - fewer(lo));
      body += `<p><b>Re-run ${n0(mcState.sweepReps || 0)} times at each point, sweeping
        ${esc(names[sweep.lever] || sweep.lever)}:</b> at ${n1(lo.value)} ${esc(sweep.unit || '')}
        the mean was ${n1(fewer(lo))} fewer dead of survivable wounds; at ${n1(hi.value)} it was
        ${n1(fewer(hi))}.
        ${span < 1 ? 'The entire swept range moves the toll by less than one soldier.'
                   : 'That is a span of ' + n1(span) + ' across the whole range tested.'}</p>`;
    }

    const tools = [];
    if (G('runRequirements') && !req)
      tools.push(`<button class="btn" data-cmd="req">Re-fly it with more aircraft, and with a forward launch point</button>`);
    if (!sweep && document.querySelector('[data-pane="CONFIDENCE"]'))
      tools.push(`<button class="btn" data-cmd="go:CONFIDENCE">How much of this is the seed? →</button>`);

    return `<div class="card">
      <div class="cardHead">What actually moves the number ${ai('DERIVED', 'attributed per casualty from the same run the death count comes from')}</div>
      <div class="cqBody">
        <div class="cqFind"><span class="cqFindN">${lead}</span><div>${body}</div></div>
        <p class="cqCite" data-fold-label="why this is the procurement question">Fleet size is the
          easy thing to buy and it is not what this model is short of. Combat radius falls as payload
          rises, so a casualty outside every launch point's radius stays outside it however many
          aircraft are bought; the same casualty comes inside it the moment one launch point moves
          forward. The tasking decides an order, and an order only matters while the force is short
          of something.</p>
        ${tools.length ? `<div class="cqTools">${tools.join('')}</div>` : ''}
      </div>
    </div>`;
  }

  function renderCost() {
    const host = document.getElementById('costBody');
    if (!host) return;
    const agg = G('roiAggregate');
    const R = agg ? agg() : null;
    const rates = (typeof ROI_RATES !== 'undefined') ? ROI_RATES : { bloodAcq: 250, bloodMult: 3.2, uh60Hr: 4364 };

    /* No run yet. The pane still renders in full — an empty pane on arrival
       is the defect this application was audited for, eight times over — and
       it says plainly that the figures are zero because nothing has flown. */
    if (!R) {
      paint(host, `
        <div class="cqLine">
          <span class="cqLead flat">—</span>
          <span class="cqTxt">Nothing has been flown yet.
            <em>Press play on the command bar, or measure this across thirty-five engagements now.</em></span>
        </div>
        <div class="card">
          <div class="cardHead">What this pane will show</div>
          <div class="cqBody">
            <p>Three resource claims, measured from the same run as the death count and normalised per
              1 000 casualties: the blood that was not destroyed, the evacuation demand that was not
              created, and the flying that was not done. Then the one finding that bears on a
              resourcing conversation — what actually moves the death count — and the limits of all
              of it.</p>
            <div class="cqTools">
              <button class="btn ok" data-cmd="roi">Measure across 35 engagements</button>
              <button class="btn" data-cmd="play">Run this mission</button>
            </div>
          </div>
        </div>
        ${findingSensitivity()}
        ${blockLimits(null, rates)}`);
      return;
    }

    const per = R.per;
    const pct = (a, b) => b ? (b - a) / b * 100 : 0;
    const bloodSaved = R.bloodLost[1] - R.bloodLost[0];
    const bloodUSD = bloodSaved * rates.bloodAcq * rates.bloodMult;
    const perK = R.casN ? bloodUSD / R.casN * 1000 : 0;
    const hoursSaved = R.hours[1] - R.hours[0];
    const dead = R.deaths[0], base = R.deaths[1], delta = base - dead;
    const scope = R.wide ? `${n0(R.runs)} engagements` : 'this engagement';

    paint(host, `
      <div class="cqLine">
        <span class="cqLead ${delta > 0 ? '' : 'flat'}">${n0(Math.abs(delta))}</span>
        <span class="cqTxt">${delta > 0 ? 'fewer dead of wounds they could have survived'
          : delta < 0 ? 'more dead of wounds they could have survived'
          : 'level on wounds that could have been survived'} —
          <b>${n0(dead)}</b> against <b>${n0(base)}</b>
          <em>across ${scope}, ${n0(R.casN)} casualties</em></span>
        <span class="cqZero">THE TARGET IS ZERO</span>
      </div>

      <div class="cqBand">
        <!-- R.deaths is COUNT.deathsSurvivable for both arms. "PREVENTABLE"
             was a fourth word for that population, used nowhere else in the
             application; the label now matches COUNT.LABEL. -->
        <div class="cqBandFig"><b>${n1(Math.abs(pct(R.deaths[0], R.deaths[1])))}%</b>
          <span>FEWER ${DIED_SURV} — THE REASON TO DO IT, NOT THE ARGUMENT THAT WINS</span></div>
        <span class="cqRule"></span>
        <div>
          <p style="margin:0 0 9px; font:400 12px/1.65 var(--sans); color:var(--dim); max-width:88ch">
            <b style="color:var(--text)">What the capability costs.</b> This is a tasking decision
            over aircraft the force already holds, not a new fleet: the airframes, the blood and the
            launch points are identical in both columns, and the only difference is who decides where
            an aircraft goes. What it returns is measured below in the units the force actually runs
            short of, and translated into dollars only where a published rate exists.</p>
          <div class="cqTools">
            <button class="btn" data-cmd="roi">${R.wide ? 'Re-measure across 35 engagements' : 'Measure across 35 engagements'}</button>
            <button class="btn" data-cmd="go:ROI">The full argument, with citations →</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="cardHead">What it returns, per 1 000 casualties</div>
        <div class="cqBody">
          <!-- Every label here is COUNT.LABEL's, because every figure here is
               COUNT's. R.ok in particular is the count of delivery-log entries
               that succeeded — payloads administered — and it was labelled
               "Casualties stabilised where they fell", which is a different
               noun and a smaller population: a casualty can be administered a
               payload and die of the wound anyway. -->
          <div class="cqBars">
          ${costBar(COUNT.LABEL.BLOOD_DESTROYED, per(R.bloodLost[0]), per(R.bloodLost[1]), 'units')}
          ${costBar(COUNT.LABEL.BLOOD_FORWARD, per(R.bloodFwd[0]), per(R.bloodFwd[1]), 'units')}
          ${costBar(COUNT.LABEL.ADMINISTERED, per(R.ok[0]), per(R.ok[1]), 'payloads')}
          ${costBar(COUNT.LABEL.SORTIES, per(R.sorties[0]), per(R.sorties[1]), 'sorties')}
          ${costBar(COUNT.LABEL.SORTIES_WASTED, per(R.wasted[0]), per(R.wasted[1]), 'sorties')}
          ${costBar('Airframe hours', per(R.hours[0]), per(R.hours[1]), 'hours')}
          </div>
          <div class="cqKey"><span><i class="a"></i>ANGEL SWARM</span><span><i class="b"></i>CURRENT — TRIAGE & PROXIMITY</span>
            <span class="dim">${R.wide ? 'means across ' + n0(R.runs) + ' engagements in seven areas of operations'
              : 'this engagement only'}</span></div>
          <p class="cqCite"><b>Blood is the binding one.</b> The military blood programme collects
            roughly 150 000 units a year from a fixed donor base; one week of large-scale combat is
            projected to demand about that much. USCENTCOM shipped 26 892 units in 2022 and transfused
            84 — 0.3% <i>(Military Medicine 2024;189:249)</i>. Drone delivery in Rwanda cut wastage 67%
            across 12 733 orders <i>(Lancet Global Health 2022)</i>.</p>
          <p class="cqCite"><b>Evacuation cannot absorb the difference.</b> Army planning for
            large-scale combat puts 30 000–35 000 casualties a day needing evacuation from theatre
            against a strategic ceiling of 250–1 000 — capacity for 3–4% of demand
            <i>(Army War College, citing FM 4-02)</i>. Every casualty stabilised forward is one who
            does not enter that queue as an URGENT.</p>
        </div>
      </div>

      ${findingSensitivity()}

      <div class="card">
        <div class="cardHead">What that is worth, using only rates that are published</div>
        <div class="cqBody">
          <table class="cqTable"><thead><tr>
            <th>Item</th><th style="width:170px">Measured</th>
            <th style="width:240px">Published rate</th><th style="width:210px">Value</th>
          </tr></thead><tbody>
            <tr><td>Blood units not destroyed</td>
              <td class="mono">${n0(bloodSaved)} units</td>
              <td class="dim">$${n0(rates.bloodAcq)} acquisition × ${rates.bloodMult} fully loaded</td>
              <td class="mono ok">$${n0(bloodUSD)}</td></tr>
            <tr><td>Airframe hours not flown</td>
              <td class="mono">${n1(hoursSaved)} hours</td>
              <td class="dim">no published rate for this class of aircraft — not costed</td>
              <td class="mono dim">—</td></tr>
            <tr><td><b>Across ${n0(R.casN)} casualties</b></td>
              <td class="mono">${n1(per(bloodSaved))} units per 1 000</td>
              <td class="dim">ASBP fact sheet · Shander et al., Transfusion 2010</td>
              <td class="mono ok"><b>$${n0(perK)} per 1 000 casualties</b></td></tr>
          </tbody></table>
          <p class="cqCite" data-fold-label="what is deliberately excluded">Any dollar value on a
            casualty. The death gratuity, the insurance and the lifetime care figures all exist and
            would make this arithmetic look far better. Putting a price on a dead soldier next to an
            efficiency table is not an argument worth winning.</p>
        </div>
      </div>

      ${blockLimits(R, rates)}`);
  }

  function blockLimits(R, rates) {
    return `<div class="card">
      <div class="cardHead">What this does not say</div>
      <div class="cqBody">
        <ul class="cqLimits">
          <li><b>The data is synthetic.</b> The casualty stream, the physiology and the platform
            figures are traceable to published sources, but they were not observed in this fight or
            any other. Nothing here is evidence that the system works in the field.</li>
          <li><b>A confidence interval over these runs bounds the seed, not reality.</b> It is a
            statement about how much of the result is the random draw. No number of replications
            makes it a statement about the world.</li>
          <li><b>There is no published cost per flight hour for this class of unmanned aircraft,</b>
            so none is claimed. For scale only, the Army's FY26 reimbursement rate for a UH-60M is
            $${n0(rates.uh60Hr)} per flight hour — the relevant comparison only if the alternative to
            an unmanned sortie is a manned one.</li>
          <li><b>${R && R.wide ? 'These are means across ' + n0(R.runs) + ' engagements.'
            : 'These figures are one engagement.'}</b> ${R && R.wide
            ? 'Seven areas of operations, five seeds each, both arms drawing the same casualties.'
            : 'Measure across thirty-five engagements before carrying any of it into a room.'}</li>
        </ul>
      </div>
    </div>`;
  }

  /* ====================== COMPOSITIONS OF THE OTHER THREE =============== */
  /* Reduce, do not rebuild. The native renderer runs for every role, first
     and unconditionally; what follows only adds the commander's headline and
     the fold control, and the fold itself is a stylesheet rule keyed on a
     class this file toggles. Nothing is removed from the document, so an
     operator who switches to ANALYST mid-sentence gets the pane back whole. */

  function foldControl(id, host, label, position) {
    if (!host || document.getElementById(id)) return document.getElementById(id);
    const b = document.createElement('button');
    b.id = id;
    b.className = 'cqMore' + (position === 'float' ? ' float' : '');
    b.type = 'button';
    b.setAttribute('data-roles', 'COMMANDER');
    b.setAttribute('aria-expanded', 'false');
    b.textContent = label;
    b.addEventListener('click', ev => {
      ev.preventDefault(); ev.stopPropagation();
      const sec = b.closest('.viewport');
      if (!sec) return;
      const open = sec.classList.toggle('cqOpen');
      b.setAttribute('aria-expanded', String(open));
      b.textContent = open ? 'hide the detail' : label;
      if (APP) { APP._paneForce = true; }
      const r = G('render'); if (r) r();
    });
    if (position === 'float') host.appendChild(b);
    else host.insertBefore(b, host.firstChild);
    return b;
  }

  /* MISSION. The map is the centrepiece and is untouched. */
  function composeMission() {
    const stage = document.getElementById('stage');
    if (stage) foldControl('cqMissionMore', stage, 'show the detail', 'float');
  }

  /* COMPARE. The headline card already carries the one number; all this adds
     is the fold for the two thumbnails and the nine-row ledger. */
  function composeCompare() {
    const wrapEl = document.querySelector('[data-pane="COMPARE"] .cmpWrap');
    if (!wrapEl || document.getElementById('cqCompareMore')) return;
    /* Below the chart rather than beside the headline: the head row already
       carries the score, the four causes and the deployment note, and a
       control wedged into it costs the explanatory sentence half its width. */
    const bar = document.createElement('div');
    bar.className = 'cqCmpMore';
    bar.setAttribute('data-roles', 'COMMANDER');
    wrapEl.appendChild(bar);
    foldControl('cqCompareMore', bar, 'show the detail');
  }

  /* TASKING. The queue is already the action surface; what it lacks is the
     answer at the top. "Expired because nobody answered" is an accusation and
     it belongs in the first line, not the fifth tile. */
  function composeTasking() {
    const pane = document.querySelector('[data-pane="TASKING"] .pane');
    if (!pane) return;
    let line = document.getElementById('cqTaskLine');
    if (!line) {
      line = document.createElement('div');
      line.id = 'cqTaskLine';
      line.className = 'cqLine';
      line.setAttribute('data-roles', 'COMMANDER');
      const head = pane.querySelector('.paneHead');
      pane.insertBefore(line, head ? head.nextSibling : pane.firstChild);
    }
    const tools = pane.querySelector('.phTools');
    if (tools) foldControl('cqTaskingMore', tools, 'show the policy');

    if (!isCommander()) return;
    const A = APP.armA; if (!A) return;
    const q = A.queue || [];
    const pending = q.filter(p => p.state === 'PENDING').length;
    const expired = A.stats.expired || 0;
    const auto = A.stats.autoApproved || 0;
    paint(line, `
      <span class="cqLead ${pending ? '' : 'flat'}">${n0(pending)}</span>
      <span class="cqTxt">${pending === 1 ? 'flight is' : 'flights are'} waiting on your decision.
        <em>${n0(auto)} ${plural(auto, 'has', 'have')} launched under your standing authority.
        ${expired ? n0(expired) + ' ' + plural(expired, 'proposal') + ' expired because nobody answered — hesitation is logged with the minute it happened.'
                  : 'Nothing has expired unactioned.'}</em></span>
      ${pending ? '' : '<span class="cqZero">NOTHING IS WAITING ON YOU</span>'}`);
  }

  /* ------------------------------------------------------------- actions */
  /* One delegated handler for the controls this file creates. The host's own
     delegated actions — data-deploy, data-joa, data-deployjoa, data-approve —
     are reused as they are rather than reimplemented, so a commander's button
     and an analyst's button are literally the same code path. */
  function bind() {
    if (document._cqBound) return;
    document._cqBound = true;
    document.addEventListener('click', ev => {
      const el = ev.target.closest('[data-cmd]');
      if (!el) return;
      const cmd = el.dataset.cmd;
      ev.preventDefault();
      if (APP) APP._paneForce = true;
      const render = G('render'), sync = G('syncChrome');
      if (cmd.startsWith('go:')) {
        const v = cmd.slice(3);
        if (!document.querySelector('[data-pane="' + v + '"]')) return;
        APP.view = v; APP.sel = null;
        if (sync) sync(); if (render) render();
        return;
      }
      if (cmd === 'armed') {
        APP.thresholds.armed = !APP.thresholds.armed;
        if (!APP.thresholds.armed) APP.alert = null;
        if (render) render();
        return;
      }
      if (cmd === 'play') {
        if (APP.finished) { const rs = G('resetSim'); if (rs) rs(true); }
        APP.running = true; APP.lastFrame = 0;
        if (sync) sync(); if (render) render();
        return;
      }
      if (cmd === 'recall') { const f = G('recallDeployment'); if (f) f(); return; }
      if (cmd === 'deploy') { const f = G('openDeployModal'); if (f) f('ON_DEMAND'); return; }

      /* ---- order of battle ------------------------------------------
         Every one of these goes through addAirframeToBoth/removeAirframe-
         FromBoth, which take the two arms together. There is deliberately
         no way from here to reinforce one arm. */
      if (cmd.startsWith('addac:')) {
        const bits = cmd.split(':');
        addAircraft(bits[1], Number(bits[2]), 1);
        return;
      }
      if (cmd.startsWith('rmac:')) {
        const rm = G('removeAirframeFromBoth');
        if (!rm) return;
        const id = Number(cmd.slice(5));
        if (!rm(APP.armA, APP.armB, id)) {
          const t = G('toast');
          if (t) t('Aircraft is flying', 'That airframe is on a sortie. It can be removed once it is ' +
                   'back on the ground and unassigned.', 'warn');
          return;
        }
        const t = G('toast');
        if (t) t('Airframe removed', 'Removed from both arms, so the comparison stays level.', 'info');
        if (render) render();
        return;
      }
      if (cmd.startsWith('bulk:')) {
        const bits = cmd.split(':');
        bulkQty[bits[1]] = Math.max(0, Math.min(24, (bulkQty[bits[1]] || 0) + Number(bits[2])));
        if (render) render();
        return;
      }
      if (cmd === 'bulkclear') {
        Object.keys(bulkQty).forEach(k => { bulkQty[k] = 0; });
        if (render) render();
        return;
      }
      if (cmd === 'dist') { distributeBulk(); return; }
      if (cmd.startsWith('pkg:')) {
        const pk = PACKAGES.find(x => x.key === cmd.slice(4));
        if (pk) applyPackage(pk);
        return;
      }
      if (cmd === 'roi') { const f = G('runRoiSweep'); if (f) f(); return; }
      if (cmd === 'req') { const f = G('runRequirements'); if (f) f(); return; }
    });
  }

  /* ----------------------------------------------------------- bootstrap */
  ANGEL.ready('role-commander', async () => {
    /* Without the shell there is nothing to compose. Fail silently: the two
       mount points keep their honest placeholder line and the other three
       panes keep the interface they already had. */
    if (!APP || !window.ANGEL) {
      if (window.ANGEL && ANGEL.setStatus)
        ANGEL.setStatus('role-commander', 'withheld', 'application shell not present');
      return null;
    }
    /* Every figure on DECIDE and COST is a COUNT quantity or is derived from
       the horizon COUNT publishes. Without it there is no composition of
       these five panes that is guaranteed to agree with the rest of the
       application, and a commander's screen that quietly disagrees with the
       shell is worse than the honest placeholder DECIDE shipped with. */
    if (!HAS_COUNT) {
      if (ANGEL.setStatus)
        ANGEL.setStatus('role-commander', 'withheld', 'COUNT (the counted nouns) not present');
      return null;
    }
    /* The view registry is created by whichever module gets there first —
       this file runs during document parse, ahead of every deferred module,
       so it is usually this one. Asserting it already exists was wrong and
       cost a silent no-op: the module reported ready and had registered
       nothing. */
    ANGEL.views = ANGEL.views || {};

    injectCSS();
    bind();

    /* DECIDE and COST go through the documented extension point. Registering
       them also clears their data-placeholder status for landing(), so a
       commander switching profiles now arrives on DECIDE rather than being
       routed past it. */
    ANGEL.views.DECIDE = () => { try { renderDecide(); } catch (e) { console.warn('DECIDE', e); } };
    ANGEL.views.COST = () => { try { renderCost(); } catch (e) { console.warn('COST', e); } };

    /* The three inherited panes. Wrap once; the native binding is captured
       before the wrapper is installed so the wrapper can never resolve back
       to itself. */
    const wrap = (name, after) => {
      const native = window[name];
      if (typeof native !== 'function' || native._cqWrapped) return;
      const w = function () {
        native.apply(this, arguments);
        if (!isCommander()) return;
        try { after(); } catch (e) { console.warn(name, e); }
      };
      w._cqWrapped = true;
      window[name] = w;
    };
    wrap('renderMission', composeMission);
    wrap('renderCompare', composeCompare);
    wrap('renderTasking', composeTasking);

    /* The decision bar is chrome, not a pane, so it cannot hang off a pane
       renderer — a commander standing on SETTINGS still needs to be told
       that three sorties are waiting on him. It is painted on every frame,
       and paint() writes only when the markup actually changed, so a bar
       that says the same thing three times a second costs nothing. The
       wrapper deliberately does NOT return early for other roles: the
       renderer clears itself, which is what collapses the row and lets
       --barH shrink back for the other three profiles. */
    const nativeRender = window.render;
    if (typeof nativeRender === 'function' && !nativeRender._cqBar) {
      const w = function () {
        nativeRender.apply(this, arguments);
        try { renderDecisionBar(); } catch (e) { console.warn('decbar', e); }
      };
      w._cqBar = true;
      window.render = w;
    }

    /* The fold controls are created on first render of their pane, which is
       fine for MISSION (the landing view) but leaves COMPARE and TASKING
       without one until first visit. Create them now so a commander never
       sees a reduced pane with no way to unfold it. */
    composeMission(); composeCompare(); composeTasking();

    /* A role change is a presentation change and must not disturb the run.
       All this does is force the next frame to rebuild, because the reduced
       and unreduced compositions differ by more than a stylesheet rule can
       express on TASKING, where the headline strip carries live text. */
    ANGEL.need('role').then(role => role.on(() => {
      APP._paneForce = true;
      try { renderDecisionBar(); } catch (e) { /* pre-run */ }
    }));

    /* The contract says a destination stops being an unbuilt placeholder the
       moment its renderer registers, and becomes the role's landing view with
       no other edit anywhere. That resolution happens once, in initRoles(),
       while app.js is being parsed — which is necessarily before this file
       exists, so on a first load the commander was still being routed past
       DECIDE to MISSION. Re-resolve it here, and only here: the guard on
       readyState means this can only fire during document parse, before
       DOMContentLoaded, before bindUI, before any click could have expressed
       an intention. It cannot pull an operator off a pane he chose. */
    if (document.readyState === 'loading' && isCommander()) {
      const landing = ANGEL.role && ANGEL.role.landing ? ANGEL.role.landing() : null;
      if (landing && landing !== APP.view) { APP.view = landing; APP._paneForce = true; }
    }

    ANGEL.mark('role-commander ready', { views: ['DECIDE', 'COST'], composed: ['MISSION', 'COMPARE', 'TASKING'] });
    return true;
  });
})();
