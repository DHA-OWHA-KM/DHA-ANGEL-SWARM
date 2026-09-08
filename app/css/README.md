# `app/css/` — the stylesheets

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

Fourteen sheets. The load order is declared by hand in each shell and is load-bearing: `theme.css` first so the tokens resolve, `polish.css` after the shell sheet, `scale.css` last — that being the only position from which a cross-cutting spacing pass actually lands. Colour is not introduced here file by file: `theme.css` and `design.css` own it, and every other sheet reads their custom properties.

| File | What it does |
|---|---|
| `theme.css` | The single source of colour: one token contract declared four times, once per theme, selected by `body[data-theme]`. Deaths are never green and triage colour stays doctrinal. |
| `design.css` | The design system extracted verbatim from the Claude Design canvas — colour in oklch, type, spacing, component shape — and the only place a new colour or type size may be introduced. |
| `app.css` | The console shell: layout, panes, cards, tables, the command bar and the rail, with a floor of custom properties for a document that has lost its theme attribute. |
| `fonts.css` | Declares IBM Plex Sans, IBM Plex Mono and Barlow Condensed as local `@font-face` rules against `../fonts/`, replacing the canvas's `fonts.googleapis.com` link so the first paint issues no off-origin request. |
| `polish.css` | The cross-cutting pass loaded third: repairs shell layout at densities the original design never reached and reconciles separately authored panes onto the host's idiom. |
| `scale.css` | Loaded last. Turns spacing into a scale rather than a per-pane setting, verified with `getComputedStyle` rather than by reading the source. |
| `pages-a.css` | Live Casualties, Decision and Decision Feed, resolving every colour to a `design.css` token and applying the death class wherever a figure counts the dead. |
| `pages-b.css` | Analyst Terminal, Ops Centre Wall, Evidence and Ask ANGEL — the four destinations that dock a real subsystem rather than redraw it — plus the geometry that dock needs. |
| `page-map.css` | Geometry only for the Theatre Map destination, giving the docked pane a real box. It declares no colour of its own. |
| `detail.css` | The record accordion: the region that opens beneath its row at the full width of the main column. |
| `aar.css` | Layout for the after-action briefing — the figures, the short findings, and the disclosures that stay shut by default. |
| `theater.css` | The theatre map's pan and zoom furniture and the operation picker on the JOA crumb; both are chrome that had no styling because neither existed before. |
| `data2.css` | The analytical console, injected by `js/data2.js`. The largest type on the pane goes to the row count and the elapsed milliseconds, because that is the claim being made. |
| `prov.css` | Placement rules for the provenance and AI-attribution marks, so a mark sits beside its label and never over a figure. |
