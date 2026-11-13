// Dice roll clip (Nov 13, 1.42.106): three lid flicks (up, right, left), each roll tumbling the dice the way the lid
// flew. Same setup as clip_crescendo.js. node build.js --release && node tools/media/clip_roll.js &&
// python3 tools/media/mk.py roll 0 <TRIM end - TRIM start> 1 clip_roll. Output in docs/release/media/ (silent).
const L=require('./lib');const fs=require('fs');
(async()=>{
 const b=await L.chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:395,height:769},deviceScaleFactor:2,hasTouch:false});
 const p=await ctx.newPage(); const t0=Date.now(); const dir='cast/roll'; fs.mkdirSync(dir,{recursive:true}); const frames=[]; let cdp=null;
 const startCast=async()=>{ cdp=await ctx.newCDPSession(p); cdp.on('Page.screencastFrame',async f=>{ const n=frames.length; fs.writeFileSync(dir+'/f'+String(n).padStart(4,'0')+'.jpg',Buffer.from(f.data,'base64')); frames.push(f.metadata.timestamp); try{await cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId});}catch(e){} }); await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:790,maxHeight:1538,everyNthFrame:1}); };
 p.on('pageerror',e=>console.log('PAGEERR',e.message));
 await p.addInitScript(()=>{ try{ localStorage.setItem('dungeonScrambleRollTest','1'); }catch(e){} document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='#symbol-intro{display:none!important}';document.head.appendChild(s);}); });
 await p.goto('file:///home/user/dungeon-scramble/dist/release/dungeon_scramble.html'); await L.sleep(1500);
 await L.seedMeta(p); await L.startRun(p,'Gnome','Arcanist');
 for(let k=0;k<12;k++){ await L.midRun(p,{floorIdx:1,routeStep:2,loot:[2,2,1],relics:1,hp:[20,24],upg:2});
   if(await p.evaluate(()=>S.screen==='game' && S.encounter && S.encounter.type==='Enemy')) break; }
 for(let k=0;k<3;k++){ if(await p.locator('#room-callout').count()){ await p.click('#room-callout'); await L.sleep(1500);} }
 const cover=async()=>{ await p.evaluate(()=>{ S.tray.forEach(c=>{ c.minion=false; c.coveredDie=null; }); scrambleTray(true); render(); }); await L.sleep(700); };
 const flick=async(dx,dy)=>{ const lid=await p.locator('#chest-lid').boundingBox(); const x=lid.x+lid.width/2, y=lid.y+lid.height/2;
   await p.mouse.move(x,y); await p.mouse.down(); for(let k=1;k<=6;k++){ await p.mouse.move(x+k*dx,y+k*dy); await L.sleep(12);} await p.mouse.up(); await L.sleep(60); console.log("flick",dx,dy,"opened",await p.evaluate(()=>!S.needRoll)); };
 await cover(); const ts=Date.now()-t0; await startCast(); await L.sleep(700);
 await flick(3,-22); await L.sleep(1700); await cover();
 await flick(22,-3); await L.sleep(1700); await cover();
 await flick(-22,-3); await L.sleep(1800);
 const te=Date.now()-t0; await cdp.send('Page.stopScreencast'); fs.writeFileSync(dir+'/times.json',JSON.stringify(frames));
 console.log('TRIM',(ts/1000).toFixed(2),(te/1000).toFixed(2),'frames',frames.length);
 await ctx.close(); await b.close();
})();
