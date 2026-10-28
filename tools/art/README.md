# Art export / import workflow

All of Dungeon Scramble's art (portraits, monster art, loot icons, the
cover) is embedded as base64 PNGs inside `src/assets.js`. Editing that by
hand is painful, so these two scripts let you work with plain PNG files
instead.

## Exporting art to edit

```
python3 tools/art/export_art.py [output_dir]
```

This writes one `.png` (or `.jpeg` for the cover art) per embedded image
into `output_dir` (defaults to `tools/art/export/`), named like:

- `DWARF_PORTRAITS__0.png` ... `__11.png` (and the same for GNOME/HALFLING/PIXIE)
- `MONSTER_ART__Filement_Bunny.png`, `MONSTER_ART__Flaming_Sconce.png`, ...
- `LOOT_ART__Greathammer.png`, `LOOT_ART__Healing_Draught.png`, ...
- `GNOME_SILHOUETTE__value.png`, `CAT_SILHOUETTE__value.png`
- `COVER_ART__value.jpeg`

Alongside the PNGs it writes a `manifest.json` that records, for every
file, exactly which `const` and key/index it came from, plus a sha256 so
the import step can tell which files you actually changed.

Hand the whole folder to whoever is editing the art (or just open the
PNGs yourself). **Keep each file's name exactly as exported** -- that's
how the import step knows where it belongs.

## Editing tips

- Keep the background transparent. Don't flatten onto white -- that's
  exactly what caused the "white haloing" bug that was just fixed across
  the whole art set. If your editor forces a background, make sure you
  re-punch-out transparency (alpha) before saving, not just visually
  crop a white edge.
- Save as PNG (24-bit + alpha). JPEG has no transparency and will break
  anything but `COVER_ART`.
- Don't resize canvas/crop in a way that changes where the character sits
  relative to the frame, unless you're fine with it looking shifted
  in-game -- these are composited at a fixed size.

## Importing edited art back in

```
python3 tools/art/import_art.py <folder_with_manifest_and_pngs>
```

This reads `manifest.json` in that folder, compares each PNG's content
hash against what's currently in `assets.js`, and only re-splices the
files that actually changed. Everything else is left untouched. It
prints exactly what it updated, e.g.:

```
updated MONSTER_ART[Filement Bunny]  <-  MONSTER_ART__Filement_Bunny.png  (15219 -> 15460 bytes)
1 image(s) updated, 178 unchanged, 0 file(s) from manifest not found in folder.
Now run: node build.js && node tools/check.js quick
```

Then, as always:

```
node build.js
node tools/check.js quick
```

to rebuild `dist/dungeon_scramble.html` and run the regression sim
before shipping.

## Practical use with Claude

The easiest way to use this day-to-day: ask Claude to run
`export_art.py`, zip the result, and send it to you. Edit whichever PNGs
you want changed (in any image editor) and upload the edited files (or
the whole folder) back into the conversation. Ask Claude to run
`import_art.py` against what you uploaded -- it'll only touch the files
you actually changed, rebuild, and run the regression sim.

## Repaint batches (Jeremy's iPad retouch)
`make_batches.py` builds the 3x2 repaint canvases (pink name, dashed guide box, current art scaled up to fit). Jeremy paints over them and drops `BATCH_<letter>_..._done.png` into DS Assets. To bring one back: crop inside each guide box, clear the pink line only at the box edges (some art is purple/pink), scale to the image's original size, and run `import_art.py` on a folder with those PNGs plus their manifest entries. Batches so far: B loot, C floor 1 monsters, D floor 1 traps + Heating Elemental (done); A (done Oct 12; 3x3 canvas, 2160x2310); E/F/G floor 2 (sent Oct 11; The Necrorancher is repainted in A, not G). H/I floor 3 monsters and traps, J floor 3 Big Bosses + Toadtaur Warrior, Eelagator Escapee, Whence Wolf, K the other new monsters (sent Oct 12). Oilephant's Foot isn't exported by export_art.py (escaped apostrophe in its key); pull it out with node and add a manifest entry by hand. Long names wrap to two label lines. Items with no picture yet get silhouette canvases from `make_silhouette_batches.py` (a black silhouette of a similar picture as a shape guide; import the result by its content bounds): L/M/N the 16 stand-in shrines + Scroll Dispensers AWSP/DOER, O the 4 new Magic dice (sent Oct 12). E/F/G were re-sent Oct 12 with current art (G is now The Strike/Break-er, Bellicose Biomancer, Ceramic Golem). E back and imported Oct 15 (Kitty and Technician needed `--names`: repaints that change a design too much will not auto-match).

## Hand-drawn texture pass (test, Oct 12)
`handdrawn.py in.png out.png [seed] [strength]` gives a flat, clean portrait the look of Jeremy's repaints: a slight outline wobble, a heavier near-black outline (only pixels darker than 42 on every channel, so dark hair or vests aren't swallowed), brush grain in the fills and a soft shadow toward the lower right. Tested on HALFLING_PORTRAITS[0] and GNOME_PORTRAITS[0]; not applied to the game yet.

## High-resolution re-import (Oct 12)
`reimport_hires.py <export_dir> <out_dir> BATCH_*_done.png ... [--scale 2]` finds every dashed guide box on returned canvases (joins boxes whose sides were painted over), clears the pink line, recognizes the picture by matching it against the current art, and rebuilds it at 2x the old size with the same padding, so it shows at exactly the same size but sharper. Then `import_art.py <out_dir>`. Use this (not a resize to the old size) for every returned batch from now on.

## Paper texture and WebP (Oct 15, 1.41.26)
All portraits, monsters and loot pictures carry the medium paper texture (`paper.py`, strength 1.0; Jeremy's pick). `reimport_hires.py` applies it to returned repaints automatically (`--no-paper` to skip). `import_art.py` now stores art as WebP (quality 85, alpha kept; `--png` to keep PNG) because the texture made PNGs about 5x bigger. Exports now come out as `.webp` files; edit them or convert to PNG, either imports fine.
