# Is "coin-flip unevenness" game-wide? Reads out_gw_*.json (normal runs, strong bot) and reports:
#  A) regular encounters by floor and tier: HP cost per fight and run-ending rate, and the spread within each tier
#  B) loot dice and relics held at the start of Floor 2: run win rate for holders vs everyone
import json, glob, sys
from collections import defaultdict
m = lambda a: sum(a)/max(1,len(a))
runs = []
for f in sorted(glob.glob(sys.argv[1] if len(sys.argv)>1 else 'out_gw_*.json')): runs += json.load(open(f))['res']
print(f"runs: {len(runs)}  win%: {100*m([r['result']=='VICTORY' for r in runs]):.0f}")
E = defaultdict(lambda: {'cost':[], 'died':0, 'n':0, 'tier':None})
for r in runs:
  for x in r['fights']:
    if x['type'] in ('Shrine',): continue
    k = (x['floor'], x['name']); e = E[k]; e['n'] += 1; e['tier'] = x.get('tier') or x['type']
    if x.get('died'): e['died'] += 1; e['cost'].append(x['php0'])
    elif x.get('done'): e['cost'].append(x.get('taken',0))
print("\nA) Encounters (min 25 fights): floor | tier | name | fights | HP cost | run-ending %")
groups = defaultdict(list)
for (fl,n),e in sorted(E.items(), key=lambda kv:(kv[0][0], str(kv[1]['tier']), -m(kv[1]['cost']))):
  if e['n'] < 25: continue
  c = m(e['cost']); d = 100*e['died']/e['n']; groups[(fl,e['tier'])].append((n,c,d))
  print(f"  F{fl} {str(e['tier']):9} {n[:30]:30} {e['n']:5} {c:6.1f} {d:6.1f}")
print("\n   spread within tier: floor tier | n | cost min-max (max/min) | run-ending min-max")
for (fl,t),L in sorted(groups.items(), key=lambda kv:(kv[0][0],str(kv[0][1]))):
  cs=[c for _,c,_ in L]; ds=[d for *_,d in L]
  print(f"  F{fl} {str(t):9} {len(L):2} | {min(cs):5.1f}-{max(cs):5.1f} ({max(cs)/max(.1,min(cs)):.1f}x) | {min(ds):4.1f}-{max(ds):4.1f}%")
def first_f2(r):
  for x in r['fights']:
    if x['floor']==2: return x
H = defaultdict(lambda: [0,0]); R = defaultdict(lambda: [0,0]); NL = defaultdict(lambda:[0,0]); NR = defaultdict(lambda:[0,0])
base = [0,0]
for r in runs:
  x = first_f2(r)
  if not x: continue
  w = r['result']=='VICTORY'; base[0]+=w; base[1]+=1
  for d in set(x.get('loot',[])): H[d][0]+=w; H[d][1]+=1
  for d in set(x.get('relics',[])): R[d][0]+=w; R[d][1]+=1
  NL[min(len(x.get('loot',[])),4)][0]+=w; NL[min(len(x.get('loot',[])),4)][1]+=1
  NR[min(len(x.get('relics',[])),3)][0]+=w; NR[min(len(x.get('relics',[])),3)][1]+=1
bw = 100*base[0]/max(1,base[1])
print(f"\nB) Runs reaching Floor 2: {base[1]}, win% {bw:.0f}")
print("   by number of loot dice held:", {k:f"{100*v[0]/v[1]:.0f}% (n={v[1]})" for k,v in sorted(NL.items())})
print("   by number of relics held:", {k:f"{100*v[0]/v[1]:.0f}% (n={v[1]})" for k,v in sorted(NR.items())})
print("   loot dice held at Floor 2 start (n>=30), win% (vs base):")
for d,(w,n) in sorted(H.items(), key=lambda kv:-kv[1][0]/kv[1][1]):
  if n>=30: print(f"     {d[:32]:32} {100*w/n:5.0f}%  {100*w/n-bw:+5.0f}  n={n}")
print("   relics held at Floor 2 start (n>=30):")
for d,(w,n) in sorted(R.items(), key=lambda kv:-kv[1][0]/kv[1][1]):
  if n>=30: print(f"     {d[:32]:32} {100*w/n:5.0f}%  {100*w/n-bw:+5.0f}  n={n}")
