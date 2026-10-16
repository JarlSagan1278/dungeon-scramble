# Dungeoneer + one simple passive (Oct 16, build 1.41.53)

**Jeremy's question:** the Arcanist got a simple passive today (+1 to every Boost). What *similar* simple passive could bring the Dungeoneer up? Skilled players at depth win only 36% with it. Four ideas were tested, plus one tuned version.

## In short
- **Today the Dungeoneer is last for skilled players at depth.** It wins 36% at depth 7. Arcanist (with its new +1 Boost) wins 50%, Armsmaster 54%, Guard 62%.
- **"Each wrap across the edge adds +1 damage to your next attack" is the best fit.** Skilled players at depth go from 36% to 55%. That is right between Arcanist and Armsmaster. It is also the passive that most rewards using the wrap, so it fits the explorer theme.
- **"+1 to every Block face" lands in the same place (51%).** It is simple, but it has nothing to do with edges or wrapping.
- **"+1 to Hit and Combo dice on the edges" overshoots (69%).** That is above Guard, the strongest class.
- **"Every Dodge, Leap or Pivot also gives +1 Block" breaks the class (94%).** Even the tuned version, where only Maneuvers on the edges give Block, wins 74%. Block stays for the whole fight, and the Dungeoneer's paths are full of Maneuvers, so it stacks up fast.
- **The catch for every option: regular players already find the Dungeoneer easy.** Today they win 76% at depth 0. The two passives that fit best both push that to 85%. That is 6 points above the next class (Arcanist 79%). Nothing here makes an enemy stronger; it is a player piece being strong, which the balance philosophy allows.

## Results
Win = share of runs that beat the Floor 3 boss. The ± is the 95% margin: the true rate is very likely within that range. "Floor" is the average floor a run ended on (3.00 = every run reached Floor 3). "HP lost per fight" is the average health lost in each fight the player won. Each row is 1,200 runs: 300 each for Dwarf, Gnome, Halfling and Pixie.

### Skilled player (expert bot), depth 7 (shown in game as depth 6)
| Class / passive | Win | Floor | HP lost per fight | Died on F1 / F2 / F3 | Runs |
|---|---|---|---|---|---|
| Dungeoneer today | 36% ± 3 | 2.23 | 6.4 | 24 / 30 / 11% | 1,200 |
| A. +1 to every Block face | 51% ± 3 | 2.42 | 5.4 | 19 / 21 / 10% | 1,200 |
| **B. Each wrap crossing: +1 damage to the next attack** | **55% ± 3** | 2.57 | 5.7 | 10 / 23 / 12% | 1,200 |
| C. Hit and Combo on the edges +1 | 69% ± 3 | 2.75 | 4.8 | 5 / 15 / 11% | 1,200 |
| D. Every Dodge, Leap, Pivot: +1 Block | 94% ± 1 | 2.98 | 2.5 | 0 / 1 / 5% | 1,200 |
| D tuned: only Maneuvers on the edges give +1 Block | 74% ± 2 | 2.83 | 4.4 | 2 / 13 / 11% | 1,200 |
| Arcanist (with +1 Boost, as shipped) | 50% ± 3 | 2.39 | 5.7 | 19 / 24 / 8% | 1,200 |
| Armsmaster | 54% ± 3 | 2.66 | 5.5 | 5 / 25 / 17% | 1,200 |
| Guard | 62% ± 3 | 2.71 | 5.1 | 6 / 17 / 15% | 1,200 |

### Regular player, depth 0 (no modifiers)
| Class / passive | Win | Floor | HP lost per fight | Died on F1 / F2 / F3 | Runs |
|---|---|---|---|---|---|
| Dungeoneer today | 76% ± 2 | 2.85 | 5.3 | 2 / 10 / 12% | 1,200 |
| A. +1 Block | 85% ± 2 | 2.90 | 4.3 | 2 / 6 / 7% | 1,200 |
| **B. Wrap crossing +1 damage** | **85% ± 2** | 2.94 | 4.7 | 1 / 5 / 9% | 1,200 |
| C. Edge Hit/Combo +1 | 91% ± 2 | 2.96 | 3.9 | 0 / 3 / 6% | 1,200 |
| D. Maneuvers +1 Block | 98% ± 1 | 3.00 | 2.0 | 0 / 0 / 2% | 1,200 |
| D tuned (edges only) | 93% ± 1 | 2.99 | 3.3 | 0 / 1 / 6% | 1,200 |
| Arcanist | 79% ± 2 | 2.88 | 5.0 | 2 / 9 / 11% | 1,200 |
| Armsmaster | 71% ± 3 | 2.83 | 5.6 | 3 / 12 / 15% | 1,200 |
| Guard | 71% ± 3 | 2.84 | 5.3 | 2 / 12 / 15% | 1,200 |

### Skilled player, depth 0
| Class / passive | Win | Floor | HP lost per fight | Runs |
|---|---|---|---|---|
| Dungeoneer today | 94% ± 1 | 2.95 | 3.6 | 1,200 |
| A. +1 Block | 95% ± 1 | 2.97 | 2.9 | 1,200 |
| B. Wrap crossing +1 damage | 96% ± 1 | 2.98 | 3.1 | 1,200 |
| C. Edge Hit/Combo +1 | 99% ± 1 | 3.00 | 2.5 | 1,200 |
| D. Maneuvers +1 Block | 100% | 3.00 | 1.1 | 1,200 |
| D tuned (edges only) | 99% ± 1 | 3.00 | 1.9 | 1,200 |
| Arcanist | 97% ± 1 | 2.98 | 3.1 | 1,200 |
| Armsmaster | 96% ± 1 | 2.99 | 3.0 | 1,200 |
| Guard | 98% ± 1 | 3.00 | 2.4 | 1,200 |

### Regular player, depth 7 (too hard for them; shown for completeness)
| Class / passive | Win | Floor | HP lost per fight | Runs |
|---|---|---|---|---|
| Dungeoneer today | 14% ± 2 | 1.85 | 7.5 | 1,200 |
| A. +1 Block | 24% ± 2 | 2.03 | 6.8 | 1,200 |
| B. Wrap crossing +1 damage | 23% ± 2 | 2.12 | 6.8 | 1,200 |
| C. Edge Hit/Combo +1 | 42% ± 3 | 2.50 | 6.2 | 1,200 |
| D. Maneuvers +1 Block | 75% ± 2 | 2.95 | 4.3 | 1,200 |
| D tuned (edges only) | 46% ± 3 | 2.60 | 6.0 | 1,200 |
| Arcanist | 17% ± 2 | 1.93 | 7.2 | 1,200 |
| Armsmaster | 10% ± 2 | 1.85 | 7.1 | 1,200 |
| Guard | 10% ± 2 | 1.83 | 7.3 | 1,200 |

## What it means
- **B (wrap crossing) helps skilled players most for what it gives regular players.** It adds 19 points for experts at depth and 9 for regular players. It pays off only when you plan a path across the seam, which skilled players do more often. It mostly cuts Floor 1 deaths (24% down to 10%).
- **A (+1 Block) is a close second.** It adds 15 points for experts and 9 for regular players. It is easy to explain, but it would make the Dungeoneer a second Guard, and the Guard already owns Block.
- **C (edge Hits and Combos +1) is too strong.** Most Dungeoneer paths start or end on the edges, so almost every attack gets the bonus. A Combo +1 also grows with every attack die next to it. It would make the Dungeoneer the strongest class for every kind of player.
- **D (Maneuvers give Block) is far too strong, even when tuned.** A Dungeoneer path uses about 2 to 2.5 Maneuvers a turn. The extra Block piles up across a fight, so experts lose only 2.5 health per fight. The game already has this effect as a relic (Evasion Tank, Dodge only), and it is rated S tier. As a class passive, every run would start with a stronger version of it.
- **Origins with B (experts, depth 7):** Halfling 61%, Pixie 59%, Dwarf 54%, Gnome 47%. Gnome gains the least, as it did for the Arcanist.
- **Regular players:** every option pushes the Dungeoneer past the Arcanist. B and A both reach 85%. Today the Dungeoneer and Arcanist are already the two easiest classes for them (76% and 79%), while Guard and Armsmaster sit at 71%.
- **Comparing with older studies:** read only the rows above against each other. Guard at expert depth 7 is 62% here and was 66% in this morning's Arcanist study. The build changed a little in between, and the two numbers are close to the edge of the margin.

## Method
- **Build:** a copy of 1.41.53 (clean tree, Arcanist `boostPlus:1` already built in), built with `node build.js` and copied right away to a scratch snapshot (`tools/balance/_dng_build.html`). The study used it through `DS_HTML`, so rebuilds of dist/ could not change it mid-study. The snapshot was deleted afterwards. The container restarted mid-study. Finished cells were kept, and only the missing cells were rerun on the same snapshot.
- **Bot and profiles:** the same as the Arcanist study of this morning (`bg_arcboost.py`), using `study_maneuver.js`.
  - Expert = skill 1500. It always uses its class ability, Swap/Reroll and tokens, and picks the best loot.
  - Regular = the calibrated Oct 13 profile: skill 60, ability used 35% of the time, tray actions and tokens 30%, random loot pick 60%.
- **Depth 7** = Tougher Scuffs 1, Zeal 1, Rationing Rations 1, Swarming 1. Depth 0 = no modifiers.
- **Origins:** every row averages all four origins equally, 300 runs each, so 1,200 runs per row.
- **How each passive was patched:** in the test page only, not in the game's code, and only while the class is the Dungeoneer.
  - A and C change the face the game reads, through the same lookup as the Arcanist study (`pathFaceForIdx`). That lookup feeds both the real damage math and the bot's path scoring. C only counts dice in the Dungeoneer's zone (the left and right columns).
  - B and D add to each die's result after the relics, the way the Leaper Spurs and Dodger Cloak relics do (`applyRelicsToSteps`). The path preview total was also made to read those results, so the bot scores exactly what the game plays.
  - B: a crossing is a step between the left and right edge columns. Each crossing adds +1 to the next die that deals damage, counting the die you land on. Several crossings before an attack stack.
  - D: every Dodge, Leap or Pivot face in the path gives +1 Block. The tuned version counts only those on edge dice.
  - The bot still values loot dice at their printed faces when it picks loot.
- **Tools:** `tools/balance/study_dngpassive.js` (`study_maneuver.js` plus the `dngPassive` knob: `none`, `block`, `seam`, `edgehit`, `manblock` or `manblockzone`, and `dngAmt`, default 1), `tools/balance/bg_dngpassive.py` (the cell driver) and `tools/balance/agg_dngpassive.py` (the tables). Raw results are in `out_dngp_*.json`, which git ignores.

## Recommendation
- **Give the Dungeoneer B: "Each time your path wraps across the edge, your next attack deals +1 damage."** It brings skilled players at depth from 36% to 55%, between the Arcanist (50%) and Armsmaster (54%) and below Guard (62%). It is one sentence, it uses the class's own wrap, and it rewards the explorer for going around the dungeon's edges.
- **The trade-off:** regular players at depth 0 go from 76% to 85%, which makes the Dungeoneer the easiest class for them by about 6 points. That is a player piece being strong, which the balance philosophy accepts. If that feels like too much, A (+1 Block) costs the same for regular players, so it is not a gentler option. Leaving the Dungeoneer as it is is the only way to keep it at 76%.
- **Do not use C or D.** Both overshoot: C reaches 69% for experts at depth (above Guard), and D reaches 74–94%.
- **If B is chosen, the game should show it.** A small "+1" on the attack after a wrap, like the relic tags, would make the passive easy to see and learn.
