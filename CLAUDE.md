# Dungeon Scramble — project notes for Claude

Digital prototype of the board game Jeremy designed with his wife Katlynn (Boggle-style dice-path dungeon crawler). Plain HTML/CSS/JS, no framework. Single owner/designer: Jeremy (playtests on his phone, 395x769 game card — it must not grow taller).

**Every session: read `docs/PROJECT_CONTEXT.md` and `docs/TODO.md` first.** Whenever Jeremy makes a design decision, update `docs/PROJECT_CONTEXT.md` to record it (and commit).

## Commands
- `node build.js` → `dist/dungeon_scramble.html` (single file) + `dist/web/` (installable PWA; art extracted to `dist/web/art/`). Also syncs package.json version. `--demo` → `dist/demo/` (Floor 1 only, `BUILD.demo`); `--release` → `dist/release/` (no Debug unlock, `BUILD.release`). Tester builds stay the default.
- `node tools/check.js` → **every automated check in one browser, ~2 min** (Oct 17): sim.js (random-legal bot, 5 origin/class combos; fails only on JS errors), class passives/wraps/relics/Boost tokens, UI flows (camp, shrine, quests, music, uploads), fast-redraw equivalence (path, tray), Swap/Reroll, every shrine option. One line per check; exit 1 on any failure. `node tools/check.js quick` (~1 min: sim + UI + redraws) for small visual changes. Run after ANY change.
- `node bugsearch.js` → the broader bug hunt; can hang, run with `timeout`/nohup. Needs no stray `http.server` on 8765/8766.
- Android app (Oct 26): `app/` is a Capacitor 8 project (appId com.dungeonscramble.game). `node build.js --release && node tools/app/prepare.js` copies the release web build into app/www (service worker off, app version = game version); `python3 tools/app/icons.py` redraws icons/splash. The APK is built on GitHub (`.github/workflows/android.yml`, Actions tab > run > Artifacts > dungeon-scramble-apk) because this container can't download the Android SDK.
- `node tools/gen.js && node tools/print_rulebook.js` → rulebook HTML + `docs/DungeonScramble_Rulebook.pdf`.
- `tools/balance/` → headless balance harness (`harness.js '{"runs":40,"skill":1500}'`; `study_maneuver.js` is the base the newer `study_*.js` knob scripts patch, with `bg_*.py` launchers and `agg_*.py` tables as templates). Outputs `out_*.json` and `snap_*.html` are git-ignored: delete them when a study is written up (they reached 2.9 GB by Oct 17). Old one-off scripts were removed Oct 17 (in git history).

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
- Toy-like look: chunky outlines, dark-brown base with light-brown windows; never the same color next to itself; each button its own color; Metamorphous titles, plain serif elsewhere.
- Every interaction should feel as good as possible; no room dressing (banners/skulls) for now; dice upgrades = filigree borders/emblazoned corners (no glows).
- Rules: enemy Shield absorbs player damage; Block/statuses reset each room; minions clear one per damage dealt (+ Leap-over), never carry between fights; loot dice need 3 copies to unlock as Starting Boon; a Back Pocket save spends the whole Pocket (1.41.16); each Camp's fire is Rest OR Train (combining dice).
- "Heat" difficulty was renamed **depth**; class badge shows highest depth cleared.
- Boss action cycle rework is approved (Oct 11): bosses should be much more challenging and strategic around the next-turn info. Boost on Maneuver II/III is allowed now (Jeremy, Oct 13: it fits maneuvering); he prefers strong Block faces over passive riders for high Maneuver dice.

- **Balance philosophy (Oct 13):** single-player roguelike: variance, failing and luck are part of the fun; don't flatten content to the median. Over-strong player pieces (loot, relics, combos) are acceptable; over-strong enemies and unfair deaths are not. Use studies to find broken outliers and dead content. See PROJECT_CONTEXT "Balance philosophy".

- Naming: heavy math and math-pun theme, plus faction flavor (dwarves: math, 3D printing, engineering, mining; gnomes: sorcery, biochemistry, illusions, grafting; halflings: hillbillies, food; pixies: illusions, trickery, old magic). Mark Claude-made names blue in the names sheet.

## Open to-do list
See `docs/TODO.md` (prioritized).
