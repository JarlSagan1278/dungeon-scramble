# Maneuver dice re-measure (Oct 13, build 1.39.7, player-like bot): are Maneuver dice still a net loss now that
# Swap/Reroll leave a Pivot and Arcanist moves diagonally far more? Variants as in the Oct 11 study.
# usage: python3 study_maneuver2.py [runs=300] [jobs=4]   (RM_TAG, RM_MODS env)
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 300
JOBS = int(sys.argv[2]) if len(sys.argv) > 2 else 4
TAG = os.environ.get('RM_TAG', 'rm'); MODS = json.loads(os.environ.get('RM_MODS', '{"foes":1,"fury":1,"rest":1,"swarm":1}'))
XCFG = json.loads(os.environ.get('RM_CFG', '{}'))
PAIRS = [('dwarf','guard'), ('gnome','armsmaster'), ('halfling','dungeoneer'), ('pixie','arcanist')]
VARIANTS = [('today', {}), ('all Attack dice', {'swapManeuver': True}), ('Momentum', {'payoff': 'momentum'}), ('Dodge Block', {'payoff': 'dodgeBlock'})]
def run(cell):
    (nm, extra), (o, k) = cell
    label = '%s_%s_%s' % (TAG, nm.replace(' ', '_'), o); path = os.path.join(HERE, 'out_' + label + '.json')
    if not os.path.exists(path):
        cfg = dict(runs=RUNS, origin=o, klass=k, depthMods=MODS, label=label); cfg.update(XCFG); cfg.update(extra)
        subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(cfg)], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    d = json.load(open(path))['res']; n = len(d)
    fights = [f for r in d for f in r['fights'] if f.get('done')]
    taken = [sum(f.get('taken', 0) for f in fights if f['floor'] == fl) / max(1, sum(1 for f in fights if f['floor'] == fl)) for fl in (1, 2, 3)]
    turns = [sum(f['turns'] for f in fights if f['floor'] == fl) / max(1, sum(1 for f in fights if f['floor'] == fl)) for fl in (1, 2, 3)]
    return nm, o, sum(r['result'] == 'VICTORY' for r in d) / n, taken, turns
cells = [(v, p) for v in VARIANTS for p in PAIRS]
with ThreadPoolExecutor(JOBS) as ex: res = list(ex.map(run, cells))
print('loadout %s, %d runs per pair\n' % (MODS, RUNS))
print('%-16s %6s   %-22s %-22s %s' % ('variant', 'win', 'HP lost/fight F1-F3', 'turns/fight F1-F3', 'per pair'))
for nm, _ in VARIANTS:
    rs = [r for r in res if r[0] == nm]; m = lambda f: sum(f(r) for r in rs) / len(rs)
    print('%-16s %5.0f%%   %-22s %-22s %s' % (nm, m(lambda r: r[2]) * 100, ' / '.join('%.1f' % m(lambda r, i=i: r[3][i]) for i in range(3)),
          ' / '.join('%.2f' % m(lambda r, i=i: r[4][i]) for i in range(3)), ' '.join('%s%.0f' % (r[1][0], r[2] * 100) for r in rs)))
