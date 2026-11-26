// itch.io cover GIF (Nov 27, Jeremy: "a better thumbnail gif for itch ... show what makes the game unique like the dice").
// One real turn in the wide PC layout (room left, dice right): flick the lid, draw a long path, Go, the dice fire, the foe drops.
// node build.js --release, then from a scratch dir: node tools/media/itch_cover.js [floorIdx] && node tools/media/itch_cover_bg.js && python3 tools/media/itch_cover_mk.py 0.4 8.1
// (the times trim the clip to end on the kill, before the Victory overlay; check them against a new recording)
// Output: docs/release/media/itch_cover.gif (630x500, itch's cover size) + itch_cover.mp4 (git-ignored).
const L = require('./lib'); const fs = require('fs');
(async () => {
  const floorIdx = +(process.argv[2] || 1);
  const b = await L.chromium.launch();
  const PHONE = !process.env.PC; // Nov 27 (Jeremy: the wide PC frame was awkward in itch's near-square cover): the phone layout by default
  const ctx = await b.newContext(PHONE ? { viewport: { width: 395, height: 769 }, deviceScaleFactor: 2 } : { viewport: { width: 1260, height: 1000 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERR', e.message));
  const dir = 'cast/itch'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const frames = []; let cdp = null;
  await p.addInitScript((PHONE) => { try { localStorage.setItem('dungeonScrambleRollTest', '1'); localStorage.setItem('dungeonScramblePC', PHONE ? '0' : '1'); } catch (e) {}
    document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#symbol-intro,#pc-hover .pch-idle{display:none!important}'; document.head.appendChild(s); }); }, PHONE);
  await p.goto('file:///home/user/dungeon-scramble/dist/release/dungeon_scramble.html' + (PHONE ? '' : '?pc=1')); await L.sleep(1500);
  await L.seedMeta(p); await p.evaluate(() => { META.renown = Math.max(META.renown || 0, 600); saveMeta(); render(); }); // Rational rank: the Ranger (and Pointer) unlocked
  await L.startRun(p, 'Dwarf', 'Ranger');
  // a fight with a long, strong path on offer (a few loot dice and upgrades, as mid-run)
  let r = null;
  for (let k = 0; k < 40; k++) {
    await L.midRun(p, { floorIdx, routeStep: 2, loot: [2, 2, 1], relics: 2, hp: [22, 28], upg: 4 });
    const ok = await p.evaluate(() => S.screen === 'game' && S.encounter && S.encounter.type === 'Enemy' && !S.encounter.rule); if (!ok) continue;
    const nr = await p.evaluate(() => { const v = S.needRoll; S.needRoll = false; return v; });
    r = await L.findPath(p, 6); await p.evaluate(v => { S.needRoll = v; }, nr);
    console.log('try', k, r.dmg, r.path.length, await p.evaluate(() => S.encounter.name));
    if (r.path.length >= 6 && r.dmg >= 18) break;
  }
  // the foe a little hurt so this turn finishes it with room to spare
  await p.evaluate(d => { const e = S.encounter; e.curHealth = Math.max(1, Math.min(e.curHealth, Math.round(d * 0.8))); render(); }, r.dmg);
  for (let k = 0; k < 3; k++) { if (await p.locator('#room-callout').count()) { await p.click('#room-callout'); await L.sleep(1500); } }
  if (!(await p.evaluate(() => S.needRoll))) await p.evaluate(() => { scrambleTray(true); render(); });
  await L.sleep(1200);
  cdp = await ctx.newCDPSession(p);
  cdp.on('Page.screencastFrame', async f => { const n = frames.length; fs.writeFileSync(dir + '/f' + String(n).padStart(4, '0') + '.jpg', Buffer.from(f.data, 'base64')); frames.push(f.metadata.timestamp); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {} });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1, maxWidth: PHONE ? 790 : 1260, maxHeight: PHONE ? 1538 : 1000 }); // 2x on the phone (the default is CSS pixels)
  await L.sleep(700);
  const lid = await p.locator('#chest-lid').boundingBox();
  if (lid) { const x = lid.x + lid.width / 2, y = lid.y + lid.height / 2; await p.mouse.move(x, y); await p.mouse.down(); for (let k = 1; k <= 6; k++) { await p.mouse.move(x + k * 3, y - k * 22); await L.sleep(12); } await p.mouse.up(); }
  else await p.evaluate(() => scrambleRoll(0, -1));
  await L.sleep(1300);
  for (const [i] of r.path) { await L.tapDie(p, i); await L.sleep(420); }
  await L.sleep(500);
  await p.click('#resolve-btn', { force: true }); await L.sleep(5600);
  await cdp.send('Page.stopScreencast'); fs.writeFileSync(dir + '/times.json', JSON.stringify(frames));
  console.log('frames', frames.length, 'path', JSON.stringify(r.path), 'dmg', r.dmg);
  await ctx.close(); await b.close();
})();
