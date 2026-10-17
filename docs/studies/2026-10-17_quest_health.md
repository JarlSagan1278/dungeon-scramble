# Quest Health: does the cap matter, and what if it goes?

Oct 17, 2026 · bot study · **builds 1.41.54 and 1.41.56** (each number says which) · nothing in src/ was changed.

## Summary for Jeremy

**Short answer: you can remove Quest Health. Only one card gets too easy without it: Displacer Lair. Lower that card's rewards and drop the cap everywhere else.**

- **The cap rarely matters.** Only 16 of the 42 quest cards print more quest damage than their Quest Health. On the other 26 cards the cap can never cut anything. Bot players lose about **11 damage per run** to the cap (1.41.56). A whole run deals about 650 damage. So the cap takes away under 2%.
- **Where it bites:** Displacer Lair (cuts damage in 92-98% of fights), Ditched Heist (81%), Heating Elemental (49-57%), Adhesive Pest Traps (34-38%), Fungal Flayer (32-40%), Anti-Euclidian Space (14-30%). Everything else: rarely or never.
- **Removing it barely moves win rate.** Six bot pairings gave changes from −1 to +4 points. The average was about +1.5 points (for example 75.7% → 77.8% for a regular player on 1.41.56). That is about the size of random noise.
- **No boss or Deadly card becomes trivial.** Big Bosses print exactly their Quest Health (60), so the cap never cuts them. Heating Elemental pays its full 35 only around Rd 5, when it is already almost dead, so the fight is no shorter. Deadly cards don't change.
- **One card does become trivial: Displacer Lair.** Without the cap, "Path 6+" and "Path 8+" are almost free on turn 1. That's 20 bonus damage on a 25-HP trap. Regular players then kill it in **1 turn** (median), and **58%** take no damage at all (today: 2 turns, 19%). Keeping its cap fixes it (tested). An honest version prints smaller rewards, e.g. 5 / 5 / 5.
- **Easy traps get easier, not trivial.** Ditched Heist and Adhesive Pest Traps drop from 3 turns to 2 and lose 1-2 of the damage they deal you. Adhesive Pest Traps is an easy card, so that seems fine to me.
- **Do quests mostly help Maneuver dice?** On Floor 1, yes: Maneuver quests are about 55% of quest damage. Overall they are about 30%, and on Floor 3 about 10% (bots have swapped their Maneuver dice for loot by then). **But the cap is not what holds Maneuver back.** Most Maneuver quests sit alone on an enemy card whose Quest Health already covers the reward. Removing the cap adds only about 1-2 Maneuver quest damage per run. Most of the added damage goes to **Path-length** quests (any dice), plus Survive. The one Maneuver card the cap really limits is Adhesive Pest Traps (3/4/5 Maneuvers).
- **Quests are a small, even slice of damage.** Today they are 7-9% of all the damage a player deals, and 9-10% with no cap. Every class and origin earns about the same (3.8-4.7 quest damage per fight), so no playstyle depends on quests.
- **Chasing quests is worth about 2-3 points of win rate.** A bot that ignores quests wins 2-3 points less than one that goes for them. It also finishes 70-80% fewer Maneuver quests. So quests do give Maneuver dice a reason to stay in the tray, mostly on Floors 1-2.

**Recommendation:** drop Quest Health and let every quest pay what the paper says (this matches the audit's Option B). At the same time, cut Displacer Lair to a total of about 15, e.g. **5 / 5 / 5**, or make its paths longer (Path 8+ / 10+ / 12+). Your worry was a player maxing out every quest. In practice the multi-quest cards are traps, and "all quests in one fight" mostly happens on two of them (Displacer Lair and Ditched Heist). Fix Displacer Lair and nothing gets trivialized. If you want a Maneuver push, the cap is the wrong lever. Bigger rewards on Floor 2-3 Maneuver quests would do more (for example Chimeric Sludge, Gnome Chomper and Toadtaur Warrior, which bots finished in 0-16% of fights in this morning's audit).

---

## 1. How often the cap binds

**Which cards print more than their Quest Health** (static, 1.41.56; flat damage rewards only. D.O.T., H.O.T., Nullify and Freeze rewards are never capped):

| Floor | Card | Type / tier | Quest Health | Printed damage total |
|---|---|---|---|---|
| 1 | Displacer Lair | Trap, standard | 15 | 30 |
| 1 | Rigged Sporks | Trap, easy | 15 | 30 (never drawn, see audit) |
| 1 | Unauthorized Transfusion | Trap, easy | 15 | 20 (never drawn) |
| 1 | Leper Con-Trap | Trap, elite | 15 | 30 |
| 1 | Heating Elemental | Boss | 25 | 35 (one quest) |
| 2 | Rusty Golem | Enemy, elite | 8 | 16 (one quest) |
| 2 | Fungal Flayer | Enemy, elite | 10 | 16 (one quest) |
| 2 | Adhesive Pest Traps | Trap, easy | 20 | 45 |
| 2 | Ditched Heist | Trap, standard | 20 | 50 |
| 2 | Unventilated Workshop | Trap, easy | 20 | 30 |
| 2 | The Strike/Break-er | Trap, deadly | 20 | 30 |
| 2 | Bellicose Biomancer | Boss | 25 | 40 |
| 3 | Anti-Euclidian Space | Trap, elite | 30 | 45 |
| 3 | Ergot Eruption | Trap, standard | 30 | 35 |
| 3 | Self-Replicating Forge | Trap, deadly | 30 | 35 |
| 3 | Bio-Mutant Escape | Trap, elite | 30 | 55 |

Every other quest card (26) has Quest Health ≥ its printed total, so the cap can never cut it. That includes all three Big Bosses (60 = 30 + 30) and Ceramic Golem (40 vs 30).

**How often it cut damage, in play** (1.41.56, quest-seeking bot, today's cap). "Cut %" = share of fights against the card where the cap took something. "Lost" = average damage the cap took per fight.

| Card | Expert, depth 7: cut % | lost / fight | Regular, depth 0: cut % | lost / fight |
|---|---|---|---|---|
| Displacer Lair | 98% | 12.1 | 92% | 9.1 |
| Ditched Heist | 81% | 12.5 | 81% | 11.7 |
| Heating Elemental | 49% | 4.9 | 57% | 5.7 |
| Fungal Flayer | 40% | 2.4 | 32% | 1.9 |
| Adhesive Pest Traps | 34% | 5.0 | 38% | 5.8 |
| Anti-Euclidian Space | 30% | 4.5 | 14% | 2.2 |
| Leper Con-Trap | 23% | 3.2 | 12% | 1.7 |
| Unventilated Workshop | 20% | 2.0 | 9% | 0.9 |
| Bio-Mutant Escape | 15% | 1.4 | 13% | 1.1 |
| Rusty Golem | 10% | 0.8 | 14% | 1.1 |
| Bellicose Biomancer | 8% | 1.2 | 9% | 1.3 |
| Ergot Eruption, Self-Replicating Forge, Strike/Break-er | ≤3% | ≤0.1 | ≤3% | ≤0.1 |

**Per run:** the cap removes 10.6 (expert) / 11.2 (regular) damage per run on 1.41.56. On 1.41.54 it was 9.4 / 9.5. The difference comes from "survive to turn N" completing a round sooner in 1.41.56, which makes Heating Elemental's quest bind more often. Bots get 47-57 quest damage per run that is paid out.

## 2. No cap: what changes

**Win rate** (1,200 runs each; ±2.5 points is noise at this size):

| Build | Bot | Profile | Cap today | No cap | Change |
|---|---|---|---|---|---|
| 1.41.54 | quest-aware | expert, depth 7 | 54.8% | 57.0% | +2.2 |
| 1.41.54 | quest-aware | regular, depth 0 | 74.6% | 78.8% | +4.2 |
| 1.41.54 | quest-seeking | expert, depth 7 | 55.5% | 57.5% | +2.0 |
| 1.41.54 | quest-seeking | regular, depth 0 | 74.4% | 73.6% | −0.8 |
| 1.41.56 | quest-seeking | expert, depth 7 | 57.6% | 56.6% | −1.0 |
| 1.41.56 | quest-seeking | regular, depth 0 | 75.7% | 77.8% | +2.1 |

**Deaths by floor** (1.41.56, quest-seeking, cap → no cap): expert F1 8.6 → 9.3%, F2 21.7 → 20.8%, F3 12.2 → 13.2%. Regular F1 1.8 → 1.8%, F2 8.9 → 7.1%, F3 13.7 → 13.3%. Nothing moves beyond noise.

**Per card, where anything changed** (1.41.56, quest-seeking. Turns = median fight length; Taken = average HP lost in that fight; 0-dmg = share of fights where you take no damage):

| Card | Profile | Turns cap → none | Taken cap → none | 0-dmg cap → none | Death % cap → none |
|---|---|---|---|---|---|
| **Displacer Lair** (F1 standard trap) | expert d7 | 2 → 2 (mean 2.34 → 1.77) | 4.4 → 2.5 | 13% → 50% | 0 → 0 |
| | regular d0 | 2 → **1** (mean 2.30 → 1.66) | 3.2 → **1.7** | 19% → **58%** | 0 → 0 |
| Ditched Heist (F2 standard trap) | expert d7 | 3 → 2 | 6.2 → 4.1 | 13% → 14% | 4.3 → 0.7 |
| | regular d0 | 3 → 2 | 4.1 → 2.7 | 18% → 22% | 0.5 → 0 |
| Adhesive Pest Traps (F2 easy trap) | expert d7 | 3 → 2 | 4.4 → 3.4 | 10% → 37% | 6.0 → 2.7 |
| | regular d0 | 3 → 2 | 2.4 → 1.5 | 21% → 47% | 0 → 0 |
| Heating Elemental (F1 boss) | expert d7 | 4 → 4 | 7.8 → 7.8 | 1% → 1% | 9.5 → 10.2 |
| | regular d0 | 5 → 5 | 5.1 → 5.2 | 3% → 3% | 1.9 → 1.8 |
| Fungal Flayer (F2 elite) | both | 3 → 3 | 3.8-4.2 → 3.9 | +5-8 pts | no change |
| Bellicose Biomancer (F2 boss) | both | 4 → 4 | 8.8-9.3 → 9.1-9.2 | no change | no change |
| Big Bosses (all three) | both | 5-6 → 5-6 | no change | no change | no change (cap never binds) |
| Deadly: Strike/Break-er, Self-Replicating Forge, Whence Wolf, Eelagator | both | no change | within noise | within noise | within noise |

**Trivial?** Only Displacer Lair fits the definition: a median 1-turn fight, under 2 HP lost on average, and no damage in more than half the fights. Ditched Heist and Adhesive Pest Traps become noticeably easier (2-turn fights) but still deal damage. No boss or Deadly card changes.

## 3. Who benefits

**Quest damage by quest type** (1.41.56, quest-seeking bot, per run):

| Quest type | Expert: cap → none | Regular: cap → none | Completions per run (regular) |
|---|---|---|---|
| Maneuver faces (Maneuvers / Dodge / Leap / Pivot) | 14.9 → 15.6 | 16.9 → 18.8 | 2.4-2.5 |
| Path length (Path N+ / Path 1-3) | 10.7 → 16.7 | 14.2 → 20.3 | 1.5-1.6 |
| Survive (Reach Rd N) | 5.7 → 7.1 | 7.0 → 10.2 | 0.4 |
| Boost / Nullify faces (mostly Extruzeon's "3 Boosts") | 5.6 → 6.5 | 5.4 → 5.6 | 0.2 |
| Combos (Myceleus "3 Combos") | 4.2 → 3.6 | 5.8 → 6.6 | 0.2 |
| H.O.T./D.O.T. amount (Biomancer) | 2.1 → 2.2 | 2.9 → 3.4 | 0.2 |
| Heal / Block / Support faces | 2.0 → 2.2 | 2.6 → 2.5 | 0.2 |
| Bank Block | 1.2 → 2.1 | 1.0 → 1.7 | 0.1 |
| Blanks | 0.9 → 2.9 | 0.7 → 2.0 | 0.1 |
| Damage threshold (pays D.O.T./Nullify/Freeze, never capped) | 0 flat | 0 flat | 2.3-2.8 (the most-completed type) |
| **Total flat quest damage** | **47.4 → 58.8** | **56.5 → 71.1** | 7-8 quests per run |

**By floor** (share of quest damage, 1.41.56 regular, today's cap): Floor 1 = Maneuver 55%, Survive 25%, Path 17%. Floor 2 = Path 37%, Maneuver 24%, Biomancer H.O.T./D.O.T. 19%. Floor 3 = Big Boss Boost/Combo quests 52%, Path 24%, Maneuver 11%. On Floor 3 the bots have mostly swapped their Maneuver dice for loot. The audit found the same, and real players do it too, just less.

**By class and origin** (1.41.56, today's cap, quest damage per fight): every class and origin earns 3.8-4.7, and Maneuver quests are 28-33% of it for each. Guard and Halfling are slightly higher (4.3-4.7), likely because they survive into longer fights. No class or origin leans on quests.

**Quest damage as a share of all damage dealt** (path damage + flat quest damage + quest D.O.T.): 1.41.54 cap 6.5% (expert) / 7.6% (regular), no cap 8.1% / 9.1%. 1.41.56 cap 7.4% / 8.5%, no cap 9.0% / 10.4%.

**Does chasing quests matter?** (1.41.54, today's cap). The bot that ignores quests vs the quest-aware bot:

| | Expert d7 | Regular d0 |
|---|---|---|
| Win rate: ignores → quest-aware | 52.8% → 54.8% | 71.3% → 74.6% |
| Flat quest damage per run | 32.5 → 40.5 | 37.7 → 49.2 |
| Maneuver quests finished (per 1,200 runs) | 1,408 → 2,437 | 1,572 → 2,818 |

So chasing quests is worth 2-3 points of win rate. Most of the gain is Maneuver quests, which nearly double. The extra "+4 per quest" nudge (the quest-seeking bot) adds little on top: the reward itself is already what pulls the bot.

## 4. Middle options tested (1.41.56, quest-seeking)

| Option | Win rate expert d7 / regular d0 | Displacer Lair (regular) | Ditched Heist (regular) | Adhesive Pest Traps (regular) |
|---|---|---|---|---|
| Today (cap) | 57.6% / 75.7% | 2 turns, 3.2 taken, 19% 0-dmg | 3 turns, 4.1 taken | 3 turns, 2.4 taken |
| Cap × 1.5 | 56.9% / 76.7% | **1 turn, 1.8 taken, 52% 0-dmg** | 2 turns, 2.8 taken | 2 turns, 1.8 taken |
| No cap except Displacer Lair | 60.1% / 76.8% | 2 turns, 3.3 taken, 18% 0-dmg | 2 turns, 2.5 taken | 2 turns, 2.2 taken |
| No cap | 56.6% / 77.8% | **1 turn, 1.7 taken, 58% 0-dmg** | 2 turns, 2.7 taken | 2 turns, 1.5 taken |

Cap × 1.5 doesn't fix Displacer Lair: a cap of 22 is still most of its 25 HP, and the papers would still show numbers they can't pay. Keeping the cap only on Displacer Lair works as well as the other options. Printing that limit on the paper (smaller rewards) is the honest version of the same thing.

## Recommendation

1. **Remove Quest Health.** Every quest pays what its paper says. The win rate change is within noise. No boss or Deadly card gets easier, and the papers stop lying (the audit's 21 "shows more than it pays" flags go away). This fits "strong player pieces are fine": quests are player rewards.
2. **Displacer Lair: lower the rewards to about 15 total** (5 / 5 / 5), or keep 10 / 10 / 10 with longer paths (Path 8+ / 10+ / 12+). Without one of these it becomes a free room.
3. **Optional watch:** Ditched Heist (Path 1-3 is free) and Adhesive Pest Traps become 2-turn fights. They are fine under the balance philosophy. If they feel flat in play, trim Ditched Heist's "Path 1-3" reward to 10.
4. **If you want quests to help Maneuver dice more**, change the Maneuver quests themselves, not the cap: bigger rewards on Floor 2-3 Maneuver quests (Chimeric Sludge 12, Gnome Chomper 6, Toadtaur Warrior 8, Whence Wolf 10). Bots rarely finish those, because by then their trays hold few Maneuver dice.

## Method

- **Builds.** The main grid ran on a 1.41.54 snapshot: today's cap vs no cap, for the quest-aware, quest-seeking and quest-ignoring bots. The container then restarted, and the rest ran on a 1.41.56 snapshot (commit 099d831, clean tree): quest-seeking bot with today's cap, no cap, cap × 1.5, and no cap except Displacer Lair. 1.41.56 changed survive timing (one round sooner) and Biomancer quests (H.O.T./D.O.T. amounts). It also fixed Boost tokens. Comparisons are only made within one build.
- **Harness.** `tools/balance/study_qh.js` wraps `study_maneuver.js` (DFS best-path bot, player-like choices). Expert = skill 1500 at internal depth 7 (foes, fury, rest, swarm). Regular = the calibrated profile (skill 60, ability 35%, tray actions 30%, tokens 30%, random loot 60%) at depth 0. Each variant ran 4 origins × 4 classes × 75 runs: 1,200 runs, 300 per origin. Grid: `bg_qh.py` (`QH_BUILD=56` for the newer snapshot). Aggregation: `agg_qh.py`.
- **Cap patch.** Done inside the page only: the drawn encounter's `questHealth` is set to null (no cap), × 1.5, or kept on listed cards. `applyQuestReward` is wrapped to log each completion: quest, reward kind, printed amount, amount paid, and what today's cap would have paid.
- **Does the bot pursue quests?** `harness.js` ignores quests. `study_maneuver.js` adds the quest's reward to a path's score, but only knew some phrasings ("N damage in a single turn", not "8 damage/turn", "15+ damage", "accumulate", combos, nullify counts). For this study the bot's quest check mirrors the game's `checkQuests()` exactly, so it goes for every quest a path can finish:
  - Flat damage counts toward the kill.
  - D.O.T. is valued ×1.2, H.O.T. ×0.8 when hurt, Nullify 2.5 and Freeze 4.
  - Survive quests are not a path choice, so they count 0.
- **Bot variants.** "Quest-aware" = the mirror above. "Quest-seeking" = also +4 score for each quest a path would complete, a stand-in for a human going for the goal on the paper. "Ignores quests" = `questAware:false`, so it only finishes quests by accident.
- **Caveats.**
  - Bots shed Maneuver dice for loot by Floor 3, so Floor 3 Maneuver numbers are low.
  - Rigged Sporks and Unauthorized Transfusion never appear (Floor 1 room rule), and Prickly Porcupanther only with Dread.
  - Per-card numbers are from roughly 60-650 fights each, so small changes are noise.
  - "Taken" for a fight you died in counts the HP you started it with.
- **Files.** Raw data: `tools/balance/out_qh_*.json` (1.41.54) and `out_qh56_*.json` (1.41.56); these are git-ignored. The scratch HTML snapshots were deleted.
