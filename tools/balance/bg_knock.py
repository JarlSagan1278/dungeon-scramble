# System knockout study (Oct 14, build 1.41.16): turn off one player system at a time, regular players, depth 0.
import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
PAIRS = [('dwarf','guard'),('gnome','armsmaster'),('halfling','dungeoneer'),('pixie','arcanist')]
VARIANTS = [
 ('base', {}), ('norevive', {"noRevive":True}), ('norest', {"noRest":True}), ('nofuse', {"noFuse":True}),
 ('norelics', {"relicLock":True}), ('noshrines', {"noShrines":True}), ('notokens', {"tokens":False}),
 ('noskill', {"abilityRate":0}), ('notrayact', {"trayActRate":0}), ('lootpocket', {"lootPocket":True}),
 ('noquests', {"noQuests":True, "questAware":False}),
]
cells = [(f'ko_{v}_{o}', dict(REG, origin=o, klass=k, **x)) for v,x in VARIANTS for o,k in PAIRS]
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=200, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='snap_1416.html'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
