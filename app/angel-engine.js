/* =========================================================================
   ANGEL SWARM — ENGINE ADAPTER
   -------------------------------------------------------------------------
   This file is NOT a simulation. It is a thin projection of the real ANGEL
   SWARM engine — app/js/sim.js and app/js/optimizer.js, the same two files
   the shipped application and the Monte Carlo worker load verbatim — onto
   the small, pure, seekable surface the Design Canvas expects:

       buildRun({ seed, deployed }) -> Run
       snapshot(run, t)             -> Frame
       WORLD, PAYLOADS              -> scenario constants

   Nothing here computes an outcome. Every death, sortie, delivery, waste and
   escalation below is read out of the engine's own transactional ledgers.

   HOW THE LIVE ENGINE IS MADE SEEKABLE
   ------------------------------------
   The real engine is a stateful wall-clock simulation advanced by stepArm()
   at a fixed 0.25 min step, and seeking backwards in the shipped app destroys
   the run. The design needs snapshot(run, t) for arbitrary t, on every 120 ms
   tick. So buildRun() runs the engine headlessly, once, end to end (T+0 to
   T+180), and records:

     * the engine's own timestamped ledgers — casualties, sortieLog,
       deliveryLog, stockLog, audit chain, ground stream, proposal queue;
     * a per-step fleet trace for arm A (7 airframes x 721 steps), because
       aircraft position and current route are the only things the engine
       mutates in place and does not write to a ledger;
     * per-casualty telemetry burst times, for the staleness figure.

   snapshot(run, t) is then a pure fold of those records at time t. It is
   memoised per run on quantised t, because the design calls it fresh on
   every render and caches nothing.

   UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY
   ========================================================================= */

/* PACOM_CORAL is where the application opens and it is the reference run —
   seed 42 on this scenario is the 23-on-20-against-34-on-38 figure that every
   film and every document quotes. It is a starting value now rather than a
   constant, because the engine has always carried seven scenarios and the
   shipped interface could only ever fly one of them. See useScenario(). */
const SCENARIO_DEFAULT = 'PACOM_CORAL';
let SCENARIO_KEY = SCENARIO_DEFAULT;
const DT = 0.25;
const LAPSE_MIN = 8;             // proposal lapse window — engine reapQueue and design agree
const REACH_LOAD_KG = 1.45;      // one unit of blood in its container

/* ---------------------------------------------------------------- loading
   sim.js and optimizer.js are classic scripts sharing top-level declarations
   by bare name. They are loaded once, here, before this module finishes
   evaluating, so the design's `import(...).then(E => E.buildRun(...))` sees a
   fully armed module. Nothing is fetched off-origin; nothing is eval'd.

   Note the export aliases at the bottom of this file: this module never
   declares a local binding called PAYLOADS, PLATFORMS or dist, so those bare
   names resolve to the engine's globals. Renaming them would shadow the
   engine and silently break every payload lookup.                          */

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = false;
    s.onload = () => res();
    s.onerror = () => rej(new Error('angel-engine: could not load ' + src));
    document.head.appendChild(s);
  });
}

async function ensureEngine() {
  if (typeof createWorld === 'function' && typeof stepArm === 'function') return;
  if (typeof document === 'undefined') {
    throw new Error('angel-engine: sim.js and optimizer.js must be loaded before this module in a non-DOM host');
  }
  /* optimizer.js has exactly one free global it does not define itself:
     CALLSIGN, which lives in map.js. map.js is a renderer and has no place
     here, so the three strings are restated — the same stub the Monte Carlo
     worker uses (app/js/mc.worker.js). It affects no arithmetic. */
  if (typeof CALLSIGN === 'undefined') {
    globalThis.CALLSIGN = { HEAVY: 'TRV', LIGHT: 'M25', LONG: 'FVR' };
  }
  const base = import.meta.url;
  await loadScript(new URL('./js/sim.js', base).href);
  await loadScript(new URL('./js/optimizer.js', base).href);
  if (typeof createWorld !== 'function' || typeof stepArm !== 'function') {
    throw new Error('angel-engine: sim.js / optimizer.js loaded but did not publish createWorld/stepArm');
  }
}

await ensureEngine();

/* ================================================================ WORLD == */

let SCN = SCENARIOS[SCENARIO_KEY];
let UNITS = unitsFor(SCN);

/* The engine names islands, not casualty clusters. A cluster is a real piece
   of ground; name it after the ground it sits on rather than inventing a
   placename. Casualties carry `unit` = 'U<clusterIndex>', so site and cluster
   are the same object seen from two directions. */
function siteNameFor(cluster) {
  /* Maritime scenarios name casualty ground from their islands. Continuous
     land scenarios have no islands, so use their named map places instead of
     allowing every casualty to fall through to SITE UNNAMED. Prefer land
     labels where available; sea/strait labels are only a last geographic
     fallback. */
  const namedIslands = (SCN.islands || []).filter(p => p && p.name);
  const namedPlaces = (SCN.places || []).filter(p => p && p.name);
  const landPlaces = namedPlaces.filter(p => p.kind === 'land');
  const candidates = namedIslands.length ? namedIslands
    : landPlaces.length ? landPlaces : namedPlaces;
  let best = null, bd = Infinity;
  for (const place of candidates) {
    const d = dist(cluster.x, cluster.y, place.x, place.y);
    if (d < bd) { bd = d; best = place.name; }
  }
  return 'SITE ' + (best || 'UNNAMED');
}
let SITE_NAMES = SCN.clusters.map(siteNameFor);

function buildWorld() { return {
  joa: SCN.joa,
  /* The design renders 'JOA CORAL — ' + WORLD.name, so hand it the tail of
     the scenario's own name rather than repeating the JOA. */
  name: SCN.name.replace(/^JOA\s+\w+\s+—\s*/, ''),
  theater: SCN.theater,
  widthKm: SCN.widthKm,
  heightKm: SCN.heightKm,
  durationMin: SCN.durationMin,
  ambientC: SCN.theater === 'PACOM' ? 31 : 22,
  baseRate: SCN.baseRatePerMin,
  mascal: (SCN.mascalEvents || []).map(m => ({ at: m.atMin, n: m.n })),
  bases: SCN.bases.map((b, i) => ({
    x: b.x, y: b.y, name: b.name, afloat: !!b.afloat, idx: i,
    fleet: b.fleet.reduce((a, [k, n]) => a.concat(new Array(n).fill(k)), [])
  })),
  sites: SCN.clusters.map((c, i) => ({
    x: c.x, y: c.y, r: c.r, name: SITE_NAMES[i],
    unit: UNITS[i].name, assigned: UNITS[i].assigned
  })),
  threats: SCN.threats.map(z => ({ x: z.x, y: z.y, r: z.r, label: z.label, loss: z.lossPerMin })),
  comms: (SCN.comms || []).map(w => ({ at: w.atMin, dur: w.durMin, label: w.label }))
}; }

let WORLD = buildWorld();

/* ------------------------------------------------------- SCENARIO SELECT --
   THE ENGINE HAS ALWAYS HAD SEVEN SCENARIOS AND THIS ADAPTER COULD FLY ONE.
   SCENARIOS in sim.js carries four PACOM joint operating areas and three
   EUCOM ones, each with its own casualty rate, mass-casualty events, terrain,
   launch points and datalink-denial window — and every one of them was
   unreachable from the interface, because this file pinned the key to a
   constant at load and derived SCN, UNITS, SITE_NAMES and WORLD from it once.

   The five bindings above are now rebuilt together, in one place, and only
   from here. They are `let` rather than `const` for that reason and no other.
   WORLD is exported, and an ES module export is a live binding, so a screen
   holding `E.WORLD` sees the new theatre without re-importing anything.

   Every run records the scenario it was flown on, and the frame fold reads
   the run's own record rather than the module's current selection, so a
   snapshot taken from a JOA CORAL run stays a JOA CORAL snapshot even if the
   operator has since switched theatres. */
const SCENARIO_LIST = Object.keys(SCENARIOS).map(k => ({
  key: k,
  theater: SCENARIOS[k].theater,
  joa: SCENARIOS[k].joa,
  name: SCENARIOS[k].name,
  blurb: SCENARIOS[k].blurb,
  widthKm: SCENARIOS[k].widthKm,
  heightKm: SCENARIOS[k].heightKm,
  durationMin: SCENARIOS[k].durationMin,
  baseRatePerMin: SCENARIOS[k].baseRatePerMin,
  launchPoints: SCENARIOS[k].bases.length,
  airframes: SCENARIOS[k].bases.reduce((a, b) => a + b.fleet.reduce((q, f) => q + f[1], 0), 0),
  bases: SCENARIOS[k].bases.map(b => ({ name: b.name, afloat: !!b.afloat,
    fleet: b.fleet.map(([t, n]) => [t, n]) })),
  mascal: (SCENARIOS[k].mascalEvents || []).map(m => ({ at: m.atMin, n: m.n })),
  comms: (SCENARIOS[k].comms || []).map(c => ({ at: c.atMin, dur: c.durMin, label: c.label })),
  ambientC: SCENARIOS[k].theater === 'PACOM' ? 31 : 22
}));

function useScenario(key) {
  const k = SCENARIOS[key] ? key : SCENARIO_DEFAULT;
  if (k === SCENARIO_KEY) return k;
  SCENARIO_KEY = k;
  SCN = SCENARIOS[k];
  UNITS = unitsFor(SCN);
  SITE_NAMES = SCN.clusters.map(siteNameFor);
  WORLD = buildWorld();
  return k;
}

/* Short codes for the five Class VIII items. The engine carries the full
   label and the note; the design needs a monospace code that fits a column.
   Each is the accepted abbreviation for the item the engine models
   (the BLOOD note already says "1 unit LTOWB"). */
const SHORT = { BLOOD: 'LTOWB', PLASMA: 'FDP', TXA: 'TXA', TQ_KIT: 'HK', CHEST_SEAL: 'CS' };
const PAYLOAD_TABLE = {};
for (const k of Object.keys(PAYLOADS)) {
  PAYLOAD_TABLE[k] = Object.assign({}, PAYLOADS[k], { short: SHORT[k] || k });
}
const PLATFORM_TABLE = {};
for (const k of Object.keys(PLATFORMS)) {
  PLATFORM_TABLE[k] = Object.assign({}, PLATFORMS[k], { call: CALLSIGN[k] });
}

/* Plain-language injury labels. Presentation only — the engine's five injury
   keys are unchanged and nothing downstream reads these. */
const INJURY_LABEL = {
  TRUNCAL_HEM: 'non-compressible torso haemorrhage',
  JUNCTIONAL_HEM: 'junctional haemorrhage',
  EXTREMITY_HEM: 'extremity haemorrhage',
  AIRWAY: 'airway / thoracic',
  MINOR: 'minor wound'
};

const OVERTAKEN = 'casualty resolved before the aircraft arrived';

const pad3 = n => 'CAS-' + String(n).padStart(3, '0');
const pad2 = n => String(n).padStart(2, '0');
const eid = n => 'E-' + String(n).padStart(4, '0');
const callOf = d => CALLSIGN[d.type] + '-' + pad2(d.id);

/* ============================================================ SIMULATE == */

function lpInRangeOf(arm, c) {
  const set = new Set();
  for (const d of arm.drones) {
    if (dist(d.baseX, d.baseY, c.x, c.y) <= effectiveRadiusKm(d.plat, REACH_LOAD_KG)) set.add(d.baseIdx);
  }
  return set.size;
}

/* The engine's own first-match cascade (optimizer.js deathCauses), applied
   per casualty so the histogram can be sliced by time. Asserted against
   deathCauses(arm) at end of run. */
function causeOf(arm, c) {
  if (c.treated) return 'treatedDied';
  if (!usablePayloads(c, arm.telementor).length) return 'noResponder';
  if (lpInRangeOf(arm, c) <= 1) return 'noLaunchPoint';
  if (c.deadlineMin < 10) return 'tooFast';
  return 'busy';
}

function runEngine(seed, deployed, observedFlightVariability) {
  const world = createWorld(SCENARIO_KEY, seed);
  /* Captured at build time, not read at fold time. Everything the frame fold
     needs from the scenario is taken here so a snapshot of this run keeps
     answering for the theatre it was flown in after the selection moves. */
  const scnRef = { key: SCENARIO_KEY, durationMin: SCN.durationMin, comms: SCN.comms || [] };

  /* Arm A is ANGEL SWARM only when the capability is deployed. Undeployed,
     it is configured identically to the control arm — the same Class VIII
     push allocator, telementoring off, no human-in-the-loop — which is the
     honest "not deployed" case rather than a faked delta. */
  const armA = createArm(world, 'ANGEL SWARM', deployed ? 'ANGEL' : 'CURRENT', 'fair');
  armA.telementor = !!deployed;
  armA.hitl = !!deployed;
  armA.autoApproveAbove = 0.10;
  armA.hvaWeight = 1.6;
  armA.observedFlightVariability = !!observedFlightVariability;

  const armB = createArm(world, 'CURRENT — TRIAGE & PROXIMITY', 'CURRENT', 'fair');
  armB.telementor = false;
  armB.observedFlightVariability = !!observedFlightVariability;

  audit(armA, 0, 'SYSTEM', 'RUN-START',
    `JOA ${SCN.joa} — ${WORLD.name} · seed ${seed} · control fair · ` +
    (deployed ? 'ANGEL SWARM tasking arm A' : 'ANGEL SWARM not deployed — both arms on current triage and proximity') +
    (observedFlightVariability ? ' · observed flight variability on' : '') + ' · EXERCISE');

  const rngA = makeRNG(seed * 3 + 1);
  const rngB = makeRNG(seed * 3 + 2);

  const fleetHist = [];                 // arm A only, one entry per 0.25 min step
  const routesA = new Map();            // sortieId -> planned legs
  const routesB = new Map();
  const teleT = new Map();              // casId -> [burst times]
  const teleN = new Map();
  /* Units of blood physically aboard airframes, per step, per arm — read off
     the engine's own manifests. This is what closes the blood ledger:
     drawn - returned = transfused + destroyed + aboard, exactly, at every t. */
  const bloodAboardA = [];
  const bloodAboardB = [];
  const aboardBlood = arm => arm.drones.reduce((a, d) => a + (d.manifest && d.manifest.BLOOD || 0), 0);

  const captureRoutes = (arm, store) => {
    for (const d of arm.drones) {
      /* Refresh while the sortie is active. Later legs get their committed ETA
         only when the preceding handoff establishes their real departure time;
         retaining only the launch-time copy would split the UI/audit record
         from the timeline that actually drives treatment and movement. */
      if (d.sortieId == null || !d.route || !d.route.length) continue;
      store.set(d.sortieId, d.route.map(l => ({ casId: l.casId, payload: l.payloadKey, eta: l.eta })));
    }
  };

  const steps = Math.round(SCN.durationMin / DT);
  for (let i = 0; i <= steps; i++) {
    const t = i * DT;
    stepArm(armA, world, t, DT, rngA);
    stepArm(armB, world, t, DT, rngB);
    captureRoutes(armA, routesA);
    captureRoutes(armB, routesB);
    bloodAboardA.push(aboardBlood(armA));
    bloodAboardB.push(aboardBlood(armB));

    fleetHist.push(armA.drones.map(d => ({
      s: d.state, x: d.x, y: d.y, n: d.sorties,
      tg: d.target, pk: d.payloadKey, ta: d.tArrive,
      rt: (d.route && d.route.length && d.state === 'OUTBOUND')
        ? d.route.slice(d.legIdx).map(l => ({ c: l.casId, e: l.eta })) : null
    })));

    /* Telemetry bursts are capped at 40 on the casualty, so the array LENGTH
       stops growing while bursts keep arriving. Track the time of the newest
       entry instead, and keep our own uncapped record of when the tasking
       picture was last refreshed. */
    for (const c of armA.casualties) {
      if (!c.tele || !c.tele.length) continue;
      const last = c.tele[c.tele.length - 1].t;
      if (teleN.get(c.id) === last) continue;
      teleN.set(c.id, last);
      if (!teleT.has(c.id)) teleT.set(c.id, []);
      teleT.get(c.id).push(last);
    }
  }

  finalize(armA, SCN.durationMin);
  finalize(armB, SCN.durationMin);

  audit(armA, SCN.durationMin, 'SYSTEM', 'RUN-COMPLETE',
    `${armA.stats.survivableDeaths} died of survivable wounds of ${armA.stats.died} dead in all categories`);

  return { world, armA, armB, fleetHist, routesA, routesB, teleT, bloodAboardA, bloodAboardB, scnRef };
}

/* =========================================================== PROJECTION == */

function projectArm(arm, routes, world, bloodAboard) {
  const byId = new Map(arm.casualties.map(c => [c.id, c]));

  /* Death cause, per casualty, by the engine's cascade. */
  const causes = new Map();
  for (const c of arm.casualties) {
    if (c.outcome === 'DIED' && (c.cls === 'IMMEDIATE' || c.cls === 'DELAYED')) {
      causes.set(c.id, causeOf(arm, c));
    }
  }

  /* Deliveries, indexed by sortie and casualty. */
  const dl = new Map();
  for (const r of arm.deliveryLog) dl.set(r.sortieId + ':' + r.casId, r);

  /* Sorties, with their planned legs resolved against the delivery ledger.
     A planned leg with no delivery row is a leg the aircraft flew to a
     casualty who had already resolved — the engine returns silently in that
     case, so it is reconstructed here rather than invented. */
  const sorties = arm.sortieLog.map(s => {
    const legs = routes.get(s.id) || [];
    return {
      id: s.id, tLaunch: s.tLaunch, tReturn: s.tReturn, actor: s.actor,
      proposalId: s.proposalId, droneId: s.droneId,
      stops: legs.map(l => {
        const rec = dl.get(s.id + ':' + l.casId);
        const c = byId.get(l.casId);
        if (rec) {
          return {
            casId: l.casId, payload: l.payload,
            tAdmin: rec.ok && c && c.tTreated != null ? c.tTreated : rec.t,
            fail: rec.ok ? null : rec.wasteReason,
            arrive: l.eta, coldC: rec.coldC, overtaken: false
          };
        }
        const overtaken = !!(c && c.tResolved != null && c.tResolved <= l.eta);
        return {
          casId: l.casId, payload: l.payload, tAdmin: l.eta,
          fail: overtaken ? OVERTAKEN : 'aircraft did not reach this stop',
          arrive: l.eta, coldC: null, overtaken, unreached: !overtaken
        };
      })
    };
  });

  const cas = arm.casualties.map(c => ({
    cid: pad3(c.id), id: c.id, x: c.x, y: c.y,
    site: SITE_NAMES[Number(String(c.unit).slice(1))] || SITE_NAMES[0],
    unit: c.unitName, cls: c.cls,
    tInjury: c.tInjury, deadlineMin: c.deadlineMin,
    tResolved: c.tResolved == null ? null : c.tResolved,
    outcome: c.outcome, treated: !!c.treated,
    tTreated: c.tTreated, treatedWith: c.treatedWith,
    lpReach: lpInRangeOf(arm, c),
    cause: causes.get(c.id) || null,
    name: c.unitName + ' ' + ROLES[c.role].short,
    injury: INJURY_LABEL[c.injury] || c.injury,
    responder: TIERS[c.responder].name,
    /* The responder's qualification, not just their name. The chain of
       custody has to be able to say what the person on scene was trained to
       do, because on this engine's own cascade that is what decides whether
       any payload could have been used at all (causeOf -> 'noResponder').
       Read straight off the engine's TIERS table; nothing is derived. */
    responderTier: c.responder,
    responderQual: TIERS[c.responder].training + ' of training',
    responderCan: TIERS[c.responder].can.map(k => PAYLOAD_TABLE[k].short),
    role: ROLES[c.role].label,
    needs: c.needs.slice(),
    penetrating: !!c.penetrating,
    p0: c.p0,
    reachN: c.reachN
  }));

  const proposals = arm.queue.map(p => {
    const d = arm.drones.find(k => k.id === p.droneId);
    const lead = byId.get(p.leadId);
    return {
      id: p.id, tRaised: p.tRaised, tActed: p.tActed == null ? null : p.tActed,
      state: p.state,
      call: d ? callOf(d) : '—',
      casId: p.leadId,
      /* The engine plans one route for one aircraft; it never names the
         casualty that would go unserved if this commits. */
      altId: null,
      eta: p.eta,
      deadline: lead ? lead.deadlineMin : (p.leadDeadline || 0),
      gain: p.gain,
      route: p.route.map(l => ({ payload: l.payloadKey, casId: l.casId })),
      grounds: p.reasons.slice(),
      leadReserve: p.leadReserve,
      summary: p.summary
    };
  }).sort((a, b) =>
    /* Longest-standing escalations first, ties by time raised. The design
       picks the first proposal raised after T+60 to demonstrate the Decision
       screen and assumes it is still pending a minute later; an escalation
       the engine reaped in 30 seconds (because the aircraft was retasked)
       would render an empty queue. No figure is altered by the ordering —
       Frame.pending is derived from tRaised/tActed, not from this array. */
    ((b.tActed == null ? SCN.durationMin : b.tActed) - b.tRaised) -
    ((a.tActed == null ? SCN.durationMin : a.tActed) - a.tRaised) ||
    (a.tRaised - b.tRaised));

  /* Audit chain. Escalation rows are prefixed with their proposal id because
     the design resolves a queued decision back to its record by looking for
     'E-nnnn' in the detail. Prefixing changes the text, so the chain is
     recomputed with the engine's own auditHash over the text actually shown
     — a chain that verifies against what is on screen rather than against
     text nobody can see. */
  let prev = 'GENESIS';
  const auditRows = arm.audit.map(e => {
    let detail = e.detail;
    const pid = e.meta && e.meta.proposal;
    if (pid != null && !detail.includes(eid(pid))) detail = eid(pid) + ' · ' + detail;
    const payload = [e.t.toFixed(2), e.actor, e.action, detail].join('|');
    const hash = auditHash(prev, payload);
    const row = { seq: e.seq, t: e.t, actor: e.actor, action: e.action, detail, meta: e.meta || null, prev, hash };
    prev = hash;
    return row;
  });

  const bases = arm.bases.map((b, i) => ({
    name: b.name, afloat: !!SCN.bases[i].afloat, x: b.x, y: b.y, idx: i
  }));

  const drones = arm.drones.map(d => ({
    call: callOf(d), id: d.id, type: d.type,
    plat: PLATFORM_TABLE[d.type], platLabel: d.plat.label,
    base: { name: d.baseName, idx: d.baseIdx }, x: d.baseX, y: d.baseY,
    sorties: d.sorties, delivered: d.delivered, wasted: d.wasted,
    lost: d.state === 'LOST'
  }));

  const stockLog = arm.stockLog.map(r => ({
    reason: r.reason, item: r.item, t: r.t, base: r.baseIdx, d: r.delta
  }));

  /* Ground stream. The design's renderer has three phase labels, keyed off
     `kind`: DELIVERED, WASTE, and everything else as PAYLOAD AWAY. The
     engine reports eight phases; the intermediate ones (ON STATION,
     RECOVERED) are dropped as duplicative and the terminal ones are mapped. */
  const KIND = {
    'PAYLOAD AWAY': 'PAYLOAD AWAY',
    'ADMINISTERED — CASUALTY STABLE': 'DELIVERED',
    'ADMINISTERED — CASUALTY LOST': 'ADMINISTERED',
    'UNDELIVERABLE': 'WASTE',
    'COLD CHAIN BROKEN': 'WASTE',
    'NOT RECOVERED': 'WASTE'
  };
  const stream = arm.stream
    .filter(e => KIND[e.phase])
    .map(e => ({
      t: e.t, call: e.call || null, kind: KIND[e.phase], phase: e.phase,
      casId: e.casId, payload: e.payload || null, text: e.text, relay: e.relay
    }));

  const stats = {
    allDeaths: arm.stats.died,
    survivableDeaths: arm.stats.survivableDeaths,
    survivableSaved: arm.stats.survivableSaved,
    survivableTotal: arm.stats.survivableTotal,
    coldSwaps: arm.stats.coldSwaps,
    escalated: arm.queue.length,
    coldAborts: arm.stats.coldAborts,
    saved: arm.stats.saved,
    treated: arm.stats.treated,
    sorties: arm.stats.sorties,
    wastedSorties: arm.stats.wastedSorties,
    dronesLost: arm.stats.dronesLost,
    bloodWasted: arm.stats.bloodWasted,
    bloodUsed: arm.stats.bloodUsed,
    approved: arm.stats.approved,
    rejected: arm.stats.rejected,
    lapsed: arm.stats.expired,
    autoApproved: arm.stats.autoApproved,
    stockouts: arm.stats.stockouts,
    missedDeadline: arm.stats.missedDeadline
  };

  return {
    label: arm.label, cas, sorties, proposals, audit: auditRows, stats,
    bases, drones, stockLog, stream,
    _bloodAboard: bloodAboard,
    _byId: new Map(cas.map(c => [c.id, c])),
    _raw: arm
  };
}

/* ================================================== THE THIRD ARM ========
   NO FORWARD DELIVERY — what the same battle costs when nothing is flown.

   WHY THIS ARM HAD TO EXIST. Arms A and B both fly drones and both put blood
   forward; the only thing that separates them is the order they choose. So
   the pair proves that deadline tasking beats proximity tasking and proves
   nothing whatsoever about whether flying blood forward beats today's actual
   practice, which is that nothing is delivered and the casualty waits for
   evacuation. A reader asking "compared to what — no drones at all?" had no
   arm to point at. This is that arm.

   WHY IT NEEDS NO ALLOCATOR, AND WHY THAT IS NOT A SHORTCUT. Read the two
   places optimizer.js resolves an untreated casualty — the deadline sweep in
   stepArm and finalize(). Both do exactly this:

       const r = makeRNG(c.id * 6151);
       c.outcome = r() < survivalIfUntreated(c) ? 'SAVED' : 'DIED';

   The draw is seeded off the casualty's own id and nothing else. It does not
   depend on the arm, on the allocator, on the fleet, or on how far into the
   run we are — that is what makes the common random numbers common. So for a
   casualty nobody ever reaches, the outcome the engine would compute is fully
   determined the moment the casualty exists. Flying a third fleet that is
   ordered never to launch would burn 721 steps to arrive at these same
   values. This function computes them directly. It is the identical code
   path, not an approximation of it, and it reads the same two engine
   functions rather than restating their numbers here.

   WHAT THIS ARM CLAIMS, AND WHAT IT DOES NOT. survivalIfUntreated() is a
   function of triage class alone: MINIMAL 0.995, DELAYED 0.42, IMMEDIATE
   0.06, EXPECTANT 0.02. So this is emphatically NOT "everybody dies" — most
   of this cohort lives, and four in ten of the DELAYED live. What it models
   is a 180-minute window in which no intervention is delivered to the
   casualty. It says nothing about evacuation arriving afterwards, because
   the scenario's own premise is that it does not arrive inside this window:
   evacuation delayed greater than 72 hours, COL Jason Corley, Director of
   the Armed Services Blood Program, June 2026. The arm is named for the
   thing it actually models — no forward delivery — and not for a claim about
   evacuation that the engine does not make.

   The casualty stream is the world's, shared with both other arms, so the
   three figures are three readings of one battle. */
function projectNoDelivery(world, durationMin) {
  const cas = [];
  let allDeaths = 0, survivableDeaths = 0, survivableSaved = 0, survivableTotal = 0;

  for (const c of world.stream) {
    const r = makeRNG(c.id * 6151);
    const outcome = r() < survivalIfUntreated(c) ? 'SAVED' : 'DIED';
    const sv = (c.cls === 'IMMEDIATE' || c.cls === 'DELAYED');

    /* WHEN THE DEATH IS RECORDED, so this arm folds over time the way the
       other two do rather than dumping its whole toll at T+180. The engine
       resolves an unreached casualty on the first 0.25-minute step more than
       eight minutes past their physiological deadline, and sweeps up anyone
       still open — the stable ones carrying the 9000 sentinel — in
       finalize() at the horizon. Both rules are reproduced here. */
    let tResolved;
    if (c.deadlineMin < 9000) {
      tResolved = Math.ceil((c.tInjury + c.deadlineMin + LAPSE_MIN) / DT) * DT;
      if (tResolved > durationMin) tResolved = durationMin;
    } else {
      tResolved = durationMin;
    }

    if (sv) { survivableTotal++; if (outcome === 'SAVED') survivableSaved++; }
    if (outcome === 'DIED') { allDeaths++; if (sv) survivableDeaths++; }
    cas.push({ id: c.id, cls: c.cls, outcome, tResolved, tInjury: c.tInjury });
  }

  return {
    label: 'NO FORWARD DELIVERY',
    cas,
    /* Zeroed rather than absent. Every one of these is a real property of
       this arm — it flies nothing, so it wastes nothing, loses nothing and
       spoils nothing — and a screen that reads .sorties off an arm should
       get 0 here, not undefined. */
    stats: {
      allDeaths, survivableDeaths, survivableSaved, survivableTotal,
      sorties: 0, treated: 0, wastedSorties: 0, dronesLost: 0,
      bloodUsed: 0, bloodWasted: 0, coldSwaps: 0, coldAborts: 0,
      stockouts: 0, missedDeadline: survivableDeaths,
      saved: cas.filter(k => k.outcome === 'SAVED').length
    }
  };
}

/* ============================================================== buildRun == */

const RUN_CACHE = new Map();
const CACHE_MAX = 10;   /* headroom over the per-scenario seed-42 pins above */

function buildRun(opts) {
  const o = opts || {};
  const seed = o.seed == null ? 42 : o.seed;
  const deployed = o.deployed !== false;
  const observedFlightVariability = !!o.observedFlightVariability;
  /* THE SCENARIO IS PART OF THE RUN'S IDENTITY, so it is part of the cache
     key. Without it, switching theatre and asking for seed 42 again would
     hand back the JOA CORAL run under a JOA FJORD heading — the exact class
     of silent wrongness a cache is for. An unknown key falls back to the
     default rather than throwing: a bad selection should show the reference
     theatre, not an empty screen. */
  const scenario = useScenario(o.scenario == null ? SCENARIO_KEY : o.scenario);
  const key = scenario + '|' + seed + '|' + (deployed ? 1 : 0) + '|' +
    (observedFlightVariability ? 1 : 0);
  if (RUN_CACHE.has(key)) return RUN_CACHE.get(key);

  const r = runEngine(seed, deployed, observedFlightVariability);
  const A = projectArm(r.armA, r.routesA, r.world, r.bloodAboardA);
  const B = projectArm(r.armB, r.routesB, r.world, r.bloodAboardB);
  /* The third arm is folded off the same world stream the other two were
     cloned from, so all three answer for one battle. See projectNoDelivery. */
  const C = projectNoDelivery(r.world, r.scnRef.durationMin);

  const run = {
    seed, deployed, scenario, observedFlightVariability,
    flightVariabilityProfile: observedFlightVariability ? OBSERVED_FLIGHT_VARIABILITY.id : null,
    _scn: r.scnRef,
    /* THE CASUALTY STREAM — built once per world and cloned into both arms.
       Only its length is read by the design; the elements are the stream as
       generated, projected to plain data. */
    stream: r.world.stream.map(c => ({
      id: c.id, cid: pad3(c.id), tInjury: c.tInjury, cls: c.cls,
      injury: c.injury, deadlineMin: c.deadlineMin,
      site: SITE_NAMES[Number(String(c.unit).slice(1))] || SITE_NAMES[0]
    })),
    A, B, C,
    _fleetHist: r.fleetHist,
    _teleT: r.teleT,
    _frames: new Map()
  };

  /* Keep seed 42 pinned — it is the reference run and the design holds both
     of its arms for the life of the page. Everything else is a replication
     and is evicted so 40 of them cannot accumulate. The pin is now per
     scenario rather than one pair of literals: an operator on JOA FJORD who
     runs the 40-replication study on the Evidence screen would otherwise
     evict the very run the screens around it are reading. Seven scenarios
     times two arms bounds this at fourteen, which is the point. */
  RUN_CACHE.set(key, run);
  const pinned = k => /\|42\|[01]\|0$/.test(k);
  if (RUN_CACHE.size > CACHE_MAX) {
    for (const k of RUN_CACHE.keys()) {
      if (pinned(k)) continue;
      RUN_CACHE.delete(k);
      if (RUN_CACHE.size <= CACHE_MAX) break;
    }
  }
  return run;
}

/* ================================================================ tally == */

/* Every after-action figure, derived at time t by folding the arm's own
   ledgers. Issued = transfused + destroyed + aboard by construction. */
function tally(arm, t, durationMin) {
  /* At and beyond the end of the run every ledger row counts: the engine's
     finalize() and any administration that completes after T+180 both stamp
     times at or past the horizon. The horizon is handed in by the caller,
     which holds the run and therefore knows which scenario it belongs to;
     the module's current selection is only the fallback. */
  const end = t >= (durationMin == null ? SCN.durationMin : durationMin);
  if (end) t = Infinity;
  let allDeaths = 0, treated = 0, bloodUsed = 0;
  for (const c of arm.cas) {
    if (c.outcome === 'DIED' && c.tResolved != null && c.tResolved <= t) allDeaths++;
    if (c.treated && c.tTreated != null && c.tTreated <= t) {
      treated++;
      if (c.treatedWith === 'BLOOD') bloodUsed++;
    }
  }
  let sorties = 0, unusable = 0, overtaken = 0;
  for (const s of arm.sorties) {
    if (s.tLaunch <= t) sorties++;
    for (const st of s.stops) {
      if (!st.fail) continue;
      const when = st.tAdmin != null ? st.tAdmin : st.arrive;
      if (when > t) continue;
      /* A leg the aircraft never flew — the airframe was lost, or the sortie
         aborted — is neither a delivery the responder could not use nor a
         tasking overtaken on arrival. It is carried on the sortie record and
         counted in neither column. */
      if (st.unreached) continue;
      if (st.overtaken) overtaken++; else unusable++;
    }
  }
  /* The blood ledger, closed against the engine's own manifests:
     drawn - returned = transfused + destroyed + aboard, at every t.        */
  let drawn = 0, returned = 0;
  for (const e of arm.stockLog) {
    if (e.t > t || e.item !== 'BLOOD') continue;
    if (e.reason === 'ISSUE') drawn++;
    else if (e.reason === 'RETURN') returned += e.d;
  }
  const bloodIssued = Math.max(0, drawn - returned);
  const idx = end ? -1 : Math.max(0, Math.min(arm._bloodAboard.length - 1, Math.round(t / DT)));
  const bloodAboard = end ? 0 : arm._bloodAboard[idx];
  const bloodDestroyed = Math.max(0, bloodIssued - bloodUsed - bloodAboard);
  return {
    allDeaths, sorties, treated, unusable, overtaken,
    bloodIssued, bloodUsed, bloodDestroyed, bloodAboard
  };
}

/* ============================================================= snapshot == */

function commsDownAt(comms, t) {
  return (comms || []).some(w => t >= w.atMin && t < w.atMin + w.durMin);
}

function fleetAt(run, t) {
  const A = run.A;
  const i = Math.max(0, Math.min(run._fleetHist.length - 1, Math.round(t / DT)));
  const snap = run._fleetHist[i];
  return A.drones.map((d, k) => {
    const f = snap[k];
    const airborne = f.s === 'OUTBOUND' || f.s === 'RETURNING';
    const eta = (f.s === 'OUTBOUND' && f.ta != null && f.ta > t) ? +(f.ta - t).toFixed(1) : null;
    return {
      call: d.call, plat: d.platLabel, base: d.base.name, state: f.s,
      eta,
      carrying: f.pk ? PAYLOAD_TABLE[f.pk].short : null,
      target: f.tg != null ? pad3(f.tg) : null,
      sorties: f.n,
      x: airborne ? f.x : d.x, y: airborne ? f.y : d.y,
      type: d.type,
      _rt: f.rt
    };
  });
}

function stockAt(run, t) {
  const A = run.A;
  return A.bases.map(b => {
    const on = Object.assign({}, STOCK_INIT);
    let issued = 0;
    for (const e of A.stockLog) {
      if (e.base !== b.idx || e.t > t) continue;
      on[e.item] += e.d;
      if (e.reason === 'ISSUE') issued++;
    }
    return {
      name: b.name, afloat: b.afloat,
      blood: Math.max(0, on.BLOOD), plasma: Math.max(0, on.PLASMA),
      txa: Math.max(0, on.TXA), tq: Math.max(0, on.TQ_KIT),
      seal: Math.max(0, on.CHEST_SEAL),
      issued, x: b.x, y: b.y
    };
  });
}

function buildFrame(run, t) {
  const A = run.A, B = run.B, C = run.C;
  /* The run's own scenario, not the module's current selection. */
  const ref = run._scn;
  /* Ledger folds use tq, which opens out to the whole record once the run is
     complete — a casualty whose administration finishes a few seconds after
     T+180, and everything finalize() resolves at the horizon, must still be
     counted as resolved on the DONE board. Clock arithmetic keeps t. */
  const tq = t >= ref.durationMin ? Infinity : t;

  const pending = A.proposals.filter(p => p.tRaised <= tq && (p.tActed == null || p.tActed > tq));
  const pendingCas = new Set();
  for (const p of pending) for (const l of p.route) pendingCas.add(l.casId);

  const fleet = fleetAt(run, t);
  const taskOf = new Map();      // casId -> { call, eta }
  for (const f of fleet) {
    if (!f._rt) continue;
    for (const l of f._rt) if (!taskOf.has(l.c)) taskOf.set(l.c, { call: f.call, eta: l.e });
  }

  let admitted = 0, resolvedSurv = 0, dA = 0;
  const openCas = [];
  for (const c of A.cas) {
    if (c.tInjury > t) continue;
    admitted++;
    const resolved = c.tResolved != null && c.tResolved <= tq;
    if (!resolved) { openCas.push(c); continue; }
    if (c.cls === 'IMMEDIATE' || c.cls === 'DELAYED') {
      resolvedSurv++;
      if (c.outcome === 'DIED') dA++;
    }
  }
  let dB = 0;
  for (const c of B.cas) {
    if (c.outcome === 'DIED' && c.tResolved != null && c.tResolved <= tq &&
        (c.cls === 'IMMEDIATE' || c.cls === 'DELAYED')) dB++;
  }
  /* The third arm folds on the same clock as the other two. Nothing is ever
     delivered in it, so its toll is simply the untreated outcome of everyone
     whose deadline has already passed at this minute. */
  let dC = 0, dCall = 0;
  for (const c of C.cas) {
    if (c.outcome !== 'DIED' || c.tResolved == null || c.tResolved > tq) continue;
    dCall++;
    if (c.cls === 'IMMEDIATE' || c.cls === 'DELAYED') dC++;
  }

  const causes = { noLaunchPoint: 0, noResponder: 0, treatedDied: 0, tooFast: 0, busy: 0 };
  for (const c of A.cas) {
    if (c.cause && c.tResolved != null && c.tResolved <= tq) causes[c.cause]++;
  }

  const rows = openCas.map(c => {
    const raw = A._raw.casualties.find(k => k.id === c.id);
    const tRem = c.deadlineMin >= 9000 ? null : c.tInjury + c.deadlineMin - t;
    const task = taskOf.get(c.id);
    const arrival = task && task.eta > t ? task.eta - t : null;
    const escalated = pendingCas.has(c.id);
    const bursts = run._teleT.get(c.id);
    let last = c.tInjury;
    if (bursts) for (const bt of bursts) { if (bt <= t) last = bt; else break; }
    return {
      id: c.id, cid: c.cid, name: c.unit + ' ' + ROLES[raw.role].short,
      site: c.site, unit: c.unit,
      injury: INJURY_LABEL[raw.injury] || raw.injury,
      /* The engine models compensatory reserve, not shock index. There is no
         shock index anywhere in sim.js or optimizer.js, so none is asserted. */
      si: '—',
      needs: raw.needs.map(n => PAYLOAD_TABLE[n].short).join(' + '),
      responder: TIERS[raw.responder].name,
      role: ROLES[raw.role].label,
      cls: c.cls,
      tRem,
      deadlineMin: c.deadlineMin,
      arrival,
      slack: tRem != null && arrival != null ? tRem - arrival : null,
      tasking: escalated ? 'ESCALATED' : (task ? task.call : null),
      prop: escalated ? (pending.find(p => p.route.some(l => l.casId === c.id)) || {}).id ?? null : null,
      reach: c.lpReach,
      staleMin: +Math.max(0, t - last).toFixed(1)
    };
  }).sort((a, b) => (a.tRem == null ? 1e9 : a.tRem) - (b.tRem == null ? 1e9 : b.tRem));

  const stock = stockAt(run, t);
  const airborne = fleet.filter(f => f.state === 'OUTBOUND' || f.state === 'RETURNING').length;

  const feed = [];
  let auditN = 0;
  for (const e of A.audit) if (e.t <= t) { auditN++; feed.push(e); }
  feed.reverse();

  const tA = tally(A, tq, ref.durationMin), tB = tally(B, tq, ref.durationMin);

  const frame = {
    t,
    admitted,
    open: openCas.length,
    inside: rows.filter(r => r.slack != null && r.slack >= 0).length,
    unreachable: rows.filter(r => r.reach === 0 || (r.tRem != null && r.arrival == null && r.tRem < 12)).length,
    notAssertable: rows.filter(r => r.tRem == null).length,
    missed: rows.filter(r => (r.slack != null ? r.slack < 0 : (r.tRem != null && r.arrival == null))).length,

    escalated: A.proposals.filter(p => p.tRaised <= tq).length,
    approved: A.proposals.filter(p => p.state === 'APPROVED' && p.tActed != null && p.tActed <= tq).length,
    lapsed: A.proposals.filter(p => p.state === 'EXPIRED' && p.tActed != null && p.tActed <= tq).length,
    pending,

    rows,
    tightest: rows.find(r => r.tRem != null && r.tRem > 0) || null,

    fleet: fleet.map(f => { const g = Object.assign({}, f); delete g._rt; return g; }),
    stock,
    bloodU: stock.reduce((a, b) => a + b.blood, 0),
    plasmaU: stock.reduce((a, b) => a + b.plasma, 0),
    sitesWithBlood: stock.filter(s => s.blood > 0).length,
    ready: fleet.filter(f => f.state === 'IDLE').length,
    total: fleet.filter(f => f.state !== 'LOST').length,
    airborne,
    sortiesFlown: tA.sorties,
    administered: tA.treated,

    dA, dB, delta: dB - dA,
    /* The third arm, at this same minute. deltaC is what forward delivery on
       a physiological deadline is worth against delivering nothing at all —
       the comparison the two-arm scoreboard could never make. */
    dC, deltaC: dC - dA,
    tC: { allDeaths: dCall, survivableDeaths: dC, sorties: 0 },
    readable: resolvedSurv >= 10,
    resolvedSurv,
    tA, tB,
    causes,

    commsDown: commsDownAt(ref.comms, t),
    auditN,
    feed,
    stream: A.stream.filter(e => e.t <= t).slice().reverse(),
    resolved: admitted - openCas.length,
    pastDeadline: rows.filter(r => r.tRem != null && r.tRem <= 0).length
  };
  return frame;
}

/* snapshot() is called fresh on every 120 ms render and the design caches
   nothing, so the fold is memoised per run on t quantised to the simulation
   step. The map is bounded — playback walks t forward monotonically and would
   otherwise retain 721 frames per run. */
const FRAME_MAX = 96;

function snapshot(run, t) {
  const tt = Math.max(0, Math.min(run._scn.durationMin, t));
  const key = Math.round(tt / DT);
  const cache = run._frames;
  if (cache.has(key)) return cache.get(key);
  const f = buildFrame(run, key * DT);
  cache.set(key, f);
  if (cache.size > FRAME_MAX) cache.delete(cache.keys().next().value);
  return f;
}

/* Pure command-bar helpers. Keeping matching and wall-time arithmetic outside
   the canvas makes every submission path share one deterministic answer and
   lets the browser self-test exercise the run gate without synthetic clicks. */
function universalSearch(records, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return [];
  return (records || []).filter(r => String(r.text || '').toLowerCase().includes(needle))
    .sort((a, b) => String(a.kind).localeCompare(String(b.kind)) ||
      String(a.label).localeCompare(String(b.label))).slice(0, 8);
}

function universalSearchDestination(kind) {
  return kind === 'CASUALTY' ? 'cas' : (kind === 'ASSET' || kind === 'SITE') ? 'map' : null;
}

function searchExecutionState({ running, query, durationMin, elapsedMin, speed }) {
  const q = String(query || '').trim();
  /* The playback clock advances `speed` simulated minutes per wall-clock
     second (speed * 0.12 every 120 ms), so no extra minutes-to-seconds factor
     belongs here. */
  const seconds = Math.max(0, Math.ceil(Math.max(0, durationMin - elapsedMin) / Math.max(1, speed)));
  return { allowed: !running && !!q, blocked: !!running, empty: !q, seconds };
}

/* ================================================================ exports */

const STOCK0 = Object.assign({}, STOCK_INIT);

/* The responder mix, from the engine's own TIER_MIX rather than from a
   sentence typed on a settings panel. It was typed on a settings panel, and
   it said 45/35/20 while sim.js has always said 58/32/10 — a figure nobody
   could have checked without opening the engine, which is exactly the sort of
   number that should never be restated. Now that the responder mix is a war-
   game lever it is also a thing a reader will go and compare, so it reads
   from the table it describes. */
const RESPONDER_MIX = TIER_MIX.map(([k, w]) => ({
  tier: k, name: TIERS[k].name, training: TIERS[k].training, share: w,
  can: TIERS[k].can.slice()
}));
const distFn = dist;
const effRadiusFn = effectiveRadiusKm;

export { buildRun, snapshot, tally, universalSearch, universalSearchDestination, searchExecutionState, WORLD, INJURY_LABEL, STOCK0, SCENARIO_LIST, SCENARIO_DEFAULT, RESPONDER_MIX };
/* Aliased so this module never declares a binding that would shadow the
   engine's own globals of the same name. */
export {
  PAYLOAD_TABLE as PAYLOADS,
  PLATFORM_TABLE as PLATFORMS,
  effRadiusFn as effRadius,
  distFn as dist
};
