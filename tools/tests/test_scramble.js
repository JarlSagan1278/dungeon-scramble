// Scramble flick (Oct 24), Depth presets, and the end-of-run play-data consent (Oct 25).
// Flick: a turn's dice wait covered (S.needRoll) until the flick; taps, Go and the Skill do nothing meanwhile; the next
// turn and a new room wait again; a save/reload keeps them covered. Presets: preset N always comes to exactly depth N.
// usage: node tools/tests/test_scramble.js   (prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 395, height: 769 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); localStorage.setItem('dungeonScrambleRollTest', '1'); } catch (e) {} });
  await page.goto('file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html'));
  const out = await page.evaluate(async () => {
    const res = []; const ok = (c, m) => res.push((c ? 'ok   ' : 'FAIL ') + m);
    for (let n = 0; n <= 27; n++) { const d = depthFromMods(depthPreset(n)) - 1; if (d !== n) ok(false, `preset ${n} comes to depth ${d}`); }
    ok(true, 'presets 0-27 each come to their own depth');
    META.lifetime.victories = 1; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 };
    newGame('dwarf', 'armsmaster');
    for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter && S.encounter.type !== 'Shrine'); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
    S.newRoomFx = false; render();
    ok(S.needRoll === true, 'a new room waits for the flick');
    ok(document.querySelectorAll('#tray .die.unrolled').length === 16 && !!document.getElementById('chest-lid') && !!document.querySelector('#resolve-btn.disabled'), 'the chest lid and hidden dice show, Go is greyed out');
    const faces = S.tray.map(c => c.faceIdx).join();
    document.querySelector('#tray .die[data-idx="5"]').click();
    document.getElementById('resolve-btn').click();
    ok(S.needRoll && S.path.length === 0 && !S.transitioning, 'taps on dice and on Go do not roll or start a path');
    const ab = document.getElementById('ability-btn'); if (ab) { ab.click(); ok(!abilityArmed, 'Skill waits for the roll'); }
    const sv = serializeState(); ok(sv.needRoll === true, 'the save keeps the dice covered');
    scrambleRoll(); await new Promise(r => setTimeout(r, 200)); // the redraw follows the lid's take-off by a frame
    ok(!S.needRoll && S.tray.map(c => c.faceIdx).join() === faces && !document.querySelector('#tray .die.unrolled') && !document.getElementById('chest-lid'), 'the flick reveals the faces rolled at turn start');
    endTurn();
    ok(S.needRoll === true, 'the next turn waits again');
    PREFS.flickRoll = false; endTurn(); ok(!S.needRoll, 'with the setting off the dice roll by themselves'); PREFS.flickRoll = true;
    // Play-data consent (Oct 25): 'Yes' at a run's end sends that run and later ones, never older runs.
    if (typeof PLAYDATA_URL !== 'undefined' && PLAYDATA_URL) {
      window.fetch = () => new Promise(() => {}); // no network in the check
      localStorage.removeItem('dungeonScrambleShareData_v1'); localStorage.removeItem('dungeonScrambleUploadQueue_v1'); localStorage.removeItem('dungeonScrambleUploaded_v1');
      const list = [{ runId: 'r-old1', outcome: 'defeat', events: [] }, { runId: 'r-just1', outcome: 'defeat', events: [] }];
      localStorage.setItem(TELE_KEY, JSON.stringify(list));
      shareDataAnswer(true);
      const q = JSON.parse(localStorage.getItem('dungeonScrambleUploadQueue_v1') || '[]').map(r => r.runId);
      ok(q.length === 1 && q[0] === 'r-just1', 'saying yes queues the run that just ended, not older ones (' + q.join(',') + ')');
    }
    return res;
  });
  out.forEach(l => console.log(l));
  console.log(errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'ok   no page errors');
  await browser.close();
})();
