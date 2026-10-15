# Oct 15: shrine boosts, round 3 (Jeremy: boost the weak shrines' own rewards; a loot pick only where it fits the theme).
# Same setup as bg_shrines.py (regular bot, Dwarf Guard + Pixie Arcanist, every eligible room on that floor is the shrine).
import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
PAIRS = [('dwarf','guard'),('pixie','arcanist')]
def bargain(price, then, label): return {"type":"choice","options":[{"label":label,"effect":{"type":"bargain","price":price,"then":then}},{"label":"Walk away","effect":{"type":"leave"}}]}
P = {
 'Cryotherapist': ({"effect":{"type":"multi","effects":[{"type":"heal","amount":15},{"type":"grantToken","token":"freeze","charges":2}]}}, {}),
 'Scroll Dispenser: TSOP': ({"effect":{"type":"grantToken","token":"freeze","charges":2},"loot":True}, {}),
 'Scroll Dispenser: CRELA': ({"effect":{"type":"grantToken","token":"nullify","charges":5},"loot":True}, {}),
}
import re
def slug(n): return re.sub(r'[^A-Za-z0-9]+','_',n)
V = [(slug(n), dict(forceShrine=n, shrinePatch={n:p}, **x)) for n,(p,x) in P.items()]
V += [] and [(slug(n)+'_tok1', dict(forceShrine=n, shrinePatch={n:p}, tokenRate=1.0)) for n,(p,x) in P.items() if n.startswith('Scroll')]
V += [] and [(f'LOOT_F{f}', {"forceShrine":n, "lootShrine":True}) for f,n in {1:'Sacred Bellows', 2:'Enchanted Anvil', 3:"Heron's Fountain"}.items()]
cells = [(f'r3_{v}_{o}', dict(REG, origin=o, klass=k, shrineAll=True, **x)) for v,x in V for o,k in PAIRS]
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_'+label+'.json')
    if not os.path.exists(path):
        full = dict(runs=200, label=label); full.update(cfg)
        subprocess.run(['node', os.path.join(HERE,'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='snap_1422c.html'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', len(cells), flush=True)
