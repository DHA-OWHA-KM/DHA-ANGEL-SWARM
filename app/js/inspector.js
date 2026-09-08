/* ============================================================================
   ANGEL SWARM — LEFT INSPECTOR (336px)

   The one column the approved console mockup (mock-I1) carries that the built
   shell did not: the record of the object currently selected, standing between
   the left icon rail and the map, 336px wide, never a gutter.

   It is modelled on the client's own reference console — the anti-drone track
   inspector — and keeps that console's idiom exactly:

     · a selection counter above a mono identifier
     · a triage chip and a classification line
     · a transport strip for the SELECTED OBJECT's own timeline, not the run's
     · one highlighted sub-block for the measurement an operator asks for first
       (there: distance to placemark; here: distance to the nearest launch
       point) with a "+ N more" affordance onto the rest of them
     · a two-column key/value grid, 10px sans label over 11.5px mono value
     · a reverse-chronological event list (there: TRACK HISTORY; here: TASKING
       HISTORY)
     · small chips at the foot

   EVERYTHING IN IT IS THE LIVE RUN. There is no mock data in this file. Every
   value is read from APP.armA at paint time, and every figure that also
   appears somewhere else in the application is taken from COUNT so the two
   cannot drift apart. Where the mockup shows a quantity the simulation does
   not model, the row is not invented — it is dropped. The three that fell out
   are recorded at the foot of this file.

   WHAT IT CARRIES, AND WHERE
     Not the same thing everywhere. `RAIL`, below, is an explicit table from
     destination to the blocks that destination gets — and the destinations
     absent from it get no column at all, not an empty one: the aside is
     taken out of the flex row and the main window is 336 px wider. A run
     summary standing beside a doctrine passage or a SQL result is not
     context, it is a second page competing with the first, and it was the
     operator's complaint in his own words. See the table's own note.

   WHAT DRIVES IT
     APP.sel — {kind:'cas'|'drone', id} — is the whole of the selection state,
     and it is written by the map, by the casualty register, by the fleet
     table and by the command palette already. This file only reads it. Prev
     and next step APP.sel through the selection set and call the host's
     render(), so a step from here is indistinguishable from a click on the
     map.

   ROLES (ROLE_CONTRACT.md §4: mark up, do not filter)
     Every role-specific cell carries data-roles as it is generated, so the
     stylesheet rule in css/polish.css has the answer the instant the markup
     lands and there is nothing to re-run. No role loses a capability: the
     panel is presentation, the selection it reflects is not. Every role keeps
     a populated panel — the allow-lists below are checked in verification, not
     assumed.

   THEME
     Every colour is a token from THEME_CONTRACT.md. There is not one hex
     literal in the stylesheet this file injects. The measured worst coloured
     run is --t-dim on --k3 at 4.90:1 (console-dark), which is why --t-dim
     never appears on --k4 or --k5 anywhere below — on those two surfaces it
     measures 4.47:1 and 3.71:1 and would break the contract. Hover is --k3
     for exactly that reason.

   COST
     render() runs at 60 Hz on the mission view. This paints on a 180 ms floor
     and then only when the generated markup actually differs from what is on
     screen, so a still selection costs one string compare a frame and no DOM
     work at all.
   ========================================================================== */
(function () {
  'use strict';

  var ANGEL = window.ANGEL = window.ANGEL || {};

  /* Nothing in this file may be the reason the console fails to start. */
  function safe(label, fn, dflt) {
    return function () {
      try { return fn.apply(this, arguments); }
      catch (e) { console.warn('[inspector:' + label + '] ' + e); return dflt; }
    };
  }

  var W = 336;                      /* the approved width, in px */
  /* Below this the column is withheld rather than squeezed. The console's
     chrome is 36 + 336 + 36 = 408 px with this panel in it, and the host's
     own record drawer takes a further 352 px whenever something is selected;
     under 1280 px there is not enough left for the map to be a map. This is
     the same floor the rest of the console is verified against. */
  var MINVIEW = 1280;
  var FOLDKEY = 'angel.insp.folds';

  /* ---------------------------------------------------------------- state */
  var folded = readFolds();         /* Set of section keys the operator shut */
  var lpIdx = 0;                    /* which launch point the hl block names */
  var lastSig = null;               /* markup signature, to avoid DOM churn */
  var lastAt = 0;
  var host = null;
  /* A press is in progress somewhere in this column. paint() replaces
     host.innerHTML wholesale, so a repaint between mousedown and mouseup
     detaches the node the operator is pressing and the click event then
     retargets to a common ancestor and matches nothing — the press is
     silently lost. Holding the repaint for the ~100 ms a press lasts costs
     nothing visible and makes every control in the column, including the
     promoted ones, land every time. Same conclusion js/doctrine.js reached
     about the drawer, reached the other way round. */
  var pressed = false;

  /* Shut on arrival. The run feed is a scrolling narration of events the
     stream pane already carries in full; it is one press away rather than
     four lines of prose on every destination. Only applied on a first visit
     — once the operator has set a fold of their own, their set is theirs. */
  function readFolds() {
    /* Declared inside: `var folded = readFolds()` runs above this function,
       so a `var` at file scope would still be undefined when it is read. */
    var DEFAULTS = ['histRun'];
    var s = new Set();
    try {
      var raw = localStorage.getItem(FOLDKEY);
      if (raw == null) { DEFAULTS.forEach(function (k) { s.add(k); }); return s; }
      var v = JSON.parse(raw || '[]');
      if (Array.isArray(v)) v.forEach(function (k) { s.add(k); });
    } catch (e) { DEFAULTS.forEach(function (k) { s.add(k); }); }
    return s;
  }
  function writeFolds() {
    try { localStorage.setItem(FOLDKEY, JSON.stringify(Array.from(folded))); }
    catch (e) { /* denied */ }
  }

  /* ----------------------------------------------------------- formatting */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function pad(n, w) { return ('00000' + Math.abs(Math.round(n))).slice(-(w || 2)); }
  /* A count, or an em dash. Never "NaN" and never a bare "null" on screen. */
  function n(v) { return (v === null || v === undefined || !isFinite(v)) ? '—' : String(Math.round(v)); }
  /* T+HH:MMZ — the console's clock, same shape as the top strip's. */
  function zclock(m) { return 'T+' + pad(Math.floor(m / 60)) + ':' + pad(Math.floor(m % 60)) + 'Z'; }
  /* HH:MM:SS — the tasking history's stamp, same shape as the reference's. */
  function hms(m) {
    var s = Math.max(0, m) * 60;
    return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(Math.floor(s % 60));
  }
  function n1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function words(s) { return String(s || '').replace(/_/g, ' '); }

  /* A grid reference an operator can read back over a radio. The simulation
     works in kilometres on a local grid, not in latitude and longitude, so
     this is the honest conversion of that grid into the zone the scenario
     declares: the zone designator is the scenario's own, the 100 km square is
     seeded deterministically from the scenario key so one operation always
     reads the same square, and the five-digit easting and northing are the
     casualty's own metres. Same casualty, same string, every run. */
  var E_LET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   /* MGRS drops I and O */
  var N_LET = 'ABCDEFGHJKLMNPQRSTUV';
  function gridRef(scn, x, y) {
    if (!scn) return '—';
    var h = 0, k = String(scn.key || scn.aor || '');
    for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
    var ec = (h % E_LET.length + Math.floor(x / 100)) % E_LET.length;
    var nc = ((h >>> 5) % N_LET.length + Math.floor(y / 100)) % N_LET.length;
    return (scn.gridZone || '—') + ' ' + E_LET[ec] + N_LET[nc] + ' ' +
      pad((x % 100) * 1000, 5) + ' ' + pad((y % 100) * 1000, 5);
  }
  /* Grid north is up-screen and y grows southward, which is why this is
     atan2(dx, -dy) and not the textbook atan2(dy, dx). */
  function bearing(fx, fy, tx, ty) {
    var d = Math.atan2(tx - fx, -(ty - fy)) * 180 / Math.PI;
    return pad((d + 360) % 360, 3);
  }
  function km(a, b, c, d) { return Math.sqrt((a - c) * (a - c) + (b - d) * (b - d)); }

  /* The simulation's tables are top-level `const` declarations in classic
     scripts. A `const` at the top level of a classic script lands in the
     global LEXICAL environment and NOT on `window`, so `window.TIERS` is
     undefined while the bare name `TIERS` resolves perfectly from here — this
     file is a classic script too and shares that scope. Reading them through
     `window` was the bug that printed "A/C-02" where the fleet prints
     "TRV-02". Every one of them is read by bare name, guarded by `typeof` so
     a module that failed to load is a missing table rather than a
     ReferenceError that takes the column down.
     Function declarations DO land on `window`, which is why G() below is
     allowed to keep looking there. */
  function G(name) { return typeof window[name] === 'function' ? window[name] : null; }
  function T(name) {
    switch (name) {
      case 'TIERS':    return typeof TIERS    !== 'undefined' ? TIERS    : null;
      case 'ROLES':    return typeof ROLES    !== 'undefined' ? ROLES    : null;
      case 'PAYLOADS': return typeof PAYLOADS !== 'undefined' ? PAYLOADS : null;
      case 'PAYSHORT': return typeof PAYSHORT !== 'undefined' ? PAYSHORT : null;
      case 'CALLSIGN': return typeof CALLSIGN !== 'undefined' ? CALLSIGN : null;
      default: return window[name];
    }
  }
  function callsign(d) {
    var C = T('CALLSIGN');
    return d ? ((C && C[d.type]) || String(d.plat && d.plat.key || 'A/C')) + '-' + pad(d.id) : '—';
  }
  function payShort(k) {
    var P = T('PAYSHORT');
    return (P && P[k]) || words(k);
  }
  /* The operation tag the identifiers carry, e.g. JOA CORAL -> JOACORAL. */
  function aorTag() {
    var S = scn();
    return String((S && S.aor) || 'JOA').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  }
  /* Stream text is written to be read as prose in the ground-truth pane. In a
     336px column only the first sentence fits, and the phase chip beside it
     already carries the rest of the meaning. */
  function firstSentence(t) {
    var s = String(t || '').trim();
    var i = s.indexOf('. ');
    if (i > 0 && i < 96) return s.slice(0, i + 1);
    return s.length > 110 ? s.slice(0, 108).replace(/\s+\S*$/, '') + '…' : s;
  }
  function armA() { return window.APP && APP.armA; }
  function scn() { return window.APP && APP.world && APP.world.scn; }
  /* The horizon every pane in this application reads. Never a local clock. */
  function clock() {
    var C = window.COUNT;
    var t = C ? C.clock() : (APP.finished ? Infinity : APP.tView);
    return t === Infinity ? APP.world.scn.durationMin : Math.min(t, APP.tView);
  }
  function roleAttr(list) { return list ? ' data-roles="' + list + '"' : ''; }

  /* ============================================================ THE SET ===
     "SELECTION 2 OF 6" needs a set to be 2 of. An operator steps through the
     casualties that are still on the ground — that is the queue the panel is
     for — and only when there are none left does the set widen to everyone
     the clock knows about, which is the state a finished run is always in.
     Both populations are the ones the foot ribbon already counts, under the
     same clock horizon, so the counter and the ribbon cannot disagree. */
  function selectionSet(sel) {
    var A = armA();
    if (!A) return { list: [], label: 'WOUNDED' };
    var t = clock();
    var known = A.casualties.filter(function (c) { return c.tInjury <= t; });
    var open = known.filter(function (c) { return c.outcome === null; });
    var wide = { list: known, label: 'WOUNDED' };
    if (!open.length) return wide;
    /* A selection the queue no longer holds — a casualty who has since been
       resolved, reached from the register or from the map — is counted
       against everyone the clock knows about rather than against a set of
       one, which is what "SELECTION 1 OF 1" used to claim. */
    if (sel != null && !open.some(function (c) { return c.id === sel; })) return wide;
    return { list: open, label: 'ON THE GROUND' };
  }

  /* ==================================================== TASKING HISTORY ===
     The mockup shows a track history. The simulation does not keep one list
     called that, and inventing one would have been the easy wrong answer. It
     keeps four records, each of which is authoritative for a different kind
     of event, and this merges them and sorts descending:

       c.tInjury          the 9-line itself — when the casualty entered the
                          picture, and with what triage category
       c.tele             the wearable. Only the ZONE CHANGE bursts are shown:
                          the routine 45 s traffic is 200 rows of nothing and
                          the zone crossings are the ones a decision hung on
       arm.audit          the hash-chained authorisation record — ESCALATE,
                          APPROVE, REJECT, EXPIRE, AUTO-DISPATCH, PRIORITY,
                          WASTE, TREAT. Matched on the CAS-<id> token the
                          allocator writes into `detail`, word-bounded so
                          CAS-8 does not match CAS-84
       arm.sortieLog      the launch, and WHO authorised it — reached through
                          the delivery log's sortieId, because a casualty does
                          not carry a sortie id of its own
       arm.stream         what the aircraft reported: on station, payload
                          away, recovered, undeliverable, administered
       arm.deliveryLog    what actually happened to each package, including
                          the failures the stream phrases more gently
       c.decision         the tasking decision itself, with the margin against
                          the physiological deadline it was taken on

     Rows carry the aircraft they belong to, so clicking one selects that
     aircraft — which is the reference console's behaviour and the reason the
     history is worth having rather than merely reading.  */
  function history(c) {
    var A = armA(), rows = [], t = clock();
    if (!A) return rows;
    var tag = new RegExp('\\bCAS-' + c.id + '\\b');

    var add = function (tt, text, mark, markCls, droneId) {
      if (tt > t + 1e-6) return;
      rows.push({ t: tt, text: text, mark: mark || '', cls: markCls || '', drone: droneId == null ? null : droneId });
    };

    /* 1 · the 9-line */
    add(c.tInjury, '9-line received · triage', c.cls, triClass(c.cls));

    /* 2 · the wearable, zone crossings only */
    (c.tele || []).forEach(function (r) {
      if (r.trigger !== 'ZONE CHANGE') return;
      add(r.t, 'Reserve <b>' + (r.v / 100).toFixed(2) + ' CRI</b> · zone', r.zone,
        r.zone === 'RED' ? 'red' : r.zone === 'AMBER' ? 'amb' : 'grn');
    });

    /* 3 · the tasking decision, and the margin it was taken on */
    if (c.decision) {
      var D = c.decision;
      add(D.t, '<b>' + esc(D.call) + '</b> tasked from ' + esc(D.base) + ' · ' + esc(payShort(D.payload)),
        D.marginMin == null ? '' : (D.marginMin >= 0 ? 'MAKES IT BY ' + Math.round(D.marginMin)
          : 'MISSES BY ' + Math.round(-D.marginMin)),
        D.marginMin == null ? '' : (D.marginMin >= 0 ? 'grn' : 'red'), D.drone);
    }

    /* 4 · the launch, and who authorised it */
    var sorties = new Set();
    (A.deliveryLog || []).forEach(function (d) { if (d.casId === c.id) sorties.add(d.sortieId); });
    (A.drones || []).forEach(function (d) {
      if (d.sortieId != null && (d.target === c.id ||
        (d.route || []).some(function (l) { return l.casId === c.id; }))) sorties.add(d.sortieId);
    });
    (A.sortieLog || []).forEach(function (s) {
      if (!sorties.has(s.id)) return;
      var d = (A.drones || []).filter(function (x) { return x.id === s.droneId; })[0];
      add(s.tLaunch, 'Launched from <b>' + esc(d ? d.baseName : 'the launch point') + '</b> ·',
        s.actor, s.actor === 'STANDING AUTHORITY' ? 'grn' : 'cyan', s.droneId);
    });

    /* 5 · the authorisation record */
    (A.audit || []).forEach(function (e) {
      if (!tag.test(e.detail || '')) return;
      add(e.t, esc(e.detail).replace(/CAS-\d+/g, function (s) { return '<b>' + s + '</b>'; }),
        e.action, auditClass(e.action));
    });

    /* 6 · what the aircraft reported */
    (A.stream || []).forEach(function (e) {
      if (e.casId !== c.id) return;
      add(e.t, '<b>' + esc(e.call) + '</b> ' + esc(firstSentence(e.text)), e.phase, phaseClass(e.phase), e.droneId);
    });

    /* 7 · what happened to each package */
    (A.deliveryLog || []).forEach(function (d) {
      if (d.casId !== c.id || d.ok) return;                 /* the ok case is in the stream */
      add(d.t, esc(payShort(d.payload)) + ' not administered · ' + esc(d.wasteReason || 'unusable'),
        'WASTED', 'red');
    });

    rows.sort(function (a, b) { return b.t - a.t; });
    return rows.slice(0, 16);
  }

  function historyDrone(d) {
    var A = armA(), rows = [], t = clock();
    if (!A) return rows;
    (A.stream || []).forEach(function (e) {
      if (e.droneId !== d.id || e.t > t) return;
      rows.push({
        t: e.t, text: esc(firstSentence(e.text)), mark: e.phase, cls: phaseClass(e.phase),
        cas: e.casId == null ? null : e.casId
      });
    });
    (A.sortieLog || []).forEach(function (s) {
      if (s.droneId !== d.id || s.tLaunch > t) return;
      rows.push({ t: s.tLaunch, text: 'Sortie ' + s.id + ' launched · ' + s.stops + ' stop(s) ·', mark: s.actor, cls: 'grn', cas: null });
    });
    rows.sort(function (a, b) { return b.t - a.t; });
    return rows.slice(0, 16);
  }

  function triClass(cls) {
    return cls === 'IMMEDIATE' ? 'red' : cls === 'DELAYED' ? 'yel'
      : cls === 'MINIMAL' ? 'grn' : 'grey';
  }
  function auditClass(a) {
    if (a === 'WASTE' || a === 'REJECT' || a === 'EXPIRE') return 'red';
    if (a === 'ESCALATE') return 'amb';
    if (a === 'TREAT' || a === 'APPROVE') return 'grn';
    return 'cyan';
  }
  function phaseClass(p) {
    if (/LOST|UNDELIVERABLE|NOT RECOVERED|BROKEN|CASUALTY LOST/.test(p)) return 'red';
    if (/STABLE|RECOVERED|ADMINISTERED/.test(p)) return 'grn';
    return 'cyan';
  }

  /* ================================================== FRAGMENT BUILDERS ===
     Small, dumb, and all of them take their colour from a token class rather
     than a hex, so a theme switch is a repaint and not a recalculation. */
  function sec(key, label, roles) {
    var open = !folded.has(key);
    return '<div class="nsp-sec" data-nsp-fold="' + key + '"' + roleAttr(roles) + ' role="button" tabindex="0"' +
      ' aria-expanded="' + open + '"><span>' + esc(label) + '</span>' +
      '<i class="nsp-chev' + (open ? '' : ' shut') + '"><svg class="ic14" aria-hidden="true"><use href="#i-chev"/></svg></i></div>';
  }
  function body(key, inner, roles, style) {
    if (folded.has(key)) return '';
    return '<div class="nsp-body"' + roleAttr(roles) + (style ? ' style="' + style + '"' : '') + '>' + inner + '</div>';
  }
  /* One key/value cell. `roles` is the allow-list; absent means every role.
     `extra` is trusted markup appended under the sub-line — the only user is
     the reserve sparkline, which has to sit inside the cell that states the
     number it draws. */
  function kv(label, value, cls, sub, roles, extra, provKey, provWhy) {
    if (value == null) return '';
    return '<div' + roleAttr(roles) + '><div class="nsp-k">' + esc(label) + '</div>' +
      '<div class="nsp-v' + (cls ? ' ' + cls : '') + (provKey ? ' hasProv' : '') + '">' +
      value + (provKey ? mark(provKey, provWhy) : '') +
      (sub ? '<br><small>' + sub + '</small>' : '') + '</div>' +
      (extra || '') + '</div>';
  }

  /* ================================================ PROVENANCE, IN HERE ===
     Where a row's value came out of a trained model, the key says so, in the
     same component the rest of the application uses — js/app.js owns it, and
     `prov()` is a top-level declaration in a classic script loaded before this
     one, so it is simply there. Guarded so a badge can never be the thing
     that stops a casualty rendering.

     Three rows in this column carry the AI mark and exactly three:
     COMPENSATORY RESERVE, TREND and DEADLINE — the network's output, its
     slope, and the clock derived from it. Every other calculated row carries
     the DETERMINISTIC mark, which names the kind of arithmetic rather than
     going blank: ASSIGNED is the tasking optimiser, ETA and AIRCRAFT IN REACH
     are geometry against published airframe figures, QUALIFIED TIER is the
     TCCC scope of practice applied, and the two counts are read off the run's
     own record. The point of the second mark being visibly different is that
     a reviewer reading this column can see the boundary between learned and
     written without being told where it is — and, since v3.6, can see that
     the unmarked rows are the ones that are not calculations at all.

     No data-roles on the marks. A mark is part of the row it explains and
     inherits that row's visibility; badging something a role cannot see would
     be badging nothing. */
  /* COMPACT, ALWAYS. This column is 336 px wide and its value rows are a
     flex line that already carries a number, a unit and a sub-label; the full
     mark with its tag would push past the column's right edge rather than
     wrapping cleanly. The compact form keeps the glyph and the model's name
     and drops only the tag.

     There is ONE mark in the designed set and it says a trained model
     produced the figure. `prov()` returns an empty string for every key that
     is not a model, so a deterministic row draws nothing at all — which is
     correct, and is why nothing below tests for a second kind of mark. */
  function mark(k, why) {
    return (typeof window.prov === 'function') ? window.prov(k, why, { compact: true }) : '';
  }

  /* ==================================================== THE ACTION STRIP ===
     One line under the transport strip, and the reason the console has ONE
     record column instead of two.

     The host application carries a second, longer record surface — #drawer,
     352 px, built by js/app.js — which used to open on the same selection
     this column answers for. That printed the casualty twice and took 688 px
     of ground away from the map. It is now opened deliberately, from here.

     The two things in that drawer an operator reaches for without reading
     anything else are promoted into this strip rather than left behind it:
     the high-value designation (the same `data-hva` attribute the drawer and
     the casualty register both use, so it runs the host's own delegated
     handler and there is no second code path to keep in step) and the
     doctrine question (asked through the service js/doctrine.js publishes, so
     the wording stays that module's property). Everything else — the device
     card, the aircraft-selection table, the authorisation record, the prose
     — is one press away and unchanged.

     No data-roles on any of it. The drawer's own controls carry none either,
     and ROLE_CONTRACT §4 is mark up, do not filter: taking the designation
     away from a role that had it would be a capability regression. */
  function actions(kind, id, extras) {
    var h = '<div class="nsp-act">' + (extras || '');
    h += '<span class="nsp-actsp"></span>' +
      '<button class="nsp-ab go" type="button" data-fullrecord="' + kind + '" data-frid="' + id + '"' +
      ' title="Open the full record: reserve trace, the device on the soldier, why this aircraft, the authorisation record">' +
      'FULL RECORD <svg class="ic14 nsp-rt" aria-hidden="true"><use href="#i-chev"/></svg></button>';
    return h + '</div>';
  }
  /* The doctrine affordance exists only when js/doctrine.js has loaded AND
     has a measured question for this wound. A control that cannot answer is
     not drawn — the same rule the rest of the console is built on. */
  function docQuery(c) {
    var D = ANGEL.get && ANGEL.get('doctrine');
    if (!D || typeof D.needQuery !== 'function') return null;
    var need = c && c.needs && c.needs[0];
    if (!need) return null;
    try { return D.needQuery(need); } catch (e) { return null; }
  }
  function chip(text, cls) { return '<span class="nsp-tri ' + cls + '">' + esc(text) + '</span>'; }
  function tags(list) {
    return '<div class="nsp-tags">' + list.filter(Boolean).map(function (x) {
      return '<span class="nsp-tag">' + esc(x) + '</span>';
    }).join('') + '</div>';
  }
  function histRows(rows, attr) {
    if (!rows.length) return '<p class="nsp-none">Nothing in the record for this object yet. Not every casualty generates a proposal — the walking wounded are treated where they lie.</p>';
    return rows.map(function (r) {
      var sel = attr && r[attr] != null ? ' data-nsp-' + attr + '="' + r[attr] + '" tabindex="0" role="button"' : '';
      return '<div class="nsp-th' + (sel ? ' pick' : '') + '"' + sel + '><time>' + hms(r.t) + '</time>' +
        '<p>' + r.text + (r.mark ? ' <em class="' + r.cls + '">' + esc(r.mark) + '</em>' : '') + '</p></div>';
    }).join('');
  }

  /* ============================================================ CASUALTY === */
  function paintCasualty(c, set, idx) {
    var A = armA(), S = scn(), t = clock();
    var TIERS = T('TIERS') || {}, ROLES = T('ROLES') || {}, PAYLOADS = T('PAYLOADS') || {};
    var C = window.COUNT;

    /* Physiology is frozen the moment the casualty was resolved: a treated
       soldier's reserve is not still falling on the display. Same rule the
       host's own record drawer uses. */
    var resolved = c.outcome !== null || c.treated;
    var tRef = c.treated && c.tTreated != null ? c.tTreated
      : (c.outcome && c.tResolved != null ? c.tResolved : t);
    var crm = typeof c.crmAt === 'function' ? c.crmAt(tRef) : 0;
    var cri = crm / 100;
    var criCls = crm < 40 ? 'red' : crm < 70 ? 'amb' : 'grn';

    /* Deadline. `deadlineMin` is minutes from injury; >= 9000 is the
       simulation's way of saying "not time-critical", and it is printed as
       that rather than as an absurd number. */
    var untimed = c.deadlineMin >= 9000;
    var left = untimed ? null : c.deadlineMin - (tRef - c.tInjury);
    var dlCls = untimed ? 'grn' : left <= 0 ? 'red' : left < 15 ? 'red' : left < 40 ? 'amb' : 'grn';

    /* Nearest launch point — the reference console's "distance to placemark",
       and the number an operator asks for before any other. Every base is
       ranked; the block names one and the affordance steps through the rest. */
    var lps = (A.bases || []).map(function (b) {
      return { name: b.name, d: km(c.x, c.y, b.x, b.y), brg: bearing(b.x, b.y, c.x, c.y), stock: b.stock };
    }).sort(function (a, b) { return a.d - b.d; });
    var lp = lps[lpIdx % Math.max(1, lps.length)] || null;

    /* The aircraft on this casualty, live if there is one and historical if
       the tasking is already closed. */
    var dr = c.assignedTo != null
      ? (A.drones || []).filter(function (d) { return d.id === c.assignedTo; })[0] : null;
    var leg = dr && (dr.route || []).filter(function (l) { return l.casId === c.id; })[0];
    var eta = dr ? (dr.target === c.id ? dr.tArrive : (leg ? leg.eta : null)) : null;
    var assignedTxt = dr ? '<b>' + esc(callsign(dr)) + '</b>' : (c.decision ? '<b>' + esc(c.decision.call) + '</b>' : null);

    /* Who authorised the sortie that carried this casualty's package. */
    var sid = null;
    (A.deliveryLog || []).forEach(function (d) { if (d.casId === c.id) sid = d.sortieId; });
    if (sid == null && dr && dr.sortieId != null) sid = dr.sortieId;
    var sortie = sid == null ? null : (A.sortieLog || []).filter(function (s) { return s.id === sid; })[0];

    /* Responder capability against what the wound actually indicates. */
    var need0 = c.needs && c.needs[0];
    var reqTier = need0 && PAYLOADS[need0] ? PAYLOADS[need0].tier : null;
    var order = { T1: 1, T2: 2, T3: 3 };
    var short = reqTier && order[c.responder] < order[reqTier];

    /* The wearable's age, and where the picture actually came from. */
    var age = (resolved || c.knownAt === undefined) ? null : t - c.knownAt;
    var src = (c.tele && c.tele.length) ? 'MEDEVAC 9-LINE + WEARABLE' : 'MEDEVAC 9-LINE';

    /* Trend, in the units the reserve is quoted in: CRI per ten minutes. */
    var tl = c.tele || [];
    var slope = tl.length > 1
      ? (tl[tl.length - 1].v - tl[0].v) / Math.max(1, tl[tl.length - 1].t - tl[0].t) : 0;
    var per10 = slope / 10;
    var trend = slope > -0.02 ? 'STABLE' : 'FALLING';

    var delivered = (A.deliveryLog || []).filter(function (d) { return d.casId === c.id; });
    var okDeliv = delivered.filter(function (d) { return d.ok; })[0];

    /* --- header ---------------------------------------------------------- */
    var ident = 'CAS-' + pad(c.id, 3) + '-' + aorTag() +
      '-T' + pad(Math.floor(c.tInjury / 60)) + pad(Math.floor(c.tInjury % 60)) + 'Z';
    var cat = { IMMEDIATE: 'T1', DELAYED: 'T2', MINIMAL: 'T3', EXPECTANT: 'T4' }[c.cls] || '—';
    var h = '<div class="nsp-head">' +
      '<div class="nsp-grp">SELECTION ' + (idx + 1) + ' OF ' + set.list.length + ' · ' + esc(set.label) + '</div>' +
      '<div class="nsp-id">' + esc(ident) + '</div>' +
      '<div class="nsp-row1">' + chip(c.cls, triClass(c.cls)) +
      '<span class="nsp-sub">CAT <b>' + cat + '</b> · <b>' +
      esc((ROLES[c.role] && ROLES[c.role].short) || c.role) + '</b> · ' + esc(c.unitName || '') + '</span></div>' +
      '<div class="nsp-sub">SITE <b>' + esc(siteName(c)) + '</b> &nbsp;·&nbsp; SRC <b>' + src + '</b></div>' +
      (c.hva ? '<div class="nsp-sub amb">COMMANDER-DESIGNATED HIGH-VALUE ASSET</div>' : '') +
      '</div>';

    /* --- transport strip: this casualty's own clock ---------------------- */
    var span = untimed ? Math.max(1, (c.tResolved || t) - c.tInjury) : c.deadlineMin;
    var frac = Math.max(0, Math.min(1, (tRef - c.tInjury) / Math.max(0.01, span)));
    h += scrub(frac, zclock(tRef), resolved
      ? { txt: c.outcome || 'TREATED', cls: c.outcome === 'DIED' ? 'red' : 'grn' }
      : { txt: 'LIVE', cls: 'live' }, idx, set.list.length);

    /* --- action strip ---------------------------------------------------- */
    var dq = docQuery(c);
    h += actions('cas', c.id,
      '<button class="nsp-ab' + (c.hva ? ' on' : '') + '" type="button" data-hva="' + c.id + '"' +
      ' title="' + (c.hva
        ? 'Commander-designated: served ahead of queue order at equal clinical benefit'
        : 'Designate this casualty as a high-value asset') + '">' +
      '<svg class="ic14" aria-hidden="true"><use href="#i-star"/></svg>' +
      (c.hva ? 'HIGH-VALUE ASSET' : 'DESIGNATE HVA') + '</button>' +
      (dq ? '<button class="nsp-ab" type="button" data-nsp-doc="' + esc(dq) + '"' +
        ' title="' + esc(dq) + '">DOCTRINE</button>' : ''));

    /* --- CASUALTY DATA --------------------------------------------------- */
    var hl = lp ? '<div class="nsp-hl" data-nsp-lp="1" role="button" tabindex="0">' +
      '<div class="nsp-hk">DISTANCE TO NEAREST LAUNCH POINT' + mark('GEOMETRY',
        'great-circle distance from this soldier\u2019s grid to that launch point') + '</div>' +
      '<div class="nsp-hv">' + n1(lp.d) + ' km <span class="nsp-slash">/</span> ' + lp.brg + '&deg;' +
      '<span class="nsp-badge">' + esc(lp.name) + '</span></div>' +
      (lps.length > 1 ? '<div class="nsp-more">+ ' + (lps.length - 1) + ' more</div>' : '') +
      '</div>' : '';

    var grid = '<div class="nsp-kv">' +
      kv('LOCATION', esc(gridRef(S, c.x, c.y))) +
      /* Once a casualty is resolved the deadline stops counting down: the row
         reports how much of it was left at handoff, which is the fact a
         reviewer is actually asking about, rather than a live countdown on
         somebody who is no longer on the ground. */
      kv('DEADLINE', untimed ? 'NOT TIME-CRITICAL'
        : (left <= 0 ? 'PASSED' : Math.round(left) + ' min'), dlCls,
        untimed ? null
          : esc(resolved ? 'LEFT AT HANDOFF' : zclock(c.tInjury + c.deadlineMin)),
        null, null, 'CRI', 'the clock this counts down is the network\u2019s collapse estimate for this soldier, not a triage category') +

      /* The mockup's sub-line here is an anatomical site and a mechanism
         ("L GROIN · BLAST FRAG"). The simulation models neither, so this
         carries the one mechanism fact it does model — whether the wound is
         penetrating, which is what selects the steeper per-minute mortality
         odds ratio the deadline is computed from. */
      kv('INJURY', esc(words(c.injury)), null,
        c.penetrating ? 'PENETRATING' : 'BLUNT', 'ANALYST SURGEON') +
      /* The reserve TRACE, not just the reserve. A single number cannot say
         whether this soldier is holding or falling off a cliff, and that is
         the whole reason the sensor exists — so the shape comes with the
         figure rather than being 352 px away behind a second surface. Same
         series and same freeze-at-handoff rule as the drawer's full-size
         canvas; it is drawn in drawSparks() after the markup lands. */
      kv('COMPENSATORY RESERVE', cri.toFixed(2) + ' CRI', criCls,
        esc(resolved ? 'AT HANDOFF' : 'LAST RECEIVED'), 'ANALYST SURGEON COMMANDER',
        typeof c.crmAt === 'function'
          ? '<canvas class="nsp-spk" data-nsp-spk="' + c.id + '" aria-hidden="true"' +
            ' title="Compensatory reserve from wounding to ' + (resolved ? 'handoff' : 'now') +
            '. The dashed line is the 40 per cent floor. The full-size trace is in the record."></canvas>' : '',
        'CRI', 'this figure and the trace beside it are the network\u2019s output for this soldier') +

      kv('NEEDS', esc((c.needs || []).slice(0, 1).map(payShort).join('')), null,
        esc((c.needs || []).slice(1).map(payShort).join(' · ')), 'ANALYST SURGEON LOGISTICIAN') +
      kv('TREND', trend, trend === 'FALLING' ? 'red' : 'grn',
        (per10 >= 0 ? '+' : '−') + Math.abs(per10).toFixed(2) + ' CRI / 10 MIN', 'ANALYST SURGEON',
        null, 'CRI', 'the slope of the network\u2019s own output over this soldier\u2019s clock') +

      kv('ON SCENE', esc(TIERS[c.responder] ? TIERS[c.responder].name : c.responder), null,
        esc(TIERS[c.responder] ? TIERS[c.responder].training + ' TRAINED' : ''), 'ANALYST SURGEON LOGISTICIAN') +
      kv('QUALIFIED TIER', esc(c.responder), short ? 'amb' : 'grn',
        reqTier ? esc('of ' + reqTier + " req'd") : null, 'ANALYST SURGEON LOGISTICIAN',
        null, 'RULE', 'the TCCC scope of practice, compared against who is standing on this scene') +

      kv('ASSIGNED', assignedTxt || 'NONE', assignedTxt ? 'cyan' : 'grey',
        dr ? esc(dr.plat.label) : (c.decision ? 'TASKING CLOSED' : 'NO AIRCRAFT COMMITTED'),
        null, null, 'OPTIMISER', 'which aircraft, and in what order, is a scheduling result \u2014 no model chose it') +
      kv('ETA ON SITE', eta == null ? (okDeliv ? 'DELIVERED' : '—')
        : Math.max(0, Math.round(eta - t)) + ' min',
        eta == null ? (okDeliv ? 'grn' : 'grey')
          : (untimed || eta - c.tInjury <= c.deadlineMin ? 'grn' : 'red'),
        eta == null ? (okDeliv ? esc(zclock(okDeliv.t)) : null) : esc(zclock(eta)),
        null, null, 'GEOMETRY', 'route distance against this airframe\u2019s published cruise speed at this load') +

      kv('TASKED BY', sortie ? esc(sortie.actor) : (c.decision ? 'ANGEL SWARM' : 'NOT TASKED'),
        sortie && sortie.actor === 'STANDING AUTHORITY' ? 'grn' : null,
        sortie ? (sortie.proposalId == null ? 'NO HUMAN IN LOOP' : 'PROPOSAL ' + sortie.proposalId) : null,
        'ANALYST COMMANDER LOGISTICIAN') +
      kv('LAST UPDATED', age == null ? (c.knownAt === undefined ? 'NO TELEMETRY' : esc(zclock(c.knownAt)))
        : (age < 0.1 ? 'LIVE' : Math.round(age * 60) + ' s'),
        age != null && age > 2 ? 'amb' : null,
        c.knownQ !== undefined ? 'QUALITY ' + Math.round(c.knownQ * 100) + '%' : 'WEARABLE',
        'ANALYST SURGEON', null, 'COMPUTED',
        'the age of the last reading the tasking system actually received, off the ingest record') +

      kv('AIRCRAFT IN REACH', c.reachN === undefined ? '—' : String(c.reachN),
        c.reachN === 0 ? 'red' : c.reachN === 1 ? 'org' : 'grn',
        c.reachN === undefined ? null : esc(c.reachN <= 1 ? 'THINLY COVERED' : 'of ' + (A.drones || []).length + ' airframes'),
        'ANALYST COMMANDER LOGISTICIAN', null, 'GEOMETRY',
        'each airframe\u2019s combat radius at the load this casualty needs, against the distance to it') +
      kv('PAYLOAD ON THE GROUND', delivered.length ? esc(payShort((okDeliv || delivered[0]).payload)) : 'NONE',
        okDeliv ? 'grn' : delivered.length ? 'red' : 'grey',
        delivered.length ? esc(delivered.length + ' attempt' + (delivered.length > 1 ? 's' : '') +
          (okDeliv ? ' · ADMINISTERED' : ' · NONE USABLE')) : null,
        'ANALYST LOGISTICIAN SURGEON') +
      kv('BLOOD AT THAT LP', lp && lp.stock ? String(lp.stock.BLOOD) + ' u' : '—',
        lp && lp.stock && lp.stock.BLOOD <= 1 ? 'red' : 'grn',
        lp ? esc(lp.name) : null, 'ANALYST LOGISTICIAN', null, 'COMPUTED',
        'the shelf count at that launch point as this run has written it') +
      '</div>';

    h += sec('data', 'CASUALTY DATA') + body('data', hl + grid);

    /* --- TASKING HISTORY -------------------------------------------------- */
    h += sec('hist', 'TASKING HISTORY') +
      body('hist', histRows(history(c), 'drone'), null, 'padding-top:2px;padding-bottom:6px');

    /* --- TAGS ------------------------------------------------------------- */
    h += sec('tags', 'TAGS') + body('tags', tags([
      siteName(c),
      c.unitName,
      C && C.SURVIVABLE(c) ? 'SURVIVABLE' : 'NOT SURVIVABLE',
      need0 ? payShort(need0) : null,
      short ? 'TIER SHORTFALL' : null,
      c.reachN === 0 ? 'NO A/C IN REACH' : c.reachN === 1 ? 'ONE A/C ONLY' : null,
      c.hva ? 'HIGH-VALUE ASSET' : null,
      c.outcome || (c.treated ? 'TREATED' : 'OPEN')
    ]), null, 'padding-top:7px');

    return h;
  }

  function siteName(c) {
    var f = G('placeNameAt');
    return f && scn() ? f(scn(), c.x, c.y) : 'THE FORWARD SECTOR';
  }

  /* ============================================================ AIRCRAFT ===
     Selecting an aircraft is a first-class selection in this application —
     the fleet table and the map both write it — so the column answers for one
     rather than emptying. Same idiom, same grid, the aircraft's own history. */
  function paintDrone(d) {
    var A = armA(), t = clock();
    var load = Object.keys(d.manifest || {}).filter(function (k) { return d.manifest[k] > 0; })
      .map(function (k) { return payShort(k) + ' ×' + d.manifest[k]; }).join(' · ');
    var state = d.held ? 'HELD' : d.state;
    var stCls = state === 'LOST' ? 'red' : state === 'HELD' ? 'amb'
      : state === 'IDLE' ? 'grey' : 'cyan';
    var eff = G('effectiveRadiusKm');
    var tgt = d.target != null ? (A.casualties || []).filter(function (c) { return c.id === d.target; })[0] : null;

    var h = '<div class="nsp-head">' +
      '<div class="nsp-grp">SELECTION · AIRCRAFT ' + ((A.drones || []).indexOf(d) + 1) + ' OF ' + (A.drones || []).length + '</div>' +
      '<div class="nsp-id">' + esc(callsign(d)) + '-' + aorTag() + '</div>' +
      '<div class="nsp-row1">' + chip(state, stCls) +
      '<span class="nsp-sub"><b>' + esc(d.plat.label) + '</b> · ' + esc(d.baseName) + '</span></div>' +
      '<div class="nsp-sub">SORTIES <b>' + d.sorties + '</b> &nbsp;·&nbsp; DELIVERED <b>' + d.delivered +
      '</b> &nbsp;·&nbsp; WASTED <b>' + d.wasted + '</b></div></div>';

    var frac = d.state === 'OUTBOUND' && d.tArrive > d.tDepart
      ? Math.max(0, Math.min(1, (t - d.tDepart) / (d.tArrive - d.tDepart))) : (d.state === 'IDLE' ? 0 : 1);
    h += scrub(frac, zclock(t), { txt: state, cls: stCls, dot: state !== 'IDLE' && state !== 'LOST' }, -1, 0);

    /* Hold/release is the host's own `data-hold` attribute and its own
       delegated handler, exactly as the drawer's control is. The platform
       note and the route ladder stay in the full record. */
    h += actions('drone', d.id,
      '<button class="nsp-ab' + (d.held ? ' on' : '') + '" type="button" data-hold="' + d.id + '"' +
      ' title="' + (d.held ? 'Release this aircraft to the tasking model' : 'Hold this aircraft on the pad') + '">' +
      (d.held ? 'RELEASE A/C' : 'HOLD A/C') + '</button>');

    h += sec('data', 'AIRCRAFT DATA') + body('data',
      '<div class="nsp-kv">' +
      kv('LAUNCH POINT', esc(d.baseName), null, esc(n1(km(d.x, d.y, d.baseX, d.baseY)) + ' km out')) +
      kv('STATE', esc(state), stCls, esc(d.onStation ? d.onStation.phase : d.plat.key)) +
      kv('CRUISE', d.plat.speedKmh + ' km/h', null, 'CLASS ' + esc(d.plat.key)) +
      kv('USABLE RADIUS', eff ? Math.round(eff(d.plat, 2)) + ' km' : d.plat.radiusKm + ' km', null, 'AT MEDICAL LOAD') +
      kv('MANIFEST', load || 'EMPTY', load ? 'cyan' : 'grey',
        esc(d.plat.slots + ' slots · ' + d.plat.payloadKg + ' kg'), 'ANALYST LOGISTICIAN COMMANDER SURGEON') +
      kv('CONTAINER', (d.manifest && d.manifest.BLOOD) ? n1(d.coldC) + ' °C' : '—',
        (d.manifest && d.manifest.BLOOD && d.coldC > 8) ? 'red' : 'grn', '1–10 °C BAND',
        'ANALYST LOGISTICIAN SURGEON') +
      kv('TASKED TO', tgt ? 'CAS-' + pad(tgt.id, 3) : 'NONE', tgt ? 'cyan' : 'grey',
        tgt ? esc(tgt.cls) : (d.state === 'IDLE' ? 'ON THE PAD' : 'NO CURRENT TASKING')) +
      kv('ETA ON SITE', d.state === 'OUTBOUND' ? Math.max(0, Math.round(d.tArrive - t)) + ' min' : '—',
        d.state === 'OUTBOUND' ? 'grn' : 'grey', d.state === 'OUTBOUND' ? esc(zclock(d.tArrive)) : null) +
      '</div>');

    h += sec('hist', 'TASKING HISTORY') +
      body('hist', histRows(historyDrone(d), 'cas'), null, 'padding-top:2px;padding-bottom:6px');

    h += sec('tags', 'TAGS') + body('tags', tags([
      d.baseName, d.plat.label, state,
      d.wasted ? 'WASTED ' + d.wasted : null,
      d.delivered ? 'DELIVERED ' + d.delivered : null
    ]), null, 'padding-top:7px');
    return h;
  }

  /* =============================================================== EMPTY ===
     Never a blank column. With nothing selected the panel answers the
     question the operator would otherwise open a pane for — what has this run
     cost so far — in the same grid, from COUNT, so every figure here is the
     same figure the scoreboard, COMPARE and the foot ribbon are showing. */
  /* ================================================= COMMANDER COLUMN ===
     A commander does not read a payload-release ticker. Through v3.0 this
     column carried RUN SUMMARY, LATEST EVENTS and TAGS on every screen in
     every role — eight stat pairs and a per-tail-number event feed, holding
     the left fifth of the display permanently. That is analyst and
     logistician material and it is kept, one press away, because the people
     who read it need it.

     What a commander gets instead: which operation he is standing in, what
     is waiting on his decision with the decision on the same card, and the
     two or three things that are off track. Nothing else.                */
  var cmdrMode = true;               // which column the commander is looking at
  function isCommanderRole() {
    return !!(window.ANGEL && ANGEL.role ? ANGEL.role.current() === 'COMMANDER'
                                         : window.APP && APP.role === 'COMMANDER');
  }
  function colSwitch() {
    return '<div class="nsp-colsw" role="group" aria-label="What this column shows">' +
      '<button class="nsp-cs' + (cmdrMode ? ' on' : '') + '" data-nsp-col="cmdr">DECISIONS</button>' +
      '<button class="nsp-cs' + (cmdrMode ? '' : ' on') + '" data-nsp-col="run">RUN DETAIL</button>' +
      '</div>';
  }

  /* ---------------------------------------------------- THE CONTEXT STRIP ==
     Record detail opens in the accordions in the main window now, so this
     column no longer carries it. What is left is the four things no pane
     states for itself — which operation, which force, which clock, which
     state — as labelled figures. Not one sentence, because every word here
     is paid for on every destination that asks for this block. */
  function ctxHead(S, A, dep, depCls, sw) {
    return '<div class="nsp-head">' +
      '<div class="nsp-id">' + esc((S && S.name) || 'THE OPERATION') + '</div>' +
      '<div class="nsp-row1">' + chip(dep.replace('_', ' '), depCls) +
      '<span class="nsp-sub"><b>' + esc((S && S.theater) || '') + '</b> · ' +
      esc((S && S.gridZone) || '') + ' · ' +
      Math.round((S && S.widthKm) || 0) + '×' + Math.round((S && S.heightKm) || 0) + ' KM</span></div>' +
      '<div class="nsp-sub"><b>' + esc((S && S.friendly) || '') + '</b></div>' +
      '<div class="nsp-sub">' + n(A.drones.length) + ' AIRFRAMES · ' +
      n(A.bases.length) + ' LAUNCH POINTS</div>' +
      (sw ? colSwitch() : '') + '</div>';
  }

  /* ======================================================== THE BLOCKS ===
     Six pieces, each answering one question, each buildable on its own. The
     table below decides which of them a destination gets. Nothing in here
     knows about any other block and nothing in here reads APP.view. */

  /* the toll, once, as a figure. The full label — died of wounds they could
     have survived — and the reminder that every number is a person and the
     target is zero belong to the panes that own the toll (COMPARE, DECIDE,
     the after-action record). Restating them on every destination is what
     made this column unreadable. */
  function blkToll(A, B, C) {
    if (!B) return '';
    var dsA = C.deathsSurvivable(A), dsB = C.deathsSurvivable(B);
    return '<div class="nsp-hl nsp-toll" title="' + esc(C.LABEL.DIED_SURVIVABLE) +
      '. The target is zero.">' +
      '<div class="nsp-hk">SURVIVABLE DEAD</div>' +
      '<div class="nsp-hv"><b class="red">' + dsA +
      '</b> <span class="nsp-slash">v</span> ' + dsB +
      '<span class="nsp-badge">ANGEL v DOCTRINAL</span></div></div>';
  }

  /* the eight run quantities. Analyst and logistician material, and it is
     kept — but only on the destinations that do not state these figures for
     themselves a hundred pixels to the right. */
  function blkSummary(A, B, C) {
    var dsA = C.deathsSurvivable(A), dsB = B ? C.deathsSurvivable(B) : null;
    var diff = dsB == null ? null : dsB - dsA;
    var thin = C.thinlyCovered(A);
    return sec('data', 'RUN SUMMARY') + body('data',
      '<div class="nsp-kv">' +
      /* Never "lives saved". The bridge between the two arms is stated as
         fewer dead or more dead, and a tie is a tie. */
      kv('DIFFERENCE', diff == null ? '—'
        : diff === 0 ? 'LEVEL' : Math.abs(diff) + (diff > 0 ? ' fewer' : ' more'),
        diff == null ? null : (diff > 0 ? 'amb' : diff < 0 ? 'red' : null),
        diff === 0 ? 'NO DIFFERENCE YET' : 'DEAD') +
      kv('SURVIVABLE COHORT', String(C.survivableTotal(A)), null, 'OF ' + A.casualties.length + ' WOUNDED') +
      kv('AN AIRCRAFT WAS TASKED', String(C.tasked(A).size), 'cyan', 'CASUALTIES') +
      kv('SORTIES FLOWN', String(C.sorties(A)), null, C.sortiesWasted(A) + ' WASTED') +
      kv('PAYLOADS ADMINISTERED', String(C.administered(A)), 'grn',
        C.deliveriesFailed(A) + ' NOT USABLE', 'ANALYST SURGEON LOGISTICIAN') +
      kv('BLOOD FORWARD', C.bloodForward(A) + ' u', null, C.bloodDestroyed(A) + ' u DESTROYED',
        'ANALYST LOGISTICIAN COMMANDER') +
      kv('ONE AIRCRAFT OR NONE', String(thin.thin), thin.thin ? 'org' : 'grn',
        thin.where ? esc('MOSTLY ' + thin.where) : null, 'ANALYST COMMANDER LOGISTICIAN') +
      kv('EVENTS ON THE STREAM', String(C.streamTo(A).length), null, 'REPORTED', 'ANALYST SURGEON LOGISTICIAN') +
      '</div>');
  }

  /* the last ten things that happened, newest first. The stream is appended
     in the order events are RAISED, and an event raised on one aircraft can
     be older than one raised on another a tick earlier, so this sorts on the
     event time rather than trusting the array order. */
  function blkEvents(A, C) {
    var ev = C.streamTo(A).slice().sort(function (a, b) { return b.t - a.t; }).slice(0, 10).map(function (e) {
      return {
        t: e.t, mark: e.phase, cls: phaseClass(e.phase),
        text: '<b>' + esc(e.call) + '</b> ' + esc(firstSentence(e.text)),
        cas: e.casId == null ? null : e.casId
      };
    });
    if (!ev.length) return '';
    return sec('histRun', 'LATEST EVENTS') +
      body('histRun', histRows(ev, 'cas'), null, 'padding-top:2px;padding-bottom:6px');
  }

  /* what is waiting on a person, with the decision on the same card. Nothing
     waiting is not a paragraph: the section exists only when there is
     something in it, and its absence is the answer. */
  function blkQueue(A) {
    var now = window.APP ? APP.tView : 0;
    var q = (A.queue || []).filter(function (p) { return p.state === 'PENDING'; });
    if (!q.length) return '';
    var h = sec('decide', 'WAITING ON YOU — ' + q.length);
    if (folded.has('decide')) return h;
    var inner = q.slice(0, 4).map(function (p) {
      var age = Math.max(0, Math.round((now - p.tRaised) * 60));
      var why = (p.reasons && p.reasons.length ? p.reasons : ['LOW CONFIDENCE'])
        .slice(0, 2).map(function (r) { return esc(r); }).join(' · ');
      return '<div class="nsp-dc">' +
        '<div class="nsp-dct"><b>CAS-' + n(p.leadId) + '</b>' +
        '<span class="nsp-dca">' + (age < 60 ? age + 's' : Math.floor(age / 60) + 'm') + '</span></div>' +
        '<div class="nsp-dcw">' + why + '</div>' +
        '<div class="nsp-dcm">' + esc(p.payloads.join(', ')) +
        (p.leadDeadline == null ? '' : ' · deadline in ' + Math.round(p.leadDeadline) + ' min') + '</div>' +
        '<div class="nsp-dcb">' +
          '<button class="nsp-ap" data-approve="' + p.id + '">Approve</button>' +
          '<button class="nsp-rj" data-reject="' + p.id + '">Reject</button>' +
        '</div></div>';
    }).join('') +
    (q.length > 4 ? '<p class="nsp-none">+' + (q.length - 4) + ' more</p>' : '');
    return h + body('decide', inner, null, 'padding-top:4px');
  }

  /* the two or three things off track, as figures. A zero is not an
     exception and does not take a line: an empty section is the statement
     that nothing is wrong, and it costs no words to make. */
  function blkOffTrack(A, C) {
    var t = clock();
    var open = A.casualties.filter(function (c) { return c.outcome === null && c.tInjury <= t; });
    var reachKnown = open.filter(function (c) { return c.reachN !== undefined; });
    var noReach = reachKnown.filter(function (c) { return c.reachN === 0; }).length;
    var lowBlood = A.bases.filter(function (b) { return b.stock.BLOOD <= 1; });
    var expired = A.stats.expired || 0;
    var ex = [];
    if (noReach) ex.push([noReach, 'red', 'OUT OF REACH']);
    if (lowBlood.length) ex.push([lowBlood.length, 'amb', 'LAST BLOOD UNIT · <b>' +
      lowBlood.map(function (b) { return esc(b.name); }).join(', ') + '</b>']);
    if (expired) ex.push([expired, 'red', 'EXPIRED UNACTIONED']);
    if (!ex.length) return '';
    return sec('exceptions', 'OFF TRACK') +
      body('exceptions', ex.map(function (r) {
        return '<div class="nsp-ex"><span class="nsp-exn' + (r[1] ? ' ' + r[1] : '') + '">' +
          n(r[0]) + '</span><span class="nsp-ext">' + r[2] + '</span></div>';
      }).join(''), null, 'padding-top:4px');
  }

  /* ===================================================== THE RAIL TABLE ===
     WHAT THIS COLUMN CARRIES, DESTINATION BY DESTINATION.

     The complaint this table answers, in the operator's words: "Run Summary
     on the left pane shows for pages that don't even require it." It did.
     Until this table existed, every one of the twenty-five destinations got
     the same column — the operation head, the transport strip, eight run
     quantities and the last ten events — whether the pane beside it was the
     map or the SQL console. Eight stat pairs beside a doctrine passage are
     not context; they are a second page competing with the first.

     THE RULE. A destination gets a block only if an operator standing on
     THAT destination would use it.

       · A page about the run gets run context: which operation, what clock,
         and — where the pane does not already state them — the toll, the run
         quantities and the event feed.
       · A page whose own body IS the run's figures (the casualty register,
         the fleet table, the launch points, the supplies, the approvals,
         the overview, the after-action record) gets identity and clock and
         the exceptions, and NOT a second copy of figures already on screen
         a hundred pixels to the right.
       · A page about the argument, the model, the corpus, the console, the
         record or the settings gets NOTHING, and an empty column is not a
         column: it is absent from the layout and the main column takes the
         336 px back. There is no heading standing over nothing.

     A destination absent from this table shows no column. That is the safe
     direction: a key this file has never heard of is a page this file has
     no context for, and inventing one is exactly the defect above.

       blocks — in paint order.
       sel    — whether a selected casualty or aircraft may take the column
                over. False on a page where clicking selects nothing, so a
                selection made three destinations ago cannot follow the
                operator onto the SQL console.
       sw     — whether a commander is offered the DECISIONS / RUN DETAIL
                switch here. */
  var RAIL = {
    /* --- the run, on a page that does not state the figures itself ----- */
    MISSION:      { blocks: ['head', 'clock', 'toll', 'summary', 'events'], sel: true,  sw: true },
    DASHBOARD:    { blocks: ['head', 'clock', 'toll', 'summary'],           sel: true,  sw: true },
    STREAM:       { blocks: ['head', 'clock', 'events'],                    sel: true,  sw: true },
    FLOW:         { blocks: ['head', 'clock', 'toll', 'summary'],           sel: true,  sw: true },
    UNITS:        { blocks: ['head', 'clock', 'events'],                    sel: true,  sw: true },

    /* --- the run, on a page whose own body is the figures -------------- */
    DECIDE:       { blocks: ['head', 'clock', 'queue', 'offtrack'],         sel: true,  sw: false },
    CASUALTIES:   { blocks: ['head', 'clock', 'offtrack'],                  sel: true,  sw: true },
    FLEET:        { blocks: ['head', 'clock', 'offtrack'],                  sel: true,  sw: true },
    LAUNCHPOINTS: { blocks: ['head', 'clock', 'offtrack'],                  sel: true,  sw: true },
    SUPPLY:       { blocks: ['head', 'clock', 'offtrack'],                  sel: true,  sw: true },
    TASKING:      { blocks: ['head', 'clock', 'queue', 'offtrack'],         sel: true,  sw: false },
    AFTERACTION:  { blocks: ['head', 'clock'],                              sel: false, sw: false }

    /* --- and NOTHING on the rest, by omission --------------------------
       STANDARD, COMPARE, ANALYSIS, ROI, COST — the argument. Every figure
         on them is stated at the size the argument needs it; a 336 px
         restatement beside it is a competing scoreboard.
       CONFIDENCE — the replication study. Its subject is a distribution
         over many runs, and the single run in this column is the anecdote
         it exists to put in its place.
       BRIEF — the brief is written for the reader; it carries its own
         context in its own words.
       AUDIT — the record is hash-chained and reads back on its own terms.
       SENSOR — the model and the device.
       DOCTRINE — the corpus. A run summary beside a retrieved passage is
         the exact case the operator named.
       QUERY — the analytical console. The answer is whatever was asked.
       DATA — the schema and the export.
       SETTINGS — controls. Nothing on it is a measurement.
       ------------------------------------------------------------------ */
  };

  /* The commander's decision column, when he asks for it by name on a
     destination that offers the switch. Unchanged in content: this is what
     the column has always shown a commander, now with a page it belongs on
     rather than all of them. */
  var CMDR_BLOCKS = ['head', 'clock', 'queue', 'offtrack', 'toll'];

  function railPlan() {
    var v = (window.APP && APP.view) ? String(APP.view) : '';
    var e = RAIL[v];
    if (!e) return null;
    var sw = !!e.sw && isCommanderRole();
    return { blocks: (sw && cmdrMode) ? CMDR_BLOCKS : e.blocks, sel: e.sel !== false, sw: sw };
  }

  /* ---- assemble whichever blocks this destination asked for ------------ */
  function paintContext(plan) {
    var A = armA(), B = window.APP && APP.armB, S = scn(), C = window.COUNT, t = clock();
    if (!A || !C) return '';
    var dep = window.APP && APP.deploy ? APP.deploy.state : 'NOT_DEPLOYED';
    var depCls = dep === 'DEPLOYED' ? 'grn' : dep === 'DEPLOYING' ? 'amb' : 'red';
    var h = '';
    for (var i = 0; i < plan.blocks.length; i++) {
      switch (plan.blocks[i]) {
        case 'head':
          h += ctxHead(S, A, dep, depCls, plan.sw); break;
        case 'clock':
          h += scrub(Math.max(0, Math.min(1, t / ((S && S.durationMin) || 1))), zclock(t),
            window.APP && APP.finished ? { txt: 'COMPLETE', cls: 'grn' }
                                       : { txt: 'LIVE', cls: 'live' }, -1, 0);
          break;
        case 'toll':     h += blkToll(A, B, C); break;
        case 'summary':  h += blkSummary(A, B, C); break;
        case 'events':   h += blkEvents(A, C); break;
        case 'queue':    h += blkQueue(A); break;
        case 'offtrack': h += blkOffTrack(A, C); break;
      }
    }
    return h;
  }

  /* ---- the transport strip, shared by all three states ------------------ */
  function scrub(frac, label, pill, idx, n) {
    var can = idx >= 0 && n > 1;
    return '<div class="nsp-scrub">' +
      '<button class="nsp-tb" data-nsp-step="-1"' + (can ? '' : ' disabled') + ' title="Previous in the selection set" aria-label="Previous">' +
      '<svg class="ic14" aria-hidden="true"><use href="#i-prev"/></svg></button>' +
      '<button class="nsp-tb hi" data-nsp-play title="Run or pause the mission clock" aria-label="Run or pause">' +
      '<svg class="ic14" aria-hidden="true"><use href="#i-' + (window.APP && APP.running ? 'pause' : 'play') + '"/></svg></button>' +
      '<button class="nsp-tb" data-nsp-step="1"' + (can ? '' : ' disabled') + ' title="Next in the selection set" aria-label="Next">' +
      '<svg class="ic14" aria-hidden="true"><use href="#i-next"/></svg></button>' +
      '<span class="nsp-tkw"><span class="nsp-tk"><i style="width:' + (frac * 100).toFixed(1) + '%"></i></span>' +
      '<u style="left:' + (frac * 100).toFixed(1) + '%"></u></span>' +
      '<span class="nsp-tm">' + esc(label) + '</span>' +
      '<span class="nsp-pill ' + pill.cls + '">' + (pill.cls === 'live' || pill.dot ? '<i></i>' : '') +
      esc(pill.txt) + '</span>' +
      '</div>';
  }

  /* =============================================================== PAINT === */
  var paint = safe('paint', function (force) {
    if (!host || !window.APP || !APP.world || !APP.armA) return;

    /* THE TABLE DECIDES, AND IT DECIDES FIRST. A destination this file has
       no context for takes NO WIDTH: the column is removed from the layout
       and the main window is 336 px wider, rather than standing there empty
       under a heading. Resolved before the repaint throttle so that arriving
       on the SQL console never shows a frame of somebody else's run summary
       on the way. */
    var plan = railPlan();
    if (!plan) {
      if (!host.classList.contains('nsp-off')) {
        host.classList.add('nsp-off');
        host.innerHTML = '';
        lastSig = null;
      }
      return;
    }
    host.classList.remove('nsp-off');

    var now = (window.performance && performance.now()) || Date.now();
    if (!force && (pressed || now - lastAt < 180)) return;
    lastAt = now;

    var sel = plan.sel ? APP.sel : null;
    var set = selectionSet(sel && sel.kind === 'cas' ? sel.id : null), inner = '', idx = -1;
    if (sel && sel.kind === 'cas') {
      var c = (APP.armA.casualties || []).filter(function (k) { return k.id === sel.id; })[0];
      if (c) {
        idx = set.list.indexOf(c);
        if (idx < 0) { set = { list: [c], label: set.label }; idx = 0; }
        inner = paintCasualty(c, set, idx);
      }
    } else if (sel && sel.kind === 'drone') {
      var d = (APP.armA.drones || []).filter(function (k) { return k.id === sel.id; })[0];
      if (d) inner = paintDrone(d);
    }
    if (!inner) inner = paintContext(plan);

    var sig = inner.length + '|' + inner;
    if (sig === lastSig) return;
    lastSig = sig;
    host.innerHTML = inner;
    /* aria-hidden for the screen reader on the cells this role is not
       offered. The stylesheet has already hidden them; filter() is the only
       thing that also tells assistive technology. */
    if (ANGEL.role && ANGEL.role.filter) { try { ANGEL.role.filter(host); } catch (e) { /* pre-role boot */ } }
    drawSparks();
  });

  /* ================================================= THE RESERVE TRACE ===
     Compensatory reserve over this casualty's own clock, drawn inside the
     cell that states the number. Every colour is read from the body's
     computed style at draw time, which is the THEME_CONTRACT rule for canvas
     renderers — a theme switch fires 'theme', force() clears the signature,
     the markup is re-set and this runs again against the new tokens.

     The horizontal rule is the 40 % zone floor the device module and the
     drawer's full-size canvas both draw, so the two traces read the same.
     The series stops at the moment the casualty was resolved for the same
     reason the figure above it does: a treated soldier's reserve is not
     still falling on the display. */
  function tok(name, dflt) {
    try {
      var v = getComputedStyle(document.body).getPropertyValue(name).trim();
      return v || dflt;
    } catch (e) { return dflt; }
  }
  var drawSparks = safe('spark', function () {
    if (!host) return;
    var A = armA(); if (!A) return;
    var list = host.querySelectorAll('canvas[data-nsp-spk]');
    for (var i = 0; i < list.length; i++) {
      var cv = list[i];
      var c = (A.casualties || []).filter(function (k) { return k.id === Number(cv.dataset.nspSpk); })[0];
      if (!c || typeof c.crmAt !== 'function') continue;
      var r = cv.getBoundingClientRect();
      /* Laid out inside a collapsed or hidden column: nothing to draw, and
         a zero-width canvas throws on getImageData later. */
      if (r.width < 8 || r.height < 6) continue;
      var dpr = window.devicePixelRatio || 1;
      var w = Math.round(r.width), h = Math.round(r.height);
      if (cv.width !== Math.round(w * dpr)) cv.width = Math.round(w * dpr);
      if (cv.height !== Math.round(h * dpr)) cv.height = Math.round(h * dpr);
      var g = cv.getContext('2d'); if (!g) continue;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);

      var t = clock();
      var resolved = c.outcome !== null || c.treated;
      var end = c.treated && c.tTreated != null ? c.tTreated
        : (c.outcome && c.tResolved != null ? c.tResolved : t);
      var span = c.deadlineMin >= 9000 ? 120 : c.deadlineMin * 1.3;
      var last = c.crmAt(end);

      /* the 40 % floor */
      g.strokeStyle = tok('--red-d', '#8E2A22');
      g.lineWidth = 1;
      g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(0, Math.round(h - 1 - (h - 2) * 0.4) + 0.5);
      g.lineTo(w, Math.round(h - 1 - (h - 2) * 0.4) + 0.5); g.stroke();
      g.setLineDash([]);

      g.beginPath();
      var drew = false;
      for (var k = 0; k <= 60; k++) {
        var tt = c.tInjury + span * k / 60;
        if (tt > end) break;
        var v = Math.max(0, Math.min(1, c.crmAt(tt) / 100));
        var x = w * (k / 60), y = h - 1 - (h - 2) * v;
        if (drew) g.lineTo(x, y); else { g.moveTo(x, y); drew = true; }
      }
      if (!drew) continue;
      g.strokeStyle = last < 40 ? tok('--red', '#FF6B60')
        : last < 70 ? tok('--amb', '#FFB53D') : tok('--grn', '#4ED39B');
      g.lineWidth = 1.6;
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.stroke();
      /* Where the trace stops matters: on a live casualty it is now, on a
         resolved one it is the handoff. A dot says which pixel that is. */
      var fx = Math.min(w - 1.5, w * Math.min(1, (end - c.tInjury) / Math.max(0.01, span)));
      var fy = h - 1 - (h - 2) * Math.max(0, Math.min(1, last / 100));
      g.fillStyle = g.strokeStyle;
      g.beginPath(); g.arc(fx, fy, resolved ? 1.6 : 2.1, 0, 6.284); g.fill();
    }
  });

  function force() { lastAt = 0; lastSig = null; paint(true); }

  /* ============================================================ BEHAVIOUR === */
  function step(dir) {
    var set = selectionSet(APP.sel && APP.sel.kind === 'cas' ? APP.sel.id : null);
    if (!set.list.length) return;
    var cur = APP.sel && APP.sel.kind === 'cas'
      ? set.list.map(function (c) { return c.id; }).indexOf(APP.sel.id) : -1;
    var next = cur < 0 ? 0 : (cur + dir + set.list.length) % set.list.length;
    APP.sel = { kind: 'cas', id: set.list[next].id };
    APP._paneForce = true;
    var r = G('render'); if (r) r();
    force();
  }

  var onClick = safe('click', function (ev) {
    if (!host || !host.contains(ev.target)) return;
    var el = ev.target.closest ? ev.target.closest('[data-nsp-fold],[data-nsp-step],[data-nsp-play],[data-nsp-lp],[data-nsp-drone],[data-nsp-cas],[data-nsp-doc],[data-nsp-col]') : null;
    if (!el) return;
    ev.preventDefault(); ev.stopPropagation();
    var d = el.dataset;

    /* The column switch. Nothing is taken away from anybody: the run detail
       is one press from here, and every other role still opens on it. */
    if (d.nspCol !== undefined) { cmdrMode = d.nspCol === 'cmdr'; force(); return; }

    if (d.nspFold !== undefined) {
      if (folded.has(d.nspFold)) folded.delete(d.nspFold); else folded.add(d.nspFold);
      writeFolds(); force(); return;
    }
    if (d.nspStep !== undefined) { step(Number(d.nspStep)); return; }
    if (d.nspPlay !== undefined) {
      var b = document.getElementById('btnPlay'); if (b) b.click();
      force(); return;
    }
    if (d.nspLp !== undefined) {
      lpIdx = (lpIdx + 1) % Math.max(1, (APP.armA.bases || []).length);
      force(); return;
    }
    /* Handed straight to js/doctrine.js, which owns the retrieval pane and
       the question wording. This file never sees a corpus. */
    if (d.nspDoc !== undefined) {
      var D = ANGEL.get && ANGEL.get('doctrine');
      if (D && typeof D.ask === 'function') D.ask(d.nspDoc);
      return;
    }
    if (d.nspDrone !== undefined) {
      APP.sel = { kind: 'drone', id: Number(d.nspDrone) };
    } else if (d.nspCas !== undefined) {
      APP.sel = { kind: 'cas', id: Number(d.nspCas) };
    }
    APP._paneForce = true;
    var r = G('render'); if (r) r();
    force();
  });

  /* Enter and Space on a focused row do what a click does — the whole column
     is reachable from the keyboard, which the reference console is not. */
  var onKey = safe('key', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    if (!host || !host.contains(ev.target)) return;
    if (!ev.target.closest('[data-nsp-fold],[data-nsp-lp],[data-nsp-drone],[data-nsp-cas]')) return;
    ev.preventDefault();
    ev.target.click();
  });

  /* ================================================================= CSS ===
     Injected from here rather than added to a stylesheet another author owns.
     Every declaration below resolves to a token; grep this block for '#' and
     it returns nothing. */
  function injectCSS() {
    if (document.getElementById('nspCSS')) return;
    var s = document.createElement('style');
    s.id = 'nspCSS';
    s.textContent = [
      '#insp{width:' + W + 'px;flex:0 0 ' + W + 'px;background:var(--k1);',
      '  box-shadow:inset -1px 0 0 var(--line);display:flex;flex-direction:column;',
      '  overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;}',
      '@media (max-width:' + (MINVIEW - 1) + 'px){#insp{display:none}}',
      /* A destination the rail table has nothing for. Not an empty column —
         no column: display:none takes it out of the flex row entirely and
         the main window reclaims all 336 px of it. */
      '#insp.nsp-off{display:none}',
      '#insp::-webkit-scrollbar{width:8px}',
      '#insp::-webkit-scrollbar-thumb{background:var(--k5);border-radius:4px}',
      '#insp::-webkit-scrollbar-track{background:var(--k1)}',

      /* header */
      '#insp .nsp-head{padding:8px 10px;flex:none}',
      '#insp .nsp-grp{font:600 9.5px/1 var(--mono);letter-spacing:.14em;color:var(--t-dim);margin-bottom:5px}',
      '#insp .nsp-id{font:400 14.5px/1.15 var(--mono);color:var(--t-hi);letter-spacing:-.02em;',
      '  word-break:break-all;margin-bottom:6px}',
      '#insp .nsp-row1{display:flex;align-items:center;gap:6px;margin-bottom:5px;flex-wrap:wrap}',
      '#insp .nsp-sub{font:400 10px/1.35 var(--mono);color:var(--t-lo);letter-spacing:.03em}',
      '#insp .nsp-sub b{color:var(--t-mid);font-weight:400}',
      '#insp .nsp-sub.amb{color:var(--amb)}',

      /* the triage / state chip. A ring of the hue at 55% over --k3 rather
         than the hue over its own dim companion, which measures 3.0:1 and
         would fail the contract in every theme. */
      '#insp .nsp-tri{display:inline-flex;align-items:center;height:17px;padding:0 6px;border-radius:2px;',
      '  font:700 9.5px/1 var(--mono);letter-spacing:.13em;background:var(--k3);',
      '  box-shadow:inset 0 0 0 1px color-mix(in srgb,currentColor 55%,transparent)}',
      '#insp .nsp-tri.red{color:var(--red)} #insp .nsp-tri.yel{color:var(--yel)}',
      '#insp .nsp-tri.grn{color:var(--grn)} #insp .nsp-tri.grey{color:var(--grey)}',
      '#insp .nsp-tri.amb{color:var(--amb)} #insp .nsp-tri.cyan{color:var(--cyan)}',
      '#insp .nsp-tri.org{color:var(--org)}',

      /* transport strip */
      '#insp .nsp-scrub{display:flex;align-items:center;gap:6px;padding:5px 10px 6px;flex:none;',
      '  background:var(--k2);box-shadow:inset 0 1px 0 var(--line),inset 0 -1px 0 var(--line)}',
      '#insp .nsp-tb{border:0;background:transparent;color:var(--t-lo);padding:2px;cursor:pointer;',
      '  display:flex;align-items:center;border-radius:2px}',
      '#insp .nsp-tb.hi{color:var(--t-hi)}',
      '#insp .nsp-tb:hover:not([disabled]){background:var(--k3);color:var(--t-hi)}',
      '#insp .nsp-tb[disabled]{opacity:.45;cursor:default}',
      '#insp .nsp-tkw{flex:1;height:9px;position:relative;display:flex;align-items:center;min-width:24px;margin-right:2px}',
      '#insp .nsp-tk{flex:1;height:3px;background:var(--k5);border-radius:2px;overflow:hidden}',
      '#insp .nsp-tk i{display:block;height:3px;background:var(--cyan-d);border-radius:2px}',
      '#insp .nsp-tkw u{position:absolute;top:0;width:3px;height:9px;background:var(--cyan);',
      '  border-radius:1px;transform:translateX(-1px)}',
      '#insp .nsp-tm{font:600 9.5px/1 var(--mono);letter-spacing:.06em;color:var(--t-lo);white-space:nowrap}',
      '#insp .nsp-pill{font:700 9px/1 var(--mono);letter-spacing:.1em;height:15px;padding:0 5px;',
      '  display:inline-flex;align-items:center;gap:4px;border-radius:2px;background:var(--k3);white-space:nowrap}',
      '#insp .nsp-pill.live{color:var(--red)} #insp .nsp-pill.grn{color:var(--grn)}',
      '#insp .nsp-pill.red{color:var(--red)} #insp .nsp-pill.amb{color:var(--amb)}',
      '#insp .nsp-pill.grey{color:var(--grey)} #insp .nsp-pill.cyan{color:var(--cyan)}',
      '#insp .nsp-pill i{width:5px;height:5px;border-radius:3px;background:currentColor;display:block}',

      /* section heads */
      /* action strip: the promoted controls, and the door to the full record.
         --t-mid on --k2 measures 7.4:1 in console-dark and is the same pair
         the section heads use; the hover surface is --k4, which is why the
         resting colour is --t-mid and never --t-dim. */
      '#insp .nsp-act{display:flex;align-items:center;gap:5px;flex:none;padding:0 10px 7px;flex-wrap:wrap;',
      'box-shadow:inset 0 -1px 0 var(--line)}',
      '#insp .nsp-actsp{flex:1}',
      '#insp .nsp-ab{display:inline-flex;align-items:center;gap:4px;height:19px;padding:0 6px;',
      'border:0;border-radius:2px;background:var(--k2);color:var(--t-mid);cursor:pointer;',
      'font:700 9px/1 var(--mono);letter-spacing:.11em;white-space:nowrap}',
      '#insp .nsp-ab:hover{background:var(--k4);color:var(--t-hi)}',
      '#insp .nsp-ab.on{color:var(--amb)}',
      '#insp .nsp-rt{transform:rotate(90deg)}',
      '#insp .nsp-ab.go{background:var(--k3);color:var(--cyan)}',
      '#insp .nsp-ab.go:hover{background:var(--k5);color:var(--t-hi)}',
      '#insp .nsp-ab .ic14{width:11px;height:11px;flex:none}',
      '#insp .nsp-ab:focus-visible{outline:1px solid var(--cyan);outline-offset:1px}',
      /* the reserve sparkline, inside the cell that states the number */
      '#insp .nsp-spk{display:block;width:100%;height:22px;margin-top:4px;',
      'background:var(--k3);border-radius:2px}',
      /* ---- the commander column ------------------------------------ */
      '#insp .nsp-colsw{display:flex;margin-top:9px;background:var(--k2);border-radius:3px;',
      '  box-shadow:inset 0 0 0 1px var(--line2);overflow:hidden}',
      '#insp .nsp-cs{flex:1;border:0;background:transparent;color:var(--t-dim);cursor:pointer;',
      '  padding:5px 0;font:700 8.5px/1 var(--mono);letter-spacing:.12em}',
      '#insp .nsp-cs:hover{color:var(--t-hi);background:var(--k4)}',
      '#insp .nsp-cs.on{background:var(--k5);color:var(--t-hi)}',
      '#insp .nsp-cs:focus-visible{outline:1px solid var(--cyan);outline-offset:-2px}',
      /* one decision, with the decision on the same card */
      '#insp .nsp-dc{background:var(--k2);border:1px solid color-mix(in srgb,var(--amb) 30%,transparent);',
      '  border-radius:7px;padding:9px 10px;margin:0 0 7px}',
      '#insp .nsp-dct{display:flex;align-items:baseline;justify-content:space-between;gap:8px}',
      '#insp .nsp-dct b{font:700 12px/1 var(--mono);color:var(--t-hi)}',
      '#insp .nsp-dca{font:700 9px/1 var(--mono);letter-spacing:.08em;color:var(--amb)}',
      '#insp .nsp-dcw{margin-top:6px;font:600 9px/1.35 var(--mono);letter-spacing:.06em;color:var(--t-mid)}',
      '#insp .nsp-dcm{margin-top:4px;font:400 10px/1.4 var(--sans);color:var(--t-lo)}',
      '#insp .nsp-dcb{display:flex;gap:6px;margin-top:9px}',
      '#insp .nsp-ap{flex:1;border:0;border-radius:4px;padding:6px 0;cursor:pointer;',
      '  background:var(--grn);color:var(--on-accent);font:700 10px/1 var(--sans)}',
      '#insp .nsp-rj{flex:0 0 72px;border:1px solid var(--line2);border-radius:4px;padding:6px 0;',
      '  cursor:pointer;background:var(--k3);color:var(--t-mid);font:600 10px/1 var(--sans)}',
      '#insp .nsp-rj:hover{border-color:var(--red);color:var(--red)}',
      /* one exception line */
      '#insp .nsp-ex{display:flex;gap:9px;align-items:flex-start;padding:6px 0;',
      '  border-bottom:1px solid var(--line)}',
      '#insp .nsp-ex:last-child{border-bottom:0}',
      '#insp .nsp-exn{font:700 15px/1.1 var(--mono);flex:0 0 26px;text-align:right;color:var(--t-dim)}',
      '#insp .nsp-exn.red{color:var(--red)}#insp .nsp-exn.amb{color:var(--amb)}',
      '#insp .nsp-ext{font:400 10.5px/1.4 var(--sans);color:var(--t-mid)}',
      '#insp .nsp-ext b{color:var(--t-hi);font-weight:600}',
      '#insp .nsp-sec{display:flex;align-items:center;justify-content:space-between;flex:none;',
      '  padding:7px 10px 6px;background:var(--k2);cursor:pointer;user-select:none;',
      '  box-shadow:inset 0 1px 0 var(--line),inset 0 -1px 0 var(--line)}',
      '#insp .nsp-sec:hover{background:var(--k3)}',
      '#insp .nsp-sec span{font:700 10px/1 var(--sans);letter-spacing:.15em;color:var(--t-mid)}',
      '#insp .nsp-chev{color:var(--t-lo);display:flex;transition:transform .12s ease}',
      '#insp .nsp-chev.shut{transform:rotate(-90deg)}',
      '#insp .nsp-body{padding:8px 10px 9px;flex:none}',

      /* the highlighted sub-block — the reference console\'s "distance to
         placemark", and here the launch point an operator asks for first */
      /* The toll now sits directly in the column rather than inside a
         folded section body, so it carries its own clearance. */
      '#insp .nsp-toll{margin:12px 0 4px}',
      '#insp .nsp-hl{background:var(--k3);border-radius:3px;box-shadow:inset 0 0 0 1px var(--line2);',
      '  padding:7px 9px 8px;margin-bottom:9px;position:relative;cursor:pointer}',
      '#insp .nsp-hl[role=button]:hover{box-shadow:inset 0 0 0 1px var(--k6)}',
      '#insp .nsp-hk{font:400 10px/1.2 var(--sans);color:var(--t-lo);letter-spacing:.05em;margin-bottom:5px;',
      '  padding-right:52px}',
      '#insp .nsp-hv{display:flex;align-items:center;gap:6px;flex-wrap:wrap;',
      '  font:400 12px/1.2 var(--mono);color:var(--t-hi)}',
      '#insp .nsp-hv b{font-weight:400} #insp .nsp-hv b.red{color:var(--red)}',
      '#insp .nsp-slash{color:var(--t-lo)}',
      '#insp .nsp-more{position:absolute;right:9px;bottom:8px;font:600 10px/1 var(--mono);color:var(--blue)}',
      '#insp .nsp-badge{display:inline-flex;align-items:center;height:15px;padding:0 5px;border-radius:2px;',
      '  background:var(--cyan-d);color:var(--t-hi);font:700 9px/1 var(--mono);letter-spacing:.08em}',

      /* the two-column key/value grid */
      '#insp .nsp-kv{display:grid;grid-template-columns:1fr 1fr;column-gap:12px;row-gap:8px}',
      '#insp .nsp-kv>div{min-width:0}',
      '#insp .nsp-k{font:400 10px/1.1 var(--sans);color:var(--t-lo);letter-spacing:.05em;margin-bottom:2px;',
      '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      /* THE MARK SITS ON THE VALUE, NOT ON THE KEY, and that is a measured
         decision rather than a taste one. The key column is 152px at the
         shipped inspector width; COMPENSATORY RESERVE alone needs 144px of
         it, so any badge at all in the key pushed the label into an ellipsis
         — the reader lost the name of the field to gain a word they get back
         on hover anyway. Against the value there is room for the whole stamp,
         model name and all: 0.26 CRI plus the badge is 93px of 152. It also
         puts the claim of provenance against the number it vouches for, which
         is where it belongs. */
      '#insp .nsp-v.hasProv{display:flex;align-items:baseline;flex-wrap:wrap;',
      '  column-gap:0;row-gap:2px}',
      '#insp .nsp-v.hasProv > small{flex:0 0 100%}',
      '#insp .nsp-v.hasProv br{display:none}',
      '#insp .nsp-v .pMark{flex:0 0 auto;margin-left:7px !important;',
      '  position:relative;top:1px}',
      '#insp .nsp-v{font:400 11.5px/1.25 var(--mono);color:var(--t-hi);letter-spacing:-.01em;',
      '  overflow-wrap:anywhere}',
      '#insp .nsp-v small{font:400 10px/1.3 var(--mono);color:var(--t-lo);letter-spacing:.02em}',
      '#insp .nsp-v b{font-weight:400}',
      '#insp .nsp-v.red{color:var(--red)} #insp .nsp-v.amb{color:var(--amb)}',
      '#insp .nsp-v.grn{color:var(--grn)} #insp .nsp-v.cyan{color:var(--cyan)}',
      '#insp .nsp-v.yel{color:var(--yel)} #insp .nsp-v.org{color:var(--org)}',
      '#insp .nsp-v.grey{color:var(--grey)}',

      /* tasking history */
      '#insp .nsp-th{display:flex;gap:7px;padding:4px 6px 4px 0;box-shadow:inset 0 -1px 0 var(--line)}',
      '#insp .nsp-th:last-child{box-shadow:none}',
      '#insp .nsp-th.pick{cursor:pointer;margin:0 -4px;padding-left:4px;padding-right:4px;border-radius:2px}',
      /* hover is --k3 and not --k4 on purpose: --t-dim measures 4.47:1 on
         --k4 in console-dark and 4.35:1 in field-slate, and the stamp is
         --t-dim. On --k3 it measures 4.90:1 and holds the contract. */
      '#insp .nsp-th.pick:hover,#insp .nsp-th.pick:focus-visible{background:var(--k3);outline:0}',
      '#insp .nsp-th time{font:400 10px/1.35 var(--mono);color:var(--t-dim);width:52px;flex:none}',
      /* `font:` shorthand does not reset margin, and the UA gives <p> 1em of
         it — which pushed every history line one row below its own stamp. */
      '#insp .nsp-th p{margin:0;font:400 10.5px/1.35 var(--sans);color:var(--t-mid);flex:1;min-width:0;overflow-wrap:anywhere}',
      '#insp .nsp-th p b{color:var(--t-hi);font-weight:600}',
      '#insp .nsp-th em{font-style:normal;font:600 9.5px/1.35 var(--mono);letter-spacing:.05em;white-space:nowrap}',
      '#insp .nsp-th em.red{color:var(--red)} #insp .nsp-th em.amb{color:var(--amb)}',
      '#insp .nsp-th em.grn{color:var(--grn)} #insp .nsp-th em.cyan{color:var(--cyan)}',
      '#insp .nsp-th em.yel{color:var(--yel)} #insp .nsp-th em.grey{color:var(--grey)}',

      /* tags */
      '#insp .nsp-tags{display:flex;flex-wrap:wrap;gap:4px}',
      '#insp .nsp-tag{min-height:16px;padding:1px 6px;display:inline-flex;align-items:center;border-radius:2px;',
      '  background:var(--k3);box-shadow:inset 0 0 0 1px var(--line2);',
      '  font:600 9.5px/1.3 var(--mono);letter-spacing:.07em;color:var(--t-lo)}',
      '#insp .nsp-none{font:400 10.5px/1.45 var(--sans);color:var(--t-lo);margin:8px 0 0}',
      '#insp [data-nsp-fold]:focus-visible,#insp .nsp-tb:focus-visible{outline:1px solid var(--cyan);outline-offset:1px}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ============================================================ BOOTSTRAP === */
  ANGEL.ready('inspector', async function () {
    host = document.getElementById('insp');
    if (!host) {
      /* No mount, no column. The console is unchanged and everything else in
         the application keeps working, which is the contract. */
      if (ANGEL.setStatus) ANGEL.setStatus('inspector', 'withheld', 'no #insp mount in the shell');
      return null;
    }
    if (!window.APP || !window.COUNT) {
      /* Every figure in the empty state is a COUNT quantity. Without it there
         is no way to fill this column that is guaranteed to agree with the
         rest of the console, and a panel that quietly disagrees with the foot
         ribbon is worse than no panel. Withheld, not approximated. */
      host.remove(); host = null;
      if (ANGEL.setStatus) ANGEL.setStatus('inspector', 'withheld', 'APP / COUNT not present');
      return null;
    }

    injectCSS();
    host.setAttribute('aria-label', 'Selected object');
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', function (e) {
      pressed = !!(host && e.target && host.contains(e.target));
    }, true);
    var release = function () { pressed = false; };
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', release, true);
    window.addEventListener('blur', release);

    /* render() calls renderDrawer() on every pass, so wrapping it is the one
       hook that fires for every cause of a repaint — the clock, a map click,
       a register click, a palette jump — without this file knowing about any
       of them. The native binding is captured before the wrapper is installed
       so the wrapper cannot resolve back to itself. */
    var native = window.renderDrawer;
    if (typeof native === 'function' && !native._nspWrapped) {
      var w = function () {
        var r = native.apply(this, arguments);
        paint(false);
        return r;
      };
      w._nspWrapped = true;
      window.renderDrawer = w;
    }
    /* And a slow heartbeat, because the welcome overlay and the deploy modal
       both hold render() off and the column should be right underneath them. */
    setInterval(function () { paint(false); }, 250);

    /* A theme change is a repaint: every colour is a token, so the markup is
       unchanged and only the signature guard has to be cleared. */
    ANGEL.on('theme', force);
    if (ANGEL.role && ANGEL.role.on) ANGEL.role.on(force);
    window.addEventListener('resize', force);

    force();
    return { paint: force, folds: folded };
  });

  /* --------------------------------------------------------------------------
     WHAT THE MOCKUP SHOWS THAT THE SIMULATION DOES NOT MODEL, and is therefore
     NOT in this column:

       "SGT R. AMARO"  — the mockup names the responder on scene. Casualties
                         carry a responder TIER (T1/T2/T3), not a name. The
                         row shows the tier and its training hours, which is
                         the fact the tasking actually turns on.
       "3D MLR (REIN)" — the mockup puts the parent formation on the
                         classification line. `scn.friendly` carries it and it
                         is printed in the empty state, but a casualty's own
                         `unitName` (B/1-27 IN) is the more specific truth, so
                         the header shows that.
       "SRC MEDEVAC 9-LINE + WEARABLE" — kept, but derived: it reads WEARABLE
                         only when `c.tele` actually has readings.

     Nothing else in the left column of mock-I1 is absent, and nothing in it
     is invented.
     ------------------------------------------------------------------------ */
})();
