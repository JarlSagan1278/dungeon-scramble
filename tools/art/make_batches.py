# Makes repaint canvases (2160x1580, 3x2 cells, pink label + dashed guide box, art scaled to fit 617px) from an export_art.py folder.
# usage: python3 tools/art/make_batches.py <export_dir> <out_dir> '[["BATCH_X_name", ["Monster A", ...]], ...]'
# Done canvases come back as BATCH_X_..._done.png in DS Assets; cut each guide box, drop the pink line and scale back to the original size, then import_art.py.
import json, sys
from PIL import Image, ImageDraw, ImageFont
man = json.load(open(sys.argv[1]+'/manifest.json'))
fileof = {e['key']: e['file'] for e in man if e.get('const') == 'MONSTER_ART'}
# portraits (Oct 19): name them 'DWARF_PORTRAITS:3' etc.; the label reads 'Dwarf portrait 3'
fileof.update({e['const']+':'+e['key']: e['file'] for e in man if 'PORTRAITS' in (e.get('const') or '')})
def label(n): return n.split('_')[0].title()+' portrait '+n.split(':')[1] if '_PORTRAITS:' in n else n
W, H, CW, CH, BOX = 2160, 1580, 720, 790, 617
MAG = (255, 0, 255, 255)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 26)
def dashed(d, x0, y0, x1, y1, dash=10, gap=8, w=2):
    for (ax, ay, bx, by) in [(x0,y0,x1,y0),(x0,y1,x1,y1),(x0,y0,x0,y1),(x1,y0,x1,y1)]:
        L = max(abs(bx-ax), abs(by-ay)); t = 0
        while t < L:
            e = min(L, t+dash)
            if ax == bx: d.line([(ax, ay+t), (ax, ay+e)], fill=MAG, width=w)
            else: d.line([(ax+t, ay), (ax+e, ay)], fill=MAG, width=w)
            t += dash+gap
batches = json.loads(sys.argv[3])
for title, names in batches:
    can = Image.new('RGBA', (W, H), (0,0,0,0)); d = ImageDraw.Draw(can)
    for i, n in enumerate(names):
        cx, cy = (i % 3)*CW, (i // 3)*CH
        im = Image.open(sys.argv[1]+'/'+fileof[n]).convert('RGBA')
        s = min(BOX/im.width, BOX/im.height)
        big = im.resize((round(im.width*s), round(im.height*s)), Image.LANCZOS)
        bx = cx + 380 - big.width//2; by = cy + 425 - big.height//2
        can.alpha_composite(big, (bx, by))
        dashed(d, bx-1, by-1, bx+big.width, by+big.height)
        lines, cur = [], ''
        for w in label(n).split(' '):  # wrap long names (e.g. the Toadtaur Wizard's title) so they stay in their cell
            if cur and len(cur)+1+len(w) > 38: lines.append(cur); cur = w
            else: cur = (cur+' '+w).strip()
        lines.append(cur)
        for j, ln in enumerate(lines): d.text((cx+65, cy+62-16*(len(lines)-1)+32*j), ln, font=font, fill=MAG)
    can.save(sys.argv[2]+'/'+title+'.png'); print(title, len(names))
