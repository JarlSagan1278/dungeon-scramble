#!/usr/bin/env python3
"""
Export every embedded image in src/assets.js to a standalone PNG file,
plus a manifest.json that records exactly where each file came from.

Usage:
    python3 tools/art/export_art.py [output_dir]

Default output_dir is tools/art/export/.

Each image is written as "<CONST_NAME>__<key>.png" where <key> is either
an array index (portraits) or the item/monster name (MONSTER_ART, LOOT_ART,
etc). The manifest maps each filename back to its exact location in
assets.js so import_art.py can splice an edited PNG back in without anyone
having to touch base64 or JavaScript by hand.

To make a small art tweak:
  1. Run this script to get a fresh export/ folder.
  2. Edit any PNG(s) in an image editor, keeping the filename the same.
     Keep the background transparent (alpha channel) -- don't flatten
     onto a white background, or you'll reintroduce the white-halo bug.
  3. Run import_art.py pointing at the edited folder. It only touches
     files that actually changed (by content hash), so you can leave the
     rest of the export folder untouched.
  4. Run `node build.js` and `node tools/check.js quick` as usual.
"""
import re, base64, io, json, sys, os, hashlib

ASSETS_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'assets.js')
ASSETS_PATH = os.path.abspath(ASSETS_PATH)

def safe_key(k):
    return re.sub(r'[^A-Za-z0-9_-]+', '_', str(k)).strip('_')

def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'export')
    os.makedirs(out_dir, exist_ok=True)

    with open(ASSETS_PATH, 'r') as f:
        src = f.read()

    # Attribute every image to the nearest preceding `const NAME = ...`
    # declaration, regardless of whether its value is an array, object, or
    # a bare string -- this must stay in sync with halo_scan2.py's approach
    # so the two scripts agree on which image belongs to which const.
    const_info = []
    for m in re.finditer(r'\nconst ([A-Z_][A-Za-z0-9_]*)\s*=\s*(.)', src):
        const_info.append((m.start(), m.group(1), m.group(2)))
    const_info.sort()

    def which_const(pos):
        best = (None, None)
        for start, name, ch in const_info:
            if start <= pos:
                best = (name, ch)
            else:
                break
        return best

    # Track running index within each array-type const (for key naming),
    # and detect `'Name': "data:image..."` keys for object-type consts.
    running_index = {}
    manifest = []
    seen_names = set()

    for m in re.finditer(r'data:image/(\w+);base64,([A-Za-z0-9+/=]{200,})', src):
        ext, b64 = m.group(1), m.group(2)
        pos = m.start()
        const_name, open_ch = which_const(pos)
        if const_name is None:
            key = 'unkeyed'
        elif open_ch == '[':
            idx = running_index.get(const_name, 0)
            running_index[const_name] = idx + 1
            key = str(idx)
        elif open_ch != '{':
            # a bare `const NAME = "data:image..."` singleton -- no indexing needed
            key = 'value'
        else:
            # object literal -- look backwards for the nearest 'Name': or "Name":
            # the window ends right at the opening quote of the "data:image..."
            # string value itself, so allow (and strip) one trailing quote.
            window = src[max(0, pos-200):pos]
            # the key may hold an escaped quote ('Oilephant\'s Foot', Oct 17)
            km = re.search(r'([\'"])((?:\\.|(?!\1).)+)\1\s*:\s*[\'"]?$', window.rstrip())
            key = re.sub(r'\\(.)', r'\1', km.group(2)) if km else f'pos{pos}'

        raw = base64.b64decode(b64)
        fname_base = f'{const_name or "UNKNOWN"}__{safe_key(key)}'
        fname = f'{fname_base}.{ext}'
        n = 2
        while fname in seen_names:
            fname = f'{fname_base}_{n}.{ext}'
            n += 1
        seen_names.add(fname)

        with open(os.path.join(out_dir, fname), 'wb') as out:
            out.write(raw)

        manifest.append({
            'file': fname,
            'const': const_name,
            'key': key,
            'ext': ext,
            'sha256': hashlib.sha256(raw).hexdigest(),
            'bytes': len(raw),
        })

    manifest_path = os.path.join(out_dir, 'manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f'Exported {len(manifest)} images to {out_dir}')
    print(f'Manifest: {manifest_path}')

if __name__ == '__main__':
    main()
