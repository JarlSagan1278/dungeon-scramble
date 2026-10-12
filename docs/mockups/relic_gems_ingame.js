const path=require('path'), fs=require('fs');
const { chromium } = require('playwright');
const SP=process.argv[2]||__dirname, FILE=path.resolve(__dirname,'../../dist/dungeon_scramble.html');
const LIB=fs.readFileSync(__dirname+'/relic_gems_lib.js','utf8');
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:395,height:769},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{ localStorage.setItem('dungeonScrambleTutorialSeen_v1','1'); }catch(e){} }); await p.goto('file://'+FILE); await p.waitForTimeout(800);
  const gemOn = async()=>p.evaluate((LIB)=>{
    (0,eval)(LIB);
    const MAP={whetstone:'prime',gambeson:'mantle',pivot_compass:'ftl',lucky_coin:'greed',frost_charm:'giant',picnic_basket:'coffee',flask:'klein',combo_gauntlet:'combo'};
    window.relicBadgeHTML = function(r, extra){
      const k=MAP[r.id]; const lg=/relic-badge-lg/.test(extra||''); const sz=lg?50:30;
      return `<span data-relic="${r.id}" class="relic-gem ${extra||''}" title="${r.name}: ${r.desc}" style="display:inline-flex;width:${sz}px;height:${sz}px;flex:0 0 auto;filter:drop-shadow(0 2px 2px rgba(0,0,0,.6))">${gem(k,sz)}</span>`;
    };
    const st=document.createElement('style'); st.textContent=`.fo-hud .relic-gem{width:24px!important;height:24px!important}.fo-hud .relic-gem svg{width:24px;height:24px}.relic-strip{gap:3px!important;align-items:center}`; document.head.appendChild(st);
  }, LIB);
  await p.evaluate(()=>{
    META.lifetime.victories=1; newGame('halfling','guard');
    for(let k=0;k<10 && !(S.screen==='game'&&S.encounter&&S.encounter.type!=='Shrine');k++){ if(S.screen==='camp') campLeave(); else advanceRoute(); }
    S.transitioning=false; try{skipTransition()}catch(e){}
    S.newRoomFx=false; document.querySelectorAll('#room-callout,#room-callout-scrim').forEach(n=>n.remove());
    S.relics=['whetstone','gambeson','pivot_compass','lucky_coin','frost_charm','picnic_basket']; render(); document.querySelectorAll('.modal-overlay,#symbol-intro').forEach(n=>n.remove());
  });
  await p.waitForTimeout(600);
  await p.screenshot({path:SP+'/g_before.png'});
  await gemOn(); await p.evaluate(()=>{ render(); document.querySelectorAll('.modal-overlay,#symbol-intro').forEach(n=>n.remove()); }); await p.waitForTimeout(600);
  await p.screenshot({path:SP+'/g_fight.png'});
  await p.evaluate(()=>{ S.relicChoice={name:'Ruinous Rune Room',options:['flask','combo_gauntlet','pivot_compass']}; renderRelicChoiceModal(); });
  await p.waitForTimeout(700); await p.screenshot({path:SP+'/g_choice.png'});
  await p.evaluate(()=>{ document.querySelectorAll('.modal-overlay').forEach(n=>n.remove()); openRunRelicsModal(); });
  await p.waitForTimeout(700); await p.screenshot({path:SP+'/g_owned.png'});
  await p.evaluate(()=>{ document.querySelectorAll('.modal-overlay').forEach(n=>n.remove()); showRoomCallout({type:'Monster',name:'Toadtaur Wizard, Assistant to the Co-consul',boss:true},()=>{}); });
  await p.waitForTimeout(700); await p.screenshot({path:SP+'/g_banner.png'});
  console.log('errors', errs);
  await b.close();
})();
