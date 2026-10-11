# New content plan: monsters, third Big Boss, Magic dice (Oct 11 2026, build 1.37.0)

Jeremy approved: even out the bosses (done in 1.37.0) and use the balanced profiles as the "bones" of the new monsters and bosses; all his spare monster names for the open slots; post-telegraph (herald) minions for the dangerous minion cases only; no universal brace; new Magic dice fill the action holes (more Freeze, Swap and Reroll faces).

## 1. Is coin-flip unevenness game-wide? (`tools/balance/study_gamewide.py`, 1,600 normal runs, strong bot)

**Mostly no.** Regular encounters are even within their tier, and they rarely end runs:
| Tier spread | HP cost per fight, lowest to highest | Fights that end the run |
|---|---|---|
| F1 easy / standard / elite | 1.9-2.4 / 2.2-3.6 / 3.0-4.4 | under 0.3% |
| F2 easy / standard / elite | 4.2-5.4 / 3.3-5.1 / 4.4-6.9 | 1-10% |
| F3 easy / standard / elite | 0.7-2.4 / 2.2-3.5 / 2.9-8.2 | under 3% |
| Bosses after 1.37.0, F1 / F2 / F3 | 8.1-9.4 / 8.0-10.2 / 11.9-14.4 | 3-6% / 15-20% / 4-15% |

**Where it is still coin-flip:**
1. **The Strike-Breaker** (Floor 2 Deadly): 13.8 HP per fight and **34% of the runs that meet it end there**. That's because 6 damage doubles to 12 on every other turn. Recommended fix: 4 damage (8 on heavy turns), which would put it at about boss level.
2. **Healing access decides runs.** Floor 2 is attrition: the bot reaches each boss with about 13 HP, and each Floor 2 boss costs about 10. Holding a Medsack at the start of Floor 2 raises the bot's run win rate from 56% to 79% (n=410). Healing Draught adds +9 points, and Bloodletter's Fang +28 points (small sample). Building around damage instead doesn't move win rate. This is the game-wide coin flip: whether the loot offers you healing.
3. **Telegraphs still barely reward reading them.** For the bot, play skill is worth under 1 HP per boss fight, because most trays can't answer a wind-up. Only 5 of the 52 loot dice have Freeze (none in Alloy), only 11 have Block, and no die has Swap or Reroll. Section 4 targets this hole.
4. Two relics look bad: Hungry Blade and Venom Vial holders win about 22 points less. The samples are small (about 50), and it isn't explained by bargain-shrine costs. This needs real play data before acting.
5. F3 elites spread 2.8× (Sacred(?) Geometry 2.9 HP vs Bio-Mutant Escape 8.2), but none of them ends runs. This is fun variation, not a coin flip.

## 2. New monsters (his names; stats from the balanced bones)
Regular enemies use flat stats. Elite and deadly enemies get heavy turns (elite every 3rd turn, deadly every 2nd). Targets come from the measured tier costs above.
| Slot | Name (art?) | Bones | Draft stats | Target |
|---|---|---|---|---|
| F2 Easy | **Rabbid Rabbats** | Armored Gear-Pest | 22 health, 2 dmg, 1 Minion (soft cap, a weak swarm) | about 4.5 HP |
| F2 Easy | **Roudy Rinotter** (art) | The Warcart | 24 health, 2 dmg, 1 heal | about 4.5 HP |
| F2 Deadly | **Whence Wolf** (art) | F2 boss profile | 32 health, 3 dmg (6 on heavy turns), 1 D.O.T. | about 9-10 HP, 15-20% |
| F3 Deadly | **Eelagator Escapee** (art) | Self-Replicating Forge | 44 health, 4 dmg, 2 Shield, herald-style 3 Minions on heavy turns | about 9-10 HP |
| F1 Deadly (optional, for Dread) | **Prickly Porcupanther** | F1 elite ×1.3 | 22 health, 3 dmg, 1 Shield | about 5 HP |
| F1 Standard (extra) | **Untamed Unicrows** | Grafted Grifter | 14 health, 2 dmg, 1 D.O.T. | about 3 HP |
| F3 Elite (extra) | **Toadtaur Warrior** | Gnome Chomper | 30 health, 5 dmg | about 5 HP |

## 3. Third Big Boss: Toadtaur Wizard (bones: the evened Floor 3 profile, about 13 HP per fight)
Health 85. Base attack 4.
Move names follow the math-pun theme:
- **Hex Factor:** 3 D.O.T.
- **Square Root:** roots itself for 5 Shield.
- **Exponential Croak:** wind-up, 11 damage.

Phase 2, **Leap Year**, at half HP: the Toadtaur Warrior joins.
- Base attack 4, plus 1 Minion each turn.
- **Lily Pad Lemma:** wind-up with herald (brings 3 Minions), 3 damage per Minion.
- **Exponential Croak:** 11 damage.

## 4. Magic dice that fill the action holes
**Holes:**
- Freeze is on only 5 dice (none in Alloy).
- Block is on only 2 Magic dice.
- Swap and Reroll don't exist.
- Attack-heavy Magic dice have no way to answer a telegraph.

**Rules for the returning faces (Jeremy, Oct 11):**
- **Reroll:** reroll ONE die of your choice.
- **Swap:** swap the Swap face's die with one die of your choice (they trade places).

Claude's assumption, to confirm: tap it before building the path; the die is then spent for the turn.

Draft dice (Magic 12 → 16):
| Die | Faces | Hole it fills |
|---|---|---|
| **Absolute Zero Elixir** (gnome) | Freeze, Freeze, Hit 3, Hit 3, Combo 2, blank | Freeze for attack builds |
| **Commutative Changeling** (pixie) | Swap, Swap, Combo 3, Combo 2, Pivot, blank | pathing that sets up big Combos |
| **Law of Large Numbers** (dwarf) | Reroll, Reroll, Hit 3, Boost 3, Block 3, blank | fishing for an answer to a wind-up |
| **Icebox Pi** (halfling) | Swap, Block 4, Block 4, Freeze, Heal 3, blank | a defensive answer, plus some healing (point 2 in section 1) |

## Questions for Jeremy
1. Slot picks in section 2: OK as drafted? Any names on different slots?
2. Toadtaur Wizard as the third Big Boss, with the Toadtaur Warrior joining in phase 2?
3. ~~Swap and Reroll rules~~: answered (see above).
4. ~~The Strike-Breaker~~: dropped to 4 damage in 1.37.1 (now ends 16% of the runs that meet it).

Names, stats, quests and flavor for all of the above are in the names sheet (blue cells), with faction themes: dwarves math/3D printing/engineering/mining, gnomes sorcery/biochemistry/illusions/grafting, halflings hillbillies/food, pixies illusions/trickery/old magic.

## 5. Swap and Reroll: edge cases and recommended defaults (for Jeremy's sanity check)
Confirmed: tap before building the path; the die is spent for the turn; shrine tokens work the same way.
1. **The spent die** acts as a blank for the rest of the turn (a path can't land on it). That's the cost, and it keeps Swap positional: the good die moves in and the spent Swap die sits where the good one was.
2. **Token versions have no die to move.** A Swap token swaps any two dice; a Reroll token rerolls one die of choice.
3. **No targeting Minion-covered dice** with either face, otherwise Reroll and Swap would scout hidden faces.
4. **Chains are bounded:** each die can use its Swap/Reroll face once per turn, and spent dice can't be targeted. A die rerolled onto Reroll can still be used. That's fine, because chains end when the dice run out.
5. **A reroll always shows a different face**, so it never feels wasted (repeated faces like Hit 3 / Hit 3 can still match).
6. **They are not path actions:** Boost doesn't multiply them, and they don't count toward "maneuvers" or "any actions" quests.
7. **Class zones interact on purpose:** move a die into your zone, then convert it (Armsmaster/Guard). A converted face moves with its die.
8. **No undo once done;** you can cancel between the first and second tap of a Swap.
9. **Plumbing:** spent state is saved for resume; the crash sim and bug hunt bots must use both faces, or bugs hide; icons and a "New action" tutorial card for each.
