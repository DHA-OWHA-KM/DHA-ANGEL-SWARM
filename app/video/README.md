# `app/video/` — the film, as the application loads it

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

These four files are what the film pane loads, by relative path, from `app/index.html`. The `<video>` elements name `./video/ANGEL-SWARM-film-60s-HQ.mp4` and `./video/ANGEL-SWARM-film-v3-HQ.mp4` with the matching WebM as the second `<source>`, so the paths and the filenames are part of the application. **Move or rename anything in this folder and the film pane breaks** — it will show a player with nothing in it, on the Authority & Policy destination, which is a screen a reviewer is likely to open.

Two cuts ship, each as an H.264 MP4 at 1920 × 1080, 30 fps, with a VP9 WebM at 1280 × 720 as the fallback. All four are silent: each file carries a single video stream and no audio stream at all.

| File | What it is |
|---|---|
| `ANGEL-SWARM-film-v3-HQ.mp4` | The full film, 3 min 15 s (195 s), 18,506,785 bytes. H.264, 1920 × 1080, 30 fps, silent. The cut the pane loads when the full film is selected. |
| `ANGEL-SWARM-film-v3-720.webm` | The same full film as VP9 at 1280 × 720, 3,220,709 bytes, silent. The fallback source for browsers that will not take the MP4. |
| `ANGEL-SWARM-film-60s-HQ.mp4` | The sixty-second cut, 6,631,789 bytes. H.264, 1920 × 1080, 30 fps, silent. The default the pane opens on. |
| `ANGEL-SWARM-film-60s-720.webm` | The same short cut as VP9 at 1280 × 720, 1,163,403 bytes, silent. |

Standalone copies for download live in [`/Videos/`](../../Videos/) under clearer names. The two MP4s there are byte-identical to the two here — same SHA — but the WebM fallbacks exist only in this folder, and it is this folder the application reads.

A third path to the same material exists and is worth knowing about: `js/film_inline.js` re-renders the film frame by frame in the page rather than decoding a video file, for viewers whose sandbox blocks media outright. That renderer needs nothing in this folder; the `<video>` panes do.
