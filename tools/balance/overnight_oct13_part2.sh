#!/bin/bash
# Overnight part 2 (Oct 13, Jeremy: balance for the lower depths most people play): regular- and new-player bots at Depth 0.
L=/tmp/claude-0/-home-user-dungeon-scramble/c644f6f1-0587-59f4-8d1e-2451d8bd872d/scratchpad/overnight
while [ ! -f $L/ALL.done ]; do sleep 60; done
cd /home/user/dungeon-scramble/tools/balance
stage(){ name=$1; shift; [ -f $L/$name.done ] && return; echo "start $(date +%H:%M)" > $L/$name.log; "$@" >> $L/$name.log 2>&1; echo "end $(date +%H:%M)" >> $L/$name.log; touch $L/$name.done; }
REG='{"skill":60,"abilityRate":0.35,"trayActRate":0.3,"tokenRate":0.3,"lootRandomRate":0.6}'
NEW='{"skill":30,"abilityRate":0.2,"trayActRate":0.2,"tokenRate":0.2,"lootRandomRate":0.8}'
stage reg_pairs env RP_TAG=rreg RP_MODS='{}' RP_CFG="$REG" python3 study_pairs.py 300 4
stage new_pairs env RP_TAG=rnew RP_MODS='{}' RP_CFG="$NEW" python3 study_pairs.py 300 4
stage reg_floors python3 study_floors.py rreg rnew
touch $L/ALL2.done
