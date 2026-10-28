# Dungeon Scramble — TODO

Updated Oct 28, 2026 (build 1.41.98). Done work lives in `CHANGELOG.md`; decisions in `decisions/` (index: `PROJECT_CONTEXT.md`);
study results in `STUDY_FINDINGS.md`. The release checklist (40 items, owner and status) is the Checklist tab of
the release plan doc: https://claude.ai/artifact/ExGeVZnx3Xe1RZnYnHmxLH

## Now: first players
1. **Posting plan, Oct 28 – Nov 9** (page: https://claude.ai/artifact/EXsbT3N29MADimSzs15gaN; texts in
   `release/posts_nov.md`; tracking in `release/outreach.md`). One community a day; log Reddit views and itch
   views/plays the next day.
2. **Read the play data** (sheet `1W1TyynfdWTlxMqzr7TJOTZKMY6sOPBVPfXVd41kcGSM`). Check-in scheduled Oct 29.
   Once ~10 new players have shared runs: `python3 tools/playdata/funnel.py <run JSONs> --out report.md`. Watch
   deaths in fights 2–4 of a first run (soften those rooms at depth 0 if over ~15%), whether players use the Skill,
   and phone vs desktop.
3. **Retune only from real data.** Bot win rates are not human ones (see `STUDY_FINDINGS.md`). Re-calibrate the
   regular/new bot profiles against the first real runs.

## Release gaps (review Oct 28)
Fixed in 1.41.96: tutorial cards, defeat screen, copy, dev features, credits, desktop backdrop, shrine text. Type and buttons
done in 1.41.97 (Alegreya, toy bevel). Open: the credits' art
line ("Art by Jeremy Friedman"; how to note the untouched pixie portraits), Jeremy's. Art treatment settled in 1.41.98 (grain kept, cover matched).

## Waiting on Jeremy
- **Title art:** new cover drawn from scratch on the 2048x2434 canvas (`DungeonScramble_TitleArt_canvas.psd`); the chat
  only passes 860 px, so export full size from Sketchbook or upload the PSD to the repo. Keep the logo layer for Steam.
- **Redraw the remaining AI-assisted art** (pixie portraits, the remaining original loot) to shrink the disclosure.
- **Google Play account** (personal): then real billing behind `STORE` / `window.DSStore` (logic.js), the store
  listing (`release/store_listing.md`), feature graphic and screenshots.
- **Sound effect pass:** his ear test.
- **Armsmaster red Skill vs red Clear:** options shown Oct 15.
- **Custom domain** (play.dungeonscramble.com on Cloudflare): instructions given Oct 26.

## Next for Claude
- **Rulebook text refresh** (checklist #16): the PDF's rules lag the game (minions, Boost tokens, Swap/Reroll,
  campfire Rest or Train, quick start). `npm run rulebook`.
- **Performance on slow phones:** ~1.5 s of script per turn at CPU x4 (renderGame/placeVs) and ~500 ms of style work
  during playback; the demo's first load is ~5 MB (lazy-load art).
- **Small:** the intermittent "resume failed" on the tester-only Debug class in the bug
  hunt (save gone after reload; never seen on the four real classes).

## Later
- **Optional caps, only if play feels unfair:** damage-per-Minion specials count at most 8 Minions; Extruzeon layers max +12.
- **Free print-and-play edition** (component sheets + current rules) for the BGG solo contest (see `release/first_players.md`).
- **Relic look polish:** a bracelet view in the relic list, sockets that grow with depth.
- **Replay tool** for the tray/path telemetry.
- **A conversion relic** (e.g. 1 damage per Shield gained).
- **Co-op multiplayer** (lowest priority): feasibility doc https://claude.ai/code/artifact/1a2e8cb1-5527-400c-b4a2-defff09d6323
  ("Shared Foe, Two Chests"; six questions for Jeremy; first step a tabletop test).
