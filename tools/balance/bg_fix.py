# Oct 14: stronger Train (combine 2 dice) and shrine loot, build 1.41.16 + switches.
import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
NEW = {"skill":30,"abilityRate":0.2,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.8}
PAIRS = [('dwarf','guard'),('gnome','armsmaster'),('halfling','dungeoneer'),('pixie','arcanist')]
VARIANTS = [('base', {}), ('train2', {"upgradeCost":2}), ('shrineloot', {"shrineLoot":True}), ('both', {"upgradeCost":2, "shrineLoot":True}), ('train2nofuse', {"upgradeCost":2, "noFuse":True})]
cells = []
for v,x in VARIANTS:
    for prof, base in [('reg', REG), ('new', NEW)]:
        if v=='train2nofuse' and prof=='new': continue
        for o,k in PAIRS: cells.append((f'fx_{v}_{prof}_{o}', dict(base, origin=o, klass=k, **x)))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=200, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='snap_1416b.html'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
