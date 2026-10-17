# Usage: python3 agg_qh.py STATIC_JSON [PREFIX=qh] ; aggregates out_<PREFIX>_<profile>_<variant>_<origin>_<class>.json (bg_qh.py). Usage: python3 agg_qh.py STATIC_JSON > summary.json
import json, glob, os, re, sys, statistics as st
from collections import defaultdict
HERE = os.path.dirname(os.path.abspath(__file__))
static = {c['name']: c for c in json.load(open(sys.argv[1]))['out']}
def qcat(cond):
    c = cond.lower()
    if re.search(r'= ?[dh]\.?o\.?t', c): return 'Geometry (passive)'
    if 'survive' in c: return 'Survive'
    if re.search(r'gain \d+ hot|deal \d+ dot', c): return 'H.O.T./D.O.T. amount'
    if 'accumulate' in c: return 'Bank Block'
    if re.search(r'damage', c): return 'Damage threshold'
    if 'actions' in c and 'support' not in c: return 'Path length'
    if 'blanks' in c: return 'Blanks'
    if re.search(r'maneuver|dodge|leap|pivot', c): return 'Maneuver faces'
    if re.search(r'heal|block|support|hot|dot', c): return 'Support faces (Heal/Block/H.O.T./D.O.T.)'
    if re.search(r'boost|nullify', c): return 'Boost/Nullify faces'
    return 'other'
def cond_of(name, i):
    q = static[name]['quests'][i]; return q.split(':',1)[1].strip() if ':' in q else q
data = defaultdict(list)
PFX = sys.argv[2] if len(sys.argv) > 2 else 'qh'
for f in glob.glob(os.path.join(HERE, 'out_' + PFX + '_*.json')):
    m = re.match(r'out_' + PFX + r'_([a-z0-9]+)_([a-z]+)_([a-z]+)_([a-z]+)\.json', os.path.basename(f))
    if not m: continue
    pn, vn, o, k = m.groups(); d = json.load(open(f))
    for r in d['res']: data[(pn, vn)].append((o, k, r))
out = {}
for (pn, vn), runs in sorted(data.items()):
    R = {'n': len(runs)}
    R['win'] = sum(r['result']=='VICTORY' for _,_,r in runs)/len(runs)
    R['deathsByFloor'] = [sum(r['result']=='GAMEOVER' and r['floor']==fl for _,_,r in runs)/len(runs) for fl in (1,2,3)]
    R['winByOrigin'] = {o: (lambda L: sum(r['result']=='VICTORY' for r in L)/max(1,len(L)))([r for oo,_,r in runs if oo==o]) for o in ['dwarf','gnome','halfling','pixie']}
    R['winByClass'] = {k: (lambda L: sum(r['result']=='VICTORY' for r in L)/max(1,len(L)))([r for _,kk,r in runs if kk==k]) for k in ['armsmaster','guard','arcanist','dungeoneer']}
    cards = defaultdict(lambda: defaultdict(list)); cats = defaultdict(lambda: defaultdict(float)); bycls = defaultdict(lambda: defaultdict(float)); byor = defaultdict(lambda: defaultdict(float)); quests = defaultdict(lambda: defaultdict(float))
    tot = defaultdict(float)
    for o, k, r in runs:
        for fi in r['fights']:
            nm = fi['name']; C = cards[nm]
            died = bool(fi.get('died')); done = bool(fi.get('done'))
            if not (done or died): continue
            C['turns'].append(fi.get('turns', 0)); C['died'].append(1 if died else 0)
            C['taken'].append(fi.get('taken', fi.get('php0', 0)) if done else fi.get('php0', 0))
            C['type'] = fi.get('type'); C['tier'] = fi.get('tier'); C['floor'] = fi.get('floor')
            ql = fi.get('q', []); paid = sum(q['paid'] for q in ql); amt_dmg = sum(q['amt'] for q in ql if q['kind']=='dmg')
            would = sum(q['wouldPay'] for q in ql if q['kind']=='dmg')
            lost_vs_today = amt_dmg - would  # damage today's cap removes from these completions
            C['qpaid'].append(paid); C['qprinted'].append(amt_dmg); C['bound'].append(1 if lost_vs_today>0 else 0); C['lost'].append(lost_vs_today)
            C['nq'].append(len([q for q in ql if q['i']>=0])); C['pathDmg'].append(fi.get('pathDmg', 0)); C['ehp'].append(fi.get('ehp') or fi.get('hp0'))
            C['qdot'].append(sum(q['amt'] for q in ql if q['kind']=='dot'))
            tot['path'] += fi.get('pathDmg', 0); tot['qflat'] += paid; tot['qdot'] += sum(q['amt'] for q in ql if q['kind']=='dot'); tot['fights'] += 1
            tot['geo'] += fi.get('geoMirror', 0)
            for q in ql:
                if q['i'] < 0 or nm not in static: continue
                cnd = cond_of(nm, q['i']); cat = qcat(cnd)
                cats[cat]['n'] += 1; cats[cat]['paid'] += q['paid']; cats[cat]['printed'] += q['amt'] if q['kind']=='dmg' else 0
                quests[nm + ' | ' + static[nm]['quests'][q['i']]]['n'] += 1
                bycls[k][cat] += q['paid']; byor[o][cat] += q['paid']
            bycls[k]['_fights'] += 1; byor[o]['_fights'] += 1; bycls[k]['_paid'] += paid; byor[o]['_paid'] += paid; bycls[k]['_nq'] += len(ql); byor[o]['_nq'] += len(ql)
            for q in ql:
                if q['i']>=0 and nm in static:
                    cat = qcat(cond_of(nm, q['i'])); bycls[k]['n:'+cat] += 1; byor[o]['n:'+cat] += 1
    def S(L): return sorted(L)[len(L)//2] if L else None
    R['cards'] = {nm: dict(n=len(C['turns']), type=C['type'], tier=C['tier'], floor=C['floor'], medTurns=S(C['turns']), meanTurns=st.mean(C['turns']),
        oneTwo=sum(t<=2 for t in C['turns'])/len(C['turns']), taken=st.mean(C['taken']), medTaken=S(C['taken']), zeroTaken=sum(t==0 for t in C['taken'])/len(C['taken']), deathRate=st.mean(C['died']),
        qpaid=st.mean(C['qpaid']), qprinted=st.mean(C['qprinted']), bound=st.mean(C['bound']), lost=st.mean(C['lost']), nq=st.mean(C['nq']), pathDmg=st.mean(C['pathDmg']),
        ehp=st.mean([x for x in C['ehp'] if x] or [0]), qdot=st.mean(C['qdot']), qh=static.get(nm, {}).get('qh'), flatSum=static.get(nm, {}).get('flat'))
        for nm, C in cards.items() if C['turns']}
    R['cats'] = {c: dict(v) for c, v in cats.items()}
    R['byClass'] = {k: dict(v) for k, v in bycls.items()}; R['byOrigin'] = {o: dict(v) for o, v in byor.items()}
    R['quests'] = {q: v['n'] for q, v in quests.items()}
    R['tot'] = dict(tot)
    out[pn + ':' + vn] = R
json.dump(out, sys.stdout, indent=1)
