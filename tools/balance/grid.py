import json,subprocess,sys
scen=json.loads(sys.argv[1])
modes=['best','random','worst']
rows=[]
for name,cfg in scen.items():
    row={'name':name}
    for m in modes:
        c=dict(cfg,runs=250,skill=3000,lootMode=m,label='g')
        out=subprocess.run(['node','harness.js',json.dumps(c)],capture_output=True,text=True).stdout.strip().splitlines()[-1]
        d=json.loads(out)
        row[m]=d
    rows.append(row)
print(f"{'scenario':26} | win% best/rand/worst | deaths(F1/F2/F3 rand) | turns/fight F1 F2 F3 (rand) | 1-turn% F2 F3 (best) | dmg taken/fight F2 F3 (rand)")
for r in rows:
    w='/'.join(r[m]['winRate'].replace('%','') for m in ['best','random','worst'])
    d=r['random']
    print(f"{r['name']:26} | {w:>12} | {d['deaths']} | {[f['avgTurns'] for f in d['byFloor']]} | {[f['oneTurn'] for f in r['best']['byFloor'][1:]]} | {[f['taken'] for f in d['byFloor'][1:]]}")
