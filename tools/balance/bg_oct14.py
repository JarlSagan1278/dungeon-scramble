# Oct 14 background studies on 1.41.11 (fixed Dungeoneer wrap): class re-baseline + Grafter fight length.
import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
NEW = {"skill":30,"abilityRate":0.2,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.8}
D7 = {"foes":1,"fury":1,"rest":1,"swarm":1}
O = ['dwarf','gnome','halfling','pixie']; K = ['armsmaster','guard','dungeoneer','arcanist']
cells = []
for o in O:
    for k in K: cells.append(('b1411r0_%s_%s' % (o,k), dict(REG, origin=o, klass=k)))
for o in O:
    for k in K: cells.append(('b1411n0_%s_%s' % (o,k), dict(NEW, origin=o, klass=k)))
for o in O: cells.append(('b1411x0_%s_dungeoneer' % o, dict(origin=o, klass='dungeoneer')))
for o in O: cells.append(('b1411x7_%s_dungeoneer' % o, dict(origin=o, klass='dungeoneer', depthMods=D7)))
# Grafter: every Floor 1 boss is the Grafter; regular + new players; base and the tester's Night Shift 1
for k, o in [('guard','dwarf'),('armsmaster','gnome'),('dungeoneer','halfling'),('arcanist','pixie')]:
    cells.append(('graf_reg_%s' % k, dict(REG, origin=o, klass=k, forceBoss='Grosteque Grafter')))
    cells.append(('graf_new_%s' % k, dict(NEW, origin=o, klass=k, forceBoss='Grosteque Grafter')))
    cells.append(('graf_regns_%s' % k, dict(REG, origin=o, klass=k, forceBoss='Grosteque Grafter', depthMods={"gauntlet":1})))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=200, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='tools/balance/snap_1411.html'.replace('tools/balance/','')), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(3) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
