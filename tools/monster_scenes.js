// Captures every fighting monster's face-off scene (backdrop without the monster, enemy UI overlay, monster box)
// at 395x769 for the Monster Footing page (Oct 15). usage: (cd <outdir> && node <repo>/tools/monster_scenes.js) -> bg_/ov_ images + cap.json
const fs=require('fs'),path=require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async()=>{
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:395,height:769},deviceScaleFactor:2});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript(()=>{try{localStorage.setItem('dungeonScrambleTutorialSeen_v1','1');}catch(e){}});
  await page.goto('file://'+path.resolve(__dirname,'../dist/dungeon_scramble.html'));
  const list=await page.evaluate(()=>{
    const out=[];
    FLOORS.forEach((f,fi)=>{ f.enemies.forEach(e=>{ if(e.health>0 && MONSTER_ART[e.name]) out.push({name:e.name,fi,kind:'enc'}); }); (f.bosses||[]).forEach(e=>out.push({name:e.name,fi,kind:'boss'})); });
    BIG_BOSSES.forEach(e=>out.push({name:e.name,fi:2,kind:'boss'}));
    return out.filter((m,i,a)=>a.findIndex(x=>x.name===m.name)===i);
  });
  await page.evaluate(()=>{ META.lifetime.victories=1; newGame('dwarf','armsmaster');
    const st=document.createElement('style'); st.id='cap-st'; st.textContent='*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(st); });
  const res=[];
  for(const m of list){
    const info=await page.evaluate(m=>{
      const all=[...FLOORS.flatMap(f=>[...f.enemies,...(f.bosses||[])]),...BIG_BOSSES];
      const tpl=all.find(x=>x.name===m.name);
      S.floorIdx=m.fi; S.health=S.maxHealth;
      const oD=window.drawRoomCard, oP=window.pickUnused;
      window.drawRoomCard=()=>tpl; window.pickUnused=()=>tpl;
      try{ S.encounter=drawEncounter(m.kind); } finally { window.drawRoomCard=oD; window.pickUnused=oP; }
      S.screen='game'; S.transitioning=false; S.newRoomFx=false; S.path=[]; render();
      document.querySelectorAll('.modal-overlay,#symbol-intro,#room-callout,#room-callout-scrim,.floor-card').forEach(n=>n.remove());
      return true;
    },m);
    await page.waitForTimeout(150);
    const g=await page.evaluate(()=>{
      document.querySelectorAll('.modal-overlay,#symbol-intro,#room-callout,#room-callout-scrim,.floor-card').forEach(n=>n.remove());
      const card=document.querySelector('.enc-card.fo-arch'); const img=document.querySelector('.fo-enemy .fo-fig .fo-img');
      const pimg=document.querySelector('.fo-player .fo-fig');
      const c=card.getBoundingClientRect(), r=img.getBoundingClientRect(), p=pimg.getBoundingClientRect();
      return {card:{x:c.x,y:c.y,w:c.width,h:c.height}, img:{x:r.x,y:r.y,w:r.width,h:r.height}, pl:{x:p.x,y:p.y,w:p.width,h:p.height}, flip:img.classList.contains('fo-flip'), sz:encounterSize(S.encounter), quests:!!(S.encounter.quests&&S.encounter.quests.length), type:S.encounter.type, tier:S.encounter.tier||''};
    });
    const clip={x:0,y:Math.max(0,g.card.y-4),width:395,height:Math.min(769-Math.max(0,g.card.y-4), g.card.h+70)};
    const slug=m.name.replace(/[^a-z0-9]+/gi,'_');
    await page.addStyleTag({content:'.fo-enemy .fo-fig{visibility:hidden!important}'}).then(h=>h.evaluate(n=>n.id='hidefig'));
    // hide also z2 enemy UI for bg layer
    await page.addStyleTag({content:'.fo-enemy .fo-hpwrap,.fo-enemy .fo-name,.fo-enemy .fo-chips,.fo-enemy .kill-hint,.fo-enemy .fo-turnlabel,.fo-enemy .fo-quests{visibility:hidden!important}'}).then(h=>h.evaluate(n=>n.id='hideui'));
    await page.screenshot({path:`bg_${slug}.jpg`,clip,type:'jpeg',quality:72});
    // overlay: only enemy UI, transparent
    await page.evaluate(()=>{ document.getElementById('hideui').remove();
      const s=document.createElement('style'); s.id='ovl'; s.textContent='html,body,#app,#app *{background:transparent!important;background-image:none!important;box-shadow:none}#app *{visibility:hidden!important} #room-floor,.rf-shadow{display:none!important} #app .fo-enemy .fo-hpwrap,#app .fo-enemy .fo-hpwrap *,#app .fo-enemy .fo-name,#app .fo-enemy .fo-name *,#app .fo-enemy .fo-chips,#app .fo-enemy .fo-chips *,#app .fo-enemy .fo-turnlabel,#app .fo-enemy .fo-turnlabel *{visibility:visible!important}'; document.head.appendChild(s); });
    // restore element backgrounds for UI pieces: re-allow their own backgrounds
    await page.evaluate(()=>{ const s=document.getElementById('ovl'); s.textContent=s.textContent.replace('#app *{background:transparent!important;background-image:none!important;box-shadow:none}',''); s.textContent='html,body,#app,.enc-card,.enc-card-col,#enc-panel,.fo-band,.fo-side{background:transparent!important;background-image:none!important}'+s.textContent; });
    await page.screenshot({path:`ov_${slug}.png`,clip,omitBackground:true});
    await page.evaluate(()=>{ ['hidefig','ovl','hideui'].forEach(i=>{const n=document.getElementById(i); if(n) n.remove();}); });
    res.push({...m,slug,clip,...g});
  }
  fs.writeFileSync('cap.json',JSON.stringify(res,null,1));
  console.log(res.length,'captured', errs.slice(0,5));
  await browser.close();
})();
