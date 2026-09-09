---
name: Embedded map controls
description: Where Theater Map controls and renderer state belong on the launch surface.
---

Validate Theater Map interface changes on the launch application, not only on the standalone console. Visible controls belong in the launch page's host chrome and must bridge state changes into the embedded renderer frame.

**Why:** The standalone console and launch surface can both look correct in isolation while a control inside the frame is clipped beneath the host header or covered by host furniture.

**How to apply:** For launch-facing map changes, test the theater-map destination with real pointer hit-testing. Keep duplicated frame chrome suppressed at the embedding boundary and verify host controls change the frame's live state.