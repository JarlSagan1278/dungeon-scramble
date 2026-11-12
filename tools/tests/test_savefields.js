// Save fields (Nov 12, polish roadmap A2): every field of S must be listed as RUN (saved) or SCREEN (never saved) in
// logic.js (RUN_FIELDS / SCREEN_FIELDS). Checks: 1. every `S.x = ...` in src/ is listed; 2. bot runs never give S an
// unlisted field; 3. save -> load -> save gives the same save (camp, fight, loot chest), with no SCREEN field in it.
// usage: node tools/tests/test_savefields.js   (prints ok/FAIL lines)
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(__dirname, '../..');
const simSrc = fs.readFileSync(path.join(ROOT, 'tools/sim.js'), 'utf8');
const a0 = simSrc.indexOf('const TICK_FN = ') + 'const TICK_FN = '.length, tickSrc = simSrc.slice(a0, simSrc.indexOf('\n};\n', a0) + 2);
(async () => {
  const out = [];
  // 1. static: fields assigned anywhere in the source
  const logic = fs.readFileSync(path.join(ROOT, 'src/logic.js'), 'utf8');
  const list = name => { const m = logic.match(new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\];')); return new Set((m[1].replace(/\/\/.*$/gm, '').match(/'([^']+)'/g) || []).map(x => x.slice(1, -1))); };
  const RUN = list('RUN_FIELDS'), SCREEN = list('SCREEN_FIELDS');
  const both = [...RUN].filter(k => SCREEN.has(k));
  out.push((both.length ? 'FAIL ' : 'ok   ') + `no field is in both lists${both.length ? ': ' + both.join(', ') : ''}`);
  const assigned = new Set();
  for (const f of ['data', 'logic', 'depth', 'render', 'music', 'main']) {
    const src = fs.readFileSync(path.join(ROOT, 'src', f + '.js'), 'utf8');
    for (const m of src.matchAll(/\bS\.([A-Za-z_$][\w$]*)\s*(?:=(?!=)|\+\+|--|[-+|?&]{1,2}=)/g)) assigned.add(m[1]);
  }
  const unlisted = [...assigned].filter(k => !RUN.has(k) && !SCREEN.has(k));
  out.push((unlisted.length ? 'FAIL ' : 'ok   ') + `every S field the source assigns is listed as RUN or SCREEN (${assigned.size} fields)${unlisted.length ? ': add ' + unlisted.join(', ') + ' to RUN_FIELDS or SCREEN_FIELDS in logic.js' : ''}`);
  // 2 + 3 in the page
  const browser = await chromium.launch(); const errors = [];
  const p = await browser.newPage({ viewport: { width: 395, height: 769 } }); p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
  await p.goto('file://' + path.join(ROOT, 'dist/dungeon_scramble.html')); await p.waitForTimeout(400);
  await p.evaluate(`window.__TICK = ${tickSrc}`);
  const seen = new Set();
  for (const [o, k] of [['dwarf', 'debug'], ['pixie', 'arcanist'], ['halfling', 'dungeoneer']]) {
    await p.evaluate(([o, k]) => { META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 }; META.achievements['origin_duo'] = { date: Date.now() }; newGame(o, k); S.guide = null; }, [o, k]);
    for (let t = 0; t < 400; t++) {
      const r = await p.evaluate(() => { let res; try { res = __TICK(); } catch (e) { res = { done: true }; } return { done: res && res.done, u: unclassifiedStateFields(S) }; });
      r.u.forEach(x => seen.add(x)); if (r.done) break;
    }
  }
  out.push((seen.size ? 'FAIL ' : 'ok   ') + `bot runs give S no unlisted field${seen.size ? ': ' + [...seen].join(', ') : ''}`);
  const rt = await p.evaluate(() => {
    const res = [];
    const roundtrip = (label) => {
      saveGame(); const a = localStorage.getItem(SAVE_KEY); const parsed = JSON.parse(a);
      const screenIn = Object.keys(parsed).filter(k => SCREEN_FIELD_SET.has(k));
      const keepS = S; loadGame(); saveGame(); const b = localStorage.getItem(SAVE_KEY); S = keepS;
      res.push({ label, same: a === b, screenIn, size: a.length });
    };
    META.lifetime.victories = 3; newGame('gnome', 'guard'); S.guide = null; roundtrip('camp');
    for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
    S.transitioning = false; S.needRoll = false; S._roll = { t: performance.now() }; S.resolveTotal = 9; S.justScrambled = true; roundtrip('fight');
    S.encounter.curHealth = 0; onEncounterDefeated(); roundtrip('loot chest');
    return res;
  });
  rt.forEach(r => out.push((r.same && !r.screenIn.length ? 'ok   ' : 'FAIL ') + `${r.label}: save -> load -> save is unchanged and holds no screen state (${Math.round(r.size / 1024)} KB${r.screenIn.length ? '; screen fields saved: ' + r.screenIn.join(', ') : ''}${r.same ? '' : '; the second save differs'})`));
  out.forEach(l => console.log(l));
  if (errors.length) console.log('FAIL page errors: ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
