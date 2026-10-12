# Class x origin study (Oct 12): every origin/class pair at one depth loadout, to tell whether origin or
# class carries the wins. Player-like bot. Prints the win grid, each factor's main effect, and the share
# of the spread each explains (two-way additive split; the remainder is the pair interaction).
# usage: python3 study_pairs.py [runs=300] [jobs=4]   (RP_TAG env = output prefix, RP_MODS env = depth loadout JSON)
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 300
JOBS = int(sys.argv[2]) if len(sys.argv) > 2 else 4
TAG = os.environ.get('RP_TAG', 'rp')
MODS = json.loads(os.environ.get('RP_MODS', '{"dread":1,"foes":2,"rest":2,"swarm":1}'))
XCFG = json.loads(os.environ.get('RP_CFG', '{}'))
ORIGINS = ['dwarf', 'gnome', 'halfling', 'pixie']
CLASSES = ['armsmaster', 'guard', 'dungeoneer', 'arcanist']
def run(cell):
    o, k = cell
    label = '%s_%s_%s' % (TAG, o, k)
    path = os.path.join(HERE, 'out_' + label + '.json')
    if not os.path.exists(path):
        cfg = dict(runs=RUNS, origin=o, klass=k, depthMods=MODS, label=label); cfg.update(XCFG)
        subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(cfg)], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    d = json.load(open(path))['res']
    n = len(d)
    return dict(origin=o, klass=k, n=n, win=sum(r['result'] == 'VICTORY' for r in d)/n, floor=sum(r['floor'] for r in d)/n)
cells = [(o, k) for o in ORIGINS for k in CLASSES]
with ThreadPoolExecutor(JOBS) as ex: res = list(ex.map(run, cells))
json.dump(dict(mods=MODS, res=res), open(os.path.join(HERE, 'out_pairs_summary_%s.json' % TAG), 'w'), indent=1)
W = {(r['origin'], r['klass']): r['win']*100 for r in res}
mean = sum(W.values())/len(W)
om = {o: sum(W[o, k] for k in CLASSES)/4 for o in ORIGINS}
cm = {k: sum(W[o, k] for o in ORIGINS)/4 for k in CLASSES}
print('loadout %s, %d runs per pair, mean win %.0f%%\n' % (MODS, RUNS, mean))
print('%-10s' % '' + ''.join('%12s' % k for k in CLASSES) + '   origin avg')
for o in ORIGINS: print('%-10s' % o + ''.join('%11.0f%%' % W[o, k] for k in CLASSES) + '   %5.0f%%' % om[o])
print('%-10s' % 'class avg' + ''.join('%11.0f%%' % cm[k] for k in CLASSES))
ss_o = 4*sum((v-mean)**2 for v in om.values()); ss_c = 4*sum((v-mean)**2 for v in cm.values())
ss_t = sum((v-mean)**2 for v in W.values()); ss_i = ss_t - ss_o - ss_c
print('\nshare of the spread: origin %.0f%%, class %.0f%%, pair interaction %.0f%%' % (100*ss_o/ss_t, 100*ss_c/ss_t, 100*ss_i/ss_t))
print('origin range %.0f pts (%s..%s), class range %.0f pts (%s..%s)' % (max(om.values())-min(om.values()), min(om, key=om.get), max(om, key=om.get), max(cm.values())-min(cm.values()), min(cm, key=cm.get), max(cm, key=cm.get)))
