# Every shrine vs a same-floor loot pick (Oct 14-15, build 1.41.19)

Jeremy's rule (Oct 14): every shrine must be at least as good as a same-level loot pool.

Setup: `tools/balance/bg_shrines.py`, regular-player bot, Dwarf Guard and Pixie Arcanist, 200 runs each (400 per row). Every eligible room on the shrine's floor is a shrine (2 per floor), and the tested shrine is forced there. The yardstick ("loot pick") is the same forced room with its boon removed and a 2-die loot pick of the floor's tier instead. With 400 runs a row, differences under ~5 points are noise.

Correction (Oct 15): the first yardstick runs let every shrine in the run hand out loot (the switch was global), which put the bar at 88-91%. Fixed in `study_maneuver.js`; only the yardstick runs were redone.

Absolute win rates are low because two fights per floor become shrines (fewer fights = less loot); read the difference column.

| Floor | Shrine | Win % | vs loot pick |
|---|---|---|---|
| 1 | *loot pick (bar)* | 57.5 | |
| 1 | Blood-Drive Treats (pay 3 max HP, 1 of 3 relics) | 25.2 | **-32** |
| 1 | Scroll Dispenser: CRELA (Nullify x3) | 27.0 | **-31** |
| 1 | Scroll Dispenser: AWSP (Swap x2) | 30.8 | **-27** |
| 1 | Sacred Bellows (+5 max HP) | 44.2 | **-13** |
| 1 | Half-Empty Fountain (heal 10 or +5 max HP) | 50.2 | **-7** |
| 1 | Loot-Diagonalizer | 55.5 | -2 |
| 1 | Expediting Spores | 59.8 | +2 |
| 1 | Ecclectrical Outlet | 60.2 | +3 |
| 1 | Ark of the Flood | 76.2 | +19 |
| 1 | Healthy Hearth | 82.0 | +25 |
| 1 | Surgery Community Theatre | 85.5 | +28 |
| 2 | *loot pick (bar)* | 64.0 | |
| 2 | Scroll Dispenser: GIB (x4 Boost x2) | 32.0 | **-32** |
| 2 | Scroll Dispenser: DOER (Reroll x2) | 34.0 | **-30** |
| 2 | Enchanted Anvil (Attack I -> II) | 38.8 | **-25** |
| 2 | Cryotherapist (heal 8 or Freeze) | 45.5 | **-19** |
| 2 | Time-Intensive Shrine (skip a campfire, 1 of 3 relics) | 52.8 | **-11** |
| 2 | Half-Full Fountain | 62.2 | -2 |
| 2 | Alchemists Stone | 66.5 | +3 |
| 2 | Department Spore | 67.8 | +4 |
| 2 | Ferrous Maiden | 73.2 | +9 |
| 2 | Blood of Spanneroth | 76.8 | +13 |
| 3 | *loot pick (bar)* | 66.3 | |
| 3 | Madpie Nest (1 of 3 loot/tempo relics) | 44.2 | **-22** |
| 3 | Faustian Spreadsheet (pay 5 max HP, 1 of 4 relics) | 44.8 | **-22** |
| 3 | Scroll Dispenser: TSOP (Freeze x1) | 46.8 | **-20** |
| 3 | Charged Fae-Lines (1 of 3 path relics) | 48.2 | **-18** |
| 3 | Storied Emporium (1 of 3 relics) | 59.8 | **-7** |
| 3 | Indoctrination Inoculation (1 of 3 defense relics) | 60.5 | **-6** |
| 3 | Scrying Spheroid | 62.5 | -4 |
| 3 | Ruinous Rune Room | 64.0 | -2 |
| 3 | Correctly-Designed Fountain | 68.2 | +2 |

What it means:
- 17 of 30 shrines are clearly below the bar. Every token shrine (Scroll Dispensers) is far below; so are the relic-choice shrines (a relic is worth less than two loot dice, matching the Oct 14 knockout: loot -54, relics -18) and the max-HP shrines.
- Caveat: the regular bot uses tokens only some of the time (tokenRate 0.3), so token shrines are understated somewhat; they were also the weakest shrines in the Oct 13 study with the expert bot.
- Heal/HP shrines that beat the bar (Healthy Hearth, Surgery Community Theatre, Ark of the Flood) are well above it.

Decision for Jeremy: how to lift the 17 (see chat, Oct 15).
