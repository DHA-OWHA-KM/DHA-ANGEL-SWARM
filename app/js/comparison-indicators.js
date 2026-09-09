/* Three deliberately temporary comparison-pane identity treatments. The
   selection is presentation-only: it never reads or writes APP map state. */
(function () {
  'use strict';

  const labels = {
    tactical: 'COMPACT TACTICAL LABEL',
    edge: 'MAP-EDGE TAB',
    inline: 'MINIMAL INLINE IDENTIFIER'
  };

  function sync(root, control, kind) {
    if (!root || !control || !labels[kind]) return false;
    root.dataset.cmpIndicator = kind;
    control.querySelectorAll('[data-cmp-indicator]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.cmpIndicator === kind));
    });
    const output = control.querySelector('output');
    if (output) output.textContent = labels[kind];
    return true;
  }
  window.syncComparisonIndicatorPreview = sync;

  const root = document.documentElement;
  function syncAll(kind) {
    if (!labels[kind]) return false;
    root.dataset.cmpIndicator = kind;
    document.querySelectorAll('.cmpIndicatorPreview').forEach(control => {
      sync(root, control, kind);
    });
    return true;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-cmp-indicator]');
    if (button) syncAll(button.dataset.cmpIndicator);
  });

  syncAll(root.dataset.cmpIndicator || 'tactical');
}());