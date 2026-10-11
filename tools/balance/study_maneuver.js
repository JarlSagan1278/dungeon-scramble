// Maneuver study: harness.js plus three switches (v1.34.0).
//   questAware (default true): bot scores the quest bonus a path would earn (harness.js ignores quests,
//     which undervalues Maneuvers since most Maneuver value comes from 'N maneuvers' quests).
//   swapManeuver: every starting Maneuver die becomes an Attack die of the same level; camp upgrades Attack only.
//   payoff: hypothetical Maneuver payoffs, test-only (not in the game). 'none', or one or more of these joined by '+':
//     momentum (each Dodge/Leap/Pivot adds +1 to the next damaging die), footwork (each Dodge/Leap/Pivot gives 1 Block),
//     dodgeBlock / leapBlock / pivotBlock (that face gives 1 Block), leapMomentum / pivotMomentum (that face adds +1 to
//     the next damaging die). 'both' = momentum+footwork. e.g. 'dodgeBlock+leapMomentum'
//   Enemy-pressure knobs (per floor, [F1,F2,F3]): hitAdd adds to EVERY enemy hit, bosses included (harness's dmgAdd
//     only changes e.dmg, which bosses ignore: they use actionCycle); bigBossHitAdd adds to Big Boss hits only;
//     fxAdd {dot,hot,minion,shield,heal:[..]} raises an effect the enemy already has (bosses: matching actionCycle steps).
//   pivotFace: 'pivot' (default) | 'boost' | 'blank' -- replaces the Pivot faces on Maneuver II/III (Boost = Boost1, x2).
//   manLevel: 1 (default) | 2 | 3 -- starting Maneuver dice begin at this level, to isolate the face change.
//   intentAware (default true, needs build >=1.35.0): Block is valued against the enemy's previewed next-turn damage.
//   bossMode (test-only, builds <1.35.0 only): 'cycle' (today: one cycle step per turn) | 'attackPlus' (boss also hits for its base damage
//     every turn the cycle step isn't the attack) | 'attackPlusPhase' (attackPlus, and at <=50% HP it takes two cycle steps a turn)
// usage: node study_maneuver.js '<json config>'
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const cfg = Object.assign({ runs:40, skill:1500, origin:'dwarf', klass:'armsmaster', hpMul:[1,1,1], dmgAdd:[0,0,0], hpAdd:[0,0,0], bossHpMul:[1,1,1], maxTurns:400, dmgMul:1, takenMul:1, label:'', lootMode:'best', questAware:true, swapManeuver:false, payoff:'none', hitAdd:[0,0,0], bigBossHitAdd:0, fxAdd:{}, pivotFace:'pivot', manLevel:1, bossMode:'cycle', intentAware:true }, JSON.parse(process.argv[2]||'{}'));
(async()=>{
const b=await chromium.launch();const page=await b.newPage();
page.on('pageerror',e=>console.log('PAGEERR',e.message));
await page.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
await page.goto('file://' + require('path').resolve(__dirname,'../../dist/dungeon_scramble.html') + '');
let res = await page.evaluate((cfg)=>{
  // ---- stubs ----
  const noop=()=>{};
  ['render','showToast','playTone','playDiceRollSound','playPlayerHitSound','spawnParticleBurstAtPortrait','spawnParticleBurstAtEl','spawnConfettiRain','screenShake','impactPulse','lungeFigure','vibrate','hitStop','showKillCallout','showRoomCallout','fxTick','fxQuest','playStepTone','pulseDie','maybeAutosave','saveGame','autosave'].forEach(n=>{ try{ window[n]=noop; }catch(e){} });
  try{ PREFS.reducedMotion=true; }catch(e){}
  META.lifetime.victories=1; META.lifetime.bestFloorReached=3; META.achievements['origin_duo']={date:Date.now()};
  const origFns = {};
  // ---- encounter tuning hooks: scale enemies as they are drawn ----
  window.__taken=0; const origDeal=dealEncounterDamage; window.dealEncounterDamage=function(e,a){ if(a>0){ a+=(cfg.hitAdd[S.floorIdx]||0); if(e.type==='Big Boss') a+=cfg.bigBossHitAdd; } const h=S.health; const t=origDeal(e,a); let lost=Math.max(0,h-S.health); if(cfg.takenMul<1 && lost>0){ const keep=lost*cfg.takenMul; const k=Math.floor(keep)+(Math.random()<keep-Math.floor(keep)?1:0); S.health=Math.min(S.maxHealth, S.health+(lost-k)); lost=k;} window.__taken += lost; return t; };
  const origStep=applyPathStep; window.applyPathStep=function(st){ if(cfg.dmgMul!==1 && st.dmg>0) st.dmg=Math.round(st.dmg*cfg.dmgMul); return origStep(st); };
  // ---- hypothetical Maneuver payoffs (test-only) ----
  const isMan = t => t==='dodge'||t==='leap'||t==='pivot';
  if(cfg.payoff!=='none'){
    const origRel = applyRelicsToSteps;
    window.applyRelicsToSteps = function(steps, path){
      steps = origRel(steps, path);
      const P=new Set((cfg.payoff==='both'?'momentum+footwork':cfg.payoff).split('+'));
      let carry=0;
      steps.forEach(st=>{
        if(isMan(st.type)){
          if(P.has('momentum') || P.has(st.type+'Momentum')) carry++;
          if(P.has('footwork') || P.has(st.type+'Block')) st.blockGain += 1;
        } else if(st.dmg>0 && carry){ st.dmg += carry; carry=0; }
      });
      return steps;
    };
    const origEff = computePathEffects;
    window.computePathEffects = function(path){
      const ef = origEff(path);
      const st = computePathSteps(path);
      ef.totalDamage = st.reduce((a,x)=>a+x.dmg,0);
      ef.blockGain = st.reduce((a,x)=>a+x.blockGain,0);
      return ef;
    };
  }
  // ---- quest bonus a path would earn (mirrors checkQuests/applyQuestReward for flat-damage rewards) ----
  function questBonus(ef){
    const e=S.encounter; if(!e||!e.quests) return 0;
    let room = (e.questHealth!=null?e.questHealth:1e9) - (e.questDamageDealt||0), bonus=0;
    e.quests.forEach((q,i)=>{
      if(e.questsDone[i] || room<=0) return;
      const {rewardText, cond} = parseQuestSpec(q); if(!rewardText) return;
      const low=rewardText.toLowerCase(); if(low.includes('dot')||low.includes('hot')||low.includes('nullify')) return;
      const amt=parseFloat((rewardText.match(/(\d+(\.\d+)?)/)||[0,0])[1]); let m, done=false;
      if((m=cond.match(/(\d+)\+?\s*damage in a single (round|turn)/))) done = ef.totalDamage>=+m[1];
      else if((m=cond.match(/any (\d+)(?:\s*or fewer)? actions/))) done = cond.includes('or fewer') ? (ef.totalActions>0&&ef.totalActions<=+m[1]) : ef.totalActions>=+m[1];
      else if((m=cond.match(/(\d+)\s*blanks/))) done = ef.blankCount>=+m[1];
      else if((m=cond.match(/(\d+)\s*maneuvers/))) done = ef.maneuverCount>=+m[1];
      else if((m=cond.match(/(\d+)\s*dodge/))) done = ef.dodgeCount>=+m[1];
      else if((m=cond.match(/(\d+)\s*leap/))) done = ef.leapCount>=+m[1];
      else if((m=cond.match(/(\d+)\s*pivot/))) done = ef.pivotCount>=+m[1];
      else if((m=cond.match(/(\d+)\s*heal/))) done = ef.healCount>=+m[1];
      else if((m=cond.match(/(\d+)\s*block/))) done = ef.blockCount>=+m[1];
      else if((m=cond.match(/(\d+)\s*boost/))) done = ef.boostCount>=+m[1];
      else if((m=cond.match(/(\d+)\s*support/))) done = ef.supportCount>=+m[1];
      if(done){ const a=Math.min(amt,room); bonus+=a; room-=a; }
    });
    return bonus;
  }
  // ---- per-turn maneuver usage stats ----
  window.__man={turns:0,manSteps:0,steps:0,questDmg:0,questTurns:0};
  const origFin = finishPlayerPath;
  window.finishPlayerPath = function(path, effects){
    const e=S.encounter; const q0=e.questDamageDealt||0;
    window.__man.turns++; window.__man.steps+=effects.totalActions; window.__man.manSteps+=effects.maneuverCount;
    const r = origFin(path, effects);
    const qd=(e.questDamageDealt||0)-q0; if(qd>0){ window.__man.questDmg+=qd; window.__man.questTurns++; }
    return r;
  };
  if(cfg.pivotFace!=='pivot'){
    BASIC_DICE.filter(d=>d.cat==='maneuver').forEach(d=>{ d.faces=d.faces.map(f=>f.type==='pivot'?(cfg.pivotFace==='boost'?face('Boost1'):{type:'blank'}):f); });
  }
  window.__end={manII:0};
  if(cfg.bossMode!=='cycle'){
    const origCyc = applyBossCycleAction;
    window.applyBossCycleAction = function(e){
      const next = e.actionCycle[e.cycleIndex % e.actionCycle.length];
      const parts=[];
      if(next.type!=='dmg' && e.dmg>0) parts.push(dealEncounterDamage(e, e.dmg));
      parts.push(origCyc(e));
      if(cfg.bossMode==='attackPlusPhase' && e.curHealth<=e.maxHealth/2) parts.push(origCyc(e));
      return parts.join(' ');
    };
  }
  const origDraw = drawEncounter;
  window.drawEncounter = function(kind){
    const e = origDraw(kind);
    const fi = S.floorIdx;
    const boss = (e.type==='Boss'||e.type==='Big Boss');
    let mul = (cfg.hpMul[fi]||1) * (boss ? (cfg.bossHpMul[fi]||1) : 1);
    const hp = Math.max(1, Math.round(e.health*mul + (cfg.hpAdd[fi]||0)));
    e.health = hp; e.maxHealth = hp; e.curHealth = hp;
    for(const k in cfg.fxAdd){ const n=cfg.fxAdd[k][fi]||0; if(!n) continue;
      if(boss && e.actionCycle) e.actionCycle=e.actionCycle.map(a=>a.type===k?Object.assign({},a,{value:a.value+n}):a);
      else if(e[k]>0) e[k]+=n; }
    if(e.dmg>0 || boss) e.dmg = Math.max(0, e.dmg + (cfg.dmgAdd[fi]||0));
    return e;
  };
  // ---- policy ----
  const dieScore = d => d.faces.reduce((a,f)=>a + ({hit:1,combo:1.6,heal:.6,block:.6,shield:.6,boost:.8,leap:.3,dodge:.3,pivot:.3,nullify:.4}[f.type]||.2)*(f.value||0.5),0)/ (d.faces.length||1);
  const lootScore = o => dieScore(o) + (o.cat==='attack'?0.2:0);
  function pathValue(path){
    const ef = computePathEffects(path);
    const e = S.encounter;
    const missing = S.maxHealth - S.health;
    const need = e.curHealth + (e.curShield||0);
    let dmg = ef.totalDamage + (cfg.questAware ? questBonus(ef) : 0); const overshoot = Math.max(0, dmg-need);
    let blockV = (ef.blockGain||0)*0.45;
    if(cfg.intentAware && typeof enemyNextTurnPreview==='function' && dmg<need){
      const inc = Math.max(0, enemyNextTurnPreview(e).dmg - (S.playerBlock||0));
      blockV = Math.min(ef.blockGain||0, inc)*1.0 + Math.max(0,(ef.blockGain||0)-inc)*0.1;
    }
    let v = dmg - 0.6*overshoot + (ef.dotToEncounter||0)*1.2 + Math.min(ef.healGain||0, missing)*0.9*(missing>3?1:0.5) + blockV + (ef.hotToPlayer||0)*0.8;
    // killing is worth a lot (ends the enemy's counterattack)
    if(dmg>=need) v += 6;
    return v;
  }
  function bestPath(budget){
    let best=[], bestV=-1e9, nodes=0;
    const dfs = ()=>{
      if(nodes>=budget) return;
      nodes++;
      if(S.path.length){ const v=pathValue(S.path.slice()); if(v>bestV){bestV=v;best=S.path.slice();} }
      const legal=[]; for(let i=0;i<16;i++) if(canSelect(i)) legal.push(i);
      // random order so truncated budgets explore different regions
      for(let i=legal.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [legal[i],legal[j]]=[legal[j],legal[i]]; }
      for(const i of legal){ if(nodes>=budget) return; S.path.push(i); dfs(); S.path.pop(); }
    };
    S.path=[]; dfs(); S.path=[];
    return best;
  }
  function doTurn(){
    const p = bestPath(cfg.skill);
    (window.__turns=window.__turns||[]).push({f:S.floorIdx+1,len:p.length,dmg:Math.round(computePathEffects(p).totalDamage),boss:(S.encounter.type!=='Enemy'&&S.encounter.type!=='Trap')});
    S.path = [];
    p.forEach(i=>{ S.path.push(i); });
    endTurnButton();
    let guard=0; while(S.transitioning && guard++<50){ skipTransition(); }
  }
  function tick(log){
    if(S.screen==='victory') return 'VICTORY';
    if(S.screen==='gameover') return 'GAMEOVER';
    if(S.transitioning){ skipTransition(); return null; }
    if(S.lootChoice){ const arr=S.lootChoice.options.slice().sort((a,b)=>lootScore(b)-lootScore(a)); const o = cfg.lootMode==='worst'?arr[arr.length-1]:(cfg.lootMode==='random'?arr[Math.floor(Math.random()*arr.length)]:arr[0]); chooseLoot(o); return null; }
    if(S.shrineChoice){ chooseShrineOption(S.shrineChoice.options[Math.floor(Math.random()*S.shrineChoice.options.length)]); return null; }
    if(S.relicChoice){ chooseRelic(S.relicChoice.options[Math.floor(Math.random()*S.relicChoice.options.length)]); return null; }
    if(S.shrineResult){ continueFromShrine(); return null; }
    if(S.pendingLootDie){
      // replace the tray die we value least
      let wi=0, ws=1e9; S.tray.forEach((c,i)=>{ const sc=dieScore(c.die); if(sc<ws){ws=sc;wi=i;} });
      swapInLootDie(wi); return null; }
    if(S.screen==='camp'){
      if(!S.campRested){ campRest(); return null; }
      for(const cat of (cfg.swapManeuver?['attack']:['attack','maneuver'])){ const lv = S.campUpgrades[cat]?null:1; if(lv && canUpgrade(cat,lv)){ campUpgrade(cat,lv); return null; } }
      campLeave(); return null; }
    if(S.screen==='shrine'){ applyShrineBoon(S.encounter); return null; }
    if(S.screen==='game'){ log.turns++; doTurn(); return null; }
    return null;
  }
  const runs=[];
  for(let r=0;r<cfg.runs;r++){
    newGame(cfg.origin, cfg.klass, null, '', cfg.depthMods||{});
    if(cfg.manLevel>1){ S.tray.forEach(c=>{ if(c.die.cat==='maneuver') c.die=clone(Object.assign({},basic('maneuver',cfg.manLevel),{level:cfg.manLevel})); }); }
    if(cfg.swapManeuver){ S.tray.forEach(c=>{ if(c.die.cat==='maneuver') c.die=clone(basic('attack',c.die.level)); }); }
    const rec={fights:[],result:'TIMEOUT',floor:1,turns:0};
    const log={turns:0};
    // fight tracker via wrapper around onEncounterDefeated
    let cur=null, curEnc=null;
    for(let t=0;t<cfg.maxTurns*8;t++){
      if(S.screen==='game' && S.encounter && curEnc!==S.encounter){
        curEnc=S.encounter;
        cur={name:S.encounter.name,type:S.encounter.type,floor:S.floorIdx+1,hp0:S.encounter.maxHealth,php0:S.health,turns:0,tk0:window.__taken,minhp:S.health};
        rec.fights.push(cur);
      }
      const res=tick(log);
      if(res){ rec.result=res; break; }
      if(cur){ cur.minhp=Math.min(cur.minhp,S.health); cur.turns=Math.max(cur.turns,S.turnNumber+ (S.screen==='game'?0:0)); }
      if(cur && !cur.done && (S.lootChoice || (S.encounter===curEnc && S.encounter.curHealth<=0))){ cur.done=true; cur.turns=S.turnNumber+1; cur.php1=S.health; cur.taken=window.__taken-cur.tk0; cur.over=Math.max(0,Math.round(-S.encounter.curHealth)); }
      if(log.turns>cfg.maxTurns) break;
    }
    if(rec.result==='GAMEOVER' && cur && !cur.done){ cur.died=true; }
    window.__end.manII += S.tray.filter(c=>c.die.cat==='maneuver'&&c.die.level>=2).length;
    rec.floor=S.floorIdx+1; rec.turns=log.turns; rec.maxHp=S.maxHealth;
    runs.push(rec);
  }
  return {runs, turns:window.__turns, man:Object.assign(window.__man,window.__end)};
}, cfg);
const turnsData=res.turns, man=res.man; res=res.runs;
require('fs').writeFileSync('' + __dirname + '/out_'+(cfg.label||'x')+'.json', JSON.stringify({cfg,res}));
// summarize
const n=res.length, wins=res.filter(r=>r.result==='VICTORY').length;
const byFloor=[1,2,3].map(f=>{const fs=res.flatMap(r=>r.fights).filter(x=>x.floor===f&&x.done);const nt=fs.map(x=>x.turns);return {f, fights:fs.length, avgTurns:(nt.reduce((a,x)=>a+x,0)/Math.max(1,nt.length)).toFixed(2), oneTurn:(nt.filter(x=>x<=1).length/Math.max(1,nt.length)*100).toFixed(0)+'%', taken:(fs.reduce((a,x)=>a+(x.taken||0),0)/Math.max(1,fs.length)).toFixed(1)};});
const reached=[1,2,3].map(f=>res.filter(r=>r.floor>=f).length);
const td=[1,2,3].map(f=>{const t=turnsData.filter(x=>x.f===f&&!x.boss);const m=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);const d=t.map(x=>x.dmg).sort((a,b)=>a-b);return {f,avgLen:m(t.map(x=>x.len)).toFixed(1),avgDmg:m(d).toFixed(1),p50:d[d.length>>1],p90:d[Math.floor(d.length*.9)]};});
const deaths=[1,2,3].map(f=>res.filter(r=>r.result==='GAMEOVER'&&r.floor===f).length);
const manStats={manPerTurn:(man.manSteps/Math.max(1,man.turns)).toFixed(2),pathLen:(man.steps/Math.max(1,man.turns)).toFixed(2),questDmgPerRun:(man.questDmg/n).toFixed(1),manIIplusAtEnd:(man.manII/n).toFixed(2)};
console.log(JSON.stringify({label:cfg.label,manStats,deaths,td,skill:cfg.skill,runs:n,winRate:(wins/n*100).toFixed(0)+'%',reachedF2_F3:reached.slice(1),avgTurns:(res.reduce((a,r)=>a+r.turns,0)/n).toFixed(0),byFloor}));
await b.close();})();
