# Oct 16 Arcanist + passive Boost study on 1.41.47 (snapshot _arc_build.html). Method as bg_oct14.py:
# expert (skill 1500, defaults) and regular (calibrated profile), depth 0 and internal depth 7, 4 origins x N runs per class.
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 300
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
D7 = {"foes":1,"fury":1,"rest":1,"swarm":1}
PROF = [('x7', {}, D7), ('r0', REG, {}), ('x0', {}, {}), ('r7', REG, D7)]
O = ['dwarf','gnome','halfling','pixie']
VAR = [('arcboth', dict(klass='arcanist')),
       ('arcb1', dict(klass='arcanist', arcBoost='all')),
       ('arceither', dict(klass='arcanist', classPatch={"arcanist":{"diagonalZone":"either"}})),
       ('guard', dict(klass='guard')), ('armsmaster', dict(klass='armsmaster')), ('dungeoneer', dict(klass='dungeoneer')),
       ('arcbz', dict(klass='arcanist', arcBoost='zone'))]
cells = []
for pn, pc, dm in PROF:
    for vn, vc in VAR:
        for o in O:
            cfg = dict(pc); cfg.update(vc); cfg.update(origin=o, depthMods=dm)
            cells.append(('arcb_%s_%s_%s' % (pn, vn, o), cfg))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=RUNS, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_arcboost.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='_arc_build.html'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
