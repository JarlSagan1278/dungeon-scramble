# Nov 8 route-goal study launcher (one-off; delete after the write-up). Usage: python3 bg_routegoals.py [RUNS]
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 300
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
D7 = {"foes":1,"fury":1,"rest":1,"swarm":1}
cells = []
for pn, pc, dm in [('r0', REG, {}), ('x7', {}, D7)]:
    for k in ['armsmaster','dungeoneer']:
        for route in [1, 0]:
            for swap in [0, 1]:
                cfg = dict(pc); cfg.update(klass=k, origin='dwarf', depthMods=dm, noRoute=(route==0), swapManeuver=(swap==1))
                cells.append(('rg_%s_%s_r%d_s%d' % (pn, k, route, swap), cfg))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=RUNS, label=label); full.update(cfg)
    r = subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='_rg_build.html'), capture_output=True, text=True, timeout=14400)
    open(os.path.join(HERE, 'sum_' + label + '.json'), 'w').write(r.stdout.strip().split('\n')[-1] if r.stdout.strip() else '{}')
    print('done', label, flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
