# Nov 23: what made the game easier since October? Expert bot, internal depth 7, Armsmaster (dwarf, gnome), one recent
# feature switched off at a time. Usage: python3 bg_ablate.py [RUNS]; results: out_abl_*.json (git-ignored)
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 100
D7 = {"foes":1,"fury":1,"rest":1,"swarm":1}
VAR = [('base', {}), ('stdfork', {"fork":"standard"}), ('noquest', {"noQuests":True}), ('noshrine', {"noShrines":True}), ('norelic', {"relicLock":True})]
cells = [('abl_%s_%s' % (v, o), dict(c, klass='armsmaster', origin=o, depthMods=D7)) for v, c in VAR for o in ['dwarf','gnome']]
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=RUNS, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, os.path.exists(path), flush=True)
with ThreadPoolExecutor(3) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
