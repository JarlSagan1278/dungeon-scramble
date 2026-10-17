# Black outer edge (Oct 17, Jeremy: "a lot of outline haloing... make sure the outer line of pixels is the thick black
# line", most visible on Fungal Flayer). The paper texture and old anti-aliasing left faint, light speckle pixels just
# outside the black outline. This repaints every pixel within RING px of the transparent background in the line colour,
# keeping its alpha, so edges stay smooth but the outermost pixels are always the black line.
# usage: python3 tools/art/black_edge.py <export_dir> [--ring 2] [--report]   (export_dir from export_art.py; then import_art.py)
import sys, os, json
import numpy as np
from PIL import Image
LINE = (12, 7, 5)  # #0c0705, the game's --line
def blacken(im, ring=2):
    a = np.array(im.convert('RGBA'))
    m = a[..., 3] > 0
    near = np.zeros_like(m); cur = ~m
    for _ in range(ring):  # grow the transparent region by one pixel per step (4-neighbour)
        g = cur.copy(); g[1:, :] |= cur[:-1, :]; g[:-1, :] |= cur[1:, :]; g[:, 1:] |= cur[:, :-1]; g[:, :-1] |= cur[:, 1:]
        near |= g & m; cur = g
    lum = a[..., 0] * .3 + a[..., 1] * .59 + a[..., 2] * .11
    before = float((lum[near] > 60).mean()) if near.any() else 0.0
    a[near, 0], a[near, 1], a[near, 2] = LINE
    return Image.fromarray(a, 'RGBA'), before
if __name__ == '__main__':
    args = sys.argv[1:]; ring = 2; report = '--report' in args
    if '--ring' in args: i = args.index('--ring'); ring = int(args[i + 1]); del args[i:i + 2]
    ex = [x for x in args if not x.startswith('--')][0]
    man = json.load(open(os.path.join(ex, 'manifest.json')))
    n = 0; rows = []
    for e in man:
        if not (e.get('const') in ('MONSTER_ART', 'LOOT_ART') or 'PORTRAITS' in (e.get('const') or '')): continue
        p = os.path.join(ex, e['file'])
        if not os.path.exists(p): continue
        im = Image.open(p); out, light = blacken(im, ring); rows.append((light, e.get('key') or e['file']))
        if not report:
            out.save(p, **({'quality': 90, 'method': 6} if p.endswith('.webp') else {})); n += 1
    rows.sort(reverse=True)
    for light, k in rows[:12]: print(f'{light:5.2f}  light pixels in the outer ring  {k}')
    print(f'{len(rows)} pictures checked' + ('' if report else f', {n} rewritten'))
