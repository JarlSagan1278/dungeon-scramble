// Oct 14: per-monster tuning table from study outputs (1.41.17 runs). usage: node monster_table.js > monster_table.json
const fs=require('fs'),vm=require('vm'),path=require('path');
const R=path.resolve(__dirname,'../../src')+'/';
const ctx={};vm.createContext(ctx);
const dsrc=fs.readFileSync(R+'depth.js','utf8');
vm.runInContext(fs.readFileSync(R+'data.js','utf8')+dsrc.slice(dsrc.indexOf('const BASE_HP_MUL'), dsrc.indexOf('const DEPTH_MODS'))+';globalThis.O={FLOORS,BIG_BOSSES,BOSS_KITS,BASE_HP_MUL,HEAVY_EVERY};',ctx);
const O=ctx.O;
const info={};
O.FLOORS.forEach((f,i)=>['enemies','traps','bosses'].forEach(k=>(f[k]||[]).forEach(e=>info[e.name]={floor:i+1,type:e.type,tier:e.tier||'',hp:e.health,dmg:e.dmg||0,e})));
O.BIG_BOSSES.forEach(e=>info[e.name]={floor:3,type:e.type,tier:'',hp:e.health,dmg:e.dmg||0,e});
const files=fs.readdirSync(__dirname).filter(f=>/^out_cm_(restonly|mix40|mix60|mix80)_(reg|new)_/.test(f));
const st={};
for(const f of files){ const prof=f.includes('_reg_')?'reg':'new'; const res=JSON.parse(fs.readFileSync(path.join(__dirname,f))).res;
  for(const r of res){ r.fights.forEach((x,i)=>{ const s=st[x.name]=st[x.name]||{n:0,turns:0,taken:0,ends:0,big:0,tier:x.tier,type:x.type,floor:x.floor};
    if(x.done){ s.n++; s.turns+=x.turns; s.taken+=(x.taken||0); if((x.maxTurn||0)>=10) s.big++; }
    if(r.result==='GAMEOVER' && i===r.fights.length-1){ s.ends++; s.met=(s.met||0); } s.met=(s.met||0)+1; }); } }
const out=Object.entries(st).filter(([n,s])=>s.met>=40).map(([n,s])=>{ const I=info[n]||{};
  const kit=O.BOSS_KITS[n]; const tierLabel = s.type==='Big Boss'?'Big Boss':s.type==='Boss'?'Boss':(s.type==='Trap'?'Trap':(s.tier||'standard'));
  return {name:n, floor:s.floor, group:tierLabel, hp:Math.round((I.hp||0)*O.BASE_HP_MUL[s.floor-1]), baseHp:I.hp, dmg:kit?('boss kit'):(I.dmg||0), met:s.met, turns:+(s.turns/Math.max(1,s.n)).toFixed(1), taken:+(s.taken/Math.max(1,s.n)).toFixed(1), endsPct:+(100*s.ends/s.met).toFixed(1), bigTurnPct:+(100*s.big/Math.max(1,s.n)).toFixed(1)}; });
// group medians
const med=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:0;};
const groups={}; out.forEach(m=>{ const k=m.floor+'|'+m.group; (groups[k]=groups[k]||[]).push(m); });
out.forEach(m=>{ const g=groups[m.floor+'|'+m.group]; m.groupTaken=med(g.map(x=>x.taken)); m.groupEnds=med(g.map(x=>x.endsPct)); m.groupTurns=med(g.map(x=>x.turns)); m.groupSize=g.length; });
console.log(JSON.stringify(out.sort((a,b)=>a.floor-b.floor||a.group.localeCompare(b.group)||b.taken-a.taken),null,0));
