# Bosses and encounter tiers (build >=1.35.0): win rate, deaths per floor, HP lost per boss fight and per tier.
# usage: python3 study_tiers_bosses.py [runs] [skill] [extra json cfg, e.g. '{"intentAware":false}']
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
runs = int(sys.argv[1]) if len(sys.argv) > 1 else 300
skill = int(sys.argv[2]) if len(sys.argv) > 2 else 1500
extra = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
combos = [('dwarf','guard'), ('gnome','armsmaster'), ('halfling','dungeoneer'), ('pixie','arcanist')]
def run(c):
  o, k = c
  cfg = dict(extra, runs=runs, skill=skill, origin=o, klass=k, label=f'tb_{o}_{k}')
  d = json.loads(subprocess.run(['node','study_maneuver.js',json.dumps(cfg)],capture_output=True,text=True).stdout.strip().splitlines()[-1])
  return d, json.load(open(f'out_tb_{o}_{k}.json'))['res']
with ThreadPoolExecutor(4) as ex: R = list(ex.map(run, combos))
m = lambda xs: sum(xs)/max(1,len(xs))
fights = [f for _, res in R for r in res for f in r['fights']]
print(f"runs={runs}x{len(combos)} skill={skill} {extra}")
print("win% by combo:", ' '.join(f"{o}/{k} {d['winRate']}" for (o,k),(d,_) in zip(combos,R)), "| avg", f"{m([float(d['winRate'][:-1]) for d,_ in R]):.0f}%")
print("deaths F1/F2/F3:", [sum(d['deaths'][i] for d,_ in R) for i in range(3)])
for fl in (1,2,3):
  bs = [f for f in fights if f['floor']==fl and f['type'] in ('Boss','Big Boss')]
  done = [f for f in bs if f.get('done')]
  by = {}
  for f in bs: by.setdefault(f['name'], []).append(f)
  print(f"F{fl} bosses: HP lost/fight {m([f.get('taken',0) for f in done]):.1f}, turns {m([f['turns'] for f in done]):.1f}, died in {100*m([1 if f.get('died') else 0 for f in bs]):.0f}% ::",
        '; '.join(f"{n.split(',')[0]} {m([f.get('taken',0) for f in v if f.get('done')]):.1f} HP/{100*m([1 if f.get('died') else 0 for f in v]):.0f}% died" for n, v in by.items()))
