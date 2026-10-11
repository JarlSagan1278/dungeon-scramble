const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const page=await b.newPage();
await page.goto('file://' + require('path').resolve(__dirname,'../../dist/dungeon_scramble.html') + '');
console.log(await page.evaluate(()=>{
 let n=0;const o=dealEncounterDamage;window.dealEncounterDamage=function(e,a){n++;return o(e,a);};
 ['render','showToast','playTone'].forEach(k=>window[k]=()=>{});
 newGame('dwarf','armsmaster');S.encounter=drawEncounter('enemy');S.screen='game';
 S.path=[];endTurnButton();let g=0;while(S.transitioning&&g++<30)skipTransition();
 return JSON.stringify({n,hp:S.health,enemy:S.encounter.name,dmg:S.encounter.dmg,cur:S.encounter.curHealth,block:S.playerBlock,tn:S.turnNumber});}));
await b.close();})();
