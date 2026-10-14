# Oct 14: campfire policy on 1.41.17 - only Rest, only Train, and mixes (rest at or below X% HP, else Train).
import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
NEW = {"skill":30,"abilityRate":0.2,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.8}
PAIRS = [('dwarf','guard'),('gnome','armsmaster'),('halfling','dungeoneer'),('pixie','arcanist')]
V = [('restonly', {"noFuse":True}, ['reg','new']), ('trainonly', {"noRest":True}, ['reg','new']), ('mix60', {}, ['reg','new']),
     ('mix40', {"campRestAt":0.4}, ['reg']), ('mix80', {"campRestAt":0.8}, ['reg'])]
cells = [(f'cm_{v}_{p}_{o}', dict(REG if p=='reg' else NEW, origin=o, klass=k, **x)) for v,x,ps in V for p in ps for o,k in PAIRS]
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=200, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='snap_1417.html'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
