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
| Expert, depth 7, 1.41.11 | 45 | 50 | **22** | 34 | 38 |
| Expert, depth 7: Dungeoneer + top-bottom wrap (all four edges wrap) | | | 35 | | |
| Expert, depth 7: Dungeoneer + Skill (once a turn, a zone die becomes a Pivot) | | | 36 | | |

(Depth 7 loadout: Tougher Scuffs 1, Zeal 1, Rationing 1, Swarming 1. "Depth 7" is the internal number used by the studies; shown in game as 6.)

What it means:
- For regular and new players the fix barely matters: Dungeoneer loses about 2-3 points and is still one of the two easiest classes to learn on. Jeremy's Oct 13 call stands (new players learn on a class that carries them further).
- For experts at depth the fix matters a lot: the Dungeoneer drops from 31% to 22%. Every class lost 3-5 points at expert depth 7 between the builds (the loot-dice retune and Swarming change), so about 5 of the Dungeoneer's 9 points are the wrap fix. It is now clearly the weakest class for skilled players at depth: 22% against Arcanist 34%, Armsmaster 45%, Guard 50%.
- Either of the two Dungeoneer ideas tested on Oct 13 brings it back to about Arcanist level at expert depth 7 (35-36%). Neither was run for regular and new players this time; on Oct 13 both raised the Dungeoneer there too, where it is already one of the strongest classes.

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

### Fixes tested (regular players, Grafter forced, 800 fights each)

| Variant | Median turns | 8+ turns | 11+ turns | Longest | HP lost | Ends run | 8+ turns, Guard / Dungeoneer |
|---|---|---|---|---|---|---|---|
| Today (50 HP, Shield 5, Heal 4) | 5 | 17% | 6% | 47 | 9.3 | 2.8% | 24% / 25% |
| Harvest heals 2 | 5 | 16% | 5% | 29 | 9.0 | 2.1% | 20% / 23% |
| Plate Shield 3, Harvest heals 2 | 5 | 15% | 5% | 27 | 8.7 | 1.8% | 20% / 19% |
| 40 HP (Shield 5, Heal 4) | 4 | 14% | 5% | 40 | 8.1 | 1.5% | 19% / 14% |

Shrinking its shield and heal cuts the extreme fights (longest 47 -> 27-29 turns) but barely moves how often fights run long. Lowering its Health to 40 (the Heating Elemental's) helps the slow classes most (Dungeoneer 25% -> 14%). None of the fixes makes it a pushover; it would still be the longest Floor 1 boss. A 40 HP + Heal 2 combination was not tested.

## Decision points for Jeremy
1. **Dungeoneer at depth (experts only).** Decided Oct 14: **leave it for now.** (Options were: leave it (it is the easiest class to learn on, and the balance philosophy allows classes to differ), or give it one of the tested boosts. The Oct 12 decision was "Dungeoneer unchanged for now"; that was with the buggy wrap.)
2. **Grosteque Grafter.** Decided Oct 14: **trimmed to 40 HP** (1.41.13). (Options were: leave it as the slow, grindy Floor 1 boss (it isn't more dangerous, just longer), or trim it: 40 HP helps most; Heal 2 / Shield 3 mainly removes the 30-47 turn extremes.)
3. **Night Shift does more than it says** (found during the rulebook audit). Its rank 1 text says "Easy rooms become Standard rooms", but the code also turns every Standard room into an Elite (and so removes shrine chances from those rooms). The tester's depth-2 win was played with it. Fix the code to match the text, or rewrite the text to match the code.
