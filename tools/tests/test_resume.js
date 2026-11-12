// Resume at awkward moments (Nov 12): closing the app on the loot chest, the equip sheet or a relic pick must come back
// to that same choice (it used to resume in the fight before the kill: replay the turn, re-roll the loot), and the run
// must carry on from it. Served over http (see test_ui.js: file:// reloads can drop localStorage writes).
// usage: node tools/tests/test_resume.js   (prints ok/FAIL lines)
const path = require('path'), http = require('http'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const DIR = path.resolve(__dirname, '../../dist');
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(DIR, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const URL_ = `http://127.0.0.1:${srv.address().port}/dungeon_scramble.html`;
  const browser = await chromium.launch(); const out = []; const errors = [];
  const toFight = () => { META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 }; newGame('dwarf', 'guard'); S.guide = null;
    for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
    S.transitioning = false; S.newRoomFx = false; S.needRoll = false; render(); document.querySelectorAll('.modal-overlay,#room-callout,#room-callout-scrim').forEach(n => n.remove()); };
  const scen = async (label, setup, finish) => {
    const ctx = await browser.newContext({ viewport: { width: 395, height: 769 } }); const p = await ctx.newPage(); p.on('pageerror', e => errors.push(label + ': ' + e.message));
    await p.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
    await p.goto(URL_); await p.waitForTimeout(500);
    await p.evaluate(toFight); const step0 = await p.evaluate(setup); await p.waitForTimeout(300);
    await p.reload(); await p.waitForTimeout(700);
    await p.evaluate(() => { const c = [...document.querySelectorAll('button')].find(x => /continue/i.test(x.textContent)); c && c.click(); }); await p.waitForTimeout(900);
    const r = await p.evaluate(finish);
    await ctx.close(); return { step0, ...r };
  };
  const a = await scen('chest', () => { S.encounter.curHealth = 0; onEncounterDefeated(); render(); return S.routeStep; },
    () => { const back = !!S.lootChoice && S.encounter.curHealth <= 0; chooseLoot(S.lootChoice.options[0]); swapInLootDie(0); return { back, step: S.routeStep, screen: S.screen }; });
  out.push((a.back && a.step === a.step0 + 1 ? 'ok   ' : 'FAIL ') + `closed on the loot chest: resumes on the chest, picking goes on to the next room (${JSON.stringify(a)})`);
  const b = await scen('equip', () => { S.encounter.curHealth = 0; onEncounterDefeated(); chooseLoot(S.lootChoice.options[0]); return S.routeStep; },
    () => { const back = !!S.pendingLootDie && !!document.querySelector('.swap-modal'); pocketLootDie(); return { back, step: S.routeStep, pocket: S.backPocket.length }; });
  out.push((b.back && b.step === b.step0 + 1 ? 'ok   ' : 'FAIL ') + `closed on the equip sheet: resumes on it, Keep in Pocket goes on (${JSON.stringify(b)})`);
  // Nov 12 (Jeremy: lock the turn in at Go): close the game while the turn plays out; Continue finishes the same path
  const c = await scen('midturn', () => { S.encounter.curHealth = 40; S.encounter.maxHealth = 40; S.encounter.curShield = 0;
      const h = [...Array(16).keys()].filter(i => canSelect(i)); toggleSelect(h[0]); for (let k = 0; k < 3; k++) { const n = [...Array(16).keys()].find(i => canSelect(i) && !S.path.includes(i)); if (n == null) break; toggleSelect(n); }
      window.__want = { path: S.path.slice(), dmg: computePathEffects(S.path).totalDamage, turn: S.turnNumber };
      localStorage.setItem('__want', JSON.stringify(window.__want));
      document.getElementById('resolve-btn').click(); return S.routeStep; },
    () => { const w = JSON.parse(localStorage.getItem('__want')); return { want: w, turn: S.turnNumber, enemy: S.encounter && S.encounter.curHealth, trans: S.transitioning, committed: !!S.committedTurn }; });
  const dealt = 40 - c.enemy;
  out.push((c.turn === c.want.turn + 1 && dealt >= c.want.dmg && !c.trans ? 'ok   ' : 'FAIL ') + `closed mid-turn: Continue finishes the same path (want ${c.want.dmg} damage, dealt ${dealt}; turn ${c.want.turn} -> ${c.turn})`);
  if (errors.length) out.push('FAIL page errors: ' + errors.slice(0, 3).join(' | '));
  console.log(out.join('\n')); await browser.close(); srv.close();
})();
