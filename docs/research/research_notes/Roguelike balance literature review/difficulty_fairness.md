# Difficulty design in roguelikes/roguelites: curves, ascension/heat, win-rate targets, enemy fairness

Research notes compiled 2026-10-13 for Dungeon Scramble (3 floors, easy/standard/elite/deadly rooms, telegraphed bosses with phase 2, stackable "depth" modifiers).

**Method caveat:** In this session, page fetches failed for steamcommunity.com, steamhunters, fandom/wiki.gg wikis, gamedeveloper.com and inverse.com (DNS errors). Every number below therefore comes from search-engine snippets of the cited pages or of aggregators (WeMod, Exophase, news sites). They were accessed 2026-10-13, and the snapshot dates on the source pages are unknown unless stated. Treat the achievement percentages as approximate snapshots.

**What Steam achievement percentages measure:** A Steam global percentage is the share of the game's Steam players (account owners with stats) who unlocked the achievement. It is not a per-run win rate. "X% have beaten the game once" says how many players eventually got there over any number of runs. It says nothing about how often a single run wins. Third-party trackers (Exophase, WeMod) sample only their own users, who tend to be more engaged, so their percentages run higher.

## 1. Base-difficulty win rates for typical players

### Takeaway
Per-run win rates at base difficulty are low. Slay the Spire 1 is about 9% at Ascension 0, and Slay the Spire 2 beta is about 16% at A0 and about 25% across all runs. Even so, a majority of players eventually win at least once. About 44-49% of Hades Steam players have escaped, about 52% of Into the Breach players have won, about 59-84% of Balatro players have won a run, and about 67% of Monster Train 2 players have won a standard run. The common pattern is that a first run usually fails, a first win comes after several hours, and the base game is beatable by most committed players.

### Cited Findings
- **Slay the Spire 2 (Early Access/beta), Mega Crit's "Neow's Dispatch" special report, May 2026:** 240 million runs, of which 60.5M were wins and 179.5M losses, for a 25% overall win rate. Reported win rate is 16% at Ascension 0 and about 17% at Ascension 10. By character: Ironclad 24%, Silent 22%, Defect 19%, The Heir 18%, Necrobinder 17%. These come from secondary coverage of the report; I could not reach Mega Crit's original post. — [GameGeeker](https://gamegeeker.com/fr/news/slay-the-spire-2-may-neows-news-update?market=FR); [Two Average Gamers](https://www.twoaveragegamers.com/slay-the-spire-2-beginner-guide/)
- **Slay the Spire 1:** The same coverage says the original game's A0 win rate was 9% and its A20 win rate was 3%. These are secondary figures attributed to Mega Crit. — [GameGeeker](https://gamegeeker.com/fr/news/slay-the-spire-2-may-neows-news-update?market=FR); [Two Average Gamers](https://www.twoaveragegamers.com/slay-the-spire-2-beginner-guide/)
- **Slay the Spire 1, "Ascend 0" achievement (unlock Ascension mode, which requires beating Act 3 with a character):** 66% on WeMod's page (WeMod users; platform and date not stated). — [WeMod](https://www.wemod.com/en/cheats/slay-the-spire-trainers/achievements)
- **Slay the Spire 1, community estimate:** A Steam forum poster guessed that top players win 40-50% at A20. This is anecdotal and unverified. — [Steam forum](https://steamcommunity.com/app/646570/discussions/0/2521353993639170616/?ctp=4)
- **Hades (Steam app 1145360):** "Escaped Tartarus" (clear the first biome) is at 83.2%, and "Is There No Escape?" (beat Hades once) is at 44.5% on Steam's global stats page, per a search snippet. WeMod shows 83% and 49%, and Gamescrobbler shows 83.8% for Escaped Tartarus. — [Steam Global Stats](https://steamcommunity.com/stats/1145360/achievements); [WeMod](https://www.wemod.com/en/cheats/hades-trainers/achievements); [Gamescrobbler](https://gamescrobbler.com/nl/games/hades-2020)
- **Balatro, "Heads Up" (win a run, any stake):** Exophase shows 83.73% (about 88.7k tracked Steam players), WeMod shows 77% "of all players," and Vandal shows about 58.6%. The spread reflects differences in samples and dates. "Ante Up!" is the achievement for reaching Ante 4. — [Exophase](https://www.exophase.com/game/balatro-steam/achievements/); [WeMod](https://www.wemod.com/en/cheats/balatro-trainers/achievements); [Vandal](https://vandal.elespanol.com/logros/pc/balatro/141759)
- **Balatro, Gold Stake (the top stake) win:** 8.53% on Xbox (Exophase, about 22k tracked) and 12.6-13.4% on PlayStation (Exophase). Epic shows "Completionist+" (win with every deck on Gold Stake) at about 0%. — [Exophase Xbox](https://www.exophase.com/game/balatro-xbox/achievements/); [Exophase PSN](https://www.exophase.com/game/balatro-psn/trophies/); [Epic](https://store.epicgames.com/achievements/balatro-f56b77)
- **Into the Breach, "Victory" (finish the game at any length/difficulty):** 52% of players (WeMod, undated). — [WeMod](https://www.wemod.com/fr/cheats/into-the-breach-trainers/achievements)
- **Monster Train 2, "The First but Not the Last" (win a Standard Run):** 66.7% on Steam global stats (undated). I found no figure for the original Monster Train. — [Steam Global Stats](https://steamcommunity.com/stats/2742830/achievements)
- **Vampire Survivors:** 93.8% have survived 10 minutes with any character ("Peachone") and 84.4% have survived 20 minutes ("Pentagram"). The game lists 243 achievements. I found no figure for surviving 30 minutes or clearing a stage. — [Steam Global Stats](https://steamcommunity.com/stats/1794680/achievements)
- **Hades difficulty philosophy:** Kasavin said the thrill comes from the game being able to "surprise you over and over again," not from punishing difficulty. Hades is still difficult, but its systems are built around moving forward, so losing still yields new story beats and items. — [GameSpot](https://gamespot.com/articles/hades-changes-what-it-means-to-be-a-roguelike/1100-6483420/)

### Inferences
- **Two targets, not one.** Successful roguelites pair a low per-run win rate at base difficulty (StS1 about 9%, StS2 about 16%) with high eventual-win penetration: roughly half to four-fifths of players beat the base game at least once (Hades about 45-49%, ITB about 52%, Balatro about 59-84%, MT2 about 67%). For a short mobile game with 3 floors, a plausible target is that a first-time player loses the first one to three runs, a typical engaged player wins about 20-35% of base runs, and a skilled player wins 60% or more. These targets are estimates derived from the comps, not published standards.
- **Shorter runs justify higher base win rates.** Balatro and Monster Train runs are shorter and more forgiving than StS1, and their win-once rates are higher. Dungeon Scramble's 3-floor runs suggest aiming above StS1's 9%.
- **Watch for a cliff at the first boss.** The StS2 character spread of 17-24% shows that even with Mega Crit's tuning, characters differ by up to about 7 points of win rate. Hades' 83% → 45% drop from clearing biome 1 to a full escape shows where most players get stuck. Dungeon Scramble should track a per-floor funnel (cleared F1 / F2 / F3 boss) through telemetry, so it can see where its own drop happens.

### Gaps
- I could not load Steam's live pages for Slay the Spire 1 ("The End?", per-character Act 3 boss kills), Hades, Balatro, Dicey Dungeons or Monster Train 1. Those numbers are missing or come from aggregators.
- I could not reach Mega Crit's primary StS2 report. I found no official A20 figure for StS2 (it had 10 ascensions in Early Access, per [PCGamesN](https://www.pcgamesn.com/slay-the-spire-2/ascension-levels)).
- The GDC 2019 talk "Slay the Spire: Metrics Driven Design and Balance" (Anthony Giovannetti) is behind the GDC Vault, so I have no win-rate numbers from it. — [GDC Vault](https://www.gdcvault.com/browse/gdc-19/play/1025731)
- I found no Dicey Dungeons or Into the Breach per-run win rates.

## 2. How ascension/heat systems scale

### Takeaway
Every major system stacks small, legible, mostly numeric modifiers (more enemy damage or HP, less healing, worse economy, more or harder elites) and reserves a few qualitative rule changes (curses, new boss movesets, double boss) for the upper steps. Per-step cost is small. StS1 per-run win rate goes from about 9% at A0 to about 3% at A20 across all players, so even the full ladder roughly triples the difficulty for the average attempter, whose skill also rises as they climb. The top tier is reached by single-digit percentages of players: Balatro Gold Stake about 8.5-13%.

### Cited Findings
- **Hades Pact of Punishment** has 1 Heat per rank for most conditions. Examples:
  - Hard Labor: +20% enemy damage per rank, 5 ranks (up to +100%).
  - Lasting Consequences: −25% healing per rank, 4 ranks (−100%).
  - Convenience Fee: +40% shop prices per rank, 2 ranks.
  - Jury Summons: +20% enemies per rank, 3 ranks.
  - Extreme Measures: each rank gives one boss new techniques; the first rank costs 1 Heat and later ranks reportedly cost 2 each.
  - Maximum Heat is 64.

  — [Prima Games](https://primagames.com/gaming/hades-guide-pact-of-punishment-modifiers-heat); [RPG Site](https://www.rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards); [TheGamer](https://www.thegamer.com/hades-heat-pact-punishment-trivia/)
- **Hades, 64 Heat:** A player reportedly cleared 64 Heat, which had been considered impossible without external tools. This shows the top of the ladder was deliberately set past normal human limits. — [Prima Games](https://primagames.com/news/an-amazing-player-just-completed-a-seemingly-impossible-hades-run)
- **Hades, Extreme Measures boss rework:** The Furies fight becomes one main Fury plus two invulnerable sisters with a couple of attacks each. Asterius gets a triple shockwave slam and a spinning axe that does about 30 damage per hit, and Theseus gets armor. The Hydra fight gains a lava floor. A player's opinion was that EM Theseus is easier while EM Asterius is "a menace," so qualitative changes are hard to balance evenly. — [Prima Games](https://primagames.com/gaming/hades-boss-guide-theseus-and-minotaur-asterius); [Prima Games, Furies](https://primagames.com/gaming/hades-boss-guide-furies-megaera-alecto-and-tisiphone); [Steam forum](https://steamcommunity.com/app/1145360/discussions/2/1745646405806420097)
- **Hades heat rewards:** Some boss rewards (for example, Titan Blood from the Furies) are only paid when the boss is beaten at a higher Heat than before with that weapon. Otherwise the fight pays just 40 Darkness. This "beat your own record" bounty system pulls players up the ladder. — [Prima Games, Furies](https://primagames.com/gaming/hades-boss-guide-furies-megaera-alecto-and-tisiphone)
- **Slay the Spire 1 Ascension:** The levels are cumulative. A1 adds more elites, A5 is reported in coverage as the curse step, A10 is commonly cited for Ascender's Bane, and A20 adds a second Act 3 boss (double boss). Per-run win rate falls from about 9% at A0 to about 3% at A20. — [GameGeeker](https://gamegeeker.com/fr/news/slay-the-spire-2-may-neows-news-update?market=FR); [PocketGamer ascension guide](https://www.pocketgamer.com/slay-the-spire/ascension-guide)
- **Slay the Spire 2 Ascension (10 levels in Early Access):** A1 "Swarming Elites" (one guide says about 60% more elites per run), A5 "Ascender's Bane" (start cursed), A10 double boss at the end of Act 3. Sources disagree on A2-A9: Weary Traveler (healing reduced), Poverty, Tight Belt, Inflation, and others. — [PCGamesN](https://www.pcgamesn.com/slay-the-spire-2/ascension-levels); [untapped.gg](https://sts2.untapped.gg/guides/ascensions-list-best-strategies); [brokenbuilds.gg](https://brokenbuilds.gg/slay-the-spire-2/guides/slay-the-spire-2-ascension-guide)
- **StS2 data point:** The A10 win rate (about 17%) is reported as roughly equal to or higher than the A0 rate (16%). This reflects selection: only skilled players reach A10. Win rate at a level therefore measures the population playing it, not the level's raw difficulty. — [Two Average Gamers](https://www.twoaveragegamers.com/slay-the-spire-2-beginner-guide/)
- **Monster Train Covenant:** 25 levels that raise enemy HP and attack, debuff your troops, and add other effects. Covenant 2 adds a Blight card ("Deadweight") to the starting deck. Covenant 10 originally Dazzled units entering the top floor; after player complaints it was changed (around 2021) to "Emberdrain," costing 1 ember next turn. — [Seasoned Gaming](https://seasonedgaming.com/2021/03/30/review-monster-train-can-you-keep-hell-from-freezing-over/); [Steam forum](https://steamcommunity.com/app/1102190/discussions/0/2527030866856060084); [Steam forum](https://steamcommunity.com/app/1102190/discussions/0/3092275748073975130)
- **Balatro stakes:** 8 cumulative stakes, White through Gold. The Gold Stake win rate among tracked players is 8.5-13%, against 59-84% for any win. A Steam forum poster estimated that under 10% of players have a Gold Stake win (anecdotal). — [Exophase Xbox](https://www.exophase.com/game/balatro-xbox/achievements/); [Steam forum](https://steamcommunity.com/app/2379780/discussions/0/596263931969820235)

### Inferences
- **Use legible, mostly numeric steps.** Design patterns shared by Hades, StS and MT:
  - Most steps are numeric and legible: enemy damage +20%, healing −25%, prices +40%, elites +X%.
  - Each step is roughly a 5-20% stat change.
  - "Rule-change" steps (curse in the deck, new boss movesets, double boss, extra boss techniques) are spaced out as milestones.
  - Several steps target the economy and recovery (healing, gold, shop prices, potion slots), not only enemy strength. That makes the player's planning tighter rather than only making fights longer.
- **Revise steps that remove agency.** Monster Train's change of Covenant 10 from Dazzle (units can't act) to Emberdrain (−1 energy) shows that a modifier which takes away player agency feels worse than one that taxes resources. Dungeon Scramble's depth modifiers should prefer taxes (less Block, fewer rerolls, +enemy HP) over lockouts (dice that can't be used).
- **Hades-style stacking needs a reward hook.** Hades' bounties for a new personal-best Heat, plus a tiny per-rank Heat cost, let players build their own difficulty. If Dungeon Scramble uses stackable depth modifiers, it should show a total "depth" number and reward reaching new totals, as Hades does. Some modifiers will be "cheaper" in difficulty than their point cost; Hades accepts that, and players optimize around it.
- **Use telemetry pass rates to tune the ladder.** Raw win rate at a level is confounded by who plays it (see the StS2 A10 point). Pass rate at depth N by players who just cleared depth N−1 is a better guide.

### Gaps
- I could not verify the full StS1 A1-A20 table, because the wikis were unreachable. My recollection, unverified and to be checked against an in-game list, is:
  - A1 more elites; A2 tougher normal-enemy damage; A3 tougher elite damage; A4 tougher boss damage.
  - A5 heal only 75% after a boss; A6 start damaged; A7-A9 normal/elite/boss HP up.
  - A10 Ascender's Bane; A11 one fewer potion slot; A12 fewer upgraded cards; A13 less boss gold.
  - A14 lower max HP; A15 worse events; A16 pricier shops.
  - A17-A19 normal/elite/boss movesets harder; A20 double boss.
- I found no complete Monster Train Covenant 1-25 table or win rates by Covenant level.
- I found no Hades heat-level clear distribution, for example the share of players who clear at 8, 16 or 32 Heat.

## 3. Enemy fairness: telegraphing, one-shots, unfair vs hard

### Takeaway
The genre's main fairness tool is perfect or near-perfect information about the next enemy action. Examples are Into the Breach's telegraphed attacks and StS intents, which critics call that game's "central innovation." With telegraphing, a loss can be traced to the player's decision. Other recurring rules are no unavoidable one-shots under reasonable play, lethal threats that are recognizable and escapable, cheap retries, and replacing agency-removing effects with resource taxes.

### Cited Findings
- **Into the Breach** shows every enemy attack at the start of the player's turn. The developers said that with every attack telegraphed and no random chance in your attack options, "the game starts to feel like a puzzle." — [Game Developer, Road to the IGF](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-)
- **Into the Breach** has been described as giving "perfect information at every point," in contrast to XCOM's fog of war, which makes it feel "more like Chess, and less like XCOM." — [Prototypr UX essay](https://blog.prototypr.io/into-the-breachs-ux-makes-you-feel-smart-a9cb03210757)
- Matthew Davis (Subset) gave "Into the Breach Design Postmortem" at GDC 2019. The talk covers 4 years of iteration and cut content. — [GDC](https://www.gdconf.com/news/get-inside-look-making-breach-gdc-2019)
- **Slay the Spire's enemy intents** are called the game's "central innovation" because they make it "easy to understand what is about to happen and why." — [LessWrong review](https://www.lesswrong.com/posts/MEimkSwwuRgiPaZaY/review-slay-the-spire)
- In **StS2**, multiple intents sit side by side and show numbers when relevant, so the indicators give "a baseline understanding of what is coming at all times." — [untapped.gg](https://sts2.untapped.gg/guides/how-to-read-enemy-intent)
- **StS design goals** from Giovannetti's GDC 2019 talk, per recaps: "every card should have a place" and "avoiding anything too warping." Because the game is single-player, rare overpowered combos are tolerated. A metric server was used, with the caution that metrics can mislead. — [mechanicsofmagic](https://mechanicsofmagic.com/2022/05/22/critical-play-is-this-game-balanced-10/); [Game Developer](https://www.gamedeveloper.com/design/learn-i-slay-the-spire-i-s-metrics-driven-approach-to-game-balancing-at-gdc-2019); [GDC news](https://gdconf.com/news/learn-slay-spires-successful-metrics-driven-approach-game-balancing-gdc-2019)
- **One-shot rule:** A character should not die from a single attack under reasonable play. The craft is in making critical moments "recognizable and escapable." Growing HP and stats widens the safety margin. This is a secondary write-up attributing the rule to a book (Harris, Ch. 6) that I did not check. — [kn86 roguelike design notes](https://kn86-docs-gca3d.kinsta.page/software/cartridges/authoring/roguelike-design/)
- **Cogmind's developer:** The main danger in permadeath is unfair odds. Give enough information and enough escape options that a resourceful player always has several responses, and use a large HP pool so no single hit kills. — [r/roguelikedev FAQ Friday #19, Aug 2015](https://redlib.ssps.io/r/roguelikedev/comments/3hs9gi/faq_friday_19_permadeath)
- **"Fair failure":** Defeat should be traceable to decisions, knowledge or execution, and lethal consequences should be telegraphed. This is a low-authority practitioner file. — [skillsmp](https://skillsmp.com/creators/hanjo92/roguelike-game-designer-skill/skill)
- **Retry cost:** Players quit over how failure is designed more than over difficulty itself. "Hard but fair" often means "hard but cheap to retry." This is a low-authority blog. — [bugnet.io](https://bugnet.io/blog/designing-failure-how-to-make-losing-fun)
- **Hades:** Kasavin's goal was "to take the sting of failure and reduce that as much as possible," knowing it inherently feels bad to die. — [Inverse](https://www.inverse.com/gaming/hades-god-mode-interview)
- **Boss tests of the build (Hades Extreme Measures):** New boss techniques test movement and positioning differently (Asterius' axe at about 30 damage per hit). Community reaction was uneven, showing the risk of one modified boss outclassing the others. — [Prima Games](https://primagames.com/gaming/hades-boss-guide-theseus-and-minotaur-asterius); [Steam forum](https://steamcommunity.com/app/1145360/discussions/2/1745646405806420097)
- **Reworking modifiers that removed agency:** Monster Train changed Covenant 10's Dazzle (units can't act) to Emberdrain after players found it frustrating. — [Steam forum](https://steamcommunity.com/app/1102190/discussions/0/3092275748073975130)

### Inferences
Applied to Dungeon Scramble:
- **Keep the telegraph honest and numeric.** The boss's next-turn special telegraph is the right core. The preview chip should show the actual damage number, including modifiers, as StS2 does. Anything that can kill should be visible a turn ahead.
- **Make heralded threats answerable.** The "herald" act that places Minions together with the warning is in the spirit of Into the Breach. It is fair only if the player has a counter in most trays, for example Block faces, Leap-over or clearing Minions with damage.
- **Add a damage-spike guard.** Avoid enemy turns that deal more than about 50-60% of the player's max HP at base depth, unless the threat was telegraphed with an answer available. This threshold is a designer heuristic inferred from the one-shot rule above, not a published number. The existing lethal warning feature fits this principle.
- **Treat overtuned enemies and overtuned builds differently.** The StS stance is to fix enemies that make deaths feel random (a variance or agency problem) but tolerate rare player-side power spikes in a single-player game. Overtuned player builds are less urgent unless they make one strategy dominant ("too warping").
- **Use telemetry to tell "hard" from "unfair."** Hard deaths come after a telegraphed lethal threat with options left untaken. Unfair deaths happen when no legal path could have prevented them, for example a hidden damage source or a tray with no answer. Logging per death the damage source, whether it was previewed, and whether a Block path existed would separate the two.

### Gaps
- I could not access a primary Mega Crit statement on why intents were designed, or the ITB GDC postmortem content on telegraphing (the Vault is members-only).
- I found no published numeric "max % of HP per hit" standards from AAA or indie developers. The threshold above is inference.

## 4. Difficulty curve within a run

### Takeaway
Roguelites make later acts harder in absolute terms but rely on the player's build to keep pace. Late floors stay threatening through enemies that check specific builds (scaling, multi-hit, debuffs), elites and bosses that act more often or get new rule changes, and higher-difficulty modes that intensify late-run threats (StS A17-A19 movesets, double boss at A10/A20, Hades Extreme Measures). Funnel data such as Hades' 83% → 45% from the first biome to a full escape shows that the first boss and the final boss are where retention breaks.

### Cited Findings
- **Hades funnel:** 83.2% clear Tartarus (biome 1 boss), but 44.5% ever escape. Most attrition happens between the first boss and the final boss. — [Steam Global Stats](https://steamcommunity.com/stats/1145360/achievements)
- **Vampire Survivors funnel:** 93.8% survive 10 minutes and 84.4% survive 20 minutes, a gentle early curve. — [Steam Global Stats](https://steamcommunity.com/stats/1794680/achievements)
- **Balatro funnel:** "Ante Up!" (reach Ante 4) versus "Heads Up" (win, Ante 8). Exact Ante 4 percentages were not captured. — [WeMod](https://www.wemod.com/en/cheats/balatro-trainers/achievements)
- **StS ascension pushes threat late:** Double boss at the end of Act 3 (StS1 A20, StS2 A10) and elite density at A1 shape the late curve and the elite curve rather than the early game. — [PCGamesN](https://www.pcgamesn.com/slay-the-spire-2/ascension-levels)
- **Progression widens the safety margin:** Rising HP and stats make once-deadly situations survivable, so the designer must raise threats to compensate. — [kn86 design notes](https://kn86-docs-gca3d.kinsta.page/software/cartridges/authoring/roguelike-design/)

### Inferences
- **For a 3-floor run:**
  - Floor 1 should be a gentle on-ramp, where most new players reach the F1 boss.
  - The F1 boss should be the first real check.
  - Floor 3 must escalate in mechanics, not only in numbers. Enemies should punish one-dimensional builds: Shield vs pure damage, multi-hit vs single big Block, Minion floods vs single-target.
  - The final boss's phase 2 is the natural place for a build test.
- **Rough funnel target (estimate):** For new players over their first runs, about 80-90% reach F2, about 50-60% reach F3, and 20-35% win. This mirrors the Hades and Vampire Survivors shape, adapted to a short run.
- **Keep the late game threatening with enemy-side scaling** (heavy turns every N, as in `HEAVY_EVERY`; bosses whose specials loop) plus specials that hit the player's weakest axis. Depth modifiers can add late-run-weighted threats, like StS's double boss, so experienced players are tested where their builds are strongest.

### Gaps
- I found no published per-act death distribution for Slay the Spire, such as spirelogs data on where runs end.
- I found no designer quotes on the ideal ratio of per-floor difficulty.

## 5. Accessibility/assist options and onboarding

### Takeaway
The leading models are Hades' God Mode and Celeste's Assist Mode. Hades' God Mode is a toggle that starts at 20% damage resistance, adds 2% per death, caps at 80%, and keeps all progression. Celeste lets players adjust game speed, stamina, air dashes and invincibility. Both are framed without stigma: Celeste dropped the name "Cheat Mode." Both keep the default experience intact and let players opt in. Hades also onboards through story and progression on death, so early losses still feel productive.

### Cited Findings
- **Hades God Mode:** A boon that immediately gives 20% less damage taken, rising by 2% after each death and capped at 80% resistance. Kasavin framed it around reducing the sting of failure. — [Inverse](https://www.inverse.com/gaming/hades-god-mode-interview)
- **God Mode and Heat interact:** A forum poster says some Heat settings largely counteract fully charged God Mode. This is forum commentary. — [Quarter to Three forum](https://forum.quartertothree.com/t/hades-supergiant-games/139167?page=66)
- **Celeste Assist Mode** adjusts game speed, stamina, number of air dashes and invincibility, and in 2018 also allowed skipping chapters. The menu says difficulty is essential to the experience, recommends playing without assists first, and frames assists as letting more players enjoy the game. — [Wireframe](https://wireframe.raspberrypi.com/articles/the-new-normal-the-indie-developers-changing-our-conceptions-of-difficulty); [New Normative](https://newnormative.com/2018/01/25/celestes-assist-mode-brings-welcome-accessibility-options); [Vice](https://www.vice.com/en/article/celeste-difficulty-assist-mode)
- **Thorson on Assist Mode:** "When it was discussed, I was the team member who was most against it… It felt like a betrayal of the precious experience I was designing." The original name, "Cheat Mode," was dropped as judgmental. The design reacted to Cuphead's "simple" mode, which removed content and drew criticism. — [Wireframe](https://wireframe.raspberrypi.com/articles/the-new-normal-the-indie-developers-changing-our-conceptions-of-difficulty)
- **Who standard difficulty excludes:** Players with disabilities, lower mechanical skill or limited time. — [UW DO-IT](https://washington.edu/doit/growth-accessibility-video-games)
- **Hades onboarding:** Losing still yields new story beats, items and changes, so the core systems are "built around moving forward." — [GameSpot](https://gamespot.com/articles/hades-changes-what-it-means-to-be-a-roguelike/1100-6483420/)

### Inferences
Options for Dungeon Scramble:
- **An opt-in "Easy" or assist toggle** modeled on God Mode: a small Block or damage-resistance bonus that grows after each loss and has a cap. It should be neutrally named, never remove content, keep unlocks, and perhaps be noted on the run-end card.
- **Assist options that suit a turn-based dice game:** an undo of the last path step, Swap/Reroll charges, or a lower depth floor below 0, instead of action-game speed sliders.
- **Onboarding:** Make the first runs productive even when lost (unlocks, codex entries, ability teaching). Keep base depth at a win rate where early losses feel near-misses rather than walls; see Section 1 for targets.

### Gaps
- I found no data on what share of Hades players use God Mode, or its effect on retention.
- I found no roguelike-specific onboarding studies with numbers.
