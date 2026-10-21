# Art consistency study (Oct 21, 2026, build 1.41.71)

Jeremy asked for this sweep once all the art batches were in. It measures every picture as it renders on his phone (395x769 card, DPR 3), flags outliers, and compares three global options (A, B, C) with targeted fixes (T). Nothing in `src/` was changed.

**Comparison page (for the phone):** `page.html` with its `img/` folder, built in the session scratchpad (`.../scratchpad/consistency/`). It has the outliers, real fight screenshots, contact sheets, a before/after viewer (Now / A / B / C / T / A+T, plus zoom and press-and-hold to see today's version), and the decision questions.

## Short version

- **The set already hangs together.** After the paper texture and the black edge, about 10 of the 198 pictures look off. Most of the 30 statistical flags are the subject's own colours (black cats, ice, fire).
- **Blur is the biggest gap, and no filter fixes it.** 19 pictures are shown 1.3x to 1.82x their pixel size on the phone (Rogue Golemancer 1.82x, Goldberg's Rube Machine 1.76x, Grafted Grifter 1.72x). Loot (0.63x) and portraits (0.84x in fights, 1.02x on the largest setup size) are sharp.
- **Three fat outlines:** Healthy Hearth 6.9 px, Adhesive Pest Traps 6.8 px and Sacred(?) Geometry 6.6 px, against category medians of 3.7 to 4.4 px.
- **Four pictures look like they come from another game:** Grafted Grifter, Anti-Euclidian Space, Oilephant's Foot and Ergot Eruption (reasons below).
- **Repaints and untouched AI originals now match closely at game size.** The outlines differ by 0.2 px or less. The originals are only a little smoother (Dwarf/Gnome portraits: grain 11.8 vs 14.4).
- **`tools/art/consistency.py` has a bug:** its speck removal strips 4,236 real outline pixels from 181 of 186 pictures (98% of them on the silhouette edge). Fix it before any run.
- **Recommendation:** targeted fixes on the nine pictures, re-import the blown-up pictures at higher resolution, and at most option A as a light finishing coat. Skip B and C.

## Method

- Export: `tools/art/export_art.py` (202 images; 198 measured: 90 MONSTER_ART, 60 LOOT_ART, 48 portraits).
- On-screen sizes were measured in the built game with Playwright (`dist/dungeon_scramble.html`, 395x769). Face-off pictures render at 112.2 CSS px x `ENCOUNTER_SIZE` tall (shrines too). Loot shows at 26 px (tray, boon tiles) up to 46 px (camp tiles), and measurements use the 46 px case. Portraits use 112 px (fight); setup shows 84 to 136 px.
- Categories come from the game data: 37 monsters, 21 traps and bosses (12 traps, 6 bosses, 3 big bosses), 32 shrines, 60 loot, and 12 portraits per origin.
- Metrics per picture (script `metrics.py` in the scratchpad):
  - **Outer outline:** median run of near-black pixels (max channel < 48) from the silhouette edge inward, scanned in rows and columns, in CSS px. Counts only runs that end in a lighter fill.
  - **Inner line width:** mean stroke width of all near-black lines, from an octagonal erosion depth map (ridges, widths up to 15 source px; solid black areas excluded).
  - **Line colour:** mean colour of line pixels, leaving out the 2 px black edge (which is forced to #0c0705). Reported as R−B.
  - **Fill saturation and brightness:** median HSV S and V of opaque non-line pixels.
  - **Contrast:** standard deviation of luminance over opaque pixels.
  - **Warmth:** mean R−B of fills.
  - **Grain on screen:** luminance minus a 1.5 px Gaussian blur, standard deviation inside eroded fills, after resampling to device pixels. It also counts fine painted detail (see Ceramic Golem).
  - **Upscale:** device px / source px. Above 1.0 the phone stretches the picture (blur risk).
- **Outlier rule:** outside the category's median ± 1.5 IQR on a metric, and also a difference big enough to see (outline 1 px, line width 0.4 px, saturation 0.25, brightness 40, contrast 15, grain 5, warmth 60, line tint 8). Every flag was then checked by eye on contact sheets and in-game screenshots.
- **Repainted vs original:** this follows the brief. Every monster, trap, boss and shrine is a repaint. The originals are all 12 pixie portraits (left as they are, Jeremy Oct 21); Dwarf 0, 1, 2, 3, 5, 6, 7, 8; Gnome 0, 2, 3, 5, 6, 8, 11; and loot Greathammer, Spiked Shield, Buckler, Dagger, Unlabelled Mixture, Tarot Deck, Lance, Greataxe, Claymore, Rapier, Blunderbuss, Ironskin Draught, Hataxe, Drafter's Draught and Sporific Staff.

## Measurements by category

Median (min to max). Outline and line widths are in CSS px as rendered on the phone.

| Category | n | Outer outline | Inner line width | Line R−B | Fill saturation | Fill brightness | Contrast | Warmth | Grain | Upscale |
|---|---|---|---|---|---|---|---|---|---|---|
| Monsters | 37 | 3.7 (2.2–6.6) | 2.4 (1.4–3.8) | 3 (-6–15) | 0.67 (0.00–0.95) | 172 (92–231) | 59 (31–95) | 62 (-101–185) | 14.4 (7.4–20.3) | 1.10 (0.61–1.72) |
| Traps & bosses | 21 | 4.4 (3.1–6.8) | 2.6 (1.6–3.7) | 4 (-3–14) | 0.60 (0.02–0.95) | 151 (67–234) | 59 (26–105) | 53 (-66–208) | 13.3 (7.3–30.8) | 1.20 (0.92–1.82) |
| Shrines | 32 | 3.7 (2.8–6.9) | 2.5 (1.8–3.8) | 1 (-6–7) | 0.18 (0.00–0.95) | 202 (51–229) | 78 (39–96) | 7 (-196–170) | 17.5 (4.2–22.7) | 1.16 (0.86–1.76) |
| Loot (at 46 px) | 60 | 2.3 (1.2–3.4) | 1.5 (1.0–2.2) | 4 (-4–8) | 0.72 (0.02–0.95) | 160 (73–231) | 58 (32–87) | 55 (-108–182) | 11.5 (5.2–25.2) | 0.63 |
| Portraits: Dwarf | 12 | 3.4 (3.1–3.6) | 2.1 (1.9–2.3) | 2 (-1–9) | 0.79 (0.43–0.93) | 172 (101–215) | 65 (61–82) | 25 (-56–132) | 11.9 (8.8–16.0) | 0.84 |
| Portraits: Gnome | 12 | 3.4 (3.1–4.2) | 2.2 (2.0–2.6) | 4 (-3–7) | 0.90 (0.57–0.96) | 208 (93–230) | 69 (65–91) | 32 (-120–175) | 11.3 (8.2–17.1) | 0.84 |
| Portraits: Halfling | 12 | 3.9 (3.6–4.8) | 2.6 (2.2–2.9) | 5 (2–10) | 0.57 (0.29–0.80) | 184 (112–216) | 81 (70–90) | 58 (20–135) | 13.7 (11.5–16.4) | 0.84 |
| Portraits: Pixie | 12 | 4.2 (3.9–4.8) | 2.9 (2.6–3.0) | 0 (-3–6) | 0.74 (0.13–0.92) | 188 (136–229) | 73 (57–98) | -12 (-95–162) | 14.3 (10.3–18.9) | 0.84 |

What the table says:

- **Line colour is already uniform.** Every category's line tint sits within a few levels of #0c0705. The black-edge pass did this.
- **Outline weight on screen is close to the old 4.2 px target** for monsters, bosses, shrines and portraits (medians 3.4 to 4.4). Loot icons have thinner lines in screen px (2.3 px at 46 px, about 1.3 px in the 26 px tray), which is normal for a smaller icon. Their line weight relative to the icon matches the rest.
- **Halfling and Pixie portraits have heavier lines and more contrast** than Dwarf and Gnome (outline 3.9 to 4.2 vs 3.4; contrast 73 to 81 vs 65 to 69). That comes from how each origin is drawn, not from repaint vs original. It is visible side by side on the setup screen, but never in a fight.
- **Shrines have low saturation** (0.18) because many are grey stone (Scroll Dispensers, fountains). That is the subject matter.
- **Upscale:** 49 of the 90 face-off pictures render above 1.0x, and 19 of them above 1.3x (list below).

### Repainted vs original

| Group | n | Outer | Inner | Line R−B | Saturation | Brightness | Contrast | Warmth | Grain |
|---|---|---|---|---|---|---|---|---|---|
| Loot, repainted | 45 | 2.3 | 1.5 | 3 | 0.78 | 170 | 54 | 82 | 11.2 |
| Loot, original | 15 | 2.5 | 1.6 | 4 | 0.30 | 140 | 62 | 30 | 13.1 |
| Dwarf+Gnome portraits, repainted | 9 | 3.4 | 2.2 | 2 | 0.78 | 185 | 69 | 15 | 14.4 |
| Dwarf+Gnome portraits, original | 15 | 3.4 | 2.1 | 4 | 0.85 | 196 | 68 | 54 | 11.8 |

The loot originals' low saturation and warmth come from what they show: 7 of the 15 are plain steel blades or heads (Dagger, Lance, Greataxe, Claymore, Rapier, Greathammer, Hataxe). Repainted steel such as Greaterhammer has the same values (saturation 0.03). At game size, the line work of the two groups cannot be told apart. The portrait originals are slightly smoother (grain 11.8 vs 14.4). On the contact sheet, Dwarf 0 sits next to Dwarf 4 without standing out.

## Outliers

### Real style problems

| Picture | Category | Problem (measured) | Verdict |
|---|---|---|---|
| Grafted Grifter | monster | Scratchy, ragged contour with no clean outer line; shown at 1.72x (3rd highest), so it is soft and noisy at once | **Looks like another game** |
| Anti-Euclidian Space | trap | Contrast 29 vs 59; dark sketchy purple with no clean outer line | **Looks like another game** |
| Oilephant's Foot | monster | Charcoal body with grey lines (#1e1a17, the lightest line colour of all 198); contrast 45; 1.4x upscale | **Looks like another game** (a smudge) |
| Ergot Eruption | boss | The same charcoal-smoke style; lines #161413; contrast 43 | **Looks like another game** |
| Healthy Hearth | shrine | Outer outline 6.9 px vs 3.7; 1.38x upscale | Fat outline |
| Adhesive Pest Traps | trap | Outer outline 6.8 px vs 4.4; contrast 105 vs 59 (pale paper) | Fat outline |
| Sacred(?) Geometry | monster | Outer outline 6.6 px vs 3.7; inner lines 3.8 vs 2.4 | Fat outline |
| Blood-Drive Treats | shrine | Fill brightness 51 vs 202; grain 4.2 vs 17.5; 1.63x upscale | Dark, flat block |
| Rogue Golemancer | boss | Shown at 1.82x, the most stretched picture | Blurry |

### Blown up on the phone (upscale > 1.3x)

Rogue Golemancer 1.82, Goldberg's Rube Machine 1.76, Grafted Grifter 1.72, Surgery Community Theatre 1.69, Ferrous Maiden 1.68, Blood-Drive Treats 1.63, Ark of the Flood 1.59, Ruinous Rune Room 1.53, Faustian Spreadsheet 1.51, Myceleus 1.46, Oilephant's Foot 1.40, Fungal Flayer 1.40, Healthy Hearth 1.38, Blastogenesis Engine 1.37, Displacer Lair 1.33, Grosteque Grafter 1.32, Charged Fae-Lines 1.32, Bio-Mutant Escape 1.32, Extruzeon 1.31.

These are 254 to 330 px tall and show at 123 to 186 CSS px (369 to 558 device px). The paper grain on them is soft as well, because it was applied at source resolution.

### Flagged by the numbers, fine by eye

- **Mostly black subjects:** Displacer Kitty, Displacer Lair, Domesticated Displacer, Extractnid Matriarch, Untamed Unicrows, Pixie 5, Halfling 10 (dark hair).
- **Colour of the subject:** Pixie 8 (white); Loot-Diagonalizer, Alchemists Stone and Drafter's Draught (blue/ice); Sacred Bellows and Goldberg's Rube Machine (fire).
- **Design choices:** Viscous Orb (a slime with few lines); Filement Bunny (the black body is the design).
- **False alarm:** Ceramic Golem's grain flag (30.8 vs 13.3) is its porcelain pattern, not texture. It reads fine.
- **Too small to see:** Unbound Automa and Morel Dilemma (line tint under 10 levels). Loot inner-line flags (273.15 Kelvin Box, Thorned Bulwark, Buckler, Poison Sword, Dodecahedron of Future Pasts, Measurably Lucky Test Tube; 1.0 to 2.2 px) and Straw of the Last Lamia's grain cannot be seen at 26 to 46 px.

## Options (before/after on the page)

Sample: 13 typical pictures (3 monsters, 2 traps/bosses, 2 shrines, 3 loot, 3 portraits), 5 originals (Dwarf 0, Gnome 2, Greathammer, Dagger, Tarot Deck) and the 11 outliers. Pixies were left out of every option.

| Option | What it does | Measured change | Risks |
|---|---|---|---|
| **A** `consistency.py` defaults (pull 0.35 toward 166) | Lines to #0c0705 (60% mix), saturation knee at 0.7, brightness pull, warm tint (R x1.03, B x0.94), grain only on flat fills (never triggered: every picture already has paper) | Mean colour change 7 RGB levels (max 16). Brightness spread (IQR) monsters 73 → 50, loot 74 → 51; contrast spread 25 → 19. Line tint becomes uniform. Outline, grain and upscale unchanged. | Barely visible, as on Oct 12. The norm of 166 is above today's median (153), so it brightens the set slightly. The tool's speck bug eats edge pixels (see below). Its lossy WebP save adds a generation of compression. |
| **B** stronger: pull 0.7 toward 153 (today's median, so no global shift), knee 0.62/0.35, lines 100% #0c0705, contrast pulled 30% toward 60 | The same steps, harder | Mean change 13 levels (max 30). Brightness spread −45 to −55%, contrast spread −50%. Outline, grain and upscale unchanged. | **Flattens subjects, not style.** Pale pictures go dingy (Adhesive Pest Traps brightness 234 → 194 and turns olive; Healthy Hearth 217 → 187). Dark ones are lifted (Blood-Drive Treats 51 → 69). It loses Jeremy's colour choices. |
| **C** B + `handdrawn.py` on the 30 unrepainted non-pixie originals | Clean route: pre-paper original from f6480d4, upscaled to today's size, hand-drawn filter, paper and black edge again, then B | Portraits: grain 11.8 → 14.0 (repaints 12.3 after B), outer outline 3.4 → 3.6. Loot: grain 13.1 → 17.8 vs 11.7 for repaints, outline 2.5 → 2.7 | Moves portraits slightly toward the repaints, but loot **away** (the originals were already grainier). The naive route (filter on top of the paper) smooths the paper away (grain 11.8 → 10.0) and adds a second wobble to the outline. Shading darkens the lower right twice (paper already does it). |
| **T** targeted, 9 pictures | Outer-line thinning through line-coloured pixels only, then the 2 px black edge again (Healthy Hearth −6, Sacred(?) Geometry −6, Adhesive Pest Traps −5 source px); near-black → pure line colour (Oilephant's Foot, Ergot Eruption); contrast and lift (Anti-Euclidian Space 1.4/1.1, Blood-Drive Treats 1.2/1.2); unsharp mask (Grafted Grifter, Rogue Golemancer) | Outlines 6.9/6.6/6.8 → 4.6/5.0/5.3 px. Contrast 29 → 35 (Anti-Euclidian), 39 → 47 (Blood-Drive). Everything else untouched. | Thinning works well. The line and contrast tweaks on the smudgy pictures help only a little, because they cannot draw a clean outline that is not there. Sharpening is a stopgap and adds grain (Grafted Grifter 14.9 → 21.4). |

None of A, B or C touches the visible problems (outline weight, texture outliers, blur). Mostly they narrow brightness and contrast, which differ mainly because of the subjects.

### Bug in `tools/art/consistency.py` (not fixed; the brief said not to edit the repo)

`drop_specks` builds each row's candidate list (`np.flatnonzero(m[y] & (lab[y] == 0))`) *before* flooding. A pixel that an earlier flood in the same row already labelled still starts a new 1-pixel "component", which is then deleted as a speck. On today's art it removes 4,236 pixels from 181 of 186 pictures, and 98% of them lie on the silhouette edge, so it nibbles the black edge. Fix: skip `x` when `lab[y, x]` is already set (the scratchpad `cons_fast.py` does this). With the fix, real specks are found in 59 pictures (1,487 px). Most of them are faint leftover halo pixels; Poison Sword has the most (427 px in a ring around the blade). Also: the script saves WebP at default lossy quality, so `--lossless`, or saving PNG, would avoid a generation loss before `import_art.py` recompresses.

## Recommendation (ranked)

1. **Targeted fixes (T) on the 9 pictures, and fix the speck bug** (that bug fix alone also cleans the faint halo pixels from 59 pictures). This touches only what looks wrong.
2. **Fix blur at the source:** re-import the 19 pictures shown above 1.3x from Jeremy's repaint canvases at about 2x (`reimport_hires.py`; no repainting needed). It is the biggest single step toward one crisp look. Until then, the sharpen in T helps Grafted Grifter and Rogue Golemancer a little.
3. **Option A as a light finishing coat, optional:** safe (7 levels on average), lines come out one colour, and brightness spread shrinks by 30%, but players will hardly see it. If run, use the speck-bug fix, save lossless and set `--bright 153`.
4. **Skip B and C.** B mostly drains colour choices. C makes loot less consistent. For portraits it is a style choice that should wait until the Dwarf/Gnome repaint question is settled (Jeremy is checking whether the painted S/T/U/V canvases were uploaded).

## Decisions for Jeremy

1. **Apply the targeted fixes to the 9 pictures?** Recommended: **yes**, after checking each one in the page viewer (T and A+T). Each can be reverted on its own.
2. **Grafted Grifter, Anti-Euclidian Space, Oilephant's Foot, Ergot Eruption: filter fix or repaint?** Recommended: **a light repaint pass** that gives them crisp black outer lines. The filter can raise contrast, but it cannot draw a clean outline that is not there.
3. **Re-import the 19 blown-up pictures at higher resolution?** Recommended: **yes**, from the existing canvases at 2x (no new painting).
4. **Global pass: none, A or B? And hand-drawn?** Recommended: **A at most** (bug fixed, bright 153), or none. Not B. Use hand-drawn only on Dwarf/Gnome portraits, and only after the missing repaints are settled; never on loot.

## Files

Everything is in the session scratchpad `consistency/` folder; outputs are not in the repo:

- `page.html` and `img/`: the comparison page (about 5.4 MB of WebP).
- `scripts/`:
  - `measure_display.js`, `measure_ctx.js`: rendered sizes;
  - `metrics.py`, `summarize.py`: metrics, IQR flags and style distance;
  - `contact.py`: contact sheets;
  - `cons_fast.py`: vectorised `consistency.py` with the speck fix and option-B knobs;
  - `targeted.py`: option T;
  - `c_pipeline.py`: option C, clean and naive;
  - `scenes.js`: fight screenshots with a swapped-in picture;
  - `build_variants.py`, `pair.py`.
- `work/summary.json`: all per-picture metrics and flags.
- `opt/{A,B,Cfull,Cnfull,T,AT}`: processed full sets, ready for `import_art.py` if a choice is made. Copy `manifest.json` in first; pixies are untouched copies.
