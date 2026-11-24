# Nov 25: the three new foe rules (Zero-Sum Game, Pythagorean Theorem, Asymptote). Their foes are drawn in half the rooms of
# their floor, rule on and off; five play styles (class x origin), expert depth 7 and regular depth 0. Compares deaths,
# damage taken and turns in those fights. Usage: python3 bg_rules2.py [RUNS] -> out_ru2_*.json (git-ignored)
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 60
TAG = sys.argv[2] if len(sys.argv) > 2 else 'ru2'
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
D7 = {"foes":1,"fury":1,"rest":1,"swarm":1}
FORCE = """(function(){ const T={1:['Rogue Technician'],2:['Anti-Euclidian Space','Anti-Euclidian Space','The Punished']}; const o=drawRoomCard;
 window.drawRoomCard=function(fl){ const L=T[S.floorIdx]; if(L && Math.random()<0.6){ const all=[...FLOOR2_ENEMIES,...FLOOR3_ENEMIES,...FLOOR3_TRAPS]; const c=all.find(x=>x.name===L[Math.floor(Math.random()*L.length)]); if(c) return c; } return o(fl); }; })();"""
OFF = "['Rogue Technician','Anti-Euclidian Space','The Punished'].forEach(n=>{ [...FLOOR2_ENEMIES,...FLOOR3_ENEMIES,...FLOOR3_TRAPS].forEach(c=>{ if(c.name===n) delete c.rule; }); });"
STYLES = [('guard','dwarf'),('arcanist','gnome'),('armsmaster','dwarf'),('dungeoneer','dwarf'),('armsmaster','gnome')]
cells = []
for rule in ['on','off']:
    for pn, pc, dm in [('x7', {}, D7), ('r0', REG, {})]:
        for k, o in STYLES:
            cfg = dict(pc); cfg.update(klass=k, origin=o, depthMods=dm, patchJs=FORCE + (OFF if rule=='off' else ''))
            cells.append(('%s_%s_%s_%s-%s' % (TAG, rule, pn, k, o), cfg))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=RUNS, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, os.path.exists(path), flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
