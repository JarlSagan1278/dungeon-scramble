# itch.io page for the free demo (prepared Oct 23, 2026)

Upload: `dungeon_scramble_demo_itch.zip` (made from `node build.js --demo`: the single-file demo renamed `index.html` and zipped; Floors 1-2 since Nov 8, no service worker). Cover: 630x500 PNG. Screenshots: Floors 1-2 only (the demo has no Floor 3).

## Settings (itch.io > Dashboard > Create new project)

| Field | Value |
|---|---|
| Title | Dungeon Scramble |
| Project URL | dungeon-scramble (account: dungeonscramble, so the page is dungeonscramble.itch.io/dungeon-scramble) |
| Short description / tagline | Roll a 4x4 tray of dice. Draw your path. Free demo: the first two floors. |
| Classification | Games |
| Kind of project | HTML |
| Release status | In development |
| Pricing | No payments |
| Uploads | the zip, tick "This file will be played in the browser" |
| Embed: viewport | 395 x 769 |
| Embed: Mobile friendly | on, orientation Portrait |
| Embed: Fullscreen button | on |
| Embed: Automatically start on page load | off (players tap "Run game") |
| Embed: Enable scrollbars | off |
| Genre | Strategy |
| Tags | roguelike, roguelite, dice, turn-based, strategy, puzzle, dungeon-crawler, fantasy, singleplayer, mobile |
| AI disclosure (if the form asks) | Answer honestly: graphics were made with AI and are being hand-repainted; code written with an AI assistant; no AI text, sound or voices in the game |
| Community | Comments on |
| Visibility | Draft first; test on your phone; then Public |

## Description (paste into "Description")

Dungeon Scramble is a turn-based roguelike for your phone. Roll sixteen dice into a 4x4 tray, then trace one path through them: each die you step on takes effect in order, from Hit and Block to Combo, Boost and Freeze. Monsters always show their next move, so you can plan around it. Maneuver faces like Leap, Sidestep and Pivot bend the rules of the path.

This free demo is the first two floors: pick your origin and class, fight through the rooms, visit shrines and camps, beat the Floor 1 boss, then find Gilded loot on Floor 2 and take on its boss.

The full game has three dungeon floors, 50+ 6-sided loot dice, 20+ powerful relics and the Big Bosses. It is coming to iPhone and Android in 2027.

Best played on a phone, held upright. Your progress is saved in your browser.

If you choose to share play data at the end of a run, it helps us balance the game. Privacy policy: https://dungeonscramble.com/privacy

Made by Jeremy and Katlynn Friedman. https://dungeonscramble.com · contact@dungeonscramble.com

## Description refresh (Nov 23, 2026: paste over the old one; the old text never mentions PC)

**Short description / tagline:** Roll sixteen dice, draw one path. Free demo: the first two floors, on phone or PC.

> Dungeon Scramble is a turn-based roguelike. Roll sixteen dice into a 4x4 tray, then draw one path through them: each die you step on hits, blocks or heals, in order. Monsters always show their next move, so you can plan around the roll, and Maneuver faces like Leap, Sidestep and Pivot bend the rules of the path. Chain them right and a modest roll becomes a monster-flattening turn.
>
> **This free demo is the first two floors:** pick your origin and class, fight through the rooms, visit shrines and camps, beat the Floor 1 boss, then find Gilded loot on Floor 2 and take on its boss.
>
> **Play your way:** on a phone held upright, or on a computer with mouse, keyboard or a controller (it also runs on the Steam Deck in its browser). Your loot shows up on your hero, and when a monster beats you, it wears your best piece.
>
> The full game has three dungeon floors, 50+ six-sided loot dice, 20+ relics and the Big Bosses. It is coming to Android, iPhone and PC.
>
> Your progress is saved in your browser. If you choose to share play data at the end of a run, it helps us balance the game. Privacy policy: https://dungeonscramble.com/privacy
>
> Made by Jeremy and Katlynn Friedman, from the board game we designed together. https://dungeonscramble.com · contact@dungeonscramble.com

If the Guild Rank and Daily Dungeon ship, add after "Play your way": *Every run earns renown toward a permanent rank with a starting gift at each step, and the Daily Dungeon is the same dungeon for everyone each day, with a result to share.*


## After it goes public

- Add the itch.io link to the press kit and home page (`docs/release/presskit.html`, `tools/site.js`), rebuild the site, upload.
- Mark checklist #17 Done; start #21 (20-30 new players).
- Updating the demo later: `node build.js --demo`, re-zip, upload the new zip on the same itch page (delete the old file or mark it as replaced).
