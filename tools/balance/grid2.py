import json,subprocess,sys
scen=json.loads(sys.argv[1]); muls=json.loads(sys.argv[2]); runs=int(sys.argv[3]) if len(sys.argv)>3 else 200
print(f"{'scenario':24} {'player':8} win%  deaths F1/F2/F3 | turns/fight F2 F3 | 1-turn% F2 F3 | taken F2 F3",flush=True)
for name,cfg in scen.items():
    for m in muls:
        c=dict(cfg,runs=runs,skill=1500,lootMode='random',dmgMul=m,label='g2')
        out=subprocess.run(['node','harness.js',json.dumps(c)],capture_output=True,text=True).stdout.strip().splitlines()[-1]
        d=json.loads(out); b=d['byFloor']
        print(f"{name:24} x{m:<6} {d['winRate']:>4} {d['deaths']} | {b[1]['avgTurns']} {b[2]['avgTurns']} | {b[1]['oneTurn']} {b[2]['oneTurn']} | {b[1]['taken']} {b[2]['taken']}",flush=True)
