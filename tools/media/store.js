const {chromium}=require('playwright');const fs=require('fs');
const M='/home/user/dungeon-scramble/docs/release/media/';
const ff=fs.readFileSync('fontface.css','utf8');
const items=[['02_path.png','Draw a path through the dice','Every die you step on fires its face','appstore_1_path.png'],
 ['03_boss.png',"Read the enemy's next move",'Monsters always show what comes next','appstore_2_boss.png'],
 ['07_victory.png','Build your dice, beat the depths','56 loot dice, 27 relics, 3 floors','appstore_3_victory.png']];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1290,height:2796}});
for(const [src,cap,sub,out] of items){
 const img='data:image/png;base64,'+fs.readFileSync(M+src).toString('base64');
 await p.setContent(`<html><head><style>${ff}
 html,body{margin:0;width:1290px;height:2796px;background:#2b1d14;overflow:hidden}
 body{background:radial-gradient(ellipse at 50% 30%,#4a3222 0%,#2b1d14 60%,#1e140d 100%);display:flex;flex-direction:column;align-items:center}
 h1{font-family:'Metamorphous',serif;color:#d4af52;font-weight:400;font-size:96px;line-height:1.08;text-align:center;margin:150px 70px 0;text-shadow:0 6px 0 #120b07}
 p{font-family:Georgia,'Times New Roman',serif;color:#f1e2c4;font-size:52px;margin:28px 0 0;text-align:center}
 .shot{margin-top:70px;border:10px solid #d4af52;border-radius:56px;overflow:hidden;box-shadow:0 0 0 8px #120b07,0 30px 80px rgba(0,0,0,.6);height:2088px}
 .shot img{display:block;height:2088px;width:auto}
 </style></head><body><h1>${cap}</h1><p>${sub}</p><div class="shot"><img src="${img}"></div></body></html>`);
 await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(300);
 await p.screenshot({path:M+out});
}
await b.close();})();
