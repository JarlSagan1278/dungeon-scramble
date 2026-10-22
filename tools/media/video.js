const L=require('./lib');const which=process.argv[2];
(async()=>{
 const b=await L.chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:395,height:769},deviceScaleFactor:2});
 const p=await ctx.newPage(); const t0=Date.now(); const fs=require('fs'); const dir='cast/'+which; fs.mkdirSync(dir,{recursive:true}); let frames=[]; let cdp=null;
 const startCast=async()=>{ cdp=await ctx.newCDPSession(p); cdp.on('Page.screencastFrame',async f=>{ const n=frames.length; fs.writeFileSync(dir+'/f'+String(n).padStart(4,'0')+'.jpg',Buffer.from(f.data,'base64')); frames.push(f.metadata.timestamp); try{await cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});}catch(e){} }); await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:790,maxHeight:1538,everyNthFrame:1}); };
 const stopCast=async()=>{ await cdp.send('Page.stopScreencast'); fs.writeFileSync(dir+'/times.json',JSON.stringify(frames)); };
 p.on('pageerror',e=>console.log('PAGEERR',e.message));
 await p.addInitScript(()=>{ document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='#symbol-intro{display:none!important}';document.head.appendChild(s);}); });
 await p.goto('file:///home/user/dungeon-scramble/dist/release/dungeon_scramble.html'); await L.sleep(1500);
 await L.seedMeta(p);
 let ts,te;
 if(which==='path'){
   await L.startRun(p,'Dwarf','Armsmaster');
   let path=[];
   for(let k=0;k<8;k++){ await L.midRun(p,{floorIdx:1,routeStep:2,loot:[4,3,2],upg:4}); const r=await L.findPath(p,6); path=r.path; console.log('try',k,r.dmg,path.length); if(r.dmg>=14 && path.length>=5) break; }
   console.log(JSON.stringify(path)); await L.sleep(1500); for(let k=0;k<3;k++){ if(await p.locator('#room-callout').count()){ await p.click('#room-callout'); await L.sleep(1500);} } await L.sleep(800);
   ts=Date.now()-t0; await startCast();
   await L.sleep(700);
   for(const [i] of path){ await L.tapDie(p,i); await L.sleep(520);} await L.sleep(500);
   await p.click('#resolve-btn'); await L.sleep(5000);
   te=Date.now()-t0; await stopCast();
 } else {
   await L.startRun(p,'Gnome','Guard');
   await p.evaluate(()=>{ const sl=pickN(S.tray.map((c,i)=>i).filter(i=>S.tray[i].die.cat!=='origin'),12); [...pickN(GILDED,4),...pickN(ALLOY,3),...pickN(MAGIC,2)].forEach((d,k)=>{S.tray[sl[k]].die=d;}); for(let k=9;k<12;k++){const c=S.tray[sl[k]]; if(c.die.cat==='attack'||c.die.cat==='maneuver') c.die=Object.assign({},basic(c.die.cat,2));}
     pickN(RELICS.filter(r=>!r.origin&&r.id!=='flask'),4).forEach(r=>grantRelic(r.id,{silent:true})); S.health=31; S.maxHealth=38; S.floorIdx=2; S.routeStep=7; S.route=buildRoute(); });
   ts=Date.now()-t0; await startCast();
   await p.evaluate(()=>{advanceRoute(); render();});
   await L.sleep(2400); if(await p.locator('#room-callout').count()) await p.click('#room-callout'); await L.sleep(1600);
   const path=(await L.findPath(p,5)).path; console.log(JSON.stringify(path), await p.evaluate(()=>S.encounter.name));
   for(const [i] of path){ await L.tapDie(p,i); await L.sleep(450);} await L.sleep(300);
   await p.click('#resolve-btn'); await L.sleep(5500);
   te=Date.now()-t0; await stopCast();
 }
 console.log('TRIM',ts/1000,te/1000);
 await ctx.close(); await b.close();
 console.log('frames',frames.length);
})();
