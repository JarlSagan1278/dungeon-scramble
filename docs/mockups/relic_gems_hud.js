const path=require('path'), fs=require('fs');
const { chromium } = require('playwright');
const SP=process.argv[2]||__dirname, LIB=fs.readFileSync(__dirname+'/relic_gems_lib.js','utf8');
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:395,height:769},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{ localStorage.setItem('dungeonScrambleTutorialSeen_v1','1'); }catch(e){} });
  await p.goto('file:///home/user/dungeon-scramble/dist/dungeon_scramble.html'); await p.waitForTimeout(800);
  await p.evaluate((LIB)=>{ (0,eval)(LIB); window._origBadge = relicBadgeHTML;
    META.lifetime.victories=1; newGame('halfling','guard');
    for(let k=0;k<10 && !(S.screen==='game'&&S.encounter&&S.encounter.type!=='Shrine');k++){ if(S.screen==='camp') campLeave(); else advanceRoute(); }
    S.transitioning=false; try{skipTransition()}catch(e){} S.newRoomFx=false;
    S.relics=['whetstone','gambeson','pivot_compass','lucky_coin','frost_charm','picnic_basket'];
    S.playerBlock=3; S.playerHOT=2; S.playerDOT=1; S.pendingFreeBoost=2;
    window._MAP={whetstone:'prime',gambeson:'mantle',pivot_compass:'ftl',lucky_coin:'greed',frost_charm:'giant',picnic_basket:'coffee',flask:'klein',combo_gauntlet:'combo'};
    window.setMode=(m)=>{
      document.getElementById('modestyle')?.remove();
      const st=document.createElement('style'); st.id='modestyle';
      if(m==='badge'){ window.relicBadgeHTML=window._origBadge; }
      else { const sz = m==='small'?18:(m==='side'?18:16);
        window.relicBadgeHTML=function(r,extra){ return `<span data-relic="${r.id}" class="relic-gem ${extra||''}" style="display:inline-flex;width:${sz}px;height:${sz}px;flex:0 0 auto;filter:drop-shadow(0 1px 1px rgba(0,0,0,.7))">${gem(window._MAP[r.id],sz)}</span>`; };
        if(m==='pile') st.textContent=`.fo-buffs .relic-strip{display:inline-flex!important;padding:1px 4px 1px 8px;background:#33200f;border:2px solid #0c0705;border-radius:999px;align-items:center}.fo-buffs .relic-gem{margin-left:-5px}`;
      }
      document.head.appendChild(st); render();
      document.querySelectorAll('.modal-overlay,#symbol-intro,#room-callout,#room-callout-scrim').forEach(n=>n.remove());
      if(m==='side'){ const strip=document.querySelector('.fo-player .relic-strip'); const pl=document.querySelector('.fo-player');
        const pr=pl.getBoundingClientRect(); pl.style.position='relative';
        strip.style.cssText='display:flex;flex-direction:column;gap:2px;position:absolute;left:-2px;top:-6px;margin:0;padding:3px;background:rgba(28,17,9,.75);border:2px solid #0c0705;border-radius:10px;z-index:3';
        pl.appendChild(strip); }
    };
  }, LIB);
  const out={};
  for(const m of ['badge','small','pile','side']){
    await p.evaluate(m=>setMode(m), m); await p.waitForTimeout(500);
    out[m]=await p.evaluate(()=>{ const r=document.querySelector('.fo-player .fo-buffs').getBoundingClientRect(); const h=document.querySelector('.fo-player img, .fo-player .fo-sprite, .fo-player svg'); return {buffsTop:Math.round(r.top),buffsH:Math.round(r.height), hero: h?Math.round(h.getBoundingClientRect().top):null}; });
    await p.screenshot({path:SP+'/hud_'+m+'.png', clip:{x:0,y:90,width:395,height:260}});
  }
  console.log(JSON.stringify(out), errs);
  await b.close();
})();
