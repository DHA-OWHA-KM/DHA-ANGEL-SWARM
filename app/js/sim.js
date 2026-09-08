/* ============================================================================
   ANGEL SWARM — Simulation Engine
   Autonomous medical swarm tasking for the battlefield.
   NDIA Global Defense Hackathon 2026 · DHA/MHS Combat Support

   All physiological and platform parameters are traceable to published
   sources. See PARAMS.provenance for the citation attached to each value.
   ========================================================================== */

/* ---------------------------------------------------------------- RNG ---- */
/* Deterministic seeded PRNG (mulberry32) so both arms of the A/B run on an
   identical casualty stream and any run is exactly reproducible. */
function makeRNG(seed) {
  let a = seed >>> 0;
  const r = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + r() * (hi - lo);
  r.int = (lo, hi) => Math.floor(r.range(lo, hi + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  // Box-Muller normal
  r.normal = (mu, sd) => {
    const u = Math.max(r(), 1e-9), v = Math.max(r(), 1e-9);
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  r.weighted = (pairs) => { // [[item, weight], ...]
    let total = 0; for (const p of pairs) total += p[1];
    let x = r() * total;
    for (const p of pairs) { x -= p[1]; if (x <= 0) return p[0]; }
    return pairs[pairs.length - 1][0];
  };
  return r;
}

/* ------------------------------------------------------------- PARAMS ---- */
const PARAMS = {
  // Mortality odds multiplier per minute of delay to definitive hemorrhage
  // control / transfusion. General case.
  ODDS_PER_MIN: 1.020,
  // Penetrating torso / hemorrhagic shock subclass (steeper).
  ODDS_PER_MIN_PENETRATING: 1.11,

  // Compensatory Reserve Measurement: predictive lead time before
  // decompensation. Lab: 18.3 +/- 7.94 min. Field: 16-25 min.
  CRM_LEAD_MEAN: 18.3,
  CRM_LEAD_SD: 7.94,
  // CRM sensor noise (the wearable is not a perfect oracle).
  CRM_NOISE_SD: 6.0,
  // CRM display bands (0-100 scale).
  CRM_RED: 40, CRM_YELLOW: 70,

  // Tranexamic acid: hard 3-hour window. Beyond it, RR 1.44 -- net harm.
  TXA_WINDOW_MIN: 180,

  // Blood cold chain: must stay 1-10 C.
  COLD_MIN_C: 1, COLD_MAX_C: 10,

  /* START triage performance, from METASTART — the actual pooled
     meta-analysis of START accuracy (Franc JM et al., Prehosp Disaster Med
     2022;37(1):106-116): over-triage 14%, under-triage 10%.

     THE PREVIOUS VALUES WERE WRONG TWICE OVER, and one of the two defects
     needed no literature search to see. perceivedClass() downgrades an
     IMMEDIATE casualty when r() > START_SENSITIVITY, so 0.578 is a 42.2%
     under-triage rate — while the provenance string on the sibling constant
     claimed 13.6%. The model under-triaged at three times the rate its own
     cited source stated, and the two lines contradicted each other on screen.

     They were also mis-sourced. 26.0/13.6 came from medical undergraduates
     triaging simulated patients, described here as a pooled meta-analysis of
     ~360k patients, which it is not; 57.8/93.6 were RELATIVE figures from a
     head-to-head comparison, not absolute accuracy.

     Effect: perceivedClass() returns early unless arm.mode === 'realistic'
     and the reference run is 'fair', so the headline is untouched. Realistic
     mode narrows, because the old values handicapped the baseline arm — which
     depends on triage — far harder than the ANGEL SWARM arm, which depends on
     deadlines. */
  START_SENSITIVITY: 0.90,
  START_OVERTRIAGE: 0.14,

  /* A PROTOTYPE ASSUMPTION, not a doctrinal figure. No publication gives a
     full LSCO triage distribution — Emergency War Surgery, MEDCoE Mass
     Casualty and Triage, the 68W triage chapter, Army task 081-000-0055,
     USMC FMSO and FM/ATP 4-02 were all searched. The only real anchor is
     Emergency War Surgery: "It is anticipated that 10%-20% of casualties
     presenting to a surgical unit will be in the emergent category."

     This is an external-validity label rather than a modelling error: both
     arms draw the same casualty stream from the same seed, so the
     distribution cannot bias the comparison either way. */
  CLASS_PRIORS: [['IMMEDIATE', 0.10], ['DELAYED', 0.30], ['MINIMAL', 0.52], ['EXPECTANT', 0.08]],

  // Buddy (untrained) tourniquet application success.
  BUDDY_TQ_SUCCESS: 0.62,
  // Telementoring / AR guidance uplift on buddy-performed procedures.
  TELEMENTOR_UPLIFT: 0.18,

  provenance: {
    ODDS_PER_MIN: 'aOR 1.020/min for 30-day mortality, n=1,504 propensity-matched (J Trauma 2023)',
    ODDS_PER_MIN_PENETRATING: 'OR 1.11/min (95% CI 1.04-1.19) in-hospital mortality, penetrating trauma with prehospital blood -- Duchesne J et al., J Trauma Acute Care Surg 2024 (Tulane)',
    CRM_LEAD_MEAN: 'Compensatory Reserve Measurement lead time 18.30 +/- 7.94 min -- Ortiz R, Gonzalez JM, ... Snider EJ, Front Bioeng Biotechnol 2026;14:1756626. The 16:35 and 25:44 figures often quoted as a "16-25 min field range" are TWO INDIVIDUAL CASUALTIES at the 2024 Army Warfighter Expeditionary Experiment, not a cohort range',
    TXA_WINDOW_MIN: 'TXA beyond 3h: RR 1.44 -- CRASH-2 exploratory subgroup analysis, Roberts I et al., Lancet 2011;377(9771):1096-1101 (NOT the 2010 primary paper). The authors\' own wording: treatment given after 3 h "seemed to increase the risk of death due to bleeding." Exploratory subgroup finding; the 180-minute constant is correct',
    COLD_MIN_C: 'JTS CPG, Aerial Delivery of Fresh and Stored Blood Products, 1 Dec 2025, verbatim: "Both WB and pRBCs must be stored at 1 C to 10 C to maintain viability." This CPG is hosted outside the JTS CPG ZIP and carries NO CPG ID -- do not invent one',
    START_SENSITIVITY: 'METASTART pooled meta-analysis of START accuracy -- Franc JM et al., Prehosp Disaster Med 2022;37(1):106-116: under-triage 10%',
    START_OVERTRIAGE: 'METASTART, same source: over-triage 14%',
    CLASS_PRIORS: 'PROTOTYPE ASSUMPTION, not doctrine. No publication gives a full LSCO triage distribution. Anchored on Emergency War Surgery: 10-20% of casualties presenting to a surgical unit are emergent. Both arms draw the same stream from the same seed, so this cannot bias the comparison',
    BUDDY_TQ_SUCCESS: 'Tourniquet application 21-46% technically flawed across applier groups, EMS INCLUDED -- Mokhtari AK et al., Eur J Trauma Emerg Surg 2022;48(5):4255-4265',
    TELEMENTOR_UPLIFT: 'AR telementoring improved procedural score p=0.01 at no time cost, largest benefit in low-experience operators (npj Digital Medicine 2020;3:75)'
  }
};

/* ------------------------------------------------------- RESPONDER TIER -- */
/* TCCC tiered training. This is the receiver-capability constraint: you
   cannot deliver a payload nobody present is trained to administer. */
const TIERS = {
  T1: { name: 'ASM (buddy)',        training: '6-8 hrs',  can: ['TQ_KIT'] },
  T2: { name: 'CLS',                training: '40 hrs',   can: ['TQ_KIT', 'CHEST_SEAL'] },
  T3: { name: 'Combat Medic (68W)', training: '8-10 days', can: ['TQ_KIT', 'CHEST_SEAL', 'TXA', 'PLASMA', 'BLOOD'] }
};
// Doctrine requires at least one CLS per squad; medics are far scarcer.
const TIER_MIX = [['T1', 0.58], ['T2', 0.32], ['T3', 0.10]];

/* THIS IS THE ONE BUCKET AIRCRAFT CANNOT TOUCH, so it has to be movable.
   A fleet sweep across 7 to 21 airframes moves the "nobody on scene could
   administer" death count by nothing at all -- 12.02 at seven, 12.02 at
   twenty-one, identical to two decimal places -- because blood, plasma and
   TXA are all tier-3 skills and no quantity of lift changes who is kneeling
   next to the casualty. The mix above was a hard constant, which meant the
   largest single cause of death in this model was the one thing a commander
   could not war-game. These two helpers make it a variable.

   tierMixFor(t3) holds the T1:T2 ratio fixed and rescales both against the
   remainder, so raising the medic fraction converts buddies and combat
   lifesavers into medics in the proportion the force already has them,
   rather than pretending one of the two lower tiers is untouched. The
   arithmetic is written as 0.58 * (rest / 0.90) rather than
   rest * (0.58 / 0.90) for a dull but load-bearing reason: at t3 = 0.10 the
   first form returns 0.58 and 0.32 EXACTLY in IEEE754 and the second returns
   0.32000000000000006, and a mix that is not bit-identical to TIER_MIX at
   the baseline point would put a casualty sitting exactly on a tier boundary
   into a different tier and move the reference result. */
function tierMixFor(t3) {
  const f3 = Math.max(0, Math.min(1, t3));
  const rest = 1 - f3, k = rest / 0.90;
  return [['T1', 0.58 * k], ['T2', 0.32 * k], ['T3', f3]];
}

/* The same arithmetic rng.weighted() does, but against a uniform handed in
   rather than one drawn on the spot. Splitting the draw from the lookup is
   what lets a responder tier be REASSIGNED after the casualty stream is
   built: every casualty carries the uniform it was assigned on, so a new mix
   re-reads the same draw and only the casualties whose uniform falls inside
   the band that moved change tier. That is common random numbers applied to
   the responder population, and it is why a medic sweep measures the medics
   and not its own reshuffling. */
function weightedAt(u, pairs) {
  let total = 0; for (const p of pairs) total += p[1];
  let x = u * total;
  for (const p of pairs) { x -= p[1]; if (x <= 0) return p[0]; }
  return pairs[pairs.length - 1][0];
}

/* ------------------------------------------------------------ PAYLOADS -- */
const PAYLOADS = {
  BLOOD:      { key: 'BLOOD',      label: 'Whole Blood (1 u)', kg: 1.45, coldChain: true,  tier: 'T3', cls8: 'VIIIB',
                note: '1 unit LTOWB in Golden Hour One container, 48h hold at 1-10 C' },
  PLASMA:     { key: 'PLASMA',     label: 'Freeze-Dried Plasma', kg: 0.62, coldChain: false, tier: 'T3', cls8: 'VIIIB',
                note: 'EZPLAZ / French FDP -- no cold chain, reconstitutes 1-5 min' },
  TXA:        { key: 'TXA',        label: 'TXA 2g',  kg: 0.06, coldChain: false, tier: 'T3', cls8: 'VIIIA',
                note: 'Hard 3-hour window from injury' },
  TQ_KIT:     { key: 'TQ_KIT',     label: 'Hemorrhage Kit', kg: 0.34, coldChain: false, tier: 'T1', cls8: 'VIIIA',
                note: 'CAT Gen 7 tourniquet (76g) + hemostatic gauze + pressure dressing' },
  CHEST_SEAL: { key: 'CHEST_SEAL', label: 'Chest Seal / NPA', kg: 0.12, coldChain: false, tier: 'T2', cls8: 'VIIIA',
                note: 'Vented chest seal, nasopharyngeal airway' }
};

/* ----------------------------------------------------------- PLATFORMS -- */
const PLATFORMS = {
  HEAVY: { key: 'HEAVY', label: 'TRV-150C', speedKmh: 92, radiusKm: 12, maxRadiusKm: 34, payloadKg: 30, slots: 10,
           note: '150 lb payload class, ~12 km combat radius AT FULL LOAD. USMC program of record; Army JTAARS award May 2026.' },
  LIGHT: { key: 'LIGHT', label: 'Soaring M25', speedKmh: 60, radiusKm: 5, maxRadiusKm: 14, payloadKg: 6.8, slots: 4,
           note: '25 lb payload, 10 km round trip at load. Flown by 44th Medical Brigade, Project Hermes, April 2026.' },
  LONG:  { key: 'LONG',  label: 'FVR-90 (Crimson)', speedKmh: 83, radiusKm: 90, maxRadiusKm: 200, payloadKg: 9.1, slots: 8,
           note: 'Hybrid VTOL, 200+ km radius, up to 8 units fresh whole blood, chute drop from 100 ft AGL.' }
};

/* Combat radius is quoted at FULL payload. Medical payloads are a small
   fraction of capacity (a unit of blood in its container is 1.45 kg against a
   30 kg capacity), so usable radius is substantially greater. Interpolate
   between the quoted full-load radius and the platform's ferry radius. */
function effectiveRadiusKm(plat, loadKg) {
  const frac = Math.max(0, Math.min(1, loadKg / plat.payloadKg));
  return plat.maxRadiusKm - (plat.maxRadiusKm - plat.radiusKm) * frac;
}

/* Class VIII stock held forward — blood and plasma are VIIIB, the rest VIIIA
   (DoDI 5101.15). Blood is the binding constraint: a
   peer-reviewed Monte Carlo model (J Trauma Acute Care Surg, 15 May 2026)
   found conventional resupply to a Forward Resuscitative Surgical Detachment
   fails in a median of 2 days once casualties exceed 30/day. Every unit spent
   on a casualty who cannot receive it is a unit unavailable to one who can. */
const STOCK_INIT   = { BLOOD: 5, PLASMA: 4, TXA: 9,  TQ_KIT: 20, CHEST_SEAL: 9 };
const STOCK_RESUP  = { BLOOD: 2, PLASMA: 2, TXA: 4,  TQ_KIT: 10, CHEST_SEAL: 4 };
const RESUPPLY_EVERY_MIN = 45;
const STOCK_CAP    = { BLOOD: 8, PLASMA: 7, TXA: 14, TQ_KIT: 30, CHEST_SEAL: 14 };


/* ------------------------------------------------------------ DUTY ROLE --
   A commander does not fight an undifferentiated pool of casualties. Some of
   the people on the ground carry a capability the mission cannot replace
   inside the fight — the JTAC who is holding the fires plan, the only EOD
   technician on the objective, the single linguist on a partnered operation.
   Designating those roles is a command decision under METT-TC, made before
   contact and written down. ANGEL SWARM is the first tasking layer that has
   anywhere to put that decision; a dispatcher sorting START cards does not.
   ------------------------------------------------------------------------ */
const ROLES = {
  RIFLEMAN:      { label: 'Rifleman',        short: 'RFLMN' },
  TEAM_LEADER:   { label: 'Team leader',     short: 'TL' },
  COMBAT_MEDIC:  { label: 'Combat medic',    short: 'MEDIC' },
  JTAC:          { label: 'JTAC',            short: 'JTAC' },
  EOD_TECH:      { label: 'EOD technician',  short: 'EOD' },
  SIGNALS:       { label: 'Signals / RTO',   short: 'SIG' },
  UAS_OPERATOR:  { label: 'UAS operator',    short: 'UAS' },
  ENGINEER:      { label: 'Combat engineer', short: 'ENGR' },
  LINGUIST:      { label: 'Linguist',        short: 'LING' },
  AIRCREW:       { label: 'Aircrew',         short: 'AIR' },
  SNIPER:        { label: 'Sniper / recon',  short: 'RECON' }
};
const ROLE_MIX = [
  ['RIFLEMAN', 0.40], ['TEAM_LEADER', 0.13], ['ENGINEER', 0.09], ['SIGNALS', 0.08],
  ['COMBAT_MEDIC', 0.06], ['UAS_OPERATOR', 0.06], ['JTAC', 0.05], ['SNIPER', 0.05],
  ['EOD_TECH', 0.04], ['AIRCREW', 0.02], ['LINGUIST', 0.02]
];


/* --------------------------------------------------------------- UNITS --
   Casualties belong to a manoeuvre element. A commander does not ask "how is
   casualty 47" — he asks "how is 2nd platoon". Units are seeded from the
   scenario's casualty clusters so a unit is a real piece of ground.
   ------------------------------------------------------------------------ */
const UNIT_NAMES = [
  'A/1-27 IN', 'B/1-27 IN', 'C/1-27 IN', 'D/1-27 IN',
  'SCOUT PLT', 'MORTAR SEC', 'ENG PLT', 'HHC SLICE'
];
function unitsFor(scn) {
  return scn.clusters.map((c, i) => ({
    key: 'U' + i, name: UNIT_NAMES[i % UNIT_NAMES.length],
    x: c.x, y: c.y, r: c.r,
    assigned: 34 + ((i * 7) % 11)          // assigned strength on the ground
  }));
}

/* ---------------------------------------------------------- COMMAND UAV -
   One high-endurance airframe orbiting the sector as the C2 relay and master
   data collector: it is what turns individual wearables into a picture. Its
   sensor footprint is where telemetry is live; outside it, the last report
   ages and the commander is reasoning from history. Polling a unit tasks the
   orbit to sweep it and refresh the picture on demand.
   ------------------------------------------------------------------------ */
const CMDUAV = {
  label: 'MQ-1C ER (C2/ISR relay)',
  callsign: 'OVERWATCH',
  orbitPeriodMin: 26,          // one lap of the racetrack
  footprintKm: 26,             // radius of live-telemetry coverage
  pollSweepMin: 2.5,           // time to slew and complete a commanded poll
  note: 'Modelled on a Gray Eagle-class endurance airframe carrying a comms relay ' +
        'and wide-area sensor. It carries no payload and flies no casualty sorties; ' +
        'it is the data path.'
};
function cmdUavPos(scn, t) {
  // Racetrack orbit around the centre of the area of operations.
  const ph = (t % CMDUAV.orbitPeriodMin) / CMDUAV.orbitPeriodMin * Math.PI * 2;
  const ax = scn.widthKm * 0.30, by = scn.heightKm * 0.32;
  return { x: scn.widthKm / 2 + Math.cos(ph) * ax,
           y: scn.heightKm / 2 + Math.sin(ph) * by * 0.9, ph };
}


/* ========================================================================== */
/*  THEATERS                                                                  */
/*  A combatant command is not a map sheet. PACOM spans roughly half the       */
/*  planet; a brigade fight inside it is a pinhead. The commander opens on the */
/*  theater, sees where forces are committed, and drills into one joint        */
/*  operations area. Each JOA below resolves to a tactical scenario.           */
/* ========================================================================== */
const THEATERS = {
  PACOM: {
    key: 'PACOM',
    name: 'PACOM',
    label: 'Indo-Pacific',
    note: '36 nations · 52% of the earth\u2019s surface · 14 time zones. More than half the world\u2019s ' +
          'population and seven of the ten largest armies sit inside this AOR. Strategic evacuation from ' +
          'the first island chain is 72+ hours; there is no organic Role 3 forward.',
    lon0: 92, lon1: 178, lat0: -18, lat1: 52,
    hq: { t: 'PACOM HQ — CAMP H.M. SMITH', lon: 176, lat: 21.3 },
    joas: [
      { key: 'CORAL',   name: 'JOA CORAL',   lon: 122.4, lat: 21.6, scenario: 'PACOM_CORAL',
        force: '3d Marine Littoral Regiment (Rein)', posture: 'DECISIVE',
        note: 'First island chain, distributed maritime operations across an archipelago. Blue-water gaps ' +
              'no ground vehicle can cross.' },
      { key: 'BASALT',  name: 'JOA BASALT',  lon: 127.4, lat: 34.2, scenario: 'PACOM_BASALT',
        force: '2d Infantry Division (Fwd)', posture: 'SHAPING',
        note: 'Peninsular land corridor, dense artillery threat, short evacuation distances but heavy volume.' },
      { key: 'MARINER', name: 'JOA MARINER', lon: 145.2, lat: 14.6, scenario: 'PACOM_MARINER',
        force: 'Joint Task Force MARIANAS', posture: 'SUSTAINMENT',
        note: 'Rear-area island basing. Long over-water transits between dispersed airfields.' },
      { key: 'TIMBER',  name: 'JOA TIMBER',  lon: 133.0, lat: -4.2, scenario: 'PACOM_TIMBER',
        force: 'Combined JTF SOUTHERN APPROACH', posture: 'ECONOMY OF FORCE',
        note: 'Partnered operations across the southern approaches. Sparse infrastructure, long lines.' }
    ]
  },
  EUCOM: {
    key: 'EUCOM',
    name: 'EUCOM',
    label: 'Europe',
    note: '51 nations from the North Cape to the Caucasus. A contiguous land front under persistent FPV ' +
          'observation: medics cannot move and ground evacuation vehicles are actively targeted.',
    lon0: 2, lon1: 46, lat0: 33, lat1: 72,
    hq: { t: 'EUCOM HQ — PATCH BARRACKS', lon: 9.1, lat: 48.7 },
    joas: [
      { key: 'GRANITE', name: 'JOA GRANITE', lon: 33.5, lat: 48.6, scenario: 'EUCOM_GRANITE',
        force: '2d Brigade Combat Team', posture: 'DECISIVE',
        note: 'Contested land corridor. Dense casualties, short distances, high attrition on ground evacuation.' },
      { key: 'AMBER',   name: 'JOA AMBER',   lon: 23.4, lat: 54.4, scenario: 'EUCOM_AMBER',
        force: 'Multinational Division North-East', posture: 'SHAPING',
        note: 'The Suwalki corridor. Narrow frontage, both flanks exposed, counter-battery everywhere.' },
      { key: 'FJORD',   name: 'JOA FJORD',   lon: 12.5, lat: 66.0, scenario: 'EUCOM_FJORD',
        force: 'Marine Rotational Force Europe', posture: 'ECONOMY OF FORCE',
        note: 'High-latitude dispersed operations. Cold-chain margins are wider; distances are not.' }
    ]
  }
};

/* ---------------------------------------------------------- SCENARIOS --- */
const SCENARIOS = {
  PACOM_CORAL: {
    key: 'PACOM_CORAL', theater: 'PACOM', joa: 'CORAL',
    name: 'JOA CORAL — First Island Chain',
    blurb: 'Distributed maritime operations. Casualties spread across islands separated by open water. ' +
           'No organic Role 3 in the first island chain; strategic evacuation is 72+ hours out. ' +
           'Long transits, few launch points, blue-water gaps that ground vehicles cannot cross. ' +
           'One reinforced battalion sector over 3 hours — a slice of a theatre-scale problem.',
    widthKm: 92, heightKm: 118, land: 'archipelago', terrainSeed: 7731,
    islands: [
      { x: 27, y: 25, r: 25, h: 215, sx: 0.86, sy: 1.15, name: 'NORTH ISLET' },
      { x: 77, y: 21, r: 15, h: 155, sx: 0.72, sy: 1.5, name: 'EAST SPIT' },
      { x: 50, y: 65, r: 28, h: 265, sx: 1.15, sy: 0.82, name: 'CENTRAL KEY' },
      { x: 27, y: 99, r: 24, h: 205, sx: 0.9, sy: 1.05, name: 'SOUTH REEF' },
      { x: 62, y: 116, r: 9, h: 90, sx: 1.3, sy: 0.9 },
      { x: 8, y: 62, r: 7, h: 70 }
    ],
    bases: [
      { name: 'FARP ALPHA', x: 27, y: 25, fleet: [['LIGHT',1],['HEAVY',1]] },
      { name: 'LHA BOXER',  x: 68, y: 84, fleet: [['HEAVY',2],['LONG',1]], afloat: true },
      { name: 'FARP BRAVO', x: 27, y: 99, fleet: [['LIGHT',1],['HEAVY',1]] }
    ],
    threats: [
      { x: 68, y: 44, r: 17, lossPerMin: 0.009, label: 'A2/AD ENVELOPE' },
      { x: 56, y: 100, r: 14, lossPerMin: 0.006, label: 'C-UAS PICKET' }
    ],
    clusters: [ {x:27,y:25,r:12},{x:50,y:65,r:15},{x:27,y:99,r:12},{x:77,y:21,r:7} ],
    aor: 'JOA CORAL', gridZone: '51Q', hostileBearing: 'EAST',
    friendly: 'BLUE — 3d MARINE LITTORAL REGIMENT (REIN)',
    places: [
      { name: 'PHILIPPINE SEA',   x: 78, y: 62, kind: 'sea',    size: 15 },
      { name: 'LUZON STRAIT',     x: 50, y: 6,  kind: 'sea',    size: 12 },
      { name: 'BASHI CHANNEL',    x: 14, y: 55, kind: 'sea',    size: 11 },
      { name: 'CORAL PASSAGE',    x: 40, y: 43, kind: 'strait', size: 10 },
      { name: 'SIBUYAN SHELF',    x: 62, y: 104, kind: 'sea',   size: 10 }
    ],
    boundary: { label: 'MARITIME CLAIM LINE — DISPUTED',
                pts: [[92,8],[80,26],[74,48],[78,72],[70,96],[74,118]] },
    durationMin: 180,
    baseRatePerMin: 0.34,
    mascalEvents: [ {atMin: 18, n: 13}, {atMin: 62, n: 18}, {atMin: 116, n: 16}, {atMin: 154, n: 12} ],
    comms: [ {atMin: 88, durMin: 12, label: 'SATCOM DENIED'} ]
  },

  EUCOM_GRANITE: {
    key: 'EUCOM_GRANITE', theater: 'EUCOM', joa: 'GRANITE',
    name: 'JOA GRANITE — Contested Land Corridor',
    blurb: 'Contiguous land front under persistent FPV drone observation. Medics cannot move; ground ' +
           'evacuation vehicles are actively targeted (428 documented attacks on medical evacuation ' +
           'vehicles, Feb 2022 - Apr 2025). One brigade sector over 3 hours — dense casualties, ' +
           'short distances, high attrition.',
    widthKm: 86, heightKm: 116, land: 'continuous', terrainSeed: 3319, islands: [],
    bases: [
      { name: 'BSA NORTH',  x: 38, y: 20, fleet: [['LIGHT',1],['HEAVY',1]] },
      { name: 'BSA CENTER', x: 32, y: 58, fleet: [['HEAVY',2],['LONG',1]] },
      { name: 'BSA SOUTH',  x: 40, y: 96, fleet: [['LIGHT',1],['HEAVY',1]] }
    ],
    threats: [
      { x: 66, y: 30, r: 15, lossPerMin: 0.006, label: 'FPV SATURATION ZONE' },
      { x: 68, y: 86, r: 14, lossPerMin: 0.005, label: 'COUNTER-BATTERY / EW' }
    ],
    clusters: [ {x:60,y:24,r:12},{x:62,y:58,r:13},{x:58,y:92,r:12},{x:48,y:46,r:10} ],
    aor: 'JOA GRANITE', gridZone: '35U', hostileBearing: 'EAST',
    friendly: 'BLUE — 2d BRIGADE COMBAT TEAM',
    places: [
      { name: 'FRIENDLY REAR',        x: 14, y: 20, kind: 'land',  size: 12 },
      { name: 'BRIGADE SUPPORT AREA', x: 16, y: 58, kind: 'land',  size: 10 },
      { name: 'CONTESTED CORRIDOR',   x: 56, y: 42, kind: 'land',  size: 13 },
      { name: 'HOSTILE REAR',         x: 80, y: 76, kind: 'land',  size: 12 },
      { name: 'NORTHERN FLANK',       x: 30, y: 6,  kind: 'land',  size: 10 }
    ],
    boundary: { label: 'FLOT — FORWARD LINE OF OWN TROOPS', ticks: true,
                pts: [[72,0],[68,16],[71,32],[66,48],[69,64],[64,80],[68,96],[63,116]] },
    durationMin: 180,
    baseRatePerMin: 0.45,
    mascalEvents: [ {atMin: 14, n: 15}, {atMin: 54, n: 21}, {atMin: 104, n: 24}, {atMin: 150, n: 17} ],
    comms: [ {atMin: 60, durMin: 15, label: 'EW JAMMING — DATALINK DEGRADED'} ]
  }
};



/* The remaining joint operations areas are the same two terrain engines with
   different geometry, force laydown, threat picture and casualty tempo — a
   brigade fight is a brigade fight; what changes is the ground and the enemy. */
function joaVariant(base, over) {
  const scn = JSON.parse(JSON.stringify(SCENARIOS[base]));
  Object.assign(scn, over);
  return scn;
}
SCENARIOS.PACOM_BASALT = joaVariant('EUCOM_GRANITE', {
  key: 'PACOM_BASALT', theater: 'PACOM', joa: 'BASALT',
  name: 'JOA BASALT — Peninsular Corridor',
  blurb: 'Contiguous peninsular front under massed indirect fire. Short evacuation distances, very high ' +
         'casualty volume, and a road network the enemy has ranged.',
  widthKm: 78, heightKm: 104, terrainSeed: 5501,
  aor: 'JOA BASALT', gridZone: '52S', friendly: 'BLUE — 2d INFANTRY DIVISION (FWD)',
  bases: [ { name: 'BSA HAWK', x: 30, y: 18, fleet: [['LIGHT',1],['HEAVY',1]] },
           { name: 'BSA TIGER', x: 26, y: 54, fleet: [['HEAVY',2],['LONG',1]] },
           { name: 'BSA EAGLE', x: 32, y: 88, fleet: [['LIGHT',1],['HEAVY',1]] } ],
  threats: [ { x: 60, y: 26, r: 16, lossPerMin: 0.007, label: 'MASSED TUBE ARTILLERY' },
             { x: 58, y: 80, r: 15, lossPerMin: 0.006, label: 'SHORAD BELT' } ],
  clusters: [ {x:54,y:20,r:11},{x:56,y:52,r:13},{x:52,y:84,r:12},{x:42,y:40,r:9} ],
  places: [ { name: 'FRIENDLY REAR', x: 12, y: 18, kind: 'land', size: 12 },
            { name: 'MAIN SUPPLY ROUTE', x: 16, y: 52, kind: 'land', size: 10 },
            { name: 'CONTESTED CORRIDOR', x: 52, y: 40, kind: 'land', size: 13 },
            { name: 'HOSTILE REAR', x: 72, y: 70, kind: 'land', size: 12 } ],
  boundary: { label: 'FLOT — FORWARD LINE OF OWN TROOPS', ticks: true,
              pts: [[66,0],[62,14],[65,30],[60,46],[63,62],[58,78],[62,92],[57,104]] },
  baseRatePerMin: 0.52,
  mascalEvents: [ {atMin: 11, n: 17}, {atMin: 48, n: 23}, {atMin: 98, n: 26}, {atMin: 145, n: 19} ],
  comms: [ {atMin: 52, durMin: 14, label: 'EW JAMMING — DATALINK DEGRADED'} ]
});
SCENARIOS.PACOM_MARINER = joaVariant('PACOM_CORAL', {
  key: 'PACOM_MARINER', theater: 'PACOM', joa: 'MARINER',
  name: 'JOA MARINER — Marianas Basing',
  blurb: 'Rear-area island basing under long-range fires. Fewer casualties, but transits are long and ' +
         'over water, and the cold chain is the binding constraint rather than distance.',
  widthKm: 104, heightKm: 96, terrainSeed: 4127,
  aor: 'JOA MARINER', gridZone: '55P', friendly: 'BLUE — JOINT TASK FORCE MARIANAS',
  islands: [ { x: 22, y: 30, r: 17, h: 180, sx: 0.9, sy: 1.2, name: 'NORTH FIELD' },
             { x: 58, y: 22, r: 12, h: 120, sx: 1.1, sy: 0.9, name: 'WEST ANCHORAGE' },
             { x: 74, y: 62, r: 20, h: 240, sx: 1.05, sy: 0.95, name: 'MAIN ISLAND' },
             { x: 34, y: 74, r: 13, h: 140, sx: 1.2, sy: 0.85, name: 'SOUTH CAY' },
             { x: 96, y: 34, r: 8, h: 80 } ],
  bases: [ { name: 'FARP NORTH', x: 22, y: 30, fleet: [['LIGHT',1],['HEAVY',1]] },
           { name: 'ESB TRIPOLI', x: 52, y: 48, fleet: [['HEAVY',2],['LONG',1]], afloat: true },
           { name: 'FARP MAIN', x: 74, y: 62, fleet: [['LIGHT',1],['HEAVY',1]] } ],
  threats: [ { x: 90, y: 18, r: 19, lossPerMin: 0.005, label: 'LONG-RANGE FIRES FAN' } ],
  clusters: [ {x:22,y:30,r:11},{x:74,y:62,r:14},{x:34,y:74,r:10},{x:58,y:22,r:8} ],
  places: [ { name: 'PHILIPPINE SEA', x: 14, y: 60, kind: 'sea', size: 14 },
            { name: 'PACIFIC OCEAN', x: 92, y: 84, kind: 'sea', size: 14 },
            { name: 'SARAGANA CHANNEL', x: 50, y: 40, kind: 'strait', size: 10 } ],
  boundary: { label: 'AIR DEFENCE IDENTIFICATION ZONE',
              pts: [[104,10],[92,26],[86,48],[92,70],[86,96]] },
  baseRatePerMin: 0.20,
  mascalEvents: [ {atMin: 26, n: 9}, {atMin: 74, n: 12}, {atMin: 132, n: 11} ],
  comms: [ {atMin: 96, durMin: 10, label: 'SATCOM DENIED'} ]
});
SCENARIOS.PACOM_TIMBER = joaVariant('PACOM_CORAL', {
  key: 'PACOM_TIMBER', theater: 'PACOM', joa: 'TIMBER',
  name: 'JOA TIMBER — Southern Approaches',
  blurb: 'Partnered operations across sparse island infrastructure. Long lines, few launch points, and a ' +
         'receiver population that is mostly buddy-aid rather than combat medics.',
  widthKm: 118, heightKm: 88, terrainSeed: 9043,
  aor: 'JOA TIMBER', gridZone: '53M', friendly: 'BLUE — COMBINED JTF SOUTHERN APPROACH',
  islands: [ { x: 26, y: 24, r: 20, h: 190, sx: 1.3, sy: 0.8, name: 'WEST LANDMASS' },
             { x: 76, y: 30, r: 16, h: 165, sx: 0.85, sy: 1.25, name: 'EAST RIDGE' },
             { x: 50, y: 62, r: 22, h: 225, sx: 1.15, sy: 0.9, name: 'CENTRAL BASIN' },
             { x: 104, y: 68, r: 11, h: 110 } ],
  bases: [ { name: 'FARP WEST', x: 26, y: 24, fleet: [['LIGHT',1],['HEAVY',1]] },
           { name: 'FARP CENTRE', x: 50, y: 62, fleet: [['HEAVY',2],['LONG',1]] },
           { name: 'FARP EAST', x: 76, y: 30, fleet: [['LIGHT',1],['HEAVY',1]] } ],
  threats: [ { x: 92, y: 52, r: 15, lossPerMin: 0.004, label: 'IRREGULAR C-UAS' },
             { x: 40, y: 44, r: 12, lossPerMin: 0.003, label: 'CONTESTED STRAIT' } ],
  clusters: [ {x:26,y:24,r:12},{x:50,y:62,r:14},{x:76,y:30,r:11},{x:64,y:76,r:9} ],
  places: [ { name: 'ARAFURA SEA', x: 96, y: 12, kind: 'sea', size: 13 },
            { name: 'BANDA SEA', x: 12, y: 74, kind: 'sea', size: 13 },
            { name: 'TIMBER PASSAGE', x: 62, y: 46, kind: 'strait', size: 10 } ],
  boundary: { label: 'PARTNER NATION BOUNDARY',
              pts: [[0,54],[24,50],[48,44],[72,48],[96,42],[118,46]] },
  baseRatePerMin: 0.26,
  mascalEvents: [ {atMin: 20, n: 11}, {atMin: 68, n: 14}, {atMin: 126, n: 13} ],
  comms: [ {atMin: 80, durMin: 16, label: 'HF RELAY ONLY — DATALINK LOST'} ]
});
SCENARIOS.EUCOM_AMBER = joaVariant('EUCOM_GRANITE', {
  key: 'EUCOM_AMBER', theater: 'EUCOM', joa: 'AMBER',
  name: 'JOA AMBER — Suwalki Corridor',
  blurb: 'A 65 km frontage with both flanks exposed. Everything inside it is observed; the corridor is the ' +
         'only ground line of communication and it is ranged from two directions.',
  widthKm: 96, heightKm: 74, terrainSeed: 2207,
  aor: 'JOA AMBER', gridZone: '34U', friendly: 'BLUE — MULTINATIONAL DIVISION NORTH-EAST',
  bases: [ { name: 'BSA WEST', x: 16, y: 24, fleet: [['LIGHT',1],['HEAVY',1]] },
           { name: 'BSA CENTRE', x: 22, y: 48, fleet: [['HEAVY',2],['LONG',1]] },
           { name: 'BSA SOUTH', x: 30, y: 66, fleet: [['LIGHT',1],['HEAVY',1]] } ],
  threats: [ { x: 62, y: 18, r: 17, lossPerMin: 0.008, label: 'NORTHERN FIRES COMPLEX' },
             { x: 66, y: 58, r: 16, lossPerMin: 0.007, label: 'SOUTHERN FIRES COMPLEX' } ],
  clusters: [ {x:52,y:22,r:11},{x:56,y:44,r:12},{x:50,y:62,r:11},{x:38,y:36,r:9} ],
  places: [ { name: 'FRIENDLY REAR', x: 10, y: 14, kind: 'land', size: 12 },
            { name: 'THE CORRIDOR', x: 48, y: 40, kind: 'land', size: 14 },
            { name: 'HOSTILE NORTH', x: 82, y: 12, kind: 'land', size: 11 },
            { name: 'HOSTILE SOUTH', x: 84, y: 64, kind: 'land', size: 11 } ],
  boundary: { label: 'FLOT — BOTH FLANKS EXPOSED', ticks: true,
              pts: [[74,0],[70,14],[73,28],[68,42],[72,56],[67,74]] },
  baseRatePerMin: 0.48,
  mascalEvents: [ {atMin: 16, n: 16}, {atMin: 58, n: 22}, {atMin: 108, n: 25}, {atMin: 152, n: 18} ],
  comms: [ {atMin: 44, durMin: 18, label: 'EW JAMMING — DATALINK DEGRADED'} ]
});
SCENARIOS.EUCOM_FJORD = joaVariant('EUCOM_GRANITE', {
  key: 'EUCOM_FJORD', theater: 'EUCOM', joa: 'FJORD',
  name: 'JOA FJORD — High North',
  blurb: 'Dispersed high-latitude operations. Cold ambient widens the cold-chain margin; terrain and ' +
         'distance close it again. Few casualties, each of them a long way from help.',
  widthKm: 122, heightKm: 92, terrainSeed: 6611,
  aor: 'JOA FJORD', gridZone: '33W', friendly: 'BLUE — MARINE ROTATIONAL FORCE EUROPE',
  bases: [ { name: 'FOB NORTH', x: 24, y: 20, fleet: [['LIGHT',1],['HEAVY',1]] },
           { name: 'FOB CENTRE', x: 40, y: 50, fleet: [['HEAVY',2],['LONG',1]] },
           { name: 'FOB SOUTH', x: 30, y: 78, fleet: [['LIGHT',1],['HEAVY',1]] } ],
  threats: [ { x: 88, y: 34, r: 18, lossPerMin: 0.004, label: 'COASTAL MISSILE BATTERY' } ],
  clusters: [ {x:66,y:22,r:12},{x:72,y:52,r:13},{x:60,y:76,r:11},{x:44,y:36,r:10} ],
  places: [ { name: 'NORWEGIAN SEA', x: 106, y: 76, kind: 'sea', size: 14 },
            { name: 'INTERIOR PLATEAU', x: 30, y: 44, kind: 'land', size: 12 },
            { name: 'BORDER DISTRICT', x: 96, y: 14, kind: 'land', size: 11 } ],
  boundary: { label: 'INTERNATIONAL BOUNDARY', ticks: true,
              pts: [[92,0],[88,18],[91,36],[86,54],[90,72],[85,92]] },
  baseRatePerMin: 0.22,
  mascalEvents: [ {atMin: 30, n: 10}, {atMin: 84, n: 13}, {atMin: 140, n: 12} ],
  comms: [ {atMin: 70, durMin: 20, label: 'AURORAL HF BLACKOUT'} ]
});

/* ========================================================================== */
/*  TERRAIN — procedural elevation field.                                     */
/*  One height function drives everything: where land is, where casualties    */
/*  can fall, and the shaded-relief basemap the operator actually looks at.   */
/* ========================================================================== */
function thash(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = thash(ix, iy, seed),     b = thash(ix + 1, iy, seed);
  const c = thash(ix, iy + 1, seed), d = thash(ix + 1, iy + 1, seed);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
function fbm(x, y, seed, oct) {
  let amp = 1, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < (oct || 4); i++) {
    sum += amp * vnoise(x * f, y * f, seed + i * 101);
    norm += amp; amp *= 0.5; f *= 2.03;
  }
  return sum / norm;
}
function smoothBump(d, r) {           // 1 at centre, 0 beyond r, smooth edge
  const t = 1 - Math.min(1, d / r);
  return t * t * (3 - 2 * t);
}

/* Build the elevation field for a scenario. Metres above sea level;
   negative is water. */
function makeTerrain(scn) {
  const seed = scn.terrainSeed || 4242;
  if (scn.land === 'continuous') {
    return {
      seaLevel: 0, maxElev: 340,
      elev(x, y) {
        let e = 150
              + (fbm(x / 15, y / 15, seed, 4) * 2 - 1) * 105
              + (fbm(x / 4.6, y / 4.6, seed + 71, 4) * 2 - 1) * 30
              + (fbm(x / 1.5, y / 1.5, seed + 137, 3) * 2 - 1) * 7;
        // a broad valley running north-south through the sector
        const vx = 52 + Math.sin(y * 0.055) * 7;
        e -= 78 * smoothBump(Math.abs(x - vx), 15);
        return e;
      }
    };
  }
  return {
    seaLevel: 0, maxElev: 300,
    elev(x, y) {
      // domain warp — bends the radial island bumps into irregular landmasses
      const wx = x + (fbm(x / 17, y / 17, seed + 11, 3) * 2 - 1) * 11;
      const wy = y + (fbm(x / 17 + 4.3, y / 17 + 4.3, seed + 29, 3) * 2 - 1) * 11;
      let e = -62;
      for (const is of scn.islands) {
        const dx = (wx - is.x) * (is.sx || 1), dy = (wy - is.y) * (is.sy || 1);
        e += is.h * smoothBump(Math.hypot(dx, dy), is.r);
      }
      e += (fbm(x / 7.5, y / 7.5, seed, 4) * 2 - 1) * 34;    // coastline detail
      e += (fbm(x / 2.4, y / 2.4, seed + 53, 3) * 2 - 1) * 11;
      e += (fbm(x / 0.85, y / 0.85, seed + 91, 2) * 2 - 1) * 3;
      return e;
    }
  };
}
function terrainOf(scn) {
  if (!scn._terr) scn._terr = makeTerrain(scn);
  return scn._terr;
}

/* ------------------------------------------------------------ GEOMETRY -- */
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi)) inside = !inside;
  }
  return inside;
}
function onLand(scn, x, y) {
  return terrainOf(scn).elev(x, y) > 4;
}
/* Threat exposure integrated along a straight-line route (drones fly direct). */
function routeThreat(scn, ax, ay, bx, by, speedKmh) {
  const steps = 24, d = dist(ax, ay, bx, by);
  const minutes = (d / speedKmh) * 60;
  const perStep = minutes / steps;
  let survive = 1;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
    for (const z of scn.threats) {
      if (dist(px, py, z.x, z.y) < z.r) survive *= Math.pow(1 - z.lossPerMin, perStep);
    }
  }
  return 1 - survive; // probability of loss over the transit
}

/* ------------------------------------------------------------ CASUALTY -- */
let _casId = 0;
function makeCasualty(scn, rng, tMin) {
  // Place inside a cluster, on land.
  let x, y, guard = 0;
  do {
    const c = rng.pick(scn.clusters);
    const ang = rng() * Math.PI * 2, rad = Math.sqrt(rng()) * c.r;
    x = c.x + Math.cos(ang) * rad; y = c.y + Math.sin(ang) * rad;
    guard++;
  } while ((!onLand(scn, x, y) || x < 2 || y < 2 || x > scn.widthKm - 2 || y > scn.heightKm - 2) && guard < 80);

  const cls = rng.weighted(PARAMS.CLASS_PRIORS);
  /* One draw, exactly as rng.weighted() would have consumed, so the rest of
     the stream is bit-identical to what it was before the uniform was kept.
     scn.tierMix is absent on every scenario in the table and only appears
     when something has deliberately set it, so the default path is TIER_MIX. */
  const uResponder = rng();
  const responder = weightedAt(uResponder, scn.tierMix || TIER_MIX);
  const role = rng.weighted(ROLE_MIX);
  // nearest manoeuvre element owns this casualty
  const us = unitsFor(scn);
  let unit = us[0];
  for (const u of us) if (dist(x, y, u.x, u.y) < dist(x, y, unit.x, unit.y)) unit = u;

  // Injury pattern. Of potentially survivable prehospital deaths, 90.9% are
  // hemorrhage; of lethal hemorrhage, 67.3% truncal / 19.2% junctional /
  // 13.5% peripheral (Eastridge 2012).
  let injury;
  if (cls === 'MINIMAL') {
    injury = rng.weighted([['EXTREMITY_HEM', 0.45], ['MINOR', 0.55]]);
  } else {
    injury = rng.weighted([['TRUNCAL_HEM', 0.62], ['JUNCTIONAL_HEM', 0.18],
                           ['EXTREMITY_HEM', 0.13], ['AIRWAY', 0.07]]);
  }

  // Physiological clock. deadlineMin = minutes from injury until the casualty
  // exhausts compensatory reserve. Anchored on CRM lead-time distribution and
  // widened by triage class.
  let deadlineMin;
  if (cls === 'IMMEDIATE')      deadlineMin = Math.max(6,  rng.normal(PARAMS.CRM_LEAD_MEAN, PARAMS.CRM_LEAD_SD));
  else if (cls === 'EXPECTANT') deadlineMin = Math.max(4,  rng.normal(11, 4));
  else if (cls === 'DELAYED')   deadlineMin = Math.max(25, rng.normal(62, 22));
  else                          deadlineMin = 9999; // MINIMAL: not time-critical

  // Baseline survival if treated instantly, by class.
  const p0 = { IMMEDIATE: 0.93, DELAYED: 0.97, MINIMAL: 0.998, EXPECTANT: 0.22 }[cls];

  // Interventions that actually help this casualty, in order of effect.
  let needs;
  if (injury === 'TRUNCAL_HEM')          needs = ['BLOOD', 'PLASMA', 'TXA'];
  else if (injury === 'JUNCTIONAL_HEM')  needs = ['BLOOD', 'PLASMA', 'TQ_KIT', 'TXA'];
  else if (injury === 'EXTREMITY_HEM')   needs = ['TQ_KIT', 'BLOOD', 'PLASMA'];
  else if (injury === 'AIRWAY')          needs = ['CHEST_SEAL'];
  else                                   needs = ['TQ_KIT'];

  const penetrating = (injury === 'TRUNCAL_HEM' || injury === 'JUNCTIONAL_HEM');

  return {
    id: ++_casId, x, y, tInjury: tMin, cls, injury, responder, uResponder, role, needs, penetrating,
    hva: false, hvaReason: null,
    unit: unit.key, unitName: unit.name,
    tPinged: tMin,             // last time telemetry from this casualty was refreshed
    reportedCrm: 100,          // what the commander's picture says, which may be stale
    deadlineMin, p0,
    treated: false, tTreated: null, treatedWith: null,
    outcome: null,             // 'SAVED' | 'DIED'
    assignedTo: null,          // drone id
    // CRM as reported by the wearable (with sensor noise); 100 -> 0 at deadline.
    crmAt(t) {
      if (this.deadlineMin >= 9000) return 88;
      const frac = Math.max(0, 1 - (t - this.tInjury) / this.deadlineMin);
      return Math.max(0, Math.min(100, frac * 100));
    }
  };
}

/* Probability the casualty survives given the minute at which an effective
   intervention reaches them. Odds-based decay, per published per-minute ORs. */
function survivalIfTreatedAt(cas, tTreat, payloadKey) {
  const delay = Math.max(0, tTreat - cas.tInjury);

  // Payload efficacy: how much of the achievable benefit this item delivers.
  let efficacy;
  const idx = cas.needs.indexOf(payloadKey);
  if (idx < 0) return survivalIfUntreated(cas); // wrong item -- no benefit
  efficacy = [1.0, 0.86, 0.62, 0.45][Math.min(idx, 3)];

  // TXA past its window is net harmful.
  if (payloadKey === 'TXA' && delay > PARAMS.TXA_WINDOW_MIN) return survivalIfUntreated(cas) * 0.94;

  // Buddy-applied tourniquets fail a documented fraction of the time.
  if (payloadKey === 'TQ_KIT' && cas.responder === 'T1') {
    efficacy *= (PARAMS.BUDDY_TQ_SUCCESS + PARAMS.TELEMENTOR_UPLIFT);
  }

  const orPerMin = cas.penetrating ? PARAMS.ODDS_PER_MIN_PENETRATING : PARAMS.ODDS_PER_MIN;
  // Cap the compounding window so the steep penetrating OR stays local, as
  // the source data supports -- it is not a valid global exponential.
  const effDelay = Math.min(delay, cas.penetrating ? 45 : 180);

  const odds0 = (1 - cas.p0) / cas.p0;
  const odds = odds0 * Math.pow(orPerMin, effDelay);
  const pTreated = 1 / (1 + odds);

  // Past the physiological deadline, benefit collapses toward the untreated case.
  const over = Math.max(0, delay - cas.deadlineMin);
  const decompPenalty = Math.exp(-over / 6);

  const pUn = survivalIfUntreated(cas);
  return pUn + (pTreated - pUn) * efficacy * decompPenalty;
}

function survivalIfUntreated(cas) {
  if (cas.cls === 'MINIMAL') return 0.995;
  if (cas.cls === 'DELAYED') return 0.42;
  if (cas.cls === 'EXPECTANT') return 0.02;
  return 0.06; // IMMEDIATE, untreated
}

/* ---------------------------------------------------------------- DRONE -- */
let _droneId = 0;
function makeDrone(typeKey, base, scn) {
  const p = PLATFORMS[typeKey];
  return {
    id: ++_droneId, type: typeKey, plat: p,
    baseIdx: base._idx, baseX: base.x, baseY: base.y, baseName: base.name,
    x: base.x, y: base.y,
    state: 'IDLE',            // IDLE | OUTBOUND | RETURNING | LOST
    route: [],                // [{casId, payloadKey, x, y, eta}] -- multi-stop
    legIdx: 0,
    target: null,             // current casualty id
    payloadKey: null,
    tArrive: null, tHome: null, tDepart: null,
    destX: base.x, destY: base.y,
    fromX: base.x, fromY: base.y,
    held: false,
    coldC: 3.0,               // container temp, C
    coldStartMin: null,
    manifest: {},             // payloadKey -> count still aboard
    sorties: 0, delivered: 0, wasted: 0, cumulative: {}, lastLoad: null,
    emblem: true              // broadcasting machine-readable protective emblem
  };
}

/* --------------------------------------------------- ADDING AIRFRAMES --
   A commander can reinforce a launch point. Two rules make this honest
   rather than a cheat code:

     1  AN AIRCRAFT BELONGS TO A LAUNCH POINT, and a launch point belongs to
        one joint operations area. There is no pool. `baseIdx` is the whole
        of the ownership model and nothing here weakens it.

     2  BOTH ARMS GET IT. The comparison is only worth something if Class
        VIII push flies the same fleet from the same launch points, so the
        difference that remains is the tasking decision and nothing else.
        Reinforcing one arm would turn every figure in THE DIFFERENCE into
        an artefact of the reinforcement. This function therefore takes the
        two arms together and refuses to do half the job — callers cannot
        add to one and forget the other, because there is no way to ask.

   The two arms are given the SAME tail number for the same airframe, so a
   reviewer reading both columns can see it is the same aircraft in both. */
function addAirframeToBoth(armA, armB, typeKey, baseIdx) {
  if (!PLATFORMS[typeKey]) return null;
  const bA = armA.bases[baseIdx];
  if (!bA) return null;
  const id = ++_droneId;
  const mk = (arm) => {
    const b = arm.bases[baseIdx];
    if (!b) return null;
    _droneId = id - 1;                 // same tail number in both arms
    const d = makeDrone(typeKey, b, null);
    arm.drones.push(d);
    return d;
  };
  const dA = mk(armA);
  const dB = armB ? mk(armB) : null;
  _droneId = id;
  return { id, type: typeKey, baseIdx, baseName: bA.name, a: dA, b: dB };
}

/* Remove the most recently added airframe of a type from a launch point, in
   both arms, and only if it is on the ground and unassigned. An aircraft
   that is out on a sortie cannot be deleted out from under the casualty it
   is flying to. */
function removeAirframeFromBoth(armA, armB, droneId) {
  const idle = (arm) => {
    const d = arm.drones.find(k => k.id === droneId);
    return d && d.state === 'IDLE' && !d.route.length;
  };
  if (!idle(armA)) return false;
  if (armB && !idle(armB)) return false;
  for (const arm of [armA, armB]) {
    if (!arm) continue;
    const i = arm.drones.findIndex(k => k.id === droneId);
    if (i >= 0) arm.drones.splice(i, 1);
  }
  return true;
}

function droneEta(d, tx, ty, tNow) {
  const dkm = dist(d.x, d.y, tx, ty);
  return tNow + (dkm / d.plat.speedKmh) * 60;
}
/* =========================================================================
   WHAT HAPPENS WHEN THE AIRCRAFT GETS THERE.

   An aircraft arriving overhead has not delivered anything. The package has
   to leave the aircraft, reach the ground intact and be found, someone has to
   pick it up, and someone has to put it into the casualty — and it is that
   last moment, not the moment of arrival, that stops the bleeding. Modelling
   arrival as treatment flatters the concept by several minutes per casualty
   and hides the part of the sequence that actually fails in the field.

   Release method is a property of the platform:
     CHUTE DROP      the FVR-90 releases from 100 ft AGL on a stabilised chute
                     and stays on station overhead as a comms relay. Fast off
                     the aircraft, but the package drifts and has to be found.
     HOVER AND LOWER the TRV-150C descends into a hover and lowers the pod on
                     a tether. Slower, but the package lands where it is aimed.
     HOVER RELEASE   the M25 hovers low and releases directly.

   Recovery is where a delivery quietly fails: a package that drifts into
   water or vegetation is a sortie flown, an aircraft spent and a unit of
   blood destroyed, with nothing reaching the casualty. It is reported as
   such rather than counted as delivered.
   ========================================================================= */
const RELEASE = {
  LONG:  { key: 'CHUTE DROP',      releaseMin: 0.4, recoverMin: 1.6, missRate: 0.06,
           note: 'chute release from 100 ft AGL, aircraft holds overhead as relay' },
  HEAVY: { key: 'HOVER AND LOWER', releaseMin: 0.9, recoverMin: 0.6, missRate: 0.015,
           note: 'descends to a hover and lowers the pod on a tether' },
  LIGHT: { key: 'HOVER RELEASE',   releaseMin: 0.6, recoverMin: 0.7, missRate: 0.03,
           note: 'low hover, direct release' }
};

/* How long the person on scene takes to get it into the casualty, once the
   package is in their hands. Freeze-dried plasma has to be reconstituted;
   whole blood needs a line established. A tourniquet is quick. */
const ADMIN_MIN = { TQ_KIT: 0.8, CHEST_SEAL: 1.0, TXA: 1.2, PLASMA: 3.2, BLOOD: 4.0 };

/* Buddy aid is slower than a combat medic at the same task. */
const TIER_ADMIN_FACTOR = { T1: 1.5, T2: 1.2, T3: 1.0 };

function deliverySequence(d, c, pk) {
  const R = RELEASE[d.type];
  const admin = (ADMIN_MIN[pk] || 1.5) * (TIER_ADMIN_FACTOR[c.responder] || 1.2);
  return { release: R.releaseMin, recover: R.recoverMin, admin, method: R.key, note: R.note,
           missRate: R.missRate, onStation: R.releaseMin + R.recoverMin };
}

/* =========================================================================
   THE WEARABLE. Compensatory Reserve Measurement is not a new sensor — it is
   a feature-extraction problem on the arterial pulse waveform a pulse
   oximeter already produces. A 1-D CNN reads ~5 s of 100 Hz photoplethysmo-
   graphy and emits one number per second, displayed as a 20 s trailing mean:
   the proportion of this individual's compensatory reserve still unspent,
   100% at euvolemia down to 0 at the onset of decompensated shock.

   Two honesty constraints are modelled here rather than assumed away:

   SIGNAL QUALITY. The whole premise is a peripheral waveform, and hemorrhagic
   shock, cold and tourniquets all cause the peripheral vasoconstriction that
   destroys it — the signal degrades exactly as the casualty deteriorates.
   The FDA-cleared indication is explicitly non-motion. So quality falls with
   falling reserve and with movement, and below a floor the panel must say the
   number is unreliable rather than keep displaying it.

   WHAT THE NETWORK KNOWS. Inference runs on the soldier's end-user device, so
   the medic on scene always has a live number. The tasking system only knows
   what was transmitted: a Cursor-on-Target-sized event on zone change or
   every 45 s, buffered when the link is down. The tasking picture is
   therefore a last-known value with an age, and the age is shown.
   ========================================================================= */
const DEVICE = {
  label: 'CRM monitor — PPG waveform, fingertip',
  method: 'Compensatory reserve from arterial pulse waveform (photoplethysmography), 100 Hz, 5 s window, 1 Hz output, 20 s trailing mean',
  cadence: 45,          // seconds between routine transmissions
  qualityFloor: 0.42,   // below this the reading is not trustworthy
  zone: v => v >= 70 ? 'GREEN' : v >= 40 ? 'AMBER' : 'RED'
};

/* Deterministic per-casualty signal quality. Falls with reserve (peripheral
   vasoconstriction) and jitters with movement. Same draw every run. */
function signalQuality(c, tMin) {
  const crm = c.crmAt(tMin) / 100;
  const perfusion = 0.45 + 0.55 * Math.min(1, Math.max(0, crm));
  const seed = ((c.id * 2654435761) >>> 0) % 1000 / 1000;
  const motion = 0.86 + 0.14 * Math.sin((tMin / 7) + seed * 6.283);
  return Math.max(0, Math.min(1, perfusion * motion));
}

/* Nearest named feature to a point — used to say WHERE a coverage gap is in
   words a commander would use, rather than as a grid pair. */
function placeNameAt(scn, x, y) {
  let best = null, bd = 1e9;
  for (const is of (scn.islands || []))
    if (is.name) { const d = dist(x, y, is.x, is.y); if (d < bd) { bd = d; best = is.name; } }
  for (const pl of (scn.places || []))
    if (pl.name && pl.kind === 'land') { const d = dist(x, y, pl.x, pl.y); if (d < bd) { bd = d; best = pl.name; } }
  return best || 'THE FORWARD SECTOR';
}

function inRange(d, tx, ty, loadKg) {
  // Must reach the casualty and get home within the platform's usable radius
  // at the load actually being carried.
  const r = effectiveRadiusKm(d.plat, loadKg === undefined ? 2 : loadKg);
  return dist(d.baseX, d.baseY, tx, ty) <= r;
}

/* Cold chain: a Golden Hour container holds 1-10 C for many hours, but the
   pod on a light platform in a hot ambient does not. Model temp rise in
   flight and treat an excursion as a re-tasking event. */
function ambientAt(baseC, tMin) {
  // Diurnal swing. A sortie planned inside the transfusable band can drift out
  // of it while airborne -- which is precisely why temperature has to be read
  // in flight rather than on landing.
  return baseC + 5.5 * Math.sin((tMin / 240) * Math.PI * 2 - 1.1);
}
function coldTempAfter(minutes, ambientC, platKey) {
  // Insulation quality by platform (heavier platform, better container).
  const tau = { HEAVY: 210, LONG: 260, LIGHT: 62 }[platKey];
  const start = 3.0;
  return ambientC - (ambientC - start) * Math.exp(-minutes / tau);
}

/* ---------------------------------------------------------------- WORLD -- */
function createWorld(scenarioKey, seed) {
  /* Hand out a private copy. The scenario table is shared across every world
     ever built in this session, and anything that edits a base or a fleet in
     place — a what-if, an analysis harness, a future editor — would otherwise
     silently contaminate every subsequent run. */
  const scn = JSON.parse(JSON.stringify(SCENARIOS[scenarioKey]));
  const rng = makeRNG(seed);
  _casId = 0;

  // Build the casualty stream ONCE, from one seed, so both arms of the A/B
  // face an identical battle. This is what makes the scoreboard honest.
  const stream = [];
  let t = 0;
  while (t < scn.durationMin) {
    t += -Math.log(1 - rng()) / scn.baseRatePerMin;
    if (t < scn.durationMin) stream.push(makeCasualty(scn, rng, t));
  }
  for (const ev of scn.mascalEvents) {
    for (let i = 0; i < ev.n; i++) {
      stream.push(makeCasualty(scn, rng, ev.atMin + rng.range(0, 3.5)));
    }
  }
  stream.sort((a, b) => a.tInjury - b.tInjury);
  stream.forEach((c, i) => { c.id = i + 1; });

  return { scn, seed, stream, ambientC: SCENARIOS[scenarioKey].theater === 'PACOM' ? 31 : 22 };
}

/* An "arm" is one independent run: its own fleet, its own allocator, sharing
   the world's casualty stream. */
function createArm(world, label, allocatorKey, mode) {
  _droneId = 0;
  const drones = [];
  const bases = world.scn.bases.map((b, i) => ({
    name: b.name, x: b.x, y: b.y, _idx: i,
    stock: Object.assign({}, STOCK_INIT),
    spent: { BLOOD: 0, PLASMA: 0, TXA: 0, TQ_KIT: 0, CHEST_SEAL: 0 },
    wastedUnits: { BLOOD: 0, PLASMA: 0 }
  }));
  bases.forEach(b => {
    const src = world.scn.bases[b._idx];
    for (const [typeKey, n] of src.fleet) {
      for (let i = 0; i < n; i++) drones.push(makeDrone(typeKey, b, world.scn));
    }
  });
  return {
    label, allocatorKey, mode,
    hitl: false, autoApproveAbove: 0.55,
    queue: [], audit: [],
    /* Transactional record. The UI reads aggregates; these are the rows. */
    sortieLog: [], deliveryLog: [], stockLog: [], _sortieId: 0,
    bases, drones,
    casualties: [],            // casualties that have occurred so far (deep copies)
    nextIdx: 0,
    lastResupply: 0,
    log: [],
    stats: { saved: 0, died: 0, treated: 0, sorties: 0, stops: 0, wastedSorties: 0,
             dronesLost: 0, coldAborts: 0, bloodWasted: 0, bloodUsed: 0,
             stockouts: 0, missedDeadline: 0, coldSwaps: 0, plasmaUsed: 0,
             approved: 0, rejected: 0, expired: 0, autoApproved: 0,
             // HERO METRIC: deaths among casualties whose wounds were survivable
             // with timely intervention. Excludes MINIMAL (survive regardless)
             // and EXPECTANT (do not survive regardless).
             survivableDeaths: 0, survivableTotal: 0, survivableSaved: 0 },
    commsDown: false
  };
}

/* Deep-ish copy of a casualty for an arm (methods reattached). */
function cloneCasualty(c) {
  const n = Object.assign({}, c);
  n.needs = c.needs.slice();
  n.crmAt = c.crmAt;
  n.treated = false; n.tTreated = null; n.treatedWith = null;
  n.outcome = null; n.assignedTo = null;
  return n;
}

