/* Operator-owned Force Protection Condition display state.
   This is intentionally separate from APP: changing it must never alter or
   restart the mission simulation. */
(function () {
  'use strict';

  const STORAGE_KEY = 'angel.fpcon';
  const DEFAULT = 'BRAVO';
  const CONDITIONS = Object.freeze([
    Object.freeze({ key: 'NORMAL', label: 'Normal', tone: 'normal',
      bg: 'oklch(0.25 0.055 145)', line: 'oklch(0.48 0.13 145)',
      text: 'oklch(0.9 0.12 145)', mark: 'oklch(0.75 0.19 145)' }),
    Object.freeze({ key: 'ALPHA', label: 'Alpha', tone: 'alpha',
      bg: 'oklch(0.25 0.055 245)', line: 'oklch(0.48 0.13 245)',
      text: 'oklch(0.9 0.1 245)', mark: 'oklch(0.75 0.17 245)' }),
    Object.freeze({ key: 'BRAVO', label: 'Bravo', tone: 'bravo',
      bg: 'oklch(0.26 0.055 90)', line: 'oklch(0.52 0.13 90)',
      text: 'oklch(0.93 0.12 90)', mark: 'oklch(0.82 0.17 90)' }),
    Object.freeze({ key: 'CHARLIE', label: 'Charlie', tone: 'charlie',
      bg: 'oklch(0.26 0.065 55)', line: 'oklch(0.52 0.15 55)',
      text: 'oklch(0.92 0.11 55)', mark: 'oklch(0.76 0.18 55)' }),
    Object.freeze({ key: 'DELTA', label: 'Delta', tone: 'delta',
      bg: 'oklch(0.25 0.065 25)', line: 'oklch(0.5 0.16 25)',
      text: 'oklch(0.92 0.1 25)', mark: 'oklch(0.7 0.2 25)' })
  ]);
  const byKey = Object.freeze(CONDITIONS.reduce((all, condition) => {
    all[condition.key] = condition;
    return all;
  }, {}));

  function valid(value) {
    return typeof value === 'string' && Object.prototype.hasOwnProperty.call(byKey, value);
  }

  function read() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return valid(saved) ? saved : DEFAULT;
    } catch (e) {
      return DEFAULT;
    }
  }

  let selected = read();

  function set(value) {
    selected = valid(value) ? value : DEFAULT;
    try { localStorage.setItem(STORAGE_KEY, selected); } catch (e) { /* storage unavailable */ }
    window.dispatchEvent(new CustomEvent('angel:fpcon-change', {
      detail: { condition: byKey[selected] }
    }));
    return selected;
  }

  window.FPCON = Object.freeze({
    STORAGE_KEY,
    DEFAULT,
    CONDITIONS,
    get: () => selected,
    current: () => byKey[selected],
    set,
    valid
  });
})();
