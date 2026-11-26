# itch cover (Nov 27): frames from itch_cover.js -> docs/release/media/itch_cover.gif (630x500) and .mp4
# usage: python3 tools/media/itch_cover_mk.py [start_s] [end_s]   (from the scratch dir that holds cast/itch)
import json, subprocess, os, sys
d = 'cast/itch'; t = json.load(open(d + '/times.json')); t0 = t[0]
start = float(sys.argv[1]) if len(sys.argv) > 1 else 0.0
end = float(sys.argv[2]) if len(sys.argv) > 2 else 1e9
idx = [i for i, x in enumerate(t) if start <= x - t0 <= end]
with open(d + '/list.txt', 'w') as f:
    for k, i in enumerate(idx):
        nxt = t[idx[k + 1]] if k + 1 < len(idx) else t[i] + 1.2  # hold the last frame a moment before the loop restarts
        f.write(f"file 'f{i:04d}.jpg'\nduration {nxt - t[i]:.4f}\n")
    f.write(f"file 'f{idx[-1]:04d}.jpg'\n")
M = '/home/user/dungeon-scramble/docs/release/media/'; os.makedirs(M, exist_ok=True)
L = ['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', d + '/list.txt']
CROP = 'crop=970:770:290:20,'  # the foe and the dice (the hero side is cut so the dice read at itch's 315x250)
subprocess.run(L + ['-vf', 'fps=30,' + CROP + 'scale=630:500:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', M + 'itch_cover.mp4'], check=True)
subprocess.run(L + ['-vf', 'fps=12,' + CROP + 'scale=630:500:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle', '-loop', '0', M + 'itch_cover.gif'], check=True)
for e in ('.mp4', '.gif'): print('itch_cover' + e, os.path.getsize(M + 'itch_cover' + e) // 1024, 'KB')
