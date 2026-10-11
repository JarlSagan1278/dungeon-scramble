const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const page=await b.newPage();
await page.goto('file://' + require('path').resolve(__dirname,'../../dist/dungeon_scramble.html') + '');
const out=await page.evaluate(()=>{
 const f=e=>`${e.name} [${e.type}] hp${e.health} dmg${e.dmg||0} sh${e.shield||0} heal${e.heal||0} hot${e.hot||0} dot${e.dot||0} min${e.minion||0} qh${e.questHealth??''}`;
 let o=[];FLOORS.forEach((fl,i)=>{o.push('--F'+(i+1));['enemies','traps','shrines','bosses'].forEach(k=>(fl[k]||[]).forEach(e=>o.push(k[0]+' '+(k==='shrines'?e.name+': '+e.boon:f(e)))));});
 BIG_BOSSES.forEach(e=>o.push('BB '+f(e)));return o.join('\n');});
console.log(out);await b.close();})();
