# Nov 25: are upcoming Daily Dungeons fair? Each day's dungeon (rooms, shrines, loot offers, origin/class) played by the
# regular bot, 40 runs per day, for the next 60 days. Usage: python3 bg_daily.py -> out_dly_<date>.json (git-ignored)
import json, os, subprocess, sys, datetime
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 40
REG = {"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}
start = datetime.date(2026, 11, 25)
def patch(key):
    return ("(function(){ const K='%s'; const o=newGame; window.newGame=function(a,b,c,d,e){ const r=seedRng('daily|'+K);"
            " const og=['dwarf','gnome'][Math.floor(r()*2)], kl=['armsmaster','guard','dungeoneer','arcanist'][Math.floor(r()*4)];"
            " RNG=seedRng(K+'|start'); const out=o(og,kl,c,d,{}); S.daily={key:K,n:1,log:[],practice:true}; RNG=Math.random; window.__daily=og+'/'+kl; return out; }; })();" % key)
cells = []
for i in range(60):
    k = (start + datetime.timedelta(days=i)).isoformat()
    cfg = dict(REG); cfg.update(klass='guard', origin='dwarf', depthMods={}, patchJs=patch(k))
    cells.append(('dly_' + k, cfg))
def run(c):
    label, cfg = c; path = os.path.join(HERE, 'out_' + label + '.json')
    if os.path.exists(path): return
    full = dict(runs=RUNS, label=label); full.update(cfg)
    subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(full)], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=14400)
    print('done', label, os.path.exists(path), flush=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, cells))
print('ALL DONE', flush=True)
