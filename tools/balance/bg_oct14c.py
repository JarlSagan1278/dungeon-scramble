import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
def kit(shield, heal): return {"Grosteque Grafter":{"each":[{"type":"dmg","value":1}],"specials":[{"name":"Grafted Plate","acts":[{"type":"shield","value":shield}]},{"name":"Pruning","windup":True,"acts":[{"type":"dmg","value":5}]},{"name":"Harvest","acts":[{"type":"heal","value":heal}]}]}}
cells = []
for k, o in [('guard','dwarf'),('armsmaster','gnome'),('dungeoneer','halfling'),('arcanist','pixie')]:
    cells.append(('grafv_h2_%s' % k, dict(REG, origin=o, klass=k, forceBoss='Grosteque Grafter', kitPatch=kit(5,2))))
    cells.append(('grafv_s3h2_%s' % k, dict(REG, origin=o, klass=k, forceBoss='Grosteque Grafter', kitPatch=kit(3,2))))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=200, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='snap_1411.html'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(1) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
