// Targeted check for Swap/Reroll (v1.38.0): faces, tokens, Clear undo, minion targeting, spent dice.
// usage: node tools/tests/test_trayact.js   (writes dist/test_trayact_*.png screenshots)
const path = require('path');
const { chromium } = require('playwright');
const FILE = path.resolve(__dirname, '../../dist/dungeon_scramble.html');
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
    ok(S.tray[tgt] === A && S.tray[pix] === B && A.actUsed && getFaceForIdx(tgt).type === 'pivot', 'swap traded places and the used Swap die became a Pivot');
    ok(canSelect(tgt) && !trayActFaceAt(tgt), 'used Swap die is pathable (as a Pivot) and cannot be used again');
    clearPathAll();
    ok(S.tray[pix] === A && S.tray[tgt] === B && !A.actUsed && !A.forcedFace, 'Clear undid the swap');
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
    if (nb != null) { S.tray[nb].forcedFace = { type: 'hit', value: 1 }; S.path = [nb]; toggleSelect(pix); ok(S.path.length === 1 && S.trayAct && S.trayAct.kind === 'swap', 'mid-path, tapping a Swap face arms it (the path is kept)'); toggleSelect(nb); ok(S.trayAct && S.tray[nb].forcedFace, 'mid-path Swap cannot move a die already in the path'); cancelTrayAct(); S.path = []; delete S.tray[nb].forcedFace; }
    // Reroll (Oct 12): always a non-blank face, and usable mid-path on a die outside the path
    { const d = S.tray[3]; let nonBlank = true;
      for (let t = 0; t < 60; t++) { doTrayReroll(3, null, false); if (currentFace(d).type === 'blank') nonBlank = false; }
      ok(nonBlank, 'reroll never lands on a blank (60 tries)'); }
    { S.trayAct = null; S.path = []; const R = S.tray[pix]; delete R.spent; delete R.actUsed; delete R.forcedFace; R.die = clone(R.die); R.die.faces = R.die.faces.map(f => f); const ri = R.die.faces.findIndex(f => f.type === 'swap'); R.die.faces[ri] = { type: 'reroll' }; R.faceIdx = ri;
      const step = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].find(i => i !== pix && currentFace(S.tray[i]).type !== 'blank' && !S.tray[i].minion && !S.tray[i].spent);
      S.path = [step];
      const tgt2 = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].find(i => i !== pix && i !== step && !S.tray[i].minion && !S.tray[i].spent);
      toggleSelect(pix);
      ok(S.trayAct && S.trayAct.kind === 'reroll' && S.path.length === 1, 'mid-path, tapping a Reroll face arms it (the path is kept)');
      toggleSelect(step);
      ok(S.trayAct && S.path.length === 1, 'mid-path Reroll cannot target a die already in the path');
      toggleSelect(tgt2);
      ok(!S.trayAct && R.actUsed && getFaceForIdx(S.tray.indexOf(R)).type === 'pivot' && S.path.length === 1 && currentFace(S.tray[tgt2]).type !== 'blank', 'mid-path Reroll rerolled an outside die to a non-blank face and the Reroll die became a Pivot');
      S.path = []; }
    // render with the Swap armed for a screenshot
    toggleSelect(pix); render();
    return out;
  });
  console.log(r.join('\n'));
  const clearOverlays = () => page.evaluate(() => { document.querySelectorAll('.modal-overlay, #symbol-intro').forEach(n => n.remove()); [...document.querySelectorAll('body *')].filter(n => /A new room/.test(n.textContent) && n.children.length < 8 && getComputedStyle(n).position === 'fixed').forEach(n => n.remove()); });
  await page.waitForTimeout(400); await clearOverlays();
  await page.screenshot({ path: path.resolve(__dirname, '../../dist/test_trayact_armed.png') });
  await page.evaluate(() => { const pix = S.tray.findIndex(c => c.die.cat === 'origin'); toggleSelect(pix === 0 ? 5 : 0); render(); });
  await page.waitForTimeout(100); await clearOverlays();
  await page.screenshot({ path: path.resolve(__dirname, '../../dist/test_trayact_swapped.png') });
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})();
