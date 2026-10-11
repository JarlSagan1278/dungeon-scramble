# Enemy HP vs enemy damage/effects on Floor 3, today's rules (no Maneuver payoff). Uses study_maneuver.js knobs.
# usage: python3 study_pressure_grid.py [runs] [skill]
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
runs = int(sys.argv[1]) if len(sys.argv) > 1 else 300
skill = int(sys.argv[2]) if len(sys.argv) > 2 else 1500
combos = [('dwarf','guard'), ('gnome','armsmaster'), ('halfling','dungeoneer'), ('pixie','arcanist')]
variants = {
  'baseline':       {},
  'F3 HP +25%':     {'hpMul': [1,1,1.25]},
  'F3 hits +1':     {'hitAdd': [0,0,1]},
  'F3 hits +2':     {'hitAdd': [0,0,2]},
  'F3 effects +1':  {'fxAdd': {'dot':[0,0,1], 'minion':[0,0,1], 'shield':[0,0,1], 'hot':[0,0,1]}},
  'Big Boss hits +3': {'bigBossHitAdd': 3},
}
def run(job):
  (o, k), v = job
  cfg = dict(variants[v], runs=runs, skill=skill, origin=o, klass=k, label=f'pr_{o}_{k}_{v.replace(" ","").replace("%","").replace("+","p")}')
  out = subprocess.run(['node', 'study_maneuver.js', json.dumps(cfg)], capture_output=True, text=True).stdout.strip().splitlines()
  return (o, k, v, cfg['label'], json.loads(out[-1]))
jobs = [(c, v) for c in combos for v in variants]
with ThreadPoolExecutor(4) as ex: results = list(ex.map(run, jobs))
agg = {}
for o, k, v, label, d in results:
  res = json.load(open(f'out_{label}.json'))['res']
  f3 = [f for r in res for f in r['fights'] if f['floor'] == 3 and f.get('done')]
  bb = [f for f in f3 if f['type'] == 'Big Boss']
  reach3 = sum(1 for r in res if r['floor'] >= 3)
  died3 = sum(1 for r in res if r['result'] == 'GAMEOVER' and r['floor'] == 3)
  a = agg.setdefault(v, {'win':[], 'die3':[], 'taken3':[], 'turns3':[], 'one3':[], 'bbTaken':[], 'bbTurns':[]})
  m = lambda xs: sum(xs)/max(1,len(xs))
  a['win'].append(float(d['winRate'][:-1])); a['die3'].append(100*died3/max(1,reach3))
  a['taken3'].append(m([f.get('taken',0) for f in f3])); a['turns3'].append(m([f['turns'] for f in f3]))
  a['one3'].append(100*m([1 if f['turns']<=1 else 0 for f in f3]))
  a['bbTaken'].append(m([f.get('taken',0) for f in bb])); a['bbTurns'].append(m([f['turns'] for f in bb]))
print(f"runs={runs} skill={skill}, averaged over {len(combos)} combos")
print(f"{'variant':18} {'win%':>5} {'died on F3 %':>12} {'F3 taken/fight':>14} {'F3 turns/fight':>14} {'F3 1-turn%':>10} {'BigBoss taken':>13} {'BigBoss turns':>13}")
for v, a in agg.items():
  m = lambda xs: sum(xs)/len(xs)
  print(f"{v:18} {m(a['win']):5.0f} {m(a['die3']):12.0f} {m(a['taken3']):14.2f} {m(a['turns3']):14.2f} {m(a['one3']):10.0f} {m(a['bbTaken']):13.2f} {m(a['bbTurns']):13.2f}")
