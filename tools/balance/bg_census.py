# Nov 25 (Jeremy: use the compute): (1) content census -- every class x origin, regular depth 0 and expert at the depth-7
# preset, logging every fight, loot offer/pick, relic and shrine; (2) the Depth ladder -- the game's own presets 0..27,
# expert at every depth and regular at 0..10. Usage: python3 bg_census.py -> out_cen_*.json, out_lad_*.json (git-ignored)
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
P = json.load(open(os.path.join(HERE, '_presets.json')))
CL = ['guard','armsmaster','dungeoneer','arcanist']; OR = ['dwarf','gnome','halfling','pixie']
cells = []
for k in CL:
    for o in OR:
        cfg = dict(REG); cfg.update(klass=k, origin=o, depthMods={}); cells.append(('cen_r0_%s_%s' % (k, o), cfg, 250))
        cfg = dict(klass=k, origin=o, depthMods=P['7']['m']); cells.append(('cen_x7_%s_%s' % (k, o), cfg, 250))
for n in range(0, 28):
    for k in CL:
        cells.append(('lad_x_%02d_%s' % (n, k), dict(klass=k, origin=['dwarf','gnome'][n % 2], depthMods=P[str(n)]['m']), 40))
        if n <= 10:
            cfg = dict(REG); cfg.update(klass=k, origin=['dwarf','gnome'][n % 2], depthMods=P[str(n)]['m']); cells.append(('lad_r_%02d_%s' % (n, k), cfg, 40))
def run(c):
    label, cfg, runs = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=runs, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20000)
    print('done', label, os.path.exists(path), flush=True)
print(len(cells), 'cells', sum(c[2] for c in cells), 'runs', flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
