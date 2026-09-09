---
name: Browser checks after cold load
description: How to avoid false failures when browser-testing navigation into the map after a cold application load.
---

Do not treat the visible navigation rail as proof that destination-specific surfaces are ready. Browser checks that depend on the map frame should wait for map-owned content or the frame itself.

**Why:** The shell and rail paint before the engine's cold initialization finishes. A fast click can correctly change the destination and URL while the persistent map frame is still waiting for the ready render, which looks like a lifecycle failure if the check uses a short fixed delay.

**How to apply:** For cold browser runs, wait on destination-specific DOM state before asserting map identity or traversal behavior. Once ready, Back and Forward checks can use short waits on URL changes.