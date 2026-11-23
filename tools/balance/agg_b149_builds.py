# Nov 23 study (1.42.149): win rate by class x origin (regular depth 0, expert depth 7), and by BUILD: what the run's
# loot dice mostly did (damage, block, heal/HOT, DOT, maneuver), read from the loot names each run picked.
# usage: python3 agg_b149_builds.py   (after bg_b149.py; reads out_b149_*.json; prints tables)
import json, glob, os, re, subprocess, collections
HERE = os.path.dirname(os.path.abspath(__file__))
# loot die -> its faces' kinds, read from the built game (data.js lists the faces as strings like 'Hit2','Block2')
src = open(os.path.join(HERE, '..', '..', 'src', 'data.js')).read()
KIND = {'Hit':'dmg','Combo':'dmg','Pierce':'dmg','Block':'block','Heal':'heal','HOT':'heal','DOT':'dot','Leech':'heal',
        'Leap':'move','Dodge':'move','Pivot':'move','Boost':'boost','Freeze':'ctrl','Nullify':'ctrl'}
dice = {}
for m in re.finditer(r"\[\s*['\"]([^'\"]+)['\"],\s*\[([^\]]*)\]\s*\]", src):
    name, faces = m.group(1), re.findall(r"'([A-Za-z]+)\d*'", m.group(2))
    cnt = collections.Counter(KIND.get(f, 'other') for f in faces)
    dice[name] = cnt
AVG = collections.Counter()
for c in dice.values(): AVG.update(c)
AVG.pop('other', None); _t = sum(AVG.values()); AVG = {k: v/_t for k, v in AVG.items()}
def build_of(loot):
    # the kind the run leaned into most compared with an average pile of loot (share of faces / average share)
    tot = collections.Counter()
    for n in loot: tot.update(dice.get(n, {}))
    tot.pop('other', None); n = sum(tot.values())
    if not n: return 'none'
    lean = {k: (v/n)/AVG.get(k, 1) for k, v in tot.items() if k in ('dmg','block','heal','dot','move','boost','ctrl')}
    k = max(lean, key=lean.get)
    return k if lean[k] > 1.25 else 'mixed'
cells = collections.defaultdict(lambda: [0,0]); builds = collections.defaultdict(lambda: collections.defaultdict(lambda: [0,0]))
for f in glob.glob(os.path.join(HERE, 'out_b149_*.json')):
    _, _, prof, klass, origin = os.path.basename(f)[:-5].split('_')
    d = json.load(open(f))
    for r in d['res']:
        won = r.get('result') == 'VICTORY'
        loot = []
        for fi in r.get('fights', []): loot = fi.get('loot', loot) or loot
        c = cells[(prof, klass, origin)]; c[0] += won; c[1] += 1
        b = builds[prof][build_of(loot)]; b[0] += won; b[1] += 1
for prof in sorted({k[0] for k in cells}):
    print(f'\n== {prof} == class x origin win %')
    ks = ['guard','armsmaster','dungeoneer','arcanist']; os_ = ['dwarf','gnome','halfling','pixie']
    print('           ' + ''.join(f'{o:>10}' for o in os_) + '      all')
    for k in ks:
        row = [cells.get((prof,k,o)) for o in os_]
        tw = sum(x[0] for x in row if x); tn = sum(x[1] for x in row if x)
        print(f'{k:>11}' + ''.join(f'{(100*x[0]/x[1] if x and x[1] else float("nan")):10.0f}' for x in row) + f'{(100*tw/tn if tn else float("nan")):9.0f}  (n={tn})')
    print('  by build (main kind of the loot taken):')
    for b, (w, n) in sorted(builds[prof].items(), key=lambda x: -x[1][1]):
        print(f'    {b:>6}: {100*w/n:5.0f}%  n={n}')
