/* ==========================================================================
   ANGEL SWARM — THE THREE REAL MAP RENDERERS, INSIDE THE DESIGN'S CHROME
   ==========================================================================
   THIS FILE DRAWS NO MAP. That is the whole point of it.

   The application has three map renderers and they already work:

     THEATRE      app/js/theater.js — the combatant command. Camera
                  APP.theaterView {k,tx,ty}, moved by zoomTheaterAt() and
                  resetTheaterView(), drawn by drawTheater(). Where the GPU
                  theatre (app/js/theater3d.js) comes up it draws the same
                  combatant command instead and puts that canvas to sleep;
                  both cameras listen on the stage's [data-thzoom] controls,
                  so that is the bus this file presses rather than moving one
                  camera and hoping it was the one on screen.
     TACTICAL 2D  app/js/geo.js + app/js/map.js — the flat tactical sheet.
                  Camera APP.mapViewport {zoom,cx,cy}, moved by zoomBy() and
                  fitView(). Layers in APP.layers. Two arms side by side
                  through APP.mapView = 'COP' | 'COMPARE'.
     TACTICAL 3D  app/js/geo3d.js — the same ground on deck.gl. Its camera is
                  reachable only through ANGEL.get('theater3d').camera, and
                  map3dReady() is the whole availability test.

   A previous pass replaced all three with a map component written for the
   design canvas. That component is deleted. Nothing below re-implements a
   renderer, a projection, a symbol or a basemap.

   HOW THEY GET ONTO THIS PAGE
   ---------------------------
   Those renderers are not three drawing functions with no context: they are
   driven by app/js/app.js, which owns APP, render(), the scope helpers and
   the pointer bindings on every canvas, against the console's own DOM. The
   design canvas in index.html is a different document with a different DOM
   that React rewrites eight times a second.

   So the real application is mounted, whole and unmodified, in a same-origin
   frame, and this file is the dock that holds it over the slot the design
   draws — the same mechanism js/page-map.js used in v4.0, which adopted
   <main id="views"> into a box that survived the shell repainting its
   container. The frame is created once and outlives every re-render: the
   custom element <angel-map> is only the slot, and losing it hides the dock
   rather than tearing the application down and booting it again.

   Everything around the map is the design's, drawn by the design. The
   frame's own chrome — rail, command bar, the operations screen's tables,
   the theatre's own zoom pad and stats card, the flat map's legend — is
   taken off screen, because the design draws each of those itself and two
   copies of one figure sampled a moment apart is how a screen contradicts
   itself.

   EVERY CONTROL CALLS THE REAL FUNCTION. mapScopeNow(), setMapScope(),
   zoomAnyMap(), fitAnyMap() and the table MAP_TOOLS_BY_SCOPE are app.js's,
   tested, and they are what runs here. There is no second implementation of
   scale dispatch in this file; the table is also what decides which controls
   the design is allowed to draw, so a control that cannot act at the scale
   on screen is absent rather than present and dead.

   DEATHS ARE RED. Every death figure and every death marker below takes the
   red family. No figure in this file is written down; each is read out of
   the running engine at the moment it is asked for.
   ========================================================================== */
(function () {
  'use strict';

  var FRAME_SRC = './console.html';

  /* ---- the dock ---------------------------------------------------------
     One frame, one box, created on first arrival at the Theater Map and kept
     for the life of the page. It is fixed to the viewport and re-registered
     over the slot every animation frame, and clipped to whatever scrolls it,
     so it cannot paint over the chrome above it. */
  var dock = null, frame = null, W = null, booted = false, bootErr = null;
  var slot = null, lastBox = '';
  var listeners = [];
  var frameMaskedFor = '';
  var frameBlackout = null;

  function showFrameBlackout() {
    if (!dock || frameBlackout) return;
    frameBlackout = document.createElement('div');
    frameBlackout.id = 'angelMapBlackout';
    frameBlackout.setAttribute('aria-hidden', 'true');
    frameBlackout.style.cssText =
      'position:absolute;inset:0;z-index:5;pointer-events:none;background:#000';
    dock.appendChild(frameBlackout);
  }

  function clearFrameBlackout() {
    if (!frameBlackout) return;
    try { frameBlackout.remove(); } catch (e) { /* already gone */ }
    frameBlackout = null;
  }

  function maskFrameFor(s) {
    if (!frame) return;
    frameMaskedFor = s || '';
    frame.style.opacity = frameMaskedFor ? '0' : '1';
    frame.style.pointerEvents = frameMaskedFor ? 'none' : 'auto';
  }

  function revealFrame(s) {
    if (!frame || (s && frameMaskedFor && frameMaskedFor !== s)) return;
    frameMaskedFor = '';
    frame.style.opacity = '1';
    frame.style.pointerEvents = 'auto';
    clearFrameBlackout();
  }

  function ensureDock() {
    if (dock) return dock;
    dock = document.createElement('div');
    dock.id = 'angelMapDock';
    dock.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;z-index:1;display:none;' +
      'border-radius:6px;overflow:hidden;visibility:hidden;' +
      'border:1px solid oklch(0.3 0.012 250);background:oklch(0.2 0.012 250)';
    frame = document.createElement('iframe');
    frame.id = 'angelMapFrame';
    frame.title = 'ANGEL SWARM map';
    frame.setAttribute('scrolling', 'no');
    frame.style.cssText =
      'display:block;width:100%;height:100%;border:0;background:transparent;' +
      'opacity:1;pointer-events:auto';
    frame.src = FRAME_SRC;
    frame.addEventListener('load', onFrameLoad);
    dock.appendChild(frame);
    dock.appendChild(ensureState());
    document.body.appendChild(dock);
    return dock;
  }

  /* ---- NO PANE IS EVER AN EMPTY RECTANGLE -------------------------------
     Every one of these renderers can be somewhere between asked for and
     drawing: the GPU theatre takes several seconds to hold a basemap, an
     atlas and a compiled shader set, and it can lose the surface underneath
     it afterwards without an error and without a sound. Both of those used to
     read the same way from the operator's chair — a rectangle with nothing in
     it — and a rectangle with nothing in it is indistinguishable from a
     product that does not work.

     So the dock carries its own state, over the frame, in the design's own
     floating-panel language: what is happening while a renderer builds, and
     what failed if one never comes up. It is never shown over a map that is
     drawing, it never takes a pointer event, and it says which renderer and
     which failure rather than "something went wrong". */
  var stateEl = null, stateKey = '';
  function ensureState() {
    if (stateEl) return stateEl;
    stateEl = document.createElement('div');
    stateEl.id = 'angelMapState';
    stateEl.setAttribute('role', 'status');
    stateEl.setAttribute('aria-live', 'polite');
    stateEl.style.cssText =
      'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;' +
      'display:none;pointer-events:none;max-width:min(520px,78%);' +
      'border-radius:6px;border:1px solid oklch(0.34 0.012 250);' +
      'background:oklch(0.1 0.008 250 / .88);backdrop-filter:blur(13px);' +
      '-webkit-backdrop-filter:blur(11px);box-shadow:0 10px 30px oklch(0.05 0 0 / .5);' +
      'padding:14px 18px;font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;' +
      'color:oklch(0.86 0.01 250);text-align:center;letter-spacing:.4px';
    return stateEl;
  }
  function showState(kind, head, body) {
    ensureState();
    var k = kind + '|' + head + '|' + body;
    if (k === stateKey) return;
    stateKey = k;
    if (!kind) { stateEl.style.display = 'none'; stateEl.innerHTML = ''; return; }
    var tint = kind === 'fail' ? 'oklch(0.82 0.15 25)' : 'oklch(0.8 0.12 195)';
    stateEl.style.display = 'block';
    stateEl.innerHTML =
      '<div style="font-size:10px;letter-spacing:2px;color:' + tint + '">' + esc(head) + '</div>' +
      '<div style="margin-top:7px;color:oklch(0.7 0.012 250)">' + esc(body) + '</div>';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m];
    });
  }

  /* IS THERE ACTUALLY A PICTURE IN THE PANE. Not "is there a renderer", not
     "is there a canvas of the right size" — both of those are true of a map
     drawing nothing. Each renderer is asked the strongest question it can
     answer, and the canvas fallbacks count: a theatre drawn by js/theater.js
     is a complete theatre, not a degraded state to warn anybody about. */
  function paneLive(s) {
    if (!booted) return false;
    try {
      var d = W.document;
      if (s === 'GLOBE') {
        var g = gb();
        return !!(g && g.live && g.live());
      }
      if (s === 'THEATRE') {
        var T = W.__ANGEL_T3D;
        if (T && T.live && T.live()) return true;
        if (T && T.active && T.active()) return false;   /* mounted, not drawing */
        return canvasUp(d.getElementById('mapTheater'));
      }
      if (s === '3D') {
        var g = g3();
        if (g && g.ready && g.ready()) return true;
        return !!d.querySelector('#g3Host canvas');
      }
      return canvasUp(d.getElementById('mapA'));
    } catch (e) { return true; }   /* cannot tell: never accuse a working map */
  }
  function canvasUp(cv) {
    if (!cv) return false;
    var r = cv.getBoundingClientRect();
    return r.width > 8 && r.height > 8;
  }

  /* Why the theatre is not drawing, in the words of the module that knows. */
  function theatreNote() {
    try {
      var T = W.__ANGEL_T3D;
      if (T && T.note && T.note()) return T.note();
      var st = W.ANGEL && W.ANGEL.status && W.ANGEL.status.get('theaterGPU');
      if (st && st.note) return st.note;
    } catch (e) { /* contained */ }
    return '';
  }

  var stAt = 0, stFor = '', stFrom = '', stRetried = false;
  /* NOTHING IS SAID ABOUT A MAP THAT IS SIMPLY ARRIVING. Switching scale takes
     the pane a moment to hand over and the operator does not need a card
     about it; a state that flashed on every press of a chip would be worse
     furniture than the problem it is for. Nothing is shown until a renderer
     has been asked for and not answered for a second and a half. */
  var BUSY_AT = 1500, HANDOFF_BUSY_AT = 3000, RETRY_AT = 6000, FAIL_AT = 15000;
  function publishPaneState() {
    if (!dock || dock.style.display === 'none') return;
    var now = (window.performance || Date).now();
    if (!booted) {
      if (!stAt) stAt = now;
      showState(now - stAt > 2500 ? 'busy' : '',
        'BRINGING THE MAP UP', 'The application is loading in the map frame.');
      return;
    }
    var s = scope();
    if (s !== stFor) {
      stFrom = stFor;
      stFor = s;
      stAt = now;
      stRetried = false;
    }
    if (!s) { showState(''); return; }
    if (paneLive(s)) {
      revealFrame(s);
      stAt = now;
      stRetried = false;
      showState('');
      return;
    }

    var age = now - stAt;
    var name = s === 'GLOBE' ? 'THE GLOBE'
             : s === 'THEATRE' ? 'THE COMBATANT COMMAND'
             : s === '3D' ? 'THE TACTICAL PICTURE ON THE GPU' : 'THE TACTICAL SHEET';

    /* ONE RETRY, THEN THE TRUTH. A first mount that threw used to leave the
       pane dead with no control that could do anything about it. */
    if (!stRetried && age > RETRY_AT) {
      stRetried = true;
      try { if (s === 'THEATRE' && W.__ANGEL_T3D && W.__ANGEL_T3D.retry) W.__ANGEL_T3D.retry(); }
      catch (e) { /* contained */ }
      try { W.APP._paneForce = true; W.render(); } catch (e) { /* contained */ }
    }
    /* The first Globe → Theatre handoff has to return the globe's canvas,
       reacquire the GPU theatre and paint its first frame. On some machines
       that lands just beyond the ordinary 1.5-second grace period, which made
       this card flash for a frame or two over an otherwise healthy switch.
       Give that specific handoff one extra beat; a genuinely stalled renderer
       still reaches the retry and failure states on the original schedule. */
    var busyAt = s === 'THEATRE' && stFrom === 'GLOBE' ? HANDOFF_BUSY_AT : BUSY_AT;
    if (age < busyAt) { showState(''); return; }
    /* A Globe → Theatre handoff intentionally stays solid black until the
       first Theatre frame is ready. Do not put a loading card over that
       blackout; only a real timeout is allowed to replace it with an error. */
    if (s === 'THEATRE' && stFrom === 'GLOBE' && age < FAIL_AT) {
      showState('');
      return;
    }
    if (age < FAIL_AT) {
      showState('busy', 'BUILDING ' + name,
        stRetried ? 'The first attempt did not come up. Trying once more.'
                  : 'Real coastlines, boundaries and every operation in the command.');
      return;
    }
    /* The module's own words for what went wrong, unedited — it names files
       and versions this file knows nothing about, and re-casing a sentence
       that starts with "deck.gl" only makes it wrong. */
    var why = s === 'THEATRE' ? theatreNote()
            : s === 'GLOBE' ? ((gb() && gb().note && gb().note()) || '') : '';
    showState('fail', name + ' DID NOT COME UP',
      (why ? why.replace(/\.\s*$/, '') + '. ' : '') +
      'The other two scales on the chips above are unaffected. Reloading this page ' +
      'rebuilds the map; a hard reload (Ctrl-Shift-R) also clears a stale cached file.');
  }

  /* ---- the frame is the application, reduced to its map ------------------
     console.html carries TWO shells. The old console chrome is #shell — the
     rail, the command bar and <main id="views"> with every pane in it — and
     over the top of it sits #dShell, the v4.0 design shell, whose stylesheet
     hides every child of <body> that is not itself. That shell is a previous
     answer to this same question and it is not wanted inside this one: two
     designs on one screen is how a page ends up with two of every control.

     So it is taken out of the document. shell.js repaints only while #dShell
     is there, its dock only builds inside it, and design.css's allow-list is
     written as `body:has(#dShell) > …` — so removing that one element stops
     the second shell, stops its repaint, and hands the old console layout
     back intact, which is the layout every one of these renderers was
     written against. What is left is reduced to the map by an allow-list:
     the shell keeps one child, the pane on screen keeps one child, and
     nothing from the console can leak into the design's page. */
  var STRIP = [
    'html,body{overflow:hidden!important;margin:0!important;padding:0!important;background:transparent!important}',
    'body>*:not(#shell){display:none!important}',
    'html body #shell{position:fixed!important;inset:0!important;top:0!important;left:0!important;right:0!important;bottom:0!important;display:block!important;padding:0!important;margin:0!important;border:0!important;background:transparent!important}',
    '#shell>*:not(#views){display:none!important}',
    'html body #shell #views{position:absolute!important;inset:0!important;margin:0!important;padding:0!important;width:auto!important;height:auto!important;max-width:none!important;border:0!important;overflow:hidden!important}',
    '#views>.viewport{margin:0!important}',
    /* THE THEATRE PICTURE. The rest of that pane is the old operations
       screen — its tables, its status bars, its threshold settings — and on
       this destination the map is the destination. */
    '.viewport[data-pane="DASHBOARD"] .pane{position:absolute!important;inset:0!important;padding:0!important;margin:0!important;min-height:0!important;max-width:none!important;overflow:hidden!important;display:block!important}',
    '.viewport[data-pane="DASHBOARD"] .pane>*:not(#theaterStage){display:none!important}',
    /* The operations screen lays this stage out as a grid — map beside the
       operations list — and an explicit 300px track stays 300px wide after
       its only item is taken off screen, which is a third of the picture
       lost to nothing. The track is collapsed rather than the layout
       rewritten: both theatre renderers place themselves in that first grid
       cell, so one column is all it takes and neither has to be re-boxed. */
    'html body .viewport[data-pane="DASHBOARD"] #theaterStage{position:absolute!important;inset:0!important;width:auto!important;height:auto!important;min-height:0!important;margin:0!important;border:0!important;border-radius:0!important;grid-template-columns:1fr!important}',
    /* ONE CONTROL, ONE PLACE. The same three zoom controls are in the
       design's tool row and the same figures are in its tile row; two copies
       of "still down" sampled a moment apart would disagree on screen. The
       operations list is the design's side panel of cards. */
    '#theaterStage .thZoom,#theaterStage .thStats,#theaterStage .thHint,#joaList{display:none!important}',
    /* THE FLAT TACTICAL SHEET and the GPU map that shares its stage. */
    '.viewport[data-pane="MISSION"]{overflow:hidden!important}',
    'html body #stage{position:absolute!important;inset:0!important;border-radius:0!important;border:0!important}',
    /* The layer panel is drawn by the design, once, and its rows move these
       renderers' own layer state. The renderers' own panels stand down. */
    'html body #legend{display:none!important}',
    '#g3Wrap .g3Left{display:none!important}',
    '#dock{display:none!important}',
    '#welcome{display:none!important}',
    /* ONE FIGURE, ONE PLACE. Each of these is a second copy of something the
       design draws around the map: the GPU map's own count row against the
       tile row, its selection card against the side panel's record, and the
       flat sheet's deploy bar against the application's own primary action.
       Two copies of one figure sampled a moment apart is how a screen
       contradicts itself, so the design's copy is the one that stands.
       #g3Fit stays in the document — it is what the FIT tool presses on this
       renderer — it is simply not a second button on the map. */
    '#g3Counts{display:none!important}',
    '#g3Wrap .g3Right{display:none!important}',
    '#missCompare{display:none!important}',

    /* ---- AND ONE CLOCK, WHICH IS WHY THE BAR IS BACK -------------------
       The transport went the way of the count row and for the same reason,
       and that was wrong. The global transport in the top bar is the right
       place for a run control on every other destination; on this one the
       operator is reading the theatre, which means reading the bottom of the
       screen, and a control at the top of the window is a control they have
       to leave the picture to find.

       So the GPU map's own bar comes back — the one geo3d.js already draws,
       with the play head, the scrubber, the mass-casualty ticks and the
       death ticks already on it — and it is NOT a second clock: publishTop's
       companion below hands that bar the host's own transport, so its play
       button presses the same button the chrome above does and its scrubber
       stops the same run. What is taken off it is only what the design draws
       twice: the replay speed (the SPEED chips), FIT and TOP-DOWN (the tool
       row). LIVE stays — it is the way back onto the host's clock after a
       scrub and the design draws nothing like it.

       The bar takes the design's own floating-chrome language, so it reads
       as one of this page's panels rather than as the console's furniture
       showing through. */
    'html body #g3Wrap .g3Bar{display:flex!important; border-radius:6px!important;' +
      'border:1px solid oklch(0.34 0.012 250)!important;' +
      'background:oklch(0.1 0.008 250 / .66)!important;' +
      'backdrop-filter:blur(13px)!important;-webkit-backdrop-filter:blur(11px)!important;' +
      'box-shadow:0 10px 30px oklch(0.05 0 0 / .45)!important;' +
      'padding:9px 13px!important;gap:12px!important}',
    'html body #g3Wrap .g3Bot{padding:10px 14px 12px}',
    'html body #g3Wrap .g3Clock{min-width:92px!important}',
    'html body #g3Wrap #g3Rate,html body #g3Wrap #g3Fit,html body #g3Wrap #g3Top2{display:none!important}',
    /* Squeezed between two columns of panels there is room for the control,
       the minute and the track, and the two end labels are the first thing
       that can go: the track still runs from the start of the run to the end
       of it, and the slider still says so to a screen reader. geo3d.js puts
       this class on once the bar is actually short — the frame's own width
       is not the measure, because the room is taken out of the middle. */
    'html body #g3Wrap .g3Bar.narrow .g3End{display:none!important}',
    'html body #g3Wrap .g3Bar.narrow .g3Clock{min-width:74px!important;font-size:13px!important}',

    /* ---- CHROME THIS FILE DOES NOT OWN, MOVED OUT OF THE PANELS --------
       "show the detail" is drawn by js/role-commander.js in the bottom-right
       corner of the reduced MISSION pane, and under this design that corner
       is a floating panel. It is a real control — the fold it opens is how a
       commander gets the layer filter and the two docks back — so a control
       that is present and unreachable is worse than one that has moved. The
       numbers come from --map-inset-*, which publishSideInsets measures off
       this page's own panels and writes onto the frame every time they move;
       unset, the fallbacks are the offsets that file already uses and nothing
       changes. */
    'html body #cqMissionMore.float{' +
      'right:calc(16px + var(--map-inset-r, 0px))!important;' +
      'bottom:calc(12px + var(--map-inset-b, 0px))!important}',
    'html body .viewport[data-pane="MISSION"].cqOpen #cqMissionMore.float{' +
      'top:calc(52px + var(--map-inset-t, 0px))!important;bottom:auto!important;' +
      'right:calc(16px + var(--map-inset-r, 0px))!important}'
  ].join('\n');

  /* Read by bare name inside the frame, not off its window: app.js and
     sim.js declare MAP_TOOLS_BY_SCOPE, THEATERS and SCENARIOS with `const`
     at the top level of a classic script, which puts them in the global
     LEXICAL scope and not on `window` — the same trap page-tty.js documents
     for CALLSIGN. A script element evaluated inside the frame can see them;
     a property read from outside it cannot. */
  var BRIDGE =
    'window.__ANGEL_BUS = {' +
    '  tools: function(){ return typeof MAP_TOOLS_BY_SCOPE !== "undefined" ? MAP_TOOLS_BY_SCOPE : null; },' +
    '  theaters: function(){ return typeof THEATERS !== "undefined" ? THEATERS : null; },' +
    '  scenarios: function(){ return typeof SCENARIOS !== "undefined" ? SCENARIOS : null; },' +
    '  params: function(){ return typeof PARAMS !== "undefined" ? PARAMS : null; }' +
    '};';

  function onFrameLoad() {
    try {
      W = frame.contentWindow;
      var d = W.document;
      var st = d.createElement('style');
      st.id = 'angelMapStrip';
      st.textContent = STRIP;
      d.head.appendChild(st);
      var br = d.createElement('script');
      br.textContent = BRIDGE;
      d.head.appendChild(br);
      waitForApp(0);
    } catch (e) { bootErr = String(e && e.message || e); }
  }

  /* The second shell, stopped. */
  function killV4Shell() {
    try {
      var el = W.document.getElementById('dShell');
      if (el) el.remove();
      W.document.body.classList.remove('d-map-focus');
    } catch (e) { /* contained */ }
  }

  function waitForApp(n) {
    try {
      if (W && W.APP && W.APP.world && typeof W.mapScopeNow === 'function') {
        booted = true;
        killV4Shell();
        try { if (typeof W.dismissWelcome === 'function') W.dismissWelcome(); } catch (e) { /* already gone */ }
        bindFrame();
        fire();
        return;
      }
    } catch (e) { bootErr = String(e && e.message || e); return; }
    if (n > 600) { bootErr = 'the application did not come up in the frame'; fire(); return; }
    setTimeout(function () { waitForApp(n + 1); }, 100);
  }

  /* ---- selection ---------------------------------------------------------
     CLICKING AN OPERATION ON THE THEATRE PICTURE SELECTS IT. Both theatre
     renderers already answer that click and both answer it the same way:
     the canvas map's own handler and theater3d's pick both end in
     `selectJoa(key)` — "the canvas map's own contract, called by name", as
     that module puts it. So there is exactly one seam to take, and it is
     that function rather than a second hit test of my own that would have to
     know which of the two is drawing and how each projects.

     What it is replaced with selects and stops. selectJoa() loads the
     operation and leaves for the tactical pane; under this design the scale
     is chosen by the chips above the map and the side panel is what a click
     on the picture moves. Opening the tactical picture is the card's own
     button, and it goes through setMapScope().

     CLICKING A CASUALTY ON A TACTICAL MAP OPENS ITS RECORD. app.js sets
     APP.sel from its own pick on the flat canvases and geo3d.js writes the
     same field from its own; the record card reads that selection. Nothing
     is re-bound for it. */
  var selJoa = null;
  /* THE APPLICATION'S OWN selectJoa, KEPT BEFORE IT IS REPLACED.

     Replacing it is right for a click on the picture — under this design that
     lights a card and does not move the operator off the scale they are on.
     But the globe's handoff is the one case where the operation genuinely has
     to be LOADED: the tactical sheet draws whatever scenario the engine is
     running, so flying to BASALT and then opening a sheet that is still showing
     CORAL is the defect, not the fix. This is app.js's own entry point, the one
     its own operation picker calls, and it is used for nothing else. */
  var appSelectJoa = null;
  /* Push a selection down into the globe as well: it resolves a zoom against
     what the operator has chosen, and the operations list is where they choose
     it. Safe before the globe exists and after it has gone. */
  function globeSelect(k) {
    try { var g = gb(); if (g && g.select) g.select(k || null); } catch (e) { /* contained */ }
  }
  function bindFrame() {
    try {
      if (typeof W.selectJoa === 'function' && !appSelectJoa) appSelectJoa = W.selectJoa;
      W.selectJoa = function (key) { selJoa = key; globeSelect(key); fire(); };
    } catch (e) { /* contained: a dead click must not take the page with it */ }

    /* The one thing the design cannot read off a function: whether anything
       the operator did inside the frame has moved. Polled cheaply, published
       only when it changes. */
    var seen = '';
    setInterval(function () {
      if (!booted) return;
      var k = '';
      try {
        k = [W.APP.view, W.APP.mapMode, W.APP.mapView,
             W.APP.sel ? W.APP.sel.kind + W.APP.sel.id : '',
             /* THE GPU CHIP APPEARS THE MOMENT THAT RENDERER IS RUNNING and
                not a moment before. geo3d.js takes several seconds to hold a
                basemap and an atlas, and until map3dReady() turns true there
                is nothing behind a third chip — so its answer is part of
                what this watch publishes. */
             ready3d() ? '3' : '',
             selJoa, panelKey()].join('|');
      } catch (e) { return; }
      if (k === seen) return;
      seen = k; fire();
    }, 200);
  }
  function panelKey() {
    try { return Object.keys(W.APP.layers).map(function (k) { return W.APP.layers[k] ? 1 : 0; }).join(''); }
    catch (e) { return ''; }
  }

  function fire() { for (var i = 0; i < listeners.length; i++) { try { listeners[i](); } catch (e) { /* contained */ } } }

  /* ---- registering the dock over the slot -------------------------------- */
  /* Whatever scrolls this page is what the dock has to be clipped to: it is
     fixed to the viewport, so without a clip it would ride over the chrome
     above it the moment the operator scrolls. Looked up when the slot
     changes rather than on every frame — this runs at the refresh rate,
     beside a GPU map. */
  var sbox = null, sboxFor = null;
  function scrollBox(el) {
    if (sboxFor === el) return sbox;
    sboxFor = el; sbox = null;
    for (var p = el.parentElement; p; p = p.parentElement) {
      var s = getComputedStyle(p);
      if (/(auto|scroll|hidden)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1) { sbox = p; break; }
    }
    return sbox;
  }
  /* AWAY FROM THIS DESTINATION THE FRAME STOPS DRAWING, AND DOES NOT STOP
     RUNNING. `display:none` takes the frame out of rendering, so the whole
     application behind it is no longer painting a map nobody is looking at
     on every frame of every other screen; its clock, its allocator and its
     audit chain carry on. Coming back gives the box back, and the box-change
     below is what re-fits each renderer to it. */
  function place() {
    if (!dock) return;
    if (!slot || !slot.isConnected) {
      if (dock.style.display !== 'none') { dock.style.display = 'none'; lastBox = ''; sboxFor = null; }
      return;
    }
    if (dock.style.display === 'none') dock.style.display = 'block';
    var r = slot.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) { dock.style.visibility = 'hidden'; return; }
    dock.style.left = r.left + 'px';
    dock.style.top = r.top + 'px';
    dock.style.width = r.width + 'px';
    dock.style.height = r.height + 'px';
    dock.style.visibility = 'visible';
    dock.style.pointerEvents = 'auto';
    var sb = scrollBox(slot), clip = '';
    if (sb) {
      var b = sb.getBoundingClientRect();
      clip = 'inset(' + Math.max(0, b.top - r.top) + 'px ' + Math.max(0, r.right - b.right) + 'px ' +
             Math.max(0, r.bottom - b.bottom) + 'px ' + Math.max(0, b.left - r.left) + 'px)';
    }
    if (dock.style.clipPath !== clip) dock.style.clipPath = clip;
    /* EVERY RENDERER SIZES ITSELF FROM ITS HOST AT THE MOMENT IT DRAWS, and
       while the clock is stopped nothing draws — so a box that changes size
       with the run paused leaves the last frame stretched across it. One
       render when the box actually changes, and not one frame more. */
    var k = Math.round(r.width) + 'x' + Math.round(r.height);
    if (k !== lastBox) {
      lastBox = k;
      if (booted) { try { W.APP._paneForce = true; W.render(); } catch (e) { /* contained */ } }
    }
  }
  /* WHAT MOVES THE DOCK, AND WHAT DOES NOT ---------------------------------
     This used to be a bare `requestAnimationFrame` loop: read the slot's box
     and write six inline styles, sixty times a second, in the document that
     is hosting a map trying to paint. Measured, that loop cost little — but
     it re-registered a box that had not moved on every one of those frames,
     and the reads sit in the same document the renderers draw beside.

     A box only moves when something moves it. Those events are: the slot or
     the page resizing (ResizeObserver), anything scrolling under it (one
     capturing, passive listener), the viewport changing, the design
     re-rendering the page around it — which is exactly when it asks this
     file for its figures, so sync() is the hook and no observer over the
     whole tree is needed — and the slot arriving or leaving. A slow backstop
     catches anything none of those saw. Every one of them only marks the
     dock dirty; the read and the writes happen once, in one animation frame,
     however many of them fired. */
  var placePending = 0;
  /* HOW MUCH OF THE MAP THE DESIGN IS SITTING ON TOP OF.
     The renderers draw a degraded-comms banner near the top of their own
     canvas, at a Y chosen to clear the standalone console's pane labels.
     Under this design the thing above the map is not those labels — it is the
     floating header card, which is taller, so the banner was drawn behind it
     and the operator never saw the one warning the map exists to give.

     Rather than move the banner to a number that happens to work here and
     breaks the console standing alone, the host measures its own chrome and
     tells the renderers how far down the clear band starts. map.js adds this
     to its own constant and falls back to zero when nothing publishes it. */
  function publishTopInset() {
    if (!booted) return;
    try {
      var card = document.getElementById('angelMapHeadCard');
      var d = dock && dock.getBoundingClientRect();
      if (!card || !d) return;
      var c = card.getBoundingClientRect();
      var inset = Math.max(0, Math.round(c.bottom - d.top) + 10);
      if (W.COMMS_BANNER_OFFSET !== inset) {
        W.COMMS_BANNER_OFFSET = inset;
        try { W.render(); } catch (e) { /* contained */ }
      }
    } catch (e) { /* contained */ }
  }

  /* ---- THE RUN, REACHED FROM INSIDE THE MAP -----------------------------
     The map's own transport bar has a play head and a scrubber, and both of
     them have to be able to stop the run — otherwise the host's clock walks
     away from wherever the operator just put it, on the host's very next
     render, and the button reads as broken.

     THERE IS NO SETTER TO CALL. The design owns the run in its own component
     state; window.ANGELMAP is a one-way road, the design tells the map what
     minute to be on and reads figures back, and nothing on it moves the
     design's clock. What the design does expose is the control the operator
     would otherwise have to reach for — the one transport button in the top
     bar — so that is what this presses. Nothing is re-implemented and no
     second run state is kept here: the button's own label is the run's
     state, because it is the design that writes it.

     IT IS DELIBERATELY NARROW. Only the four labels that toggle a run are
     accepted; when the button reads DEPLOY the map's play head must not open
     the deployment sheet, so it does nothing at all and the bar falls back
     to playing the recorded replay on its own. */
  var RUN_LABEL = { PLAY: 1, PAUSE: 1, RESUME: 1, 'PLAY \u2192': 1, 'RESUME \u2192': 1 };
  /* KEPT, BECAUSE THIS IS ASKED SIX TIMES A SECOND. The map's transport reads
     the state of the run off this button to know which glyph to show, and a
     walk of every span in the document at that rate, beside a GPU map, is not
     free. React keeps its DOM nodes across renders and only rewrites the
     text, so the element found once stays the right element and re-reading
     its label is the whole check. A miss — the run finished, nothing is
     deployed, the operator is on another destination — is not retried more
     than four times a second. */
  var runBtn = null, runMissAt = 0;
  function hostRunBtn(force) {
    try {
      if (runBtn && runBtn.isConnected) {
        var was = (runBtn.textContent || '').trim();
        if (RUN_LABEL[was]) return { el: runBtn, label: was };
      }
      runBtn = null;
      var now = (window.performance || Date).now();
      /* The backoff is for the polled question only. A press is the operator
         asking, once, and it always looks. */
      if (!force && now - runMissAt < 250) return null;
      runMissAt = now;
      /* NOT THE MAP'S OWN CHROME. The run panel that floats over the picture
         puts the same word on its collapsed header, and the operator
         pressing the bar must not end up pressing that. Everything inside
         the map's root is out of scope; what is left is the page around it,
         and in that the transport is the thing in the header strip. */
      var root = document.getElementById('angelMapRoot');
      var all = document.getElementsByTagName('span');
      for (var i = 0; i < all.length; i++) {
        var e = all[i];
        if (e.children.length) continue;
        var t = (e.textContent || '').trim();
        if (!RUN_LABEL[t]) continue;
        if (root && root.contains(e)) continue;
        var r = e.getBoundingClientRect();
        if (r.width > 0 && r.top < 140 && r.left > 240) { runBtn = e; return { el: e, label: t }; }
      }
    } catch (e) { /* contained */ }
    return null;
  }
  var HOST_RUN = {
    running: function () { var b = hostRunBtn(); return !!(b && b.label === 'PAUSE'); },
    /* Press it for what it says it will do, never for the other thing. */
    play: function () {
      var b = hostRunBtn(true);
      if (!b || b.label === 'PAUSE') return false;
      b.el.click(); return true;
    },
    pause: function () {
      var b = hostRunBtn(true);
      if (!b || b.label !== 'PAUSE') return false;
      b.el.click(); return true;
    },
    toggle: function () { var b = hostRunBtn(true); if (!b) return false; b.el.click(); return true; }
  };
  function publishHostRun() {
    if (!booted) return;
    try { if (!W.ANGEL_HOST_RUN) W.ANGEL_HOST_RUN = HOST_RUN; } catch (e) { /* contained */ }
  }

  /* HOW FAR IN THE DESIGN'S OWN PANELS REACH ALONG THE BOTTOM OF THE MAP.
     The transport bar the GPU map draws sits in the strip along the bottom
     of the picture, and the design floats a column of panels down each side
     of that same picture. On a wide screen the panels stop well short of
     that strip and the bar runs the full width. On a 1280 the left column
     runs to the floor, and a bar drawn edge to edge puts its play button
     underneath a panel — present, invisible and unclickable.

     Same answer as the banner above: the host measures its own chrome and
     tells the renderer how much room it has actually left. Nothing
     published, nothing subtracted.

     The panels are found through the one element on this page that is named
     — the header card — rather than by a selector written against the
     design's markup: they are the children of the two columns in the row
     under it. If that shape ever changes this measures nothing and the bar
     goes back to running edge to edge, which is the harmless answer. */
  var BAR_BAND = 100;           /* the strip along the bottom the bar lives in */
  function sidePanels() {
    var out = [];
    try {
      var card = document.getElementById('angelMapHeadCard');
      var row = card && card.parentNode && card.parentNode.lastElementChild;
      if (!row || row === card) return out;
      for (var i = 0; i < row.children.length; i++) {
        var col = row.children[i];
        for (var j = 0; j < col.children.length; j++) out.push(col.children[j]);
      }
    } catch (e) { /* contained */ }
    return out;
  }
  function publishSideInsets() {
    if (!booted) return;
    try {
      var d = dock && dock.getBoundingClientRect();
      if (!d || !d.width) return;
      var band = d.bottom - BAR_BAND, L = 0, R = 0, ps = sidePanels();
      /* THE SAME MEASUREMENT, OVER THE WHOLE PICTURE RATHER THAN ONE STRIP.
         The transport bar was the first piece of map-drawn chrome found
         underneath these columns and it was not the only one: the operation
         labels, the scale bar, the north arrow, the area-of-operations block
         and the source note were all being laid out inside the canvas
         rectangle when the rectangle an operator can actually see is the one
         between the columns. Anything the map draws AS CHROME is laid out
         inside these; the map itself still runs edge to edge under them,
         which is what a floating panel over a map is supposed to look like. */
      var IL = 0, IR = 0, IT = 0, IB = 0;
      for (var i = 0; i < ps.length; i++) {
        var r = ps[i].getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.right <= d.left || r.left >= d.right || r.bottom <= d.top || r.top >= d.bottom) continue;
        var onLeft = (r.left + r.right) / 2 - d.left < d.width / 2;
        if (onLeft) IL = Math.max(IL, Math.round(r.right - d.left) + 10);
        else IR = Math.max(IR, Math.round(d.right - r.left) + 10);
        if (r.bottom > band) {
          if (onLeft) L = Math.max(L, Math.round(r.right - d.left) + 10);
          else R = Math.max(R, Math.round(d.right - r.left) + 10);
        }
      }
      /* The header card is the only chrome above the map and its own inset is
         already measured for the degraded-comms banner; the same number is
         what keeps a label off it. */
      try {
        var card = document.getElementById('angelMapHeadCard');
        if (card) {
          var c = card.getBoundingClientRect();
          if (c.width && c.bottom > d.top && c.top < d.bottom)
            IT = Math.max(0, Math.round(c.bottom - d.top) + 10);
        }
      } catch (e) { /* contained */ }
      /* Nothing of the design floats along the bottom edge today. Measured
         rather than assumed, so it stays right if one ever does. */
      if (W.MAP_BAR_INSET_L !== L) W.MAP_BAR_INSET_L = L;
      if (W.MAP_BAR_INSET_R !== R) W.MAP_BAR_INSET_R = R;
      if (W.MAP_INSET_L !== IL) W.MAP_INSET_L = IL;
      if (W.MAP_INSET_R !== IR) W.MAP_INSET_R = IR;
      if (W.MAP_INSET_T !== IT) W.MAP_INSET_T = IT;
      if (W.MAP_INSET_B !== IB) W.MAP_INSET_B = IB;
      /* THE SAME FOUR NUMBERS, WHERE A STYLESHEET CAN REACH THEM. Not every
         piece of chrome over these maps belongs to a renderer: the reduced
         MISSION pane's "show the detail" control is drawn by
         js/role-commander.js, in the corner of the map, and it is the same
         corner the design puts a panel in. Restyling it from the strip below
         moves it without touching that file — and a custom property is what
         lets a static rule carry a number that is measured every frame. */
      var de = W.document && W.document.documentElement;
      if (de && de.style.getPropertyValue('--map-inset-r') !== IR + 'px') {
        de.style.setProperty('--map-inset-l', IL + 'px');
        de.style.setProperty('--map-inset-r', IR + 'px');
        de.style.setProperty('--map-inset-t', IT + 'px');
        de.style.setProperty('--map-inset-b', IB + 'px');
      }
    } catch (e) { /* contained */ }
  }

  function nudge() {
    if (placePending) return;
    placePending = requestAnimationFrame(function () {
      placePending = 0;
      try { place(); } catch (e) { /* never break the frame */ }
      try { publishTopInset(); } catch (e) { /* never break the frame */ }
      try { publishHostRun(); } catch (e) { /* never break the frame */ }
      try { publishSideInsets(); } catch (e) { /* never break the frame */ }
      try { publishPaneState(); } catch (e) { /* never break the frame */ }
    });
  }
  var watching = false, geoRO = null, roOn = null;
  function watchGeometry() {
    if (watching) return;
    watching = true;
    try {
      geoRO = new ResizeObserver(nudge);
      geoRO.observe(document.documentElement);
      if (document.body) geoRO.observe(document.body);
    } catch (e) { geoRO = null; }
    addEventListener('scroll', nudge, { capture: true, passive: true });
    addEventListener('resize', nudge, { passive: true });
    setInterval(nudge, 250);
  }
  function observeSlot(el) {
    if (!geoRO || roOn === el) return;
    try { if (roOn) geoRO.unobserve(roOn); } catch (e) { /* contained */ }
    roOn = el;
    try { if (el) geoRO.observe(el); } catch (e) { /* contained */ }
  }

  /* ======================================================================
     THE SLOT
     ======================================================================
     <angel-map> is an empty box. React may build it and throw it away as
     often as it likes; the application in the dock never notices. */
  if (!customElements.get('angel-map')) {
    customElements.define('angel-map', class extends HTMLElement {
      connectedCallback() {
        this.style.display = 'block';
        this.style.width = '100%';
        this.style.height = this.getAttribute('height') || '560px';
        slot = this;
        ensureDock();
        watchGeometry();
        observeSlot(this);
        nudge();
      }
      disconnectedCallback() {
        if (slot === this) { slot = null; observeSlot(null); nudge(); }
      }
    });
  }

  /* ======================================================================
     WHAT THE DESIGN ASKS THIS FILE
     ======================================================================
     Every answer below is a call into the running application. None of it is
     cached, none of it is written down here. */

  function A() { return booted ? W.APP : null; }
  var call = function (name) {
    return function () {
      if (!booted) return false;
      try { return W[name].apply(W, [].slice.call(arguments)); }
      catch (e) { return false; }   /* a dead control must not take the page with it */
    };
  };

  /* THE ONE PLACE THAT KNOWS WHICH MAP IS ON SCREEN — app.js's, not a
     second copy of it. */
  /* ---- THE FOURTH SCALE ---------------------------------------------------
     GLOBE is not one of app.js's scales and it is deliberately not being made
     into one. setMapScope() is that file's, it is tested, and the three scales
     it dispatches are wired into a table, a tool row, a settings option and a
     pane layout that this file does not own and must not fork.

     So the globe is a scale THIS FILE adds, on top of the theatre one. Asking
     for it puts the application on THEATRE — which is the pane the globe
     mounts into, and the scale it hands back to if anything goes wrong — and
     then mounts the globe over it. js/theater3d.js's globe takes its own
     early return in both theatre renderers while it is up, exactly as the GPU
     theatre already does in the canvas one, so at no moment are two of them
     drawing and at no moment is the pane empty.

     `scope()` answers GLOBE only while the globe is actually mounted. If it
     falls over — or is never able to come up on this machine — the answer goes
     straight back to THEATRE, which is a complete picture, and the chip row
     above follows on its next tick without anything having to be told. */
  function gb() { try { return W && W.__ANGEL_GLOBE; } catch (e) { return null; } }
  var globeWanted = false, globeHeldUntil = 0;

  /* ---- HANDING THE VIEW DOWN OUT OF THE GLOBE ----------------------------
     The scale row above this map is React state in the page, not a reading of
     what is on screen: while it says GLOBE it will keep asking for GLOBE on
     every render, however the operator actually left it. So the handoff does
     not fight that — it presses the row's own chip, which is the same control
     the operator would have pressed, and the page's state and the renderer
     move together. Exactly the mechanism the theatre zoom uses on
     [data-thzoom] and the transport uses on the run button: press the real
     control, do not keep a second copy of what it means.

     The chip is found by its label among the small elements of this page, and
     only outside the map's own root — the same discipline hostRunBtn uses, so
     a word that appears inside the frame can never be mistaken for it. If the
     row is not there, or is drawn by a build that does not have a globe chip,
     nothing is pressed and the short hold below is what keeps the page from
     putting the operator straight back on a scale they just flew out of. */
  /* Nothing is excluded by container here, unlike the transport button above:
     the scale row IS inside the map's own root on this page, and the frame is
     a separate document that this query cannot see into, so a chip found here
     is the page's own chip and nothing else can be. */
  function pressScopeChip(label) {
    try {
      var all = document.querySelectorAll('span,div,button');
      for (var i = 0; i < all.length; i++) {
        var e = all[i];
        if (e.children.length) continue;
        if ((e.textContent || '').trim() !== label) continue;
        var r = e.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0)) continue;
        /* The label is a leaf inside the chip and the handler is on an
           ancestor; a click on the leaf bubbles to whichever carries it. */
        e.click();
        return true;
      }
    } catch (e) { /* contained */ }
    return false;
  }
  function globeUp() { var g = gb(); return !!(globeWanted && g && g.active && g.active()); }
  function readyGlobe() {
    if (!booted) return false;
    try { var g = gb(); return !!(g && g.ready && g.ready()); } catch (e) { return false; }
  }
  function globeOff(silent, holdFrame) {
    globeWanted = false;
    var g = gb();
    if (g && g.unmount) { try { g.unmount(silent, holdFrame); } catch (e) { /* already down */ } }
  }
  function globeOn() {
    var g = gb();
    if (!g || !g.ready || !g.ready()) return false;
    /* Just flown out of. See onHandoff. */
    if (globeHeldUntil && (window.performance || Date).now() < globeHeldUntil) return false;
    globeHeldUntil = 0;
    /* The theatre pane first: the globe mounts into #theaterStage and that
       element only exists while the application is on that scale. */
    try { if (W.mapScopeNow() !== 'THEATRE') W.setMapScope('THEATRE'); } catch (e) { return false; }
    globeWanted = true;
    /* THE HANDOFF OUT OF THE BOTTOM OF THIS SCALE. The globe flies the last
       of the operator's own zoom gesture and then calls this; all that is left
       to do here is put the application on the scale it flew to. The globe
       has already faded itself out by the time this runs, so what the operator
       sees is one continuous move rather than a chip changing under them. */
    try {
      g.onHandoff(function (to, joaKey) {
        globeWanted = false;
        /* Long enough that the page's own render has been through once with
           the chip row already moved, and short enough that a deliberate press
           of GLOBE a moment later still opens it. */
        globeHeldUntil = (window.performance || Date).now() + 2500;
        try { if (to === '3D' && !ready3d()) to = '2D'; } catch (e) { to = '2D'; }
        /* THE OPERATION THE GLOBE FLEW TO IS THE ONE THE SHEET OPENS ON.
           This callback used to take only the scale and throw the operation
           away, so the tactical sheet came up on whatever was already loaded —
           which is the whole of "it always goes to JOA CORAL" seen from this
           end. Loading is app.js's own operation change, the same one its
           picker performs, and it is skipped when the operation is already the
           loaded one so that the ordinary case resets nothing. */
        if (joaKey) {
          selJoa = joaKey;
          var loaded = null;
          try {
            var SC = W.__ANGEL_BUS.scenarios();
            loaded = SC[W.APP.scenarioKey] && SC[W.APP.scenarioKey].joa;
          } catch (e) { loaded = null; }
          if (loaded !== joaKey && appSelectJoa) {
            try { appSelectJoa(joaKey); } catch (e) { /* the sheet still opens */ }
          }
        }
        try { g.unmount(); } catch (e) { /* already down */ }
        var LABEL = { '2D': 'TACTICAL 2D', '3D': 'TACTICAL 3D', 'THEATRE': 'THEATRE' };
        if (!pressScopeChip(LABEL[to] || 'TACTICAL 2D')) {
          try { W.setMapScope(to); } catch (e) { /* the theatre still stands */ }
        }
        fire();
      });
    } catch (e) { /* a globe with no handoff is still a globe */ }
    var okm = false;
    try { okm = !!g.mount(); } catch (e) { okm = false; }
    if (!okm) { globeWanted = false; return false; }
    return true;
  }

  function scope() {
    if (!booted) return null;
    if (globeUp()) return 'GLOBE';
    /* Wanted but not there: it failed or was never able to start. Say what is
       actually on screen. */
    if (globeWanted) globeWanted = false;
    try { return W.mapScopeNow(); } catch (e) { return null; }
  }
  function ready3d() { if (!booted) return false; try { return !!W.map3dReady(); } catch (e) { return false; } }
  function tools(s) {
    if (!booted) return [];
    /* The globe is this file's scale, so its tool row is this file's answer.
       Three controls, the same three the theatre offers and for the same
       reason: it draws no layers and carries one arm. */
    if (s === 'GLOBE') return ['zoomIn', 'zoomOut', 'fit'];
    try { var T = W.__ANGEL_BUS.tools(); return (T && s && T[s]) ? T[s].slice() : []; } catch (e) { return []; }
  }
  function g3() { try { var s = W.ANGEL.get('theater3d'); return s || null; } catch (e) { return null; } }

  /* ---- the layer panel the design draws ---------------------------------
     Two layer sets, because there are two renderers with layers and each
     owns its own. The flat map's live in APP.layers and a render draws the
     change; the GPU map's live inside that module and its own toggles are
     what move them, so those buttons are pressed rather than a second copy
     of its state being kept here. Labels and swatches are the design's. */
  var L2 = [
    ['stable',   'STABLE',            'oklch(0.7 0.14 252)'],
    ['falling',  'RESERVE FALLING',   'oklch(0.79 0.15 75)'],
    ['critical', 'COLLAPSE IMMINENT', 'oklch(0.66 0.2 25)'],
    ['saved',    'SURVIVED',          'oklch(0.74 0.14 165)'],
    /* A death marker is red. It was grey on the canvas this replaces. */
    ['died',     'DIED, SURVIVABLE',  'oklch(0.82 0.15 25)'],
    ['hva',      'HIGH-VALUE',        'oklch(0.82 0.14 75)'],
    ['air',      'MEDICAL AIRCRAFT',  'oklch(0.8 0.12 195)'],
    ['uav',      'COMMAND UAV',       'oklch(0.7 0.1 195)'],
    ['base',     'LAUNCH POINTS',     'oklch(0.95 0.008 250)'],
    ['threat',   'AIR DEFENCE',       'oklch(0.66 0.16 25)'],
    ['geo',      'PLACE NAMES',       'oklch(0.6 0.06 235)'],
    ['grid',     '10 KM GRID',        'oklch(0.62 0.012 250)']
  ];
  var L3 = [
    ['world',   'REAL GEOGRAPHY',   'oklch(0.6 0.06 235)'],
    ['terrain', 'SECTOR TERRAIN',   'oklch(0.5 0.05 150)'],
    ['arcs',    'ROUTE ARCS',       'oklch(0.82 0.13 195)'],
    ['trips',   'AIRCRAFT TRAILS',  'oklch(0.7 0.1 195)'],
    ['cas',     'CASUALTIES',       'oklch(0.7 0.14 252)'],
    ['spikes',  'TIME COLUMNS',     'oklch(0.79 0.15 75)'],
    ['threat',  'THREAT ENVELOPES', 'oklch(0.66 0.16 25)'],
    ['sector',  'SECTORS & UNITS',  'oklch(0.7 0.09 75)'],
    ['labels',  'LABELS',           'oklch(0.9 0.006 250)']
  ];
  function layerState() {
    var s = scope();
    if (s === '3D') { var g = g3(); return (g && g.G3 && g.G3.layers) || null; }
    var a = A(); return a ? a.layers : null;
  }
  function layerDefs() {
    var s = scope(), defs = s === '3D' ? L3 : L2, st = layerState();
    if (!st) return [];
    return defs.filter(function (r) { return r[0] in st; })
      .map(function (r) { return { k: r[0], label: r[1], swatch: r[2], on: !!st[r[0]] }; });
  }
  function toggleLayer(k) {
    var s = scope();
    if (s === '3D') {
      try {
        var b = W.document.querySelector('#g3Toggles [data-l="' + k + '"]');
        if (b) { b.click(); return true; }
      } catch (e) { /* contained */ }
      return false;
    }
    var a = A();
    if (!a || !a.layers || !(k in a.layers)) return false;
    a.layers[k] = !a.layers[k];
    try { W.syncChrome(); W.render(); } catch (e) { try { W.render(); } catch (e2) { /* contained */ } }
    return true;
  }
  function anyLayerOff() {
    var st = layerState();
    if (!st) return false;
    return Object.keys(st).some(function (k) { return !st[k]; });
  }
  function layersAll() {
    var s = scope();
    if (s === '3D') { var g = g3(); return !!(g && g.camera && g.camera.layersAll()); }
    var a = A();
    if (!a || !a.layers) return false;
    var keys = Object.keys(a.layers);
    if (!keys.length) return false;
    var off = keys.some(function (k) { return a.layers[k] === false; });
    keys.forEach(function (k) { a.layers[k] = off; });
    try { W.syncChrome(); W.render(); } catch (e) { try { W.render(); } catch (e2) { /* contained */ } }
    return true;
  }

  /* ---- two arms side by side --------------------------------------------
     A property of the flat tactical sheet only. It is the comparison; the
     theatre picture and the GPU map each carry one arm. */
  function sideBySide() {
    var a = A();
    if (!a || scope() !== '2D') return false;
    a.mapView = a.mapView === 'COMPARE' ? 'COP' : 'COMPARE';
    a._paneForce = true;
    try { W.syncChrome(); W.render(); } catch (e) { try { W.render(); } catch (e2) { /* contained */ } }
    return true;
  }
  function comparing() { var a = A(); return !!(a && a.mapView === 'COMPARE'); }

  /* ---- THE THEATRE PICTURE HAS TWO RENDERERS AND ONE BUS ------------------
     zoomAnyMap('THEATRE') moves APP.theaterView — the camera of the canvas
     map. Where theater3d.js came up that canvas is asleep and the picture on
     screen is a deck.gl surface with a camera that has never heard of
     APP.theaterView: press zoom, the state changes, nothing moves. That
     module bound a second listener to the stage's [data-thzoom] controls for
     exactly this reason, so one press of that element runs app.js's handler
     and the GPU theatre's, each moving its own camera once. That element is
     the bus. If the stage is not up, the helper — which still moves the
     canvas camera — is the honest fallback. */
  function theatre(kind) {
    if (!booted) return false;
    try {
      var el = W.document.querySelector('#theaterStage [data-thzoom="' + kind + '"]');
      if (el) { el.click(); return true; }
    } catch (e) { /* contained */ }
    if (kind === 'fit') return call('fitAnyMap')();
    return call('zoomAnyMap')(kind === 'in' ? 1.5 : 1 / 1.5);
  }

  /* The globe carries its own camera and answers the same three controls. */
  function globeAct(kind) {
    var g = gb();
    if (!g) return false;
    try {
      if (kind === 'fit') return !!g.reset();
      return !!g.zoom(kind === 'in' ? 1.45 : 1 / 1.45);
    } catch (e) { return false; }
  }

  var ACT = {
    zoomIn:     function () { var s = scope(); return s === 'GLOBE' ? globeAct('in') : s === 'THEATRE' ? theatre('in')  : call('zoomAnyMap')(1.5); },
    zoomOut:    function () { var s = scope(); return s === 'GLOBE' ? globeAct('out') : s === 'THEATRE' ? theatre('out') : call('zoomAnyMap')(1 / 1.5); },
    fit:        function () { var s = scope(); return s === 'GLOBE' ? globeAct('fit') : s === 'THEATRE' ? theatre('fit') : call('fitAnyMap')(); },
    layersAll:  layersAll,
    sideBySide: sideBySide
  };

  /* ---- the roll of operations, read out of the engine --------------------
     theaterRoll() is app.js's, over joaStatus(), which reports the loaded
     operation off the live arm and the rest of the combatant command off the
     same engine's deterministic feed. Not one of these figures is written
     down here. */
  function roll() {
    if (!booted) return null;
    try {
      var r = W.theaterRoll(W.APP.theaterKey);
      var SC = W.__ANGEL_BUS.scenarios();
      var activeJoa = SC[W.APP.scenarioKey] && SC[W.APP.scenarioKey].joa;
      if (!selJoa) selJoa = activeJoa;
      return {
        key: r.th.key, label: r.th.label,
        casualties: r.casualties, open: r.open, died: r.died,
        air: r.air, fleet: r.fleet, ops: r.rows.length,
        sel: selJoa,
        rows: r.rows.map(function (x) {
          return {
            key: x.joa.key, name: x.joa.name, force: x.joa.force, posture: x.joa.posture,
            note: x.joa.note, live: x.joa.key === activeJoa,
            casualties: x.st.casualties, open: x.st.open, died: x.st.died,
            air: x.st.air, fleet: x.st.fleet, blood: x.st.blood, level: x.st.level
          };
        })
      };
    } catch (e) { return null; }
  }

  /* ---- the record card ---------------------------------------------------
     APP.sel is the application's own selection, set by its own pick handler
     on whichever tactical canvas was clicked. */
  function record() {
    if (!booted) return null;
    try {
      var a = W.APP;
      if (!a.sel || a.sel.kind !== 'cas') return null;
      var c = a.armA.casualties.find(function (x) { return x.id === a.sel.id; });
      if (!c) return null;
      var now = a.tView == null ? a.t : a.tView;
      var left = c.deadlineMin >= 9000 ? null : (c.tInjury + c.deadlineMin) - now;
      return {
        id: 'CAS-' + String(c.id).padStart(3, '0'),
        unit: c.unitName || c.unit,
        triage: c.cls,
        injury: c.injury.replace(/_/g, ' ').toLowerCase(),
        responder: c.responder,
        reserve: Math.round(c.crmAt(now)),
        left: left,
        wounded: c.tInjury,
        outcome: c.outcome,
        treated: c.treated
      };
    } catch (e) { return null; }
  }

  /* ---- the figures under the map -----------------------------------------
     Read out of the running arm at the moment they are asked for. REACH IS
     THE ALLOCATOR'S OWN MODEL, published by page-grouped so that this row
     and the tasking pane cannot disagree about whether an aircraft can get
     there; where that module has not loaded, reach is reported as unknown
     rather than guessed at with a radius of my own. RESERVE CRITICAL is the
     simulation's own floor, PARAMS.CRM_RED, not a threshold invented here.
     THE DEATH FIGURE IS THE SURVIVABLE COHORT, counted by the application's
     own COUNT service, and it is red wherever it is drawn. */
  function figures() {
    if (!booted) return null;
    try {
      var a = W.APP, arm = a.armA;
      var now = a.tView == null ? a.t : a.tView;
      var open = arm.casualties.filter(function (c) { return c.outcome === null && !c.treated && c.tInjury <= now; });

      var reach = null;
      try {
        var g = W.ANGEL.get('grouped');
        if (g && g.survey && g.place) {
          var S = g.survey();
          if (S) {
            reach = 0;
            open.forEach(function (c) { if (g.place(S, c).n > 0) reach++; });
          }
        }
      } catch (e) { reach = null; }

      var red = null;
      try { var P = W.__ANGEL_BUS.params(); if (P) red = P.CRM_RED; } catch (e) { red = null; }
      var crit = red == null ? null
        : open.filter(function (c) { return c.deadlineMin < 9000 && c.crmAt(now) < red; }).length;

      return {
        admitted: arm.casualties.filter(function (c) { return c.tInjury <= now; }).length,
        open: open.length,
        reach: reach,
        crit: crit,
        died: W.COUNT ? W.COUNT.deathsSurvivable(arm) : arm.casualties.filter(function (c) { return c.outcome === 'DIED'; }).length,
        air: arm.drones.filter(function (d) { return d.state !== 'IDLE' && d.state !== 'LOST'; }).length,
        fleet: arm.drones.length,
        name: a.world.scn.name,
        joa: a.world.scn.joa || a.world.scn.name,
        gridZone: a.world.scn.gridZone || '',
        force: a.world.scn.friendly || '',
        aor: a.world.scn.aor || '',
        widthKm: a.world.scn.widthKm, heightKm: a.world.scn.heightKm,
        bases: arm.bases.length,
        deployed: !!(a.deploy && a.deploy.state === 'DEPLOYED'),
        t: now
      };
    } catch (e) { return null; }
  }

  /* ---- ONE CLOCK, AND THE APPLICATION'S OWN LOOP IS WHAT TURNS IT --------
     The design's clock is a 120 ms interval; the map's is app.js's animation
     frame. Nothing here moves the map's clock by hand while a run is going:
     it reads how fast the design's minute is passing, hands that rate to the
     application as its own speed, and leans on that rate to take out drift.
     A seek is kept for what a seek is — a scrub, a reset, a stopped clock. */
  var clk = { t: null, at: 0, rate: 0, still: 0 };
  var SEEK_MIN = 3.0;   /* minutes of divergence past which this is a scrub */

  /* WHEN THE CHROME STOPS, IT STOPS TALKING ---------------------------------
     The design's clock is its own 120 ms interval and this file hears it only
     because a run re-renders the page. Pause the run and the re-renders stop
     with it: no more calls arrive here, and a map that had been told to run
     would run on alone. So the last word is timed, and going quiet is itself
     the instruction — the map holds where it is, within a fifth of a second
     of the chrome holding where it is. */
  setInterval(function () {
    if (!booted || clk.t == null) return;
    try {
      var a = W.APP;
      if (!a.running) return;
      var quiet = (W.performance || performance).now() - clk.at;
      /* THE PAUSE ANNOUNCES ITSELF ONCE. Stopping the run re-renders the page
         one last time, and that render asks for the same minute it asked for
         before — so a call that carried no minute, followed by silence, is a
         pause. A call that carried a minute followed by silence is only a
         page drawing slowly, and a slow page is not a stopped clock: on a
         machine where the GPU theatre runs at ten frames a second the gap
         between two renders is longer than a pause would ever be, and a map
         held every time it opened would be the stutter back again. The long
         limit is the failsafe under both. */
      if (quiet < (clk.still > 0 ? 220 : 1500)) return;
      a.running = false; a.tView = a.t;
      clk.t = null; clk.rate = 0; clk.still = 0;
    } catch (e) { /* contained */ }
  }, 90);

  function clock(a, t) {
    var now = (W.performance || performance).now();
    var prev = clk.t, prevAt = clk.at;
    clk.t = t; clk.at = now;

    /* first call after arriving, deploying, recalling or being held: stand
       the map on the minute the chrome is on, and wait to be told a rate.
       WHERE THE MAP IS A LITTLE AHEAD it is left alone: it ran on for the
       fraction of a second it took the chrome to say it had stopped, and
       walking that back through the servo costs nothing, where seeking
       backwards costs a reset and a re-run of the whole simulation. */
    if (prev == null) {
      var d0 = t - a.t;
      if (d0 < 0 && d0 > -SEEK_MIN) return false;
      if (Math.abs(d0) >= a.dt) { W.seekAppTo(t); return true; }
      return false;
    }

    var dt = t - prev, real = (now - prevAt) / 1000;

    if (dt < -1e-6) {                     /* scrubbed backwards */
      clk.rate = 0; clk.still = 0;
      W.seekAppTo(t);
      return true;
    }
    if (dt > 60) {                        /* scrubbed forward, not run forward */
      clk.rate = 0; clk.still = 0;
      W.seekAppTo(t);
      if (!a.finished) { a.running = true; a.acc = 0; }
      return true;
    }

    if (dt < 1e-6) {                      /* the chrome's clock did not move */
      /* One still reading is not a pause — the design re-renders a little
         faster than it advances its clock, so a render lands between two
         ticks often enough. It is marked, and the watch above turns a mark
         followed by silence into the hold. */
      if (++clk.still < 3) return false;
      clk.rate = 0;
      if (a.running) { a.running = false; a.tView = a.t; }
      if (Math.abs(t - a.t) >= a.dt) { W.seekAppTo(t); return true; }
      return false;
    }

    clk.still = 0;
    /* MINUTES PER SECOND, read off the design's own clock and smoothed —
       the interval that moves it does not keep perfect time. */
    var seen = real > 0.01 ? dt / real : clk.rate;
    /* A clock rate, not a scrub disguised as one: the chrome offers 1, 2, 4
       and 10 minutes a second and nothing outside that band is a rate. */
    seen = Math.max(0.05, Math.min(60, seen));
    clk.rate = clk.rate ? clk.rate * 0.7 + seen * 0.3 : seen;

    var err = t - a.t;
    if (Math.abs(err) > SEEK_MIN) {       /* too far apart to close by leaning */
      clk.rate = seen;
      W.seekAppTo(t);
      if (!a.finished) { a.running = true; a.acc = 0; }
      return true;
    }
    /* THE SERVO. Faster while behind, slower while ahead, and never moved by
       hand — a jump is the thing this is here to stop. */
    a.speed = Math.max(clk.rate * 0.25, Math.min(clk.rate * 2.5, clk.rate * (1 + 0.6 * err)));
    if (!a.running && !a.finished) { a.running = true; a.acc = 0; }
    return true;
  }

  window.ANGELMAP = {
    /* is there an application in the dock yet */
    ready: function () { return booted; },
    error: function () { return bootErr; },
    /* WHICH MAP IS DRAWING — app.js's answer, never a local one */
    scope: scope,
    ready3d: ready3d,
    /* IS THERE A MACHINE UNDER THE GLOBE CHIP. False where the scale cannot be
       drawn at all, so the host hides the chip rather than offering a scale
       that will not come up. */
    readyGlobe: readyGlobe,
    /* WHICH CONTROLS MAY BE DRAWN AT THIS SCALE — app.js's table */
    tools: function () { return tools(scope()); },
    setScope: function (s) {
      if (!booted) return false;
      if (s === '3D' && !ready3d()) return false;
      if (s === 'GLOBE') {
        if (!readyGlobe()) return false;
        revealFrame();
        var ok = globeOn();
        fire();
        return ok;
      }
      /* Leaving the globe is the globe coming down first, so the scale that
         is arriving mounts into a stage nothing else is holding. Theatre is
         masked before the globe is removed and revealed only after its
         renderer reports a painted frame, so repeated scale switching cannot
         expose its empty mount or transient loading card. The globe also
         retains its outgoing frame behind that mask until Theatre paints. */
      var leavingGlobeForTheatre = globeWanted && s === 'THEATRE';
      if (leavingGlobeForTheatre) {
        showFrameBlackout();
        maskFrameFor(s);
      }
      if (globeWanted) globeOff(true, leavingGlobeForTheatre);
      try { W.setMapScope(s); }
      catch (e) {
        if (leavingGlobeForTheatre) revealFrame();
        return false;
      }
      fire();
      return true;
    },
    press: function (k) {
      var can = tools(scope());
      if (can.indexOf(k) < 0) return false;
      var fn = ACT[k];
      if (!fn) return false;
      var r = fn();
      fire();
      return r;
    },
    layers: layerDefs,
    toggleLayer: function (k) { var r = toggleLayer(k); fire(); return r; },
    layersAll: function () { var r = layersAll(); fire(); return r; },
    anyLayerOff: anyLayerOff,
    comparing: comparing,
    roll: roll,
    record: record,
    figures: figures,
    selectJoa: function (k) { selJoa = k; globeSelect(k); fire(); return true; },

    /* ---- THE OTHER DIRECTION -------------------------------------------
       Two engines run in this application: angel-engine.js in the design
       shell, and app.js's own APP inside this frame. Nothing synchronised
       them, so picking a theatre on Settings moved the shell's classification
       stamp and its KPI screens while the map underneath carried on drawing
       the operation it had — a screen contradicting itself, which is the one
       thing this project treats as worse than a screen with less on it.

       The globe handoff closes the frame-to-shell direction by calling
       ANGEL_DESIGN.setScenario(). This is the shell-to-frame direction: the
       design calls it when its own scenario changes, and it drives the frame
       through app.js's ORIGINAL selectJoa — captured at bind time on line 451
       before this module replaced it — so the frame takes exactly the path it
       would have taken had the operation been picked on the picture.

       Idempotent by scenario key, so the two directions cannot ping-pong: a
       call naming the operation the frame already holds returns without
       touching anything. */
    setScenario: function (scenarioKey) {
      try {
        var cur = W.APP && W.APP.scenarioKey;
        if (!scenarioKey || scenarioKey === cur) return false;
        var joa = SC[scenarioKey] && SC[scenarioKey].joa;
        if (!joa) return false;
        if (appSelectJoa) appSelectJoa(joa); else if (W.selectJoa) W.selectJoa(joa);
        selJoa = joa; globeSelect(joa); fire();
        return true;
      } catch (e) { return false; }
    },
    /* ---- ONE RUN, NOT TWO --------------------------------------------
       The map would otherwise stand at its own minute under its own posture
       while the chrome around it reported another, and a screen that
       contradicts itself is worse than a screen with less on it. Both are
       put right through the application's own entry points and in the order
       the application itself would take them:

         DEPLOYMENT FIRST, AND AT T+0. openDeployModal() then
         beginDeployment() is the sequence a commander walks — the readiness
         roll, the airframes coming up one at a time, the audit entries
         written as they do. Deploying is what decides who tasked arm A for
         the minutes that follow, so it has to happen before the clock is
         moved, or the run would carry an hour of Class VIII push that the
         rest of the application does not have. recallDeployment() is the
         same door in the other direction.

         THEN THE CLOCK — AND THE CLOCK IS THE APPLICATION'S OWN.
         seekAppTo() is app.js's scrub. It is the right call for a scrub and
         the wrong one for a run: it stops the simulation, walks it forward
         in whole steps of APP.dt and leaves it stopped. Asked eight times a
         second by a design that has moved its own clock 0.12 of a minute,
         it turned a map that used to advance every frame into one that
         teleported: measured against /console.html, the picture moved on
         13% of frames in steps of 0.75 of a minute, where the same renderers
         standing alone moved on 100% of frames in steps of 0.017. That is
         the stutter. It is not a frame rate — the frames were being
         delivered — it is the map being driven in jumps.

         SO THE RUN IS RUN, NOT SEEKED. The application's own loop is what
         advances it, exactly as it does with nothing docked over it, and
         this only tells it how fast and keeps the two clocks together:

           - the rate is read off the design's own clock, from the distance
             its t covers between two of these calls, so a change of speed
             on the chrome arrives here without a second speed control;
           - drift is taken out by leaning on that rate — a little faster
             while the map is behind, a little slower while it is ahead —
             rather than by jumping the map to the right minute, because a
             jump is the thing being fixed;
           - a real scrub, a reset or a stopped clock is still a seek, which
             is what seekAppTo() is for.

         TOLERANCE. A minute is far more than the servo ever needs and far
         less than a scrub; between those two the map is never moved by
         anything but its own loop. */
    sync: function (t, deployed) {
      nudge();
      if (!booted) return false;
      try {
        var a = W.APP, D = a.deploy;
        if (D && D.state === 'DEPLOYING') return false;   // it is coming up
        if (deployed && D && D.state === 'NOT_DEPLOYED') {
          W.openDeployModal('ON_DEMAND');
          W.beginDeployment();
          try { W.closeDeployModal(); } catch (e) { /* contained */ }
          clk.t = null;
          return true;
        }
        if (!deployed && D && D.state === 'DEPLOYED') { W.recallDeployment(); clk.t = null; return true; }
        if (t == null) return false;
        return clock(a, t);
      } catch (e) { return false; }
    },
    onChange: function (fn) { listeners.push(fn); },
    /* the numbers behind the design's own instrumentation, for the probe */
    cameras: function () {
      if (!booted) return null;
      var g = g3(), G = g && g.G3;
      try {
        return {
          theater: Object.assign({}, W.APP.theaterView),
          viewport: Object.assign({}, W.APP.mapViewport),
          zoom3d: G ? (G.view && G.view.zoom != null ? G.view.zoom : G.zoom) : null,
          globe: (function () { var g = gb(); try { return g && g.stats ? g.stats() : null; } catch (e) { return null; } })(),
          view: W.APP.view, mapMode: W.APP.mapMode, mapView: W.APP.mapView
        };
      } catch (e) { return null; }
    }
  };
})();
