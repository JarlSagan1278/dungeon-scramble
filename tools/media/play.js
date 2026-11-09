// Google Play store images (Nov 9): phone screenshots at 1080x1920 (Play rejects a long side more than twice the short
// side, so the 1290x2796 App Store shots can't be reused) and the 1024x500 feature graphic. Run shots.js first.
// usage: node tools/media/play.js   -> docs/release/media/play_*.png (needs docs/release/media/cover_art.jpeg: COVER_ART from src/assets.js)
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const M=path.resolve(__dirname,'../../docs/release/media')+'/';
const html=fs.readFileSync(path.resolve(__dirname,'../../dist/release/dungeon_scramble.html'),'utf8');
const ff=(html.match(/@font-face\s*\{[^}]*\}/g)||[]).join('\n');
const img=f=>'data:image/png;base64,'+fs.readFileSync(M+f).toString('base64');
const BG='radial-gradient(ellipse at 50% 30%,#4a3222 0%,#2b1d14 60%,#1e140d 100%)';
const shots=[['02_path.png','Draw one path','Every step counts: each die hits, blocks or heals, in order','play_1_path.png'],
 ['03_boss.png',"Read the boss's next move",'Monsters always show what comes next','play_2_boss.png'],
 ['04_shrine.png','Shrines, relics and loot','56 loot dice and 27 relics to find','play_3_shrine.png'],
 ['07_victory.png','Conquer three floors','Then go deeper with stackable Depth','play_4_victory.png']];
(async()=>{const b=await chromium.launch();
 const p=await b.newPage({viewport:{width:1080,height:1920}});
 for(const [src,cap,sub,out] of shots){
  await p.setContent(`<html><head><style>${ff}
  html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:${BG}}
  body{display:flex;flex-direction:column;align-items:center}
  h1{font-family:'Metamorphous',serif;color:#d4af52;font-weight:400;font-size:78px;line-height:1.05;text-align:center;margin:84px 50px 0;text-shadow:0 5px 0 #120b07}
  p{font-family:'Alegreya',Georgia,serif;color:#f1e2c4;font-size:40px;line-height:1.2;margin:20px 70px 0;text-align:center}
  .shot{margin-top:48px;border:8px solid #d4af52;border-radius:44px;overflow:hidden;box-shadow:0 0 0 6px #120b07,0 24px 60px rgba(0,0,0,.6);height:1460px}
  .shot img{display:block;height:1460px;width:auto}</style></head><body><h1>${cap}</h1><p>${sub}</p><div class="shot"><img src="${img(src)}"></div></body></html>`);
  await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(200); await p.screenshot({path:M+out}); }
 const g=await b.newPage({viewport:{width:1024,height:500}});
 await g.setContent(`<html><head><style>${ff}
  html,body{margin:0;width:1024px;height:500px;overflow:hidden;background:${BG}}
  .art{position:absolute;right:0;top:0;height:500px;width:560px;background:url(data:image/jpeg;base64,${fs.readFileSync(M+'cover_art.jpeg').toString('base64')}) center 55%/cover;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 22%)}
  .txt{position:absolute;left:48px;top:0;bottom:0;width:440px;display:flex;flex-direction:column;justify-content:center}
  h1{font-family:'Metamorphous',serif;color:#d4af52;font-weight:400;font-size:46px;line-height:1.12;margin:0;text-shadow:0 5px 0 #120b07}
  p{font-family:'Alegreya',Georgia,serif;color:#f1e2c4;font-size:30px;margin:18px 0 0;line-height:1.25}
  .dice{display:flex;gap:10px;margin-top:26px}.dice i{width:42px;height:42px;border:4px solid #120b07;border-radius:10px;box-shadow:0 4px 0 #120b07}
  </style></head><body><div class="art"></div><div class="txt"><h1>Draw one path.<br>Every step counts.</h1><p>A dice-path dungeon roguelike</p>
  <div class="dice"><i style="background:#e05a4a"></i><i style="background:#f3e3bf"></i><i style="background:#4f86c6"></i><i style="background:#d4af52"></i><i style="background:#5aa05a"></i></div></div></body></html>`);
 await g.evaluate(()=>document.fonts.ready); await g.waitForTimeout(200); await g.screenshot({path:M+'play_feature_1024x500.png'});
 await b.close(); console.log('done');})();
