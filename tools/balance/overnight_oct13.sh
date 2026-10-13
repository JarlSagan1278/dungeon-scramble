#!/bin/bash
# Overnight study program (Oct 13). Each stage logs to $L/<stage>.log and touches $L/<stage>.done.
L=/tmp/claude-0/-home-user-dungeon-scramble/c644f6f1-0587-59f4-8d1e-2451d8bd872d/scratchpad/overnight
mkdir -p $L; cd /home/user/dungeon-scramble
stage(){ name=$1; shift; [ -f $L/$name.done ] && return; echo "start $(date +%H:%M)" > $L/$name.log; "$@" >> $L/$name.log 2>&1; echo "end $(date +%H:%M)" >> $L/$name.log; touch $L/$name.done; }
( [ -f $L/bughunt.done ] || { timeout 2700 node bugsearch.js > $L/bughunt.log 2>&1; touch $L/bughunt.done; } ) &
cd tools/balance
stage pairs0 env RP_TAG=rb0 RP_MODS='{}' python3 study_pairs.py 300 4
stage pairs7 env RP_TAG=rb7 RP_MODS='{"foes":1,"fury":1,"rest":1,"swarm":1}' python3 study_pairs.py 300 4
stage floors python3 study_floors.py rb0 rb7
stage maneuver env RM_TAG=rm2 python3 study_maneuver2.py 300 4
stage dungeoneer env RC_TAG=rc3 RC_MODS='{"foes":1,"fury":1,"rest":1,"swarm":1}' RC_VARIANTS='[["guard","guard",{}],["armsmaster","armsmaster",{}],["arcanist","arcanist",{}],["dungeoneer as-is","dungeoneer",{}],["dungeoneer + top-bottom wrap (all edges)","dungeoneer",{"zone":"(r,c)=>r===0||r===3||c===0||c===3","wrapV":true}],["dungeoneer + once/turn zone die -> Pivot","dungeoneer",{"convertTo":{"type":"pivot"}}]]' python3 study_classvar.py 300 4
stage depth env RD_TAG=rd5 python3 study_depth.py 250 4
stage relics env RS_TAG=rs8 RS_CFG='{"depthMods":{"foes":1,"fury":1,"rest":1,"swarm":1}}' python3 study_relics.py 300 4
wait
touch $L/ALL.done
