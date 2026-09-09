---
name: Globe-to-Theatre handoff
description: The non-obvious renderer contract that prevents blank, black, or partially painted frames during map-scale transitions.
---

The Globe-to-Theatre transition must retain the outgoing Globe’s last painted surface, without animation or interaction, until Theatre confirms that its GPU layers are loaded and a usable frame has painted. The fallback Theatre canvas remains available until that same live signal.

**Why:** Removing the Globe first exposes an empty or partially initialized Theatre pane. Masking the whole embedded map with a separate black overlay hides the symptom but introduces another visible transition and can conceal a healthy fallback.

**How to apply:** Treat the host bridge, GPU renderer, and canvas fallback as one coordinated contract. The host requests a retained Globe surface; Theatre removes it only after loaded layers paint, or immediately on withdrawal/failure; the canvas fallback yields only when Theatre is live, not merely mounted.