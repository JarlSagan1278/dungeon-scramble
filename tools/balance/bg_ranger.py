# Nov 25 (Jeremy: develop alchemist, engineer, trickster, medic; simulate against the existing classes): all 8 classes x 4
# origins, regular bot depth 0 and expert at the depth-7 preset, 120 runs per cell. Usage: python3 bg_classes.py -> out_cls_*.json
import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
P7 = {"foes":2,"rest":1,"frail":1,"swarm":1,"dread":1,"dues":1}
CL = ['ranger']
cells = []
for k in CL:
    for o in ['dwarf','gnome','halfling','pixie']:
        c = dict(REG); c.update(klass=k, origin=o, depthMods={}); cells.append(('cls_r0_%s_%s' % (k, o), c))
        cells.append(('cls_x7_%s_%s' % (k, o), dict(klass=k, origin=o, depthMods=P7)))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=120, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20000)
    print('done', label, os.path.exists(path), flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
