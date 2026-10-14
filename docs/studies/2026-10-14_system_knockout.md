# System knockout study (Oct 14, build 1.41.16)

Question (Jeremy): are other systems carrying the win rate the way the old Back Pocket revive did? Method: regular-player bots, depth 0, 4 origin/class pairs x 200 runs, with one player system switched off at a time. With 800 runs, differences under about 3.5 points are noise. Baseline: **53.9%**.

| System switched off | Win rate | Change | Runs ending on F1/F2/F3 (%) |
|---|---|---|---|
| Loot reaches the Tray (loot always kept in the Pocket) | 0.1% | -53.8 | 46 / 95 / 95 |
| Camp rest | 31.9% | -22.0 | 8 / 43 / 40 |
| Back Pocket revive | 33.2% | -20.6 | 13 / 41 / 35 |
| Relics | 35.4% | -18.5 | 6 / 30 / 47 |
| Quest rewards | 38.0% | -15.9 | 10 / 28 / 41 |
| Class Skill (Armsmaster/Guard conversion) | 51.8% | -2.1 | 5 / 24 / 28 |
| (baseline) | 53.9% | | 3 / 23 / 28 |
| Tokens | 55.0% | +1.1 | 4 / 21 / 27 |
| Combining dice (Train) | 55.5% | +1.6 | 1 / 18 / 31 |
| Swap / Reroll faces | 56.2% | +2.4 | 4 / 20 / 27 |
| Shrines (every room is a fight) | 59.0% | **+5.1** | 3 / 20 / 24 |

## Reading
- **No single hidden inflater like the old revive.** The five big pillars (loot, rest, revive, relics, quests) each carry 16-22 points, which is healthy: each is a system players should care about, and none dominates the others. Loot is the engine of the game (as it should be).
- **Shrines are a net loss.** With shrines off, every room is a fight, and the extra loot outweighs every shrine boon and the relics shrines give (relics alone are worth 18 points, yet removing shrines still raises wins by 5). A shrine room is worth less than a fight room. This matches the Oct 13 shrine study (weak shrines) and the planned shrine overhaul.
- **Combining (Train) still adds nothing**, even with the revive fixed: bots that always Rest do slightly better. Train is the weaker campfire choice, so the choice isn't balanced yet.
- **Swap/Reroll faces and tokens add nothing for the bot.** The bot uses them crudely (30% of the time, no planning), so this is a "check with real players" item, not proof they're dead content.
- **Class Skill is small for regular bots** (they use it 35% of the time); real players use it almost every turn (tester: 46 of 53 turns), so its human value is higher.

## Follow-up: stronger Train and shrine loot (build 1.41.16 + switches UPGRADE_COST, SHRINE_LOOT; both off)

| Variant | Regular D0 | New D0 | Runs ending F1/F2/F3, regular (%) |
|---|---|---|---|
| Today | 57% | 35% | 2 / 18 / 29 |
| Combine needs 2 dice | 57% | 37% | 2 / 18 / 30 |
| Combine needs 2 dice, bot never combines | 57% | | 1 / 18 / 30 |
| Shrines also give a 2-die loot pick | **83%** | **64%** | 2 / 8 / 9 |
| Both | 83% | 66% | 0 / 8 / 10 |

- **Cheaper combining changes nothing.** Combining or not, 57%. Basic dice get replaced by loot as the run goes on (median 12 loot dice owned on Floor 3), so upgrading a basic die only pays until loot replaces it. Train needs to improve something that stays: loot dice, or something other than dice.
- **A loot pick at every shrine is far too strong** (+26 points; it undoes the revive change). One extra loot pick per shrine is worth more than any boon. A smaller version (one random die, no choice) or loot only from some shrines would be the next thing to test.
- Loot dice are the dominant power source of a run; every extra loot pick is worth a lot.

## Follow-up: stronger level II/III basic dice (Jeremy's idea)

Moderate: Attack II Hit2 Hit2 Combo2 Hit1 + 2 blanks; Attack III Hit3 Hit3 Combo3 Hit2 Hit1 + 1 blank; Maneuver II Dodge Dodge Leap Pivot Block2 Block2; Maneuver III Dodge Leap Pivot Block2 Block2 Boost x2.
Significant: Attack II Hit3 Hit2 Combo2 Combo2 Hit1 + 1 blank; Attack III Hit4 Hit3 Combo3 Combo3 Hit2 Hit2; Maneuver II Dodge Leap Pivot Block2 Block2 Boost x2; Maneuver III Pivot Pivot Leap Block3 Block3 Boost x2.

| Basic dice | Regular D0 | New D0 | Regular, bot never combines | What combining is worth |
|---|---|---|---|---|
| Today | 57% | 35% | 57% | 0 |
| Moderate | 61% | 39% | 53% | +7 |
| Significant | 68% | 49% | 57% | +11 |

Stronger II/III dice make Train worth taking (the gap between combining and never combining goes from 0 to +7 or +11 points). Moderate raises the overall win rate only ~4 points; Significant raises it ~11, which undoes much of the revive change.

## Campfire policies on 1.41.17 (shipped moderate basics)

| Bot policy at each campfire | Regular D0 | New D0 |
|---|---|---|
| Only Rest | 57% | 39% |
| Only Train (combine whenever possible, never rest) | 38% | 26% |
| Mix: rest at or below 40% HP, else Train | 55% | |
| Mix: rest at or below 60% HP, else Train | **61%** | 39% |
| Mix: rest at or below 80% HP, else Train | 59% | |

Neither choice dominates: always training is far worse than always resting, and choosing by HP beats both for regular players (+4 over Only Rest). For new players the 60% mix ties Only Rest. That is the shape a real choice should have.
