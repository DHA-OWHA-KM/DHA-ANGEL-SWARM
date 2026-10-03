# `Videos/` — standalone copies of the film

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

The final film, two high-quality cuts and the white-glove promo, kept here under names that say what they are, for downloading and for showing on their own. **This folder is a convenience copy and nothing reads it.** The application plays its own from `app/video/`, by relative path, and the WebM/VP9 fallbacks live only there.

## ⚠ The final film is NOT in a ZIP download

`Angel Swarm-final-09-09-2026.mp4` is the one file in this repository tracked by **Git LFS**, and **GitHub's “Download ZIP” does not resolve LFS objects.** A ZIP gives you a **134-byte text pointer** carrying the real filename — the right name, roughly 134 KB shown in some listings, and it will not play. Every other file in this folder is a normal Git object and comes through a ZIP intact.

**Check before you need it.** The real file is **134,603,824 bytes (~134 MB)**. If yours is a few hundred bytes, it is the pointer.

Two ways to get the real thing:

- **Direct download** — [Angel Swarm-final-09-09-2026.mp4 (134 MB)](https://github.com/DHA-OWHA-KM/DHA-ANGEL-SWARM/raw/main/Videos/Angel%20Swarm-final-09-09-2026.mp4). Resolves to `media.githubusercontent.com` and serves the real MP4. No Git required.
- **Clone with LFS** — install [Git LFS](https://git-lfs.com), then `git lfs install` once, then `git clone https://github.com/DHA-OWHA-KM/DHA-ANGEL-SWARM.git`. A clone made *before* LFS was installed can be repaired in place with `git lfs pull`.

If you are about to present, this is worth confirming first: the placeholder looks like a real file in a folder listing and only reveals itself when a player refuses to open it.

| File | What it is |
|---|---|
| `Angel Swarm-final-09-09-2026.mp4` | **The final film, and the one to show.** 134,603,824 bytes (~134 MB), H.264 MP4. **Git LFS — absent from ZIP downloads; see the warning above.** |
| `ANGEL-SWARM-film-full-3m15s.mp4` | The full film: 3 min 15 s (195 s), 18,506,785 bytes (~18 MB). H.264, 1920 × 1080, 30 fps, silent — the file carries a video stream and no audio stream. The whole argument end to end. |
| `ANGEL-SWARM-film-short-60s.mp4` | The sixty-second cut: 60 s exactly, 6,631,789 bytes (~6.6 MB). H.264, 1920 × 1080, 30 fps, silent. |
| `ANGEL-SWARM-white-glove-promo-60s.mp4` | The white-glove promo: 60.06 s, 45,964,390 bytes (~44 MB). H.264, 1920 × 1080, 59.94 fps, **with an AAC audio track** — the only file in this folder that carries sound. Re-encoded from a 134,612,623-byte (~128 MB) master at 17.8 Mbps, which exceeds GitHub's 100 MB per-file limit and could not be committed as delivered. Two-pass x264 at 6.1 Mbps; duration, resolution and frame rate are unchanged. The master is not in this repository. |

The two film cuts are byte-identical to the corresponding MP4s in `app/video/` — `ANGEL-SWARM-film-full-3m15s.mp4` matches `ANGEL-SWARM-film-v3-HQ.mp4`, and `ANGEL-SWARM-film-short-60s.mp4` matches `ANGEL-SWARM-film-60s-HQ.mp4`, in each case on the same SHA. The promo has no counterpart in `app/video/`; nothing loads it.

**Do not move the files in `app/video/`.** `app/index.html` names them by relative path in its `<source>` elements, and the WebM fallbacks that sit beside them have no copy anywhere else. Deleting or renaming this folder costs nothing; doing the same to `app/video/` breaks the film pane in the running application. See [`../app/video/README.md`](../app/video/README.md).
