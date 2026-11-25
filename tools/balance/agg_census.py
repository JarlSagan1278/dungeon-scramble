# Nov 25: aggregates the content census and the Depth ladder (bg_census.py) into one JSON for the report page.
# usage: python3 agg_census.py [out.json]   (reads out_cen_*.json, out_lad_*.json and _catalog.json)
import json, glob, os, sys, collections, math
HERE = os.path.dirname(os.path.abspath(__file__))
CAT = json.load(open(os.path.join(HERE, '_catalog.json')))
def load(pat):
    out = []
    for f in glob.glob(os.path.join(HERE, pat)):
        parts = os.path.basename(f)[:-5].split('_')
        for r in json.load(open(f))['res']: out.append((parts, r))
    return out
def ci(p, n):  # rough 90% interval half-width for a rate
    return 1.645 * math.sqrt(max(p*(1-p), 1e-9) / max(n, 1))
report = {'profiles': {}, 'ladder': {}}
for prof in ['r0', 'x7']:
    runs = [r for parts, r in load('out_cen_%s_*.json' % prof)]
    n = len(runs); wins = sum(r['result']=='VICTORY' for r in runs); base = wins / max(n, 1)
    P = {'runs': n, 'win': base}
    # by class / origin
    cls = collections.defaultdict(lambda: [0, 0])
    for parts, r in load('out_cen_%s_*.json' % prof):
        for key in (parts[3], parts[4]): cls[key][0] += r['result']=='VICTORY'; cls[key][1] += 1
    P['byCombo'] = {k: v[0]/v[1] for k, v in cls.items()}
    # encounters
    E = collections.defaultdict(lambda: {'met':0,'died':0,'turns':0,'taken':0,'takenPct':0.0})
    for r in runs:
        fs = r.get('fights', [])
        for j, fi in enumerate(fs):
            e = E[fi['name']]; e['met'] += 1
            died = (j == len(fs)-1 and r['result'] != 'VICTORY'); e['died'] += died
            e['turns'] += fi.get('turns') or 0; tk = fi.get('taken') or 0; e['taken'] += tk; e['takenPct'] += tk / max(1, fi.get('pmax0') or 20)
    enc = []
    for name, e in E.items():
        c = CAT['enc'].get(name, {})
        enc.append({'name': name, 'floor': c.get('floor'), 'tier': c.get('tier'), 'type': c.get('type'), 'rule': c.get('rule'), 'met': e['met'],
                    'death': e['died']/e['met'], 'turns': e['turns']/e['met'], 'taken': e['taken']/e['met'], 'takenPct': e['takenPct']/e['met']})
    # peer baseline: same floor and tier (bosses: same floor)
    peers = collections.defaultdict(lambda: [0, 0, 0.0])
    for x in enc:
        k = (x['floor'], x['tier']); peers[k][0] += x['death']*x['met']; peers[k][1] += x['met']; peers[k][2] += x['takenPct']*x['met']
    for x in enc:
        k = (x['floor'], x['tier']); pd, pn, pt = peers[k]
        x['peerDeath'] = pd/pn if pn else None; x['peerTaken'] = pt/pn if pn else None
        x['ci'] = ci(x['death'], x['met'])
        x['flag'] = 'wall' if (x['met'] >= 40 and x['peerDeath'] is not None and x['death'] - x['peerDeath'] > max(0.06, 1.2*x['ci'])) else \
                    'pushover' if (x['met'] >= 40 and x['peerTaken'] and x['takenPct'] < 0.45*x['peerTaken'] and x['death'] < 0.01) else ''
    P['enc'] = sorted(enc, key=lambda x: (x['floor'] or 0, x['tier'] or '', -x['death']))
    # loot: offers/picks, and win rate of runs that took it (by the end) vs runs offered it but not taking it
    L = collections.defaultdict(lambda: {'offered':0,'picked':0,'tookWin':0,'took':0,'skipWin':0,'skip':0})
    for r in runs:
        won = r['result']=='VICTORY'; took = set(); offered = set()
        for o in r.get('offers', []):
            for nm in o.get('opts', []):
                if nm: L[nm]['offered'] += 1; offered.add(nm)
            if o.get('pick'): L[o['pick']]['picked'] += 1; took.add(o['pick'])
        for nm in offered:
            if nm in took: L[nm]['took'] += 1; L[nm]['tookWin'] += won
            else: L[nm]['skip'] += 1; L[nm]['skipWin'] += won
    loot = []
    for name, l in L.items():
        c = CAT['loot'].get(name, {})
        if not c: continue
        tw = l['tookWin']/l['took'] if l['took'] else None; sw = l['skipWin']/l['skip'] if l['skip'] else None
        loot.append({'name': name, 'tier': c.get('tier'), 'faces': c.get('faces'), 'offered': l['offered'], 'pickRate': l['picked']/max(1, l['offered']),
                     'took': l['took'], 'winTook': tw, 'winSkip': sw, 'delta': (tw - sw) if (tw is not None and sw is not None) else None,
                     'ci': ci(tw or 0, l['took']) if l['took'] else None})
    for x in loot:
        x['flag'] = 'dud' if (x['took'] >= 40 and x['delta'] is not None and x['delta'] < -0.06) else 'standout' if (x['took'] >= 40 and x['delta'] is not None and x['delta'] > 0.08) else ''
    P['loot'] = sorted(loot, key=lambda x: (x['tier'] or '', -(x['delta'] if x['delta'] is not None else -9)))
    # relics: runs ending with it
    R = collections.defaultdict(lambda: [0, 0])
    for r in runs:
        for rid in set(r.get('relicsEnd', [])): R[rid][0] += r['result']=='VICTORY'; R[rid][1] += 1
    P['relics'] = sorted([{'id': k, 'name': CAT['relics'].get(k, {}).get('name', k), 'desc': CAT['relics'].get(k, {}).get('desc', ''), 'runs': v[1], 'win': v[0]/v[1], 'delta': v[0]/v[1] - base} for k, v in R.items() if v[1] >= 10], key=lambda x: -x['delta'])
    # shrines visited: win rate of runs that visited vs base
    SH = collections.defaultdict(lambda: [0, 0])
    for r in runs:
        for s in set(x['name'] for x in r.get('shrines', [])): SH[s][0] += r['result']=='VICTORY'; SH[s][1] += 1
    P['shrines'] = sorted([{'name': k, 'visits': v[1], 'win': v[0]/v[1], 'delta': v[0]/v[1] - base} for k, v in SH.items() if v[1] >= 10], key=lambda x: -x['delta'])
    report['profiles'][prof] = P
# ladder
for kind in ['x', 'r']:
    D = collections.defaultdict(lambda: [0, 0, [0, 0, 0]])
    for parts, r in load('out_lad_%s_*.json' % kind):
        d = int(parts[3]); D[d][0] += r['result']=='VICTORY'; D[d][1] += 1
        if r['result'] != 'VICTORY': D[d][2][min(2, max(0, int(r['floor'])-1))] += 1
    report['ladder'][kind] = [{'depth': d, 'win': v[0]/v[1], 'n': v[1], 'deathsByFloor': [x/v[1] for x in v[2]]} for d, v in sorted(D.items())]
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '_census.json')
json.dump(report, open(out, 'w'))
for prof, P in report['profiles'].items():
    print(prof, 'runs', P['runs'], 'win %.0f%%' % (100*P['win']), 'walls', [x['name'] for x in P['enc'] if x['flag']=='wall'], 'duds', [x['name'] for x in P['loot'] if x['flag']=='dud'])
for k, L in report['ladder'].items(): print('ladder', k, ' '.join('%d:%.0f' % (x['depth'], 100*x['win']) for x in L))
