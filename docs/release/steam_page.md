# Dungeon Scramble: Steam store page draft

Drafted Nov 25, 2026 from build 1.42.164 (counts read from the built game: 37 enemies, 12 traps, 9 bosses, 32 shrines,
56 loot dice (20 Alloy, 20 Gilded, 16 Magic), 27 relics, 10 Depth modifiers, 12 Guild Ranks, 3 foe rules). Recount before
submitting if content changes. Steam pages are edited in Steamworks > Store Page Admin once the $100 app fee is paid.
Wording follows the Play listing (store_listing.md) and the press kit. No other games' names anywhere (Steam rejects them in
tags and they read badly in descriptions).

## Name
**Dungeon Scramble**

## Short description (shown under the capsule; max 300 characters; this draft 243)

```
Roll 16 dice into a tray, trace one path through them, and every die you step on hits, blocks or heals, in order. A
turn-based roguelike from a husband-and-wife board game: monsters show their next move, so every fight is a puzzle you can win.
```

## About This Game (long description)

Steam allows simple formatting ([h2], [b], [list]); paste as is and turn the CAPS headings into [h2] headings.

```
KICK IN THE DOOR. ROLL YOUR DICE. FIND THE PATH.

Dungeon Scramble is a turn-based roguelike dungeon crawl. Your dice land in a 4x4 tray, and you trace one path through
neighboring dice. Each die you step on takes effect, in order: Hit, Block, Heal, Combo, Boost, Freeze and more. Maneuver
faces like Leap, Sidestep and Pivot bend the rules of the path, so a modest roll can become a monster-flattening turn.

Monsters always show their next move. Block the big hit, freeze the wind-up, or burst it down before it lands. Some foes
follow rules of their own: one is immune to a different face type every turn, one rewards paths of the right length, one
pays a bounty for its Wanted poster.

WHAT'S INSIDE
- 4 origins (Dwarf, Gnome, Halfling, Pixie) and 4 classes, each with its own zone of the tray and its own skill
- 3 dungeon floors with 37 monsters, 12 traps and 9 bosses
- 50+ loot dice to find, wear and unlock as starting boons, and 20+ relics
- 32 shrines, camps where you rest or train your dice, and forks where you pick your door
- A Daily Dungeon: the same dungeon for everyone each day, one scored try, and a result to share
- Guild Ranks: every run earns renown toward 12 ranks, each with a gift for future runs
- Depth: 10 difficulty rules you stack yourself, for players who want the dungeon to bite back

MADE FOR YOUR DESK AND YOUR COUCH
Built for a wide screen, with mouse, keyboard or controller. Plays on the Steam Deck. Saves to your own computer.

FROM THE TABLE TO THE SCREEN
Dungeon Scramble started as a board game designed by Jeremy and Katlynn Friedman. Every monster name is a pun, most of
them about maths.
```

## Features for the "Single-player / Steam features" checklist
- Single-player
- Full controller support (once a native Steam Input check is done on the Deck: see Steam Deck below; until then "Partial controller support")
- Steam Achievements (only after steamworks.js is wired: not yet)
- Steam Cloud (only after Auto-Cloud is set up for the save folder: not yet)
- Family Sharing: yes

## Tags (Steam lets the developer apply up to 20; most important first)
Roguelike, Roguelite, Dice, Turn-Based Tactics, Puzzle, Dungeon Crawler, Strategy, Turn-Based Strategy, RPG, Board Game,
Fantasy, Cartoony, Hand-drawn, Colorful, Cute, Funny, Replay Value, Singleplayer, Indie, Casual.

## Genre
Indie, Strategy, RPG (Steam's main genres; Casual optional).

## Supported languages
English (interface, full audio not applicable: there is no voice acting; tick "Interface" and "Subtitles" only).

## System requirements (Electron app from steam/; conservative)

| | Minimum | Recommended |
|---|---|---|
| OS | Windows 10 64-bit / SteamOS / Ubuntu 22.04+ | Windows 11 64-bit |
| Processor | Dual-core 2 GHz | Quad-core 2.5 GHz |
| Memory | 4 GB RAM | 8 GB RAM |
| Graphics | Any GPU with WebGL 2 / hardware acceleration | Same |
| Storage | 400 MB available space | Same |

The app folder is about 280 MB (Electron + the game). [CHECK the Windows folder size from the first Steam build workflow run.]

## Content survey (Steamworks > Content Survey)
- Violence: "Some Violence or Gore": cartoon fantasy combat only, no blood or gore (same answers as the Play and App Store
  rating notes in store_listing.md).
- Nudity / sexual content, mature content: none.
- **AI-generated content disclosure (required):** Pre-generated: yes. Suggested wording (Jeremy to confirm, matches the
  itch and credits disclosure):

```
Many of the monster, item and portrait pictures began as AI-generated images and were then redrawn and hand-retouched by
the developer; more of them are being redrawn from scratch over time. No AI generates content while you play.
```

(The first-players research found that an AI disclosure on Steam correlates with fewer reviews; being clear and specific
about the hand-retouching is the best mitigation. Redrawing the remaining AI-assisted art shrinks the disclosure.)

## Price
Planned $7.99 on Steam (release plan, Oct 21: $5.99 phones / $7.99 Steam). Steam suggests regional prices from the USD price.

## Images (made by tools/media/steam_capsules.js, docs/release/media/steam/)
Header capsule 920x430, small 462x174, main 1232x706, vertical 748x896, library capsule 600x900, library header 920x430,
library hero 3840x1240, library logo 1280x720 (needs the transparent title lettering from the PSD), community icon 184x184.
Screenshots: at least 5 at 1920x1080 from the PC layout (node tools/pc_shots.js fight,boss,camp,fork,stamp 1920x1080).
Trailer: docs/release/media/trailer.mp4 (38 s, 1920x1080, with the game's own music; tools/media/trailer*.js); on YouTube: https://youtu.be/JPX5PqwpdOg. Steam takes the MP4 upload directly.
