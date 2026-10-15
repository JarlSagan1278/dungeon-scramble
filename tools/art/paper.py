# Paper texture (Jeremy picked "medium", Oct 15, 1.41.26): cold-press paper tooth and little fibres, embossed so the colour
# seems to catch on the bumps, a slight warm paper tint and a soft shadow toward the lower right. Outlines stay clean.
# Applied to every portrait, monster and loot picture; reimport_hires.py applies it to new repaints automatically.
# usage: python3 tools/art/paper.py in.png out.png [strength=1.0]   (light 0.6, medium 1.0, strong 1.6)
import sys, numpy as np
from PIL import Image, ImageFilter, ImageDraw

def paper(im, k=1.0, seed=5):
    rng = np.random.default_rng(seed); S = 2
    base = im.convert('RGBA'); big = base.resize((base.width*S, base.height*S), Image.LANCZOS); W, H = big.size
    A = np.asarray(big, dtype=np.float32); rgb = A[..., :3].copy(); al = A[..., 3:4]/255
    outline = (rgb.max(2) < 50) & (al[..., 0] > .5)
    ol = np.asarray(Image.fromarray((outline*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)), dtype=np.float32)[..., None]/255
    fill = (1-ol)*al
    def noise(scale, blur):
        n = Image.fromarray((rng.random((max(2, H//scale), max(2, W//scale)))*255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(blur))
        return np.asarray(n, dtype=np.float32)/255-.5
    yy, xx = np.mgrid[0:H, 0:W]
    ys, xs = np.nonzero(al[..., 0] > .5)
    if not len(xs): return base
    cx, cy = xs.mean(), ys.mean(); R = max(xs.max()-xs.min(), ys.max()-ys.min())/2 or 1
    dist = np.sqrt((xx-(cx-.35*R))**2+(yy-(cy-.45*R))**2)/(1.55*R)
    edge = np.asarray(Image.fromarray((al[..., 0]*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6*S)), dtype=np.float32)/255
    shade = np.clip(np.clip((dist-.55)/.6, 0, 1)**1.2*np.clip(edge*1.3, 0, 1)+.25*np.clip(1-edge*1.6, 0, 1)*al[..., 0], 0, 1)
    tooth = noise(1, .7)*.6+noise(3, 1.2)*.8+noise(12, 4)*.5
    fib = Image.new('L', (W, H), 0); d = ImageDraw.Draw(fib)
    for _ in range(int(W*H/900)):
        x, y = rng.uniform(0, W), rng.uniform(0, H); a = rng.uniform(0, np.pi); L = rng.uniform(4, 14)*S
        d.line([(x, y), (x+np.cos(a)*L, y+np.sin(a)*L)], fill=int(rng.uniform(60, 140)), width=1)
    fib = np.asarray(fib.filter(ImageFilter.GaussianBlur(.6)), np.float32)/255
    h = tooth+fib*.8
    gx = np.roll(h, -1, 1)-np.roll(h, 1, 1); gy = np.roll(h, -1, 0)-np.roll(h, 1, 0)
    rel = 1+.9*k*(-gx-gy)
    tint = min(k, 1.5)
    r = rgb*(1-.08*tint+.08*tint*np.array([238, 228, 205])/255)
    r = r*(1+(rel[..., None]-1)*fill)*(1-.08*k*fib[..., None]*fill)
    r = r*(1-.15*k*shade[..., None]*fill)
    out = Image.fromarray(np.concatenate([np.clip(r, 0, 255), A[..., 3:4]], 2).astype(np.uint8))
    return out.resize(base.size, Image.LANCZOS)

if __name__ == '__main__':
    k = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    paper(Image.open(sys.argv[1]), k).save(sys.argv[2])
