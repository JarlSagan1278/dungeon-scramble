const L=require('./lib');const which=process.argv[2]||'all';
(async()=>{
 const b=await L.chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const want=k=>which==='all'||which.split(',').includes(k);
 if(want('title')){ const {ctx,p}=await L.openPage(b); await p.evaluate(()=>{document.querySelectorAll('#app *').forEach(n=>{if(/^Playtesting\?/.test(n.textContent.trim())&&n.children.length===0)n.style.visibility='hidden';});}); await L.sleep(500); await p.screenshot({path:L.OUT+'01_title.png'}); await ctx.close(); }
 if(want('path')){ const {ctx,p}=await L.openPage(b); await L.seedMeta(p); await L.startRun(p,'Dwarf','Armsmaster');
   let path; for(let k=0;k<8;k++){ await L.midRun(p,{floorIdx:1,routeStep:2,loot:[4,3,2],upg:4}); const r=await L.findPath(p,6); path=r.path; console.log('try',k,r.dmg); if(r.dmg>=14&&path.length>=5) break; } console.log('path',JSON.stringify(path), await p.evaluate(()=>S.encounter.name));
   for(const [i] of path){ await L.tapDie(p,i); await L.sleep(450);} await L.sleep(800);
   await p.screenshot({path:L.OUT+'02_path.png'}); await ctx.close(); }
 if(want('boss')){ const {ctx,p}=await L.openPage(b); await L.seedMeta(p); await L.startRun(p,'Gnome','Guard');
   await L.midRun(p,{floorIdx:2,routeStep:7,loot:[4,3,2],relics:4,hp:[31,38],upg:4});
   console.log('boss',await p.evaluate(()=>S.encounter.name+' '+JSON.stringify(enemyNextTurnPreview(S.encounter))));
   await L.sleep(500); await p.screenshot({path:L.OUT+'03_boss.png'}); await ctx.close(); }
 if(want('shrine')){ const {ctx,p}=await L.openPage(b); await L.seedMeta(p); await L.startRun(p,'Pixie','Arcanist');
   const nm=await p.evaluate(()=>{ S.floorIdx=1; for(let t=0;t<200;t++){ S.routeStep=1; S.segmentShrineUsed=false; S.segmentTrapUsed=false; S.usedCards=new Set(); advanceRoute(); if(S.screen==='shrine') break; } S.health=17; S.maxHealth=24; render(); return S.encounter.name; });
   console.log('shrine',nm); await L.sleep(2500); if(await p.locator('#room-callout').count()) await p.click('#room-callout'); await L.sleep(1800);
   await p.screenshot({path:L.OUT+'04_shrine.png'}); await ctx.close(); }
 if(want('camp')){ const {ctx,p}=await L.openPage(b); await L.seedMeta(p); await L.startRun(p,'Halfling','Dungeoneer');
   await p.evaluate(()=>{ const slots=pickN(S.tray.map((c,i)=>i).filter(i=>S.tray[i].die.cat!=='origin'),6); [...pickN(GILDED,2),...pickN(ALLOY,2)].forEach((d,k)=>{S.tray[slots[k]].die=d;}); S.tray[slots[4]].die=Object.assign({},basic('attack',2));
     pickN(RELICS.filter(r=>!r.origin&&r.id!=='flask'),2).forEach(r=>grantRelic(r.id,{silent:true})); S.health=14; S.maxHealth=24; S.floorIdx=1; S.routeStep=4; S.route=buildRoute(); advanceRoute(); render(); });
   await L.sleep(2500); await p.screenshot({path:L.OUT+'05_camp.png'}); await ctx.close(); }
 if(want('codex')){ const {ctx,p}=await L.openPage(b); await L.seedMeta(p);
   await p.evaluate(()=>{ META.bestiary=META.bestiary||{}; bestiaryEntries().forEach(({e,floor},i)=>{ if(floor<3 || i%3===0) META.bestiary[e.name]={met:3+i%4,won:2+i%3,lost:i%5===0?1:0}; }); saveMeta(); });
   await p.click('#title-codex-btn'); await L.sleep(1500); await p.screenshot({path:L.OUT+'06_codex.png'}); await ctx.close(); }
 if(want('victory')){ const {ctx,p}=await L.openPage(b); await L.seedMeta(p); await L.startRun(p,'Gnome','Arcanist');
   await p.evaluate(()=>{ S.floorIdx=2; S.routeStep=8; S.route=buildRoute(); const sl=pickN(S.tray.map((c,i)=>i).filter(i=>S.tray[i].die.cat!=='origin'),10); [...pickN(GILDED,4),...pickN(ALLOY,3),...pickN(MAGIC,3)].forEach((d,k)=>{S.tray[sl[k]].die=d;}); Object.assign(S.stats,{damageBlocked:118,turnsTaken:61,damageDealt:742,encountersDefeated:18,shrinesVisited:3,overkills:9,lootCollected:7,bestTurn:46,bestTurnFoe:'',longestPath:9}); S.health=22; S.maxHealth=34; advanceRoute(); render(); });
   await L.sleep(3000); await p.evaluate(()=>{const n=document.getElementById('share-ask'); if(n) n.remove();}); await L.sleep(300); await p.screenshot({path:L.OUT+'07_victory.png'}); await ctx.close(); }
 await b.close();})();
