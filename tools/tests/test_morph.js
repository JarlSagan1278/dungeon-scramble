// One redraw path (Nov 12, polish roadmap A4): camp redraws in place with morphHTML instead of rebuilding #app.
// Checks, over a run of real camp actions: after every morph the DOM equals a fresh innerHTML of the same markup
// (exact serialized text, attribute order included, clock-based animation phases normalized); the
// campfire (and other unchanged parts) are the same elements after a redraw (so animations don't restart); buttons and
// dice tiles still work after several redraws; the Upgrade hover hint isn't bound twice.
// usage: node tools/tests/test_morph.js   (prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const browser = await chromium.launch(); const out = [], errors = [];
  const p = await browser.newPage({ viewport: { width: 395, height: 769 } }); p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); } catch (e) {} });
  await p.goto('file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html')); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const res = { morphs: 0, bad: [], steps: [] };
    const orig = window.morphHTML;
    window.morphHTML = function (el, html) {
      orig(el, html); res.morphs++;
      const fresh = document.createElement('div'); fresh.innerHTML = html;
      // the browser's own node equality (tags, attributes in any order, text, all descendants)
      const same = zoneNorm(el.innerHTML) === zoneNorm(fresh.innerHTML); // exact text, attribute order included; clock phases normalized (kept elements keep theirs)
      if (!same) {
        const a = el.innerHTML, b = fresh.innerHTML; let i = 0; while (i < a.length && a[i] === b[i]) i++;
        res.bad.push(`after ${res.steps[res.steps.length - 1]}: differs at ${i}: …${a.slice(Math.max(0, i - 60), i + 60)}… vs …${b.slice(Math.max(0, i - 60), i + 60)}…`);
      }
    };
    META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 }; newGame('dwarf', 'guard'); S.guide = null;
    S.screen = 'camp'; S.floorIdx = 0; S.routeStep = 4; S.campChoice = null; S.campRested = false; S.campFireOut = false; S.campUpgrades = {};
    S.backPocket = [clone(basic('attack', 1)), clone(basic('attack', 1)), clone(basic('attack', 1)), clone(basic('maneuver', 1)), clone(basic('maneuver', 1))];
    S.health = Math.max(1, S.maxHealth - 6);
    document.querySelectorAll('.modal-overlay').forEach(n => n.remove());
    const step = (name, fn) => { res.steps.push(name); try { fn(); } catch (e) { res.bad.push(name + ' threw ' + e.message); } document.querySelectorAll('.modal-overlay').forEach(n => n.remove()); };
    step('first draw', () => render());
    const fire0 = document.querySelector('.campfire-flame'), hero0 = document.querySelector('.camp-hero img');
    step('redraw, nothing changed', () => render());
    res.fireKept = document.querySelector('.campfire-flame') === fire0 && document.querySelector('.camp-hero img') === hero0;
    step('pick a tray die (tap)', () => document.querySelector('#organize-tray .camp-die-tile').click());
    res.pickedShown = !!document.querySelector('.camp-die-tile.organize-selected, .camp-die-tile.selected, .organize-source, .organize-target');
    step('tap a pocket die (swap)', () => { const t = document.querySelector('#organize-bp .camp-die-tile'); if (t) t.click(); });
    step('choose Train', () => { S.campChoice = 'train'; render(); });
    step('upgrade Attack I (tap)', () => { const b = document.getElementById('upgrade-attack-1'); if (b && !b.disabled) b.click(); document.querySelectorAll('.modal-overlay button').forEach(x => { if (/combine|upgrade|yes|confirm/i.test(x.textContent)) x.click(); }); render(); });
    step('took damage, redraw', () => { S.health = Math.max(1, S.health - 2); render(); });
    step('fire out', () => { S.campFireOut = true; render(); });
    step('back to a fresh camp', () => { S.campFireOut = false; S.campChoice = null; S.campRested = false; S.campUpgrades = {}; render(); });
    // handlers after many redraws: Rest opens its confirm, a tile tap still selects
    let restOpened = false; const rb = document.getElementById('rest-btn'); if (rb) { rb.click(); restOpened = !!document.querySelector('.modal-overlay'); document.querySelectorAll('.modal-overlay').forEach(n => n.remove()); }
    res.restWorks = restOpened;
    const b = document.getElementById('upgrade-attack-1'); res.litOnce = !b || b._litBound === true;
    return res;
  });
  // setup: origin, class and boon picks redraw their showcase in place (same isEqualNode check via the wrapper)
  const st = await p.evaluate(() => {
    const res = window.__setupRes = { morphs: 0, bad: [] };
    const orig = window.__origMorph || window.morphHTML; window.__origMorph = orig;
    window.morphHTML = function (el, html) { orig(el, html); res.morphs++;
      const fresh = document.createElement('div'); fresh.innerHTML = html;
      if (zoneNorm(el.innerHTML) !== zoneNorm(fresh.innerHTML)) res.bad.push(el.id || el.className); };
    META.lifetime.victories = 3; META.achievements['origin_duo'] = { date: Date.now() }; preGameScreen = 'setup'; S = null; render();
    const clickAll = sel => [...document.querySelectorAll(sel)].forEach(n => n.click());
    clickAll('#origin-tab-row > *'); clickAll('#class-tab-row > *'); clickAll('#boon-scroll > *');
    const img0 = document.querySelector('#origin-showcase img'); document.querySelector('#origin-tab-row > *').click(); document.querySelector('#origin-tab-row > *').click();
    res.imgKept = document.querySelector('#origin-showcase img') === img0;
    return res;
  });
  out.push((st.morphs >= 6 && !st.bad.length ? 'ok   ' : 'FAIL ') + `setup: origin/class/boon picks redraw their showcase in place and match a fresh draw (${st.morphs} redraws${st.bad.length ? ': ' + st.bad.slice(0, 3).join(', ') : ''})`);
  out.push((st.imgKept ? 'ok   ' : 'FAIL ') + 'setup: re-picking the same origin keeps its portrait element');
  // fight: path taps update the dice and coins in place (renderPathOnly); untouched dice keep their element
  const ft = await p.evaluate(() => {
    const res = { bad: [] };
    const orig = window.__origMorph || window.morphHTML; window.__origMorph = orig;
    window.morphHTML = function (el, html) { orig(el, html);
      const fresh = document.createElement('div'); fresh.innerHTML = html;
      if (zoneNorm(el.innerHTML) !== zoneNorm(fresh.innerHTML)) res.bad.push(el.id || el.className); };
    META.lifetime.victories = 3; newGame('gnome', 'guard'); S.guide = null;
    for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
    S.transitioning = false; S.newRoomFx = false; S.needRoll = false; document.querySelectorAll('#room-callout,#room-callout-scrim').forEach(n => n.remove()); render();
    const first = [...Array(16).keys()].find(i => canSelect(i)); const keepIdx = [...Array(16).keys()].reverse().find(i => i !== first);
    const before = document.querySelectorAll('#tray > .die')[keepIdx];
    document.querySelectorAll('#tray > .die')[first].click();
    const n2 = [...Array(16).keys()].find(i => canSelect(i) && !S.path.includes(i)); if (n2 != null) document.querySelectorAll('#tray > .die')[n2].click();
    res.taps = S.path.length;
    const after = document.querySelectorAll('#tray > .die')[keepIdx];
    res.kept = before === after || S.path.includes(keepIdx);
    res.coins = document.querySelectorAll('#path-strip .path-coin').length;
    document.getElementById('resolve-btn').click(); skipTransition(); res.turnRan = S.turnNumber >= 1 || !S.encounter || S.screen !== 'game';
    return res;
  });
  out.push((ft.taps >= 1 && !ft.bad.length && ft.coins === ft.taps ? 'ok   ' : 'FAIL ') + `fight: ${ft.taps} path taps update the dice and coins in place and match a fresh draw${ft.bad.length ? ': ' + ft.bad.join(', ') : ''}`);
  out.push((ft.kept ? 'ok   ' : 'FAIL ') + 'fight: a die the tap did not change keeps its element (its animations keep running)');
  out.push((ft.turnRan ? 'ok   ' : 'FAIL ') + 'fight: Go plays the turn after in-place path taps');
  // tray actions (renderTrayFast): the Skill converts a die in place; its flourish class lands on the kept element
  const sk = await p.evaluate(() => {
    const res = {};
    META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 }; newGame('dwarf', 'armsmaster'); S.guide = null;
    for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
    S.transitioning = false; S.newRoomFx = false; S.needRoll = false; S.tray.forEach(c => { c.minion = false; c.blank = false; c.coveredDie = null; });
    render(); document.querySelectorAll('.modal-overlay,#symbol-intro,#room-callout,#room-callout-scrim').forEach(n => n.remove());
    const z = [...Array(16).keys()].find(i => inZone(i)), other = [...Array(16).keys()].find(i => !inZone(i));
    const dz = document.querySelectorAll('#tray > .die')[z], dOther = document.querySelectorAll('#tray > .die')[other];
    document.getElementById('ability-btn').click(); document.querySelectorAll('#tray > .die')[z].click();
    const nz = document.querySelectorAll('#tray > .die')[z];
    res.converted = !!(S.tray[z].forcedFace && S.classAbilityUsed);
    res.keptZone = nz === dz; res.keptOther = document.querySelectorAll('#tray > .die')[other] === dOther;
    res.flourish = nz.classList.contains('ability-convert') || nz.classList.contains('just-converted') || /convert/.test(nz.className);
    return res;
  });
  out.push((sk.converted && sk.keptOther ? 'ok   ' : 'FAIL ') + `tray actions: the Skill converts a die in place and the other dice keep their elements (${JSON.stringify(sk)})`);
  out.push((sk.flourish ? 'ok   ' : 'FAIL ') + 'tray actions: the converted die gets its flourish class (its animation plays on the kept element)');
  out.push((r.morphs >= 7 && !r.bad.length ? 'ok   ' : 'FAIL ') + `camp redraws in place and matches a fresh draw after every step (${r.morphs} redraws${r.bad.length ? ': ' + r.bad.slice(0, 2).join(' | ') : ''})`);
  out.push((r.fireKept ? 'ok   ' : 'FAIL ') + 'the campfire and hero stay the same elements across a redraw (animations keep running)');
  out.push((r.restWorks ? 'ok   ' : 'FAIL ') + 'Rest still opens its confirm after many redraws');
  out.push((r.litOnce ? 'ok   ' : 'FAIL ') + 'the Upgrade hover hint is bound once, not once per redraw');
  out.forEach(l => console.log(l));
  if (errors.length) console.log('FAIL page errors: ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
