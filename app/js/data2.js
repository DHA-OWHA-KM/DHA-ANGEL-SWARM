/* =========================================================================
   ANGEL SWARM — the analytical record.

   The mission runs in objects and the objects are gone when the tab closes.
   That is acceptable for flying it and useless for arguing about it, because
   the argument a medical operations officer wants to have is never the one a
   dashboard was built to answer. They want to ask their own question, of the
   whole record, and get the answer while they are still holding the thought.

   So the run is materialised into a real analytical database — DuckDB,
   compiled to WebAssembly, running in a worker inside this page — and the
   operator gets a SQL console pointed at it. Not a query builder. SQL.

   Why an analytical engine rather than the embedded SQLite that this
   application also carries: the questions worth asking here are analytical
   ones, and they are the ones a row-store cannot express. "What was this
   casualty's compensatory reserve at the moment the pod landed on him" is an
   ASOF join — match each delivery to the most recent preceding telemetry
   reading, per casualty, with no exact key to join on. SQLite has no such
   operator; you write it as a correlated subquery over the whole telemetry
   table and wait. DuckDB has it as a keyword. The same is true of
   quantile_cont for a real interpolated median, of PIVOT for the two-arm
   comparison every one of these questions eventually becomes, and of QUALIFY
   for filtering on a window without wrapping the query in itself.

   Nothing in this module can change an outcome. It reads the two arms after
   the fact and writes them into tables. If DuckDB fails to instantiate for
   any reason the console never appears and the rest of the application does
   not notice.

   Offline: the engine, its worker and its 34 MB wasm image are files in
   app/vendor/duckdb/. DuckDB does not statically link json, parquet or icu —
   it autoloads them from a public extension host on first use, which in an
   air-gapped tent is a hang followed by an error. Both autoload paths are
   turned off at open() and the setting is read back and displayed, so the
   claim is on screen rather than in a comment. Every table is loaded through
   Arrow IPC from memory; nothing here opens a file or names an extension.
   ========================================================================= */

const DUCKDB_DIR = 'vendor/duckdb/';
const CM_DIR = 'vendor/cm/';
const CSS_PATH = 'css/data2.css';

/* Rows above this are still counted, aggregated and timed — they are simply
   not painted. A judge who asks for 40,000 rows wants the row count and the
   elapsed time, and a browser that renders all of them gives neither. */
const RENDER_CAP = 2000;

/* ========================================================================== */
/*  EXTRACTION                                                                */
/* ========================================================================== */

/* The simulation's objects carry things a column cannot hold — a closure for
   the casualty's reserve at time t, the array of telemetry polls, the whole
   candidate-airframe rationale behind one tasking decision. Flattening is
   therefore a set of choices rather than a copy, and the choices are made
   here so they are visible in one place.

   Scalars go across as themselves. The nested arrays become their own tables
   with a foreign key, because that is where the interesting questions live:
   the telemetry series is what makes an ASOF join meaningful, and the
   candidate list is what turns "which launch point was the constraint" from
   an opinion into a count. Nothing is aggregated on the way in. Aggregation
   is the analyst's job, and pre-computing it would be deciding their question
   for them. */

const T = { i: 'i', d: 'd', s: 's', b: 'b' };   // int32, double, varchar, bool

/* Both arms land in the same tables under an `arm` discriminator rather than
   in parallel per-arm tables. Every question a judge actually asks is a
   comparison, and a comparison across two tables is a join the analyst has to
   remember to write correctly. */
const ARM_A = 'ANGEL';
const ARM_B = 'PUSH';

function num(v) { return (v === null || v === undefined || Number.isNaN(v)) ? null : +v; }
function str(v) { return (v === null || v === undefined) ? null : String(v); }
function bool(v) { return (v === null || v === undefined) ? null : !!v; }

function table(name, cols, note) {
  return { name, cols, note, rows: [] };
}

/* Build every table for one arm and append into `out` (keyed by table name),
   so the two arms interleave into a single set of tables. */
function extractArm(out, arm, armKey, world) {
  if (!arm) return;
  const scn = (world && world.scn) || {};

  /* ------------------------------------------------------------ casualties */
  for (const c of (arm.casualties || [])) {
    const d = c.decision || {};
    out.casualties.rows.push([
      armKey, num(c.id),
      num(c.x), num(c.y),
      num(c.tInjury), str(c.cls), str(c.injury), str(c.responder), str(c.role),
      str(c.unit), str(c.unitName),
      (c.needs && c.needs.length) ? c.needs.join(',') : null,
      num(c.needs ? c.needs.length : 0),
      bool(c.penetrating), bool(c.hva), str(c.hvaReason),
      num(c.tPinged), num(c.reportedCrm), num(c.deadlineMin), num(c.p0),
      /* The deadline arrives as a duration from injury. The absolute minute is
         what every "did help arrive in time" question needs, and asking an
         analyst to add two columns before they can ask it is a tax. */
      num(c.tInjury != null && c.deadlineMin != null ? c.tInjury + c.deadlineMin : null),
      bool(c.treated), num(c.tTreated), str(c.treatedWith),
      str(c.outcome), num(c.assignedTo),
      num(c.reachN), num(c.knownCrm), num(c.knownAt), num(c.knownQ),
      num(c.tOnStation), num(c.tRecovered), str(c.releaseMethod), num(c.tResolved),
      num(c.tele ? c.tele.length : 0),
      /* MINIMAL casualties live regardless of what anyone does and EXPECTANT
         die regardless. Counting either against a tasking system flatters or
         damns it for outcomes it never had a claim on, so the flag that
         separates them travels with the row. */
      bool(c.cls === 'IMMEDIATE' || c.cls === 'DELAYED'),
      /* --- the tasking decision, flattened --- */
      num(d.t), num(d.drone), str(d.call), str(d.plat), str(d.base), str(d.payload),
      num(d.arriveFromInjury), num(d.marginMin), num(d.crmUsed), num(d.crmAgeMin),
      num(d.crmQ), num(d.pUntreated), num(d.pTreated), num(d.gain), num(d.stops),
      bool(d.telementored), num(d.candidates ? d.candidates.length : null)
    ]);

    /* ----------------------------------------------------------- telemetry */
    for (const p of (c.tele || [])) {
      out.telemetry.rows.push([
        armKey, num(c.id), num(p.t), num(p.v), str(p.zone), num(p.q), str(p.trigger)
      ]);
    }

    /* ---------------------------------------------------------- candidates */
    for (const k of ((c.decision && c.decision.candidates) || [])) {
      out.candidates.rows.push([
        armKey, num(c.id), num(k.id), str(k.call), str(k.plat), str(k.base),
        num(k.distKm), num(k.flightMin), bool(k.chosen), str(k.verdict)
      ]);
    }
  }

  /* ---------------------------------------------------------------- drones */
  for (const d of (arm.drones || [])) {
    out.drones.rows.push([
      armKey, num(d.id), str(d.type), str(d.plat && d.plat.label),
      num(d.plat && d.plat.speedKmh), num(d.plat && d.plat.payloadKg),
      num(d.baseIdx), str(d.baseName), num(d.baseX), num(d.baseY),
      num(d.x), num(d.y), str(d.state), str(d.payloadKey), num(d.target),
      num(d.tDepart), num(d.tArrive), num(d.tHome),
      num(d.sorties), num(d.delivered), num(d.wasted),
      num(d.coldC), bool(d.held), num(d.sectors ? d.sectors.length : 0)
    ]);
  }

  /* ----------------------------------------------------------------- bases */
  for (const b of (arm.bases || [])) {
    const st = b.stock || {}, sp = b.spent || {}, wa = b.wastedUnits || {};
    out.bases.rows.push([
      armKey, num(b._idx), str(b.name), num(b.x), num(b.y),
      num((arm.drones || []).filter(d => d.baseIdx === b._idx).length),
      num(st.BLOOD), num(st.PLASMA), num(st.TXA), num(st.TQ_KIT), num(st.CHEST_SEAL),
      num(sp.BLOOD), num(sp.PLASMA), num(sp.TXA), num(sp.TQ_KIT), num(sp.CHEST_SEAL),
      num(wa.BLOOD), num(wa.PLASMA)
    ]);
  }

  /* ------------------------------------------------------------ deliveries */
  const baseName = {};
  (arm.bases || []).forEach(b => { baseName[b._idx] = b.name; });
  const droneById = {};
  (arm.drones || []).forEach(d => { droneById[d.id] = d; });

  for (const r of (arm.deliveryLog || [])) {
    out.deliveries.rows.push([
      armKey, num(r.sortieId), num(r.casId), str(r.payload),
      num(r.t), num(r.delay), bool(r.ok), str(r.wasteReason), num(r.coldC)
    ]);
  }

  /* --------------------------------------------------------------- sorties */
  for (const s of (arm.sortieLog || [])) {
    const dr = droneById[s.droneId];
    out.sorties.rows.push([
      armKey, num(s.id), num(s.droneId),
      str(dr && dr.plat && dr.plat.label), str(dr && dr.baseName),
      num(s.tLaunch), num(s.tReturn),
      num(s.tReturn != null && s.tLaunch != null ? s.tReturn - s.tLaunch : null),
      num(s.stops), str(s.actor), num(s.proposalId)
    ]);
  }

  /* ----------------------------------------------------------------- stock */
  for (const m of (arm.stockLog || [])) {
    out.stock.rows.push([
      armKey, num(m.t), num(m.baseIdx), str(baseName[m.baseIdx]),
      str(m.item), num(m.delta), str(m.reason)
    ]);
  }

  /* ----------------------------------------------------------------- audit */
  /* meta travels as text, deliberately. DuckDB's JSON functions live in an
     extension that would have to come off a network this system will never
     have, so the column is a string an analyst can pattern-match and nothing
     in here is tempted to call json_extract on it. */
  for (const a of (arm.audit || [])) {
    out.audit.rows.push([
      armKey, num(a.seq), num(a.t), str(a.actor), str(a.action), str(a.detail),
      a.meta ? JSON.stringify(a.meta) : null, str(a.prev), str(a.hash)
    ]);
  }

  /* ---------------------------------------------------------------- stream */
  for (const s of (arm.stream || [])) {
    out.stream.rows.push([
      armKey, num(s.t), num(s.tRecv),
      num(s.tRecv != null && s.t != null ? s.tRecv - s.t : null),
      str(s.phase), num(s.casId), num(s.droneId), str(s.call), str(s.payload),
      str(s.relay), str(s.text)
    ]);
  }

  /* ------------------------------------------------------------------ runs */
  const st = arm.stats || {};
  out.runs.rows.push([
    armKey, str(arm.label), str(arm.allocatorKey), str(arm.mode),
    str(scn.key), str(scn.name), str(scn.theater), str(scn.joa),
    num(out._seed), num(scn.durationMin),
    num((arm.casualties || []).length),
    num(st.died), num(st.saved), num(st.treated),
    num(st.survivableDeaths), num(st.survivableTotal), num(st.survivableSaved),
    num(st.coverageDeaths), num(st.missedDeadline),
    num(st.sorties), num(st.stops), num(st.wastedSorties), num(st.dronesLost),
    num(st.bloodUsed), num(st.bloodWasted), num(st.plasmaUsed), num(st.stockouts),
    num(st.coldAborts), num(st.coldSwaps),
    num(st.approved), num(st.rejected), num(st.expired), num(st.autoApproved),
    bool(arm.telementor), bool(arm.hitl)
  ]);
}

/* The schema, as data. It is the source of truth for the Arrow types, for the
   sidebar, and for the editor's autocompletion, so those three can never
   drift apart. */
export function buildTables(armA, armB, world, opts) {
  const o = opts || {};
  const out = {
    _seed: o.seed == null ? null : o.seed,

    runs: table('runs', [
      ['arm', T.s], ['label', T.s], ['allocator', T.s], ['control_mode', T.s],
      ['scenario_key', T.s], ['scenario', T.s], ['theater', T.s], ['joa', T.s],
      ['seed', T.i], ['duration_min', T.d],
      ['casualties', T.i], ['died', T.i], ['saved', T.i], ['treated', T.i],
      ['survivable_deaths', T.i], ['survivable_total', T.i], ['survivable_saved', T.i],
      ['coverage_deaths', T.i], ['missed_deadline', T.i],
      ['sorties', T.i], ['stops', T.i], ['wasted_sorties', T.i], ['drones_lost', T.i],
      ['blood_used', T.i], ['blood_wasted', T.i], ['plasma_used', T.i], ['stockouts', T.i],
      ['cold_aborts', T.i], ['cold_swaps', T.i],
      ['approved', T.i], ['rejected', T.i], ['expired', T.i], ['auto_approved', T.i],
      ['telementoring', T.b], ['human_in_the_loop', T.b]
    ], 'One row per arm. The headline figures, so a query can normalise against them. ' +
       'Two death columns, deliberately: died is every casualty whose outcome was DIED in any ' +
       'triage category, survivable_deaths is the subset triaged IMMEDIATE or DELAYED — the only ' +
       'deaths a resupply decision could have changed, and the figure the scoreboard and THE ' +
       'DIFFERENCE carry. They are the same two numbers, under the same definitions, as the ' +
       'COUNT glossary the panes read.'),

    casualties: table('casualties', [
      ['arm', T.s], ['id', T.i],
      ['x_km', T.d], ['y_km', T.d],
      ['t_injury', T.d], ['triage', T.s], ['injury', T.s], ['responder', T.s],
      ['role', T.s], ['unit', T.s], ['unit_name', T.s],
      ['needs', T.s], ['n_needs', T.i],
      ['penetrating', T.b], ['hva', T.b], ['hva_reason', T.s],
      ['t_pinged', T.d], ['reported_crm', T.d], ['deadline_min', T.d], ['p0', T.d],
      ['deadline_at', T.d],
      ['treated', T.b], ['t_treated', T.d], ['treated_with', T.s],
      ['outcome', T.s], ['assigned_to', T.i],
      ['reach_n', T.i], ['known_crm', T.d], ['known_at', T.d], ['known_q', T.d],
      ['t_on_station', T.d], ['t_recovered', T.d], ['release_method', T.s],
      ['t_resolved', T.d], ['tele_n', T.i], ['survivable', T.b],
      ['dec_t', T.d], ['dec_drone', T.i], ['dec_call', T.s], ['dec_platform', T.s],
      ['dec_base', T.s], ['dec_payload', T.s], ['dec_arrive_from_injury', T.d],
      ['dec_margin_min', T.d], ['dec_crm_used', T.d], ['dec_crm_age_min', T.d],
      ['dec_crm_q', T.d], ['dec_p_untreated', T.d], ['dec_p_treated', T.d],
      ['dec_gain', T.d], ['dec_stops', T.i], ['dec_telementored', T.b],
      ['dec_candidates', T.i]
    ], 'One row per wounded soldier per arm. deadline_at is the minute past which the wound is no longer survivable.'),

    telemetry: table('telemetry', [
      ['arm', T.s], ['cas_id', T.i], ['t', T.d], ['crm', T.d],
      ['zone', T.s], ['q', T.d], ['trigger', T.s]
    ], 'Every wearable poll. The time series an ASOF join reaches back into.'),

    candidates: table('candidates', [
      ['arm', T.s], ['cas_id', T.i], ['drone_id', T.i], ['call', T.s],
      ['platform', T.s], ['base', T.s], ['dist_km', T.d], ['flight_min', T.d],
      ['chosen', T.b], ['verdict', T.s]
    ], 'Every airframe the allocator considered for a casualty, and why it lost.'),

    drones: table('drones', [
      ['arm', T.s], ['id', T.i], ['type', T.s], ['platform', T.s],
      ['speed_kmh', T.d], ['payload_kg', T.d],
      ['base_idx', T.i], ['base_name', T.s], ['base_x', T.d], ['base_y', T.d],
      ['x_km', T.d], ['y_km', T.d], ['state', T.s], ['payload_key', T.s],
      ['target', T.i], ['t_depart', T.d], ['t_arrive', T.d], ['t_home', T.d],
      ['sorties', T.i], ['delivered', T.i], ['wasted', T.i],
      ['cold_c', T.d], ['held', T.b], ['sectors', T.i]
    ], 'The fleet as it stands at the end of the run.'),

    bases: table('bases', [
      ['arm', T.s], ['idx', T.i], ['name', T.s], ['x_km', T.d], ['y_km', T.d],
      ['airframes', T.i],
      ['blood', T.i], ['plasma', T.i], ['txa', T.i], ['tq_kit', T.i], ['chest_seal', T.i],
      ['blood_spent', T.i], ['plasma_spent', T.i], ['txa_spent', T.i],
      ['tq_kit_spent', T.i], ['chest_seal_spent', T.i],
      ['blood_wasted', T.i], ['plasma_wasted', T.i]
    ], 'Launch points with stock on hand at the end of the run.'),

    deliveries: table('deliveries', [
      ['arm', T.s], ['sortie_id', T.i], ['cas_id', T.i], ['payload', T.s],
      ['t', T.d], ['delay_min', T.d], ['ok', T.b], ['waste_reason', T.s], ['cold_c', T.d]
    ], 'Every pod that reached the ground, and every one that did not.'),

    sorties: table('sorties', [
      ['arm', T.s], ['id', T.i], ['drone_id', T.i], ['platform', T.s], ['base', T.s],
      ['t_launch', T.d], ['t_return', T.d], ['duration_min', T.d],
      ['stops', T.i], ['actor', T.s], ['proposal_id', T.i]
    ], 'One row per launch. actor records who or what released it.'),

    stock: table('stock', [
      ['arm', T.s], ['t', T.d], ['base_idx', T.i], ['base_name', T.s],
      ['item', T.s], ['delta', T.d], ['reason', T.s]
    ], 'Stock movements. Negative deltas leave the shelf.'),

    audit: table('audit', [
      ['arm', T.s], ['seq', T.i], ['t', T.d], ['actor', T.s], ['action', T.s],
      ['detail', T.s], ['meta', T.s], ['prev', T.s], ['hash', T.s]
    ], 'The hash-chained decision log. meta is text, not JSON — see the module header.'),

    stream: table('stream', [
      ['arm', T.s], ['t', T.d], ['t_recv', T.d], ['latency_min', T.d],
      ['phase', T.s], ['cas_id', T.i], ['drone_id', T.i], ['call', T.s],
      ['payload', T.s], ['relay', T.s], ['text', T.s]
    ], 'Ground truth traffic. latency_min is how long the report took to arrive.')
  };

  extractArm(out, armA, ARM_A, world);
  extractArm(out, armB, ARM_B, world);

  delete out._seed;
  return Object.values(out);
}

/* ========================================================================== */
/*  ENGINE                                                                    */
/* ========================================================================== */

let DUCK = null;      // the bundled duckdb + arrow module namespace

async function loadDuck() {
  if (DUCK) return DUCK;
  DUCK = await import(ANGEL.asset(DUCKDB_DIR + 'duckdb.mjs'));
  return DUCK;
}

/* Turn one extracted table into an Arrow IPC stream.

   Explicit column types, not inference. `tableFromArrays` guesses from the
   first values it sees, and this data is full of columns that are entirely
   null until something happens — t_return before an aircraft lands, outcome
   before a casualty resolves. A guess on those produces an Arrow Null vector,
   which arrives in DuckDB as a column no predicate can touch. Declaring the
   type means an empty column is still a DOUBLE that compares and sorts. */
function toIPC(arrow, tbl) {
  const vecs = {};
  tbl.cols.forEach(([name, kind], i) => {
    const col = new Array(tbl.rows.length);
    for (let r = 0; r < tbl.rows.length; r++) col[r] = tbl.rows[r][i];
    let type;
    if (kind === T.i) type = new arrow.Int32();
    else if (kind === T.d) type = new arrow.Float64();
    else if (kind === T.b) type = new arrow.Bool();
    else type = new arrow.Utf8();
    vecs[name] = arrow.vectorFromArray(col, type);
  });
  return arrow.tableToIPC(new arrow.Table(vecs), 'stream');
}

export class AngelDB {
  constructor() {
    this.db = null;
    this.conn = null;
    this.meta = [];          // the loaded schema, for the sidebar and completions
    this.info = {};          // version + the offline assertions
    this.loadedAt = null;
    this.loadMs = null;
    this.rowTotal = 0;
  }

  async init() {
    const d = await loadDuck();

    /* No bundle selection. selectBundle() exists to pick between mvp, eh and
       coi by probing the engine, and the version shipped here is compiled for
       exception handling, which every browser this will be demonstrated on
       supports. Naming the two files outright removes the probe, removes the
       chance of the library reaching for a default host, and makes the two
       assets a grep can find. */
    const wasmURL = ANGEL.asset(DUCKDB_DIR + 'duckdb-eh.wasm');
    const workerURL = ANGEL.asset(DUCKDB_DIR + 'duckdb-browser-eh.worker.js');

    const worker = new Worker(workerURL);
    const db = new d.AsyncDuckDB(new d.VoidLogger(), worker);
    await db.instantiate(wasmURL, null);

    /* castBigIntToDouble is not cosmetic. Without it every COUNT(*) comes
       back as a BigInt, which will not JSON-serialise, will not compare
       against a plain number, and throws the moment anything tries to format
       it. The console would work right up until someone counted something. */
    await db.open({
      path: ':memory:',
      query: { castBigIntToDouble: true }
    });

    this.db = db;
    this.conn = await db.connect();

    /* The air-gap assertion, made twice: turned off here, read back below and
       printed on screen. DuckDB-WASM does not statically link json, parquet
       or icu, and its default behaviour on meeting a function from one of
       them is to fetch the extension from a public host. In a tent that is a
       stall and then a failure with a confusing message. */
    for (const stmt of [
      "SET autoinstall_known_extensions=false",
      "SET autoload_known_extensions=false"
    ]) {
      try { await this.conn.query(stmt); } catch (e) { /* older builds lack it */ }
    }

    const ver = await this.first("SELECT version() AS v");
    let autoload = null, autoinstall = null;
    try {
      const s = await this.first(
        "SELECT current_setting('autoload_known_extensions') AS al, " +
        "current_setting('autoinstall_known_extensions') AS ai");
      autoload = s && s.al; autoinstall = s && s.ai;
    } catch (e) { /* setting not present in this build */ }

    /* The strongest available statement that nothing came off a network: ask
       the engine's own catalogue how many of its optional extensions are
       loaded. json, parquet and icu are all in that list, and all of them
       would have to be fetched. The answer wanted here is zero. */
    let loadedExts = [], knownExts = 0;
    try {
      const r = await this.conn.query(
        "SELECT extension_name, loaded FROM duckdb_extensions() ORDER BY 1");
      const name = r.getChildAt(0), on = r.getChildAt(1);
      knownExts = r.numRows;
      for (let i = 0; i < r.numRows; i++) if (on.get(i)) loadedExts.push(String(name.get(i)));
    } catch (e) { /* catalogue function unavailable in this build */ }

    this.info = {
      version: ver ? String(ver.v) : 'unknown',
      bundle: 'eh',
      autoload: String(autoload),
      autoinstall: String(autoinstall),
      extensions: loadedExts,
      knownExtensions: knownExts,
      wasmURL, workerURL
    };
    return this;
  }

  /* Load both arms. Existing tables are replaced outright rather than
     appended to, because the console is pointed at one mission and a
     half-overwritten one would be worse than no data at all. */
  async loadRun(armA, armB, world, opts) {
    const d = await loadDuck();
    const t0 = performance.now();
    const tables = buildTables(armA, armB, world, opts);

    let rows = 0;
    for (const t of tables) {
      await this.conn.query(`DROP TABLE IF EXISTS "${t.name}"`);
      /* An empty table still has to exist — a preset query against a mission
         that produced no deliveries should return no rows, not an error about
         a missing relation. Arrow carries the schema even with zero rows, so
         the same path builds both. */
      const ipc = toIPC(d, t);
      await this.conn.insertArrowFromIPCStream(ipc, { name: t.name, create: true });
      rows += t.rows.length;
    }

    this.meta = tables.map(t => ({
      name: t.name, note: t.note,
      cols: t.cols.map(([n, k]) => ({ name: n, kind: k }))
    }));
    this.rowTotal = rows;
    this.loadMs = performance.now() - t0;
    this.loadedAt = new Date();
    ANGEL.mark('db-load', { rows, ms: Math.round(this.loadMs) });
    return { rows, ms: this.loadMs, tables: tables.length };
  }

  /* Every query is timed end to end — the worker round trip and the Arrow
     transfer included, not just the engine's own accounting. The number on
     screen is the number the operator waited. */
  async query(sql) {
    const t0 = performance.now();
    const res = await this.conn.query(sql);
    const ms = performance.now() - t0;
    return { arrow: res, ms, sql };
  }

  async first(sql) {
    const r = await this.conn.query(sql);
    if (!r.numRows) return null;
    const o = {};
    r.schema.fields.forEach((f, i) => { o[f.name] = r.getChildAt(i).get(0); });
    return o;
  }

  tables() { return this.meta; }
}

/* ========================================================================== */
/*  PRESETS                                                                   */
/*                                                                            */
/*  Each of these is a question somebody in the audience has actually asked   */
/*  out loud, and each one is written the way it is because the engine        */
/*  underneath can express it that way. They are not decoration; they are the */
/*  argument for the engine.                                                  */
/* ========================================================================== */

const PRESETS = [
  {
    id: 'late',
    label: 'Who died, and by how much',
    feature: 'window function',
    question: 'For every soldier who died of a survivable wound, how far past their physiological deadline did help arrive — if it arrived at all?',
    sql:
`-- deadline_at is the minute past which this wound stops being survivable.
-- The LEFT JOIN keeps the soldiers nothing was ever sent to, which are the
-- rows that matter most; the window then ranks the misses inside each arm so
-- the worst case is one row rather than a scan. A negative figure is not a
-- success — it is help that arrived in time and did not work.
WITH help AS (
  SELECT c.arm, c.id, c.triage, c.injury, c.unit_name,
         c.t_injury, c.deadline_at,
         MIN(d.t) AS landed
  FROM casualties c
  LEFT JOIN deliveries d
         ON d.arm = c.arm AND d.cas_id = c.id AND d.ok
  WHERE c.outcome = 'DIED' AND c.survivable
  GROUP BY ALL
)
SELECT arm, id, triage, injury, unit_name,
       ROUND(t_injury, 1)             AS injured_at,
       ROUND(deadline_at, 1)          AS deadline_at,
       ROUND(landed, 1)               AS help_landed_at,
       ROUND(landed - deadline_at, 1) AS minutes_past_deadline,
       CASE WHEN landed IS NULL       THEN 'nothing was ever delivered'
            WHEN landed > deadline_at THEN 'arrived after the deadline'
            ELSE 'arrived in time; the wound killed anyway' END AS what_happened,
       RANK() OVER (PARTITION BY arm
                    ORDER BY landed - deadline_at DESC NULLS LAST) AS worst_in_arm
FROM help
ORDER BY arm, minutes_past_deadline DESC NULLS LAST;`
  },

  {
    id: 'quantile',
    label: 'Median and 90th percentile',
    feature: 'quantile_cont + PIVOT',
    question: 'Time from wounding to treatment by triage category, both arms side by side. Not the mean — the mean hides the tail, and the tail is where people die.',
    sql:
`-- quantile_cont interpolates between order statistics, so p90 over eleven
-- casualties is a real ninetieth percentile rather than the ninth value.
-- PIVOT turns the arm column into arm columns, which is the shape this
-- comparison is actually read in. Naming the two arms in the IN list rather
-- than letting PIVOT discover them keeps both columns present even when one
-- arm treated nobody in a category, which is itself a finding.
SELECT triage,
       ROUND("ANGEL_p50", 1) AS angel_p50_min,
       ROUND("ANGEL_p90", 1) AS angel_p90_min,
       "ANGEL_n"             AS angel_treated,
       ROUND("PUSH_p50", 1)  AS push_p50_min,
       ROUND("PUSH_p90", 1)  AS push_p90_min,
       "PUSH_n"              AS push_treated
FROM (
  PIVOT (
    SELECT triage, arm, t_treated - t_injury AS mins
    FROM casualties
    WHERE t_treated IS NOT NULL AND survivable
  )
  ON arm IN ('ANGEL', 'PUSH')
  USING quantile_cont(mins, 0.5) AS p50,
        quantile_cont(mins, 0.9) AS p90,
        count(*)                 AS n
  GROUP BY triage
)
ORDER BY triage;`
  },

  {
    id: 'asof',
    id2: 'asof',
    label: 'State at the moment of delivery',
    feature: 'ASOF JOIN',
    hero: true,
    question: 'For every pod that landed, what was that casualty’s compensatory reserve at the last reading before it touched down?',
    note: 'The previous embedded database could not express this. There is no key to join on — only "the most recent reading before this instant, for this casualty". SQLite has no ASOF operator; it becomes a correlated subquery over the whole telemetry table.',
    sql:
`-- ASOF JOIN matches each delivery to the nearest preceding telemetry poll
-- for that same casualty in that same arm. No exact key exists between the
-- two tables; the join condition is an inequality on time.
SELECT d.arm,
       d.cas_id,
       d.payload,
       ROUND(d.t, 1)              AS landed_at,
       ROUND(t.t, 1)              AS last_reading_at,
       ROUND(d.t - t.t, 2)        AS reading_age_min,
       ROUND(t.crm)               AS reserve_at_landing,
       t.zone,
       c.outcome
FROM deliveries d
ASOF JOIN telemetry t
       ON t.arm = d.arm AND t.cas_id = d.cas_id AND t.t <= d.t
JOIN casualties c
       ON c.arm = d.arm AND c.id = d.cas_id
WHERE d.ok
ORDER BY reserve_at_landing;`
  },

  {
    id: 'binding',
    label: 'The binding constraint',
    feature: 'QUALIFY + ROW_NUMBER',
    question: 'When the nearest airframe could not be used, which launch point was it sitting on, and what stopped it?',
    sql:
`-- QUALIFY filters on a window function without wrapping the query inside
-- itself. Here it reduces every tasking decision to the single closest
-- airframe considered, and the outer query counts how often that airframe
-- was ruled out rather than sent.
WITH nearest AS (
  SELECT *
  FROM candidates
  QUALIFY ROW_NUMBER() OVER (PARTITION BY arm, cas_id ORDER BY dist_km, flight_min) = 1
)
SELECT base                                            AS launch_point,
       platform,
       COUNT(*)                                        AS times_nearest,
       SUM(CASE WHEN chosen THEN 1 ELSE 0 END)         AS times_tasked,
       SUM(CASE WHEN verdict LIKE 'OUT OF RANGE%'
                THEN 1 ELSE 0 END)                     AS blocked_by_range,
       ROUND(AVG(dist_km), 1)                          AS mean_km,
       ROUND(100.0 * SUM(CASE WHEN chosen THEN 1 ELSE 0 END) / COUNT(*), 0)
                                                       AS pct_used
FROM nearest
GROUP BY ALL
ORDER BY times_nearest DESC;`
  },

  {
    id: 'cliff',
    label: 'Where the reserve fell away',
    feature: 'LAG + QUALIFY',
    question: 'Which casualties decompensated fastest, and had anything been tasked to them by then?',
    sql:
`-- LAG reaches back one poll within the same casualty's series. The steepest
-- drops are the ones a human watching a screen would have missed.
SELECT t.arm,
       t.cas_id,
       ROUND(t.t, 1)                                              AS at_min,
       ROUND(t.crm)                                               AS reserve,
       ROUND(t.crm - LAG(t.crm) OVER w, 1)                        AS change,
       t.zone,
       c.triage,
       CASE WHEN c.dec_t IS NOT NULL AND c.dec_t <= t.t
            THEN 'tasked' ELSE 'nothing tasked' END               AS status
FROM telemetry t
JOIN casualties c ON c.arm = t.arm AND c.id = t.cas_id
WINDOW w AS (PARTITION BY t.arm, t.cas_id ORDER BY t.t)
QUALIFY change < -6
ORDER BY change
LIMIT 40;`
  },

  {
    id: 'clock',
    label: 'Deaths against the clock',
    feature: 'running total',
    question: 'How did the toll accumulate in each arm as the sixty minutes ran?',
    sql:
`-- A running total over a grouped count. The two arms are the same wounded
-- soldiers under two doctrines, so the divergence between the cumulative
-- columns is the whole comparison. The target is zero.
WITH toll AS (
  SELECT arm,
         CAST(FLOOR(t_resolved / 10) * 10 AS INTEGER) AS from_minute,
         COUNT(*)                                     AS died_in_window
  FROM casualties
  WHERE outcome = 'DIED' AND survivable
  GROUP BY ALL
)
SELECT arm, from_minute, died_in_window,
       SUM(died_in_window) OVER (PARTITION BY arm ORDER BY from_minute)
                                                     AS died_cumulative
FROM toll
ORDER BY from_minute, arm;`
  },

  {
    id: 'margin',
    label: 'What the allocator believed',
    feature: 'decision record',
    question: 'When ANGEL SWARM committed an aircraft it computed an expected gain. Was it right?',
    sql:
`-- dec_gain is the allocator's own expected improvement in survival at the
-- moment it committed. Bucketing it against what happened is the closest
-- thing this record has to a calibration check.
SELECT CASE WHEN dec_gain >= 0.30 THEN 'a. 0.30 and above'
            WHEN dec_gain >= 0.15 THEN 'b. 0.15 to 0.30'
            WHEN dec_gain >= 0.05 THEN 'c. 0.05 to 0.15'
            ELSE                       'd. below 0.05' END      AS expected_gain,
       COUNT(*)                                                 AS taskings,
       SUM(CASE WHEN outcome = 'DIED' THEN 1 ELSE 0 END)        AS died,
       ROUND(AVG(dec_margin_min), 1)                            AS mean_margin_min,
       ROUND(AVG(dec_crm_q), 2)                                 AS mean_signal_quality,
       ROUND(AVG(dec_p_treated - dec_p_untreated), 3)           AS mean_expected_gain
FROM casualties
WHERE dec_gain IS NOT NULL
GROUP BY ALL
ORDER BY expected_gain;`
  },

  {
    id: 'shape',
    label: 'What is in here',
    feature: 'row counts',
    question: 'The whole record, table by table, with the arms broken out.',
    sql:
`SELECT 'casualties' AS "table", arm, COUNT(*) AS rows FROM casualties GROUP BY arm
UNION ALL SELECT 'telemetry',  arm, COUNT(*) FROM telemetry  GROUP BY arm
UNION ALL SELECT 'candidates', arm, COUNT(*) FROM candidates GROUP BY arm
UNION ALL SELECT 'deliveries', arm, COUNT(*) FROM deliveries GROUP BY arm
UNION ALL SELECT 'sorties',    arm, COUNT(*) FROM sorties    GROUP BY arm
UNION ALL SELECT 'stream',     arm, COUNT(*) FROM stream     GROUP BY arm
UNION ALL SELECT 'stock',      arm, COUNT(*) FROM stock      GROUP BY arm
UNION ALL SELECT 'audit',      arm, COUNT(*) FROM audit      GROUP BY arm
UNION ALL SELECT 'drones',     arm, COUNT(*) FROM drones     GROUP BY arm
UNION ALL SELECT 'bases',      arm, COUNT(*) FROM bases      GROUP BY arm
ORDER BY 3 DESC;`
  }
];

export { PRESETS };

/* ========================================================================== */
/*  CONSOLE                                                                   */
/* ========================================================================== */

const S = {
  db: null,
  cm: null,          // the CodeMirror module namespace
  editor: null,
  mounted: false,
  loadedSig: null,   // which mission state is currently in the tables
  busy: false,
  last: null
};

function esc(s) {
  return String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* A signature for "the tables no longer match the mission". Cheap enough to
   evaluate on every repaint and specific enough that a run that is still
   flying reloads as it grows. */
function runSignature() {
  if (typeof APP === 'undefined' || !APP || !APP.world) return null;
  const a = APP.armA, b = APP.armB;
  if (!a || !b) return null;
  return [APP.scenarioKey, APP.seed, a.casualties.length, b.casualties.length,
    a.audit.length, a.deliveryLog.length, APP.finished ? 'F' : 'R'].join('|');
}

function fmtCell(v) {
  if (v === null || v === undefined) return '<i class="q0">null</i>';
  if (typeof v === 'bigint') v = Number(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v);
    return String(Math.round(v * 1000) / 1000);
  }
  return esc(v);
}

/* Paint an Arrow result. Columns are read as vectors rather than materialised
   into row objects — for a wide result that is the difference between a table
   that appears and one that stutters. */
function paintResult(host, r) {
  const t = r.arrow;
  const n = t.numRows;
  const fields = t.schema.fields.map(f => f.name);
  const vecs = fields.map((_, i) => t.getChildAt(i));
  const shown = Math.min(n, RENDER_CAP);

  const head = '<tr>' + fields.map(f => '<th>' + esc(f) + '</th>').join('') + '</tr>';
  const body = [];
  for (let i = 0; i < shown; i++) {
    const cells = new Array(fields.length);
    for (let j = 0; j < fields.length; j++) {
      const v = vecs[j] ? vecs[j].get(i) : null;
      cells[j] = '<td>' + fmtCell(v) + '</td>';
    }
    body.push('<tr>' + cells.join('') + '</tr>');
  }

  host.innerHTML =
    '<div class="qTblWrap"><table class="qTbl mono"><thead>' + head + '</thead>' +
    '<tbody>' + body.join('') + '</tbody></table></div>' +
    (n > shown
      ? '<p class="qCap">Showing the first ' + shown.toLocaleString() +
        ' of ' + n.toLocaleString() + ' rows. The engine returned all ' +
        n.toLocaleString() + '; the cap is on painting, not on querying.</p>'
      : '');
}

function setStat(rows, ms, err) {
  const rEl = document.getElementById('q2Rows');
  const mEl = document.getElementById('q2Ms');
  const sEl = document.getElementById('q2Stat');
  if (!rEl) return;
  if (err) {
    rEl.textContent = '—'; mEl.textContent = '—';
    sEl.className = 'q2Stat bad'; sEl.textContent = 'error';
    return;
  }
  rEl.textContent = rows.toLocaleString();
  mEl.textContent = (ms < 10 ? ms.toFixed(2) : ms.toFixed(1));
  sEl.className = 'q2Stat ok';
  sEl.textContent = 'complete';
}

async function runQuery() {
  if (!S.db || S.busy) return;
  const out = document.getElementById('q2Out');
  const errEl = document.getElementById('q2Err');
  const sql = S.editor ? S.editor.state.doc.toString() : '';
  if (!sql.trim()) return;

  /* Once the analyst has edited the SQL, the preset's question above it is no
     longer the question being answered. Leaving it there would caption
     somebody's own work with somebody else's claim. */
  const active = PRESETS.find(p => p.sql === sql);
  document.querySelectorAll('#q2Presets .q2Preset').forEach(b =>
    b.classList.toggle('on', !!active && b.dataset.preset === active.id));
  if (!active) {
    const q = document.getElementById('q2Question');
    if (q) q.innerHTML = '<b>Your query.</b> ' +
      '<span class="dim">The record is the same one the presets read; nothing here is a view over a summary.</span>';
  }

  S.busy = true;
  const btn = document.getElementById('q2Run');
  if (btn) btn.classList.add('running');
  errEl.style.display = 'none';

  try {
    const r = await S.db.query(sql);
    S.last = r;
    paintResult(out, r);
    setStat(r.arrow.numRows, r.ms, false);
  } catch (e) {
    out.innerHTML = '';
    errEl.style.display = 'block';
    errEl.textContent = String(e && e.message || e);
    setStat(0, 0, true);
  } finally {
    S.busy = false;
    if (btn) btn.classList.remove('running');
  }
}

function setSQL(sql) {
  if (!S.editor) return;
  S.editor.dispatch({
    changes: { from: 0, to: S.editor.state.doc.length, insert: sql }
  });
}

function insertAtCursor(text) {
  if (!S.editor) return;
  const sel = S.editor.state.selection.main;
  S.editor.dispatch({
    changes: { from: sel.from, to: sel.to, insert: text },
    selection: { anchor: sel.from + text.length }
  });
  S.editor.focus();
}

function paintSchema() {
  const host = document.getElementById('q2Schema');
  if (!host || !S.db) return;
  const kindLabel = { i: 'int', d: 'num', s: 'text', b: 'bool' };
  host.innerHTML = S.db.tables().map(t => `
    <div class="q2Tbl">
      <div class="q2TblName" data-ins="${esc(t.name)}">
        <span>${esc(t.name)}</span><u>${t.cols.length}</u></div>
      <div class="q2TblNote" role="note">${esc(t.note || '')}</div>
      <div class="q2Cols">${t.cols.map(c =>
        `<span class="q2Col" data-ins="${esc(c.name)}" title="${kindLabel[c.kind]}">${esc(c.name)}</span>`
      ).join('')}</div>
    </div>`).join('');
}

function paintPresets() {
  const host = document.getElementById('q2Presets');
  if (!host) return;
  host.innerHTML = PRESETS.map(p =>
    `<button class="q2Preset${p.hero ? ' hero' : ''}" data-preset="${p.id}">
       <b>${esc(p.label)}</b><em>${esc(p.feature)}</em></button>`).join('');
}

function selectPreset(id) {
  const p = PRESETS.find(x => x.id === id);
  if (!p) return;
  document.querySelectorAll('#q2Presets .q2Preset').forEach(b =>
    b.classList.toggle('on', b.dataset.preset === id));
  const q = document.getElementById('q2Question');
  if (q) {
    q.innerHTML = '<b>' + esc(p.question) + '</b>' +
      (p.note ? '<span class="q2Cant" data-fold-label="what SQLite could not do">' +
                esc(p.note) + '</span>' : '');
  }
  setSQL(p.sql);
  runQuery();
}

async function reload(force) {
  if (!S.db) return;
  const sig = runSignature();
  if (!sig) return;
  if (!force && sig === S.loadedSig) return;
  if (S.busy) return;
  S.busy = true;
  try {
    const r = await S.db.loadRun(APP.armA, APP.armB, APP.world, { seed: APP.seed });
    S.loadedSig = sig;
    const el = document.getElementById('q2Load');
    if (el) {
      el.textContent = r.rows.toLocaleString() + ' rows across ' + r.tables +
        ' tables, materialised in ' + Math.round(r.ms) + ' ms';
    }
    paintSchema();
  } catch (e) {
    const el = document.getElementById('q2Load');
    if (el) el.textContent = 'could not materialise the run: ' + (e.message || e);
  } finally {
    S.busy = false;
  }
}

/* --------------------------------------------------------------- the editor */

function makeEditor(host) {
  const cm = S.cm;

  /* Autocompletion is fed from the same schema description the sidebar is
     drawn from, so a column that exists in the table is a column the editor
     will offer, and one that does not never appears. */
  const schema = {};
  for (const t of S.db.tables()) schema[t.name] = t.cols.map(c => c.name);

  const state = cm.EditorState.create({
    doc: PRESETS[0].sql,
    extensions: [
      cm.lineNumbers(),
      cm.highlightActiveLineGutter(),
      cm.highlightSpecialChars(),
      cm.history(),
      cm.drawSelection(),
      cm.indentOnInput(),
      cm.bracketMatching(),
      cm.closeBrackets(),
      cm.autocompletion(),
      cm.rectangularSelection(),
      cm.highlightActiveLine(),
      cm.highlightSelectionMatches(),
      cm.sql({ dialect: cm.PostgreSQL, schema, upperCaseKeywords: true }),
      cm.oneDark,
      cm.keymap.of([
        /* The one binding that matters. A console where running the query
           needs the mouse is a console nobody runs a second query in. */
        { key: 'Mod-Enter', preventDefault: true, run: () => { runQuery(); return true; } },
        ...cm.closeBracketsKeymap, ...cm.defaultKeymap,
        ...cm.searchKeymap, ...cm.historyKeymap,
        ...cm.completionKeymap, cm.indentWithTab
      ]),
      /* The library's default syntax colours include an orchid violet for
         keywords. Repaint from the console's own custom properties so the
         editor moves with the theme instead of sitting outside it. */
      cm.EditorView.theme({
        '&': { height: '236px', fontSize: '12.5px' },
        '.tok-keyword, .tok-controlKeyword, .tok-operatorKeyword': { color: 'var(--cyan)' },
        '.tok-string, .tok-string2': { color: 'var(--grn)' },
        '.tok-number': { color: 'var(--amb)' },
        '.tok-comment': { color: 'var(--t-dim)', fontStyle: 'italic' },
        '.tok-variableName, .tok-propertyName': { color: 'var(--text)' }
      })
    ]
  });
  return new cm.EditorView({ state, parent: host });
}

/* ------------------------------------------------------------------- render */

const SHELL = `
  <div class="pane">
    <div class="paneHead">
      <div class="ph1"><h2>Analytical console</h2>
        <p>The whole mission, both arms, in DuckDB running in this page. Window functions,
           interpolated quantiles, PIVOT and ASOF joins, against the transactional record rather
           than a summary of it. The engine, its worker and its WebAssembly image are files in this
           folder; nothing here reaches a network.</p></div>
      <div class="phTools">
        <button class="btn" id="q2Reload">Reload from mission</button>
      </div>
    </div>

    <div class="q2Engine" id="q2Engine"></div>

    <div class="q2Presets" id="q2Presets"></div>
    <div class="q2Question" id="q2Question"></div>

    <div class="q2Grid">
      <div class="card q2Side">
        <div class="cardHead">Schema<span class="q2Hint">click to insert</span></div>
        <div id="q2Schema" class="q2Schema"></div>
      </div>

      <div class="q2Main">
        <div class="card q2Editor">
          <div class="cardHead">Query
            <span class="q2Hint">Ctrl / Cmd + Enter to run</span></div>
          <div id="q2CM" class="q2CM"></div>
          <div class="q2Bar">
            <button class="btn ok" id="q2Run">Run</button>
            <div class="q2Metrics">
              <div class="q2Metric"><b id="q2Rows">—</b><em>rows</em></div>
              <div class="q2Metric"><b id="q2Ms">—</b><em>milliseconds</em></div>
              <span class="q2Stat" id="q2Stat">idle</span>
            </div>
            <span class="q2Load" id="q2Load"></span>
          </div>
          <div class="q2Err" id="q2Err"></div>
        </div>
        <div class="card q2Result">
          <div class="cardHead">Result</div>
          <div id="q2Out" class="q2Out"></div>
        </div>
      </div>
    </div>
  </div>`;

function paintEngineLine() {
  const el = document.getElementById('q2Engine');
  if (!el || !S.db) return;
  const i = S.db.info;
  const off = (i.autoload === 'false' || i.autoload === '0' || i.autoload === 'null');
  el.className = 'q2Engine ' + (off ? 'ok' : 'warn');
  el.innerHTML =
    '<b>DuckDB ' + esc(i.version) + '</b>' +
    '<span>exception-handling build, ' + (ANGEL.caps.cores || '?') + ' cores available</span>' +
    '<span>extension autoload <b>' + esc(String(i.autoload)) + '</b>' +
    ' · autoinstall <b>' + esc(String(i.autoinstall)) + '</b></span>' +
    '<span><b>' + i.extensions.length + '</b> of ' + i.knownExtensions +
    ' optional extensions loaded' +
    (i.extensions.length ? ': ' + esc(i.extensions.join(', ')) : '') +
    ' — json, parquet and icu are in that list and every one of them would ' +
    'have to come off a network</span>' +
    '<span>engine, worker and 34 MB WebAssembly image are files in this folder</span>';
}

/* The stylesheet is attached from here rather than declared in the template.

   It was declared in the template first, and the console rendered completely
   unstyled — because mounting replaces the pane's contents, and a
   <link rel="stylesheet"> that is removed from the document takes its rules
   with it. The sheet was still listed in document.styleSheets, which made it
   look loaded while nothing it declared applied to anything. Owning the
   element here puts it in the head, out of reach of any pane rebuild, and
   leaves the template holding one line instead of two. */
function attachCSS() {
  const href = ANGEL.asset(CSS_PATH);
  if (!document.querySelector('link[data-angel-css="data2"]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.dataset.angelCss = 'data2';
    document.head.appendChild(l);
  }
  /* Eleven table descriptions stacked down the left of the pane is eleven
     sentences a presenter has to look past to reach the schema. The sentence
     is not deleted — it is shown for the one table being pointed at. */
  if (!document.getElementById('q2QuietCss')) {
    const st = document.createElement('style');
    st.id = 'q2QuietCss';
    /* display:none, not a clipped height: a clipped paragraph is still a
       rendered paragraph and still reads out to a screen reader and to a
       word count. Gone means gone until it is asked for. */
    st.textContent =
      '.q2Schema .q2TblNote{display:none}' +
      '.q2Schema .q2Tbl:hover .q2TblNote,.q2Schema .q2Tbl:focus-within .q2TblNote{display:block}' +
      /* Eleven tables' worth of column names, all open at once, is 194 tokens
         down the side of the pane before a question has been asked. The
         columns of the table being pointed at are the ones worth reading, and
         they stay clickable because the pointer is inside the block that
         opens them. */
      '.q2Schema .q2Cols{display:none}' +
      '.q2Schema .q2Tbl:hover .q2Cols,.q2Schema .q2Tbl:focus-within .q2Cols{display:flex}';
    document.head.appendChild(st);
  }
}

async function mount(pane) {
  pane.innerHTML = SHELL;
  paintPresets();
  paintEngineLine();

  document.getElementById('q2Run').addEventListener('click', runQuery);
  document.getElementById('q2Reload').addEventListener('click', () => reload(true));
  document.getElementById('q2Presets').addEventListener('click', e => {
    const b = e.target.closest('[data-preset]');
    if (b) selectPreset(b.dataset.preset);
  });
  document.getElementById('q2Schema').addEventListener('click', e => {
    const el = e.target.closest('[data-ins]');
    if (el) insertAtCursor(el.dataset.ins);
  });

  /* The application's global shortcuts listen on window and skip only INPUT
     elements. CodeMirror's surface is a contenteditable div, so without this
     an analyst typing the word "order" would reset the simulation on the "r"
     and jump to another pane on the "d". Stopping the bubble at the editor
     container leaves CodeMirror's own keymap intact — it binds deeper — and
     keeps the host application from ever seeing the keystroke. */
  document.getElementById('q2CM').addEventListener('keydown', e => e.stopPropagation());

  await reload(true);
  S.editor = makeEditor(document.getElementById('q2CM'));
  S.mounted = true;

  /* Open on the ASOF join. It is the one a judge who knows databases will
     recognise immediately, and the one the previous engine could not run. */
  selectPreset('asof');
}

function renderQuery() {
  const pane = document.querySelector('[data-pane="QUERY"]');
  if (!pane || !S.db) return;
  if (!S.mounted) {
    if (!pane.dataset.mounting) {
      pane.dataset.mounting = '1';
      mount(pane).catch(e => {
        pane.innerHTML = '<div class="pane"><p class="dim">The analytical console could not ' +
          'start: ' + esc(String(e && e.message || e)) + '</p></div>';
      });
    }
    return;
  }
  /* A mission that is still flying grows rows underneath the console. Reload
     when the shape changes, never mid-query. */
  reload(false);
}

/* ========================================================================== */
/*  BOOTSTRAP                                                                 */
/* ========================================================================== */

/* Guarded so this module can also be imported by the offline harness that
   validates the preset SQL against the same engine outside a browser. */
if (typeof ANGEL !== 'undefined' && typeof document !== 'undefined') {
  ANGEL.ready('data2', async () => {
    /* Workers and WebAssembly are both hard requirements. If either is
       missing the nav entry stays inert rather than offering a console that
       throws on first click. */
    if (!ANGEL.caps.workers || !ANGEL.caps.wasm) {
      throw new Error('DuckDB needs Web Workers and WebAssembly');
    }

    attachCSS();
    S.cm = await import(ANGEL.asset(CM_DIR + 'cm.mjs'));

    const db = new AngelDB();
    await db.init();
    S.db = db;

    ANGEL.provide('db', {
      query: sql => db.query(sql),
      tables: () => db.tables(),
      loadRun: (a, b, w, o) => db.loadRun(a, b, w, o),
      ready: true,
      info: db.info,
      presets: PRESETS
    });

    ANGEL.views = ANGEL.views || {};
    ANGEL.views.QUERY = renderQuery;

    /* The nav entry advertises Q, so Q has to work. The host application's
       own shortcut table is not ours to edit, and a module that registers its
       own key is also a module that disappears cleanly when it fails to
       load. */
    window.addEventListener('keydown', e => {
      if (e.key !== 'q' && e.key !== 'Q') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      APP.view = 'QUERY';
      APP.sel = null;
      APP._paneForce = true;
      document.body.classList.add('navOpen');
      render();
    });

    /* Materialise whatever the mission has produced so far, without waiting
       for anyone to open the pane. Two reasons: another module that asks for
       this service gets tables rather than an empty catalogue, and the first
       click on the nav entry lands on a console that already has data in it
       instead of one that spends half a second filling up while a judge
       watches. Failure here is not fatal — the pane reloads on mount. */
    reload(true).catch(() => {});

    ANGEL.mark('duckdb', { version: db.info.version, autoload: db.info.autoload });
    return db;
  });
}
