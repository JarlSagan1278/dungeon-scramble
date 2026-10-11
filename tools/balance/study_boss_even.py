# Quick boss evening check (strong bot only): forces each boss onto its floor and reports HP cost per fight.
# net = HP drop across the fight (start minus end, healing counted); cost = HP lost in the fight, counting a death as all the HP the player walked in with.
# usage: python3 study_boss_even.py [runs per combo]
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
runs = int(sys.argv[1]) if len(sys.argv) > 1 else 150
combos = [('dwarf','guard'), ('gnome','armsmaster'), ('halfling','dungeoneer'), ('pixie','arcanist')]
bosses = {1:['Rogue Golemancer','Heating Elemental','Grosteque Grafter'], 2:['The Necrorancher','Bellicose Biomancer','Ceramic Golem'],
          3:['Extruzeon, Co-consul of Waste','Myceleus, Co-consul of Rot']}
jobs = []
for i in range(3):
  fb = [bosses[1][i], bosses[2][i], bosses[3][i % 2]]
  for o, k in combos: jobs.append((tuple(fb), o, k, i))
def run(j):
  fb, o, k, i = j
  lab = f"be_{o}_{i}"
  cfg = dict(skill=1500, runs=runs, origin=o, klass=k, forceBoss=list(fb), label=lab)
  subprocess.run(['node','study_maneuver.js',json.dumps(cfg)],capture_output=True,text=True)
  return json.load(open(f'out_{lab}.json'))['res']
with ThreadPoolExecutor(6) as ex: R = list(ex.map(run, jobs))
stats = {}
for res in R:
  for r in res:
    for f in r['fights']:
      if f['type'] not in ('Boss','Big Boss'): continue
      s = stats.setdefault(f['name'], {'cost':[], 'lost':[], 'net':[], 'died':0, 'n':0, 'turns':[]})
      s['n'] += 1
      if f.get('died'): s['died'] += 1; s['cost'].append(f['php0']); s['net'].append(f['php0'])
      elif f.get('done'):
        s['net'].append(f['php0']-f.get('php1',f['php0'])); s['lost'].append(f.get('taken',0)); s['cost'].append(f.get('taken',0)); s['turns'].append(f['turns'])
m = lambda a: sum(a)/max(1,len(a))
print(f"{'Boss':32} {'fights':>6} {'cost':>6} {'lost(surv)':>10} {'net':>6} {'died%':>6} {'turns':>6}")
for fl, names in bosses.items():
  for n in names:
    s = stats.get(n)
    if s: print(f"F{fl} {n.split(',')[0]:29} {s['n']:6} {m(s['cost']):6.1f} {m(s['lost']):10.1f} {m(s['net']):6.1f} {100*s['died']/s['n']:6.0f} {m(s['turns']):6.1f}")
