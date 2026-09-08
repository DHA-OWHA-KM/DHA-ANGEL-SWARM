# `app/fonts/` — the vendored typefaces

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

Eleven woff2 files, subset to Latin, declared by `../css/fonts.css` as local `@font-face` rules. They are here for one reason: the design canvas links IBM Plex and Barlow Condensed from `fonts.googleapis.com`, and a webfont link would break the zero-off-origin-request claim on the first paint — in front of a reviewer, on a machine with the network pulled. Serving the same faces from the same loopback port keeps the measured off-origin count at zero.

## The open finding

**No licence file ships beside these fonts.** Eleven typefaces are vendored and redistributed here with no licence text, no `LICENSE` file, and no recorded acquisition source in this folder. That is a real gap and it is recorded as such: it is risk **R-6** in `Documentation/ANGEL-SWARM-SECURITY-AND-ATO.md` — *"the eleven vendored typefaces carry no licence evidence"* — rated Medium, with the remedy stated as obtaining them from a named source, vendoring the licence text beside them, and re-running the SBOM generator. The SBOM lists them as a single component with licence `NOASSERTION`.

Publishing this repository is redistribution, which is the act a font licence governs, so the finding is more pressing here than it was in a folder passed hand to hand. It is stated plainly rather than left to be discovered.

## What is here

| Family | Faces |
|---|---|
| IBM Plex Sans | `ibm-plex-sans-latin-400-normal.woff2`, `-500-`, `-600-`, `-700-` — the interface text face, four weights. |
| IBM Plex Mono | `ibm-plex-mono-latin-400-normal.woff2`, `-500-`, `-600-`, `-700-` — every figure, identifier, timestamp and code string in the application, four weights. |
| Barlow Condensed | `barlow-condensed-latin-500-normal.woff2`, `-600-`, `-700-` — the condensed display face used for headings and labels, three weights. |
