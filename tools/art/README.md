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
Now run: node build.js && node sim.js
```

Then, as always:

```
node build.js
node sim.js
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
`make_batches.py` builds the 3x2 repaint canvases (pink name, dashed guide box, current art scaled up to fit). Jeremy paints over them and drops `BATCH_<letter>_..._done.png` into DS Assets. To bring one back: crop inside each guide box, clear the pink line only at the box edges (some art is purple/pink), scale to the image's original size, and run `import_art.py` on a folder with those PNGs plus their manifest entries. Batches so far: B loot, C floor 1 monsters, D floor 1 traps + Heating Elemental (done); A (with Jeremy); E/F/G floor 2 (sent Oct 11; The Necrorancher is repainted in A, not G).
