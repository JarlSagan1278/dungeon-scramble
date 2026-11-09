# Nov 9 one-off: Maneuver I with Block faces. Delete after write-up.
import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
D7 = {"foes":1,"fury":1,"rest":1,"swarm":1}
V = {'base':None, 'A':['Dodge','Dodge','Leap','Leap','Block1','blank'], 'B':['Dodge','Dodge','Leap','Leap','Block1','Block1']}
cells=[]
for vn,f in V.items():
  for pn,pc,dm,ks in [('r0',REG,{},['armsmaster','guard','dungeoneer','arcanist']),('x7',{},D7,['armsmaster','dungeoneer'])]:
    for k in ks:
      cfg=dict(pc); cfg.update(klass=k, origin='dwarf', depthMods=dm)
      if f: cfg['man1Faces']=f
      cells.append(('man_%s_%s_%s'%(vn,pn,k),cfg))
def run(c):
    label,cfg=c; full=dict(runs=300,label=label); full.update(cfg)
    r=subprocess.run(['node',os.path.join(HERE,'study_maneuver.js'),json.dumps(full)],cwd=HERE,env=dict(os.environ,DS_HTML='_man_build.html'),capture_output=True,text=True,timeout=14400)
    open(os.path.join(HERE,'sum_'+label+'.json'),'w').write(r.stdout.strip().split('\n')[-1] if r.stdout.strip() else '{}')
    print('done',label,flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run,cells))
print('ALL DONE',flush=True)
