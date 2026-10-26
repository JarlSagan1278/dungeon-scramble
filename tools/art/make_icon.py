# App / home-screen icon (Jeremy, Oct 26: the red rogue with the torch from his cover's characters layer, on dark brown).
# Writes art/icon/icon_1024.png (master) and the web app icons in src/pwa/. Android: python3 tools/app/icons.py art/icon/icon_1024.png
# Source is the 860 px cover export, so the master is upscaled; re-run from a full-size export when there is one.
from PIL import Image
BG = (43, 29, 20)
C = Image.open('art/cover/characters_860.png').convert('RGBA')
fig = C.crop((140, 430, 370, 700))
# erase the neighbours that share the layer: a stray stick at the top left, the dwarf's sword and shield at the bottom right
from PIL import ImageDraw
_m = fig.getchannel('A'); _d = ImageDraw.Draw(_m)
_d.rectangle([0, 0, 40, 45], fill=0); _d.rectangle([0, 0, 28, 70], fill=0); _d.polygon([(166, 270), (230, 270), (230, 190), (186, 214)], fill=0)
fig.putalpha(_m)
def make(size, fill=1.0):
    c = Image.new('RGBA', (size, size), BG + (255,))
    k = size * fill / max(fig.size); f = fig.resize((round(fig.width * k), round(fig.height * k)), Image.LANCZOS)
    c.alpha_composite(f, ((size - f.width) // 2, size - f.height if fill >= 1 else (size - f.height) // 2))
    return c.convert('RGB')
make(1024).save('art/icon/icon_1024.png')
for name, s in [('icon-512.png', 512), ('icon-192.png', 192), ('apple-touch-icon.png', 180), ('favicon-48.png', 48)]:
    make(s).save('src/pwa/' + name)
make(512, 0.78).save('src/pwa/icon-maskable-512.png')  # maskable: the figure inside the 80% safe zone
print('icons written')
