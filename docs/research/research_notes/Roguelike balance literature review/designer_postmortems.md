# Designer postmortems and public statements on roguelike balance

Research method note (2026-10-13): WebFetch and direct curl to almost every game-press domain (gamedeveloper.com, 80.lv, rogueliker.com, gdcvault media) were blocked by the session's egress proxy (CONNECT 403 / DNS failure). Every finding below therefore comes from **search-engine excerpts of the pages cited**, not a full read of those pages. Quotes in "double quotes" appeared verbatim in search excerpts. Unquoted lines are paraphrases from those excerpts. Anything taken from memory and not confirmed by a search is marked **[UNVERIFIED]** and listed under Gaps. Re-check the key quotes against the full page before relying on them (for example in a design doc for Jeremy).

---

## Q1. Slay the Spire (Mega Crit): metrics-driven balance, OP vs weak cards, Ascension

### Takeaway
Mega Crit (GDC 2019, Anthony Giovannetti) treated balance as a data-plus-community loop run through weekly Early Access patches. The stated goal was that every card earns a place without warping the game. They also said a single-player roguelike can tolerate rare overpowered combos, because a broken run hurts nobody else. Ascension (20 sequential levels) separates players by skill, so the base game does not have to be tuned for experts. Seven years later, in the Slay the Spire 2 beta (2026), patches that targeted infinite combos and fan-favourite cards drew a large player backlash and some of those changes were rolled back.

### Cited Findings
- GDC 2019 talk "'Slay the Spire': Metrics Driven Design and Balance" by co-founder Anthony Giovannetti. It covers how the team "took a metric-driven focus early in development, and continued to make heavy use of data driven development throughout the early access process". The session description notes the game sold over 1 million copies in its first Early Access year. — [Game Developer, Jan 29 2019](https://www.gamedeveloper.com/design/learn-i-slay-the-spire-i-s-metrics-driven-approach-to-game-balancing-at-gdc-2019); [GDC Vault](https://www.gdcvault.com/browse/gdc-19/play/1025731); [video](https://www.youtube.com/watch?v=7rqfbvnO_H0)
- Official slide deck (as excerpted by search): the balance goal is that every card earns a place while nothing is too warping; "Single Player + Rogue-like" is listed as a balance *advantage*; Ascension is 20 levels, unlocked one after another, to stratify player skill; the team handled 18,168 pieces of feedback; the closing advice is to iterate, not fear changes, and update more often. — [GDC 2019 slides PDF](https://media.gdcvault.com/gdc2019/presentations/Giovannetti_Anthony_SlayTheSpire.pdf) (search excerpt only; the PDF download was blocked)
- Third-party talk summary: every card should have its place, avoiding overpowered effects to keep strategies diverse. Being single-player allows "rare overpowered combos without disrupting other players' experiences". Tooling was an internal Slack channel fed by a metrics server, and he warned that metrics can mislead if not carefully interpreted. Weekly updates, Discord feedback, ascension levels and streamer insight all shaped balance. — [Podwise summary of the talk (2019)](https://podwise.ai/episodes/1459444) (secondary)
- Interview (speaker unnamed in the excerpt, a Mega Crit dev): with "hundreds of cards, plus all these relics interacting with everything. There's no way that just the two of us can possibly balance this all correctly", so they relied on playtester data; the approach is "by no means perfect at all". "We want it to be pretty skill-based." — [PC Gamer interview](https://www.pcgamer.com/slay-the-spire-designer-discusses-new-characters-and-card-game-inspirations/) (speaker attribution unverified)
- Giovannetti says "perfect balance" is not achievable in a card game, and points to Ascension as the response: beating the game unlocks Ascension 1, which "adds an extra layer of difficulty". — [Think Like A Game Designer, Justin Gary podcast](https://justingarydesign.substack.com/p/anthony-giovannetti-crafting-slay) (excerpt)
- Slay the Spire 2 (2026): Casey Yano said Ascension 10 is meant to be roughly the ceiling of standard difficulty. He rejected stacking enchantments: "We want our players to experience deckbuilding rather than cardbuilding." — search excerpt; see [Wikipedia: Slay the Spire II](https://en.wikipedia.org/wiki/Slay_the_Spire_II) and [PC Gamer](https://www.pcgamer.com/games/card-games/mega-crit-co-founder-says-he-wasnt-bothered-by-the-steam-backlash-to-slay-the-spire-2s-beta-balance-patch-its-difficult-for-players-to-feel-like-theyre-heard/)
- StS2 beta, March 2026: the first big balance patch went after many infinite combos and changed iconic cards such as Prepared. It drew more than 9,000 negative Steam reviews within about 24 hours. Mega Crit then reverted several nerfs (Prepared, Borrowed Time, Capture Spirit), and patch 0.104.0 warned against "kneejerk reactions", asking players to adapt before drastic changes. Yano said he wasn't bothered: "It's difficult for players to feel like they're heard." — [PC Gamer (2026)](https://www.pcgamer.com/games/card-games/mega-crit-co-founder-says-he-wasnt-bothered-by-the-steam-backlash-to-slay-the-spire-2s-beta-balance-patch-its-difficult-for-players-to-feel-like-theyre-heard/); [PCGamesN, infinites nerfed](https://www.pcgamesn.com/slay-the-spire-2/patch-notes-infinites-nerfed); [games.gg, nerfs rolled back](https://games.gg/news/slay-the-spire-2-dev-rolls-back-nerfs-after-review-bombing/)
- StS2 beta, May 2026 (0.106.0): card nerfs, plus a "relatively sizeable nerf" to the Skulking Colony *elite*, so enemies were nerfed too. July 31, 2026: some experimental card redesigns were rolled back. — [Kotaku](https://kotaku.com/slay-the-spire-2-patch-update-nerfs-buffs-elite-tainted-aeonglass-wither-2000698644); [PCGamesN Jul 31 2026](https://www.pcgamesn.com/slay-the-spire-2/patch-notes-july-31-2026)

### Inferences
- Mega Crit's 2019 position is "no card should be dead, nothing should be warping". In practice that means buffing weak cards so they get picked and cutting outliers that crowd out other strategies. Rare combos that are broken only *conditionally* are explicitly fine in single-player.
- The StS2 backlash is a warning for Dungeon Scramble: once players love an infinite or a beloved strong pick, nerfing it costs more goodwill than a buff costs. Solo-designer implication: get outliers right *before* players attach to them, or cap them through structure (Ascension/depth) instead of nerfs.
- Ascension is the template for Dungeon Scramble's depth system: stacked, sequentially unlocked modifiers that stratify skill, so the base game can stay generous.

### Gaps
- Could not confirm from the talk itself which per-card metrics were shown (pick rate vs. win-rate-when-in-deck, floor reached, etc.). The commonly repeated claim that the talk showed per-card pick and win-rate graphs is **[UNVERIFIED]**; the slide PDF and video were not reachable.
- No verified Mega Crit quote on how they treated OP *relics* specifically.

---

## Q2. Balatro (LocalThunk): broken jokers, exponential scaling, "busted" runs

### Takeaway
LocalThunk describes balance as a never-finished, trial-and-error process. Every Joker was adjusted at some point, some were scrapped, and demo/beta players who "understood the game better than he did" guided the tuning. He also defends authorial intent: no score preview, because watching an engine run without knowing the result is the fun. No verified primary quote says that broken Jokers are deliberately left in.

### Cited Findings
- He wouldn't call Balatro hard to balance; it is "just an ongoing process". Every Joker has been adjusted, some effects scrapped entirely, others tweaked. — [Rogueliker interview (2024)](https://rogueliker.com/balatro-interview/) (excerpt)
- He expected the early post-launch weeks to be "fixing bugs and balance changes and stuff". — [Hard Drive interview (2024)](https://hard-drive.net/?p=43756) (excerpt)
- He wanted to keep making fixes and balance changes and thinks Balatro "can be much improved". — [TouchArcade, Mar 18 2024](https://toucharcade.com/2024/03/18/balatro-interview-mobile-port-localthunk-dlc-plans-updates-new-jokers-demo-feedback/)
- Demo and beta players understood the game better than he did, so he listened to them on balance. — [LocalThunk, "The Balatro Timeline" (own blog, 2024/25)](https://localthunk.com/blog/balatro-timeline-3aarh)
- Most of the design came from trial and error: trying directions to see whether they were interesting. — [DayOne interview, Mar 9 2024](https://playday.one/2024/03/09/there-is-a-lot-more-design-to-explore-within-balatro/)
- Score preview: he argued that players would use an optional preview and then wouldn't be playing the game he intended. The game is more fun when you build your engine and watch it run without knowing whether the hand will win. He said he built the game for himself and won't change it just because many people ask. — reported in [GMTK (Mark Brown), "Balatro's 'Cursed' Design Problem"](https://gmtk.substack.com/p/balatros-cursed-design-problem), citing the Eggplant podcast (secondary). TouchArcade reports a softer line: he would not enable it himself but saw it as a net positive when suggested. — [TouchArcade 2024](https://toucharcade.com/2024/03/18/balatro-interview-mobile-port-localthunk-dlc-plans-updates-new-jokers-demo-feedback/) (**sources partly conflict**)
- 1.1 update: Matador was planned for an overhaul because it "doesn't always work as expected". This is a clarity fix, not a power fix. — [80.lv coverage](https://80.lv/articles/here-is-what-to-expect-in-balatro-1-1-update)
- Game Maker's Notebook podcast (Dec 2024) covers "ruthless design": removing systems to improve fun. — [Apple Podcasts](https://podcasts.apple.com/us/podcast/balatro-creator-localthunk-talks-inspirations-and-jokers/id1313004515?i=1000679625804) (description only)

### Inferences
- The surprise of watching your own engine score is LocalThunk's core fun. Big, exponential, "busted" scores are the *payoff* of that loop, not a bug. His public tuning targets clarity and making weak Jokers interesting more than capping strong ones.
- For Dungeon Scramble: don't add a "preview damage" that removes the surprise of a long dice path resolving, unless the information is needed for fairness against enemies (see Into the Breach, Q6).

### Gaps
- No verified LocalThunk quote that explicitly endorses broken Jokers or exponential scaling (e.g. "busted runs are the point"). The common community framing is **[UNVERIFIED]** as a developer statement.
- No verified statement on Stake (difficulty) design.

---

## Q3. Hades (Supergiant): Heat/Pact, God Mode, boons, enemy fairness

### Takeaway
Kasavin frames difficulty in Hades as "a means to an end" and the studio's aim as removing the sting of failure. God Mode is a tolerance knob that preserves the core loop rather than an "easy mode". The Pact of Punishment lets players opt into specific, named hardships. No verified primary statements on duo-boon power or on telegraph fairness were found.

### Cited Findings
- The difficulty associated with roguelikes is "more a means to an end rather than a core feature". The Mirror of Night is a way to make you "meaningfully more powerful from one playthrough to the next". — [Tom's Guide interview with Greg Kasavin (2020)](https://www.tomsguide.com/features/hades-exclusive-interview-supergiant)
- God Mode: the main goal was to lessen the sting of failure; a standard easy mode would undercut the looping that defines the game. God Mode makes the game more tolerant so players keep learning. Difficulty options should be designed specifically for each game. — [Inverse (2021)](https://www.inverse.com/gaming/hades-god-mode-interview); [Can I Play That, Aug 11 2021](https://caniplaythat.com/2021/08/11/hades-god-mode-explained-by-supergiant-games/); [Origin Story podcast](https://www.originstory.show/episodes/greg-kasavin)
- Pact of Punishment conditions "make specific aspects more difficult" and Hades embraces those harder situations. — [Inverse (2021)](https://www.inverse.com/gaming/hades-god-mode-interview)
- Early development aimed to remove the frustration of dying and having to restart. — [Game Developer, citing a Rock Paper Shotgun interview](https://www.gamedeveloper.com/design/how-supergiant-weaves-narrative-rewards-into-i-hades-i-cycle-of-perpetual-death)
- Kasavin's GDC talk on Hades' development (Early Access-driven process). — [Game Developer: "Watch Greg Kasavin discuss..."](https://www.gamedeveloper.com/design/watch-greg-kasavin-discuss-the-development-of-supergiant-games-i-hades-i-)

### Inferences
- Pact design pattern (from the game itself, not a quote): Heat is many small, *named* modifiers the player chooses, rather than one opaque difficulty multiplier. Players can pick hardships that fit their build, and rewards (bounties) scale with Heat. Dungeon Scramble's depth could likewise expose individual modifiers instead of just stacking HP/damage.
- God Mode (+2% damage resistance per death, capped at 80% in the shipped game, from game knowledge) is an adaptive *tolerance* layer, a strong option for a phone game played in short sessions.

### Gaps
- No primary source found on duo-boon power levels, on whether boon outliers were deliberately left strong, or on enemy telegraph fairness. Any claim that Supergiant "lets player power run wild but keeps enemy attacks readable" is **[UNVERIFIED]** as a quote; it is a reasonable reading of the game, not a sourced statement.

---

## Q4. Dicey Dungeons (Terry Cavanagh): dice randomness, episodes, fun vs fairness

### Takeaway
Cavanagh found that stacking randomness (random cards *plus* random dice) felt too chaotic, so most equipment layouts are static and the dice carry the uncertainty. Each character is a different answer to "how do you introduce uncertainty into each run". He calls balancing strategy against chaos the hardest part. Per-character episodes with rule variants deliver variety instead of a single random map.

### Cited Findings
- Combining random cards with random dice made the game too chaotic, so most character layouts were kept static. Balancing strategy against chaos is "the hardest thing to get right". The Jester is the exception, deliberately exploring that variation. — [Game Developer, "Road to the IGF: Dicey Dungeons" (2020)](https://www.gamedeveloper.com/business/road-to-the-igf-cavanagh-houston-dobbe-s-i-dicey-dungeons-i-)
- Each class is an answer to "how do you introduce uncertainty into each run, to keep the plays you make from round to round interesting?" Examples: Warrior rerolls, Thief's dice-splitting lockpick, Robot's "push-your-luck blackjack style mechanic for getting more dice". — [Game Developer, Road to the IGF](https://www.gamedeveloper.com/business/road-to-the-igf-cavanagh-houston-dobbe-s-i-dicey-dungeons-i-)
- Witch: a magic-square class version failed. He considered random numbers every turn for "a little bit of unpredictability, but it wasn't fun." — [Game Developer, "Witch-craft: How Dicey Dungeons balances chance and predictability"](https://www.gamedeveloper.com/design/witch-craft-how-i-dicey-dungeons-i-balances-chance-and-predictability)
- Each character plays six episodes (rule variants) rather than one random map. — [Punished Backlog review](https://punishedbacklog.com/dicey-dungeons-review/) (secondary)

### Inferences
- This is the most directly relevant source for Dungeon Scramble, a dice game with loot dice. Keep **one** primary randomness layer (the dice/tray). Make the other layers (relics, enemy kits) more predictable so player skill shows. Dungeon Scramble already moves this way with telegraphed boss kits and Swap/Reroll tray actions, which, like the Warrior's reroll, give the player control over randomness.

### Gaps
- No verified Cavanagh quote on whether overpowered equipment was tolerated, or on how episode difficulty was tuned.

---

## Q5. Monster Train (Shiny Shoe): Covenants, clan balance, broken combos

### Takeaway
This is the clearest primary statement in this set. Shiny Shoe explicitly does not aim for "perfect" balance or the removal of super-powered combos. The goal is diverse end-game depth, tuned mainly by adjusting scaling values so cards stay viable across all 25 Covenant ranks. Analytics still drive nerfs of true outliers.

### Cited Findings
- Wild Mutations update notes (2020): the goal "isn't some type of 'perfect' balance where all cards are used with similar frequency or there aren't super powered combos". The goal is "to make sure the end-game depth is as diverse as possible", mainly by adjusting scaling values so cards remain viable at all covenant levels. — [Monster Train Steam announcements (2020)](https://store.steampowered.com/news/posts/?feed=steam_community_announcements&appids=1102190&enddate=1598377452) (search excerpt)
- CEO Mark Cooke: some cards were nerfed repeatedly, and gameplay analytics drive balance decisions. Example: Hellhorned's Onehorn's Tome "costs five Ember, I think it started at three". He also talks about designing for "poggable moments". — [ScreenRant interview (c. 2022–23)](https://screenrant.com/inkbound-monster-train-mark-cooke-interview/)
- Monster Train 2 Q&A: most clans have a similar win rate despite how varied their playstyles are. — [PC Gamer (2025)](https://www.pcgamer.com/games/monster-train-2-lost-arsenal-update/)
- Covenants: 25 levels, the main difficulty-tuning tool. — [Seasoned Gaming review (2021)](https://seasonedgaming.com/2021/03/30/review-monster-train-can-you-keep-hell-from-freezing-over/) (secondary)

### Inferences
- Shiny Shoe tunes at the *faction (clan) win-rate* level and leaves *combo power* alone. Outliers get nerfed when they are cheap and universal (a 3-cost Tome went up to 5), not when they are the payoff of a committed build. Dungeon Scramble's harness could likewise track win rate per origin/class combination (the factions) rather than chase individual dice.
- "Poggable moments" (the spectacular, shareable turn) is an explicit design target.

### Gaps
- No verified quote on infinite combos specifically.

---

## Q6. Spelunky, Into the Breach, Luck be a Landlord, Vampire Survivors, Risk of Rain 2, Isaac, Hades II

### Takeaway
Two camps. The "spectacle" games (Vampire Survivors, partly Risk of Rain and Isaac) openly say balance is secondary to fun in single-player. The "puzzle/fairness" games (Into the Breach, Spelunky) put fairness and readability first: telegraphed threats, guaranteed solvable levels. Luck be a Landlord adds a key caution: making the game easier by buffing the starter can kill choice.

### Cited Findings
- **Vampire Survivors / poncle (Luca Galante):** "It's absolutely not balance; balance is completely out of the window. I just want to make stuff that is fun." On the Castlevania DLC's different power scaling: "It's still crazy, still unbalanced, but different for sure." — [Pocket Tactics interview (2024)](https://www.pockettactics.com/vampire-survivors/interview). "I don't care for balance that much: it's a singleplayer game." — [PC Gamer](https://www.pcgamer.com/vampire-survivors-creator-didnt-have-a-vision-when-he-started-making-the-game-that-allowed-him-to-quit-his-job/)
- **Into the Breach / Subset Games:** Matthew Davis gave the GDC 2019 talk "'Into the Breach' Design Postmortem", covering early drafts through final balancing, cut features, and "the right difficulty and how much RNG should you use?" — [GDC Vault](https://gdcvault.com/play/1025772/-Into-the-Breach-Design); [Subset tweet announcing talk (2019)](https://x.com/subsetgames/status/1108394040322461697). Subset's own store copy: "All enemy attacks are telegraphed in minimalistic, turn-based combat." — quoted in [Wikipedia](https://en.wikipedia.org/wiki/Into_the_Breach). Apart from a small chance for attacks to miss the Power Grid, the game has essentially no RNG. Telegraphing Vek movement also sped up the pace alongside the short turn limit. — [80.lv GDC 2019 writeup](https://80.lv/articles/gdc-2019-an-inside-look-at-into-the-breach) (excerpt)
- **Spelunky / Derek Yu (Boss Fight Books, 2016):** the book covers "randomization, challenge, indifferent game worlds, player feedback" and finishing a game. — [Boss Fight Books via Goodreads](https://www.goodreads.com/book/show/26152638-spelunky). The level generator guarantees a route from start to finish using only built-in movement. — reader review (secondary), same page. See also [Game Developer, "How Spelunky got its procedural hook"](https://www.gamedeveloper.com/design/how-i-spelunky-i-got-its-procedural-hook-actually-got-finished)
- **Luck be a Landlord / TrampolineTales (Dan DiIorio), "Big Buffs Update" devlog:** "Making the game effectively easier while not making it less fun can be a tough thing to do. For example, if the Cherry symbol that you start with gave 20 coins instead of 1 coin, the game would be a lot easier. However, it would be less fun since you wouldn't have any reason to take other symbols." The v1.1 patch notes were to explain every balance change. — [TrampolineTales blog](https://blog.trampolinetales.com/the-big-buffs-update-preview/)
- **Risk of Rain 2 / Hopoo:** Development Thoughts #16: they didn't want to "pollute" the standard item pool with synergy-dependent items. Lunar, Equipment and Boss-drop categories "struck the right balance between being chase items and being core items." — [Steam announcement (2020)](https://steamcommunity.com/games/632360/announcements/detail/2740955655376700578). Most items stack linearly; some stack hyperbolically to avoid invulnerability or permanent stun. — [RoR2 wiki](https://riskofrain2.fandom.com/wiki/Item_Stacking) (community, not developer)
- **Binding of Isaac / Edmund McMillen:** McMillen reportedly said the Repentance meta's difficulty is meant to push players toward new ways of completing runs. — [GameRant listicle](https://gamerant.com/binding-isaac-broken-new-items-repentance/) (secondary; primary not found)

### Inferences
- Galante's "it's a singleplayer game" and Giovannetti's "Single Player + Rogue-like" advantage are the same argument: in single-player, a player-power outlier has no victim.
- Luck be a Landlord shows the limit of that argument. A *universal* outlier, one that is strong with no commitment (a 20-coin starter Cherry, a 3-cost Tome), removes choice and gets fixed. A *committed* outlier, one that pays off a build, is the reward.
- Hopoo's approach: keep the common pool clean and put spiky, build-defining items in separate, rarer pools (Lunar, Boss). This maps onto Dungeon Scramble's loot dice and relics: busted effects belong behind rarity or a cost.

### Gaps
- No primary Derek Yu quote on fairness or items retrieved (book text not accessible).
- No primary Into the Breach quote on "perfect information". The often-cited claim that Davis designed enemies to show exactly what they will do so that every loss is the player's fault is **[UNVERIFIED]** here.
- No verified primary McMillen quote endorsing broken items.
- Hades II: not researched (out of call budget). **[GAP]**

---

## Q7. Common thread: are player-power outliers tolerated while enemy-power outliers are fixed?

### Takeaway
Several developers explicitly tolerate player-power outliers in single-player: Giovannetti (2019), Galante, Shiny Shoe ("not... no super powered combos"), and LocalThunk's "watch it run" payoff. On the enemy side, the fairness games (Into the Breach, Dicey Dungeons, StS2's elite nerfs) visibly fix or telegraph enemies. No source found states the asymmetry *as a rule*. It is an inference from the pattern, so present it to Jeremy as a pattern, not a quote.

### Cited Findings
- Single-player lets rare overpowered combos exist without harming others. — [Giovannetti GDC 2019 via Podwise](https://podwise.ai/episodes/1459444); "Single Player + Rogue-like" listed as a balance advantage — [slides](https://media.gdcvault.com/gdc2019/presentations/Giovannetti_Anthony_SlayTheSpire.pdf)
- "I don't care for balance that much: it's a singleplayer game." — [PC Gamer, Galante](https://www.pcgamer.com/vampire-survivors-creator-didnt-have-a-vision-when-he-started-making-the-game-that-allowed-him-to-quit-his-job/)
- Not aiming for a balance "where... there aren't super powered combos". — [Shiny Shoe, Monster Train Steam notes 2020](https://store.steampowered.com/news/posts/?feed=steam_community_announcements&appids=1102190&enddate=1598377452)
- Enemy-side fixes: StS2 0.106.0 gave the Skulking Colony elite a "relatively sizeable nerf". — [Kotaku 2026](https://kotaku.com/slay-the-spire-2-patch-update-nerfs-buffs-elite-tainted-aeonglass-wither-2000698644). "All enemy attacks are telegraphed". — [Into the Breach, via Wikipedia](https://en.wikipedia.org/wiki/Into_the_Breach)
- Counterpoint: player outliers do get nerfed when they are universal or cheap: Monster Train's Onehorn's Tome — [ScreenRant](https://screenrant.com/inkbound-monster-train-mark-cooke-interview/); StS2 infinites — [PCGamesN 2026](https://www.pcgamesn.com/slay-the-spire-2/patch-notes-infinites-nerfed); the LBaL starter-Cherry logic — [TrampolineTales](https://blog.trampolinetales.com/the-big-buffs-update-preview/). Nerfing beloved outliers after players attach to them causes backlash and reversals. — [games.gg 2026](https://games.gg/news/slay-the-spire-2-dev-rolls-back-nerfs-after-review-bombing/)

### Inferences
- Working rule supported by the sources, for Dungeon Scramble:
  - (a) Player-power outliers that come from *commitment and build-craft* (a rare loot die plus relic synergy) are celebrated. Leave them, or gate them behind rarity or depth.
  - (b) Outliers that are *universal or free* (strong at no cost, always picked) get tuned, because they remove choice.
  - (c) Enemy power should be *readable* more than *capped*. Telegraph it (as the boss `herald` / next-turn chips already do) and fix the spikes that cannot be read or answered.
  - (d) Use the depth system (Ascension/Covenant/Heat analogue) to raise the ceiling instead of nerfing the floor.
  - (e) Prefer buffs over nerfs once players have seen a strong option.
- Metric to borrow (Mega Crit / Shiny Shoe): pick rate together with win rate per item, and win rate per faction/class. Treat any single metric with suspicion (Giovannetti's warning).

### Gaps
- No developer was found stating the asymmetry ("we let players be broken but not enemies") as an explicit principle. This remains an inference.
- Not covered for lack of budget: Hades II, Inscryption, Wildfrost, Cobalt Core, Peglin, Backpack Hero.
