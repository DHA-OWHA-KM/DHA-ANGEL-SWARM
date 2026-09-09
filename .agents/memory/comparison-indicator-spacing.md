---
name: Comparison indicator spacing
description: Visual spacing and contour requirements for comparison pane labels.
---

Comparison pane labels must be visibly inset from the center seam and surrounding furniture. Any boxed or pill treatment needs a complete contour; do not remove an edge to simulate attachment to the map boundary.

At narrow or high-density map widths, fixed desktop label widths must step down and the longer arm name should wrap deliberately. A label that technically fits but consumes almost the entire pane still reads as an oversized banner.

**Why:** An edge-tab treatment with no top border and no center gutter looked clipped, corner-jammed, and unfinished. Its first rounded replacement still looked wrong at a narrow effective viewport because the desktop width occupied nearly the whole pane.

**How to apply:** Preserve clear top, center, and furniture gutters on the launch surface. Center text independently from decorative markers so markers cannot shift or squeeze it. Validate computed styles after the full stylesheet cascade, and version the host module, frame URL, and stylesheet together when changing embedded-map visuals so stale frame CSS cannot survive a refresh.