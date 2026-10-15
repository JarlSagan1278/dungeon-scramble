// Prints docs/DungeonScramble_Rulebook.pdf from tools/rulebook.html (made by `node tools/gen.js`) with tools/print.css.
// usage: node tools/gen.js && node tools/print_rulebook.js   (30 pages as of 1.41.45)
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.continue().catch(() => r.abort()));
  await p.goto('file://' + path.resolve(__dirname, 'rulebook.html'), { waitUntil: 'load' });
  await p.addStyleTag({ content: fs.readFileSync(path.resolve(__dirname, 'print.css'), 'utf8') });
  await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(1500);
  await p.pdf({ path: path.resolve(__dirname, '../docs/DungeonScramble_Rulebook.pdf'), format: 'Letter', printBackground: true,
    margin: { top: '0.45in', bottom: '0.45in', left: '0.4in', right: '0.4in' } });
  console.log('pdf ok', errs); await b.close();
})();
