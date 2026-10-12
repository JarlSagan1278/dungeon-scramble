# Gives a clean, flat portrait the hand-retouched look of Jeremy's repaints: a wobbly, slightly heavier outline,
# brush grain in the fills and a little shading. usage: python3 tools/art/handdrawn.py in.png out.png [seed] [strength]
import sys, numpy as np
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 1
k = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
rng = np.random.default_rng(seed)
im = Image.open(src).convert('RGBA'); W, H = im.size
S = 3  # work at 3x so the warp stays smooth
big = im.resize((W*S, H*S), Image.LANCZOS); w, h = big.size
def smooth_noise(scale, blur):
    n = Image.fromarray((rng.random((max(2, h//scale), max(2, w//scale)))*255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return (np.asarray(n.filter(ImageFilter.GaussianBlur(blur)), dtype=np.float32)/255.0 - 0.5)
# 1. wobble: displace pixels by low-frequency noise (about 1px at portrait size)
amp = 2.2*S*k
dx = smooth_noise(24, 10)*amp*2; dy = smooth_noise(24, 10)*amp*2
yy, xx = np.mgrid[0:h, 0:w]
sx = np.clip(xx+dx, 0, w-1).astype(np.int32); sy = np.clip(yy+dy, 0, h-1).astype(np.int32)
a = np.asarray(big, dtype=np.float32)[sy, sx]
# 2. heavier outline: darken pixels that sit next to the existing dark outline
rgb, al = a[..., :3], a[..., 3:4]
lum = rgb.mean(axis=2)
dark = Image.fromarray(((rgb.max(axis=2) < 42) & (al[..., 0] > 128)).astype(np.uint8)*255).filter(ImageFilter.MaxFilter(3 if k < 1.2 else 5))
dark = np.asarray(dark.filter(ImageFilter.GaussianBlur(0.8)), dtype=np.float32)[..., None]/255.0
rgb = rgb*(1-0.85*dark) + 12*0.85*dark
# 3. brush grain: blotchy low-frequency + streaky strokes, only inside the fills
blot = smooth_noise(10, 6)
streak = Image.fromarray((rng.random((h, w))*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
streak = streak.rotate(28, resample=Image.BICUBIC).filter(ImageFilter.BoxBlur(0)).resize((w, h))
streak = np.asarray(streak.filter(ImageFilter.GaussianBlur(0.6)).transform((w, h), Image.AFFINE, (1, 0.35, 0, 0, 1, 0)), dtype=np.float32)/255.0 - 0.5
fillmask = (1 - dark)
grain = 1 + (0.16*blot + 0.10*streak)*k
rgb = rgb*(1 + (grain[..., None]-1)*fillmask)
# 4. shading: a soft shadow toward the lower right of the shape
alpha_img = Image.fromarray(al[..., 0].astype(np.uint8))
shade = np.asarray(alpha_img.filter(ImageFilter.GaussianBlur(14*S)), dtype=np.float32)/255.0
shifted = np.roll(np.roll(shade, -6*S, axis=0), -6*S, axis=1)
rim = np.clip(shade - shifted, 0, 1)
rgb = rgb*(1 - 0.35*k*rim[..., None]*fillmask)
out = np.concatenate([np.clip(rgb, 0, 255), al], axis=2).astype(np.uint8)
Image.fromarray(out, 'RGBA').resize((W, H), Image.LANCZOS).save(dst)
