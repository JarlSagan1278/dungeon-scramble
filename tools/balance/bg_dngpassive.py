# Oct 16 Dungeoneer simple-passive study on 1.41.53 (snapshot _dng_build.html). Method as bg_arcboost.py:
# expert (skill 1500, defaults) and regular (calibrated profile), depth 0 and internal depth 7, 4 origins x N runs per class.
# Usage: python3 bg_dngpassive.py [RUNS] [variant names...]   (no names = the main grid)
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 300
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
D7 = {"foes":1,"fury":1,"rest":1,"swarm":1}
PROF = [('x7', {}, D7), ('r0', REG, {}), ('x0', {}, {}), ('r7', REG, D7)]
O = ['dwarf','gnome','halfling','pixie']
D = dict(klass='dungeoneer')
VAR = {'dng': D,
       'dblock': dict(D, dngPassive='block'),
       'dseam': dict(D, dngPassive='seam'),
       'dedge': dict(D, dngPassive='edgehit'),
       'dman': dict(D, dngPassive='manblock'),
       'guard': dict(klass='guard'), 'armsmaster': dict(klass='armsmaster'), 'arcanist': dict(klass='arcanist'),
       # tuned variant run: dmanz (python3 bg_dngpassive.py 300 dmanz). dseam2 / dman2 / dblock2 are defined but were not run.
       'dmanz': dict(D, dngPassive='manblockzone'),
       'dseam2': dict(D, dngPassive='seam', dngAmt=2),
       'dman2': dict(D, dngPassive='manblock', dngAmt=2),
       'dblock2': dict(D, dngPassive='block', dngAmt=2)}
MAIN = ['dng','dblock','dseam','dedge','dman','guard','armsmaster','arcanist']
names = sys.argv[2:] or MAIN
cells = []
for pn, pc, dm in PROF:
    for vn in names:
        for o in O:
            cfg = dict(pc); cfg.update(VAR[vn]); cfg.update(origin=o, depthMods=dm)
            cells.append(('dngp_%s_%s_%s' % (pn, vn, o), cfg))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=RUNS, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_dngpassive.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='_dng_build.html'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
