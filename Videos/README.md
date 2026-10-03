# `Videos/` — standalone copies of the film

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

**`Angel Swarm-final-09-09-2026.mp4` is the final film. It is the file to show.** Everything else in this folder is an earlier cut or a superseded draft, kept for reference. **This folder is a convenience copy and nothing reads it.** The application plays its own from `app/video/`, by relative path, and the WebM/VP9 fallbacks live only there.

## ⚠ The final film is NOT in a ZIP download

`Angel Swarm-final-09-09-2026.mp4` is the one file in this repository tracked by **Git LFS**, and **GitHub's “Download ZIP” does not resolve LFS objects.** A ZIP gives you a **134-byte text pointer** carrying the real filename — the right name, roughly 134 KB shown in some listings, and it will not play. Every other file in this folder is a normal Git object and comes through a ZIP intact.

**Check before you need it.** The real file is **134,603,824 bytes (~134 MB)**. If yours is a few hundred bytes, it is the pointer.

To be certain, check the hash — it is listed in [`../CHECKSUMS-REPO.txt`](../CHECKSUMS-REPO.txt):

```
SHA-256  c1615768a03380ebd7303e027cf781cbc999b815604afdf8d7dc10c49f9cf32e
```

```powershell
Get-FileHash -Algorithm SHA256 '.\Videos\Angel Swarm-final-09-09-2026.mp4'
```

The pointer file carries that same hash as its `oid` line, so reading the first line of a suspect file tells you at a glance: if it begins `version https://git-lfs.github.com/spec/v1`, it is the placeholder and not the film.

Two ways to get the real thing:

- **Direct download** — [Angel Swarm-final-09-09-2026.mp4 (134 MB)](https://github.com/DHA-OWHA-KM/DHA-ANGEL-SWARM/raw/main/Videos/Angel%20Swarm-final-09-09-2026.mp4). Resolves to `media.githubusercontent.com` and serves the real MP4. No Git required.
- **Clone with LFS** — install [Git LFS](https://git-lfs.com), then `git lfs install` once, then `git clone https://github.com/DHA-OWHA-KM/DHA-ANGEL-SWARM.git`. A clone made *before* LFS was installed can be repaired in place with `git lfs pull`.

If you are about to present, this is worth confirming first: the placeholder looks like a real file in a folder listing and only reveals itself when a player refuses to open it.

| File | What it is |
|---|---|
| `Angel Swarm-final-09-09-2026.mp4` | **The final film, and the one to show.** 134,603,824 bytes (~134 MB), H.264 MP4. **Git LFS — absent from ZIP downloads; see the warning above.** |
| `ANGEL-SWARM-film-full-3m15s.mp4` | The full film: 3 min 15 s (195 s), 18,506,785 bytes (~18 MB). H.264, 1920 × 1080, 30 fps, silent — the file carries a video stream and no audio stream. The whole argument end to end. |
| `ANGEL-SWARM-film-short-60s.mp4` | The sixty-second cut: 60 s exactly, 6,631,789 bytes (~6.6 MB). H.264, 1920 × 1080, 30 fps, silent. |
| `ANGEL-SWARM-white-glove-promo-60s.mp4` | **An earlier draft. Superseded — do not show it.** It is not a smaller copy of the final and is not a substitute for it. 60.06 s, 45,964,390 bytes (~44 MB). H.264, 1920 × 1080, 59.94 fps, with an AAC audio track. Kept for reference only. |

The two film cuts are byte-identical to the corresponding MP4s in `app/video/` — `ANGEL-SWARM-film-full-3m15s.mp4` matches `ANGEL-SWARM-film-v3-HQ.mp4`, and `ANGEL-SWARM-film-short-60s.mp4` matches `ANGEL-SWARM-film-60s-HQ.mp4`, in each case on the same SHA. Neither the final film nor the promo has a counterpart in `app/video/`; nothing in the application loads either of them.

**Do not move the files in `app/video/`.** `app/index.html` names them by relative path in its `<source>` elements, and the WebM fallbacks that sit beside them have no copy anywhere else. Deleting or renaming this folder costs nothing; doing the same to `app/video/` breaks the film pane in the running application. See [`../app/video/README.md`](../app/video/README.md).
