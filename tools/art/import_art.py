#!/usr/bin/env python3
"""
Re-splice edited PNG files back into src/assets.js, using the manifest.json
produced by export_art.py to find each image's exact location.

Usage:
    python3 tools/art/import_art.py <folder_with_manifest_and_pngs>

Only files whose content actually differs from what's currently in
assets.js are touched (compared by sha256), so you can freely re-run this
against a folder where most images are untouched -- it reports what
changed and leaves everything else alone.

Each replaced image is re-encoded as an optimized PNG (keeping its own
pixel data exactly as provided -- this script does NOT re-run the
halo-fix pipeline; run fix_all_halos-style cleanup separately first if an
edited image was painted on a non-transparent background and needs its
edges cleaned up).
"""
import re, base64, io, json, sys, os, hashlib
from PIL import Image

ASSETS_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'assets.js')
ASSETS_PATH = os.path.abspath(ASSETS_PATH)

def find_value_span(src, const_name, key, open_ch):
    """Return (start, end) byte offsets of the base64 payload for this
    const/key, so it can be sliced out and replaced."""
    const_m = re.search(r'\nconst ' + re.escape(const_name) + r'\s*=\s*.', src)
    if not const_m:
        raise ValueError(f'const {const_name} not found')
    search_from = const_m.start()

    if open_ch == '[':
        # Nth data:image match after this const's start
        idx = int(key)
        it = re.finditer(r'data:image/(\w+);base64,([A-Za-z0-9+/=]{200,})', src[search_from:])
        for i, m in enumerate(it):
            if i == idx:
                return search_from + m.start(2), search_from + m.end(2), m.group(1)
        raise ValueError(f'index {idx} not found in {const_name}')
    elif open_ch == '{':
        # find `'key':` or "key": then the following data:image match
        key_pat = re.compile(r'[\'"]' + re.escape(key) + r'[\'"]\s*:\s*[\'"]')
        km = key_pat.search(src, search_from)
        if not km:
            raise ValueError(f'key {key!r} not found in {const_name}')
        m = re.compile(r'data:image/(\w+);base64,([A-Za-z0-9+/=]{200,})').search(src, km.end()-1)
        return m.start(2), m.end(2), m.group(1)
    else:
        m = re.compile(r'data:image/(\w+);base64,([A-Za-z0-9+/=]{200,})').search(src, search_from)
        return m.start(2), m.end(2), m.group(1)

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    folder = sys.argv[1]
    manifest_path = os.path.join(folder, 'manifest.json')
    with open(manifest_path) as f:
        manifest = json.load(f)

    with open(ASSETS_PATH, 'r') as f:
        src = f.read()

    # Figure out each const's opening-char (array/object/singleton) once.
    open_ch_by_const = {}
    for m in re.finditer(r'\nconst ([A-Z_][A-Za-z0-9_]*)\s*=\s*(.)', src):
        open_ch_by_const.setdefault(m.group(1), m.group(2))

    changed = 0
    skipped = 0
    missing = 0

    # Process in descending order of byte offset so earlier replacements
    # don't shift the offsets used by later ones. We resolve offsets
    # freshly against the *current* src for each entry (since it mutates),
    # so process in the manifest's given order is fine as long as we
    # re-search src each time -- which find_value_span already does.
    for entry in manifest:
        fname = entry['file']
        fpath = os.path.join(folder, fname)
        if not os.path.exists(fpath):
            missing += 1
            continue
        with open(fpath, 'rb') as f:
            raw = f.read()
        new_hash = hashlib.sha256(raw).hexdigest()
        if new_hash == entry.get('sha256'):
            skipped += 1
            continue

        const_name = entry['const'] if entry['const'] != 'None' else None
        if const_name is None:
            # exported as UNKNOWN__unkeyed -- only safe if there's exactly
            # one such entry (LOGO_IMG, unused dead code as of this writing)
            print(f'WARNING: skipping {fname} -- not attributable to a named const (edit assets.js by hand for this one)')
            continue
        key = entry['key']
        open_ch = open_ch_by_const.get(const_name, '"')

        # Re-encode to PNG/JPEG matching the original ext, optimized.
        im = Image.open(io.BytesIO(raw))
        buf = io.BytesIO()
        if entry['ext'] == 'png':
            im = im.convert('RGBA')
            im.save(buf, format='PNG', optimize=True)
        elif entry['ext'] in ('jpg', 'jpeg'):
            im = im.convert('RGB')
            im.save(buf, format='JPEG', quality=90)
        else:
            buf.write(raw)
        new_b64 = base64.b64encode(buf.getvalue()).decode('ascii')

        start, end, _ = find_value_span(src, const_name, key, open_ch)
        src = src[:start] + new_b64 + src[end:]
        print(f'updated {const_name}[{key}]  <-  {fname}  ({len(raw)} -> {buf.tell()} bytes)')
        changed += 1

    if changed:
        with open(ASSETS_PATH, 'w') as f:
            f.write(src)

    print()
    print(f'{changed} image(s) updated, {skipped} unchanged, {missing} file(s) from manifest not found in folder.')
    if changed:
        print('Now run: node build.js && node sim.js')

if __name__ == '__main__':
    main()
