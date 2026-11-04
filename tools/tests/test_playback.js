// Checks the turn-playback fast path (patchGameDOM, Nov 4): the same seeded turns are played twice, once with the
// fast path off (every step a full redraw) and once on; after every redraw during playback the whole screen must match.
// usage: node tools/tests/test_playback.js   (prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const COMBOS = [['dwarf','armsmaster'], ['gnome','guard'], ['pixie','arcanist'], ['halfling','dungeoneer'], ['gnome','armsmaster','boss'], ['dwarf','guard','boss2']];
async function play(browser, fast, seed, combo) {
  const page = await browser.newPage({ viewport: { width: 395, height: 769 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript((seed) => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {}
    let s = seed; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    // a frozen clock: HP number rolls and bar ghosts are timed, and the two runs would sample them at different moments
    const T0 = performance.now(); performance.now = () => T0; }, seed);
  await page.goto('file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html'));
  const r = await page.evaluate(({ fast, combo, seed }) => {
    window.DS_NO_FASTPLAY = !fast;
    // reseed here: page-load timers draw random numbers a varying number of times; from here on everything is synchronous
    let s = seed; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const norm = h => h.replace(/-?\d+(\.\d+)?ms/g, 'ms').replace(/class="([^"]*)"/g, (m, c) => 'class="' + c.trim().split(/\s+/).sort().join(' ') + '"').replace(/\s+/g, ' ');
    const snaps = []; let inTurn = false;
    const R = window.render; window.render = function () { R.apply(this, arguments); if (inTurn) snaps.push(norm(document.getElementById('app').innerHTML)); };
    META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 };
    newGame(combo[0], combo[1]); S.guide = null;
    if (combo[2]) { if (combo[2] === 'boss2') S.floorIdx = 1; S.routeStep = S.route.lastIndexOf('boss') - 1; advanceRoute(); }
    for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter && S.encounter.type !== 'Shrine'); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
    if (combo[2]) { S.health = S.maxHealth = 200; } // live through several boss turns (Minions, specials, phase 2)
    S.transitioning = false; S.newRoomFx = false; S.needRoll = false; render();
    document.querySelectorAll('.modal-overlay,#symbol-intro,#room-callout,#room-callout-scrim,.coach-overlay').forEach(n => n.remove());
    let turns = 0;
    for (let t = 0; t < (combo[2] ? 7 : 4) && S.screen === 'game' && S.encounter && !S.lootChoice; t++) {
      S.needRoll = false; clearPathAll(); render();
      for (let k = 0; k < 5; k++) { const l = [...Array(16).keys()].filter(i => canSelect(i) && !S.path.includes(i) && !trayActFaceAt(i)); if (l.length) toggleSelect(l[0]); }
      if (!S.path.length) break;
      inTurn = true; document.getElementById('resolve-btn').click(); try { skipTransition(); } catch (e) {} inTurn = false; turns++;
    }
    return { snaps, turns, fastCount: renderGame._fast || 0, boss: combo[2] && S.encounter ? S.encounter.name : null };
  }, { fast, combo, seed });
  await page.close();
  return { ...r, errors };
}
(async () => {
  const browser = await chromium.launch(); const out = []; let fastTotal = 0;
  for (const [n, combo] of COMBOS.entries()) {
    const a = await play(browser, false, 101 + n * 7, combo), b = await play(browser, !process.env.FULLFULL, 101 + n * 7, combo);
    fastTotal += b.fastCount;
    let bad = a.snaps.length !== b.snaps.length ? 1 : 0, first = '';
    for (let i = 0; i < Math.min(a.snaps.length, b.snaps.length); i++) if (a.snaps[i] !== b.snaps[i]) { bad++; if (!first) { let j = 0; while (a.snaps[i][j] === b.snaps[i][j]) j++; first = `redraw ${i}: full …${a.snaps[i].slice(Math.max(0, j - 80), j + 120)}…\n    fast …${b.snaps[i].slice(Math.max(0, j - 80), j + 120)}…`; } }
    out.push((bad ? 'FAIL ' : 'ok   ') + `${combo.join('/')}${b.boss ? ' vs ' + b.boss : ''}: ${b.turns} turns, ${b.snaps.length} playback redraws (${b.fastCount} fast), ${bad} mismatches` + (first ? '\n    ' + first : ''));
    if (a.errors.length || b.errors.length) out.push('FAIL page errors: ' + [...a.errors, ...b.errors].slice(0, 3).join(' | '));
  }
  out.push((fastTotal > 0 ? 'ok   ' : 'FAIL ') + `the fast path ran (${fastTotal} fast redraws)`);
  console.log(out.join('\n'));
  await browser.close();
})();
