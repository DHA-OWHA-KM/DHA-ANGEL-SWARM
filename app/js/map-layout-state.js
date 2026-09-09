/* The map-layout chips emphasize comparison as an enabled mode, not the
   currently selected value: Single is the neutral, dark state. */
(function (root) {
  function syncMapLayoutHighlights(container, mapView) {
    const scope = container || document;
    const comparing = mapView === 'COMPARE';
    scope.querySelectorAll('[data-mapview]').forEach(el => {
      const highlighted = comparing && el.dataset.mapview === 'COMPARE';
      el.classList.toggle('on', highlighted);
      el.setAttribute('aria-pressed', highlighted ? 'true' : 'false');
    });
    return comparing;
  }

  root.syncMapLayoutHighlights = syncMapLayoutHighlights;
})(window);