// Checks the fast path-tap update (renderPathOnly, Oct 12) against a full render(): after every tap, the parts a
// path step changes must look exactly as a full render would draw them.
// usage: node tools/test_pathrender.js   (several random fights; prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 395, height: 769 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
  await page.goto('file://' + path.resolve(__dirname, '../dist/dungeon_scramble.html'));
  const out = await page.evaluate(async () => {
    const res = [];
    const snap = () => {
      const q = s => document.querySelector(s);
      const strip = h => (h || '').replace(/-?\d+(\.\d+)?ms/g, 'ms').replace(/ data-from="[^"]*"/g, '').replace(/class="([^"]*)"/g, (m, c) => 'class="' + c.trim().split(/\s+/).sort().join(' ') + '"').replace(/\s+/g, ' ');
      const cls = n => n ? [...n.classList].sort().join(' ') : null;
      return JSON.stringify({
        tray: [...document.querySelectorAll('#tray > *')].map(n => cls(n) + '|' + strip(n.innerHTML)),
        coins: strip(q('#path-strip') && q('#path-strip').innerHTML),
        counter: strip([...document.querySelectorAll('.tray-float-wrap .path-counter-float')].map(n => n.outerHTML).join('')),
        go: cls(q('#resolve-btn')),
        lock: cls(q('.chest-lock')),
        ebar: strip(q('#enc-panel .fo-enemy .fo-hpwrap') && q('#enc-panel .fo-enemy .fo-hpwrap').outerHTML),
      });
    };
    META.lifetime.victories = 1;
    for (const [o, k] of [['halfling','guard'], ['pixie','arcanist'], ['dwarf','armsmaster'], ['gnome','dungeoneer']]) {
      newGame(o, k);
      for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter && S.encounter.type !== 'Shrine'); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
      S.transitioning = false; try { skipTransition(); } catch (e) {} S.newRoomFx = false; render();
      document.querySelectorAll('.modal-overlay,#symbol-intro,#room-callout,#room-callout-scrim').forEach(n => n.remove());
      let taps = 0, bad = 0;
      for (let t = 0; t < 12; t++) {
        const legal = [...Array(16).keys()].filter(i => canSelect(i) && !S.path.includes(i) && !trayActFaceAt(i));
        if (t % 4 === 3 && S.path.length) toggleSelect(S.path[S.path.length - 1]); // undo a step now and then
        else if (legal.length) toggleSelect(legal[Math.floor(Math.random() * legal.length)]);
        else { clearPathAll(); render(); continue; }
        const fast = snap(); render(); const full = snap(); taps++;
        if (fast !== full) { bad++; if (bad === 1) { const a = JSON.parse(fast), b = JSON.parse(full); Object.keys(a).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).forEach(k => res.push('  ' + k + '\n    fast: ' + String(a[k]).slice(0, 300) + '\n    full: ' + String(b[k]).slice(0, 300))); } }
      }
      res.push((bad ? 'FAIL ' : 'ok   ') + `${o}/${k}: ${taps} taps, ${bad} mismatches`);
      // Go must work after path taps alone (Oct 12 bug: its click handler kept the empty-path state from the last full render)
      clearPathAll(); render();
      for (let t = 0; t < 3; t++) { const l = [...Array(16).keys()].filter(i => canSelect(i) && !S.path.includes(i) && !trayActFaceAt(i)); if (l.length) toggleSelect(l[0]); }
      if (S.path.length) { document.getElementById('resolve-btn').click(); res.push((S.transitioning ? 'ok   ' : 'FAIL ') + `${o}/${k}: Go after ${S.path.length} path taps ${S.transitioning ? 'starts the turn' : 'did nothing'}`); try { skipTransition(); } catch (e) {} S.transitioning = false; }
      clearPathAll();
    }
    return res;
  });
  console.log(out.join('\n'));
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})();
