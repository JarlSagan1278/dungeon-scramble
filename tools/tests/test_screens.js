// Screen pictures (Nov 12, polish roadmap A1): photographs the key screens at Jeremy's phone (395x769) and a small
// Android (360x722) with fixed randomness and frozen animations, then
//   1. FAILS if a screen is taller than the phone (the game card must never grow: the page may not scroll), and
//   2. FAILS if a screen looks different from its approved picture in tools/tests/screens/ (more than 0.3% of pixels).
// After an intended change, look at the new pictures in tools/tests/screens/_out/ and approve them:
//   node tools/tests/test_screens.js approve        (all)     node tools/tests/test_screens.js approve camp,title
// usage: node tools/tests/test_screens.js   (prints ok/FAIL lines)
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const URL_ = 'file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html');
const BASE = path.join(__dirname, 'screens'), OUT = path.join(BASE, '_out');
const APPROVE = process.argv[2] === 'approve', ONLY = APPROVE && process.argv[3] ? new Set(process.argv[3].split(',')) : null;
const SIZES = [[395, 769], [360, 722]];
const DIFF_FRAC = 0.003, CH_TOL = 40, Q = 0.85;

// Runs in the page before the game boots: fixed randomness and clock, no tutorial.
const INIT = () => {
  let a = 0x2f6b9c1; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const T0 = 1794500000000; Date.now = () => T0;
  try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {}
};
// In-page helpers shared by the screen setups (stringified into the page).
const HELP = `
  window.__fight = (origin, klass) => { META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 };
    newGame(origin || 'dwarf', klass || 'guard'); S.guide = null;
    for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
    S.transitioning = false; S.newRoomFx = false; S.needRoll = false; };
  window.__clean = () => { document.querySelectorAll('#room-callout,#room-callout-scrim,.toast,.tip-bubble').forEach(n => n.remove()); };
`;
const SCREENS = [
  ['title', () => { preGameScreen = 'title'; S = null; render(); }],
  ['setup', () => { META.lifetime.victories = 1; preGameScreen = 'setup'; S = null; render(); }],
  ['fight', () => { __fight(); render(); }],
  ['fight-path', () => { __fight(); render(); const h = [...Array(16).keys()].filter(i => canSelect(i)); toggleSelect(h[0]);
    for (let k = 0; k < 3; k++) { const n = [...Array(16).keys()].find(i => canSelect(i) && !S.path.includes(i)); if (n == null) break; toggleSelect(n); } render(); }],
  ['boss', () => { __fight('gnome', 'arcanist'); S.encounter = drawEncounter('boss'); render(); }],
  ['camp', () => { __fight(); S.screen = 'camp'; S.floorIdx = 0; S.routeStep = 4; S.campChoice = null; S.campRested = false; S.campFireOut = false; S.campUpgrades = {}; render(); }],
  ['shrine', () => { __fight(); const s = FLOORS[0].shrines[0]; const o = window.drawRoomCard; window.drawRoomCard = () => s; S.encounter = drawEncounter('enc'); window.drawRoomCard = o;
    S.screen = 'shrine'; S.shrineResult = null; render(); try { placeShrineFloat(); } catch (e) {} }],
  ['loot', () => { __fight(); S.encounter.curHealth = 0; onEncounterDefeated(); render(); }],
  ['equip', () => { __fight(); S.encounter.curHealth = 0; onEncounterDefeated(); chooseLoot(S.lootChoice.options[0]); }],
  ['defeat-keep', () => { __fight(); S.stats.killedBy = S.encounter.name; S.health = 0; S.screen = 'gameover'; S.carryoverOptions = highestTierTrayGroups(); S.carryoverChosenName = null; render(); }],
  ['defeat', () => { __fight(); S.stats.killedBy = S.encounter.name; S.health = 0; S.screen = 'gameover'; S.carryoverOptions = null; render(); }],
  ['victory', () => { __fight(); S.screen = 'victory'; render(); }],
  ['settings', () => { __fight(); render(); openSettingsModal(); }],
  ['codex', () => { META.lifetime.victories = 1; preGameScreen = 'title'; S = null; render(); openCodexModal(); }],
  ['records', () => { preGameScreen = 'title'; S = null; render(); openRecordsModal(); }],
];

module.exports = { SCREENS, INIT, HELP, URL_ }; // tools/css/styledump.js reuses the screen setups
if (!process.env.DS_STYLEDUMP) (async () => { // styledump.js sets DS_STYLEDUMP to borrow SCREENS without running the check (check.js require()s this file, so require.main can't be used)
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(); const out = []; let shown = 0;
  const cmp = await browser.newPage(); // a blank page that encodes/decodes/compares pictures
  for (const [w, h] of SIZES) for (const [name, setup] of SCREENS) {
    if (ONLY && !ONLY.has(name)) continue;
    const key = `${w}_${name}`, errors = [];
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(INIT); await p.goto(URL_); await p.waitForTimeout(400);
    await p.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important;caret-color:transparent!important}' });
    await p.evaluate(HELP);
    try { await p.evaluate(setup); } catch (e) { errors.push(e.message); }
    await p.waitForTimeout(250); await p.evaluate(() => { __clean(); return document.fonts.ready; });
    await p.waitForTimeout(150); await p.evaluate(() => __clean());
    const tall = await p.evaluate(() => ({ doc: document.documentElement.scrollHeight, body: document.body.scrollHeight, vh: innerHeight }));
    const png = (await p.screenshot()).toString('base64');
    await p.close();
    // encode both sides the same way (lossy WebP is deterministic), then count pixels that differ by more than CH_TOL
    const basePath = path.join(BASE, key + '.webp'), hasBase = fs.existsSync(basePath);
    const res = await cmp.evaluate(async ({ png, base, Q, CH_TOL }) => {
      const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
      const draw = (img, W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0); return c; };
      const cur0 = await load('data:image/png;base64,' + png), W = cur0.width, H = cur0.height;
      const webp = draw(cur0, W, H).toDataURL('image/webp', Q);
      if (!base) return { webp };
      const a = draw(await load(webp), W, H), bi = await load('data:image/webp;base64,' + base);
      if (bi.width !== W || bi.height !== H) return { webp, frac: 1, note: `size ${bi.width}x${bi.height} -> ${W}x${H}` };
      const b = draw(bi, W, H), da = a.getContext('2d').getImageData(0, 0, W, H).data, db = b.getContext('2d').getImageData(0, 0, W, H).data;
      const dc = document.createElement('canvas'); dc.width = W; dc.height = H; const dx = dc.getContext('2d'), dimg = dx.createImageData(W, H);
      let n = 0;
      for (let i = 0; i < da.length; i += 4) {
        const off = Math.abs(da[i] - db[i]) > CH_TOL || Math.abs(da[i + 1] - db[i + 1]) > CH_TOL || Math.abs(da[i + 2] - db[i + 2]) > CH_TOL;
        if (off) n++;
        const g = (da[i] + da[i + 1] + da[i + 2]) / 9; dimg.data[i] = off ? 255 : g; dimg.data[i + 1] = off ? 0 : g; dimg.data[i + 2] = off ? 60 : g; dimg.data[i + 3] = 255;
      }
      dx.putImageData(dimg, 0, 0);
      return { webp, frac: n / (W * H), diff: n ? dc.toDataURL('image/png') : null };
    }, { png, base: hasBase ? fs.readFileSync(basePath).toString('base64') : null, Q, CH_TOL });
    const webpBuf = Buffer.from(res.webp.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT, key + '.webp'), webpBuf);
    if (res.diff) fs.writeFileSync(path.join(OUT, key + '_diff.png'), Buffer.from(res.diff.split(',')[1], 'base64'));
    if (APPROVE) fs.writeFileSync(basePath, webpBuf);
    const fits = tall.doc <= tall.vh + 1 && tall.body <= tall.vh + 1;
    const same = APPROVE || !hasBase || res.frac <= DIFF_FRAC;
    const notes = [];
    if (!fits) notes.push(`${Math.max(tall.doc, tall.body) - tall.vh}px taller than the phone`);
    if (!same) notes.push(`looks different (${(res.frac * 100).toFixed(1)}% of pixels${res.note ? ', ' + res.note : ''}): see tools/tests/screens/_out/${key}_diff.png, approve with: node tools/tests/test_screens.js approve ${name}`);
    if (!hasBase && !APPROVE) notes.push('no approved picture yet');
    if (errors.length) notes.push('page error: ' + errors[0]);
    out.push((fits && same && !errors.length ? 'ok   ' : 'FAIL ') + `${key}${APPROVE ? ' (approved)' : ''}${notes.length ? ': ' + notes.join('; ') : ''}`);
    shown++;
  }
  out.forEach(l => console.log(l));
  if (!shown) console.log('FAIL no screen matched');
  await browser.close();
})();
