import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
D7 = {"foes":1,"fury":1,"rest":1,"swarm":1}
cells = []
for o in ['dwarf','gnome','halfling','pixie']:
    for k in ['armsmaster','guard','arcanist']: cells.append(('b1411x7_%s_%s' % (o,k), dict(origin=o, klass=k, depthMods=D7)))
    cells.append(('dvx7_tb_%s' % o, dict(origin=o, klass='dungeoneer', depthMods=D7, classPatch={"dungeoneer":{"zone":"(r,c)=>r===0||r===3||c===0||c===3","wrapV":True}})))
    cells.append(('dvx7_pv_%s' % o, dict(origin=o, klass='dungeoneer', depthMods=D7, classPatch={"dungeoneer":{"convertTo":{"type":"pivot"}}})))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=200, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='snap_1411.html'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(3) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
