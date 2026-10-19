# Re-imports Jeremy's returned repaint canvases at higher resolution (Oct 12: his art looked blurry on phones,
# because the first import scaled each repaint back down to the old, small picture size).
# For every dashed box on a *_done.png canvas: crop inside the box, clear the pink guide line, recognize which
# picture it is (best match against the current, small art), and rebuild that picture at SCALE x its old size,
# keeping the same padding so it shows at exactly the same size in the game.
# usage: python3 tools/art/reimport_hires.py <export_dir> <out_dir> <done.png>... [--scale 2] [--names 'A|B|C...'] [--no-paper]
# --names (Oct 15): the picture names in box order (rows top to bottom, left to right), for repaints changed too much to auto-match.
# Portraits are named CONST:index, e.g. 'DWARF_PORTRAITS:3' (Oct 19).
import json, os, sys
import numpy as np
from PIL import Image
args = [a for a in sys.argv[1:]]
SCALE = 2.0
if '--scale' in args: i = args.index('--scale'); SCALE = float(args[i+1]); del args[i:i+2]
NAMES = None
PAPER = '--no-paper' not in args
if not PAPER: args.remove('--no-paper')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paper import paper  # Oct 15: every picture gets the medium paper texture (tools/art/paper.py)
from black_edge import blacken  # Oct 17: then its outermost 2 px are repainted the line black (no halo)
if '--names' in args: i = args.index('--names'); NAMES = args[i+1].split('|'); del args[i:i+2]
ex, out, canvases = args[0], args[1], args[2:]
os.makedirs(out, exist_ok=True)
man = json.load(open(os.path.join(ex, 'manifest.json')))
cands = [e for e in man if e.get('const') in ('MONSTER_ART', 'LOOT_ART') or 'PORTRAITS' in (e.get('const') or '')]
def content_bbox(im):
    # ignore stray specks (an opening removes anything thinner than ~7px) so the art's true extent is measured
    from PIL import ImageFilter
    m = im.getchannel('A').point(lambda a: 255 if a > 20 else 0)
    return m.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7)).getbbox() or m.getbbox()
def sig(im, size=(48, 48)):
    bb = content_bbox(im); c = im.crop(bb) if bb else im
    a = np.asarray(c.resize(size, Image.BILINEAR).convert('RGBA'), dtype=np.float32) / 255.0
    return a, c.width / max(1, c.height)
cache = {}
for e in cands:
    im = Image.open(os.path.join(ex, e['file'])).convert('RGBA'); cache[e['file']] = (e, im, sig(im))
def is_mag(a): return (a[..., 0] > 190) & (a[..., 1] < 110) & (a[..., 2] > 190) & (a[..., 3] > 100)
picked, out_man = set(), []
def find_boxes(A):
    # the dashed guide boxes: pink pixels, pooled 4x, dilated to join the dashes, then connected outlines
    from PIL import ImageFilter
    m = is_mag(A); H, W = m.shape; P = 4
    small = m[:H//P*P, :W//P*P].reshape(H//P, P, W//P, P).any(axis=(1, 3))
    small = np.asarray(Image.fromarray(small.astype(np.uint8)*255).filter(ImageFilter.MaxFilter(5))) > 0
    seen = np.zeros_like(small); boxes = []
    h, w = small.shape
    for y0 in range(h):
        for x0 in np.flatnonzero(small[y0] & ~seen[y0]):
            stack = [(y0, x0)]; seen[y0, x0] = True; ys = []; xs = []
            while stack:
                y, x = stack.pop(); ys.append(y); xs.append(x)
                for yy, xx in ((y+1, x), (y-1, x), (y, x+1), (y, x-1)):
                    if 0 <= yy < h and 0 <= xx < w and small[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True; stack.append((yy, xx))
            bx0, by0, bx1, by1 = min(xs)*P, min(ys)*P, (max(xs)+1)*P, (max(ys)+1)*P
            if bx1-bx0 > 150 and by1-by0 > 150: boxes.append((bx0, by0, bx1, by1))
    # tighten each to its outermost rows/cols with many pink pixels
    out = []
    for bx0, by0, bx1, by1 in boxes:
        mm = m[by0:by1, bx0:bx1]; rc = np.flatnonzero(mm.sum(1) > 60); cc = np.flatnonzero(mm.sum(0) > 60)
        if len(rc) < 2 or len(cc) < 2: continue
        out.append((bx0+cc[0]+3, by0+rc[0]+3, bx0+cc[-1]-2, by0+rc[-1]-2))
    # a box whose side lines were painted over splits into a top and a bottom edge: join matching pairs
    good = [b for b in out if b[3]-b[1] > 50]; flat = sorted([b for b in out if b[3]-b[1] <= 50], key=lambda b: b[1])
    while flat:
        t = flat.pop(0); mate = next((f for f in flat if abs(f[0]-t[0]) < 20 and abs(f[2]-t[2]) < 20 and f[1]-t[1] > 150), None)
        if mate: flat.remove(mate); good.append((t[0], min(t[1], t[3])+2, t[2], max(mate[1], mate[3])-2))
    return sorted(good, key=lambda b: (round(b[1]/300), b[0]))
for cv in canvases:
    img = Image.open(cv).convert('RGBA'); A = np.asarray(img).copy()
    for bi, (bx0, by0, bx1, by1) in enumerate(find_boxes(A)):
        if True:
            crop = A[by0:by1, bx0:bx1].copy()
            # clear pink only in a thin band along the box edge (some art is pink/purple inside)
            band = np.zeros(crop.shape[:2], bool); band[:12] = band[-12:] = True; band[:, :12] = band[:, -12:] = True
            crop[band & is_mag(crop)] = 0
            cim = Image.fromarray(crop, 'RGBA')
            cbb = content_bbox(cim)
            if not cbb or (cbb[2]-cbb[0]) < 40 or (cbb[3]-cbb[1]) < 40: print('  empty box at', (bx0, by0, bx1, by1), 'skipped'); continue
            s, asp = sig(cim)
            best = None
            for f, (e, im, (s2, asp2)) in cache.items():
                d = float(np.mean(np.abs(s - s2))) + 0.5*abs(np.log(asp/asp2))
                if best is None or d < best[0]: best = (d, e, im)
            d, e, old = best
            if NAMES:  # forced by box order
                hit = next((v for v in cache.values() if v[0]['key'] == NAMES[bi] or (v[0]['const'] or '')+':'+v[0]['key'] == NAMES[bi]), None)  # portraits: 'GNOME_PORTRAITS:4'
                if not hit: print('  name not found:', NAMES[bi]); continue
                e, old = hit[0], hit[1]; d = 0.0
            name = e['key']
            if d > 0.2: print('  no confident match for box', (bx0, by0, bx1, by1), '(best %s %.3f), skipped' % (name, d)); continue
            if e['file'] in picked: print('  duplicate match, skipped:', name); continue
            picked.add(e['file'])
            ob = content_bbox(old)
            NW, NH = round(old.width*SCALE), round(old.height*SCALE)
            tb = [round(v*SCALE) for v in ob]; tw, th = tb[2]-tb[0], tb[3]-tb[1]
            cb = content_bbox(cim); cc = cim.crop(cb)
            k = min(tw/cc.width, th/cc.height); cc = cc.resize((max(1, round(cc.width*k)), max(1, round(cc.height*k))), Image.LANCZOS)
            new = Image.new('RGBA', (NW, NH), (0, 0, 0, 0))
            new.alpha_composite(cc, (tb[0] + (tw-cc.width)//2, tb[3]-cc.height))  # centered, feet on the old baseline
            if PAPER: new = paper(new)
            new = blacken(new)[0]
            new.save(os.path.join(out, e['file'])); out_man.append(e)
            print('%-34s match %.3f  %dx%d -> %dx%d  (source box %dx%d)' % (name[:34], d, old.width, old.height, NW, NH, crop.shape[1], crop.shape[0]))
json.dump(out_man, open(os.path.join(out, 'manifest.json'), 'w'), indent=1)
