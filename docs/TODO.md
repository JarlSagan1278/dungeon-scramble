# Dungeon Scramble — TODO

## Priority order (updated Oct 13, after 1.41.0)
1. **Music edits (Jeremy is reviewing every piece)** and **art** in parallel (new since the review list: the action fill, the 80-bar title theme, floor tempos 140/145/150).
2. **Playtest 1.41.0 on the phone:** harder Floor 3, Extruzeon's Layer by Layer, the Maneuver II/III Block faces, the Codex/Bestiary, lethal warning, Skill coach, volume sliders, run card, Suggested die (after 6 s).
3. **Final bug hunt, then the Netlify zip** (only when Jeremy asks).
4. **Class balance:** settled for now (Jeremy, Oct 13: a skilled player can make any class shine; new players learn on the classes that carry them). Revisit only with his playtests.
5. **Remaining performance:** ~1.5 s of script per turn at CPU x4 (renderGame/placeVs) and ~500 ms of style work during playback.

Settled Oct 13: Floor 3 harder (win drop accepted), Extruzeon, Swarming cap, Maneuver dice (II/III Block ladder, I unchanged), loot Suggested die. Studies: docs/studies/2026-10-13_overnight.md, docs/studies/2026-10-13_floor3_extruzeon.md.

## Done Oct 12-13 (for reference)
- Relic study at depth 7/11 (re-tiered and gated; origin relics at tier B or below); class x origin study (class carries 96%); depth modifiers recalibrated (about -4 to -7.5 win points per depth point); classes rebalanced (Guard Block 1 + L zone, Dungeoneer every row, Arcanist both diagonals); Swap/Reroll -> Pivot; Equal and Opposite reflects the Blocked amount; Union Dues and Rounding Error; depth shown from 0; blocked-damage floater; Zeal in enemy warnings; Go-button bug fixed (1.39.4).
- Music: in-game synth with downtime/action (bar-synced), victory chimes, loot bursts per tier, camp lullaby, shrine piece, Floors 2-3 transposed, title/end theme, splash screen; sound effects in the music's key per floor.
- Performance: path taps ~2.5x faster; loot chest opening smoother.

## Other items
- **Tap responsiveness (ongoing, Jeremy: good for the game's long-term health):** path taps ~2.5x faster in 1.39.2 (renderPathOnly + cached arch + one layout). Next candidates, same method (measure at CPU x4 with background studies paused, `tools/test_pathrender.js`-style equivalence test): Swap/Reroll and class-ability taps (still full render), camp screen, turn resolution playback. Tried Oct 12 and reverted: a diff redraw (morph the new screen into the old DOM instead of replacing it) matched a fresh rebuild exactly but saved nothing (~650-700 ms of rendering per turn either way, single-file and web builds), so the cost is in building the screen (HTML strings + layout), not in swapping DOM. A JS profile of one turn (unthrottled) shows only ~160 ms of script in render (renderGame ~105, placeVs ~60, decorateArch ~48) against ~410 ms of browser-native work (style, layout, paint), so the next win is on the CSS side. Oct 13 trace (overnight doc section 10): continuous animations are the main paint/composite cost. 1.40.0: every idle loop is compositor-only (idle board ~7x cheaper) and ambient loops rest during playback. Remaining: ~1.5 s of script per turn at CPU x4 (renderGame/placeVs), style ~500 ms during playback.
- **Origin balance:** settled (Oct 13 class x origin study): origin explains only 3% of the win-rate spread, and Jeremy is fine with that (players pick origins for looks).
- **Design-consistency audit**, plus a rewrite of the quest descriptions. Quest audit done Oct 12 (`docs/studies/2026-10-12_todo_studies.md`): all broken quests fixed, Geometry mirror quests built to Jeremy's rule (1.39.0).
- **Music:** every piece in the spec now has a first version (1.39.7). Rebuild the preview page after any change to src/music.js: `python3 tools/music/build_game_preview.py`.
- **Sound effect pass:** palette shipped in 1.39.0; dice-material landings and a Reroll sound added in 1.39.3 (camp upgrades already had the 'fuse' chime). Waiting on Jeremy's ear test.
- **Shrine overhaul:** more presence in animation and timing; many more shrines, as a way to add relics; conversion-relic idea (e.g. 1 damage per Shield gained).
- **Swap/Reroll shipped in 1.38.0.** Still to do: the four drafted Magic dice (waiting on the names sheet), and art for the two new Scroll Dispenser shrines.
- **Redesign the class depth badges** so each one represents its class visually.
- **When all the art is in (Jeremy, Oct 12: remind him):** (1) the consistency pass `tools/art/consistency.py` over ALL art, stronger than the Oct 12 test (he barely noticed the difference at --pull 0.35); (2) the hand-drawn texture pass `tools/art/handdrawn.py` on all 48 hero portraits, and try it on the chest and environment art.
- **Art PNGs:** floor and archway bricks, relic art, and eventually a chest paintover (last priority).
- **Layered cover art:** parked (original layers unavailable).
- **Balance tuning (older notes, re-check with the player-like bot first):** reduce one-shot kills on higher floors. Also from the v1.32.76 run review: floor 3's curve runs backwards (the first two rooms nearly killed the tester; the last three plus the Big Boss cost 2 HP total), and Extruzeon attacked only once (fully blocked) in 5 turns because its 3-step cycle plus the 20+ damage freeze leaves it nothing to threaten with. Late-floor pressure was raised in 1.35.0 (boss rework, tiers). Enemy-pressure study (same report): raising enemy hit damage adds threat without lengthening fights; HP is the lever for one-turn kills; Big Boss hit damage can rise cheaply; Floor 3 needs per-encounter tuning (Self-Replicating Forge causes most bot deaths; Morel Dilemma, Myceleus and others deal almost nothing).
- **Rulebook refresh** (rulebook is at build 1.32.28; many rules changed since: classes, Swap/Reroll Pivot, depth from 0, relic tiers). Also: the unreproduced "thousands of enemy HP on resume" bug, and the Armsmaster red Skill vs red Clear question.
- **Proposed new content** (names review sheet, Proposed New Content tab): 2 Deadly enemies (Floors 2 and 3, so Deadly rooms aren't blocked by the one-trap rule), 2 true Easy enemies for Floor 2, a third Big Boss, 4 Magic loot dice (12 → 16), optional Floor 1 Deadly for Dread. Built in 1.39.0 (monsters, Toadtaur Wizard, Magic dice). Still open: Jeremy's names-sheet pass (renames/flavor for bosses, moves, shrines, relics, dice) and art for the 4 Magic dice.
- **Relic look:** done in 1.39.0 (gems drawn in code). Possible later polish: a bracelet view in the relic list, sockets that grow with depth.
- **Replay tool** for the tray/path telemetry, once playtesters have the new build.
- **Two-device multiplayer** (lowest priority; added Oct 11).
