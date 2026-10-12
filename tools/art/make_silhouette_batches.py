# Makes "new art" canvases for items that have no picture yet: each cell shows a black silhouette of a similar
# existing picture as a shape guide (same layout as make_batches.py: 2160x1580, 3x2 cells, pink label + dashed box).
# usage: python3 tools/art/make_silhouette_batches.py <export_dir> <out_dir> '[["BATCH_X_name", [["New item", "Source key"], ...]], ...]'
# Returned art is new, so import it by its content bounds (not the source's box), then import_art.py under the new key.
import json, sys
from PIL import Image, ImageDraw, ImageFont
man = json.load(open(sys.argv[1]+'/manifest.json'))
fileof = {}
for e in man:
    if e.get('const') in ('MONSTER_ART', 'LOOT_ART'): fileof.setdefault(e['key'], e['file'])
W, H, CW, CH, BOX = 2160, 1580, 720, 790, 617
MAG = (255, 0, 255, 255)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 26)
small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 18)
def dashed(d, x0, y0, x1, y1, dash=10, gap=8, w=2):
    for (ax, ay, bx, by) in [(x0,y0,x1,y0),(x0,y1,x1,y1),(x0,y0,x0,y1),(x1,y0,x1,y1)]:
        L = max(abs(bx-ax), abs(by-ay)); t = 0
        while t < L:
            e = min(L, t+dash)
            if ax == bx: d.line([(ax, ay+t), (ax, ay+e)], fill=MAG, width=w)
            else: d.line([(ax+t, ay), (ax+e, ay)], fill=MAG, width=w)
            t += dash+gap
for title, items in json.loads(sys.argv[3]):
    can = Image.new('RGBA', (W, H), (0,0,0,0)); d = ImageDraw.Draw(can)
    for i, (name, src) in enumerate(items):
        cx, cy = (i % 3)*CW, (i // 3)*CH
        im = Image.open(sys.argv[1]+'/'+fileof[src]).convert('RGBA')
        bb = im.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
        if bb: im = im.crop(bb)
        a = im.getchannel('A')  # keep the soft edge so the scaled-up shape stays smooth
        sil = Image.new('RGBA', im.size, (0,0,0,255)); sil.putalpha(a)
        s = min(BOX/sil.width, BOX/sil.height)
        big = sil.resize((round(sil.width*s), round(sil.height*s)), Image.LANCZOS)
        bx = cx + 380 - big.width//2; by = cy + 425 - big.height//2
        can.alpha_composite(big, (bx, by))
        dashed(d, bx-1, by-1, bx+big.width, by+big.height)
        d.text((cx+65, cy+50), name, font=font, fill=MAG)
        d.text((cx+65, cy+84), 'shape from: '+src, font=small, fill=MAG)
    can.save(sys.argv[2]+'/'+title+'.png'); print(title, len(items))
