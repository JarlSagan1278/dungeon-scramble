// Headless balance harness: plays full runs through the REAL game logic with render/audio stubbed.
// usage: node harness.js '<json config>'  (see CONFIG below)
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright')); }
const cfg = Object.assign({ runs:40, skill:1500, origin:'dwarf', klass:'armsmaster', hpMul:[1,1,1], dmgAdd:[0,0,0], hpAdd:[0,0,0], bossHpMul:[1,1,1], maxTurns:400, dmgMul:1, takenMul:1, label:'', lootMode:'best' }, JSON.parse(process.argv[2]||'{}'));
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
  window.__taken=0; const origDeal=dealEncounterDamage; window.dealEncounterDamage=function(e,a){ const h=S.health; const t=origDeal(e,a); let lost=Math.max(0,h-S.health); if(cfg.takenMul<1 && lost>0){ const keep=lost*cfg.takenMul; const k=Math.floor(keep)+(Math.random()<keep-Math.floor(keep)?1:0); S.health=Math.min(S.maxHealth, S.health+(lost-k)); lost=k;} window.__taken += lost; return t; };
  const origStep=applyPathStep; window.applyPathStep=function(st){ if(cfg.dmgMul!==1 && st.dmg>0) st.dmg=Math.round(st.dmg*cfg.dmgMul); return origStep(st); };
  const origDraw = drawEncounter;
  window.drawEncounter = function(kind){
    const e = origDraw(kind);
    const fi = S.floorIdx;
    const boss = (e.type==='Boss'||e.type==='Big Boss');
    let mul = (cfg.hpMul[fi]||1) * (boss ? (cfg.bossHpMul[fi]||1) : 1);
    const hp = Math.max(1, Math.round(e.health*mul + (cfg.hpAdd[fi]||0)));
    e.health = hp; e.maxHealth = hp; e.curHealth = hp;
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
    let dmg = ef.totalDamage; const overshoot = Math.max(0, dmg-need);
    let v = dmg - 0.6*overshoot + (ef.dotToEncounter||0)*1.2 + Math.min(ef.healGain||0, missing)*0.9*(missing>3?1:0.5) + (ef.blockGain||0)*0.45 + (ef.hotToPlayer||0)*0.8;
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
      if(!S.campRested && (typeof campFireUsedBy!=='function' || S.health <= 0.6*S.maxHealth)){ campRest(); if(S.campRested) return null; }
      for(const cat of ['attack','maneuver']){ if(S.campUpgrades[cat]) continue; for(const lv of [2,1]){ if(canUpgrade(cat,lv)){ campUpgrade(cat,lv); if(S.campUpgrades[cat]) return null; } } }
      if(!S.campRested){ campRest(); if(S.campRested) return null; }
      campLeave(); return null; }
    if(S.screen==='shrine'){ applyShrineBoon(S.encounter); return null; }
    if(S.screen==='game'){ log.turns++; doTurn(); return null; }
    return null;
  }
  const runs=[];
  for(let r=0;r<cfg.runs;r++){
    newGame(cfg.origin, cfg.klass, null, '', cfg.depthMods||{});
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
    rec.floor=S.floorIdx+1; rec.turns=log.turns; rec.maxHp=S.maxHealth;
    runs.push(rec);
  }
  return {runs, turns:window.__turns};
}, cfg);
const turnsData=res.turns; res=res.runs;
require('fs').writeFileSync('' + __dirname + '/out_'+(cfg.label||'x')+'.json', JSON.stringify({cfg,res}));
// summarize
const n=res.length, wins=res.filter(r=>r.result==='VICTORY').length;
const byFloor=[1,2,3].map(f=>{const fs=res.flatMap(r=>r.fights).filter(x=>x.floor===f&&x.done);const nt=fs.map(x=>x.turns);return {f, fights:fs.length, avgTurns:(nt.reduce((a,x)=>a+x,0)/Math.max(1,nt.length)).toFixed(2), oneTurn:(nt.filter(x=>x<=1).length/Math.max(1,nt.length)*100).toFixed(0)+'%', taken:(fs.reduce((a,x)=>a+(x.taken||0),0)/Math.max(1,fs.length)).toFixed(1)};});
const reached=[1,2,3].map(f=>res.filter(r=>r.floor>=f).length);
const td=[1,2,3].map(f=>{const t=turnsData.filter(x=>x.f===f&&!x.boss);const m=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);const d=t.map(x=>x.dmg).sort((a,b)=>a-b);return {f,avgLen:m(t.map(x=>x.len)).toFixed(1),avgDmg:m(d).toFixed(1),p50:d[d.length>>1],p90:d[Math.floor(d.length*.9)]};});
const deaths=[1,2,3].map(f=>res.filter(r=>r.result==='GAMEOVER'&&r.floor===f).length);
console.log(JSON.stringify({label:cfg.label,deaths,td,skill:cfg.skill,runs:n,winRate:(wins/n*100).toFixed(0)+'%',reachedF2_F3:reached.slice(1),avgTurns:(res.reduce((a,r)=>a+r.turns,0)/n).toFixed(0),byFloor}));
await b.close();})();
