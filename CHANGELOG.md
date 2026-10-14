# Changelog

## 1.41.10 (Oct 14, 2026)
- Dice finishes (Jeremy): Bronze / Silver / Gold / Royal now unlock at depth 3 / 5 / 7 / 9 cleared (was 0 / 3 / 6 / 10); the depth titles follow. The finish is slimmer and stays on the die's outer rim (thin rim, small corner scrolls, no inner frame line) so it no longer covers die names or face labels.

## 1.41.9 (Oct 14, 2026)
- Loot (tester idea, Jeremy approved): the equip pop-up has a blue **Keep in Pocket** button next to Replace. The new die goes straight to the Back Pocket and the Tray stays as it is (it counts as collected, for Starting Boon copies too). Telemetry: `loot_equip` with `pocket:true`, `replaced:null`.

## 1.41.8 (Oct 14, 2026)
- Fix (tester): the Dungeoneer's edge wrap let any die in the edge zone step straight up or down, so a Dodge (or Leap) could move like a plain step. Across the left/right seam each face now keeps its own move rule: a plain step crosses to the same row, a Dodge crosses diagonally (one row up or down), a Pivot either, a Leap can't use the seam. `tools/test_wrap.js` checks it (12 ok).
- Codex (tester): the Dice tab now lists the four Origin starting dice (with faces and a one-line role) above the loot dice; they don't count toward the found total.

## 1.41.7 (Oct 14, 2026)
- Icons (Jeremy): where the number sits beside the icon (enemy action chips, boss chips, your status chips over the doorway), Hit / Combo / Leech / Block / Heal show as solid shapes without the hole for an in-icon number. Dice faces keep the hole with the number inside.

## 1.41.6 (Oct 14, 2026)
- Enemy action chips (Jeremy): each shows its icon with a readable number beside it instead of a tiny number inside the icon plus a word ("Hit"); names are kept for boss specials only. Damage-per-Minion specials read "3 / [minion]".

## 1.41.5 (Oct 14, 2026)
- Music tempo (Jeremy): Floor 1 starts at 130 bpm, +5 per floor (130 / 135 / 140; was 140 / 145 / 150). The title theme and the end-of-run stings follow Floor 1's tempo (130).

## 1.41.4 (Oct 13, 2026)
- Music: end-of-run stings in the game's own synth, replacing the old fanfare and defeat sound effects. Run won: a fast freylekhs that opens with the Bb-C#-D sob, runs up the scale and lands on D major (Picardy third) with a snare roll and crash (~5.7 s). Run lost: a slow doina sigh down D harmonic minor over a falling bass, ending on a soft D minor chord (~5.9 s). The title theme fades back in after each. Both are on the music preview page.

## 1.41.3 (Oct 13, 2026)
- Play data (from the balance literature review): each run records its lifetime run number and depth; every turn records whether the lethal warning was up at turn start and when Go was pressed; each death records whether it came from a hit or D.O.T. and whether it was warned; relic shrines log the three relics offered and the one taken; Restart Run saves the run as 'abandoned' (a quit point). The export now opens with a summary: where runs end by floor, the first-10-runs win rate, take rates for every offered loot die / relic / shrine option, and deaths split into warned at Go / warning cleared by the path / never warned.

## 1.41.2 (Oct 13, 2026)
- Swarming rank 2 adds 2 depth instead of 3 (Jeremy; the 1.41.0 depth study found it the cheapest way to stack depth: -4.3 win points per depth point vs about -6.5 for the rest).
- Balance bot: shrine study knobs (shrineAll, forceShrine) and a shrine visit log.

## 1.41.1 (Oct 13, 2026)
- Loot dice (Jeremy, from the loot-dice study; each change keeps the die's own identity): Claymore Hit 2 x3, Combo 2, Fumble, blank (a blank became Hit 2); Acid Potion D.O.T. 1s became 2s; Medsack one Heal 2 became Heal 1; Winged Boots blank became Boost x2; Genetic Drifter blank became a second Leech 1; Domesticated Displacer blank became Combo 2. All six now sit at or near their tier's median value (docs/studies/2026-10-13_loot_dice.md).

## 1.41.0 (Oct 13, 2026)
- Maneuver dice scale with upgrades (Jeremy): Maneuver Die II = Dodge, Dodge, Leap, Leap, Pivot, Block 2 (the blank became Block 2); Maneuver Die III = Dodge, Dodge, Leap, Pivot, Block 1, Block 2. Regular bot with all starting Maneuver dice at that level: II 92% (Attack II 89%, old II 86%), III 95% (Attack III 95%, old III 91%).

## 1.40.4 (Oct 13, 2026)
- Music tempo per floor is now 140 / 145 / 150 bpm (was 140 / 150 / 160; Jeremy: it ended too fast). The key still rises each floor.

## 1.40.3 (Oct 13, 2026)
- Music: a 2-beat transition fill into the action music (a swelling snare roll and a bass walk-up, then a kick and a cymbal crash on the downbeat); the downtime part steps aside for it. If the next bar is closer than 2 beats, the switch waits one more bar.
- Title/end theme is now the long version (Jeremy): 8-bar blocks of downtime bass x2, downtime full x2 (ending in the fill), action without drums, action + countermelody without drums, action full x2, action bass x2, looping (80 bars).

## 1.40.2 (Oct 13, 2026)
- Equip picker: the Suggested die now appears only if you haven't tapped a die after 6 seconds (Jeremy), then fades in pre-compared. Tapping any die first cancels it.

## 1.40.1 (Oct 13, 2026)
- Equip picker (Jeremy picked mockup A): your weakest die by face value gets a "Suggested" ribbon and opens already compared; Replace still needs a tap.
- Balance bot: `manRider` test knob for level-scaled Maneuver faces (Riposte / Pounce).

## 1.40.0 (Oct 13, 2026)
- Floor 3 is harder than Floor 2 (Jeremy): attack +2 on every Floor 3 Easy, Standard and Deadly card, +1 on the Elites (doubled on heavy turns), +1 on all three Big Bosses' base attacks. Regular-player bot at Depth 0: HP lost per Floor 3 fight 7.2 -> 10.1 (Floor 2: 6.6), runs ending on Floor 3 6% -> 17% (Floor 2: 19%), overall win 77% -> 65%.
- Extruzeon, Co-consul of Waste: new "Layer by Layer" base attack starts at 2 and grows by 1 every turn (by 2 in Meltdown; the layers carry into phase 2), shown in its warning chip with a small arrow. Fast, bursty fights beat it cheaply; long ones get expensive. Now as dangerous as the Toadtaur Wizard (bot: ends 4.0% of runs that meet it vs 4.9%, 18 HP per fight).
- Swarming is capped at 2 ranks (Jeremy).
- Codex: one tabbed book in Settings and on the title screen -- Bestiary (new: every monster, trap and boss you've met, with art, tier, HP, moves, flavor and how often you beat it / it beat you; unmet ones show as silhouettes), Dice, Relics and the Action Key. Records: Run History and Achievements together. The settings menu is three buttons shorter.
- Lethal warning: your HP bar gets a red outline and a "Lethal next turn" tag when the enemy's coming turn plus your D.O.T. would finish you (counts the path you're building: its Block, Heal, Freeze, Nullify, or a kill).
- Class Skill teaching: the first fight with each class explains its Skill once; for Armsmaster and Guard the Skill button pulses until used each turn for that class's first three runs.
- Volume sliders for sound effects and music (0 = off).
- Run card on the win and loss screens: who, how the run ended, four headline numbers, the final tray and relics; "Save Card" shares or downloads it as an image.
- Performance: every idle loop now runs on the compositor (button pulse as an expanding ring, the quest note's candle flicker as a light layer, the art glint only while it shows, the idle sway as one transform). Idle board at CPU x4: ~1.1 s of browser work per 3 s -> ~0.15 s. During a turn's playback the remaining ambient loops rest (paint -34%, compositing -58%).

## 1.39.7 (Oct 13, 2026)
- Splash screen (Jeremy): a "Tap to begin" screen before the title, with "© 2026 Jeremy and Katlynn Friedman. All rights reserved." at the bottom. The tap unlocks the browser's audio, so the title theme plays as soon as the title appears.
- Shrine music: A freygish at 96 bpm -- a soft held drone under a glassy, shimmering melody that sighs through the Bb-C# "sob" and comes home to A (follows the floor's key).
- Title / end theme: a 32-bar version of the whole Floor 1 story (lonely bass, sad melody, the action with drums, the action with the countermelody), looping on the title and setup screens and on the win and loss screens. It starts on your first tap (browsers keep audio locked until then).
- All the game's music on one page: docs/music/game_music.html (built from the game's own music code by tools/music/build_game_preview.py).
- Victory chime (Jeremy; replaces the old fight-won ding): a quick accordion run up the A-Bb-C#-D motif to a trilled D over the triangle bass, landing on the next bar line of the music (in time and in key). Elite/Deadly wins play it an octave higher with woodblocks; bosses get a longer run with a drum roll. With the music off it plays right away.
- Loot chest burst: a chord that hints the tier -- Alloy a metal clink and A major, Gilded brighter with a bell on top, Magic a glassy shimmer through the Bb-C# "sob".
- Camp lullaby: 16 bars in 3/4 at 84 bpm (D harmonic minor) -- soft triangle bass, music-box melody, quiet accordion answers, ending on the Bb-C#-D motif. Crossfades in at camp and back out when you leave.
- Floors 2 and 3 (Jeremy: same tune, transposed): Floor 2 in E minor at 150 bpm with a plucked countermelody in the bass-only rounds and the action bass doubled an octave down; Floor 3 in F minor at 160 bpm with a buzzier pulse bass, soft woodblocks in downtime and the action drums all the time. Sound effects move into each floor's key too.

## 1.39.6 (Oct 13, 2026)
- Loot chest opening is smoother (Jeremy: it lagged): a smaller single sunray instead of two screen-sized wheels, no page shake, the cards' pulsing glow is a cheap fade, 6 comet streaks per card instead of 8. Phone-speed test: 95% of frames now at 60 fps (was 30).
- No scrollbar flash when you pick a loot die (Jeremy).
- Camp: duplicate dice now look like a pile -- copies of the die (in its own color and outline) peek out behind the top one, up to three layers for bigger stacks; stacked dice in the Back Pocket stay the same size as single ones (Jeremy).
- After a fight, the downtime music restarts its cycle: bass alone for the rest of that block and two more rounds, then the melody rounds (Jeremy).
- Camp rest: your hero gives a little shake as the healing fills in (Jeremy).
- Grafted Grifter faces the other way in fights (Jeremy: horizontal flip).
- Action music (Jeremy): Boss, Elite and Deadly fights switch to the action version on the next bar line -- the driving Palace-pump bass with the frantic melody on toy accordion the whole time; boss phase 2 brings in the toy drums. Winning the fight (or any other screen) drops back to the downtime version on the next bar. Both versions share one clock, so the beat never skips.

## 1.39.5 (Oct 13, 2026)
- Music (first try, Jeremy): the game's own synth plays the Floor 1 downtime sketch during a run -- an NES-style triangle bass with a toy-accordion melody, in 8-bar blocks: two rounds of bass alone, then two rounds of bass + melody, repeating (Jeremy). The melody sits lower in the mix, and no two melody notes overlap (the opening grace note now plays just before its note). No audio files (a few KB of notes). New Music switch in Settings, separate from Sound effects; it fades in at the start of a run and out on the end screens, and pauses in the background.
- Equal and Opposite (Jeremy): whenever your Block absorbs an enemy hit, the enemy takes the amount Blocked (was 2 damage, and only on a fully Blocked hit). Depth 7: about +6 win points (was about 0).
- Two new one-point depth levers (Jeremy): Union Dues (receiving a shrine's boon costs 2 HP) and Rounding Error (your Heal faces heal 1 less, never below 1). Each costs about 2-4 win points for a skilled player.
- Sound effects are in the music's key (Jeremy): every pitched sound sits in D harmonic minor, and the rising ladders (path steps, hits, heals, Block, D.O.T., Freeze...) climb the A freygish scale (A Bb C# D E F G) instead of a major pentatonic one. Happy sounds use A major (the bright chord inside the key); the victory fanfare ends on D major.
- The small Dodge icon (loot compare rows) has bold arrowheads, so it no longer reads as a plain X (Jeremy).
- Swap and Reroll (Jeremy): once used, the die becomes a Pivot for the rest of the turn instead of a blank that ends your path.
- Guard's zone is a 3-square L on the middle right (was a 2x2 block).
- Depth numbers start at 0 (Jeremy): the base dungeon is Depth 0, so the badges sit at 0, 3, 6 and 10. Your saved progress is unchanged; only the numbers shown are one lower.

## 1.39.4 (Oct 12, 2026)
- Fix: Go works right after building a path. Since 1.39.2 the Go button only responded after something forced a full redraw (like using the class ability), so the ability felt mandatory (Jeremy). `tools/test_pathrender.js` now clicks Go after path taps.
- Swarming rank 3 adds 6 depth (was 4).
- Stronger Infill: start every fight with 1 Block (Jeremy; was 2 in 1.39.3, 5 before).
- Zeal's extra damage now shows in the enemy's next-turn warning, so the numbers on the chips match the hit you take.

## 1.39.3 (Oct 12, 2026)
- Depth modifiers reshaped so each point of depth is worth about the same (depth study, two rounds): Swarming ranks add 1, 3 and 4 depth; Zeal rank 1 (cost 3) is +1 damage on every hit, rank 2 (+1) adds +1 more on heavy turns and boss specials; Dread also gives Elite and Deadly foes +20% HP per rank; Burden of Choice (one rank) removes the Overkill option and one option from every loot reward; Rationing Rations is half rest, then no rest (cost 1, then 2); Clumsy is 4 max HP per rank (rank 3 costs 2); Night Shift rank 1 costs 1.
- Classes (Jeremy, after the class × origin study showed class carries the wins): Guard converts to Block 1 (was Block 2); Dungeoneer's path wraps on every row (was the two middle rows). Arcanist's zone is both diagonals, and any step into or out of it may go diagonally (was: diagonal moves only between squares of the rising diagonal); bot win rate at depth 7 went from 29% to 53%.
- Prevented damage is visible (Jeremy): when Block absorbs an enemy hit, a blue "N blocked" floater rises from your HP bar, and the run summary counts Damage blocked.
- Sound: rolling the tray now lands each die in its own material (wood for the starting dice, a metal tick for Alloy, a bright ring for Gilded, a glass chime for Magic); a single Reroll has its own short tumble instead of the whole-tray rattle.
- Origin relics brought down to tier B (Jeremy): Stronger Infill starts fights with 2 Block (was 5); Coffee Break's H.O.T. faces add +1 H.O.T. (the Heal +2 is gone); Faerie Fire adds at most +2 damage per path. Measured at depth 7: +21, +13 and +12 win points (were +37, +46, +29); Mycorrhizal Bond +13 unchanged.
- Relics re-tiered from the depth-7 relic study: tier S (unlocks after clearing depth 2) is Scavenger's Acumen, Evasion Tank and Minus-One Mantra; tier A (after your first victory) is Hard Hat Act, Perfect Fifth and Prime Edge. Mandated Lunch Break and Combonatorics are no longer gated.
- Depth menu shows the depth each modifier's next rank adds (and the total once maxed).
- Music groundwork (no music in the game yet): spec, six MIDI sketches and a preview page in docs/music.


## 1.39.2 (released Oct 12, 2026; bug hunt clean, 24 setups)
- Much faster path taps: about 2.5x (median ~119 ms -> ~47 ms per tap, slowest 10% ~175 -> ~63 ms, at phone-like speed). A path tap now redraws only what it changes (dice, path coins, damage counter, Go, chest lock, the enemy bar's damage preview) instead of the whole screen; the stone arch is a cached image; the room floor no longer forces a second layout. `tools/test_pathrender.js` checks the fast update matches a full redraw.
- Relic gem families evened out (Jeremy): Equal and Opposite is now offense; Perfect Fifth and Combonatorics are path; Percolation Theory, Mandated Lunch Break and Bisection Method are loot/tempo. Families: 6 offense, 6 defense, 5 path, 6 loot/tempo. Effects unchanged.
- Shrine "Hold to receive the boon" and Continue buttons float in the tray's header row instead of taking their own row, so the dice no longer get pushed down (Jeremy).
- Relic gating (Jeremy): the strongest shrine relics are quietly held back. Tier A (Evasion Tank, Perfect Fifth, Mandated Lunch Break, Prime Edge, Combonatorics) joins shrine offers after your first victory; tier S (Scavenger's Acumen, Minus-One Mantra, Hard Hat Act) after you clear depth 2. Locked relics stay "???" in the Codex.

## 1.39.1 (released Oct 12, 2026; bug hunt clean, 24 setups)
- Swap and Reroll work mid-path (Jeremy): tap the face any time; neither can touch a die already in the path. Swap/Reroll tokens too.
- Reroll always lands on a non-blank face (a different one whenever the die has one).
- Jeremy's repaints (batches A-D, 27 pictures) re-imported from his canvases at twice the resolution, so they stay sharp on phone screens (the first import had scaled them down to the old picture size).
- Monster sizes set from line thickness: each picture's outline now renders at about the same thickness, so heavy-lined art shrinks (and is stretched less, so it is sharper) and thin-lined art grows a little. 37 sizes changed; the Filament Bunny keeps its new size.

## 1.39.0 (released Oct 12, 2026; bug hunt clean, 24 setups)
- Seven new monsters from Jeremy's Mechanics Document, with his flavor text and the original art already in the game: Untamed Unicrows (Floor 1 standard), Prickly Porcupanther (Floor 1 Deadly, only with the Dread modifier), Rabbid Rabbats and Roudy Rinotter (Floor 2 easy), Whence Wolf (Floor 2 Deadly), Eelagator Escapee (Floor 3 Deadly), Toadtaur Warrior (Floor 3 elite). Each was tuned to sit inside its tier.
- Third Big Boss: Toadtaur Wizard, Assistant to the Co-consul (78 health; Hex Factor, Square Root, Exponential Croak; phase 2 Leap Year, where the Toadtaur Warrior joins with Lily Pad Lemma). Floor 3 Big Bosses now cost 11.8-13.3 HP per fight for the bot.
- Four new Magic dice (names by Jeremy): Axiom of Choice (Reroll), Domesticated Displacer (Swap), 273.15 Kelvin Box (Freeze), Exile Elixir (Swap, Block, Freeze, Heal).
- Dread now also gives Floor 1 its own Deadly card.
- Jeremy's game text pass: tutorial pages, Dodge/Leap/Pivot/Block/Nullify/Swap/Reroll descriptions, enemy Minion, statuses, route tooltips; room banners now read "You scramble into a mysterious / welcoming / hostile room...".
- Relics are now cut gems (drawn in code, no art files): the cut and color show the family (red triangle offense, blue emerald-cut defense, green hexagon path, gold round loot/tempo, purple kite origin) and an etched glyph shows the relic. In a fight they stand in a column beside the hero (a second strip past 7 relics), so the buffs row is free and the hero sits lower.
- More relic renames (Jeremy picked from Claude's ideas): Minus-One Mantra, Percolation Theory, Perfect Fifth, Exponential Decay, Bloodthirst, Strength in Mooks, Bisection Method, Inductive Step, Mycorrhizal Bond, Coffee Break, Faerie Fire.
- Filement Bunny drawn larger so its filament detail shows.
- Action Key reworked: tap any action to read its description (the old hover tooltips never showed on a phone), uses the same text as the die long-press, and now includes Swap and Reroll.
- Every relic renamed by Jeremy (new badges too): Prime Edge, Mandated Lunch Break, Minus-One Mantle, Need Before Greed, Campfire Percolator, Hard Hat Act, Klein Bottle, Pentatonic Chime, Exponential Decanter, Thirsty Blade, Union Health Plan, Nature's Thorns, Power Word: Safe, Scavenger's Acumen, Equal and Opposite, Mook Shield, Evasion Tank, Terminal Velocity, FTLeporter ("Your Pivots can teleport: the next step may go to any die."), Giant Killer, Bisection Bell, n+1 Button, Combonatorics; origin relics Stronger Infill (Dwarf), Mycorrhizal Satchel (Gnome), Fine Coffee (Halfling), Faerie Fire Dust (Pixie).
- Jeremy's renames: The Strike-Breaker is now The Strike/Break-er; depth modifiers renamed: Tougher Scuffs (Tougher Foes), Rationing Rations (Hard Rations), Clumsy (Frail), Swarming (Swarm), Burden of Choice (Slim Pickings), Zeal (Fury), Night Shift (Gauntlet), Dread unchanged; the first-time action card reads "New Action".
- Jeremy's boss move names: Golem Lemma, Pre-heat, Melting Point, Grafted Plate, Pruning, Grazing, Slammerhand, Extrue-damage, Atomic Pull, Excessive Extrusion, R.O.T., Spore-Up, Be Fruitful and Multiply!, Toxic Trample, Lily Padding, Chimeronslaught, Lily Pod. The third Big Boss is Toadtaur Wizard, Assistant to the Co-consul. New flavor for Myceleus and the Wizard.
- Long boss move names shift the warning chips left instead of running off the screen.
- Floor 3 is no longer a breather: +1 attack for every Floor 3 standard and elite card, +2 for Morel Dilemma, Chimeric Sludge, Extractnid Matriarch, The Punished and Sacred(?) Geometry. Myceleus 106 health; Chimeronslaught 9.
- Gnomish Mushroom Cap: both D.O.T. 1 faces are now D.O.T. 2 (Gnome bot win rate 46% → 55%).
- Geometry quests are mirror rules: at Profane Geometry, every H.O.T. you gain also lands as D.O.T. on it; at Sacred(?) Geometry, every D.O.T. it takes also gives you H.O.T. (capped at 10).
- Sound palette: each action has its own instrument (sword hit, wooden Block knock, Heal/H.O.T. bell, D.O.T. pluck, glassy Freeze, Nullify swell, Boost whistle, airy Maneuver whoosh, Swap flip) and every path step climbs the scale. The enemy turn has sound now: a drum as it acts, a clank for Shield or a fully Blocked hit, a bell for its heals, squeaks for Minions, and a rising rumble when a wind-up or heavy turn is telegraphed. Your H.O.T. ticks and camp rests chime.
- Gnomeowners Association replaces Parasite Seer on Floor 3 (same stats), with Jeremy's new art.
- Jeremy's retouched Batch A art: Anti-Euclidian Space, Displacer Lair, Grafted Grifter, Grosteque Grafter, Unventilated Workshop, a gnome portrait, and new art for Rogue Golemancer and The Necrorancher (their pictures were swapped).
- Jeremy's shrine names: Scroll Dispenser: CRELA / GIB / TSOP / AWSP / DOER, Surgery Community Theatre, Healthy Hearth, Ark of the Flood, Loot-Diagonalizer, Blood-Drive Treats, Blood of Spanneroth, Ferrous Maiden, Thom's Guide, Time-Intensive Shrine, Cryotherapist, Ruinous Rune Room, Indoctrination Inoculation, Charged Fae-Lines, Madpie Nest, Faustian Spreadsheet, Correctly-Designed Fountain.
- Quest fixes: 13 quests that could never complete now work ("20+ damage", "8 damage/turn", "survive turn 4", combos/H.O.T./D.O.T. counts, Freeze rewards); "Bank 5 Block" checks Block actually banked; "2 nullify" needs 2.

## 1.38.1
- Pixie Powder: Combo 1 → Combo 2 and D.O.T. 1 → D.O.T. 2 (bot win rate 47% → 54%).
- Jeremy's retouched Batch B loot art: Grappling Set, Legendary Sheath, N-th Dimensional Printer, Pixie Powder, Warp Crossbow.

## 1.38.0
- New actions, Swap and Reroll: tap a Swap or Reroll face before you build your path, then tap a die. Swap trades the two dice's places; Reroll rerolls the chosen die to a different face. The Swap/Reroll die is used up for the turn (it acts as a blank). Clear undoes Swaps; Rerolls are final. Minion-covered dice can't be targeted, and mid-path the faces are plain steps.
- Pixie Powder: Dodge becomes Swap.
- Dice with new faces: Portable RNGenerator, Mining Mines and Tarot Deck (a blank becomes Reroll), Eye-Frame (a Dodge becomes Reroll), Cool Whip (a Combo 1 becomes Swap), Genetic Drifter (a Pivot becomes Swap).
- Swap and Reroll tokens (Item menu): a Swap token swaps any two dice, and a Reroll token rerolls one. New shrines Scroll Dispenser: SWAP (Floor 1, 2 Swap tokens) and Scroll Dispenser: REDO (Floor 2, 2 Reroll tokens), with stand-in art.
- New-action tutorial cards for both; test bots and the balance bot use them.

## 1.37.1
- The Strike-Breaker (Floor 2 Deadly) hits for 4 (8 on heavy turns), down from 6 (12): it ended a third of the runs that met it.

## 1.37.0
- Bosses evened out per floor (HP lost per fight now within about 15% on every floor): Rogue Golemancer's Golem Slam 7 and Brace 4; Heating Elemental's Flashover and Grosteque Grafter's Stitch-Rip 5; Bellicose Biomancer's Overgrowth Slam 8; Ceramic Golem's Shatterpour 7; Extruzeon base attack 3 (4 in Meltdown) and Waste Crush 8 (9 in Meltdown).
- The Necrorancher: 48 health (was 35); new move Dead Reckoning (2 D.O.T.); Cull 7; Stampede now brings its herd with the warning.
- Myceleus: 96 health (was 75), base attack 5; new move Fractal Rind (4 Shield) replaces Sporulate; Mycelial Burst now brings its spores with the warning.
- Herald minions: a boss's minion wind-up (Stampede, Mycelial Burst) places its Minions on the same roll that shows the warning, so you get exactly one turn to clear them, Leap them or brace for the hit.

## 1.36.0
- Shrine ritual: shrines get their own entrance ("A shrine hums in the dark…", soft chime, warming torches, rising motes); press and hold the shrine or its button to receive the boon (rising notes, the shrine lifts and bursts); rewards land where they live (relics fly into the relic strip, health stretches the bar with a big number, upgraded dice flip on the tray, tokens drop on the Item button). Simple results show in the arch instead of a popup; relic and boon choices fan in.
- 30 shrines (was 14), 10 per floor, about half giving relics: themed relic shrines (offense, defense, path and movement, loot and tempo) and bargain shrines (Blood Bargain: 3 max health; Hungry Idol: skip your next camp rest; Devil's Ledger: 5 max health for a choice of four), plus Wishing Well and Reliquary Font. New shrines use stand-in art for now.
- 12 new relics: Barbed Buckler, Overflow Chalice, Bloodletter's Fang, Spite Thorns, Grave Tally, Dodger's Cloak, Leaper's Spurs, Pivot Compass, Frost Charm, Warding Bell, Shrine Bell, Combo Gauntlet.
- Shrines get more common deeper in a run (40% / 45% / 50% per eligible room on Floors 1-3) and with depth (+3% per level, max 70%).
- Crash sim and bug hunt now activate shrines instead of stalling on them.

## 1.35.2
- First-time icon cards now say "New action" instead of "New symbol".

## 1.35.1
- "New symbol" cards show the whole icon (the icon's clipping box stayed at text size, so only a corner of e.g. Leap showed).

## 1.35.0
- Bosses reworked: base attack every turn plus a named special from each boss's own move list, shown a turn ahead; big telegraphed wind-ups (e.g. Waste Crush 12, Stampede 2 per Minion). Freeze cancels the special, not the base attack. Big Bosses enter Phase 2 at half HP (Extruzeon: Meltdown, Myceleus: Fruiting Body).
- Encounter tiers on every floor (easy / standard / elite / deadly). Rooms follow easy -> standard -> elite, Camp, standard -> elite, Boss. Deadly cards (The Strike-Breaker, Self-Replicating Forge) rarely take an elite room on Floors 2-3. Shrines only appear in easy/standard rooms (40% each, max one per segment).
- Elite enemies telegraph a heavy turn every 3rd turn, deadly every 2nd (double attack, or double their biggest effect); Freeze cancels it.
- Morel Dilemma and Unventilated Workshop now attack (2) with H.O.T. 1; Self-Replicating Forge spawns 4 Minions (was 6).
- New depth modifiers: Dread (more deadly rooms) and Gauntlet (rooms shift up a tier).
- Face-off shows the boss's next special, heavy turns in red, and Elite/Deadly tags.

## 1.34.0 / 1.33.x (uncommitted before this file; see commit)
- Minions: queued after the roll; leap/dodge/pivot onto covered spaces; reveal only during resolution; blank landing ends path; eyes + twitch; greyed like unreachable dice.
- Camp: Organize dice area folds to two rows when it would scroll; relics below health bar; title screen shows only earned badges and the version number.
- Class zones twitch when a Skill is armed; magic die purple pulse; upgrade button keeps button thickness.
- Web build: art extracted to cached /art files (offline verified); richer turn telemetry (tray, path, block).

## History (from commits)
- 1.32.77: block pull-to-refresh/overscroll bounce
- 1.32.76: loot dice join Compendium when taken; 3 copies unlock as Starting Boon; end-of-run announcement
- 1.32.74: telemetry: active-time clock, shrine/minion/damage-taken events, 1-based turns
- 1.32.73: one minion cleared per damage dealt
- 1.32.72: minion debuff under the player, live count, restore dice reliably
- 1.32.71: minions cleared between fights
- 1.32.70: shrines keep the dice box visible
- 1.32.69: torch light keeps breathing during the dice path (no dim at end)
- 1.32.68: tracker marker never hops in from the right
- 1.32.67: rounded boss bar ends, shorter DOT/HOT tooltips
- 1.32.64: boss arc same thickness and gradient as normal bars
- 1.32.63: unified wall/floor lighting
- 1.32.62: deterministic room layering under shake/kill
- 1.32.61: hit punch only moves fighters, room stays steady
- 1.32.61: keep room floor horizon in sync after layout shifts
- 1.32.60: quest paper outline
- 1.32.59: mid-size hero marker
- 1.32.58: Batch D floor 1 trap art
- 1.32.57: moss Pocket button, armed Skill lights class zone, bigger hero marker
- 1.32.56: Batch C floor 1 monster art; arched-door room tracker with ? rooms
- Steady lock when ready; action badges dark ink + bone rim (1.32.54)
- Enemy action badges: stone slab (1.32.52)
- Skill button takes class color (1.32.51)
- Horizon clears the longest quest note; floor widens exactly at pillar bottoms (1.32.50)
- Floor hard-cut at app width (1.32.49)
- Stone-floor room, brick back wall, ground shadows, solid class zone outlines, solid disabled Go (1.32.48)
- Room tracker floats without panel (1.32.47)
- Torch-lit quest note; infrequent idle moves (1.32.46)
- Quest note: aged parchment, no ruled lines (1.32.45)
- Warmer hallway floor, slate Round badge (1.32.44)
- Brown palette: 7-step tokenized ramp (1.32.43)
- Camp heal fills gradually; flames lose dark outline (1.32.42)
- Pause decorative loops while a path resolves (1.32.40)
- Slow path resolution beats (1.32.39)
- Idle v2: still bodies, glint pulse, player ready lean (1.32.38)
- Slow idle twitch cycle (1.32.37)
- Micro twitches (1.32.36)
- Distinct player/enemy idle twitches (1.32.35)
- Idle motion: twitches instead of breathing (1.32.34)
- Passive atmosphere: torch glow, dust motes, chest interior glow (1.32.33)
- Trim doubled effects: no tally shake/burst on killing blow, shake on boss rooms only
- Juice pass 3: quest stamp, D.O.T./H.O.T. tick floaters, door kick, kill hit-stop, camp dice fly-in, fire flare
- Add bugsearch.js (invariants, DOM/layout checks, save/resume fuzz)
- Don't persist animation clocks in saves; clamp HP roll progress
- Health bar segments meet in flat edges
- Crisp star-shaped combo rings with gap; remove first-Block bonus
- Rulebook update to build 1.32.26 (star combo outline, HOT cap, Nullify, Block, chest, skin tones)
- Star-shaped combo outline; balance: HOT cap 6, Nullify clears all, first Block +1
- Keep screen within 769px target after chest: shrink doorway min-height
- Chest lock animations, trimmed chest height
- Dice tray: oak-and-iron chest
- Dice tray styled as a runed vault chest
- Finish importing sealed outline art
- Outline pass: seal thin tinted hairlines inside the ink band
- Outline pass: repaint old colored rims black, clear specks
- Room, boss and floor callouts as ribbon banners
- Rounder, wonkier torch sconces
- Wall sconces under the torch flames
- Dark hallway lighting: torch foci, warmer brighter glow, near-black edges
- Arch: outlined bricks with subtle shade variation
- Shared outline pass (25 assets + one ink colour in the UI), bosses shrunk into the arc pocket
- Quest notice: two nails, narrower, balanced wrapping
- Quest box as pinned paper notice behind fighters
- Quests float above the vs in a labeled plate
- Normal enemies: bar/portrait lowered (kill-hint floats); boss portraits raised
- Boss arc spacing matches player bar; name shown as 'Name, Origin Class'
- Boss health bar as a U-shaped arc with inline BOSS tag
- Revert boss health bar plate (back to normal line thickness)
- Lift big normal monsters off the health bar; dark plate behind boss health bars
- Monster size: non-boss big ones sit above the health bar, bosses bigger, small ones smaller
- Monster size: grow upward until the arch, then downward so feet show below the health bar
- v1.32.19: per-monster size in the face-off (small ones shrink, big ones loom behind their health bar)
- v1.32.18: import edited Dwarf portrait 5
- v1.32.17: animation refinements (damage-scaled lunges, enemy wind-up timing, death, chest build-up, combo ripple, number drift, tray settle)
- v1.32.16: remove loot chest pips
- v1.32.15: shield amount shown in health bar text (14+4/20)
- v1.32.14: heal fill sweep, shield feedback, enemy wind-up, mascot hop, rolling HP numbers
- v1.32.13: idle breathing, attack lunges, health bar damage ghost
- v1.32.12: keep enemy portrait visible until the path finishes dealing damage
- v1.32.11: shield badge text only
- v1.32.10: show Shield/Block as a blue segment + badge on health bars
- v1.32.9: face-off arch frame matches tray panel width
- v1.32.8: contrast pass (edges, disabled upgrade rows)
- v1.32.7: flat dark brown page background
- v1.32.6: remove leftover body radial gradient; flat background
- v1.32.5: flat aubergine page background (no gradient) so it separates from the brown UI panels
- v1.32.4: random skin tone per run (Original/Green/Blue/Purple/Gray) for Dwarf, Gnome, Halfling portraits
- v1.32.3: import edited Dwarf portrait 1; outlined campfire logs
- Art: import edited Dwarf portrait 0
- v1.32.2: enemy Shield absorbs player damage; all statuses incl. Block reset each room; new video-game rulebook (docx/pdf) replaces old manual
- Manual: add Digital Edition progression and run-records section
- v1.32.1: re-encode all embedded art as clean 32-bit RGBA PNGs
- v1.32.0: run highlights, origin relic reveal, chest anticipation pips, near-miss callouts
- v1.31.12: upgrade-die preview popup uses loot-option style (die tile + face tiles)
- v1.31.11: banners use UI font; Maneuver shortened to Mvr in camp organize and Back Pocket
- v1.31.10: coin row reserves its height, tray no longer shifts when first coin appears
- v1.31.9: enemy statuses under name, 'Every turn'/'Cycles through' label, HP numbers inside full-width bars
- v1.31.8: ribbons keep slanted parallelogram shape with chunky outline
- v1.31.7: ribbons restyled to match art (flat colour, chunky outline, button drop edge)
- v1.31.6: title-case camp rest button
- v1.31.5: Rest button reads 'Stay a while & rest'
- v1.31.4: remove run-total dmg bubble; big outlined damage/heal numbers by portraits; use extra height on setup/camp/title
- v1.31.2: fit real-device viewport (411x785): screen height follows dvh up to 769, card width 395, title panel full width, doorway scene scales into extra height
- v1.31.1: manifest link sends credentials (works behind site password)
- v1.31.0: installable web app build (manifest, icons, offline cache) in dist/web
- v1.30.13: Parasite Seer uses gnome art; crow kept as unused
- v1.30.12: mirror Necrorancher, Biomancer, Ceramic Golem, Chimeric Sludge
- v1.30.11: Adhesive Pest Traps mirrored
- v1.30.10: Con-Trap/Pest Traps art swapped; Alchemists Stone cube only
- v1.30.9: mirror six more encounters
- v1.30.8: Golemancer un-mirrored; Leper Con-Trap shows placeholder (wrong art)
- v1.30.7: Unbound Automa art un-mirrored
- v1.30.6: restore mirrored encounter art; NO_FLIP exceptions list (Viscous Orb)
- v1.30.5: shrines shown in the doorway with their art
- v1.30.4: tap the selected die again to cancel organizing
- v1.30.3: no-op identical-die organize swap keeps selection; drop redundant damage ribbons
- v1.30.2: Go on top, un-mirrored encounter art, ribbon motion along own axis with in/out easing
- v1.30.1: remove ribbon speed streaks
- v1.30.0: diagonal ribbons replace toasts (combat slash + separate gold notice ribbon)
- v1.29.18: flavor text tooltip-only
- v1.29.17: center room callout horizontally
- v1.29.16: new-room callout centered in its own slot
- v1.29.15: shrine Reveal the boon fallback (stuck screen), tooltips dismiss on tap/close
- v1.29.14: remove frame lines around loot chest
- v1.29.13: class-coloured zone cells and armed ability button
- v1.29.12: reserved buff row, screen height 720 with larger doorway and fighters
- v1.29.11: reserved kill-hint slot, uniform 222px arch, screen height 660
- v1.29.10: arch frame sizing fix (animation scale), remove floor line, center quests, even top panel
- v1.29.9: fix squished camp portrait
- v1.29.8: hero portrait beside camp fire
- v1.29.7: larger Enter the Dungeon button
- v1.29.6: center rail button labels
- v1.29.5: centered loot prompts, centered basic die icons, buffs under hero name, quests under enemy
- v1.29.4: defeated monster stays gone, text-only Go/Skip/ability buttons, statuses+relics overlay the doorway (no height growth)
- v1.29.3: camp cog tucked beside heading
- v1.29.2: suppress OS long-press menu, delegated touch tooltips for all titled elements, monster-only death dissolve in face-off
- v1.29.1: face-off hit/heal flash on silhouette, floating numbers above heads
- v1.29.0: doorway face-off layout, floor-by-floor overgrown arch, health moves into the scene
- v1.28.6: round badge height matches coins
- v1.28.5: remove gap between Health label and bar
- Fix GAME_VERSION string to 1.28.4
- v1.28.4: unsquish loot tile name text
- v1.28.3: item art on the loot picker's big die face
- v1.28.2: loot picker as wide rows with bigger die and faces
- v1.28.1: enemy portrait full height, flavor beside it
- v1.28.0: contrast pass, unique button colors, Pocket/Item into rail, Key moved to Settings
- v1.27.2: all screens normalized to one min height (640px)
- v1.27.1: darker browns, setup label padding, portrait line removed, ability pulse no scale, damage bubble numeral, smoother path trail
- v1.27.0: tester note in export, Send Play Data on end screens, title hint
- v1.26.2: shorter Go, portrait restored to original overlapping size
- v1.26.1: character portrait back in the side rail
- v1.26.0: side-rail tray buttons with tall Go, shorter screen
- v1.25.1: plain serif UI font; drop-shadow lips so highlights aren't overridden
- v1.25.0: MedievalSharp + Metamorphous typography
- v1.24.0: QA pass (character select layout, class mini tray, darker bg gradient, camp art, tray button row)
- v1.23.10: loot modal hugs two options
- v1.23.9: loot face tiles with clean glyphs (no chip-disc styling)
- v1.23.8: loot faces as mini die tiles
- v1.23.7: simplified loot face dots, centered Victory header
- v1.23.6: center dice icons
- v1.23.5: very dark camp status card
- v1.23.4: highlight selected Origin/Class tabs
- v1.23.3: fix character-select Back button
- v1.23.2: coins without numbers; damage badge back up top
- v1.23.1: path shown as overlapping coin stack beside Round badge
- v1.23.0: toy theme (dark brown), larger dice, round badge moved out of tray, unified outline color
- v1.22.1: style tighten (radius/ease/shadow/font tokens, unified UI numerals)
- v1.22.0: juice pass 3 (kill hints, scramble polish, intensity/vibration prefs, UI ticks, NEW tags, floor card)
- v1.21.0: juice pass 2 -- enemy death beat before chest, relic proc rings/floats, camp fuse flash + chord, run-end tally count-up
- v1.20.0: juice pass 1 -- pentatonic pitch ladder, path tick sounds, tiered damage badge with rolling digits, hit-stop + impact punch, running damage tally, closing tally chord/shake
- Manual: add Relics section (shrine relics, origin relics, Relic Shrines)
- v1.19.0: Relics -- 11 shrine relics, 4 origin signature relics (start with it after a win), Relic Shrines, Relic Codex
- v1.18.2: fix Camp organize/upgrade stale-selection crash; heal corrupted saves; log JS errors to play data
- v1.18.1: export never claims a download succeeded; always offers copyable text
- v1.18.0: anonymous on-device play telemetry + Settings > Export Play Data
- v1.17.5: illustrated tier-colored loot chest
- v1.17.4: bigger twitching chest
- v1.17.3: narrow chest card, centered title, no tap-to-open label
- v1.17.2: compact loot screen so burst effects read; damage badge no longer blocks taps on top-right die
- Restore pointer cursor on loot cards
- Drop the per-card check button; tap a loot card to take it again
- Give the player a chest to tap after a fight before the loot appears
- Take loot with a check button instead of tapping the whole card
- Bring the loot-reveal animation mockup into the real loot screen
- Fix path-trail line drawing over the damage-total badge
- Fix stacked-dice count badge clipping and merge-glyph's open bottom die
- Use origin green for the Origin tab's selected glow
- Add distinct preview highlight for locked Origin tabs
- Fix Origin showcase panel height varying between Origins
- Replace Origin's circular face-icon picker with text tabs, matching Class
- Face-zoom the Origin picker circles; grow the showcase portrait to 150%
- Show when the class Skill button is armed, before a die is picked
- Fix cut-off feet on character-select portraits
- Fix clipped upgrade-row dice icon; add buffer below campfire
- Make Rest and Break Camp & Continue buttons equal width
- Fix: character-select die-face tooltips didn't work on touch devices
- Remove dev-facing art-coverage note; add hover tips to character-select die faces
- Camp layout cleanup + remove Log buttons, move Log into Settings
- Restructure New Room pop-up: name promoted to the big line
- Simplify Camp Rest button label
- Enlarge Origin showcase portrait on Setup screen
- No repeat Loot dice within a single run
- Add a custom die-face favicon to the shipped HTML file
- Fix stacked-die count badges getting cut off; unify the design everywhere
- Fix the Combo ring rendering as an oval instead of a circle
- Reorder Classes (Armsmaster before Guard) and sharpen the Combo ring
- Default-select Dwarf/Guard instead of just previewing them
- Give each Class its own identifying color in the Class picker
- Shrink Back Pocket, fan out stacked dice, and add a live Combo glow
- Redesign Camp Organize Dice as square card-stacks with a pocket UI
- Clarify Camp's dice-swapping interface: merge glyph, grouped lists, connected swap cue (v1.4.0)
- Make D.O.T./H.O.T. a depleting stack, not a flat standing effect (v1.3.0)
- Enlarge the room-entry popup and fix cramped Organize Dice labels
- Center the lock icon on locked Origin portraits in character select
- Strip decorative emoji in favor of inked icons, add Reset Progress to Settings (v1.2.0)
- Redesign Setup screen: WoW-style Origin/Class pickers, art-rich showcases, favorites, named runs (v1.1.0)
- Fix debug-unlock leaving portraits silhouetted and no Starting Boon shown (v1.0.22)
- Debug mode now really unlocks Origins, Achievements & Dice Compendium (v1.0.21)
- Turn the die-swap screen into a bottom-anchored pop-up (v1.0.20)
- Leaping clean over a Minion die now clears it (v1.0.19)
- Setup screen polish: drop lock emoji, silhouette locked Origins, raise callouts (v1.0.18)
- Unify toasts, kill callouts, and room callouts into one overlay spot (v1.0.17)
- Add achievement-gated Origin unlocks and Starting Boon picker (v1.0.16)
- Toast notifications: quick sweep-across banner instead of slow fade bubble
- Let the path-total badge overlap and grow instead of clipping
- Restyle flat list chips as inked game tokens, not app tags
- Fix white halo/bleed on monster and loot art; add art export/import tools
- Replace the Red Cross emblem on healing items with a heart
- Fix hard-to-read face chips on the loot screen
- Shrink the Camp screen's Upgrade Dice section and tighten overall spacing
- Pull the title button column up to overlap the cover art
- Revert title screen to full-height big art, shrink the button column
- Shrink title screen to 80% of viewport height, centered
- Make the title screen fill the whole phone viewport
- Remove top bar from all screens, use floating Settings button everywhere
- Remove the top bar entirely on the main game screen; move Settings into the util-rail
- Bump version to 1.0.2
- Collapse the top bar to just the Settings gear during encounters
- Add a visible semantic version number (v1.0.1)
- Remove emoji from character-select section headers
- Center-justify origin cards on the character-select screen
- Separate origin name from die name on character-select cards
- Write original flavor blurbs for Halfling and Pixie origins
- Move each origin card's labels above the art they name
- Flip mirrored dwarf portrait to match the other origins' orientation
- Fix remaining white halo on character portraits
- Re-randomize character-select portraits on every New Run
- Persist character-select portrait pick across page reloads
- Recolor the white-robed dwarf portrait to teal
- Properly fix halo artifacts across all art (previous fix was incomplete)
- Fix white halo around character portraits at small render sizes
- Increase combat-screen player portrait size by 50%
- Flip player portrait to face the dice tray during combat
- Fix two more monster-art bleed/wrong-crop issues found during art review
- Fix lingering neighbor-bleed on 38 monster-art entries
- Drop "more art is on the way" from Dice Compendium header
- Add origin starting-die art; fix path trail drifting on scroll
- Add hand-drawn loot-die art for all 52 Alloy/Gilded/Magic dice
- Fix portrait bleed/white-fringe and add 16 more monsters/shrines from new sheet
- Replace Dwarf/Gnome portrait pools instead of appending to them
- Fix monster-art mapping for the fungal/mycology row per labeled reference
- Replace all monster/origin art with new hand-drawn style, add Halfling/Pixie portraits
- Shrink and wrap enemy flavor text instead of truncating it
- Animate modal open/close instead of popping in and snapping away
- Fix shrine boon revealing before the room-entry callout is seen
- Replace all placeholder art with a CSS-only "mystery figure", like the campfire
- Main combat screen UI polish: framed portrait, tactile util-rail buttons
- General UI polish pass: icons on section headers, tactile button/card hovers
- UI/UX pass: real Camp screen, consistent modal chrome
- Cover the title's "1-4 Player Adventures" text by shifting buttons, not darkening
- Narrow/shift title buttons to hide cover text; silence camp-entry roll; add shrine room intro
- Add Dice Compendium to title screen; gate Loot die details behind discovery
- Let the title art show through behind the buttons; narrow the buttons
- Add cover art to title screen; give regular encounter kills a sound
- Add shrine-blessing chime and Victory confetti rain
- Add more juice moments: equip, floor transition, big player hits
- Add a proper title/landing screen ahead of character creation
- Add lifetime Achievements and combat screen-shake/particle juice
- Remove procedural dwarf portrait; fix setup/in-game portrait mismatch
- Fix stray fragment artifacts in portraits after outline thickening
- Remove white edge fringe from dwarf/gnome portraits, thicken outline
- Fit character-select screen to mobile viewport, add new dwarf portrait
- Shrink the app's max width to match its actual content
- Give the dice tray a minimum size so it never squishes
- Make the dice-scramble rattle louder
- Match Shrine entrance log text to combat encounters
- Carry one highest-tier die into your next run after a defeat
- Compact origin cards, crash-style damage sound, better dice rattle, swap die labels
- Realistic dice-rattle sound on tray scramble; curved Leap trail segments
- Add a sound for when the player takes damage
- Show tray dice as real die tiles in the swap/replace screen
- Faster per-die path playback; loot options wrap instead of scrolling
- Pitch-escalating hit tone, forcedFace cleanup fix, minion tooltip, status tooltips, swap UI improvements
- Sword-slash hit sound; center the log-event toasts
- Guarantee the very first encounter is never a Shrine or Trap
- Replace the turn-resolution modal with per-die animated playback
- Move the new-room banner onto the dice tray
- Hide the Debug class behind a secret trigger, add an in-run Win button
- Give the room-entry banner a solid background
- Make entering a new room more noticeable
- Code cleanup pass: remove variable-name shadowing of global helpers
- Add whole-tray rattle that plays alongside the per-die flip wave
- Fix portrait dmg/heal-flash overlay sticking fully opaque after animating
- Include the actual magnitude in enemy-action tooltips
- Add a conversion flourish to the class Skill ability
- Give Combo chains a visible ripple across the tiles that fed them
- Add a fade+rise transition between screens (Setup/Camp/Encounter/Victory/...)
- Turn the tray-reroll jitter-shake into an actual dice flip
- Make the encounter and player portraits react to hits/heals
- Fix stale dice tray carrying over into the next encounter
- Add an animated path trail line connecting tapped dice
- Give Boss kills and Overkill their own sound + callout, distinct from a normal kill
- Revert hand-drawn SVG art for 3 encounters + 4 loot dice, keep placeholders
- Fix shading/linework overlap in vector art; rebuild Rogue Golemancer as a dwarf
- Add first batch of vector monster/loot art, driven by the source docs
- Add persisted run history
- Fix remaining die icon/name-tag overlap
- Audit pass: remove dead code, unify overlay dedup, fix shrine-choice styling regression
- Add short first-run tutorial + manual "How to Play" access
- Fix shrine/loot popups stacking into duplicates
- Loot picker: die previews look like real tray dice; move Overkill badge
- Round fractional boss stats to whole numbers
- Collapse post-turn popup to 2 beats; make Skip resolve instantly
- Route bar tooltips, remove first-tip popup, fix die icon/name overlap
- Add a mouseover/long-press tooltip listing active status effects on health bars
- Simplify post-turn popup titles and text
- Bigger die-name text; tray panel no longer reserves empty space below
- Consolidate post-turn popups into one growing log
- Bigger die-name text; align util-rail portrait to tray bottom
- Arc die-name text along the top edge instead of truncating it
- Restore route-bar portrait alongside new util-rail character icon
- Enemy ability tooltips, drop Shrine/Trap chips, relocate character icon, add campfire placeholder
- Rework the Camp screen: drop the embedded log, fix text bunching, match game-screen height
- Fix stale Boost/Block wording in the manual
- Add a face preview to Camp die upgrades
- Add sound/haptics, reduced motion, keyboard shortcuts, magnitude-scaled damage numbers, and clearer regular-encounter action badges
- Add sequential path resolution reveal for multi-die paths
- Add a low-health warning vignette
- Add die-face tooltips, a forced-face highlight, and a Boost-target badge
- Add live damage-preview on the health bar and a Settings/Restart menu
- Add toast notifications, reducing reliance on the Log
- Five quality-of-life fixes: legal-move cue, camp confirm, save preview, segment status, Clear confirm
- Fix Boost being a no-op at its base tier; restore Block boost
- Boost no longer applies to Block
- Encounter card cleanup: quest health as a bar segment, tighter layout
- Shrink the Skill button and the enemy card height
- Move die name label to top, keep the effect at the bottom of the tile
- Fix dice overflowing the tray's bounding box
- Migrate Dungeon Scramble from single-file prototype to Claude Code project
