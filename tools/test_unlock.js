// Store app unlock (Oct 26): in the app build (node build.js --app) clearing Floor 1 without the unlock waits on the
// unlock screen (saved), a purchase carries the same run into Floor 2, and the tester build is never gated.
// usage: node tools/test_unlock.js   (needs dist/app from `node build.js --app`; prints ok/FAIL lines)
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const browser = await chromium.launch(); const errors = [];
  const run = async (file) => {
    const page = await browser.newPage({ viewport: { width: 395, height: 769 } }); page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
    await page.goto('file://' + path.resolve(__dirname, '../dist', file));
    const out = await page.evaluate(async () => {
      newGame('dwarf', 'guard');
      for (let g = 0; g < 8 && S.screen !== 'game'; g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
      S.routeStep = S.route.length; advanceRoute(); render();
      const r = { app: BUILD.app, gate: S.screen, floor: S.floorIdx };
      if (S.screen === 'unlock') {
        r.fits = document.documentElement.scrollHeight <= innerHeight;
        r.saved = (() => { saveGame(); const d = JSON.parse(localStorage.getItem(SAVE_KEY)); return d && d.screen; })();
        document.getElementById('unlock-buy-btn').click(); await new Promise(res => setTimeout(res, 900));
        r.after = S.screen; r.afterFloor = S.floorIdx; r.unlocked = hasFullGame();
      }
      return r;
    });
    await page.close(); return out;
  };
  const ok = (c, m) => console.log((c ? 'ok   ' : 'FAIL ') + m);
  const t = await run('dungeon_scramble.html');
  ok(!t.app && t.gate !== 'unlock' && t.floor === 1, `tester build is never gated (${JSON.stringify(t)})`);
  if (fs.existsSync(path.resolve(__dirname, '../dist/app/dungeon_scramble.html'))) {
    const a = await run('app/dungeon_scramble.html');
    ok(a.app && a.gate === 'unlock' && a.floor === 0, `app build waits on the unlock screen after Floor 1 (${a.gate})`);
    ok(a.fits && a.saved === 'unlock', `unlock screen fits the card and the run is saved there (${a.fits}, ${a.saved})`);
    ok(a.after !== 'unlock' && a.afterFloor === 1 && a.unlocked, `buying carries the same run into Floor 2 (${a.after}, floor ${a.afterFloor + 1})`);
  } else ok(true, 'no app build (dist/app) to check; run `node build.js --app`');
  console.log(errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'ok   no page errors');
  await browser.close();
})();
