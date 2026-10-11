# Runs study_maneuver.js over origin/class combos x variants; prints one table row per cell.
# usage: python3 study_maneuver_grid.py [runs] [skill] [variant,variant,...]
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
runs = int(sys.argv[1]) if len(sys.argv) > 1 else 300
skill = int(sys.argv[2]) if len(sys.argv) > 2 else 1500
combos = [('dwarf','guard'), ('gnome','armsmaster'), ('halfling','dungeoneer'), ('pixie','arcanist')]
variants = {
  'baseline':      {},
  'noQuestAI':     {'questAware': False},
  'swapManeuver':  {'swapManeuver': True},
  'momentum':      {'payoff': 'momentum'},
  'footwork':      {'payoff': 'footwork'},
  'dodgeBlock':    {'payoff': 'dodgeBlock'},
}
pick = sys.argv[3].split(',') if len(sys.argv) > 3 else ['baseline','noQuestAI','swapManeuver','momentum','footwork']
def run(job):
  (o, k), v = job
  cfg = dict(variants[v], runs=runs, skill=skill, origin=o, klass=k, label=f'man_{o}_{k}_{v}_{skill}')
  out = subprocess.run(['node', 'study_maneuver.js', json.dumps(cfg)], capture_output=True, text=True).stdout.strip().splitlines()
  return (o, k, v, json.loads(out[-1]))
jobs = [(c, v) for c in combos for v in pick]
with ThreadPoolExecutor(4) as ex: results = list(ex.map(run, jobs))
print(f"runs={runs} skill={skill}")
print(f"{'combo':22} {'variant':13} {'win%':>5} {'deaths F1/F2/F3':>16} {'man/turn':>8} {'pathLen':>7} {'questDmg/run':>12} {'taken/fight F1 F2 F3':>22} {'turns/fight F1 F2 F3':>22} {'1-turn% F1 F2 F3':>18}")
for o, k, v, d in results:
  bf = d['byFloor']
  print(f"{o+'/'+k:22} {v:13} {d['winRate']:>5} {str(d['deaths']):>16} {d['manStats']['manPerTurn']:>8} {d['manStats']['pathLen']:>7} {d['manStats']['questDmgPerRun']:>12} {' '.join(f['taken'] for f in bf):>22} {' '.join(f['avgTurns'] for f in bf):>22} {' '.join(f['oneTurn'] for f in bf):>18}")
