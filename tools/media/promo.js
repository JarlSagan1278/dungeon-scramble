// Social promo image (Oct 27): a fresh path shot (Lethal, not "So close") composed under Jeremy's logo, 1080x1350 (4:5 for phone feeds).
// node build.js --release && node tools/media/promo.js [noshot]  -> docs/release/media/promo_4x5.png
const L=require('./lib');const fs=require('fs');
const ROOT='/home/user/dungeon-scramble/';
(async()=>{
 const b=await L.chromium.launch();
 if(process.argv[2]!=='noshot'){
  const {ctx,p}=await L.openPage(b); await L.seedMeta(p); await L.startRun(p,'Dwarf','Armsmaster');
  let r; for(let k=0;k<8;k++){ await L.midRun(p,{floorIdx:1,routeStep:2,loot:[4,3,2],upg:4}); r=await L.findPath(p,6); console.log('try',k,r.dmg); if(r.dmg>=14&&r.path.length>=5) break; }
  // enemy a little hurt so the counter reads "Lethal"
  await p.evaluate(d=>{ const e=S.encounter; e.curHealth=Math.max(1,Math.min(e.curHealth,d-2)); render(); },r.dmg);
  for(const [i] of r.path){ await L.tapDie(p,i); await L.sleep(450);} await L.sleep(800);
  await p.screenshot({path:L.OUT+'promo_shot.png'}); await ctx.close();
 }
 const b64=f=>fs.readFileSync(f).toString('base64');
 const shot='data:image/png;base64,'+b64(L.OUT+'promo_shot.png'), logo='data:image/png;base64,'+b64(ROOT+'art/cover/logo_trimmed_860.png');
 const p=await b.newPage({viewport:{width:1080,height:1350}});
 await p.setContent(`<html><head><style>
 html,body{margin:0;width:1080px;height:1350px;overflow:hidden}
 body{background:radial-gradient(ellipse at 50% 45%,#4a3222 0%,#2b1d14 58%,#1a110b 100%);position:relative;font-family:Georgia,'Times New Roman',serif}
 .logo{position:absolute;left:50%;top:20px;transform:translateX(-50%);width:570px}
 .tag{position:absolute;top:296px;width:100%;text-align:center;color:#f1e2c4;font-size:44px;text-shadow:0 4px 0 #120b07}
 .shot{position:absolute;left:50%;top:380px;transform:translateX(-50%);width:590px;height:930px;border:8px solid #d4af52;border-radius:40px;overflow:hidden;box-shadow:0 0 0 7px #120b07,0 24px 70px rgba(0,0,0,.65)}
 .shot img{display:block;width:100%;margin-top:-158px}
 .pill{position:absolute;right:46px;bottom:70px;background:#d4af52;color:#1e140d;font-weight:bold;font-size:34px;padding:14px 26px;border-radius:999px;border:5px solid #120b07;transform:rotate(-4deg)}
 </style></head><body><img class="logo" src="${logo}"><div class="tag">Roll a 4x4 tray of dice. Draw your path.</div>
 <div class="shot"><img src="${shot}"></div><div class="pill">Free demo</div></body></html>`);
 await p.waitForTimeout(400); await p.screenshot({path:L.OUT+'promo_4x5.png'});
 await b.close();
})();
