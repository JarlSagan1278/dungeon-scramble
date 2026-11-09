// Mid-run play-data ask (Nov 9): asked once after the first loot pick; Yes sends a live 'in_progress' copy of the run
// (and again on room starts / page hide, throttled); No sends nothing and never asks again. Network is intercepted.
// usage: node tools/tests/test_shareask.js   (prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
async function run(browser, answer) {
  const page = await browser.newPage({ viewport: { width: 395, height: 769 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const posts = [];
  await page.route(/script\.google\.com/, async route => { try { posts.push(JSON.parse(route.request().postData() || '{}')); } catch (e) { posts.push({}); } await route.fulfill({ status: 200, body: 'ok' }); });
  await page.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); localStorage.setItem('dungeonScrambleShareAskTest', '1'); localStorage.setItem('dungeonScrambleLiveTest', '1'); } catch (e) {} });
  await page.goto('file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html')); await page.waitForTimeout(600);
  await page.evaluate(() => { META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 };
    newGame('dwarf', 'armsmaster'); S.guide = null;
    for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
    S.transitioning = false; S.newRoomFx = false; S.needRoll = false; render();
    document.querySelectorAll('.modal-overlay,#room-callout,#room-callout-scrim').forEach(n => n.remove());
    S.pendingLootDie = JSON.parse(JSON.stringify(ALLOY[0])); swapInLootDie(3); });
  await page.waitForTimeout(1400);
  const blockedByBanner = await page.locator('.share-ask-modal').count() > 0 && await page.locator('#room-callout').count() > 0;
  await page.evaluate(() => { const rc = document.getElementById('room-callout'); if (rc) rc.click(); });
  for (let w = 0; w < 10 && !(await page.locator('.share-ask-modal').count()); w++) await page.waitForTimeout(400);
  const asked = await page.locator('.share-ask-modal').count();
  await page.click(answer ? '#share-mid-yes' : '#share-mid-no'); await page.waitForTimeout(700);
  const after = await page.evaluate(() => ({ pref: shareDataPref(), asked: S.tele.shareAsked }));
  const n1 = posts.length;
  // a second loot pick in the same run must not ask again; a new room start (after the throttle) sends another live copy
  await page.evaluate(() => { document.querySelectorAll('.modal-overlay').forEach(n => n.remove()); S.pendingLootDie = JSON.parse(JSON.stringify(ALLOY[1])); swapInLootDie(4); _liveSentAt = 0; teleLog('room_start', { type: 'Enemy', name: 'test' }); });
  await page.waitForTimeout(1400);
  const askedAgain = await page.locator('.share-ask-modal').count();
  await page.close();
  return { blockedByBanner, asked, after, n1, n2: posts.length, live: posts.filter(p => p.rec && p.rec.outcome === 'in_progress').length, askedAgain, errors };
}
(async () => {
  const browser = await chromium.launch(); const out = [];
  const y = await run(browser, true), n = await run(browser, false);
  out.push((y.asked === 1 && !y.blockedByBanner ? 'ok   ' : 'FAIL ') + `asked once after the first loot pick, after the room banner (${y.asked})`);
  out.push((y.after.pref === 'yes' && y.n1 >= 1 && y.live === y.n2 ? 'ok   ' : 'FAIL ') + `Yes: sharing on, live in_progress copy sent at once (${y.n1} posts, all in_progress: ${y.live === y.n2})`);
  out.push((y.n2 > y.n1 ? 'ok   ' : 'FAIL ') + `a room start sends a newer live copy (${y.n1} -> ${y.n2})`);
  out.push((y.askedAgain === 0 && n.askedAgain === 0 ? 'ok   ' : 'FAIL ') + 'never asked twice in a run');
  out.push((n.after.pref === 'no' && n.n2 === 0 ? 'ok   ' : 'FAIL ') + `No: sharing off, nothing sent (${n.n2} posts)`);
  if (y.errors.length || n.errors.length) out.push('FAIL page errors: ' + [...y.errors, ...n.errors].slice(0, 3).join(' | '));
  console.log(out.join('\n')); await browser.close();
})();
