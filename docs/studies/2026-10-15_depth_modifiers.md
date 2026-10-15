# What each depth modifier costs (Oct 15, build 1.41.22 snapshot)

Jeremy (Oct 15): reprice the modifiers that are really off; working out the cheapest set is part of the fun, so modest unevenness is fine.

Setup: `tools/balance/bg_depthmods.py`. Expert bot (skill 1500), 4 origin/class pairs x 150 runs = 600 runs per row. Base = Tougher Scuffs 2 (shown depth 2): 71.3% wins. Each row adds one modifier rank; "win drop" is against the rank below it. With 600 runs a row, single-rank drops are good to about +/-5 points.

| Modifier | Rank | Depth cost | Win drop | Per depth point |
|---|---|---|---|---|
| Tougher Scuffs | 3 | 1 | 14.7 | 14.7 |
| Tougher Scuffs | 4 | 1 | 7.3 | 7.3 |
| Rationing Rations | 1 | 1 | 9.8 | 9.8 |
| Rationing Rations | 2 | 2 | 8.8 | **4.4** |
| Clumsy | 1 | 1 | 11.2 | 11.2 |
| Clumsy | 2 | 1 | 12.0 | 12.0 |
| Clumsy | 3 | 2 | 18.0 | 9.0 |
| Swarming | 1 | 1 | 9.8 | 9.8 |
| Swarming | 2 | 2 | 12.8 | 6.4 |
| Burden of Choice | 1 | 1 | 8.0 | 8.0 |
| Zeal | 1 | 3 | 37.0 | 12.3 |
| Zeal | 2 | 1 | 4.8 | 4.8 |
| Dread | 1 | 1 | 15.0 | 15.0 |
| Dread | 2 | 1 | 5.3 | 5.3 |
| Dread | 3 | 1 | 9.2 | 9.2 |
| Union Dues | 1 | 1 | 5.8 | 5.8 |
| Rounding Error | 1 | 1 | 16.7 | **16.7** |
| Night Shift | 1 | 1 | 7.0 | 7.0 |
| Night Shift | 2 | 2 | 21.5 | 10.7 |

Average: about 9-10 win points per depth point at this difficulty.

Changed (1.41.24):
- **Rounding Error 1 -> 2 depth.** Heal faces healing 1 less costs as much as two average depth points.
- **Rationing Rations rank 2: 2 -> 1 depth.** "Rest heals nothing" on top of "half" costs about one point's worth.

Left as they are (cheap or dear, but within the "find your own cheapest set" range): Union Dues and Zeal rank 2 are cheap (about 5 per point, already at the minimum cost of 1); Dread's ranks average 10 per point (rank 1 includes Floor 1's own Deadly card); Tougher Scuffs 3-4 average 11; Swarming 2 (6.4) is a little cheap.
