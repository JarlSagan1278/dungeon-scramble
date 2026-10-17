# Design fixes from the Oct 17 audit, part 2 (items 8-22, 25, 26 + extras)

Build 1.41.60 + working-tree changes (not committed). Source: `docs/studies/2026-10-17_design_quest_audit.md`, Part 2. Part 1 (items 1-7, 23-24) is `2026-10-17_design_fixes.md`.

## Summary for Jeremy

Screenshots: every pair is **before (left) | after (right)** at 395x769, in
`/tmp/claude-0/-home-user-dungeon-scramble/c644f6f1-0587-59f4-8d1e-2451d8bd872d/scratchpad/fx2/pairs/<scene>.png` (99 scenes). The raw shots are in `.../fx2/before/` and `.../fx2/after/`.

- **8. Health number inside the bar everywhere.** Camp and shrine now show "19/28" inside the bar, like fights. (`camp_before`, `camp_after_rest`, `shrine_wait`)
- **9. Setup pills.** Each Class pill has a rim in its class colour (violet, teal, orange, pink). The Origins all use the same green die, so each Origin got its own rim instead: Dwarf bronze, Gnome mushroom red, Halfling butter yellow, Pixie violet. Selected pills look as before. (`setup_dwarf`, `setup_gnome`)
- **10. Shrine choices have their own colours.** Heal is pink-red, +Max Health green, Relic picks purple, Upgrade Attack red, Upgrade Maneuver cream, Forge gold, Walk away dark. (`shrine_choice`)
- **11. Export Play Data.** Copy to Clipboard is teal (Download gold, Close tan). The note box is parchment with the 3px dark outline and the serif font. The Log window also uses the serif now. (`export`, `log_modal`)
- **12. Path counter** is Georgia bold. (`fight_path`)
- **13. Buttons never use Metamorphous.** Enter the Dungeon and the shrine's Hold / Continue are bold serif now. Titles stay Metamorphous. (`setup_dwarf`, `shrine_wait`, `shrine_result`)
- **14. Headings.** "New Achievements!", "Starting Boon unlocked!" and "Origin Relic Earned!" are Metamorphous headings. The small caps fight labels (EVERY TURN, BOSS…) stay serif. (`gameover_details`, `victory_details`)
- **15. Every pop-up title is centred.** (all pop-up scenes)
- **16. The same ✕ on every pop-up you can tap away.** It is added automatically wherever a tap outside closes the pop-up (Abandon Run, Start a New Run, Reset Progress, Break Camp, Rest/Train confirm, Empty your Pocket, How to Play, the Skill tip). It is red-brown, so it never matches the gear, and the gear hides while any pop-up is open. Pop-ups that need a choice (loot, shrine choice, relic pick, Equip) have no ✕, as before. (`abandon_modal`, `camp_rest_confirm`, `tutorial`, `codex_key`)
- **17. Codex Key tiles look like tray dice.** Attack red with white icons, Maneuver cream, 3px outline and the dice lip. Support actions have no die colour of their own, so they use the Gilded gold. (`codex_key`)
- **18. Camp cards and the Back Pocket** have the near-black 3px outline. (`camp_before`)
- **19. End screens.** The achievement box has the dark outline (gold stays on the heading) and the four run-card stat tiles are outlined. The "Help balance the game?" box lost its blue tint. (`gameover`, `victory`, `gameover_details`)
- **20. Setup.** The origin die-face chips are outlined; the Signature Relic box is dashed in the line colour. (`setup_dwarf`)
- **21. Tray rail.** On shrines the dead GO / Skill / Pocket / Item / Clear are hidden (the space stays, so the tray doesn't jump between rooms). In fights, a disabled Skill / Item / Clear is darkened but solid, never see-through. The camp's skipped/disabled Rest or Train is solid too. (`shrine_wait`, `fight_path`, `camp_rest_chosen`)
- **22. Round bubble** is dark brown with light-brown text; the gold "F2" stays. (any fight)
- **25. One scroll area per Codex/Records tab.** The Dice lists and the Achievements list no longer scroll inside the scrolling window. (`codex_dice`, `records_ach`)
- **26. Dashes.** "-- finish a run", "Not found yet -- look for…", the Reset Progress text, the Starting Boon hints and the log/toast lines in logic.js use full stops or a proper dash.
- **Locked combine rows (your 1.41.60 note).** The stripes are lighter and the label now sits on its own red or cream pill with the lock at its left, so "Attack I → II 9" reads clearly on both rows before Train is chosen. (`camp_ready`, `camp_before`)
- **Vines vs quest paper.** The hanging vines are now their own layer behind the quest paper and the monsters (they still hang from the arch). (`f2_forge`, `f3_quest`, `f3_bigboss*`; also `/tmp/claude-0/-home-user-dungeon-scramble/c644f6f1-0587-59f4-8d1e-2451d8bd872d/scratchpad/fx2/probe/forge.png` vs `forge_after.png`)
- **Bestiary quests.** Each monster's entry shows a little paper "QUESTS (in one turn)" card with the same wording and reward icons as its fight paper (questRowHTML). (`codex_bestiary_forge`, `codex_bestiary`)
- **Loot chest outlines.** The paper-grain filter was clipping and washing the outer outline, and later fills covered half of earlier outlines. Now the fills are drawn first (clipped to the chest shape) and every outline is drawn last, outside the filter, as solid #0c0705 at full width. The tray's lock also gets its outline redrawn over the shine. (`/tmp/claude-0/-home-user-dungeon-scramble/c644f6f1-0587-59f4-8d1e-2451d8bd872d/scratchpad/fx2/pairs/chest_zoom.png`: top = before, bottom = after, at 3x; `loot_chest`)
- **Camp horizon.** The floor now starts 90px down the camp card (146px on tall phones), about 30px above the hero's and the fire's feet, so they stand on the floor with the wall behind them, like a fight room. Card height unchanged. (`camp_before`, `camp_ready`, `basecamp`)
- **Rest / Train labels are centred vertically** with or without the sub-line, chosen or skipped, and the two buttons stay the same height. (`camp_rest_chosen`, `camp_before`)
- **Setup screen no longer scrolls for veterans** (found while checking heights; it was already the case in 1.41.60). With the Starting Boon row and the Depth bar it was 824px (927px with a boon picked). It now tightens in up to three steps only while it would scroll: Back button beside the name, a one-row boon preview, slimmer Enter button, mini tray and Depth bar, then a smaller portrait. A new player's setup is unchanged. (`setup_gnome`, `setup_boon`, `setup_boon_picked`, `setup_veteran_none`)

### Not done, and why
- **`--` in `src/data.js`** (6 player-facing strings: the Leap and Nullify descriptions, the route tooltips "Camp -- …", "Encounter -- …", "Boss -- …", and the Halfling blurb). I was told to work only in render.js, styles.css and logic.js, so these are left for a one-line pass in data.js.
- **The "DEPTH" bar on setup** still uses Metamorphous for its word "Depth". It is a section heading that happens to be tappable, styled like ORIGIN / CLASS / STARTING BOON, so I kept it as a heading.
- **Shrine tray position.** With the rail hidden, the shrine tray stays where it is in fights (left of an empty column) rather than re-centring, so it doesn't jump between rooms. Easy to centre if you prefer.

## Heights (395x769, all 99 scenes)
Every scene is 769px tall and 395px wide after the change (`.../fx2/after/metrics.json`). Before, the setup screen for a returning player was 824px (gnome/halfling/pixie/veteran), 894px with boons ready and 927px with one picked. Inner scroll areas now: Codex body, Records body, the loot pop-up with 3 options (unchanged, 648/684), and the Victory Details box (unchanged).

## What changed in the code
- `src/render.js`: shrine/camp HP number inside the bar; `origin-tab-<id>` classes; `shrineOptClass()`; export button/text-box classes; `openModal()` adds the ✕ to any backdrop-dismissable pop-up; shrine rail `rail-shrine`; combine label wrapped in `.upg-lbl`; `bestiaryQuestsHTML()`; `archFrameSVG.vines` + a second `fo-frame fo-vines` image inserted first in the card; `lootChestSVG()` fills/outlines split; tray lock outline on top; `fitSetup()`; dash wording.
- `src/styles.css`: one block at the end ("Oct 17 design fixes, part 2") plus the setup fit and camp horizon/button blocks after it.
- `src/logic.js`: four log/toast strings (dashes) only.
- Checks: `node build.js && node tools/check.js`: all checks passed (sim, classes, wrap, ui, pathrender, trayfast, trayact, shrines). One earlier run had a one-off `classes` save/load failure for pixie/arcanist; it passed on the next three runs (that test reloads the page and clicks the title; nothing here touches saving).

## Harness
`/tmp/claude-0/-home-user-dungeon-scramble/c644f6f1-0587-59f4-8d1e-2451d8bd872d/scratchpad/fx2/fx2.js` (99 scenes, heights, scroll areas, Metamorphous buttons, sans text, pop-up title alignment and ✕): `F=file://<html> node fx2.js <outdir>`. `pair.py before after pairs <names…>` makes the side-by-sides. Before build: `.../fx2/before.html`; after build: `.../fx2/after.html`.
