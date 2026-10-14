# Campfire choice and the Back Pocket trap (Oct 14, 1.41.14 vs 1.41.15)

Bots: regular, new and expert (internal depth 7) profiles, 4 origin x class pairs, 200 runs each per build. In 1.41.15 the bot rests at 60% HP or below, otherwise combines dice (Train), otherwise rests. In 1.41.14 it rests at every camp and then combines.

| Profile | 1.41.14 (rest + combine) | 1.41.15 (Rest OR Train) |
|---|---|---|
| Regular, depth 0 | 73% | 81% |
| New, depth 0 | 55% | 69% |
| Expert, depth 7 | 37% | 56% |

The campfire choice gives the player *less*, yet the bots win more. Camp logs (60 runs, Dwarf Guard): 1.41.14 rested 336 times and combined 235 times; 1.41.15 rested 188 times and combined 132 times, with nearly the same total healing (1,191 vs 1,090 HP; old rests often happened at full HP).

The cause is **combining itself**. Same 1.41.14 rules, regular players:

| Bot at camp | Dwarf Guard | Gnome Armsmaster |
|---|---|---|
| Rest and combine (old default) | 70% | 66% |
| Never rest, combine | 36% | n/a |
| Rest, never combine | **85%** | **89%** |

Combining turns 3 dice into 1, so the Back Pocket shrinks by 2. Every Back Pocket die is a revive (at 0 HP a random Pocket die is rolled; any non-blank face restores 5 HP), so one combine costs about two revives, which outweighs the better die. Most likely the same holds for human players, who will see "upgrade" as obviously good.

Consequence for the campfire: for a player who knows this, Train is a trap and Rest is always right, so the choice is not a real choice yet. The bot numbers above reflect the bots combining less, not the campfire being easier.

## Decision for Jeremy
Make Train worth giving up a Rest. Options:
1. **Revives stop depending on how many dice are in the Pocket** (e.g. a fixed number of revives per run or per floor, shown as a counter). Combining then has no hidden cost, and the Back Pocket is just storage.
2. **Combining keeps the Pocket size**: the two leftover slots get basic dice back (e.g. two Maneuver I), so you trade quality, not revives.
3. **Leave it** and accept that combining is a hidden trap (not recommended: it punishes the obvious move).
