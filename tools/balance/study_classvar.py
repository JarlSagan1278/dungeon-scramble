# Class tuning study (Oct 12): each class as-is plus candidate tweaks (classPatch in study_maneuver.js),
# at one depth loadout, averaged over two origins (origin barely matters: see the class x origin study).
# usage: python3 study_classvar.py [runs=300] [jobs=4]   (RC_TAG env = output prefix, RC_MODS env = depth loadout JSON)
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 300
JOBS = int(sys.argv[2]) if len(sys.argv) > 2 else 4
TAG = os.environ.get('RC_TAG', 'rc')
MODS = json.loads(os.environ.get('RC_MODS', '{"dread":1,"foes":2,"rest":2,"swarm":1}'))
ORIGINS = ['halfling', 'pixie']
VARIANTS = [
    ('guard as-is', 'guard', {}),
    ('armsmaster as-is', 'armsmaster', {}),
    ('dungeoneer as-is', 'dungeoneer', {}),
    ('arcanist as-is', 'arcanist', {}),
    ('guard Block 1', 'guard', {'convertTo': {'type': 'block', 'value': 1}}),
    ('guard zone = right column middle 2', 'guard', {'zone': '(r,c)=>(r===1||r===2)&&c===3'}),
    ('dungeoneer wraps on every row', 'dungeoneer', {'zone': '(r,c)=>c===0||c===3'}),
    ('arcanist zone = both diagonals', 'arcanist', {'zone': '(r,c)=>r===c||r+c===3'}),
    ('arcanist zone = middle 2x2 + rising diag', 'arcanist', {'zone': '(r,c)=>r+c===3||((r===1||r===2)&&(c===1||c===2))'}),
]
VARIANTS = [v for v in VARIANTS if not os.environ.get('RC_ONLY') or v[0] in os.environ['RC_ONLY'].split('|')]
def slug(s): return ''.join(ch if ch.isalnum() else '_' for ch in s)
def run(cell):
    (nm, k, patch), o = cell
    label = '%s_%s_%s' % (TAG, slug(nm), o)
    path = os.path.join(HERE, 'out_' + label + '.json')
    if not os.path.exists(path):
        cfg = dict(runs=RUNS, origin=o, klass=k, depthMods=MODS, label=label, classPatch={k: patch} if patch else {})
        subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(cfg)], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    d = json.load(open(path))['res']
    return nm, o, sum(r['result'] == 'VICTORY' for r in d)/len(d)
cells = [(v, o) for v in VARIANTS for o in ORIGINS]
with ThreadPoolExecutor(JOBS) as ex: res = list(ex.map(run, cells))
print('loadout %s, %d runs x %d origins per row\n' % (MODS, RUNS, len(ORIGINS)))
agg = {}
for nm, o, w in res: agg.setdefault(nm, []).append((o, w))
out = {}
for nm, ws in agg.items():
    avg = sum(w for _, w in ws)/len(ws); out[nm] = avg
    print('%-42s %3.0f%%   %s' % (nm, avg*100, ' '.join('%s %.0f' % (o, w*100) for o, w in ws)))
json.dump(dict(mods=MODS, res=out), open(os.path.join(HERE, 'out_classvar_summary_%s.json' % TAG), 'w'), indent=1)
