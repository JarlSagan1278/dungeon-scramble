# Dungeon Scramble (digital prototype)

A browser-based prototype of the Dungeon Scramble board game: Boggle-style
dice-path building + dungeon crawling. Pure HTML/CSS/JavaScript, no
frameworks, no build tooling required to *play* it.

## Project layout

```
src/
  _head.html   <head> boilerplate (charset, title, Google Fonts link)
  _body.html   <body> shell (title bar + #app mount point)
  styles.css   all CSS
  data.js      game data: dice tables, origins, classes, loot tables,
               encounter definitions per floor, floor/route structure
  assets.js    embedded art (logo, portraits, monster illustrations) as
               base64 data URIs
  logic.js     game state, save/load, dice-tray mechanics, path
               resolution, encounters, camp, shrines
  render.js    all render*()/HTML-building functions
  main.js      bootstrap (sets the logo image, calls the first render())

index.html     dev entry point -- loads the src/ files directly via
               <script src="..."> / <link rel="stylesheet">. Open this
               file straight in a browser (file://) while iterating; no
               server needed, and no build step needed to try changes.

build.js       concatenates everything in src/ back into one
               self-contained file: dist/dungeon_scramble.html. This is
               the file to hand to a player -- download it and
               double-click to open, still no server required.

sim.js         headless-browser regression test (see below).
```

## Building the distributable file

```
npm run build
```

Produces `dist/dungeon_scramble.html`, a single file with no external
dependencies except the Google Fonts stylesheet link (the game still
renders fine if that fails to load, e.g. offline).

## Regression testing

`sim.js` loads the built game in a headless Chromium (via Playwright) and
plays it with a bot that takes random-but-legal actions, calling the
game's own functions directly (`newGame`, `toggleSelect`, `skipTransition`,
`campRest`, `chooseLoot`, etc.) rather than clicking through the DOM. It
runs one game per Origin/Class combo (plus the Debug class) and reports
`VICTORY` / `GAMEOVER` / `TIMEOUT` for each. The suite only fails on an
actual JS error/exception -- TIMEOUT is an expected outcome for some
class/origin pairings against a purely random bot, not a bug.

```
npm run sim          # build + full run (2000-turn cap per game)
npm run sim:quick     # build + shorter run (500-turn cap), faster iteration
```

Run this after any change to `src/logic.js` or `src/data.js` before
considering a change done.

## Design source materials

The original game-design documents (rules manual, mechanics spreadsheet,
card decks, hand-drawn art) that all game data and art were derived from
live outside this repo and are kept as the reference of truth for data
fidelity: `DS_-_Manual.docx`, `DS_-_Mechanics_Document.xlsx`,
`DS_-_Cards.pptx`, `DS_-_Manual_Graphics.pptx`, plus the source art files
used to trace the icon set.

## Known deferred work

- Boss action-cycle order/design is a placeholder (`dmg -> minion ->
  shield -> hot -> heal -> dot`, applied one action per turn) -- not
  finalized, don't rework without explicit direction.
- No further art is coming for now (Halfling/Pixie portraits and most
  monster illustrations use placeholder art) -- don't request or assume
  new assets.
