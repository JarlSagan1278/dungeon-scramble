// Forks in the road (Nov 4): at the Elite slots of each floor the player picks one of two doors.
// One door is Elite/Deadly (pays one more loot choice), the other a Standard-slot room (Standard, Shrine or Trap).
// Checks: the fork appears at both slots on every floor, the doors' kinds, the loot count per door, save/resume at the
// fork, a real tap on a door, the route bar's pairs, and no fork in the guided first fight or at Night Shift II.
// usage: node tools/tests/test_forks.js   (prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 395, height: 769 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
  await page.goto('file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html'));
  const out = await page.evaluate(() => {
    const res = []; const ok = (c, m) => res.push((c ? 'ok   ' : 'FAIL ') + m);
    META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 };
    // walk a run, room by room, picking doors alternately; record every fork
    const forks = []; let bad = [];
    for (let run = 0; run < 6; run++) {
      newGame(['dwarf','gnome','halfling','pixie'][run % 4], ['armsmaster','guard','dungeoneer','arcanist'][run % 4]); S.guide = null;
      for (let g = 0; g < 80 && S.screen !== 'victory'; g++) {
        if (S.screen === 'camp') { campLeave(); continue; }
        if (S.forkChoice) {
          const fc = S.forkChoice; const kinds = fc.doors.map(d => d.kind);
          forks.push({ f: S.floorIdx, step: S.routeStep, kinds });
          if (!/^(Standard|Shrine|Trap)$/.test(kinds[0]) || !/^(Elite|Deadly|Elite Trap)$/.test(kinds[1]) || (kinds[0]==='Trap' && kinds[1]==='Elite Trap')) bad.push(kinds.join('/'));
          const i = (g + run) % 2; pickForkDoor(i);
          if (S.screen === 'game') {
            const want = i === 1 ? 3 : 2; S.encounter.curHealth = 0; onEncounterDefeated();
            const got = S.lootChoice ? S.lootChoice.options.length : -1;
            if (S.lootChoice && !S.lootChoice.final && got !== Math.min(want, FLOORS[S.floorIdx].lootPool.length)) bad.push(`loot ${got} for ${kinds[i]}`);
            if (i === 1 && S.lootChoice && !S.lootChoice.final && FLOORS[S.floorIdx + 1]) {
              const deep = S.lootChoice.options.filter(op => FLOORS[S.floorIdx + 1].lootPool.some(d => d.name === op.name)).length;
              if (deep !== 1) bad.push(`${deep} deeper-floor dice behind the Elite door on floor ${S.floorIdx + 1}`);
            }
            S.lootChoice = null; S.screen = 'game';
          }
          S.routeStep++; advanceRoute(); continue;
        }
        if (S.screen === 'shrine' || S.screen === 'game') { S.routeStep++; advanceRoute(); continue; }
        advanceRoute();
      }
    }
    const slots = new Set(forks.map(f => f.f + ':' + f.step));
    ok(['0:3','0:6','1:3','1:6','2:3','2:6'].every(k => slots.has(k)), 'a fork at both Elite slots on all three floors (' + [...slots].sort().join(' ') + ')');
    ok(!bad.length, 'left door is a Standard-slot room, right is Elite/Deadly; loot is 2 vs 3 choices, one of the 3 from the next floor' + (bad.length ? ' -- ' + bad.slice(0, 4).join('; ') : ''));
    // save and resume while standing at a fork; a real tap on a door
    newGame('dwarf', 'armsmaster'); S.guide = null;
    for (let g = 0; g < 12 && !S.forkChoice; g++) { if (S.screen === 'camp') campLeave(); else { if (S.routeStep > 0) S.routeStep++; advanceRoute(); } }
    render();
    ok(!!S.forkChoice && document.querySelectorAll('#fork-callout .fork-door').length === 2 && !!document.getElementById('fork-scrim') && !!document.querySelector('#app .tray-panel, #app .fo-shrine'), 'the two doors float over the finished room, behind a scrim');
    const pairs = document.querySelectorAll('.route .rt-fork .rt-pair').length;
    ok(pairs === 2, 'the route bar shows both forks of the floor as door pairs (' + pairs + ')');
    const before = JSON.stringify(S.forkChoice); saveGame(); S = null; loadGame(); render();
    ok(!!S.forkChoice && JSON.stringify(S.forkChoice) === before && document.querySelectorAll('#fork-callout .fork-door').length === 2, 'a save at the fork resumes on the same two doors');
    const want = S.forkChoice.doors[1].name;
    PREFS.reducedMotion = true; document.querySelector('#fork-callout .fork-door[data-fork="1"]').click();
    return new Promise(r => setTimeout(() => {
      ok(S.encounter && S.encounter.name === want && S.encounter.forkBonus === FORK_ELITE_BONUS && !document.getElementById('fork-callout') && !!document.querySelector('#room-callout.rc-seamless'), 'tapping the Elite door enters that room (marked for the extra loot choice) and its door becomes the room door');
      // no fork in the guided first fight's run or at Night Shift II
      newGame('dwarf', 'armsmaster', null, '', { gauntlet: 2 }); S.guide = null;
      let sawFork = false; for (let g = 0; g < 10; g++) { if (S.forkChoice) { sawFork = true; break; } if (S.screen === 'camp') campLeave(); else { if (S.routeStep > 0) S.routeStep++; advanceRoute(); } }
      ok(!sawFork, 'no fork at Night Shift II (every room is Elite there)');
      newGame('dwarf', 'armsmaster'); S.guide = { stage: 'pending' }; S.routeStep = 3; ok(!forkHere(), 'no fork while the guided first fight is running');
      r(res);
    }, 100));
  });
  out.forEach(l => console.log(l));
  console.log(errors.length ? 'FAIL PAGE ERRORS: ' + errors.join(' | ') : 'ok   no page errors');
  await browser.close();
})();
