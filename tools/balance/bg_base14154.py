# Oct 17 class baseline on 1.41.54 (snapshot _base14154_build.html). Method as bg_arcboost.py / bg_dngpassive.py:
# expert (skill 1500, defaults) and regular (calibrated profile), depth 0 and internal depth 7, 4 origins x N runs per class.
# No knobs: Arcanist boostPlus and Dungeoneer seamDamage are built into the game. Runs study_maneuver.js directly
# (study_arcboost.js / study_dngpassive.js with no knob are the same script). Resumes: finished out_ files are skipped.
# Usage: python3 bg_base14154.py [RUNS]
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 300
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
D7 = {"foes":1,"fury":1,"rest":1,"swarm":1}
PROF = [('x7', {}, D7), ('r0', REG, {}), ('x0', {}, {}), ('r7', REG, D7)]
O = ['dwarf','gnome','halfling','pixie']
K = ['guard','armsmaster','dungeoneer','arcanist']
cells = []
for pn, pc, dm in PROF:
    for k in K:
        for o in O:
            cfg = dict(pc); cfg.update(klass=k, origin=o, depthMods=dm)
            cells.append(('base14154_%s_%s_%s' % (pn, k, o), cfg))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=RUNS, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='_base14154_build.html'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, os.path.exists(path), flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
