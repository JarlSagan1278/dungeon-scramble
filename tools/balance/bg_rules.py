# Nov 25: are the three foe rules fair? Their monsters are drawn often (half the rooms on their floor), with the rule on
# and off, expert depth 7 and regular depth 0. Compare damage taken, turns and deaths in those fights.
# Usage: python3 bg_rules.py [RUNS] -> out_rul_*.json (git-ignored)
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 60
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
D7 = {"foes":1,"fury":1,"rest":1,"swarm":1}
FORCE = """(function(){ const T={1:['Illegal Operation','Transposer Kitty'],2:['Gnome Chomper']}; const o=drawRoomCard;
 window.drawRoomCard=function(fl){ const L=T[S.floorIdx]; if(L && Math.random()<0.5){ const all=[...FLOOR2_ENEMIES,...FLOOR3_ENEMIES]; const c=all.find(x=>x.name===L[Math.floor(Math.random()*L.length)]); if(c) return c; } return o(fl); }; })();"""
OFF = "['Illegal Operation','Transposer Kitty','Gnome Chomper'].forEach(n=>{ [...FLOOR2_ENEMIES,...FLOOR3_ENEMIES].forEach(c=>{ if(c.name===n) delete c.rule; }); });"
cells = []
for rule in ['on','off']:
    for pn, pc, dm in [('x7', {}, D7), ('r0', REG, {})]:
        for k in ['guard','arcanist','armsmaster','dungeoneer']:
            cfg = dict(pc); cfg.update(klass=k, origin='dwarf', depthMods=dm, patchJs=FORCE + (OFF if rule=='off' else ''))
            cells.append(('rul_%s_%s_%s' % (rule, pn, k), cfg))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=RUNS, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, os.path.exists(path), flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
