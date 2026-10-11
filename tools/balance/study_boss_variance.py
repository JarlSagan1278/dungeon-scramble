# Are bosses "fun-variation uneven" or "coin-flip uneven"? (build >=1.35.0)
# Forces each boss onto its floor in otherwise identical runs, at three bot levels:
#   strong  = skill 1500, reads the next-turn preview (blocks before wind-ups)
#   blind   = skill 1500, ignores the preview
#   weak    = skill 150, reads the preview
# A boss where the strong bot loses far less HP than the blind/weak bots rewards play (fun variation);
# one where everyone loses about the same is unavoidable damage (coin flip).
# usage: python3 study_boss_variance.py [runs per combo]
import json, subprocess, sys, statistics as st
from concurrent.futures import ThreadPoolExecutor
runs = int(sys.argv[1]) if len(sys.argv) > 1 else 150
combos = [('dwarf','guard'), ('gnome','armsmaster'), ('halfling','dungeoneer'), ('pixie','arcanist')]
bosses = {1:['Rogue Golemancer','Heating Elemental','Grosteque Grafter'], 2:['The Necrorancher','Bellicose Biomancer','Ceramic Golem'],
          3:['Extruzeon, Co-consul of Waste','Myceleus, Co-consul of Rot']}
levels = {'strong':{'skill':1500}, 'blind':{'skill':1500,'intentAware':False}, 'weak':{'skill':150}}
force = [bosses[1], bosses[2], bosses[3]]
jobs = []
for i in range(3):  # force one boss per floor at a time: boss i on F1, i on F2, i%2 on F3
  fb = [bosses[1][i], bosses[2][i], bosses[3][i % 2]]
  for lv in levels:
    for o, k in combos: jobs.append((tuple(fb), lv, o, k))
def run(j):
  fb, lv, o, k = j
  lab = f"bv_{o}_{lv}_{abs(hash(fb))%100000}"
  cfg = dict(levels[lv], runs=runs, origin=o, klass=k, forceBoss=list(fb), label=lab)
  subprocess.run(['node','study_maneuver.js',json.dumps(cfg)],capture_output=True,text=True)
  return lv, json.load(open(f'out_{lab}.json'))['res']
with ThreadPoolExecutor(4) as ex: R = list(ex.map(run, jobs))
stats = {}
for lv, res in R:
  for r in res:
    for f in r['fights']:
      if f['type'] not in ('Boss','Big Boss'): continue
      s = stats.setdefault((f['name'], lv), {'lost':[], 'frac':[], 'died':0, 'n':0, 'turns':[]})
      s['n'] += 1
      if f.get('died'): s['died'] += 1; s['frac'].append(1.0)
      elif f.get('done'):
        s['lost'].append(f.get('taken',0)); s['turns'].append(f['turns'])
        s['frac'].append(f.get('taken',0)/max(1,f['php0']))
m = lambda a: sum(a)/max(1,len(a))
print(f"runs per combo per setup: {runs}")
print(f"{'Boss':34} {'fights':>6} | {'HP lost strong':>14} {'(sd)':>5} {'blind':>6} {'weak':>6} | {'died% strong':>12} {'blind':>6} {'weak':>6} | {'share of HP lost (strong)':>24} | {'skill effect':>12}")
for fl, names in bosses.items():
  for n in names:
    s, b, w = stats.get((n,'strong')), stats.get((n,'blind')), stats.get((n,'weak'))
    if not s: continue
    sd = st.pstdev(s['lost']) if len(s['lost'])>1 else 0
    eff = (m(w['lost'])+m(b['lost']))/2 - m(s['lost'])
    print(f"F{fl} {n.split(',')[0]:31} {s['n']:6} | {m(s['lost']):14.1f} {sd:5.1f} {m(b['lost']):6.1f} {m(w['lost']):6.1f} | {100*s['died']/s['n']:12.0f} {100*b['died']/b['n']:6.0f} {100*w['died']/w['n']:6.0f} | {100*m(s['frac']):23.0f}% | {eff:+12.1f}")
