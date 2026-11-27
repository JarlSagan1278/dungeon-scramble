// Gameplay clip (Nov 27, Jeremy: "a 15-20 second gameplay clip"): three real turns on a phone, three classes, the last
// one an Overkill. Each turn: the lid opens, a long path is drawn, Go, the dice fire, the foe drops.
// node build.js --release, then from a scratch dir: node tools/media/clip_turns.js && python3 tools/media/clip_turns_mk.py
// -> docs/release/media/clip_turns.mp4 (790x1538) + clip_turns.gif (395 wide)
const L = require('./lib'); const fs = require('fs');
const TURNS = [
  { origin: 'Gnome', klass: 'Arcanist', floorIdx: 0, len: 6 },
  { origin: 'Dwarf', klass: 'Ranger', floorIdx: 1, len: 6 },
  { origin: 'Pixie', klass: 'Armsmaster', floorIdx: 1, len: 7, overkill: true },
];
(async () => {
  const b = await L.chromium.launch();
  fs.rmSync('cast/turns', { recursive: true, force: true });
  for (const [n, t] of TURNS.entries()) {
    const dir = `cast/turns/${n}`; fs.mkdirSync(dir, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: 395, height: 769 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
    p.on('pageerror', e => console.log('PAGEERR', e.message));
    await p.addInitScript(() => { try { localStorage.setItem('dungeonScrambleRollTest', '1'); localStorage.setItem('dungeonScramblePC', '0'); localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {}
      document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#symbol-intro{display:none!important}'; document.head.appendChild(s); }); });
    await p.goto('file:///home/user/dungeon-scramble/dist/release/dungeon_scramble.html'); await L.sleep(1500);
    await L.seedMeta(p); await p.evaluate(() => { META.renown = 600; META.lifetime.runsPlayed = 12; saveMeta(); PREFS.fastTurns = true; render(); }); // classes unlocked; Fast turns keeps the clip short
    await L.startRun(p, t.origin, t.klass);
    let r = null;
    for (let k = 0; k < 30; k++) {
      await L.midRun(p, { floorIdx: t.floorIdx, routeStep: 2, loot: [2, 2, 1], relics: 2, hp: [20, 26], upg: 4 });
      const ok = await p.evaluate(() => S.screen === 'game' && S.encounter && S.encounter.type === 'Enemy' && !S.encounter.rule); if (!ok) continue;
      const nr = await p.evaluate(() => { const v = S.needRoll; S.needRoll = false; return v; });
      r = await L.findPath(p, t.len); await p.evaluate(v => { S.needRoll = v; }, nr);
      if (r.path.length >= t.len - 1 && r.dmg >= (t.overkill ? 22 : 12) && r.dmg <= 60) break; // readable totals (a 5-Boost chain can score 1000+)
    }
    console.log(n, t.klass, r.dmg, r.path.length);
    await p.evaluate(({ d, ok }) => { const e = S.encounter; e.maxHealth = Math.max(e.maxHealth, d); e.curHealth = Math.min(e.maxHealth, Math.max(1, ok ? d - 12 : Math.round(d * 0.85))); render(); }, { d: r.dmg, ok: !!t.overkill });
    for (let k = 0; k < 3; k++) { if (await p.locator('#room-callout').count()) { await p.click('#room-callout', { force: true }); await L.sleep(1500); } }
    if (!(await p.evaluate(() => S.needRoll))) await p.evaluate(() => { scrambleTray(true); render(); });
    await L.sleep(900);
    const frames = []; const cdp = await ctx.newCDPSession(p);
    cdp.on('Page.screencastFrame', async f => { const i = frames.length; fs.writeFileSync(`${dir}/f${String(i).padStart(4, '0')}.jpg`, Buffer.from(f.data, 'base64')); frames.push(f.metadata.timestamp); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {} });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1, maxWidth: 790, maxHeight: 1538 });
    await L.sleep(400);
    const lid = await p.locator('#chest-lid').boundingBox();
    if (lid) { const x = lid.x + lid.width / 2, y = lid.y + lid.height / 2; await p.mouse.move(x, y); await p.mouse.down(); for (let k = 1; k <= 6; k++) { await p.mouse.move(x + k * 3, y - k * 22); await L.sleep(12); } await p.mouse.up(); }
    await L.sleep(800);
    for (const [i] of r.path) { await L.tapDie(p, i); await L.sleep(240); }
    await L.sleep(300);
    await p.click('#resolve-btn', { force: true });
    // the moment the Victory chest appears (the cut point): screencast timestamps are wall-clock seconds
    let cutAt = null; const t0 = Date.now();
    while (Date.now() - t0 < 9000) { if (await p.evaluate(() => !!(S.lootChoice || document.querySelector('.loot-overlay')))) { cutAt = Date.now() / 1000; break; } await L.sleep(50); }
    await L.sleep(1400);
    await cdp.send('Page.stopScreencast'); fs.writeFileSync(`${dir}/times.json`, JSON.stringify(frames)); fs.writeFileSync(`${dir}/cut.json`, JSON.stringify({ cutAt }));
    await ctx.close();
  }
  await b.close();
})();
