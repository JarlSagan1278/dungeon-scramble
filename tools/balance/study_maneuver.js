// Maneuver study: harness.js plus three switches (v1.34.0).
//   questAware (default true): bot scores the quest bonus a path would earn (harness.js ignores quests,
//     which undervalues Maneuvers since most Maneuver value comes from 'N maneuvers' quests).
//   swapManeuver: every starting Maneuver die becomes an Attack die of the same level; camp upgrades Attack only.
//   payoff: hypothetical Maneuver payoffs, test-only (not in the game). 'none', or one or more of these joined by '+':
//     momentum (each Dodge/Leap/Pivot adds +1 to the next damaging die), footwork (each Dodge/Leap/Pivot gives 1 Block),
//     dodgeBlock / leapBlock / pivotBlock (that face gives 1 Block), leapMomentum / pivotMomentum (that face adds +1 to
//     the next damaging die). 'both' = momentum+footwork. e.g. 'dodgeBlock+leapMomentum'. momentum1 = Momentum that
//     doesn't stack (any run of Maneuvers gives +1 to the next damaging die; Oct 13 half-strength candidate).
//   Enemy-pressure knobs (per floor, [F1,F2,F3]): hitAdd adds to EVERY enemy hit, bosses included (harness's dmgAdd
//     only changes e.dmg, which bosses ignore: they use actionCycle); bigBossHitAdd adds to Big Boss hits only;
//     fxAdd {dot,hot,minion,shield,heal:[..]} raises an effect the enemy already has (bosses: matching actionCycle steps).
//   pivotFace: 'pivot' (default) | 'boost' | 'blank' -- replaces the Pivot faces on Maneuver II/III (Boost = Boost1, x2).
//   manLevel: 1 (default) | 2 | 3 -- starting Maneuver dice begin at this level, to isolate the face change.
//   intentAware (default true, needs build >=1.35.0): Block is valued against the enemy's previewed next-turn damage.
//   bossMode (test-only, builds <1.35.0 only): 'cycle' (today: one cycle step per turn) | 'attackPlus' (boss also hits for its base damage
//     every turn the cycle step isn't the attack) | 'attackPlusPhase' (attackPlus, and at <=50% HP it takes two cycle steps a turn)
//   forceBoss: boss name (or array of names); every boss room on that boss's floor draws it.
//   forceRelics: relic ids granted at the start of every run (relic study, Oct 12).
//   playerLike (default true, Oct 12): closes four gaps with real players: uses the class ability (Armsmaster/Guard
//     convert), picks shrine options and relics on purpose (relics by the Oct 12 study ranking), values Overkill
//     (the extra loot choice) instead of penalizing extra damage, and counts D.O.T./H.O.T./Nullify/Freeze quest rewards.
//   unlockAllRelics (default true): relic gating (RELIC_TIER) is lifted so shrine offers draw from every relic.
//   tokens (default true, Oct 12): the bot spends Freeze, Nullify, Boost and Swap tokens (Reroll tokens were already used).
//   lootV2 (default true, Oct 12): loot and the die it replaces are scored by face value with sustain weighted up,
//     so extra loot choices help instead of hurting. false = the old dieScore heuristic.
//   relicLock (default false): the bot declines every relic shrine offer and walks away from bargain shrines,
//     so the forced relics are the only ones held (a clean with/without comparison).
// usage: node study_maneuver.js '<json config>'
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const cfg = Object.assign({ runs:40, skill:1500, origin:'dwarf', klass:'armsmaster', hpMul:[1,1,1], dmgAdd:[0,0,0], hpAdd:[0,0,0], bossHpMul:[1,1,1], maxTurns:400, dmgMul:1, takenMul:1, label:'', lootMode:'best', questAware:true, swapManeuver:false, payoff:'none', hitAdd:[0,0,0], bigBossHitAdd:0, fxAdd:{}, pivotFace:'pivot', manLevel:1, manRider:null, bossMode:'cycle', intentAware:true, forceBoss:null, forceRelics:[], relicLock:false, tokens:true, lootV2:true, playerLike:true, abilityRate:1, trayActRate:1, tokenRate:1, lootRandomRate:0 }, JSON.parse(process.argv[2]||'{}'));
(async()=>{
const b=await chromium.launch();const page=await b.newPage();
page.on('pageerror',e=>console.log('PAGEERR',e.message));
await page.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
await page.goto('file://' + require('path').resolve(__dirname, process.env.DS_HTML || '../../dist/dungeon_scramble.html') + ''); // DS_HTML: a snapshot build, so rebuilding dist mid-study is safe
let res = await page.evaluate((cfg)=>{
  // ---- stubs ----
  const noop=()=>{};
  ['render','showToast','playTone','playDiceRollSound','playPlayerHitSound','spawnParticleBurstAtPortrait','spawnParticleBurstAtEl','spawnConfettiRain','screenShake','impactPulse','lungeFigure','vibrate','hitStop','showKillCallout','showRoomCallout','fxTick','fxQuest','playStepTone','pulseDie','maybeAutosave','saveGame','autosave','musicUpdate','musicChime'].forEach(n=>{ try{ window[n]=noop; }catch(e){} });
  try{ PREFS.reducedMotion=true; }catch(e){}
  if(cfg.unlockAllRelics!==false){ try{ DEPTH_BEST.overall=Math.max(DEPTH_BEST.overall||0,2); }catch(e){} } // Oct 12 gating: studies see every relic unless unlockAllRelics:false
  // classPatch (Oct 12 class study): {"guard":{"convertTo":{"type":"block","value":1}}, "arcanist":{"zone":"(r,c)=>r===c||r+c===3"}}; zone given as source text
  if(cfg.reviveClear) REVIVE_CLEARS_POCKET = true; // Oct 14 test: a Back Pocket save spends the whole Pocket
  window.__rev={saves:0,fails:0,spent:0,downs:0}; { const pd0=onPlayerDefeated; window.onPlayerDefeated=function(){ window.__rev.downs++; return pd0(); }; } { const tl0=teleLog; window.teleLog=function(t,d){ if(t==='pocket_revive'){ if(d.saved) window.__rev.saves++; else window.__rev.fails++; window.__rev.spent+=d.spent; } return tl0(t,d); }; }
  if(cfg.trayActAfter) TRAYACT_AFTER = cfg.trayActAfter; // Swap/Reroll after-use test: 'blank' | 'step' | 'pivot'
  Object.entries(cfg.relicPatch||{}).forEach(([id,p])=>Object.assign(RELICS.find(r=>r.id===id),p)); // relic number tests, e.g. {"forgeplate":{"amt":2}}
  Object.entries(cfg.classPatch||{}).forEach(([id,p])=>{ const k=CLASSES.find(x=>x.id===id); Object.entries(p).forEach(([f,v])=>{ k[f] = (f==='zone') ? eval(v) : v; }); });
  // manFaces (Oct 13, Jeremy: strong Block / Boost faces on Maneuver II-III): {"2":["Dodge",...], "3":[...]} replaces
  // the basic Maneuver die's faces at that level (face strings as in data.js, e.g. "Block3", "Boost1" = x2).
  // lootFaces (Oct 13 loot-dice tweaks): {"<loot die name>": ["Hit2",...]} replaces that loot die's faces for the study.
  Object.entries(cfg.lootFaces||{}).forEach(([n,arr])=>{ const d = [...ALLOY, ...GILDED, ...MAGIC].find(x=>x.name===n); if(d) d.faces = faces(arr); });
  Object.entries(cfg.manFaces||{}).forEach(([lv,arr])=>{ const d = BASIC_DICE.find(x=>x.cat==='maneuver' && x.level===+lv); if(d) d.faces = faces(arr); });
  // Shrine study (Oct 13): shrineAll = every eligible room is a shrine (amplifies the signal); forceShrine = that shrine
  // replaces any shrine drawn on its own floor (the comparison is against the normal shrine mix).
  if(cfg.shrineAll) window.shrineSlotChance = ()=>1;
  if(cfg.forceShrine){ const origDraw = drawRoomCard; window.drawRoomCard = function(floor){ const c = origDraw(floor);
    if(c && c.type==='Shrine'){ const f = floor.shrines.find(x=>x.name===cfg.forceShrine); if(f) return f; } return c; }; }
  // kitPatch (Oct 13): {"<boss name>": <full BOSS_KITS entry>} replaces that boss kit for the study.
  Object.entries(cfg.kitPatch||{}).forEach(([n,k])=>{ BOSS_KITS[n] = k; });
  window.__camp={rest:0,fuse:0,heal:0}; { const r0=campRest, u0=campUpgrade; window.campRest=function(){ const h=S.health, was=S.campRested; r0(); if(S.campRested&&!was){ window.__camp.rest++; window.__camp.heal+=S.health-h; } }; window.campUpgrade=function(c,l){ const b=S.campUpgrades[c]; u0(c,l); if(S.campUpgrades[c]&&!b) window.__camp.fuse++; }; }
  META.lifetime.victories=1; META.lifetime.bestFloorReached=3; META.achievements['origin_duo']={date:Date.now()};
  const origFns = {};
  // ---- encounter tuning hooks: scale enemies as they are drawn ----
  window.__taken=0; const origDeal=dealEncounterDamage; window.dealEncounterDamage=function(e,a){ if(a>0){ a+=(cfg.hitAdd[S.floorIdx]||0); if(e.type==='Big Boss') a+=cfg.bigBossHitAdd; } const h=S.health; const b0=S.playerBlock||0; const t=origDeal(e,a); { const B=(window.__tok=window.__tok||{}); const f=S.floorIdx; B.rawHit=B.rawHit||[0,0,0]; B.blocked=B.blocked||[0,0,0]; B.enemyTurns=B.enemyTurns||[0,0,0]; if(a>0){ B.rawHit[f]+=a; B.blocked[f]+=Math.max(0,b0-(S.playerBlock||0)); } } let lost=Math.max(0,h-S.health); if(cfg.takenMul<1 && lost>0){ const keep=lost*cfg.takenMul; const k=Math.floor(keep)+(Math.random()<keep-Math.floor(keep)?1:0); S.health=Math.min(S.maxHealth, S.health+(lost-k)); lost=k;} window.__taken += lost;
    // Oct 13 big-hit study: per fight, the biggest single hit (after Block), the most lost to hits in one enemy turn,
    // and the HP the player had at the start of that turn (a one-turn death from high HP = a one-shot).
    { const cf = window.__curFight; if(cf && a>0){ if(cf._t!==S.turnNumber){ cf._t = S.turnNumber; cf._tl = 0; cf._th = h; }
      cf._tl += lost; cf.maxHit = Math.max(cf.maxHit||0, lost); if(cf._tl > (cf.maxTurn||0)){ cf.maxTurn = cf._tl; cf.maxTurnHp0 = cf._th; cf.maxTurnPmax = S.maxHealth; }
      if(S.health<=0){ cf.deathTurnHp0 = cf._th; cf.deathTurnLoss = cf._tl; } } }
    return t; };
  const origStep=applyPathStep; window.applyPathStep=function(st){ if(cfg.dmgMul!==1 && st.dmg>0) st.dmg=Math.round(st.dmg*cfg.dmgMul); return origStep(st); };
  // ---- hypothetical Maneuver payoffs (test-only) ----
  const isMan = t => t==='dodge'||t==='leap'||t==='pivot';
  // manRider (Oct 13, Jeremy: Maneuver II/III should scale past Attack): test-only riders on BASIC Maneuver dice of level
  // L >= 2. 'riposte' = Dodge also gives L-1 Block; 'pounce' = Leap adds L-1 to the next damaging die; 'both'.
  if(cfg.manRider){
    const R = new Set(cfg.manRider==='both' ? ['riposte','pounce'] : cfg.manRider.split('+'));
    const origRel2 = applyRelicsToSteps;
    window.applyRelicsToSteps = function(steps, path){
      steps = origRel2(steps, path);
      let carry = 0;
      steps.forEach(st=>{
        const d = S.tray[st.idx] && S.tray[st.idx].die, L = (d && d.cat==='maneuver' && /^Maneuver Die/.test(d.name)) ? d.level : 1;
        if(L>=2 && st.type==='dodge' && R.has('riposte')) st.blockGain += L-1;
        if(L>=2 && st.type==='leap' && R.has('pounce')) carry += L-1;
        else if(st.dmg>0 && carry){ st.dmg += carry; carry = 0; }
      });
      return steps;
    };
    const origEff2 = computePathEffects;
    window.computePathEffects = function(path){
      const ef = origEff2(path), st = computePathSteps(path);
      ef.totalDamage = st.reduce((a,x)=>a+x.dmg,0); ef.blockGain = st.reduce((a,x)=>a+x.blockGain,0);
      return ef;
    };
  }
  if(cfg.payoff!=='none'){
    const origRel = applyRelicsToSteps;
    window.applyRelicsToSteps = function(steps, path){
      steps = origRel(steps, path);
      const P=new Set((cfg.payoff==='both'?'momentum+footwork':cfg.payoff).split('+'));
      let carry=0;
      steps.forEach(st=>{
        if(isMan(st.type)){
          if(P.has('momentum') || P.has(st.type+'Momentum')) carry++;
          if(P.has('momentum1')) carry=1;
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
      const low=rewardText.toLowerCase();
      if(!cfg.playerLike && (low.includes('dot')||low.includes('hot')||low.includes('nullify'))) return;
      const amt0=parseFloat((rewardText.match(/(\d+(\.\d+)?)/)||[0,0])[1]);
      // playerLike: non-damage rewards get a damage-equivalent value
      const amt = !cfg.playerLike ? amt0 : low.includes('dot') ? amt0*1.2 : low.includes('hot') ? amt0*0.8*((S.maxHealth-S.health)>4?1:0.4) : low.includes('nullify') ? 2.5*(amt0||1) : low.includes('freeze') ? 4*(amt0||1) : amt0;
      const flatReward = !cfg.playerLike || !/dot|hot|nullify|freeze/.test(low);
      let m, done=false;
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
      if(done){ const a=flatReward?Math.min(amt,room):amt; bonus+=a; if(flatReward) room-=a; }
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
  const forced = cfg.forceBoss ? [].concat(cfg.forceBoss) : [];
  window.drawEncounter = function(kind){
    let e;
    const pool = kind==='boss' ? (S.floorIdx===2 ? BIG_BOSSES : FLOORS[S.floorIdx].bosses) : null;
    const pick = pool && pool.filter(b=>forced.includes(b.name));
    if(pick && pick.length){ const saved = pool.splice(0, pool.length, ...pick); e = origDraw(kind); pool.splice(0, pool.length, ...saved); }
    else e = origDraw(kind);
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
  const dieScoreV1 = d => d.faces.reduce((a,f)=>a + ({hit:1,combo:1.6,heal:.6,block:.6,shield:.6,boost:.8,leap:.3,dodge:.3,pivot:.3,nullify:.4}[f.type]||.2)*(f.value||0.5),0)/ (d.faces.length||1);
  // v2 (Oct 12): per-face value, sustain weighted up (the relic study showed sustain decides runs)
  const FV = {hit:1, combo:1.5, dot:1.25, leech:2.1, heal:1.0, hot:1.1, block:1.0, shield:1.0, dodge:0.5, leap:0.6, pivot:0.6, fumble:-1.2, blank:0};
  const FLAT = {freeze:3.2, nullify:1.6, swap:1.4, reroll:1.4};
  const faceV = f => FLAT[f.type]!=null ? FLAT[f.type] : f.type==='boost' ? Math.max(0,(f.value||2)-1)*1.7 : (FV[f.type]!=null?FV[f.type]:0.3)*(f.value||1);
  const dieScoreV2 = d => d.faces.reduce((a,f)=>a+faceV(f),0)/(d.faces.length||1);
  const dieScore = d => cfg.lootV2 ? dieScoreV2(d) : dieScoreV1(d);
  const lootScore = o => cfg.lootV2 ? dieScore(o) : dieScore(o) + (o.cat==='attack'?0.2:0);
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
    const okAt = hasRelic('hungry_blade') ? 6 : 10;
    const okBonus = (cfg.playerLike && overshoot >= okAt) ? 4 : 0; // Overkill = one more loot choice
    let v = dmg - (cfg.playerLike ? 0.3 : 0.6)*overshoot + okBonus + (ef.dotToEncounter||0)*1.2 + Math.min(ef.healGain||0, missing)*0.9*(missing>3?1:0.5) + blockV + (ef.hotToPlayer||0)*0.8;
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
  // v1.38.0 Swap/Reroll: reroll blank dice first, then try every Swap target and keep the best path.
  function useTrayActs(){
    if(cfg.trayActs===false || typeof trayActFaceAt!=='function') return;
    const blanks = () => S.tray.map((c,i)=>i).filter(i=>{ const c=S.tray[i]; return !c.minion && !c.spent && currentFace(c).type==='blank'; });
    for(let g=0; g<4; g++){
      const src = S.tray.findIndex((c,i)=>trayActFaceAt(i)==='reroll');
      const useTok = src<0 && (S.rerollTokens||0)>0 && g===0;
      const b = blanks().filter(i=>i!==src);
      if((src<0 && !useTok) || !b.length) break;
      armTrayAct('reroll', useTok?null:src, useTok); trayActTap(b[Math.floor(Math.random()*b.length)]);
    }
    for(let g=0; g<3; g++){
      const src = S.tray.findIndex((c,i)=>trayActFaceAt(i)==='swap');
      if(src<0) break;
      let bestJ=-1, bestV=pathValue(bestPath(Math.ceil(cfg.skill/3))||[]) + 0.5;
      for(let j=0;j<16;j++){
        if(j===src || S.tray[j].minion || S.tray[j].spent) continue;
        doTraySwap(src, j, false);
        const bp = bestPath(Math.ceil(cfg.skill/3)); const v = bp.length ? pathValue(bp) : -1e9;
        undoTraySwaps();
        if(v>bestV){ bestV=v; bestJ=j; }
      }
      if(bestJ<0) break;
      doTraySwap(src, bestJ, false); S.swapLog = [];
      (window.__tray=window.__tray||{swaps:0,rerolls:0}).swaps++;
    }
  }
  // Oct 12: token policy (Freeze before a big hit, Nullify a pile-up, Boost when it pays, Swap token on the best pair)
  function useTokens(){
    if(!cfg.tokens || !S.encounter) return;
    const e = S.encounter, pv = (typeof enemyNextTurnPreview==='function') ? enemyNextTurnPreview(e) : {dmg:e.dmg||0};
    const inc = Math.max(0, (pv.dmg||0) - (S.playerBlock||0));
    if(S.freezeTokens>0 && !S.freezeNext && (inc >= Math.max(5, S.health*0.3) || inc >= S.health)){ S.freezeTokens--; S.freezeNext = true; (window.__tok=window.__tok||{}).freeze=(window.__tok.freeze||0)+1; }
    const minions = S.tray.filter(c=>c.minion).length;
    if(S.nullifyTokens>0 && ((S.playerDOT||0)>=3 || minions>=3 || (e.curHOT||0)>=3)){ S.nullifyTokens--; applyNullify(); (window.__tok=window.__tok||{}).nullify=(window.__tok.nullify||0)+1; }
    if((S.swapTokens||0)>0){
      const base = pathValue(bestPath(Math.ceil(cfg.skill/4))||[]); let best=null, bv=base+3;
      const ok = i => !S.tray[i].minion && !S.tray[i].spent;
      for(let t=0;t<40;t++){ const i=Math.floor(Math.random()*16), j=Math.floor(Math.random()*16); if(i===j||!ok(i)||!ok(j)) continue;
        const A=S.tray[i]; S.tray[i]=S.tray[j]; S.tray[j]=A; const bp=bestPath(Math.ceil(cfg.skill/4)); const v=bp.length?pathValue(bp):-1e9; S.tray[j]=S.tray[i]; S.tray[i]=A;
        if(v>bv){ bv=v; best=[i,j]; } }
      if(best){ doTraySwap(best[0], best[1], true); S.swapLog=[]; (window.__tok=window.__tok||{}).swap=(window.__tok.swap||0)+1; }
    }
  }
  function boostTokenMaybe(p){
    if(!cfg.tokens || !(S.boostTokenCharges>0) || S.pendingFreeBoost || !p.length) return p;
    const v0 = pathValue(p); S.pendingFreeBoost = S.boostTokenValue; const p2 = bestPath(cfg.skill); const v1 = p2.length ? pathValue(p2) : -1e9;
    const e = S.encounter, need = e.curHealth + (e.curShield||0), kills = computePathEffects(p2).totalDamage >= need && computePathEffects(p).totalDamage < need;
    if(v1 - v0 >= 4 || kills){ S.boostTokenCharges--; (window.__tok=window.__tok||{}).boost=(window.__tok.boost||0)+1; return p2; }
    S.pendingFreeBoost = 0; return p;
  }
  // Regular-player knobs (Oct 13, Jeremy: balance for the lower depths most people play): each skilled habit only
  // happens some of the time. Defaults (1/1/1/0) are the expert bot.
  function doTurn(){
    if(Math.random() < cfg.trayActRate) useTrayActs();
    if(Math.random() < cfg.tokenRate) useTokens();
    if(Math.random() < cfg.abilityRate) useAbility();
    const p = boostTokenMaybe(bestPath(cfg.skill));
    (window.__turns=window.__turns||[]).push({f:S.floorIdx+1,len:p.length,dmg:Math.round(computePathEffects(p).totalDamage),boss:(S.encounter.type!=='Enemy'&&S.encounter.type!=='Trap')});
    S.path = [];
    p.forEach(i=>{ S.path.push(i); });
    endTurnButton();
    let guard=0; while(S.transitioning && guard++<50){ skipTransition(); }
  }
  // playerLike shrine/relic choices (Oct 12). RELIC_PREF = win-rate gain per relic from the Oct 12 relic study
  // (unmeasured relics get a middling guess).
  const RELIC_PREF = {bloodletter:48,dodger_cloak:35,gambeson:34,banner:28,echo_chime:27,whetstone:20,iron_rations:17,barbed_buckler:17,
    tincture:16,combo_gauntlet:14,frost_charm:13,leaper_spurs:12,grave_tally:10,warding_bell:9,flask:9,lucky_coin:8,venom_vial:6,kettle:5,
    pivot_compass:3,shrine_bell:2,spite_thorns:6,overflow_chalice:2,hungry_blade:1}; // depth-7 relic study (rs7), Oct 12
  function pickShrineOption(opts){
    const miss = S.maxHealth - S.health, L = o=>o.label||'';
    const heal = opts.find(o=>/^Heal (\d+)/i.test(L(o)));
    if(heal){ const n=+L(heal).match(/^Heal (\d+)/i)[1]; const other=opts.find(o=>o!==heal); return (miss >= n*0.7 || !other) ? heal : other; }
    const pay = opts.find(o=>/Pay (\d+) max/i.test(L(o)));
    if(pay && cfg.alwaysBargain) return pay; // Oct 13 shrine study: always take the deal
    if(pay){ const n=+L(pay).match(/Pay (\d+) max/i)[1]; return (S.maxHealth-n >= 20) ? pay : (opts.find(o=>/walk away/i.test(L(o)))||pay); }
    const skip = opts.find(o=>/Skip next camp rest/i.test(L(o)));
    if(skip && cfg.alwaysBargain) return skip;
    if(skip) return (S.health >= S.maxHealth*0.6) ? skip : (opts.find(o=>/walk away/i.test(L(o)))||skip);
    return opts.find(o=>!/walk away/i.test(L(o))) || opts[0];
  }
  // playerLike class ability: try converting each die in the zone, keep the best (Armsmaster Hit 2, Guard Block 2)
  function useAbility(){
    if(!cfg.playerLike || cfg.noAbility || !S.klass.convertTo || S.classAbilityUsed) return;
    const base = pathValue(bestPath(Math.ceil(cfg.skill/3))||[]); let best=-1, bv=base+0.5;
    for(let i=0;i<16;i++){
      if(!inZone(i)) continue; const c=S.tray[i]; if(c.minion||c.spent||c.forcedFace) continue;
      const f=currentFace(c); if(f.type===S.klass.convertTo.type && (f.value||0)>=S.klass.convertTo.value) continue;
      c.forcedFace = clone(S.klass.convertTo); const bp=bestPath(Math.ceil(cfg.skill/3)); const v=bp.length?pathValue(bp):-1e9; delete c.forcedFace;
      if(v>bv){ bv=v; best=i; }
    }
    if(best>=0){ useClassAbility(best); (window.__tok=window.__tok||{}).ability=(window.__tok.ability||0)+1; }
  }
  function tick(log){
    if(S.screen==='victory') return 'VICTORY';
    if(S.screen==='gameover') return 'GAMEOVER';
    if(S.transitioning){ skipTransition(); return null; }
    if(S.lootChoice){ const arr=S.lootChoice.options.slice().sort((a,b)=>lootScore(b)-lootScore(a)); const o = cfg.lootMode==='worst'?arr[arr.length-1]:((cfg.lootMode==='random' || Math.random() < cfg.lootRandomRate)?arr[Math.floor(Math.random()*arr.length)]:arr[0]); chooseLoot(o); return null; }
    if(S.shrineChoice){ const walk = cfg.relicLock && S.shrineChoice.options.find(o=>/walk away/i.test(o.label)); chooseShrineOption(walk || (cfg.playerLike ? pickShrineOption(S.shrineChoice.options) : S.shrineChoice.options[Math.floor(Math.random()*S.shrineChoice.options.length)])); return null; }
    if(S.relicChoice && cfg.relicLock){ S.relicChoice=null; S.shrineResult={title:'Relic', text:'(study: declined)'}; return null; }
    if(S.relicChoice){ const o=S.relicChoice.options; chooseRelic(cfg.playerLike ? o.slice().sort((a,b)=>(RELIC_PREF[b]||5)-(RELIC_PREF[a]||5))[0] : o[Math.floor(Math.random()*o.length)]); return null; }
    if(S.shrineResult){ continueFromShrine(); return null; }
    if(S.pendingLootDie){
      // replace the tray die we value least
      let wi=0, ws=1e9; S.tray.forEach((c,i)=>{ const sc=dieScore(c.die); if(sc<ws){ws=sc;wi=i;} });
      swapInLootDie(wi); return null; }
    if(S.screen==='camp'){
      // Campfire choice (1.41.15+: Rest OR combine dice). campRestAt = HP share at or below which the bot rests.
      const cats = cfg.swapManeuver?['attack']:['attack','maneuver'];
      const fuse = ()=>{ for(const cat of cats){ if(S.campUpgrades[cat]) continue; for(const lv of [2,1]){ if(canUpgrade(cat,lv)){ const before = S.campUpgrades[cat]; campUpgrade(cat,lv); if(S.campUpgrades[cat] && !before) return true; } } } return false; };
      if(typeof campFireUsedBy!=='function'){ // old builds: rest, then combine
        if(!S.campRested && !cfg.noRest){ campRest(); return null; } if(!cfg.noFuse && fuse()) return null; campLeave(); return null; }
      if(!S.campChoice && !S.campFireOut && S.health <= (cfg.campRestAt!=null?cfg.campRestAt:0.6)*S.maxHealth && !isBaseCamp()){ campRest(); return null; }
      if(fuse()) return null;
      if(!S.campChoice && !S.campFireOut && !isBaseCamp()){ campRest(); return null; }
      campLeave(); return null; }
    if(S.screen==='shrine'){ applyShrineBoon(S.encounter); return null; }
    if(S.screen==='game'){ log.turns++; doTurn(); return null; }
    return null;
  }
  const runs=[];
  for(let r=0;r<cfg.runs;r++){
    newGame(cfg.origin, cfg.klass, null, '', cfg.depthMods||{});
    (cfg.forceRelics||[]).forEach(id=>grantRelic(id,{silent:true, via:'study'}));
    // forceLoot (Oct 13 loot-dice study): that loot die replaces one Attack Die I at the start of every run.
    if(cfg.forceLoot){ const d = [...ALLOY, ...GILDED, ...MAGIC].find(x=>x.name===cfg.forceLoot); const c = S.tray.find(x=>x.die.name==='Attack Die I') || S.tray.find(x=>x.die.cat==='attack');
      if(d && c){ c.die = clone(d); c.faceIdx = 0; S.usedLootNames.add(d.name); } }
    if(cfg.manLevel>1){ S.tray.forEach(c=>{ if(c.die.cat==='maneuver') c.die=clone(Object.assign({},basic('maneuver',cfg.manLevel),{level:cfg.manLevel})); }); }
    if(cfg.swapManeuver){ S.tray.forEach(c=>{ if(c.die.cat==='maneuver') c.die=clone(basic('attack',c.die.level)); }); }
    const rec={fights:[],result:'TIMEOUT',floor:1,turns:0};
    const log={turns:0};
    // fight tracker via wrapper around onEncounterDefeated
    let cur=null, curEnc=null, curShrine=null;
    for(let t=0;t<cfg.maxTurns*8;t++){
      if(S.screen==='shrine' && S.encounter && curShrine!==S.encounter){ curShrine=S.encounter; (rec.shrines=rec.shrines||[]).push({name:S.encounter.name, floor:S.floorIdx+1, hp:S.health}); } // Oct 13 shrine study
      if(S.screen==='game' && S.encounter && curEnc!==S.encounter){
        curEnc=S.encounter;
        cur={name:S.encounter.name,type:S.encounter.type,tier:S.encounter.tier,floor:S.floorIdx+1,hp0:S.encounter.maxHealth,php0:S.health,pmax0:S.maxHealth,turns:0,tk0:window.__taken,minhp:S.health,loot:S.tray.map(c=>c.die).concat(S.backPocket||[]).filter(d=>d&&/alloy|gilded|magic/.test(d.cat)).map(d=>d.name),relics:(S.relics||[]).slice()};
        rec.fights.push(cur); window.__curFight = cur;
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
  return {runs, rev:window.__rev, camp:window.__camp, turns:window.__turns, man:Object.assign(window.__man,window.__end), tok:window.__tok||{}};
}, cfg);
const turnsData=res.turns, man=res.man, tokUse=res.tok, campLog=res.camp, revLog=res.rev; res=res.runs; if(campLog) console.error('CAMP '+JSON.stringify(campLog)); if(revLog) console.error('REV '+JSON.stringify(revLog));
require('fs').writeFileSync('' + __dirname + '/out_'+(cfg.label||'x')+'.json', JSON.stringify({cfg,res,tokUse}));
// summarize
const n=res.length, wins=res.filter(r=>r.result==='VICTORY').length;
const byFloor=[1,2,3].map(f=>{const fs=res.flatMap(r=>r.fights).filter(x=>x.floor===f&&x.done);const nt=fs.map(x=>x.turns);return {f, fights:fs.length, avgTurns:(nt.reduce((a,x)=>a+x,0)/Math.max(1,nt.length)).toFixed(2), oneTurn:(nt.filter(x=>x<=1).length/Math.max(1,nt.length)*100).toFixed(0)+'%', taken:(fs.reduce((a,x)=>a+(x.taken||0),0)/Math.max(1,fs.length)).toFixed(1)};});
const reached=[1,2,3].map(f=>res.filter(r=>r.floor>=f).length);
const td=[1,2,3].map(f=>{const t=turnsData.filter(x=>x.f===f&&!x.boss);const m=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);const d=t.map(x=>x.dmg).sort((a,b)=>a-b);return {f,avgLen:m(t.map(x=>x.len)).toFixed(1),avgDmg:m(d).toFixed(1),p50:d[d.length>>1],p90:d[Math.floor(d.length*.9)]};});
const deaths=[1,2,3].map(f=>res.filter(r=>r.result==='GAMEOVER'&&r.floor===f).length);
const manStats={manPerTurn:(man.manSteps/Math.max(1,man.turns)).toFixed(2),pathLen:(man.steps/Math.max(1,man.turns)).toFixed(2),questDmgPerRun:(man.questDmg/n).toFixed(1),manIIplusAtEnd:(man.manII/n).toFixed(2)};
console.log(JSON.stringify({label:cfg.label,manStats,deaths,td,skill:cfg.skill,runs:n,winRate:(wins/n*100).toFixed(0)+'%',reachedF2_F3:reached.slice(1),avgTurns:(res.reduce((a,r)=>a+r.turns,0)/n).toFixed(0),byFloor}));
await b.close();})();
