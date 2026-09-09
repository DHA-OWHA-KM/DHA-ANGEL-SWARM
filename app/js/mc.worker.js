/* =========================================================================
   MONTE CARLO WORKER — one replication at a time, off the main thread.

   This is the actual simulation, not a surrogate. It loads sim.js and
   optimizer.js verbatim — the same two files the live application runs — so
   a distribution produced here is a distribution of the thing on screen, not
   of a reimplementation that might have drifted from it.

   Two facts about those files made this possible and are worth recording,
   because they are the sort of thing that quietly breaks later:

   1. Neither sim.js nor optimizer.js touches the DOM. Not once. `grep -c
      'document\.'` returns zero for both. They are pure functions over a
      seed, which is why a Monte Carlo harness is a hundred lines rather than
      a rewrite.

   2. optimizer.js has exactly one free global that it does not define
      itself: CALLSIGN, which lives in map.js and is used only to format the
      aircraft callsign written into an audit row. map.js is a rendering
      module and does not belong in a worker, so the table is restated below.
      It is three strings and it affects no arithmetic. If a future edit to
      optimizer.js reaches for something else in map.js, this worker will
      throw on load and the panel will say so rather than quietly reporting
      numbers from a half-loaded engine.

   The worker holds no state between replications. Each message in is a
   complete specification; each message out is a complete result. That makes
   the pool a work queue rather than a partition, so one slow core cannot
   hold up the run.
   ========================================================================= */

/* The one stub. See note 2 above. Values copied from app/js/map.js:13. */
self.CALLSIGN = { HEAVY: 'TRV', LIGHT: 'M25', LONG: 'FVR' };

let loadError = null;
try {
  importScripts('sim.js', 'optimizer.js');
} catch (e) {
  loadError = String(e && e.message || e);
}

const DT = 0.25;                  // simulation step, minutes — matches the app

/* ------------------------------------------------------------------ levers

   A sensitivity sweep varies one thing. Everything else — the scenario, the
   casualty stream, the seed — is held identical, which is only possible
   because createWorld() hands out a private deep copy of the scenario and
   builds the casualty stream before any of these are applied. Mutating
   w.scn after that point changes the force structure without touching who
   gets wounded, when, or how badly. Without that property a sweep would be
   measuring its own noise. */

function applyLever(w, lever, value) {
  const scn = w.scn;
  if (!lever || lever === 'none') return;

  if (lever === 'fleet') {
    /* Scale every airframe count at every launch point. Rounded, floored at
       one, so a 0.25x sweep point does not silently produce a base with no
       aircraft and a different failure mode than the one being measured. */
    scn.bases = scn.bases.map(b => Object.assign({}, b, {
      fleet: b.fleet.map(([type, n]) => [type, Math.max(1, Math.round(n * value))])
    }));
    return;
  }

  if (lever === 'launch') {
    /* Fewer launch points, same total force posture per point. Bases are
       taken in scenario order, which is the order they were sited in. */
    const k = Math.max(1, Math.min(scn.bases.length, Math.round(value)));
    scn.bases = scn.bases.slice(0, k);
    return;
  }

  if (lever === 'triage') {
    /* Scale both START error rates about the measured ones. The rates live on
       PARAMS rather than on the scenario, so this is the one lever that
       writes outside `scn` — and it is set per replication, before the world
       is built, so `perceivedClass()` memoises against the right value.

       Under-triage is 1 - START_SENSITIVITY, so scaling the ERROR means
       moving sensitivity the other way. Both are clamped: an error rate
       cannot go below zero or above one, and a 4x sweep point on 14% would
       otherwise leave the band. */
    const clamp = (x) => Math.max(0, Math.min(1, x));
    PARAMS.START_SENSITIVITY = clamp(1 - (1 - 0.90) * value);   /* 10% under at 1.0 */
    PARAMS.START_OVERTRIAGE  = clamp(0.14 * value);             /* 14% over  at 1.0 */
    return;
  }

  if (lever === 'medic') {
    /* THE ONE LEVER THAT IS NOT ABOUT AIRCRAFT.

       `value` is the fraction of responders who are TCCC Tier 3 -- a combat
       medic or corpsman -- and 0.10 is the force as it stands. Blood, plasma
       and TXA all carry tier: 'T3' in the payload table, so a casualty whose
       nearest responder is a buddy or a combat lifesaver cannot receive any
       of the three no matter how fast an airframe reaches them. A fleet sweep
       from seven airframes to twenty-one moves the "nobody on scene could
       administer" death count by nothing measurable; this is the only lever
       on the screen that touches it.

       It writes to two places, and both are deliberate. scn.tierMix is set so
       anything that later inspects the scenario sees the mix that actually
       flew. The stream is then re-read: every casualty already carries the
       uniform its tier was drawn on, so reassigning from that same uniform
       against the new mix moves exactly the casualties whose draw falls in
       the band that shifted and leaves every other one alone. Nobody is
       wounded differently, nobody is wounded at a different minute, nobody's
       deadline moves -- only who is kneeling beside them. That is the same
       common-random-numbers discipline the rest of this file depends on, and
       it is why the 0.10 point of this sweep reproduces an unlevered run
       rather than merely resembling one.

       The stream is shared by both arms -- optimizer.js clones out of
       world.stream at ingest -- so this reaches ANGEL SWARM and the control
       arm identically, like every lever above it. */
    const mix = tierMixFor(value);
    scn.tierMix = mix;
    for (const c of w.stream) {
      if (c.uResponder == null) continue;   /* pre-uniform stream; leave it be */
      c.responder = weightedAt(c.uResponder, mix);
    }
    return;
  }

  if (lever === 'comms') {
    /* Lengthen or shorten every scheduled datalink outage. value is a
       multiplier on duration, so 0 is a clean electromagnetic environment
       and 4 is four times the scenario's own jamming window. The window
       start times are untouched: this varies how long the link is gone, not
       when it goes. */
    scn.comms = (scn.comms || []).map(c => Object.assign({}, c, {
      durMin: c.durMin * value
    })).filter(c => c.durMin > 0);
    return;
  }
}

/* --------------------------------------------------------------- one rep */

/* Both arms, one seed, one battle.

   The casualty stream is generated once inside createWorld and shared by
   both arms — that is the strong form of common random numbers, and it is
   what makes this a paired comparison. Each arm's own stochastic draws (wind
   at altitude, attrition rolls, receiver performance) start from the same
   seed when `crn` is set; they desynchronise as the arms diverge, because
   the arms consume draws at different rates. That is unavoidable and it is
   the weaker half of the pairing. The strong half — the identical battle —
   is where nearly all the variance lives, and the measured ratio of unpaired
   to paired standard error says so. */

function replicate(cfg) {
  const t0 = performance.now();

  /* The triage lever writes to PARAMS rather than to the scenario, so the
     previous values have to be put back before this function returns — the
     worker is long-lived and runs every point of a sweep in turn. */
  const _sens = PARAMS.START_SENSITIVITY, _over = PARAMS.START_OVERTRIAGE;

  /* And it only bites in realistic mode: perceivedClass() returns the true
     category unless the arm is realistic, which is the guard that protects
     the headline result. Sweeping triage accuracy in fair mode would draw a
     flat line and invite the reader to conclude triage does not matter,
     which is not what was measured. Force it for this lever only. */
  const mode = (cfg.lever === 'triage') ? 'realistic' : cfg.mode;

  const w = createWorld(cfg.scenario, cfg.seed);
  applyLever(w, cfg.lever, cfg.value);

  const A = createArm(w, 'A', 'ANGEL', mode);
  A.telementor = !!cfg.telementor;
  A.observedFlightVariability = !!cfg.observedFlightVariability;
  A.hvaWeight = cfg.hvaWeight || 1.6;
  const B = createArm(w, 'B', 'CURRENT', mode);
  B.telementor = false;
  B.observedFlightVariability = !!cfg.observedFlightVariability;

  const rA = makeRNG(cfg.seed * 3 + 1);
  const rB = makeRNG(cfg.crn === false ? cfg.seed * 3 + 2 : cfg.seed * 3 + 1);

  const T = w.scn.durationMin;
  for (let t = 0; t <= T; t += DT) {
    stepArm(A, w, t, DT, rA);
    stepArm(B, w, t, DT, rB);
  }
  finalize(A, T);
  finalize(B, T);

  const a = A.stats, b = B.stats;
  PARAMS.START_SENSITIVITY = _sens; PARAMS.START_OVERTRIAGE = _over;
  return {
    scenario: cfg.scenario,
    lever: cfg.lever,
    seed: cfg.seed,
    value: cfg.value == null ? null : cfg.value,
    observedFlightVariability: !!cfg.observedFlightVariability,
    flightVariabilityProfile: (A.observedFlightVariability && B.observedFlightVariability)
      ? OBSERVED_FLIGHT_VARIABILITY.id : null,
    casualties: w.stream.length,
    /* survivableDeaths is the headline metric everywhere else in this
       application: deaths among casualties whose wounds were survivable with
       timely intervention. It excludes MINIMAL, who live regardless, and
       EXPECTANT, who do not. Total deaths is carried alongside so nobody has
       to take the filtered figure on trust. */
    a: a.survivableDeaths, b: b.survivableDeaths,
    aTotal: a.died, bTotal: b.died,
    aSaved: a.survivableSaved, bSaved: b.survivableSaved,
    survivable: a.survivableTotal,
    sortiesA: a.sorties, sortiesB: b.sorties,
    wastedA: a.wastedSorties, wastedB: b.wastedSorties,
    bloodA: a.bloodWasted, bloodB: b.bloodWasted,
    ms: performance.now() - t0
  };
}

/* ------------------------------------------------------------- protocol */

self.onmessage = function (ev) {
  const m = ev.data;
  if (m.type === 'hello') {
    self.postMessage({ type: 'hello', ok: !loadError, error: loadError,
      engine: typeof createWorld === 'function' && typeof stepArm === 'function' });
    return;
  }
  if (m.type === 'run') {
    if (loadError) {
      self.postMessage({ type: 'error', id: m.id, error: loadError });
      return;
    }
    try {
      const r = replicate(m.cfg);
      r.id = m.id;
      self.postMessage({ type: 'result', result: r });
    } catch (e) {
      self.postMessage({ type: 'error', id: m.id, error: String(e && e.message || e) });
    }
  }
};
