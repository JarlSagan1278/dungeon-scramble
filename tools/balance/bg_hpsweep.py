# Nov 24 (Jeremy: raise overall difficulty a bit): enemy health +0/10/15/20% on every floor, regular depth 0 and expert
# depth 7, Guard and Arcanist (the class extremes), dwarf + gnome. Usage: python3 bg_hpsweep.py [RUNS] -> out_hp_*.json
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 60
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
D7 = {"foes":1,"fury":1,"rest":1,"swarm":1}
cells = []
for m in [100, 110, 115, 120]:
    for pn, pc, dm in [('x7', {}, D7), ('r0', REG, {})]:
        for k in ['guard','arcanist']:
            for o in ['dwarf','gnome']:
                cfg = dict(pc); cfg.update(klass=k, origin=o, depthMods=dm, hpMul=[m/100]*3)
                cells.append(('hp_%d_%s_%s_%s' % (m, pn, k, o), cfg))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=RUNS, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, os.path.exists(path), flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
