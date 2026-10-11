# Maneuver dice study (build 1.34.0, Oct 11 2026)

**Question (TODO #1):** are Maneuver dice/actions worth having compared with Attack dice, and which payoff would fix them?

**How:** `tools/balance/study_maneuver.js` (harness.js plus switches) and `study_maneuver_grid.py`. 300 full runs per cell, 4 origin/class combos (dwarf/guard, gnome/armsmaster, halfling/dungeoneer, pixie/arcanist), bot skill 1500 unless noted. Reproduce: `node build.js && cd tools/balance && python3 study_maneuver_grid.py 300 1500`.

Bot fix first: harness.js scores a path by damage, healing and Block only and **ignores quest bonuses**, so it undervalues Maneuvers (most "N maneuvers" quests pay flat damage). The study bot adds the quest bonus a path would earn (`questAware`, on by default). `noQuestAI` below is the old bot, for comparison.

## What Maneuvers do today
A Maneuver face has no effect of its own. It only (a) changes where the path may go next (Dodge diagonal, Leap 2 straight, Pivot any neighbor), (b) counts toward Maneuver/Dodge/Leap/Pivot quests, (c) Leap clears a minion it jumps over and Maneuvers may land on minions, (d) feeds the Glimmer Dust relic. Starting tray: 8 Attack I (2 Hit1, 1 Combo1, 3 blank), 7 Maneuver I (2 Dodge, 2 Leap, 2 blank), 1 origin die.

## Results (averages over the 4 combos, skill 1500)

| Variant | Win % | Damage taken / fight F1 · F2 · F3 | Turns / fight F1 · F2 · F3 | One-turn kills F1 · F2 · F3 | Quest dmg / run |
|---|---|---|---|---|---|
| Baseline (today's rules) | 74 | 3.0 · 4.8 · 3.3 | 3.07 · 3.66 · 3.14 | 12% · 4% · 10% | 48.7 |
| Old bot (ignores quests) | 70 | 3.3 · 5.0 · 3.4 | — | — | 37.5 |
| **Swap: every Maneuver die → Attack die** | **83** | 2.0 · 4.2 · 3.3 | 2.36 · 3.21 · 3.06 | 25% · 5% · 11% | 25.1 |
| Payoff A, Momentum: each Maneuver +1 to the next damaging die | 89 | 1.8 · 3.9 · 3.1 | 2.24 · 3.10 · 3.01 | 28% · 4% · 11% | ≈49 |
| Payoff B, Dodge Block: each Dodge gives 1 Block | 90 | 0.9 · 2.8 · 3.0 | 3.12 · 3.73 · 3.16 | 12% · 2% · 10% | ≈54 |
| Payoff C, Footwork: every Maneuver gives 1 Block | 93 | 0.2 · 1.0 · 2.2 | 3.11 · 3.91 · 3.13 | 12% · 2% · 11% | ≈55 |

Per combo win %, baseline → swap → Momentum → Dodge Block → Footwork: dwarf/guard 73 → 83 → 85 → 88 → 91; gnome/armsmaster 65 → 77 → 86 → 88 → 92; halfling/dungeoneer 87 → 88 → 95 → 90 → 94; pixie/arcanist 72 → 83 → 90 → 93 → 93. With 300 runs a cell, win-rate noise is about ±3 points.

**Bot skill barely matters:** average win % for baseline / swap / Momentum is 74 / 82 / 88 at skill 500 and 75 / 82 / 89 at skill 5000.

## Findings
1. **Maneuver dice are currently a net loss.** Replacing all 7 with Attack dice raises win rate by about 9 points on average (1 to 12 by combo) and cuts Floor 1 fight length by about a quarter (3.07 → 2.36 turns), even though it halves quest damage (49 → 25 per run). Mobility plus quests is worth less than an Attack die's 2 Hits and a Combo.
2. **Floor 2 is where runs die.** Baseline: 191 of 1,200 runs died on Floor 2; with the swap, 52. Floor 2 has the highest damage taken per fight (4.8).
3. **Quests are most of the Maneuver value.** The quest-blind bot wins 4 points less and earns 11 less quest damage per run.
4. **Momentum** brings Maneuvers to slightly above Attack-die parity (89 vs 83 for the swap), shortens fights, and leaves Floor 2/3 one-turn kills unchanged; Floor 1 one-turn kills double (12% → 28%), as they do with the swap.
5. **Dodge Block** gives the same win rate through defense: Floor 1/2 damage taken drops by 70%/43%, fights don't get shorter, Floor 3 barely changes.
6. **Footwork is too strong**: damage taken near zero on Floors 1 and 2.

## Recommendation
Adopt **Momentum** (each Dodge/Leap/Pivot adds +1 to the next Hit or Combo in the path). It rewards routing through Maneuvers in the same currency players already track, keeps Maneuvers' role as path connectors, reads cleanly on the tray ("+1 next hit"), and lands near Attack-die parity rather than far above it. Dodge Block is a close second if a defensive identity is preferred; adopting both would likely be too strong (untested). Boost on upgraded Maneuver dice is not needed.

Knock-on: Glimmer Dust (+1 to the last damaging die per Maneuver) would overlap Momentum; it could double Momentum instead.

## Caveats
- The bot is one-turn greedy: it doesn't plan around minion spawns, enemy intent or future turns, and its weights for Block vs damage are hand-set. Human players may value Maneuvers differently; check against the v1.32.76 play data (TODO #2).
- Payoffs were tested by wrapping the step calculator in the harness only; they are not in the game.
