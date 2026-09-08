# `design/` — the design canvases

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

The Design Canvases the console's visual language was extracted from, kept for provenance along with the three JavaScript files they need to open standalone. These are design artefacts, not the application: `app/` is what runs, and the two canvas-era JavaScript files here have both been superseded by the versions under `app/`.

A `.dc.html` file is a canvas document — an `<x-dc>` template plus a `text/x-dc` script — parsed and rendered by the design runtime in `support.js`. Each one links IBM Plex and Barlow Condensed from `fonts.googleapis.com`; the application does not, which is what `app/css/fonts.css` exists to fix.

| File | What it is |
|---|---|
| `ANGEL_SWARM.dc.html` | The original canvas, 618 lines: the nine destinations, the rail, the command bar and the `isCas` / `isDec` / `isFeed` blocks that `app/css/design.css` and the page modules were built from. |
| `ANGEL_SWARM-v2.dc.html` | The larger second canvas, 3,122 lines, carrying the expanded screen set. |
| `Homepage_Directions.dc.html` | The homepage direction studies, 701 lines, in canvas mode with its own type ramp. |
| `support.js` | The Design Canvas runtime — generated from `dc-runtime/src/*.ts`, not hand-edited. Byte-identical to `app/support.js`, so the canvases open on their own. |
| `angel-engine.js` | The canvas-era engine: a small self-contained deterministic run model with its own PRNG, platform table and `buildRun()` / `snapshot()`. Superseded by `app/angel-engine.js`, which computes nothing itself and reads the shipped engine's ledgers instead; this copy is kept only so the canvases still render. |
| `theater-map.js` | The canvas-era GPU map, drawing WebGL2 geometry through a perspective camera over CartoDB raster tiles. Superseded and not shipped: the application's maps are `app/js/theater.js`, `map.js`, `geo3d.js` and `theater3d.js`, and none of them fetches a tile. |
