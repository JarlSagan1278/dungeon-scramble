// Big-turn crescendo (Nov 12, polish roadmap E3): a big path ends with its total stamped on the monster and a short hold
// before the monster's turn; a small path doesn't; Skip goes straight on; a kill skips it (the kill has its own beat).
// usage: node tools/tests/test_crescendo.js   (prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const browser = await chromium.launch(); const out = [], errors = [];
  const run = async (label, hv, hp, skip) => {
    const p = await browser.newPage({ viewport: { width: 395, height: 769 } }); p.on('pageerror', e => errors.push(label + ': ' + e.message));
    await p.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
    await p.goto('file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html')); await p.waitForTimeout(400);
    await p.evaluate(([hv, hp]) => { META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 }; newGame('dwarf', 'guard'); S.guide = null;
      for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
      S.transitioning = false; S.newRoomFx = false; S.needRoll = false;
      const set = (i, f) => { const c = S.tray[i]; c.die = { name: 'T' + i, cat: 'attack', level: 1, faces: [f, f, f, f, f, f] }; c.faceIdx = 0; c.minion = false; c.coveredDie = null; c.blank = false; c.spent = false; c.forcedFace = null; };
      for (let i = 0; i < 16; i++) set(i, { type: 'hit', value: hv });
      const e = S.encounter; e.maxHealth = e.curHealth = hp; e.curShield = 0; e.heal = 0; e.shield = 0; render();
      [0, 1, 2, 3].forEach(i => toggleSelect(i)); window.__beatAt = null;
      const o = window.runEnemyBeat; window.runEnemyBeat = function (i, nw) { if (i === 0 && window.__beatAt == null) window.__beatAt = performance.now(); return o.apply(this, arguments); };
      window.__go = performance.now(); document.getElementById('resolve-btn').click(); }, [hv, hp]);
    if (skip) { await p.waitForTimeout(30); await p.evaluate(() => skipTransition()); }
    let stamp = null;
    for (let k = 0; k < 40 && stamp == null; k++) { await p.waitForTimeout(100); stamp = await p.evaluate(() => { const n = document.querySelector('.turn-total b'); return n ? n.textContent : null; }); if (!stamp && await p.evaluate(() => window.__beatAt != null || S.screen !== 'game' || !!S.lootChoice)) break; }
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({ beat: window.__beatAt, dead: !(S.encounter && S.encounter.curHealth > 0) || !!S.lootChoice }));
    await p.close(); return { stamp, ...r };
  };
  const big = await run('big', 4, 80, false);
  out.push((big.stamp === '16' && big.beat != null ? 'ok   ' : 'FAIL ') + `a 16-damage turn stamps its total and the monster still answers (${JSON.stringify(big)})`);
  const small = await run('small', 1, 80, false);
  out.push((small.stamp == null && small.beat != null ? 'ok   ' : 'FAIL ') + `a 4-damage turn on an 80 HP monster has no stamp (${JSON.stringify(small)})`);
  const share = await run('share', 1, 10, false);
  out.push((share.stamp === '4' ? 'ok   ' : 'FAIL ') + `a 4-damage turn on a 10 HP monster counts as big (${JSON.stringify(share)})`);
  const sk = await run('skip', 4, 80, true);
  out.push((sk.stamp == null && sk.beat != null ? 'ok   ' : 'FAIL ') + `Skip goes straight to the monster's turn, no stamp (${JSON.stringify(sk)})`);
  const kill = await run('kill', 4, 12, false);
  out.push((kill.stamp == null && kill.dead ? 'ok   ' : 'FAIL ') + `a killing turn uses the kill's own beat, no stamp (${JSON.stringify(kill)})`);
  out.forEach(l => console.log(l));
  if (errors.length) console.log('FAIL page errors: ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
