// One command for every automated check (Oct 17, Jeremy: "cut testing redundancies").
// Opens ONE browser and runs each test script through it (each gets its own fresh tab context),
// instead of every script launching Chromium and loading the 3.5 MB game separately.
// usage: node tools/check.js            (all checks; build first with `node build.js`)
//        node tools/check.js quick      (sim + the fast UI checks, for small changes)
// Prints one line per check and exits 1 if any failed. bugsearch.js (long) stays separate.
const path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const ROOT = path.resolve(__dirname, '..');
const ALL = [
  ['sim',        'sim.js'],                       // random-legal bot, 5 origin/class combos: JS errors only
  ['classes',    'tools/test_bughunt_14154.js'],  // class passives, wraps, relic interactions, Boost tokens, save/load
  ['wrap',       'tools/test_wrap.js'],           // Dungeoneer seam moves
  ['ui',         'tools/test_bughunt_14154_ui.js'],             // camp flow, shrine screen, quest paper, music, portrait, uploads
  ['pathrender', 'tools/test_pathrender.js'],     // fast path redraw == full redraw
  ['trayfast',   'tools/test_trayfast.js'],       // fast tray redraw == full redraw
  ['trayact',    'tools/test_trayact.js'],        // Swap / Reroll
  ['shrines',    'tools/test_shrines.js'],        // every shrine option
  ['scramble',   'tools/test_scramble.js'],       // Scramble flick gate + Depth presets
  ['unlock',     'tools/test_unlock.js'],         // store app: Floor 1 unlock gate (needs node build.js --app)
];
const QUICK = new Set(['sim', 'pathrender', 'trayfast', 'ui', 'scramble']);

(async () => {
  const which = process.argv[2] === 'quick' ? ALL.filter(([k]) => QUICK.has(k)) : ALL;
  const real = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  // Every script calls chromium.launch() and browser.close(); hand each its own wrapper around the shared browser.
  // A test is finished when IT closes its browser (sim.js also calls process.exit, which is made a no-op here).
  let current = null; // {resolve} of the running test, captured when that test launches
  const launch = async () => {
    const mine = current; const ctxs = [];
    return {
      newPage: async (opts) => { const ctx = await real.newContext(opts || {}); ctxs.push(ctx); return ctx.newPage(); },
      newContext: async (opts) => { const ctx = await real.newContext(opts || {}); ctxs.push(ctx); return ctx; },
      close: async () => { for (const c of ctxs) { try { await c.close(); } catch (e) {} } if (mine) mine.resolve(); },
    };
  };
  pw.chromium.launch = launch;
  try { const alt = require('/opt/node22/lib/node_modules/playwright'); if (alt !== pw) alt.chromium.launch = launch; } catch (e) {}
  const realExit = process.exit; process.exit = () => {};
  process.on('unhandledRejection', e => console.log('CRASH ' + String(e && e.message || e).split('\n')[0]));

  const results = []; const t0 = Date.now();
  for (const [key, file] of which) {
    const lines = []; const log = console.log;
    console.log = (...a) => lines.push(a.join(' '));
    const done = new Promise(res => { current = { resolve: res }; });
    const t = Date.now();
    try { delete require.cache[require.resolve(path.join(ROOT, file))]; require(path.join(ROOT, file)); await done; }
    catch (e) { lines.push('CRASH ' + e.message); }
    await new Promise(r => setTimeout(r, 200)); // let the script's last lines print
    console.log = log;
    const text = lines.join('\n');
    const failed = /\bFAIL\b|CRASH|PAGE ERRORS|threw errors/.test(text);
    const oks = (text.match(/^ok\b/gm) || []).length + (text.match(/^PASS\b/gm) || []).length;
    results.push({ key, failed, secs: ((Date.now() - t) / 1000).toFixed(1) });
    log(`${failed ? 'FAIL' : 'ok  '}  ${key.padEnd(11)} ${String(oks).padStart(3)} passed  ${results[results.length - 1].secs}s`);
    if (failed) log(text.split('\n').filter(l => /FAIL|CRASH|error|ERRORS/i.test(l)).slice(0, 12).map(l => '      ' + l).join('\n'));
  }
  await real.close();
  const bad = results.filter(r => r.failed).length;
  console.log(`\n${bad ? bad + ' check(s) failed' : 'All checks passed'} in ${((Date.now() - t0) / 1000).toFixed(0)}s.`);
  realExit(bad ? 1 : 0);
})();
