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
