// Marketing media capture (Oct 22): node build.js --release, then node tools/media/shots.js [title,path,boss,...] /
// video.js <path|boss> + python3 tools/media/mk.py (GIF/MP4) / store.js (App Store 1290x2796). Output: docs/release/media/ (git-ignored).
const {chromium}=require('playwright');
const FILE='file:///home/user/dungeon-scramble/dist/release/dungeon_scramble.html';
const OUT='/home/user/dungeon-scramble/docs/release/media/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function openPage(browser,opts={}){
  const ctx=await browser.newContext({viewport:{width:395,height:769},deviceScaleFactor:opts.dpr||3,...(opts.ctx||{})});
  const p=await ctx.newPage(); p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.addInitScript(()=>{ document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='#symbol-intro{display:none!important}';document.head.appendChild(s);}); });
  await p.goto(FILE); await sleep(1500);
  return {ctx,p};
}
// returning player: some unlocks and a bestiary
async function seedMeta(p){
  await p.evaluate(()=>{ META.lifetime.victories=1; META.lifetime.bestFloorReached=3; META.achievements['origin_duo']={date:Date.now()-864e5};
    saveMeta(); });
}
async function startRun(p,origin,klass){
  await p.click('#title-newrun-btn'); await sleep(900);
  if(origin){ await p.locator('button',{hasText:new RegExp('^'+origin+'$')}).first().click(); await sleep(300);}
  if(klass){ await p.locator('button',{hasText:new RegExp('^'+klass+'$')}).first().click(); await sleep(300);}
  await p.getByText('Enter the Dungeon').click(); await sleep(1500);
  if(await p.locator('.modal-x-btn').count()) { await p.click('.modal-x-btn'); await sleep(600); }
}
// mid-run loadout: a few loot dice, upgraded basics, relics
async function midRun(p,{floorIdx,routeStep,loot=[3,2,1],relics=2,hp=[19,26],upg=3,boss=false}){
  await p.evaluate(({floorIdx,routeStep,loot,relics,hp,upg})=>{
    const slots=S.tray.map((c,i)=>i).filter(i=>S.tray[i].die.cat!=='origin');
    const sl=pickN(slots,slots.length);
    const L=[...pickN(GILDED,loot[0]),...pickN(ALLOY,loot[1]),...pickN(MAGIC,loot[2])];
    let k=0; L.forEach(d=>{S.tray[sl[k++]].die=d; S.usedLootNames.add(d.name);});
    for(let j=0;j<upg;j++){ const c=S.tray[sl[k++]]; if(c.die.cat==='attack'||c.die.cat==='maneuver'){ c.die=Object.assign({},basic(c.die.cat,2)); } }
    pickN(RELICS.filter(r=>!r.origin && r.id!=='flask'),relics).forEach(r=>grantRelic(r.id,{silent:true}));
    S.maxHealth=hp[1]; S.health=hp[0];
    S.stats.encountersDefeated=floorIdx*6+routeStep; S.stats.turnsTaken=floorIdx*20+routeStep*3;
    S.floorIdx=floorIdx; S.routeStep=routeStep; S.route=buildRoute(); S.segmentShrineUsed=false;
    advanceRoute(); render();
  },{floorIdx,routeStep,loot,relics,hp,upg});
  await sleep(2600);
  if(await p.locator('#room-callout').count()){ await p.click('#room-callout'); }
  await sleep(1500);
}
// find a good path (no render while searching)
async function findPath(p,maxLen=5){
  return p.evaluate((maxLen)=>{
    const R=render, RP=renderPathOnly, PT=window.playTone; render=()=>{}; renderPathOnly=()=>{}; if(PT) playTone=()=>{};
    const score=path=>{ if(!path.length) return 0; const e=computePathEffects(path); return e.totalDamage*4+(e.blockGain||0)+(e.healGain||0)+path.length*2; };
    let best=[],bs=-1,n=0;
    const ok=i=>!S.path.includes(i)&&canSelect(i)&&currentFace(S.tray[i]).type!=='blank'&&!trayActFaceAt(i)&&!S.tray[i].minion;
    function dfs(){ n++; if(n>20000) return; const sc=score(S.path); if(sc>bs){bs=sc;best=S.path.slice();}
      if(S.path.length>=maxLen) return;
      for(let i=0;i<16;i++) if(ok(i)){ toggleSelect(i); dfs(); toggleSelect(i);} }
    dfs(); clearPathAll(); render=R; renderPathOnly=RP; if(PT) playTone=PT; render();
    const out=best.map(i=>[i,currentFace(S.tray[i]).type]); out.total=0; return {path:out,dmg:computePathEffects(best).totalDamage};
  },maxLen);
}
async function tapDie(p,i){ await p.click(`#tray > [data-idx="${i}"]`); }
module.exports={chromium,openPage,seedMeta,startRun,midRun,findPath,tapDie,sleep,OUT};
