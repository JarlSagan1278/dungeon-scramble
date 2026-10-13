# Metrics and Content Health in Single-Player Roguelikes and Deckbuilders

Research notes, 2026-10-13. Context: solo designer (Dungeon Scramble) with a headless balance bot plus player telemetry (loot dice, relics, shrines, classes, origins, depth menu).

Method note: many primary pages could not be fetched from this environment (DNS failures for gamedeveloper.com, gdconf.com, arxiv.org, starcitygames.com, gatech.edu). Several findings therefore rest on search-result summaries of those pages, flagged "(via search summary)". Anything from background knowledge only is marked **[UNVERIFIED]**.

## 1. Which metrics do studios and data sites use?

### Takeaway
The core set, used both by roguelike studios and by card-game data sites, is pick rate (offered vs taken), win rate of runs that contain the item, and per-encounter difficulty (health lost / deaths by fight). All of these sources say the raw numbers are easy to collect and hard to read. Nobody publishes hard thresholds; data sites rank items against the average for their pool, not against a fixed number.

### Cited Findings
- Mega Crit's GDC 2019 talk "'Slay the Spire': Metrics Driven Design and Balance" (Anthony Giovannetti) covers taking a metrics-driven approach early in development and continuing to rely heavily on data through Early Access, along with using community feedback while keeping game feel and difficulty steady through a year of frequent updates. — [GDC Vault listing](https://www.gdcvault.com/browse/gdc-19/play/1025731); [Game Developer preview](https://www.gamedeveloper.com/design/learn-i-slay-the-spire-i-s-metrics-driven-approach-to-game-balancing-at-gdc-2019) (via search summary)
- A secondary summary of that talk says Mega Crit used a metrics server plus an internal Slack channel to collect and discuss player data, warned that metrics mislead if misread, held that every card should have a purpose, and avoided overpowered effects to keep strategies diverse. The summary also says Giovannetti saw an upside to being single-player: rare overpowered combos don't hurt anyone else's experience. — [Glasp talk summary](https://glasp.co/youtube/7rqfbvnO_H0); [Podwise summary](https://podwise.ai/episodes/1459444) (secondary, via search summary; the GDC Vault video is members-only, so the talk's exact card examples could not be checked)
- Slay the Spire uploads run data (cards offered/picked per floor, relics, floor reached, killed_by encounter, etc.) to Mega Crit's metrics server, and community "run history" JSON files have the same fields. **[UNVERIFIED: background knowledge, no source fetched]**
- Monster Train (Shiny Shoe): CEO Mark Cooke said the game "is packed with analytics about gameplay". The team's internal dashboards track card pick rates, win rates for particular clan combinations, and **median player health lost in a given battle**. He also said the data can be "hard to interpret... in a way that is deeply meaningful at times," though obvious problems are easy to spot. They combine dev playtesting, public/private beta feedback and data collection. — [Film Stories preview](https://filmstories.co.uk/gaming/monster-train-literally-a-train-full-of-monsters/) (via search summary)
- MetaBot (a community data site for Slay the Spire 2) reports, per card, **pick rate** (share of eligible runs that include the card, e.g. Prepared 9.2%), **win rate of runs that include the card**, and that win rate relative to the all-deck baseline of about 18.9%. It also shows run counts, some of them tiny (Mimic: 85.7% WR from 7 runs; Apparition: 22 runs), a separate tier letter, and observational pairings. — [MetaBot STS2 win rate](https://metabot.gg/en/slay-the-spire-2/cards/win-rate); [MetaBot Mimic](https://metabot.gg/en/slay-the-spire-2/card/mimic)
- Marvel Snap (Untapped.gg): cards and decks are ranked on **average cube rate** (expected stakes won/lost per game, so it rewards knowing when to retreat) **plus popularity**, compared with every other card and usually limited to a high-rank bracket (e.g. Rank 70+). Win rate is reported next to it, and the two can disagree: one Sandman deck had a 50.3% WR but a -0.19 cube rate, while the Surfer archetype had +0.35 cubes and a 56.2% WR. — [Untapped Snap meta report](https://blog.snap.untapped.gg/marvel-snap-ranked-meta-report-september-10-2024); [Scarlet Spider review](https://blog.snap.untapped.gg/early-review-of-scarlet-spider)
- MTG draft (17Lands): "win rate improvement when drawn" = WR in games where the card was drawn minus WR in games where it was in the deck but not drawn (Bladehold War-Whip: 62.6% vs 56.2%). 17Lands' own caveat is that this simple difference doesn't weight by game counts and may overvalue powerful late-game cards. — [StarCityGames on 17Lands](https://articles.starcitygames.com/2021/03/25/using-17lands-com-as-a-resource-to-improve-at-limited/) (via search summary). 17Lands also publishes GIH WR (games-in-hand win rate) and ALSA/ATA (average last seen at / average taken at, i.e. pick-order signals). **[UNVERIFIED definitions: background knowledge]**
- Hearthstone (HSReplay) shows deck and card "played"/"drawn"/"mulligan" win rates. HSReplay data comes only from tracker users, who win more than average, so its win rates run high. Vicious Syndicate looks at opponents' decks to reduce that bias (forum users disagree on how well it works). — [Blizzard forums: HS statistics](https://us.forums.blizzard.com/en/hearthstone/t/hearthstone-statistics/133001); [Blizzard forums: tier lists](https://us.forums.blizzard.com/en/hearthstone/t/tier-lists-on-websites-are-fakemade-up/82350?page=3)
- Balatro: no reliable public joker win-rate or pick-rate dataset turned up. Steam discussions and guides are anecdotal or editorial. — [Steam discussion](https://steamcommunity.com/app/2379780/discussions/0/614286180499921460)
- Backpack Hero, Peglin, Wildfrost: no published balance-metrics talks or data found in this search pass. (Gap; see below.)

### Inferences
- A minimal dashboard for Dungeon Scramble, drawn from these sources:
  1. Offer rate and take rate (pick rate) for each loot die, relic and shrine choice.
  2. Win rate (or average floor reached / depth cleared) of runs holding the item, *relative to the class/origin baseline*, with n always shown.
  3. Median HP lost per encounter (Monster Train's metric) and deaths by encounter, for each depth.
  4. Run length and quit points.
- Always show the run count next to any rate, as MetaBot does. With a small solo player base most per-item human win rates will be noise; the bot is what gives you n.
- The Marvel Snap cube-rate vs win-rate gap is a reminder that the outcome metric needs to match the game's real goal. For Dungeon Scramble that is probably "depth cleared / floor reached" rather than a binary win, since a binary win throws away information when win rates are low (StS2's baseline is about 19%).

### Gaps
- The exact metrics, charts and card examples in Giovannetti's talk could not be confirmed (Vault is members-only; summaries are secondary).
- No public data or talks found from Backpack Hero, Peglin, Wildfrost or Balatro's developers on how they measure balance.

## 2. Pitfalls of win-rate-when-held, and better methods

### Takeaway
Win rate of runs or decks containing X is badly confounded:
- **Selection.** Strong players and strong decks pick X.
- **Survivorship and exposure.** Items you only see deep in a run look good because the run survived to see them; late-game cards look bad in the "played" view because games that go long are often losing ones.
- **Archetype.** X shows up in a deck that is already strong.

The fixes are controlled experiments (forced inclusion or ablation, which is exactly what a bot can do), within-deck comparisons (drawn vs not drawn), skill-stratified views, and model-based (regression/ML) attribution.

### Cited Findings
- Hearthstone "played" win rate: a high-rank player argued that a card's played WR mostly reflects which games get long enough for it to come out. Late cards get dragged down because "you really only play it in a bad matchup in the first place". He compared it to airbags, which correlate with crashes without causing harm. He proposed an ML model predicting wins from mulligan/draw/play data instead. — [outof.cards devtracker](https://outof.cards/devtracker/hearthstone/reddit/r-competitivehs/3171)
- A related Hearthstone community claim: one card's drawn and mulligan win rates looked inflated because fast-opening players win before the card matters (anecdotal, one card). — [devtrackers.gg](https://devtrackers.gg/hearthstone/p/f5c5222d-theory-the-statistics-on-arch-villain-rafaam-and-zoo-are-wrong)
- Sample bias: tracker users are better than the average player, so published win rates run high, especially at lower ranks. — [Blizzard forums](https://us.forums.blizzard.com/en/hearthstone/t/hearthstone-statistics/133001)
- 17Lands: a card's high win rate can come from the archetype it lands in (the example card was played mainly in strong Boros decks), not its own power. "Improvement when drawn" partly controls for this by comparing drawn vs undrawn within the same decks, but it still overvalues late-game bombs. — [StarCityGames](https://articles.starcitygames.com/2021/03/25/using-17lands-com-as-a-resource-to-improve-at-limited/) (via search summary)
- MetaBot itself notes its card win rates are correlational and don't separate the card from the rest of the deck or from player skill. — [MetaBot](https://metabot.gg/en/slay-the-spire-2/cards/win-rate) (via search summary)
- Mega Crit warned that metrics can mislead without careful reading. — [Glasp summary](https://glasp.co/youtube/7rqfbvnO_H0) (secondary)
- Forced-restriction method in the literature: Jaffe et al. (AIIDE) evaluate competitive balance with "restricted play". They compare agents that are barred from using some element against unrestricted agents, and the win-rate difference measures how much that element matters. This is the formal version of a forced-inclusion/forced-exclusion bot study. — [AIIDE paper page](https://ojs.aaai.org/index.php/AIIDE/article/view/12513); [PDF](https://cdn.aaai.org/ojs/12513/12513-52-16035-1-2-20201228.pdf)

### Inferences
- In Dungeon Scramble terms:
  - Human-telemetry "WR when held" is a lead to investigate, not a verdict.
  - The bot study that forces item X into a fixed class/origin/depth/seed set and compares against a matched control (same seeds, X absent or replaced by a median item) gives a causal "win rate added". This is the restricted-play method and the best tool available here.
  - Use common random numbers (the same seed list for both arms) to cut variance.
- Exposure timing matters. An item usually acquired on floor 3 will show inflated held-WR (the run already survived floors 1–2). Compare only runs that reached the point where it was offered: "WR given offered-and-taken vs offered-and-skipped at the same floor". This mirrors 17Lands' drawn-vs-undrawn control.
- Look at pick rate separately for skilled vs new players, if telemetry can tell them apart (e.g. by highest depth cleared). Items that skilled players skip while new players take them are candidate trap items (see section 3).
- Regression or logistic models on run outcome, with all held items plus class/origin/depth/player-skill as covariates, give partial effects. They need far more runs than a solo game will collect from humans, but bot runs can supply them.

### Gaps
- No primary source found for Mega Crit's own statistical method (whether they used offered-vs-taken controls or regression). Unknown.
- No published roguelike studio account of a formal A/B forced-inclusion test was found; the evidence for it is from academic work (Jaffe et al.) and bot practice.

## 3. Dead content: detection, fixes, situational and "trap" items, rarity

### Takeaway
Dead content shows up as low take rate when offered, low impact even when taken (forced-inclusion delta near zero), or both. The sources don't say every item must be equally strong. Mega Crit's stated rule, per a secondary summary, is that every card should have a purpose (a niche). Situational items are fine if the situation actually comes up. Rarity tiers spread power out, so rare items are allowed to be stronger.

### Cited Findings
- "Every card should have its place/purpose", and overpowered effects are avoided to keep strategies diverse (Mega Crit). — [Glasp summary](https://glasp.co/youtube/7rqfbvnO_H0) (secondary)
- In deckbuilders, taking a weak card has a real cost: players must "avoid diluting their deck with cards that do not work as well". Pruning functionally dead cards is part of the genre's core loop. — [Wikipedia: Roguelike deck-building game](https://en.wikipedia.org/wiki/Roguelike_deck-building_game); [GameCritics Roguebook review](https://gamecritics.com/steve-gillham/roguebook-review/)
- Roguebook's alternative: a "big deck" design where synergies keep weaker cards useful, so dead cards matter less. — [GameCritics](https://gamecritics.com/steve-gillham/roguebook-review/)
- Design pattern of building situational choice into the item itself: Trait gives each card two effects, and the player picks one per play ("no wrong answer, but always a better one"). — [itch.io devlog: Card Deck Design Problems](https://tedbendixson.itch.io/rogue-deck-builder/devlog/750775/card-deck-design-problems) (via search summary)
- Archetypes in deckbuilders: items that look weak alone exist to enable an archetype. — [Game Developer: Archetypes in deckbuilding games](https://www.gamedeveloper.com/design/archetypes-in-deckbuilding-games) (title and topic only; page not fetched)
- Balatro rarity: Legendary jokers come only from The Soul spectral card, which has about a 0.3% chance to appear in Spectral/Arcana packs, so the strongest effects are made rare instead of being nerfed. — [games.gg Balatro jokers guide](https://games.gg/balatro/guides/balatro-jokers-guide/) (guide; not a primary source)
- Mark Rosewater's (MTG) "trap"/"bad on purpose" cards argument, that some weak cards exist to teach evaluation skill, is often cited. **[UNVERIFIED: background knowledge; no source fetched in this pass]**
- Slay the Spire has cards widely seen as weak (often-cited examples: Clash, Spot Weakness-type niche cards) that Mega Crit kept as situational. **[UNVERIFIED: no patch-note source found]**

### Inferences
- A detection rule for Dungeon Scramble:
  1. Take rate when offered well below the median of its rarity tier (e.g. bottom decile), **and**
  2. a bot forced-inclusion delta near zero (within noise).

  Both together means truly dead. Low take but a positive bot delta means mis-read or under-explained: fix the text or UI, not the numbers. High take but zero or negative delta means a trap item: either buff it or make its weakness visible.
- Since loot dice need 3 copies to unlock as a Starting Boon, dead dice are doubly costly. Players grind copies of something they won't use. Prioritise dead-content fixes on boon-eligible dice.
- Situational items need their situation to actually happen. Check how often the enabling condition happens (e.g. "boss fights per run" for an anti-boss relic) before calling an item dead.
- Rarity tiers are an explicit lever. Allow higher power at lower offer frequency. When an item is strong but fun, moving it up a tier is a softer change than a nerf.

### Gaps
- No primary developer source found on thresholds (e.g. "anything below X% pick gets reworked").
- No Rosewater or Mega Crit primary quote on trap cards was fetched.

## 4. Overpowered content in single-player: nerf or leave?

### Takeaway
Single-player designers, and the secondary summary of Mega Crit's talk, treat rare overpowered combos as acceptable or even desirable, since no opponent suffers. The usual targets for change are:
- things that are *reliably* dominant (low variance, always picked);
- things that are tedious;
- things that flatten choice.

Nerfs to beloved strong items get noticeable pushback. Developers often pair them with buffs or ship them in a public beta first.

### Cited Findings
- Per a secondary summary, Giovannetti saw being single-player as an advantage that allows rare overpowered combos without spoiling anyone else's experience. — [Glasp summary](https://glasp.co/youtube/7rqfbvnO_H0) (secondary)
- Snecko Eye (StS): a 2018 Steam thread asked whether it was OP with Ironclad. The poster concluded it wasn't, but found it "fun the first time" and annoying when it appeared repeatedly, and suggested changing Confusion (e.g. minimum cost 1) rather than removing its draw. A 2019 player reported 4 of 7 Ironclad wins had Snecko (anecdote, n=7). — [Steam thread](https://steamcommunity.com/app/646570/discussions/0/1642042464743792192); [Steam thread](https://steamcommunity.com/app/646570/discussions/0/2952628008361571545)
- No patch-note evidence was found that Snecko Eye or Dead Branch were nerfed in StS1. The common belief that both were left strong on purpose is **[UNVERIFIED]**.
- Binding of Isaac: a fan wiki records that a patch "severely nerfed" the Brimstone + Chocolate Milk combo, and a later change let players charge the next Brimstone while the previous beam was still firing. Steam players pushed back on the balance direction; one said without Brimstone the game becomes dull. — [Steam discussion](https://steamcommunity.com/app/250900/discussions/0/5254037276320810611); [Steam discussion](https://steamcommunity.com/app/250900/discussions/0/3068614788774372764) (community, not developer)
- Isaac's power fantasy is part of the design: commentary says the character goes from basic Isaac to a mutated, overpowered monster by the final floors. — [Kill Screen postmortem](https://www.killscreen.com/binding-issac-postmortem/) (commentary)
- No direct McMillen or Nicalis statement on intentional OP items was found. — gap
- Balatro 1.0.1: shipped through an experimental Steam beta first. It reduced ante scaling on higher stakes (White, Green, Purple) after criticism that high stakes were tedious, and toned down several build-around jokers. Beta testers' reactions were split: the Steel Joker nerf and Glass Joker buff were approved, the Campfire nerf was "harsh but justified", there was surprise Hologram wasn't nerfed, and the Swashbuckler change divided people. LocalThunk said he wanted to "iron out the kinks with the help of players". — [VGC](https://www.videogameschronicle.com/news/balatros-first-major-update-tweaks-difficulty-adds-new-joker-types); [Windows Report](https://windowsreport.com/balatro-is-getting-a-bit-easier-with-its-first-major-update/); [Lemmy discussion](https://lemmy.imagisphe.re/post/576085/1782614)
- Blueprint and Brainstorm (Balatro) are widely regarded as top-tier copy jokers that were never seriously nerfed. **[UNVERIFIED: no source fetched]**
- Slay the Spire 2 (Early Access): Mega Crit reverted many contentious balance changes from one beta patch in the next, after player feedback. — [Untapped STS2 patch notes](https://sts2.untapped.gg/en/patch-notes/v0.101.0?tab=notes) (via search summary)
- Small tweaks to a dominant item can ripple through the whole meta. — [Kill Screen](https://www.killscreen.com/binding-issac-postmortem/) (commentary)

### Inferences
- Rules of thumb for a solo designer, synthesized from the above:
  1. Leave an item strong if it is rare, has a cost or setup, and creates memorable runs. That is the "rare overpowered combo" upside.
  2. Change it if it is **reliably** chosen (very high take rate in every class), makes other choices irrelevant (other items' take rates collapse when it's held), or causes tedium. Snecko's complaint was annoyance, not win rate.
  3. Prefer moving it up a rarity tier, adding a cost, or buffing alternatives over a straight number nerf.
  4. Test with players before shipping (Balatro's beta; StS2's reverts).
- For Dungeon Scramble, with a single owner and a small player base, the bigger risk is "the bot says X is +20% WR". Before nerfing, check whether X is also what makes runs fun. Pair any nerf with a buff to the next-best option.

### Gaps
- No developer-primary sources on Isaac Godhead/Brimstone intent, StS Dead Branch/Snecko intent, or Balatro Blueprint/Brainstorm.
- No quantitative data on how much nerfs affect player retention or reviews.

## 5. Bots and simulation for balance: methods and limits

### Takeaway
Academic and industry work supports simulated agents for balance:
- MCTS or planning agents at different skill levels (Cardonomicon, FDG 2015);
- restricted-play comparisons (AIIDE);
- ML agents running many simulated games (Google);
- automated search over card parameters (Ludus).

All of them say bots measure what the bot can exploit, not what humans enjoy or perceive. Skill level changes the answer, so run several skill levels.

### Cited Findings
- Zook et al., "Cardonomicon" (FDG 2015): automated planning agents (MCTS) simulate players of different skill levels to produce balance metrics (tested on Scrabble) and expose design flaws (tested on a custom CCG). — [PDF](https://faculty.cc.gatech.edu/~riedl/pubs/zook-fdg15.pdf) (via search summary; not fetched)
- Jaffe et al., "Evaluating Competitive Game Balance with Restricted Play" (AIIDE): measures balance by comparing restricted agents with standard agents, applied to an educational card game. — [AAAI OJS](https://ojs.aaai.org/index.php/AIIDE/article/view/12513)
- Ludus (AAAI-22 EAAI track): automated playtesting plus global search to tune per-card parameters in an auto-battler card game, with sampling-based approximation to cut the number of playtests. — [AAAI](https://aaai.org/?p=56293) (via search summary)
- Silva et al., "Exploring Gameplay With AI Agents" (arXiv 1811.06962): playtesting agents on a stripped-down recreation of the game's mechanics rather than the live client. Building a headless rules model is the practical path. — [ar5iv](https://ar5iv.arxiv.org/html/1811.06962)
- Google "Chimera": trained ML agents ran large numbers of simulated games to balance a prototype digital card game. — [Google Research blog](https://research.google/blog/leveraging-machine-learning-for-game-development/) (via search summary)
- An LLM-agent study (arXiv 2410.02829) argues LLM agents are not human-level players but can work as testers to *measure relative difficulty*, and names Slay the Spire as a representative candidate. — [arXiv 2410.02829](https://arxiv.org/pdf/2410.02829) (via search summary)
- Slay the Spire bots:
  - sts_lightspeed is an RNG-accurate C++ simulator used by bot projects. — [AutoClad GitHub](https://github.com/benmuth/AutoClad)
  - A community model card reports that a learned non-combat policy (map, card rewards, shops) on top of simulator MCTS combat reached average floor 42.5 and a 14% win rate on 50 A0 Ironclad seeds, vs 31.2 floors and 6% for stock heuristics. Distilling MCTS combat into feed-forward networks repeatedly failed. — [Hugging Face model card](https://huggingface.co/Jialeiv/sts-rl-agent) (not peer-reviewed; n=50)
  - Bottled AI is regarded as a leading StS bot, but no verified win-rate figure was found. — [Manifold market](https://manifold.markets/RobertTyphi/will-a-slay-the-spire-bot-playing-o)
- Monster Train's team pairs data with dev playtesting and beta feedback rather than relying on any single source. — [Film Stories](https://filmstories.co.uk/gaming/monster-train-literally-a-train-full-of-monsters/)

### Inferences
- The StS model card shows that **drafting/route policy, not just combat, drives most of a bot's results** (an 11-floor swing). For Dungeon Scramble's bot, item-value conclusions depend on how well its pick heuristic matches humans. A forced-inclusion study sidesteps the pick heuristic, but it doesn't remove the play-policy bias: a bot that can't use an item's synergy will undervalue it.
- Run studies at two or more skill levels (the harness already has a `skill` knob), as Cardonomicon does. Items whose delta flips sign between skill levels are skill-dependent, which is fine, but note it.
- Bots don't measure clarity, tedium, "feels bad", or session fatigue. Human telemetry (quit points, take rates) and Jeremy's playtests cover those.

### Gaps
- No peer-reviewed paper found that values Slay the Spire cards by simulation rollouts.
- Couldn't fetch the full texts; method details above come from abstracts and summaries.

## 6. Mobile-specific: session length, losing streaks, retention

### Takeaway
General mobile benchmarks: median sessions of about 5 minutes and top games about 8–9 minutes, D1 retention in the mid-20s% for top-quartile games, and median D7 under about 4%. No roguelike-specific mobile retention or losing-streak tolerance data was found.

### Cited Findings
- GameAnalytics 2025: top-25% games average D1 retention of 26.48–27.69% by end of 2024. Median D7 across all projects is 3.42–3.94%. Top-tier sessions average 8–9 min, median tier 5–6 min. Midcore titles get 6–7 sessions/day. — [GameAnalytics 2025 benchmarks PDF](https://investgame.net/wp-content/uploads/2025/02/2025-GameAnalytics-Mobile-Gaming-Benchmarks.pdf); [GameDev Reports summary](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)
- GameAnalytics Q1 2024: overall median D1 22.91%, D7 4.2%, D28 0.85%. Median session 4 min 45 s. Strategy and card-style genres had the longest sessions. — [GameDev Reports Q1'24](https://gamedevreports.substack.com/p/gameanalytics-benchmarks-in-mobile)
- An older (2019-era) benchmark: top Board/Card/Strategy/Puzzle games reach D7 of 15–25%. — [WN Hub](https://wnhub.io/news/analytics/item-2261) (dated)
- Caveats: vendor datasets, differing definitions (classic vs rolling retention), some sponsored reports. — [GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)

### Inferences
- A full Dungeon Scramble run is probably much longer than a 5–9 minute mobile session. Mid-run save/resume and natural stopping points (between floors) matter more than run length itself. Telemetry should log *where* sessions end (quit points) separately from where runs end (deaths).
- Since StS2's community win-rate baseline is about 19% (MetaBot), low win rates are normal for the genre. What matters for retention is whether losses feel like they teach something and whether progress carries over (boon unlocks, depth badges).

### Gaps
- No research found on losing-streak tolerance, or on mobile roguelike-specific retention (e.g. Slay the Spire mobile, Balatro mobile, Pocket Rogues). Sensor Tower/AppMagic genre cuts would be needed.
