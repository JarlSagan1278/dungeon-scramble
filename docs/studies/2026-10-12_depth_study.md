# Depth study (Oct 12 2026, build 1.39.2, player-like bot)

## Method
- **Bot:** player-like (tokens, class ability every turn, deliberate shrine and relic picks, Overkill and quest aware).
- **Origin and class pairs:** Dwarf Guard, Gnome Armsmaster, Halfling Dungeoneer, Pixie Arcanist.
- **Runs:** 250 per setup, so 1,000 per row.
- **Part 1:** every depth modifier alone, at every rank.
- **Part 2:** 21 random mixed loadouts at depths 3, 5, 7, 9, 11, 13 and 16.
- **Tools:** `tools/balance/study_depth.py`, with raw results in `out_depth_summary_rd1.json` (git-ignored).

## Depth 1 is nearly solved: 94% wins
- Dwarf Guard wins 99–100%, Gnome 97%, Halfling 94% and Pixie Arcanist 88%.

## What one point of depth costs, per modifier
| Modifier | Win rate by rank | Cost per depth point | Verdict |
|---|---|---|---|
| **Swarm** (+1 Minion die per spawn) | 89 → 70 → 47% | −5, then −12 to −16 | far too steep at ranks 2 and 3 |
| **Fury** (+1 damage per hit, costs 2) | 73 → 44% | −11 to −13 | steep |
| **Tougher Foes** (+15% HP per rank) | 89 → 79 → 70 → 64% | −6 to −8 | about right, a good yardstick |
| **Gauntlet** (Easy → Standard, costs 2) | 85 → 74% | −5 | about right |
| **Clumsy** (Frail: −3 max HP) | 91 → 88 → 79% | −3 to −5 | a bit soft |
| **Rationing Rations** (Hard Rations: rest heals less) | 90 → 90 → 84% | −2 to −5 | soft |
| **Dread** (Deadly encounters more likely) | 94 → 93 → 91% | about −1 | nearly free |
| **Burden of Choice** (Slim Pickings) | 94 → 93% | about 0 | free |

Ranges like −6 to −8 mean the cost per point drifts slightly from rank to rank.

## Depth numbers don't predict difficulty
Mixed loadouts at the same depth spread very widely:
| Depth | Win rate range | Example |
|---|---|---|
| 7 | 35–56% | |
| 9 | 20–53% | |
| 11 | 28–65% | |
| 13 | 4–36% | |
| 16 | 3–11% | |

- A depth-11 run of Dread, Clumsy, Rationing Rations and Burden of Choice wins 65%.
- A depth-9 run with Fury 2 and Swarm wins 20%.
- A player chasing a higher depth number should simply stack the free modifiers.

## Recommendations (for Jeremy)
1. **Recost or reshape the outliers so each depth point is worth roughly the same (about −6 win points):**
   - Swarm costs 2 per rank, or ranks add Minions more gently.
   - Fury stays at cost 2, but rank 2 is +1 damage on heavy turns only.
   - Burden of Choice and Dread are strengthened (e.g., Dread also makes elites hit harder), or cost about half a point.
   - Rationing Rations and Clumsy get slightly stronger ranks.
2. **Class and origin spread under skilled play:**
   - Dwarf Guard barely notices depth: 97% at Tougher Foes 4, against 39% for Pixie Arcanist. Guard's Block 2 every turn plus Dwarf's Block dice adds up.
   - This needs a class-by-origin pass at about depth 7. These four pairs mix class and origin, so they can't tell the two apart.
3. **For the relic study:** a loadout near 50% is depth 7 (Dread 1, Tougher Foes 2, Rationing Rations 2, Swarm 1), at 56%. Tier S relics should be tested at about depth 11 (Dread 3, Tougher Foes 4, Clumsy 1, Burden of Choice 1, Swarm 1), at 39%.
