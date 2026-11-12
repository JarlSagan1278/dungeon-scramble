// Crescendo clip (Nov 12): a big Floor 1 turn that does NOT kill, so the turn total slams onto the monster (1.42.88)
// and the monster answers. Same setup as clip.js. node build.js --release && node tools/media/clip_crescendo.js &&
// python3 tools/media/mk.py crescendo 0 <TRIM end - TRIM start> 1 clip_crescendo (frame times count from the start of capture). Output in docs/release/media/.
const L=require('./lib');const fs=require('fs');
(async()=>{
 const b=await L.chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:395,height:769},deviceScaleFactor:2,hasTouch:false});
 const p=await ctx.newPage(); const t0=Date.now(); const dir='cast/crescendo'; fs.mkdirSync(dir,{recursive:true}); const frames=[]; let cdp=null;
 const startCast=async()=>{ cdp=await ctx.newCDPSession(p); cdp.on('Page.screencastFrame',async f=>{ const n=frames.length; fs.writeFileSync(dir+'/f'+String(n).padStart(4,'0')+'.jpg',Buffer.from(f.data,'base64')); frames.push(f.metadata.timestamp); try{await cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});}catch(e){} }); await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:790,maxHeight:1538,everyNthFrame:1}); };
 p.on('pageerror',e=>console.log('PAGEERR',e.message));
 await p.addInitScript(()=>{ try{ localStorage.setItem('dungeonScrambleRollTest','1'); }catch(e){} document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='#symbol-intro{display:none!important}';document.head.appendChild(s);}); });
 await p.goto('file:///home/user/dungeon-scramble/dist/release/dungeon_scramble.html'); await L.sleep(1500);
 await L.seedMeta(p); await L.startRun(p,'Dwarf','Armsmaster');
 let r; for(let k=0;k<12;k++){ await L.midRun(p,{floorIdx:0,routeStep:2,loot:[1,1,0],relics:1,hp:[17,20],upg:1});
   const ok=await p.evaluate(()=>S.screen==='game' && S.encounter && S.encounter.type==='Enemy'); if(!ok) continue;
   const nr=await p.evaluate(()=>{ const v=S.needRoll; S.needRoll=false; return v; }); r=await L.findPath(p,6); await p.evaluate(v=>{ S.needRoll=v; },nr); console.log('try',k,r.dmg,r.path.length); if(r.dmg>=9&&r.path.length>=5) break; }
 // the monster survives this turn with a sliver left, so the crescendo plays (a kill has its own beat)
 await p.evaluate(d=>{ const e=S.encounter; e.maxHealth=Math.max(e.maxHealth,d+6); e.curHealth=d+4; e.curShield=0; render(); },r.dmg);
 for(let k=0;k<3;k++){ if(await p.locator('#room-callout').count()){ await p.click('#room-callout'); await L.sleep(1500);} }
 if(!(await p.evaluate(()=>S.needRoll))) await p.evaluate(()=>{ scrambleTray(true); render(); });
 await L.sleep(800);
 const ts=Date.now()-t0; await startCast(); await L.sleep(900);
 const lid=await p.locator('#chest-lid').boundingBox();
 if(lid){ const x=lid.x+lid.width/2, y=lid.y+lid.height/2; await p.mouse.move(x,y); await p.mouse.down(); for(let k=1;k<=6;k++){ await p.mouse.move(x+k*3,y-k*22); await L.sleep(12);} await p.mouse.up(); }
 else await p.evaluate(()=>scrambleRoll(0,-1));
 await L.sleep(1500);
 for(const [i] of r.path){ await L.tapDie(p,i); await L.sleep(480);} await L.sleep(450);
 await p.click('#resolve-btn'); await L.sleep(6500);
 const te=Date.now()-t0; await cdp.send('Page.stopScreencast'); fs.writeFileSync(dir+'/times.json',JSON.stringify(frames));
 console.log('TRIM',(ts/1000).toFixed(2),(te/1000).toFixed(2),'frames',frames.length);
 await ctx.close(); await b.close();
})();
