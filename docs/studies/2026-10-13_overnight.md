# Overnight studies (Oct 13 2026, build 1.39.7, player-like bot)

**Why:** a lot of rules changed on Oct 12-13 (classes, Swap/Reroll Pivot, origin relics, relic tiers, depth costs, Equal and Opposite, two new depth levers), so every earlier number is out of date. Jeremy asked for as much passive study as the TODO needs while he's away.

**Programme** (`tools/balance/overnight_oct13.sh`, each stage resumable):
1. Final bug hunt on 1.39.7.
2. Class x origin at depth 0 and at the depth-7 loadout (Tougher Scuffs 1, Zeal 1, Rationing Rations 1, Swarming 1), 300 runs per pair.
3. Floors and bosses, from the same runs (`study_floors.py`).
4. Maneuver dice re-measure (`study_maneuver2.py`).
5. Dungeoneer candidates (measurement only).
6. Depth curve with the two new levers (`study_depth.py`).
7. Relic re-check at depth 7 (`study_relics.py`).
8. A performance trace of turn playback, last, on a quiet CPU.

Depth numbers below are the internal ones the studies use; the game shows them one lower (Depth 0 = the base dungeon).

Results are added below as each stage finishes.

## 1. Bug hunt on 1.39.7: clean
24 setups, no findings (includes the shrine music, title theme and splash).

## 2. Class x origin re-baseline
**Depth 0 (the base dungeon):** 97% wins, every pair 93-99%. For a skilled player the base dungeon is solved; it is the new-player experience, as intended.

**Depth-7 loadout:** 46% wins on average.

| | Armsmaster | Guard | Dungeoneer | Arcanist | origin avg |
|---|---|---|---|---|---|
| Dwarf | 53% | 60% | 31% | 38% | 45% |
| Gnome | 46% | 54% | 30% | 30% | 40% |
| Halfling | 61% | 66% | 35% | 50% | 53% |
| Pixie | 49% | 61% | 35% | 37% | 46% |
| **class avg** | **52%** | **60%** | **33%** | **39%** | |

- **Class still decides most of it (82% of the spread), but the range shrank from 49 to 27 points** (Oct 12: 89 / 67 / 42 / 40).
- **Guard (60%) is still on top and Dungeoneer (33%) at the bottom.** Arcanist settled at 39%: its 53% in the Oct 13 class test came from a two-origin sample on an older loadout.
- **Origins now matter a little more (13 points):** Halfling 53% best, Gnome 40% worst. Likely because the origin relics are now weaker, so the origin dice carry more of the difference (Halfling's heals are the strongest die).

## 3. Floors and bosses (from the same 9,600 runs)
**Where runs end, depth-7 loadout:** Floor 1 16% of runs, **Floor 2 37% of the runs that reach it**, Floor 3 14%.

**HP lost per fight, depth 7:**

| Floor | Easy | Standard | Elite | Deadly | Boss |
|---|---|---|---|---|---|
| 1 | 2.9 | 3.3 | 4.3 | -- | 11.7 |
| 2 | 5.9 | 5.8 | 7.2 | 8.9 | 14.0 |
| 3 | 2.6 | 4.7 | 6.1 | 7.3 | 13.1 |

- **Floor 2 is the wall and Floor 3 is easier than Floor 2.** Every regular tier costs less on Floor 3 than on Floor 2 (Easy rooms less than half), so the difficulty curve dips after Floor 2. This confirms the old "Floor 3 runs backwards" note with the player-like bot.
- **All eight regular rooms that end the most runs are on Floor 2:** The Strike/Break-er (Deadly, ends 21% of the runs that meet it), Whence Wolf (Deadly, 15%), Rusty Golem (Elite, 11%), Half-life Host (Elite, 9%), Illegal Operation (Elite, 8%), Blastogenesis Engine (Standard, 8%), Rogue Technician (Standard, 7%), Lichen-Thrope (Elite, 5%). Blastogenesis Engine and Rogue Technician hit like Elites despite being Standard.

**Bosses, depth 7 (share of the runs that meet the boss that it ends):**

| Floor | Boss | Ends | HP cost when won | Turns |
|---|---|---|---|---|
| 1 | Rogue Golemancer | 9.5% | 10.9 | 4.0 |
| 1 | Grosteque Grafter | 12.3% | 12.4 | 5.3 |
| 1 | **Heating Elemental** | **19.2%** | 11.8 | 5.0 |
| 2 | Ceramic Golem | 12.6% | 13.7 | 5.5 |
| 2 | Bellicose Biomancer | 13.1% | 14.7 | 5.3 |
| 2 | **The Necrorancher** | **20.6%** | 13.6 | 5.7 |
| 3 | **Extruzeon** | **1.2%** | 11.3 | 5.6 |
| 3 | Toadtaur Wizard | 5.2% | 15.0 | 5.9 |
| 3 | Myceleus | 13.6% | 13.2 | 7.2 |

- **Each floor has one boss about twice as deadly as the others** (Heating Elemental on Floor 1, The Necrorancher on Floor 2) and Floor 3 has one that almost never kills (Extruzeon, 1.2%: it still has nothing to threaten with, as the old play review found).
- At depth 0 every boss ends 0-1.4% of runs; the spread only shows under pressure.

**Proposals for Jeremy (no changes made):**
1. Even out Floor 2 vs Floor 3: either soften the Floor 2 Standard/Elite rooms that hit hardest (Blastogenesis Engine and Rogue Technician first, since they're "Standard") or raise Floor 3's Easy/Standard rooms.
2. Bring the outlier bosses toward their floor-mates: Heating Elemental and The Necrorancher down a little, Extruzeon up (a real threat in its cycle).
3. Look at The Strike/Break-er again (Deadly, ends 21% of runs that meet it even after the 1.37.1 cut).
