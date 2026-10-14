# Playtest data: first tester, 2 runs (1.41.7, Oct 14)

Source: two exports from one tester (player id p-ivd33sozzjy7, phone 360x699). The second export includes both runs. Two runs are an anecdote, not a sample: nothing here justifies a retune on its own.

## The runs

| | Run 1 | Run 2 |
|---|---|---|
| Build | Gnome Armsmaster | Halfling Dungeoneer |
| Depth | 1 | 3 (Night Shift 1, Union Dues) |
| First run with this class? | yes | yes |
| Result | Won | Won (one down on Floor 3, saved by the Back Pocket) |
| Length | 66 min, 53 turns | 68 min, 66 turns |
| Damage taken F1 / F2 / F3 | 17 / 13 / 37 | 39 / 58 / 96 |
| Relics | Combonatorics, Bisection Method, Bloodthirst | Prime Edge |
| Best turn | 47 (Myceleus) | 102 (Toadtaur Wizard, overkill by 70) |
| Median time per turn (incl. playback) | 30 s | 21 s |

## What it says

1. **This tester is strong.** Won both runs, first try with each class, including depth 3. The regular-player bot wins 73% at depth 0; a human winning at depth 3 on the first class run fits a skilled player. We need newer players' exports before reading anything about difficulty.
2. **The lethal warning worked as designed.** The only down (Gnome Chomper heavy turn, 15 damage at 10 HP, Floor 3) was warned at the start of the turn and still showing at Go. The tester chose to press Go, and a Back Pocket roll saved them. It counts as a fair down.
3. **Floor 3 does its job.** Damage taken roughly doubles on Floor 3 in both runs; 6-10 damage hits were common (Profane Geometry three 6s in one fight; Sacred(?) Geometry a 10 that left 1 HP). No unwarned big hit.
4. **Class abilities are used a lot.** Armsmaster converted a die on 46 of 53 turns (13 of those after a Clear and redo, which logs twice). Dungeoneer used the edge wrap on 39 of 66 turns (47 wraps).
5. **Maneuver I dice are the first thing replaced.** 20 of 30 loot equips replaced a Maneuver Die I (Attack Die I: 3). Expected (it's the weakest die), but it means trays turn into all-Attack/loot by Floor 2. Worth keeping an eye on together with the Maneuver II/III ladder.
6. **One slog: Grosteque Grafter, 11 turns** (run 2, depth 3, Floor 1 boss). With Grafted Plate (Shield 5) and Harvest (heal 4) every three turns, a low-damage early tray dealt about 4 net damage per turn. It went quickly in real time (2.5 min) and the player took little damage, but 11 turns is about twice any other fight. If more exports show this, a smaller heal or plate is the lever. Not changing yet.
7. **Big player turns happen** (102 damage, overkill by 70). That's the "crazy combo" kind of memory the balance philosophy wants; no action.
8. **Runs are long for mobile:** about 67 minutes each. Fight time is mostly thinking (Illegal Operation 185 s, Myceleus 302 s). Not a problem by itself, but the pacing study's Floor 2 HP trims would shorten runs if Jeremy wants that.
9. **Swap use:** Cool Whip was swapped 10 times in run 2; rerolls 5 per run. Tray actions are being found and used.

## Take rates (both runs; tiny counts)

Never taken when offered 2+ times: Rapier (0/2), Whip (0/2), Glacial Gorget (0/3), Portable RNGenerator (0/2), Domesticated Displacer (0/2), Pre-handy-sile Tail (0/2), Hospitaler's Merciful Guillotine (0/2). Always taken: Unlabelled Mixture (2/2), Drafter's Draught (2/2), Straw of the Last Lamia (2/2), Dodecahedron of Future Pasts (2/2), Charge-Atlatl (2/3). Track these across testers before acting; the loot dice study (2026-10-13_loot_dice.md) is the bot-side comparison.

## Telemetry notes

- Class ability double-logs when a player Clears and re-uses it in the same turn. Harmless, but per-turn counts should dedupe by (room, turn).
- After a Back Pocket save, the same turn number logs a second `turn` event. Also harmless; the analysis should expect it.
