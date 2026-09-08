/* ============================================================================
   ANGEL SWARM — COMMAND PALETTE, KEYBOARD, AND ORIENTATION

   This file is the seam between the shell and the seven subsystems bolted to
   it. Nothing here is a feature of its own; everything is a place where two
   authors' work had to be made to agree.

   It does four things.

   1. ONE KEYBOARD GUARD. Six modules registered their own window-level key
      handlers, each with its own idea of when the operator is typing. The
      host's own table skipped `INPUT` and nothing else, so a `<select>` with
      focus, or a `contenteditable`, still fired simulation shortcuts. Rather
      than rewrite six modules — which are owned by other authors and which
      correctly delete their own handler when they fail to load — this file
      installs a single guard in front of every global key listener in the
      application, however and whenever it is registered. See §2.

   2. A COMMAND PALETTE on Ctrl/Cmd-K. Every view, every action, every SQL
      preset, every doctrine passage, every casualty and every unit, in one
      fuzzy-searched list, driven entirely from the keyboard.

   3. A SHORTCUT SHEET on "?", generated from one table that is also the
      source of the key hints shown in the palette. There is exactly one
      place in this application where a keystroke is written down.

   4. WELCOME ORIENTATION. The welcome overlay makes the argument; this
      adds, underneath it, a short list of what is actually in the build.

      It used to leave a dismissible strip behind as well. That strip is
      gone: measured, it was seven controls of permanent chrome duplicating
      the top four rail entries, and it survived on screen across all
      twenty-one views, which is not what "first-run" means. The role
      switcher on the command bar now does the orientation job it was
      reaching for, properly.

   5. THE ROLE KEYS. The role profiles are owned by js/app.js; the keyboard
      that reaches them is owned here, because this file is where every
      keystroke in the application is written down exactly once.

   Load order matters and is not accidental. This is a classic script, placed
   after js/app.js in the document: classic scripts execute during parsing,
   deferred ES modules only afterwards, so the guard in §2 is in place before
   any other key handler in the application is registered — including the
   host's own, which are bound on DOMContentLoaded.

   Nothing in this file reaches the network. It has no assets.
   ========================================================================== */
(function () {
  'use strict';

  /* Never let this file be the reason the application fails to start. Every
     entry point below is wrapped; a fault in the palette must cost the
     palette and nothing else. */
  const safe = (label, fn) => function () {
    try { return fn.apply(this, arguments); }
    catch (e) { console.warn('[palette:' + label + '] ' + e); return null; }
  };

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const MODLABEL = IS_MAC ? '⌘' : 'Ctrl';

  /* app() rather than a captured reference: this file loads before app.js has
     finished building anything, and `APP` is a top-level const that only
     resolves by bare name. app.js publishes window.APP; the bare-name path is
     the fallback for a build where that line has not been applied. */
  function app() {
    if (typeof window.APP !== 'undefined' && window.APP) return window.APP;
    try { return APP; } catch (e) { return null; }
  }
  function repaint() {
    const A = app(); if (!A) return;
    A._paneForce = true;
    if (typeof render === 'function') render();
  }
  function goView(v, opts) {
    const A = app(); if (!A) return;
    /* The two map keys are aliases onto one destination. app.js owns the
       renderer choice — including persisting it and handing the clock over —
       so this defers to it rather than setting A.mapMode behind its back. */
    if (v === 'THEATER3D' || v === 'MISSION3D' || v === 'MISSION2D') {
      if (v !== 'MISSION2D' && !hasView('THEATER3D')) return;
      A.view = 'MISSION';
      if (!opts || !opts.keepSel) A.sel = null;
      if (typeof window.setMapMode === 'function') {
        window.setMapMode(v === 'MISSION2D' ? '2D' : '3D');
      }
      repaint();
      return;
    }
    if (!document.querySelector('[data-pane="' + v + '"]')) return;
    A.view = v;
    if (!opts || !opts.keepSel) A.sel = null;
    if (!['DASHBOARD', 'MISSION', 'COMPARE', 'STANDARD'].includes(v)) {
      document.body.classList.add('navOpen');
    }
    repaint();
  }
  const click = id => { const el = $(id); if (el) el.click(); return !!el; };


  /* ==========================================================================
     1. THE STATE THIS FILE SHARES
     ====================================================================== */

  const ANG = window.ANGEL || null;

  /* window.APP as a safety net. app.js sets it explicitly and that is the
     documented home for it; this only covers a build where app.js is the
     older copy, and it is a no-op otherwise. Defined as a getter over the
     bare name because a top-level `const` lives in the global declarative
     record, which `window` cannot see but a function body can. */
  if (typeof window.APP === 'undefined') {
    try {
      Object.defineProperty(window, 'APP', {
        configurable: true,
        get: function () { try { return APP; } catch (e) { return undefined; } }
      });
    } catch (e) { /* a browser that refuses this simply keeps window.APP unset */ }
  }
  if (ANG && !ANG.app) ANG.app = () => app();


  /* ==========================================================================
     2. THE KEYBOARD GUARD

     An audit of every key handler in app/js at the time of writing:

       app.js      window keydown   Space R Escape + - 0 1-9 s c d
       app.js      document keydown Escape (leave the expanded film)
       app.js      #sqlBox keydown  Mod-Enter (element-scoped, left alone)
       charts.js   window keydown   F   -> Casualty flow
       data2.js    window keydown   Q   -> Analytical console
       data2.js    #q2CM keydown    stopPropagation (element-scoped)
       montecarlo  window keydown   U   -> How much is the seed?
       geo3d.js    window keydown   G   -> Tactical map, and , . P F in-pane
       geo3d.js    #g3Scrub keydown arrows/Home/End (element-scoped)
       copilot.js  #cpQ keydown     Enter (element-scoped)
       doctrine.js #docQ keydown    Enter (element-scoped)

     Each of the five window-level module handlers carries its own copy of a
     typing guard, and each copy is slightly different: app.js checks
     `INPUT` only, the module handlers check `INPUT`, `TEXTAREA` and
     `isContentEditable`, and none of them checks `SELECT`. Measured before
     the fix: with the metric `<select>` on the confidence pane focused,
     pressing "d" to change the selection navigated the application to the
     database pane instead.

     The fix is one guard in front of all of them. `addEventListener` is
     wrapped so that any key listener registered on `window` or `document` —
     by this file, by the host, by a module loaded later, by a module that
     does not exist yet — is delivered only when the operator is not typing
     and the event has not been claimed. Listeners bound to specific elements
     are never wrapped, so CodeMirror's keymap, the 3D scrubber's arrow keys
     and the two search boxes keep working exactly as their authors wrote
     them.

     This is a deliberate monkey-patch of a platform method, which is not a
     thing to do lightly. It earns its place because the alternative is six
     edits in five files owned by other people, each of which would have to
     be repeated by the next author who adds a pane.
     ====================================================================== */

  const KEY_TYPES = { keydown: 1, keypress: 1, keyup: 1 };
  const NATIVE_ADD = EventTarget.prototype.addEventListener;
  const NATIVE_REMOVE = EventTarget.prototype.removeEventListener;
  const wrappers = new WeakMap();

  /* The single answer to "is the operator typing?". Everything that can
     receive text is here: form fields, any contenteditable host, and
     CodeMirror 6, whose editable surface is a contenteditable div inside
     `.cm-editor` — `isContentEditable` already covers it, and the class
     check covers the gutters and panels around it that can take focus. */
  function isTyping(ev) {
    const t = (ev && ev.target) || document.activeElement;
    if (!t || t === document || t === document.body || !t.tagName) return false;
    const tag = t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION') return true;
    if (t.isContentEditable) return true;
    if (typeof t.closest === 'function') {
      if (t.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"],' +
                    '.cm-editor,.CodeMirror')) return true;
    }
    return false;
  }

  /* An event this file has handled, or one that arrived while a modal
     surface of this file's owns the keyboard. Either way no other handler in
     the application should see it. */
  function claimed(ev) {
    if (ev && ev._angelClaimed) return true;
    return CK.open || KS.open;
  }

  function suppressed(ev) { return isTyping(ev) || claimed(ev); }

  /* A one-shot listener is never a shortcut table — it is somebody waiting
     for the next key, and swallowing it would consume the `once` without
     delivering anything. Those are passed through untouched, which keeps the
     wrapper's semantics identical to the platform's in every case. */
  const wrappable = opts => !(opts && typeof opts === 'object' && opts.once);

  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if ((this === window || this === document) && wrappable(opts) &&
        KEY_TYPES[type] === 1 && typeof fn === 'function' && !fn._angelRaw) {
      let w = wrappers.get(fn);
      if (!w) {
        w = function (ev) { if (suppressed(ev)) return; return fn.call(this, ev); };
        wrappers.set(fn, w);
      }
      return NATIVE_ADD.call(this, type, w, opts);
    }
    return NATIVE_ADD.call(this, type, fn, opts);
  };

  EventTarget.prototype.removeEventListener = function (type, fn, opts) {
    if ((this === window || this === document) &&
        KEY_TYPES[type] === 1 && typeof fn === 'function' && !fn._angelRaw) {
      /* Looked up by the original function whatever options were passed, so
         a listener added with `true` and removed with `{capture:true}` still
         resolves to the same wrapper. */
      const w = wrappers.get(fn);
      if (w) return NATIVE_REMOVE.call(this, type, w, opts);
    }
    return NATIVE_REMOVE.call(this, type, fn, opts);
  };

  /* This file's own listeners bypass the wrapper — they are the dispatcher,
     not a consumer of it. */
  function onKeyRaw(fn, capture) {
    fn._angelRaw = true;
    NATIVE_ADD.call(window, 'keydown', fn, !!capture);
  }


  /* ==========================================================================
     3. THE SHORTCUT TABLE

     One table. It renders the "?" sheet, and it supplies the key hint shown
     against each destination in the palette. `has` is checked at display
     time so a shortcut belonging to a module that failed to load is not
     advertised.
     ====================================================================== */

  const SHORTCUTS = [
    { group: 'Running the mission', items: [
      { keys: ['Space'], what: 'Run or pause the mission clock' },
      { keys: ['R'], what: 'Reset the run to T+00:00' },
      { keys: ['Esc'], what: 'Close an overlay, or clear the selected record' },
      { keys: ['+'], what: 'Zoom the tactical map in' },
      { keys: ['−'], what: 'Zoom the tactical map out' },
      { keys: ['0'], what: 'Fit the tactical map to the area of operations' }
    ] },
    { group: 'The argument', items: [
      { keys: ['1'], what: 'Why this exists — the Golden Hour is gone' },
      { keys: ['2'], what: 'Where the fight is' },
      { keys: ['3'], what: 'The fight, live' },
      { keys: ['4'], what: 'The difference — with ANGEL SWARM against without' }
    ] },
    { group: 'During the run', items: [
      { keys: ['5'], what: 'Units and the overwatch drone' },
      { keys: ['6'], what: 'Drones' },
      { keys: ['7'], what: 'Blood and supplies' },
      { keys: ['8'], what: 'Approvals' },
      { keys: ['S'], what: 'Ground truth stream' },
      { keys: ['G'], what: 'The fight, drawn in three dimensions', view: 'THEATER3D' },
      { keys: ['V'], what: 'Switch the map between 2D and 3D', view: 'THEATER3D' }
    ] },
    { group: 'The record it leaves', items: [
      { keys: ['9'], what: 'Decision log' },
      { keys: ['F'], what: 'Casualty flow', view: 'FLOW' },
      { keys: ['0'], what: 'Evidence' },
      { keys: ['C'], what: 'The case beyond lives' }
    ] },
    { group: 'How it works', items: [
      { keys: ['M'], what: 'Sensor and model', view: 'SENSOR' },
      { keys: ['U'], what: 'How much of this is the seed?', view: 'CONFIDENCE' },
      { keys: ['Q'], what: 'Analytical console', view: 'QUERY' },
      { keys: ['D'], what: 'Export the database' }
    ] },
    { group: 'Who this screen is for', items: [
      { keys: ['`'], what: 'Cycle the role profile — commander, logistician, surgeon, analyst' },
      { keys: ['Alt', '1'], what: 'Commander — decision support' },
      { keys: ['Alt', '2'], what: 'Logistician — supply chain' },
      { keys: ['Alt', '3'], what: 'Surgeon — medical operations' },
      { keys: ['Alt', '4'], what: 'Analyst — everything, exactly as it was' }
    ] },
    { group: 'How the screen looks', items: [
      { keys: ['T'], what: 'Cycle the colour theme — console dark, night ops, field slate, high contrast' },
      { keys: ['Shift', 'T'], what: 'Cycle the colour theme backwards' }
    ] },
    { group: 'Anywhere', items: [
      { keys: [MODLABEL, 'K'], what: 'Command palette — search every view, action, passage and casualty' },
      { keys: ['?'], what: 'This sheet' },
      { keys: [MODLABEL, '↵'], what: 'Run the query, in either SQL console' }
    ] },
    { group: 'On the 3D map', items: [
      { keys: ['P'], what: 'Play or pause the replay', view: 'THEATER3D' },
      { keys: [','], what: 'Step the replay back', view: 'THEATER3D' },
      { keys: ['.'], what: 'Step the replay forward', view: 'THEATER3D' },
      { keys: ['F'], what: 'Fit the camera to the area of operations', view: 'THEATER3D' },
      { keys: ['←', '→'], what: 'Scrub, with the timeline focused', view: 'THEATER3D' }
    ] }
  ];

  /* THEATER3D stopped being a pane when the two tactical maps were merged
     into one destination with a renderer switch. It is still a real place a
     judge can be sent to — "the fight, in 3D" — so it answers here against
     the GPU map's own host rather than against a [data-pane] that no longer
     exists. Every catalogue entry, shortcut row and strip item keyed to it
     therefore keeps working, and disappears honestly on a machine where the
     3D renderer withdrew itself. */
  const has3D = () => !!document.getElementById('g3Host');
  const hasView = v => !v ? true
    : v === 'THEATER3D' ? has3D()
    : !!document.querySelector('[data-pane="' + v + '"]');

  /* Section weights. A judge who types "blood" almost certainly wants the
     blood and supplies pane, not the twelve doctrine passages that also
     contain the word — but "blood" is a better literal match against
     "Blood support" than against "Blood & supplies", so text score alone
     puts the corpus first. Destinations and commands are lifted above
     content; content is still one keystroke further down the same list. */
  const SECTION_WEIGHT = {
    'Go to': 20, 'Do': 15, 'Scenario': 10,
    'Analytical console': 7, 'Wounded soldiers': 3, 'Units': 3, 'Drones': 3,
    'Doctrine': 0
  };

  /* view key -> the key that reaches it, for the palette's hint column. */
  function keyForView(v) {
    const el = document.querySelector('#rail [data-view="' + v + '"] u');
    return el ? el.textContent.trim() : '';
  }


  /* ==========================================================================
     4. THE DISPATCHER

     Only three bindings are added here, and one conflict is resolved. Every
     other keystroke in the application stays with the module that owns it —
     the point of §2 is that they no longer need to be moved.
     ====================================================================== */

  onKeyRaw(safe('dispatch', function (ev) {
    const mod = ev.metaKey || ev.ctrlKey;

    /* Ctrl/Cmd-K everywhere, including from inside a text field: it is the
       one key that has to work when the operator is already typing. */
    if (mod && !ev.altKey && (ev.key === 'k' || ev.key === 'K')) {
      ev.preventDefault(); ev._angelClaimed = true;
      CK.open ? CK.close() : CK.show();
      return;
    }

    if (CK.open) { CK.key(ev); return; }
    if (KS.open) {
      if (ev.key === 'Escape' || ev.key === '?' || ev.key === '/') {
        ev.preventDefault(); ev._angelClaimed = true; KS.close();
      }
      return;
    }

    /* Escape out of a text field rather than into the simulation. Without
       this the only way to leave the doctrine box or the SQL editor is the
       mouse, because §2 correctly refuses to let Escape through while the
       operator is typing. */
    if (isTyping(ev)) {
      if (ev.key === 'Escape' && document.activeElement &&
          typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
        ev._angelClaimed = true;
      }
      return;
    }

    /* THE ROLE KEYS, claimed before the Alt guard below and before app.js's
       own number-key table sees them.

       Alt-1..4 rather than plain digits because 1..9 are already the view
       shortcuts and always have been; on this platform Alt-1 still reports
       ev.key === '1', so leaving it unclaimed would navigate the operator to
       "Why this exists" on the way to becoming a commander. Claiming it here
       is enough — §2's guard stops every wrapped window handler in the
       application from seeing an event this file has marked.

       The backtick cycles. It is the only unbound key adjacent to the number
       row, which is where a demonstrator's hand already is. */
    const R = window.ANGEL && ANGEL.role;
    if (R) {
      if (ev.altKey && !mod && ev.code && /^Digit[1-4]$/.test(ev.code)) {
        ev.preventDefault(); ev._angelClaimed = true;
        R.set(R.keys()[Number(ev.code.slice(5)) - 1]);
        return;
      }
      if (!mod && !ev.altKey && (ev.key === '`' || ev.key === '~')) {
        ev.preventDefault(); ev._angelClaimed = true;
        R.cycle(ev.shiftKey ? -1 : 1);
        return;
      }
    }

    /* THE THEME KEY. T cycles the four colour themes, Shift-T goes back.
       Claimed here for the same reason the role keys are: it has to beat
       every wrapped window handler in the application, and it must not reach
       a text field, which §2 above has already ruled out by this line.
       Unbound before this — the retired light/dark toggle had no key at all. */
    const TH = window.ANGEL && ANGEL.get && ANGEL.get('theme');
    if (TH && !mod && !ev.altKey && (ev.key === 't' || ev.key === 'T')) {
      ev.preventDefault(); ev._angelClaimed = true;
      TH.cycle(ev.shiftKey ? -1 : 1);
      return;
    }

    if (mod || ev.altKey) return;

    if (ev.key === '?' || (ev.key === '/' && ev.shiftKey)) {
      ev.preventDefault(); ev._angelClaimed = true; KS.show(); return;
    }

    /* F on the 3D map. Two modules answer F: charts.js navigates to the
       casualty flow pane, geo3d.js fits the camera. Both are window
       listeners, both fire, and the observed result was that pressing F to
       frame the map threw the operator onto a different pane. The key is
       claimed here while that pane is the visible one, so exactly one thing
       happens, and it is the one the pane's own legend advertises. */
    if ((ev.key === 'f' || ev.key === 'F')) {
      /* The 3D map is a renderer inside "the fight" now, not a pane of its
         own, so "is the map on screen" is the mission pane being visible AND
         the GPU renderer being the one selected. Probing the old
         [data-pane="THEATER3D"] silently stopped matching when the two maps
         were merged, which handed F back to the casualty-flow pane and threw
         the operator off the map they were trying to frame. */
      const p = document.querySelector('[data-pane="MISSION"]');
      const A = app();
      if (p && p.classList.contains('active') && A && A.mapMode === '3D' && has3D()) {
        ev._angelClaimed = true;
        const fit = $('g3Fit'); if (fit) fit.click();
        return;
      }
    }

    /* M reaches the sensor pane. The rail has advertised M against "Sensor
       and model" since that pane was added and nothing ever bound it —
       device.js registers no key handler at all. */
    if ((ev.key === 'm' || ev.key === 'M') && hasView('SENSOR')) {
      ev._angelClaimed = true;
      goView('SENSOR');
    }
  }), true);


  /* ==========================================================================
     5. FUZZY MATCHING

     Subsequence matching with the usual bonuses: a hit at the start of the
     string, a hit at the start of a word, and runs of consecutive hits all
     score higher than a scattered match. Every space-separated token in the
     query must match somewhere, so "cas 12" and "12 cas" both find CAS-012.
     ====================================================================== */

  function matchOne(q, hay) {
    const H = hay.toLowerCase(), n = q.length, m = H.length;
    if (!n) return { score: 0, hits: [] };
    if (n > m) return null;
    let qi = 0, score = 0, run = 0;
    const hits = [];
    for (let i = 0; i < m && qi < n; i++) {
      if (H.charCodeAt(i) !== q.charCodeAt(qi)) { run = 0; continue; }
      let bonus = 1;
      if (i === 0) bonus += 8;
      else {
        const prev = H.charCodeAt(i - 1);
        /* space, hyphen, slash, underscore, dot, comma, colon, parenthesis */
        if (prev === 32 || prev === 45 || prev === 47 || prev === 95 ||
            prev === 46 || prev === 44 || prev === 58 || prev === 40) bonus += 6;
      }
      run++; bonus += Math.min(run, 5) * 2;
      score += bonus;
      hits.push(i);
      qi++;
    }
    if (qi < n) return null;
    /* Prefer the shorter of two equally good matches, and an exact prefix
       above everything. */
    score -= Math.min(m, 60) * 0.06;
    if (H.startsWith(q)) score += 14;
    return { score, hits };
  }

  function match(tokens, item) {
    if (!tokens.length) return { score: 0, hits: [] };
    let total = 0, hits = [];
    for (const t of tokens) {
      const a = matchOne(t, item.title);
      const b = item.sub ? matchOne(t, item.sub) : null;
      const c = item.hay ? matchOne(t, item.hay) : null;
      if (!a && !b && !c) return null;
      /* The title is what the operator is looking at, so it is worth more
         than a hit buried in a subtitle or in hidden search text. */
      const best = Math.max(a ? a.score : -1e9,
                            b ? b.score * 0.55 : -1e9,
                            c ? c.score * 0.4 : -1e9);
      total += best;
      if (a) hits = hits.concat(a.hits);
    }
    return { score: total, hits };
  }

  function mark(title, hits) {
    if (!hits || !hits.length) return esc(title);
    const set = new Set(hits);
    let out = '';
    for (let i = 0; i < title.length; i++) {
      const ch = esc(title[i]);
      out += set.has(i) ? '<mark>' + ch + '</mark>' : ch;
    }
    return out;
  }


  /* ==========================================================================
     6. USE HISTORY

     Recent first, then frequent. Kept in localStorage so the ordering
     survives a reload; it is a count of clicks on a local page and it goes
     nowhere. A browser with storage disabled simply gets an in-memory copy
     for the session.
     ====================================================================== */

  const MRU_KEY = 'angel.cmdk.mru.v1';
  let mru = {};
  try { mru = JSON.parse(localStorage.getItem(MRU_KEY) || '{}') || {}; }
  catch (e) { mru = {}; }
  let seq = 0;
  for (const k in mru) seq = Math.max(seq, mru[k].last || 0);

  function noteUse(id) {
    const r = mru[id] || (mru[id] = { n: 0, last: 0 });
    r.n++; r.last = ++seq;
    try { localStorage.setItem(MRU_KEY, JSON.stringify(mru)); } catch (e) { /* fine */ }
  }
  function useScore(id) {
    const r = mru[id];
    if (!r) return 0;
    /* Recency dominates; frequency breaks ties among things used equally
       long ago. Both are capped so a much-used command cannot outrank an
       exact text match on something else. */
    return Math.min(24, (r.last / Math.max(1, seq)) * 18) + Math.min(10, r.n * 1.5);
  }


  /* ==========================================================================
     7. THE ITEM CATALOGUE

     Rebuilt on every open, never cached. The application removes nav entries
     and whole panes when a module fails, casualty ids only exist once a run
     has started, and the doctrine index arrives seconds after the page does.
     A catalogue built once at startup would advertise all of it wrongly.
     ====================================================================== */

  function viewItems() {
    const out = [];
    document.querySelectorAll('#rail [data-view]').forEach(el => {
      const v = el.dataset.view;
      if (!hasView(v)) return;
      const nt = el.querySelector('.nt');
      const title = ((nt ? nt.querySelector('em') : el.querySelector('em')) || {}).textContent || v;
      const subEl = nt ? nt.querySelector('i') : null;
      const k = el.querySelector('u');
      const ico = el.querySelector('.ni');
      out.push({
        id: 'view:' + v,
        section: 'Go to',
        icon: ico ? ico.textContent.trim() : '▸',
        colour: v,
        title: title.trim(),
        sub: subEl ? subEl.textContent.trim() : '',
        hay: v,
        keys: k ? [k.textContent.trim()] : [],
        run: () => goView(v)
      });
    });
    return out;
  }

  function actionItems() {
    const A = app();
    const out = [];
    const add = (id, title, sub, run, keys, icon) => {
      if (typeof run !== 'function') return;
      out.push({ id: 'act:' + id, section: 'Do', icon: icon || '›', title, sub: sub || '',
                 keys: keys || [], run });
    };

    add('play', A && A.running ? 'Pause the mission clock' : 'Run the mission',
        'Both arms fight the same battle, minute for minute',
        () => click('btnPlay'), ['Space'], '▶');
    add('reset', 'Reset the run', 'Back to T+00:00 on the same seed',
        () => click('btnReset'), ['R'], '⟲');

    ['1', '2', '4', '10'].forEach(s => {
      const el = document.querySelector('[data-speed="' + s + '"]');
      if (el) add('speed' + s, 'Run at ' + s + '× speed', '', () => el.click(), [], '»');
    });

    const onChip = document.querySelector('[data-active="on"]');
    const offChip = document.querySelector('[data-active="off"]');
    if (onChip) add('angelOn', 'Put ANGEL SWARM in control of tasking',
      'The live arm allocates against physiological deadlines', () => onChip.click(), [], '◈');
    if (offChip) add('angelOff', 'Put ANGEL SWARM in standby',
      'The live arm reverts to the current triage and proximity baseline', () => offChip.click(), [], '◇');

    if ($('btnDeployBar')) add('deploy', 'Deploy ANGEL SWARM into this operation',
      'Opens the deployment decision, with what is ready and who signs',
      () => click('btnDeployBar'), [], '⇑');

    document.querySelectorAll('[data-opmode]').forEach(el => add(
      'opmode' + el.dataset.opmode,
      'Set operating mode to ' + el.dataset.opmode.toLowerCase(),
      'Synthetic data throughout, in either mode', () => el.click(), [], '▤'));

    document.querySelectorAll('[data-theaterpick]').forEach(el => add(
      'theater' + el.dataset.theaterpick,
      'Show the ' + el.dataset.theaterpick + ' theater',
      '', () => el.click(), [], '◎'));

    /* The operation crumb is a picker, not a back button. Opening it from here
       is the same click, so there is one implementation and one behaviour.
       The palette closes itself before this runs, which is what lets the menu
       take the focus it moves into its current row. */
    if ($('btnOpPick')) add('oppick', 'Switch operation',
      'All seven operations across both combatant commands, with what each is carrying',
      () => click('btnOpPick'), [], '⌖');

    /* Scenarios come from the simulation, not from a list written here, so a
       scenario added to sim.js appears without an edit to this file. */
    let SC = null;
    try { SC = (typeof SCENARIOS !== 'undefined') ? SCENARIOS : window.SCENARIOS; } catch (e) { SC = null; }
    if (SC && A) {
      for (const k in SC) {
        const s = SC[k];
        out.push({
          id: 'scn:' + k, section: 'Scenario', icon: '◉',
          title: 'Run ' + (s.name || k),
          sub: (s.joa ? s.joa + ' · ' : '') + (s.theater || '') +
               (s.durationMin ? ' · ' + s.durationMin + ' min' : ''),
          hay: k, keys: [],
          run: () => {
            A.scenarioKey = k;
            if (typeof resetSim === 'function') resetSim(false);
            goView('DASHBOARD');
          }
        });
      }
    }

    /* THE FOUR THEMES. Read from js/theme.js rather than listed here, so a
       fifth theme appears in the palette without an edit to this file. The
       retired light/dark toggle had one entry that named the state it was
       going to; four themes need four entries, because "switch the theme"
       stops being an instruction the moment there is more than one answer. */
    const TH = ANG && ANG.get && ANG.get('theme');
    if (TH) {
      TH.list().forEach(t => add('theme:' + t.key,
        'Use the ' + t.label.toLowerCase() + ' theme',
        t.blurb + (t.key === TH.current() ? '  ·  in use' : ''),
        () => TH.set(t.key), t.key === TH.current() ? [] : [], '◐'));
      add('themeCycle', 'Cycle the colour theme',
        'Console dark, night ops, field slate, high contrast — and back',
        () => TH.cycle(1), ['T'], '◐');
    }

    if ($('audBtn')) {
      const on = ANG && ANG.get && ANG.get('audio') && ANG.get('audio').isOn();
      add('audio', on ? 'Turn the sound off' : 'Turn the sound on',
        'A tone tracking aggregate time pressure, and cues for calls, launches and deaths',
        () => click('audBtn'), [], on ? '◉' : '◍');
    }

    /* "The fight" is one destination with two renderers, so the palette
       offers the two renderers rather than two views. Both entries navigate
       and set the mode, so typing "3D" gets a judge to the GPU map in one
       action from anywhere in the application. They are only offered where
       the GPU renderer actually exists. */
    if (hasView('THEATER3D')) {
      add('map3d', 'The fight — 3D map',
        'The GPU tactical picture: pitched terrain, sortie arcs, scrubbable replay',
        () => goView('THEATER3D'), ['G'], '◮');
      add('map2d', 'The fight — 2D map',
        'The flat tactical picture, drawn live on canvas',
        () => goView('MISSION2D'), ['3'], '▣');
    }

    if (hasView('CONFIDENCE')) add('mc', 'Run the Monte Carlo replications',
      'The same battle a few hundred times on different seeds, paired',
      () => { goView('CONFIDENCE'); setTimeout(() => click('mcRun'), 260); },
      ['U'], '±');

    if ($('btnDbSync')) add('dbsync', 'Sync the run into the database',
      'Materialise the current run as tables', () => click('btnDbSync'), [], '⛁');
    if ($('btnAcct')) add('acct', 'Who decides, and who answers for it',
      'The accountability position', () => click('btnAcct'), [], '⚖');
    if ($('btnModel')) add('model', 'Model and sources',
      'Every parameter, and where it came from', () => click('btnModel'), [], '§');

    /* The role profiles. Offered in the palette as well as on the bar because
       the palette is the one surface every role keeps in full — a commander
       who has been given five destinations can still reach all twenty-one
       from here, which is the difference between a simplified interface and
       a restricted one. */
    const R = ANG && ANG.role;
    if (R) {
      R.keys().forEach((k, i) => {
        const p = R.profile(k);
        const n = R.views(k).length;
        add('role' + k, 'View as ' + k.toLowerCase(),
          p.blurb + ' — ' + n + ' view' + (n === 1 ? '' : 's') +
          (R.has(k) ? ' · showing now' : ''),
          () => R.set(k), ['Alt', String(i + 1)], '◱');
      });
    }

    add('keys', 'Keyboard shortcuts', 'Every key this application binds',
      () => { CK.close(); KS.show(); }, ['?'], '⌨');

    const seedEl = $('seedInput');
    if (seedEl) add('seed', 'Change the seed', 'Opens Settings with the seed field focused',
      () => { goView('SETTINGS'); setTimeout(() => { seedEl.focus(); seedEl.select(); }, 220); },
      [], '#');

    return out;
  }

  function sqlItems() {
    const db = ANG && ANG.get && ANG.get('db');
    if (!db || !db.presets || !hasView('QUERY')) return [];
    return db.presets.map(p => ({
      id: 'sql:' + p.id, section: 'Analytical console', icon: '◧',
      title: p.label, sub: (p.feature ? p.feature + ' — ' : '') + (p.question || ''),
      hay: (p.question || '') + ' ' + (p.feature || ''), keys: [],
      run: () => {
        goView('QUERY');
        setTimeout(() => {
          const chip = document.querySelector('[data-preset="' + p.id + '"]');
          if (chip) chip.click();
        }, 260);
      }
    }));
  }

  function doctrineItems() {
    const d = ANG && ANG.get && ANG.get('doctrine');
    if (!d || !d.passages || !hasView('DOCTRINE')) return [];
    /* Many passages share a section name — four of them are called "Massive
       haemorrhage" — so the reference is carried alongside the title rather
       than left to the operator to infer from the quotation. */
    return d.passages.map(p => ({
      id: 'doc:' + p.id, section: 'Doctrine', icon: '§',
      title: p.section || p.id,
      tag: p.id,
      sub: p.pub + ' · ' + String(p.text || '').slice(0, 120),
      hay: (p.text || '') + ' ' + (Array.isArray(p.tags) ? p.tags.join(' ') : ''),
      keys: [],
      run: () => askDoctrine(p.section || String(p.text || '').slice(0, 80))
    }));
  }

  function askDoctrine(q) {
    goView('DOCTRINE');
    /* The pane builds its own body on first render, so the box may not exist
       for a frame or two. Poll briefly rather than guess a delay. */
    let tries = 0;
    const tick = () => {
      const box = $('docQ'), go = $('docGo');
      if (box && go) { box.value = q; go.click(); box.blur(); return; }
      if (tries++ < 40) setTimeout(tick, 60);
    };
    tick();
  }

  function recordItems() {
    const A = app();
    if (!A || !A.armA) return [];
    const out = [];
    const cas = A.armA.casualties || [];
    for (const c of cas) {
      const id = 'CAS-' + String(c.id).padStart(3, '0');
      out.push({
        id: 'cas:' + c.id, section: 'Wounded soldiers', icon: '✚',
        title: id + ' · ' + (c.role || c.injury || ''),
        sub: [c.cls, c.injury, c.unitName, c.outcome || 'open']
          .filter(Boolean).join(' · '),
        hay: id + ' ' + c.id + ' ' + (c.unitName || '') + ' ' + (c.injury || '') +
             ' ' + (c.cls || '') + ' ' + (c.outcome || ''),
        keys: [],
        run: () => {
          A.sel = { kind: 'cas', id: c.id };
          goView('CASUALTIES', { keepSel: true });
        }
      });
    }
    for (const u of (A.units || [])) {
      out.push({
        id: 'unit:' + u.key, section: 'Units', icon: '⛊',
        title: u.name, sub: 'Unit · ' + u.key, hay: u.key, keys: [],
        run: () => { A.unitSel = u.key; goView('UNITS', { keepSel: true }); }
      });
    }
    for (const d of ((A.armA && A.armA.drones) || [])) {
      /* `plat` is the platform record from sim.js, not a string — printing
         it straight gives "[object Object]". The airframe name lives on
         `plat.label`; `type` is the class key behind it. */
      const air = (d.plat && (d.plat.label || d.plat.key)) || d.type || '';
      out.push({
        id: 'drone:' + d.id, section: 'Drones', icon: '➤',
        title: 'Aircraft ' + d.id + (air ? ' · ' + air : ''),
        sub: [d.state, d.baseName, d.payloadKey].filter(Boolean).join(' · '),
        hay: String(d.id) + ' ' + (d.baseName || '') + ' ' + (d.state || '') + ' ' + (d.type || ''),
        tag: d.type || '',
        keys: [],
        run: () => { A.sel = { kind: 'drone', id: d.id }; goView('FLEET', { keepSel: true }); }
      });
    }
    return out;
  }

  function catalogue() {
    return [].concat(viewItems(), actionItems(), sqlItems(), doctrineItems(), recordItems());
  }

  /* Items that are not in the catalogue because they only exist for a
     particular query: an argument-carrying command, and the doctrine
     question that has not been asked yet. */
  function dynamicItems(qRaw) {
    const out = [];
    const q = qRaw.trim();
    const A = app();

    const seedM = /^seed\s+(\d{1,6})$/i.exec(q);
    if (seedM && A) {
      const n = Math.max(1, parseInt(seedM[1], 10));
      out.push({
        id: 'dyn:seed', section: 'Do', icon: '#', dyn: 900,
        title: 'Set the seed to ' + n + ' and re-run',
        sub: 'Both arms fight the same battle again on a different draw', keys: [],
        run: () => {
          A.seed = n;
          const el = $('seedInput'); if (el) el.value = String(n);
          if (typeof resetSim === 'function') resetSim(false);
          repaint();
        }
      });
    }

    /* The free-text doctrine question. It is never scored against the query
       — it *is* the query — so it is kept out of the ranked pool and placed
       by hand, above the list when what was typed reads like a question and
       below it when it reads like the name of something. Without that split,
       typing "flow" to reach the casualty flow pane put "Ask doctrine:
       flow" on the first row, which is not what anyone meant. */
    const d = ANG && ANG.get && ANG.get('doctrine');
    if (d && hasView('DOCTRINE') && q.length >= 4 && !/^\d+$/.test(q)) {
      const words = q.split(/\s+/).length;
      out.push({
        id: 'dyn:ask', section: 'Doctrine', icon: '§',
        ask: true,
        askFirst: /\?\s*$/.test(q) || words >= 3 || q.length >= 18,
        title: 'Ask doctrine: “' + q + '”',
        sub: 'Runs the sentence encoder against the corpus and quotes the closest passage',
        keys: ['↵'],
        run: () => askDoctrine(q)
      });
    }
    return out;
  }

  /* What a judge who has just opened this should be offered before typing
     anything. Explicitly not "most recently used" the first time round. */
  const DEFAULT_IDS = [
    'view:STANDARD', 'view:DASHBOARD', 'view:MISSION', 'view:COMPARE',
    'act:play', 'act:map3d', 'view:QUERY', 'view:DOCTRINE',
    'view:CONFIDENCE', 'view:AUDIT', 'act:keys'
  ];


  /* ==========================================================================
     8. THE PALETTE
     ====================================================================== */

  const CK = {
    open: false, items: [], shown: [], idx: 0, el: null, input: null, list: null,
    lastFocus: null
  };

  CK.build = safe('build', function () {
    if (CK.el) return CK.el;
    const el = document.createElement('div');
    el.id = 'cmdk';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Command palette');
    el.innerHTML =
      '<div class="ckBox">' +
        '<div class="ckIn">' +
          '<span class="ckGlyph" aria-hidden="true">◈</span>' +
          '<input id="ckInput" type="text" autocomplete="off" autocapitalize="off" ' +
                 'spellcheck="false" aria-label="Search views, actions, doctrine and records" ' +
                 'placeholder="Search views, actions, doctrine, casualties…">' +
          '<span class="ckEsc">ESC</span>' +
        '</div>' +
        '<div class="ckList" id="ckList" role="listbox"></div>' +
        '<div class="ckFoot">' +
          '<span><b>↑ ↓</b> move</span><span><b>↵</b> open</span>' +
          '<span><b>esc</b> close</span>' +
          '<span class="ckSpacer"></span>' +
          '<span><b>?</b> all shortcuts</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    CK.el = el;
    CK.input = el.querySelector('#ckInput');
    CK.list = el.querySelector('#ckList');

    el.addEventListener('mousedown', ev => { if (ev.target === el) CK.close(); });
    CK.input.addEventListener('input', () => CK.filter(CK.input.value));
    CK.list.addEventListener('mousemove', ev => {
      const r = ev.target.closest('.ckRow');
      if (r && r.dataset.i !== undefined) CK.select(+r.dataset.i, false);
    });
    CK.list.addEventListener('click', ev => {
      const r = ev.target.closest('.ckRow');
      if (r) { CK.select(+r.dataset.i, false); CK.activate(); }
    });
    return el;
  });

  CK.show = safe('show', function () {
    CK.build();
    CK.lastFocus = document.activeElement;
    CK.items = catalogue();
    CK.open = true;
    CK.el.classList.add('show');
    CK.input.value = '';
    CK.filter('');
    CK.input.focus();
    if (ANG && ANG.mark) ANG.mark('palette open', { items: CK.items.length });
  });

  CK.close = safe('close', function () {
    if (!CK.open) return;
    CK.open = false;
    if (CK.el) CK.el.classList.remove('show');
    if (CK.lastFocus && typeof CK.lastFocus.focus === 'function' &&
        document.contains(CK.lastFocus)) CK.lastFocus.focus();
    CK.lastFocus = null;
  });

  CK.filter = safe('filter', function (qRaw) {
    const q = (qRaw || '').toLowerCase().trim();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    const dyn = dynamicItems(qRaw || '');
    const ask = dyn.filter(i => i.ask)[0] || null;
    const pool = CK.items.concat(dyn.filter(i => !i.ask));
    let rows;

    if (!tokens.length) {
      const recent = Object.keys(mru)
        .map(id => ({ id, r: mru[id] }))
        .sort((a, b) => b.r.last - a.r.last)
        .slice(0, 6)
        .map(x => pool.find(i => i.id === x.id))
        .filter(Boolean);
      const seen = new Set(recent.map(i => i.id));
      const defaults = DEFAULT_IDS
        .map(id => pool.find(i => i.id === id))
        .filter(i => i && !seen.has(i.id));
      rows = recent.map(i => ({ i, s: 0, hits: [], sect: 'Recent' }))
        .concat(defaults.map(i => ({ i, s: 0, hits: [], sect: 'Start here' })));
    } else {
      rows = [];
      for (const it of pool) {
        const m = match(tokens, it);
        if (!m) continue;
        rows.push({ i: it, hits: m.hits, sect: it.section,
                    s: m.score + useScore(it.id) + (SECTION_WEIGHT[it.section] || 0) });
      }
      rows.sort((a, b) => b.s - a.s);
      rows = rows.slice(0, 60);
      /* Regroup by section, sections ordered by their best hit. Ranking
         alone interleaves a view, a passage, a casualty and a view again,
         and the section headings then repeat four times down a list of six
         rows. This keeps the best match on the first row and still reads as
         a list of groups. */
      const order = [], byS = new Map();
      for (const r of rows) {
        if (!byS.has(r.sect)) { byS.set(r.sect, []); order.push(r.sect); }
        byS.get(r.sect).push(r);
      }
      rows = [];
      for (const s of order) rows = rows.concat(byS.get(s));
    }

    if (ask) {
      const row = { i: ask, s: 0, hits: [], sect: 'Doctrine' };
      ask.askFirst ? rows.unshift(row) : rows.push(row);
    }

    CK.shown = rows;
    CK.paint();
    CK.select(0, true);
  });

  CK.paint = safe('paint', function () {
    if (!CK.shown.length) {
      CK.list.innerHTML = '<div class="ckNone">Nothing matches. Try a view name, a ' +
        'casualty id such as CAS-012, a unit, or a medical question.</div>';
      return;
    }
    let html = '', sect = null;
    CK.shown.forEach((r, n) => {
      if (r.sect !== sect) { sect = r.sect; html += '<div class="ckSect">' + esc(sect) + '</div>'; }
      const keys = (r.i.keys || []).filter(Boolean)
        .map(k => '<kbd>' + esc(k) + '</kbd>').join('');
      html +=
        '<div class="ckRow" role="option" data-i="' + n + '"' +
          (r.i.colour ? ' data-view="' + esc(r.i.colour) + '"' : '') + '>' +
          '<span class="ckIco" aria-hidden="true">' + esc(r.i.icon || '›') + '</span>' +
          '<span class="ckTxt"><b class="ckT">' + mark(r.i.title, r.hits) + '</b>' +
            (r.i.sub ? '<i class="ckS">' + esc(r.i.sub) + '</i>' : '') + '</span>' +
          (r.i.tag ? '<span class="ckTag">' + esc(r.i.tag) + '</span>' : '') +
          (keys ? '<span class="ckKey">' + keys + '</span>' : '') +
        '</div>';
    });
    CK.list.innerHTML = html;
  });

  CK.select = safe('select', function (n, scroll) {
    if (!CK.shown.length) { CK.idx = 0; return; }
    CK.idx = Math.max(0, Math.min(CK.shown.length - 1, n));
    const rows = CK.list.querySelectorAll('.ckRow');
    rows.forEach(r => r.classList.remove('sel'));
    const el = rows[CK.idx];
    if (!el) return;
    el.classList.add('sel');
    el.setAttribute('aria-selected', 'true');
    if (scroll !== false) el.scrollIntoView({ block: 'nearest' });
  });

  CK.activate = safe('activate', function () {
    const r = CK.shown[CK.idx];
    if (!r) return;
    noteUse(r.i.id);
    CK.close();
    /* Out of the keydown so the pane repaint is not competing with the
       overlay teardown for the same frame. */
    setTimeout(() => { try { r.i.run(); } catch (e) { console.warn('[palette:run] ' + e); } }, 0);
  });

  CK.key = safe('key', function (ev) {
    const k = ev.key;
    if (k === 'Escape') { ev.preventDefault(); ev._angelClaimed = true; CK.close(); return; }
    if (k === 'ArrowDown' || (k === 'Tab' && !ev.shiftKey) || (k === 'n' && ev.ctrlKey)) {
      ev.preventDefault(); ev._angelClaimed = true;
      CK.select(CK.idx + 1 >= CK.shown.length ? 0 : CK.idx + 1); return;
    }
    if (k === 'ArrowUp' || (k === 'Tab' && ev.shiftKey) || (k === 'p' && ev.ctrlKey)) {
      ev.preventDefault(); ev._angelClaimed = true;
      CK.select(CK.idx - 1 < 0 ? CK.shown.length - 1 : CK.idx - 1); return;
    }
    if (k === 'PageDown') { ev.preventDefault(); ev._angelClaimed = true; CK.select(CK.idx + 8); return; }
    if (k === 'PageUp') { ev.preventDefault(); ev._angelClaimed = true; CK.select(CK.idx - 8); return; }
    if (k === 'Home' && !CK.input.value) { ev.preventDefault(); CK.select(0); return; }
    if (k === 'End' && !CK.input.value) { ev.preventDefault(); CK.select(CK.shown.length - 1); return; }
    if (k === 'Enter') { ev.preventDefault(); ev._angelClaimed = true; CK.activate(); return; }
  });


  /* ==========================================================================
     9. THE SHORTCUT SHEET
     ====================================================================== */

  const KS = { open: false, el: null };

  KS.build = safe('ksBuild', function () {
    if (KS.el) return KS.el;
    const el = document.createElement('div');
    el.id = 'keysheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Keyboard shortcuts');
    document.body.appendChild(el);
    el.addEventListener('mousedown', ev => { if (ev.target === el) KS.close(); });
    KS.el = el;
    return el;
  });

  KS.render = safe('ksRender', function () {
    const cols = SHORTCUTS.map(g => {
      const rows = g.items.filter(it => hasView(it.view)).map(it =>
        '<div class="ksRow"><span class="ksK">' +
          it.keys.map(k => '<kbd>' + esc(k) + '</kbd>').join('') +
        '</span><span>' + esc(it.what) + '</span></div>').join('');
      if (!rows) return '';
      return '<div class="ksCol"><h3>' + esc(g.group) + '</h3>' + rows + '</div>';
    }).join('');

    KS.el.innerHTML =
      '<div class="ksCard">' +
        '<div class="ksHead"><div><h2>Keyboard</h2>' +
          '<p>Every key this application binds. Shortcuts are inert while you are typing — ' +
          'in a search box, a form field or the SQL editor — with one exception: ' +
          '<b>' + esc(MODLABEL) + '-K</b> opens the command palette from anywhere.</p></div>' +
          '<button type="button" id="ksClose">Close</button></div>' +
        '<div class="ksGrid">' + cols + '</div>' +
        '<div class="ksNote">A shortcut is listed here only if the pane it reaches is present in ' +
          'this build. A subsystem that could not start on this machine removes its own ' +
          'navigation entry and its own key, and both disappear from this sheet with it.</div>' +
      '</div>';
    const b = $('ksClose'); if (b) b.onclick = () => KS.close();
  });

  KS.show = safe('ksShow', function () {
    KS.build(); KS.render();
    KS.open = true; KS.el.classList.add('show');
  });
  KS.close = safe('ksClose', function () {
    KS.open = false; if (KS.el) KS.el.classList.remove('show');
  });


  /* ==========================================================================
     10. WELCOME ORIENTATION

     The welcome overlay is the argument and it is not competing with this.
     What it lacked was any statement of what is in the build, so a judge who
     read the three steps and pressed "Explore on my own" landed on a rail of
     twenty-two entries with no idea which five matter. The list below is
     appended inside the same card.

     There was also a strip: the same six destinations, left under the command
     bar after the overlay closed, with a Dismiss button. It is gone. It was
     seven controls of permanent chrome duplicating the top four rail entries,
     it stayed on screen across all twenty-one views — so it was never in any
     honest sense "first-run" — and the job it was reaching for, telling an
     arriving operator which handful of things are for them, is now done
     properly by the role switcher on the command bar. Deleted rather than
     hidden: the markup, the localStorage key, the body class and the
     stylesheet block are all removed.
     ====================================================================== */

  const TOUR = [
    { view: 'STANDARD',   icon: '⏱', label: 'Why this exists',
      note: 'the Golden Hour, measured' },
    { view: 'MISSION',    icon: '▣', label: 'Watch a battle',
      note: 'press Space' },
    { view: 'COMPARE',    icon: '⇄', label: 'The difference',
      note: 'with against without' },
    { view: 'SENSOR',     icon: '◉', label: 'The network reading the pulse',
      note: 'running here, on this machine' },
    { view: 'CONFIDENCE', icon: '±', label: 'How much of this is the seed?',
      note: 'a few hundred replications' },
    { view: 'QUERY',      icon: '◧', label: 'Ask the run anything',
      note: 'SQL over the whole record' }
  ];

  /* The welcome overlay gets the same list, in its own idiom. Appended, not
     inserted: the three steps that carry the argument stay first and stay
     exactly as written. */
  const extendWelcome = safe('welcome', function () {
    const card = document.querySelector('#welcome .wcCard');
    const foot = card && card.querySelector('.wcFoot');
    if (!card || !foot || card.querySelector('.wcTour')) return;
    const live = TOUR.filter(t => hasView(t.view));
    if (!live.length) return;
    const div = document.createElement('div');
    div.className = 'wcTour';
    div.innerHTML = '<b>AND WHAT IS ACTUALLY IN HERE</b><div class="wcTourRow">' +
      live.map(t => '<button type="button" data-go="' + t.view + '" data-view="' + t.view + '">' +
        '<span class="ni" aria-hidden="true">' + t.icon + '</span>' +
        '<span><em>' + esc(t.label) + '</em><i>' + esc(t.note) + '</i></span></button>').join('') +
      '</div>';
    card.insertBefore(div, foot);
    div.addEventListener('click', ev => {
      const b = ev.target.closest('[data-go]');
      if (!b) return;
      const w = $('welcome'); if (w) w.classList.remove('show');
      goView(b.dataset.go);
    });
  });


  /* ==========================================================================
     11. WIRING
     ====================================================================== */

  function boot() {
    extendWelcome();
    const btn = $('btnPalette');
    if (btn) {
      btn.addEventListener('click', () => CK.show());
      /* The rail's key hint is written for the platform in front of it, not
         for the author's. */
      const u = btn.querySelector('u');
      if (u) u.textContent = IS_MAC ? '⌘K' : 'Ctrl-K';
      btn.title = 'Search every view, action, doctrine passage, casualty and unit (' +
                  MODLABEL + '-K)';
    }

    /* The casualty flow pane is painted entirely by charts.js into a bare
       section, and it was the one analytical view in the application that
       opened without a title or a sentence of explanation. Give it the same
       header every other pane has, in the host's own markup, without
       touching the module that owns the body. */
    const flow = document.querySelector('[data-pane="FLOW"]');
    if (flow && !flow.querySelector('.paneShim')) {
      const shim = document.createElement('div');
      shim.className = 'paneShim';
      shim.innerHTML =
        '<div class="paneHead"><div class="ph1"><h2>Casualty flow</h2>' +
        '<p class="lede">Where the casualties in this run were lost, and when. The diagram ' +
        'follows every wounded soldier from the triage category a responder assigned to the ' +
        'state the run ended them in; the plots below it read the same three hours six ' +
        'different ways against one shared clock. Both arms are drawn from the same battle, ' +
        'so the two halves can be compared directly.</p></div></div>';
      flow.insertBefore(shim, flow.firstChild);
      const setTop = () => {
        const h = Math.ceil(shim.getBoundingClientRect().height) || 96;
        flow.style.setProperty('--flowTop', h + 'px');
      };
      setTop();
      if (typeof ResizeObserver === 'function') new ResizeObserver(setTop).observe(shim);
    }

    if (ANG && ANG.mark) ANG.mark('palette ready', { shortcuts: SHORTCUTS.length });
  }

  if (document.readyState === 'loading') {
    NATIVE_ADD.call(window, 'DOMContentLoaded', safe('boot', boot));
  } else {
    safe('boot', boot)();
  }

  /* Published so a later module can add its own command without reaching
     into this file, and so the verification harness can drive the palette
     without synthesising keystrokes. */
  if (ANG && ANG.provide) {
    ANG.provide('palette', {
      open: () => CK.show(),
      close: () => CK.close(),
      shortcuts: () => KS.show(),
      isOpen: () => CK.open,
      search: q => { CK.build(); CK.items = catalogue(); CK.filter(q); return CK.shown.map(r => r.i.id); },
      items: () => catalogue().map(i => ({ id: i.id, title: i.title, section: i.section })),
      isTyping
    });
  }
})();
