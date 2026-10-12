# Relic study (Oct 12 2026, build 1.39.0)

## Method
- **Setup:** each relic is given to the bot at the start of the run. The bot declines every other relic offer and walks away from bargain shrines (`relicLock`), so the forced relic is the only one it holds.
- **Scope:** 23 shrine relics × 4 origins, plus each origin relic for its own origin, at 500 runs per pairing (about 50,000 runs).
- **Origin and class pairs:** Dwarf Guard, Gnome Armsmaster, Halfling Dungeoneer, Pixie Arcanist.
- **Comparison:** every result is set against no-relic runs for the same origin.
- **Noise:** about ±3 win-rate points per origin and about ±1.6 points for the four-origin average. Treat anything under about 4 points as no effect.
- **Tools:** `tools/balance/study_relics.py` (runner) and `study_maneuver.js` (bot; `forceRelics`, `relicLock`).
- **Raw results:** `tools/balance/out_relics_summary.json` (git-ignored).

**No-relic baseline win rate:** Dwarf 47%, Gnome 41%, Halfling 65%, Pixie 47%. With its usual random relic picks, the bot wins about 60%, so relics are a big part of a winning run.

## Results (win-rate change, averaged over the 4 origins)
| Tier | Relic (old id) | Win-rate change | Notes |
|---|---|---|---|
| **S: run-defining** | Scavenger's Acumen (bloodletter) | **+42** | Every 6 damage in a turn heals 1. The best relic in the game, and it nearly doubles Gnome's win rate (+47). |
| | Stronger Infill (Dwarf origin) | **+43** | 5 Block every fight. |
| | Minus-One Mantra (gambeson) | **+33** | −1 on every enemy hit. Huge against multi-hit and Minion damage. |
| | Hard Hat Act (banner) | **+33** | 3 Block every fight. |
| **A: strong** | Evasion Tank (dodger_cloak) | +28 | |
| | Faerie Fire (Pixie origin) | +27 | |
| | Perfect Fifth (echo_chime) | +25 | |
| | Mandated Lunch Break (iron_rations) | +21 | |
| | Coffee Break (Halfling origin) | +21 | |
| | Prime Edge (whetstone) | +21 | |
| | Combonatorics (combo_gauntlet) | +19 | |
| **B: solid** | Klein Bottle (flask) | +12 | |
| | Percolation Theory (kettle) | +12 | |
| | Mycorrhizal Bond (Gnome origin) | +11 | The weakest origin relic, on the weakest origin. |
| | Terminal Velocity (leaper_spurs) | +9 | |
| | Bisection Method (warding_bell) | +9 | |
| **C: weak** | Nature's Thorns (barbed_buckler) | +7 | |
| | Strength in Mooks (grave_tally) | +5 | |
| | Union Health Plan (tincture) | +4 | |
| | Exponential Decay (venom_vial) | +2 | |
| **Duds (no measurable effect)** | FTLeporter (pivot_compass) | 0 | |
| | Equal and Opposite (spite_thorns) | −2 | |
| | Bloodthirst (hungry_blade) | −2 | |
| | Power Word: Safe (overflow_chalice) | −3 | |
| **Not measurable by the bot** | Giant Killer (frost_charm) | −3 | The bot never spends tokens. |
| | n+1 Button (shrine_bell) | −4 | Extra shrine choices: relic offers are declined in this study, and the bot's loot picks don't benefit from extra choices. |
| | Need Before Greed (lucky_coin) | −7 | The bot's loot scoring picks worse dice when it has more to choose from. This is a bot limit, not a relic flaw. |

**Defensive flat values dominate.** Block every fight, −1 per hit and steady healing are worth much more than damage or loot effects. This matches the Oct 11 finding that sustain decides runs.

## Proposed gating (Jeremy's idea: quietly space out power over many runs)
Locked relics simply never appear in shrine offers, and the Codex shows "???" until a relic is unlocked.
| Pool | Unlocks at | Relics |
|---|---|---|
| Starter | from run 1 | Tiers B and C, the duds, and the unmeasurable relics (about 15). A first run feels relic-light, as intended. |
| Tier A | first victory ("Dungeon Conqueror") | Evasion Tank, Perfect Fifth, Mandated Lunch Break, Prime Edge, Combonatorics |
| Tier S | a later achievement, e.g. "Two Roads" or clearing depth 2 | Scavenger's Acumen, Minus-One Mantra, Hard Hat Act |

## Tuning candidates (before or together with gating)
- **Nerf (if they stay in the shared pool):**
  - Scavenger's Acumen: every 6 damage → every 8.
  - Minus-One Mantra: −1 per hit, but not on Minion damage.
  - Hard Hat Act: 3 → 2 Block.
- **Buff the duds:**
  - Equal and Opposite: 2 → 4 damage.
  - Bloodthirst: Overkill at 6 → 4 extra damage, and an Overkill also heals 2.
  - Power Word: Safe: overheal becomes double Block.
  - Union Health Plan: Heal faces +1 → +2.
  - Exponential Decay: +1 D.O.T. per D.O.T. face → +2.
  - FTLeporter: a teleport that also gives +1 damage.
- **Origin relics:** Mycorrhizal Bond (+11) is the weakest origin relic, and Gnome is the weakest origin. Raise it to tier A (for example, Leech faces add +3 D.O.T.).

## Caveats
- One bot skill level (1500).
- The bot doesn't use tokens.
- The bot's loot picks are a heuristic.
- Combos between relics haven't been tested yet. A second pass can add pairs with `RS_PAIRS`.
