#!/bin/bash
# Overnight part 3: the Maneuver and Dungeoneer questions again with the regular-player bot at Depth 0.
L=/tmp/claude-0/-home-user-dungeon-scramble/c644f6f1-0587-59f4-8d1e-2451d8bd872d/scratchpad/overnight
while [ ! -f $L/ALL2.done ]; do sleep 60; done
cd /home/user/dungeon-scramble/tools/balance
stage(){ name=$1; shift; [ -f $L/$name.done ] && return; echo "start $(date +%H:%M)" > $L/$name.log; "$@" >> $L/$name.log 2>&1; echo "end $(date +%H:%M)" >> $L/$name.log; touch $L/$name.done; }
REG='{"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}'
stage reg_maneuver env RM_TAG=rmreg RM_MODS='{}' RM_CFG="$REG" python3 study_maneuver2.py 300 4
stage reg_dungeoneer env RC_TAG=rcreg RC_MODS='{}' RC_CFG="$REG" RC_VARIANTS='[["guard","guard",{}],["armsmaster","armsmaster",{}],["arcanist","arcanist",{}],["dungeoneer as-is","dungeoneer",{}],["dungeoneer + top-bottom wrap (all edges)","dungeoneer",{"zone":"(r,c)=>r===0||r===3||c===0||c===3","wrapV":true}],["dungeoneer + once/turn zone die -> Pivot","dungeoneer",{"convertTo":{"type":"pivot"}}]]' python3 study_classvar.py 300 4
touch $L/ALL3.done
