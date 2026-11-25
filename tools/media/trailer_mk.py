# Joins the trailer scenes recorded by trailer.js into docs/release/media/trailer.mp4 (1920x1080, 30 fps) with a short
# fade at every cut and an end card made from the cover. usage: python3 tools/media/trailer_mk.py (run from tools/media)
import json, os, subprocess
D = 'cast/trailer'; M = '/home/user/dungeon-scramble/docs/release/media/'; os.makedirs(M, exist_ok=True)
SCENES = ['1_title', '2_turn', '3_rule', '4_boss', '5_loot', '6_victory']
parts = []
for s in SCENES:
    d = os.path.join(D, s); t = json.load(open(os.path.join(d, 'times.json')))
    if not t: continue
    if len(t) < 3:  # a still screen sends one frame: hold it for 2.5 s
        import shutil; shutil.copy(os.path.join(d, 'f0000.jpg'), os.path.join(d, 'f0001.jpg')); t = [t[0], t[0] + 2.5]
    with open(os.path.join(d, 'list.txt'), 'w') as f:
        for i in range(len(t)):
            nxt = t[i+1] if i+1 < len(t) else t[i] + 0.04
            f.write(f"file 'f{i:04d}.jpg'\nduration {max(0.001, nxt - t[i]):.4f}\n")
        f.write(f"file 'f{len(t)-1:04d}.jpg'\n")
    dur = t[-1] - t[0]; out = os.path.join(D, s + '.mp4')
    fade = f"fade=t=in:st=0:d=0.25,fade=t=out:st={max(0, dur-0.3):.2f}:d=0.3"
    subprocess.run(['ffmpeg','-loglevel','error','-y','-f','concat','-safe','0','-i',os.path.join(d,'list.txt'),
                    '-vf',f'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p,{fade}','-c:v','libx264','-crf','18','-preset','slow',out], check=True)
    parts.append(out)
# end card: the cover on the stone wall colour, 3 s
card = os.path.join(D, 'end.mp4')
subprocess.run(['ffmpeg','-loglevel','error','-y','-f','lavfi','-i','color=c=0x1b130e:s=1920x1080:d=3','-i','/home/user/dungeon-scramble/src/art/COVER_ART.jpeg',
                '-filter_complex','[1]scale=-1:900[c];[0][c]overlay=(W-w)/2:(H-h)/2,fade=t=in:st=0:d=0.4,format=yuv420p','-r','30','-c:v','libx264','-crf','18',card], check=True)
parts.append(card)
with open(os.path.join(D, 'all.txt'), 'w') as f:
    for p_ in parts: f.write(f"file '{os.path.basename(p_)}'\n")
subprocess.run(['ffmpeg','-loglevel','error','-y','-f','concat','-safe','0','-i',os.path.join(D,'all.txt'),'-c','copy','-movflags','+faststart',M+'trailer.mp4'], check=True)
print('trailer.mp4', os.path.getsize(M+'trailer.mp4')//1024, 'KB')
