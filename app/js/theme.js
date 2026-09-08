/* =========================================================================
   ANGEL SWARM — THEME SERVICE

   One attribute write is the whole mechanism: `body[data-theme="KEY"]`.
   css/theme.css declares every token four times, once per theme, so nothing
   in this file knows a colour. It knows four keys, a storage slot, and who
   to tell.

     ANGEL.get('theme').list()      the four themes, in picker order
     ANGEL.get('theme').current()   the active key
     ANGEL.get('theme').set(key)    apply + persist + announce; returns the key
     ANGEL.get('theme').on(fn)      fn(key, prev) after every apply
     ANGEL.get('theme').off(fn)
     ANGEL.get('theme').cycle(n)    next theme round, for a keyboard binding

   Persisted at localStorage['angel.theme']. Default `console-dark`.

   FLASH. A theme applied by this file would be applied one script-load too
   late — the page would paint console-dark and then jump. So the attribute is
   written by four lines inlined at the top of <body> in index.template.html,
   before the first style is resolved, and this file's job on boot is only to
   agree with what is already on the element. If that inline block is ever
   removed, the application still works and flashes; the block is the fix, not
   the mechanism.

   REDRAW. Canvas and WebGL renderers cannot inherit a custom property. They
   read tokens at draw time and redraw on `ANGEL.emit('theme', key)`, which
   this file fires on every apply — including a set to the theme already
   active, so a listener that resyncs unconditionally is correct.

   MIGRATION. The application used to carry a two-state light/dark toggle
   (`APP.theme`, `#themeToggle`, `body.light`). It is retired. A stored
   preference from that era is translated once, on first boot after the
   upgrade, and the old key is removed so the translation cannot run twice.
   ========================================================================= */
(function () {
  'use strict';

  var ANGEL = window.ANGEL = window.ANGEL || {};
  var STORE = 'angel.theme';
  var LEGACY = 'angel.theme.mode';      /* the retired dark/light switch */
  var DEFAULT = 'console-dark';

  /* The list is here and nowhere else. The picker, the command palette and
     the shortcut sheet all read it, so a fifth theme is one entry plus one
     block in css/theme.css and no other edit anywhere. */
  var THEMES = [
    { key: 'console-dark',  label: 'Console dark',
      blurb: 'The approved console. Near-monochrome chrome, colour only where it means something.' },
    { key: 'night-ops',     label: 'Night ops',
      blurb: 'Deeper and colder for a darkened room. Nothing on the chrome competes with the map.' },
    { key: 'field-slate',   label: 'Field slate',
      blurb: 'Warmer, greyer, wider tone steps. For a bright tent or a daylit vehicle.' },
    { key: 'high-contrast', label: 'High contrast',
      blurb: 'Maximum separation. Every coloured run measured at 7:1 or better.' }
  ];
  var KEYS = THEMES.map(function (t) { return t.key; });

  var listeners = [];
  var applied = null;

  function valid(k) { return KEYS.indexOf(k) >= 0 ? k : null; }

  function read() {
    var v = null;
    try { v = localStorage.getItem(STORE); } catch (e) { /* storage denied */ }
    if (valid(v)) return v;

    /* The one-time translation from the retired switch. "light" had no
       counterpart worth keeping — the contract ships four dark consoles and
       an accessibility theme, and high-contrast is the honest destination for
       an operator who chose the brighter of two options. */
    var old = null;
    try { old = localStorage.getItem(LEGACY); } catch (e) { /* denied */ }
    if (old === 'light' || old === 'dark') {
      var moved = old === 'light' ? 'high-contrast' : DEFAULT;
      try { localStorage.setItem(STORE, moved); localStorage.removeItem(LEGACY); } catch (e) { /* denied */ }
      return moved;
    }
    return DEFAULT;
  }

  function apply(k, announce) {
    var key = valid(k) || DEFAULT;
    var prev = applied;
    var b = document.body;
    if (b) b.setAttribute('data-theme', key);
    /* Mirrored onto <html> so a stylesheet that has to win against a
       body-level rule has somewhere to stand, and so the attribute is
       readable before <body> exists. */
    document.documentElement.setAttribute('data-theme', key);
    applied = key;

    if (announce !== false) {
      try { localStorage.setItem(STORE, key); } catch (e) { /* storage denied; the session still works */ }
      try { ANGEL.emit('theme', key); } catch (e) { /* the bus is not load-bearing here */ }
      for (var i = 0; i < listeners.length; i++) {
        try { listeners[i](key, prev); }
        catch (e) { if (ANGEL.mark) ANGEL.mark('theme-listener-threw', String(e)); }
      }
    }
    return key;
  }

  var api = {
    list: function () { return THEMES.map(function (t) { return { key: t.key, label: t.label, blurb: t.blurb }; }); },
    keys: function () { return KEYS.slice(); },
    label: function (k) { var t = THEMES.filter(function (x) { return x.key === k; })[0]; return t ? t.label : k; },
    current: function () { return applied || valid(document.documentElement.getAttribute('data-theme')) || DEFAULT; },
    set: function (k) { return apply(k, true); },
    cycle: function (step) {
      var i = KEYS.indexOf(api.current());
      var n = (i + (step || 1) + KEYS.length * 2) % KEYS.length;
      return apply(KEYS[n], true);
    },
    on: function (fn) { if (typeof fn === 'function') listeners.push(fn); return fn; },
    off: function (fn) { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
    /* Read a token off the live body. The one supported way for a canvas or
       a shader to learn a colour — see THEME_CONTRACT.md. */
    token: function (name) {
      var n = name.charAt(0) === '-' ? name : '--' + name;
      return getComputedStyle(document.body).getPropertyValue(n).trim();
    }
  };

  /* Agree with whatever the inline block in <body> already wrote, without
     re-announcing it: nobody has subscribed yet, and persisting a value we
     just read from storage is noise. If the inline block did not run — a
     stripped template, a hostile cache — this is also what applies it. */
  function boot() { apply(document.body && document.body.getAttribute('data-theme') || read(), false); }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });

  ANGEL.theme = api;
  ANGEL.provide('theme', api);
  if (ANGEL.mark) ANGEL.mark('theme', api.current());
})();
