# Relic study (Oct 12): every relic forced at the start of the run, all other relics declined (relicLock),
# compared with a no-relic baseline, per origin. Clean of selection bias: the bot never picks relics.
# usage: python3 study_relics.py [runs=500] [jobs=4]   -> out_relics_summary.json + printed table
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 500
JOBS = int(sys.argv[2]) if len(sys.argv) > 2 else 4
PAIRS = [('dwarf', 'guard'), ('gnome', 'armsmaster'), ('halfling', 'dungeoneer'), ('pixie', 'arcanist')]
SHRINE = ['whetstone','iron_rations','gambeson','lucky_coin','kettle','banner','flask','echo_chime','venom_vial','hungry_blade','tincture',
          'barbed_buckler','overflow_chalice','bloodletter','spite_thorns','grave_tally','dodger_cloak','leaper_spurs','pivot_compass',
          'frost_charm','warding_bell','shrine_bell','combo_gauntlet']
ORIGIN = {'dwarf':'forgeplate', 'gnome':'spore_satchel', 'halfling':'picnic_basket', 'pixie':'glimmer_dust'}
EXTRA = json.loads(os.environ.get('RS_PAIRS', '[]'))
TAG = os.environ.get('RS_TAG', 'rs')            # output prefix, so reruns with a new bot don't reuse old files
XCFG = json.loads(os.environ.get('RS_CFG', '{}'))  # extra bot config for every cell, e.g. {"depthMods":{"foes":2}}
ONLY = json.loads(os.environ.get('RS_ONLY', 'null'))  # optional subset of relic ids to run  # optional relic pairs, e.g. [["glimmer_dust","leaper_spurs"]]

cells = []
for o, k in PAIRS:
    cells.append((o, k, []))
    for r in SHRINE:
        if ONLY is None or r in ONLY: cells.append((o, k, [r]))
    if ONLY is None or ORIGIN[o] in ONLY: cells.append((o, k, [ORIGIN[o]]))
    for pr in EXTRA: cells.append((o, k, pr))

def run(cell):
    o, k, rel = cell
    label = '%s_%s_%s' % (TAG, o, '+'.join(rel) or 'none')
    path = os.path.join(HERE, 'out_' + label + '.json')
    if not os.path.exists(path):
        cfg = dict(runs=RUNS, origin=o, klass=k, forceRelics=rel, relicLock=True, label=label); cfg.update(XCFG)
        subprocess.run(['node', os.path.join(HERE, 'study_maneuver.js'), json.dumps(cfg)], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=3600)
    d = json.load(open(path))['res']
    n = len(d); wins = sum(1 for r in d if r['result'] == 'VICTORY')
    fights = [f for r in d for f in r['fights'] if f.get('done')]
    taken = {fl: [f.get('taken', 0) for f in fights if f['floor'] == fl] for fl in (1, 2, 3)}
    deaths = {fl: sum(1 for r in d for f in r['fights'] if f.get('died') and f['floor'] == fl) for fl in (1, 2, 3)}
    turns = [f['turns'] for f in fights]
    return dict(origin=o, relics=rel, n=n, win=wins / n,
                taken={fl: (sum(v) / len(v) if v else 0) for fl, v in taken.items()},
                deaths={fl: deaths[fl] / n for fl in deaths}, turns=sum(turns) / max(1, len(turns)))

with ThreadPoolExecutor(JOBS) as ex:
    res = list(ex.map(run, cells))
base = {r['origin']: r for r in res if not r['relics']}
for r in res:
    b = base[r['origin']]
    r['dWin'] = r['win'] - b['win']
    r['dTaken'] = {fl: r['taken'][fl] - b['taken'][fl] for fl in r['taken']}
    r['dTurns'] = r['turns'] - b['turns']
json.dump(res, open(os.path.join(HERE, 'out_relics_summary_%s.json' % TAG), 'w'), indent=1)
# table: mean over origins
rows = {}
for r in res:
    if not r['relics']: continue
    rows.setdefault('+'.join(r['relics']), []).append(r)
print('baseline win: ' + ', '.join('%s %.0f%%' % (o, base[o]['win'] * 100) for o in base))
print('%-34s %7s %7s %7s %7s %7s  %s' % ('relic', 'dWin', 'dHP F1', 'dHP F2', 'dHP F3', 'dTurns', 'per origin dWin'))
for name, rs in sorted(rows.items(), key=lambda kv: -sum(x['dWin'] for x in kv[1]) / len(kv[1])):
    m = lambda f: sum(f(x) for x in rs) / len(rs)
    print('%-34s %+6.1f%% %+7.2f %+7.2f %+7.2f %+7.2f  %s' % (name, m(lambda x: x['dWin']) * 100, m(lambda x: x['dTaken'][1]), m(lambda x: x['dTaken'][2]), m(lambda x: x['dTaken'][3]), m(lambda x: x['dTurns']),
          ' '.join('%s%+.0f' % (x['origin'][0], x['dWin'] * 100) for x in rs)))
