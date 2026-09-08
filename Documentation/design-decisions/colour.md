# Colour — three palette options

`UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY`

Source: [`colour.html`](colour.html) · Render: [`colour.png`](colour.png)

## The question put up

Teal currently means four different things — ANGEL SWARM's identity, "good",
"confirmed", and every primary button — so it has no signalling power left.
And red means both "the dead" and "look here". The mockup states the problem
in those terms in its own standfirst:

> Same four cards, same real figures, three palettes. The problem being
> solved: **teal currently means four different things** — ANGEL SWARM's
> identity, "good", "confirmed", and every primary button — so it has no
> signalling power left. And **red means both "the dead" and "look here"**.

## What the mockup shows

![Three palette options against what ships today](colour.png)

Four blocks, top to bottom: the present state, then options A, B and C. Every
block repeats the same four KPI cards with the same real figures — **23**
dead of survivable wounds under ANGEL SWARM, **34** under `CURRENT — TRIAGE &
PROXIMITY`, **11** `FEWER DEAD`, **125** `RESOLVED` (captioned "20 sorties ·
3 escalated, 3 lapsed"). Only the palette changes between blocks.

### `TODAY` — What ships now

Tagged `TODAY`, subtitled "ARM A teal at chroma 0.13 against ARM B orange at
0.15. The alert and the death count are the same red." Beneath the cards is
the live status strip: two red pills, `MISSION IN PROGRESS` and `1 DECISION
REQUIRES YOU`, a teal `OPEN THE ANALYSIS →` button, and an amber `FPCON
BRAVO` chip. The block closes with the indictment, set in red against a red
rule:

> Look at the strip: the alert and the death count are the same red, and the
> button is the same teal as ANGEL SWARM's arm mark. Nothing tells you which
> of those is a result, which is a demand, and which is an identity.

### `OPTION A · RECOMMENDED` — Give the arms equal weight

"Four tokens. Arms equalised, button moved to cyan, alert moved to amber. ~30
minutes, revertible in one commit." The two arm hues are both raised to
chroma 0.15, the status pills go amber, and the primary button goes cyan. A
swatch rail underneath names the five resulting tokens with their OKLCH
values: `ARM A` 0.74 0.15 165, `ARM B` 0.74 0.15 50, `BUTTON` 0.70 0.13 195,
`DEMAND` 0.80 0.15 75, `THE DEAD` 0.82 0.15 25. The note reads: "Now a teal
thing means ANGEL SWARM and nothing else. A red *number* is a death; an
*amber* banner is a demand on you. The two arms read as peers rather than as
subject and footnote."

### `OPTION B` — Everything in A, and make red mean one thing only

"In A, red still appears on the arm-B card edge and on bar fills. B strips red
back to the figures alone — bars go neutral, edges go to the arm hue. ~2
hours." Shown as two wide cards with neutral grey bar fills at 68 per cent and
100 per cent and arm-hue borders. Its own note carries the cost: "The only red
left anywhere is a number that counts dead soldiers. Bars carry length, not
alarm; card edges carry the arm. **The cost:** the bars lose some of their
punch on the wall display, and I would have to re-check every red in the build
— there are 40-odd uses. This is the purist option and it is the two-hour
one."

### `OPTION C` — Don't touch colour — fix hierarchy only

"Same palette. Findability fixed with size, weight and space alone." The four
cards are re-proportioned rather than re-coloured: the two arm cards take
1.35fr each against 1fr for the others, their figures grow from 42px to 58px,
and the `FEWER DEAD` and `RESOLVED` cards drop to 31px and 0.72 opacity with
their captions cut to "the difference" and "20 sorties". The note is candid
about what this does not buy:

> Zero palette risk days before you present, and the two arms genuinely do
> dominate now. **But** it does not fix teal-meaning-four-things, which is the
> actual cause of "hard to locate" — it just makes one screen louder than the
> others.

## The decision

**Option C — change no colour at all.** Findability was fixed with size,
weight and spacing instead.

Note that the mockup itself recommends A: option A carries the tag `OPTION A ·
RECOMMENDED` and C is presented with its limitation stated plainly. The
decision went the other way, against the mockup's own recommendation, on the
ground that a palette change days before a presentation is risk taken for a
benefit that hierarchy alone could deliver.

The decision was verified afterwards by diffing every colour literal in the
file: 480 distinct values before, 480 after, none added, none removed.
