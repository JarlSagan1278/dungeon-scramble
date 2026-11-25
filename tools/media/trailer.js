// Trailer (Nov 25): a 30-45 s 1920x1080 cut of real play in the PC layout, for the Steam page, itch, Reddit and the store.
// node build.js --release && node tools/media/trailer.js && python3 tools/media/trailer_mk.py
// Each scene is recorded with the CDP screencast (frames + timestamps) into cast/trailer/<scene>/; trailer_mk.py cuts and
// joins them with short fades into docs/release/media/trailer.mp4 (git-ignored). Silent: add music in an editor if wanted.
const L = require('./lib'); const fs = require('fs'), path = require('path');
const DIR = 'cast/trailer'; fs.mkdirSync(DIR, { recursive: true });
async function scene(b, name, setup, act){
  const ctx = await b.newContext({ viewport:{ width:1920, height:1080 }, deviceScaleFactor:1 });
  const p = await ctx.newPage(); p.on('pageerror', e=>console.log('PAGEERR', name, e.message));
  await p.addInitScript(()=>{ try{ localStorage.setItem('dungeonScrambleRollTest','1'); localStorage.setItem('dungeonScramblePC','1'); localStorage.setItem('dungeonScrambleTutorialSeen_v1','1'); }catch(e){}
    document.addEventListener('DOMContentLoaded',()=>{ const s=document.createElement('style'); s.textContent='#symbol-intro,#tip-bubble,#tip-ring,.toast{display:none!important}'; document.head.appendChild(s); }); });
  await p.goto('file:///home/user/dungeon-scramble/dist/release/dungeon_scramble.html'); await L.sleep(1200);
  await p.evaluate(()=>{ META.lifetime.victories=4; META.lifetime.bestFloorReached=3; META.coachSeen={armsmaster:1,guard:1,dungeoneer:1,arcanist:1}; META.relicHintSeen=Date.now(); saveMeta(); });
  if(setup) await setup(p); await L.sleep(900);
  const dir = path.join(DIR, name); fs.rmSync(dir, { recursive:true, force:true }); fs.mkdirSync(dir, { recursive:true });
  // log every game sound call with its wall-clock time, so trailer_audio.js can replay them in sync (Nov 25)
  await p.evaluate(()=>{ window.__snd = []; window.__sndOn = false;
    ['enemySound','playStepTone','playWhoosh','playIceCrackle','playTone','playDoorCreak','playNoiseBurst','playKillImpact','playBarBend','playDiceRollSound','cubeLandClick','playMaterialClack','playRerollSound','playPlayerHitSound','playShrineFx','musicChime','musicSting'].forEach(n=>{
      const f = window[n]; if(typeof f!=='function') return;
      window[n] = function(...a){ if(window.__sndOn && !window.__sndDepth){ try{ window.__snd.push({fn:n, t:Date.now()/1000, args:JSON.parse(JSON.stringify(a, (k,v)=> (v && typeof v==='object' && v.nodeType) ? undefined : v))}); }catch(e){} } window.__sndDepth = (window.__sndDepth||0) + 1; try{ return f.apply(this, a); } finally { window.__sndDepth--; } }; }); }); // only outer calls: a sound that plays another isn't logged twice
  const frames = []; const cdp = await ctx.newCDPSession(p);
  cdp.on('Page.screencastFrame', async f=>{ fs.writeFileSync(path.join(dir, 'f'+String(frames.length).padStart(4,'0')+'.jpg'), Buffer.from(f.data,'base64')); frames.push(f.metadata.timestamp); try{ await cdp.send('Page.screencastFrameAck', { sessionId:f.sessionId }); }catch(e){} });
  await cdp.send('Page.startScreencast', { format:'jpeg', quality:92, maxWidth:1920, maxHeight:1080 });
  await p.evaluate(()=>{ window.__sndOn = true; }); await L.sleep(300); await act(p); await cdp.send('Page.stopScreencast');
  fs.writeFileSync(path.join(dir, 'sounds.json'), JSON.stringify(await p.evaluate(()=>window.__snd)));
  fs.writeFileSync(path.join(dir, 'times.json'), JSON.stringify(frames)); console.log(name, frames.length, 'frames', frames.length ? (frames[frames.length-1]-frames[0]).toFixed(1)+'s' : '');
  await ctx.close();
}
// into a fight on a given floor against a given foe, with a mid-run loadout, lid closed so the scene can flick it
const fightSetup = (fl, foe, hp, want) => async p=>{
  await p.evaluate(([fl, foe, hp])=>{ newGame('dwarf','arcanist'); S.guide=null;
    for(let g=0;g<10&&!(S.screen==='game'&&S.encounter);g++){ if(S.screen==='camp') campLeave(); else advanceRoute(); }
    const slots = S.tray.map((c,i)=>i).filter(i=>S.tray[i].die.cat!=='origin'); const L2 = [...pickN(GILDED,2+fl), ...pickN(ALLOY,2), ...pickN(MAGIC,fl)];
    L2.forEach((d,k)=>{ S.tray[slots[k]].die = d; S.usedLootNames.add(d.name); }); pickN(RELICS.filter(r=>!r.origin && r.id!=='flask'), 1+fl).forEach(r=>grantRelic(r.id,{silent:true}));
    S.maxHealth = 26; S.health = 22; S.floorIdx = fl;
    if(foe==='boss') S.encounter = drawEncounter('boss');
    else { const c = [...FLOOR1_ENEMIES,...FLOOR2_ENEMIES,...FLOOR3_ENEMIES,...FLOOR3_TRAPS].find(x=>x.name===foe); const o = window.drawRoomCard; window.drawRoomCard = ()=>c; S.encounter = drawEncounter('enc'); window.drawRoomCard = o; }
    if(hp) S.encounter.curHealth = Math.min(S.encounter.curHealth, hp);
    S.transitioning=false; S.newRoomFx=false; scrambleTray(true); render(); document.querySelectorAll('#room-callout,#room-callout-scrim').forEach(n=>n.remove()); }, [fl, foe, hp]);
  // a roll that allows a strong path (the faces are rolled under the closed lid; the flick only reveals them)
  for(let k=0; want && k<80; k++){ await p.evaluate(()=>{ S.needRoll=false; }); const r = await L.findPath(p, 6); await p.evaluate(()=>{ S.needRoll=true; render(); });
    if(r.dmg >= want) break; await p.evaluate(()=>{ scrambleTray(true); render(); }); }
};
const flick = async p=>{ const lid = await p.locator('#chest-lid').boundingBox().catch(()=>null);
  if(lid){ const x = lid.x+lid.width/2, y = lid.y+lid.height*0.7; await p.mouse.move(x,y); await p.mouse.down(); for(let k=1;k<=6;k++){ await p.mouse.move(x+k*3, y-k*28); await L.sleep(14); } await p.mouse.up(); }
  else await p.evaluate(()=>scrambleRoll(0,-1));
  await L.sleep(1300); };
const playPath = async (p, maxLen, wait)=>{ const r = await L.findPath(p, maxLen); for(const [i] of r.path){ await L.tapDie(p, i); await L.sleep(330); } await L.sleep(350); await p.click('#resolve-btn', { force:true }); await L.sleep(wait); return r; };
(async()=>{
  const b = await L.chromium.launch();
  await scene(b, '1_title', null, async p=>{ await L.sleep(2600); });
  await scene(b, '2_turn', fightSetup(0, 'Grafted Grifter', null, 10), async p=>{ await flick(p); await playPath(p, 6, 3600); });
  await scene(b, '3_rule', fightSetup(2, 'Anti-Euclidian Space', null, 30), async p=>{ await flick(p); await playPath(p, 6, 3400); });
  await scene(b, '4_boss', fightSetup(1, 'boss', null, 24), async p=>{ await flick(p); await playPath(p, 6, 4200); });
  await scene(b, '5_loot', async p=>{ await fightSetup(0, 'Feral Pet Rock')(p); await p.evaluate(()=>{ S.needRoll=false; render(); S.encounter.curHealth=0; onEncounterDefeated(); }); }, async p=>{
    await L.sleep(1200); await p.evaluate(()=>{ const c=document.querySelector('.loot-chest-btn'); if(c) c.click(); }); await L.sleep(2200);
    await p.evaluate(()=>{ const o=document.querySelector('.loot-opt'); if(o) o.click(); }); await L.sleep(900); });
  await scene(b, '6_victory', async p=>{ await fightSetup(2, 'boss')(p); await p.evaluate(()=>{ S.needRoll=false; S.stats.turnsTaken=61; S.stats.encountersDefeated=19; S.screen='victory'; render(); }); }, async p=>{ await L.sleep(3400); });
  await b.close();
})();
