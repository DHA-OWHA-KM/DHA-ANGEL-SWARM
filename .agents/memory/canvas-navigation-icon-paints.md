---
name: Canvas navigation icon paints
description: Rendering constraints for navigation SVG colors in the served Design Canvas application.
---

Verify navigation color changes in the served `app/` surface, not only in a component mockup. For inline navigation SVGs rendered by the Design Canvas runtime, use explicit palette paint values rather than CSS custom properties.

**Why:** A mockup-only change did not affect the user-facing application, and SVG paint attributes using theme custom properties rendered the icon invisible in the live canvas.

**How to apply:** When changing a navigation icon color, update the user-facing canvas markup and any live shell renderer, then visually inspect fresh desktop and mobile captures of the served root application.