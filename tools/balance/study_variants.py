# Generic variant sweep (Oct 13): runs each variant over 4 origin/class pairs and prints win %, the share of runs
# that die on each floor (of the runs that reach it) and HP lost per fight by floor.
# usage: python3 study_variants.py <tag> '<json list of [name, cfg]>' [runs=200] [jobs=4]
#   env SV_CFG (merged into every run, e.g. the regular-player profile), SV_MODS (depth modifiers, default none)
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
TAG = sys.argv[1]; VARIANTS = json.loads(sys.argv[2])
RUNS = int(sys.argv[3]) if len(sys.argv) > 3 else 200
JOBS = int(sys.argv[4]) if len(sys.argv) > 4 else 4
XCFG = json.loads(os.environ.get('SV_CFG', '{}')); MODS = json.loads(os.environ.get('SV_MODS', '{}'))
PAIRS = [('dwarf','guard'), ('gnome','armsmaster'), ('halfling','dungeoneer'), ('pixie','arcanist')]
def run(cell):
    (nm, extra), (o, k) = cell
    label = '%s_%s_%s' % (TAG, nm.replace(' ', '_'), o); path = os.path.join(HERE, 'out_' + label + '.json')
    if not os.path.exists(path):
        cfg = dict(runs=RUNS, origin=o, klass=k, depthMods=MODS, label=label); cfg.update(XCFG); cfg.update(extra)
        subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(cfg)], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    return nm, o, json.load(open(path))['res']
cells = [(v, p) for v in VARIANTS for p in PAIRS]
with ThreadPoolExecutor(JOBS) as ex: res = list(ex.map(run, cells))
print('profile %s, mods %s, %d runs per pair' % (XCFG, MODS, RUNS))
print('%-24s %5s  %-24s %-20s %s' % ('variant', 'win', 'die on F1/F2/F3 (%)', 'HP lost/fight F1-F3', 'per pair'))
for nm, _ in VARIANTS:
    rs = [r for r in res if r[0] == nm]; runs = [x for r in rs for x in r[2]]
    reach = [sum(1 for x in runs if x['floor'] >= f) for f in (1, 2, 3)]
    die = [sum(1 for x in runs if x['result'] == 'GAMEOVER' and x['floor'] == f) for f in (1, 2, 3)]
    fights = [f for x in runs for f in x['fights'] if f.get('done')]
    tk = [sum(f.get('taken', 0) for f in fights if f['floor'] == fl) / max(1, sum(1 for f in fights if f['floor'] == fl)) for fl in (1, 2, 3)]
    print('%-24s %4.0f%%  %-24s %-20s %s' % (nm, 100 * sum(x['result'] == 'VICTORY' for x in runs) / len(runs),
          ' / '.join('%.0f' % (100 * die[i] / max(1, reach[i])) for i in range(3)), ' / '.join('%.1f' % t for t in tk),
          ' '.join('%s%.0f' % (r[1][0], 100 * sum(x['result'] == 'VICTORY' for x in r[2]) / len(r[2])) for r in rs)))
