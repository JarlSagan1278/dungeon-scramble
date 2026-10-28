# Dungeon Scramble

A turn-based dice roguelike for phones. Each turn you roll 16 dice into a 4x4 tray and draw one path through them;
every die you step on fires its face (Hit, Block, Heal, Combo, Boost, Freeze, and Maneuvers that bend the path).
Monsters always show their next move. Three floors of rooms, camps, shrines and bosses; loot dice and relics build
the tray over a run.

Designed by Jeremy and Katlynn Friedman, from their board game of the same name. Plain HTML, CSS and JavaScript,
no framework; the build concatenates `src/` into one self-contained HTML file.

- **Free demo (Floor 1):** https://dungeonscramble.itch.io/dungeon-scramble
- **Tester site (full game, rebuilt on every push to `main`):** https://dungeon-scramble.dungeonscramblegame.workers.dev

## Quick start

```
npm install          # Playwright, for the checks
npm run build        # -> dist/dungeon_scramble.html (open it in a browser) and dist/web/ (installable web app)
npm run check        # every automated check, ~2 min
```

## Builds

| Command | Output | What it is |
|---|---|---|
| `npm run build` | `dist/dungeon_scramble.html`, `dist/web/` | Tester build (default): full game, Debug unlock on |
| `node build.js --demo` | `dist/demo/` | Free demo: Floor 1 only (`BUILD.demo`) |
| `node build.js --release` | `dist/release/` | Public full build, no Debug unlock (`BUILD.release`) |
| `node build.js --app` | `dist/app/` | Store app: release + Floor 1 free, then the unlock screen (`BUILD.app`) |
| `npm run build:all` | all of the above | Needed before `npm run check` (the unlock check uses `dist/app`) |

`dist/web/` is a PWA (manifest, icons, service worker; cache `ds-<version>`). The build also syncs
`package.json`'s version from `GAME_VERSION` in `src/data.js`.

## Checks

| Command | What it runs |
|---|---|
| `npm run check` | `tools/check.js`: the random-legal sim bot plus every test in `tools/tests/`, in one browser |
| `npm run check:quick` | sim + UI + fast-redraw checks (~1 min), for small visual changes |
| `npm run bughunt` | `tools/bugsearch.js`: 24 random runs with invariants, layout checks and save/resume. `QUICK=1` adds fresh-device first runs; `FLICK=1` keeps the chest lid on. Slow: run with `timeout` |

## Project layout

```
src/                 game source, concatenated by build.js in this order:
  data.js            game data: dice, origins, classes, loot, encounters, floors, version, BUILD flags
  assets.js          art as base64 WebP (portraits, monsters, loot, cover)
  logic.js           state (S), save/load, tray and path rules, encounters, camp, shrines, play data
  depth.js           depth (difficulty) modifiers, presets and badges
  render.js          every screen; render() rebuilds #app, renderPathOnly()/renderTrayFast() redraw parts
  music.js           procedural music and sound
  main.js            bootstrap, keyboard, Android Back button
  styles.css, _head.html, _body.html, pwa/ (icons)
app/                 Android app (Capacitor 8, com.dungeonscramble.game); APK built by .github/workflows/android.yml
art/                 cover art layers and the app icon source
docs/                design decisions, to-do, study findings, release material, music, rulebook PDF
tools/
  check.js, sim.js, bugsearch.js, tests/     automated checks
  balance/           headless balance harness (harness.js, study_maneuver.js) and a launcher/aggregator template
  art/               art export/import, paper texture, hi-res re-import, icon
  app/               copy the app build into app/www, draw icons and splash
  media/             screenshots, promo image, one-turn clip
  playdata/          Apps Script for the play-data sheet; funnel and analysis reports
  music/             music sketch and preview generators
  gen.js, print_rulebook.js, site.js           rulebook HTML/PDF and the press/privacy site
```

## Hosting and release

- **Tester site:** Cloudflare Workers, Git-connected; every push to `main` runs `node build.js` and deploys
  `dist/web` (`wrangler.jsonc`). Only push to `main` once the checks pass.
- **Demo:** `node build.js --demo`, rename `dist/demo/dungeon_scramble_demo.html` to `index.html`, zip it, upload to itch.io.
- **Android:** `node build.js --app && node tools/app/prepare.js`; GitHub Actions builds the APK (artifact
  `dungeon-scramble-apk`).
- **Release routine** (version bump, checks, changelog, preview): see `CLAUDE.md`.

## Docs

| File | What's in it |
|---|---|
| `CLAUDE.md` | Working notes: commands, release routine, gotchas, Jeremy's design rules |
| `docs/PROJECT_CONTEXT.md` | What the game is, who makes it, working style, and the index of `docs/decisions/` (every design decision by topic, with dates) |
| `docs/TODO.md` | Current priorities |
| `docs/STUDY_FINDINGS.md` | What the balance studies, audits and research found |
| `CHANGELOG.md` | Version history |
| `docs/release/` | Store/itch copy, press kit, privacy policy, outreach plan and posts |
| `docs/music/` | Music spec, sketches and previews |

## Art and fonts

Art is drawn by Jeremy; some pieces are still AI-assisted placeholders being redrawn (tracked in
`docs/DungeonScramble_art_inventory.xlsx`). Metamorphous is used under the SIL Open Font License
(`docs/licenses/Metamorphous-OFL.txt`).
