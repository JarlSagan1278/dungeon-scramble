# Campfire choice study (Oct 14): 1.41.14 (rest + combine both) vs the Rest-OR-Train campfire.
import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
NEW = {"skill":30,"abilityRate":0.2,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.8}
D7 = {"foes":1,"fury":1,"rest":1,"swarm":1}
PAIRS = [('dwarf','guard'),('gnome','armsmaster'),('halfling','dungeoneer'),('pixie','arcanist')]
cells = []
for snap, tag in [('snap_1414.html','old'), ('snap_camp.html','camp')]:
    for o,k in PAIRS:
        cells.append((f'camp_{tag}_reg_{o}', snap, dict(REG, origin=o, klass=k)))
        cells.append((f'camp_{tag}_new_{o}', snap, dict(NEW, origin=o, klass=k)))
        cells.append((f'camp_{tag}_x7_{o}', snap, dict(origin=o, klass=k, depthMods=D7)))
def run(c):
    label, snap, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=200, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML=snap), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
