# Oct 14: depth curve on 1.41.17 (after the revive / campfire / basics changes). Expert bot, shown depth 0-9
# (internal 1-10), 2 random modifier mixes per depth, 4 origin/class pairs, 100 runs each.
import json, os, random, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
PAIRS = [('dwarf','guard'),('gnome','armsmaster'),('halfling','dungeoneer'),('pixie','arcanist')]
MODS = {'foes':(4,[1,1,1,1]),'rest':(2,[1,2]),'frail':(3,[1,1,2]),'swarm':(2,[1,2]),'slim':(1,[1]),'fury':(2,[3,1]),'dread':(3,[1,1,1]),'gauntlet':(2,[1,2]),'dues':(1,[1]),'round':(1,[1])}
def depth(m): return 1 + sum(sum(MODS[k][1][:v]) for k,v in m.items())
rnd = random.Random(14)
loads = [(0, {})]
for shown in range(1, 10):
    for t in range(2):
        for _ in range(500):
            m = {}
            while depth(m) < shown+1:
                k = rnd.choice([k for k in MODS if m.get(k,0) < MODS[k][0]])
                if depth(m) + MODS[k][1][m.get(k,0)] > shown+1: continue
                m[k] = m.get(k,0)+1
            if depth(m) == shown+1: break
        loads.append((shown, m))
def name(m): return '+'.join('%s%d'%(k,v) for k,v in sorted(m.items())) or 'none'
cells = [(s, m, o, k) for s,m in loads for o,k in PAIRS]
def run(c):
    s, m, o, k = c; label = f'dc_d{s}_{name(m)}_{o}'; path = os.path.join(HERE, 'out_'+label+'.json')
    if not os.path.exists(path):
        cfg = dict(runs=100, origin=o, klass=k, depthMods=m, label=label)
        subprocess.run(['node', os.path.join(HERE,'study_maneuver.js'), json.dumps(cfg)], cwd=HERE, env=dict(os.environ, DS_HTML='snap_1417.html'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
json.dump([[s, m] for s,m in loads], open(os.path.join(HERE,'dc_loads.json'),'w'))
print('ALL DONE', flush=True)
