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

## Recommendation (first pass, before the play data)
Momentum, for keeping Maneuvers' role as path connectors while paying off in damage. **Superseded by the addendum below:** after the v1.32.76 play review the leading candidate is Dodge Block, and the decision is on hold.

Knock-on if Momentum is ever adopted: Glimmer Dust (+1 to the last damaging die per Maneuver) would overlap it; it could double Momentum instead.

## Caveats
- The bot is one-turn greedy: it doesn't plan around minion spawns, enemy intent or future turns, and its weights for Block vs damage are hand-set. Human players may value Maneuvers differently; check against the v1.32.76 play data (TODO #2).
- Payoffs were tested by wrapping the step calculator in the harness only; they are not in the game.

## Addendum: after the v1.32.76 play review (Oct 11)

**Owner decision:** keep this analysis, but wait on more play data before changing the Maneuver meta.

**What the play data adds:** the tester (Dwarf/Armsmaster, victory) dropped Maneuver dice first (8 of 16 loot equips replaced one), which matches the bot result. Late Floor 3 was trivial for them because 14–29 damage turns cleared every minion and triggered Extruzeon's 20+ damage freeze quest. Extra burst damage therefore pushes the wrong way, which moved the leading candidate from Momentum to Dodge Block.

Tester's combo, Dwarf/Armsmaster, 300 runs each:

| | Win % | Avg damage dealt per turn F1 · F2 · F3 | Damage taken / fight on F3 |
|---|---|---|---|
| Today's rules | 73 | 5.5 · 10.6 · 21.4 | 3.0 |
| Momentum | 87 | 8.3 · 14.1 · 22.6 | 2.8 |
| Dodge Block | 90 | 5.5 · 10.6 · 21.8 | 2.5 |

**Leap and Pivot payoffs** (4 combos, 300 runs each, win %):

| Variant | Win % | Damage taken / fight F1 · F2 · F3 |
|---|---|---|
| Today's rules | 74 | 3.0 · 4.8 · 3.3 |
| Leap Momentum (each Leap +1 to the next damaging die) | 83 | 2.2 · 4.4 · 3.2 |
| Pivot Block (each Pivot gives 1 Block) | 80 | 2.8 · 4.4 · 2.9 |
| Dodge Block | 90 | 0.9 · 2.7 · 2.9 |
| Dodge Block + Leap Momentum | 91 | 0.8 · 2.4 · 2.9 |
| Dodge Block + Pivot Block | 91 | 0.9 · 2.3 · 2.6 |

- Leap Momentum alone lands at Attack-die parity (83, same as swapping Maneuvers for Attack dice): the smallest fix that makes Maneuvers worth keeping.
- Pivot only appears on upgraded Maneuver dice and the Dwarven Doohickie, so Pivot payoffs barely register (dwarf/guard +10, the others +1 to +8).
- Stacking a second payoff on Dodge Block adds only about 1 point: the bot already wins most runs.
- Leap already clears a minion it jumps over; that is its existing niche.

## Enemy pressure: HP vs damage and effects (Floor 3, today's rules)

`tools/balance/study_pressure_grid.py`, 4 combos, 300 runs each, averaged.

| Variant | Win % | Died on F3 (% of runs reaching it) | F3 taken / fight | F3 turns / fight | F3 one-turn kills | Big Boss taken / turns |
|---|---|---|---|---|---|---|
| Today's rules | 74 | 12 | 3.3 | 3.13 | 11% | 2.7 / 4.7 |
| F3 enemy HP +25% | 69 | 17 | 4.1 | 3.72 | 6% | 2.9 / 5.6 |
| F3 every enemy hit +1 | 70 | 17 | 4.4 | 3.07 | 12% | 3.5 / 4.5 |
| F3 every enemy hit +2 | 66 | 20 | 5.6 | 3.03 | 12% | 4.2 / 4.5 |
| F3 effects +1 (D.O.T., H.O.T., minions, Shield, where the enemy already has them) | 68 | 20 | 3.4 | 3.16 | 11% | 2.6 / 4.6 |
| Big Boss hits +3 | 73 | 14 | 3.7 | 3.12 | 11% | 5.3 / 4.6 |

- **Damage vs HP:** +1 to every hit costs about as many wins as +25% HP, but fights stay the same length; HP makes fights longer and is the only lever that cuts one-turn kills (11% → 6%). They do different jobs: HP for one-shots, damage for tension.
- **Effects are the swingiest lever:** average damage taken doesn't move, but deaths rise as much as +2 to every hit, concentrated on specific encounters (mostly the minion spawners).
- **Big Boss damage is a cheap, safe lever:** +3 per hit doubles what the Big Boss deals (2.7 → 5.3 per fight) and costs about 1 point of win rate. It changes values only, not the boss action cycle.

**Floor 3 by encounter (today's rules):** rooms come up in random order (every regular encounter averages room 2.4–2.7), so the tester's "backwards" floor came from the draw, not the floor's structure. The real issue is spread. Damage taken per fight: Anti-Euclidian Space 8.5, Bio-Mutant Escape 7.1, Self-Replicating Forge 6.6, Gnome Chomper 6.3 versus Morel Dilemma 0.0, Myceleus (Big Boss) 0.9, Gestalt Network, Oilephant's Foot and Parasite Seer about 1.6. **Self-Replicating Forge causes about 70% of the bot's Floor 3 deaths** (38% of Forge fights end in death), while the tester cleared it easily with 15+ damage turns, so it punishes weaker turns much harder than strong ones. Per-encounter tuning (raise the harmless ones, soften the Forge's minion flood) fits better than a floor-wide change.

**Harness note:** harness.js's `dmgAdd` only changes `e.dmg`, which bosses ignore (they act from `actionCycle`, built inside `drawEncounter`). Earlier studies that used `dmgAdd` never changed boss damage. `study_maneuver.js`'s `hitAdd` covers bosses.
