# Depth study (Oct 12): how difficulty scales with depth. Part 1: every depth modifier alone at each rank
# (what one point of depth costs, per modifier). Part 2: mixed loadouts at rising total depth (the curve a
# player actually climbs). Normal bot (tokens, loot v2, relic picks from every relic), 4 origin/class pairs.
# usage: python3 study_depth.py [runs=300] [jobs=4]   (RD_TAG env = output prefix, RD_CFG env = extra bot config)
import json, os, random, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 300
JOBS = int(sys.argv[2]) if len(sys.argv) > 2 else 4
TAG = os.environ.get('RD_TAG', 'rd')
XCFG = json.loads(os.environ.get('RD_CFG', '{}'))
PAIRS = [('dwarf', 'guard'), ('gnome', 'armsmaster'), ('halfling', 'dungeoneer'), ('pixie', 'arcanist')]
# (max rank, depth added by each rank) -- keep in step with DEPTH_MODS in src/depth.js
MODS = {'foes': (4, [1,1,1,1]), 'rest': (3, [1,1,1]), 'frail': (3, [1,1,1]), 'swarm': (3, [1,3,4]), 'slim': (2, [1,1]), 'fury': (2, [2,2]), 'dread': (3, [1,1,1]), 'gauntlet': (2, [2,2])}
PART = os.environ.get('RD_PART', '12')  # '1' = single modifiers only
def depth(m): return 1 + sum(sum(MODS[k][1][:v]) for k, v in m.items())
loads = [{}]
for k, (mx, c) in MODS.items():
    for r in range(1, mx+1): loads.append({k: r})
rnd = random.Random(12)
for target in ((3, 5, 7, 9, 11, 13, 16) if '2' in PART else ()):
    for t in range(3):
        m = {}
        while depth(m) < target:
            k = rnd.choice([k for k in MODS if m.get(k, 0) < MODS[k][0]])
            if depth(m) + MODS[k][1][m.get(k, 0)] > target: continue
            m[k] = m.get(k, 0) + 1
        loads.append(m)
def name(m): return '+'.join('%s%d' % (k, v) for k, v in sorted(m.items())) or 'none'
cells = [(o, k, m) for m in loads for (o, k) in PAIRS]
def run(cell):
    o, k, m = cell
    label = '%s_%s_%s' % (TAG, o, name(m))
    path = os.path.join(HERE, 'out_' + label + '.json')
    if not os.path.exists(path):
        cfg = dict(runs=RUNS, origin=o, klass=k, depthMods=m, label=label); cfg.update(XCFG)
        subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(cfg)], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=7200)
    d = json.load(open(path))['res']
    n = len(d)
    return dict(origin=o, mods=m, depth=depth(m), n=n, win=sum(r['result'] == 'VICTORY' for r in d)/n,
                floor=sum(r['floor'] for r in d)/n)
with ThreadPoolExecutor(JOBS) as ex: res = list(ex.map(run, cells))
json.dump(res, open(os.path.join(HERE, 'out_depth_summary_%s.json' % TAG), 'w'), indent=1)
agg = {}
for r in res: agg.setdefault(name(r['mods']), []).append(r)
base = sum(x['win'] for x in agg['none'])/len(agg['none'])
print('depth 1 (no modifiers): %.0f%% win' % (base*100))
print('\n-- each modifier alone --')
for nm, rs in agg.items():
    if nm == 'none' or len(rs[0]['mods']) != 1: continue
    w = sum(x['win'] for x in rs)/len(rs); d = rs[0]['depth']
    print('%-14s depth %2d  win %3.0f%%  (%+.0f; %+.1f per depth point)  %s' % (nm, d, w*100, (w-base)*100, (w-base)*100/max(1, d-1), ' '.join('%s%.0f' % (x['origin'][0], x['win']*100) for x in rs)))
print('\n-- mixed loadouts --')
for nm, rs in sorted(agg.items(), key=lambda kv: kv[1][0]['depth']):
    if len(rs[0]['mods']) < 2: continue
    w = sum(x['win'] for x in rs)/len(rs)
    print('depth %2d  win %3.0f%%  %s' % (rs[0]['depth'], w*100, nm))
