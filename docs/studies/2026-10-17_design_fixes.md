# Design fixes from the Oct 17 audit (groups A-D)

Build 1.41.59 + working-tree changes (not committed). Source: `docs/studies/2026-10-17_design_quest_audit.md`, Part 2.

## Summary for Jeremy

- **Buttons have their own colours.** Title: Codex green, Records blue, How to Play violet (the same colours as the Codex tabs). Settings uses the same colours for those three, plus Log orange and Export Play Data teal. Abandon Run stays red. Reset Progress is now a dark button with a red ring, so the two danger buttons no longer look alike.
- **Settings fits without scrolling.** The buttons are a two-column grid of smaller buttons. Close, Abandon Run and Reset Progress are visible straight away (the window is 647px tall in a run, was 654px with 186px hidden).
- **Camp upgrade rows match their dice.** The Attack row is red and the Maneuver row is cream, like the tray dice, and each "?" takes its row's colour. Before Train the rows are darker versions of those colours. The locked stripes, the lock icon and the "ready" glow still work.
- **The camp confirm buttons match.** "Rest here?" has a green Rest button and "Train here?" has a purple Train button, the same as the campfire buttons that opened them.
- **Train says the real reason.** With 3+ matching dice but not enough spare dice in the Back Pocket, Train now says "Needs 2 spare dice in your Pocket" (or "1 spare die"). It still says "No sets of 3 yet" when there are no sets of 3.
- **Rest message.** The ribbon now says "Rested: +4 HP". Camp ribbons appear over the camp scene, below the Camp title.
- **End screens fit on one screen.** Game over and Victory show the run card, then **Save Card | Try Again** (or Play Again) centred in one row, then a **Details** button. Details names what it holds, e.g. "New best depth · Origin relic · 2 achievements · Run Summary". Tapping Details puts the depth seal, relic, achievements, boons, Run Summary and Send Play Data where the card was. Both screens are 769px tall (were 966px and 1242px). If a victory unlocks a lot and the play-data question is still showing, the Details box scrolls inside itself (414px box, 575px of content). The screen itself never scrolls.
- **Quest rewards are visible on every card.** On 11 cards the monster's art reached the reward badges, so the quest paper moves left (and up on the big ones) on just those cards. The monster still stands in front of the paper. I checked all 42 cards with quests at 395x769 with 4 heroes: **no reward badge is covered on any card** (before: 7 cards had badges hidden and 4 had edges clipped). The cost: on Self-Replicating Forge, Bio-Mutant Escape and Anti-Euclidian Space, the Halfling's hair touches the first letter of the bottom quest line (2-3% of that line). On Forge and Bio-Mutant, a hanging vine now crosses the first character of the top line, as vines already did elsewhere on Floors 2-3.

## Pixel heights at 395x769 (page / pop-up)

| Screen | Before | After |
|---|---|---|
| Title, title with save | 769 | 769 |
| Settings (title screen) | pop-up 654, content 715 (scrolls) | pop-up 576, no scroll; lowest button at y=621 |
| Settings (in a run) | pop-up 654, content 834 (scrolls); lowest button at y=846 (offscreen) | pop-up 647, no scroll; lowest button at y=656 |
| Camp (before Train, ready, after Train, after combine, after Rest, Base Camp) | 769 | 769 |
| Rest / Train confirm | pop-up 192 | pop-up 192 |
| Game over | 966 (scrolls) | 769 |
| Game over, Details open | n/a | 769 |
| Victory | 1242 (scrolls) | 769 |
| Victory, Details open | n/a | 769 (Details box 414, scrolls inside) |
| All 42 quest fight cards | 769 | 769 |

## Quest paper: which cards moved

`QUEST_PAPER_NUDGE` (render.js, next to `ENCOUNTER_NO_FLIP`) gives [px left, px up]; CSS reads them as `--qdx/--qdy` on `.fo-quests-float`. Every other card is unchanged.

| Card | Nudge | Reward badge covered before → after |
|---|---|---|
| The Strike/Break-er | 36 left, 14 up | 100/100/100% → 0 |
| Self-Replicating Forge | 25 left, 18 up | 43/88/23% → 0 |
| Bio-Mutant Escape | 25 left, 17 up | 90/42/3% → 0 |
| Extractnid Matriarch | 23 left, 6 up | 54% → 0 |
| Anti-Euclidian Space | 16 left, 12 up | 0/20/35% → 0 |
| Extruzeon, Co-consul of Waste | 12 left, 6 up | 0/0/36% → 0 |
| Myceleus, Co-consul of Rot | 10 left, 4 up | 0/11/14% → 0 |
| Ergot Eruption | 7 left | 5/0/0% → 0 |
| Unventilated Workshop | 6 left | 2/0/6% → 0 |
| Leper Con-Trap | 5 left | 0/0/2% → 0 |
| Ditched Heist | 5 left | 0/0/3% → 0 |

The audit also listed Adhesive Pest Traps as a slight overlap. The pixel test found 0% on its badges, so it was left alone.

Method: each card is rendered twice, with and without the monster, and the pixels that differ inside each `.q-reward` box count as covered. The same test with the hero hidden checks the condition text. Monster sizes and heights (`ENCOUNTER_SIZE` / `ENCOUNTER_DROP`) are unchanged. If a monster's art or size changes later, rerun `qcards.js` (below).

## What changed in the code

- `src/render.js`: title button classes; Settings grid (`settings-btn-grid`, `btn-*` classes, `danger-outline`); upgrade rows get `upg-attack` / `upg-maneuver`; the confirm button uses `cf-go-rest` / `cf-go-train`; `trainBlockedText()` (follows `canUpgrade`: a combine needs 1 spare Pocket die for each Tray slot it empties beyond the first); camp ribbons use the camp card as their frame; `endScreenHTML()` + `wireEndDetails()` (the Save Card button moved out of `runCardHTML`); `QUEST_PAPER_NUDGE` + `questPaperStyle()`.
- `src/styles.css`: one block at the end ("Oct 17 design fixes"); the paper's transform takes `--qdx/--qdy`; Train's sub-line uses balanced wrapping.
- `src/logic.js`: the Rest log text only.
- Checks: `node build.js && node tools/check.js` passed (sim, classes, wrap, ui, pathrender, trayfast, trayact, shrines).

## Screenshots (scratchpad)

Folder: `/tmp/claude-0/-home-user-dungeon-scramble/c644f6f1-0587-59f4-8d1e-2451d8bd872d/scratchpad/fx/`

- UI before: `/tmp/claude-0/-home-user-dungeon-scramble/c644f6f1-0587-59f4-8d1e-2451d8bd872d/scratchpad/fx/before/` (title, title_saved, settings_title, settings_ingame, camp_before, camp_rest_confirm, camp_ready, camp_train_confirm, camp_after_train, camp_after_train_combined, camp_rest_toast, camp_after_rest, basecamp, gameover, victory; `*_full.png` shows the whole scrolling page; `metrics.json` has the heights)
- UI after: `/tmp/claude-0/-home-user-dungeon-scramble/c644f6f1-0587-59f4-8d1e-2451d8bd872d/scratchpad/fx/after/` (same names, plus gameover_details and victory_details)
- Quest cards before (one PNG per card, `q_<name>.png`, plus `qcards.json`): `/tmp/claude-0/-home-user-dungeon-scramble/c644f6f1-0587-59f4-8d1e-2451d8bd872d/scratchpad/fx/before_q_dwarf,guard/` (also `before_q_gnome,guard`, `before_q_halfling,guard`, `before_q_pixie,armsmaster`)
- Quest cards after: `/tmp/claude-0/-home-user-dungeon-scramble/c644f6f1-0587-59f4-8d1e-2451d8bd872d/scratchpad/fx/after_q_dwarf,guard/` (also `after_q_gnome,guard`, `after_q_halfling,guard`, `after_q_pixie,arcanist`)
- Harnesses: `fxshots.js` (UI scenes + heights: `node fxshots.js <outdir> <html>`), `qcards.js` (quest overlap: `HERO=gnome,guard node qcards.js <html> <outdir>`), `heroes.js` (hero silhouettes)
- Before build: `/tmp/claude-0/-home-user-dungeon-scramble/c644f6f1-0587-59f4-8d1e-2451d8bd872d/scratchpad/fx_before_dist/dungeon_scramble.html`
