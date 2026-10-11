// Targeted check for Swap/Reroll (v1.38.0): faces, tokens, Clear undo, minion targeting, spent dice.
// usage: node tools/test_trayact.js   (writes tools/out_trayact_*.png screenshots, git-ignored as out_*)
const path = require('path');
const { chromium } = require('playwright');
const FILE = path.resolve(__dirname, '../dist/dungeon_scramble.html');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 395, height: 769 }, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + FILE);
  const r = await page.evaluate(() => {
    const out = [];
    const ok = (c, m) => out.push((c ? 'ok   ' : 'FAIL ') + m);
    META.lifetime.victories = 1; META.lifetime.bestFloorReached = 3; META.achievements['origin_duo'] = { date: Date.now() };
    newGame('pixie', 'arcanist');
    for (let k = 0; k < 10 && !(S.screen === 'game' && S.encounter && S.encounter.type !== 'Shrine'); k++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
    S.transitioning = false; if (typeof skipTransition === 'function') { try { skipTransition(); } catch (e) {} }
    ok(S.screen === 'game' && !!S.encounter, 'reached a fight: ' + (S.encounter && S.encounter.name));
    S.newRoomFx = false;
    const pix = S.tray.findIndex(c => c.die.cat === 'origin');
    ok(pix >= 0 && S.tray[pix].die.faces.some(f => f.type === 'swap'), 'Pixie Powder has a Swap face');
    // force the Pixie die onto Swap
    const c = S.tray[pix]; c.faceIdx = c.die.faces.findIndex(f => f.type === 'swap'); c.minion = false;
    const tgt = pix === 0 ? 5 : 0; const A = S.tray[pix], B = S.tray[tgt];
    S.tray[tgt].minion = false;
    toggleSelect(pix);
    ok(S.trayAct && S.trayAct.kind === 'swap' && S.path.length === 0, 'tapping the Swap face arms it (no path started)');
    toggleSelect(tgt);
    ok(S.tray[tgt] === A && S.tray[pix] === B && A.spent && currentFace(A).type === 'blank', 'swap traded places and spent the Swap die');
    ok(!canSelect(tgt), 'spent die is not pathable');
    clearPathAll();
    ok(S.tray[pix] === A && S.tray[tgt] === B && !A.spent, 'Clear undid the swap');
    // cancel by tapping the armed die again
    toggleSelect(pix); toggleSelect(pix);
    ok(!S.trayAct && S.path.length === 0, 'tapping the armed die again backs out');
    // minions can't be targeted
    S.tray[tgt].minion = true; S.tray[tgt].coveredDie = S.tray[tgt].die;
    toggleSelect(pix); toggleSelect(tgt);
    ok(S.trayAct && S.tray[pix] === A, 'a Minion-covered die cannot be swapped');
    cancelTrayAct(); S.tray[tgt].minion = false; S.tray[tgt].coveredDie = null;
    // Reroll token
    S.rerollTokens = 1; armTrayAct('reroll', null, true);
    const before = S.tray[3].die.faces[S.tray[3].faceIdx];
    toggleSelect(3);
    const after = S.tray[3].die.faces[S.tray[3].faceIdx];
    ok(S.rerollTokens === 0 && !S.trayAct, 'Reroll token spent');
    ok(!(before.type === after.type && (before.value||0) === (after.value||0)) || S.tray[3].die.faces.every(f => f.type === before.type && (f.value||0) === (before.value||0)), 'reroll landed on a different face');
    // Swap token (two taps), then Clear refunds it
    S.swapTokens = 1; armTrayAct('swap', null, true);
    const X = S.tray[1], Y = S.tray[2];
    toggleSelect(1); toggleSelect(2);
    ok(S.tray[1] === Y && S.tray[2] === X && S.swapTokens === 0 && !X.spent && !Y.spent, 'Swap token swaps two dice, spends nothing on the tray');
    clearPathAll();
    ok(S.tray[1] === X && S.tray[2] === Y && S.swapTokens === 1, 'Clear undid the token swap and refunded the token');
    // a mid-path Swap face is just a step
    S.trayAct = null;
    c.faceIdx = c.die.faces.findIndex(f => f.type === 'swap');
    const nb = [pix - 1, pix + 1, pix - 4, pix + 4].find(i => i >= 0 && i < 16 && Math.abs((i % 4) - (pix % 4)) <= 1 && currentFace(S.tray[i]).type !== 'blank' && !S.tray[i].minion);
    if (nb != null) { S.tray[nb].forcedFace = { type: 'hit', value: 1 }; S.path = [nb]; toggleSelect(pix); ok(S.path.length === 2 && !S.trayAct, 'mid-path a Swap face is a plain step'); S.path = []; delete S.tray[nb].forcedFace; }
    // render with the Swap armed for a screenshot
    toggleSelect(pix); render();
    return out;
  });
  console.log(r.join('\n'));
  const clearOverlays = () => page.evaluate(() => { document.querySelectorAll('.modal-overlay, #symbol-intro').forEach(n => n.remove()); [...document.querySelectorAll('body *')].filter(n => /A new room/.test(n.textContent) && n.children.length < 8 && getComputedStyle(n).position === 'fixed').forEach(n => n.remove()); });
  await page.waitForTimeout(400); await clearOverlays();
  await page.screenshot({ path: path.resolve(__dirname, 'out_trayact_armed.png') });
  await page.evaluate(() => { const pix = S.tray.findIndex(c => c.die.cat === 'origin'); toggleSelect(pix === 0 ? 5 : 0); render(); });
  await page.waitForTimeout(100); await clearOverlays();
  await page.screenshot({ path: path.resolve(__dirname, 'out_trayact_swapped.png') });
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})();
