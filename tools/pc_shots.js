// PC layout screenshots (Nov 13): node tools/pc_shots.js <screen,...> [1920x1080,1280x800]; PC_OUT=<dir> for the pictures.
// screens: fight,boss,camp,title,setup,loot,settings,door,fork,stamp,codex. Needs node build.js first.
const { chromium } = require('playwright'); const SP=process.env.PC_OUT||require('os').tmpdir();
const want=(process.argv[2]||'fight').split(','); const sizes=(process.argv[3]||'1920x1080,1280x800').split(',').map(x=>x.split('x').map(Number));
const FIGHT=`META.lifetime.victories=3; META.coachSeen={armsmaster:1,guard:1,dungeoneer:1,arcanist:1}; newGame('dwarf','armsmaster'); S.guide=null;
  for(let g=0;g<10&&!(S.screen==='game'&&S.encounter);g++){ if(S.screen==='camp') campLeave(); else advanceRoute(); }
  S.transitioning=false; S.newRoomFx=false; S.needRoll=false; render(); document.querySelectorAll('#room-callout,#room-callout-scrim').forEach(n=>n.remove());`;
const SET={ fight:FIGHT+`const h=[...Array(16).keys()].filter(i=>canSelect(i)); toggleSelect(h[0]); for(let k=0;k<3;k++){ const n=[...Array(16).keys()].find(i=>canSelect(i)&&!S.path.includes(i)); if(n==null) break; toggleSelect(n);} render();`,
  boss:FIGHT+`S.floorIdx=2; S.encounter=drawEncounter('boss'); render();`,
  camp:FIGHT+`S.screen='camp'; S.floorIdx=0; S.routeStep=4; S.campChoice=null; S.campRested=false; S.campFireOut=false; S.campUpgrades={}; render();`,
  title:`preGameScreen='title'; S=null; render();`, setup:`META.lifetime.victories=1; preGameScreen='setup'; S=null; render();`,
  loot:FIGHT+`S.encounter.curHealth=0; onEncounterDefeated(); S.lootChoice.opened=true; render();`,
  settings:FIGHT+`openSettingsModal();`,
  door:`META.lifetime.victories=3; META.coachSeen={armsmaster:1,guard:1,dungeoneer:1,arcanist:1}; newGame('dwarf','armsmaster'); S.guide=null; for(let g=0;g<10&&!(S.screen==='game'&&S.encounter);g++){ if(S.screen==='camp') campLeave(); else advanceRoute(); } render();`,
  fork:FIGHT+`for (let g = 0; g < 12 && !S.forkChoice; g++) { if (S.screen === 'camp') campLeave(); else { if (S.routeStep > 0) S.routeStep++; advanceRoute(); } } S.transitioning=false; S.newRoomFx=false; render();`,
  stamp:FIGHT+`S.encounter.maxHealth=S.encounter.curHealth=60; render(); turnTotalStamp(18,2);`,
  shrine:FIGHT+`const s=FLOORS[0].shrines[0]; const o=window.drawRoomCard; window.drawRoomCard=()=>s; S.encounter=drawEncounter('enc'); window.drawRoomCard=o; S.screen='shrine'; S.shrineResult=null; render(); try{ placeShrineFloat(); }catch(e){} document.querySelectorAll('#room-callout,#room-callout-scrim').forEach(n=>n.remove());`,
  victory:FIGHT+`S.screen='victory'; render();`,
  defeat:FIGHT+`S.stats.killedBy=S.encounter.name; S.health=0; S.screen='gameover'; S.carryoverOptions=highestTierTrayGroups(); S.carryoverChosenName=null; render();`,
  codex:`META.lifetime.victories=1; preGameScreen='title'; S=null; render(); openCodexModal();` };
(async()=>{ const b=await chromium.launch();
 for(const [w,h] of sizes) for(const k of want){ const p=await b.newPage({viewport:{width:w,height:h}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{try{localStorage.setItem('dungeonScrambleTutorialSeen_v1','1'); localStorage.setItem('dungeonScramblePC','1');}catch(e){}});
  await p.goto('file:///home/user/dungeon-scramble/dist/dungeon_scramble.html'); await p.waitForTimeout(500);
  await p.evaluate(SET[k]); await p.waitForTimeout(k==="stamp"?450:1300); await p.screenshot({path:`${SP}/pc_${k}_${w}.png`});
  console.log(k,w,'pc:',await p.evaluate(()=>document.body.classList.contains('pc')),'scroll',await p.evaluate(()=>document.documentElement.scrollHeight+'/'+innerHeight+' '+document.documentElement.scrollWidth+'/'+innerWidth),'errors',errs.length,errs[0]||''); await p.close(); }
 await b.close(); })();
