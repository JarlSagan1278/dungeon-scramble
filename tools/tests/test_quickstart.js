// Quick start (Oct 28): a device's first New Run skips character setup, Base Camp and the welcome pages and opens on
// the guided fight (Dwarf Armsmaster); later runs get the normal setup screen. The demo's welcome text names Floor 1.
// usage: node tools/tests/test_quickstart.js   (prints ok/FAIL lines; uses dist/ and dist/demo/)
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const browser = await chromium.launch(); const errors = [];
  const ok = (c, m) => console.log((c ? 'ok   ' : 'FAIL ') + m);
  const ctx = await browser.newContext({ viewport: { width: 395, height: 769 } }); const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('dungeonScrambleGuideTest', '1'); } catch (e) {} });
  await page.goto('file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html')); await page.waitForTimeout(800);
  await page.click('#title-newrun-btn'); await page.waitForTimeout(1500);
  const first = await page.evaluate(() => ({ screen: S.screen, origin: S.originId || (S.origin && S.origin.id), klass: S.classId || (S.klass && S.klass.id),
    guide: S.guide && S.guide.stage, modal: !!document.querySelector('.modal-overlay'), tray: !!document.querySelector('.zone-cell'), step: S.routeStep }));
  ok(first.screen === 'game' && first.tray && !first.modal && first.step === 1, `first New Run opens straight on the fight, no popups (${JSON.stringify(first)})`);
  ok(first.guide === 't1', `the guided first turn is running (${first.guide})`);
  // a second run (guide done) gets the setup screen as before
  // a second tab in the same session shares storage at once (a file:// reload right after a write can read the old value)
  await page.evaluate(() => { guideFinish('test'); clearSave(); });
  const page2 = await ctx.newPage(); page2.on('pageerror', e => errors.push(e.message));
  await page2.goto('file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html')); await page2.waitForTimeout(800);
  await page2.click('#title-newrun-btn'); await page2.waitForTimeout(800);
  ok(await page2.locator('#start-btn').count() === 1, 'later runs show the character setup screen');
  const demo = path.resolve(__dirname, '../../dist/demo/dungeon_scramble_demo.html');
  if (fs.existsSync(demo)) {
    await page.goto('file://' + demo); await page.waitForTimeout(500);
    const t = await page.evaluate(() => TUTORIAL_STEPS[0].body);
    ok(/Floor 1/.test(t) && !/three floors/.test(t), `demo welcome text: "${t}"`);
  }
  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
})();
