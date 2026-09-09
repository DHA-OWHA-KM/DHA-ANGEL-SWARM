(function () {
  'use strict';

  window.DPAGES = window.DPAGES || {};
  window.DPAGES.track = function () {
    if (window.DSHELL) window.DSHELL.searchContext(null);
    return '<angel-resupply-track></angel-resupply-track>';
  };
})();