# Dungeon Scramble — TODO

## Priority order (updated Oct 14, after 1.41.7 / Netlify zip)
1. **Playtest 1.41.7 on the phone and collect play data.** New to check: harder Floor 3, Extruzeon's Layer by Layer, Maneuver II/III Block faces, the six retuned loot dice, Codex/Bestiary, Records, lethal warning, Skill coach, volume sliders, run card + Save Card, Suggested die (after 6 s), readable enemy chips, solid chip icons, the action fill, long title theme, win/lose stings, tempos 130/135/140. Ask testers to send exports; read `summary` first (floor funnel, first-10-runs win rate, take rates, warned vs unwarned deaths, abandoned runs).
   - Oct 14: first tester, 2 runs, both won (Armsmaster depth 1, Dungeoneer depth 3); one warned down; Grosteque Grafter took 11 turns; Maneuver Die I replaced in 20 of 30 equips. See docs/studies/2026-10-14_playtest_tester1.md. Still need newer players' exports.
2. **Music and art review (Jeremy):** every piece in the spec is in the game; he's reviewing all of it for edits. Art continues in parallel.
3. **Waiting on Jeremy's call (studies done, nothing applied):**
   - Pacing: Floor 2 Easy rooms about 25-30% less HP (The Warcart, Armored Gear-Pest, Roudy Rinotter, Adhesive Pest Traps, Unventilated Workshop); Myceleus HP 106 -> ~93. (docs/studies/2026-10-13_rebaseline_141.md, "Fight pacing")
   - Shrines: Scroll Dispensers (token shrines) are the weakest shrines; die-upgrade shrines weak; Madpie Nest (Floor 3 loot relics) weak; Floor 3 relic shrines could offer 4. Ties into the shrine overhaul below. (docs/studies/2026-10-13_shrines.md)
   - Extruzeon barely threatens experts at depth (2.2% vs 10-19%): raise its HP if it should.
   - Optional caps only if play feels unfair: damage-per-Minion specials count at most 8 Minions; Extruzeon layers max +12.
4. **Use real player data before retuning the base game** (literature review: bot win rates are not human win rates; Slay the Spire players win ~9-16% of base runs). Re-check the guidelines in docs/studies/2026-10-13_balance_literature_review.md against the first exports.
5. **Remaining performance:** ~1.5 s of script per turn at CPU x4 (renderGame/placeVs) and ~500 ms of style work during playback.

## Small follow-ups
- Swap / Reroll token shrine boons (Scroll Dispensers AWSP, DOER) still say "before you build your path"; the tokens also work mid-path. Fix the text and the names sheet together.
- Ideas from the literature review (not decided): a reward for reaching a new best depth; an optional assist mode that grows after losses (Hades God Mode style); log whether a death was avoidable in the bot studies.

## Done Oct 14 (background session)
- Bug hunt on 1.41.11: 24/24 clean. Class re-baseline with the fixed Dungeoneer wrap + Grafter study: docs/studies/2026-10-14_wrapfix_grafter.md.
- 1.41.12: faster Swap/Reroll/Skill taps (~3x), Minion-damage chips show totals, title New Run logs the abandoned save, treasure arpeggio. tools/playdata/analyze.py reads tester exports. Rulebook PDF refreshed. Reset Progress now also clears depth bests.

## Settled (Oct 13-14)
- Balance philosophy recorded (PROJECT_CONTEXT): variance and luck are part of the fun; over-strong player pieces OK, over-strong enemies not.
- Floor 3 harder (win drop accepted); Extruzeon Layer by Layer; Swarming capped at 2 ranks, rank 2 costs 2 depth; Maneuver II/III Block ladder (Maneuver I unchanged); six loot dice retuned keeping their identities; Suggested die after 6 s; class balance left as is; origin balance settled.
- Studies: overnight (2026-10-13_overnight.md), Floor 3/Extruzeon/Maneuver faces (2026-10-13_floor3_extruzeon.md), re-baseline + depth curve + big hits + pacing (2026-10-13_rebaseline_141.md), loot dice (2026-10-13_loot_dice.md), shrines (2026-10-13_shrines.md), literature review (2026-10-13_balance_literature_review.md).
- 1.41.7 zipped for Netlify; offline check passed; full bug hunt clean.

## Other items
- **Tap responsiveness (ongoing):** path taps ~2.5x faster (1.39.2); idle animations compositor-only (1.40.0, idle board ~7x cheaper). Next candidates: Swap/Reroll and class-ability taps (still full render), camp screen, turn playback script. Measure at CPU x4 with studies paused.
- **Shrine overhaul:** more presence in animation and timing; many more shrines as a way to add relics; conversion-relic idea (e.g. 1 damage per Shield gained). Use the shrine study's findings.
- **Sound effect pass:** waiting on Jeremy's ear test.
- **Design-consistency audit**, plus a rewrite of the quest descriptions (quest audit done Oct 12).
- **Redesign the class depth badges** so each one represents its class visually.
- **When all the art is in (remind Jeremy):** (1) the consistency pass `tools/art/consistency.py` over ALL art, stronger than the Oct 12 test; (2) the hand-drawn texture pass `tools/art/handdrawn.py` on all 48 hero portraits, and try it on the chest and environment art.
- **Art still needed:** the 4 Magic dice, the stand-in shrines (incl. the Scroll Dispensers), floor and archway bricks, eventually a chest paintover (last priority). Layered cover art parked.
- **Rulebook refresh** (rulebook is at build 1.32.28; many rules changed since). Also: the unreproduced "thousands of enemy HP on resume" bug, and the Armsmaster red Skill vs red Clear question.
- **Relic look polish (later):** a bracelet view in the relic list, sockets that grow with depth.
- **Replay tool** for the tray/path telemetry, once playtesters send exports.
- **Co-op multiplayer** (lowest priority). Feasibility study done Oct 14 (Claude Doc: https://claude.ai/code/artifact/1a2e8cb1-5527-400c-b4a2-defff09d6323). Recommended: "Shared Foe, Two Chests" with simultaneous planning, a Bridge edge for Pass-off and Bridge paths, host-authoritative two-phone link over WebRTC. Six questions for Jeremy are in the doc; first step would be a tabletop test, then a same-phone prototype.
