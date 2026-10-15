# Oct 15: per-modifier depth cost (Jeremy: reprice the modifiers that are really off; working out the cheapest set is part of the fun).
# Expert bot, base = Tougher Scuffs 2 (shown depth 2); each variant adds one modifier at rank r. Cost of rank r = win(r-1) - win(r).
import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
PAIRS = [('dwarf','guard'),('gnome','armsmaster'),('halfling','dungeoneer'),('pixie','arcanist')]
BASE = {'foes':2}
MAXR = {'foes':4,'rest':2,'frail':3,'swarm':2,'slim':1,'fury':2,'dread':3,'dues':1,'round':1,'gauntlet':2}
V = [('base', dict(BASE))]
for k,mx in MAXR.items():
    for r in range(1, mx+1):
        if k=='foes' and r<=2: continue
        m = dict(BASE); m[k] = r; V.append((f'{k}{r}', m))
cells = [(f'dm_{v}_{o}', dict(runs=150, origin=o, klass=k, depthMods=m)) for v,m in V for o,k in PAIRS]
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_'+label+'.json')
    if not os.path.exists(path):
        full = dict(label=label); full.update(cfg)
        subprocess.run(['node', os.path.join(HERE,'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='snap_1422b.html'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', len(cells), flush=True)
