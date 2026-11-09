# Study findings (Oct 11–28, 2026)

What the bot studies, audits and research taught us, kept as reference. The full reports (32 study files,
the literature-review notes, the first-players research notes and the old mockups) were removed from the tree
on Oct 28; they are in git history at commit `44a9829` (`git show 44a9829:docs/studies/<file>`). Decisions that
came out of them are recorded in `decisions/` (index in `PROJECT_CONTEXT.md`); changes that shipped are in `CHANGELOG.md`.

All win rates are **bot** results, not human ones. Human experts will sit below the expert bot; the first real
numbers come from the play-data sheet.

## How the studies are run

- **Harness:** `tools/balance/harness.js` (plain DFS best-path bot) and `tools/balance/study_maneuver.js`
  (the player-like bot with switches; newer studies patch it). Results go to git-ignored `out_*.json`.
- **Bot profiles** (calibrated Oct 13, before any player data; re-tune once the sheet has real runs):
  - *Expert*: skill 1500, uses tokens, class Skill every turn, deliberate shrine/relic picks, Overkill- and quest-aware.
  - *Regular*: `{"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}`.
  - *New*: about a fifth of the time for abilities/tokens, random loot 80%, short greedy paths.
- **Standard setup:** 4 origin/class pairs (Dwarf Guard, Gnome Armsmaster, Halfling Dungeoneer, Pixie Arcanist),
  150–300 runs per pair. Treat differences under ~3–5 points as noise. "Depth 7 loadout" = Tougher Scuffs 1, Zeal 1,
  Rationing 1, Swarming 1. Studies use internal depth; the game shows one lower.
- **Bot blind spots:** it barely uses Nullify/Swap/Reroll/Boost tokens, and its loot scoring gets worse with more
  choices, so token relics (Giant Killer, n+1 Button, Need Before Greed) and token shrines read low.

## Balance philosophy (literature review, Oct 13)

Designers of Slay the Spire, Monster Train, Vampire Survivors and others agree with Jeremy's rule: in a
single-player roguelike, rare over-strong player combos are fine (even fun); balance matters where enemies must be
readable and answerable (telegraphs, no unavoidable one-shots), where options are dead, and where difficulty steps
feel fair. Human win rates in the genre are low (Slay the Spire base runs ~9–16%), so bot win rates are not targets.
Measure: floor-by-floor run endings, take rates of loot/relics, warned vs unwarned deaths, abandoned runs.

## Classes and origins

- **Class decides runs; origin barely does** (Oct 12): class explains 96% of the win-rate spread, origin 3%, pairing 1%.
- **Ranking depends on the player.** The converter classes (Guard: free Block 2; Armsmaster: free Hit 2) need the
  Skill used every turn; the movement classes (Dungeoneer wrap, Arcanist diagonals) help automatically. So experts
  rank Guard first, new players rank the movement classes first. Hence: teach the Skill (done: Skill coach), don't
  nerf Guard.
- **Class passives (Oct 16, shipped 1.41.53–54):** Arcanist +1 to every Boost; Dungeoneer "+1 damage to the next
  attacking die after a wrap". Rejected: Maneuvers give Block (broke the class, 94%), edge Hit/Combo +1 (69%, too strong).
- **Baseline on 1.41.54** (the current reference table):

  | Profile | Guard | Armsmaster | Dungeoneer | Arcanist |
  |---|---|---|---|---|
  | Expert, depth 7 | 63% | 57% | 55% | 50% |
  | Regular, depth 0 | 70% | 68% | 83% | 79% |

  Arcanist deaths come early (36% on Floor 1 at depth 7); Guard/Armsmaster rarely die on Floor 1.
- Gnome is the weakest origin for skilled players; Halfling the strongest (spread ~10 points).

## Difficulty curve

- **Floors:** Floor 2 is the attrition floor; Floor 3 was made harder on purpose (1.40.0: +2 attack on Easy/Standard/
  Deadly cards, +1 on Elites and Big Boss base attacks), so for regular/new players the curve rises through Floor 3.
  On 1.41.0, runs ending per floor (share reaching it): regular 2/12/15%, new 6/26/27%.
- **First run (Oct 28, 1.41.94, forced Dwarf Armsmaster, random loot):** nobody dies in the first fight; Floor 1
  bosses cause ~70% of Floor 1 deaths. Floor 1 deaths: weakest bot 38%, middling 6–16%. No change; watch real deaths
  in fights 2–4 and soften those rooms at depth 0 first if they exceed ~15%.
- **Encounter tiers** (Oct 11): every floor's cards are tagged Easy / Standard / Elite / Deadly by HP cost; regular
  encounters rarely end runs, bosses do. Outliers flagged: The Strike-Breaker (ended 34% of the runs that met it; 4 damage recommended)
  and Self-Replicating Forge. Bosses were evened out per floor in 1.37.0.
- **Extruzeon "Layer by Layer"** (1.41.0): base attack starts at 2 and grows after every hit; tuned to be as dangerous
  as the other Big Bosses, easier or harder by playstyle.

## Depth

- **Depth curve on 1.41.17, expert bot:** 0: 88%, 1: 84%, 2: 79%, 3: 70% (Bronze), 4: 54%, 5: 47% (Silver),
  6: 47%, 7: 36% (Gold), 8: 26%, 9: 11% (Royal). About 8–10 points per depth step; every dice finish is reachable,
  Royal is the hard final goal.
- **Modifier costs** (Oct 15, ~9–10 win points per depth point on average): repriced in 1.41.24 Rounding Error
  1→2 depth, Rationing rank 2 2→1. Left uneven on purpose ("finding the cheapest set is part of the fun"): Union Dues,
  Zeal 2 and Swarming 2 are cheap; Tougher Scuffs 3–4 dear. Swarming is capped at 2 ranks.

## Systems

- **What carries a run** (knockout study, 1.41.16, regular bot, baseline 54%): loot reaching the tray −54 points,
  camp rest −22, Back Pocket revive −21, relics −19, quest rewards −16. Class Skill −2, tokens +1, Train +2,
  Swap/Reroll +2, shrines +5 (shrines replace fights, and fights give loot). No single hidden inflater.
- **Campfire Rest OR Train** (1.41.15): bots win more with the choice (regular 73→81%) because combining dice shrinks
  the Back Pocket (each Pocket die is a revive). A Back Pocket save spends the whole Pocket since 1.41.16.
- **Healing access decides Floor 2** (Oct 11): holding a Medsack at the start of Floor 2 took bots from 56% to 79%.
- **Maneuver dice** (Oct 11–13): a Maneuver face has no effect of its own; it routes the path, feeds quests and clears
  minions. Fixed by the Maneuver II/III Block ladder (1.41.0); Maneuver I unchanged. Boost on Maneuver II/III allowed.

## Relics (Oct 12, forced-relic study, win-rate change vs no relic)

- **S:** Scavenger's Acumen +42, Stronger Infill (Dwarf) +43, Minus-One Mantra +33, Hard Hat Act +33.
- **A:** Evasion Tank +28, Faerie Fire (Pixie) +27, Perfect Fifth +25, Mandated Lunch Break +21, Coffee Break
  (Halfling) +21, Prime Edge +21, Combonatorics +19.
- **B:** Klein Bottle +12, Percolation Theory +12, Mycorrhizal Bond (Gnome) +11, Terminal Velocity +9, Bisection Method +9.
- **C / duds:** Nature's Thorns +7, Strength in Mooks +5, Union Health Plan +4, Exponential Decay +2; FTLeporter,
  Equal and Opposite, Bloodthirst, Power Word: Safe ~0.
- Flat defence (Block every fight, −1 per hit, steady healing) beats damage and loot effects. Jeremy's idea: space relic power out over many
  runs by gating tiers (see decisions/relics_and_shrines.md).

## Loot dice (Oct 13, die replaces one Attack I from the start, regular bot, base 71%)

Tier medians: Alloy +8, Gilded +13, Magic +18. Strongest: Medsack +20 (Alloy), Triage Turret +21 (Gilded), Exile
Elixir +26 (Magic). Weakest were retuned in 1.41.x keeping their identities (Acid Potion, Whip, Claymore, Genetic
Drifter, Winged Boots, Domesticated Displacer and others).

## Shrines (Oct 13–15)

Rule (Jeremy, Oct 14): every shrine must be at least as good as a same-floor loot pick. Relic shrines clear the bar
easily; flat max-HP and token shrines fell short and were boosted (Oct 15, 1.41.23: option 2, loot added sparingly). The
bot undervalues tokens, so token shrines may read better with real players.

## Quests (Oct 12 and Oct 17)

- Oct 12: 15 of 78 quests could never complete (wording the checker couldn't read, missing counters); fixed in 1.39.0.
- Oct 17 audit: quests are checked within one turn (one path) except survive / Bank Block / Geometry; 6 papers said
  something the code didn't do, 21 were near-impossible, 11 free, 6 duplicates. Rewritten to one consistent wording
  that fits the 108px paper.
- Quest Health (the cap) removed in 1.41.59: it cut only ~11 damage per run; Displacer (now Transposer) Lair's rewards
  were lowered instead.

## Route goals and Maneuver value (Nov 8, 2026, build 1.42.70)

study_maneuver.js (bot scores route goals; `noRoute` removes them; `swapManeuver` turns every starting Maneuver die into
an Attack die of the same level), dwarf, Armsmaster and Dungeoneer, regular bot (depth 0) and expert bot (depth 7),
300 runs per cell. "Maneuver value" = win rate keeping the Maneuver dice minus win rate with them swapped for Attack dice.

| Profile | Class | Route goals ON: keep / swap (value) | OFF: keep / swap (value) |
|---|---|---|---|
| regular d0 | Armsmaster | 82 / 82 (0) | 80 / 75 (+5) |
| regular d0 | Dungeoneer | 93 / 90 (+3) | 92 / 94 (−2) |
| expert d7 | Armsmaster | 82 / 78 (+4) | 77 / 75 (+2) |
| expert d7 | Dungeoneer | 77 / 80 (−3) | 69 / 79 (−10) |

- **Maneuver dice gained a little, within noise:** average value +1 with route goals vs −1 without (each cell ±3).
  Maneuver dice are still worth about the same as Attack dice, no more.
- **Route goals made runs easier overall:** +4 points on average with Maneuver dice kept (80→82, 92→93, 77→82, 69→77);
  they are extra rewards. Bots finish ~35% of open route goals on Floor 1, ~25–50% later. Without Maneuver dice, Floor 1
  completions drop from ~300 to ~200 per 300 runs, so the dice do feed the goals.
- **Bots didn't change how often they step on Maneuver faces** (F1 1.74 vs 1.73 per turn): the goals are taken when
  they fall on the best path, not chased.
- **It is a Floor 1 problem:** of the Maneuver dice showing a face, the share the path uses rises by floor: F1 47–59%,
  F2 54–64%, F3 71–85%. Maneuver II/III carry Block 2 and Boost faces, and every Maneuver die is level I until the
  first Train, so the "useless Maneuver" turns are concentrated on Floor 1.
- Bots don't feel "forced", so this measures value, not how it feels; the playtest note was about feel.

## Route goals, poster by poster (Nov 9, 2026, build 1.42.72)

Regular bot, dwarf, 4 classes x 300 runs, bot aiming at quests vs ignoring them ("blind" = done by accident).
Share of fights with that poster where it was completed:

| Poster | Aiming | Blind | Verdict |
|---|---|---|---|
| Antipodal (Far corners) | 37% | 6% | good |
| Diagonal Argument (3 on a diagonal) | 41% | 14% | good |
| Hollow Proof (Edge path 5+) | 46% | 7% | good |
| Leapfrog (Leap to Leap) | 37% | 19% | good |
| Pivot Point (Pivot, Combo) | 40% | 24% | good |
| Running Start (Move, Boost) | 41% | 24% | good |
| Square Root (2x2 square) | 75% | 50% | easy (Floor 1 easy monster; kept) |
| Turning Number (Turn 3 times) | 99% | 97% | broken: almost every path turns 3 times |

Harder turn counts didn't help (4 turns: 98/90%, 5 turns: 89/74%): long paths wiggle. A straight run of 4 dice
(a full row or column, in order) came out 53% aiming / 17% blind, so it replaced Turning Number in 1.42.73
("Straightedge", 4 in a line). Win rates don't move with the posters (aiming vs blind within 3 points).

## Fairness check, per encounter (Nov 9, 2026, build 1.42.73)

Regular bot, 4 classes x 4 origins x 150 runs (2400 runs): 86% wins; deaths F1 31, F2 104, F3 190.
Death rate per fight (top of the list) and "healthy deaths" (the player entered the fight with >=60% HP):

| Encounter | Fights | Death rate | Healthy deaths | Median HP at start, deaths |
|---|---|---|---|---|
| Myceleus (Big Boss) | 733 | 5.5% | 11 of 40 | 46% |
| Whence Wolf (F2 deadly) | 328 | 4.0% | 1 of 13 | 25% |
| Bio-Mutant Escape (F3 elite trap) | 567 | 3.7% | 3 of 21 | 35% |
| Extruzeon (Big Boss) | 701 | 3.1% | 12 of 22 | 74% |
| Toadtaur Wizard (Big Boss) | 725 | 3.0% | 6 of 22 | 35% |
| F2 bosses (Necrorancher, Ceramic Golem, Biomancer) | ~770 each | 2.3-2.7% | 1-4 | 25-35% |
| Other F3 elites/traps | | 1.0-1.9% | 0-1 | |
| F1 bosses (Rogue Golemancer, Heating Elemental) | ~800 each | 1.1-1.6% | 0-1 | 30-45% |

- No regular enemy kills healthy players: outside the Big Bosses, deaths are attrition (the player arrives low).
- Extruzeon is the one that kills from full health, by design (Oct 13: "Layer by Layer", its every-turn hit grows
  +1 a turn, +2 in phase 2, so long fights end in an enrage). It is telegraphed by the next-turn chips.
- Outliers to watch, not changed: Myceleus kills about twice as often as the other Big Bosses (5.5% vs 3.0%);
  Bio-Mutant Escape is about twice as deadly as other Floor 3 elites (3.7% vs 1.5-1.9%), mostly attrition.

## Design, art and performance

- **Design audit (Oct 17):** every button its own colour, Settings fits without scrolling, camp rows match their dice,
  health numbers inside bars everywhere; shipped 1.41.60–61. Left: six `--` strings in data.js.
- **Trim (Oct 17):** 31.7 KB of dead CSS, unused functions (including a 65,000-pixel texture loop on load) and an
  unused silhouette removed with pixel-identical screenshots.
- **Art consistency (Oct 21):** the set hangs together after the paper texture and black edge; the real gap is blur
  (19 pictures shown 1.3–1.8x their pixel size). Targeted fixes + hi-res re-import shipped (1.41.72); the global pass
  was declined. `tools/art/consistency.py` has a speck-removal bug to fix before any global pass.
- **Performance:** about 1.5 s of script per turn at CPU x4 (renderGame/placeVs) and ~500 ms of style work during
  playback remain (TODO).

## Players and playtests

- **First tester (Oct 14, 2 runs):** strong player, won both (one at shown depth 2); the lethal warning worked as
  designed. Anecdote, not a sample.
- **First outreach (Oct 27–28):** r/playmygame image gallery: ~90 views, 4 itch clicks, 0 plays. A phone walk-through
  of the itch page found 8 taps and 4 popups before the first die → quick start (1.41.94).
- **Finding players** (research, Oct 28; full report `release/first_players.md`): a median itch browser game turns
  ~37% of page views into plays; comparable games (Balatro, Dicey Dungeons, Vampire Survivors, Die in the Dungeon)
  started slowly and took off when a streamer or curator picked them up. Post a short clip of one turn, one community
  a day; pitch creators.

## Speed check, build 1.42.34-35 (Oct 31, 2026)
Chromium, 395x769 at 2x, CPU slowed 6x (cheap phone). Load to title 3.3 s (7.8 MB single file). Full redraw 124 ms -> 84 ms after
removing a mid-render measurement in the path coins (renderPathStrip); one forced layout per redraw remains (placeVs /
decorateArch / fitFoChips read positions; batching them would save ~1 ms unthrottled each). Path tap 45-52 ms, lid flick to dice
~170-210 ms, room change ~215-260 ms. Turn playback: median frame 16.7 ms, 95th percentile 50 ms, a few frames up to ~180-220 ms
(the room/loot redraws). Memory: 40 auto turns across rooms, JS heap 25.2 -> 25.3 MB and page elements flat (no leak); no leftover
effect elements after the run.

## Speed check, build 1.42.53-54 (Nov 4, 2026)
Itch demo, Chromium 395x769 at 2x. **Load** (4 Mbps, 150 ms latency, CPU x4): single 5.6 MB file 12.3 s to a usable title; split web
build (1.07 MB page + art files on demand) 3.4 s, first fight art +0.1 s. Shipped: itch gets the split build. **Redraw** (CPU x6):
~90-110 ms per full render(), of which ~45 ms is the one style+layout of the new 339-node tree and ~20 ms the innerHTML parse (in the
single-file build ~100 KB of it is the three portraits' data URIs; the web build uses short art/ paths). Forced layouts per render
6 -> 1 after batching reads before writes, but time is unchanged within noise: the remaining cost is the full rebuild itself and the
117 KB stylesheet. A turn does ~7 full renders (3 path steps + enemy beats). Next lever if needed: a playback fast path like
renderPathOnly for the per-die steps and enemy beats.

## Playback fast path, build 1.42.63 (Nov 4, 2026)
patchGameDOM (render.js): during turn playback, regions marked in the markup (<!--zN-->) are compared as strings and only
changed ones are parsed and swapped; dice are swapped one by one. Chromium, 395x769, CPU x6, Dwarf Guard, 3 turns.
Per playback redraw (web build): ~74 -> ~60 ms (forced layout in placeVs 41 -> 25 ms); single file ~93 -> ~70 ms. Two
traps found on the way: parsing the whole screen into a template to compare was slower than a plain rebuild (239 ms),
and a `([\w-]+):-...ms` normaliser crawled over base64 image data (85 ms). Whole-turn main-thread time is dominated by
paint/compositing of the running animations (2 turns: script ~0.9 s, style ~0.7 s, layout ~0.5 s, paint+raster+commit
~2 s), so the next lever, if slow phones still stutter, is fewer animated layers during playback, not redraws.
Bug hunt on the change (tools/bugsearch.js, 16 full runs incl. resumes and relics): no findings.

## Bug hunt, build 1.42.54 (Nov 4, 2026)
After the week's changes (mid music, quest live count and tip, impact frames, Swap/Reroll wiggle, sound rework, redraw reorder).
tools/bugsearch.js: 24 full runs, 12 chest-lid runs (FLICK=1), 12 + 16 fresh-device runs (QUICK=1), 10 demo runs: no findings
except the old intermittent Debug-class "resume failed", which was the harness, not the game: it reloaded a file:// page, where
headless Chromium sometimes drops the session's localStorage writes (same cause as the Oct 31 test_ui flake). The hunt now serves
the game over http; the 16-run re-check (resume runs included) was clean. Quest rules refactor (questEval): identical to the old
checkQuests on all 56 quests x 400 random turns (22,400 cases). Live sign vs result: over 61 random turns the sign promised
"This path!" 6 times and the quest paid all 6; no quest paid without the promise.

## Forks: Elite door vs Standard door (Nov 4, 2026, build 1.42.55)
tools/balance/harness.js, 60 runs each, skill 1500, Dwarf Armsmaster, depth 0, cfg.fork = elite / random / standard. Win rate:
always Elite (pick 1 of 3 loot) 20%, random 33%, always Standard 40% (reached Floor 3: 30 / 39 / 45 of 60; deaths by floor
6-24-18 / 4-17-19 / 1-14-21). Noise is about +-6 points at n=60. Read: for this bot one extra loot choice does not pay for an
Elite fight, so the safe door dominates. If players should face a real dilemma, the Elite door needs a bigger reward (ideas: the
extra choice drawn from the next floor's loot tier, a relic offer, or a small heal) -- Jeremy's call; re-run this study after.
Re-run with the deeper-floor extra choice (1.42.56+, 80 runs each, same setup): always Elite 50% wins, always Standard 39%
(reached Floor 3: 58 / 63 of 80; deaths by floor 5-17-18 / 4-13-32). Damage taken on Floor 3 fights drops from 7.3 to 5.0 a fight
for the Elite path, so the deeper die pays for the harder rooms over a run. The Elite door is now the stronger pick for this bot;
that is a player-power edge (fine by the balance philosophy), and the Standard door stays the safer short-term choice.

