let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright')); }
(async()=>{const b=await chromium.launch();const page=await b.newPage();
await page.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
await page.goto('file://' + require('path').resolve(__dirname,'../../dist/dungeon_scramble.html') + '');
const out=await page.evaluate(()=>{
 ['render','showToast','playTone','playDiceRollSound'].forEach(k=>window[k]=()=>{});
 newGame('dwarf','armsmaster',null,'T'); S.encounter=drawEncounter('enemy'); S.screen='game';
 S.encounter.curHealth=999; S.encounter.curShield=0;
 const orig=S.tray.map(c=>c.die);
 const mk=(variant)=>{ S.tray.forEach((c,i)=>{ const d=orig[i];
   if(variant==='noManeuver' && d.cat==='maneuver') c.die=clone(basic('attack',d.level));
   else if(variant==='noAttackSwap' && d.cat==='attack') c.die=clone(basic('maneuver',d.level));
   else c.die=d; }); };
 function best(budget){ let bestD=0,bestL=0,nodes=0; const dfs=()=>{ if(nodes>=budget) return; nodes++;
   if(S.path.length){ const ef=computePathEffects(S.path.slice()); if(ef.totalDamage>bestD||(ef.totalDamage===bestD&&S.path.length>bestL)){bestD=ef.totalDamage;bestL=S.path.length;} }
   const legal=[]; for(let i=0;i<16;i++) if(canSelect(i)) legal.push(i);
   for(let i=legal.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [legal[i],legal[j]]=[legal[j],legal[i]]; }
   for(const i of legal){ if(nodes>=budget) return; S.path.push(i); dfs(); S.path.pop(); } }; S.path=[]; dfs(); S.path=[]; return {d:bestD,l:bestL}; }
 const N=400, res={standard:[],noManeuver:[],noAttackSwap:[]};
 for(let t=0;t<N;t++){ const faces=S.tray.map(()=>Math.floor(Math.random()*6));
   for(const v of Object.keys(res)){ mk(v); S.tray.forEach((c,i)=>{c.faceIdx=faces[i];c.minion=false;c.blank=false;delete c.forcedFace;}); res[v].push(best(3000)); } }
 const sum=a=>{const d=a.map(x=>x.d).sort((x,y)=>x-y);const l=a.map(x=>x.l);return {avgDmg:(d.reduce((x,y)=>x+y,0)/d.length).toFixed(2),p10:d[Math.floor(d.length*.1)],p50:d[d.length>>1],p90:d[Math.floor(d.length*.9)],avgLen:(l.reduce((x,y)=>x+y,0)/l.length).toFixed(2)};};
 const comp={}; for(const v in res) comp[v]=sum(res[v]);
 comp.trayCounts={attack:orig.filter(d=>d.cat==='attack').length,maneuver:orig.filter(d=>d.cat==='maneuver').length,other:orig.filter(d=>d.cat!=='attack'&&d.cat!=='maneuver').length};
 return comp;});
console.log(JSON.stringify(out,null,1));await b.close();})();
