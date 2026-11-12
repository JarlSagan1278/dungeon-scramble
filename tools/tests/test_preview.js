// The monster's "next turn" damage must be exactly what lands before Block (Nov 12, Slay the Spire lesson: a telegraph
// that overstates teaches players it's approximate). Plays 6 enemy turns for a deadly regular enemy and a boss, with no
// relic, Gambeson, Warding Bell and both, and compares enemyNextTurnPreview(e).dmg (and the hit chip) with the HP lost.
// usage: node tools/tests/test_preview.js   (prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const browser = await chromium.launch(); const p = await browser.newPage({ viewport: { width: 395, height: 769 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
  await p.goto('file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html')); await p.waitForTimeout(500);
  const res = await p.evaluate(() => {
    META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 }; newGame('dwarf', 'guard'); S.guide = null;
    for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
    S.transitioning = false; S.newRoomFx = false; S.needRoll = false;
    const out = [];
    const cases = [[], ['gambeson'], ['warding_bell'], ['gambeson', 'warding_bell']];
    for (const kind of ['deadly', 'boss']) for (const rel of cases) {
      const e = S.encounter; S.relics = rel.slice(); delete e._wardUsed; e.turnsActed = 0; e.specialIdx = 0; e.phase = 1;
      e.maxHealth = e.curHealth = 999; e.curShield = 0; e.heal = e.hot = e.dot = e.minion = e.shield = 0; e.curDOT = 0;
      if (kind === 'boss') { e.kit = BOSS_KITS['Rogue Golemancer']; e.dmg = 0; } else { e.kit = null; e.tier = 'deadly'; e.dmg = 3; }
      S.tray.forEach(c => { c.minion = false; }); S.freezeNext = false;
      const bad = [];
      for (let t = 0; t < 6; t++) {
        S.health = S.maxHealth = 500; S.playerBlock = 0; S.playerDOT = 0; S.playerHOT = 0; S._pendingMinions = [];
        const pv = enemyNextTurnPreview(e);
        let chip = null;
        if (kind === 'deadly') { render(); const b = document.querySelector('#enc-panel .enemy-action-badge .enc-n'); chip = b ? +b.textContent : null; }
        runEncounterAction();
        const lost = 500 - S.health;
        if (lost !== pv.dmg || (chip != null && chip !== pv.dmg)) bad.push(`turn ${t + 1}: shown ${pv.dmg}${chip != null ? '/chip ' + chip : ''}, took ${lost}`);
        S.tray.forEach(c => { c.minion = false; }); S._pendingMinions = [];
      }
      out.push((bad.length ? 'FAIL ' : 'ok   ') + `${kind} enemy, relics [${rel.join(', ') || 'none'}]: next-turn damage matches what lands${bad.length ? ' (' + bad.join('; ') + ')' : ''}`);
    }
    return out;
  });
  res.forEach(l => console.log(l));
  if (errors.length) console.log('FAIL page errors: ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
