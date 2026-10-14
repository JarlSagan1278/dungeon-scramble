# Oct 14: every shrine vs a same-floor "loot-pick shrine" (Jeremy: every shrine must be at least as good as a loot pick).
# Each variant forces one shrine on its floor and makes every eligible room there a shrine (2 per floor), regular bot.
import json, os, subprocess, re
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
PAIRS = [('dwarf','guard'),('pixie','arcanist')]
src = open(os.path.join(HERE,'../../src/data.js')).read()
names = re.findall(r"enc\('([^']+)','Shrine'", src)
variants = [(n, {"forceShrine":n}) for n in names]
base = {1:'Sacred Bellows', 2:'Enchanted Anvil', 3:"Heron's Fountain"}   # any shrine of that floor, boon stripped
variants += [(f'LOOT_F{f}', {"forceShrine":n, "lootShrine":True}) for f,n in base.items()]
def slug(n): return re.sub(r'[^A-Za-z0-9]+','_',n)
cells = [(f'sh_{slug(v)}_{o}', dict(REG, origin=o, klass=k, shrineAll=True, **x)) for v,x in variants for o,k in PAIRS]
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=200, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='snap_1419.html'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', len(cells), flush=True)
