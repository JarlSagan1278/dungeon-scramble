#!/usr/bin/env node
// Bug-hunt harness: random games with per-tick invariants, DOM + layout-overflow sanity, save/resume round-trips, all-relics stress. Usage: node tools/bugsearch.js [file] [runs] [maxTicks]
const path=require('path');const { chromium } = require('playwright');
const FILE=path.resolve(process.argv[2]||path.join(__dirname,'..','dist','dungeon_scramble.html'));
const RUNS=parseInt(process.argv[3]||'24',10), MAXT=parseInt(process.argv[4]||'1500',10);
const TICK_FN = () => {
  // `S` is a top-level `let` in the page's own <script>, not a property of
  // `window` -- but top-level let/const share one global lexical scope
  // across all scripts in a document, so plain `S` (no window. prefix) is
  // visible here too.
  if (typeof S === 'undefined' || !S) return { done: false, note: 'no-state' };

  if (S.screen === 'victory') return { done: true, result: 'VICTORY' };
  if (S.screen === 'gameover') return { done: true, result: 'GAMEOVER' };
  if (S.screen === 'demoEnd') return { done: true, result: 'DEMOEND' }; // demo build: Floor 1 cleared
  if (S.screen === 'unlock') return { done: true, result: 'UNLOCK' }; // store app: Floor 1 cleared, waiting for the unlock

  if (S.needRoll && S.screen === 'game' && !S.transitioning) { scrambleRoll(0, -1); return { done: false, note: 'flick-roll' }; } // chest lid (1.41.83+), on when FLICK=1

  if (S.transitioning) {
    skipTransition();
    return { done: false, note: 'skip-transition' };
  }
  if (S.lootChoice && S.lootChoice.final) { openFinalChest(); return { done: false, note: 'final chest' }; }
  if (S.lootChoice) {
    const opts = S.lootChoice.options;
    chooseLoot(opts[Math.floor(Math.random() * opts.length)]);
    return { done: false, note: 'loot' };
  }
  if (S.shrineChoice) {
    const opts = S.shrineChoice.options;
    chooseShrineOption(opts[Math.floor(Math.random() * opts.length)]);
    return { done: false, note: 'shrine-choice' };
  }
  if (S.relicChoice) {
    const opts = S.relicChoice.options;
    chooseRelic(opts[Math.floor(Math.random() * opts.length)]);
    return { done: false, note: 'relic' };
  }
  if (S.shrineResult) {
    continueFromShrine();
    return { done: false, note: 'shrine-continue' };
  }
  if (S.pendingLootDie) {
    // The swap picker is now a pop-up over whatever screen is showing
    // (see renderSwapModal(), render.js) rather than its own S.screen
    // value, so this checks the die itself instead of S.screen === 'swap'.
    // swapInLootDie replaces a random tray slot with the pending loot die.
    swapInLootDie(Math.floor(Math.random() * 16));
    return { done: false, note: 'swap' };
  }
  if (S.screen === 'camp') {
    // Randomly rest (once), randomly attempt an upgrade, then always leave
    // eventually so the run doesn't stall forever in camp.
    if (!S.campRested && Math.random() < 0.7) {
      campRest();
      return { done: false, note: 'camp-rest' };
    }
    if (Math.random() < 0.3) {
      const cat = Math.random() < 0.5 ? 'attack' : 'maneuver';
      const level = S.campUpgrades[cat] ? null : 1;
      if (level && typeof canUpgrade === 'function' && canUpgrade(cat, level)) {
        campUpgrade(cat, level);
        return { done: false, note: 'camp-upgrade' };
      }
    }
    campLeave();
    return { done: false, note: 'camp-leave' };
  }
  if (S.screen === 'shrine') {
    // No pending shrine UI: a player would hold the shrine to activate it
    // (v1.36.0 ritual), so trigger the boon directly.
    if (!S.relicChoice && !S.lootChoice && !S.pendingLootDie) { applyShrineBoon(S.encounter); return { done: false, note: 'shrine-activate' }; }
    return { done: false, note: 'shrine-wait' };
  }
  if (S.screen === 'game') {
    // Build a path: pick a random legal next die each step, for a random
    // path length, then resolve. If no first move is legal, end turn with
    // an empty path (some tray states / class zones can be very
    // restrictive, but resolvePath on an empty path is a no-op turn).
    // v1.38.0: sometimes spend Swap/Reroll tokens, and sometimes Clear (undoes swaps).
    if (S.guide && S.guide.stage === 't1') { // guided first turn (QUICK=1): only the planned dice are tappable
      for (const i of S.guide.plan) if (!S.path.includes(i)) toggleSelect(i);
      endTurnButton(); return { done: false, note: 'guide-turn' };
    }
    if ((S.swapTokens||0) > 0 && Math.random() < 0.4) { armTrayAct('swap', null, true); }
    else if ((S.rerollTokens||0) > 0 && Math.random() < 0.4) { armTrayAct('reroll', null, true); }
    for (let k = 0; k < 6 && S.trayAct; k++) toggleSelect(Math.floor(Math.random() * 16));
    if (S.trayAct) cancelTrayAct();
    if ((S.swapLog||[]).length && Math.random() < 0.3) clearPathAll();
    const maxLen = 1 + Math.floor(Math.random() * 4);
    let steps = 0;
    while (S.path.length < maxLen && steps < 20) {
      steps++;
      const legal = [];
      for (let i = 0; i < 16; i++) if (canSelect(i)) legal.push(i);
      if (!legal.length) break;
      toggleSelect(legal[Math.floor(Math.random() * legal.length)]);
      // an armed Swap/Reroll face (tapped as the first die) takes the next tap(s)
      for (let k = 0; k < 6 && S.trayAct; k++) toggleSelect(Math.floor(Math.random() * 16));
      if (S.trayAct) cancelTrayAct();
    }
    endTurnButton();
    return { done: false, note: 'turn' };
  }
  return { done: false, note: 'unknown-screen:' + S.screen };
};


const CHECK=()=>{
  const bad=[];const f=(n)=>Number.isFinite(n);
  if(typeof S==='undefined'||!S) return bad;
  if(S.screen==='game'||S.screen==='camp'){
    if(!f(S.health)||S.health>S.maxHealth+1e-9) bad.push('health '+S.health+'/'+S.maxHealth);
    if(!f(S.playerBlock)||S.playerBlock<0) bad.push('block '+S.playerBlock);
    if(!f(S.playerDOT)||S.playerDOT<0) bad.push('pDOT '+S.playerDOT);
    if(!f(S.playerHOT)||S.playerHOT<0||S.playerHOT>6) bad.push('pHOT '+S.playerHOT);
    if(!Array.isArray(S.tray)||S.tray.length!==16) bad.push('tray len '+(S.tray&&S.tray.length));
    else S.tray.forEach((c,i)=>{ if(!c||!c.die||!Array.isArray(c.die.faces)) bad.push('tray die '+i); else if(c.faceIdx==null||!c.die.faces[c.faceIdx]) bad.push('face idx '+i+' '+c.faceIdx); });
    if(Array.isArray(S.backPocket)&&S.backPocket.some(x=>!x)) bad.push('pocket hole');
    const e=S.encounter;
    if(e&&S.screen==='game'){
      if(!f(e.curHealth)||e.curHealth>e.maxHealth+1e-9) bad.push('enemy hp '+e.name+' '+e.curHealth+'/'+e.maxHealth);
      ['curShield','curDOT','curHOT'].forEach(k=>{ if(!f(e[k])||e[k]<0) bad.push(k+' '+e.name+' '+e[k]); });
      if(!(e.maxHealth>0)) bad.push('maxHealth '+e.name);
    }
    if(S.path&&new Set(S.path).size!==S.path.length) bad.push('dup path');
  }
  const vw=innerWidth; const off=[];
  document.querySelectorAll('#app *').forEach(el=>{ const r=el.getBoundingClientRect(); if(r.width>0&&r.height>0&&(r.right>vw+3||r.left<-3)){ const cs=getComputedStyle(el); if(cs.position==='fixed'||el.closest('#room-floor')||el.closest('.hall-fx')||el.closest('svg')||el.closest('.rb-ghost')||/glow|ghost|particle|confetti|sunray|delta-float|torch|sconce|fo-fig|enc-art|fo-img/.test(el.className&&el.className.baseVal===undefined?el.className:'')) return; off.push((el.className||el.tagName)+''); } });
  if(off.length) bad.push('OFFSCREEN@'+vw+' '+off.slice(0,3).join(' | '));
  if(document.documentElement.scrollWidth>vw+2) bad.push('H-SCROLL '+document.documentElement.scrollWidth+'>'+vw+' ('+S.screen+')');
  const txt=document.getElementById('app')?document.getElementById('app').innerText:'';
  const m=/NaN|undefined|\[object|null\b|Infinity/.exec(txt); if(m) bad.push('DOM text "'+m[0]+'" ('+S.screen+')');
  return bad;
};
(async()=>{
  const browser=await chromium.launch(); const out=[]; const seen=new Set();
  const combos=[]; 
  const probe=await browser.newPage(); await probe.goto('file://'+FILE);
  const lists=await probe.evaluate(()=>({o:ORIGINS.map(o=>o.id),c:CLASSES.map(c=>c.id)})); await probe.close();
  for(let r=0;r<RUNS;r++) combos.push([lists.o[r%lists.o.length],lists.c[(r*3+Math.floor(r/lists.o.length))%lists.c.length],r%2===1,r%3===0]);
  let n=0;
  for(const [o,c,relics,resume] of combos){
    const VPS=[[360,740],[390,844],[411,785],[375,667]]; const vp=VPS[n%VPS.length]; const page=await browser.newPage({viewport:{width:vp[0],height:vp[1]}}); const errs=[];
    page.on('pageerror',e=>errs.push('pageerror: '+e.message)); page.on('console',m=>{ if(m.type()==='error' && !/Failed to load resource|ERR_TUNNEL/.test(m.text())) errs.push('console: '+m.text()); });
    if(process.env.FLICK) await page.addInitScript(()=>{ try{ localStorage.setItem('dungeonScrambleRollTest','1'); }catch(e){} });
    if(process.env.QUICK) await page.addInitScript(()=>{ try{ ['dungeonScrambleGuideTest','dungeonScrambleTipsTest'].forEach(k=>localStorage.setItem(k,'1')); }catch(e){} });
    await page.goto('file://'+FILE);
    if(process.env.QUICK && n%2===0){ await page.click('#title-newrun-btn'); await page.waitForTimeout(600); } // Oct 28 quick start: a fresh device's first New Run (every other run)
    else await page.evaluate(({o,c,relics})=>{META.lifetime.victories=1;META.lifetime.bestFloorReached=3;META.achievements['origin_duo']={date:Date.now()};newGame(o,c);if(relics)RELICS.forEach(r=>grantRelic(r.id,{silent:true}));},{o,c,relics});
    const quick=!!(process.env.QUICK && n%2===0);
    let result='TIMEOUT'; const label=quick?'quickstart dwarf/armsmaster'+(resume?'+resume':''):`${o}/${c}${relics?'+relics':''}${resume?'+resume':''}`;
    for(let t=0;t<MAXT&&!errs.length;t++){
      let tk; try{ tk=await page.evaluate(TICK_FN); }catch(e){ errs.push('eval: '+e.message); break; }
      if(tk.done){ result=tk.result; if(result==='DEMOEND'){ await page.waitForTimeout(1500); (await page.evaluate(CHECK)).forEach(b=>errs.push('INVARIANT '+b+' on demo end')); } break; }
      if(t%3===0){ const bad=await page.evaluate(CHECK); bad.forEach(b=>{ if(!seen.has(b.replace(/[\d.]+/g,'#'))){ seen.add(b.replace(/[\d.]+/g,'#')); errs.push('INVARIANT '+b+' @tick '+t+' note '+tk.note); } }); }
      if(resume && t>0 && t%40===0){ // save, reload the page, resume, and keep going
        const ok=await page.evaluate(()=>{ if(S.transitioning||S.lootChoice||S.shrineChoice||S.relicChoice||S.pendingLootDie||S.shrineResult) return false; try{saveGame();return hasSave();}catch(e){return false;} });
        if(ok){ await page.waitForTimeout(3500); await page.goto('file://'+FILE); /* the 3.5 s wait (1.5 s was not always enough) lets Chromium commit localStorage first: an instant reload of a file:// page can read storage from before the save (Oct 25: false resume failures on 1 in 6 Debug runs) */ const lg=await page.evaluate(()=>{ try{ const r=loadGame(); if(r) render(); return r; }catch(e){ return 'ERR '+e.message; } }); if(lg!==true) errs.push('resume failed '+lg); else await page.waitForTimeout(80); }
      }
      if(t%25===0) await page.waitForTimeout(30);
    }
    n++; console.log(`${errs.length?'BUG ':'ok  '} ${label.padEnd(34)} ${result}${errs.length?'\n    '+errs.slice(0,6).join('\n    '):''}`);
    out.push(...errs.map(e=>label+': '+e)); await page.close();
  }
  await browser.close(); console.log('\n'+(out.length?out.length+' finding(s)':'No findings')); 
})();
