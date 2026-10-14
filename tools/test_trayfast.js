// Checks the fast redraw for Swap / Reroll / class-Skill taps (renderTrayFast, Oct 14) against a full render():
// after each tap, what the tap changes must look the same as a full redraw draws it (one-shot flourish classes aside),
// and the taps must still do their job (swap swaps, reroll rerolls, Skill converts without adding the die to the path).
// usage: node tools/test_trayfast.js   (prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 395, height: 769 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
  await page.goto('file://' + path.resolve(__dirname, '../dist/dungeon_scramble.html'));
  const out = await page.evaluate(() => {
    const res = [];
    const strip = h => (h || '').replace(/-?\d+(\.\d+)?ms/g, 'ms').replace(/ data-from="[^"]*"/g, '')
      .replace(/class="([^"]*)"/g, (m, c) => 'class="' + c.trim().split(/\s+/).filter(x => !/^just-|convert|pop-in/.test(x)).sort().join(' ') + '"').replace(/\s+/g, ' ');
    const cls = n => n ? [...n.classList].filter(x => !/^just-|convert|pop-in/.test(x)).sort().join(' ') : null;
    const q = s => document.querySelector(s);
    const snap = () => JSON.stringify({
      trayCls: cls(q('#tray')),
      tray: [...document.querySelectorAll('#tray > *')].map(n => cls(n) + '|' + strip(n.innerHTML)),
      coins: strip(q('#path-strip') && q('#path-strip').innerHTML),
      counter: strip([...document.querySelectorAll('.tray-float-wrap .path-counter-float')].map(n => n.outerHTML).join('')),
      go: cls(q('#resolve-btn')), lock: cls(q('.chest-lock')),
      ability: q('#ability-btn') ? cls(q('#ability-btn')) + '|' + q('#ability-btn').textContent : null,
      ebar: strip(q('#enc-panel .fo-enemy .fo-hpwrap') && q('#enc-panel .fo-enemy .fo-hpwrap').outerHTML),
    });
    const check = (label) => { const fast = snap(); render(); const full = snap();
      if (fast === full) return true;
      const a = JSON.parse(fast), b = JSON.parse(full);
      if (JSON.stringify(a.tray) !== JSON.stringify(b.tray)) a.tray.forEach((x, i) => { if (x !== b.tray[i]) { let j = 0; while (x[j] === b.tray[i][j]) j++; res.push('  die ' + i + ' at ' + j + ':\n   fast: ' + x.slice(Math.max(0, j - 80), j + 120) + '\n   full: ' + b.tray[i].slice(Math.max(0, j - 80), j + 120)); } });
      res.push('FAIL ' + label + ' differs: ' + Object.keys(a).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map(k => k + '\n   fast: ' + String(a[k]).slice(0, 240) + '\n   full: ' + String(b[k]).slice(0, 240)).join('\n'));
      return false; };
    const tapDie = i => document.querySelector(`#tray .die[data-idx="${i}"]`).click();
    META.lifetime.victories = 1; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 };
    for (const [o, k] of [['dwarf', 'armsmaster'], ['halfling', 'guard'], ['pixie', 'arcanist']]) {
      newGame(o, k);
      for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter && S.encounter.type !== 'Shrine'); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
      S.transitioning = false; try { skipTransition(); } catch (e) {} S.newRoomFx = false;
      S.tray.forEach(c => { c.minion = false; c.blank = false; c.coveredDie = null; });
      render(); document.querySelectorAll('.modal-overlay,#symbol-intro,#room-callout,#room-callout-scrim').forEach(n => n.remove());
      let okAll = true;
      // ---- Skill (classes that convert) ----
      if (S.klass.convertTo) {
        const z = [...Array(16).keys()].find(i => inZone(i));
        document.getElementById('ability-btn').click(); okAll = check(k + ' Skill armed') && okAll;
        document.getElementById('ability-btn').click(); okAll = check(k + ' Skill backed out') && okAll;
        okAll = okAll && !abilityArmed;
        document.getElementById('ability-btn').click(); tapDie(z);
        const conv = S.classAbilityUsed && S.tray[z].forcedFace && S.tray[z].forcedFace.type === S.klass.convertTo.type && !S.path.includes(z);
        if (!conv) res.push('FAIL ' + k + ' Skill did not convert cleanly'); okAll = conv && check(k + ' Skill used') && okAll;
      }
      // ---- Swap and Reroll (a test die whose faces are all Swap / Reroll) ----
      for (const kind of ['Swap', 'Reroll']) {
        clearPathAll(); render(); document.querySelectorAll('#room-callout,#room-callout-scrim').forEach(n => n.remove());
        const src = [...Array(16).keys()].find(i => !inZone(i) && !S.tray[i].forcedFace);
        S.tray[src].die = { name: 'Test ' + kind, cat: 'loot', faces: faces([kind, kind, kind, kind, kind, kind]) }; S.tray[src].faceIdx = 0;
        delete S.tray[src].actUsed; delete S.tray[src].spent; render();
        const tgt = [...Array(16).keys()].find(i => i !== src && !S.tray[i].forcedFace && !S.tray[i].minion);
        const before = S.tray[tgt].die.name, beforeFace = S.tray[tgt].faceIdx;
        tapDie(src); okAll = check(k + ' ' + kind + ' armed') && okAll;
        tapDie(tgt);
        const did = kind === 'Swap' ? S.tray[src].die.name === before : true;
        if (!did) res.push('FAIL ' + k + ' Swap did not swap');
        okAll = did && check(k + ' ' + kind + ' done') && okAll;
      }
      res.push((okAll ? 'ok   ' : 'FAIL ') + k + ': Skill, Swap and Reroll taps match a full redraw');
    }
    return res;
  });
  console.log(out.join('\n'));
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})();
