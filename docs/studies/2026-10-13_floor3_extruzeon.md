# Floor 3 difficulty and Extruzeon (Oct 13, 2026, build 1.40.0)

Regular-player bot (`{"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}`), Depth 0, 4 origin/class pairs x 200 runs. Tool: `tools/balance/study_variants.py`.

## Floor 3 (Jeremy: keep the difficulty rising after Floor 2)
| Variant | Win | Runs ending F1 / F2 / F3 (% of those reaching it) | HP lost per fight F1 / F2 / F3 |
|---|---|---|---|
| 1.39.7 | 77% | 2 / 17 / 6 | 3.9 / 6.5 / 7.2 |
| every F3 hit +1 (test knob) | 72% | 2 / 16 / 12 | 3.9 / 6.8 / 9.4 |
| every F3 hit +2 (test knob) | 64% | 3 / 16 / 21 | 3.9 / 6.7 / 11.5 |
| **shipped (per card, below)** | **65%** | **3 / 19 / 17** | **3.9 / 6.6 / 10.1** |
| shipped, new-player bot | 48% (was 59%) | 5 / 30 / 29 | 4.4 / 7.6 / 12.3 |

Shipped: attack +2 on Floor 3 Easy, Standard and Deadly cards, +1 on Elites (heavy turns double it), +1 on the Big Bosses' base attacks. Floor 3 fights now cost ~50% more HP than Floor 2's; run-ending share is about level with Floor 2 (players reach Floor 3 with more HP and better dice). The overall win rate drops ~11 points for regular and new players; if that's too much, soften Floor 2 a little rather than Floor 3.

## Extruzeon (Jeremy: as dangerous as the other Big Bosses, easier or harder by playstyle)
"Layer by Layer": base attack starts at 2, grows after every hit. Each variant forces Extruzeon as the Big Boss.

| Variant | Ends the run | HP lost when won | per class (ends % / HP) |
|---|---|---|---|
| grows +1 both phases | 2.6% | 17.2 | Guard 2.2/15.8, Armsmaster 5.4/17.2, Dungeoneer 2.4/18.4, Arcanist 0.7/17.2 |
| base 3, grows +1 | 7.3% | 22.5 | too costly |
| base 3, Atomic Pull 11 | 6.4% | 22.1 | too costly |
| **grows +1, Meltdown +2 (shipped)** | **4.0%** | **18.2** | Guard 3.0/15.9, Armsmaster 5.2/16.4, Dungeoneer 4.3/20.7, Arcanist 3.7/19.0 |
| Myceleus (for reference) | 7.1% | 16.3 | |
| Toadtaur Wizard (for reference) | 4.9% | 18.2 | |

Playstyle: the cost rises with fight length, so burst builds and the 20+ damage Freeze quest have the easiest time; long, grinding fights pay the most. Block also answers it well (Guard has the lowest HP cost).

## Half-strength Maneuver payoff (regular bot, Depth 0, 4 pairs x 300)
| Variant | Win |
|---|---|
| Today | 76% |
| All Attack dice | 83% |
| Leap Momentum (each Leap: +1 to the next damaging die) | 84% |
| Momentum, no stacking (any run of Maneuvers: +1 to the next damaging die) | 88% |
| Momentum, full (each Maneuver +1, stacking) | 91% |
| Dodge Block (each Dodge: 1 Block) | 95% |
