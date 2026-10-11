# Dungeon Scramble — project notes for Claude

Digital prototype of Jeremy's board game (Boggle-style dice-path dungeon crawler). Plain HTML/CSS/JS, no framework. Single owner/designer: Jeremy (playtests on his phone, 395x769 game card — it must not grow taller).

**Every session: read `docs/PROJECT_CONTEXT.md` and `docs/TODO.md` first.** Whenever Jeremy makes a design decision, update `docs/PROJECT_CONTEXT.md` to record it (and commit).

## Commands
- `node build.js` → `dist/dungeon_scramble.html` (single file) + `dist/web/` (installable PWA; art extracted to `dist/web/art/`). Also syncs package.json version.
- `node sim.js` → 5-combination crash smoke test (random-legal bot, one run per origin/class combo listed in sim.js; not full coverage). Fails only on JS errors (TIMEOUT/GAMEOVER are fine). Run after ANY logic/data change.
- `node bugsearch.js` → the broader bug hunt; can hang, run with `timeout`/nohup. Needs no stray `http.server` on 8765/8766.
- `tools/balance/` → headless balance harness (`harness.js '{"runs":40,"skill":1500}'`, `study_*.js`). Outputs `out_*.json` are git-ignored.

## Release routine
1. Bump `GAME_VERSION` in `src/data.js` (cache name `ds-<ver>` follows it). 2. `node build.js && node sim.js`. 3. Publish preview to the Artifact (`dist/dungeon_scramble.html`, same URL, label <=60 chars). 4. Commit as `<ver>: <summary>`; add a CHANGELOG line. 5. Push to origin.
- **Netlify zips are made only when the owner (Jeremy) asks**, and previews are published separately from them (a preview publish never implies a zip). Each upload costs him ~5% of his monthly allotment. Zip: `cd dist/web && zip -qr /tmp/dungeon_scramble_web_<ver>.zip .` then SendUserFile.
- Live: https://dungeon-scramble-mobile.netlify.app/ . Preview artifact: https://claude.ai/artifact/EgVZK1tuHgNfJpqhd92jPR
- GitHub origin (`main`) is the source of truth. Commit regularly and push after each release commit.

## Layout
`src/{data,assets,logic,depth,render,main}.js` + `styles.css` concatenated by build.js. `assets.js` is base64 art (3.3 MB). Global state `S`; `render()` rebuilds `#app`. Telemetry: `teleLog(...)`; export via the gear menu (Export Play Data).

## Gotchas (learned the hard way)
- Never replace a code slice by index without checking neighbors: a slice replace once deleted `applyBossCycleAction` (boss turns threw intermittently). Run sim several times after big logic edits.
- Global `button` rule uses `filter: drop-shadow(0 4px 0 var(--line))` for thickness — any animation that sets `filter` must include it.
- Idle `.zone-cell` has `box-shadow !important`; animate transform/filter instead (scale/blur makes dice faces blurry → use translate/rotate twitches).
- Minions: cells have `minion`/`coveredDie`/`blank`; new minions queue in `S._pendingMinions` and are placed after the roll scramble. Real face revealed only during path resolution (`S._resolvingPath`, `pathFaceForIdx`) so maneuvers can't scout. Jumping over a minion clears it; a blank landing ends the path.
- Service worker: hashed `/art/<sha1-12>.png|jpg` are cache-first, everything else network-first. Write regexes with `[/]` inside template literals.
- Bosses (1.35.0+) use `e.kit` from `BOSS_KITS` (data.js): `each` acts every turn + `specials` looped by `e.specialIdx`, `phase2` after a turn ending at <=50% HP; `actionCycle` is gone. Regular enemies have `e.tier`/`e.turnsActed` (heavy turns, `HEAVY_EVERY`). A special's `herald` act (1.37.0, `bossHerald`) fires when that special becomes the next one, so its Minions land with the warning. `enemyNextTurnPreview(e)` drives the face-off chips and the study bot. Old harness knobs that edit `e.dmg` don't touch bosses.
- Pocket/Organize fold in camp: measure positions after applying absolute positioning, cluster rows with ~16px tolerance.

## Design rules Jeremy has set
- Toy-like look: chunky outlines, dark-brown base with light-brown windows; never the same color next to itself; each button its own color; Metamorphous titles, plain serif elsewhere.
- Every interaction should feel as good as possible; no room dressing (banners/skulls) for now; dice upgrades = filigree borders/emblazoned corners (no glows).
- Rules: enemy Shield absorbs player damage; Block/statuses reset each room; minions clear one per damage dealt (+ Leap-over), never carry between fights; loot dice need 3 copies to unlock as Starting Boon.
- "Heat" difficulty was renamed **depth**; class badge shows highest depth cleared.
- Boss action cycle rework is approved (Oct 11): bosses should be much more challenging and strategic around the next-turn info. Don't add Boost to Maneuver dice unless asked (last resort only); Maneuver meta is on hold pending more play data.

## Open to-do list
See `docs/TODO.md` (prioritized).
