/* Contextual screen search primitives shared by the shell and browser tests. */
(function (root) {
  'use strict';

  function normalize(value) {
    return String(value == null ? '' : value)
      .toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  }

  function matches(query) {
    const q = normalize(query);
    if (!q) return true;
    return Array.prototype.slice.call(arguments, 1)
      .some(value => normalize(value).indexOf(q) >= 0);
  }

  function missionActive(app) {
    return !!(app && app.world && !app.finished && (app.running || app.t > 0));
  }

  function wallRemaining(app) {
    if (!app || !app.world || !app.world.scn) return 0;
    const now = app.tView == null ? app.t : app.tView;
    /* APP.speed is simulation minutes per wall second (see app.js loop),
       so dividing remaining simulation minutes by speed already yields
       wall-clock seconds. */
    return Math.max(0, (app.world.scn.durationMin - now) /
      Math.max(0.001, app.speed || 1));
  }

  function countdown(seconds) {
    const total = Math.max(0, Math.ceil(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' +
      String(s).padStart(2, '0');
  }

  function navigate(state, page) {
    if (state.page !== page) {
      state.page = page;
      state.query = '';
      state.blockedAttempt = false;
    }
    return state;
  }

  function input(state, value, app) {
    if (missionActive(app)) {
      state.query = '';
      state.blockedAttempt = true;
      return false;
    }
    state.query = String(value == null ? '' : value);
    state.blockedAttempt = false;
    return true;
  }

  root.ContextSearch = {
    normalize, matches, missionActive, wallRemaining, countdown, navigate, input
  };
})(window);