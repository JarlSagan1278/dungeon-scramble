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

## 4. Maneuver dice re-measure (expert bot, depth-7 loadout, 4 pairs x 300 runs)
| Variant | Win | HP lost per fight F1 / F2 / F3 | Turns per fight F1 / F2 / F3 |
|---|---|---|---|
| Today (Maneuver dice as they are) | 42% | 5.4 / 8.1 / 7.4 | 3.06 / 4.06 / 3.91 |
| Every Maneuver die swapped for an Attack die | 56% | 3.8 / 6.9 / 7.0 | 2.33 / 3.36 / 3.77 |
| Momentum (each Maneuver +1 to the next damaging die) | 73% | 3.5 / 6.5 / 6.7 | 2.32 / 3.39 / 3.73 |
| Dodge Block (each Dodge gives 1 Block) | 79% | 3.0 / 5.4 / 6.4 | 3.23 / 4.24 / 3.93 |

- **Maneuver dice are still a clear net loss: swapping them all for Attack dice gains 14 win points** (it was 9 on Oct 11). The Pivot after Swap/Reroll and the wider Arcanist didn't change that.
- **Both payoffs fix it, and both overshoot** under this pressure: Momentum +31, Dodge Block +37 over today. A half-strength version (e.g. Dodge Block on Dodge only every other time, or Momentum only for the first Maneuver in a path) would land nearer Attack-die parity.
- Per pair, today vs all-Attack: Dwarf Guard 58 vs 60 (barely matters: Guard's Block covers it), Halfling Dungeoneer 34 vs 52, Pixie Arcanist 34 vs 61.

## 5. Dungeoneer candidates (measurement only; expert bot, depth-7 loadout, Halfling + Pixie, 300 runs each)
| Class / variant | Win |
|---|---|
| Guard | 61% |
| Armsmaster | 56% |
| Arcanist | 43% |
| Dungeoneer as is | 36% |
| Dungeoneer + top-bottom wrap too (all four edges) | 49% |
| Dungeoneer + once per turn, a zone die becomes a Pivot | 48% |

- Either candidate lifts Dungeoneer by about 12-13 points, into Arcanist/Armsmaster range. All-edge wrap keeps it a pure movement class (no new button), so it's the cleaner fit. Jeremy said to keep Dungeoneer as is for now; this is here for when he revisits it.

## 6. Depth curve on 1.39.7 (expert bot, 4 pairs x 250 runs; depths here are internal, shown in game one lower)
**Each modifier alone, cost per depth point:** Tougher Scuffs -4.8 to -7.1, Clumsy -1.8/-5.4/-7.0, Swarming -3.2/-4.3/-4.3, Burden of Choice -4.5, Zeal -5.9/-5.9, Dread -3.9/-5.9/-6.4, Night Shift -5.9/-5.5, Rationing Rations -3.5/-4.5. **New levers: Union Dues -2.1 (a true cheap lever, as intended), Rounding Error -4.8 (a normal one).**

**Mixed loadouts (shown depth = internal - 1):**

| Shown depth | Expert win rate |
|---|---|
| 2 | 81-92% |
| 4 | 58-72% |
| 6 | 36-50% |
| 8 | 15-27% |
| 10 (top badge) | 8-24% |
| 12 | 1-11% |
| 15 | 0-4% |

- The curve is smooth and steep, and the top badge at shown depth 10 is a real final challenge even for the expert bot, as Jeremy wanted.
- **Swarming 3 is still the cheap stack:** alone at internal depth 11 it wins 54%, against 8-24% for mixed loadouts at that depth. Modifiers compound when mixed, and Swarming doesn't compound with the others as much. Options: rank 3 costs more again (+8 instead of +6), or cap Swarming at 2 ranks.
- Union Dues makes a nice "filler" point: players can land on an exact depth without much extra pain.

## 7. Relic re-check on 1.39.7 (expert bot, depth-7 loadout, each relic forced, 4 pairs x 300 runs)
Win-rate gain over no relic (baselines 23-38%):

| Tier (by Oct 12 rule) | Relics |
|---|---|
| S (+30 or more) | Scavenger's Acumen +41, Minus-One Mantra +33, Evasion Tank +32 |
| A (+20 to +30) | Hard Hat Act +26, Perfect Fifth +24 |
| B (+10 to +20) | Mandated Lunch Break +15, **Prime Edge +14**, Union Health Plan +13, Nature's Thorns +11 (Dwarf Guard +32), Combonatorics +11, Coffee Break +10 |
| C (under +10) | Faerie Fire +9, Terminal Velocity +9, Mycorrhizal Bond +8, Klein Bottle +7, Bisection Method +7, Giant Killer +5, Strength in Mooks +5, Percolation Theory +5, Need Before Greed +4, Equal and Opposite +3 (Dwarf Guard +11), **Stronger Infill +2**, Exponential Decay +1, Bloodthirst 0, Power Word: Safe 0, Inductive Step -4, FTLeporter -4 |

- **The S and A tiers held.** One shift: **Prime Edge fell to +14 (tier B)**; it's gated as tier A today, so it could join the always-available pool.
- **All four origin relics are now tier B or below, as Jeremy asked:** Coffee Break +10, Faerie Fire +9, Mycorrhizal Bond +8, **Stronger Infill +2**. Stronger Infill at 1 Block is now the weakest by far; 2 Block measured +21 on Oct 12 (before the Guard changes), so 2 Block might now land around +10. Worth one quick re-test if Jeremy wants Dwarf's relic to matter.
- **FTLeporter and Inductive Step measure slightly negative.** That's very likely the bot, not the relics: a teleporting Pivot gives the path search far more options to check in the same time, so the bot finds worse paths; Inductive Step's extra shrine choices go to the bot's simple shrine picker. Treat both as "about zero" for now.
- Equal and Opposite with the reflect-the-Blocked-amount rule: +3 overall, +11 for Dwarf Guard. It pays off for Block builds, as intended, and stays tier C.

## 8. Regular and new players at Depth 0 (Jeremy: balance where most people play)
Two bot profiles, calibrated at Depth 0 (no player data yet, so these are plausible stand-ins, to re-tune once Jeremy's play data comes in):
- **Regular player:** uses the class ability about a third of the turns, Swap/Reroll and tokens about a third of the time, picks loot at random 60% of the time, and searches paths less deeply. Wins 77%.
- **New player:** about a fifth of the time for all of those, random loot 80%, short greedy paths. Wins 59%.

### Classes: the ranking flips
| Class | Expert, depth 7 | Regular, Depth 0 | New, Depth 0 |
|---|---|---|---|
| Guard | 60% | 74% | 49% |
| Armsmaster | 52% | 72% | 52% |
| Arcanist | 39% | 81% | 66% |
| Dungeoneer | 33% | 81% | 69% |

- **Guard and Armsmaster are only strong if you use the ability every turn.** Their power is all in the once-per-turn conversion; a player who forgets it gets nothing. Dungeoneer's wrap and Arcanist's diagonals are **always on**, so they help every player automatically. For new players the movement classes are the strong ones (69% and 66% against 49-52%).
- So "Guard too strong, Dungeoneer too weak" is true for players like Jeremy (who uses the ability every turn) and false for newer players. **This argues against nerfing Guard or buffing Dungeoneer further**, and for **teaching the ability better** (see the suggestions at the end): the biggest gap between a new player and an expert is using it.
- Origins: Halfling is the easiest for every profile (heals), Pixie the hardest at Depth 0 (72% regular, 55% new).

### Floors: Floor 2 is the wall for everyone
| Profile | Floor 1 ends | Floor 2 ends (of runs reaching it) | Floor 3 ends |
|---|---|---|---|
| Expert, depth 7 | 16% | 37% | 14% |
| Regular, Depth 0 | 2% | 17% | 5% |
| New, Depth 0 | 6% | 30% | 10% |

- Every profile dies most on Floor 2, and Floor 3's regular rooms cost about the same or less than Floor 2's. **This is the most consistent finding of the night.**

### Bosses: the outliers mostly belong to the expert-at-depth reading
- At Depth 0 the three **Floor 2 bosses are even** (regular 8.7-9.1%, new 15-16%). The Necrorancher's outlier status (21%) only shows for the expert under depth modifiers, so it's not a priority.
- **Extruzeon is toothless in every reading** (1.2-1.6% of runs that meet it), while **Myceleus is the Floor 3 boss that bites** (2.7% regular, 6.6% new). Extruzeon is the clearest boss fix.
- Floor 1: Heating Elemental and Grosteque Grafter are a little harder than Rogue Golemancer for new players (6.6-6.8% vs 3.9%); fine for a first floor.

### Deadliest regular rooms (all Floor 2, every profile)
Whence Wolf (Deadly, ends 9-16% of the runs that meet it), The Strike/Break-er (Deadly, 10-15%), Rusty Golem (Elite, 4-9%), Half-life Host (Elite, 3-7%), plus Illegal Operation, Lichen-Thrope, Rogue Technician and Fungal Flayer for new players.

### What this changes in the proposals
1. **Top priority: Floor 2 vs Floor 3.** Soften Floor 2's hardest rooms (Whence Wolf, The Strike/Break-er, Rusty Golem, Half-life Host) and/or strengthen Floor 3's Easy/Standard rooms so the run gets harder, not easier, after Floor 2.
2. **Extruzeon** needs a real threat.
3. **Classes:** leave the numbers; help newer players use the ability (a first-fight prompt, a pulse on the button until it's used each turn for the first few runs).
4. Bosses Heating Elemental / The Necrorancher: no change needed for most players.

## 9. Maneuver dice and Dungeoneer, regular player at Depth 0 (4 pairs x 300 / 2 origins x 300)
| Maneuver variant | Win | HP lost per fight F1 / F2 / F3 |
|---|---|---|
| Today | 76% | 3.9 / 6.7 / 7.2 |
| All Attack dice | 83% | 2.5 / 5.8 / 7.2 |
| Momentum | 91% | 2.5 / 5.5 / 6.9 |
| Dodge Block | 95% | 1.6 / 4.4 / 6.6 |

- **Maneuver dice are a net loss for regular players too (-7 vs Attack dice),** so the payoff question matters for everyone, not just experts. Full-strength Momentum (+15) and Dodge Block (+19) overshoot here as well; **a half-strength payoff is the right size** (landing near Attack-die parity, roughly +7).

| Class (regular player, Depth 0) | Win |
|---|---|
| Guard | 76% |
| Armsmaster | 76% |
| Arcanist | 80% |
| Dungeoneer as is | 82% |
| Dungeoneer + all-edge wrap | 87% |
| Dungeoneer + zone die -> Pivot | 82% |

- For regular players Dungeoneer is already the strongest class, so **no Dungeoneer buff is needed**; the expert-only weakness is better answered by the ability-teaching idea than by a buff.

## 10. Performance trace: one turn's playback (CPU x4, studies paused, ms)
| Variant | script | style | layout | paint | raster | composite | commit |
|---|---|---|---|---|---|---|---|
| Today (2 runs) | ~1450-1500 | ~530-590 | ~270-290 | ~330-380 | ~640 | ~420-450 | ~100 |
| No `filter` | 1694 | 632 | 321 | 332 | 573 | 440 | 99 |
| No box/text shadows | 1426 | 665 | 251 | 207 | 458 | 228 | 58 |
| No continuous animations | 1474 | 385 | 266 | 135 | 423 | 84 | 31 |
| No room floor art | 1297 | 385 | 265 | 448 | 451 | 482 | 78 |

- **Continuous animations (idle bobs, glows, pulses) drive most of the paint and compositing cost:** stopping them cuts paint by ~60% and compositing by ~80%.
- **Shadows come second** (paint -40%, compositing -50%).
- **`filter: drop-shadow` barely matters.** This corrects the earlier TODO guess that it was the main cost.
- The room floor costs ~150 ms of style recalculation per turn.
- Script (~1.4 s at CPU x4) is still the largest single bucket.
- Next steps, in order:
  1. Pause idle animations while a turn plays back (or during any redraw).
  2. Move the busiest looping animations to transform/opacity only.
  3. Look at the room floor's selectors.
  4. Profile the script side of turn playback.

## 11. Off-the-cuff suggestions (opinions, not study results)
- **Teach the class ability:** a one-time prompt in the first fight ("Your Guard can turn a die into Block once per turn"), plus a soft pulse on the ability button until it's used each turn for the first few runs. The data says this is worth more to new players than any number change.
- **Lethal warning that counts D.O.T.:** show a skull/red tint on the hp bar when the enemy's next turn plus bleed/poison would finish you.
- **Camp rest preview:** show "+X HP" ghosted on the hp bar before you choose Rest.
- **Loot "replace which die?" hint:** highlight the weakest die of the same type when a loot die is offered.
- **Volume sliders** (music / effects) in place of on/off, now that there's a full soundtrack.
- **Run summary card** on game over/victory: class, origin, depth, best path, dice bag, relics. Shareable as an image; it doubles as free marketing.
- **Daily seed:** the same dungeon for everyone each day, with a simple local streak counter. Cheap to build on the existing seeded runs and gives a reason to come back.
- **Floor 3 identity:** if Floor 3 gets stronger, a twist (e.g. minions start on the board, or one mutating die per room) may beat raising numbers.
- **Extruzeon:** its theme (3D printing waste) suits a growing threat, such as a Minion "extruded" every turn that hits harder the longer it stays.
- **Maneuver dice:** half-strength Momentum (a landed Maneuver gives the next Attack +1) reads clearly and is the size the studies support.
- **Codex:** a small bestiary/relic book that fills in as you meet things. It's a natural home for the names-sheet flavor lines.
