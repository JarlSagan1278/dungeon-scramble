# Dungeon Scramble: project context

Written Oct 10, 2026 (build 1.34.0) to carry the owner's decisions and reasoning across sessions. Read with CLAUDE.md (commands and gotchas) and docs/TODO.md (priorities). If this file and the owner's latest message disagree, the latest message wins; update this file afterwards.

## What this is
- Digital prototype of the owner's (Jeremy's) board game: Boggle-style dice-path building plus dungeon crawling. He builds it with Claude; he is the only designer and the main tester.
- Core fantasy: kick in doors as an adventurer, clear rooms of monsters, get epic loot. The screen should read as a player-versus-monster face-off.
- Design goal: every interaction should feel as good as possible and release as much dopamine as possible. He wants more roguelite elements (relics, including origin-specific relics earned by winning).
- The digital game is no longer bound by the board game ("this is a video game now"). The old tabletop manual is retired; the video-game rulebook (Word + PDF, old-school manual look) is the documentation. Rulebook refresh is pending (it describes build 1.32.28).

## Distribution and testing
- Playtest builds ship as an installable web app (home-screen icon, dwarf portrait "icon A") on Netlify: https://dungeon-scramble-mobile.netlify.app/. He plays it on his phone.
- Each Netlify upload costs him about 5% of his monthly token allotment, so make the web build/zip ONLY when he asks. Day-to-day previews go to a Claude Artifact (https://claude.ai/artifact/EgVZK1tuHgNfJpqhd92jPR).
- Testers export play data from the gear menu (Export Play Data) and send the JSON. Telemetry includes per-turn tray, path, block, shrine/minion/damage-taken events and an active-time clock. A replay tool for this data is a to-do.
- A new player's run data (v1.32.76 export: Dwarf/Armsmaster, victory, 101 turns, 36 min, tester note "Love it!") was fully reviewed on Oct 11, 2026. Findings:
  - Floor 3 difficulty runs backwards. Sacred(?) Geometry took the player from 20 to 2 HP, and Ergot Eruption brought them to 1 HP while its stacking H.O.T. healed it from 14 back to 27. After the camp, Gestalt Network, Self-Replicating Forge and Extruzeon (Big Boss, 90 HP) together cost 2 HP, at 14–29 damage per turn.
  - Extruzeon's cycle is dmg 6 → shield 2 → H.O.T. 1. Its one attack was fully blocked, and a 29-damage turn triggered the freeze quest, so it never acted again.
  - Self-Replicating Forge's 6 minions per turn were cleared in full every turn. Minions don't matter once the player hits for 15+ damage.
  - Maneuver dice were the first thing dropped. 8 of 16 loot equips replaced a Maneuver die, and the Dwarven Doohickie was swapped out on floor 2. This supports the Maneuver-payoff study.
  - No crashes, and no sign of the inflated-enemy-HP-on-resume bug: no run was in progress and every enemy HP value looked sane. This export has no per-turn damage or path telemetry; that was added in 1.34.0.
- Target phone: 395x769 game card in a 411x785 viewport; the card must never grow taller.

## Visual direction (settled)
- "Toy-like": chunky outlines, dark-brown base with light-brown windows. Never the same color next to itself; each button its own color. One consistent outline color; larger dice with little dead space.
- Metamorphous for titles, plain serif for everything else (he dislikes mixed fonts).
- Tray buttons sit in a side rail beside the dice tray (not a row); the portrait slightly overlaps the tray. Dice tray is the "Oak & Iron" chest. Combo-power outline is shaped like the star icon.
- Rejected: darker/ornate look; room dressing such as banners and skulls (for now); a "first Block die +1" bonus.
- Dice upgrades look like filigreed borders and emblazoned corners, not glows or auras. He likes the wax-seal style victory badge and wants the best badge per class shown on the title screen (earned badges only; no placeholders or names). Badge redesign so each class is represented visually is a to-do.

## Rules decisions
- Enemy Shield absorbs damage the player deals. Block and all statuses reset when a new room opens (no carryover unless a relic grants it).
- Minion dice: cleared one per point of damage dealt, plus any minion jumped over by Leap; never carried between fights. Minions are placed right after the roll (before the player can tell what was rolled there). A minion covers a face that is revealed only while a path resolves, so Maneuvers cannot scout; landing on a covered space ends the path (it is blank). Leap/Dodge/Pivot may land on a covered cell. Using a class ability on a minion cell removes the minion. Minions look like dice with small creepy eyes at random spots and skews, greyed like unreachable dice during pathing.
- Loot dice join the Compendium the first time you get one; 3 copies (reduced from 5, "for now") unlock it as a Starting Boon, because boons were too strong and the game is already potentially too easy. End-of-run screens should announce newly unlocked boons.
- Difficulty system is called **depth** (earlier "heat"; Hades-style). Class badge shows the highest depth cleared; dice finish upgrades unlock for all classes after a certain depth. He wants a "carrot": a score with a place for player names, plus scalable cosmetics. Balance tuning (reducing one-shot kills on higher floors) comes before depth.
- Boss action cycle: **rework approved (Oct 11, 2026).** Bosses must be much more challenging and strategic, built around the information about their next turn. Proposal: docs/studies/2026-10-11_encounters_and_bosses.md.
- Difficulty (Oct 11, 2026): he is open to turning difficulty up significantly and to enemies taking multiple actions a turn. Every floor's encounters should be tagged by difficulty tier (e.g. easy / deadly) so the curve can be controlled across repeat plays and depth runs. Self-Replicating Forge: nerf it, or keep it as a rare ultra-difficult encounter within that tier system.
- Pivot → Boost on high-level Maneuver dice was studied (same proposal doc); no decision yet.
- Maneuver dice: he worries Maneuver dice/actions have no point compared to Attack. Studied Oct 11, 2026 (docs/studies/2026-10-11_maneuver_study.md): they are a net loss today and the v1.32.76 tester dropped them first. **Decision (Oct 11): keep the analysis but wait on more play data before drastically changing the Maneuver meta.** Leading candidate when revisited: Dodge Block (each Dodge gives 1 Block); Leap Momentum (+1 to the next damaging die) is the smallest parity fix. Adding Boost to an upgraded Maneuver die is a last resort only. Overlapping, stackable effects that cover slightly different stats are good design.
- Wants a way to compare dice in the loot "equip and choose which to replace" picker (later). Wants flavor text for loot dice (later; not in the test build). Add back reroll faces and swap faces.

## Art and licensing
- Most monsters, loot, portraits and the cover were made with ChatGPT; he is hand-retouching them in Sketchbook on an iPad before a wider audience, floor 1 monsters first. Retouched so far (Batch C and D "_done"): Filement Bunny, Wooden Golem, Feral Pet Rock, Unbound Automa, Beaker Breakers, Viscous Orb, United Separatists, Amanitabomination, Leper Colonizers, Rigged Sporks, Unauthorized Transfusion, Leper Con-Trap, Heating Elemental.
- Workflow: art lives embedded in src/assets.js; tools/art scripts export to PNG canvases and import back; /home/claude/canvas used batch canvases. Art source folder: Drive "DS Assets" (https://drive.google.com/drive/folders/1itemr3rWJ_HakCOk73QkgWAlCobP97ZT). Keep transparency; do not flatten onto white.
- Environment plan: hand-made PNGs for floor and archway bricks only; the rest of the background stays in code; the chest paintover is the last art priority and must not hurt animations. Relics and shrines need art too.
- Layered cover art is parked: the original layers don't exist (it came from ChatGPT); waiting for better image tools.
- Licensing awareness (not legal advice): purely AI-generated images may not be copyrightable and some stores require AI disclosure; hand retouching strengthens his claim. docs/ART_INVENTORY (spreadsheet) tracks every image's source and status.

## Audio plan (not started)
- Sound effect pass: audit which actions make sound and any redundancy; one consistent theme; a rising-note melody tied to musical tension and success; dice materials change roll sound and quantity; stronger enemy-turn and shrine sounds; airier Maneuver/dodge sounds.
- Background music: heavy klezmer harmonic-minor battle music, success/loot music, different orchestration per floor, MIDI instruments via GarageBand.

## Shrines
- They lack presence in animation, timing and execution. Keep rarity but greatly increase quantity as a way to add more relics. Relic idea: conversion (e.g. 1 damage per Shield gained).

## Working style
- He prefers decisions presented with clear options and a recommendation, then fast iteration; he gives precise visual feedback (sizes, blur, timing) and expects exact adjustments.
- He wants to be reminded of circle-back items. Do not set up weekly scheduled tasks.
- Don't claim something is verified unless it was run; run `node sim.js` after logic changes.
