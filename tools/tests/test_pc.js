// PC layout (Nov 13; opt-in with ?pc=1 / localStorage dungeonScramblePC): the split fight screen, the hover panel and
// the key letters. Checks at 1920x1080 and 1280x800 (Steam Deck): the mode turns on only when asked for and only on a wide
// window; nothing scrolls; room left of tray, both inside the window; the path line's points sit on their dice;
// hovering a die explains it (a Minion's die stays secret); keys pick dice; a turn plays; the phone is untouched.
// Cursor (mockup H): a keyboard-only run from the title into a fight, and a simulated controller (window.__pcPads).
// usage: node tools/tests/test_pc.js   (prints ok/FAIL lines)
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const URL_ = 'file://' + path.resolve(__dirname, '../../dist/dungeon_scramble.html');
const FIGHT = () => { META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 }; newGame('dwarf', 'guard'); S.guide = null;
  for (let g = 0; g < 10 && !(S.screen === 'game' && S.encounter); g++) { if (S.screen === 'camp') campLeave(); else advanceRoute(); }
  S.transitioning = false; S.newRoomFx = false; S.needRoll = false;
  const set = (i) => { const c = S.tray[i], f = { type: 'hit', value: 1 }; c.die = { name: 'T' + i, cat: 'attack', level: 1, faces: [f, f, f, f, f, f] }; c.faceIdx = 0; c.minion = false; c.coveredDie = null; c.blank = false; c.spent = false; c.forcedFace = null; }; for (let i = 0; i < 16; i++) set(i); // a fixed tray of Hit 1: every neighbour is a legal step
  S.encounter.maxHealth = S.encounter.curHealth = 80; render(); document.querySelectorAll('#room-callout,#room-callout-scrim,.modal-overlay').forEach(n => n.remove()); };
(async () => {
  const browser = await chromium.launch(); const out = [], errors = [];
  const open = async (w, h, pc) => { const p = await browser.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errors.push(`${w}x${h}: ` + e.message));
    await p.addInitScript((pc) => { try { localStorage.setItem('dungeonScrambleTutorialSeen_v1', '1'); if (pc) localStorage.setItem('dungeonScramblePC', '1'); } catch (e) {} }, pc);
    await p.goto(URL_); await p.waitForTimeout(400); return p; };
  // off unless asked for; off on a phone even when asked for
  let p = await open(1920, 1080, false); const offWide = await p.evaluate(() => document.body.classList.contains('pc')); await p.close();
  p = await open(395, 769, true); const offPhone = await p.evaluate(() => document.body.classList.contains('pc')); await p.close();
  out.push((!offWide && !offPhone ? 'ok   ' : 'FAIL ') + `PC mode is off without the flag (${offWide}) and on a phone-sized window (${offPhone})`);
  for (const [w, h] of [[1920, 1080], [1280, 800]]) {
    p = await open(w, h, true); await p.evaluate(FIGHT); await p.waitForTimeout(500);
    const g = await p.evaluate(() => { const b = s => { const n = document.querySelector(s); const r = n.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
      return { pc: document.body.classList.contains('pc'), room: b('#app > #enc-panel'), tray: b('#app > .tray-panel'), route: b('#app > .route-float'), hover: b('#pc-hover'), sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, W: innerWidth, H: innerHeight }; });
    const inside = r => r.l >= -1 && r.t >= -1 && r.r <= g.W + 1 && r.b <= g.H + 1;
    out.push((g.pc && g.sh <= g.H && g.sw <= g.W && inside(g.room) && inside(g.tray) && inside(g.route) && inside(g.hover) && g.room.r <= g.tray.l && g.hover.t >= g.room.b ? 'ok   ' : 'FAIL ')
      + `${w}x${h}: room left of the tray, hover panel under the room, everything inside the window, no scrolling (${JSON.stringify({ sh: g.sh, sw: g.sw, room: [Math.round(g.room.l), Math.round(g.room.r)], tray: [Math.round(g.tray.l), Math.round(g.tray.r)] })})`);
    // path line: two taps, the line's ends sit on the two dice (screen px)
    const tr = await p.evaluate(() => { const a = [...Array(16).keys()].find(i => canSelect(i)); toggleSelect(a); const b = [...Array(16).keys()].find(i => canSelect(i) && !S.path.includes(i)); if (b == null) return null; toggleSelect(b);
      const svg = document.getElementById('path-trail-svg'), seg = svg && svg.querySelector('path, line, polyline'); if (!seg) return { none: true };
      const sr = seg.getBoundingClientRect(), c = i => { const r = document.querySelector(`#tray > .die[data-idx="${i}"]`).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
      const [ax, ay] = c(a), [bx, by] = c(b), tol = 14 + 0.25 * Math.hypot(bx - ax, by - ay); // a Leap is drawn as an arc, so it bows away from the straight line
      return { ok: sr.left >= Math.min(ax, bx) - tol && sr.right <= Math.max(ax, bx) + tol && sr.top >= Math.min(ay, by) - tol && sr.bottom <= Math.max(ay, by) + tol, sr: [sr.left, sr.top, sr.right, sr.bottom].map(Math.round), a: [ax, ay].map(Math.round), b: [bx, by].map(Math.round) }; });
    out.push((tr && tr.ok ? 'ok   ' : 'FAIL ') + `${w}x${h}: the path line runs between the two dice it joins (${JSON.stringify(tr)})`);
    // hover: a die is explained; a Minion's die is not
    await p.evaluate(() => { clearPathAll(); render(); });
    const idx = await p.evaluate(() => [...Array(16).keys()].find(i => currentFace(S.tray[i]).type !== 'blank'));
    await p.hover(`#tray > .die[data-idx="${idx}"]`, { force: true }); await p.waitForTimeout(150);
    const hv = await p.evaluate((i) => ({ txt: document.querySelector('#pc-hover .pch-in').textContent, name: S.tray[i].die.name, faces: document.querySelectorAll('#pc-hover .mini-face').length, cur: document.querySelectorAll('#pc-hover .pch-cur').length }), idx);
    await p.mouse.move(2, 2); await p.evaluate((i) => { S.tray[i].minion = true; render(); }, idx); await p.hover(`#tray > .die[data-idx="${idx}"]`, { force: true }); await p.waitForTimeout(150);
    const mv = await p.evaluate((i) => ({ txt: document.querySelector('#pc-hover .pch-in').textContent, name: S.tray[i].die.name }), idx);
    out.push((hv.txt.includes(hv.name) && hv.faces === 6 && hv.cur === 1 && /Minion/.test(mv.txt) && !mv.txt.includes(mv.name) ? 'ok   ' : 'FAIL ') + `${w}x${h}: hovering a die shows its name, six faces and the one showing; a Minion's die stays secret`);
    // keys pick dice, Enter plays the turn
    await p.evaluate((i) => { S.tray[i].minion = false; render(); }, idx); await p.mouse.move(2, 2);
    const key = await p.evaluate(() => { const i = [...Array(16).keys()].find(k => canSelect(k)); return { i, key: ['1', '2', '3', '4', 'q', 'w', 'e', 'r', 'a', 's', 'd', 'f', 'z', 'x', 'c', 'v'][i], shown: getComputedStyle(document.querySelector(`#tray > .die[data-idx="${i}"]`), '::before').content }; });
    await p.keyboard.press(key.key); await p.waitForTimeout(150);
    const picked = await p.evaluate(() => S.path.slice());
    await p.keyboard.press('Enter'); await p.waitForTimeout(200); await p.evaluate(() => skipTransition()); await p.waitForTimeout(300);
    const turn = await p.evaluate(() => S.turnNumber);
    out.push((picked.length === 1 && picked[0] === key.i && key.shown.replace(/"/g, '').toLowerCase() === key.key && turn >= 1 ? 'ok   ' : 'FAIL ') + `${w}x${h}: the die's key cap (${key.shown}) picks it and Enter plays the turn`);
    await p.close();
  }
  // ---- cursor: keyboard, then a (simulated) controller, at Steam Deck size ----
  p = await open(1280, 800, true);
  await p.evaluate(() => { META.lifetime.victories = 3; META.coachSeen = { armsmaster: 1, guard: 1, dungeoneer: 1, arcanist: 1 }; });
  const key = async (k, ms = 150) => { await p.keyboard.press(k); await p.waitForTimeout(ms); };
  const cur = () => p.evaluate(() => (pcCurOn && pcCur) ? (pcCur.id || pcCur.className) + ' ' + (pcCur.textContent || '').trim().slice(0, 20) : null);
  const goTo = async (re) => { for (let i = 0; i < 30; i++) { const d = await p.evaluate((src) => { const re = new RegExp(src, 'i'); if (!pcCurOn || !pcCur) return 'start'; if (re.test((pcCur.textContent || '') + ' ' + (pcCur.id || ''))) return 'here';
      const t = pcTargets().find(n => re.test((n.textContent || '') + ' ' + (n.id || ''))); if (!t) return 'none'; const a = pcCur.getBoundingClientRect(), c = t.getBoundingClientRect(); const dx = (c.left + c.width / 2) - (a.left + a.width / 2), dy = (c.top + c.height / 2) - (a.top + a.height / 2);
      return Math.abs(dy) > Math.abs(dx) * 0.6 && Math.abs(dy) > 12 ? (dy > 0 ? 'ArrowDown' : 'ArrowUp') : (dx > 0 ? 'ArrowRight' : 'ArrowLeft'); }, re.source);
    if (d === 'here') return true; if (d === 'none') return false; await key(d === 'start' ? 'ArrowDown' : d, 60); } return false; };
  await key('ArrowDown'); const c0 = await cur(); await key('Space', 800);
  const steps = [await goTo(/^\s*Guard/)]; await key('Space', 250); steps.push(await goTo(/Enter the Dungeon/)); await key('Space', 1200);
  steps.push(await goTo(/Break Camp|Start Your/)); await key('Space', 1000);
  for (let i = 0; i < 4 && (await p.evaluate(() => !!pcLayer())); i++) await key('Space', 1300);
  await p.evaluate(() => { if (S.needRoll) scrambleRoll(0, -1); }); await p.waitForTimeout(800);
  await p.evaluate(() => { const set = (i) => { const c = S.tray[i], f = { type: 'hit', value: 1 }; c.die = { name: 'T' + i, cat: 'attack', level: 1, faces: [f, f, f, f, f, f] }; c.faceIdx = 0; c.minion = false; c.coveredDie = null; c.blank = false; c.spent = false; c.forcedFace = null; }; for (let i = 0; i < 16; i++) set(i); S.encounter.maxHealth = S.encounter.curHealth = 80; render(); }); await p.waitForTimeout(200);
  await key('Space'); const p1 = await p.evaluate(() => S.path.length);
  for (const k of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) { const at = await cur(); await key(k, 100); if ((await cur()) === at && !(await p.evaluate(() => pcCur && pcCur.matches('#tray > .die:not(.in-path)')))) continue; await key('Space'); if ((await p.evaluate(() => S.path.length)) > 1) break; }
  const p2 = await p.evaluate(() => S.path.length); await key('Escape'); const p3 = await p.evaluate(() => S.path.length);
  const scr = await p.evaluate(() => S && S.screen);
  out.push((/New Run/.test(c0 || '') && steps.every(Boolean) && scr === 'game' && p1 === 1 && p2 === 2 && p3 === 1 ? 'ok   ' : 'FAIL ')
    + `keyboard only: title -> setup -> camp -> door -> fight; arrows + Space build a Path, Esc steps back (${JSON.stringify({ c0, steps, scr, p1, p2, p3 })})`);
  // controller: D-pad, A, B, Y, Select, and holding A on the shrine's Hold button
  await p.evaluate(() => { window.__pad = { connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }; window.__pcPads = [window.__pad]; clearPathAll(); S.encounter.maxHealth = S.encounter.curHealth = 80; render(); pcCurOn = false; });
  const btn = async (i, ms = 110) => { await p.evaluate(i => { __pad.buttons[i] = { pressed: true, value: 1 }; }, i); await p.waitForTimeout(ms); await p.evaluate(i => { __pad.buttons[i] = { pressed: false, value: 0 }; }, i); await p.waitForTimeout(110); };
  await btn(15); await btn(0); const g1 = await p.evaluate(() => S.path.length); // the first D-pad press only shows the cursor (on a legal die)
  for (const d of [15, 13, 14, 12]) { await btn(d); await btn(0); if ((await p.evaluate(() => S.path.length)) > 1) break; }
  const g2 = await p.evaluate(() => S.path.length); await btn(1); const g3 = await p.evaluate(() => S.path.length);
  const t0 = await p.evaluate(() => S.turnNumber); await btn(3); await p.waitForTimeout(200); await p.evaluate(() => skipTransition()); await p.waitForTimeout(500); const t1 = await p.evaluate(() => S.turnNumber);
  await btn(8); await p.waitForTimeout(400); const setOpen = await p.evaluate(() => !!document.querySelector('.modal-overlay')); await btn(1); await p.waitForTimeout(600); const setShut = await p.evaluate(() => !document.querySelector('.modal-overlay:not(.modal-closing)'));
  out.push((g1 === 1 && g2 === 2 && g3 === 1 && t1 === t0 + 1 && setOpen && setShut ? 'ok   ' : 'FAIL ') + `controller: D-pad + A build a Path, B steps back, Y plays the turn, Select opens Settings and B closes it (${JSON.stringify({ g1, g2, g3, t0, t1, setOpen, setShut })})`);
  await p.evaluate(() => { const s = FLOORS[0].shrines.find(x => !(x.effect && x.effect.type === 'choice')) || FLOORS[0].shrines[0]; const o = window.drawRoomCard; window.drawRoomCard = () => s; S.encounter = drawEncounter('enc'); window.drawRoomCard = o;
    S.screen = 'shrine'; S.shrineResult = null; S.newRoomFx = false; S.transitioning = false; render(); try { placeShrineFloat(); } catch (e) {} document.querySelectorAll('#room-callout,#room-callout-scrim').forEach(n => n.remove()); });
  await p.waitForTimeout(500); await btn(13); const onHold = await p.evaluate(() => !!(pcCur && pcCur.id === 'shrine-hold-btn'));
  await btn(0, 1100); await p.waitForTimeout(900);
  const boon = await p.evaluate(() => !!(S.shrineResult || S.shrineChoice || S.relicChoice || S.lootChoice || S.pendingLootDie));
  out.push((onHold && boon ? 'ok   ' : 'FAIL ') + `controller: the cursor starts on the shrine's Hold button and holding A grants the boon (${JSON.stringify({ onHold, boon })})`);
  await p.close();
  // landscape title, setup, camp and end screens (Nov 13): two columns side by side, all inside the window, no scrolling
  for (const [w, h] of [[1920, 1080], [1280, 800]]) {
    p = await open(w, h, true);
    const SCR = {
      title: [() => { preGameScreen = 'title'; S = null; render(); }, '.title-art-wrap', '.title-content'],
      setup: [() => { META.lifetime.victories = 3; preGameScreen = 'setup'; S = null; render(); }, '.setup-section:has(.origin-layout)', '#start-btn'],
      camp: [() => { S.screen = 'camp'; S.floorIdx = 1; S.routeStep = 4; S.campChoice = null; S.backPocket = [...ALLOY.slice(0, 5), ...GILDED.slice(0, 5), ...MAGIC.slice(0, 5)].map(d => clone(d)); render(); }, '.camp-status-card', '.camp-section:has(.organize-wrap)'],
      victory: [() => { S.screen = 'victory'; render(); }, null, null],
    };
    for (const [k, [setup, left, right]] of Object.entries(SCR)) {
      if (k === 'camp' || k === 'victory') await p.evaluate(FIGHT);
      await p.evaluate(setup); await p.waitForTimeout(600);
      const g = await p.evaluate(([left, right]) => { const W = innerWidth, H = innerHeight, all = [...document.querySelectorAll('#app *')].filter(n => n.offsetParent && !n.closest('.modal-overlay'));
        const low = Math.max(...all.map(n => n.getBoundingClientRect().bottom)), r = s => s && document.querySelector(s) && document.querySelector(s).getBoundingClientRect();
        const a = r(left), b = r(right); return { pc: document.body.classList.contains('pc'), sh: document.documentElement.scrollHeight, H, low: Math.round(low), side: !a || (a.right <= b.left + 1), zoom: document.getElementById('app').style.zoom || '' }; }, [left, right]);
      out.push((g.pc && g.sh <= g.H && g.low <= g.H + 1 && g.side ? 'ok   ' : 'FAIL ') + `${w}x${h} ${k}: laid out side by side and inside the window (${JSON.stringify(g)})`);
    }
    await p.close();
  }
  // Codex as an open book (Nov 14): opening an entry keeps the list on the left page and shows the entry on the right
  p = await open(1920, 1080, true); await p.evaluate(() => { preGameScreen = 'title'; S = null; render(); openCodexModal('dice'); }); await p.waitForTimeout(400);
  await p.locator('.cx-card[data-page]').first().click(); await p.waitForTimeout(300);
  const bk = await p.evaluate(() => { const b = document.getElementById('codex-body').getBoundingClientRect(), g = document.getElementById('codex-page').getBoundingClientRect();
    return { list: document.querySelectorAll('#codex-body .cx-card').length, page: !!document.querySelector('#codex-page .cx-page'), side: b.right <= g.left + 1, on: !!document.querySelector('.cx-card.cx-on') }; });
  out.push((bk.list > 3 && bk.page && bk.side && bk.on ? 'ok   ' : 'FAIL ') + `Codex: an opened entry reads on the right page while the list stays on the left (${JSON.stringify(bk)})`);
  await p.close();
  // the Settings switch turns it off (and is remembered); without any setting a real browser gets it on a wide window
  p = await open(1280, 800, true); await p.evaluate(() => { preGameScreen = 'title'; S = null; render(); openSettingsModal(); }); await p.waitForTimeout(400);
  await p.click('#pref-pc-layout', { force: true }); await p.waitForTimeout(700);
  const sw = await p.evaluate(() => ({ pc: document.body.classList.contains('pc'), kept: localStorage.getItem('dungeonScramblePC') }));
  const def = await p.evaluate(() => { localStorage.removeItem('dungeonScramblePC'); Object.defineProperty(navigator, 'webdriver', { get: () => false }); return pcWanted(); });
  out.push((!sw.pc && sw.kept === '0' && def ? 'ok   ' : 'FAIL ') + `Settings > Wide-screen layout turns it off and remembers; with no setting a player's browser gets it (${JSON.stringify({ ...sw, def })})`);
  await p.close();
  out.forEach(l => console.log(l));
  if (errors.length) console.log('FAIL page errors: ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
