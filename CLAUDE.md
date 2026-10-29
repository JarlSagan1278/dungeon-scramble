# Dungeon Scramble — project notes for Claude

Digital prototype of the board game Jeremy designed with his wife Katlynn (Boggle-style dice-path dungeon crawler). Plain HTML/CSS/JS, no framework. Single owner/designer: Jeremy (playtests on his phone, 395x769 game card — it must not grow taller).

**Every session: read `docs/PROJECT_CONTEXT.md` and `docs/TODO.md` first** (`docs/STUDY_FINDINGS.md` holds what the balance studies and research found; old reports are in git history). Whenever Jeremy makes a design decision, record it (dated) at the bottom of the matching topic file in `docs/decisions/` (index in PROJECT_CONTEXT.md) and commit.

## Commands
- `node build.js` → `dist/dungeon_scramble.html` (single file) + `dist/web/` (installable PWA; art extracted to `dist/web/art/`). Also syncs package.json version. `--demo` → `dist/demo/` (Floor 1 only, `BUILD.demo`); `--release` → `dist/release/` (no Debug unlock, `BUILD.release`); `--app` → `dist/app/` (store app: release + `BUILD.app`, Floor 1 free, then the unlock screen; `hasFullGame()`, `STORE` in logic.js). Tester builds stay the default. check.js's unlock check needs `node build.js --app` first.
- `node tools/check.js` (`npm run check`) → **every automated check in one browser, ~2 min** (Oct 17): tools/sim.js (random-legal bot, 5 origin/class combos; fails only on JS errors), class passives/wraps/relics/Boost tokens, UI flows (camp, shrine, quests, music, uploads), fast-redraw equivalence (path, tray), Swap/Reroll, every shrine option. One line per check; exit 1 on any failure. `node tools/check.js quick` (~1 min: sim + UI + redraws) for small visual changes. Run after ANY change.
- `node tools/bugsearch.js` (`npm run bughunt`) → the broader bug hunt; can hang, run with `timeout`/nohup. `QUICK=1` adds fresh-device first runs (quick start), `FLICK=1` keeps the chest lid on. Tests live in `tools/tests/` (named after their check.js key).
- Android app (Oct 26): `app/` is a Capacitor 8 project (appId com.dungeonscramble.game). `node build.js --app && node tools/app/prepare.js` copies the app web build into app/www (service worker off, app version = game version); `python3 tools/app/icons.py` redraws icons/splash. The APK is built on GitHub (`.github/workflows/android.yml`, Actions tab > run > Artifacts > dungeon-scramble-apk) because this container can't download the Android SDK.
- `npm run rulebook` (`node tools/gen.js && node tools/print_rulebook.js`) → rulebook HTML + `docs/DungeonScramble_Rulebook.pdf`.
- `tools/balance/` → headless balance harness (`harness.js '{"runs":40,"skill":1500}'`; `study_maneuver.js` is the player-like bot with knobs that new study scripts patch; `bg_baseline.py`/`agg_baseline.py` are the launcher/aggregator templates). Outputs `out_*.json` and `snap_*.html` are git-ignored: delete them when a study is written up, and add the result to `docs/STUDY_FINDINGS.md` (one-off study scripts and reports are not kept in the tree; they are in git history).
- `tools/media/` → marketing media from the release build: `shots.js` (screenshots), `promo.js` (4:5 promo image), `clip.js` + `mk.py` (one-turn MP4/GIF). Output in `docs/release/media/` (git-ignored).

## Release routine
1. Bump `GAME_VERSION` in `src/data.js` (cache name `ds-<ver>` follows it). 2. `node build.js && node tools/check.js` (all ok). 3. Publish preview to the Artifact (`dist/dungeon_scramble.html`, same URL, label <=60 chars). 4. Commit as `<ver>: <summary>`; add a CHANGELOG line. 5. Push to origin. 6. Sync the names sheet (Google Sheet `1sT6kFeTvl_V7g3Mmwp2hrTC0FtQEdgsfgYSUDmJrLCE`): it is the living database of every name, stat, face, move, quest and flavor line, so update it with every change (Jeremy, Oct 12).
- **Tester site (Oct 26):** https://dungeon-scramble.dungeonscramblegame.workers.dev (Cloudflare Workers, account dungeonscramblegame@gmail.com, project `dungeon-scramble`, Git-connected). Every push to `main` rebuilds it (`node build.js`, then `npx wrangler deploy` of dist/web per wrangler.jsonc), so only push to main once checks pass. Jeremy and Kat play here; Netlify is no longer needed for them.
- **Netlify zips are made only when the owner (Jeremy) asks**, and previews are published separately from them (a preview publish never implies a zip). Each upload costs him ~5% of his monthly allotment. Zip: `cd dist/web && zip -qr /tmp/dungeon_scramble_web_<ver>.zip .` then SendUserFile.
- Live: https://dungeon-scramble-mobile.netlify.app/ . Preview artifact: https://claude.ai/artifact/EgVZK1tuHgNfJpqhd92jPR
- GitHub origin (`main`) is the source of truth. Commit regularly and push after each release commit.

## Layout
`src/{data,assets,logic,depth,render,music,main}.js` + `styles.css` concatenated by build.js. `assets.js` is base64 art (3.5 MB, WebP with a paper texture since 1.41.26; new art goes through `tools/art/paper.py`). Global state `S`; `render()` rebuilds `#app`. Telemetry: `teleLog(...)`; export via the gear menu (Export Play Data).

## Gotchas (learned the hard way)
- Never replace a code slice by index without checking neighbors: a slice replace once deleted `applyBossCycleAction` (boss turns threw intermittently). Run sim several times after big logic edits.
- Global `button` rule uses `filter: drop-shadow(0 4px 0 var(--line))` for thickness — any animation that sets `filter` must include it.
- Idle `.zone-cell` has `box-shadow !important`; animate transform/filter instead (scale/blur makes dice faces blurry → use translate/rotate twitches).
- Minions: cells have `minion`/`coveredDie`/`blank`; new minions queue in `S._pendingMinions` and are placed after the roll scramble. Real face revealed only during path resolution (`S._resolvingPath`, `pathFaceForIdx`) so maneuvers can't scout. Jumping over a minion clears it; a blank landing ends the path.
- Service worker: hashed `/art/<sha1-12>.png|jpg` are cache-first, everything else network-first. Write regexes with `[/]` inside template literals.
- Bosses (1.35.0+) use `e.kit` from `BOSS_KITS` (data.js): `each` acts every turn + `specials` looped by `e.specialIdx`, `phase2` after a turn ending at <=50% HP; `actionCycle` is gone. Regular enemies have `e.tier`/`e.turnsActed` (heavy turns, `HEAVY_EVERY`). A special's `herald` act (1.37.0, `bossHerald`) fires when that special becomes the next one, so its Minions land with the warning. `enemyNextTurnPreview(e)` drives the face-off chips and the study bot. Old harness knobs that edit `e.dmg` don't touch bosses.
- Swap/Reroll (1.38.0; mid-path since 1.39.1, never on a die in the path): tray actions (`S.trayAct`, `trayActTap`, `toggleSelect` routes taps to them). A used die gets `cell.spent` (reads as blank via `currentFace`). Swaps swap whole cell objects and log to `S.swapLog` so `clearPathAll()` can undo them; rerolls are final. Covered by `tools/check.js` (trayact).
- Path taps use `renderPathOnly()` (render.js), not `render()`: it redraws only the dice, path strip, counter, Go, chest lock and the enemy hp bar (falls back to render() for anything unusual). If a path step starts changing anything else on screen, update renderPathOnly too (check.js: pathrender). Click handlers are NOT rebuilt by renderPathOnly, so a handler must read live state (S.path etc.), never a value captured at the last full render (that bug made Go dead until a full redraw, 1.39.2-1.39.3).
- Swap/Reroll and class-Skill taps use `renderTrayFast()` (render.js, Oct 14): it also redraws the tray's armed classes and the Skill button. The armed Skill tap is handled in `bindTrayDice` (no one-shot listeners). (check.js: trayfast).
- Scramble flick (1.41.83): `scrambleTray(true)` at turn/room start sets `S.needRoll` (tray covered, Scramble replaces Go) until `scrambleRoll()`; faces are already rolled. Off for webdriver unless localStorage `dungeonScrambleRollTest` (check.js: scramble).
- Pocket/Organize fold in camp: measure positions after applying absolute positioning, cluster rows with ~16px tolerance.

## Design rules Jeremy has set
- Toy-like look: chunky outlines (3px windows/cards/dice, 2px buttons/chips, never 1px); every button a raised toy with its own colour (bevel + drop shadow); never the same color next to itself; gold = the main action. Surfaces (Oct 29): dark brown for menus and pop-ups, light brown for camp and character-select cards, parchment only for in-world objects (Quests sign, the Codex book, How to Play). Metamorphous for titles and the one big main button on a screen, Alegreya (bundled) elsewhere.
- Every interaction should feel as good as possible; room dressing is open again (Oct 29: more props and a sense of going deeper per floor, the vines need work), refine rather than clutter; dice upgrades = filigree borders/emblazoned corners (no glows).
- Rules: enemy Shield absorbs player damage; Block/statuses reset each room; minions clear one per damage dealt (+ Leap-over), never carry between fights; loot dice need 3 copies to unlock as Starting Boon; a Back Pocket save spends the whole Pocket (1.41.16); each Camp's fire is Rest OR Train (combining dice).
- "Heat" difficulty was renamed **depth**; class badge shows highest depth cleared.
- Boss action cycle rework is approved (Oct 11): bosses should be much more challenging and strategic around the next-turn info. Boost on Maneuver II/III is allowed now (Jeremy, Oct 13: it fits maneuvering); he prefers strong Block faces over passive riders for high Maneuver dice.

- **Balance philosophy (Oct 13):** single-player roguelike: variance, failing and luck are part of the fun; don't flatten content to the median. Over-strong player pieces (loot, relics, combos) are acceptable; over-strong enemies and unfair deaths are not. Use studies to find broken outliers and dead content. See PROJECT_CONTEXT "Balance philosophy".

- Naming: heavy math and math-pun theme, plus faction flavor (dwarves: math, 3D printing, engineering, mining; gnomes: sorcery, biochemistry, illusions, grafting; halflings: hillbillies, food; pixies: illusions, trickery, old magic). Mark Claude-made names blue in the names sheet.

## Open to-do list
See `docs/TODO.md` (prioritized).
