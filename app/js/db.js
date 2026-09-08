/* ============================================================================
   ANGEL SWARM — Mission Record (SQLite)

   The simulation runs in memory, in objects. That is fine for flying the
   mission and wrong for arguing about it afterwards. A medical-operations
   analyst does not want a rendered chart of somebody else's chosen metric;
   they want the transactional record and their own question.

   So every run is also written to a real relational database — SQLite,
   compiled to wasm, running in the page, no server. Casualties, sorties,
   deliveries, stock movements, proposals, telemetry polls and the hash-chained
   audit log all land in normalised tables with foreign keys. The saved queries
   at the bottom are a starting point, not a fence: the query box takes
   arbitrary SQL and runs it against the same file that would be handed to a
   post-exercise review board.

   This module is deliberately inert. Nothing in the simulation depends on it,
   nothing it does can change an outcome, and if SQLite fails to initialise for
   any reason the whole layer degrades to empty results rather than taking the
   application down with it. The record is evidence, not machinery.
   ========================================================================== */


/* ========================================================================== */
/*  SCHEMA                                                                    */
/*  One mission per database. Foreign keys are declared for the analyst's     */
/*  benefit — they document the joins — but enforcement is left off, because  */
/*  a mission can end mid-sortie with references to things that never         */
/*  resolved, and a partial record is still worth keeping.                    */
/* ========================================================================== */
const DB_SCHEMA = `
-- The run itself: theater, joint operations area, scenario, and the seed that
-- makes it reproducible. Everything else hangs off mission_id.
CREATE TABLE mission (
  id            INTEGER PRIMARY KEY,
  theater       TEXT,
  joa           TEXT,
  scenario      TEXT,
  mode          TEXT,      -- 'EXERCISE' | 'LIVE'
  seed          INTEGER,
  control_arm   TEXT,      -- allocator the comparison arm was flying
  telementoring INTEGER,   -- 0/1: was the AR telementoring policy in force
  started_min   REAL,
  duration_min  REAL
);

-- Where aircraft launch from. Afloat launch points sit on a hull and move the
-- whole delay distribution, which is why the flag is worth a column.
CREATE TABLE launch_point (
  id         INTEGER PRIMARY KEY,
  mission_id INTEGER NOT NULL REFERENCES mission(id),
  name       TEXT,
  afloat     INTEGER,
  x          REAL,
  y          REAL
);

CREATE TABLE unit (
  id                INTEGER PRIMARY KEY,
  mission_id        INTEGER NOT NULL REFERENCES mission(id),
  name              TEXT,
  assigned_strength INTEGER,
  x                 REAL,
  y                 REAL
);

-- deployed_min is null until the airframe is actually pushed forward, so it
-- doubles as the fleet's arrival curve.
CREATE TABLE airframe (
  id              INTEGER PRIMARY KEY,
  mission_id      INTEGER NOT NULL REFERENCES mission(id),
  callsign        TEXT,
  platform        TEXT,
  launch_point_id INTEGER REFERENCES launch_point(id),
  cruise_kmh      REAL,
  payload_kg      REAL,
  deployed_min    REAL
);

-- The people. deadline_min is the predicted time from injury to physiological
-- collapse; responder_tier is who is standing next to them and therefore what
-- can be administered on arrival. Both are the whole argument.
CREATE TABLE casualty (
  id             INTEGER PRIMARY KEY,
  mission_id     INTEGER NOT NULL REFERENCES mission(id),
  unit_id        INTEGER REFERENCES unit(id),
  role           TEXT,
  triage         TEXT,     -- IMMEDIATE | DELAYED | MINIMAL | EXPECTANT
  injury         TEXT,
  penetrating    INTEGER,
  hva            INTEGER,  -- commander-designated high-value asset
  hva_reason     TEXT,
  responder_tier TEXT,     -- T1 | T2 | T3
  t_injury       REAL,
  deadline_min   REAL,
  x              REAL,
  y              REAL,
  outcome        TEXT,     -- SAVED | DIED | null while unresolved
  t_resolved     REAL,
  treated_with   TEXT,
  t_treated      REAL
);

-- Fleet deployment decisions. 'trigger' is quoted throughout because TRIGGER
-- is a SQLite keyword; the column is named for the concept, not the statement.
CREATE TABLE deployment (
  id            INTEGER PRIMARY KEY,
  mission_id    INTEGER NOT NULL REFERENCES mission(id),
  t_requested   REAL,
  t_complete    REAL,
  "trigger"     TEXT,      -- 'ON_DEMAND' | 'THRESHOLD'
  actor         TEXT,
  airframes     INTEGER,
  launch_points INTEGER
);

-- What the machine asked a human to authorise, on what named grounds, and what
-- the human did about it. escalation_reasons is a comma-separated list.
CREATE TABLE proposal (
  id                 INTEGER PRIMARY KEY,
  mission_id         INTEGER NOT NULL REFERENCES mission(id),
  t_raised           REAL,
  airframe_id        INTEGER REFERENCES airframe(id),
  lead_casualty_id   INTEGER REFERENCES casualty(id),
  gain               INTEGER,   -- expected lives saved, in percentage points
  escalation_reasons TEXT,
  state              TEXT,      -- PENDING | APPROVED | REJECTED | EXPIRED
  t_acted            REAL,
  actor              TEXT
);

-- A sortie is one launch-to-recovery cycle. proposal_id is null when the
-- sortie flew under delegated authority rather than an explicit approval.
CREATE TABLE sortie (
  id             INTEGER PRIMARY KEY,
  mission_id     INTEGER NOT NULL REFERENCES mission(id),
  airframe_id    INTEGER REFERENCES airframe(id),
  t_launch       REAL,
  t_return       REAL,
  stops          INTEGER,
  authorised_by  TEXT,
  proposal_id    INTEGER REFERENCES proposal(id)
);

-- One row per stop. delivered = 0 means the aircraft got there and the payload
-- still did no good; waste_reason says why. container_c is the temperature
-- inside the cold-chain container at the moment of handover.
CREATE TABLE delivery (
  id          INTEGER PRIMARY KEY,
  sortie_id   INTEGER REFERENCES sortie(id),
  casualty_id INTEGER REFERENCES casualty(id),
  payload     TEXT,
  t_arrive    REAL,
  delay_min   REAL,      -- injury to handover
  delivered   INTEGER,
  waste_reason TEXT,
  container_c REAL
);

-- Class VIII ledger. delta is signed: positive is resupply, negative is issue
-- or destruction, and 'reason' separates the two.
CREATE TABLE stock_txn (
  id              INTEGER PRIMARY KEY,
  mission_id      INTEGER NOT NULL REFERENCES mission(id),
  launch_point_id INTEGER REFERENCES launch_point(id),
  item            TEXT,
  delta           INTEGER,
  reason          TEXT,
  t               REAL
);

-- Combat effectiveness polls flown by the command UAV. Ordered or scheduled,
-- the distinction is in 'actor'.
CREATE TABLE telemetry_poll (
  id            INTEGER PRIMARY KEY,
  mission_id    INTEGER NOT NULL REFERENCES mission(id),
  unit_id       INTEGER REFERENCES unit(id),
  t             REAL,
  actor         TEXT,
  effectiveness REAL,     -- 0..1
  level         TEXT,      -- GREEN | AMBER | RED
  wounded       INTEGER,
  critical      INTEGER,
  killed        INTEGER
);

-- The hash-chained audit log, carried over verbatim so the chain can be
-- re-verified from the database rather than from the running application.
CREATE TABLE audit_event (
  seq        INTEGER PRIMARY KEY,
  mission_id INTEGER NOT NULL REFERENCES mission(id),
  t          REAL,
  actor      TEXT,
  action     TEXT,
  detail     TEXT,
  prev_hash  TEXT,
  hash       TEXT
);

-- Indexes follow the joins the saved queries actually make, not every key.
CREATE INDEX idx_casualty_unit     ON casualty(unit_id);
CREATE INDEX idx_casualty_outcome  ON casualty(outcome, triage);
CREATE INDEX idx_airframe_lp       ON airframe(launch_point_id);
CREATE INDEX idx_sortie_airframe   ON sortie(airframe_id);
CREATE INDEX idx_sortie_proposal   ON sortie(proposal_id);
CREATE INDEX idx_delivery_sortie   ON delivery(sortie_id);
CREATE INDEX idx_delivery_casualty ON delivery(casualty_id);
CREATE INDEX idx_stock_lp          ON stock_txn(launch_point_id, item);
CREATE INDEX idx_poll_unit         ON telemetry_poll(unit_id, t);
CREATE INDEX idx_audit_actor       ON audit_event(actor, action);
`;


/* ========================================================================== */
/*  WASM LOADING                                                              */
/*  sql.js normally fetches its wasm alongside the script. This application   */
/*  is one HTML file with no network, so the binary is carried inline as      */
/*  base64 and handed to the loader directly.                                 */
/* ========================================================================== */
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* Null-safe field read. The snapshot is assembled from a live simulation and
   fields are legitimately absent — an airframe never deployed has no
   deployment time, a casualty still bleeding has no outcome. Absent means
   NULL in the record, not zero and not a thrown error. */
function nn(v) {
  return (v === undefined || v === null || v !== v) ? null : v;
}
function bit(v) {
  if (v === undefined || v === null) return null;
  return v ? 1 : 0;
}


/* ========================================================================== */
/*  RUNTIME                                                                   */
/* ========================================================================== */
const DB = {
  ready: false,
  error: null,
  _SQL: null,
  _db: null,
  _initPromise: null,

  /* Idempotent: repeated calls share one promise, so the UI can call init()
     from several places without racing two databases into existence. */
  init: function () {
    if (this._initPromise) return this._initPromise;
    const self = this;
    this._initPromise = new Promise(function (resolve) {
      if (typeof initSqlJs !== 'function' || typeof SQL_WASM_B64 !== 'string') {
        self.error = 'sql.js runtime not present in this build';
        resolve(false);
        return;
      }
      let binary;
      try {
        binary = b64ToBytes(SQL_WASM_B64);
      } catch (e) {
        self.error = 'could not decode the embedded wasm binary: ' + e.message;
        resolve(false);
        return;
      }
      initSqlJs({ wasmBinary: binary }).then(function (SQL) {
        try {
          self._SQL = SQL;
          self._db = new SQL.Database();
          self._db.run(DB_SCHEMA);
          self.ready = true;
          self.error = null;
          resolve(true);
        } catch (e) {
          self.ready = false;
          self.error = 'schema failed: ' + e.message;
          resolve(false);
        }
      }).catch(function (e) {
        self.ready = false;
        self.error = 'SQLite failed to start: ' + (e && e.message ? e.message : String(e));
        resolve(false);
      });
    });
    return this._initPromise;
  },

  /* A new mission gets a new database rather than a truncated one — cheaper
     than deleting, and it drops any stray objects an analyst created while
     poking around in the query box. */
  reset: function () {
    if (!this.ready || !this._SQL) return false;
    try {
      if (this._db) this._db.close();
      this._db = new this._SQL.Database();
      this._db.run(DB_SCHEMA);
      return true;
    } catch (e) {
      this.ready = false;
      this.error = 'reset failed: ' + e.message;
      return false;
    }
  },

  /* Arbitrary SQL from the query box. sql.js returns one result set per
     statement that produced rows; the last one is what the analyst is looking
     at, so that is what comes back. Errors are values, never exceptions —
     a typo in the query box must not stop the mission clock. */
  exec: function (sql) {
    if (!this.ready || !this._db) {
      return { columns: [], rows: [], error: this.error || 'database not ready' };
    }
    try {
      const res = this._db.exec(sql);
      if (!res || !res.length) return { columns: [], rows: [], error: null };
      const last = res[res.length - 1];
      return { columns: last.columns || [], rows: last.values || [], error: null };
    } catch (e) {
      return { columns: [], rows: [], error: (e && e.message) ? e.message : String(e) };
    }
  },

  run: function (sql, params) {
    if (!this.ready || !this._db) return { ok: false, error: this.error || 'database not ready' };
    try {
      this._db.run(sql, params || []);
      return { ok: true, error: null };
    } catch (e) {
      return { ok: false, error: (e && e.message) ? e.message : String(e) };
    }
  },

  count: function (table) {
    const r = this.exec('SELECT COUNT(*) FROM "' + String(table).replace(/"/g, '') + '"');
    if (r.error || !r.rows.length) return 0;
    return r.rows[0][0] | 0;
  },

  /* Feeds the schema browser. Names come out of sqlite_master rather than a
     hard-coded list so anything an analyst creates in the query box shows up
     alongside the mission tables. */
  tables: function () {
    const out = [];
    const t = this.exec(
      "SELECT name FROM sqlite_master WHERE type = 'table' " +
      "AND name NOT LIKE 'sqlite_%' ORDER BY name");
    if (t.error) return out;
    for (let i = 0; i < t.rows.length; i++) {
      const name = t.rows[i][0];
      const safe = String(name).replace(/"/g, '');
      const info = this.exec('PRAGMA table_info("' + safe + '")');
      const cols = [];
      if (!info.error) {
        for (let j = 0; j < info.rows.length; j++) {
          cols.push({ name: info.rows[j][1], type: info.rows[j][2] || '' });
        }
      }
      out.push({ name: name, rows: this.count(safe), columns: cols });
    }
    return out;
  },

  /* The database file itself, so a run can be downloaded and opened in any
     SQLite tool. This is the artefact that outlives the browser tab. */
  export: function () {
    if (!this.ready || !this._db) return null;
    try {
      return this._db.export();
    } catch (e) {
      return null;
    }
  },

  /* ------------------------------------------------------------------------
     INGEST
     Wipe and rewrite the whole record from a snapshot of the running arm.
     Called on a completed mission and again whenever the operator asks for a
     refresh mid-run, so it has to be quick: one transaction, one prepared
     statement per table, several thousand rows. Doing it as individual
     autocommitted inserts costs seconds; this costs a few milliseconds.
     ---------------------------------------------------------------------- */
  ingest: function (snapshot) {
    if (!this.ready || !this._db) return { ok: false, rowsWritten: 0, error: this.error || 'database not ready' };
    const snap = snapshot || {};
    const db = this._db;
    let written = 0;

    /* Bind and step a statement over a list of rows, mapping each row to a
       positional parameter array. Statements are freed even on failure so a
       bad snapshot cannot leak them into the next attempt. */
    function insertAll(sql, list, toParams) {
      const rows = list || [];
      if (!rows.length) return;
      const stmt = db.prepare(sql);
      try {
        for (let i = 0; i < rows.length; i++) {
          stmt.run(toParams(rows[i], i));
          written++;
        }
      } finally {
        stmt.free();
      }
    }

    try {
      db.run('BEGIN');

      // Children first: harmless with foreign keys off, correct if they are
      // ever switched on.
      db.run(
        'DELETE FROM audit_event; DELETE FROM telemetry_poll; DELETE FROM stock_txn; ' +
        'DELETE FROM delivery; DELETE FROM sortie; DELETE FROM proposal; ' +
        'DELETE FROM deployment; DELETE FROM casualty; DELETE FROM airframe; ' +
        'DELETE FROM unit; DELETE FROM launch_point; DELETE FROM mission;');

      const m = snap.mission || {};
      db.run(
        'INSERT INTO mission (id, theater, joa, scenario, mode, seed, control_arm, ' +
        'telementoring, started_min, duration_min) VALUES (1,?,?,?,?,?,?,?,?,?)',
        [nn(m.theater), nn(m.joa), nn(m.scenario), nn(m.mode), nn(m.seed),
         nn(m.control_arm), bit(m.telementoring), nn(m.started_min), nn(m.duration_min)]);
      written++;

      insertAll(
        'INSERT INTO launch_point (id, mission_id, name, afloat, x, y) VALUES (?,1,?,?,?,?)',
        snap.launchPoints,
        function (r, i) { return [nn(r.id) === null ? i + 1 : r.id, nn(r.name), bit(r.afloat), nn(r.x), nn(r.y)]; });

      insertAll(
        'INSERT INTO unit (id, mission_id, name, assigned_strength, x, y) VALUES (?,1,?,?,?,?)',
        snap.units,
        function (r, i) { return [nn(r.id) === null ? i + 1 : r.id, nn(r.name), nn(r.assigned_strength), nn(r.x), nn(r.y)]; });

      insertAll(
        'INSERT INTO airframe (id, mission_id, callsign, platform, launch_point_id, ' +
        'cruise_kmh, payload_kg, deployed_min) VALUES (?,1,?,?,?,?,?,?)',
        snap.airframes,
        function (r, i) {
          return [nn(r.id) === null ? i + 1 : r.id, nn(r.callsign), nn(r.platform),
                  nn(r.launch_point_id), nn(r.cruise_kmh), nn(r.payload_kg), nn(r.deployed_min)];
        });

      insertAll(
        'INSERT INTO casualty (id, mission_id, unit_id, role, triage, injury, penetrating, ' +
        'hva, hva_reason, responder_tier, t_injury, deadline_min, x, y, outcome, t_resolved, ' +
        'treated_with, t_treated) VALUES (?,1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        snap.casualties,
        function (r, i) {
          return [nn(r.id) === null ? i + 1 : r.id, nn(r.unit_id), nn(r.role), nn(r.triage),
                  nn(r.injury), bit(r.penetrating), bit(r.hva), nn(r.hva_reason),
                  nn(r.responder_tier), nn(r.t_injury), nn(r.deadline_min), nn(r.x), nn(r.y),
                  nn(r.outcome), nn(r.t_resolved), nn(r.treated_with), nn(r.t_treated)];
        });

      insertAll(
        'INSERT INTO deployment (id, mission_id, t_requested, t_complete, "trigger", actor, ' +
        'airframes, launch_points) VALUES (?,1,?,?,?,?,?,?)',
        snap.deployments,
        function (r, i) {
          return [i + 1, nn(r.t_requested), nn(r.t_complete), nn(r.trigger), nn(r.actor),
                  nn(r.airframes), nn(r.launch_points)];
        });

      insertAll(
        'INSERT INTO proposal (id, mission_id, t_raised, airframe_id, lead_casualty_id, gain, ' +
        'escalation_reasons, state, t_acted, actor) VALUES (?,1,?,?,?,?,?,?,?,?)',
        snap.proposals,
        function (r, i) {
          // Reasons arrive as an array from the allocator and as text from a
          // replayed record; both flatten to the same comma-separated column.
          const reasons = Array.isArray(r.escalation_reasons)
            ? r.escalation_reasons.join(', ') : nn(r.escalation_reasons);
          return [nn(r.id) === null ? i + 1 : r.id, nn(r.t_raised), nn(r.airframe_id),
                  nn(r.lead_casualty_id), nn(r.gain), reasons, nn(r.state), nn(r.t_acted), nn(r.actor)];
        });

      insertAll(
        'INSERT INTO sortie (id, mission_id, airframe_id, t_launch, t_return, stops, ' +
        'authorised_by, proposal_id) VALUES (?,1,?,?,?,?,?,?)',
        snap.sorties,
        function (r, i) {
          return [nn(r.id) === null ? i + 1 : r.id, nn(r.airframe_id), nn(r.t_launch),
                  nn(r.t_return), nn(r.stops), nn(r.authorised_by), nn(r.proposal_id)];
        });

      insertAll(
        'INSERT INTO delivery (id, sortie_id, casualty_id, payload, t_arrive, delay_min, ' +
        'delivered, waste_reason, container_c) VALUES (?,?,?,?,?,?,?,?,?)',
        snap.deliveries,
        function (r, i) {
          return [i + 1, nn(r.sortie_id), nn(r.casualty_id), nn(r.payload), nn(r.t_arrive),
                  nn(r.delay_min), bit(r.delivered), nn(r.waste_reason), nn(r.container_c)];
        });

      insertAll(
        'INSERT INTO stock_txn (id, mission_id, launch_point_id, item, delta, reason, t) ' +
        'VALUES (?,1,?,?,?,?,?)',
        snap.stockTxns,
        function (r, i) {
          return [i + 1, nn(r.launch_point_id), nn(r.item), nn(r.delta), nn(r.reason), nn(r.t)];
        });

      insertAll(
        'INSERT INTO telemetry_poll (id, mission_id, unit_id, t, actor, effectiveness, level, ' +
        'wounded, critical, killed) VALUES (?,1,?,?,?,?,?,?,?,?)',
        snap.polls,
        function (r, i) {
          return [i + 1, nn(r.unit_id), nn(r.t), nn(r.actor), nn(r.effectiveness), nn(r.level),
                  nn(r.wounded), nn(r.critical), nn(r.killed)];
        });

      insertAll(
        'INSERT INTO audit_event (seq, mission_id, t, actor, action, detail, prev_hash, hash) ' +
        'VALUES (?,1,?,?,?,?,?,?)',
        snap.audit,
        function (r, i) {
          return [nn(r.seq) === null ? i + 1 : r.seq, nn(r.t), nn(r.actor), nn(r.action),
                  nn(r.detail), nn(r.prev_hash), nn(r.hash)];
        });

      db.run('COMMIT');
      return { ok: true, rowsWritten: written, error: null };
    } catch (e) {
      // Leave the database in the state it was in rather than half-rewritten;
      // a stale record is more use to an analyst than a torn one.
      try { db.run('ROLLBACK'); } catch (e2) { /* nothing sensible to do */ }
      return { ok: false, rowsWritten: 0, error: (e && e.message) ? e.message : String(e) };
    }
  }
};


/* ========================================================================== */
/*  SAVED QUERIES                                                             */
/*  The questions a medical-operations analyst asks after an exercise. They    */
/*  are here to be edited: each one is a starting point that loads into the    */
/*  query box, not a fixed report.                                            */
/* ========================================================================== */
const DB_QUERIES = [
  {
    name: 'Preventable deaths',
    question: 'Who died who should not have — by triage category and duty role — and how many of them were never reached at all?',
    sql:
`-- "Preventable" here means IMMEDIATE or DELAYED: casualties the literature
-- treats as survivable with timely intervention. EXPECTANT and MINIMAL are
-- counted but excluded from the preventable column.
SELECT c.triage,
       c.role,
       COUNT(*)                                                        AS casualties,
       SUM(CASE WHEN c.outcome = 'DIED' THEN 1 ELSE 0 END)             AS died,
       SUM(CASE WHEN c.outcome = 'DIED'
                 AND c.triage IN ('IMMEDIATE','DELAYED') THEN 1 ELSE 0 END) AS preventable_deaths,
       SUM(CASE WHEN c.outcome = 'DIED'
                 AND c.t_treated IS NULL THEN 1 ELSE 0 END)            AS died_never_reached,
       ROUND(100.0 * SUM(CASE WHEN c.outcome = 'DIED' THEN 1 ELSE 0 END)
             / COUNT(*), 1)                                            AS died_pct
FROM casualty c
GROUP BY c.triage, c.role
ORDER BY preventable_deaths DESC, died DESC;`
  },

  {
    name: 'Delay to delivery by launch point',
    question: 'How long does it take a payload to reach a casualty from each launch point, at the middle and at the bad end of the distribution?',
    sql:
`-- Means hide the tail, and the tail is where people die. Median and 90th
-- percentile are computed by rank rather than by an aggregate function,
-- because SQLite has no percentile builtin.
WITH d AS (
  SELECT lp.name AS launch_point,
         lp.afloat,
         dl.delay_min AS delay
  FROM delivery dl
  JOIN sortie s      ON s.id  = dl.sortie_id
  JOIN airframe a    ON a.id  = s.airframe_id
  JOIN launch_point lp ON lp.id = a.launch_point_id
  WHERE dl.delivered = 1 AND dl.delay_min IS NOT NULL
),
ranked AS (
  SELECT launch_point,
         afloat,
         delay,
         ROW_NUMBER() OVER (PARTITION BY launch_point ORDER BY delay) AS rn,
         COUNT(*)     OVER (PARTITION BY launch_point)                AS n
  FROM d
)
SELECT launch_point,
       CASE WHEN afloat = 1 THEN 'afloat' ELSE 'ashore' END AS basing,
       MAX(n)                                              AS deliveries,
       ROUND(AVG(CASE WHEN rn IN ((n + 1) / 2, (n + 2) / 2) THEN delay END), 1) AS median_min,
       ROUND(MAX(CASE WHEN rn = (9 * n + 9) / 10 THEN delay END), 1)            AS p90_min,
       ROUND(MAX(delay), 1)                                                     AS worst_min
FROM ranked
GROUP BY launch_point, afloat
ORDER BY p90_min DESC;`
  },

  {
    name: 'Waste by responder tier',
    question: 'When a payload arrived and did no good, what was the training level of the person standing next to the casualty?',
    sql:
`-- The receiver-capability constraint, measured. A tourniquet kit anyone can
-- apply; whole blood needs a 68W. Delivering the second to a buddy-aid
-- casualty burns the airframe, the unit and the time.
SELECT c.responder_tier,
       dl.payload,
       COUNT(*)                                        AS wasted_stops,
       ROUND(100.0 * COUNT(*)
             / (SELECT COUNT(*) FROM delivery WHERE delivered = 0), 1) AS pct_of_all_waste,
       ROUND(AVG(dl.delay_min), 1)                     AS mean_delay_min,
       GROUP_CONCAT(DISTINCT dl.waste_reason)          AS reasons
FROM delivery dl
JOIN casualty c ON c.id = dl.casualty_id
WHERE dl.delivered = 0
GROUP BY c.responder_tier, dl.payload
ORDER BY wasted_stops DESC;`
  },

  {
    name: 'Blood ledger and waste rate',
    question: 'Per launch point, how many units of blood and plasma were issued against how many were destroyed?',
    sql:
`-- Reasons are free text from the simulation, so waste is matched on a
-- substring rather than an exact code — new waste reasons should still land in
-- the right column without editing this query.
SELECT lp.name                                          AS launch_point,
       st.item,
       SUM(CASE WHEN st.delta > 0 THEN st.delta ELSE 0 END)  AS received,
       SUM(CASE WHEN st.delta < 0 AND UPPER(st.reason) NOT LIKE '%WASTE%'
                THEN -st.delta ELSE 0 END)                   AS issued,
       SUM(CASE WHEN st.delta < 0 AND UPPER(st.reason) LIKE '%WASTE%'
                THEN -st.delta ELSE 0 END)                   AS destroyed,
       ROUND(100.0 * SUM(CASE WHEN st.delta < 0 AND UPPER(st.reason) LIKE '%WASTE%'
                              THEN -st.delta ELSE 0 END)
             / NULLIF(SUM(CASE WHEN st.delta < 0 THEN -st.delta ELSE 0 END), 0), 1) AS waste_rate_pct
FROM stock_txn st
JOIN launch_point lp ON lp.id = st.launch_point_id
WHERE st.item IN ('BLOOD','PLASMA')
GROUP BY lp.name, st.item
ORDER BY destroyed DESC, launch_point;`
  },

  {
    name: 'Escalations and the human decision',
    question: 'On what grounds did the system ask for authorisation, how often did the operator agree, and how long did the decision take?',
    sql:
`-- escalation_reasons is one comma-separated list per proposal, so it is split
-- into rows first. Reasons that carry a number ("THREAT TRANSIT 12%", "LAST
-- WHOLE BLOOD") are folded back to their family, otherwise every proposal
-- becomes its own group and the counts say nothing.
WITH RECURSIVE split(id, state, t_raised, t_acted, rest, reason) AS (
  SELECT id, state, t_raised, t_acted, escalation_reasons || ',', ''
  FROM proposal
  WHERE escalation_reasons IS NOT NULL AND escalation_reasons <> ''
  UNION ALL
  SELECT id, state, t_raised, t_acted,
         SUBSTR(rest, INSTR(rest, ',') + 1),
         TRIM(SUBSTR(rest, 1, INSTR(rest, ',') - 1))
  FROM split
  WHERE rest <> ''
),
grounds AS (
  SELECT CASE
           WHEN reason LIKE 'THREAT TRANSIT%' THEN 'THREAT TRANSIT'
           WHEN reason LIKE 'LAST %'          THEN 'LAST UNIT IN STOCK'
           ELSE reason
         END AS ground,
         state, t_raised, t_acted
  FROM split
  WHERE reason <> ''
)
SELECT ground,
       COUNT(*)                                                     AS raised,
       SUM(CASE WHEN state = 'APPROVED' THEN 1 ELSE 0 END)          AS approved,
       SUM(CASE WHEN state = 'REJECTED' THEN 1 ELSE 0 END)          AS rejected,
       SUM(CASE WHEN state = 'EXPIRED'  THEN 1 ELSE 0 END)          AS expired_undecided,
       ROUND(100.0 * SUM(CASE WHEN state = 'APPROVED' THEN 1 ELSE 0 END)
             / NULLIF(SUM(CASE WHEN state IN ('APPROVED','REJECTED') THEN 1 ELSE 0 END), 0), 1)
                                                                    AS approval_pct,
       ROUND(AVG(CASE WHEN t_acted IS NOT NULL THEN t_acted - t_raised END), 2)
                                                                    AS mean_decision_min
FROM grounds
GROUP BY ground
ORDER BY raised DESC;`
  },

  {
    name: 'Treatment inside the deadline',
    question: 'Does reaching a casualty before their predicted collapse actually change whether they live?',
    sql:
`-- deadline_min carries a large sentinel for casualties with no modelled
-- collapse time; those rows would swamp the comparison and are dropped.
SELECT CASE
         WHEN c.t_treated IS NULL THEN 'never treated'
         WHEN c.t_treated - c.t_injury <= c.deadline_min THEN 'treated inside deadline'
         ELSE 'treated after predicted collapse'
       END                                                          AS served,
       c.triage,
       COUNT(*)                                                     AS casualties,
       SUM(CASE WHEN c.outcome = 'SAVED' THEN 1 ELSE 0 END)         AS saved,
       ROUND(100.0 * SUM(CASE WHEN c.outcome = 'SAVED' THEN 1 ELSE 0 END)
             / COUNT(*), 1)                                         AS survival_pct,
       ROUND(AVG(c.t_treated - c.t_injury), 1)                      AS mean_time_to_treatment_min,
       ROUND(AVG(c.deadline_min), 1)                                AS mean_deadline_min
FROM casualty c
WHERE c.deadline_min < 9000
  AND c.triage IN ('IMMEDIATE','DELAYED')
GROUP BY served, c.triage
ORDER BY c.triage, served;`
  },

  {
    name: 'Airframe utilisation',
    question: 'Which aircraft actually did the work — sorties flown, stops per sortie, and how many of those stops landed?',
    sql:
`SELECT a.callsign,
       a.platform,
       lp.name                                                   AS launch_point,
       COUNT(DISTINCT s.id)                                      AS sorties,
       COUNT(dl.id)                                              AS stops,
       SUM(CASE WHEN dl.delivered = 1 THEN 1 ELSE 0 END)         AS delivered,
       ROUND(1.0 * COUNT(dl.id) / NULLIF(COUNT(DISTINCT s.id), 0), 2) AS stops_per_sortie,
       ROUND(AVG(s.t_return - s.t_launch), 1)                    AS mean_sortie_min,
       -- An airframe deployed late has had less of the mission to work in.
       ROUND(a.deployed_min, 1)                                  AS deployed_at_min
FROM airframe a
LEFT JOIN launch_point lp ON lp.id = a.launch_point_id
LEFT JOIN sortie s        ON s.airframe_id = a.id
LEFT JOIN delivery dl     ON dl.sortie_id = s.id
GROUP BY a.id
ORDER BY delivered DESC, sorties DESC;`
  },

  {
    name: 'Commander-designated casualties',
    question: 'Did high-value assets get served faster than everyone else, and did it show in their outcomes?',
    sql:
`-- Split by triage as well as by designation: high-value assets are not drawn
-- evenly across triage categories, so the pooled comparison is confounded.
SELECT CASE WHEN c.hva = 1 THEN 'commander-designated' ELSE 'everyone else' END AS cohort,
       c.triage,
       COUNT(*)                                                   AS casualties,
       ROUND(100.0 * SUM(CASE WHEN c.outcome = 'SAVED' THEN 1 ELSE 0 END)
             / COUNT(*), 1)                                       AS survival_pct,
       ROUND(AVG(c.t_treated - c.t_injury), 1)                    AS mean_time_to_treatment_min,
       SUM(CASE WHEN c.t_treated IS NULL THEN 1 ELSE 0 END)       AS never_reached
FROM casualty c
GROUP BY cohort, c.triage
ORDER BY c.triage, cohort;`
  },

  {
    name: 'Unit effectiveness over time',
    question: 'How did combat effectiveness move across the mission for each unit, and where did it fall fastest?',
    sql:
`-- Polls are irregular, so they are binned into quarter-hours before the
-- change column is taken; otherwise the delta measures polling cadence rather
-- than the unit's condition.
WITH bins AS (
  SELECT u.name                              AS unit,
         CAST(tp.t / 15 AS INTEGER) * 15     AS bin,
         AVG(tp.effectiveness)               AS eff,
         MAX(tp.wounded)                     AS wounded,
         MAX(tp.killed)                      AS killed,
         COUNT(*)                            AS polls
  FROM telemetry_poll tp
  JOIN unit u ON u.id = tp.unit_id
  GROUP BY u.name, bin
)
SELECT unit,
       bin                                                        AS mission_min,
       ROUND(eff * 100, 1)                                        AS effectiveness_pct,
       ROUND((eff - LAG(eff) OVER (PARTITION BY unit ORDER BY bin)) * 100, 1) AS change_pts,
       wounded,
       killed,
       polls
FROM bins
ORDER BY unit, bin;`
  },

  {
    name: 'Cold chain excursions',
    question: 'Which deliveries handed over blood outside the 1-10 degree transfusable band, and how far out were they?',
    sql:
`SELECT dl.id                                       AS delivery_id,
       a.callsign,
       lp.name                                      AS launch_point,
       dl.casualty_id,
       ROUND(dl.container_c, 1)                     AS container_c,
       ROUND(dl.delay_min, 1)                       AS delay_min,
       CASE WHEN dl.container_c > 10 THEN 'above band'
            ELSE 'below band' END                   AS excursion,
       CASE WHEN dl.delivered = 1 THEN 'handed over anyway'
            ELSE 'discarded' END                    AS disposition
FROM delivery dl
JOIN sortie s        ON s.id = dl.sortie_id
JOIN airframe a      ON a.id = s.airframe_id
LEFT JOIN launch_point lp ON lp.id = a.launch_point_id
WHERE dl.payload = 'BLOOD'
  AND dl.container_c IS NOT NULL
  AND (dl.container_c > 10 OR dl.container_c < 1)
ORDER BY dl.container_c DESC;`
  },

  {
    name: 'Cost of being the second stop',
    question: 'Multi-stop routing buys reach — what does it cost the casualties who are not first on the route?',
    sql:
`WITH ordered AS (
  SELECT dl.sortie_id,
         dl.casualty_id,
         dl.delay_min,
         dl.delivered,
         ROW_NUMBER() OVER (PARTITION BY dl.sortie_id ORDER BY dl.t_arrive) AS stop_no
  FROM delivery dl
)
SELECT o.stop_no,
       COUNT(*)                                                   AS stops,
       ROUND(AVG(o.delay_min), 1)                                 AS mean_delay_min,
       ROUND(100.0 * SUM(CASE WHEN o.delivered = 1 THEN 1 ELSE 0 END)
             / COUNT(*), 1)                                       AS delivered_pct,
       ROUND(100.0 * SUM(CASE WHEN c.outcome = 'SAVED' THEN 1 ELSE 0 END)
             / COUNT(*), 1)                                       AS survival_pct
FROM ordered o
JOIN casualty c ON c.id = o.casualty_id
GROUP BY o.stop_no
ORDER BY o.stop_no;`
  },

  {
    name: 'Fleet deployment latency',
    question: 'How long did it take to get airframes forward once someone asked, and did an automatic threshold beat a human request?',
    sql:
`SELECT d."trigger",
       d.actor,
       COUNT(*)                                    AS deployments,
       SUM(d.airframes)                            AS airframes_pushed,
       SUM(d.launch_points)                        AS launch_points_opened,
       ROUND(AVG(d.t_complete - d.t_requested), 1) AS mean_latency_min,
       ROUND(MAX(d.t_complete - d.t_requested), 1) AS worst_latency_min,
       ROUND(MIN(d.t_requested), 1)                AS first_request_min
FROM deployment d
GROUP BY d."trigger", d.actor
ORDER BY deployments DESC;`
  },

  {
    name: 'Audit log by actor',
    question: 'Who did what during this mission, and how much of it was the machine acting under delegated authority?',
    sql:
`-- The chain itself is verified elsewhere; this is the shape of the record.
-- The window column shows each actor's share of everything logged.
SELECT ae.actor,
       ae.action,
       COUNT(*)                                            AS events,
       ROUND(MIN(ae.t), 1)                                 AS first_min,
       ROUND(MAX(ae.t), 1)                                 AS last_min,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)  AS pct_of_log
FROM audit_event ae
GROUP BY ae.actor, ae.action
ORDER BY events DESC;`
  }
];

