# App / home-screen icon (Jeremy, Oct 26: the red rogue with the torch from his cover's characters layer, on dark brown).
# Writes art/icon/icon_1024.png (master) and the web app icons in src/pwa/. Android: python3 tools/app/icons.py art/icon/icon_1024.png
# Source is the 860 px cover export, so the master is upscaled; re-run from a full-size export when there is one.
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from paper import paper
from PIL import Image
BG = (43, 29, 20)
C = Image.open('art/cover/characters_860.png').convert('RGBA')
# Oct 31 (Jeremy picked option A): a clean cut-out bust of the rogue: head, hood and the whole torch flame, running off
# the bottom edge (the old crop sliced the flame at the corner and showed a corner of the dwarf's sword). The spider leg
# above her and the dwarf's hood beside her are removed; the flame's own pixels are kept.
BOX = (142, 425, 350, 642)
fig = C.crop(BOX).copy(); px = fig.load()
for y in range(fig.height):
    for x in range(fig.width):
        X, Y = x + BOX[0], y + BOX[1]; r, g, b, a = px[x, y]
        if (X < 160 and Y < 466) or (X < 147 and not (r > 180 and g < 215)) or X >= 348: px[x, y] = (0, 0, 0, 0)
fig = fig.crop(fig.split()[3].getbbox())
fig = paper(fig.resize((fig.width * 4, fig.height * 4), Image.LANCZOS))  # same paper as the cover, added after upscaling so the grain stays fine
def make(size, fill=0.9):
    # the figure fills `fill` of the height and sits on the bottom edge, so she reads as a bust
    c = Image.new('RGBA', (size, size), BG + (255,))
    k = size * fill / fig.height; f = fig.resize((round(fig.width * k), round(fig.height * k)), Image.LANCZOS)
    c.alpha_composite(f, ((size - f.width) // 2, size - f.height))
    return c.convert('RGB')
make(1024).save('art/icon/icon_1024.png')
for name, s in [('icon-512.png', 512), ('icon-192.png', 192), ('apple-touch-icon.png', 180), ('favicon-48.png', 48)]:
    make(s).save('src/pwa/' + name)
make(512, 0.74).save('src/pwa/icon-maskable-512.png')  # maskable: smaller, so the flame tip stays inside the 80% safe zone
print('icons written')
