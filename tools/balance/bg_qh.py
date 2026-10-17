# Oct 17 Quest Health study on 1.41.54 (snapshot _qh_snapshot.html). Method as bg_dngpassive.py: expert (skill 1500)
# at internal depth 7, regular (calibrated profile) at depth 0; 4 origins x 4 classes x N runs (N=75 -> 300 per origin).
# Usage: python3 bg_qh.py [N] [profile:variant ...]
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
N = int(sys.argv[1]) if len(sys.argv) > 1 else 75
B = os.environ.get('QH_BUILD', '')  # '' = 1.41.54 snapshot (_qh_snapshot.html); '56' = 1.41.56 (_qh56_snapshot.html)
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
D7 = {"foes":1,"fury":1,"rest":1,"swarm":1}
PROF = {'x7': (dict(), D7), 'r0': (REG, {})}
O = ['dwarf','gnome','halfling','pixie']; K = ['armsmaster','guard','arcanist','dungeoneer']
SEEK = dict(qSeek=4)
VAR = {'cap': dict(qhMode='cap'), 'none': dict(qhMode='none'),
       'scap': dict(SEEK, qhMode='cap'), 'snone': dict(SEEK, qhMode='none'),
       'smul': dict(SEEK, qhMode='mul', qhMul=1.5), 'sexc': dict(SEEK, qhMode='except', qhKeep=['Displacer Lair']),
       'inc': dict(qhMode='cap', questAware=False), 'incnone': dict(qhMode='none', questAware=False)}
jobs = sys.argv[2:] or ['x7:cap','x7:none','r0:cap','r0:none','x7:scap','x7:snone','r0:scap','r0:snone','x7:inc','r0:inc']
cells = []
for j in jobs:
    pn, vn = j.split(':'); pc, dm = PROF[pn]
    for o in O:
        for k in K:
            cfg = dict(pc); cfg.update(VAR[vn]); cfg.update(origin=o, klass=k, depthMods=dm)
            cells.append(('qh%s_%s_%s_%s_%s' % (B, pn, vn, o, k), cfg))
def run(c):
    label, cfg = c; p = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(p): return
    full = dict(runs=N, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_qh.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='_qh%s_snapshot.html' % B), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
