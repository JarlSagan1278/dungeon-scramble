# Dungeon Scramble: store listing draft

Drafted Oct 21, 2026 from build 1.41.76 (content counts read from `src/data.js` and `src/depth.js`). Recount before submitting if content changes. Character counts were measured with a script (spaces included). Apple and Google count characters, not bytes; the em dash is avoided so nothing counts double anywhere.

## Content counts used (build 1.41.76)

| Content | Count | Source |
|---|---|---|
| Origins | 4: Dwarf, Gnome, Halfling, Pixie (some unlock by playing) | `ORIGINS` |
| Classes | 4: Armsmaster, Guard, Dungeoneer, Arcanist (Debug class excluded) | `CLASSES` |
| Floors | 3 (Floors 1-2 end in one of 3 bosses each; Floor 3 ends in one of 3 Big Bosses) | `FLOORS`, `BIG_BOSSES` |
| Monsters | 37 enemies + 12 traps (unique names across the 3 floors) | `FLOORn_ENEMIES`, `FLOORn_TRAPS` |
| Bosses | 9 (6 floor bosses + 3 Big Bosses) | `FLOORn_BOSSES`, `BIG_BOSSES` |
| Shrines | 32 (11 / 11 / 10) | `FLOORn_SHRINES` |
| Loot dice | 56 (20 Alloy, 20 Gilded, 16 Magic) + 6 basic dice | `ALLOY`, `GILDED`, `MAGIC`, `BASIC_DICE` |
| Relics | 27 (4 of them origin relics earned by winning) | `RELICS` |
| Depth | 10 modifiers; max depth 27 if every rank is taken (shown as Depth 0 to 27) | `DEPTH_MODS` |

## App name (max 30)

**Dungeon Scramble** (16)

## App Store subtitle (max 30)

**Dice-Path Roguelike Crawler** (27)

Alternates: "Roguelike Dice-Path Dungeon" (27; repeats "Dungeon" from the name, which wastes keyword weight), "Trace Dice Paths, Beat Monsters" (31, one over: would need "Trace Dice Paths, Beat Foes", 27).

## Google Play short description (max 80)

**Roll a 4x4 tray of dice, trace one path, and smash through the dungeon.** (71)

## Promotional text (App Store, max 170)

**Roll the dice, trace your path, kick in the door. A roguelike dungeon crawl where every turn is a small puzzle. Floor 1 is free; the rest is one purchase. No ads.** (162)

Promotional text can be changed without a new build: use it later for launch news or a sale.

## Full description (max 4000; this draft 1570)

```
Kick in the door. Roll your dice. Find the path.

Dungeon Scramble is a turn-based roguelike where every turn is a small puzzle. Your dice land in a 4x4 tray, and you trace one path through neighboring dice. Each die you step on fires its face: Hit, Block, Heal, Combo, Boost, Freeze and more. Maneuver faces like Leap, Dodge and Pivot bend the rules of the path. Chain them in the right order and a modest roll becomes a monster-flattening turn.

The monsters fight back, but they play fair: you always see what each one plans to do next turn. Block the big hit, freeze the wind-up, or burst it down before it lands.

WHAT'S INSIDE
- 4 origins (Dwarf, Gnome, Halfling, Pixie) and 4 classes, each with its own zone of the tray and a once-per-turn trick
- 3 floors with 37 monsters, 12 traps and 9 bosses, including 3 Big Bosses with a second phase
- 56 loot dice to find, equip and unlock as starting boons
- 27 relics and 32 shrines, from fair trades to shady bargains
- Camps where you choose: rest, or train your dice
- Depth: 10 stackable modifiers for when the base dungeon stops being scary, plus class badges and dice finishes to show off

Some foes have a math problem. Others are the math problem. Expect the Anti-Euclidian Space, the Gnomeowners Association and a Co-consul of Waste.

FAIR PRICE, NO ADS
Floor 1 is free to play, start to finish. One purchase unlocks the Full Dungeon for good. No ads, no energy timers, no account. Your progress stays on your device, and the game plays offline.

Designed by Jeremy and Katlynn, who first built it as a board game.
```

Claims check: "see what each one plans to do next turn" = the face-off next-turn chips (`enemyNextTurnPreview`); "second phase" = Big Boss `phase2` kits; "unlock as starting boons" = 3 copies rule; "rest, or train your dice" = the camp fire is Rest OR Train; "plays offline" = true for the web build (service worker) and the native app, apart from the store purchase itself. "Designed by Jeremy and Katlynn, who first built it as a board game" is from Jeremy (Oct 22); remove it if Jeremy would rather keep the listing impersonal. [CONFIRM what exactly Floor 1 free includes, e.g. all four classes or only some, and update "Floor 1 is free to play, start to finish."]

## App Store keywords (max 100)

```
roguelike,roguelite,dice,path,puzzle,crawler,loot,relic,boss,strategy,turn based,offline,math,grid
```
(98)

No words from the name ("dungeon", "scramble"). Apple also indexes the subtitle, so with the subtitle above "dice", "path", "roguelike" and "crawler" are counted twice; to widen reach, swap them for e.g. `fantasy,rpg,tactics,board` (`roguelite,puzzle,loot,relic,boss,strategy,turn based,offline,math,grid,fantasy,rpg,tactics,board` = 96). No trademarks (no Boggle, Slay the Spire, Balatro, D&D or other game names).

## Categories

- **App Store:** primary Games; game subcategories **Role Playing** (primary) and **Strategy** (secondary). Alternative: Puzzle + Board.
- **Google Play:** category **Role Playing** (alternative: Strategy). Tags to pick in Play Console: Roguelike, Dungeon crawler, Turn-based, Fantasy, Offline, Single player.

## Age rating notes

Questionnaire answers this build supports:
- **Violence:** cartoon or fantasy violence, infrequent/mild. Turn-based dice combat against fantasy monsters; damage is shown as numbers, health bars and shakes; no blood, gore or realistic violence; no human-on-human violence beyond fantasy adventurers.
- **Horror/fear themes:** none to mild (creepy-eyed minion dice, skeleton and fungus monsters, cartoon style).
- **Gambling:** none. Dice are game pieces; there is no betting, wagering, casino play or paid random rewards (answer "No" to simulated gambling).
- **Language, sexual content, drugs, alcohol, tobacco:** none. Note for reviewers: some monster names are puns on real words (e.g. "Leper Colonizers", "Unauthorized Transfusion", "Ergot Eruption"); none depict drug use. [CHECK the full names sheet once before submitting.]
- **User-generated content / chat / sharing:** none. A typed character name stays on the device.
- **In-app purchases:** yes, one non-consumable unlock ("Full Dungeon", [PRICE, planned $5.99 on phones]).
- **Ads:** none.

Expected results: Apple 9+ (infrequent/mild cartoon or fantasy violence); IARC (Google Play) likely PEGI 7 / ESRB Everyone 10+ or Everyone. [CONFIRM after completing the questionnaires.]

## Privacy answers (for App Store "App Privacy" and Google Play "Data safety")

From the play-data code (see `docs/release/privacy.html`). Only applies because of the optional, opt-in play data:
- **Apple App Privacy:** declare **Usage Data > Product Interaction** (run events) and **Diagnostics > Other Diagnostic Data** (error messages; Crash Data too if you prefer to be broad). The random play-data id is generated by the app, not a device-level id like the IDFA/IDFV, so it is usually not "Device ID"; Apple's closest box is **Identifiers > User ID**. [DECIDE using Apple's current definitions.] For every type: **Not linked to you**, **Not used for tracking**, purpose **Analytics** (and App Functionality for diagnostics).
- **Google Play Data safety:** collects **App activity > Other actions** (gameplay events), **App info and performance > Crash logs / Diagnostics**, **Device or other IDs** (random app id). Collection is **optional** (user can choose); **not shared** with third parties (Google as the developer's own processor counts as a service provider, not sharing); **encrypted in transit: yes** (HTTPS); **users can request deletion: yes** (by email with the device id).
- Privacy policy URL: [PRIVACY POLICY URL] (publish `docs/release/privacy.html`).
