# Dungeon Scramble: project context

The owner's decisions and reasoning, carried across sessions. Read with `CLAUDE.md` (commands, gotchas, design rules)
and `docs/TODO.md` (priorities). If this file and the owner's latest message disagree, the latest message wins;
update the file afterwards.

**Recording decisions:** add each new decision, dated, at the bottom of the matching file in `docs/decisions/`
(below). Study results go in `docs/STUDY_FINDINGS.md`; shipped changes in `CHANGELOG.md`.

## What this is
- Digital prototype of the owner's (Jeremy's) board game: Boggle-style dice-path building plus dungeon crawling. He builds it with Claude; he makes the design calls for the digital game and is the main tester (the board game itself was designed with his wife Katlynn; see The creators).
- Core fantasy: kick in doors as an adventurer, clear rooms of monsters, get epic loot. The screen should read as a player-versus-monster face-off.
- Design goal: every interaction should feel as good as possible and release as much dopamine as possible. He wants more roguelite elements (relics, including origin-specific relics earned by winning).
- The digital game is no longer bound by the board game ("this is a video game now"). The old tabletop manual is retired; the video-game rulebook (Word + PDF, old-school manual look) is the documentation. Rulebook text refreshed to build 1.41.77 (Oct 21); gen.js now computes encounter health ranges from data.

## The creators
- **About the creators (Jeremy, Oct 22):** Jeremy has a master's in engineering and worked as a mechanical engineer before switching career tracks to teaching math; he is not a teacher yet. He designed the board game and its mechanics with his wife **Katlynn Friedman** (not alone). Credit both in store/press text; never describe Jeremy as a math teacher or a solo designer.

## Working style
- He prefers decisions presented with clear options and a recommendation, then fast iteration; he gives precise visual feedback (sizes, blur, timing) and expects exact adjustments.
- He wants to be reminded of circle-back items. Do not set up weekly scheduled tasks.
- Don't claim something is verified unless it was run; run `node tools/check.js` after logic changes.

## Decisions by topic

| File | What's in it |
|---|---|
| [`decisions/rules_and_dice.md`](decisions/rules_and_dice.md) | Core rules: minions, Shield and Block, loot and boons, Swap/Reroll, the Back Pocket, campfire, quests, Freeze, Maneuver and basic dice. |
| [`decisions/classes_and_origins.md`](decisions/classes_and_origins.md) | Class zones, Skills and passives; origin balance and origin dice. |
| [`decisions/enemies_and_bosses.md`](decisions/enemies_and_bosses.md) | Encounter tiers, boss kits and telegraphs, heavy turns, new monsters, per-monster tuning, Floor 3 and Extruzeon. |
| [`decisions/depth_and_balance.md`](decisions/depth_and_balance.md) | The depth system and its modifiers, dice finishes, and the balance philosophy behind tuning. |
| [`decisions/relics_and_shrines.md`](decisions/relics_and_shrines.md) | Relic tiers, gating, gem look and names; the shrine overhaul, shrine value rule and shrine flow. |
| [`decisions/look_and_feel.md`](decisions/look_and_feel.md) | Visual direction, textures, layout rules, monster footing, onboarding (splash, guided fight, quick start, tips), the chest lid, performance and accessibility. |
| [`decisions/art_and_names.md`](decisions/art_and_names.md) | Art sources, licensing, repaint batches and imports; the names sheet workflow and naming themes. |
| [`decisions/audio.md`](decisions/audio.md) | Music direction and pieces, tempos, sound effects. |
| [`decisions/release_and_players.md`](decisions/release_and_players.md) | Distribution, hosting, play data, privacy, release plan, monetization, store, itch.io, Android, marketing and playtests. |
| [`decisions/coop.md`](decisions/coop.md) | Co-op direction (on hold). |

## Repo
- **Repo cleanup (Jeremy, Oct 28: "get the whole project up to a professional level"):** the 32 study reports, the literature-review and first-players research notes and the old mockups were condensed into `docs/STUDY_FINDINGS.md` and removed (git history keeps them, commit 44a9829). New studies add their result there instead of a new file. Scripts moved: `tools/sim.js`, `tools/bugsearch.js`, tests in `tools/tests/` (named after their check.js key); one-off balance/art scripts removed; the stale `index.html` dev entry removed (build instead). README rewritten; TODO rewritten to open items only; npm scripts for build/check/bughunt/rulebook/app.
