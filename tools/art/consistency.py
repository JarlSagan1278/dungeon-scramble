# Consistency pass for retouched art (Oct 12 test): nudges every picture toward one shared look without
# repainting it. Steps (all gentle and reversible; originals stay in git):
#   1. specks: drops tiny detached alpha blobs (stray paint, leftover guide pink)
#   2. outline: near-black pixels take the UI's warm line color (#0c0705)
#   3. color: very saturated colors are softened, and brightness is pulled part of the way toward the batch norm
#   4. warm grade: a slight torch-light tint so nothing looks pasted in from another game
#   5. grain: flat, smooth-filled pictures get light brush grain (like the repaints)
# usage: python3 tools/art/consistency.py <in_dir> <out_dir> file.png ...   [--bright 166] [--pull 0.35]
import os, sys, colorsys
import numpy as np
from PIL import Image, ImageFilter
args = sys.argv[1:]
def opt(name, default):
    if name in args: i = args.index(name); v = float(args[i+1]); del args[i:i+2]; return v
    return default
BRIGHT, PULL = opt('--bright', 166), opt('--pull', 0.35)  # 166 = Batch C's middle fill brightness (HSV value)
src, dst, files = args[0], args[1], args[2:]
os.makedirs(dst, exist_ok=True)
LINE = np.array([12, 7, 5], np.float32)
rng = np.random.default_rng(7)

def drop_specks(a):
    m = a[..., 3] > 20; h, w = m.shape; lab = np.zeros((h, w), np.int32); sizes = [0]; n = 0
    for y in range(h):
        for x in np.flatnonzero(m[y] & (lab[y] == 0)):
            n += 1; st = [(y, x)]; lab[y, x] = n; c = 0
            while st:
                yy, xx = st.pop(); c += 1
                for ny, nx in ((yy+1, xx), (yy-1, xx), (yy, xx+1), (yy, xx-1)):
                    if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and lab[ny, nx] == 0:
                        lab[ny, nx] = n; st.append((ny, nx))
            sizes.append(c)
    sizes = np.array(sizes); big = sizes.max()
    small = np.flatnonzero((sizes < max(40, big*0.004)))
    kill = np.isin(lab, small[small > 0])
    a[kill] = 0
    return int(kill.sum())

for f in files:
    im = Image.open(os.path.join(src, f)).convert('RGBA'); a = np.asarray(im).astype(np.float32)
    removed = drop_specks(a)
    rgb, al = a[..., :3], a[..., 3]
    op = al > 20
    mx = rgb.max(axis=2)
    # 2. outline color
    dark = (mx < 45) & op
    rgb[dark] = rgb[dark]*0.4 + LINE*0.6
    # 3. saturation soften + brightness pull (HSV on fill pixels only)
    fill = op & ~dark
    r, g, b = [rgb[..., i][fill]/255 for i in range(3)]
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in zip(r, g, b)]) if fill.any() else np.zeros((0, 3))
    if len(hsv):
        s = hsv[:, 1]; s = np.where(s > 0.7, 0.7 + (s-0.7)*0.45, s); hsv[:, 1] = s
        v = hsv[:, 2]*255; mean_v = v.mean(); k = 1 + PULL*(BRIGHT/mean_v - 1); hsv[:, 2] = np.clip(v*k, 0, 255)/255
        back = np.array([colorsys.hsv_to_rgb(*p) for p in hsv])*255
        for i in range(3): rgb[..., i][fill] = back[:, i]
    # 4. warm grade
    rgb *= np.array([1.03, 1.0, 0.94], np.float32)
    # 5. grain on flat fills
    gray = rgb.mean(axis=2); flat = (np.abs(np.diff(gray, axis=1)) < 3)[fill[:, 1:]].mean() if fill.any() else 0
    if flat > 0.68:
        h, w = gray.shape; k = (flat-0.68)/0.12
        blot = np.asarray(Image.fromarray((rng.random((max(2, h//6), max(2, w//6)))*255).astype(np.uint8)).resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(2)), np.float32)/255-0.5
        fine = np.asarray(Image.fromarray((rng.random((h, w))*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)), np.float32)/255-0.5
        gr = 1 + min(1, k)*(0.14*blot + 0.08*fine)
        rgb[fill] = (rgb*gr[..., None])[fill]
    out = np.dstack([np.clip(rgb, 0, 255), al]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(os.path.join(dst, f))
    print('%-40s specks %4d  flat %.0f%%  brightness %.0f' % (f[:40], removed, flat*100, (mean_v if len(hsv) else 0)))
