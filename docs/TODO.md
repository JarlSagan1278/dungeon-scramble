# Dungeon Scramble — TODO

## Priority order
1. **Playtest 1.35.0 (boss rework + encounter tiers)** and collect play data. Watch Floor 2 (bot deaths concentrate there: Ceramic Golem, Bellicose Biomancer, elite rooms), Heating Elemental on Floor 1 (11% of bot runs die there), and Myceleus vs Extruzeon (8 vs 21 HP lost per fight). Re-measure tiers after real data; `tools/balance/study_tiers_bosses.py`.
2. **Maneuver-dice payoff.** Studied Oct 11 (`docs/studies/2026-10-11_maneuver_study.md`): Maneuver dice are a net loss today, and the v1.32.76 tester dropped them first. **On hold:** Jeremy wants more play data before changing the Maneuver meta. Leading candidate is Dodge Block (each Dodge gives 1 Block); Momentum is the alternative. Boost on an upgraded Maneuver die is a last resort only.
3. **Shrine overhaul.**
4. **Sound / music** and 5. **art**, worked in parallel.

## Other items
- **Design-consistency audit**, plus a rewrite of the quest descriptions.
- **Sound effect pass:** audit the actions and cut redundancy; one consistent theme; a rising-note melody for tension/success; dice materials change the roll sound; stronger enemy-turn and shrine sounds; airier Maneuver/dodge sounds.
- **Background music pass:** heavy klezmer harmonic-minor battle music; success/loot music; different orchestration per floor.
- **Shrine overhaul:** more presence in animation and timing; many more shrines, as a way to add relics; conversion-relic idea (e.g. 1 damage per Shield gained).
- **Add back reroll faces and swap faces.**
- **Redesign the class depth badges** so each one represents its class visually.
- **Art PNGs:** floor and archway bricks, relic art, and eventually a chest paintover (last priority).
- **Layered cover art:** parked (original layers unavailable).
- **Balance tuning and depth (heat) polish:** reduce one-shot kills on higher floors before tuning depth. Also from the v1.32.76 run review: floor 3's curve runs backwards (the first two rooms nearly killed the tester; the last three plus the Big Boss cost 2 HP total), and Extruzeon attacked only once (fully blocked) in 5 turns because its 3-step cycle plus the 20+ damage freeze leaves it nothing to threaten with. Raise the late-floor pressure, but don't rework the boss cycle without the owner's go-ahead. Enemy-pressure study (same report): raising enemy hit damage adds threat without lengthening fights; HP is the lever for one-turn kills; Big Boss hit damage can rise cheaply; Floor 3 needs per-encounter tuning (Self-Replicating Forge causes most bot deaths; Morel Dilemma, Myceleus and others deal almost nothing).
- **Rulebook refresh** (rulebook is at build 1.32.28). Also: the unreproduced "thousands of enemy HP on resume" bug, and the Armsmaster red Skill vs red Clear question.
- **Replay tool** for the tray/path telemetry, once playtesters have the new build.
