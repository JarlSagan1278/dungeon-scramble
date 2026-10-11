# Shrine overhaul — plan for review (Oct 11 2026, build 1.35.2)

Owner goals (PROJECT_CONTEXT, TODO): shrines lack presence in animation, timing and execution; keep their rarity but greatly increase their number as a way to add more relics; relic idea: conversion (e.g. 1 damage per Shield gained).

## Today
- **14 shrine cards** (5 / 5 / 4 per floor), all with art.
  - Max health: Sacred Bellows (+5), Alchemists Stone (+10), Heron's Fountain (+15).
  - Heal or max health: Half-Empty Fountain, Half-Full Fountain.
  - Die upgrade: Expediting Spores (Maneuver I → II), Enchanted Anvil (Attack I → II).
  - Tokens: Scroll Dispenser CLEAR (3 Nullify), BIG (2 × x4 Boost), STOP (1 Freeze).
  - Dice: Ecclectrical Outlet (trade loot for Alloy), Scrying Spheroid (random Magic die).
  - **Relics: only 2** — Department Spore (Floor 2) and Storied Emporium (Floor 3), each "choose 1 of 3".
- **How often:** since 1.35.0 a shrine can take an easy or standard room (40% each, max one per segment, never the run's first room) → about **2.9 shrines per run** (≈0.8 on Floor 1, ≈1 on Floors 2 and 3).
- **Relics per run from shrines: about 0.5** (only the Floor 2 and Floor 3 pools have a relic shrine: 1 of 5 and 1 of 4 cards). The general relic pool has 11 relics; origin relics are earned by winning.
- **Presence:** the room banner ("A new room..."), then "Revealing the shrine's boon..." / a Reveal button, then a text result card. No shrine-specific sound, light, motion or reward animation.

## 1. Presence (animation, timing, execution)

**Option A — Shrine ritual (recommended)**
1. **Entrance:** its own banner ("A shrine hums in the dark…") with a soft chime instead of the door-kick sting; the arch's torches warm up and dust motes drift upward.
2. **Activation:** tap and hold the shrine (about 0.6 s). The art lifts and pulses, a rising three-note chime climbs with the hold, particles gather. Releasing early cancels — a small, deliberate moment instead of a button.
3. **Reward lands where it lives:** a relic flies into the relic strip and its badge pops; max health stretches the HP bar with a big "+10"; a die upgrade flips that die on the tray with the filigree finish; tokens drop into their slot. A short result line confirms it, with no modal for simple boons.
4. **Choices** (relic picks, heal-or-max-health) fan out as cards like loot, with the same flourish when picked.

**Option B — lighter pass:** keep the Reveal button but give it the chime, light swell and fly-in reward. Less new interaction, less presence.

## 2. More shrines, mostly relic-giving

"Keep their rarity, greatly increase their number": shrine rooms stay about as frequent, but there are many more distinct shrine cards and far more of them hand out relics.

**Recommended shape:** about **10 shrine cards per floor (30 total, up from 14)**, roughly half of them relic shrines.
- **Themed relic shrines** that each offer 1 of 3 from a themed slice of the pool, so the card tells you what kind of relic you're shopping for, e.g. *Forge Altar* (offense), *Hearth Idol* (defense/healing), *Wayfarer's Cairn* (movement/Maneuver), *Hoarder's Niche* (loot/economy), plus the generic Department Spore / Storied Emporium.
- **Bargain shrines** (new): a relic for a price — lose 4 max health, take a Fumble die, or skip the next camp's rest. Gives shrines tension, not just free stuff.
- Keep the best existing boons (max health, upgrades, tokens) as the other half.
- Expected result at today's frequency: **about 1.4 relics per run from shrines** (up from about 0.5).

**Frequency options:** keep 40% per easy/standard room (≈2.9 shrines per run, recommended), or raise to 50% (≈3.5). A depth modifier (*Faithless*: shrines appear less often) could pull the other way.

## 3. New relics (draft, stackable and overlapping per the design rule)

Conversion family (the owner's idea):
| Relic | Effect |
|---|---|
| Barbed Buckler | Each Block you gain also deals 1 damage to the enemy. |
| Overflow Chalice | Healing past your maximum health becomes Block. |
| Bloodletter's Fang | Every 6 damage you deal in one turn heals 1. |
| Spite Thorns | When an enemy's attack is fully blocked, it takes 2 damage. |
| Grave Tally | Each Minion you clear gives 1 Block. |

Movement family — **a safe way to test Maneuver payoffs with real players without changing the base dice** (the Maneuver meta stays on hold):
| Relic | Effect |
|---|---|
| Dodger's Cloak | Each Dodge in your path gives 1 Block (the "Dodge Block" payoff). |
| Leaper's Spurs | Each Leap adds +1 to the next damaging die (the "Leap Momentum" payoff). |
| Pivot Compass | Each Pivot lets the next die count as adjacent to any die. |

Boss and tempo:
| Relic | Effect |
|---|---|
| Frost Charm | Start each boss fight with a Freeze token. |
| Warding Bell | The first heavy turn or boss wind-up each fight deals half damage. |
| Shrine Bell | Shrines offer one extra choice. |
| Combo Gauntlet | Combo dice also count diagonal neighbors. |

That takes the general pool from 11 to 23. Glimmer Dust (Pixie) already overlaps the movement family; that is fine under the stackable rule.

## 4. Art and sound
- New shrines and relics need art. Until they have it: shrines use the existing mystery-figure fallback, relics their monogram badge (both already work).
- Shrine sounds (entrance chime, hold-to-activate rising notes, reward sting) fit the planned sound pass and can start as simple tones.

## Questions for the owner
1. Presence: **A (shrine ritual, recommended)** or B (lighter)?
2. Number: about **10 shrine cards per floor, half of them relic shrines**?
3. Bargain shrines (relic for a price): yes or no?
4. Which new relics to keep, cut or change? Any names to change?
5. Frequency: keep 40% per room, or raise it?
