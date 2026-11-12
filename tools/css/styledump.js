// Records the computed style of every element matching a selector on the 15 screens of the picture check (plus a fight
// with dice in odd states), so a CSS refactor can be proven to change nothing (Nov 12, polish roadmap A3).
// usage: node tools/css/styledump.js out.json '.die, .die *'      then compare two dumps with tools/css/stylediff.js
const fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const { SCREENS, INIT, HELP, URL_ } = require('../tests/test_screens.js');
const [outFile, SEL] = process.argv.slice(2);
const EXTRA = [
  ['dice-states', () => { __fight('pixie', 'arcanist'); render(); const t = S.tray;
    t[1].minion = true; t[2].spent = true; t[3].blank = true; render();
    const h = [...Array(16).keys()].filter(i => canSelect(i)); if (h.length) toggleSelect(h[0]); render(); }],
  ['skill-armed', () => { __fight('gnome', 'armsmaster'); render(); const b = document.querySelector('#ability-btn, .ability-btn, .skill-btn'); if (b) b.click(); }],
  ['playback', () => { __fight(); render(); const h = [...Array(16).keys()].filter(i => canSelect(i)); toggleSelect(h[0]);
    for (let k = 0; k < 2; k++) { const n = [...Array(16).keys()].find(i => canSelect(i) && !S.path.includes(i)); if (n == null) break; toggleSelect(n); }
    document.getElementById('resolve-btn').click(); }],
];
(async () => {
  const browser = await chromium.launch(); const sizes = []; fs.writeFileSync(outFile, '');
  for (const [name, setup] of [...SCREENS, ...EXTRA]) for (const w of [395, 360]) {
    const p = await browser.newPage({ viewport: { width: w, height: w === 395 ? 769 : 722 } });
    await p.addInitScript(INIT); await p.goto(URL_); await p.waitForTimeout(400);
    await p.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important}' });
    await p.evaluate(HELP); try { await p.evaluate(setup); } catch (e) { fs.appendFileSync(outFile, JSON.stringify([`${w}_${name}`, 'ERROR ' + e.message]) + '\n'); await p.close(); continue; }
    await p.waitForTimeout(name === 'playback' ? 120 : 300); await p.evaluate(() => { __clean(); return document.fonts.ready; });
    const key = `${w}_${name}`; const got = await p.evaluate((SEL) => {
      // each distinct computed style is stored once (as "prop:value" lines); elements point at it
      const rec = {}, table = [], seen = new Map(); const els = [...document.querySelectorAll(SEL)];
      els.forEach((el, k) => {
        const path = []; for (let n = el; n && n !== document.body; n = n.parentElement) path.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + ([...n.classList].filter(c => !/^(shaking|resolving)$/.test(c)).sort().map(c => '.' + c).join('')));
        for (const pseudo of [null, '::before', '::after']) {
          const cs = getComputedStyle(el, pseudo); if (pseudo && cs.content === 'none') continue;
          const parts = []; for (let i = 0; i < cs.length; i++) { const n = cs[i]; let v = cs.getPropertyValue(n); if (v.length > 300) { let h = 2166136261; for (let j = 0; j < v.length; j++) h = Math.imul(h ^ v.charCodeAt(j), 16777619); v = v.slice(0, 60) + `…[${v.length} chars #${(h >>> 0).toString(16)}]`; } parts.push(n + ':' + v); } // art data: URLs -> fingerprint
          const str = parts.join('\n'); let id = seen.get(str); if (id == null) { id = table.length; table.push(str); seen.set(str, id); }
          rec[k + ' ' + path.slice(-4).join('>') + (pseudo || '')] = id;
        }
      });
      return { rec, table };
    }, SEL);
    fs.appendFileSync(outFile, JSON.stringify([key, got]) + '\n'); sizes.push(`${key}:${Object.keys(got.rec).length}/${got.table.length}`); // one line per screen (a single JSON string got too long)
    await p.close();
  }
  console.log(sizes.join(' '));
  await browser.close();
})();
