// Route-goal Wanted posters (Nov 8): each shape check passes on a path that has the shape and fails on one that
// doesn't, every poster's short text fits its sign, and a real turn completes one and pays its reward.
// usage: node tools/tests/test_routegoals.js   (prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
// [key, path that matches, its face types, path that doesn't, its face types]
const H = t => t.split(' ');
const CASES = [
  ['square root',       [5,6,10,9],        H('hit hit hit hit'),          [4,5,6,7],     H('hit hit hit hit')],
  ['running start',     [8,10,11],         H('leap boost hit'),           [9,10,11],     H('hit boost hit')],
  ['leapfrog',          [0,2,10],          H('leap leap hit'),            [0,2,3],       H('leap hit hit')],
  ['diagonal argument', [0,5,10,11],       H('dodge dodge hit hit'),      [0,5,4,9],     H('dodge hit dodge hit')],
  ['pivot point',       [4,5,10],          H('hit pivot combo'),          [4,5,6],       H('pivot hit combo')],
  ['straightedge',      [4,0,1,2,3],       H('hit hit hit hit hit'),      [0,1,2,6,7],   H('hit hit hit hit hit')],
  ['straightedge',      [15,11,7,3],       H('hit hit hit hit'),          [0,1,5,6,10],  H('hit hit hit hit hit')],
  ['antipodal',         [0,1,2,6,7,11,15], H('hit hit hit hit hit hit hit'), [0,1,2,6,7,11], H('hit hit hit hit hit hit')],
  ['hollow proof',      [0,1,2,3,7],       H('hit hit hit hit hit'),      [0,1,5,6,7],   H('hit hit hit hit hit')],
];
(async () => {
  const browser = await chromium.launch(); const out = [];
  const page = await browser.newPage({ viewport: { width: 395, height: 769 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
  await page.goto('file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html'));
  const unit = await page.evaluate(CASES => CASES.map(([k, p1, t1, p2, t2]) => [k, routeGoalMet(k, {pathIdx:p1, pathTypes:t1}), routeGoalMet(k, {pathIdx:p2, pathTypes:t2}), !!ROUTE_GOALS[k]]), CASES);
  unit.forEach(([k, yes, no, known]) => out.push((yes && !no && known ? 'ok   ' : 'FAIL ') + `${k}: matching path ${yes}, other path ${no}`));
  // every monster with a route goal: the sign row fits and the long-press names the goal
  const signs = await page.evaluate(() => {
    META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 };
    const res = [];
    const foes = []; FLOORS.forEach((f, fi) => f.enemies.forEach(e => { if (e.quests.some(q => /: route /.test(q))) foes.push([fi, e.name]); }));
    for (const [fi, name] of foes) {
      newGame('dwarf', 'armsmaster'); S.guide = null; S.floorIdx = fi;
      for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter && S.encounter.name === name); g++) { if (S.screen === 'camp') campLeave(); S.forkPick = { name }; S.forkChoice = null; advanceRoute(); }
      S.transitioning = false; S.newRoomFx = false; S.needRoll = false; render();
      const rows = [...document.querySelectorAll('#enc-panel .fo-quests-float .q-row')];
      const i = S.encounter ? S.encounter.quests.findIndex(q => /: route /.test(q)) : -1;
      const r = rows[i], c = r && r.querySelector('.q-cond'), sign = document.querySelector('#enc-panel .fo-quests-float');
      res.push({ name, ok: !!(r && c && c.scrollWidth <= c.clientWidth + 1 && r.scrollWidth <= r.clientWidth + 1),
        named: !!(r && ROUTE_GOALS[parseQuestSpec(S.encounter.quests[i]).cond.slice(6)] && r.getAttribute('title').startsWith(ROUTE_GOALS[parseQuestSpec(S.encounter.quests[i]).cond.slice(6)].name)) });
    }
    return res;
  });
  signs.forEach(s => out.push((s.ok && s.named ? 'ok   ' : 'FAIL ') + `${s.name}: route-goal row fits the sign (${s.ok}), long-press names it (${s.named})`));
  out.push((signs.length >= 10 ? 'ok   ' : 'FAIL ') + `${signs.length} monsters carry a route goal`);
  // a real turn: draw a 2x2 square on the Wooden Golem, press Go, the quest completes and its 5 damage lands
  const turn = await page.evaluate(() => {
    newGame('dwarf', 'armsmaster'); S.guide = null;
    for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter && S.encounter.name === 'Wooden Golem'); g++) { if (S.screen === 'camp') campLeave(); S.forkPick = { name: 'Wooden Golem' }; S.forkChoice = null; advanceRoute(); }
    S.transitioning = false; S.newRoomFx = false; S.needRoll = false; render();
    const blk = { type: 'block', value: 1 };
    S.tray.forEach((c, i) => { S.tray[i] = { die: { name: 'Test', faces: [blk, blk, blk, blk, blk, blk], cat: 'support', level: 1 }, faceIdx: 0, minion: false, coveredDie: null, blank: false }; });
    clearPathAll(); render(); [5, 6, 10, 9].forEach(i => toggleSelect(i));
    const live = !!document.querySelector('#enc-panel .fo-quest.q-live-done');
    const hp0 = S.encounter.curHealth, qi = S.encounter.quests.findIndex(q => /route square root/.test(q));
    document.getElementById('resolve-btn').click(); try { skipTransition(); } catch (e) {}
    return { live, done: S.encounter.questsDone[qi], dmg: hp0 - S.encounter.curHealth };
  });
  out.push((turn.live && turn.done && turn.dmg >= 5 ? 'ok   ' : 'FAIL ') + `Wooden Golem 2x2 square: sign shows it live (${turn.live}), quest done (${turn.done}), ${turn.dmg} damage from Block-only path`);
  if (errors.length) out.push('FAIL page errors: ' + errors.slice(0, 3).join(' | '));
  console.log(out.join('\n'));
  await browser.close();
})();
