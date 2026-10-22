import json,sys,subprocess,os
name,start,end,speed,out=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),float(sys.argv[4]),sys.argv[5]
d='cast/'+name; t=json.load(open(d+'/times.json')); t0=t[0]
idx=[i for i,x in enumerate(t) if start<=x-t0<=end]
with open(d+'/list.txt','w') as f:
  for k,i in enumerate(idx):
    nxt=t[idx[k+1]] if k+1<len(idx) else t[i]+0.04
    f.write(f"file 'f{i:04d}.jpg'\nduration {(nxt-t[i])/speed:.4f}\n")
  f.write(f"file 'f{idx[-1]:04d}.jpg'\n")
M='/home/user/dungeon-scramble/docs/release/media/'
L=['ffmpeg','-loglevel','error','-y','-f','concat','-safe','0','-i',d+'/list.txt']
subprocess.run(L+['-vf','fps=30,scale=790:1538:flags=lanczos,format=yuv420p','-c:v','libx264','-crf','20','-preset','slow','-movflags','+faststart',M+out+'.mp4'],check=True)
subprocess.run(L+['-vf','fps=15,scale=395:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',M+out+'.gif'],check=True)
for e in ('.mp4','.gif'): print(out+e, os.path.getsize(M+out+e)//1024,'KB')
