# Nov 25 (Jeremy: use the remaining compute): are high Depths fair? Expert bot, 4 classes x dwarf/gnome, three Depth mixes.
# Usage: python3 bg_highdepth.py [RUNS] -> out_hd_*.json (git-ignored)
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 50
MIX = {
  'd10a': {"foes":2,"fury":1,"rest":1,"swarm":1,"dread":1,"frail":1,"dues":1},
  'd10b': {"foes":4,"dread":3,"gauntlet":1,"round":1},
  'd14':  {"foes":4,"fury":1,"dread":2,"rest":2,"swarm":1,"frail":1,"dues":1},
}
cells = []
for m, dm in MIX.items():
    for k in ['guard','arcanist','armsmaster','dungeoneer']:
        for o in ['dwarf','gnome']:
            cells.append(('hd_%s_%s_%s' % (m, k, o), dict(klass=k, origin=o, depthMods=dm)))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=RUNS, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, os.path.exists(path), flush=True)
with ThreadPoolExecutor(3) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
