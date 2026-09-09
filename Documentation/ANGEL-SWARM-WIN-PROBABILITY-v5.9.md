# ANGEL SWARM vs CURRENT — TRIAGE & PROXIMITY: win probability by theatre

**Current engine — 200 paired replications per theatre, 1,400 in total, seeds
1–200.** Every figure in the current table below was measured from the shipped
engine.

*The filename still carries `v5.9` because the package manifest and several
other documents reference it by that name. The content is current.*

**This supersedes the 19 August table,** which was measured on an earlier
engine against the arm then called "Class VIII push." That document does not
ship and its figures should not be quoted anywhere. **This is the only win
table.**

## Method

Both arms are built from one world per seed, so they fight the **identical
casualty stream** — the same soldiers wounded at the same minute with the
same injuries and the same deadlines. The configuration is the one
`angel-engine.js:runEngine()` uses for the application itself, not a
harness variant: classification mode `fair` (the control arm is given
*perfect* triage, which no human achieves), telementoring and
human-in-the-loop on for ARM A, `autoApproveAbove` 0.10, `hvaWeight` 1.6.
Reproduce with `winprob.mjs <SCENARIO> 200`.

Metric is **survivable deaths** — deaths among casualties whose wounds were
survivable with timely intervention. Negative means fewer dead under ANGEL
SWARM.

## Headline

> **ANGEL SWARM wins all seven theatres. Every 95% interval excludes zero.**
>
> **Across 1,400 paired battles it produced more dead in 5 — 0.36% — and
> never by more than one.**

## By theatre

| Theatre | ANGEL | Current | Mean diff | 95% interval | dz | Worse | Tie | Better |
|---|---|---|---|---|---|---|---|---|
| PACOM CORAL | 24.23 | 29.14 | **−4.905** | −5.215 … −4.595 | −2.19 | **0 / 200** | 1 | 199 |
| PACOM TIMBER | 14.98 | 19.61 | **−4.630** | −4.920 … −4.340 | −2.21 | **0 / 200** | 4 | 196 |
| PACOM BASALT | 39.79 | 44.37 | **−4.575** | −4.872 … −4.278 | −2.13 | 1 / 200 | 1 | 198 |
| PACOM MARINER | 12.69 | 15.90 | **−3.215** | −3.464 … −2.966 | −1.79 | **0 / 200** | 8 | 192 |
| EUCOM GRANITE | 33.90 | 38.36 | **−4.460** | −4.765 … −4.155 | −2.03 | 1 / 200 | 4 | 195 |
| EUCOM AMBER | 37.11 | 40.73 | **−3.620** | −3.872 … −3.368 | −1.99 | **0 / 200** | 3 | 197 |
| EUCOM FJORD | 16.73 | 18.61 | **−1.875** | −2.053 … −1.697 | −1.46 | 3 / 200 | 23 | 174 |
| **All seven** | | | | | | **5 / 1,400** | 44 | 1,351 |

**The worst single battle anywhere in 1,400 is one extra death.** There is no
seed, in any theatre, where ANGEL SWARM is worse by two.

Four of the seven theatres are **never once worse in 200 battles**, and in
those the worst case is a tie.

## EUCOM FJORD is the weakest theatre, and it still wins

FJORD is where three of the five adverse battles live, and it has the smallest
margin: **−1.88 against −4.91 in CORAL**. It also has by far the most ties —
23 of 200 — because it is a compressed theatre where distance stops
discriminating between casualties, so a deadline sort has less to work with
than it does in a dispersed maritime laydown.

**It is still a win.** Mean −1.875, 95% interval −2.053 … −1.697, which
excludes zero comfortably, on 174 of 200 battles strictly better.

### The single-seed trap

At **seed 42 specifically**, FJORD gives ARM A 16 against ARM B 15 — one of
the three. Read on its own that looks like "ANGEL SWARM loses FJORD." It is
not. It is one draw from a distribution whose mean is −1.88 and whose
interval does not touch zero. A 20-seed sweep of FJORD on 19 August drew the
same wrong conclusion from two adverse seeds; 200 replications overturned it
then and overturn it again now.

**One battle is not a theatre.** Quote the interval, not the seed.

## Historical v6.0–v6.4 verification

The following records the earlier v6.0–v6.4 verification and is retained as
history; it is not the current table. Between the first measurement and that
measurement the engine gained a third arm, a
corrected audit hash, a responder-qualification lever and a terminology
overhaul. **Everything since — through v6.4 — has been presentational.**

That is checkable rather than asserted. The three files the harness loads are
byte-identical across the v6.0 (1 September), v6.3 (4 September) and v6.4
(5 September) builds:

| File | MD5, identical at v6.0, v6.3 and v6.4 |
|---|---|
| `app/js/sim.js` | `d70bb234fc67d81829a439cf8b998d54` |
| `app/js/optimizer.js` | `da893cab7fc3e34f9270d4f833990257` |
| `app/angel-engine.js` | `c8b242081375a141412b4990b7740730` |

The v6.3 and v6.4 work was a globe scale, coastline geometry, panel scrolling,
the route-stage strip and scenario synchronisation between the shell and the
map — the picture, not the simulation. **The table published at that time was
nevertheless re-measured in full on the v6.4 build rather than carried
forward.**

The conclusion has held across the historical and current measurements:
**seven theatres won, every interval excluding zero, adverse in well under one
per cent of battles and never by more than one death.** The table above is the
only current set of figures; older version statements in this section are
historical.

## Reproducing this table

```
node Documentation/verification/winprob.mjs PACOM_CORAL 200
node Documentation/verification/winprob.mjs PACOM_TIMBER 200
node Documentation/verification/winprob.mjs PACOM_BASALT 200
node Documentation/verification/winprob.mjs PACOM_MARINER 200
node Documentation/verification/winprob.mjs EUCOM_GRANITE 200
node Documentation/verification/winprob.mjs EUCOM_AMBER 200
node Documentation/verification/winprob.mjs EUCOM_FJORD 200
```

`winprob.mjs` ships in `Documentation/verification/`. It loads `app/js/sim.js` and
`app/js/optimizer.js` **verbatim off disk** — the same files the application
runs — so there is no harness variant of the engine to disagree with. Each
line prints the mean, the interval, Cohen's d_z, the worse/tie/better split,
the worst and best single-battle differences, and the mean sortie counts.

**A shorter check, for anyone who does not want to run a sweep.** Open
`app/selftest.html` in a browser, offline, and read its live summary rather
than a copied assertion total. It includes the reference result this table is
anchored to — **23 / 34 / 35 survivable deaths on 20 / 38 / 0 sorties.**
