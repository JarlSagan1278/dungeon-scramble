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
