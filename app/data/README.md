# `app/data/` — generated data

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

Two JSON files, both produced offline at build time and read from this folder at run time. Neither is fetched from anywhere, and both carry a `note` field stating their own provenance so a reader who opens the file rather than the documentation still gets the caveat.

| File | What it is |
|---|---|
| `basemap.json` | 330 KB of Natural Earth 1:50m coastlines, boundaries and labels, taken via world-atlas 2.0.2 (ISC) and converted offline by the build script; coordinates are `[lon, lat]` in degrees rounded to three decimal places. This is the geography behind the maps, and the file states in its own note that nothing here is fetched at run time. |
| `doctrine.json` | 448 KB: the 161-passage retrieval corpus with its 384-dimensional vectors precomputed by `train/export_minilm.py`, plus the list of publications the passages are drawn from — TCCC Guidelines, JTS Clinical Practice Guidelines, ATP 4-02.2, FM 4-02.1, JP 4-02 and the blood-handling guidance. Every passage is a paraphrase **written for this prototype**, not an extract of the publication, and the file says so in its own note. |
