# Floor and boss evenness from existing run files (Oct 13): reads out_<TAG>_<origin>_<class>.json (the class x origin
# study's 16 pairs) and reports, per floor: how many runs end there, HP lost per fight by tier, and per boss: how often it
# ends a run that meets it, HP cost and turns. usage: python3 study_floors.py <TAG> [<TAG> ...]
import glob, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, '..', '..', 'src', 'data.js')).read()
TIER = dict(re.findall(r"'([^']+)'\s*:\s*'(easy|standard|elite|deadly)'", src[src.index('ENCOUNTER_TIER'):]))
for tag in sys.argv[1:]:
    files = [f for f in glob.glob(os.path.join(HERE, 'out_%s_*.json' % tag)) if not f.endswith('summary_%s.json' % tag)]
    runs = [r for f in files for r in json.load(open(f))['res']]
    n = len(runs)
    print('== %s: %d runs from %d files, win %.0f%%' % (tag, n, len(files), 100 * sum(r['result'] == 'VICTORY' for r in runs) / max(1, n)))
    reach = [sum(1 for r in runs if r['floor'] >= fl) for fl in (1, 2, 3)]
    die = [sum(1 for r in runs if r['result'] == 'GAMEOVER' and r['floor'] == fl) for fl in (1, 2, 3)]
    print('runs that die on each floor (share of runs that reach it): ' + '  '.join('F%d %d/%d (%.0f%%)' % (fl + 1, die[fl], reach[fl], 100 * die[fl] / max(1, reach[fl])) for fl in range(3)))
    fights = [f for r in runs for f in r['fights']]
    print('HP lost per finished fight, by floor and tier (n):')
    for fl in (1, 2, 3):
        row = []
        for t in ('easy', 'standard', 'elite', 'deadly', 'boss'):
            fs = [f for f in fights if f['floor'] == fl and f.get('done') and (('Boss' in f['type']) if t == 'boss' else (TIER.get(f['name'], 'standard') == t and 'Boss' not in f['type'] and f['type'] not in ('Shrine', 'Trap')))]
            if fs: row.append('%s %.1f (%d)' % (t, sum(f.get('taken', 0) for f in fs) / len(fs), len(fs)))
        print('  F%d: %s' % (fl, ', '.join(row)))
    print('bosses: met, ends the run %, HP cost when won, turns:')
    for name in sorted({f['name'] for f in fights if 'Boss' in f['type']}, key=lambda x: min(f['floor'] for f in fights if f['name'] == x)):
        fs = [f for f in fights if f['name'] == name]; won = [f for f in fs if f.get('done')]
        print('  F%d %-46s met %4d  ends %4.1f%%  cost %4.1f  turns %4.1f' % (fs[0]['floor'], name, len(fs), 100 * sum(1 for f in fs if f.get('died')) / len(fs),
              sum(f.get('taken', 0) for f in won) / max(1, len(won)), sum(f['turns'] for f in won) / max(1, len(won))))
    print('regular fights that end the most runs:')
    killers = {}
    for f in fights:
        if 'Boss' not in f['type'] and f.get('died'): killers[f['name']] = killers.get(f['name'], 0) + 1
    met = {}
    for f in fights:
        if 'Boss' not in f['type']: met[f['name']] = met.get(f['name'], 0) + 1
    for nm, k in sorted(killers.items(), key=lambda kv: -kv[1])[:8]:
        print('  %-36s ends %3d of %4d (%.1f%%)' % (nm, k, met[nm], 100 * k / met[nm]))
    print()
