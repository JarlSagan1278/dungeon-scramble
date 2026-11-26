# Dungeon Scramble — TODO

Updated Nov 26, 2026 (build 1.42.173; Nov 26 shipped: PC hero sheet, touch rewards, chain hint, accessibility and text passes; PC layout prototypes were tried and dropped, see decisions/look_and_feel.md). Nov 24-25 shipped: foe rules (6 + a secret), Daily guard rail, five unlockable
classes with signature objects (Pointer the schnauzer, printer, cauldron, field kit, deck), the Additive Inverse Easter
egg, tiered achievements (35), the Wanted poster pop-up, boss wind-up tip, text audit, idle-work cap, Steam achievement
wiring. Done work lives in `CHANGELOG.md`; decisions in `decisions/` (index: `PROJECT_CONTEXT.md`); study results in
`STUDY_FINDINGS.md`. Release checklist (40 items): Checklist tab of https://claude.ai/artifact/ExGeVZnx3Xe1RZnYnHmxLH

## Now: first players
1. **Onboarding for tutorial skippers (Nov 25 play-data read, STUDY_FINDINGS "Real first runs: how new players
   start"):** the two newcomers who skipped the guided fight did worst (single-die paths for a whole fight; a quit with
   0 turns). Proposed: a one-time "chain the dice" nudge when a first-runs player presses Go with a one-die path while a
   longer one is on offer. Live since 1.42.173 (Nov 26); watch whether skippers' path lengths grow.
2. **Google Play closed test:** 12 testers for 14 days (posts out); the Friday workflow uploads new versions. Then
   create the `full_game` product (~Dec 5), License testing + a test purchase on Jeremy's phone, then production.
3. **Keep reading the play data** (sheet `1W1TyynfdWTlxMqzr7TJOTZKMY6sOPBVPfXVd41kcGSM`; records in Drive folder
   "Dungeon Scramble Play Data (runs)"; `tools/playdata/funnel.py`). Watch: Floor 1 deaths in first runs (the Rogue
   Golemancer; does the 1.42.171 wind-up tip help?), tutorial skips, Skill use, who reaches the class unlocks.
4. **Retune only from real data.** Bot win rates are not human ones (STUDY_FINDINGS).

## Waiting on Jeremy
- **Art to make** (names sheet "Art Needed" tab; `tools/media/art_brief.js` draws the exact-size sheet): the five class
  objects and Pointer's head token (placeholders in the game now), optional Pointer running. Send the
  PNGs and Claude swaps them in.
- **Title art** (2048x2434 canvas `DungeonScramble_TitleArt_canvas.psd`; export full size; keep the logo layer for Steam).
- **Redraw the remaining AI-assisted art** (pixie portraits, the remaining original loot) to shrink the disclosure.
- **Steam:** pay the app fee; with the app ID: Steamworks achievements (list + icons from
  `tools/media/steam_achievements.js`), Steam Cloud, store page (draft `release/steam_page.md`, capsules ready).
- **Design calls:** Dylan's bigger ideas (Perfect Kill reward, a Sniper class, leaderboards); Armsmaster red Skill vs
  red Clear (options shown Oct 15).
- **Dylan's "anv" screenshot** (the Minion tip renders "any" correctly here).

## Next for Claude
- **Steam wiring once there's an app ID:** steam_appid for testing, check achievements fire in the client, Steam Cloud
  for the save, controller glyphs. (Electron app in `steam/`; achievements already reported via steamworks.js.)
- **New classes (1.42.169-1.42.170):** watch unlock timing in real data (Medic at 10 runs is meant to reach strugglers).
  Prototype balance: Medic Heal 1 (85% expert), Ranger 65%, Engineer/Alchemist 85% (STUDY_FINDINGS).
- **Difficulty drift (Nov 23 study):** bots win far more than in October; retune only when real runs show it's too easy.
- **Guild Rank / Daily Dungeon:** watch real use; possible next: class mastery tracks, cosmetic rank rewards.
- **Forks:** watch real `fork_pick` events before tuning (bot: always Elite 50% vs Standard 39%).
- **Hero gear:** per-item settings in assets.js (LOOT_SLOT etc.); class objects sit in front by the wall and the
  left-foot item makes room (`.hero-gear.has-prop`).
- **Room dressing:** no per-floor props (Nov 25, Jeremy: plenty of screen clutter already); his own ivy strands (V3) only if wanted.
- **Performance on slow phones:** idle work capped (Nov 25: no frame loop without a controller, looping decor pauses
  after 20 s idle). What's left is paint of running animations; only if testers report stutter.

## Later
- **Depth 14+ Floor 1 attrition (Nov 25):** 64% of expert-bot runs at Depth 14 end on Floor 1. Jeremy: a heal is the
  wrong fix for the hardest mode; revisit only if real players' data shows it unwinnable.
- **Floor 1 elites +30% health from run 2:** studied Nov 25 (felt, no extra deaths); not done (newcomers struggle).
- **Optional caps, only if play feels unfair:** damage-per-Minion specials count at most 8 Minions; Extruzeon layers max +12.
- **Relic look polish:** a bracelet view in the relic list, sockets that grow with depth.
- **Replay tool** for the tray/path telemetry. **A conversion relic** (e.g. 1 damage per Shield gained).
- **Co-op multiplayer** (lowest priority): https://claude.ai/code/artifact/1a2e8cb1-5527-400c-b4a2-defff09d6323
- **Free print-and-play edition** (below the PC version; `npm run rulebook`) for the BGG solo contest
  (see `release/first_players.md`).
