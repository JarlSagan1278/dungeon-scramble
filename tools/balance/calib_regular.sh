# Calibrate a "regular player" bot at depth 0 (Oct 13): a few knob settings, 2 pairs x 200 runs each.
cd "$(dirname "$0")"
run(){ node study_maneuver.js "{\"runs\":200,\"origin\":\"$1\",\"klass\":\"$2\",\"label\":\"cal_$3_$1\"$4}" >/dev/null 2>&1; }
for prof in "A|,\"skill\":200,\"abilityRate\":0.5,\"trayActRate\":0.5,\"tokenRate\":0.5,\"lootRandomRate\":0.5" "B|,\"skill\":60,\"abilityRate\":0.35,\"trayActRate\":0.3,\"tokenRate\":0.3,\"lootRandomRate\":0.6" "C|,\"skill\":30,\"abilityRate\":0.2,\"trayActRate\":0.2,\"tokenRate\":0.2,\"lootRandomRate\":0.8"; do
  n=${prof%%|*}; c=${prof#*|}
  run halfling dungeoneer $n "$c" & run gnome armsmaster $n "$c" & wait
done
python3 -c "
import json,glob
for n in 'ABC':
  ws=[]; tk=[]
  for f in glob.glob('out_cal_%s_*.json'%n):
    r=json.load(open(f))['res']; ws.append(sum(x['result']=='VICTORY' for x in r)/len(r))
    fs=[x for rr in r for x in rr['fights'] if x.get('done')]; tk.append(sum(x.get('taken',0) for x in fs)/max(1,len(fs)))
  print(n, 'win %.0f%%'%(100*sum(ws)/len(ws)), 'HP lost/fight %.1f'%(sum(tk)/len(tk)))
"
