// Dungeoneer edge wrap (1.41.8 fix): across the left/right seam each face keeps its own move rule.
// usage: node tools/tests/test_wrap.js   (prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 395, height: 769 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
  await page.goto('file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html'));
  const out = await page.evaluate(() => {
    const res = [];
    newGame('gnome', 'dungeoneer');
    for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter && S.encounter.type !== 'Shrine'); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
    const set = (i, type) => { const c = S.tray[i]; c.minion = false; c.blank = false; c.spent = false; c.forcedFace = { type, value: type === 'hit' ? 1 : 0 }; };
    for (let i = 0; i < 16; i++) set(i, 'hit');
    const check = (label, from, type, to, want) => {
      set(from, type); S.path = [from];
      const got = canSelect(to);
      res.push((got === want ? 'ok   ' : 'FAIL ') + label + ' (got ' + got + ')');
      set(from, 'hit'); S.path = [];
    };
    // tray index = r*4 + c
    check('Hit right edge -> left edge same row', 7, 'hit', 4, true);
    check('Hit right edge -> straight up (normal step)', 7, 'hit', 3, true);
    check('Dodge right edge -> straight up (tester bug)', 7, 'dodge', 3, false);
    check('Dodge right edge -> straight down', 7, 'dodge', 11, false);
    check('Dodge right edge -> left edge one row up (diagonal across seam)', 7, 'dodge', 0, true);
    check('Dodge left edge -> right edge one row down', 4, 'dodge', 11, true);
    check('Dodge right edge -> left edge same row', 7, 'dodge', 4, false);
    check('Leap right edge -> left edge same row', 7, 'leap', 4, false);
    check('Leap right edge -> two up (normal leap)', 11, 'leap', 3, true);
    check('Pivot right edge -> left edge one row up', 7, 'pivot', 0, true);
    check('Pivot right edge -> left edge same row', 7, 'pivot', 4, true);
    check('Hit right edge -> left edge one row up (no diagonal)', 7, 'hit', 0, false);
    return res;
  });
  out.forEach(l => console.log(l));
  if (errors.length) console.log('PAGE ERRORS', errors);
  await browser.close();
})();
