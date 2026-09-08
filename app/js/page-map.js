/* ==========================================================================
   THEATER MAP — the ninth destination
   ==========================================================================
   The canvas draws this one as PENDING: a rail entry with no handler behind
   it. So there is no page block to copy. What follows is built out of the
   canvas's own shell language — the header, the segmented control, the tile
   row, the card — around the three map renderers this application already
   has.

   THREE RENDERERS, ONE DESTINATION. ANGEL SWARM draws the ground three ways
   and each keeps its own camera:

     THEATRE      the combatant command and every operation in it, on the
                  DASHBOARD pane. Camera: APP.theaterView {k,tx,ty}.
     TACTICAL 2D  the flat tactical map, MISSION with APP.mapMode '2D'.
                  Camera: APP.mapViewport {zoom,cx,cy}.
     TACTICAL 3D  the same fight on the GPU, MISSION with APP.mapMode '3D'.
                  Camera: inside the theater3d module, reachable only through
                  ANGEL.get('theater3d').camera.

   NONE OF THEM IS RE-IMPLEMENTED HERE. Each is a working renderer with its
   own module, and this page mounts the real one — through DPB, the dock the
   terminal and the wall already use, which adopts <main id="views"> into a
   box that survives the shell's 1 Hz rewrite of #dMain and is positioned
   over an empty slot this page draws. One mechanism, not a second one.

   EVERY CONTROL DISPATCHES THROUGH THE HELPERS THAT ALREADY KNOW WHICH MAP
   IS ON SCREEN — mapScopeNow(), zoomAnyMap(), fitAnyMap(), and the table
   MAP_TOOLS_BY_SCOPE. That table is also what decides which controls are
   drawn: the theatre picture carries no layers and no second arm, so the
   layer panel and side-by-side are not offered there rather than being
   offered and disabled. A control that is present is a control that works.

   THE 3D CONTROL IS NOT DRAWN AT ALL ON A MACHINE THAT CANNOT RUN IT.
   map3dReady() is the whole availability test — the module publishes itself
   only once it has a basemap and an atlas — so there is never a segment on
   screen with nothing behind it.

   DEATHS ARE RED. The theatre roll carries a death count and it takes the
   red family, and the phrase is "dead", never "saved". No figure on this
   page is written down here; every one is read out of the running
   simulation at the moment it is drawn.
   ========================================================================== */
(function () {
  'use strict';
  const P = window.DPB;
  const D = () => window.DSHELL;
  if (!P) return;
  const esc = P.esc;

  /* MAP_TOOLS_BY_SCOPE is a top-level `const` in app.js, which puts it in the
     global lexical scope rather than on `window`, so it is read by bare name
     behind a typeof guard exactly as page-tty.js reads CALLSIGN. If app.js
     has not loaded there are no maps to control and the fallback is empty. */
  const tools = scope => {
    const T = (typeof MAP_TOOLS_BY_SCOPE !== 'undefined') ? MAP_TOOLS_BY_SCOPE : null;
    return (T && scope && T[scope]) ? T[scope] : [];
  };
  const ready3d = () => !!(window.map3dReady && window.map3dReady());
  const scopeNow = () => (window.mapScopeNow ? window.mapScopeNow() : null);
  const g3 = () => {
    try {
      const s = window.ANGEL && ANGEL.get && ANGEL.get('theater3d');
      return s || null;
    } catch (e) { return null; }
  };

  /* ---- which of the three the operator asked for ------------------------
     Held here rather than derived from APP.view, because APP.view is also
     moved by every other destination in the application and this page has to
     remember what was asked for when the operator comes back to it. */
  let want = 'THEATRE';

  const SCOPES = [
    { k: 'THEATRE', label: 'THEATRE',     view: 'DASHBOARD' },
    { k: '2D',      label: 'TACTICAL 2D', view: 'MISSION' },
    { k: '3D',      label: 'TACTICAL 3D', view: 'MISSION' }
  ];

  /* Put the application on the map that was asked for. setMapScope() is the
     one function in app.js that knows THEATRE is a different pane from the
     two tactical views; it is called only when the map on screen is not
     already the one wanted, because it re-renders. */
  function applyScope(s) {
    if (typeof window.setMapScope !== 'function') return;
    /* mapScopeNow() answers "which map is DRAWING", and on a tactical scope
       that is not quite the same question as "which map is SELECTED": with
       APP.mapMode left at '3D' on a machine where the GPU map has withdrawn,
       it truthfully answers '2D' while <body> still carries .map3d and the
       flat map's own canvases are display:none — a scope that reports itself
       correct with nothing on screen. So the mode is checked as well as the
       scope, and setMapScope() is what puts both right. */
    const A = window.APP;
    if (scopeNow() === s && (s === 'THEATRE' || !A || A.mapMode === s)) return;
    try { window.setMapScope(s); } catch (e) { /* a dead switch must not take the page with it */ }
  }

  /* ======================================================================
     THE CONTROLS
     ======================================================================
     Six, and each one asks the scope table whether it can act here before it
     is drawn. The handlers below are the actions themselves; the drawing
     pass never emits a button whose action is not in the table for the scope
     that is on screen.
     ====================================================================== */

  /* The layer panel. On the flat map that is #legend and its .open class; on
     the GPU map it is that renderer's own card, which has its own layer set
     and its own fold. */
  function layerPanel() {
    if (scopeNow() === '3D') {
      const s = g3(); if (s && s.camera) return s.camera.panel();
      return false;
    }
    const lg = document.getElementById('legend');
    if (!lg) return false;
    lg.classList.toggle('open');
    return true;
  }
  function panelOpen() {
    if (scopeNow() === '3D') {
      const s = g3();
      return !!(s && s.camera && s.camera.panelOpen && s.camera.panelOpen());
    }
    const lg = document.getElementById('legend');
    return !!(lg && lg.classList.contains('open'));
  }

  /* Draw everything, or draw none of it and see the terrain. A toggle rather
     than the legend's own "show all", which hides itself once nothing is
     hidden and so would be a control that does nothing half the time. */
  function layersAll() {
    if (scopeNow() === '3D') {
      const s = g3(); if (s && s.camera) return s.camera.layersAll();
      return false;
    }
    const A = window.APP;
    if (!A || !A.layers) return false;
    const keys = Object.keys(A.layers);
    if (!keys.length) return false;
    const anyOff = keys.some(k => A.layers[k] === false);
    keys.forEach(k => { A.layers[k] = anyOff; });
    A._paneForce = true;
    if (typeof window.render === 'function') window.render();
    return true;
  }
  /* Whether anything is currently hidden, so the button can say what
     pressing it will do rather than what it did last time. */
  function anyLayerOff() {
    if (scopeNow() === '3D') {
      const s = g3(); const G = s && s.G3;
      if (!G || !G.layers) return false;
      return Object.keys(G.layers).some(k => !G.layers[k]);
    }
    const A = window.APP;
    if (!A || !A.layers) return false;
    return Object.keys(A.layers).some(k => A.layers[k] === false);
  }

  /* Two arms side by side. A property of the flat tactical map only — it is
     the comparison, and the theatre picture and the GPU map have one arm. */
  function sideBySide() {
    const A = window.APP;
    if (!A || scopeNow() !== '2D') return false;
    A.mapView = A.mapView === 'COMPARE' ? 'COP' : 'COMPARE';
    A._paneForce = true;
    if (typeof window.render === 'function') window.render();
    return true;
  }
  const comparing = () => !!(window.APP && window.APP.mapView === 'COMPARE');

  /* ---- THE THEATRE PICTURE HAS TWO RENDERERS OF ITS OWN -----------------
     This is the trap on this scale and it is invisible from the state.
     `zoomAnyMap('THEATRE')` moves APP.theaterView, which is the camera of the
     CANVAS theatre map — and on any machine where theater3d.js comes up, that
     canvas is asleep (`body.theater3d #mapTheater{display:none}`) and the
     picture on screen is a deck.gl surface with a camera of its own that has
     never heard of APP.theaterView. Press zoom, the state changes, nothing
     moves. That is the exact defect this destination exists to not have.

     theater3d.js wrote its own rendezvous for this and said so: it binds a
     second listener to the stage's `[data-thzoom]` controls "rather than
     replacing it, so the two renderers stay in agreement about where the
     operator wanted to be". One press on that element runs app.js's handler
     — which is zoomAnyMap's THEATRE branch, the same two lines — and the GPU
     theatre's handler, each moving its own camera once. So this row presses
     that element rather than calling the helper directly: not a proxy hoping
     something is behind it, but the one bus both theatre cameras are on.
     `.click()` dispatches to listeners whether or not the element is drawn,
     and this row is the drawn control. If the stage is not in the document
     yet there is no bus, and the helper — which still moves the canvas
     camera — is the honest fallback. */
  function theatre(kind) {
    const el = document.querySelector('#theaterStage [data-thzoom="' + kind + '"]');
    if (el) { el.click(); return true; }
    if (kind === 'fit') return window.fitAnyMap ? window.fitAnyMap() : false;
    return window.zoomAnyMap ? window.zoomAnyMap(kind === 'in' ? 1.5 : 1 / 1.5) : false;
  }

  const ACT = {
    zoomIn:     () => scopeNow() === 'THEATRE' ? theatre('in')
                    : (window.zoomAnyMap && window.zoomAnyMap(1.5)),
    zoomOut:    () => scopeNow() === 'THEATRE' ? theatre('out')
                    : (window.zoomAnyMap && window.zoomAnyMap(1 / 1.5)),
    fit:        () => scopeNow() === 'THEATRE' ? theatre('fit')
                    : (window.fitAnyMap && window.fitAnyMap()),
    legend:     layerPanel,
    layersAll:  layersAll,
    sideBySide: sideBySide
  };

  /* How each control presents itself, and what it says it will do next. */
  function toolFace(k) {
    if (k === 'zoomOut')    return { label: '− ZOOM OUT', on: false };
    if (k === 'zoomIn')     return { label: '+ ZOOM IN',       on: false };
    if (k === 'fit')        return { label: 'FIT',             on: false };
    if (k === 'legend')     return { label: 'LAYER PANEL',     on: panelOpen() };
    /* Not a state light. The label already says what pressing it will do,
       and lighting "HIDE ALL LAYERS" up to mean "everything is drawn" reads
       as the opposite of what it is. */
    if (k === 'layersAll')  return { label: anyLayerOff() ? 'DRAW ALL LAYERS' : 'HIDE ALL LAYERS', on: false };
    if (k === 'sideBySide') return { label: comparing() ? 'SINGLE MAP' : 'SIDE BY SIDE', on: comparing() };
    return { label: k, on: false };
  }
  const ORDER = ['zoomOut', 'zoomIn', 'fit', 'legend', 'layersAll', 'sideBySide'];

  P.act('mapScope', el => {
    const s = el.dataset.mscope;
    if (!s) return;
    if (s === '3D' && !ready3d()) return;
    want = s;
    applyScope(want);
    if (D()) D().paint();
  });
  P.act('mapTool', el => {
    const fn = ACT[el.dataset.mtool];
    if (!fn) return;
    try { fn(); } catch (e) { /* contained: a dead tool must not take the page with it */ }
    if (D()) D().paint();
  });

  /* ---- the map page owns the docked pane while it is on screen ----------
     The DASHBOARD pane carries the theatre picture and then a page's worth of
     tables and settings below it, all of which belong to the old Operations
     screen. On this destination the map is the destination, so a body class
     narrows that pane to its stage. It is set from the presence of this
     page's own slot, so it clears itself the moment the operator leaves. */
  /* AND A MAP MUST BE RE-FITTED WHEN ITS BOX CHANGES SIZE. Every renderer
     here sizes itself from its host at the moment it draws, and while the
     run is paused nothing draws — so arriving on this destination with the
     clock stopped left the canvas at whatever size it had before the dock
     gave it one, stretched to fit. One render when the slot's box actually
     changes, and not one frame more. */
  let box = '';
  setInterval(() => {
    const slot = document.getElementById('mapSlot');
    document.body.classList.toggle('d-map-focus', !!slot);
    if (!slot) { box = ''; return; }
    const r = slot.getBoundingClientRect();
    const k = Math.round(r.width) + 'x' + Math.round(r.height);
    if (k === box || r.width < 8) return;
    box = k;
    if (window.APP) window.APP._paneForce = true;
    try { if (typeof window.render === 'function') window.render(); } catch (e) { /* contained */ }
  }, 200);

  /* ====================================================================== */
  window.DPAGES = window.DPAGES || {};
  window.DPAGES.map = function (L) {
    /* A machine that cannot run the GPU map never sees the control, and never
       sits on a scope it cannot draw. */
    if (want === '3D' && !ready3d()) want = '2D';
    applyScope(want);
    const here = scopeNow();
    const s = SCOPES.find(x => x.k === want) || SCOPES[0];
    P.dock('mapSlot', s.view);

    const avail = SCOPES.filter(x => x.k !== '3D' || ready3d());
    const seg = `<div class="d-seg" role="group" aria-label="Map scale">${
      avail.map(x => `<button type="button" class="${want === x.k ? 'on' : ''}"
        data-bact="mapScope" data-mscope="${x.k}"
        aria-pressed="${want === x.k}">${esc(x.label)}</button>`).join('')}</div>`;

    /* THE TABLE DECIDES WHAT IS DRAWN. Not a style, not an opacity — a
       control that cannot act in this scope is absent from the row. */
    const can = tools(here);
    const row = ORDER.filter(k => can.indexOf(k) >= 0).map(k => {
      const f = toolFace(k);
      return `<button type="button" class="m-tool${f.on ? ' on' : ''}"
        data-bact="mapTool" data-mtool="${k}"
        aria-pressed="${f.on}">${esc(f.label)}</button>`;
    }).join('');

    return `${head(L)}
      <div class="m-bar">${seg}<div class="m-tools">${row}</div></div>
      <div class="m-note">${note(here, can)}</div>
      <div class="m-stage m-${esc(want)}">${P.slot('mapSlot')}</div>
      ${figures(L, want)}`;
  };

  /* ---- the header ------------------------------------------------------- */
  function head(L) {
    const scn = L && L.scn ? L.scn : null;
    return `<div class="d-head">
      <div><h1>Theater Map</h1>
      <p>The same fight at three scales &mdash; the combatant command, the tactical ground,
         and that ground on the GPU. One picture, three renderers.</p></div>
      <div style="display:flex;gap:10px;align-items:center">
        <span class="d-meta">${esc(scn ? (scn.gridZone || scn.name || '') : '')}${
          L ? ' &middot; T+' + Math.floor(L.now) + ' MIN' : ''}</span>
      </div></div>`;
  }

  /* ---- what this renderer is, and what it can be asked ------------------ */
  const NOTE = {
    THEATRE: 'The combatant command and every operation inside it. This picture draws no ' +
             'layers and carries one arm, so the layer panel and the side-by-side comparison ' +
             'are not offered here.',
    '2D':    'The tactical ground. Layers, and the only scale that can hold both arms at once ' +
             '— deadline-ordered allocation beside current triage and proximity, same casualties.',
    '3D':    'The same fight on the GPU. Its camera and its layer set belong to that renderer; ' +
             'the controls below reach it through the renderer’s own camera, not this one’s.'
  };
  function note(here, can) {
    const wait = (want === '3D' && here !== '3D')
      ? '<span class="m-wait">bringing the GPU renderer up &mdash; the controls appear when it is drawing</span>'
      : '';
    return `<span>${esc(NOTE[want] || '')}</span>${wait}
      <span class="m-can">${can.length} CONTROL${can.length === 1 ? '' : 'S'} IN THIS SCALE</span>`;
  }

  /* ---- the figures under the map ----------------------------------------
     Read at the moment of drawing, from the running simulation. The theatre
     scale reports the whole combatant command; the two tactical scales
     report the operation that is loaded. Nothing here is written down. */
  function tile(lab, fig, unit, kind) {
    return `<div class="d-tile${kind ? ' ' + kind : ''}${kind === 'crit' ? ' d-death' : ''}">
      <span class="d-lab">${lab}</span>
      <div class="d-val"><span class="d-fig">${fig}</span>
      <span class="d-unit">${unit}</span></div></div>`;
  }

  function figures(L, scope) {
    if (!L) return '';
    if (scope === 'THEATRE') {
      let r = null;
      try {
        if (typeof theaterRoll === 'function' && window.APP)
          r = theaterRoll(window.APP.theaterKey);
      } catch (e) { r = null; }
      if (!r) return '';
      /* DIED IS A DEATH FIGURE. Red, every triage category, and never
         written as a saving. */
      return `<div class="d-tiles">
        ${tile('OPERATIONS', r.rows.length, 'in this command', '')}
        ${tile('WOUNDED', r.casualties, 'across the command', '')}
        ${tile('STILL DOWN', r.open, 'across the command', '')}
        ${tile('DIED OF WOUNDS', r.died, 'all categories', 'crit')}
        ${tile('AIRCRAFT COMMITTED', r.air, 'of ' + r.fleet + ' in theatre', '')}
      </div>`;
    }
    const blood = shelf(L);
    return `<div class="d-tiles">
      ${tile('OPEN ON THIS GROUND', L.open.length, L.open.length === 1 ? 'casualty' : 'casualties', '')}
      ${tile('UNREACHABLE IN TIME', L.unreachable,
             L.unreachable === 1 ? 'casualty' : 'casualties', L.unreachable ? 'crit' : '')}
      ${tile('AIRBORNE', L.lift.air, 'of ' + L.lift.all + ' &middot; ' + L.lift.ready + ' ready', '')}
      ${tile('BLOOD FORWARD', blood.units, 'U &middot; ' + blood.sites +
             (blood.sites === 1 ? ' site' : ' sites'), '')}
      ${tile('LAUNCH POINTS', (L.A.bases || []).length, 'on this ground', '')}
    </div>`;
  }

  function shelf(L) {
    let units = 0, sites = 0;
    for (const b of (L.A.bases || [])) {
      const s = b.stock || {};
      const u = (s.BLOOD || 0) + (s.PLASMA || 0);
      if (u > 0) sites++;
      units += u;
    }
    return { units, sites };
  }
})();
