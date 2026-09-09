# `Videos/` — standalone copies of the film

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

Two high-quality cuts of the ANGEL SWARM film and the white-glove promo, kept here under names that say what they are, for downloading and for showing on their own. **This folder is a convenience copy and nothing reads it.** The application plays its own from `app/video/`, by relative path, and the WebM/VP9 fallbacks live only there.

| File | What it is |
|---|---|
| `ANGEL-SWARM-film-full-3m15s.mp4` | The full film: 3 min 15 s (195 s), 18,506,785 bytes (~18 MB). H.264, 1920 × 1080, 30 fps, silent — the file carries a video stream and no audio stream. The whole argument end to end. |
| `ANGEL-SWARM-film-short-60s.mp4` | The sixty-second cut: 60 s exactly, 6,631,789 bytes (~6.6 MB). H.264, 1920 × 1080, 30 fps, silent. |
| `ANGEL-SWARM-white-glove-promo-60s.mp4` | The white-glove promo: 60.06 s, 45,964,390 bytes (~44 MB). H.264, 1920 × 1080, 59.94 fps, **with an AAC audio track** — the only file in this folder that carries sound. Re-encoded from a 134,612,623-byte (~128 MB) master at 17.8 Mbps, which exceeds GitHub's 100 MB per-file limit and could not be committed as delivered. Two-pass x264 at 6.1 Mbps; duration, resolution and frame rate are unchanged. The master is not in this repository. |

The two film cuts are byte-identical to the corresponding MP4s in `app/video/` — `ANGEL-SWARM-film-full-3m15s.mp4` matches `ANGEL-SWARM-film-v3-HQ.mp4`, and `ANGEL-SWARM-film-short-60s.mp4` matches `ANGEL-SWARM-film-60s-HQ.mp4`, in each case on the same SHA. The promo has no counterpart in `app/video/`; nothing loads it.

**Do not move the files in `app/video/`.** `app/index.html` names them by relative path in its `<source>` elements, and the WebM fallbacks that sit beside them have no copy anywhere else. Deleting or renaming this folder costs nothing; doing the same to `app/video/` breaks the film pane in the running application. See [`../app/video/README.md`](../app/video/README.md).
