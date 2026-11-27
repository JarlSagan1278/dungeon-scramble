# Gameplay clip (Nov 27): joins the three turns from clip_turns.js, each trimmed to end before its Victory overlay,
# into docs/release/media/clip_turns.mp4 and .gif. usage (from the dir holding cast/turns): python3 tools/media/clip_turns_mk.py
import json, os, subprocess, statistics, glob
from PIL import Image
M = '/home/user/dungeon-scramble/docs/release/media/'; os.makedirs(M, exist_ok=True)
lines = []
for d in sorted(glob.glob('cast/turns/*/')):
    t = json.load(open(d + 'times.json')); t0 = t[0]
    # cut just before the Victory chest (clip_turns.js records when it appeared); Overkill turns keep a beat for the stamp
    cut = json.load(open(d + 'cut.json')).get('cutAt') if os.path.exists(d + 'cut.json') else None
    late = [k for k, x in enumerate(t) if cut and x > cut + 0.8]  # the knockout and the Overkill stamp, before the Victory chest
    end = max(0, late[0] - 1) if late else len(t) - 1
    idx = list(range(0, end + 1))
    for k, i in enumerate(idx):
        nxt = t[idx[k + 1]] if k + 1 < len(idx) else t[i] + 0.6  # a short hold on each turn's last frame
        lines.append(f"file '{os.path.abspath(d)}/f{i:04d}.jpg'\nduration {nxt - t[i]:.4f}\n")
    print(d, 'frames', len(idx), 'seconds', round(t[end] - t0, 2), 'cut at victory' if late else 'NO victory cut')
open('cast/turns/list.txt', 'w').write(''.join(lines) + lines[-1].split('\n')[0] + '\n')
L = ['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'cast/turns/list.txt']
subprocess.run(L + ['-vf', 'fps=30,scale=790:1538:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', M + 'clip_turns.mp4'], check=True)
subprocess.run(L + ['-vf', 'fps=10,scale=300:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle', '-loop', '0', M + 'clip_turns.gif'], check=True)
for e in ('.mp4', '.gif'): print('clip_turns' + e, os.path.getsize(M + 'clip_turns' + e) // 1024, 'KB')
