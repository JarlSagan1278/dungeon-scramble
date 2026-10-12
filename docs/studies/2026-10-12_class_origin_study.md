# Class × origin study (Oct 12 2026, build 1.39.2, player-like bot)

**Question (Jeremy):** is origin or class carrying the wins?

## Method
- **Pairs:** all 16 origin/class pairs.
- **Depth:** depth 7 (Dread 1, Tougher Scuffs 2, Rationing Rations 2, Swarming 1). This is the loadout that sits near 50%.
- **Runs:** 300 per pair.
- **Tool:** `tools/balance/study_pairs.py`, with results in `out_pairs_summary_rp.json` (git-ignored).

## Result: class carries the wins
| | Armsmaster | Guard | Dungeoneer | Arcanist | origin avg |
|---|---|---|---|---|---|
| Dwarf | 66% | 87% | 42% | 42% | 59% |
| Gnome | 67% | 89% | 38% | 36% | 58% |
| Halfling | 71% | 92% | 50% | 49% | 65% |
| Pixie | 63% | 89% | 36% | 34% | 56% |
| **class avg** | **67%** | **89%** | **42%** | **40%** | 59% |

- **Class explains 96% of the spread.** Origin explains 3%, and pairings 1%.
- **Classes span 49 points:** Guard 89%, Armsmaster 67%, Dungeoneer 42%, Arcanist 40%.
- **Origins span only 10 points.** Halfling is best at 65%, Pixie worst at 56%.
- **No pair synergy:** each class's rank is the same whatever its origin.

## Why
- **The two converter classes win** (Guard: free Block 2 every turn; Armsmaster: free Hit 2 every turn). They add value every single turn, whatever the roll.
- **The two movement classes only help when the roll happens to line up with their zone:**
  - Dungeoneer wraps between 4 edge squares.
  - Arcanist moves diagonally along 4 squares, which are already diagonal neighbours of each other.
- **Defense is worth more than offense:** Guard beats Armsmaster by 22 points. This matches the relic study, where sustain decided runs.
- **The bot is not the cause:** it plays the movement abilities through the game's own move rules (`canSelect`), so wrap and diagonal paths are fully searched.

## Class tuning tests
See the "Class tuning" section below, filled in once the variant runs finish.
