# TODO studies (Oct 12 2026, build 1.39.0 in progress)

Four studies run while Jeremy worked through the names sheet. Bot = skill 1500, Block-aware, 1,600 normal runs unless noted.

## 1. Quest audit (design-consistency TODO): 15 quests could never complete
A static check of every quest against `checkQuests()` found 15 quests (of 78) whose condition or reward the game could not recognize. Their quest cards still showed a reward, so a player chasing one got nothing.

| Cause | Quests |
|---|---|
| "N+ damage" without "in a single turn" | Extruzeon `freeze: 20+ damage`, Toadtaur Wizard `freeze: 15+ damage`, Myceleus `nullify: 15+ damage`, Extractnid Matriarch `nullify: 10+ damage`, Unventilated Workshop `nullify: 12+ damage`, Self-Replicating Forge `1 freeze: 15+ damage`, Ergot Eruption `3 hot: 15+ damage` |
| "8 damage/turn" | Leper Con-Trap and Unauthorized Transfusion `1 nullify: 8 damage/turn` |
| "survive turn 4" (only "survive 4" / "survive to turn 4" were read) | Rusty Golem |
| No counter for combos / H.O.T. / D.O.T. faces | Myceleus `3 combos`, Bellicose Biomancer `3 hot`, `5 dot` |
| Freeze reward not handled (would have granted nothing) | Extruzeon, Toadtaur Wizard, Self-Replicating Forge |
| Undefined rule | Profane Geometry `adventurer H.O.T. = D.O.T.`, Sacred(?) Geometry `encounter D.O.T. = H.O.T.` |

Also found:
- "accumulate 5 block" (shown as "Bank 5 Block") counted Block dice played, not Block banked.
- "2 nullify" completed with 1.

**Fixed in 1.39.0** (all but the two Geometry quests). The quest cards now mean what they say. The bot's win rate is unchanged at 60%, because the bot doesn't aim for quests; players who chase quests get the rewards they're promised.

**Needs Jeremy:** what do "adventurer H.O.T. = D.O.T." and "encounter D.O.T. = H.O.T." mean? My guess: your H.O.T. equals your D.O.T. (both above 0) at the end of your path, and the encounter's D.O.T. equals its H.O.T.

## 2. Floor 3 curve (balance TODO: "Floor 3's curve runs backwards")
HP lost per fight by room position (bot, 1.39.0):

| | Room 1 | Room 2 | Room 3 | Room 4 | Room 5 | Boss |
|---|---|---|---|---|---|---|
| Floor 2 | 4.7 | 6.4 | 4.6 | 5.7 | 7.6 | 8.3 |
| Floor 3 | 2.6 | 5.1 | 3.4 | 6.7 | 9.7 | 11.1 |

- The curve is no longer backwards. The Floor 3 Big Boss is the hardest fight of the run, and the bot reaches it with about 18 HP after the mid-floor camp.
- **Floor 3's regular rooms are softer than Floor 2's.** They cost 2.6–5.1 HP and end under 3.5% of runs, while Floor 2's end 2–11%. Difficulty peaks on Floor 2, and Floor 3 is a breather before the Big Boss.
- The softest cards are on Floor 3:
  - Morel Dilemma (easy, 0.9 HP).
  - Chimeric Sludge and Extractnid Matriarch (standard, about 2 HP).
  - The Punished and Sacred(?) Geometry (elite, about 3 HP, below Floor 2's easy rooms).

**Options:**
- **A (recommended):** +1 attack for every Floor 3 standard and elite card, and +2 for the five softest cards above. This keeps the Big Boss as the peak and makes Floor 3 feel like the deepest floor.
- **B:** leave Floor 3 as a breather and take a little pressure off Floor 2 instead.

## 3. Gnome (origin-balance TODO): weakest origin at 47%
Gnomish Mushroom Cap today: Combo 1, Boost ×2, D.O.T. 1, D.O.T. 1, Leech 1, Dodge. 250 runs per class, 1,000 per option:

| Option | Guard | Armsmaster | Dungeoneer | Arcanist | Average |
|---|---|---|---|---|---|
| Today | 44 | 40 | 53 | 52 | **47%** |
| A: Leech 1 → Leech 2 | 59 | 64 | 67 | 67 | **64%** |
| B: both D.O.T. 1 → D.O.T. 2 | 51 | 51 | 63 | 60 | **56%** |
| C: Dodge → H.O.T. 2 | 60 | 69 | 68 | 70 | **67%** |

For reference: Halfling 71%, Dwarf 60%, Pixie 54%.
- Sustain is what wins, so A and C push Gnome up to Dwarf/Halfling levels.
- **B (recommended)** lands Gnome between Pixie and Dwarf and fits "biochemistry, continuous damage" without making it a second healer.

## 4. Sound audit (sound-pass TODO)
32 tones plus 2 noise effects (dice roll, player hit).

**Redundant / reused:**
- One "status" ping covers D.O.T., Nullify, Freeze and Boost, so four different actions sound identical.
- "pathTick" is used for path building, the shrine hold and Swap.
- The dice-roll sound plays for both a full tray scramble and a single Reroll.
- The "victory" tone is dead code (replaced by "grandVictory").

**Silent moments (gaps):**
- The enemy's turn as a whole: Shield, heal, H.O.T., Minion summons, and a wind-up warning appearing all play no sound. Only a hit that gets through makes noise (the "crash"), so a fully Blocked hit is silent.
- Your H.O.T. ticking up.
- Camp rest and dice upgrades.
- Swap and Reroll having their own identity.
- Freeze landing (it shares the status ping).

**Proposed palette (one theme: wood, metal and bells, matching the toy look):**
- Each action family gets its own instrument: Attack = sword swish (today's "hit"), Block = wooden knock, Heal/H.O.T. = soft bell, D.O.T. = low pluck, Freeze = glassy chime, Nullify = reversed swell, Boost = rising whistle, Maneuvers = airy whoosh.
- The rising-pentatonic ladder (already used for hits) extends to every path step, so a long path always climbs.
- Enemy turn: a short low drum before it acts; Shield = metal clank; enemy heal = muted bell; Minions = squeaky pops; wind-up = rising rumble.
- Dice materials: basic dice wood, Alloy metal, Gilded bright metal, Magic glassy.

All synthesized like today's sounds (no files).

## Decisions for Jeremy
1. The two Geometry quests: what should they mean?
2. Floor 3: A (harder rooms) or B (keep Floor 3 as a breather)?
3. Gnome: B (D.O.T. 2s), or A/C?
4. Sound: start the palette above?
