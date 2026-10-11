# Dungeon Scramble — TODO

## Priority order
1. **Maneuver-dice payoff.** Study whether Maneuver dice/actions are useful versus Attack, then design a payoff. Run the studies with `tools/balance`. Boost on an upgraded Maneuver die is a last resort only.
2. **Shrine overhaul.**
3. **Sound / music** and 4. **art**, worked in parallel.

## Other items
- **Design-consistency audit**, plus a rewrite of the quest descriptions.
- **Sound effect pass:** audit the actions and cut redundancy; one consistent theme; a rising-note melody for tension/success; dice materials change the roll sound; stronger enemy-turn and shrine sounds; airier Maneuver/dodge sounds.
- **Background music pass:** heavy klezmer harmonic-minor battle music; success/loot music; different orchestration per floor.
- **Shrine overhaul:** more presence in animation and timing; many more shrines, as a way to add relics; conversion-relic idea (e.g. 1 damage per Shield gained).
- **Add back reroll faces and swap faces.**
- **Redesign the class depth badges** so each one represents its class visually.
- **Art PNGs:** floor and archway bricks, relic art, and eventually a chest paintover (last priority).
- **Layered cover art:** parked (original layers unavailable).
- **Balance tuning and depth (heat) polish:** reduce one-shot kills on higher floors before tuning depth. Also from the v1.32.76 run review: floor 3's curve runs backwards (the first two rooms nearly killed the tester; the last three plus the Big Boss cost 2 HP total), and Extruzeon attacked only once (fully blocked) in 5 turns because its 3-step cycle plus the 20+ damage freeze leaves it nothing to threaten with. Raise the late-floor pressure, but don't rework the boss cycle without the owner's go-ahead.
- **Rulebook refresh** (rulebook is at build 1.32.28). Also: the unreproduced "thousands of enemy HP on resume" bug, and the Armsmaster red Skill vs red Clear question.
- **Replay tool** for the tray/path telemetry, once playtesters have the new build.
