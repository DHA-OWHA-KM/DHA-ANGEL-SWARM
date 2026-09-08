/* ===========================================================================
   ANGEL SWARM — TELEMETRY INGEST

   THE HOLE THIS FILLS, STATED PLAINLY.

   Until this module existed, every physiological reading in this application
   was produced by the simulation and read back out of the simulation's own
   memory. That proves the tasking logic and proves nothing about acquisition.
   A reviewer who works in tactical medicine asks "how does the reading get
   here" inside the first minute, and the honest answer was "it doesn't".

   This is the acquisition path. The launcher listens for Cursor on Target —
   the message format TAK already carries across tactical networks — and
   republishes what it hears to this page over Server-Sent Events. A wearable
   that already reaches ATAK or BATDOK therefore reaches ANGEL SWARM with
   nothing new on the soldier.

   WHO WOULD BE ON THE OTHER END OF IT. BATDOK-J: the Joint Operational
   Medicine Information Systems point-of-injury and en-route care
   application, government-owned, developed by the Air Force Research
   Laboratory's 711th Human Performance Wing, selected by JOMIS in 2022 and
   fielding from FY26. It pairs to worn sensors, it documents casualty care
   at the point of injury, and it already speaks Cursor on Target across
   tactical networks. That is the real system this socket is shaped for, and
   naming it is more useful to a reviewer than "some wearable".

   WHAT THIS DOES NOT CLAIM, AND THIS PARAGRAPH IS THE IMPORTANT ONE. THIS IS
   AN INTERFACE THIS APPLICATION ACCEPTS. IT IS NOT AN INTEGRATION THAT HAS
   BEEN TESTED AGAINST A REAL BATDOK-J. No BATDOK-J instance has been
   connected to this build. No message captured from one has been replayed
   through it. No interface control document has been agreed with the
   programme, and nobody from it has seen this. It does not claim a ratified
   medical CoT schema either; the values ride in a <detail> extension, which
   is CoT's own extension mechanism used as intended. It does not claim to
   speak any particular monitor's dialect today. It claims exactly one thing:
   the reading arrives from outside this program, over a socket, and the
   tasking layer cannot tell a simulated emitter from a real one.

   AND THE POINT OF IT. Pull the feed and the link state goes DOWN, and the
   tasking layer keeps running on last-known state. That is the behaviour the
   whole concept rests on, and until now there was no way to demonstrate it
   because there was no link to pull.
   ========================================================================= */
(function () {
  'use strict';

  var STALE_MS = 6000;      /* no message for this long -> link is stale */
  var DOWN_MS = 15000;      /* no message for this long -> link is down  */

  var T = {
    available: false,       /* the launcher has a listener at all         */
    connected: false,       /* this page holds an open stream             */
    bind: '', external: false, transport: '',
    readings: Object.create(null),   /* uid -> latest reading             */
    order: [],                       /* uids, first-seen order            */
    msgs: 0,
    lastAt: 0,              /* performance.now() of the last message      */
    rate: 0,                /* messages/second, smoothed                  */
    _win: [],
    es: null
  };

  function linkState() {
    if (!T.available) return 'OFF';
    if (!T.connected) return 'DOWN';
    if (!T.lastAt) return 'WAITING';
    var age = performance.now() - T.lastAt;
    if (age > DOWN_MS) return 'DOWN';
    if (age > STALE_MS) return 'STALE';
    return 'LIVE';
  }

  function ageSec() {
    return T.lastAt ? (performance.now() - T.lastAt) / 1000 : -1;
  }

  /* Devices heard from inside the stale window. A monitor that has stopped
     reporting stops being counted — that is what a medic needs to know, and
     a count that only ever goes up is a lie by omission. */
  function deviceCount() {
    var cut = performance.now() - DOWN_MS, n = 0;
    for (var i = 0; i < T.order.length; i++) {
      var r = T.readings[T.order[i]];
      if (r && r._at >= cut) n++;
    }
    return n;
  }

  function note(r) {
    var now = performance.now();
    r._at = now;
    /* Stored under the numeric key the model uses, so a lookup by casualty
       id hits without a scan. r.uid is kept on the reading itself for the
       ingest card, which shows what the network actually called the track. */
    var k = keyOf(r.uid);
    if (!T.readings[k]) T.order.push(k);
    T.readings[k] = r;
    T.msgs++;
    T.lastAt = now;
    T._win.push(now);
    while (T._win.length && now - T._win[0] > 4000) T._win.shift();
    T.rate = T._win.length / 4;
  }

  /* ---- the seam into the tasking model ---------------------------------
     The optimiser reads knownCrm / knownAt / knownQ off each casualty. When
     a live reading exists for that casualty it supersedes the simulated one.
     Everything downstream — the deadline, the trust gate, the tasking order,
     the inspector — is unchanged, which is the property that makes this an
     ingest path rather than a second simulation.

     CRI arrives on 0..1 and this application carries it on 0..100. */
  /* THE UID AND THE CASUALTY ID ARE NOT THE SAME STRING, and until this was
     written they never matched, so every lookup missed and no live reading
     ever reached the tasking layer. A CoT event identifies a track the way
     the tactical network does — "CAS-084" — while the model carries a bare
     integer, 84. Both forms are accepted here and the match is made on the
     digits, because the alternative is asking a fielded system to rename its
     tracks to suit this program.

     A real monitor's uid will be a device or a person, not a casualty
     number. That mapping is the roster problem, and it is out of scope for
     a prototype; what is in scope is that when the uid does identify the
     casualty, the reading is used. */
  function keyOf(id) {
    if (id === null || id === undefined) return null;
    var m = String(id).match(/(\d+)\s*$/);
    return m ? String(parseInt(m[1], 10)) : String(id);
  }
  function readingFor(id) {
    var k = keyOf(id);
    if (k === null) return null;
    var r = T.readings[k];
    if (!r) return null;
    if (performance.now() - r._at > DOWN_MS) return null;
    return { crm: r.cri * 100, q: r.quality, hr: r.hr, device: r.device };
  }

  function connect() {
    if (T.es) { try { T.es.close(); } catch (e) { /* already gone */ } }
    try {
      T.es = new EventSource('/telemetry/stream');
    } catch (e) { T.connected = false; return; }
    T.es.onopen = function () { T.connected = true; paint(); };
    T.es.onerror = function () {
      /* EventSource retries on its own. Reflect the truth in the meantime. */
      T.connected = false; paint();
    };
    T.es.onmessage = function (ev) {
      var r;
      try { r = JSON.parse(ev.data); } catch (e) { return; }
      if (!r || !r.uid) return;
      note(r);
    };
  }

  function probe() {
    return fetch('/telemetry/status', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) { T.available = false; return; }
        T.available = !!j.enabled;
        T.bind = j.bind || '';
        T.external = !!j.external;
        T.transport = j.transport || 'CoT/UDP';
        if (T.available && !T.es) connect();
      })
      .catch(function () { T.available = false; });
  }

  /* ---- the chip in the tool row ---------------------------------------- */
  function chipEl() {
    var el = document.getElementById('ingestChip');
    if (el) return el;
    /* The tool row's right-hand group, beside ONLINE — the place the eye
       already goes for "is this thing connected". */
    var host = document.querySelector('#toolbar .tool-r') ||
               document.getElementById('toolbar');
    if (!host) return null;
    el = document.createElement('button');
    el.id = 'ingestChip';
    el.className = 'ingChip';
    el.type = 'button';

    /* IT WAS NEVER BOUND TO ANYTHING.

       This shipped as a <span> with tabIndex 0, a help cursor and no handler
       of any kind — so it read as a control, took focus like a control, and
       did nothing when pressed. A status readout that looks pressable has to
       either stop looking pressable or do the thing it implies. It implies
       "show me the link", and the link's full account — transport, bind
       address, device count, message rate, what supersedes what — is already
       written on Sensor & model. Go there, and mark the card so the eye
       lands on it rather than on the pane's first heading. */
    var go = function () {
      try {
        if (typeof goView === 'function') goView('SENSOR');
        else if (window.APP) { APP.view = 'SENSOR'; }
        if (window.APP) APP._paneForce = true;
        if (typeof render === 'function') render();
        setTimeout(function () {
          var card = document.getElementById('ingCard');
          if (!card) return;
          if (card.scrollIntoView) card.scrollIntoView({ block: 'center' });
          card.classList.add('ingFlash');
          setTimeout(function () { card.classList.remove('ingFlash'); }, 1400);
        }, 90);
      } catch (e) { /* contained: a status chip must not take the tool row with it */ }
    };
    el.addEventListener('click', go);
    el.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); }
    });
    host.appendChild(el);
    return el;
  }

  var LABEL = {
    OFF:     'INGEST OFF',
    DOWN:    'LINK DOWN',
    STALE:   'LINK STALE',
    WAITING: 'WAITING',
    LIVE:    'LIVE'
  };

  function paint() {
    var st = linkState();
    var el = chipEl();
    if (el) {
      el.dataset.state = st;
      var n = deviceCount();
      el.innerHTML =
        '<i></i><b>' + LABEL[st] + '</b>' +
        (st === 'LIVE' || st === 'STALE'
          ? '<u>' + n + ' dev · ' + T.rate.toFixed(1) + '/s</u>'
          : '');
      el.title = st === 'OFF'
        ? 'Telemetry ingest is not enabled. Start the launcher with -cot :6969 and run the device emitter to feed it. Press for the full account on Sensor & model.'
        : 'CoT/UDP on ' + T.bind + (T.external ? ' (external interface)' : ' (loopback only)') +
          ' · ' + T.msgs + ' messages · last ' +
          (ageSec() < 0 ? 'never' : ageSec().toFixed(1) + 's ago') +
          '. Stop the emitter to see the tasking layer carry on with the link gone. Press for the full account on Sensor & model.';
    }
    var card = document.getElementById('ingCard');
    if (card) card.innerHTML = cardHTML(st);
  }

  function cardHTML(st) {
    var n = deviceCount();
    var rows = [
      ['SOURCE', T.available
        ? (T.transport + ' on ' + T.bind + (T.external ? ' · external interface' : ' · loopback only'))
        : 'none — ingest listener not enabled'],
      ['LINK', LABEL[st] + (st === 'LIVE' || st === 'STALE'
        ? ' · last message ' + ageSec().toFixed(1) + 's ago' : '')],
      ['DEVICES REPORTING', T.available ? String(n) : '—'],
      ['MESSAGE RATE', T.available ? T.rate.toFixed(1) + ' / s' : '—'],
      ['MESSAGES RECEIVED', T.available ? String(T.msgs) : '—']
    ];
    return '<div class="cardHead"><span>Telemetry ingest</span>' +
      '<span class="pill ' + (st === 'LIVE' ? 'ok' : st === 'OFF' ? '' : 'warn') + '">' +
      LABEL[st] + '</span></div>' +
      '<table class="ingTbl">' + rows.map(function (r) {
        return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>';
      }).join('') + '</table>' +
      '<p class="ingNote">' + (T.available
        ? 'Readings are arriving from outside this program, over a socket, in Cursor on Target — the format TAK already carries across tactical networks. BATDOK-J, the JOMIS point-of-injury and en-route care application from AFRL\u2019s 711th Human Performance Wing, is what would produce them in the field. <b>This is an interface this application accepts, not an integration tested against a real BATDOK-J.</b> Where a live reading exists for a casualty it supersedes the simulated one, and the tasking layer cannot tell a simulated emitter from a real monitor. <b>Stop the emitter and the link goes down; the tasking layer keeps running on last-known state.</b>'
        : 'No listener. Every reading on this screen is produced by the simulation and read back out of its own memory — which demonstrates the tasking logic and demonstrates nothing about acquisition. Start the launcher with <code>-cot :6969</code> and run <code>cotsim</code> to feed it a real socket.') +
      '</p>';
  }

  /* The card lives on Sensor &amp; model, which is where the rest of the
     physiological chain is explained. Injected on first sight of the pane so
     this module owns its own markup and can be removed without editing the
     template. */
  function mount() {
    var pane = document.querySelector('[data-pane="SENSOR"]');
    if (!pane || document.getElementById('ingCard')) return;
    var host = pane.querySelector('.pane') || pane;
    var card = document.createElement('section');
    card.id = 'ingCard';
    card.className = 'card ingCard';
    var head = host.querySelector('.paneHead');
    if (head && head.nextSibling) host.insertBefore(card, head.nextSibling);
    else host.appendChild(card);
    card.innerHTML = cardHTML(linkState());
  }

  /* The readings still inside the stale window, newest first. A surface that
     reports the link has to be able to say what arrived on it, and until this
     existed the only way out of this module was one casualty at a time. */
  function freshReadings() {
    var cut = performance.now() - DOWN_MS, out = [];
    for (var i = 0; i < T.order.length; i++) {
      var r = T.readings[T.order[i]];
      if (r && r._at >= cut) out.push({
        uid: r.uid, cri: r.cri, hr: r.hr, quality: r.quality,
        device: r.device, ageSec: (performance.now() - r._at) / 1000
      });
    }
    return out.sort(function (a, b) { return a.ageSec - b.ageSec; });
  }

  /* ---- wiring ---------------------------------------------------------- */
  function start() {
    probe();
    setInterval(probe, 10000);      /* the listener can be started later    */
    setInterval(function () { mount(); paint(); }, 500);
    if (window.ANGEL && ANGEL.provide) {
      ANGEL.provide('telemetry', {
        readingFor: readingFor,
        state: linkState,
        available: function () { return T.available; },
        devices: deviceCount,
        rate: function () { return T.rate; },
        messages: function () { return T.msgs; },
        readings: freshReadings
      });
    }

    /* THE EXPORT WAS THE DEFECT.

       `available` shipped as a function, so every consumer's `if (T &&
       T.available)` was true whether or not a listener existed, and the
       object carried no lastAt, so the age those consumers computed was
       always -1 and every surface read LINK DOWN for ever — including with
       the emitter running. The fix is to publish the live truth rather than
       closures over it: `available` is a boolean, `lastAt` is an epoch
       millisecond so `Date.now() - lastAt` is the real age, and the counts a
       surface needs to report the link are here rather than reachable only
       through the console's own DOM. Nothing in this build called
       `available()`, so nothing loses a call site. */
    var api = { readingFor: readingFor, state: linkState, readings: freshReadings };
    Object.defineProperties(api, {
      available: { enumerable: true, get: function () { return !!T.available; } },
      connected: { enumerable: true, get: function () { return !!T.connected; } },
      bind:      { enumerable: true, get: function () { return T.bind; } },
      transport: { enumerable: true, get: function () { return T.transport || 'CoT/UDP'; } },
      external:  { enumerable: true, get: function () { return !!T.external; } },
      devices:   { enumerable: true, get: function () { return deviceCount(); } },
      /* Recomputed at read time. T.rate is only updated when a message
         lands, so a surface that read it after the emitter stopped kept
         printing the last rate it ever saw — a live figure that had quietly
         stopped being live. Counting the window here makes it fall to zero
         the way the link does. */
      rate:      { enumerable: true, get: function () {
        var now = performance.now(), n = 0;
        for (var i = 0; i < T._win.length; i++) if (now - T._win[i] <= 4000) n++;
        return n / 4;
      } },
      msgs:      { enumerable: true, get: function () { return T.msgs; } },
      /* Epoch milliseconds, not performance.now() — the consumers subtract
         this from Date.now(). Zero when nothing has ever arrived. */
      lastAt:    { enumerable: true, get: function () {
        return T.lastAt ? Date.now() - (performance.now() - T.lastAt) : 0; } }
    });
    window.TELEMETRY = api;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else { start(); }
})();
