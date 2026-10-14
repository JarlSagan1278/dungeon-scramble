# Revive rule study (Oct 14): today's Back Pocket revive vs "a save spends the whole Pocket". Build 1.41.15 + switch.
import json, os, subprocess
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
NEW = {"skill":30,"abilityRate":0.2,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.8}
D7 = {"foes":1,"fury":1,"rest":1,"swarm":1}
PAIRS = [('dwarf','guard'),('gnome','armsmaster'),('halfling','dungeoneer'),('pixie','arcanist')]
cells = []
for rule, extra in [('today', {}), ('clear', {"reviveClear": True})]:
    for o,k in PAIRS:
        for prof, base in [('reg', dict(REG)), ('new', dict(NEW)), ('x7', {"depthMods": D7})]:
            cfg = dict(base, origin=o, klass=k); cfg.update(extra)
            cells.append((f'rev_{rule}_{prof}_{o}', cfg))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=200, label=label); full.update(cfg)
    r = subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, env=dict(os.environ, DS_HTML='snap_rev.html'), stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True, timeout=14400)
    rev = [l for l in (r.stderr or '').splitlines() if l.startswith('REV') or l.startswith('CAMP')]
    print('done', label, ' '.join(rev), flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
