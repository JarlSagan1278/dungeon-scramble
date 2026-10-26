# App icons and splash screens for the Android project from the game's icon (Oct 26; placeholder until a dedicated app icon).
# usage: python3 tools/app/icons.py [source.png]
import sys, glob, os
from PIL import Image, ImageDraw
SRC = sys.argv[1] if len(sys.argv) > 1 else 'dist/release/web/icon-512.png'
RES = 'app/android/app/src/main/res'
src = Image.open(SRC).convert('RGBA')
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for d, k in DENS.items():
    n = round(48 * k)
    sq = src.resize((n, n), Image.LANCZOS)
    m = Image.new('L', (n, n), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, n - 1, n - 1], radius=round(n * .18), fill=255)
    leg = Image.new('RGBA', (n, n), (0, 0, 0, 0)); leg.paste(sq, (0, 0), m); leg.save(f'{RES}/mipmap-{d}/ic_launcher.png')
    c = Image.new('L', (n, n), 0); ImageDraw.Draw(c).ellipse([0, 0, n - 1, n - 1], fill=255)
    rnd = Image.new('RGBA', (n, n), (0, 0, 0, 0)); rnd.paste(sq, (0, 0), c); rnd.save(f'{RES}/mipmap-{d}/ic_launcher_round.png')
    f = round(108 * k); inner = round(f * 0.78)  # adaptive icon: the launcher shows roughly the middle 72 of 108
    fg = Image.new('RGBA', (f, f), (0, 0, 0, 0)); fg.paste(src.resize((inner, inner), Image.LANCZOS), ((f - inner) // 2, (f - inner) // 2))
    fg.save(f'{RES}/mipmap-{d}/ic_launcher_foreground.png')
open(f'{RES}/values/ic_launcher_background.xml', 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#6B4322</color>\n</resources>\n')
for p in glob.glob(f'{RES}/drawable*/splash.png'):
    w, h = Image.open(p).size
    sp = Image.new('RGB', (w, h), (26, 17, 11)); s = round(min(w, h) * 0.32)
    ic = src.resize((s, s), Image.LANCZOS); m = Image.new('L', (s, s), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, s - 1, s - 1], radius=round(s * .18), fill=255)
    sp.paste(ic, ((w - s) // 2, (h - s) // 2), m); sp.save(p)
print('icons and splash screens written')
