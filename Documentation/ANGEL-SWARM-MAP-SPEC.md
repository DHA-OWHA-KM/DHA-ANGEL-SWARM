# ANGEL SWARM — Theater Map

**Design specification for the map destination.** Everything needed to draw it.

Companion to `ANGEL-SWARM-DESIGN-SPEC.md` · Version 1.3 · 8 September 2026 · **current as of v6.4**

Every measurement in this document was taken off the shipped build. Where a
figure is illustrative rather than asserted, it says so.

**What changed in v6.4, and where.** The globe's geography was regenerated
four times finer (§6.2), its rotation was fixed in three places (§6.5), and
the zoom now hands down to the operation under the camera rather than to the
loaded one (§6.4.1). The route-stage strip **no longer opens by itself** — it is
a detail view opened by a click (§10). Nested panel scrollers were collapsed to
one per column (§2, §11). And the two engines behind this page were wired
together in both directions (§17). Every one of those changed a claim this
document previously made.

---

## 0. Read this first — what you are actually drawing

The map destination is **one page frame containing four interchangeable map surfaces**, plus chrome that changes with whichever surface is showing. The fourth — the **globe** — was added in v6.3, regenerated at four times the geographic detail in v6.4, and sits above the theatre.

In the running product, the map surface is a live renderer: a canvas that redraws every frame with real aircraft moving across it. **In a design canvas you cannot run that.** So draw the surface as a convincing static picture using the symbology in §6–§9, and treat that rectangle as a placeholder the engineer replaces with the live renderer.

**The part that actually needs designing is the chrome** — the scope switch, the tool row, the side panel, the figure row and the states. That is where every previous attempt failed. The map surface itself already exists and works.

Three separate things are easy to confuse:

| | |
|---|---|
| **The surface** | The live picture. Already built. You are drawing a stand-in. |
| **The chrome** | Everything around it. **This is the design work.** |
| **The switch** | Which of the four surfaces is showing, and what that changes |

---

## 1. What the destination is

The same fight at four scales. One picture, four renderers.

| Scale | Chip label | What it shows | Why an operator goes there |
|---|---|---|---|
| **Globe** | `GLOBE` | The planet, both combatant commands on it, spun by hand | "Where in the world is this, and how far apart are these fights?" |
| **Theatre** | `THEATRE` | The whole combatant command — every operation in PACOM, not just this one | "What else is happening, and is this the worst of it?" |
| **Tactical** | `TACTICAL 2D` | This operation's ground, flat, top-down | "Where is everyone, who is going to be missed" |
| **Tactical 3D** | `TACTICAL 3D` | The same ground on the GPU, with terrain and time | The showpiece — for a room, and for time-as-height |

They are not zoom levels of one map. They are four different renderers with four different cameras, four different symbol sets, and four different capability sets. **The chrome must change when the scale changes.**

**The one continuity between them is deliberate.** Zoom in past a combatant command's own extent on the globe and it does not stop: the last of the gesture is flown for the operator — an animated 1,100 ms flight — and the view is handed to the tactical scale at about the same ground width the tactical sheet opens on, so the two pictures meet at the same scale across the cut. That flight is the only navigation in this destination that happens without a click.

**It flies to the operation under the camera, not to the loaded one.** Through v6.3 the handoff read the loaded scenario and never consulted the camera, so every zoom anywhere on the planet arrived at JOA CORAL. §6.4 states the rule that replaced it, including what it does over open ocean, which is to decline.

---

## 2. Page anatomy

Top to bottom inside the main column (the 250px navigation rail is to the left, unchanged):

```
┌──────────────────────────────────────────────────────────────────────┐
│  1  PAGE HEADER      title · one-line subtitle · right-side meta     │
├──────────────────────────────────────────────────────────────────────┤
│  2  SCOPE SWITCH  [GLOBE][THEATRE][TACTICAL 2D][TACTICAL 3D] TOOLS → │
├──────────────────────────────────────────────────────────────────────┤
│  3  COMPARISON LINE  23 ANGEL SWARM ▍34 CURRENT — TRIAGE & PROXIMITY │
├──────────────────────────────────────────────────────────────────────┤
│  4  SCALE NOTE       one line: what this scale does and does not do   │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─ L PANELS ─┐                                    ┌─ R PANELS ─┐    │
│  │ floating   │        5  THE MAP SURFACE          │ floating   │    │
│  │ over the   │                                    │ over the   │    │
│  │ picture    │   ┌── 6  ROUTE-STAGE STRIP ──┐     │ picture    │    │
│  └────────────┘   └─ tactical only · on a click ┘  └────────────┘    │
├──────────────────────────────────────────────────────────────────────┤
│  7  FIGURE ROW       five tiles across the full width                │
└──────────────────────────────────────────────────────────────────────┘
```

**Measurements.** Page padding 22px. Gap 14px. Figure row gap 12px, top margin 16px.

**Box 6 is absent on arrival.** The route-stage strip is a detail view opened by
clicking a casualty or an aircraft — see §10.0. Every layout in this document is
correct with it and without it, and the one without it is what the operator
lands on.

**The side panels float over the picture; they are not a column beside it.** The map is the full width of the content area and the panel columns are laid on top of its left and right edges. This is why the renderers cannot simply paint against the canvas rectangle: the host publishes `MAP_INSET_L/R/T/B` (mirrored as `--map-inset-*`) for the whole map, and **all four renderers lay their painted chrome out inside those insets**. A chip that cannot find clear ground is dropped rather than printed under a panel.

**Panel geometry is driven by the measured map width, not the window:**

| Measured map width | Layout |
|---|---|
| ≥ 1340 px | two columns, each `clamp(256, (RW × 0.40 − 36) / 2, 304)` |
| ≥ 900 px | one column, `clamp(240, RW × 0.26, 292)` |
| < 900 px, or viewport height < 700 px | one column of folded headers, 236 px |

`fig` and `rec` open on arrival; `lay` and `run` are folded one click away. **A panel the operator moves or opens is never re-arranged again that session.**

**One scrollbar per column, and never a sideways one.** The column is the only
box on this page that knows how much room there actually is, so it is the only
box that scrolls. Panel bodies are drawn at their natural height and scroll
nothing. `overflow-x` is pinned `hidden` on both columns — a box given
`overflow-y: auto` with no `overflow-x` of its own has `overflow-x` computed to
`auto` as well, which is how three nested scrollers each grew a horizontal bar
the moment a vertical one took its fifteen pixels. See §11.

---

## 3. The scope switch

Four chips, segmented, left-aligned under the header, in scale order: `GLOBE` `THEATRE` `TACTICAL 2D` `TACTICAL 3D`.

- **Selected**: background `oklch(0.30 0.05 165)`, text `oklch(0.95 0.02 165)`
- **Unselected**: background `oklch(0.22 0.012 250)`, text `oklch(0.74 0.008 250)`
- Type: `600 10px 'IBM Plex Mono'`, letter-spacing `.08em`, padding `6px 11px`, radius 4px, gap 6px

**A chip with no machine under it is not drawn.** On a machine without a usable GPU the tactical 3D renderer withdraws and its chip is **removed**, not disabled — three chips, not four greyed to three. The globe chip is offered only when the globe module is present. Design the reduced sets.

Switching scale preserves the selection: if a casualty is selected on the flat map and the operator switches to 3D, the same casualty stays selected.

---

## 4. The tool row — the rule that matters most

Right-aligned on the same line as the scope switch.

**A control that cannot act at the current scale is not drawn.** Not drawn disabled, not drawn faded — absent. This is the single most-repeated failure in this product's history: controls that were visible and did nothing.

| Control | Globe | Theatre | Tactical 2D | Tactical 3D |
|---|:--:|:--:|:--:|:--:|
| **− ZOOM OUT** | ● | ● | ● | ● |
| **+ ZOOM IN** | ● | ● | ● | ● |
| **FIT** | ● | ● | ● | ● |
| **LAYER PANEL** | — | — | ● | ● |
| **DRAW / HIDE ALL LAYERS** | — | — | ● | ● |
| **SIDE BY SIDE** | — | — | ● | — |
| | 3 controls | 3 controls | 6 controls | 5 controls |

**Why each absence is correct, and say so on screen:**

- The globe and the theatre picture **draw no layers** — there is nothing to filter — and each shows **one arm only**, so there is no second picture to compare against.
- The GPU map has its own layer set but **no second arm**, so side-by-side is meaningless there.

The scale note under the row states this in one line, e.g.

> *The combatant command and every operation inside it. This picture draws no layers and carries one arm, so the layer panel and the side-by-side comparison are not offered here.* — right-aligned: `3 CONTROLS IN THIS SCALE`

Tool button style: `600 10px 'IBM Plex Mono'`, padding `7px 12px`, radius 4px, border `1px solid oklch(0.34 0.012 250)`, text `oklch(0.85 0.006 250)`; on hover border `oklch(0.44 0.02 250)`, text `oklch(0.96 0.005 250)`.

**Layer panel and side-by-side carry state** — light them when on. Zoom and fit do not.

---

## 5. The layer panel

Opens as a floating card **over the bottom-left of the map surface**, not as a sidebar. Background `oklch(0.20 0.012 250)` at 95% opacity, border `1px solid oklch(0.30 0.012 250)`, radius 5px, padding 12px 14px, max-width 452px.

Header row: `MAP LAYERS` in `700 10px mono`, letter-spacing `.1em`, with a hint `filter what is drawn` in `oklch(0.60 0.008 250)`, and a collapse control at the right.

Each layer is a toggle: a small colour swatch, the layer name, and an on/off state. Two different layer sets:

**Flat tactical map — 9 layers**

| Layer | Swatch | Draws |
|---|---|---|
| Reserve holding | blue | Casualties whose physiological reserve is steady |
| Reserve falling | amber | Casualties deteriorating |
| Reserve critical | red | Casualties nearly out of time |
| Treated | green | Casualties reached in time |
| Dead | grey ✕ | Casualties who died |
| High-value | amber chevrons | Commander-designated casualties |
| Aircraft | cyan | ANGEL SWARM airframes |
| Routes | cyan | Tasked route lines |
| Launch points | white | Bases and their reach rings |

**GPU map — 9 layers**

`Real geography` · `Sector terrain` · `Route arcs` · `Aircraft trails` · `Casualties` · `Time columns` · `Threat envelopes` · `Sectors & units` · `Labels`

**DRAW / HIDE ALL LAYERS** is a single toggle: if anything is off, turn everything on; if everything is on, turn everything off and show bare terrain.

---

## 6. Surface one — the globe

**Added v6.3; its geography, its rotation and its handoff all rebuilt in v6.4.** The planet, drawn in **canvas 2D** in an orthographic projection, with both combatant commands on it.

### 6.1 What it is not, and why that matters

**It is not deck.gl and it is not WebGL.** deck.gl's `GlobeView` is not in this application's vendored bundle: `app/vendor/deck/deck.min.js` is a tree-shaken build with exactly **twelve exports** — `Deck`, `MapView` and ten layers — and `GlobeView` is not among them. The two surviving occurrences of the string are an internal warning message and the `displayName` of a viewport class that is not exported. The globe shaders are in the file; nothing that can reach them is.

Rebuilding the vendor bundle would have put the two GPU views that already work into the blast radius of a new feature days before the brief. Shipping a second bundle would have added 750 kB. So the globe is drawn in canvas 2D, and that turned out to be the better trade for three further reasons:

- **It holds no GPU context.** The application already holds two WebGL2 contexts and has been through the work of giving them back. A third is exactly the pressure that gets one of the other two evicted on a laptop with switchable graphics.
- **It cannot lose a context it does not have.** The silent-context-loss failure the tactical renderers had to be hardened against in v6.1 does not exist here. The equivalent recovery ladder is still built, against the two failures that *do* exist: a throw inside the frame loop, and a mount that never paints.
- **It draws the same on every machine.** There is no driver to disagree with.

**Do not describe this surface as a deck.gl globe or a WebGL globe in any material.**

### 6.2 Where its geography comes from

World coastlines and international boundaries at **Natural Earth 1:50m**,
generalised offline with the same Douglas–Peucker tool that produced
`data/basemap.json`, from the same `world-atlas` package, and **embedded in
`app/js/theater3d.js` as integer deltas in hundredths of a degree**.

**The v6.3 generalisation was far too aggressive and had to be redone.** Coast
was cut at 0.18° and boundaries at 0.22° — twenty and twenty-four kilometres —
and quantised on a grid of *tenths* of a degree, which is 11 km. That is half a
pixel at the whole-earth camera, but **4.8 pixels at the deepest camera this
scale reaches before it hands down**, so it visibly stair-stepped exactly where
a viewer looks closest. It defeated the reason the scale exists, which was that
a commander could not pick a country out of the flat theatre picture.

**Regenerated at 0.025° for coast and 0.035° for boundaries** — 2.8 and 3.9 km
— on a grid of **hundredths of a degree** (1.1 km, under half a pixel at every
camera this scale allows). Longitude is scaled by each ring's own mid-latitude
cosine, so the tolerance is a **ground distance rather than a coordinate one**
and a high-latitude ring is not thinned harder than a tropical one.

| | v6.3 | v6.4 |
|---|---:|---:|
| Coast rings / vertices | 279 / 6,495 | **1,380 / 28,735** |
| Boundary runs / vertices | 187 / 1,740 | **174 / 5,681** |
| Total vertices | 8,235 | **34,416** (4.18×) |
| Embedded bytes | 46,744 | **223,486** |

*Counted by parsing the two array literals straight out of the shipped
`app/js/theater3d.js`, which is now 443,996 bytes.*

**What that buys, in things a viewer can name.** Japan reads as Honshu,
Shikoku, Kyushu, Hokkaido and the Ryukyus; the Philippines resolve into Luzon,
Mindoro, Panay, Negros, Cebu, Palawan and Mindanao; Italy has a boot, Sicily,
Sardinia and Corsica; Indonesia has Sumatra, Java, Bali, the Lesser Sundas and
Sulawesi's four arms.

**No new asset. No new HTTP resource. Still zero off-origin requests** —
measured across the whole destination, all four scales, at 1680×1050 and
1280×800. Four times the geography did not add a file, because it was never a
file: it is source text inside a module that already ships.

The application's own theatre geography (`js/geo.js`) is clipped to the two combatant commands and covers roughly a fifth of the sphere; on a globe that would leave three quarters of the planet blank ocean, which is why the world outline is a separate embedded set. Both areas of responsibility and the application's own boundaries are drawn over it where they apply.

### 6.3 What it draws, back to front

1. **Atmosphere** — a radial falloff outside the limb
2. **Ocean** — a radial gradient lit off-centre so the sphere reads as a sphere: shelf tone at the light point, mid at 0.55, abyss at the limb
3. **Land** — filled coastline paths, even-odd, so lakes and inland seas cut through
4. **Graticule** — step 30° / 15° / 5° / 2° by ground width, with the **equator carried at its own weight** because it is the one line on a globe every reader already knows
5. **International boundaries** — dashed, at full strength, dash length stepping with closeness
6. **Areas of responsibility** — PACOM and EUCOM, dashed, in the application's own AOR colour
7. **Operations** — every JOA from `THEATERS` at its true longitude and latitude, coloured by `joaStatus`, with a ground-radius footprint circle drawn on the sphere; the live one pulses
8. **Day/night terminator** — a great circle, therefore an ellipse under orthographic projection, computed **from the exercise clock, not the wall clock**, with the subsolar longitude printed in the attribution block
9. **Labels and the selection tooltip**

**Attribution block, bottom right, three lines:**

```
COAST + BORDERS NATURAL EARTH 1:50M
TERMINATOR FROM THE EXERCISE CLOCK · SUBSOLAR 97°E
NO TILE SERVER · NO NETWORK
```

**Scale bar** reads `1 000 KM AT THE CENTRE` — the qualifier is required, because scale on an orthographic projection is only true at the centre of the disc.

### 6.4 Interaction

| Gesture | Effect |
|---|---|
| Drag | Spin. Longitude wraps; latitude clamps at ±85° |
| Scroll | Zoom, continuous from the whole earth down to a combatant command |
| Click an operation | `selectJoa()` — the same contract both theatre renderers use, so the operations list, the picker and the rest of the dashboard need no knowledge that the renderer changed |
| Double-click | Reset the camera |
| Zoom past 0.55 × the width of **the command that owns the target operation** | **The handoff.** An 1,100 ms flight, ending at roughly 350 km across — within a few per cent of what the tactical sheet opens on — and then the application is put on the tactical scale |
| Idle for 3.5 s, pulled all the way out | The globe turns by itself, clocked rather than counted — see §6.5 |

The stage's own `− ZOOM OUT / + ZOOM IN / FIT` pad drives this camera as well as the other three, so one press moves whichever renderer is on screen.

### 6.4.1 Which operation the zoom hands to — draw this rule, because it is the one an operator will test

**Through v6.3 the answer was always JOA CORAL.** The handoff took the
combatant command the *application had loaded*, then the operation the *loaded
scenario* names inside it, and flew there. Neither term had anything to do with
where the camera was pointing. And the host's callback was written to take only
the scale to switch to, so it discarded the operation the globe passed it —
two independent bugs, either of which alone was enough. **Both ends are fixed.**

The rule, in the order it is applied:

| | |
|---|---|
| **1 · An explicit selection wins outright** | Select BASALT, zoom, and BASALT opens, even where CORAL is nearer the middle of the frame. Choosing one is what choosing means |
| **2 · Otherwise, the nearest operation by great-circle distance to the camera centre** | Within `max(2,600 km, half the frame width)`. The bar widens as the camera pulls out, because at the whole earth the centre of the frame is a coarse statement of intent and at a command it is a precise one |
| **3 · Otherwise it declines** | Over open ocean nothing is guessed. The zoom is **clamped** — held, not snapped back, so the operator's own scroll is not undone under their hand — and the picture says **`NO OPERATION UNDER THIS ZOOM — SPIN OR PICK ONE`** |

**A selection the operator has spun away from is dropped**, on drag and on the
arrow keys and on nothing else — never on the idle spin, because a camera
quietly discarding a choice the operator made while nobody was touching it
would be a worse surprise than the bug this replaces. That is what keeps rules
1 and 2 from ever contradicting each other: at the moment a zoom resolves,
either there is a selection and it is in shot, or there is no selection.

**Draw the declined state.** It is a real screen: a globe over empty water, the
zoom held at its floor, and one caption saying why nothing happened.

### 6.5 The rotation, and why it is worth a paragraph in a design document

An animation that reads as choppy reads as *cheap*, and this one was choppy for
three reasons that were all measured rather than guessed. It matters to a
designer because two of the three fixes are invisible in a still frame and the
third changes what the picture is allowed to contain.

- **The spin was counted in frames, not clocked.** A fixed 0.055° per frame
  against a `requestAnimationFrame` interval whose standard deviation was 8.1 ms
  gave an angular-velocity coefficient of variation of **0.356**. The picture
  was drawn correctly and moved unevenly. It is integrated against elapsed time
  now, with `dt` clamped so a backgrounded tab cannot return with the earth spun
  a quarter turn: **CV 0.356 → 0.120**.
- **The redraw gate quantised the camera in degrees, not pixels.** A sixtieth of
  a degree is a third of a pixel at the whole earth and five thousandths of a
  degree per pixel of drag at depth, so at a command three drag frames in four
  were dropped as "no change". Half-pixel buckets instead: driving the camera
  exactly one pixel per frame, the old gate repainted **58%** of frames at a
  1,094 km camera and the new one repaints **99%**. At the whole earth both
  repaint 99%, so the fix costs nothing where the old one already worked.
- **The dominant per-frame cost was a redundant call.** `ctx.closePath()` is
  O(total path size) in Blink: **853 calls cost 23.2 ms of a 25 ms frame**. A
  filled path closes its own subpaths, so the call was always unnecessary.
  Removing it took the same loop to **0.9 ms**.

Alongside that: the geometry is decoded **once** into unit vectors, so the
projection is three dot products with no trigonometry per vertex; every ring
carries a bounding cap and is culled on the horizon, on sub-pixel size and off
canvas; and screen-space decimation runs at 1.2 px against a 1.4 px pen. **Path
building went 2.91 ms → 2.58 ms while carrying 4.18× the geometry.**

**The trade, stated rather than hidden.** Under SwiftShader — a software
rasteriser, so these are the pessimistic numbers — the frame interval still
went 27.9 ms (35.9 fps) to 35.6 ms (28.1 fps). That is Skia rasterising a
denser coastline **stroke** off-thread, which the draw timer cannot see;
isolated by suppressing the stroke (23 → 46 fps) against suppressing the fill
(23 → 25). On GPU raster it is negligible. Eight frames per second bought four
times the geography, taken deliberately.

### 6.6 The scale note for this surface

> *The same command on a real sphere — the coastline and international-boundary data this application ships, wrapped onto a globe rather than laid flat, so a theatre that spans a third of the planet is read without the distortion a flat projection puts on it. Drag to spin, scroll to zoom, and click an operation to select it in the list beside the map. No tile server and no network.* — right-aligned: `3 CONTROLS IN THIS SCALE`

---

## 7. Surface two — the theatre picture

A wide-area chart of the combatant command. Cool, dark, cartographic. Not a game map. Drawn by deck.gl (`js/theater3d.js`) with a canvas fallback (`js/theater.js`) that is silently switched to if WebGL2 is absent, if the bundle will not load, or if anything throws.

**NORTH-UP AND FLAT IS THE DEFAULT.** This map used to open at 40° of pitch. That made a hero shot and a bad chart: a rectangle of ocean drawn as a parallelogram, Japan and the Philippines sheared out of the shapes every reader already knows, and a scale that means something different at the top of the frame from the bottom. **The oblique camera is kept as an `OBLIQUE` toggle in the bottom-right chrome** — it is genuinely better at standing the operation columns up where the eye can compare them — but it is a control the operator presses, not the state they arrive in. The preference is remembered per browser.

**Ground, back to front:**

1. **Ocean** — flat dark field, `oklch(0.14 0.012 250)`
2. **Graticule** — whole-degree lines, very low contrast, `oklch(0.22 0.01 250)`
3. **Landmasses** — filled coastlines in a muted olive-grey, slightly lighter than the ocean, with a 1px lighter edge. Real coastlines: Japan, Korea, China, the Philippines, Indonesia, Australia's north.
4. **International boundaries — dashed, and at full strength.** They were previously mixed from the graticule colour at alpha 120 over water of nearly the same value, so on a live screen you could not tell one state from its neighbour; and they were *solid*, which is the convention for a physical line — a coast, a river, a shelf edge — so even where they were visible they said the wrong thing about what they were. They are now full-strength over the sea tone and dashed. The dash is a **ground length, not a screen length**, cut into the geometry across three zoom bands (deck.gl's `PathStyleExtension` is not in the vendored bundle), each band chosen so the dash lands between roughly four and fourteen screen pixels. The walk runs once per theatre per band and is memoised on the band, so panning and small zoom steps never touch it.
5. **Outside the command's boundary** — masked back with a dark wash, so PACOM reads as the subject
6. **Inside the boundary** — a translucent blue field, the same one the tactical map lays over its area of operations
7. **Place names — and there must be some.** Nothing on this map used to be named, which is why it did not read as a map. The names were there — twenty-four in the Pacific, nineteen in Europe — and two things kept them off the screen: every third-rank name, which is every country, was thrown away whenever the whole command was in view, which is the only view most operators ever see it in; and what survived was drawn at alpha 180 over a sheet of nearly the same value.

   Both are fixed. The rank ladder now **sheds names as the view closes in past the scale they are for**, which is the direction that makes sense, and the ink is full strength. Roughly fifteen names a theatre survive the placement pass at rest.

   | Rank | What it is | Size |
   |---|---|---|
   | 1 | An ocean or a continent | 12.5 px |
   | 2 | A marginal sea or a major state | 11 px |
   | 3 | A state whose name only earns its room once the reader is inside the command | 9.8 px |

   **Sea names are letter-spaced** — the oldest convention on any chart, and the reason a reader tells water from land without reading a word of it: `P A C I F I C   O C E A N`, `S O U T H   C H I N A   S E A`, `C O R A L   S E A`. Land names are not: `CHINA`, `JAPAN`, `RUSSIA`, `VIETNAM`, `PHILIPPINES`, `INDONESIA`, `AUSTRALIA`, `GUAM`.

   **Every label on this map is struck in the halo colour before it is filled** — signed-distance-field glyphs, outline width 3.2 — plate or no plate, so a label's contrast stops being a function of what happens to be under it. The geography deliberately carries no opaque plate: a plate behind every sea name is not a map.

**The command badge** — top left, a card reading `PACOM` large with `Indo-Pacific` beside it.

**Each operation (JOA)** is a NATO-style friendly unit symbol:

- A **rounded rectangle 30 × 20px**, radius 3
- An **X across it** corner to corner — the infantry-type symbol
- A **readiness pip**, a 4.5px filled circle on the top-right corner of the box: green, amber or red
- **Name above** in `bold 10px mono`, with a halo so it reads over any ground
- **Status line below** in `8.5px mono`: `56 CAS · 41 DOWN · BLACK`
- A **soft radial footprint** behind it — an engagement area, green-tinted when live, blue when not
- The **live operation** additionally has an expanding pulse ring and a line beneath: `◉ LIVE — ANGEL SWARM TASKING`

**Colour rule:** the pip and the status line take the operation's condition — **BLACK or RED → red**, **AMBER → amber**, otherwise green. The box itself is green-edged when live, slate when not.

**Bottom-right corner:** a scale bar reading `1 000 km`, a north arrow, and an attribution block:

```
COAST + BORDERS NATURAL EARTH
1:50M
RELIEF IS SHADING, NOT ELEVATION
```

**Bottom-left corner:** an instruction card — *Click an operation to open it. Drag to pan · scroll to zoom · double-click to fit.*

---

## 8. Surface three — the flat tactical map

The operation's own ground, top-down, roughly 92 × 118 km.

**Ground:** the same dark field with a fine grid. The area of operations is a translucent blue polygon. Terrain is shading, not elevation.

**Casualties** — a filled dot, 3.6px, 4.6px when deteriorating, with a 1.2px halo ring:

| State | Colour | Extra |
|---|---|---|
| Reserve holding | blue | dot only |
| Reserve falling | amber | **a countdown arc** around the dot — a ring that depletes clockwise as reserve falls |
| Reserve critical | red | the arc, plus a **pulsing outer ring** at 14px |
| Treated | green | filled circle with a **tick** drawn inside |
| Died | grey | an **✕**, no fill |

Additional marks:

- **Dashed ring, 11px** — coverage warning. Red when **no** launch point can reach this casualty; blue when only one can. This says the laydown, not the tasking, is what stands between them and a delivery.
- **Four amber chevrons** radiating from the dot — commander-designated high-value casualty, with a role chip beside it
- **A red chip** beside any critical casualty reading e.g. `17 MIN`

**Aircraft** — a small directional airframe glyph in cyan, heading-aligned, with a callsign chip: `TRV` (heavy), `M25` (light), `FVR` (long-range). A tasked aircraft draws its **route line** to its objective in cyan; the return leg is dimmer.

**Launch points** — a white square with a label, and a **reach ring** showing how far the fastest airframe there can fly carrying a unit of whole blood and get home. The rings are the most important object on this map: where they do not overlap a casualty, no tasking can help.

**Site callouts** — the map labels **sites**, not every soldier: the site name, the count on the ground, and how many of those deaths were survivable.

**Side by side** splits the surface into two synchronised panels — ANGEL SWARM tasking on the left in cyan, current triage and proximity on the right in slate — same casualties, same minute. This is the money shot and it belongs only here.

---

## 9. Surface four — the tactical GPU map

The same fight, rendered with terrain and depth.

- Camera is pitched and can be rotated. Right-drag orbits; the native context menu is suppressed **on the map canvas only**, so a right-click on the navigation rail still opens the browser's menu
- **Terrain** as real shaded relief, not a grid
- **Route arcs** rise off the ground between launch point and casualty — height carries distance
- **Aircraft trails** are ribbons that fade behind moving airframes
- **Time columns** — vertical spikes at casualty positions whose height is time remaining. This is the thing this renderer exists for: a field of columns, the short ones about to run out.
- **Threat envelopes** as translucent domes
- **Sectors and units** as outlined areas with labels

Chrome inside the surface, drawn by the renderer itself:

- **Top left:** the scenario name, grid zone, position, extent, theatre
- **Top right:** live counters — dead, open, treated
- **Left column:** `WHAT IS ON THE MAP`, a legend, and `TRIAGE CLASS · TINT OF THE C-nn CHIP` with swatches for IMM / DEL / MIN / EXP. This is the panel the LAYER PANEL control folds.
- **Bottom:** a transport bar — play, a clock, a scrub track with fill and playhead, death and MASCAL ticks, and a rate control (`1× 2× 4× 10× 30×`). **It drives the host by pressing the application's own transport button**, located in the header strip by its label (`PLAY` / `PAUSE` / `RESUME`), because `window.ANGELMAP` is a one-way channel: the page calls `M.sync(t, deployed)` and reads `M.figures()` back, and there is no way for the map to set `running` or `t` on the host. That button's label *is* the run state, so no second run state is kept and the two cannot disagree. This is a DOM coupling rather than a published API: if the top bar's transport ever moves, the bar falls back to playing the recorded replay locally rather than breaking. **Seeking moves the replay only** — there is no host seek entry point to press

**Comms degraded:** a banner reading `SATCOM DENIED — HOLDING LAST-KNOWN-GOOD PLAN, AIRCRAFT STILL FLYING`, with a red wash over the picture. In CORAL the denial window opens at **T+88 and lasts 12 minutes**; the label is the scenario's own. On the flat map's control-arm pane the second clause reads `NO VOICE DISPATCH POSSIBLE` instead, because that is what the difference between the arms costs under denial. The aircraft keep moving. That is the point.

**The banner must clear the host's chrome.** It is positioned from a published `COMMS_BANNER_OFFSET` that the host measures off its own floating header card — 108 px at 1680, 124 px at 1280 — rather than from a hardcoded top. It was drawn *under* the header card for the whole twelve-minute window in two earlier builds; on the GPU map it is a DOM element rather than painted canvas, and fixing the painted one did not fix it.

**Context loss is handled, and it is the failure that took this renderer down on real laptops.** A browser drops a WebGL context on its own — switchable graphics changing adapters, a driver reset, eviction under process-wide pressure — and it does so *silently*: no throw, no console error, `active()` still true, and the pane simply goes to a flat pale rectangle for the rest of the session. On loss the canvas theatre takes the picture back inside the same event, one automatic remount is attempted after 900 ms, and a second loss keeps the canvas map for the session and says so. A 20-second "mounted but never painted" watchdog takes the same path.

---

## 10. The route-stage strip

**Added v6.3. Made click-to-open in v6.4. Drawn on the two tactical scales only** — the globe and the theatre are command-wide pictures and one sortie's stops are not at their scale.

### 10.0 IT IS CLOSED UNTIL SOMEBODY ASKS FOR IT — this is the change most likely to be demonstrated

**Read this before drawing anything else in this section.** Through v6.3 the
strip **defaulted to a sortie**: the most recent one still airborne while the
run played, and the most recent completed one at the horizon. So a cold arrival
at the tactical scale was met by a route nobody had asked about, six columns
wide across the foot of the picture, reading `20 OF 20 · SORTIE TRV-02 ·
COMPLETE` — a true statement about an arbitrary aircraft, which is exactly the
kind of thing that makes an operator distrust the rest of the screen.

**It is a detail view and it now behaves like one.** The default arrival state
of both tactical scales is **no strip at all**. Verified on the shipped build at
1680×1050: arriving on `TACTICAL 2D` from the navigation rail, the strip's own
slot is not in the document.

**Exactly two clicks open it**, both on the picture itself, and both read off
the application's own selection rather than re-hit-tested by the strip:

| Click | What opens |
|---|---|
| **A casualty** on a tactical picture | The sortie that carried something **to that casualty** |
| **An aircraft or a sortie** | That airframe's **most recent** sortie |

Nothing else opens it. Once open, the header arrows step through every sortie
exactly as they always did.

**Two ways out, and they are the obvious two:** the **✕** on its own header, and
**Escape**. Escape is taken only on the map page, only while the strip is open,
and only while the guided walkthrough and all three sheets are closed — so the
sheets and the walkthrough keep the key exactly as they had it. **The dismissal
is remembered against the selection that opened it**, so it stays shut until
something different is picked.

**A casualty no sortie ever reached draws no strip.** There is no sortie status
to show, and the record panel is what acknowledges that click. Likewise a
selection naming a sortie the engine has not flown *yet* — a casualty whose
aircraft launches two minutes from now — draws nothing rather than a
substitute, and picks itself up on the render after that sortie exists.

**There is no default and an empty box is never one of the answers.**

**Draw the closed state as a state.** On a design canvas the tactical scales
have two arrivals worth drawing: without the strip, which is what the operator
lands on, and with it, which is what one click produces.

A route line on the picture says where an aircraft went. It cannot say what the aircraft was *for*. This says it: every casualty on a chained run, what each was given, and how much of their own deadline was left when it arrived.

**It floats over the bottom of the picture, centred in the gap between the two panel columns.** Its left and right edges are taken from the **measured** width of those columns every render, so a column that folds, empties, grows a scrollbar or hits its max-width moves the strip with it. Its bottom clears the band each renderer keeps for itself — 113 px on the flat sheet for the area-of-operations block, 164 px on the GPU map for the transport bar and the scale/north/density stack above it — and clears the guided-walkthrough bar when that is up. It is a **sibling of the panel layer, not a child of the panel row**, so it changes no inset and moves no map label.

**Three stage states, and which one is *now* is the whole point:**

| State | Drawn as |
|---|---|
| **DONE** | The aircraft has been there. Full colour, three-quarter weight, the leg into it solid |
| **ACTIVE** | Where it is at this minute. Bigger glyph, a teal ring and glow, full brightness, a teal bar under the column, the leg into it in the ANGEL SWARM teal |
| **PENDING** | Not reached. Dashed glyph, half opacity, faint leg, and the time printed as an **ETA rather than a fact**. The planned margin is not printed at all — this application does not colour a slack figure it has not measured |

Once the run is closed there is no active stage and the whole route reads as history, which is what it is.

**Each column carries:** the stop kind (`LAUNCH` / `DELIVER` / `RECOVER`), the name (a launch point or a casualty id), the payload, and the margin. **The header row carries:** step arrows, `n OF m`, the sortie id and tasking minute, the state chip (`IN FLIGHT → CAS-074`, `COMPLETE`), and the arm.

**It is drawn only where there is genuinely room for it** — 150 px of clear
width between the two panel columns — and not on a command-wide scale. Below
that it is absent rather than cramped.

**Nothing in it is invented.** The route, its legs, their planned arrival and their payload key come off the engine's own sortie log through `angel-engine.js`; the administered minute comes off the delivery ledger; the deadline is the casualty's own. Every failure the engine models — a stop overtaken before the aircraft arrived, a payload the responder could not use, a leg never flown — is named rather than dropped.

**As the picture narrows** it drops stops from the middle and says so, then falls back to a single line, then disappears rather than overflowing.

---

## 11. The side panels

**Floating cards laid over the left and right edges of the picture, not a column beside it.** Width, column count and folded state come off the measured map width — see §2.

### 11.1 The scroll rule — one scroller per column, zero horizontal

**The panel bodies do not scroll. The column does.** Until v6.4 the legend body
and the record body each carried a measured max-height *and* their own
`overflow-y: auto`, inside a column that already had one. Three panels open on a
1366 therefore produced **three nested vertical scrollbars in a single column** —
and because a box with `overflow-y: auto` and no `overflow-x` of its own has its
`overflow-x` computed to `auto` as well, each of them could grow a **horizontal**
bar the moment a vertical one took its fifteen pixels. That is the whole defect:
nesting, plus a default nobody wrote down.

The nesting is collapsed to the outermost box that genuinely has to scroll — the
column. It is the only box that knows how much room there actually is, and at
1024 × 768 no arrangement of inner maxima makes four panels fit. `overflow-x` is
pinned `hidden` on both columns, so no horizontal bar can appear at all.

| | v6.3 | v6.4 |
|---|---:|---:|
| Vertical scrollers, worst case per column | 3 | **1** |
| Boxes capable of a horizontal bar | 4 | **0** |

*Measured across the four scales at six viewports.* Re-measured for this
revision at 1680×1050: **one vertical scroller on the globe and the theatre,
none on either tactical scale, and no horizontal page overflow at any of the
four.**

**Nothing about the legend's content changed** — the same rows, the same
single-line text, the same order. They are in fact one scrollbar's width
**wider** than they were, because only one bar is now taken out of the panel
instead of two.

**Design consequence.** Do not draw an inner scrollbar on a panel body. A stack
taller than the column is reached with the wheel.

### 11.2 The operations list scrolls the selected card into view

Selecting JOA MARINER used to leave its card half under the `RUN CONTROL` panel
with its own Select button unreachable. The reveal now computes the **visible
band** — the column's rectangle, less its padding, less anything that is
actually standing over its foot, such as the guided-walkthrough bar or the
route-stage strip — rather than asking the browser for `block: 'nearest'`, and
it aligns the **top** of a card taller than that band. The scroller is found by
walking up from the card itself, so the behaviour survives the panel being moved
to the other column.

Verified from **both** selection sources at 1440×900 and 1280×800 — the card's
own button and a click on the picture. Selecting MARINER from the map scrolls
the column 0 → 231, TIMBER → 425, and every card lands fully inside the
viewport.

### 11.3 Panel content

**Legend rows are one line.** Twenty-one rows used to print a name and then a sub-line restating it — `COLLAPSE IMMINENT` / *collapse imminent*, `COMMAND UAV` / *command UAV*. Twelve sub-lines were cut outright, eight trimmed to the part that added something, one kept. Group headings and counts are unchanged.

**On the globe and the theatre scale** — one card per operation, the live one first:

```
┌────────────────────────────────────────┐
│ JOA CORAL                        LIVE  │   ← name + state chip
│ 3d Marine Littoral Regiment (Rein)     │   ← the force
│ DECISIVE                     BLACK     │   ← role in the campaign + condition
│ 66 wounded           43 still down     │   ← two-column figures
│ 12 died of wounds    2/7 airborne      │   ← illustrative; read live
│ First island chain, distributed        │   ← one line of context
│ maritime operations across an          │
│ archipelago. Blue-water gaps no        │
│ ground vehicle can cross.              │
│ [ Open picture ]      [ Open → ]       │
└────────────────────────────────────────┘
```

The live operation's card carries a teal left edge or border; the others are neutral. `BLACK` and `RED` conditions render red.

**On either tactical scale** — the selected object's record, or, with nothing selected, a short *what am I looking at* card: the operation, the extent, the force, and the count on the ground.

---

## 12. The figure row

Five tiles across the bottom, the standard tile component.

| Tile | Content |
|---|---|
| **OPERATIONS** | `4` · in this command |
| **WOUNDED** | across the command |
| **STILL DOWN** | across the command |
| **DIED OF WOUNDS** | all categories — **RED TILE** |
| **AIRCRAFT COMMITTED** | of 28 in theatre |

**No figure in this table is asserted.** All five are read live off the run at the minute the screen draws, and they change with the clock and with the selected scenario. A design canvas may fill them with plausible values; a *document* may not quote them as results.

**DIED OF WOUNDS is two rows in one tile**, one per arm, each with its own arm spine and both counts at the same size. Since v6.2, an ANGEL SWARM figure never appears anywhere in this application without the CURRENT — TRIAGE & PROXIMITY figure beside it at the same size.

**The died-of-wounds tile is red** — red ground `oklch(0.22 0.035 25)`, red border `oklch(0.38 0.09 25)`, red figure `oklch(0.82 0.15 25)`. Never teal, never green. It is a count of dead soldiers, not a score.

On the tactical scales these become operation-scoped: casualties, still on the ground, in reach, **died of wounds** (red), aircraft airborne.

---

## 13. States — draw every one

| State | The surface | The chrome |
|---|---|---|
| **Cold start** — not deployed, clock at zero | Theatre picture drawn, operations shown at their reported condition | **The figure row must not read as a result.** No casualties on the tactical map — say *the clock has not started*, and offer the primary action |
| **Deployed, clock stopped** | Aircraft parked at launch points, reach rings drawn | *The force is ready. Start the clock.* |
| **Running** | Everything moving | Live |
| **Finished** | Final positions, all outcomes resolved | The figure row is now a result |
| **3D unavailable** | — | **Three chips, not four.** No greyed chip |
| **3D mounting** | Blank for several seconds | Say *building the terrain* — do not show an empty black box with no explanation |
| **GPU context lost** | The canvas theatre takes the picture back inside the same event | One silent remount at 900 ms; a second loss keeps the canvas map for the session **and says so** |
| **Comms denied** | The SATCOM DENIED banner clear of the header card, aircraft still flying | The posture indicator reads the link down |
| **Nothing selected** | Full picture | Side panel shows the *what am I looking at* card |
| **Globe handing down** | The flight runs to completion; the disc fades over the last third of it, at about 350 km across | The scale chip changes to `TACTICAL 2D` **after** the flight, not during it, **and the classification stamp moves with it** — see §17 |
| **Globe over open ocean, zoomed to the floor** | The zoom is held rather than snapped back | `NO OPERATION UNDER THIS ZOOM — SPIN OR PICK ONE`. Nothing is guessed and nothing navigates |
| **Arriving on a tactical scale** | The full picture | **No route-stage strip.** It is a detail view and opens on a click — see §10.0 |
| **A casualty no sortie ever reached is clicked** | The casualty's record fills the side panel | Still no strip. There is no sortie status to show, and the record panel is what acknowledges the click |
| **Nothing has launched yet** | — | The route-stage strip is not drawn at all rather than drawn empty |
| **Guided walkthrough running** | Unchanged — the walkthrough navigates between screens and renders nothing of its own | The route-stage strip lifts to clear the walkthrough bar, and the operations list treats it as part of the column's foot |
| **A column taller than the room** | Unchanged | **One** scrollbar, on the column. Never one inside a panel body, and never a horizontal one |

**Two things that were wrong in the last build and must not recur:**

1. The theatre scale claimed **"4 OPERATIONS in this command"** and **"WOUNDED 0 / STILL DOWN 0 / DIED 0"** on the same screen. Either the operations have casualties or there are none; both statements cannot be true.
2. A zero in a unit slot — `TIGHTEST DEADLINE 0 OPEN` — reads as a zero-minute deadline. An empty board says **no casualties yet**, never a zero where a measurement goes.

---

## 14. How to draw the surface in a design canvas

You cannot run the renderer, so build a static stand-in that reads correctly:

**For the globe** — an orthographic disc on a dark ground, a radial ocean gradient lit off-centre, filled land, a graticule with the equator heavier, dashed international boundaries, two dashed AOR outlines, four operation marks with footprint circles, the terminator as an ellipse crossing the disc, and the three-line attribution block. The scale bar reads `1 000 KM AT THE CENTRE`. **Draw the coastline at the detail the build now carries** — Japan as five named islands, the Philippines as seven, Indonesia's chain resolved — because a blocky outline is precisely the defect v6.4 existed to fix and a stand-in that reproduces it teaches the wrong picture.

**For the theatre picture** — this is the most drawable of the four. Real coastlines as filled paths, a faint graticule, the PACOM badge, four unit symbols with pips and status lines, the scale bar and attribution block. It will look very close to the real thing.

**For the flat tactical map** — a dark field with a fine grid, a translucent blue operating area, three launch-point squares with large reach rings, twenty or so casualty dots in the right proportions (mostly blue, several amber with countdown arcs, two or three red and pulsing, a few green ticks, one or two grey ✕), two cyan aircraft with route lines, and two site callouts.

**For the GPU map** — a pitched perspective, shaded terrain, a field of vertical columns of varying height, two or three rising arcs, and the left-hand legend card. Suggest depth; do not attempt photorealism.

Label the surface layer in the canvas `MAP SURFACE — LIVE RENDERER` so nobody mistakes the stand-in for the deliverable.

---

## 15. Rules specific to this destination

1. **A control that cannot act at this scale is not drawn.** Six on the flat map, five on the GPU map, three on the theatre picture, three on the globe.
2. **Say why a control is absent** — one line under the tool row, with a count.
3. **Each scale keeps its own camera.** Zoom on the theatre picture moves the theatre picture. It does not move the other three, and it does not navigate anywhere — with **one deliberate exception**, the globe's handoff at the bottom of its range, which is announced by an animated flight rather than a cut.
4. **A chip with no machine under it disappears.** Never a disabled chip.
5. **Every death figure is red, on both arms** — hue 25, without exception. Teal and orange are the arms' callsigns, not a verdict.
6. **Nothing is fetched. Zero off-origin requests, measured.** Coastlines, boundaries, terrain, relief, icon atlas and font atlas are all local or computed at runtime. There are no map tiles from a server, at any of the four scales — the attribution blocks say Natural Earth because the geometry ships inside the application, and the globe's own geometry is embedded in `js/theater3d.js` as **223,486 bytes of integer deltas in hundredths of a degree**.
7. **Relief is shading, not elevation, and the map says so on its own face.** There is no terrain dataset on this machine at theatre scale and none may be fetched; the land tint and hillshade are computed from distance to the coastline plus a seeded noise field. Every line that carries a claim — coastline, boundary, AOR, operation position — is real data drawn over the top of it.
8. **The surface is never empty without an explanation** — building, no casualties yet, renderer withheld, or context lost and recovered.
9. **Selection survives a scale change**, and it survives the globe's handoff.
10. **The globe is canvas 2D.** It is not deck.gl, it holds no GPU context, and no material describing this product may say otherwise.
11. **The route-stage strip opens on a click and on nothing else.** No default sortie, no empty box, and a ✕ and Escape that both work.
12. **One scrollbar per column, zero horizontal ones.** No panel body scrolls on its own.
13. **The zoom hands down to what is under the camera**, or it declines and says so. It never falls back to the loaded operation.
14. **The two engines behind this page stay in step.** Whichever one is moved, the other follows — see §17.

---

## 16. One-paragraph brief, if you only read one thing

*Theater Map is one page holding four interchangeable map surfaces — a canvas-2D orthographic globe carrying 34,416 vertices of world coastline and international boundary that ship inside the code rather than as a file, a north-up theatre chart of the whole combatant command with NATO unit symbols for each operation and named seas and states, a flat tactical map of this operation's ground with casualty dots that carry countdown arcs and launch-point reach rings, and a pitched GPU view where time remaining is drawn as vertical columns. A four-chip segmented switch selects the scale, and zooming past the bottom of the globe's range flies the rest of the way in and hands the view down to the tactical sheet — to the operation under the camera, or, over open ocean, to nothing, with a caption saying so. To the switch's right sits a tool row that changes with the scale — six controls on the flat map, five on the GPU map, three on each of the two command-wide pictures — where a control that cannot act at that scale is absent rather than disabled, and a single line beneath states why. Floating panel columns are laid over the left and right edges of the picture and every renderer paints inside the insets they publish; each column is the only box in it that scrolls, and never sideways. On the two tactical scales a route-stage strip can be opened along the bottom by clicking a casualty or an aircraft — it is closed until then — and shows that sortie's stops with the stage it is flying now highlighted. Five figure tiles run along the bottom; the died-of-wounds tile is red and carries both arms. Nothing is fetched from a network at any scale. The map surface itself is a live renderer in the built product — draw a convincing stand-in and design the chrome around it.*

---

## 17. Two engines, and why the theatre picker used to lie

**There are two simulation instances behind this page, and until v6.4 nothing
synchronised them in either direction.** It belongs in the map specification
because the map frame is one of the two, and because the symptom was on this
screen.

- The **design shell** reads `angel-engine.js`'s world. That is the
  classification stamp at the top right, the figure tiles, and every number on
  every destination that is not the map.
- The **map frame** — `app/angel-map.js` mounts ANGEL SWARM's own application in
  a same-origin frame — runs **its own instance**.

On the unmodified build, picking **JOA BASALT** on the Settings screen moved the
stamp to BASALT while the map underneath carried on drawing **CORAL**. Two
answers to *what is loaded* on one screen, which is the worst class of defect
this application can have.

**Both directions are wired now**, each as a single named function:

| Direction | Seam | What it does |
|---|---|---|
| **The map moves the shell** | `ANGEL_DESIGN.setScenario(key)` | Called after a globe handoff, so the stamp and every figure follow the picture down |
| **The shell moves the map** | `ANGELMAP.setScenario(key)` | Called when Settings changes the theatre; it drives the frame through `app.js`'s **original** `selectJoa`, captured at bind time, so the frame takes the path it would have taken had the operation been picked on the picture itself |

Both check the key against the engine's own scenario list rather than trusting
the caller, and **both are no-ops when the scenario asked for is already the
loaded one** — so they are idempotent by scenario key and cannot ping-pong.
Changing the scenario is the most expensive run setting in the application and
it behaves like one at both ends: the clock goes back to T+0 and stops, both
arms are rebuilt, and anything that named a casualty of the battle that just
went away is dropped.

**Design consequence.** There is no state on this page that can be true on one
half of the screen and false on the other. If a mock-up shows a classification
stamp and a map picture, they name the same operation. Always.
