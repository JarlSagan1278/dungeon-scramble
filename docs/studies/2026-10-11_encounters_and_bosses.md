# Encounter tiers, boss rework, Pivot → Boost (build 1.34.0, Oct 11 2026)

Owner direction (Oct 11): rework bosses so they are much more challenging and strategic around the next-turn info; tag every floor's encounters by difficulty to control the curve across repeat plays and depth; open to enemies taking multiple actions a turn and to turning difficulty up significantly; nerf Self-Replicating Forge or keep it as a rare ultra-difficult encounter.

All numbers: `tools/balance/study_maneuver.js`, bot skill 1500, 4 origin/class combos (dwarf/guard, gnome/armsmaster, halfling/dungeoneer, pixie/arcanist), 300 runs per combo, today's rules unless noted.

## 1. Encounter difficulty today, every floor

Each floor is Camp → 3 rooms → Camp → 2 rooms → Boss. Rooms are drawn at random (at most one Trap and one Shrine per segment; the first room of the run is always an Enemy), so difficulty order is luck.

"Taken" = average HP lost per fight; "died" = share of fights against it that ended the run.

**Floor 1** (median taken ≈ 2.9)
| Proposed tier | Encounter (taken / died %) |
|---|---|
| Elite | Amanitabomination 5.2, Leper Colonizers 4.3 |
| Standard | Leper Con-Trap 3.9, Unbound Automa 3.7, Grafted Grifter 3.7, Displacer Lair 3.3, Feral Pet Rock 2.9, Viscous Orb 2.3 |
| Easy | Unauthorized Transfusion 1.9, United Separatists 1.8, Wooden Golem 1.5, Rigged Sporks 1.4, Beaker Breakers 1.4, Filement Bunny 1.4 |
| Bosses | Heating Elemental 5.8, Grosteque Grafter 3.2, Rogue Golemancer 2.4 |

**Floor 2** (median taken ≈ 4.6; the floor where most runs die)
| Proposed tier | Encounter (taken / died %) |
|---|---|
| Deadly (rare) | **The Strike-Breaker 13.3 / 26%** (6 damage every turn, survival quests) |
| Elite | Half-life Host 7.9, Rusty Golem 7.9 / 6%, Illegal Operation 6.8, Lichen-Thrope 6.3, Fungal Flayer 5.3 / 5% |
| Standard | Rogue Technician 4.8, Displacer Kitty 4.5, Blastogenesis Engine 3.8, Armored Gear-Pest 3.8, Ditched Heist 3.8, The Warcart 3.6, Adhesive Pest Traps 3.3 |
| Easy | Unventilated Workshop 0.0 (H.O.T. only, no attack) |
| Bosses | Bellicose Biomancer 5.3, Ceramic Golem 3.5, The Necrorancher 1.6 |

**Floor 3** (median taken ≈ 3.5)
| Proposed tier | Encounter (taken / died %) |
|---|---|
| Deadly (rare) | **Self-Replicating Forge 6.6 / 38%** (6 minions a turn; about 70% of all Floor 3 deaths) |
| Elite | Anti-Euclidian Space 8.5 / 3%, Bio-Mutant Escape 7.1 / 4%, Gnome Chomper 6.3 |
| Standard | The Punished 3.9, Ergot Eruption 3.6, Profane Geometry 3.5, Sacred(?) Geometry 3.4 (swingy: worst 10% of fights cost 13+ HP), Extractnid Matriarch 2.4 |
| Easy | Chimeric Sludge 2.0, Parasite Seer 1.7, Gestalt Network 1.6, Oilephant's Foot 1.6, Morel Dilemma 0.0 (no attack) |
| Big Bosses | Extruzeon 4.5, Myceleus 0.9 |

Zero-threat cards (Morel Dilemma, Unventilated Workshop) and toothless bosses (The Necrorancher, Myceleus) need a real attack whatever tier they end up in.

### Proposed tier system (first draft; see section 5 for the approved version)
- Tag every Enemy/Trap with `tier: 'easy' | 'standard' | 'deadly' | 'elite'` (table above as the starting point; re-measure after the boss and enemy changes).
- Each floor's rooms follow a slot pattern instead of a pure random draw, e.g. **easy → standard → deadly, camp, standard → deadly, boss**. Repeat plays still vary (random card within each tier) but the curve always builds.
- **Elite** cards replace a deadly slot rarely (e.g. 10–15% per floor) and announce themselves (distinct door/room callout). Forge and Strike-Breaker move here; Forge's minions drop from 6 to about 4 so it is brutal but survivable.
- **Depth hooks:** a depth modifier can shift slots up one tier (easy → standard) and another can raise the elite chance. This gives depth runs a controlled ramp instead of only +HP%.

## 2. Bosses

**The core problem:** a boss does one stat per turn, stepping through a cycle of whichever stats it has (dmg → minion → shield → H.O.T. → heal → D.O.T.), while a regular enemy applies all its stats every turn. Extruzeon (dmg 6 → shield 2 → H.O.T. 1) attacks once every 3 turns; Myceleus (dmg 2, minion 2, H.O.T. 2, D.O.T. 1) attacks for 2 once every 4 turns. Bosses already show their cycle with the next action highlighted, but there's little to plan around.

Tested (test-only switches, not in the game):

| Boss mode | Win % | Deaths F1 / F2 / F3 (1,200 runs) | HP lost per boss fight F1 · F2 · F3 |
|---|---|---|---|
| Today (one cycle step per turn) | 74 | 11 / 190 / 104 | 3.8 · 3.4 · 2.6 |
| Attacks every turn, plus the cycle step | 64 | 29 / 261 / 143 | 6.7 · 6.6 · 6.8 |
| …plus phase 2 at 50% HP (two cycle steps a turn) | 56 | 68 / 328 / 127 | 8.8 · 9.1 · 8.8 |

The bot ignores the next-turn info, so these numbers measure raw pressure only. A human who plans around the telegraph should do better than the bot.

### Proposed boss design (recommended)
1. **Base attack every turn** plus **one telegraphed special** from a short, boss-specific move list (replacing the stat cycle). The special shown is always next turn's.
2. **Wind-up specials** are the strategic core: e.g. "Smelting Slam — 14 damage next turn", "Spore Bloom — 4 minions next turn", "Slag Wall — gains 10 Shield next turn". Each has a counterplay the player can see coming: stack Block, Freeze it, Nullify, burst it down first, or route around minions.
3. **Phase 2 at 50% HP**: new move list or faster specials (Big Bosses at least; floor bosses optional).
4. **Freeze/quest interplay:** a freeze skips the telegraphed special but not the base attack, so a single 20+ damage turn no longer deletes a Big Boss's whole threat (Extruzeon's tester fight).
5. Tune with the tier pass so floor bosses land at roughly "attack every turn" pressure (about 64% bot win rate) and Big Bosses near the phase-2 line.

## 3. Multiple actions per turn for regular enemies
Regular enemies already apply every stat each turn, so "multiple actions" here means new behavior. Options:
- **Intents for deadly and elite enemies:** alternate between a normal turn and a telegraphed heavy turn (e.g. "Charging: double damage next turn"), so next-turn info matters outside boss fights too. Recommended: it adds pressure and decisions at the same time.
- **Double strike:** deadly/elite enemies hit twice (Block absorbs each hit separately). Simple, pure pressure.
- Measured guide for size: +1 damage on every Floor 3 hit costs about 4 points of win rate; +2 costs about 8.

## 4. Pivot → Boost on Maneuver II/III

| Variant | Win % | HP lost / fight F1 · F2 · F3 | One-turn kills F1 · F2 · F3 |
|---|---|---|---|
| Normal runs, Pivot (today) | 74 | 3.0 · 4.8 · 3.2 | 13% · 3% · 10% |
| Normal runs, Boost x2 replaces Pivot | 76 | 3.0 · 4.8 · 3.3 | 12% · 3% · 10% |
| Normal runs, Pivot removed (blank) | 75 | 3.0 · 4.8 · 3.3 | 13% · 4% · 11% |
| All Maneuver dice start at II, Pivot | 84 | 2.6 · 4.6 · 3.3 | 15% · 4% · 12% |
| All Maneuver dice start at II, Boost | 89 | 2.2 · 4.4 · 3.4 | 19% · 4% · 11% |
| All Maneuver dice start at III, Pivot | 88 | 2.4 · 4.6 · 3.3 | 15% · 4% · 11% |
| All Maneuver dice start at III, Boost | 92 | 1.7 · 3.8 · 3.4 | 28% · 8% · 12% |

- In normal play the swap does nothing measurable: a run ends with about 0.15 Maneuver II+ dice on average (3 Maneuver I dice combine into one II at camp, plus one shrine).
- Where upgraded dice are common, Boost beats Pivot by 4–5 points and, on Maneuver III, doubles one-turn kills on Floors 1 and 2, which works against the goal of fewer one-shots.
- Recommendation: keep Pivot for now; revisit with the Maneuver meta once more play data is in.

## Notes
- Dead check: `render.js` tests `(e.actionCycle||[]).includes('minion')`, but `actionCycle` holds objects (`{type, value}`), so that half never matches. Harmless today because the same line also checks `e.minion>0`, but the boss rework should replace it.
- Reproduce: `node build.js`, then in `tools/balance` run `study_maneuver.js` with `bossMode`, `pivotFace`, `manLevel`, `hitAdd`, `fxAdd` (see the header of the script).

## 5. Approved plan and drafts for review (Oct 11, after Jeremy's answers)

Approved: the boss design in section 2, the tier system with **deadly as the rare tier** (names swapped from the first draft), Forge as a rare deadly with about 4 minions, real attacks for the zero-threat cards, and telegraphed heavy turns for elite and deadly enemies. Pivot stays.

### Tier coverage per floor
Each floor has 10 Enemies, 4 Traps and 4–5 Shrines. The slot pattern needs, per run per floor: 1 easy, 2 standard, 2 elite (a deadly card occasionally takes an elite slot). With the measured tiers as-is:

| Floor | Easy | Standard | Elite | Deadly | Problem |
|---|---|---|---|---|---|
| 1 | 6 (4 E, 2 T) | 6 (4 E, 2 T) | 2 (2 E) | 0 | Elite too thin: every run sees both. Easy and standard have surplus. No deadly. |
| 2 | 1 (1 T, never attacks) | 7 (5 E, 2 T) | 5 (5 E) | 1 (T) | Easy badly short: every Floor 2 would open on Unventilated Workshop. |
| 3 | 5 (5 E) | 5 (4 E, 1 T) | 3 (1 E, 2 T) | 1 (T) | Elite thin. |

Both deadly cards are Traps, so a segment that already drew a Trap can't roll its deadly (the one-Trap-per-segment cap).

**Proposed reassignment** (to re-measure after the changes):
- **Floor 1:** promote Leper Con-Trap and Unbound Automa to elite → easy 6 · standard 4 · elite 4 · deadly 0. Recommend no deadly on Floor 1 (keeps the first floor fair for new players; depth can still raise pressure there).
- **Floor 2:** move Adhesive Pest Traps, The Warcart and Armored Gear-Pest down to easy, and give Unventilated Workshop an attack → easy 4 · standard 4 · elite 5 · deadly 1 (Strike-Breaker).
- **Floor 3:** promote The Punished and Sacred(?) Geometry to elite, move Chimeric Sludge up to standard → easy 4 · standard 4 · elite 5 · deadly 1 (Forge, minions 6 → 4).
- **Shrines** keep today's odds and one-per-segment cap, and may only take an easy or standard slot, never an elite or deadly one.
- **Deadly chance:** 12% per eligible elite slot on Floors 2 and 3 to start; a depth modifier raises it.

### Zero-threat fixes
- Morel Dilemma (minion 2, H.O.T. 2, no attack) → attack 2, H.O.T. 1.
- Unventilated Workshop (H.O.T. 2, no attack) → attack 2, H.O.T. 1.
- The Necrorancher and Myceleus are fixed by their new move lists below.

### Heavy turns for elite and deadly enemies (draft)
- Every elite or deadly enemy shows its next turn. **Elite:** every 3rd turn is a telegraphed heavy turn. **Deadly:** every 2nd turn.
- A heavy turn doubles the enemy's attack; an enemy with no attack doubles its biggest effect instead (minions, D.O.T., Shield).
- Freeze cancels a heavy turn's bonus, same as a boss special.

### Boss move lists (draft for review)
Every boss makes its **base attack every turn** plus the **special shown for this turn**; specials loop in order. Numbers are starting points for tuning (target from the bot test: floor bosses about 6–7 HP lost per fight, Big Bosses about 9).

**Floor 1**
| Boss | Base attack | Specials (in order) |
|---|---|---|
| Rogue Golemancer (24 HP) | 2 | Summon Golems: 2 minions → **Golem Slam: 6 damage** → Brace: 3 Shield |
| Heating Elemental (40) | 2 | Stoke: H.O.T. 2 → **Flashover: 7 damage** → Scorch: you gain 2 D.O.T. |
| Grosteque Grafter (50) | 2 | Graft Plating: 5 Shield → **Stitch-Rip: 6 damage** → Harvest: heals 4 |

**Floor 2**
| Boss | Base attack | Specials (in order) |
|---|---|---|
| The Necrorancher (35) | 2 | Raise the Herd: 3 minions → **Stampede: 2 damage per minion on your tray** → Cull: 4 damage |
| Bellicose Biomancer (50) | 3 | Mutagen: H.O.T. 3 → **Overgrowth Slam: 10 damage** → Spore Cloud: you gain 2 D.O.T. |
| Ceramic Golem (70) | 3 | Glaze: 6 Shield → **Shatterpour: 9 damage, then loses all its Shield** → Seep: you gain 2 D.O.T. |

**Floor 3 Big Bosses** (phase 2 at half HP)
| Boss | Phase 1 | Phase 2 |
|---|---|---|
| Extruzeon (90) | Base 4. Compactor: 4 Shield → **Waste Crush: 12 damage** → Recycle: H.O.T. 2 | "Meltdown": base 5. **Waste Crush: 12 damage** ↔ Slag Spray: 2 minions + you gain 2 D.O.T. (alternating, so a crush is always at most 2 turns away) |
| Myceleus (75) | Base 3. Sporulate: 3 minions → Rot: you gain 3 D.O.T. → **Mycelial Burst: 2 damage per minion on your tray** | "Fruiting Body": base 3, 1 extra minion every turn, specials as phase 1 |

The bold specials are the wind-ups. "Damage per minion" specials (Stampede, Mycelial Burst) make clearing minions before the telegraphed turn the strategic answer.

## 6. Shipped in 1.35.0 — measured results

Built as approved in section 5 with these tuning changes after measuring: Floor 1 boss base attacks 2 → 1, Flashover 7 → 6; Floor 2 boss base attacks 3 → 2, Overgrowth Slam 10 → 9, Glaze 6 → 5, Mutagen H.O.T. 3 → 2, Raise the Herd 3 → 4 minions; Myceleus base 3 → 4 and Mycelial Burst 2 → 3 per Minion. Shrines take an easy/standard room 40% of the time (max one per segment), which keeps roughly today's shrine count.

The study bot now values Block against the enemy's previewed next-turn damage (`intentAware`), so it braces for wind-ups the way a player would.

`python3 tools/balance/study_tiers_bosses.py 300 1500` (4 combos × 300 runs):

| | Before (1.34.0) | 1.35.0 |
|---|---|---|
| Win % (avg) | 74 | 59 (dwarf/guard 61, gnome/armsmaster 44, halfling/dungeoneer 79, pixie/arcanist 52) |
| Deaths F1 / F2 / F3 | 11 / 190 / 104 | 74 / 356 / 64 |
| HP lost per boss fight F1 · F2 · F3 | 3.8 · 3.4 · 2.6 | 9.3 · 9.5 · 14.6 |
| Boss fights that end the run F1 · F2 · F3 | under 1% | 6% · 13% · 5% |

Per boss (HP lost per fight / share of fights that end the run): Rogue Golemancer 7.4 / 2%, Heating Elemental 10.6 / 11%, Grosteque Grafter 10.1 / 5%; The Necrorancher 5.3 / 4%, Bellicose Biomancer 11.3 / 20%, Ceramic Golem 12.4 / 15%; Extruzeon 20.9 / 6%, Myceleus 8.1 / 3%.

By tier (HP lost per fight): Floor 1 easy 2.1, standard 3.0, elite 3.7; Floor 2 easy 4.8, standard 4.2, elite 6.1, deadly 13.9 (29% of Strike-Breaker fights end the run); Floor 3 easy 1.9, standard 2.5, elite 5.0, deadly 7.1.

Open questions for playtesting: Floor 2 now holds most deaths; Floor 1 regular rooms are close to harmless while its bosses are the main threat; Floor 2 "easy" cards hit harder than its standard ones (4.8 vs 4.2), so the Floor 2 split may need a second look; Myceleus is much softer than Extruzeon.
