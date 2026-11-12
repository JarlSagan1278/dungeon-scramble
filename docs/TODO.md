# Dungeon Scramble — TODO

Updated Nov 12, 2026 (build 1.42.97). Done work lives in `CHANGELOG.md`; decisions in `decisions/` (index: `PROJECT_CONTEXT.md`);
study results in `STUDY_FINDINGS.md`. The release checklist (40 items, owner and status) is the Checklist tab of
the release plan doc: https://claude.ai/artifact/ExGeVZnx3Xe1RZnYnHmxLH

## Now: first players
0. **Publicity plan (Nov 5, reworked: strangers, not people we know):** https://claude.ai/artifact/EXsbT3N29MADimSzs15gaN. A: strangers who play (Playtester Discord, Newgrounds, r/playtesters swaps, a weekly short video, optional game nights). B: 8 small-creator pitches (docs/release/creators.md). C: Google Play closed test with testers from tester-swap communities (r/AndroidClosedTesting, r/TestersCommunity, Testers Community Google Group), then open testing ~Dec 1. Claude's parts: weekly short clip, signed app bundle + listing + closed-test track once the Play account exists.
1. **Posting plan, Oct 28 – Nov 9** (page: https://claude.ai/artifact/EXsbT3N29MADimSzs15gaN; texts in
   `release/posts_nov.md`; tracking in `release/outreach.md`). One community a day; log Reddit views and itch
   views/plays the next day.
2. **Read the play data** (sheet `1W1TyynfdWTlxMqzr7TJOTZKMY6sOPBVPfXVd41kcGSM`). Check-in scheduled Oct 29.
   Once ~10 new players have shared runs: `python3 tools/playdata/funnel.py <run JSONs> --out report.md`. Watch
   deaths in fights 2–4 of a first run (soften those rooms at depth 0 if over ~15%), whether players use the Skill,
   and phone vs desktop.
3. **Retune only from real data.** Bot win rates are not human ones (see `STUDY_FINDINGS.md`). Re-calibrate the
   regular/new bot profiles against the first real runs.

## Polish roadmap (Nov 12: https://claude.ai/artifact/RHcVM2LaEFeXyFcX8VR3zm)
Done in 1.42.86-1.42.90: exact next-turn damage, defeat-screen next goal, screen picture check, big-turn crescendo, quest poster styles merged, saves keep run data only (RUN_FIELDS/SCREEN_FIELDS), one shared tap cue (Knock, 1.42.91).
Next, in order: (A3 cont.) merge the next component's styles with tools/css (dice 1.42.92, camp 1.42.93, loot/equip/shrine/setup 1.42.94, title/Codex/end screens 1.42.95, tray and face-off 1.42.96: all the big components are merged; what's left is small shared bits), verified by stylediff + screen pictures;
(A4) one redraw path (small DOM morph, try on camp first); (A5) art as image files: done 1.42.97. V1 floor props when Jeremy has drawings;
E4 onboarding fixes once ~10 first runs of play data are in.

## Release gaps (review Oct 28)
Fixed in 1.41.96: tutorial cards, defeat screen, copy, dev features, credits, desktop backdrop, shrine text. Type and buttons
done in 1.41.97 (Alegreya, toy bevel). Open: the credits' art
line ("Art by Jeremy Friedman"; how to note the untouched pixie portraits), Jeremy's. Art treatment settled in 1.41.98 (grain kept, cover matched). Second visual review (Oct 28): blank sides, idle Go, Victory chest, equip window and Settings fixed in 1.41.99; title, defeat, Base Camp, boss bar and consent line done in 1.42.0 (loot names in the tray stay). Codex and Records polished in 1.42.1.

## Waiting on Jeremy
- **Itch (Nov 9):** upload demo zip 1.42.73+ (Straightedge, phone fixes); in the page description change "Leap, Dodge and Pivot" to "Leap, Sidestep and Pivot" (text in `release/itch_page.md`).
- **Balance calls from the Nov 9 fairness check (STUDY_FINDINGS):** trim Myceleus (5.5% deaths per fight vs 3.0% for the other Big Bosses)? Bio-Mutant Escape (3.7% vs 1.5-1.9% for Floor 3 elites)? Keep Square Root as the easy poster (75% done)?
- **Straightedge** (Claude's replacement for Turning Number, 1.42.73): keep the name or rename.
- **Title art** (Nov 10: revisit when the PC port starts in earnest; 860 px is enough for phone, itch and Play): new cover drawn from scratch on the 2048x2434 canvas (`DungeonScramble_TitleArt_canvas.psd`); the chat
  only passes 860 px, so export full size from Sketchbook or upload the PSD to the repo. Keep the logo layer for Steam.
- **Redraw the remaining AI-assisted art** (pixie portraits, the remaining original loot) to shrink the disclosure.
- **Play upload key + signed bundle (Nov 11, on hold until Jeremy is ready):** key made (alias `upload`, files sent to Jeremy: dungeon_scramble_upload.jks + _INFO.txt with the password and both secret values; Claude keeps no copy). Jeremy adds repo secrets DS_UPLOAD_KEY_PASSWORD and DS_UPLOAD_KEYSTORE_B64 (Settings > Secrets and variables > Actions); then the Android workflow also builds `dungeon-scramble-aab` (signed). Next: verify the Play account (device check), create the app (Free, Game), upload the .aab to a closed test, listing text/images from release/store_listing.md.
- **Google Play account** (personal; created Nov 11 on dungeonscramblegame@gmail.com; device verification still to do at home -- create the app on the web first so the Play Console phone app has something to open; trader status: yes, use a PO box/virtual address + Google Voice number; closed test while the game keeps changing, public launch later): then real billing behind `STORE` / `window.DSStore` (logic.js) and the closed-test track. Listing text (`release/store_listing.md`), 1024x500 feature graphic and 1080x1920 screenshots are ready (Nov 9, `tools/media/play.js`).
- **Armsmaster red Skill vs red Clear:** options shown Oct 15.

## Next for Claude
- **Forks (shipped 1.42.55-1.42.62):** two doors at slots 3 and 6; the Elite door's extra loot choice is a next-floor die. Bot study: always Elite 50% vs always Standard 39% (STUDY_FINDINGS). Watch real players' picks in the play data (`fork_pick` events) before tuning.
- **PC release layout (Jeremy, Nov 4):** D (room left, tray right, path panel) + G (hover panel, key letter per die) + H (die cursor, controller glyphs); one landscape frame for monitor and Steam Deck. Refined screens in the same artifact (Part 1).
- **Room dressing (reopened Oct 29):** inked corner ivy and per-floor room colour shipped in 1.42.5. Still open if Jeremy wants them: his own drawn ivy strands (V3) and one drawn prop per floor (D2).
- **Performance on slow phones:** load fixed on itch (split build), playback redraws trimmed (1.42.63, STUDY_FINDINGS). What's left in a turn is paint/compositing of running animations; only worth doing if testers report stutter.

## Later
- **Optional caps, only if play feels unfair:** damage-per-Minion specials count at most 8 Minions; Extruzeon layers max +12.
- **Free print-and-play edition** (refresh the rulebook then: it lags the game -- minions, Boost tokens, Swap/Reroll, Rest or Train; `npm run rulebook`) (component sheets + current rules) for the BGG solo contest (see `release/first_players.md`).
- **Relic look polish:** a bracelet view in the relic list, sockets that grow with depth.
- **Replay tool** for the tray/path telemetry.
- **A conversion relic** (e.g. 1 damage per Shield gained).
- **Co-op multiplayer** (lowest priority): feasibility doc https://claude.ai/code/artifact/1a2e8cb1-5527-400c-b4a2-defff09d6323
  ("Shared Foe, Two Chests"; six questions for Jeremy; first step a tabletop test).
