# Class re-baseline after the Dungeoneer wrap fix, and the Grosteque Grafter (Oct 14, build 1.41.11)

Why: the tester found that the Dungeoneer's edge wrap let any die in the edge zone step straight up or down (fixed in 1.41.8). Every earlier bot study used that rule, so the Dungeoneer's numbers were too high. The tester's 11-turn Grafter fight prompted the second question.

Setup: snapshot build 1.41.11 (`tools/balance/snap_1411.html`), `study_maneuver.js`, 200 runs per origin x class pair. Profiles as in the Oct 13 re-baseline (expert = skill 1500; regular and new = the calibrated profiles). "1.41.0" columns are the Oct 13 re-baseline; between the two builds only the wrap fix touches classes, but six loot dice and Swarming also changed, so small all-class shifts are not the wrap fix. With 800 runs per class, differences under about 3 points are noise.

## 1. Class win rates

| Profile | Armsmaster | Guard | Dungeoneer | Arcanist | All |
|---|---|---|---|---|---|
| Regular, depth 0, 1.41.0 | 66 | 70 | 77 | 77 | 73 |
| Regular, depth 0, 1.41.11 | 67 | 71 | **73** | 75 | 71 |
| New, depth 0, 1.41.0 | 41 | 43 | 60 | 61 | 51 |
| New, depth 0, 1.41.11 | 44 | 48 | **58** | 62 | 53 |
| Expert, depth 0, 1.41.0 | 97 | 99 | 94 | 95 | 96 |
| Expert, depth 0, 1.41.11 | | | **92** | | |
| Expert, depth 7, 1.41.0 | 49 | 54 | 31 | 37 | 43 |
| Expert, depth 7, 1.41.11 | EXPERT_D7 |

(Depth 7 loadout: Tougher Scuffs 1, Zeal 1, Rationing 1, Swarming 1. "Depth 7" is the internal number used by the studies; shown in game as 6.)

What it means:
- For regular and new players the fix barely matters: Dungeoneer loses about 2-3 points and is still one of the two easiest classes to learn on. Jeremy's Oct 13 call stands (new players learn on a class that carries them further).
- For experts at depth the fix matters a lot: the Dungeoneer drops from 31% to 22%. DUNGEONEER_D7_NOTE

## 2. Grosteque Grafter fight length

Every Floor 1 boss forced to be the Grafter, 200 runs per class.

| Profile | Class | Median turns | 8+ turns | 11+ turns | Longest | HP lost | Ends the run |
|---|---|---|---|---|---|---|---|
| Regular | Armsmaster | 4 | 9% | 2% | 20 | 8.8 | 3.0% |
| Regular | Guard | 5 | 24% | 10% | 29 | 8.2 | 2.5% |
| Regular | Dungeoneer | 5 | 25% | 9% | 47 | 11.5 | 3.0% |
| Regular | Arcanist | 5 | 11% | 4% | 21 | 8.6 | 2.5% |
| New | Armsmaster | 5 | 18% | 5% | 16 | 10.6 | 6.5% |
| New | Guard | 6 | 31% | 14% | 30 | 9.7 | 8.1% |
| New | Dungeoneer | 6 | 26% | 10% | 22 | 12.4 | 4.5% |
| New | Arcanist | 4 | 17% | 6% | 18 | 8.8 | 3.0% |

The other Floor 1 bosses, natural draw, regular players: Heating Elemental median 5 turns, 0% go 8+; Rogue Golemancer median 4, 1% go 8+. The Grafter: median 5, **18% go 8+**.

The Grafter is not deadlier than the other Floor 1 bosses (it ends 2-8% of runs that meet it, like the others); it is a slog. Grafted Plate (Shield 5) and Harvest (heal 4) cancel most of an early low-damage tray's output, so Guard and Dungeoneer (no damage conversion) and new players get stuck. The tester's 11-turn fight is a normal outcome, not a fluke.

GRAFTER_VARIANTS

## Decision points for Jeremy
DECISIONS
