import json,subprocess,sys
scen=json.loads(sys.argv[1]); muls=json.loads(sys.argv[2]); tm=float(sys.argv[3]); runs=int(sys.argv[4])
print(f"takenMul={tm}",flush=True)
print(f"{'scenario':22} {'player':7} win%  deaths F1/F2/F3 | turns/fight F2 F3 | 1-turn% F2 F3 | taken F2 F3",flush=True)
for name,cfg in scen.items():
    for m in muls:
        c=dict(cfg,runs=runs,skill=1500,lootMode='random',dmgMul=m,takenMul=tm,label='g3')
        out=subprocess.run(['node','harness.js',json.dumps(c)],capture_output=True,text=True).stdout.strip().splitlines()[-1]
        d=json.loads(out); b=d['byFloor']
        print(f"{name:22} x{m:<5} {d['winRate']:>4} {d['deaths']} | {b[1]['avgTurns']} {b[2]['avgTurns']} | {b[1]['oneTurn']} {b[2]['oneTurn']} | {b[1]['taken']} {b[2]['taken']}",flush=True)
