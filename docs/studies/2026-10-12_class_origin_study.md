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

## Class tuning tests (after Jeremy's Guard Block 1 and Dungeoneer every-row wrap)
- **Depth:** the same depth-7 loadout, but with the reshaped depth modifiers, which make it harder: Rationing Rations 2 is now two thirds less rest, and Dread adds Elite HP.
- **Runs:** 300 runs × 2 origins (Halfling, Pixie) per row.
- **Tool:** `tools/balance/study_classvar.py`.

| Variant | Win |
|---|---|
| Guard (Block 1) | 69% |
| Armsmaster | 55% |
| Dungeoneer (wraps every row) | 43% |
| Arcanist as-is | 29% |
| Arcanist: both diagonals are the zone | 34% |
| Arcanist: diagonal step allowed if either end is in the zone | 36% |
| **Arcanist: both diagonals + either end** | **53%** |
| Arcanist + once/turn zone die → Dodge | 40% |
| Arcanist + once/turn zone die → Leap | 44% |

- The two Arcanist movement changes are weak alone but strong together: diagonal moves become available from 8 squares, into all their neighbours.
- That combination lands next to Armsmaster.

## Is Block overvalued? (Jeremy: "it doesn't feel that powerful in game")
- **Setup:** Halfling, at the same depth-7 loadout, 300 runs each.
- **How it's measured:** blocked damage comes from the game's own damage function, so it's a real count.

| Setup | Win | Deaths F1 / F2 / F3 | HP lost per fight F1 / F2 / F3 | Share of incoming damage Blocked F1 / F2 / F3 |
|---|---|---|---|---|
| Guard, ability unused | 27% | 33 / 28 / 11% | 8.7 / 11.8 / 11.2 | 13 / 35 / 50% |
| Guard, Block 1 | 74% | 0 / 9 / 17% | 4.1 / 6.6 / 6.7 | 50 / 57 / 59% |
| Guard, Block 2 (old) | 83% | 0 / 3 / 15% | 1.7 / 3.7 / 5.0 | 79 / 76 / 69% |
| Armsmaster, ability unused | 26% | 35 / 28 / 11% | 8.3 / 11.7 / 11.5 | 11 / 31 / 46% |
| Armsmaster | 63% | 2 / 21 / 14% | 5.2 / 9.3 / 9.0 | 15 / 31 / 46% |
| Dungeoneer | 52% | 13 / 25 / 10% | 7.2 / 10.5 / 9.1 | 16 / 34 / 51% |
| Arcanist | 37% | 23 / 28 / 12% | 8.2 / 11.6 / 9.9 | 12 / 33 / 49% |

**Findings:**
- **It's an early-game effect, not late-game scaling.**
  - Floor 1 enemies hit for 1-3, so a free Block 2 cancels almost all of it. Floor 1 deaths drop from 33% to 0%.
  - By Floor 3, every class dies at about the same rate (10-17%), because big hits dwarf a flat Block.
- **Block isn't overvalued by the bot.** The Block is really absorbed in the game's damage function, every turn.
- **Using the class ability is the biggest single lever in the game.** It adds +37 to +56 win points for both converter classes. Part of the value is that it turns a Blank or an off-path die into a usable step.
- **Why it may not feel strong:** prevented damage is invisible. Nothing happens, so it reads as a quiet fight. Jeremy's exported play data would also show whether he uses the ability every turn, as the bot does.
