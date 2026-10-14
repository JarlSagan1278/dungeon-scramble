# Depth curve on 1.41.17 (Oct 14, after the revive / campfire / stronger-basics changes)

Expert bot (skill 1500), shown depths 0-9, two random modifier mixes per depth, 4 origin/class pairs, 100 runs each (800 runs per depth, 400 per mix).

| Shown depth | Expert win | Runs ending F1/F2/F3 (%) | Dice finish unlocked by clearing it |
|---|---|---|---|
| 0 | 88% | 0 / 5 / 8 | |
| 1 | 84% | 1 / 7 / 9 | |
| 2 | 79% | 1 / 7 / 14 | |
| 3 | 70% | 1 / 15 / 17 | Bronze |
| 4 | 54% | 4 / 20 / 30 | |
| 5 | 47% | 8 / 29 / 28 | Silver |
| 6 | 47% | 4 / 26 / 34 | |
| 7 | 36% | 10 / 37 / 38 | Gold |
| 8 | 26% | 24 / 48 / 34 | |
| 9 | 11% | 30 / 61 / 58 | Royal |

- The curve is smooth: about 8-10 points per depth step, with a soft spot between 5 and 6. Every finish is reachable for a skilled player, and Royal (11% for the expert bot) is the hard final goal Jeremy asked for. Human experts will sit below the bot.
- **Modifier costs are uneven.** At the same depth, mixes differ by up to 18 points: depth 3 "Dread 2 + Rationing 1" 61% vs "Union Dues + Night Shift 1 + Burden of Choice" 79%; depth 8 20% vs 32%. Dread, Clumsy and Rationing rank 2 cost more than their depth; Union Dues, Burden of Choice and Night Shift cost less. A per-modifier cost study would let the depth number mean the same thing whatever the mix.
- Floor 2 is where depth bites (its death share climbs fastest), matching the pacing study. For regular players at depth 0 the floors are now even (Floor 2 about 17-18% deaths, Floor 3 25-30%), so the old "Floor 2 is the wall" case for HP trims is weaker; trims would mainly shorten runs.
