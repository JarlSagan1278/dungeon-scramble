# Design-consistency audit and quest-text rewrite (proposal)

Oct 17, 2026 · build 1.41.54 · **a proposal only: nothing in src/ was changed and nothing was committed.**

Screenshots (395x769, 2x): `/tmp/claude-0/-home-user-dungeon-scramble/c644f6f1-0587-59f4-8d1e-2451d8bd872d/scratchpad/shots/` (`01_title.png` … `34_floor_card.png`; quest papers as they are now: `paper_now_*.png`; with the proposed wording: `paper_new_*.png`). Scripts and raw numbers sit next to them in `/tmp/claude-0/-home-user-dungeon-scramble/c644f6f1-0587-59f4-8d1e-2451d8bd872d/scratchpad/` (`shots.js`, `audit.json`, `qh.js` = quest bot, `qs_agg.json`).

## Summary

**Quests:** 74 quests on 42 cards. All of them are checked **inside one turn (one path)** except "survive", "Bank Block" and the two Geometry rules, but the paper never says so. **6 papers say something the code doesn't do** (wrong round, wrong reward type, faces read as amounts), **21 quests are near-impossible** (bot found a way in under 10% of fights, or no starting die can do it), **11 are free** (98-100%, usually on turn 1), **21 rewards show a bigger number than they can pay** because of the Quest Health cap, and 6 quests are word-for-word duplicates. A consistent wording fits the 108px paper on one line for every quest (checked in the real game), and the tallest sign gets *shorter* (104px → 93px) even with a new "in one turn" line.

**Design:** 26 inconsistencies. Most visible: rows of same-coloured buttons (title, Settings, camp), the game-over/victory screens growing past 769px, monsters covering quest rewards, and the Settings window hiding its last three buttons below a scroll.

### Top 10 fixes
1. **Add "in one turn" under QUESTS** on the paper, and reword every quest to two patterns: counts ("3 Maneuvers", "2 Heal dice") and thresholds ("Damage 10+", "Path 6+", "Block 5+", "Blanks 10+"), plus "Reach Rd 5" for survive quests. (Part 1 table.)
2. **Make rewards pay what the paper says.** 21 quests can be cut by the Quest Health cap (Heating Elemental shows 35, pays 25; Rusty Golem 16 → 8; third trap quests often pay 0). Option B below: drop the cap.
3. **Fix the survive quests' round:** "Survive to turn 4" completes on Rd 5 (Rusty Golem), "turn 5" on Rd 6 (Heating Elemental). Word them by the round bubble ("Reach Rd N") and pick N.
4. **Replace or soften the near-impossible quests:** Amanitabomination, Half-life Host, Roudy Rinotter (2 Heal dice), Biomancer (3 H.O.T. / 5 D.O.T. faces), Oilephant's Foot, the 6-Maneuver line on all three Big Bosses.
5. **Title screen + Settings: give each button its own colour** (Codex, Records, How to Play, Log, Export are all the same tan, stacked).
6. **Game over and Victory scroll** (973px and 991px tall). Fold "Run Summary" into the run card or make it a tab so the screen fits 769.
7. **Settings window scrolls:** Abandon Run, Reset Progress and Close sit below the fold. Two columns of small buttons, or move Log/How to Play into the Codex.
8. **Monsters hide quest rewards** on Self-Replicating Forge, Bio-Mutant Escape, The Strike/Break-er and Myceleus. Keep the reward column clear of the monster (shift the paper left ~12px or nudge those monsters right).
9. **Geometry quests show a damage badge 10** but give D.O.T./H.O.T.; show the D.O.T./H.O.T. icon.
10. **Camp "Train" says "No sets of 3 yet"** when you have 8 Attack I dice: the real block is an empty Back Pocket. Say "Needs 2 spare dice in your Pocket". Same camp: the confirm's Rest button is gold but the campfire Rest is green (and Train purple → gold); match them.

---

## Part 1: Quest text

### How quests really work (from the code)
- `checkQuests()` (logic.js) runs **once, after your path finishes**, using that path's counts only. Nothing adds up across the fight. So "2 Dodge" means two Dodge faces in the same path.
- Counts are **faces**, not amounts: "2 Block" = two Block faces, not 2 Block points; "5 dot" = five D.O.T. faces.
- "Damage" = the damage your path deals before the enemy's Shield (relic bonuses included). Quest reward damage itself **can be soaked by the enemy's Shield**.
- "Blanks" = blank cells left **outside** your path, and Minions and used Swap/Reroll dice count as blanks.
- "Survive N" completes when you press Go while the turn counter is N, which the round bubble shows as **Rd N+1**. "Survive 2" = "Survive 2 turns" is right; "Survive to turn 4" is one round late.
- "Accumulate 5 Block" (paper: "Bank 5 Block") = your Block total after the path, including Block left from earlier turns.
- **Quest Health** caps the total quest damage a card can take in the whole fight. The first quests finished pay in full; later ones get what is left (often 0).
- **Freeze rewards** skip the whole turn of a regular enemy, but on a boss they cancel only its special (the base attack still hits), and on an elite's heavy turn only the "heavy" part.
- **Geometry** quests are passive mirrors (Oct 12 decision): Profane = your H.O.T. gain also lands as D.O.T. on it; Sacred = its D.O.T. also gives you H.O.T. The number (10) is a cap on the mirrored amount, not damage.

### Proposed wording rules
- A line under QUESTS: *in one turn* (8px italic). Geometry papers skip it (they are all-fight rules).
- **Counts** of faces in your path: "N Things", plural, no plus: `3 Maneuvers`, `2 Dodges`, `2 Leaps`, `3 Pivots`, `3 Boosts`, `3 Combos`, `4 Support`, `2 Nullify`. For faces that carry a number (Heal, Block) add "dice" so it can't be read as an amount: `2 Heal dice`, `2 Block dice`.
- **Thresholds**, noun first with "+": `Damage 10+`, `Path 6+` (path length), `Path 1-3`, `Block 5+` (your Block total), `Blanks 10+`.
- **Rounds:** `Reach Rd 5`, matching the "F2 · Rd 5" bubble on the tray.
- **Reward badge** always shows the icon of what you get (Hit, D.O.T., H.O.T., Nullify, Freeze) and the number it will really pay.
- Every proposed line fits on one line of the 108px paper (tested in the game at 395px). The tallest paper becomes 93px (today 104px, Strike/Break-er), so the "tallest sign stays on the wall" rule holds.
- Long-press tooltip and the Codex Key should spell out the rules above ("Support = Heal, H.O.T. and Block dice", "Blanks outside your path; Minions count").

### Reward cap: pick one
- **Option A (keep today's balance):** lower the paper numbers so a card's quests add up to its Quest Health, e.g. Displacer Lair 5/5/5, Heating Elemental 25, Rusty Golem 8, Fungal Flayer 10.
- **Option B (recommended, simplest and honest):** drop Quest Health; every quest pays what it says. This only helps the player (fits the Oct 13 balance philosophy: strong player pieces are fine). Traps get a little easier. A quick bot study can measure it before shipping.

### Code changes the rewrite needs (small, for Jeremy to approve)
1. Paper text: a new `questCondShort` (render.js) producing the patterns above, plus the "in one turn" line. No data change needed for the wording.
2. Geometry reward badge: show D.O.T. (Profane) / H.O.T. (Sacred) instead of Hit.
3. Survive quests: decide the round. Either keep the code and print Rd N+1 (proposal column), or change the check to "Rd N" (turnNumber >= N-1) and keep the numbers Jeremy wrote.
4. Biomancer: count H.O.T. gained / D.O.T. dealt (amounts) instead of faces, so "H.O.T. 3+" and "D.O.T. 5+" mean amounts.
5. Option A or B for the cap.

### Bot numbers: how to read them
"Bot could do it" = in what share of fights against that card a search of the real tray (up to 6,000 paths per turn) found a path that completes the quest on some turn. 640 runs, 16 origin x class combos x 40, depth 0, skill 1500. It does not aim for quests, so a player who chases them does better on easy ones, but a low number means the dice to do it were rarely there. **Caveat:** by Floor 3 the bot has swapped every Maneuver die for loot (checked: 0 Maneuver dice in 6 of 7 trays), so Floor 3 Maneuver numbers are pessimistic. Real players shed them too (tester: Maneuver Die I replaced in 20 of 30 equips), so the problem is real, just smaller.

### Starting-tray facts behind the "impossible" flags
Starting tray = 8 Attack I, 7 Maneuver I, 1 origin die. Only the origin die has Heal, Block, H.O.T., Nullify or Boost faces, and it shows one face per roll. So **2 Heal / 2 Block / 2 Nullify / 3 H.O.T. / 3 Boosts in one path are impossible with the starting tray** (Guard's Skill can add one Block). Pivots: only the Dwarf die has one. 10+ blanks: about 5% of rolls (more as Minions pile up).

### Duplicates
- "3 Maneuvers → 5": Wooden Golem and Unbound Automa (easy and elite get the same quest).
- "2 Dodges → 5": Beaker Breakers and Untamed Unicrows. "2 Leaps → 5": Grafted Grifter and Rabbid Rabbats.
- "6 Maneuvers → 30": all three Big Bosses (and ~0% for all of them).
- "Damage 10+/15+ → D.O.T. 8": Grosteque Grafter and Ceramic Golem.
- "3 Maneuvers" in some form is on 9 cards. Suggest giving the easy enemies and their elite twins different quests so each monster feels like itself.

### Also found
- **Rigged Sporks and Unauthorized Transfusion never appear** (0 of 640 runs): Floor 1's only easy room is the first room, which never holds a trap. Either make them standard or allow traps in room 1.
- Wording style today is mixed: "2 heals" / "2 heal", "3 leaps" / "2 leap", "dmg" vs "damage", "10+ dmg/turn" vs "15+ dmg" (same rule), "HOT = DOT" without dots.

## The full table
Reward shown as icon + number (dmg = Hit icon). "(pays N if done 2nd)" = what the Quest Health cap really pays if the earlier quests on the card were finished first.

### Floor 1

| Encounter | Data string | Paper now | What the code checks | Proposed paper | Bot could do it | Flag |
|---|---|---|---|---|---|---|
| Wooden Golem (Enemy, easy) | `5 damage: 3 maneuvers` | 3 Maneuvers → dmg 5 | Dodge+Leap+Pivot faces in one path | **3 Maneuvers → dmg 5** | 99% (n=174) | Duplicate of Unbound Automa (same quest, same reward). |
| Unbound Automa (Enemy, elite) | `5 damage: 3 maneuvers` | 3 Maneuvers → dmg 5 | Dodge+Leap+Pivot faces in one path | **3 Maneuvers → dmg 5** | 90% (n=333) |  |
| Beaker Breakers (Enemy, easy) | `5 damage: 2 dodge` | 2 Dodge → dmg 5 | Dodge faces in one path | **2 Dodges → dmg 5** | 99% (n=161) | Duplicate of Untamed Unicrows. |
| Amanitabomination (Enemy, elite) | `5 damage: 2 heals` | 2 Heals → dmg 5 | Heal faces in one path (not H.O.T., not Leech) | **2 Heal dice → dmg 5** | 1% (n=335) | NEARLY IMPOSSIBLE on Floor 1: no starting die can show 2 Heal faces at once (needs Healing Draught-type loot). Bot 1%. |
| Grafted Grifter (Enemy, standard) | `5 damage: 2 leap` | 2 Leap → dmg 5 | Leap faces in one path | **2 Leaps → dmg 5** | 87% (n=150) | Duplicate of Rabbid Rabbats. |
| Untamed Unicrows (Enemy, standard) | `5 damage: 2 dodge` | 2 Dodge → dmg 5 | Dodge faces in one path | **2 Dodges → dmg 5** | 86% (n=154) |  |
| Prickly Porcupanther (Enemy, deadly) | `5 damage: 2 block` | 2 Block → dmg 5 | Block faces in one path (not Block points) | **2 Block dice → dmg 5** | not drawn | NEARLY IMPOSSIBLE: no starting tray has 2 Block faces (Dwarf die + Guard Skill is the only way). Only appears with Dread. |
| Displacer Lair (Trap, standard) | `10 damage: any 6 actions` | 6 Actions → dmg 10 | path length (dice in the path) | **Path 6+ → dmg 10** | 100% (n=156) | Basically free (100%). |
| Displacer Lair | `10 damage: any 8 actions` | 8 Actions → dmg 10 (pays 5 if done 2nd) | path length (dice in the path) | **Path 8+ → dmg 10** | 96% (n=156) |  |
| Displacer Lair | `10 damage: any 10 actions` | 10 Actions → dmg 10 (pays 0 if done 3rd) | path length (dice in the path) | **Path 10+ → dmg 10** | 67% (n=156) | Pays 0 if the other two are done first (cap 15). |
| Rigged Sporks (Trap, easy) | `10 damage: 4 maneuvers` | 4 Maneuvers → dmg 10 | Dodge+Leap+Pivot faces in one path | **4 Maneuvers → dmg 10** | not drawn | Never drawn in 640 bot runs: Floor 1 easy traps can only fill the first room, which bans traps. Dead content. |
| Rigged Sporks | `10 damage: 2 leap` | 2 Leap → dmg 10 (pays 5 if done 2nd) | Leap faces in one path | **2 Leaps → dmg 10** | not drawn | Never drawn in 640 bot runs: Floor 1 easy traps can only fill the first room, which bans traps. Dead content. |
| Rigged Sporks | `10 damage: 2 dodge` | 2 Dodge → dmg 10 (pays 0 if done 3rd) | Dodge faces in one path | **2 Dodges → dmg 10** | not drawn | Never drawn in 640 bot runs: Floor 1 easy traps can only fill the first room, which bans traps. Dead content. |
| Unauthorized Transfusion (Trap, easy) | `10 damage: 3 maneuvers` | 3 Maneuvers → dmg 10 | Dodge+Leap+Pivot faces in one path | **3 Maneuvers → dmg 10** | not drawn | Never drawn (same reason). "2 Block dice" also near-impossible on Floor 1. |
| Unauthorized Transfusion | `10 damage: 2 block` | 2 Block → dmg 10 (pays 5 if done 2nd) | Block faces in one path (not Block points) | **2 Block dice → dmg 10** | not drawn | Never drawn (same reason). "2 Block dice" also near-impossible on Floor 1. |
| Unauthorized Transfusion | `1 nullify: 8 damage/turn` | 8+ dmg → Nullify | damage your one path deals (before enemy Shield) | **Damage 8+ → Nullify** | not drawn | Never drawn (same reason). "2 Block dice" also near-impossible on Floor 1. |
| Leper Con-Trap (Trap, elite) | `10 damage: 3 maneuvers` | 3 Maneuvers → dmg 10 | Dodge+Leap+Pivot faces in one path | **3 Maneuvers → dmg 10** | 94% (n=281) |  |
| Leper Con-Trap | `20 damage: 10 blanks` | 10 Blanks → dmg 20 (pays 5 if done 2nd) | blank cells left OUTSIDE your path (Minions and used Swap/Reroll dice count) | **Blanks 10+ → dmg 20** | 14% (n=281) | Paper says 20, pays 5 if another quest finished first. 10 blanks: rare (bot 14%). |
| Leper Con-Trap | `1 nullify: 8 damage/turn` | 8+ dmg → Nullify | damage your one path deals (before enemy Shield) | **Damage 8+ → Nullify** | 85% (n=281) |  |
| Heating Elemental (Boss) | `35 damage: survive to turn 5` | Survive to turn 5 → dmg 35 (pays 25 if done 1st) | you press Go on that round (turn counter >= N, i.e. Rd N+1) | **Reach Rd 6 → dmg 35** | 10% (n=201) | TEXT ≠ CODE: completes on Rd 6, not turn 5. Paper says 35, pays 25 (Quest Health cap). Fight rarely lasts that long (10%). |
| Grosteque Grafter (Boss) | `8 dot: deal 10+ damage in a single round` | 10+ dmg/turn → D.O.T. 8 | damage your one path deals (before enemy Shield) | **Damage 10+ → D.O.T. 8** | 95% (n=213) | Same rule as Ceramic Golem row 1 but drawn as "10+ dmg/turn" while others say "15+ dmg". |

### Floor 2

| Encounter | Data string | Paper now | What the code checks | Proposed paper | Bot could do it | Flag |
|---|---|---|---|---|---|---|
| Rusty Golem (Enemy, elite) | `16 damage: survive turn 4` | Survive to turn 4 → dmg 16 (pays 8 if done 1st) | you press Go on that round (turn counter >= N, i.e. Rd N+1) | **Reach Rd 5 → dmg 16** | 0% (n=221) | TEXT ≠ CODE: completes on Rd 5 (paper says turn 4). Paper says 16, pays 8. Bot never got there (0%). |
| The Warcart (Enemy, easy) | `8 damage: 4 maneuvers` | 4 Maneuvers → dmg 8 | Dodge+Leap+Pivot faces in one path | **4 Maneuvers → dmg 8** | 42% (n=45) |  |
| Half-life Host (Enemy, elite) | `8 damage: 2 heal` | 2 Heal → dmg 8 | Heal faces in one path (not H.O.T., not Leech) | **2 Heal dice → dmg 8** | 5% (n=194) | NEARLY IMPOSSIBLE without Heal loot (bot 5%; Dwarf 0%). |
| Fungal Flayer (Enemy, elite) | `16 damage: accumulate 5 block` | Bank 5 Block → dmg 16 (pays 10 if done 1st) | your Block total after your path | **Block 5+ → dmg 16** | 21% (n=205) | Paper says 16, pays 10. |
| Rabbid Rabbats (Enemy, easy) | `5 damage: 2 leap` | 2 Leap → dmg 5 | Leap faces in one path | **2 Leaps → dmg 5** | 69% (n=45) |  |
| Roudy Rinotter (Enemy, easy) | `5 damage: 2 heal` | 2 Heal → dmg 5 | Heal faces in one path (not H.O.T., not Leech) | **2 Heal dice → dmg 5** | 6% (n=50) | NEARLY IMPOSSIBLE without Heal loot (bot 6%). |
| Whence Wolf (Enemy, deadly) | `10 damage: 3 maneuvers` | 3 Maneuvers → dmg 10 | Dodge+Leap+Pivot faces in one path | **3 Maneuvers → dmg 10** | 42% (n=92) |  |
| Adhesive Pest Traps (Trap, easy) | `15 damage: 3 maneuvers` | 3 Maneuvers → dmg 15 | Dodge+Leap+Pivot faces in one path | **3 Maneuvers → dmg 15** | 68% (n=47) |  |
| Adhesive Pest Traps | `15 damage: 4 maneuvers` | 4 Maneuvers → dmg 15 (pays 5 if done 2nd) | Dodge+Leap+Pivot faces in one path | **4 Maneuvers → dmg 15** | 49% (n=47) |  |
| Adhesive Pest Traps | `15 damage: 5 maneuvers` | 5 Maneuvers → dmg 15 (pays 0 if done 3rd) | Dodge+Leap+Pivot faces in one path | **5 Maneuvers → dmg 15** | 19% (n=47) | Pays 0 after the other two. |
| Ditched Heist (Trap, standard) | `15 damage: any 8 actions` | 8 Actions → dmg 15 | path length (dice in the path) | **Path 8+ → dmg 15** | 98% (n=182) |  |
| Ditched Heist | `15 damage: any 3 or fewer actions` | ≤3 Actions → dmg 15 (pays 5 if done 2nd) | path of 1 to 3 dice | **Path 1-3 → dmg 15** | 100% (n=182) | FREE: any 1-3 dice path (100%). |
| Ditched Heist | `20 damage: 8 blanks` | 8 Blanks → dmg 20 (pays 0 if done 3rd) | blank cells left OUTSIDE your path (Minions and used Swap/Reroll dice count) | **Blanks 8+ → dmg 20** | 20% (n=182) | Pays 0 after the other two (cap 20). |
| Unventilated Workshop (Trap, easy) | `15 damage: 2 block` | 2 Block → dmg 15 | Block faces in one path (not Block points) | **2 Block dice → dmg 15** | 12% (n=59) | Rare (12%; Pixie 0%). |
| Unventilated Workshop | `15 damage: 4 maneuvers` | 4 Maneuvers → dmg 15 (pays 5 if done 2nd) | Dodge+Leap+Pivot faces in one path | **4 Maneuvers → dmg 15** | 51% (n=59) |  |
| Unventilated Workshop | `nullify: 12+ damage` | 12+ dmg → Nullify | damage your one path deals (before enemy Shield) | **Damage 12+ → Nullify** | 86% (n=59) |  |
| The Strike/Break-er (Trap, deadly) | `5 damage: survive 2` | Survive 2 turns → dmg 5 | you press Go on that round (turn counter >= N, i.e. Rd N+1) | **Reach Rd 3 → dmg 5** | 71% (n=55) |  |
| The Strike/Break-er | `10 damage: survive 4` | Survive 4 turns → dmg 10 | you press Go on that round (turn counter >= N, i.e. Rd N+1) | **Reach Rd 5 → dmg 10** | 4% (n=55) | Rare (4%). |
| The Strike/Break-er | `15 damage: survive 6` | Survive 6 turns → dmg 15 (pays 5 if done 3rd) | you press Go on that round (turn counter >= N, i.e. Rd N+1) | **Reach Rd 7 → dmg 15** | 0% (n=55) | Pays 5, not 15. Fight never lasts to Rd 7 (0%). |
| The Necrorancher (Boss) | `nullify: deal 12 damage in a single turn` | 12+ dmg/turn → Nullify | damage your one path deals (before enemy Shield) | **Damage 12+ → Nullify** | 100% (n=171) | FREE on Floor 2 (100%, turn 1). |
| Bellicose Biomancer (Boss) | `20 damage: 3 hot` | 3 H.O.T. → dmg 20 | H.O.T. faces in one path (not the amount) | **H.O.T. 3+ → dmg 20** | 0% (n=190) | TEXT MISLEADS: reads as 3 H.O.T. (amount) but needs 3 H.O.T. FACES in one path. 0%. Suggest counting the amount (code change). |
| Bellicose Biomancer | `20 damage: 5 dot` | 5 D.O.T. → dmg 20 (pays 5 if done 2nd) | D.O.T. faces in one path (not the amount) | **D.O.T. 5+ → dmg 20** | 0% (n=190) | TEXT MISLEADS + IMPOSSIBLE: 5 D.O.T. faces in one path (0%). Paper says 20, pays 5. Suggest "deal 5+ D.O.T." (code change). |
| Ceramic Golem (Boss) | `8 dot: deal 15+ damage in a single round` | 15+ dmg/turn → D.O.T. 8 | damage your one path deals (before enemy Shield) | **Damage 15+ → D.O.T. 8** | 97% (n=198) |  |
| Ceramic Golem | `30 damage: 5 maneuvers` | 5 Maneuvers → dmg 30 | Dodge+Leap+Pivot faces in one path | **5 Maneuvers → dmg 30** | 2% (n=198) | Rare (2%). |

### Floor 3

| Encounter | Data string | Paper now | What the code checks | Proposed paper | Bot could do it | Flag |
|---|---|---|---|---|---|---|
| Chimeric Sludge (Enemy, standard) | `12 damage: 4 maneuvers` | 4 Maneuvers → dmg 12 | Dodge+Leap+Pivot faces in one path | **4 Maneuvers → dmg 12** | 0% (n=118) | 0% for the bot on Floor 3 (see caveat: bot sheds Maneuver dice). |
| Gnome Chomper (Enemy, elite) | `6 damage: 3 maneuvers` | 3 Maneuvers → dmg 6 | Dodge+Leap+Pivot faces in one path | **3 Maneuvers → dmg 6** | 10% (n=131) | 10% (bot caveat). |
| Oilephant's Foot (Enemy, easy) | `15 damage: 4 support actions` | 4 Support → dmg 15 | path length (dice in the path) | **4 Support → dmg 15** | 2% (n=58) | Nearly impossible (2%). "Support" is only defined in the Codex Key. |
| Extractnid Matriarch (Enemy, standard) | `nullify: 10+ damage` | 10+ dmg → Nullify | damage your one path deals (before enemy Shield) | **Damage 10+ → Nullify** | 100% (n=140) | FREE on Floor 3 (100%). |
| Profane Geometry (Enemy, standard) | `10 damage: adventurer H.O.T. = D.O.T.` | HOT = DOT → dmg 10 | passive: every H.O.T. you gain also lands as D.O.T. on it (cap 10) | **[H.O.T. icon] → [D.O.T. icon] → D.O.T. 10** | n/a (passive) | TEXT ≠ CODE: paper shows a damage badge 10; real reward is up to 10 D.O.T. on it. Leech H.O.T. counts too. |
| Sacred(?) Geometry (Enemy, elite) | `10 damage: encounter D.O.T. = H.O.T.` | Foe DOT = HOT → dmg 10 | passive: every D.O.T. it takes also gives you H.O.T. (cap 10) | **[D.O.T. icon] → [H.O.T. icon] → H.O.T. 10** | n/a (passive) | TEXT ≠ CODE: paper shows a damage badge 10; real reward is up to 10 H.O.T. for you (your H.O.T. still caps at 6). |
| Eelagator Escapee (Enemy, deadly) | `10 damage: 2 nullify` | 2 Nullify → dmg 10 | Nullify faces in one path | **2 Nullify → dmg 10** | 10% (n=48) | Rare (10%; Gnome 0%). |
| Toadtaur Warrior (Enemy, elite) | `8 damage: 3 maneuvers` | 3 Maneuvers → dmg 8 | Dodge+Leap+Pivot faces in one path | **3 Maneuvers → dmg 8** | 16% (n=136) | 16% (bot caveat). |
| Anti-Euclidian Space (Trap, elite) | `10 damage: any 10 actions` | 10 Actions → dmg 10 | path length (dice in the path) | **Path 10+ → dmg 10** | 94% (n=109) |  |
| Anti-Euclidian Space | `15 damage: any 12 actions` | 12 Actions → dmg 15 | path length (dice in the path) | **Path 12+ → dmg 15** | 86% (n=109) |  |
| Anti-Euclidian Space | `20 damage: any 15 actions` | 15 Actions → dmg 20 (pays 5 if done 3rd) | path length (dice in the path) | **Path 15+ → dmg 20** | 24% (n=109) | Pays 5, not 20, if done last. |
| Ergot Eruption (Trap, standard) | `15 damage: 4 maneuvers` | 4 Maneuvers → dmg 15 | Dodge+Leap+Pivot faces in one path | **4 Maneuvers → dmg 15** | 3% (n=133) | 3%. |
| Ergot Eruption | `20 damage: 3 pivot` | 3 Pivot → dmg 20 (pays 15 if done 2nd) | Pivot faces in one path | **3 Pivots → dmg 20** | 1% (n=133) | 1%; pays 15 not 20 if done 2nd. |
| Ergot Eruption | `3 hot: 15+ damage` | 15+ dmg → H.O.T. 3 | damage your one path deals (before enemy Shield) | **Damage 15+ → H.O.T. 3** | 99% (n=133) |  |
| Self-Replicating Forge (Trap, deadly) | `15 damage: 4 maneuvers` | 4 Maneuvers → dmg 15 | Dodge+Leap+Pivot faces in one path | **4 Maneuvers → dmg 15** | 0% (n=39) | 0%. Monster art hides rows 2-3 rewards. |
| Self-Replicating Forge | `20 damage: 3 boosts` | 3 Boosts → dmg 20 (pays 15 if done 2nd) | Boost faces in one path | **3 Boosts → dmg 20** | 23% (n=39) |  |
| Self-Replicating Forge | `1 freeze: 15+ damage` | 15+ dmg → Freeze | damage your one path deals (before enemy Shield) | **Damage 15+ → Freeze** | 95% (n=39) | Freeze on an enemy's heavy turn only cancels the heavy part. |
| Bio-Mutant Escape (Trap, elite) | `15 damage: 2 nullify` | 2 Nullify → dmg 15 | Nullify faces in one path | **2 Nullify → dmg 15** | 3% (n=89) | 3%. Monster art hides row 2 reward. |
| Bio-Mutant Escape | `20 damage: 4 support actions` | 4 Support → dmg 20 (pays 15 if done 2nd) | path length (dice in the path) | **4 Support → dmg 20** | 6% (n=89) | 6%; pays 15 not 20. |
| Bio-Mutant Escape | `20 damage: survive 4` | Survive 4 turns → dmg 20 (pays 0 if done 3rd) | you press Go on that round (turn counter >= N, i.e. Rd N+1) | **Reach Rd 5 → dmg 20** | 13% (n=89) | Pays 0 if done last (cap 30). |
| Extruzeon, Co-consul of Waste (Big Boss) | `30 damage: 3 boosts` | 3 Boosts → dmg 30 | Boost faces in one path | **3 Boosts → dmg 30** | 53% (n=143) |  |
| Extruzeon, Co-consul of Waste | `30 damage: 6 maneuvers in a single turn` | 6 Maneuvers → dmg 30 | Dodge+Leap+Pivot faces in one path | **6 Maneuvers → dmg 30** | 1% (n=143) | DUPLICATE on all 3 Big Bosses; ~0%. |
| Extruzeon, Co-consul of Waste | `freeze: 20+ damage` | 20+ dmg → Freeze | damage your one path deals (before enemy Shield) | **Damage 20+ → Freeze** | 100% (n=143) | FREE (100%). On a boss Freeze only cancels its special; base attack still hits. |
| Toadtaur Wizard, Assistant to the Co-consul (Big Boss) | `30 damage: 3 leaps` | 3 Leap → dmg 30 | Leap faces in one path | **3 Leaps → dmg 30** | 0% (n=106) | 0%. |
| Toadtaur Wizard, Assistant to the Co-consul | `30 damage: 6 maneuvers in a single turn` | 6 Maneuvers → dmg 30 | Dodge+Leap+Pivot faces in one path | **6 Maneuvers → dmg 30** | 0% (n=106) | Duplicate; 0%. |
| Toadtaur Wizard, Assistant to the Co-consul | `freeze: 15+ damage` | 15+ dmg → Freeze | damage your one path deals (before enemy Shield) | **Damage 15+ → Freeze** | 100% (n=106) | FREE (100%); boss Freeze is partial. |
| Myceleus, Co-consul of Rot (Big Boss) | `30 damage: 3 combos` | 3 Combos → dmg 30 | Combo faces in one path | **3 Combos → dmg 30** | 88% (n=118) |  |
| Myceleus, Co-consul of Rot | `30 damage: 6 maneuvers in a single turn` | 6 Maneuvers → dmg 30 | Dodge+Leap+Pivot faces in one path | **6 Maneuvers → dmg 30** | 0% (n=118) | Duplicate; 0%. Monster art hides rows 2-3 rewards. |
| Myceleus, Co-consul of Rot | `nullify: 15+ damage` | 15+ dmg → Nullify | damage your one path deals (before enemy Shield) | **Damage 15+ → Nullify** | 99% (n=118) | FREE (99%). |

---

## Part 2: Design consistency

Checked against your rules: chunky near-black outlines, dark-brown base with light-brown windows, never the same colour next to itself, each button its own colour, Metamorphous for titles and plain serif elsewhere, texture only on in-world things, and the 395x769 card never growing taller. Each screen was also scanned automatically for fonts, button colours, light borders and scrolling (`audit.json`).

**Good news first:** every in-run screen (fights, shrine, camp, loot, relic pick, all pop-ups) fits 395x769 with no page scroll and no sideways scroll. The fight screen, tray side rail (each button its own colour), Codex tabs and route bar follow the rules well. No room dressing is proposed below.

Ranked by how visible it is (1 = seen every run, many times).

| # | Screen (screenshot) | Element | What's off | Proposed fix |
|---|---|---|---|---|
| 1 | Title (`01_title`) | Codex / Records / How to Play | Three same-tan buttons stacked: breaks "each button its own colour" on the first screen anyone sees | Give each its own colour (e.g. Codex green, Records blue, How to Play violet, matching their Codex/Records tab colours) |
| 2 | Fight (`09_fight_bigboss`, `paper_now_*`) | Quest paper vs monster | The monster stands in front of the paper and hides rewards on Self-Replicating Forge (rows 2-3, incl. the Freeze reward), Bio-Mutant Escape (row 2), Strike/Break-er (all three), Myceleus (rows 2-3). Slight edge overlap on 8 more (Leper Con-Trap, Adhesive Pest Traps, Ditched Heist, Workshop, Extractnid, Anti-Euclidian, Ergot, Extruzeon) | Keep a clear strip for the reward column: move the paper ~12px left on these cards, or add per-monster right nudges on the Monster Footing page |
| 3 | Camp (`18_camp_before`, `21c_train_chosen`) | Upgrade rows + "?" buttons | "Attack I → II" and "Maneuver I → II" are the same colour stacked (dark brown before Train, both orange after), and both "?" buttons are the same tan | Colour each row by its die: Attack row red-tinted, Maneuver row cream-tinted (the tray colours); "?" buttons take the row's colour |
| 4 | Camp (`19_camp_rest_confirm`, `21b_train_confirm`) | Confirm buttons | The campfire Rest is green and Train purple, but their confirm buttons are both gold | Confirm button uses the same colour as the button that opened it |
| 5 | Settings (`22_gear_menu`) | Button stack | Log, How to Play, Codex, Records, Export Play Data are five identical tan buttons; Abandon Run and Reset Progress are the same red next to each other; the window scrolls, so Abandon / Reset / Close are hidden | Two-column grid of small coloured buttons (fits without scrolling); keep Abandon red and make Reset a darker outline-only "danger" so they differ |
| 6 | Game over / Victory (`31_gameover`, `32_victory`) | Whole screen | Page grows to 973px / 991px tall: the only screens that scroll; Try Again / Play Again sit below the fold | Put New Achievements and Run Summary behind a "Details" toggle or inside the run card; pin Try Again next to Save Card |
| 7 | Game over / Victory | Buttons | Save Card (tan) and Try Again (gold) are left-aligned under a centred card | Centre them in one row |
| 8 | Fight (`04`-`10`) | Health number | In fights the HP number is inside the bar (20/20); at camp and shrine it sits outside ("Health ▬▬ 19/28") | One style everywhere (inside the bar, like the fight) |
| 9 | Setup (`02_setup`) | Origin and class buttons | Unselected origins (Gnome/Halfling/Pixie) and classes (Guard/Dungeoneer/Arcanist) are the same dark brown side by side | Give each class pill a stripe or rim in its class colour (violet, teal, orange, pink); origins get their die colour |
| 10 | Shrine choice (`12_shrine_choice`) | Heal 20 / +10 Max Health | Two option buttons in the same dark brown | Heal = red/pink, Max Health = green (match the Heal and health icons) |
| 11 | Export Play Data (`28_export`) | Copy to Clipboard / Close; text box | Two tan buttons stacked; the text box is white with a thin grey border and **monospace** placeholder text | Close in a different colour (or only an ✕); text box parchment-coloured with a 3px dark outline and the serif font |
| 12 | Fight (`05_fight_regular_path`) | Big path counter "3" | Uses Trebuchet (a sans-serif): the only sans text in the game | Georgia bold (or Metamorphous if it counts as a "title") |
| 13 | Setup, Shrine, loot | Buttons in Metamorphous | "Enter the Dungeon", the shrine "Hold" and "Continue" use the title font; every other button is plain serif | Pick one: either all big primary buttons use Metamorphous, or none do (simplest: none) |
| 14 | Game over (`31_gameover`) | Section headings | "NEW ACHIEVEMENTS!" is serif caps in gold; "Run Summary" just below is Metamorphous. Fight labels "EVERY TURN", "NEXT TURN", "TRAP", "BOSS" are serif caps too | Headings in Metamorphous; small caps labels stay serif (rule: a heading = Metamorphous, a label = serif) |
| 15 | All pop-ups | Title alignment | Titles are centred on some (Abandon Run?, Healthy Hearth, Settings, Codex) and left-aligned on others (Use a Token, Equip Crossbow, Half-Empty Fountain, Your Relics, Combo) | Centre all pop-up titles |
| 16 | All pop-ups | Close ✕ | Some have an ✕ (Settings, Codex, Records, Token, Info, Relics, Export), others don't (Abandon, Rest/Train confirm, shrine choice); the ✕ sits right under the round gear button, two same-colour circles touching (`23_codex_*`) | ✕ in the same corner on every dismissable pop-up; give the ✕ a different colour from the gear (e.g. red-brown) or hide the gear while a pop-up is open |
| 17 | Codex Key (`23_codex_key`) | Action tiles | Pale pastel tiles with **no outline**, and colours that don't match the tray (Hit is bright red with white icon on the tray, pale pink with black icon here) | Draw the Key tiles exactly like tray dice (same colours, 3px dark outline) |
| 18 | Camp (`03`, `18`) | Section panels | Camp cards and the Back Pocket have a mid-brown (#74502d) border instead of the near-black outline | Near-black 3px outline like other panels |
| 19 | Game over (`31_gameover`) | Achievement box, stat tiles | Achievement box has a thin gold border; the four stat tiles have no outline | Dark chunky outline; gold stays for the heading text |
| 20 | Setup (`02_setup`) | Origin die faces, Signature Relic box | The die-face circles have no outline; the relic box uses a light dashed border | Dark outline on the face chips; dashed border in the line colour |
| 21 | Shrine (`11_shrine`) | GO, Skill, Item, Clear | GO and the side rail stay visible but dead on shrine rooms; the faded buttons are see-through, so the stone floor texture shows through UI | Hide the rail on shrines (or show it solid and greyed). Same see-through look on any disabled tray button (texture-on-UI) |
| 22 | Fight (all) | Round bubble "F1 · Rd 1" | Slate blue-grey: the only cool grey UI piece on the dark-brown base | Dark brown with the light-brown text, or the floor's colour (--floor1/2/3) |
| 23 | Camp toast (`20_camp_after`) | "Rested: scrambled 9 actions, healed 5." | Programmer wording; covers the Camp title | "Rested: +5 HP"; place it under the title |
| 24 | Camp (`18_camp_before`) | Train "No sets of 3 yet" | Wrong reason: with 8 Attack I dice the block is the empty Back Pocket (combining needs 2 spare dice there) | "Needs 2 spare dice in your Pocket" |
| 25 | Codex Dice (`23_codex_dice`) | Scrolling | A scrolling list inside a scrolling window (two scroll bars on a phone) | One scroll area for the whole tab |
| 26 | Records, Codex | Text | "-- finish a run", "Not found yet -- look for…" use double hyphens | Proper dash (—) or a full stop |

Also noted, minor: hanging vines on Floors 2-3 cross the quest paper (e.g. Forge "3 Boosts" row); the Bestiary doesn't list a monster's quests, which would be a natural place to read the full quest rule.

### Not issues (checked)
- No page scroll and no sideways scroll on title, setup, camp, every fight type, shrine, loot, relic pick or any in-run pop-up.
- Texture: art, walls, floor, arch, chest, Quests sign, route doorways and campfire logs are textured; pop-up panels and camp cards are plain. Only exception is see-through disabled buttons (item 21).
- Fonts: everything else is Georgia (serif) or Metamorphous. The Log window uses monospace (in CSS; not captured): same fix as item 11 if you want it.

## Decisions for Jeremy
1. Approve the quest wording rules (counts vs thresholds, "Reach Rd N", "in one turn" line)?
2. Quest Health: Option A (lower the numbers) or B (drop the cap)?
3. Survive quests: should "turn 4" mean Rd 4 (code change) or Rd 5 (keep code, print Rd 5)?
4. Biomancer: switch to amounts ("H.O.T. 3+", "D.O.T. 5+")?
5. Which near-impossible quests to replace (Heal-dice quests on Floors 1-2, Support/Nullify on Floor 3, Big Boss 6 Maneuvers)?
6. Floor 1 easy traps never appear: retier them or allow traps in room 1?
7. Buttons in Metamorphous: all big buttons, or none?
