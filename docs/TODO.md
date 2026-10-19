# Dungeon Scramble — TODO

## Priority order (updated Oct 15)
1. **Playtest the new rules (1.41.16): campfire Rest OR Train, and the whole-Pocket revive** (bots now win 56% regular / 38% new; watch whether real players feel it's fair). Then also: **Playtest 1.41.7 features and collect play data.** New to check: harder Floor 3, Extruzeon's Layer by Layer, Maneuver II/III Block faces, the six retuned loot dice, Codex/Bestiary, Records, lethal warning, Skill coach, volume sliders, run card + Save Card, Suggested die (after 10 s), readable enemy chips, solid chip icons, the action fill, long title theme, win/lose stings, tempos 130/135/140. Ask testers to send exports; read `summary` first (floor funnel, first-10-runs win rate, take rates, warned vs unwarned deaths, abandoned runs).
   - Oct 14: first tester, 2 runs, both won (Armsmaster depth 1, Dungeoneer depth 3); one warned down; Grosteque Grafter took 11 turns; Maneuver Die I replaced in 20 of 30 equips. See docs/studies/2026-10-14_playtest_tester1.md. Still need newer players' exports.
2. **Music and art review (Jeremy):** every piece in the spec is in the game; he's reviewing all of it for edits. Art continues in parallel.
3. **Optional caps, only if play feels unfair:** damage-per-Minion specials count at most 8 Minions; Extruzeon layers max +12. (Shrines and Extruzeon were settled Oct 15: 1.41.23.)
4. **Use real player data before retuning the base game** (literature review: bot win rates are not human win rates; Slay the Spire players win ~9-16% of base runs). Re-check the guidelines in docs/studies/2026-10-13_balance_literature_review.md against the first exports.
5. **Remaining performance:** ~1.5 s of script per turn at CPU x4 (renderGame/placeVs) and ~500 ms of style work during playback.

## Oct 16
- Shipped 1.41.35-1.41.54 (preview only; live Netlify is still 1.41.34): shrine Hold centred + green Continue, tap-to-wiggle at shrines, floor in the round bubble (F2 · Rd 3), relic gems pop when they act (all relics report), thicker gem outlines, music recovers after reopening, camp: one-fire confirms + combines locked until Train, no heal estimate, Abandon Run, Skill sounds, Suggested die after 10 s, portrait re-roll button, quest paper outline + cut nicks, play-data uploads confirm the reply.
- Class changes: Arcanist diagonals only along the X + Boosts 1 stronger (1.41.53); Dungeoneer wraps add +1 to the next attacking die (1.41.54). Studies: 2026-10-16_arcanist_boost.md, 2026-10-16_dungeoneer_passive.md. Watch: Dungeoneer is now the easiest class for regular players (85% bot).
- Play data is live (Apps Script authorized Oct 16); first real row arrived. The earlier lost run re-sends once a 1.41.44+ zip is live.
- Shrines are on the Monster Footing page (collection `lifts3`, still empty); shrines can take size/height/facing in the game.

## Oct 15
- Oct 17: 1.41.59 zipped for Netlify (music on the web app, class passives, quest wording, Quest Health removed, trim, no-halo art). 1.41.24 zipped for Netlify (first build with automatic play data). Oct 16: 1.41.34 zipped (paper art and scenery, footing rounds 1-2, round shrine button, floor memory fix). Check the Play Data sheet after the first tester run.

- Oct 15 (1.41.22-1.41.32): monster tuning, Floor 2 trims, shrine boosts, Extruzeon +10% HP, depth repricing, automatic play data, Batch E art, paper texture on all art (WebP) and in-world scenery, Monster Footing rounds 1-2. The Play Data sheet is still empty: needs the 1.41.24+ zip deployed and a finished run with sharing on.
- Bug hunt on 1.41.32: 24/24 runs clean (bugsearch.js), every shrine option clean (new tools/test_shrines.js, 40/40). Rulebook PDF refreshed for today's changes.
- Monster Footing page (https://claude.ai/artifact/6sxozXQfah2dSsRxnQEAkj) collection `lifts3` is round 3 (empty so far).
- Art still out: shrine batches P-R, portrait batches S-Z and loot batches LOOT_1-4 (sent Oct 19), and silhouette batches L-O (stand-in shrines, Magic dice). All enemies are retouched. When the last one is back: the consistency pass (tools/art/consistency.py) over all art.

## Small follow-ups
- Log whether a death was avoidable in the bot studies (literature review idea). Best-depth rewards: covered by dice finishes and relic gating (Jeremy, Oct 15); assist mode: not for now.

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
- ~~Design-consistency audit~~ done Oct 17 (1.41.60-1.41.61). Left: six `--` strings in data.js; Rube Machine needs its own art.
- **Redesign the class depth badges** so each one represents its class visually.
- **When all the art is in (remind Jeremy):** (1) the consistency pass `tools/art/consistency.py` over ALL art, stronger than the Oct 12 test; (2) the hand-drawn texture pass `tools/art/handdrawn.py` on all 48 hero portraits, and try it on the chest and environment art.
- **Art still needed:** the 4 Magic dice, the stand-in shrines (incl. the Scroll Dispensers), floor and archway bricks, eventually a chest paintover (last priority). Layered cover art parked.
- **Rulebook refresh** (rulebook is at build 1.32.28; many rules changed since). Armsmaster red Skill vs red Clear: options shown Oct 15, waiting on Jeremy.
- **Relic look polish (later):** a bracelet view in the relic list, sockets that grow with depth.
- **Replay tool** for the tray/path telemetry, once playtesters send exports.
- **Co-op multiplayer** (lowest priority). Feasibility study done Oct 14 (Claude Doc: https://claude.ai/code/artifact/1a2e8cb1-5527-400c-b4a2-defff09d6323). Recommended: "Shared Foe, Two Chests" with simultaneous planning, a Bridge edge for Pass-off and Bridge paths, host-authoritative two-phone link over WebRTC. Six questions for Jeremy are in the doc; first step would be a tabletop test, then a same-phone prototype.
