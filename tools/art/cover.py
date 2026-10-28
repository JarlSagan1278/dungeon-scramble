# Cover art with the in-game paper texture (Jeremy, Oct 28, 1.41.98: option C, medium paper like the portraits;
# the logo stays clean so it reads on small thumbnails). Composites art/cover/ layers.
# usage: python3 tools/art/cover.py <out_dir>  -> cover_860.jpg (COVER_ART; splice with import_art.py) and itch_thumb_630x500.png
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from paper import paper
from PIL import Image
D = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'cover')
def layer(n): return Image.open(os.path.join(D, n)).convert('RGBA')
def textured():
    s, c = paper(layer('scene_860.png')), paper(layer('characters_860.png'))
    s.alpha_composite(c); return s
if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    base, logo = textured(), layer('logo_860.png')
    full = base.copy(); full.alpha_composite(logo)
    full.convert('RGB').save(os.path.join(out, 'cover_860.jpg'), quality=90)
    y0, h = 200, 683  # itch.io 630x500 cover: the heroes, with the logo moved up to the top
    th = base.crop((0, y0, 860, y0 + h)); lb = logo.getbbox(); th.alpha_composite(logo.crop(lb), (lb[0], 14))
    th.convert('RGB').resize((630, 500), Image.LANCZOS).save(os.path.join(out, 'itch_thumb_630x500.png'))
    print('cover written to', out)
