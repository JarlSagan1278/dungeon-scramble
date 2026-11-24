# Nov 24 (Jeremy: rebalance a bit from the bot results): candidate levers on 1.42.154, expert depth 7 and regular depth 0.
# Usage: python3 bg_rebal.py [RUNS] -> out_reb_*.json (git-ignored)
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 60
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
D7 = {"foes":1,"fury":1,"rest":1,"swarm":1}
SHR = "SHRINE_SLOT_CHANCE[0]=0.30; SHRINE_SLOT_CHANCE[1]=0.35; SHRINE_SLOT_CHANCE[2]=0.40;"
VAR = [('base', {}), ('shrine', {"patchJs":SHR}), ('hp10', {"hpMul":[1,1.1,1.1]}), ('hit1', {"hitAdd":[0,1,1]}),
       ('mix', {"patchJs":SHR, "hpMul":[1,1.05,1.05]}),
       # round 2: combinations, and +1 hit on Floor 3 only
       ('hpshr', {"patchJs":SHR, "hpMul":[1,1.1,1.1]}), ('hit3', {"hitAdd":[0,0,1]}), ('hp10hit3', {"hpMul":[1,1.1,1.1], "hitAdd":[0,0,1]})]
CL = [('guard','dwarf'),('arcanist','gnome'),('armsmaster','gnome'),('dungeoneer','dwarf')]
cells = []
for v, vc in VAR:
    for pn, pc, dm in [('x7', {}, D7), ('r0', REG, {})]:
        for k, o in CL:
            cfg = dict(pc); cfg.update(vc); cfg.update(klass=k, origin=o, depthMods=dm)
            cells.append(('reb_%s_%s_%s' % (v, pn, k), cfg))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=RUNS, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, os.path.exists(path), flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
