---
name: Map layout emphasis
description: Visual-state rule for Tactical 2D map layout controls.
---

Side-by-side comparison is the only map layout that receives highlighted treatment. Single-map mode is the neutral baseline and its control remains dark.

**Why:** Highlighting Single made the control read like an enabled feature toggle instead of communicating whether comparison mode was active.

**How to apply:** Keep every mirrored map-layout control synchronized from comparison state, and clear all map-layout highlights when returning to Single.