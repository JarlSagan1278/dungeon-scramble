// Both down in one enemy hit (Nov 11 bug): Equal and Opposite's reflect kills the monster while the same hit takes
// you to 0. Before the fix you won at 0 HP and played on. Now: no Back Pocket -> game over; a Back Pocket save -> you
// come back and win the fight.
// usage: node tools/tests/test_bothdown.js   (prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
async function run(browser, pocket) {
  const page = await browser.newPage({ viewport: { width: 395, height: 769 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
  await page.goto('file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html')); await page.waitForTimeout(500);
  const r = await page.evaluate((pocket) => {
    META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 };
    newGame('dwarf', 'guard'); S.guide = null;
    for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter && S.encounter.name === 'Filement Bunny'); g++) { if (S.screen === 'camp') campLeave(); S.forkPick = { name: 'Filement Bunny' }; S.forkChoice = null; advanceRoute(); }
    S.transitioning = false; S.newRoomFx = false; S.needRoll = false; render();
    const e = S.encounter; grantRelic('spite_thorns');
    const hit = { type: 'hit', value: 1 };
    S.backPocket = pocket ? [{ name: 'Test', cat: 'attack', level: 1, faces: [hit, hit, hit, hit, hit, hit] }] : [];
    S.health = 1; S.playerBlock = 1; e.curHealth = 1; e.curShield = 0; e.curDOT = 0; e.curHOT = 0;
    S._skipAll = true; S.transitioning = true; runEnemyBeat(1, true);
    return { screen: S.screen, hp: S.health, enemy: e.curHealth, loot: !!S.lootChoice };
  }, pocket);
  await page.close();
  return { ...r, errors };
}
(async () => {
  const browser = await chromium.launch(); const out = [];
  const a = await run(browser, false), b = await run(browser, true);
  // a Back Pocket save on an ordinary enemy turn must finish the turn (Nov 11: it used to stop, and Go replayed the path)
  const page = await browser.newPage({ viewport: { width: 395, height: 769 } });
  await page.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
  await page.goto('file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html')); await page.waitForTimeout(500);
  const c = await page.evaluate(() => {
    META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 };
    newGame('dwarf', 'guard'); S.guide = null;
    for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter && S.encounter.name === 'Wooden Golem'); g++) { if (S.screen === 'camp') campLeave(); S.forkPick = { name: 'Wooden Golem' }; S.forkChoice = null; advanceRoute(); }
    S.transitioning = false; S.newRoomFx = false; S.needRoll = false; render();
    const hit = { type: 'hit', value: 1 }; S.backPocket = [{ name: 'T', cat: 'attack', level: 1, faces: [hit, hit, hit, hit, hit, hit] }];
    S.encounter.curHealth = 50; S.health = 1; S.playerBlock = 0; S.playerDOT = 2;
    const i = [...Array(16).keys()].find(i => canSelect(i)); toggleSelect(i);
    document.getElementById('resolve-btn').click(); try { skipTransition(); } catch (e) {}
    return { turn: S.turnNumber, hp: S.health, dot: S.playerDOT, path: S.path.length, screen: S.screen };
  });
  await page.close();
  out.push((c.screen === 'game' && c.turn === 1 && c.path === 0 && c.dot === 1 && c.hp === 3 ? 'ok   ' : 'FAIL ') + `Back Pocket save mid-turn: the turn finishes (D.O.T. ticks, new round, path cleared) (${JSON.stringify(c)})`);
  out.push((a.enemy <= 0 && a.screen === 'gameover' ? 'ok   ' : 'FAIL ') + `both down, empty Back Pocket: game over (${JSON.stringify(a)})`);
  out.push((b.enemy <= 0 && b.hp > 0 && b.loot ? 'ok   ' : 'FAIL ') + `both down, Back Pocket saves you: you win the fight (${JSON.stringify(b)})`);
  if (a.errors.length || b.errors.length) out.push('FAIL page errors: ' + [...a.errors, ...b.errors].slice(0, 3).join(' | '));
  console.log(out.join('\n')); await browser.close();
})();
