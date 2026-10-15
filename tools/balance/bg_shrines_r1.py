# Oct 15: shrine boosts, round 1 (Jeremy: boost the weak shrines' own rewards; a loot pick only where it fits the theme).
# Same setup as bg_shrines.py (regular bot, Dwarf Guard + Pixie Arcanist, every eligible room on that floor is the shrine).
import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
PAIRS = [('dwarf','guard'),('pixie','arcanist')]
def bargain(price, then, label): return {"type":"choice","options":[{"label":label,"effect":{"type":"bargain","price":price,"then":then}},{"label":"Walk away","effect":{"type":"leave"}}]}
P = {
 'Blood-Drive Treats': ({"effect":bargain({"maxHp":3},{"type":"relicChoice","count":4,"take":2},"Pay 3 max health: choose 2 Relics")}, {"alwaysBargain":True}),
 'Scroll Dispenser: CRELA': ({"effect":{"type":"grantToken","token":"nullify","charges":6}}, {}),
 'Scroll Dispenser: AWSP': ({"effect":{"type":"grantToken","token":"swap","charges":5}}, {}),
 'Sacred Bellows': ({"effect":{"type":"maxHealthUp","amount":10}}, {}),
 'Half-Empty Fountain': ({"effect":{"type":"choice","options":[{"label":"Heal 15","effect":{"type":"heal","amount":15}},{"label":"+8 Max Health","effect":{"type":"maxHealthUp","amount":8}}]}}, {}),
 'Scroll Dispenser: GIB': ({"effect":{"type":"grantToken","token":"boost","value":4,"charges":4}}, {}),
 'Scroll Dispenser: DOER': ({"effect":{"type":"grantToken","token":"reroll","charges":5}}, {}),
 'Enchanted Anvil': ({"effect":{"type":"choice","options":[{"label":"Upgrade 2 Attack Dice","effect":{"type":"dieUpgrade","cat":"attack","count":2}},{"label":"Upgrade 2 Maneuver Dice","effect":{"type":"dieUpgrade","cat":"maneuver","count":2}}]}}, {}),
 'Cryotherapist': ({"effect":{"type":"choice","options":[{"label":"Heal 14","effect":{"type":"heal","amount":14}},{"label":"2 Freeze tokens","effect":{"type":"grantToken","token":"freeze","charges":2}}]}}, {}),
 'Time-Intensive Shrine': ({"effect":bargain({"skipRest":True},{"type":"relicChoice","count":4,"take":2},"Skip your next campfire: choose 2 Relics")}, {}),
 'Madpie Nest': ({"loot":True}, {}),
 'Faustian Spreadsheet': ({"effect":bargain({"maxHp":5},{"type":"relicChoice","count":4,"take":2},"Pay 5 max health: choose 2 of 4 Relics")}, {"alwaysBargain":True}),
 'Scroll Dispenser: TSOP': ({"effect":{"type":"grantToken","token":"freeze","charges":3}}, {}),
 'Charged Fae-Lines': ({"effect":{"type":"relicChoice","theme":"path","count":4,"take":2}}, {}),
 'Storied Emporium': ({"loot":True}, {}),
 'Indoctrination Inoculation': ({"effect":{"type":"relicChoice","theme":"defense","maxHp":5}}, {}),
}
import re
def slug(n): return re.sub(r'[^A-Za-z0-9]+','_',n)
V = [(slug(n), dict(forceShrine=n, shrinePatch={n:p}, **x)) for n,(p,x) in P.items()]
V += [(slug(n)+'_tok1', dict(forceShrine=n, shrinePatch={n:p}, tokenRate=1.0)) for n,(p,x) in P.items() if n.startswith('Scroll')]
V += [(f'LOOT_F{f}', {"forceShrine":n, "lootShrine":True}) for f,n in {1:'Sacred Bellows', 2:'Enchanted Anvil', 3:"Heron's Fountain"}.items()]
cells = [(f'r1_{v}_{o}', dict(REG, origin=o, klass=k, shrineAll=True, **x)) for v,x in V for o,k in PAIRS]
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_'+label+'.json')
    if not os.path.exists(path):
        full = dict(runs=200, label=label); full.update(cfg)
        subprocess.run(['node', os.path.join(HERE,'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='snap_1422b.html'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', len(cells), flush=True)
