/* ============================================================================
   ANGEL SWARM — MAP RENDERER
   Draws the common operating picture: shaded-relief basemap, graticule,
   threat envelopes, casualty symbology, launch points and aircraft.
   State comes from the APP object defined in app.js (aliased as UI).

   COLOUR. Nothing in this file carries a hex literal for a semantic quantity.
   Every colour is a CSS custom property declared four times in css/theme.css,
   read off the live <body> through MAPTHEME below, and re-read when
   ANGEL.emit('theme', key) fires. See THEME_CONTRACT.md.

   The visual target is the approved console (mock-I1): a large translucent
   blue area-of-operations field laid over visible terrain, the terrain and
   its hairline detail reading THROUGH the wash rather than being covered by
   it; the flown track in red; aircraft in yellow; launch points, reach rings
   and planned routes in cyan; the proposed forward launch point in amber;
   and a cartographic halo behind every label so its contrast is a property
   of the code rather than of whatever happens to be under it.
   ========================================================================== */

/* ------------------------------------------------------------- MAPTHEME --
   The one supported way for a canvas or a shader in this application to
   learn a colour.

   getComputedStyle is a style-recalculation barrier. Calling it per polygon
   — three hundred times a frame on a busy sector — costs more than every
   path this file draws put together. So the whole token set is read in ONE
   call and held until something can actually have changed it, which is
   exactly two events: a theme change, and a mutation of the data-theme
   attribute by anything that bypasses the theme service. Both invalidate.
   Between them the cache is served without touching the style system at all,
   which is strictly better than the per-frame caching the contract asks for.

   Every renderer in this application reads through this object:
   map.js and theater.js directly, geo3d.js and theater3d.js — which are ES
   modules and load later — through `window.MAPTHEME`, each with a local
   fallback so a missing service degrades to console-dark rather than
   throwing into a GPU frame. */
const MAPTHEME = (function () {
  'use strict';

  /* The contract's complete token set. Read in one pass; anything absent falls back to the console-dark value,
     so a stripped or half-loaded stylesheet renders the approved map rather
     than a black one. */
  const NAMES = [
    'k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'line', 'line2',
    't-hi', 't-mid', 't-lo', 't-dim',
    'red', 'red-d', 'amb', 'amb-d', 'org', 'grn', 'grn-d', 'yel',
    'cyan', 'cyan-d', 'blue', 'blue-d', 'slate', 'grey',
    'm-sea', 'm-land', 'm-ao', 'm-track', 'm-grid', 'm-halo'
  ];
  const FALLBACK = {
    k0: '#070A0D', k1: '#0B0F14', k2: '#0E141A', k3: '#121821', k4: '#19212B',
    k5: '#22303C', k6: '#2C3B48', line: '#1E2833', line2: '#2A3743',
    't-hi': '#E9EFF4', 't-mid': '#AFBECB', 't-lo': '#8D9CAA', 't-dim': '#7A8894',
    red: '#FF6B60', 'red-d': '#8E2A22', amb: '#FFB53D', 'amb-d': '#7A5410',
    org: '#FF8B4A', grn: '#4ED39B', 'grn-d': '#1E6B3E', yel: '#EFD64A',
    cyan: '#6FD3F2', 'cyan-d': '#17495E', blue: '#8FB4FF', 'blue-d': '#2C4F91',
    slate: '#AFBECB', grey: '#9AA8B4',
    'm-sea': '#0C1822', 'm-land': '#3B4C2A', 'm-ao': '#8FB4FF',
    'm-track': '#6FD3F2', 'm-grid': '#20394B', 'm-halo': '#03080D'
  };

  function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : Math.round(v); }

  /* Accepts the three forms a custom property can legally hold here:
     #rgb, #rrggbb, and rgb()/rgba(). Anything else returns null and the
     caller falls back, because a token that cannot be parsed is a bug in the
     stylesheet, not a reason to stop drawing a map. */
  function parse(str) {
    if (!str) return null;
    const s = String(str).trim();
    if (s.charAt(0) === '#') {
      if (s.length === 4) {
        return [parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16), parseInt(s[3] + s[3], 16)];
      }
      if (s.length >= 7) {
        return [parseInt(s.substr(1, 2), 16), parseInt(s.substr(3, 2), 16), parseInt(s.substr(5, 2), 16)];
      }
      return null;
    }
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[,/\s]+/).filter(Boolean).map(Number);
      if (p.length >= 3 && p.every(n => isFinite(n))) return [p[0], p[1], p[2]];
    }
    return null;
  }

  let cache = null;
  let generation = 0;
  const subs = [];

  function build() {
    let cs = null;
    try { cs = document.body ? getComputedStyle(document.body) : null; }
    catch (e) { cs = null; }                       /* detached document */
    const hex = {}, rgb = {};
    for (let i = 0; i < NAMES.length; i++) {
      const n = NAMES[i];
      let v = '';
      if (cs) { try { v = cs.getPropertyValue('--' + n).trim(); } catch (e) { v = ''; } }
      let p = parse(v);
      if (!p) { v = FALLBACK[n]; p = parse(v); }
      hex[n] = v;
      rgb[n] = p;
    }
    return {
      key: (document.body && document.body.getAttribute('data-theme')) || 'console-dark',
      gen: generation, hex, rgb
    };
  }

  const api = {
    /* The token set for this frame. One style read per theme, not per shape. */
    now: function () { return cache || (cache = build()); },
    /* Monotonic; every cached bitmap in this application is keyed on it. */
    gen: function () { return generation; },
    key: function () { return api.now().key; },

    /* '#rrggbb' — for strokeStyle/fillStyle where no alpha is wanted. */
    hex: function (name) { const c = api.now().hex[name]; return c || FALLBACK[name] || '#000'; },
    /* [r,g,b] — for deck.gl and for arithmetic. */
    rgb: function (name) { const c = api.now().rgb[name]; return c ? c.slice() : [0, 0, 0]; },
    /* 'rgba(r,g,b,a)' — the workhorse. */
    rgba: function (name, a) {
      const c = api.now().rgb[name] || [0, 0, 0];
      return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a === undefined ? 1 : a) + ')';
    },
    /* [r,g,b,a0-255] — deck.gl's colour form. */
    arr: function (name, a) {
      const c = api.now().rgb[name] || [0, 0, 0];
      return [c[0], c[1], c[2], a === undefined ? 255 : Math.round(a)];
    },
    /* Linear mix of two tokens, 0 = a, 1 = b. Used wherever a value has to
       sit BETWEEN two semantic colours — a dim companion that has no token
       of its own, a hillshade ramp end. */
    mix: function (a, b, u, alpha) {
      const A = api.now().rgb[a] || [0, 0, 0], B = api.now().rgb[b] || [0, 0, 0];
      const c = [clamp255(A[0] + (B[0] - A[0]) * u), clamp255(A[1] + (B[1] - A[1]) * u),
                 clamp255(A[2] + (B[2] - A[2]) * u)];
      return alpha === undefined
        ? '#' + c.map(v => v.toString(16).padStart(2, '0')).join('')
        : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')';
    },
    mixRGB: function (a, b, u) {
      const A = api.now().rgb[a] || [0, 0, 0], B = api.now().rgb[b] || [0, 0, 0];
      return [clamp255(A[0] + (B[0] - A[0]) * u), clamp255(A[1] + (B[1] - A[1]) * u),
              clamp255(A[2] + (B[2] - A[2]) * u)];
    },
    /* Scale a token toward black/white by a hillshade factor. */
    shade: function (name, f) {
      const c = api.now().rgb[name] || [0, 0, 0];
      return [clamp255(c[0] * f), clamp255(c[1] * f), clamp255(c[2] * f)];
    },

    /* Everything that has cached a colour is told here, once, in order. */
    invalidate: function () {
      cache = null;
      generation++;
      for (let i = 0; i < subs.length; i++) {
        try { subs[i](api.key(), generation); }
        catch (e) { /* one renderer's rebuild must not stop the next one's */ }
      }
    },
    on: function (fn) { if (typeof fn === 'function') subs.push(fn); return fn; }
  };

  /* The two things that can change a token under us. */
  try {
    if (window.ANGEL && ANGEL.on) ANGEL.on('theme', function () { api.invalidate(); });
  } catch (e) { /* the bus is not load-bearing here */ }
  try {
    const mo = new MutationObserver(function () { api.invalidate(); });
    const watch = function () {
      if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    };
    if (document.body) watch();
    else document.addEventListener('DOMContentLoaded', watch, { once: true });
  } catch (e) { /* no MutationObserver: the bus event above still covers it */ }

  return api;
})();
try { window.MAPTHEME = MAPTHEME; } catch (e) { /* not a browser */ }

/* Arm accents. These are read by app.js when it calls drawMap, so they are
   live getters rather than values: a theme change re-reads them on the very
   next frame with nothing else having to know. */
const COL = {
  get text()    { return MAPTHEME.hex('t-hi'); },
  get dim()     { return MAPTHEME.hex('t-mid'); },
  get faint()   { return MAPTHEME.hex('t-lo'); },
  get angel()   { return MAPTHEME.hex('cyan'); },   /* the ANGEL SWARM arm */
  get current() { return MAPTHEME.hex('slate'); },  /* the doctrinal baseline */
  get stable()  { return MAPTHEME.hex('blue'); },   /* reserve holding */
  get falling() { return MAPTHEME.hex('amb'); },    /* reserve falling */
  get critical(){ return MAPTHEME.hex('red'); }     /* reserve nearly gone */
};

const CALLSIGN = { HEAVY: 'TRV', LIGHT: 'M25', LONG: 'FVR' };
const PAYSHORT = { BLOOD: 'BLOOD', PLASMA: 'PLASMA', TXA: 'TXA', TQ_KIT: 'HEM KIT', CHEST_SEAL: 'SEAL' };

/* -------------------------------------------------------------- CANVAS -- */
function fitCanvas(cv) {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) {
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}
/* Fit the AOR to the viewport, cropping rather than letterboxing so the map
   fills the frame the way a real COP does. */
function projector(scn, w, h, pad) {
  pad = pad === undefined ? 0 : pad;
  const s = Math.max((w - pad * 2) / scn.widthKm, (h - pad * 2) / scn.heightKm);
  const ox = (w - scn.widthKm * s) / 2, oy = (h - scn.heightKm * s) / 2;
  return { s, X: x => ox + x * s, Y: y => oy + y * s,
           inv: (px, py) => ({ x: (px - ox) / s, y: (py - oy) / s }) };
}
function projectorFit(scn, w, h, pad) {
  pad = pad === undefined ? 14 : pad;
  const s = Math.min((w - pad * 2) / scn.widthKm, (h - pad * 2) / scn.heightKm);
  const ox = (w - scn.widthKm * s) / 2, oy = (h - scn.heightKm * s) / 2;
  return { s, s0: s, X: x => ox + x * s, Y: y => oy + y * s,
           inv: (px, py) => ({ x: (px - ox) / s, y: (py - oy) / s }) };
}
/* Clearance for the DOM furniture that floats over the top of every map: the
   mission comparison strip (top:10, ~46 tall) and the pane tags (top:9, ~38).
   Anything the canvas draws above this line renders behind them. */
const COMMS_BANNER_Y = 66;
/* WHERE THE CLEAR BAND ACTUALLY STARTS. 66 clears this console's own pane
   labels when it runs standing alone. When it is docked under a host that
   floats its own chrome over the picture, that host publishes how far down
   its chrome reaches and this moves below it. Nothing published, nothing
   added — the standalone case is untouched. */
function commsBannerY() {
  var o = 0;
  try { o = window.COMMS_BANNER_OFFSET || 0; } catch (e) { o = 0; }
  return COMMS_BANNER_Y + o;
}

/* HOW FAR THE PAGE AROUND THIS MAP REACHES IN OVER IT, on all four sides.

   Standing alone, the only things over this canvas are the console's own dock
   and legend, and the numbers below already account for both. Docked into the
   design the map IS the page, with a column of floating panels down each side
   of it, and every piece of chrome this file paints — the scale bar, the north
   arrow, the area-of-operations block, the degraded-comms banner, every chip
   the label pass lays down — was being placed inside the canvas rectangle when
   the rectangle an operator can see is the one between those columns.

   The host measures its own panels and publishes how far in they reach. The
   same mechanism as COMMS_BANNER_OFFSET above and MAP_BAR_INSET_* on the GPU
   map, extended to the rest of it. Nothing published, nothing subtracted, and
   the console standing on its own draws exactly what it drew before. */
function mapInsets() {
  var l = 0, r = 0, t = 0, b = 0;
  try {
    l = window.MAP_INSET_L || 0; r = window.MAP_INSET_R || 0;
    t = window.MAP_INSET_T || 0; b = window.MAP_INSET_B || 0;
  } catch (e) { l = r = t = b = 0; }
  return { l: l, r: r, t: t, b: b };
}

/* The host's columns, declared taken before a single label is placed. The map
   itself still runs edge to edge underneath them — that is what a floating
   panel over a map should look like — but nothing that has to be READ is laid
   down where it cannot be. */
/* WHAT THIS FILE PAINTED AS CHROME, AND WHERE. Four rectangles a frame, in
   canvas pixels, so that a verification pass can assert that none of them
   landed under the page's own floating panels instead of having to infer it
   from a screenshot. Nothing reads this at run time. */
function noteChrome(x, y, w, h, what) {
  try {
    var a = window.__MAP_CHROME || (window.__MAP_CHROME = []);
    a.push({ x: x, y: y, w: w, h: h, what: what });
    if (a.length > 40) a.splice(0, a.length - 40);
  } catch (e) { /* never break a draw over a diagnostic */ }
}

function claimHostChrome(w, h) {
  /* `host` marks these as ground the page has taken rather than as something
     this map drew: they are what the placement pass avoids, not a label. */
  var i = mapInsets();
  if (i.l > 0) LBOX.push({ x: -40, y: -40, w: i.l + 40, h: h + 80, host: 1 });
  if (i.r > 0) LBOX.push({ x: w - i.r, y: -40, w: i.r + 40, h: h + 80, host: 1 });
  if (i.t > 0) LBOX.push({ x: -40, y: -40, w: w + 80, h: i.t + 40, host: 1 });
  if (i.b > 0) LBOX.push({ x: -40, y: h - i.b, w: w + 80, h: i.b + 40, host: 1 });
}

/* Contain-fit at zoom 1, then scale about a centre point in kilometres.
   Both panes share one view object so a side-by-side comparison stays
   registered — pan or zoom one and the other follows. */
function projectorView(scn, w, h, pad, view) {
  const s0 = Math.min((w - pad * 2) / scn.widthKm, (h - pad * 2) / scn.heightKm);
  if (!view) return projectorFit(scn, w, h, pad);
  const s = s0 * view.zoom;
  const ox = w / 2 - view.cx * s, oy = h / 2 - view.cy * s;
  return { s, s0, X: x => ox + x * s, Y: y => oy + y * s,
           inv: (px, py) => ({ x: (px - ox) / s, y: (py - oy) / s }) };
}
/* Keep the area of operations from being panned off the screen entirely. */
function clampView(scn, view) {
  /* 1.0 is contain-fit. A real map lets you pull back past the edge of the
     sheet, which is what gives symbols room to separate and lets the eye see
     the whole area of operations with margin around it. */
  view.zoom = Math.max(0.45, Math.min(12, view.zoom));
  const marginKm = (scn.widthKm + scn.heightKm) * 0.12 / view.zoom;
  view.cx = Math.max(-marginKm, Math.min(scn.widthKm + marginKm, view.cx));
  view.cy = Math.max(-marginKm, Math.min(scn.heightKm + marginKm, view.cy));
  return view;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
/* ------------------------------------------------------- LABEL SPACE --
   One rectangle list per frame, and every label that lands on the map claims
   its space in it. The 3D map has had a placement pass since it was written
   — candidates projected to the screen, sorted by operational value, laid
   into the first free slot on a ladder — and the 2D map has not, which is
   why a launch point's "3 A/C · 21 SORTIES" could print straight through a
   casualty's countdown. This is the same idea at a tenth of the cost: a chip
   that is already positioned simply records where it went, and the labels
   that CAN move are given a short ladder and dropped if none of the rungs is
   free. An unreadable label is worse than no label. */
let LBOX = [];
function boxFree(x, y, w, h) {
  for (let i = 0; i < LBOX.length; i++) {
    const t = LBOX[i];
    if (!(x > t.x + t.w || x + w < t.x || y > t.y + t.h || y + h < t.y)) return false;
  }
  return true;
}
function claim(x, y, w, h) {
  if (!boxFree(x, y, w, h)) return false;
  LBOX.push({ x, y, w, h });
  return true;
}

/* Is this rectangle ground the page around the map has taken? Only the bands
   claimHostChrome laid down are consulted — not the labels already placed —
   so a chip that used to be drawn on top of another one still is, and the only
   behaviour that changes is the one that was wrong: a chip printed underneath
   an opaque panel, where nobody will ever read it. Nothing published, no
   bands, and this always answers false. */
function underHostChrome(x, y, w, h) {
  for (let i = 0; i < LBOX.length; i++) {
    const t = LBOX[i];
    if (!t.host) continue;
    if (!(x > t.x + t.w || x + w < t.x || y > t.y + t.h || y + h < t.y)) return true;
  }
  return false;
}

function chipAt(ctx, x, y, text, fg, bg, size, align) {
  size = size || 10;
  ctx.font = 'bold ' + size + 'px ui-monospace,SFMono-Regular,Menlo,monospace';
  const pw = ctx.measureText(text).width + 9, ph = size + 7;
  const x0 = align === 'right' ? x - pw : x;
  if (underHostChrome(x0, y - ph / 2, pw, ph)) return pw;
  ctx.fillStyle = bg || MAPTHEME.hex('m-halo');
  rr(ctx, x0, y - ph / 2, pw, ph, 3); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x0 + 4.5, y + 0.5);
  ctx.textBaseline = 'alphabetic';
  LBOX.push({ x: x0, y: y - ph / 2, w: pw, h: ph });
  return pw;
}

/* ------------------------------------------------------------- THE HALO --
   Every label this file paints on the map goes through here.

   A map label sits on whatever the map happens to be under it — a bright
   hillshade, the blue area-of-operations wash, black water, a red threat
   envelope — so its contrast against its background is, without help, a
   matter of luck. A cartographic halo removes the luck: the glyph is struck
   first in --m-halo at a width wide enough to close around the stems, then
   filled. What the eye then measures the type against is the halo, which is
   one known colour per theme, so the ratio is a property of two tokens and
   can be computed rather than sampled.

   `lineJoin`/`miterLimit` matter more than they look: the default miter on
   a monospace 'W' at 9px spikes several pixels past the glyph and the halo
   reads as a burr. Round joins keep it a cushion. */
function haloText(ctx, txt, x, y, col, hw) {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.miterLimit = 2;
  ctx.lineWidth = hw === undefined ? 3.2 : hw;
  /* Opaque, deliberately. At 0.92 the halo let eight per cent of whatever
     was underneath through, and eight per cent of a sunlit hillshade is
     enough to move a measured ratio by a tenth — which means the number
     stops being a property of two tokens and goes back to being luck. The
     whole point of this function is that the contrast of every label on
     every map in this application can be COMPUTED. */
  ctx.strokeStyle = MAPTHEME.hex('m-halo');
  ctx.strokeText(txt, x, y);
  ctx.fillStyle = col;
  ctx.fillText(txt, x, y);
  ctx.restore();
}
/* Two stacked lines pinned to a mark: the mock's "Kilo Beach / 3 dead ·
   2 survivable". Returns the height it used. */
function haloLines(ctx, x, y, lines, size, align) {
  ctx.save();
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  let yy = y;
  for (const [txt, col, bold] of lines) {
    ctx.font = (bold ? 'bold ' : '') + size + 'px ui-monospace,monospace';
    haloText(ctx, txt, x, yy, col, 3.2);
    yy += size + 2.5;
  }
  ctx.restore();
  return yy - y;
}

/* ------------------------------------------------------ THE RELIEF SHEET --
   basemap.js bakes the scenario's elevation field into one shaded-relief
   bitmap: hypsometric tint, hillshade, contours, isobaths, coastline and
   surf. It is a picture, not a set of shapes, so a theme change cannot
   restyle it — it has to be regenerated.

   Regenerating it from the elevation field would cost the same three hundred
   milliseconds basemap.js spends, on a UI thread, every time an operator
   tries a theme. So it is re-tinted instead, which is exact enough to be
   indistinguishable and two orders of magnitude cheaper: the sheet's own
   pixels already carry the hillshade, the contour darkening and the isobaths
   as VARIATIONS IN LUMINANCE about a base colour, and all a theme changes is
   what that base colour is. One pass classifies each pixel as land, water or
   shoreline by which channel dominates — the source ramp is green-brown over
   land and blue over water, and nothing in between — and looks its new value
   up in a 256-entry ramp built from the theme's --m-land, --m-sea and the
   shoreline mix. Detail survives because luminance survives.

   Cached on the source canvas AND on MAPTHEME's generation, so it is built
   once per scenario per theme and never again. */
let RELIEF = { src: null, gen: -1, sheet: null, ms: 0 };

/* Build a 256-entry lookup keyed on the SOURCE pixel's luminance, from a
   list of [stopColour] anchors spread evenly across the range the source
   sheet actually uses. Stretching against the measured range rather than
   against [0,255] is the whole difference between a re-tint that keeps the
   hillshade and one that flattens it: basemap.js's land occupies roughly a
   third of the luminance axis and its water rather less, so a ramp laid out
   over the full axis would compress every landform into three or four
   distinguishable tones. */
function reliefRamp(stops, lo, hi) {
  const ramp = new Uint8Array(768);
  const span = Math.max(8, hi - lo);
  const n = stops.length - 1;
  for (let i = 0; i < 256; i++) {
    let u = (i - lo) / span;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    const f = u * n, k = Math.min(n - 1, Math.floor(f)), q = f - k;
    const a = stops[k], b = stops[k + 1];
    ramp[i * 3] = a[0] + (b[0] - a[0]) * q;
    ramp[i * 3 + 1] = a[1] + (b[1] - a[1]) * q;
    ramp[i * 3 + 2] = a[2] + (b[2] - a[2]) * q;
  }
  return ramp;
}

function reliefSheet(bm) {
  if (!bm || !bm.canvas) return null;
  if (RELIEF.src === bm.canvas && RELIEF.gen === MAPTHEME.gen()) return RELIEF.sheet;
  const t0 = performance.now();
  const w = bm.canvas.width, h = bm.canvas.height;
  let out;
  try {
    const src = bm.canvas.getContext('2d').getImageData(0, 0, w, h);
    out = document.createElement('canvas');
    out.width = w; out.height = h;
    const octx = out.getContext('2d');
    const img = octx.createImageData(w, h);
    const S = src.data, D = img.data;

    /* --- 1. what luminance range does this sheet actually use? ---------
       Two histograms, land and water, on a sixteenth of the pixels — which
       is a quarter of a million samples on a sheet this size and settles the
       percentiles to well inside a single ramp step. */
    const hLand = new Uint32Array(256), hSea = new Uint32Array(256);
    let nL = 0, nS = 0;
    for (let i = 0; i < S.length; i += 64) {
      const r = S[i], g = S[i + 1], b = S[i + 2];
      const lum = (r * 77 + g * 151 + b * 28) >> 8;
      if (b > g) { hSea[lum]++; nS++; } else { hLand[lum]++; nL++; }
    }
    const pct = (hist, n, p) => {
      let acc = 0, target = n * p;
      for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= target) return i; }
      return 255;
    };
    const lLo = nL ? pct(hLand, nL, 0.02) : 30, lHi = nL ? pct(hLand, nL, 0.985) : 170;
    const sLo = nS ? pct(hSea, nS, 0.02) : 20, sHi = nS ? pct(hSea, nS, 0.985) : 110;

    /* --- 2. the two hypsometric ramps, in tokens ------------------------
       Land runs shadowed valley floor -> the theme's own --m-land -> a warm
       mid-slope -> light rock, which is the cartographic convention and the
       reason a relief sheet reads as ground rather than as a green blob.
       Water runs abyssal -> --m-sea -> shelf. Every anchor is a mix of two
       tokens, so all four themes get a ramp and none of them gets a hex. */
    const rampL = reliefRamp([
      MAPTHEME.mixRGB('m-land', 'm-halo', 0.68),
      MAPTHEME.mixRGB('m-land', 'm-halo', 0.20),
      MAPTHEME.mixRGB('m-land', 'amb-d', 0.44),
      MAPTHEME.mixRGB('m-land', 't-dim', 0.62)
    ], lLo, lHi);
    const rampS = reliefRamp([
      MAPTHEME.mixRGB('m-sea', 'm-halo', 0.78),
      MAPTHEME.rgb('m-sea'),
      MAPTHEME.mixRGB('m-sea', 'm-grid', 0.95),
      MAPTHEME.mixRGB('m-grid', 'm-track', 0.35)
    ], sLo, sHi);
    const coast = MAPTHEME.mixRGB('m-sea', 't-hi', 0.58);

    /* --- 3. one pass, three table lookups ------------------------------ */
    for (let i = 0; i < S.length; i += 4) {
      const r = S[i], g = S[i + 1], b = S[i + 2];
      /* Shoreline and surf. basemap.js paints these near-white or heavily
         blue-lifted, and they are the one feature that must not be tinted
         into the water they separate — a coastline that vanishes takes the
         shape of the ground with it. */
      if (b > 150 && r > 120) {
        D[i] = coast[0]; D[i + 1] = coast[1]; D[i + 2] = coast[2]; D[i + 3] = 255; continue;
      }
      const lum = (r * 77 + g * 151 + b * 28) >> 8;
      const ramp = b > g ? rampS : rampL;
      const k = lum * 3;
      D[i] = ramp[k]; D[i + 1] = ramp[k + 1]; D[i + 2] = ramp[k + 2]; D[i + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
  } catch (e) {
    /* A tainted or zero-sized canvas. The untinted sheet is still a correct
       map; losing the tint is not worth losing the terrain. */
    out = bm.canvas;
  }
  RELIEF = { src: bm.canvas, gen: MAPTHEME.gen(), sheet: out, ms: performance.now() - t0 };
  try { if (window.ANGEL && ANGEL.mark) ANGEL.mark('map relief re-tint', { ms: Math.round(RELIEF.ms), px: w * h }); } catch (e) { }
  return RELIEF.sheet;
}

/* ----------------------------------------------------------- THE CALLOUT --
   The mock's pinned card: a plate offset from the object it describes, a
   hairline leader back to it, and a dot on the object itself so the eye can
   see which of six marks the card belongs to. Nothing here is clickable —
   the card is a caption, and the object underneath keeps its own hit area. */
function calloutAt(ctx, ax, ay, lines, tint, w, h, side) {
  const pad = 7, lh = 12.5, MAXW = 336;
  ctx.save();
  /* Measured at the font each line is actually drawn in, not at one font for
     all of them: the title is bold 10 and the body is 9.5, and measuring the
     body at the title's font under-reads it by enough that the last word
     printed outside the plate. If a line still will not fit it is truncated
     here rather than allowed to run off the card. */
  const fit = lines.map(([txt, col, bold], i) => {
    ctx.font = (bold ? 'bold ' : '') + (i ? 9.5 : 10) + 'px ui-monospace,monospace';
    let t = txt;
    if (ctx.measureText(t).width > MAXW - pad * 2) {
      while (t.length > 4 && ctx.measureText(t + '\u2026').width > MAXW - pad * 2) t = t.slice(0, -1);
      t += '\u2026';
    }
    return [t, col, bold, ctx.measureText(t).width];
  });
  let bw = 0;
  for (const f of fit) bw = Math.max(bw, f[3]);
  bw = Math.min(bw + pad * 2, MAXW);
  const bh = lines.length * lh + pad * 2 - 2;
  /* Put the card on whichever side of the object has room, and keep it on
     the canvas: a caption that runs off the edge is worse than none. */
  const right = side === undefined ? (ax < w * 0.6) : side;
  let bx = right ? ax + 26 : ax - 26 - bw;
  let by = ay - bh - 22;
  bx = Math.max(6, Math.min(w - bw - 6, bx));
  by = Math.max(commsBannerY() + 6, Math.min(h - bh - 34, by));

  /* leader: object -> elbow -> card edge */
  const tx = bx + (right ? 0 : bw), ty = by + bh - 6;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax + (right ? 12 : -12), ty);
  ctx.lineTo(tx, ty);
  ctx.strokeStyle = MAPTHEME.rgba('t-lo', 0.85); ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.arc(ax, ay, 2.6, 0, 7);
  ctx.fillStyle = tint; ctx.fill();

  rr(ctx, bx, by, bw, bh, 3);
  ctx.fillStyle = MAPTHEME.hex('m-halo'); ctx.fill();
  ctx.strokeStyle = tint; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  fit.forEach(([txt, col, bold], i) => {
    ctx.font = (bold ? 'bold ' : '') + (i ? 9.5 : 10) + 'px ui-monospace,monospace';
    ctx.fillStyle = col;
    ctx.fillText(txt, bx + pad, by + pad + 9 + i * lh);
  });
  ctx.restore();
}

/* ------------------------------------------- THE PROPOSED LAUNCH POINT --
   The one recommendation this map makes on its own. It is the same geometry
   the requirement analysis in app.js runs — the casualty cluster least well
   covered by the launch points that exist — drawn in amber because amber in
   this contract means a human has to decide. It is never drawn unless the
   coverage gap is real: if every casualty can be reached by two or more
   airframes there is nothing to propose and nothing is shown.

   Memoised on the scenario, because it is a scan over the clusters and it
   does not change while the operator is watching. */
let SPUR = { key: null, at: null };
function proposedLaunchPoint(scn, arm) {
  const key = scn.key + '|' + (arm.bases ? arm.bases.length : 0);
  if (SPUR.key === key) return SPUR.at;
  let at = null;
  const thin = arm.casualties
    ? arm.casualties.filter(c => c.reachN !== undefined && c.reachN <= 1).length : 0;
  if (thin > 0 && scn.clusters && scn.clusters.length) {
    let worst = null;
    for (const k of scn.clusters) {
      const cover = (scn.bases || []).filter(b => dist(b.x, b.y, k.x, k.y) + k.r <= 34).length;
      if (!worst || cover < worst.cover) worst = { k, cover };
    }
    if (worst && worst.cover < 1) at = { x: worst.k.x, y: worst.k.y, thin };
  }
  SPUR = { key, at };
  return at;
}

/* Smoothly interpolated aircraft position at view time tv. */
function dronePos(d, tv) {
  if (d.state === 'OUTBOUND' && d.tArrive != null) {
    const tot = d.tArrive - d.tDepart;
    const f = tot <= 0 ? 1 : Math.max(0, Math.min(1, (tv - d.tDepart) / tot));
    return { x: d.fromX + (d.destX - d.fromX) * f, y: d.fromY + (d.destY - d.fromY) * f,
             tx: d.destX, ty: d.destY };
  }
  if (d.state === 'RETURNING' && d.tHome != null) {
    const tot = d.tHome - d.tDepart;
    const f = tot <= 0 ? 1 : Math.max(0, Math.min(1, (tv - d.tDepart) / tot));
    return { x: d.fromX + (d.baseX - d.fromX) * f, y: d.fromY + (d.baseY - d.fromY) * f,
             tx: d.baseX, ty: d.baseY };
  }
  return { x: d.x, y: d.y, tx: d.baseX, ty: d.baseY };
}

/* ------------------------------------------------------------ DRAW MAP -- */
/* Which casualty categories are switched on. */
function casVisible(c, now) {
  if (c.hva && !L('hva')) return false;
  if (c.outcome === 'DIED')  return L('died');
  if (c.outcome === 'SAVED') return L('saved');
  const timed = c.deadlineMin < 9000;
  const crm = c.crmAt(now);
  if (timed && crm < PARAMS.CRM_RED)    return L('critical');
  if (timed && crm < PARAMS.CRM_YELLOW) return L('falling');
  return L('stable');
}
/* Layer visibility. The legend is the control surface for these. */
function L(key) { return !UI.layers || UI.layers[key] !== false; }

function drawMap(cv, arm, accent, paneKey, fitMode, mini) {
  const { ctx, w, h } = fitCanvas(cv);
  if (!(w > 8 && h > 8)) return;      // hidden or not yet laid out
  const scn = UI.world.scn;
  const P = mini ? projectorFit(scn, w, h, 4)
                : projectorView(scn, w, h, fitMode ? 10 : 26, UI.mapViewport);
  const now = UI.tView;
  cv._proj = P;
  /* Half-width panes and zoomed-out views cannot carry every label without
     chips printing on top of one another. Drop the secondary ones first. */
  const crowded = w < 900 && (UI.mapViewport ? UI.mapViewport.zoom < 1.6 : true);
  LBOX = [];
  if (!mini) { try { window.__MAP_CHROME = []; } catch (e) { /* contained */ } claimHostChrome(w, h); }

  ctx.fillStyle = MAPTHEME.hex('m-sea'); ctx.fillRect(0, 0, w, h);

  // ---- shaded-relief basemap, tinted into this theme ----
  const bm = UI.basemap;
  if (bm) {
    const sheet = reliefSheet(bm);
    if (sheet) {
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sheet, P.X(bm.x0), P.Y(bm.y0), bm.kmW * P.s, bm.kmH * P.s);
    }
  }
  /* ---- the area of operations ----------------------------------------
     The approved console makes the AO a large translucent BLUE FIELD laid
     over the terrain rather than a line around it, and that is the whole
     visual thesis of the reference console: the map carries the colour and
     the chrome stays near-monochrome. It is a wash and not a cover — the
     hillshade, the contours and the isobaths all read through it, which is
     what stops it from becoming a blue rectangle with a map somewhere
     underneath. Everything OUTSIDE it is pulled down toward the page
     colour, so the eye finds the boundary without a hard edge doing it. */
  const aox = P.X(0), aoy = P.Y(0), aow = scn.widthKm * P.s, aoh = scn.heightKm * P.s;
  ctx.save();
  ctx.fillStyle = MAPTHEME.rgba('m-halo', mini ? 0.66 : 0.44);
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.rect(aox, aoy, aow, aoh);
  ctx.fill('evenodd');
  ctx.fillStyle = MAPTHEME.rgba('blue-d', mini ? 0.20 : 0.30);
  ctx.fillRect(aox, aoy, aow, aoh);
  ctx.setLineDash([10, 6]);
  ctx.strokeStyle = MAPTHEME.rgba('m-ao', 0.5); ctx.lineWidth = 1.4;
  ctx.strokeRect(aox, aoy, aow, aoh);
  ctx.setLineDash([]);
  /* Named only when the edge it names is actually on the screen with room
     above it. Pinned to the top of the canvas instead — which is what it did
     — it printed straight through the graticule's own edge ticks, and a
     caption for a line that is off-screen is not a caption. */
  if (!mini && aoy > 26 && aoy < h - 20) {
    ctx.font = '9px ui-monospace,monospace';
    ctx.textAlign = 'left';
    ctx.letterSpacing = '2.2px';
    haloText(ctx, 'AO BOUNDARY \u00b7 CONTROLLED AIRSPACE 0\u20134 000 FT',
             Math.max(6, aox + 6), aoy - 7, MAPTHEME.hex('m-ao'), 3);
    ctx.letterSpacing = '0px';
  }
  ctx.restore();

  // ---- 10 km graticule with edge labels ----
  if (!mini && L('grid')) {
  ctx.save();
  ctx.strokeStyle = MAPTHEME.rgba('m-grid', 0.62); ctx.lineWidth = 1;
  ctx.font = '9px ui-monospace,monospace';
  const gridInk = MAPTHEME.hex('t-lo');
  for (let gx = 0; gx <= scn.widthKm; gx += 10) {
    const px = P.X(gx);
    if (px < -20 || px > w + 20) continue;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
    ctx.textAlign = 'center'; haloText(ctx, String(gx).padStart(2, '0'), px, 12, gridInk, 3);
  }
  for (let gy = 0; gy <= scn.heightKm; gy += 10) {
    const py = P.Y(gy);
    if (py < -20 || py > h + 20) continue;
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
    ctx.textAlign = 'left'; haloText(ctx, String(gy).padStart(2, '0'), 4, py - 3, gridInk, 3);
  }
  ctx.restore();
  }

  // ---- geography: water bodies, landmasses, named terrain ----
  if (!mini && L('geo')) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const pl of (scn.places || [])) {
      const px = P.X(pl.x), py = P.Y(pl.y);
      const sz = Math.max(8, Math.min(20, (pl.size || 11) * Math.sqrt(P.s / (P.s0 || P.s))));
      ctx.font = (pl.kind === 'land' ? 'bold ' : 'italic ') + sz + 'px ui-monospace,monospace';
      const spaced = pl.name.split('').join(pl.kind === 'sea' ? '\u2009' : '');
      /* Geography is context, so it is the quietest ink on the map — but it
         is still struck against the halo, because "quiet" has to mean a
         chosen tone and not an illegible one. */
      haloText(ctx, spaced, px, py,
               pl.kind === 'land' ? MAPTHEME.hex('t-mid') : MAPTHEME.hex('t-lo'), 3.4);
    }
    ctx.textBaseline = 'alphabetic';
    // named terrain features
    if (scn.islands) for (const is of scn.islands) {
      if (!is.name) continue;
      ctx.font = 'bold 10px ui-monospace,monospace';
      haloText(ctx, is.name, P.X(is.x), P.Y(is.y - is.r * 0.55), MAPTHEME.hex('t-hi'), 3.4);
    }
    ctx.restore();
  }

  // ---- boundary / forward line ----
  if (!mini && L('geo') && scn.boundary) {
    const B = scn.boundary;
    ctx.save();
    ctx.beginPath();
    B.pts.forEach((q, i) => { const qx = P.X(q[0]), qy = P.Y(q[1]); i ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy); });
    ctx.strokeStyle = MAPTHEME.rgba('red', 0.6); ctx.lineWidth = 2.2;
    ctx.setLineDash(B.ticks ? [] : [14, 6, 3, 6]);
    ctx.stroke(); ctx.setLineDash([]);
    if (B.ticks) {                       // FLOT: forward-facing tick marks
      for (let i = 0; i < B.pts.length - 1; i++) {
        const ax = P.X(B.pts[i][0]), ay = P.Y(B.pts[i][1]);
        const bx = P.X(B.pts[i + 1][0]), by = P.Y(B.pts[i + 1][1]);
        for (let f = 0.2; f < 1; f += 0.34) {
          const mx = ax + (bx - ax) * f, my = ay + (by - ay) * f;
          const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
          ctx.beginPath(); ctx.moveTo(mx, my);
          ctx.lineTo(mx + (dy / len) * 8, my - (dx / len) * 8);
          ctx.strokeStyle = MAPTHEME.rgba('red', 0.6); ctx.lineWidth = 2; ctx.stroke();
        }
      }
    }
    const mid = B.pts[Math.floor(B.pts.length / 2)];
    ctx.save(); ctx.translate(P.X(mid[0]) + 8, P.Y(mid[1])); ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 8.5px ui-monospace,monospace';
    ctx.textAlign = 'center'; haloText(ctx, B.label, 0, 0, MAPTHEME.hex('red'), 3);
    ctx.restore(); ctx.restore();
  }

  // ---- threat envelopes ----
  if (L('threat')) for (const z of scn.threats) {
    const zx = P.X(z.x), zy = P.Y(z.y), zr = Math.max(2, z.r * P.s);
    const g = ctx.createRadialGradient(zx, zy, 2, zx, zy, zr);
    g.addColorStop(0, MAPTHEME.rgba('red', 0.17)); g.addColorStop(1, MAPTHEME.rgba('red', 0.012));
    ctx.beginPath(); ctx.arc(zx, zy, zr, 0, 7); ctx.fillStyle = g; ctx.fill();
    ctx.setLineDash([7, 6]); ctx.strokeStyle = MAPTHEME.rgba('red', 0.55); ctx.lineWidth = 1.4;
    ctx.stroke(); ctx.setLineDash([]);
    const zs = mini ? 0.55 : 1;
    ctx.save(); ctx.translate(zx, zy); ctx.rotate(Math.PI / 4); ctx.scale(zs, zs);
    ctx.fillStyle = MAPTHEME.rgba('red-d', 0.85); ctx.strokeStyle = MAPTHEME.hex('red'); ctx.lineWidth = 1.8;
    ctx.fillRect(-7, -7, 14, 14); ctx.strokeRect(-7, -7, 14, 14); ctx.restore();
    if (!mini) {
      ctx.font = 'bold 8px ui-monospace,monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      haloText(ctx, 'EN', zx, zy + 0.5, MAPTHEME.hex('red'), 2.6); ctx.textBaseline = 'alphabetic';
    }
    if (!mini) {
      ctx.font = 'bold 9px ui-monospace,monospace';
      haloText(ctx, z.label, zx, zy - zr - 6, MAPTHEME.hex('red'), 3);
    }
  }

  // ---- casualties ----
  for (const c of arm.casualties) {
    if (c.tInjury > now) continue;
    if (!casVisible(c, now)) continue;
    const x = P.X(c.x), y = P.Y(c.y);
    if (c.hva && !mini && c.outcome) {
      ctx.beginPath(); ctx.arc(x, y, 9, 0, 7);
      ctx.strokeStyle = MAPTHEME.rgba('amb', 0.5); ctx.lineWidth = 1.4; ctx.stroke();
    }
    if (c.outcome === 'DIED') {
      const surv = (c.cls === 'IMMEDIATE' || c.cls === 'DELAYED');
      ctx.strokeStyle = surv ? MAPTHEME.rgba('red', 0.95) : MAPTHEME.rgba('grey', 0.42);
      ctx.lineWidth = surv ? 2.2 : 1.2;
      const r = surv ? 4.6 : 3;
      ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
      ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke();
      continue;
    }
    if (c.outcome === 'SAVED') {
      ctx.beginPath(); ctx.arc(x, y, 4, 0, 7);
      ctx.fillStyle = MAPTHEME.rgba('grn-d', 0.62); ctx.fill();
      ctx.strokeStyle = MAPTHEME.rgba('grn', 0.85); ctx.lineWidth = 1.3; ctx.stroke();
      ctx.strokeStyle = MAPTHEME.hex('grn'); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x - 0.4, y + 1.8); ctx.lineTo(x + 2.2, y - 2);
      ctx.stroke();
      continue;
    }
    const crm = c.crmAt(now);
    const timed = c.deadlineMin < 9000;
    const col = !timed ? COL.stable : crm < PARAMS.CRM_RED ? COL.critical
              : crm < PARAMS.CRM_YELLOW ? COL.falling : COL.stable;
    const falling = timed && crm < PARAMS.CRM_YELLOW;
    const critical = timed && crm < PARAMS.CRM_RED;
    if (falling && !mini) {
      ctx.beginPath(); ctx.arc(x, y, 9.5, -Math.PI / 2, -Math.PI / 2 + Math.max(0, crm / 100) * Math.PI * 2);
      ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 9.5, 0, 7);
      ctx.strokeStyle = MAPTHEME.rgba('t-hi', 0.10); ctx.lineWidth = 2.4; ctx.stroke();
    }
    if (critical && !mini) {
      const pulse = 0.30 + 0.30 * Math.sin(performance.now() / 220);
      ctx.beginPath(); ctx.arc(x, y, 14, 0, 7);
      ctx.strokeStyle = MAPTHEME.rgba('red', pulse); ctx.lineWidth = 1.4; ctx.stroke();
    }
    /* Coverage. A dashed ring means the launch-point laydown, not the tasking,
       is what stands between this casualty and a delivery. */
    if (!mini && c.reachN !== undefined && c.reachN <= 1 && c.outcome === null) {
      ctx.save();
      ctx.setLineDash([2.5, 3]);
      ctx.beginPath(); ctx.arc(x, y, 11, 0, 7);
      ctx.strokeStyle = c.reachN === 0 ? MAPTHEME.rgba('red', 0.85) : MAPTHEME.rgba('blue', 0.8);
      ctx.lineWidth = 1.3; ctx.stroke();
      ctx.restore();
    }
    if (c.hva && !mini) {                       // commander-designated: chevron halo
      ctx.save(); ctx.translate(x, y);
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 2;
        ctx.moveTo(Math.cos(a) * 7.5, Math.sin(a) * 7.5);
        ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
      }
      ctx.strokeStyle = MAPTHEME.hex('amb'); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(x, y, mini ? 2.2 : (falling ? 4.6 : 3.6), 0, 7);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = c.hva && !mini ? MAPTHEME.hex('amb') : MAPTHEME.hex('m-halo');
    ctx.lineWidth = c.hva && !mini ? 1.8 : 1.2; ctx.stroke();
    if (c.hva && !mini && P.s > 5) {
      chipAt(ctx, x > w * 0.62 ? x - 15 : x + 15, y - 13,
             ROLES[c.role] ? ROLES[c.role].short : 'HVA',
             MAPTHEME.hex('m-halo'), MAPTHEME.hex('amb'), 8.5, x > w * 0.62 ? 'right' : 'left');
    }
    if (critical && !mini) {
      const mins = Math.max(0, c.deadlineMin - (now - c.tInjury)).toFixed(0) + ' MIN';
      chipAt(ctx, x > w * 0.62 ? x - 14 : x + 14, y, mins, MAPTHEME.hex('red'),
             MAPTHEME.hex('m-halo'), 9, x > w * 0.62 ? 'right' : 'left');
    }
  }

  /* ---- casualty-site callouts ----------------------------------------
     The approved console does not label every wounded soldier — it labels
     the SITES, with the count of dead and how many of those deaths were
     survivable, pinned to the ground with a leader line. That is the
     sentence this application exists to put in front of a reviewer, so it
     is on the map rather than only in a table. Sites are the scenario's own
     clusters; a site with no dead yet says nothing. */
  if (!mini && !crowded && L('died') && P.s > 3.4) {
    /* Grouped by the manoeuvre element the casualty belongs to, which is
       the unit of ground a commander actually reasons about — "how is 2nd
       platoon", never "how is casualty 47". The mark goes on the centroid
       of that element's dead. */
    const byUnit = new Map();
    for (const c of arm.casualties) {
      if (c.tInjury > now || c.outcome !== 'DIED') continue;
      const key = c.unitName || 'UNIT';
      let u = byUnit.get(key);
      if (!u) { u = { name: key, dead: 0, surv: 0, sx: 0, sy: 0 }; byUnit.set(key, u); }
      u.dead++; u.sx += c.x; u.sy += c.y;
      if (c.cls === 'IMMEDIATE' || c.cls === 'DELAYED') u.surv++;
    }
    const sites = [...byUnit.values()].map(u => ({
      k: { x: u.sx / u.dead, y: u.sy / u.dead, name: u.name }, dead: u.dead, surv: u.surv
    }));
    /* Heaviest loss first, and a caption that cannot find clear ground is
       dropped rather than printed over one that is already there. The rule
       the whole of this application's labelling follows: an unreadable label
       is worse than no label. */
    sites.sort((a, b) => b.dead - a.dead);
    ctx.save();
    ctx.font = '9.6px ui-monospace,monospace';
    for (const s of sites) {
      const sx = P.X(s.k.x), sy = P.Y(s.k.y);
      if (sx < -60 || sx > w + 60 || sy < commsBannerY() || sy > h - 30) continue;
      const sub = s.dead + ' dead \u00b7 ' + s.surv + ' survivable';
      const tw = Math.max(ctx.measureText(s.k.name).width, ctx.measureText(sub).width);
      const left = sx > w * 0.66;
      const lx = sx + (left ? -12 : 12);
      if (!claim(left ? lx - tw : lx, sy - 12, tw, 26)) continue;
      ctx.beginPath(); ctx.arc(sx, sy, 7, 0, 7);
      ctx.fillStyle = MAPTHEME.rgba('red-d', 0.85); ctx.fill();
      ctx.strokeStyle = MAPTHEME.hex('red'); ctx.lineWidth = 1.9; ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0, 7);
      ctx.fillStyle = MAPTHEME.hex('red'); ctx.fill();
      haloLines(ctx, lx, sy - 2, [
        [s.k.name, MAPTHEME.hex('t-hi'), false],
        [sub, MAPTHEME.hex('yel'), false]
      ], 9.6, left ? 'right' : 'left');
    }
    ctx.restore();
  }

  /* ---- reach rings ----------------------------------------------------
     What can be got to, from where, inside the golden window. The approved
     console draws these first, behind everything, as a dashed cyan ring per
     launch point with a solid inner ring at the radius a HEAVY can hold —
     because the operator's most common question on this map is not "where
     are my aircraft" but "can anything get there at all". They belong to the
     launch-point layer and switch with it. */
  if (!mini && L('base') && typeof effectiveRadiusKm === 'function') {
    ctx.save();
    for (const b of arm.bases) {
      const x = P.X(b.x), y = P.Y(b.y);
      let far = 0, near = 0;
      for (const d of arm.drones) {
        if (d.baseX !== b.x || d.baseY !== b.y) continue;
        const r = effectiveRadiusKm(d.plat, 1.45);
        if (r > far) far = r;
        if (!near || r < near) near = r;
      }
      if (!far) continue;
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(x, y, far * P.s, 0, 7);
      ctx.strokeStyle = MAPTHEME.rgba('m-track', 0.4); ctx.lineWidth = 1.3; ctx.stroke();
      ctx.setLineDash([]);
      if (near && near < far) {
        ctx.beginPath(); ctx.arc(x, y, near * P.s, 0, 7);
        ctx.strokeStyle = MAPTHEME.rgba('m-track', 0.18); ctx.lineWidth = 1.3; ctx.stroke();
      }
      if (!crowded && far * P.s > 46) {
        ctx.font = '8.5px ui-monospace,monospace'; ctx.textAlign = 'center';
        ctx.letterSpacing = '1.3px';
        haloText(ctx, 'REACH  T+30', x, y - far * P.s + 14, MAPTHEME.rgba('m-track', 0.86), 3);
        ctx.letterSpacing = '0px';
      }
    }
    ctx.restore();
  }

  // ---- launch points ----
  if (L('base')) for (let bi = 0; bi < arm.bases.length; bi++) {
    const b = arm.bases[bi];
    const src = scn.bases[bi];
    const x = P.X(b.x), y = P.Y(b.y);
    const R0 = mini ? 0.55 : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(R0, R0);
    if (src && src.afloat) {                       // ship: friendly track symbol
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(13, 0); ctx.lineTo(0, 12);
      ctx.lineTo(-13, 0); ctx.closePath();
      ctx.fillStyle = MAPTHEME.hex('m-halo'); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.stroke();
    } else {
      rr(ctx, -11, -11, 22, 22, 4);
      ctx.fillStyle = MAPTHEME.hex('m-halo'); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.stroke();
    }
    /* The helipad H the approved console uses. A launch point is a place an
       airframe leaves from, and the aeronautical symbol says that in one
       glyph where a plus sign says only "something is here". */
    ctx.strokeStyle = accent; ctx.lineWidth = 2.1; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4.5, -5.5); ctx.lineTo(-4.5, 5.5);
    ctx.moveTo(-4.5, 0); ctx.lineTo(4.5, 0);
    ctx.moveTo(4.5, -5.5); ctx.lineTo(4.5, 5.5);
    ctx.stroke();
    ctx.restore();
    if (!mini) {
      ctx.font = 'bold 9.5px ui-monospace,monospace'; ctx.textAlign = 'left';
      const nAC = arm.drones.filter(d => d.baseX === b.x && d.baseY === b.y).length;
      const sorties = arm.drones.reduce((n, d) =>
        n + (d.baseX === b.x && d.baseY === b.y ? (d.sorties || 0) : 0), 0);
      const sub = nAC + ' A/C \u00b7 ' + sorties + ' SORTIES';
      const lw = Math.max(ctx.measureText(b.name).width, ctx.measureText(sub).width);
      /* right of the pad, left of it, above it, below it — then give up */
      const ladder = [[x + 15, y - 2], [x - 15 - lw, y - 2],
                      [x - lw / 2, y - 22], [x - lw / 2, y + 32]];
      for (const [lx, ly] of ladder) {
        if (!claim(lx - 2, ly - 13, lw + 6, 30)) continue;
        haloLines(ctx, lx, ly, [
          [b.name, accent, true],
          [sub, MAPTHEME.hex('t-mid'), false]
        ], 9.2, 'left');
        break;
      }
    }
    if (!mini && !crowded) {
      ctx.font = 'bold 9px ui-monospace,monospace';
      const bw = ctx.measureText(b.stock.BLOOD + 'u BLOOD').width + 9;
      chipAt(ctx, x - bw / 2, y + 22, b.stock.BLOOD + 'u BLOOD',
             b.stock.BLOOD <= 1 ? MAPTHEME.hex('amb') : MAPTHEME.hex('red'),
             MAPTHEME.hex('m-halo'), 9);
    }
  }

  /* ---- the proposed forward launch point ------------------------------
     Amber, dashed, and never anything else: in this contract amber means a
     human has to decide, and this is the only mark on the map that is a
     recommendation rather than a fact. Drawn only when the coverage gap is
     real — see proposedLaunchPoint. */
  if (!mini && L('base')) {
    const spur = proposedLaunchPoint(scn, arm);
    if (spur) {
      const x = P.X(spur.x), y = P.Y(spur.y);
      const rKm = typeof effectiveRadiusKm === 'function'
        ? effectiveRadiusKm('LIGHT', 1.45) : 30;
      ctx.save();
      ctx.setLineDash([2, 5]); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y, rKm * P.s, 0, 7);
      ctx.fillStyle = MAPTHEME.rgba('amb', 0.055); ctx.fill();
      ctx.strokeStyle = MAPTHEME.rgba('amb', 0.68); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.setLineDash([]);
      ctx.translate(x, y);
      rr(ctx, -9, -9, 18, 18, 3);
      ctx.fillStyle = MAPTHEME.rgba('amb-d', 0.55); ctx.fill();
      ctx.setLineDash([3, 2.2]);
      ctx.strokeStyle = MAPTHEME.hex('amb'); ctx.lineWidth = 1.7; ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = MAPTHEME.hex('amb'); ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-4, -5); ctx.lineTo(-4, 5); ctx.moveTo(-4, 0); ctx.lineTo(4, 0);
      ctx.moveTo(4, -5); ctx.lineTo(4, 5);
      ctx.stroke();
      ctx.restore();
      if (!crowded) {
        calloutAt(ctx, x, y, [
          ['LP FORWARD \u2014 PROPOSED', MAPTHEME.hex('amb'), true],
          ['Move a launch point forward. Not more aircraft.', MAPTHEME.hex('t-mid'), false],
          ['Recovers ' + spur.thin + ' now reachable by one aircraft or none',
           MAPTHEME.hex('t-mid'), false]
        ], MAPTHEME.hex('amb'), w, h);
      }
    }
  }

  // ---- aircraft ----
  if (L('air')) for (const d of arm.drones) {
    if (d.state === 'LOST') continue;
    const pos = dronePos(d, now);
    const x = P.X(pos.x), y = P.Y(pos.y);
    const tx = P.X(pos.tx), ty = P.Y(pos.ty);
    const idle = d.state === 'IDLE';

    /* Two different facts, two different colours, exactly as the map key in
       the approved console states them: the ROUTE — where the aircraft is
       going, cyan, the ANGEL SWARM arm's own colour — and the FLOWN TRACK,
       red, which is history and cannot be changed. Drawing both in the arm's
       accent, as this did, made a plan and a record look like one line. */
    if (d.state === 'OUTBOUND') {
      ctx.beginPath(); ctx.moveTo(P.X(d.fromX), P.Y(d.fromY)); ctx.lineTo(x, y);
      ctx.strokeStyle = MAPTHEME.rgba('red', 0.85); ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round'; ctx.stroke();
      ctx.setLineDash([5, 5]); ctx.strokeStyle = MAPTHEME.rgba('m-track', 0.8); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(tx, ty, 12, 0, 7);
      ctx.strokeStyle = MAPTHEME.rgba('m-track', 0.4); ctx.lineWidth = 1; ctx.stroke();
      if (d.route && d.route.length > d.legIdx + 1) {
        ctx.setLineDash([2, 6]); ctx.strokeStyle = MAPTHEME.rgba('m-track', 0.33);
        ctx.beginPath(); ctx.moveTo(tx, ty);
        for (let i = d.legIdx + 1; i < d.route.length; i++) ctx.lineTo(P.X(d.route[i].x), P.Y(d.route[i].y));
        ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (d.state === 'RETURNING') {
      ctx.beginPath(); ctx.moveTo(P.X(d.fromX), P.Y(d.fromY)); ctx.lineTo(x, y);
      ctx.strokeStyle = MAPTHEME.rgba('red', 0.34); ctx.lineWidth = 1.6; ctx.stroke();
    }
    /* ---- on station. The aircraft is not passing through: it is holding
       over the casualty while the package goes down and someone picks it up.
       Show the hold, the release and the recovery, because "arrived" and
       "delivered" are not the same event. ---------------------------------- */
    if (d.onStation && !mini) {
      const S = d.onStation;
      const releasing = S.phase === 'RELEASING';
      const ph = ((performance.now() / 700) % 1);
      /* hold orbit */
      ctx.save(); ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(tx, ty, 15, 0, 7);
      ctx.strokeStyle = MAPTHEME.rgba('t-hi', 0.42); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
      if (releasing) {
        /* pod on the way down */
        const drop = 4 + ph * 9;
        ctx.beginPath(); ctx.moveTo(tx, ty - 13); ctx.lineTo(tx, ty - 13 + drop);
        ctx.strokeStyle = MAPTHEME.rgba('amb', 0.75); ctx.lineWidth = 1.1; ctx.stroke();
        ctx.beginPath(); ctx.rect(tx - 2.4, ty - 13 + drop, 4.8, 4.2);
        ctx.fillStyle = MAPTHEME.hex('amb'); ctx.fill();
      } else {
        /* recovery pulse on the ground */
        const r = 5 + ph * 11;
        ctx.beginPath(); ctx.arc(tx, ty, r, 0, 7);
        ctx.strokeStyle = MAPTHEME.rgba('grn', 0.55 * (1 - ph)); ctx.lineWidth = 1.8; ctx.stroke();
      }
      if (P.s > 4) {
        chipAt(ctx, tx + 17, ty + 4,
               releasing ? S.seq.method : 'RECOVERING',
               releasing ? MAPTHEME.hex('amb') : MAPTHEME.hex('grn'),
               MAPTHEME.hex('m-halo'), 8.5, 'left');
      }
    }
    if (d.emblem && !idle && !mini) {
      const ph = ((performance.now() / 900) + d.id * 0.21) % 1;
      ctx.beginPath(); ctx.arc(x, y, 9 + ph * 13, 0, 7);
      ctx.strokeStyle = MAPTHEME.rgba('t-hi', 0.20 * (1 - ph)); ctx.lineWidth = 1.2; ctx.stroke();
    }
    const ang = idle ? -Math.PI / 2 : Math.atan2(ty - y, tx - x);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (mini) ctx.scale(0.62, 0.62);
    ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-7, 6.5); ctx.lineTo(-3.5, 0); ctx.lineTo(-7, -6.5);
    ctx.closePath();
    /* The airframe mark is YELLOW when it is doing something and grey when
       it is not, which is the approved console's grammar: the aircraft are
       the only moving things on the map and they are read by position and
       heading, not by which arm owns them. Arm identity is carried by the
       route and the ring, which is where it belongs. */
    ctx.fillStyle = idle ? MAPTHEME.rgba('grey', 0.5)
                  : (d.state === 'RETURNING' ? MAPTHEME.hex('grey') : MAPTHEME.hex('yel'));
    ctx.fill();
    ctx.strokeStyle = MAPTHEME.hex('m-halo'); ctx.lineWidth = 1.3; ctx.stroke();
    ctx.restore();

    const clear = dist(pos.x, pos.y, d.baseX, d.baseY) > (crowded ? 11 : 6);
    if (!idle && clear && !mini) {
      const left = x > w * 0.62;
      const lx = left ? x - 15 : x + 14, al = left ? 'right' : 'left';
      const cw = chipAt(ctx, lx, y - 8, CALLSIGN[d.type] + '-' + d.id,
                        MAPTHEME.hex('t-hi'), MAPTHEME.hex('m-halo'), 9, al);
      const leg = d.route && d.route[d.legIdx];
      if (!crowded)
        chipAt(ctx, lx, y + 4, d.state === 'OUTBOUND' && leg ? PAYSHORT[leg.payloadKey] : 'RTB',
               d.state === 'OUTBOUND' ? MAPTHEME.hex('grn') : MAPTHEME.hex('slate'),
               MAPTHEME.hex('m-halo'), 8.5, al);
      if ((d.manifest && d.manifest.BLOOD) && d.coldC > PARAMS.COLD_MAX_C - 2.5)
        chipAt(ctx, left ? lx - cw - 4 : lx + cw + 4, y - 8, d.coldC.toFixed(1) + '°C',
               MAPTHEME.hex('amb'), MAPTHEME.hex('m-halo'), 8.5, al);
    }
  }

  // ---- command UAV: orbit, sensor footprint, poll sweep ----
  if (!mini && L('uav')) {
    const u = cmdUavPos(scn, now);
    const ux = P.X(u.x), uy = P.Y(u.y), ur = CMDUAV.footprintKm * P.s;
    ctx.save();
    // footprint
    const g = ctx.createRadialGradient(ux, uy, Math.max(2, ur * 0.15), ux, uy, Math.max(3, ur));
    g.addColorStop(0, MAPTHEME.rgba('blue', 0.10)); g.addColorStop(1, MAPTHEME.rgba('blue', 0.005));
    ctx.beginPath(); ctx.arc(ux, uy, Math.max(3, ur), 0, 7); ctx.fillStyle = g; ctx.fill();
    ctx.setLineDash([3, 7]); ctx.strokeStyle = MAPTHEME.rgba('blue', 0.42); ctx.lineWidth = 1.2;
    ctx.stroke(); ctx.setLineDash([]);
    // orbit track
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const q = cmdUavPos(scn, (i / 64) * CMDUAV.orbitPeriodMin);
      const qx = P.X(q.x), qy = P.Y(q.y);
      i ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy);
    }
    ctx.setLineDash([2, 8]); ctx.strokeStyle = MAPTHEME.rgba('blue', 0.22); ctx.lineWidth = 1;
    ctx.stroke(); ctx.setLineDash([]);
    // a poll sweep pulses the footprint
    if (UI.pingSweep) {
      const ph = ((now - UI.pingSweep.tStart) / CMDUAV.pollSweepMin) % 1;
      ctx.beginPath(); ctx.arc(ux, uy, Math.max(3, ur) * (0.25 + ph * 0.85), 0, 7);
      ctx.strokeStyle = MAPTHEME.rgba('blue', 0.55 * (1 - ph)); ctx.lineWidth = 2; ctx.stroke();
    }
    // the airframe: fixed-wing planform, banked into the orbit
    const nx = cmdUavPos(scn, now + 0.4);
    const ang = Math.atan2(P.Y(nx.y) - uy, P.X(nx.x) - ux);
    ctx.translate(ux, uy); ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(13, 0); ctx.lineTo(2, 3); ctx.lineTo(-1, 12); ctx.lineTo(-5, 12);
    ctx.lineTo(-4, 2.5); ctx.lineTo(-10, 2); ctx.lineTo(-12, 6); ctx.lineTo(-14, 6);
    ctx.lineTo(-13, 0);
    ctx.lineTo(-14, -6); ctx.lineTo(-12, -6); ctx.lineTo(-10, -2); ctx.lineTo(-4, -2.5);
    ctx.lineTo(-5, -12); ctx.lineTo(-1, -12); ctx.lineTo(2, -3);
    ctx.closePath();
    ctx.fillStyle = MAPTHEME.hex('blue'); ctx.fill();
    ctx.strokeStyle = MAPTHEME.hex('m-halo'); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    chipAt(ctx, ux + 18, uy - 12, CMDUAV.callsign,
           MAPTHEME.hex('t-hi'), MAPTHEME.hex('m-halo'), 9);
    chipAt(ctx, ux + 18, uy, UI.pingSweep ? 'POLLING' : 'C2 / ISR RELAY',
           UI.pingSweep ? MAPTHEME.hex('cyan') : MAPTHEME.hex('t-mid'),
           MAPTHEME.hex('m-halo'), 8.5);
  }

  // ---- degraded-comms banner ----
  /* The mission strip and the pane tags are DOM elements floating above this
     canvas; anything drawn near the top edge disappears behind them. */
  if (arm.commsDown && !mini) {
    const lbl = scn.comms.find(c => now >= c.atMin && now < c.atMin + c.durMin);
    ctx.fillStyle = MAPTHEME.rgba('red', 0.09); ctx.fillRect(0, 0, w, h);
    // A centred pill below the pane labels, so it never sits on top of them.
    const txt = '⚠ ' + (lbl ? lbl.label : 'COMMS DEGRADED') + ' — ' +
      (arm.allocatorKey === 'ANGEL' ? 'HOLDING LAST-KNOWN-GOOD PLAN, AIRCRAFT STILL FLYING'
                                    : 'NO VOICE DISPATCH POSSIBLE');
    ctx.font = 'bold 11px ui-monospace,monospace';
    /* Centred on the map an operator can SEE, not on the canvas: with a column
       of panels down each side, the middle of the canvas is not the middle of
       the picture and a warning centred on it runs under both of them. */
    var bI = mapInsets();
    var bL = bI.l, bR = w - bI.r, bMid = (bL + bR) / 2;
    const bw = Math.min(Math.max(120, bR - bL - 24), ctx.measureText(txt).width + 26);
    ctx.save();
    var bY = commsBannerY();
    noteChrome(bMid - bw / 2, bY, bw, 26, 'comms banner');
    rr(ctx, bMid - bw / 2, bY, bw, 26, 6);
    ctx.fillStyle = MAPTHEME.hex('m-halo'); ctx.fill();
    ctx.strokeStyle = MAPTHEME.rgba('red', 0.5); ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    haloText(ctx, txt, bMid, bY + 13.5, MAPTHEME.hex('red'), 3);
    ctx.restore(); ctx.textBaseline = 'alphabetic';
  }

  // ---- scale bar + north arrow, kept clear of the HUD dock ----
  if (!mini) {
  ctx.save();
  // pick a round distance that renders between 60 and 160 px at this zoom
  const NICE = [1, 2, 5, 10, 20, 50, 100];
  let kmStep = NICE.find(k => k * P.s >= 60) || 100;
  const km10 = kmStep * P.s;
  // right-aligned inside the free width so it never sits under the legend
  const free = paneKey === 'A' && !document.body.classList.contains('compare') ? w - 346 : w;
  /* The console's own legend is 330-346 px of the right-hand side; the design
     hides that legend and floats its own panels there instead, which are a
     different width. Whichever reaches further in is the one to clear. */
  const sbI = mapInsets();
  const sbFree = Math.min(free, w - sbI.r);
  const sbx = Math.max(16 + sbI.l, Math.min(sbFree - km10 - 84, w - Math.max(330, sbI.r) - km10 - 96));
  const sbBase = h - sbI.b;
  ctx.strokeStyle = MAPTHEME.rgba('t-mid', 0.85); ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(sbx, sbBase - 18); ctx.lineTo(sbx + km10, sbBase - 18);
  ctx.moveTo(sbx, sbBase - 23); ctx.lineTo(sbx, sbBase - 13);
  ctx.moveTo(sbx + km10, sbBase - 23); ctx.lineTo(sbx + km10, sbBase - 13);
  ctx.stroke();
  ctx.font = '9px ui-monospace,monospace'; ctx.textAlign = 'center';
  haloText(ctx, kmStep + ' km', sbx + km10 / 2, sbBase - 26, MAPTHEME.hex('t-mid'), 3);
  const nx = sbx + km10 + 46, ny = sbBase - 26;
  noteChrome(sbx - 6, sbBase - 36, km10 + 64, 30, 'scale bar and north arrow');
  ctx.beginPath(); ctx.moveTo(nx, ny - 14); ctx.lineTo(nx + 5, ny + 6); ctx.lineTo(nx, ny + 1);
  ctx.lineTo(nx - 5, ny + 6); ctx.closePath();
  ctx.fillStyle = MAPTHEME.hex('t-mid'); ctx.fill();
  ctx.textAlign = 'center'; haloText(ctx, 'N', nx, ny + 18, MAPTHEME.hex('t-mid'), 3);
  ctx.restore();
  }

  // ---- AOR title block ----
  if (!mini) {
    ctx.save();
    const lines = [
      ['AOR', scn.key + ' \u00b7 ' + (scn.aor || '')],
      ['GRID ZONE', scn.gridZone || '\u2014'],
      ['EXTENT', scn.widthKm + ' \u00d7 ' + scn.heightKm + ' KM'],
      ['FORCES', scn.friendly || ''],
      ['THREAT AXIS', scn.hostileBearing || '']
    ];
    ctx.font = 'bold 8.5px ui-monospace,monospace';
    let bw = 0;
    for (const [k, v] of lines) bw = Math.max(bw, ctx.measureText(k).width + ctx.measureText(v).width + 34);
    bw = Math.min(bw, 300);
    const bh = lines.length * 13 + 24;
    const dockW = paneKey === 'A' && !document.body.classList.contains('compare') ? 342 : 0;
    /* Right-aligned inside whichever reaches further in — the console's own
       legend dock or the host's panel column — and lifted clear of anything
       the host floats along the bottom. Never pushed off the left edge. */
    const aI = mapInsets();
    const bx = Math.max(aI.l + 12, w - Math.max(dockW, aI.r) - bw - 12);
    const by = h - aI.b - bh - 12;
    /* Flush to the map, one tone step, no card and no radius — the approved
       console's rule for a map-edge readout. */
    noteChrome(bx, by, bw, bh, 'area of operations block');
    ctx.fillStyle = MAPTHEME.hex('m-halo');
    ctx.fillRect(bx, by, bw, bh);
    ctx.textAlign = 'left'; ctx.fillStyle = accent;
    ctx.fillText('AREA OF OPERATIONS', bx + 10, by + 15);
    lines.forEach(([k, v], i) => {
      const yy = by + 30 + i * 13;
      ctx.fillStyle = MAPTHEME.hex('t-lo'); ctx.fillText(k, bx + 10, yy);
      ctx.textAlign = 'right'; ctx.fillStyle = MAPTHEME.hex('t-hi');
      ctx.fillText(v, bx + bw - 10, yy); ctx.textAlign = 'left';
    });
    ctx.restore();
  }

  if (UI.hover && UI.hoverPane === paneKey) {
    ctx.beginPath(); ctx.arc(P.X(UI.hover.x), P.Y(UI.hover.y), 17, 0, 7);
    ctx.strokeStyle = MAPTHEME.rgba('t-hi', 0.55); ctx.lineWidth = 1.4; ctx.stroke();
  }

  /* ---- the selected object's callout ----------------------------------
     The approved console pins a card to whatever the operator has selected,
     with a leader line back to the mark, so the identity and the deadline
     are on the map rather than only in the inspector three hundred pixels
     away. One card at a time, and only where there is room for it. */
  if (!mini && !crowded && UI.sel && paneKey === 'A') {
    if (UI.sel.kind === 'cas') {
      const c = arm.casualties.find(k => k.id === UI.sel.id);
      if (c && c.tInjury <= now) {
        const cx = P.X(c.x), cy = P.Y(c.y);
        const left = Math.max(0, c.deadlineMin - (now - c.tInjury));
        const timed = c.deadlineMin < 9000;
        const tint = c.outcome === 'DIED' ? MAPTHEME.hex('red')
                   : c.outcome === 'SAVED' ? MAPTHEME.hex('grn')
                   : timed && left < 15 ? MAPTHEME.hex('red') : MAPTHEME.hex('cyan');
        ctx.beginPath(); ctx.arc(cx, cy, 17, 0, 7);
        ctx.strokeStyle = MAPTHEME.rgba('t-hi', 0.75); ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
        calloutAt(ctx, cx, cy, [
          ['CAS-' + String(c.id).padStart(3, '0') + ' \u00b7 ' + (c.unitName || ''), MAPTHEME.hex('t-hi'), true],
          [c.cls + ' \u00b7 ' + (c.injury || '').replace(/_/g, ' '), MAPTHEME.hex('t-mid'), false],
          [c.outcome ? c.outcome : (timed ? left.toFixed(0) + ' min to deadline' : 'no timed deadline'),
           tint, false]
        ], tint, w, h);
      }
    } else if (UI.sel.kind === 'drone') {
      const d = arm.drones.find(k => k.id === UI.sel.id);
      if (d && d.state !== 'LOST') {
        const pos = dronePos(d, now);
        const dx = P.X(pos.x), dy = P.Y(pos.y);
        const leg = d.route && d.route[d.legIdx];
        calloutAt(ctx, dx, dy, [
          [CALLSIGN[d.type] + '-' + d.id + ' \u00b7 ' + d.type, MAPTHEME.hex('t-hi'), true],
          [d.state + (leg && d.state === 'OUTBOUND' ? ' \u00b7 ' + PAYSHORT[leg.payloadKey] : ''),
           MAPTHEME.hex('t-mid'), false],
          [(d.sorties || 0) + ' sorties \u00b7 ' + (d.delivered || 0) + ' delivered',
           MAPTHEME.hex('cyan'), false]
        ], MAPTHEME.hex('yel'), w, h);
      }
    }
  }
}


/* ---------------------------------------------------------- THEME CHANGE --
   A canvas holds pixels, not styles, so a theme change is only visible once
   something draws again. The application's own loop redraws the tactical map
   every animation frame while the operator is looking at it, but the mini
   maps on the comparison pane and the theatre canvas are drawn on demand —
   so the change is announced rather than waited for.

   The relief sheet re-tints itself lazily: it is keyed on MAPTHEME's
   generation, which has already moved by the time this runs, so the next
   drawMap rebuilds it once and every later frame hits the cache. */
MAPTHEME.on(function () {
  SPUR.key = null;                       /* amber proposal is theme-independent, but cheap to redo */
  try { if (typeof render === 'function') render(); } catch (e) { /* app not up yet */ }
});
