# Oct 15: Extruzeon HP raise (Jeremy: make it dangerous for skilled players at depth). Floor 3 boss forced,
# Extruzeon at x1.0-1.6 HP vs the other big bosses. Expert at depth 7 (Tougher Scuffs 1, Zeal 1, Rationing 1, Swarming 1) and regular at depth 0.
import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
PAIRS = [('dwarf','guard'),('gnome','armsmaster'),('halfling','dungeoneer'),('pixie','arcanist')]
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
D7 = {'foes':1,'fury':1,'rest':1,'swarm':1}
EX = 'Extruzeon, Co-consul of Waste'
OTHERS = ['Myceleus, Co-consul of Rot','Toadtaur Wizard, Assistant to the Co-consul']
V = []
for m in (1.1,): V.append((f'exp_ext{int(m*100)}', dict(depthMods=D7, forceBoss=EX, bossHpMul=[1,1,m])))

for m in (1.1,1.2): V.append((f'reg_ext{int(m*100)}', dict(REG, forceBoss=EX, bossHpMul=[1,1,m])))

cells = [(f'ex_{v}_{o}', dict(x, origin=o, klass=k)) for v,x in V for o,k in PAIRS]
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_'+label+'.json')
    if not os.path.exists(path):
        full = dict(runs=100, label=label); full.update(cfg)
        subprocess.run(['node', os.path.join(HERE,'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='snap_1422.html'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', len(cells), flush=True)
