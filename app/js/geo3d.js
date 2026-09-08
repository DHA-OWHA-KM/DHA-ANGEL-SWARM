/* =========================================================================
   THEATER 3D — the tactical picture on a GPU.

   The other maps in this application are drawn by hand into a 2D canvas.
   They are correct and they are legible, and they read like an internal
   tool. This one is the same data put on a real map: a pitched, rotatable,
   GPU-rendered surface with the sector's own terrain extruded under it,
   every sortie drawn as an arc over the water, and every casualty carrying
   a light column whose height is how much time that soldier has left.

   Three things are worth stating plainly before the code.

   1. The x,y in the simulation are kilometres in a local grid, not degrees.
      They are anchored here at the real longitude and latitude the theatre
      table gives for that joint operations area, so the sector sits where
      it says it sits and the Natural Earth coastline around it is the real
      one. Inside the sector, the authority is the simulation's own terrain
      field, not Natural Earth, and the extruded terrain block is drawn over
      the real coastline to say so.

   2. Nothing here touches a network. deck.gl carries three CDN strings
      inside it (webgl-debug, spectorjs, a loaders.gl worker template). They
      are only ever reached if a layer is handed a URL as `data` or if debug
      mode is turned on. Every layer below is handed a plain JavaScript
      array, and debug is never set. The Playwright check asserts zero
      requests off 127.0.0.1.

   3. The map is a replay, not a live read of the running arm. It has to be:
      an operator scrubbing backwards needs state at a time the live
      simulation has already passed through and mutated away. So the run is
      re-executed once, deterministically, from the same scenario key and
      seed the application is using, and every position is recorded. That is
      also why scrubbing is instant.

   If WebGL2 is not available this file removes its own navigation entry and
   its own pane, and the existing 2D maps remain the path. A hidden feature
   is fine; a visible one that throws is not.
   ========================================================================= */

const DECK_PATH = 'vendor/deck/deck.min.js';
const BASEMAP_PATH = 'data/basemap.json';

/* Metres per degree. Good to a few parts in a thousand over a 120 km box,
   which is far tighter than anything this map is asked to answer. */
const KM_PER_DEG_LAT = 110.574;
const KM_PER_DEG_LON_EQ = 111.320;

/* The terrain sheet. An earlier build extruded these cells and it was a
   mistake twice over: the staircase read as low-resolution rather than as
   landform, and every casualty standing on high ground was swallowed inside
   the geometry. The sheet is flat now and the relief is carried by hillshade
   and contours, which is what a map does. The height in this view belongs to
   the data — the arcs and the casualty columns — not to the ground. */
const TERRAIN_CELL_KM = 1.2;
const TERRAIN_MARGIN_KM = 24;
const Z_GROUND = 0;

/* --------------------------------------------------------------- palette */
/* Nothing below is a colour. Every entry is a lookup into the theme tokens
   declared four times in css/theme.css, resolved at the moment it is read.
   Desaturated neutrals for everything that is context, saturation reserved
   for the things an operator has to act on — but WHICH neutrals and which
   saturations is the theme's decision, not this file's.

   map.js is a classic script and runs before this module, so window.MAPTHEME
   is always present in the application. The fallback exists because a module
   that throws inside a GPU frame takes the whole map with it, and "the theme
   service is missing" is not a good enough reason to lose the 3D map. */
const TFB = {
  'k0': [7, 10, 13], 'm-sea': [12, 24, 34], 'm-land': [59, 76, 42], 'm-ao': [143, 180, 255],
  'm-track': [111, 211, 242], 'm-grid': [32, 57, 75], 'm-halo': [3, 8, 13],
  't-hi': [233, 239, 244], 't-mid': [175, 190, 203], 't-lo': [141, 156, 170], 't-dim': [122, 136, 148],
  'red': [255, 107, 96], 'red-d': [142, 42, 34], 'amb': [255, 181, 61], 'amb-d': [122, 84, 16],
  'org': [255, 139, 74], 'grn': [78, 211, 155], 'grn-d': [30, 107, 62], 'yel': [239, 214, 74],
  'cyan': [111, 211, 242], 'cyan-d': [23, 73, 94], 'blue': [143, 180, 255], 'blue-d': [44, 79, 145],
  'slate': [175, 190, 203], 'grey': [154, 168, 180]
};
/* [r,g,b] for a token. */
function TK(n) {
  const m = window.MAPTHEME;
  if (m) { try { return m.rgb(n); } catch (e) { /* fall through */ } }
  return (TFB[n] || [0, 0, 0]).slice();
}
/* [r,g,b] between two tokens. */
function TMIX(a, b, u) {
  const m = window.MAPTHEME;
  if (m) { try { return m.mixRGB(a, b, u); } catch (e) { /* fall through */ } }
  const A = TFB[a] || [0, 0, 0], B = TFB[b] || [0, 0, 0];
  return [Math.round(A[0] + (B[0] - A[0]) * u), Math.round(A[1] + (B[1] - A[1]) * u),
          Math.round(A[2] + (B[2] - A[2]) * u)];
}
/* 'rgba(...)' / '#rrggbb' for the canvas passes that draw the icon atlas. */
function TCSS(n, a) {
  const c = TK(n);
  return a === undefined ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'
                         : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
}
function TMIXCSS(a, b, u, alpha) {
  const c = TMIX(a, b, u);
  return alpha === undefined ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'
                             : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')';
}
/* The theme generation every baked bitmap in this module is keyed on. */
function TGEN() { const m = window.MAPTHEME; return m ? m.gen() : 0; }

const C = {
  get seaShelf() { return TMIX('m-sea', 'm-grid', 0.9); },
  get seaMid()   { return TK('m-sea'); },
  get seaAbyss() { return TMIX('m-sea', 'm-halo', 0.72); },
  get neLand()   { return TMIX('m-land', 'm-halo', 0.62); },
  get neCoast()  { return TMIX('m-sea', 't-hi', 0.42); },
  get border()   { return TMIX('m-grid', 't-lo', 0.34); },
  get grat()     { return TMIX('m-grid', 't-lo', 0.5); },
  get frame()    { return TK('m-ao'); },
  get ink()      { return TK('t-hi'); },
  get dim()      { return TK('t-mid'); },
  get faint()    { return TK('t-lo'); },
  get good()     { return TK('grn'); },
  get warn()     { return TK('amb'); },
  get bad()      { return TK('red'); },
  get base()     { return TK('cyan'); },
  get drone()    { return TK('yel'); },
  get sector()   { return TMIX('m-ao', 'm-grid', 0.45); }
};

/* Triage colour. A dead casualty is grey — never green, never anything that
   could be mistaken at a glance for a good outcome. */
/* Doctrinal, in every theme: IMMEDIATE red, DELAYED yellow, MINIMAL green,
   EXPECTANT grey. The previous EXPECTANT was a violet, which said nothing a
   reviewer could read off a legend and nothing the contract recognises. */
const TRIAGE = {
  get IMMEDIATE() { return TK('red'); },
  get DELAYED()   { return TK('yel'); },
  get MINIMAL()   { return TK('grn'); },
  get EXPECTANT() { return TK('grey'); }
};
/* A death is never green. */
const OUTCOME_COL = {
  get DIED()    { return TK('grey'); },
  get SAVED()   { return TK('grn'); },
  get TREATED() { return TK('grn'); }
};

const PAYLOAD_COL = {
  get BLOOD()      { return TK('red'); },
  get PLASMA()     { return TK('amb'); },
  get TXA()        { return TK('blue'); },
  get TQ_KIT()     { return TK('grn'); },
  get CHEST_SEAL() { return TK('slate'); }
};
const PAYLOAD_ORDER = ['BLOOD', 'PLASMA', 'TXA', 'TQ_KIT', 'CHEST_SEAL'];
/* The same five colours as custom-property NAMES, for the legend. The legend
   is HTML and is built once, at mount; naming the token rather than resolving
   it means the swatches re-theme with the stylesheet instead of going stale
   the moment the operator changes theme without leaving the view. */
const PAYLOAD_VAR = { BLOOD: '--red', PLASMA: '--amb', TXA: '--blue',
                      TQ_KIT: '--grn', CHEST_SEAL: '--slate' };

/* ==================================================================== */
/*  PROJECTION                                                          */
/*  Local kilometres to longitude and latitude.                         */
/* ==================================================================== */

/* scn.aor is only a label ("JOA CORAL"); the real position lives in the
   theatre table, one entry per joint operations area, with the scenario key
   it resolves to. That is the anchor. */
function anchorFor(scn) {
  if (typeof THEATERS === 'undefined') return null;
  for (const th of Object.values(THEATERS)) {
    for (const j of th.joas || []) {
      if (j.scenario === scn.key) return { lon: j.lon, lat: j.lat, theater: th.key, joa: j, th };
    }
  }
  return null;
}

/* y increases SOUTHWARD in the simulation grid (a place at y=6 is described
   as the northern flank), so latitude runs the other way from y. */
function projectorFor(scn) {
  const a = anchorFor(scn) || { lon: 0, lat: 0, theater: 'PACOM' };
  const kmPerDegLon = KM_PER_DEG_LON_EQ * Math.cos(a.lat * Math.PI / 180);
  const P = (x, y, z) => {
    const lon = a.lon + (x - scn.widthKm / 2) / kmPerDegLon;
    const lat = a.lat + (scn.heightKm / 2 - y) / KM_PER_DEG_LAT;
    return z === undefined ? [lon, lat] : [lon, lat, z];
  };
  P.anchor = a;
  P.kmPerDegLon = kmPerDegLon;
  P.degLonPerKm = 1 / kmPerDegLon;
  P.degLatPerKm = 1 / KM_PER_DEG_LAT;
  P.inv = (lon, lat) => ({
    x: (lon - a.lon) * kmPerDegLon + scn.widthKm / 2,
    y: scn.heightKm / 2 - (lat - a.lat) * KM_PER_DEG_LAT
  });
  return P;
}

/* A circle of radius r kilometres about a grid point, as a ring of lon/lat.
   Drawn in degrees rather than as a screen-space circle so it stays a real
   distance when the camera pitches. */
function ringKm(P, cx, cy, r, n) {
  n = n || 64;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2;
    out.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return out;
}

/* ==================================================================== */
/*  BASEMAP DATA                                                        */
/* ==================================================================== */

/* The file on disk stores each ring as a flat array of integer
   millidegrees, first pair absolute and every later pair a delta. It costs
   six lines to undo and it halved the file. */
function decodeRing(flat) {
  const out = new Array(flat.length / 2);
  let x = 0, y = 0;
  for (let i = 0; i < flat.length; i += 2) {
    x += flat[i]; y += flat[i + 1];
    out[i / 2] = [x / 1000, y / 1000];
  }
  return out;
}

let BASEMAP = null;
async function loadBasemap() {
  if (BASEMAP) return BASEMAP;
  const raw = await ANGEL.fetchJSON(BASEMAP_PATH);
  const out = {};
  for (const [k, r] of Object.entries(raw.regions)) {
    out[k] = {
      bbox: r.bbox,
      land: r.land.map(poly => poly.map(decodeRing)),
      bboxes: r.bboxes.map(b => b.map(v => v / 1000)),
      coarse: r.coarse.map(poly => poly.map(decodeRing)),
      borders: r.borders.map(decodeRing)
    };
  }
  BASEMAP = { regions: out, note: raw.note };
  return BASEMAP;
}

/* ==================================================================== */
/*  REPLAY                                                              */
/*  Re-run the scenario once, record everything, then read it at any t.  */
/* ==================================================================== */

const STEP_MIN = 0.25;                 // same step the live application uses
const ST = { IDLE: 0, OUTBOUND: 1, ONSTATION: 4, RETURNING: 2, LOST: 3 };
/* What the aircraft is doing, in the words the 2D map uses. "On station" is
   its own state on purpose: arriving and delivering are not the same event,
   and an operator watching a drone sit over a casualty for two minutes needs
   to be told that is a hold and not a stall. */
const ST_LABEL = ['IDLE', 'OUTBOUND', 'RTB', 'LOST', 'ON STATION'];

/* ------------------------------------------------------------------------
   AIRCRAFT POSITION. Read from the leg the aircraft is flying rather than
   from the position the simulation leaves on the object, because that
   position is wrong for about a minute after every delivery.

   The simulation advances an aircraft along its leg with
       frac = total <= 0 ? 1 : Math.min(1, (tNow - d.tDepart) / total)
   and, when a delivery completes, sets the next leg's `tDepart` to
   `tNow + HANDOFF_MIN` — 1.2 minutes in the future — so the aircraft holds
   while the package is handed over. But `frac` is clamped only at the top.
   For those 1.2 minutes it is NEGATIVE, and the aircraft is extrapolated
   BACKWARDS along the new leg: away from the base it is returning to, or
   away from the next casualty on the route, by `HANDOFF_MIN / legMinutes` of
   the leg's whole length. It then flies forward through the same point.

   Measured on PACOM_CORAL seed 42: this happens at every ON STATION → RTB
   and every multi-leg handoff — 20 of 80 state transitions in the run — and
   the drawn heading is reversed by exactly 180 degrees for the duration. On
   the shortest legs it is severe: TRV-02 at t=12 flies 68% of its return leg
   in the wrong direction before turning round. This is what the operator saw
   as an aircraft "overshooting in the wrong direction" on departure.

   The 2D map never shows it because `dronePos` in map.js re-derives the
   position with `Math.max(0, Math.min(1, …))`. This does the same, so the
   aircraft holds over the casualty for the handoff and then departs on the
   correct bearing. The defect is in the simulation, not here; correcting it
   at the point of reading keeps this module to its own file.
   ------------------------------------------------------------------------ */
function legPos(d, tAt) {
  if (d.state === 'OUTBOUND' && d.tArrive != null) {
    const tot = d.tArrive - d.tDepart;
    const f = tot <= 0 ? 1 : Math.max(0, Math.min(1, (tAt - d.tDepart) / tot));
    return [d.fromX + (d.destX - d.fromX) * f, d.fromY + (d.destY - d.fromY) * f];
  }
  if (d.state === 'RETURNING' && d.tHome != null) {
    const tot = d.tHome - d.tDepart;
    const f = tot <= 0 ? 1 : Math.max(0, Math.min(1, (tAt - d.tDepart) / tot));
    return [d.fromX + (d.baseX - d.fromX) * f, d.fromY + (d.baseY - d.fromY) * f];
  }
  return [d.x, d.y];
}

/* The bearing of the leg as a whole, used while the aircraft is holding on
   station and the bearing to its destination is undefined. Falls back to the
   heading it last had, so a parked airframe never snaps to north. */
function legBearing(d, prev) {
  const tx = (d.state === 'RETURNING' ? d.baseX : d.destX) - d.fromX;
  const ty = (d.state === 'RETURNING' ? d.baseY : d.destY) - d.fromY;
  if (Math.abs(tx) + Math.abs(ty) < 1e-4) return prev || 0;
  return (Math.atan2(tx, -ty) * 180 / Math.PI + 360) % 360;
}

/* Run the whole mission and keep the parts a map needs. Everything is stored
   as typed arrays indexed by step, so reading the state at an arbitrary time
   is two array lookups and a lerp — which is what makes the scrubber feel
   like a video scrubber rather than a recomputation. */
function recordRun(cfg) {
  const t0 = performance.now();
  const world = createWorld(cfg.scenarioKey, cfg.seed);
  const scn = world.scn;
  const dur = scn.durationMin;
  const steps = Math.round(dur / STEP_MIN);

  const arm = createArm(world, 'ANGEL SWARM', cfg.angelFrom === 0 ? 'ANGEL' : 'CURRENT', cfg.mode);
  arm.telementor = !!cfg.telementor;
  arm.hitl = false;                     // a replay has nobody to press approve
  arm.hvaWeight = cfg.hvaWeight || 1;
  const rng = makeRNG(cfg.seed * 3 + 1);

  const P = projectorFor(scn);

  const drones = arm.drones.map(d => ({
    id: d.id, type: d.type, label: d.plat.label, baseName: d.baseName,
    baseX: d.baseX, baseY: d.baseY,
    call: (typeof CALLSIGN !== 'undefined' && CALLSIGN[d.type] ? CALLSIGN[d.type] : d.type) +
          '-' + String(d.id).padStart(2, '0'),
    xs: new Float32Array(steps + 1), ys: new Float32Array(steps + 1),
    st: new Uint8Array(steps + 1), tgt: new Int16Array(steps + 1),
    pl: new Int8Array(steps + 1), cold: new Float32Array(steps + 1),
    /* Where the aircraft is going, recorded per step so the map can draw the
       leg it is flying and put a reticle on the casualty at the end of it —
       the 2D map's dashed line to the target, which is most of how an
       operator answers "what is that thing doing". */
    dx: new Float32Array(steps + 1), dy: new Float32Array(steps + 1),
    /* Compass bearing of the airframe, recorded rather than differenced. */
    hd: new Float32Array(steps + 1),
    /* 0 = not on station, 1 = releasing the package, 2 = recovering it. */
    os: new Uint8Array(steps + 1),
    trips: [], _cur: null, _sortie: 0
  }));
  const byId = new Map(drones.map(d => [d.id, d]));
  drones.forEach(d => { d.xs[0] = d.baseX; d.ys[0] = d.baseY; d.pl[0] = -1; d.dx[0] = d.baseX; d.dy[0] = d.baseY; });

  const sorties = [];

  /* Blood on the shelf, per launch point, per step. The 2D map prints this as
     a chip on the pad and it is one of the few numbers on the picture that
     answers a question the operator can act on — a launch point down to its
     last unit is a launch point that is about to stop mattering. The live arm
     only ever holds the current figure, so it is sampled here. */
  const stock = arm.bases.map(() => new Float32Array(steps + 1));
  arm.bases.forEach((b, i) => { stock[i][0] = b.stock.BLOOD; });

  for (let i = 0; i < steps; i++) {
    const t = i * STEP_MIN;
    if (cfg.angelFrom != null && t >= cfg.angelFrom) arm.allocatorKey = 'ANGEL';
    stepArm(arm, world, t, STEP_MIN, rng);
    const tn = t + STEP_MIN;
    const k = i + 1;

    for (let bi = 0; bi < arm.bases.length; bi++) stock[bi][k] = arm.bases[bi].stock.BLOOD;

    for (const d of arm.drones) {
      const r = byId.get(d.id);
      if (!r) continue;
      const p = legPos(d, tn);
      r.xs[k] = p[0]; r.ys[k] = p[1];
      r.st[k] = ST[d.state] === undefined ? 0 : ST[d.state];
      r.tgt[k] = d.target || 0;
      r.pl[k] = d.payloadKey ? PAYLOAD_ORDER.indexOf(d.payloadKey) : -1;
      r.cold[k] = d.coldC == null ? 0 : d.coldC;
      r.os[k] = d.onStation ? (d.onStation.phase === 'RELEASING' ? 1 : 2) : 0;
      /* On station is a phase of an outbound sortie, not a state of its own.
         The abort path leaves `onStation` set on an aircraft that has already
         turned for home, and reading it unconditionally labelled a
         cold-chain abort as ON STATION for the whole flight back. */
      if (d.onStation && d.state === 'OUTBOUND') r.st[k] = ST.ONSTATION;
      if (d.state === 'RETURNING') { r.dx[k] = d.baseX; r.dy[k] = d.baseY; }
      else if (d.destX != null) { r.dx[k] = d.destX; r.dy[k] = d.destY; }
      else { r.dx[k] = p[0]; r.dy[k] = p[1]; }

      /* Heading is recorded, not differenced at draw time. Bearing to the
         destination is correct on every leg — an aircraft flying a straight
         leg is by definition pointing at the end of it — and it is defined
         while the aircraft is holding, which a frame difference is not. */
      const bx = r.dx[k] - p[0], by = r.dy[k] - p[1];
      r.hd[k] = (Math.abs(bx) + Math.abs(by) > 1e-4)
        ? (Math.atan2(bx, -by) * 180 / Math.PI + 360) % 360
        : legBearing(d, r.hd[k - 1]);

      // A new sortie identifier means the aircraft has just been launched;
      // the route it carries is the tasking, and it is only intact now.
      if (d.sortieId && d.sortieId !== r._sortie && d.route && d.route.length) {
        r._sortie = d.sortieId;
        sorties.push({
          id: d.sortieId, droneId: d.id, type: d.type, label: d.plat.label,
          tLaunch: tn, tReturn: null, baseX: d.baseX, baseY: d.baseY,
          legs: d.route.map(l => ({ casId: l.casId, payloadKey: l.payloadKey, x: l.x, y: l.y }))
        });
      }

      // Trips are broken wherever the aircraft is not flying, so the trail
      // never draws the teleport back onto the pad at the end of a sortie.
      const flying = d.state === 'OUTBOUND' || d.state === 'RETURNING';
      if (flying) {
        if (!r._cur) { r._cur = { path: [], timestamps: [], type: d.type }; }
        r._cur.path.push(P(p[0], p[1], 260));
        r._cur.timestamps.push(tn);
      } else if (r._cur) {
        if (r._cur.path.length > 1) r.trips.push(r._cur);
        r._cur = null;
      }
    }
  }
  for (const r of drones) { if (r._cur && r._cur.path.length > 1) r.trips.push(r._cur); r._cur = null; }
  finalize(arm, dur);

  const sByI = new Map(sorties.map(s => [s.id, s]));
  for (const s of arm.sortieLog) {
    const rec = sByI.get(s.id);
    if (rec) rec.tReturn = s.tReturn == null ? dur : s.tReturn;
  }
  for (const s of sorties) if (s.tReturn == null) s.tReturn = dur;

  /* Casualties. Every field the map or the tooltip reads, and two derived
     times: when an aircraft was first committed to this casualty, and when
     something was actually put in the hands of whoever is with them. */
  const firstTask = new Map();
  for (const s of sorties) {
    for (const l of s.legs) {
      const prev = firstTask.get(l.casId);
      if (prev === undefined || s.tLaunch < prev) firstTask.set(l.casId, s.tLaunch);
    }
  }
  const delivered = new Map();
  for (const d of arm.deliveryLog) {
    if (!d.ok) continue;
    const prev = delivered.get(d.casId);
    if (prev === undefined || d.t < prev) delivered.set(d.casId, d.t);
  }

  const cas = arm.casualties.map(c => ({
    id: c.id, x: c.x, y: c.y, pos: P(c.x, c.y),
    cls: c.cls, injury: c.injury, unit: c.unitName, role: c.role,
    responder: c.responder, hva: !!c.hva, needs: (c.needs || []).slice(),
    tInjury: c.tInjury, deadlineMin: c.deadlineMin,
    deadlineAt: c.deadlineMin >= 9000 ? Infinity : c.tInjury + c.deadlineMin,
    tTreated: c.tTreated, treatedWith: c.treatedWith,
    tResolved: c.tResolved, outcome: c.outcome,
    tTasked: firstTask.has(c.id) ? firstTask.get(c.id) : null,
    tDelivered: delivered.has(c.id) ? delivered.get(c.id) : null,
    reachN: c.reachN
  }));

  const arcs = [];
  for (const s of sorties) {
    let px = s.baseX, py = s.baseY;
    for (const l of s.legs) {
      arcs.push({
        from: P(px, py, 120), to: P(l.x, l.y, 90),
        payloadKey: l.payloadKey, col: PAYLOAD_COL[l.payloadKey] || C.dim,
        t0: s.tLaunch, t1: s.tReturn, casId: l.casId, droneId: s.droneId,
        label: s.label
      });
      px = l.x; py = l.y;
    }
  }

  return {
    cfg, scn, world, arm, P, steps, dur, stock,
    drones, sorties, arcs, cas,
    sectors: (arm.sectors || []).map(k => ({ x: k.x, y: k.y, r: k.r })),
    stats: arm.stats,
    buildMs: performance.now() - t0
  };
}

/* State at an arbitrary time, from the recording. Position is interpolated
   between the quarter-minute steps the simulation actually took: at a replay
   rate of thirty simulated minutes a second the raw steps land two per frame
   and the aircraft visibly hops, and at a rate of one they land every fourth
   frame and it crawls. The lerp makes the motion continuous at every rate.
   The discrete fields — state, target, payload — are read from the nearer
   step, because there is no sensible half-way between OUTBOUND and RTB.

   The lerp is refused across a discontinuity. Nothing in the corrected
   recording should move faster than an aircraft can fly, but an aircraft
   that is re-tasked or destroyed can legitimately have its recorded position
   reset between two steps, and drawing a straight line through that gap puts
   the airframe somewhere it never was. Beyond a step the platform could not
   physically cover, the position snaps instead. */
const MAX_KM_PER_STEP = 3;             // ~720 km/h at a quarter-minute step
function droneAt(r, t) {
  const f = Math.max(0, Math.min(r.xs.length - 1, t / STEP_MIN));
  const i = Math.min(r.xs.length - 2, Math.floor(f));
  const u = f - i;
  const k = Math.round(f);
  const jump = Math.hypot(r.xs[i + 1] - r.xs[i], r.ys[i + 1] - r.ys[i]);
  const g = jump > MAX_KM_PER_STEP ? (u < 0.5 ? 0 : 1) : u;
  const x = r.xs[i] + (r.xs[i + 1] - r.xs[i]) * g;
  const y = r.ys[i] + (r.ys[i + 1] - r.ys[i]) * g;
  /* Heading turns the short way round the compass, so an aircraft crossing
     north between two steps rolls through 350-10 rather than spinning the
     long way through the whole circle. */
  const h0 = r.hd[i], h1 = r.hd[i + 1];
  let dh = ((h1 - h0 + 540) % 360) - 180;
  return {
    x, y,
    st: r.st[k], tgt: r.tgt[k], pl: r.pl[k], cold: r.cold[k],
    os: r.os[k], dx: r.dx[k], dy: r.dy[k],
    hdg: (h0 + dh * g + 360) % 360
  };
}

/* The casualty's situation at time t, expressed the way a medical officer
   would read it. `urgency` is 0 when there is all the time in the world and
   1 at the deadline, and it is what drives both the light column and the
   rate of the pulse. */
function casAt(c, t) {
  if (t < c.tInjury) return null;
  if (c.tResolved != null && t >= c.tResolved) {
    return { state: c.outcome === 'DIED' ? 'DIED' : 'SAVED', urgency: 0 };
  }
  if (c.tTreated != null && t >= c.tTreated) return { state: 'TREATED', urgency: 0 };
  const inbound = c.tTasked != null && t >= c.tTasked;
  if (!isFinite(c.deadlineAt)) return { state: inbound ? 'INBOUND' : 'OPEN', urgency: 0, left: Infinity };
  const left = c.deadlineAt - t;
  const span = Math.max(1, c.deadlineMin);
  const urgency = Math.max(0, Math.min(1, 1 - left / span));
  return { state: inbound ? 'INBOUND' : 'OPEN', urgency, left };
}

/* ==================================================================== */
/*  TERRAIN BLOCK                                                       */
/* ==================================================================== */

/* Hypsometric ramp, kept dark and cool. Every colour on this sheet is
   context; saturation is reserved for the casualties and the aircraft, and a
   basemap that competes with them for attention is a basemap that has failed
   at its job. */
/* The hypsometric ramp, in tokens: shadowed valley floor at sea level,
   through the theme's own --m-land, to a warm mid-slope and light rock on
   the tops. It is rebuilt whenever the sheet is, which is once per theme. */
function hypsoRamp() {
  return [
    [0, TMIX('m-land', 'm-halo', 0.62)],
    [70, TMIX('m-land', 'm-halo', 0.26)],
    [150, TK('m-land')],
    [240, TMIX('m-land', 'amb-d', 0.44)],
    [330, TMIX('m-land', 't-dim', 0.62)]
  ];
}
let HYPSO = hypsoRamp();
function lerpC(a, b, u) {
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}
function hypso(e) {
  for (let i = 0; i < HYPSO.length - 1; i++) {
    if (e <= HYPSO[i + 1][0]) {
      return lerpC(HYPSO[i][1], HYPSO[i + 1][1],
        (e - HYPSO[i][0]) / (HYPSO[i + 1][0] - HYPSO[i][0]));
    }
  }
  return HYPSO[HYPSO.length - 1][1];
}
function bathy(d) {                       // d = depth in metres, positive
  if (d < 35) return lerpC(C.seaShelf, C.seaMid, d / 35);
  return lerpC(C.seaMid, C.seaAbyss, Math.min(1, (d - 35) / 70));
}

/* Shaded relief, rendered once into an offscreen canvas and handed to a
   single BitmapLayer. An earlier build drew the sheet as ten thousand
   coloured quads and it was the most expensive thing on the map by a wide
   margin — every cell went through deck.gl's projection vertex shader on
   every frame for a picture that never changes. A texture is two triangles,
   it can carry contour lines at a resolution no polygon sheet could, and it
   is generated from the simulation's own elevation field so it is the same
   ground the tasking engine is reasoning about. */
function buildTerrain(scn, P, coarse) {
  const t0 = performance.now();
  /* Re-resolve the ramp against whatever theme is live now. The sheet is a
     baked image: this is the ONLY moment its colours can be chosen. */
  HYPSO = hypsoRamp();
  const T = terrainOf(scn);
  const PX = coarse ? 4 : 6;                  // pixels per kilometre
  const x0 = -TERRAIN_MARGIN_KM, y0 = -TERRAIN_MARGIN_KM;
  const kmW = scn.widthKm + TERRAIN_MARGIN_KM * 2;
  const kmH = scn.heightKm + TERRAIN_MARGIN_KM * 2;
  const w = Math.round(kmW * PX), h = Math.round(kmH * PX);

  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');

  const E = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    const ky = y0 + j / PX;
    for (let i = 0; i < w; i++) E[j * w + i] = T.elev(x0 + i / PX, ky);
  }

  const img = ctx.createImageData(w, h);
  const D = img.data;
  const CONTOUR = 40;        // metres between contour lines on land
  const BATHY = 45;          // metres between isobaths

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      const e = E[k];
      const eL = E[k - (i > 0 ? 1 : 0)], eR = E[k + (i < w - 1 ? 1 : 0)];
      const eU = E[k - (j > 0 ? w : 0)], eD = E[k + (j < h - 1 ? w : 0)];
      let col;

      if (e >= 0) {
        col = hypso(e);
        /* Hillshade, light from the north-west and exaggerated. The relief
           here is a few hundred metres over a hundred kilometres; at true
           scale it would be invisible, and an invisible landform is no use
           to somebody deciding whether an aircraft can get there. */
        const dzdx = (eR - eL) * 0.5, dzdy = (eD - eU) * 0.5;
        const nx = -dzdx * 0.05, ny = -dzdy * 0.05;
        const len = Math.hypot(nx, ny, 1);
        const sh = 0.52 + 1.05 * (nx * -0.62 + ny * -0.62 + 0.48) / len;
        col = [col[0] * sh, col[1] * sh, col[2] * sh];
        // Contour: darken wherever this pixel and its neighbour straddle a
        // multiple of the interval. One pixel wide at any texture size.
        if (Math.floor(e / CONTOUR) !== Math.floor(eR / CONTOUR) ||
            Math.floor(e / CONTOUR) !== Math.floor(eD / CONTOUR)) {
          const idx = Math.floor(e / CONTOUR) % 4 === 0 ? 0.68 : 0.84;
          col = [col[0] * idx, col[1] * idx, col[2] * idx];
        }
      } else {
        col = bathy(-e);
        if (Math.floor(-e / BATHY) !== Math.floor(-eR / BATHY) ||
            Math.floor(-e / BATHY) !== Math.floor(-eD / BATHY)) {
          col = [col[0] * 1.30 + 4, col[1] * 1.30 + 6, col[2] * 1.28 + 8];
        }
      }

      /* The coastline, where the sign of the field changes. Blended rather
         than painted over: at this sampling the shoreline of a noisy island
         crosses zero many times per kilometre, and a hard white replacement
         reads as surf instead of as a line. */
      if ((e >= 0) !== (eR >= 0) || (e >= 0) !== (eD >= 0)) {
        const cst = TMIX('m-sea', 't-hi', 0.62);
        col = [col[0] * 0.35 + cst[0] * 0.65, col[1] * 0.35 + cst[1] * 0.65,
               col[2] * 0.35 + cst[2] * 0.65];
      }

      const o = k * 4;
      D[o] = Math.max(0, Math.min(255, col[0]));
      D[o + 1] = Math.max(0, Math.min(255, col[1]));
      D[o + 2] = Math.max(0, Math.min(255, col[2]));
      D[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Bounds in degrees. The local grid is anchored equirectangularly, so the
  // sheet is axis-aligned in longitude and latitude and needs no warping.
  const nw = P(x0, y0), se = P(x0 + kmW, y0 + kmH);
  return {
    image: cv, px: PX, w, h,
    bounds: [nw[0], se[1], se[0], nw[1]],
    themeGen: TGEN(),
    ms: performance.now() - t0
  };
}

/* ==================================================================== */
/*  SYMBOLOGY                                                           */
/*  One icon atlas, drawn on a canvas at runtime.                       */
/* ==================================================================== */

/* The first version of this map drew every entity as a coloured circle and
   the operator's verdict was exact: "all these random dots mean nothing to
   me". A circle carries one channel — colour — and this picture has to carry
   at least four: what kind of thing it is, which way it is pointing, what it
   is carrying and what it is doing. So the aircraft get airframes, the launch
   points get installation symbols and the threats get hostile diamonds, in
   the same visual grammar as the 2D map they are replacing.

   The atlas is generated here rather than shipped as a file for two reasons:
   nothing in this application may fetch anything, and a canvas-drawn atlas is
   redrawn at whatever device pixel ratio the machine actually has. One
   texture, one IconLayer, every symbol on the map. */
const ICON_CELL = 128;
const ICON_COLS = 6;

/* Body ink and outline for the two conditions an airframe can be in. On task
   it is bright; on the way home it is grey, which is exactly the distinction
   the 2D map draws and the one an operator scanning for spare capacity
   needs. */
/* Yellow on task, grey on the way home — the approved console's grammar, and
   the same one the 2D map now draws. Read at atlas-build time, which is the
   only moment a baked sprite can learn a colour. */
const AIR_INK = {
  get a() { return [TCSS('yel'), TCSS('m-halo', 0.92)]; },
  get r() { return [TCSS('grey'), TCSS('m-halo', 0.92)]; }
};

function drawAirHeavy(x, ink) {           // heavy lift: four rotors, cargo pod
  x.lineWidth = 5; x.lineCap = 'round'; x.lineJoin = 'round';
  x.strokeStyle = ink[1]; x.fillStyle = ink[0];
  const arm = 34;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    x.beginPath(); x.moveTo(0, 0); x.lineTo(sx * arm, sy * arm);
    x.strokeStyle = ink[1]; x.lineWidth = 12; x.stroke();
    x.strokeStyle = ink[0]; x.lineWidth = 6; x.stroke();
    x.beginPath(); x.arc(sx * arm, sy * arm, 15, 0, 7);
    x.strokeStyle = ink[1]; x.lineWidth = 6; x.stroke();
    x.strokeStyle = ink[0]; x.lineWidth = 2.6; x.stroke();
  }
  // fuselage, nose to the top
  x.beginPath();
  x.moveTo(0, -34); x.lineTo(13, -6); x.lineTo(11, 26); x.lineTo(-11, 26); x.lineTo(-13, -6);
  x.closePath();
  x.fillStyle = ink[0]; x.fill();
  x.strokeStyle = ink[1]; x.lineWidth = 6; x.stroke();
  // the slung load, which is what this airframe is for
  x.fillStyle = ink[1]; x.fillRect(-7, 10, 14, 12);
  x.strokeStyle = ink[0]; x.lineWidth = 2.4; x.strokeRect(-7, 10, 14, 12);
}
function drawAirLight(x, ink) {           // light quad: same grammar, smaller
  x.lineCap = 'round'; x.lineJoin = 'round';
  const arm = 27;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    x.beginPath(); x.moveTo(0, 0); x.lineTo(sx * arm, sy * arm);
    x.strokeStyle = ink[1]; x.lineWidth = 11; x.stroke();
    x.strokeStyle = ink[0]; x.lineWidth = 5; x.stroke();
    x.beginPath(); x.arc(sx * arm, sy * arm, 11, 0, 7);
    x.strokeStyle = ink[1]; x.lineWidth = 5.5; x.stroke();
    x.strokeStyle = ink[0]; x.lineWidth = 2.2; x.stroke();
  }
  x.beginPath(); x.moveTo(0, -26); x.lineTo(11, 12); x.lineTo(-11, 12); x.closePath();
  x.fillStyle = ink[0]; x.fill();
  x.strokeStyle = ink[1]; x.lineWidth = 6; x.stroke();
}
function drawAirLong(x, ink) {            // long range: fixed wing, swept
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(0, -46);
  x.lineTo(7, -14); x.lineTo(44, 8); x.lineTo(44, 18); x.lineTo(6, 10);
  x.lineTo(5, 30); x.lineTo(20, 40); x.lineTo(20, 46); x.lineTo(0, 40);
  x.lineTo(-20, 46); x.lineTo(-20, 40); x.lineTo(-5, 30);
  x.lineTo(-6, 10); x.lineTo(-44, 18); x.lineTo(-44, 8); x.lineTo(-7, -14);
  x.closePath();
  x.fillStyle = ink[0]; x.fill();
  x.strokeStyle = ink[1]; x.lineWidth = 7; x.stroke();
}
function drawRelay(x) {                   // the C2/ISR relay, not a courier
  drawAirLong(x, [TCSS('blue'), TCSS('m-halo', 0.94)]);
  x.beginPath(); x.arc(0, 16, 9, 0, 7);   // the sensor ball
  x.fillStyle = TCSS('m-halo', 0.95); x.fill();
  x.strokeStyle = TCSS('blue'); x.lineWidth = 4; x.stroke();
}
function drawFarp(x) {                    // launch point ashore
  x.beginPath();
  const r = 10, s = 40;
  x.moveTo(-s + r, -s);
  x.arcTo(s, -s, s, s, r); x.arcTo(s, s, -s, s, r);
  x.arcTo(-s, s, -s, -s, r); x.arcTo(-s, -s, s, -s, r);
  x.closePath();
  x.fillStyle = TCSS('m-halo', 0.95); x.fill();
  x.strokeStyle = TCSS('cyan'); x.lineWidth = 8; x.stroke();
  /* The helipad H the approved console uses for a launch point. */
  x.strokeStyle = TCSS('cyan'); x.lineWidth = 9; x.lineCap = 'round';
  x.beginPath();
  x.moveTo(-18, -22); x.lineTo(-18, 22); x.moveTo(-18, 0); x.lineTo(18, 0);
  x.moveTo(18, -22); x.lineTo(18, 22);
  x.stroke();
}
function drawShip(x) {                    // launch point afloat: friendly track
  x.beginPath();
  x.moveTo(0, -46); x.lineTo(44, 0); x.lineTo(0, 46); x.lineTo(-44, 0);
  x.closePath();
  x.fillStyle = TCSS('m-halo', 0.95); x.fill();
  x.strokeStyle = TCSS('cyan'); x.lineWidth = 8; x.stroke();
  x.strokeStyle = TCSS('cyan'); x.lineWidth = 8; x.lineCap = 'round';
  x.beginPath();
  x.moveTo(-15, -18); x.lineTo(-15, 18); x.moveTo(-15, 0); x.lineTo(15, 0);
  x.moveTo(15, -18); x.lineTo(15, 18);
  x.stroke();
}
function drawEnemy(x) {                   // hostile: the standard diamond
  x.save(); x.rotate(Math.PI / 4);
  x.fillStyle = TCSS('red-d', 0.72); x.strokeStyle = TCSS('red'); x.lineWidth = 8;
  x.fillRect(-32, -32, 64, 64); x.strokeRect(-32, -32, 64, 64);
  x.restore();
  x.fillStyle = TCSS('red'); x.font = 'bold 34px ui-monospace, Menlo, monospace';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('EN', 0, 2);
}
function drawTarget(x) {                  // where an aircraft is going
  x.strokeStyle = TCSS('m-track', 0.95); x.lineWidth = 5;
  x.setLineDash([9, 9]);
  x.beginPath(); x.arc(0, 0, 34, 0, 7); x.stroke();
  x.setLineDash([]);
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2;
    x.beginPath();
    x.moveTo(Math.cos(a) * 40, Math.sin(a) * 40);
    x.lineTo(Math.cos(a) * 54, Math.sin(a) * 54);
    x.stroke();
  }
}
/* ------------------------------------------------------------------------
   CASUALTY SYMBOLOGY.

   A wounded soldier is a PLOTTED POSITION, not an area. The first build drew
   one as a filled circle in metres on the ground; at close zoom the radius
   cap turned each into a forty-pixel ellipse lying flat on the terrain,
   they overlapped each other, and the mark that carried the status — the
   cross over a death, the tick over a treated casualty — was lost inside its
   own fill. The operator's words were that they read as coloured puddles.

   So this follows the 2D map's grammar exactly (map.js, drawMap): a small
   hard dot, three and a half pixels of it, with the meaning carried by
   concentric rings around it — the reserve sweep at 9.5, the coverage ring
   at 11, the designated-role chevrons between 7.5 and 12. Everything below
   is drawn at four times those radii inside a 128-pixel cell and rendered at
   CAS_SIZE pixels, so one unit here is one quarter of a screen pixel and the
   numbers are the 2D map's numbers multiplied by CAS_K. Being icons, they
   are billboarded and sized in screen space: they no longer swell, squash or
   tilt when the camera pitches.
   ------------------------------------------------------------------------ */
const CAS_K = 4;                          // atlas units per screen pixel
const CAS_SIZE = ICON_CELL / CAS_K;       // 32 px rendered
const R = px => px * CAS_K;               // a 2D-map radius in atlas units

/* The dot's colour is the compensatory reserve band, exactly as the 2D map
   colours it: blue while the soldier is still compensating, amber once the
   reserve is falling, red once it is nearly gone. Triage class is carried by
   the tint of the identity chip instead, because class and reserve are
   different questions and the operator asks the reserve one far more often. */
const CAS_COL = {
  get stable()    { return TCSS('blue'); },
  get falling()   { return TCSS('amb'); },
  get critical()  { return TCSS('red'); },
  get expectant() { return TCSS('grey'); },
  get saved()     { return TCSS('grn'); },
  get dead()      { return TCSS('grey', 0.9); }
};

/* The plotted position itself. Hard edge, dark keyline, and it grows by one
   pixel of radius when the reserve is falling — the one channel the 2D map
   spends on deterioration. */
function casDot(x, col, r) {
  x.beginPath(); x.arc(0, 0, R(r), 0, 7);
  x.fillStyle = col; x.fill();
  x.strokeStyle = TCSS('m-halo', 0.92); x.lineWidth = R(1.2); x.stroke();
}
/* Expectant is a decision, not a severity: comfort care, no airframe. It gets
   a hollow centre inside a closed ring so it cannot be mistaken for one of
   the three reserve bands at any size. */
function drawCasExp(x) {
  x.beginPath(); x.arc(0, 0, R(6.2), 0, 7);
  x.strokeStyle = CAS_COL.expectant; x.lineWidth = R(1.5); x.stroke();
  casDot(x, CAS_COL.expectant, 2.6);
}
/* Treated but not yet resolved: the tick, drawn hollow. Resolved and alive:
   the same tick over a filled disc. Both are ticks — a green fill on its own
   was the other thing the operator could not read against a dead soldier. */
function casTick(x, filled) {
  x.beginPath(); x.arc(0, 0, R(4.2), 0, 7);
  if (filled) { x.fillStyle = TCSS('grn-d', 0.75); x.fill(); }
  x.strokeStyle = CAS_COL.saved; x.lineWidth = R(1.5); x.stroke();
  x.strokeStyle = filled ? TCSS('t-hi') : CAS_COL.saved;
  x.lineWidth = R(1.6); x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(R(-2.2), R(0)); x.lineTo(R(-0.5), R(1.9)); x.lineTo(R(2.4), R(-2.2));
  x.stroke();
}
/* Died of wounds. Never a soft mark, and never green. The heavy red cross is
   a death that was survivable with treatment in time; the thin grey one is a
   casualty nothing in this simulation could have reached. The distinction is
   the 2D map's and it is the difference between a failure of tasking and a
   fact of the injury. */
function drawKiaS(x) {
  x.strokeStyle = TCSS('red', 0.98); x.lineWidth = R(2.2); x.lineCap = 'round';
  x.beginPath();
  x.moveTo(R(-4.6), R(-4.6)); x.lineTo(R(4.6), R(4.6));
  x.moveTo(R(4.6), R(-4.6)); x.lineTo(R(-4.6), R(4.6));
  x.stroke();
}
function drawKiaN(x) {
  x.strokeStyle = TCSS('grey', 0.85); x.lineWidth = R(1.2); x.lineCap = 'round';
  x.beginPath();
  x.moveTo(R(-3), R(-3)); x.lineTo(R(3), R(3));
  x.moveTo(R(3), R(-3)); x.lineTo(R(-3), R(3));
  x.stroke();
}
/* Compensatory reserve as a swept angle, the one piece of physiology on the
   picture. The ring empties as the reserve does. It is quantised into bands
   so it can live in the atlas and stay a fixed size in screen space; a band
   is finer than the eye reads an angle to anyway. */
const CRM_BANDS = 7;                      // 0-70, the band below which it draws
function drawCrm(x, band) {
  const top = (typeof PARAMS !== 'undefined' && PARAMS.CRM_YELLOW) || 70;
  const crm = (band + 0.5) * (top / CRM_BANDS);
  const col = crm < 40 ? CAS_COL.critical : CAS_COL.falling;
  x.lineWidth = R(2.4);
  x.beginPath(); x.arc(0, 0, R(9.5), 0, 7);
  x.strokeStyle = TCSS('t-hi', 0.10); x.stroke();
  x.beginPath();
  x.arc(0, 0, R(9.5), -Math.PI / 2, -Math.PI / 2 + Math.max(0.03, crm / 100) * Math.PI * 2);
  x.strokeStyle = col; x.stroke();
}
/* Coverage. A dashed ring means the launch-point laydown, not the tasking,
   is what stands between this casualty and a delivery: red where no airframe
   in the force can reach them at all, blue where exactly one can. */
function drawCov(x, none) {
  x.setLineDash([R(2.5), R(3)]);
  x.beginPath(); x.arc(0, 0, R(11), 0, 7);
  x.strokeStyle = none ? TCSS('red', 0.9) : TCSS('blue', 0.85);
  x.lineWidth = R(1.3); x.stroke();
  x.setLineDash([]);
}
/* The current selection, so a chosen mark is obvious without depending on a
   fill colour the symbol may not have. */
function drawSel(x) {
  x.beginPath(); x.arc(0, 0, R(8), 0, 7);
  x.strokeStyle = TCSS('t-hi', 0.95); x.lineWidth = R(1.6); x.stroke();
}
function drawHva(x) {                     // commander-designated role
  x.strokeStyle = TCSS('amb'); x.lineWidth = R(2.2); x.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 2;
    x.beginPath();
    x.moveTo(Math.cos(a) * R(7.5), Math.sin(a) * R(7.5));
    x.lineTo(Math.cos(a) * R(12), Math.sin(a) * R(12));
    x.stroke();
  }
}

const ICON_DRAW = [
  ['heavy_a', x => drawAirHeavy(x, AIR_INK.a)], ['heavy_r', x => drawAirHeavy(x, AIR_INK.r)],
  ['light_a', x => drawAirLight(x, AIR_INK.a)], ['light_r', x => drawAirLight(x, AIR_INK.r)],
  ['long_a', x => drawAirLong(x, AIR_INK.a)], ['long_r', x => drawAirLong(x, AIR_INK.r)],
  ['relay', drawRelay], ['farp', drawFarp], ['ship', drawShip],
  ['en', drawEnemy], ['tgt', drawTarget], ['hva', drawHva],
  ['c_st', x => casDot(x, CAS_COL.stable, 3.6)],
  ['c_fa', x => casDot(x, CAS_COL.falling, 4.6)],
  ['c_cr', x => casDot(x, CAS_COL.critical, 4.6)],
  ['c_ex', drawCasExp],
  ['c_tr', x => casTick(x, false)], ['c_sv', x => casTick(x, true)],
  ['kia_s', drawKiaS], ['kia_n', drawKiaN],
  ['cov0', x => drawCov(x, true)], ['cov1', x => drawCov(x, false)],
  ['sel', drawSel]
];
for (let b = 0; b < CRM_BANDS; b++) ICON_DRAW.push(['crm' + b, x => drawCrm(x, b)]);

/* The atlas and the deck.gl icon mapping, plus a per-sprite data URL so the
   legend in the corner is drawn from the same texture as the map and cannot
   drift out of agreement with it. */
function buildIconAtlas() {
  const rows = Math.ceil(ICON_DRAW.length / ICON_COLS);
  const cv = document.createElement('canvas');
  cv.width = ICON_CELL * ICON_COLS; cv.height = ICON_CELL * rows;
  const ctx = cv.getContext('2d');
  const mapping = {}, swatch = {};
  ICON_DRAW.forEach(([name, fn], i) => {
    const cx = (i % ICON_COLS) * ICON_CELL, cy = Math.floor(i / ICON_COLS) * ICON_CELL;
    ctx.save();
    ctx.translate(cx + ICON_CELL / 2, cy + ICON_CELL / 2);
    fn(ctx);
    ctx.restore();
    mapping[name] = { x: cx, y: cy, width: ICON_CELL, height: ICON_CELL, anchorX: ICON_CELL / 2,
                      anchorY: ICON_CELL / 2, mask: false };
    const one = document.createElement('canvas');
    one.width = one.height = 44;
    const oc = one.getContext('2d');
    oc.drawImage(cv, cx, cy, ICON_CELL, ICON_CELL, 0, 0, 44, 44);
    swatch[name] = one.toDataURL();
  });
  return { image: cv, mapping, swatch };
}

/* Which airframe glyph a platform gets. The three platform types have to be
   distinguishable at a glance, because they have different reach and the
   operator's question is often "is there anything that can get there". */
const AIR_ICON = { HEAVY: 'heavy', LIGHT: 'light', LONG: 'long' };

/* ==================================================================== */
/*  CSS                                                                 */
/*  Injected from here so this module owns everything it draws and the  */
/*  shared stylesheet is left alone.                                    */
/* ==================================================================== */

const CSS = `
/* ---- the two renderers of one map -----------------------------------
   #g3Host sits inside #stage, over the 2D canvases and under .mapTools
   (z-index 5), so the renderer switch stays reachable in both modes while
   everything else on the stage belongs to whichever renderer is drawing.
   The 2D furniture is taken out with display:none rather than covered: a
   legend that is invisible but still catching clicks is worse than absent. */
#g3Host{position:absolute; inset:0; z-index:2; display:none}
body.map3d #g3Host{display:block}
body.map3d #mapA, body.map3d #mapB, body.map3d #dock, body.map3d #legend,
body.map3d .paneTag, body.map3d .missCompare, body.map3d .mapTools .flat2d{display:none}
/* With the dock gone the toolbar is no longer squeezed against it, so the
   switch centres over the space the 3D header leaves between its title card
   and its counts. */
body.map3d .mapTools{right:auto; left:50%; transform:translateX(-50%); z-index:6}
/* The shared .seg background is 6% transparent, which is unnoticeable over
   the chrome but not over a map: casualty dots and place names read straight
   through it and the switch picks up ghost glyphs. This one control sits over
   live map content in both modes, so it is opaque. */
#mapModeSw{background:var(--k2)}
#mapModeSw .mmKey{pointer-events:none; opacity:.45; padding-left:7px; padding-right:7px;
  border-left:1px solid var(--line2); font-size:9px; letter-spacing:.08em}
#mapModeSw .chip[role=radio]{min-width:30px; text-align:center; cursor:pointer}
#mapModeSw .chip[role=radio]:focus-visible{outline:2px solid var(--cyan); outline-offset:-2px}

#g3Wrap{position:absolute; inset:0; overflow:hidden;
  background:radial-gradient(120% 100% at 50% 8%, var(--k3) 0%, var(--k1) 46%, var(--k0) 100%);
  font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--t-hi)}
#g3Canvas{position:absolute; inset:0; outline:none}
#g3Canvas canvas{outline:none}
#g3Wrap .g3Chrome{position:absolute; pointer-events:none; z-index:5}
#g3Wrap .g3Chrome *{pointer-events:auto}

#g3Wrap .g3Top{top:0; left:0; right:0; display:flex; align-items:flex-start; gap:10px;
  padding:10px 12px; background:linear-gradient(180deg,color-mix(in srgb, var(--k0) 92%, transparent),transparent)}
#g3Wrap .g3Title{background:color-mix(in srgb, var(--k2) 82%, transparent); border:1px solid var(--line2);
  border-left:2px solid var(--cyan); padding:8px 12px; min-width:280px; backdrop-filter:blur(3px)}
#g3Wrap .g3Title b{display:block; font-size:13px; letter-spacing:2px; color:var(--t-hi)}
#g3Wrap .g3Title i{display:block; font-style:normal; font-size:10px; letter-spacing:1.4px;
  color:var(--t-lo); margin-top:3px}
#g3Wrap .g3Counts{display:flex; gap:1px; margin-left:auto; flex-wrap:wrap; justify-content:flex-end}
#g3Wrap .g3Count{background:color-mix(in srgb, var(--k2) 82%, transparent); border:1px solid var(--line);
  padding:6px 11px; min-width:74px; text-align:right}
#g3Wrap .g3Count b{display:block; font-size:17px; line-height:1.1; font-variant-numeric:tabular-nums}
#g3Wrap .g3Count span{display:block; font-size:9px; letter-spacing:1.3px; color:var(--t-lo); margin-top:2px}
#g3Wrap .g3Count.dead b{color:var(--red)}
#g3Wrap .g3Count.air b{color:var(--cyan)}
#g3Wrap .g3Count.open b{color:var(--amb)}

#g3Wrap .g3Left.g3Fold{display:none}
#g3Wrap .g3Left{left:12px; top:96px; width:210px; display:flex; flex-direction:column; gap:8px;
  max-height:calc(100% - 196px); overflow-y:auto; scrollbar-width:thin;
  scrollbar-color:var(--k5) transparent;
  -webkit-mask-image:linear-gradient(180deg,#000 calc(100% - 26px),transparent 100%);
  mask-image:linear-gradient(180deg,#000 calc(100% - 26px),transparent 100%)}
#g3Wrap .g3Left::-webkit-scrollbar{width:6px}
#g3Wrap .g3Left::-webkit-scrollbar-thumb{background:var(--k5)}
#g3Wrap .g3Card{background:color-mix(in srgb, var(--k2) 88%, transparent); border:1px solid var(--line);
  padding:9px 10px; backdrop-filter:blur(3px)}
#g3Wrap .g3Card h4{margin:0 0 7px; font-size:9px; letter-spacing:1.7px; color:var(--t-lo); font-weight:600}
#g3Wrap .g3Row{display:flex; align-items:center; gap:7px; padding:2px 0; font-size:10.5px; color:var(--t-mid)}
#g3Wrap .g3Sw{width:9px; height:9px; flex:0 0 9px; border-radius:50%}
#g3Wrap .g3Sw.sq{border-radius:1px}
#g3Wrap .g3Sw.ln{height:2px; border-radius:0}
#g3Wrap .g3Tog{display:flex; align-items:center; gap:7px; padding:3px 4px; margin:0 -4px;
  font-size:10.5px; color:var(--t-mid); cursor:pointer; border:0; background:none; width:calc(100% + 8px);
  text-align:left; font-family:inherit}
#g3Wrap .g3Tog:hover{background:color-mix(in srgb, var(--cyan) 10%, transparent)}
#g3Wrap .g3Tog:focus-visible{outline:1px solid var(--cyan); outline-offset:0}
#g3Wrap .g3Tog i{width:9px; height:9px; flex:0 0 9px; border:1px solid var(--k6); font-style:normal}
#g3Wrap .g3Tog.on i{background:var(--cyan); border-color:var(--cyan)}
#g3Wrap .g3Tog.on{color:var(--t-hi)}

#g3Wrap .g3Bot{left:0; right:0; bottom:0; padding:10px 12px 12px;
  background:linear-gradient(0deg,color-mix(in srgb, var(--k0) 94%, transparent),transparent)}
#g3Wrap .g3Bar{background:color-mix(in srgb, var(--k2) 90%, transparent); border:1px solid var(--line2);
  padding:9px 12px; display:flex; align-items:center; gap:11px}
#g3Wrap .g3Btn{background:color-mix(in srgb, var(--cyan) 12%, transparent); border:1px solid color-mix(in srgb, var(--cyan) 34%, transparent);
  color:var(--t-hi); font:inherit; font-size:11px; padding:4px 9px; cursor:pointer; letter-spacing:.6px}
#g3Wrap .g3Btn:hover{background:color-mix(in srgb, var(--cyan) 22%, transparent)}
#g3Wrap .g3Btn:focus-visible{outline:1px solid var(--cyan); outline-offset:1px}
#g3Wrap .g3Btn.on{background:var(--cyan); border-color:var(--cyan); color:var(--on-accent)}
#g3Wrap .g3Clock{font-size:15px; font-variant-numeric:tabular-nums; letter-spacing:1px; min-width:78px}
/* The two ends of the run, so the track is read as T+0 to T+180 rather than
   as a bar that happens to be part full. */
#g3Wrap .g3End{flex:0 0 auto; font-size:9px; letter-spacing:1.1px; color:var(--t-lo);
  font-variant-numeric:tabular-nums}
#g3Wrap .g3Bar.narrow .g3End{display:none}
#g3Wrap .g3Bar.narrow .g3Clock{min-width:74px; font-size:13px}
#g3Wrap .g3Scrub{flex:1; height:22px; position:relative; cursor:pointer; touch-action:none}
#g3Wrap .g3Scrub:focus-visible{outline:1px solid var(--cyan)}
#g3Wrap .g3Track{position:absolute; left:0; right:0; top:9px; height:4px; background:var(--line2)}
#g3Wrap .g3Fill{position:absolute; left:0; top:9px; height:4px; background:var(--cyan)}
#g3Wrap .g3Head{position:absolute; top:3px; width:2px; height:16px; background:var(--t-hi); margin-left:-1px}
#g3Wrap .g3Tick{position:absolute; top:2px; width:1px; height:6px; background:var(--red)}
#g3Wrap .g3Mas{position:absolute; top:14px; width:1px; height:6px; background:var(--amb)}
#g3Wrap .g3Note{font-size:9.5px; letter-spacing:1.2px; color:var(--t-lo); padding-top:6px;
  display:flex; gap:14px; flex-wrap:nowrap; overflow:hidden; white-space:nowrap}
#g3Wrap .g3Note span{flex:0 0 auto}

#g3Wrap .g3Right{right:12px; top:96px; width:250px; max-height:calc(100% - 190px); overflow:auto}
#g3Wrap .g3Sel h4{color:var(--cyan)}
#g3Wrap .g3Kv{width:100%; border-collapse:collapse; font-size:10.5px}
#g3Wrap .g3Kv td{padding:2px 0; vertical-align:top; color:var(--t-mid)}
#g3Wrap .g3Kv td:first-child{color:var(--t-lo); padding-right:8px; white-space:nowrap}
#g3Wrap .g3Kv td:last-child{text-align:right}
#g3Wrap .g3Bad{color:var(--red)} #g3Wrap .g3Warn{color:var(--amb)} #g3Wrap .g3Ok{color:var(--grn)}

#g3Tip{position:absolute; z-index:9; pointer-events:none; display:none; max-width:280px;
  background:var(--k1); border:1px solid var(--line2); border-left:2px solid var(--cyan);
  padding:7px 9px; font-size:10.5px; line-height:1.5; color:var(--t-hi);
  box-shadow:0 8px 24px rgba(0,0,0,.55)}
#g3Tip b{color:var(--t-hi); letter-spacing:1px}
#g3Tip em{font-style:normal; color:var(--t-lo)}

#g3Wrap .g3Busy{position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  z-index:8; background:color-mix(in srgb, var(--k0) 74%, transparent); letter-spacing:2px; font-size:11px; color:var(--t-lo)}
/* Shown only on an empty battlefield at T+00:00, where "nothing on the map"
   and "the map is broken" look identical. Restrained on purpose — it is a
   caption on an empty sector, not an alert. */
/* Sits immediately above the transport, so the words "press play" are next to
   the control they are about, and out of the sector where the launch point
   chips are. */
#g3Wrap .g3Hint{position:absolute; left:50%; bottom:92px; transform:translateX(-50%);
  font-size:10px; letter-spacing:2.2px; color:var(--t-lo); z-index:4; pointer-events:none;
  padding:5px 12px; border:1px solid var(--line2); border-radius:2px;
  background:color-mix(in srgb, var(--k2) 64%, transparent); white-space:nowrap}

/* ---- map furniture: scale, north, tier ---- */
#g3Wrap .g3Furn{right:12px; bottom:100px; display:flex; align-items:flex-end; gap:14px;
  z-index:6; pointer-events:none; background:var(--k1); padding:7px 11px 5px;
  border:1px solid var(--line)}
#g3Wrap .g3Sb{text-align:center; color:var(--t-mid); font-size:9px; letter-spacing:1px}
#g3Wrap .g3SbBar{height:9px; border:1.4px solid var(--t-mid); border-top:0; margin-top:3px}
#g3Wrap .g3North{width:26px; text-align:center; color:var(--t-mid); font-size:9px}
#g3Wrap .g3North svg{display:block; margin:0 auto 1px}
#g3Wrap .g3Tier{font-size:9px; letter-spacing:1.3px; color:var(--t-lo); padding-bottom:2px;
  border-left:1px solid var(--line2); padding-left:10px; text-align:right}
#g3Wrap .g3Tier b{display:block; color:var(--t-mid); font-weight:600}

/* ---- degraded comms ---- */
/* Centred on the VISIBLE map, not on the dock. The host floats panel
   columns over the left and right of this pane and publishes their
   widths as --map-inset-l / --map-inset-r; at 1280x800 the left column
   is 293px and the right is 0, so centring on the dock put this banner
   1,054 px2 underneath that column whenever a comms window was open. */
#g3Wrap .g3Comms{left:var(--map-inset-l,0px); right:var(--map-inset-r,0px); top:64px; display:flex; justify-content:center; z-index:6}
#g3Wrap .g3Comms span{background:var(--k1); border:1px solid color-mix(in srgb, var(--red) 55%, transparent);
  color:var(--red); font-size:11px; font-weight:700; letter-spacing:.8px; padding:6px 14px}
#g3Wrap .g3CommsWash{position:absolute; inset:0; background:color-mix(in srgb, var(--red) 7%, transparent);
  pointer-events:none; z-index:3}

/* ---- legend keyed to the atlas ---- */
#g3Wrap .g3Leg{display:grid; grid-template-columns:20px 1fr; gap:3px 7px; align-items:center}
#g3Wrap .g3Leg img{width:20px; height:20px; display:block}
#g3Wrap .g3Leg span{font-size:10px; color:var(--t-mid); line-height:1.25}
#g3Wrap .g3Leg em{font-style:normal; color:var(--t-lo); font-size:9px; display:block}

@media (max-width:1180px){
  #g3Wrap .g3Left,#g3Wrap .g3Right{display:none}
}
@media (max-height:820px){
  #g3Wrap .g3Left .g3Card.opt{display:none}
}

/* ---- the pane after a fatal error ----
   Deliberately plain. An operator who has just lost a view needs to be told
   what still works, not shown a stack trace. */
.g3Dead{max-width:560px; margin:56px auto; padding:22px 26px;
  border:1px solid var(--line2); background:color-mix(in srgb, var(--k2) 70%, transparent)}
.g3Dead h3{margin:0 0 10px; font-size:13px; letter-spacing:1.6px; font-weight:600;
  color:var(--amb); text-transform:uppercase}
.g3Dead p{margin:0 0 9px; font-size:12px; line-height:1.55; color:var(--t-mid)}
.g3Dead p.g3DeadHint{color:var(--t-lo); font-size:11px}
.g3Dead kbd{font:600 10px/1 ui-monospace,monospace; border:1px solid var(--k6);
  border-radius:3px; padding:2px 4px; color:var(--t-hi)}
`;

function injectCSS() {
  if (document.getElementById('g3Style')) return;
  const s = document.createElement('style');
  s.id = 'g3Style';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/* ==================================================================== */
/*  FAILURE CONTAINMENT                                                 */
/* ==================================================================== */

/* Two rules, both learned the hard way in this file.
 *
 * The first is that this module must satisfy itself that the vendored
 * deck.gl bundle actually contains what it is about to call, before it
 * calls any of it. The bundle is a separate file under a separate cache
 * policy from this one, so the two can and did fall out of step: a browser
 * holding an immutable year-long copy of `vendor/deck/deck.min.js` served
 * a build that predated the IconLayer export while this file loaded fresh.
 * The result was a constructor that was not a constructor. Checked up front
 * that is one line of explanation and a withheld view; discovered on the
 * first frame it is a dead pane.
 *
 * The second is that nothing inside an animation frame may throw twice. The
 * original fault produced hundreds of identical exceptions, one per frame,
 * because the loop kept scheduling itself into the same broken state. That
 * is a defect of its own regardless of what caused it: it buries the first
 * and only informative message under noise, and it holds the main thread
 * doing nothing but failing. So the first failure anywhere in this module
 * stops the module — one message, loop cancelled, a plain statement in the
 * pane — and every later one is swallowed in silence.
 *
 * In both cases the rest of the application keeps working. The 2D tactical
 * and theatre maps carry the same information and are not affected. */

/* Every symbol this file constructs. Kept as a list rather than derived so
   that adding a layer without adding it here is caught by the check itself
   the first time the bundle is rebuilt without it. */
const DECK_SYMBOLS = [
  'Deck', 'MapView',
  'ScatterplotLayer', 'ArcLayer', 'PathLayer', 'LineLayer',
  'PolygonLayer', 'SolidPolygonLayer', 'TextLayer', 'IconLayer',
  'BitmapLayer', 'TripsLayer'
];

/* `typeof x === 'function'` is not sufficient: an arrow function or a bound
   helper passes it and then dies on `new`. deck.gl's layers are ES classes,
   so a live prototype object is the discriminator that matters. */
function missingDeckSymbols(D) {
  const out = [];
  for (const k of DECK_SYMBOLS) {
    const v = D && D[k];
    if (typeof v !== 'function' || !v.prototype) out.push(k);
  }
  return out;
}

let G3_DEAD = false;

/* The single point at which this module gives up. Idempotent by design —
   every guard below funnels here, and only the first caller does anything. */
function fatal(where, err) {
  if (G3_DEAD) return;
  G3_DEAD = true;
  try { if (G3._raf) cancelAnimationFrame(G3._raf); } catch (e) { /* nothing to cancel */ }
  G3._raf = 0;
  G3.dead = true;
  console.error('[theater3d] stopped after an error in ' + where +
    '. The 3D map is disabled for this session; every other view is unaffected. ' +
    'If this followed an update, hard reload (Ctrl-Shift-R) to clear a cached file.', err);
  try {
    ANGEL.setStatus('theater3d', 'failed', where + ': ' + ((err && err.message) || err));
  } catch (e) { /* status registry gone; nothing further to say */ }
  try { deadPane(); } catch (e) { /* the pane is already unusable */ }
}

/* Wrap anything the browser will call back into: event listeners, timers,
   frame callbacks, and the props deck.gl invokes during a draw. After the
   first failure these return immediately without running, which also stops
   a half-initialised map from responding to clicks as though it were live. */
function guard(where, fn) {
  return function guarded() {
    if (G3_DEAD) return undefined;
    try {
      return fn.apply(this, arguments);
    } catch (e) {
      fatal(where, e);
      return undefined;
    }
  };
}

/* What is left on screen afterwards. The pane stays — removing it while the
   operator is looking at it would take the navigation out from under them —
   but it says plainly what happened and what still works. */
/* What a failure looks like now that the two maps are one destination.

   When this was a pane of its own, printing an explanation into that pane was
   the right answer: the operator had navigated somewhere specific and the
   honest thing was to say why it was empty. It is the wrong answer here. The
   operator is on "the fight" — the view a judge is walked through — and the
   2D renderer sitting directly underneath is fine. Leaving an error card on
   top of a working map, with the map hidden behind it, would turn a contained
   subsystem failure into a broken step in the argument.

   So a fatal hands the view back: the renderer switch comes off, the map
   reverts to canvas, and the operator gets a toast rather than a wall. The
   console still carries the full diagnosis for anyone debugging it. */
function deadPane() {
  if (G3.deck) { try { G3.deck.finalize(); } catch (e) { /* already torn down */ } }
  G3.deck = null;
  G3.mounted = false;
  if (G3._ctxOff) { try { G3._ctxOff(); } catch (e) { /* already gone */ } G3._ctxOff = null; }

  const host = document.getElementById('g3Host');
  if (host) { host.innerHTML = ''; host.remove(); }
  const sw = document.getElementById('mapModeSw');
  if (sw) sw.remove();
  document.body.classList.remove('map3d');

  if (typeof APP !== 'undefined') {
    APP.mapMode = '2D';
    /* Not written to storage — see removeSelf. A crash is not a preference,
       and the next load deserves a clean attempt. */
    APP._paneForce = true;
  }
  try {
    if (typeof toast === 'function') {
      toast('3D map stopped',
        'The GPU renderer hit an error and has been shut down for this session. ' +
        'The map is back on the 2D renderer and carries the same information.', 'warn');
    }
    if (typeof render === 'function') render();
  } catch (e) { /* the host application is itself in trouble; nothing to add */ }
}

/* ==================================================================== */
/*  VIEW                                                                */
/* ==================================================================== */

const G3 = {
  deck: null, D: null, rec: null, base: null, terrain: null, statics: null,
  t: 0, follow: true, playing: false, rate: 4, lastFrame: 0,
  sel: null, hover: null, key: null, building: false, mounted: false,
  fps: 0, zoom: 9, view: { longitude: 0, latitude: 0, zoom: 9 },
  lowGPU: false, renderer: '', dead: false, withheld: null,
  _raf: 0,
  _frames: 0, _fpsAt: 0, _pulseTick: 0, _chromeAt: 0, _layerCount: 0, _air: [],
  _buildMs: 0, _entMs: 0,
  layers: { terrain: true, arcs: true, trips: true, cas: true, spikes: true,
            threat: true, sector: true, labels: true, world: true }
};

const fmtT = m => 'T+' + String(Math.floor(m / 60)).padStart(2, '0') + ':' +
                  String(Math.floor(m % 60)).padStart(2, '0');

/* When — and whether — the ANGEL allocator has the tasking authority.

   The live arm starts on the current triage and proximity allocator and only moves to
   ANGEL when the system is deployed, or when an operator takes it off
   standby from the readiness panel. The replay has to model the same
   handover or it draws a different fight from the one the 2D map is drawing
   beside it. `null` means the allocator never changes hands and the whole
   run is the doctrinal baseline; `0` means it was ANGEL from the first
   minute; any other number is the minute the handover completed.

   The previous version read only APP.deploy and treated "never deployed" as
   "ANGEL throughout", which is backwards: an undeployed run is the baseline,
   and drawing it as an ANGEL-tasked run made the two maps disagree about
   what was in the air. */
function angelFromApp() {
  if (typeof APP === 'undefined') return 0;
  if (APP.deploy && APP.deploy.state === 'DEPLOYED') return APP.deploy.tComplete || 0;
  return APP.angelActive ? 0 : null;
}

function cfgFromApp() {
  return {
    scenarioKey: (typeof APP !== 'undefined' && APP.scenarioKey) || 'PACOM_CORAL',
    seed: (typeof APP !== 'undefined' && APP.seed) || 42,
    mode: (typeof APP !== 'undefined' && APP.mode) || 'fair',
    telementor: (typeof APP !== 'undefined') ? !!APP.telementor : true,
    hvaWeight: (typeof APP !== 'undefined' && APP.hvaWeight) || 1,
    angelFrom: angelFromApp()
  };
}
const cfgKey = c => [c.scenarioKey, c.seed, c.mode, c.telementor, c.hvaWeight,
                     c.angelFrom == null ? 'baseline' : Math.round(c.angelFrom * 4)].join('|');

/* ---------------------------------------------------------------- statics */
/* Everything that does not change with time is built once per scenario and
   handed to deck as the same array reference every frame, so the attribute
   buffers are uploaded once rather than sixty times a second. The arrays are
   also pre-merged by primitive — all strokes together, all labels together —
   because that is what lets buildLayers stay at sixteen layers. */
function buildStatics(rec) {
  const { scn, P } = rec;
  const a = P.anchor;
  const region = (G3.base && G3.base.regions[a.theater]) || null;

  const S = {};

  S.terrain = buildTerrain(scn, P, G3.lowGPU);

  /* Real geography. Land as fill, coastline and international boundaries as
     one stroke array. */
  /* Two levels of detail. Natural Earth 1:50m is 17,000 vertices for the
     Pacific and every one of them goes through the projection vertex shader
     whether or not it is on screen; at theatre zoom that is most of a frame
     on a machine with no GPU. So the 1:110m generalisation is used when the
     whole theatre is in view, and the detailed set is culled to the visible
     bounds when it is not. Neither the operator nor the coastline notices. */
  S.neCoarse = region ? region.coarse.map(poly => ({ polygon: poly })) : [];
  S.neCoarseLines = region ? region.coarse.map(poly => ({ path: poly[0], col: [...C.neCoast, 175] })) : [];
  S.neAll = region ? region.land.map((poly, i) => ({ polygon: poly, bbox: region.bboxes[i] })) : [];
  S.neAllLines = region ? region.land.map((poly, i) => ({ path: poly[0], bbox: region.bboxes[i], col: [...C.neCoast, 165] })) : [];
  S.neBorders = region ? region.borders.map(l => ({ path: l, col: [...C.border, 130] })) : [];

  /* Graticule. Two scales: whole degrees for orientation at theatre zoom,
     and a quarter-degree lattice over the sector that reads as a grid when
     you are down among the casualties. */
  const gratMajor = [], gratMinor = [];
  const majCol = [C.grat[0], C.grat[1], C.grat[2], 26];
  const minCol = [C.grat[0], C.grat[1], C.grat[2], 15];
  if (region) {
    const [b0, b1, b2, b3] = region.bbox;
    for (let lon = Math.ceil(b0 / 5) * 5; lon <= b2; lon += 5)
      gratMajor.push({ from: [lon, b1, 30], to: [lon, b3, 30], col: majCol });
    for (let lat = Math.ceil(b1 / 5) * 5; lat <= b3; lat += 5)
      gratMajor.push({ from: [b0, lat, 30], to: [b2, lat, 30], col: majCol });
  }
  const c0 = P(0, 0), c1 = P(scn.widthKm, scn.heightKm);
  const pad = 1.6;
  for (let lon = Math.floor((c0[0] - pad) * 4) / 4; lon <= c1[0] + pad; lon += 0.25)
    gratMinor.push({ from: [lon, c1[1] - pad, 20], to: [lon, c0[1] + pad, 20], col: minCol });
  for (let lat = Math.floor((c1[1] - pad) * 4) / 4; lat <= c0[1] + pad; lat += 0.25)
    gratMinor.push({ from: [c0[0] - pad, lat, 20], to: [c1[0] + pad, lat, 20], col: minCol });
  S.gratMajor = gratMajor;
  S.grat = gratMajor.concat(gratMinor);

  /* Control measures, all strokes, one array.
     The sector frame is the brightest line on the map on purpose: the
     boundary between "this is simulated ground" and "this is the real world
     around it" is a thing the reader must never have to guess at. */
  S.control = [];
  S.control.push({
    path: [P(-TERRAIN_MARGIN_KM, -TERRAIN_MARGIN_KM, 10),
           P(scn.widthKm + TERRAIN_MARGIN_KM, -TERRAIN_MARGIN_KM, 10),
           P(scn.widthKm + TERRAIN_MARGIN_KM, scn.heightKm + TERRAIN_MARGIN_KM, 10),
           P(-TERRAIN_MARGIN_KM, scn.heightKm + TERRAIN_MARGIN_KM, 10),
           P(-TERRAIN_MARGIN_KM, -TERRAIN_MARGIN_KM, 10)],
    col: [...TMIX('m-grid','t-lo',0.34), 60], w: 1
  });
  /* The area of operations as a FIELD, not just a frame.

     This is the approved console's central move and it is worth stating
     plainly: the map carries the colour and the chrome stays near
     monochrome, so the one large saturated area on the screen is the ground
     the operator is responsible for. It is a wash — a fifth of an alpha over
     the terrain — so the hillshade, the contours and the coastline all read
     through it. Cover the terrain and the picture stops being a map. */
  S.aoField = [{
    polygon: [P(0, 0, 2), P(scn.widthKm, 0, 2),
              P(scn.widthKm, scn.heightKm, 2), P(0, scn.heightKm, 2)],
    col: [...TK('blue-d'), 62]
  }];
  S.control.push({
    path: [P(0, 0, 40), P(scn.widthKm, 0, 40), P(scn.widthKm, scn.heightKm, 40),
           P(0, scn.heightKm, 40), P(0, 0, 40)],
    col: [...C.frame, 140], w: 1.6
  });
  if (scn.boundary) {
    S.control.push({ path: scn.boundary.pts.map(p => P(p[0], p[1], 60)),
                     col: [...TK('red'), 170], w: 2 });
  }
  for (const z of (scn.threats || [])) {
    S.control.push({ path: ringKm(P, z.x, z.y, z.r, 56).map(p => [p[0], p[1], 8]),
                     col: [...TK('red'), 110], w: 1.4 });
  }

  S.bases = rec.arm.bases.map(b => ({
    name: b.name, pos: P(b.x, b.y, 0), x: b.x, y: b.y,
    fleet: rec.drones.filter(d => d.baseName === b.name).length
  }));

  /* Reach rings: the radius each launch point can actually service carrying
     one unit of blood. This is the laydown question, and it is a property of
     the ground rather than of the moment. */
  S.reach = [];
  for (const b of S.bases) {
    const src = scn.bases.find(x => x.name === b.name);
    if (!src) continue;
    let best = 0;
    for (const [typeKey] of src.fleet) {
      const r = effectiveRadiusKm(PLATFORMS[typeKey], PAYLOADS.BLOOD.kg);
      if (r > best) best = r;
    }
    S.reach.push({ r: best, name: b.name });
    S.control.push({ path: ringKm(P, b.x, b.y, best, 72).map(p => [p[0], p[1], 6]),
                     col: [...C.base, 40], w: 1 });
  }

  /* Sector and unit boundaries come off with their own toggle, so they live
     in a second array that is concatenated only when the toggle is on. */
  S.controlSector = [];
  for (const k of (rec.sectors || [])) {
    S.controlSector.push({ path: ringKm(P, k.x, k.y, k.r, 48).map(p => [p[0], p[1], 6]),
                           col: [...C.sector, 62], w: 1 });
  }
  const units = typeof unitsFor === 'function' ? unitsFor(scn) : [];
  for (const u of units) {
    S.controlSector.push({ path: ringKm(P, u.x, u.y, u.r, 40).map(p => [p[0], p[1], 6]),
                           col: [...TMIX('m-grid','t-lo',0.4), 52], w: 1 });
  }

  S.threats = (scn.threats || []).map(z => ({
    polygon: ringKm(P, z.x, z.y, z.r), label: z.label, r: z.r,
    lossPerMin: z.lossPerMin
  }));

  /* Type. One array for the labels that are always on, two more for the ones
     that follow a toggle. */
  S.labels = (scn.places || []).map(p => ({
    name: p.name, at: P(p.x, p.y, 200), size: p.kind === 'sea' ? 11 : 10.5,
    col: p.kind === 'sea' ? [...TK('t-lo'), 150] : [...TK('t-mid'), 160]
  }));
  /* Named terrain. The 2D map labels every island the scenario defines, and
     they are how an operator says where something is out loud — "two down on
     South Reef" is a sentence, "two down at 34, 96" is a grid reference
     nobody repeats back. */
  for (const is of (scn.islands || [])) {
    if (!is.name) continue;
    S.labels.push({ name: is.name, at: P(is.x, is.y - is.r * 0.55, 260),
                    size: 10, col: [...TK('t-hi'), 175] });
  }
  if (scn.boundary) {
    const mid = scn.boundary.pts[Math.floor(scn.boundary.pts.length / 2)];
    S.labels.push({ name: scn.boundary.label, at: P(mid[0] + 6, mid[1], 400),
                    size: 9.5, col: [...TK('red'), 180] });
  }
  /* Units and launch points share ground in most scenarios, so they are
     pushed apart in screen space rather than left to collide. */
  S.labelsUnit = units.map(u => ({
    name: u.name, at: P(u.x, u.y, 400), size: 9.5, col: [...TK('t-lo'), 165], off: [0, 15]
  }));

  /* Ten kilometre grid ticks along the south and west edges of the sector.
     The 2D map prints these against the frame of the viewport; here they
     belong to the ground, so they run along the sector boundary and stay
     where they are when the camera turns. Without them the graticule is
     decoration — with them it is a ruler, and the operator can read a
     distance off the picture without waiting for the scale bar. */
  S.labelsGrid = [];
  const gcol = [...TK('t-lo'), 130];
  for (let gx = 0; gx <= scn.widthKm; gx += 10) {
    S.labelsGrid.push({ name: String(gx).padStart(2, '0'), at: P(gx, scn.heightKm, 30),
                        size: 8.5, col: gcol, off: [0, 11] });
  }
  for (let gy = 0; gy <= scn.heightKm; gy += 10) {
    S.labelsGrid.push({ name: String(gy).padStart(2, '0'), at: P(0, gy, 30),
                        size: 8.5, col: gcol, off: [-13, 0], anchor: 'end' });
  }

  /* What the sector looks like from the theatre: one ring and one name. */
  S.controlFar = [{
    path: ringKm(P, scn.widthKm / 2, scn.heightKm / 2,
                 Math.max(scn.widthKm, scn.heightKm) * 0.62, 64).map(q => [q[0], q[1], 40]),
    col: [...C.frame, 150], w: 1.4
  }, {
    path: [P(0, 0, 40), P(scn.widthKm, 0, 40), P(scn.widthKm, scn.heightKm, 40),
           P(0, scn.heightKm, 40), P(0, 0, 40)],
    col: [...C.frame, 90], w: 1
  }];
  S.labelsFar = [{
    name: scn.aor, at: P(scn.widthKm / 2, -Math.max(scn.widthKm, scn.heightKm) * 0.72, 40),
    size: 13, col: [...C.frame, 235]
  }, {
    name: (a.joa && a.joa.force ? a.joa.force.toUpperCase() : ''),
    at: P(scn.widthKm / 2, scn.heightKm + Math.max(scn.widthKm, scn.heightKm) * 0.72, 40),
    size: 10, col: [...C.dim, 190]
  }];

  /* The relay's racetrack, sampled once. */
  if (typeof cmdUavPos === 'function' && typeof CMDUAV === 'object') {
    const path = [];
    for (let i = 0; i <= 96; i++) {
      const u = cmdUavPos(scn, i / 96 * CMDUAV.orbitPeriodMin);
      path.push(P(u.x, u.y, 2600));
    }
    S.control.push({ path, col: [...TK('m-track'), 40], w: 1 });
    S.uav = true;
  }

  /* Every flown segment, flattened into one array so the whole fleet's
     motion is a single layer. Colour is by platform: the long-range airframe
     is the one crossing water no ground vehicle can. */
  const TRIP_COL = { get HEAVY() { return TK('m-track'); }, get LIGHT() { return TMIX('m-track','t-mid',0.5); }, get LONG() { return TK('amb'); } };
  S.trips = [];
  for (const d of rec.drones) {
    for (const s of d.trips) {
      S.trips.push({ path: s.path, timestamps: s.timestamps, col: TRIP_COL[d.type] || C.drone });
    }
  }

  for (const arr of [S.labels, S.labelsUnit, S.labelsGrid, S.labelsFar]) {
    for (const l of (arr || [])) extendCharset(l.name);
  }
  for (const b of rec.arm.bases) extendCharset(b.name);
  for (const z of (scn.threats || [])) extendCharset(z.label);
  for (const d of rec.drones) { extendCharset(d.call); extendCharset(d.baseName); }
  for (const c of rec.cas) extendCharset(c.cls);
  extendCharset(scn.aor);
  if (typeof CMDUAV === 'object') extendCharset(CMDUAV.callsign);

  return S;
}

/* Cull the detailed coastline to what the camera can see. Recomputed only
   when the visible bounds have actually moved, because the answer is stable
   for the whole of a pan that stays inside the box already chosen. */
function neForView() {
  const S = G3.statics;
  if (!S) return { fill: [], lines: [] };
  if (G3.zoom < 5.6) return { fill: S.neCoarse, lines: S.neCoarseLines.concat(S.neBorders) };
  /* The box is derived from the zoom rather than read from the viewport.
     A pitched viewport's own bounds run to the horizon and select most of a
     hemisphere, which defeats the point; a generous box around the camera
     centre is both cheaper to compute and stable while panning. */
  const v = G3.view;
  const host = document.getElementById('g3Canvas');
  const w = (host && host.clientWidth) || 1200, h = (host && host.clientHeight) || 700;
  const spanLon = 360 / Math.pow(2, v.zoom) * (w / 512) * 1.8;
  const spanLat = spanLon * (h / w) * 2.4;
  const box = [v.longitude - spanLon, v.latitude - spanLat,
               v.longitude + spanLon, v.latitude + spanLat];
  const key = box.map(v => v.toFixed(2)).join(',');
  if (G3._neKey === key) return G3._neCut;
  const hit = x => !(x.bbox[2] < box[0] || x.bbox[0] > box[2] || x.bbox[3] < box[1] || x.bbox[1] > box[3]);
  G3._neKey = key;
  G3._neCut = {
    fill: S.neAll.filter(hit),
    lines: S.neAllLines.filter(hit).concat(S.neBorders)
  };
  return G3._neCut;
}

/* ==================================================================== */
/*  ENTITY SYMBOLOGY                                                    */
/*  Icons, chips and dynamic strokes — the whole moving picture.        */
/* ==================================================================== */

/* How much ground is on the screen. Everything that gates on scale gates on
   this rather than on the zoom number, because a zoom level means different
   things on different screens and in different scenarios, and the honest
   question is always "how many kilometres am I looking at". */
function scaleOf() {
  const host = document.getElementById('g3Canvas');
  const w = (host && host.clientWidth) || 1200;
  const lat = (G3.view && G3.view.latitude) || 0;
  const kmPerPx = 360 / (512 * Math.pow(2, G3.view.zoom)) *
                  KM_PER_DEG_LON_EQ * Math.cos(lat * Math.PI / 180);
  return { kmPerPx, kmAcross: kmPerPx * w, w };
}

/* Three densities, following the precedent the 2D map sets with its `crowded`
   flag. The whole theatre in view is not a picture you can label; a sector is;
   a cluster of casualties wants everything including the cold-chain
   temperature. The thresholds are in kilometres across the viewport. */
const TIER = { THEATRE: 0, WORKING: 1, CLOSE: 2 };
function tierFor(kmAcross) {
  if (kmAcross > 300) return TIER.THEATRE;
  if (kmAcross > 92) return TIER.WORKING;
  return TIER.CLOSE;
}

/* -------------------------------------------------------------- the chip */
/* The 2D map's `chipAt` is a small labelled plate at a point: the primitive
   that turns a dot into a thing with a name. This is the same idea for a
   perspective camera. One TextLayer carries every chip on the map, with a
   per-datum background, so the entire labelling of the picture is a single
   draw call.

   `alts` is the placement ladder: the first offset is where the chip wants to
   sit, and the rest are where it will settle for if that space is taken. */
/* `spread` pushes the whole ladder outward. It exists because a symbol is its
   own obstacle: an aircraft glyph is nearly forty pixels across, so a chip
   sitting sixteen pixels off centre lands inside its own airframe, is
   rejected by the placement pass, and the aircraft loses its callsign. Every
   caller passes half its own symbol. */
function chip(out, at, text, fg, bg, pri, alts, size, spread, lead, group) {
  out.push({ at, text: String(text), col: fg, bg, pri, spread: spread || 0, lead: !!lead,
             group: group || null, alts: alts || CHIP_ALT.right, size: size || 10 });
}
/* A chip is about twenty-two pixels tall once its plate and its clearance are
   counted, so every rung of every ladder is a multiple of that. Getting this
   wrong is not subtle: at thirteen pixels the second chip on an aircraft
   overlaps the first, the placement pass rejects it, and the aircraft loses
   the line that says what it is carrying. */
const ROW = 22;
const CHIP_ALT = {
  right: [[16, -ROW / 2, 'start'], [-16, -ROW / 2, 'end'],
          [16, ROW / 2, 'start'], [-16, ROW / 2, 'end'],
          [16, -ROW * 1.5, 'start'], [-16, -ROW * 1.5, 'end'],
          [16, ROW * 1.5, 'start'], [-16, ROW * 1.5, 'end'],
          [0, -ROW * 1.5, 'middle'], [0, ROW * 1.5, 'middle'],
          [16, -ROW * 2.5, 'start'], [-16, ROW * 2.5, 'end']],
  rightLow: [[16, ROW / 2, 'start'], [-16, ROW / 2, 'end'],
             [16, ROW * 1.5, 'start'], [-16, ROW * 1.5, 'end'], [0, ROW, 'middle']],
  above: [[0, -ROW, 'middle'], [0, -ROW * 2, 'middle'],
          [20, -ROW, 'start'], [-20, -ROW, 'end'],
          [20, -ROW * 2, 'start'], [-20, -ROW * 2, 'end'],
          [0, ROW, 'middle'], [20, ROW, 'start'], [-20, ROW, 'end']],
  below: [[0, ROW, 'middle'], [0, ROW * 2, 'middle'],
          [20, ROW, 'start'], [-20, ROW, 'end'],
          [0, -ROW, 'middle'], [20, -ROW, 'start'], [-20, -ROW, 'end']],
  fixed: [[0, 0, 'middle']]
};

/* Priority is operational value, not visual weight. When two labels want the
   same hundred square pixels, the one that decides what an operator does next
   wins: an aircraft's callsign and job beat a sea name, a countdown on a
   casualty with four minutes left beats both, and the identity of a stable
   casualty yields to all of them and comes back on the next zoom step. */
const PRI = { summary: 2000, base: 1300, aircraft: 1200, deadline: 1000,
              relay: 930, geography: 900, threat: 700, role: 600, casualty: 300 };

/* Colours used often enough to be worth naming — as [ink, plate] pairs.

   The plate is this map's halo. A TextLayer chip is drawn on an opaque
   background of its own, so what the type is measured against is a colour
   this table chose rather than whatever terrain happens to be behind it:
   the contrast of every label on this map is therefore a property of two
   tokens and can be computed rather than sampled. Every plate below is
   --m-halo, which is the darkest surface each theme declares, and every ink
   is a full-strength semantic token — which is what puts the worst pair in
   any theme comfortably past 4.5:1.

   HVA inverts — dark ink on a filled amber plate — because a
   commander-designated casualty has to be found on a crowded map in one
   sweep, and inversion is the only channel left once colour is spent. */
const HALO = () => TK('m-halo');
const CHIP = {
  get ink()   { return [[...TK('t-hi'), 255], [...HALO(), 255]]; },
  get dim()   { return [[...TK('t-mid'), 255], [...HALO(), 255]]; },
  get dead()  { return [[...TK('red'), 255], [...HALO(), 255]]; },
  get warn()  { return [[...TK('amb'), 255], [...HALO(), 255]]; },
  get hva()   { return [[...TK('m-halo'), 255], [...TK('amb'), 255]]; },
  get base()  { return [[...TK('cyan'), 255], [...HALO(), 255]]; },
  get blood() { return [[...TK('red'), 255], [...HALO(), 255]]; },
  get relay() { return [[...TK('blue'), 255], [...HALO(), 255]]; },
  get ok()    { return [[...TK('grn'), 255], [...HALO(), 255]]; },
  get en()    { return [[...TK('red'), 255], [...HALO(), 255]]; }
};

/* Place the chips. Everything on this map is competing for the same few
   hundred square pixels, so the chips are projected to the screen, sorted by
   how much the operator needs them, and laid down one at a time into the
   first free slot on their ladder. A chip that cannot find room is dropped
   rather than printed on top of another one — an unreadable label is worse
   than no label, and the tier system means the dropped ones come back as soon
   as the operator zooms in.

   This costs one projection per candidate on the CPU, of the order of a
   hundred per rebuild. It is far cheaper than a GPU collision pass and it is
   the only way to keep the promise that the map never looks cluttered. */
function placeChips(cands, obstacles) {
  const vps = G3.deck && G3.deck.getViewports ? G3.deck.getViewports() : null;
  const vp = vps && vps[0];
  if (!vp) return [];
  const W = vp.width, H = vp.height;
  const taken = [];
  const out = [];
  /* The panels, the counter strip and the transport bar are opaque HTML
     floating over this canvas. A chip placed underneath one of them is not a
     chip, it is a wasted slot and a label the operator will never see, so the
     regions they occupy are declared taken before anything is placed. The 2D
     map does the same thing by hand with its dock width and banner offset. */
  const host = document.getElementById('g3Canvas');
  const hb = host ? host.getBoundingClientRect() : { left: 0, top: 0 };
  for (const sel of ['.g3Top', '.g3Bot', '.g3Left', '.g3Right', '.g3Furn']) {
    const el = document.querySelector('#g3Wrap ' + sel);
    if (!el || !el.offsetParent && sel !== '.g3Top') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    taken.push([r.left - hb.left - 4, r.top - hb.top - 4,
                r.right - hb.left + 4, r.bottom - hb.top + 4]);
  }
  /* AND THE PANELS THAT ARE NOT IN THIS DOCUMENT. Docked into the design this
     map is the page, with a column of floating panels down each side of it,
     and no selector written here can see them. The host measures its own
     chrome and publishes how far in it reaches — the same mechanism the
     transport bar's inset and the comms banner's offset already use, over the
     whole picture rather than one strip. Nothing published, nothing reserved. */
  {
    const ins = hostInsets();
    if (ins.l > 0) taken.push([-40, -40, ins.l, H + 40]);
    if (ins.r > 0) taken.push([W - ins.r, -40, W + 40, H + 40]);
    if (ins.t > 0) taken.push([-40, -40, W + 40, ins.t]);
    if (ins.b > 0) taken.push([-40, H - ins.b, W + 40, H + 40]);
  }
  /* The symbols themselves are obstacles. A chip printed across an airframe
     hides the one thing on the map that says which way it is pointing, and a
     chip printed across a casualty hides the triage colour. Both are worse
     than the chip being one rung further out. */
  for (const o of (obstacles || [])) {
    let p;
    try { p = vp.project(o.at); } catch (e) { continue; }
    if (!p || p[2] > 1) continue;
    const rx = o.rx == null ? o.r : o.rx, ry = o.ry == null ? o.r : o.ry;
    taken.push([p[0] - rx, p[1] - ry, p[0] + rx, p[1] + ry]);
  }
  /* Chips belonging to one entity are placed as a block, never individually.
     An aircraft's callsign and the line saying what it is carrying are one
     statement; letting the placement pass send them to opposite sides of the
     airframe produces two orphan labels and no aircraft that reads as having
     a job. So the group gets one rectangle, one rung and one leader, and the
     members stack inside it in the order they were declared. */
  const groups = new Map();
  let anon = 0;
  for (const c of cands) {
    const k = c.group || ('_' + (anon++));
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }
  const blocks = [];
  for (const m of groups.values()) {
    blocks.push({ m, pri: Math.max.apply(null, m.map(x => x.pri)), at: m[0].at,
                  alts: m[0].alts, spread: m[0].spread, lead: m.some(x => x.lead) });
  }
  blocks.sort((a, b) => b.pri - a.pri);

  const leads = [], placedRects = [];
  for (let g of blocks) {
    let p;
    try { p = vp.project(g.at); } catch (e) { continue; }
    if (!p || p[2] > 1 || p[0] < -80 || p[0] > W + 80 || p[1] < -40 || p[1] > H + 40) continue;
    // Monospace, so the width is the character count. 5 px of plate each side.
    let cw = 0;
    for (const c of g.m) cw = Math.max(cw, c.text.length * c.size * 0.605 + 11);
    const n = g.m.length, ch = n * ROW;
    let placed = null;
    const sp = g.spread || 0;
    for (const rung of g.alts) {
      /* The spread pushes the block clear of its own symbol along whichever
         axis the rung is mainly using. Applying it to both axes at once sends
         a chip diagonally into the middle distance. */
      const wide = Math.abs(rung[0]) >= Math.abs(rung[1]);
      const dx = rung[0] === 0 ? 0 : rung[0] + Math.sign(rung[0]) * (wide ? sp : 0);
      const dy = rung[1] === 0 ? 0 : rung[1] + Math.sign(rung[1]) * (wide ? 0 : sp);
      const anchor = rung[2];
      const cx = p[0] + dx, cy = p[1] + dy;
      const x0 = anchor === 'start' ? cx : anchor === 'end' ? cx - cw : cx - cw / 2;
      const r = [x0 - 2, cy - ch / 2 - 2, x0 + cw + 2, cy + ch / 2 + 2];
      if (r[0] < -70 || r[2] > W + 70) continue;
      let clash = false;
      for (const q of taken) {
        if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) { clash = true; break; }
      }
      if (!clash) { placed = [dx, dy, anchor, r]; break; }
    }
    /* Three aircraft stacked over one island cannot each have two rows of
       chips. Rather than drop an airframe's identity altogether, a block that
       will not fit anywhere retries as its first chip alone — the callsign.
       This is the same trade the 2D map makes with its `crowded` flag: shed
       the secondary line, never the name. */
    if (!placed && g.m.length > 1) {
      const c0 = g.m[0];
      const cw1 = c0.text.length * c0.size * 0.605 + 11;
      for (const rung of g.alts) {
        const wideA = Math.abs(rung[0]) >= Math.abs(rung[1]);
        const dx = rung[0] === 0 ? 0 : rung[0] + Math.sign(rung[0]) * (wideA ? sp : 0);
        const dy = rung[1] === 0 ? 0 : rung[1] + Math.sign(rung[1]) * (wideA ? 0 : sp);
        const cx = p[0] + dx, cy = p[1] + dy;
        const x0 = rung[2] === 'start' ? cx : rung[2] === 'end' ? cx - cw1 : cx - cw1 / 2;
        const r = [x0 - 2, cy - ROW / 2 - 2, x0 + cw1 + 2, cy + ROW / 2 + 2];
        if (r[0] < -70 || r[2] > W + 70) continue;
        let clash = false;
        for (const q of taken) {
          if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) { clash = true; break; }
        }
        if (!clash) { placed = [dx, dy, rung[2], r]; g = { ...g, m: [c0] }; break; }
      }
    }
    if (!placed) continue;
    taken.push(placed[3]);
    /* Where the label actually went, so a verification pass can assert that
       nothing landed under the page's own panels. */
    placedRects.push(placed[3]);
    g.m.forEach((c, i) => {
      out.push({ at: c.at, text: c.text, col: c.col, bg: c.bg, size: c.size,
                 off: [placed[0], placed[1] - (n - 1) * ROW / 2 + i * ROW],
                 anchor: placed[2] });
    });

    /* A leader line, once the block has been pushed far enough from its symbol
       that the association is no longer obvious. This is the piece of the 2D
       map that cannot simply be copied: there, the chip sits at a fixed offset
       and collisions are avoided by drawing fewer of them. Here the placement
       pass moves chips around to fit, so each block has to say what it belongs
       to. Drawn by unprojecting the block's screen anchor back onto the
       entity's own altitude, which keeps the leader registered as the camera
       pitches. */
    if (g.lead && (Math.abs(placed[0]) > 24 || Math.abs(placed[1]) > 18)) {
      const ax = placed[2] === 'start' ? placed[3][0] + 1
               : placed[2] === 'end' ? placed[3][2] - 1 : (placed[3][0] + placed[3][2]) / 2;
      const ay = (placed[3][1] + placed[3][3]) / 2;
      try {
        const z = g.at.length > 2 ? g.at[2] : 0;
        const w = vp.unproject([ax, ay], { targetZ: z });
        leads.push({ path: [[g.at[0], g.at[1], z], [w[0], w[1], z]],
                     col: [...TK('t-lo'), 165], w: 1.1 });
      } catch (e) { /* off the far side of the globe; no leader */ }
    }
  }
  out.leads = leads;
  G3._placedRects = placedRects;
  return out;
}

/* Every glyph string the chips can ever contain, so the TextLayer builds its
   font atlas once instead of rebuilding it the first time a temperature ends
   in a digit it has not seen. */
const CHIP_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;/-+()[]<>*#%°·×—’&→›';

/* Every glyph the two text layers can ever need, fixed at build time.
   `characterSet: 'auto'` looked like the convenient choice and it is a trap:
   deck.gl regenerates the font atlas whenever a character it has not seen
   turns up, and the glyph indices already uploaded to the GPU do not survive
   it. The visible symptom was the ten kilometre grid printing "1A" where it
   meant "10" — the digit zero had been re-indexed underneath a buffer that
   still held the old atlas. A fixed set cannot drift. */
let TEXT_CHARS = CHIP_CHARS;
function extendCharset(str) {
  let add = '';
  for (const ch of String(str || '')) if (TEXT_CHARS.indexOf(ch) < 0 && add.indexOf(ch) < 0) add += ch;
  TEXT_CHARS += add;
}

/* ------------------------------------------------------- the moving picture */
/* Icons, chips and dynamic strokes for one instant, built together because
   they share the same walk over the entities and the same placement budget.
   Memoised on the quantised clock, the density tier and the selection. */
function buildEntities(rec, t) {
  const { P, scn } = rec;
  const sc = scaleOf();
  const tier = tierFor(sc.kmAcross);
  const icons = [], chips = [], dyn = [], obs = [];
  const near = sc.kmAcross < 700;
  const S = G3.statics;
  const L = G3.layers;
  /* Read once for the whole symbology pass rather than once per casualty.
     A hundred and twenty-five soldiers at four labels each is five hundred
     token reads a rebuild if this is not hoisted. */
  const t_hi = TK('t-hi'), halo = TK('m-halo');

  /* Geographic type — sea names, landform names, unit boundaries, the ten
     kilometre grid ticks and the disputed line — goes through the same chip
     array as everything else, with a transparent plate.

     It is here rather than in a TextLayer of its own for two reasons. It
     halves the labelling to one draw call. And deck.gl caches font atlases
     by font family and weight, appending glyphs as layers ask for them: two
     TextLayers on the same family at different weights were regenerating each
     other's atlas between frames, and the visible result was the ten
     kilometre grid printing "7A" where it meant "70" and the Philippine Sea
     losing half its letters. One layer, one weight, one atlas, no drift. */
  if (L.labels) {
    const type = !near ? S.labelsFar
      : S.labels.concat(L.sector ? S.labelsUnit : [])
                .concat(tierFor(sc.kmAcross) === TIER.THEATRE ? [] : S.labelsGrid);
    for (const l of type) {
      chips.push({ at: l.at, text: l.name, col: l.col, bg: [0, 0, 0, 0], pri: 900,
                   spread: 0, lead: false, group: null, size: l.size,
                   alts: [[l.off ? l.off[0] : 0, l.off ? l.off[1] : 0, l.anchor || 'middle'],
                          [0, -ROW, 'middle'], [0, ROW, 'middle']] });
    }
  }

  /* Ring radii are expressed in kilometres but sized from the current scale,
     so a ring is the same number of pixels across at every zoom — which is
     how the 2D map draws them and what makes them read as symbology rather
     than as a distance claim. */
  const px = k => sc.kmPerPx * k;
  const SZ = [
    { air: 22, base: 20, en: 18, tgt: 0, kia: 0, hva: 0, relay: 22 },
    { air: 38, base: 34, en: 28, tgt: 28, kia: 14, hva: 24, relay: 34 },
    { air: 48, base: 44, en: 34, tgt: 36, kia: 18, hva: 30, relay: 44 }
  ][tier];

  /* ---- the whole theatre: one block of numbers where the fight is ---- */
  if (tier === TIER.THEATRE) {
    let died = 0, open = 0, air = 0;
    for (const c of rec.cas) {
      const s = casAt(c, t);
      if (!s) continue;
      if (s.state === 'DIED') died++;
      else if (s.state === 'OPEN' || s.state === 'INBOUND') open++;
    }
    for (const d of rec.drones) { const st = droneAt(d, t); if (st.st === 1 || st.st === 2 || st.st === 4) air++; }
    /* Hung off the area-of-operations name rather than dropped in the middle
       of the sector, which at this scale is a knot of symbols a hundred
       pixels across. Priority above the geography, because at theatre zoom
       this block is the only thing on the screen an operator can read. */
    const anchor = (S.labelsFar && S.labelsFar[0]) ? S.labelsFar[0].at
                 : P(scn.widthKm / 2, scn.heightKm / 2, 40);
    chip(chips, anchor, open + ' OPEN · ' + died + ' DIED · ' + air + ' AIRBORNE',
         CHIP.ink[0], CHIP.ink[1], 2000, CHIP_ALT.below, 10.5, 4, false, 'far');
  }

  /* ---- threats ---- */
  if (G3.layers.threat) {
    for (const z of (scn.threats || [])) {
      icons.push({ icon: 'en', at: P(z.x, z.y, 60), size: SZ.en, kind: 'threat',
                   label: z.label, r: z.r, lossPerMin: z.lossPerMin });
      if (tier !== TIER.THEATRE) {
        chip(chips, P(z.x, z.y - z.r * 0.62, 60), z.label, CHIP.en[0], CHIP.en[1], 700,
             CHIP_ALT.above, 9.5, SZ.en * 0.5, true, 'z' + z.label);   // pri 700
      }
    }
  }

  /* ---- casualties ----
     Order matters. A casualty who is about to die has to win every contest
     for space against one who is stable, so priority is urgency. */
  if (G3.layers.cas && tier !== TIER.THEATRE) {
    let idBudget = tier === TIER.CLOSE ? 70 : 22;
    /* Whatever is selected is named, in every state and at every zoom, and
       ahead of the identity budget. The operator has just asked what that
       mark is; leaving it anonymous while a panel elsewhere describes it is
       the long way round. */
    const selId = (G3.sel && G3.sel.kind === 'cas') ? G3.sel.id : null;
    const live = [], resolved = [];
    for (const c of rec.cas) {
      const s = casAt(c, t);
      if (!s) continue;
      if (s.state === 'DIED' || s.state === 'SAVED' || s.state === 'TREATED') {
        resolved.push([c, s]);
        obs.push({ at: c.pos, r: 6 });
        continue;
      }
      live.push([c, s]);
    }
    live.sort((a, b) => b[1].urgency - a[1].urgency);

    /* Rings first, so nothing meaning-bearing is drawn under one. Within a
       single IconLayer the draw order is the data order, which is the only
       control there is over what covers what. */
    for (const [c, s] of live) {
      const timed = isFinite(s.left);
      const crm = timed ? Math.max(0, 100 - s.urgency * 100) : 88;
      if (c.reachN !== undefined && c.reachN <= 1) {
        icons.push({ icon: c.reachN === 0 ? 'cov0' : 'cov1', at: c.pos, size: CAS_SIZE,
                     kind: 'cas', id: c.id, cas: c, obsR: 11 });
      }
      if (timed && crm < PARAMS.CRM_YELLOW) {
        const band = Math.max(0, Math.min(CRM_BANDS - 1,
          Math.floor(crm / (PARAMS.CRM_YELLOW / CRM_BANDS))));
        icons.push({ icon: 'crm' + band, at: c.pos, size: CAS_SIZE,
                     kind: 'cas', id: c.id, cas: c, obsR: 10 });
      }
    }

    /* Then the resolved: a death and a treated soldier are both outcomes and
       neither may be hidden behind a live mark. Deaths are drawn last of the
       three because the death count is the headline number of this whole
       application and must never be the thing that is covered up. */
    for (const [c, s] of resolved) {
      if (s.state === 'DIED') continue;
      icons.push({ icon: s.state === 'SAVED' ? 'c_sv' : 'c_tr', at: c.pos, size: CAS_SIZE,
                   kind: 'cas', id: c.id, cas: c, obsR: 5 });
    }

    for (const [c, s] of live) {
      const timed = isFinite(s.left);
      const crm = timed ? Math.max(0, 100 - s.urgency * 100) : 88;
      const col = TRIAGE[c.cls] || C.dim;

      /* The plotted position. Colour is the reserve band and radius carries
         deterioration, both exactly as map.js draws them. */
      const icon = c.cls === 'EXPECTANT' ? 'c_ex'
        : !timed ? 'c_st'
        : crm < PARAMS.CRM_RED ? 'c_cr'
        : crm < PARAMS.CRM_YELLOW ? 'c_fa' : 'c_st';
      icons.push({ icon, at: c.pos, size: CAS_SIZE, kind: 'cas', id: c.id, cas: c, obsR: 6 });
      if (c.hva) icons.push({ icon: 'hva', at: c.pos, size: CAS_SIZE, kind: 'cas',
                              id: c.id, cas: c, obsR: 12 });

      /* The countdown. Red, in minutes, exactly as the 2D map prints it. */
      if (timed && crm < PARAMS.CRM_RED) {
        chip(chips, c.pos, Math.max(0, s.left).toFixed(0) + ' MIN',
             CHIP.dead[0], CHIP.dead[1], 1000 + s.urgency * 100, CHIP_ALT.right, 9.5, 4, true, 'c' + c.id);
      }
      if (c.hva) {
        const short = (typeof ROLES !== 'undefined' && ROLES[c.role]) ? ROLES[c.role].short : 'HVA';
        chip(chips, c.pos, short, CHIP.hva[0], CHIP.hva[1], 600, CHIP_ALT.right, 8.5, 4, true, 'c' + c.id);
      }
      /* Identity. Every mark gets a name when there is room for one: this is
         the difference between a picture and a scatter of dots. */
      if (idBudget > 0 || c.id === selId) {
        if (c.id !== selId) idBudget--;
        const on = c.id === selId;
        /* The plate is tinted with the triage colour rather than carrying the
           triage word. An earlier build printed "C-30 MIN" for a MINIMAL
           casualty, three pixels from a "15 MIN" countdown on the next
           soldier, and the two are not distinguishable at a glance. Colour
           says the same thing and cannot be misread as a number. */
        /* Ink lifted toward the theme's brightest text, plate sunk toward
           its darkest surface with a fifth of the triage colour left in it.
           Both ends derive from tokens, so the ratio between them is fixed
           per theme rather than a function of the triage hue. */
        const ink = [Math.min(255, col[0] * 0.62 + t_hi[0] * 0.38),
                     Math.min(255, col[1] * 0.62 + t_hi[1] * 0.38),
                     Math.min(255, col[2] * 0.62 + t_hi[2] * 0.38), 255];
        const plate = [(halo[0] * 0.82 + col[0] * 0.18) | 0,
                       (halo[1] * 0.82 + col[1] * 0.18) | 0,
                       (halo[2] * 0.82 + col[2] * 0.18) | 0, 255];
        chip(chips, c.pos, 'C-' + c.id,
             on ? [...t_hi, 255] : ink,
             on ? [...TMIX('m-halo', 'cyan', 0.34), 255] : plate,
             on ? 1900 : 300 + s.urgency * 100, CHIP_ALT.right, 8.5, 4, true, 'c' + c.id);
      }
    }

    /* Deaths, on top of everything else on the ground. A survivable death —
       one an airframe could have reached in time — is the heavy red cross;
       anything else is the thin grey one. */
    for (const [c, s] of resolved) {
      if (s.state !== 'DIED') continue;
      const surv = c.cls === 'IMMEDIATE' || c.cls === 'DELAYED';
      icons.push({ icon: surv ? 'kia_s' : 'kia_n', at: c.pos, size: CAS_SIZE,
                   kind: 'cas', id: c.id, cas: c, obsR: 6 });
      if (c.hva) icons.push({ icon: 'hva', at: c.pos, size: CAS_SIZE, kind: 'cas',
                              id: c.id, cas: c, obsR: 12 });
      /* Close in, name the dead too. A cross with no name is a fact without a
         subject, and at this zoom there is room. */
      if (tier === TIER.CLOSE || c.id === selId) {
        const on = c.id === selId;
        chip(chips, c.pos, 'C-' + c.id,
             on ? [...TK('t-hi'), 255] : [...TK('t-mid'), 255],
             on ? [...TMIX('m-halo', 'cyan', 0.34), 255] : [...TK('m-halo'), 255],
             on ? 1900 : 120, CHIP_ALT.right, 8.5, 4, true, 'c' + c.id);
      }
    }
  }

  /* ---- launch points ---- */
  const readyAt = new Map();
  for (const d of rec.drones) {
    const st = droneAt(d, t);
    if (st.st === 0) readyAt.set(d.baseName, (readyAt.get(d.baseName) || 0) + 1);
  }
  const kStep = Math.max(0, Math.min(rec.steps, Math.round(t / STEP_MIN)));
  rec.arm.bases.forEach((b, bi) => {
    const src = scn.bases[bi];
    const at = P(b.x, b.y, 0);
    icons.push({ icon: src && src.afloat ? 'ship' : 'farp', at, size: SZ.base,
                 kind: 'base', name: b.name, bi });
    if (tier === TIER.THEATRE) return;
    /* Above the aircraft. There are two or three launch points on a map and
       a dozen aircraft; an unnamed pad is a permanent hole in the picture,
       an aircraft that loses its second row for a few seconds is not. */
    chip(chips, at, b.name, CHIP.base[0], CHIP.base[1], 1300,
         CHIP_ALT.above, 10, SZ.base * 0.5, true, 'b' + bi);
    const blood = rec.stock[bi] ? rec.stock[bi][kStep] : b.stock.BLOOD;
    const rdy = readyAt.get(b.name) || 0;
    chip(chips, at, Math.round(blood) + 'u BLOOD · ' + rdy + ' RDY',
         blood <= 1 ? CHIP.warn[0] : CHIP.blood[0], blood <= 1 ? CHIP.warn[1] : CHIP.blood[1],
         1298, CHIP_ALT.above, 9, SZ.base * 0.5, false, 'b' + bi);
  });

  /* ---- aircraft ----
     An aircraft has to read as an airframe with a job. The glyph says which
     platform and which way it is pointing; the first chip says who it is; the
     second says what it is carrying and who to; the third says whether the
     blood is still cold enough to transfuse. The line and the reticle say
     where it is going, because a drone flying towards nothing on the screen
     is the thing the operator complained he could not read. */
  const air = [];
  for (const d of rec.drones) {
    const st = droneAt(d, t);
    if (st.st === 0 || st.st === 3) continue;
    const at = P(st.x, st.y, 320);
    const rtb = st.st === 2;
    const onSt = st.st === 4;
    const payload = st.pl >= 0 ? PAYLOAD_ORDER[st.pl] : null;
    const rowObj = {
      kind: 'drone', id: d.id, call: d.call, label: d.label, type: d.type,
      base: d.baseName, pos: at, st: st.st, tgt: st.tgt, cold: st.cold,
      payload, os: st.os, hdg: st.hdg
    };
    air.push(rowObj);

    icons.push({
      icon: (AIR_ICON[d.type] || 'light') + (rtb ? '_r' : '_a'),
      at, size: SZ.air,
      /* Billboarded icons live in screen space, so the camera's own bearing
         has to come out of the heading or every aircraft points north-ish
         whichever way the operator has rotated the map. */
      angle: (G3.view.bearing || 0) - st.hdg,
      kind: 'drone', id: d.id, drone: rowObj
    });

    if (tier === TIER.THEATRE) continue;

    const dst = P(st.dx, st.dy, 40);
    if (!rtb) {
      dyn.push({ path: [[at[0], at[1], 320], dst], col: [...C.drone, rtb ? 70 : 130], w: 1.3 });
      icons.push({ icon: 'tgt', at: dst, size: SZ.tgt, kind: 'tgt', id: d.id });
    }
    if (onSt) {
      dyn.push({ path: ringKm(P, st.dx, st.dy, px(16), 24).map(q => [q[0], q[1], 12]),
                 col: [...TK('t-hi'), 120], w: 1.2 });
    }

    const spread = SZ.air * 0.5;
    chip(chips, at, d.call, CHIP.ink[0], CHIP.ink[1], 1200, CHIP_ALT.right, 9.5, spread, true, 'd' + d.id);
    const pay = payload && typeof PAYSHORT !== 'undefined' && PAYSHORT[payload]
      ? PAYSHORT[payload] : payload || '';
    const what = onSt ? (st.os === 1 ? 'RELEASING C-' + st.tgt : 'RECOVERING C-' + st.tgt)
      : rtb ? (tier === TIER.CLOSE ? 'RTB ' + d.baseName : 'RTB')
      : pay + ' → C-' + st.tgt;
    const pc = onSt ? CHIP.ok : rtb ? CHIP.dim
      : (payload && PAYLOAD_COL[payload]
          ? [[...TK('t-hi'), 255],
             [...(function () { const q = PAYLOAD_COL[payload], hl = TK('m-halo');
                  return [(hl[0] * 0.74 + q[0] * 0.26) | 0, (hl[1] * 0.74 + q[1] * 0.26) | 0,
                          (hl[2] * 0.74 + q[2] * 0.26) | 0]; })(), 255]]
          : CHIP.dim);
    chip(chips, at, what, pc[0], pc[1], 1198, CHIP_ALT.right, 9, spread, false, 'd' + d.id);
    if (payload === 'BLOOD' && (tier === TIER.CLOSE || st.cold > PARAMS.COLD_MAX_C - 2.5)) {
      chip(chips, at, st.cold.toFixed(1) + '°C',
           st.cold > PARAMS.COLD_MAX_C - 1 ? CHIP.warn[0] : CHIP.ok[0],
           st.cold > PARAMS.COLD_MAX_C - 1 ? CHIP.warn[1] : CHIP.ok[1],
           1196, CHIP_ALT.right, 8.5, spread, false, 'd' + d.id);
    }
  }
  G3._air = air;

  /* ---- the relay ---- */
  if (G3.statics.uav) {
    const u = cmdUavPos(scn, t);
    const un = cmdUavPos(scn, t + 0.4);
    const at = P(u.x, u.y, 2600);
    icons.push({ icon: 'relay', at, size: SZ.relay, kind: 'uav',
                 angle: (G3.view.bearing || 0) -
                        (Math.atan2(un.x - u.x, -(un.y - u.y)) * 180 / Math.PI) });
    if (tier !== TIER.THEATRE) {
      chip(chips, at, CMDUAV.callsign, CHIP.relay[0], CHIP.relay[1], 930,
           CHIP_ALT.right, 9.5, SZ.relay * 0.5, true, 'u');
      chip(chips, at, 'C2 / ISR RELAY', [...TK('t-mid'), 255], [...TK('m-halo'), 255], 928,
           CHIP_ALT.right, 8.5, SZ.relay * 0.5, false, 'u');
    }
    G3._uavAt = at;
    G3._uavRing = [{ path: ringKm(P, u.x, u.y, CMDUAV.footprintKm, 48).map(q => [q[0], q[1], 8]),
                     col: [...TK('m-track'), 52], w: 1 }];
  }

  /* The current selection, drawn last so it is on top of whatever it marks.
     A ring rather than a recolour, because most of these symbols carry their
     meaning in their colour and there is none to spare. */
  if (G3.sel) {
    const sel = G3.sel;
    let at = null;
    if (sel.kind === 'cas') {
      const c = rec.cas.find(x => x.id === sel.id);
      if (c && casAt(c, t)) at = c.pos;
    } else if (sel.kind === 'drone') {
      const d = air.find(x => x.id === sel.id);
      if (d) at = d.pos;
    } else if (sel.kind === 'base') {
      const b = rec.arm.bases.find(x => x.name === sel.id);
      if (b) at = P(b.x, b.y, 0);
    }
    if (at) icons.push({ icon: 'sel', at, size: CAS_SIZE * 1.15, kind: sel.kind, id: sel.id });
  }

  /* Chips are kept off the symbols. The obstacle radius is the symbol's own
     visible ink, not its cell — a casualty is a 32-pixel icon carrying seven
     pixels of mark, and reserving the whole cell pushed every label a
     centimetre away from the thing it names. */
  for (const ic of icons) obs.push({ at: ic.at, r: ic.obsR || ic.size * 0.44 });
  const placed = placeChips(chips, obs);
  for (const ld of (placed.leads || [])) dyn.push(ld);
  G3._chipStat = { asked: chips.length, drawn: placed.length };
  return { icons, chips: placed, dyn, tier, near, sc };
}

/* ------------------------------------------------------------ layer build */

/* Layers are consolidated hard. Measured on a software rasteriser, the frame
   cost of this scene tracks the number of layers at least as strongly as it
   tracks the number of vertices — every layer is a shader program, a uniform
   block and a draw call, and deck.gl's projection vertex shader is not cheap
   when a CPU is executing it. So every line that can share a LineLayer does,
   every label and every chip shares one TextLayer, and every symbol on the
   map — airframes, launch points, the relay, threat diamonds, reticles and
   the crosses over the dead — shares one IconLayer. It costs some clarity in
   this file and it roughly doubles the frame rate on a machine with no GPU.

   Bringing the map to informational parity with the 2D one added three
   layers (icons, chips, dynamic strokes) and took three back: the decorative
   halo, the mark scatterplot the icons replaced, and the separate launch
   point label layer the chips absorbed. The relay footprint moved into the
   dynamic strokes. Net: one fewer layer than before, carrying several times
   as much information. */
function buildLayers() {
  /* Before anything else: if the theme moved while this map was not on
     screen, the atlas and the relief sheet are from the previous one. */
  ensureTheme();
  const rec = G3.rec, D = G3.D, S = G3.statics;
  if (!rec || !D || !S) return [];
  const { P, scn } = rec;
  const t = G3.t;
  const L = G3.layers;
  const lo = G3.lowGPU;

  // Quantised clock: accessors that depend on simulation time re-run only
  // when the time actually moves, not on every animation frame.
  const tKey = Math.round(t * 20);
  // Wall-clock phase drives the pulse. It is deliberately NOT the simulation
  // clock: the pulse is a property of the display, and it has to keep beating
  // while the operator has the run paused and is looking at one casualty.
  const wall = performance.now() / 1000;

  /* The moving picture is rebuilt when the clock moves, when the camera moves
     (chip placement is done in screen space, so it has to be), when a layer
     is switched, or when the selection changes. Nothing else touches it —
     panning a static scene costs one rebuild per frame of the pan and none
     once the operator lets go. */
  const v = G3.view;
  /* The page's own panels are part of this key for the same reason the camera
     is: where a chip may be laid down depends on how far in they reach, and
     that number arrives from the host after this map has already placed a
     frame's worth of labels. Without it, the first placement stands and the
     labels stay where the panels were not. */
  const eIns = hostInsets();
  const entKey = tKey + '|' + Math.round(v.longitude * 3000) + ',' + Math.round(v.latitude * 3000) +
    ',' + Math.round(v.zoom * 24) + ',' + Math.round(v.bearing || 0) + ',' + Math.round(v.pitch || 0) +
    '|' + (L.cas ? 1 : 0) + (L.threat ? 1 : 0) + '|' + (G3.sel ? G3.sel.kind + G3.sel.id : '') +
    '|' + eIns.l + ',' + eIns.r + ',' + eIns.t + ',' + eIns.b;
  if (G3._entKey !== entKey || !G3._ent) {
    G3._entKey = entKey;
    const e0 = performance.now();
    G3._ent = buildEntities(rec, t);
    // Cost of the whole symbology pass, including the screen-space placement.
    G3._entMs = G3._entMs * 0.85 + (performance.now() - e0) * 0.15;
  }
  const E = G3._ent;
  const near = E.near;

  const layers = [];

  /* ---- the world around the sector ---- */
  if (L.world) {
    if (!lo) layers.push(new D.LineLayer({
      id: 'g3-grat', data: G3.zoom > 7.4 ? S.grat : S.gratMajor,
      getSourcePosition: d => d.from, getTargetPosition: d => d.to,
      getColor: d => d.col, getWidth: 1, widthUnits: 'pixels', pickable: false
    }));
    const ne = neForView();
    layers.push(new D.SolidPolygonLayer({
      id: 'g3-ne-land', data: ne.fill,
      getPolygon: d => d.polygon, getFillColor: [...C.neLand, 255],
      extruded: false, pickable: false
    }));
    layers.push(new D.PathLayer({
      id: 'g3-ne-lines', data: ne.lines,
      getPath: d => d.path, getColor: d => d.col, getWidth: 1,
      widthUnits: 'pixels', pickable: false
    }));
  }

  /* ---- the sector's own ground ---- */
  if (L.terrain) {
    // `image` is a canvas element this module drew, not a URL. Nothing in
    // deck.gl's loader path is reachable from here.
    layers.push(new D.BitmapLayer({
      id: 'g3-sheet', image: S.terrain.image, bounds: S.terrain.bounds,
      _imageCoordinateSystem: undefined, textureParameters: {
        minFilter: 'linear', magFilter: 'linear',
        addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge'
      },
      pickable: false
    }));
  }

  /* ---- the area of operations field ----
     Over the sheet, under every control measure and every symbol. Only when
     the sector is actually the subject: at theatre scale it is a few pixels
     across and a blue smear there says nothing. */
  if (L.sector && near && S.aoField) {
    layers.push(new D.SolidPolygonLayer({
      id: 'g3-ao', data: S.aoField, getPolygon: d => d.polygon,
      getFillColor: d => d.col, extruded: false, pickable: false,
      parameters: { depthCompare: 'always' }
    }));
  }

  /* ---- control measures ----
     Sector frame, terrain-block edge, the disputed line, launch-point reach,
     allocator sectors, unit boundaries and the relay's footprint. All of them
     are strokes on the ground; there is no reason for them to be seven
     layers. The relay ring moves, so its ring is regenerated on the quantised
     clock and the array is rebuilt only then. */
  /* Every array handed to a layer below is memoised on the state it depends
     on. deck.gl compares `data` by reference, and a freshly concatenated
     array — however identical its contents — makes the layer regenerate and
     re-upload every attribute it owns. Rebuilding a TextLayer's glyph
     instances sixty times a second for labels that have not moved was, when
     measured, most of the frame. */
  /* Below the detail threshold the sector is a few pixels across and every
     control measure inside it collapses into one smear, so they come off and
     a single ring marks where the fight is. That threshold is also what makes
     zooming out to the whole theatre worth doing. */
  const ctlKey = (L.sector ? 1 : 0) + (near ? 2 : 0);
  if (G3._ctlKey !== ctlKey) {
    G3._ctlKey = ctlKey;
    G3._ctl = near ? S.control.concat(L.sector ? S.controlSector : []) : S.controlFar;
  }
  layers.push(new D.PathLayer({
    id: 'g3-control', data: G3._ctl,
    getPath: d => d.path, getColor: d => d.col, getWidth: d => d.w,
    widthUnits: 'pixels', pickable: false
  }));

  /* ---- dynamic strokes ----
     Compensatory-reserve arcs, coverage rings, the leg each aircraft is
     flying, the hold orbit over a casualty and the relay's telemetry
     footprint. All of them move with the clock and all of them are strokes,
     so they are one layer rather than five. */
  if (G3._dynKey !== entKey) {
    G3._dynKey = entKey;
    G3._dyn = S.uav && !lo ? E.dyn.concat(G3._uavRing || []) : E.dyn;
  }
  layers.push(new D.PathLayer({
    id: 'g3-dyn', data: G3._dyn,
    getPath: d => d.path, getColor: d => d.col, getWidth: d => d.w,
    widthUnits: 'pixels', widthMinPixels: 1, pickable: false
  }));

  if (L.threat && !lo && S.threats.length) {
    layers.push(new D.PolygonLayer({
      id: 'g3-threats', data: S.threats,
      getPolygon: d => d.polygon, filled: true, stroked: false,
      getFillColor: [...TK('red'), 16], extruded: false, pickable: true
    }));
  }

  /* ---- tasking ----
     One ArcLayer for the whole run. Sorties still in the air are drawn
     bright; sorties already home are drawn at a tenth of that, so scrubbing
     forward accumulates a web over the archipelago that is the tasking
     history and is worth being able to see at a glance. */
  if (L.arcs) {
    layers.push(new D.ArcLayer({
      id: 'g3-arcs', data: rec.arcs,
      getSourcePosition: d => d.from, getTargetPosition: d => d.to,
      getSourceColor: d => {
        const a = arcAlpha(d, t);
        if (a) return [d.col[0], d.col[1], d.col[2], Math.round(a * 80)];
        return t > d.t1 ? [d.col[0], d.col[1], d.col[2], 26] : [0, 0, 0, 0];
      },
      getTargetColor: d => {
        const a = arcAlpha(d, t);
        if (a) return [d.col[0], d.col[1], d.col[2], Math.round(a * 245)];
        return t > d.t1 ? [d.col[0], d.col[1], d.col[2], 86] : [0, 0, 0, 0];
      },
      getWidth: d => (arcAlpha(d, t) ? 3 : (t > d.t1 ? 1.1 : 0)),
      getHeight: 0.42, greatCircle: false, widthUnits: 'pixels',
      updateTriggers: { getSourceColor: tKey, getTargetColor: tKey, getWidth: tKey },
      pickable: true
    }));
  }

  /* ---- live motion ----
     TripsLayer takes the clock as a uniform, so scrubbing costs a uniform
     write and no attribute upload at all: the trail is computed on the GPU
     from timestamps already resident in the buffer. */
  if (L.trips && S.trips.length) {
    layers.push(new D.TripsLayer({
      id: 'g3-trips', data: S.trips,
      getPath: s => s.path, getTimestamps: s => s.timestamps,
      getColor: s => s.col, opacity: 0.9,
      widthUnits: 'pixels', getWidth: 2, widthMinPixels: 1.5,
      trailLength: 7, currentTime: t, fadeTrail: true,
      capRounded: !lo, jointRounded: !lo, pickable: false
    }));
  }

  /* ---- casualties ---- */
  if (L.cas) {
    /* The light column. Height is time pressure, so a screen full of tall
       spikes is a sector that is running out of time, and that reads across a
       briefing room without anyone having to consult a legend. The relay's
       mast shares the layer because it is the same primitive. */
    if (L.spikes) {
      layers.push(new D.LineLayer({
        id: 'g3-spikes', data: rec.cas,
        getSourcePosition: c => c.pos,
        getTargetPosition: c => {
          const s = casAt(c, t);
          if (!s) return [c.pos[0], c.pos[1], 0];
          const h = s.state === 'OPEN' || s.state === 'INBOUND'
            ? 400 + Math.pow(s.urgency, 0.85) * 6400 : (s.state === 'DIED' ? 340 : 240);
          return [c.pos[0], c.pos[1], h];
        },
        getColor: c => {
          const s = casAt(c, t);
          if (!s) return [0, 0, 0, 0];
          const col = spikeColour(c, s);
          return [col[0], col[1], col[2], s.state === 'OPEN' || s.state === 'INBOUND'
            ? Math.round(80 + s.urgency * 175) : 46];
        },
        getWidth: c => {
          const s = casAt(c, t);
          return s ? (s.state === 'OPEN' || s.state === 'INBOUND' ? 1.8 : 1) : 0;
        },
        widthUnits: 'pixels',
        updateTriggers: { getTargetPosition: tKey, getColor: tKey, getWidth: tKey },
        pickable: false
      }));
    }

    /* The pulse. Its RATE is the message: a ring expanding once every two
       seconds is a casualty with time; four beats a second is one who is
       about to be past saving. The radius is in metres, so the urgency stays
       a real distance on the ground rather than a screen decoration. */
    layers.push(new D.ScatterplotLayer({
      id: 'g3-pulse', data: rec.cas,
      getPosition: c => c.pos,
      getRadius: c => {
        const s = casAt(c, t);
        if (!s || (s.state !== 'OPEN' && s.state !== 'INBOUND') || !isFinite(s.left)) return 0;
        return 430 + pulsePhase(c, s, wall) * 3100;
      },
      getLineColor: c => {
        const s = casAt(c, t);
        if (!s || (s.state !== 'OPEN' && s.state !== 'INBOUND') || !isFinite(s.left)) return [0, 0, 0, 0];
        const col = TRIAGE[c.cls] || C.dim;
        const ph = pulsePhase(c, s, wall);
        return [col[0], col[1], col[2], Math.round((1 - ph) * (1 - ph) * (130 + s.urgency * 125))];
      },
      filled: false, stroked: true, getLineWidth: 1.8, lineWidthUnits: 'pixels',
      radiusUnits: 'meters', radiusMinPixels: 3, radiusMaxPixels: 130,
      updateTriggers: { getRadius: [tKey, G3._pulseTick], getLineColor: [tKey, G3._pulseTick] },
      pickable: false
    }));

    /* The casualty marks themselves are not here. They are symbols in the
       shared icon atlas — a small hard dot with the reserve sweep, coverage
       ring, designated-role chevrons and outcome cross around it, all drawn
       at the 2D map's own radii and billboarded so they stay that size
       whatever the camera does. Putting them in the atlas removed a layer
       rather than adding one, and it is what stops a casualty from being a
       coloured area that swallows its own status mark. */
  }

  /* ---- symbols ----
     Every airframe, launch point, threat diamond, target reticle, designated
     role and cross over a dead soldier, from one canvas-drawn atlas in one
     draw call. The atlas is generated at runtime; nothing is fetched. */
  layers.push(new D.IconLayer({
    id: 'g3-icons', data: E.icons,
    iconAtlas: G3.atlas.image, iconMapping: G3.atlas.mapping,
    getIcon: d => d.icon, getPosition: d => d.at,
    getSize: d => d.size, getAngle: d => d.angle || 0,
    getColor: d => (G3.sel && G3.sel.kind === d.kind &&
                    (G3.sel.id === d.id || G3.sel.id === d.name)
                      ? [...TK('t-hi'), 255] : [255, 255, 255, 240]),
    sizeUnits: 'pixels', billboard: true, alphaCutoff: 0.03,
    /* Symbology is not part of the scene, it is drawn over it. With the depth
       test on, a launch point at sea level hides the callsign of an aircraft
       three hundred metres above it whenever the camera is pitched, because
       the pad is nearer the eye. Turning the comparison off puts the symbols
       and their labels in front of the terrain, which is what a map does. */
    parameters: { depthCompare: 'always' },
    updateTriggers: { getColor: G3.sel ? G3.sel.kind + G3.sel.id : '' },
    pickable: true, autoHighlight: true, highlightColor: [...TK('t-hi'), 70]
  }));

  /* ---- chips ----
     The whole of the map's labelling: place names, grid ticks, callsigns,
     payloads, states, deadlines, stock, temperatures. One TextLayer with a
     per-datum plate — transparent for the geography, opaque for anything an
     operator has to act on. The placement pass in buildEntities has already
     guaranteed none of them overlaps, so this layer only has to draw. */
  if (L.labels && E.chips.length) {
    layers.push(new D.TextLayer({
      id: 'g3-chips', data: E.chips,
      getPosition: d => d.at, getText: d => d.text,
      getSize: d => d.size, getColor: d => d.col,
      getPixelOffset: d => d.off, getTextAnchor: d => d.anchor,
      getAlignmentBaseline: 'center',
      sizeUnits: 'pixels', billboard: true,
      characterSet: TEXT_CHARS,
      fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700,
      /* The cartographic halo, in a signed-distance field.

         Most chips on this map carry an opaque plate, so their contrast is
         already a property of two tokens. The geography does not — sea
         names, landform names and grid ticks are drawn with a transparent
         plate on purpose, because five hundred small plates is not a map.
         Without a halo their contrast against the terrain underneath is
         whatever the hillshade happens to be doing, which is exactly the
         luck this brief exists to remove. An SDF glyph can be outlined at
         any size from one atlas, so every label on this map is struck in
         --m-halo before it is filled, plate or no plate. */
      fontSettings: { sdf: true, radius: 12, cutoff: 0.28 },
      outlineWidth: 3.2, outlineColor: [...TK('m-halo'), 255],
      background: true, getBackgroundColor: d => d.bg,
      backgroundPadding: [5, 3, 5, 4],
      parameters: { depthCompare: 'always' },
      updateTriggers: { getPixelOffset: entKey, getTextAnchor: entKey,
                        getBackgroundColor: entKey, getSize: entKey },
      pickable: false
    }));
  }

  G3._layerCount = layers.length;
  return layers;
}

/* A sortie's arc is drawn from the moment the aircraft launches until it is
   home, fading in over the first few seconds and out over the last, so the
   picture at any instant is the tasking currently in the air. */
function arcAlpha(d, t) {
  if (t < d.t0 || t > d.t1) return 0;
  const inF = Math.min(1, (t - d.t0) / 0.6);
  const outF = Math.min(1, (d.t1 - t) / 1.2);
  return Math.min(inF, outF);
}

function spikeColour(c, s) {
  if (s.state === 'DIED') return OUTCOME_COL.DIED;
  if (s.state === 'SAVED' || s.state === 'TREATED') return OUTCOME_COL.SAVED;
  return TRIAGE[c.cls] || C.dim;
}

/* Pulse period, in seconds, from time remaining. Two full seconds when the
   casualty has most of their window left; a quarter of a second at the
   deadline. The phase is offset per casualty so a screen of them does not
   beat in unison, which would read as decoration rather than as state. */
function pulsePhase(c, s, wall) {
  const period = 2.0 - 1.75 * Math.pow(s.urgency, 0.8);
  return ((wall + c.id * 0.137) % period) / period;
}

/* ==================================================================== */
/*  CHROME                                                              */
/* ==================================================================== */

function chromeHTML(rec) {
  const scn = rec.scn;
  const a = rec.P.anchor;
  const pos = a.lat.toFixed(1) + (a.lat < 0 ? 'S ' : 'N ') + Math.abs(a.lon).toFixed(1) + (a.lon < 0 ? 'W' : 'E');
  return `
  <div id="g3Canvas" tabindex="0" aria-label="Tactical map. Arrow keys pan, plus and minus zoom, hold shift and drag to pitch and rotate."></div>
  <div id="g3Tip"></div>
  <div class="g3Chrome g3Top">
    <div class="g3Title">
      <b>${esc(scn.name)}</b>
      <i>${esc(scn.gridZone)} · ${esc(pos)} · ${scn.widthKm} × ${scn.heightKm} KM · ${esc(a.theater)}</i>
    </div>
    <div class="g3Counts" id="g3Counts"></div>
  </div>

  <div class="g3Chrome g3Comms" id="g3Comms"></div>

  <div class="g3Chrome g3Left">
    <div class="g3Card">
      <h4>WHAT IS ON THE MAP</h4>
      <div class="g3Leg">${legendHTML(rec)}</div>
    </div>
    <div class="g3Card">
      <h4>TRIAGE CLASS · TINT OF THE C-nn CHIP</h4>
      <div class="g3Row" style="flex-wrap:wrap; gap:4px 9px">
        <span class="g3Sw sq" style="background:var(--red)"></span>IMM
        <span class="g3Sw sq" style="background:var(--yel)"></span>DEL
        <span class="g3Sw sq" style="background:var(--grn)"></span>MIN
        <span class="g3Sw sq" style="background:var(--grey)"></span>EXP
      </div>
      <div class="g3Row" style="color:var(--t-lo)">The dot is coloured by reserve, not by class</div>
    </div>
    <div class="g3Card opt">
      <h4>PAYLOAD ON THE ARC</h4>
      ${PAYLOAD_ORDER.map(k => `<div class="g3Row"><span class="g3Sw ln" style="background:var(${PAYLOAD_VAR[k]})"></span>${esc(PAYLOADS[k].label)}</div>`).join('')}
    </div>
    <div class="g3Card opt">
      <h4>LAYERS</h4>
      <div id="g3Toggles"></div>
    </div>
  </div>

  <div class="g3Chrome g3Right"><div class="g3Card g3Sel" id="g3Sel"></div></div>


  <div class="g3Chrome g3Furn">
    <div class="g3Tier" id="g3TierRead"><b>—</b>—</div>
    <div class="g3Sb"><span id="g3SbTxt">10 km</span><div class="g3SbBar" id="g3SbBar" style="width:80px"></div></div>
    <div class="g3North"><svg id="g3NorthArr" width="26" height="26" viewBox="-13 -13 26 26">
      <g id="g3NorthG"><path d="M0,-11 L4.5,7 L0,3.4 L-4.5,7 Z" fill="var(--t-mid)"/></g>
    </svg>N</div>
  </div>

  <div class="g3Chrome g3Bot">
    <div class="g3Bar">
      <button class="g3Btn" id="g3Play" title="Play or pause the replay (P)">▶</button>
      <span class="g3Clock" id="g3Clock">T+00:00</span>
      <span class="g3End">T+0</span>
      <div class="g3Scrub" id="g3Scrub" tabindex="0" role="slider" aria-label="Simulation time"
           aria-valuemin="0" aria-valuemax="${scn.durationMin}" aria-valuenow="0">
        <div class="g3Track"></div><div class="g3Fill" id="g3Fill"></div>
        <div id="g3Marks"></div><div class="g3Head" id="g3Head"></div>
      </div>
      <span class="g3End">T+${scn.durationMin}</span>
      <button class="g3Btn" id="g3Rate" title="Replay speed">4×</button>
      <button class="g3Btn" id="g3Follow" title="Follow the application clock">LIVE</button>
      <button class="g3Btn" id="g3Fit" title="Frame the sector (F)">FIT</button>
      <!-- Renamed from "2D". With a real 2D/3D renderer switch on the map
           now, a camera preset labelled 2D was reading as the same control
           and it is not: this one flattens the camera and stays on the GPU
           map. TOP-DOWN says what it does. -->
      <button class="g3Btn" id="g3Top2" title="Flatten the camera to look straight down">TOP-DOWN</button>
    </div>
    <div class="g3Note">
      <span>PULSE RATE = TIME LEFT · COLUMN HEIGHT = TIME PRESSURE</span>
      <span>REPLAY · BATTLE ${rec.cfg.seed}</span>
      <span>${rec.cfg.angelFrom == null ? 'CURRENT — TRIAGE & PROXIMITY — ANGEL SWARM NOT DEPLOYED'
              : rec.cfg.angelFrom > 0 ? 'ANGEL SWARM TASKING FROM ' + fmtT(rec.cfg.angelFrom)
              : 'ANGEL SWARM TASKING THROUGHOUT'}</span>
      <span id="g3Perf"></span>
      ${G3.lowGPU ? '<span style="color:var(--amb)">SOFTWARE RENDERER — DETAIL REDUCED</span>' : ''}
      <span>TERRAIN FROM THE SIMULATION · COAST NATURAL EARTH 1:50M</span>
    </div>
  </div>`;
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

/* The legend is generated from the same atlas the map draws from, and only
   lists symbols this scenario actually puts on the screen. A legend that
   describes things that are not there is worse than no legend: it teaches
   the reader to distrust it. */
function legendHTML(rec) {
  const A = G3.atlas.swatch;
  const rows = [];
  const seen = new Set(rec.drones.map(d => d.type));
  const platLabel = { HEAVY: 'heavy lift', LIGHT: 'light quad', LONG: 'long range' };
  for (const ty of ['HEAVY', 'LIGHT', 'LONG']) {
    if (!seen.has(ty)) continue;
    const call = (typeof CALLSIGN !== 'undefined' && CALLSIGN[ty]) || ty;
    rows.push([AIR_ICON[ty] + '_a', call + '-nn · ' + platLabel[ty], '']);
  }
  const anyType = ['HEAVY', 'LIGHT', 'LONG'].find(k => seen.has(k)) || 'LIGHT';
  rows.push([AIR_ICON[anyType] + '_r', 'Grey airframe = RTB', '']);
  rows.push(['tgt', 'Where it is going', '']);
  if (rec.scn.bases.some(b => !b.afloat)) rows.push(['farp', 'Launch point', 'chip: blood · airframes ready']);
  if (rec.scn.bases.some(b => b.afloat)) rows.push(['ship', 'Launch point afloat', '']);
  if (G3.statics && G3.statics.uav) rows.push(['relay', CMDUAV.callsign, 'C2 / ISR relay']);
  if ((rec.scn.threats || []).length) rows.push(['en', 'Threat envelope', '']);
  /* The casualty symbols, keyed to what is actually drawn. The dot's colour
     is the compensatory reserve band and the rings around it are the rest of
     the state, so the legend has to show the rings, not just the colours. */
  rows.push(['c_st', 'Casualty · reserve holding', '']);
  rows.push(['c_fa', 'Reserve falling', '']);
  rows.push(['c_cr', 'Reserve critical', 'red chip: minutes left']);
  rows.push(['crm3', 'Ring = reserve remaining', '']);
  rows.push(['cov1', 'One airframe covers this', 'red dashes: none can reach']);
  rows.push(['c_ex', 'Expectant · comfort care', '']);
  rows.push(['c_sv', 'Treated', '']);
  rows.push(['hva', 'Designated role', '']);
  rows.push(['kia_s', 'Died · was survivable', '']);
  rows.push(['kia_n', 'Died · not reachable in time', '']);
  /* data-sym is what lets refreshLegend re-point these at a rebuilt atlas.
     A legend drawn from a texture that has been replaced is a legend that is
     lying about the map beside it. */
  return rows.map(([k, a, b]) =>
    `<img src="${A[k]}" data-sym="${k}" alt=""><span>${esc(a)}${b ? '<em>' + esc(b) + '</em>' : ''}</span>`).join('');
}

/* Re-point every legend swatch at the current atlas. Called after a theme
   change, which rebuilds that atlas: the swatches are baked PNGs cut out of
   it, so they do not follow a stylesheet any more than the map does. */
function refreshLegend() {
  if (!G3.atlas || !G3.atlas.swatch) return;
  const imgs = document.querySelectorAll('#g3Wrap .g3Leg img[data-sym]');
  for (const im of imgs) {
    const u = G3.atlas.swatch[im.dataset.sym];
    if (u) im.src = u;
  }
}

/* Scale bar, north arrow and the density tier, painted from the live camera.
   The 2D map has all three and they are not decoration: without a scale bar a
   pitched perspective view gives the reader no way at all to judge a distance,
   and without a north arrow a rotatable map gives them no way to judge a
   direction. */
const SCALE_NICE = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
function paintFurniture() {
  if (!G3.rec || !G3.view) return;
  const sc = scaleOf();
  const bar = document.getElementById('g3SbBar');
  const txt = document.getElementById('g3SbTxt');
  if (bar && txt) {
    const km = SCALE_NICE.find(k => k / sc.kmPerPx >= 66) || 1000;
    bar.style.width = Math.round(km / sc.kmPerPx) + 'px';
    txt.textContent = km + ' km';
  }
  const g = document.getElementById('g3NorthG');
  if (g) g.setAttribute('transform', 'rotate(' + (-(G3.view.bearing || 0)).toFixed(1) + ')');
  const tr = document.getElementById('g3TierRead');
  if (tr) {
    const names = ['THEATRE', 'WORKING', 'CLOSE'];
    tr.innerHTML = '<b>' + names[tierFor(sc.kmAcross)] + '</b>' +
      Math.round(sc.kmAcross) + ' km across';
  }
  /* The scale, the north arrow and the density tier live in the bottom-right
     corner of the picture, and under the design that corner is behind a panel.
     Same answer as the transport bar above them: laid out inside what the host
     says it has actually left, and exactly where it was when nothing is
     published. */
  const furn = document.querySelector('#g3Wrap .g3Furn');
  if (furn) {
    const ins = hostInsets();
    const R = (12 + ins.r) + 'px', B = (100 + ins.b) + 'px';
    if (furn.style.right !== R) furn.style.right = R;
    if (furn.style.bottom !== B) furn.style.bottom = B;
  }
}

/* WHERE THE CLEAR BAND ACTUALLY STARTS.
   The 64px in the stylesheet clears this console's own header when the map
   runs standing alone. Docked under a host that floats its own header card
   over the picture, the banner was drawn behind that card and the operator
   never saw the one warning the map exists to give. map.js has the same
   fault and the same fix on the flat sheet — commsBannerY() — and this is
   that fix on the GPU map: the host publishes how far down its chrome
   reaches and the banner moves below it. Nothing published, nothing added,
   so the standalone console is untouched. */
const G3_COMMS_TOP = 64;
function commsTop() {
  let o = 0;
  try { o = window.COMMS_BANNER_OFFSET || 0; } catch (e) { o = 0; }
  return G3_COMMS_TOP + o;
}

/* Degraded comms. The banner is the point of the whole scenario branch: the
   picture keeps updating because the plan is already on the aircraft. */
function paintComms() {
  const el = document.getElementById('g3Comms');
  if (!el || !G3.rec) return;
  /* Written every paint rather than once: the host republishes its inset
     whenever its own chrome is measured again, and a banner that took the
     first number it was given would be right only until the page resized. */
  const top = commsTop() + 'px';
  if (el.style.top !== top) el.style.top = top;
  const scn = G3.rec.scn, t = G3.t;
  const w = (scn.comms || []).find(c => t >= c.atMin && t < c.atMin + c.durMin);
  const wash = document.getElementById('g3CommsWash');
  if (!w) {
    if (el.firstChild) el.innerHTML = '';
    if (wash) wash.remove();
    return;
  }
  const msg = (w.label || 'COMMS DEGRADED') +
    ' — HOLDING LAST-KNOWN-GOOD PLAN, AIRCRAFT STILL FLYING';
  if (el.textContent !== msg) el.innerHTML = '<span>' + esc(msg) + '</span>';
  if (!wash) {
    const d = document.createElement('div');
    d.id = 'g3CommsWash'; d.className = 'g3CommsWash';
    document.getElementById('g3Wrap').appendChild(d);
  }
}

const TOGGLES = [
  ['world', 'Real geography'], ['terrain', 'Sector terrain'], ['arcs', 'Route arcs'],
  ['trips', 'Aircraft trails'], ['cas', 'Casualties'], ['spikes', 'Time columns'],
  ['threat', 'Threat envelopes'], ['sector', 'Sectors & units'], ['labels', 'Labels']
];

function paintToggles() {
  const host = document.getElementById('g3Toggles');
  if (!host) return;
  host.innerHTML = TOGGLES.map(([k, label]) =>
    `<button class="g3Tog${G3.layers[k] ? ' on' : ''}" data-l="${k}" aria-pressed="${!!G3.layers[k]}"><i></i>${esc(label)}</button>`).join('');
  host.querySelectorAll('[data-l]').forEach(b => {
    b.onclick = guard('a layer toggle', () => {
      G3.layers[b.dataset.l] = !G3.layers[b.dataset.l]; paintToggles();
    });
  });
}

/* Counters read at the scrubbed time, not at the end of the run. Deaths
   first, and never in a colour that reads as success. */
function paintCounts() {
  const el = document.getElementById('g3Counts');
  if (!el || !G3.rec) return;
  const t = G3.t;
  let died = 0, treated = 0, open = 0, wounded = 0;
  for (const c of G3.rec.cas) {
    const s = casAt(c, t);
    if (!s) continue;
    wounded++;
    if (s.state === 'DIED') died++;
    else if (s.state === 'SAVED' || s.state === 'TREATED') treated++;
    else open++;
  }
  const air = (G3._air || []).length;
  el.innerHTML =
    `<div class="g3Count dead"><b>${died}</b><span>DIED</span></div>` +
    `<div class="g3Count open"><b>${open}</b><span>OPEN</span></div>` +
    `<div class="g3Count"><b>${treated}</b><span>TREATED</span></div>` +
    `<div class="g3Count"><b>${wounded}</b><span>WOUNDED</span></div>` +
    `<div class="g3Count air"><b>${air}</b><span>AIRBORNE</span></div>`;
}

/* HOW MUCH ROOM THE HOST HAS ACTUALLY LEFT ALONG THE BOTTOM OF THE PICTURE.
   The bar is the map's, but the strip it sits in is shared with whatever the
   host floats over the picture — under this design, a column of panels down
   each side. On a wide screen those stop well short of the bottom and this
   is zero on both sides. On a narrow one the left column runs to the floor,
   and a bar drawn edge to edge would put its play button underneath a panel:
   present, invisible and unclickable. The host measures its own chrome and
   publishes how far in it reaches; nothing published, nothing subtracted,
   and the console standing alone runs the bar edge to edge as it always
   did. */
/* How far the page around this map reaches in over it, on all four sides.
   Published by the host; zero, and therefore no change at all, when this
   console is standing on its own. */
function hostInsets() {
  let l = 0, r = 0, t = 0, b = 0;
  try {
    l = window.MAP_INSET_L || 0; r = window.MAP_INSET_R || 0;
    t = window.MAP_INSET_T || 0; b = window.MAP_INSET_B || 0;
  } catch (e) { l = r = t = b = 0; }
  return { l, r, t, b };
}

function applyBarInset() {
  const bot = document.querySelector('#g3Wrap .g3Bot');
  const bar = document.querySelector('#g3Wrap .g3Bar');
  if (!bot || !bar) return;
  let l = 0, r = 0;
  try { l = window.MAP_BAR_INSET_L || 0; r = window.MAP_BAR_INSET_R || 0; } catch (e) { l = r = 0; }
  /* Moved with a margin on the bar rather than padding on the strip, so the
     caption line under it keeps running the full width of the picture — it
     is type, not a control, and nothing is lost to a panel sitting over its
     first few words. */
  const cs = getComputedStyle(bot);
  const pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
  const L = l > pl ? (l - pl) + 'px' : '', R = r > pr ? (r - pr) + 'px' : '';
  if (bar.style.marginLeft !== L) bar.style.marginLeft = L;
  if (bar.style.marginRight !== R) bar.style.marginRight = R;
  /* Once it is genuinely short, the two end labels go before the control,
     the minute or the track do. */
  const narrow = bar.getBoundingClientRect().width < 470;
  if (bar.classList.contains('narrow') !== narrow) bar.classList.toggle('narrow', narrow);
}

function paintTransport() {
  const scn = G3.rec.scn;
  applyBarInset();
  const f = Math.max(0, Math.min(1, G3.t / scn.durationMin));
  const fill = document.getElementById('g3Fill');
  const head = document.getElementById('g3Head');
  const clock = document.getElementById('g3Clock');
  const scrub = document.getElementById('g3Scrub');
  if (fill) fill.style.width = (f * 100) + '%';
  if (head) head.style.left = (f * 100) + '%';
  /* Docked, the minute is read in the same words as the chrome above the
     map — T+91 MIN there, T+91 MIN here. Standing alone the console reads
     its own clock as hours and minutes everywhere else, and this stays with
     it. */
  if (clock) clock.textContent = hostRun() ? ('T+' + Math.floor(G3.t) + ' MIN') : fmtT(G3.t);
  if (scrub) scrub.setAttribute('aria-valuenow', G3.t.toFixed(1));
  const pb = document.getElementById('g3Play');
  /* The glyph is the state of whatever this button is currently pressing:
     the replay's own play head when the map is off on its own, and the run
     itself while the map is on the host's clock. */
  if (pb) pb.textContent = (G3.playing || (hostRun() && G3.follow && hostRunning()))
    ? '❚❚' : '▶';
  const fb = document.getElementById('g3Follow');
  if (fb) fb.classList.toggle('on', G3.follow);
  const perf = document.getElementById('g3Perf');
  if (perf) perf.textContent = G3.fps ? G3.fps + ' FPS · ' + G3._layerCount + ' LAYERS' : '';
}

function paintMarks() {
  const host = document.getElementById('g3Marks');
  if (!host || !G3.rec) return;
  const scn = G3.rec.scn;
  let h = '';
  for (const ev of scn.mascalEvents || []) {
    h += `<div class="g3Mas" style="left:${(ev.atMin / scn.durationMin * 100).toFixed(2)}%" title="Mass casualty event"></div>`;
  }
  // One tick per death, at the minute it happened. The bar fills with red as
  // the run goes on; that is the shape of the problem.
  for (const c of G3.rec.cas) {
    if (c.outcome !== 'DIED' || c.tResolved == null) continue;
    h += `<div class="g3Tick" style="left:${(c.tResolved / scn.durationMin * 100).toFixed(2)}%"></div>`;
  }
  host.innerHTML = h;
}

/* --------------------------------------------------------------- details */
function selHTML() {
  const rec = G3.rec, t = G3.t;
  if (!G3.sel) {
    return `<h4>SELECTION</h4><div class="g3Row" style="color:var(--t-lo)">Click a casualty, an aircraft,
      a launch point or a route arc. Hover for a summary.</div>`;
  }
  if (G3.sel.kind === 'cas') {
    const c = rec.cas.find(k => k.id === G3.sel.id);
    if (!c) return '';
    const s = casAt(c, t);
    const rows = [];
    rows.push(['Triage', c.cls]);
    rows.push(['Injury', c.injury]);
    rows.push(['Unit', c.unit]);
    rows.push(['Role', typeof ROLES !== 'undefined' && ROLES[c.role] ? ROLES[c.role].label : c.role]);
    rows.push(['With them', typeof TIERS !== 'undefined' && TIERS[c.responder] ? TIERS[c.responder].name : c.responder]);
    rows.push(['Wounded at', fmtT(c.tInjury)]);
    rows.push(['Deadline', isFinite(c.deadlineAt) ? fmtT(c.deadlineAt) + ' (' + c.deadlineMin.toFixed(0) + ' min)' : 'none']);
    if (!s) rows.push(['State', 'not yet wounded']);
    else if (s.state === 'DIED') rows.push(['<b>Outcome</b>', '<span class="g3Bad">DIED ' + fmtT(c.tResolved) + '</span>']);
    else if (s.state === 'SAVED' || s.state === 'TREATED') {
      rows.push(['Treated', fmtT(c.tTreated) + ' · ' + (c.treatedWith || '—')]);
      rows.push(['<b>Outcome</b>', c.outcome === 'DIED'
        ? '<span class="g3Bad">DIED</span>' : '<span class="g3Ok">STABLE</span>']);
    } else {
      const cls = s.urgency > 0.75 ? 'g3Bad' : s.urgency > 0.45 ? 'g3Warn' : '';
      rows.push([s.left < 0 ? 'Past deadline' : 'Time left', isFinite(s.left)
        ? `<span class="${cls}">${Math.abs(s.left).toFixed(1)} min</span>` : 'no deadline']);
      rows.push(['Tasked', c.tTasked != null && t >= c.tTasked ? fmtT(c.tTasked) : '<span class="g3Warn">not yet</span>']);
    }
    if (c.reachN !== undefined) rows.push(['Airframes in reach', c.reachN]);
    if (c.hva) rows.push(['Designated', 'mission-critical role']);
    return `<h4>CASUALTY ${c.id}</h4><table class="g3Kv">` +
      rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>';
  }
  if (G3.sel.kind === 'drone') {
    const d = (G3._air || []).find(x => x.id === G3.sel.id);
    const rd = rec.drones.find(x => x.id === G3.sel.id);
    if (!d) {
      return `<h4>${esc(rd ? rd.call : 'AIRCRAFT ' + G3.sel.id)}</h4>
        <table class="g3Kv"><tr><td>State</td><td>ready at ${esc(rd ? rd.baseName : '—')}</td></tr>
        <tr><td>Airframe</td><td>${esc(rd ? rd.label : '—')}</td></tr></table>`;
    }
    const rows = [
      ['Airframe', d.label],
      ['Launch point', d.base],
      ['<b>Doing</b>', '<b>' + ST_LABEL[d.st] + (d.os === 1 ? ' · releasing' : d.os === 2 ? ' · recovering' : '') + '</b>'],
      ['Carrying', d.payload ? PAYLOADS[d.payload].label : '—'],
      ['For', d.tgt ? 'casualty ' + d.tgt : '—'],
      ['Heading', Math.round(d.hdg).toString().padStart(3, '0') + '°']
    ];
    if (d.payload === 'BLOOD') {
      rows.push(['Container', `<span class="${d.cold > 9 ? 'g3Warn' : 'g3Ok'}">${d.cold.toFixed(1)} °C</span> (band 1–10)`]);
    }
    return `<h4>${esc(d.call)}</h4><table class="g3Kv">` +
      rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>';
  }
  if (G3.sel.kind === 'base') {
    const b = G3.statics.bases.find(x => x.name === G3.sel.id);
    if (!b) return '';
    const reach = G3.statics.reach.find(x => x.name === b.name);
    return `<h4>${esc(b.name)}</h4><table class="g3Kv">
      <tr><td>Airframes</td><td>${b.fleet}</td></tr>
      <tr><td>Best reach, one unit</td><td>${reach ? reach.r.toFixed(0) + ' km' : '—'}</td></tr>
      <tr><td>Grid</td><td>${b.x.toFixed(0)}, ${b.y.toFixed(0)} km</td></tr></table>`;
  }
  return '';
}

function paintSel() {
  const el = document.getElementById('g3Sel');
  if (el) el.innerHTML = selHTML();
}

/* ---------------------------------------------------------------- tooltip */
function showTip(info) {
  const tip = document.getElementById('g3Tip');
  if (!tip) return;
  if (!info || !info.object) { tip.style.display = 'none'; G3.hover = null; return; }
  const o = info.object, t = G3.t;
  let h = '';
  if (info.layer.id === 'g3-cas') {
    const s = casAt(o, t);
    const state = !s ? 'not yet wounded'
      : s.state === 'DIED' ? '<span style="color:var(--red)">DIED ' + fmtT(o.tResolved) + '</span>'
      : s.state === 'SAVED' || s.state === 'TREATED' ? '<span style="color:var(--grn)">TREATED ' + fmtT(o.tTreated) + '</span>'
      : isFinite(s.left)
        ? `<span style="color:${s.urgency > 0.75 ? 'var(--red)' : s.urgency > 0.45 ? 'var(--amb)' : 'var(--t-hi)'}">` +
          (s.left < 0 ? `${(-s.left).toFixed(1)} min PAST deadline` : `${s.left.toFixed(1)} min to deadline`) + '</span>'
        : 'no deadline';
    h = `<b>CASUALTY ${o.id}</b> · ${esc(o.cls)}<br><em>${esc(o.injury)}</em><br>${esc(o.unit)}<br>${state}` +
        (s && (s.state === 'OPEN' || s.state === 'INBOUND')
          ? `<br><em>${o.tTasked != null && t >= o.tTasked ? 'aircraft committed' : 'not yet tasked'}</em>` : '');
  } else if (info.layer.id === 'g3-icons') {
    if (o.kind === 'base') {
      const b = G3.statics.bases.find(x => x.name === o.name);
      h = `<b>${esc(o.name)}</b><br><em>launch point · ${b ? b.fleet : '?'} airframes</em>`;
    } else if (o.kind === 'uav') {
      h = `<b>${esc(CMDUAV.callsign)}</b><br><em>${esc(CMDUAV.label)}</em><br>` +
        `carries no payload · ${CMDUAV.footprintKm} km live-telemetry footprint`;
    } else if (o.kind === 'threat') {
      h = `<b>${esc(o.label)}</b><br><em>${o.r} km radius · ` +
        `${(o.lossPerMin * 100).toFixed(1)}% aircraft loss per minute inside</em>`;
    } else if (o.kind === 'tgt') {
      h = `<b>TASK MARKER</b><br><em>where an aircraft is flying to</em>`;
    } else if (o.kind === 'cas') {
      return showTip({ ...info, object: o.cas, layer: { id: 'g3-cas' } });
    } else {
      const d = o.drone || o;
      h = `<b>${esc(d.call)}</b> · ${esc(d.label)}<br><em>${ST_LABEL[d.st]} · from ${esc(d.base)}</em>` +
        (d.payload ? `<br>${esc(PAYLOADS[d.payload].label)}` : '') +
        (d.tgt ? `<br>for casualty ${d.tgt}` : '') +
        (d.payload === 'BLOOD' ? `<br><em>container ${d.cold.toFixed(1)} °C (band 1–10)</em>` : '');
    }
  } else if (info.layer.id === 'g3-arcs') {
    h = `<b>${esc(PAYLOADS[o.payloadKey] ? PAYLOADS[o.payloadKey].label : o.payloadKey)}</b><br>` +
        `<em>${esc(o.label)}-${o.droneId} → casualty ${o.casId}</em><br>${fmtT(o.t0)} – ${fmtT(o.t1)}`;
  } else if (info.layer.id === 'g3-threats') {
    h = `<b>${esc(o.label)}</b><br><em>${o.r} km radius · ${(o.lossPerMin * 100).toFixed(1)}% aircraft loss per minute inside</em>`;
  } else { tip.style.display = 'none'; return; }
  tip.innerHTML = h;
  tip.style.display = 'block';
  const host = document.getElementById('g3Wrap').getBoundingClientRect();
  const tb = tip.getBoundingClientRect();
  let x = info.x + 14, y = info.y + 14;
  if (x + tb.width > host.width - 8) x = info.x - tb.width - 14;
  if (y + tb.height > host.height - 8) y = info.y - tb.height - 14;
  tip.style.left = Math.max(4, x) + 'px';
  tip.style.top = Math.max(4, y) + 'px';
}

/* ==================================================================== */
/*  CAMERA                                                              */
/* ==================================================================== */

function fitViewState(rec, pitch, bearing) {
  const scn = rec.scn, P = rec.P;
  const a = P.anchor;
  const host = document.getElementById('g3Canvas');
  const w = (host && host.clientWidth) || 1200, h = (host && host.clientHeight) || 700;
  // Zoom that puts the sector's longer dimension inside the shorter side of
  // the viewport with room for the chrome down each edge.
  const degW = scn.widthKm * P.degLonPerKm, degH = scn.heightKm * P.degLatPerKm;
  const zx = Math.log2((w * 0.74) * 360 / (degW * 512));
  const zy = Math.log2((h * 0.82) * 360 / (degH * 512 * Math.cos(a.lat * Math.PI / 180)));
  return {
    longitude: a.lon, latitude: a.lat - degH * 0.10,
    zoom: Math.min(zx, zy), pitch: pitch == null ? 48 : pitch,
    bearing: bearing == null ? -16 : bearing,
    minZoom: 2, maxZoom: 15, maxPitch: 68
  };
}

/* ==================================================================== */
/*  MOUNT AND LOOP                                                      */
/* ==================================================================== */

function busy(msg) {
  const host = document.getElementById('g3Wrap');
  if (!host) return;
  let el = host.querySelector('.g3Busy');
  if (!msg) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.className = 'g3Busy'; host.appendChild(el); }
  el.textContent = msg;
}

async function ensureRecording() {
  const cfg = cfgFromApp();
  const key = cfgKey(cfg);
  if (G3.key === key || G3.building) return;
  G3.building = true;
  busy('COMPUTING REPLAY…');
  // One frame of breathing room so the message paints before the run blocks.
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  try {
    const rec = recordRun(cfg);
    G3.rec = rec;
    G3.key = key;
    G3.sel = null;
    G3.statics = buildStatics(rec);
    /* The map opens on the minute the application is showing, following the
       application's clock.

       It used to start playing itself whenever the application was sitting
       at T+00:00, on the theory that an empty sector reads as a broken map.
       That was a mistake, and an expensive one: the replay ran away from the
       host clock the moment the view opened and never came back, so play,
       pause and reset in the command bar all appeared to do nothing — the
       map was already moving, and moving to its own time. An empty sector at
       T+00:00 is the truth, and paintHint says so in words. The transport
       owns the clock. */
    G3.t = Math.min(rec.dur, (typeof APP !== 'undefined' && APP.tView) || 0);
    G3.follow = true; G3.playing = false; G3._followT = null;
    G3._world = (typeof APP !== 'undefined') ? APP.world : null;
    G3._appT = (typeof APP !== 'undefined')
      ? (APP.tView == null ? (APP.t || 0) : APP.tView) : 0;
    /* Adopt whatever the rest of the application has selected, so arriving
       here from the casualty table lands on the same soldier. */
    if (typeof APP !== 'undefined' && APP.sel &&
        (APP.sel.kind === 'cas' || APP.sel.kind === 'drone')) {
      G3.sel = { kind: APP.sel.kind, id: APP.sel.id };
    }
    ANGEL.mark('theater3d replay', {
      ms: Math.round(rec.buildMs), casualties: rec.cas.length,
      sorties: rec.sorties.length, arcs: rec.arcs.length,
      sheet: G3.statics.terrain.w + 'x' + G3.statics.terrain.h,
      sheetMs: Math.round(G3.statics.terrain.ms)
    });
    // Every memo in buildLayers is keyed on state that has not changed even
    // though the geometry behind it has. Clear them all.
    G3._neKey = G3._ctlKey = G3._txtKey = G3._entKey = G3._dynKey = null;
    G3._ent = null;
    if (G3.mounted) {
      /* The chrome carries the scenario's name, its seed, its duration and a
         tick per death; none of that survives a change of scenario, so the
         panel is rebuilt rather than patched. */
      G3.mounted = false;
      try { G3.deck.finalize(); } catch (e) { /* already gone */ }
      G3.deck = null;
      const host = document.getElementById('g3Host');
      if (host) mount(host);
    }
  } catch (e) {
    console.warn('[theater3d] replay failed', e);
    busy('REPLAY FAILED: ' + (e && e.message ? e.message : e));
    G3.building = false;
    return;
  }
  busy(null);
  G3.building = false;
}

/* THE LOOK-AROUND ENDS IN A RIGHT BUTTON COMING BACK UP.
   deck.gl orbits the camera on a right-drag (and on ctrl-drag), and the
   browser reads that button releasing over the canvas as a right-click: the
   native menu opens over the map at the end of every adjustment of the
   overhead perspective. It is suppressed on this element and on nothing
   else — text, links and every other part of the page keep their menu.

   preventDefault on `contextmenu` does not touch pointer events, so the
   rotate gesture itself is untouched; and the listener is taken off before a
   new one goes on, so switching in and out of this view any number of times
   leaves exactly one. */
function bindNoContextMenu(host) {
  if (G3._ctxOff) { try { G3._ctxOff(); } catch (e) { /* went with its element */ } G3._ctxOff = null; }
  if (!host) return;
  const stop = ev => { ev.preventDefault(); };
  host.addEventListener('contextmenu', stop);
  G3._ctxOff = function () { host.removeEventListener('contextmenu', stop); };
}

/* ==================================================================== */
/*  A LOST GPU CONTEXT, ON THIS MAP TOO                                 */
/* ==================================================================== */
/* The theatre map had this fault measured and fixed first — a browser takes a
   WebGL context away on its own, without an error and without asking, when a
   hybrid-graphics laptop switches adapters, when a driver resets, or when the
   live-context cap is reached and the oldest holder is evicted. Nothing
   throws, so nothing here noticed, and the surface stayed "mounted" while
   drawing nothing at all. This map has the same exposure and takes the same
   answer: drop the dead instance, let the mount path below rebuild it on the
   next frame the operator is in this view, and after a second loss hand the
   view back to the flat tactical map, which is complete and correct. */
let G3_LOSSES = 0;
function contextLostG3(where) {
  if (!G3.mounted && !G3.deck) return;
  G3_LOSSES++;
  if (G3.deck) { try { G3.deck.finalize(); } catch (e) { /* already torn down */ } }
  G3.deck = null;
  G3.mounted = false;
  if (G3_LOSSES > 1) {
    fatal('a WebGL context this map cannot keep (' + where + ')',
      new Error('the GPU dropped this map\'s context twice'));
    return;
  }
  console.warn('[theater3d] the GPU dropped this map\'s WebGL context (' + where +
    '). It is being rebuilt; the flat tactical map is unaffected and carries the same run.');
  /* enter() runs on every frame the operator is in this view and rebuilds a
     surface that is not mounted, so there is nothing further to schedule. */
}

function armContextLossG3(container) {
  if (!container) return;
  container.addEventListener('webglcontextlost', () => contextLostG3('canvas'), true);
  container.addEventListener('webglcontextcreationerror', ev => {
    console.warn('[theater3d] a WebGL context could not be created for this map: ' +
      ((ev && ev.statusMessage) || 'no reason given') + '.');
  }, true);
}

function mount(host) {
  injectCSS();
  const wrap = document.createElement('div');
  wrap.id = 'g3Wrap';
  wrap.innerHTML = chromeHTML(G3.rec);
  host.innerHTML = '';
  host.appendChild(wrap);

  const D = G3.D;
  const vs = fitViewState(G3.rec);
  G3.zoom = vs.zoom;
  G3.view = vs;
  G3.deck = new D.Deck({
    parent: document.getElementById('g3Canvas'),
    views: new D.MapView({ repeat: false }),
    initialViewState: vs,
    controller: {
      dragRotate: true, touchRotate: true, keyboard: true,
      inertia: 320, scrollZoom: { speed: 0.012, smooth: true },
      doubleClickZoom: true
    },
    useDevicePixels: Math.min(2, window.devicePixelRatio || 1),
    /* Symbols on this map are between three and eight pixels of actual ink.
       Requiring the cursor to land on one of those pixels is the difference
       between a map that responds and a map that feels broken, so the picking
       buffer is searched in a radius around the pointer instead. */
    pickingRadius: 9,
    // The canvas clears transparent, so the ocean is the CSS gradient behind
    // it: no geometry, no draw call, and it never has to be panned.
    layers: [],
    /* These three are called by deck.gl from inside its own draw and event
       handling, where an exception would otherwise surface once per frame
       and once per pointer move. They are guarded like any other callback. */
    onViewStateChange: guard('the camera', ({ viewState }) => {
      G3.zoom = viewState.zoom;
      G3.view = viewState;
    }),
    onHover: guard('the hover readout', info => showTip(info)),
    getCursor: guard('the cursor', ({ isDragging, isHovering }) =>
      isDragging ? 'grabbing' : (isHovering ? 'pointer' : 'crosshair'))
  });

  armContextLossG3(document.getElementById('g3Canvas'));
  bindClick(document.getElementById('g3Canvas'));
  bindNoContextMenu(document.getElementById('g3Canvas'));
  bindChrome();
  paintToggles();
  paintMarks();
  paintSel();
  paintFurniture();
  paintHint();
  G3.mounted = true;
  // One animation loop for the lifetime of the page, even across remounts.
  if (!G3._looping) { G3._looping = true; loop(); }
}

/* Selection is done here rather than through deck.gl's own `onClick` prop.
   Two reasons, both found by testing. The library's click dispatch reuses the
   pick it took at pointer-down and, in this build, never reached the handler
   at all — hover worked, click did not, silently. And a click wants a more
   generous hit target than a hover does: an operator aiming at a four-pixel
   casualty with a mouse will miss it, and "nothing happened" is the worst
   possible answer. `pickObject` with a fourteen pixel radius is explicit,
   testable, and under this file's control.

   Where marks overlap, the topmost drawn thing wins, which is the one the
   operator can actually see — and the search starts tight and widens, so a
   click that lands exactly on an aircraft selects the aircraft rather than a
   casualty a dozen pixels behind it. */
const PICK_RADII = [2, 6, 14];
function bindClick(host) {
  if (!host) return;
  /* A click that follows a drag is a camera move, not a selection. deck's
     controller has already used it; picking on it as well would clear the
     operator's selection every time they turned the map. */
  let downAt = null;
  host.addEventListener('pointerdown', guard('the map pointer', ev => {
    downAt = [ev.clientX, ev.clientY];
  }), true);
  host.addEventListener('click', guard('map selection', ev => {
    if (!G3.deck) return;
    if (downAt && Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 4) return;
    const r = host.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    let hit = null;
    for (const radius of PICK_RADII) {
      try { hit = G3.deck.pickObject({ x, y, radius }); } catch (e) { hit = null; }
      if (hit && hit.object) break;
      hit = null;
    }
    if (!hit) { setSel(null); return; }
    const o = hit.object, id = hit.layer.id;
    if (id === 'g3-cas') setSel({ kind: 'cas', id: o.id });
    else if (id === 'g3-arcs') setSel({ kind: 'cas', id: o.casId });
    else if (id === 'g3-icons') {
      if (o.kind === 'base') setSel({ kind: 'base', id: o.name });
      else if (o.kind === 'drone' || o.kind === 'tgt') setSel({ kind: 'drone', id: o.id });
      else if (o.kind === 'cas') setSel({ kind: 'cas', id: o.id });
      else setSel(null);
    } else setSel(null);
  }));
}

/* Selection is shared with the rest of the application. Both sides use the
   same {kind, id} shape and the same ids, because both are reading a world
   built from the same scenario key and seed — so clicking an aircraft here
   and switching to the drone table lands on the same row. */
function setSel(sel) {
  G3.sel = sel;
  /* Deferred, because the host has its own document-level click handlers that
     run after this one and clear APP.sel. Writing on the next tick means the
     3D map's choice is the one that survives the event. The host clears the
     selection again on any navigation, so this agreement only holds while the
     operator stays in this view — which is the honest limit of it. */
  if (typeof APP !== 'undefined') {
    setTimeout(guard('selection handover', () => {
      APP.sel = sel && (sel.kind === 'cas' || sel.kind === 'drone')
        ? { kind: sel.kind, id: sel.id } : null;
    }), 0);
  }
  paintSel();
}

/* THE RUN IS THE HOST'S, AND THIS TRANSPORT HAS TO BE ABLE TO STOP IT.
   Standing alone, APP is the run: setting APP.running false stops it and
   nothing argues. Docked under app/angel-map.js the application in this
   frame is a follower — the host owns the clock and hands it down on every
   one of its renders — so APP.running set false here is set true again
   within the frame, and a pause on this bar would do nothing at all.

   The dock publishes its own transport on this window when there is one.
   When there is not — the console standing alone, or any host that does not
   publish it — this is null and every path below behaves exactly as it did
   before. */
function hostRun() {
  try { return window.ANGEL_HOST_RUN || null; } catch (e) { return null; }
}
/* Is the run going, asked of whoever owns it. */
function hostRunning() {
  const H = hostRun();
  if (H) { try { return !!H.running(); } catch (e) { return false; } }
  return typeof APP !== 'undefined' && !!APP.running;
}

/* Any deliberate move of the clock takes manual control of it. Both the other
   two owners of this clock — the replay's own playback and the application's
   live run — will otherwise keep advancing under the operator's hand, and a
   scrubber that walks away from where it was put is the most reliable way to
   make an interface feel broken. */
/* Taking the map off the application's clock.

   The application's own seekTo() does exactly this, and its comment is the
   argument: "the operator asked to look at a specific minute; letting the run
   immediately walk away from it would make the request a lie." The same is
   true here and it is now load-bearing rather than merely polite — syncToApp
   hands the map back to the host clock whenever that clock moves, so a scrub
   taken while the run was going would spring straight back to live. Stopping
   the run is what makes a scrub hold.

   The command bar's play glyph is driven from APP.running, so the host is
   asked to repaint its chrome; otherwise it would keep showing a pause
   symbol for a run that is no longer going. */
function detachFromHost() {
  G3.follow = false;
  G3._followT = null;
  /* Stopping the host run moves the host's own clock as a side effect: while
     it is running APP.tView leads APP.t by the accumulator, and the moment it
     stops those two collapse together. That collapse is a tenth of a minute
     of apparent movement, and syncToApp cannot tell it apart from the
     operator dragging the application's scrubber — so it would immediately
     hand the map back to the host clock and the scrub the operator just made
     would spring away under their cursor. A short settling window is enough:
     the collapse happens on the next tick, an operator's next action does
     not. */
  G3._detachAt = performance.now();
  /* THE RUN ABOVE, TOO. Under a host the application in this frame is not
     the run — stopping it alone would leave the host's clock going and the
     scrub the operator just made would spring away on the host's next
     render. This is the same instruction the line below gives APP, given to
     whoever is actually holding the clock. */
  const HR = hostRun();
  if (HR) { try { HR.pause(); } catch (e) { /* contained */ } }
  if (typeof APP !== 'undefined' && APP.running) {
    APP.running = false;
    G3._appT = APP.tView == null ? (APP.t || 0) : APP.tView;
    if (typeof syncChrome === 'function') { try { syncChrome(); } catch (e) { /* host chrome absent */ } }
    const pb = document.getElementById('btnPlay');
    if (pb) pb.innerHTML = '▶';
  }
}

function seek(t) {
  G3.t = Math.max(0, Math.min(G3.rec.dur, t));
  detachFromHost();
  G3.playing = false;
  paintTransport();
  paintHint();
}

/* A seek that puts the map back under the application's control rather than
   taking it away. Used for the host's own transport — reset above all — where
   the operator's instruction is "show me this minute of the live run", not
   "let me look around on my own". */
function hardSeek(t) {
  const dur = G3.rec ? G3.rec.dur : t;
  G3.t = Math.max(0, Math.min(dur, t));
  G3.follow = true;
  G3.playing = false;
  G3._followT = null;
  /* Every memo downstream is keyed on the quantised clock, and the clock has
     just moved discontinuously. Drop them so the next frame rebuilds from the
     new minute instead of redrawing the old one. */
  G3._entKey = G3._dynKey = null;
  G3._ent = null;
  if (G3.mounted) { paintTransport(); paintHint(); }
}

/* ------------------------------------------------------- host transport */
/* The application owns the run; this replay is a second view of it. Two of
   the things the application does to a run arrive without any event to listen
   for — resetSim() rebuilds the world in place, and a deployment changes who
   is doing the tasking — so this runs on every frame and watches for them.

   It is deliberately cheap in the common case: three comparisons and one
   string join, against a frame that spends twenty milliseconds building
   layers. */
function syncToApp() {
  if (typeof APP === 'undefined' || !APP.world || !G3.rec) return;

  /* resetSim() is the only thing in the application that builds a new world
     object. Nothing else does, which makes object identity an exact and free
     reset detector — and a far better one than watching the clock, because
     the clock also moves backwards when the operator scrubs. */
  const worldChanged = G3._world !== APP.world;
  const key = cfgKey(cfgFromApp());
  const cfgChanged = G3.key != null && key !== G3.key;

  if (cfgChanged) {
    /* The run itself is different now — deployed, or the allocator taken off
       standby, or the scenario changed under us. Re-record. This costs about
       200 ms and happens only on a genuine change of configuration, never on
       a tick. ensureRecording sets its own re-entry guard synchronously, so
       calling it without awaiting is safe from inside the frame loop. */
    G3._world = APP.world;
    ensureRecording();
    return;
  }

  if (worldChanged) {
    G3._world = APP.world;
    /* Same configuration, so the recorded run is identical to the one already
       in hand — createWorld is seeded and recordRun reads nothing else. There
       is no reason to spend 200 ms reproducing it. What has to move is the
       play head: the operator pressed reset and the map must show T+00:00 and
       an empty battlefield, not the previous run's aircraft. */
    G3.sel = null;                        // resetSim clears APP.sel too
    hardSeek(APP.tView == null ? (APP.t || 0) : APP.tView);
    if (G3.mounted) paintSel();
    G3._appT = G3.t;
    return;
  }

  /* Any movement of the application's clock — its play button, its scrubber,
     its reset — is an instruction about which minute to show, and it outranks
     an earlier scrub of this replay. Without this the operator could scrub the
     map, press play in the command bar, and watch the map sit still: the exact
     shape of "the buttons do nothing".

     The converse is what makes the map's own transport still useful: while the
     application's clock is stopped it does not move, so nothing here fires and
     the operator is free to scrub and play the replay on their own. */
  const tv = APP.tView == null ? (APP.t || 0) : APP.tView;
  const settling = performance.now() - (G3._detachAt || 0) < 400;
  if (G3._appT != null && Math.abs(tv - G3._appT) > 0.01 && !G3.follow && !settling) {
    G3.follow = true; G3.playing = false; G3._followT = null;
    if (G3.mounted) paintTransport();
  }
  G3._appT = tv;
}

/* The empty sector at T+00:00 is honest but mute, and a map with nothing on
   it is the one case where an operator cannot tell "not started" from
   "broken". One line of type is the whole fix. */
function paintHint() {
  const wrap = document.getElementById('g3Wrap');
  if (!wrap) return;
  const show = G3.rec && G3.t <= 0.01;
  let el = wrap.querySelector('.g3Hint');
  if (!show) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.className = 'g3Hint';
    wrap.appendChild(el);
  }
  el.textContent = 'MISSION NOT STARTED — T+00:00 · PRESS PLAY';
}

function bindChrome() {
  const scrub = document.getElementById('g3Scrub');
  const at = ev => {
    const r = scrub.getBoundingClientRect();
    seek((ev.clientX - r.left) / r.width * G3.rec.dur);
  };
  scrub.addEventListener('pointerdown', guard('the scrubber', ev => {
    try { scrub.setPointerCapture(ev.pointerId); } catch (e) { /* no capture, still fine */ }
    G3.playing = false; at(ev);
    const mv = guard('the scrubber', e => at(e));
    /* pointercancel matters: a drag that leaves the window or is taken over
       by a browser gesture never fires pointerup, and without this the map
       stays wired to the pointer and every later mouse move scrubs time. */
    const up = () => {
      scrub.removeEventListener('pointermove', mv);
      scrub.removeEventListener('pointerup', up);
      scrub.removeEventListener('pointercancel', up);
    };
    scrub.addEventListener('pointermove', mv);
    scrub.addEventListener('pointerup', up);
    scrub.addEventListener('pointercancel', up);
  }));
  scrub.addEventListener('keydown', guard('the scrubber keys', ev => {
    const step = ev.shiftKey ? 5 : 0.5;
    if (ev.key === 'ArrowLeft') { seek(G3.t - step); ev.preventDefault(); }
    if (ev.key === 'ArrowRight') { seek(G3.t + step); ev.preventDefault(); }
    if (ev.key === 'Home') { seek(0); ev.preventDefault(); }
    if (ev.key === 'End') { seek(G3.rec.dur); ev.preventDefault(); }
  }));

  /* The map's own play head. Running this at the same time as the host's run
     would put two clocks in charge of one picture, so starting it stops the
     host — the same trade the scrubber makes, for the same reason. */
  document.getElementById('g3Play').onclick = guard('play/pause', () => {
    /* WHILE THE MAP IS ON THE HOST'S CLOCK THIS IS THE RUN'S OWN BUTTON, not
       a second one beside it. An operator reading the 3D theatre is reading
       the bottom of the screen, and the control they reach for there has to
       be the same control as the one in the chrome above — so it presses
       that one rather than starting a private clock that would immediately
       disagree with it.

       Once they have scrubbed away from the host — follow off — it is the
       replay's own play head again, because that is the only thing that can
       move while the run is stopped. */
    const H = hostRun();
    let took = false;
    if (H && G3.follow) { try { took = !!H.toggle(); } catch (e) { took = false; } }
    if (took) { paintTransport(); return; }
    /* The host had no run to press — nothing deployed yet, or its transport
       is not on screen. The replay is still a replay and it can still be
       played on its own, which is what this did before there was a host. */
    G3.playing = !G3.playing;
    if (G3.playing) {
      detachFromHost();
      if (G3.t >= G3.rec.dur - 0.01) G3.t = 0;
    }
    paintTransport();
  });
  const rates = [1, 2, 4, 10, 30];
  document.getElementById('g3Rate').onclick = guard('the rate control', ev => {
    G3.rate = rates[(rates.indexOf(G3.rate) + 1) % rates.length];
    ev.target.textContent = G3.rate + '×';
  });
  document.getElementById('g3Follow').onclick = guard('the follow toggle', () => {
    G3.follow = !G3.follow;
    if (G3.follow) {
      /* Going back on the host clock means going to the host's minute, now,
         rather than waiting for that clock to move before anything happens. */
      G3.playing = false;
      G3._followT = null;
      if (typeof APP !== 'undefined') {
        G3.t = Math.max(0, Math.min(G3.rec.dur,
          APP.tView == null ? (APP.t || 0) : APP.tView));
        G3._appT = G3.t;
      }
    } else detachFromHost();
    paintTransport();
    paintHint();
  });
  /* Camera moves are animated. A frame-to-frame jump is the single most
     common thing an operator describes as "wonky": the eye loses track of
     where it was looking and has to re-find the sector. */
  const goTo = (pitch, bearing) => {
    const vs = fitViewState(G3.rec, pitch, bearing);
    G3.view = vs; G3.zoom = vs.zoom; G3._neKey = null;
    G3.deck.setProps({ initialViewState: { ...vs, transitionDuration: 520 } });
  };
  document.getElementById('g3Fit').onclick = guard('the camera preset', () => goTo());
  document.getElementById('g3Top2').onclick = guard('the camera preset', () => goTo(0, 0));

  /* Keyboard, scoped to this pane so it never fights the application's own
     bindings. Space, R and the digits belong to the host and are left alone. */
  window.addEventListener('keydown', guard('the pane keyboard shortcuts', ev => {
    if (!isActive() || ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA') return;
    const step = ev.shiftKey ? 5 : 0.5;
    if (ev.key === ',') { seek(G3.t - step); ev.preventDefault(); }
    else if (ev.key === '.') { seek(G3.t + step); ev.preventDefault(); }
    else if (ev.key === 'p' || ev.key === 'P') { document.getElementById('g3Play').click(); }
    else if (ev.key === 'f' || ev.key === 'F') { document.getElementById('g3Fit').click(); }
  }));
}

/* The GPU map is a renderer for "the fight", not a destination of its own, so
   "am I on screen" is two questions rather than one: is that view the one the
   operator is looking at, and is this the renderer they picked. Both have to
   be true or the frame loop does nothing at all — which is the whole point of
   asking, because on a software rasteriser a frame of this map is expensive
   and there is no reason to spend it behind a hidden pane. */
function isActive() {
  const p = document.querySelector('[data-pane="MISSION"]');
  if (!p || !p.classList.contains('active')) return false;
  return typeof APP === 'undefined' ? true : APP.mapMode === '3D';
}

/* One animation loop, gated on the pane being visible. Nothing renders and
   nothing is computed while the operator is looking at another view.

   The next frame is booked before the body runs, and the handle is kept on
   G3 so that `fatal` can cancel the frame it just booked. That ordering is
   what makes a failure inside the body terminal rather than repeating: the
   loop is already scheduled, and the error handler unschedules it. */
function loop() {
  const step = now => {
    G3._raf = requestAnimationFrame(step);
    try { frame(now); } catch (e) { fatal('the render loop', e); }
  };
  G3._raf = requestAnimationFrame(step);
}

/* The body of one frame, lifted out of the scheduler so the scheduler can be
   nothing but "book the next one, run this one, contain what it throws". */
function frame(now) {
  if (!G3.deck || !G3.rec) return;
  if (!isActive()) { G3.lastFrame = 0; return; }

  const dtMs = G3.lastFrame ? Math.min(200, now - G3.lastFrame) : 16;
  G3.lastFrame = now;

  /* Before anything is drawn: has the application done something to the run
     that this replay has not noticed? Reset and deploy both arrive silently. */
  syncToApp();
  if (!G3.rec) return;

  if (G3.follow && typeof APP !== 'undefined' && APP.world) {
    /* The application advances its clock in quarter-minute steps. Copying
       that number straight across makes every aircraft hop a quarter of a
       minute's flying at a time, which at any speed above 1x is a visible
       stutter. So the target is taken from the application and the map's
       own clock is walked towards it — it catches up within a frame or two
       of any jump, and in between it moves continuously. */
    const target = Math.min(G3.rec.dur, APP.tView == null ? (APP.t || 0) : APP.tView);
    /* Snap rather than glide whenever the clock has jumped. Any move backwards
       is a reset or a seek on the host transport, and easing into it makes the
       map look like it ignored the button for the best part of a second —
       which is precisely how a working reset gets reported as broken. Large
       forward jumps are seeks too and get the same treatment. Only genuine
       running — a quarter of a minute at a time — is interpolated. */
    if (G3._followT == null || target < G3.t - 0.02 || target - G3.t > 3) G3.t = target;
    else G3.t += (target - G3.t) * Math.min(1, dtMs / 90);
    G3._followT = target;
  } else if (G3.playing) {
    // `rate` is simulated minutes per real second: at 4x a three-hour
    // mission runs past in three quarters of a minute.
    G3.t += (dtMs / 1000) * G3.rate;
    if (G3.t >= G3.rec.dur) { G3.t = G3.rec.dur; G3.playing = false; }
  }

  // The pulse re-uploads its two attributes every frame; everything else is
  // gated behind the quantised clock and does not.
  G3._pulseTick = (G3._pulseTick + 1) & 0xffff;
  if (!G3._freeze) {
    const b0 = performance.now();
    G3.deck.setProps({ layers: buildLayers() });
    G3._buildMs = G3._buildMs * 0.9 + (performance.now() - b0) * 0.1;
  }

  /* The chrome is HTML, and rewriting it sixty times a second would churn
     the DOM under the operator's cursor for numbers that cannot change
     that fast. Six times a second is past the point anyone can read. */
  if (now - (G3._chromeAt || 0) > 160) {
    G3._chromeAt = now;
    paintTransport();
    paintCounts();
    paintFurniture();
    paintComms();
    paintHint();
    if (G3.sel) paintSel();
  }

  G3._frames++;
  if (now - G3._fpsAt > 1000) {
    G3.fps = Math.round(G3._frames * 1000 / (now - G3._fpsAt));
    G3._frames = 0; G3._fpsAt = now;
  }
}

/* ==================================================================== */
/*  BOOTSTRAP                                                           */
/* ==================================================================== */

/* Withdrawing now means taking the 2D/3D switch off the map and putting the
   view back on the canvas renderer — not removing a destination. "The fight"
   is still there and still works; it simply has one renderer instead of two,
   and no control on screen that cannot do anything. */
function removeSelf(why) {
  document.querySelectorAll('[data-view="THEATER3D"]').forEach(el => el.remove());
  const sw = document.getElementById('mapModeSw');
  if (sw) sw.remove();
  const host = document.getElementById('g3Host');
  if (host) host.remove();
  document.body.classList.remove('map3d');
  if (typeof APP !== 'undefined') {
    if (APP.view === 'THEATER3D') APP.view = 'MISSION';
    APP.mapMode = '2D';
    /* Do not write '2D' to storage. The machine that cannot run this today
       may be a different machine tomorrow with the same profile, and a
       withdrawal caused by capability should not look like a preference. */
  }
  /* Recorded twice: once now, and once more after ANGEL.ready settles. The
     registry marks a subsystem 'ready' the moment its function resolves, and
     a function that withdrew the view rather than building it would otherwise
     be reported as a success. `withheld` is the truthful state and it is the
     one the readiness panel should end on. */
  G3.withheld = why;
  G3_DEAD = true;
  ANGEL.setStatus('theater3d', 'withheld', why);
}

/* WebGL2 is not negotiable for this view. On a machine without it the honest
   move is to take the control off the screen rather than let a judge click
   into a black rectangle; the 2D maps remain the path. The check runs before
   ANGEL.ready so the subsystem is recorded as deliberately withheld rather
   than as a failure. */
if (!ANGEL.caps.webgl2) {
  removeSelf('WebGL2 unavailable on this machine — the 2D maps remain the path');
} else if (typeof createWorld !== 'function' || typeof stepArm !== 'function') {
  removeSelf('simulation not loaded');
} else bootTheater3D();

/* ==================================================================== */
/*  THEME CHANGE                                                        */
/* ==================================================================== */

/* Two of the things this map draws are BAKED IMAGES, and neither of them can
   be restyled by a CSS custom property:

     · the symbol atlas — every airframe, launch point, hostile diamond,
       casualty mark and outcome cross, drawn onto one canvas and uploaded to
       the GPU as a texture;
     · the shaded-relief sheet — the sector's own terrain, hillshaded and
       contoured pixel by pixel from the simulation's elevation field.

   So a theme change here is a rebuild, not a repaint. Everything else the
   statics carry — coastline strokes, graticule, control measures, reach
   rings, sector frame — has its colour baked into a plain array at build
   time for the same reason deck.gl wants it that way, so those are rebuilt
   with them rather than being separately invalidated and getting out of step.

   The memo keys are then cleared. Every one of them is keyed on state that
   has NOT changed — the clock has not moved, the camera has not moved, the
   selection is the same — so without this the next frame would happily serve
   the previous theme's arrays out of cache and the map would not change at
   all until the operator touched something.

   Contained like everything else in this module: if the rebuild throws, the
   map is shut down and the 2D renderer takes the view, rather than the theme
   picker taking the application with it. */
/* The rebuild is LAZY. Announced eagerly it would cost a third of a second
   on a software rasteriser for a map the operator may not be looking at —
   and the theme picker fires this, the theatre map's rebuild and the 2D
   map's relief re-tint on the same synchronous event, which put a second of
   blocked main thread between a click and its result. So the theme change
   only records that the baked images are stale; ensureTheme, called on the
   first frame this map is actually drawn, is what pays for it. Switching
   theme with the 2D renderer up now costs nothing here at all. */
let G3_THEME = -1;
function ensureTheme() {
  if (G3_DEAD || !G3.D) return;
  if (G3_THEME === TGEN()) return;
  G3_THEME = TGEN();
  rethemeTheater3D();
}

function rethemeTheater3D() {
  if (G3_DEAD || !G3.D) return;
  const t0 = performance.now();
  try {
    G3.atlas = buildIconAtlas();
    if (G3.rec) G3.statics = buildStatics(G3.rec);
    G3._neKey = G3._ctlKey = G3._txtKey = G3._entKey = G3._dynKey = null;
    G3._ent = null;
    G3._neCut = null;
    G3._chromeAt = 0;
    refreshLegend();
  } catch (e) {
    fatal('rebuilding the map for a theme change', e);
    return;
  }
  const ms = performance.now() - t0;
  try {
    ANGEL.mark('theater3d retheme', {
      ms: Math.round(ms),
      sheetMs: G3.statics ? Math.round(G3.statics.terrain.ms) : 0,
      theme: (document.body && document.body.getAttribute('data-theme')) || '?'
    });
  } catch (e) { /* the mark log is not load-bearing */ }
}

/* Nothing is rebuilt here. See ensureTheme. */
try {
  if (window.ANGEL && ANGEL.on) {
    ANGEL.on('theme', function () { G3_THEME = -1; });
  }
} catch (e) { /* the bus is not load-bearing here */ }

function bootTheater3D() {
  const done = ANGEL.ready('theater3d', initTheater3D);
  done.then(() => {
    if (G3.withheld) ANGEL.setStatus('theater3d', 'withheld', G3.withheld);
  });
}

async function initTheater3D() {
  /* WebGL2 present but software-rasterised — SwiftShader under headless
     Chromium, llvmpipe on a machine with no driver. It works and it is
     honest to keep the view, but the fill rate is a fraction of a real
     GPU's, so the sheet is sampled at half resolution and the two decorative
     line layers come off. Everything that carries information stays. */
  const rend = String(ANGEL.caps.glRenderer || '');
  G3.lowGPU = /swiftshader|llvmpipe|software|basic render/i.test(rend);
  G3.renderer = rend;

  /* The vendored deck.gl bundle, and then an audit of it before a single
     layer is constructed. See FAILURE CONTAINMENT above for why this is not
     paranoia: the bundle and this file are separate HTTP resources under
     separate cache policies, and they have been observed loading out of step
     with each other. Every symbol is checked, not just the one that broke,
     because the next mismatch will be a different one. */
  let D;
  try {
    D = await import(ANGEL.asset(DECK_PATH));
  } catch (e) {
    console.warn('[theater3d] the deck.gl bundle at ' + DECK_PATH + ' would not load (' +
      ((e && e.message) || e) + '). The 3D map is withheld; the 2D tactical and ' +
      'theatre maps are unaffected.');
    removeSelf('deck.gl bundle would not load — the 2D maps remain the path');
    return false;
  }

  const missing = missingDeckSymbols(D);
  if (missing.length) {
    console.warn('[theater3d] the deck.gl bundle at ' + DECK_PATH + ' does not export ' +
      missing.join(', ') + ' as a constructor. The likeliest cause by far is a stale ' +
      'cached copy of that file — it is not content-hashed, so a browser holding an ' +
      'older build will pair it with freshly loaded application code. Fix: hard reload ' +
      '(Ctrl-Shift-R, or Cmd-Shift-R on macOS). The 3D map is withheld until then; the ' +
      '2D tactical and theatre maps are unaffected and carry the same information.');
    removeSelf('deck.gl bundle incomplete (no ' + missing[0] +
      ') — most likely a stale cached copy; hard reload with Ctrl-Shift-R');
    return false;
  }

  G3.D = D;

  try {
    G3.base = await loadBasemap();
    G3.atlas = buildIconAtlas();
    /* The atlas has just been baked under the live theme, so record which
       one — otherwise the first frame would rebuild everything it has this
       moment finished building. */
    G3_THEME = TGEN();
  } catch (e) {
    console.warn('[theater3d] the basemap or the symbol atlas could not be built (' +
      ((e && e.message) || e) + '). The 3D map is withheld; the 2D maps are unaffected.');
    removeSelf('basemap unavailable — the 2D maps remain the path');
    return false;
  }

  /* The stylesheet has to be in the document before the application is told
     the renderer exists, because the very next thing that can happen is the
     body gaining .map3d — and a half-styled switch-over is a visible flash. */
  injectCSS();

  ANGEL.views = ANGEL.views || {};
  /* THEATER3D is no longer a pane. This registration survives only as a
     safety net for any caller that still sets APP.view directly rather than
     going through goView(); it puts them where they meant to go. */
  ANGEL.views.THEATER3D = function renderTheater3D() {
    if (G3_DEAD) return;
    if (typeof APP === 'undefined') return;
    APP.view = 'MISSION';
    if (typeof setMapMode === 'function') setMapMode('3D');
  };

  /* Called by renderMission on every frame the operator is in 3D. It is the
     one place a first failure can originate outside the render loop, so it
     carries the same contract: report once, then the module is done. */
  function enter() {
    if (G3_DEAD) return;
    try {
      mountTheater3D().catch(e => fatal('opening the view', e));
    } catch (e) {
      fatal('opening the view', e);
    }
  }

  /* enter() is now called from renderMission on every animation frame rather
     than once per navigation, so the common case has to cost nothing. Once
     the surface is up this returns on the first line; the expensive work —
     recording the run, building the deck instance — happens on the first
     frame after the switch is thrown and never again. */
  async function mountTheater3D() {
    /* Already up: the only thing left to do is notice anything the
       application has changed about the run. This is the path taken on the
       overwhelming majority of frames, and syncToApp is written to cost
       almost nothing when the answer is "nothing has changed". */
    if (G3.mounted && document.getElementById('g3Wrap')) { syncToApp(); return; }
    if (G3._mounting) return;
    const host = document.getElementById('g3Host');
    if (!host) return;
    G3._mounting = true;
    try {
      await ensureRecording();
      if (!G3.rec) return;
      if (!G3.mounted) mount(host);
      else if (!document.getElementById('g3Wrap')) {
        // The host was emptied by something else; rebuild rather than sit blank.
        G3.mounted = false;
        if (G3.deck) { G3.deck.finalize(); G3.deck = null; }
        mount(host);
      }
    } finally { G3._mounting = false; }
  }

  /* Handing the map over, in both directions.

     The two renderers do not read the same thing. The 2D map draws the arm
     the application is mutating in place; this one draws a deterministic
     replay of the whole run, which is what makes scrubbing backwards
     possible at all. They can still agree on a moment, and that is the part
     the operator actually cares about.

     Coming in: take the application's clock and its selection, and go back to
     following. The operator asked for the same fight in a different renderer,
     not for a different moment.

     Going out: if the operator had scrubbed this replay away from the live
     clock, hand that minute back so the 2D map opens where they were looking.
     If they were following, there is nothing to hand over — the clocks
     already agree — and the application is left running undisturbed. */
  function adopt(st) {
    if (G3_DEAD || !st) return;
    if (typeof st.t === 'number' && G3.rec) {
      G3.t = Math.max(0, Math.min(G3.rec.dur, st.t));
    }
    G3.follow = true; G3.playing = false; G3._followT = null;
    /* Take the application's clock as the last-seen value in the same breath
       as adopting it. Otherwise the first frame after switching renderers sees
       a clock that has apparently jumped and treats it as an operator seek —
       harmless today, but it is exactly the kind of thing that leaves the map
       showing one minute while the transport reads another. */
    if (typeof APP !== 'undefined') {
      G3._appT = APP.tView == null ? (APP.t || 0) : APP.tView;
      /* And if the run was reset while the operator was looking at another
         view, this is where that is discovered. */
      if (G3._world !== APP.world) syncToApp();
    }
    G3._entKey = G3._dynKey = null;
    G3._ent = null;
    const s = st.sel;
    if (s && (s.kind === 'cas' || s.kind === 'drone')) {
      if (!G3.sel || G3.sel.id !== s.id || G3.sel.kind !== s.kind) {
        G3.sel = { kind: s.kind, id: s.id };
        if (G3.mounted) paintSel();
      }
    }
    if (G3.mounted) paintTransport();
  }

  function handOffTime() {
    if (G3_DEAD || !G3.rec || G3.follow) return null;
    return G3.t;
  }

  /* G still means "the fight, in three dimensions" — it is in the shortcut
     sheet and in a judge's fingers. It is now a navigation plus a renderer
     choice rather than a jump to a pane of its own. */
  window.addEventListener('keydown', guard('the G shortcut', ev => {
    if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA') return;
    if ((ev.key === 'g' || ev.key === 'G') && typeof APP !== 'undefined') {
      APP.view = 'MISSION'; APP._paneForce = true;
      if (typeof setMapMode === 'function') setMapMode('3D');
      else if (typeof render === 'function') render();
    }
  }));

  ANGEL.provide('theater3d', {
    G3, recordRun, projectorFor, casAt,
    stats: () => ({
      fps: G3.fps, layers: G3._layerCount, t: G3.t,
      casualties: G3.rec ? G3.rec.cas.length : 0,
      arcs: G3.rec ? G3.rec.arcs.length : 0,
      sheetMs: G3.statics ? Math.round(G3.statics.terrain.ms) : 0,
      replayMs: G3.rec ? Math.round(G3.rec.buildMs) : 0
    }),
    seek: t => { seek(t); },
    counts: t => {
      const at = t == null ? G3.t : t;
      let died = 0, open = 0, treated = 0;
      for (const c of (G3.rec ? G3.rec.cas : [])) {
        const s = casAt(c, at);
        if (!s) continue;
        if (s.state === 'DIED') died++;
        else if (s.state === 'SAVED' || s.state === 'TREATED') treated++;
        else open++;
      }
      return { died, open, treated };
    },
    /* The surface the merged map view drives this module through. */
    enter, adopt, handOffTime,
    ready: () => !G3_DEAD,

    /* THE RIGHT RAIL HAS TO DRIVE WHICHEVER MAP IS UNDER IT.
       Zoom, fit and the layer controls on that rail reached only the flat
       canvas viewport, which this renderer does not use. On the GPU map they
       were therefore visible, pressable and completely inert — the single
       loudest "the buttons don't work" in the application. These four are
       what the rail calls when this is the map on screen. */
    camera: {
      zoomBy(f) {
        if (!G3.deck || !G3.rec) return false;
        const vs = Object.assign({}, G3.view);
        const z0 = (vs.zoom == null ? (G3.zoom || 9) : vs.zoom);
        vs.zoom = Math.max(3, Math.min(16, z0 + (f > 1 ? 0.7 : -0.7)));
        if (vs.zoom === z0) return false;
        G3.view = vs; G3.zoom = vs.zoom; G3._neKey = null;
        G3.deck.setProps({ initialViewState: Object.assign({}, vs, { transitionDuration: 260 }) });
        return true;
      },
      fit() { const b = document.getElementById('g3Fit'); if (!b) return false; b.click(); return true; },
      layersAll() {
        const keys = Object.keys(G3.layers);
        const anyOff = keys.some(k => !G3.layers[k]);
        keys.forEach(k => { G3.layers[k] = anyOff; });
        paintToggles();
        return true;
      },
      panel() {
        const el = document.querySelector('#g3Wrap .g3Left');
        if (!el) return false;
        el.classList.toggle('g3Fold');
        return true;
      },
      panelOpen: () => {
        const el = document.querySelector('#g3Wrap .g3Left');
        return !!(el && !el.classList.contains('g3Fold'));
      }
    }
  });

  /* Only now is the switch allowed to appear. Everything above this line can
     still withdraw the renderer, and a control that shows up before its
     subsystem has committed is a control that can be clicked into a failure. */
  ANGEL.emit('map3d-ready', { renderer: G3.renderer, lowGPU: G3.lowGPU });
  return true;
}
