# Oct 14: stronger level II/III basic dice (Jeremy's idea), build 1.41.16.
import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
NEW = {"skill":30,"abilityRate":0.2,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.8}
PAIRS = [('dwarf','guard'),('gnome','armsmaster'),('halfling','dungeoneer'),('pixie','arcanist')]
MOD = {"atkFaces":{"2":["Hit2","Hit2","Combo2","Hit1","blank","blank"],"3":["Hit3","Hit3","Combo3","Hit2","Hit1","blank"]},
       "manFaces":{"2":["Dodge","Dodge","Leap","Pivot","Block2","Block2"],"3":["Dodge","Leap","Pivot","Block2","Block2","Boost1"]}}
SIG = {"atkFaces":{"2":["Hit3","Hit2","Combo2","Combo2","Hit1","blank"],"3":["Hit4","Hit3","Combo3","Combo3","Hit2","Hit2"]},
       "manFaces":{"2":["Dodge","Leap","Pivot","Block2","Block2","Boost1"],"3":["Pivot","Pivot","Leap","Block3","Block3","Boost1"]}}
cells = []
for v, x, profs in [('mod', MOD, ['reg','new']), ('modnf', dict(MOD, noFuse=True), ['reg']), ('sig', SIG, ['reg','new']), ('signf', dict(SIG, noFuse=True), ['reg'])]:
    for prof in profs:
        base = REG if prof=='reg' else NEW
        for o,k in PAIRS: cells.append((f'bs_{v}_{prof}_{o}', dict(base, origin=o, klass=k, **x)))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=200, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='snap_1416b.html'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
