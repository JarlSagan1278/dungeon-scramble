# Aggregates (Oct 17 class baseline) out_base14154_*.json (bg_baseline.py): per profile x variant, all 4 origins pooled.
# Win (+-95% margin), avg floor ended, HP lost per won fight, deaths on F1/F2/F3, runs; plus per-origin win rates.
import json, os, glob, math, collections
HERE = os.path.dirname(os.path.abspath(__file__))
cells = collections.defaultdict(list)
for f in glob.glob(os.path.join(HERE, 'out_base14154_*.json')):
    pn, vn, o = os.path.basename(f)[:-5].split('_')[2:5]
    cells[(pn, vn)].append((o, json.load(open(f))['res']))
for (pn, vn) in sorted(cells):
    runs = [r for o, rs in cells[(pn, vn)] for r in rs]; n = len(runs)
    w = sum(r['result'] == 'VICTORY' for r in runs) / n
    fl = sum(r['floor'] for r in runs) / n
    tk = [x['taken'] for r in runs for x in r['fights'] if x.get('done') and 'taken' in x]
    d = [sum(r['result'] == 'GAMEOVER' and r['floor'] == k for r in runs) / n for k in (1, 2, 3)]
    by = {o: round(100 * sum(r['result'] == 'VICTORY' for r in rs) / len(rs)) for o, rs in cells[(pn, vn)]}
    print('%s %-10s win %2d%% +-%d  floor %.2f  hp/fight %.1f  died %d/%d/%d%%  n=%d  %s' % (pn, vn, round(100*w), round(196*math.sqrt(w*(1-w)/n)), fl, sum(tk)/max(1,len(tk)), *[round(100*x) for x in d], n, by))
# Deaths split by floor as a share of all deaths (not of all runs).
print('-- deaths by floor, share of deaths --')
for (pn, vn) in sorted(cells):
    runs = [r for o, rs in cells[(pn, vn)] for r in rs]
    dd = [r['floor'] for r in runs if r['result'] == 'GAMEOVER']
    other = sum(r['result'] not in ('VICTORY', 'GAMEOVER') for r in runs)
    print('%s %-10s deaths %4d  F1/F2/F3 %d/%d/%d%%  other(timeout) %d' % (pn, vn, len(dd), *[round(100*dd.count(k)/max(1,len(dd))) for k in (1,2,3)], other))
