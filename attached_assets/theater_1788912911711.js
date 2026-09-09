/* ============================================================================
   ANGEL SWARM — THEATER VIEW
   The combatant command, not the map sheet. Real coastlines and international
   boundaries at theater scale, with every joint operations area plotted where
   it actually sits. The commander opens here, sees where forces are committed,
   and drills into one JOA. The tactical picture is a pinhead on this map, and
   showing that honestly is the point.
   ========================================================================== */

/* Equirectangular with a cos(lat) correction at the centre of the theater —
   good enough at this scale and it keeps the shapes recognisable.

   `view` is the operator's pan and zoom: `{k, tx, ty}`, a scale multiplier on
   the fit and a translation in canvas pixels, applied *after* the fit. The
   whole projection is therefore `px = k · fit(lon) + tx`, which is why the
   inverse and the scale bar both fall out of one number — `s` below is the
   effective pixels-per-degree, not the fit's. Everything that reads `P.s`
   (the 1 000 km bar) is correct at any zoom without knowing zoom exists.
   Symbol sizes and type deliberately do NOT scale: this is a symbol map, and
   a JOA box that grew to 120px at 4× would say something untrue about the
   size of a brigade fight. */
function theaterProjector(th, w, h, pad, view) {
  pad = pad === undefined ? 30 : pad;
  const latMid = (th.lat0 + th.lat1) / 2;
  const kx = Math.cos(latMid * Math.PI / 180);
  const dLon = (th.lon1 - th.lon0) * kx, dLat = th.lat1 - th.lat0;
  const s0 = Math.min((w - pad * 2) / dLon, (h - pad * 2) / dLat);
  const ox0 = (w - dLon * s0) / 2, oy0 = (h - dLat * s0) / 2;
  const k = view && view.k > 0 ? view.k : 1;
  const tx = view && view.tx ? view.tx : 0, ty = view && view.ty ? view.ty : 0;
  const s = s0 * k, ox = ox0 * k + tx, oy = oy0 * k + ty;
  return {
    s, s0, k, tx, ty, kx,
    X: lon => ox + (lon - th.lon0) * kx * s,
    Y: lat => oy + (th.lat1 - lat) * s,
    inv: (px, py) => ({ lon: th.lon0 + (px - ox) / (kx * s), lat: th.lat1 - (py - oy) / s })
  };
}

/* THEATER_ZOOM[0] is also the resting state: the fit, exactly as this map
   looked before it could be moved. */
const THEATER_ZOOM = [1, 8];

/* The AOR may be dragged around, but not away. The rectangle has to keep at
   least a third of itself over the canvas in each axis, so there is no drag
   that ends on empty ocean with no way back other than the reset button. */
function clampTheaterView(view, th, w, h) {
  view.k = Math.max(THEATER_ZOOM[0], Math.min(THEATER_ZOOM[1], view.k || 1));
  const P = theaterProjector(th, w, h, 34, { k: view.k, tx: 0, ty: 0 });
  const bx0 = P.X(th.lon0), bx1 = P.X(th.lon1);
  const by0 = P.Y(th.lat1), by1 = P.Y(th.lat0);
  const mx = Math.min(bx1 - bx0, w) * 0.34, my = Math.min(by1 - by0, h) * 0.34;
  view.tx = Math.max(mx - bx1, Math.min(w - mx - bx0, view.tx || 0));
  view.ty = Math.max(my - by1, Math.min(h - my - by0, view.ty || 0));
  return view;
}

/* Zoom by `factor` about a point in canvas pixels, keeping whatever is under
   that point under it. `px`/`py` null means the centre of the canvas, which
   is what the +/− buttons and the keyboard want. */
function zoomTheaterAt(view, th, w, h, factor, px, py) {
  const k0 = view.k > 0 ? view.k : 1;
  const k1 = Math.max(THEATER_ZOOM[0], Math.min(THEATER_ZOOM[1], k0 * factor));
  if (px == null) { px = w / 2; py = h / 2; }
  const bx = (px - (view.tx || 0)) / k0, by = (py - (view.ty || 0)) / k0;
  view.k = k1; view.tx = px - bx * k1; view.ty = py - by * k1;
  return clampTheaterView(view, th, w, h);
}

function resetTheaterView(view) { view.k = 1; view.tx = 0; view.ty = 0; return view; }

/* Every colour below is read from MAPTHEME (declared in map.js, which is
   loaded before this file), so this map re-themes with the tactical one and
   nothing here carries a hex. The token set is read once per theme, not once
   per shape; see the note on the service itself. */
const MT = () => (typeof MAPTHEME !== 'undefined' ? MAPTHEME : window.MAPTHEME);

/* HOW FAR THE PAGE AROUND THIS MAP REACHES IN OVER IT.

   Standing alone, nothing floats over this canvas and every number below is
   measured from the canvas edge, which is correct. Docked into the design,
   this map IS the page and a column of floating panels runs down each side of
   it: the scale bar in the bottom-right corner, the graticule ticks along the
   top and left edges and the area-of-responsibility caption were all being
   drawn behind those panels, which is a scale bar an operator cannot read and
   a graticule they cannot use. mapInsets() is declared in map.js — loaded
   before this file, as MAPTHEME is — and returns zeroes when nothing is
   published, so the standalone console is untouched. */
const TINS = () => (typeof mapInsets === 'function' ? mapInsets() : { l: 0, r: 0, t: 0, b: 0 });

function drawTheater(cv, th, view) {
  /* The GPU theatre map (js/theater3d.js) draws the same combatant command on
     deck.gl, in the same visual language as the tactical map, and when it is
     up it hides this canvas. Redrawing underneath it would cost a full
     hand-drawn map every frame for a picture nobody can see. One early return
     is also the whole of the fallback: the module clears this flag the moment
     it withdraws, and the next frame is drawn here again with no other change
     anywhere. */
  if (window.__ANGEL_T3D && window.__ANGEL_T3D.live()) return;
  /* The globe (js/theater3d.js) is a fourth scale above this one and it mounts
     into the same stage. The same one early return is the whole of the
     handover in that direction too: when it withdraws, the next frame is
     drawn here again with no other change anywhere. */
  if (window.__ANGEL_GLOBE && window.__ANGEL_GLOBE.active()) return;
  const { ctx, w, h } = fitCanvas(cv);
  if (!(w > 8 && h > 8)) return;
  if (view) clampTheaterView(view, th, w, h);
  const P = theaterProjector(th, w, h, 34, view);
  cv._tproj = P; cv._th = th; cv._tw = w; cv._th_h = h;
  /* The label-space table is per FRAME, and this map is a frame of its own.
     It is reset here as well as in drawMap because an operator can sit on the
     theatre view for ten minutes without the tactical map ever drawing, and
     a table that is only ever appended to is a leak. */
  LBOX = [];
  const IN = TINS();
  try { window.__MAP_CHROME = []; } catch (e) { /* contained */ }
  if (typeof claimHostChrome === 'function') claimHostChrome(w, h);
  const G = GEO[th.key] || { coast: [], border: [] };

  /* ---- ocean ---------------------------------------------------------- */
  const T = MT();
  /* THE SEA IS A GROUND, NOT A SECOND TONE. It used to run from a third of
     the way to --m-grid down to --m-halo, which put the top of the frame
     close enough in value to the land that the coastline had almost no work
     to do. Both ends are pulled down; the land is lifted to meet it below,
     and the coast stroke is what separates them. Same three changes as the
     GPU theatre map makes, in the same token contract, so the two renderers
     cannot disagree about what a theatre looks like. */
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, T.mix('m-sea', 'm-grid', 0.18));
  g.addColorStop(1, T.mix('m-sea', 'm-halo', 0.62));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  /* ---- graticule ------------------------------------------------------ */
  ctx.save();
  ctx.strokeStyle = T.rgba('m-grid', 0.55); ctx.lineWidth = 1;
  ctx.font = '9px ui-monospace,monospace';
  const gratInk = T.hex('t-lo');
  const stepLon = (th.lon1 - th.lon0) > 60 ? 10 : 5;
  const stepLat = (th.lat1 - th.lat0) > 50 ? 10 : 5;
  for (let lon = Math.ceil(th.lon0 / stepLon) * stepLon; lon <= th.lon1; lon += stepLon) {
    const x = P.X(lon);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    ctx.textAlign = 'center';
    if (x > IN.l + 12 && x < w - IN.r - 12)
      haloText(ctx, Math.abs(lon) + (lon < 0 ? '°W' : '°E'), x, IN.t + 12, gratInk, 3);
  }
  for (let lat = Math.ceil(th.lat0 / stepLat) * stepLat; lat <= th.lat1; lat += stepLat) {
    const y = P.Y(lat);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    ctx.textAlign = 'left';
    if (y > IN.t + 12 && y < h - IN.b - 6)
      haloText(ctx, Math.abs(lat) + (lat < 0 ? '°S' : '°N'), IN.l + 4, y - 3, gratInk, 3);
  }
  // the equator, if it crosses
  if (th.lat0 < 0 && th.lat1 > 0) {
    const y = P.Y(0);
    ctx.setLineDash([8, 6]); ctx.strokeStyle = T.rgba('m-ao', 0.3); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'right';
    haloText(ctx, 'EQUATOR', w - IN.r - 8, y - 4, T.hex('t-lo'), 3);
  }
  ctx.restore();

  /* ---- landmasses ----------------------------------------------------- */
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  /* Runs are flat [lon,lat,lon,lat,…] arrays — half the bytes of nested pairs. */
  for (const run of G.coast) {
    if (run.length < 6) continue;
    ctx.beginPath();
    for (let i = 0; i < run.length; i += 2) {
      const x = P.X(run[i]), y = P.Y(run[i + 1]);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = T.mix('m-land', 't-dim', 0.30, 0.97); ctx.fill();
    ctx.strokeStyle = T.mix('m-sea', 't-hi', 0.70, 0.94); ctx.lineWidth = 1.3; ctx.stroke();
  }
  /* INTERNATIONAL BOUNDARIES, AT A CONTRAST SOMEBODY CAN SEE. The data was
     always drawn; --amb at 0.32 over this water simply is not a line. Full
     strength over the sea tone, a little heavier, and a longer dash so it
     reads as political rather than as a physical edge. */
  ctx.setLineDash([6, 4.5]);
  ctx.strokeStyle = T.mix('m-sea', 'amb', 0.74, 0.9); ctx.lineWidth = 1.2;
  for (const run of G.border) {
    if (run.length < 4) continue;
    ctx.beginPath();
    for (let i = 0; i < run.length; i += 2) {
      const x = P.X(run[i]), y = P.Y(run[i + 1]);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  /* ---- everything outside the command's boundary is masked ------------ */
  const bx0 = P.X(th.lon0), bx1 = P.X(th.lon1), by0 = P.Y(th.lat1), by1 = P.Y(th.lat0);
  ctx.save();
  ctx.fillStyle = T.rgba('m-halo', 0.78);
  ctx.beginPath(); ctx.rect(0, 0, w, h);
  ctx.rect(bx0, by0, bx1 - bx0, by1 - by0);
  ctx.fill('evenodd');
  /* The same translucent blue field the tactical map lays over its area of
     operations, at this scale over the whole area of responsibility. One
     visual grammar for "this is the ground you are responsible for", drawn
     once here and once there. */
  ctx.fillStyle = T.rgba('blue-d', 0.19);
  ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
  ctx.setLineDash([12, 7]);
  ctx.strokeStyle = T.rgba('m-ao', 0.42); ctx.lineWidth = 1.3;
  ctx.strokeRect(bx0, by0, bx1 - bx0, by1 - by0);
  ctx.setLineDash([]);
  ctx.font = 'bold 9px ui-monospace,monospace'; ctx.textAlign = 'left';
  /* Anchored to the corner of the area of responsibility, but never left
     under a panel: it is the one caption that says what the whole rectangle
     is. */
  const aorX = Math.max(IN.l + 7, Math.min(bx0 + 7, w - IN.r - 210));
  const aorY = Math.max(IN.t + 12, by0 - 7);
  if (typeof noteChrome === 'function') noteChrome(aorX, aorY - 10, 210, 13, 'area of responsibility caption');
  haloText(ctx, th.name + ' AREA OF RESPONSIBILITY', aorX, aorY, T.rgba('m-ao', 0.92), 3);
  ctx.restore();

  /* ---- place names ----------------------------------------------------
     THE NAMES GIVE WAY TO THE OPERATIONS, NOT THE OTHER WAY ROUND. This block
     used to print straight onto the map with nothing claimed and nothing
     checked, so a sea name could be laid through an operation's own figures —
     the exact fault the GPU theatre map's placement pass exists to prevent.
     Now the ground every operation symbol and its two lines of figures will
     occupy is claimed FIRST, out of the same table the tactical map uses
     (LBOX, in js/map.js, already primed above with the host's panel columns),
     and each name is then laid into the first free rung of a short ladder or
     dropped. An unreadable label is worse than no label.

     WHICH NAMES ARE OFFERED AT ALL is a question about how much ground is on
     the screen. All of them at rest; the smaller states drop out as the
     operator closes in, and the last of them fade at about three hundred
     kilometres across, which is the scale at which the tactical sheet is the
     right picture and a country name over a brigade sector is furniture. Same
     ladder and the same numbers as js/theater3d.js, so the two renderers of
     this one map agree about what is worth naming. */
  const kmAcross = w * 111.32 / P.s;
  const geoRank = kmAcross > 1500 ? 3 : kmAcross > 700 ? 2 : kmAcross > 300 ? 1 : 0;
  const geoFade = kmAcross > 700 ? 1 : kmAcross > 460 ? 0.78 : kmAcross > 300 ? 0.5 : 0;

  /* The operations' own ground, claimed before a single name is placed. The
     symbol is 30 by 20 with a readiness pip on its corner, the name sits one
     row above it and the figures two rows below; this covers all of it with a
     little air around the edge. */
  for (const joa of th.joas) {
    LBOX.push({ x: P.X(joa.lon) - 30, y: P.Y(joa.lat) - 30, w: 60, h: 74 });
  }
  if (th.hq) LBOX.push({ x: P.X(th.hq.lon) - 16, y: P.Y(th.hq.lat) - 26, w: 152, h: 38 });

  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  /* On the place, then a row up or down, then sideways — a sea name that has
     slid along its own coast is still naming the same water, where one pushed
     two rows down is naming the land below it. */
  const GEO_RUNGS = [[0, 0], [0, -15], [0, 15], [0, -30], [58, 0], [-58, 0], [58, -15], [-58, 15]];
  if (geoRank > 0) for (const L of (GEO_LABELS[th.key] || [])) {
    if (L.r > geoRank) continue;
    const x = P.X(L.lon), y = P.Y(L.lat);
    if (x < -40 || x > w + 40 || y < -20 || y > h + 20) continue;
    const size = L.r === 1 ? 13 : L.r === 2 ? 11 : 9.5;
    ctx.font = (L.kind === 'sea' ? 'italic ' : 'bold ') + size + 'px ui-monospace,monospace';
    const txt = L.kind === 'sea' ? L.t.split('').join(' ') : L.t;
    const tw = ctx.measureText(txt).width + 8, tht = size + 7;
    let px = null, py = null;
    for (const [dx, dy] of GEO_RUNGS) {
      const cx = x + dx, cy = y + dy;
      if (cx - tw / 2 < -14 || cx + tw / 2 > w + 14) continue;
      if (claim(cx - tw / 2, cy - tht / 2, tw, tht)) { px = cx; py = cy; break; }
    }
    if (px == null) continue;
    /* Full strength, faded only by the scale ladder above. The halo already
       guarantees the contrast against whatever is underneath, so there is
       nothing a transparency could buy here except a fainter label. */
    const ink = L.kind === 'sea' ? T.rgba('t-lo', geoFade)
              : L.kind === 'axis' ? T.rgba('org', geoFade)
              : T.rgba('t-mid', geoFade);
    haloText(ctx, txt, px, py, ink, 3.5);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.restore();

  /* ---- combatant command HQ ------------------------------------------- */
  if (th.hq) {
    const x = P.X(th.hq.lon), y = P.Y(th.hq.lat);
    ctx.save();
    ctx.strokeStyle = T.rgba('cyan', 0.9); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10); ctx.stroke();
    chipAt(ctx, x - 14, y - 16, th.hq.t, T.hex('t-hi'), T.hex('m-halo'), 8.5, 'right');
    ctx.restore();
  }

  /* ---- joint operations areas ----------------------------------------- */
  const now = performance.now();
  cv._hits = [];
  for (const joa of th.joas) {
    const x = P.X(joa.lon), y = P.Y(joa.lat);
    const st = joaStatus(joa.key);
    const active = st.active;
    const col = st.level === 'BLACK' || st.level === 'RED' ? T.hex('red')
              : st.level === 'AMBER' ? T.hex('amb') : T.hex('grn');
    cv._hits.push({ joa, x, y, r: 26 });

    // engagement footprint — a JOA is genuinely this small at theater scale
    ctx.save();
    const rr0 = 15;
    const grd = ctx.createRadialGradient(x, y, 2, x, y, rr0 * 2.4);
    grd.addColorStop(0, active ? T.rgba('grn', 0.20) : T.rgba('blue', 0.10));
    grd.addColorStop(1, T.rgba('blue', 0.005));
    ctx.beginPath(); ctx.arc(x, y, rr0 * 2.4, 0, 7); ctx.fillStyle = grd; ctx.fill();

    // live pulse on whichever JOA is being simulated
    if (active) {
      const ph = (now / 1600) % 1;
      ctx.beginPath(); ctx.arc(x, y, rr0 + ph * 26, 0, 7);
      ctx.strokeStyle = T.rgba('grn', 0.42 * (1 - ph)); ctx.lineWidth = 2; ctx.stroke();
    }

    // the box: a friendly unit symbol
    ctx.beginPath();
    rr(ctx, x - 15, y - 10, 30, 20, 3);
    ctx.fillStyle = active ? T.mix('m-halo', 'grn-d', 0.5, 0.96) : T.hex('m-halo');
    ctx.fill();
    ctx.strokeStyle = active ? T.hex('grn') : T.rgba('slate', 0.6);
    ctx.lineWidth = active ? 2.2 : 1.4; ctx.stroke();
    // X of an infantry-type symbol
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 10); ctx.lineTo(x + 15, y + 10);
    ctx.moveTo(x + 15, y - 10); ctx.lineTo(x - 15, y + 10);
    ctx.strokeStyle = active ? T.rgba('grn', 0.55) : T.rgba('slate', 0.32);
    ctx.lineWidth = 1.2; ctx.stroke();

    // readiness pip
    ctx.beginPath(); ctx.arc(x + 15, y - 10, 4.5, 0, 7);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = T.rgba('m-halo', 0.9); ctx.lineWidth = 1.2; ctx.stroke();

    // labels
    ctx.font = 'bold 10px ui-monospace,monospace'; ctx.textAlign = 'center';
    haloText(ctx, joa.name, x, y - 16, active ? T.hex('grn') : T.hex('t-hi'), 3.2);

    const sub = `${st.casualties} CAS · ${st.open} DOWN · ${st.level}`;
    ctx.font = '8.5px ui-monospace,monospace';
    haloText(ctx, sub, x, y + 24, col, 3.2);

    if (active) {
      ctx.font = 'bold 8px ui-monospace,monospace';
      haloText(ctx, '◉ LIVE — ANGEL SWARM TASKING', x, y + 35, T.hex('grn'), 3);
    }
    ctx.restore();
  }

  /* ---- hovered JOA highlight ------------------------------------------ */
  if (UI.theaterHover) {
    const hit = cv._hits.find(k => k.joa.key === UI.theaterHover);
    if (hit) {
      ctx.beginPath(); ctx.arc(hit.x, hit.y, 30, 0, 7);
      ctx.strokeStyle = MT().rgba('t-hi', 0.6); ctx.lineWidth = 1.6; ctx.stroke();
    }
  }

  /* ---- scale bar ------------------------------------------------------ */
  ctx.save();
  const kmPerDeg = 111.32;
  const px1000 = (1000 / kmPerDeg) * P.kx * P.s;
  ctx.strokeStyle = MT().rgba('t-mid', 0.8); ctx.lineWidth = 1.6;
  const bx = Math.max(IN.l + 12, w - IN.r - px1000 - 26), byy = h - IN.b - 20;
  if (typeof noteChrome === 'function') noteChrome(bx - 4, byy - 22, px1000 + 8, 30, 'theatre scale bar');
  ctx.beginPath();
  ctx.moveTo(bx, byy); ctx.lineTo(bx + px1000, byy);
  ctx.moveTo(bx, byy - 5); ctx.lineTo(bx, byy + 5);
  ctx.moveTo(bx + px1000, byy - 5); ctx.lineTo(bx + px1000, byy + 5);
  ctx.stroke();
  ctx.font = '9px ui-monospace,monospace';
  ctx.textAlign = 'center';
  haloText(ctx, '1 000 km', bx + px1000 / 2, byy - 9, MT().hex('t-mid'), 3);
  ctx.restore();
}

/* Hit test: which JOA is under the cursor. */
function theaterHit(cv, px, py) {
  if (!cv._hits) return null;
  let best = null, bd = 34;
  for (const k of cv._hits) {
    const d = Math.hypot(px - k.x, py - k.y);
    if (d < bd) { bd = d; best = k.joa; }
  }
  return best;
}
