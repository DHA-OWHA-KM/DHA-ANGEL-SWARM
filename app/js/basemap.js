/* ============================================================================
   ANGEL SWARM — BASEMAP
   Renders the scenario's elevation field into a shaded-relief map sheet:
   hypsometric tints, hillshade, contour lines, bathymetry and coastline.
   Built once per scenario into an offscreen canvas, then blitted under the
   symbology. This is what makes the AOR read as terrain rather than shapes.
   ========================================================================== */

const BASEMAP_PX_PER_KM = 9;
const BASEMAP_MARGIN_X = 66;   // km of terrain generated beyond the AO
const BASEMAP_MARGIN_Y = 26;

function lerpC(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
/* Hypsometric ramp — low ground green-grey, high ground warm rock. */
const HYPSO = [
  [0,   [ 46,  56,  44]],
  [40,  [ 58,  68,  50]],
  [90,  [ 74,  78,  55]],
  [150, [ 92,  86,  62]],
  [210, [110,  97,  74]],
  [280, [132, 118,  98]],
  [340, [156, 146, 130]]
];
function hypso(e) {
  for (let i = 0; i < HYPSO.length - 1; i++) {
    const [e0, c0] = HYPSO[i], [e1, c1] = HYPSO[i + 1];
    if (e <= e1) return lerpC(c0, c1, Math.max(0, (e - e0) / (e1 - e0)));
  }
  return HYPSO[HYPSO.length - 1][1];
}
/* Bathymetric ramp — shelf to deep water. */
function bathy(d) {           // d = depth in metres (positive)
  const shelf = [ 34,  76, 100];
  const mid   = [ 20,  52,  78];
  const deep  = [ 10,  30,  52];
  if (d < 25) return lerpC([54, 104, 128], shelf, d / 25);
  if (d < 60) return lerpC(shelf, mid, (d - 25) / 35);
  return lerpC(mid, deep, Math.min(1, (d - 60) / 60));
}

function buildBasemap(scn) {
  const T = terrainOf(scn);
  const PX = BASEMAP_PX_PER_KM;
  const x0 = -BASEMAP_MARGIN_X, y0 = -BASEMAP_MARGIN_Y;
  const kmW = scn.widthKm + BASEMAP_MARGIN_X * 2, kmH = scn.heightKm + BASEMAP_MARGIN_Y * 2;
  const w = Math.round(kmW * PX), h = Math.round(kmH * PX);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');

  // --- sample the elevation field -----------------------------------------
  const E = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    const ky = y0 + j / PX;
    for (let i = 0; i < w; i++) E[j * w + i] = T.elev(x0 + i / PX, ky);
  }

  const img = ctx.createImageData(w, h);
  const D = img.data;
  const CONTOUR = 25;          // metres between contour lines
  const INDEX_EVERY = 4;       // every 4th contour is an index contour
  const BATHY = 30;            // metres between bathymetric contours

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      const e = E[k];
      const eL = E[k - (i > 0 ? 1 : 0)], eR = E[k + (i < w - 1 ? 1 : 0)];
      const eU = E[k - (j > 0 ? w : 0)], eD = E[k + (j < h - 1 ? w : 0)];
      let col;

      if (e >= 0) {
        col = hypso(e);
        // hillshade: light from the north-west, exaggerated for legibility
        const dzdx = (eR - eL) * 0.5, dzdy = (eD - eU) * 0.5;
        const nx = -dzdx * 0.055, ny = -dzdy * 0.055, nz = 1;
        const len = Math.hypot(nx, ny, nz);
        let sh = (nx * -0.62 + ny * -0.62 + nz * 0.48) / len;      // NW light
        sh = 0.52 + 0.78 * Math.max(0, sh);
        col = [col[0] * sh, col[1] * sh, col[2] * sh];
        // contour lines
        const b = Math.floor(e / CONTOUR);
        const cross = b !== Math.floor(eR / CONTOUR) || b !== Math.floor(eD / CONTOUR);
        if (cross) {
          const idx = (b % INDEX_EVERY) === 0;
          const f = idx ? 0.52 : 0.26;
          col = [col[0] * (1 - f) + 28 * f, col[1] * (1 - f) + 24 * f, col[2] * (1 - f) + 18 * f];
        }
      } else {
        const d = -e;
        col = bathy(d);
        const b = Math.floor(d / BATHY);
        if (b !== Math.floor(-eR / BATHY) || b !== Math.floor(-eD / BATHY)) {
          col = [col[0] * 0.80 + 30, col[1] * 0.80 + 40, col[2] * 0.80 + 48];
        }
      }

      // coastline: any sign change against a neighbour
      if ((e >= 0) !== (eR >= 0) || (e >= 0) !== (eD >= 0)) col = [196, 226, 244];
      // surf band just offshore
      else if (e < 0 && e > -9) col = [col[0] * 0.6 + 96, col[1] * 0.6 + 132, col[2] * 0.6 + 150];

      const o = k * 4;
      D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // --- drainage / tracks drawn as vector over the relief -------------------
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (scn.land === 'continuous') {
    // watercourses: follow the steepest descent from a few high points
    const rng = makeRNG((scn.terrainSeed || 1) * 7 + 13);
    for (let s = 0; s < 5; s++) {
      let x = rng.range(6, scn.widthKm - 6), y = rng.range(4, scn.heightKm * 0.4);
      const toPx = (kx, ky) => [(kx - x0) * PX, (ky - y0) * PX];
      const pts = [[x, y]];
      for (let step = 0; step < 380; step++) {
        const ex = T.elev(x + 0.6, y) - T.elev(x - 0.6, y);
        const ey = T.elev(x, y + 0.6) - T.elev(x, y - 0.6);
        const m = Math.hypot(ex, ey) || 1;
        x -= (ex / m) * 0.45; y -= (ey / m) * 0.45 - 0.12;   // bias downhill + south
        if (x < 1 || x > scn.widthKm - 1 || y > scn.heightKm - 1) break;
        pts.push([x, y]);
      }
      if (pts.length < 20) continue;
      ctx.beginPath();
      pts.forEach((p, i) => { const q = toPx(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
      ctx.strokeStyle = 'rgba(96,150,178,0.55)'; ctx.lineWidth = 2.2 * (PX / 11); ctx.stroke();
    }
    // main supply route
    ctx.beginPath();
    for (let y = y0; y <= scn.heightKm - y0; y += 2) {
      const x = 26 + Math.sin(y * 0.06) * 7 + Math.sin(y * 0.021) * 5;
      const px = (x - x0) * PX, py = (y - y0) * PX;
      y === y0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.strokeStyle = 'rgba(196,178,132,0.42)'; ctx.lineWidth = 3.0 * (PX / 11); ctx.stroke();
    ctx.setLineDash([9, 7]);
    ctx.strokeStyle = 'rgba(214,198,158,0.30)'; ctx.lineWidth = 1.2 * (PX / 11); ctx.stroke();
    ctx.setLineDash([]);
  }

  return { canvas: cv, pxPerKm: PX, w, h, x0, y0, kmW, kmH };
}
